'use strict';

var Promise = require('bluebird');
var path = require('path');
var fs = require('fs-extra');
var outputFile = Promise.promisify(fs.outputFile);
var readFile = Promise.promisify(fs.readFile);

var jsdom = require('./jsdom.js');
var postcss = require('postcss');
var _ = require('lodash');

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
            /* form validation */
            ':required', ':invalid', ':valid',
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
 * @param  {Array} usedSelectors  List of Selectors found in the jsdom pages
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
 * @param  {Array}    page          List of jsdom pages
 * @param  {Object}   css           The postcss.Root node
 * @return {Promise}
 */
function getUsedSelectors(page, css) {
    var usedSelectors = [];
    css.walkRules(function (rule) {
        usedSelectors = _.concat(usedSelectors, rule.selectors.map(dePseudify));
    });
    return jsdom.findAll(page, usedSelectors);
}

/**
 * Get all the selectors mentioned in {css}
 * @param  {Object} css        The postcss.Root node
 * @return {Array}
 */
function getAllSelectors(css) {
    var selectors = [];
    css.walkRules(function (rule) {
        selectors = _.concat(selectors, rule.selector);
    });
    return selectors;
}

/**
 * Remove css rules not used in the dom
 * @param  {Object} css             The postcss.Root node
 * @param  {Array}  ignore          List of selectors to be ignored
 * @param  {Array}  usedSelectors   List of selectors that are found in {pages}
 * @return {Object}                 A css_parse-compatible stylesheet
 */
function filterUnusedRules(css, ignore, usedSelectors) {
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
 * Get the contents of HTML pages through jsdom.
 * @param  {Array}   file   HTML file path
 * @param  {Object}  options UnCSS options
 * @return {Array|Promise}
 */
function getHTML(file, options) {
    return jsdom.fromSource(file, options);
}

/**
 * Main exposed function
 * @param  {Array}   pages      List of jsdom pages
 * @param  {Object}  css        The postcss.Root node
 * @param  {Array}   options     List of options
 * @return {Promise}
 */
module.exports = function uncss(files, css, options) {
    var processingCount = 0;
    return Promise.map(files, function(file) {
        processingCount++;
        if (processingCount % 20 === 0) {
            console.log(`${new Date().toISOString()} current processingCount: ${processingCount}`);
        }

        // Check the cache
        const baseName = path.basename(file, '.html');
        const cacheFilePath = options.cacheDirectory && path.join(options.cacheDirectory, `${baseName}.json`);
        let cachedUsedSelectorsPromise = Promise.resolve();
        if (cacheFilePath) {
            cachedUsedSelectorsPromise = readFile(cacheFilePath, 'utf8')
                .catch((err) => {
                    // ignore non-existent files
                })
                .then((fileContents) => {
                    return JSON.parse(fileContents);
                })
                .catch((err) => {
                    console.log('Failed to parse JSON cache file', cacheFilePath, '|', err);
                });
        }

        return cachedUsedSelectorsPromise.then((cachedUsedSelectors) => {
            //console.log('cachedUsedSelectors', cachedUsedSelectors && cachedUsedSelectors.length);

            // Find the unused selectors if not in the cache
            if (!cachedUsedSelectors) {
                var resource = getHTML(file, options);
                return Promise.using(resource, function(page) {
                    const usedSelectors = getUsedSelectors(page, css);

                    // Save for cache lookup next run
                    if (cacheFilePath) {
                    outputFile(cacheFilePath, JSON.stringify(usedSelectors, null, 2))
                        .catch((err) => {
                            console.log('Problem saving used selectors', err, err.stack);
                        });
                    }

                    return usedSelectors;
                });
            }

            return cachedUsedSelectors;
        });
    }, { concurrency: options.concurrency || Infinity }).then(function (usedSelectorsForEachFile) {
        console.log('Done assembling used selectors');
        //console.log('usedSelectorsForEachFile', `[${usedSelectorsForEachFile.map((selectorList) => { return selectorList.length })}]`);
        console.log('--------------------');

        var usedSelectorMap = {};
        _.flatten(usedSelectorsForEachFile).forEach((selector) => {
            usedSelectorMap[selector] = (usedSelectorMap[selector] || 0) + 1;
        });
        var usedSelectors = Object.keys(usedSelectorMap);

        var usedCss = filterUnusedRules(css, options.ignore, usedSelectors);
        var allSelectors = getAllSelectors(css);
        var unusedSelectors = _.difference(allSelectors, usedSelectors);

        const selectorMap = Object.assign({}, usedSelectorMap);
        allSelectors.forEach((selector) => {
            // Set any unused selectors as 0
            selectorMap[selector] = selectorMap[selector] || 0;
        });

        // Create a map that is sorted by count
        const sortedSelectorListWithUsageCounts = Object.keys(selectorMap)
            .map((selector) => {
                return {
                    selector,
                    count: selectorMap[selector]
                };
            })
            .sort((a, b) => {
                return b.count - a.count;
            });
        const selectorMapByUsage = {};
        sortedSelectorListWithUsageCounts.forEach((selectorWithUsageCount) => {
            selectorMapByUsage[selectorWithUsageCount.selector] = selectorWithUsageCount.count;
        });


        console.log(`total usedSelectors ${_.flatten(usedSelectorsForEachFile).length}, deduped ${usedSelectors.length}`);
        Promise.all([
            outputFile(path.join(options.cacheDirectory, '#selector-map.json'), JSON.stringify(selectorMap, null, 2)),
            outputFile(path.join(options.cacheDirectory, '#selector-map-by-usage.json'), JSON.stringify(selectorMapByUsage, null, 2))
        ])
            .then(() => {
                console.log('saved map selector usage');
            })
            .catch((err) => {
                console.log('Problem saving map of selector usage', err, err.stack);
            });

        return [usedCss, {
            /* Get the selectors for the report */
            all: allSelectors,
            unused: unusedSelectors,
            used: usedSelectors
        }];
    });
};
