'use strict';

/**
* Arguments for configure s3 client and receiptHandle for sqs messages
*
* @typedef {Object} s3Client
* @property {String} s3Bucket an object ready to query contentEvents
* @property {String} s3Key true if result must be reversed
*/
/**
 *
 * @param {String} s3Path
 * @return {Object} s3Client
 */
function s3Path2Params(s3Path = '') {
    const url = new URL(s3Path);

    if (url.protocol !== 's3:') {
        throw new Error(`s3Path2Params:: Invalid S3 path! _s3Path_ was ${s3Path} and we expect s3://<bucket-name>/<path-to-key>`);
    }

    return {
        Bucket: url.hostname,
        Key: url.pathname.substring(1)
    };
}

/**
* Arguments for configure s3 client and receiptHandle for sqs messages
*
* @typedef {Object} parseConfiguration
* @property {String} s3Bucket The bucket name of the bucket required.
* @property {String} s3Key Key name.
* @property {String} receiptHandle receipt handle associated with the message to delete.
*/
/**
 * Builds an object to extract the argument required for using S3 client and SQS methods
 * @param {String} receiptHandle
 * @param {String} separator
 * @return {Object} parseConfiguration
 */
function parseReceiptHandle(receiptHandle = '', separator = '-..SEPARATOR..-') {
    const parts = receiptHandle.split(separator),
        parseConfiguration = {s3Bucket: undefined, s3Key: undefined, receiptHandle: receiptHandle};

    if (parts.length === 2) {
        const {Bucket, Key} = s3Path2Params(parts[0]);

        parseConfiguration.s3Bucket = Bucket;
        parseConfiguration.s3Key = Key;
        parseConfiguration.receiptHandle = parts[1];
    }

    return parseConfiguration;
}

module.exports.s3Path2Params = s3Path2Params;
module.exports.parseReceiptHandle = parseReceiptHandle;
