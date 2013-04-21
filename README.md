# UnCSS #

Remove unused styles from CSS

## Installation: ##

    npm install -g uncss

Usage
-----

### From the command line: ###

    uncss [options] <file.html file.css ...>

  Options:

    -h, --help     output this message
    -c, --compress compress css

### Within node: ###

    var uncss = require('uncss');

    var files   = ['my', 'array', 'of', 'css/html', 'files'],
        options = {
            compress: false,
            /* More options to come */
        };

    uncss(files, options, function (output) {
        console.log(output);
    });

    /* Look Ma, no options! */
    uncss(files, function (output) {
        console.log(output);
    });    

## License: MIT ##

## TODO: ##
- Remove some dependencies
- Fetch css files from stylesheets in HTML