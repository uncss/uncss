/*jslint node: true, plusplus: true */
(function () {
    "use strict";
    var compressor = require('csso'),
        fs         = require('fs'),
        htmlparser = require('htmlparser'),
        parse_css  = require('css-parse'),
        deferred   = require('deferred'),
        soupselect = require('soupselect').select,

        /* Promisify functions */
        readFile   = deferred.promisify(fs.readFile),
        writeFile  = deferred.promisify(fs.writeFile),

        /* Member variables */
        options,
        parsed_css,
        parser,
        parser_handler,
        uncss = '';

    function rule_to_css(decl) {
        return decl.map(function (d) {
            return '\t' + d.property + ': ' + d.value + ';';
        }).join('\n') + '\n';
    }

    /* The bulk of the work happens here */
    parser_handler = new htmlparser.DefaultHandler(function (error, dom) {
        if (error) {
            throw error;
        } else {
            /* HTML parsed successfully, proceed with css
             *  Two steps: remove the unused selectors from the selector array
             *             filter the rules with no selectors (i.e. the rule was not used)
             */
            var i,
                minify,
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
            minify = options.compress || false;
            uncss = compressor.justDoIt(uncss, minify);
        }
    });

    module.exports = function (files, opt, callback) {
        var css_files = files.filter(function (file) {
                return (/\.css$/).test(file);
            }),
            html_files = files.filter(function (file) {
                return (/\.html$/).test(file);
            });

        options        = opt;
        parser         = new htmlparser.Parser(parser_handler);

        /* Parse all the CSS files in series, and concatenate them */
        return deferred.map(css_files, function (filename) {
            return readFile(filename, 'utf-8');
        }).then(function (css_file_contents) {
            parsed_css = parse_css(css_file_contents.join('\n'));
        }).then(deferred.map(html_files, function (filename) {
            return readFile(filename, 'utf-8');
        })).then(function (html_file_contents) {
            /* Parse the HTML and, again, contcatenate all the files */
            parser.parseComplete(html_file_contents.join('\n'));
        }).end(function () {
            callback(uncss);
        }, function (error) {
            /* TODO: handle errors */
        });
    };
}());