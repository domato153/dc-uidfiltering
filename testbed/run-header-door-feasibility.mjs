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
console.log(`Header door feasibility runtime: ${runtime} SHA-256 ${runtimeSha256}`);
process.env.DCUF_TESTBED_USERSCRIPT = runtime;
process.env.DCUF_TESTBED_TARGET = 'mobile';

const server = await startServer();
const browser = await launchBrowser();
const observations = [];
try {
    for (const { width, height, dark } of [
        { width: 390, height: 900, dark: false },
        { width: 390, height: 500, dark: false },
        { width: 750, height: 900, dark: false },
        { width: 1280, height: 900, dark: false },
        { width: 390, height: 900, dark: true }
    ]) {
        const session = await createTestPage(browser, server.baseUrl, {
            viewport: { width, height },
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
            if (dark) await session.page.locator('[data-action="dark"]').click();
            await session.page.locator('#dcuf-testbed-controls').evaluate((element) => { element.style.display = 'none'; });
            await session.page.evaluate(() => {
                const issueWrap = document.querySelector('.issue_wrap');
                document.querySelector('#container article').prepend(issueWrap);
                issueWrap.style.position = 'relative';
                issueWrap.style.zIndex = '13';
                const source = issueWrap.querySelector('.issue_contentbox');
                const wrapper = document.createElement('div');
                wrapper.className = 'issuebox gallery_box';
                source.before(wrapper);
                wrapper.appendChild(source);
                const rankBox = document.createElement('div');
                rankBox.className = 'minor_ranking_box';
                rankBox.innerHTML = '<button type="button" class="btn_mgall_dcp" onclick="toggle_hot_tip_pop()">설명</button>'
                    + '<div id="hot_tip_pop" class="pop_tipbox minor_tip" style="display:none">'
                    + '<button type="button" class="btn_tipclose" onclick="toggle_hot_tip_pop()">닫기</button></div>'
                    + '<button type="button" class="fixture-native-extra" onclick="window.__fixtureExtraCalls++">관리 내역</button>';
                source.appendChild(rankBox);
                window.__fixtureHotTipCalls = 0;
                window.__fixtureExtraCalls = 0;
                window.__fixtureEventTrust = [];
                source.addEventListener('click', (event) => {
                    if (event.target.closest('.btn_mgall_dcp, .fixture-native-extra')) {
                        window.__fixtureEventTrust.push({ target: event.target.className, trusted: event.isTrusted });
                    }
                });
                window.toggle_hot_tip_pop = () => {
                    const popup = document.getElementById('hot_tip_pop');
                    popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
                    window.__fixtureHotTipCalls += 1;
                };
                window.__dcufHeaderDrawerHostAdapter.refresh();
            });
            await session.page.waitForFunction(() => document.querySelector('.dcuf-header-drawer .btn_mgall_dcp'));
            await session.page.locator('.dcuf-header-drawer__toggle').click();
            await session.page.locator('.dcuf-header-drawer .btn_mgall_dcp').click();
            const baseline = await session.page.evaluate(() => {
                const popup = document.getElementById('hot_tip_pop');
                const rect = popup.getBoundingClientRect();
                return {
                    calls: window.__fixtureHotTipCalls,
                    originalTipArea: Math.round(rect.width * rect.height),
                    originalSourceDisplay: getComputedStyle(document.querySelector('.issue_wrap .issue_contentbox')).display,
                    trustedEventsOnOriginal: window.__fixtureEventTrust.length
                };
            });
            assert.equal(baseline.calls, 1);
            assert.equal(baseline.originalTipArea, 0);
            const routingProbe = await session.page.evaluate(() => {
                document.querySelector('.issue_wrap .fixture-native-extra').click();
                const result = {
                    calls: window.__fixtureExtraCalls,
                    trustedOnOriginal: window.__fixtureEventTrust.at(-1)?.trusted
                };
                window.__fixtureExtraCalls = 0;
                window.__fixtureEventTrust.length = 0;
                return result;
            });
            const prototype = await session.page.evaluate(() => {
                document.getElementById('hot_tip_pop').style.display = 'none';
                const adapter = window.__dcufHeaderDrawerHostAdapter;
                const drawerBody = document.querySelector('.dcuf-header-drawer__body');
                const drawerRect = drawerBody.getBoundingClientRect();
                adapter.dispose();
                const source = document.querySelector('.issue_wrap .issue_contentbox');
                const rank = document.getElementById('hot_rank_pop2');
                const tip = document.getElementById('hot_tip_pop');
                const parent = source.parentNode;
                const nextSibling = source.nextSibling;
                const rankParent = rank.parentNode;
                const rankNextSibling = rank.nextSibling;
                const tipParent = tip.parentNode;
                const tipNextSibling = tip.nextSibling;
                const style = document.createElement('style');
                style.textContent = `
                    .issue_wrap .issue_contentbox[data-feasibility-native-door="1"] {
                        display: block !important; position: fixed !important;
                        left: ${Math.max(12, Math.round(drawerRect.left))}px !important;
                        top: ${Math.max(12, Math.round(drawerRect.top))}px !important;
                        width: min(640px, calc(100vw - 24px)) !important;
                        max-height: min(70vh, 520px) !important;
                        overflow: visible !important; z-index: 100000 !important;
                        box-sizing: border-box; padding: 12px; border: 1px solid #999;
                        background: #fff; box-shadow: 0 10px 22px #0003;
                    }
                    .issue_wrap .issue_contentbox[data-feasibility-native-door="1"] .minor_ranking_box {
                        position: relative; width: 100%; margin-top: 12px;
                    }
                    .issue_wrap .issue_contentbox[data-feasibility-native-door="1"] #hot_tip_pop {
                        position: absolute; top: 100%; left: 0; width: 220px; min-height: 50px;
                        padding: 12px; box-sizing: border-box; background: #fff; border: 1px solid #888;
                        z-index: 1;
                    }
                    .issue_wrap .issue_contentbox[data-feasibility-native-door="1"] #hot_rank_pop2 {
                        position: fixed !important; left: 50% !important; top: 50% !important;
                        right: auto !important; transform: translate(-50%, -50%) !important;
                        z-index: 2 !important;
                        max-width: calc(100vw - 24px); max-height: calc(100vh - 24px);
                        overflow: auto;
                    }
                    .dc-filter-dark-mode .issue_wrap .issue_contentbox[data-feasibility-native-door="1"],
                    .dc-filter-dark-mode .issue_wrap .issue_contentbox[data-feasibility-native-door="1"] #hot_tip_pop {
                        background: #1a222e; color: #d2dced;
                    }
                `;
                document.head.appendChild(style);
                source.setAttribute('data-feasibility-native-door', '1');
                const initial = {
                    sourceParentSame: source.parentNode === parent,
                    sourceNextSame: source.nextSibling === nextSibling,
                    rankParentSame: rank.parentNode === rankParent,
                    rankNextSame: rank.nextSibling === rankNextSibling,
                    tipParentSame: tip.parentNode === tipParent,
                    tipNextSame: tip.nextSibling === tipNextSibling,
                    clonedControls: document.querySelectorAll('.dcuf-header-drawer .btn_mgall_dcp').length
                };
                window.__fixtureDoorFeasibility = { source, rank, tip, parent, nextSibling, rankParent, rankNextSibling, tipParent, tipNextSibling, style };
                return initial;
            });
            await session.page.locator('.issue_wrap .btn_mgall_dcp').click();
            const tipOpen = await session.page.evaluate(() => {
                const popup = document.getElementById('hot_tip_pop');
                const rect = popup.getBoundingClientRect();
                const hit = document.elementFromPoint(Math.min(innerWidth - 1, rect.left + rect.width / 2), Math.min(innerHeight - 1, rect.top + rect.height / 2));
                return {
                    calls: window.__fixtureHotTipCalls,
                    darkClass: document.body.classList.contains('dc-filter-dark-mode'),
                    sourceBackground: getComputedStyle(document.querySelector('.issue_wrap .issue_contentbox')).backgroundColor,
                    rect: [rect.left, rect.top, rect.width, rect.height].map((value) => Math.round(value)),
                    hit: popup === hit || popup.contains(hit),
                    inViewport: rect.width > 0 && rect.height > 0 && rect.left >= 0 && rect.top >= 0
                        && rect.right <= innerWidth && rect.bottom <= innerHeight,
                    trustedOnOriginal: window.__fixtureEventTrust.at(-1)?.trusted
                };
            });
            await session.page.locator('#hot_tip_pop .btn_tipclose').click();
            await session.page.locator('.issue_wrap .fixture-native-extra').click();
            await session.page.locator('.issue_wrap .fixture-native-extra').focus();
            await session.page.locator('.issue_wrap .fixture-native-extra').press('Enter');
            await session.page.locator('.issue_wrap .btn_hotall_list').click();
            const rankOpen = await session.page.evaluate(() => {
                const popup = document.getElementById('hot_rank_pop2');
                const rect = popup.getBoundingClientRect();
                const close = popup.querySelector('.poply_close');
                const closeRect = close.getBoundingClientRect();
                const hit = document.elementFromPoint(
                    Math.min(innerWidth - 1, Math.max(0, closeRect.left + closeRect.width / 2)),
                    Math.min(innerHeight - 1, Math.max(0, closeRect.top + closeRect.height / 2))
                );
                return {
                    calls: window.__fixtureHotRankToggles,
                    parentSame: popup.parentNode === window.__fixtureDoorFeasibility.rankParent,
                    rect: [rect.left, rect.top, rect.width, rect.height].map((value) => Math.round(value)),
                    closeHit: close === hit || close.contains(hit)
                };
            });
            const close = session.page.locator('#hot_rank_pop2 .poply_close');
            await close.scrollIntoViewIfNeeded();
            const rankCloseAfterScroll = await session.page.evaluate(() => {
                const closeButton = document.querySelector('#hot_rank_pop2 .poply_close');
                const rect = closeButton.getBoundingClientRect();
                const center = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                return { rect: [rect.left, rect.top, rect.width, rect.height].map((value) => Math.round(value)),
                    hit: center === closeButton || closeButton.contains(center) };
            });
            await close.click();
            const end = await session.page.evaluate(() => {
                const state = window.__fixtureDoorFeasibility;
                const extraCalls = window.__fixtureExtraCalls;
                const trustedEvents = window.__fixtureEventTrust;
                state.source.removeAttribute('data-feasibility-native-door');
                state.style.remove();
                return {
                    extraCalls,
                    trustedEvents,
                    tipClosed: getComputedStyle(state.tip).display === 'none',
                    rankClosed: getComputedStyle(state.rank).display === 'none',
                    sourceParentSame: state.source.parentNode === state.parent,
                    sourceNextSame: state.source.nextSibling === state.nextSibling,
                    rankParentSame: state.rank.parentNode === state.rankParent,
                    rankNextSame: state.rank.nextSibling === state.rankNextSibling,
                    tipParentSame: state.tip.parentNode === state.tipParent,
                    tipNextSame: state.tip.nextSibling === state.tipNextSibling,
                    sourceHiddenAgain: getComputedStyle(state.source).display === 'none'
                };
            });
            observations.push({ width, height, dark, baseline, routingProbe, prototype, tipOpen, rankOpen, rankCloseAfterScroll, end });
            assert.deepEqual(session.consoleErrors, [], `${width}x${height} dark=${dark}: console errors`);
        } finally {
            await session.close();
        }
    }
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, JSON.stringify({
        schemaVersion: 1, kind: 'header-original-door-in-place-feasibility',
        runtime, runtimeSha256, browser: browser.version(), observations,
        limit: 'Diagnostic browser-only style after adapter disposal; not a production candidate or live-site Canary.'
    }, null, 2) + '\n');
    for (const item of observations) {
        assert.equal(item.baseline.originalTipArea, 0);
        assert.deepEqual(item.routingProbe, { calls: 1, trustedOnOriginal: false });
        assert.equal(item.prototype.sourceParentSame && item.prototype.sourceNextSame
            && item.prototype.rankParentSame && item.prototype.rankNextSame
            && item.prototype.tipParentSame && item.prototype.tipNextSame, true);
        assert.equal(item.prototype.clonedControls, 0);
        assert.equal(item.tipOpen.hit && item.tipOpen.inViewport && item.tipOpen.trustedOnOriginal, true);
        assert.equal(item.rankOpen.parentSame && item.rankCloseAfterScroll.hit, true);
        assert.equal(item.end.extraCalls, 2);
        assert.equal(item.end.trustedEvents.length, 3);
        assert.equal(item.end.trustedEvents.every((event) => event.trusted), true);
        assert.equal(item.end.tipClosed && item.end.rankClosed && item.end.sourceHiddenAgain, true);
    }
    console.log(`Header door feasibility: ${observations.map((item) => `${item.width}x${item.height}${item.dark ? ' dark' : ''}:tip=${item.tipOpen.hit},rank-close=${item.rankOpen.closeHit}`).join(', ')}`);
} finally {
    await browser.close();
    await server.close();
}
