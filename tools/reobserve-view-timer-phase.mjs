import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { launchBrowser, storageKeys } from '../testbed/harness/runner-utils.mjs';
import { loadHarnessSource } from '../testbed/harness/userscript-loader.mjs';
import { startServer } from '../testbed/server/server.mjs';
import { createEvidenceBinding, digestEvidenceBytes } from './evidence-binding.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), '..');
const outputPath = path.join(root, 'testbed/artifacts/view-timer-phase-reobservation.json');
const rawPath = path.join(root, 'testbed/artifacts/final-shared-filter-storage-C84-1A7.json');
const observerPath = path.join(root, 'testbed/run-shared-filter-storage-differential.mjs');
const runtimePaths = {
    control: path.join(root, 'testbed/artifacts/baseline-mobile-stable.user.js'),
    candidate: path.join(root, 'testbed/artifacts/runtime-under-test.user.js'),
};
const exactHashes = {
    control: '32BA208DDD9973A7EEC343F01E963A833AB4F0C084987077EDAE46844383C25D',
    candidate: 'C84AD9220A060CC3AF91F3039F07B13FAD75521DA63201046E3693F875DC03C7',
};
const rawSha256 = 'B7D18ED62CB84144424E082AC6AD3BE5B9C4B322828590D0EBC758E42EA1DEFF';
const scenarios = [
    { id: 'threshold-zero', uid: 'safe-threshold-no-api', threshold: 0, masterDisabled: false, blocked: false },
    { id: 'master-disabled', uid: 'safe-master-no-api', threshold: 10, masterDisabled: true, blocked: false },
    { id: 'personal-block-positive', uid: 'blocked-master-no-api', threshold: 0, masterDisabled: false, blocked: true },
];
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const check = (ok, message) => { if (!ok) throw new Error(message); };

// This is inserted into the assembled harness after its existing instrumentation and
// before the exact userscript. No shared fixture, harness, or raw observer is edited.
const timerTraceSource = String.raw`(() => {
    const priorSetTimeout = globalThis.setTimeout;
    const priorClearTimeout = globalThis.clearTimeout;
    const priorClearInterval = globalThis.clearInterval;
    const events = [];
    const activeById = new Map();
    const idByHandle = new Map();
    let nextId = 1;
    const ownerFromStack = (stack) => {
        if (stack.includes('bindArticleAdCleanup')) return 'article-ad-cleanup';
        if (stack.includes('scheduleSearchDrawerReserveUpdate')) return 'search-drawer-reserve';
        return 'unattributed-source-site';
    };
    const end = (handle, type, callerStack = null) => {
        const id = idByHandle.get(handle);
        if (!id) return;
        const detail = activeById.get(id);
        if (!detail) return;
        const atMs = performance.now();
        events.push({ type, id, atMs, callerStack });
        idByHandle.delete(handle);
        activeById.delete(id);
    };
    globalThis.setTimeout = function (callback, delay, ...args) {
        if (typeof callback !== 'function') return priorSetTimeout.call(this, callback, delay, ...args);
        const id = nextId++;
        const scheduledAtMs = performance.now();
        const stack = String(new Error('timer scheduled').stack || '');
        const normalizedDelay = Number(delay) || 0;
        let handle;
        const wrapped = function (...callbackArgs) {
            end(handle, 'completed');
            return callback.apply(this, callbackArgs);
        };
        handle = priorSetTimeout.call(this, wrapped, delay, ...args);
        const detail = { id, delay: normalizedDelay, scheduledAtMs,
            dueAtMs: scheduledAtMs + Math.max(0, normalizedDelay),
            owner: ownerFromStack(stack), stack };
        activeById.set(id, detail);
        idByHandle.set(handle, id);
        events.push({ type: 'scheduled', ...detail });
        return handle;
    };
    globalThis.clearTimeout = function (handle) {
        if (idByHandle.has(handle)) end(handle, 'cleared-timeout', String(new Error('timer cleared').stack || ''));
        return priorClearTimeout.call(this, handle);
    };
    globalThis.clearInterval = function (handle) {
        if (idByHandle.has(handle)) end(handle, 'cleared-interval', String(new Error('timer cleared').stack || ''));
        return priorClearInterval.call(this, handle);
    };
    globalThis.__dcufTimerPhaseTrace = {
        snapshot() {
            return { observedAtMs: performance.now(),
                active: [...activeById.values()].map((item) => ({ ...item })),
                events: events.map((item) => ({ ...item })) };
        }
    };
})()`;

function seedFor(scenario) {
    return {
        [storageKeys.masterDisabled]: scenario.masterDisabled,
        [storageKeys.threshold]: scenario.threshold,
        [storageKeys.ratioEnabled]: false,
        [storageKeys.personalEnabled]: true,
        [storageKeys.personalList]: {
            uids: [{ id: 'blocked-master-no-api', name: 'Synthetic blocked UID' }],
            nicknames: ['synthetic-nick'], ips: ['1.2.3.4'],
        },
        [storageKeys.blockedUids]: JSON.stringify({ seed: { ts: 1900000000000, sum: 2, post: 1, comment: 1, ratioBlocked: false } }),
        [storageKeys.blockedGuests]: JSON.stringify(['5.6.7.8']),
        [storageKeys.shortcut]: 'Shift+S',
    };
}

async function createTracedPage(browser, baseUrl, role, storage) {
    process.env.DCUF_TESTBED_USERSCRIPT = runtimePaths[role];
    process.env.DCUF_TESTBED_TARGET = 'mobile';
    const runtimeSource = (await readFile(runtimePaths[role], 'utf8')).replace(/^\uFEFF/, '');
    const harnessSource = await loadHarnessSource({ storage });
    const insertionAt = harnessSource.indexOf(runtimeSource);
    check(insertionAt >= 0 && harnessSource.indexOf(runtimeSource, insertionAt + 1) < 0,
        `${role}: assembled harness has no unique exact userscript insertion point`);
    const tracedHarness = `${harnessSource.slice(0, insertionAt)}${timerTraceSource}\n;\n${harnessSource.slice(insertionAt)}`;
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.addInitScript({ content: tracedHarness });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => consoleErrors.push(error.stack || error.message));
    return {
        page, consoleErrors,
        async goto() {
            await page.goto(`${baseUrl}/board/view?id=test&no=1001`, { waitUntil: 'domcontentloaded' });
            await page.waitForFunction(() => document.documentElement.classList.contains('script-ui-ready'), null, { timeout: 12000 });
            await page.waitForTimeout(180);
        },
        async close() { await context.close(); },
    };
}

async function sample(page, server, consoleErrors, caseId, step) {
    const value = await page.evaluate(() => {
        const trace = window.__dcufTimerPhaseTrace.snapshot();
        const metrics = window.__dcufTestbedMetrics.snapshot();
        const gm = window.__dcufTestbedGM.snapshot();
        const bus = window.__dcufRuntimeCoordinator?._mutationSubscribers;
        const text = document.querySelector('#comment_li_19001 .cmt_txtbox .usertxt');
        const embeddedList = document.querySelector('.fixture-view-list .custom-mobile-list');
        const listItems = [...(embeddedList?.querySelectorAll('.custom-post-item') || [])];
        const firstItem = listItems[0] || null;
        const firstRowId = firstItem?.getAttribute('data-custom-row-id') || '';
        const firstOriginal = firstRowId
            ? [...document.querySelectorAll('.fixture-view-list tr[data-custom-row-id]')]
                .find((row) => row.getAttribute('data-custom-row-id') === firstRowId)
            : null;
        const visible = (element) => {
            if (!(element instanceof HTMLElement) || element.getClientRects().length === 0) return false;
            for (let node = element; node instanceof HTMLElement; node = node.parentElement) {
                const style = getComputedStyle(node);
                if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
            }
            return true;
        };
        return {
            observedAtMs: trace.observedAtMs,
            uiReady: document.documentElement.classList.contains('script-ui-ready'),
            busPresent: bus instanceof Map,
            recoverySubscriberPresent: Boolean(bus?.has('ui-post-reveal-recovery')),
            recovery: window.__dcufRevealDebug?.recovery || null,
            bootState: window.__dcufBootController?.state || null,
            timers: metrics.activeTimeouts,
            active: trace.active.map((item) => ({ ...item, ageMs: trace.observedAtMs - item.scheduledAtMs })),
            traceEventCount: trace.events.length,
            frames: metrics.activeAnimationFrames,
            intervals: metrics.activeIntervals,
            pending: { mutations: metrics.dcuf?.pendingMutations || 0,
                mutationRaf: Boolean(metrics.dcuf?.pendingMutationRaf),
                mutationTimer: Boolean(metrics.dcuf?.pendingMutationTimer),
                taskQueues: metrics.dcuf?.taskQueues || 0 },
            filterPassCount: metrics.filterPasses.length,
            comment: text ? { text: text.textContent || '', visible: visible(text) } : null,
            embeddedList: { itemCount: listItems.length,
                firstDisplay: firstItem ? getComputedStyle(firstItem).display : null,
                firstOriginalDisplay: firstOriginal ? getComputedStyle(firstOriginal).display : null,
                firstOriginalHostHidden: Boolean(firstOriginal?.matches('[data-fixture-host-css-hidden="1"], [data-fixture-host-hidden="1"]')),
                visibleItemCount: listItems.filter((item) => getComputedStyle(item).display !== 'none').length,
                positiveAreaItemCount: listItems.filter((item) => item.getBoundingClientRect().width > 0
                    && item.getBoundingClientRect().height > 0 && getComputedStyle(item).display !== 'none').length },
            gm: { values: gm.values, writes: gm.writes },
            xhrRequests: metrics.xhrRequests.map(({ method, url, status }) =>
                ({ method, path: new URL(url, location.href).pathname, status })),
            articleAdScans: metrics.dcuf?.counters?.['ui.articleAd.scans'] || 0,
            errors: metrics.errors,
        };
    });
    check(value.timers === value.active.length, `${caseId}/${step}: timer tracer disagrees with harness active count`);
    return { caseId, step, value, uidRequests: [...server.state.uidRequests], consoleErrors: [...consoleErrors] };
}

async function observeScenario(browser, server, role, scenario) {
    server.reset();
    const session = await createTracedPage(browser, server.baseUrl, role, seedFor(scenario));
    try {
        await session.goto();
        await session.page.waitForFunction(() => {
            const bus = window.__dcufRuntimeCoordinator?._mutationSubscribers;
            return bus instanceof Map && !bus.has('ui-post-reveal-recovery');
        }, null, { timeout: 8000 });
        const before = await sample(session.page, server, session.consoleErrors, scenario.id, 'before-insertion');
        await session.page.evaluate((uid) => window.__dcufFixture.addComments(1,
            { uid, id: 19001, text: 'Synthetic filter observation' }), scenario.uid);
        await session.page.waitForFunction(({ passes }) => {
            const metrics = window.__dcufTestbedMetrics.snapshot();
            return document.getElementById('comment_li_19001') && metrics.filterPasses.length > passes;
        }, { passes: before.value.filterPassCount }, { timeout: 8000 });
        await session.page.waitForFunction(({ timers, frames, intervals }) => {
            const metrics = window.__dcufTestbedMetrics.snapshot();
            const diagnostics = metrics.dcuf || {};
            return metrics.activeTimeouts <= timers && metrics.activeAnimationFrames <= frames
                && metrics.activeIntervals <= intervals && !diagnostics.pendingMutations
                && !diagnostics.pendingMutationRaf && !diagnostics.pendingMutationTimer && !diagnostics.taskQueues;
        }, before.value, { timeout: 8000 });
        const after = await sample(session.page, server, session.consoleErrors, scenario.id, 'after-insertion');
        await session.page.waitForFunction(() => {
            const trace = window.__dcufTimerPhaseTrace.snapshot();
            const diagnostics = window.__dcufTestbedMetrics.snapshot();
            const recovery = window.__dcufRevealDebug?.recovery;
            const scheduledAds = trace.events.filter((event) =>
                event.type === 'scheduled' && event.owner === 'article-ad-cleanup');
            const completedAds = new Set(trace.events.filter((event) => event.type === 'completed').map((event) => event.id));
            return recovery?.active === false && scheduledAds.length === 5
                && scheduledAds.every((event) => completedAds.has(event.id))
                && diagnostics.activeTimeouts === 0 && diagnostics.activeAnimationFrames === 0
                && diagnostics.activeIntervals === 0 && !diagnostics.dcuf?.pendingMutations
                && !diagnostics.dcuf?.pendingMutationRaf && !diagnostics.dcuf?.pendingMutationTimer
                && !diagnostics.dcuf?.taskQueues;
        }, null, { timeout: 12000 });
        const terminal = await sample(session.page, server, session.consoleErrors, scenario.id, 'terminal-settled');
        const timerEvents = await session.page.evaluate(() => window.__dcufTimerPhaseTrace.snapshot().events);
        return { caseId: scenario.id, samples: { before, after, terminal }, timerEvents };
    } finally {
        await session.close();
    }
}

export async function reobserveViewTimerPhase() {
    const rawBytes = await readFile(rawPath);
    check(sha(rawBytes) === rawSha256, 'raw report bytes changed');
    const raw = JSON.parse(rawBytes);
    const currentBinding = await createEvidenceBinding(root);
    check(isDeepStrictEqual(raw.evidenceBinding, currentBinding), 'raw report evidence binding changed');
    const observerSha256 = digestEvidenceBytes('testbed/run-shared-filter-storage-differential.mjs',
        await readFile(observerPath)).toUpperCase();
    check(raw.observerSha256 === observerSha256, 'raw observer changed');
    check(raw.resourceStatus === 'DIFFERENT_UNCLASSIFIED'
        && raw.functionalStatus === 'MATCHED_IN_COVERED_STATES'
        && raw.resourceDifferences.filter((item) => item.target === 'mobile' && item.field === 'resource.value.timers').length === 6,
    'raw six-step timer scope changed');
    for (const role of ['control', 'candidate']) {
        check(sha(await readFile(runtimePaths[role])) === exactHashes[role], `${role}: exact artifact changed`);
        check(raw.exactArtifacts.mobile[role] === exactHashes[role], `${role}: raw artifact binding changed`);
    }
    const server = await startServer();
    const browser = await launchBrowser();
    try {
        const sides = {};
        for (const role of ['control', 'candidate']) {
            sides[role] = [];
            for (const scenario of scenarios) {
                sides[role].push(await observeScenario(browser, server, role, scenario));
            }
        }
        return {
            schemaVersion: 1,
            kind: 'view-timer-phase-reobservation',
            scope: 'Three exact mobile view scenarios, raw-gate replay before/after and terminal event-defined phase. Original six timer fields remain unclassified because their pending identities were not saved.',
            rawStatus: raw.resourceStatus,
            originalTimerFieldsStatus: 'UNCLASSIFIED_ORIGINAL_SNAPSHOTS',
            exactArtifacts: exactHashes,
            rawReportSha256: rawSha256,
            observerSha256,
            probeScriptSha256: sha(await readFile(scriptPath)),
            tracerSha256: sha(Buffer.from(timerTraceSource)),
            evidenceBinding: currentBinding,
            browser: browser.version(),
            scenarios,
            sides,
        };
    } finally {
        await browser.close();
        await server.close();
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
    try {
        const report = await reobserveViewTimerPhase();
        await mkdir(path.dirname(outputPath), { recursive: true });
        await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
        console.log(`View timer phase reobservation: ${outputPath}`);
    } catch (error) {
        console.error(`View timer phase reobservation BLOCKED: ${error.message}`);
        process.exitCode = 1;
    }
}
