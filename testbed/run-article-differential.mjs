import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { startServer } from './server/server.mjs';
import { createTestPage, launchBrowser, storageKeys, waitForSettled } from './harness/runner-utils.mjs';
import { createEvidenceBinding, digestEvidenceBytes } from '../tools/evidence-binding.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), '..');
const args = process.argv.slice(2);
const valueAfter = (name) => args[args.indexOf(name) + 1];
const required = (name) => {
    const value = valueAfter(name);
    if (!args.includes(name) || !value || value.startsWith('--')) throw new Error(`Missing ${name}`);
    return value;
};
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const output = path.resolve(root, required('--output'));
await mkdir(path.dirname(output), { recursive: true });

const cases = Object.freeze([
    { id: 'major-narrow', path: '/board/view?id=test&no=1001', viewport: { width: 390, height: 844 }, touch: true, pum: true },
    { id: 'minor-wide', path: '/mgallery/board/view?id=test&no=1001', viewport: { width: 1280, height: 900 }, touch: false, pum: true },
    { id: 'mini-short', path: '/mini/board/view?id=test&no=1001', viewport: { width: 390, height: 520 }, touch: true, pum: true },
    { id: 'host-captcha', path: '/board/view?id=test&host-compat=recommend&captcha=1', viewport: { width: 390, height: 844 }, touch: true, replace: true },
]);

if (args.includes('--side')) {
    const runtimePath = path.resolve(root, required('--side'));
    const bytes = await readFile(runtimePath);
    const actualName = bytes.toString('utf8').match(/^\/\/\s*@name\s+(.+)$/m)?.[1]?.trim();
    if (actualName !== 'DC_UserFilter_Mobile') throw new Error(`Mobile artifact required; received ${actualName || '<missing>'}`);
    process.env.DCUF_TESTBED_USERSCRIPT = runtimePath;
    process.env.DCUF_TESTBED_TARGET = 'mobile';
    const server = await startServer();
    const browser = await launchBrowser();
    const observations = [];
    try {
        for (const testCase of cases) {
            const session = await createTestPage(browser, server.baseUrl, {
                storage: {
                    [storageKeys.threshold]: 0,
                    [storageKeys.ratioEnabled]: false,
                    [storageKeys.personalEnabled]: true,
                    [storageKeys.personalList]: { uids: [], nicknames: [], ips: [] },
                    [storageKeys.palette]: 'orange',
                },
                viewport: testCase.viewport,
                hasTouch: testCase.touch,
                isMobile: testCase.touch,
            });
            try {
                await session.goto(testCase.path);
                await session.page.waitForFunction(() => (
                    !window.__dcufRuntimeCoordinator?._mutationSubscribers?.has?.('ui-post-reveal-recovery')
                ), null, { timeout: 6000 });
                await session.page.evaluate(() => {
                    const fixture = window.__fixtureArticleBaseline;
                    const simulator = window.__dcufHostSimulator;
                    const fixtureTopology = fixture?.topology || null;
                    const root = simulator?.originalRoot || fixtureTopology?.articleRoot?.element || document.querySelector('.view_content_wrap');
                    const recommendBox = simulator?.originalRecommendBox || fixtureTopology?.recommendBox?.element || root?.querySelector('.btn_recommend_box');
                    const header = fixtureTopology?.header?.element || root?.querySelector('.gallview_head');
                    const body = fixtureTopology?.body?.element || root?.querySelector('.gallview_contents, .writing_view_box');
                    const content = fixtureTopology?.content?.element || root?.querySelector('.write_div');
                    const buttons = simulator?.originalButtons || (fixtureTopology?.buttons || []).map((entry) => entry.element);
                    const buttonTopology = simulator?.originalButtonTopology || (fixtureTopology?.buttons || []).map((entry) => ({
                        button: entry.element,
                        parent: entry.parent,
                        nextSibling: entry.nextSibling,
                    }));
                    const actionBar = document.querySelector('#container > .view_bottom_btnbox')
                        || root?.querySelector(':scope > .view_bottom_btnbox')
                        || null;
                    const eventTrace = [];
                    buttons.forEach((button, index) => button?.addEventListener('click', () => {
                        eventTrace.push({ kind: 'click', index, text: button.textContent.trim() });
                    }));
                    recommendBox?.querySelectorAll('input, select, textarea').forEach((field, index) => {
                        field.addEventListener('input', () => eventTrace.push({ kind: 'input', index, name: field.name || '' }));
                    });
                    window.__dcufArticleDifferentialProbe = {
                        fixture,
                        simulator,
                        root,
                        recommendBox,
                        header,
                        body,
                        content,
                        buttons,
                        buttonTopology,
                        actionBar,
                        actionBarParent: actionBar?.parentNode || null,
                        actionBarNextSibling: actionBar?.nextSibling || null,
                        eventTrace,
                        detachedRecommendBox: null,
                    };
                });

                const capture = async (step) => {
                    const entry = await session.page.evaluate(({ caseId, stepName }) => {
                        const probe = window.__dcufArticleDifferentialProbe;
                        const normalizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
                        const currentRoot = document.querySelector('[data-host-delegation-root]') || document.querySelector('article.view_content_wrap') || document.querySelector('.view_content_wrap');
                        const currentBox = currentRoot?.querySelector('.btn_recommend_box') || null;
                        const currentButtons = Array.from(currentBox?.querySelectorAll('button') || []);
                        const popup = currentBox?.querySelector('#write_pum_layer') || null;
                        const currentActionBar = document.querySelector('#container > .view_bottom_btnbox')
                            || currentRoot?.querySelector(':scope > .view_bottom_btnbox')
                            || null;
                        const gm = window.__dcufTestbedGM.snapshot();
                        const metrics = window.__dcufTestbedMetrics.snapshot();
                        const rect = (element) => {
                            if (!(element instanceof HTMLElement)) return null;
                            const box = element.getBoundingClientRect();
                            const style = getComputedStyle(element);
                            return {
                                left: box.left,
                                top: box.top,
                                right: box.right,
                                bottom: box.bottom,
                                width: box.width,
                                height: box.height,
                                display: style.display,
                                visibility: style.visibility,
                                position: style.position,
                                overflow: style.overflow,
                                background: style.backgroundColor,
                                backgroundImage: style.backgroundImage,
                                borderRadius: style.borderRadius,
                                boxShadow: style.boxShadow,
                            };
                        };
                        const fields = Array.from(currentBox?.querySelectorAll('input, select, textarea') || []).map((field) => ({
                            tag: field.tagName,
                            type: field.getAttribute('type'),
                            name: field.getAttribute('name'),
                            value: field.value,
                        }));
                        const buttons = currentButtons.map((button) => ({
                            type: button.getAttribute('type'),
                            name: button.getAttribute('name'),
                            value: button.getAttribute('value'),
                            text: normalizeText(button.textContent),
                            hostAction: button.getAttribute('data-host-action') || '',
                            onclick: button.getAttribute('onclick') || '',
                        }));
                        const active = document.activeElement;
                        const adapter = window.__dcufArticleHostAdapter || null;
                        const adapterResources = adapter?.snapshotResources?.() || null;
                        const snapshot = adapter?.snapshotSurface?.(currentRoot) || null;
                        const originalTopology = [
                            ['root', probe.root, probe.root?.parentNode, probe.fixture?.topology?.articleRoot?.parent],
                            ['header', probe.header, probe.header?.parentNode, probe.fixture?.topology?.header?.parent],
                            ['body', probe.body, probe.body?.parentNode, probe.fixture?.topology?.body?.parent],
                            ['content', probe.content, probe.content?.parentNode, probe.fixture?.topology?.content?.parent],
                        ];
                        const topologyPreserved = originalTopology.every(([, element, actualParent, fixtureParent]) => (
                            !(element instanceof HTMLElement) || (element.isConnected && (!fixtureParent || actualParent === fixtureParent))
                        ));
                        const buttonTopologyPreserved = probe.detachedRecommendBox
                            ? !probe.detachedRecommendBox.isConnected && currentBox !== probe.recommendBox && currentBox?.parentNode === currentRoot
                            : probe.buttonTopology.every((item) => item.button?.isConnected !== false
                                && (!item.parent || item.button?.parentNode === item.parent)
                                && (!('nextSibling' in item) || item.button?.nextSibling === item.nextSibling));
                        const rootRect = currentRoot?.getBoundingClientRect();
                        const boxRect = currentBox?.getBoundingClientRect();
                        const boxContained = !rootRect || !boxRect
                            || (boxRect.left >= rootRect.left - 1 && boxRect.right <= rootRect.right + 1);
                        const semantic = {
                            caseId,
                            step: stepName,
                            behavior: {
                                location: `${location.pathname}${location.search}`,
                                article: {
                                    title: normalizeText(currentRoot?.querySelector('.title_subject, h2')?.textContent),
                                    content: normalizeText(currentRoot?.querySelector('.write_div')?.textContent),
                                    directOrder: Array.from(currentRoot?.children || []).map((child) => ({
                                        tag: child.tagName,
                                        className: child.className,
                                    })),
                                },
                                recommendation: {
                                    text: normalizeText(currentBox?.textContent),
                                    buttons,
                                    fields,
                                },
                                articleActions: Array.from(currentActionBar?.querySelectorAll('button, a') || []).map((action) => ({
                                    tag: action.tagName,
                                    type: action.getAttribute('type'),
                                    href: action.getAttribute('href'),
                                    text: normalizeText(action.textContent),
                                    onclick: action.getAttribute('onclick') || '',
                                })),
                                events: probe.eventTrace,
                                delegatedClicks: { ...(probe.simulator?.delegatedClicks || {}) },
                                popup: popup ? {
                                    parentIsActionBox: popup.parentElement?.classList.contains('recom_bottom_box') || false,
                                    display: popup.style.display,
                                    bottom: popup.style.bottom,
                                    left: popup.style.left,
                                    marginLeft: popup.style.marginLeft,
                                    hostOpenCount: window.__fixturePumOpenCount || 0,
                                } : null,
                                focus: active instanceof HTMLElement && active !== document.body && active !== document.documentElement ? {
                                    tag: active.tagName,
                                    type: active.getAttribute('type') || '',
                                    name: active.getAttribute('name') || '',
                                    text: normalizeText(active.textContent),
                                    hostAction: active.getAttribute('data-host-action') || '',
                                } : null,
                                storage: gm.values,
                                writes: gm.writes.map(({ key, value }) => ({ key, value })),
                                requests: metrics.xhrRequests.map(({ method, url, body, status }) => ({
                                    method,
                                    path: new URL(url, location.href).pathname,
                                    body,
                                    status,
                                })),
                                errors: metrics.errors,
                            },
                            invariants: {
                                adapterPresent: Boolean(adapter),
                                topologyPreserved,
                                currentRecommendationOwnedByHost: buttonTopologyPreserved,
                                articleActionBarTopologyPreserved: !(probe.actionBar instanceof HTMLElement)
                                    || probe.actionBar === currentActionBar
                                        && currentActionBar.isConnected
                                        && currentActionBar.parentNode === probe.actionBarParent
                                        && currentActionBar.nextSibling === probe.actionBarNextSibling,
                                detachedMarkersRestored: !probe.detachedRecommendBox
                                    || !probe.detachedRecommendBox.hasAttribute('data-dcuf-surface')
                                        && !probe.detachedRecommendBox.hasAttribute('data-dcuf-role')
                                        && !probe.detachedRecommendBox.hasAttribute('data-dcuf-state'),
                                semanticArticleMarker: currentRoot?.getAttribute('data-dcuf-role') === 'article',
                                semanticRecommendationMarker: currentBox?.getAttribute('data-dcuf-role') === 'recommendation',
                                semanticArticleActionMarkers: !(currentActionBar instanceof HTMLElement)
                                    || currentActionBar.getAttribute('data-dcuf-role') === 'article-native-actions'
                                        && Array.from(currentActionBar.querySelectorAll('button, a')).every((action) => action.getAttribute('data-dcuf-role') === 'native-article-action'),
                                onePresentationStyleOwner: document.querySelectorAll('#dcuf-article-presenter').length === 1,
                                frozenSerializableSnapshot: Boolean(snapshot && Object.isFrozen(snapshot) && JSON.parse(JSON.stringify(snapshot))),
                                boxContained,
                                horizontalOverflowContained: document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1,
                                boundedAdapterResources: Boolean(adapterResources
                                    && adapterResources.activeRoots === 1
                                    && adapterResources.trackedElements > 0
                                    && adapterResources.trackedElements < 40
                                    && adapterResources.observers === 0
                                    && adapterResources.presentationStyleOwners === 1
                                    && adapterResources.listeners <= 3
                                    && adapterResources.timers <= 2
                                    && adapterResources.animationFrames <= 1),
                                settledAdapterResources: stepName !== 'settled-resources'
                                    || adapterResources?.timers === 0 && adapterResources?.animationFrames === 0,
                            },
                        };
                        return {
                            semantic,
                            raw: {
                                articleHtml: currentRoot?.outerHTML || '',
                                recommendationHtml: currentBox?.outerHTML || '',
                                geometry: {
                                    root: rect(currentRoot),
                                    header: rect(currentRoot?.querySelector('.gallview_head')),
                                    body: rect(currentRoot?.querySelector('.gallview_contents, .writing_view_box')),
                                    recommendation: rect(currentBox),
                                    captcha: rect(currentBox?.querySelector('.recommend_kapcode, [data-host-captcha]')),
                                    popup: rect(popup),
                                    articleActions: rect(currentActionBar),
                                },
                                styles: Array.from(document.querySelectorAll('style[id]'), (style) => style.id),
                                adapterResources,
                                resources: {
                                    activeTimeouts: metrics.activeTimeouts,
                                    activeIntervals: metrics.activeIntervals,
                                    activeAnimationFrames: metrics.activeAnimationFrames,
                                    activeObservers: metrics.mutationObserversCreated - metrics.mutationDisconnectCalls,
                                    activeListeners: metrics.activeListenerKeys,
                                    subscriberKeys: Array.from(window.__dcufRuntimeCoordinator?._mutationSubscribers?.keys?.() || []),
                                },
                            },
                        };
                    }, { caseId: testCase.id, stepName: step });
                    entry.raw.warnings = session.consoleMessages.filter((message) => message.type === 'warning');
                    observations.push(entry);
                };

                await capture('initial');
                await session.page.evaluate(() => {
                    const box = document.querySelector('.btn_recommend_box');
                    const input = box?.querySelector('input');
                    if (input instanceof HTMLInputElement) {
                        input.focus();
                        input.value = '1234';
                        input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '1234' }));
                    }
                    for (const selector of ['.btn_recom_up', '.btn_recom_down']) {
                        const button = box?.querySelector(selector);
                        if (button instanceof HTMLButtonElement) {
                            button.focus();
                            button.click();
                        }
                    }
                });
                await capture('native-interactions');

                if (testCase.pum) {
                    await session.page.evaluate(() => document.querySelector('.recom_bottom_box > .btn_cloned')?.click());
                    await session.page.waitForSelector('#write_pum_layer');
                    await capture('pum-open');
                    await session.page.evaluate(() => document.querySelector('#write_pum_layer .poply_whiteclose')?.click());
                    await capture('pum-closed');
                    await session.page.evaluate(() => document.querySelector('.recom_bottom_box > .btn_cloned')?.click());
                    await session.page.waitForSelector('#write_pum_layer');
                    await capture('pum-reopened');
                }

                if (testCase.replace) {
                    await session.page.evaluate(() => {
                        const probe = window.__dcufArticleDifferentialProbe;
                        const current = document.querySelector('.btn_recommend_box');
                        const replacement = current.cloneNode(true);
                        replacement.querySelectorAll('[data-dcuf-surface], [data-dcuf-role], [data-dcuf-state]').forEach((element) => {
                            element.removeAttribute('data-dcuf-surface');
                            element.removeAttribute('data-dcuf-role');
                            element.removeAttribute('data-dcuf-state');
                        });
                        replacement.removeAttribute('data-dcuf-surface');
                        replacement.removeAttribute('data-dcuf-role');
                        replacement.removeAttribute('data-dcuf-state');
                        probe.detachedRecommendBox = current;
                        current.replaceWith(replacement);
                    });
                    await waitForSettled(session.page, 250);
                    await session.page.evaluate(() => document.querySelector('[data-host-action="recommend-up"]')?.click());
                    await capture('host-replacement');
                }

                await waitForSettled(session.page, 350);
                await session.page.waitForFunction(() => {
                    const adapter = window.__dcufArticleHostAdapter?.snapshotResources?.();
                    return !adapter || adapter.timers === 0 && adapter.animationFrames === 0;
                }, null, { timeout: 6000 });
                await capture('settled-resources');
                if (session.consoleErrors.length) throw new Error(session.consoleErrors.join('\n'));
            } finally {
                await session.close();
            }
        }
        await writeFile(output, JSON.stringify({
            schemaVersion: 1,
            artifactSha256: hash(bytes),
            browser: browser.version(),
            observations,
        }, null, 2) + '\n');
    } finally {
        await browser.close();
        await server.close();
    }
} else {
    const control = path.resolve(root, required('--control'));
    const candidate = path.resolve(root, required('--candidate'));
    const baseline = JSON.parse(await readFile(path.join(root, 'verification', 'baselines.json'), 'utf8'));
    const controlHash = hash(await readFile(control));
    const candidateHash = hash(await readFile(candidate));
    if (![baseline.mobile.beta.sha256, baseline.mobile.stable.sha256].includes(controlHash)) {
        throw new Error('Control must match an authoritative mobile baseline');
    }
    if (controlHash === candidateHash) throw new Error('Control and candidate must have distinct digests');
    const sides = {};
    for (const [side, runtime] of Object.entries({ control, candidate })) {
        const sidePath = path.join(root, 'testbed', 'artifacts', `${path.basename(output)}.${side}.json`);
        const result = spawnSync(process.execPath, [scriptPath, '--side', runtime, '--output', sidePath], {
            cwd: root,
            stdio: 'inherit',
        });
        if (result.status !== 0) throw new Error(`${side} observation failed`);
        sides[side] = JSON.parse(await readFile(sidePath, 'utf8'));
    }

    const invariantFailures = (value, prefix = '') => Object.entries(value || {}).flatMap(([key, entry]) => {
        const pathKey = prefix ? `${prefix}.${key}` : key;
        if (typeof entry === 'boolean') return entry ? [] : [pathKey];
        if (entry && typeof entry === 'object' && !Array.isArray(entry)) return invariantFailures(entry, pathKey);
        return [];
    });
    const differences = [];
    const improvements = [];
    sides.control.observations.forEach((controlEntry, index) => {
        const candidateEntry = sides.candidate.observations[index];
        if (!candidateEntry || !isDeepStrictEqual(controlEntry.semantic.behavior, candidateEntry.semantic.behavior)) {
            differences.push({ index, kind: 'behavior', control: controlEntry?.semantic?.behavior, candidate: candidateEntry?.semantic?.behavior });
        }
        const failures = invariantFailures(candidateEntry?.semantic?.invariants);
        if (failures.length) differences.push({ index, kind: 'candidate-invariant', failures });
        const controlFailures = new Set(invariantFailures(controlEntry?.semantic?.invariants));
        const candidateFailures = new Set(failures);
        const fixed = [...controlFailures].filter((failure) => !candidateFailures.has(failure));
        if (fixed.length) improvements.push({ index, fixed });
    });
    if (sides.control.observations.length !== sides.candidate.observations.length) {
        differences.push({ kind: 'observation-count', control: sides.control.observations.length, candidate: sides.candidate.observations.length });
    }
    const rawDifferences = sides.control.observations.flatMap((entry, index) => (
        isDeepStrictEqual(entry, sides.candidate.observations[index]) ? [] : [{ index, control: entry, candidate: sides.candidate.observations[index] }]
    ));
    const observerBytes = await readFile(scriptPath);
    const equivalent = sides.control.browser === sides.candidate.browser && differences.length === 0;
    await writeFile(output, JSON.stringify({
        schemaVersion: 1,
        kind: 'observed-article-semantic-differential',
        target: 'mobile',
        controlSource: baseline.mobile.behaviorSourceCommit,
        controlSha256: controlHash,
        candidateSha256: candidateHash,
        observerSha256: digestEvidenceBytes('testbed/run-article-differential.mjs', observerBytes).toUpperCase(),
        normalizerSha256: digestEvidenceBytes('testbed/run-article-differential.mjs', observerBytes).toUpperCase(),
        evidenceBinding: await createEvidenceBinding(root),
        scope: 'Major narrow, minor wide, mini short, and CAPTCHA-shaped article/recommendation behavior; native button and field meaning, focus, host topology, dynamic replacement, Pum close/reopen lifecycle, storage/network/error traces, containment, and settled adapter ownership. Exact markup, geometry, styles, warnings, and resources remain raw evidence and are not normalized into behavioral equality.',
        observationEvidence: Object.fromEntries(Object.entries(sides).map(([side, value]) => [side, {
            artifactSha256: value.artifactSha256,
            browser: value.browser,
            observationCount: value.observations.length,
            observationsSha256: hash(Buffer.from(JSON.stringify(value.observations))),
        }])),
        sides,
        improvements,
        rawDifferences,
        differences,
        equivalent,
    }, null, 2) + '\n');
    console.log(`Observed article semantic comparison: ${equivalent ? 'PASS' : 'FAIL'}; ${differences.length} semantic failures, ${improvements.length} invariant improvements, ${rawDifferences.length} raw differing snapshots`);
    if (!equivalent) process.exitCode = 1;
}
