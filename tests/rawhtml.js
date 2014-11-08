'use strict';

var expect  = require('chai').expect,
    uncss   = require('./../src/uncss.js'),
    fs      = require('fs');

describe('Raw Html', function () {
    it('Should process an array containing html', function (done) {
        var html = fs.readFileSync('tests/phantomjs/basic.html', { encoding: 'utf8' });

        uncss([html], { csspath: 'tests/phantomjs' }, function (err, output) {
            expect(output).to.include('.evaluated');
            done();
        });
    });
});
