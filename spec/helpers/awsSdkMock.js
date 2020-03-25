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
                'MessageBody': '{"hash": "123","version": 1,"files": [ {"file_path": "/public_html/mediaflow/fichero1.xml",' +
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
        console.log('llega aqui');
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

    SQS.prototype.deleteMessage = function(params) {
        if (!params || !params.QueueUrl) {
            return {
                promise: () => Promise.reject(new Error('QueueUrl must be provided!'))
            };
        }

        return {
            promise: () => Promise.resolve({})
        };
    };

    SQS.prototype.deleteMessageBatch = function(params) {
        if (!params || !params.QueueUrl || !params.Entries) {
            return {
                promise: () => Promise.reject(new Error('QueueUrl and/or Entries must be provided!'))
            };
        }

        return {
            promise: () => Promise.resolve({})
        };
    };

    S3.prototype.getObject = function(params) {
        params = params || {};

        if (!params.Bucket || !params.Key) {
            return {
                promise: () => Promise.reject(new Error('Bucket and Key must be provided!'))
            };
            // throw new Error('Bucket and Key must be provided!');
        }

        return {
            promise: () => Promise.resolve({Body: {}})
        };
        // return {Body: {}};
    };

    S3.prototype.deleteObject = function(params) {
        params = params || {};

        if (!params.Bucket || !params.Key) {
            throw new Error('Bucket and Key must be provided!');
        }

        return {
            promise: () => Promise.resolve({})
        };
    };


    S3.prototype.upload = function(params) {
        if (!params.Bucket || !params.Key) {
            throw new Error('Bucket and Key must be provided!');
        }

        return {
            promise: () => Promise.resolve({})
        };
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
