# UnCSS #

Remove unused styles from CSS

## Installation: ##

    npm install -g uncss

Usage
-----

### From the command line: ###

  Usage: uncss [options] <file ...>

  Options:

    -h, --help                   output usage information
    -V, --version                output the version number
    -c, --compress               Compress CSS output
    -i, --ignore=<selector ...>  Do not remove given selectors


### Within node: ###

    var uncss = require('uncss');

    var files   = ['my', 'array', 'of', 'HTML', 'files'],
        options = {
            ignore: ['#added_at_runtime', '.created_by_jQuery']
            compress: true,
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
    uncss(raw_html, options, function (output) {
        console.log(output);
    });

## License ##
Copyright (c) 2013 Giacomo Martino. See the LICENSE file for license rights and limitations (MIT).

### Features planned: ###
- Add PhantomJS integration
