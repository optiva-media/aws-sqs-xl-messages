'use strict';

describe('utils', () => {
    const {s3Path2Params} = require('../../src/common/utils');

    describe('s3Path2Params', () => {
        [undefined, null, '', {}].forEach((input) => {
            it('should throw an error when arguments are wrong', () => {
                let err;

                try {
                    s3Path2Params(input);
                } catch (e) {
                    err = e;
                } finally {
                    expect(err).toBeInstanceOf(Error);
                }
            });
        });

        ['http://example.com/file', 'https://example.com/file', 'file://file.txt', 'ws://websocket'].forEach((input) => {
            it('should throw an error when the input is not an s3 path', () => {
                let err;

                try {
                    s3Path2Params(input);
                } catch (e) {
                    err = e;
                } finally {
                    expect(err).toBeInstanceOf(Error);
                    expect(err.message).toContain('and we expect s3://<bucket-name>/<path-to-key>');
                }
            });
        });

        it('should return s3 bucket and key as an object', () => {
            const BUCKET = 'my-bucket',
                KEY = 'sqs-messages/message1',
                s3Path = `s3://${BUCKET}/${KEY}`,
                params = s3Path2Params(s3Path);

            expect(params).toEqual({
                Bucket: BUCKET,
                Key: KEY
            });
        });
    });
});
