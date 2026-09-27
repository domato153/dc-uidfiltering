import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { startServer } from './server/server.mjs';
import { createTestPage, launchBrowser, storageKeys } from './harness/runner-utils.mjs';
import { createEvidenceBinding, digestEvidenceBytes } from '../tools/evidence-binding.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), '..');
const args = process.argv.slice(2);
const arg = (name) => args[args.indexOf(name) + 1];
const required = (name) => {
    if (!args.includes(name) || !arg(name) || arg(name).startsWith('--')) throw new Error('Missing ' + name);
    return arg(name);
};
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const output = path.resolve(root, required('--output'));
const target = String(args.includes('--target') ? required('--target') : 'mobile').toLowerCase();
const compact = args.includes('--compact');
if (!['mobile', 'pc'].includes(target)) throw new Error('Unsupported target: ' + target);
await mkdir(path.dirname(output), { recursive: true });

const surfaceManifest = JSON.parse(await readFile(path.join(root, 'architecture', 'ui-surfaces.json'), 'utf8'));
const intendedDeltas = JSON.parse(await readFile(path.join(root, 'verification', 'intended-deltas.json'), 'utf8'));
const paletteSurface = surfaceManifest.surfaces.find((surface) => surface.id === 'tokens-settings-palette');
const paletteDelta = intendedDeltas.contracts.find((contract) => contract.id === paletteSurface?.intendedDelta);
const declaredPaletteGeometryAllowed = paletteDelta?.status === 'active'
    && paletteDelta.surfaces.includes('tokens-settings-palette')
    && paletteDelta.allowed.some((entry) => entry.kind === 'geometry' && entry.surface === 'tokens-settings-palette');

if (args.includes('--side')) {
    const runtimePath = path.resolve(root, required('--side'));
    const bytes = await readFile(runtimePath);
    const expectedName = target === 'mobile' ? 'DC_UserFilter_Mobile' : 'DCInside PC User Filter';
    const actualName = bytes.toString('utf8').match(/^\/\/\s*@name\s+(.+)$/m)?.[1]?.trim();
    if (actualName !== expectedName) throw new Error(`${target} artifact required; received ${actualName || '<missing>'}`);
    process.env.DCUF_TESTBED_USERSCRIPT = runtimePath;
    process.env.DCUF_TESTBED_TARGET = target;
    const server = await startServer();
    const browser = await launchBrowser();
    const observations = [];
    try {
        for (const failureMode of ['none', 'write', 'read']) {
            const session = await createTestPage(browser, server.baseUrl, {
                storage: { [storageKeys.threshold]: 0, [storageKeys.palette]: 'blue', [storageKeys.personalEnabled]: true,
                    [storageKeys.personalList]: { uids: [], nicknames: [], ips: [] } },
                gmBehavior: failureMode === 'write'
                    ? { rejectWriteOnceKeys: [storageKeys.palette] }
                    : failureMode === 'read' ? { rejectOnceKeys: [storageKeys.palette] } : {},
                ...(target === 'pc' ? { viewport: { width: 1280, height: 900 }, hasTouch: false, isMobile: false } : {}),
            });
            try {
                await session.goto('/board/lists?id=test');
                if (target === 'mobile') {
                    await session.page.waitForFunction(() => !window.__dcufRuntimeCoordinator._mutationSubscribers.has('ui-post-reveal-recovery'));
                }
                await session.page.evaluate(() => {
                    window.__paletteObservation = { events: [], rows: Array.from(document.querySelectorAll('table.gall_list tr')) };
                    window.addEventListener('dcuf:palette-change', event => window.__paletteObservation.events.push(event.detail));
                });
                const capture = async (step) => {
                    const value = await session.page.evaluate(() => {
                        const panel = document.querySelector('#dcuf-palette-panel');
                        const gm = window.__dcufTestbedGM.snapshot();
                        const metrics = window.__dcufTestbedMetrics.snapshot();
                        const probe = window.__paletteObservation;
                        const rows = Array.from(document.querySelectorAll('table.gall_list tr'));
                        const focus = document.activeElement;
                        const rect = panel?.getBoundingClientRect();
                        return {
                            palette: document.documentElement.getAttribute('data-dcuf-palette'),
                            stored: gm.values.dcuf_mobile_ui_palette,
                            writes: gm.writes.filter(x => x.key === 'dcuf_mobile_ui_palette').map(({ key, value }) => ({ key, value })),
                            events: probe.events,
                            menuLabels: gm.menuLabels,
                            panelCount: document.querySelectorAll('#dcuf-palette-panel').length,
                            selected: panel?.dataset.selectedPalette || null,
                            radios: Array.from(panel?.querySelectorAll('[role=radio]') || [], x => [x.dataset.paletteId, x.getAttribute('aria-checked')]),
                            status: panel?.querySelector('[role=status]')?.textContent || '',
                            focus: { id: focus?.id || '', tag: focus?.tagName || '', palette: focus?.dataset.paletteId || '', action: focus?.dataset.dcufPaletteAction || '' },
                            geometry: rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height,
                                contained: rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight } : null,
                            sameHostRows: rows.length === probe.rows.length && rows.every((row, i) => row === probe.rows[i]),
                            hostRows: rows.map(row => ({ text: row.textContent, display: getComputedStyle(row).display })),
                            errors: metrics.errors,
                            requests: metrics.xhrRequests.map(({ method, url, body, status }) => ({ method, path: new URL(url, location.href).pathname, body, status })),
                        };
                    });
                    const warnings = session.consoleMessages
                        .filter((message) => message.type === 'warning' && /\[DCUF(?: UI)?\].*palette/i.test(message.text));
                    value.paletteWarnings = {
                        semantic: warnings.map((message) => ({ type: message.type, firstLine: message.text.split('\n', 1)[0] })),
                        raw: warnings.map((message) => ({ type: message.type, text: message.text })),
                    };
                    observations.push({ failureMode, step, value });
                };
                await capture('initial');
                await session.page.evaluate(() => window.__dcufTestbedGM.invokeMenu('UI 색상 설정'));
                await capture('opened');
                await session.page.locator('[data-palette-id=purple]').click();
                await capture('preview');
                await session.page.locator('[data-dcuf-palette-action=cancel]').click();
                await capture('cancelled');
                await session.page.evaluate(() => window.__dcufTestbedGM.invokeMenu('UI 색상 설정'));
                await session.page.locator('[data-palette-id=green]').click();
                await session.page.locator('[data-dcuf-palette-action=save]').click();
                if (failureMode === 'write') {
                    await session.page.waitForFunction(() => document.querySelector('.dcuf-palette-status')?.textContent.includes('저장하지 못했습니다'));
                    await capture('write-rejected');
                    await session.page.locator('[data-dcuf-palette-action=save]').click();
                }
                await session.page.locator('#dcuf-palette-panel').waitFor({ state: 'detached' });
                await capture('saved');
                await session.page.waitForFunction(() => {
                    const m = window.__dcufTestbedMetrics.snapshot();
                    return m.activeTimeouts === 0 && m.activeAnimationFrames === 0;
                });
                observations.push({ failureMode, step: 'settled-resources', value: await session.page.evaluate(() => {
                    const m = window.__dcufTestbedMetrics.snapshot();
                    return { timers: m.activeTimeouts, frames: m.activeAnimationFrames, intervals: m.activeIntervals,
                        observerCreations: m.mutationObserversCreated, observerDisconnects: m.mutationDisconnectCalls,
                        listeners: m.activeListenerKeys, subscribers: m.dcuf?.subscribers || [],
                        pendingMutations: m.dcuf?.pendingMutations || 0,
                        pendingMutationRaf: Boolean(m.dcuf?.pendingMutationRaf),
                        pendingMutationTimer: Boolean(m.dcuf?.pendingMutationTimer),
                        taskQueues: m.dcuf?.taskQueues || 0,
                        filterPassKinds: m.filterPasses.map(x => x.kind), errors: m.errors };
                }) });
                if (session.consoleErrors.length) throw new Error(session.consoleErrors.join('\n'));
            } finally { await session.close(); }
        }
        const pending = await createTestPage(browser, server.baseUrl, {
            storage: { [storageKeys.threshold]: 0, [storageKeys.palette]: 'purple', [storageKeys.personalEnabled]: true,
                [storageKeys.personalList]: { uids: [], nicknames: [], ips: [] } },
            gmBehavior: {
                pendingKeys: [storageKeys.palette],
                captureReadValueKeys: [storageKeys.palette],
            },
            ...(target === 'pc' ? { viewport: { width: 1280, height: 900 }, hasTouch: false, isMobile: false } : {}),
        });
        try {
            await pending.goto('/board/lists?id=test');
            const capturePending = async (step) => {
                observations.push({ scenario: 'pending-read-save', step, value: await pending.page.evaluate(() => {
                    const gm = window.__dcufTestbedGM.snapshot();
                    return {
                        palette: document.documentElement.getAttribute('data-dcuf-palette'),
                        stored: gm.values.dcuf_mobile_ui_palette,
                        writes: gm.writes.filter((entry) => entry.key === 'dcuf_mobile_ui_palette').map(({ key, value }) => ({ key, value })),
                        panelCount: document.querySelectorAll('#dcuf-palette-panel').length,
                    };
                }) });
            };
            await capturePending('pending-initial');
            await pending.page.evaluate(() => window.__dcufTestbedGM.invokeMenu('UI 색상 설정'));
            await pending.page.locator('[data-palette-id=green]').click();
            await pending.page.locator('[data-dcuf-palette-action=save]').click();
            await pending.page.waitForFunction(() => window.__dcufTestbedGM.snapshot().writes.some((entry) => (
                entry.key === 'dcuf_mobile_ui_palette' && entry.value === 'green'
            )));
            await capturePending('saved-before-read-release');
            await pending.page.evaluate((key) => window.__dcufTestbedGM.release(key), storageKeys.palette);
            await pending.page.waitForTimeout(40);
            await capturePending('after-stale-read-release');
            if (pending.consoleErrors.length) throw new Error(pending.consoleErrors.join('\n'));
        } finally { await pending.close(); }
        await writeFile(output, JSON.stringify({ sha256: hash(bytes), browser: browser.version(), observations }, null, 2) + '\n');
    } finally { await browser.close(); await server.close(); }
} else {
    const control = path.resolve(root, required('--control'));
    const candidate = path.resolve(root, required('--candidate'));
    const baseline = JSON.parse(await readFile(path.join(root, 'verification/baselines.json'), 'utf8'));
    const controlHash = hash(await readFile(control));
    const candidateHash = hash(await readFile(candidate));
    const acceptedControlHashes = target === 'mobile'
        ? [baseline.mobile.beta.sha256, baseline.mobile.stable.sha256]
        : [baseline.pc.sha256AtBehaviorSource];
    if (!acceptedControlHashes.includes(controlHash)) throw new Error(`Control must match the authoritative ${target} baseline`);
    if (controlHash === candidateHash) throw new Error('Control and candidate must have distinct digests');
    const sides = {};
    for (const [side, runtime] of Object.entries({ control, candidate })) {
        const sidePath = path.join(root, 'testbed', 'artifacts', `${path.basename(output)}.${side}.json`);
        const result = spawnSync(process.execPath, [scriptPath, '--side', runtime, '--target', target, '--output', sidePath], { cwd: root, stdio: 'inherit' });
        if (result.status !== 0) throw new Error(side + ' observation failed');
        sides[side] = JSON.parse(await readFile(sidePath, 'utf8'));
    }
    const semanticProjection = (entry) => {
        if (entry?.step !== 'settled-resources') {
            const projected = structuredClone(entry);
            if (projected?.value?.paletteWarnings) projected.value.paletteWarnings = projected.value.paletteWarnings.semantic;
            if (declaredPaletteGeometryAllowed && projected?.value?.geometry) {
                projected.value.geometry = { contained: projected.value.geometry.contained };
            }
            return projected;
        }
        const value = entry.value || {};
        return {
            failureMode: entry.failureMode,
            step: entry.step,
            value: {
                timers: value.timers,
                frames: value.frames,
                intervals: value.intervals,
                activeObservers: value.observerCreations - value.observerDisconnects,
                listeners: value.listeners,
                subscribers: value.subscribers,
                pendingMutations: value.pendingMutations,
                pendingMutationRaf: value.pendingMutationRaf,
                pendingMutationTimer: value.pendingMutationTimer,
                taskQueues: value.taskQueues,
                filterPassKinds: value.filterPassKinds,
                errors: value.errors,
            },
        };
    };
    const semanticallyEquivalent = (controlEntry, candidateEntry) => {
        const controlProjection = semanticProjection(controlEntry);
        const candidateProjection = semanticProjection(candidateEntry);
        if (controlProjection?.step !== 'settled-resources' || candidateProjection?.step !== 'settled-resources') {
            return isDeepStrictEqual(controlProjection, candidateProjection);
        }
        const controlValue = controlProjection.value || {};
        const candidateValue = candidateProjection.value || {};
        const monotoneResourceKeys = ['timers', 'frames', 'intervals', 'activeObservers', 'listeners'];
        if (monotoneResourceKeys.some((key) => (
            !Number.isFinite(controlValue[key])
            || !Number.isFinite(candidateValue[key])
            || candidateValue[key] > controlValue[key]
        ))) return false;
        const withoutMonotoneResources = (projection) => {
            const clone = structuredClone(projection);
            for (const key of monotoneResourceKeys) delete clone.value[key];
            return clone;
        };
        return isDeepStrictEqual(
            withoutMonotoneResources(controlProjection),
            withoutMonotoneResources(candidateProjection),
        );
    };
    const rawDifferences = sides.control.observations.flatMap((entry, index) => isDeepStrictEqual(entry, sides.candidate.observations[index]) ? [] : [{ index, control: entry, candidate: sides.candidate.observations[index] }]);
    const differences = sides.control.observations.flatMap((entry, index) => {
        const candidateEntry = sides.candidate.observations[index];
        return semanticallyEquivalent(entry, candidateEntry)
            ? []
            : [{ index, control: semanticProjection(entry), candidate: semanticProjection(candidateEntry) }];
    });
    const equivalent = sides.control.browser === sides.candidate.browser && sides.control.observations.length === sides.candidate.observations.length && differences.length === 0;
    const observationEvidence = Object.fromEntries(Object.entries(sides).map(([side, value]) => [side, {
        artifactSha256: value.sha256,
        browser: value.browser,
        observationCount: value.observations.length,
        observationsSha256: hash(Buffer.from(JSON.stringify(value.observations))),
    }]));
    await writeFile(output, JSON.stringify({ schemaVersion: 1, kind: 'observed-palette-differential',
        target, controlSource: baseline[target].behaviorSourceCommit, controlSha256: controlHash, candidateSha256: candidateHash,
        observerSha256: digestEvidenceBytes('testbed/run-palette-differential.mjs', await readFile(scriptPath)).toUpperCase(), evidenceBinding: await createEvidenceBinding(root),
        scope: `${target} palette preview/cancel/save plus read-failure fallback and write-failure retry (semantic warning type/first-line, full warning text retained as raw evidence), plus save-before-pending-startup-read-release ordering; settled resource equivalence compares active ownership while retaining cumulative startup churn as raw evidence; declared palette geometry may normalize exact rectangles to containment while raw rectangles remain retained; no claim about other surfaces`,
        observationEvidence, ...(compact ? {} : { sides }), rawDifferences, differences, equivalent }, null, 2) + '\n');
    console.log('Observed palette comparison: ' + (equivalent ? 'PASS' : 'FAIL') + '; ' + differences.length + ' semantic and ' + rawDifferences.length + ' raw differing snapshots');
    if (!equivalent) process.exitCode = 1;
}
