'use strict';

(function(module) {
    const SQS = function() {},
        S3 = function() {};

    SQS.prototype.dataMap = {
        receiveReturnedMessages: {
            'ResponseMetadata': {'RequestId': '30ff6507-d87c-5bd9-8a12-35ccb94aab8a'},
            'Messages': [{
                'MessageId': '7b1e07c2-2aab-4a3a-82b9-190c130d58d4',
                'ReceiptHandle': 'AQE...',
                'MD5OfBody': 'c708249c52a2bebec91b9e9f3737ceef',
                'Body': '{"hash": "123","version": 1,"files": [ {"file_path": "/public_html/mediaflow/fichero1.xml",' +
                    '"file_size": 200}]}'
            }]
        }
    };

    SQS.prototype.sendMessage = function(message) {
        if (!message || !message.MessageBody) {
            return {
                promise: () => Promise.reject(new Error('Object with the param Role is required'))
            };
        }

        if (!message.QueueUrl) {
            return {
                promise: () => Promise.reject(new Error('QueueUrl and MessageBody must be provided!'))
            };
        }
        console.log('entra al prototipo');
        return {
            promise: () => Promise.resolve({})
        };
    };

    SQS.prototype.receiveMessage = function(params) {
        const me = this;

        if (!params || !params.QueueUrl) {
            return {
                promise: () => Promise.reject(new Error('QueueUrl must be provided!'))
            };
        }

        return {
            promise: () => Promise.resolve(me.dataMap.receiveReturnedMessages.Messages)
        };
    };

    SQS.prototype.deleteMessage = function(params, callback) {
        if (!callback) {
            return;
        }

        if (!params || !params.QueueUrl || !params.Entries) {
            callback('QueueUrl and Entries must be provided!');
        } else {
            callback();
        }
    };

    SQS.prototype.deleteMessageBatch = function(params, callback) {
        if (!callback) {
            return;
        }

        if (!params || !params.QueueUrl || !params.Entries) {
            callback('QueueUrl and Entries must be provided!');
        } else {
            callback();
        }
    };


    S3.prototype.dataMap = {
        // @See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#listObjectsV2-property
        listObjectsV2Return: {
            error: null,
            data: {
                IsTruncated: false,
                Contents: [
                    {
                        Key: 'some/path.jpg',
                        Size: 2032
                    }
                ]
            }
        },
        getObjectReturn: {
            error: null
        },
        uploadReturn: {
            error: null
        },
        headObjectReturn: {
            error: null
        }
    };


    S3.prototype.upload = function(params, callback) {
        if (!callback) {
            return;
        }

        callback(this.dataMap.uploadReturn.error, null);
    };

    S3.prototype.getObject = function(params, callback) {
        params = params || {};

        if (!params.Bucket || !params.Key) {
            throw new Error('Bucket and Key must be provided!');
        } else {
            const retObject = {
                createReadStream: function() {
                    const dummyReadStream = require('./dummyReadStream');

                    return new dummyReadStream.DummyReadStream({}, 'fake content');
                }
            };

            callback && callback(this.dataMap.getObjectReturn.error, {Body: retObject.createReadStream()});

            return retObject;
        }
    };


    module.exports = {
        // Public SQS constructor in the same way as aws-sdk does
        SQS: SQS,
        // Public S3 constructor in the same way as aws-sdk does
        S3: S3,
        // We need to mock the config because we are setting the region directly in the code
        config: {
            update: function() {}
        }
    };
})(module);
