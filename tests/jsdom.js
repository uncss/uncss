'use strict';

const expect = require('chai').expect,
    path = require('path'),
    uncss = require('./../src/uncss.js');

describe('jsdom', () => {
    it('Should process CSS', done => {
        uncss(['tests/jsdom/basic.html'], (err, output) => {
            expect(err).to.equal(null);
            expect(output).to.include('.evaluated');
            done();
        });
    });

    it('Should exit only when JS evaluation has finished', function(done) {
        this.timeout(100000);
        uncss(['tests/jsdom/long_wait.html'], (err, output) => {
            expect(err).to.equal(null);
            expect(output).to.include('.long-wait');
            done();
        });
    });

    it('Should not wait for timeouts by default', done => {
        uncss(['tests/jsdom/timeout.html'], (err, output) => {
            expect(err).to.equal(null);
            expect(output).to.not.include('.timeout');
            done();
        });
    });

    it('Should respect options.timeout', done => {
        uncss(
            ['tests/jsdom/timeout.html'],
            {
                timeout: 5000,
            },
            (err, output) => {
                expect(err).to.equal(null);
                expect(output).to.include('.timeout');
                done();
            }
        );
    });

    it('Should use htmlroot to load root-relative scripts', done => {
        const options = { htmlroot: path.join(__dirname, './jsdom') };
        uncss(['tests/jsdom/root_relative_script.html'], options, (err, output) => {
            expect(err).to.equal(null);
            expect(output).to.include('.evaluated');
            done();
        });
    });

    it('Should use htmlroot to load root-relative scripts the same way if htmlroot ends with a slash', done => {
        const options = { htmlroot: path.join(__dirname, './jsdom/') };
        uncss(['tests/jsdom/root_relative_script.html'], options, (err, output) => {
            expect(err).to.equal(null);
            expect(output).to.include('.evaluated');
            done();
        });
    });

    it('Should not use htmlroot when loading non-root-relative scripts', done => {
        const options = { htmlroot: path.join(__dirname, './jsdom') };
        uncss(['tests/jsdom/non_root_relative_script.html'], options, (err, output) => {
            expect(err).to.equal(null);
            expect(output).to.include('.evaluated');
            done();
        });
    });

    it('Should not use htmlroot when loading non-root-relative scripts in a subfolder', done => {
        const options = { htmlroot: path.join(__dirname, './jsdom') };
        uncss(['tests/jsdom/sub/non_root_relative_script.html'], options, (err, output) => {
            expect(err).to.equal(null);
            expect(output).to.include('.evaluated');
            done();
        });
    });

    it('Should not use htmlroot when loading inline scripts', done => {
        const options = { htmlroot: path.join(__dirname, './jsdom') };
        uncss(['tests/jsdom/basic.html'], options, (err, output) => {
            expect(err).to.equal(null);
            expect(output).to.include('.evaluated');
            done();
        });
    });

    it('Should work with missing scripts and htmlroot', done => {
        const options = { htmlroot: path.join(__dirname, './jsdom') };
        // Overwrite stdout and stderr so we can monitor the output
        const olderr = process.stderr.write;
        let stderr = '';

        process.stderr.write = function(content) {
            stderr += content;
        };

        uncss(['tests/jsdom/not_found.html'], options, (err, output) => {
            process.stderr.write = olderr;

            expect(err).to.equal(null);
            expect(output).not.not.include('.evaluated');
            expect(stderr).to.include('Could not load script');
            done();
        });
    });

    it('Should set the useragent to the value given in options', done => {
        const testUserAgent = 'foo';
        const options = {
            htmlroot: path.join(__dirname, './jsdom'),
            userAgent: testUserAgent,
        };
        uncss(['tests/jsdom/useragent.html'], options, (err, output) => {
            expect(err).to.equal(null);
            expect(output).to.include('useragentset');
            expect(output).to.not.include('useragentunset');
            expect(output).to.not.include('error');
            done();
        });
    });
    it('Should default the useragent to uncss', done => {
        const options = {
            htmlroot: path.join(__dirname, './jsdom'),
        };
        uncss(['tests/jsdom/useragent.html'], options, (err, output) => {
            expect(err).to.equal(null);
            expect(output).to.include('useragentunset');
            expect(output).to.not.include('useragentset');
            expect(output).to.not.include('error');
            done();
        });
    });

    it('Should execute passed in javascript function before uncss runs', done => {
        const options = {
            htmlroot: path.join(__dirname, './jsdom'),
            inject: window => {
                window.document.querySelector('html').classList.add('no-test', 'test');
            },
        };
        uncss(['tests/jsdom/inject.html'], options, (err, output) => {
            expect(err).to.equal(null);
            expect(output).to.include('.no-test .inject');
            expect(output).to.include('.test .inject');

            done();
        });
    });

    it('Should load then execute passed in javascript function before uncss runs', done => {
        const options = {
            htmlroot: path.join(__dirname, './jsdom'),
            inject: '../tests/jsdom/inject.js',
        };
        uncss(['tests/jsdom/inject.html'], options, (err, output) => {
            expect(err).to.equal(null);
            expect(output).to.include('.no-test .inject');
            expect(output).to.include('.test .inject');

            done();
        });
    });

    // The use-case here is when using the cli to redirect output to a file:
    //   uncss tests/jsdom/console.html > output.css
    it('Should redirect console statements to stderr', done => {
        // Overwrite stdout and stderr so we can monitor the output
        const oldout = process.stdout.write,
            olderr = process.stderr.write;
        let stdout = '',
            stderr = '';
        process.stdout.write = function(content) {
            stdout += content;
        };
        process.stderr.write = function(content) {
            stderr += content;
        };

        uncss(['tests/jsdom/console.html'], (err, output) => {
            process.stdout.write = oldout;
            process.stderr.write = olderr;

            expect(err).to.equal(null);
            expect(output).to.include('.evaluated');

            expect(stdout).to.not.include('log');
            expect(stderr).to.include('log');

            done();
        });
    });

    it('Should have missing globals by default', done => {
        uncss(['tests/jsdom/globals.html'], (err, output) => {
            try {
                expect(err).to.equal(null);
                expect(output).to.include('.globals-undefined');

                done();
            } catch (e) {
                done(e);
            }
        });
    });

    it('Should support injected globals', done => {
        uncss(
            ['tests/jsdom/globals.html'],
            {
                jsdom: {
                    beforeParse(window) {
                        window.matchMedia = () => {
                            /* noop */
                        };
                    },
                },
            },
            (err, output) => {
                try {
                    expect(err).to.equal(null);
                    expect(output).to.include('.globals-function');

                    done();
                } catch (e) {
                    done(e);
                }
            }
        );
    });
});
