/* eslint no-invalid-this: 0 */

'use strict';

module.exports = function(grunt) {
    grunt.registerTask('gitchanged', 'get a list of changed local files from Git and set them as a property', function() {
        var done = this.async();
        grunt.util.spawn(
            {
                cmd: 'git',
                args: ['diff', 'HEAD', '--name-only', '--diff-filter=ACM'] // '--cached',
            },
            function(error, result) {
                var changedFiles = grunt.util.normalizelf(result.toString()).split(grunt.util.linefeed);

                grunt.config.set('git.changed', changedFiles);

                grunt.verbose.writeln('changed files: ' + grunt.config.process('<%= git.changed %>'));

                done();
            }
        );
    });
};
