/* global phantom */
'use strict';

var page   = require('webpage').create(),
    system = require('system'),
    paths  = system.args.slice(1);

page.open(paths[0], function () {
    page.render(paths[2]);

    page.open(paths[1], function () {
        page.render(paths[3]);
        phantom.exit();
    });
});

