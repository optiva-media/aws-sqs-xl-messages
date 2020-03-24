'use strict';

const RESERVE_ATTRIBUTE_NAME = 'SQSLargePayloadSize',
    RECEIPT_HANDLE_SEPARATOR = '-..SEPARATOR..-',
    fs = require('fs'),
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

            this.s3Bucket = this.extendedConfig.getS3BucketName();
            this.s3Client = this.extendedConfig.getAmazonS3Client();
        }
        /**
         *
         * @param {String} receiptHandle
         * @return {Boolean} true if it a url to S3, false otherwise
         */
        _isS3ReceiptHandle(receiptHandle) {
            return receiptHandle.contains(this.s3Bucket)
                    && receiptHandle.contains(RESERVE_ATTRIBUTE_NAME);
        }

        /**
         * Delivers a message to the specified queue and uploads the message payload to Amazon S3 if necessary.
         * @param {Object} message - the necessary parameters to execute the service method on AmazonSQS.
         * @return {Object} - the response from the SendMessage service method, as returned by AmazonSQS.
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
                console.log('entraaaaaaaa');
                await this.replaceSQSmessage();
            }

            return super.sendMessage(message);
        }

        /**
         * @param {String} params - I
         */
        async receiveMessage(params) {
            if (!params || !params.QueueUrl) {
                throw new Error('Parameters and/or queue url cannot be null.');
            }

            const messages = await super.receiveMessage(params).promise();

            if (messages && messages.length > 0) {
                for (const message of messages) {
                    if (message[RESERVE_ATTRIBUTE_NAME]) {
                        const downloadedMessage = await this.s3Client.getObject({
                            Bucket: this.s3Bucket,
                            Key: message.MessageBody
                        }).promise();

                        if (!downloadedMessage) {
                            throw new Error('');
                        }

                        delete message[RESERVE_ATTRIBUTE_NAME];

                        message.ReceiptHandle = `${message.MessageBody}` + `${RECEIPT_HANDLE_SEPARATOR}${message.ReceiptHandle}`;

                        message.MessageBody = downloadedMessage.MessageBody;
                    }
                };
            }

            return messages;
        }

        /**
         * @param {Object} message
         */
        async deleteMessage(message) {
            if (!message || !message.QueueUrl) {
                throw new Error('Message and/or queue url cannot be null.');
            }

            if (this.extendedConfig.isLargePayloadSupportEnabled()) {
                if (this._isS3ReceiptHandle(message.ReceiptHandle)) {
                    const first = message.ReceiptHandle.indexOf(this.s3Bucket),
                        second = message.ReceiptHandle.indexOf(RECEIPT_HANDLE_SEPARATOR),
                        s3Key = message.ReceiptHandle.substring(first + this.s3Bucket.length + 4, second - 1),
                        receiptHandle = message.ReceiptHandle.substring(
                            second + RECEIPT_HANDLE_SEPARATOR.length,
                            message.ReceiptHandle.length
                        );

                    await this.s3Client.deleteObject({
                        Bucket: this.s3Bucket,
                        Key: s3Key // enlace a s3?
                    }).promise();


                    message.ReceiptHandle = receiptHandle;
                }
            }

            return super.deleteMessage({
                QueueUrl: message.QueueUrl,
                ReceiptHandle: message.ReceiptHandle
            }).promise();
        }

        /**
         * @param {Array} entries - Kfdas
         * @param {String} queue -
         * @return {Object}
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
                if (!message.Id) {
                    // throw error ?
                }

                if (this.extendedConfig.isLargePayloadSupportEnabled()) {
                    if (this._isS3ReceiptHandle(message.ReceiptHandle)) {
                        const first = message.ReceiptHandle.indexOf(this.s3Bucket),
                            second = message.ReceiptHandle.indexOf(RECEIPT_HANDLE_SEPARATOR),
                            s3Key = message.ReceiptHandle.substring(first + this.s3Bucket.length + 4, second - 1),
                            receiptHandle = message.ReceiptHandle.substring(
                                second + RECEIPT_HANDLE_SEPARATOR.length,
                                message.ReceiptHandle.length
                            );

                        await this.s3Client.deleteObject({
                            Bucket: this.s3Bucket,
                            Key: s3Key // enlace a s3?
                        }).promise();


                        message.ReceiptHandle = receiptHandle;
                    }
                }

                messages.push({
                    Id: message.id,
                    ReceiptHandle: message.ReceiptHandle
                });
            }

            return super.deleteMessageBatch({
                QueueUrl: queue,
                Entries: messages
            }).promise();
        }

        /**
         * @param {Object} message - I
         */
        async replaceSQSmessage(message) {
            let s3Key;
            let uploadedMessage;

            try {
                s3Key = `${message.QueueUrl}/${UUID.v4()}`;

                if (!message || !message.MessageBody) {
                    throw new Error('Message and/or message body cannot be null.');
                }

                if (!this.s3Client || !this.s3Bucket) {
                    throw new Error('S3 client and/or S3 bucket name cannot be null.');
                }

                uploadedMessage = await this.s3Client.upload({
                    Bucket: this.s3Bucket,
                    Key: s3Key,
                    Body: fs.createReadStream(message.MessageBody)
                }).promise();

                if (!uploadedMessage) {
                    throw new Error();
                }

                message[RESERVE_ATTRIBUTE_NAME] = Buffer.byteLength(newMessage.MessageBody);

                message.MessageBody = `s3://<${this.s3Bucket}>/<${s3Key}>`;
            } catch (err) {

            }
        }
    };

