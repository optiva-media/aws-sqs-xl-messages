/* eslint no-invalid-this: 0 */

'use strict';

module.exports = function(grunt) {
    grunt.registerTask('setup:hooks', 'Prepares the GIT hooks', function() {
        var exec = require('child_process').exec,
            done = this.async();

        grunt.task.run(['symlink:hooks']);

        exec('chmod 777 scripts/git-hooks/*', function(error) {
            grunt.log.writeln(error ? 'Error preparing GIT hooks.' : 'GIT hooks installed successfully.');
            done(!error);
        });
    });

    grunt.registerTask('setup:git-alias', 'Set up our custom git aliases', function() {
        var exec = require('child_process').exec,
            done = this.async();

        exec('`pwd`/scripts/git-alias/setup_alias', function(error /* , stdout*/) {
            grunt.log.writeln(
                error ? 'Error! one or more aliases haven\'t been imported to .git/config.' : 'Git alias imported successfully!'
            );
            done(!error);
        });
    });

    grunt.registerTask('setup:alias-autocomplete', 'Enable params autocomplete for our git alias', function() {
        var exec = require('child_process').exec,
            done = this.async(),
            cmd = [
                '! grep -xq "source ~/.git-alias-autocomplete.sh" ~/.bash_profile',
                'echo "source ~/.git-alias-autocomplete.sh" >> ~/.bash_profile'
            ].join(' && ');

        exec(cmd, function(error /* , stdout*/) {
            grunt.log.writeln(error ? 'Error setting up git-alias autocompletation.' : 'Git alias autocompletation set up successfully!');
            done(true);
        });
    });

    grunt.registerTask('setup:scripts', 'Change scripts permissions', function() {
        var exec = require('child_process').exec,
            done = this.async(),
            cmd = ['chmod 755 `pwd`/scripts/git-alias/setup_alias'].join(' && ');

        exec(cmd, function(error /* , stdout*/) {
            grunt.log.writeln(error ? 'Error changing scripts permissions.' : 'Scripts permissions changed correctly.');
            done(!error);
        });
    });
};
