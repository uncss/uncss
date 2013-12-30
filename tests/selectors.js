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

var rawcss = false;
var tests = fs.readdirSync(path.join(__dirname, 'fixtures/'));
var input = '';

/* Only read through CSS files */
tests.forEach(function (test, i) {
    if (test.indexOf('.css') > -1) {
        input += rfs('fixtures/' + test);
    } else {
        tests.splice(i, 1);
    }
});

uncss(rfs('index.html'), { csspath: 'tests' }, function (output) {
    rawcss = output;
});

describe('uncss', function () {
    /* Need a bit more time for PhantomJS */
    this.timeout(5000);
    /* Wait until uncss finished doing its thing before running our tests */
    var check = function (done) {
        if (rawcss) {
            done();
        } else {
            setTimeout(function () {
                check(done);
            }, 500);
        }
    };

    before(function (done) {
        check(done);
    });
    /* We're testing that the CSS is stripped out from the result, not that the result contains
       the CSS in the unused folder. */
    it('should not be an empty string', function () {
        expect(rawcss).not.to.equal(false);
    });

    tests.forEach(function (test) {
        it('should handle ' + test.split('.')[0], function () {
            expect(rawcss).to.not.include.string(rfs('unused/' + test));
        });
    });

});
