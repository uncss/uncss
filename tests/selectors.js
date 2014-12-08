'use strict';

var expect    = require('chai').expect,
    fs        = require('fs'),
    path      = require('path'),
    uncss     = require('./../lib/uncss.js');

/* Read file sync sugar. */
var rfs = function (file) {
    return fs.readFileSync(path.join(__dirname, file), 'utf-8').replace(/\r\n/g, '\n');
};

var rawcss   = false,
    fixtures = fs.readdirSync(path.join(__dirname, 'selectors/fixtures')),
    expected = fs.readdirSync(path.join(__dirname, 'selectors/expected')),
    unused   = fs.readdirSync(path.join(__dirname, 'selectors/unused')),
    tests;

/* Build test object in the form:
 * [{
 *     fixture  : 'filename.css',
 *     expected : Boolean,
 *     unused   : Boolean
 *  }, {
 *   ...
 *  }, ...]
 */
tests = fixtures.map(function (test) {
    return {
        fixture  : test,
        expected : expected.indexOf(test) === -1 ? null : true,
        unused   : unused.indexOf(test) === -1 ? null : true,
    };
});

describe('Selectors', function () {

    before(function (done) {
        uncss(rfs('selectors/index.html'), { csspath: 'tests/selectors' }, function (err, output) {
            if (err) {
                throw err;
            }
            rawcss = output;
            done();
        });
    });

    tests.forEach(function (test) {

        if (test.expected) {
            it('Should output expected ' + test.fixture.split('.')[0], function () {
                expect(rawcss).to.include.string(rfs('selectors/expected/' + test.fixture));
            });
        }

        if (test.unused) {
            it('Should not output unused ' + test.fixture.split('.')[0], function () {
                expect(rawcss).to.not.include.string(rfs('selectors/unused/' + test.fixture));
            });
        }
    });

    after(function (done) {
        fs.writeFile(path.join(__dirname, '/output/selectors/uncss.css'), rawcss, done);
    });
});
