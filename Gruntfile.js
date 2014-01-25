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
            options: {
                reporter: 'spec'
            },
            all: ['tests/*.js']
        },


    });

    require('load-grunt-tasks')(grunt, {scope: 'devDependencies'});
    require('time-grunt')(grunt);

    grunt.registerTask('test', ['jshint', 'mochacov']);
    grunt.registerTask('default', ['jshint']);

};
