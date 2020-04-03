'use strict';

const RESERVE_ATTRIBUTE_NAME = 'SQSLargePayloadSize',
    RECEIPT_HANDLE_SEPARATOR = '-..SEPARATOR..-',
    uuid = require('uuid'),
    utils = require('./common/utils'),
    ExtendedConfig = require('./extendedConfig');

/**
 *
 * @param {Object} SQS client class from aws-sdk. We inject it to avoid dependencies between this library and aws-sdk
 * @return {Object}
 */
module.exports = (SQS) =>
    /**
     * @classdesc ExtendedSQS extends the functionality of Amazon SQS client to
     *            support sqs messages bigger than 256KB transparently.
     */
    class ExtendedSQS extends SQS {
        /**
         * Constructor of ExtendSQS
         * @param {Object} options
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
         * Delivers a message to the specified queue and uploads the message payload to Amazon S3 if necessary.
         * @param {Object} message - the necessary parameters to send a message by AmazonSQS.
         * @param {Function} callback -  Function to be called when it is necessary
         * @return {Promise} - the response from the SendMessage service method, as returned by AmazonSQS.
         */
        sendMessage(message, callback) {
            if (this.extendedConfig.isAlwaysThroughS3() ||
            Buffer.byteLength(message.MessageBody) > this.extendedConfig.getMessageSizeThreshold()) {
                return this.uploadToS3AndMutateSQSMessage(message, callback);
            } else {
                return super.sendMessage(message, callback);
            }
        }

        /**
         * Downloads the message payloads from Amazon S3 and modify previous response from AmazonSQS.receiveMessage
         * to delete innecessary atributes(SQSLargePayloadSize) and recover body and receiptHandle of every message (it if was on S3)
         * @param {Object} response - messages from AmazonSQS.receiveMessage
         * @param {Function} callback - Function to be called when it is necessary
         * @return {Object} - all messages including those whose body was on s3
         */
        downloadS3ObjectsAndMutateSQSResponse(response, callback) {
            const _response = response,

                promises = response.Messages.map((message) => {
                    if (message.MessageAttributes[RESERVE_ATTRIBUTE_NAME]) {
                        if (!this.extendedConfig.isLargePayloadSupportEnabled()) {
                            return Promise.reject(new Error(
                                'ExtendedSQS::downloadS3ObjectsAndMutateSQSResponse a message refers to an S3' +
                                ' object but large payload support is disabled'
                            ));
                        }

                        const params = utils.s3Path2Params(message.Body);

                        return this.extendedConfig.getAmazonS3Client().getObject(params).promise();
                    } else {
                        return Promise.resolve();
                    }
                });

            return Promise.all(promises)
                .then((s3Responses) => {
                    for (let i = 0; i < _response.Messages; i++) {
                        const message = _response.Messages[i],
                            s3Response = s3Responses[i];

                        if (s3Response) {
                            delete message.MessageAttributes[RESERVE_ATTRIBUTE_NAME];
                            message.ReceiptHandle = `${message.Body}${RECEIPT_HANDLE_SEPARATOR}${message.ReceiptHandle}`;
                            message.Body = s3Response.Body.toString('utf8');
                        }
                    }

                    if (callback) {
                        callback(null, _response);
                    } else {
                        return _response;
                    }
                })
                .catch(callback);
        }

        /**
         * Retrieves one or more messages, from the specified queue.
         * Downloads the message payloads from Amazon S3 when necessary.
         * @param {Object} params - the necessary parameters to execute the service method on AmazonSQS.
         * @param {String} params.QueueUrl - URL of the Amazon SQS queue from which messages are received.
         * @param {Function} callback - Function to be called when it is necessary
         * @return {Promise} - the response from the receiveMessage service method, as returned by AmazonSQS.
         */
        receiveMessage(params, callback) {
            const sqsRequest = super.receiveMessage(params);

            if (callback) {
                sqsRequest
                    .on('complete', ({error, data}) => {
                        if (error) {
                            callback(error);
                        } else {
                            this.downloadS3ObjectsAndMutateSQSResponse(data, callback);
                        }
                    });

                sqsRequest.send();
            } else {
                const sqsRequestPromise = sqsRequest.promise;

                sqsRequest.promise = () => {
                    return sqsRequestPromise()
                        .then((response) => {
                            return this.downloadS3ObjectsAndMutateSQSResponse(response);
                        });
                };
            }

            return sqsRequest;
        }

        /**
         * Deletes the specified message from the specified queue and deletes the message payload from Amazon S3 when necessary
         * @param {Object} params
         * @param {String} params.QueueUrl - URL of the Amazon SQS queue from which messages are deleted.
         * @param {String} params.ReceiptHandle - the receipt handle associated with the message to delete.
         * @param {Function} callback - Function to be called when it is necessary
         * @return {Promise} The response from the DeleteMessage service method, as returned by AmazonSQS.
         */
        deleteMessage(params, callback) {
            const {s3Bucket, s3Key, receiptHandle} = utils.parseReceiptHandle(params.ReceiptHandle);

            if (s3Bucket && s3Key) {
                if (!this.extendedConfig.isLargePayloadSupportEnabled()) {
                    const err = new Error('ExtendedSQS::deleteMessage params refer to an S3 object but large payload support is disabled');

                    if (callback) {
                        callback(err);
                        return;
                    } else {
                        throw err;
                    }
                }

                params.ReceiptHandle = receiptHandle;

                const s3Params = {
                        Bucket: s3Bucket,
                        Key: s3Key
                    },
                    s3Request = this.extendedConfig.getAmazonS3Client().deleteObject(s3Params),
                    sqsRequest = super.deleteMessage(params);

                if (callback) {
                    s3Request
                        .on('complete', ({error, data}) => {
                            if (error) {
                                callback(error);
                            } else {
                                sqsRequest.send(callback);
                            }
                        });

                    s3Request.send();
                } else {
                    const s3RequestPromise = s3Request.promise;

                    s3Request.promise = () => {
                        return s3RequestPromise().then(() => {
                            return sqsRequest.promise();
                        });
                    };
                }

                return s3Request;
            } else {
                return super.deleteMessage(params, callback);
            }
        }

        /**
         * Deletes up to ten messages from the specified queue. This is a batch version of DeleteMessage.
         * The result of the delete action on each message is reported individually in the response.
         * Also deletes the message payloads from Amazon S3 when necessary.
         * @param {Object} params
         * @param {Array<map>} params.Entries - A list of receipt handles for the messages to be deleted.
         * @param {String} params.QueueUrl - URL of the Amazon SQS queue from which messages are deleted.
         * @param {Function} callback - Function to be called when it is necessary
         * @return {Promise} The response from the DeleteMessageBatch service method, as returned by AmazonSQS.
         */
        deleteMessageBatch(params = {}, callback) {
            const {Entries, QueueUrl} = params,
                messages = [];
            let s3Requests = [];

            if (Entries && Entries.length > 0) {
                for (const message of Entries) {
                    const {s3Bucket, s3Key, receiptHandle} = utils.parseReceiptHandle(message.ReceiptHandle);

                    if (s3Bucket && s3Key) {
                        if (!this.extendedConfig.isLargePayloadSupportEnabled()) {
                            const err = new Error(
                                'ExtendedSQS::deleteMessageBatch params refer to an S3 object but large payload support is disabled'
                            );

                            if (callback) {
                                callback(err);
                                return;
                            } else {
                                throw err;
                            }
                        }

                        const s3Params = {
                            Bucket: s3Bucket,
                            Key: s3Key
                        };

                        s3Requests.push(this.extendedConfig.getAmazonS3Client().deleteObject(s3Params));
                    }

                    messages.push({
                        Id: message.MessageId,
                        ReceiptHandle: receiptHandle
                    });
                }
            }

            if (s3Requests.length > 0) {
                const sqsRequest = super.deleteMessageBatch({
                    Entries: messages,
                    QueueUrl
                });

                if (callback) {
                    for (const s3Request of s3Requests) {
                        s3Request.on('complete', ({error, data}) => {
                            if (error) {
                                callback(error);
                            } else {
                                Promise.resolve();
                            }
                        });

                        s3Request.send();
                    }

                    sqsRequest.send(callback);
                } else {
                    const s3RequestPromise = [];

                    for (const s3Request of s3Requests) {
                        s3RequestPromise.push(s3Request.promise());
                    }

                    s3Requests = {};

                    s3Requests.promise = () => {
                        return Promise.all(s3RequestPromise).then(() => {
                            return sqsRequest.promise();
                        });
                    };
                }

                return s3Requests;
            } else {
                return super.deleteMessageBatch({
                    Entries: messages,
                    QueueUrl
                }, callback);
            }
        }

        /**
         * Replace SQS message by an S3 reference when sending a message. This method receives and mutates the sqs message to be sent.
         * @param {Object} message - SQS Message which MessageBody will be stored in S3
         * @param {Function} callback -  Function to be called when it is necessary
         * @return {Promise} - the response from the upload method, as returned by AmazonS3.
         */
        uploadToS3AndMutateSQSMessage(message, callback) {
            if (!this.extendedConfig.isLargePayloadSupportEnabled()) {
                const err = new Error('ExtendedSQS::sendMessage message is bigger than 256KB but large payload support is disabled');

                if (callback) {
                    callback(err);
                    return;
                } else {
                    throw err;
                }
            }

            const s3Params = {
                    Bucket: this.extendedConfig.getS3BucketName(),
                    Key: `${message.QueueUrl}/${uuid.v4()}`
                },
                s3Request = this.extendedConfig.getAmazonS3Client().upload(s3Params);

            let sqsRequest = {};

            if (!message.MessageAttributes) {
                message.MessageAttributes = {};
            }

            message.MessageAttributes[RESERVE_ATTRIBUTE_NAME] = {
                DataType: 'Number',
                Value: `${Buffer.byteLength(message.MessageBody)}`
            };

            message.MessageBody = `s3://${s3Params.Bucket}/${s3Params.Key}`;

            sqsRequest = super.sendMessage(message);

            if (callback) {
                s3Request.on('complete', ({error, data}) => {
                    if (error) {
                        callback(error);
                    } else {
                        sqsRequest.send(callback);
                    }
                });

                s3Request.send();
            } else {
                const s3RequestPromise = s3Request.promise;

                s3Request.promise = () => {
                    return s3RequestPromise.then(() => {
                        return sqsRequest.promise();
                    });
                };
            }

            return s3Request;
        }
    };


