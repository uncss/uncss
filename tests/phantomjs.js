'use strict';

/* jshint mocha: true */
/* eslint-env mocha */

var expect = require('chai').expect,
    uncss = require('./../src/uncss.js');

describe('PhantomJS', function () {

    it('Should process CSS', function (done) {
        uncss(['tests/phantomjs/basic.html'], function (err, output) {
            expect(err).to.equal(null);
            expect(output).to.include('.evaluated');
            done();
        });
    });

    it('Should exit only when JS evaluation has finished', function (done) {
        this.timeout(25000);
        uncss(['tests/phantomjs/long_wait.html'], function (err, output) {
            expect(err).to.equal(null);
            expect(output).to.include('.long-wait');
            done();
        });
    });

    it('Should not wait for timeouts by default', function (done) {
        uncss(['tests/phantomjs/timeout.html'], function (err, output) {
            expect(err).to.equal(null);
            expect(output).to.not.include('.timeout');
            done();
        });
    });

    it('Should respect options.timeout', function (done) {
        this.timeout(25000);
        uncss(['tests/phantomjs/timeout.html'], { timeout: 5000 }, function (err, output) {
            expect(err).to.equal(null);
            expect(output).to.include('.timeout');
            done();
        });
    });
});
