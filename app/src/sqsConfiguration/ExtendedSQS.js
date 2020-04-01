'use strict';

const RESERVE_ATTRIBUTE_NAME = 'SQSLargePayloadSize',
    RECEIPT_HANDLE_SEPARATOR = '-..SEPARATOR..-',
    uuid = require('uuid'),
    S3Error = require('../../common/S3Error'),
    ExtendedConfiguration = require('./ExtendedConfiguration');

// SQS is the SQS client class from aws-sdk. We inject it to avoid dependencies
// between this library and aws-sdk
module.exports = (SQS) =>
    class ExtendedSQS extends SQS {
        /**
         * Constructor of ExtendSQS
         * @param {Object} options
         */
        constructor(options) {
            super(options);
            if (!options || !options.extendedConfig) {
                this.extendedConfig = new ExtendedConfiguration();
            } else {
                this.extendedConfig = options.extendedConfig;
            }
        }

        /**
         * Check if receiptHandle is an url to s3
         * @param {String} receiptHandle
         * @return {Boolean} true if it a url to S3, false otherwise
         */
        isS3ReceiptHandle(receiptHandle = '') {
            return receiptHandle.includes(RECEIPT_HANDLE_SEPARATOR);
        }

        /**
         * Get s3Key from the modified receiptHandle
         * @param {String} receiptHandle
         * @param {String} separator
         * @return {String} s3Key
         */
        gets3Key(receiptHandle = '', separator = RECEIPT_HANDLE_SEPARATOR) {
            const parts = receiptHandle.split(separator);

            if (parts.length === 2) {
                return parts[0];
            } else {
                return undefined;
            }
        }

        /**
         * Get the original receiptHandle from the modified receiptHandle
         * @param {String} receiptHandle
         * @param {String} separator
         * @return {String} original receiptHandle
         */
        getReceiptHandle(receiptHandle = '', separator = RECEIPT_HANDLE_SEPARATOR) {
            const parts = receiptHandle.split(separator);

            if (parts.length === 2) {
                return parts[1];
            } else {
                return undefined;
            }
        }

        /**
         * Get the indicated element from array
         * @param {Array} messageAttributes
         * @param {String} name
         * @return {Object}
         */
        getMessageAttribute(messageAttributes = [], name ='') {
            return messageAttributes.find((element) => element.Name === name);
        }

        /**
         * Delete the indicated element from array
         * @param {Array} messageAttributes
         * @param {Object} attribute
         */
        deleteMessageAttribute(messageAttributes = [], attribute = {}) {
            const index = messageAttributes.indexOf(attribute);
            if (index > -1) {
                messageAttributes.splice(index, 1);
            }
        }

        /**
         * Delivers a message to the specified queue and uploads the message payload to Amazon S3 if necessary.
         * @param {Object} message - the necessary parameters to execute the service method on AmazonSQS.
         * @param {Function} callback -  Function to be called when it is necessary
         * @return {Promise} - the response from the SendMessage service method, as returned by AmazonSQS.
         */
        sendMessage(message, callback) {
            if (this.extendedConfig.isAlwaysThroughS3() ||
                                Buffer.byteLength(message.MessageBody) > this.extendedConfig.getMessageSizeThreshold()) {
                this.replaceSQSmessage(message);
            }

            if (callback) {
                try {
                    const response = super.sendMessage(message);
                    return callback(null, response);
                } catch (err) {
                    return callback(err);
                }
            }

            return super.sendMessage(message);
        }

        /**
         * Retrieves one or more messages, with a maximum limit of 10 messages, from
         * the specified queue. Downloads the message payloads from Amazon S3 when necessary.
         * @param {Object} params - the necessary parameters to execute the service method on AmazonSQS.
         * @return {Promise} - the response from the ReceiveMessage service method, as returned by AmazonSQS.
         */
        async _receiveMessage(params) {
            const {Messages} = await super.receiveMessage(params).promise();
            let largePayloadAttributeValue;

            if (Messages && Messages.length > 0) {
                for (const message of Messages) {
                    largePayloadAttributeValue = this.getMessageAttribute(message.MessageAttributes, RESERVE_ATTRIBUTE_NAME);

                    if (largePayloadAttributeValue && this.extendedConfig.isLargePayloadSupportEnabled()) {
                        if (!this.extendedConfig.getAmazonS3Client() || !this.extendedConfig.getS3BucketName()) {
                            throw new Error('S3 client and/or S3 bucket name cannot be null.');
                        }

                        let downloadedMessage;

                        try {
                            downloadedMessage = await this.extendedConfig.getAmazonS3Client().getObject({
                                Bucket: this.extendedConfig.getS3BucketName(),
                                Key: message.MessageBody
                            }).promise();
                        } catch {
                            throw new S3Error('Error downloading message');
                        }

                        if (!downloadedMessage) {
                            throw new S3Error('Error downloading message');
                        }

                        this.deleteMessageAttribute(message.MessageAttributes, RESERVE_ATTRIBUTE_NAME);

                        message.ReceiptHandle = `${message.MessageBody}${RECEIPT_HANDLE_SEPARATOR}${message.ReceiptHandle}`;

                        message.MessageBody = downloadedMessage.MessageBody;
                    }
                }
            }

            return {
                Messages: Messages
            };
        }
        /**
         * Wrapper of receiveMessages into promise
         * @param {Object} params - the necessary parameters to execute the service method on AmazonSQS.
         * @param {Function} callback - Function to be called when it is necessary
         * @return {Promise}
         */
        receiveMessage(params, callback) {
            if (callback) {
                try {
                    const response = this._receiveMessage(params);
                    return callback(null, response);
                } catch (err) {
                    return callback(err);
                }
            }

            return {
                promise: async () => {
                    const response = await this._receiveMessage(params);
                    return Promise.resolve(response);
                }
            };
        }

        /**
         * deletes the message payload from Amazon S3 if it is necessary
         * @private
         * @param {Object} message - Meessage to delete
         */
        _messageToDelete(message) {
            if (this.extendedConfig.isLargePayloadSupportEnabled()
                && this.isS3ReceiptHandle(message.ReceiptHandle)) {
                const s3Key = this.gets3Key(message.ReceiptHandle, RECEIPT_HANDLE_SEPARATOR),
                    receiptHandle = this.getReceiptHandle(message.ReceiptHandle, RECEIPT_HANDLE_SEPARATOR);

                if (!this.extendedConfig.getAmazonS3Client() || !this.extendedConfig.getS3BucketName()) {
                    throw new Error('S3 client and/or S3 bucket name cannot be null.');
                }

                try {
                    const deleteMessage = this.extendedConfig.getAmazonS3Client().deleteObject({
                        Bucket: this.extendedConfig.getS3BucketName(),
                        Key: s3Key
                    }).promise();

                    deleteMessage.then(()=>{});
                } catch {
                    throw new S3Error('Error deleting message');
                }


                message.ReceiptHandle = receiptHandle;
            }
        }

        /**
         * Deletes the specified message from the specified queue
         * @param {Object} message
         * @param {Function} callback - Function to be called when it is necessary
         * @return {Promise} The response from the DeleteMessage service method, as returned by AmazonSQS.
         */
        deleteMessage(message, callback) {
            this._messageToDelete(message);

            if (callback) {
                try {
                    const response = super.deleteMessage({
                        QueueUrl: message.QueueUrl,
                        ReceiptHandle: message.ReceiptHandle
                    });

                    return callback(null, response);
                } catch (err) {
                    return callback(err);
                }
            }

            return super.deleteMessage({
                QueueUrl: message.QueueUrl,
                ReceiptHandle: message.ReceiptHandle
            });
        }

        /**
         * Deletes up to ten messages from the specified queue. This is a batch version of DeleteMessage.
         * The result of the delete action on each message is reported individually in the response.
         * Also deletes the message payloads from Amazon S3 when necessary.
         * @param {Object} params
         * @param {Function} callback - Function to be called when it is necessary
         * @return {Promise} The response from the DeleteMessage service method, as returned by AmazonSQS.
         */
        deleteMessageBatch(params = {}, callback) {
            const {Entries, QueueUrl} = params,
                messages = [];

            if (Entries && Entries.length > 0) {
                for (const message of Entries) {
                    this._messageToDelete(message);

                    messages.push({
                        Id: message.MessageId,
                        ReceiptHandle: message.ReceiptHandle
                    });
                }
            }

            if (callback) {
                const response = super.deleteMessage({
                    QueueUrl: QueueUrl,
                    Entries: messages
                });
                return callback(null, response);
            }

            return super.deleteMessageBatch({
                QueueUrl: QueueUrl,
                Entries: messages
            });
        }

        /**
         * Replace SQS message by an S3 reference when sending a message. This method receives and mutates the sqs message to be sent.
         * @param {Object} message - Message to store in S3 bucket
         */
        replaceSQSmessage(message) {
            if (!this.extendedConfig.getAmazonS3Client() || !this.extendedConfig.getS3BucketName()) {
                throw new Error('S3 client and/or S3 bucket name cannot be null.');
            }

            const s3Client = this.extendedConfig.getAmazonS3Client(),
                s3Bucket = this.extendedConfig.getS3BucketName(),
                s3Key = `${message.QueueUrl}/${uuid.v4()}`;


            try {
                const uploadingMessage = s3Client
                    .upload({
                        Bucket: this.extendedConfig.getS3BucketName(),
                        Key: s3Key,
                        Body: message.MessageBody
                    }).promise();

                uploadingMessage.
                    then(() => {
                        // logger?
                    });
            } catch {
                throw new S3Error('Error uploading message');
            }

            if (!message.MessageAttributes) {
                message.MessageAttributes = [];
            }

            message.MessageAttributes.push({
                Name: RESERVE_ATTRIBUTE_NAME,
                Value: Buffer.byteLength(message.MessageBody),
                Type: 'Number'
            });

            message.MessageBody = `s3://<${s3Bucket}>/<${s3Key}>`;
        }
    };


