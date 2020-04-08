'use strict';

const RESERVE_ATTRIBUTE_NAME = 'SQSLargePayloadSize',
    RECEIPT_HANDLE_SEPARATOR = '-..SEPARATOR..-',
    _ = require('lodash'),
    uuid = require('uuid'),
    {s3Path2Params} = require('./common/utils'),
    ExtendedConfig = require('./config');

/**
 * This mixin is responsible for decorating the given sqs client class. The decorated class includes
 * methods to send sqs message's body to S3 and receive messages with S3 links transparently.
 *
 * @exports extendSQSMixin
 * @example
 * const {SQS} = require('aws-sdk'),
 *    extendSQSMixin = require('./src/extendSQSMixin'),
 *    SQSExt = extendSQSMixin(SQS);
 *
 * let sqs = new SQSExt(); // use sqs as if it was an sqs client from aws-sdk
 *
 * @param {AWS.SQS} SQS - sqs client class from [aws-sdk]{@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SQS.html}.
 * @return {module:extendSQSMixin~SQSExt} a decorated sqs client class.
 */
module.exports = (SQS) =>
    /**
     * An AWS SQS client class that extends some methods to support large payloads.
     *
     * @mixin
     * @alias module:extendSQSMixin~SQSExt
     */
    class SQSExt extends SQS {
        /**
         * Constructor of ExtendSQS
         * @param {Object} options - options as for
         *                  [SQS client]{@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SQS.html#constructor-property}.
         */
        constructor(options) {
            super(options);
            if (!options || !options.extendedConfig) {
                this.extendedConfig = new ExtendedConfig();
            } else {
                this.extendedConfig = options.extendedConfig;
            }
        }

        /**
         * Object returned by @see _parseReceiptHandle.
         *
         * @private
         * @typedef {Object} ExtReceiptHandle
         * @property {String} s3Bucket - S3 bucket name.
         * @property {String} s3Key - S3 key.
         * @property {String} receiptHandle - original ReceiptHandle.
         */

        /**
         * Parses an sqs message ReceiptHandle to extract an S3 path if it exists.
         *
         * @private
         * @param {String} [receiptHandle='']
         * @param {String} [separator=RECEIPT_HANDLE_SEPARATOR]
         * @return {ExtReceiptHandle}
         */
        _parseReceiptHandle(receiptHandle = '', separator = RECEIPT_HANDLE_SEPARATOR) {
            const parts = receiptHandle.split(separator),
                ret = {s3Bucket: undefined, s3Key: undefined, receiptHandle: receiptHandle};

            if (parts.length === 2) {
                const {Bucket, Key} = s3Path2Params(parts[0]);

                ret.s3Bucket = Bucket;
                ret.s3Key = Key;
                ret.receiptHandle = parts[1];
            }

            return ret;
        }

        /**
         * Uploads the sqs message's body to the given S3 key.
         *
         * @private
         * @param {Object} params - sendMessage params object.
         * @param {String} params.MessageBody - The message to send.
         * @param {String} s3Key - Object key for which the PUT operation was initiated.
         * @return {AWS.Request} - [AWS.Request]{@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Response.html}.
         */
        _uploadToS3({MessageBody} = {}, s3Key) {
            const params = {
                Bucket: this.extendedConfig.s3BucketName,
                Key: s3Key,
                Body: MessageBody
            };

            return this.extendedConfig.s3.upload(params);
        }

        /**
         * Builds a random S3 key. It may prefix the key with the QueueUrl of an SQS queue if the config says so.
         *
         * @private
         * @param {String} QueueUrl - The URL of the Amazon SQS queue to which a message is sent.
         * @return {String} the S3 key in which the message's body is stored.
         */
        _composeS3Key(QueueUrl) {
            const randomKey = uuid.v4();

            if (this.extendedConfig.addQueueToS3Key && QueueUrl) {
                return `${QueueUrl}/${randomKey}`;
            } else {
                return randomKey;
            }
        }

        /**
         * Creates a new SQS message with the extensions that assume the message's body will be stored in S3.
         *
         * @private
         * @param {Object} params - same argument as for
         *      [sendMessage]{@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SQS.html#sendMessage-property}
         * @return {Object} an object containing the pair {s3Key, mutatedParams}.
         */
        _messageToS3(params) {
            const clone = _.cloneDeep(params),
                messageSize = Buffer.byteLength(clone.MessageBody),
                ret = {
                    s3Key: this._composeS3Key(clone.QueueUrl)
                };

            if (!clone.MessageAttributes) {
                clone.MessageAttributes = {};
            }

            clone.MessageAttributes[RESERVE_ATTRIBUTE_NAME] = {
                DataType: 'Number',
                Value: `${messageSize}`
            };

            clone.MessageBody = `s3://${this.extendedConfig.s3BucketName}/${ret.s3Key}`;

            ret.mutatedParams = clone;
            return ret;
        }

        /**
         * Iterates over a list of SQS messages and downloads from S3 the objects referenced by message's bodies.
         *
         * @private
         * @param {Object} response - response object from
         *      [receiveMessage]{@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SQS.html#receiveMessage-property}.
         * @param {Object[]} response.Messages - A list of messages.
         * @return {Promise.<Object>} a map between SQS message ids and S3 responses.
         */
        _downloadFromS3({Messages}) {
            const promises = [];

            for (const m of Messages) {
                const MessageId = m.MessageId;

                if (m.MessageAttributes && m.MessageAttributes[RESERVE_ATTRIBUTE_NAME]) {
                    if (!this.extendedConfig.isLargePayloadSupportEnabled()) {
                        return Promise.reject(
                            new Error('SQSExt::_downloadFromS3 a message refers to an S3 object but large payload support is disabled')
                        );
                    }

                    const params = s3Path2Params(m.Body);

                    promises.push(
                        this.extendedConfig.s3
                            .getObject(params)
                            .promise()
                            .then((response) => {
                                return {MessageId, response};
                            })
                    );
                }
            }

            return Promise.all(promises).then((results) => {
                const ret = {};

                for (const {MessageId, response} of results) {
                    ret[MessageId] = response.Body; // TODO: is it better to associate the complete response?
                }

                return ret;
            });
        }

        /**
         * Mutates the given SQS response by replacing message's bodies with S3 objects.
         *
         * @private
         * @param {Object} response - response object from
         *      [receiveMessage]{@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SQS.html#receiveMessage-property}.
         * @param {Object[]} response.Messages - A list of messages.
         * @param {Object} s3Objects a map between SQS message ids and S3 responses.
         */
        _messageFromS3({Messages}, s3Objects = {}) {
            Messages.forEach((m) => {
                if (s3Objects[m.MessageId]) {
                    delete m.MessageAttributes[RESERVE_ATTRIBUTE_NAME];
                    m.ReceiptHandle = `${m.Body}${RECEIPT_HANDLE_SEPARATOR}${m.ReceiptHandle}`;
                    m.Body = s3Objects[m.MessageId];
                }
            });
        }

        /**
         * Creates a new param object. _cloneWithReceiptHandleFromS3 replaces any ReceiptHandle
         * containing an S3 path by the original ReceiptHandle.
         *
         * @private
         * @param {Object} params - same params as @see deleteMessage or @see deleteMessageBatch.
         * @return {Object} a clone of given input with ReceiptHandle replaced by the original one.
         */
        _cloneWithReceiptHandleFromS3(params) {
            const clone = _.cloneDeepWith(params);

            if (clone.Entries) {
                // support for deleteMessageBatch
                clone.Entries.forEach((e) => {
                    const {s3Bucket, s3Key, receiptHandle} = this._parseReceiptHandle(e.ReceiptHandle);

                    if (s3Bucket && s3Key) {
                        if (!this.extendedConfig.isLargePayloadSupportEnabled()) {
                            throw new Error(
                                'SQSExt::_cloneWithReceiptHandleFromS3 params refer to an S3 object' +
                                    ' but large payload support is disabled'
                            );
                        }

                        e.ReceiptHandle = receiptHandle;
                    }
                });
            } else if (clone.ReceiptHandle) {
                // support for DeleteMessage
                const {s3Bucket, s3Key, receiptHandle} = this._parseReceiptHandle(clone.ReceiptHandle);

                if (s3Bucket && s3Key) {
                    if (!this.extendedConfig.isLargePayloadSupportEnabled()) {
                        throw new Error(
                            'SQSExt::_cloneWithReceiptHandleFromS3 params refer to an S3 object but large payload support is disabled'
                        );
                    }

                    clone.ReceiptHandle = receiptHandle;
                }
            }

            return clone;
        }

        /**
         * Deletes the S3 objects indicated by the given ReceiptHandles. If an S3 object no longer exists (NoSuchKey error),
         * then the error is ignored so other deletes are not aborted.
         *
         * @private
         * @param {Object} params - same params as @see deleteMessage or @see deleteMessageBatch.
         * @param {Object} [params.Entries] - A list of receipt handles for the messages to be deleted (only for @see deleteMessageBatch).
         * @param {String} [params.ReceiptHandles] - The receipt handle associated with the message to delete (only for @see deleteMessage).
         * @return {Promise} that resolves when all S3 objects are deleted, a rejection otherwise.
         */
        _deleteFromS3({Entries, ReceiptHandle}) {
            const deletes = Entries || [],
                promises = [];

            if (ReceiptHandle) {
                deletes.push({ReceiptHandle});
            }

            for (const {ReceiptHandle} of deletes) {
                const {s3Bucket, s3Key} = this._parseReceiptHandle(ReceiptHandle);

                if (s3Bucket && s3Key) {
                    const params = {
                        Bucket: s3Bucket,
                        Key: s3Key
                    };

                    promises.push(
                        this.extendedConfig.s3
                            .deleteObject(params)
                            .promise()
                            .catch((e) => {
                                if (!e || e.code !== 'NoSuchKey') {
                                    return Promise.reject(e);
                                }
                            })
                    );
                }
            }

            return Promise.all(promises);
        }

        /**
         * Creates a new param object. It filters out any message that failed to be deleted
         * in batch according to the given deleteMessageBatch response.
         *
         * @private
         * @param {Object} params - same params as @see deleteMessageBatch.
         * @param {Object} response - response object from
         *      [deleteMessageBatch]{@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SQS.html#deleteMessageBatch-property}.
         * @param {Object[]} [response.Failed=[]] - A list of BatchResultErrorEntry items.
         * @return {Object} a clone of given input but filtering out failed messages.
         */
        _pruneFailedDeleteMessage(params, {Failed = []}) {
            const clone = _.cloneDeep(params),
                Ids2Remove = Failed.map(({Id}) => Id);

            clone.Entries = clone.Entries.filter(({Id}) => !Ids2Remove.includes(Id));

            return clone;
        }

        /**
         * @description
         * Delivers a message to the specified queue.
         * <br/><br/>
         * If extendedConfig states the message must be sent to S3 and it has both S3 bucket and client, then sendMessage will
         * mutate the original message and upload MessageBody to an S3 object.
         *
         * @override
         * @param {Object} params -
         *      [sendMessage]{@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SQS.html#sendMessage-property}
         * @param {Function} [callback] -
         *      [sendMessage]{@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SQS.html#sendMessage-property}
         * @return {AWS.Request} - [AWS.Request]{@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Response.html}.
         */
        sendMessage(params, callback) {
            const messageSize = Buffer.byteLength(params.MessageBody);

            if (
                (this.extendedConfig.isAlwaysThroughS3() || messageSize > this.extendedConfig.messageSizeThreshold) &&
                this.extendedConfig.isLargePayloadSupportEnabled()
            ) {
                const {mutatedParams, s3Key} = this._messageToS3(params),
                    s3Request = this._uploadToS3(params, s3Key),
                    sqsRequest = super.sendMessage(mutatedParams);

                if (callback) {
                    const innerCallback = (error, response) => {
                        if (error) {
                            callback(error);
                        } else {
                            sqsRequest.send(callback);
                        }
                    };

                    s3Request.send(innerCallback);
                } else {
                    const requestToPromise = s3Request.promise;
                    s3Request.promise = () => {
                        return requestToPromise().then(() => {
                            // TODO: should we mutate the original params object with mutatedParams?
                            return sqsRequest.promise();
                        });
                    };

                    // FIXME: there is a third way of using aws-sdk:
                    // const request = sqs.sendMessage(params)
                    // request.send(callback)
                    // we aren't handling that scenario!
                }

                return s3Request;
            } else {
                return super.sendMessage(params, callback);
            }
        }

        /**
         * @description
         * Retrieves one or more messages (up to 10), from the specified queue.
         * <br/><br/>
         * If any message refers to an S3 object, then receiveMessage donwloads them and mutates the
         * original response to replace Body with the S3 Object.
         *
         * @override
         * @param {Object} params -
         *      [receiveMessage]{@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SQS.html#receiveMessage-property}.
         * @param {Function} [callback] -
         *      [receiveMessage]{@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SQS.html#receiveMessage-property}
         * @return {AWS.Request} - [AWS.Request]{@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Response.html}.
         */
        receiveMessage(params, callback) {
            const sqsRequest = super.receiveMessage(params);

            if (callback) {
                const innerCallback = (error, response) => {
                    if (error) {
                        callback(error);
                    } else {
                        // the lack of _return_ is intended! we don't want to return a promise here.
                        this._downloadFromS3(response)
                            .then((s3Mapping) => {
                                this._messageFromS3(response, s3Mapping);
                                callback(undefined, response);
                            })
                            .catch(callback);
                    }
                };

                sqsRequest.send(innerCallback);
            } else {
                const sqsRequestPromise = sqsRequest.promise;

                let _sqsResponse;

                sqsRequest.promise = () => {
                    return sqsRequestPromise()
                        .then((response) => {
                            _sqsResponse = response;
                            return this._downloadFromS3(_sqsResponse);
                        })
                        .then((s3Mapping) => {
                            this._messageFromS3(_sqsResponse, s3Mapping);
                        });
                };

                // FIXME: there is a third way of using aws-sdk:
                // const request = sqs.receiveMessage(params)
                // request.send(callback)
                // we aren't handling that scenario!
            }

            return sqsRequest;
        }

        /**
         * @description
         * Deletes the specified message from the specified queue.
         * <br/><br/>
         * If the message to be deleted refers to an S3 object, then deleteMessage will delete the message from the SQS and
         * , afterwards, from S3. S3 deletion may fail but deleteMessage will succeed with a warning message.
         *
         * @override
         * @param {Object} params -
         *      [deleteMessage]{@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SQS.html#deleteMessage-property}.
         * @param {Function} [callback] -
         *      [deleteMessage]{@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SQS.html#deleteMessage-property}.
         * @return {AWS.Request} - [AWS.Request]{@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Response.html}.
         */
        deleteMessage(params, callback) {
            let mutatedParams;

            try {
                mutatedParams = this._cloneWithReceiptHandleFromS3(params);
            } catch (e) {
                if (callback) {
                    callback(e);
                    return;
                } else {
                    throw e;
                }
            }

            const sqsRequest = super.deleteMessage(mutatedParams);

            if (callback) {
                const innerCallback = (error, response) => {
                    if (error) {
                        callback(error);
                    } else {
                        // the lack of _return_ is intended! we don't want to return a promise here.
                        this._deleteFromS3(params)
                            .then(() => {
                                callback(undefined, response);
                            })
                            .catch((e) => {
                                console.warn(
                                    `SQSExt::deleteMessage and error occurred deleting an S3 reference ` +
                                        `[params=${params}] | [error=${e.toString()}]`
                                );
                                callback(undefined, response);
                            });
                    }
                };

                sqsRequest.send(innerCallback);
            } else {
                const sqsRequestPromise = sqsRequest.promise;

                sqsRequest.promise = () => {
                    let _response;

                    return sqsRequestPromise()
                        .then((response) => {
                            _response = response;
                            return this._deleteFromS3(params).catch((e) => {
                                console.warn(
                                    `SQSExt::deleteMessage and error occurred deleting an S3 reference ` +
                                        `[params=${params}] | [error=${e.toString()}]`
                                );
                            });
                        })
                        .then(() => {
                            return _response;
                        });
                };

                // FIXME: there is a third way of using aws-sdk:
                // const request = sqs.receiveMessage(params)
                // request.send(callback)
                // we aren't handling that scenario!
            }

            return sqsRequest;
        }

        /**
         * @description
         * Deletes up to ten messages from the specified queue. This is a batch version of DeleteMessage.
         * The result of the action on each message is reported individually in the response.
         * <br/><br/>
         * Because the batch request can result in a combination of successful and unsuccessful actions,
         * you should check for batch errors even when the call returns an HTTP status code of 200.
         * <br/><br/>
         * If any message to be deleted refers to an S3 object, then deleteMessageBatch will delete
         * the batch from the SQS. Afterwards, it will delete from S3 all objects which messages' deletion succeeded.
         * S3 deletion may fail but deleteMessageBatch will succeed with a warning message.
         *
         * @override
         * @param {Object} params -
         *      [deleteMessageBatch]{@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SQS.html#deleteMessageBatch-property}.
         * @param {Function} [callback] -
         *      [deleteMessageBatch]{@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SQS.html#deleteMessageBatch-property}.
         * @return {AWS.Request} - [AWS.Request]{@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Response.html}.
         */
        deleteMessageBatch(params, callback) {
            let mutatedParams;

            try {
                mutatedParams = this._cloneWithReceiptHandleFromS3(params);
            } catch (e) {
                if (callback) {
                    callback(e);
                    return;
                } else {
                    throw e;
                }
            }

            const sqsRequest = super.deleteMessageBatch(mutatedParams);

            if (callback) {
                const innerCallback = (error, response) => {
                    if (error) {
                        callback(error);
                    } else {
                        const filteredParams = this._pruneFailedDeleteMessage(params, response);

                        // the lack of _return_ is intended! we don't want to return a promise here.
                        this._deleteFromS3(filteredParams)
                            .then(() => {
                                callback(undefined, response);
                            })
                            .catch((e) => {
                                console.warn(
                                    `SQSExt::deleteMessageBatch and error occurred deleting one or more S3 references ` +
                                        `[params=${params}] | [error=${e.toString()}]`
                                );
                                callback(undefined, response);
                            });
                    }
                };

                sqsRequest.send(innerCallback);
            } else {
                const sqsRequestPromise = sqsRequest.promise;

                sqsRequest.promise = () => {
                    let _response;

                    return sqsRequestPromise()
                        .then((response) => {
                            _response = response;

                            const filteredParams = this._pruneFailedDeleteMessage(params, response);

                            return this._deleteFromS3(filteredParams).catch((e) => {
                                console.warn(
                                    `SQSExt::deleteMessageBatch and error occurred deleting one or more S3 references ` +
                                        `[params=${params}] | [error=${e.toString()}]`
                                );
                            });
                        })
                        .then(() => {
                            return _response;
                        });
                };

                // FIXME: there is a third way of using aws-sdk:
                // const request = sqs.receiveMessage(params)
                // request.send(callback)
                // we aren't handling that scenario!
            }

            return sqsRequest;
        }
    };
