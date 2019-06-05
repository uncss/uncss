'use strict';

const expect = require('chai').expect,
    fs = require('fs'),
    path = require('path'),
    postcss = require('postcss'),
    uncss = require('./../src/uncss.js');

const spreadsheetPath = './tests/glob/main.css';

describe('PostCSS Plugin', () => {
    let prevRun;

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

    it('Simple end-to-end test', () => {
        let opts = {};
        opts.html = ['./tests/glob/one.html'];

        return postcss([uncss.postcssPlugin(opts)]).process(prevRun, { from: undefined })
            .then((result) => {
                expect(result.warnings().length).to.equal(0);
                expect(result.css).to.not.equal(undefined);
                expect(result.css).to.contain('h1');
                expect(result.css).not.to.contain('h2');
                expect(result.css).not.to.contain('h3');
                expect(result.css).not.to.contain('h4');
                expect(result.css).not.to.contain('h5');
                expect(result.css).not.to.contain('h6');
            });
    });

    it('Respects the ignores param', () => {
        let opts = {
            ignore: ['h4']
        };
        opts.html = ['./tests/glob/one.html'];

        return postcss([uncss.postcssPlugin(opts)]).process(prevRun, { from: undefined })
            .then((result) => {
                expect(result.warnings().length).to.equal(0);
                expect(result.css).to.not.equal(undefined);
                expect(result.css).to.contain('h1');
                expect(result.css).not.to.contain('h2');
                expect(result.css).not.to.contain('h3');
                expect(result.css).to.contain('h4');
                expect(result.css).not.to.contain('h5');
                expect(result.css).not.to.contain('h6');
            });
    });

    it('Should pass options to jsdom', () => {
        return postcss(
            [
                uncss.postcssPlugin({
                    html: [path.join(__dirname, 'jsdom/root_relative_script.html')],
                    htmlroot: path.join(__dirname, 'jsdom')
                })
            ])
            .process(fs.readFileSync(path.join(__dirname, 'jsdom/jsdom.css')), { from: undefined })
            .then((result) => {
                expect(result.warnings().length).to.equal(0);
                expect(result.css).to.not.equal(undefined);
                expect(result.css).to.contain('evaluated');
            });
    });
});
