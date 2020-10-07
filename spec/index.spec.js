'use strict';

describe('aws-sqs-xl-messages module init', () => {
    const initLibrary = require('../src/index'),
        ConfigClazz = require('../src/config'),
        extendSQSMixin = require('../src/extendSQSMixin');

    let SQSMock;

    beforeEach(() => {
        SQSMock = Object;
    });

    [undefined, null, ''].forEach((input) => {
        it(`should throw an error when a wrong sqs client class is given [input=${input}]`, () => {
            let err;

            try {
                initLibrary(input);
            } catch (e) {
                err = e;
            } finally {
                expect(err).toBeInstanceOf(Error);
                expect(err.message).toContain('aws-sqs-xl-messages module can\'t be initialized');
            }
        });
    });

    it('should return Config and SQSExt classes', () => {
        const {Config, SQSExt} = initLibrary(SQSMock);

        expect(Config).toEqual(ConfigClazz);
        // workaround to check class equality, since extendSQSMixin is a mixin.
        expect(SQSExt.name).toEqual(extendSQSMixin(SQSMock).name);
    });
});
