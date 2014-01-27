'use strict';

module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({

        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            gruntfile: {
                src: 'Gruntfile.js'
            },
            bin: {
                src: ['bin/uncss']
            },
            lib: {
                src: ['lib/**/*.js']
            },
            tests: {
                src: ['tests/*.js']
            },
        },

        mochacov: {
            unit: {
                options: {
                    reporter: 'spec',
                    slow: 5000
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
