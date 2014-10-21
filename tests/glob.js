'use strict';

var expect = require('chai').expect,
    fs     = require('fs'),
    uncss  = require('../lib/uncss');

describe('Using globbing patterns', function () {

    it('should find both index pages in the directory and return the used CSS for both of them', function (done) {
        this.timeout(25000);

        uncss(['tests/glob/**/*.html'], function (err, output) {
            expect(err).to.be.null;
            expect(output).to.exist;
            expect(output).to.contain('h1');
            expect(output).to.contain('h2');
            expect(output).not.to.contain('h3');
            expect(output).not.to.contain('h4');
            expect(output).not.to.contain('h5');
            expect(output).not.to.contain('h6');
            done();
        });
    });
});
