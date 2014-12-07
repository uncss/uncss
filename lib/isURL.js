'use strict';

/**
 * Helper for checking whether the file is a URL or not
 * @param  {String}  url The string to check
 * @return {Boolean}     Is it a URL?
 */
module.exports = function isURL(url) {
    return /^https?/.test(url);
};
