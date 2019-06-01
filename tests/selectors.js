'use strict';

const fs = require('fs'),
    path = require('path'),
    expect = require('chai').expect,
    uncss = require('./../src/uncss.js');

/* Read file sync sugar. */
function rfs(file) {
    return fs.readFileSync(path.join(__dirname, file), 'utf-8').replace(/\r\n/g, '\n');
}

let rawcss = false;
const fixtures = fs.readdirSync(path.join(__dirname, 'selectors/fixtures')),
    expected = fs.readdirSync(path.join(__dirname, 'selectors/expected')),
    unused = fs.readdirSync(path.join(__dirname, 'selectors/unused'));

/* Build test object in the form:
 * [{
 *     fixture  : 'filename.css',
 *     expected : Boolean,
 *     unused   : Boolean
 *  }, {
 *   ...
 *  }, ...]
 */
const tests = fixtures.map(test => ({
    fixture: test,
    expected: expected.indexOf(test) === -1 ? null : true,
    unused: unused.indexOf(test) === -1 ? null : true,
}));

describe('Selectors', () => {
    before(done => {
        uncss(
            rfs('selectors/index.html'),
            {
                csspath: 'tests/selectors',
            },
            (err, output) => {
                if (err) {
                    throw err;
                }
                rawcss = output;
                done();
            }
        );
    });

    tests.forEach(test => {
        if (test.expected) {
            it(`Should output expected ${test.fixture.split('.')[0]}`, () => {
                expect(rawcss).to.include.string(rfs(`selectors/expected/${test.fixture}`));
            });
        }

        if (test.unused) {
            it(`Should not output unused ${test.fixture.split('.')[0]}`, () => {
                expect(rawcss).to.not.include.string(rfs(`selectors/unused/${test.fixture}`));
            });
        }
    });

    after(done => {
        fs.writeFile(path.join(__dirname, '/output/selectors/uncss.css'), rawcss, done);
    });
});
