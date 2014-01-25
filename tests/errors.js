'use strict';

var expect    = require('chai').expect,
    uncss     = require('./../lib/uncss.js');

describe('Error reporting', function () {

    it('No callback', function () {
        var throw_test = function () {
            uncss('<html></html>', { stylesheets: ['nonexistant'] });
        };
        expect(throw_test).to.throw(TypeError);
    });

    it('Invalid options.stylesheets', function (done) {
        uncss('<html></html>', { stylesheets: ['nonexistent'] }, function (error, output) {
            expect(output).to.not.exist;
            expect(error).to.exist;
            done();
        });
    });

    it('Invalid options.stylesheets with url', function (done) {
        uncss('<html></html>', { stylesheets: ['http://invalid'] }, function (error, output) {
            expect(output).to.not.exist;
            expect(error).to.exist;
            done();
        });
    });

    it('Invalid options.raw', function (done) {
        uncss('<html></html>', { raw: ['.test { margin: 0 }'] }, function (error, output) {
            expect(output).to.not.exist;
            expect(error).to.exist;
            done();
        });
    });

    it('No stylesheet found should output an error', function (done) {
        uncss('<html><body></body></html>', function (error, output) {
            expect(output).to.not.exist;
            expect(error).to.exist;
            done();
        });
    });

    it('Outputs PhantomJS errors', function (done) {
        uncss(['nonexistent.html'], function (error, output) {
            expect(output).to.not.exist;
            expect(error).to.exist;
            done();
        });
    });

    it('Outputs Cheerio errors', function (done) {
        uncss(['tests/selectors/index.html'], { raw: 'I break Cheerio :(' }, function (error, output) {
            expect(output).to.not.exist;
            expect(error).to.exist;
            done();
        });
    });
});
