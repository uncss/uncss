'use strict';

const fs = require('fs'),
    { expect } = require('chai'),
    uncss = require('./../src/uncss.js');

describe('Raw HTML', () => {
    it('Should process an array containing HTML', async () => {
        const html = fs.readFileSync('tests/jsdom/basic.html', { encoding: 'utf8' });
        const { css } = await uncss([html], {
            csspath: 'tests/jsdom',
        });

        expect(css).to.include('.evaluated');
    });
});
