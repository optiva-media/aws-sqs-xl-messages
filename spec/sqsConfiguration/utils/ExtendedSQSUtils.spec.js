'use strict';

const utils = require('../../../app/src/sqsConfiguration/utils/ExtendedSQSUtils');

describe('ExtendedSQSUtils', () => {
    describe('s3Path2Params', () => {
        describe('with empty parameters', () => {
            it('should throw an error', () => {
                let error;
                let response;

                try {
                    response = utils.s3Path2Params();
                } catch (err) {
                    error = err;
                } finally {
                    expect(response).toBeUndefined();
                    expect(error).toBeDefined();
                }
            });
        });

        describe('with parameters but no s3', () => {
            it('should throw an error', () => {
                let error;
                let response;

                try {
                    response = utils.s3Path2Params('test:/test/test');
                } catch (err) {
                    error = err;
                } finally {
                    expect(response).toBeUndefined();
                    expect(error).toBeDefined();
                }
            });
        });

        describe('with parameters', () => {
            it('should return a response', () => {
                let error;
                let response;

                try {
                    response = utils.s3Path2Params('s3://3Bucket/s3Key');
                } catch (err) {
                    error = err;
                } finally {
                    expect(response).toBeDefined();
                    expect(error).toBeUndefined();
                }
            });
        });
    });

    describe('parseReceiptHandle', () => {
        describe('with empty parameters', () => {
            it('should return response with undefined attributes', () => {
                let error;
                let response;

                try {
                    response = utils.parseReceiptHandle();
                } catch (err) {
                    error = err;
                } finally {
                    expect(response).toBeDefined();
                    expect(response.s3Bucket).toBeUndefined();
                    expect(response.s3Key).toBeUndefined();
                    expect(error).toBeUndefined();
                }
            });
        });

        describe('with parameters', () => {
            it('should return a parse response', () => {
                let error;
                let response;

                try {
                    response = utils.parseReceiptHandle('s3://s3Bucket/s3Key-..SEPARATOR..-receiptHandle');
                } catch (err) {
                    error = err;
                } finally {
                    expect(response).toBeDefined();
                    expect(response.s3Bucket).toBe('s3Bucket');
                    expect(response.s3Key).toBe('s3Key');
                    expect(response.receiptHandle).toBe('receiptHandle');
                    expect(error).toBeUndefined();
                }
            });
        });
    });
});
