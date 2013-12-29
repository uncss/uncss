/*jslint node: true */
"use strict";

var async   = require('async'),
    css     = require('css'),
    cheerio = require('cheerio'),
    path    = require('path'),
    utility = require('./lib.js'),
    _       = require('underscore');

/**
 * This function does all the heavy-lifting
 * @param  {[type]}   files    List of HTML files
 * @param  {[type]}   doms     List of DOMS loaded by PhantomJS
 * @param  {[type]}   options  Options passed to the program
 * @param  {Function} callback
 */
function uncss(files, doms, options, callback) {
    var stylesheets,
        ignore_css,
        parsed_css,
        used_css;

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

        if (_.flatten(stylesheets).length !== 0) {
            /* Only run this if we found links to stylesheets (there may be none...)
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
            /* Read the stylesheets and parse the CSS */
            stylesheets = utility.mapReadFiles(stylesheets);
        } else {
            /* Reset the array if we didn't find any link tags */
            stylesheets = [];
        }
    }
    /* If we specified a raw string of CSS, add it to the stylesheets array */
    if (options.raw && typeof options.raw === 'string') {
        stylesheets.push(options.raw);
    }
    /* At this point, there isn't any point in running the rest of the task if:
     * - We didn't specify any stylesheet links in the options object
     * - We couldn't find any stylesheet links in the HTML itself
     * - We weren't passed a string of raw CSS in addition to, or to replace either of the above
    */
    if (_.flatten(stylesheets).length === 0) {
        callback('');
        return;
    }
    /* OK, so we have some CSS to work with! */
    parsed_css = css.parse(stylesheets.join('\n'));

    /* Do we have any CSS to ignore? */
    ignore_css = options.ignore || '';
    /* Remove unused rules and return the stylesheets to strings */
    used_css = utility.filterUnusedRules(doms, parsed_css.stylesheet, ignore_css);
    used_css = css.stringify(used_css);

    callback(used_css);
}

/**
 * Main exposed function.
 * Here we check the options and callback, then run the files through PhantomJS.
 * @param  {Array}    files array of filenames
 * @param  {Object}   opt   options
 * @param  {Function} cb    callback
 */
function init(files, opt, cb) {
    var callback,
        doms,
        options;

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

    async.map(
        doms,
        function (f, oncomplete) {
            return utility.phantom_eval(f, options.timeout, oncomplete);
        },
        function (res) {
            if (typeof res !== 'Array') {
                res = [res];
            }
            uncss(files, doms, options, callback);
        }
    );
}

// TODO: This might be counterintuitive
module.exports = init;
