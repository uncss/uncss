#!/usr/bin/env node
var uncss   = require('../lib/uncss.js'),
    utility = require('../lib/utility.js'),

    argv,
    callback,
    compress,
    files,
    options = {},
    usage   = '[options] <file.html file.css ...>';

/* Parse command line options */
argv = process.argv.splice(2);

files = argv.filter(function (str) {
    return (/\.css$/).test(str) ||
           (/\.html$/).test(str)
});

if (files.length === 0 ||
    utility.isInCommandLine(argv, '--help')) {
    utility.showHelp();
}

if (utility.isInCommandLine(argv, '--compress')) {
    options.compress = true;
} else {
    options.compress = false;
}

uncss(files, options, function (uncss) {
    console.log(uncss);
});