var expect = require('chai').expect
  , fs = require('fs')
  , uncss =require('../lib/uncss');

describe("Compile the CSS of an html page passed by url", function() {

  it("Accepts an array of urls", function(done) {
    this.timeout(10000);
    uncss(["http://getbootstrap.com/examples/jumbotron/"], function(output) {
      expect(output).to.exist;
      fs.writeFile("output/jumbotron.compiled.css", output, done);
    });
  });

  it("Deal with CSS files linked with absolute url", function(done) {
    this.timeout(10000);
    uncss(["http://thenextweb.com/insider/2013/11/06/storify-integrates-twitter-turn-story-slideshow-embed-tweet/"], function(output) {
      expect(output).to.exist;
      fs.writeFile("output/thenextweb.compiled.css", output, done);
  
    });
  });

});
