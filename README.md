# UnCSS #

[![Build Status](https://travis-ci.org/giakki/uncss.png)](https://travis-ci.org/giakki/uncss)

Remove unused styles from CSS

## Installation: ##

    npm install -g uncss

Usage
-----

### Within node: ###

    var uncss = require('uncss');

    var files   = ['my', 'array', 'of', 'HTML', 'files'],
        options = {
            ignore: ['#added_at_runtime', /test\-[0-9]+/],
            csspath: "../public/css/",
            raw: 'h1 { color: green }',
            stylesheets: ["lib/bootstrap/dist/css/bootstrap.css", "src/public/css/main.css"],
            timeout: 1000
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

### From the command line: ###

  Usage: uncss [options] <file ...>

  Options:

    -h, --help                     output usage information
    -V, --version                  output the version number
    -i, --ignore <selector, ...>   Do not remove given selectors
    -C, --csspath <path>           Relative path where the CSS files are located
    -s, --stylesheets <file, ...>  Specify additional stylesheets to process
    -r, --raw <string>             Pass in a raw string of CSS
    -t, --timeout <milliseconds>   Wait for JS evaluation

### At build-time ###
UnCSS can also be used in conjunction with other javascript build systems, thanks to @addyosmani for creating:

- [grunt-uncss](https://github.com/addyosmani/grunt-uncss)
- [gulp-uncss-task](https://github.com/addyosmani/gulp-uncss-task)

#### Options in depth: ####
- __ignore__ [Array]: provide a list of selectors that should not be removed by UnCSS. For example, styles added by user interaction with the page (hover, click), since those are not detectable by UnCSS yet. Both literal names and regex patterns are recognized.
- __csspath__ [String]: Path where the CSS files are related to the html files. By default, UnCSS uses the path specified in the <link rel="stylesheet" href="path/to/file.css"\>
- __stylesheets__ [Array]: Force the list of stylesheets to optimize using a path relative to the `Gruntfile.js`. Otherwise, it extracts the stylesheets from the html files.
- __raw__ [String]: Give the task a raw string of CSS in addition to the existing stylesheet options; useful in scripting when your CSS hasn't yet been written to disk.
- __timeout__ [Number]: Specify how long to wait for the JS to be loaded.

## License ##
Copyright (c) 2013 Giacomo Martino. See the LICENSE file for license rights and limitations (MIT).

### Features planned: ###
- Fully support all CSS selectors
- Support @-rules
