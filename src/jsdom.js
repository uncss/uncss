'use strict';

const jsdom = require('jsdom/lib/old-api.js'),
    path = require('path'),
    _ = require('lodash');

/**
 * Load a page.
 * @param  {String}  src
 * @param  {Object}  options
 * @return {Promise}
 */
function fromSource(src, options) {
    const config = {
        features: {
            FetchExternalResources: ['script'],
            ProcessExternalResources: ['script']
        },
        virtualConsole: jsdom.createVirtualConsole().sendTo(console),
        userAgent: options.userAgent
    };

    // The htmlroot option allows root-relative URLs (starting with a slash)
    // to be used for all resources. Without it, root-relative URLs are
    // looked up relative to file://, so will not be found.
    if (options.htmlroot) {
        config.resourceLoader = function(resource, callback) {
            // See whether raw attribute value is root-relative.
            const src = resource.element.getAttribute('src');
            if (src.indexOf('/') === 0) {
                resource.url.pathname = path.join(options.htmlroot, src);
            }

            return resource.defaultFetch(callback);
        };
    }

    if (options.inject) {
        config.onload = function(window) {
            if (typeof options.inject === 'function') {
                options.inject(window);
            } else {
                require(path.join(__dirname, options.inject))(window);
            }
        };
    }

    return new Promise((resolve, reject) => {
        jsdom.env(src, config, (err, res) => {
            if (err) {
                return reject(err);
            }
            return resolve(res);
        });
    }).then((result) => {
        return new Promise((resolve) => {
            setTimeout(() => resolve(result), options.timeout);
        });
    });
}

/**
 * Extract stylesheets' hrefs from dom
 * @param  {Object}  window     A jsdom window
 * @param  {Object}  options    Options, as passed to UnCSS
 * @return {Array}
 */
function getStylesheets(window, options) {
    if (Array.isArray(options.media) === false) {
        options.media = [options.media];
    }

    const media = _.union(['', 'all', 'screen'], options.media);
    const elements = window.document.querySelectorAll('link[rel="stylesheet"]');

    return Array.prototype.map.call(elements, (link) => ({
        href: link.getAttribute('href'),
        media: link.getAttribute('media') || ''
    }))
    .filter((sheet) => media.indexOf(sheet.media) !== -1)
    .map((sheet) => sheet.href);
}

/**
 * Filter unused selectors.
 * @param  {Object}  window A jsdom window
 * @param  {Array}   sels   List of selectors to be filtered
 * @return {Array}
 */
function findAll(window, sels) {
    const document = window.document;

    // Unwrap noscript elements.
    const elements = document.getElementsByTagName('noscript');
    Array.prototype.forEach.call(elements, (ns) => {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = ns.textContent;
        // Insert each child of the <noscript> as its sibling
        Array.prototype.forEach.call(wrapper.children, (child) => {
            ns.parentNode.insertBefore(child, ns);
        });
    });

    // Do the filtering.
    return sels.filter((selector) => {
        try {
            return document.querySelector(selector);
        } catch (e) {
            return true;
        }
    });
}

module.exports = {
    fromSource,
    findAll,
    getStylesheets
};
