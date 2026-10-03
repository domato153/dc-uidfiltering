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
    { id: 'major-narrow', path: '/board/lists?id=test', viewport: { width: 390, height: 844 }, touch: true },
    { id: 'major-wide', path: '/board/lists?id=test', viewport: { width: 1280, height: 900 }, touch: false },
    { id: 'minor-wide', path: '/mgallery/board/lists?id=test', viewport: { width: 1280, height: 900 }, touch: false },
    { id: 'embedded-view-wide', path: '/board/view?id=test&no=1001', viewport: { width: 1280, height: 900 }, touch: false },
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
                    [storageKeys.palette]: 'blue',
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
                    const baseline = window.__fixtureListControlBaseline;
                    const byKey = Object.fromEntries(Object.entries(baseline?.topology || {}).map(([key, entry]) => [key, entry?.element || null]));
                    const eventTrace = [];
                    const bind = (key, element, types) => types.forEach((type) => element?.addEventListener?.(type, (event) => {
                        eventTrace.push({ key, type: event.type });
                        if (event.type === 'submit') event.preventDefault();
                    }));
                    bind('searchForm', byKey.searchForm, ['submit']);
                    bind('searchField', byKey.searchField, ['input', 'keydown']);
                    bind('searchSelect', byKey.searchSelect, ['change']);
                    bind('searchButton', byKey.searchButton, ['click']);
                    bind('actionBar', byKey.actionBar, ['click']);
                    document.addEventListener('click', (event) => {
                        const tracked = [byKey.searchButton, byKey.actionBar].filter(Boolean);
                        if (tracked.some((root) => root === event.target || root.contains?.(event.target))) event.preventDefault();
                    }, true);
                    window.__dcufListDifferentialProbe = {
                        baseline,
                        byKey,
                        eventTrace,
                        originalRows: Array.from(byKey.listWrap?.querySelectorAll('table.gall_list tbody tr') || []),
                    };
                });

                const capture = async (step) => {
                    const value = await session.page.evaluate(({ caseId, stepName }) => {
                        const probe = window.__dcufListDifferentialProbe;
                        const baseline = probe.baseline;
                        const normalizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
                        const nodeShape = (node) => node instanceof HTMLElement ? {
                            tag: node.tagName,
                            id: node.id || '',
                            name: node.getAttribute('name') || '',
                            type: node.getAttribute('type') || '',
                            href: node instanceof HTMLAnchorElement ? `${node.pathname}${node.search}${node.hash}` : '',
                            onclick: node.getAttribute('onclick') || '',
                            text: normalizeText(node.textContent),
                        } : null;
                        const topology = Object.fromEntries(Object.entries(baseline?.topology || {}).map(([key, entry]) => [
                            key,
                            entry === null || Boolean(entry.element?.isConnected
                                && entry.element?.parentNode === entry.parent
                                && entry.element?.nextSibling === entry.nextSibling),
                        ]));
                        const form = probe.byKey.searchForm;
                        const formSignature = form instanceof HTMLFormElement ? Array.from(form.elements).map((field) => ({
                            tag: field.tagName,
                            type: field.getAttribute('type'),
                            name: field.getAttribute('name'),
                            value: field.value,
                        })) : [];
                        const fieldSemantics = formSignature.map(({ tag, type, name, value }) => ({ tag, type, name, value }))
                            .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
                        const formStructure = formSignature.map(({ tag, type, name }) => ({ tag, type, name }))
                            .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
                        const baselineFormStructure = (baseline?.formSignature || []).map(({ tag, type, name }) => ({ tag, type, name }))
                            .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
                        const originalRows = Array.from(probe.byKey.listWrap?.querySelectorAll('table.gall_list tbody tr') || []);
                        const rowSemantics = originalRows.map((row) => ({
                            text: normalizeText(row.textContent),
                            hrefs: Array.from(row.querySelectorAll('a[href]'), (link) => `${link.pathname}${link.search}${link.hash}`),
                            uid: row.querySelector('[data-uid]')?.getAttribute('data-uid') || '',
                            inlineDisplay: row.style.display || '',
                        }));
                        const renderedRoot = document.querySelector('[data-dcuf-surface="list-container"], .custom-mobile-list');
                        const renderedRows = Array.from(renderedRoot?.querySelectorAll('[data-dcuf-surface="list-item"], .custom-mobile-post') || []).map((row) => ({
                            text: normalizeText(row.textContent),
                            hrefs: Array.from(row.querySelectorAll('a[href]'), (link) => `${link.pathname}${link.search}${link.hash}`),
                            inlineDisplay: row.style.display || '',
                        }));
                        const gm = window.__dcufTestbedGM.snapshot();
                        const metrics = window.__dcufTestbedMetrics.snapshot();
                        const rect = (element) => {
                            if (!(element instanceof HTMLElement)) return null;
                            const box = element.getBoundingClientRect();
                            const style = getComputedStyle(element);
                            return {
                                left: box.left, top: box.top, right: box.right, bottom: box.bottom,
                                width: box.width, height: box.height, display: style.display,
                                visibility: style.visibility, position: style.position,
                                radius: style.borderRadius, background: style.backgroundColor, shadow: style.boxShadow,
                            };
                        };
                        const currentFormCount = document.querySelectorAll('form[name="frmSearch"]').length;
                        const firstRendered = renderedRoot?.querySelector('[data-dcuf-surface="list-item"], .custom-mobile-post');
                        const active = document.activeElement;
                        const semantic = {
                            caseId,
                            step: stepName,
                            behavior: {
                                location: `${location.pathname}${location.search}`,
                                form: {
                                    fields: fieldSemantics,
                                    action: form?.getAttribute('action') || '',
                                    method: (form?.getAttribute('method') || 'get').toLowerCase(),
                                },
                                rows: rowSemantics,
                                events: probe.eventTrace,
                                fixtureCounters: {
                                    searchClicks: window.__fixtureSearchClicks || 0,
                                    writeClicks: window.__fixtureWriteClicks || 0,
                                },
                                focus: active instanceof HTMLElement ? {
                                    tag: active.tagName,
                                    id: active.id || '',
                                    name: active.getAttribute('name') || '',
                                    type: active.getAttribute('type') || '',
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
                                fixtureTopologyPreserved: Object.values(topology).every(Boolean),
                                fixtureTopology: topology,
                                formStructurePreserved: JSON.stringify(formStructure) === JSON.stringify(baselineFormStructure),
                                oneNativeSearchForm: currentFormCount === (baseline?.topology?.searchForm ? 1 : 0),
                                listRootPresent: renderedRoot instanceof HTMLElement,
                                renderedRowsMatchHostCount: renderedRows.length === rowSemantics.length,
                                renderedRowsMatchHostLinks: renderedRows.length === rowSemantics.length
                                    && renderedRows.every((row, index) => row.hrefs[0] === rowSemantics[index]?.hrefs[0]),
                                horizontalOverflowContained: document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1,
                            },
                        };
                        return {
                            semantic,
                            raw: {
                                topology,
                                nativeFormHtml: form?.outerHTML || '',
                                nativeFormSignature: formSignature,
                                nativeControls: {
                                    searchButton: nodeShape(probe.byKey.searchButton),
                                    searchSelect: nodeShape(probe.byKey.searchSelect),
                                    actionBar: nodeShape(probe.byKey.actionBar),
                                    pagination: nodeShape(probe.byKey.pagination),
                                },
                                renderedRows,
                                renderedHtml: renderedRoot?.outerHTML || '',
                                geometry: {
                                    listWrap: rect(probe.byKey.listWrap),
                                    nativeTable: rect(probe.byKey.listWrap?.querySelector('table.gall_list')),
                                    renderedRoot: rect(renderedRoot),
                                    firstRendered: rect(firstRendered),
                                    toolbar: rect(probe.byKey.toolbar),
                                    actionBar: rect(probe.byKey.actionBar),
                                    pagination: rect(probe.byKey.pagination),
                                    searchForm: rect(form),
                                },
                                styles: Array.from(document.querySelectorAll('style[id]'), (style) => style.id),
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
                    const warnings = session.consoleMessages.filter((message) => message.type === 'warning');
                    value.raw.warnings = warnings;
                    observations.push(value);
                };

                await capture('initial');
                await session.page.evaluate(() => {
                    const probe = window.__dcufListDifferentialProbe;
                    const field = probe.byKey.searchField;
                    if (field instanceof HTMLInputElement) {
                        field.focus();
                        field.value = 'dcuf differential';
                        field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'dcuf differential' }));
                    }
                });
                await capture('native-interactions');
                await session.page.evaluate(() => window.__dcufFixture?.replaceList?.(53));
                await waitForSettled(session.page, 300);
                await capture('dynamic-list-replacement');
                await session.page.waitForFunction(() => {
                    const metrics = window.__dcufTestbedMetrics.snapshot();
                    return metrics.activeTimeouts === 0 && metrics.activeAnimationFrames === 0;
                }, null, { timeout: 5000 });
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
    if (args.includes('--require-runtime-under-test')
        && candidate !== path.join(root, 'testbed/artifacts/runtime-under-test.user.js')) {
        throw new Error('Source-work candidate must be testbed/artifacts/runtime-under-test.user.js');
    }
    const baseline = JSON.parse(await readFile(path.join(root, 'verification', 'baselines.json'), 'utf8'));
    const controlHash = hash(await readFile(control));
    const candidateHash = hash(await readFile(candidate));
    if (![baseline.mobile.beta.sha256, baseline.mobile.stable.sha256].includes(controlHash)) {
        throw new Error('Control must match an authoritative mobile baseline');
    }
    if (controlHash === candidateHash) throw new Error('Control and candidate must have distinct digests');
    console.log(`Control runtime: ${control}; SHA-256 ${controlHash}`);
    console.log(`Candidate runtime: ${candidate}; SHA-256 ${candidateHash}`);
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
        if (controlEntry?.semantic?.step === 'settled-resources' && candidateEntry) {
            const controlResources = controlEntry.raw.resources || {};
            const candidateResources = candidateEntry.raw.resources || {};
            const monotoneKeys = ['activeTimeouts', 'activeIntervals', 'activeAnimationFrames', 'activeObservers', 'activeListeners'];
            const regressions = monotoneKeys.filter((key) => !Number.isFinite(controlResources[key])
                || !Number.isFinite(candidateResources[key])
                || candidateResources[key] > controlResources[key]);
            if (regressions.length) differences.push({ index, kind: 'resource-regression', regressions, control: controlResources, candidate: candidateResources });
        }
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
        kind: 'observed-list-semantic-differential',
        target: 'mobile',
        controlSource: baseline.mobile.behaviorSourceCommit,
        controlSha256: controlHash,
        candidateSha256: candidateHash,
        observerSha256: digestEvidenceBytes('testbed/run-list-differential.mjs', observerBytes).toUpperCase(),
        normalizerSha256: digestEvidenceBytes('testbed/run-list-differential.mjs', observerBytes).toUpperCase(),
        evidenceBinding: await createEvidenceBinding(root),
        scope: 'Major narrow/wide, minor wide, and embedded-view list host identity/topology, native form/control semantics, row/rendered meaning, input trace, GM/network/error traces, dynamic replacement, settled ownership, and candidate containment invariants. Exact presentation HTML, geometry, styles, warnings, and resource observations are retained as raw evidence; declared list visual geometry and DCUF-owned markup are excluded from behavior equality.',
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
    console.log(`Observed list semantic comparison: ${equivalent ? 'PASS' : 'FAIL'}; ${differences.length} semantic failures, ${improvements.length} invariant improvements, ${rawDifferences.length} raw differing snapshots`);
    if (!equivalent) process.exitCode = 1;
}
