'use strict';

const MAX_MESSAGE_SIZE = 262144; // Bytes

/**
 * @classdesc A extended config for
 * [sqs client options]{@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SQS.html#constructor-property}.
 * ExtendedConfig encapsulates the integration with AWS S3; it also exposes methods to decide when an sqs message must
 * be sent to S3. This is typically the 256B limit, but it may also be set up to send all sqs messages through S3.
 */
class ExtendedConfig {
    /**
     * Constructs a config object to be passed in to sqs clients. This object may have an s3 client and
     * methods to decide when an sqs message must be sent through S3. By default, configs are set up
     * with large payload support disabled.
     */
    constructor() {
        this.disableLargePayloadSupport();

        this.alwaysThroughS3 = false;
        this.messageSizeThreshold = MAX_MESSAGE_SIZE;
    }

    /**
     * This method is responsible for enabling large payload sqs messages. To enable such a support,
     * an s3 client and bucket name are required. Once enabled, s3 client and bucket can be accessed
     * from outside by accessing s3 and s3BucketName properties respectively.
     *
     * @param {Object} s3 - S3 client.
     * @param {String} s3BucketName - bucket name that will store sqs messages.
     */
    enableLargePayloadSupport(s3, s3BucketName) {
        if (!s3 || !s3BucketName) {
            throw new Error('ExtendedConfig::enableLargePayloadSupport S3 client and/or S3 bucket name cannot be null.');
        }

        this.s3 = s3;
        this.s3BucketName = s3BucketName;
        this._largePayloadSupport = true;
    }

    /**
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
     * Check if the support for large payload message if enabled.
     *
     * @return {Boolean} true if support for large payload messages is enabled, false otherwise.
     */
    isLargePayloadSupportEnabled() {
        return this._largePayloadSupport;
    }

    /**
     * Checks whether or not all messages regardless of their payload size are being stored in Amazon S3.
     *
     * @return {Boolean} true if all messages must be sent through S3, false otherwise.
     */
    isAlwaysThroughS3() {
        return this.alwaysThroughS3;
    }
}

module.exports = ExtendedConfig;
