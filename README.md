# UnCSS #

Remove unused styles from CSS

## Installation: ##

    npm install -g uncss

Usage
-----

### From the command line: ###

    uncss [options] <files.html ...>

  Options:

    -h      output this message
    -c      compress css

### Within node: ###

    var uncss = require('uncss');

    var files   = ['my', 'array', 'of', 'HTML', 'files'],
        options = {
            compress: false,
        };

    uncss(files, options, function (output) {
        console.log(output);
    });

    /* Look Ma, no options! */
    uncss(files, function (output) {
        console.log(output);
    });

    /* Specifying raw HTML*/
    var raw_html = '...'
    uncss(files, options, function (output) {
        console.log(output);
    });    

## License: MIT ##

## TODO: ##
- Add some better minification
- See TODO comments