'use strict';

var promise = require('bluebird'),
    phantom = require('./phantom.js'),
    postcss = require('postcss'),
    _ = require('lodash');
/* Some styles are applied only with user interaction, and therefore its
 *   selectors cannot be used with querySelectorAll.
 * http://www.w3.org/TR/2001/CR-css3-selectors-20011113/
 */
var dePseudify = (function () {
    var ignoredPseudos = [
            /* link */
            ':link', ':visited',
            /* user action */
            ':hover', ':active', ':focus',
            /* UI element states */
            ':enabled', ':disabled', ':checked', ':indeterminate',
            /* pseudo elements */
            '::first-line', '::first-letter', '::selection', '::before', '::after',
            /* pseudo classes */
            ':target',
            /* CSS2 pseudo elements */
            ':before', ':after',
            /* Vendor-specific pseudo-elements:
             * https://developer.mozilla.org/ja/docs/Glossary/Vendor_Prefix
             */
            '::?-(?:moz|ms|webkit|o)-[a-z0-9-]+'
        ],
        pseudosRegex = new RegExp(ignoredPseudos.join('|'), 'g');

    return function (selector) {
        return selector.replace(pseudosRegex, '');
    };
}());

/**
 * Private function used in filterUnusedRules.
 * @param  {Array} selectors      CSS selectors created by the CSS parser
 * @param  {Array} ignore         List of selectors to be ignored
 * @param  {Array} usedSelectors  List of Selectors found in the PhantomJS pages
 * @return {Array}                The selectors matched in the DOMs
 */
function filterUnusedSelectors(selectors, ignore, usedSelectors) {
    /* There are some selectors not supported for matching, like
     *   :before, :after
     * They should be removed only if the parent is not found.
     * Example: '.clearfix:before' should be removed only if there
     *          is no '.clearfix'
     */
    return selectors.filter(function (selector) {
        selector = dePseudify(selector);
        /* TODO: process @-rules */
        if (selector[0] === '@') {
            return true;
        }
        for (var i = 0, len = ignore.length; i < len; ++i) {
            if (_.isRegExp(ignore[i]) && ignore[i].test(selector)) {
                return true;
            }
            if (ignore[i] === selector) {
                return true;
            }
        }
        return usedSelectors.indexOf(selector) !== -1;
    });
}

/**
 * Find which animations are used
 * @param  {Object} css             The postcss.Root node
 * @return {Array}
 */
function getUsedAnimations(css) {
    var usedAnimations = [];
    css.walkDecls(function (decl) {
        if (_.endsWith(decl.prop, 'animation-name')) {
            /* Multiple animations, separated by comma */
            usedAnimations.push.apply(usedAnimations, postcss.list.comma(decl.value));
        } else if (_.endsWith(decl.prop, 'animation')) {
            /* Support multiple animations */
            postcss.list.comma(decl.value).forEach(function (anim) {
                /* If declared as animation, it should be in the form 'name Xs etc..' */
                usedAnimations.push(postcss.list.space(anim)[0]);
            });
        }
    });
    return usedAnimations;
}

/**
 * Filter @keyframes that are not used
 * @param  {Object} css             The postcss.Root node
 * @param  {Array}  animations
 * @param  {Array}  unusedRules
 * @return {Array}
 */
function filterKeyframes(css, animations, unusedRules) {
    css.walkAtRules(/keyframes$/, function (atRule) {
        if (animations.indexOf(atRule.params) === -1) {
            unusedRules.push(atRule);
            atRule.remove();
        }
    });
}

/**
 * Filter rules with no selectors remaining
 * @param  {Object} css             The postcss.Root node
 * @return {Array}
 */
function filterEmptyAtRules(css) {
    /* Filter media queries with no remaining rules */
    css.walkAtRules(function (atRule) {
        if (atRule.name === 'media' && atRule.nodes.length === 0) {
            atRule.remove();
        }
    });
}

/**
 * Find which selectors are used in {pages}
 * @param  {Array}    pages         List of PhantomJS pages
 * @param  {Object}   css           The postcss.Root node
 * @return {promise}
 */
function getUsedSelectors(page, css) {
    var usedSelectors = [];
    css.walkRules(function (rule) {
        usedSelectors = _.concat(usedSelectors, rule.selectors.map(dePseudify));
    });
    // TODO: Can this be written in a more straightforward fashion?
    return promise.map(usedSelectors, function (selector) {
        return selector;
    }).then(function(selector) {
        return phantom.findAll(page, selector);
    });
}

/**
 * Get all the selectors mentioned in {css}
 * @param  {Object} css        The postcss.Root node
 * @return {Array}
 */
function getAllSelectors(css) {
    var selectors = [];
    css.walkRules(function (rule) {
        selectors.concat(rule.selector);
    });
    return selectors;
}

/**
 * Remove css rules not used in the dom
 * @param  {Array}  pages           List of PhantomJS pages
 * @param  {Object} css             The postcss.Root node
 * @param  {Array}  ignore          List of selectors to be ignored
 * @param  {Array}  usedSelectors   List of selectors that are found in {pages}
 * @return {Object}                 A css_parse-compatible stylesheet
 */
function filterUnusedRules(pages, css, ignore, usedSelectors) {
    var ignoreNextRule = false,
        unusedRules = [],
        unusedRuleSelectors,
        usedRuleSelectors;
    /* Rule format:
     *  { selectors: [ '...', '...' ],
     *    declarations: [ { property: '...', value: '...' } ]
     *  },.
     * Two steps: filter the unused selectors for each rule,
     *            filter the rules with no selectors
     */
    ignoreNextRule = false;
    css.walk(function (rule) {
        if (rule.type === 'comment') {
            // ignore next rule while using comment `/* uncss:ignore */`
            if (/^!?\s?uncss:ignore\s?$/.test(rule.text)) {
                ignoreNextRule = true;
            }
        } else if (rule.type === 'rule') {
            if (rule.parent.type === 'atrule' && _.endsWith(rule.parent.name, 'keyframes')) {
                // Don't remove animation keyframes that have selector names of '30%' or 'to'
                return;
            }
            if (ignoreNextRule) {
                ignoreNextRule = false;
                ignore = ignore.concat(rule.selectors);
            }

            usedRuleSelectors = filterUnusedSelectors(
                rule.selectors,
                ignore,
                usedSelectors
            );
            unusedRuleSelectors = rule.selectors.filter(function (selector) {
                return usedRuleSelectors.indexOf(selector) < 0;
            });
            if (unusedRuleSelectors && unusedRuleSelectors.length) {
                unusedRules.push({
                    type: 'rule',
                    selectors: unusedRuleSelectors,
                    position: rule.source
                });
            }
            if (usedRuleSelectors.length === 0) {
                rule.remove();
            } else {
                rule.selectors = usedRuleSelectors;
            }
        }
    });

    /* Filter the @media rules with no rules */
    filterEmptyAtRules(css);

    /* Filter unused @keyframes */
    filterKeyframes(css, getUsedAnimations(css), unusedRules);

    return css;
}

/**
 * Main exposed function
 * @param  {Array}   pages      List of PhantomJS pages
 * @param  {Object}  css        The postcss.Root node
 * @param  {Array}   ignore     List of selectors to be ignored
 * @return {promise}
 */
module.exports = function uncss(pages, css, ignore) {
    return promise.map(pages, function (page) {
        return getUsedSelectors(page, css);
    }).then(function (usedSelectors) {
        usedSelectors = _.flatten(usedSelectors);
        var filteredCss = filterUnusedRules(pages, css, ignore, usedSelectors);
        return [filteredCss, {
            /* Get the selectors for the report */
            all: getAllSelectors(css),
            used: usedSelectors
        }];
    });
};
