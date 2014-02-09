'use strict';

var async   = require('async'),
    css     = require('css'),
    cheerio = require('cheerio'),
    lib     = require('./lib.js'),
    _       = require('underscore');

/**
 * This function does all the heavy-lifting
 * @param  {[type]}   files    List of HTML files
 * @param  {[type]}   doms     List of DOMS loaded by PhantomJS
 * @param  {[type]}   options  Options passed to the program
 * @param  {Function} callback Should accept an array of strings
 */
function uncss(files, doms, options, callback) {
    var stylesheets;

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
            return lib.extractStylesheets(html, options);
        });
    }
    /* Ignore specified stylesheets */
    if (options.ignoreSheets.length > 0) {
        stylesheets = stylesheets.map(function (arr) {
            return arr.filter(function (sheet) {
                return _.every(options.ignoreSheets, function (ignore) {
                    if (_.isRegExp(ignore)) {
                        return !ignore.test(sheet);
                    }
                    return sheet !== ignore;
                });
            });
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
        stylesheets =
            _.chain(stylesheets)
            .map(function (sheets, i) {
                return lib.parsePaths(files[i], sheets, options);
            })
            .flatten()
            .uniq()
            .value();
    } else {
        /* Reset the array if we didn't find any link tags */
        stylesheets = [];
    }

    stylesheets = lib.readStylesheets(stylesheets, function (err, stylesheets) {
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
            return callback('UnCSS: no stylesheets found');
        }

        /* OK, so we have some CSS to work with!
         * Three steps:
         * - Parse the CSS
         * - Remove the unused rules
         * - Return the optimized CSS as a string
         */
        var css_str = stylesheets.join(' \n'),
            parsed, used_css, report;

        try {
            parsed = css.parse(css_str);
        } catch (err) {
            /* Try to construct an helpful error message */
            if (err.line) {
                var line = css_str.split('\n')[err.line - 1];
                /* It could be minified CSS */
                if (line.length > 20 && err.column) {
                    line = line.substr(err.column - 10, err.column + 10);
                }
                err.message += '\n     -> ' + line;
            }
            err.message = 'uncss/node_modules/css: ' + err.message;
            return callback(err);
        }

        used_css = css.stringify(lib.filterUnusedRules(doms, parsed.stylesheet, options.ignore));

        if (options.report) {
            report = {
                original: css_str
            };
        }

        return callback(null, used_css + '\n', report);
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
    options.csspath      = options.csspath      || '';
    options.ignore       = options.ignore       || [];
    options.media        = options.media        || [];
    options.timeout      = options.timeout      || 0;
    options.report       = options.report       || false;
    options.ignoreSheets = options.ignoreSheets || [];

    /* If 'files' is a string, it should represent an HTML page. */
    if (typeof files === 'string') {
        doms = [files];
        files = [''];
        return uncss(files, doms, options, callback);
    } else {
        if (opt.urls && opt.urls.length > 0) {
            files = _.union(files, opt.urls);
        }
        return async.mapLimit(
            files,
            require('os').cpus().length,
            function (f, oncomplete) {
                return lib.phantomEval(f, options.timeout, oncomplete);
            },
            function (err, res) {
                if (err) {
                    return callback(err);
                }
                uncss(files, res, options, callback);
            }
        );
    }

}

module.exports = init;
