'use strict';

const chai = require('chai'),
    path = require('path'),
    resemble = require('chai-resemble');

const expect = chai.expect;

chai.use(resemble);

describe('Pages should resemble the reference', () => {
    it('Bootstrap', (done) => {
        expect('file://' + path.resolve(__dirname, 'output/bootstrap/jumbotron.html'))
            .to.resemble('http://getbootstrap.com/docs/3.3/examples/jumbotron/', done);
    });

    it('GitHub pages', (done) => {
        expect('file://' + path.resolve(__dirname, 'output/gh-pages/index.html'))
            .to.resemble('http://uncss.github.io/uncss/', done);
    });

    it('Selectors', (done) => {
        expect('file://' + path.resolve(__dirname, 'selectors/index.html'))
            .to.resemble('file://' + path.resolve(__dirname, 'output/selectors/index.html'), done);
    });
});
