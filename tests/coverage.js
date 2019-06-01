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

    before(done => {
        uncss(rfs('selectors/index.html'), options, (err, res) => {
            if (err) {
                throw err;
            }
            output = res;
            done();
        });
    });

    it('options.banner is enabled by default', () => {
        expect(output).to.include('*** uncss>');
    });

    it('options.banner should be able to disable banner', done => {
        uncss(
            rfs('selectors/index.html'),
            {
                csspath: 'tests/selectors',
                banner: false,
            },
            (err, res) => {
                if (err) {
                    throw err;
                }
                expect(res).to.not.include('*** uncss>');
                done();
            }
        );
    });

    it('options.stylesheets should override <link> tags', () => {
        expect(output).to.include(rfs(stylesheets[0]));
    });

    it('options.ignoreSheets should be respected', done => {
        uncss(
            rfs('selectors/index.html'),
            {
                ignoreSheets: ['https://fonts.googleapis.com/css?family=Open+Sans:400', /font-awesome/],
                csspath: 'tests/selectors',
            },
            (err, out) => {
                expect(err).to.equal(null);
                expect(out).to.not.include('@font-face');
                done();
            }
        );
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

    it('options.htmlroot should be respected', done => {
        uncss(
            rfs('coverage/htmlroot.html'),
            {
                htmlroot: 'tests/coverage',
            },
            (err, out) => {
                expect(err).to.equal(null);
                expect(out).to.include(rfs('coverage/override.css'));
                done();
            }
        );
    });

    it('options.htmlroot with local files', done => {
        uncss(
            ['tests/coverage/htmlroot.html'],
            {
                htmlroot: 'tests/coverage',
            },
            (err, out) => {
                expect(err).to.equal(null);
                expect(out).to.include(rfs('coverage/override.css'));
                done();
            }
        );
    });

    it('options.media should default to screen, all', done => {
        uncss(
            rfs('coverage/media.html'),
            {
                csspath: 'tests/selectors',
            },
            (err, out) => {
                expect(err).to.equal(null);
                expect(out).to.include(rfs('selectors/expected/adjacent.css'));
                expect(out).to.include(rfs('selectors/expected/child.css'));
                expect(out).to.include(rfs('selectors/expected/complex.css'));
                expect(out).to.not.include(rfs('selectors/expected/classes.css'));
                done();
            }
        );
    });

    it('options.media should be configurable', done => {
        uncss(
            rfs('coverage/media.html'),
            {
                csspath: 'tests/selectors',
                media: 'print',
            },
            (err, out) => {
                expect(err).to.equal(null);
                expect(out).to.include(rfs('selectors/expected/adjacent.css'));
                expect(out).to.include(rfs('selectors/expected/child.css'));
                expect(out).to.include(rfs('selectors/expected/complex.css'));
                expect(out).to.include(rfs('selectors/expected/classes.css'));
                done();
            }
        );
    });

    it('options.report should generate report object', done => {
        uncss(
            rfs('selectors/index.html'),
            {
                csspath: 'tests/selectors',
                report: true,
            },
            (err, res, rep) => {
                expect(err).to.equal(null);

                expect(rep).to.have.ownProperty('original');
                expect(rep.original).to.have.length.least(res.length);

                expect(rep.selectors.all).to.be.instanceof(Array);
                expect(rep.selectors.used).to.be.instanceof(Array);

                done();
            }
        );
    });

    it('options.uncssrc should be read', done => {
        uncss(
            rfs('selectors/index.html'),
            {
                uncssrc: 'tests/coverage/.uncssrc',
            },
            (err, res) => {
                try {
                    expect(err).to.equal(null);
                    expect(res).to.equal(output);

                    done();
                } catch (e) {
                    done(e);
                }
            }
        );
    });

    it('options.uncssrc with options.report should generate a valid report', done => {
        uncss(
            rfs('selectors/index.html'),
            {
                uncssrc: 'tests/coverage/.uncssrc',
                report: true,
            },
            (err, res, rep) => {
                try {
                    expect(err).to.equal(null);
                    expect(res).to.equal(output);

                    expect(rep).to.have.ownProperty('original');

                    expect(rep.selectors.all).to.be.instanceof(Array);
                    expect(rep.selectors.all.length).to.not.equal(0);
                    expect(rep.selectors.used).to.be.instanceof(Array);
                    expect(rep.selectors.used.length).to.not.equal(0);
                    expect(rep.selectors.unused).to.be.instanceof(Array);
                    expect(rep.selectors.unused.length).to.not.equal(0);

                    done();
                } catch (e) {
                    done(e);
                }
            }
        );
    });
});
