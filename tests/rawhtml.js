'use strict';

const fs = require('fs'),
    expect = require('chai').expect,
    uncss = require('./../src/uncss.js');

describe('Raw HTML', () => {
    it('Should process an array containing HTML', done => {
        const html = fs.readFileSync('tests/jsdom/basic.html', { encoding: 'utf8' });

        uncss(
            [html],
            {
                csspath: 'tests/jsdom',
            },
            (err, output) => {
                expect(err).to.equal(null);
                expect(output).to.include('.evaluated');
                done();
            }
        );
    });
});
