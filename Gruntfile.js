'use strict';

module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({

        jshint: {
            options: {
                jshintrc: '.jshintrc'
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
            src: {
                src: '<%= jshint.src.src %>'
            },
            tests: {
                src: '<%= jshint.tests.src %>'
            }
        },

        mochacov: {
            options: {
                files: 'tests/*.js',
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

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-eslint');
    grunt.loadNpmTasks('grunt-mocha-cov');

    require('time-grunt')(grunt);

    grunt.registerTask('lint', ['jshint', 'eslint']);
    grunt.registerTask('test', ['lint','mochacov:unit']);
    grunt.registerTask('travis', ['test', 'mochacov:coveralls']);
    grunt.registerTask('default', 'test');
};
