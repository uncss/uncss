/* Chai helper for gm */
var fs      = require('fs'),
    gm      = require('gm'),
    path    = require('path'),
    phantom = require('phantomjs');

var check = function (done, fn) {
    'use strict';
    try {
        fn();
        done();
    } catch (e) {
        done(e);
    }
};

module.exports = function (chai, utils) {
    'use strict';

    chai.Assertion.addMethod('resemble', function (other, callback) {
        var assertion = this.assert,
            this_destination  = path.join(__dirname, 'screenshots', path.basename(this._obj, '.html') + '.png'),
            other_destination = path.join(__dirname, 'screenshots', path.basename(this._obj, '.html') + '_2.png'),
            child_args = [
                /* Script */
                path.join(__dirname, 'screenshot.js'),
                /* Sources */
                this._obj,
                other,
                /* Destinations */
                this_destination,
                other_destination
            ];

        require('child_process').execFile(phantom.path, child_args, function (err) {
            if (err) {
                return callback(err);
            }
            gm.compare(child_args[3], child_args[4], function (err, isEqual) {
                if (err) {
                    return callback(err);
                }

                assertion(isEqual === true);

                fs.unlink(this_destination, function (err) {
                    if (err) {
                        return callback(err);
                    }
                    fs.unlink(other_destination, function (err) {
                        return callback(err);
                    });
                });
            });
        });
    });
};
