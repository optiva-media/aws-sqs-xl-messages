'use strict';

beforeAll(() => {
    // to prevent logs during specs execution
    spyOn(console, 'log').and.callFake(() => {});
    spyOn(console, 'error').and.callFake(() => {});
    spyOn(console, 'warn').and.callFake(() => {});
});
