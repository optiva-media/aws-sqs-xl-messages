'use strict';

beforeAll(() => {
    const matchers = {
        toContainStr: function(util, customEqualityTesters) {
            return {
                compare: function(actual, expected) {
                    const result = {
                        pass: actual && actual.indexOf && actual.indexOf(expected) >= 0,
                        message: `Expected "${actual}"`
                    };

                    if (result.pass) {
                        result.message += ` to not contain "${expected}"`;
                    } else {
                        result.message += ` to contain "${expected}"`;
                    }

                    return result;
                }
            };
        }
    };

    jasmine.addMatchers(matchers);
});
