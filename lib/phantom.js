'use strict';

var async   = require('async'),
    fs      = require('fs'),
    phantom = require('node-phantom-simple'),
    _       = require('underscore'),
    /* PhantomJS */
    phantomPath = require('phantomjs').path,
    instances;

/**
 * Return the PhantomJS instance in {instances} that has the least amount of pages open.
 */
function getNextFree() {
    return instances.sort(function (x, y) {
        return x.numPages - y.numPages;
    })[0];
}

/**
 * Create the PhantomJS instances, or use the given ones.
 * @param  {Number}   numThreads     The max number of instances to start
 * @param  {Array}    instance_array The instances to use, if there are any
 * @param  {Function} callback(Error)
 */
function init(numThreads, instance_array, callback) {
    if (instance_array) {
        instances = instance_array;
        return callback(null);
    }
    numThreads = Math.min(numThreads, require('os').cpus().length) || 1;
    instances = new Array(numThreads);

    return async.whilst(
        function () { return numThreads > 0; },
        function (done) {
            phantom.create(function (err, ph) {
                if (err) {
                    return done(err);
                }
                instances.push({
                    instance: ph,
                    numPages: 0
                });
                --numThreads;
                return done(null);
            }, {
                phantomPath: phantomPath,
                parameters: {'ignore-ssl-errors': 'yes'}
            });
        },
        callback
    );
}

/**
 * Close the open PhantomJS instances.
 */
function exit() {
    return instances.forEach(function (obj) {
        obj.instance.exit();
    });
}

/**
 * Load a page given an HTML string.
 * @param  {String}   html
 * @param  {Number}   timeout
 * @param  {Function} callback(Error, Page)
 */
function fromRaw(html, timeout, callback) {
    var next_free = getNextFree();
    next_free.instance.createPage(function (err, page) {
        if (err) {
            return callback(err);
        }
        next_free.numPages++;
        page.set('content', html, function () {
            setTimeout(function () {
                return callback(err, page);
            }, timeout);
        });
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
    var next_free = getNextFree();
    return next_free.instance.createPage(function (err, page) {
        if (err) {
            return callback(err);
        }
        next_free.numPages++;
        page.open(url, function (err, status) {
            if (status !== 'success') {
                return callback(err);
            }
            setTimeout(function () {
                return callback(err, page);
            }, timeout);
        });
    });
}

/**
 * Extract stylesheets' hrefs from dom
 * @param {Array}    dom      List of DOMs loaded by cheerio
 * @param {Object}   options  Options, as passed to UnCSS
 * @param {Function} callback
 */
function getStylesheets(page, options, callback) {
    var media = _.union(['', 'all', 'screen'], options.media);
    return page.evaluate(
        function () {
            /* jshint browser: true */
            return Array.prototype.map.call(document.querySelectorAll('link[rel="stylesheet"]'), function (link) {
                return { href: link.href, media: link.media };
            });
            /* jshint browser: false */
        },
        function (err, stylesheets) {
            stylesheets = _
                .toArray(stylesheets)
                /* Match only specified media attributes, plus defaults */
                .filter(function (sheet) {
                    return media.indexOf(sheet.media) !== -1;
                })
                .map(function (sheet) {
                    return sheet.href;
                });
            return callback(err, stylesheets);
        }
    );
}

/**
 * Filter unused selectors.
 * @param  {Object}   page      A PhantomJS page
 * @param  {Array}    selectors List of selectors to be filtered
 * @param  {Function} callback(Error, Array)
 */
function findAll(page, selectors, callback) {
    page.evaluate(
        function (selectors) {
            /* jshint browser: true */
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
        },
        function (err, res) {
            if (err) {
                return callback(err);
            }
            if (res === null) {
                return callback(err, res);
            }
            return callback(err, res.selectors);
        },
        selectors
    );
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
