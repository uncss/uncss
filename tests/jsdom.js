'use strict';

const expect = require('chai').expect,
    path = require('path'),
    uncss = require('./../src/uncss.js');

describe('jsdom', () => {
    it('Should process CSS', async () => {
        const { css } = await uncss(['tests/jsdom/basic.html']);

        expect(css).to.include('.evaluated');
    });

    it('Should exit only when JS evaluation has finished', async function() {
        this.timeout(100000);
        const { css } = await uncss(['tests/jsdom/long_wait.html']);

        expect(css).to.include('.long-wait');
    });

    it('Should not wait for timeouts by default', async () => {
        const { css } = await uncss(['tests/jsdom/timeout.html']);

        expect(css).to.not.include('.timeout');
    });

    it('Should respect options.timeout', async () => {
        const { css } = await uncss(['tests/jsdom/timeout.html'], {
            timeout: 5000,
        });

        expect(css).to.include('.timeout');
    });

    it('Should use htmlroot to load root-relative scripts', async () => {
        const options = { htmlroot: path.join(__dirname, './jsdom') };
        const { css } = await uncss(['tests/jsdom/root_relative_script.html'], options);

        expect(css).to.include('.evaluated');
    });

    it('Should use htmlroot to load root-relative scripts the same way if htmlroot ends with a slash', async () => {
        const options = { htmlroot: path.join(__dirname, './jsdom/') };
        const { css } = await uncss(['tests/jsdom/root_relative_script.html'], options);

        expect(css).to.include('.evaluated');
    });

    it('Should not use htmlroot when loading non-root-relative scripts', async () => {
        const options = { htmlroot: path.join(__dirname, './jsdom') };
        const { css } = await uncss(['tests/jsdom/non_root_relative_script.html'], options);

        expect(css).to.include('.evaluated');
    });

    it('Should not use htmlroot when loading non-root-relative scripts in a subfolder', async () => {
        const options = { htmlroot: path.join(__dirname, './jsdom') };
        const { css } = await uncss(['tests/jsdom/sub/non_root_relative_script.html'], options);

        expect(css).to.include('.evaluated');
    });

    it('Should not use htmlroot when loading inline scripts', async () => {
        const options = { htmlroot: path.join(__dirname, './jsdom') };
        const { css } = await uncss(['tests/jsdom/basic.html'], options);

        expect(css).to.include('.evaluated');
    });

    it('Should work with missing scripts and htmlroot', async () => {
        const options = { htmlroot: path.join(__dirname, './jsdom') };
        // Overwrite stdout and stderr so we can monitor the output
        const olderr = process.stderr.write;
        let stderr = '';

        process.stderr.write = function(content) {
            stderr += content;
        };

        try {
            const { css } = await uncss(['tests/jsdom/not_found.html'], options);

            expect(css).not.not.include('.evaluated');
            expect(stderr).to.include('Could not load script');
        } finally {
            // eslint-disable-next-line require-atomic-updates
            process.stderr.write = olderr;
        }
    });

    it('Should set the useragent to the value given in options', async () => {
        const testUserAgent = 'foo';
        const options = {
            htmlroot: path.join(__dirname, './jsdom'),
            userAgent: testUserAgent,
        };
        const { css } = await uncss(['tests/jsdom/useragent.html'], options);

        expect(css).to.include('useragentset');
        expect(css).to.not.include('useragentunset');
        expect(css).to.not.include('error');
    });

    it('Should default the useragent to uncss', async () => {
        const options = {
            htmlroot: path.join(__dirname, './jsdom'),
        };
        const { css } = await uncss(['tests/jsdom/useragent.html'], options);

        expect(css).to.include('useragentunset');
        expect(css).to.not.include('useragentset');
        expect(css).to.not.include('error');
    });

    it('Should execute passed in javascript function before uncss runs', async () => {
        const options = {
            htmlroot: path.join(__dirname, './jsdom'),
            inject: window => {
                window.document.querySelector('html').classList.add('no-test', 'test');
            },
        };
        const { css } = await uncss(['tests/jsdom/inject.html'], options);

        expect(css).to.include('.no-test .inject');
        expect(css).to.include('.test .inject');
    });

    it('Should load then execute passed in javascript function before uncss runs', async () => {
        const options = {
            htmlroot: path.join(__dirname, './jsdom'),
            inject: '../tests/jsdom/inject.js',
        };
        const { css } = await uncss(['tests/jsdom/inject.html'], options);

        expect(css).to.include('.no-test .inject');
        expect(css).to.include('.test .inject');
    });

    // The use-case here is when using the cli to redirect output to a file:
    //   uncss tests/jsdom/console.html > output.css
    it('Should redirect console statements to stderr', async () => {
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

        try {
            const { css } = await uncss(['tests/jsdom/console.html']);

            expect(css).to.include('.evaluated');
            expect(stdout).to.not.include('log');
            expect(stderr).to.include('log');
        } finally {
            // eslint-disable-next-line require-atomic-updates
            process.stdout.write = oldout;
            // eslint-disable-next-line require-atomic-updates
            process.stderr.write = olderr;
        }
    });

    it('Should have missing globals by default', async () => {
        const { css } = await uncss(['tests/jsdom/globals.html']);
        expect(css).to.include('.globals-undefined');
    });

    it('Should support injected globals', async () => {
        const { css } = await uncss(['tests/jsdom/globals.html'], {
            jsdom: {
                beforeParse(window) {
                    window.matchMedia = () => {
                        /* noop */
                    };
                },
            },
        });

        expect(css).to.include('.globals-function');
    });
});
