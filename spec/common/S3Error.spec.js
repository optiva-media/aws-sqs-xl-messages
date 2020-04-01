'use strict';

const S3Error = require('../../app/common/S3Error');

describe('S3Error', () => {
    const VALID_ERROR = '__message_error__';

    describe('with valid arguments in the constructor', () => {
        const s3Error = new S3Error(VALID_ERROR);

        it(', http error should be the given value', () => {
            expect(s3Error.toString()).toBe('Error: ' + VALID_ERROR);
        });
    });
});
