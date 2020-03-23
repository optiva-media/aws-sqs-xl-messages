'use strict';

(function(module) {
    module.exports = {
        'default': ['lint:all', 'test:all'],
        'precommit': ['gitchanged', 'lint:changed'],
        'setup': ['symlink', 'setup:hooks', 'setup:scripts', 'setup:git-alias', 'setup:alias-autocomplete']
    };
})(module);
