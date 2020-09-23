'use strict';

const fs = require('fs'),
    path = require('path'),
    expect = require('chai').expect,
    uncss = require('../src/uncss');

describe('Compile the CSS of an HTML page passed by path', () => {
    it('Should compile two stylesheets into one and keep the media query', async () => {
        const { css } = await uncss(['tests/input/testpage.html']);

        expect(css).to.not.equal(undefined);
        fs.writeFileSync(path.join(__dirname, '/output/mediaquery/testpage.compiled.css'), css);
        expect(css).to.not.match(/\},@media/);
    });
});
