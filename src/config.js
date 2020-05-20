'use strict';

const MAX_MESSAGE_SIZE = 262144; // Bytes

/**
 * @classdesc A extended config for
 * [sqs client options]{@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SQS.html#constructor-property}.
 * Config encapsulates the integration with AWS S3; it also exposes methods to decide when an sqs message must
 * be sent to S3. This is typically the 256B limit, but it may also be set up to send all sqs messages through S3.
 */
class Config {
    /**
     * @description
     * Constructs a config object to be passed in to sqs clients. This object may have an s3 client and
     * methods to decide when an sqs message must be sent through S3. By default, configs are set up
     * with large payload support disabled.
     *
     * @example
     * const config = new Config();
     *
     * config.alwaysThroughS3 = true; // to indicate all sqs messages must go through S3. It defaults to false.
     * config.addQueueToS3Key = false; // to indicate S3 keys must be prefixed with QueueUrl. It defaults to true.
     * config.messageSizeThreshold = <NUMBER>; // to modify the message size threshold (in Bytes). It defaults to 256KB.
     */
    constructor() {
        this.disableLargePayloadSupport();

        this.alwaysThroughS3 = false;
        this.addQueueToS3Key = true;
        this.messageSizeThreshold = MAX_MESSAGE_SIZE;
    }

    /**
     * @description
     * This method is responsible for enabling large payload sqs messages. To enable such a support,
     * an s3 client and bucket name are required. Once enabled, s3 client and bucket can be accessed
     * from outside by accessing s3 and s3BucketName properties respectively.
     *
     * @param {Object} s3 - S3 client.
     * @param {String} s3BucketName - bucket name that will store sqs messages.
     */
    enableLargePayloadSupport(s3, s3BucketName) {
        if (!s3 || !s3BucketName) {
            throw new Error('Config::enableLargePayloadSupport S3 client and/or S3 bucket name cannot be null.');
        }

        this.s3 = s3;
        this.s3BucketName = s3BucketName;
        this._largePayloadSupport = true;
    }

    /**
     * @description
     * This method is responsible for disabling large payload sqs messages. When large payload support is disabled,
     * sending a large sqs message will throw an error (as if aws-sdk sqs client were used). In addition, receiving
     * large sqs message will throw an error too as there won't be an s3 client to download s3 objects.
     */
    disableLargePayloadSupport() {
        this.s3 = undefined;
        this.s3BucketName = '';
        this._largePayloadSupport = false;
    }

    /**
     * @description
     * Check if the support for large payload message if enabled.
     *
     * @return {Boolean} true if support for large payload messages is enabled, false otherwise.
     */
    isLargePayloadSupportEnabled() {
        return this._largePayloadSupport;
    }

    /**
     * @description
     * Checks whether or not all messages regardless of their payload size are being stored in Amazon S3.
     *
     * @return {Boolean} true if all messages must be sent through S3, false otherwise.
     */
    isAlwaysThroughS3() {
        return this.alwaysThroughS3;
    }
}

module.exports = Config;
