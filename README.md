# UnCSS

[![NPM version](https://img.shields.io/npm/v/uncss.svg)](https://www.npmjs.com/package/uncss)  
[![Linux Build Status](https://img.shields.io/travis/giakki/uncss/master.svg?label=Linux%20build)](https://travis-ci.org/giakki/uncss)
[![Windows Build status](https://img.shields.io/appveyor/ci/giakki/uncss/master.svg?label=Windows%20build)](https://ci.appveyor.com/project/giakki/uncss/branch/master)
[![Coverage Status](https://img.shields.io/coveralls/giakki/uncss.svg)](https://coveralls.io/r/giakki/uncss?branch=master)  
[![Dependency Status](https://img.shields.io/david/giakki/uncss.svg)](https://david-dm.org/giakki/uncss)
[![devDependency Status](https://img.shields.io/david/dev/giakki/uncss.svg)](https://david-dm.org/giakki/uncss#info=devDependencies)

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

var files   = ['my', 'array', 'of', 'HTML', 'files', 'or', 'http://urls.com'],
    options = {
        ignore       : ['#added_at_runtime', /test\-[0-9]+/],
        media        : ['(min-width: 700px) handheld and (orientation: landscape)'],
        csspath      : '../public/css/',
        raw          : 'h1 { color: green }',
        stylesheets  : ['lib/bootstrap/dist/css/bootstrap.css', 'src/public/css/main.css'],
        ignoreSheets : [/fonts.googleapis/],
        timeout      : 1000,
        htmlroot     : 'public',
        report       : false,
        uncssrc      : '.uncssrc'
    };

uncss(files, options, function (error, output) {
    console.log(output);
});

/* Look Ma, no options! */
uncss(files, function (error, output) {
    console.log(output);
});

/* Specifying raw HTML */
var rawHtml = '...';

uncss(rawHtml, options, function (error, output) {
    console.log(output);
});
```

### At build-time
UnCSS can also be used in conjunction with other javascript build systems, such as [Grunt](https://github.com/gruntjs/grunt), [Broccoli](https://github.com/broccolijs/broccoli#readme) or [Gulp](https://github.com/gulpjs/gulp)!

- [grunt-uncss](https://github.com/addyosmani/grunt-uncss) – Thanks to [@addyosmani](https://github.com/addyosmani)
- [gulp-uncss](https://github.com/ben-eb/gulp-uncss) – Thanks to [@ben-eb](https://github.com/ben-eb)
- [broccoli-uncss](https://github.com/sindresorhus/broccoli-uncss) - Thanks to [@sindresorhus](https://github.com/sindresorhus)

### From the command line:

```
Usage: uncss [options] <file or URL, ...>
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
  -u, --uncssrc <file>                  Load these options from <file>
```

**Note that you can pass both local file paths and  URLs to the program.**

- **ignore** (Array): provide a list of selectors that should not be removed by UnCSS. For example, styles added by user interaction with the page (hover, click), since those are not detectable by UnCSS yet. Both literal names and regex patterns are recognized. Otherwise, you can add a comment before specific selectors:

  ```css
  /* uncss:ignore */
  .selector1 {
      /* this rule will be ignored */
  }

  .selector2 {
      /* this will NOT be ignored */
  }
  ```

- **media** (Array): By default UnCSS processes only stylesheets with media query "_all_", "_screen_", and those without one. Specify here which others to include.

- **csspath** (String): Path where the CSS files are related to the HTML files. By default, UnCSS uses the path specified in the `<link rel="stylesheet" href="path/to/file.css"/>`.

- **stylesheets** (Array): Use these stylesheets instead of those extracted from the HTML files.

- **ignoreSheets** (Array): Do not process these stylesheets, e.g. Google fonts. Accepts strings or regex patterns.

- **raw** (String): Give the task a raw string of CSS in addition to the existing stylesheet options; useful in scripting when your CSS hasn't yet been written to disk.

- **timeout** (Number): Specify how long to wait for the JS to be loaded.

- **htmlroot** (String): Where the project root is. Useful for example if you are running UnCSS on _local_ files that have absolute href to the stylesheets, i.e. `href="/css/style.css"`.

- **report** (Boolean): Return the report object in callback.

- **uncssrc** (String): Load all options from a JSON file. Regular expressions for the `ignore` and `ignoreSheets` options should be wrapped in quotation marks.

  Example uncssrc file:

  ```json
  {
      "ignore": [
          ".unused",
          "/^#js/"
      ],
      "stylesheets": [
          "css/override.css"
      ]
  }
  ```


## License
Copyright (c) 2013 Giacomo Martino. See the [LICENSE](/LICENSE.md) file for license rights and limitations (MIT).
