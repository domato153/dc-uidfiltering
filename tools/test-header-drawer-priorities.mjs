import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { parse } from 'acorn';
import { resolveGeneratedHeaderCss } from './header-generated-css.mjs';
import { loadDrawerPresenter } from '../testbed/header-drawer-body-contract.mjs';
import { canonicalDrawerCss, drawerCssSha256, drawerPriorityControl, drawerPriorityChanges, restoreHistoricalDrawerPriorities } from './header-drawer-priority-contract.mjs';
import { transformHeaderPalettePriorities } from './header-palette-priority-contract.mjs';

const reference = 'src/targets/mobile/header-drawer-presenter.js';
const rawSource = await readFile(reference, 'utf8');
const paletteRestoration = transformHeaderPalettePriorities(rawSource);
assert.equal(paletteRestoration.changed, 1, 'Only one new drawer palette priority delta');
const source = paletteRestoration.source;
const sha = value => createHash('sha256').update(value).digest('hex');
const actual = (await resolveGeneratedHeaderCss({ reference, source, readSource: file => readFile(file, 'utf8') }))
    .find(payload => payload.styleKey === 'header-drawer').css;
const diagnostic = loadDrawerPresenter(source).style.css;
assert.equal(drawerPriorityChanges.reduce((sum, change) => sum + change.declarations.length, 0), 56);
assert.ok(Object.isFrozen(drawerPriorityChanges) && drawerPriorityChanges.every(change => Object.isFrozen(change) && Object.isFrozen(change.declarations)));

// Independent test setup strips priorities only if its complete input is still
// the frozen old output. The simulated positive proves the contract itself;
// the final assertions below require the real current source to be normalized.
function simulatedCandidate(css, binding) {
    const expected = binding === 'actual' ? drawerPriorityControl.actualCssSha256 : drawerPriorityControl.diagnosticCssSha256;
    if (drawerCssSha256(css) !== expected) return css;
    const selectors = new Set(drawerPriorityChanges.map(change => change.selector));
    let removed = 0;
    const lowered = css.replace(/([^{}]+)\{([^{}]*)\}/g, (full, selector, body) => {
        if (!selectors.has(selector.trim())) return full;
        const changed = body.replace(/ !important/g, () => { removed++; return ''; });
        return selector + '{' + changed + '}';
    });
    assert.equal(removed, 56);
    return lowered;
}
const positive = simulatedCandidate(actual, 'actual');
const diagnosticPositive = simulatedCandidate(diagnostic, 'diagnostic');
assert.equal(drawerCssSha256(restoreHistoricalDrawerPriorities(positive)), drawerPriorityControl.actualCssSha256);
assert.equal(drawerCssSha256(restoreHistoricalDrawerPriorities(diagnosticPositive, 'diagnostic')), drawerPriorityControl.diagnosticCssSha256);
assert.equal(positive.match(/!important/g)?.length, 8, 'Only the eight popup priorities remain in late CSS');

let negatives = 0;
const reject = candidate => { assert.notEqual(candidate, positive, 'Negative control must change the current CSS'); assert.throws(() => restoreHistoricalDrawerPriorities(candidate), assert.AssertionError); negatives++; };
const first = drawerPriorityChanges[0];
const rule = Array.from(positive.matchAll(/([^{}]+)\{([^{}]*)\}/g)).find(match => match[1].trim() === first.selector);
assert.ok(rule);
const mutateFirstBody = transform => positive.slice(0, rule.index) + rule[1] + '{' + transform(rule[2]) + '}' + positive.slice(rule.index + rule[0].length);
reject(mutateFirstBody(body => body.replace('position: relative;', '')));
reject(mutateFirstBody(body => body.replace('position: relative;', 'position: relative; position: relative;')));
reject(mutateFirstBody(body => body.replace('position: relative;', 'position: fixed;')));
reject(mutateFirstBody(body => body.replace('position: relative;', 'position: relative !important;')));
reject(positive + '\n' + first.selector + '{ position: relative; overflow: visible; }');
reject(positive + '\n.dcuf-unlisted-rule { color: red; }');
reject(positive.replace('z-index: 3;', 'z-index: 3 !important;'));
reject(positive.replace('position: fixed !important;', 'position: fixed;'));
reject(positive.replace('left: 50% !important;', 'left: 51% !important;'));
reject(positive.replace('@media (max-width: 997px)', '@media (max-width: 996px)'));
reject(positive.replace('.minor_intro_box', '.wrong-native-intro'));
reject(positive.replace('overflow: visible;', 'overflow: hidden;'));
reject(positive.replace('box-sizing: border-box;', 'box-sizing: content-box;'));
assert.throws(() => restoreHistoricalDrawerPriorities(positive, 'unknown'), assert.AssertionError); negatives++;
assert.throws(() => restoreHistoricalDrawerPriorities(diagnosticPositive, 'actual'), assert.AssertionError); negatives++;

// Check every selected declaration independently; one restored old priority or
// altered value must fail even if another selected declaration still matches.
for (const change of drawerPriorityChanges) {
    const match = Array.from(positive.matchAll(/([^{}]+)\{([^{}]*)\}/g)).find(item => item[1].trim() === change.selector);
    assert.ok(match);
    for (const declaration of change.declarations) {
        const exact = declaration.property + ': ' + declaration.value + ';';
        assert.ok(match[2].includes(exact), 'Exact authored test mutation target required: ' + exact);
        const body = match[2].replace(exact, declaration.property + ': ' + declaration.value + ' !important;');
        reject(positive.slice(0, match.index) + match[1] + '{' + body + '}' + positive.slice(match.index + match[0].length));
    }
}

// Mask only the CSS literal, preserving the exact early theme/concealment,
// fifteen-slot diagnostic defaults, layout, input guards and inline JS body
// descriptions. Their priority strings are outside this removal contract.
const cssNodes = [];
const walk = node => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Property' && node.key?.name === 'css') cssNodes.push(node.value);
    for (const value of Object.values(node)) {
        if (Array.isArray(value)) value.forEach(walk);
        else if (value && typeof value === 'object') walk(value);
    }
};
walk(parse(source, { ecmaVersion: 'latest' }));
assert.equal(cssNodes.length, 1);
const cssNode = cssNodes[0];
const nonCss = source.slice(0, cssNode.start) + '__DRAWER_CSS_LITERAL__' + source.slice(cssNode.end);
assert.equal(sha(canonicalDrawerCss(nonCss)), drawerPriorityControl.nonCssSourceSha256,
    'After one declared palette restoration, concealment and all JS descriptions/input/binding defaults remain exact');

const runtimeStatus = actual.match(/!important/g)?.length === 8 ? 'NORMALIZED_CANDIDATE' : 'RED_CURRENT_SOURCE_NOT_NORMALIZED';
const report = { kind: 'header-drawer-owned-priority-contract', scope: 'PURE_CSS_NOT_BROWSER_OR_HEADER_ADMISSION',
    status: runtimeStatus === 'NORMALIZED_CANDIDATE' ? 'PASS' : 'RED', runtimeStatus,
    control: drawerPriorityControl, sourceSha256: sha(rawSource), palettePriorityRestorations: paletteRestoration.changed,
    actualCssSha256: drawerCssSha256(actual), diagnosticCssSha256: drawerCssSha256(diagnostic),
    selectedRemovals: 56, retainedLatePriorities: 8, unchangedNonCssSource: true, simulatedPositiveBindings: 2, rejectedMutations: negatives,
    observerSha256: sha(await readFile(new URL(import.meta.url))), contractSha256: sha(await readFile(new URL('./header-drawer-priority-contract.mjs', import.meta.url))),
    paletteContractSha256: sha(await readFile(new URL('./header-palette-priority-contract.mjs', import.meta.url))) };
const outputIndex = process.argv.indexOf('--output');
if (outputIndex >= 0) {
    const destination = process.argv[outputIndex + 1];
    assert.ok(destination && !destination.startsWith('--'), '--output path required');
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, JSON.stringify(report, null, 2) + '\n');
}
console.log(`Drawer priority oracle controls PASS: two exact frozen bindings, ${negatives} rejected mutations; current source ${runtimeStatus}.`);
// This must be RED on untouched 208D. A simulated CSS-only positive never
// substitutes for lowering the actual source and re-running browser evidence.
restoreHistoricalDrawerPriorities(actual);
restoreHistoricalDrawerPriorities(diagnostic, 'diagnostic');
console.log('Drawer selected56 priority contract PASS: exact full CSS, eight retained popup priorities, early/JS descriptions unchanged.');
