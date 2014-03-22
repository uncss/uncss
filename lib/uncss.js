'use strict';

var async   = require('async'),
    css     = require('css'),
    lib     = require('./lib.js'),
    phantom = require('./phantom.js'),
    _       = require('underscore');

/**
 * Get the contents of HTML pages through PhantomJS.
 * @param  {Object}   options  options passed to uncss
 * @param  {Array}    files    files to evaluate
 * @param  {Function} callback(Error, Array, Array, Object)
 */
function getHTML(options, files, callback) {
    if (typeof files === 'string') {
        return phantom.fromRaw(files, options.timeout, function (err, res) {
            return callback(err, [''], [res], options);
        });
    }
    /* Deprecated */
    if (options.urls && options.urls.length > 0) {
        files = _.union(files, options.urls);
    }
    return async.map(
        files,
        function (filename, onComplete) {
            if (/^https?/.test(filename)) {
                return phantom.fromRemote(filename, options.timeout, onComplete);
            }
            return phantom.fromLocal(filename, options.timeout, onComplete);
        }, function (err, res) {
            return callback(err, files, res, options);
        }
    );
}

/**
 * Get the contents of CSS files.
 * @param  {Array}    files    list of filenames (used to get CSS paths)
 * @param  {Array}    pages    list of PhantomJS pages (used to extract <link>s)
 * @param  {Object}   options  options passed to uncss
 * @param  {Function} callback(Error, Array, Array, Object)
 */
function getStylesheets(files, pages, options, callback) {
    if (options.stylesheets && options.stylesheets.length > 0) {
        /* Simulate the behavior below */
        return callback(null, files, pages, [options.stylesheets], options);
    } else {
        /* Extract the stylesheets from the HTML */
        return async.map(
            pages,
            function (page, done) {
                return phantom.getStylesheets(page, options, done);
            },
            function (err, stylesheets) {
                return callback(err, files, pages, stylesheets, options);
            }
        );
    }
}

/**
 * Get the contents of CSS files.
 * @param  {Array}    files    list of filenames (used to get CSS paths)
 * @param  {Array}    pages    list of PhantomJS pages (used to extract <link>s)
 * @param  {Object}   options  options passed to uncss
 * @param  {Function} callback(Error, Array, Array, Object)
 */
function getCSS(files, pages, stylesheets, options, callback) {
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
        return callback(err, pages, stylesheets, options);
    });
}

/**
 * Do the actual work
 * @param  {Array}    pages    list of PhantomJS pages
 * @param  {Array}    stylesheets list of CSS files
 * @param  {Object}   options     options passed to uncss
 * @param  {Function} callback(Error, String, Object)
 */
function uncss(pages, stylesheets, options, callback) {
    /* If we specified a raw string of CSS, add it to the stylesheets array */
    if (options.raw) {
        if (typeof options.raw === 'string') {
            stylesheets.push(options.raw);
        } else {
            return callback(new Error('UnCSS: options.raw - expected a string'));
        }
    }

    /* At this point, there isn't any point in running the rest of the task if:
     * - We didn't specify any stylesheet links in the options object
     * - We couldn't find any stylesheet links in the HTML itself
     * - We weren't passed a string of raw CSS in addition to, or to replace
     *     either of the above
     */
    if (_.flatten(stylesheets).length === 0) {
        return callback(new Error('UnCSS: no stylesheets found'));
    }

    /* OK, so we have some CSS to work with!
     * Three steps:
     * - Parse the CSS
     * - Remove the unused rules
     * - Return the optimized CSS as a string
     */
    var css_str = stylesheets.join(' \n'),
        parsed, report;

    try {
        parsed = css.parse(css_str);
    } catch (err) {
        /* Try to construct an helpful error message */
        if (err.line) {
            var line = css_str.split('\n')[err.line - 1];
            /* It could be minified CSS */
            if (line.length > 40 && err.column) {
                line = line.substring(err.column - 40, err.column);
            }
            err.message += '\n     -> ' + line.substring(0, 40);
        }
        err.message = 'uncss/node_modules/css: ' + err.message;
        return callback(err);
    }
    return lib.uncss(pages, parsed.stylesheet, options.ignore, function (used_css, selectors) {
        used_css = css.stringify(used_css);
        if (options.report) {
            report = {
                original: css_str,
                selectors: selectors
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
 * @param  {Function} cb(Error, String, Object)
 */
function init(files, opt, cb) {
    var callback,
        options,
        numThreads;

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

    if (typeof files === 'string') {
        numThreads = 1;
    } else {
        numThreads = files.length;
    }

    async.waterfall(
        [
            phantom.init.bind(null, numThreads, options.phantom),
            getHTML.bind(null, options, files),
            getStylesheets,
            getCSS,
            uncss
        ],
        function (err, used_css, report) {
            phantom.exit();
            if (err) {
                return callback(err);
            }
            return callback(null, used_css, report);
        }
    );
}

module.exports = init;
