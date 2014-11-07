'use strict';

var fs      = require('fs'),
    phridge = require('phridge'),
    _       = require('underscore');

var phantom;

/**
 * Create the PhantomJS instances, or use the given ones.
 * @param  {Array}    instanceArray  The instance to use, if there is one
 * @param  {Function} callback(Error)
 */
function init(instanceArray, callback) {
    if (instanceArray) {
        phantom = instanceArray;
        return callback(null);
    }

    return phridge.spawn({
        ignoreSslErrors: 'yes',
        sslProtocol: 'any'
    }).then(function (ph) {
        phantom = ph;
        return callback(null);
    }).catch(function (err) {
        return callback(err);
    });
}

/**
 * Close the open PhantomJS instances.
 */
function exit() {
    return phantom.dispose();
}

/**
 * Load a page given an HTML string.
 * @param  {String}   html
 * @param  {Number}   timeout
 * @param  {Function} callback(Error, Page)
 */
function fromRaw(html, timeout, callback) {
    var page = phantom.createPage();

    return page.run(html, function (html) {
        this.setContent(html, 'local');
    }).then(function () {
        setTimeout(function () {
            return callback(null, page);
        }, timeout);
    }).catch(function (err) {
        return callback(err);
    });
}

/**
 * Open a page given a filename.
 * @param  {String}   filename
 * @param  {Number}   timeout
 * @param  {Function} callback(Error, Page)
 */
function fromLocal(filename, timeout, callback) {
    return fs.readFile(filename, 'utf-8', function (err, html) {
        if (err) {
            return callback(err);
        }
        return fromRaw(html, timeout, callback);
    });
}

/**
 * Open a page given an URL.
 * @param  {String}   url
 * @param  {Number}   timeout
 * @param  {Function} callback(Error, Page)
 */
function fromRemote(url, timeout, callback) {
    phantom.openPage(url).then(function (page) {
        setTimeout(function () {
            return callback(null, page);
        }, timeout);
    }).catch(function (err) {
        return callback(err);
    });
}

/**
 * Extract stylesheets' hrefs from dom
 * @param {Array}    dom      List of DOMs loaded by cheerio
 * @param {Object}   options  Options, as passed to UnCSS
 * @param {Function} callback
 */
function getStylesheets(page, options, callback) {
    if (_.isArray(options.media) === false) {
        options.media = [options.media];
    }
    var media = _.union(['', 'all', 'screen'], options.media);
    return page.run(
        function () {
            /* jshint browser: true */
            return this.evaluate(function () {
                return Array.prototype.map.call(document.querySelectorAll('link[rel="stylesheet"]'), function (link) {
                    return { href: link.href, media: link.media };
                });
            });
            /* jshint browser: false */
        }).then(
        function (stylesheets) {
            stylesheets = _
                .toArray(stylesheets)
                /* Match only specified media attributes, plus defaults */
                .filter(function (sheet) {
                    return media.indexOf(sheet.media) !== -1;
                })
                .map(function (sheet) {
                    return sheet.href;
                });
            return callback(null, stylesheets);
        }
    ).catch(function (err) {
        return callback(err);
    });
}

/**
 * Filter unused selectors.
 * @param  {Object}   page      A PhantomJS page
 * @param  {Array}    selectors List of selectors to be filtered
 * @param  {Function} callback(Error, Array)
 */
function findAll(page, selectors, callback) {
    return page.run(selectors, function (selectors) {
        return this.evaluate(function (selectors) {
            /* jshint browser: true */
            // Unwrap noscript elements
            Array.prototype.forEach.call(document.getElementsByTagName('noscript'), function (ns) {
                var wrapper = document.createElement('div');
                wrapper.innerHTML = ns.innerText;
                // Insert each child of the <noscript> as its sibling
                Array.prototype.forEach.call(wrapper.children, function (child) {
                    ns.parentNode.insertBefore(child, ns);
                });
            });
            // Do the filtering
            selectors = selectors.filter(function (selector) {
                try {
                    if (document.querySelector(selector)) {
                        return true;
                    }
                } catch (e) {
                    return true;
                }
            });
            return {
                selectors: selectors
            };
            /* jshint browser: false */
        }, selectors);
    }).then(function (res) {
        if (res === null) {
            return callback(null, []);
        }
        return callback(null, res.selectors);
    }).catch(function (err) {
        return callback(err);
    });
}

module.exports = {
    exit       : exit,
    init       : init,
    fromLocal  : fromLocal,
    fromRaw    : fromRaw,
    fromRemote : fromRemote,
    findAll    : findAll,
    getStylesheets: getStylesheets
};
