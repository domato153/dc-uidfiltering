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
    return path.resolve(root, args[index + 1]);
};
const runtime = required('--runtime');
const output = required('--output');
if (args.includes('--require-runtime-under-test')) {
    assert.match(runtime, /[\\/]testbed[\\/]artifacts[\\/]runtime-under-test\.user\.js$/i);
}
const bytes = await readFile(runtime);
const runtimeSha256 = createHash('sha256').update(bytes).digest('hex').toUpperCase();
assert.match(bytes.toString('utf8'), /^\/\/\s*@name\s+DC_UserFilter_Mobile\s*$/m);
console.log(`Header live-shape runtime: ${runtime} SHA-256 ${runtimeSha256}`);
process.env.DCUF_TESTBED_USERSCRIPT = runtime;
process.env.DCUF_TESTBED_TARGET = 'mobile';

const server = await startServer();
const browser = await launchBrowser();
const observations = [];
try {
    for (const width of [390, 750, 1280]) {
        const session = await createTestPage(browser, server.baseUrl, {
            viewport: { width, height: 900 },
            storage: {
                [storageKeys.threshold]: 0,
                [storageKeys.ratioEnabled]: false,
                [storageKeys.personalEnabled]: true,
                [storageKeys.personalList]: { uids: [], nicknames: [], ips: [] }
            }
        });
        try {
            await session.goto('/mgallery/board/lists/?id=test');
            await session.page.waitForFunction(() => document.querySelector('.dcuf-header-drawer__toggle')
                && window.__dcufHeaderDrawerHostAdapter?.snapshotResources().mutationSubscribers === 1);
            await session.page.locator('#dcuf-testbed-controls').evaluate((element) => { element.style.display = 'none'; });
            await session.page.evaluate(() => {
                const issueWrap = document.querySelector('.issue_wrap');
                document.querySelector('#container article').prepend(issueWrap);
                issueWrap.style.position = 'relative';
                issueWrap.style.zIndex = '13';
                const source = document.querySelector('.issue_wrap .issue_contentbox');
                const wrapper = document.createElement('div');
                wrapper.className = 'issuebox gallery_box';
                source.before(wrapper);
                wrapper.appendChild(source);
                const rankBox = document.createElement('div');
                rankBox.className = 'minor_ranking_box';
                rankBox.innerHTML = '<button type="button" class="btn_mgall_dcp" onclick="toggle_hot_tip_pop()">설명</button>'
                    + '<div id="hot_tip_pop" class="pop_tipbox minor_tip" style="display:none">'
                    + '<button type="button" class="btn_tipclose" onclick="toggle_hot_tip_pop()">닫기</button></div>';
                source.appendChild(rankBox);
                const hostStyle = document.createElement('style');
                hostStyle.textContent = '.issue_wrap .minor_ranking_box{position:relative}'
                    + '.issue_wrap #hot_tip_pop{position:absolute;top:15px;right:15px;width:220px;min-height:50px;background:#fff;z-index:999}';
                document.head.appendChild(hostStyle);
                window.__fixtureHotTipCalls = 0;
                window.__fixtureHotTipEvents = [];
                document.addEventListener('click', (event) => {
                    const action = event.target.closest('.btn_mgall_dcp');
                    if (action) window.__fixtureHotTipEvents.push({ trusted: event.isTrusted, original: source.contains(action) });
                }, true);
                window.toggle_hot_tip_pop = () => {
                    const popup = document.getElementById('hot_tip_pop');
                    popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
                    window.__fixtureHotTipCalls += 1;
                };
                window.__dcufHeaderDrawerHostAdapter.refresh();
            });
            await session.page.waitForFunction(() => document.querySelector('.dcuf-header-drawer .btn_mgall_dcp')
                || document.querySelector('.issue_wrap .issue_contentbox[data-dcuf-header-native-door="1"] .btn_mgall_dcp'));
            await session.page.locator('.dcuf-header-drawer__toggle').click();
            const actionSelector = await session.page.locator('.dcuf-header-drawer .btn_mgall_dcp').count()
                ? '.dcuf-header-drawer .btn_mgall_dcp' : '.issue_wrap .btn_mgall_dcp';
            await session.page.locator(actionSelector).click();
            const observation = await session.page.evaluate(() => {
                const original = document.getElementById('hot_tip_pop');
                const clone = document.querySelector('.dcuf-header-drawer .pop_tipbox.minor_tip');
                const rect = original.getBoundingClientRect();
                const cloneRect = clone?.getBoundingClientRect();
                const center = rect.width && rect.height
                    ? document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
                    : null;
                return {
                    nativeCalls: window.__fixtureHotTipCalls,
                    originalDisplay: getComputedStyle(original).display,
                    originalRect: [rect.width, rect.height].map((value) => Math.round(value)),
                    originalHit: center === original || original.contains(center),
                    cloneDisplay: clone ? getComputedStyle(clone).display : null,
                    cloneRect: cloneRect ? [cloneRect.width, cloneRect.height].map((value) => Math.round(value)) : null,
                    originalParentIsHiddenSource: original.closest('.issue_contentbox')
                        && getComputedStyle(original.closest('.issue_contentbox')).display === 'none',
                    originalParentIntact: original.closest('.issue_contentbox') === document.querySelector('.issue_wrap .issue_contentbox'),
                    originalActionEvents: window.__fixtureHotTipEvents,
                    originalCount: document.querySelectorAll('#hot_tip_pop').length,
                    cloneIdCount: document.querySelectorAll('.dcuf-header-drawer #hot_tip_pop').length
                };
            });
            observations.push({ width, ...observation });
            assert.deepEqual(session.consoleErrors, [], `${width}: console errors`);
        } finally {
            await session.close();
        }
    }
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, JSON.stringify({
        schemaVersion: 1, kind: 'header-live-shaped-missing-popup-audit',
        runtime, runtimeSha256, browser: browser.version(), observations
    }, null, 2) + '\n');
    console.log(`Header live-shaped gap: ${observations.map((item) => `${item.width}:${item.originalHit ? 'reachable' : 'unreachable'}`).join(', ')}`);
} finally {
    await browser.close();
    await server.close();
}
