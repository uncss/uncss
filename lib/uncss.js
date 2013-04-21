/*jslint node: true */
"use strict";

var css        = require('css'),
    htmlparser = require('htmlparser'),
    utility    = require('./utility.js'),

    /* Member variables */
    callback,
    options,
    parsed_css;

/* Callback for htmlparse */
function on_htmlparse_complete(error, dom) {
    if (error) {
        throw error;
    } else {
        /* HTML parsed successfully, proceed with the removal of unused rules. */
        var uncss, used_css;

        used_css = { stylesheet: utility.filterUnusedRules(dom, parsed_css.stylesheet) };

        uncss = css.stringify(used_css, { compress: options.compress || false });
        callback(uncss);
    }
}

/**
 * Only exposed function
 * @param  {Array}    files array of files
 * @param  {Object}   opt   options
 * @param  {Function} cb    callback
 * @return {String}         uncss'd css
 */
function uncss(files, opt, cb) {
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
    css_files  = utility.mapReadFile(files, /\.css$/);
    html_files = utility.mapReadFile(files, /\.html$/);

    /* Concatenate all the stylesheets, and pass them to the css parser. */
    parsed_css = css.parse(css_files.join('\n'));
    /* Init the html parser, and feed it the concatenated html files
     *  (it works even if it isn't valid html)
     */
    parser_handler = new htmlparser.DefaultHandler(on_htmlparse_complete);
    parser = new htmlparser.Parser(parser_handler);
    parser.parseComplete(html_files.join('\n'));
}

module.exports = uncss;