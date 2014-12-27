'use strict';

var fs = require('fs'),
    phridge = require('phridge'),
    promise = require('bluebird'),
    _ = require('lodash');

var phantom;

/**
 * Close the open PhantomJS instances.
 */
function exit() {
    return phridge.disposeAll();
}

/**
 * Create the PhantomJS instances, or use the given one.
 * @param  {Object}  instance The instance to use, if there is one
 * @return {promise}
 */
function init(instance) {
    if (instance) {
        phantom = instance;
        return null;
    }

    // Convert to bluebird promise
    return new promise(function (resolve) {
        resolve(phridge.spawn({
            ignoreSslErrors: 'yes',
            sslProtocol: 'any'
        }));
    }).then(function (ph) {
        phantom = ph;
    }).disposer(function () {
        return exit();
    });
}

/**
 * Load a page given an HTML string.
 * @param  {String}  html
 * @param  {Number}  timeout
 * @return {promise}
 */
function fromRaw(html, timeout) {
    var page = phantom.createPage();

    return page.run(html, function (html) {
        this.setContent(html, 'local');
    }).then(function () {
        return new promise(function (resolve) {
            setTimeout(function () {
                return resolve(page);
            }, timeout);
        });
    });
}

/**
 * Open a page given a filename.
 * @param  {String}  filename
 * @param  {Number}  timeout
 * @return {promise}
 */
function fromLocal(filename, timeout) {
    return promise.promisify(fs.readFile)(filename, 'utf-8').then(function (html) {
        return fromRaw(html, timeout);
    });
}

/**
 * Open a page given a URL.
 * @param  {String}  url
 * @param  {Number}  timeout
 * @return {promise}
 */
function fromRemote(url, timeout) {
    /* If the protocol is unspecified, default to HTTP */
    if (!/^http/.test(url)) {
        url = 'http:' + url;
    }

    return phantom.openPage(url).then(function (page) {
        return new promise(function (resolve) {
            setTimeout(function () {
                return resolve(page);
            }, timeout);
        });
    });
}

/**
 * Extract stylesheets' hrefs from dom
 * @param  {Object}  page    A PhantomJS page
 * @param  {Object}  options Options, as passed to UnCSS
 * @return {promise}
 */
function getStylesheets(page, options) {
    if (_.isArray(options.media) === false) {
        options.media = [options.media];
    }
    var media = _.union(['', 'all', 'screen'], options.media);
    return page.run(function () {
        /* jshint browser: true */
        /* eslint-env browser */
        return this.evaluate(function () {
            return Array.prototype.map.call(document.querySelectorAll('link[rel="stylesheet"]'), function (link) {
                return { href: link.href, media: link.media };
            });
        });
        /* jshint browser: false */
    }).then(function (stylesheets) {
        stylesheets = _
            .toArray(stylesheets)
            /* Match only specified media attributes, plus defaults */
            .filter(function (sheet) {
                return media.indexOf(sheet.media) !== -1;
            })
            .map(function (sheet) {
                return sheet.href;
            });
        return stylesheets;
    });
}

/**
 * Filter unused selectors.
 * @param  {Object}  page      A PhantomJS page
 * @param  {Array}   selectors List of selectors to be filtered
 * @return {promise}
 */
function findAll(page, selectors) {
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
            return [];
        }
        return res.selectors;
    });
}

module.exports = {
    init: init,
    fromLocal: fromLocal,
    fromRaw: fromRaw,
    fromRemote: fromRemote,
    findAll: findAll,
    getStylesheets: getStylesheets
};
