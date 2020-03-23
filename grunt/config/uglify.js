'use strict';

(function(module) {
    module.exports = function(grunt) {
        return {
            options: {
                // dead_code: true,
                // beautify: true,
                preserveComments: false,
                compress: {
                    'global_defs': {
                        'TESTING': false,
                        'DEBUG': grunt.option('keep-log') || false
                    }
                }
            }
        };
    };
})(module);
