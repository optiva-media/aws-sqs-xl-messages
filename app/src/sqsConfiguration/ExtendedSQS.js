'use strict';

const RESERVE_ATTRIBUTE_NAME = 'SQSLargePayloadSize',
    RECEIPT_HANDLE_SEPARATOR = '-..SEPARATOR..-',
    UUID = require('uuid'),
    ExtendedConfiguration = require('./ExtendedConfiguration');

// SQS is the SQS client class from aws-sdk. We inject it to avoid dependencies
// between this library and aws-sdk
module.exports = (SQS) =>
    class ExtendedSQS extends SQS {
        /**
         *
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
         *
         * @param {String} receiptHandle
         * @return {Boolean} true if it a url to S3, false otherwise
         */
        isS3ReceiptHandle(receiptHandle) {
            return receiptHandle.includes(this.extendedConfig.getS3BucketName())
                    && receiptHandle.includes(RECEIPT_HANDLE_SEPARATOR);
        }

        /**
         * Get s3Key from the modified receiptHandle
         * @param {String} receiptHandle
         * @param {String} separator
         * @return {String} s3Key
         */
        gets3Key(receiptHandle, separator = RECEIPT_HANDLE_SEPARATOR) {
            const s3BucketPosition = receiptHandle.indexOf(this.extendedConfig.getS3BucketName()),
                separatorPosition = receiptHandle.indexOf(separator);

            return receiptHandle.substring(s3BucketPosition + this.extendedConfig.getS3BucketName().length + 3, separatorPosition - 1);
        }

        /**
         * Get the original receiptHandle from the modified receiptHandle
         * @param {String} receiptHandle
         * @param {String} separator
         * @return {String} original receiptHandle
         */
        getReceiptHandle(receiptHandle, separator = RECEIPT_HANDLE_SEPARATOR) {
            const separatorPosition = receiptHandle.indexOf(separator);

            return receiptHandle.substring(separatorPosition + separator.length, receiptHandle.length);
        }

        /**
         * Delivers a message to the specified queue and uploads the message payload to Amazon S3 if necessary.
         * @param {Object} message - the necessary parameters to execute the service method on AmazonSQS.
         * @return {Promise} - the response from the SendMessage service method, as returned by AmazonSQS.
         */
        async sendMessage(message) {
            if (!message || !message.MessageBody) {
                throw new Error('Message and/or message body cannot be null.');
            }

            if (!message.QueueUrl) {
                throw new Error('Queue url cannot be null.');
            }


            if (this.extendedConfig.isAlwaysThroughS3() ||
                        Buffer.byteLength(message.MessageBody) > this.extendedConfig.getMessageSizeThreshold()) {
                await this.replaceSQSmessage();
            }

            return super.sendMessage(message);
        }

        /**
         * Retrieves one or more messages, with a maximum limit of 10 messages, from
         * the specified queue. Downloads the message payloads from Amazon S3 when necessary.
         * @param {Object} params - the necessary parameters to execute the service method on AmazonSQS.
         * @return {Promise} - the response from the ReceiveMessage service method, as returned by AmazonSQS.
         */
        async receiveMessage(params) {
            if (!params || !params.QueueUrl) {
                throw new Error('Parameters and/or queue url cannot be null.');
            }

            const messages = await super.receiveMessage(params).promise();

            if (messages && messages.length > 0) {
                for (const message of messages) {
                    if (message[RESERVE_ATTRIBUTE_NAME]) {
                        const downloadedMessage = await this.extendedConfig.getAmazonS3Client().getObject({
                            Bucket: this.extendedConfig.getS3BucketName(),
                            Key: message.MessageBody
                        });


                        if (!downloadedMessage || !downloadedMessage.Body) {
                            throw new Error('');
                        }
                        delete message[RESERVE_ATTRIBUTE_NAME];

                        message.ReceiptHandle = `${message.MessageBody}` + `${RECEIPT_HANDLE_SEPARATOR}${message.ReceiptHandle}`;

                        message.MessageBody = downloadedMessage.Body;
                    }
                };
            }

            return messages;
        }


        /**
         * Deletes the specified message from the specified queue and deletes the message payload from Amazon S3 when necessary
         * @param {Object} message
         * @return {Promise} The response from the DeleteMessage service method, as returned by AmazonSQS.
         */
        async deleteMessage(message) {
            if (!message || !message.QueueUrl) {
                throw new Error('Message and/or queue url cannot be null.');
            }

            if (this.extendedConfig.isLargePayloadSupportEnabled()) {
                if (message.ReceiptHandle && this.isS3ReceiptHandle(message.ReceiptHandle)) {
                    const s3Key = this.gets3Key(message.ReceiptHandle, RECEIPT_HANDLE_SEPARATOR),
                        receiptHandle = this.getReceiptHandle(message.ReceiptHandle, RECEIPT_HANDLE_SEPARATOR);

                    await this.extendedConfig.getAmazonS3Client().deleteObject({
                        Bucket: this.extendedConfig.getS3BucketName(),
                        Key: s3Key
                    });

                    message.ReceiptHandle = receiptHandle;
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
         * @param {Array} entries
         * @param {String} queue
         * @return {Promise} The response from the DeleteMessage service method, as returned by AmazonSQS.
         */
        async deleteMessageBatch(entries, queue) {
            const messages = [];

            if (!entries || entries.length == 0) {
                throw new Error('Entries cannot be null.');
            }

            if (!queue) {
                throw new Error('Queue cannot be null.');
            }

            for (const message of entries) {
                if (!message.MessageId) {
                    throw new Error('Missing MessageId on message');
                }

                if (this.extendedConfig.isLargePayloadSupportEnabled()) {
                    if (message.ReceiptHandle && this.isS3ReceiptHandle(message.ReceiptHandle)) {
                        const s3Key = this.gets3Key(message.ReceiptHandle, RECEIPT_HANDLE_SEPARATOR),
                            receiptHandle = this.getReceiptHandle(message.ReceiptHandle, RECEIPT_HANDLE_SEPARATOR);

                        await this.extendedConfig.getAmazonS3Client().deleteObject({
                            Bucket: this.extendedConfig.getS3BucketName(),
                            Key: s3Key
                        });

                        message.ReceiptHandle = receiptHandle;
                    }
                }


                messages.push({
                    Id: message.MessageId,
                    ReceiptHandle: message.ReceiptHandle
                });
            }

            return super.deleteMessageBatch({
                QueueUrl: queue,
                Entries: messages
            }).promise();
        }

        /**
         * Replace SQS message by an S3 reference when sending a message. This method receives and mutates the sqs message to be sent.
         * @param {Object} message - Message to store in S3 bucket
         */
        async replaceSQSmessage(message) {
            let s3Key;
            let uploadedMessage;

            try {
                if (!message || !message.QueueUrl) {
                    throw new Error('Message and/or message QueueUrl cannot be null.');
                }

                if (!message.MessageBody) {
                    throw new Error('Message body cannot be null.');
                }

                if (!this.extendedConfig.getAmazonS3Client() || !this.extendedConfig.getS3BucketName()) {
                    throw new Error('S3 client and/or S3 bucket name cannot be null.');
                }

                s3Key = `${message.QueueUrl}/${UUID.v4()}`;

                uploadedMessage = await this.extendedConfig.getAmazonS3Client().upload({
                    Bucket: this.extendedConfig.getS3BucketName(),
                    Key: s3Key,
                    Body: message.MessageBody
                });

                if (!uploadedMessage) {
                    throw new Error('Error uploading message');
                }

                message[RESERVE_ATTRIBUTE_NAME] = Buffer.byteLength(message.MessageBody);

                message.MessageBody = `s3://<${this.extendedConfig.getS3BucketName()}>/<${s3Key}>`;
            } catch (err) {
                throw err;
            }
        }
    };

