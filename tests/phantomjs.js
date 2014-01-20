/* jshint expr: true */
'use strict';

var expect    = require('chai').expect,
    fs        = require('fs'),
    path      = require('path'),
    uncss     = require('./../lib/uncss.js'),
    inspect = require('util').inspect;

/* Read file sync sugar. */
var rfs = function (file) {
    return fs.readFileSync(path.join(__dirname, file), 'utf-8').toString();
};

describe('PhantomJS', function () {

    it('Should process CSS', function (done) {
        uncss(['tests/phantomjs/basic.html'], function (err, output) {
            expect(output).to.include('.evaluated');
            done();
        });
    });

    it('Should exit only when JS evaluation has finished', function (done) {
        this.timeout(20000);
        uncss(['tests/phantomjs/long_wait.html'], function (err, output) {
            expect(output).to.include('.long-wait');
            done();
        });
    });

    it('Should not wait for timeouts by default', function (done) {
        uncss(['tests/phantomjs/timeout.html'], function (err, output) {
            expect(output).to.not.include('.timeout');
            done();
        });
    });

    it('Should respect options.timeout', function (done) {
        this.timeout(10000);
        uncss(['tests/phantomjs/timeout.html'], { timeout : 5000 }, function (err, output) {
            expect(output).to.include('.timeout');
            done();
        });
    });
});
