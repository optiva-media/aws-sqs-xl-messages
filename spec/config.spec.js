'use strict';

describe('Config', () => {
    const Config = require('../src/config');

    let config;

    beforeEach(() => {
        config = new Config();
    });

    describe('constructor', () => {
        beforeEach(() => {
            spyOn(Config.prototype, 'disableLargePayloadSupport').and.callThrough();
        });

        it('should create instances', () => {
            const config = new Config();

            expect(config.disableLargePayloadSupport).toHaveBeenCalledTimes(1);
            expect(config.alwaysThroughS3).toBeFalsy();
            expect(config.messageSizeThreshold).toBe(262144);
        });
    });

    describe('enableLargePayloadSupport', () => {
        let s3Mock;

        beforeEach(() => {
            s3Mock = {};
        });

        [
            {s3: undefined, bucket: undefined},
            {s3: undefined, bucket: null},
            {s3: undefined, bucket: ''},
            {s3: null, bucket: undefined},
            {s3: null, bucket: null},
            {s3: null, bucket: ''}
        ].forEach(({s3, bucket}) => {
            it(`should throw an error when arguments are wrong [s3=${s3}] | [bucket=${bucket}]`, () => {
                let err;

                try {
                    config.enableLargePayloadSupport(s3, bucket);
                } catch (e) {
                    err = e;
                } finally {
                    expect(err).toBeInstanceOf(Error);
                    expect(err.message).toContain('Config::enableLargePayloadSupport');
                }
            });
        });

        it('should store s3 client and bucket internally and turn on large support flag', () => {
            const BUCKET_NAME = 'my-bucket';

            config.enableLargePayloadSupport(s3Mock, BUCKET_NAME);

            expect(config.s3).toBe(s3Mock);
            expect(config.s3BucketName).toBe(BUCKET_NAME);
            expect(config._largePayloadSupport).toBeTruthy();
        });
    });

    describe('disableLargePayloadSupport', () => {
        describe('when large payload support was disabled', () => {
            beforeEach(() => {
                config.disableLargePayloadSupport();
            });

            it('should remove internal s3 client and bucket; and turn off large support flag', () => {
                config.disableLargePayloadSupport();

                expect(config.s3).toBeUndefined();
                expect(config.s3BucketName).toBe('');
                expect(config._largePayloadSupport).toBeFalsy();
            });
        });

        describe('when large payload support was enabled', () => {
            beforeEach(() => {
                const s3Mock = {};

                config.enableLargePayloadSupport(s3Mock, 'my-bucket');
            });

            it('should remove internal s3 client and bucket; and turn off large support flag', () => {
                config.disableLargePayloadSupport();

                expect(config.s3).toBeUndefined();
                expect(config.s3BucketName).toBe('');
                expect(config._largePayloadSupport).toBeFalsy();
            });
        });
    });

    describe('isLargePayloadSupportEnabled', () => {
        describe('when large payload support was disabled', () => {
            beforeEach(() => {
                config.disableLargePayloadSupport();
            });

            it('should return false', () => {
                expect(config.isLargePayloadSupportEnabled()).toBeFalsy();
            });
        });

        describe('when large payload support was enabled', () => {
            beforeEach(() => {
                const s3Mock = {};

                config.enableLargePayloadSupport(s3Mock, 'my-bucket');
            });

            it('should return true', () => {
                expect(config.isLargePayloadSupportEnabled()).toBeTruthy();
            });
        });
    });

    describe('isAlwaysThroughS3', () => {
        describe('when alwaysThroughS3 was disabled', () => {
            beforeEach(() => {
                config.alwaysThroughS3 = false;
            });

            it('should return false', () => {
                expect(config.isAlwaysThroughS3()).toBeFalsy();
            });
        });

        describe('when alwaysThroughS3 was enabled', () => {
            beforeEach(() => {
                config.alwaysThroughS3 = true;
            });

            it('should return true', () => {
                expect(config.isAlwaysThroughS3()).toBeTruthy();
            });
        });
    });
});
