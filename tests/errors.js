'use strict';

const expect = require('chai').expect,
    uncss = require('./../src/uncss.js');

const invalidCss =
    'We need to create a string longer than 40 characters to ' + 'check if the error string we are creating is helpful';

describe('Error reporting', () => {
    it('No callback', () => {
        function throwTest() {
            uncss('<html></html>', { stylesheets: ['nonexistent'] });
        }
        expect(throwTest).to.throw(TypeError);
    });

    it('No valid HTML files', done => {
        uncss(['nonexistent.html'], (error, output) => {
            expect(output).to.equal(undefined);
            expect(error.message).to.equal('UnCSS: no HTML files found');
            done();
        });
    });

    it('Invalid options.stylesheets', done => {
        uncss(
            '<html></html>',
            {
                stylesheets: ['nonexistent'],
            },
            (error, output) => {
                expect(output).to.equal(undefined);
                expect(error.message).to.contain('UnCSS: could not open');
                done();
            }
        );
    });

    it('Invalid options.stylesheets with URL', done => {
        uncss(
            '<html></html>',
            {
                stylesheets: ['http://invalid'],
            },
            (error, output) => {
                expect(output).to.equal(undefined);
                expect(error.message).to.contain('ENOTFOUND');
                done();
            }
        );
    });

    it('Invalid options.raw', done => {
        uncss(
            '<html></html>',
            {
                raw: ['.test { margin: 0 }'],
            },
            (error, output) => {
                expect(output).to.equal(undefined);
                expect(error.message).to.equal('UnCSS: options.raw - expected a string');
                done();
            }
        );
    });

    it('No stylesheet found', done => {
        uncss('<html><body></body></html>', (error, output) => {
            expect(output).to.equal(undefined);
            expect(error.message).to.equal('UnCSS: no stylesheets found');
            done();
        });
    });

    it('jsdom errors', done => {
        uncss(['http://invalid'], (error, output) => {
            expect(output).to.equal(undefined);
            expect(error.message).to.match(/getaddrinfo ENOTFOUND invalid/);
            done();
        });
    });

    it('jsdom errors to stderr', done => {
        let stderrBuffer = '';
        const oldWrite = process.stderr.write;
        process.stderr.write = function(data) {
            stderrBuffer += data;
        };

        uncss(['tests/jsdom/throw.html'], error => {
            process.stderr.write = oldWrite;

            expect(error).to.equal(null);
            expect(stderrBuffer).to.contain('Exception');
            done();
        });
    });

    it('css-parse errors', done => {
        uncss(
            ['tests/selectors/index.html'],
            {
                raw: invalidCss,
            },
            (error, output) => {
                expect(output).to.equal(undefined);
                expect(error.message).to.contain('unable to parse');
                done();
            }
        );
    });

    it('css-parse errors (minified stylesheet)', done => {
        uncss(
            ['tests/selectors/index.html'],
            {
                stylesheets: ['../coverage/minified.css'],
            },
            (error, output) => {
                expect(output).to.equal(undefined);
                expect(error.message).to.contain('unable to parse');
                done();
            }
        );
    });

    it('Report should be generated only if specified', done => {
        uncss(['tests/selectors/index.html'], (error, output, report) => {
            expect(report).to.equal(undefined);
            done();
        });
    });

    it('Reports when the uncssrc file does not exist', done => {
        uncss(
            ['selectors/index.html'],
            {
                uncssrc: 'nonexistent',
            },
            err => {
                expect(err.code).to.equal('ENOENT');
                done();
            }
        );
    });

    it('Reports errors in the uncssrc file', done => {
        uncss(
            ['selectors/index.html'],
            {
                uncssrc: 'tests/coverage/.invaliduncssrc',
            },
            err => {
                expect(err).to.be.an.instanceOf(SyntaxError);
                expect(err.message).to.equal('UnCSS: uncssrc file is invalid JSON.');
                done();
            }
        );
    });

    describe('Connection errors', () => {
        it('html', done => {
            uncss('https://expired.badssl.com/', err => {
                try {
                    expect(err).to.be.instanceof(Error);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('scripts', done => {
            uncss('coverage/http_error_script.html', err => {
                try {
                    expect(err).to.be.instanceof(Error);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('stylesheets', done => {
            uncss('coverage/http_error_stylesheet.html', err => {
                try {
                    expect(err).to.be.instanceof(Error);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });
});
