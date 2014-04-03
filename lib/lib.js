'use strict';

var async   = require('async'),
    fs      = require('fs'),
    path    = require('path'),
    phantom = require('./phantom.js'),
    request = require('request'),
    url     = require('url'),
    _       = require('underscore');

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
 * @param {Array}    files    an array of the filenames to read
 * @param {Function} callback(Error, Array)
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
            return done(new Error('UnCSS: could not open ' + path.join(process.cwd(), filename)));
        }
    }, callback);
}

/* Some styles are applied only with user interaction, and therefore its
 *   selectors cannot be used with querySelectorAll.
 * Additionally, we should check for vendor-specific selectors, but that
 *   would slow down the regex replacing too much.
 *   (there are > 300 vendor-specific properties according to
 *    http://peter.sh/experiments/vendor-prefixed-css-property-overview/).
 *   We just simply skip over them.
 * http://www.w3.org/TR/2001/CR-css3-selectors-20011113/
 */
var dePseudify = (function () {
    var ignored_pseudos = [
            /* link */
            ':link', ':visited',
            /* user action */
            ':hover', ':active', ':focus',
            /* UI element states */
            ':enabled', ':disabled', ':checked', ':indeterminate',
            /* pseudo elements */
            '::first-line', '::first-letter', '::selection', '::before', '::after',
            /* CSS2 pseudo elements */
            ':before', ':after'
        ],
        pseudos_regex = new RegExp(ignored_pseudos.join('|'), 'g');

    return function (selector) {
        return selector.replace(pseudos_regex, '');
    };
}());

/**
 * Private function used in filterUnusedRules.
 * @param  {Array} pages          List of PhantomJS pages
 * @param  {Array} selectors      CSS selectors created by the CSS parser
 * @param  {Array} ignore         List of selectors to be ignored
 * @param  {Array} used_selectors List of Selectors found in {pages}
 * @return {Array}                The selectors matched in the DOMs
 */
function filterUnusedSelectors(pages, selectors, ignore, used_selectors) {
    /* There are some selectors not supported for matching, like
     *   :before, :after
     * They should be removed only if the parent is not found.
     * Example: '.clearfix:before' should be removed only if there
     *          is no '.clearfix'
     */
    var i = 0;
    return selectors.filter(function (selector) {
        selector = dePseudify(selector);
        /* TODO: process @-rules */
        if (selector[0] === '@') {
            return true;
        }
        for (i = 0; i < ignore.length; ++i) {
            /* If ignore is RegExp and matches selector ... */
            if (_.isRegExp(ignore[i]) && ignore[i].test(selector)) {
                return true;
            }
            if (ignore[i] === selector) {
                return true;
            }
        }
        return used_selectors.indexOf(selector) !== -1;
    });
}

/**
 * Filter rules with no selectors remaining
 * @param  {Array} rules
 * @return {Array}
 */
function filterEmptyRules(rules) {
    return rules.filter(function (rule) {
        if (rule.type === 'rule') {
            return rule.selectors.length > 0;
        }
        /* Filter media queries with no remaining rules */
        if (rule.type === 'media') {
            rule.rules = filterEmptyRules(rule.rules);
            return rule.rules.length > 0;
        }
        return true;
    });
}

/**
 * Find which selectors are used in {pages}
 * @param {Array}    pages          List of PhantomJS pages
 * @param {Object}   stylesheet     The output of css.parse().stylesheet
 * @param {Function} callback(Error, Array)
 * @param {Boolean}  isRec          Used internally
 */
function getUsedSelectors(page, stylesheet, callback, isRec) {
    return async.concat(
        stylesheet.rules,
        function (rule, done) {
            if (rule.type === 'rule') {
                return done(null, rule.selectors);
            } else if (rule.type === 'media') {
                return getUsedSelectors(page, rule, done, true);
            }
            return done(null, []);
        },
        function (err, selectors) {
            if (err) {
                return callback(err);
            }
            if (isRec) {
                return callback(err, selectors);
            }
            return phantom.findAll(page, selectors.map(dePseudify), callback);
        }
    );
}

/**
 * Get all the selectors mentioned in {stylesheet}
 * @param  {Object} stylesheet The output of css.parse().stylesheet
 * @return {Array}
 */
function getAllSelectors(stylesheet) {
    /* TODO: Temporary hack */
    return stylesheet.rules.reduce(function (memo, rule) {
        if (rule.type === 'rule') {
            return memo.concat(rule.selectors);
        } else if (rule.type === 'media') {
            return memo.concat(getAllSelectors(rule));
        } else if(rule.type === 'keyframes') {
            return memo.concat('keyframes-' + rule.name);
        } else if (rule.type === 'comment') {
            return memo;
        }
        return memo.concat(rule);
    }, []);
}

/**
 * Remove css rules not used in the dom
 * @param  {Array}  pages          List of PhantomJS pages
 * @param  {Object} stylesheet     The output of css.parse().stylesheet
 * @param  {Array}  ignore         List of selectors to be ignored
 * @param  {Array}  used_selectors List of selectors that are found in {pages}
 * @return {Object}                A css_parse-compatible stylesheet
 */
function filterUnusedRules(pages, stylesheet, ignore, used_selectors) {
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
            rule.selectors = filterUnusedSelectors(
                pages,
                rule.selectors,
                ignore,
                used_selectors
            );
        } else if (rule.type === 'media') {
            /* Recurse */
            rule.rules = filterUnusedRules(
                pages,
                { rules: rule.rules },
                ignore,
                used_selectors
            ).stylesheet.rules;
        }
    });

    /* Filter the rules with no selectors (i.e. the unused rules) */
    return { stylesheet: { rules: filterEmptyRules(rules) } };
}

/**
 * Main exposed function
 * @param {Array}    pages      list of PhantomJS pages
 * @param {Object}   stylesheet The output of css.parse().stylesheet
 * @param {Array}    ignore     List of selectors to be ignored
 * @param {Function} callback(Error, CSS)
 */
function uncss(pages, stylesheet, ignore, callback) {
    return async.concat(
        pages,
        function (page, done) {
            return getUsedSelectors(page, stylesheet, done);
        },
        function (err, used_selectors) {
            if (err) {
                return callback(err);
            }
            var processed = filterUnusedRules(pages, stylesheet, ignore, used_selectors);

            return callback(
                processed,
                /* Get the selectors for the report */
                {
                    all:  getAllSelectors(stylesheet),
                    used: used_selectors
                }
            );
        }
    );
}

module.exports = {
    parsePaths      : parsePaths,
    uncss           : uncss,
    readStylesheets : readStylesheets
};
