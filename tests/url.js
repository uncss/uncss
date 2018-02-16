'use strict';

const fs = require('fs'),
    path = require('path'),
    expect = require('chai').expect,
    uncss = require('../src/uncss');

const ghPath = path.join(__dirname, '/output/gh-pages/stylesheets/stylesheet.css');
let prevRun;

describe('Compile the CSS of an HTML page passed by URL', () => {
    /* Used to check that all the requests to gh-pages generate the same CSS.
     * Expected to fail if the gh-page is updated.
     */
    before((done) => {
        fs.readFile(ghPath, 'utf-8', (err, stylesheet) => {
            if (err) {
                throw err;
            }
            prevRun = stylesheet;
            done();
        });
    });

    it('Accepts an array of URLs', (done) => {
        uncss(['http://getbootstrap.com/docs/3.3/examples/jumbotron/'], (err, output) => {
            expect(err).to.equal(null);
            expect(output).to.have.length.above(2);
            fs.writeFile(path.join(__dirname, '/output/bootstrap/jumbotron.compiled.css'),
                output,
                done);
        });
    });

    it('Deals with CSS files linked with absolute URL', (done) => {
        uncss(['http://uncss.github.io/uncss/'], (err, output) => {
            expect(err).to.equal(null);
            expect(output).to.equal(prevRun);
            prevRun = output;
            done();
        });
    });

    it('Deals with relative options.stylesheets when using URLs', (done) => {
        uncss(['http://uncss.github.io/uncss/'], {
            stylesheets: [
                'http://cdnjs.cloudflare.com/ajax/libs/colors/1.0/colors.min.css',
                'stylesheets/stylesheet.css'
            ]
        }, (err, output) => {
            expect(err).to.equal(null);
            expect(output).to.equal(prevRun);
            prevRun = output;
            done();
        });
    });

    it('Deals with absolute options.stylesheets when using URLs', (done) => {
        uncss(['http://uncss.github.io/uncss/'], {
            stylesheets: [
                'http://cdnjs.cloudflare.com/ajax/libs/colors/1.0/colors.min.css',
                '/uncss/stylesheets/stylesheet.css'
            ]
        }, (err, output) => {
            expect(err).to.equal(null);
            expect(output).to.equal(prevRun);
            prevRun = output;
            done();
        });
    });

    after((done) => {
        fs.writeFile(path.join(__dirname, '/output/gh-pages/stylesheets/stylesheet.css'),
            prevRun,
            done);
    });

});
