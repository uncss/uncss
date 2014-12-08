'use strict';

var promise = require('bluebird'),
    css     = require('css'),
    fs      = require('fs'),
    glob    = require('glob'),
    isHTML  = require('is-html'),
    isURL   = require('./isURL'),
    uncss   = require('./lib.js'),
    phantom = require('./phantom.js'),
    utility = require('./utility.js'),
    _       = require('lodash');

// TODO: delete these (maybe use a wrapper {} and reduce)
var gFiles, gOptions, gPages;

/**
 * Get the contents of HTML pages through PhantomJS.
 * @return {promise}
 */
function getHTML() {

    if (_.isString(gFiles)) {
        return phantom.fromRaw(gFiles, gOptions.timeout).then(function (pages) {
            gPages = [pages];
        });
    }

    gFiles = _.flatten(gFiles.map(function(file) {
        if (!isURL(file) && !isHTML(file)) {
            return glob.sync(file);
        }
        return file;
    }));

    return promise.map(gFiles, function (filename) {
        if (isURL(filename)) {
            return phantom.fromRemote(filename, gOptions.timeout);
        }
        if (fs.existsSync(filename)) {
            return phantom.fromLocal(filename, gOptions.timeout);
        }
        //raw html
        return phantom.fromRaw(filename, gOptions.timeout);
    }).then(function (pages) {
        gPages = pages;
    });
}

/**
 * Get the contents of CSS files.
 * @return {promise}
 */
function getStylesheets() {
    if (gOptions.stylesheets && gOptions.stylesheets.length > 0) {
        /* Simulate the behavior below */
        return [gOptions.stylesheets];
    }
    /* Extract the stylesheets from the HTML */
    return promise.map(gPages, function (page) {
        return phantom.getStylesheets(page, gOptions);
    });
}

/**
 * Get the contents of CSS files.
 * @param  {Array}   stylesheets list of stylesheet paths
 * @return {promise}
 */
function getCSS(stylesheets) {
    /* Ignore specified stylesheets */
    if (gOptions.ignoreSheets.length > 0) {
        stylesheets = stylesheets.map(function (arr) {
            return arr.filter(function (sheet) {
                return _.every(gOptions.ignoreSheets, function (ignore) {
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
                return utility.parsePaths(gFiles[i], sheets, gOptions);
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
    if (gOptions.raw) {
        if (_.isString(gOptions.raw)) {
            stylesheets.push(gOptions.raw);
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
    var cssStr = stylesheets.join(' \n'),
        parsed, report;

    try {
        parsed = css.parse(cssStr);
    } catch (err) {
        /* Try and construct an helpful error message */
        throw utility.parseErrorMessage(err, cssStr);
    }
    return uncss(gPages, parsed.stylesheet, gOptions.ignore).then(function (res) {
        var usedCss = css.stringify(res[0]);
        if (gOptions.report) {
            report = {
                original: cssStr,
                selectors: res[1]
            };
        }
        return new promise(function (resolve) {
            resolve([usedCss + '\n', report]);
        });
    });
}

/**
 * Main exposed function.
 * Here we check the options and callback, then run the files through PhantomJS.
 * @param {Array}    files array of filenames
 * @param {Object}   [options]   options
 * @param {Function} callback(Error, String, Object)
 */
function init(files, options, callback) {

    if (_.isFunction(options)) {
        /* There were no options, this argument is actually the callback */
        callback = options;
        options = {};
    } else if (!_.isFunction(callback)) {
        throw new TypeError('UnCSS: expected a callback');
    }

    /* Assign default values to options, unless specified */
    options = _.defaults(options, {
        csspath      : '',
        ignore       : [],
        media        : [],
        timeout      : 0,
        report       : false,
        ignoreSheets : []
    });

    gFiles = files;
    gOptions = options;

    return promise
        .using(phantom.init(options.phantom), function () {
            return getHTML()
                .then(getStylesheets)
                .then(getCSS)
                .then(process);
        })
        .nodeify(callback, { spread: true });
}

module.exports = init;
