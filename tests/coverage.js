/* jshint node: true */
/* global describe, it, before, beforeEach, after, afterEach */
'use strict';

var expect    = require('chai').expect,
    fs        = require('fs'),
    path      = require('path'),
    uncss     = require('./../lib/uncss.js');

/* Read file sync sugar. */
var rfs = function (file) {
    return fs.readFileSync(path.join(__dirname, file), 'utf-8').toString();
};

var output = false,
    stylesheets = ['coverage/override.css'],
    options = {
        csspath:'tests',
        stylesheets: stylesheets
    };

describe('Selectors', function () {
    /* Wait until uncss finished doing its thing before running our tests */
    var check = function (done) {
        if (output) {
            done();
        } else {
            setTimeout(function () {
                check(done);
            }, 500);
        }
    };

    before(function (done) {
        uncss(rfs('index.html'), options, function (res) {
            output = res;
        });
        check(done);
    });

    it('should output something', function () {
        expect(output).not.to.equal(false);
    });

    it('should not be an empty string', function () {
        expect(output).to.have.length.above(0);
    });

    it('options.stylesheets should override <link> tags', function () {
        expect(output).to.equal(rfs(stylesheets[0]));
    });
});
