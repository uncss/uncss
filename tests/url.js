var expect = require('chai').expect,
    fs = require('fs'),
    uncss = require('../lib/uncss'),
    /* Local */
    gh_path = __dirname + '/output/gh-pages/stylesheets/stylesheet.css',
    prev_run;

describe('Compile the CSS of an html page passed by url (May take a while)', function () {
    'use strict';

    /* Used to check that all the requests to gh-pages generate the same CSS.
     * Expected to fail if the gh-page is updated.
     */
    before(function (done) {
        fs.readFile(gh_path, 'utf-8', function (err, stylesheet) {
            if (err) {
                throw err;
            }
            prev_run = stylesheet;
            done();
        });
    });

    it('Accepts an array of urls', function (done) {
        this.timeout(25000);
        uncss(['http://getbootstrap.com/examples/jumbotron/'], function (err, output) {
            expect(err).to.be.null;
            expect(output).to.have.length.above(2);
            fs.writeFile(__dirname + '/output/bootstrap/jumbotron.compiled.css', output, done);
        });
    });

    it('Deals with CSS files linked with absolute url', function (done) {
        this.timeout(25000);
        uncss(['http://giakki.github.io/uncss/'], function (err, output) {
            expect(err).to.be.null;
            expect(output).to.equal(prev_run);
            prev_run = output;
            done();
        });
    });

    it('Deals with relative options.stylesheets when using urls', function (done) {
        this.timeout(25000);
        uncss(
            ['http://giakki.github.io/uncss/'],
            { stylesheets: ['//cdnjs.cloudflare.com/ajax/libs/colors/1.0/colors.min.css',
                            'stylesheets/stylesheet.css'] },
            function (err, output) {
                expect(err).to.be.null;
                expect(output).to.equal(prev_run);
                prev_run = output;
                done();
            }
        );
    });

    it('Deals with absolute options.stylesheets when using urls', function (done) {
        this.timeout(25000);
        uncss(
            ['http://giakki.github.io/uncss/'],
            { stylesheets: ['//cdnjs.cloudflare.com/ajax/libs/colors/1.0/colors.min.css',
                            '/uncss/stylesheets/stylesheet.css'] },
            function (err, output) {
                expect(err).to.be.null;
                expect(output).to.equal(prev_run);
                prev_run = output;
                done();
            }
        );
    });

    after(function (done) {
        fs.writeFile(__dirname + '/output/gh-pages/stylesheets/stylesheet.css', prev_run, done);
    });

});
