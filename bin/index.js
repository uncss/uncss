#!/usr/bin/env node
var uncss   = require('../lib/uncss.js'),
    program = require('commander'),
    fs      = require('fs'),

    options,
    callback;

/* Parse command line options */
program
    .version('0.1.0')
    .usage('[options] <file.html file.css ...>')
    .option('-c, --compress', 'Compress CSS')
    .parse(process.argv);

if (program.args.length === 0) {
    program.help();
}

options = {
    compress: program.compress
};

if (program.outfile) {
    callback = function (uncss) {
        fs.writeFile(options.outfile, uncss, function (err) {
            if (err) {
                throw err;
            }
            console.log('uncss: wrote %s', options.outfile);
        });
    };
} else {
    callback = function (uncss) {
        console.log(uncss);
    };
}

uncss(css_files, html_files, options, callback);