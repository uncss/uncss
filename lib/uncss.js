/*jslint node: true */
"use strict";

var css     = require('css'),
    csso    = require('csso'),
    cheerio = require('cheerio'),
    path    = require('path'),
    _       = require('underscore'),
    utility = require('./lib.js');

/**
 * Main exposed function
 * @param  {Array}    files array of filenames
 * @param  {Object}   opt       options
 * @param  {Function} cb        callback
 * @return {String}             uncss'd css
 */
function uncss(files, opt, cb) {
    var callback,
        stylesheets,
        doms,
        options,
        parsed_css,
        used_css;

    /* If 'files' is a string, it should represent an HTML page. */
    if (typeof files === 'string') {
        doms = [files];
    } else {
        doms = utility.mapReadFiles(files);
    }
    if (typeof opt === 'function') {
        /* There were no options,
         *  this argument is really the callback
         */
        options = {};
        callback = opt;
    } else if (typeof opt === 'object' && typeof cb === 'function') {
        options = opt;
        callback = cb;
    } else {
        throw 'TypeError: expected a callback';
    }

    options.csspath = (typeof options.csspath === 'string') ? options.csspath : '';

    /* Parse the HTML. */
    doms = doms.map(function (dom) {
        return cheerio.load(dom);
    });

    if (options.stylesheets && options.stylesheets.length > 0) {
        stylesheets = options.stylesheets;
    } else {

        /* Extract the stylesheets from the HTML */
        stylesheets = doms.map(function (html) {
            return utility.extract_stylesheets(html);
        });

        if (_.flatten(stylesheets).length === 0) {
            /* Could not extract a css file */
            callback('');
            return;
        }

        /* Now we have:
         *  files       = ['some_file.html', 'some_other_file.html']
         *  stylesheets = [['relative_css_path.css', ...],
         *                 ['maybe_a_duplicate.css', ...]]
         * We need to - make the stylesheets' paths relative to the HTML files,
         *            - flatten the array,
         *            - remove duplicates
         */
        stylesheets = stylesheets.map(function (arr, i) {
            return arr.map(function (el) {
                var p = path.join(path.dirname(files[i]), options.csspath, el);
                return p;
            });
        });
        stylesheets = _.flatten(stylesheets);
        stylesheets = stylesheets.filter(function (e, i, arr) {
            return arr.lastIndexOf(e) === i;
        });
    }

    /* Read the stylesheets and parse the CSS */
    stylesheets  = utility.mapReadFiles(stylesheets);
    parsed_css = css.parse(stylesheets.join('\n'));

    /* Remove unused rules and return the stylesheets to strings */
    used_css = utility.filterUnusedRules(doms, parsed_css.stylesheet, options.ignore);
    used_css = css.stringify(used_css);
    /*  Minify? */
    if (options.compress) {
        used_css = csso.justDoIt(used_css);
    }
    callback(used_css);
}

module.exports = uncss;
