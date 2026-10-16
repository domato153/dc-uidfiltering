import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTestPage, getMetrics, launchBrowser, storageKeys, assertNoRuntimeErrors } from '../testbed/harness/runner-utils.mjs';
import { startServer } from '../testbed/server/server.mjs';
import { createEvidenceBinding } from './evidence-binding.mjs';

// Bounded reversible CSSOM characterization. No production declaration or
// accepted observer is changed; these synthetic states are not live prevalence.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
assert.equal(path.resolve(process.cwd()), root);
assert.ok(process.argv.includes('--require-runtime-under-test'), 'Guarded source runtime required');
const hash = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const runtime = path.join(root, 'testbed/artifacts/runtime-under-test.user.js');
const expectedSha = '689A66DFBA738CC3325BE85CD3E1EA53E4AE3089A3454CAF5CC69BC657D3E0DD';
assert.equal(hash(await readFile(runtime)), expectedSha);
process.env.DCUF_TESTBED_USERSCRIPT = runtime;
process.env.DCUF_TESTBED_TARGET = 'mobile';
const output = path.join(root, `artifacts/header-shell-reset-2026-10-05/report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
const binding = await createEvidenceBinding(root);
const report = { schemaVersion: 1, scope: 'BOUNDED_SHELL_RESET_CHARACTERIZATION_NOT_STAGE_RECEIPT', status: 'PARTIAL',
    sourceHead: spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim(),
    runtime, runtimeSha256: expectedSha, evidenceBinding: binding,
    probeSha256: hash(await readFile(fileURLToPath(import.meta.url))), observations: [] };
console.log(`Shell reset runtime: ${runtime}; SHA-256 ${expectedSha}`);
const routes = [
    ['/board/lists?id=test', 'major-list'], ['/mgallery/board/lists?id=test', 'minor-list'],
    ['/mini/board/lists?id=test', 'mini-list'], ['/mgallery/board/view?id=test&no=1001&header=1', 'minor-view'],
];
const server = await startServer();
const browser = await launchBrowser();
report.browser = browser.version();
async function settled(page) {
    await page.waitForFunction(() => {
        const m = window.__dcufTestbedMetrics.snapshot();
        return m.activeTimeouts === 0 && m.activeAnimationFrames === 0 && m.activeIntervals === 0
            && !m.dcuf?.subscribers?.includes('ui-post-reveal-recovery');
    });
}
async function nativeActions(page, phase) {
    await page.evaluate(phase => { window.__shellResetNative.phase = phase; }, phase);
    const input = page.locator('.fixture-host-chrome .wrap_search input');
    await input.click(); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('dcuf-shell');
    await page.keyboard.press('Enter');
    const button = page.locator('.fixture-host-chrome .bnt_search');
    await button.click();
    await page.evaluate(() => window.__dcufHeaderShellHostAdapter.refresh());
    assert.equal(await button.evaluate(node => document.activeElement === node), true, 'Refresh lost native submit focus');
    await page.keyboard.press('Enter'); // No locator refocus after the tested refresh.
    const link = page.locator('.fixture-host-chrome .gnb_list a').first();
    await link.click(); await page.keyboard.press('Enter');
    await settled(page);
    const value = await page.evaluate(phase => {
        const p = window.__shellResetNative;
        return { submits: p.submits.filter(e => e.phase === phase), links: p.links.filter(e => e.phase === phase),
            hash: location.hash, focused: document.activeElement === p.link,
            topology: p.topology.every(([node, parent, next, onclick, href]) => node.isConnected && node.parentNode === parent
                && node.nextSibling === next && node.getAttribute('onclick') === onclick && node.getAttribute('href') === href) };
    }, phase);
    assert.deepEqual(value.submits, Array.from({ length: 3 }, () => ({ phase, trusted: true, value: 'dcuf-shell', previouslyPrevented: false })));
    assert.deepEqual(value.links, Array.from({ length: 2 }, () => ({ phase, trusted: true, prevented: false })));
    assert.equal(value.hash, '#gallery'); assert.equal(value.focused && value.topology, true);
    return value;
}
try {
    for (const [route, id] of routes) for (const dark of [false, true]) {
        const session = await createTestPage(browser, server.baseUrl, { viewport: { width: 1280, height: 900 },
            storage: { [storageKeys.threshold]: 0, [storageKeys.ratioEnabled]: false, [storageKeys.palette]: 'blue',
                [storageKeys.personalEnabled]: true, [storageKeys.personalList]: { uids: [], nicknames: [], ips: [] } } });
        const observation = { id, route, dark, viewport: { width: 1280, height: 900 }, status: 'PARTIAL' };
        report.observations.push(observation);
        try {
            await session.goto(route);
            if (dark) await session.page.evaluate(() => window.__dcufFixture.toggleDark(true));
            await session.page.waitForFunction(dark => document.querySelector('.fixture-host-chrome')?.getAttribute('data-dcuf-header-shell-role') === 'root'
                && window.__dcufHeaderShellHostAdapter?.snapshotResources().mutationSubscribers === 1
                && document.body.classList.contains('dc-filter-dark-mode') === dark, dark);
            await session.page.locator('#dcuf-testbed-controls').evaluate(node => { node.style.display = 'none'; });
            await settled(session.page);
            await session.page.evaluate(() => {
                const root = document.querySelector('.fixture-host-chrome'), input = root.querySelector('.wrap_search input');
                const form = input.closest('form'), link = root.querySelector('.gnb_list a');
                const nodes = [root, ...root.querySelectorAll('.dchead,.dc_logo,.wrap_search,form,input,button,a')];
                const p = window.__shellResetNative = { root, input, form, link, submits: [], links: [], phase: '',
                    topology: nodes.map(node => [node, node.parentNode, node.nextSibling, node.getAttribute('onclick'), node.getAttribute('href')]) };
                p.submit = event => { p.submits.push({ phase: p.phase, trusted: event.isTrusted, value: input.value,
                    previouslyPrevented: event.defaultPrevented }); event.preventDefault(); };
                p.click = event => { const entry = { phase: p.phase, trusted: event.isTrusted }; p.links.push(entry);
                    queueMicrotask(() => { entry.prevented = event.defaultPrevented; }); };
                form.addEventListener('submit', p.submit); link.addEventListener('click', p.click);
            });
            // Install Playwright's native-input global listeners before measuring
            // the product resource baseline; diagnostic listeners remain symmetric.
            observation.nativeBefore = await nativeActions(session.page, 'before');
            const before = await getMetrics(session.page);
            observation.css = await session.page.evaluate(() => {
                const p = window.__shellResetNative, root = p.root;
                const adapter = window.__dcufHeaderShellHostAdapter, bus = window.__dcufRuntimeCoordinator;
                const styleId = 'dcuf-header-shell-style', role = 'data-dcuf-header-shell-role';
                const props = ['width', 'min-width'];
                const check = (value, message) => { if (!value) throw new Error(message); };
                const walk = rules => [...rules].flatMap(rule => rule.selectorText && rule.style ? [rule] : rule.cssRules ? walk(rule.cssRules) : []);
                const sheets = () => [...document.styleSheets];
                const all = () => sheets().flatMap((sheet, index) => walk(sheet.cssRules).map(rule => ({ sheet, index, rule,
                    owner: sheet.ownerNode?.getAttribute('data-dcuf-style-owner') || sheet.ownerNode?.id || 'anonymous' })));
                const candidates = all().filter(({ rule }) => rule.selectorText === '.dcheader' && props.every(prop => rule.style.getPropertyPriority(prop) === 'important'));
                check(candidates.length === 1, 'Exactly one inherited early shell reset required');
                const core = candidates[0], coreCss = core.rule.style.cssText, coreSelector = core.rule.selectorText;
                const initialStyle = document.getElementById(styleId), styleParent = initialStyle.parentNode, styleNext = initialStyle.nextSibling;
                const initialIndex = sheets().indexOf(initialStyle.sheet), sheetCount = sheets().length;
                const semantic = () => {
                    const rules = walk(document.getElementById(styleId).sheet.cssRules).filter(rule => rule.selectorText === '[data-dcuf-header-shell-role="root"].typea');
                    check(rules.length === 1, 'Exactly one semantic typea root rule required'); return rules[0];
                };
                const semanticCss = semantic().style.cssText;
                check(core.index < initialIndex, 'Raw reset must precede semantic mount');
                const inventory = all().filter(({ rule }) => root.matches(rule.selectorText) && props.some(prop => rule.style.getPropertyValue(prop)))
                    .map(({ rule, index, owner }) => ({ selector: rule.selectorText, index, owner,
                        declarations: props.map(prop => [prop, rule.style.getPropertyValue(prop), rule.style.getPropertyPriority(prop)]) }));
                check(inventory.length === 2, 'Unexpected additional shell width/min-width owner');
                const parentRect = root.parentElement.getBoundingClientRect(), parentStyle = getComputedStyle(root.parentElement);
                const parentContentWidth = parentRect.width - ['padding-left', 'padding-right', 'border-left-width', 'border-right-width']
                    .reduce((sum, prop) => sum + parseFloat(parentStyle.getPropertyValue(prop)), 0);
                check(parentContentWidth > 991, 'Positive wide independent parent-content geometry required');
                const expected = { width: parentContentWidth, 'min-width': '0px' };
                const hostExpected = { width: 401, 'min-width': '401px' };
                const read = (element = root) => {
                    const r = element.getBoundingClientRect(), style = getComputedStyle(element);
                    return { computed: Object.fromEntries(props.map(prop => [prop, style.getPropertyValue(prop)])),
                        width: r.width, height: r.height, role: element.getAttribute(role), styleCount: document.querySelectorAll('#' + styleId).length,
                        resources: adapter.snapshotResources(), subscribers: [...bus._mutationSubscribers.keys()] };
                };
                const differs = (value, oracle = expected) => props.filter(prop => prop === 'width'
                    ? Math.abs(parseFloat(value.computed[prop]) - oracle[prop]) > .5 || Math.abs(value.width - oracle[prop]) > .5
                    : value.computed[prop] !== oracle[prop]);
                const view = () => p.topology.map(([node]) => {
                    const r = node.getBoundingClientRect(), style = getComputedStyle(node);
                    return { box: [r.x, r.y, r.width, r.height], computed: Object.fromEntries([...props, 'display', 'visibility', 'box-sizing', 'padding', 'margin']
                        .map(prop => [prop, style.getPropertyValue(prop)])) };
                });
                const baseline = view(), inlineBefore = root.getAttribute('style'), attributesBefore = root.getAttribute(role);
                const resourceBefore = adapter.snapshotResources(), subscribersBefore = [...bus._mutationSubscribers.keys()];
                p.subscriberOrderBefore = subscribersBefore;
                const gmBefore = window.__dcufTestbedGM.snapshot();
                const states = [], negatives = [], childless = [];
                window.__shellResetPartial = { states, negatives, childless };
                const sample = (step, oracle = expected) => { const value = read(); check(value.width > 0 && value.height > 0, step + ': empty native root');
                    check(differs(value, oracle).length === 0, step + ': ' + JSON.stringify({ oracle, value })); states.push({ step, oracle, ...value }); };
                const reject = (id, intended, mutate, restore, element = root) => {
                    check(differs(read(element)).length === 0, id + ': positive precondition'); let actual;
                    try { mutate(); actual = read(element); } finally { restore(); }
                    const changed = differs(actual); check(intended.every(prop => changed.includes(prop)), id + ': negative not detected');
                    check(differs(read(element)).length === 0, id + ': positive not restored'); negatives.push({ id, intended, changed, actual, detected: true });
                };
                const controls = (rule, phase) => {
                    for (const prop of props) for (const kind of ['remove', 'priority', 'value']) {
                        const css = rule.style.cssText;
                        reject(phase + '-' + prop + '-' + kind, [prop], () => {
                            if (kind === 'remove') rule.style.removeProperty(prop);
                            else rule.style.setProperty(prop, kind === 'value' ? (prop === 'width' ? '991px' : '1401px') : rule.style.getPropertyValue(prop), kind === 'priority' ? '' : 'important');
                        }, () => { rule.style.cssText = css; });
                    }
                };
                const removeCore = () => props.forEach(prop => core.rule.style.removeProperty(prop));
                const connect = () => { adapter.connect(document, { runtimeCoordinator: bus }); check(adapter.snapshotResources().mutationSubscribers === 1, 'Owner not reconnected'); };
                const dispose = () => { adapter.dispose(); check(!root.hasAttribute(role) && !document.getElementById(styleId)
                    && !bus._mutationSubscribers.has('header-shell-style'), 'Incomplete shell disposal'); };
                const host = document.createElement('style');
                // Equal to semantic specificity (0,2,0), stronger than raw (0,1,0).
                // An equal-raw rule would not test semantic source-order duty here.
                host.textContent = '.dcheader.typea {width:317px!important;min-width:401px!important}';
                try {
                    sample('baseline');
                    root.style.setProperty('width', '317px'); root.style.setProperty('min-width', '401px');
                    sample('normal-inline-protected');
                    removeCore(); sample('raw-width-pair-removal-masked-when-mounted'); core.rule.style.cssText = coreCss;
                    props.forEach(prop => semantic().style.removeProperty(prop)); sample('semantic-width-pair-removal-masked-by-raw'); semantic().style.cssText = semanticCss;
                    dispose(); sample('raw-unmarked-typea'); controls(core.rule, 'raw-unmarked-typea');
                    reject('raw-selector-narrowed-to-late-role', props, () => { core.rule.selectorText = '[data-dcuf-header-shell-role="root"].typea'; },
                        () => { core.rule.selectorText = coreSelector; });
                    for (const typea of [false, true]) {
                        const probe = document.createElement('header'); probe.className = 'dcheader' + (typea ? ' typea' : '');
                        probe.style.cssText = 'width:317px;min-width:401px'; root.parentElement.appendChild(probe);
                        try {
                            check(differs(read(probe)).length === 0, 'Raw childless unmarked coverage absent');
                            childless.push({ typea, ...read(probe) });
                            if (!typea) reject('raw-selector-narrowed-to-typea', props,
                                () => { core.rule.selectorText = '.dcheader.typea'; }, () => { core.rule.selectorText = coreSelector; }, probe);
                        } finally { probe.remove(); }
                    }
                    removeCore(); sample('both-width-phases-absent-host-normal', hostExpected);
                    connect(); sample('semantic-reconnect-with-raw-missing'); controls(semantic(), 'semantic-with-raw-missing');
                    const rule = semantic(), selector = rule.selectorText;
                    reject('semantic-selector-wrong-role', props, () => { rule.selectorText = '[data-dcuf-header-shell-role="missing"].typea'; }, () => { rule.selectorText = selector; });
                    core.rule.style.cssText = coreCss; sample('raw-restored');
                    document.getElementById(styleId).before(host);
                    check(sheets().indexOf(core.sheet) < sheets().indexOf(host.sheet) && sheets().indexOf(host.sheet) < sheets().indexOf(document.getElementById(styleId).sheet), 'Conflict must be strictly between phases');
                    sample('intervening-host-important-protected'); controls(semantic(), 'semantic-after-host-important');
                    const semanticStyle = document.getElementById(styleId), next = semanticStyle.nextSibling;
                    reject('semantic-phase-before-host-conflict', props, () => { host.before(semanticStyle); }, () => { styleParent.insertBefore(semanticStyle, next); });
                    const currentRule = semantic(), currentSelector = currentRule.selectorText;
                    reject('semantic-specificity-weakened', props, () => { currentRule.selectorText = ':where([data-dcuf-header-shell-role="root"]).typea'; },
                        () => { currentRule.selectorText = currentSelector; });
                    reject('semantic-role-removed-with-conflict', props, () => { root.removeAttribute(role); }, () => { root.setAttribute(role, 'root'); });
                    dispose(); sample('disposed-with-stronger-host-important', hostExpected);
                    connect(); sample('reconnect-after-host-important');
                    const once = document.getElementById(styleId); connect(); check(once === document.getElementById(styleId), 'Duplicate connect replaced style');
                    sample('duplicate-connect');
                    document.getElementById(styleId).after(host); sample('host-after-semantic-wins', hostExpected);
                    dispose(); sample('disposed-with-late-host-important', hostExpected); connect(); sample('reconnect-appends-after-late-host');
                    host.remove(); sample('host-conflict-removed');
                } finally {
                    host.remove(); core.rule.selectorText = coreSelector; core.rule.style.cssText = coreCss;
                    root.getAttribute('style'); // Flush lazy CSSOM serialization before restoring absent attributes.
                    if (inlineBefore === null) root.removeAttribute('style'); else root.setAttribute('style', inlineBefore);
                    connect(); semantic().style.cssText = semanticCss;
                    styleParent.insertBefore(document.getElementById(styleId), styleNext);
                }
                sample('final-restored');
                check(JSON.stringify(view()) === JSON.stringify(baseline), 'Original computed geometry not exactly restored');
                check(root.getAttribute('style') === inlineBefore && root.getAttribute(role) === attributesBefore && core.rule.style.cssText === coreCss
                    && core.rule.selectorText === coreSelector && semantic().style.cssText === semanticCss, 'Attributes/CSSOM not exactly restored');
                check(sheets().length === sheetCount && sheets().indexOf(document.getElementById(styleId).sheet) === initialIndex, 'Stylesheet count/phase not restored');
                const subscribersAfterPublicReconnect = [...bus._mutationSubscribers.keys()];
                check(JSON.stringify(resourceBefore) === JSON.stringify(adapter.snapshotResources()), 'Owner resource baseline not restored');
                check(JSON.stringify(subscribersAfterPublicReconnect) === JSON.stringify([...subscribersBefore.filter(key => key !== 'header-shell-style'), 'header-shell-style']),
                    'Unexpected subscription change beyond the public remove/reinsert order');
                const gmAfter = window.__dcufTestbedGM.snapshot();
                check(JSON.stringify(gmBefore.values) === JSON.stringify(gmAfter.values) && gmBefore.writes.length === gmAfter.writes.length, 'Stored values/writes changed');
                return { inventory, parentContentWidth, states, negatives, childless, resourceBefore, resourceAfter: adapter.snapshotResources(),
                    subscribersBefore, subscribersAfterPublicReconnect,
                    restored: { nativeGeometry: true, attributes: true, cssom: true, phase: true, subscriberMembership: true, storage: true },
                    hostImportantScope: 'synthetic equal-semantic-specificity conflict; no live prevalence claim' };
            });
            await settled(session.page);
            observation.nativeAfter = await nativeActions(session.page, 'after');
            // Test-only rollback of the bus order, analogous to restoring the
            // owned stylesheet's original phase. Native actions above exercise
            // the actual public reconnect order first. Keep current callbacks.
            observation.subscriberRollback = await session.page.evaluate(() => {
                const bus = window.__dcufRuntimeCoordinator._mutationSubscribers;
                const order = window.__shellResetNative.subscriberOrderBefore, current = [...bus.keys()];
                if (JSON.stringify([...current].sort()) !== JSON.stringify([...order].sort())) throw new Error('Subscriber membership changed before rollback');
                const callbacks = new Map(bus);
                bus.clear(); order.forEach(key => bus.set(key, callbacks.get(key)));
                if (![...bus].every(([key, callback]) => callback === callbacks.get(key))) throw new Error('Rollback replaced callbacks');
                return { beforeRollback: current, afterRollback: [...bus.keys()], currentCallbackReferencesPreserved: true, testOnlyRollback: true };
            });
            assert.deepEqual(observation.subscriberRollback.afterRollback, observation.css.subscribersBefore);
            const after = await getMetrics(session.page);
            for (const field of ['activeListenerKeys', 'activeTimeouts', 'activeAnimationFrames', 'activeIntervals']) assert.equal(after[field], before[field], field + ' baseline changed');
            assert.equal(after.mutationObserversCreated - after.mutationDisconnectCalls, before.mutationObserversCreated - before.mutationDisconnectCalls);
            assert.deepEqual(after.xhrRequests, before.xhrRequests);
            assertNoRuntimeErrors(after, session.consoleErrors);
            observation.resources = { listeners: after.activeListenerKeys, timers: after.activeTimeouts, frames: after.activeAnimationFrames,
                intervals: after.activeIntervals, activeObservers: after.mutationObserversCreated - after.mutationDisconnectCalls };
            observation.status = 'OBSERVED';
            console.log(`PASS ${id}/${dark ? 'dark' : 'light'}: ${observation.css.states.length} states; ${observation.css.negatives.length} negatives; native input positive`);
        } catch (error) {
            observation.failure = error.stack || String(error);
            observation.partial = await session.page.evaluate(() => ({ css: window.__shellResetPartial,
                events: window.__shellResetNative && { submits: window.__shellResetNative.submits, links: window.__shellResetNative.links },
                metrics: window.__dcufTestbedMetrics.snapshot() })).catch(() => null);
            throw error;
        } finally {
            await session.page.evaluate(() => { const p = window.__shellResetNative; if (p) { p.form.removeEventListener('submit', p.submit); p.link.removeEventListener('click', p.click); } }).catch(() => {});
            await session.close();
        }
    }
    report.status = 'SHELL_RESET_OVERLAP_CHARACTERIZED';
    report.summary = { contexts: report.observations.length, states: report.observations.reduce((n, o) => n + o.css.states.length, 0),
        negativeControls: report.observations.reduce((n, o) => n + o.css.negatives.length, 0),
        unmarkedChildlessCases: report.observations.reduce((n, o) => n + o.css.childless.length, 0),
        nativeSubmitActions: 48, nativeLinkActions: 32, productionRulesRemoved: 0 };
} catch (error) { report.failure = error.stack || String(error); process.exitCode = 1; }
finally {
    await browser.close(); await server.close();
    assert.equal(hash(await readFile(runtime)), expectedSha);
    assert.deepEqual(await createEvidenceBinding(root), binding);
    assert.equal(hash(await readFile(fileURLToPath(import.meta.url))), report.probeSha256);
    await mkdir(path.dirname(output), { recursive: true }); await writeFile(output, JSON.stringify(report, null, 2) + '\n');
    console.log(`${report.status}: ${output}`); if (report.failure) console.error(report.failure);
}
