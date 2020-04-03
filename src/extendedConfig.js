'use strict';

const MAX_MESSAGE_SIZE = 262144;// Bytes
/**
* @classdesc ExtendedConfig is a helper class that enables us to manage sqs messages in S3 to overcome 256KB limit.
*/
module.exports = class ExtendedConfig {
    /**
     * ExtendedConfig's constructor.
     */
    constructor() {
        this.disableLargePayloadSupport();

        this.alwaysThroughS3 = false;
        this.messageSizeThreshold = MAX_MESSAGE_SIZE;
    }

    /**
     * Enables support for large-payload messages.
     * @param {Object} s3 - Amazon S3 client which is going to be used for storing large-payload messages.
     * @param {String} s3BucketName - Name of the bucket which is going to be used for storing large-payload messages.
     *                           The bucket must be already created and configured in s3.
     */
    enableLargePayloadSupport(s3, s3BucketName = '') {
        if (!s3 || !s3BucketName) {
            throw new Error('S3 client and/or S3 bucket name cannot be null.');
        }

        this._s3 = s3;
        this._s3BucketName = s3BucketName;
        this._largePayloadSupport = true;
    }

    /**
     * Disables support for large-payload messages.
     */
    disableLargePayloadSupport() {
        this._s3 = undefined;
        this._s3BucketName = '';
        this._largePayloadSupport = false;
    }

    /**
     * Check if the support for large-payload message if enabled.
     * @return {Boolean} true if support for large-payload messages is enabled.
     */
    isLargePayloadSupportEnabled() {
        return this._largePayloadSupport;
    }

    /**
     * Checks whether or not all messages regardless of their payload size are being stored in Amazon S3.
     * @return {Boolean} True if all messages regardless of their payload size are being stored in Amazon S3. Default: false
     */
    isAlwaysThroughS3() {
        return this.alwaysThroughS3;
    }

    /**
     * Sets whether or not all messages regardless of their payload size should be stored in Amazon S3.
     * @param {Boolean} alwaysThroughS3 - Whether or not all messages regardless of their payload size
     *  should be stored in Amazon S3. Default: false
     */
    setAlwaysThroughS3(alwaysThroughS3) {
        this.alwaysThroughS3 = alwaysThroughS3;
    }

    /**
     * Gets the Amazon S3 client which is being used for storing large-payload messages.
     * @return {Object} Reference to the Amazon S3 client which is being used.
     */
    getAmazonS3Client() {
        return this._s3;
    }

    /**
     * Gets the name of the S3 bucket which is being used for storing large-payload messages.
     * @return {String} The name of the bucket which is being used.
     */
    getS3BucketName() {
        return this._s3BucketName;
    }
    /**
     * Sets the message size threshold for storing message payloads in Amazon S3
     * @param {Integer} messageSizeThreshold -   Message size threshold to be used for storing in Amazon S3.
     */
    setMessageSizeThreshold(messageSizeThreshold = MAX_MESSAGE_SIZE) {
        this.messageSizeThreshold = messageSizeThreshold;
    }

    /**
     * Gets the message size threshold for storing message payloads in Amazon S3
     * @return {Integer} messageSizeThreshold - Message size threshold which is being used for storing in Amazon
     */
    getMessageSizeThreshold() {
        return this.messageSizeThreshold;
    }
};
