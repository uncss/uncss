'use strict';

module.exports = function (grunt) {
    require('load-grunt-tasks')(grunt, { scope: 'devDependencies' });
    require('time-grunt')(grunt);

    grunt.initConfig({

        eslint: {
            options: {
                config: '.eslintrc'
            },
            gruntfile: {
                src: 'Gruntfile.js'
            },
            src: {
                src: ['src/*.js', 'bin/uncss']
            },
            tests: {
                src: 'tests/*.js'
            }
        },

        mochacov: {
            options: {
                files: ['tests/*.js', '!tests/resemble.js', 'tests/resemble.js'],
                slow: 7500,
                timeout: 25000
            },
            unit: {
                options: {
                    reporter: 'spec'
                }
            },
            coverage: {
                options: {
                    reporter: 'html-cov'
                }
            },
            coveralls: {
                options: {
                    coveralls: {
                        serviceName: 'travis-ci'
                    }
                }
            }
        }
    });

    grunt.registerTask('lint', 'eslint');
    grunt.registerTask('test', ['lint', 'mochacov:unit']);
    grunt.registerTask('travis', ['test', 'mochacov:coveralls']);
    grunt.registerTask('default', 'test');
};
