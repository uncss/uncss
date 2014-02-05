'use strict';

var async   = require('async'),
    css     = require('css'),
    cheerio = require('cheerio'),
    lib     = require('./lib.js'),
    phantom = require('./phantom.js'),
    _       = require('underscore');

/**
 * Get the contents of HTML pages through PhantomJS.
 * @param  {Object}   options  options passed to uncss
 * @param  {Array}    files    files to evaluate
 * @param  {Function} callback(error, filenames, HTML, options)
 */
function getHTML(options, files, callback) {
    phantom.init(function (err) {
        if (err) {
            return callback(err);
        }
        if (typeof files === 'string') {
            return phantom.fromRaw(files, options.timeout, function (err, res) {
                phantom.exit();
                return callback(err, [''], [res], options);
            });
        }
        /* Deprecated */
        if (options.urls && options.urls.length > 0) {
            files = _.union(files, options.urls);
        }
        return async.mapSeries(
            files,
            function (filename, onComplete) {
                if (/^https?/.test(filename)) {
                    return phantom.fromRemote(filename, options.timeout, onComplete);
                }
                return phantom.fromLocal(filename, options.timeout, onComplete);
            }, function (err, res) {
                phantom.exit();
                return callback(err, files, res, options);
            }
        );
    });
}

/**
 * Get the contents of CSS files.
 * @param  {Array}    files    list of filenames (used to get CSS paths)
 * @param  {Array}    html     list of HTML files (used to extract <link>s)
 * @param  {Object}   options  options passed to uncss
 * @param  {Function} callback(error, doms, stylesheets, options)
 */
function getCSS(files, html, options, callback) {
    var doms, stylesheets;

    /* Parse the HTML. */
    doms = html.map(function (dom) {
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
    return lib.readStylesheets(stylesheets, function (err, stylesheets) {
        return callback(err, doms, stylesheets, options);
    });
}

/**
 * Do the actual work
 * @param  {Array}    doms        list of doms loaded by Cheerio
 * @param  {Array}    stylesheets list of CSS files
 * @param  {Object}   options     options passed to uncss
 * @param  {Function} callback(error, used_css, report)
 */
function process(doms, stylesheets, options, callback) {
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
            original : Buffer.byteLength(css_str),
            tidy     : Buffer.byteLength(used_css)
        };
    }

    return callback(null, used_css + '\n', report);
}

/**
 * Main exposed function.
 * Here we check the options and callback, then run the files through PhantomJS.
 * @param  {Array}    files array of filenames
 * @param  {Object}   opt   options
 * @param  {Function} cb    callback
 */
function uncss(files, opt, cb) {
    var callback,
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
    options.csspath        = options.csspath       || '';
    options.ignore         = options.ignore        || [];
    options.media          = options.media         || [];
    options.timeout        = options.timeout       || 0;
    options.report         = options.report        || false;
    options.ignoreSheets   = options.ignoreSheets  || [];

    async.waterfall(
        [
            getHTML.bind(null, options, files),
            getCSS,
            process
        ],
        function (err, used_css, report) {
            /* This last function could be just "callback", but we do not want
             *   to invoke the callback with all parameters if there is an
             *   error, because the other parameters would be async's partial
             *   functions. Someone could forget checking if UnCSS reports an
             *   error, and wonder why it returns a function.
             */
            if (err) {
                return callback(err);
            }
            return callback(null, used_css, report);
        }
    );
}

module.exports = uncss;
