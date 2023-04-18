'use strict';

const chai = require('chai'),
    path = require('path');

// Ignore resemble tests on node 6.
if (process.version.match(/^v6/)) {
    return;
}

const resemble = require('chai-resemble');

const { expect } = chai;

chai.use(resemble);

function rel(relativePath) {
    return path.resolve(__dirname, relativePath);
}

describe.skip('Pages should resemble the reference', () => {
    it('Bootstrap', (done) => {
        expect(`file://${rel('output/bootstrap/jumbotron.html')}`).to.resemble(
            'https://getbootstrap.com/docs/3.4/examples/jumbotron/',
            {
                name: 'bootstrap',
                outDir: rel('screenshots'),
            },
            done
        );
    });

    it('Selectors', (done) => {
        expect(`file://${rel('selectors/index.html')}`).to.resemble(
            `file://${rel('output/selectors/index.html')}`,
            {
                name: 'selectors',
                outDir: rel('screenshots'),
            },
            done
        );
    });
});
