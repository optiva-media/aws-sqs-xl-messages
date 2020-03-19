/* eslint no-invalid-this: 0 */

'use strict';

module.exports = function(grunt) {
    grunt.registerTask('swagger:codegen', 'Autogenerate files from a swagger YAML file', function() {
        var exec = require('child_process').exec,
            done = this.async(),
            cmd =
                [
                    'java -jar swagger-codegen-cli.jar generate -l nodejs-server -o output -i ./swagger/mediaflow_api.yaml'
                ].join(' && ');

        exec(cmd, function(error/* , stdout*/) {
            grunt.log.writeln((error) ? 'Error! Do swagger-codegen-cli.jar and ./swagger/mediaflow_api.yaml exist?' +
                ' (run grunt swagger:download if swagger-codegen-cli.jar doesn\'t exist)' : 'Controllers generated successfully!');
            done(!error);
        });
    });

    grunt.registerTask('swagger:download', 'Get swagger-codegen-cli.jar from the internet', function() {
        var VERSION = '2.2.3',
            exec = require('child_process').exec,
            done = this.async(),
            cmd =
                [
                    'wget https://oss.sonatype.org/content/repositories/releases/io/swagger/swagger-codegen-cli/' + VERSION +
                        '/swagger-codegen-cli-' + VERSION + '.jar -O swagger-codegen-cli.jar'
                ].join(' && ');

        exec(cmd, function(error/* , stdout*/) {
            grunt.log.writeln((error) ? 'Error! I can\'t download swagger-codegen-cli-' + VERSION + '.jar' :
                'swagger-codegen-cli.jar downloaded! (using swagger-codegen ' + VERSION + ')');
            done(!error);
        });
    });

    grunt.registerTask('swagger:builddoc', 'Build documentation from a swagger YAML file', function() {
        var exec = require('child_process').exec,
            done = this.async(),
            cmd =
                [
                    'java -jar swagger-codegen-cli.jar generate -i swagger/mediaflow_api.yaml -l html2 -o docs/swagger/'
                ].join(' && ');

        exec(cmd, function(error/* , stdout*/) {
            grunt.log.writeln((error) ? 'Error! Do swagger-codegen-cli.jar and ./swagger/mediaflow_api.yaml exist?' +
                ' (run grunt swagger:download if swagger-codegen-cli.jar doesn\'t exist)' : 'Documentation generated successfully!');
            done(!error);
        });
    });

    grunt.registerTask('swagger:ensemble', 'Ensemble swagger development files into a single one', function() {
        process.chdir('./swagger/');

        const fs = require('fs'),
            resolve = require('json-refs').resolveRefs,
            YAML = require('js-yaml'),

            done = this.async(),
            root = YAML.safeLoad(fs.readFileSync('./index.yaml').toString()),

            options = {
                filter: ['relative', 'remote'],
                loaderOptions: {
                    processContent: function(res, callback) {
                        callback(null, YAML.safeLoad(res.text));
                    }
                }
            };

        resolve(root, options)
            .then((results) => {
                if (!fs.existsSync('./dist/')) {
                    fs.mkdirSync('./dist/');
                }
                fs.writeFileSync('./dist/api_def.yaml', YAML.safeDump(results.resolved));
            })
            .then(() => {
                done(true);
            })
            .catch(() => {
                done(false);
            });
    });
};
