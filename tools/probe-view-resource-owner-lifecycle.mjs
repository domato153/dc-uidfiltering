import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTestPage, launchBrowser, storageKeys } from '../testbed/harness/runner-utils.mjs';
import { startServer } from '../testbed/server/server.mjs';
import { createEvidenceBinding } from './evidence-binding.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), '..');
const outputPath = path.join(root, 'testbed/artifacts/view-resource-owner-lifecycle-0C30.json');
const paths = {
    control: path.join(root, 'testbed/artifacts/baseline-mobile-stable.user.js'),
    candidate: path.join(root, 'testbed/artifacts/runtime-under-test.user.js'),
};
const expectedHashes = {
    control: '32BA208DDD9973A7EEC343F01E963A833AB4F0C084987077EDAE46844383C25D',
    candidate: '0C3076699E696AD3C252B5DF21D216F9B6EA32928B4C8A7C160DE0888926450A',
};
const addedOwners = [
    'ui-article-surface',
    'ui-comment-surface',
    'header-shell-style',
    'gallery-page-head-style',
    'header-gnb-style',
    'header-recent-visit-navigation',
];
const styleIds = [
    'dcuf-article-presenter',
    'dcuf-comment-presenter',
    'dcuf-header-shell-style',
    'dcuf-gallery-page-head-style',
    'dcuf-header-gnb-style',
    'dcuf-header-recent-visit-style',
];
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const check = (condition, message) => { if (!condition) throw new Error(message); };
const step = async (label, action) => {
    try { return await action(); }
    catch (error) { throw new Error(`${label}: ${error.message}`); }
};

function seed() {
    return {
        [storageKeys.masterDisabled]: false,
        [storageKeys.threshold]: 0,
        [storageKeys.ratioEnabled]: false,
        [storageKeys.personalEnabled]: true,
        [storageKeys.personalList]: {
            uids: [{ id: 'blocked-view-owner', name: 'Blocked view owner' }],
            nicknames: [],
            ips: [],
        },
        [storageKeys.blockedUids]: JSON.stringify({}),
        [storageKeys.blockedGuests]: JSON.stringify([]),
    };
}

async function waitSettled(page) {
    await page.waitForFunction(() => {
        const m = window.__dcufTestbedMetrics.snapshot();
        const d = m.dcuf || {};
        return m.activeTimeouts === 0 && m.activeAnimationFrames === 0 && m.activeIntervals === 0
            && !d.pendingMutations && !d.pendingMutationRaf && !d.pendingMutationTimer && !d.taskQueues;
    }, null, { timeout: 10000 });
}

async function observeSide(browser, server, role) {
    const runtimeBytes = await readFile(paths[role]);
    check(sha(runtimeBytes) === expectedHashes[role], `${role}: artifact bytes changed`);
    console.log(`View owner ${role} runtime: ${paths[role]}; SHA-256 ${sha(runtimeBytes)}`);
    process.env.DCUF_TESTBED_USERSCRIPT = paths[role];
    process.env.DCUF_TESTBED_TARGET = 'mobile';
    const session = await createTestPage(browser, server.baseUrl, { storage: seed() });
    try {
        await session.goto('/board/view?id=test&no=1001');
        await step(`${role}/initial-owner-wait`, () => session.page.waitForFunction(() => {
            const bus = window.__dcufRuntimeCoordinator?._mutationSubscribers;
            return bus && !bus.has('ui-post-reveal-recovery');
        }, null, { timeout: 8000 }));
        const startup = await session.page.evaluate(() => {
            const metrics = window.__dcufTestbedMetrics.snapshot();
            return {
                observedAtMs: performance.now(),
                timeoutScheduled: metrics.timeoutScheduled,
                timeoutCompleted: metrics.timeoutCompleted,
                timeoutCleared: metrics.timeoutCleared,
                subscribers: metrics.dcuf?.subscribers || [],
                timers: metrics.activeTimeoutDetails.map(({ delay, scheduledAt, stack }) => ({
                    delay,
                    scheduledAtMs: scheduledAt,
                    owner: stack.includes('bindArticleAdCleanup') ? 'runtime-article-ad-cleanup' : 'other-runtime',
                    stack,
                })),
                frames: metrics.activeAnimationFrames,
                intervals: metrics.activeIntervals,
                activeObservers: metrics.mutationObserversCreated - metrics.mutationDisconnectCalls,
                activeListeners: metrics.activeListenerKeys,
                errors: metrics.errors,
            };
        });

        await waitSettled(session.page);
        const adPath = await session.page.evaluate(() => {
            const before = window.__dcufDiagnostics?.snapshot?.().counters?.['ui.articleAd.removed'] || 0;
            const ad = document.createElement('div');
            ad.id = 'fixture-late-owner-ad';
            ad.className = 'view_ad_wrap';
            ad.innerHTML = '<iframe id="google_ads_iframe_late_owner" title="late advertisement"></iframe>';
            document.querySelector('main#container > article.view_content_wrap')?.append(ad);
            return { before };
        });
        await step(`${role}/late-ad-removal`, () => session.page.waitForFunction(
            () => !document.getElementById('fixture-late-owner-ad'), null, { timeout: 8000 }
        ));
        await waitSettled(session.page);
        const lateAd = await session.page.evaluate(({ before }) => ({
            removed: !document.getElementById('fixture-late-owner-ad'),
            removalDelta: (window.__dcufDiagnostics?.snapshot?.().counters?.['ui.articleAd.removed'] || 0) - before,
            subscriber: window.__dcufRuntimeCoordinator?._mutationSubscribers?.has('runtime-article-ad-cleanup') || false,
        }), adPath);

        if (role === 'control') {
            return {
                role,
                artifactSha256: sha(runtimeBytes),
                browser: browser.version(),
                startup,
                lateAd,
                consoleErrors: session.consoleErrors,
            };
        }

        const lifecycle = await session.page.evaluate(({ owners, styles }) => {
            const bus = window.__dcufRuntimeCoordinator;
            const ui = window.__dcufUIModule;
            const adapters = {
                article: window.__dcufArticleHostAdapter,
                comment: window.__dcufCommentHostAdapter,
                headerShell: window.__dcufHeaderShellHostAdapter,
                pageHead: window.__dcufGalleryPageHeadHostAdapter,
                gnb: window.__dcufHeaderGnbHostAdapter,
                recent: window.__dcufHeaderRecentVisitHostAdapter,
            };
            const sample = (name) => {
                const metrics = window.__dcufTestbedMetrics.snapshot();
                return {
                    name,
                    allSubscriberKeys: [...bus._mutationSubscribers.keys()],
                    ownerKeys: owners.filter((key) => bus._mutationSubscribers.has(key)),
                    immediateSubscriberKeys: [...bus._immediateMutationSubscribers.keys()],
                    styleCounts: Object.fromEntries(styles.map((id) => [id, document.querySelectorAll(`#${id}`).length])),
                    adapterResources: Object.fromEntries(Object.entries(adapters)
                        .map(([key, adapter]) => [key, adapter.snapshotResources()])),
                    timers: metrics.activeTimeouts,
                    frames: metrics.activeAnimationFrames,
                    intervals: metrics.activeIntervals,
                    activeObservers: metrics.mutationObserversCreated - metrics.mutationDisconnectCalls,
                    activeListeners: metrics.activeListenerKeys,
                    pendingMutations: metrics.dcuf?.pendingMutations || 0,
                    pendingMutationRaf: Boolean(metrics.dcuf?.pendingMutationRaf),
                    pendingMutationTimer: Boolean(metrics.dcuf?.pendingMutationTimer),
                    taskQueues: metrics.dcuf?.taskQueues || 0,
                    errors: metrics.errors,
                };
            };
            const settled = sample('settled');
            ui._articleSurfaceMutationUnsubscribe?.();
            ui._articleSurfaceMutationUnsubscribe = null;
            ui._commentSurfaceMutationUnsubscribe?.();
            ui._commentSurfaceMutationUnsubscribe = null;
            ui._commentSurfaceImmediateMutationUnsubscribe?.();
            ui._commentSurfaceImmediateMutationUnsubscribe = null;
            Object.values(adapters).forEach((adapter) => adapter.dispose());
            const disposed = sample('disposed');
            adapters.headerShell.connect(document, { runtimeCoordinator: bus });
            adapters.pageHead.connect(document, { runtimeCoordinator: bus });
            adapters.gnb.connect(document, { runtimeCoordinator: bus });
            adapters.recent.connect(document, { runtimeCoordinator: bus });
            ui.connectArticleSurface(document);
            ui.subscribeArticleSurfaceUpdates();
            ui.connectCommentSurface(document);
            ui.subscribeCommentSurfaceUpdates();
            const reconnected = sample('reconnected');
            const ordinarySubscriberRefs = new Map(owners.map((key) => [key, bus._mutationSubscribers.get(key)]));
            const immediateSubscriberRef = bus._immediateMutationSubscribers.get('ui-comment-surface-state');
            adapters.headerShell.connect(document, { runtimeCoordinator: bus });
            adapters.pageHead.connect(document, { runtimeCoordinator: bus });
            adapters.gnb.connect(document, { runtimeCoordinator: bus });
            adapters.recent.connect(document, { runtimeCoordinator: bus });
            ui.connectArticleSurface(document);
            ui.subscribeArticleSurfaceUpdates();
            ui.connectCommentSurface(document);
            ui.subscribeCommentSurfaceUpdates();
            const repeated = sample('repeated');
            const repeatedRetainedSubscriberIdentity = owners.every((key) =>
                bus._mutationSubscribers.get(key) === ordinarySubscriberRefs.get(key))
                && bus._immediateMutationSubscribers.get('ui-comment-surface-state') === immediateSubscriberRef;
            return { settled, disposed, reconnected, repeated, repeatedRetainedSubscriberIdentity };
        }, { owners: addedOwners, styles: styleIds });

        await session.page.evaluate(() => {
            const article = document.querySelector('main#container > article.view_content_wrap');
            window.__viewOwnerDetachedArticle = article;
            article.replaceWith(article.cloneNode(true));
        });
        await step('candidate/article-root-replacement', () => session.page.waitForFunction(() => {
            const current = document.querySelector('main#container > article.view_content_wrap');
            const detached = window.__viewOwnerDetachedArticle;
            return current?.getAttribute('data-dcuf-surface') === 'article-recommendation'
                && detached && !detached.isConnected
                && !detached.matches('[data-dcuf-surface], [data-dcuf-role], [data-dcuf-state]')
                && !detached.querySelector('[data-dcuf-surface], [data-dcuf-role], [data-dcuf-state]');
        }, null, { timeout: 8000 }));
        await session.page.evaluate(() => {
            const comments = document.getElementById('focus_cmt');
            window.__viewOwnerDetachedComments = comments;
            comments.replaceWith(comments.cloneNode(true));
        });
        await step('candidate/comment-root-replacement', () => session.page.waitForFunction(() => {
            const current = document.getElementById('focus_cmt');
            const detached = window.__viewOwnerDetachedComments;
            return current?.getAttribute('data-dcuf-surface') === 'comments-replies'
                && detached && !detached.isConnected
                && !detached.matches('[data-dcuf-surface], [data-dcuf-role], [data-dcuf-state], [data-dcuf-comment-role], [data-dcuf-comment-state]')
                && !detached.querySelector('[data-dcuf-surface], [data-dcuf-role], [data-dcuf-state], [data-dcuf-comment-role], [data-dcuf-comment-state]');
        }, null, { timeout: 8000 }));
        await waitSettled(session.page);
        const replacement = await session.page.evaluate(({ owners, styles }) => {
            const metrics = window.__dcufTestbedMetrics.snapshot();
            return {
                ownerKeys: owners.filter((key) => window.__dcufRuntimeCoordinator._mutationSubscribers.has(key)),
                immediateSubscriberKeys: [...window.__dcufRuntimeCoordinator._immediateMutationSubscribers.keys()],
                duplicateSubscribers: new Set(window.__dcufRuntimeCoordinator._mutationSubscribers.keys()).size
                    !== window.__dcufRuntimeCoordinator._mutationSubscribers.size,
                styleCounts: Object.fromEntries(styles.map((id) => [id, document.querySelectorAll(`#${id}`).length])),
                articleResources: window.__dcufArticleHostAdapter.snapshotResources(),
                commentResources: window.__dcufCommentHostAdapter.snapshotResources(),
                detachedArticleClean: !window.__viewOwnerDetachedArticle.querySelector('[data-dcuf-surface], [data-dcuf-role], [data-dcuf-state]'),
                detachedCommentsClean: !window.__viewOwnerDetachedComments.querySelector('[data-dcuf-surface], [data-dcuf-role], [data-dcuf-state], [data-dcuf-comment-role], [data-dcuf-comment-state]'),
                timers: metrics.activeTimeouts,
                frames: metrics.activeAnimationFrames,
                intervals: metrics.activeIntervals,
                activeObservers: metrics.mutationObserversCreated - metrics.mutationDisconnectCalls,
                activeListeners: metrics.activeListenerKeys,
                pendingMutations: metrics.dcuf?.pendingMutations || 0,
                taskQueues: metrics.dcuf?.taskQueues || 0,
                errors: metrics.errors,
            };
        }, { owners: addedOwners, styles: styleIds });

        const passesBefore = await session.page.evaluate(() => window.__dcufTestbedMetrics.snapshot().filterPasses.length);
        await session.page.evaluate(() => {
            window.__dcufFixture.addComments(1, {
                uid: 'safe-view-owner', id: 19100, text: 'Visible lifecycle control',
            });
            window.__dcufFixture.addComments(1, {
                uid: 'blocked-view-owner', id: 19101, text: 'Blocked lifecycle positive control',
            });
        });
        await step('candidate/positive-filter', () => session.page.waitForFunction(() => {
            const item = document.getElementById('comment_li_19101');
            const text = item?.querySelector('.cmt_txtbox .usertxt');
            if (!item || !text) return false;
            for (let node = text; node instanceof HTMLElement; node = node.parentElement) {
                const style = getComputedStyle(node);
                if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return true;
            }
            return false;
        }, null, { timeout: 8000 }));
        await waitSettled(session.page);
        const positiveFilter = await session.page.evaluate((passesBefore) => {
            const gm = window.__dcufTestbedGM.snapshot();
            const metrics = window.__dcufTestbedMetrics.snapshot();
            const text = document.querySelector('#comment_li_19101 .cmt_txtbox .usertxt');
            const safeText = document.querySelector('#comment_li_19100 .cmt_txtbox .usertxt');
            const visible = (element) => {
                if (!(element instanceof HTMLElement) || element.getClientRects().length === 0) return false;
                for (let node = element; node instanceof HTMLElement; node = node.parentElement) {
                    const style = getComputedStyle(node);
                    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
                }
                return true;
            };
            return {
                sourceVisible: visible(safeText),
                hidden: text instanceof HTMLElement && !visible(text),
                filterPassDelta: metrics.filterPasses.length - passesBefore,
                values: {
                    masterDisabled: gm.values.dcinside_master_disabled,
                    threshold: gm.values.dcinside_threshold,
                    personalEnabled: gm.values.dcinside_personal_block_enabled,
                    personalList: gm.values.dcinside_personal_block_list,
                },
                seededWrites: gm.writes.filter(({ key }) => [
                    'dcinside_master_disabled', 'dcinside_threshold', 'dcinside_personal_block_enabled',
                    'dcinside_personal_block_list', 'dcinside_blocked_uids', 'dcinside_blocked_guests',
                ].includes(key)),
                uidRequests: metrics.xhrRequests.filter(({ url }) => url.includes('/api/gallog_user_layer/gallog_content_reple/')),
                errors: metrics.errors,
            };
        }, passesBefore);
        return {
            role,
            artifactSha256: sha(runtimeBytes),
            browser: browser.version(),
            startup,
            lateAd,
            lifecycle,
            replacement,
            positiveFilter,
            consoleErrors: session.consoleErrors,
        };
    } finally {
        await session.close();
    }
}

export async function probeViewResourceOwnerLifecycle() {
    const server = await startServer();
    const browser = await launchBrowser();
    try {
        const control = await observeSide(browser, server, 'control');
        const candidate = await observeSide(browser, server, 'candidate');
        return {
            schemaVersion: 1,
            kind: 'view-resource-owner-lifecycle-probe',
            scope: 'Exact mobile published-stable/current-candidate view-route timer ownership and six added subscriber owners only.',
            exactArtifacts: expectedHashes,
            probeScriptSha256: sha(await readFile(scriptPath)),
            evidenceBinding: await createEvidenceBinding(root),
            addedOwners,
            styleIds,
            browser: browser.version(),
            sides: { control, candidate },
        };
    } finally {
        await browser.close();
        await server.close();
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
    try {
        const result = await probeViewResourceOwnerLifecycle();
        await mkdir(path.dirname(outputPath), { recursive: true });
        await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
        console.log(`View resource owner lifecycle probe: ${outputPath}`);
    } catch (error) {
        console.error(`View resource owner lifecycle probe BLOCKED: ${error.message}`);
        process.exitCode = 1;
    }
}
