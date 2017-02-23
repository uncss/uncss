'use strict';

var expect = require('chai').expect,
    path = require('path'),
    uncss = require('./../src/uncss.js');

describe('jsdom', function () {

    it('Should process CSS', function (done) {
        uncss(['tests/jsdom/basic.html'], function (err, output) {
            expect(err).to.equal(null);
            expect(output).to.include('.evaluated');
            done();
        });
    });

    it('Should exit only when JS evaluation has finished', function (done) {
        this.timeout(100000);
        uncss(['tests/jsdom/long_wait.html'], function (err, output) {
            expect(err).to.equal(null);
            expect(output).to.include('.long-wait');
            done();
        });
    });

    it('Should not wait for timeouts by default', function (done) {
        uncss(['tests/jsdom/timeout.html'], function (err, output) {
            expect(err).to.equal(null);
            expect(output).to.not.include('.timeout');
            done();
        });
    });

    it('Should respect options.timeout', function (done) {
        uncss(['tests/jsdom/timeout.html'], {
            timeout: 5000
        }, function (err, output) {
            expect(err).to.equal(null);
            expect(output).to.include('.timeout');
            done();
        });
    });

    it('Should use htmlroot to load root-relative scripts', function (done) {
        var options = { htmlroot: path.join(__dirname, './jsdom') };
        uncss(['tests/jsdom/root_relative_script.html'], options, function (err, output) {
            expect(err).to.equal(null);
            expect(output).to.include('.evaluated');
            done();
        });
    });

    it('Should use htmlroot to load root-relative scripts the same way if htmlroot ends with a slash', function (done) {
        var options = { htmlroot: path.join(__dirname, './jsdom/') };
        uncss(['tests/jsdom/root_relative_script.html'], options, function (err, output) {
            expect(err).to.equal(null);
            expect(output).to.include('.evaluated');
            done();
        });
    });

    it('Should not use htmlroot when loading non-root-relative scripts', function (done) {
        var options = { htmlroot: path.join(__dirname, './jsdom') };
        uncss(['tests/jsdom/non_root_relative_script.html'], options, function (err, output) {
            expect(err).to.equal(null);
            expect(output).to.include('.evaluated');
            done();
        });
    });
});
