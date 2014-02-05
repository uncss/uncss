'use strict';

var async   = require('async'),
    fs      = require('fs'),
    path    = require('path'),
    phantom = require('phantomjs'),
    request = require('request'),
    url     = require('url'),
    _       = require('underscore');

/**
 * Run a page through phantomjs
 * @param  {String}   filename The name of the HTML page
 * @param  {Number}   timeout  How much to wait for JS evaluation
 * @param  {Function} callback
 * @return {String}            The contents of the files, as seen by Phantom
 */
function phantomEval(filename, timeout, callback) {
    var childArgs = [
            path.join(__dirname, 'phantom-script.js'),
            filename,
            timeout
        ],
        buffer = '',
        error = '';

    var instance = require('child_process').spawn(phantom.path, childArgs);
    instance.stdout.setEncoding('utf8');
    instance.stderr.setEncoding('utf8');

    instance.stdout.on('data', function (data) {
        buffer += data;
    });
    instance.stderr.on('data', function (error) {
        /* Ignore PhantomJS 1.9.2 OSX errors */
        var bufferStr = error + '',
            isNot192OSXError = bufferStr.indexOf('WARNING: Method userSpaceScaleFactor') === -1,
            isNotPerformanceNote = bufferStr.indexOf('CoreText performance note:') === -1;

        if (isNot192OSXError && isNotPerformanceNote) {
            error += bufferStr;
        }
    });
    instance.on('close', function (code) {
        if (code === 0 && error === '') {
            callback(null, buffer);
        } else {
            callback(error);
        }
    });
}

/**
 * Parse paths relatives to a source.
 * @param  {String} source      Where the paths originate from
 * @param  {Array}  stylesheets List of paths
 * @param  {Object} options     Options, as passed to UnCSS
 * @return {Array}              List of paths
 */
function parsePaths(source, stylesheets, options) {
    return stylesheets.map(function (sheet) {
        var _url, _path, _protocol;

        if (sheet.substr(0, 4) === 'http') {
            /* No need to parse, it's already a valid path */
            return sheet;
        }

        /* Check if we are fetching over http(s) */
        if (source.match(/^http/)) {
            _url      = url.parse(source);
            _protocol = _url.protocol;
        }

        if (sheet.substr(0, 2) === '//') {
            /* Use the same protocol we used for fetching this page.
             * Default to http.
             */
            return (_protocol ? _protocol + sheet : 'http:' + sheet);
        }

        if (_url) {
            /* Let the url module handle the parsing */
            _path = url.resolve(source, sheet);
        } else {
            /* We are fetching local files
             * Should probably report an error if we find an absolute path and
             *   have no htmlroot specified.
             */

            /* Fix the case when there is a query string or hash */
            sheet = sheet.split('?')[0].split('#')[0];
            if (sheet[0] === '/' && options.htmlroot) {
                _path = path.join(options.htmlroot, sheet);
            } else {
                _path = path.join(path.dirname(source), options.csspath, sheet);
            }
        }
        return _path;
    });
}

/**
 * Given an array of filenames, return an array of the files' contents,
 *   only if the filename matches a regex
 * @param {Array} files An array of the filenames to read
 * @param {Function} callback
 */
function readStylesheets(files, callback) {
    return async.map(files, function (filename, done) {
        if (filename.match(/^http/)) {
            request(
                filename,
                { headers: {'User-Agent': 'UnCSS'} },
                function (err, res, body) {
                    if (err) {
                        return done(err);
                    }
                    return done(null, body);
                }
            );
        } else {
            if (fs.existsSync(filename)) {
                return fs.readFile(filename, 'utf8', done);
            }
            return done('UnCSS: could not open ' + path.join(process.cwd(), filename));
        }
    }, callback);
}

/**
 * Extract stylesheets' hrefs from dom
 * @param  {Array}  dom     List of DOMs loaded by cheerio
 * @param  {Object} options Options, as passed to UnCSS
 * @return {Array}          Array of hrefs
 */
function extractStylesheets(dom, options) {
    var media = _.union(['screen', 'all'], options.media),
        stylesheets;

    stylesheets = dom('link[rel="stylesheet"]');

    return _
        /* Stylesheets is not an array, but an object whose elements are indexes */
        .toArray(stylesheets)
        /* Match only specified media attributes, plus defaults */
        .filter(function (sheet) {
            return sheet.attribs.media === undefined ||
                   media.indexOf(sheet.attribs.media) !== -1;
        })
        .map(function (sheet) {
        return sheet.attribs.href;
    });
}

/**
 * Private function used in filterUnusedRules.
 * @param  {Object} doms      List of DOMs loaded by cheerio
 * @param  {Array}  selectors CSS selectors created by the CSS parser
 * @param  {Array}  ignore    List of selectors to be ignored
 * @return {Array}            The selectors matched in the DOMs
 */
function filterUnusedSelectors(doms, selectors, ignore) {
    /* There are some selectors not supported for matching, like
     *   :before, :after
     * They should be removed only if the parent is not found.
     * Example: '.clearfix:before' should be removed only if there
     *          is no '.clearfix'
     */
    return selectors.filter(function (selector) {
        var match, i, j, temp;
        /* Don't process @-rules (for now?) */
        if (selector[0] === '@') {
            return true;
        }
        if (ignore.indexOf(selector) !== -1) {
            return true;
        }
        // Issue #7 check regex ignores
        for (j = 0; j < ignore.length; ++j) {
            // if ignore is RegExp and matches selector ...
            if (_.isRegExp(ignore[j]) && ignore[j].test(selector)) {
                return true;
            }
        }
        /*jshint -W083 */
        /* For each DOM, match the selector */
        for (i = 0; i < doms.length; ++i) {
            /* Another way would be to list all the unsupported pseudos */
            try {
                match = doms[i](selector);
            } catch (e) {
                /* Remove ':' pseudos. */
                temp =
                    selector
                    /* Remove comments */
                    .replace(/\/\*.*?\*\//)
                    /* Ignore quoted spaces (a:hover > [class*=" icon-"])
                     *                                          ^        */
                    .match(/(?:[^\s"]+|"[^"]*")+/g)
                    /* Ignore quoted ':' (a[href="javascript:"]:hover)
                     *                                      ^         */
                    .map(function (str) {
                        return str.match(/(?:[^ :"]+|"[^"]*")+/g)[0];
                    })
                    .join(' ');
                /* istanbul ignore next: need examples */
                try {
                    match = doms[i](temp);
                } catch(e) {
                    /* Gracefully give up */
                    return true;
                }
            }
            if (match.length !== 0) {
                return true;
            }
        }
        /*jshint +W083 */
        return false;
    });
}

/**
 * Remove css rules not used in the dom
 * @param  {Object} doms       List of DOMs loaded by cheerio
 * @param  {Object} stylesheet The output of css.parse().stylesheet
 * @param  {Array}  ignore     List of selectors to be ignored
 * @return {Array}             The rules matched in the dom
 */
function filterUnusedRules(doms, stylesheet, ignore) {
    var rules = stylesheet.rules;
    /* Rule format:
     *  { selectors: [ '...', '...' ],
     *    declarations: [ { property: '...', value: '...' } ]
     *  },
     * Two steps: filter the unused selectors for each rule,
     *            filter the rules with no selectors
     */
    rules.forEach(function (rule) {
        if (rule.type === 'rule') {
            rule.selectors =
                filterUnusedSelectors(doms, rule.selectors, ignore);
        } else if (rule.type === 'media') {
            /* Recurse */
            rule.rules = filterUnusedRules(
                doms,
                { rules: rule.rules },
                ignore
            ).stylesheet.rules;
        }
    });

    rules = rules.filter(function (rule) {
        /* Filter the rules with no selectors (i.e. the unused rules) */
        if (rule.type === 'rule' && rule.selectors.length === 0) {
            return false;
        }
        /* Filter media queries with no remaining rules */
        if (rule.type === 'media' && rule.rules.length === 0) {
            return false;
        }
        return true;
    });
    return { stylesheet: { rules: rules } };
}

module.exports = {
    extractStylesheets : extractStylesheets,
    filterUnusedRules  : filterUnusedRules,
    parsePaths         : parsePaths,
    readStylesheets    : readStylesheets,
    phantomEval        : phantomEval
};
