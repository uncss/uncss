var expect = require('chai').expect,
    fs = require('fs'),
    uncss = require('../lib/uncss');

describe('Compile the CSS of an html page passed by url', function () {
    'use strict';
    it('Accepts an array of urls', function (done) {
        this.timeout(15000);
        uncss(['http://getbootstrap.com/examples/jumbotron/'], function (output) {
            expect(output).to.exist;
            fs.writeFile(__dirname + '/output/bootstrap/jumbotron.compiled.css', output, done);
        });
    });

    it('Deal with CSS files linked with absolute url', function (done) {
        this.timeout(10000);
        uncss(['http://giakki.github.io/uncss/'], function (output) {
                expect(output).to.exist;
                fs.writeFile(__dirname + '/output/gh-pages/stylesheets/stylesheet.css', output, done);
        });
    });

});
