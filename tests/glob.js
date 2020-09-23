'use strict';

const expect = require('chai').expect,
    uncss = require('../src/uncss');

describe('Using globbing patterns', () => {
    it('should find both index pages in the directory and return the used CSS for both of them', async () => {
        const { css } = await uncss(['tests/glob/**/*.html']);

        expect(css).to.not.equal(undefined);
        expect(css).to.contain('h1');
        expect(css).to.contain('h2');
        expect(css).not.to.contain('h3');
        expect(css).not.to.contain('h4');
        expect(css).not.to.contain('h5');
        expect(css).not.to.contain('h6');
    });
});
