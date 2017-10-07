'use strict';

const chai = require('chai'),
    resemble = require('chai-resemble');

const expect = chai.expect;

chai.use(resemble);

describe('Pages should resemble the reference', () => {
    it('Bootstrap', (done) => {
        expect('tests/output/bootstrap/jumbotron.html')
            .to.resemble('http://getbootstrap.com/docs/3.3/examples/jumbotron/', done);
    });

    it('GitHub pages', (done) => {
        expect('tests/output/gh-pages/index.html')
            .to.resemble('http://giakki.github.io/uncss/', done);
    });

    it('Selectors', (done) => {
        expect('tests/selectors/index.html')
            .to.resemble('tests/output/selectors/index.html', done);
    });
});
