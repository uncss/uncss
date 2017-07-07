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

    it('Should not use htmlroot when loading non-root-relative scripts in a subfolder', function (done) {
        var options = { htmlroot: path.join(__dirname, './jsdom') };
        uncss(['tests/jsdom/sub/non_root_relative_script.html'], options, function (err, output) {
            expect(err).to.equal(null);
            expect(output).to.include('.evaluated');
            done();
        });
    });

    it('Should not choke on canvas elements', function (done) {
        var options = { htmlroot: path.join(__dirname, './jsdom') };
        uncss(['tests/jsdom/canvas.html'], options, function (err) {
            expect(err).to.equal(null);
            done();
        });
    });

    it('Should provide a way to extend jsdom window callback', function (done) {
        var localStorage = {
            data: {},
            getItem: function(key) {
                return localStorage.data[key];
            },
            setItem: function(key, value) {
                localStorage.data[key] = value;
            }
        };
        var options = {
            jsdomCreated: function(e, win) {
                win.localStorage = localStorage;
            },
            htmlroot: path.join(__dirname, './jsdom')
        };
        uncss(['tests/jsdom/local_storage.html'], options, function (err) {
            expect(err).to.equal(null);
            expect(localStorage.getItem('foo')).to.equal('bar');
            done();
        });
    });
});
