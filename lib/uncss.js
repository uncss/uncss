'use strict';

var async   = require('async'),
    css     = require('css'),
    lib     = require('./lib.js'),
    glob    = require('glob'),
    isHTML  = require('is-html'),
    phantom = require('./phantom.js'),
    fs      = require('fs'),
    _       = require('underscore');

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

    files = _.flatten(files.map(function(file) {
        if (!isURL(file) && !isHTML(file)) {
            return glob.sync(file);
        }
        return file;
    }));

    return async.map(
        files,
        function (filename, onComplete) {
            if (isURL(filename)) {
                return phantom.fromRemote(filename, options.timeout, onComplete);
            }
            if (fs.existsSync(filename)) {
                return phantom.fromLocal(filename, options.timeout, onComplete);
            }
            //raw HTML
            return phantom.fromRaw(filename, options.timeout, function (err, res) {
                return callback(err, [''], [res], options);
            });

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
    }
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
        var zeroLine = 0; /* Base line for conveying the line number in the error message */

        if (err.line) {
            var lines = css_str.split('\n');
            if (lines.length > 0) {
                // We get the filename of the css file that contains the error
                var i = err.line - 1;
                while (i >= 0 && !err.filename) {
                    if (lines[i].substr(0,21) === '/*** uncss> filename:') {
                        err.filename = lines[i].substring(22, lines[i].length - 4);
                        zeroLine = i;
                    }
                    i--;
                }

                for (var j = err.line - 6; j < err.line + 5; j++) {
                    if (j - zeroLine < 0 || j >= lines.length) {
                    continue;
                }
                var line = lines[j];
                /* It could be minified CSS */
                if (line.length > 120 && err.column) {
                    line = line.substring(err.column - 40, err.column);
                }
                err.message += '\n\t' + (j + 1 - zeroLine) + ':    ';
                err.message += (j === err.line - 1) ? ' -> ' : '    ';
                err.message += line;
              }
            }
        }
        if(zeroLine > 0) {
            err.message = err.message.replace(/[0-9]+:/, (err.line - zeroLine) + ':');
        }
        err.message = 'uncss/node_modules/css: unable to parse ' + err.filename + ':\n' + err.message + '\n';
        return callback(err);
    }
    return lib.uncss(pages, parsed.stylesheet, options.ignore, function (err, used_css, selectors) {
        if (err) {
            return callback(err);
        }
        if (options.report) {
            report = {
                original: css_str,
                selectors: selectors,
                unused: used_css.unused
            };
        }
        return callback(null, css.stringify(used_css) + '\n', report);
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
