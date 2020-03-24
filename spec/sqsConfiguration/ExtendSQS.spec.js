'use strict';

const ExtendedConfiguration = require('../../app/src//sqsConfiguration/ExtendedConfiguration'),
    mockery = require('mockery');

let awsSdkMock;
let ExtendedSQS;

describe('ExtendedSQS', () => {
    beforeAll(()=>{
        mockery.enable({useCleanCache: true, warnOnUnregistered: false});

        awsSdkMock = require('../helpers/awsSdkMock');
        mockery.registerMock('aws-sdk', awsSdkMock);

        ExtendedSQS = require('../../app/src/sqsConfiguration/ExtendedSQS')(awsSdkMock.SQS);
    });

    afterAll(() => {
        mockery.deregisterAll();
        mockery.disable();
    });

    /**
     * @return {Object}
     */
    function buildSQSMessage() {
        return {
            MessageId: '7b1e07c2-2aab-4a3a-82b9-190c130d58d4',
            ReceiptHandle: 'AQE...',
            MD5OfBody: 'c708249c52a2bebec91b9e9f3737ceef',
            Body: '{"hash": "123","version": 1,"files": [{"file_path": "/public_html/mediaflow/fichero1.xml",' +
            '"file_size": 200}]}'
        };
    }

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
                extendedConfig.enableLargePayloadSupport({}, 'my-bucket');
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
            extendedConfig.enableLargePayloadSupport({}, 'my-bucket');
            sqs = new ExtendedSQS({extendedConfig});
        });

        describe('with empty message', () => {
            it('should throw an error', async () => {
                let error;
                let response;

                try {
                    response = await sqs.sendMessage({});
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
                    response = await sqs.sendMessage(message);
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
                    response = await sqs.sendMessage(message);
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

                    return Promise.resolve(message);
                });
            });

            describe('with messageBody and QueueUrl', () => {
                it('should  modify and send message', async () => {
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
            extendedConfig.enableLargePayloadSupport({}, 'my-bucket');
            sqs = new ExtendedSQS({extendedConfig});
        });

        describe('without QueueUrl', () => {
            it('should throw an error', async () => {
                let error;
                let response;

                try {
                    response = await sqs.receiveMessage({});
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
                const message = {
                    MessageBody: 'test',
                    QueueUrl: 'test'
                };

                let error;
                let response;

                try {
                    response = await sqs.receiveMessage({QueueUrl: message.QueueUrl});
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeUndefined();
                    expect(response).toBeDefined();
                }
            });
        });

        xdescribe('when alwaysThroughS3 is true', () => {
            const message = {
                MessageBody: 'test',
                QueueUrl: 'test'
            };

            beforeEach(() => {
                extendedConfig.setAlwaysThroughS3(true);

                spyOn(sqs, 'replaceSQSmessage').and.callFake(() => {
                    message.MessageBody = 'replaceMessage';

                    return Promise.resolve(message);
                });
            });

            describe('with messageBody and QueueUrl', () => {
                it('should  modify and send message', async () => {
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
});
