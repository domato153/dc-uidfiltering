import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertNoRuntimeErrors, createTestPage, getMetrics, launchBrowser, storageKeys } from './harness/runner-utils.mjs';
import { startServer } from './server/server.mjs';

// A scoped compatibility/debt observation, not a header acceptance receipt.
// Every mutation is synchronous and restored before native interactions resume.
// Base/title inline probes use childless copies, never native controls.
// GNB probes reversibly mutate the original root and restore it before input.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const recentTitleContract = args.includes('--recent-title-contract');
const gnbResetContract = args.includes('--gnb-reset-contract');
// Independent expected accents, not values read back from candidate variables.
const recentTitlePresets = [
    ['blue', '#3f6de0', '#8cb4ff'], ['purple', '#7c3aed', '#c4b5fd'],
    ['green', '#16805d', '#6ee7b7'], ['orange', '#c2410c', '#fdba74'],
    ['mono', '#526274', '#cbd5e1'], ['indigo', '#4f46e5', '#4f46e5'],
    ['sky', '#0284c7', '#0369a1'], ['cyan', '#0891b2', '#0e7490'],
    ['teal', '#0f766e', '#0f766e'], ['lime', '#65a30d', '#4d7c0f'],
    ['amber', '#d97706', '#b45309'], ['red', '#dc2626', '#c62828'],
    ['rose', '#e11d48', '#cf234c'], ['pink', '#db2777', '#c52a72'],
];
const hexToRgb = (value) => `rgb(${[1, 3, 5].map((start) => parseInt(value.slice(start, start + 2), 16)).join(', ')})`;
const outputIndex = args.indexOf('--output');
assert.ok(outputIndex >= 0 && args[outputIndex + 1], 'Specify --output');
assert.ok(args.includes('--require-runtime-under-test'), 'Source-work runtime guard is required');
const runtime = path.join(root, 'testbed/artifacts/runtime-under-test.user.js');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const runtimeBytes = await readFile(runtime);
assert.equal(runtimeBytes.toString().match(/^\/\/\s*@name\s+(.+)$/m)?.[1]?.trim(), 'DC_UserFilter_Mobile');
process.env.DCUF_TESTBED_USERSCRIPT = runtime;
process.env.DCUF_TESTBED_TARGET = 'mobile';
console.log(`Header cascade runtime: ${runtime}; SHA-256 ${sha(runtimeBytes)}`);
const output = path.resolve(root, args[outputIndex + 1]);
assert.ok(output.startsWith(path.join(root, 'testbed/artifacts') + path.sep), 'Output must stay in testbed/artifacts');
const sourceIds = ['header-shell', 'header-gnb', 'gallery-page-head', 'header-recent-visit', 'header-drawer'];
const dependencyPaths = [
    'testbed/run-header-cascade-audit.mjs', 'testbed/harness/runner-utils.mjs',
    'testbed/harness/userscript-loader.mjs', 'testbed/harness/gm-shim.js',
    'testbed/harness/boot-probe.js', 'testbed/harness/runtime-instrumentation.js',
    'testbed/harness/playwright-loader.cjs', 'testbed/public/fixture.css', 'testbed/public/fixture-client.js',
    'testbed/server/server.mjs', 'testbed/fixtures/builders.mjs', 'testbed/fixtures/pages.mjs',
    ...sourceIds.map((id) => `src/targets/mobile/${id}-presenter.js`),
    'src/targets/mobile/filter-module.js', 'src/targets/mobile/theme-host-style.js',
    'src/targets/mobile/header-recent-visit-host-adapter.js',
    'src/targets/mobile/header-gnb-host-adapter.js',
    'src/targets/mobile/header-drawer-host-adapter.js',
    'src/targets/mobile/runtime-coordinator.js',
    'src/targets/shared/theme-presenter.js', 'src/targets/shared/theme-host-port.js',
];
const dependencyHashes = Object.fromEntries(await Promise.all(dependencyPaths.map(async (file) =>
    [file, sha(await readFile(path.join(root, file)))])));
const routes = [
    ['/board/lists?id=test', 'major-list'],
    ['/mgallery/board/lists?id=test', 'minor-list'],
    ['/mini/board/lists?id=test', 'mini-list'],
    ['/mgallery/board/view?id=test&no=1001&header=1', 'minor-view'],
];
const server = await startServer();
let browser;
const observations = [];
try {
    browser = await launchBrowser();
    for (const [route, id] of routes) for (const dark of [false, true]) {
        const session = await createTestPage(browser, server.baseUrl, {
            viewport: { width: 1280, height: 900 },
            storage: { [storageKeys.threshold]: 0, [storageKeys.ratioEnabled]: false,
                [storageKeys.personalEnabled]: true, [storageKeys.personalList]: { uids: [], nicknames: [], ips: [] },
                ...(recentTitleContract ? { [storageKeys.palette]: 'purple' } : {}) },
            gmBehavior: recentTitleContract ? { pendingKeys: [storageKeys.palette] } : {},
        });
        let nativeKeyboardProbe;
        try {
            await session.goto(route);
            if (dark) {
                await session.page.evaluate(() => window.__dcufFixture.toggleDark(true));
                await session.page.waitForFunction(() => document.body.classList.contains('dc-filter-dark-mode'));
            }
            await session.page.waitForFunction(() => document.querySelector('[data-dcuf-header-shell-role="head"]')
                && document.querySelector('[data-dcuf-header-gnb-role="nav"]')
                && document.querySelector('[data-dcuf-gallery-page-head-role="root"]')
                && document.querySelector('[data-dcuf-header-recent-visit-role="list"]'));
            await session.page.locator('#dcuf-testbed-controls').evaluate((element) => { element.style.display = 'none'; });
            const capture = () => session.page.evaluate(() => {
                // Test style on a rule BEFORE considering nested rules: some
                // engines expose an empty cssRules collection on a style rule.
                const walk = (rules, context = []) => Array.from(rules).flatMap((rule) => {
                    if (rule.selectorText && rule.style) return [{ rule, context }];
                    return rule.cssRules ? walk(rule.cssRules, [...context, rule.conditionText || rule.cssText.split('{')[0]]) : [];
                });
                const mounted = Array.from(document.styleSheets).flatMap((sheet, order) => {
                    try { return walk(sheet.cssRules).map(({ rule, context }) => ({ rule, context, order,
                        owner: sheet.ownerNode?.getAttribute('data-dcuf-style-owner') || sheet.ownerNode?.id || 'anonymous' })); }
                    catch { return []; }
                });
                const targets = {
                    shellRoot: '[data-dcuf-header-shell-role="root"]',
                    shell: '[data-dcuf-header-shell-role="head"]',
                    gnbRoot: '[data-dcuf-header-gnb-role="root"]',
                    gnb: '[data-dcuf-header-gnb-role="nav"]',
                    pageHead: '[data-dcuf-gallery-page-head-role="root"]',
                    recent: '[data-dcuf-header-recent-visit-role="list"]',
                    recentTitle: '[data-dcuf-header-recent-visit-role="title"]',
                    door: '.issue_contentbox',
                    popup: '#hot_rank_pop2',
                };
                const elements = Object.fromEntries(Object.entries(targets).map(([name, selector]) => {
                    const element = document.querySelector(selector);
                    if (!element) return [name, null];
                    const box = element.getBoundingClientRect();
                    const style = getComputedStyle(element);
                    return [name, { box: { x: box.x, y: box.y, width: box.width, height: box.height },
                        computed: Object.fromEntries(['display', 'position', 'padding', 'min-width', 'width', 'color', 'visibility', 'pointer-events', 'z-index']
                            .map((property) => [property, style.getPropertyValue(property)])),
                        inline: element.getAttribute('style'),
                        matches: mounted.filter(({ rule, context }) => context.every((condition) => matchMedia(condition).matches)
                            && element.matches(rule.selectorText)).map(({ rule, context, order, owner }) => ({
                            selector: rule.selectorText, context, order, owner,
                            declarations: Array.from(rule.style, (property) => [property, rule.style.getPropertyValue(property), rule.style.getPropertyPriority(property)]),
                        })) }];
                }));
                const names = ['HeaderShell', 'HeaderGnb', 'GalleryPageHead', 'HeaderRecentVisit', 'HeaderDrawer'];
                const inventory = names.map((name) => {
                    const presenter = window[`__dcuf${name}Presenter`];
                    const element = document.getElementById(presenter.style.id);
                    const sourceSheet = new CSSStyleSheet();
                    sourceSheet.replaceSync(presenter.style.css);
                    const rules = walk(sourceSheet.cssRules);
                    return { name, owner: element?.getAttribute('data-dcuf-style-owner') || null,
                        mountedIdentity: element ? element.textContent === presenter.style.css : null,
                        authoredImportant: (presenter.style.css.match(/!important/g) || []).length,
                        baseRules: rules.map(({ rule, context }) => ({ selector: rule.selectorText, context, cssText: rule.style.cssText,
                            important: Array.from(rule.style).filter((property) => rule.style.getPropertyPriority(property) === 'important') })),
                        paletteImportant: (presenter.buildThemeCss('data-dcuf-palette').match(/!important/g) || []).length,
                        resetImportant: (presenter.buildResetCss?.().match(/!important/g) || []).length,
                        visibilityImportant: (presenter.buildVisibilityCss?.().match(/!important/g) || []).length };
                });
                return { elements, inventory };
            });
            const initial = await capture();
            assert.equal(initial.inventory.length, 5);
            for (const item of initial.inventory) {
                assert.ok(item.baseRules.length > 0);
                assert.equal(item.mountedIdentity, id === 'minor-view' && item.name === 'HeaderDrawer' ? null : true,
                    `${id}: route-specific ${item.name} mount contract`);
            }
            for (const name of ['shellRoot', 'shell', 'gnbRoot', 'gnb', 'pageHead', 'recent', 'recentTitle']) {
                const item = initial.elements[name];
                assert.ok(item?.box.width > 0 && item.box.height > 0 && item.matches.length > 0, `${id}: positive ${name} coverage required`);
            }
            // Guard the observed palette-vs-dark-title competition explicitly.
            const titleColor = await session.page.evaluate(() => {
                const probe = document.createElement('i');
                probe.style.color = 'var(--dcuf-theme-accent)';
                document.body.appendChild(probe);
                const color = getComputedStyle(probe).color;
                probe.remove();
                return color;
            });
            assert.equal(initial.elements.recentTitle.computed.color, titleColor, `${id}: palette title winner drift`);
            const probes = await session.page.evaluate(() => {
                const specs = [
                    ['shell', 'dcuf-header-shell-style', '[data-dcuf-header-shell-role="head"]', 'display', 'block'],
                    ['gnb', 'dcuf-header-gnb-style', '[data-dcuf-header-gnb-role="nav"]', 'display', 'block'],
                    ['pageHead', 'dcuf-gallery-page-head-style', '[data-dcuf-gallery-page-head-role="root"]', 'padding', '23px'],
                    ['recent', 'dcuf-header-recent-visit-style', '[data-dcuf-header-recent-visit-role="list"]', 'position', 'absolute'],
                ];
                return specs.map(([name, styleId, selector, property, conflict]) => {
                    const original = document.querySelector(selector);
                    const element = original.cloneNode(false);
                    original.parentNode.appendChild(element);
                    const baseline = getComputedStyle(element).getPropertyValue(property);
                    const rules = Array.from(document.getElementById(styleId).sheet.cssRules)
                        .filter((rule) => rule.selectorText && element.matches(rule.selectorText) && rule.style.getPropertyPriority(property) === 'important');
                    const savedRules = rules.map((rule) => [rule, rule.style.cssText]);
                    let result;
                    try {
                        element.style.setProperty(property, conflict);
                        const protectedValue = getComputedStyle(element).getPropertyValue(property);
                        for (const rule of rules) rule.style.setProperty(property, rule.style.getPropertyValue(property), '');
                        const removedValue = getComputedStyle(element).getPropertyValue(property);
                        result = { name, property, baseline, conflict, protectedValue, removedValue, matchedImportant: rules.length };
                    } finally {
                        for (const [rule, cssText] of savedRules) rule.style.cssText = cssText;
                        element.remove();
                    }
                    return { ...result, restoredValue: getComputedStyle(original).getPropertyValue(property),
                        probeRemoved: !element.isConnected,
                        restoredRules: savedRules.every(([rule, cssText]) => rule.style.cssText === cssText) };
                });
            });
            for (const probe of probes) {
                assert.ok(probe.matchedImportant > 0);
                assert.equal(probe.protectedValue, probe.baseline, `${id}: ${probe.name} normal-inline protection`);
                assert.notEqual(probe.removedValue, probe.baseline, `${id}: ${probe.name} removal control must be sensitive`);
                assert.equal(probe.removedValue, probe.conflict);
                assert.equal(probe.restoredValue, probe.baseline);
                assert.equal(probe.probeRemoved, true);
                assert.equal(probe.restoredRules, true);
            }
            assert.deepEqual(await capture(), initial, `${id}: probes must restore original inline/cascade/geometry`);
            const states = [{ step: 'closed', capture: initial }];
            let nativeKeyboard;
            if (id === 'minor-list') {
                nativeKeyboardProbe = await session.page.evaluateHandle(() => {
                    const selectors = ['.dcuf-header-drawer', '.dcuf-header-drawer__toggle', '.issue_contentbox', '#hot_rank_pop2', '.btn_hotall_list', '#hot_rank_pop2 .poply_close'];
                    const nodes = selectors.map(selector => document.querySelector(selector));
                    const topology = nodes.map(node => [node.parentNode, node.nextSibling, node.getAttribute('onclick')]);
                    const events = [];
                    const state = () => ({ active: nodes.indexOf(document.activeElement), activeTag: document.activeElement?.tagName,
                        drawerOpen: nodes[0].getAttribute('data-open'), doorOpen: nodes[2].getAttribute('data-dcuf-header-native-door-open'),
                        popupOnly: nodes[2].getAttribute('data-dcuf-header-native-door-popup-only'),
                        popupDisplay: getComputedStyle(nodes[3]).display, callbacks: window.__fixtureHotRankToggles,
                        identity: nodes.every((node, i) => node === document.querySelector(selectors[i])
                            && node.parentNode === topology[i][0] && node.nextSibling === topology[i][1]
                            && node.getAttribute('onclick') === topology[i][2]) });
                    const listener = event => {
                        if (event.key === 'Enter' || nodes.some(node => node === event.target || node.contains(event.target))) {
                            events.push({ type: event.type, time: performance.now(), trusted: event.isTrusted,
                                key: event.key || null, detail: event.detail, prevented: event.defaultPrevented,
                                target: nodes.findIndex(node => node === event.target), state: state() });
                        }
                    };
                    const types = ['focus', 'blur', 'keydown', 'keyup', 'click'];
                    types.forEach(type => document.addEventListener(type, listener, true));
                    return { nodes, events, state, types, listener, gm: window.__dcufTestbedGM.snapshot(),
                        resources: window.__dcufHeaderDrawerHostAdapter.snapshotResources() };
                });
                await session.page.waitForFunction(() => document.querySelector('.dcuf-header-drawer__toggle'));
                await session.page.locator('.dcuf-header-drawer__toggle').click();
                await session.page.waitForFunction(() => document.querySelector('.issue_contentbox')?.getAttribute('data-dcuf-header-native-door-open') === '1');
                const open = await capture();
                assert.ok(open.elements.door.box.width > 0 && open.elements.door.box.height > 0);
                states.push({ step: 'open', capture: open });
                await session.page.locator('.issue_contentbox .btn_hotall_list').click();
                await session.page.waitForFunction(() => getComputedStyle(document.getElementById('hot_rank_pop2')).display !== 'none');
                const popupOpen = await capture();
                assert.equal(popupOpen.elements.popup.computed.position, 'fixed');
                assert.ok(popupOpen.elements.popup.box.width > 0 && popupOpen.elements.popup.box.height > 0);
                states.push({ step: 'popup-open', capture: popupOpen });
                // The open rank popup can legitimately cover the toggle.
                // Exercise the established keyboard popup-only transition.
                await session.page.locator('.dcuf-header-drawer__toggle').focus();
                await session.page.locator('.dcuf-header-drawer__toggle').press('Enter');
                await session.page.waitForFunction(() => document.querySelector('.issue_contentbox')?.getAttribute('data-dcuf-header-native-door-popup-only') === '1');
                const popupOnly = await capture();
                assert.equal(popupOnly.elements.door.computed.visibility, 'hidden');
                assert.equal(popupOnly.elements.popup.computed.visibility, 'visible');
                assert.equal(popupOnly.elements.popup.computed['pointer-events'], 'auto');
                states.push({ step: 'popup-only', capture: popupOnly });
                await session.page.locator('#hot_rank_pop2 .poply_close').click();
                await session.page.waitForFunction(() => getComputedStyle(document.querySelector('.issue_contentbox')).display === 'none');
                states.push({ step: 'reclosed', capture: await capture() });
                await session.page.waitForFunction(() => window.__dcufTestbedMetrics.snapshot().activeTimeouts === 0
                    && window.__dcufTestbedMetrics.snapshot().activeAnimationFrames === 0);
                nativeKeyboard = await session.page.evaluate(saved => {
                    const gm = window.__dcufTestbedGM.snapshot();
                    return { events: saved.events, final: saved.state(), resourcesBefore: saved.resources,
                        resourcesAfter: window.__dcufHeaderDrawerHostAdapter.snapshotResources(),
                        storedValuesPreserved: JSON.stringify(saved.gm.values) === JSON.stringify(gm.values),
                        storedWritesPreserved: JSON.stringify(saved.gm.writes) === JSON.stringify(gm.writes) };
                }, nativeKeyboardProbe);
                const enterEvents = nativeKeyboard.events.filter(event => event.type === 'keydown' || event.type === 'keyup'
                    || (event.type === 'click' && event.target === 1));
                assert.deepEqual(enterEvents.map(event => [event.type, event.target, event.trusted, event.prevented]),
                    [['keydown', 1, true, false], ['click', 1, true, true], ['keyup', 1, true, false]], 'one trusted default Enter click on original focused toggle');
                assert.equal(enterEvents[1].detail, 0);
                assert.equal(nativeKeyboard.final.identity, true);
                assert.equal(nativeKeyboard.final.callbacks, 2);
                assert.equal(nativeKeyboard.final.drawerOpen, '0');
                assert.equal(nativeKeyboard.final.popupOnly, null);
                assert.equal(nativeKeyboard.final.popupDisplay, 'none');
                assert.deepEqual(nativeKeyboard.resourcesAfter, nativeKeyboard.resourcesBefore);
                assert.equal(nativeKeyboard.storedValuesPreserved, true);
                assert.equal(nativeKeyboard.storedWritesPreserved, true);
            }
            let recentTitle;
            if (recentTitleContract) {
                const originalRecentNodes = await session.page.evaluateHandle(() => {
                    const root = document.querySelector('.newvisit_history');
                    return { root, title: root.querySelector(':scope > .tit'),
                        controls: Array.from(root.querySelectorAll('button,a'), (node) => [node, node.parentNode, node.getAttribute('onclick')]) };
                });
                await session.page.waitForFunction(() => {
                    const resources = window.__dcufHeaderRecentVisitHostAdapter.snapshotResources();
                    return resources.timers === 0 && resources.animationFrames === 0;
                });
                recentTitle = await session.page.evaluate(async ({ presets, paletteKey, darkMode }) => {
                    const check = (condition, message) => { if (!condition) throw new Error(message); };
                    const root = document.querySelector('.newvisit_history');
                    const title = root.querySelector(':scope > .tit');
                    const parent = title.parentNode;
                    const next = title.nextSibling;
                    const controls = Array.from(root.querySelectorAll('button,a'), (node) => [node, node.parentNode, node.getAttribute('onclick')]);
                    const adapter = window.__dcufHeaderRecentVisitHostAdapter;
                    const resourcesBefore = adapter.snapshotResources();
                    const gmBefore = window.__dcufTestbedGM.snapshot();
                    const paletteIdBefore = document.documentElement.getAttribute('data-dcuf-palette');
                    const fallback = darkMode ? 'rgb(224, 224, 224)' : 'rgb(51, 51, 51)';
                    check(paletteIdBefore === 'blue', 'pending storage read must retain initial blue');
                    check(getComputedStyle(title).color === presets.find(({ id: presetId }) => presetId === 'blue').expected,
                        'independent initial blue color while storage read is pending');
                    check(gmBefore.reads.filter(({ key }) => key === paletteKey).length === 1, 'one pending palette read required');
                    await window.__dcufTestbedGM.invokeMenu('UI 색상 설정');
                    const panel = document.getElementById('dcuf-palette-panel');
                    check(JSON.stringify(Array.from(panel.querySelectorAll('[data-palette-id]'), (node) => node.dataset.paletteId).sort())
                        === JSON.stringify(presets.map(({ id: presetId }) => presetId).sort()), 'complete preset ID contract');
                    const palette = document.getElementById('dcuf-mobile-palette-style');
                    check(palette && !palette.sheet.disabled, 'one active palette style required');
                    const paletteRule = Array.from(palette.sheet.cssRules).filter((rule) =>
                        rule.selectorText?.includes('.newvisit_history > .tit') && rule.style.getPropertyValue('color'));
                    check(paletteRule.length === 1, 'exactly one raw recent-title palette rule');
                    const reconnect = () => adapter.connect(document, { runtimeCoordinator: window.__dcufRuntimeCoordinator });
                    const cases = [];
                    const mutations = [];
                    const sample = (step, expected = null) => {
                        const box = title.getBoundingClientRect();
                        const style = getComputedStyle(title);
                        check(title === document.querySelector('.newvisit_history > .tit') && title.parentNode === parent
                            && title.nextSibling === next, `${step}: original title identity/order`);
                        check(box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility === 'visible',
                            `${step}: positive visible title geometry`);
                        if (expected !== null) check(style.color === expected, `${step}: expected ${expected}, got ${style.color}`);
                        return { step, color: style.color, expected, width: box.width, height: box.height,
                            palette: document.documentElement.getAttribute('data-dcuf-palette'),
                            role: title.getAttribute('data-dcuf-header-recent-visit-role') };
                    };
                    const disposed = () => {
                        adapter.dispose();
                        check(Object.values(adapter.snapshotResources()).every((value) => value === 0), 'disposed recent resources must be zero');
                        check(!root.hasAttribute('data-dcuf-header-recent-visit-role')
                            && !title.hasAttribute('data-dcuf-header-recent-visit-role')
                            && !document.getElementById('dcuf-header-recent-visit-style'), 'disposed style/markers must be absent');
                    };
                    const rejectColorMutation = (presetId, label, element, expected, mutate, restore) => {
                        const before = getComputedStyle(element).color;
                        check(before === expected, `${label}: positive mutation control`);
                        let rejected = false;
                        let actual;
                        try {
                            mutate();
                            actual = getComputedStyle(element).color;
                            try { check(actual === expected, `${label}: color drift`); } catch { rejected = true; }
                        } finally { restore(); }
                        check(rejected, `${label}: negative control was not detected`);
                        check(getComputedStyle(element).color === expected, `${label}: restoration`);
                        mutations.push({ presetId, label, expected, actual, rejected });
                    };
                    try {
                        for (const { id: presetId, expected } of presets) {
                            const option = panel.querySelector(`[data-palette-id="${presetId}"]`);
                            const apply = () => {
                                option.click(); // Real preview handler; never Save.
                                check(option.getAttribute('aria-checked') === 'true', 'preview selection contract');
                            };
                            apply();
                            const values = [sample('projected', expected)];
                            document.documentElement.removeAttribute('data-dcuf-palette');
                            values.push(sample('palette-attribute-absent', fallback));
                            apply();
                            palette.sheet.disabled = true;
                            values.push(sample('palette-style-inactive', fallback));
                            palette.sheet.disabled = false;
                            values.push(sample('palette-style-restored', expected));
                            const semanticStyle = document.getElementById('dcuf-header-recent-visit-style');
                            const fallbackRules = Array.from(semanticStyle.sheet.cssRules).filter((rule) =>
                                rule.selectorText?.includes('> [data-dcuf-header-recent-visit-role="title"]')
                                && rule.style.getPropertyValue('color')
                                && rule.selectorText.includes('.dc-filter-dark-mode') === darkMode);
                            check(fallbackRules.length === 1, 'exact fallback rule required');
                            const fallbackRule = fallbackRules[0];
                            document.documentElement.removeAttribute('data-dcuf-palette');
                            const savedFallback = fallbackRule.style.cssText;
                            rejectColorMutation(presetId, 'fallback-color-removed', title, fallback,
                                () => fallbackRule.style.removeProperty('color'), () => { fallbackRule.style.cssText = savedFallback; });
                            if (darkMode) {
                                const probe = title.cloneNode(false);
                                parent.appendChild(probe);
                                probe.style.color = '#ff00ff';
                                try {
                                    rejectColorMutation(presetId, 'dark-fallback-priority-removed', probe, fallback,
                                        () => fallbackRule.style.setProperty('color', fallbackRule.style.getPropertyValue('color'), ''),
                                        () => { fallbackRule.style.cssText = savedFallback; });
                                } finally { probe.remove(); }
                            }
                            apply();
                            const probe = title.cloneNode(false);
                            parent.appendChild(probe);
                            probe.style.color = '#ff00ff';
                            const savedPalette = paletteRule[0].style.cssText;
                            try {
                                rejectColorMutation(presetId, 'palette-priority-removed', probe, expected,
                                    () => paletteRule[0].style.setProperty('color', paletteRule[0].style.getPropertyValue('color'), ''),
                                    () => { paletteRule[0].style.cssText = savedPalette; });
                            } finally { probe.remove(); }
                            disposed();
                            values.push(sample('palette-before-projection', expected));
                            const savedSelector = paletteRule[0].selectorText;
                            rejectColorMutation(presetId, 'palette-narrowed-to-late-roles', title, expected,
                                () => { paletteRule[0].selectorText = 'html[data-dcuf-palette] body [data-dcuf-header-recent-visit-role="root"] > [data-dcuf-header-recent-visit-role="title"]'; },
                                () => { paletteRule[0].selectorText = savedSelector; });
                            document.documentElement.removeAttribute('data-dcuf-palette');
                            values.push(sample('both-absent-host-owned'));
                            reconnect();
                            values.push(sample('projection-before-palette', fallback));
                            apply();
                            values.push(sample('palette-after-reconnect', expected));
                            disposed();
                            palette.sheet.disabled = true;
                            values.push(sample('style-and-projection-absent-host-owned'));
                            reconnect();
                            values.push(sample('projection-before-style', fallback));
                            palette.sheet.disabled = false;
                            values.push(sample('style-after-reconnect', expected));
                            check(JSON.stringify(adapter.snapshotResources()) === JSON.stringify(resourcesBefore), 'recent resource baseline after reconnect');
                            check(document.querySelectorAll('#dcuf-header-recent-visit-style').length === 1, 'one recent style after reconnect');
                            cases.push({ presetId, states: values });
                        }
                    } finally {
                        palette.sheet.disabled = false;
                        reconnect();
                        panel.querySelector('[data-dcuf-palette-action="cancel"]').click();
                    }
                    const gmAfter = window.__dcufTestbedGM.snapshot();
                    check(JSON.stringify(gmAfter.values) === JSON.stringify(gmBefore.values), 'stored settings must be unchanged');
                    check(gmAfter.writes.length === gmBefore.writes.length, 'preview/lifecycle must not write GM');
                    check(document.documentElement.getAttribute('data-dcuf-palette') === paletteIdBefore, 'cancel restores committed initial palette');
                    check(controls.every(([node, originalParent, onclick]) => node.isConnected && node.parentNode === originalParent
                        && node.getAttribute('onclick') === onclick), 'original recent controls/handlers preserved');
                    check(JSON.stringify(adapter.snapshotResources()) === JSON.stringify(resourcesBefore), 'final recent resource baseline');
                    return { cases, mutations, resourcesBefore, resourcesAfter: adapter.snapshotResources(),
                        paletteLifecycle: 'attribute absence and reversible sheet deactivation; no global palette dispose API',
                        storageUnchanged: true, originalControlsPreserved: true };
                }, { presets: recentTitlePresets.map(([presetId, light, darkAccent]) =>
                    ({ id: presetId, expected: hexToRgb(dark ? darkAccent : light) })), paletteKey: storageKeys.palette, darkMode: dark });
                await session.page.evaluate((key) => window.__dcufTestbedGM.release(key), storageKeys.palette);
                await session.page.waitForFunction(() => document.documentElement.getAttribute('data-dcuf-palette') === 'purple');
                recentTitle.pendingReadRecovery = await session.page.evaluate(({ expected, original }) => {
                    const title = document.querySelector('.newvisit_history > .tit');
                    const box = title.getBoundingClientRect();
                    return { color: getComputedStyle(title).color, expected,
                        paletteStyleCount: document.querySelectorAll('#dcuf-mobile-palette-style').length,
                        originalNodes: title === original.title && title.parentNode === original.root
                            && original.root === document.querySelector('.newvisit_history')
                            && original.controls.every(([node, parent, onclick]) => node.isConnected && node.parentNode === parent
                                && node.getAttribute('onclick') === onclick),
                        positiveGeometry: box.width > 0 && box.height > 0,
                        writes: window.__dcufTestbedGM.snapshot().writes.map(({ key }) => key) };
                }, { expected: hexToRgb(dark ? '#c4b5fd' : '#7c3aed'), original: originalRecentNodes });
                await originalRecentNodes.dispose();
                assert.equal(recentTitle.pendingReadRecovery.color, recentTitle.pendingReadRecovery.expected,
                    `${id}: delayed palette read recovery: ${JSON.stringify(recentTitle.pendingReadRecovery)}`);
                assert.equal(recentTitle.pendingReadRecovery.paletteStyleCount, 1);
                assert.equal(recentTitle.pendingReadRecovery.originalNodes, true);
                assert.equal(recentTitle.pendingReadRecovery.positiveGeometry, true);
                assert.equal(recentTitle.pendingReadRecovery.writes.includes(storageKeys.palette), false);
            }
            let gnbReset;
            if (gnbResetContract) {
                gnbReset = await session.page.evaluate(() => {
                    const check = (condition, message) => { if (!condition) throw new Error(message); };
                    const adapter = window.__dcufHeaderGnbHostAdapter;
                    const role = 'data-dcuf-header-gnb-role';
                    const styleId = 'dcuf-header-gnb-style';
                    const root = document.querySelector('.gnb_bar');
                    const nav = root.querySelector('nav.gnb');
                    const list = root.querySelector('.gnb_list');
                    const nodes = [root, nav, list, ...root.querySelectorAll('a,button')];
                    const topology = nodes.map((node) => [node, node.parentNode, node.nextSibling, node.getAttribute('onclick'), node.getAttribute('href')]);
                    const inlineBefore = root.getAttribute('style');
                    const gmBefore = window.__dcufTestbedGM.snapshot();
                    const resourcesBefore = adapter.snapshotResources();
                    check(resourcesBefore.activeRoots === 1 && resourcesBefore.mutationSubscribers === 1, 'positive GNB owner/subscriber baseline');
                    const initialStyle = document.getElementById(styleId);
                    const styleParent = initialStyle.parentNode;
                    const styleNext = initialStyle.nextSibling;
                    const sheetCountBefore = document.styleSheets.length;
                    const properties = ['width', 'min-width', 'box-sizing'];
                    const walk = (rules) => Array.from(rules).flatMap((rule) => rule.selectorText && rule.style
                        ? [rule] : rule.cssRules ? walk(rule.cssRules) : []);
                    const cores = Array.from(document.styleSheets).flatMap((sheet) => {
                        try { return walk(sheet.cssRules).filter((rule) => rule.selectorText === '.gnb_bar'
                            && properties.every((property) => rule.style.getPropertyPriority(property) === 'important')).map((rule) => ({ sheet, rule })); }
                        catch { return []; }
                    });
                    check(cores.length === 1, 'exactly one original early raw GNB reset');
                    const core = cores[0];
                    const coreCss = core.rule.style.cssText;
                    const coreSelector = core.rule.selectorText;
                    const order = () => Array.from(document.styleSheets);
                    check(order().indexOf(core.sheet) < order().indexOf(initialStyle.sheet), 'core precedes semantic GNB style');
                    const semanticRule = () => {
                        const rules = walk(document.getElementById(styleId).sheet.cssRules)
                            .filter((rule) => rule.selectorText === '[data-dcuf-header-gnb-role="root"]');
                        check(rules.length === 1, 'exactly one semantic GNB root rule');
                        return rules[0];
                    };
                    const semanticCss = semanticRule().style.cssText;
                    const expectedWidth = () => {
                        const parent = root.parentElement;
                        const box = parent.getBoundingClientRect();
                        const style = getComputedStyle(parent);
                        return box.width - ['padding-left', 'padding-right', 'border-left-width', 'border-right-width']
                            .reduce((sum, property) => sum + parseFloat(style.getPropertyValue(property)), 0);
                    };
                    const expected = { width: expectedWidth(), 'min-width': '0px', 'box-sizing': 'border-box' };
                    check(expected.width > 401, 'positive wide parent-content width independent of GNB declarations');
                    const view = () => nodes.map((node) => {
                        const box = node.getBoundingClientRect();
                        const style = getComputedStyle(node);
                        return { box: Object.fromEntries(['x', 'y', 'width', 'height'].map((key) => [key, box[key]])),
                            computed: Object.fromEntries([...properties, 'display', 'position', 'visibility', 'padding', 'margin']
                                .map((property) => [property, style.getPropertyValue(property)])) };
                    });
                    const baseline = view();
                    const read = () => {
                        check(topology.every(([node, parent, next, onclick, href]) => node.isConnected && node.parentNode === parent
                            && node.nextSibling === next && node.getAttribute('onclick') === onclick && node.getAttribute('href') === href),
                        'original GNB nodes/order/handlers/links preserved');
                        check(root === document.querySelector('.gnb_bar') && nav === root.querySelector('nav.gnb') && list === root.querySelector('.gnb_list'),
                            'original GNB root/nav/list identity');
                        check(nodes.every((node) => {
                            const box = node.getBoundingClientRect();
                            const style = getComputedStyle(node);
                            return box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility === 'visible';
                        }), 'positive visible original nav/list/controls');
                        const box = root.getBoundingClientRect();
                        const style = getComputedStyle(root);
                        check(box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility === 'visible', 'positive visible native GNB');
                        return { computed: Object.fromEntries(properties.map((property) => [property, style.getPropertyValue(property)])),
                            box: { width: box.width, height: box.height }, role: root.getAttribute(role),
                            styleCount: document.querySelectorAll('#' + styleId).length, resources: adapter.snapshotResources() };
                    };
                    const differs = (actual, oracle) => properties.filter((property) => property === 'width'
                        ? !Number.isFinite(parseFloat(actual[property])) || Math.abs(parseFloat(actual[property]) - oracle[property]) > 0.5
                        : actual[property] !== oracle[property]);
                    const states = [];
                    const mutations = [];
                    const sample = (step, oracle = expected) => {
                        const value = read();
                        check(differs(value.computed, oracle).length === 0, step + ': ' + JSON.stringify({ expected: oracle, actual: value.computed }));
                        states.push({ step, expected: oracle, ...value });
                    };
                    const reject = (label, intended, mutate, restore) => {
                        check(differs(read().computed, expected).length === 0, label + ': positive precondition');
                        let value;
                        try { mutate(); value = read(); } finally { restore(); }
                        const changed = differs(value.computed, expected);
                        check(intended.every((property) => changed.includes(property)), label + ': intended oracle did not reject mutation');
                        check(differs(read().computed, expected).length === 0, label + ': restored positive oracle');
                        mutations.push({ label, expected, actual: value.computed, changed, intended, rejected: true });
                    };
                    const reconnect = () => adapter.connect(document, { runtimeCoordinator: window.__dcufRuntimeCoordinator });
                    const dispose = () => {
                        adapter.dispose();
                        check(Object.values(adapter.snapshotResources()).every((value) => value === 0), 'disposed GNB resources zero');
                        check(!document.getElementById(styleId) && [root, nav, list].every((node) => !node.hasAttribute(role)), 'disposed style/roles absent');
                    };
                    const removeCoreProperties = () => properties.forEach((property) => core.rule.style.removeProperty(property));
                    const ruleControls = (rule, label) => {
                        const css = rule.style.cssText;
                        for (const property of properties) {
                            reject(label + '-' + property + '-removed', [property],
                                () => rule.style.removeProperty(property), () => { rule.style.cssText = css; });
                            reject(label + '-' + property + '-priority-removed', [property],
                                () => rule.style.setProperty(property, rule.style.getPropertyValue(property), ''), () => { rule.style.cssText = css; });
                        }
                    };
                    const host = document.createElement('style');
                    host.setAttribute('data-fixture-gnb-reset-conflict', '1');
                    host.textContent = '.gnb_bar { width:317px !important; min-width:401px !important; box-sizing:content-box !important; }';
                    try {
                        sample('baseline');
                        root.style.setProperty('width', '317px');
                        root.style.setProperty('min-width', '401px');
                        root.style.setProperty('box-sizing', 'content-box');
                        sample('normal-inline-protected');
                        dispose();
                        sample('raw-reset-before-projection');
                        ruleControls(core.rule, 'raw-reset-unmarked');
                        reject('raw-reset-narrowed-to-late-role', properties,
                            () => { core.rule.selectorText = '[data-dcuf-header-gnb-role="root"]'; },
                            () => { core.rule.selectorText = coreSelector; });
                        removeCoreProperties();
                        sample('both-phases-absent-host-owned', { width: 401, 'min-width': '401px', 'box-sizing': 'content-box' });
                        reconnect();
                        sample('semantic-reconnect-with-reset-missing');
                        ruleControls(semanticRule(), 'semantic-with-reset-missing');
                        core.rule.style.cssText = coreCss;
                        sample('core-reset-restored');
                        let semanticStyle = document.getElementById(styleId);
                        semanticStyle.before(host);
                        const sheets = order();
                        check(sheets.indexOf(core.sheet) < sheets.indexOf(host.sheet) && sheets.indexOf(host.sheet) < sheets.indexOf(semanticStyle.sheet),
                            'test-only equal-specificity important conflict strictly between phases');
                        sample('intervening-host-important-protected');
                        ruleControls(semanticRule(), 'semantic-after-host-important');
                        const savedNext = semanticStyle.nextSibling;
                        reject('semantic-phase-moved-before-conflict', properties,
                            () => host.before(semanticStyle),
                            () => styleParent.insertBefore(semanticStyle, savedNext));
                        reject('semantic-role-removed-with-conflict', properties,
                            () => root.removeAttribute(role), () => root.setAttribute(role, 'root'));
                        dispose();
                        sample('disposed-with-host-important-host-owned', { width: 401, 'min-width': '401px', 'box-sizing': 'content-box' });
                        reconnect();
                        sample('reconnected-after-host-important');
                        semanticStyle = document.getElementById(styleId);
                        reconnect();
                        check(semanticStyle === document.getElementById(styleId), 'duplicate connect preserves style identity');
                        sample('duplicate-connect');
                        host.remove();
                        sample('host-conflict-removed');
                    } finally {
                        host.remove();
                        core.rule.selectorText = coreSelector;
                        core.rule.style.cssText = coreCss;
                        // Flush Chromium's lazy CSSOM-to-attribute serialization:
                        // removing an unsynchronized style can leave style="".
                        root.getAttribute('style');
                        if (inlineBefore === null) root.removeAttribute('style'); else root.setAttribute('style', inlineBefore);
                        reconnect();
                        // Test cleanup restores the initial DOM phase after exercising
                        // the real adapter's remove/reappend lifecycle.
                        styleParent.insertBefore(document.getElementById(styleId), styleNext);
                    }
                    sample('final-restored');
                    check(JSON.stringify(view()) === JSON.stringify(baseline), 'exact final native computed geometry');
                    check(root.getAttribute('style') === inlineBefore && core.rule.style.cssText === coreCss
                        && core.rule.selectorText === coreSelector && semanticRule().style.cssText === semanticCss,
                    'exact inline/CSSOM restoration: ' + JSON.stringify({ inline: [inlineBefore, root.getAttribute('style')],
                        core: [coreCss, core.rule.style.cssText], selector: [coreSelector, core.rule.selectorText],
                        semantic: [semanticCss, semanticRule().style.cssText] }));
                    check(document.styleSheets.length === sheetCountBefore && document.querySelectorAll('#' + styleId).length === 1, 'one style and no leftover probe sheet');
                    check(JSON.stringify(adapter.snapshotResources()) === JSON.stringify(resourcesBefore), 'exact final GNB resource baseline');
                    const gmAfter = window.__dcufTestbedGM.snapshot();
                    check(JSON.stringify(gmAfter.values) === JSON.stringify(gmBefore.values) && gmAfter.writes.length === gmBefore.writes.length,
                        'GNB probes preserve stored settings/writes');
                    return { properties, states, mutations, resourcesBefore, resourcesAfter: adapter.snapshotResources(), storageUnchanged: true,
                        originalNodesPreserved: true, restoredNativeGeometry: true,
                        hostConflictScope: 'synthetic equal-specificity important sheet, not observed live-site prevalence' };
                });
                const original = await session.page.evaluateHandle(() => {
                    const root = document.querySelector('.gnb_bar');
                    const links = Array.from(root.querySelectorAll('.gnb_list a'));
                    const events = [];
                    const listener = (event) => events.push({ link: links.indexOf(event.target.closest('a')), trusted: event.isTrusted, detail: event.detail });
                    root.addEventListener('click', listener);
                    return { root, links, events, listener };
                });
                try {
                    await session.page.locator('.gnb_bar .gnb_list a').nth(0).click();
                    assert.equal(await session.page.evaluate(() => location.hash), '#gallery');
                    await session.page.locator('.gnb_bar .gnb_list a').nth(1).focus();
                    await session.page.locator('.gnb_bar .gnb_list a').nth(1).press('Enter');
                    gnbReset.nativeActions = await session.page.evaluate((saved) => ({
                        events: saved.events, hash: location.hash, focusedLink: saved.links.indexOf(document.activeElement),
                        originalNodes: saved.root === document.querySelector('.gnb_bar')
                            && saved.links.every((link, index) => link === saved.root.querySelectorAll('.gnb_list a')[index]),
                    }), original);
                    assert.deepEqual(gnbReset.nativeActions, { events: [{ link: 0, trusted: true, detail: 1 }, { link: 1, trusted: true, detail: 0 }],
                        hash: '#minor', focusedLink: 1, originalNodes: true });
                } finally {
                    await session.page.evaluate((saved) => saved.root.removeEventListener('click', saved.listener), original);
                    await original.dispose();
                }
            }
            assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
            observations.push({ id, route, dark, viewport: { width: 1280, height: 900 }, probes, states,
                ...(nativeKeyboard ? { nativeKeyboard } : {}),
                ...(recentTitle ? { recentTitle } : {}), ...(gnbReset ? { gnbReset } : {}) });
            console.log(`PASS ${id}/${dark ? 'dark' : 'light'}: ${probes.length} priority-removal controls; ${states.length} states`
                + (recentTitle ? `; ${recentTitle.cases.length} title palettes; ${recentTitle.mutations.length} title mutations` : '')
                + (gnbReset ? `; ${gnbReset.states.length} GNB states; ${gnbReset.mutations.length} GNB mutations` : ''));
        } catch (error) {
            // Preserve partial input evidence before the isolated page closes.
            // Never reuse a prior success at output as evidence for this attempt.
            const trace = nativeKeyboardProbe ? await session.page.evaluate(saved => ({ events: saved.events, final: saved.state() }), nativeKeyboardProbe).catch(() => null) : null;
            const failureOutput = output.replace(/\.json$/, '') + `.failed-${Date.now()}.json`;
            await mkdir(path.dirname(failureOutput), { recursive: true });
            await writeFile(failureOutput, JSON.stringify({ schemaVersion: 1, scope: 'failed-partial-audit-not-stage-receipt',
                runtime, sha256: sha(runtimeBytes), dependencyHashes, node: process.version, browser: browser.version(),
                completedContexts: observations.map(item => `${item.id}/${item.dark ? 'dark' : 'light'}`),
                failedContext: { id, route, dark }, failure: error.stack || String(error), nativeKeyboard: trace,
                metrics: await getMetrics(session.page).catch(() => null), consoleErrors: session.consoleErrors }, null, 2) + '\n');
            console.error(`Retained partial failure: ${failureOutput}`);
            throw error;
        } finally {
            if (nativeKeyboardProbe) {
                await session.page.evaluate(saved => saved.types.forEach(type => document.removeEventListener(type, saved.listener, true)), nativeKeyboardProbe).catch(() => {});
                await nativeKeyboardProbe.dispose();
            }
            await session.close();
        }
    }
    assert.equal(sha(await readFile(runtime)), sha(runtimeBytes), 'Runtime changed during audit');
    for (const [file, expected] of Object.entries(dependencyHashes)) {
        assert.equal(sha(await readFile(path.join(root, file))), expected, `Observer dependency changed: ${file}`);
    }
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, JSON.stringify({ schemaVersion: 1, scope: 'header-cascade-debt-observation-not-stage-receipt',
        runtime, sha256: sha(runtimeBytes), dependencyHashes, node: process.version, browser: browser.version(), observations,
        summary: { contexts: observations.length, priorityRemovalControls: observations.reduce((sum, item) => sum + item.probes.length, 0),
            states: observations.reduce((sum, item) => sum + item.states.length, 0),
            ...(recentTitleContract ? {
                recentTitleCases: observations.reduce((sum, item) => sum + item.recentTitle.cases.length, 0),
                recentTitleStates: observations.reduce((sum, item) => sum + item.recentTitle.cases.reduce((count, entry) => count + entry.states.length, 0), 0),
                recentTitleMutations: observations.reduce((sum, item) => sum + item.recentTitle.mutations.length, 0),
            } : {}),
            ...(gnbResetContract ? {
                gnbResetStates: observations.reduce((sum, item) => sum + item.gnbReset.states.length, 0),
                gnbResetMutations: observations.reduce((sum, item) => sum + item.gnbReset.mutations.length, 0),
                gnbNativeActions: observations.reduce((sum, item) => sum + item.gnbReset.nativeActions.events.length, 0),
            } : {}) } }, null, 2) + '\n');
    console.log(`Header cascade audit PASS: ${output}; SHA-256 ${sha(await readFile(output))}`);
} finally {
    await browser?.close();
    await server.close();
}
