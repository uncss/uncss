'use strict';

var path = require('path'),
    phridge = require('phridge'),
    promise = require('bluebird'),
    utility = require('./utility'),
    _ = require('lodash');

var phantom;

/**
 * Create the PhantomJS instances, or use the given one.
 * @param  {Object}  instance   The instance to use, if there is one
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
    }).disposer(phridge.disposeAll);
}

/**
 * This function is called whenever a resource is requested by PhantomJS.
 * If we are loading either raw HTML or a local page, PhantomJS needs to be able to find the
 *   resource with an absolute path.
 * There are two possible cases:
 *   - 'file://': This might be either a protocol-less URL or a relative path. Since we
 *                can't handle both, we choose to handle the former.
 *   - 'file:///': This is an absolute path. If options.htmlroot is specified, we have a chance to
 *                 redirect the request to the correct location.
 */
function ResourceHandler(htmlroot, isWindows, resolve) {
    var ignoredExtensions = ['\\.css', '\\.png', '\\.gif', '\\.jpg', '\\.jpeg', ''],
        ignoredEndpoints = ['fonts\\.googleapis'];

    var ignoreRequests = new RegExp(ignoredExtensions.join('$|') + ignoredEndpoints.join('|'));

    this.onResourceRequested = function (requestData, networkRequest) {
        var originalUrl = requestData.url,
            url = originalUrl.split('?')[0].split('#')[0];

        if (url.substr(-3) === '.js' && url.substr(0, 7) === 'file://') {
            /* Try and match protocol-less URLs and absolute ones.
             * Relative URLs will still not load.
             */
            if (url.substr(5, 3) === '///') {
                /* Absolute URL
                 * Retry loading the resource appending the htmlroot option
                 */
                if (isWindows) {
                    /* Do not strip leading '/' */
                    url = originalUrl.substr(0, 8) + htmlroot + originalUrl.substr(7);
                } else {
                    url = originalUrl.substr(0, 7) + htmlroot + originalUrl.substr(7);
                }
            } else {
                /* Protocol-less URL */
                url = 'http://' + originalUrl.substr(7);
            }
            networkRequest.changeUrl(url);
        } else if (ignoreRequests.test(url)) {
            networkRequest.abort();
        }
    };
    resolve();
}

/**
 * Helper for fromRaw, fromLocal, fromRemote;
 * return the phantom page after the timeout
 * has elapsed
 * @param  {phantom} page    Page created by phantom
 * @param  {Object} options
 * @return {promise}
 */
function resolveWithPage(page, options) {
    return function () {
        return new promise(function (resolve) {
            setTimeout(function () {
                return resolve(page);
            }, options.timeout);
        });
    };
}

/**
 * Load a page given an HTML string.
 * @param  {String}  html
 * @param  {Object}  options
 * @return {promise}
 */
function fromRaw(html, options) {
    var page = phantom.createPage(),
        htmlroot = path.join(process.cwd(), options.htmlroot || '');

    return page.run(htmlroot, utility.isWindows(), ResourceHandler).then(function () {
        return page.run(html, function (raw) {
            this.setContent(raw, 'local');
        });
    }).then(resolveWithPage(page, options));
}

/**
 * Open a page given a filename.
 * @param  {String}  filename
 * @param  {Object}  options
 * @return {promise}
 */
function fromLocal(filename, options) {
    var page = phantom.createPage(),
        htmlroot = path.join(process.cwd(), options.htmlroot || '');

    return page.run(htmlroot, utility.isWindows(), ResourceHandler).then(function () {
        return page.run(filename, function (source, resolve, reject) {
            this.open(source, function (status) {
                if (status !== 'success') {
                    return reject(new Error('PhantomJS: Cannot open ' + this.url));
                }
                resolve();
            });
        });
    }).then(resolveWithPage(page, options));
}

/**
 * Open a page given a URL.
 * @param  {String}  url
 * @param  {Object}  options
 * @return {promise}
 */
function fromRemote(url, options) {
    /* If the protocol is unspecified, default to HTTP */
    if (!/^http/.test(url)) {
        url = 'http:' + url;
    }

    return phantom.openPage(url).then(function (page) {
        return resolveWithPage(page, options)();
    });
}

/**
 * Extract stylesheets' hrefs from dom
 * @param  {Object}  page       A PhantomJS page
 * @param  {Object}  options    Options, as passed to UnCSS
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
 * @param  {Object}  page   A PhantomJS page
 * @param  {Array}   sels   List of selectors to be filtered
 * @return {promise}
 */
function findAll(page, sels) {
    return page.run(sels, function (args) {
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
        }, args);
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
