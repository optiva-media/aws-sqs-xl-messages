'use strict';

const JasmineConsoleReporter = require('jasmine-console-reporter'),
    reporter = new JasmineConsoleReporter({
        emoji: true,
        beep: true
    });

jasmine.getEnv().clearReporters();
jasmine.getEnv().addReporter(reporter);
