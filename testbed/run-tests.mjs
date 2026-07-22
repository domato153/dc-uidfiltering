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
const mobileTest = (name, group, run) => test(name, group, async (context) => {
    if (isPcUserscript) return;
    return run(context);
});
// Historical quick-write assertions remain unregistered until the related
// workstream closes; the production feature itself has been removed.
const obsoleteMobileTest = () => {};
const pcTest = (name, group, run) => test(name, group, async (context) => {
    if (!isPcUserscript) return;
    return run(context);
});
const statsStorage = {
    [storageKeys.threshold]: 10,
    [storageKeys.ratioEnabled]: false,
    [storageKeys.personalEnabled]: true,
    [storageKeys.personalList]: { uids: [], nicknames: [], ips: [] }
};
const noStatsStorage = { ...statsStorage, [storageKeys.threshold]: 0 };

mobileTest('boot: 모바일 UID 통계 캐시는 재로드 시 공개 전에 차단하고 서버를 재조회하지 않는다', 'boot', async ({ browser, server }) => {
    const cachedUid = 'safe-comment-2';
    const storage = {
        ...statsStorage,
        [storageKeys.blockedUids]: JSON.stringify({
            [cachedUid]: { ts: Date.now(), sum: 2, post: 1, comment: 1, ratioBlocked: false }
        })
    };
    const session = await createTestPage(browser, server.baseUrl, {
        storage,
        boot: { protectedUids: [cachedUid] }
    });
    try {
        await session.goto('/board/view?id=test&no=1001');
        const result = await session.page.evaluate((uid) => {
            const target = document.querySelector(`[data-uid="${CSS.escape(uid)}"]`)?.closest('li');
            const gm = window.__dcufTestbedGM.snapshot();
            return {
                state: document.documentElement.getAttribute('data-dcuf-boot-state'),
                display: target instanceof HTMLElement ? target.style.display : 'missing',
                frames: window.__dcufBootProbe.snapshot(),
                cacheReads: gm.reads.filter((entry) => entry.key === 'dcinside_blocked_uids').length
            };
        }, cachedUid);
        assert.equal(result.state, 'ready');
        assert.equal(result.display, 'none');
        assert.equal(result.frames.every((frame) => frame.visibleProtectedTargets === 0), true);
        assert.equal(result.cacheReads, 1);
        assert.equal(server.state.uidRequests.some((entry) => entry.uid === cachedUid), false);
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

mobileTest('boot: 댓글 장벽 이후의 새 DOM도 최종 동기 필터 뒤에 공개된다', 'boot', async ({ browser, server }) => {
    const cachedUid = 'safe-comment-2';
    const storage = {
        ...statsStorage,
        [storageKeys.blockedUids]: JSON.stringify({
            [cachedUid]: { ts: Date.now(), sum: 2, post: 1, comment: 1, ratioBlocked: false }
        })
    };
    const session = await createTestPage(browser, server.baseUrl, {
        storage,
        gmBehavior: { delayByKey: { [storageKeys.threshold]: 280 } },
        boot: { protectedUids: [cachedUid] }
    });
    try {
        await session.goto('/board/view?id=test&no=1001', { waitForReady: false });
        const hookState = await session.page.evaluate((uid) => {
            const controller = window.__dcufBootController;
            if (!controller) return { hooked: false };
            const frames = [];
            let readyFrames = 0;
            let injected = false;
            const isPaintVisible = (element) => {
                if (!(element instanceof HTMLElement)) return false;
                const style = getComputedStyle(element);
                const bodyStyle = getComputedStyle(document.body);
                const rect = element.getBoundingClientRect();
                return style.display !== 'none'
                    && style.visibility !== 'hidden'
                    && bodyStyle.visibility !== 'hidden'
                    && Number(bodyStyle.opacity) > 0
                    && rect.width > 0
                    && rect.height > 0;
            };
            const sample = () => {
                const target = document.querySelector(`[data-uid="${CSS.escape(uid)}"]`)?.closest('li');
                const state = document.documentElement.getAttribute('data-dcuf-boot-state') || '';
                frames.push({ state, injected, visible: isPaintVisible(target) });
                if (state === 'ready') readyFrames += 1;
                if (readyFrames < 6) requestAnimationFrame(sample);
            };
            requestAnimationFrame(sample);
            const originalNote = controller.note.bind(controller);
            controller.note = (label, detail) => {
                const result = originalNote(label, detail);
                if (label === 'boot.comment-barrier' && !injected) {
                    injected = window.__dcufFixture.rerenderComments({ fresh: true });
                }
                return result;
            };
            window.__dcufFinalCommentFrames = frames;
            return { hooked: true };
        }, cachedUid);
        assert.equal(hookState.hooked, true);
        await session.page.waitForFunction(() => document.documentElement.getAttribute('data-dcuf-boot-state') === 'ready', null, { timeout: 12000 });
        await session.page.waitForFunction(() => (window.__dcufFinalCommentFrames || []).filter((frame) => frame.state === 'ready').length >= 6);
        const result = await session.page.evaluate(() => ({
            frames: window.__dcufFinalCommentFrames,
            display: document.querySelector('[data-uid="safe-comment-2"]')?.closest('li')?.style.display || ''
        }));
        const injectedFrames = result.frames.filter((frame) => frame.injected && frame.state === 'ready');
        assert.equal(injectedFrames.length > 0, true);
        assert.equal(injectedFrames.every((frame) => frame.visible === false), true, JSON.stringify(injectedFrames));
        assert.equal(result.display, 'none');
        assert.equal(server.state.uidRequests.some((entry) => entry.uid === cachedUid), false);
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

mobileTest('boot: unrelated page churn does not extend comment quiet and the embedded list commits before reveal', 'boot', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, {
        storage: noStatsStorage,
        gmBehavior: { pendingKeys: [storageKeys.threshold] }
    });
    try {
        await session.goto('/board/view?id=test&no=1001', { waitForReady: false });
        const hooked = await session.page.evaluate(() => {
            const controller = window.__dcufBootController;
            if (!controller) return false;
            const notes = [];
            const revealWaitStarts = [];
            const originalNote = controller.note.bind(controller);
            controller.note = (label, detail) => {
                notes.push({ label, detail, at: performance.now() });
                return originalNote(label, detail);
            };
            const uiModule = window.__dcufUIModule;
            if (uiModule && typeof uiModule.waitForInitialRevealReady === 'function') {
                const originalWaitForReveal = uiModule.waitForInitialRevealReady.bind(uiModule);
                uiModule.waitForInitialRevealReady = (timeoutMs) => {
                    revealWaitStarts.push({ timeoutMs, at: performance.now() });
                    return originalWaitForReveal(timeoutMs);
                };
            }

            let active = true;
            const churn = () => {
                if (!active) return;
                const node = document.createElement('i');
                node.className = 'fixture-unrelated-boot-churn';
                document.body.appendChild(node);
                node.remove();
                requestAnimationFrame(churn);
            };
            window.__dcufScopedRevealResult = { notes, revealWaitStarts, reveal: null };
            window.addEventListener('dcuf:boot-ready', () => {
                active = false;
                const listWrap = document.querySelector('.view_bottom .gall_listwrap');
                const originalTable = listWrap?.querySelector('table.gall_list');
                const originalRows = originalTable?.querySelectorAll('tr.ub-content').length || 0;
                const customItems = listWrap?.querySelectorAll('.custom-mobile-list .custom-post-item').length || 0;
                window.__dcufScopedRevealResult.reveal = {
                    transformed: listWrap?.getAttribute('data-ui-transformed') || '',
                    originalInlineDisplay: originalTable?.style.getPropertyValue('display') || '',
                    originalComputedDisplay: originalTable instanceof HTMLElement ? getComputedStyle(originalTable).display : '',
                    originalRows,
                    customItems
                };
            }, { once: true });
            requestAnimationFrame(churn);
            return true;
        });
        assert.equal(hooked, true);
        await session.page.evaluate((key) => window.__dcufTestbedGM.release(key), storageKeys.threshold);
        await session.page.waitForFunction(() => document.documentElement.getAttribute('data-dcuf-boot-state') === 'ready', null, { timeout: 6000 });
        const result = await session.page.evaluate(() => window.__dcufScopedRevealResult);
        const barrier = result.notes.find((entry) => entry.label === 'boot.comment-barrier');
        assert.equal(barrier?.detail?.reason, 'mutation-quiet', JSON.stringify(result.notes));
        assert.equal(Number(barrier?.detail?.attempt) >= 1 && Number(barrier?.detail?.attempt) <= 2, true, JSON.stringify(barrier));
        assert.equal(barrier?.detail?.quietFrameCount, 1, JSON.stringify(barrier));
        assert.equal(barrier?.detail?.maxAttempts, 2, JSON.stringify(barrier));
        assert.equal(result.revealWaitStarts.length, 1, JSON.stringify(result.revealWaitStarts));
        assert.equal(result.revealWaitStarts[0].at <= barrier.at, true, JSON.stringify({ revealWaitStarts: result.revealWaitStarts, barrier }));
        assert.equal(result.reveal?.transformed, 'true', JSON.stringify(result.reveal));
        assert.equal(result.reveal?.originalInlineDisplay, 'none', JSON.stringify(result.reveal));
        assert.equal(result.reveal?.originalComputedDisplay, 'none', JSON.stringify(result.reveal));
        assert.equal(result.reveal?.originalRows > 0, true, JSON.stringify(result.reveal));
        assert.equal(result.reveal?.customItems, result.reveal?.originalRows, JSON.stringify(result.reveal));
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

test('모바일 UID 통계 차단 결과는 기존 캐시 형식으로 저장된다', 'functional', async ({ browser, server }) => {
    const blockedUids = ['blocked-related-user', 'blocked-image-user'];
    const session = await createTestPage(browser, server.baseUrl, { storage: statsStorage });
    try {
        await session.goto('/board/view?id=test&no=1001');
        await waitForHidden(session.page, '#img_comment_li_2');
        await session.page.waitForFunction((uids) => {
            const raw = window.__dcufTestbedGM.snapshot().values.dcinside_blocked_uids;
            try {
                const cache = JSON.parse(raw || '{}');
                return uids.every((uid) => Boolean(cache[uid]));
            } catch { return false; }
        }, blockedUids);
        const entries = await session.page.evaluate((uids) => {
            const raw = window.__dcufTestbedGM.snapshot().values.dcinside_blocked_uids;
            const cache = JSON.parse(raw || '{}');
            return uids.map((uid) => cache[uid] || null);
        }, blockedUids);
        entries.forEach((entry) => {
            assert.equal(typeof entry?.ts, 'number');
            assert.deepEqual(
                { sum: entry?.sum, post: entry?.post, comment: entry?.comment, ratioBlocked: entry?.ratioBlocked },
                { sum: 2, post: 1, comment: 1, ratioBlocked: false }
            );
        });
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

mobileTest('boot: a delayed view-bottom list replacement is hidden before its first paint', 'boot', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        const routes = [
            '/board/view?id=test&no=1001',
            '/mgallery/board/view?id=test&no=1001',
            '/mini/board/view?id=test&no=1001'
        ];
        for (const pathname of routes) {
            await session.goto(pathname);
            const result = await session.page.evaluate(async () => {
            const currentWrap = document.querySelector('.view_bottom .gall_listwrap');
            const sourceRows = Array.from(currentWrap?.querySelectorAll('tr.ub-content') || []).map((row) => {
                const clone = row.cloneNode(true);
                clone.removeAttribute('data-custom-row-id');
                return clone.outerHTML;
            }).join('');
            const replacement = document.createElement('section');
            replacement.className = 'gall_listwrap fixture-view-list fixture-delayed-view-list';
            replacement.innerHTML = '<table class="gall_list"><tbody class="listwrap2"></tbody></table>';
            currentWrap.replaceWith(replacement);

            const sample = (phase) => {
                const table = replacement.querySelector('table.gall_list');
                return {
                    phase,
                    transformed: replacement.getAttribute('data-ui-transformed') || '',
                    display: getComputedStyle(table).display,
                    inlineDisplay: table.style.getPropertyValue('display'),
                    priority: table.style.getPropertyPriority('display'),
                    rows: table.querySelectorAll('tr.ub-content').length,
                    customItems: replacement.querySelectorAll('.custom-mobile-list .custom-post-item').length
                };
            };

            await new Promise((resolve) => requestAnimationFrame(resolve));
            const frames = [sample('empty-first-frame')];
            window.__dcufDiagnostics.reset();
            replacement.querySelector('tbody').innerHTML = sourceRows;
            await new Promise((resolve) => requestAnimationFrame(resolve));
            frames.push(sample('populated-first-frame'));
            await new Promise((resolve) => requestAnimationFrame(resolve));
            frames.push(sample('settled-frame'));
            await new Promise((resolve) => setTimeout(resolve, 120));
            const diagnostics = window.__dcufDiagnostics.snapshot();
            return {
                frames,
                counters: diagnostics.counters,
                immediateSubscribers: Array.from(window.__dcufRuntimeCoordinator?._immediateMutationSubscribers?.keys?.() || [])
            };
            });

            const message = `${pathname}: ${JSON.stringify(result)}`;
            assert.equal(result.frames.length, 3, message);
            assert.equal(result.frames.every((frame) => frame.display === 'none'), true, message);
            assert.equal(result.frames.every((frame) => frame.inlineDisplay === 'none' && frame.priority === 'important'), true, message);
            assert.equal(result.frames[0].transformed, 'true', message);
            assert.equal(result.frames[0].rows, 0, message);
            assert.equal(result.frames[0].customItems, 0, message);
            assert.equal(result.frames[1].rows > 0, true, message);
            assert.equal(result.frames[1].customItems, result.frames[1].rows, message);
            assert.equal(result.frames[2].customItems, result.frames[2].rows, message);
            assert.equal(result.counters['ui.listImmediate.synced'], 1, message);
            assert.equal(result.counters['ui.listImmediate.suppressedTbodySchedule'], 1, message);
            assert.equal(result.counters['ui.listState.synced'], 1, message);
            assert.equal(Object.entries(result.counters).some(([key, value]) => (
                key.startsWith('scheduler.ui-list-')
                    && (key.endsWith('.raf') || key.endsWith('.delay:90'))
                    && value > 0
            )), false, message);
            assert.equal(result.immediateSubscribers.includes('ui-view-bottom-list-visibility'), true, message);
            assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
        }
    } finally { await session.close(); }
});

test('mobile blocked UID persistence batches bursts and preserves in-flight updates', 'functional', async ({ browser, server }) => {
    if (isPcUserscript) return;
    const session = await createTestPage(browser, server.baseUrl, {
        storage: noStatsStorage,
        gmBehavior: { writeDelayByKey: { [storageKeys.blockedUids]: 180 } }
    });
    try {
        await session.goto('/board/view?id=test&no=1001');
        const result = await session.page.evaluate(async (blockedUidsKey) => {
            const filterModule = window.__dcufFilterModule;
            window.__dcufDiagnostics.reset();
            const writesBefore = window.__dcufTestbedGM.snapshot().writes.filter((entry) => entry.key === blockedUidsKey).length;

            await Promise.all([
                filterModule.addBlockedUid('batch-uid-a', 2, 1, 1, false),
                filterModule.addBlockedUid('batch-uid-b', 3, 1, 2, true),
                filterModule.addBlockedUid('batch-uid-c', 4, 2, 2, false)
            ]);

            const firstInFlight = filterModule.addBlockedUid('inflight-uid-a', 5, 2, 3, false);
            await new Promise((resolve) => setTimeout(resolve, 160));
            const secondInFlight = filterModule.addBlockedUid('inflight-uid-b', 6, 3, 3, true);
            await Promise.all([firstInFlight, secondInFlight]);
            await filterModule.flushBlockedUidCache('test-final');

            const snapshot = window.__dcufTestbedGM.snapshot();
            const writes = snapshot.writes.filter((entry) => entry.key === blockedUidsKey).slice(writesBefore);
            return {
                writes,
                cache: JSON.parse(snapshot.values[blockedUidsKey] || '{}'),
                diagnostics: window.__dcufDiagnostics.snapshot()
            };
        }, storageKeys.blockedUids);

        assert.equal(result.writes.length, 3, JSON.stringify(result.writes));
        assert.deepEqual(Object.keys(result.cache).sort(), [
            'batch-uid-a',
            'batch-uid-b',
            'batch-uid-c',
            'inflight-uid-a',
            'inflight-uid-b'
        ]);
        assert.equal(result.cache['inflight-uid-a'].sum, 5);
        assert.equal(result.cache['inflight-uid-b'].ratioBlocked, true);
        assert.equal(result.diagnostics.counters['filter.blockedUidPersist.writes'], 3);
        assert.equal(result.diagnostics.counters['filter.blockedUidPersist.entries'], 5);
        assert.equal(result.diagnostics.gauges['filter.blockedUidPersist.pendingEntries'], 0);
        assert.equal(result.diagnostics.gauges['filter.blockedUidPersist.timerActive'], 0);
        assert.equal(result.diagnostics.gauges['filter.blockedUidPersist.writeActive'], 0);
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

test('mobile blocked UID persistence flushes on hidden and pagehide', 'functional', async ({ browser, server }) => {
    if (isPcUserscript) return;
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/board/view?id=test&no=1001');
        const result = await session.page.evaluate(async (blockedUidsKey) => {
            const filterModule = window.__dcufFilterModule;
            let visibilityState = 'visible';
            Object.defineProperty(document, 'visibilityState', {
                configurable: true,
                get: () => visibilityState
            });
            const writesBefore = window.__dcufTestbedGM.snapshot().writes.filter((entry) => entry.key === blockedUidsKey).length;

            const hiddenWrite = filterModule.addBlockedUid('hidden-flush-uid', 7, 3, 4, false);
            visibilityState = 'hidden';
            document.dispatchEvent(new Event('visibilitychange'));
            await hiddenWrite;
            const hiddenReason = window.__dcufDiagnostics.snapshot().gauges['filter.blockedUidPersist.lastReason'];

            visibilityState = 'visible';
            const pagehideWrite = filterModule.addBlockedUid('pagehide-flush-uid', 8, 4, 4, true);
            window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
            await pagehideWrite;

            const snapshot = window.__dcufTestbedGM.snapshot();
            const writes = snapshot.writes.filter((entry) => entry.key === blockedUidsKey).slice(writesBefore);
            return {
                writes,
                cache: JSON.parse(snapshot.values[blockedUidsKey] || '{}'),
                hiddenReason,
                finalDiagnostics: window.__dcufDiagnostics.snapshot()
            };
        }, storageKeys.blockedUids);

        assert.equal(result.writes.length, 2, JSON.stringify(result.writes));
        assert.equal(Boolean(result.cache['hidden-flush-uid']), true);
        assert.equal(Boolean(result.cache['pagehide-flush-uid']), true);
        assert.equal(result.hiddenReason, 'visibility-hidden');
        assert.equal(result.finalDiagnostics.gauges['filter.blockedUidPersist.lastReason'], 'pagehide');
        assert.equal(result.finalDiagnostics.gauges['filter.blockedUidPersist.pendingEntries'], 0);
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

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

test('boot: document-start 잠금이 필터 대상의 중간 프레임 노출 없이 ready로 끝난다', 'boot', async ({ browser, server }) => {
    const storage = {
        ...noStatsStorage,
        [storageKeys.personalList]: {
            uids: [
                { id: 'blocked-list-user', name: 'blocked list' },
                { id: 'blocked-related-user', name: 'blocked related' },
                { id: 'blocked-image-user', name: 'blocked image' }
            ],
            nicknames: [],
            ips: []
        }
    };
    const session = await createTestPage(browser, server.baseUrl, { storage });
    try {
        await session.goto('/board/view?id=test&no=1001');
        const result = await session.page.evaluate(() => ({
            state: document.documentElement.getAttribute('data-dcuf-boot-state'),
            frames: window.__dcufBootProbe.snapshot(),
            events: window.__dcufBootProbe.events(),
            storageReads: window.__dcufTestbedGM.snapshot().reads.map((entry) => entry.key),
            visibleProtectedTargets: Array.from(document.querySelectorAll('[data-uid=blocked-list-user], [data-uid=blocked-related-user], [data-uid=blocked-image-user]'))
                .map((writer) => writer.closest('tr, li, .custom-post-item'))
                .filter(Boolean)
                .filter((element) => {
                    const style = getComputedStyle(element);
                    const rect = element.getBoundingClientRect();
                    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
                }).length
        }));
        assert.equal(result.state, 'ready');
        assert.equal(result.events.filter((event) => event.type === 'ready').length, 1);
        assert.equal(result.events.some((event) => event.type === 'degraded'), false);
        assert.equal(String(result.events.find((event) => event.type === 'ready')?.reason || '').includes('timeout'), false);
        const lockedFrames = result.frames.filter((frame) => (frame.state === 'locked' || frame.state === 'preparing') && frame.bodyVisibility);
        assert.equal(lockedFrames.length > 0, true);
        assert.equal(lockedFrames.every((frame) => frame.bodyOpacity === '0' && frame.bodyVisibility === 'hidden' && frame.bodyPointerEvents === 'none'), true);
        assert.equal(lockedFrames.every((frame) => frame.visibleProtectedTargets === 0), true);
        assert.equal(Math.max(0, ...result.frames.map((frame) => frame.overlayCount)) <= 1, true);
        assert.equal(result.visibleProtectedTargets, 0);
        [storageKeys.threshold, storageKeys.personalList, storageKeys.personalEnabled, storageKeys.blockedGuests].forEach((key) => {
            assert.equal(result.storageReads.filter((readKey) => readKey === key).length, 1, `boot read count for ${key}`);
        });
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

test('boot: 레거시 차단 설정 마이그레이션은 백업·새 설정·완료 순서를 유지한다', 'boot', async ({ browser, server }) => {
    const legacyIp = Array.from({ length: 100 }, (_, index) => `10.${index}`).join('||');
    const storage = {
        ...noStatsStorage,
        dcinside_block_config_migration_v275_done: false,
        dcinside_block_config: { ip: legacyIp }
    };
    const session = await createTestPage(browser, server.baseUrl, { storage });
    try {
        await session.goto('/board/lists?id=test');
        const writes = await session.page.evaluate(() => window.__dcufTestbedGM.snapshot().writes.filter((entry) => [
            'dcinside_block_config_migration_v275_backup',
            'dcinside_block_config',
            'dcinside_block_config_migration_v275_done'
        ].includes(entry.key)));
        assert.deepEqual(writes.map((entry) => entry.key), [
            'dcinside_block_config_migration_v275_backup',
            'dcinside_block_config',
            'dcinside_block_config_migration_v275_done'
        ]);
        assert.equal(writes[0].value, legacyIp);
        assert.deepEqual(writes[1].value, { ip: '' });
        assert.equal(writes[2].value, true);
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

test('boot: 영구 대기 저장소는 degraded 부분 공개 후 수동 해제 시 ready로 복구된다', 'boot', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, {
        storage: noStatsStorage,
        gmBehavior: { pendingKeys: [storageKeys.threshold] },
        boot: { criticalDeadlineMs: 180, absoluteDeadlineMs: 900 }
    });
    try {
        await session.goto('/board/view?id=test&no=1001', { waitForReady: false });
        await session.page.waitForFunction(() => document.documentElement.getAttribute('data-dcuf-boot-state') === 'degraded', null, { timeout: 3000 });
        const degraded = await session.page.evaluate(() => {
            const article = document.querySelector('.writing_view_box');
            const comments = document.querySelector('#focus_cmt .comment_box');
            const bodyStyle = getComputedStyle(document.body);
            const articleStyle = getComputedStyle(article);
            const commentStyle = getComputedStyle(comments);
            return {
                bannerCount: document.querySelectorAll('#dcuf-degraded-banner').length,
                overlayCount: document.querySelectorAll('#dcuf-boot-overlay').length,
                bodyVisible: bodyStyle.visibility !== 'hidden' && bodyStyle.pointerEvents !== 'none',
                articleVisible: articleStyle.visibility !== 'hidden' && Number(articleStyle.opacity) > 0,
                commentsBlocked: commentStyle.visibility === 'hidden' || Number(commentStyle.opacity) === 0
            };
        });
        assert.deepEqual(degraded, {
            bannerCount: 1,
            overlayCount: 0,
            bodyVisible: true,
            articleVisible: true,
            commentsBlocked: true
        });
        await session.page.evaluate((key) => window.__dcufTestbedGM.release(key), storageKeys.threshold);
        await session.page.waitForFunction(() => document.documentElement.getAttribute('data-dcuf-boot-state') === 'ready', null, { timeout: 6000 });
        const recovered = await session.page.evaluate(() => ({
            events: window.__dcufBootProbe.events(),
            bannerCount: document.querySelectorAll('#dcuf-degraded-banner').length,
            degradedStyleCount: document.querySelectorAll('#dcuf-degraded-filter-style').length
        }));
        assert.deepEqual(recovered.events.map((event) => event.type), ['degraded', 'ready']);
        assert.equal(recovered.events[1].recovered, true);
        assert.equal(recovered.bannerCount, 0);
        assert.equal(recovered.degradedStyleCount, 0);
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

test('boot: 1회 저장소 거부는 degraded 후 제한 재시도로 복구된다', 'boot', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, {
        storage: noStatsStorage,
        gmBehavior: { rejectOnceKeys: [storageKeys.threshold] },
        boot: { criticalDeadlineMs: 500, absoluteDeadlineMs: 1200 }
    });
    try {
        await session.goto('/board/lists?id=test', { waitForReady: false });
        await session.page.waitForFunction(() => document.documentElement.getAttribute('data-dcuf-boot-state') === 'ready', null, { timeout: 6000 });
        const result = await session.page.evaluate(() => ({
            events: window.__dcufBootProbe.events(),
            state: document.documentElement.getAttribute('data-dcuf-boot-state'),
            overlays: document.querySelectorAll('#dcuf-boot-overlay').length,
            banners: document.querySelectorAll('#dcuf-degraded-banner').length,
            mirrorCount: document.querySelectorAll('.custom-post-item').length
        }));
        assert.equal(result.state, 'ready');
        assert.deepEqual(result.events.map((event) => event.type), ['degraded', 'ready']);
        assert.equal(result.events[1].recovered, true);
        assert.equal(result.overlays, 0);
        assert.equal(result.banners, 0);
        assert.equal(result.mirrorCount, isPcUserscript ? 0 : 51);
        const unexpectedConsoleErrors = session.consoleErrors.filter((message) => !message.includes('GM_getValue rejected once') && !message.includes('A critical error occurred during main execution'));
        assertNoRuntimeErrors(await getMetrics(session.page), unexpectedConsoleErrors);
    } finally { await session.close(); }
});

test('boot: 댓글이 0·140·420ms에 들어와도 초기 장벽 뒤 한 번만 공개된다', 'boot', async ({ browser, server }) => {
    const storage = {
        ...noStatsStorage,
        [storageKeys.personalList]: { uids: [{ id: 'blocked-comment-user', name: 'blocked comment' }], nicknames: [], ips: [] }
    };
    const session = await createTestPage(browser, server.baseUrl, {
        storage,
        gmBehavior: { pendingKeys: [storageKeys.threshold] },
        boot: { criticalDeadlineMs: 1600, absoluteDeadlineMs: 2400 }
    });
    try {
        await session.goto('/board/view?id=test&no=1001', { waitForReady: false });
        await session.page.evaluate(() => {
            [0, 140, 420].forEach((delay) => {
                window.setTimeout(() => window.__dcufFixture.addComments(1, { uid: 'blocked-comment-user' }), delay);
            });
        });
        await session.page.waitForTimeout(500);
        await session.page.evaluate((key) => window.__dcufTestbedGM.release(key), storageKeys.threshold);
        await session.page.waitForFunction(() => document.documentElement.getAttribute('data-dcuf-boot-state') === 'ready', null, { timeout: 6000 });
        const result = await session.page.evaluate(() => {
            const writers = Array.from(document.querySelectorAll('[data-uid=blocked-comment-user]'));
            const targets = writers.map((writer) => writer.closest('li')).filter(Boolean);
            const visible = targets.filter((item) => {
                const style = getComputedStyle(item);
                const rect = item.getBoundingClientRect();
                return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
            });
            return {
                count: writers.length,
                visibleCount: visible.length,
                events: window.__dcufBootProbe.events(),
                leakedFrames: window.__dcufBootProbe.snapshot().filter((frame) => frame.state !== 'ready' && frame.visibleProtectedTargets > 0).length
            };
        });
        assert.equal(result.count, 3);
        assert.equal(result.visibleCount, 0);
        assert.equal(result.leakedFrames, 0);
        assert.deepEqual(result.events.map((event) => event.type), ['ready']);
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

test('boot: 야간모드의 시각 테마 판정 실패는 필터 완료 뒤 댓글과 하단 목록을 가리지 않는다', 'boot', async ({ browser, server }) => {
    if (isPcUserscript) return;
    const session = await createTestPage(browser, server.baseUrl, {
        storage: noStatsStorage,
        boot: { revealTimeoutMs: 120, criticalDeadlineMs: 320, absoluteDeadlineMs: 1200, recoveryMaxMs: 300 }
    });
    try {
        await session.goto('/board/view?id=test&no=1001&dark-start=1&broken-theme=1');
        const result = await session.page.evaluate(() => {
            const isVisible = (selector) => {
                const element = document.querySelector(selector);
                if (!(element instanceof HTMLElement)) return false;
                const style = getComputedStyle(element);
                const rect = element.getBoundingClientRect();
                return style.display !== 'none'
                    && style.visibility !== 'hidden'
                    && Number(style.opacity) > 0
                    && rect.width > 0
                    && rect.height > 0;
            };
            return {
                bootState: document.documentElement.getAttribute('data-dcuf-boot-state'),
                filterReady: document.documentElement.getAttribute('data-dcuf-filter-ready'),
                darkStylesheet: Boolean(document.getElementById('css-darkmode')),
                darkClass: document.documentElement.classList.contains('dc-filter-dark-mode')
                    && document.body.classList.contains('dc-filter-dark-mode'),
                commentVisible: isVisible('#comment_wrap_1 .comment_box'),
                listVisible: isVisible('.view_bottom .gall_listwrap'),
                degradedBannerCount: document.querySelectorAll('#dcuf-degraded-banner').length,
                degradedStyleCount: document.querySelectorAll('#dcuf-degraded-filter-style').length,
                events: window.__dcufBootProbe.events(),
                revealDebug: window.__dcufRevealDebug || null,
                viewThemeDebug: window.__dcufPhase1ViewTheme?.getDebugState?.() || null
            };
        });
        assert.equal(result.bootState, 'ready', JSON.stringify(result));
        assert.equal(result.filterReady, 'true', JSON.stringify(result));
        assert.equal(result.darkStylesheet, true);
        assert.equal(result.darkClass, true);
        assert.equal(result.commentVisible, true, JSON.stringify(result));
        assert.equal(result.listVisible, true, JSON.stringify(result));
        assert.equal(result.degradedBannerCount, 0);
        assert.equal(result.degradedStyleCount, 0);
        assert.deepEqual(result.events.map((event) => event.type), ['ready'], JSON.stringify(result.events));
        assert.equal(result.events[0]?.reason, 'ready:filtered-native-style-fallback', JSON.stringify(result.events));
        assert.equal(result.revealDebug?.initial?.reason, 'waiting-style', JSON.stringify(result.revealDebug));
        assert.equal(result.revealDebug?.initial?.fallback, 'filtered-native-style', JSON.stringify(result.revealDebug));
        assert.equal(result.viewThemeDebug?.lastFailureReason, 'missing-head-elevation', JSON.stringify(result.viewThemeDebug));
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

test('boot: 목록 준비 실패는 이동 DOM과 인라인 상태를 롤백한 뒤 재시도로 복구한다', 'boot', async ({ browser, server }) => {
    if (isPcUserscript) return;
    const session = await createTestPage(browser, server.baseUrl, {
        storage: noStatsStorage,
        boot: { failListPrepareOnce: true, recoveryRetryDelayMs: 1400, recoveryWatchDelayMs: 1200, criticalDeadlineMs: 1600, absoluteDeadlineMs: 3000 }
    });
    try {
        await session.goto('/board/lists?id=test', { waitForReady: false });
        await session.page.waitForFunction(() => document.documentElement.getAttribute('data-dcuf-boot-state') === 'degraded');
        const rolledBack = await session.page.evaluate(() => {
            const listWrap = document.querySelector('.gall_listwrap.list');
            const table = listWrap?.querySelector('table.gall_list');
            const paging = document.querySelector('.bottom_paging_box');
            const search = document.querySelector('form[name=frmSearch]');
            return {
                customLists: document.querySelectorAll('.custom-mobile-list').length,
                bottomControls: document.querySelectorAll('.custom-bottom-controls').length,
                transformed: listWrap?.hasAttribute('data-ui-transformed') || false,
                tableInlineDisplay: table?.style.getPropertyValue('display') || '',
                pagingRestored: paging?.parentElement?.classList.contains('bottom_paging_wrap') || false,
                searchInCustomControls: Boolean(search?.closest('.custom-bottom-controls'))
            };
        });
        assert.deepEqual(rolledBack, {
            customLists: 0,
            bottomControls: 0,
            transformed: false,
            tableInlineDisplay: '',
            pagingRestored: true,
            searchInCustomControls: false
        });
        await session.page.waitForFunction(() => document.documentElement.getAttribute('data-dcuf-boot-state') === 'ready', null, { timeout: 6000 });
        assert.equal(await session.page.locator('.custom-mobile-list').count(), 1);
        assert.equal(await session.page.locator('.custom-bottom-controls').count(), 1);
        const unexpectedConsoleErrors = session.consoleErrors.filter((message) => !message.includes('testbed list prepare failure') && !message.includes('A critical error occurred during main execution'));
        assertNoRuntimeErrors(await getMetrics(session.page), unexpectedConsoleErrors);
    } finally { await session.close(); }
});

test('boot: body 교체 후 mutation bus가 새 body에 재연결되고 필터 구독자를 보존한다', 'boot', async ({ browser, server }) => {
    if (isPcUserscript) return;
    const storage = {
        ...noStatsStorage,
        [storageKeys.personalList]: { uids: [{ id: 'blocked-list-user', name: 'blocked list' }], nicknames: [], ips: [] }
    };
    const session = await createTestPage(browser, server.baseUrl, { storage });
    try {
        await session.goto('/board/lists?id=test');
        const before = await getMetrics(session.page);
        const beforeSubscribers = await session.page.evaluate(() => Array.from(window.__dcufRuntimeCoordinator?._mutationSubscribers?.keys?.() || []));
        await session.page.evaluate(() => {
            const replacement = document.createElement('body');
            replacement.dataset.fixturePage = 'list';
            replacement.innerHTML = `<div class='list_wrap'><main id='container'><article><section class='gall_listwrap list'><table class='gall_list'><tbody class='listwrap2'><tr class='ub-content us-post' data-no='9999' data-type='icon_txt'><td class='gall_num'>9999</td><td class='gall_tit'><a href='#'>replacement</a></td><td><span class='gall_writer ub-writer' data-uid='blocked-list-user' data-nick='blocked'></span></td><td class='gall_date'>now</td><td class='gall_count'>0</td><td class='gall_recommend'>0</td></tr></tbody></table></section></article></main></div>`;
            document.documentElement.replaceChild(replacement, document.body);
        });
        await session.page.waitForFunction(() => window.__dcufRuntimeCoordinator?._mutationObserverTarget === document.body && document.querySelector('.custom-mobile-list'));
        await session.page.waitForFunction(() => {
            const writer = document.querySelector('[data-uid=blocked-list-user]');
            const item = writer?.closest('tr, .custom-post-item');
            return item && getComputedStyle(item).display === 'none';
        });
        const after = await getMetrics(session.page);
        const afterSubscribers = await session.page.evaluate(() => Array.from(window.__dcufRuntimeCoordinator?._mutationSubscribers?.keys?.() || []));
        assert.equal(beforeSubscribers.includes('filter-universal-observer'), true, JSON.stringify(beforeSubscribers));
        assert.equal(afterSubscribers.includes('filter-universal-observer'), true, JSON.stringify(afterSubscribers));
        assert.equal(afterSubscribers.includes('ui-list-runtime'), true, JSON.stringify(afterSubscribers));
        assert.equal(after.dcuf.gauges['mutation.subscribers'], afterSubscribers.length);
        assert.equal(after.mutationObserversCreated - before.mutationObserversCreated <= 2, true);
        assert.equal(await session.page.locator('#dcuf-boot-overlay').count(), 0);
        assert.equal(await session.page.locator('.custom-mobile-list').count(), isPcUserscript ? 0 : 1);
        assertNoRuntimeErrors(after, session.consoleErrors);
    } finally { await session.close(); }
});

test('boot: iframe 재주입은 런타임과 오버레이를 만들지 않는다', 'boot', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/board/lists?id=test');
        await session.page.evaluate(() => {
            const frame = document.createElement('iframe');
            frame.id = 'dcuf-runtime-frame';
            frame.srcdoc = '<!doctype html><html><head></head><body><main>frame</main></body></html>';
            document.body.appendChild(frame);
        });
        await session.page.waitForFunction(() => document.querySelector('#dcuf-runtime-frame')?.contentDocument?.readyState === 'complete');
        const childFrame = session.page.frames().find((frame) => frame !== session.page.mainFrame());
        assert.equal(Boolean(childFrame), true);
        const userscript = (await readFile(await resolveBuiltUserscript(), 'utf8')).replace(/^\uFEFF/, '');
        await childFrame.addScriptTag({ content: userscript });
        const childState = await childFrame.evaluate(() => ({
            controller: Boolean(window.__dcufBootController),
            overlayCount: document.querySelectorAll('#dcuf-boot-overlay').length,
            readyClass: document.documentElement.classList.contains('script-ui-ready'),
            postMainState: window.__dcufPostMainFixesState || ''
        }));
        assert.deepEqual(childState, { controller: false, overlayCount: 0, readyClass: false, postMainState: '' });
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

test('smoke: 목록과 본문에서 실제 사용자 스크립트가 초기화된다', 'smoke', async ({ browser, server }) => {
    const list = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await list.goto('/board/lists?id=test');
        assert.equal(await list.page.locator('.custom-post-item').count(), isPcUserscript ? 0 : 51);
        const tableDisplay = await list.page.locator('table.gall_list').evaluate((element) => getComputedStyle(element).display);
        assert.equal(tableDisplay, isPcUserscript ? 'table' : 'none');
        assert.equal(await list.page.locator('#dc-personal-block-fab').count(), 1);
        const metrics = await getMetrics(list.page);
        if (isPcUserscript) {
            assert.equal(await list.page.evaluate(() => Boolean(window.__dcufFilterModule)), true);
        } else {
            assert.equal(metrics.dcuf.gauges['mutation.subscribers'] > 0, true);
        }
        assertNoRuntimeErrors(metrics, list.consoleErrors);
    } finally { await list.close(); }

    const view = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await view.goto('/board/view?id=test&no=1001');
        assert.equal(await view.page.locator('#comment_wrap_1 .cmt_list > li').count(), 4);
        assert.equal(await view.page.locator('.img_comment.fold.getMoreComment .view_comment.image_comment .comment_box.img_comment_box[data-imgno] .cmt_list.add > li').count(), 2);
        assert.equal(await view.page.locator('.gall_exposure_list > ul > li').count(), 2);
        assert.equal(await view.page.locator('.fixture-view-list tr.ub-content').count(), 51);
        assert.equal(await view.page.locator('.fixture-view-list .custom-post-item').count(), isPcUserscript ? 0 : 51);
        assertNoRuntimeErrors(await getMetrics(view.page), view.consoleErrors);
    } finally { await view.close(); }

    const minorList = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await minorList.goto('/mgallery/board/lists?id=test');
        assert.equal(await minorList.page.locator('table.gall_list tr.ub-content').count(), 53);
        assert.equal(await minorList.page.locator('.custom-post-item').count(), isPcUserscript ? 0 : 53);
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

test('page context registers only the runtime subscribers owned by each surface', 'functional', async ({ browser, server }) => {
    if (isPcUserscript) return;
    const cases = [
        {
            pathname: '/board/lists?id=test',
            type: 'lists',
            subscribers: ['filter-universal-observer', 'ui-list-runtime', 'header-drawer', 'list-memo-popup'],
            excluded: ['reply-merge', 'comment-typography', 'runtime-article-ad-cleanup', 'ui-write-headtext-tip-position'],
            immediate: []
        },
        {
            pathname: '/board/view?id=test&no=1001',
            type: 'view',
            subscribers: ['filter-universal-observer', 'ui-list-runtime', 'reply-merge', 'comment-typography', 'runtime-article-ad-cleanup', 'list-memo-popup'],
            excluded: ['header-drawer', 'ui-write-headtext-tip-position'],
            immediate: ['filter-immediate-comment-visibility', 'ui-view-bottom-list-visibility']
        },
        {
            pathname: '/board/write/?id=test',
            type: 'write',
            subscribers: ['ui-write-editor-layer-position'],
            excluded: ['filter-universal-observer', 'ui-list-runtime', 'reply-merge', 'header-drawer', 'list-memo-popup'],
            immediate: []
        },
        {
            pathname: '/unrelated',
            type: 'other',
            subscribers: [],
            excluded: ['filter-universal-observer', 'ui-list-runtime', 'reply-merge', 'header-drawer', 'list-memo-popup', 'ui-write-headtext-tip-position'],
            immediate: []
        }
    ];

    for (const expected of cases) {
        const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
        try {
            await session.goto(expected.pathname, { waitForReady: expected.type !== 'other' });
            const state = await session.page.evaluate(() => ({
                context: window.__dcufPageContext,
                subscribers: Array.from(window.__dcufRuntimeCoordinator?._mutationSubscribers?.keys?.() || []),
                immediate: Array.from(window.__dcufRuntimeCoordinator?._immediateMutationSubscribers?.keys?.() || []),
                contextAttr: document.documentElement.getAttribute('data-dcuf-page-context'),
                phase1ListStyles: document.querySelectorAll('#dcuf-phase1-list-theme').length,
                paletteStyles: document.querySelectorAll('#dcuf-mobile-palette-style').length,
                bootState: document.documentElement.getAttribute('data-dcuf-boot-state')
            }));
            assert.equal(state.context?.type, expected.type, JSON.stringify(state));
            assert.equal(state.contextAttr, expected.type, JSON.stringify(state));
            expected.subscribers.forEach((key) => assert.equal(state.subscribers.includes(key), true, `${expected.type}: missing ${key}; ${JSON.stringify(state.subscribers)}`));
            expected.excluded.forEach((key) => assert.equal(state.subscribers.includes(key), false, `${expected.type}: unexpected ${key}; ${JSON.stringify(state.subscribers)}`));
            assert.deepEqual(state.immediate.sort(), expected.immediate.slice().sort(), `${expected.type}: ${JSON.stringify(state.immediate)}`);
            if (expected.type === 'other') {
                assert.equal(state.phase1ListStyles, 0, JSON.stringify(state));
                assert.equal(state.paletteStyles, 0, JSON.stringify(state));
                assert.equal(state.bootState, null, JSON.stringify(state));
            }
            assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
        } finally { await session.close(); }
    }
});

test('filter UI CSS stays lazy until the first interactive surface opens', 'functional', async ({ browser, server }) => {
    if (isPcUserscript) return;
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/board/view?id=test&no=1001');
        const before = await session.page.evaluate(() => ({
            loaded: window.__dcufFilterUiStylesLoaded,
            styleCount: window.__dcufTestbedGM.snapshot().styleCount,
            hasSettingsCss: Array.from(document.querySelectorAll('style[data-dcuf-testbed-gm-style="1"]'))
                .some((style) => style.textContent.includes('#dcinside-filter-setting')),
            lazyLoads: window.__dcufDiagnostics?.snapshot?.().counters?.['style.filterUi.lazyLoads'] || 0
        }));
        assert.deepEqual({ loaded: before.loaded, hasSettingsCss: before.hasSettingsCss, lazyLoads: before.lazyLoads }, {
            loaded: false,
            hasSettingsCss: false,
            lazyLoads: 0
        });

        await session.page.locator('#dc-personal-block-fab').click();
        const afterOpen = await session.page.evaluate(() => ({
            loaded: window.__dcufFilterUiStylesLoaded,
            styleCount: window.__dcufTestbedGM.snapshot().styleCount,
            hasSettingsCss: Array.from(document.querySelectorAll('style[data-dcuf-testbed-gm-style="1"]'))
                .some((style) => style.textContent.includes('#dcinside-filter-setting')),
            lazyLoads: window.__dcufDiagnostics?.snapshot?.().counters?.['style.filterUi.lazyLoads'] || 0
        }));
        assert.equal(afterOpen.loaded, true);
        assert.equal(afterOpen.hasSettingsCss, true);
        assert.equal(afterOpen.lazyLoads, 1);
        assert.equal(afterOpen.styleCount, before.styleCount + 1);

        await session.page.locator('#dc-personal-block-fab').click();
        await session.page.locator('#dc-personal-block-fab').click();
        const afterRepeat = await session.page.evaluate(() => ({
            styleCount: window.__dcufTestbedGM.snapshot().styleCount,
            lazyLoads: window.__dcufDiagnostics?.snapshot?.().counters?.['style.filterUi.lazyLoads'] || 0
        }));
        assert.deepEqual(afterRepeat, { styleCount: afterOpen.styleCount, lazyLoads: 1 });
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

test('mutation bus skips irrelevant attributes and caches repeated payload searches', 'functional', async ({ browser, server }) => {
    if (isPcUserscript) return;
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/board/view?id=test&no=1001');
        await session.page.evaluate(() => {
            const noise = document.createElement('aside');
            noise.id = 'dcuf-fixture-irrelevant-churn';
            document.body.appendChild(noise);
        });
        await waitForSettled(session.page, 120);
        await session.page.evaluate(() => {
            window.__dcufDiagnostics.reset();
            const noise = document.getElementById('dcuf-fixture-irrelevant-churn');
            for (let index = 0; index < 80; index += 1) {
                const child = document.createElement('span');
                child.textContent = `irrelevant-${index}`;
                noise.appendChild(child);
                child.remove();
            }
            for (let index = 0; index < 120; index += 1) {
                noise.className = `noise-${index}`;
                noise.style.width = `${index}px`;
            }
        });
        await waitForSettled(session.page, 120);
        const churn = await getDiagnostics(session.page);
        assert.equal((churn.counters['mutation.rawRecords'] || 0) >= 200, true, JSON.stringify(churn.counters));
        assert.equal(churn.counters['mutation.skippedRecords'], churn.counters['mutation.rawRecords']);
        assert.equal(churn.counters['mutation.records'] || 0, 0);
        assert.equal(churn.counters['mutation.dispatches'] || 0, 0);
        assert.equal(churn.counters['mutation.immediateDispatches'] || 0, 0);

        const payloadContract = await session.page.evaluate(() => {
            window.__dcufDiagnostics.reset();
            const coordinator = window.__dcufRuntimeCoordinator;
            const target = document.querySelector('#comment_wrap_1 .comment_box');
            const payload = coordinator.buildMutationPayload([{
                type: 'childList',
                target,
                addedNodes: [],
                removedNodes: []
            }]);
            const first = payload.collectMatches('.comment_box', { includeRoots: true });
            const second = payload.collectMatches('.comment_box', { includeRoots: true });
            const identityRecord = { type: 'attributes', attributeName: 'data-uid', target: target.querySelector('.ub-writer') };
            const classRecord = { type: 'attributes', attributeName: 'class', target };
            const listTarget = document.querySelector('.view_bottom table.gall_list tbody');
            const listRecord = { type: 'childList', target: listTarget, addedNodes: [document.createElement('tr')], removedNodes: [] };
            const identityClassification = coordinator.classifyImmediateMutationRecords([identityRecord]);
            const classClassification = coordinator.classifyImmediateMutationRecords([classRecord]);
            const listClassification = coordinator.classifyImmediateMutationRecords([listRecord]);
            return {
                firstCount: first.length,
                secondCount: second.length,
                sameElement: first[0] === second[0],
                cacheCounters: window.__dcufDiagnostics.snapshot().counters,
                immediateIdentityCount: identityClassification.comments.length,
                immediateIdentityListCount: identityClassification.viewBottomList.length,
                immediateClassCount: classClassification.all.length,
                immediateListCount: listClassification.viewBottomList.length,
                immediateListCommentCount: listClassification.comments.length
            };
        });
        assert.deepEqual({
            firstCount: payloadContract.firstCount,
            secondCount: payloadContract.secondCount,
            sameElement: payloadContract.sameElement,
            immediateIdentityCount: payloadContract.immediateIdentityCount,
            immediateIdentityListCount: payloadContract.immediateIdentityListCount,
            immediateClassCount: payloadContract.immediateClassCount,
            immediateListCount: payloadContract.immediateListCount,
            immediateListCommentCount: payloadContract.immediateListCommentCount
        }, {
            firstCount: 1,
            secondCount: 1,
            sameElement: true,
            immediateIdentityCount: 1,
            immediateIdentityListCount: 0,
            immediateClassCount: 0,
            immediateListCount: 1,
            immediateListCommentCount: 0
        });
        assert.equal(payloadContract.cacheCounters['mutation.collectMatches.cacheMisses'], 1);
        assert.equal(payloadContract.cacheCounters['mutation.collectMatches.cacheHits'], 1);
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

mobileTest('mini view bottom buttons remain clickable above article overlays', 'functional', async ({ browser, server }) => {
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

test('comment add edit delete and detached replies stay root-scoped and filtered', 'functional', async ({ browser, server }) => {
    if (isPcUserscript) return;
    const blockedUids = ['blocked-parent-dynamic', 'blocked-edit-dynamic', 'blocked-added-dynamic'];
    const session = await createTestPage(browser, server.baseUrl, {
        storage: {
            ...noStatsStorage,
            [storageKeys.personalList]: {
                uids: blockedUids.map((id) => ({ id, name: id })),
                nicknames: [],
                ips: []
            }
        }
    });
    try {
        await session.goto('/board/view?id=test&no=1001');
        await session.page.evaluate(() => window.__dcufDiagnostics.reset());
        await session.page.evaluate(() => {
            const mount = document.createElement('section');
            mount.id = 'fixture-detached-reply-merge';
            mount.innerHTML = `
                <div id="comment_wrap_88001" class="gall_comment comment_wrap show"><div class="comment_box"><ul class="cmt_list add">
                    <li id="comment_li_88001" class="ub-content" data-no="88001">
                        <div class="cmt_info"><div class="cmt_nickbox"><span class="gall_writer ub-writer" data-uid="blocked-parent-dynamic" data-nick="blocked parent"><span class="nickname"><em>blocked parent</em></span></span></div></div>
                        <div class="cmt_txtbox"><p class="usertxt ub-word">blocked parent body</p></div>
                    </li>
                    <li id="reply_empty_last_li_88001" class="ub-content">
                        <div class="reply show"><div class="reply_box"><ul class="reply_list" p-no="88001">
                            <li id="reply_li_88001_1" class="ub-content"><div class="reply_info"><div class="cmt_nickbox"><span class="gall_writer ub-writer" data-uid="safe-root-scoped-reply" data-nick="safe reply"></span></div></div><div class="cmt_txtbox">safe reply body</div></li>
                        </ul></div></div>
                    </li>
                </ul></div></div>
            `;
            document.querySelector('#focus_cmt').after(mount);
        });
        await waitForSettled(session.page, 500);
        const mergedState = await session.page.locator('#comment_li_88001').evaluate((parent) => ({
            ownInfoDisplay: getComputedStyle(parent.querySelector(':scope > .cmt_info')).display,
            replyDisplay: parent.querySelector('#reply_li_88001_1') ? getComputedStyle(parent.querySelector('#reply_li_88001_1')).display : 'missing',
            shell: parent.getAttribute('data-dcuf-comment-shell-blocked'),
            parentDisplay: parent.style.display,
            merged: Boolean(parent.querySelector(':scope > .reply.show #reply_li_88001_1')),
            wrapperPresent: Boolean(document.getElementById('reply_empty_last_li_88001'))
        }));
        const mergeDiagnostics = await getDiagnostics(session.page);
        assert.equal(mergedState.merged, true, JSON.stringify({ mergedState, counters: mergeDiagnostics.counters, gauges: mergeDiagnostics.gauges }));
        assert.equal(mergedState.wrapperPresent, false);
        assert.equal(mergedState.ownInfoDisplay, 'none');
        assert.equal(mergedState.replyDisplay, 'list-item');
        assert.equal(mergedState.shell, '1');
        assert.equal(mergedState.parentDisplay, '');

        const editFrames = await session.page.evaluate(async () => {
            const item = document.getElementById('comment_li_3');
            const writer = item.querySelector('.ub-writer');
            writer.setAttribute('data-uid', 'blocked-edit-dynamic');
            writer.setAttribute('data-nick', 'blocked edit');
            const frames = [];
            for (let index = 0; index < 3; index += 1) {
                await new Promise((resolve) => requestAnimationFrame(resolve));
                frames.push(item.style.display);
            }
            return frames;
        });
        assert.equal(editFrames.every((display) => display === 'none'), true, JSON.stringify(editFrames));
        await session.page.locator('#comment_li_3').evaluate((item) => item.remove());
        await waitForSettled(session.page, 180);
        assert.equal(await session.page.locator('#comment_li_3').count(), 0);

        const addFrames = await session.page.evaluate(async () => {
            window.__dcufFixture.addComments(1, { uid: 'blocked-added-dynamic', nick: 'blocked added' });
            const item = document.querySelector('[data-uid="blocked-added-dynamic"]')?.closest('li');
            const frames = [];
            for (let index = 0; index < 3; index += 1) {
                await new Promise((resolve) => requestAnimationFrame(resolve));
                frames.push(item?.style.display || 'missing');
            }
            return frames;
        });
        assert.equal(addFrames.every((display) => display === 'none'), true, JSON.stringify(addFrames));
        await waitForSettled(session.page, 220);
        const diagnostics = await getDiagnostics(session.page);
        assert.equal(diagnostics.counters['filter.fullRefilter.runs'] || 0, 0);
        assert.equal((diagnostics.counters['filter.syncPass.comments.runs'] || 0) <= 3, true, JSON.stringify(diagnostics.counters));
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

test('focus comment reply composer collapse clears merged card state', 'functional', async ({ browser, server }) => {
    if (isPcUserscript) return;

    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/board/view?id=test&no=1001');
        await session.page.evaluate(() => {
            const parent = document.querySelector('#comment_li_3');
            if (!(parent instanceof HTMLElement)) throw new Error('focus comment fixture parent missing');

            const placeholder = document.createElement('li');
            placeholder.id = 'reply_empty_last_li_3';
            placeholder.innerHTML = '<div class="reply show"><div class="reply_box"><ul class="reply_list" p-no="3"><li id="reply_li_3_1" class="ub-content"><div class="reply_info">reply composer fixture</div></li></ul></div></div>';
            parent.after(placeholder);
        });

        await session.page.waitForFunction(() => {
            const parent = document.querySelector('#comment_li_3');
            const placeholder = document.querySelector('#reply_empty_last_li_3');
            return parent?.getAttribute('data-dcuf-focus-group-parent') === '1'
                && Boolean(parent.style.getPropertyValue('--dcuf-focus-group-extend'))
                && placeholder?.getAttribute('data-dcuf-focus-group-reply') === '1';
        });

        await session.page.locator('#reply_empty_last_li_3').evaluate((placeholder) => placeholder.replaceChildren());
        await session.page.waitForFunction(() => {
            const parent = document.querySelector('#comment_li_3');
            const placeholder = document.querySelector('#reply_empty_last_li_3');
            return !parent?.hasAttribute('data-dcuf-focus-group-parent')
                && !parent?.style.getPropertyValue('--dcuf-focus-group-extend')
                && !placeholder?.hasAttribute('data-dcuf-focus-group-reply');
        });

        const closedState = await session.page.locator('#reply_empty_last_li_3').evaluate((placeholder) => ({
            childCount: placeholder.childElementCount,
            text: placeholder.textContent.trim(),
            groupReply: placeholder.hasAttribute('data-dcuf-focus-group-reply')
        }));
        assert.deepEqual(closedState, { childCount: 0, text: '', groupReply: false });
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

test('mobile list navigation uses integrated raised toolbar and control cards', 'functional', async ({ browser, server }) => {
    if (isPcUserscript) return;

    const cases = [
        { path: '/board/lists?id=test', viewport: { width: 390, height: 844 } },
        { path: '/board/lists?id=test', viewport: { width: 1280, height: 900 } },
        { path: '/mgallery/board/lists?id=test', viewport: { width: 1280, height: 900 } }
    ];

    for (const testCase of cases) {
        const session = await createTestPage(browser, server.baseUrl, {
            storage: noStatsStorage,
            viewport: testCase.viewport,
            hasTouch: testCase.viewport.width <= 640,
            isMobile: testCase.viewport.width <= 640
        });
        try {
            await session.goto(testCase.path);
            await session.page.waitForSelector('.custom-bottom-controls[data-dcuf-controls-ready="1"]');

            const layout = await session.page.evaluate(() => {
                const rect = (selector) => {
                    const element = document.querySelector(selector);
                    if (!(element instanceof HTMLElement)) return null;
                    const box = element.getBoundingClientRect();
                    const style = getComputedStyle(element);
                    return {
                        left: box.left,
                        right: box.right,
                        width: box.width,
                        height: box.height,
                        display: style.display,
                        radius: Number.parseFloat(style.borderRadius) || 0,
                        background: style.backgroundImage,
                        backgroundColor: style.backgroundColor,
                        color: style.color,
                        shadow: style.boxShadow
                    };
                };
                const toolbarElement = document.querySelector('.list_array_option');
                const toolbarRight = document.querySelector('.list_array_option > .right_box');
                const toolbarBox = toolbarElement?.getBoundingClientRect();
                const toolbarRightBox = toolbarRight?.getBoundingClientRect();
                const tabTops = Array.from(document.querySelectorAll('.list_array_option .array_tab li'))
                    .map((element) => Math.round(element.getBoundingClientRect().top));
                const visibleSearchTypeControls = Array.from(document.querySelectorAll(
                    '.dcuf-search-card select[name="search_type"], .dcuf-search-card .select_box.bottom_array'
                )).filter((element) => {
                    const style = getComputedStyle(element);
                    return style.display !== 'none' && style.visibility !== 'hidden';
                }).length;
                const pagingIcons = Array.from(document.querySelectorAll(
                    '.dcuf-pagination-card .bottom_paging_box > a.sp_pagingicon'
                ));
                const searchLeft = document.querySelector('.dcuf-search-card .search_left_box')?.getBoundingClientRect();
                const searchRight = document.querySelector('.dcuf-search-card .search_right_box')?.getBoundingClientRect();
                const searchOuter = document.querySelector('.dcuf-search-card .bottom_search');
                const searchButtonElement = document.querySelector('.dcuf-search-card .bnt_search');
                const searchButtonBefore = searchButtonElement ? getComputedStyle(searchButtonElement, '::before') : null;
                const searchButtonAfter = searchButtonElement ? getComputedStyle(searchButtonElement, '::after') : null;
                const pagingBox = document.querySelector('.dcuf-pagination-card .bottom_paging_box');
                const pagingTops = Array.from(pagingBox?.children || [])
                    .filter((element) => element instanceof HTMLElement)
                    .map((element) => Math.round(element.getBoundingClientRect().top));
                const actionCard = document.querySelector('.dcuf-bottom-action-card');
                const actionRight = actionCard?.querySelector('.fr, .right_box');
                const actionCardBox = actionCard?.getBoundingClientRect();
                const actionRightBox = actionRight?.getBoundingClientRect();

                return {
                    toolbar: rect('.list_array_option'),
                    action: rect('.dcuf-bottom-action-card'),
                    pagination: rect('.dcuf-pagination-card'),
                    search: rect('.dcuf-search-card'),
                    select: rect('.dcuf-search-card select[name="search_type"]'),
                    searchButton: rect('.dcuf-search-card .bnt_search'),
                    topCount: rect('.list_array_option .array_num'),
                    topWrite: rect('.list_array_option .btn_write'),
                    toolbarRightPosition: toolbarRight ? getComputedStyle(toolbarRight).position : '',
                    toolbarRightContained: Boolean(toolbarBox && toolbarRightBox && toolbarRightBox.left >= toolbarBox.left - 1 && toolbarRightBox.right <= toolbarBox.right + 1 && toolbarRightBox.bottom <= toolbarBox.bottom + 1),
                    tabRowSpread: tabTops.length ? Math.max(...tabTops) - Math.min(...tabTops) : 0,
                    visibleSearchTypeControls,
                    searchColumnsDoNotOverlap: Boolean(searchLeft && searchRight && (searchLeft.right <= searchRight.left + 1 || searchLeft.bottom <= searchRight.top + 1)),
                    pagingIconCount: pagingIcons.length,
                    pagingItemCount: pagingTops.length,
                    pagingRowSpread: pagingTops.length ? Math.max(...pagingTops) - Math.min(...pagingTops) : 0,
                    pagingOverflowX: pagingBox ? getComputedStyle(pagingBox).overflowX : '',
                    pagingIconsReset: pagingIcons.every((element) => {
                        const style = getComputedStyle(element);
                        return style.backgroundImage === 'none' && style.textIndent === '0px' && element.getBoundingClientRect().height >= 38;
                    }),
                    searchOuterBorderWidth: searchOuter ? Number.parseFloat(getComputedStyle(searchOuter).borderTopWidth) || 0 : -1,
                    searchOuterBackground: searchOuter ? getComputedStyle(searchOuter).backgroundColor : '',
                    searchButtonSpriteReset: searchButtonElement ? getComputedStyle(searchButtonElement).backgroundImage === 'none' : false,
                    searchButtonIconReady: Boolean(
                        searchButtonBefore
                        && searchButtonAfter
                        && searchButtonBefore.content === '""'
                        && searchButtonAfter.content === '""'
                        && Number.parseFloat(searchButtonBefore.width) >= 15
                        && Number.parseFloat(searchButtonAfter.width) >= 8
                    ),
                    actionRightGap: actionCardBox && actionRightBox ? actionCardBox.right - actionRightBox.right : -1,
                    hostSiblingControlCount: document.querySelectorAll('#container article > .list_bottom_btnbox, #container article > form[name="frmSearch"], #container article > .bottom_paging_wrap > .bottom_paging_box, #container article > .bottom_paging_wrap > .bottom_movebox').length,
                    formCount: document.querySelectorAll('form[name="frmSearch"]').length,
                    nestedFormCount: document.querySelectorAll('.dcuf-search-card form[name="frmSearch"]').length,
                    pageLinkHref: document.querySelector('.dcuf-pagination-card .bottom_paging_box a')?.getAttribute('href') || '',
                    horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
                };
            });

            assert.equal(Boolean(layout.toolbar && layout.action && layout.pagination && layout.search), true);
            assert.equal(layout.toolbar.display, 'flex');
            assert.equal(layout.pagination.display, 'flex');
            assert.equal(layout.toolbar.radius >= 14, true);
            assert.equal(layout.search.radius >= 14, true);
            assert.notEqual(layout.toolbar.backgroundColor, 'rgba(0, 0, 0, 0)');
            assert.notEqual(layout.search.shadow, 'none');
            assert.equal(layout.formCount, 1);
            assert.equal(layout.nestedFormCount, 1);
            assert.equal(layout.pageLinkHref.includes('page='), true);
            assert.equal(layout.select.height >= 44, true);
            assert.equal(layout.searchButton.height >= 44, true, JSON.stringify(layout));
            assert.equal(layout.topCount.width >= 70 && layout.topCount.height >= 42, true, JSON.stringify(layout));
            assert.equal(layout.topWrite.height >= 44 && layout.topWrite.radius >= 10, true, JSON.stringify(layout));
            assert.equal(layout.topWrite.background.includes('linear-gradient'), true, JSON.stringify(layout));
            assert.equal(layout.topWrite.color, 'rgb(255, 255, 255)', JSON.stringify(layout));
            assert.equal(layout.horizontalOverflow <= 1, true);
            assert.equal(layout.toolbarRightPosition, 'static', JSON.stringify(layout));
            assert.equal(layout.toolbarRightContained, true, JSON.stringify(layout));
            assert.equal(layout.tabRowSpread <= 1, true, JSON.stringify(layout));
            assert.equal(layout.visibleSearchTypeControls, 1, JSON.stringify(layout));
            assert.equal(layout.searchColumnsDoNotOverlap, true, JSON.stringify(layout));
            assert.equal(layout.pagingIconCount, 4, JSON.stringify(layout));
            assert.equal(layout.pagingItemCount, 19, JSON.stringify(layout));
            assert.equal(layout.pagingRowSpread <= 1, true, JSON.stringify(layout));
            assert.equal(layout.pagingOverflowX, 'auto', JSON.stringify(layout));
            assert.equal(layout.pagingIconsReset, true, JSON.stringify(layout));
            assert.equal(layout.searchOuterBorderWidth, 0, JSON.stringify(layout));
            assert.equal(layout.searchOuterBackground, 'rgba(0, 0, 0, 0)', JSON.stringify(layout));
            assert.equal(layout.searchButtonSpriteReset, true, JSON.stringify(layout));
            assert.equal(layout.searchButtonIconReady, true, JSON.stringify(layout));
            if (testCase.viewport.width > 640) {
                assert.equal(layout.actionRightGap >= 0 && layout.actionRightGap <= 12, true, JSON.stringify(layout));
            }
            assert.equal(layout.hostSiblingControlCount, 0, JSON.stringify(layout));

            await session.page.locator('#dcuf-testbed-controls').evaluate((controls) => { controls.style.display = 'none'; });
            await session.page.locator('.list_array_option .btn_write').click();
            await session.page.locator('.dcuf-bottom-action-card .write').click();
            await session.page.locator('.dcuf-search-card .bnt_search').click();
            assert.equal(await session.page.evaluate(() => window.__fixtureWriteClicks || 0), 2);
            assert.equal(await session.page.evaluate(() => window.__fixtureSearchClicks || 0), 1);

            const lightBackground = layout.search.backgroundColor;
            await session.page.evaluate(() => window.__dcufFixture.toggleDark(true));
            const darkState = await session.page.evaluate(() => {
                const card = getComputedStyle(document.querySelector('.dcuf-search-card'));
                const input = getComputedStyle(document.querySelector('.dcuf-search-card input[type="text"]'));
                const probe = document.createElement('span');
                probe.style.cssText = 'position:fixed;visibility:hidden;background:var(--dcuf-theme-surface-input)';
                document.body.appendChild(probe);
                const expectedInputBackground = getComputedStyle(probe).backgroundColor;
                probe.remove();
                return { background: card.backgroundColor, inputBackground: input.backgroundColor, expectedInputBackground };
            });
            assert.notEqual(darkState.background, lightBackground);
            assert.equal(darkState.inputBackground, darkState.expectedInputBackground);
            assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
        } finally { await session.close(); }
    }
    const viewSession = await createTestPage(browser, server.baseUrl, {
        storage: noStatsStorage,
        viewport: { width: 1280, height: 900 }
    });
    try {
        await viewSession.goto('/board/view?id=test&no=1001');
        await viewSession.page.waitForSelector('.fixture-view-list .dcuf-search-card .bottom_search');
        const viewActionState = await viewSession.page.locator('.fixture-view-list .dcuf-bottom-action-card').evaluate((card) => {
            const actionBar = card.querySelector('.list_bottom_btnbox');
            const right = actionBar?.querySelector('.fr');
            const cardBox = card.getBoundingClientRect();
            const rightBox = right?.getBoundingClientRect();
            const viewActionBar = document.querySelector('#container.gallery_view > .view_bottom_btnbox');
            const viewRight = viewActionBar?.querySelector('.fr');
            const viewCardBox = viewActionBar?.getBoundingClientRect();
            const viewRightBox = viewRight?.getBoundingClientRect();
            const controls = card.parentElement;
            const pagingBox = controls?.querySelector('.dcuf-pagination-card .bottom_paging_box');
            const pagingTops = Array.from(pagingBox?.children || [])
                .filter((element) => element instanceof HTMLElement)
                .map((element) => Math.round(element.getBoundingClientRect().top));
            const searchOuter = controls?.querySelector('.dcuf-search-card .bottom_search');
            const searchButton = controls?.querySelector('.dcuf-search-card .bnt_search');
            const searchButtonBefore = searchButton ? getComputedStyle(searchButton, '::before') : null;
            const searchButtonAfter = searchButton ? getComputedStyle(searchButton, '::after') : null;
            return {
                actionPosition: actionBar ? getComputedStyle(actionBar).position : '',
                rightPosition: right ? getComputedStyle(right).position : '',
                rightContained: Boolean(rightBox && rightBox.left >= cardBox.left - 1 && rightBox.right <= cardBox.right + 1 && rightBox.bottom <= cardBox.bottom + 1),
                actionRightGap: rightBox ? cardBox.right - rightBox.right : -1,
                viewRadius: viewActionBar ? Number.parseFloat(getComputedStyle(viewActionBar).borderRadius) || 0 : 0,
                viewRightPosition: viewRight ? getComputedStyle(viewRight).position : '',
                viewRightContained: Boolean(viewCardBox && viewRightBox && viewRightBox.left >= viewCardBox.left - 1 && viewRightBox.right <= viewCardBox.right + 1 && viewRightBox.bottom <= viewCardBox.bottom + 1),
                viewRightGap: viewCardBox && viewRightBox ? viewCardBox.right - viewRightBox.right : -1,
                viewActionInsideCustomControls: Boolean(viewActionBar?.closest('.custom-bottom-controls')),
                pagingItemCount: pagingTops.length,
                pagingRowSpread: pagingTops.length ? Math.max(...pagingTops) - Math.min(...pagingTops) : 0,
                searchOuterBorderWidth: searchOuter ? Number.parseFloat(getComputedStyle(searchOuter).borderTopWidth) || 0 : -1,
                searchButtonSpriteReset: searchButton ? getComputedStyle(searchButton).backgroundImage === 'none' : false,
                searchButtonIconReady: Boolean(
                    searchButtonBefore
                    && searchButtonAfter
                    && searchButtonBefore.content === '""'
                    && searchButtonAfter.content === '""'
                )
            };
        });
        assert.equal(viewActionState.actionPosition, 'static', JSON.stringify(viewActionState));
        assert.equal(viewActionState.rightPosition, 'static', JSON.stringify(viewActionState));
        assert.equal(viewActionState.rightContained, true, JSON.stringify(viewActionState));
        assert.equal(viewActionState.actionRightGap >= 0 && viewActionState.actionRightGap <= 12, true, JSON.stringify(viewActionState));
        assert.equal(viewActionState.viewRadius, 16, JSON.stringify(viewActionState));
        assert.equal(viewActionState.viewRightPosition, 'static', JSON.stringify(viewActionState));
        assert.equal(viewActionState.viewRightContained, true, JSON.stringify(viewActionState));
        assert.equal(viewActionState.viewRightGap >= 0 && viewActionState.viewRightGap <= 12, true, JSON.stringify(viewActionState));
        assert.equal(viewActionState.viewActionInsideCustomControls, false, JSON.stringify(viewActionState));
        assert.equal(viewActionState.pagingItemCount, 19, JSON.stringify(viewActionState));
        assert.equal(viewActionState.pagingRowSpread <= 1, true, JSON.stringify(viewActionState));
        assert.equal(viewActionState.searchOuterBorderWidth, 0, JSON.stringify(viewActionState));
        assert.equal(viewActionState.searchButtonSpriteReset, true, JSON.stringify(viewActionState));
        assert.equal(viewActionState.searchButtonIconReady, true, JSON.stringify(viewActionState));
        await viewSession.page.locator('.fixture-view-list .dcuf-bottom-action-card .write').click();
        assert.equal(viewSession.page.url().includes('/board/write'), true);
        assertNoRuntimeErrors(await getMetrics(viewSession.page), viewSession.consoleErrors);
    } finally { await viewSession.close(); }
});

mobileTest('gallery door keeps the original hot-rank popup DOM and layout', 'functional', async ({ browser, server }) => {
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

mobileTest('안정화 후 필터 pass가 유휴 상태에서 과도하게 반복되지 않는다', 'functional', async ({ browser, server }) => {
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

mobileTest('댓글 하나 추가 시 전체 refilter를 실행하지 않는다', 'functional', async ({ browser, server }) => {
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

mobileTest('호스트 숨김 설문·광고 행이 미러 목록에 노출되지 않는다', 'functional', async ({ browser, server }) => {
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
        assert.equal(await session.page.locator('.custom-mobile-list').count(), isPcUserscript ? 0 : 1);
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

mobileTest('댓글 닫힘 상태는 접힌 래퍼 밖으로 댓글을 노출하지 않고 다시 열 수 있다', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/board/view?id=test&no=1001');
        const result = await session.page.evaluate(async () => {
            const wrap = document.querySelector('#focus_cmt > div[id^="comment_wrap_"]');
            const box = wrap?.querySelector(':scope > .comment_box');
            if (!(wrap instanceof HTMLElement) || !(box instanceof HTMLElement)) return { missing: true };
            const visibleWriterCount = () => Array.from(box.querySelectorAll('.ub-writer')).filter((writer) => {
                const style = getComputedStyle(writer);
                const rect = writer.getBoundingClientRect();
                return style.display !== 'none'
                    && style.visibility !== 'hidden'
                    && Number(style.opacity) > 0
                    && rect.width > 0
                    && rect.height > 0;
            }).length;
            const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
            wrap.classList.remove('show');
            await nextFrame();
            const closed = {
                wrapClass: wrap.className,
                matchesClosedSelector: wrap.matches('#focus_cmt > div[id^="comment_wrap_"].comment_wrap:not(.show)'),
                wrapOverflow: getComputedStyle(wrap).overflow,
                boxDisplay: getComputedStyle(box).display,
                visibleWriterCount: visibleWriterCount()
            };

            wrap.classList.add('show');
            await nextFrame();
            const open = {
                boxDisplay: getComputedStyle(box).display,
                visibleWriterCount: visibleWriterCount()
            };
            return { missing: false, closed, open };
        });

        assert.equal(result.missing, false);
        assert.deepEqual(result.closed, {
            wrapClass: 'gall_comment comment_wrap',
            matchesClosedSelector: true,
            wrapOverflow: 'hidden',
            boxDisplay: 'none',
            visibleWriterCount: 0
        });
        assert.equal(result.open.boxDisplay, 'block');
        assert.equal(result.open.visibleWriterCount > 0, true);
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
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

mobileTest('직접 차단 입력이 닉네임·식별번호·IP를 저장하고 관리창과 동기화된다', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, {
        storage: noStatsStorage,
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true
    });
    try {
        await session.goto('/board/view?id=test&no=1001');
        const target = '#comment_li_2';
        const nickname = await session.page.locator(`${target} .ub-writer`).getAttribute('data-nick');
        const fab = session.page.locator('#dc-personal-block-fab');
        const drawer = session.page.locator('#dc-personal-block-drawer');

        await fab.click();
        await drawer.locator('[data-dcuf-fab-action="manual-block"]').click();
        const panel = session.page.locator('#dc-manual-block-panel');
        assert.equal(await panel.count(), 1);
        const panelRect = await panel.boundingBox();
        assert.equal(Boolean(panelRect), true);
        assert.equal(panelRect.x >= 0 && panelRect.y >= 0, true);
        assert.equal(panelRect.x + panelRect.width <= 390 + 1 && panelRect.y + panelRect.height <= 844 + 1, true);

        await panel.locator('#dc-manual-block-value').fill(nickname);
        await panel.locator('[data-manual-block-action="add"]').click();
        await waitForHidden(session.page, target);
        let stored = await session.page.evaluate(() => window.__dcufTestbedGM.snapshot().values.dcinside_personal_block_list);
        assert.equal(stored.nicknames.includes(nickname), true);

        await panel.locator('#dc-manual-block-value').fill(nickname);
        await panel.locator('[data-manual-block-action="add"]').click();
        assert.equal(await panel.locator('.dcuf-manual-status').getAttribute('data-state'), 'info');

        await panel.locator('[data-manual-block-type="uid"]').click();
        await panel.locator('#dc-manual-block-value').fill('manual-uid');
        await panel.locator('#dc-manual-block-display').fill('직접입력');
        await panel.locator('[data-manual-block-action="add"]').click();

        await panel.locator('[data-manual-block-type="ip"]').click();
        await panel.locator('#dc-manual-block-value').fill('203.0.113.7');
        await panel.locator('[data-manual-block-action="add"]').click();
        stored = await session.page.evaluate(() => window.__dcufTestbedGM.snapshot().values.dcinside_personal_block_list);
        assert.deepEqual(stored.uids.find((item) => item.id === 'manual-uid'), { id: 'manual-uid', name: '직접입력(manual-uid)' });
        assert.equal(stored.ips.includes('203.0.113.7'), true);

        await panel.locator('[data-manual-block-action="close"]').click();
        await session.page.waitForFunction(() => !document.querySelector('#dc-manual-block-panel'));

        await fab.click();
        await drawer.locator('[data-dcuf-fab-action="block-management"]').click();
        const management = session.page.locator('#dc-block-management-panel');
        assert.deepEqual(await management.locator('.panel-tab-count').allTextContents(), ['1', '1', '1']);
        assert.equal(await management.locator('.panel-add-btn').count(), 1);

        await management.locator('.panel-search-input').fill('직접입력');
        assert.equal(await management.locator('.blocked-item').count(), 1);
        assert.equal(await management.locator('.blocked-item .item-name').textContent(), '직접입력(manual-uid)');

        await management.locator('.panel-add-btn').click();
        const nestedPanel = session.page.locator('#dc-manual-block-panel');
        assert.equal(await nestedPanel.locator('[data-manual-block-type="uid"]').getAttribute('aria-pressed'), 'true');
        await nestedPanel.locator('#dc-manual-block-value').fill('manual-uid-2');
        await nestedPanel.locator('[data-manual-block-action="add"]').click();
        assert.equal(await management.locator('.panel-tab-count').first().textContent(), '2');
        await nestedPanel.locator('[data-manual-block-action="close"]').click();

        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
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
        assert.deepEqual(await drawer.locator('button:not([hidden]) strong').allTextContents(), ['화면에서 간편차단', '직접 차단', '글댓합 설정', '차단 유저 관리']);

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

mobileTest('mobile popup pinch resize preserves an off-center real-touch focal point', 'functional', async ({ browser, server }) => {
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
        await session.page.locator('#dc-backup-popup, #dc-backup-popup-overlay, #dc-block-management-panel, #dc-block-management-panel-overlay').evaluateAll((elements) => elements.forEach((element) => element.remove()));

        await session.page.evaluate(() => window.__dcufTestbedGM.invokeMenu('UI 색상 설정'));
        assertPinchGeometry('palette', await pinchAndMeasure('#dcuf-palette-panel'));
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally {
        await session.close();
    }
});

mobileTest('야간모드 전환 후 DOM과 주요 스타일이 유지된다', 'functional', async ({ browser, server }) => {
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

mobileTest('광고 DOM 반복 삽입에도 observer subscriber가 폭증하지 않는다', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/board/view?id=test&no=1001');
        await session.page.waitForFunction(() => !window.__dcufRuntimeCoordinator?._mutationSubscribers?.has('ui-post-reveal-recovery'));
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

mobileTest('본문 Google SafeFrame 광고 host만 제거하고 일반 iframe은 보존한다', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.page.route('https://googleads.g.doubleclick.net/**', (route) => route.abort());
        await session.goto('/board/view?id=test&no=1001');
        await session.page.evaluate(() => {
            const root = document.querySelector('.writing_view_box');
            const benignFrame = document.createElement('iframe');
            benignFrame.id = 'fixture-benign-article-frame';
            benignFrame.srcdoc = '<!doctype html><html><body>normal embedded content</body></html>';
            root.appendChild(benignFrame);

            const host = document.createElement('div');
            host.id = 'aswift_42_host';
            host.style.width = '876px';
            host.style.height = '280px';
            const frame = document.createElement('iframe');
            frame.id = 'aswift_42';
            frame.name = 'aswift_42';
            frame.title = 'Advertisement';
            frame.src = 'https://googleads.g.doubleclick.net/pagead/ads?client=dcuf-testbed';
            host.appendChild(frame);
            root.appendChild(host);
        });

        await session.page.waitForFunction(() => !document.getElementById('aswift_42_host'));
        assert.equal(await session.page.locator('#aswift_42, #aswift_42_host').count(), 0);
        assert.equal(await session.page.locator('#fixture-benign-article-frame').count(), 1);
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

mobileTest('article right_wing ad container is removed', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/board/view?id=test&no=1001');
        await session.page.evaluate(() => {
            const wrap = document.createElement('div');
            wrap.className = 'wrap_inner';

            const ad = document.createElement('div');
            ad.id = 'fixture-right-wing-ad';
            const adScript = document.createElement('script');
            adScript.type = 'application/json';
            adScript.src = 'https://addc.dcinside.com/NetInsight/js/dcinside/pc/list@right_wing_hobby';
            ad.appendChild(adScript);

            const ordinary = document.createElement('div');
            ordinary.id = 'fixture-right-wing-ordinary';
            const ordinaryScript = document.createElement('script');
            ordinaryScript.type = 'application/json';
            ordinaryScript.src = 'https://addc.dcinside.com/NetInsight/js/dcinside/pc/list@ordinary_widget';
            ordinary.appendChild(ordinaryScript);

            wrap.append(ad, ordinary);
            document.body.appendChild(wrap);
        });

        await session.page.waitForFunction(() => !document.getElementById('fixture-right-wing-ad'));
        assert.equal(await session.page.locator('#fixture-right-wing-ad').count(), 0);
        assert.equal(await session.page.locator('#fixture-right-wing-ordinary').count(), 1);
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

mobileTest('article adsbygoogle wrapper is removed without a residual gap', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/board/view?id=test&no=1001');
        await session.page.evaluate(() => {
            const article = document.querySelector('.view_content_wrap');
            const wrapper = document.createElement('div');
            wrapper.id = 'fixture-adsbygoogle-wrapper';
            wrapper.style.cssText = 'width:100%;overflow:hidden;text-align:center;margin-top:10px';
            const slot = document.createElement('ins');
            slot.className = 'adsbygoogle';
            slot.dataset.adClient = 'ca-pub-dcuf-testbed';
            slot.dataset.adSlot = '9779213507';
            slot.style.cssText = 'display:inline-block;width:970px;height:90px';
            wrapper.appendChild(slot);

            const ordinary = document.createElement('div');
            ordinary.id = 'fixture-ordinary-inline-slot';
            ordinary.innerHTML = '<ins class="adsbygoogle">ordinary content</ins>';

            article.append(wrapper, ordinary);
        });

        await session.page.waitForFunction(() => !document.getElementById('fixture-adsbygoogle-wrapper'));
        assert.equal(await session.page.locator('#fixture-adsbygoogle-wrapper').count(), 0);
        assert.equal(await session.page.locator('#fixture-ordinary-inline-slot').count(), 1);
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

mobileTest('페이지 이동과 뒤로가기 후 주요 기능이 복원된다', 'functional', async ({ browser, server }) => {
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
        await session.page.evaluate(() => window.__dcufDiagnostics?.reset?.());
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
            documentSelectorCalls: (after.documentQuerySelectorCalls - before.documentQuerySelectorCalls)
                + (after.documentQuerySelectorAllCalls - before.documentQuerySelectorAllCalls),
            documentSelectorAllCalls: after.documentQuerySelectorAllCalls - before.documentQuerySelectorAllCalls,
            documentSelectorAllResults: after.documentQuerySelectorAllResults - before.documentQuerySelectorAllResults,
            elementSelectorCalls: (after.elementQuerySelectorCalls - before.elementQuerySelectorCalls)
                + (after.elementQuerySelectorAllCalls - before.elementQuerySelectorAllCalls),
            layoutReadCount: (after.computedStyleReads - before.computedStyleReads)
                + (after.boundingClientRectReads - before.boundingClientRectReads)
                + (after.clientRectListReads - before.clientRectListReads)
                + (after.layoutPropertyReads - before.layoutPropertyReads),
            geometryReadCount: (after.boundingClientRectReads - before.boundingClientRectReads)
                + (after.clientRectListReads - before.clientRectListReads)
                + (after.layoutPropertyReads - before.layoutPropertyReads),
            timeoutsScheduled: after.timeoutScheduled - before.timeoutScheduled,
            intervalsScheduled: after.intervalScheduled - before.intervalScheduled,
            animationFramesScheduled: after.animationFrameScheduled - before.animationFrameScheduled,
            activeTimeoutsBefore: before.activeTimeouts,
            activeTimeoutsAfter: after.activeTimeouts,
            activeIntervalsBefore: before.activeIntervals,
            activeIntervalsAfter: after.activeIntervals,
            activeAnimationFramesBefore: before.activeAnimationFrames,
            activeAnimationFramesAfter: after.activeAnimationFrames,
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
        assert.equal(report.documentSelectorCalls / addedDomNodes < 0.15, true, `document selector/node ratio: ${report.documentSelectorCalls}/${addedDomNodes}`);
        assert.equal(report.documentSelectorAllResults / addedDomNodes < 2.5, true, `document selector result/node ratio: ${report.documentSelectorAllResults}/${addedDomNodes}`);
        assert.equal(report.elementSelectorCalls / addedDomNodes < 25, true, `element selector/node ratio: ${report.elementSelectorCalls}/${addedDomNodes}`);
        assert.equal(report.layoutReadCount / addedDomNodes < 0.5, true, `layout read/node ratio: ${report.layoutReadCount}/${addedDomNodes}`);
        assert.equal(report.geometryReadCount / addedDomNodes < 0.05, true, `geometry read/node ratio: ${report.geometryReadCount}/${addedDomNodes}`);
        assert.equal(report.activeTimeoutsAfter <= report.activeTimeoutsBefore, true, JSON.stringify({ before: report.activeTimeoutsBefore, after: report.activeTimeoutsAfter }));
        assert.equal(report.activeIntervalsAfter <= report.activeIntervalsBefore, true, JSON.stringify({ before: report.activeIntervalsBefore, after: report.activeIntervalsAfter }));
        assert.equal(report.activeAnimationFramesAfter, 0);
        if (after.dcuf) {
            assert.equal((after.dcuf.counters['filter.fullRefilter.runs'] || 0), 0);
            assert.equal((after.dcuf.counters['filter.syncPass.comments.runs'] || 0) <= 10, true, JSON.stringify(report.filterPassSummary));
        }
        assert.equal(report.filterPassSummary.processedTargets <= 3500, true, JSON.stringify(report.filterPassSummary));
    } finally { await session.close(); }
});

mobileTest('UID API 지연과 실패를 큐·캐시 상태와 함께 재현한다', 'functional', async ({ browser, server }) => {
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

mobileTest('UID API 비차단 응답이 개인차단 댓글 셸을 다시 노출하지 않는다', 'functional', async ({ browser, server }) => {
    server.state.apiMode = 'delay';
    server.state.apiDelayMs = 1800;
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/board/view?id=test&no=1001');
        const result = await session.page.evaluate(async ({ personalListKey, thresholdKey }) => {
            const targetUid = 'safe-comment-1';
            const item = document.querySelector(`[data-uid="${targetUid}"]`)?.closest('li');
            if (!(item instanceof HTMLElement)) return { missing: true };
            item.insertAdjacentHTML('beforeend', `
                <div class="reply show"><div class="reply_box"><ul class="reply_list" p-no="1">
                    <li id="reply_li_async_race" class="ub-content"><div class="reply_info"><div class="cmt_nickbox">
                        <span class="ub-writer" data-uid="safe-async-race-reply" data-nick="안전 답글"></span>
                    </div></div><div class="cmt_txtbox">안전 답글</div></li>
                </ul></div></div>
            `);
            await window.__dcufTestbedGM.set(thresholdKey, 10);
            await window.__dcufFilterModule.reloadSettings();
            const descriptor = window.__dcufFilterModule.describeFilterTarget(item);
            const pendingAsyncDecision = window.__dcufFilterModule.applyAsyncBlock(descriptor);
            await new Promise((resolve) => setTimeout(resolve, 50));
            await window.__dcufTestbedGM.set(personalListKey, {
                uids: [{ id: targetUid, name: 'async race target' }],
                nicknames: [],
                ips: []
            });
            await window.__dcufFilterModule.refilterAllContent('testbed personal block during uid request', { scheduleFollowups: false });

            const writer = item.querySelector(':scope > .cmt_info .ub-writer');
            const frames = [];
            const attributeRemovals = [];
            const observer = new MutationObserver((records) => {
                records.forEach((record) => {
                    const newValue = item.getAttribute(record.attributeName) || '';
                    if ((record.attributeName === 'data-dcuf-comment-blocked'
                            || record.attributeName === 'data-dcuf-comment-shell-blocked')
                        && record.oldValue === '1' && newValue !== '1') {
                        attributeRemovals.push({ attribute: record.attributeName, oldValue: record.oldValue, newValue });
                    }
                    if (record.attributeName === 'class'
                        && String(record.oldValue || '').includes('dcuf-comment-shell-blocked')
                        && !item.classList.contains('dcuf-comment-shell-blocked')) {
                        attributeRemovals.push({ attribute: 'class', oldValue: record.oldValue, newValue: item.className });
                    }
                });
            });
            observer.observe(item, {
                attributes: true,
                attributeOldValue: true,
                attributeFilter: ['class', 'data-dcuf-comment-blocked', 'data-dcuf-comment-shell-blocked']
            });

            const isPaintVisible = (element) => {
                if (!(element instanceof HTMLElement)) return false;
                const style = getComputedStyle(element);
                const rect = element.getBoundingClientRect();
                return style.display !== 'none'
                    && style.visibility !== 'hidden'
                    && Number(style.opacity) > 0
                    && rect.width > 0
                    && rect.height > 0;
            };
            const deadline = performance.now() + 2300;
            while (performance.now() < deadline) {
                await new Promise((resolve) => requestAnimationFrame(resolve));
                frames.push({
                    visible: isPaintVisible(writer),
                    personal: item.getAttribute('data-dcuf-personal-blocked') || '',
                    blocked: item.getAttribute('data-dcuf-comment-blocked') || '',
                    shell: item.getAttribute('data-dcuf-comment-shell-blocked') || ''
                });
            }
            await pendingAsyncDecision;
            observer.disconnect();
            return {
                missing: false,
                frames,
                attributeRemovals,
                final: frames.at(-1),
                suppressedAllows: window.__dcufDiagnostics?.snapshot?.().counters?.['filter.asyncAllow.suppressedPersonalBlock'] || 0
            };
        }, { personalListKey: storageKeys.personalList, thresholdKey: storageKeys.threshold });

        assert.equal(result.missing, false);
        assert.equal(server.state.uidRequests.some((entry) => entry.uid === 'safe-comment-1'), true);
        assert.equal(result.frames.length > 0, true);
        assert.equal(result.frames.every((frame) => frame.visible === false), true, JSON.stringify(result.frames.filter((frame) => frame.visible)));
        assert.deepEqual(result.attributeRemovals, []);
        assert.deepEqual(result.final, { visible: false, personal: '1', blocked: '1', shell: '1' });
        assert.equal(result.suppressedAllows > 0, true);
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

mobileTest('댓글 새 DOM 추가와 전체 교체는 로컬 차단 사용자를 페인트하지 않는다', 'functional', async ({ browser, server }) => {
    const cachedUids = ['safe-comment-2', 'cached-late-user'];
    const personalUids = ['safe-comment-3', 'personal-late-user'];
    const storage = {
        ...statsStorage,
        [storageKeys.personalList]: {
            uids: personalUids.map((id) => ({ id, name: id })),
            nicknames: [],
            ips: []
        },
        [storageKeys.blockedUids]: JSON.stringify(Object.fromEntries(cachedUids.map((uid) => [
            uid,
            { ts: Date.now(), sum: 2, post: 1, comment: 1, ratioBlocked: false }
        ])))
    };
    const session = await createTestPage(browser, server.baseUrl, { storage });
    try {
        await session.goto('/board/view?id=test&no=1001');
        await waitForFiltered(session.page, '#comment_li_2');
        await waitForFiltered(session.page, '#comment_li_3');

        const sampleMutationFrames = (uids, action) => session.page.evaluate(async ({ protectedUids, mutationAction }) => {
            const frames = [];
            const isPaintVisible = (element) => {
                if (!(element instanceof HTMLElement)) return false;
                const style = getComputedStyle(element);
                const rect = element.getBoundingClientRect();
                return style.display !== 'none'
                    && style.visibility !== 'hidden'
                    && Number(style.opacity) > 0
                    && rect.width > 0
                    && rect.height > 0;
            };
            const framePromise = new Promise((resolve) => {
                let frame = 0;
                const sample = () => {
                    frame += 1;
                    const visibleUids = protectedUids.filter((uid) => {
                        const writer = document.querySelector(`[data-uid="${CSS.escape(uid)}"]`);
                        return isPaintVisible(writer);
                    });
                    frames.push({ frame, visibleUids });
                    if (frame >= 6) resolve(frames);
                    else requestAnimationFrame(sample);
                };
                requestAnimationFrame(sample);
            });

            if (mutationAction === 'rerender') {
                window.__dcufFixture.rerenderComments({ fresh: true });
            } else {
                window.__dcufFixture.addComments(1, { uid: 'cached-late-user', nick: 'cached late' });
                window.__dcufFixture.addComments(1, { uid: 'personal-late-user', nick: 'personal late' });
            }
            return framePromise;
        }, { protectedUids: uids, mutationAction: action });

        const rerenderFrames = await sampleMutationFrames(['safe-comment-2', 'safe-comment-3'], 'rerender');
        const appendFrames = await sampleMutationFrames(['cached-late-user', 'personal-late-user'], 'append');
        assert.equal(rerenderFrames.every((frame) => frame.visibleUids.length === 0), true, JSON.stringify(rerenderFrames));
        assert.equal(appendFrames.every((frame) => frame.visibleUids.length === 0), true, JSON.stringify(appendFrames));
        assert.equal(server.state.uidRequests.some((entry) => [...cachedUids, ...personalUids].includes(entry.uid)), false);
        const metrics = await getMetrics(session.page);
        assert.equal((metrics.dcuf.counters['filter.immediateComment.runs'] || 0) > 0, true);
        assertNoRuntimeErrors(metrics, session.consoleErrors);
    } finally { await session.close(); }
});

mobileTest('댓글 전체 재렌더 후 차단 상태와 단일 댓글 목록이 유지된다', 'functional', async ({ browser, server }) => {
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

mobileTest('목록 전체 교체는 정확히 한 목록 상태로 재구축된다', 'functional', async ({ browser, server }) => {
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
        const subscriberKeys = await session.page.evaluate(() => (
            Array.from(window.__dcufRuntimeCoordinator?._mutationSubscribers?.keys?.() || [])
        ));
        assert.equal(after.dcuf.gauges['mutation.subscribers'] <= before.dcuf.gauges['mutation.subscribers'], true);
        assert.equal(subscriberKeys.includes('ui-list-runtime'), true, JSON.stringify(subscriberKeys));
    } finally { await session.close(); }
});

mobileTest('search drawer replacement keeps one global listener set and prunes detached forms', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/board/lists?id=test');
        const before = await getMetrics(session.page);
        const result = await session.page.evaluate(async () => {
            const ui = window.__dcufUIModule;
            let searchForm = document.querySelector('.custom-bottom-controls form[name="frmSearch"]');
            if (!ui || !(searchForm instanceof HTMLElement)) return { missing: true };
            for (let index = 0; index < 20; index += 1) {
                const replacement = searchForm.cloneNode(true);
                replacement.removeAttribute(ui.SEARCH_LAYER_BOUND_ATTR);
                searchForm.replaceWith(replacement);
                ui.bindSearchDrawerReserve(replacement);
                replacement.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
                searchForm = replacement;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
            return window.__dcufMemoryDebug.sample('search-replacement').ui;
        });
        const after = await getMetrics(session.page);
        assert.equal(result.missing, undefined);
        assert.equal(after.listenerUnique, before.listenerUnique);
        assert.equal(result.searchDrawerRoots, 1);
        assert.equal(result.searchDrawerGlobalHandlersBound, true);
        assert.equal(after.dcuf.gauges['ui.searchDrawer.globalListeners'], 4);
        assert.equal(after.dcuf.gauges['ui.searchDrawer.activeRoots'], 1);
        assertNoRuntimeErrors(after, session.consoleErrors);
    } finally { await session.close(); }
});

test('fixed-size list replacement loops settle without runtime lifecycle growth', 'functional', async ({ browser, server }) => {
    if (isPcUserscript) return;
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/mgallery/board/lists?id=test');
        const cdp = await session.context.newCDPSession(session.page);
        await cdp.send('HeapProfiler.enable');
        await cdp.send('HeapProfiler.collectGarbage');
        const before = await getMetrics(session.page);
        const samples = [];

        for (let index = 0; index < 12; index += 1) {
            await session.page.evaluate(() => window.__dcufFixture.replaceList(53));
            await waitForSettled(session.page, 240);
            if ((index + 1) % 4 !== 0) continue;
            await cdp.send('HeapProfiler.collectGarbage');
            await session.page.waitForTimeout(50);
            const metrics = await getMetrics(session.page);
            samples.push({
                loop: index + 1,
                heapUsed: metrics.heap?.usedJSHeapSize ?? null,
                domNodes: metrics.domNodes,
                originalRows: metrics.memory.dom.originalRows,
                customLists: metrics.memory.dom.customLists,
                customPosts: metrics.memory.dom.customPosts,
                customBottomControls: metrics.memory.dom.customBottomControls,
                subscribers: metrics.memory.runtime.subscriberCount,
                activeObservers: metrics.mutationObserversCreated - metrics.mutationDisconnectCalls,
                pendingMutations: metrics.memory.runtime.pendingMutationRecords,
                pendingMutationRaf: metrics.memory.runtime.pendingMutationRafActive,
                pendingMutationTimer: metrics.memory.runtime.pendingMutationTimerActive,
                taskQueues: metrics.memory.runtime.taskQueueCount,
                searchRoots: metrics.memory.ui.searchDrawerRoots,
                searchRaf: metrics.memory.ui.searchDrawerRafActive,
                searchTimer: metrics.memory.ui.searchDrawerTimerActive,
                uidPending: Number(metrics.dcuf.gauges['filter.blockedUidPersist.pendingEntries']) || 0,
                uidWriteActive: Number(metrics.dcuf.gauges['filter.blockedUidPersist.writeActive']) || 0,
                activeTimeouts: metrics.activeTimeouts,
                activeIntervals: metrics.activeIntervals,
                activeAnimationFrames: metrics.activeAnimationFrames
            });
        }

        const settledSubscribers = samples[0]?.subscribers;
        const settledActiveObservers = samples[0]?.activeObservers;
        samples.forEach((sample) => {
            assert.equal(sample.originalRows, 53, JSON.stringify(samples));
            assert.equal(sample.customLists, 1, JSON.stringify(samples));
            assert.equal(sample.customPosts, 53, JSON.stringify(samples));
            assert.equal(sample.customBottomControls, 1, JSON.stringify(samples));
            assert.equal(sample.subscribers, settledSubscribers, JSON.stringify(samples));
            assert.equal(sample.subscribers <= before.memory.runtime.subscriberCount, true, JSON.stringify(samples));
            assert.equal(sample.activeObservers, settledActiveObservers, JSON.stringify(samples));
            assert.equal(sample.activeObservers <= before.mutationObserversCreated - before.mutationDisconnectCalls, true, JSON.stringify(samples));
            assert.equal(sample.pendingMutations, 0, JSON.stringify(samples));
            assert.equal(sample.pendingMutationRaf, false, JSON.stringify(samples));
            assert.equal(sample.pendingMutationTimer, false, JSON.stringify(samples));
            assert.equal(sample.taskQueues, 0, JSON.stringify(samples));
            assert.equal(sample.searchRoots, 1, JSON.stringify(samples));
            assert.equal(sample.searchRaf, false, JSON.stringify(samples));
            assert.equal(sample.searchTimer, false, JSON.stringify(samples));
            assert.equal(sample.uidPending, 0, JSON.stringify(samples));
            assert.equal(sample.uidWriteActive, 0, JSON.stringify(samples));
            assert.equal(sample.activeTimeouts, samples[0].activeTimeouts, JSON.stringify(samples));
            assert.equal(sample.activeIntervals, samples[0].activeIntervals, JSON.stringify(samples));
            assert.equal(sample.activeAnimationFrames, 0, JSON.stringify(samples));
        });
        assert.equal(samples[0].activeTimeouts <= before.activeTimeouts, true, JSON.stringify(samples));
        assert.equal(samples[0].activeIntervals <= before.activeIntervals, true, JSON.stringify(samples));
        assert.equal(new Set(samples.map((sample) => sample.domNodes)).size, 1, JSON.stringify(samples));
        const heapSamples = samples.map((sample) => sample.heapUsed).filter(Number.isFinite);
        if (heapSamples.length >= 2) {
            assert.equal(heapSamples.at(-1) - heapSamples[0] <= 6 * 1024 * 1024, true, JSON.stringify(samples));
        }
        console.log(`Lifecycle fixed-DOM report: ${JSON.stringify(samples)}`);
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

test('visibility recovery preserves blocked comments and settled runtime state', 'functional', async ({ browser, server }) => {
    if (isPcUserscript) return;
    const blockedUid = 'visibility-recovery-blocked';
    const storage = {
        ...noStatsStorage,
        [storageKeys.personalList]: { uids: [{ id: blockedUid, name: blockedUid }], nicknames: [], ips: [] }
    };
    const session = await createTestPage(browser, server.baseUrl, { storage });
    try {
        await session.goto('/board/view?id=test&no=1001');
        await session.page.waitForFunction(() => !window.__dcufRuntimeCoordinator?._mutationSubscribers?.has('ui-post-reveal-recovery'));
        const before = await getMetrics(session.page);
        const frames = await session.page.evaluate(async (uid) => {
            let visibilityState = 'visible';
            Object.defineProperty(document, 'visibilityState', {
                configurable: true,
                get: () => visibilityState
            });
            window.__dcufDiagnostics.reset();
            visibilityState = 'hidden';
            document.dispatchEvent(new Event('visibilitychange'));
            window.__dcufFixture.addComments(1, { uid, nick: uid });
            const item = document.querySelector(`[data-uid="${CSS.escape(uid)}"]`)?.closest('li');
            const sampled = [];
            for (let index = 0; index < 6; index += 1) {
                await new Promise((resolve) => requestAnimationFrame(resolve));
                sampled.push(item?.style.display || 'missing');
            }
            visibilityState = 'visible';
            document.dispatchEvent(new Event('visibilitychange'));
            return sampled;
        }, blockedUid);
        await session.page.waitForFunction(() => (
            (window.__dcufDiagnostics.snapshot().counters['filter.fullRefilter.runs'] || 0) === 1
        ));
        await waitForSettled(session.page, 250);
        const after = await getMetrics(session.page);
        const itemDisplay = await session.page.locator(`[data-uid="${blockedUid}"]`).evaluate((writer) => writer.closest('li')?.style.display || 'missing');

        assert.equal(frames.every((display) => display === 'none'), true, JSON.stringify(frames));
        assert.equal(itemDisplay, 'none');
        assert.equal(after.mutationObserversCreated, before.mutationObserversCreated);
        assert.equal(after.listenerUnique, before.listenerUnique);
        assert.equal(after.memory.runtime.subscriberCount, before.memory.runtime.subscriberCount);
        assert.equal(after.memory.runtime.pendingMutationRecords, 0);
        assert.equal(after.memory.runtime.pendingMutationRafActive, false);
        assert.equal(after.memory.runtime.pendingMutationTimerActive, false);
        assert.equal(after.memory.runtime.taskQueueCount, 0);
        assert.equal(Number(after.dcuf.gauges['filter.blockedUidPersist.pendingEntries']) || 0, 0);
        assert.equal(Number(after.dcuf.gauges['filter.blockedUidPersist.writeActive']) || 0, 0);
        assertNoRuntimeErrors(after, session.consoleErrors);
    } finally { await session.close(); }
});

mobileTest('visibility recovery skips clean and shortcut-only resumes but refilters dirty state once', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/board/view?id=test&no=1001');
        const phases = await session.page.evaluate(async ({ masterDisabledKey, shortcutKey }) => {
            const filterModule = window.__dcufFilterModule;
            let visibilityState = 'visible';
            Object.defineProperty(document, 'visibilityState', {
                configurable: true,
                get: () => visibilityState
            });
            window.__dcufDiagnostics.enable();

            const hide = async () => {
                const previousCycleId = filterModule._visibilityCycleId;
                visibilityState = 'hidden';
                document.dispatchEvent(new Event('visibilitychange'));
                while (filterModule._visibilityCycleId === previousCycleId) await Promise.resolve();
                await Promise.resolve();
            };
            const show = async ({ duplicate = false, label = 'visibility-cycle' } = {}) => {
                visibilityState = 'visible';
                document.dispatchEvent(new Event('visibilitychange'));
                if (duplicate) document.dispatchEvent(new Event('visibilitychange'));
                const recovery = filterModule._visibilityRecoveryPromise;
                if (recovery) {
                    await Promise.race([
                        recovery,
                        new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} recovery timed out`)), 3000))
                    ]);
                }
                await Promise.resolve();
            };
            const snapshot = () => {
                const diagnostics = window.__dcufDiagnostics.snapshot();
                return {
                    fullRefilters: diagnostics.counters['filter.fullRefilter.runs'] || 0,
                    cleanSkips: diagnostics.counters['lifecycle.visibility.restore.skippedClean'] || 0,
                    bfcacheSkips: diagnostics.counters['lifecycle.visibility.restore.skippedBfcache'] || 0,
                    restoreRuns: diagnostics.counters['lifecycle.visibility.restore.runs'] || 0,
                    lastReason: diagnostics.gauges['lifecycle.visibility.restore.lastReason'] || '',
                    shortcutChanged: Boolean(diagnostics.gauges['lifecycle.visibility.restore.shortcutChanged'])
                };
            };
            const runPhase = async (label, mutate, options) => {
                window.__dcufDiagnostics.reset();
                await hide();
                if (mutate) await mutate();
                await show({ ...options, label });
                return snapshot();
            };

            const clean = await runPhase('clean', null, { duplicate: true });
            const shortcutOnly = await runPhase(
                'shortcut-only',
                () => window.__dcufTestbedGM.set(shortcutKey, 'Alt+K'),
                { duplicate: true }
            );
            const settings = await runPhase(
                'settings',
                () => window.__dcufTestbedGM.set(masterDisabledKey, true),
                { duplicate: true }
            );
            const longSuspend = await runPhase('long-suspend', () => {
                filterModule._hiddenAt -= filterModule.VISIBILITY_LONG_RESTORE_MS + 1;
            }, { duplicate: true });
            const surfaceReplacement = await runPhase('surface-replacement', () => {
                const surface = filterModule.getVisibilityRecoverySurface();
                surface.replaceWith(surface.cloneNode(true));
            }, { duplicate: true });

            return { clean, shortcutOnly, settings, longSuspend, surfaceReplacement };
        }, {
            masterDisabledKey: storageKeys.masterDisabled,
            shortcutKey: storageKeys.shortcut
        });

        assert.deepEqual(phases.clean, {
            fullRefilters: 0,
            cleanSkips: 1,
            bfcacheSkips: 0,
            restoreRuns: 0,
            lastReason: 'clean',
            shortcutChanged: false
        });
        assert.deepEqual(phases.shortcutOnly, {
            fullRefilters: 0,
            cleanSkips: 1,
            bfcacheSkips: 0,
            restoreRuns: 0,
            lastReason: 'clean',
            shortcutChanged: true
        });
        assert.equal(phases.settings.fullRefilters, 1, JSON.stringify(phases.settings));
        assert.equal(phases.settings.restoreRuns, 1, JSON.stringify(phases.settings));
        assert.equal(phases.settings.lastReason.includes('settings'), true, JSON.stringify(phases.settings));
        assert.equal(phases.longSuspend.fullRefilters, 1, JSON.stringify(phases.longSuspend));
        assert.equal(phases.longSuspend.restoreRuns, 1, JSON.stringify(phases.longSuspend));
        assert.equal(phases.longSuspend.lastReason.includes('long-suspend'), true, JSON.stringify(phases.longSuspend));
        assert.equal(phases.surfaceReplacement.fullRefilters, 1, JSON.stringify(phases.surfaceReplacement));
        assert.equal(phases.surfaceReplacement.restoreRuns, 1, JSON.stringify(phases.surfaceReplacement));
        assert.equal(phases.surfaceReplacement.lastReason.includes('surface'), true, JSON.stringify(phases.surfaceReplacement));
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

test('IP datasets stay unallocated at boot and each lazy cache decodes once with stable content', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/board/lists?id=test');
        const contract = await session.page.evaluate(() => {
            const filterModule = window.__dcufFilterModule;
            const checksum = (values) => {
                let hash = 2166136261;
                for (const character of values.join(' ')) {
                    hash ^= character.charCodeAt(0);
                    hash = Math.imul(hash, 16777619) >>> 0;
                }
                return hash.toString(16).padStart(8, '0');
            };
            const before = {
                telecomCache: filterModule._telecomPrefixSet,
                strictCache: filterModule._proxyStrictPrefixSet,
                aggressiveExtraCache: filterModule._proxyAggressiveExtraPrefixSet,
                aggressiveCache: filterModule._proxyAggressivePrefixSet,
                krCache: filterModule._krPrefixSet,
                telecomSourceType: typeof filterModule.TELECOM,
                strictSourceType: typeof filterModule.PROXY_STRICT_PREFIXES,
                aggressiveSourceType: typeof filterModule.PROXY_AGGRESSIVE_EXTRA_PREFIXES,
                krSourceType: typeof filterModule.KR_IP_RANGES
            };

            window.__dcufDiagnostics?.enable?.();
            window.__dcufDiagnostics?.reset?.();
            const strict = filterModule.getProxyStrictPrefixSet();
            const strictAgain = filterModule.getProxyStrictPrefixSet();
            const aggressive = filterModule.getProxyPrefixSet(filterModule.PROXY_MODE.AGGRESSIVE);
            const aggressiveAgain = filterModule.getProxyPrefixSet(filterModule.PROXY_MODE.AGGRESSIVE);
            const aggressiveExtra = filterModule.getProxyAggressiveExtraPrefixSet();
            const telecom = filterModule.getTelecomPrefixSet();
            const telecomAgain = filterModule.getTelecomPrefixSet();
            const kr = filterModule.getKrPrefixSet();
            const krAgain = filterModule.getKrPrefixSet();
            const diagnostics = window.__dcufDiagnostics?.snapshot?.() || null;

            return {
                before,
                identity: {
                    strict: strict === strictAgain,
                    aggressive: aggressive === aggressiveAgain,
                    telecom: telecom === telecomAgain,
                    kr: kr === krAgain
                },
                sizes: {
                    telecom: telecom.size,
                    strict: strict.size,
                    aggressiveExtra: aggressiveExtra.size,
                    aggressive: aggressive.size,
                    kr: kr.size
                },
                checksums: {
                    telecom: checksum(Array.from(telecom)),
                    strict: checksum(Array.from(strict)),
                    aggressiveExtra: checksum(Array.from(aggressiveExtra)),
                    kr: checksum(Array.from(kr))
                },
                representative: {
                    telecomHit: telecom.has('1.96'),
                    strictHit: strict.has('1.176'),
                    aggressiveOnlyHit: !strict.has('1.209') && aggressive.has('1.209'),
                    domesticHit: kr.has('1.11'),
                    foreignMiss: !kr.has('8.8'),
                    foreignDecision: filterModule.isForeignIpPrefix('8.8')
                },
                decodes: {
                    telecom: diagnostics ? diagnostics.counters['filter.ipData.telecom.decodes'] || 0 : null,
                    strict: diagnostics ? diagnostics.counters['filter.ipData.proxyStrict.decodes'] || 0 : null,
                    aggressive: diagnostics ? diagnostics.counters['filter.ipData.proxyAggressive.decodes'] || 0 : null,
                    kr: diagnostics ? diagnostics.counters['filter.ipData.kr.decodes'] || 0 : null
                }
            };
        });

        assert.deepEqual(contract.before, {
            telecomCache: null,
            strictCache: null,
            aggressiveExtraCache: null,
            aggressiveCache: null,
            krCache: null,
            telecomSourceType: 'function',
            strictSourceType: 'string',
            aggressiveSourceType: 'string',
            krSourceType: 'function'
        });
        assert.deepEqual(contract.identity, { strict: true, aggressive: true, telecom: true, kr: true });
        assert.deepEqual(contract.sizes, { telecom: 204, strict: 1163, aggressiveExtra: 202, aggressive: 1365, kr: 2084 });
        assert.deepEqual(contract.checksums, {
            telecom: 'ff610dad',
            strict: '9fdb204e',
            aggressiveExtra: 'ec798217',
            kr: '3a253dfb'
        });
        assert.deepEqual(contract.representative, {
            telecomHit: true,
            strictHit: true,
            aggressiveOnlyHit: true,
            domesticHit: true,
            foreignMiss: true,
            foreignDecision: true
        });
        assert.deepEqual(contract.decodes, isPcUserscript
            ? { telecom: null, strict: null, aggressive: null, kr: null }
            : { telecom: 1, strict: 1, aggressive: 1, kr: 1 });
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

mobileTest('unchanged dark-mode head mutations skip expensive theme normalization', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/board/view?id=test&no=1001');
        await session.page.evaluate(async () => {
            window.__dcufDiagnostics.reset();
            for (let index = 0; index < 5; index += 1) {
                const marker = document.createElement('meta');
                marker.dataset.dcufUnrelatedHeadMutation = String(index);
                document.head.appendChild(marker);
                await new Promise((resolve) => requestAnimationFrame(resolve));
            }
        });
        await waitForSettled(session.page, 120);
        const unchanged = await getDiagnostics(session.page);
        assert.equal(unchanged.counters['ui.darkMode.synced'] || 0, 0);
        assert.equal((unchanged.counters['ui.darkMode.skippedUnchanged'] || 0) >= 1, true);

        await session.page.evaluate(() => {
            const style = document.createElement('style');
            style.id = 'css-darkmode';
            document.head.appendChild(style);
        });
        await session.page.waitForFunction(() => document.body.classList.contains('dc-filter-dark-mode'));
        await session.page.evaluate(() => document.getElementById('css-darkmode')?.remove());
        await session.page.waitForFunction(() => !document.body.classList.contains('dc-filter-dark-mode'));
        const changed = await getMetrics(session.page);
        assert.equal((changed.dcuf.counters['ui.darkMode.synced'] || 0), 2);
        assertNoRuntimeErrors(changed, session.consoleErrors);
    } finally { await session.close(); }
});

mobileTest('negative UID failure cache stays bounded and prunes expired entries', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/board/view?id=test&no=1001');
        const result = await session.page.evaluate(() => {
            const filter = window.__dcufFilterModule;
            filter.USER_SUM_NEGATIVE_CACHE.clear();
            filter._negativeUserSumCacheWrites = 0;
            for (let index = 0; index < 320; index += 1) {
                filter.setNegativeUserSumCache(`bounded-cache-${index}`, 'test');
            }
            filter.USER_SUM_NEGATIVE_CACHE.set('expired-cache-entry', {
                ts: Date.now() - filter.USER_SUM_NEGATIVE_TTL - 1,
                reason: 'expired-test'
            });
            filter.pruneNegativeUserSumCache();
            return {
                size: filter.USER_SUM_NEGATIVE_CACHE.size,
                limit: filter.USER_SUM_NEGATIVE_MAX_ENTRIES,
                oldestPresent: filter.USER_SUM_NEGATIVE_CACHE.has('bounded-cache-0'),
                newestPresent: filter.USER_SUM_NEGATIVE_CACHE.has('bounded-cache-319'),
                expiredPresent: filter.USER_SUM_NEGATIVE_CACHE.has('expired-cache-entry'),
                memory: window.__dcufMemoryDebug.sample('bounded-negative-cache').filter
            };
        });
        assert.equal(result.size, 256);
        assert.equal(result.limit, 256);
        assert.equal(result.oldestPresent, false);
        assert.equal(result.newestPresent, true);
        assert.equal(result.expiredPresent, false);
        assert.equal(result.memory.negativeUserSumCache, 256);
        assert.equal(result.memory.negativeUserSumCacheLimit, 256);
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

test('갤러리별 말머리 차단은 공지·관련글을 제외하고 UID 조회 전에 모바일·PC에서 동일 적용된다', 'functional', async ({ browser, server }) => {
    const scenarios = [
        ['/board/lists?id=test', 'board:test'],
        ['/mgallery/board/lists?id=test', 'mgallery:test'],
        ['/mini/board/lists?id=test', 'mini:test']
    ];
    for (const [pathname, galleryKey] of scenarios) {
        server.reset();
        const session = await createTestPage(browser, server.baseUrl, {
            storage: { ...statsStorage, [storageKeys.headtextBlocks]: { [galleryKey]: ['질문', '↗토피아'] } }
        });
        try {
            await session.goto(pathname);
            const result = await session.page.evaluate(() => {
                const blockedSubject = document.querySelector('.gall_subject[data-headtext="질문"]');
                const blockedRow = blockedSubject?.closest('tr.ub-content');
                const innerBlockedRow = document.querySelector('[data-uid="headtext-inner-blocked-user"]')?.closest('tr.ub-content');
                const mirrorId = blockedRow?.getAttribute('data-custom-row-id');
                const mirror = mirrorId ? document.querySelector(`.custom-post-item[data-custom-row-id="${mirrorId}"]`) : null;
                return {
                    rowDisplay: blockedRow?.style.display || '',
                    innerRowDisplay: innerBlockedRow?.style.display || '',
                    mirrorDisplay: mirror instanceof HTMLElement ? getComputedStyle(mirror).display : 'pc-no-mirror',
                    normalizedHeadtext: window.__dcufFilterModule.describeFilterTarget(blockedRow)?.headtext,
                    normalizedInnerHeadtext: window.__dcufFilterModule.describeFilterTarget(innerBlockedRow)?.headtext,
                    settings: window.__dcufFilterModule.createSettingsSignature()
                };
            });
            assert.equal(result.rowDisplay, 'none', `${pathname}: exact headtext row`);
            assert.equal(result.innerRowDisplay, 'none', `${pathname}: hidden canonical headtext row`);
            if (!isPcUserscript) assert.equal(result.mirrorDisplay, 'none', `${pathname}: mirrored row`);
            assert.equal(result.normalizedHeadtext, '질문', 'data-headtext must win over visible label text');
            assert.equal(result.normalizedInnerHeadtext, '↗토피아', '.subject_inner must win over the abbreviated visible label');
            assert.equal(server.state.uidRequests.some((entry) => entry.uid === 'headtext-blocked-user'), false, 'headtext block must precede UID lookup');

            const notice = await session.page.evaluate(async () => {
                const row = document.querySelector('tr.us-post--notice');
                const subject = row?.querySelector('.gall_subject');
                if (subject) subject.dataset.headtext = '질문';
                await window.__dcufFilterModule.refilterAllContent('headtext notice contract', { scheduleFollowups: false });
                return row?.style.display || '';
            });
            assert.notEqual(notice, 'none', `${pathname}: notices must be excluded`);

            const dynamic = await session.page.evaluate(async () => {
                const tbody = document.querySelector('table.gall_list tbody');
                const row = document.querySelector('tr.ub-content:not(.us-post--notice)')?.cloneNode(true);
                row.dataset.no = `dynamic-${Date.now()}`;
                row.querySelector('.ub-writer')?.setAttribute('data-uid', 'dynamic-headtext-user');
                const subject = row.querySelector('.gall_subject'); subject.dataset.headtext = '질문'; subject.textContent = '동적 질문';
                tbody.appendChild(row);
                await new Promise((resolve) => setTimeout(resolve, 450));
                return row.style.display;
            });
            assert.equal(dynamic, 'none', `${pathname}: dynamically inserted row`);

            if (pathname.startsWith('/board/')) {
                await session.page.evaluate(() => window.__dcufFilterModule.showHeadtextBlockManager());
                assert.equal(await session.page.locator('#dcinside-headtext-manager-panel input[type="checkbox"]:checked').count() >= 1, true);
            } else if (pathname.startsWith('/mgallery/')) {
                await session.page.evaluate(() => window.__dcufFilterModule.showHeadtextBlockManager());
                const managerText = await session.page.locator('#dcinside-headtext-manager-panel').innerText();
                assert.equal(managerText.includes('↗토피아'), true, 'canonical hidden row label must be discovered');
                assert.equal(managerText.includes('↗토피↗토피아'), false, 'abbreviated and hidden labels must not be concatenated');
                assert.equal(managerText.includes('®️ACT'), true, 'collapsed subject_morelist entries must be discovered');
            }
            assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
        } finally { await session.close(); }
    }

    const view = await createTestPage(browser, server.baseUrl, {
        storage: { ...noStatsStorage, [storageKeys.headtextBlocks]: { 'board:test': ['질문'] } }
    });
    try {
        await view.goto('/board/view?id=test&no=1001');
        const relatedDisplay = await view.page.evaluate(async () => {
            const item = document.querySelector('.fixture-synthetic-related li');
            const subject = document.createElement('span'); subject.className = 'gall_subject'; subject.dataset.headtext = '질문'; subject.textContent = '질문'; item.prepend(subject);
            await window.__dcufFilterModule.refilterAllContent('related headtext exclusion', { scheduleFollowups: false });
            return item.style.display;
        });
        assert.notEqual(relatedDisplay, 'none', 'related posts are outside the headtext contract');
    } finally { await view.close(); }
});

mobileTest('깨진 편의 설정은 기본값으로 정규화되고 모든 기능 끄기는 저장값만 보존한다', 'functional', async ({ browser, server }) => {
    const corrupted = { listRestore: false, recentHighlight: 'yes', postPreview: 1, unknown: true };
    const session = await createTestPage(browser, server.baseUrl, {
        storage: {
            ...noStatsStorage,
            [storageKeys.masterDisabled]: true,
            [storageKeys.convenience]: corrupted,
            [storageKeys.headtextBlocks]: { 'board:test': ['질문'] }
        },
        viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true
    });
    try {
        await session.goto('/board/lists?id=test');
        const state = await session.page.evaluate(() => {
            const module = window.__dcufMobileConvenienceModule;
            const row = document.querySelector('.gall_subject[data-headtext="질문"]')?.closest('tr.ub-content');
            return {
                settings: module.settings,
                masterDisabled: module.isMasterDisabled(),
                rowDisplay: row?.style.display || '',
                quickActionCount: document.querySelectorAll('[data-dcuf-fab-action="quick-write"]').length,
                persisted: window.__dcufTestbedGM.snapshot().values.dcuf_mobile_convenience_settings_v1
            };
        });
        assert.deepEqual(state.settings, { listRestore: false, recentHighlight: true, draftRecovery: true, postPreview: false });
        assert.equal(state.masterDisabled, true);
        assert.notEqual(state.rowDisplay, 'none', 'master disable must suppress headtext filtering');
        assert.equal(state.quickActionCount, 0);
        assert.deepEqual(state.persisted, corrupted, 'normalization must not rewrite the user storage implicitly');
    } finally { await session.close(); }
});

mobileTest('모바일 편의기능 설정은 선택 팔레트와 밝은·어두운 카드 UI를 공유한다', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, {
        storage: { ...noStatsStorage, [storageKeys.palette]: 'rose' },
        viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true
    });
    try {
        await session.goto('/board/lists?id=test');
        await session.page.evaluate(() => localStorage.setItem('dcuf:draft-diagnostics:v1', '{"version":1,"entries":[]}'));
        await session.goto('/board/lists?id=test');
        const diagnosticRemoval = await session.page.evaluate(() => ({
            stored: localStorage.getItem('dcuf:draft-diagnostics:v1'),
            reportMethod: typeof window.__dcufMobileConvenienceModule.buildDraftDiagnosticReport,
            menuLabels: window.__dcufTestbedGM.snapshot().menuLabels
        }));
        assert.equal(diagnosticRemoval.stored, null, '안정판은 베타 진단 기록을 정리해야 한다');
        assert.equal(diagnosticRemoval.reportMethod, 'undefined', '안정판 런타임에는 진단 보고서 코드가 없어야 한다');
        assert.equal(diagnosticRemoval.menuLabels.some((label) => label.includes('초안 진단')), false, '안정판 메뉴에는 초안 진단 동작이 없어야 한다');
        await session.page.evaluate(() => window.__dcufMobileConvenienceModule.showSettings());
        await session.page.waitForSelector('#dcuf-mobile-convenience-settings');
        const inspect = await session.page.evaluate(() => {
            const panel = document.querySelector('#dcuf-mobile-convenience-settings');
            const row = panel.querySelector('.dcuf-convenience-row');
            const toggle = panel.querySelector('.dcuf-convenience-toggle');
            const save = panel.querySelector('.dcuf-convenience-save');
            const body = panel.querySelector('.dcuf-convenience-body');
            const rect = panel.getBoundingClientRect();
            const probe = document.createElement('span'); probe.style.color = 'var(--dcuf-theme-accent-strong)'; document.body.appendChild(probe);
            const accent = getComputedStyle(probe).color; probe.remove();
            return {
                inlineStyle: panel.getAttribute('style'),
                backgroundImage: getComputedStyle(panel).backgroundImage,
                color: getComputedStyle(panel).color,
                rowRadius: parseFloat(getComputedStyle(row).borderRadius),
                toggle: { width: toggle.getBoundingClientRect().width, height: toggle.getBoundingClientRect().height },
                saveBorder: getComputedStyle(save).borderColor,
                accent,
                bodyOverflow: getComputedStyle(body).overflowY,
                inViewport: rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight,
                rows: panel.querySelectorAll('.dcuf-convenience-row').length,
                actions: panel.querySelectorAll('.dcuf-convenience-actions button').length
            };
        });
        assert.equal(inspect.inlineStyle, null, '편의 설정 레이아웃은 고정 인라인 색상에 의존하면 안 된다');
        assert.notEqual(inspect.backgroundImage, 'none');
        assert.equal(inspect.rowRadius >= 10, true);
        assert.deepEqual(inspect.toggle, { width: 42, height: 24 });
        assert.equal(inspect.saveBorder, inspect.accent, '저장 버튼은 선택한 팔레트 강조색을 사용해야 한다');
        assert.equal(inspect.bodyOverflow, 'auto');
        assert.equal(inspect.inViewport, true);
        assert.equal(inspect.rows, 4); assert.equal(inspect.actions, 2);

        const dark = await session.page.evaluate(() => {
            const before = getComputedStyle(document.querySelector('#dcuf-mobile-convenience-settings')).color;
            window.__dcufFixture.toggleDark(true);
            const panel = document.querySelector('#dcuf-mobile-convenience-settings');
            return { before, after: getComputedStyle(panel).color, closeLabel: panel.querySelector('.dcuf-convenience-close').getAttribute('aria-label') };
        });
        assert.notEqual(dark.after, dark.before, '어두운 모드에서는 팔레트의 전경 토큰이 갱신되어야 한다');
        assert.equal(dark.closeLabel, '편의기능 설정 닫기');
        await session.page.locator('.dcuf-convenience-close').click();
        assert.equal(await session.page.locator('#dcuf-mobile-convenience-settings').count(), 0);
    } finally { await session.close(); }
});

mobileTest('모바일 미리보기는 body를 이동하지 않고 설정 중첩만 강한 잠금으로 승격한다', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, {
        storage: { ...noStatsStorage, [storageKeys.convenience]: { listRestore: true, recentHighlight: true, draftRecovery: true, postPreview: true } },
        viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true
    });
    try {
        await session.goto('/board/lists?id=test');
        const before = await session.page.evaluate(() => {
            window.scrollTo(0, 900);
            const scrollY = window.scrollY;
            const module = window.__dcufMobileConvenienceModule;
            module.createPreviewPanel('/board/view?id=test&no=1001', '짧은 미리보기', { mobile: true, x: 20, y: 20 });
            return {
                scrollY,
                bodyPositionBefore: module._overlayScrollState?.body?.position?.value || '',
                bodyTopBefore: module._overlayScrollState?.body?.top?.value || '',
                rootOverflowBefore: module._overlayScrollState?.root?.overflow?.value || ''
            };
        });
        await session.page.waitForSelector('#dcuf-post-preview');
        const previewLock = await session.page.evaluate(() => ({
            bodyPosition: document.body.style.position,
            bodyTop: document.body.style.top,
            rootOverflow: getComputedStyle(document.documentElement).overflow,
            panelOverscroll: getComputedStyle(document.querySelector('#dcuf-post-preview')).overscrollBehavior,
            panelBottomGap: Math.abs((window.visualViewport?.height || window.innerHeight) + (window.visualViewport?.offsetTop || 0) - document.querySelector('#dcuf-post-preview').getBoundingClientRect().bottom),
            panelTopStyle: document.querySelector('#dcuf-post-preview').style.top,
            panelBottomStyle: document.querySelector('#dcuf-post-preview').style.bottom,
            shortBody: document.querySelector('.dcuf-preview-body').scrollHeight <= document.querySelector('.dcuf-preview-body').clientHeight,
            lockedScrollY: window.scrollY,
            owners: Array.from(window.__dcufMobileConvenienceModule._overlayScrollOwners)
        }));
        assert.equal(previewLock.bodyPosition, before.bodyPositionBefore, '미리보기만 열렸을 때 body를 fixed로 바꾸면 안 된다');
        assert.equal(previewLock.bodyTop, before.bodyTopBefore, '미리보기만 열렸을 때 body를 음수 top으로 이동하면 안 된다');
        assert.equal(previewLock.rootOverflow, 'hidden');
        assert.equal(previewLock.panelOverscroll, 'contain');
        assert.equal(previewLock.panelBottomGap <= 1, true, JSON.stringify(previewLock));
        assert.equal(previewLock.panelTopStyle, 'auto');
        assert.equal(previewLock.panelBottomStyle, '0px');
        assert.equal(previewLock.shortBody, true, '스크롤할 내용이 없는 미리보기 조건을 재현해야 한다');
        assert.deepEqual(previewLock.owners, ['preview']);
        const previewBox = await session.page.locator('#dcuf-post-preview').boundingBox();
        await session.page.mouse.move(previewBox.x + previewBox.width / 2, previewBox.y + previewBox.height / 2);
        await session.page.mouse.wheel(0, 600);
        await session.page.waitForTimeout(80);
        assert.equal(await session.page.evaluate(() => window.scrollY), previewLock.lockedScrollY, '짧은 미리보기 위 휠/드래그가 목록으로 체인되면 안 된다');

        await session.page.evaluate(() => window.__dcufMobileConvenienceModule.showSettings());
        await session.page.waitForSelector('#dcuf-mobile-convenience-settings');
        const nestedLock = await session.page.evaluate(() => ({
            owners: Array.from(window.__dcufMobileConvenienceModule._overlayScrollOwners).sort(),
            bodyPosition: getComputedStyle(document.body).position,
            bodyTop: parseFloat(getComputedStyle(document.body).top)
        }));
        assert.deepEqual(nestedLock.owners, ['preview', 'settings']);
        assert.equal(nestedLock.bodyPosition, 'fixed');
        assert.equal(Math.abs(nestedLock.bodyTop + before.scrollY) <= 1, true, JSON.stringify({ before, nestedLock }));
        await session.page.evaluate(() => window.__dcufMobileConvenienceModule.closeSettings());
        const previewOnlyAgain = await session.page.evaluate(() => ({
            owners: Array.from(window.__dcufMobileConvenienceModule._overlayScrollOwners),
            bodyPosition: document.body.style.position,
            bodyTop: document.body.style.top,
            rootOverflow: getComputedStyle(document.documentElement).overflow,
            scrollY: window.scrollY
        }));
        assert.deepEqual(previewOnlyAgain.owners, ['preview']);
        assert.equal(previewOnlyAgain.bodyPosition, before.bodyPositionBefore);
        assert.equal(previewOnlyAgain.bodyTop, before.bodyTopBefore);
        assert.equal(previewOnlyAgain.rootOverflow, 'hidden', '미리보기가 남아 있으면 루트 잠금을 유지해야 한다');
        assert.equal(Math.abs(previewOnlyAgain.scrollY - before.scrollY) <= 1, true, JSON.stringify(previewOnlyAgain));
        await session.page.evaluate(() => window.__dcufMobileConvenienceModule.closePreview());
        await session.page.waitForTimeout(50);
        const previewReleased = await session.page.evaluate(() => ({
            scrollY: window.scrollY,
            bodyPosition: document.body.style.position,
            rootOverflow: document.documentElement.style.overflow,
            owners: window.__dcufMobileConvenienceModule._overlayScrollOwners.size
        }));
        assert.equal(Math.abs(previewReleased.scrollY - before.scrollY) <= 1, true, JSON.stringify(previewReleased));
        assert.equal(previewReleased.bodyPosition, before.bodyPositionBefore);
        assert.equal(previewReleased.rootOverflow, before.rootOverflowBefore);
        assert.equal(previewReleased.owners, 0);

        await session.page.evaluate(() => window.__dcufMobileConvenienceModule.showSettings());
        await session.page.waitForSelector('#dcuf-mobile-convenience-settings');
        const settingsOnlyLock = await session.page.evaluate(() => ({
            scrollY: window.scrollY,
            bodyPosition: getComputedStyle(document.body).position,
            bodyTop: parseFloat(getComputedStyle(document.body).top)
        }));
        assert.equal(settingsOnlyLock.bodyPosition, 'fixed');
        assert.equal(Math.abs(settingsOnlyLock.bodyTop + before.scrollY) <= 1, true, JSON.stringify({ before, settingsOnlyLock }));
        const settingsLockedScrollY = settingsOnlyLock.scrollY;
        const settingsBox = await session.page.locator('#dcuf-mobile-convenience-settings').boundingBox();
        await session.page.mouse.move(settingsBox.x + settingsBox.width / 2, settingsBox.y + settingsBox.height / 2);
        await session.page.mouse.wheel(0, 600);
        await session.page.waitForTimeout(80);
        assert.equal(await session.page.evaluate(() => window.scrollY), settingsLockedScrollY, '편의 설정 위 휠/드래그가 목록으로 체인되면 안 된다');
        await session.page.locator('.dcuf-convenience-close').click();
        await session.page.waitForTimeout(50);
        assert.equal(Math.abs((await session.page.evaluate(() => window.scrollY)) - before.scrollY) <= 1, true);
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

mobileTest('목록 복원 기록과 최근 글 표시는 커밋 뒤 정확한 카드에 한 번만 적용된다', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage, viewport: { width: 390, height: 844 } });
    try {
        await session.goto('/board/lists?id=test');
        const link = session.page.locator('.custom-post-item:visible a.post-title-link').nth(8);
        const postNo = await link.evaluate((element) => new URL(element.href).searchParams.get('no'));
        await link.evaluate((element) => {
            const card = element.closest('.custom-post-item');
            const record = { listUrl: location.href, postUrl: element.href, postNo: new URL(element.href).searchParams.get('no'), offset: 140, scrollY: 0, savedAt: Date.now() };
            sessionStorage.setItem('dcuf:list-return:v1', JSON.stringify(record));
            window.__dcufMobileConvenienceModule._listRestoreComplete = false;
            window.__dcufMobileConvenienceModule._pageShowPersisted = false;
            window.__dcufMobileConvenienceModule._pageShowSettled = true;
            card.scrollIntoView();
        });
        await session.page.evaluate(() => {
            const ui = window.__dcufUIModule;
            const state = Array.from(ui.LIST_STATES || ui.LIST_STATE_MAP?.values?.() || [])[0];
            if (state) return window.__dcufMobileConvenienceModule.onListCommitted(state, 'test-return');
            const list = document.querySelector('.custom-mobile-list');
            return window.__dcufMobileConvenienceModule.onListCommitted({ newListContainer: list }, 'test-return');
        });
        await session.page.waitForTimeout(80);
        assert.equal(await session.page.locator('.custom-post-item.dcuf-recent-post').count(), 1);
        assert.equal(await session.page.locator('.custom-post-item.dcuf-recent-post a.post-title-link').evaluate((element) => new URL(element.href).searchParams.get('no')), postNo);
        assert.equal(await session.page.locator('.custom-post-item.dcuf-recent-post .dcuf-recent-label').textContent(), '방금 본 글');
        const recentVisual = await session.page.locator('.custom-post-item.dcuf-recent-post').evaluate((card) => ({
            boxShadow: getComputedStyle(card).boxShadow,
            outlineWidth: getComputedStyle(card).outlineWidth
        }));
        assert.notEqual(recentVisual.boxShadow, 'none', '최근 글 카드는 테마 강조선을 가져야 한다');
        assert.equal(parseFloat(recentVisual.outlineWidth) >= 1, true, '최근 글 카드는 배지 외에도 명확한 외곽선이 있어야 한다');
        const restoreComplete = await session.page.evaluate(() => window.__dcufMobileConvenienceModule._listRestoreComplete);
        assert.equal(restoreComplete, true);
        const reloadContract = await session.page.evaluate(() => {
            const module = window.__dcufMobileConvenienceModule;
            const list = document.querySelector('.custom-mobile-list');
            const originalNavigationType = module.getNavigationType;
            const originalScrollTo = window.scrollTo;
            let calls = 0;
            module._listRestoreComplete = false;
            module._pageShowPersisted = false;
            module.getNavigationType = () => 'reload';
            window.scrollTo = (...args) => { calls += 1; return originalScrollTo.apply(window, args); };
            const before = window.scrollY;
            const result = module.onListCommitted({ newListContainer: list }, 'reload-test');
            const after = window.scrollY;
            window.scrollTo = originalScrollTo;
            module.getNavigationType = originalNavigationType;
            return { calls, before, after, promise: result instanceof Promise, restored: module._listRestoreComplete };
        });
        assert.equal(reloadContract.calls, 0, 'reload must not jump to the stale last-opened card');
        assert.equal(reloadContract.after, reloadContract.before, 'reload must preserve the browser-owned scroll position');
        assert.equal(reloadContract.promise, false, 'list restore must complete synchronously with the commit');
        assert.equal(reloadContract.restored, true);
        const persistedContract = await session.page.evaluate(async () => {
            const module = window.__dcufMobileConvenienceModule;
            const list = document.querySelector('.custom-mobile-list');
            module._listRestoreComplete = false;
            module._pageShowPersisted = true;
            const original = window.scrollTo;
            let calls = 0;
            window.scrollTo = (...args) => { calls += 1; return original.apply(window, args); };
            await module.onListCommitted({ newListContainer: list }, 'persisted-test');
            window.scrollTo = original;
            return { calls, restored: module._listRestoreComplete };
        });
        assert.equal(persistedContract.restored, true);
        const reloadBefore = await session.page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('.custom-post-item'));
            const target = cards[30];
            target.scrollIntoView({ block: 'start' });
            return {
                postNo: new URL(target.querySelector('a.post-title-link').href).searchParams.get('no'),
                scrollY: window.scrollY
            };
        });
        await session.page.reload({ waitUntil: 'domcontentloaded' });
        await session.page.waitForFunction(() => document.documentElement.classList.contains('script-ui-ready'), null, { timeout: 12000 });
        await session.page.waitForTimeout(1300);
        const reloadAfter = await session.page.evaluate((expectedPostNo) => {
            const target = Array.from(document.querySelectorAll('.custom-post-item')).find((card) => {
                const link = card.querySelector('a.post-title-link');
                return link && new URL(link.href).searchParams.get('no') === expectedPostNo;
            });
            const recent = document.querySelector('.custom-post-item.dcuf-recent-post a.post-title-link');
            return {
                navigationType: performance.getEntriesByType('navigation')[0]?.type || '',
                scrollY: window.scrollY,
                targetOffset: target?.getBoundingClientRect().top ?? null,
                recentPostNo: recent ? new URL(recent.href).searchParams.get('no') : null
            };
        }, reloadBefore.postNo);
        assert.equal(reloadAfter.navigationType, 'reload');
        assert.equal(Math.abs(reloadAfter.scrollY - reloadBefore.scrollY) <= 3, true, JSON.stringify({ reloadBefore, reloadAfter }));
        assert.equal(Math.abs(reloadAfter.targetOffset) <= 3, true, JSON.stringify(reloadAfter));
        assert.equal(reloadAfter.recentPostNo, postNo, 'reload may keep the recent marker without jumping back to it');
        assert.equal(persistedContract.calls, 0, 'bfcache persisted 복귀에서는 중복 scrollTo를 호출하지 않아야 한다');
    } finally { await session.close(); }
});

mobileTest('글 미리보기는 터치 이동을 취소하고 길게 누른 경우만 클릭을 막으며 정제·캐시한다', 'functional', async ({ browser, server }) => {
    let requests = 0;
    const session = await createTestPage(browser, server.baseUrl, {
        storage: { ...noStatsStorage, [storageKeys.convenience]: { listRestore: true, recentHighlight: true, draftRecovery: true, postPreview: true } },
        viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true
    });
    try {
        await session.page.route('**/board/view?id=test&no=*', async (route) => {
            requests += 1;
            await route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><body><div class="writing_view_box"><div class="write_div"><p>정제 본문</p><p>본문에 추천 검색 이야기는 남아야 함</p><div class="fixture-recommend-search">추천 검색</div><div class="fixture-original-attachment">원본 첨부파일 1</div><img src="/images/loading.gif" data-src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="><div class="captcha"><img alt="자동등록방지" src="/dc/w/images/kcap_none.png"><span>0</span></div><span class="gall_writer"><img alt="고정닉" src="/dc/w/images/fix_nik.gif"><span>0</span></span><div class="btn_recommend_box"><div class="up_num_box">0</div><button class="btn_recom_up">개념</button><div class="down_num_box">0</div><button class="btn_recom_down">비추</button></div><script>window.bad=1</script><form><input value="secret"></form><iframe src="/bad"></iframe><video src="/movie"></video><a href="javascript:window.bad=2">위험 링크</a></div></div></body></html>' });
        });
        await session.goto('/board/lists?id=test');
        const selector = '.custom-post-item:visible a.post-title-link';
        const link = session.page.locator(selector).first();
        await link.dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 31, clientX: 30, clientY: 30, bubbles: true });
        const pendingContextMenu = await link.evaluate((element) => element.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })));
        assert.equal(pendingContextMenu, false, '미리보기 터치가 시작되면 브라우저 길게 누르기 메뉴를 즉시 선점해야 한다');
        await link.dispatchEvent('pointermove', { pointerType: 'touch', pointerId: 31, clientX: 50, clientY: 30, bubbles: true });
        const movedContextMenu = await link.evaluate((element) => element.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })));
        assert.equal(movedContextMenu, true, '이동으로 미리보기가 취소되면 네이티브 contextmenu 억제도 풀려야 한다');
        await link.dispatchEvent('pointerdown', { pointerType: 'mouse', pointerId: 41, clientX: 30, clientY: 30, bubbles: true });
        const mouseContextMenu = await link.evaluate((element) => element.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })));
        assert.equal(mouseContextMenu, true, '정밀 마우스 우클릭은 미리보기 길게 누르기와 무관하게 유지해야 한다');
        const disabledContextMenu = await session.page.evaluate(() => {
            const module = window.__dcufMobileConvenienceModule;
            const link = document.querySelector('.custom-post-item a.post-title-link');
            module.settings.postPreview = false;
            link.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', pointerId: 42, clientX: 30, clientY: 30, bubbles: true }));
            const allowed = link.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
            module.settings.postPreview = true;
            return allowed;
        });
        assert.equal(disabledContextMenu, true, '미리보기가 꺼져 있으면 터치 contextmenu도 브라우저에 남겨야 한다');
        await session.page.waitForTimeout(560);
        assert.equal(await session.page.locator('#dcuf-post-preview').count(), 0, '12px 초과 이동은 길게 누르기를 취소해야 한다');

        await link.dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 32, clientX: 30, clientY: 30, bubbles: true });
        await session.page.waitForTimeout(560);
        const completedContextMenu = await link.evaluate((element) => element.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })));
        assert.equal(completedContextMenu, false, '미리보기로 완료된 길게 누르기는 후발 네이티브 메뉴도 막아야 한다');
        await link.dispatchEvent('pointerup', { pointerType: 'touch', pointerId: 32, clientX: 30, clientY: 30, bubbles: true });
        await session.page.waitForSelector('#dcuf-post-preview .dcuf-preview-body');
        await session.page.waitForFunction(() => document.querySelector('#dcuf-post-preview .dcuf-preview-body')?.textContent.includes('정제 본문'));
        const preview = await session.page.evaluate(() => ({
            text: document.querySelector('#dcuf-post-preview .dcuf-preview-body').textContent,
            forbidden: document.querySelectorAll('#dcuf-post-preview script,#dcuf-post-preview form,#dcuf-post-preview iframe,#dcuf-post-preview video').length,
            loading: document.querySelector('#dcuf-post-preview img')?.loading,
            imageSources: Array.from(document.querySelectorAll('#dcuf-post-preview img')).map((image) => image.src),
            unsafeLinks: Array.from(document.querySelectorAll('#dcuf-post-preview a')).filter((anchor) => /^javascript:/i.test(anchor.getAttribute('href') || '')).length,
            recommendationBoxes: document.querySelectorAll('#dcuf-post-preview .btn_recommend_box').length
        }));
        const previewBody = session.page.locator('#dcuf-post-preview .dcuf-preview-body');
        await previewBody.dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 51, isPrimary: true, clientX: 180, clientY: 650, bubbles: true });
        await previewBody.dispatchEvent('pointermove', { pointerType: 'touch', pointerId: 51, isPrimary: true, clientX: 180, clientY: 610, bubbles: true });
        await previewBody.dispatchEvent('pointerup', { pointerType: 'touch', pointerId: 51, isPrimary: true, clientX: 180, clientY: 610, bubbles: true });
        assert.equal(await session.page.locator('#dcuf-post-preview').count(), 1, '미리보기 내부 드래그는 패널을 닫지 않고 본문 스크롤에 남겨야 한다');

        const listCard = session.page.locator('.custom-post-item:visible').first();
        await listCard.dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 52, isPrimary: true, clientX: 180, clientY: 100, bubbles: true });
        await listCard.dispatchEvent('pointermove', { pointerType: 'touch', pointerId: 52, isPrimary: true, clientX: 180, clientY: 125, bubbles: true });
        assert.equal(await session.page.locator('#dcuf-post-preview').count(), 0, '미리보기 밖 목록 드래그는 모바일 시트를 닫아야 한다');
        await session.page.evaluate(() => {
            const link = Array.from(document.querySelectorAll('.custom-post-item a.post-title-link')).find((candidate) => getComputedStyle(candidate.closest('.custom-post-item')).display !== 'none');
            window.__dcufMobileConvenienceModule.openPreview(link.href, link.textContent, { mobile: true, x: 20, y: 20 });
        });
        await session.page.waitForFunction(() => document.querySelector('#dcuf-post-preview .dcuf-preview-body')?.textContent.includes('정제 본문'));

        const clickContract = await link.evaluate((element) => {
            let reachedDocumentAfterGuard = 0;
            const afterGuard = (event) => {
                reachedDocumentAfterGuard += 1;
                event.preventDefault(); event.stopPropagation();
            };
            document.addEventListener('click', afterGuard, true);
            sessionStorage.removeItem('dcuf:list-return:v1');
            const first = element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            const recordedAfterSuppressedClick = sessionStorage.getItem('dcuf:list-return:v1');
            const second = element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            document.removeEventListener('click', afterGuard, true);
            return { first, second, reachedDocumentAfterGuard, recordedAfterSuppressedClick };
        });
        assert.equal(preview.forbidden, 0);
        assert.equal(preview.loading, 'lazy');
        assert.equal(preview.text.includes('미디어는 원문에서 보기'), true);
        assert.equal(preview.imageSources.some((src) => /kcap_none|fix_nik/i.test(src)), false, 'host captcha and nickname icons must not be previewed');
        assert.equal(preview.unsafeLinks, 0, 'javascript links must not survive preview sanitization');
        assert.equal(preview.recommendationBoxes, 0, 'recommendation controls must not be cloned into the preview');
        assert.equal(preview.text.includes('개념') || preview.text.includes('비추'), false, 'recommendation labels must not leak into preview text');
        assert.equal(preview.text.includes('원본 첨부파일'), false, 'original attachment footer labels must not leak into preview text');
        assert.equal(preview.text.includes('본문에 추천 검색 이야기는 남아야 함'), true, 'ordinary article sentences containing the same words must remain');

        assert.equal(clickContract.first, false, 'the native click produced by a completed long press must be suppressed');
        assert.equal(clickContract.reachedDocumentAfterGuard, 1, 'the next intentional click must pass the preview suppression guard');
        assert.equal(clickContract.recordedAfterSuppressedClick, null, 'a suppressed preview click must not create a list-return record');
        await session.page.evaluate(() => window.__dcufMobileConvenienceModule.closePreview());
        await session.page.evaluate(() => {
            const link = Array.from(document.querySelectorAll('.custom-post-item a.post-title-link')).find((candidate) => getComputedStyle(candidate.closest('.custom-post-item')).display !== 'none');
            window.__dcufMobileConvenienceModule.openPreview(link.href, link.textContent, { mobile: true, x: 20, y: 20 });
        });
        await session.page.waitForFunction(() => document.querySelector('#dcuf-post-preview .dcuf-preview-body')?.textContent.includes('정제 본문'));
        assert.equal(requests, 1, '3분 캐시 안에서는 같은 글을 다시 요청하지 않아야 한다');
    } finally { await session.close(); }
});

mobileTest('최근 방문 화살표는 가변 폭만큼 이동하고 host 고정 오프셋을 차단한다', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, {
        storage: noStatsStorage,
        viewport: { width: 750, height: 900 }
    });
    try {
        await session.goto('/mgallery/board/lists?id=test');
        await session.page.waitForFunction(() => document.querySelector('.newvisit_list')?.dataset.dcufRecentNavigationBound === '1');
        const initial = await session.page.evaluate(() => {
            const root = document.querySelector('.newvisit_history');
            const list = root.querySelector('.newvisit_list');
            const box = root.querySelector('.newvisit_box');
            const next = root.querySelector('.bnt_visit_next');
            const more = root.querySelector('.bnt_newvisit_more');
            const rootRect = root.getBoundingClientRect();
            return {
                clientWidth: list.clientWidth,
                scrollWidth: list.scrollWidth,
                boxWidth: box.getBoundingClientRect().width,
                left: getComputedStyle(list).left,
                nextVisible: next.getBoundingClientRect().right <= rootRect.right + 1,
                moreVisible: more.getBoundingClientRect().right <= rootRect.right + 1
            };
        });
        assert.equal(initial.scrollWidth > initial.clientWidth, true);
        assert.equal(initial.boxWidth > 100, true);
        assert.equal(initial.left, '0px');
        assert.equal(initial.nextVisible, true);
        assert.equal(initial.moreVisible, true);

        await session.page.locator('.bnt_visit_next').click();
        await session.page.waitForFunction(() => document.querySelector('.newvisit_list')?.scrollLeft > 1);
        await session.page.waitForTimeout(380);
        const firstMove = await session.page.evaluate(() => {
            const list = document.querySelector('.newvisit_list');
            return { scrollLeft: list.scrollLeft, clientWidth: list.clientWidth, inlineLeft: list.style.left, priority: list.style.getPropertyPriority('left') };
        });
        assert.equal(firstMove.scrollLeft <= firstMove.clientWidth + 2, true, JSON.stringify(firstMove));
        assert.equal(firstMove.inlineLeft, '0px', 'host onclick의 -1445px 이동은 실행되면 안 된다');
        assert.equal(firstMove.priority, 'important');

        await session.page.evaluate(() => {
            const prev = document.querySelector('.bnt_visit_prev');
            const next = document.querySelector('.bnt_visit_next');
            prev.classList.replace('bnt_visit_prev', 'btn_visit_prev');
            next.classList.replace('bnt_visit_next', 'btn_visit_next');
        });
        await session.page.locator('.btn_visit_prev').click();
        await session.page.waitForTimeout(900);
        const prevMove = await session.page.evaluate(() => ({
            scrollLeft: document.querySelector('.newvisit_list').scrollLeft,
            prevDisabled: document.querySelector('.btn_visit_prev')?.getAttribute('aria-disabled'),
            prevClass: document.querySelector('.btn_visit_prev')?.className || ''
        }));
        assert.equal(prevMove.scrollLeft <= 1, true, `btn/bnt 두 host 클래스 변형을 모두 처리해야 한다: ${JSON.stringify({ firstMove, prevMove })}`);
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

mobileTest('글 미리보기는 정밀 마우스 400ms 대기와 단일 요청 취소 계약을 지킨다', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, {
        storage: { ...noStatsStorage, [storageKeys.convenience]: { listRestore: true, recentHighlight: true, draftRecovery: true, postPreview: true } },
        viewport: { width: 1280, height: 900 }
    });
    try {
        await session.page.route('**/board/view?id=test&no=*', async (route) => {
            const no = new URL(route.request().url()).searchParams.get('no');
            await new Promise((resolve) => setTimeout(resolve, 700));
            const dataImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
            const longBody = Array.from({ length: 80 }, (_, index) => `<p>스크롤 본문 ${index}</p>`).join('');
            const images = Array.from({ length: 5 }, (_, index) => `<img src="/images/loading.gif" data-original="${dataImage}" alt="본문 이미지 ${index}">`).join('');
            await route.fulfill({ status: 200, contentType: 'text/html', body: `<!doctype html><div class="writing_view_box"><div class="write_div">본문-${no}${images}${longBody}</div></div>` });
        });
        await session.goto('/board/lists?id=test');
        const links = session.page.locator('.custom-post-item:visible a.post-title-link');
        await links.nth(0).hover();
        await session.page.waitForTimeout(300);
        assert.equal(await session.page.locator('#dcuf-post-preview').count(), 0, '400ms 전에는 hover 미리보기를 열지 않아야 한다');
        await session.page.waitForTimeout(150);
        await session.page.waitForSelector('#dcuf-post-preview');
        assert.equal(await session.page.locator('#dcuf-post-preview .dcuf-preview-status').textContent(), '불러오는 중…', '패널은 응답을 기다리지 않고 로딩 상태로 먼저 떠야 한다');
        await session.page.mouse.move(1240, 860);
        await session.page.waitForTimeout(380);
        assert.equal(await session.page.locator('#dcuf-post-preview').count(), 0, '제목에서 빈 공간으로 이동하면 미리보기가 닫혀야 한다');

        await links.nth(0).hover();
        await session.page.waitForTimeout(430);
        const panelBox = await session.page.locator('#dcuf-post-preview').boundingBox();
        await session.page.mouse.move(panelBox.x + Math.min(80, panelBox.width / 2), panelBox.y + Math.min(80, panelBox.height / 2));
        await session.page.waitForTimeout(380);
        assert.equal(await session.page.locator('#dcuf-post-preview').count(), 1, '제목에서 패널로 이동하는 320ms 통로 안에서는 닫히면 안 된다');
        await session.page.waitForFunction(() => /본문-/.test(document.querySelector('#dcuf-post-preview .dcuf-preview-body')?.textContent || ''));
        const scrollContract = await session.page.evaluate(() => {
            const body = document.querySelector('#dcuf-post-preview .dcuf-preview-body');
            body.scrollTop = body.scrollHeight;
            return { scrollable: body.scrollHeight > body.clientHeight, scrollTop: body.scrollTop, loadingPlaceholders: Array.from(body.querySelectorAll('img')).filter((image) => /loading\.gif/i.test(image.src)).length };
        });
        assert.equal(scrollContract.scrollable, true, '긴 미리보기 본문은 패널 내부에서 스크롤되어야 한다');
        assert.equal(scrollContract.scrollTop > 0, true);
        assert.equal(scrollContract.loadingPlaceholders, 0, '호스트 loading.gif보다 실제 lazy 이미지 주소를 우선해야 한다');
        await session.page.mouse.click(4, 4);
        assert.equal(await session.page.locator('#dcuf-post-preview').count(), 0, '패널 밖 빈 공간 클릭은 미리보기를 닫아야 한다');

        await session.page.evaluate(() => {
            const visible = Array.from(document.querySelectorAll('.custom-post-item a.post-title-link')).filter((link) => getComputedStyle(link.closest('.custom-post-item')).display !== 'none');
            window.__dcufMobileConvenienceModule._previewCache.clear();
            window.__dcufMobileConvenienceModule.openPreview(visible[0].href, '느린 요청', { mobile: false, x: 20, y: 20 });
            window.__dcufMobileConvenienceModule.openPreview(visible[1].href, '최신 요청', { mobile: false, x: 40, y: 40 });
        });
        await session.page.waitForFunction(() => /본문-/.test(document.querySelector('#dcuf-post-preview .dcuf-preview-body')?.textContent || ''));
        const title = await session.page.locator('#dcuf-post-preview .dcuf-preview-head strong').textContent();
        assert.equal(title, '최신 요청', '이전 요청은 취소되고 마지막 요청 패널만 남아야 한다');
    } finally { await session.close(); }
});

mobileTest('글 미리보기 패널은 좁은 visual viewport 안에 고정되고 테마 토큰을 사용한다', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, {
        storage: { ...noStatsStorage, [storageKeys.convenience]: { listRestore: true, recentHighlight: true, draftRecovery: true, postPreview: true } },
        viewport: { width: 640, height: 480 }
    });
    try {
        await session.goto('/board/lists?id=test');
        await session.page.evaluate(() => {
            const link = Array.from(document.querySelectorAll('.custom-post-item a.post-title-link')).find((item) => getComputedStyle(item.closest('.custom-post-item')).display !== 'none');
            window.__dcufMobileConvenienceModule.openPreview(link.href, link.textContent, { mobile: false, x: innerWidth - 2, y: innerHeight - 2, link });
        });
        await session.page.waitForSelector('#dcuf-post-preview');
        const geometry = await session.page.evaluate(() => {
            const panel = document.querySelector('#dcuf-post-preview');
            const rect = panel.getBoundingClientRect();
            const viewport = window.visualViewport;
            const left = viewport?.offsetLeft || 0;
            const top = viewport?.offsetTop || 0;
            const right = left + (viewport?.width || innerWidth);
            const bottom = top + (viewport?.height || innerHeight);
            const css = getComputedStyle(panel);
            return {
                inViewport: rect.left >= left - 1 && rect.top >= top - 1 && rect.right <= right + 1 && rect.bottom <= bottom + 1,
                maxHeight: parseFloat(css.maxHeight),
                usesThemeSurface: css.backgroundImage !== 'none' || css.backgroundColor !== 'rgba(0, 0, 0, 0)',
                titleFontSize: parseFloat(getComputedStyle(panel.querySelector('.dcuf-preview-head strong')).fontSize),
                bodyFontSize: parseFloat(getComputedStyle(panel.querySelector('.dcuf-preview-body')).fontSize),
                articleTitleFontSize: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dcuf-article-title-font-size')),
                articleBodyFontSize: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dcuf-article-body-font-size')),
                bodyOverflow: getComputedStyle(panel.querySelector('.dcuf-preview-body')).overflowY
            };
        });
        assert.equal(geometry.inViewport, true, JSON.stringify(geometry));
        assert.equal(geometry.maxHeight <= 456, true);
        assert.equal(geometry.usesThemeSurface, true);
        assert.equal(geometry.titleFontSize, geometry.articleTitleFontSize, '미리보기 제목은 본문 페이지 제목 확대값을 공유해야 한다');
        assert.equal(geometry.bodyFontSize, geometry.articleBodyFontSize, '미리보기 본문은 본문 페이지 글자 확대값을 공유해야 한다');
        assert.equal(geometry.bodyOverflow, 'auto');
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

mobileTest('글 미리보기는 목록 교체 때 전역 스크롤 취소 리스너를 교체한다', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, {
        storage: { ...noStatsStorage, [storageKeys.convenience]: { listRestore: true, recentHighlight: true, draftRecovery: true, postPreview: true } }
    });
    try {
        await session.goto('/board/lists?id=test');
        const contract = await session.page.evaluate(() => {
            const module = window.__dcufMobileConvenienceModule;
            const previous = module._previewWindowScrollHandler;
            const nativeRemove = window.removeEventListener;
            let removedPrevious = 0;
            window.removeEventListener = function (type, handler, options) {
                if (type === 'scroll' && handler === previous) removedPrevious += 1;
                return nativeRemove.call(this, type, handler, options);
            };
            const replacement = document.createElement('div');
            replacement.className = 'custom-mobile-list';
            document.body.appendChild(replacement);
            module.bindPreview(replacement);
            window.removeEventListener = nativeRemove;
            return { removedPrevious, replaced: previous !== module._previewWindowScrollHandler };
        });
        assert.equal(contract.removedPrevious, 1);
        assert.equal(contract.replaced, true);
    } finally { await session.close(); }
});

mobileTest('초안은 TTL·용량·민감정보 제외·성공 전 보존 계약을 지킨다', 'write', async ({ browser, server }) => {
    server.reset();
    const draftId = 'fixture-draft';
    const initialDraft = { version: 1, galleries: { 'mgallery:test': [{ id: draftId, subject: '복구 제목', bodyHtml: '<p>복구 본문</p>', headtext: '질문', savedAt: Date.now(), pendingSubmit: false }] } };
    const session = await createTestPage(browser, server.baseUrl, {
        storage: { ...noStatsStorage, [storageKeys.drafts]: initialDraft },
        gmBehavior: { writeDelayByKey: { [storageKeys.drafts]: 150 } },
        viewport: { width: 390, height: 844 }
    });
    try {
        await session.goto('/mgallery/board/write/?id=test');
        await session.page.waitForFunction(() => document.querySelector('#subject')?.value === '복구 제목');
        assert.equal(await session.page.locator('.note-editable').textContent(), '복구 본문');
        await session.page.locator('#name').fill('저장금지닉');
        await session.page.locator('#password').fill('저장금지비밀번호');
        await session.page.locator('#code').fill('저장금지캡차');
        await session.page.locator('#subject').fill('보존 제목');
        await session.page.locator('.note-editable').fill('보존 본문');
        await session.page.waitForTimeout(950);
        const contracts = await session.page.evaluate(async () => {
            const module = window.__dcufMobileConvenienceModule;
            const old = module.normalizeDraftStore({ version: 1, galleries: { 'mgallery:test': [{ id: 'old', subject: 'old', bodyHtml: '', headtext: '', savedAt: Date.now() - module.DRAFT_TTL - 1 }] } });
            const tooLarge = await module.upsertDraft('mgallery:test', { id: 'large', subject: '', bodyHtml: 'x'.repeat(module.DRAFT_MAX_BYTES + 10), headtext: '', savedAt: Date.now(), pendingSubmit: false });
            const stored = window.__dcufTestbedGM.snapshot().values.dcuf_mobile_write_drafts_v1;
            return { oldCount: old.galleries['mgallery:test']?.length || 0, tooLarge, serialized: JSON.stringify(stored) };
        });
        assert.equal(contracts.oldCount, 0);
        assert.equal(contracts.tooLarge.reason, 'too-large');
        assert.equal(contracts.serialized.includes('저장금지닉'), false);
        assert.equal(contracts.serialized.includes('저장금지비밀번호'), false);
        assert.equal(contracts.serialized.includes('저장금지캡차'), false);
        await session.page.evaluate(() => {
            window.__dcufSubmitEvents = 0;
            document.addEventListener('submit', (event) => {
                if (event.target?.matches?.('form#write')) window.__dcufSubmitEvents += 1;
            }, true);
        });
        await session.page.locator('#write-submit').click();
        await session.page.waitForFunction(() => document.querySelector('form#write')?.dataset.submitStatus === 'done');
        await session.page.waitForFunction(() => window.__dcufTestbedGM.snapshot().values.dcuf_mobile_write_drafts_v1?.galleries?.['mgallery:test']?.[0]?.pendingSubmit === true);
        const pendingState = await session.page.evaluate(() => {
            const snapshot = window.__dcufTestbedGM.snapshot();
            const pendingWrite = [...snapshot.writes].reverse().find((entry) => entry.key === 'dcuf_mobile_write_drafts_v1' && entry.value?.galleries?.['mgallery:test']?.[0]?.pendingSubmit === true);
            return {
                pending: snapshot.values.dcuf_mobile_write_drafts_v1.galleries['mgallery:test'][0].pendingSubmit,
                pendingWriteTs: pendingWrite?.ts || 0,
                submitEvents: window.__dcufSubmitEvents,
                markerVersion: JSON.parse(sessionStorage.getItem('dcuf:pending-submit:v1') || 'null')?.version || 0
            };
        });
        const pending = pendingState.pending;
        assert.equal(pending, true, '성공 이동 전에는 초안을 지우지 않아야 한다');
        assert.equal(pendingState.submitEvents, 1, '한 번의 클릭은 공식 submit 이벤트도 정확히 한 번만 발생시켜야 한다');
        assert.equal(pendingState.markerVersion, 2, '첫 공식 submit 이벤트에서 성공 이동용 표식을 남겨야 한다');
        assert.equal(pendingState.pendingWriteTs > 0, true);
        await session.goto('/mgallery/board/view?id=test&no=9001');
        const remaining = await session.page.evaluate(() => window.__dcufTestbedGM.snapshot().values.dcuf_mobile_write_drafts_v1.galleries['mgallery:test'] || []);
        assert.equal(remaining.some((draft) => draft.id === draftId), false, '같은 갤러리 본문 성공 이동 뒤에만 제출 초안을 지워야 한다');

        await session.page.evaluate(async () => {
            await GM_setValue('dcuf_mobile_write_drafts_v1', { version: 1, galleries: { 'mgallery:test': [{ id: 'fast-success', subject: '빠른 성공', bodyHtml: '<p>빠른 성공</p>', headtext: '40', savedAt: Date.now(), pendingSubmit: false }] } });
            window.__dcufMobileConvenienceModule._draftStoreCache = null;
            sessionStorage.setItem('dcuf:pending-submit:v1', JSON.stringify({ version: 2, galleryKey: 'mgallery:test', draftId: 'fast-success', submittedAt: Date.now() }));
            await window.__dcufMobileConvenienceModule.confirmPendingDraftOnView();
        });
        const fastSuccess = await session.page.evaluate(() => window.__dcufTestbedGM.snapshot().values.dcuf_mobile_write_drafts_v1.galleries['mgallery:test'] || []);
        assert.equal(fastSuccess.some((draft) => draft.id === 'fast-success'), false, '성공 이동이 저장 완료보다 빨라도 v2 제출 표식의 초안은 남기지 않아야 한다');

        await session.page.evaluate(async () => {
            await GM_setValue('dcuf_mobile_write_drafts_v1', { version: 1, galleries: {} });
            window.__dcufMobileConvenienceModule._draftStoreCache = null;
            sessionStorage.setItem('dcuf:pending-submit:v1', JSON.stringify({ version: 2, galleryKey: 'mgallery:test', draftId: 'late-success', submittedAt: Date.now() }));
            await window.__dcufMobileConvenienceModule.confirmPendingDraftOnView();
            window.setTimeout(() => void GM_setValue('dcuf_mobile_write_drafts_v1', {
                version: 1,
                galleries: { 'mgallery:test': [{ id: 'late-success', subject: '늦은 저장', bodyHtml: '<p>늦은 저장</p>', headtext: '40', savedAt: Date.now(), pendingSubmit: true }] }
            }), 60);
        });
        await session.page.waitForTimeout(1050);
        const lateSuccess = await session.page.evaluate(() => window.__dcufTestbedGM.snapshot().values.dcuf_mobile_write_drafts_v1.galleries['mgallery:test'] || []);
        assert.equal(lateSuccess.some((draft) => draft.id === 'late-success'), false, '성공 화면의 초기 삭제 뒤 늦은 저장이 끝나도 제출 초안이 되살아나면 안 된다');
        await session.page.evaluate(async () => {
            await GM_setValue('dcuf_mobile_write_drafts_v1', { version: 1, galleries: { 'mgallery:test': [{ id: 'not-pending', subject: '보존', bodyHtml: '<p>보존</p>', headtext: '40', savedAt: Date.now(), pendingSubmit: false }] } });
            window.__dcufMobileConvenienceModule._draftStoreCache = null;
            sessionStorage.setItem('dcuf:pending-submit:v1', JSON.stringify({ galleryKey: 'mgallery:test', draftId: 'not-pending', submittedAt: Date.now() }));
        });
        await session.page.evaluate(async () => {
            history.pushState({}, '', '/mgallery/board/view?id=test&no=9002');
            await window.__dcufMobileConvenienceModule.confirmPendingDraftOnView();
        });
        const nonPending = await session.page.evaluate(() => window.__dcufTestbedGM.snapshot().values.dcuf_mobile_write_drafts_v1.galleries['mgallery:test'] || []);
        assert.equal(nonPending.some((draft) => draft.id === 'not-pending'), true, 'a stale marker must not delete a non-pending draft');
    } finally { await session.close(); }
});

mobileTest('공식 제출 뒤 글쓰기에서 목록으로 이동하면 해당 초안만 정리한다', 'write', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, {
        storage: noStatsStorage,
        viewport: { width: 390, height: 844 }
    });
    try {
        const navigateByFixtureLink = async (href) => {
            await session.page.evaluate((target) => {
                const link = document.createElement('a');
                link.id = 'fixture-draft-navigation';
                link.href = target;
                link.textContent = 'fixture navigation';
                document.body.appendChild(link);
            }, href);
            await Promise.all([
                session.page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
                session.page.locator('#fixture-draft-navigation').click()
            ]);
            await session.page.waitForFunction(() => document.documentElement.classList.contains('script-ui-ready'));
            await session.page.waitForTimeout(180);
        };
        await session.goto('/board/write/?id=test');
        await session.page.waitForFunction(() => document.querySelector('form#write')?._dcufDraftController);
        await session.page.evaluate(async () => {
            await GM_setValue('dcuf_mobile_write_drafts_v1', {
                version: 1,
                galleries: { 'board:test': [{ id: 'list-success', subject: '제출 제목', bodyHtml: '<p>제출 본문</p>', headtext: '', savedAt: Date.now(), pendingSubmit: false }] }
            });
            sessionStorage.setItem('dcuf:pending-submit:v1', JSON.stringify({ version: 2, galleryKey: 'board:test', draftId: 'list-success', submittedAt: Date.now() }));
        });
        await navigateByFixtureLink('/board/lists/?id=test');
        const successState = await session.page.evaluate(() => window.__dcufTestbedGM.snapshot().values.dcuf_mobile_write_drafts_v1?.galleries?.['board:test'] || []);
        assert.equal(successState.some((draft) => draft.id === 'list-success'), false, '글쓰기에서 목록으로 이어진 v2 성공 이동은 제출 초안을 지워야 한다');

        await session.goto('/board/view/?id=test&no=1001');
        await session.page.evaluate(async () => {
            await GM_setValue('dcuf_mobile_write_drafts_v1', {
                version: 1,
                galleries: { 'board:test': [{ id: 'ordinary-list', subject: '보존 제목', bodyHtml: '<p>보존 본문</p>', headtext: '', savedAt: Date.now(), pendingSubmit: false }] }
            });
            sessionStorage.setItem('dcuf:pending-submit:v1', JSON.stringify({ version: 2, galleryKey: 'board:test', draftId: 'ordinary-list', submittedAt: Date.now() }));
        });
        await navigateByFixtureLink('/board/lists/?id=test');
        const ordinaryState = await session.page.evaluate(() => window.__dcufTestbedGM.snapshot().values.dcuf_mobile_write_drafts_v1?.galleries?.['board:test'] || []);
        assert.equal(ordinaryState.some((draft) => draft.id === 'ordinary-list'), true, '본문에서 목록으로 이동한 경우에는 제출 초안을 임의로 지우면 안 된다');
    } finally { await session.close(); }
});

mobileTest('글쓰기 본문 초안은 동적 에디터 입력 직후 새로고침해도 복구한다', 'write', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, {
        storage: noStatsStorage,
        viewport: { width: 390, height: 844 }
    });
    try {
        await session.goto('/mgallery/board/write/?id=test');
        await session.page.waitForFunction(() => document.querySelector('form#write')?._dcufDraftController);
        await session.page.locator('[data-action="write-rerender-editor"]').click();
        await session.page.locator('#subject').fill('새로고침 제목');
        await session.page.locator('.note-editable').fill('새로고침 직전 본문');
        await session.page.waitForTimeout(60);
        await session.page.reload({ waitUntil: 'domcontentloaded' });
        await session.page.waitForFunction(() => document.querySelector('#subject')?.value === '새로고침 제목'
            && document.querySelector('.note-editable')?.textContent === '새로고침 직전 본문');
        const restored = await session.page.evaluate(() => ({
            subject: document.querySelector('#subject')?.value || '',
            body: document.querySelector('.note-editable')?.textContent || '',
            stored: window.__dcufTestbedGM.snapshot().values.dcuf_mobile_write_drafts_v1?.galleries?.['mgallery:test']?.[0] || null
        }));
        assert.equal(restored.subject, '새로고침 제목');
        assert.equal(restored.body, '새로고침 직전 본문');
        assert.equal(restored.stored?.bodyHtml.includes('새로고침 직전 본문'), true);
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

mobileTest('site write guide is never stored or restored as draft body', 'write', async ({ browser, server }) => {
    const guideHtml = '<div class="wrt_guide_preview_inn" contenteditable="false">AI guide<br>Read the rules</div>';
    const mixedSession = await createTestPage(browser, server.baseUrl, {
        storage: {
            ...noStatsStorage,
            [storageKeys.drafts]: {
                version: 1,
                galleries: {
                    'board:test': [{
                        id: 'legacy-guide-mixed', subject: 'legacy title',
                        bodyHtml: `${guideHtml}<p>user body</p>`, headtext: '',
                        savedAt: Date.now(), pendingSubmit: false
                    }]
                }
            }
        },
        viewport: { width: 390, height: 844 }
    });
    try {
        await mixedSession.goto('/board/write/?id=test&guide=1');
        await mixedSession.page.waitForFunction(() => document.querySelector('#subject')?.value === 'legacy title');
        const restored = await mixedSession.page.evaluate(() => ({
            body: document.querySelector('.note-editable')?.textContent || '',
            guideCount: document.querySelectorAll('.note-editable .wrt_guide_preview_inn').length,
            editable: document.querySelector('.note-editable')?.getAttribute('contenteditable')
        }));
        assert.equal(restored.body, 'user body', 'legacy draft should retain only user-authored body');
        assert.equal(restored.guideCount, 0, 'site-owned guide must be removed while restoring a legacy draft');
        assert.equal(restored.editable, 'true');

        await mixedSession.page.locator('.note-editable').fill('replacement body');
        await mixedSession.page.waitForTimeout(950);
        const stored = await mixedSession.page.evaluate(() => window.__dcufTestbedGM.snapshot().values.dcuf_mobile_write_drafts_v1.galleries['board:test'][0]);
        assert.equal(stored.bodyHtml.includes('wrt_guide_preview_inn'), false, 'a subsequent save must clean the persisted legacy draft');
        assert.equal(stored.bodyHtml.includes('replacement body'), true);
    } finally { await mixedSession.close(); }

    const guideOnlySession = await createTestPage(browser, server.baseUrl, {
        storage: {
            ...noStatsStorage,
            [storageKeys.drafts]: {
                version: 1,
                galleries: {
                    'board:test': [{
                        id: 'legacy-guide-only', subject: 'guide-only title',
                        bodyHtml: guideHtml, headtext: '', savedAt: Date.now(), pendingSubmit: false
                    }]
                }
            }
        },
        viewport: { width: 390, height: 844 }
    });
    try {
        await guideOnlySession.goto('/board/write/?id=test&guide=1');
        await guideOnlySession.page.waitForFunction(() => document.querySelector('#subject')?.value === 'guide-only title');
        assert.equal(await guideOnlySession.page.locator('.note-editable').textContent(), '', 'guide-only legacy body should restore as an empty editable body');
        await guideOnlySession.page.locator('.note-editable').fill('new writable body');
        await guideOnlySession.page.waitForTimeout(950);
        const stored = await guideOnlySession.page.evaluate(() => window.__dcufTestbedGM.snapshot().values.dcuf_mobile_write_drafts_v1.galleries['board:test'][0]);
        assert.equal(stored.bodyHtml.includes('new writable body'), true, 'the cleaned editor must accept and save new body text');
        assert.equal(stored.bodyHtml.includes('wrt_guide_preview_inn'), false);
    } finally { await guideOnlySession.close(); }

    const freshSession = await createTestPage(browser, server.baseUrl, {
        storage: noStatsStorage,
        viewport: { width: 390, height: 844 }
    });
    try {
        await freshSession.goto('/board/write/?id=test&guide=1');
        await freshSession.page.waitForFunction(() => document.querySelector('form#write')?._dcufDraftController);
        await freshSession.page.locator('#subject').fill('fresh title');
        await freshSession.page.waitForTimeout(950);
        const titleOnly = await freshSession.page.evaluate(() => window.__dcufTestbedGM.snapshot().values.dcuf_mobile_write_drafts_v1.galleries['board:test'][0]);
        assert.equal(titleOnly.bodyHtml.trim(), '', 'the untouched live guide must not become a newly saved body');

        await freshSession.page.evaluate(() => {
            const editor = document.querySelector('.note-editable');
            editor.insertAdjacentHTML('beforeend', '<p>fresh user body</p>');
            editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'fresh user body' }));
        });
        await freshSession.page.waitForTimeout(950);
        const withBody = await freshSession.page.evaluate(() => window.__dcufTestbedGM.snapshot().values.dcuf_mobile_write_drafts_v1.galleries['board:test'][0]);
        assert.equal(withBody.bodyHtml.includes('fresh user body'), true);
        assert.equal(withBody.bodyHtml.includes('wrt_guide_preview_inn'), false, 'mixed live content should retain user text without the guide');
    } finally { await freshSession.close(); }
});

mobileTest('빠른 글쓰기는 설정·플로팅 메뉴·런타임에서 제거되고 기존 저장값만 무시한다', 'functional', async ({ browser, server }) => {
    const staleSettings = { listRestore: true, recentHighlight: true, draftRecovery: true, postPreview: false, quickWrite: true };
    const session = await createTestPage(browser, server.baseUrl, {
        storage: { ...noStatsStorage, [storageKeys.convenience]: staleSettings },
        viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true
    });
    try {
        await session.goto('/mgallery/board/lists?id=test');
        await session.page.locator('#dc-personal-block-fab').click();
        await session.page.evaluate(() => window.__dcufMobileConvenienceModule.showSettings());
        const state = await session.page.evaluate(() => ({
            settings: window.__dcufMobileConvenienceModule.settings,
            quickModuleType: typeof window.__dcufQuickWriteModule,
            quickActionCount: document.querySelectorAll('[data-dcuf-fab-action="quick-write"]').length,
            settingsText: document.querySelector('#dcuf-mobile-convenience-settings')?.textContent || '',
            persisted: window.__dcufTestbedGM.snapshot().values.dcuf_mobile_convenience_settings_v1
        }));
        assert.deepEqual(state.settings, { listRestore: true, recentHighlight: true, draftRecovery: true, postPreview: false });
        assert.equal(state.quickModuleType, 'undefined');
        assert.equal(state.quickActionCount, 0);
        assert.equal(state.settingsText.includes('빠른 글쓰기'), false);
        assert.deepEqual(state.persisted, staleSettings, '기존 저장값은 파괴하지 않고 런타임 정규화에서만 무시한다');
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

obsoleteMobileTest('빠른 글쓰기는 공식 폼의 비회원·캡차·말머리·이미지·디시콘·중복 제출을 공유한다', 'write', async ({ browser, server }) => {
    server.reset();
    const convenience = { listRestore: true, recentHighlight: true, draftRecovery: true, postPreview: false, quickWrite: true };
    const session = await createTestPage(browser, server.baseUrl, { storage: { ...noStatsStorage, [storageKeys.convenience]: convenience }, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    try {
        await session.goto('/mgallery/board/lists?id=test');
        await session.page.locator('#dc-personal-block-fab').click();
        const quickAction = session.page.locator('[data-dcuf-fab-action="quick-write"]');
        assert.equal(await quickAction.isVisible(), true);
        await quickAction.click();
        await session.page.waitForURL(/\/mgallery\/board\/write/);
        await session.page.waitForFunction(() => window.__dcufQuickWriteModule?._form?.tagName === 'FORM', null, { timeout: 10000 });
        assert.equal(await session.page.locator('#dcuf-quick-write-frame').count(), 0, '빠른 글쓰기는 iframe이 아닌 공식 최상위 글쓰기 문맥을 사용해야 한다');
        assert.equal(await session.page.evaluate(() => window.__dcufQuickWriteModule._topLevel), true);
        assert.equal(await session.page.locator('#dcuf-quick-write .dcuf-qw-guest').isVisible(), true);
        assert.equal(await session.page.locator('#dcuf-quick-write .dcuf-qw-captcha').isVisible(), true);

        const remembered = await session.page.evaluate(() => {
            const quick = window.__dcufQuickWriteModule;
            const fields = quick.findOfficialFields();
            fields.name.value = '공식기억닉'; fields.password.value = 'official-remembered-password';
            quick._credentialTouched.clear(); quick.syncOfficialSurface();
            return {
                name: document.querySelector('.dcuf-qw-name').value,
                password: document.querySelector('.dcuf-qw-password').value,
                events: window.__dcufFixture.snapshot().credentialInputEvents
            };
        });
        assert.equal(remembered.name, '공식기억닉');
        assert.equal(remembered.password, 'official-remembered-password');
        assert.deepEqual(remembered.events, { name: 0, password: 0, code: 0 }, '공식 폼의 기억값을 읽을 때 입력 이벤트를 재발송하면 안 된다');

        const captchaBefore = await session.page.locator('.dcuf-qw-captcha-view .fixture-captcha-image').textContent();
        await session.page.locator('.dcuf-qw-name').fill('퀵닉');
        await session.page.locator('.dcuf-qw-password').fill('quick-password');
        await session.page.locator('.dcuf-qw-code').fill('CAPTCHA');
        const credentialEvents = await session.page.evaluate(() => window.__dcufFixture.snapshot().credentialInputEvents);
        assert.deepEqual(credentialEvents, { name: 1, password: 1, code: 1 }, '한 입력은 대응하는 공식 필드 하나에만 전달되어야 한다');
        assert.equal(await session.page.locator('.dcuf-qw-captcha-view .fixture-captcha-image').textContent(), captchaBefore, '캡차 답 입력만으로 캡차가 바뀌면 안 된다');
        assert.equal(await session.page.evaluate(() => window.__dcufFixture.snapshot().captchaGeneration), 0);
        await session.page.locator('.dcuf-qw-captcha-view button[aria-label="캡차 새로고침"]').evaluate((button) => button.click());
        await session.page.waitForFunction(() => window.__dcufFixture.snapshot().captchaGeneration === 1);
        await session.page.waitForFunction(() => document.querySelector('.dcuf-qw-captcha-view .fixture-captcha-image')?.textContent === '3D8WA-1');
        const overflow = '가'.repeat(105);
        await session.page.locator('.dcuf-qw-input').fill(overflow);
        const splitOverflow = await session.page.evaluate(() => {
            const fields = window.__dcufQuickWriteModule.findOfficialFields();
            return { subjectLength: fields.subject.value.length, bodyText: fields.editor.textContent };
        });
        assert.equal(splitOverflow.subjectLength, 100);
        assert.equal(splitOverflow.bodyText, '가'.repeat(5));
        const overflowWithNewline = `${'나'.repeat(105)}\n둘째 줄`;
        await session.page.locator('.dcuf-qw-input').fill(overflowWithNewline);
        const splitOverflowWithNewline = await session.page.evaluate(() => {
            const fields = window.__dcufQuickWriteModule.findOfficialFields();
            return { subject: fields.subject.value, bodyText: fields.editor.textContent };
        });
        assert.equal(splitOverflowWithNewline.subject, '나'.repeat(100));
        assert.equal(splitOverflowWithNewline.bodyText, `${'나'.repeat(5)}둘째 줄`, 'first-line overflow must be preserved before the remaining body');
        const ime = await session.page.evaluate(() => {
            const input = document.querySelector('.dcuf-qw-input');
            const subject = window.__dcufQuickWriteModule.findOfficialFields().subject;
            input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '조' }));
            input.value = '조합중'; input.dispatchEvent(new InputEvent('input', { bubbles: true, data: '합' }));
            const during = subject.value;
            input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '조합중' }));
            return { duringLength: during.length, after: subject.value };
        });
        assert.equal(ime.duringLength, 100, 'IME 조합 중에는 제목/본문을 다시 분리하지 않아야 한다');
        assert.equal(ime.after, '조합중');
        await session.page.locator('.dcuf-qw-input').fill('퀵 제목\n퀵 본문');
        const official = await session.page.evaluate(() => {
            const fields = window.__dcufQuickWriteModule.findOfficialFields();
            return { subject: fields.subject.value, body: fields.textarea.value, name: fields.name.value, password: fields.password.value, code: fields.code.value };
        });
        assert.equal(official.subject, '퀵 제목');
        assert.equal(official.body.includes('퀵 본문'), true);
        assert.equal(official.name, '퀵닉'); assert.equal(official.password, 'quick-password'); assert.equal(official.code, 'CAPTCHA');

        await session.page.locator('.dcuf-qw-toggle').click();
        assert.equal(await session.page.evaluate(() => window.__dcufQuickWriteModule.findOfficialFields().file?.id), 'fixture-file-input', 'AI 이미지 프롬프트 파일 입력은 첨부 입력으로 선택하면 안 된다');
        const question = session.page.locator('.dcuf-qw-headtexts button').filter({ hasText: '질문' });
        await question.click();
        assert.equal(await session.page.evaluate(() => window.__dcufQuickWriteModule.findOfficialFields().headtext.value), '40', 'visible headtext labels must not overwrite the official numeric value');
        const dccon = session.page.locator('.dcuf-qw-dccon-grid button').filter({ has: session.page.locator('img[alt="테스트 디시콘"]') });
        await dccon.click();
        assert.equal(await session.page.evaluate(() => window.__dcufQuickWriteModule._hasDccon), true);

        await session.page.locator('#fixture-file-input').setInputFiles({ name: 'quick.png', mimeType: 'image/png', buffer: Buffer.from([137, 80, 78, 71]) });
        await session.page.waitForFunction(() => window.__dcufQuickWriteModule._hasAttachment === true);
        assert.equal(await session.page.locator('.dcuf-qw-attachments img[data-fixture-uploaded-media="quick.png"]').count(), 1, 'uploaded media preview must be reflected in the quick panel');
        await session.page.evaluate(() => { const button = document.querySelector('.dcuf-qw-submit'); button.click(); button.click(); });
        await session.page.waitForFunction(() => window.__dcufQuickWriteModule?._form?.dataset.submitStatus === 'done');
        assert.equal(server.state.writeSubmissions.length, 1, '공식 폼 제출은 중복 잠금으로 한 번만 전송되어야 한다');
        assert.equal(server.state.writeSubmissions[0].values.subject, '퀵 제목');
        assert.equal(server.state.writeSubmissions[0].values.memo.includes('퀵 본문'), true);
        assert.equal(server.state.writeSubmissions[0].values.memo.includes('data-fixture-dccon-media'), true, 'DCCon markup must survive final quick-text synchronization');
        assert.equal(server.state.writeSubmissions[0].values.memo.includes('data-fixture-uploaded-media'), true, 'uploaded editor media must survive final quick-text synchronization');
        const draftSerialized = await session.page.evaluate(() => JSON.stringify(window.__dcufTestbedGM.snapshot().values.dcuf_mobile_write_drafts_v1 || {}));
        assert.equal(draftSerialized.includes('quick-password'), false);
        assert.equal(draftSerialized.includes('CAPTCHA'), false);
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

obsoleteMobileTest('빠른 글쓰기는 로그인 표면·등록 오류·전체 글쓰기 fallback에서 입력과 초안을 보존한다', 'write', async ({ browser, server }) => {
    server.reset();
    const convenience = { listRestore: true, recentHighlight: true, draftRecovery: true, postPreview: false, quickWrite: true };
    const session = await createTestPage(browser, server.baseUrl, {
        storage: { ...noStatsStorage, [storageKeys.convenience]: convenience },
        viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true
    });
    try {
        await session.goto('/mgallery/board/lists?id=test');
        await session.page.locator('#dc-personal-block-fab').click();
        await session.page.locator('[data-dcuf-fab-action="quick-write"]').click();
        await session.page.waitForURL(/\/mgallery\/board\/write/);
        await session.page.waitForFunction(() => window.__dcufQuickWriteModule?._form?.tagName === 'FORM', null, { timeout: 10000 });

        const loggedInSurface = await session.page.evaluate(() => {
            const quick = window.__dcufQuickWriteModule;
            const fields = quick.findOfficialFields();
            fields.name?.remove(); fields.password?.remove(); fields.code?.remove();
            quick.syncOfficialSurface();
            const panel = document.querySelector('#dcuf-quick-write');
            const rect = panel.getBoundingClientRect();
            return {
                guestHidden: panel.querySelector('.dcuf-qw-guest').hidden,
                captchaHidden: panel.querySelector('.dcuf-qw-captcha').hidden,
                parentOwned: panel.parentElement === document.body,
                noFrame: !document.querySelector('#dcuf-quick-write-frame'),
                topLevel: quick._topLevel,
                viewportHandler: typeof quick._viewportHandler === 'function',
                observerActive: Boolean(quick._observer),
                zIndex: Number(getComputedStyle(panel).zIndex),
                inViewport: rect.left >= 0 && rect.right <= innerWidth + 1 && rect.bottom <= innerHeight + 1
            };
        });
        assert.equal(loggedInSurface.guestHidden, true);
        assert.equal(loggedInSurface.captchaHidden, true);
        assert.equal(loggedInSurface.parentOwned, true);
        assert.equal(loggedInSurface.noFrame, true);
        assert.equal(loggedInSurface.topLevel, true);
        assert.equal(loggedInSurface.viewportHandler, true);
        assert.equal(loggedInSurface.observerActive, true);
        assert.equal(loggedInSurface.zIndex, 2147483645);
        assert.equal(loggedInSurface.inViewport, true);

        const initialErrorContract = await session.page.evaluate(async () => {
            const quick = window.__dcufQuickWriteModule;
            const error = document.createElement('div');
            error.className = 'write_error'; error.textContent = '초기 공식 오류';
            quick._form.appendChild(error);
            quick.syncOfficialSurface();
            const state = { text: document.querySelector('.dcuf-qw-status').textContent, error: document.querySelector('.dcuf-qw-status').dataset.error };
            error.remove(); quick.setStatus('공식 글쓰기 페이지 연결 완료');
            return state;
        });
        assert.equal(initialErrorContract.text, '초기 공식 오류');
        assert.equal(initialErrorContract.error, '1', 'initial official errors must not be overwritten by the connected status');

        await session.page.locator('.dcuf-qw-input').fill('오류 제목\n오류 본문');
        await session.page.evaluate(async () => {
            const quick = window.__dcufQuickWriteModule;
            quick._submitting = true;
            quick.syncSubmitState();
            await quick.saveDraft(true);
            sessionStorage.setItem('dcuf:pending-submit:v1', JSON.stringify({ galleryKey: quick._galleryKey, draftId: quick._draftId, submittedAt: Date.now() }));
            quick._form.dataset.submitStatus = 'failed';
            quick.syncOfficialSurface();
        });
        await session.page.waitForFunction(() => window.__dcufQuickWriteModule?._form?.dataset.submitStatus === 'failed');
        await session.page.waitForFunction(() => {
            const quick = window.__dcufQuickWriteModule;
            const drafts = window.__dcufTestbedGM.snapshot().values.dcuf_mobile_write_drafts_v1?.galleries?.['mgallery:test'] || [];
            return drafts.some((draft) => draft.id === quick._draftId && draft.pendingSubmit === false);
        });
        const failed = await session.page.evaluate(() => {
            const quick = window.__dcufQuickWriteModule;
            const drafts = window.__dcufTestbedGM.snapshot().values.dcuf_mobile_write_drafts_v1.galleries['mgallery:test'];
            const draft = drafts.find((item) => item.id === quick._draftId);
            return {
                input: document.querySelector('.dcuf-qw-input').value,
                status: document.querySelector('.dcuf-qw-status').textContent,
                error: document.querySelector('.dcuf-qw-status').dataset.error,
                submitting: quick._submitting,
                pendingSubmit: draft.pendingSubmit,
                bodyHtml: draft.bodyHtml,
                submitMarker: sessionStorage.getItem('dcuf:pending-submit:v1')
            };
        });
        assert.equal(failed.input, '오류 제목\n오류 본문');
        assert.equal(failed.status.includes('거부'), true);
        assert.equal(failed.error, '1'); assert.equal(failed.submitting, false); assert.equal(failed.pendingSubmit, false);
        assert.equal(failed.bodyHtml.includes('오류 본문'), true); assert.equal(failed.submitMarker, null);
        assert.equal(server.state.writeSubmissions.length, 0);

        const closeWhileSubmitting = await session.page.evaluate(async () => {
            const quick = window.__dcufQuickWriteModule;
            quick._submitting = true; quick.syncSubmitState();
            const closed = await quick.close();
            const panelPresent = Boolean(document.querySelector('#dcuf-quick-write'));
            quick._submitting = false; quick.syncSubmitState();
            return { closed, panelPresent };
        });
        assert.deepEqual(closeWhileSubmitting, { closed: false, panelPresent: true }, 'quick write must not close while an official submission is unresolved');

        await session.page.evaluate(() => void window.__dcufQuickWriteModule.close({ force: true }));
        await session.page.waitForURL(/\/mgallery\/board\/lists/);
        await session.page.locator('#dc-personal-block-fab').click();
        await session.page.locator('[data-dcuf-fab-action="quick-write"]').click();
        await session.page.waitForURL(/\/mgallery\/board\/write/);
        await session.page.waitForFunction(() => window.__dcufQuickWriteModule?._form?.tagName === 'FORM', null, { timeout: 10000 });
        const restored = await session.page.evaluate(() => ({
            quick: document.querySelector('.dcuf-qw-input')?.value || '',
            subject: document.querySelector('#subject')?.value || '',
            body: document.querySelector('.note-editable')?.textContent || '',
            draftId: window.__dcufQuickWriteModule._draftId,
            drafts: window.__dcufTestbedGM.snapshot().values.dcuf_mobile_write_drafts_v1?.galleries?.['mgallery:test'] || []
        }));
        assert.equal(restored.quick, '오류 제목\n오류 본문', `빠른 글쓰기 재진입 시 제목과 본문을 함께 복구해야 한다: ${JSON.stringify(restored)}`);

        await session.page.evaluate(() => void window.__dcufQuickWriteModule.close({ force: true }));
        await session.page.waitForURL(/\/mgallery\/board\/lists/);
        await session.page.evaluate(() => {
            sessionStorage.setItem('dcuf:quick-write-launch:v2', JSON.stringify({
                galleryKey: 'mgallery:test', returnUrl: location.href,
                writeUrl: new URL('/mgallery/board/write/?id=test', location.href).href,
                openedAt: Date.now() - 5 * 60 * 1000
            }));
        });
        await session.goto('/mgallery/board/write/?id=test');
        await session.page.waitForFunction(() => document.querySelector('form#write')?.dataset.dcufWriteTransformed === '1');
        assert.equal(await session.page.locator('#dcuf-quick-write').count(), 0, '만료되거나 초기화에 실패한 실행 표식은 전체 공식 글쓰기를 막으면 안 된다');
        assert.equal(await session.page.locator('form#write #subject').isEditable(), true);
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

obsoleteMobileTest('빠른 글쓰기는 빈 패널을 닫아도 빈 초안을 만들지 않는다', 'write', async ({ browser, server }) => {
    const convenience = { listRestore: true, recentHighlight: true, draftRecovery: true, postPreview: false, quickWrite: true };
    const session = await createTestPage(browser, server.baseUrl, {
        storage: { ...noStatsStorage, [storageKeys.convenience]: convenience },
        viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true
    });
    try {
        await session.goto('/mgallery/board/lists?id=test');
        await session.page.evaluate(() => void window.__dcufQuickWriteModule.open());
        await session.page.waitForURL(/\/mgallery\/board\/write/);
        await session.page.waitForFunction(() => window.__dcufQuickWriteModule?._form?.tagName === 'FORM');
        await session.page.evaluate(() => void window.__dcufQuickWriteModule.close({ force: true }));
        await session.page.waitForURL(/\/mgallery\/board\/lists/);
        const drafts = await session.page.evaluate(() => window.__dcufTestbedGM.snapshot().values.dcuf_mobile_write_drafts_v1?.galleries?.['mgallery:test'] || []);
        assert.equal(drafts.length, 0);
    } finally { await session.close(); }
});

obsoleteMobileTest('빠른 글쓰기는 목록을 유지한 채 공식 백그라운드 폼과 양방향 동기화한다', 'write', async ({ browser, server }) => {
    server.reset();
    const convenience = { listRestore: true, recentHighlight: true, draftRecovery: true, postPreview: false, quickWrite: true };
    const session = await createTestPage(browser, server.baseUrl, {
        storage: { ...noStatsStorage, [storageKeys.convenience]: convenience },
        viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true
    });
    let helper = null;
    const helperConsoleErrors = [];
    try {
        await session.goto('/mgallery/board/lists?id=test');
        await session.page.locator('#dc-personal-block-fab').click();
        const helperPromise = session.context.waitForEvent('page');
        await session.page.locator('[data-dcuf-fab-action="quick-write"]').click();
        helper = await helperPromise;
        helper.on('console', (message) => { if (message.type() === 'error') helperConsoleErrors.push(message.text()); });
        await helper.waitForSelector('form#write');
        await helper.waitForTimeout(600);
        const helperBoot = await helper.evaluate(() => ({
            url: location.href,
            title: document.title,
            bodyPage: document.body?.dataset.fixturePage || '',
            moduleType: typeof window.__dcufQuickWriteModule,
            readyState: document.readyState,
            role: window.__dcufQuickWriteModule?._role || '',
            hasForm: window.__dcufQuickWriteModule?._form instanceof HTMLFormElement,
            marker: sessionStorage.getItem('dcuf:quick-write-helper:v1'),
            hash: location.hash,
            transformed: document.querySelector('form#write')?.dataset.dcufWriteTransformed || ''
        }));
        assert.equal(helperBoot.role, 'helper', `helper bridge did not start: ${JSON.stringify(helperBoot)}`);
        assert.equal(helperBoot.hasForm, true, `official form was not claimed: ${JSON.stringify(helperBoot)}`);
        await session.page.waitForFunction(() => !document.querySelector('.dcuf-qw-input')?.disabled);

        assert.match(session.page.url(), /\/mgallery\/board\/lists/, '목록 탭은 공식 글쓰기 연결 중에도 이동하면 안 된다');
        assert.match(helper.url(), /\/mgallery\/board\/write/, '공식 폼은 별도 최상위 탭에서 실행되어야 한다');
        assert.equal(await session.page.locator('#dcuf-quick-write-frame').count(), 0);
        assert.deepEqual(await session.page.evaluate(() => window.__dcufTestbedGM.snapshot().openedTabs[0]?.options), {
            active: false, insert: true, setParent: true
        });

        await helper.evaluate(() => {
            const quick = window.__dcufQuickWriteModule;
            const fields = quick.findOfficialFields();
            fields.name.value = '공식기억닉';
            fields.password.value = 'official-remembered-password';
            quick.syncOfficialSurface();
        });
        await session.page.waitForFunction(() => document.querySelector('.dcuf-qw-name')?.value === '공식기억닉');
        assert.equal(await session.page.locator('.dcuf-qw-password').inputValue(), 'official-remembered-password');

        const captchaBefore = await session.page.locator('.dcuf-qw-captcha-view').textContent();
        await session.page.locator('.dcuf-qw-name').fill('퀵닉');
        await session.page.locator('.dcuf-qw-password').fill('quick-password');
        await session.page.locator('.dcuf-qw-code').fill('CAPTCHA');
        await helper.waitForFunction(() => document.querySelector('#name')?.value === '퀵닉'
            && document.querySelector('#password')?.value === 'quick-password'
            && document.querySelector('#code')?.value === 'CAPTCHA');
        assert.equal(await session.page.locator('.dcuf-qw-captcha-view').textContent(), captchaBefore, '캡차 답 입력만으로 캡차를 새로 만들면 안 된다');
        assert.equal(await helper.evaluate(() => window.__dcufFixture.snapshot().captchaGeneration), 0);
        await session.page.locator('.dcuf-qw-captcha-view button[aria-label="캡차 새로고침"]').click();
        await helper.waitForFunction(() => window.__dcufFixture.snapshot().captchaGeneration === 1);
        await session.page.waitForFunction(() => document.querySelector('.dcuf-qw-captcha-view')?.textContent.includes('3D8WA-1'));

        await session.page.locator('.dcuf-qw-input').fill(`${'가'.repeat(105)}\n둘째 줄`);
        await helper.waitForFunction(() => document.querySelector('#subject')?.value.length === 100
            && document.querySelector('.note-editable')?.textContent === `${'가'.repeat(5)}둘째 줄`);
        await session.page.locator('.dcuf-qw-input').fill('퀵 제목\n퀵 본문');
        await session.page.locator('.dcuf-qw-toggle').click();
        await session.page.waitForFunction(() => Array.from(document.querySelectorAll('.dcuf-qw-headtexts button')).some((button) => button.textContent.includes('질문')));
        await session.page.locator('.dcuf-qw-headtexts button').filter({ hasText: '질문' }).click();
        await helper.waitForFunction(() => document.querySelector('input[name="headtext"]')?.value === '40');

        const dcconLoad = session.page.locator('.dcuf-qw-dccon-grid button').filter({ hasText: /공식 디시콘 불러/ });
        if (await dcconLoad.count()) await dcconLoad.click();
        await session.page.waitForFunction(() => document.querySelector('.dcuf-qw-dccon-grid img[alt="테스트 디시콘"]'));
        await session.page.locator('.dcuf-qw-dccon-grid button').filter({ has: session.page.locator('img[alt="테스트 디시콘"]') }).click();
        await helper.waitForFunction(() => window.__dcufQuickWriteModule?._hasDccon === true);

        await session.page.locator('.dcuf-qw-file-proxy').setInputFiles({ name: 'quick.png', mimeType: 'image/png', buffer: Buffer.from([137, 80, 78, 71]) });
        await helper.waitForFunction(() => window.__dcufQuickWriteModule?._hasAttachment === true);
        await session.page.waitForFunction(() => document.querySelector('.dcuf-qw-attachments img[alt="quick.png"]'));
        await helper.waitForTimeout(900);
        const helperDraft = await helper.evaluate(() => JSON.stringify(window.__dcufTestbedGM.snapshot().values.dcuf_mobile_write_drafts_v1 || {}));
        assert.equal(helperDraft.includes('퀵 본문'), true, '공식 폼의 본문까지 초안으로 저장되어야 한다');
        assert.equal(helperDraft.includes('quick-password'), false);
        assert.equal(helperDraft.includes('CAPTCHA'), false);

        await session.page.evaluate(() => {
            const button = document.querySelector('.dcuf-qw-submit');
            button.click(); button.click();
        });
        await session.page.waitForFunction(() => document.querySelector('.dcuf-qw-actions a')?.textContent === '등록한 글 열기');
        assert.equal(server.state.writeSubmissions.length, 1, '공식 제출은 중복 클릭에도 한 번만 실행되어야 한다');
        assert.equal(server.state.writeSubmissions[0].values.subject, '퀵 제목');
        assert.equal(server.state.writeSubmissions[0].values.memo.includes('퀵 본문'), true);
        assert.equal(server.state.writeSubmissions[0].values.memo.includes('data-fixture-dccon-media'), true);
        assert.equal(server.state.writeSubmissions[0].values.memo.includes('data-fixture-uploaded-media'), true);
        assert.match(session.page.url(), /\/mgallery\/board\/lists/, '등록 성공 뒤에도 목록 위치를 유지해야 한다');
        assert.match(await session.page.locator('.dcuf-qw-actions a').getAttribute('href'), /\/mgallery\/board\/view\?id=test&no=9001/);
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
        if (!helper.isClosed()) assertNoRuntimeErrors(await getMetrics(helper), helperConsoleErrors);
    } finally { await session.close(); }
});

obsoleteMobileTest('빠른 글쓰기는 공식 탭 실패를 목록 안 fallback으로 처리한다', 'write', async ({ browser, server }) => {
    const convenience = { listRestore: true, recentHighlight: true, draftRecovery: true, postPreview: false, quickWrite: true };
    const session = await createTestPage(browser, server.baseUrl, {
        storage: { ...noStatsStorage, [storageKeys.convenience]: convenience },
        viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true
    });
    try {
        await session.goto('/mgallery/board/lists?id=test');
        await session.page.evaluate(() => { globalThis.GM_openInTab = undefined; });
        await session.page.evaluate(() => void window.__dcufQuickWriteModule.open());
        const state = await session.page.evaluate(() => ({
            url: location.href,
            status: document.querySelector('.dcuf-qw-status')?.textContent || '',
            action: document.querySelector('.dcuf-qw-actions button')?.textContent || '',
            panelInBody: document.querySelector('#dcuf-quick-write')?.parentElement === document.body
        }));
        assert.match(state.url, /\/mgallery\/board\/lists/);
        assert.equal(state.status.includes('열 수 없습니다'), true);
        assert.equal(state.action, '공식 글쓰기 탭으로 계속');
        assert.equal(state.panelInBody, true);
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

obsoleteMobileTest('초안 복구를 끄면 빠른 글쓰기 transfer가 기존 폼을 덮어쓰지 않는다', 'write', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, {
        storage: { ...noStatsStorage, [storageKeys.convenience]: { listRestore: true, recentHighlight: true, draftRecovery: false, postPreview: false, quickWrite: true } },
        viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true
    });
    try {
        await session.context.addInitScript(() => {
            sessionStorage.setItem('dcuf:quick-write-transfer:v1', JSON.stringify({ galleryKey: 'mgallery:test', subject: '옮기면 안 됨', bodyHtml: '<p>옮기면 안 됨</p>', headtext: '40', savedAt: Date.now() }));
        });
        await session.goto('/mgallery/board/write/?id=test');
        const state = await session.page.evaluate(() => ({
            subject: document.querySelector('#subject')?.value || '',
            body: document.querySelector('.note-editable')?.textContent || '',
            markerPresent: Boolean(sessionStorage.getItem('dcuf:quick-write-transfer:v1'))
        }));
        assert.equal(state.subject, '');
        assert.equal(state.body, '');
        assert.equal(state.markerPresent, true, 'disabled recovery must leave the transfer available instead of consuming it');
    } finally { await session.close(); }
});

mobileTest('글쓰기: 메이저·마이너 원본 폼 계약과 모바일 변환이 초기화된다', 'write', async ({ browser, server }) => {
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

mobileTest('write cancel confirmation remains visible and interactive', 'write', async ({ browser, server }) => {
    const scenarios = [
        { name: 'major-desktop', pathname: '/board/write/?id=test', viewport: { width: 1280, height: 900 } },
        { name: 'minor-desktop', pathname: '/mgallery/board/write/?id=test', viewport: { width: 1280, height: 900 } },
        { name: 'minor-mobile', pathname: '/mgallery/board/write/?id=test', viewport: { width: 390, height: 844 }, dark: true },
        {
            name: 'minor-desktop-site-mobile',
            pathname: '/mgallery/board/write/?id=test',
            viewport: { width: 980, height: 1800 },
            screen: { width: 412, height: 915 },
            deviceScaleFactor: 2.625,
            hasTouch: true
        }
    ];
    for (const scenario of scenarios) {
        const session = await createTestPage(browser, server.baseUrl, {
            storage: noStatsStorage,
            viewport: scenario.viewport,
            screen: scenario.screen,
            deviceScaleFactor: scenario.deviceScaleFactor,
            hasTouch: scenario.hasTouch
        });
        try {
            await session.goto(scenario.pathname);
            if (scenario.dark) await session.page.evaluate(() => window.__dcufFixture.toggleDark(true));
            const cancel = session.page.locator('.fixture-write-actions > .btn_grey.cancle');
            await cancel.scrollIntoViewIfNeeded();
            assert.equal(await session.page.locator('body > #leave_confirm_box.dcuf-write-leave-confirm').count(), 1, `${scenario.name}: popup must keep its original node in the body portal`);
            await session.page.evaluate(() => {
                const popup = document.querySelector('#leave_confirm_box');
                window.__dcufFixtureFirstLeaveConfirmRect = null;
                const observer = new MutationObserver(() => {
                    if (window.__dcufFixtureFirstLeaveConfirmRect || getComputedStyle(popup).display === 'none') return;
                    const rect = popup.getBoundingClientRect();
                    window.__dcufFixtureFirstLeaveConfirmRect = {
                        centerX: rect.left + (rect.width / 2),
                        centerY: rect.top + (rect.height / 2)
                    };
                    observer.disconnect();
                });
                observer.observe(popup, { attributes: true, attributeFilter: ['style'] });
            });
            await cancel.click();
            const popupContract = await session.page.locator('#leave_confirm_box').evaluate((popup) => {
                const rect = popup.getBoundingClientRect();
                const centerX = rect.left + (rect.width / 2);
                const centerY = rect.top + (rect.height / 2);
                const sampleX = Math.max(1, Math.min(innerWidth - 1, centerX));
                const sampleY = Math.max(1, Math.min(innerHeight - 1, centerY));
                const hit = document.elementFromPoint(sampleX, sampleY);
                return {
                    display: getComputedStyle(popup).display,
                    position: getComputedStyle(popup).position,
                    insideViewport: rect.left >= 0 && rect.right <= innerWidth + 1 && rect.top >= 0 && rect.bottom <= innerHeight + 1,
                    centered: Math.abs(centerX - (innerWidth / 2)) <= 2 && Math.abs(centerY - (innerHeight / 2)) <= 2,
                    topmost: hit === popup || popup.contains(hit),
                    surface: getComputedStyle(popup).backgroundColor,
                    color: getComputedStyle(popup).color,
                    motion: {
                        animationName: getComputedStyle(popup).animationName,
                        transitionDuration: getComputedStyle(popup).transitionDuration
                    },
                    controls: Array.from(popup.querySelectorAll('.write_cont > .btn_box > button, .pop_content.write_ly > .poply_whiteclose')).map((button) => {
                        const buttonRect = button.getBoundingClientRect();
                        return { width: buttonRect.width, height: buttonRect.height };
                    }),
                    firstShownRect: window.__dcufFixtureFirstLeaveConfirmRect
                };
            });
            assert.equal(popupContract.display, 'block', `${scenario.name}: popup display`);
            assert.equal(popupContract.position, 'fixed', `${scenario.name}: popup position`);
            assert.equal(popupContract.insideViewport, true, `${scenario.name}: popup viewport bounds`);
            assert.equal(popupContract.centered, true, `${scenario.name}: popup viewport centering`);
            assert.equal(popupContract.topmost, true, `${scenario.name}: popup hit testing`);
            assert.notEqual(popupContract.surface, 'rgba(0, 0, 0, 0)', `${scenario.name}: popup surface`);
            assert.notEqual(popupContract.color, popupContract.surface, `${scenario.name}: popup contrast`);
            assert.equal(popupContract.motion.animationName, 'none', `${scenario.name}: popup animation`);
            assert.equal(popupContract.motion.transitionDuration, '0s', `${scenario.name}: popup transition`);
            assert.equal(popupContract.controls.length, 3, `${scenario.name}: popup controls`);
            assert.equal(popupContract.controls.every((control) => control.width >= 44 && control.height >= 44), true, `${scenario.name}: popup control targets`);
            assert.equal(Boolean(popupContract.firstShownRect), true, `${scenario.name}: first shown frame`);
            assert.equal(Math.abs(popupContract.firstShownRect.centerX - (scenario.viewport.width / 2)) <= 2, true, `${scenario.name}: first shown horizontal center`);
            assert.equal(Math.abs(popupContract.firstShownRect.centerY - (scenario.viewport.height / 2)) <= 2, true, `${scenario.name}: first shown vertical center`);
            assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
        } finally { await session.close(); }
    }
});

mobileTest('글쓰기: 입력·말머리·에디터 재렌더·HTML 전환에도 작성값이 보존된다', 'write', async ({ browser, server }) => {
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
                dcconGroupPosition: getComputedStyle(document.querySelector('button[aria-label="디시콘"]').closest('.note-btn-group')).position,
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
        assert.equal(snapshot.headtext, '30');
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
        const clickValue = await clickTarget.getAttribute('data-no');
        await clickTarget.click();
        assert.equal(await session.page.locator('[name="headtext"]').inputValue(), clickValue, 'a normal pointer click must select a headtext');
        assert.equal(await clickTarget.evaluate((element) => element.classList.contains('active')), true);
        await session.page.waitForTimeout(350);

        const jitterTarget = session.page.locator('.subject_list > li').nth(2);
        const jitterValue = await jitterTarget.getAttribute('data-no');
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
        const postDragValue = await postDragTarget.getAttribute('data-no');
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

mobileTest('글쓰기: 네이티브 모바일 기준 fixture는 가로 넘침 없이 핵심 터치 UI를 제공한다', 'write', async ({ browser, server }) => {
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
                        const surfaceProbe = document.createElement('span');
                        surfaceProbe.style.cssText = 'position:fixed;visibility:hidden;background:var(--dcuf-theme-surface)';
                        document.body.appendChild(surfaceProbe);
                        const expectedSubjectBackground = getComputedStyle(surfaceProbe).backgroundColor;
                        surfaceProbe.style.background = 'var(--dcuf-theme-surface-input)';
                        const expectedInputBackground = getComputedStyle(surfaceProbe).backgroundColor;
                        surfaceProbe.remove();
                        return {
                            actionRadius: parseFloat(actions.borderRadius) || 0,
                            cancelBackground: cancel.backgroundColor,
                            submitBackground: submit.backgroundImage === 'none' ? submit.backgroundColor : submit.backgroundImage,
                            submitColor: submit.color,
                            submitRadius: parseFloat(submit.borderRadius) || 0,
                            htmlBeforeContent: getComputedStyle(htmlGroup, '::before').content,
                            htmlContained: htmlRect.top >= toolbarRect.top - 1 && htmlRect.bottom <= toolbarRect.bottom + 1,
                            subjectBackground: subjectPanel ? getComputedStyle(subjectPanel).backgroundColor : null,
                            expectedSubjectBackground,
                            expectedInputBackground,
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
                assert.equal(report.visual.subjectBackground, report.visual.expectedSubjectBackground);
                assert.equal(report.visual.subjectRadius >= 12, true);
                assert.equal(report.visual.headtextLabelInset.top >= 5, true);
                assert.equal(report.visual.headtextLabelInset.left >= 5, true);
                assert.equal(report.visual.headtextLabelInset.bottom >= 5, true);
                assert.equal(report.visual.headtextMaxGap <= 4, true, `headtext gap: ${report.visual.headtextMaxGap}`);
                assert.equal(report.visual.headtextOuterOverflow, 'visible');
                assert.equal(report.visual.headtextListOverflow, 'auto');
                assert.equal(report.visual.headtextScrollbarWidth, 'none');
                assert.equal(report.visual.headtextScrollable, true);
                assert.equal(report.visual.captchaBackground, report.visual.expectedInputBackground);
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

const collectPaletteSurfaceContract = (page, entries) => page.evaluate((items) => {
    const probes = new Map();
    const resolveToken = (token) => {
        if (probes.has(token)) return probes.get(token);
        const probe = document.createElement('span');
        probe.style.cssText = `position:fixed;left:-9999px;background-color:var(${token})`;
        document.documentElement.appendChild(probe);
        const value = getComputedStyle(probe).backgroundColor;
        probe.remove();
        probes.set(token, value);
        return value;
    };
    return items.map(({ selector, token }) => {
        const element = document.querySelector(selector);
        return {
            selector,
            token,
            expected: resolveToken(token),
            actual: element ? getComputedStyle(element).backgroundColor : null
        };
    });
}, entries);

const assertPaletteSurfaces = (contract, label) => {
    contract.forEach(({ selector, token, expected, actual }) => {
        assert.notEqual(actual, null, `${label}: missing ${selector}`);
        assert.equal(actual, expected, `${label}: ${selector} must use ${token}; actual=${actual} expected=${expected}`);
    });
};

mobileTest('modify password surface uses the mobile card UI and removes trailing host chrome', 'write', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, {
        storage: { ...noStatsStorage, [storageKeys.palette]: 'orange' },
        viewport: { width: 390, height: 844 }
    });
    try {
        await session.goto('/board/modify/?id=test&no=1001');
        const contract = await session.page.evaluate(() => {
            const form = document.querySelector('form[name="password_confirm"]');
            const card = document.querySelector('.no_memberwrap');
            const input = document.querySelector('#password');
            const confirm = document.querySelector('.btn_ok');
            const rect = card.getBoundingClientRect();
            return {
                pageContext: { ...window.__dcufPageContext },
                surface: document.documentElement.getAttribute('data-dcuf-modify-surface'),
                bodyClass: document.body.className,
                formClass: form.className,
                formAction: form.getAttribute('action'),
                hiddenNo: form.querySelector('input[name="no"]')?.value,
                inputAutocomplete: input.autocomplete,
                inputAriaLabel: input.getAttribute('aria-label'),
                cardWidth: rect.width,
                viewportWidth: innerWidth,
                cardRadius: getComputedStyle(card).borderRadius,
                confirmBackground: getComputedStyle(confirm).backgroundColor,
                footerDisplay: getComputedStyle(document.querySelector('footer.dcfoot')).display,
                dataInfoDisplay: getComputedStyle(document.querySelector('#data_info')).display,
                modifyStyleCount: document.querySelectorAll('#dcuf-mobile-modify-theme').length,
                writeStyleCount: document.querySelectorAll('#dcuf-mobile-write-theme').length,
                modifySubscribers: window.__dcufRuntimeCoordinator?._mutationSubscribers?.has('ui-modify-surface') || false
            };
        });
        assert.deepEqual({
            type: contract.pageContext.type,
            isModify: contract.pageContext.isModify,
            isWrite: contract.pageContext.isWrite,
            isWriteSurface: contract.pageContext.isWriteSurface,
            isTargetPage: contract.pageContext.isTargetPage
        }, { type: 'modify', isModify: true, isWrite: false, isWriteSurface: true, isTargetPage: true });
        assert.equal(contract.surface, 'password');
        assert.equal(contract.bodyClass.includes('is-modify-password-page'), true, contract.bodyClass);
        assert.equal(contract.formClass.includes('dcuf-modify-password-form'), true, contract.formClass);
        assert.equal(contract.formAction, '/__testbed/modify_password_submit');
        assert.equal(contract.hiddenNo, '1001');
        assert.equal(contract.inputAutocomplete, 'current-password');
        assert.equal(contract.inputAriaLabel, '비밀번호');
        assert.equal(contract.cardWidth <= contract.viewportWidth - 20, true, JSON.stringify(contract));
        assert.equal(contract.cardRadius, '20px');
        assert.equal(contract.confirmBackground, 'rgb(154, 52, 18)');
        assert.equal(contract.footerDisplay, 'none');
        assert.equal(contract.dataInfoDisplay, 'none');
        assert.equal(contract.modifyStyleCount, 1);
        assert.equal(contract.writeStyleCount, 1);
        assert.equal(contract.modifySubscribers, true);
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

mobileTest('modify editor surface reuses the write transformation without changing the route', 'write', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, {
        storage: { ...noStatsStorage, [storageKeys.palette]: 'orange' },
        viewport: { width: 390, height: 844 }
    });
    try {
        await session.goto('/board/modify/?id=test&no=1001&stage=editor');
        const contract = await session.page.evaluate(() => ({
            pathname: location.pathname,
            pageType: window.__dcufPageContext?.type,
            surface: document.documentElement.getAttribute('data-dcuf-modify-surface'),
            bodyClass: document.body.className,
            legacyWriteFormCount: document.querySelectorAll('form#write').length,
            formName: document.querySelector('form[name="modify"]')?.getAttribute('name') || '',
            formAction: document.querySelector('form[name="modify"]')?.getAttribute('action') || '',
            formIdAttribute: document.querySelector('form[name="modify"]')?.getAttribute('id'),
            formClass: document.querySelector('form[name="modify"]')?.className || '',
            formTransformed: document.querySelector('form[name="modify"]')?.dataset.dcufWriteTransformed || '',
            subjectRow: document.querySelector('#subject')?.closest('tr')?.classList.contains('dcuf-write-subject-row') || false,
            submitBackground: getComputedStyle(document.querySelector('#write-submit')).backgroundColor,
            writeStyleCount: document.querySelectorAll('#dcuf-mobile-write-theme').length,
            modifyStyleCount: document.querySelectorAll('#dcuf-mobile-modify-theme').length,
            modifySubscribers: window.__dcufRuntimeCoordinator?._mutationSubscribers?.has('ui-modify-surface') || false
        }));
        assert.deepEqual(contract, {
            pathname: '/board/modify/',
            pageType: 'modify',
            surface: 'editor',
            bodyClass: contract.bodyClass,
            legacyWriteFormCount: 0,
            formName: 'modify',
            formAction: '/board/forms/modify_submit',
            formIdAttribute: null,
            formClass: contract.formClass,
            formTransformed: '1',
            subjectRow: true,
            submitBackground: 'rgb(154, 52, 18)',
            writeStyleCount: 1,
            modifyStyleCount: 1,
            modifySubscribers: true
        });
        assert.equal(contract.bodyClass.includes('is-modify-editor-page'), true, contract.bodyClass);
        assert.equal(contract.bodyClass.includes('is-write-page'), true, contract.bodyClass);
        assert.equal(contract.bodyClass.includes('is-modify-password-page'), false, contract.bodyClass);
        assert.equal(contract.formClass.includes('dcuf-write-form'), true, contract.formClass);
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

mobileTest('UI palette presets normalize stored values without blocking boot', 'functional', async ({ browser, server }) => {
    const strongColors = {
        blue: { light: '#245bda', dark: '#3868df' },
        purple: { light: '#6d28d9', dark: '#7c3aed' },
        green: { light: '#047857', dark: '#047857' },
        orange: { light: '#9a3412', dark: '#c2410c' },
        mono: { light: '#374151', dark: '#475569' },
        indigo: { light: '#4338ca', dark: '#3730a3' },
        sky: { light: '#0369a1', dark: '#075985' },
        cyan: { light: '#0e7490', dark: '#155e75' },
        teal: { light: '#115e59', dark: '#115e59' },
        lime: { light: '#4d7c0f', dark: '#3f6212' },
        amber: { light: '#b45309', dark: '#92400e' },
        red: { light: '#b91c1c', dark: '#991b1b' },
        rose: { light: '#be123c', dark: '#9f1239' },
        pink: { light: '#be185d', dark: '#9d174d' }
    };
    const hexToRgb = (hex) => {
        const value = hex.replace('#', '');
        return `rgb(${Number.parseInt(value.slice(0, 2), 16)}, ${Number.parseInt(value.slice(2, 4), 16)}, ${Number.parseInt(value.slice(4, 6), 16)})`;
    };
    const contrastRatio = (foreground, background) => {
        const luminance = (value) => {
            const channels = (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number).map((channel) => {
                const normalized = channel / 255;
                return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
            });
            return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
        };
        const foregroundLuminance = luminance(foreground);
        const backgroundLuminance = luminance(background);
        return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
    };
    const strictContrastPalettes = new Set(['indigo', 'sky', 'cyan', 'teal', 'lime', 'amber', 'red', 'rose', 'pink']);
    for (const [stored, expected] of [
        [undefined, 'blue'],
        ['blue', 'blue'],
        ['purple', 'purple'],
        ['green', 'green'],
        ['orange', 'orange'],
        ['mono', 'mono'],
        ['indigo', 'indigo'],
        ['sky', 'sky'],
        ['cyan', 'cyan'],
        ['teal', 'teal'],
        ['lime', 'lime'],
        ['amber', 'amber'],
        ['red', 'red'],
        ['rose', 'rose'],
        ['pink', 'pink'],
        ['unknown-palette', 'blue']
    ]) {
        const storage = { ...noStatsStorage };
        if (stored !== undefined) storage[storageKeys.palette] = stored;
        const session = await createTestPage(browser, server.baseUrl, { storage });
        try {
            await session.goto('/board/lists?id=test');
            await session.page.waitForTimeout(80);
            assert.equal(await session.page.getAttribute('html', 'data-dcuf-palette'), expected, `stored palette: ${String(stored)}`);
            assert.equal(await session.page.locator('style#dcuf-mobile-palette-style').count(), 1);
            assert.equal(await session.page.locator('html.script-ui-ready').count(), 1);
            const lightColors = await session.page.evaluate(() => {
                const selectors = [
                    '.list_array_option .array_tab .on',
                    '.list_array_option .btn_write',
                    '.custom-bottom-controls .bottom_paging_box > em',
                    '.custom-bottom-controls .dcuf-search-card .bnt_search'
                ];
                const rootStyle = getComputedStyle(document.documentElement);
                return {
                    strong: rootStyle.getPropertyValue('--dcuf-theme-accent-strong').trim().toLowerCase(),
                    controls: selectors.map((selector) => {
                        const element = document.querySelector(selector);
                        const style = element ? getComputedStyle(element) : null;
                        const foreground = element && selector.includes('bnt_search')
                            ? getComputedStyle(element, '::before').borderTopColor
                            : style?.color || null;
                        return { selector, color: style?.backgroundColor || null, foreground };
                    })
                };
            });
            assert.equal(lightColors.strong, strongColors[expected].light, JSON.stringify(lightColors));
            lightColors.controls.forEach(({ selector, color, foreground }) => {
                assert.equal(color, hexToRgb(strongColors[expected].light), `${expected} light ${selector}: ${color}`);
                if (strictContrastPalettes.has(expected)) {
                    assert.equal(contrastRatio(foreground, color) >= 4.5, true, `${expected} light ${selector} contrast: ${contrastRatio(foreground, color)}`);
                }
            });
            assertPaletteSurfaces(await collectPaletteSurfaceContract(session.page, [
                { selector: '.custom-mobile-list', token: '--dcuf-theme-canvas' },
                { selector: '.list_array_option', token: '--dcuf-theme-surface-raised' },
                { selector: '.dcuf-bottom-action-card', token: '--dcuf-theme-surface-raised' },
                { selector: '.dcuf-pagination-card', token: '--dcuf-theme-card-top' },
                { selector: '.dcuf-search-card', token: '--dcuf-theme-card-top' }
            ]), `${expected} light list surfaces`);
            const listCardContract = await session.page.locator('.custom-post-item').first().evaluate((element) => ({
                background: getComputedStyle(element).backgroundImage,
                shadow: getComputedStyle(element).boxShadow,
                titleHighlight: getComputedStyle(element.querySelector('.post-title')).backgroundImage
            }));
            assert.equal(listCardContract.background.includes('linear-gradient'), true, JSON.stringify(listCardContract));
            assert.notEqual(listCardContract.shadow, 'none', JSON.stringify(listCardContract));
            assert.equal(listCardContract.titleHighlight, 'none', JSON.stringify(listCardContract));

            await session.page.evaluate(() => window.__dcufFixture.toggleDark(true));
            await session.page.waitForTimeout(40);
            const darkColors = await session.page.evaluate(() => {
                const selectors = [
                    '.list_array_option .array_tab .on',
                    '.list_array_option .btn_write',
                    '.custom-bottom-controls .bottom_paging_box > em',
                    '.custom-bottom-controls .dcuf-search-card .bnt_search'
                ];
                const rootStyle = getComputedStyle(document.documentElement);
                return {
                    strong: rootStyle.getPropertyValue('--dcuf-theme-accent-strong').trim().toLowerCase(),
                    controls: selectors.map((selector) => {
                        const element = document.querySelector(selector);
                        const style = element ? getComputedStyle(element) : null;
                        const foreground = element && selector.includes('bnt_search')
                            ? getComputedStyle(element, '::before').borderTopColor
                            : style?.color || null;
                        return { selector, color: style?.backgroundColor || null, foreground };
                    })
                };
            });
            assert.equal(darkColors.strong, strongColors[expected].dark, JSON.stringify(darkColors));
            darkColors.controls.forEach(({ selector, color, foreground }) => {
                assert.equal(color, hexToRgb(strongColors[expected].dark), `${expected} dark ${selector}: ${color}`);
                if (strictContrastPalettes.has(expected)) {
                    assert.equal(contrastRatio(foreground, color) >= 4.5, true, `${expected} dark ${selector} contrast: ${contrastRatio(foreground, color)}`);
                }
            });
            assertPaletteSurfaces(await collectPaletteSurfaceContract(session.page, [
                { selector: '.custom-mobile-list', token: '--dcuf-theme-canvas' },
                { selector: '.list_array_option', token: '--dcuf-theme-surface-raised' },
                { selector: '.dcuf-pagination-card', token: '--dcuf-theme-card-top' },
                { selector: '.dcuf-search-card', token: '--dcuf-theme-card-top' }
            ]), `${expected} dark list surfaces`);
            assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
        } finally { await session.close(); }
    }

    const pending = await createTestPage(browser, server.baseUrl, {
        storage: { ...noStatsStorage, [storageKeys.palette]: 'purple' },
        gmBehavior: { pendingKeys: [storageKeys.palette] }
    });
    try {
        await pending.goto('/board/lists?id=test');
        assert.equal(await pending.page.locator('html.script-ui-ready').count(), 1, 'a pending palette read must not block reveal');
        assert.equal(await pending.page.getAttribute('html', 'data-dcuf-palette'), 'blue');
        await pending.page.evaluate((key) => window.__dcufTestbedGM.release(key), storageKeys.palette);
        await pending.page.waitForFunction(() => document.documentElement.getAttribute('data-dcuf-palette') === 'purple');
        assertNoRuntimeErrors(await getMetrics(pending.page), pending.consoleErrors);
    } finally { await pending.close(); }

    const rejected = await createTestPage(browser, server.baseUrl, {
        storage: { ...noStatsStorage, [storageKeys.palette]: 'purple' },
        gmBehavior: { rejectOnceKeys: [storageKeys.palette] }
    });
    try {
        await rejected.goto('/board/lists?id=test');
        assert.equal(await rejected.page.locator('html.script-ui-ready').count(), 1);
        assert.equal(await rejected.page.getAttribute('html', 'data-dcuf-palette'), 'blue');
        assertNoRuntimeErrors(await getMetrics(rejected.page), rejected.consoleErrors);
    } finally { await rejected.close(); }
});

mobileTest('UI palette surfaces cover list canvas, comments, image comments, and write cards', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, {
        storage: { ...noStatsStorage, [storageKeys.palette]: 'orange' },
        viewport: { width: 390, height: 844 }
    });
    try {
        await session.goto('/board/lists?id=test');
        assertPaletteSurfaces(await collectPaletteSurfaceContract(session.page, [
            { selector: '.custom-mobile-list', token: '--dcuf-theme-canvas' },
            { selector: '.list_array_option', token: '--dcuf-theme-surface-raised' },
            { selector: '.dcuf-bottom-action-card', token: '--dcuf-theme-surface-raised' },
            { selector: '.dcuf-pagination-card', token: '--dcuf-theme-card-top' },
            { selector: '.dcuf-search-card', token: '--dcuf-theme-card-top' }
        ]), 'orange list');
        const listHierarchy = await session.page.evaluate(() => {
            const surface = (selector) => {
                const style = getComputedStyle(document.querySelector(selector));
                return { color: style.backgroundColor, image: style.backgroundImage, shadow: style.boxShadow };
            };
            return {
                canvas: surface('.custom-mobile-list'),
                normal: surface('.custom-post-item:not(.notice):not(.concept)'),
                concept: surface('.custom-post-item.concept'),
                notice: surface('.custom-post-item.notice'),
                action: surface('.dcuf-bottom-action-card'),
                pagination: surface('.dcuf-pagination-card'),
                search: surface('.dcuf-search-card'),
                titleBackground: getComputedStyle(document.querySelector('.custom-post-item .post-title')).backgroundImage
            };
        });
        assert.notEqual(listHierarchy.canvas.color, listHierarchy.normal.color, JSON.stringify(listHierarchy));
        assert.notEqual(listHierarchy.normal.color, listHierarchy.concept.color, JSON.stringify(listHierarchy));
        assert.notEqual(listHierarchy.normal.color, listHierarchy.notice.color, JSON.stringify(listHierarchy));
        assert.notEqual(listHierarchy.concept.color, listHierarchy.notice.color, JSON.stringify(listHierarchy));
        assert.notEqual(listHierarchy.action.color, listHierarchy.pagination.color, JSON.stringify(listHierarchy));
        assert.equal(listHierarchy.pagination.color, listHierarchy.search.color, JSON.stringify(listHierarchy));
        assert.notEqual(listHierarchy.normal.shadow, 'none', JSON.stringify(listHierarchy));
        assert.equal(listHierarchy.titleBackground, 'none', JSON.stringify(listHierarchy));
        await session.page.evaluate(() => window.__dcufFixture.toggleDark(true));
        await session.page.waitForTimeout(40);
        const darkListHierarchy = await session.page.evaluate(() => {
            const normal = document.querySelector('.custom-post-item:not(.notice):not(.concept)');
            const concept = document.querySelector('.custom-post-item.concept');
            const notice = document.querySelector('.custom-post-item.notice');
            return {
                normal: getComputedStyle(normal).backgroundColor,
                concept: getComputedStyle(concept).backgroundColor,
                notice: getComputedStyle(notice).backgroundColor,
                titleBackground: getComputedStyle(normal.querySelector('.post-title')).backgroundImage,
                titleShadow: getComputedStyle(normal.querySelector('.post-title')).boxShadow
            };
        });
        assert.notEqual(darkListHierarchy.normal, darkListHierarchy.concept, JSON.stringify(darkListHierarchy));
        assert.notEqual(darkListHierarchy.normal, darkListHierarchy.notice, JSON.stringify(darkListHierarchy));
        assert.equal(darkListHierarchy.titleBackground, 'none', JSON.stringify(darkListHierarchy));
        assert.equal(darkListHierarchy.titleShadow, 'none', JSON.stringify(darkListHierarchy));
        await session.page.evaluate(() => window.__dcufFixture.toggleDark(false));
        await session.page.waitForTimeout(40);
        const listInteractionContract = await session.page.evaluate(() => {
            const author = document.querySelector('.custom-post-item .post-meta .author');
            const writer = author?.querySelector('.gall_writer');
            const authorRect = author?.getBoundingClientRect();
            const writerRect = writer?.getBoundingClientRect();
            const write = document.querySelector('.list_array_option .btn_write');
            const pencil = write ? getComputedStyle(write, '::before') : null;
            return {
                authorWidth: authorRect?.width || 0,
                writerWidth: writerRect?.width || 0,
                tapHighlight: author ? getComputedStyle(author).webkitTapHighlightColor : '',
                pencilContent: pencil?.content || '',
                pencilColor: pencil?.color || ''
            };
        });
        assert.equal(listInteractionContract.authorWidth <= listInteractionContract.writerWidth + 2, true, JSON.stringify(listInteractionContract));
        assert.equal(['rgba(0, 0, 0, 0)', 'transparent'].includes(listInteractionContract.tapHighlight), true, JSON.stringify(listInteractionContract));
        assert.notEqual(listInteractionContract.pencilContent, 'none');
        assert.equal(listInteractionContract.pencilColor, 'rgb(255, 255, 255)');
        const titleLink = session.page.locator('.custom-post-item:not(.notice):not(.concept) .post-title-link:visible').first();
        const titleHref = await titleLink.getAttribute('href');
        await titleLink.evaluate((link) => link.setAttribute('href', 'javascript:;'));
        const idleTitlePress = await titleLink.evaluate((link) => {
            const cardStyle = getComputedStyle(link.closest('.custom-post-item'));
            return {
                filter: cardStyle.filter,
                outlineColor: cardStyle.outlineColor,
                tapHighlight: getComputedStyle(link).webkitTapHighlightColor
            };
        });
        await titleLink.hover();
        await session.page.mouse.down();
        const activeTitlePress = await titleLink.evaluate((link) => {
            const cardStyle = getComputedStyle(link.closest('.custom-post-item'));
            return {
                filter: cardStyle.filter,
                outlineColor: cardStyle.outlineColor
            };
        });
        await session.page.mouse.up();
        await titleLink.evaluate((link, href) => link.setAttribute('href', href), titleHref);
        assert.equal(['rgba(0, 0, 0, 0)', 'transparent'].includes(idleTitlePress.tapHighlight), false, JSON.stringify(idleTitlePress));
        assert.notEqual(activeTitlePress.filter, idleTitlePress.filter, JSON.stringify({ idleTitlePress, activeTitlePress }));
        assert.notEqual(activeTitlePress.outlineColor, idleTitlePress.outlineColor, JSON.stringify({ idleTitlePress, activeTitlePress }));
        const hostChromeContract = await session.page.evaluate(() => {
            const color = (selector, property) => getComputedStyle(document.querySelector(selector))[property];
            return {
                gnb: color('.gnb_bar', 'backgroundColor'),
                topSearch: color('.dchead .top_search', 'backgroundColor'),
                topSearchButton: color('.dchead .top_search .bnt_search', 'backgroundColor'),
                login: color('.dchead .btn_top_loginout', 'backgroundColor'),
                galleryTitle: color('.page_head h2 a', 'color'),
                gallerySearch: color('.page_head .btn_search', 'backgroundColor'),
                recentTitle: color('.newvisit_history > .tit', 'color'),
                recentAll: color('.newvisit_history > .bnt_newvisit_more', 'color')
            };
        });
        assert.deepEqual(hostChromeContract, {
            gnb: 'rgb(154, 52, 18)',
            topSearch: 'rgb(154, 52, 18)',
            topSearchButton: 'rgb(154, 52, 18)',
            login: 'rgb(154, 52, 18)',
            galleryTitle: 'rgb(194, 65, 12)',
            gallerySearch: 'rgb(154, 52, 18)',
            recentTitle: 'rgb(194, 65, 12)',
            recentAll: 'rgb(194, 65, 12)'
        });

        await session.goto('/board/view?id=test&no=1001&comments=4');
        await session.page.locator('#focus_cmt .comment_box .reply.show').waitFor({ state: 'attached' });
        assertPaletteSurfaces(await collectPaletteSurfaceContract(session.page, [
            { selector: '#focus_cmt .comment_box .cmt_list > li', token: '--dcuf-theme-card-top' },
            { selector: '#focus_cmt .comment_box .reply_box', token: '--dcuf-theme-reply-surface' },
            { selector: '#focus_cmt > .fixture-normal-comment-composer', token: '--dcuf-theme-surface' },
            { selector: '#focus_cmt > .fixture-normal-comment-composer .cmt_txt_cont', token: '--dcuf-theme-surface-input' },
            { selector: '.view_comment.image_comment .comment_wrap', token: '--dcuf-theme-canvas' },
            { selector: '.view_comment.image_comment .comment_box.img_comment_box .cmt_list > li', token: '--dcuf-theme-card-top' },
            { selector: '.view_comment.image_comment .cmt_write_box', token: '--dcuf-theme-surface' },
            { selector: '.view_comment.image_comment .cmt_write_box .cmt_txt_cont', token: '--dcuf-theme-surface-input' }
        ]), 'orange view');
        assert.equal(
            await session.page.locator('#focus_cmt').evaluate((element) => getComputedStyle(element).backgroundColor),
            'rgba(0, 0, 0, 0)',
            'orange view: #focus_cmt is a transparent structural container'
        );
        const commentButtons = await session.page.evaluate(() => Array.from(document.querySelectorAll([
            '#focus_cmt > .fixture-normal-comment-composer .cmt_cont_bottm > .fr > button',
            '.view_comment.image_comment .cmt_write_box .cmt_cont_bottm > .fr > button'
        ].join(','))).map((button) => getComputedStyle(button).backgroundColor));
        assert.deepEqual(commentButtons, ['rgb(154, 52, 18)', 'rgb(154, 52, 18)']);
        const recommendationContract = await session.page.evaluate(() => {
            const box = document.querySelector('.btn_recommend_box');
            const inner = box.querySelector('.inner_box > .inner');
            const bottom = box.querySelector('.recom_bottom_box');
            const button = document.querySelector('.btn_recommend_box .btn_recom_up');
            const number = document.querySelector('.btn_recommend_box .up_num');
            const fixedNumber = document.querySelector('.btn_recommend_box .font_blue.smallnum');
            const icon = document.querySelector('.btn_recommend_box .icon_recom_up');
            return {
                boxBackground: getComputedStyle(box).backgroundImage,
                innerBackground: getComputedStyle(inner).backgroundImage,
                innerShadow: getComputedStyle(inner).boxShadow,
                bottomBackground: getComputedStyle(bottom).backgroundImage,
                buttonBackground: getComputedStyle(button).backgroundImage,
                numberColor: getComputedStyle(number).color,
                fixedNumberColor: getComputedStyle(fixedNumber).color,
                iconBackgroundImage: getComputedStyle(icon).backgroundImage,
                starColor: getComputedStyle(icon, '::before').color,
                labelContent: getComputedStyle(icon, '::after').content,
                labelColor: getComputedStyle(icon, '::after').color
            };
        });
        assert.equal(recommendationContract.boxBackground.includes('linear-gradient'), true, JSON.stringify(recommendationContract));
        assert.equal(recommendationContract.innerBackground.includes('linear-gradient'), true, JSON.stringify(recommendationContract));
        assert.notEqual(recommendationContract.innerShadow, 'none', JSON.stringify(recommendationContract));
        assert.equal(recommendationContract.bottomBackground, 'none', JSON.stringify(recommendationContract));
        assert.equal(recommendationContract.buttonBackground.includes('rgb(194, 65, 12)'), true, JSON.stringify(recommendationContract));
        assert.equal(recommendationContract.buttonBackground.includes('rgb(154, 52, 18)'), true, JSON.stringify(recommendationContract));
        assert.equal(recommendationContract.numberColor, 'rgb(194, 65, 12)', JSON.stringify(recommendationContract));
        assert.equal(recommendationContract.fixedNumberColor, 'rgb(194, 65, 12)', JSON.stringify(recommendationContract));
        assert.equal(recommendationContract.iconBackgroundImage, 'none', JSON.stringify(recommendationContract));
        assert.equal(recommendationContract.starColor, 'rgb(255, 255, 255)', JSON.stringify(recommendationContract));
        assert.equal(recommendationContract.labelContent, '"개념"', JSON.stringify(recommendationContract));
        assert.equal(recommendationContract.labelColor, 'rgb(255, 255, 255)', JSON.stringify(recommendationContract));

        await session.page.evaluate(() => window.__dcufFixture.toggleDark(true));
        await session.page.waitForTimeout(40);
        assertPaletteSurfaces(await collectPaletteSurfaceContract(session.page, [
            { selector: '#focus_cmt .comment_box .reply_box', token: '--dcuf-theme-reply-surface' },
            { selector: '#focus_cmt > .fixture-normal-comment-composer', token: '--dcuf-theme-surface' },
            { selector: '.view_comment.image_comment .cmt_write_box', token: '--dcuf-theme-surface' }
        ]), 'orange dark view');
        assert.equal(
            await session.page.locator('#focus_cmt').evaluate((element) => getComputedStyle(element).backgroundColor),
            'rgba(0, 0, 0, 0)',
            'orange dark view: #focus_cmt is a transparent structural container'
        );

        await session.goto('/mgallery/board/write/?id=test');
        assertPaletteSurfaces(await collectPaletteSurfaceContract(session.page, [
            { selector: 'form#write', token: '--dcuf-theme-canvas' },
            { selector: 'form#write .write_subject', token: '--dcuf-theme-surface' },
            { selector: 'form#write .note-toolbar', token: '--dcuf-theme-surface-muted' },
            { selector: 'form#write .note-editable', token: '--dcuf-theme-surface-input' },
            { selector: 'form#write .ai_easy_wrap', token: '--dcuf-theme-surface' },
            { selector: 'form#write > .btn_box.write', token: '--dcuf-theme-surface' }
        ]), 'orange write');
        assert.equal(await session.page.locator('.ai_easy_box > .btn_aigo').evaluate((button) => getComputedStyle(button).backgroundColor), 'rgb(154, 52, 18)');
        const toolbarBorderContract = await session.page.evaluate(() => {
            const probe = document.createElement('span');
            probe.style.cssText = 'position:fixed;visibility:hidden;border:1px solid var(--dcuf-theme-border-strong)';
            document.body.appendChild(probe);
            const expected = getComputedStyle(probe).borderTopColor;
            probe.remove();
            return Array.from(document.querySelectorAll([
                '.note-toolbar [data-command="image"]',
                '.note-toolbar [data-command="video"]',
                '.note-toolbar [data-command="youtube"]',
                '.note-toolbar [data-command="font"]',
                '.note-toolbar [data-command="size"]'
            ].join(','))).map((button) => ({
                command: button.dataset.command,
                expected,
                actual: getComputedStyle(button).borderTopColor,
                boxShadow: getComputedStyle(button).boxShadow
            }));
        });
        assert.equal(toolbarBorderContract.length, 5, JSON.stringify(toolbarBorderContract));
        toolbarBorderContract.forEach(({ command, expected, actual, boxShadow }) => {
            assert.equal(actual, expected, `toolbar ${command} border must follow the palette`);
            assert.equal(boxShadow.includes('25, 50, 92'), false, `toolbar ${command} must not retain the fixed blue shadow`);
        });
        await session.page.evaluate(() => window.__dcufFixture.toggleDark(true));
        await session.page.waitForTimeout(40);
        assertPaletteSurfaces(await collectPaletteSurfaceContract(session.page, [
            { selector: 'form#write .write_subject', token: '--dcuf-theme-surface' },
            { selector: 'form#write .note-toolbar', token: '--dcuf-theme-surface-muted' },
            { selector: 'form#write > .btn_box.write', token: '--dcuf-theme-surface' }
        ]), 'orange dark write');
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

mobileTest('UI palette replaces live-shaped host blue and keeps raised list, view, and comment hierarchy', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, {
        storage: { ...noStatsStorage, [storageKeys.palette]: 'orange' },
        viewport: { width: 1280, height: 900 }
    });
    try {
        await session.goto('/mgallery/board/lists?id=test');
        const listContract = await session.page.evaluate(() => {
            const tokenColor = (token) => {
                const probe = document.createElement('span');
                probe.style.cssText = `position:fixed;left:-9999px;color:var(${token})`;
                document.body.appendChild(probe);
                const color = getComputedStyle(probe).color;
                probe.remove();
                return color;
            };
            const badge = document.querySelector('.pagehead_titicon.mgall.sp_img');
            const next = document.querySelector('.gnb_bar .sp_img.icon_next');
            const card = document.querySelector('.custom-mobile-list .custom-post-item');
            const inactive = document.querySelector('.list_array_option .array_tab li:not(.on) > a');
            return {
                accent: tokenColor('--dcuf-theme-accent'),
                foreground: tokenColor('--dcuf-theme-fg'),
                login: getComputedStyle(document.querySelector('.btn_top_loginout')).backgroundColor,
                badgeBackground: getComputedStyle(badge).backgroundImage,
                badgeColor: getComputedStyle(badge).color,
                badgeLabel: getComputedStyle(badge, '::before').content,
                nextBackground: getComputedStyle(next).backgroundImage,
                nextColor: getComputedStyle(next).borderTopColor,
                issueBorder: getComputedStyle(document.querySelector('.issue_wrap')).borderTopColor,
                inactiveColor: getComputedStyle(inactive).color,
                cardBackground: getComputedStyle(card).backgroundImage,
                cardShadow: getComputedStyle(card).boxShadow,
                titleHighlight: getComputedStyle(card.querySelector('.post-title')).backgroundImage
            };
        });
        assert.equal(listContract.login, 'rgb(154, 52, 18)', JSON.stringify(listContract));
        assert.equal(listContract.badgeBackground, 'none', JSON.stringify(listContract));
        assert.equal(listContract.badgeColor, listContract.accent, JSON.stringify(listContract));
        assert.equal(listContract.badgeLabel, '"m"', JSON.stringify(listContract));
        assert.equal(listContract.nextBackground, 'none', JSON.stringify(listContract));
        assert.equal(listContract.nextColor, 'rgb(255, 255, 255)', JSON.stringify(listContract));
        assert.equal(listContract.issueBorder, listContract.accent, JSON.stringify(listContract));
        assert.equal(listContract.inactiveColor, listContract.foreground, JSON.stringify(listContract));
        assert.equal(listContract.cardBackground.includes('linear-gradient'), true, JSON.stringify(listContract));
        assert.notEqual(listContract.cardShadow, 'none', JSON.stringify(listContract));
        assert.equal(listContract.titleHighlight, 'none', JSON.stringify(listContract));

        await session.goto('/mini/board/lists?id=test');
        const miniBadge = await session.page.evaluate(() => {
            const badge = document.querySelector('.pagehead_titicon.ngall.sp_img');
            const style = getComputedStyle(badge);
            return {
                label: getComputedStyle(badge, '::before').content,
                background: style.backgroundImage,
                position: style.backgroundPosition,
                textIndent: style.textIndent,
                width: style.width,
                height: style.height,
                color: style.color,
                borderColor: style.borderColor,
                accent: getComputedStyle(document.documentElement).getPropertyValue('--dcuf-theme-accent').trim()
            };
        });
        assert.deepEqual(miniBadge, {
            label: '"mi"',
            background: 'none',
            position: '0px 0px',
            textIndent: '0px',
            width: '26px',
            height: '20px',
            color: 'rgb(194, 65, 12)',
            borderColor: 'rgb(194, 65, 12)',
            accent: '#c2410c'
        }, JSON.stringify(miniBadge));

        await session.goto('/board/view?id=test&no=1001&comments=4');
        await session.page.locator('.fixture-reply-comment-composer').waitFor({ state: 'attached' });
        const viewContract = await session.page.evaluate(() => {
            const tokenBackground = (token) => {
                const probe = document.createElement('span');
                probe.style.cssText = `position:fixed;left:-9999px;background-color:var(${token})`;
                document.body.appendChild(probe);
                const color = getComputedStyle(probe).backgroundColor;
                probe.remove();
                return color;
            };
            const title = document.querySelector('.view_content_wrap .gallview_head');
            const article = document.querySelector('.view_content_wrap .writing_view_box');
            const articleInner = article.querySelector(':scope > .write_div');
            const articleOuter = article.closest('.gallview_contents');
            const comment = document.querySelector('#focus_cmt .comment_box .cmt_list > li:not([data-dcuf-focus-group-parent])');
            const reply = document.querySelector('#focus_cmt .comment_box .reply_box');
            const commentList = document.querySelector('#focus_cmt .comment_box .cmt_list');
            const groupedParent = document.createElement('li');
            groupedParent.dataset.dcufFocusGroupParent = '1';
            const groupedReply = document.createElement('li');
            groupedReply.dataset.dcufFocusGroupReply = '1';
            groupedReply.innerHTML = '<div class="reply show"><div class="reply_box"></div></div>';
            commentList.append(groupedParent, groupedReply);
            const normal = document.querySelector('.fixture-normal-comment-composer');
            const replyComposer = document.querySelector('.fixture-reply-comment-composer');
            const replyHost = replyComposer.closest('.reply_box');
            const imageCard = document.querySelector('.view_comment.image_comment .cmt_list > li');
            const imageComposer = document.querySelector('.fixture-image-comment-composer');
            const rect = replyComposer.getBoundingClientRect();
            const hostRect = replyHost.getBoundingClientRect();
            const contract = {
                inputSurface: tokenBackground('--dcuf-theme-surface-input'),
                titleBackground: getComputedStyle(title).backgroundImage,
                titleShadow: getComputedStyle(title).boxShadow,
                articleBackground: getComputedStyle(article).backgroundImage,
                articleShadow: getComputedStyle(article).boxShadow,
                articleOuterBackground: articleOuter ? getComputedStyle(articleOuter).backgroundImage : 'none',
                articleOuterShadow: articleOuter ? getComputedStyle(articleOuter).boxShadow : 'none',
                articleInnerRadius: getComputedStyle(articleInner).borderRadius,
                articleInnerShadow: getComputedStyle(articleInner).boxShadow,
                commentBackground: getComputedStyle(comment).backgroundImage,
                commentShadow: getComputedStyle(comment).boxShadow,
                replyBackground: getComputedStyle(reply).backgroundImage,
                replyShadow: getComputedStyle(reply).boxShadow,
                replyIndent: parseFloat(getComputedStyle(reply).marginLeft) || 0,
                groupedParentBottom: getComputedStyle(groupedParent, '::after').bottom,
                groupedReplyMarginTop: parseFloat(getComputedStyle(groupedReply).marginTop) || 0,
                normalBody: getComputedStyle(normal.querySelector('.cmt_txt_cont')).backgroundColor,
                normalFooter: getComputedStyle(normal.querySelector('.cmt_cont_bottm')).backgroundColor,
                replyBody: getComputedStyle(replyComposer.querySelector('.cmt_txt_cont')).backgroundColor,
                replyFits: rect.left >= hostRect.left - 1 && rect.right <= hostRect.right + 1,
                imageBackground: getComputedStyle(imageCard).backgroundImage,
                imageBody: getComputedStyle(imageComposer.querySelector('.cmt_txt_cont')).backgroundColor
            };
            groupedParent.remove();
            groupedReply.remove();
            return contract;
        });
        assert.equal(viewContract.titleBackground.includes('linear-gradient'), true, JSON.stringify(viewContract));
        assert.notEqual(viewContract.titleShadow, 'none', JSON.stringify(viewContract));
        assert.equal(viewContract.articleBackground, 'none', JSON.stringify(viewContract));
        assert.equal(viewContract.articleShadow, 'none', JSON.stringify(viewContract));
        assert.equal(viewContract.articleOuterBackground, 'none', JSON.stringify(viewContract));
        assert.equal(viewContract.articleOuterShadow, 'none', JSON.stringify(viewContract));
        assert.equal(viewContract.articleInnerRadius, '0px', JSON.stringify(viewContract));
        assert.equal(viewContract.articleInnerShadow, 'none', JSON.stringify(viewContract));
        assert.equal(viewContract.commentBackground.includes('linear-gradient'), true, JSON.stringify(viewContract));
        assert.notEqual(viewContract.commentShadow, 'none', JSON.stringify(viewContract));
        assert.equal(viewContract.replyBackground.includes('linear-gradient'), true, JSON.stringify(viewContract));
        assert.equal(viewContract.replyShadow.includes('inset'), false, JSON.stringify(viewContract));
        assert.equal(viewContract.replyIndent >= 18, true, JSON.stringify(viewContract));
        assert.equal(viewContract.groupedParentBottom, '0px', JSON.stringify(viewContract));
        assert.equal(viewContract.groupedReplyMarginTop >= 8, true, JSON.stringify(viewContract));
        assert.equal(viewContract.normalBody, viewContract.inputSurface, JSON.stringify(viewContract));
        assert.equal(viewContract.normalFooter, viewContract.inputSurface, JSON.stringify(viewContract));
        assert.equal(viewContract.replyBody, viewContract.inputSurface, JSON.stringify(viewContract));
        assert.equal(viewContract.replyFits, true, JSON.stringify(viewContract));
        assert.equal(viewContract.imageBackground.includes('linear-gradient'), true, JSON.stringify(viewContract));
        assert.equal(viewContract.imageBody, viewContract.inputSurface, JSON.stringify(viewContract));

        await session.page.evaluate(() => {
            const image = document.createElement('img');
            image.className = 'fixture-article-upload-image';
            image.alt = 'uploaded article fixture';
            image.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
            image.style.cssText = 'filter:invert(1) hue-rotate(180deg);-webkit-filter:invert(1) hue-rotate(180deg);mix-blend-mode:difference';
            document.querySelector('.writing_view_box > .write_div').appendChild(image);
            window.__dcufFixture.toggleDark(true);
        });
        await session.page.waitForTimeout(40);
        const darkContract = await session.page.evaluate(() => {
            const composer = document.querySelector('.fixture-reply-comment-composer');
            const host = composer.closest('.reply_box');
            const rect = composer.getBoundingClientRect();
            const hostRect = host.getBoundingClientRect();
            return {
                replyFits: rect.left >= hostRect.left - 1 && rect.right <= hostRect.right + 1,
                replyBackground: getComputedStyle(document.querySelector('#focus_cmt .comment_box .reply_box')).backgroundImage,
                commentShadow: getComputedStyle(document.querySelector('#focus_cmt .comment_box .cmt_list > li:not([data-dcuf-focus-group-parent])')).boxShadow,
                articleInnerRadius: getComputedStyle(document.querySelector('.writing_view_box > .write_div')).borderRadius,
                articleInnerImage: getComputedStyle(document.querySelector('.writing_view_box > .write_div')).backgroundImage,
                uploadedImageFilter: getComputedStyle(document.querySelector('.fixture-article-upload-image')).filter,
                uploadedImageBlend: getComputedStyle(document.querySelector('.fixture-article-upload-image')).mixBlendMode,
                recommendationBottom: getComputedStyle(document.querySelector('.btn_recommend_box .recom_bottom_box')).backgroundImage
            };
        });
        assert.equal(darkContract.replyFits, true, JSON.stringify(darkContract));
        assert.equal(darkContract.replyBackground.includes('linear-gradient'), true, JSON.stringify(darkContract));
        assert.notEqual(darkContract.commentShadow, 'none', JSON.stringify(darkContract));
        assert.equal(darkContract.articleInnerRadius, '0px', JSON.stringify(darkContract));
        assert.equal(darkContract.articleInnerImage, 'none', JSON.stringify(darkContract));
        assert.equal(darkContract.uploadedImageFilter, 'none', JSON.stringify(darkContract));
        assert.equal(darkContract.uploadedImageBlend, 'normal', JSON.stringify(darkContract));
        assert.equal(darkContract.recommendationBottom, 'none', JSON.stringify(darkContract));
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

mobileTest('UI palette reaches settings, block management, and backup card surfaces in light and dark', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, {
        storage: { ...noStatsStorage, [storageKeys.palette]: 'orange' },
        viewport: { width: 390, height: 844 }
    });
    try {
        await session.goto('/board/lists?id=test');
        for (const dark of [false, true]) {
            await session.page.evaluate((enabled) => window.__dcufFixture.toggleDark(enabled), dark);
            await session.page.waitForTimeout(40);

            await session.page.evaluate(() => window.__dcufTestbedGM.invokeMenu('글댓합 설정하기'));
            await session.page.locator('#dcinside-filter-setting').waitFor({ state: 'attached' });
            assertPaletteSurfaces(await collectPaletteSurfaceContract(session.page, [
                { selector: '#dcinside-filter-setting', token: '--dcuf-theme-canvas' },
                { selector: '#dcinside-filter-setting .dcuf-settings-section', token: '--dcuf-theme-card-top' },
                { selector: '#dcinside-filter-setting #dcinside-threshold-input', token: '--dcuf-theme-surface-input' }
            ]), `settings ${dark ? 'dark' : 'light'}`);
            await session.page.locator('#dcinside-filter-setting').evaluate((element) => element.remove());

            await session.page.evaluate(() => window.__dcufTestbedGM.invokeMenu('차단 유저 관리'));
            await session.page.locator('#dc-block-management-panel').waitFor({ state: 'attached' });
            assertPaletteSurfaces(await collectPaletteSurfaceContract(session.page, [
                { selector: '#dc-block-management-panel', token: '--dcuf-theme-canvas' },
                { selector: '#dc-block-management-panel .panel-body', token: '--dcuf-theme-canvas' },
                { selector: '#dc-block-management-panel .panel-list-controls', token: '--dcuf-theme-card-top' },
                { selector: '#dc-block-management-panel .panel-search-input', token: '--dcuf-theme-surface-input' }
            ]), `management ${dark ? 'dark' : 'light'}`);
            await session.page.locator('#dc-block-management-panel .panel-backup-btn').click();
            await session.page.locator('#dc-backup-popup').waitFor({ state: 'attached' });
            assertPaletteSurfaces(await collectPaletteSurfaceContract(session.page, [
                { selector: '#dc-backup-popup', token: '--dcuf-theme-canvas' },
                { selector: '#dc-backup-popup .export-section', token: '--dcuf-theme-card-top' },
                { selector: '#dc-backup-popup textarea', token: '--dcuf-theme-surface-input' }
            ]), `backup ${dark ? 'dark' : 'light'}`);
            await session.page.locator('#dc-backup-popup, #dc-backup-popup-overlay, #dc-block-management-panel, #dc-block-management-panel-overlay').evaluateAll((elements) => elements.forEach((element) => element.remove()));
        }
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

mobileTest('overlapping persisted pageshow and visible resume share one refilter and consume only that cycle', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/board/lists?id=test');
        const contract = await session.page.evaluate(async () => {
            const filterModule = window.__dcufFilterModule;
            const coordinator = window.__dcufRuntimeCoordinator;
            let visibilityState = 'visible';
            Object.defineProperty(document, 'visibilityState', {
                configurable: true,
                get: () => visibilityState
            });
            const dispatchHidden = () => {
                visibilityState = 'hidden';
                document.dispatchEvent(new Event('visibilitychange'));
            };
            const dispatchVisible = async ({ duplicate = false } = {}) => {
                visibilityState = 'visible';
                document.dispatchEvent(new Event('visibilitychange'));
                if (duplicate) document.dispatchEvent(new Event('visibilitychange'));
                const recovery = filterModule._visibilityRecoveryPromise;
                if (recovery) await recovery;
            };
            const snapshot = () => {
                const diagnostics = window.__dcufDiagnostics.snapshot();
                return {
                    requested: diagnostics.counters['lifecycle.bfcache.restore.requested'] || 0,
                    completed: diagnostics.counters['lifecycle.bfcache.restore.completed'] || 0,
                    fullRefilters: diagnostics.counters['filter.fullRefilter.runs'] || 0,
                    bfcacheSkips: diagnostics.counters['lifecycle.visibility.restore.skippedBfcache'] || 0,
                    cleanSkips: diagnostics.counters['lifecycle.visibility.restore.skippedClean'] || 0,
                    visibilityRuns: diagnostics.counters['lifecycle.visibility.restore.runs'] || 0,
                    lastReason: diagnostics.gauges['lifecycle.visibility.restore.lastReason'] || ''
                };
            };

            window.__dcufDiagnostics.enable();
            window.__dcufDiagnostics.reset();
            dispatchHidden();
            const complete = new Promise((resolve) => window.addEventListener('dcuf:bfcache-restored', resolve, { once: true }));
            const persisted = new Event('pageshow');
            Object.defineProperty(persisted, 'persisted', { value: true });
            window.dispatchEvent(persisted);
            const firstVisible = dispatchVisible({ duplicate: true });
            await Promise.all([complete, firstVisible, coordinator.waitForBfcacheRecovery()]);
            const afterOverlap = snapshot();

            dispatchHidden();
            await dispatchVisible({ duplicate: true });
            const afterNextOrdinaryCycle = snapshot();
            return {
                afterOverlap,
                afterNextOrdinaryCycle,
                recoveryState: {
                    id: coordinator.getBfcacheRecoveryState().id,
                    pending: coordinator.getBfcacheRecoveryState().pending,
                    succeeded: coordinator.getBfcacheRecoveryState().succeeded
                }
            };
        });

        assert.deepEqual(contract.afterOverlap, {
            requested: 1,
            completed: 1,
            fullRefilters: 1,
            bfcacheSkips: 1,
            cleanSkips: 0,
            visibilityRuns: 0,
            lastReason: 'bfcache-handled'
        });
        assert.deepEqual(contract.afterNextOrdinaryCycle, {
            requested: 1,
            completed: 1,
            fullRefilters: 1,
            bfcacheSkips: 1,
            cleanSkips: 1,
            visibilityRuns: 0,
            lastReason: 'clean'
        });
        assert.deepEqual(contract.recoveryState, { id: 1, pending: false, succeeded: true });
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

mobileTest('twenty persisted pageshow recoveries keep lifecycle observers UI and timers bounded', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
    try {
        await session.goto('/board/lists?id=test');
        await waitForSettled(session.page, 300);
        const before = await getMetrics(session.page);
        const contract = await session.page.evaluate(async () => {
            window.__dcufDiagnostics.enable();
            window.__dcufDiagnostics.reset();
            const coordinator = window.__dcufRuntimeCoordinator;
            const observerBefore = coordinator._mutationObserver;
            const subscribersBefore = coordinator._mutationSubscribers.size;
            for (let index = 0; index < 20; index += 1) {
                const persisted = new Event('pageshow');
                Object.defineProperty(persisted, 'persisted', { value: true });
                window.dispatchEvent(persisted);
                await coordinator.waitForBfcacheRecovery();
            }
            const afterPersisted = window.__dcufDiagnostics.snapshot();

            const ordinary = new Event('pageshow');
            Object.defineProperty(ordinary, 'persisted', { value: false });
            window.dispatchEvent(ordinary);
            await Promise.resolve();
            const afterOrdinary = window.__dcufDiagnostics.snapshot();
            return {
                requested: afterPersisted.counters['lifecycle.bfcache.restore.requested'] || 0,
                completed: afterPersisted.counters['lifecycle.bfcache.restore.completed'] || 0,
                completedAfterOrdinary: afterOrdinary.counters['lifecycle.bfcache.restore.completed'] || 0,
                fullRefilters: afterPersisted.counters['filter.fullRefilter.runs'] || 0,
                processAllLists: afterPersisted.counters['ui.processAllLists'] || 0,
                sameObserver: observerBefore === coordinator._mutationObserver,
                subscribersBefore,
                subscribersAfter: coordinator._mutationSubscribers.size,
                customLists: document.querySelectorAll('.custom-mobile-list').length,
                ready: document.documentElement.classList.contains('script-ui-ready')
            };
        });
        await waitForSettled(session.page, 300);
        const after = await getMetrics(session.page);
        assert.deepEqual(contract, {
            requested: 20,
            completed: 20,
            completedAfterOrdinary: 20,
            fullRefilters: 20,
            processAllLists: 20,
            sameObserver: true,
            subscribersBefore: contract.subscribersBefore,
            subscribersAfter: contract.subscribersBefore,
            customLists: 1,
            ready: true
        });
        assert.equal(after.mutationObserversCreated, before.mutationObserversCreated);
        assert.equal(after.listenerUnique, before.listenerUnique);
        assert.equal(after.memory.runtime.subscriberCount, before.memory.runtime.subscriberCount);
        assert.equal(after.activeIntervals, before.activeIntervals);
        assert.equal(after.activeTimeouts <= before.activeTimeouts, true, JSON.stringify({ before: before.activeTimeouts, after: after.activeTimeouts }));
        assert.equal(after.activeAnimationFrames, 0);
        assertNoRuntimeErrors(after, session.consoleErrors);
    } finally { await session.close(); }
});

mobileTest('UI palette colors reach view actions and embedded list controls', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, {
        storage: { ...noStatsStorage, [storageKeys.palette]: 'orange' },
        viewport: { width: 1120, height: 900 }
    });
    try {
        await session.goto('/board/view?id=test&no=1001');
        const collectColors = () => session.page.evaluate(() => {
            const selectors = [
                '#container.gallery_view .view_bottom_btnbox .btn_blue',
                '#container.gallery_view .view_bottom_btnbox .write',
                '.custom-bottom-controls .bottom_paging_box > em',
                '.custom-bottom-controls .dcuf-search-card .bnt_search'
            ];
            return selectors.map((selector) => {
                const element = document.querySelector(selector);
                return { selector, color: element ? getComputedStyle(element).backgroundColor : null };
            });
        });
        const light = await collectColors();
        light.forEach(({ selector, color }) => assert.equal(color, 'rgb(154, 52, 18)', `orange light ${selector}: ${color}`));
        const lightBar = await session.page.evaluate(() => {
            const bar = document.querySelector('#container.gallery_view .view_bottom_btnbox');
            const inactive = bar.querySelector('.btn_grey');
            return {
                background: getComputedStyle(bar).backgroundImage,
                shadow: getComputedStyle(bar).boxShadow,
                inactiveBackground: getComputedStyle(inactive).backgroundImage,
                inactiveShadow: getComputedStyle(inactive).boxShadow
            };
        });
        assert.equal(lightBar.background.includes('linear-gradient'), true, JSON.stringify(lightBar));
        assert.notEqual(lightBar.shadow, 'none', JSON.stringify(lightBar));
        assert.equal(lightBar.inactiveBackground.includes('linear-gradient'), true, JSON.stringify(lightBar));
        assert.notEqual(lightBar.inactiveShadow, 'none', JSON.stringify(lightBar));
        await session.page.evaluate(() => window.__dcufFixture.toggleDark(true));
        await session.page.waitForTimeout(40);
        const dark = await collectColors();
        dark.forEach(({ selector, color }) => assert.equal(color, 'rgb(194, 65, 12)', `orange dark ${selector}: ${color}`));
        assert.equal(await session.page.locator('#container.gallery_view .view_bottom_btnbox').evaluate((bar) => getComputedStyle(bar).backgroundImage.includes('linear-gradient')), true);
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

mobileTest('UI palette menu previews, saves, restores, and remains singleton', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, {
        storage: { ...noStatsStorage, [storageKeys.palette]: 'blue' },
        viewport: { width: 390, height: 844 }
    });
    try {
        await session.goto('/board/lists?id=test');
        const menuLabels = await session.page.evaluate(() => window.__dcufTestbedGM.snapshot().menuLabels);
        assert.equal(menuLabels.filter((label) => label === 'UI 색상 설정').length, 1);

        await session.page.evaluate(() => window.__dcufTestbedGM.invokeMenu('UI 색상 설정'));
        await session.page.evaluate(() => window.__dcufTestbedGM.invokeMenu('UI 색상 설정'));
        const panel = session.page.locator('#dcuf-palette-panel');
        assert.equal(await panel.count(), 1);
        assert.equal(await panel.locator('.dcuf-palette-option').count(), 14);
        assert.equal(await panel.getAttribute('role'), 'dialog');
        const geometry = await panel.evaluate((element) => {
            const rect = element.getBoundingClientRect();
            const close = element.querySelector('.dcuf-palette-close').getBoundingClientRect();
            const option = element.querySelector('.dcuf-palette-option').getBoundingClientRect();
            return {
                rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
                viewport: { width: innerWidth, height: innerHeight },
                close: { width: close.width, height: close.height },
                optionHeight: option.height,
                zIndex: Number(getComputedStyle(element.parentElement).zIndex)
            };
        });
        assert.equal(geometry.rect.left >= 8 && geometry.rect.top >= 8, true, JSON.stringify(geometry));
        assert.equal(geometry.rect.right <= geometry.viewport.width - 8 && geometry.rect.bottom <= geometry.viewport.height - 8, true, JSON.stringify(geometry));
        assert.equal(geometry.close.width >= 44 && geometry.close.height >= 44, true);
        assert.equal(geometry.optionHeight >= 44, true);
        assert.equal(geometry.zIndex >= 2147483646, true);

        const scrollContract = await panel.locator('.dcuf-palette-options').evaluate((element) => {
            element.scrollTop = Math.min(160, element.scrollHeight);
            return {
                clientHeight: element.clientHeight,
                scrollHeight: element.scrollHeight,
                scrollTop: element.scrollTop,
                overflowY: getComputedStyle(element).overflowY,
                touchAction: getComputedStyle(element).touchAction
            };
        });
        assert.equal(scrollContract.scrollHeight > scrollContract.clientHeight, true, JSON.stringify(scrollContract));
        assert.equal(scrollContract.scrollTop > 0, true, JSON.stringify(scrollContract));
        assert.equal(scrollContract.overflowY, 'auto', JSON.stringify(scrollContract));
        assert.equal(scrollContract.touchAction.includes('pan-y'), true, JSON.stringify(scrollContract));

        const beforeDrag = await panel.boundingBox();
        const headerBox = await panel.locator('.dcuf-palette-header').boundingBox();
        await session.page.mouse.move(headerBox.x + 90, headerBox.y + (headerBox.height / 2));
        await session.page.mouse.down();
        await session.page.mouse.move(headerBox.x + 112, headerBox.y + (headerBox.height / 2) + 24, { steps: 5 });
        await session.page.mouse.up();
        const afterDrag = await panel.boundingBox();
        assert.equal(Math.abs(afterDrag.x - beforeDrag.x) >= 8 || Math.abs(afterDrag.y - beforeDrag.y) >= 8, true, JSON.stringify({ beforeDrag, afterDrag }));
        assert.equal(afterDrag.x >= 4 && afterDrag.y >= 4, true, JSON.stringify(afterDrag));
        assert.equal(afterDrag.x + afterDrag.width <= 386 && afterDrag.y + afterDrag.height <= 840, true, JSON.stringify(afterDrag));

        const resizeHandle = panel.locator('.dcuf-palette-resize-handle');
        const resizeHandleBox = await resizeHandle.boundingBox();
        const beforeResize = await panel.boundingBox();
        await session.page.mouse.move(resizeHandleBox.x + (resizeHandleBox.width / 2), resizeHandleBox.y + (resizeHandleBox.height / 2));
        await session.page.mouse.down();
        await session.page.mouse.move(resizeHandleBox.x - 36, resizeHandleBox.y - 72, { steps: 5 });
        await session.page.mouse.up();
        const afterResize = await panel.boundingBox();
        assert.equal(afterResize.width < beforeResize.width && afterResize.height < beforeResize.height, true, JSON.stringify({ beforeResize, afterResize }));
        assert.equal(afterResize.width >= 300 && afterResize.height >= 320, true, JSON.stringify(afterResize));

        await panel.locator('[data-palette-id="rose"]').click();
        const roseContrast = await panel.locator('[data-dcuf-palette-action="save"]').evaluate((element) => {
            const style = getComputedStyle(element);
            const rgb = (value) => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
            const luminance = (value) => {
                const [r, g, b] = rgb(value).map((channel) => {
                    const normalized = channel / 255;
                    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
                });
                return 0.2126 * r + 0.7152 * g + 0.0722 * b;
            };
            const foreground = luminance(style.color);
            const background = luminance(style.backgroundColor);
            return {
                ratio: (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05),
                onAccent: getComputedStyle(document.documentElement).getPropertyValue('--dcuf-theme-on-accent').trim().toLowerCase()
            };
        });
        assert.equal(roseContrast.onAccent, '#fff');
        assert.equal(roseContrast.ratio >= 4.5, true, JSON.stringify(roseContrast));

        const writesBeforePreview = (await session.page.evaluate(() => window.__dcufTestbedGM.snapshot().writes)).length;
        await panel.locator('[data-palette-id="purple"]').click();
        assert.equal(await session.page.getAttribute('html', 'data-dcuf-palette'), 'purple');
        assert.equal((await session.page.evaluate(() => window.__dcufTestbedGM.snapshot().writes)).length, writesBeforePreview);
        await panel.locator('[data-dcuf-palette-action="cancel"]').click();
        assert.equal(await session.page.getAttribute('html', 'data-dcuf-palette'), 'blue');

        await session.page.evaluate(() => window.__dcufTestbedGM.invokeMenu('UI 색상 설정'));
        await panel.locator('[data-palette-id="purple"]').click();
        await panel.locator('[data-dcuf-palette-action="save"]').click();
        assert.equal(await session.page.locator('#dcuf-palette-panel').count(), 0);
        assert.equal(await session.page.getAttribute('html', 'data-dcuf-palette'), 'purple');
        assert.equal(await session.page.evaluate((key) => window.__dcufTestbedGM.snapshot().values[key], storageKeys.palette), 'purple');

        await session.page.evaluate(() => window.__dcufTestbedGM.invokeMenu('UI 색상 설정'));
        await panel.locator('[data-palette-id="green"]').click();
        await session.page.keyboard.press('Escape');
        assert.equal(await session.page.getAttribute('html', 'data-dcuf-palette'), 'purple');

        await session.page.evaluate(() => window.__dcufTestbedGM.invokeMenu('UI 색상 설정'));
        await panel.locator('[data-dcuf-palette-action="default"]').click();
        assert.equal(await session.page.getAttribute('html', 'data-dcuf-palette'), 'blue');
        await session.page.locator('#dcuf-palette-overlay').click({ position: { x: 3, y: 3 } });
        assert.equal(await session.page.getAttribute('html', 'data-dcuf-palette'), 'purple');

        await session.page.evaluate(() => window.__dcufFixture.toggleDark(true));
        await session.page.evaluate(() => window.__dcufTestbedGM.invokeMenu('UI 색상 설정'));
        const darkContract = await session.page.evaluate(() => {
            const root = getComputedStyle(document.documentElement);
            const save = document.querySelector('#dcuf-palette-panel [data-dcuf-palette-action="save"]');
            const style = getComputedStyle(save);
            const rgb = (value) => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
            const luminance = (value) => {
                const [r, g, b] = rgb(value).map((channel) => {
                    const normalized = channel / 255;
                    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
                });
                return 0.2126 * r + 0.7152 * g + 0.0722 * b;
            };
            const foreground = luminance(style.color);
            const background = luminance(style.backgroundColor);
            return {
                accent: root.getPropertyValue('--dcuf-theme-accent').trim().toLowerCase(),
                contrast: (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05),
                panelBackground: getComputedStyle(document.querySelector('#dcuf-palette-panel')).backgroundColor
            };
        });
        assert.equal(darkContract.accent, '#c4b5fd');
        assert.equal(darkContract.contrast >= 4.5, true, `save contrast: ${darkContract.contrast}`);
        assert.notEqual(darkContract.panelBackground, 'rgb(255, 255, 255)');
        await session.page.keyboard.press('Escape');
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

mobileTest('UI palette save failure keeps the dialog open and committed value intact', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, {
        storage: { ...noStatsStorage, [storageKeys.palette]: 'blue' },
        gmBehavior: { rejectWriteOnceKeys: [storageKeys.palette] }
    });
    try {
        await session.goto('/board/lists?id=test');
        await session.page.evaluate(() => window.__dcufTestbedGM.invokeMenu('UI 색상 설정'));
        const panel = session.page.locator('#dcuf-palette-panel');
        await panel.locator('[data-palette-id="green"]').click();
        await panel.locator('[data-dcuf-palette-action="save"]').click();
        await panel.locator('.dcuf-palette-status').waitFor({ state: 'visible' });
        assert.equal((await panel.locator('.dcuf-palette-status').textContent()).includes('저장하지 못했습니다'), true);
        assert.equal(await panel.count(), 1);
        assert.equal(await session.page.evaluate((key) => window.__dcufTestbedGM.snapshot().values[key], storageKeys.palette), 'blue');
        await panel.locator('[data-dcuf-palette-action="cancel"]').click();
        assert.equal(await session.page.getAttribute('html', 'data-dcuf-palette'), 'blue');
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

pcTest('PC palette port themes only DCUF-owned controls and dialogs', 'functional', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, {
        storage: { ...noStatsStorage, [storageKeys.palette]: 'blue' },
        viewport: { width: 1280, height: 900 },
        hasTouch: false,
        isMobile: false
    });
    try {
        await session.goto('/board/lists?id=test');
        const menuLabels = await session.page.evaluate(() => window.__dcufTestbedGM.snapshot().menuLabels);
        assert.equal(menuLabels.filter((label) => label === 'UI 색상 설정').length, 1, JSON.stringify(menuLabels));

        const hostColorBefore = await session.page.locator('.page_head h2 a').evaluate((element) => getComputedStyle(element).color);
        await session.page.evaluate(() => window.__dcufTestbedGM.invokeMenu('글댓합 설정하기'));
        await session.page.locator('#dcinside-filter-setting').waitFor({ state: 'attached' });
        const blueSave = await session.page.locator('#dcinside-threshold-save').evaluate((element) => getComputedStyle(element).backgroundColor);
        assert.equal(blueSave, 'rgb(36, 91, 218)');
        await session.page.locator('#dcinside-filter-setting').evaluate((element) => element.remove());

        await session.page.evaluate(() => window.__dcufTestbedGM.invokeMenu('UI 색상 설정'));
        const palettePanel = session.page.locator('#dcuf-palette-panel');
        assert.equal(await palettePanel.locator('.dcuf-palette-option').count(), 14);

        const pcBeforeDrag = await palettePanel.boundingBox();
        const pcHeader = await palettePanel.locator('.dcuf-palette-header').boundingBox();
        await session.page.mouse.move(pcHeader.x + 120, pcHeader.y + (pcHeader.height / 2));
        await session.page.mouse.down();
        await session.page.mouse.move(pcHeader.x + 190, pcHeader.y + (pcHeader.height / 2) + 45, { steps: 5 });
        await session.page.mouse.up();
        const pcAfterDrag = await palettePanel.boundingBox();
        assert.equal(pcAfterDrag.x > pcBeforeDrag.x && pcAfterDrag.y > pcBeforeDrag.y, true, JSON.stringify({ pcBeforeDrag, pcAfterDrag }));

        const pcResizeHandle = await palettePanel.locator('.dcuf-palette-resize-handle').boundingBox();
        const pcBeforeResize = await palettePanel.boundingBox();
        await session.page.mouse.move(pcResizeHandle.x + (pcResizeHandle.width / 2), pcResizeHandle.y + (pcResizeHandle.height / 2));
        await session.page.mouse.down();
        await session.page.mouse.move(pcResizeHandle.x - 105, pcResizeHandle.y - 185, { steps: 5 });
        await session.page.mouse.up();
        const pcAfterResize = await palettePanel.boundingBox();
        assert.equal(pcAfterResize.width < pcBeforeResize.width && pcAfterResize.height < pcBeforeResize.height, true, JSON.stringify({ pcBeforeResize, pcAfterResize }));
        const pcScroll = await palettePanel.locator('.dcuf-palette-options').evaluate((element) => {
            element.scrollTop = 120;
            return { clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, scrollTop: element.scrollTop };
        });
        assert.equal(pcScroll.scrollHeight > pcScroll.clientHeight && pcScroll.scrollTop > 0, true, JSON.stringify(pcScroll));

        await palettePanel.locator('[data-palette-id="orange"]').click();
        assert.equal(await session.page.getAttribute('html', 'data-dcuf-palette'), 'orange');
        const previewContract = await session.page.evaluate(() => {
            const css = document.getElementById('dcuf-mobile-palette-style')?.textContent || '';
            return {
                hostColor: getComputedStyle(document.querySelector('.page_head h2 a')).color,
                styleCount: document.querySelectorAll('#dcuf-mobile-palette-style').length,
                customLists: document.querySelectorAll('.custom-mobile-list').length,
                forbiddenTokens: [
                    '.custom-mobile-list', '.custom-post-item', '.custom-bottom-controls',
                    '.gnb_bar', '.page_head', '.view_content_wrap', '.writing_view_box', '#focus_cmt',
                    'form#write', 'form.dcuf-write-form'
                ].filter((token) => css.includes(token))
            };
        });
        assert.equal(previewContract.hostColor, hostColorBefore);
        assert.equal(previewContract.styleCount, 1);
        assert.equal(previewContract.customLists, 0);
        assert.deepEqual(previewContract.forbiddenTokens, []);
        await palettePanel.locator('[data-dcuf-palette-action="save"]').click();
        assert.equal(await session.page.evaluate((key) => window.__dcufTestbedGM.snapshot().values[key], storageKeys.palette), 'orange');

        await session.page.evaluate(() => window.__dcufTestbedGM.invokeMenu('글댓합 설정하기'));
        await session.page.locator('#dcinside-filter-setting').waitFor({ state: 'attached' });
        const orangeSave = await session.page.locator('#dcinside-threshold-save').evaluate((element) => getComputedStyle(element).backgroundColor);
        assert.equal(orangeSave, 'rgb(154, 52, 18)');
        await session.page.locator('#dcinside-filter-setting').evaluate((element) => element.remove());

        const fab = session.page.locator('#dc-personal-block-fab');
        const drawer = session.page.locator('#dc-personal-block-drawer');
        await fab.click();
        const drawerIconColor = await drawer.locator('.dcuf-menu-icon').first().evaluate((element) => getComputedStyle(element).color);
        assert.equal(drawerIconColor, 'rgb(194, 65, 12)');
        await drawer.locator('[data-dcuf-fab-action="quick-block"]').click();
        const prompt = session.page.locator('#dc-selection-popup.dcuf-selection-prompt');
        await prompt.waitFor({ state: 'visible' });
        const promptContract = await prompt.evaluate((element) => ({
            backgroundImage: getComputedStyle(element).backgroundImage,
            iconColor: getComputedStyle(element.querySelector('.dcuf-selection-prompt-icon')).color
        }));
        assert.equal(promptContract.iconColor, 'rgb(194, 65, 12)', JSON.stringify(promptContract));
        assert.equal(promptContract.backgroundImage.includes('59, 113, 253'), false, JSON.stringify(promptContract));
        await prompt.locator('.popup-buttons button').click();

        await fab.click();
        await drawer.locator('[data-dcuf-fab-action="manual-block"]').click();
        const manual = session.page.locator('#dc-manual-block-panel');
        await manual.waitFor({ state: 'visible' });
        await manual.locator('#dc-manual-block-value').focus();
        const manualContract = await manual.evaluate((element) => ({
            kicker: getComputedStyle(element.querySelector('.dcuf-manual-kicker')).color,
            activeType: getComputedStyle(element.querySelector('[data-manual-block-type][aria-pressed="true"]')).color,
            inputBorder: getComputedStyle(element.querySelector('#dc-manual-block-value')).borderColor
        }));
        assert.deepEqual(manualContract, {
            kicker: 'rgb(194, 65, 12)',
            activeType: 'rgb(154, 52, 18)',
            inputBorder: 'rgb(194, 65, 12)'
        });
        await manual.locator('[data-manual-block-action="close"]').click();

        await session.page.evaluate(() => window.__dcufTestbedGM.invokeMenu('차단 유저 관리'));
        await session.page.locator('#dc-block-management-panel').waitFor({ state: 'attached' });
        const activeTab = await session.page.locator('#dc-block-management-panel .panel-tab.active').evaluate((element) => ({
            background: getComputedStyle(element).backgroundColor,
            color: getComputedStyle(element).color
        }));
        assert.equal(activeTab.background, 'rgb(255, 240, 231)', JSON.stringify(activeTab));
        assert.notEqual(activeTab.color, 'rgb(0, 123, 255)', JSON.stringify(activeTab));
        const managementAccent = await session.page.locator('#dc-block-management-panel').evaluate((element) => ({
            kicker: getComputedStyle(element.querySelector('.panel-kicker')).color,
            addBackground: getComputedStyle(element.querySelector('.panel-add-btn')).backgroundColor
        }));
        assert.deepEqual(managementAccent, {
            kicker: 'rgb(194, 65, 12)',
            addBackground: 'rgb(255, 240, 231)'
        });
        await session.page.locator('#dc-block-management-panel .panel-backup-btn').click();
        const backupContract = await session.page.locator('#dc-backup-popup').evaluate((element) => ({
            downloadBackground: getComputedStyle(element.querySelector('.export-btn-download')).backgroundColor,
            copyBackground: getComputedStyle(element.querySelector('.export-btn')).backgroundColor,
            importBackground: getComputedStyle(element.querySelector('.import-btn')).backgroundColor
        }));
        assert.deepEqual(backupContract, {
            downloadBackground: 'rgb(255, 240, 231)',
            copyBackground: 'rgb(154, 52, 18)',
            importBackground: 'rgb(154, 52, 18)'
        });
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

mobileTest('UI palette tokens drive the mobile write surface', 'write', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, {
        storage: { ...noStatsStorage, [storageKeys.palette]: 'orange' },
        viewport: { width: 390, height: 844 }
    });
    try {
        await session.goto('/board/write/?id=test');
        const contract = await session.page.evaluate(() => {
            const body = getComputedStyle(document.body);
            const submit = getComputedStyle(document.querySelector('#write-submit'));
            return {
                palette: document.documentElement.getAttribute('data-dcuf-palette'),
                accent: body.getPropertyValue('--dcuf-write-accent').trim().toLowerCase(),
                strong: body.getPropertyValue('--dcuf-write-accent-strong').trim().toLowerCase(),
                submitBackground: submit.backgroundColor
            };
        });
        assert.deepEqual(contract, { palette: 'orange', accent: '#c2410c', strong: '#9a3412', submitBackground: 'rgb(154, 52, 18)' });
        await session.page.evaluate(() => window.__dcufFixture.toggleDark(true));
        await session.page.waitForTimeout(40);
        const darkContract = await session.page.evaluate(() => {
            const body = getComputedStyle(document.body);
            const submit = getComputedStyle(document.querySelector('#write-submit'));
            return {
                accent: body.getPropertyValue('--dcuf-write-accent').trim().toLowerCase(),
                strong: body.getPropertyValue('--dcuf-write-accent-strong').trim().toLowerCase(),
                submitBackground: submit.backgroundColor
            };
        });
        assert.deepEqual(darkContract, { accent: '#fdba74', strong: '#c2410c', submitBackground: 'rgb(194, 65, 12)' });
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
});

mobileTest('single-tone UI palette keeps mobile write actions readable', 'write', async ({ browser, server }) => {
    const session = await createTestPage(browser, server.baseUrl, {
        storage: { ...noStatsStorage, [storageKeys.palette]: 'rose' },
        viewport: { width: 390, height: 844 }
    });
    const readContract = () => session.page.locator('#write-submit').evaluate((element) => {
        const style = getComputedStyle(element);
        const luminance = (value) => {
            const channels = (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number).map((channel) => {
                const normalized = channel / 255;
                return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
            });
            return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
        };
        const foreground = luminance(style.color);
        const background = luminance(style.backgroundColor);
        return {
            background: style.backgroundColor,
            color: style.color,
            contrast: (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)
        };
    });
    try {
        await session.goto('/board/write/?id=test');
        const light = await readContract();
        assert.deepEqual({ background: light.background, color: light.color }, { background: 'rgb(190, 18, 60)', color: 'rgb(255, 255, 255)' });
        assert.equal(light.contrast >= 4.5, true, JSON.stringify(light));

        await session.page.evaluate(() => window.__dcufFixture.toggleDark(true));
        await session.page.waitForTimeout(40);
        const dark = await readContract();
        assert.deepEqual({ background: dark.background, color: dark.color }, { background: 'rgb(159, 18, 57)', color: 'rgb(255, 255, 255)' });
        assert.equal(dark.contrast >= 4.5, true, JSON.stringify(dark));
        assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
    } finally { await session.close(); }
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
    const comparisonFields = [
        'wallDurationMs',
        'domNodesAfter',
        'mutationCallbacks',
        'mutationRecords',
        'processedDomNodes',
        'documentSelectorCalls',
        'documentSelectorAllCalls',
        'documentSelectorAllResults',
        'elementSelectorCalls',
        'layoutReadCount',
        'geometryReadCount',
        'timeoutsScheduled',
        'intervalsScheduled',
        'animationFramesScheduled',
        'activeTimeoutsAfter',
        'activeIntervalsAfter',
        'activeAnimationFramesAfter',
        'uidRequests',
        'heapUsedDelta'
    ];
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
