'use strict';

/* jshint mocha: true */
/* eslint-env mocha */

var chai = require('chai'),
    resemble = require('chai-resemble');

var expect = chai.expect;

chai.use(resemble);

describe('Pages should resemble the reference', function () {
    this.timeout(15000);

    it('Bootstrap', function (done) {
        expect('tests/output/bootstrap/jumbotron.html')
            .to.resemble('http://getbootstrap.com/examples/jumbotron/', done);
    });

    it('GitHub pages', function (done) {
        expect('tests/output/gh-pages/index.html')
            .to.resemble('http://giakki.github.io/uncss/', done);
    });

    it('Selectors', function (done) {
        expect('tests/selectors/index.html')
            .to.resemble('tests/output/selectors/index.html', done);
    });
});
