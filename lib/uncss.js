'use strict';

var async   = require('async'),
    css     = require('css'),
    cheerio = require('cheerio'),
    path    = require('path'),
    url     = require('url'),
    utility = require('./lib.js'),
    _       = require('underscore');

/**
 * This function does all the heavy-lifting
 * @param  {[type]}   files    List of HTML files
 * @param  {[type]}   doms     List of DOMS loaded by PhantomJS
 * @param  {[type]}   options  Options passed to the program
 * @param  {Function} callback Should accept an array of strings
 */
function uncss(files, doms, options, callback) {
    var stylesheets,
        ignore_css,
        used_css;

    /* Parse the HTML. */
    doms = doms.map(function (dom) {
        return cheerio.load(dom);
    });

    if (options.stylesheets && options.stylesheets.length > 0) {
        /* Simulate the behavior below */
        stylesheets = [options.stylesheets];
    } else {
        /* Extract the stylesheets from the HTML */
        stylesheets = doms.map(function (html) {
            return utility.extract_stylesheets(html, options);
        });
    }
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
                var u, p;
                if (files[i].match(/^http/)) {
                    u = url.parse(files[i]);
                    p = u.protocol + '//' + u.host;
                    /* If the href to the stylesheet is an absolute path, we
                     *   use it directly.
                     * If it starts with a / we use the host as the base url
                     * otherwise we use the current path of the url as the
                     *   base url
                     */
                    if (el.substr(0, 4) === 'http') {
                        p = el;
                    } else if (el.substr(0, 2) === '//') {
                        p = 'http:' + el;
                    } else if (el[0] === '/') {
                        p += el;
                    } else {
                        p += path.join(u.pathname, el);
                    }
                } else {
                    if (el.substr(0, 4) !== 'http') {
                        p = path.join(path.dirname(files[i]), options.csspath, el);
                    } else {
                        p = el;
                    }
                }
                return p;
            });
        });
        stylesheets = _.flatten(stylesheets);
        stylesheets = stylesheets.filter(function (e, i, arr) {
            return arr.lastIndexOf(e) === i;
        });
    } else {
        /* Reset the array if we didn't find any link tags */
        stylesheets = [];
    }

    stylesheets = utility.mapReadFiles(stylesheets, function (err, stylesheets) {
        if (err) {
            return callback(err);
        }
        /* If we specified a raw string of CSS, add it to the stylesheets array */
        if (options.raw) {
            if (typeof options.raw === 'string') {
                stylesheets.push(options.raw);
            } else {
                return callback('UnCSS: options.raw - expected a string');
            }
        }

        /* At this point, there isn't any point in running the rest of the task if:
         * - We didn't specify any stylesheet links in the options object
         * - We couldn't find any stylesheet links in the HTML itself
         * - We weren't passed a string of raw CSS in addition to, or to replace
         *     either of the above
         */
        if (_.flatten(stylesheets).length === 0) {
            callback('UnCSS: no stylesheets found');
            return;
        }

        /* OK, so we have some CSS to work with!
         * Three steps:
         * - Parse the CSS
         * - Remove the unused rules
         * - Return the optimized CSS as a string
         */
        var css_str = stylesheets.join(' \n');
        var parsed = css.parse(css_str);
        var used_css = utility.filterUnusedRules(doms, parsed.stylesheet, options.ignore);

        callback(null, css.stringify(used_css) + '\n');
    });

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

    if (typeof opt === 'function') {
        /* There were no options, this argument is actually the callback */
        options = {};
        callback = opt;
    } else if (typeof opt === 'object' && typeof cb === 'function') {
        options = opt;
        callback = cb;
    } else {
        throw new TypeError('UnCSS: expected a callback');
    }

    /* Assign default values to options, unless specified */
    options.csspath = options.csspath || '';
    options.ignore  = options.ignore || [];
    options.media   = options.media || [];
    options.timeout = options.timeout || 0;  // By default, it exits when all js is executed

    var process = function (doms) {
        async.map(
            doms,
            function (f, oncomplete) {
                return utility.phantom_eval(f, options.timeout, oncomplete);
            },
            function (err, res) {
                if (err) {
                    return callback(err);
                }
                uncss(files, res, options, callback);
            }
        );
    };
    /* If 'files' is a string, it should represent an HTML page. */
    if (typeof files === 'string') {
        doms = [files];
        files = [''];
        uncss(files, doms, options, callback);
    } else {
        if (opt.urls && opt.urls.length > 0) {
            files = _.union(files, opt.urls);
        }
        process(files);
    }

}

// TODO: This might be counterintuitive
module.exports = init;
