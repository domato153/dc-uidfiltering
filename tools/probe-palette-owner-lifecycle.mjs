import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTestPage, launchBrowser, storageKeys } from '../testbed/harness/runner-utils.mjs';
import { startServer } from '../testbed/server/server.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtime = path.join(root, 'testbed/artifacts/runtime-under-test.user.js');
const expectedKeys = ['header-shell-style', 'gallery-page-head-style', 'header-gnb-style', 'header-recent-visit-navigation'];

export async function probePaletteOwnerLifecycle({ settleEachPhase = false } = {}) {
    process.env.DCUF_TESTBED_USERSCRIPT = runtime;
    process.env.DCUF_TESTBED_TARGET = 'mobile';
    const server = await startServer();
    const browser = await launchBrowser();
    try {
        const session = await createTestPage(browser, server.baseUrl, {
            storage: { [storageKeys.threshold]: 0, [storageKeys.palette]: 'blue',
                [storageKeys.personalEnabled]: true,
                [storageKeys.personalList]: { uids: [], nicknames: [], ips: [] } },
        });
        try {
            await session.goto('/board/lists?id=test');
            await session.page.waitForFunction((keys) => {
                const bus = window.__dcufRuntimeCoordinator?._mutationSubscribers;
                return keys.every((key) => bus?.has(key))
                    && !bus.has('ui-post-reveal-recovery')
                    && document.querySelector('.newvisit_list')?.dataset.dcufRecentNavigationBound === '1';
            }, expectedKeys);
            const samplePhase = (name) => session.page.evaluate(({ keys, name }) => {
                const bus = window.__dcufRuntimeCoordinator;
                const adapters = [
                    window.__dcufHeaderShellHostAdapter,
                    window.__dcufGalleryPageHeadHostAdapter,
                    window.__dcufHeaderGnbHostAdapter,
                    window.__dcufHeaderRecentVisitHostAdapter,
                ];
                const styles = [
                    'dcuf-header-shell-style', 'dcuf-gallery-page-head-style',
                    'dcuf-header-gnb-style', 'dcuf-header-recent-visit-style',
                ];
                const sample = () => ({
                    keys: keys.filter((key) => bus._mutationSubscribers.has(key)),
                    allSubscriberKeys: [...bus._mutationSubscribers.keys()],
                    styleCounts: styles.map((id) => document.querySelectorAll(`#${id}`).length),
                    styleOwners: styles.map((id) => document.getElementById(id)?.getAttribute('data-dcuf-style-owner') ?? null),
                    adapterResources: adapters.map((adapter) => adapter.snapshotResources()),
                    activeListeners: window.__dcufTestbedMetrics.snapshot().activeListenerKeys,
                    activeObservers: (() => {
                        const metrics = window.__dcufTestbedMetrics.snapshot();
                        return metrics.mutationObserversCreated - metrics.mutationDisconnectCalls;
                    })(),
                });
                const act = (phase) => {
                    if (phase === 'disposed') adapters.forEach((adapter) => adapter.dispose());
                    if (phase === 'reconnected' || phase === 'repeated') {
                        adapters.forEach((adapter) => adapter.connect(document, { runtimeCoordinator: bus }));
                    }
                };
                if (name === 'all') return Object.fromEntries(['before', 'disposed', 'reconnected', 'repeated']
                    .map((phase) => { act(phase); return [phase, sample()]; }));
                act(name);
                return sample();
            }, { keys: expectedKeys, name });
            const lifecycle = settleEachPhase ? {} : await samplePhase('all');
            for (const name of settleEachPhase ? ['before', 'disposed', 'reconnected', 'repeated'] : []) {
                lifecycle[name] = await samplePhase(name);
                    await session.page.waitForFunction(() => {
                        const metrics = window.__dcufTestbedMetrics.snapshot();
                        return metrics.activeTimeouts === 0 && metrics.activeAnimationFrames === 0
                            && metrics.activeIntervals === 0 && !metrics.dcuf?.pendingMutations
                            && !metrics.dcuf?.pendingMutationRaf && !metrics.dcuf?.pendingMutationTimer
                            && !metrics.dcuf?.taskQueues;
                    });
                    const settledSample = await samplePhase('sample');
                    const settled = await session.page.evaluate(() => {
                        const m = window.__dcufTestbedMetrics.snapshot();
                        return { timers: m.activeTimeouts, frames: m.activeAnimationFrames, intervals: m.activeIntervals,
                            pendingMutations: m.dcuf?.pendingMutations || 0,
                            pendingMutationRaf: Boolean(m.dcuf?.pendingMutationRaf),
                            pendingMutationTimer: Boolean(m.dcuf?.pendingMutationTimer),
                            taskQueues: m.dcuf?.taskQueues || 0, errors: m.errors };
                    });
                    lifecycle[name] = { ...settledSample, settled };
            }
            await session.page.evaluate(() => {
                window.__paletteOwnerProbeEvents = [];
                window.addEventListener('dcuf:palette-change', (event) => window.__paletteOwnerProbeEvents.push(event.detail));
                window.__dcufTestbedGM.invokeMenu('UI 색상 설정');
            });
            await session.page.locator('[data-palette-id=purple]').click();
            const preview = await session.page.evaluate(() => ({
                palette: document.documentElement.getAttribute('data-dcuf-palette'),
                stored: window.__dcufTestbedGM.snapshot().values.dcuf_mobile_ui_palette,
                focus: document.activeElement?.dataset.paletteId || '',
                events: window.__paletteOwnerProbeEvents,
            }));
            await session.page.locator('[data-dcuf-palette-action=cancel]').click();
            const cancelled = await session.page.evaluate(() => ({
                palette: document.documentElement.getAttribute('data-dcuf-palette'),
                stored: window.__dcufTestbedGM.snapshot().values.dcuf_mobile_ui_palette,
                panelCount: document.querySelectorAll('#dcuf-palette-panel').length,
                writes: window.__dcufTestbedGM.snapshot().writes.filter((entry) => entry.key === 'dcuf_mobile_ui_palette'),
                events: window.__paletteOwnerProbeEvents,
                errors: window.__dcufTestbedMetrics.snapshot().errors,
            }));
            return { browser: browser.version(), runtime, lifecycle, preview, cancelled,
                consoleErrors: session.consoleErrors };
        } finally { await session.close(); }
    } finally { await browser.close(); await server.close(); }
}
