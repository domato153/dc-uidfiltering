import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';
import { restoreHistoricalGnbPriorities } from './header-gnb-priority-contract.mjs';
import { palettePriorityProfile, transformHeaderPalettePriorities } from './header-palette-priority-contract.mjs';
import { restoreConcept01HeaderVisualDelta } from './concept01-header-visual-delta.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Captured before extraction from the exact 0C307669… immediate control.
// Expand selector lists but preserve declaration and duplicate-rule order within
// each selector. Only cross-surface grouping/order may change in this slice.
const referenceDigest = 'E6A5736D07E363894BB771246FD5E36EB981706ADD691E4ACF8E7DA8C4593C2C';
const owners = [
    ['header-shell-presenter', '__dcufBuildHeaderShellThemeCss', /\.dchead(?:er)?\b/],
    ['header-gnb-presenter', '__dcufBuildHeaderGnbThemeCss', /\.gnb_bar\b/],
    ['gallery-page-head-presenter', '__dcufBuildGalleryPageHeadThemeCss', /\.page_head\b/],
    ['header-recent-visit-presenter', '__dcufBuildHeaderRecentVisitThemeCss', /\.newvisit_history\b/],
    ['header-drawer-presenter', '__dcufBuildHeaderDrawerThemeCss', /\.issue_wrap\b/],
];
const rawHeaderSelector = /\.(?:dcheader|dchead|gnb_bar|page_head|newvisit_history|issue_wrap)\b/;
const currentSources = Object.fromEntries(await Promise.all(owners.map(async ([id]) => [id,
    await readFile(path.join(root, 'src/targets/mobile', `${id}.js`), 'utf8'),
])));
const sources = Object.fromEntries(Object.entries(currentSources).map(([id,source])=>[id,restoreConcept01HeaderVisualDelta(source)]));
for(const id of ['header-shell-presenter','header-gnb-presenter','gallery-page-head-presenter']) {
    const current=currentSources[id];
    assert.ok(current.includes('// dcuf-concept01-visual-v1:'));
    assert.notEqual(current,sources[id]);
    const changed=current.replace('var(--dcuf-theme-fg)', 'var(--dcuf-unapproved-fg)');
    // The shell's approved fragment uses border tokens instead of foreground.
    const mutation=id==='header-shell-presenter'?current.replace('border-radius: 8px;', 'border-radius: 80px;'):changed;
    assert.throws(()=>restoreConcept01HeaderVisualDelta(mutation),'Unregistered visual change must fail normalization');
}
// P2 popup additions remain exact registered deltas, never wildcard exclusions.
for (const [id,from,to] of [
    ['header-shell-presenter','data-dcuf-header-shell-role="search-layer"','data-dcuf-header-shell-role="unregistered-search-layer"'],
    ['gallery-page-head-presenter','data-dcuf-gallery-page-head-role="settings-layer"','data-dcuf-gallery-page-head-role="unregistered-settings-layer"'],
    ['header-drawer-presenter','top: 50% !important;','top: 51% !important;'],
]) {
    assert.ok(currentSources[id].includes(from));
    assert.throws(()=>restoreConcept01HeaderVisualDelta(currentSources[id].replace(from,to)), 'Unregistered P2 delta must fail normalization');
}
// Combined build input must restore every owner, with repeated CSS fragments scoped locally.
const combinedVisualSources = Object.values(currentSources).join('\n');
const combinedRestored = restoreConcept01HeaderVisualDelta(combinedVisualSources);
assert.equal(combinedRestored.includes('// dcuf-concept01-visual-v1:'), false);
assert.equal(combinedRestored, Object.values(sources).join('\n'));
// The approved ordinary-page glass delta is exact. A different filter role
// must not disappear into historical normalization or a broad CSS exemption.
for (const id of ['header-shell-presenter','header-recent-visit-presenter','gallery-page-head-presenter']) {
    const from='var(--dcuf-b1-floating-filter,';
    assert.ok(currentSources[id].includes(from));
    assert.throws(()=>restoreConcept01HeaderVisualDelta(currentSources[id].replace(from,'var(--dcuf-unapproved-filter,')), 'Unregistered glass role must fail exact normalization');
}
const hostSource = await readFile(path.join(root, 'src/targets/mobile/theme-host-style.js'), 'utf8');
const materialSource = await readFile(path.join(root, 'src/targets/mobile/theme-material-values.js'), 'utf8');
const adapterSources = Object.fromEntries(await Promise.all(owners.map(async ([id]) => [id,
    await readFile(path.join(root, 'src/targets/mobile', id.replace('-presenter', '-host-adapter') + '.js'), 'utf8'),
])));
const inputName = builder => builder.replace('__dcufBuild', '__dcufDescribe').replace('Css', 'Selectors');
const declarationOf = (source, name) => {
    const node = parse(source, { ecmaVersion: 'latest' }).body.find(entry =>
        entry.type === 'FunctionDeclaration' && entry.id.name === name);
    assert.ok(node && !node.async && !node.generator, `${name}: synchronous hoisted input required`);
    return source.slice(node.start, node.end);
};
const inputDeclarations = candidates => Object.values(candidates).flatMap(source =>
    parse(source, { ecmaVersion: 'latest' }).body.filter(node => node.type === 'FunctionDeclaration')
        .map(node => source.slice(node.start, node.end))).join('\n');
const themeCall = name => `${name}(${inputName(name)}(ROOT_ATTRIBUTE))`;
const coreCall = name => `${name}(${inputName(name)}())`;

function expandedRules(css) {
    assert.equal(typeof css, 'string');
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const rows = [];
    const pattern = /([^{}]+)\{([^{}]*)\}/g;
    for (const match of stripped.matchAll(pattern)) {
        const selectorList = match[1].trim();
        let depth = 0;
        let start = 0;
        for (let index = 0; index <= selectorList.length; index += 1) {
            if (selectorList[index] === '(' || selectorList[index] === '[') depth += 1;
            if (selectorList[index] === ')' || selectorList[index] === ']') depth -= 1;
            if (index === selectorList.length || (selectorList[index] === ',' && depth === 0)) {
                rows.push([selectorList.slice(start, index).trim().replace(/\s+/g, ' '),
                    match[2].trim().replace(/\s+/g, ' ')]);
                start = index + 1;
            }
        }
        assert.equal(depth, 0, 'unbalanced header selector');
    }
    assert.equal(stripped.replace(pattern, '').trim(), '', 'unparsed header CSS');
    return rows;
}

function digest(rows) {
    // Group only by selector: retain same-selector rule order (stable sort), so
    // swapping competing declarations cannot hide behind a set comparison.
    return createHash('sha256').update(JSON.stringify(rows.toSorted((a, b) =>
        JSON.stringify(a[0]).localeCompare(JSON.stringify(b[0]), 'en')))).digest('hex').toUpperCase();
}

function verify(candidateSources, composition, candidateAdapters = adapterSources) {
    candidateSources = Object.fromEntries(Object.entries(candidateSources).map(([id, source]) =>
        [id, transformHeaderPalettePriorities(source).source]));
    assert.ok(!rawHeaderSelector.test(composition), 'generic theme must not own raw header rules');
    const allRows = [];
    for (const [id, functionName, ownerSelector] of owners) {
        const source = candidateSources[id];
        const node = parse(source, { ecmaVersion: 'latest' }).body.find((entry) =>
            entry.type === 'FunctionDeclaration' && entry.id.name === functionName);
        assert.ok(node && !node.async && !node.generator, `${id}: requires a synchronous hoisted builder`);
        const declaration = source.slice(node.start, node.end);
        assert.ok(!rawHeaderSelector.test(declaration), `${id}: early presentation cannot own native selectors`);
        const input = declarationOf(candidateAdapters[id], inputName(functionName));
        const css = vm.runInNewContext(`${declaration}\n${input}\n${functionName}(${inputName(functionName)}('data-dcuf-palette'))`, {}, { timeout: 1000 });
        const rows = expandedRules(css);
        assert.ok(rows.length > 0);
        assert.ok(rows.every(([selector]) => ownerSelector.test(selector)), `${id}: wrong palette owner`);
        const alternate = vm.runInNewContext(`${declaration}\n${input}\n${functionName}(${inputName(functionName)}('data-dcuf-audit-palette'))`, {}, { timeout: 1000 });
        assert.equal(alternate, css.replaceAll('data-dcuf-palette', 'data-dcuf-audit-palette'));
        assert.equal(composition.split(themeCall(functionName)).length - 1, 1);
        allRows.push(...rows);
    }
    assert.equal(allRows.length, 29);
    const historicalRows = rows => rows.map(([selector, declarations]) => [selector,
        selector === 'html[data-dcuf-palette] body .gnb_bar' ? restoreHistoricalGnbPriorities(declarations, 'theme') : declarations]);
    assert.equal(digest(historicalRows(allRows)), referenceDigest, 'pre-extraction drift beyond declared GNB priorities');
    // Execute at the real assembly phase: target CSS is consumed BEFORE any
    // presenter const initializes. Do not mask a temporal-dead-zone regression.
    const sandbox = { __dcufRoot: {} };
    const css = vm.runInNewContext(`${materialSource}\n${composition}\nconst earlyCss = __dcufBuildTargetThemeCss('data-dcuf-palette');
        ${Object.values(candidateSources).join('\n')}\n${inputDeclarations(candidateAdapters)}\nearlyCss`, sandbox, { timeout: 1000 });
    const start = css.indexOf('/* Host chrome');
    const end = css.indexOf('html[data-dcuf-palette] body.dc-filter-dark-mode #dcuf-retired-dc-personal-block-fab', start);
    assert.ok(start >= 0 && end > start);
    assert.equal(digest(historicalRows(expandedRules(css.slice(start, end)))), referenceDigest);
    return allRows;
}

verify(sources, hostSource);
const mutations = [
    ...Object.entries(palettePriorityProfile).filter(([, p]) => p.rules.length).map(([stem, p]) => {
        const id = stem + '-presenter', declaration = p.rules[0].declarations[0];
        return [{ ...sources, [id]: sources[id].replace(declaration, declaration.replace(';', ' !important;')) }, hostSource];
    }),
    ...[
        ['header-shell-presenter', 'background-color: var(--dcuf-theme-accent-strong) !important;'],
        ['header-shell-presenter', 'background-image: none !important;'],
        ['header-shell-presenter', 'color: var(--dcuf-theme-on-accent) !important;'],
        ['gallery-page-head-presenter', 'background-image: none !important;'],
        ['header-gnb-presenter', 'background: none !important;'],
        ['header-recent-visit-presenter', 'color: var(--dcuf-theme-accent) !important;'],
        ['header-drawer-presenter', 'border-top-color: var(--dcuf-theme-accent) !important;'],
    ].map(([id, declaration]) => [{ ...sources, [id]: sources[id].replace(declaration, declaration.replace(' !important', '')) }, hostSource]),
    [{ ...sources, 'header-shell-presenter': sources['header-shell-presenter'].replace('width: 12px', 'width: 13px') }, hostSource],
    [sources, hostSource, { ...adapterSources, 'header-shell-presenter': adapterSources['header-shell-presenter'].replace('.dcheader.typea', '.gnb_bar') }],
    [{ ...sources, 'header-shell-presenter': sources['header-shell-presenter'].replace('function __dcufBuildHeaderShellThemeCss', 'async function __dcufBuildHeaderShellThemeCss') }, hostSource],
    [{ ...sources, 'header-shell-presenter': sources['header-shell-presenter'].replace('return `', 'document.body; return `') }, hostSource],
    [sources, hostSource.replace('${' + themeCall('__dcufBuildHeaderShellThemeCss') + '}', '')],
    [sources, hostSource.replace('__dcufBuildHeaderShellThemeCss(', '__dcufHeaderShellPresenter.buildThemeCss(')],
    [sources, `${hostSource}\nvoid '.dcheader { color: red; }';`],
    [{ ...sources, 'header-gnb-presenter': sources['header-gnb-presenter'].replace('background-color: var(--dcuf-theme-accent-strong);', 'background-color: var(--dcuf-theme-accent-strong) !important;') }, hostSource],
    [{ ...sources, 'header-gnb-presenter': sources['header-gnb-presenter'].replace('background-image: none;', 'background-image: none !important;') }, hostSource],
];
for (const [candidateSources, composition, candidateAdapters] of mutations) assert.throws(() => verify(candidateSources, composition, candidateAdapters));
// Positive formatting control: do not equate source bytes with behavior.
verify(sources, hostSource.replace('Host chrome uses', 'Host chrome safely uses'));
const targets = JSON.parse(await readFile(path.join(root, 'build/targets.json'), 'utf8'));
assert.ok(targets.targets.pc.inputs.every(({ path: input }) => !owners.some(([id]) => input.endsWith(`/${id}.js`))));
console.log('Header palette ownership PASS: 29 historical pairs after55 exact restorations and two previous GNB priorities; unchanged early phase; 20 rejected mutations; formatting control; PC isolation.');

// Captured independently from exact 81E48's grouped core reset. Preserve all
// seven declarations for both raw roots, including before semantic projection.
const resetDigest = '497689B72F4998C705B5F139E48EA3F5130C95A19818391510A84C521FBD6F38';
const filterSource = await readFile(path.join(root, 'src/targets/mobile/filter-module.js'), 'utf8');
const resetOwners = [
    ['header-shell-presenter', '__dcufBuildHeaderShellResetCss', '.dcheader'],
    ['header-gnb-presenter', '__dcufBuildHeaderGnbResetCss', '.gnb_bar'],
];
function verifyReset(candidateSources, composition, candidateAdapters = adapterSources) {
    assert.ok(!/\.(?:dcheader|gnb_bar)\b/.test(composition), 'filter source must not own raw header reset selectors');
    const rows = [];
    for (const [id, name, selector] of resetOwners) {
        const node = parse(candidateSources[id], { ecmaVersion: 'latest' }).body.find((entry) =>
            entry.type === 'FunctionDeclaration' && entry.id.name === name);
        assert.ok(node && !node.async && !node.generator, `${id}: reset requires a pure hoisted builder`);
        const declaration = candidateSources[id].slice(node.start, node.end);
        assert.ok(!rawHeaderSelector.test(declaration), `${id}: reset presentation cannot own native selectors`);
        const input = declarationOf(candidateAdapters[id], inputName(name));
        const css = vm.runInNewContext(`${declaration}\n${input}\n${name}(${inputName(name)}())`, {}, { timeout: 1000 });
        const ownerRows = expandedRules(css);
        assert.equal(ownerRows.length, 1);
        assert.equal(ownerRows[0][0], selector);
        assert.equal(composition.split(coreCall(name)).length - 1, 1);
        rows.push(...ownerRows);
    }
    assert.equal(digest(rows), resetDigest, 'inherited reset declaration drift');
    const declaration = parse(composition, { ecmaVersion: 'latest' }).body
        .flatMap((node) => node.declarations || []).find((node) => node.id?.name === '__dcufAllFilterCss');
    assert.ok(declaration?.init);
    const expression = composition.slice(declaration.init.start, declaration.init.end);
    const sandbox = { __dcufRoot: {} };
    const css = vm.runInNewContext(`const earlyResetCss = ${expression};
        ${Object.values(candidateSources).join('\n')}\n${inputDeclarations(candidateAdapters)}\nearlyResetCss`, sandbox, { timeout: 1000 });
    const mountedRules = Array.from(css.matchAll(/\.(?:dcheader|gnb_bar)\s*\{[^{}]*\}/g))
        .flatMap(([rule]) => expandedRules(rule));
    assert.equal(digest(mountedRules), resetDigest);
    for (const name of ['__dcufHeaderShellPresenter', '__dcufHeaderGnbPresenter']) {
        assert.ok(Object.isFrozen(sandbox.__dcufRoot[name]));
        assert.equal(typeof sandbox.__dcufRoot[name].buildResetCss, 'function');
    }
}
verifyReset(sources, filterSource);
const resetMutations = [
    [{ ...sources, 'header-shell-presenter': sources['header-shell-presenter'].replace('float: none', 'float: left') }, filterSource],
    [sources, filterSource, { ...adapterSources, 'header-shell-presenter': adapterSources['header-shell-presenter'].replace('root: `.dcheader`', 'root: `.gnb_bar`') }],
    [{ ...sources, 'header-shell-presenter': sources['header-shell-presenter'].replace('function __dcufBuildHeaderShellResetCss', 'async function __dcufBuildHeaderShellResetCss') }, filterSource],
    [{ ...sources, 'header-shell-presenter': sources['header-shell-presenter'].replace('function __dcufBuildHeaderShellResetCss(selectors) {', 'function __dcufBuildHeaderShellResetCss(selectors) { document.body;') }, filterSource],
    [sources, filterSource.replace('${' + coreCall('__dcufBuildHeaderShellResetCss') + '}', '')],
    [sources, filterSource.replace('${' + coreCall('__dcufBuildHeaderShellResetCss') + '}', '${' + coreCall('__dcufBuildHeaderShellResetCss') + '} ${' + coreCall('__dcufBuildHeaderShellResetCss') + '}')],
    [sources, filterSource.replace('__dcufBuildHeaderShellResetCss(', '__dcufHeaderShellPresenter.buildResetCss(')],
    [sources, filterSource.replace('html, body, #top, #container', 'html, body, #top, .dcheader, #container')],
];
for (const [candidateSources, composition, candidateAdapters] of resetMutations) assert.throws(() => verifyReset(candidateSources, composition, candidateAdapters));
verifyReset(sources, filterSource.replace('기본 레이아웃 재정의', '기본 레이아웃 재정의 (표현 책임 분리)'));
console.log('Header reset ownership PASS: 14 inherited selector/property pairs; original early core phase; 8 rejected mutations; formatting control.');

// Independently captured from exact CC0CE's two grouped concealment rules.
const visibilityDigest = '40476C411ED3B1FB98F5D51EFF9C3165E320944FDB0C880F19580F7CFF8F2B1C';
const visibilityName = '__dcufBuildHeaderDrawerVisibilityCss';
const visibilitySelectors = ['.issue_contentbox:not([data-dcuf-header-native-door-open="1"])',
    '#gall_top_recom.concept_wrap:not([data-dcuf-header-native-recom-open="1"])'];
function verifyVisibility(candidateSources, composition, candidateAdapters = adapterSources) {
    assert.ok(!/(?:\.issue_contentbox\b|#gall_top_recom\b)/.test(composition), 'generic filter must not own native-door visibility selectors');
    const source = candidateSources['header-drawer-presenter'];
    const node = parse(source, { ecmaVersion: 'latest' }).body.find((entry) =>
        entry.type === 'FunctionDeclaration' && entry.id.name === visibilityName);
    assert.ok(node && !node.async && !node.generator, 'drawer visibility requires a synchronous hoisted builder');
    const builder = source.slice(node.start, node.end);
    assert.ok(!/(?:\.issue_contentbox\b|#gall_top_recom\b)/.test(builder), 'visibility presentation cannot own native selectors');
    const input = declarationOf(candidateAdapters['header-drawer-presenter'], inputName(visibilityName));
    const css = vm.runInNewContext(`${builder}\n${input}\n${visibilityName}(${inputName(visibilityName)}())`, {}, { timeout: 1000 });
    const rows = expandedRules(css);
    assert.equal(rows.length, 2);
    assert.equal(digest(rows), visibilityDigest, 'inherited visibility selector/declaration drift');
    assert.equal(composition.split(coreCall(visibilityName)).length - 1, 1);
    const declaration = parse(composition, { ecmaVersion: 'latest' }).body
        .flatMap((entry) => entry.declarations || []).find((entry) => entry.id?.name === '__dcufAllFilterCss');
    const expression = composition.slice(declaration.init.start, declaration.init.end);
    const sandbox = { __dcufRoot: {} };
    const earlyCss = vm.runInNewContext(`const css = ${expression};
        ${Object.values(candidateSources).join('\n')}\n${inputDeclarations(candidateAdapters)}\ncss`, sandbox, { timeout: 1000 });
    const mounted = Array.from(earlyCss.matchAll(/[^{}]*\{[^{}]*\}/g))
        .filter(([rule]) => visibilitySelectors.some((selector) => rule.includes(selector)))
        .flatMap(([rule]) => expandedRules(rule)).filter(([selector]) => visibilitySelectors.includes(selector));
    assert.equal(digest(mounted), visibilityDigest);
    const visibilityStart = earlyCss.indexOf(visibilitySelectors[0]);
    assert.ok(visibilityStart > earlyCss.indexOf('.adv_area'));
    assert.ok(visibilityStart < earlyCss.indexOf('.minor_intro_area {'), 'concealment must remain immediately after core hide rules');
    const presenter = sandbox.__dcufRoot.__dcufHeaderDrawerPresenter;
    assert.ok(Object.isFrozen(presenter));
    assert.equal(typeof presenter.buildVisibilityCss, 'function');
    assert.equal(presenter.buildVisibilityCss(sandbox[inputName(visibilityName)]()), css);
}
verifyVisibility(sources, filterSource);
const visibilityMutations = [
    [{ ...sources, 'header-drawer-presenter': sources['header-drawer-presenter'].replace('display: none !important;', 'display: block !important;') }, filterSource],
    [{ ...sources, 'header-drawer-presenter': sources['header-drawer-presenter'].replace('display: none !important;', 'display: none;') }, filterSource],
    [sources, filterSource, { ...adapterSources, 'header-drawer-presenter': adapterSources['header-drawer-presenter'].replace('.issue_contentbox:not(', '.issue_contentbox[data-dcuf-header-native-door="1"]:not(') }],
    [sources, filterSource, { ...adapterSources, 'header-drawer-presenter': adapterSources['header-drawer-presenter'].replace('data-dcuf-header-native-door-open="1"', 'data-dcuf-header-native-door-open="0"') }],
    [{ ...sources, 'header-drawer-presenter': sources['header-drawer-presenter'].replace(`function ${visibilityName}`, `async function ${visibilityName}`) }, filterSource],
    [{ ...sources, 'header-drawer-presenter': sources['header-drawer-presenter'].replace(`function ${visibilityName}(selectors) {`, `function ${visibilityName}(selectors) { document.body;`) }, filterSource],
    [sources, filterSource.replace('${' + coreCall(visibilityName) + '}', '')],
    [sources, filterSource.replace('${' + coreCall(visibilityName) + '}', '${' + coreCall(visibilityName) + '} ${' + coreCall(visibilityName) + '}')],
    [sources, filterSource.replace(visibilityName + '(', '__dcufHeaderDrawerPresenter.buildVisibilityCss(')],
    [sources, `${filterSource}\nvoid '.issue_contentbox:not([data-dcuf-header-native-door-open="1"]) { display:none!important; }';`],
];
for (const [candidateSources, composition, candidateAdapters] of visibilityMutations) assert.throws(() => verifyVisibility(candidateSources, composition, candidateAdapters));
verifyVisibility(sources, filterSource.replace('기본 레이아웃 재정의', '기본 레이아웃 재정의 (소유권 분리)'));
console.log('Header native-door visibility ownership PASS: 2 inherited selector/property pairs; original pre-projection core phase; 10 rejected mutations; formatting control; PC isolation.');
