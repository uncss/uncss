'use strict';

const isHTML = require('is-html'),
    isURL = require('is-absolute-url'),
    { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom'),
    path = require('path'),
    { Console } = require('console'),
    _ = require('lodash');

class HtmlrootResourceLoader extends ResourceLoader {
    constructor(htmlroot, strictSSL, userAgent) {
        super({
            strictSSL,
            userAgent
        });

        this.htmlroot = htmlroot;
    }

    fetch(originalUrl, { element }) {
        // See whether raw attribute value is root-relative.
        const src = element.getAttribute('src');
        if (!src) {
            return null;
        }

        let url = originalUrl;
        if (src.indexOf('/') === 0) {
            url = 'file://' + path.join(this.htmlroot, src);
        }

        return super.fetch(url);
    }
}

function defaultOptions() {
    return {
        features: {
            FetchExternalResources: ['script'],
            ProcessExternalResources: ['script']
        },
        runScripts: 'dangerously',
        userAgent: 'uncss',
        virtualConsole: new VirtualConsole().sendTo(new Console(process.stderr))
    };
}

/**
 * Load a page.
 * @param  {String}  src
 * @param  {Object}  options
 * @return {Promise<JSDOM>}
 */
function fromSource(src, options) {
    const config = _.cloneDeep(options.jsdom);

    // The htmlroot option allows root-relative URLs (starting with a slash)
    // to be used for all resources. Without it, root-relative URLs are
    // looked up relative to file://, so will not be found.
    if (options.htmlroot) {
        config.resources = new HtmlrootResourceLoader(options.htmlroot, options.strictSSL, options.userAgent);
    }

    return new Promise((resolve, reject) => {
        let pagePromise;
        if (isURL(src)) {
            pagePromise = JSDOM.fromURL(src, config);
        } else if (isHTML(src)) {
            pagePromise = Promise.resolve(new JSDOM(src, config));
        } else {
            pagePromise = JSDOM.fromFile(src, config);
        }

        return pagePromise.then((page) => {
            if (options.inject) {
                if (typeof options.inject === 'function') {
                    options.inject(page.window);
                } else {
                    require(path.join(__dirname, options.inject))(page.window);
                }
            }

            setTimeout(() => resolve(page), options.timeout);
        }).catch((e) => {
            reject(e);
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

    return Array.prototype.map
        .call(elements, (link) => ({
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
    defaultOptions,
    fromSource,
    findAll,
    getStylesheets
};
