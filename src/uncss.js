'use strict';

var promise = require('bluebird'),
    css     = require('css'),
    fs      = require('fs'),
    glob    = require('glob'),
    isHTML  = require('is-html'),
    uncss   = require('./lib.js'),
    phantom = require('./phantom.js'),
    utility = require('./utility.js'),
    _       = require('lodash');

// TODO: delete these (maybe use a wrapper {} and reduce)
var g_files, g_options, g_pages;

/**
 * Helper for checking whether the file is a URL or not
 * @param  {String}  url The string to check
 * @return {Boolean}     Is it a URL?
 */
function isURL(url) {
    return /^https?/.test(url);
}

/**
 * Get the contents of HTML pages through PhantomJS.
 * @return {promise}
 */
function getHTML() {

    if (typeof g_files === 'string') {
        return phantom.fromRaw(g_files, g_options.timeout).then(function (pages) {
            g_pages = [pages];
        });
    }

    g_files = _.flatten(g_files.map(function(file) {
        if (!isURL(file) && !isHTML(file)) {
            return glob.sync(file);
        }
        return file;
    }));

    return promise.map(g_files, function (filename) {
        if (isURL(filename)) {
            return phantom.fromRemote(filename, g_options.timeout);
        }
        if (fs.existsSync(filename)) {
            return phantom.fromLocal(filename, g_options.timeout);
        }
        //raw html
        return phantom.fromRaw(filename, g_options.timeout);
    }).then(function (pages) {
        g_pages = pages;
    });
}

/**
 * Get the contents of CSS files.
 * @return {promise}
 */
function getStylesheets() {
    if (g_options.stylesheets && g_options.stylesheets.length > 0) {
        /* Simulate the behavior below */
        return [g_options.stylesheets];
    }
    /* Extract the stylesheets from the HTML */
    return promise.map(g_pages, function (page) {
        return phantom.getStylesheets(page, g_options);
    });
}

/**
 * Get the contents of CSS files.
 * @param  {Array}   stylesheets list of stylesheet paths
 * @return {promise}
 */
function getCSS(stylesheets) {
    /* Ignore specified stylesheets */
    if (g_options.ignoreSheets.length > 0) {
        stylesheets = stylesheets.map(function (arr) {
            return arr.filter(function (sheet) {
                return _.every(g_options.ignoreSheets, function (ignore) {
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
                return utility.parsePaths(g_files[i], sheets, g_options);
            })
            .flatten()
            .uniq()
            .value();
    } else {
        /* Reset the array if we didn't find any link tags */
        stylesheets = [];
    }
    return utility.readStylesheets(stylesheets);
}

/**
 * Do the actual work
 * @param  {Array}   stylesheets list of CSS files
 * @return {promise}
 */
function process(stylesheets) {
    /* If we specified a raw string of CSS, add it to the stylesheets array */
    if (g_options.raw) {
        if (typeof g_options.raw === 'string') {
            stylesheets.push(g_options.raw);
        } else {
            throw new Error('UnCSS: options.raw - expected a string');
        }
    }

    /* At this point, there isn't any point in running the rest of the task if:
     * - We didn't specify any stylesheet links in the options object
     * - We couldn't find any stylesheet links in the HTML itself
     * - We weren't passed a string of raw CSS in addition to, or to replace
     *     either of the above
     */
    if (_.flatten(stylesheets).length === 0) {
        throw new Error('UnCSS: no stylesheets found');
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
        /* Try and construct an helpful error message */
        throw utility.parseErrorMessage(err, css_str);
    }
    return uncss(g_pages, parsed.stylesheet, g_options.ignore).then(function (res) {
        var used_css = css.stringify(res[0]);
        if (g_options.report) {
            report = {
                original: css_str,
                selectors: res[1]
            };
        }
        return new promise(function (resolve) {
            resolve([used_css + '\n', report]);
        });
    });
}

/**
 * Main exposed function.
 * Here we check the options and callback, then run the files through PhantomJS.
 * @param {Array}    files array of filenames
 * @param {Object}   opt   options
 * @param {Function} cb(Error, String, Object) Callback
 */
function init(files, opt, cb) {
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
    options.csspath      = options.csspath      || '';
    options.ignore       = options.ignore       || [];
    options.media        = options.media        || [];
    options.timeout      = options.timeout      || 0;
    options.report       = options.report       || false;
    options.ignoreSheets = options.ignoreSheets || [];

    g_files = files;
    g_options = options;

    return phantom.init(options.phantom)
        .then(getHTML)
        .then(getStylesheets)
        .then(getCSS)
        .then(process)
        .done(function (results) {
            phantom.exit().then(function () {
                return callback(null, results[0], results[1]);
            });
        }, function (err) {
            // TODO: error messages
            phantom.exit().then(function () {
                return callback(err);
            });
        });
}

module.exports = init;
