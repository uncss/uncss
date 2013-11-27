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
            ignore: ['#added_at_runtime', '.created_by_jQuery'],
            compress: true,
            csspath: "../public/css/", // path where the CSS files are related to the html files. By default, uncss uses the path specified in the <link rel="stylesheet" href="path/to/file.css">
            stylesheets: ["lib/bootstrap/dist/css/bootstrap.css", "src/public/css/main.css"] // Force the list of stylesheets to optimize using a path relative to the `Gruntfile.js`. Otherwise, it extracts the stylesheets from the html files
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

### grunt-uncss ###
If you are looking for the grunt plugin, head over to [grunt-uncss](https://github.com/addyosmani/grunt-uncss), created by @addyosmani

## License ##
Copyright (c) 2013 Giacomo Martino. See the LICENSE file for license rights and limitations (MIT).

### Features planned: ###
- Add PhantomJS integration
