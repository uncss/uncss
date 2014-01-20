# UnCSS #

[![Build Status](https://travis-ci.org/giakki/uncss.png)](https://travis-ci.org/giakki/uncss)
[![Coverage Status](https://coveralls.io/repos/giakki/uncss/badge.png?branch=master)](https://coveralls.io/r/giakki/uncss?branch=master)

UnCSS is a tool that removes unused CSS from your stylesheets.
It works across multiple files and supports Javascript-injected CSS.

## Installation: ##

    npm install -g uncss

Usage
-----

### Within node: ###

    var uncss = require('uncss');

    var files   = ['my', 'array', 'of', 'HTML', 'files'],
        options = {
            ignore: ['#added_at_runtime', /test\-[0-9]+/],
            media: ['(min-width: 700px) handheld and (orientation: landscape)'],
            csspath: "../public/css/",
            raw: 'h1 { color: green }',
            stylesheets: ["lib/bootstrap/dist/css/bootstrap.css", "src/public/css/main.css"],
            urls: ["http://localhost:3000/mypage", "..."] //array of urls
            timeout: 1000
        };

    uncss(files, options, function (error, output) {
        console.log(output);
    });

    /* Look Ma, no options! */
    uncss(files, function (error, output) {
        console.log(output);
    });

    /* Specifying raw HTML
     * NOTE: raw HTML is not parsed by phantom
     */
    var raw_html = '...'
    uncss(raw_html, options, function (error, output) {
        console.log(output);
    });

### At build-time ###
UnCSS can also be used in conjunction with other javascript build systems, such as [Grunt](https://github.com/gruntjs/grunt) or [Gulp](https://github.com/gulpjs/gulp)!
Thanks to @addyosmani for creating:

- [grunt-uncss](https://github.com/addyosmani/grunt-uncss)
- [gulp-uncss-task](https://github.com/addyosmani/gulp-uncss-task)

and to @ben-eb for creating:

- [gulp-uncss](https://github.com/ben-eb/gulp-uncss)

### From the command line: ###

Usage: ```uncss [options] <file ...>```
e.g. ```uncss --ignore .donotwant,#nope http://getbootstrap.com/examples/jumbotron/```

  Options:

    -h, --help                      output usage information
    -V, --version                   output the version number
    -i, --ignore <selector, ...>    Do not remove given selectors
    -m, --media <media_query, ...>  Process additional media queries
    -C, --csspath <path>            Relative path where the CSS files are located
    -s, --stylesheets <file, ...>   Specify additional stylesheets to process
    -r, --raw <string>              Pass in a raw string of CSS
    -t, --timeout <milliseconds>    Wait for JS evaluation

- __ignore__ (Array): provide a list of selectors that should not be removed by UnCSS. For example, styles added by user interaction with the page (hover, click), since those are not detectable by UnCSS yet. Both literal names and regex patterns are recognized.

- __media__ (Array): By default UnCSS processes only stylesheets with media query "_all_", "_screen_", and those without one. Specify here which others to include.

- __csspath__ (String): path where the CSS files are related to the html files. By default, UnCSS uses the path specified in the <link rel="stylesheet" href="path/to/file.css"\>

- __stylesheets__ (Array): use these stylesheets instead of those extracted from the html files.

- __raw__ (String): give the task a raw string of CSS in addition to the existing stylesheet options; useful in scripting when your CSS hasn't yet been written to disk.

- __urls__ (Array): array of URLs to load with Phantom (on top of the files already passed if any).

- __timeout__ (Number): specify how long to wait for the JS to be loaded.

## License ##
Copyright (c) 2013 Giacomo Martino. See the LICENSE file for license rights and limitations (MIT).
