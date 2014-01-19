'use strict';

var expect    = require('chai').expect,
    fs        = require('fs'),
    path      = require('path'),
    uncss     = require('./../lib/uncss.js');

/* Read file sync sugar. */
var rfs = function (file) {
    return fs.readFileSync(path.join(__dirname, file), 'utf-8').toString();
};

var stylesheets = ['coverage/override.css'],
    rawcss = rfs('coverage/raw.css'),
    options = {
        csspath: 'tests',
        stylesheets: stylesheets,
        raw: rawcss
    };

describe('UnCSS', function () {

    describe('Basic functionality', function () {
        this.timeout(5000);

        var output = false;

        before(function (done) {
            uncss('<html><body></body></html>', function (res) {
                output = res;
                done();
            });
        });

        it('should output something', function () {
            expect(output).not.to.equal(false);
        });

        it('should be an empty string', function () {
            expect(output).to.equal('');
        });
    });

    describe('Options', function () {
        var output;

        before(function (done) {
            uncss(rfs('index.html'), options, function (res) {
                output = res;
                done();
            });
        });

        it('options.stylesheets should override <link> tags', function () {
            expect(output).to.include(rfs(stylesheets[0]));
        });

        it('options.raw should be added to the processed CSS', function () {
            expect(output).to.include(rawcss);
        });
    });
});
