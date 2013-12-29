#!/usr/bin/env node
(function () {
    'use strict';

    var uncss   = require('../lib/uncss.js'),
        program = require('commander'),
        buffer  = '',
        options;

    program
        .version('0.4.4')
        .usage('[options] <file, ...>')
        .option('-i, --ignore <selector, ...>', 'Do not remove given selectors')
        .option('-C, --csspath <path>', 'Relative path where the CSS files are located')
        .option('-s, --stylesheets <file, ...>', 'Specify additional stylesheets to process')
        .option('-r, --raw <string>', 'Pass in a raw string of CSS')
        .option('-t, --timeout <milliseconds>', 'Wait for JS evaluation')
        .parse(process.argv);

    options = {
        ignore: program.ignore
            ? program.ignore.split(', ')
            : []
    };

    if (program.args.length === 0) {
        // No files were specified, read html from stdin
        process.stdin.resume();
        process.stdin.setEncoding('utf8');

        process.stdin.on('data', function (chunk) {
            buffer += chunk;
        });

        process.stdin.on('end', function () {
            uncss(buffer, options, function (uncss) {
                console.log(uncss);
            });
        });
    } else {
        uncss(program.args, options, function (uncss) {
            console.log(uncss);
        });
    }

}());
