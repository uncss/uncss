#!/usr/bin/env node
var uncss   = require('../lib/uncss.js'),
    utility = require('../lib/lib.js'),
    program = require('commander'),
    buffer  = '';

program
    .version('0.4.4')
    .usage('[options] <file ...>')
    .option('-c, --compress', 'Compress CSS output')
    .parse(process.argv);

if (program.args.length === 0) {
    // No files were specified, read html from stdin
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', function(chunk) {
        buffer += chunk;
    });

    process.stdin.on('end', function() {
        uncss(buffer, program.options, function (uncss) {
            console.log(uncss);
        });
    });
} else {
    uncss(program.args, program.options, function (uncss) {
        console.log(uncss);
    });
}

