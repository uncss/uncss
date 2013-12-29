/*jslint node: true, plusplus: true, stupid: true */

"use strict";

var async = require('async'),
    child_process = require('child_process'),
    fs = require('fs'),
    path = require('path'),
    phantom = require('phantomjs');

/**
 * Run a page through phantomjs
 * @param  {String}   Filename The name of the HTML page
 * @param  {Function} Callback
 * @return {String}            The contents of the files, as seen by Phantom
 */
function phantom_eval(filename, timeout, callback) {
    var childArgs = [
            path.join(__dirname, 'phantom-script.js'),
            filename,
            timeout
        ],
        page,
        buffer = '',
        error = '';

    page = child_process.spawn(phantom.path, childArgs);
    page.stdout.setEncoding('utf8');
    page.stderr.setEncoding('utf8');

    page.stdout.on('data', function (data) {
        buffer += data;
    });

    page.stderr.on('data', function (data) {
        error += data;
    });

    page.on('close', function (code) {
        if (code === 0 && error === '') {
            callback(buffer);
        } else {
            console.log(error);
            process.exit(1);
        }
    });
}

/**
 * Given an array of filenames, return an array of the files' contents,
 *  only if the filename matches a regex
 * @param {Array}  files An array of the filenames to read
 * @return {Array} Array Of the files' contents
 * @TODO use async methods
 */
function mapReadFiles(files) {
    return files.map(function (filename) {
        if (fs.existsSync(filename)) {
            return fs.readFileSync(filename, 'utf8');
        }
        console.log('Error: could not find: ' + filename);
        process.exit();
    });
}

/**
 * Extract stylesheets' hrefs from dom
 * @param  {Array} dom  List of DOMs loaded by cheerio
 * @return {Array}      array of hrefs
 */
function extract_stylesheets(dom) {
    var stylesheets = dom('link[rel="stylesheet"]');
    /* Stylesheets is not an array, but an object whose elements are indexes */
    return stylesheets.map(function (x) {
        return stylesheets[x].attribs.href;
    }).filter(function (str) {
        return str.indexOf('//') === -1;
    });
}

/**
 * Private function used in filterUnusedRules.
 * @param  {Object}  doms      List of DOMs loaded by cheerio
 * @param  {Array}   selectors CSS selectors created by the CSS parser
 * @return {Array}             The selectors matched in the DOMs
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
            if (toString.call(ignore[j]) === '[object RegExp]'
                    && ignore[j].test(selector)) {
                return true;
            }
        }

        /* For each DOM, match the selector */
        for (i = 0; i < doms.length; ++i) {
            /* Another way would be to list all the unsupported pseudos */
            try {
                match = doms[i](selector);
            } catch (e) {
                /* Remove ':' pseudos.
                 * TODO: check all possible cases
                 */
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
                    }).join(' ');
                match = doms[i](temp);
            }
            if (match.length !== 0) {
                return true;
            }
        }
        return false;
    });
}

/**
 * Remove css rules not used in the dom
 * @param  {Object}  doms       List of DOMs loaded by cheerio
 * @param  {Object}  stylesheet The output of css.parse().stylesheet
 * @return {Array}              The rules matched in the dom
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

module.exports.phantom_eval = phantom_eval;
module.exports.mapReadFiles = mapReadFiles;
module.exports.extract_stylesheets = extract_stylesheets;
module.exports.filterUnusedRules = filterUnusedRules;
