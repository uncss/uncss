'use strict';

const glob = require('glob'),
    isHTML = require('is-html'),
    isURL = require('is-absolute-url'),
    jsdom = require('./jsdom.js'),
    path = require('path'),
    postcss = require('postcss'),
    uncss = require('./lib.js'),
    utility = require('./utility.js'),
    _ = require('lodash');

/**
 * Get the contents of HTML pages through jsdom.
 * @param  {Array}   files   List of HTML files
 * @param  {Object}  options UnCSS options
 * @return {Array|Promise}
 */
async function getHTML(files, options) {
    if (_.isString(files)) {
        files = [files];
    }

    files = _.flatten(
        files.map(file => {
            if (!isURL(file) && !isHTML(file)) {
                return glob.sync(file).map(match => match.split('/').join(path.sep));
            }
            return file;
        })
    );

    if (!files.length) {
        throw new Error('UnCSS: no HTML files found');
    }

    // Save files for later reference.
    options.files = files;
    return Promise.all(files.map(file => jsdom.fromSource(file, options)));
}

/**
 * Get the contents of CSS files.
 * @param  {Array}   files   List of HTML files
 * @param  {Object}  options UnCSS options
 * @param  {Array}   pages   Pages opened by jsdom
 * @return {Promise}
 */
async function getStylesheets(files, options, pages) {
    if (options.stylesheets && options.stylesheets.length) {
        /* Simulate the behavior below */
        return [files, options, pages, [options.stylesheets]];
    }

    /* Extract the stylesheets from the HTML */
    const stylesheets = await Promise.all(pages.map(page => jsdom.getStylesheets(page.window, options)));

    return [files, options, pages, stylesheets];
}

/**
 * Get the contents of CSS files.
 * @param  {Array}   files       List of HTML files
 * @param  {Object}  options     UnCSS options
 * @param  {Array}   pages       Pages opened by jsdom
 * @param  {Array}   stylesheets List of CSS files
 * @return {Promise<Array>}
 */
function getCSS([files, options, pages, stylesheets]) {
    /* Ignore specified stylesheets */
    if (options.ignoreSheets.length) {
        stylesheets = stylesheets.map(arr => {
            return arr.filter(sheet => {
                return _.every(options.ignoreSheets, ignore => {
                    if (_.isRegExp(ignore)) {
                        return !ignore.test(sheet);
                    }
                    return sheet !== ignore;
                });
            });
        });
    }

    if (_.flatten(stylesheets).length) {
        /* Only run this if we found links to stylesheets (there may be none...)
         *  files       = ['some_file.html', 'some_other_file.html']
         *  stylesheets = [['relative_css_path.css', ...],
         *                 ['maybe_a_duplicate.css', ...]]
         * We need to - make the stylesheets' paths relative to the HTML files,
         *            - flatten the array,
         *            - remove duplicates
         */
        stylesheets = _.chain(stylesheets)
            .map((sheets, i) => utility.parsePaths(files[i], sheets, options))
            .flatten()
            .uniq()
            .value();
    } else {
        /* Reset the array if we didn't find any link tags */
        stylesheets = [];
    }
    return Promise.all([options, pages, utility.readStylesheets(stylesheets, options.banner)]);
}

/**
 * Do the actual work
 * @param  {Array}   files       List of HTML files
 * @param  {Object}  options     UnCSS options
 * @param  {Array}   pages       Pages opened by jsdom
 * @param  {Array}   stylesheets List of CSS files
 * @return {Promise}
 */
async function processWithTextApi([options, pages, stylesheets]) {
    /* If we specified a raw string of CSS, add it to the stylesheets array */
    if (options.raw) {
        if (_.isString(options.raw)) {
            stylesheets.push(options.raw);
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
    if (!_.flatten(stylesheets).length) {
        throw new Error('UnCSS: no stylesheets found');
    }

    /* OK, so we have some CSS to work with!
     * Three steps:
     * - Parse the CSS
     * - Remove the unused rules
     * - Return the optimized CSS as a string
     */
    const cssStr = stylesheets.join(' \n');
    let pcss, report;

    try {
        pcss = postcss.parse(cssStr);
    } catch (err) {
        /* Try and construct a helpful error message */
        throw utility.parseErrorMessage(err, cssStr);
    }

    const [css, rep] = await uncss(pages, pcss, options.ignore, options.ignoreHtmlClasses);
    let newCssStr = '';
    postcss.stringify(css, result => {
        newCssStr += result;
    });

    if (options.report) {
        report = {
            original: cssStr,
            selectors: rep,
        };
    }
    return [newCssStr, report];
}

/**
 * Main exposed function.
 * Here we check the options and callback, then run the files through jsdom.
 * @param  {Array}    files     Array of filenames
 * @param  {Object}   [options] options
 * @param  {Function} callback  (Error, String, Object)
 */
function init(files, options, callback) {
    if (!options && !callback) {
        options = {};
    }

    if (_.isFunction(options)) {
        /* There were no options, this argument is actually the callback */
        callback = options;
        options = {};
    }

    /* Try and read options from the specified uncssrc file */
    if (options.uncssrc) {
        try {
            /* Manually-specified options take precedence over uncssrc options */
            options = _.merge(utility.parseUncssrc(options.uncssrc), options);
        } catch (err) {
            const wrappedErr =
                err instanceof SyntaxError ? new SyntaxError('UnCSS: uncssrc file is invalid JSON.') : err;

            if (callback) {
                return callback(wrappedErr);
            }

            throw wrappedErr;
        }
    }

    /* Assign default values to options, unless specified */
    options = _.merge(
        {
            banner: true,
            csspath: '',
            html: files,
            htmlRoot: null,
            ignore: [],
            ignoreHtmlClasses: [],
            ignoreSheets: [],
            inject: null,
            jsdom: jsdom.defaultOptions(),
            media: [],
            raw: null,
            report: false,
            stylesheets: null,
            timeout: 0,
            uncssrc: null,
            userAgent: 'uncss',
        },
        options
    );

    const resultPromise = process(options);
    if (!callback) {
        return resultPromise.then(([css, report]) => ({ css, report }));
    }

    resultPromise.then(([css, report]) => callback(null, css, report), callback);
}

function processAsPostCss(options, pages) {
    return uncss(pages, options.rawPostCss, options.ignore, options.ignoreHtmlClasses);
}

async function process(opts) {
    const pages = await getHTML(opts.html, opts);
    const cleanup = result => {
        pages.forEach(page => page.window.close());
        return result;
    };

    if (opts.usePostCssInternal) {
        return processAsPostCss(opts, pages).then(cleanup);
    }

    return getStylesheets(opts.files, opts, pages)
        .then(getCSS)
        .then(processWithTextApi)
        .then(cleanup);
}

const postcssPlugin = postcss.plugin('uncss', opts => css => {
    const options = _.merge(
        {
            usePostCssInternal: true,
            // Ignore stylesheets in the HTML files; only use those from the stream
            ignoreSheets: [/\s*/],
            html: [],
            ignore: [],
            ignoreHtmlClasses: [],
            jsdom: jsdom.defaultOptions(),
        },
        opts,
        // This is used to pass the css object in to processAsPostCSS
        {
            // This is used to pass the css object in to processAsPostCSS
            rawPostCss: css,
            // TODO: Investigate why we need a timeout only for PostCSS
            timeout: opts.timeout || 100,
        }
    );

    return process(options);
});

module.exports = init;
module.exports.postcssPlugin = postcssPlugin;
