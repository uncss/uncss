#!/usr/bin/env node
var uncss   = require('../lib/uncss.js'),
    program = require('commander'),
    fs      = require('fs'),

    options,
    callback;

/* Parse command line options */
program
    .version('0.2.5-2')
    .usage('[options] <file.html file.css ...>')
    .option('-c, --compress', 'Compress css output')
    .option('-o, --outfile <file>', 'Redirect output to <file>')
    .parse(process.argv);

if (program.args.length === 0) {
    program.help();
}

options = {
    compress: program.compress
};

if (program.outfile) {
    callback = function (uncss) {
        fs.writeFile(program.outfile, uncss, function (err) {
            if (err) {
                throw err;
            }
            console.log('uncss: wrote %s', program.outfile);
        });
    };
} else {
    callback = function (uncss) {
        console.log(uncss);
    };
}

uncss(program.args, options, callback);