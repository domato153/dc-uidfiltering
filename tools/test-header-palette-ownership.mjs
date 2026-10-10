import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';

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
const sources = Object.fromEntries(await Promise.all(owners.map(async ([id]) => [id,
    await readFile(path.join(root, 'src/targets/mobile', `${id}.js`), 'utf8'),
])));
const hostSource = await readFile(path.join(root, 'src/targets/mobile/theme-host-style.js'), 'utf8');

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

function verify(candidateSources, composition) {
    assert.ok(!rawHeaderSelector.test(composition), 'generic theme must not own raw header rules');
    const allRows = [];
    for (const [id, functionName, ownerSelector] of owners) {
        const source = candidateSources[id];
        const node = parse(source, { ecmaVersion: 'latest' }).body.find((entry) =>
            entry.type === 'FunctionDeclaration' && entry.id.name === functionName);
        assert.ok(node && !node.async && !node.generator, `${id}: requires a synchronous hoisted builder`);
        const declaration = source.slice(node.start, node.end);
        const css = vm.runInNewContext(`${declaration}\n${functionName}('data-dcuf-palette')`, {}, { timeout: 1000 });
        const rows = expandedRules(css);
        assert.ok(rows.length > 0);
        assert.ok(rows.every(([selector]) => ownerSelector.test(selector)), `${id}: wrong palette owner`);
        const alternate = vm.runInNewContext(`${declaration}\n${functionName}('data-dcuf-audit-palette')`, {}, { timeout: 1000 });
        assert.equal(alternate, css.replaceAll('data-dcuf-palette', 'data-dcuf-audit-palette'));
        assert.equal((composition.match(new RegExp(`${functionName}\\(ROOT_ATTRIBUTE\\)`, 'g')) || []).length, 1);
        allRows.push(...rows);
    }
    assert.equal(allRows.length, 29);
    assert.equal(digest(allRows), referenceDigest, 'pre-extraction selector/declaration drift');
    // Execute at the real assembly phase: target CSS is consumed BEFORE any
    // presenter const initializes. Do not mask a temporal-dead-zone regression.
    const sandbox = { __dcufRoot: {} };
    const css = vm.runInNewContext(`${composition}\nconst earlyCss = __dcufBuildTargetThemeCss('data-dcuf-palette');
        ${Object.values(candidateSources).join('\n')}\nearlyCss`, sandbox, { timeout: 1000 });
    const start = css.indexOf('/* Host chrome');
    const end = css.indexOf('html[data-dcuf-palette] body.dc-filter-dark-mode #dc-personal-block-fab', start);
    assert.ok(start >= 0 && end > start);
    assert.equal(digest(expandedRules(css.slice(start, end))), referenceDigest);
    return allRows;
}

verify(sources, hostSource);
const mutations = [
    [{ ...sources, 'header-shell-presenter': sources['header-shell-presenter'].replace('width: 12px', 'width: 13px') }, hostSource],
    [{ ...sources, 'header-shell-presenter': sources['header-shell-presenter'].replace('.dcheader.typea', '.gnb_bar') }, hostSource],
    [{ ...sources, 'header-shell-presenter': sources['header-shell-presenter'].replace('function __dcufBuildHeaderShellThemeCss', 'async function __dcufBuildHeaderShellThemeCss') }, hostSource],
    [{ ...sources, 'header-shell-presenter': sources['header-shell-presenter'].replace('return `', 'document.body; return `') }, hostSource],
    [sources, hostSource.replace('${__dcufBuildHeaderShellThemeCss(ROOT_ATTRIBUTE)}', '')],
    [sources, hostSource.replace('__dcufBuildHeaderShellThemeCss(ROOT_ATTRIBUTE)', '__dcufHeaderShellPresenter.buildThemeCss(ROOT_ATTRIBUTE)')],
    [sources, `${hostSource}\nvoid '.dcheader { color: red; }';`],
];
for (const [candidateSources, composition] of mutations) assert.throws(() => verify(candidateSources, composition));
// Positive formatting control: do not equate source bytes with behavior.
verify(sources, hostSource.replace('Host chrome uses', 'Host chrome safely uses'));
const targets = JSON.parse(await readFile(path.join(root, 'build/targets.json'), 'utf8'));
assert.ok(targets.targets.pc.inputs.every(({ path: input }) => !owners.some(([id]) => input.endsWith(`/${id}.js`))));
console.log('Header palette ownership PASS: 29 unchanged selector/declaration pairs; unchanged early phase; 7 rejected mutations; formatting control; PC isolation.');

// Captured independently from exact 81E48's grouped core reset. Preserve all
// seven declarations for both raw roots, including before semantic projection.
const resetDigest = '497689B72F4998C705B5F139E48EA3F5130C95A19818391510A84C521FBD6F38';
const filterSource = await readFile(path.join(root, 'src/targets/mobile/filter-module.js'), 'utf8');
const resetOwners = [
    ['header-shell-presenter', '__dcufBuildHeaderShellResetCss', '.dcheader'],
    ['header-gnb-presenter', '__dcufBuildHeaderGnbResetCss', '.gnb_bar'],
];
function verifyReset(candidateSources, composition) {
    assert.ok(!/\.(?:dcheader|gnb_bar)\b/.test(composition), 'filter source must not own raw header reset selectors');
    const rows = [];
    for (const [id, name, selector] of resetOwners) {
        const node = parse(candidateSources[id], { ecmaVersion: 'latest' }).body.find((entry) =>
            entry.type === 'FunctionDeclaration' && entry.id.name === name);
        assert.ok(node && !node.async && !node.generator, `${id}: reset requires a pure hoisted builder`);
        const declaration = candidateSources[id].slice(node.start, node.end);
        const css = vm.runInNewContext(`${declaration}\n${name}()`, {}, { timeout: 1000 });
        const ownerRows = expandedRules(css);
        assert.equal(ownerRows.length, 1);
        assert.equal(ownerRows[0][0], selector);
        assert.equal((composition.match(new RegExp(`${name}\\(\\)`, 'g')) || []).length, 1);
        rows.push(...ownerRows);
    }
    assert.equal(digest(rows), resetDigest, 'inherited reset declaration drift');
    const declaration = parse(composition, { ecmaVersion: 'latest' }).body
        .flatMap((node) => node.declarations || []).find((node) => node.id?.name === '__dcufAllFilterCss');
    assert.ok(declaration?.init);
    const expression = composition.slice(declaration.init.start, declaration.init.end);
    const sandbox = { __dcufRoot: {} };
    const css = vm.runInNewContext(`const earlyResetCss = ${expression};
        ${Object.values(candidateSources).join('\n')}\nearlyResetCss`, sandbox, { timeout: 1000 });
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
    [{ ...sources, 'header-shell-presenter': sources['header-shell-presenter'].replace('.dcheader {', '.gnb_bar {') }, filterSource],
    [{ ...sources, 'header-shell-presenter': sources['header-shell-presenter'].replace('function __dcufBuildHeaderShellResetCss', 'async function __dcufBuildHeaderShellResetCss') }, filterSource],
    [{ ...sources, 'header-shell-presenter': sources['header-shell-presenter'].replace('function __dcufBuildHeaderShellResetCss() {', 'function __dcufBuildHeaderShellResetCss() { document.body;') }, filterSource],
    [sources, filterSource.replace('${__dcufBuildHeaderShellResetCss()}', '')],
    [sources, filterSource.replace('${__dcufBuildHeaderShellResetCss()}', '${__dcufBuildHeaderShellResetCss()} ${__dcufBuildHeaderShellResetCss()}')],
    [sources, filterSource.replace('__dcufBuildHeaderShellResetCss()', '__dcufHeaderShellPresenter.buildResetCss()')],
    [sources, filterSource.replace('html, body, #top, #container', 'html, body, #top, .dcheader, #container')],
];
for (const [candidateSources, composition] of resetMutations) assert.throws(() => verifyReset(candidateSources, composition));
verifyReset(sources, filterSource.replace('기본 레이아웃 재정의', '기본 레이아웃 재정의 (표현 책임 분리)'));
console.log('Header reset ownership PASS: 14 inherited selector/property pairs; original early core phase; 8 rejected mutations; formatting control.');

// Independently captured from exact CC0CE's two grouped concealment rules.
const visibilityDigest = '40476C411ED3B1FB98F5D51EFF9C3165E320944FDB0C880F19580F7CFF8F2B1C';
const visibilityName = '__dcufBuildHeaderDrawerVisibilityCss';
const visibilitySelectors = ['.issue_contentbox:not([data-dcuf-header-native-door-open="1"])',
    '#gall_top_recom.concept_wrap:not([data-dcuf-header-native-recom-open="1"])'];
function verifyVisibility(candidateSources, composition) {
    assert.ok(!/(?:\.issue_contentbox\b|#gall_top_recom\b)/.test(composition), 'generic filter must not own native-door visibility selectors');
    const source = candidateSources['header-drawer-presenter'];
    const node = parse(source, { ecmaVersion: 'latest' }).body.find((entry) =>
        entry.type === 'FunctionDeclaration' && entry.id.name === visibilityName);
    assert.ok(node && !node.async && !node.generator, 'drawer visibility requires a synchronous hoisted builder');
    const css = vm.runInNewContext(`${source.slice(node.start, node.end)}\n${visibilityName}()`, {}, { timeout: 1000 });
    const rows = expandedRules(css);
    assert.equal(rows.length, 2);
    assert.equal(digest(rows), visibilityDigest, 'inherited visibility selector/declaration drift');
    assert.equal((composition.match(new RegExp(`${visibilityName}\\(\\)`, 'g')) || []).length, 1);
    const declaration = parse(composition, { ecmaVersion: 'latest' }).body
        .flatMap((entry) => entry.declarations || []).find((entry) => entry.id?.name === '__dcufAllFilterCss');
    const expression = composition.slice(declaration.init.start, declaration.init.end);
    const sandbox = { __dcufRoot: {} };
    const earlyCss = vm.runInNewContext(`const css = ${expression};
        ${Object.values(candidateSources).join('\n')}\ncss`, sandbox, { timeout: 1000 });
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
    assert.equal(presenter.buildVisibilityCss(), css);
}
verifyVisibility(sources, filterSource);
const visibilityMutations = [
    [{ ...sources, 'header-drawer-presenter': sources['header-drawer-presenter'].replace('display: none !important;', 'display: block !important;') }, filterSource],
    [{ ...sources, 'header-drawer-presenter': sources['header-drawer-presenter'].replace('display: none !important;', 'display: none;') }, filterSource],
    [{ ...sources, 'header-drawer-presenter': sources['header-drawer-presenter'].replace('.issue_contentbox:not(', '.issue_contentbox[data-dcuf-header-native-door="1"]:not(') }, filterSource],
    [{ ...sources, 'header-drawer-presenter': sources['header-drawer-presenter'].replace('data-dcuf-header-native-door-open="1"', 'data-dcuf-header-native-door-open="0"') }, filterSource],
    [{ ...sources, 'header-drawer-presenter': sources['header-drawer-presenter'].replace(`function ${visibilityName}`, `async function ${visibilityName}`) }, filterSource],
    [{ ...sources, 'header-drawer-presenter': sources['header-drawer-presenter'].replace(`function ${visibilityName}() {`, `function ${visibilityName}() { document.body;`) }, filterSource],
    [sources, filterSource.replace('${__dcufBuildHeaderDrawerVisibilityCss()}', '')],
    [sources, filterSource.replace('${__dcufBuildHeaderDrawerVisibilityCss()}', '${__dcufBuildHeaderDrawerVisibilityCss()} ${__dcufBuildHeaderDrawerVisibilityCss()}')],
    [sources, filterSource.replace('__dcufBuildHeaderDrawerVisibilityCss()', '__dcufHeaderDrawerPresenter.buildVisibilityCss()')],
    [sources, `${filterSource}\nvoid '.issue_contentbox:not([data-dcuf-header-native-door-open="1"]) { display:none!important; }';`],
];
for (const [candidateSources, composition] of visibilityMutations) assert.throws(() => verifyVisibility(candidateSources, composition));
verifyVisibility(sources, filterSource.replace('기본 레이아웃 재정의', '기본 레이아웃 재정의 (소유권 분리)'));
console.log('Header native-door visibility ownership PASS: 2 inherited selector/property pairs; original pre-projection core phase; 10 rejected mutations; formatting control; PC isolation.');
