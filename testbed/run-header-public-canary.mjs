import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTestPage, launchBrowser, storageKeys } from './harness/runner-utils.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const required = (flag) => {
    const index = args.indexOf(flag);
    if (index < 0 || !args[index + 1]) throw new Error(`Missing ${flag}`);
    return path.resolve(root, args[index + 1]);
};
const runtime = required('--runtime');
const output = required('--output');
if (!/[\\/]testbed[\\/]artifacts[\\/]runtime-under-test\.user\.js$/i.test(runtime)) {
    throw new Error(`Source-work runtime guard rejected ${runtime}`);
}
const bytes = await readFile(runtime);
const runtimeSha256 = createHash('sha256').update(bytes).digest('hex').toUpperCase();
if (!/^\/\/\s*@name\s+DC_UserFilter_Mobile\s*$/m.test(bytes.toString('utf8'))) {
    throw new Error('Mobile userscript required');
}
console.log(`Public host canary runtime: ${runtime}`);
console.log(`Public host canary SHA-256: ${runtimeSha256}`);
process.env.DCUF_TESTBED_USERSCRIPT = runtime;
process.env.DCUF_TESTBED_TARGET = 'mobile';

const noStatsStorage = {
    [storageKeys.threshold]: 0,
    [storageKeys.ratioEnabled]: false,
    [storageKeys.personalEnabled]: true,
    [storageKeys.personalList]: { uids: [], nicknames: [], ips: [] }
};
const cases = [
    { id: 'minor-390', path: '/mgallery/board/lists/?id=aoegame', width: 390, kind: 'minor' },
    { id: 'minor-390-short', path: '/mgallery/board/lists/?id=aoegame', width: 390, height: 500, kind: 'minor' },
    { id: 'major-390', path: '/board/lists/?id=programming', width: 390, kind: 'major' },
    { id: 'minor-750', path: '/mgallery/board/lists/?id=aoegame', width: 750, kind: 'minor' },
    { id: 'major-750', path: '/board/lists/?id=programming', width: 750, kind: 'major' },
    { id: 'minor-1280', path: '/mgallery/board/lists/?id=aoegame', width: 1280, kind: 'minor' },
    { id: 'major-1280', path: '/board/lists/?id=programming', width: 1280, kind: 'major' }
];
const observe = async (page, kind) => page.evaluate((surface) => {
    const source = document.querySelector(surface === 'minor'
        ? '.issue_wrap .issue_contentbox' : '#gall_top_recom.concept_wrap');
    const drawer = document.querySelector('.dcuf-header-drawer');
    const toggle = drawer?.querySelector('.dcuf-header-drawer__toggle');
    const popup = (id) => {
        const node = document.getElementById(id);
        if (!node) return null;
        const r = node.getBoundingClientRect();
        const center = r.width && r.height
            ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
        return {
            display: getComputedStyle(node).display,
            area: [Math.round(r.width), Math.round(r.height)],
            box: [r.left, r.top, r.right, r.bottom].map((value) => Math.round(value)),
            hit: Boolean(center && (center === node || node.contains(center))),
            inViewport: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
            underSource: Boolean(source?.contains(node))
        };
    };
    const targetButton = source?.querySelector(surface === 'minor' ? '.btn_mgall_dcp' : '.btn_bluenext');
    const targetRect = targetButton?.getBoundingClientRect();
    const targetHit = targetRect?.width && targetRect?.height
        ? document.elementFromPoint(targetRect.left + targetRect.width / 2, targetRect.top + targetRect.height / 2)
        : null;
    const sourceRect = source?.getBoundingClientRect();
    const visibleChildWidths = source ? Array.from(source.children)
        .map((child) => child.getBoundingClientRect().width).filter(Boolean) : [];
    return {
        ready: document.documentElement.classList.contains('script-ui-ready'),
        drawerOpen: drawer?.getAttribute('data-open') || null,
        toggleExpanded: toggle?.getAttribute('aria-expanded') || null,
        sourcePresent: Boolean(source),
        sourceMarker: source?.getAttribute(surface === 'minor'
            ? 'data-dcuf-header-native-door-open' : 'data-dcuf-header-native-recom-open') || null,
        popupOnly: surface === 'minor' ? source?.getAttribute('data-dcuf-header-native-door-popup-only') || null : null,
        sourceParent: source?.parentElement?.className || null,
        sourceArea: sourceRect ? [Math.round(sourceRect.width), Math.round(sourceRect.height)] : null,
        sourceHit: Boolean(sourceRect?.width && sourceRect?.height && (() => {
            const at = document.elementFromPoint(sourceRect.left + sourceRect.width / 2, sourceRect.top + sourceRect.height / 2);
            return at === source || source.contains(at);
        })()),
        childWidthsContained: sourceRect ? visibleChildWidths.every((width) => width <= sourceRect.width + 1) : null,
        nativeActionHit: Boolean(targetHit && (targetHit === targetButton || targetButton.contains(targetHit))),
        cloneCount: document.querySelectorAll('.dcuf-header-drawer [data-dcuf-drawer-clone]').length,
        rank: surface === 'minor' ? popup('hot_rank_pop2') : null,
        tip: surface === 'minor' ? popup('hot_tip_pop') : null,
        pager: surface === 'major' ? source?.querySelector('.page_num')?.textContent?.trim() || null : null,
        resources: window.__dcufHeaderDrawerHostAdapter?.snapshotResources?.() || null
    };
}, kind);
const attempt = async (label, action, steps) => {
    try {
        await action();
        steps.push({ label, action: 'completed' });
        return true;
    } catch (error) {
        steps.push({ label, action: 'failed', reason: String(error?.message || error).split('\n')[0] });
        return false;
    }
};

const browser = await launchBrowser();
const results = [];
try {
    for (const testCase of cases) {
        const session = await createTestPage(browser, 'https://gall.dcinside.com', {
            storage: noStatsStorage, viewport: { width: testCase.width, height: testCase.height || 900 }
        });
        const steps = [];
        try {
            await session.page.goto(`https://gall.dcinside.com${testCase.path}`, {
                waitUntil: 'domcontentloaded', timeout: 30000
            });
            await session.page.waitForFunction(() => document.documentElement.classList.contains('script-ui-ready')
                && document.querySelector('.dcuf-header-drawer__toggle')
                && window.__dcufHeaderDrawerHostAdapter?.snapshotResources().mutationSubscribers === 1,
            null, { timeout: 15000 });
            steps.push({ label: 'initial', observation: await observe(session.page, testCase.kind) });
            const toggle = session.page.locator('.dcuf-header-drawer__toggle');
            if (await attempt('open-drawer', () => toggle.click({ timeout: 5000 }), steps)) {
                steps.push({ label: 'drawer-open', observation: await observe(session.page, testCase.kind) });
                if (testCase.kind === 'minor') {
                    const tipAction = session.page.locator('.issue_wrap .btn_mgall_dcp').first();
                    if (await attempt('open-tip', () => tipAction.click({ timeout: 5000 }), steps)) {
                        steps.push({ label: 'tip-open', observation: await observe(session.page, testCase.kind) });
                        await attempt('close-drawer-with-tip', async () => {
                            await toggle.focus();
                            await toggle.press('Enter');
                        }, steps);
                        steps.push({ label: 'tip-popup-only', observation: await observe(session.page, testCase.kind) });
                        await attempt('close-tip', () => session.page.locator('#hot_tip_pop .btn_tipclose').click({ timeout: 5000 }), steps);
                        await attempt('settle-tip-close', () => session.page.waitForFunction(() =>
                            !document.querySelector('.issue_wrap .issue_contentbox')
                                ?.hasAttribute('data-dcuf-header-native-door-popup-only'), null, { timeout: 3000 }), steps);
                        steps.push({ label: 'tip-closed', observation: await observe(session.page, testCase.kind) });
                        await attempt('reopen-drawer', async () => {
                            await toggle.focus();
                            await toggle.press('Enter');
                        }, steps);
                        steps.push({ label: 'drawer-reopen', observation: await observe(session.page, testCase.kind) });
                    }
                    const rankAction = session.page.locator('.issue_wrap .btn_hotall_list').first();
                    if (await attempt('open-rank', () => rankAction.click({ timeout: 5000 }), steps)) {
                        steps.push({ label: 'rank-open', observation: await observe(session.page, testCase.kind) });
                        await attempt('close-drawer-with-rank', async () => {
                            await toggle.focus();
                            await toggle.press('Enter');
                        }, steps);
                        steps.push({ label: 'rank-popup-only', observation: await observe(session.page, testCase.kind) });
                        await attempt('close-rank', async () => {
                            const close = session.page.locator('#hot_rank_pop2 .poply_close');
                            await close.scrollIntoViewIfNeeded();
                            await close.click({ timeout: 5000 });
                        }, steps);
                        await attempt('settle-rank-close', () => session.page.waitForFunction(() =>
                            !document.querySelector('.issue_wrap .issue_contentbox')
                                ?.hasAttribute('data-dcuf-header-native-door-popup-only'), null, { timeout: 3000 }), steps);
                        steps.push({ label: 'rank-closed', observation: await observe(session.page, testCase.kind) });
                    }
                } else {
                    if (await attempt('next-page', () => session.page.locator('#gall_top_recom .btn_bluenext').click({ timeout: 5000 }), steps)) {
                        steps.push({ label: 'after-next', observation: await observe(session.page, testCase.kind) });
                    }
                }
                if (await toggle.getAttribute('aria-expanded') === 'true') {
                    await attempt('close-drawer', () => toggle.click({ timeout: 5000 }), steps);
                }
                steps.push({ label: 'drawer-closed', observation: await observe(session.page, testCase.kind) });
            }
            results.push({ id: testCase.id, path: testCase.path, width: testCase.width, height: testCase.height || 900, steps,
                scriptErrorCount: session.consoleErrors.filter((message) => /DCUF|dcuf/i.test(message)).length });
        } catch (error) {
            results.push({ id: testCase.id, path: testCase.path, width: testCase.width, height: testCase.height || 900, steps,
                environmentFailure: String(error?.message || error).split('\n')[0] });
        } finally {
            await session.close();
        }
    }
} finally {
    await browser.close();
}
await mkdir(path.dirname(output), { recursive: true });
for (const result of results) {
    const at = (label) => result.steps.find((step) => step.label === label)?.observation;
    const checks = [];
    const check = (name, condition) => checks.push({ name, status: condition ? 'PASS' : 'FAIL' });
    if (result.environmentFailure) {
        result.verdict = 'UNKNOWN';
        result.checks = [{ name: 'page-and-runtime-ready', status: 'UNKNOWN' }];
        continue;
    }
    const initial = at('initial');
    const open = at('drawer-open');
    const closed = at('drawer-closed');
    check('original-source-opens-without-clone', open?.ready && open.drawerOpen === '1'
        && open.sourceMarker === '1' && open.cloneCount === 0
        && open.sourceArea?.[0] > 0 && open.sourceArea?.[1] > 0
        && open.sourceHit && open.nativeActionHit && open.childWidthsContained);
    check('source-hides-on-close', initial?.sourceArea?.[0] === 0
        && closed?.drawerOpen === '0' && closed.sourceMarker === null
        && closed.sourceArea?.[0] === 0);
    if (result.id.startsWith('minor')) {
        for (const [name, label, popup] of [
            ['native-tip-reachable', 'tip-open', 'tip'],
            ['native-rank-reachable', 'rank-open', 'rank'],
            ['tip-reachable-after-drawer-close', 'tip-popup-only', 'tip'],
            ['rank-reachable-after-drawer-close', 'rank-popup-only', 'rank']
        ]) {
            const state = at(label);
            check(name, state?.[popup]?.display === 'block'
                && state?.[popup]?.area?.[0] > 0 && state?.[popup]?.area?.[1] > 0
                && state?.[popup]?.hit && state?.[popup]?.inViewport && state?.[popup]?.underSource
                && (label.includes('popup-only') ? state.popupOnly === '1' && state.drawerOpen === '0' : true));
        }
        check('popup-close-restores-hidden-source', at('tip-closed')?.sourceArea?.[0] === 0
            && at('rank-closed')?.sourceArea?.[0] === 0
            && at('rank-closed')?.popupOnly === null);
    } else {
        const afterNext = at('after-next');
        check('original-carousel-advances', Boolean(open?.pager && afterNext?.pager
            && open.pager !== afterNext.pager && afterNext.sourceMarker === '1'));
    }
    check('no-script-errors', result.scriptErrorCount === 0);
    result.checks = checks;
    result.verdict = checks.every((entry) => entry.status === 'PASS')
        && result.steps.every((step) => step.action !== 'failed') ? 'PASS' : 'FAIL';
}
await writeFile(output, JSON.stringify({ schemaVersion: 1, kind: 'public-host-isolated-browser-canary',
    runtime, runtimeSha256, browser: 'Playwright-managed Chromium',
    environment: 'public logged-out pages, temporary isolated browser and GM shim; no Tampermonkey installation',
    results }, null, 2) + '\n');
console.log(`Public header canary: ${results.map((result) => `${result.id}:${result.verdict}`).join(', ')}`);
console.log(`Report: ${output}`);
if (results.some((result) => result.verdict !== 'PASS')) process.exitCode = 1;
