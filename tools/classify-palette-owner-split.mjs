import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { createEvidenceBinding, digestEvidenceBytes } from './evidence-binding.mjs';
import { probePaletteOwnerLifecycle } from './probe-palette-owner-lifecycle.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), '..');
const CONTROL_SHA = '32BA208DDD9973A7EEC343F01E963A833AB4F0C084987077EDAE46844383C25D';
const CANDIDATE_SHA = 'C84AD9220A060CC3AF91F3039F07B13FAD75521DA63201046E3693F875DC03C7';
const PROFILES = Object.freeze({
    historical: Object.freeze({ control: CONTROL_SHA, candidate: CANDIDATE_SHA, mobileCount: 129 }),
    'header-6869': Object.freeze({
        control: 'A03038FE68126B62054EBA11244D4EE2E1766D308983FC5C27127FD3794CB343',
        candidate: '6869B58682E7B4159785C1B7E1F5FD6E8CD597CA602AECAB71904A77B7C00CD5', mobileCount: 138,
    }),
    'header-6b8b': Object.freeze({
        control: 'A03038FE68126B62054EBA11244D4EE2E1766D308983FC5C27127FD3794CB343',
        candidate: '6B8B76C69B18A62C628CE8FB7C6BAB8D3AE95F978BC5F1A940E94B09A8579D67', mobileCount: 138,
    }),
});
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
const DIRECT_BINDINGS = ['sourceInputsSha256', 'harnessSha256', 'fixturesSha256', 'toolchainSha256', 'node'];
export const PALETTE_QUALIFICATION_DEPENDENCIES = Object.freeze({
    baseline: 'verification/baselines.json',
    observer: 'testbed/run-palette-differential.mjs',
    classifier: 'tools/classify-palette-owner-split.mjs',
    probe: 'tools/probe-palette-owner-lifecycle.mjs',
    gate: 'tools/run-qualified-mobile-palette.mjs',
    mobileOracle: 'testbed/header-drawer-body-contract.mjs',
    listOracle: 'testbed/ui-repair-list-contract.mjs',
    articleOracle: 'testbed/ui-repair-article-contract.mjs',
    commentOracle: 'testbed/ui-repair-comment-contract.mjs',
    dialogOracle: 'testbed/ui-repair-dialog-contract.mjs',
    surfaceManifest: 'architecture/ui-surfaces.json',
    deltas: 'verification/intended-deltas.json',
});

function exactKeys(value, keys, label) {
    check(value && typeof value === 'object' && !Array.isArray(value)
        && isDeepStrictEqual(Object.keys(value).sort(), [...keys].sort()), `${label} fields changed`);
}

// This is a reviewed exact-artifact certificate, never an allow-current policy.
// The gate command separately pins its canonical digest in verification/gates.json.
export function assertPaletteQualification(value) {
    exactKeys(value, ['schemaVersion', 'kind', 'controlSha256', 'candidateSha256', 'controlSemanticSha256', 'browser', 'platform',
        'evidenceBinding', 'dependencies', 'fullMobile'], 'qualification');
    check(value.schemaVersion === 1 && value.kind === 'exact-header-palette-owner-qualification', 'wrong qualification kind');
    check(value.controlSha256 === PROFILES['header-6b8b'].control, 'qualification controlSha256 must be the original beta baseline');
    check(/^[A-F0-9]{64}$/.test(value.candidateSha256), 'invalid qualification candidateSha256');
    check(value.candidateSha256 !== value.controlSha256, 'qualification artifacts must be distinct');
    check(/^[A-F0-9]{64}$/.test(value.controlSemanticSha256), 'invalid qualification controlSemanticSha256');
    check(typeof value.browser === 'string' && value.browser.trim().length > 0, 'qualification browser missing');
    check(/^(?:win32|linux|darwin)\/(?:x64|arm64)$/.test(value.platform), 'invalid qualification platform');
    exactKeys(value.evidenceBinding, DIRECT_BINDINGS, 'qualification evidenceBinding');
    for (const field of DIRECT_BINDINGS.filter(key => key !== 'node')) {
        check(/^[a-f0-9]{64}$/.test(value.evidenceBinding[field]), `invalid qualification evidenceBinding.${field}`);
    }
    check(/^v\d+\.\d+\.\d+$/.test(value.evidenceBinding.node), 'invalid qualification evidenceBinding.node');
    exactKeys(value.dependencies, Object.keys(PALETTE_QUALIFICATION_DEPENDENCIES), 'qualification dependencies');
    for (const [key, digest] of Object.entries(value.dependencies)) {
        check(/^[A-F0-9]{64}$/.test(digest), `invalid qualification dependency ${key}`);
    }
    exactKeys(value.fullMobile, ['path', 'sha256', 'testCount'], 'qualification fullMobile');
    check(typeof value.fullMobile.path === 'string'
        && /^(?:artifacts|testbed\/artifacts)\/[A-Za-z0-9_./-]+\.json$/.test(value.fullMobile.path)
        && !value.fullMobile.path.split('/').some(part => part === '.' || part === '..' || part === ''),
    'invalid qualification fullMobile.path');
    check(/^[A-F0-9]{64}$/.test(value.fullMobile.sha256), 'invalid qualification fullMobile.sha256');
    check(Number.isSafeInteger(value.fullMobile.testCount) && value.fullMobile.testCount >= OWNER_TESTS.length,
        'invalid qualification fullMobile.testCount');
    return value;
}

function assertQualifiedInputs(input) {
    const qualification = assertPaletteQualification(input.qualification);
    check(qualification.platform === `${process.platform}/${process.arch}`, 'qualified platform changed');
    check(isDeepStrictEqual(JSON.parse(input.qualificationBytes), qualification), 'qualification bytes/object mismatch');
    check(/^[A-F0-9]{64}$/.test(input.qualificationSha256)
        && digestEvidenceBytes('qualification.json', input.qualificationBytes).toUpperCase() === input.qualificationSha256,
    'reviewed qualification digest changed');
    for (const field of DIRECT_BINDINGS) {
        check(input.currentBinding?.[field] === qualification.evidenceBinding[field], `qualified direct input changed: ${field}`);
    }
    for (const [key, relative] of Object.entries(PALETTE_QUALIFICATION_DEPENDENCIES)) {
        check(input.qualificationDependencyBytes?.[key]
            && digestEvidenceBytes(relative, input.qualificationDependencyBytes[key]).toUpperCase() === qualification.dependencies[key],
        `qualified dependency changed: ${key}`);
    }
    for (const [key, inputKey] of [['baseline', 'baselineBytes'], ['observer', 'observerBytes'],
        ['classifier', 'classifierBytes'], ['probe', 'probeScriptBytes'],
        ['surfaceManifest', 'surfaceManifestBytes'], ['deltas', 'deltasBytes']]) {
        check(input[inputKey] && Buffer.from(input[inputKey]).equals(Buffer.from(input.qualificationDependencyBytes[key])),
            `qualified dependency bytes mismatch: ${key}`);
    }
    check(sha(input.fullMobileBytes) === qualification.fullMobile.sha256, 'qualified full-mobile report changed');
    check(isDeepStrictEqual(input.fullMobile?.selection, { group: null, filter: null, excludeFilter: null }),
        'qualified full-mobile run must be unfiltered');
    check(input.fullMobile?.browser?.version === qualification.browser
        && input.report?.sides?.control?.browser === qualification.browser
        && input.report?.sides?.candidate?.browser === qualification.browser, 'qualified browser changed');
    check(input.fullMobile?.runtime?.path === path.join(root, 'testbed/artifacts/runtime-under-test.user.js'),
        'qualified full-mobile runtime path changed');
    return qualification;
}

export function assertRetainedMobileReuse({ unitBytes, fullMobileBytes, currentBinding,
    profileId = 'header-6869', routeBytes, mobileOracleBytes }) {
    check(unitBytes && fullMobileBytes, 'retained full-mobile evidence missing');
    check(['header-6869', 'header-6b8b'].includes(profileId), 'unknown retained full-mobile profile');
    const current = profileId === 'header-6b8b';
    check(sha(unitBytes) === (current
        ? 'B16EB823A96006B89456F691D3FC63D48A74DDF1F414F0690525E36E68DA7C50'
        : '055BE1CDBB8E3BEAFC61B0C6898ED9626E78C768E1E4FA15BD16A03244A08E60'),
        'retained full-mobile unit identity changed');
    const unit = JSON.parse(unitBytes);
    const reportHash = current ? unit.reports.find(entry => entry.original === 'testbed/artifacts/acceptance-full-testbed-results.json')?.sha256
        : unit.reports['full-mobile.json'];
    check(sha(fullMobileBytes) === reportHash, 'retained full-mobile report changed');
    let binding = unit.evidenceBinding;
    if (current) {
        check(routeBytes && sha(routeBytes) === unit.route.sha256, 'retained full-mobile route changed');
        const route = JSON.parse(routeBytes);
        check(route.candidateFingerprint === unit.candidateFingerprint && route.head === unit.sourceBaseHead,
            'retained full-mobile route identity changed');
        binding = route.evidenceBinding;
        // run-tests imports this helper outside harness/fixtures. Other direct
        // source, harness, fixture, loader/package and Node inputs are bound below.
        check(mobileOracleBytes && sha(mobileOracleBytes) === 'B4A1EB7F147BB851B1B4245F14ABE3E5C3AACE4547DB413D394D09FFBEB25ECC',
            'retained full-mobile oracle dependency changed');
    }
    for (const field of ['sourceInputsSha256', 'harnessSha256', 'fixturesSha256', 'toolchainSha256', 'node']) {
        check(binding[field] === currentBinding?.[field], `retained full-mobile binding changed: ${field}`);
    }
    return unit;
}

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

export function digestPaletteSemanticObservations(observations) {
    check(Array.isArray(observations) && observations.length === 22, 'palette semantic observations missing');
    return sha(Buffer.from(JSON.stringify(observations.map(projected))));
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

function checkLifecycleProbe(probe, browser, requireSettled = false) {
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
        if (requireSettled) {
            exactKeys(phase.settled, ['timers', 'frames', 'intervals', 'pendingMutations',
                'pendingMutationRaf', 'pendingMutationTimer', 'taskQueues', 'errors'], `${name}: lifecycle settled`);
            check(phase.settled.timers === 0 && phase.settled.frames === 0
                && phase.settled.intervals === 0 && phase.settled.pendingMutations === 0
                && phase.settled.pendingMutationRaf === false && phase.settled.pendingMutationTimer === false
                && phase.settled.taskQueues === 0 && isDeepStrictEqual(phase.settled.errors, []),
            `${name}: lifecycle work did not settle`);
            const roots = subscriberCount ? 1 : 0;
            const expected = Array.from({ length: 3 }, () => ({ activeRoots: roots, mutationSubscribers: subscriberCount }));
            expected.push({ activeRoots: roots, scrollListeners: subscriberCount, documentListeners: subscriberCount,
                mutationSubscribers: subscriberCount, timers: 0, animationFrames: 0 });
            check(isDeepStrictEqual(phase.adapterResources, expected), `${name}: exact adapter lifecycle resources changed`);
        }
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
    const profileId = input.profileId || 'historical';
    const qualification = profileId === 'qualified-header' ? assertQualifiedInputs(input) : null;
    check(qualification || Object.hasOwn(PROFILES, profileId), 'unknown exact-artifact profile');
    const { control: CONTROL_SHA, candidate: CANDIDATE_SHA, mobileCount } = qualification
        ? { control: qualification.controlSha256, candidate: qualification.candidateSha256, mobileCount: qualification.fullMobile.testCount }
        : PROFILES[profileId];
    const { report, reportBytes, controlSideBytes, candidateSideBytes, controlBytes, candidateBytes,
        observerBytes, currentBinding, fullMobile, architecture, classifierBytes, probe,
        surfaceManifest, surfaceManifestBytes, deltas, deltasBytes } = input;
    check(isDeepStrictEqual(JSON.parse(reportBytes), report), 'raw report bytes/object mismatch');
    check(sha(controlBytes) === CONTROL_SHA && sha(candidateBytes) === CANDIDATE_SHA, 'control/candidate bytes changed');
    check(report?.schemaVersion === 1 && report.kind === 'observed-palette-differential' && report.target === 'mobile',
        'wrong palette raw report');
    check(report.controlSha256 === CONTROL_SHA && report.candidateSha256 === CANDIDATE_SHA && report.equivalent === false,
        'raw FAIL or artifact identity changed');
    if (profileId === 'header-6b8b' || qualification) {
        check(input.baselineBytes && digestEvidenceBytes('verification/baselines.json', input.baselineBytes).toUpperCase()
            === '0ADAED6B58532372E7B6354410BAD23DCCCD0236D11166939764EE1A21588B5F',
        'palette baseline authority changed');
        const baseline = JSON.parse(input.baselineBytes);
        check(baseline.mobile.beta.sha256 === CONTROL_SHA && report.controlSource === baseline.mobile.behaviorSourceCommit,
            'palette baseline source identity changed');
    }
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
        && fullMobile.results?.length === mobileCount && fullMobile.results.every((entry) => entry.status === 'passed'),
    'exact-candidate mobile owner test run is unavailable');
    for (const name of OWNER_TESTS) check(fullMobile.results.filter((entry) => entry.name === name && entry.status === 'passed').length === 1,
        `owner lifecycle test missing or duplicated: ${name}`);
    if (profileId !== 'historical' && !qualification) {
        assertRetainedMobileReuse({ profileId, unitBytes: input.retainedUnitBytes, fullMobileBytes: input.fullMobileBytes, currentBinding,
            routeBytes: input.retainedRouteBytes, mobileOracleBytes: input.mobileOracleBytes });
        check(fullMobile.browser?.version === report.sides?.candidate?.browser, 'full-mobile browser identity changed');
    }

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
    if (qualification) check(digestPaletteSemanticObservations(report.sides.control.observations)
        === qualification.controlSemanticSha256, 'qualified original control effects changed');
    checkLifecycleProbe(probe, report.sides.candidate.browser, Boolean(qualification));
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
        schemaVersion: 1, kind: 'palette-header-owner-split-classification', profileId,
        rawStatus: 'FAIL', classificationStatus: 'DECLARED_OWNER_SPLIT_ONLY', stageStatus: 'UNKNOWN',
        controlSha256: CONTROL_SHA, candidateSha256: CANDIDATE_SHA,
        rawReportSha256: sha(reportBytes), controlSideSha256: sha(controlSideBytes),
        candidateSideSha256: sha(candidateSideBytes), observerSha256: sha(observerBytes),
        classifierSha256: sha(classifierBytes), fullMobileRunSha256: sha(input.fullMobileBytes),
        ...(profileId === 'header-6b8b' || qualification ? { baselineSha256: digestEvidenceBytes('verification/baselines.json', input.baselineBytes).toUpperCase() } : {}),
        ...(qualification ? { qualificationSha256: input.qualificationSha256,
            qualificationScope: 'exact-artifact-owner-split-only' } : {}),
        ...(input.retainedUnitBytes ? { retainedEvidence: {
            unitSha256: sha(input.retainedUnitBytes),
            ...(input.retainedRouteBytes ? { routeSha256: sha(input.retainedRouteBytes) } : {}),
            ...(input.mobileOracleBytes ? { mobileOracleSha256: sha(input.mobileOracleBytes) } : {}),
            unchangedBindings: ['sourceInputsSha256', 'harnessSha256', 'fixturesSha256', 'toolchainSha256', 'node', 'browser'],
        } } : {}),
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

export async function readCurrentInputs(profileId = 'historical') {
    check(Object.hasOwn(PROFILES, profileId), 'unknown exact-artifact profile');
    const currentBinding = await createEvidenceBinding(root);
    let retainedUnitBytes, retainedRouteBytes, mobileOracleBytes;
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
    if (profileId === 'header-6869') {
        Object.assign(files, {
            report: 'testbed/artifacts/header-admission-2026-10-13/palette-current.json',
            controlSide: 'testbed/artifacts/palette-current.json.control.json',
            candidateSide: 'testbed/artifacts/palette-current.json.candidate.json',
            control: 'testbed/artifacts/baseline-mobile-beta.user.js',
            fullMobile: 'artifacts/header-finish-2026-10-13/full-mobile.json',
        });
        retainedUnitBytes = await readFile(path.join(root, 'artifacts/header-finish-2026-10-13/unit-result.json'));
        const unit = assertRetainedMobileReuse({ unitBytes: retainedUnitBytes,
            fullMobileBytes: await readFile(path.join(root, files.fullMobile)), currentBinding });
        // Reuse only unchanged runtime/build and the complete recorded Testbed inputs.
        for (const [relative, expected] of Object.entries(unit.dependencies)) {
            if (/^(src\/|build\/|testbed\/|tools\/build-)/.test(relative)) {
                check(sha(await readFile(path.join(root, relative))) === expected,
                    `retained full-mobile dependency changed: ${relative}`);
            }
        }
    }
    if (profileId === 'header-6b8b') {
        Object.assign(files, {
            report: 'testbed/artifacts/header-palette-2026-10-15/header-palette-6B8B.json',
            controlSide: 'testbed/artifacts/header-palette-6B8B.json.control.json',
            candidateSide: 'testbed/artifacts/header-palette-6B8B.json.candidate.json',
            control: 'testbed/artifacts/baseline-mobile-beta.user.js',
            fullMobile: 'artifacts/header-dark-2026-10-15/reports/acceptance-full-testbed-results.json',
            baseline: 'verification/baselines.json',
        });
        retainedUnitBytes = await readFile(path.join(root, 'artifacts/header-dark-2026-10-15/unit-result.json'));
        retainedRouteBytes = await readFile(path.join(root, 'artifacts/header-dark-2026-10-15/impact.json'));
        mobileOracleBytes = await readFile(path.join(root, 'testbed/header-drawer-body-contract.mjs'));
        assertRetainedMobileReuse({ profileId, unitBytes: retainedUnitBytes,
            fullMobileBytes: await readFile(path.join(root, files.fullMobile)), currentBinding,
            routeBytes: retainedRouteBytes, mobileOracleBytes });
    }
    const bytes = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([key, relative]) =>
        [key, await readFile(path.join(root, relative))])));
    const { spawnSync } = await import('node:child_process');
    const archResult = spawnSync(process.execPath, ['tools/inspect-live-architecture.mjs', '--surface', 'header-navigation'],
        { cwd: root, encoding: 'utf8', shell: false });
    check(archResult.status === 0, 'effective architecture inspection failed');
    const classifierBytes = await readFile(scriptPath);
    const probeScriptBytes = await readFile(path.join(root, 'tools/probe-palette-owner-lifecycle.mjs'));
    const probe = await probePaletteOwnerLifecycle();
    for (const [key, relative] of Object.entries(files)) {
        check(sha(await readFile(path.join(root, relative))) === sha(bytes[key]),
            `palette input changed during lifecycle probe: ${key}`);
    }
    if (profileId === 'header-6b8b') check(sha(await readFile(path.join(root, 'testbed/header-drawer-body-contract.mjs'))) === sha(mobileOracleBytes),
        'retained full-mobile oracle changed during lifecycle probe');
    check(sha(await readFile(scriptPath)) === sha(classifierBytes)
        && sha(await readFile(path.join(root, 'tools/probe-palette-owner-lifecycle.mjs'))) === sha(probeScriptBytes),
    'classifier or lifecycle observer changed during probe');
    check(isDeepStrictEqual(await createEvidenceBinding(root), currentBinding),
        'evidence binding changed during lifecycle probe');
    return { profileId, retainedUnitBytes, retainedRouteBytes, mobileOracleBytes, report: JSON.parse(bytes.report), reportBytes: bytes.report,
        controlSideBytes: bytes.controlSide, candidateSideBytes: bytes.candidateSide,
        controlBytes: bytes.control, candidateBytes: bytes.candidate, observerBytes: bytes.observer,
        fullMobile: JSON.parse(bytes.fullMobile), fullMobileBytes: bytes.fullMobile,
        surfaceManifest: JSON.parse(bytes.surfaceManifest), surfaceManifestBytes: bytes.surfaceManifest,
        deltas: JSON.parse(bytes.deltas), deltasBytes: bytes.deltas,
        baselineBytes: bytes.baseline,
        architecture: JSON.parse(archResult.stdout), classifierBytes, probeScriptBytes,
        probe,
        currentBinding, files };
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
    try {
        const at = process.argv.indexOf('--profile');
        const profileId = at < 0 ? (process.argv.includes('--current') ? 'header-6869' : 'historical') : process.argv[at + 1];
        check(profileId && !profileId.startsWith('--'), 'missing exact-artifact profile');
        const result = classifyPaletteOwnerSplit(await readCurrentInputs(profileId));
        if (process.argv.includes('--output')) {
            const requested = process.argv[process.argv.indexOf('--output') + 1];
            check(requested && !requested.startsWith('--'), 'missing classification output');
            const output = path.resolve(root, requested);
            check(output.startsWith(path.join(root, 'testbed/artifacts') + path.sep), 'classification output must stay in testbed/artifacts');
            await mkdir(path.dirname(output), { recursive: true });
            await writeFile(output, JSON.stringify(result, null, 2) + '\n');
        }
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error(`Palette owner classification BLOCKED: ${error.message}`);
        process.exitCode = 1;
    }
}
