'use strict';

module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({

        jshint: {
            all: ['{lib,tests,.}/*.js', 'bin/uncss'],
            options: {
                jshintrc: '.jshintrc'
            }
        },

        mochacov: {
            unit: {
                options: {
                    reporter: 'spec',
                    slow: 7500,
                    timeout: 5000
                }
            },
            coveralls: {
                options: {
                    coveralls: {
                        serviceName: 'travis-ci'
                    }
                }
            },
            options: {
                files: 'tests/*.js'
            }
        }
    });

    require('load-grunt-tasks')(grunt, { scope: 'devDependencies' });
    require('time-grunt')(grunt);

    grunt.registerTask('test', ['jshint', 'mochacov:unit']);
    grunt.registerTask('travis', ['jshint', 'mochacov:coveralls']);
    grunt.registerTask('default', 'test');

};
