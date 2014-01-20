/* global phantom */
(function () {
    'use strict';
    var page   = require('webpage').create(),
        system = require('system');

    function evaluate() {
        var p = page.evaluate(function () {
            return document.documentElement.outerHTML;
        });
        system.stdout.writeLine(p);
        phantom.exit();
    }

    if (system.args.length < 2) {
        system.stderr.writeLine('PhantomJS: no filename provided.');
        phantom.exit(1);
    }
    if (system.args.length < 3) {
        system.stderr.writeLine('PhantomJS: no timeout provided.');
        phantom.exit(1);
    }

    // Run the page
    page.open(system.args[1], function (status) {
        if (status !== 'success') {
            system.stderr.writeLine('PhantomJS: Unable to open: ' + system.args[1]);
            phantom.exit();
        } else {
            setTimeout(evaluate, system.args[2]);
        }
    });
}());
