'use strict';

(function(module) {
    module.exports = function(/* grunt*/) {
        return {
            options: {
                // Enable overwrite to delete symlinks before recreating them
                overwrite: true,
                // Enable force to overwrite symlinks outside the current working directory
                force: true
            },
            git: {
                src: 'scripts/git-alias/git-alias-autocomplete',
                dest: require('userhome')() + '/.git-alias-autocomplete.sh'
            },
            hooks: {
                expand: true,
                cwd: 'scripts/git-hooks',
                src: '*',
                dest: '.git/hooks'
            }
        };
    };
})(module);
