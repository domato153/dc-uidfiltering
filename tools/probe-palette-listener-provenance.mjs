import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser, storageKeys } from '../testbed/harness/runner-utils.mjs';
import { loadHarnessSource } from '../testbed/harness/userscript-loader.mjs';
import { startServer } from '../testbed/server/server.mjs';
import { createEvidenceBinding } from './evidence-binding.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
assert.equal(path.resolve(process.cwd()), root, 'Use the active development root');
const output = path.join(root, `artifacts/palette-listener-provenance-2026-10-04/report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
const hook = await readFile(path.join(root, 'tools/palette-listener-diagnostic.js'), 'utf8');
const hash = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const artifacts = {
    control: ['testbed/artifacts/baseline-mobile-beta.user.js', 'A03038FE68126B62054EBA11244D4EE2E1766D308983FC5C27127FD3794CB343'],
    candidate: ['testbed/artifacts/runtime-under-test.user.js', '689A66DFBA738CC3325BE85CD3E1EA53E4AE3089A3454CAF5CC69BC657D3E0DD'],
};
const report = { schemaVersion: 1, scope: 'NEW_LOCAL_CHARACTERIZATION_NOT_ORIGINAL_CI_REPLAY',
    sourceHead: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim(),
    evidenceBinding: await createEvidenceBinding(root),
    runtimes: artifacts, diagnosticSha256: hash(Buffer.from(hook)), probeSha256: hash(await readFile(fileURLToPath(import.meta.url))),
    observations: [], nativeActions: [], status: 'PARTIAL', limitations: ['No historical listener identities are reconstructed',
        'Registration ledger includes once/signal bookkeeping and possibly detached targets',
        'CDP census covers weakly reachable diagnostic targets, not all native inline handlers',
        'Plain-options DCUF paths only; Proxy/accessor normalization and performance equivalence are not claimed',
        'Connected census equality compares counts/type/capture/once, not cross-context callback identity'] };
for (const [runtime, expected] of Object.values(artifacts)) assert.equal(hash(await readFile(path.join(root, runtime))), expected);
const original = JSON.parse(await readFile(path.join(root, 'artifacts/handoff-hosted-cda1087/artifacts/acceptance-observed-mobile-palette.json')));
assert.deepEqual(original.evidenceBinding, report.evidenceBinding);
assert.equal(hash(await readFile(path.join(root, 'artifacts/handoff-hosted-cda1087/artifacts/acceptance-observed-mobile-palette.json'))),
    '4928777D1B41B3C3A538C13844E7021B670B3AD3ED85B323F2A5E9DBC2A4ED1C');

const server = await startServer();
const browser = await launchBrowser();
report.browser = browser.version();
async function session(side, diagnostic, gmBehavior = {}) {
    process.env.DCUF_TESTBED_USERSCRIPT = path.join(root, artifacts[side][0]);
    const storage = { [storageKeys.threshold]: 0, [storageKeys.palette]: 'blue',
        [storageKeys.personalEnabled]: true, [storageKeys.personalList]: { uids: [], nicknames: [], ips: [] } };
    let source = await loadHarnessSource({ storage, gmBehavior });
    const runtime = (await readFile(process.env.DCUF_TESTBED_USERSCRIPT, 'utf8')).replace(/^\uFEFF/, '');
    const index = source.indexOf(runtime);
    assert.ok(index > 0 && source.lastIndexOf(runtime) === index, 'Unique exact runtime insertion point required');
    if (diagnostic) source = source.slice(0, index) + hook + '\n;\n' + source.slice(index);
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.addInitScript({ content: source });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
    return { context, page, errors };
}
async function settled(page) {
    await page.waitForFunction(() => {
        const m = window.__dcufTestbedMetrics.snapshot();
        return m.activeTimeouts === 0 && m.activeAnimationFrames === 0
            && !m.dcuf?.subscribers?.includes('ui-post-reveal-recovery');
    });
}
async function census(page, diagnostic) {
    const cdp = await page.context().newCDPSession(page);
    const result = [];
    try {
        for (const targetId of [...new Set(diagnostic.entries.map(e => e.targetId))]) {
            const object = await cdp.send('Runtime.evaluate', { expression: `window.__dcufListenerDiagnostic.target(${targetId})`, objectGroup: 'dcuf-listener-census' });
            if (!object.result.objectId) { result.push({ targetId, state: 'COLLECTED', listeners: [] }); continue; }
            try {
                const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: object.result.objectId });
                const details = [];
                for (const listener of listeners) {
                    const handler = listener.originalHandler || listener.handler;
                    const source = handler?.objectId ? await cdp.send('Runtime.callFunctionOn', {
                        objectId: handler.objectId, functionDeclaration: 'function(){return Function.prototype.toString.call(this)}', returnByValue: true,
                    }) : null;
                    details.push({ type: listener.type, capture: listener.useCapture, once: listener.once,
                        passive: listener.passive, callbackSource: source?.result.value ?? null });
                }
                result.push({ targetId, state: 'REACHABLE', listeners: details });
            } finally { await cdp.send('Runtime.releaseObject', { objectId: object.result.objectId }); }
        }
    } finally { await cdp.send('Runtime.releaseObjectGroup', { objectGroup: 'dcuf-listener-census' }); await cdp.detach(); }
    return result;
}
async function palette(side, diagnostic, mode) {
    const gmBehavior = mode === 'write' ? { rejectWriteOnceKeys: [storageKeys.palette] }
        : mode === 'read' ? { rejectOnceKeys: [storageKeys.palette] } : {};
    const s = await session(side, diagnostic, gmBehavior);
    const observations = [];
    const sample = async step => {
        // Event phases match only after the scheduled UI frame/timer completes.
        // Keep the earlier unphased failure report; do not erase its discrepancy.
        await settled(s.page);
        const value = await s.page.evaluate(() => {
            const gm = window.__dcufTestbedGM.snapshot(), m = window.__dcufTestbedMetrics.snapshot();
            const focus = document.activeElement;
            return { palette: document.documentElement.getAttribute('data-dcuf-palette'), stored: gm.values.dcuf_mobile_ui_palette,
                writes: gm.writes.filter(x => x.key === 'dcuf_mobile_ui_palette').map(({ key, value }) => ({ key, value })),
                events: window.__paletteObservation.events, panelCount: document.querySelectorAll('#dcuf-palette-panel').length,
                focus: { tag: focus?.tagName, palette: focus?.dataset.paletteId || '', action: focus?.dataset.dcufPaletteAction || '' },
                requests: m.xhrRequests.map(({ method, url, body, status }) => ({ method, path: new URL(url, location.href).pathname, body, status })),
                errors: m.errors, listeners: m.activeListenerKeys, subscribers: m.dcuf?.subscribers,
                timers: m.activeTimeouts, frames: m.activeAnimationFrames, intervals: m.activeIntervals,
                activeObservers: m.mutationObserversCreated - m.mutationDisconnectCalls };
        });
        observations.push({ step, value });
    };
    try {
        await s.page.goto(server.baseUrl + '/board/lists?id=test', { waitUntil: 'domcontentloaded' });
        await s.page.waitForFunction(() => document.documentElement.classList.contains('script-ui-ready'), null, { timeout: 12000 });
        // Match the accepted runner's ready delay; resource closure uses the predicate below.
        await s.page.waitForTimeout(180);
        await s.page.evaluate(() => {
            window.__paletteObservation = { events: [] };
            window.addEventListener('dcuf:palette-change', event => window.__paletteObservation.events.push(event.detail));
        });
        await settled(s.page);
        await sample('initial');
        await s.page.evaluate(() => { window.__dcufListenerDiagnostic?.setPhase('palette-open'); window.__dcufTestbedGM.invokeMenu('UI 색상 설정'); });
        await sample('opened');
        await s.page.locator('[data-palette-id=purple]').click(); await sample('preview');
        await s.page.locator('[data-dcuf-palette-action=cancel]').click(); await sample('cancelled');
        await s.page.evaluate(() => { window.__dcufListenerDiagnostic?.setPhase('palette-reopen'); window.__dcufTestbedGM.invokeMenu('UI 색상 설정'); });
        await s.page.locator('[data-palette-id=green]').click();
        await s.page.locator('[data-dcuf-palette-action=save]').click();
        if (mode === 'write') {
            await s.page.waitForFunction(() => document.querySelector('.dcuf-palette-status')?.textContent.includes('저장하지 못했습니다'));
            await sample('write-rejected');
            await s.page.locator('[data-dcuf-palette-action=save]').click();
        }
        await s.page.locator('#dcuf-palette-panel').waitFor({ state: 'detached' });
        await sample('saved'); await settled(s.page); await sample('settled');
        const trace = diagnostic ? await s.page.evaluate(() => window.__dcufListenerDiagnostic.snapshot()) : null;
        if (trace) assert.equal(trace.entries.filter(e => e.registered).length + trace.baselineLedgerCount,
            observations.at(-1).value.listeners, 'Every later accepted ledger key must be covered');
        const actualListeners = trace ? await census(s.page, trace) : null;
        assert.deepEqual(s.errors, []);
        return { side, diagnostic, mode, observations, trace, actualListeners };
    } catch (error) {
        report.observations.push({ side, diagnostic, mode, observations,
            trace: diagnostic ? await s.page.evaluate(() => window.__dcufListenerDiagnostic?.snapshot()).catch(() => null) : null,
            failure: String(error) });
        throw error;
    } finally { await s.context.close(); }
}
// Independent browser semantics controls. These synthetic events qualify the local
// diagnostic; trusted product actions are recorded separately below.
async function diagnosticControls() {
    const instrumentation = await readFile(path.join(root, 'testbed/harness/runtime-instrumentation.js'), 'utf8');
    const results = [];
    for (const diagnostic of [false, true]) {
        const context = await browser.newContext();
        try {
            await context.addInitScript({ content: instrumentation + (diagnostic ? '\n;' + hook : '') });
            const page = await context.newPage();
            await page.goto('data:text/html,<button id="test">test</button>');
            const value = await page.evaluate(() => {
                const button = document.getElementById('test');
                const calls = { duplicate: 0, once: 0, signal: 0, object: 0, capture: 0, getter: 0 };
                const receiver = [];
                const duplicate = function () { calls.duplicate++; receiver.push(this === button); };
                button.addEventListener('diag-duplicate', duplicate);
                button.addEventListener('diag-duplicate', duplicate, { once: true });
                const once = () => calls.once++;
                button.addEventListener('diag-once', once, { once: true });
                const signal = new AbortController();
                button.addEventListener('diag-signal', () => calls.signal++, { signal: signal.signal });
                signal.abort();
                const object = { handleEvent() { calls.object++; receiver.push(this === object); } };
                button.addEventListener('diag-object', object);
                const capture = () => calls.capture++;
                button.addEventListener('diag-capture', capture, true);
                button.removeEventListener('diag-capture', capture, false);
                button.dispatchEvent(new Event('diag-capture'));
                button.removeEventListener('diag-capture', capture, true);
                const options = { get capture() { calls.getter++; return false; } };
                button.addEventListener('diag-getter', duplicate, options);
                for (const type of ['diag-duplicate', 'diag-once', 'diag-signal', 'diag-object']) {
                    button.dispatchEvent(new Event(type)); button.dispatchEvent(new Event(type));
                }
                button.removeEventListener('diag-object', object);
                button.dispatchEvent(new Event('diag-object'));
                return { calls, receiver };
            });
            assert.deepEqual(value.calls, { duplicate: 2, once: 1, signal: 0, object: 2, capture: 1, getter: 2 });
            assert.equal(value.receiver.every(Boolean), true, 'Callback receiver changed');
            const trace = diagnostic ? await page.evaluate(() => window.__dcufListenerDiagnostic.snapshot()) : null;
            const actual = trace ? await census(page, trace) : null;
            if (actual) {
                const listeners = actual.flatMap(target => target.listeners).filter(l => l.type.startsWith('diag-'));
                assert.deepEqual(listeners.map(l => l.type).sort(), ['diag-duplicate', 'diag-getter']);
                assert.equal(trace.operations.filter(op => op.duplicate).length, 1);
                assert.equal(trace.entries.find(e => e.type === 'diag-signal').signalAborted, true);
                assert.equal(trace.entries.find(e => e.type === 'diag-once').registered, true,
                    'Registration ledger must not masquerade as the actual census');
            }
            results.push({ diagnostic, value, trace, actual });
        } finally { await context.close(); }
    }
    assert.deepEqual(results[0].value, results[1].value);
    return results;
}
async function nativeActions(side, variant, diagnostic) {
    const s = await session(side, diagnostic);
    const result = { side, variant, diagnostic, actions: [], controls: [], status: 'PARTIAL' };
    report.nativeActions.push(result);
    try {
        await s.page.goto(server.baseUrl + (variant === 'minor' ? '/mgallery' : '') + '/board/lists?id=test', { waitUntil: 'domcontentloaded' });
        await s.page.waitForFunction(() => document.documentElement.classList.contains('script-ui-ready'));
        await settled(s.page);
        await s.page.locator('#dcuf-testbed-controls').evaluate(element => { element.style.display = 'none'; });
        await s.page.evaluate(variant => {
            const input = document.querySelector('.wrap_search input');
            const form = input.closest('form');
            const link = document.querySelector('.gnb_list a');
            window.__nativeProbe = { input, form, link, topology: [input, form, link].map(node => [node, node.parentNode, node.nextSibling]),
                submits: [], clicks: 0, events: [], gnbEvents: [] };
            const probe = window.__nativeProbe;
            // Fixture callback observes a native submit and contains only fixture navigation.
            form.addEventListener('submit', event => {
                probe.submits.push({ trusted: event.isTrusted, value: input.value, previouslyPrevented: event.defaultPrevented });
                event.preventDefault();
            });
            document.addEventListener('keydown', event => {
                const entry = { type: event.type, key: event.key, trusted: event.isTrusted, target: event.target === input ? 'search-input' : event.target.tagName };
                probe.events.push(entry); queueMicrotask(() => { entry.prevented = event.defaultPrevented; });
            }, true);
            link.addEventListener('click', event => {
                const entry = { trusted: event.isTrusted }; probe.gnbEvents.push(entry);
                queueMicrotask(() => { entry.prevented = event.defaultPrevented; });
            });
            if (variant === 'major') {
                const wrap = document.createElement('div'); wrap.className = 'issue_wrap';
                wrap.innerHTML = '<div class="issuebox gallery_box"><section id="gall_top_recom" class="concept_wrap">'
                    + '<div class="pageing_box"><span class="page_num">1/3</span><button type="button" class="btn_bluenext">다음</button></div>'
                    + '<ul class="concept_txtlist"><li><a href="#recommendation">추천글</a></li></ul></section></div>';
                document.querySelector('#container article').prepend(wrap);
            }
            const source = document.querySelector(variant === 'minor' ? '.issue_wrap .issue_contentbox' : '#gall_top_recom');
            const button = source.querySelector(variant === 'minor' ? '.btn_hotall_list' : '.btn_bluenext');
            const callback = function (event) { probe.clicks++; probe.lastClick = { trusted: event.isTrusted, receiver: this === button }; };
            button.addEventListener('click', callback);
            Object.assign(probe, { source, button, callback, parent: source.parentNode, next: source.nextSibling });
            window.__dcufHeaderDrawerHostAdapter?.refresh();
        }, variant);
        const search = async () => {
            const before = await s.page.evaluate(() => window.__nativeProbe.submits.length);
            const input = s.page.locator('.wrap_search input');
            await input.click(); await s.page.keyboard.press('ControlOrMeta+A');
            await s.page.keyboard.type('dcuf-native'); await s.page.keyboard.press('Enter');
            await settled(s.page);
            return s.page.evaluate(before => ({ delta: window.__nativeProbe.submits.length - before,
                submission: window.__nativeProbe.submits.at(-1), value: window.__nativeProbe.input.value }), before);
        };
        const searchValue = await search();
        assert.deepEqual(searchValue, { delta: 1, submission: { trusted: true, value: 'dcuf-native', previouslyPrevented: false }, value: 'dcuf-native' });
        result.actions.push({ id: 'trusted-input-enter-default-submit', value: searchValue });
        const link = s.page.locator('.gnb_list a').first();
        await link.click(); await s.page.keyboard.press('Enter');
        await s.page.waitForURL('**#gallery');
        result.actions.push({ id: 'gnb-pointer-enter', hash: new URL(s.page.url()).hash,
            focused: await link.evaluate(node => document.activeElement === node),
            events: await s.page.evaluate(() => window.__nativeProbe.gnbEvents) });
        assert.equal(result.actions.at(-1).focused, true);
        assert.deepEqual(result.actions.at(-1).events, [{ trusted: true, prevented: false }, { trusted: true, prevented: false }]);
        if (await s.page.locator('.dcuf-header-drawer__toggle').count()) await s.page.locator('.dcuf-header-drawer__toggle').click();
        await settled(s.page);
        const geometry = await s.page.evaluate(() => {
            const probe = window.__nativeProbe, button = probe.button, r = button.getBoundingClientRect();
            const hit = r.width && r.height ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
            return { original: document.querySelector(probe.source.id ? '#' + probe.source.id : '.issue_wrap .issue_contentbox') === probe.source,
                topology: probe.source.parentNode === probe.parent && probe.source.nextSibling === probe.next,
                positiveArea: r.width > 0 && r.height > 0, hit: hit === button || button.contains(hit) };
        });
        result.geometry = geometry;
        if (!geometry.positiveArea || !geometry.hit) {
            assert.equal(side, 'control', 'Current original native control is unreachable');
            assert.deepEqual(s.errors, []);
            result.status = 'CONTROL_NATIVE_DOOR_UNREACHABLE';
            return;
        }
        assert.equal(geometry.original && geometry.topology, true);
        const selector = variant === 'minor' ? '.issue_wrap .issue_contentbox .btn_hotall_list' : '.issue_wrap #gall_top_recom .btn_bluenext';
        const activate = async (mode, expected) => {
            const before = await s.page.evaluate(() => window.__nativeProbe.clicks);
            if (mode === 'pointer') await s.page.locator(selector).click();
            else await s.page.keyboard.press('Enter'); // Deliberately retain pointer focus: no locator refocus.
            await settled(s.page);
            const value = await s.page.evaluate(before => ({ delta: window.__nativeProbe.clicks - before,
                lastClick: window.__nativeProbe.lastClick, focused: document.activeElement === window.__nativeProbe.button }), before);
            assert.equal(value.delta, expected);
            if (expected) assert.deepEqual(value.lastClick, { trusted: true, receiver: true });
            return value;
        };
        result.actions.push({ id: 'native-pointer', value: await activate('pointer', 1) });
        // Minor rank opening covers its trigger. Close with the native close button, then
        // restore trigger focus once before testing refresh-induced focus preservation.
        if (variant === 'minor') {
            await s.page.locator('#hot_rank_pop2 .poply_close').click();
            await s.page.locator(selector).focus();
        }
        await s.page.evaluate(() => window.__dcufHeaderDrawerHostAdapter?.refresh());
        result.actions.push({ id: 'native-enter-after-refresh', value: await activate('keyboard', 1) });
        assert.equal(result.actions.at(-1).value.focused, true);
        if (variant === 'minor') await s.page.locator('#hot_rank_pop2 .poply_close').click();
        if (side === 'candidate') {
            // Real browser-local faults, with the original callbacks restored between
            // controls. Nothing mutates production bytes or the accepted comparator.
            await s.page.evaluate(() => {
                const p = window.__nativeProbe; p.button.removeEventListener('click', p.callback);
            });
            result.controls.push({ id: 'omitted-native-callback', detected: (await activate('pointer', 0)).delta === 0 });
            if (variant === 'minor') await s.page.locator('#hot_rank_pop2 .poply_close').click();
            await s.page.evaluate(() => {
                const p = window.__nativeProbe; p.button.addEventListener('click', p.callback);
                p.duplicate = () => p.clicks++; p.button.addEventListener('click', p.duplicate);
            });
            result.controls.push({ id: 'duplicate-native-callback', detected: (await activate('pointer', 2)).delta === 2 });
            if (variant === 'minor') await s.page.locator('#hot_rank_pop2 .poply_close').click();
            await s.page.evaluate(() => {
                const p = window.__nativeProbe; p.button.removeEventListener('click', p.duplicate);
                p.suppress = event => { if (event.target === p.input && event.key === 'Enter') event.preventDefault(); };
                document.addEventListener('keydown', p.suppress, true);
            });
            const suppressed = await search(); assert.equal(suppressed.delta, 0);
            result.controls.push({ id: 'suppressed-default-submit', detected: suppressed.delta === 0 });
            await s.page.evaluate(() => { const p = window.__nativeProbe; document.removeEventListener('keydown', p.suppress, true); });
            assert.equal((await search()).delta, 1, 'Restored default input path failed');
            result.lifecycle = await s.page.evaluate(() => {
                const keys = ['header-shell-style', 'gallery-page-head-style', 'header-gnb-style', 'header-recent-visit-navigation'];
                const adapters = [window.__dcufHeaderShellHostAdapter, window.__dcufGalleryPageHeadHostAdapter,
                    window.__dcufHeaderGnbHostAdapter, window.__dcufHeaderRecentVisitHostAdapter];
                const bus = window.__dcufRuntimeCoordinator;
                const sample = () => ({ owners: keys.filter(key => bus._mutationSubscribers.has(key)),
                    listeners: window.__dcufTestbedMetrics.snapshot().activeListenerKeys,
                    resources: adapters.map(adapter => adapter.snapshotResources()) });
                const before = sample(); adapters.forEach(adapter => adapter.dispose()); const disposed = sample();
                adapters.forEach(adapter => adapter.connect(document, { runtimeCoordinator: bus })); const reconnected = sample();
                adapters.forEach(adapter => adapter.connect(document, { runtimeCoordinator: bus })); const repeated = sample();
                return { before, disposed, reconnected, repeated };
            });
            assert.equal(result.lifecycle.before.owners.length, 4);
            assert.equal(result.lifecycle.disposed.owners.length, 0);
            assert.equal(result.lifecycle.before.listeners - result.lifecycle.disposed.listeners, 2);
            assert.deepEqual(result.lifecycle.repeated, result.lifecycle.reconnected);
            assert.equal(result.lifecycle.reconnected.listeners, result.lifecycle.before.listeners);
            assert.equal((await search()).delta, 1, 'Default input after reconnect failed');
            assert.equal((await activate('pointer', 1)).delta, 1, 'Native callback after reconnect failed');
        }
        assert.deepEqual(s.errors, []);
        result.topology = await s.page.evaluate(() => window.__nativeProbe.topology.every(([node, parent, next]) =>
            node.isConnected && node.parentNode === parent && node.nextSibling === next));
        assert.equal(result.topology, true);
        result.status = 'NATIVE_ACTIONS_OBSERVED';
    } catch (error) { result.failure = error.stack || String(error); throw error; }
    finally {
        result.inputTrace = await s.page.evaluate(() => ({ events: window.__nativeProbe?.events,
            errors: window.__dcufTestbedMetrics.snapshot().errors,
            writes: window.__dcufTestbedGM.snapshot().writes,
            requests: window.__dcufTestbedMetrics.snapshot().xhrRequests.map(({ method, url, body, status }) =>
                ({ method, path: new URL(url, location.href).pathname, body, status })) })).catch(() => null);
        await s.context.close();
    }
}
function provenance(observations) {
    const summaries = [];
    const groups = entries => {
        const counts = {};
        for (const entry of entries) {
            const key = JSON.stringify([entry.target.connected, entry.type, Boolean(entry.capture), Boolean(entry.once)]);
            counts[key] = (counts[key] || 0) + 1;
        }
        return counts;
    };
    const actualEntries = observation => observation.actualListeners.flatMap(target => {
        const role = observation.trace.entries.find(entry => entry.targetId === target.targetId)?.target;
        assert.ok(role, 'Census target has no registration role');
        return target.listeners.map(listener => ({ ...listener, target: role, targetId: target.targetId }));
    });
    const geometryTypes = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'touchstart', 'touchmove', 'touchend', 'touchcancel'];
    for (const mode of ['none', 'write', 'read']) {
        const control = observations.find(o => o.mode === mode && o.side === 'control' && o.diagnostic);
        const candidate = observations.find(o => o.mode === mode && o.side === 'candidate' && o.diagnostic);
        const paletteSemantics = observation => observation.observations.map(({ step, value: { listeners: _listeners, subscribers: _subscribers, ...value } }) => ({ step, value }));
        assert.deepEqual(paletteSemantics(candidate), paletteSemantics(control), 'Covered palette/focus/GM/network/resource semantics changed');
        const summariesBySide = {};
        for (const observation of [control, candidate]) {
            assert.ok(observation?.trace && observation.actualListeners, 'Complete diagnostic observation required');
            const geometry = observation.trace.entries.filter(e => e.registrationTarget.id === 'dcuf-palette-panel' && geometryTypes.includes(e.type));
            assert.equal(geometry.length, 16, 'Two original palette panels must register eight geometry listeners each');
            for (const entry of geometry) {
                assert.equal(entry.target.connected, false);
                const removed = observation.trace.operations.some(op => op.operation === 'remove' && op.key === entry.key);
                assert.equal(removed, observation.side === 'candidate', 'Geometry cleanup attribution changed');
                assert.equal(entry.registered, observation.side === 'control');
                const actual = observation.actualListeners.find(t => t.targetId === entry.targetId);
                const retained = actual?.listeners.some(l => l.type === entry.type && l.capture === Boolean(entry.capture)
                    && l.callbackSource?.replace(/\r\n/g, '\n') === entry.callbackSource.replace(/\r\n/g, '\n'));
                assert.equal(Boolean(retained), observation.side === 'control', 'Actual geometry census disagrees with explicit removal');
            }
            const headerOnce = observation.trace.entries.filter(e => e.once && /scheduleHeaderDrawer\(|headerDrawerScheduler\.schedule\(/.test(e.callbackSource));
            assert.deepEqual(headerOnce.map(e => e.type).sort(), observation.side === 'control' ? ['DOMContentLoaded', 'load'] : []);
            for (const entry of headerOnce) {
                assert.equal(entry.registered, true);
                assert.equal(observation.actualListeners.find(t => t.targetId === entry.targetId).listeners.some(l =>
                    l.type === entry.type && l.callbackSource === entry.callbackSource), false, 'One-shot initialization callback is still callable');
            }
            const actual = actualEntries(observation);
            assert.equal(actual.every(entry => typeof entry.callbackSource === 'string'), true, 'CDP callback source unavailable');
            summariesBySide[observation.side] = { registered: observation.trace.entries.filter(e => e.registered), actual,
                ledger: observation.observations.at(-1).value.listeners };
            assert.equal(summariesBySide[observation.side].registered.length + observation.trace.baselineLedgerCount,
                summariesBySide[observation.side].ledger);
        }
        const c = summariesBySide.control, n = summariesBySide.candidate;
        const expectedGroups = groups(c.registered);
        for (const type of geometryTypes) delete expectedGroups[JSON.stringify([false, type, false, false])];
        for (const type of ['DOMContentLoaded', 'load']) expectedGroups[JSON.stringify([true, type, false, true])]--;
        assert.deepEqual(groups(n.registered), expectedGroups, 'Unattributed connected/event-type registration difference');
        assert.deepEqual(groups(c.actual.filter(e => e.target.connected === true)),
            groups(n.actual.filter(e => e.target.connected === true)), 'Connected actual event-type/capture/once census changed');
        assert.equal(c.ledger - n.ledger, 18);
        assert.equal(c.actual.length - n.actual.length, 16);
        summaries.push({ mode, controlLedger: c.ledger, candidateLedger: n.ledger,
            controlActualReachable: c.actual.length, candidateActualReachable: n.actual.length,
            detachedPaletteGeometryRemoved: 16, alreadyConsumedHeaderOnceOmitted: 2,
            connectedActualTypeCaptureOnceCountsEqual: true });
    }
    return summaries;
}
try {
    report.diagnosticControls = await diagnosticControls();
    for (const mode of ['none', 'write', 'read']) for (const side of ['control', 'candidate']) {
        const plain = await palette(side, false, mode);
        report.observations.push(plain);
        const traced = await palette(side, true, mode);
        report.observations.push(traced);
        assert.deepEqual(traced.observations, plain.observations, 'Diagnostic changed observed palette behavior/resources');
        const expected = side === 'control' ? 188 : 170;
        assert.equal(traced.observations.at(-1).value.listeners, expected, 'Original settled count did not reproduce');
        console.log(`${mode}/${side}: transparency PASS; settled ledger ${expected}`);
    }
    report.provenance = provenance(report.observations);
    report.provenanceControls = [];
    const reject = (id, mutate) => {
        const changed = structuredClone(report.observations); mutate(changed);
        assert.throws(() => provenance(changed), assert.AssertionError, id);
        report.provenanceControls.push({ id, detected: true });
    };
    const candidateTrace = rows => rows.find(o => o.side === 'candidate' && o.mode === 'none' && o.diagnostic);
    reject('missing-geometry-removal', rows => {
        const row = candidateTrace(rows), entry = row.trace.entries.find(e => e.type === 'pointerdown' && e.registrationTarget.id === 'dcuf-palette-panel');
        row.trace.operations = row.trace.operations.filter(op => !(op.key === entry.key && op.operation === 'remove'));
    });
    reject('retained-geometry-registration', rows => {
        candidateTrace(rows).trace.entries.find(e => e.type === 'touchstart' && e.registrationTarget.id === 'dcuf-palette-panel').registered = true;
    });
    reject('unattributed-registration', rows => {
        const row = candidateTrace(rows); const entry = structuredClone(row.trace.entries.find(e => e.registered));
        entry.type = 'unexpected-native-event'; row.trace.entries.push(entry);
    });
    reject('actual-connected-listener-missing', rows => {
        const row = candidateTrace(rows); row.actualListeners.find(t => t.listeners.some(l => l.type === 'submit')).listeners = [];
    });
    reject('missing-callback-source', rows => { candidateTrace(rows).actualListeners.find(t => t.listeners.length).listeners[0].callbackSource = null; });
    reject('changed-settled-count', rows => { candidateTrace(rows).observations.at(-1).value.listeners++; });
    reject('changed-palette-effect', rows => { candidateTrace(rows).observations.find(o => o.step === 'preview').value.palette = 'unexpected'; });
    for (const variant of ['minor', 'major']) for (const side of ['control', 'candidate']) {
        await nativeActions(side, variant, false); const plain = report.nativeActions.at(-1);
        await nativeActions(side, variant, true); const traced = report.nativeActions.at(-1);
        const project = value => {
            const { diagnostic: _diagnostic, ...semantic } = structuredClone(value);
            // Preserve raw write timestamps in the report; different fresh contexts
            // cannot share wall-clock timestamps. Keys, values and order stay exact.
            semantic.inputTrace.writes = semantic.inputTrace.writes.map(({ ts: _timestamp, ...write }) => write);
            return semantic;
        };
        assert.deepEqual(project(traced), project(plain), 'Diagnostic changed observed native actions or lifecycle');
        console.log(`${variant}/${side}: ${traced.status}; transparency PASS`);
    }
    report.status = 'PALETTE_PROVENANCE_OBSERVED';
} catch (error) {
    report.failure = error.stack || String(error); process.exitCode = 1;
} finally {
    await browser.close(); await server.close();
    for (const [runtime, expected] of Object.values(artifacts)) assert.equal(hash(await readFile(path.join(root, runtime))), expected);
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, JSON.stringify(report, null, 2) + '\n');
    console.log(`${report.status}: ${output}`);
    if (report.failure) console.error(report.failure);
}
