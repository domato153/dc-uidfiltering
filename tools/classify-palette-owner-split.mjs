import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { createEvidenceBinding, digestEvidenceBytes } from './evidence-binding.mjs';
import { probePaletteOwnerLifecycle } from './probe-palette-owner-lifecycle.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), '..');
const CONTROL_SHA = '32BA208DDD9973A7EEC343F01E963A833AB4F0C084987077EDAE46844383C25D';
const CANDIDATE_SHA = 'C84AD9220A060CC3AF91F3039F07B13FAD75521DA63201046E3693F875DC03C7';
const BASE_OWNERS = ['filter-universal-observer', 'ui-list-runtime', 'header-drawer', 'list-memo-popup'];
const ADDED_OWNERS = ['header-shell-style', 'gallery-page-head-style', 'header-gnb-style', 'header-recent-visit-navigation'];
const CANDIDATE_OWNERS = [...BASE_OWNERS.slice(0, 2), ...ADDED_OWNERS, ...BASE_OWNERS.slice(2)];
const STYLE_OWNERS = ['header-shell-presenter', 'gallery-page-head-presenter',
    'header-gnb-presenter', 'header-recent-visit-presenter'];
const OWNER_TESTS = [
    '헤더 셸 CSS는 단일 presenter 소유와 교체·해제 가능한 host 의미 표식을 유지한다',
    '갤러리 page-head CSS는 두 host 헤더의 단일 소유자와 교체·해제 가능한 표식을 유지한다',
    'GNB CSS는 단일 presenter 소유와 교체·해제 가능한 host 의미 표식을 유지한다',
    '최근 방문 CSS는 단일 presenter 소유와 복제·해제 가능한 host 의미 표식을 유지한다',
];
const STEPS = [
    'none/initial', 'none/opened', 'none/preview', 'none/cancelled', 'none/saved', 'none/settled-resources',
    'write/initial', 'write/opened', 'write/preview', 'write/cancelled', 'write/write-rejected', 'write/saved', 'write/settled-resources',
    'read/initial', 'read/opened', 'read/preview', 'read/cancelled', 'read/saved', 'read/settled-resources',
    'pending-read-save/pending-initial', 'pending-read-save/saved-before-read-release', 'pending-read-save/after-stale-read-release',
];
const SETTLED_INDEXES = [5, 12, 18];
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const check = (condition, message) => { if (!condition) throw new Error(message); };

function projected(entry) {
    const clone = structuredClone(entry);
    if (clone.step !== 'settled-resources') {
        if (clone.value?.paletteWarnings) clone.value.paletteWarnings = clone.value.paletteWarnings.semantic;
        if (clone.value?.geometry) clone.value.geometry = { contained: clone.value.geometry.contained };
        return clone;
    }
    const { observerCreations, observerDisconnects, ...value } = clone.value;
    return { ...clone, value: { ...value, activeObservers: observerCreations - observerDisconnects } };
}

function positivePalettePath(observations, mode) {
    const at = (step) => observations.find((entry) => entry.failureMode === mode && entry.step === step)?.value;
    const initial = at('initial');
    const opened = at('opened');
    const preview = at('preview');
    const cancelled = at('cancelled');
    const saved = at('saved');
    check(initial?.palette === 'blue' && initial.stored === 'blue' && initial.panelCount === 0,
        `${mode}: initial palette is not positive`);
    check(opened?.panelCount === 1 && opened.geometry?.contained === true && opened.focus?.palette === 'blue',
        `${mode}: palette open/focus/containment is not positive`);
    check(preview?.palette === 'purple' && preview.stored === 'blue' && preview.focus?.palette === 'purple',
        `${mode}: preview/storage/focus is not positive`);
    check(cancelled?.palette === 'blue' && cancelled.stored === 'blue' && cancelled.panelCount === 0,
        `${mode}: cancel did not restore palette`);
    check(saved?.palette === 'green' && saved.stored === 'green' && saved.panelCount === 0
        && saved.writes?.some((entry) => entry.key === 'dcuf_mobile_ui_palette' && entry.value === 'green'),
    `${mode}: save/storage is not positive`);
    if (mode === 'write') check(at('write-rejected')?.stored === 'blue' && at('write-rejected')?.panelCount === 1,
        'write failure did not retain the dialog and old stored value');
    if (mode === 'read') check(initial.paletteWarnings?.semantic?.length > 0, 'read-failure warning is missing');
}

function checkLifecycleProbe(probe, browser) {
    check(probe?.browser === browser && probe.runtime === path.join(root, 'testbed/artifacts/runtime-under-test.user.js'),
        'lifecycle probe browser/runtime identity changed');
    const phases = probe.lifecycle || {};
    for (const [name, expectedOwners, styleCount, subscriberCount] of [
        ['before', CANDIDATE_OWNERS, 1, 1],
        ['disposed', BASE_OWNERS, 0, 0],
        ['reconnected', [...BASE_OWNERS, ...ADDED_OWNERS], 1, 1],
        ['repeated', [...BASE_OWNERS, ...ADDED_OWNERS], 1, 1],
    ]) {
        const phase = phases[name];
        check(phase && isDeepStrictEqual(phase.allSubscriberKeys, expectedOwners)
            && isDeepStrictEqual(phase.keys, subscriberCount ? ADDED_OWNERS : [])
            && new Set(phase.allSubscriberKeys).size === phase.allSubscriberKeys.length,
        `${name}: lifecycle subscriber ownership changed`);
        check(isDeepStrictEqual(phase.styleCounts, Array(4).fill(styleCount))
            && isDeepStrictEqual(phase.styleOwners, styleCount ? STYLE_OWNERS : Array(4).fill(null))
            && phase.adapterResources?.length === 4
            && phase.adapterResources.every((entry) => entry.mutationSubscribers === subscriberCount
                && (subscriberCount ? entry.activeRoots > 0 : entry.activeRoots === 0)),
        `${name}: lifecycle styles or adapter resources changed`);
        check(phase.activeObservers === 5, `${name}: lifecycle observer count changed`);
    }
    check(phases.disposed.adapterResources[3].documentListeners === 0
        && phases.disposed.adapterResources[3].scrollListeners === 0
        && phases.disposed.adapterResources[3].timers === 0
        && phases.disposed.adapterResources[3].animationFrames === 0,
    'recent-visit lifecycle resources survived disposal');
    check(phases.before.activeListeners === phases.reconnected.activeListeners
        && phases.reconnected.activeListeners === phases.repeated.activeListeners
        && phases.disposed.activeListeners < phases.before.activeListeners,
    'duplicate connect or disposal changed listener ownership');
    check(probe.preview?.palette === 'purple' && probe.preview.stored === 'blue' && probe.preview.focus === 'purple'
        && probe.cancelled?.palette === 'blue' && probe.cancelled.stored === 'blue'
        && probe.cancelled.panelCount === 0 && isDeepStrictEqual(probe.cancelled.writes, [])
        && probe.cancelled.events?.some((entry) => entry.id === 'blue' && entry.reason === 'preview-cancel')
        && isDeepStrictEqual(probe.cancelled.errors, []) && isDeepStrictEqual(probe.consoleErrors, []),
    'palette path changed after owner lifecycle');
}

export function classifyPaletteOwnerSplit(input) {
    const { report, reportBytes, controlSideBytes, candidateSideBytes, controlBytes, candidateBytes,
        observerBytes, currentBinding, fullMobile, architecture, classifierBytes, probe,
        surfaceManifest, surfaceManifestBytes, deltas, deltasBytes } = input;
    check(isDeepStrictEqual(JSON.parse(reportBytes), report), 'raw report bytes/object mismatch');
    check(sha(controlBytes) === CONTROL_SHA && sha(candidateBytes) === CANDIDATE_SHA, 'control/candidate bytes changed');
    check(report?.schemaVersion === 1 && report.kind === 'observed-palette-differential' && report.target === 'mobile',
        'wrong palette raw report');
    check(report.controlSha256 === CONTROL_SHA && report.candidateSha256 === CANDIDATE_SHA && report.equivalent === false,
        'raw FAIL or artifact identity changed');
    check(report.observerSha256 === digestEvidenceBytes('testbed/run-palette-differential.mjs', observerBytes).toUpperCase(),
        'palette observer changed after raw report');
    check(isDeepStrictEqual(report.evidenceBinding, currentBinding), 'raw report evidence binding is stale');
    check(isDeepStrictEqual(JSON.parse(surfaceManifestBytes), surfaceManifest)
        && isDeepStrictEqual(JSON.parse(deltasBytes), deltas), 'palette contract bytes/object mismatch');
    const paletteSurface = surfaceManifest.surfaces?.find((entry) => entry.id === 'tokens-settings-palette');
    const paletteDelta = deltas.contracts?.find((entry) => entry.id === paletteSurface?.intendedDelta);
    check(paletteDelta?.status === 'active' && paletteDelta.surfaces?.includes('tokens-settings-palette')
        && paletteDelta.allowed?.some((entry) => entry.kind === 'geometry'
            && entry.surface === 'tokens-settings-palette' && entry.contractTests?.length > 0),
    'palette geometry normalization has no active contract');
    check(architecture?.scope === 'repository-source-and-build-only' && architecture.findings?.length === 0,
        'effective architecture has findings');
    const header = architecture.surfaces?.find((entry) => entry.id === 'header-navigation');
    check(header && ['dcuf-header-shell-style', 'dcuf-gallery-page-head-style', 'dcuf-header-gnb-style',
        'dcuf-header-recent-visit-style'].every((id) => header.styles?.some((style) => style.id === id)),
    'declared header style owners are missing');
    check(isDeepStrictEqual(JSON.parse(input.fullMobileBytes), fullMobile), 'mobile owner test bytes/object mismatch');
    check(fullMobile?.runtime?.sha256 === CANDIDATE_SHA && fullMobile.runtime.target === 'mobile'
        && fullMobile.results?.length === 129 && fullMobile.results.every((entry) => entry.status === 'passed'),
    'exact-candidate mobile owner test run is unavailable');
    for (const name of OWNER_TESTS) check(fullMobile.results.filter((entry) => entry.name === name && entry.status === 'passed').length === 1,
        `owner lifecycle test missing or duplicated: ${name}`);

    const sideBytes = { control: controlSideBytes, candidate: candidateSideBytes };
    const expectedSha = { control: CONTROL_SHA, candidate: CANDIDATE_SHA };
    for (const sideName of ['control', 'candidate']) {
        const side = JSON.parse(sideBytes[sideName]);
        check(isDeepStrictEqual(side, report.sides?.[sideName]), `${sideName} side report bytes/object mismatch`);
        check(side.sha256 === expectedSha[sideName] && side.browser === report.observationEvidence?.[sideName]?.browser
            && side.observations?.length === 22, `${sideName} side identity/applicability changed`);
        check(isDeepStrictEqual(side.observations.map((entry) => `${entry.failureMode || entry.scenario}/${entry.step}`), STEPS),
            `${sideName} observation order/applicability changed`);
        check(report.observationEvidence[sideName].artifactSha256 === expectedSha[sideName]
            && report.observationEvidence[sideName].observationCount === 22
            && report.observationEvidence[sideName].observationsSha256 === sha(Buffer.from(JSON.stringify(side.observations))),
        `${sideName} observation digest changed`);
        for (const mode of ['none', 'write', 'read']) positivePalettePath(side.observations, mode);
        const pending = side.observations.filter((entry) => entry.scenario === 'pending-read-save');
        check(pending[1]?.value.palette === 'green' && pending[1].value.stored === 'green'
            && pending[2]?.value.palette === 'green' && pending[2].value.stored === 'green',
        `${sideName} pending-read ordering is not positive`);
    }
    check(report.sides.control.browser === report.sides.candidate.browser, 'browser versions differ');
    checkLifecycleProbe(probe, report.sides.candidate.browser);
    const rawDifferences = report.sides.control.observations.flatMap((entry, index) =>
        isDeepStrictEqual(entry, report.sides.candidate.observations[index]) ? []
            : [{ index, control: entry, candidate: report.sides.candidate.observations[index] }]);
    check(isDeepStrictEqual(rawDifferences, report.rawDifferences) && rawDifferences.length === 14,
        'raw differences changed or were erased');
    const semanticDifferences = [];
    for (let index = 0; index < STEPS.length; index += 1) {
        const control = projected(report.sides.control.observations[index]);
        const candidate = projected(report.sides.candidate.observations[index]);
        if (!isDeepStrictEqual(control, candidate)) semanticDifferences.push({ index, control, candidate });
    }
    check(isDeepStrictEqual(semanticDifferences, report.differences)
        && isDeepStrictEqual(semanticDifferences.map((entry) => entry.index), SETTLED_INDEXES),
    'semantic differences are not exactly the three settled snapshots');

    for (const { index, control, candidate } of semanticDifferences) {
        const a = report.sides.control.observations[index].value;
        const b = report.sides.candidate.observations[index].value;
        check(isDeepStrictEqual(a.subscribers, BASE_OWNERS) && isDeepStrictEqual(b.subscribers, CANDIDATE_OWNERS)
            && new Set(b.subscribers).size === b.subscribers.length,
        `${STEPS[index]}: missing, extra or duplicate owner`);
        check(a.observerCreations === 5 && a.observerDisconnects === 0
            && b.observerCreations === 6 && b.observerDisconnects === 1
            && control.value.activeObservers === 5 && candidate.value.activeObservers === 5,
        `${STEPS[index]}: active observer or startup churn changed`);
        check(a.listeners === 188 && b.listeners === 170, `${STEPS[index]}: listener transition changed`);
        for (const value of [a, b]) check(value.timers === 0 && value.frames === 0 && value.intervals === 0
            && value.pendingMutations === 0 && value.pendingMutationRaf === false
            && value.pendingMutationTimer === false && value.taskQueues === 0
            && isDeepStrictEqual(value.errors, []) && isDeepStrictEqual(value.filterPassKinds, ['observed-items']),
        `${STEPS[index]}: resources did not settle`);
        const allowed = new Set(['subscribers', 'listeners', 'observerCreations', 'observerDisconnects']);
        const strip = (value) => Object.fromEntries(Object.entries(value).filter(([key]) => !allowed.has(key)));
        check(isDeepStrictEqual(strip(a), strip(b)), `${STEPS[index]}: non-owner resource changed`);
    }
    return {
        schemaVersion: 1, kind: 'palette-header-owner-split-classification',
        rawStatus: 'FAIL', classificationStatus: 'DECLARED_OWNER_SPLIT_ONLY', stageStatus: 'UNKNOWN',
        controlSha256: CONTROL_SHA, candidateSha256: CANDIDATE_SHA,
        rawReportSha256: sha(reportBytes), controlSideSha256: sha(controlSideBytes),
        candidateSideSha256: sha(candidateSideBytes), observerSha256: sha(observerBytes),
        classifierSha256: sha(classifierBytes), fullMobileRunSha256: sha(input.fullMobileBytes),
        lifecycleProbeScriptSha256: sha(input.probeScriptBytes), lifecycleProbeSha256: sha(Buffer.from(JSON.stringify(probe))),
        evidenceBinding: currentBinding, observationCountPerSide: 22, rawDifferenceCount: 14,
        classifiedSemanticIndexes: SETTLED_INDEXES, addedOwners: ADDED_OWNERS,
        lifecycleProbe: {
            beforeSubscribers: probe.lifecycle.before.allSubscriberKeys.length,
            disposedSubscribers: probe.lifecycle.disposed.allSubscriberKeys.length,
            reconnectedSubscribers: probe.lifecycle.reconnected.allSubscriberKeys.length,
            listenerCounts: ['before', 'disposed', 'reconnected', 'repeated']
                .map((name) => probe.lifecycle[name].activeListeners),
            activeObservers: ['before', 'disposed', 'reconnected', 'repeated']
                .map((name) => probe.lifecycle[name].activeObservers),
            palettePreviewCancel: 'PASS',
        },
        limitations: ['raw palette comparator remains FAIL', 'lifecycle is covered by exact-candidate Testbed, not the actual extension',
            'other settings/filter states and final feature inventory remain UNKNOWN'],
    };
}

export async function readCurrentInputs() {
    const files = {
        report: 'testbed/artifacts/final-mobile-palette-C84AD922.json',
        controlSide: 'testbed/artifacts/final-mobile-palette-C84AD922.json.control.json',
        candidateSide: 'testbed/artifacts/final-mobile-palette-C84AD922.json.candidate.json',
        control: 'testbed/artifacts/baseline-mobile-stable.user.js',
        candidate: 'testbed/artifacts/runtime-under-test.user.js',
        observer: 'testbed/run-palette-differential.mjs',
        fullMobile: 'testbed/artifacts/mobile-129-C84AD922.json',
        surfaceManifest: 'architecture/ui-surfaces.json',
        deltas: 'verification/intended-deltas.json',
    };
    const bytes = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([key, relative]) =>
        [key, await readFile(path.join(root, relative))])));
    const { spawnSync } = await import('node:child_process');
    const archResult = spawnSync(process.execPath, ['tools/inspect-live-architecture.mjs', '--surface', 'header-navigation'],
        { cwd: root, encoding: 'utf8', shell: false });
    check(archResult.status === 0, 'effective architecture inspection failed');
    return { report: JSON.parse(bytes.report), reportBytes: bytes.report,
        controlSideBytes: bytes.controlSide, candidateSideBytes: bytes.candidateSide,
        controlBytes: bytes.control, candidateBytes: bytes.candidate, observerBytes: bytes.observer,
        fullMobile: JSON.parse(bytes.fullMobile), fullMobileBytes: bytes.fullMobile,
        surfaceManifest: JSON.parse(bytes.surfaceManifest), surfaceManifestBytes: bytes.surfaceManifest,
        deltas: JSON.parse(bytes.deltas), deltasBytes: bytes.deltas,
        architecture: JSON.parse(archResult.stdout), classifierBytes: await readFile(scriptPath),
        probeScriptBytes: await readFile(path.join(root, 'tools/probe-palette-owner-lifecycle.mjs')),
        probe: await probePaletteOwnerLifecycle(),
        currentBinding: await createEvidenceBinding(root), files };
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
    try {
        const result = classifyPaletteOwnerSplit(await readCurrentInputs());
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error(`Palette owner classification BLOCKED: ${error.message}`);
        process.exitCode = 1;
    }
}
