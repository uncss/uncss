'use strict';

var expect    = require('chai').expect,
    fs        = require('fs'),
    path      = require('path'),
    uncss     = require('./../lib/uncss.js');

/* node-phantom-simple seems to leak */
process.setMaxListeners(0);

/* Read file sync sugar. */
var rfs = function (file) {
    return fs.readFileSync(path.join(__dirname, file), 'utf-8').replace(/\r\n/g, '\n');
};

var stylesheets = ['coverage/override.css', 'coverage/ignore.css'],
    rawcss = rfs('coverage/raw.css'),
    options = {
        csspath: 'tests',
        ignore: ['.unused_test', /^#test/],
        stylesheets: stylesheets,
        raw: rawcss,
        report: true
    };

describe('Options', function () {

    var output, report;

    before(function (done) {
        uncss(rfs('selectors/index.html'), options, function (err, res, rep) {
            if (err) {
                throw err;
            }
            output = res;
            report = rep;
            done();
        });
    });

    it('options.stylesheets should override <link> tags', function () {
        expect(output).to.include(rfs(stylesheets[0]));
    });

    it('options.ignoreSheets should be respected', function (done) {
        uncss(
            rfs('selectors/index.html'),
            {
                ignoreSheets: [
                    '//fonts.googleapis.com/css?family=Open+Sans:400',
                    /font\-awesome/
                ],
                csspath: 'tests/selectors'
            },
            function (err, output) {
                expect(err).to.be.null;
                expect(output).to.not.include('@font-face');
                done();
            }
        );
    });

    it('options.raw should be added to the processed CSS', function () {
        expect(output).to.include(rawcss);
    });

    it('options.ignore should be added to the output and accept a regex', function () {
        expect(output).to.include(rfs(stylesheets[1]));
    });

    it('options.htmlroot should be respected', function (done) {
        uncss(rfs('coverage/htmlroot.html'), { htmlroot: 'tests/coverage' }, function (err, output) {
            expect(err).to.be.null;
            expect(output).to.include(rfs('coverage/override.css'));
            done();
        });
    });

    it('options.urls should be processed', function (done) {
        this.timeout(25000);
        uncss([], { urls: ['http://giakki.github.io/uncss/'] }, function (err, output) {
            expect(err).to.be.null;
            expect(output).to.exist;
            done();
        });
    });

    it('options.report should generate report object', function () {
        expect(report.original).to.be.greaterThan(report.tidy);
    });
});
