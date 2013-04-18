#!/usr/bin/env node
var uncss   = require('../lib/uncss.js'),
    program = require('commander'),
    fs      = require('fs'),

    options,
    callback;

/* Parse command line options */
program
<<<<<<< HEAD
    .version('0.3.0')
=======
    .version('0.2.4-1')
>>>>>>> development
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