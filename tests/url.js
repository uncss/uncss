'use strict';

var fs = require('fs'),
    path = require('path'),
    expect = require('chai').expect,
    uncss = require('../src/uncss');

var ghPath = path.join(__dirname, '/output/gh-pages/stylesheets/stylesheet.css'),
    prevRun;

describe('Compile the CSS of an HTML page passed by URL', function () {
    /* Used to check that all the requests to gh-pages generate the same CSS.
     * Expected to fail if the gh-page is updated.
     */
    before(function (done) {
        fs.readFile(ghPath, 'utf-8', function (err, stylesheet) {
            if (err) {
                throw err;
            }
            prevRun = stylesheet;
            done();
        });
    });

    it('Accepts an array of URLs', function (done) {
        uncss(['http://getbootstrap.com/examples/jumbotron/'], function (err, output) {
            expect(err).to.equal(null);
            expect(output).to.have.length.above(2);
            fs.writeFile(path.join(__dirname, '/output/bootstrap/jumbotron.compiled.css'),
                output,
                done);
        });
    });

    it('Deals with CSS files linked with absolute URL', function (done) {
        uncss(['http://giakki.github.io/uncss/'], function (err, output) {
            expect(err).to.equal(null);
            expect(output).to.equal(prevRun);
            prevRun = output;
            done();
        });
    });

    it('Deals with relative options.stylesheets when using URLs', function (done) {
        uncss(['http://giakki.github.io/uncss/'], {
            stylesheets: [
                'http://cdnjs.cloudflare.com/ajax/libs/colors/1.0/colors.min.css',
                'stylesheets/stylesheet.css'
            ]
        }, function (err, output) {
            expect(err).to.equal(null);
            expect(output).to.equal(prevRun);
            prevRun = output;
            done();
        });
    });

    it('Deals with absolute options.stylesheets when using URLs', function (done) {
        uncss(['http://giakki.github.io/uncss/'], {
            stylesheets: [
                'http://cdnjs.cloudflare.com/ajax/libs/colors/1.0/colors.min.css',
                '/uncss/stylesheets/stylesheet.css'
            ]
        }, function (err, output) {
            expect(err).to.equal(null);
            expect(output).to.equal(prevRun);
            prevRun = output;
            done();
        });
    });

    after(function (done) {
        fs.writeFile(path.join(__dirname, '/output/gh-pages/stylesheets/stylesheet.css'),
            prevRun,
            done);
    });

});
