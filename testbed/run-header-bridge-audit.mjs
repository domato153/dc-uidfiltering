import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTestPage, launchBrowser, storageKeys } from './harness/runner-utils.mjs';
import { startServer } from './server/server.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const required = (flag) => {
    const index = args.indexOf(flag);
    if (index < 0 || !args[index + 1]) throw new Error(`Missing ${flag}`);
    return args[index + 1];
};
const runtime = path.resolve(root, required('--runtime'));
const output = path.resolve(root, required('--output'));
const bytes = await readFile(runtime);
const runtimeSha256 = createHash('sha256').update(bytes).digest('hex').toUpperCase();
assert.match(bytes.toString('utf8'), /^\/\/\s*@name\s+DC_UserFilter_Mobile\s*$/m);
console.log(`Header bridge runtime: ${runtime} SHA-256 ${runtimeSha256}`);
process.env.DCUF_TESTBED_USERSCRIPT = runtime;
process.env.DCUF_TESTBED_TARGET = 'mobile';

const cases = [
    { id: '390-light', width: 390 },
    { id: '750-light', width: 750 },
    { id: '750-dark', width: 750, dark: true },
    { id: '1280-light', width: 1280 }
];
const server = await startServer();
const browser = await launchBrowser();
const observations = [];
try {
    for (const testCase of cases) {
        const session = await createTestPage(browser, server.baseUrl, {
            viewport: { width: testCase.width, height: 900 },
            storage: {
                [storageKeys.threshold]: 0,
                [storageKeys.ratioEnabled]: false,
                [storageKeys.personalEnabled]: true,
                [storageKeys.personalList]: { uids: [], nicknames: [], ips: [] }
            }
        });
        try {
            await session.goto('/mgallery/board/lists/?id=test');
            if (testCase.dark) {
                await session.page.evaluate(() => document.head.appendChild(Object.assign(
                    document.createElement('style'), { id: 'css-darkmode' }
                )));
                await session.page.waitForFunction(() => document.body.classList.contains('dc-filter-dark-mode'));
            }
            await session.page.waitForFunction(() => document.querySelector('.dcuf-header-drawer__toggle')
                && window.__dcufHeaderDrawerHostAdapter?.snapshotResources().mutationSubscribers === 1);
            await session.page.locator('#dcuf-testbed-controls').evaluate((element) => { element.style.display = 'none'; });
            await session.page.evaluate(() => {
                const source = document.querySelector('.issue_wrap > .issue_contentbox');
                const popup = document.getElementById('hot_rank_pop2');
                const sourceAction = source?.querySelector('.btn_hotall_list');
                const cloneAction = document.querySelector('.dcuf-header-drawer .btn_hotall_list');
                const close = popup?.querySelector('.poply_close');
                const events = [];
                for (const [name, element] of [['source', sourceAction], ['clone', cloneAction], ['close', close]]) {
                    element?.addEventListener('click', (event) => events.push({
                        name, isTrusted: event.isTrusted, targetIsSelf: event.target === element,
                        composedPathHasSource: event.composedPath().includes(sourceAction)
                    }));
                }
                window.__dcufHeaderBridgeProbe = {
                    source, popup, popupDescendants: Array.from(popup?.querySelectorAll('*') || []),
                    sourceAction, cloneAction, close, events
                };
            });
            const capture = async (step) => session.page.evaluate((stepName) => {
                const probe = window.__dcufHeaderBridgeProbe;
                const source = document.querySelector('.issue_wrap > .issue_contentbox');
                const popup = document.getElementById('hot_rank_pop2');
                const cloneAction = document.querySelector('.dcuf-header-drawer .btn_hotall_list');
                const bounds = popup?.getBoundingClientRect();
                const center = bounds && bounds.width && bounds.height
                    ? document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2)
                    : null;
                const popupChildren = popup ? Array.from(popup.querySelectorAll('*')) : [];
                const actionLedger = (scope) => Array.from(scope?.querySelectorAll('button, a, input, select, textarea, [onclick]') || [])
                    .map((element) => ({
                        tag: element.tagName, className: element.className,
                        href: element.getAttribute('href'), onclick: element.getAttribute('onclick'),
                        id: element.id || null
                    }));
                return {
                    step: stepName,
                    nativeCalls: window.__fixtureHotRankToggles,
                    events: probe.events.slice(),
                    popup: {
                        sameNode: popup === probe.popup,
                        count: document.querySelectorAll('#hot_rank_pop2').length,
                        originalClose: popup?.querySelector('.poply_close') === probe.close,
                        originalDescendants: popupChildren.length > 0
                            && popupChildren.length === probe.popupDescendants.length
                            && popupChildren.every((child, index) => child === probe.popupDescendants[index]),
                        parentIsBody: popup?.parentElement === document.body,
                        parentIsOriginalSource: popup?.parentElement === probe.source,
                        parentIsCurrentSource: popup?.parentElement === source,
                        nextSiblingIsMarker: popup?.nextElementSibling?.getAttribute('data-dcuf-bridge-marker') === '1',
                        display: popup ? getComputedStyle(popup).display : null,
                        rect: bounds ? [bounds.width, bounds.height].map((value) => Math.round(value * 10) / 10) : null,
                        centerHit: center === popup || popup?.contains(center) || false,
                        hiddenAncestor: popup ? Array.from((function* () {
                            for (let node = popup.parentElement; node; node = node.parentElement) yield node;
                        })()).some((node) => getComputedStyle(node).display === 'none') : null
                    },
                    source: { sameNode: source === probe.source, actionOnclick: source?.querySelector('.btn_hotall_list')?.getAttribute('onclick') },
                    clone: { sameAction: cloneAction === probe.cloneAction, actionOnclick: cloneAction?.getAttribute('onclick') },
                    sourceActions: actionLedger(source),
                    cloneActions: actionLedger(document.querySelector('.dcuf-header-drawer')),
                    resources: window.__dcufHeaderDrawerHostAdapter.snapshotResources()
                };
            }, step);
            const record = { caseId: testCase.id, steps: [] };
            record.steps.push(await capture('initial'));
            await session.page.locator('.dcuf-header-drawer__toggle').click();
            await session.page.locator('.dcuf-header-drawer .btn_hotall_list').click();
            record.steps.push(await capture('clone-pointer-open'));
            await session.page.locator('#hot_rank_pop2 .poply_close').click();
            record.steps.push(await capture('native-close'));
            await session.page.locator('.dcuf-header-drawer .btn_hotall_list').focus();
            await session.page.locator('.dcuf-header-drawer .btn_hotall_list').press('Enter');
            record.steps.push(await capture('clone-enter-open'));
            await session.page.locator('#hot_rank_pop2 .poply_close').click();
            await session.page.evaluate(() => window.__dcufHeaderBridgeProbe.sourceAction.click());
            record.steps.push(await capture('original-programmatic-open'));
            await session.page.locator('#hot_rank_pop2 .poply_close').click();
            await session.page.locator('.dcuf-header-drawer .btn_hotall_list').click();
            record.steps.push(await capture('pre-dispose-open'));
            await session.page.evaluate(() => window.__dcufHeaderDrawerHostAdapter.dispose());
            record.steps.push(await capture('disposed-open'));
            await session.page.evaluate(() => window.__dcufHeaderDrawerHostAdapter.connect());
            await session.page.waitForFunction(() => document.getElementById('hot_rank_pop2')?.parentElement === document.body
                && document.querySelector('.dcuf-header-drawer .btn_hotall_list'));
            record.steps.push(await capture('reconnected-open'));
            await session.page.locator('#hot_rank_pop2 .poply_close').click();
            await session.page.evaluate(() => {
                const adapter = window.__dcufHeaderDrawerHostAdapter;
                adapter.dispose();
                const popup = window.__dcufHeaderBridgeProbe.popup;
                const marker = document.createElement('span');
                marker.setAttribute('data-dcuf-bridge-marker', '1');
                popup.after(marker);
                adapter.connect();
            });
            await session.page.waitForFunction(() => document.getElementById('hot_rank_pop2')?.parentElement === document.body);
            await session.page.evaluate(() => {
                const source = document.querySelector('.issue_wrap > .issue_contentbox');
                const replacement = source.cloneNode(true);
                replacement.querySelector('.minor_intro_box').textContent = '교체된 원본 갤러리 대문';
                source.replaceWith(replacement);
            });
            await session.page.waitForFunction(() => document.querySelector('.dcuf-header-drawer [data-dcuf-drawer-source="issue"]')
                ?.textContent?.includes('교체된 원본 갤러리 대문'));
            record.steps.push(await capture('source-replaced'));
            await session.page.evaluate(() => window.__dcufHeaderDrawerHostAdapter.dispose());
            record.steps.push(await capture('replacement-disposed'));
            if (args.includes('--expect-restored-order')) {
                const final = record.steps.at(-1);
                assert.equal(final.popup.parentIsCurrentSource, true, `${testCase.id}: popup parent`);
                assert.equal(final.popup.nextSiblingIsMarker, true, `${testCase.id}: popup order`);
                assert.equal(final.popup.sameNode && final.popup.originalDescendants, true, `${testCase.id}: popup identity`);
            }
            observations.push(record);
            assert.deepEqual(session.consoleErrors, [], `${testCase.id}: console errors`);
        } finally {
            await session.close();
        }
    }
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, JSON.stringify({
        schemaVersion: 1, runtime, runtimeSha256, browser: browser.version(), observations
    }, null, 2) + '\n');
    console.log(`Header bridge audit: ${observations.length} cases, ${observations.reduce((sum, item) => sum + item.steps.length, 0)} observations; ${output}`);
} finally {
    await browser.close();
    await server.close();
}
