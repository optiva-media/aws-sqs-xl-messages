/** @module utils */

'use strict';

const {URL} = require('url');

/**
 * An object containing the minimum properties to communicate with AWS S3 using aws-sdk.
 *
 * @typedef {Object} AWSS3Params
 * @property {String} Bucket - The bucket name containing the object.
 * @property {String} Key - Key of the object.
 */

/**
 * This method is responsible for decomposing an s3 uri into an AWS object {Bucket, Key}.
 *
 * @param {String} s3Path - an s3 path in the format `s3://${bucket}/${key}`
 * @return {AWSS3Params} a pair {Bucket, Key}.
 */
module.exports.s3Path2Params = (s3Path = '') => {
    const url = new URL(s3Path);

    if (url.protocol !== 's3:') {
        throw new Error(`s3Path2Params:: Invalid S3 path! _s3Path_ was ${s3Path} and we expect s3://<bucket-name>/<path-to-key>`);
    }

    return {
        Bucket: url.hostname,
        Key: url.pathname.substring(1)
    };
};
