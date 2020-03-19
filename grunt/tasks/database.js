/* eslint no-invalid-this: 0 */

'use strict';

module.exports = function(grunt) {
    grunt.registerTask('resetdb', 'This task drops current schema and it creates it again',
                       function() {
                           var exec = require('child_process').exec,
                               done = this.async();

                           exec('mysql -u root -p < scripts/reset_database.sql',
                                function(error) {
                                    if (error) {
                                        grunt.log.error('\'scripts/reset_database.sql\' wasn\'t found or it contains errors');
                                        done(false);
                                    } else {
                                        grunt.log.writeln('Database schema recreated successfully!');
                                        done(true);
                                    }
                                });
                       });

    grunt.registerTask('resetdb:ci', 'This task drops current schema and it creates it again',
                       function() {
                           var exec = require('child_process').exec,
                               done = this.async();

                           exec('mysql -u jenkins < scripts/reset_database.sql',
                                function(error) {
                                    if (error) {
                                        grunt.log.error('\'scripts/reset_database.sql\' wasn\'t found or it contains errors');
                                        done(false);
                                    } else {
                                        grunt.log.writeln('Database schema recreated successfully!');
                                        done(true);
                                    }
                                });
                       });

    grunt.registerTask('resetdb:cin', 'This task drops current schema and it creates it again',
                       function() {
                           var exec = require('child_process').exec,
                               done = this.async();

                           exec('mysql -u root -proot -h mf-test-db < scripts/reset_database.sql',
                                function(error) {
                                    if (error) {
                                        grunt.log.error('\'scripts/reset_database.sql\' wasn\'t found or it contains errors');
                                        done(false);
                                    } else {
                                        grunt.log.writeln('Database schema recreated successfully!');
                                        done(true);
                                    }
                                });
                       });

    grunt.registerTask('setsqlmode', 'This task change global and session sql_mode',
                       function() {
                           var exec = require('child_process').exec,
                               done = this.async();

                           exec('mysql -u root -p < scripts/set_sql_mode.sql',
                                function(error) {
                                    if (error) {
                                        grunt.log.error('\'scripts/set_sql_mode.sql\' wasn\'t found or it contains errors');
                                        done(false);
                                    } else {
                                        grunt.log.writeln('Change successfully!');
                                        done(true);
                                    }
                                });
                       });

    grunt.registerTask('setsqlmode:ci', 'This task change global and session sql_mode',
                       function() {
                           var exec = require('child_process').exec,
                               done = this.async();

                           exec('mysql -u jenkins < scripts/set_sql_mode.sql',
                                function(error) {
                                    if (error) {
                                        grunt.log.error('\'scripts/set_sql_mode.sql\' wasn\'t found or it contains errors');
                                        done(false);
                                    } else {
                                        grunt.log.writeln('Change successfully!');
                                        done(true);
                                    }
                                });
                       });
};
