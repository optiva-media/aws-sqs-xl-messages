'use strict';

describe('SQSExt', () => {
    const extendSQSMixin = require('../src/extendSQSMixin'),
        Config = require('../src/config');

    let SQSMock;
    let SQSExt;
    let sqs;

    beforeEach(() => {
        SQSMock = function SQS() {};
        SQSExt = extendSQSMixin(SQSMock);
    });

    describe('constructor', () => {
        [undefined, null, {}].forEach((options) => {
            it(`should instanciate an sqs client with extended config when options doesn't include one [options=${options}]`, () => {
                sqs = new SQSExt();

                expect(sqs).toBeInstanceOf(SQSMock);
                expect(sqs).toBeInstanceOf(SQSExt);
                expect(sqs.extendedConfig).toBeInstanceOf(Config);
            });
        });

        describe('when options includes an extended config', () => {
            let extendedConfig;

            beforeEach(() => {
                extendedConfig = {};
            });

            it('should instanciate an sqs client with the given extended config', () => {
                sqs = new SQSExt({extendedConfig});

                expect(sqs).toBeInstanceOf(SQSMock);
                expect(sqs).toBeInstanceOf(SQSExt);
                expect(sqs.extendedConfig).toBe(extendedConfig);
            });
        });
    });

    describe('_parseReceiptHandle', () => {
        beforeEach(() => {
            sqs = new SQSExt();
        });

        it('should return an empty receiptHandle and no S3 when arguments are empty', () => {
            expect(sqs._parseReceiptHandle()).toEqual({
                s3Bucket: undefined,
                s3Key: undefined,
                receiptHandle: ''
            });
        });

        it('should return the given receiptHandle and no S3 when receiptHandle doesn\'t include an S3 path', () => {
            const receiptHandle = 'fake ReceiptHandle';

            expect(sqs._parseReceiptHandle(receiptHandle)).toEqual({
                s3Bucket: undefined,
                s3Key: undefined,
                receiptHandle: receiptHandle
            });
        });

        it('should return S3 bucket and key, and the original ReceiptHandle when receiptHandle includes an S3 path', () => {
            const BUCKET = 'my-bucket',
                KEY = 'object',
                origReceiptHandle = 'fake ReceiptHandle';

            expect(sqs._parseReceiptHandle(`s3://${BUCKET}/${KEY}-..SEPARATOR..-${origReceiptHandle}`)).toEqual({
                s3Bucket: BUCKET,
                s3Key: KEY,
                receiptHandle: origReceiptHandle
            });
        });

        describe('when custom separator is passed', () => {
            it('should return the given receiptHandle and no S3 when receiptHandle doesn\'t include an S3 path', () => {
                const receiptHandle = 'fake ReceiptHandle',
                    separator = 'CUSTOM';

                expect(sqs._parseReceiptHandle(receiptHandle, separator)).toEqual({
                    s3Bucket: undefined,
                    s3Key: undefined,
                    receiptHandle: receiptHandle
                });
            });

            it('should return the given receiptHandle and no S3 when receiptHandle doesn\'t include the custom separator', () => {
                const receiptHandle = 's3://my-bucket/object-..SEPARATOR..-fake ReceiptHandle',
                    separator = 'CUSTOM';

                expect(sqs._parseReceiptHandle(receiptHandle, separator)).toEqual({
                    s3Bucket: undefined,
                    s3Key: undefined,
                    receiptHandle: receiptHandle
                });
            });

            it('should return S3 bucket and key, and the original ReceiptHandle when receiptHandle includes the custom separator', () => {
                const BUCKET = 'my-bucket',
                    KEY = 'object',
                    origReceiptHandle = 'fake ReceiptHandle',
                    separator = 'CUSTOM';

                expect(sqs._parseReceiptHandle(`s3://${BUCKET}/${KEY}${separator}${origReceiptHandle}`, separator)).toEqual({
                    s3Bucket: BUCKET,
                    s3Key: KEY,
                    receiptHandle: origReceiptHandle
                });
            });
        });
    });

    describe('_uploadToS3', () => {
        let requestMock;
        let s3Mock;
        let bucket;

        beforeEach(() => {
            requestMock = {};

            s3Mock = {
                upload: jasmine.createSpy('upload').and.returnValue(requestMock)
            };

            bucket = 'my-bucket';

            sqs = new SQSExt();
            sqs.extendedConfig.enableLargePayloadSupport(s3Mock, bucket);
        });

        [
            {message: undefined, s3Key: undefined},
            {message: undefined, s3Key: null},
            {message: undefined, s3Key: ''},
            {message: {}, s3Key: undefined},
            {message: {}, s3Key: null},
            {message: {}, s3Key: ''}
        ].forEach(({message, s3Key}) => {
            it(`should call upload with wrong arguments when arguments are empty (causing an S3 error) [message=${message}] | [s3Key=${s3Key}`, () => {
                const request = sqs._uploadToS3(message, s3Key);

                expect(request).toBe(requestMock);
                expect(s3Mock.upload).toHaveBeenCalledTimes(1);
                expect(s3Mock.upload).toHaveBeenCalledWith({
                    Bucket: bucket,
                    Key: s3Key,
                    Body: undefined
                });
            });
        });

        it('should call upload with sqs message\'s body', () => {
            const sqsMessage = {MessageBody: 'fake message'},
                s3Key = 'path/to/message',
                request = sqs._uploadToS3(sqsMessage, s3Key);

            expect(request).toBe(requestMock);
            expect(s3Mock.upload).toHaveBeenCalledTimes(1);
            expect(s3Mock.upload).toHaveBeenCalledWith({
                Bucket: bucket,
                Key: s3Key,
                Body: sqsMessage.MessageBody
            });
        });
    });

    describe('_composeS3Key', () => {
        beforeEach(() => {
            sqs = new SQSExt();
            sqs.extendedConfig.addQueueToS3Key = true;
        });

        [undefined, null, ''].forEach((queueUrl) => {
            it(`'should return random keys without including queueUrl [queueUrl=${queueUrl}]`, () => {
                const s3Key = sqs._composeS3Key(queueUrl);

                expect(s3Key).toEqual(jasmine.any(String));
                expect(s3Key).not.toContain('/'); // as / is the path seperator within S3
            });
        });

        it('should prefix S3 key with queue name', () => {
            const queueUrl = 'https://aws.sqs.com/my-queue',
                s3Key = sqs._composeS3Key(queueUrl);

            expect(s3Key).toEqual(jasmine.any(String));
            expect(s3Key).toContain(queueUrl);
        });

        describe('when config disabled prefixing', () => {
            beforeEach(() => {
                sqs.extendedConfig.addQueueToS3Key = false;
            });

            it('should prefix S3 key with queue name', () => {
                const queueUrl = 'https://aws.sqs.com/my-queue',
                    s3Key = sqs._composeS3Key(queueUrl);

                expect(s3Key).toEqual(jasmine.any(String));
                expect(s3Key).not.toContain(queueUrl);
            });
        });
    });

    describe('_messageToS3', () => {
        const FAKE_S3_PATH = 'FAKE_S3_PATH',
            BUCKET = 'my-bucket';

        beforeEach(() => {
            const s3Mock = {};

            sqs = new SQSExt();

            sqs.extendedConfig.enableLargePayloadSupport(s3Mock, BUCKET);

            spyOn(sqs, '_composeS3Key').and.returnValue(FAKE_S3_PATH);
        });

        it('should return a cloned version of params with data mutations', () => {
            const sqsParams = {QueueUrl: 'https://aws.sqs.com/my-queue', MessageBody: 'test message'},
                {s3Key, mutatedParams} = sqs._messageToS3(sqsParams);

            expect(s3Key).toEqual(FAKE_S3_PATH);
            expect(mutatedParams).not.toBe(sqsParams);
            expect(mutatedParams).toEqual({
                QueueUrl: sqsParams.QueueUrl,
                MessageBody: `s3://${BUCKET}/${s3Key}`,
                MessageAttributes: {
                    SQSLargePayloadSize: {
                        DataType: 'Number',
                        Value: jasmine.any(String)
                    }
                }
            });
            expect(parseInt(mutatedParams.MessageAttributes.SQSLargePayloadSize.Value)).toEqual(jasmine.any(Number));
        });
    });

    describe('_downloadFromS3', () => {
        beforeEach(() => {
            sqs = new SQSExt();
        });

        describe('when large payload support is disabled', () => {
            beforeEach(() => {
                sqs.extendedConfig.disableLargePayloadSupport();
            });

            it('should return an empty object when there isn\'t any S3 path associated with SQS messages', async () => {
                const receiveMessageResponse = {
                        Messages: [{Body: 'message 1'}, {Body: 'message 2', MessageAttributes: {}}]
                    },
                    s3ObjectsMap = await sqs._downloadFromS3(receiveMessageResponse);

                expect(s3ObjectsMap).toEqual({});
            });

            it('should throw an error when there are one or more sqs messages with S3 path', async () => {
                const receiveMessageResponse = {
                    Messages: [{Body: 'message 1'}, {Body: 's3://my-bucket/object1', MessageAttributes: {SQSLargePayloadSize: {}}}]
                };

                let err;

                try {
                    await sqs._downloadFromS3(receiveMessageResponse);
                } catch (e) {
                    err = e;
                } finally {
                    expect(err).toBeInstanceOf(Error);
                    expect(err.message).toContain('SQSExt::_downloadFromS3');
                }
            });
        });

        describe('when large payload support is enabled', () => {
            let s3Mock;
            let bucket;

            beforeEach(() => {
                s3Mock = {
                    // mock getObject to return the Key as Body
                    getObject: jasmine.createSpy('getObject').and.callFake((params) => {
                        return {promise: () => Promise.resolve({Body: params.Key})};
                    })
                };

                bucket = 'my-bucket';

                sqs.extendedConfig.enableLargePayloadSupport(s3Mock, bucket);
            });

            it('should return an empty object when there isn\'t any S3 path associated with SQS messages', async () => {
                const receiveMessageResponse = {
                        Messages: [{Body: 'message 1'}, {Body: 'message 2', MessageAttributes: {}}]
                    },
                    s3ObjectsMap = await sqs._downloadFromS3(receiveMessageResponse);

                expect(s3ObjectsMap).toEqual({});
            });

            it('should download any S3 path', async () => {
                const receiveMessageResponse = {
                    Messages: [
                        {MessageId: 'MessageId_1', Body: `s3://${bucket}/object1`, MessageAttributes: {SQSLargePayloadSize: {}}},
                        {MessageId: 'MessageId_2', Body: 'message 2', MessageAttributes: {}},
                        {MessageId: 'MessageId_3', Body: `s3://${bucket}/object3`, MessageAttributes: {SQSLargePayloadSize: {}}}
                    ]
                };

                await sqs._downloadFromS3(receiveMessageResponse);

                expect(s3Mock.getObject).toHaveBeenCalledTimes(2);
                expect(s3Mock.getObject).toHaveBeenCalledWith({
                    Bucket: bucket,
                    Key: 'object1'
                });
                expect(s3Mock.getObject).toHaveBeenCalledWith({
                    Bucket: bucket,
                    Key: 'object3'
                });
            });

            it('should return a {MessageId, S3Object} mapping for all S3Objects', async () => {
                const receiveMessageResponse = {
                        Messages: [
                            {MessageId: 'MessageId_1', Body: `s3://${bucket}/object1`, MessageAttributes: {SQSLargePayloadSize: {}}},
                            {MessageId: 'MessageId_2', Body: 'message 2', MessageAttributes: {}},
                            {MessageId: 'MessageId_3', Body: `s3://${bucket}/object3`, MessageAttributes: {SQSLargePayloadSize: {}}}
                        ]
                    },
                    s3ObjectsMap = await sqs._downloadFromS3(receiveMessageResponse);

                expect(s3ObjectsMap).toEqual({
                    MessageId_1: 'object1',
                    MessageId_3: 'object3'
                });
            });
        });
    });

    describe('_messageFromS3', () => {
        beforeEach(() => {
            sqs = new SQSExt();
        });

        [undefined, {}].forEach((s3ObjectsMap) => {
            it(`should do nothing when s3ObjectsMap is empty [s3ObjectsMap=${s3ObjectsMap}]`, () => {
                const receiveMessageResponse = {
                    Messages: [
                        {MessageId: 'MessageId_1', Body: `s3://my-bucket/object1`, MessageAttributes: {SQSLargePayloadSize: {}}},
                        {MessageId: 'MessageId_2', Body: `s3://my-bucket/object2`, MessageAttributes: {SQSLargePayloadSize: {}}}
                    ]
                };

                sqs._messageFromS3(receiveMessageResponse, s3ObjectsMap);

                receiveMessageResponse.Messages.forEach((m) => {
                    expect(m.Body).toContain('s3://');
                    expect(m.MessageAttributes).toEqual({SQSLargePayloadSize: {}});
                });
            });
        });

        it('should mutate messages that have entries in s3ObjectsMap', () => {
            const receiveMessageResponse = {
                    Messages: [
                        {
                            MessageId: 'MessageId_1',
                            ReceiptHandle: 'ReceiptHandle_1',
                            Body: `s3://my-bucket/object1`,
                            MessageAttributes: {SQSLargePayloadSize: {}}
                        },
                        {
                            MessageId: 'MessageId_2',
                            ReceiptHandle: 'ReceiptHandle_2',
                            Body: `s3://my-bucket/object2`,
                            MessageAttributes: {SQSLargePayloadSize: {}}
                        }
                    ]
                },
                s3ObjectsMap = {
                    MessageId_1: 'object1',
                    MessageId_2: 'object2'
                };

            sqs._messageFromS3(receiveMessageResponse, s3ObjectsMap);

            receiveMessageResponse.Messages.forEach((m) => {
                expect(m.Body).not.toContain('s3://');
                expect(m.ReceiptHandle).toContain('s3://');
                expect(m.MessageAttributes).toEqual({});
            });
        });
    });

    describe('_cloneWithReceiptHandleFromS3', () => {
        beforeEach(() => {
            sqs = new SQSExt();
        });

        describe('when large payload support is disabled', () => {
            beforeEach(() => {
                sqs.extendedConfig.disableLargePayloadSupport();
            });

            it('should do nothing when ReceiptHandle doesn\'t include an S3 path', () => {
                const deleteMessageParams = {ReceiptHandle: 'ReceiptHandle'},
                    mutatedParams = sqs._cloneWithReceiptHandleFromS3(deleteMessageParams);

                expect(mutatedParams).toEqual(deleteMessageParams);
                expect(mutatedParams).not.toBe(deleteMessageParams);
            });

            it('should do nothing when Entries\' ReceiptHandles don\'t include an S3 path', () => {
                const deleteMessageBatchParams = {
                        Entries: [
                            {Id: 'Id_1', ReceiptHandle: 'ReceiptHandle_1'},
                            {Id: 'Id_2', ReceiptHandle: 'ReceiptHandle_2'}
                        ]
                    },
                    mutatedParams = sqs._cloneWithReceiptHandleFromS3(deleteMessageBatchParams);

                expect(mutatedParams).toEqual(deleteMessageBatchParams);
                expect(mutatedParams).not.toBe(deleteMessageBatchParams);
            });

            it('should throw an error when ReceiptHandle includes an S3 path', () => {
                const deleteMessageParams = {ReceiptHandle: 's3://my-bucket/object1-..SEPARATOR..-ReceiptHandle'};

                let err;

                try {
                    sqs._cloneWithReceiptHandleFromS3(deleteMessageParams);
                } catch (e) {
                    err = e;
                } finally {
                    expect(err).toBeInstanceOf(Error);
                    expect(err.message).toContain('SQSExt::_cloneWithReceiptHandleFromS3');
                }
            });

            it('should throw an error when Entries\' ReceiptHandles include an S3 path', () => {
                const deleteMessageBatchParams = {
                    Entries: [
                        {Id: 'Id_1', ReceiptHandle: 'ReceiptHandle_1'},
                        {Id: 'Id_2', ReceiptHandle: 's3://my-bucket/object2-..SEPARATOR..-ReceiptHandle_2'}
                    ]
                };

                let err;

                try {
                    sqs._cloneWithReceiptHandleFromS3(deleteMessageBatchParams);
                } catch (e) {
                    err = e;
                } finally {
                    expect(err).toBeInstanceOf(Error);
                    expect(err.message).toContain('SQSExt::_cloneWithReceiptHandleFromS3');
                }
            });
        });

        describe('when large payload support is enabled', () => {
            let s3Mock;
            let bucket;

            beforeEach(() => {
                s3Mock = {};

                bucket = 'my-bucket';

                sqs.extendedConfig.enableLargePayloadSupport(s3Mock, bucket);
            });

            it('should do nothing when ReceiptHandle doesn\'t include an S3 path', () => {
                const deleteMessageParams = {ReceiptHandle: 'ReceiptHandle'},
                    mutatedParams = sqs._cloneWithReceiptHandleFromS3(deleteMessageParams);

                expect(mutatedParams).toEqual(deleteMessageParams);
                expect(mutatedParams).not.toBe(deleteMessageParams);
            });

            it('should do nothing when Entries\' ReceiptHandles don\'t include an S3 path', () => {
                const deleteMessageBatchParams = {
                        Entries: [
                            {Id: 'Id_1', ReceiptHandle: 'ReceiptHandle_1'},
                            {Id: 'Id_2', ReceiptHandle: 'ReceiptHandle_2'}
                        ]
                    },
                    mutatedParams = sqs._cloneWithReceiptHandleFromS3(deleteMessageBatchParams);

                expect(mutatedParams).toEqual(deleteMessageBatchParams);
                expect(mutatedParams).not.toBe(deleteMessageBatchParams);
            });

            it('should return a cloned version of params but with the original ReceiptHandle (deleteMessage)', () => {
                const ReceiptHandle = 'ReceiptHandle',
                    deleteMessageParams = {ReceiptHandle: `s3://my-bucket/object1-..SEPARATOR..-${ReceiptHandle}`},
                    mutatedParams = sqs._cloneWithReceiptHandleFromS3(deleteMessageParams);

                expect(mutatedParams).not.toBe(deleteMessageParams);
                expect(mutatedParams.ReceiptHandle).toEqual(ReceiptHandle);
            });

            it('should return a cloned version of params but with the original ReceiptHandle (deleteMessageBatch)', () => {
                const deleteMessageBatchParams = {
                        Entries: [
                            {Id: 'Id_1', ReceiptHandle: 'ReceiptHandle_1'},
                            {Id: 'Id_2', ReceiptHandle: 's3://my-bucket/object2-..SEPARATOR..-ReceiptHandle_2'}
                        ]
                    },
                    mutatedParams = sqs._cloneWithReceiptHandleFromS3(deleteMessageBatchParams);

                expect(mutatedParams).not.toBe(deleteMessageBatchParams);
                mutatedParams.Entries.forEach(({ReceiptHandle}) => {
                    expect(ReceiptHandle).not.toContain('s3://');
                });
            });
        });
    });

    describe('_deleteFromS3', () => {
        let s3Mock;
        let bucket;

        beforeEach(() => {
            s3Mock = {};

            bucket = 'my-bucket';

            sqs = new SQSExt();

            sqs.extendedConfig.enableLargePayloadSupport(s3Mock, bucket);
        });

        describe('when deleteObject succeeds', () => {
            beforeEach(() => {
                s3Mock.deleteObject = jasmine.createSpy('deleteObject').and.returnValue({promise: () => Promise.resolve()});
            });

            it('should do nothing when ReceiptHandle doesn\'t include an S3 path', async () => {
                const deleteMessageParams = {ReceiptHandle: 'ReceiptHandle'};

                await sqs._deleteFromS3(deleteMessageParams);

                expect(s3Mock.deleteObject).not.toHaveBeenCalled();
            });

            it('should do nothing when Entries\' ReceiptHandles don\'t include an S3 path', async () => {
                const deleteMessageBatchParams = {
                    Entries: [
                        {Id: 'Id_1', ReceiptHandle: 'ReceiptHandle_1'},
                        {Id: 'Id_2', ReceiptHandle: 'ReceiptHandle_2'}
                    ]
                };

                await sqs._deleteFromS3(deleteMessageBatchParams);

                expect(s3Mock.deleteObject).not.toHaveBeenCalled();
            });

            it('should delete the S3 object included in ReceiptHandle', async () => {
                const KEY = 'path/to/object',
                    deleteMessageParams = {ReceiptHandle: `s3://${bucket}/${KEY}-..SEPARATOR..-ReceiptHandle`};

                await sqs._deleteFromS3(deleteMessageParams);

                expect(s3Mock.deleteObject).toHaveBeenCalledTimes(1);
                expect(s3Mock.deleteObject).toHaveBeenCalledWith({
                    Bucket: bucket,
                    Key: KEY
                });
            });

            it('should delete the S3 object included in Entries\' ReceiptHandles', async () => {
                const KEY_1 = 'path/to/object1',
                    KEY_2 = 'path/to/object2',
                    deleteMessageBatchParams = {
                        Entries: [
                            {Id: 'Id_1', ReceiptHandle: `s3://${bucket}/${KEY_1}-..SEPARATOR..-ReceiptHandle_1`},
                            {Id: 'Id_2', ReceiptHandle: `s3://${bucket}/${KEY_2}-..SEPARATOR..-ReceiptHandle_2`}
                        ]
                    };

                await sqs._deleteFromS3(deleteMessageBatchParams);

                expect(s3Mock.deleteObject).toHaveBeenCalledTimes(2);
                expect(s3Mock.deleteObject).toHaveBeenCalledWith({
                    Bucket: bucket,
                    Key: KEY_1
                });
                expect(s3Mock.deleteObject).toHaveBeenCalledWith({
                    Bucket: bucket,
                    Key: KEY_2
                });
            });
        });

        describe('when deleteObject fails with NoSuchKey error', () => {
            beforeEach(() => {
                const error = new Error();
                error.code = 'NoSuchKey';

                s3Mock.deleteObject = jasmine.createSpy('deleteObject').and.returnValue({promise: () => Promise.reject(error)});
            });

            it('should capture errors and continue the execution', async () => {
                const KEY_1 = 'path/to/object1',
                    KEY_2 = 'path/to/object2',
                    deleteMessageBatchParams = {
                        Entries: [
                            {Id: 'Id_1', ReceiptHandle: `s3://${bucket}/${KEY_1}-..SEPARATOR..-ReceiptHandle_1`},
                            {Id: 'Id_2', ReceiptHandle: `s3://${bucket}/${KEY_2}-..SEPARATOR..-ReceiptHandle_2`}
                        ]
                    };

                await sqs._deleteFromS3(deleteMessageBatchParams);

                expect(s3Mock.deleteObject).toHaveBeenCalledTimes(2);
                expect(s3Mock.deleteObject).toHaveBeenCalledWith({
                    Bucket: bucket,
                    Key: KEY_1
                });
                expect(s3Mock.deleteObject).toHaveBeenCalledWith({
                    Bucket: bucket,
                    Key: KEY_2
                });
            });
        });

        describe('when deleteObject fails with other error', () => {
            beforeEach(() => {
                s3Mock.deleteObject = jasmine.createSpy('deleteObject').and.returnValue({promise: () => Promise.reject(new Error())});
            });

            it('should throw the error', async () => {
                const KEY_1 = 'path/to/object1',
                    KEY_2 = 'path/to/object2',
                    deleteMessageBatchParams = {
                        Entries: [
                            {Id: 'Id_1', ReceiptHandle: `s3://${bucket}/${KEY_1}-..SEPARATOR..-ReceiptHandle_1`},
                            {Id: 'Id_2', ReceiptHandle: `s3://${bucket}/${KEY_2}-..SEPARATOR..-ReceiptHandle_2`}
                        ]
                    };

                let err;

                try {
                    await sqs._deleteFromS3(deleteMessageBatchParams);
                } catch (e) {
                    err = e;
                } finally {
                    expect(err).toBeInstanceOf(Error);
                }
            });
        });
    });

    describe('_pruneFailedDeleteMessage', () => {
        beforeEach(() => {
            sqs = new SQSExt();
        });

        it('should return a copy of the given params when Failed is not present', () => {
            const params = {
                    Entries: [{Id: 'Id_1'}, {Id: 'Id_2'}, {Id: 'Id_3'}]
                },
                response = {
                    Successful: [{Id: 'Id_1'}, {Id: 'Id_2'}, {Id: 'Id_3'}],
                    Failed: []
                },
                clone = sqs._pruneFailedDeleteMessage(params, response);

            expect(clone).toEqual(params);
            expect(clone).not.toBe(params);
        });

        it('should return a copy of the given params when no message failed', () => {
            const params = {
                    Entries: [{Id: 'Id_1'}, {Id: 'Id_2'}, {Id: 'Id_3'}]
                },
                response = {
                    Successful: [{Id: 'Id_1'}, {Id: 'Id_2'}, {Id: 'Id_3'}]
                },
                clone = sqs._pruneFailedDeleteMessage(params, response);

            expect(clone).toEqual(params);
            expect(clone).not.toBe(params);
        });

        it('should prune any message in Failed list', () => {
            const params = {
                    Entries: [{Id: 'Id_1'}, {Id: 'Id_2'}, {Id: 'Id_3'}]
                },
                response = {
                    Successful: [{Id: 'Id_1'}, {Id: 'Id_3'}],
                    Failed: [{Id: 'Id_2'}]
                },
                clone = sqs._pruneFailedDeleteMessage(params, response);

            expect(clone.Entries).toEqual(params.Entries.filter(({Id}) => !response.Failed.map(({Id}) => Id).includes(Id)));
            expect(clone).not.toBe(params);
        });
    });

    describe('sendMessage', () => {
        beforeEach(() => {
            SQSMock.prototype.sendMessage = (params, callback) => {
                const response = {
                        MessageId: 'MessageId'
                        // other fields
                    },
                    request = {
                        send: (callback) => callback && callback(undefined, response),
                        promise: () => Promise.resolve(response)
                    };

                callback && request.send(callback);

                return request;
            };

            spyOn(SQSMock.prototype, 'sendMessage').and.callThrough();

            sqs = new SQSExt();
        });

        describe('when large payload support is disabled', () => {
            beforeEach(() => {
                spyOn(sqs.extendedConfig, 'isLargePayloadSupportEnabled').and.returnValue(false);
                spyOn(sqs, '_messageToS3').and.callThrough();
                spyOn(sqs, '_uploadToS3').and.callThrough();
            });

            describe('when isAlwaysThroughS3 is enabled', () => {
                beforeEach(() => {
                    spyOn(sqs.extendedConfig, 'isAlwaysThroughS3').and.returnValue(true);
                });

                it('should call to aws-sdk directly (callback)', (done) => {
                    const params = {
                            QueueUrl: 'fake queue',
                            MessageBody: 'fake message'
                        },
                        callback = (error, data) => {
                            if (error) {
                                done.fail();
                            } else {
                                expect(SQSMock.prototype.sendMessage).toHaveBeenCalledTimes(1);
                                expect(SQSMock.prototype.sendMessage).toHaveBeenCalledWith(params, callback);
                                expect(sqs._messageToS3).not.toHaveBeenCalled();
                                expect(sqs._uploadToS3).not.toHaveBeenCalled();
                                done();
                            }
                        };

                    sqs.sendMessage(params, callback);
                });

                it('should call to aws-sdk directly (promise)', async () => {
                    const params = {
                        QueueUrl: 'fake queue',
                        MessageBody: 'fake message'
                    };

                    await sqs.sendMessage(params).promise();

                    expect(SQSMock.prototype.sendMessage).toHaveBeenCalledTimes(1);
                    expect(SQSMock.prototype.sendMessage).toHaveBeenCalledWith(params, undefined);
                    expect(sqs._messageToS3).not.toHaveBeenCalled();
                    expect(sqs._uploadToS3).not.toHaveBeenCalled();
                });
            });

            describe('when message\'s body size is bigger than the threshold', () => {
                beforeEach(() => {
                    sqs.extendedConfig.messageSizeThreshold = -1;
                });

                it('should call to aws-sdk directly (callback)', (done) => {
                    const params = {
                            QueueUrl: 'fake queue',
                            MessageBody: 'fake message'
                        },
                        callback = (error, data) => {
                            if (error) {
                                done.fail();
                            } else {
                                expect(SQSMock.prototype.sendMessage).toHaveBeenCalledTimes(1);
                                expect(SQSMock.prototype.sendMessage).toHaveBeenCalledWith(params, callback);
                                expect(sqs._messageToS3).not.toHaveBeenCalled();
                                expect(sqs._uploadToS3).not.toHaveBeenCalled();
                                done();
                            }
                        };

                    sqs.sendMessage(params, callback);
                });

                it('should call to aws-sdk directly (promise)', async () => {
                    const params = {
                        QueueUrl: 'fake queue',
                        MessageBody: 'fake message'
                    };

                    await sqs.sendMessage(params).promise();

                    expect(SQSMock.prototype.sendMessage).toHaveBeenCalledTimes(1);
                    expect(SQSMock.prototype.sendMessage).toHaveBeenCalledWith(params, undefined);
                    expect(sqs._messageToS3).not.toHaveBeenCalled();
                    expect(sqs._uploadToS3).not.toHaveBeenCalled();
                });
            });

            describe('when message\'s body size is smaller than the threshold', () => {
                it('should call to aws-sdk directly (callback)', (done) => {
                    const params = {
                            QueueUrl: 'fake queue',
                            MessageBody: 'fake message'
                        },
                        callback = (error, data) => {
                            if (error) {
                                done.fail();
                            } else {
                                expect(SQSMock.prototype.sendMessage).toHaveBeenCalledTimes(1);
                                expect(SQSMock.prototype.sendMessage).toHaveBeenCalledWith(params, callback);
                                expect(sqs._messageToS3).not.toHaveBeenCalled();
                                expect(sqs._uploadToS3).not.toHaveBeenCalled();
                                done();
                            }
                        };

                    sqs.sendMessage(params, callback);
                });

                it('should call to aws-sdk directly (promise)', async () => {
                    const params = {
                        QueueUrl: 'fake queue',
                        MessageBody: 'fake message'
                    };

                    await sqs.sendMessage(params).promise();

                    expect(SQSMock.prototype.sendMessage).toHaveBeenCalledTimes(1);
                    expect(SQSMock.prototype.sendMessage).toHaveBeenCalledWith(params, undefined);
                    expect(sqs._messageToS3).not.toHaveBeenCalled();
                    expect(sqs._uploadToS3).not.toHaveBeenCalled();
                });
            });
        });

        describe('when large payload support is enabled', () => {
            beforeEach(() => {
                spyOn(sqs.extendedConfig, 'isLargePayloadSupportEnabled').and.returnValue(true);
                spyOn(sqs, '_messageToS3').and.callThrough();
                spyOn(sqs, '_uploadToS3').and.returnValue({send: (callback) => callback(), promise: () => Promise.resolve()});
            });

            describe('when isAlwaysThroughS3 is enabled', () => {
                beforeEach(() => {
                    spyOn(sqs.extendedConfig, 'isAlwaysThroughS3').and.returnValue(true);
                });

                it('should upload message\'s body to S3 and replace SQS message (callback)', (done) => {
                    const params = {
                            QueueUrl: 'fake queue',
                            MessageBody: 'fake message'
                        },
                        callback = (error, data) => {
                            if (error) {
                                done.fail();
                            } else {
                                expect(SQSMock.prototype.sendMessage).toHaveBeenCalledTimes(1);
                                expect(SQSMock.prototype.sendMessage).toHaveBeenCalledWith({
                                    QueueUrl: params.QueueUrl,
                                    MessageBody: jasmine.any(String),
                                    MessageAttributes: jasmine.any(Object)
                                });
                                expect(sqs._messageToS3).toHaveBeenCalledTimes(1);
                                expect(sqs._messageToS3).toHaveBeenCalledWith(params);
                                expect(sqs._uploadToS3).toHaveBeenCalledTimes(1);
                                done();
                            }
                        };

                    sqs.sendMessage(params, callback);
                });

                it('should upload message\'s body to S3 and replace SQS message (promise)', async () => {
                    const params = {
                        QueueUrl: 'fake queue',
                        MessageBody: 'fake message'
                    };

                    await sqs.sendMessage(params).promise();

                    expect(SQSMock.prototype.sendMessage).toHaveBeenCalledTimes(1);
                    expect(SQSMock.prototype.sendMessage).toHaveBeenCalledWith({
                        QueueUrl: params.QueueUrl,
                        MessageBody: jasmine.any(String),
                        MessageAttributes: jasmine.any(Object)
                    });
                    expect(sqs._messageToS3).toHaveBeenCalledTimes(1);
                    expect(sqs._messageToS3).toHaveBeenCalledWith(params);
                    expect(sqs._uploadToS3).toHaveBeenCalledTimes(1);
                });
            });

            describe('when message\'s body size is bigger than the threshold', () => {
                beforeEach(() => {
                    sqs.extendedConfig.messageSizeThreshold = -1;
                });

                it('should upload message\'s body to S3 and replace SQS message (callback)', (done) => {
                    const params = {
                            QueueUrl: 'fake queue',
                            MessageBody: 'fake message'
                        },
                        callback = (error, data) => {
                            if (error) {
                                done.fail();
                            } else {
                                expect(SQSMock.prototype.sendMessage).toHaveBeenCalledTimes(1);
                                expect(SQSMock.prototype.sendMessage).toHaveBeenCalledWith({
                                    QueueUrl: params.QueueUrl,
                                    MessageBody: jasmine.any(String),
                                    MessageAttributes: jasmine.any(Object)
                                });
                                expect(sqs._messageToS3).toHaveBeenCalledTimes(1);
                                expect(sqs._messageToS3).toHaveBeenCalledWith(params);
                                expect(sqs._uploadToS3).toHaveBeenCalledTimes(1);
                                done();
                            }
                        };

                    sqs.sendMessage(params, callback);
                });

                it('should upload message\'s body to S3 and replace SQS message (promise)', async () => {
                    const params = {
                        QueueUrl: 'fake queue',
                        MessageBody: 'fake message'
                    };

                    await sqs.sendMessage(params).promise();

                    expect(SQSMock.prototype.sendMessage).toHaveBeenCalledTimes(1);
                    expect(SQSMock.prototype.sendMessage).toHaveBeenCalledWith({
                        QueueUrl: params.QueueUrl,
                        MessageBody: jasmine.any(String),
                        MessageAttributes: jasmine.any(Object)
                    });
                    expect(sqs._messageToS3).toHaveBeenCalledTimes(1);
                    expect(sqs._messageToS3).toHaveBeenCalledWith(params);
                    expect(sqs._uploadToS3).toHaveBeenCalledTimes(1);
                });
            });

            describe('when message\'s body size is smaller than the threshold', () => {
                it('should call to aws-sdk directly (callback)', (done) => {
                    const params = {
                            QueueUrl: 'fake queue',
                            MessageBody: 'fake message'
                        },
                        callback = (error, data) => {
                            if (error) {
                                done.fail();
                            } else {
                                expect(SQSMock.prototype.sendMessage).toHaveBeenCalledTimes(1);
                                expect(SQSMock.prototype.sendMessage).toHaveBeenCalledWith(params, callback);
                                expect(sqs._messageToS3).not.toHaveBeenCalled();
                                expect(sqs._uploadToS3).not.toHaveBeenCalled();
                                done();
                            }
                        };

                    sqs.sendMessage(params, callback);
                });

                it('should call to aws-sdk directly (promise)', async () => {
                    const params = {
                        QueueUrl: 'fake queue',
                        MessageBody: 'fake message'
                    };

                    await sqs.sendMessage(params).promise();

                    expect(SQSMock.prototype.sendMessage).toHaveBeenCalledTimes(1);
                    expect(SQSMock.prototype.sendMessage).toHaveBeenCalledWith(params, undefined);
                    expect(sqs._messageToS3).not.toHaveBeenCalled();
                    expect(sqs._uploadToS3).not.toHaveBeenCalled();
                });
            });
        });

        describe('when large payload support is enabled but S3 upload fails', () => {
            beforeEach(() => {
                spyOn(sqs.extendedConfig, 'isLargePayloadSupportEnabled').and.returnValue(true);
                spyOn(sqs.extendedConfig, 'isAlwaysThroughS3').and.returnValue(true);
                spyOn(sqs, '_messageToS3').and.callThrough();
                spyOn(sqs, '_uploadToS3').and.returnValue({
                    send: (callback) => callback(new Error()),
                    promise: () => Promise.reject(new Error())
                });
            });

            it('should throw the error and abort sendMessage (callback)', (done) => {
                const params = {
                        QueueUrl: 'fake queue',
                        MessageBody: 'fake message'
                    },
                    callback = (error, data) => {
                        if (error) {
                            done();
                        } else {
                            done.fail();
                        }
                    };

                sqs.sendMessage(params, callback);
            });

            it('should throw the error and abort sendMessage (promise)', async () => {
                const params = {
                    QueueUrl: 'fake queue',
                    MessageBody: 'fake message'
                };

                let err;

                try {
                    await sqs.sendMessage(params).promise();
                } catch (e) {
                    err = e;
                } finally {
                    expect(err).toBeInstanceOf(Error);
                }
            });
        });
    });

    describe('receiveMessage', () => {
        let receiveMessageResponse;

        beforeEach(() => {
            receiveMessageResponse = {
                Messages: [{MessageId: 'MessageId', Body: 'Body' /* other fields */}]
            };

            SQSMock.prototype.receiveMessage = (params, callback) => {
                const request = {
                    send: (callback) => callback && callback(undefined, receiveMessageResponse),
                    promise: () => Promise.resolve(receiveMessageResponse)
                };

                callback && request.send(callback);

                return request;
            };

            spyOn(SQSMock.prototype, 'receiveMessage').and.callThrough();

            sqs = new SQSExt();

            spyOn(sqs, '_messageFromS3').and.callThrough();
        });

        describe('when receiveMessage fails', () => {
            beforeEach(() => {
                SQSMock.prototype.receiveMessage = (params, callback) => {
                    const request = {
                        send: (callback) => callback && callback(new Error()),
                        promise: () => Promise.reject(new Error())
                    };

                    callback && request.send(callback);

                    return request;
                };

                spyOn(SQSMock.prototype, 'receiveMessage').and.callThrough();
                spyOn(sqs, '_downloadFromS3').and.callThrough();
            });

            it('throw an error and don\'t call S3 at all (callback)', (done) => {
                const params = {
                        QueueUrl: 'fake queue'
                    },
                    callback = (error, data) => {
                        if (error) {
                            expect(SQSMock.prototype.receiveMessage).toHaveBeenCalledTimes(1);
                            expect(SQSMock.prototype.receiveMessage).toHaveBeenCalledWith(params);
                            expect(sqs._downloadFromS3).not.toHaveBeenCalled();
                            expect(sqs._messageFromS3).not.toHaveBeenCalled();
                            done();
                        } else {
                            done.fail();
                        }
                    };

                sqs.receiveMessage(params, callback);
            });

            it('throw an error and don\'t call S3 at all (promise)', async () => {
                const params = {
                    QueueUrl: 'fake queue'
                };

                let err;

                try {
                    await sqs.receiveMessage(params).promise();
                } catch (e) {
                    err = e;
                } finally {
                    expect(err).toBeInstanceOf(Error);
                    expect(SQSMock.prototype.receiveMessage).toHaveBeenCalledTimes(1);
                    expect(SQSMock.prototype.receiveMessage).toHaveBeenCalledWith(params);
                    expect(sqs._downloadFromS3).not.toHaveBeenCalled();
                    expect(sqs._messageFromS3).not.toHaveBeenCalled();
                }
            });
        });

        describe('when S3 download succeeds or messages haven\'t S3 references', () => {
            let S3SQSMapping;

            beforeEach(() => {
                S3SQSMapping = {};

                spyOn(sqs, '_downloadFromS3').and.resolveTo(S3SQSMapping);
            });

            it('should download S3 objects and mutate the original response (callback)', (done) => {
                const params = {
                        QueueUrl: 'fake queue'
                    },
                    callback = (error, data) => {
                        if (error) {
                            done.fail();
                        } else {
                            expect(SQSMock.prototype.receiveMessage).toHaveBeenCalledTimes(1);
                            expect(SQSMock.prototype.receiveMessage).toHaveBeenCalledWith(params);
                            expect(sqs._downloadFromS3).toHaveBeenCalledTimes(1);
                            expect(sqs._downloadFromS3).toHaveBeenCalledWith(receiveMessageResponse);
                            expect(sqs._messageFromS3).toHaveBeenCalledTimes(1);
                            expect(sqs._messageFromS3).toHaveBeenCalledWith(receiveMessageResponse, S3SQSMapping);
                            done();
                        }
                    };

                sqs.receiveMessage(params, callback);
            });

            it('should download S3 objects and mutate the original response (promise)', async () => {
                const params = {
                    QueueUrl: 'fake queue'
                };

                await sqs.receiveMessage(params).promise();

                expect(SQSMock.prototype.receiveMessage).toHaveBeenCalledTimes(1);
                expect(SQSMock.prototype.receiveMessage).toHaveBeenCalledWith(params);
                expect(sqs._downloadFromS3).toHaveBeenCalledTimes(1);
                expect(sqs._downloadFromS3).toHaveBeenCalledWith(receiveMessageResponse);
                expect(sqs._messageFromS3).toHaveBeenCalledTimes(1);
                expect(sqs._messageFromS3).toHaveBeenCalledWith(receiveMessageResponse, S3SQSMapping);
            });
        });

        describe('when S3 download fails', () => {
            beforeEach(() => {
                spyOn(sqs, '_downloadFromS3').and.rejectWith(new Error());
            });

            it('should throw the error and abort receiveMessage (callback)', (done) => {
                const params = {
                        QueueUrl: 'fake queue'
                    },
                    callback = (error, data) => {
                        if (error) {
                            done();
                        } else {
                            done.fail();
                        }
                    };

                sqs.receiveMessage(params, callback);
            });

            it('should throw the error and abort receiveMessage (promise)', async () => {
                const params = {
                    QueueUrl: 'fake queue'
                };

                let err;

                try {
                    await sqs.receiveMessage(params).promise();
                } catch (e) {
                    err = e;
                } finally {
                    expect(err).toBeInstanceOf(Error);
                }
            });
        });
    });

    describe('deleteMessage', () => {
        beforeEach(() => {
            SQSMock.prototype.deleteMessage = (params, callback) => {
                const response = {},
                    request = {
                        send: (callback) => callback && callback(undefined, response),
                        promise: () => Promise.resolve(response)
                    };

                callback && request.send(callback);

                return request;
            };

            spyOn(SQSMock.prototype, 'deleteMessage').and.callThrough();

            sqs = new SQSExt();
        });

        describe('when deleteMessage fails', () => {
            beforeEach(() => {
                SQSMock.prototype.deleteMessage = (params, callback) => {
                    const request = {
                        send: (callback) => callback && callback(new Error()),
                        promise: () => Promise.reject(new Error())
                    };

                    callback && request.send(callback);

                    return request;
                };

                spyOn(SQSMock.prototype, 'deleteMessage').and.callThrough();
                spyOn(sqs, '_deleteFromS3').and.callThrough();
            });

            it('throw an error and don\'t call S3 at all (callback)', (done) => {
                const params = {
                        QueueUrl: 'fake queue',
                        ReceiptHandle: 'fake receipt handle'
                    },
                    callback = (error, data) => {
                        if (error) {
                            expect(SQSMock.prototype.deleteMessage).toHaveBeenCalledTimes(1);
                            expect(SQSMock.prototype.deleteMessage).toHaveBeenCalledWith(params);
                            expect(sqs._deleteFromS3).not.toHaveBeenCalled();
                            done();
                        } else {
                            done.fail();
                        }
                    };

                sqs.deleteMessage(params, callback);
            });

            it('throw an error and don\'t call S3 at all (promise)', async () => {
                const params = {
                    QueueUrl: 'fake queue',
                    ReceiptHandle: 'fake receipt handle'
                };

                let err;

                try {
                    await sqs.deleteMessage(params).promise();
                } catch (e) {
                    err = e;
                } finally {
                    expect(err).toBeInstanceOf(Error);
                    expect(SQSMock.prototype.deleteMessage).toHaveBeenCalledTimes(1);
                    expect(SQSMock.prototype.deleteMessage).toHaveBeenCalledWith(params);
                    expect(sqs._deleteFromS3).not.toHaveBeenCalled();
                }
            });
        });

        describe('when extended client is not properly setup', () => {
            beforeEach(() => {
                spyOn(sqs, '_cloneWithReceiptHandleFromS3').and.throwError(new Error());
                spyOn(sqs, '_deleteFromS3').and.callThrough();
            });

            it('should throw an error (callback)', (done) => {
                const params = {
                        QueueUrl: 'fake queue',
                        ReceiptHandle: 'fake receipt handle'
                    },
                    callback = (error, data) => {
                        if (error) {
                            expect(SQSMock.prototype.deleteMessage).not.toHaveBeenCalled();
                            expect(sqs._deleteFromS3).not.toHaveBeenCalled();
                            done();
                        } else {
                            done.fail();
                        }
                    };

                sqs.deleteMessage(params, callback);
            });

            it('should throw an error (promise)', async () => {
                const params = {
                    QueueUrl: 'fake queue',
                    ReceiptHandle: 'fake receipt handle'
                };

                let err;

                try {
                    await sqs.deleteMessage(params).promise();
                } catch (e) {
                    err = e;
                } finally {
                    expect(err).toBeInstanceOf(Error);
                    expect(SQSMock.prototype.deleteMessage).not.toHaveBeenCalled();
                    expect(sqs._deleteFromS3).not.toHaveBeenCalled();
                }
            });
        });

        describe('when extended client is properly setup', () => {
            let mutatedParams;

            beforeEach(() => {
                mutatedParams = {};

                spyOn(sqs, '_cloneWithReceiptHandleFromS3').and.returnValue(mutatedParams);
            });

            describe('when S3 delete succeeds or message hasn\'t an S3 reference', () => {
                beforeEach(() => {
                    spyOn(sqs, '_deleteFromS3').and.resolveTo(undefined);
                });

                it('should delete both SQS message and S3 object (callback)', (done) => {
                    const params = {
                            QueueUrl: 'fake queue',
                            ReceiptHandle: 'fake receipt handle'
                        },
                        callback = (error, data) => {
                            if (error) {
                                done.fail();
                            } else {
                                expect(SQSMock.prototype.deleteMessage).toHaveBeenCalledTimes(1);
                                expect(SQSMock.prototype.deleteMessage).toHaveBeenCalledWith(mutatedParams);
                                expect(sqs._deleteFromS3).toHaveBeenCalledTimes(1);
                                expect(sqs._deleteFromS3).toHaveBeenCalledWith(params);
                                done();
                            }
                        };

                    sqs.deleteMessage(params, callback);
                });

                it('should delete both SQS message and S3 object (promise)', async () => {
                    const params = {
                        QueueUrl: 'fake queue',
                        ReceiptHandle: 'fake receipt handle'
                    };

                    await sqs.deleteMessage(params).promise();

                    expect(SQSMock.prototype.deleteMessage).toHaveBeenCalledTimes(1);
                    expect(SQSMock.prototype.deleteMessage).toHaveBeenCalledWith(mutatedParams);
                    expect(sqs._deleteFromS3).toHaveBeenCalledTimes(1);
                    expect(sqs._deleteFromS3).toHaveBeenCalledWith(params);
                });
            });

            describe('when S3 delete fails', () => {
                beforeEach(() => {
                    spyOn(sqs, '_deleteFromS3').and.rejectWith(new Error());
                });

                it('should delete both SQS message and warn about the S3 error (callback)', (done) => {
                    const params = {
                            QueueUrl: 'fake queue',
                            ReceiptHandle: 'fake receipt handle'
                        },
                        callback = (error, data) => {
                            if (error) {
                                done.fail();
                            } else {
                                expect(SQSMock.prototype.deleteMessage).toHaveBeenCalledTimes(1);
                                expect(SQSMock.prototype.deleteMessage).toHaveBeenCalledWith(mutatedParams);
                                expect(sqs._deleteFromS3).toHaveBeenCalledTimes(1);
                                expect(sqs._deleteFromS3).toHaveBeenCalledWith(params);
                                expect(console.warn).toHaveBeenCalled();
                                done();
                            }
                        };

                    sqs.deleteMessage(params, callback);
                });

                it('should delete both SQS message and warn about the S3 error (promise)', async () => {
                    const params = {
                        QueueUrl: 'fake queue',
                        ReceiptHandle: 'fake receipt handle'
                    };

                    await sqs.deleteMessage(params).promise();

                    expect(SQSMock.prototype.deleteMessage).toHaveBeenCalledTimes(1);
                    expect(SQSMock.prototype.deleteMessage).toHaveBeenCalledWith(mutatedParams);
                    expect(sqs._deleteFromS3).toHaveBeenCalledTimes(1);
                    expect(sqs._deleteFromS3).toHaveBeenCalledWith(params);
                    expect(console.warn).toHaveBeenCalled();
                });
            });
        });
    });

    describe('deleteMessageBatch', () => {
        beforeEach(() => {
            SQSMock.prototype.deleteMessageBatch = (params, callback) => {
                const response = {
                        Successful: [],
                        Failed: []
                    },
                    request = {
                        send: (callback) => callback && callback(undefined, response),
                        promise: () => Promise.resolve(response)
                    };

                callback && request.send(callback);

                return request;
            };

            spyOn(SQSMock.prototype, 'deleteMessageBatch').and.callThrough();

            sqs = new SQSExt();

            spyOn(sqs, '_pruneFailedDeleteMessage').and.callThrough();
        });

        describe('when deleteMessageBatch fails', () => {
            beforeEach(() => {
                SQSMock.prototype.deleteMessageBatch = (params, callback) => {
                    const request = {
                        send: (callback) => callback && callback(new Error()),
                        promise: () => Promise.reject(new Error())
                    };

                    callback && request.send(callback);

                    return request;
                };

                spyOn(SQSMock.prototype, 'deleteMessageBatch').and.callThrough();
                spyOn(sqs, '_deleteFromS3').and.callThrough();
            });

            it('throw an error and don\'t call S3 at all (callback)', (done) => {
                const params = {
                        QueueUrl: 'fake queue',
                        Entries: [{Id: 'Id_1', ReceiptHandle: 'fake receipt handle'}]
                    },
                    callback = (error, data) => {
                        if (error) {
                            expect(SQSMock.prototype.deleteMessageBatch).toHaveBeenCalledTimes(1);
                            expect(SQSMock.prototype.deleteMessageBatch).toHaveBeenCalledWith(params);
                            expect(sqs._deleteFromS3).not.toHaveBeenCalled();
                            done();
                        } else {
                            done.fail();
                        }
                    };

                sqs.deleteMessageBatch(params, callback);
            });

            it('throw an error and don\'t call S3 at all (promise)', async () => {
                const params = {
                    QueueUrl: 'fake queue',
                    Entries: [{Id: 'Id_1', ReceiptHandle: 'fake receipt handle'}]
                };

                let err;

                try {
                    await sqs.deleteMessageBatch(params).promise();
                } catch (e) {
                    err = e;
                } finally {
                    expect(err).toBeInstanceOf(Error);
                    expect(SQSMock.prototype.deleteMessageBatch).toHaveBeenCalledTimes(1);
                    expect(SQSMock.prototype.deleteMessageBatch).toHaveBeenCalledWith(params);
                    expect(sqs._deleteFromS3).not.toHaveBeenCalled();
                }
            });
        });

        describe('when extended client is not properly setup', () => {
            beforeEach(() => {
                spyOn(sqs, '_cloneWithReceiptHandleFromS3').and.throwError(new Error());
                spyOn(sqs, '_deleteFromS3').and.callThrough();
            });

            it('should throw an error (callback)', (done) => {
                const params = {
                        QueueUrl: 'fake queue',
                        Entries: [{Id: 'Id_1', ReceiptHandle: 'fake receipt handle'}]
                    },
                    callback = (error, data) => {
                        if (error) {
                            expect(SQSMock.prototype.deleteMessageBatch).not.toHaveBeenCalled();
                            expect(sqs._deleteFromS3).not.toHaveBeenCalled();
                            done();
                        } else {
                            done.fail();
                        }
                    };

                sqs.deleteMessageBatch(params, callback);
            });

            it('should throw an error (promise)', async () => {
                const params = {
                    QueueUrl: 'fake queue',
                    Entries: [{Id: 'Id_1', ReceiptHandle: 'fake receipt handle'}]
                };

                let err;

                try {
                    await sqs.deleteMessageBatch(params).promise();
                } catch (e) {
                    err = e;
                } finally {
                    expect(err).toBeInstanceOf(Error);
                    expect(SQSMock.prototype.deleteMessageBatch).not.toHaveBeenCalled();
                    expect(sqs._deleteFromS3).not.toHaveBeenCalled();
                }
            });
        });

        describe('when extended client is properly setup', () => {
            let mutatedParams;

            beforeEach(() => {
                mutatedParams = {};

                spyOn(sqs, '_cloneWithReceiptHandleFromS3').and.returnValue(mutatedParams);
            });

            describe('when S3 delete succeeds or message hasn\'t an S3 reference', () => {
                beforeEach(() => {
                    spyOn(sqs, '_deleteFromS3').and.resolveTo(undefined);
                });

                it('should delete both SQS messages and S3 objects (callback)', (done) => {
                    const params = {
                            QueueUrl: 'fake queue',
                            Entries: [{Id: 'Id_1', ReceiptHandle: 'fake receipt handle'}]
                        },
                        callback = (error, data) => {
                            if (error) {
                                done.fail();
                            } else {
                                expect(SQSMock.prototype.deleteMessageBatch).toHaveBeenCalledTimes(1);
                                expect(SQSMock.prototype.deleteMessageBatch).toHaveBeenCalledWith(mutatedParams);
                                expect(sqs._deleteFromS3).toHaveBeenCalledTimes(1);
                                expect(sqs._deleteFromS3).toHaveBeenCalledWith(params);
                                done();
                            }
                        };

                    sqs.deleteMessageBatch(params, callback);
                });

                it('should delete both SQS messages and S3 objects (promise)', async () => {
                    const params = {
                        QueueUrl: 'fake queue',
                        Entries: [{Id: 'Id_1', ReceiptHandle: 'fake receipt handle'}]
                    };

                    await sqs.deleteMessageBatch(params).promise();

                    expect(SQSMock.prototype.deleteMessageBatch).toHaveBeenCalledTimes(1);
                    expect(SQSMock.prototype.deleteMessageBatch).toHaveBeenCalledWith(mutatedParams);
                    expect(sqs._deleteFromS3).toHaveBeenCalledTimes(1);
                    expect(sqs._deleteFromS3).toHaveBeenCalledWith(params);
                });
            });

            describe('when S3 delete fails', () => {
                beforeEach(() => {
                    spyOn(sqs, '_deleteFromS3').and.rejectWith(new Error());
                });

                it('should delete both SQS message and warn about the S3 error (callback)', (done) => {
                    const params = {
                            QueueUrl: 'fake queue',
                            Entries: [{Id: 'Id_1', ReceiptHandle: 'fake receipt handle'}]
                        },
                        callback = (error, data) => {
                            if (error) {
                                done.fail();
                            } else {
                                expect(SQSMock.prototype.deleteMessageBatch).toHaveBeenCalledTimes(1);
                                expect(SQSMock.prototype.deleteMessageBatch).toHaveBeenCalledWith(mutatedParams);
                                expect(sqs._deleteFromS3).toHaveBeenCalledTimes(1);
                                expect(sqs._deleteFromS3).toHaveBeenCalledWith(params);
                                expect(console.warn).toHaveBeenCalled();
                                done();
                            }
                        };

                    sqs.deleteMessageBatch(params, callback);
                });

                it('should delete both SQS message and warn about the S3 error (promise)', async () => {
                    const params = {
                        QueueUrl: 'fake queue',
                        Entries: [{Id: 'Id_1', ReceiptHandle: 'fake receipt handle'}]
                    };

                    await sqs.deleteMessageBatch(params).promise();

                    expect(SQSMock.prototype.deleteMessageBatch).toHaveBeenCalledTimes(1);
                    expect(SQSMock.prototype.deleteMessageBatch).toHaveBeenCalledWith(mutatedParams);
                    expect(sqs._deleteFromS3).toHaveBeenCalledTimes(1);
                    expect(sqs._deleteFromS3).toHaveBeenCalledWith(params);
                    expect(console.warn).toHaveBeenCalled();
                });
            });
        });
    });
});
