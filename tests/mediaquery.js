'use strict';

var expect = require('chai').expect,
    fs     = require('fs'),
    uncss  = require('../lib/uncss');

describe('Compile the CSS of an HTML page passed by path', function () {

    it('Should compile two stylesheets into one and keep the media query', function (done) {
        this.timeout(25000);

        uncss(['tests/input/testpage.html'], function (err, output) {
            expect(err).to.be.null;
            expect(output).to.exist;
            fs.writeFile(__dirname + '/output/mediaquery/testpage.compiled.css', output, done);
            expect(output).to.not.match(/\},@media/);
        });
    });
});
