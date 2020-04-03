'use strict';

const ExtendedConfig = require('../src/extendedConfig');

describe('ExtendedConfig', () => {
    describe('Constructor', () => {
        describe('with empty parameters', () => {
            it('should create an instance of ExtendedConfig', () => {
                let error;
                let extendedConfig;

                try {
                    extendedConfig = new ExtendedConfig();
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeUndefined();
                    expect(extendedConfig).toBeDefined();
                    expect(extendedConfig._s3).toBeUndefined();
                    expect(extendedConfig._s3BucketName).toBeDefined();
                    expect(extendedConfig._largePayloadSupport).toBe(false);
                }
            });
        });
    });

    describe('enableLargePayloadSupport', () => {
        let extendedConfig;

        beforeEach(() => {
            extendedConfig = new ExtendedConfig();
        });

        describe('with empty parameters', () => {
            it('should throw an error', () => {
                let error;
                let response;

                try {
                    response = extendedConfig.enableLargePayloadSupport();
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
            it('should modify extendedConfig instance', () => {
                const bucketName = 'my-bucket';
                let error;

                try {
                    extendedConfig.enableLargePayloadSupport({}, bucketName);
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeUndefined();
                    expect(extendedConfig).toBeDefined();
                    expect(extendedConfig._s3).toEqual({});
                    expect(extendedConfig._s3BucketName).toBe(bucketName);
                    expect(extendedConfig._largePayloadSupport).toBe(true);
                }
            });
        });
    });

    describe('disableLargePayloadSupport', () => {
        let extendedConfig;

        beforeEach(() => {
            extendedConfig = new ExtendedConfig();
        });

        describe('with empty parameters', () => {
            it('should modify extendedConfig instance', () => {
                let error;

                try {
                    extendedConfig.disableLargePayloadSupport();
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeUndefined();
                    expect(extendedConfig).toBeDefined();
                    expect(extendedConfig._s3).toBeUndefined();
                    expect(extendedConfig._s3BucketName).toBeDefined();
                    expect(extendedConfig._largePayloadSupport).toBe(false);
                }
            });
        });
    });

    describe('isLargePayloadSupportEnabled', () => {
        let extendedConfig;

        beforeEach(() => {
            extendedConfig = new ExtendedConfig();
        });

        describe('with empty parameters', () => {
            it('should returns extendedConfig\'s _largePayloadSupport', () => {
                let error;
                let response;

                try {
                    response = extendedConfig.isLargePayloadSupportEnabled();
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeUndefined();
                    expect(response).toBeDefined();
                    expect(response).toBe(extendedConfig._largePayloadSupport);
                }
            });
        });
    });
    describe('isAlwaysThroughS3', () => {
        let extendedConfig;

        beforeEach(() => {
            extendedConfig = new ExtendedConfig();
        });

        describe('with empty parameters', () => {
            it('should returns extendedConfig\'s alwaysThroughS3', () => {
                let error;
                let response;

                try {
                    response = extendedConfig.isAlwaysThroughS3();
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeUndefined();
                    expect(response).toBeDefined();
                    expect(response).toBe(extendedConfig.alwaysThroughS3);
                }
            });
        });
    });

    describe('getAmazonS3Client', () => {
        const s3 = {};
        let extendedConfig;

        beforeEach(() => {
            extendedConfig = new ExtendedConfig();
            extendedConfig.enableLargePayloadSupport(s3, 'test');
        });

        describe('with empty parameters', () => {
            it('should returns extendedConfig\'s s3 object', () => {
                let error;
                let response;

                try {
                    response = extendedConfig.getAmazonS3Client();
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
        let extendedConfig;

        beforeEach(() => {
            extendedConfig = new ExtendedConfig();
        });

        describe('with empty parameters', () => {
            it('should returns extendedConfig\'s s3BucketName', () => {
                let error;
                let response;

                try {
                    response = extendedConfig.getS3BucketName();
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeUndefined();
                    expect(response).toBeDefined();
                    expect(response).toEqual(extendedConfig._s3BucketName);
                }
            });
        });
    });

    describe('setMessageSizeThreshold', () => {
        const MAX_MESSAGE_SIZE = 262144;

        let extendedConfig;

        beforeEach(() => {
            extendedConfig = new ExtendedConfig();
        });

        describe('with empty parameters', () => {
            it(`should set ${MAX_MESSAGE_SIZE} in extendedConfig\'s messageSizeThreshold`, () => {
                let error;

                try {
                    extendedConfig.setMessageSizeThreshold();
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeUndefined();
                    expect(extendedConfig).toBeDefined();
                    expect(extendedConfig.messageSizeThreshold).toBe(MAX_MESSAGE_SIZE);
                }
            });
        });

        describe('with an integer passed', () => {
            it('should modify extendedConfig\'s messageSizeThreshold', () => {
                const MESSAGE_SIZE = 100;
                let error;

                try {
                    extendedConfig.setMessageSizeThreshold(MESSAGE_SIZE);
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeUndefined();
                    expect(extendedConfig).toBeDefined();
                    expect(extendedConfig.messageSizeThreshold).toBe(MESSAGE_SIZE);
                }
            });
        });
    });

    describe('getMessageSizeThreshold', () => {
        let extendedConfig;

        beforeEach(() => {
            extendedConfig = new ExtendedConfig();
        });

        describe('with empty parameters', () => {
            it('should returns extendedConfig\'s messageSizeThreshold', () => {
                let error;
                let response;

                try {
                    response = extendedConfig.getMessageSizeThreshold();
                } catch (err) {
                    error = err;
                } finally {
                    expect(error).toBeUndefined();
                    expect(response).toBeDefined();
                    expect(response).toEqual(extendedConfig.messageSizeThreshold);
                }
            });
        });
    });
});
