'use strict';

const fs = require('fs'),
    path = require('path'),
    expect = require('chai').expect,
    uncss = require('./../src/uncss.js');

/* Read file sync sugar. */
function rfs(file) {
    return fs.readFileSync(path.join(__dirname, file), 'utf-8').replace(/\r\n/g, '\n');
}

const stylesheets = ['coverage/override.css', 'coverage/ignore.css', 'coverage/ignore_comment.css'],
    rawcss = rfs('coverage/raw.css'),
    options = {
        csspath: 'tests',
        ignore: ['.unused_test', /^#test/],
        stylesheets,
        raw: rawcss,
    };

describe('Options', () => {
    let output;

    before(() => uncss(rfs('selectors/index.html'), options).then(({ css }) => (output = css)));

    it('options.banner is enabled by default', () => {
        expect(output).to.include('*** uncss>');
    });

    it('options.banner should be able to disable banner', async () => {
        const { css } = await uncss(rfs('selectors/index.html'), {
            csspath: 'tests/selectors',
            banner: false,
        });

        expect(css).to.not.include('*** uncss>');
    });

    it('options.stylesheets should override <link> tags', () => {
        expect(output).to.include(rfs(stylesheets[0]));
    });

    it('options.ignoreSheets should be respected', async () => {
        const { css } = await uncss(rfs('selectors/index.html'), {
            ignoreSheets: ['https://fonts.googleapis.com/css?family=Open+Sans:400', /font-awesome/],
            csspath: 'tests/selectors',
        });

        expect(css).to.not.include('Open Sans');
    });

    it('options.raw should be added to the processed CSS', () => {
        expect(output).to.include(rawcss);
    });

    it('options.ignore should be added to the output and accept a regex', () => {
        expect(output).to.include(rfs(stylesheets[1]));
    });

    it('inline ignore comments should be respected', () => {
        expect(output).to.include(rfs(stylesheets[2]));
    });

    it('options.htmlroot should be respected', async () => {
        const { css } = await uncss(rfs('coverage/htmlroot.html'), {
            htmlroot: 'tests/coverage',
        });

        expect(css).to.include(rfs('coverage/override.css'));
    });

    it('options.htmlroot with local files', async () => {
        const { css } = await uncss(['tests/coverage/htmlroot.html'], {
            htmlroot: 'tests/coverage',
        });
        expect(css).to.include(rfs('coverage/override.css'));
    });

    it('options.media should default to screen, all', async () => {
        const { css } = await uncss(rfs('coverage/media.html'), {
            csspath: 'tests/selectors',
        });

        expect(css).to.include(rfs('selectors/expected/adjacent.css'));
        expect(css).to.include(rfs('selectors/expected/child.css'));
        expect(css).to.include(rfs('selectors/expected/complex.css'));
        expect(css).to.not.include(rfs('selectors/expected/classes.css'));
    });

    it('options.media should be configurable', async () => {
        const { css } = await uncss(rfs('coverage/media.html'), {
            csspath: 'tests/selectors',
            media: 'print',
        });

        expect(css).to.include(rfs('selectors/expected/adjacent.css'));
        expect(css).to.include(rfs('selectors/expected/child.css'));
        expect(css).to.include(rfs('selectors/expected/complex.css'));
        expect(css).to.include(rfs('selectors/expected/classes.css'));
    });

    it('options.report should generate report object', async () => {
        const { css, report } = await uncss(rfs('selectors/index.html'), {
            csspath: 'tests/selectors',
            report: true,
        });
        expect(report).to.have.ownProperty('original');
        expect(report.original).to.have.length.least(css.length);

        expect(report.selectors.all).to.be.instanceof(Array);
        expect(report.selectors.used).to.be.instanceof(Array);
    });

    it('options.uncssrc should be read', async () => {
        const { css } = await uncss(rfs('selectors/index.html'), {
            uncssrc: 'tests/coverage/.uncssrc',
        });

        expect(css).to.equal(output);
    });

    it('options.uncssrc with options.report should generate a valid report', async () => {
        const { css, report } = await uncss(rfs('selectors/index.html'), {
            uncssrc: 'tests/coverage/.uncssrc',
            report: true,
        });

        expect(css).to.equal(output);

        expect(report).to.have.ownProperty('original');

        expect(report.selectors.all).to.be.instanceof(Array);
        expect(report.selectors.all.length).to.not.equal(0);
        expect(report.selectors.used).to.be.instanceof(Array);
        expect(report.selectors.used.length).to.not.equal(0);
        expect(report.selectors.unused).to.be.instanceof(Array);
    });
});
