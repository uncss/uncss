'use strict';

var promise = require('bluebird'),
    fs      = promise.promisifyAll(require('fs')),
    isHTML  = require('is-html'),
    isURL   = require('./isURL'),
    path    = require('path'),
    request = promise.promisify(require('request')),
    url     = require('url');

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
        if (isURL(source)) {
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
                if (isHTML(source)) {
                    _path = path.join(options.csspath, sheet);
                } else {
                    _path = path.join(path.dirname(source), options.csspath, sheet);
                }
            }
        }
        return _path;
    });
}

/**
 * Given an array of filenames, return an array of the files' contents,
 *   only if the filename matches a regex
 * @param  {Array}   files an array of the filenames to read
 * @return {promise}
 */
function readStylesheets(files) {
    return promise.map(files, function (filename) {
        if (isURL(filename)) {
            return request({
                url: filename,
                headers: { 'User-Agent': 'UnCSS' }
            }).spread(function (response, body) {
                return body;
            });
        } else {
            if (fs.existsSync(filename)) {
                return fs.readFileAsync(filename, 'utf-8').then(function (contents) {
                    return contents;
                });
            } else {
                throw new Error('UnCSS: could not open ' + path.join(process.cwd(), filename));
            }
        }
    }).then(function (res) {
        // res is an array of the content of each file in files (in the same order)
        for(var i = 0; i < files.length; i++) {
            // We append a small banner to keep track of which file we are currently processing
            // super helpful for debugging
            var banner = '/*** uncss> filename: ' + files[i] + ' ***/\n';
            res[i] = banner + res[i];
        }
        return res;
    });
}

function parseErrorMessage(error, css_str) {
    /* Base line for conveying the line number in the error message */
    var zeroLine = 0;

    if (error.line) {
        var lines = css_str.split('\n');
        if (lines.length > 0) {
            /* We get the filename of the css file that contains the error */
            var i = error.line - 1;
            while (i >= 0 && !error.filename) {
                if (lines[i].substr(0,21) === '/*** uncss> filename:') {
                    error.filename = lines[i].substring(22, lines[i].length - 4);
                    zeroLine = i;
                }
                i--;
            }
            for (var j = error.line - 6; j < error.line + 5; j++) {
                if (j - zeroLine < 0 || j >= lines.length) {
                continue;
            }
            var line = lines[j];
            /* It could be minified CSS */
            if (line.length > 120 && error.column) {
                line = line.substring(error.column - 40, error.column);
            }
            error.message += '\n\t' + (j + 1 - zeroLine) + ':    ';
            error.message += (j === error.line - 1) ? ' -> ' : '    ';
            error.message += line;
          }
        }
    }
    if(zeroLine > 0) {
        error.message = error.message.replace(/[0-9]+:/, (error.line - zeroLine) + ':');
    }
    error.message = 'uncss/node_modules/css: unable to parse ' + error.filename + ':\n' + error.message + '\n';
    return error;
}

module.exports = {
    parseErrorMessage : parseErrorMessage,
    parsePaths        : parsePaths,
    readStylesheets   : readStylesheets
};
