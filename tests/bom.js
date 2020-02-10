'use strict';

const expect = require('chai').expect,
    uncss = require('../src/uncss');

describe('Compile the CSS of an HTML page passed by path', () => {
    it('Should not crash when there the css file starts with BOM + @', (done) => {
        uncss(['tests/input/testbom.html'], (err, output) => {
            expect(err).to.equal(null);
            expect(output).to.include('body');
            done();
        });
    });
});
