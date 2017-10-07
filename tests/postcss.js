'use strict';

const expect = require('chai').expect,
    fs = require('fs'),
    postcss = require('postcss'),
    uncss = require('./../src/uncss.js');

const spreadsheetPath = './tests/glob/main.css';
let prevRun;

describe('PostCSS Plugin', () => {
    /* Used to check that all the requests to gh-pages generate the same CSS.
     * Expected to fail if the gh-page is updated.
     */
    before((done) => {
        fs.readFile(spreadsheetPath, 'utf-8', (err, stylesheet) => {
            if (err) {
                throw err;
            }
            prevRun = stylesheet;
            done();
        });
    });

    it('Simple end-to-end test', (done) => {
        let opts = {};
        opts.html = ['./tests/glob/one.html'];
        postcss([uncss.postcssPlugin(opts)]).process(prevRun)
            .then((result) => {
                expect(result.warnings().length).to.equal(0);
                expect(result.css).to.not.equal(undefined);
                expect(result.css).to.contain('h1');
                expect(result.css).not.to.contain('h2');
                expect(result.css).not.to.contain('h3');
                expect(result.css).not.to.contain('h4');
                expect(result.css).not.to.contain('h5');
                expect(result.css).not.to.contain('h6');
                done();
            }, (error) => {
                done(error);
            });
    });

    it('Respects the ignores param', (done) => {
        let opts = {
            ignore: ['h4']
        };
        opts.html = ['./tests/glob/one.html'];
        postcss([uncss.postcssPlugin(opts)]).process(prevRun)
            .then((result) => {
                expect(result.warnings().length).to.equal(0);
                expect(result.css).to.not.equal(undefined);
                expect(result.css).to.contain('h1');
                expect(result.css).not.to.contain('h2');
                expect(result.css).not.to.contain('h3');
                expect(result.css).to.contain('h4');
                expect(result.css).not.to.contain('h5');
                expect(result.css).not.to.contain('h6');
                done();
            }, (error) => {
                done(error);
            });
    });
});
