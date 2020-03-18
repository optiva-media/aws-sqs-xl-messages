'use strict';

(function(module) {
    const promisify = require('util.promisify'),
        SEQUELIZE_EXECUTABLE = 'node_modules/.bin/sequelize',
        exec = promisify(require('child_process').exec);

    class Utils {
        static createDB() {
            if ( !process.env.CONFIG_FILE) {
                console.error('Utils::createDB: Missing CONFIG_FILE in environment variables');
                return Promise.reject('Utils::createDB: Missing CONFIG_FILE in environment variables');
            } else {
                const config = require(process.env.CONFIG_FILE);
                if (!config || (!config.production && !config.development)) {
                    return Promise.reject('Utils::createDB: Error loading config file = ' + process.env.CONFIG_FILE);
                } else {
                    const prodConfig = config.production || config.development;
                    return exec(`mysql -h ${prodConfig.host} -u ${prodConfig.username} --password=${prodConfig.password} --port ${prodConfig.port} `+
                        `-e "CREATE DATABASE ${prodConfig.database} DEFAULT CHARACTER SET utf8 DEFAULT COLLATE utf8_bin"`)
                        .then((output) => {
                            console.log(`Utils::createDB: ${output}`);
                        }).catch((err) => {
                            if (err.toString().includes('ER_DB_CREATE_EXISTS')) {
                                return Promise.resolve();
                            } else {
                                console.error('Utils::createDB: Error creating DB. Error = ' + err.toString());
                                throw err;
                            }
                        });
                }
            }
        }

        static deleteDB() {
            if ( !process.env.CONFIG_FILE) {
                console.error('Utils::deleteDB: Missing CONFIG_FILE in environment variables');
                return Promise.reject('Utils::deleteDB: Missing CONFIG_FILE in environment variables');
            } else {
                return exec(`${SEQUELIZE_EXECUTABLE} db:drop --config ${process.env.CONFIG_FILE}`)
                    .then((output) => {
                        console.log(`Utils::deleteDB: ${output}`);
                    }).catch((err) => {
                        if (err.toString().includes('ER_DB_DROP_EXISTS')) {
                            return Promise.resolve();
                        } else {
                            console.error('Utils::deleteDB: Error deleting DB. Error = ' + err.toString());
                            throw err;
                        }
                    });
            }
        }

        static migrateDB() {
            if ( !process.env.CONFIG_FILE) {
                console.error('Utils::migrateDB: Missing CONFIG_FILE in environment variables');
                return Promise.reject('Utils::migrateDB: Missing CONFIG_FILE in environment variables');
            } else {
                return exec(`${SEQUELIZE_EXECUTABLE} db:migrate --migrations-path ./node_modules/mediaflow-utils/src/migrations/ --config ${process.env.CONFIG_FILE}`)
                    .then((output) => {
                        console.log(`Utils::migrateDB: ${output}`);
                    }).catch((err) => {
                        console.error('Utils::migrateDB: Error migrating DB. Error = ' + err.toString());
                        throw err;
                    });
            }
        }

        static applySeedersInDB() {
            if ( !process.env.CONFIG_FILE) {
                console.error('Utils::applySeedersInDB: Missing CONFIG_FILE in environment variables');
                return Promise.reject('Utils::applySeedersInDB: Missing CONFIG_FILE in environment variables');
            } else {
                return exec(`${SEQUELIZE_EXECUTABLE} db:seed:all --seeders-path=./node_modules/mediaflow-utils/src/seeders/ --config ${process.env.CONFIG_FILE}`)
                    .then((output) => {
                        console.log(`Utils::applySeedersInDB: ${output}`);
                    }).catch((err) => {
                        console.error('Utils::applySeedersInDB: Error applying seeders in DB. Error = ' + err.toString());
                        throw err;
                    });
            }
        }

        /**
         * Drops the Mediaflow DB, creates the DB, applies the migrations and the seeders
         */
        static recreateDB() {
            return Utils.deleteDB().then(() => {
                return Utils.createDB();
            }).then(() => {
                return Utils.migrateDB();
            }).then(() => {
                return Utils.applySeedersInDB();
            }).catch((err) => {
                console.error('Utils::recreateDB: Error recreating DB. Error = ' + err.toString());
                throw err;
            });
        }
    }

    module.exports = Utils;
}(module));
