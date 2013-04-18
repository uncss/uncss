# UnCSS #

Remove unused styles from CSS

## Installation: ##

    npm install -g uncss

Usage
-----

### From the command line: ###

    uncss [options] <file.html file.css ...>

  Options:

    -h, --help            output usage information
    -V, --version         output the version number
    -c, --compress        Compress CSS
    -o, --outfile [file]  redirect the output to [file]

### Within node: ###

    var uncss = require('uncss');

    var css     = ['my', 'array', 'of', 'css', 'files'],
        html    = ['some', 'html', 'files'],
        options = {
            compress: false,
            outfile: 'css/style.min.css'
        };

    uncss(css, html, options);

## TODO: ##
- Remove some dependencies