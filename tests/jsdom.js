'use strict';

const expect = require('chai').expect,
    path = require('path'),
    uncss = require('./../src/uncss.js');

describe('jsdom', () => {

    it('Should process CSS', (done) => {
        uncss(['tests/jsdom/basic.html'], (err, output) => {
            expect(err).to.equal(null);
            expect(output).to.include('.evaluated');
            done();
        });
    });

    it('Should exit only when JS evaluation has finished', function (done) {
        this.timeout(100000);
        uncss(['tests/jsdom/long_wait.html'], (err, output) => {
            expect(err).to.equal(null);
            expect(output).to.include('.long-wait');
            done();
        });
    });

    it('Should not wait for timeouts by default', (done) => {
        uncss(['tests/jsdom/timeout.html'], (err, output) => {
            expect(err).to.equal(null);
            expect(output).to.not.include('.timeout');
            done();
        });
    });

    it('Should respect options.timeout', (done) => {
        uncss(['tests/jsdom/timeout.html'], {
            timeout: 5000
        }, (err, output) => {
            expect(err).to.equal(null);
            expect(output).to.include('.timeout');
            done();
        });
    });

    it('Should use htmlroot to load root-relative scripts', (done) => {
        const options = { htmlroot: path.join(__dirname, './jsdom') };
        uncss(['tests/jsdom/root_relative_script.html'], options, (err, output) => {
            expect(err).to.equal(null);
            expect(output).to.include('.evaluated');
            done();
        });
    });

    it('Should use htmlroot to load root-relative scripts the same way if htmlroot ends with a slash', (done) => {
        const options = { htmlroot: path.join(__dirname, './jsdom/') };
        uncss(['tests/jsdom/root_relative_script.html'], options, (err, output) => {
            expect(err).to.equal(null);
            expect(output).to.include('.evaluated');
            done();
        });
    });

    it('Should not use htmlroot when loading non-root-relative scripts', (done) => {
        const options = { htmlroot: path.join(__dirname, './jsdom') };
        uncss(['tests/jsdom/non_root_relative_script.html'], options, (err, output) => {
            expect(err).to.equal(null);
            expect(output).to.include('.evaluated');
            done();
        });
    });

    it('Should not use htmlroot when loading non-root-relative scripts in a subfolder', (done) => {
        const options = { htmlroot: path.join(__dirname, './jsdom') };
        uncss(['tests/jsdom/sub/non_root_relative_script.html'], options, (err, output) => {
            expect(err).to.equal(null);
            expect(output).to.include('.evaluated');
            done();
        });
    });

    it('Should set the useragent to the value given in options', (done) => {
        const testUserAgent = 'foo';
        const options = {
            htmlroot: path.join(__dirname, './jsdom'),
            userAgent: testUserAgent
        };
        uncss(['tests/jsdom/useragent.html'], options, (err, output) => {
            expect(err).to.equal(null);
            expect(output).to.include('useragentset');
            expect(output).to.not.include('useragentunset');
            expect(output).to.not.include('error');
            done();
        });
    });
    it('Should default the useragent to uncss', (done) => {
        const options = {
            htmlroot: path.join(__dirname, './jsdom')
        };
        uncss(['tests/jsdom/useragent.html'], options, (err, output) => {
            expect(err).to.equal(null);
            expect(output).to.include('useragentunset');
            expect(output).to.not.include('useragentset');
            expect(output).to.not.include('error');
            done();
        });
    });
});
