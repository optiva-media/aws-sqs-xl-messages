'use strict';

(function(module) {
    module.exports = function(grunt) {
        var isJS = function(file) {
            return grunt.file.isMatch(grunt.config('meta.files.ALL_JS'), file);
        };

        return {
            options: {
                config: '.eslintrc.json'
            },
            all: {
                files: {
                    src: '{<%= meta.files.ALL_JS %>}'
                }
            },
            changed: {
                files: [{
                    src: '{<%= git.changed.concat([""]) %>}',
                    filter: isJS
                }]
            },
            ci: {
                options: {
                    format: 'checkstyle',
                    outputFile: '<%= meta.dirs.REPORTS %>lint/eslint.xml'
                },
                files: {
                    src: '{<%= meta.files.ALL_JS %>}'
                }
            }
        };
    };
})(module);
