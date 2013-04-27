/*jslint node: true */
"use strict";

var css        = require('css'),
    csso       = require('csso'),
    htmlparser = require('htmlparser2'),
    path       = require('path'),
    utility    = require('./utility.js');

/**
 * Extract stylesheets' hrefs from dom
 * @param  {Array} dom  output of htmlparser2
 * @param  {Array}  memo array of memoized matches, initially undefined
 * @return {Array}       array of hrefs
 */
function extract_css(dom, memo) {
    var i, node;
    if (memo === undefined) {
        memo = [];
    }
    for (i = 0; i < dom.length; i++) {
        node = dom[i];
        if (node.name === 'link') {
            memo.push(node.attribs.href);
        }
        if (node.children) {
            extract_css(node.children, memo);
        }
    }
    return memo;
}

/**
 * Main exposed function
 * @param  {Array}    files array of filenames
 * @param  {Object}   opt       options
 * @param  {Function} cb        callback
 * @return {String}             uncss'd css
 */
function uncss(files, opt, cb) {
    var callback,
        css_files,
        doms,
        handler,
        options,
        parsed_css,
        parser,
        used_css;

    /* If 'files' is a string, it should represent an HTML page. */
    if (typeof files === 'string') {
        doms = [files];
    } else {
        doms = utility.mapReadFiles(files);
    }
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

    handler = new htmlparser.DomHandler();
    parser = new htmlparser.Parser(handler);
    /* Do the parsing.
     *  This is a hack around the way htmlparser2 works.
     *  every time write is called, it appends the result to
     *  the already-parsed dom. Therefore, we need to deep-copy the
     *  result each step, and reset the parser afterwards.
     */
    doms = doms.map(function (d) {
        var ret;
        parser.write(d);
        parser.end();
        ret = [].concat(handler.dom);
        parser.reset();
        return ret;
    });

    /* Extract the stylesheets from the HTML */
    css_files = doms.map(function (html) { return extract_css(html); });

    if (css_files[0].length === 0) {
        /* Could not extract a css file */
        callback('');
    } else {
        /* Now we have:
         *  files     = ['some_file.html', 'some_other_file.html']
         *  css_files = [['relative_css_path.css', ...], ['maybe_a_duplicate.css', ...]]
         * We need to - make the paths relative to the current one, 
         *            - flatten the array,
         *            - remove duplicates
         */
        css_files = css_files.map(function (arr, i) {
            return arr.map(function (el) {
                return path.join(path.dirname(files[i]), el);
            });
        });
        css_files = css_files.concat.apply([], css_files);
        css_files = css_files.filter(function (e, i, arr) {
            return arr.lastIndexOf(e) === i;
        });

        css_files  = utility.mapReadFiles(css_files);
        parsed_css = css.parse(css_files.join('\n'));

        doms = doms.concat.apply([], doms);
        used_css = utility.filterUnusedRules(doms, parsed_css.stylesheet);

        used_css = css.stringify(used_css, { compress: options.compress || false });

        /*  Minify? */
        if (options.compress) {
            used_css = csso.justDoIt(used_css);
        }

        callback(used_css);
    }
}

module.exports = uncss;