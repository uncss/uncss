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
    before(done => {
        fs.readFile(spreadsheetPath, 'utf-8', (err, stylesheet) => {
            if (err) {
                throw err;
            }
            prevRun = stylesheet;
            done();
        });
    });

    it('Simple end-to-end test', async () => {
        const opts = {};
        opts.html = ['./tests/glob/one.html'];
        const result = await postcss([uncss.postcssPlugin(opts)]).process(prevRun, { from: undefined });

        expect(result.warnings().length).to.equal(0);
        expect(result.css).to.not.equal(undefined);
        expect(result.css).to.contain('h1');
        expect(result.css).not.to.contain('h2');
        expect(result.css).not.to.contain('h3');
        expect(result.css).not.to.contain('h4');
        expect(result.css).not.to.contain('h5');
        expect(result.css).not.to.contain('h6');
    });

    it('Respects the ignores param', async () => {
        const opts = {
            ignore: ['h4'],
        };
        opts.html = ['./tests/glob/one.html'];
        const result = await postcss([uncss.postcssPlugin(opts)]).process(prevRun, { from: undefined });

        expect(result.warnings().length).to.equal(0);
        expect(result.css).to.not.equal(undefined);
        expect(result.css).to.contain('h1');
        expect(result.css).not.to.contain('h2');
        expect(result.css).not.to.contain('h3');
        expect(result.css).to.contain('h4');
        expect(result.css).not.to.contain('h5');
        expect(result.css).not.to.contain('h6');
    });

    it('Should work with http scripts', () => {
        return postcss([
            uncss.postcssPlugin({
                html: [path.join(__dirname, 'jsdom/http_script.html')],
                timeout: 2500,
            }),
        ])
            .process(fs.readFileSync(path.join(__dirname, 'jsdom/jsdom.css')), { from: undefined })
            .then(result => {
                expect(result.warnings().length).to.equal(0);
                expect(result.css).to.not.equal(undefined);
                expect(result.css).to.contain('evaluated');
            });
    });

    it('Should accept options.uncssrc', () => {
        return postcss([
            uncss.postcssPlugin({
                html: [path.join(__dirname, 'selectors/index.html')],
                uncssrc: './tests/coverage/uncssrc',
            }),
        ])
            .process(fs.readFileSync(path.join(__dirname, 'selectors/fixtures/classes.css')), { from: undefined })
            .then(result => {
                expect(result.warnings().length).to.equal(0);
                expect(result.css).to.include(
                    fs.readFileSync(path.join(__dirname, 'selectors/expected/classes.css'), 'utf-8')
                );
            });
    });
});
