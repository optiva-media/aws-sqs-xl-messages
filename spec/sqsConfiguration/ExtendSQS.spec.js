'use strict';

const ExtendedConfiguration = require('../../app/src/sqsConfiguration/ExtendedConfiguration'),
    mockery = require('mockery');

let awsSdkMock;
let ExtendedSQS;
let s3Client;

describe('ExtendedSQS', () => {
    beforeAll(()=>{
        mockery.enable({useCleanCache: true, warnOnUnregistered: false});

        awsSdkMock = require('../helpers/awsSdkMock');
        mockery.registerMock('aws-sdk', awsSdkMock);

        ExtendedSQS = require('../../app/src/sqsConfiguration/ExtendedSQS')(awsSdkMock.SQS);
        s3Client = awsSdkMock.S3.prototype;
    });

    afterAll(() => {
        mockery.deregisterAll();
        mockery.disable();
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
                extendedConfig.enableLargePayloadSupport(s3Client, 'my-bucket');
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
            extendedConfig.enableLargePayloadSupport(s3Client, 'my-bucket');
            sqs = new ExtendedSQS({extendedConfig});
        });

        describe('with empty message', () => {
            it('should throw an error', async () => {
                let error;
                let response;

                try {
                    response = await sqs.sendMessage({}).promise();
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeDefined();
                    expect(response).toBeUndefined();
                }
            });
        });

        describe('with messageBody but without QueueUrl', () => {
            it('should throw an error', async () => {
                const message = {
                    MessageBody: 'test'
                };

                let error;
                let response;

                try {
                    response = await sqs.sendMessage(message).promise();
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeDefined();
                    expect(response).toBeUndefined();
                }
            });
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

                spyOn(sqs, 'replaceSQSmessage').and.callFake(() => {
                    message.MessageBody = 'replaceMessage';

                    return message;
                });
            });

            describe('with messageBody and QueueUrl', () => {
                it('should  modify and send message', async () => {
                    let error;
                    let response;

                    try {
                        response = await sqs.sendMessage(message).promise();
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
            extendedConfig.enableLargePayloadSupport(s3Client, 'my-bucket');
            sqs = new ExtendedSQS({extendedConfig});
        });

        describe('without QueueUrl', () => {
            it('should throw an error', async () => {
                let error;
                let response;

                try {
                    response = await sqs.receiveMessage({}).promise();
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeDefined();
                    expect(response).toBeUndefined();
                }
            });
        });

        describe('with QueueUrl', () => {
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
                    expect(response.length).toBeGreaterThan(0);
                }
            });
        });

        describe('when messages have SQSLargePayloadSize property', () => {
            const QueueUrl = 'test';

            beforeEach(() => {
                sqs.dataMap.receiveReturnedMessages = {
                    Messages: [{
                        MessageId: '7b1e07c2-2aab-4a3a-82b9-190c130d58d4',
                        ReceiptHandle: 'AQE...',
                        MD5OfBody: 'c708249c52a2bebec91b9e9f3737ceef',
                        MessageBody: 's3://<s3Bucket>/<s3Key>',
                        SQSLargePayloadSize: 1000
                    }]
                };
            });

            describe('and exists object in S3', () => {
                beforeEach(() => {
                    spyOn(s3Client, 'getObject').and.callThrough();
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
                        expect(s3Client.getObject).toHaveBeenCalled();
                        expect(response.length).toBeGreaterThan(0);
                        expect(response[0]['SQSLargePayloadSize']).toBeUndefined();
                        expect(response[0]['ReceiptHandle']).toBeDefined();
                    }
                });
            });

            describe('and does not exist object in S3', () => {
                beforeEach(() => {
                    spyOn(s3Client, 'getObject').and.returnValue(null);
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
                        expect(s3Client.getObject).toHaveBeenCalled();
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
            extendedConfig.enableLargePayloadSupport(s3Client, 's3Bucket');
            sqs = new ExtendedSQS({extendedConfig});
        });

        describe('with empty message', () => {
            it('should throw an error', async () => {
                let error;
                let response;

                try {
                    response = await sqs.deleteMessage({}).promise();
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeDefined();
                    expect(response).toBeUndefined();
                }
            });
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

            beforeEach(() => {
                spyOn(s3Client, 'deleteObject').and.callThrough();

                spyOn(sqs, 'isS3ReceiptHandle').and.returnValue(true);
            });

            describe('with QueueUrl', () => {
                it('should delete message', async () => {
                    let error;
                    let response;

                    try {
                        response = await sqs.deleteMessage(message).promise();
                    } catch (err) {
                        error = err;
                    } finally {
                        expect(error).toBeUndefined();
                        expect(s3Client.deleteObject).toHaveBeenCalled();
                        expect(sqs.isS3ReceiptHandle).toHaveBeenCalled();
                        expect(response).toBeDefined();
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
            extendedConfig.enableLargePayloadSupport(s3Client, 's3Bucket');
            sqs = new ExtendedSQS({extendedConfig});
        });

        describe('with empty messages', () => {
            it('should throw an error', async () => {
                let error;
                let response;

                try {
                    response = await sqs.deleteMessageBatch({}).promise();
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeDefined();
                    expect(response).toBeUndefined();
                }
            });
        });

        describe('without queue', () => {
            it('should throw an error', async () => {
                let error;
                let response;

                try {
                    response = await sqs.deleteMessageBatch(messages).promise();
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeDefined();
                    expect(response).toBeUndefined();
                }
            });
        });


        describe('with message and queue', () => {
            beforeEach(() => {
                spyOn(sqs, 'isS3ReceiptHandle').and.returnValue(false);
            });

            it('should delete message', async () => {
                let error;
                let response;

                try {
                    response = await sqs.deleteMessageBatch(messages, queue).promise();
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

                spyOn(s3Client, 'deleteObject').and.callThrough();

                spyOn(sqs, 'isS3ReceiptHandle').and.returnValue(true);
            });

            it('should modify receiptHandle and delete messages', async () => {
                let error;
                let response;

                try {
                    response = await sqs.deleteMessageBatch(messages, queue).promise();
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeUndefined();
                    expect(s3Client.deleteObject).toHaveBeenCalled();
                    expect(sqs.isS3ReceiptHandle).toHaveBeenCalled();
                    expect(response).toBeDefined();
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
            extendedConfig.enableLargePayloadSupport(s3Client, 's3Bucket');
            sqs = new ExtendedSQS({extendedConfig});
        });

        describe('with empty message', () => {
            it('should throw an error', async () => {
                let error;

                try {
                    await sqs.replaceSQSmessage();
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeDefined();
                }
            });
        });

        describe('without QueueUrl', () => {
            it('should throw an error', async () => {
                let error;

                try {
                    await sqs.replaceSQSmessage({});
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeDefined();
                }
            });
        });

        describe('without s3 client and s3Bucket', () => {
            beforeEach(() => {
                extendedConfig.disableLargePayloadSupport(s3Client, 's3Bucket');
                sqs = new ExtendedSQS({extendedConfig});
            });

            it('should throw an error', async () => {
                let error;

                try {
                    await sqs.replaceSQSmessage(message);
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeDefined();
                }
            });
        });

        describe('when params necessary are passed and S3', () => {
            const messageBody = message.MessageBody;

            beforeEach(() => {
                spyOn(s3Client, 'upload').and.callThrough();
            });

            describe('with QueueUrl', () => {
                it('should delete message', async () => {
                    let error;

                    try {
                        await sqs.replaceSQSmessage(message);
                    } catch (err) {
                        error = err;
                    } finally {
                        expect(error).toBeUndefined();
                        expect(s3Client.upload).toHaveBeenCalled();
                        expect(message['MessageBody']).toBeDefined();
                        expect(message['SQSLargePayloadSize']).toBeDefined();
                        expect(message['SQSLargePayloadSize']).toBe(Buffer.byteLength(messageBody));
                    }
                });
            });
        });
    });
});
