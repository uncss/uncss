'use strict';

const { expect } = require('chai'),
    { dePseudify } = require('../src/lib');

describe('dePseudify() function', () => {
    const expected = {
        '.clearfix::before': '.clearfix',
        '.clearfix:before': '.clearfix',
        '.sm\\:hover\\:font-hairline': '.sm\\:hover\\:font-hairline',
        '.sm\\:hover\\:font-hairline:hover': '.sm\\:hover\\:font-hairline',
        '.sm\\:hover\\:font-hairline\\:hover': '.sm\\:hover\\:font-hairline\\:hover',
        '.sm\\:hover\\:font-hairline\\:valid': '.sm\\:hover\\:font-hairline\\:valid',
        '.sm\\:valid\\:font-bold:valid': '.sm\\:valid\\:font-bold',
        ':focus': '',
        ':root a:hover': ':root a',
        ':root': ':root',
        '[data-text="example of :hover pseudo-class"]:hover': '[data-text="example of :hover pseudo-class"]',
        'a :not(strong):not(span)': 'a :not(strong):not(span)',
        'a:hover :not(strong):not(span)': 'a :not(strong):not(span)',
        'a:nth-child(4n)': 'a:nth-child(4n)',
        'div:FOCUS-WITHIN': 'div',
        'div:focus-within': 'div',
        'h5:hover::before': 'h5',
        'input:checked ~ label': 'input ~ label',
        'input:checked ~ label:before': 'input ~ label',
        'input:nth-child(4n):valid': 'input:nth-child(4n)',
        'li:only-child': 'li:only-child',
        'p:hover:not(.fancy)': 'p:not(.fancy)',
        'p:not(.fancy)': 'p:not(.fancy)',
        'p:not(.fancy):hover': 'p:not(.fancy)',
        'input::placeholder': 'input',
    };

    Object.keys(expected).forEach((input) => {
        const output = expected[input];
        it(`should convert ${input} to ${output || '(empty)'}`, () => {
            expect(dePseudify(input)).to.equal(output);
        });
    });
});
