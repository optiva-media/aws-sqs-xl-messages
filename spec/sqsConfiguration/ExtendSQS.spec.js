'use strict';

const ExtendedConfiguration = require('../../app/src/sqsConfiguration/ExtendedConfiguration'),
    S3Error = require('../../app/common/S3Error'),
    SQS = function() {};


let ExtendedSQS;
let s3Mock;

describe('ExtendedSQS', () => {
    beforeAll(() => {
        SQS.prototype.sendMessage = function(message) {
            return {
                promise: () => Promise.resolve({})
            };
        };

        SQS.prototype.deleteMessage = function(message) {
            return {
                promise: () => Promise.resolve({})
            };
        };

        SQS.prototype.deleteMessageBatch = function(params) {
            return {
                promise: () => Promise.resolve({})
            };
        };

        SQS.prototype.receiveMessage = function(queue) {
            return {
                promise: () => Promise.resolve({
                    'Messages': [{
                        MessageId: '7b1e07c2-2aab-4a3a-82b9-190c130d58d4',
                        ReceiptHandle: 'AQE...',
                        MD5OfBody: 'c708249c52a2bebec91b9e9f3737ceef',
                        MessageBody: 's3://<s3Bucket>/<s3Key>',
                        MessageAttributes: [
                            {
                                Name: 'SQSLargePayloadSize',
                                Value: 1000
                            }
                        ]
                    }]})
            };
        };

        s3Mock = {
            upload: (param) => {
                return {
                    promise: () => Promise.resolve({})
                };
            },
            getObject: (param) => {
                return {
                    promise: () => Promise.resolve({})
                };
            },
            deleteObject: (param) => {
                return {
                    promise: () => Promise.resolve({})
                };
            }
        };

        // spyOn(s3Mock, 'upload').and.callThrough();

        ExtendedSQS = require('../../app/src/sqsConfiguration/ExtendedSQS')(SQS);
    });

    describe('Constructor', () => {
        describe('with empty parameters', () => {
            it('should create an instance of ExtendedSQS', () => {
                let error;
                let sqs;

                try {
                    sqs = new ExtendedSQS();
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeUndefined();
                    expect(sqs).toBeDefined();
                }
            });
        });

        describe('with options', () => {
            let extendedConfig;

            beforeEach(() => {
                extendedConfig = new ExtendedConfiguration();
                extendedConfig.enableLargePayloadSupport(s3Mock, 'my-bucket');
            });

            it('should create an instance of ExtendedSQS', () => {
                let error;
                let sqs;

                try {
                    sqs = new ExtendedSQS({extendedConfig});
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeUndefined();
                    expect(sqs).toBeDefined();
                }
            });
        });
    });

    describe('sendMessage', () => {
        let extendedConfig;
        let sqs;

        beforeEach(() => {
            extendedConfig = new ExtendedConfiguration();
            extendedConfig.enableLargePayloadSupport(s3Mock, 'my-bucket');
            sqs = new ExtendedSQS({extendedConfig});
        });

        describe('with messageBody and QueueUrl', () => {
            it('should send message', async () => {
                const message = {
                    MessageBody: 'test',
                    QueueUrl: 'test'
                };

                let error;
                let response;

                try {
                    response = await sqs.sendMessage(message).promise();
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeUndefined();
                    expect(response).toBeDefined();
                }
            });
        });

        describe('when alwaysThroughS3 is true', () => {
            const message = {
                MessageBody: 'test',
                QueueUrl: 'test'
            };

            beforeEach(() => {
                extendedConfig.setAlwaysThroughS3(true);
                spyOn(sqs, 'replaceSQSmessage').and.callThrough();
            });

            describe('with messageBody and QueueUrl', () => {
                it('should modify and send message', async () => {
                    let error;
                    let response;

                    try {
                        response = await sqs.sendMessage(message);
                    } catch (err) {
                        error = err;
                    } finally {
                        expect(error).toBeUndefined();
                        expect(sqs.replaceSQSmessage).toHaveBeenCalled();
                        expect(response).toBeDefined();
                    }
                });
            });
        });
    });

    describe('receiveMessage', () => {
        let extendedConfig;
        let sqs;

        beforeEach(() => {
            extendedConfig = new ExtendedConfiguration();
            extendedConfig.enableLargePayloadSupport(s3Mock, 'my-bucket');
            sqs = new ExtendedSQS({extendedConfig});
        });

        describe('with QueueUrl', () => {
            beforeEach(() => {
                extendedConfig.disableLargePayloadSupport();
            });

            it('should receive N messages', async () => {
                const QueueUrl = 'test';

                let error;
                let response;

                try {
                    response = await sqs.receiveMessage({QueueUrl}).promise();
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeUndefined();
                    expect(response).toBeDefined();
                    expect(response.Messages.length).toBeGreaterThan(0);
                }
            });
        });

        describe('when messages have SQSLargePayloadSize property', () => {
            const QueueUrl = 'test';

            describe('and object exists in S3', () => {
                beforeEach(() => {
                    const downloadMessage = {
                        Messages: [{
                            MessageId: '7b1e07c2-2aab-4a3a-82b9-190c130d58d4',
                            ReceiptHandle: 'AQE...',
                            MD5OfBody: 'c708249c52a2bebec91b9e9f3737ceef',
                            MessageBody: 's3://<s3Bucket>/<s3Key>',
                            MessageAttributes: [
                                {
                                    Name: 'SQSLargePayloadSize',
                                    Value: 1000
                                }
                            ]
                        }]
                    };

                    spyOn(s3Mock, 'getObject').and.returnValue({
                        promise: () => Promise.resolve(downloadMessage.Messages[0])
                    });
                });

                it('should download and modify message', async () => {
                    let error;
                    let response;

                    try {
                        response = await sqs.receiveMessage({QueueUrl}).promise();
                    } catch (err) {
                        error = err;
                    } finally {
                        expect(error).toBeUndefined();
                        expect(response).toBeDefined();
                        expect(s3Mock.getObject).toHaveBeenCalled();
                        expect(response.Messages.length).toBeGreaterThan(0);
                        expect(response.Messages[0]['SQSLargePayloadSize']).toBeUndefined();
                        expect(response.Messages[0]['ReceiptHandle']).toBeDefined();
                    }
                });
            });

            describe('and object does not exist in S3', () => {
                beforeEach(() => {
                    spyOn(s3Mock, 'getObject').and.throwError();
                });

                it('should throw an error', async () => {
                    let error;
                    let response;

                    try {
                        response = await sqs.receiveMessage({QueueUrl}).promise();
                    } catch (err) {
                        error = err;
                    } finally {
                        expect(response).toBeUndefined();
                        expect(error).toBeDefined();
                        expect(s3Mock.getObject).toHaveBeenCalled();
                    }
                });
            });
        });
    });

    describe('deleteMessage', () => {
        let extendedConfig;
        let sqs;

        beforeEach(() => {
            extendedConfig = new ExtendedConfiguration();
            extendedConfig.enableLargePayloadSupport(s3Mock, 's3Bucket');
            sqs = new ExtendedSQS({extendedConfig});
        });

        describe('with QueueUrl', () => {
            beforeEach(() => {
                spyOn(sqs, 'isS3ReceiptHandle').and.returnValue(false);
            });

            it('should delete message', async () => {
                const message = {
                    QueueUrl: 'test',
                    ReceiptHandle: 'test'
                };

                let error;
                let response;

                try {
                    response = await sqs.deleteMessage(message).promise();
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeUndefined();
                    expect(response).toBeDefined();
                }
            });
        });

        describe('when receiptHandle is an url to S3', () => {
            const message = {
                QueueUrl: 'test',
                ReceiptHandle: 's3://<s3Bucket>/<s3Key>-..SEPARATOR..-AQE...'
            };

            describe('with QueueUrl', () => {
                beforeEach(() => {
                    spyOn(sqs, '_messageToDelete').and.callThrough();
                });

                it('should delete message', async () => {
                    let error;
                    let response;

                    try {
                        response = await sqs.deleteMessage(message).promise();
                    } catch (err) {
                        error = err;
                    } finally {
                        expect(error).toBeUndefined();
                        expect(response).toBeDefined();
                        expect(sqs._messageToDelete).toHaveBeenCalled();
                    }
                });
            });
        });
    });

    describe('deleteMessageBatch', () => {
        const messages = [{
                'MessageId': '7b1e07c2-2aab-4a3a-82b9-190c130d58d4',
                'ReceiptHandle': 'AQE...',
                'MD5OfBody': 'c708249c52a2bebec91b9e9f3737ceef',
                'MessageBody': '{"hash": "123","version": 1,"files": [ {"file_path": "/public_html/mediaflow/fichero1.xml",' +
                    '"file_size": 200}]}'
            }],
            queue = 'test';

        let extendedConfig;
        let sqs;

        beforeEach(() => {
            extendedConfig = new ExtendedConfiguration();
            extendedConfig.enableLargePayloadSupport(s3Mock, 's3Bucket');
            sqs = new ExtendedSQS({extendedConfig});
        });

        describe('with messages and queue', () => {
            it('should delete message', async () => {
                let error;
                let response;

                try {
                    response = await sqs.deleteMessageBatch({Entries: messages, QueueUrl: queue}).promise();
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeUndefined();
                    expect(response).toBeDefined();
                }
            });
        });

        describe('when messages has a url to S3', () => {
            beforeEach(() => {
                messages[0]['ReceiptHandle'] = 's3://<s3Bucket>/<s3Key>-..SEPARATOR..-AQE...';

                spyOn(sqs, '_messageToDelete').and.callThrough();
            });

            it('should modify receiptHandle and delete messages', async () => {
                let error;
                let response;

                try {
                    response = await sqs.deleteMessageBatch({Entries: messages, QueueUrl: queue}).promise();
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeUndefined();
                    expect(sqs._messageToDelete).toHaveBeenCalled();
                    expect(response).toBeDefined();
                }
            });
        });
    });

    describe('_messageToDelete', () => {
        const message = {
            QueueUrl: 'test',
            ReceiptHandle: 's3://<s3Bucket>/<s3Key>-..SEPARATOR..-AQE...'
        };

        let sqs;
        let extendedConfig;

        beforeEach(() => {
            extendedConfig = new ExtendedConfiguration();
            extendedConfig.enableLargePayloadSupport(s3Mock, 's3Bucket');
            sqs = new ExtendedSQS({extendedConfig});
        });

        describe('when doesn\'t delete message', () => {
            beforeEach(() => {
                spyOn(s3Mock, 'deleteObject').and.throwError();
            });

            it('should throw error', () => {
                let error;

                try {
                    sqs._messageToDelete(message);
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeDefined();
                }
            });
        });
    });

    describe('replaceSQSmessage', () => {
        const message = {
            QueueUrl: 'test',
            MessageBody: 'test'
        };

        let extendedConfig;
        let sqs;

        beforeEach(() => {
            extendedConfig = new ExtendedConfiguration();
            extendedConfig.enableLargePayloadSupport(s3Mock, 's3Bucket');
            sqs = new ExtendedSQS({extendedConfig});
        });

        describe('without s3 client and s3Bucket', () => {
            beforeEach(() => {
                extendedConfig.disableLargePayloadSupport(s3Mock, 's3Bucket');
                sqs = new ExtendedSQS({extendedConfig});
            });

            it('should throw an error', () => {
                let error;

                try {
                    sqs.replaceSQSmessage(message);
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeDefined();
                }
            });
        });

        describe('when params necessary are passed and S3', () => {
            const messageBody = message.MessageBody;

            describe('with QueueUrl', () => {
                beforeEach(() => {
                    spyOn(s3Mock, 'upload').and.callThrough();
                });

                it('should delete message', () => {
                    let error;

                    try {
                        sqs.replaceSQSmessage(message);
                    } catch (err) {
                        error = err;
                    } finally {
                        expect(error).toBeUndefined();
                        expect(s3Mock.upload).toHaveBeenCalled();
                        expect(message['MessageBody']).toBeDefined();
                        expect(message.MessageAttributes[0]['Name']).toBeDefined();
                        expect(message.MessageAttributes[0]['Name']).toBe('SQSLargePayloadSize');
                        expect(message.MessageAttributes[0]['Value']).toBe(Buffer.byteLength(messageBody));
                    }
                });
            });
        });

        describe('when doesn\'t upload message', () => {
            beforeEach(() => {
                spyOn(s3Mock, 'upload').and.throwError();
            });

            it('should throw an S3error', () => {
                let error;
                try {
                    sqs.replaceSQSmessage(message);
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeDefined();
                    expect(error).toBeInstanceOf(S3Error);
                }
            });
        });
    });
});
