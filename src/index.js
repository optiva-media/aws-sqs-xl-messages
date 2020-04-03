/** @module aws-sqs-xl-messages */

'use strict';

const ExtendedConfiguration = require('./extendedConfiguration'),
    extendedSQSMixing = require('./extendedSQS');

/**
 * This method initializes the library. It returns two classes: a extended configuration class, and the
 * sqs client class decorated with extra behavior to manage large payloads.
 *
 * @param {Object} SQS - sqs client class from aws-sdk module.
 * @return {Object} configuration and decorated sqs client classes.
 */
module.exports = (SQS) => {
    if (!SQS) {
        throw new Error('aws-sqs-xl-messages module can\'t be initialized without a valid SQS client class!');
    }

    return {
        ExtendedConfiguration: ExtendedConfiguration,
        ExtendedSQS: extendedSQSMixing(SQS)
    };
};
