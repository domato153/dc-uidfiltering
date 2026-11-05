import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { loadDrawerPresenter } from './header-drawer-body-contract.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const plain = value => JSON.parse(JSON.stringify(value));

export async function validateTogglePresenterFaults(source) {
    const contracts = await readFile(path.join(root, 'src/shared/ui-contracts.js'), 'utf8');
    const vocabulary = vm.runInNewContext(contracts.replace(/^export /gm, '') + '\nUI_INTENT_TYPES;', {}, { timeout: 1000 });
    const validate = presenter => {
        assert.equal(typeof presenter.describeToggleIntent, 'function', 'Typed toggle description required');
        const reused = new Map();
        for (const open of [false, true, false, true]) {
            const snapshot = Object.freeze({ open });
            const intent = presenter.describeToggleIntent(snapshot);
            assert.deepEqual(plain(intent), { type: open ? vocabulary.SURFACE_CLOSE : vocabulary.SURFACE_OPEN,
                surface: 'header-drawer' }, 'Shared intent vocabulary/surface/direction');
            assert.ok(Object.isFrozen(intent), 'Frozen scalar-only intent');
            assert.equal(snapshot.open, open, 'Input must remain unchanged');
            if (reused.has(open)) assert.equal(intent, reused.get(open), 'Reuse immutable intent values');
            reused.set(open, intent);
        }
    };
    validate(loadDrawerPresenter(source));
    const faults = [
        ["type: 'surface/open'", "type: 'surface/close'"],
        ["surface: 'header-drawer'", "surface: 'other-drawer'"],
        ['snapshot.open ? closeIntent : openIntent', 'snapshot.open ? openIntent : closeIntent'],
        ["Object.freeze({ type: 'surface/open', surface: 'header-drawer' })", "({ type: 'surface/open', surface: 'header-drawer' })"],
        ['snapshot.open ? closeIntent : openIntent', '(snapshot.open = !snapshot.open, openIntent)']
    ];
    for (const [from, to] of faults) {
        assert.ok(source.includes(from), `Selected toggle fault missing: ${from}`);
        assert.throws(() => validate(loadDrawerPresenter(source.replace(from, to))));
    }
    return faults.length;
}

export function validateToggleTiming(result) {
    assert.deepEqual(result.events.map(event => [event.phase, event.open, event.prevented, event.trusted]), [
        ['window', '0', false, true], ['document', '1', true, true],
        ['window', '1', false, true], ['document', '0', true, true],
        ...['1', '0', '1', '0'].flatMap(open => [
            ['window', open === '1' ? '0' : '1', false, false], ['document', open, true, false]
        ])
    ], 'Native capture order and same-stack application');
    assert.equal(result.targetCalls, 0, 'Toggle target propagation cancelled');
    assert.equal(result.bubbleCalls, 0, 'Window bubble propagation cancelled');
    assert.deepEqual(result.burst, ['1', '0', '1', '0'], 'Each burst intent applied before return');
    assert.equal(result.enterFocus, true, 'Default Enter retains focus');
    assert.deepEqual(result.refresh, { open: '1', sameShell: true, focus: true }, 'Refresh/duplicate connect preserve native state');
    assert.equal(result.replacedOpen, '0', 'Replacement resets native state');
    assert.equal(result.nativeIdentity, true, 'Replacement preserves native nodes');
    assert.equal(result.reconnectedOpen, '0', 'Dispose/reconnect resets native state');
    assert.equal(result.gmUnchanged, true, 'No storage policy change');
    assert.equal(result.resourcesRestored, true, 'No new adapter resource');
}

export async function observeToggleTiming(page, settle) {
    await page.evaluate(() => window.__dcufHeaderDrawerHostAdapter.connect());
    await page.waitForFunction(() => window.__dcufHeaderDrawerHostAdapter.snapshotResources().mutationSubscribers === 1
        && document.querySelector('.dcuf-header-drawer__toggle'));
    await settle(page);
    await page.evaluate(() => {
        const drawer = document.querySelector('.dcuf-header-drawer'), toggle = drawer.querySelector('button');
        const result = window.__toggleTiming = { events: [], targetCalls: 0, bubbleCalls: 0 };
        const read = () => document.querySelector('.dcuf-header-drawer').getAttribute('data-open');
        const before = event => { if (toggle.contains(event.target)) result.events.push({ phase: 'window', open: read(), prevented: event.defaultPrevented, trusted: event.isTrusted }); };
        const after = event => { if (toggle.contains(event.target)) result.events.push({ phase: 'document', open: read(), prevented: event.defaultPrevented, trusted: event.isTrusted }); };
        const target = () => result.targetCalls++;
        const bubble = event => { if (toggle.contains(event.target)) result.bubbleCalls++; };
        window.addEventListener('click', before, true); document.addEventListener('click', after, true);
        toggle.addEventListener('click', target); window.addEventListener('click', bubble);
        window.__removeToggleTiming = () => {
            window.removeEventListener('click', before, true); document.removeEventListener('click', after, true);
            toggle.removeEventListener('click', target); window.removeEventListener('click', bubble);
        };
    });
    try {
        await settle(page);
        await page.locator('.dcuf-header-drawer__toggle-label').click();
        await page.locator('.dcuf-header-drawer__toggle').focus();
        await page.keyboard.press('Enter');
        const result = await page.evaluate(() => {
            const result = window.__toggleTiming, adapter = window.__dcufHeaderDrawerHostAdapter;
            const drawer = document.querySelector('.dcuf-header-drawer'), toggle = drawer.querySelector('button');
            const native = ['.issue_contentbox', '#gall_top_recom', '#hot_rank_pop2'].map(selector => document.querySelector(selector));
            const gm = JSON.stringify(window.__dcufTestbedGM.snapshot().values);
            const writes = window.__dcufTestbedGM.snapshot().writes.length;
            const resources = JSON.stringify(adapter.snapshotResources());
            result.enterFocus = document.activeElement === toggle;
            result.burst = Array.from({ length: 4 }, () => { toggle.querySelector('span').click(); return drawer.getAttribute('data-open'); });
            window.__removeToggleTiming();
            toggle.click(); toggle.focus(); adapter.refresh(); adapter.connect();
            result.refresh = { open: drawer.getAttribute('data-open'), sameShell: drawer === document.querySelector('.dcuf-header-drawer'), focus: document.activeElement === toggle };
            drawer.remove(); adapter.refresh();
            result.replacedOpen = document.querySelector('.dcuf-header-drawer').getAttribute('data-open');
            result.nativeIdentity = native.every((node, i) => node === document.querySelector(['.issue_contentbox', '#gall_top_recom', '#hot_rank_pop2'][i]));
            adapter.dispose(); adapter.connect(); adapter.refresh();
            result.reconnectedOpen = document.querySelector('.dcuf-header-drawer').getAttribute('data-open');
            result.resourcesRestored = resources === JSON.stringify(adapter.snapshotResources());
            result.gmUnchanged = gm === JSON.stringify(window.__dcufTestbedGM.snapshot().values) && writes === window.__dcufTestbedGM.snapshot().writes.length;
            return result;
        });
        validateToggleTiming(result);
        await settle(page);
        return result;
    } finally { await page.evaluate(() => window.__removeToggleTiming?.()); }
}

export function validateToggleTimingFaults(result) {
    for (const mutate of [
        value => { value.events[1].open = '0'; },
        value => { value.events[1].prevented = false; },
        value => { value.burst = ['1', '1', '1', '1']; },
        value => { value.enterFocus = false; },
        value => { value.replacedOpen = '1'; }
    ]) {
        const broken = plain(result); mutate(broken);
        assert.throws(() => validateToggleTiming(broken), assert.AssertionError);
    }
    return 5;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const source = await readFile(path.join(root, 'src/targets/mobile/header-drawer-presenter.js'), 'utf8');
    console.log(`Drawer toggle pure contract: PASS; ${await validateTogglePresenterFaults(source)} selected faults rejected.`);
}
