/* eslint no-invalid-this: 0 */

'use strict';

(function(module) {
    module.exports = function(grunt) {
        require('time-grunt')(grunt);
        require('load-grunt-config')(grunt, {
            configPath: require('path').join(process.cwd(), 'grunt/config'),
            init: true,
            data: { // data passed into config.  Can use with <%= test %>
                pkg: grunt.file.readJSON('package.json'),
                meta: {
                    dirs: {
                        SRC: 'app/',
                        DIST: 'dist/',
                        TESTS: 'spec/',
                        REPORTS: 'reports/'
                    },
                    files: {
                        SRC_JS: ['<%= meta.dirs.SRC %>**/*.js'],
                        ALL_JS: ['<%= meta.dirs.SRC %>**/*.js', '<%= meta.files.SPECS %=>**/*.js',
                            'mocks/**/*.js', 'Gruntfile.js', 'grunt/**/*.js'],
                        SPECS: '<%= meta.dirs.TESTS %>**/*spec.js',
                        COVERAGE: [
                            '<%= meta.files.SRC_JS %>'
                        ]
                    }
                }
            }
        });

        // Custom tasks
        grunt.loadTasks('grunt/tasks');

        grunt.registerTask('lint', 'Launch linting tools', function(_target) {
            var target = '';
            if (_target) {
                target = ':' + _target;
            }
            grunt.task.run(['eslint' + target]);
        });

        grunt.event.on('watch', function(action, filepath) {
            grunt.config.set('watchedFile', filepath);
        });

        grunt.registerTask('wait', 'Task to wait for something', function(time) {
            var done = this.async();
            setTimeout(done, time);
        });
    };
})(module);
