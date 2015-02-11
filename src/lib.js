'use strict';

var promise = require('bluebird'),
    phantom = require('./phantom.js'),
    _ = require('lodash');

/* Some styles are applied only with user interaction, and therefore its
 *   selectors cannot be used with querySelectorAll.
 * Additionally, we should check for vendor-specific selectors, but that
 *   would slow down the regex replacing too much.
 *   (there are > 300 vendor-specific properties according to
 *    http://peter.sh/experiments/vendor-prefixed-css-property-overview/).
 *   We just simply skip over them.
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
            ':before', ':after'
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
    var i = 0;
    return selectors.filter(function (selector) {
        selector = dePseudify(selector);
        /* TODO: process @-rules */
        if (selector[0] === '@') {
            return true;
        }
        for (i = 0; i < ignore.length; ++i) {
            /* If ignore is RegExp and matches selector ... */
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
 * @param  {Array} rules
 * @param  {Array} memo  Used for recursion
 * @return {Array}
 */
function getUsedAnimations(rules, memo) {
    memo = memo || [];
    return rules.reduce(function (accumulator, rule) {
        if (rule.type === 'rule') {
            /* Find animation declarations */
            rule.declarations
                .filter(function (decl) {
                    return decl.property === 'animation' || decl.property === 'animation-name';
                })
                /* Keep loopin' */
                .forEach(function (property) {
                    /* If declared as animation, it should be in the form 'name Xs etc..' */
                    accumulator.push(property.value.split(' ')[0]);
                });
        }
        if (rule.type === 'media') {
            accumulator = getUsedAnimations(rule.rules, memo);
        }
        return accumulator;
    }, memo);
}

/**
 * Filter @keyframes that are not used
 * @param  {Array} rules
 * @param  {Array} animations
 * @param  {Array} unusedRules
 * @return {Array}
 */
function filterKeyframes(rules, animations, unusedRules) {
    return rules.filter(function (rule) {
        if (rule.type === 'keyframes') {
            unusedRules.push(rule);
            return animations.indexOf(rule.name) !== -1;
        }
        return true;
    });
}

/**
 * Filter rules with no selectors remaining
 * @param  {Array} rules
 * @return {Array}
 */
function filterEmptyRules(rules) {
    return rules.filter(function (rule) {
        if (rule.type === 'rule') {
            return rule.selectors.length;
        }
        /* Filter media queries with no remaining rules */
        if (rule.type === 'media') {
            rule.rules = filterEmptyRules(rule.rules);
            return rule.rules.length;
        }
        return true;
    });
}

/**
 * Find which selectors are used in {pages}
 * @param  {Array}    pages         List of PhantomJS pages
 * @param  {Object}   stylesheet    The output of css.parse().stylesheet
 * @param  {Boolean}  isRec         Used internally
 * @return {promise}
 */
function getUsedSelectors(page, stylesheet, isRec) {
    return promise.map(stylesheet.rules, function (rule) {
        if (rule.type === 'rule') {
            return rule.selectors;
        } else if (rule.type === 'media') {
            return getUsedSelectors(page, rule, true);
        }
        return [];
    }).then(function (selectors) {
        selectors = _.flatten(selectors);
        if (isRec) {
            return selectors;
        }
        return phantom.findAll(page, selectors.map(dePseudify));
    });
}

/**
 * Get all the selectors mentioned in {stylesheet}
 * @param  {Object} stylesheet  The output of css.parse().stylesheet
 * @return {Array}
 */
function getAllSelectors(stylesheet) {
    /* TODO: Temporary hack */
    return stylesheet.rules.reduce(function (memo, rule) {
        if (rule.type === 'rule') {
            return memo.concat(rule.selectors);
        } else if (rule.type === 'media') {
            return memo.concat(getAllSelectors(rule));
        } else if (rule.type === 'keyframes') {
            return memo.concat('keyframes-' + rule.name);
        } else if (rule.type === 'comment') {
            return memo;
        }
        return memo.concat(rule);
    }, []);
}

/**
 * Remove css rules not used in the dom
 * @param  {Array}  pages           List of PhantomJS pages
 * @param  {Object} stylesheet      The output of css.parse().stylesheet
 * @param  {Array}  ignore          List of selectors to be ignored
 * @param  {Array}  usedSelectors   List of selectors that are found in {pages}
 * @return {Object}                 A css_parse-compatible stylesheet
 */
function filterUnusedRules(pages, stylesheet, ignore, usedSelectors) {
    var rules = stylesheet.rules,
        nextRule,
        unusedRules = [],
        unusedRuleSelectors,
        usedRuleSelectors;
    /* Rule format:
     *  { selectors: [ '...', '...' ],
     *    declarations: [ { property: '...', value: '...' } ]
     *  },
     * Two steps: filter the unused selectors for each rule,
     *            filter the rules with no selectors
     */
    rules.forEach(function (rule, idx) {
        if (rule.type === 'comment') {
            // ignore next rule while using comment `/* uncss:ignore */`
            if (/^!?\s?uncss:ignore\s?$/.test(rule.comment)) {
                nextRule = rules[idx + 1];
                if (nextRule && nextRule.type === 'rule') {
                    ignore = ignore.concat(nextRule.selectors);
                }
            }
        } else if (rule.type === 'rule') {
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
                    position: rule.position
                });
            }
            rule.selectors = usedRuleSelectors;
        } else if (rule.type === 'media') {
            /* Recurse */
            rule.rules = filterUnusedRules(
                pages,
                { rules: rule.rules },
                ignore,
                usedSelectors
            ).stylesheet.rules;
        }
    });

    /* Filter the rules with no selectors (i.e. the unused rules) */
    rules = filterEmptyRules(rules);

    /* Filter unused @keyframes */
    rules = filterKeyframes(rules, getUsedAnimations(rules), unusedRules);

    return {
        stylesheet: {
            rules: rules
        },
        unused: {
            rules: unusedRules
        }
    };
}

/**
 * Main exposed function
 * @param  {Array}   pages      List of PhantomJS pages
 * @param  {Object}  stylesheet The output of css.parse().stylesheet
 * @param  {Array}   ignore     List of selectors to be ignored
 * @return {promise}
 */
module.exports = function uncss(pages, stylesheet, ignore) {
    return promise.map(pages, function (page) {
        return getUsedSelectors(page, stylesheet);
    }).then(function (usedSelectors) {
        usedSelectors = _.flatten(usedSelectors);
        var processed = filterUnusedRules(pages, stylesheet, ignore, usedSelectors);

        return [
            processed,
            /* Get the selectors for the report */
            {
                all: getAllSelectors(stylesheet),
                used: usedSelectors
            }];
    });
};
