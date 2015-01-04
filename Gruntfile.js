'use strict';

module.exports = function (grunt) {
    require('load-grunt-tasks')(grunt, {scope: 'devDependencies'});
    require('time-grunt')(grunt);

    grunt.initConfig({

        jshint: {
            options: {
                jshintrc: '.jshintrc'
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

        eslint: {
            options: {
                config: '.eslintrc'
            },
            gruntfile: {
                src: '<%= jshint.gruntfile.src %>'
            },
            src: {
                src: '<%= jshint.src.src %>'
            },
            tests: {
                src: '<%= jshint.tests.src %>'
            }
        },

        mochacov: {
            options: {
                files: ['tests/*.js', '!tests/resemble.js', 'tests/resemble.js'],
                slow: 7500,
                timeout: 20000
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

    grunt.registerTask('lint', ['jshint', 'eslint']);
    grunt.registerTask('test', ['lint', 'mochacov:unit']);
    grunt.registerTask('travis', ['test', 'mochacov:coveralls']);
    grunt.registerTask('default', 'test');
};
