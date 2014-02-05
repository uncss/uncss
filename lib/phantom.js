'use strict';

var fs      = require('fs'),
    phantom = require('node-phantom-simple'),
    /* PhantomJS process and page */
    instance, page;

function init(callback) {
    return phantom.create(function (err, ph) {
        instance = ph;
        return ph.createPage(function (err, created) {
            page = created;
            return callback(err);
        });
    }, { phantomPath: require('phantomjs').path });
}

function exit() {
    return instance.exit();
}

function fromRaw(html, timeout, callback) {
    page.set('content', html, function () {
        setTimeout(function () {
            page.get('content', callback);
        }, timeout);
    });
}

function fromLocal(filename, timeout, callback) {
    return fs.readFile(filename, 'utf-8', function (err, html) {
        if (err) {
            return callback(err);
        }
        return fromRaw(html, timeout, callback);
    });
}

function fromRemote(url, timeout, callback) {
    page.open(url, function () {
        setTimeout(function () {
            page.get('content', callback);
        }, timeout);
    });
}

module.exports = {
    exit       : exit,
    init       : init,
    fromLocal  : fromLocal,
    fromRaw    : fromRaw,
    fromRemote : fromRemote
};