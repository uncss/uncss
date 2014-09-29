/* The filename is a workaround to make this test run last */
'use strict';

var chai     = require('chai'),
    expect   = chai.expect,
    path     = require('path'),
    resemble = require('chai-resemble');

chai.use(resemble);

function abs(file) {
    return path.join(__dirname, file);
}

describe('Pages should resemble the reference', function () {
    this.timeout(15000);

    it('Bootstrap', function (done) {
        expect(abs('output/bootstrap/jumbotron.html'))
            .to.resemble('http://getbootstrap.com/examples/jumbotron/', { tolerance: 0.05 }, done);
    });

    it('Github pages', function (done) {
        expect(abs('output/gh-pages/index.html'))
            .to.resemble('http://giakki.github.io/uncss/', { tolerance: 0.05 }, done);
    });

    it('Selectors', function (done) {
        expect(abs('selectors/index.html'))
            .to.resemble(abs('output/selectors/index.html'), { tolerance: 0.05 }, done);
    });
});
