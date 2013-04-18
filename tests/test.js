#!/usr/bin/env node
"use strict";

(function () {

    var uncss = require('../lib/uncss'),

        files = ['tests/index.html', 'tests/css/bootstrap.css'],

        expected_output = 'html{font-size:100%;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}body{margin:0;font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;font-size:14px;line-height:20px;color:#333;background-color:#fff}.container{width:940px;margin-right:auto;margin-left:auto;*zoom:1}h1{margin:10px 0;font-family:inherit;font-weight:700;color:inherit;text-rendering:optimizelegibility;line-height:40px;font-size:38.5px}.hero-unit{padding:60px;margin-bottom:30px;font-size:18px;font-weight:200;line-height:30px;color:inherit;background-color:#eee;-webkit-border-radius:6px;-moz-border-radius:6px;border-radius:6px}.hero-unit h1{margin-bottom:0;font-size:60px;line-height:1;color:inherit;letter-spacing:-1px}';

    uncss(files, { minify: true } ,function(test) {
        if (test !== expected_output) {
            console.log('Test 1: Not passed');
        } else {
            console.log('Test 1: Passed');
        }
    });

}());