# UnCSS

[![Build Status](https://travis-ci.org/giakki/uncss.png)](https://travis-ci.org/giakki/uncss)
[![Coverage Status](https://coveralls.io/repos/giakki/uncss/badge.png?branch=master)](https://coveralls.io/r/giakki/uncss?branch=master)
[![Dependency Status](https://david-dm.org/giakki/uncss.png?theme=shields.io)](https://david-dm.org/giakki/uncss)
[![devDependency Status](https://david-dm.org/giakki/uncss/dev-status.png?theme=shields.io)](https://david-dm.org/giakki/uncss#info=devDependencies)

UnCSS is a tool that removes unused CSS from your stylesheets.
It works across multiple files and supports Javascript-injected CSS.

## How?
The process by which UnCSS removes the unused rules is as follows:

1. The HTML files are loaded by [PhantomJS](https://github.com/Obvious/phantomjs) and JavaScript is executed.
2. Used stylesheets are extracted from the resulting HTML.
3. The stylesheets are concatenated and the rules are parsed by [css-parse](https://github.com/reworkcss/css).
4. `document.querySelector` filters out selectors that are not found in the HTML files.
5. The remaining rules are converted back to CSS.

## Installation:

```shell
npm install -g uncss
```

## Usage

### Within Node.js:

```js
var uncss = require('uncss');

var files   = ['my', 'array', 'of', 'HTML', 'files'],
    options = {
        ignore       : ['#added_at_runtime', /test\-[0-9]+/],
        media        : ['(min-width: 700px) handheld and (orientation: landscape)'],
        csspath      : '../public/css/',
        raw          : 'h1 { color: green }',
        stylesheets  : ['lib/bootstrap/dist/css/bootstrap.css', 'src/public/css/main.css'],
        ignoreSheets : [/fonts.googleapis/],
        urls         : ['http://localhost:3000/mypage', '...'], // Deprecated
        timeout      : 1000,
        htmlroot     : 'public'
    };

uncss(files, options, function (error, output) {
    console.log(output);
});

/* Look Ma, no options! */
uncss(files, function (error, output) {
    console.log(output);
});

/* Specifying raw HTML */
var raw_html = '...';
uncss(raw_html, options, function (error, output) {
    console.log(output);
});
```

### At build-time
UnCSS can also be used in conjunction with other javascript build systems, such as [Grunt](https://github.com/gruntjs/grunt) or [Gulp](https://github.com/gulpjs/gulp)!
Thanks to @addyosmani for creating:

- [grunt-uncss](https://github.com/addyosmani/grunt-uncss)
- [gulp-uncss-task](https://github.com/addyosmani/gulp-uncss-task)

and to @ben-eb for creating:

- [gulp-uncss](https://github.com/ben-eb/gulp-uncss)

### From the command line:

```
Usage: uncss [options] <file or url, ...>
       e.g. uncss http://getbootstrap.com/examples/jumbotron/ > stylesheet.css

Options:

  -h, --help                            output usage information
  -V, --version                         output the version number
  -i, --ignore <selector, ...>          Do not remove given selectors
  -m, --media <media_query, ...>        Process additional media queries
  -C, --csspath <path>                  Relative path where the CSS files are located
  -s, --stylesheets <file, ...>         Specify additional stylesheets to process
  -S, --ignoreSheets <selector, ...>    Do not include specified stylesheets
  -r, --raw <string>                    Pass in a raw string of CSS
  -t, --timeout <milliseconds>          Wait for JS evaluation
  -H, --htmlroot <folder>               Absolute paths' root location
```

- __ignore__ (Array): provide a list of selectors that should not be removed by UnCSS. For example, styles added by user interaction with the page (hover, click), since those are not detectable by UnCSS yet. Both literal names and regex patterns are recognized.

- __media__ (Array): By default UnCSS processes only stylesheets with media query "_all_", "_screen_", and those without one. Specify here which others to include.

- __csspath__ (String): path where the CSS files are related to the html files. By default, UnCSS uses the path specified in the `<link rel="stylesheet" href="path/to/file.css"/>`

- __stylesheets__ (Array): use these stylesheets instead of those extracted from the html files.

- __ignoreSheets__ (Array): do not process these stylesheets, e.g. Google fonts. Accepts strings or regex patterns

- __raw__ (String): give the task a raw string of CSS in addition to the existing stylesheet options; useful in scripting when your CSS hasn't yet been written to disk.

- __urls__ (Array): array of URLs to load with Phantom (on top of the files already passed if any).
NOTE: this feature is deprecated, you can pass URLs directly as arguments.

- __timeout__ (Number): specify how long to wait for the JS to be loaded.

- __htmlroot__ (String): Where the project root is. Useful for example if you are running UnCSS on _local_ files that have absolute href to the stylesheets, i.e. `href="/css/style.css"`

## License
Copyright (c) 2013 Giacomo Martino. See the [LICENSE](/LICENSE.md) file for license rights and limitations (MIT).
