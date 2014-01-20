/* jshint expr: true */
'use strict';

var expect    = require('chai').expect,
    uncss     = require('./../lib/uncss.js');

describe('Error reporting', function () {

    it('no callback', function () {
        var throw_test = function () { uncss('<html></html>', { stylesheets: ['nonexistant'] }); };
        expect(throw_test).to.throw(TypeError);
    });

    it('invalid options.stylesheets', function (done) {
        uncss('<html></html>', { stylesheets: ['nonexistant'] }, function (error, output) {
            expect(output).to.not.exist;
            expect(error).to.exist;
            done();
        });
    });

    it('invalid options.stylesheets with url', function (done) {
        uncss('<html></html>', { stylesheets: ['http://invalid'] }, function (error, output) {
            expect(output).to.not.exist;
            expect(error).to.exist;
            done();
        });
    });

    it('invalid options.raw', function (done) {
        uncss('<html></html>', { raw: ['.test { margin: 0 }'] }, function (error, output) {
            expect(output).to.not.exist;
            expect(error).to.exist;
            done();
        });
    });

    it('no stylesheet found should output an error', function (done) {
        uncss('<html><body></body></html>', function (error, output) {
            expect(output).to.not.exist;
            expect(error).to.exist;
            done();
        });
    });

    it('outputs PhantomJS errors', function (done) {
        uncss(['phantom_error.html'], function (error, output) {
            expect(output).to.not.exist;
            expect(error).to.exist;
            done();
        });
    });
});
