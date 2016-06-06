'use strict';

var expect = require('chai').expect,
    fs = require('fs'),
    postcss = require('postcss'),
    uncss = require('./../src/uncss.js');

var spreadsheetPath = './tests/glob/main.css',
    prevRun;

describe('PostCSS Plugin', function () {
    /* Used to check that all the requests to gh-pages generate the same CSS.
     * Expected to fail if the gh-page is updated.
     */
    before(function (done) {
        fs.readFile(spreadsheetPath, 'utf-8', function (err, stylesheet) {
            if (err) {
                throw err;
            }
            prevRun = stylesheet;
            done();
        });
    });

    it('Simple end-to-end test', function (done) {
        var opts = {};
        opts['html'] = ['./tests/glob/one.html'];
        postcss([ uncss.postcssPlugin(opts) ]).process(prevRun)
            .then(function(result) {
                expect(result.warnings().length).to.equal(0);
                expect(result.css).to.not.equal(undefined);
                expect(result.css).to.contain('h1');
                expect(result.css).not.to.contain('h2');
                expect(result.css).not.to.contain('h3');
                expect(result.css).not.to.contain('h4');
                expect(result.css).not.to.contain('h5');
                expect(result.css).not.to.contain('h6');
                done();
            }, function(error) {
                done(error);
            });
    });

    it('Respects the ignores param', function (done) {
        var opts = {
            ignore: ['h4']
        };
        opts['html'] = ['./tests/glob/one.html'];
        postcss([ uncss.postcssPlugin(opts) ]).process(prevRun)
            .then(function(result) {
                expect(result.warnings().length).to.equal(0);
                expect(result.css).to.not.equal(undefined);
                expect(result.css).to.contain('h1');
                expect(result.css).not.to.contain('h2');
                expect(result.css).not.to.contain('h3');
                expect(result.css).to.contain('h4');
                expect(result.css).not.to.contain('h5');
                expect(result.css).not.to.contain('h6');
                done();
            }, function(error) {
                done(error);
            });
    });
});
