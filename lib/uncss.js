/*jslint node: true, plusplus: true, stupid: true */
(function () {
    "use strict";
    var compressor = require('csso'),
        fs         = require('fs'),
        htmlparser = require('htmlparser'),
        parse_css  = require('css-parse'),
        soupselect = require('soupselect').select,

        /* Member variables */
        callback,
        options,
        parsed_css;

    function rule_to_css(decl) {
        return decl.map(function (d) {
            return '\t' + d.property + ': ' + d.value + ';';
        }).join('\n') + '\n';
    }

    /* The bulk of the work happens here */
    function on_htmlparse_complete(error, dom) {
        if (error) {
            throw error;
        } else {
            /* HTML parsed successfully, proceed with css
             *  Two steps: remove the unused selectors from the selector array
             *             filter the rules with no selectors (i.e. the rule was not used)
             */
            var i,
                minify,
                uncss = '',
                used_rules = parsed_css.stylesheet.rules.map(function (rule) {
                    /* This is the syntax of css-parse
                     *  rule = {
                     *      "selectors": [ ... ],
                     *      "declarations": [ ... ]
                     *  }
                     *  
                     */
                    if (rule.selectors) {
                        var used_selectors = rule.selectors.filter(function (selector) {
                            return (soupselect(dom, selector).length > 0);
                        });
                        /* Case 1: 
                         * rule = {
                         *      "selectors": ['a', 'c'],
                         *      "declarations": [ ... ]
                         *  }
                         *
                         * Case 2:
                         * rule = {
                         *      "selectors": [],
                         *      "declarations": [ ... ]
                         * }
                         */
                        if (used_selectors.length > 0) {
                            /* Case 1 */
                            return {
                                'selectors': used_selectors,
                                'declarations': rule.declarations
                            };
                        }
                    }
                    /* Case 2, or rule isn't a selector array (for example, a comment) */
                    return {};

                }).filter(function (rule) {
                    return rule.selectors !== undefined;
                });

            for (i = 0; i < used_rules.length; i++) {
                uncss += used_rules[i].selectors.join(', ') +
                         ' {\n' +
                         rule_to_css(used_rules[i].declarations) +
                         '}\n';
            }
            /* Compress CSS */
            minify = options.minify || false;
            if (minify) {
                uncss = compressor.justDoIt(uncss);
            }
            callback(uncss);
        }
    }

    module.exports = function (files, opt, cb) {
        var css_files,
            html_files,
            parser,
            parser_handler;

        if (typeof opt === 'function') {
            /* There were no options,
             *  this argument is really the callback
             */
            options = {};
            callback = opt;
        } else if (typeof opt === 'object' && typeof cb === 'function') {
            options = opt;
            callback = cb;
        } else {
            throw 'TypeError: expected a callback';
        }

        /* Replace the files with their contents
         *  first filter non-html/css files,
         *  then map the filename to its contents.
         */
        css_files = files.filter(function (file) {
            return (/\.css$/).test(file);
        }).map(function (file) {
            if (fs.existsSync(file)) {
                return fs.readFileSync(file);
            }
            /* File does not exist */
            throw 'Error: Couldn\'t open "' + file + '"';
        });
        html_files = files.filter(function (file) {
            return (/\.html$/).test(file);
        }).map(function (file) {
            if (fs.existsSync(file)) {
                return fs.readFileSync(file);
            }
            /* File does not exist */
            throw 'Error: Couldn\'t open "' + file + '"';
        });
        /* Concatenate all the stylesheets, and pass them to the css parser. */
        parsed_css = parse_css(css_files.join('\n'));
        /* Init the html parser, and feed it the concatenated html files
         *  (it works even if it isn't valid html)
         */
        parser_handler = new htmlparser.DefaultHandler(on_htmlparse_complete);
        parser = new htmlparser.Parser(parser_handler);
        parser.parseComplete(html_files.join('\n'));
    };
}());