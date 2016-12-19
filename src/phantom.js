'use strict';

var _ = require('lodash');

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
    var elements = page.document.documentElement.querySelectorAll('link[rel="stylesheet"]');

    return Array.prototype.map.call(elements, function(link) {
        return {
            href: link.getAttribute('href'),
            media: link.getAttribute('media') || ''
        };
    }).filter(function (sheet) {
        return media.indexOf(sheet.media) !== -1;
    }).map(function (sheet) {
        return sheet.href;
    });
}

/**
 * Filter unused selectors.
 * @param  {Object}  page   A PhantomJS page
 * @param  {Array}   sels   List of selectors to be filtered
 * @return {promise}
 */
function findAll(page, sels) {
    var document = page.document;

    // Unwrap noscript elements.
    var elements = document.getElementsByTagName('noscript');
    Array.prototype.forEach.call(elements, function(ns) {
        var wrapper = document.createElement('div');
        wrapper.innerHTML = ns.textContent;
        // Insert each child of the <noscript> as its sibling
        Array.prototype.forEach.call(wrapper.children, function (child) {
            ns.parentNode.insertBefore(child, ns);
        });
    });

    // Do the filtering
    return sels.filter(function (selector) {
        try {
            if (document.querySelector(selector)) {
                return true;
            }
        } catch (e) {
            return true;
        }
        return false;
    });
}

module.exports = {
    findAll: findAll,
    getStylesheets: getStylesheets
};
