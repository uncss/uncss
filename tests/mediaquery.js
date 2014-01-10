var expect = require('chai').expect,
    fs = require('fs'),
    uncss =require('../lib/uncss');

describe("Compile the CSS of an html page passed by path", function() {
    it("should compile two stylesheets into one and keep the media query", function(done) {
        this.timeout(10000);
        uncss(["tests/input/testpage.html"], function(output) {
            expect(output).to.exist;
            fs.writeFile(__dirname+"/output/testpage.compiled.css", output, done);
            expect(output).to.not.match(/\},@media/);
        });
    });
});
