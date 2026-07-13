import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { startServer } from './server/server.mjs';
import {
    assert,
    assertNoRuntimeErrors,
    createRawPage,
    createTestPage,
    getDiagnostics,
    getMetrics,
    launchBrowser,
    storageKeys,
    testbedDir,
    waitForFiltered,
    waitForHidden,
    waitForSettled
} from './harness/runner-utils.mjs';
import { resolveBuiltUserscript } from './harness/userscript-loader.mjs';

const args = new Set(process.argv.slice(2));
const selectedGroup = process.argv.includes('--group') ? process.argv[process.argv.indexOf('--group') + 1] : null;
const selectedName = process.argv.includes('--filter') ? process.argv[process.argv.indexOf('--filter') + 1] : null;
const headed = args.has('--headed');
const isPcUserscript = /dcinside_user_filter/i.test(process.env.DCUF_TESTBED_USERSCRIPT || '');
const tests = [];
const performanceReports = [];
const writeLayoutReports = [];
const testResults = [];
const test = (name, group, run) => tests.push({ name, group, run });
const statsStorage = {
    [storageKeys.threshold]: 10,
    [storageKeys.ratioEnabled]: false,
    [storageKeys.personalEnabled]: true,
    [storageKeys.personalList]: { uids: [], nicknames: [], ips: [] }
};
const noStatsStorage = { ...statsStorage, [storageKeys.threshold]: 0 };
const summarizePasses = (passes = []) => {
    const durations = passes.map((item) => Number(item.durationMs) || 0).sort((left, right) => left - right);
    const percentile = (ratio) => durations.length === 0 ? 0 : durations[Math.min(durations.length - 1, Math.floor(durations.length * ratio))];
    return {
        count: passes.length,
        totalDurationMs: durations.reduce((sum, value) => sum + value, 0),
        maxDurationMs: durations.at(-1) || 0,
        p50DurationMs: percentile(0.5),
        p95DurationMs: percentile(0.95),
        processedTargets: passes.reduce((sum, item) => sum + (Number(item.targetCount) || 0), 0)
    };
};

test('smoke: 목록과 본문에서 실제 사용자 스크립트가 초기화된다', 'smoke', async ({ browser, server }) => {
    const list = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await list.goto('/board/lists?id=test');
        assert.equal(await list.page.locator('.custom-post-item').count(), 51);
        assert.equal(await list.page.locator('table.gall_list').evaluate((element) => getComputedStyle(element).display), 'none');
        assert.equal(await list.page.locator('#dc-personal-block-fab').count(), 1);
        const metrics = await getMetrics(list.page);
        assert.equal(metrics.dcuf.gauges['mutation.subscribers'] > 0, true);
        assertNoRuntimeErrors(metrics, list.consoleErrors);
    } finally { await list.close(); }

    const view = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await view.goto('/board/view?id=test&no=1001');
        assert.equal(await view.page.locator('#comment_wrap_1 .cmt_list > li').count(), 4);
        assert.equal(await view.page.locator('.img_comment.fold.getMoreComment .view_comment.image_comment .comment_box.img_comment_box[data-imgno] .cmt_list.add > li').count(), 2);
        assert.equal(await view.page.locator('.gall_exposure_list > ul > li').count(), 2);
        assert.equal(await view.page.locator('.fixture-view-list tr.ub-content').count(), 51);
        assert.equal(await view.page.locator('.fixture-view-list .custom-post-item').count(), 51);
        assertNoRuntimeErrors(await getMetrics(view.page), view.consoleErrors);
    } finally { await view.close(); }

    const minorList = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await minorList.goto('/mgallery/board/lists?id=test');
        assert.equal(await minorList.page.locator('table.gall_list tr.ub-content').count(), 53);
        assert.equal(await minorList.page.locator('.custom-post-item').count(), 53);
        assert.equal(await minorList.page.locator('table.gall_list tr.ub-content[data-fixture-host-hidden="1"], table.gall_list tr.ub-content[data-fixture-host-css-hidden="1"]').count(), 3);
        const ordinaryCellCount = await minorList.page.evaluate(() => document.querySelector('table.gall_list tr.us-post')?.children.length || 0);
        assert.equal(ordinaryCellCount, 7);
    } finally { await minorList.close(); }

    const minorView = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await minorView.goto('/mgallery/board/view?id=test&no=1001');
        assert.equal(await minorView.page.locator('#container.minor_view').count(), 1);
        assert.equal(await minorView.page.locator('#comment_wrap_1 .cmt_list.add').count(), 1);
        assert.equal(await minorView.page.locator('#comment_wrap_1 li[id^="comment_li_"], #comment_wrap_1 li[id^="reply_li_"]').count(), 4);
        assert.equal(await minorView.page.locator('#comment_wrap_1 li[id^="reply_li_"] .reply_info').count(), 1);
        assert.equal(await minorView.page.locator('#comment_wrap_1 li.dory').count(), 0);
        assert.equal(await minorView.page.locator('#comment_wrap_1 img').count(), 4);
        assert.equal(await minorView.page.locator('.fixture-view-list tr.ub-content').count(), 53);
    } finally { await minorView.close(); }
});

test('mini view bottom buttons remain clickable above article overlays', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage, viewport: { width: 1120, height: 900 } });
    try {
        await session.goto('/mini/board/view/?id=test&no=1001');
        const button = session.page.locator('.view_bottom_btnbox .modify');
        const hitContract = await button.evaluate((element) => {
            const rect = element.getBoundingClientRect();
            const hit = document.elementFromPoint(rect.left + (rect.width / 2), rect.top + (rect.height / 2));
            const boxStyle = getComputedStyle(element.closest('.view_bottom_btnbox'));
            return {
                topmost: hit === element || element.contains(hit),
                boxPosition: boxStyle.position,
                boxZIndex: Number(boxStyle.zIndex)
            };
        });
        assert.equal(hitContract.topmost, true, 'the native mini-view button must win hit testing');
        assert.equal(hitContract.boxPosition, 'relative');
        assert.equal(hitContract.boxZIndex >= 1, true);
        await button.click();
        assert.equal(await session.page.evaluate(() => window.__fixtureMiniButtonClicks || 0), 1);
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

test('gallery door keeps the original hot-rank popup DOM and layout', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage, viewport: { width: 1280, height: 900 } });
    try {
        await session.goto('/mgallery/board/lists/?id=test');
        assert.equal(await session.page.locator('#hot_rank_pop2').count(), 1, 'the host popup id must not be cloned');
        assert.equal(await session.page.locator('body > #hot_rank_pop2[data-dcuf-host-popup-portal="1"]').count(), 1, 'the original host rank popup must escape the hidden desktop issue container');
        assert.equal(await session.page.locator('.issue_wrap > [data-fixture-original-door="1"]').count(), 1, 'the original host door must remain in its native issue wrapper');
        assert.equal(await session.page.locator('.dcuf-header-drawer [data-dcuf-drawer-source="issue"][data-dcuf-drawer-clone="1"]').count(), 1, 'the mobile drawer must use a presentation-only clone');
        assert.equal(await session.page.locator('.dcuf-header-drawer [data-fixture-original-issue-wrap="1"]').count(), 0, 'the desktop issue wrapper must remain outside the mobile drawer');
        assert.equal(await session.page.locator('.dcuf-header-drawer .pop_wrap').count(), 0, 'host popups must never be cloned into the drawer');
        await session.page.locator('#dcuf-testbed-controls').evaluate((element) => { element.style.display = 'none'; });
        await session.page.locator('.page_head .relate').click();
        await session.page.locator('.page_head .gall_useinfo').click();
        await session.page.locator('.page_head .fixture-issue-more').click();
        assert.deepEqual(await session.page.evaluate(() => window.__fixtureHostHeaderToggles), { relation: 1, guide: 1, issue: 1 }, 'native header dropdown handlers must remain functional');
        assert.equal(await session.page.locator('#relation_popup').evaluate((element) => getComputedStyle(element).display), 'block');
        assert.equal(await session.page.locator('.issue_wrap').evaluate((element) => element.classList.contains('open')), true);
        await session.page.locator('.dcuf-header-drawer__toggle').evaluate((element) => element.click());
        await session.page.locator('.dcuf-header-drawer .btn_hotall_list').evaluate((element) => element.click());
        const drawerWidth = await session.page.locator('.dcuf-header-drawer__body').evaluate((element) => Math.round(element.getBoundingClientRect().width));
        assert.equal(drawerWidth >= 600 && drawerWidth <= 640, true, `mobile gallery door width: ${drawerWidth}`);
        const drawerSurface = await session.page.locator('.dcuf-header-drawer__body-inner').evaluate((element) => ({
            drawerBackground: getComputedStyle(element).backgroundColor,
            contentBackground: getComputedStyle(element.querySelector('.issue_contentbox')).backgroundColor
        }));
        assert.notEqual(drawerSurface.drawerBackground, 'rgba(0, 0, 0, 0)', 'the script-owned drawer surface must be opaque');
        assert.notEqual(drawerSurface.contentBackground, 'rgba(0, 0, 0, 0)', 'the mobile information card must not expose the list behind it');
        const popupContract = await session.page.locator('#hot_rank_pop2').evaluate((popup) => {
            const content = popup.querySelector('.pop_content.pop_hot_mgall');
            const list = popup.querySelector('.pop_hotmgall_listbox');
            const rect = popup.getBoundingClientRect();
            const contentRect = content.getBoundingClientRect();
            return {
                visible: getComputedStyle(popup).display !== 'none',
                position: getComputedStyle(popup).position,
                insideViewport: rect.left >= 0 && rect.right <= innerWidth + 1 && rect.top >= 0 && rect.bottom <= innerHeight + 1,
                contentWidth: Math.round(contentRect.width),
                popupRect: { width: Math.round(rect.width), height: Math.round(rect.height) },
                parentDisplay: getComputedStyle(popup.parentElement).display,
                parentVisibility: getComputedStyle(popup.parentElement).visibility,
                columns: getComputedStyle(list).gridTemplateColumns.split(' ').filter(Boolean).length,
                internalMaxWidth: getComputedStyle(content).maxWidth
            };
        });
        assert.equal(popupContract.visible, true);
        assert.equal(popupContract.position, 'fixed');
        assert.equal(popupContract.insideViewport, true);
        assert.equal(popupContract.contentWidth >= 970, true, `hot-rank contract: ${JSON.stringify(popupContract)}`);
        assert.equal(popupContract.columns, 5);
        assert.equal(popupContract.internalMaxWidth, 'none');
        assert.equal(await session.page.evaluate(() => window.__fixtureHotRankToggles), 1);
        const originalInternalStyle = await session.page.locator('#hot_rank_pop2 .pop_content.pop_hot_mgall').evaluate((element) => {
            const style = getComputedStyle(element);
            return { background: style.backgroundColor, color: style.color, boxSizing: style.boxSizing, maxWidth: style.maxWidth };
        });
        await session.page.evaluate(() => window.__dcufFixture.toggleDark(true));
        const darkInternalStyle = await session.page.locator('#hot_rank_pop2 .pop_content.pop_hot_mgall').evaluate((element) => {
            const style = getComputedStyle(element);
            return { background: style.backgroundColor, color: style.color, boxSizing: style.boxSizing, maxWidth: style.maxWidth };
        });
        assert.deepEqual(darkInternalStyle, originalInternalStyle, 'dark mode must not repaint the host hot-rank popup');
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

test('통계 차단 항목은 차단 후 다시 표시되지 않는다', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: statsStorage });
    try {
        await session.goto('/board/view?id=test&no=1001');
        const selector = '#img_comment_li_2';
        await waitForHidden(session.page, selector);
        const transitions = await session.page.evaluate(async (targetSelector) => {
            const target = document.querySelector(targetSelector);
            const values = [];
            const observer = new MutationObserver((records) => records.forEach(() => values.push(target.style.display)));
            observer.observe(target, { attributes: true, attributeFilter: ['style'] });
            await new Promise((resolve) => setTimeout(resolve, 1400));
            observer.disconnect();
            return { values, finalDisplay: target.style.display };
        }, selector);
        assert.equal(transitions.finalDisplay, 'none');
        assert.equal(transitions.values.includes(''), false, `unexpected visible transition: ${transitions.values.join(',')}`);
    } finally { await session.close(); }
});

test('안정화 후 필터 pass가 유휴 상태에서 과도하게 반복되지 않는다', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/board/view?id=test&no=1001');
        await waitForSettled(session.page, 1000);
        const before = await getDiagnostics(session.page);
        await waitForSettled(session.page, 1400);
        const after = await getDiagnostics(session.page);
        const beforeRuns = before.counters['filter.syncPass.comments.runs'] || 0;
        const afterRuns = after.counters['filter.syncPass.comments.runs'] || 0;
        assert.equal(afterRuns - beforeRuns <= 4, true, `comment passes increased by ${afterRuns - beforeRuns}; counters=${JSON.stringify(after.counters)}`);
    } finally { await session.close(); }
});

test('통계 필터가 꺼져 있으면 UID API 요청이 없다', 'functional', async ({ browser, server }) => {
    server.reset();
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/board/view?id=test&no=1001');
        await session.page.evaluate(() => window.__dcufFixture.addComments(5, { uid: 'safe-no-api' }));
        await waitForSettled(session.page, 600);
        assert.equal(server.state.uidRequests.length, 0);
    } finally { await session.close(); }
});

test('댓글 하나 추가 시 전체 refilter를 실행하지 않는다', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/board/view?id=test&no=1001');
        const before = await getDiagnostics(session.page);
        await session.page.evaluate(() => window.__dcufFixture.addComments(1));
        await waitForSettled(session.page, 1300);
        const after = await getDiagnostics(session.page);
        assert.equal((after.counters['filter.fullRefilter.runs'] || 0) - (before.counters['filter.fullRefilter.runs'] || 0), 0);
        assert.equal((after.counters['filter.syncPass.all.runs'] || 0) - (before.counters['filter.syncPass.all.runs'] || 0), 0);
    } finally { await session.close(); }
});

test('목록 한 행 변경 시 미러 한 행만 재생성한다', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/board/lists?id=test');
        const before = await getMetrics(session.page);
        const initialHandles = await session.page.locator('.custom-post-item').evaluateAll((items) => items.map((item) => item));
        await session.page.evaluate(() => window.__dcufFixture.changeOneListRow());
        await waitForSettled(session.page, 450);
        const after = await getMetrics(session.page);
        assert.equal(after.mirrorAdded - before.mirrorAdded <= 1, true, `created ${after.mirrorAdded - before.mirrorAdded} mirrors`);
        assert.equal(after.mirrorRemoved - before.mirrorRemoved <= 1, true, `removed ${after.mirrorRemoved - before.mirrorRemoved} mirrors`);
        assert.equal(await session.page.locator('.custom-post-item').count(), initialHandles.length);
    } finally { await session.close(); }
});

test('호스트 숨김 설문·광고 행이 미러 목록에 노출되지 않는다', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/mgallery/board/view?id=test&no=1001');
        const visibility = await session.page.evaluate(() => ({
            originalTableVisibility: getComputedStyle(document.querySelector('.fixture-view-list table.gall_list')).visibility,
            hiddenRows: Array.from(document.querySelectorAll('.fixture-view-list tr[data-fixture-host-hidden="1"], .fixture-view-list tr[data-fixture-host-css-hidden="1"]')).map((row) => {
                const rowId = row.getAttribute('data-custom-row-id');
                const mirror = rowId ? document.querySelector(`.fixture-view-list .custom-post-item[data-custom-row-id="${rowId}"]`) : null;
                return { rowId, originalDisplay: getComputedStyle(row).display, mirrorDisplay: mirror ? getComputedStyle(mirror).display : null };
            })
        }));
        assert.equal(visibility.hiddenRows.length, 3);
        assert.equal(visibility.originalTableVisibility, 'hidden');
        assert.equal(visibility.hiddenRows.every((item) => item.mirrorDisplay === 'none'), true, JSON.stringify(visibility.hiddenRows));
    } finally { await session.close(); }
});

test('observer와 이벤트 리스너는 중복 사용자 스크립트 주입에도 늘지 않는다', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/board/lists?id=test');
        const before = await getMetrics(session.page);
        const userscript = (await readFile(await resolveBuiltUserscript(), 'utf8')).replace(/^\uFEFF/, '');
        await session.page.addScriptTag({ content: userscript });
        await waitForSettled(session.page, 250);
        const after = await getMetrics(session.page);
        const newObserverStacks = after.mutationObserverCreationStacks.slice(before.mutationObserverCreationStacks.length, before.mutationObserverCreationStacks.length + 2);
        assert.equal(after.mutationObserversCreated, before.mutationObserversCreated, `new observer stacks: ${newObserverStacks.join('\n---\n')}`);
        assert.equal(after.listenerUnique, before.listenerUnique);
        assert.equal(await session.page.locator('.custom-mobile-list').count(), 1);
    } finally { await session.close(); }
});

test('일반 댓글, 답글, 이미지 댓글이 개인 UID 차단된다', 'functional', async ({ browser, server }) => {
    const storage = {
        ...noStatsStorage,
        [storageKeys.personalList]: {
            uids: [
                { id: 'safe-comment-2', name: '댓글' },
                { id: 'safe-reply-1-1', name: '답글' },
                { id: 'safe-image-user', name: '이미지' }
            ],
            nicknames: [],
            ips: []
        }
    };
    const session = await createTestPage(browser, server.baseUrl, { storage });
    try {
        await session.goto('/board/view?id=test&no=1001');
        await waitForFiltered(session.page, '#comment_li_2');
        await waitForHidden(session.page, '#reply_li_1_1');
        await waitForHidden(session.page, '#img_comment_li_1');
    } finally { await session.close(); }
});

test('간편차단 UI로 개인 차단과 차단 해제가 동작한다', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/board/view?id=test&no=1001');
        const target = '#comment_li_2';
        const uid = await session.page.locator(`${target} .ub-writer`).getAttribute('data-uid');
        await session.page.locator('#dc-personal-block-fab').click();
        await session.page.locator('#dc-personal-block-drawer [data-dcuf-fab-action="quick-block"]').click();
        await session.page.locator(`${target} .ub-writer`).dispatchEvent('click');
        await session.page.locator(`#dc-selection-popup button[data-type="uid"][data-value="${uid}"]`).click();
        await waitForHidden(session.page, target);
        let stored = await session.page.evaluate(() => window.__dcufTestbedGM.snapshot().values.dcinside_personal_block_list);
        assert.equal(stored.uids.some((item) => item.id === uid), true);

        await session.page.locator('#dc-personal-block-fab').click();
        await session.page.locator('#dc-personal-block-drawer [data-dcuf-fab-action="quick-block"]').click();
        await session.page.locator(`${target} .ub-writer`).dispatchEvent('click');
        await session.page.locator(`#dc-selection-popup button.btn-unblock[data-type="uid"][data-value="${uid}"]`).click();
        await session.page.waitForFunction((selector) => document.querySelector(selector)?.style.display !== 'none', target);
        stored = await session.page.evaluate(() => window.__dcufTestbedGM.snapshot().values.dcinside_personal_block_list);
        assert.equal(stored.uids.some((item) => item.id === uid), false);
    } finally { await session.close(); }
});

test('플로팅 메뉴 서랍과 원위치 복구가 안전하게 동작한다', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, {
        storage: noStatsStorage,
        viewport: isPcUserscript ? { width: 1280, height: 900 } : { width: 390, height: 844 },
        hasTouch: !isPcUserscript,
        isMobile: !isPcUserscript
    });
    try {
        await session.goto('/board/view?id=test&no=1001');
        const valuesBefore = await session.page.evaluate(() => window.__dcufTestbedGM.snapshot().values);
        const menuLabels = await session.page.evaluate(() => window.__dcufTestbedGM.snapshot().menuLabels);
        assert.deepEqual(menuLabels.slice(0, 4), ['글댓합 설정하기', '차단 유저 관리', '플로팅 버튼 원위치', '메뉴 버튼 크기 조절']);
        assert.equal(await session.page.locator('#dc-personal-block-controls').count(), 1);
        assert.equal(await session.page.locator('#dc-personal-block-fab').textContent(), '메뉴');

        const fab = session.page.locator('#dc-personal-block-fab');
        const drawer = session.page.locator('#dc-personal-block-drawer');
        const fabTapTarget = await fab.evaluate((element) => {
            const rect = element.getBoundingClientRect();
            return {
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                fontSize: parseFloat(getComputedStyle(element).fontSize)
            };
        });
        assert.equal(fabTapTarget.width >= 152, true, `FAB width: ${fabTapTarget.width}`);
        assert.equal(fabTapTarget.height >= 76, true, `FAB height: ${fabTapTarget.height}`);
        assert.equal(fabTapTarget.fontSize >= 32, true, `FAB font size: ${fabTapTarget.fontSize}`);
        await fab.click();
        assert.equal(await fab.getAttribute('aria-expanded'), 'true');
        assert.equal(await drawer.isVisible(), true);
        assert.deepEqual(await drawer.locator('button').allTextContents(), ['간편차단', '글댓합 설정', '차단 유저 관리']);

        await fab.click();
        assert.equal(await fab.getAttribute('aria-expanded'), 'false');
        assert.equal(await drawer.isHidden(), true, 'a second launcher click must close the drawer');
        await fab.click();

        const drawerRect = await drawer.boundingBox();
        assert.equal(Boolean(drawerRect), true);
        assert.equal(drawerRect.x >= 8 && drawerRect.y >= 8, true, `drawer origin: ${JSON.stringify(drawerRect)}`);
        assert.equal(drawerRect.x + drawerRect.width <= session.page.viewportSize().width - 8 + 1, true, `drawer right edge: ${JSON.stringify(drawerRect)}`);
        assert.equal(drawerRect.y + drawerRect.height <= session.page.viewportSize().height - 8 + 1, true, `drawer bottom edge: ${JSON.stringify(drawerRect)}`);

        await session.page.keyboard.press('Escape');
        assert.equal(await drawer.isHidden(), true);
        assert.equal(await fab.getAttribute('aria-expanded'), 'false');
        await fab.click();
        await session.page.evaluate(() => document.body.click());
        assert.equal(await drawer.isHidden(), true);

        await fab.click();
        await drawer.locator('[data-dcuf-fab-action="filter-settings"]').click();
        assert.equal(await session.page.locator('#dcinside-filter-setting').count(), 1);
        await session.page.locator('#dcinside-filter-setting').evaluate((element) => element.remove());

        await fab.click();
        await drawer.locator('[data-dcuf-fab-action="block-management"]').click();
        assert.equal(await session.page.locator('#dc-block-management-panel').count(), 1);
        await session.page.locator('#dc-block-management-panel, #dc-block-management-panel-overlay').evaluateAll((elements) => elements.forEach((element) => element.remove()));

        await session.page.evaluate(() => window.__dcufFixture.toggleDark(true));
        await fab.click();
        const darkContract = await drawer.evaluate((element) => ({
            background: getComputedStyle(element).backgroundColor,
            color: getComputedStyle(element.querySelector('button')).color
        }));
        assert.notEqual(darkContract.background, 'rgba(0, 0, 0, 0)');
        assert.notEqual(darkContract.color, 'rgba(0, 0, 0, 0)');
        await session.page.keyboard.press('Escape');

        const fabRect = await fab.boundingBox();
        await session.page.mouse.move(fabRect.x + fabRect.width / 2, fabRect.y + fabRect.height / 2);
        await session.page.mouse.down();
        await session.page.mouse.move(fabRect.x - 80, fabRect.y - 80, { steps: 5 });
        await session.page.mouse.up();
        assert.equal(await drawer.isHidden(), true, 'drag release must not open the drawer');
        assert.notEqual(await session.page.locator('#dc-personal-block-controls').evaluate((element) => element.style.left), 'auto');

        await session.page.evaluate(() => window.__dcufTestbedGM.invokeMenu('플로팅 버튼 원위치'));
        let resetStyle = await session.page.locator('#dc-personal-block-controls').evaluate((element) => ({
            left: element.style.left,
            top: element.style.top,
            right: element.style.right,
            bottom: element.style.bottom
        }));
        assert.deepEqual(resetStyle, { left: 'auto', top: 'auto', right: '20px', bottom: '20px' });

        await session.page.locator('#dc-personal-block-controls').evaluate((element) => element.remove());
        await session.page.evaluate(() => window.__dcufTestbedGM.invokeMenu('플로팅 버튼 원위치'));
        assert.equal(await session.page.locator('#dc-personal-block-controls').count(), 1);
        resetStyle = await session.page.locator('#dc-personal-block-controls').evaluate((element) => ({
            left: element.style.left,
            top: element.style.top,
            right: element.style.right,
            bottom: element.style.bottom
        }));
        assert.deepEqual(resetStyle, { left: 'auto', top: 'auto', right: '20px', bottom: '20px' });

        await session.page.evaluate(() => window.__dcufTestbedGM.invokeMenu('메뉴 버튼 크기 조절'));
        const sizePanel = session.page.locator('#dc-personal-block-size-panel');
        const sizeRange = sizePanel.locator('#dc-personal-block-size-range');
        assert.equal(await sizePanel.count(), 1);
        assert.equal(await sizeRange.inputValue(), '100');
        const panelBackground = await sizePanel.evaluate((element) => getComputedStyle(element).backgroundColor);
        assert.notEqual(panelBackground, 'rgba(0, 0, 0, 0)');
        await sizeRange.evaluate((element) => {
            element.value = '75';
            element.dispatchEvent(new Event('input', { bubbles: true }));
        });
        assert.equal(await sizePanel.locator('.dcuf-fab-size-value').textContent(), '75%');
        const scaledTapTarget = await fab.evaluate((element) => {
            const rect = element.getBoundingClientRect();
            return {
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                fontSize: parseFloat(getComputedStyle(element).fontSize)
            };
        });
        assert.equal(Math.abs(scaledTapTarget.width - 114) <= 1, true, `scaled FAB width: ${scaledTapTarget.width}`);
        assert.equal(Math.abs(scaledTapTarget.height - 57) <= 1, true, `scaled FAB height: ${scaledTapTarget.height}`);
        assert.equal(Math.abs(scaledTapTarget.fontSize - 24) <= 0.1, true, `scaled FAB font size: ${scaledTapTarget.fontSize}`);
        await sizePanel.locator('[data-dcuf-fab-size-action="save"]').click();
        assert.equal(await sizePanel.count(), 0);
        assert.equal(await session.page.evaluate((key) => window.__dcufTestbedGM.get(key), storageKeys.fabScalePercent), 75);

        await session.page.locator('#dc-personal-block-controls').evaluate((element) => element.remove());
        await session.page.evaluate(() => window.__dcufTestbedGM.invokeMenu('플로팅 버튼 원위치'));
        const recreatedTapTarget = await session.page.locator('#dc-personal-block-fab').evaluate((element) => {
            const rect = element.getBoundingClientRect();
            return { width: Math.round(rect.width), height: Math.round(rect.height) };
        });
        assert.equal(Math.abs(recreatedTapTarget.width - 114) <= 1, true, `recreated FAB width: ${recreatedTapTarget.width}`);
        assert.equal(Math.abs(recreatedTapTarget.height - 57) <= 1, true, `recreated FAB height: ${recreatedTapTarget.height}`);
        const valuesAfter = await session.page.evaluate(() => window.__dcufTestbedGM.snapshot().values);
        assert.equal(valuesAfter[storageKeys.fabScalePercent], 75);
        delete valuesAfter[storageKeys.fabScalePercent];
        assert.deepEqual(valuesAfter, valuesBefore, 'floating controls must preserve all pre-existing stored settings');
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

test('mobile popup pinch resize preserves an off-center real-touch focal point', 'functional', async ({ browser, server }) => {
    if (isPcUserscript) return;

    const session = await createTestPage(browser, server.baseUrl, {
        storage: noStatsStorage,
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true
    });

    const cdp = await session.context.newCDPSession(session.page);
    const readPopup = async (selector) => session.page.locator(selector).evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
            rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
            transform: style.transform,
            boxSizing: style.boxSizing
        };
    });
    const dispatchPinch = async (selector, startHalfDistance, endHalfDistance) => {
        const before = await readPopup(selector);
        const anchor = {
            x: before.rect.left + (before.rect.width * 0.4),
            y: before.rect.top + (before.rect.height * 0.45)
        };
        const point = (x, id) => ({ x, y: anchor.y, id, radiusX: 2, radiusY: 2, force: 1 });

        await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [point(anchor.x - startHalfDistance, 1), point(anchor.x + startHalfDistance, 2)]
        });
        await session.page.waitForTimeout(20);
        await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [point(anchor.x - endHalfDistance, 1), point(anchor.x + endHalfDistance, 2)]
        });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

        return { before, after: await readPopup(selector), anchor };
    };
    const pinchAndMeasure = async (selector) => {
        await session.page.waitForTimeout(220);
        const before = await readPopup(selector);
        const shrink = await dispatchPinch(selector, 45, 35);
        const expand = await dispatchPinch(selector, 35, 45);
        const after = await readPopup(selector);
        return { before, shrink, expand, after };
    };

    const assertPinchGeometry = (name, report) => {
        const focalPoint = (entry) => ({
            x: entry.after.rect.left + (entry.after.rect.width * 0.4),
            y: entry.after.rect.top + (entry.after.rect.height * 0.45)
        });
        const shrinkFocal = focalPoint(report.shrink);
        const expandFocal = focalPoint(report.expand);
        const shrinkScaleX = report.shrink.after.rect.width / report.shrink.before.rect.width;
        const shrinkScaleY = report.shrink.after.rect.height / report.shrink.before.rect.height;
        const expandScaleX = report.expand.after.rect.width / report.expand.before.rect.width;
        const expandScaleY = report.expand.after.rect.height / report.expand.before.rect.height;

        assert.equal(report.shrink.after.rect.width < report.before.rect.width, true, `${name} width must follow pinch shrink: ${JSON.stringify(report)}`);
        assert.equal(report.shrink.after.rect.height < report.before.rect.height, true, `${name} height must follow pinch shrink: ${JSON.stringify(report)}`);
        assert.equal(report.expand.after.rect.width > report.shrink.after.rect.width, true, `${name} width must follow pinch expansion: ${JSON.stringify(report)}`);
        assert.equal(report.expand.after.rect.height > report.shrink.after.rect.height, true, `${name} height must follow pinch expansion: ${JSON.stringify(report)}`);
        assert.equal(Math.abs(shrinkScaleX - shrinkScaleY) <= 0.01, true, `${name} shrink must preserve popup proportions: ${JSON.stringify(report)}`);
        assert.equal(Math.abs(expandScaleX - expandScaleY) <= 0.01, true, `${name} expansion must preserve popup proportions: ${JSON.stringify(report)}`);
        assert.equal(Math.abs(shrinkFocal.x - report.shrink.anchor.x) <= 3, true, `${name} shrink focal x must stay under the touch midpoint: ${JSON.stringify(report)}`);
        assert.equal(Math.abs(shrinkFocal.y - report.shrink.anchor.y) <= 3, true, `${name} shrink focal y must stay under the touch midpoint: ${JSON.stringify(report)}`);
        assert.equal(Math.abs(expandFocal.x - report.expand.anchor.x) <= 3, true, `${name} expand focal x must stay under the touch midpoint: ${JSON.stringify(report)}`);
        assert.equal(Math.abs(expandFocal.y - report.expand.anchor.y) <= 3, true, `${name} expand focal y must stay under the touch midpoint: ${JSON.stringify(report)}`);
        assert.equal(report.after.rect.left >= 0 && report.after.rect.top >= 0, true, `${name} must remain inside the top-left viewport edge: ${JSON.stringify(report)}`);
        assert.equal(report.after.transform, 'none', `${name} centered transform must be normalized during pinch`);
        assert.equal(report.after.boxSizing, 'border-box', `${name} pinch dimensions must use border-box geometry`);
    };

    try {
        await session.goto('/board/view?id=test&no=1001');
        const fab = session.page.locator('#dc-personal-block-fab');
        const drawer = session.page.locator('#dc-personal-block-drawer');

        await fab.click();
        await drawer.locator('[data-dcuf-fab-action="filter-settings"]').click();
        assertPinchGeometry('settings', await pinchAndMeasure('#dcinside-filter-setting'));
        await session.page.locator('#dcinside-filter-setting').evaluate((element) => element.remove());

        await fab.click();
        await drawer.locator('[data-dcuf-fab-action="block-management"]').click();
        assertPinchGeometry('management', await pinchAndMeasure('#dc-block-management-panel'));

        await session.page.locator('#dc-block-management-panel .panel-backup-btn').click();
        assertPinchGeometry('backup', await pinchAndMeasure('#dc-backup-popup'));
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally {
        await session.close();
    }
});

test('야간모드 전환 후 DOM과 주요 스타일이 유지된다', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/board/lists?id=test');
        const result = await session.page.evaluate(() => {
            window.__dcufFixture.toggleDark(true);
            const item = document.querySelector('.custom-post-item.us-post');
            return {
                bodyDark: document.body.classList.contains('dc-filter-dark-mode'),
                htmlDark: document.documentElement.classList.contains('dc-filter-dark-mode'),
                itemCount: document.querySelectorAll('.custom-post-item').length,
                background: getComputedStyle(item).backgroundColor,
                display: getComputedStyle(item).display
            };
        });
        assert.equal(result.bodyDark && result.htmlDark, true);
        assert.equal(result.itemCount, 51);
        assert.notEqual(result.display, 'none');
        assert.notEqual(result.background, 'rgba(0, 0, 0, 0)');
    } finally { await session.close(); }
});

test('광고 DOM 반복 삽입에도 observer subscriber가 폭증하지 않는다', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/board/view?id=test&no=1001');
        const before = await getMetrics(session.page);
        for (let index = 0; index < 5; index += 1) {
            await session.page.evaluate(() => window.__dcufFixture.insertAds(10));
            await waitForSettled(session.page, 120);
        }
        await waitForSettled(session.page, 500);
        const after = await getMetrics(session.page);
        assert.equal(after.dcuf.gauges['mutation.subscribers'], before.dcuf.gauges['mutation.subscribers']);
        const newObserverStacks = after.mutationObserverCreationStacks.slice(before.mutationObserverCreationStacks.length, before.mutationObserverCreationStacks.length + 2);
        assert.equal(after.mutationObserversCreated, before.mutationObserversCreated, `new observer stacks: ${newObserverStacks.join('\n---\n')}`);
        assert.equal(await session.page.locator('.view_ad_wrap').count(), 50);
    } finally { await session.close(); }
});

test('페이지 이동과 뒤로가기 후 주요 기능이 복원된다', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/board/lists?id=test');
        await Promise.all([session.page.waitForURL('**/board/view**'), session.page.locator('#fixture-to-view').click()]);
        await session.page.waitForFunction(() => document.documentElement.classList.contains('script-ui-ready'));
        assert.equal(await session.page.locator('#comment_wrap_1').count(), 1);
        await session.page.goBack({ waitUntil: 'domcontentloaded' });
        await session.page.waitForFunction(() => document.documentElement.classList.contains('script-ui-ready'));
        await session.page.waitForFunction(() => document.querySelectorAll('.custom-post-item').length === 51);
        assert.equal(await session.page.locator('.custom-mobile-list').count(), 1);
        assert.equal(await session.page.locator('#dc-personal-block-fab').count(), 1);
    } finally { await session.close(); }
});

test('기존 저장 키와 데이터 형식이 유지된다', 'functional', async ({ browser, server }) => {
    const seeded = {
        ...noStatsStorage,
        [storageKeys.masterDisabled]: false,
        [storageKeys.personalList]: { uids: [{ id: 'seed-user', name: 'Seed' }], nicknames: ['seed-nick'], ips: ['1.2.3.4'] },
        [storageKeys.blockedUids]: JSON.stringify({ seed: { ts: Date.now(), sum: 2, post: 1, comment: 1, ratioBlocked: false } }),
        [storageKeys.blockedGuests]: JSON.stringify(['5.6.7.8']),
        [storageKeys.shortcut]: 'Shift+S'
    };
    const session = await createTestPage(browser, server.baseUrl, { storage: seeded });
    try {
        await session.goto('/board/view?id=test&no=1001');
        const values = await session.page.evaluate(() => window.__dcufTestbedGM.snapshot().values);
        assert.equal(typeof values.dcinside_master_disabled, 'boolean');
        assert.equal(typeof values.dcinside_threshold, 'number');
        assert.equal(typeof values.dcinside_blocked_uids, 'string');
        assert.equal(typeof values.dcinside_blocked_guests, 'string');
        assert.equal(Array.isArray(values.dcinside_personal_block_list.uids), true);
        assert.equal(Array.isArray(values.dcinside_personal_block_list.nicknames), true);
        assert.equal(Array.isArray(values.dcinside_personal_block_list.ips), true);
        assert.equal(values.dcinside_shortcut_key, 'Shift+S');
    } finally { await session.close(); }
});

test('대량 댓글과 장문 DOM의 비교 가능한 성능 지표를 기록한다', 'performance', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/board/view?id=test&no=1001');
        await session.page.evaluate(() => window.__dcufDiagnostics.reset());
        const before = await getMetrics(session.page);
        const commentsBefore = await session.page.locator('#comment_wrap_1 .cmt_list > li').count();
        const startedAt = Date.now();
        const heapSamples = [{
            label: 'baseline',
            elapsedMs: 0,
            domNodes: before.domNodes,
            heapUsed: before.heap?.usedJSHeapSize ?? null,
            pendingQueue: before.memory?.runtime?.taskQueues?.['filter-user-sum']?.pendingCount ?? 0
        }];
        await session.page.evaluate(() => window.__dcufFixture.addLongArticleNodes(1500));
        for (let burst = 1; burst <= 5; burst += 1) {
            await session.page.evaluate(() => window.__dcufFixture.addComments(100));
            await waitForSettled(session.page, 300);
            const sample = await getMetrics(session.page);
            heapSamples.push({
                label: `comments-${burst * 100}`,
                elapsedMs: Date.now() - startedAt,
                domNodes: sample.domNodes,
                heapUsed: sample.heap?.usedJSHeapSize ?? null,
                pendingQueue: sample.memory?.runtime?.taskQueues?.['filter-user-sum']?.pendingCount ?? 0
            });
        }
        await waitForSettled(session.page, 1200);
        const after = await getMetrics(session.page);
        heapSamples.push({
            label: 'settled',
            elapsedMs: Date.now() - startedAt,
            domNodes: after.domNodes,
            heapUsed: after.heap?.usedJSHeapSize ?? null,
            pendingQueue: after.memory?.runtime?.taskQueues?.['filter-user-sum']?.pendingCount ?? 0
        });
        const filterPasses = after.filterPasses.slice(before.filterPasses.length);
        const report = {
            scenario: 'append-500-comments-and-1500-article-nodes',
            wallDurationMs: Date.now() - startedAt,
            domNodesBefore: before.domNodes,
            domNodesAfter: after.domNodes,
            mutationCallbacks: after.mutationCallbacks - before.mutationCallbacks,
            mutationRecords: after.mutationRecords - before.mutationRecords,
            uidRequests: after.xhrRequests.length - before.xhrRequests.length,
            mirrorAdded: after.mirrorAdded - before.mirrorAdded,
            mirrorRemoved: after.mirrorRemoved - before.mirrorRemoved,
            processedDomNodes: after.processedDomNodes - before.processedDomNodes,
            filterPassSummary: summarizePasses(filterPasses),
            filterPasses,
            pendingQueuePeak: Math.max(...heapSamples.map((item) => item.pendingQueue || 0)),
            heapBefore: before.heap,
            heapAfter: after.heap,
            heapUsedDelta: before.heap && after.heap ? after.heap.usedJSHeapSize - before.heap.usedJSHeapSize : null,
            heapTrend: heapSamples,
            diagnostics: after.dcuf,
            memory: after.memory
        };
        performanceReports.push(report);
        assert.equal(await session.page.locator('#comment_wrap_1 .cmt_list > li').count() >= commentsBefore + 500, true);
        assert.equal(report.uidRequests, 0);
        const addedDomNodes = Math.max(1, report.domNodesAfter - report.domNodesBefore);
        assert.equal(report.mutationCallbacks / addedDomNodes < 0.25, true, `mutation callback/node ratio: ${report.mutationCallbacks}/${addedDomNodes}`);
        assert.equal((after.dcuf.counters['filter.fullRefilter.runs'] || 0), 0);
    } finally { await session.close(); }
});

test('UID API 지연과 실패를 큐·캐시 상태와 함께 재현한다', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/board/view?id=test&no=1001');
        server.state.apiMode = 'delay';
        server.state.apiDelayMs = 350;
        const delayedSelector = await session.page.evaluate(async () => {
            await window.__dcufTestbedGM.set('dcinside_threshold', 10);
            window.__dcufFixture.addComments(1, { uid: 'blocked-delay-user' });
            await window.__dcufFilterModule.refilterAllContent('testbed uid delay', { scheduleFollowups: false });
            const item = document.querySelector('#comment_wrap_1 [data-uid="blocked-delay-user"]')?.closest('li');
            return item?.id ? `#${item.id}` : '#missing-delayed-comment';
        });
        await waitForSettled(session.page, 100);
        const delaySample = await getMetrics(session.page);
        const delayedQueue = delaySample.memory?.runtime?.taskQueues?.['filter-user-sum'];
        assert.equal(server.state.uidRequests.length > 0, true);
        assert.equal((delayedQueue?.activeCount || 0) <= (delayedQueue?.concurrency || 4), true);
        assert.equal((delayedQueue?.pendingCount || 0) > 0, true, JSON.stringify(delayedQueue));
        await waitForHidden(session.page, delayedSelector, 15000);
        await session.page.waitForFunction(() => {
            const queue = window.__dcufMemoryDebug?.sample?.('queue-drain')?.runtime?.taskQueues?.['filter-user-sum'];
            return !queue || (queue.activeCount === 0 && queue.pendingCount === 0);
        }, null, { timeout: 20000 });

        server.state.apiMode = 'fail';
        server.state.apiDelayMs = 0;
        const requestsBeforeFailure = server.state.uidRequests.length;
        await session.page.evaluate(async () => {
            window.__dcufFixture.addComments(1, { uid: 'fail-testbed-user' });
            await window.__dcufFilterModule.refilterAllContent('testbed uid failure', { scheduleFollowups: false });
        });
        await session.page.waitForFunction(() => window.__dcufMemoryDebug?.sample?.('failure')?.filter?.negativeUserSumCache > 0, null, { timeout: 7000 });
        const failureSample = await getMetrics(session.page);
        assert.equal(server.state.uidRequests.slice(requestsBeforeFailure).some((item) => item.uid === 'fail-testbed-user'), true);
        assert.equal(failureSample.memory.filter.negativeUserSumCache > 0, true);
        assert.deepEqual(failureSample.errors, []);
        performanceReports.push({
            scenario: 'uid-api-delay-and-failure',
            delayedQueuePeakSample: delayedQueue,
            uidRequests: server.state.uidRequests.length,
            negativeCacheAfterFailure: failureSample.memory.filter.negativeUserSumCache
        });
    } finally { await session.close(); }
});

test('댓글 전체 재렌더 후 차단 상태와 단일 댓글 목록이 유지된다', 'functional', async ({ browser, server }) => {
    const storage = {
        ...noStatsStorage,
        [storageKeys.personalList]: { uids: [{ id: 'safe-comment-2', name: 'rerender target' }], nicknames: [], ips: [] }
    };
    const session = await createTestPage(browser, server.baseUrl, { storage });
    try {
        await session.goto('/board/view?id=test&no=1001');
        await waitForFiltered(session.page, '#comment_li_2');
        const before = await getMetrics(session.page);
        const countBefore = await session.page.locator('#comment_wrap_1 .cmt_list > li').count();
        await session.page.evaluate(() => window.__dcufFixture.rerenderComments());
        await waitForSettled(session.page, 1400);
        await waitForFiltered(session.page, '#comment_li_2');
        const after = await getMetrics(session.page);
        assert.equal(await session.page.locator('#comment_wrap_1 .comment_box > .cmt_list').count(), 1);
        assert.equal(await session.page.locator('#comment_wrap_1 .cmt_list > li').count(), countBefore);
        assert.equal((after.dcuf.counters['filter.fullRefilter.runs'] || 0) - (before.dcuf.counters['filter.fullRefilter.runs'] || 0), 0);
    } finally { await session.close(); }
});

test('목록 전체 교체는 정확히 한 목록 상태로 재구축된다', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/mgallery/board/lists?id=test');
        const before = await getMetrics(session.page);
        await session.page.evaluate(() => window.__dcufFixture.replaceList(53));
        await session.page.waitForFunction(() => document.querySelectorAll('.custom-post-item').length === 53, null, { timeout: 7000 });
        await waitForSettled(session.page, 500);
        const after = await getMetrics(session.page);
        assert.equal(await session.page.locator('table.gall_list tbody').count(), 1);
        assert.equal(await session.page.locator('table.gall_list tbody tr.ub-content').count(), 53);
        assert.equal(await session.page.locator('.custom-mobile-list').count(), 1);
        assert.equal(await session.page.locator('.custom-post-item').count(), 53);
        const activeObserverDelta = (after.mutationObserversCreated - after.mutationDisconnectCalls)
            - (before.mutationObserversCreated - before.mutationDisconnectCalls);
        assert.equal(activeObserverDelta <= 0, true, `active observer delta: ${activeObserverDelta}`);
        assert.equal(after.dcuf.gauges['mutation.subscribers'], before.dcuf.gauges['mutation.subscribers']);
    } finally { await session.close(); }
});

test('글쓰기: 메이저·마이너 원본 폼 계약과 모바일 변환이 초기화된다', 'write', async ({ browser, server }) => {
    for (const variant of ['major', 'minor']) {
        const pathname = variant === 'minor' ? '/mgallery/board/write/?id=test' : '/board/write/?id=test';
        const session = await createTestPage(browser, server.baseUrl, {
            storage: noStatsStorage,
            viewport: { width: 390, height: 844 }
        });
        try {
            await session.goto(pathname);
            assert.equal(await session.page.locator('body.is-write-page').count(), 1);
            assert.equal(await session.page.locator(`body.dcuf-write-${variant}`).count(), 1);
            assert.equal(await session.page.locator(`form#write.dcuf-write-form-${variant}`).count(), 1);
            assert.equal(await session.page.locator('style#dcuf-mobile-write-theme').count(), 1);
            assert.equal(await session.page.locator('form#write[name="write"]').count(), 1);
            assert.equal(await session.page.locator('#write_wrap .w_top').count(), 1);
            assert.equal(await session.page.locator('#write_wrap .dcuf-write-subject-row #subject').count(), 1);
            assert.equal(await session.page.locator('#subject[name="subject"]').count(), 1);
            assert.equal(await session.page.locator('#name[name="name"], #password[name="password"]').count(), 2);
            assert.equal(await session.page.locator('.note-editor .note-editable[contenteditable="true"]').count(), 1);
            assert.equal(await session.page.locator('.note-editor .note-codable').count(), 1);
            assert.equal(await session.page.locator('textarea#memo[name="memo"]').count(), 1);
            assert.equal(await session.page.locator('[name="_GALLTYPE_"], [name="r_key"], [name="upload_status"], [name="use_html"]').count(), 4);
            assert.equal(await session.page.locator('.guest_info_row.user_info_box > td.user_info_input').count() >= 2, true);
            const initialVisibility = await session.page.evaluate(() => ({
                editable: getComputedStyle(document.querySelector('.note-editable')).display,
                codable: getComputedStyle(document.querySelector('.note-codable')).display,
                decoys: Array.from(document.querySelectorAll('.fixture-decoy-input')).map((input) => {
                    const rect = input.getBoundingClientRect();
                    return { width: rect.width, height: rect.height };
                })
            }));
            assert.equal(initialVisibility.editable, 'block');
            assert.equal(initialVisibility.codable, 'none');
            assert.equal(initialVisibility.decoys.length, 2);
            assert.equal(initialVisibility.decoys.every((rect) => rect.width <= 1 && rect.height <= 1), true);
            assert.equal(await session.page.locator('.cm_ad').count(), 0, '초기 글쓰기 광고는 제거되어야 한다');
            if (variant === 'minor') {
                assert.equal(await session.page.locator('.write_subject [data-headtext]').count(), 9);
                assert.equal(await session.page.locator('.captcha #code').count(), 1);
                await session.page.waitForTimeout(250);
                const selectedHeadtextVisibility = await session.page.evaluate(() => {
                    const list = document.querySelector('.subject_list');
                    const selected = list.querySelector(':scope > li.active, :scope > li.sel');
                    const listRect = list.getBoundingClientRect();
                    const selectedRect = selected.getBoundingClientRect();
                    return {
                        scrollLeft: list.scrollLeft,
                        fullyVisible: selectedRect.left >= listRect.left - 1 && selectedRect.right <= listRect.right + 1
                    };
                });
                assert.equal(selectedHeadtextVisibility.scrollLeft > 0, true);
                assert.equal(selectedHeadtextVisibility.fullyVisible, true);
                await session.page.evaluate(() => {
                    window.__dcufFixture.toggleWriteCaptcha(false);
                    window.__dcufFixture.toggleWriteCaptcha(true);
                });
                assert.equal(await session.page.locator('.user_info_box > .fixture-captcha-cell.user_info_input .captcha #code').count(), 1);
            } else {
                assert.equal(await session.page.locator('.write_subject').count(), 0);
            }
            assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
        } finally { await session.close(); }
    }
});

test('글쓰기: 입력·말머리·에디터 재렌더·HTML 전환에도 작성값이 보존된다', 'write', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, {
        storage: noStatsStorage,
        viewport: { width: 430, height: 900 }
    });
    try {
        await session.goto('/mgallery/board/write/?id=test');
        const pendingLayerContract = await session.page.evaluate(() => {
            const inspectPending = (selector, positioningClass, positionedClass) => {
                const layer = document.querySelector(selector);
                layer.hidden = false;
                layer.classList.remove(positionedClass);
                layer.classList.add(positioningClass);
                const result = {
                    visibility: getComputedStyle(layer).visibility,
                    pointerEvents: getComputedStyle(layer).pointerEvents
                };
                layer.hidden = true;
                return result;
            };
            return {
                editor: inspectPending('.fixture-fontsize-layer', 'dcuf-editor-layer-positioning', 'dcuf-editor-layer-positioned'),
                headtext: inspectPending('.fixture-write-toast', 'dcuf-headtext-tip-positioning', 'dcuf-headtext-tip-positioned')
            };
        });
        for (const [name, layer] of Object.entries(pendingLayerContract)) {
            assert.equal(layer.visibility, 'hidden', `${name} layer must stay hidden while its coordinates are unresolved`);
            assert.equal(layer.pointerEvents, 'none', `${name} layer must not intercept taps while positioning`);
        }
        const delayedEditorOpenLatencyMs = await session.page.evaluate(async () => {
            const layer = document.querySelector('.fixture-fontsize-layer');
            const group = layer.closest('.note-btn-group');
            const trigger = group.querySelector('.note-btn');
            layer.hidden = true;
            group.classList.remove('open');
            trigger.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
            await new Promise((resolve) => window.setTimeout(resolve, 250));
            const openedAt = performance.now();
            layer.hidden = false;
            group.classList.add('open');
            return new Promise((resolve) => {
                const deadline = openedAt + 800;
                const inspect = () => {
                    if (getComputedStyle(layer).visibility === 'visible'
                        && layer.classList.contains('dcuf-editor-layer-positioned')) {
                        const latency = performance.now() - openedAt;
                        layer.hidden = true;
                        group.classList.remove('open');
                        resolve(latency);
                        return;
                    }
                    if (performance.now() >= deadline) {
                        layer.hidden = true;
                        group.classList.remove('open');
                        resolve(800);
                        return;
                    }
                    requestAnimationFrame(inspect);
                };
                requestAnimationFrame(inspect);
            });
        });
        assert.equal(delayedEditorOpenLatencyMs < 120, true, `delayed editor layer positioning latency: ${delayedEditorOpenLatencyMs.toFixed(1)}ms`);
        const delayedHeadtextOpenLatencyMs = await session.page.evaluate(async () => {
            const layer = document.querySelector('.fixture-write-toast');
            const item = layer.closest('li');
            layer.hidden = true;
            item.classList.remove('fixture-delayed-open');
            item.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
            await new Promise((resolve) => window.setTimeout(resolve, 250));
            const openedAt = performance.now();
            layer.hidden = false;
            item.classList.add('fixture-delayed-open');
            return new Promise((resolve) => {
                const deadline = openedAt + 800;
                const inspect = () => {
                    if (getComputedStyle(layer).visibility === 'visible'
                        && layer.classList.contains('dcuf-headtext-tip-positioned')) {
                        const latency = performance.now() - openedAt;
                        layer.hidden = true;
                        item.classList.remove('fixture-delayed-open');
                        resolve(latency);
                        return;
                    }
                    if (performance.now() >= deadline) {
                        layer.hidden = true;
                        item.classList.remove('fixture-delayed-open');
                        resolve(800);
                        return;
                    }
                    requestAnimationFrame(inspect);
                };
                requestAnimationFrame(inspect);
            });
        });
        assert.equal(delayedHeadtextOpenLatencyMs < 120, true, `delayed headtext positioning latency: ${delayedHeadtextOpenLatencyMs.toFixed(1)}ms`);
        writeLayoutReports.push({
            variant: 'delayed-write-layer-positioning',
            editorOpenLatencyMs: Math.round(delayedEditorOpenLatencyMs * 10) / 10,
            headtextOpenLatencyMs: Math.round(delayedHeadtextOpenLatencyMs * 10) / 10
        });
        await session.page.evaluate(() => {
            window.__dcufFixture.toggleWriteLayer('dccon', true);
        });
        await session.page.waitForTimeout(80);
        const baseFloatingLayerContract = await session.page.evaluate(() => {
            const editor = document.querySelector('.note-editor');
            const toolbar = document.querySelector('.note-toolbar');
            const dccon = document.querySelector('.fixture-dccon-layer');
            const subject = document.querySelector('.write_subject');
            const subjectList = document.querySelector('.subject_list');
            const inspect = (layer) => {
                const rect = layer.getBoundingClientRect();
                const hit = document.elementFromPoint(rect.left + Math.min(20, rect.width / 2), rect.top + Math.min(80, rect.height / 2));
                return {
                    position: getComputedStyle(layer).position,
                    visibility: getComputedStyle(layer).visibility,
                    positioned: layer.classList.contains('dcuf-editor-layer-positioned'),
                    zIndex: Number(getComputedStyle(layer).zIndex),
                    width: Math.round(rect.width),
                    overflow: getComputedStyle(layer).overflow,
                    insideViewport: rect.left >= 0 && rect.right <= innerWidth + 1 && rect.top >= 0 && rect.bottom <= innerHeight + 1,
                    topmost: layer === hit || layer.contains(hit)
                };
            };
            const result = {
                editorOverflow: getComputedStyle(editor).overflow,
                toolbarOverflowX: getComputedStyle(toolbar).overflowX,
                toolbarOverflowY: getComputedStyle(toolbar).overflowY,
                dcconGroupPosition: getComputedStyle(dccon.closest('.note-btn-group')).position,
                subjectOverflow: getComputedStyle(subject).overflow,
                subjectListOverflowX: getComputedStyle(subjectList).overflowX,
                dccon: inspect(dccon)
            };
            return result;
        });
        await session.page.evaluate(() => {
            window.__dcufFixture.toggleWriteLayer('dccon', false);
            window.__dcufFixture.toggleWriteLayer('fontsize', true);
        });
        await session.page.waitForTimeout(80);
        const fontsizeContract = await session.page.locator('.fixture-fontsize-layer').evaluate((layer) => {
            const rect = layer.getBoundingClientRect();
            const hit = document.elementFromPoint(rect.left + Math.min(20, rect.width / 2), rect.top + Math.min(80, rect.height / 2));
            return {
                position: getComputedStyle(layer).position,
                visibility: getComputedStyle(layer).visibility,
                positioned: layer.classList.contains('dcuf-editor-layer-positioned'),
                zIndex: Number(getComputedStyle(layer).zIndex),
                width: Math.round(rect.width),
                rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
                overflow: getComputedStyle(layer).overflow,
                insideViewport: rect.left >= 0 && rect.right <= innerWidth + 1 && rect.top >= 0 && rect.bottom <= innerHeight + 1,
                topmost: layer === hit || layer.contains(hit),
                hit: hit ? `${hit.tagName}#${hit.id}.${hit.className}:${hit.textContent?.trim()}:${hit.getAttribute('data-action') || ''}` : null
            };
        });
        await session.page.evaluate(() => {
            window.__dcufFixture.toggleWriteLayer('fontsize', false);
            window.__dcufFixture.toggleWriteLayer('headtext', true);
        });
        await session.page.waitForTimeout(80);
        const toastContract = await session.page.locator('.fixture-write-toast').evaluate((layer) => {
            const rect = layer.getBoundingClientRect();
            const hit = document.elementFromPoint(rect.left + Math.min(20, rect.width / 2), rect.top + Math.min(80, rect.height / 2));
            return {
                position: getComputedStyle(layer).position,
                visibility: getComputedStyle(layer).visibility,
                positioned: layer.classList.contains('dcuf-headtext-tip-positioned'),
                zIndex: Number(getComputedStyle(layer).zIndex),
                width: Math.round(rect.width),
                overflow: getComputedStyle(layer).overflow,
                insideViewport: rect.left >= 0 && rect.right <= innerWidth + 1 && rect.top >= 0 && rect.bottom <= innerHeight + 1,
                topmost: layer === hit || layer.contains(hit)
            };
        });
        const floatingLayerContract = { ...baseFloatingLayerContract, fontsize: fontsizeContract, toast: toastContract };
        assert.equal(floatingLayerContract.editorOverflow, 'visible');
        assert.equal(floatingLayerContract.toolbarOverflowX, 'auto');
        assert.equal(floatingLayerContract.toolbarOverflowY, 'hidden');
        assert.equal(floatingLayerContract.dcconGroupPosition, 'relative');
        assert.equal(floatingLayerContract.subjectOverflow, 'visible');
        assert.equal(floatingLayerContract.subjectListOverflowX, 'auto');
        for (const [name, layer] of Object.entries({ dccon: floatingLayerContract.dccon, fontsize: floatingLayerContract.fontsize, toast: floatingLayerContract.toast })) {
            assert.equal(layer.visibility, 'visible', `${name} must only become visible after positioning`);
            assert.equal(layer.positioned, true, `${name} must expose a completed-position marker`);
        }
        for (const [name, layer] of Object.entries({ dccon: floatingLayerContract.dccon, toast: floatingLayerContract.toast })) {
            assert.equal(layer.position, 'fixed', `${name} must escape its scrolling ancestor`);
            assert.equal(layer.zIndex >= 1000, true, `${name} z-index`);
            assert.equal(layer.topmost, true, `${name} must be hit-testable above the card; hit=${layer.hit}; rect=${JSON.stringify(layer.rect)}`);
        }
        assert.equal(floatingLayerContract.fontsize.position, 'fixed', 'editor dropdowns must escape the horizontal toolbar scroller');
        assert.equal(floatingLayerContract.fontsize.zIndex >= 1000, true, 'fontsize z-index');
        assert.equal(floatingLayerContract.fontsize.topmost, true, `fontsize must remain hit-testable; hit=${floatingLayerContract.fontsize.hit}`);
        assert.equal(floatingLayerContract.dccon.width, 640, 'DCCon popup must keep the host width');
        assert.equal(floatingLayerContract.fontsize.width, 172, 'font-size popup must keep the host width');
        assert.equal(floatingLayerContract.dccon.overflow, 'visible', 'DCCon popup must keep host overflow styling');
        assert.equal(floatingLayerContract.fontsize.insideViewport, true);
        assert.equal(floatingLayerContract.toast.insideViewport, true);
        await session.page.evaluate(() => {
            window.__dcufFixture.toggleWriteLayer('dccon', false);
            window.__dcufFixture.toggleWriteLayer('fontsize', false);
            window.__dcufFixture.toggleWriteLayer('headtext', false);
        });
        await session.page.locator('#name').fill('fixture-user');
        await session.page.locator('#password').fill('fixture-password');
        await session.page.locator('#subject').fill('fixture subject');
        await session.page.evaluate(() => {
            window.__dcufFixture.selectWriteHeadtext('연재');
            window.__dcufFixture.setWriteEditor('fixture body');
            window.__dcufFixture.addWriteAttachment('fixture.png');
            window.__dcufFixture.rerenderWriteEditor();
        });
        await session.page.evaluate(() => window.__dcufFixture.toggleWriteHtml(true));
        assert.equal(await session.page.locator('.note-editor.fixture-html-mode .note-codable').evaluate((element) => getComputedStyle(element).display), 'block');
        assert.equal(await session.page.locator('.note-editor.fixture-html-mode .note-editable').evaluate((element) => getComputedStyle(element).display), 'none');
        await session.page.evaluate(() => window.__dcufFixture.toggleWriteHtml(false));
        assert.equal(await session.page.locator('.note-editor .note-codable').evaluate((element) => getComputedStyle(element).display), 'none');
        assert.equal(await session.page.locator('.note-editor .note-editable').evaluate((element) => getComputedStyle(element).display), 'block');
        const snapshot = await session.page.evaluate(() => window.__dcufFixture.snapshot().write);
        assert.equal(await session.page.locator('#name').inputValue(), 'fixture-user');
        assert.equal(await session.page.locator('#password').inputValue(), 'fixture-password');
        assert.equal(snapshot.subject, 'fixture subject');
        assert.equal(snapshot.headtext, '연재');
        assert.equal(snapshot.memo.includes('fixture body'), true);
        assert.equal(snapshot.htmlMode, 'N');
        assert.equal(snapshot.attachments, 1);
        assert.equal(await session.page.locator('.note-editor[data-rerendered]').count(), 1);
        assert.equal(await session.page.locator('[data-headtext="연재"].active').count(), 1);
        const toolbarContract = await session.page.evaluate(() => {
            const toolbar = document.querySelector('.note-editor[data-rerendered] .note-toolbar');
            const label = toolbar.querySelector('.note-current-fontname');
            label.textContent = '';
            const style = getComputedStyle(toolbar);
            const labelStyle = getComputedStyle(label);
            const labelBeforeStyle = getComputedStyle(label, '::before');
            const rowTops = Array.from(toolbar.children)
                .filter((element) => element.getClientRects().length > 0)
                .map((element) => Math.round(element.getBoundingClientRect().top));
            return {
                overflowX: style.overflowX,
                overflowY: style.overflowY,
                touchAction: style.touchAction,
                scrollable: toolbar.scrollWidth > toolbar.clientWidth,
                rowSpread: Math.max(...rowTops) - Math.min(...rowTops),
                labelPlaceholder: labelBeforeStyle.content,
                labelColor: labelStyle.color,
                labelOpacity: labelStyle.opacity,
                labelVisibility: labelStyle.visibility
            };
        });
        assert.equal(toolbarContract.overflowX, 'auto');
        assert.equal(toolbarContract.overflowY, 'hidden');
        assert.equal(toolbarContract.touchAction.includes('pan-x'), true, 'native touch drag must scroll the editor toolbar');
        assert.equal(toolbarContract.scrollable, true, 'the single-row editor toolbar must scroll horizontally');
        assert.equal(toolbarContract.rowSpread <= 1, true, `editor toolbar rows must stay aligned; spread=${toolbarContract.rowSpread}`);
        assert.equal(toolbarContract.labelPlaceholder, '"글꼴"');
        assert.notEqual(toolbarContract.labelColor, 'rgba(0, 0, 0, 0)');
        assert.equal(toolbarContract.labelOpacity, '1');
        assert.equal(toolbarContract.labelVisibility, 'visible');

        await session.page.evaluate(() => { document.querySelector('.note-editor[data-rerendered] .note-toolbar').scrollLeft = 0; });
        const toolbarBox = await session.page.locator('.note-editor[data-rerendered] .note-toolbar').boundingBox();
        await session.page.mouse.move(toolbarBox.x + toolbarBox.width - 24, toolbarBox.y + (toolbarBox.height / 2));
        await session.page.mouse.down();
        await session.page.mouse.move(toolbarBox.x + 40, toolbarBox.y + (toolbarBox.height / 2), { steps: 6 });
        await session.page.mouse.up();
        const toolbarDragContract = await session.page.evaluate(() => ({
            scrollLeft: document.querySelector('.note-editor[data-rerendered] .note-toolbar').scrollLeft,
            openDropdowns: Array.from(document.querySelectorAll('.note-editor[data-rerendered] .note-dropdown-menu'))
                .filter((layer) => getComputedStyle(layer).display !== 'none').length
        }));
        assert.equal(toolbarDragContract.scrollLeft > 0, true, 'mouse drag must scroll the editor toolbar');
        assert.equal(toolbarDragContract.openDropdowns, 0, 'toolbar drag must not activate the button beneath the pointer');
        await session.page.locator('.note-editor[data-rerendered] .note-fontname button.dropdown-toggle').click();
        assert.equal(await session.page.locator('.note-editor[data-rerendered] .dropdown-fontname .note-dropdown-item').count(), 18, 'the full mobile font menu must survive editor rerender');
        await session.page.locator('.note-editor[data-rerendered] .dropdown-fontname [data-value="Arial"]').evaluate((item) => {
            item.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            item.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        });
        assert.equal(await session.page.locator('.note-editor[data-rerendered] .note-current-fontname').textContent(), 'Arial');
        assert.equal(await session.page.locator('.note-editor[data-rerendered] .dropdown-fontname [data-value="Arial"].checked').count(), 1);
        const editorLayout = await session.page.evaluate(() => {
            const formRect = document.querySelector('form#write').getBoundingClientRect();
            const editorRect = document.querySelector('.note-editor[data-rerendered]').getBoundingClientRect();
            const editableRect = document.querySelector('.note-editor[data-rerendered] .note-editable').getBoundingClientRect();
            const toolbar = document.querySelector('.note-editor[data-rerendered] .note-toolbar');
            const toolbarButtonRect = toolbar.querySelector('button').getBoundingClientRect();
            return {
                editorInsideForm: editorRect.left >= formRect.left - 1 && editorRect.right <= formRect.right + 1,
                editableInsideForm: editableRect.left >= formRect.left - 1 && editableRect.right <= formRect.right + 1,
                toolbarOverflowX: getComputedStyle(toolbar).overflowX,
                toolbarOverflowY: getComputedStyle(toolbar).overflowY,
                toolbarButtonHeight: Math.round(toolbarButtonRect.height)
            };
        });
        assert.equal(editorLayout.editorInsideForm, true);
        assert.equal(editorLayout.editableInsideForm, true);
        assert.equal(editorLayout.toolbarOverflowX, 'auto');
        assert.equal(editorLayout.toolbarOverflowY, 'hidden');
        assert.equal(editorLayout.toolbarButtonHeight >= 38, true);

        const clickTarget = session.page.locator('.subject_list > li').nth(1);
        const clickValue = await clickTarget.getAttribute('data-headtext');
        await clickTarget.click();
        assert.equal(await session.page.locator('[name="headtext"]').inputValue(), clickValue, 'a normal pointer click must select a headtext');
        assert.equal(await clickTarget.evaluate((element) => element.classList.contains('active')), true);
        await session.page.waitForTimeout(350);

        const jitterTarget = session.page.locator('.subject_list > li').nth(2);
        const jitterValue = await jitterTarget.getAttribute('data-headtext');
        const jitterBox = await jitterTarget.boundingBox();
        await session.page.mouse.move(jitterBox.x + (jitterBox.width / 2), jitterBox.y + (jitterBox.height / 2));
        await session.page.mouse.down();
        await session.page.mouse.move(jitterBox.x + (jitterBox.width / 2) + 3, jitterBox.y + (jitterBox.height / 2), { steps: 2 });
        await session.page.mouse.up();
        assert.equal(await session.page.locator('[name="headtext"]').inputValue(), jitterValue, 'minor pointer jitter must remain a click');

        await session.page.evaluate(() => {
            const list = document.querySelector('.subject_list');
            list.scrollLeft = 0;
        });
        const selectedBeforeDrag = await session.page.locator('[name="headtext"]').inputValue();
        const dragBox = await session.page.locator('.subject_list').boundingBox();
        await session.page.mouse.move(dragBox.x + dragBox.width - 24, dragBox.y + (dragBox.height / 2));
        await session.page.mouse.down();
        await session.page.mouse.move(dragBox.x + 40, dragBox.y + (dragBox.height / 2), { steps: 6 });
        await session.page.mouse.up();
        const dragContract = await session.page.evaluate(() => ({
            scrollLeft: document.querySelector('.subject_list').scrollLeft,
            headtext: document.querySelector('[name="headtext"]').value,
            touchAction: getComputedStyle(document.querySelector('.subject_list')).touchAction
        }));
        assert.equal(dragContract.scrollLeft > 0, true, 'mouse drag must scroll the headtext strip');
        assert.equal(dragContract.headtext, selectedBeforeDrag, 'drag must not select a headtext');
        assert.equal(dragContract.touchAction.includes('pan-x'), true, 'native touch drag must remain enabled');

        const postDragTarget = session.page.locator('.subject_list > li').nth(3);
        const postDragValue = await postDragTarget.getAttribute('data-headtext');
        await postDragTarget.click();
        assert.equal(await session.page.locator('[name="headtext"]').inputValue(), postDragValue, 'the next click after a drag must select normally');

        const darkTheme = await session.page.evaluate(() => {
            window.__dcufFixture.toggleDark(true);
            const bodyStyle = getComputedStyle(document.body);
            const formStyle = getComputedStyle(document.querySelector('form#write'));
            const inputStyle = getComputedStyle(document.querySelector('#subject'));
            const toolbarButtonStyle = getComputedStyle(document.querySelector('.note-toolbar .note-btn'));
            const inactiveHeadtextStyle = getComputedStyle(document.querySelector('.subject_list > li:not(.active)'));
            return {
                accent: bodyStyle.getPropertyValue('--dcuf-write-accent').trim(),
                formBackground: formStyle.backgroundColor,
                inputColor: inputStyle.color,
                toolbarButtonBackground: toolbarButtonStyle.backgroundColor,
                toolbarButtonColor: toolbarButtonStyle.color,
                inactiveHeadtextColor: inactiveHeadtextStyle.color
            };
        });
        assert.equal(darkTheme.accent, '#8cb4ff');
        assert.notEqual(darkTheme.formBackground, 'rgb(255, 255, 255)');
        assert.notEqual(darkTheme.inputColor, 'rgb(34, 34, 34)');
        assert.notEqual(darkTheme.toolbarButtonBackground, 'rgb(255, 255, 255)');
        assert.equal(darkTheme.toolbarButtonColor, 'rgb(237, 243, 255)');
        assert.equal(darkTheme.inactiveHeadtextColor, 'rgb(210, 220, 237)');
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

test('글쓰기: 중복 등록은 외부 이동 없이 로컬 mock에 한 번만 전달된다', 'write', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/board/write/?id=test');
        await session.page.locator('#subject').fill('submit contract');
        await session.page.evaluate(() => window.__dcufFixture.setWriteEditor('submit body'));
        await session.page.evaluate(() => {
            const form = document.querySelector('form#write');
            form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
            form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
        });
        await session.page.waitForFunction(() => document.querySelector('form#write')?.dataset.submitStatus === 'done');
        assert.equal(server.state.writeSubmissions.length, 1);
        assert.equal(server.state.writeSubmissions[0].values.subject, 'submit contract');
        assert.equal(server.state.writeSubmissions[0].values.memo.includes('submit body'), true);
        assert.equal(session.page.url().includes('/board/write/'), true);
    } finally { await session.close(); }
});

test('글쓰기: 네이티브 모바일 기준 fixture는 가로 넘침 없이 핵심 터치 UI를 제공한다', 'write', async ({ browser, server }) => {
    const native = await createRawPage(browser, server.baseUrl, { viewport: { width: 390, height: 844 } });
    try {
        await native.goto('/__testbed/native-write');
        const report = await native.page.evaluate(() => {
            const touchTargets = Array.from(document.querySelectorAll('button, input')).map((element) => {
                const rect = element.getBoundingClientRect();
                return { width: Math.round(rect.width), height: Math.round(rect.height), name: element.getAttribute('name') || element.textContent.trim() };
            });
            return {
                variant: 'native-reference',
                viewport: { width: innerWidth, height: innerHeight },
                scrollWidth: document.documentElement.scrollWidth,
                overflowX: Math.max(0, document.documentElement.scrollWidth - innerWidth),
                domNodes: document.getElementsByTagName('*').length,
                touchTargets
            };
        });
        writeLayoutReports.push(report);
        assert.equal(await native.page.locator('form#writeForm').count(), 1);
        assert.equal(await native.page.locator('[name="subject"], [name="memo"], [contenteditable="true"]').count(), 3);
        assert.equal(report.overflowX, 0);
        assert.equal(report.touchTargets.filter((item) => item.height >= 38).length >= 8, true);
    } finally { await native.close(); }

    for (const variant of ['major', 'minor']) {
        const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage, viewport: { width: 390, height: 844 } });
        try {
            await session.goto(variant === 'minor' ? '/mgallery/board/write/?id=test' : '/board/write/?id=test');
            const report = await session.page.evaluate((name) => {
                const rectOf = (selector) => {
                    const rect = document.querySelector(selector).getBoundingClientRect();
                    return {
                        left: Math.round(rect.left),
                        right: Math.round(rect.right),
                        width: Math.round(rect.width),
                        height: Math.round(rect.height)
                    };
                };
                const touchTargets = Array.from(document.querySelectorAll([
                    'form#write #subject',
                    'form#write #name',
                    'form#write #password',
                    'form#write #code',
                    'form#write .note-toolbar button',
                    'form#write .note-toolbar-media button',
                    'form#write .fixture-write-actions button'
                ].join(','))).filter((element) => element.getClientRects().length > 0).map((element) => {
                    const rect = element.getBoundingClientRect();
                    return {
                        id: element.id || element.dataset.command || element.textContent.trim(),
                        width: Math.round(rect.width),
                        height: Math.round(rect.height)
                    };
                });
                return {
                    variant: name,
                    viewport: { width: innerWidth, height: innerHeight },
                    scrollWidth: document.documentElement.scrollWidth,
                    overflowX: Math.max(0, document.documentElement.scrollWidth - innerWidth),
                    domNodes: document.getElementsByTagName('*').length,
                    form: rectOf('form#write'),
                    subject: rectOf('#subject'),
                    editor: rectOf('.note-editor'),
                    attachment: rectOf('.fixture-attachment-panel'),
                    aiPrompt: rectOf('.fixture-live-ai-prompt'),
                    actions: rectOf('.fixture-write-actions'),
                    visual: (() => {
                        const actions = getComputedStyle(document.querySelector('.fixture-write-actions'));
                        const cancel = getComputedStyle(document.querySelector('.fixture-write-actions .btn_grey'));
                        const submit = getComputedStyle(document.querySelector('.fixture-write-actions .btn_blue'));
                        const htmlGroup = document.querySelector('.fixture-html-group');
                        const subjectPanel = document.querySelector('.write_subject');
                        const captcha = document.querySelector('.captcha');
                        const htmlButton = htmlGroup.querySelector('.note-btn');
                        const htmlToolbar = htmlGroup.closest('[role="toolbar"]');
                        const htmlRect = htmlButton.getBoundingClientRect();
                        const toolbarRect = htmlToolbar.getBoundingClientRect();
                        const headtextLabel = subjectPanel?.querySelector('.dcuf-write-headtext-label');
                        const panelRect = subjectPanel?.getBoundingClientRect();
                        const labelRect = headtextLabel?.getBoundingClientRect();
                        const headtextList = subjectPanel?.querySelector('.subject_list');
                        const headtextRects = Array.from(headtextList?.querySelectorAll(':scope > li') || [])
                            .map((item) => item.getBoundingClientRect());
                        return {
                            actionRadius: parseFloat(actions.borderRadius) || 0,
                            cancelBackground: cancel.backgroundColor,
                            submitBackground: submit.backgroundImage === 'none' ? submit.backgroundColor : submit.backgroundImage,
                            submitColor: submit.color,
                            submitRadius: parseFloat(submit.borderRadius) || 0,
                            htmlBeforeContent: getComputedStyle(htmlGroup, '::before').content,
                            htmlContained: htmlRect.top >= toolbarRect.top - 1 && htmlRect.bottom <= toolbarRect.bottom + 1,
                            subjectBackground: subjectPanel ? getComputedStyle(subjectPanel).backgroundColor : null,
                            subjectRadius: subjectPanel ? parseFloat(getComputedStyle(subjectPanel).borderRadius) || 0 : null,
                            headtextLabelInset: panelRect && labelRect ? {
                                top: Math.round(labelRect.top - panelRect.top),
                                left: Math.round(labelRect.left - panelRect.left),
                                bottom: Math.round(panelRect.bottom - labelRect.bottom)
                            } : null,
                            headtextMaxGap: headtextRects.length > 1
                                ? Math.max(...headtextRects.slice(1).map((rect, index) => Math.round(rect.left - headtextRects[index].right)))
                                : null,
                            headtextOuterOverflow: subjectPanel ? getComputedStyle(subjectPanel).overflowX : null,
                            headtextListOverflow: headtextList ? getComputedStyle(headtextList).overflowX : null,
                            headtextScrollbarWidth: headtextList ? getComputedStyle(headtextList).scrollbarWidth : null,
                            headtextScrollable: headtextList ? headtextList.scrollWidth > headtextList.clientWidth : null,
                            captchaBackground: captcha ? getComputedStyle(captcha).backgroundColor : null
                        };
                    })(),
                    touchTargets
                };
            }, variant);
            writeLayoutReports.push(report);
            assert.equal(report.overflowX, 0, `${variant} write page must not overflow horizontally`);
            for (const [name, rect] of Object.entries({
                form: report.form,
                subject: report.subject,
                editor: report.editor,
                attachment: report.attachment,
                aiPrompt: report.aiPrompt,
                actions: report.actions
            })) {
                assert.equal(rect.left >= 0 && rect.right <= report.viewport.width + 1, true, `${variant} ${name} must stay inside viewport`);
            }
            for (const id of ['subject', 'name', 'password', 'write-submit']) {
                const target = report.touchTargets.find((item) => item.id === id);
                assert.equal(Boolean(target), true, `${variant} ${id} touch target must exist`);
                assert.equal(target.height >= 38, true, `${variant} ${id} touch target height: ${target.height}`);
            }
            assert.equal(report.touchTargets.filter((item) => item.height >= 38).length >= 12, true);
            assert.equal(report.visual.actionRadius >= 12, true);
            assert.equal(report.visual.submitRadius >= 12, true);
            assert.notEqual(report.visual.submitBackground, report.visual.cancelBackground);
            assert.equal(report.visual.submitColor, 'rgb(255, 255, 255)');
            assert.equal(['none', 'normal', '""'].includes(report.visual.htmlBeforeContent), true);
            assert.equal(report.visual.htmlContained, true);
            if (variant === 'minor') {
                assert.equal(report.visual.subjectBackground, 'rgb(255, 255, 255)');
                assert.equal(report.visual.subjectRadius >= 12, true);
                assert.equal(report.visual.headtextLabelInset.top >= 5, true);
                assert.equal(report.visual.headtextLabelInset.left >= 5, true);
                assert.equal(report.visual.headtextLabelInset.bottom >= 5, true);
                assert.equal(report.visual.headtextMaxGap <= 4, true, `headtext gap: ${report.visual.headtextMaxGap}`);
                assert.equal(report.visual.headtextOuterOverflow, 'visible');
                assert.equal(report.visual.headtextListOverflow, 'auto');
                assert.equal(report.visual.headtextScrollbarWidth, 'none');
                assert.equal(report.visual.headtextScrollable, true);
                assert.equal(report.visual.captchaBackground, 'rgb(255, 255, 255)');
            }
            assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
        } finally { await session.close(); }
    }

    for (const width of [900, 1280, 1600]) {
        const desktop = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage, viewport: { width, height: 900 } });
        try {
            await desktop.goto('/mgallery/board/write/?id=test');
            const report = await desktop.page.evaluate(() => {
                const form = document.querySelector('form#write').getBoundingClientRect();
                const aiPrompt = document.querySelector('.fixture-live-ai-prompt').getBoundingClientRect();
                const toolbar = document.querySelector('.note-toolbar');
                const toolbarStyle = getComputedStyle(toolbar);
                const toolbarRowTops = Array.from(toolbar.children)
                    .filter((element) => element.getClientRects().length > 0)
                    .map((element) => Math.round(element.getBoundingClientRect().top));
                return {
                    variant: `minor-desktop-fluid-${innerWidth}`,
                    viewport: { width: innerWidth, height: innerHeight },
                    scrollWidth: document.documentElement.scrollWidth,
                    overflowX: Math.max(0, document.documentElement.scrollWidth - innerWidth),
                    form: { left: Math.round(form.left), right: Math.round(form.right), width: Math.round(form.width) },
                    aiPrompt: { left: Math.round(aiPrompt.left), right: Math.round(aiPrompt.right), width: Math.round(aiPrompt.width) },
                    toolbarFlexWrap: toolbarStyle.flexWrap,
                    toolbarOverflowX: toolbarStyle.overflowX,
                    toolbarScrollable: toolbar.scrollWidth > toolbar.clientWidth,
                    toolbarRowSpread: Math.max(...toolbarRowTops) - Math.min(...toolbarRowTops)
                };
            });
            writeLayoutReports.push(report);
            assert.equal(report.overflowX, 0);
            assert.equal(report.form.width <= Math.min(1120, width) && report.form.width >= Math.min(1120, width) - 64, true, `desktop fluid form width at ${width}: ${report.form.width}`);
            assert.equal(report.aiPrompt.left >= report.form.left && report.aiPrompt.right <= report.form.right, true);
            assert.equal(report.toolbarFlexWrap, 'nowrap', 'desktop-sized write toolbar must also remain on one row');
            assert.equal(report.toolbarOverflowX, 'auto', 'desktop-sized write toolbar must scroll instead of wrapping');
            assert.equal(report.toolbarRowSpread <= 1, true, `desktop-sized toolbar must stay on one row; spread=${report.toolbarRowSpread}`);
            if (width === 900) assert.equal(report.toolbarScrollable, true, 'narrow desktop-sized toolbar must have horizontal scroll range');
            assertNoRuntimeErrors(await getMetrics(desktop.page), desktop.consoleErrors);
        } finally { await desktop.close(); }
    }

    const desktopSiteMobile = await createTestPage(browser, server.baseUrl, {
        storage: noStatsStorage,
        viewport: { width: 980, height: 1800 },
        screen: { width: 412, height: 915 },
        deviceScaleFactor: 2.625,
        hasTouch: true
    });
    try {
        await desktopSiteMobile.goto('/mgallery/board/write/?id=test');
        await desktopSiteMobile.page.evaluate(() => {
            window.__dcufFixture.toggleWriteLayer('dccon', true);
            window.__dcufFixture.toggleWriteLayer('headtext', true);
        });
        await desktopSiteMobile.page.waitForTimeout(80);
        const firstLayerReport = await desktopSiteMobile.page.evaluate(() => {
            const inspectLayer = (selector) => {
                const layer = document.querySelector(selector);
                const rect = layer.getBoundingClientRect();
                const hit = document.elementFromPoint(rect.left + Math.min(16, rect.width / 2), rect.top + Math.min(80, rect.height / 2));
                return {
                    rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
                    cssLeft: getComputedStyle(layer).left,
                    cssTop: getComputedStyle(layer).top,
                    overflow: getComputedStyle(layer).overflow,
                    insideViewport: rect.left >= 0 && rect.right <= innerWidth + 1 && rect.top >= 0 && rect.bottom <= innerHeight + 1,
                    topmost: layer === hit || layer.contains(hit)
                };
            };
            return {
                dccon: inspectLayer('.fixture-dccon-layer'),
                headtext: inspectLayer('.fixture-write-toast')
            };
        });
        await desktopSiteMobile.page.evaluate(() => {
            window.__dcufFixture.toggleWriteLayer('dccon', false);
            window.__dcufFixture.toggleWriteLayer('fontsize', true);
        });
        await desktopSiteMobile.page.waitForTimeout(80);
        const report = await desktopSiteMobile.page.evaluate((firstLayers) => {
            const container = document.querySelector('#container').getBoundingClientRect();
            const writeWrap = document.querySelector('#write_wrap').getBoundingClientRect();
            const form = document.querySelector('form#write').getBoundingClientRect();
            const subject = document.querySelector('#subject').getBoundingClientRect();
            const physicalRatio = screen.width / innerWidth;
            const inspectLayer = (selector) => {
                const layer = document.querySelector(selector);
                const rect = layer.getBoundingClientRect();
                const hit = document.elementFromPoint(rect.left + Math.min(16, rect.width / 2), rect.top + Math.min(80, rect.height / 2));
                return {
                    rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
                    cssLeft: getComputedStyle(layer).left,
                    cssTop: getComputedStyle(layer).top,
                    overflow: getComputedStyle(layer).overflow,
                    insideViewport: rect.left >= 0 && rect.right <= innerWidth + 1 && rect.top >= 0 && rect.bottom <= innerHeight + 1,
                    topmost: layer === hit || layer.contains(hit)
                };
            };
            return {
                variant: 'minor-desktop-site-mobile',
                screenWidth: screen.width,
                viewportWidth: innerWidth,
                classApplied: document.body.classList.contains('dcuf-write-desktop-site-mobile'),
                scale: Number(getComputedStyle(document.body).getPropertyValue('--dcuf-write-desktop-site-scale')),
                container: { left: container.left, right: container.right, width: container.width },
                writeWrap: { left: writeWrap.left, right: writeWrap.right, width: writeWrap.width },
                form: { left: form.left, right: form.right, width: form.width },
                formToWrapRatio: form.width / writeWrap.width,
                formWidth: Math.round(form.width),
                physicalFormWidth: form.width * physicalRatio,
                physicalSubjectHeight: subject.height * physicalRatio,
                overflowX: Math.max(0, document.documentElement.scrollWidth - innerWidth),
                layers: {
                    dccon: firstLayers.dccon,
                    fontsize: inspectLayer('.fixture-fontsize-layer'),
                    headtext: firstLayers.headtext
                }
            };
        }, firstLayerReport);
        writeLayoutReports.push(report);
        assert.equal(report.screenWidth, 412);
        assert.equal(report.viewportWidth, 980);
        assert.equal(report.classApplied, true);
        assert.equal(report.scale > 2.3 && report.scale < 2.5, true, `desktop-site scale: ${report.scale}`);
        assert.equal(report.formToWrapRatio >= 0.98, true, `form/write-wrap ratio: ${report.formToWrapRatio}`);
        assert.equal(Math.abs(report.form.left - report.writeWrap.left) <= 1, true, `form left: ${report.form.left}, wrap left: ${report.writeWrap.left}`);
        assert.equal(Math.abs(report.form.right - report.writeWrap.right) <= 1, true, `form right: ${report.form.right}, wrap right: ${report.writeWrap.right}`);
        assert.equal(report.physicalFormWidth >= report.screenWidth - 20, true, `physical form width: ${report.physicalFormWidth}`);
        assert.equal(report.physicalSubjectHeight >= 44, true, `physical input height: ${report.physicalSubjectHeight}`);
        assert.equal(report.overflowX, 0);
        assert.equal(Math.round(report.layers.dccon.rect.width), 640, 'desktop-site DCCon popup must keep host width');
        assert.equal(Math.round(report.layers.fontsize.rect.width * (report.screenWidth / report.viewportWidth)), 172, 'desktop-site font-size popup must keep its physical host width');
        assert.equal(report.layers.dccon.overflow, 'visible');
        for (const [name, layer] of Object.entries(report.layers)) {
            assert.equal(layer.insideViewport, true, `${name} must stay inside desktop-site mobile viewport`);
            assert.equal(layer.topmost, true, `${name} must remain topmost in desktop-site mobile mode`);
        }

        const mobileViewportLayerContract = await desktopSiteMobile.page.evaluate(async () => {
            const visualViewport = window.visualViewport;
            const fakeViewport = { offsetLeft: 0, offsetTop: 0, pageLeft: 0, pageTop: 0, width: 979.8095, height: 2139.8245, scale: 0.4206843 };
            if (visualViewport) {
                for (const property of Object.keys(fakeViewport)) {
                    Object.defineProperty(visualViewport, property, { configurable: true, get: () => fakeViewport[property] });
                }
            }
            const inspect = (selector) => {
                const layer = document.querySelector(selector);
                const rect = layer.getBoundingClientRect();
                const style = getComputedStyle(layer);
                return {
                    rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
                    position: style.position,
                    zIndex: Number(style.zIndex),
                    overflowX: style.overflowX,
                    overflowY: style.overflowY,
                    scrollWidth: layer.scrollWidth,
                    clientWidth: layer.clientWidth,
                    scrollHeight: layer.scrollHeight,
                    clientHeight: layer.clientHeight,
                    itemCount: layer.querySelectorAll('.note-dropdown-item').length,
                    anchorRect: (() => {
                        const rect = layer.closest('.note-btn-group').getBoundingClientRect();
                        return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
                    })()
                };
            };
            const settle = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

            window.__dcufFixture.toggleWriteLayer('fontsize', false);
            window.__dcufFixture.toggleWriteLayer('fontname', true);
            visualViewport?.dispatchEvent(new Event('resize'));
            await settle();
            const fontname = inspect('.fixture-fontname-layer');

            window.__dcufFixture.toggleWriteLayer('fontname', false);
            window.__dcufFixture.toggleWriteLayer('lineheight', true);
            visualViewport?.dispatchEvent(new Event('resize'));
            await settle();
            const lineheight = inspect('.fixture-lineheight-layer');

            window.__dcufFixture.toggleWriteLayer('lineheight', false);
            window.__dcufFixture.toggleWriteLayer('paragraph', true);
            visualViewport?.dispatchEvent(new Event('resize'));
            await settle();
            const paragraph = inspect('.fixture-paragraph-layer');

            window.__dcufFixture.toggleWriteLayer('paragraph', false);
            window.__dcufFixture.toggleWriteLayer('table', true);
            visualViewport?.dispatchEvent(new Event('resize'));
            await settle();
            const table = inspect('.fixture-table-layer');

            window.__dcufFixture.toggleWriteLayer('table', false);
            window.__dcufFixture.toggleWriteLayer('color', true);
            visualViewport?.dispatchEvent(new Event('resize'));
            await settle();
            const color = inspect('.fixture-color-layer');
            const colorLayer = document.querySelector('.fixture-color-layer');
            colorLayer.dispatchEvent(new Event('scroll'));
            await settle();
            const remainsOpenOnInternalScroll = getComputedStyle(colorLayer).display !== 'none';
            window.scrollBy(0, 120);
            await settle();
            const colorAfterPageScroll = inspect('.fixture-color-layer');
            const remainsOpenOnPageScroll = getComputedStyle(colorLayer).display !== 'none';
            const fontButton = document.querySelector('.note-fontname button.dropdown-toggle');
            const containerWidth = document.querySelector('#container').getBoundingClientRect().width;
            const scaledVisualWidth = fakeViewport.width * fakeViewport.scale;
            const coordinateScale = containerWidth <= scaledVisualWidth + 2 ? fakeViewport.scale : 1;
            return {
                viewport: {
                    left: fakeViewport.offsetLeft * coordinateScale,
                    top: fakeViewport.offsetTop * coordinateScale,
                    width: fakeViewport.width * coordinateScale,
                    height: fakeViewport.height * coordinateScale
                },
                fontButton: {
                    width: fontButton.getBoundingClientRect().width,
                    label: fontButton.querySelector('.note-current-fontname')?.textContent?.trim() || ''
                },
                fontname,
                lineheight,
                paragraph,
                table,
                color,
                colorAfterPageScroll,
                remainsOpenOnInternalScroll,
                remainsOpenOnPageScroll
            };
        });
        for (const [name, layer] of Object.entries({
            fontname: mobileViewportLayerContract.fontname,
            lineheight: mobileViewportLayerContract.lineheight,
            paragraph: mobileViewportLayerContract.paragraph,
            table: mobileViewportLayerContract.table,
            color: mobileViewportLayerContract.color
        })) {
            const viewport = mobileViewportLayerContract.viewport;
            const geometry = `rect=${JSON.stringify(layer.rect)} viewport=${JSON.stringify(viewport)}`;
            assert.equal(layer.rect.left >= viewport.left + 7, true, `${name} left must follow the scaled visual viewport; ${geometry}`);
            assert.equal(layer.rect.right <= viewport.left + viewport.width - 7, true, `${name} right must stay in the scaled visual viewport; ${geometry}`);
            assert.equal(layer.rect.top >= viewport.top + 7, true, `${name} top must follow the scaled visual viewport; ${geometry}`);
            assert.equal(layer.rect.bottom <= viewport.top + viewport.height - 7, true, `${name} bottom must stay in the scaled visual viewport; ${geometry}`);
            assert.equal(layer.zIndex >= 2147483647, true, `${name} must remain above write cards`);
        }
        for (const [name, layer] of Object.entries({
            fontname: mobileViewportLayerContract.fontname,
            lineheight: mobileViewportLayerContract.lineheight,
            paragraph: mobileViewportLayerContract.paragraph,
            table: mobileViewportLayerContract.table,
            color: mobileViewportLayerContract.color
        })) {
            assert.equal(layer.position, 'fixed', `${name} must escape the horizontal toolbar scroller`);
        }
        assert.equal(mobileViewportLayerContract.fontButton.width >= 88, true, 'the mobile font button must not collapse to a caret-only control');
        assert.equal(mobileViewportLayerContract.fontButton.label, '글꼴');
        assert.equal(mobileViewportLayerContract.fontname.itemCount, 18, 'the Android-filtered font menu must be restored');
        assert.equal(mobileViewportLayerContract.color.scrollWidth > mobileViewportLayerContract.color.clientWidth, true, 'the wide color palette must scroll internally instead of leaving the viewport');
        assert.equal(mobileViewportLayerContract.remainsOpenOnInternalScroll, true, 'scrolling inside a dropdown must keep it open');
        assert.equal(mobileViewportLayerContract.remainsOpenOnPageScroll, true, 'page scrolling must not fight Summernote open state');
        const colorGap = mobileViewportLayerContract.color.rect.top - mobileViewportLayerContract.color.anchorRect.bottom;
        const colorGapAfterScroll = mobileViewportLayerContract.colorAfterPageScroll.rect.top - mobileViewportLayerContract.colorAfterPageScroll.anchorRect.bottom;
        assert.equal(Math.abs(colorGapAfterScroll - colorGap) <= 1, true, 'absolute dropdowns must move with their toolbar anchor without jumping');
        assertNoRuntimeErrors(await getMetrics(desktopSiteMobile.page), desktopSiteMobile.consoleErrors);
    } finally { await desktopSiteMobile.close(); }
});

const server = await startServer();
const browser = await launchBrowser({ headed });
let failures = 0;
const selected = tests.filter((item) => (!selectedGroup || item.group === selectedGroup) && (!selectedName || item.name.includes(selectedName)));
console.log(`DCUF testbed: ${selected.length} tests, ${server.baseUrl}`);
try {
    for (const item of selected) {
        const startedAt = Date.now();
        try {
            server.reset();
            await item.run({ browser, server });
            testResults.push({ name: item.name, group: item.group, status: 'passed', durationMs: Date.now() - startedAt });
            console.log(`PASS ${item.name} (${Date.now() - startedAt}ms)`);
        } catch (error) {
            failures += 1;
            testResults.push({ name: item.name, group: item.group, status: 'failed', durationMs: Date.now() - startedAt, error: error?.stack || String(error) });
            console.error(`FAIL ${item.name} (${Date.now() - startedAt}ms)`);
            console.error(error?.stack || error);
        }
    }
} finally {
    await browser.close();
    await server.close();
}

const artifactDir = path.join(testbedDir, 'artifacts');
await mkdir(artifactDir, { recursive: true });
await writeFile(path.join(artifactDir, 'test-results-latest.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), results: testResults }, null, 2)}\n`, 'utf8');
if (performanceReports.length > 0) {
    const artifactPath = path.join(artifactDir, 'performance-latest.json');
    let previous = null;
    try { previous = JSON.parse(await readFile(artifactPath, 'utf8')); } catch { /* first performance run */ }
    const comparisonFields = ['wallDurationMs', 'domNodesAfter', 'mutationCallbacks', 'mutationRecords', 'processedDomNodes', 'uidRequests', 'heapUsedDelta'];
    const comparisons = performanceReports.map((current) => {
        const prior = previous?.reports?.find((item) => item.scenario === current.scenario) || null;
        const deltas = Object.fromEntries(comparisonFields.flatMap((field) => (
            Number.isFinite(current[field]) && Number.isFinite(prior?.[field])
                ? [[field, current[field] - prior[field]]]
                : []
        )));
        return { scenario: current.scenario, hasPrevious: Boolean(prior), deltas };
    });
    await writeFile(artifactPath, `${JSON.stringify({
        generatedAt: new Date().toISOString(),
        previousGeneratedAt: previous?.generatedAt || null,
        reports: performanceReports,
        comparisons
    }, null, 2)}\n`, 'utf8');
    console.log(`Performance report: ${artifactPath}`);
}
if (writeLayoutReports.length > 0) {
    const artifactPath = path.join(artifactDir, 'write-layout-latest.json');
    let previous = null;
    try { previous = JSON.parse(await readFile(artifactPath, 'utf8')); } catch { /* first write layout run */ }
    const comparisons = writeLayoutReports.map((current) => {
        const prior = previous?.reports?.find((item) => item.variant === current.variant) || null;
        return {
            variant: current.variant,
            hasPrevious: Boolean(prior),
            overflowXDelta: prior ? current.overflowX - prior.overflowX : null,
            domNodesDelta: prior ? current.domNodes - prior.domNodes : null
        };
    });
    await writeFile(artifactPath, `${JSON.stringify({
        generatedAt: new Date().toISOString(),
        previousGeneratedAt: previous?.generatedAt || null,
        reports: writeLayoutReports,
        comparisons
    }, null, 2)}\n`, 'utf8');
    console.log(`Write layout report: ${artifactPath}`);
}

console.log(`Result: ${selected.length - failures} passed, ${failures} failed`);
if (failures > 0) process.exitCode = 1;
