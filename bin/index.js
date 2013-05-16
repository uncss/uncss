#!/usr/bin/env node
var uncss   = require('../lib/uncss.js'),
    utility = require('../lib/utility.js'),

    arg,
    argv,
    buffer = '',
    callback,
    compress,
    files   = [],
    i,
    options = {};

/* Parse command line options */
argv = process.argv.splice(2);

for (i = 0; i < argv.length; i++) {
    arg = argv[i];
    if (arg.length < 2) {
        console.log('Unrecognized token: ' + arg);
        process.exit();
    }
    if (arg[0] === '-') {
        options[arg[1]] = true;
    } else {
        files.push(arg);
    }
}

if (options.h) {
    utility.showHelp();
    process.exit();
}

if (options.c) {
    options.compress = true;
} else {
    options.compress = false;
}

if (files.length === 0) {
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', function(chunk) {
        buffer += chunk;
    });

    process.stdin.on('end', function() {
        uncss(buffer, options, function (uncss) {
            console.log(uncss);
        });        
    });
} else {
    uncss(files, options, function (uncss) {
        console.log(uncss);
    });  
}