/** @module aws-sqs-xl-messages */

'use strict';

const Config = require('./config'),
    extendSQSMixing = require('./extendSQSMixin');

/**
 * An object containing the public API of aws-sqs-xl-messages. That is an extended config class
 * and a decorated sqs client class.
 *
 * @typedef {Object} Library
 * @property {class} Config - @see Config.
 * @property {class} SQSExt - @see SQSExt.
 */

/**
 * This method initializes the library. It returns two classes: a extended config class, and the
 * sqs client class decorated with extra behavior to manage large payloads.
 *
 * @example
 * const {SQS, S3} = require('aws-sdk'),
 *    {SQSExt, Config} = require('aws-sqs-xl-messages')(SQS),
 *    config = new Config();
 *
 * config.enableLargePayloadSupport(new S3(), 'my-bucket');
 *
 * let sqs = new SQSExt({extendedConfig: config}); // you can now use sqs as if it was an sqs client from aws-sdk
 *
 * @param {Object} SQS - sqs client class from aws-sdk module.
 * @return {Library} config and decorated sqs client classes.
 */
module.exports = (SQS) => {
    if (!SQS) {
        throw new Error('aws-sqs-xl-messages module can\'t be initialized without a valid SQS client class!');
    }

    return {
        Config: Config,
        SQSExt: extendSQSMixing(SQS)
    };
};
