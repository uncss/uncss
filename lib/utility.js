/*jslint node: true, plusplus: true, stupid: true */

"use strict";

var fs         = require('fs'),
    soupselect = require('soupselect').select,

    help = ' '                                             + '\n' +
           '    uncss [options] <file.html file.css ...>'  + '\n' +
           ' '                                             + '\n' +
           '  Options:'                                    + '\n' +
           ' '                                             + '\n' +
           '    -h, --help            output help message' + '\n' +
           '    -c, --compress        compress css';

/**
 * Given an array of filenames, return an array of the files' contents,
 *  only if the filename matches a regex
 * @param {Array}  files An array of the filenames to read
 * @return {Array} Array Of the files' contents
 * @todo use async methods
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
 * Remove css rules not used in the dom
 * @param  {Object} dom        The output of htmlparser
 * @param  {Array}  stylesheet The output of css.parse().stylesheet
 * @return {Array}             Only the rules matched in the dom
 */
function filterUnusedRules(dom, stylesheet) {
    var rules = stylesheet.rules;

    /* Rule format:
     *  { selectors: [ '...', '...' ],
     *    declarations: [ { property: '...', value: '...' } ]
     *  },
     * Two steps: filter the unused selectors for each rule,
     *            filter the rules with no selectors
     */
    rules.forEach(function (rule) {
        if (rule.selectors) {
            /* Filter the unused selectors */
            rule.selectors = rule.selectors.filter(function (selector) {
                return soupselect(dom, selector).length > 0;
            });
        } else if (rule.media) {
            rule.rules = filterUnusedRules(dom, { rules: rule.rules }).stylesheet.rules;
        }
    });
    rules = rules.filter(function (rule) {
        /* Filter the rules with no selectors (i.e. the unused rules) */
        if (rule.selectors && rule.selectors.length === 0) {
            return false;
        }
        if (rule.media && rule.rules.length === 0) {
            return false;
        }
        return true;
    });

    return { stylesheet: { rules: rules } };
}

/**
 * Show help string
 */
function showHelp() {
    console.log(help);
}

module.exports.mapReadFiles      = mapReadFiles;
module.exports.filterUnusedRules = filterUnusedRules;
module.exports.showHelp          = showHelp;
