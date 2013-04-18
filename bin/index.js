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
    .option('-m, --minify', 'Minify css output')
    .option('-o, --outfile <file>', 'Redirect output to <file>')
    .parse(process.argv);

if (program.args.length === 0) {
    program.help();
}

options = {
    minify: program.minify
};

if (program.outfile) {
    console.log(program.outfile);
    callback = function (uncss) {
        fs.writeFile(options.outfile, options, function (err) {
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

uncss(program.args, options, callback);