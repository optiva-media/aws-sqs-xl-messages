'use strict';

const ExtendedConfiguration = require('../../app/src//sqsConfiguration/ExtendedConfiguration');

describe('ExtendedConfiguration', () => {
    describe('Constructor', () => {
        describe('with empty parameters', () => {
            it('should create an instance of ExtendedConfiguration', () => {
                let error;
                let extendedConfiguration;

                try {
                    extendedConfiguration = new ExtendedConfiguration();
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeUndefined();
                    expect(extendedConfiguration).toBeDefined();
                    expect(extendedConfiguration._s3).toBeUndefined();
                    expect(extendedConfiguration._s3BucketName).toBeDefined();
                    expect(extendedConfiguration._largePayloadSupport).toBe(false);
                }
            });
        });
    });

    describe('enableLargePayloadSupport', () => {
        let extendedConfiguration;

        beforeEach(() => {
            extendedConfiguration = new ExtendedConfiguration();
        });

        describe('with empty parameters', () => {
            it('should throw an error', () => {
                let error;
                let response;

                try {
                    response = extendedConfiguration.enableLargePayloadSupport();
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeDefined();
                    expect(error).toEqual((new Error('S3 client and/or S3 bucket name cannot be null.')));
                    expect(response).toBeUndefined();
                }
            });
        });

        describe('with S3 and Bucket name', () => {
            it('should modify extendedConfiguration instance', () => {
                const bucketName = 'my-bucket';
                let error;

                try {
                    extendedConfiguration.enableLargePayloadSupport({}, bucketName);
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeUndefined();
                    expect(extendedConfiguration).toBeDefined();
                    expect(extendedConfiguration._s3).toEqual({});
                    expect(extendedConfiguration._s3BucketName).toBe(bucketName);
                    expect(extendedConfiguration._largePayloadSupport).toBe(true);
                }
            });
        });
    });

    describe('disableLargePayloadSupport', () => {
        let extendedConfiguration;

        beforeEach(() => {
            extendedConfiguration = new ExtendedConfiguration();
        });

        describe('with empty parameters', () => {
            it('should modify extendedConfiguration instance', () => {
                let error;

                try {
                    extendedConfiguration.disableLargePayloadSupport();
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeUndefined();
                    expect(extendedConfiguration).toBeDefined();
                    expect(extendedConfiguration._s3).toBeUndefined();
                    expect(extendedConfiguration._s3BucketName).toBeDefined();
                    expect(extendedConfiguration._largePayloadSupport).toBe(false);
                }
            });
        });
    });

    describe('isLargePayloadSupportEnabled', () => {
        let extendedConfiguration;

        beforeEach(() => {
            extendedConfiguration = new ExtendedConfiguration();
        });

        describe('with empty parameters', () => {
            it('should returns extendedConfiguration\'s _largePayloadSupport', () => {
                let error;
                let response;

                try {
                    response = extendedConfiguration.isLargePayloadSupportEnabled();
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeUndefined();
                    expect(response).toBeDefined();
                    expect(response).toBe(extendedConfiguration._largePayloadSupport);
                }
            });
        });
    });
    describe('isAlwaysThroughS3', () => {
        let extendedConfiguration;

        beforeEach(() => {
            extendedConfiguration = new ExtendedConfiguration();
        });

        describe('with empty parameters', () => {
            it('should returns extendedConfiguration\'s alwaysThroughS3', () => {
                let error;
                let response;

                try {
                    response = extendedConfiguration.isAlwaysThroughS3();
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeUndefined();
                    expect(response).toBeDefined();
                    expect(response).toBe(extendedConfiguration.alwaysThroughS3);
                }
            });
        });
    });

    describe('getAmazonS3Client', () => {
        const s3 = {};
        let extendedConfiguration;

        beforeEach(() => {
            extendedConfiguration = new ExtendedConfiguration();
            extendedConfiguration.enableLargePayloadSupport(s3, 'test');
        });

        describe('with empty parameters', () => {
            it('should returns extendedConfiguration\'s s3 object', () => {
                let error;
                let response;

                try {
                    response = extendedConfiguration.getAmazonS3Client();
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeUndefined();
                    expect(response).toBeDefined();
                    expect(response).toEqual(s3);
                }
            });
        });
    });

    describe('getS3BucketName', () => {
        let extendedConfiguration;

        beforeEach(() => {
            extendedConfiguration = new ExtendedConfiguration();
        });

        describe('with empty parameters', () => {
            it('should returns extendedConfiguration\'s s3BucketName', () => {
                let error;
                let response;

                try {
                    response = extendedConfiguration.getS3BucketName();
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeUndefined();
                    expect(response).toBeDefined();
                    expect(response).toEqual(extendedConfiguration._s3BucketName);
                }
            });
        });
    });

    describe('setMessageSizeThreshold', () => {
        const MAX_MESSAGE_SIZE = 262144;

        let extendedConfiguration;

        beforeEach(() => {
            extendedConfiguration = new ExtendedConfiguration();
        });

        describe('with empty parameters', () => {
            it(`should set ${MAX_MESSAGE_SIZE} in extendedConfiguration\'s messageSizeThreshold`, () => {
                let error;

                try {
                    extendedConfiguration.setMessageSizeThreshold();
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeUndefined();
                    expect(extendedConfiguration).toBeDefined();
                    expect(extendedConfiguration.messageSizeThreshold).toBe(MAX_MESSAGE_SIZE);
                }
            });
        });

        describe('with an integer passed', () => {
            it('should modify extendedConfiguration\'s messageSizeThreshold', () => {
                const MESSAGE_SIZE = 100;
                let error;

                try {
                    extendedConfiguration.setMessageSizeThreshold(MESSAGE_SIZE);
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeUndefined();
                    expect(extendedConfiguration).toBeDefined();
                    expect(extendedConfiguration.messageSizeThreshold).toBe(MESSAGE_SIZE);
                }
            });
        });
    });

    describe('getMessageSizeThreshold', () => {
        let extendedConfiguration;

        beforeEach(() => {
            extendedConfiguration = new ExtendedConfiguration();
        });

        describe('with empty parameters', () => {
            it('should returns extendedConfiguration\'s messageSizeThreshold', () => {
                let error;
                let response;

                try {
                    response = extendedConfiguration.getMessageSizeThreshold();
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeUndefined();
                    expect(response).toBeDefined();
                    expect(response).toEqual(extendedConfiguration.messageSizeThreshold);
                }
            });
        });
    });
});
