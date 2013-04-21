/*jslint node: true, plusplus: true, stupid: true */
/* Utility functions */
(function () {
    "use strict";

    var fs         = require('fs'),
        soupselect = require('soupselect').select,

        help = ' '                                             + '\n' +
               '    uncss [options] <file.html file.css ...>'  + '\n' +
               ' '                                             + '\n' +
               '  Options:'                                    + '\n' +
               ' '                                             + '\n' +
               '    -h, --help            output this message' + '\n' +
               '    -c, --compress        compress css';

    /**
     * Given an array of filenames, return an array of the files' contents,
     *  only if the filename matches a regex
     * @param {Array}  files An array of the filenames to read
     * @param {RegExp} regex The regex to test the filename against
     * @return {Array} Array Of the files' contents
     * @todo switch to async methods
     */
    function mapReadFile(files, regex) {
        return files
            .filter(function (file) {
                return regex.test(file);
            })
            .map(function (file) {
                if (fs.existsSync(file)) {
                    return fs.readFileSync(file);
                }
                /* File does not exist */
                throw 'Error: no such file or directory ' + file;
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
                rule.rules = filterUnusedRules(dom, { rules: rule.rules }).rules;
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

        return { rules: rules };
    }

    /**
     * Find if an options appear on the command line
     * @param  {Array}  options The command line arguments
     * @param  {[type]}  str    The command to test, in its long form
     * @return {Boolean}        If the command was found
     */
    function isInCommandLine(options, str) {
        return options.indexOf(str) !== -1 ||
               options.indexOf(str[0] + str[2]) !== -1;
    }

    /**
     * Show help string
     */
    function showHelp() {
        console.log(help);
    }

    module.exports.mapReadFile       = mapReadFile;
    module.exports.filterUnusedRules = filterUnusedRules;
    module.exports.isInCommandLine   = isInCommandLine;
    module.exports.showHelp          = showHelp;
}());