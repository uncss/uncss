'use strict';

const fs = require('fs'),
    path = require('path'),
    expect = require('chai').expect,
    uncss = require('../src/uncss');

describe('Compile the CSS of an HTML page passed by path', () => {
    it('Should compile two stylesheets into one and keep the media query', done => {
        uncss(['tests/input/testpage.html'], (err, output) => {
            expect(err).to.equal(null);
            expect(output).to.not.equal(undefined);
            fs.writeFile(path.join(__dirname, '/output/mediaquery/testpage.compiled.css'), output, done);
            expect(output).to.not.match(/\},@media/);
        });
    });
});
