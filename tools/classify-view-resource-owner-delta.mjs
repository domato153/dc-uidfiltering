import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { createEvidenceBinding, digestEvidenceBytes } from './evidence-binding.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), '..');
const outputPath = path.join(root, 'testbed/artifacts/view-resource-owner-classification-0C30.json');
const REPORT_SHA = 'BC22D517AAB269C02408B7B01D3A4950C8C99A7F3A19DF4B2C75E2FC8811FB6C';
const CONTROL_SHA = '32BA208DDD9973A7EEC343F01E963A833AB4F0C084987077EDAE46844383C25D';
const CANDIDATE_SHA = '0C3076699E696AD3C252B5DF21D216F9B6EA32928B4C8A7C160DE0888926450A';
const ADDED_OWNERS = [
    'ui-article-surface', 'ui-comment-surface', 'header-shell-style',
    'gallery-page-head-style', 'header-gnb-style', 'header-recent-visit-navigation',
];
const BASE_OWNERS = [
    'runtime-article-ad-cleanup', 'filter-universal-observer', 'ui-list-runtime',
    'comment-typography', 'reply-merge', 'image-comment-nick-sync', 'image-comment-width',
    'user-popup-layer', 'list-memo-popup',
];
const BASE_IMMEDIATE_OWNERS = ['filter-immediate-comment-visibility', 'ui-view-bottom-list-visibility'];
const COMMENT_IMMEDIATE_OWNER = 'ui-comment-surface-state';
const STEPS = ['threshold-zero/before-insertion', 'threshold-zero/after-insertion',
    'master-disabled/before-insertion', 'master-disabled/after-insertion',
    'personal-block-positive/before-insertion', 'personal-block-positive/after-insertion'];
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const check = (condition, message) => { if (!condition) throw new Error(message); };
const sorted = (values) => [...values].sort();
const articleAdFallbackBlock = (bytes) => {
    const source = bytes.toString('utf8');
    const start = source.indexOf('    const bindArticleAdCleanup = () => {');
    const end = source.indexOf('    injectStyle();', start);
    check(start >= 0 && end > start, 'article ad fallback source missing');
    return source.slice(start, end);
};

function checkSettled(phase, label) {
    check(phase.timers === 0 && phase.frames === 0 && phase.intervals === 0
        && phase.pendingMutations === 0 && phase.pendingMutationRaf === false
        && phase.pendingMutationTimer === false && phase.taskQueues === 0
        && isDeepStrictEqual(phase.errors, []), `${label}: resources did not settle`);
}

function checkLifecycle(probe) {
    check(probe?.schemaVersion === 1 && probe.kind === 'view-resource-owner-lifecycle-probe', 'wrong lifecycle probe');
    check(probe.browser === probe.sides.control.browser && probe.browser === probe.sides.candidate.browser,
        'probe browser versions differ');
    for (const role of ['control', 'candidate']) {
        const side = probe.sides[role];
        check(side.artifactSha256 === (role === 'control' ? CONTROL_SHA : CANDIDATE_SHA), `${role}: probe artifact changed`);
        check(isDeepStrictEqual(side.startup.errors, []) && isDeepStrictEqual(side.consoleErrors, []), `${role}: runtime error`);
        check(side.lateAd.removed === true && side.lateAd.removalDelta >= 1 && side.lateAd.subscriber === true,
            `${role}: late ad cleanup path failed`);
    }
    for (const role of ['control', 'candidate']) {
        const startup = probe.sides[role].startup;
        check(startup.observedAtMs > 0 && Number.isInteger(startup.timeoutScheduled)
            && Number.isInteger(startup.timeoutCompleted) && Number.isInteger(startup.timeoutCleared)
            && startup.timers.every(({ delay, scheduledAtMs, owner, stack }) =>
                Number.isFinite(delay) && Number.isFinite(scheduledAtMs) && scheduledAtMs <= startup.observedAtMs
                && ['runtime-article-ad-cleanup', 'other-runtime'].includes(owner)
                && typeof stack === 'string' && stack.includes('setTimeout scheduled')),
        `${role}: timer provenance snapshot changed`);
    }
    check(isDeepStrictEqual(probe.sides.control.startup.subscribers, BASE_OWNERS), 'control subscriber owners changed');
    check(isDeepStrictEqual(sorted(probe.sides.candidate.startup.subscribers), sorted([...BASE_OWNERS, ...ADDED_OWNERS])),
        'candidate startup subscriber owners changed');

    const phases = probe.sides.candidate.lifecycle;
    for (const name of ['settled', 'reconnected', 'repeated']) {
        const phase = phases[name];
        check(isDeepStrictEqual(phase.ownerKeys, ADDED_OWNERS), `${name}: owner set changed`);
        check(isDeepStrictEqual(sorted(phase.allSubscriberKeys), sorted([...BASE_OWNERS, ...ADDED_OWNERS])),
            `${name}: subscriber map changed`);
        check(new Set(phase.allSubscriberKeys).size === phase.allSubscriberKeys.length, `${name}: duplicate subscriber`);
        check(isDeepStrictEqual(sorted(phase.immediateSubscriberKeys),
            sorted([...BASE_IMMEDIATE_OWNERS, COMMENT_IMMEDIATE_OWNER])),
        `${name}: immediate subscriber ownership changed`);
        check(Object.values(phase.styleCounts).every((count) => count === 1), `${name}: style owner count changed`);
        check(phase.adapterResources.article.activeRoots === 1 && phase.adapterResources.comment.activeRoots === 2,
            `${name}: article/comment roots changed`);
        check(['headerShell', 'pageHead', 'gnb', 'recent'].every((key) => (
            phase.adapterResources[key].mutationSubscribers === 1 && phase.adapterResources[key].activeRoots === 0
        )), `${name}: header owner resources changed`);
        checkSettled(phase, name);
    }
    check(phases.disposed.ownerKeys.length === 0
        && isDeepStrictEqual(sorted(phases.disposed.allSubscriberKeys), sorted(BASE_OWNERS))
        && isDeepStrictEqual(sorted(phases.disposed.immediateSubscriberKeys), sorted(BASE_IMMEDIATE_OWNERS))
        && Object.values(phases.disposed.styleCounts).every((count) => count === 0),
    'disposed: owners or styles survived');
    check(probe.sides.candidate.lifecycle.repeatedRetainedSubscriberIdentity === true,
        'repeated connect replaced a subscriber');
    check(phases.disposed.adapterResources.article.activeRoots === 0
        && phases.disposed.adapterResources.comment.activeRoots === 0
        && ['headerShell', 'pageHead', 'gnb', 'recent'].every((key) => (
            phases.disposed.adapterResources[key].mutationSubscribers === 0
            && phases.disposed.adapterResources[key].activeRoots === 0
        )), 'disposed: adapter resources survived');
    checkSettled(phases.disposed, 'disposed');
    check(phases.settled.activeObservers === phases.disposed.activeObservers
        && phases.settled.activeObservers === phases.reconnected.activeObservers
        && phases.reconnected.activeObservers === phases.repeated.activeObservers,
    'owner lifecycle changed observer count');
    check(phases.settled.activeListeners > phases.disposed.activeListeners
        && phases.settled.activeListeners === phases.reconnected.activeListeners
        && phases.reconnected.activeListeners === phases.repeated.activeListeners,
    'owner lifecycle leaked or duplicated listeners');

    const replacement = probe.sides.candidate.replacement;
    check(isDeepStrictEqual(replacement.ownerKeys, ADDED_OWNERS) && replacement.duplicateSubscribers === false,
        'root replacement changed owner set');
    check(isDeepStrictEqual(sorted(replacement.immediateSubscriberKeys),
        sorted([...BASE_IMMEDIATE_OWNERS, COMMENT_IMMEDIATE_OWNER])),
    'root replacement changed immediate owner set');
    check(Object.values(replacement.styleCounts).every((count) => count === 1)
        && replacement.articleResources.activeRoots === 1 && replacement.commentResources.activeRoots === 2
        && replacement.detachedArticleClean === true && replacement.detachedCommentsClean === true,
    'root replacement ownership or detached cleanup failed');
    check(replacement.timers === 0 && replacement.frames === 0 && replacement.intervals === 0
        && replacement.pendingMutations === 0 && replacement.taskQueues === 0
        && replacement.activeObservers === phases.settled.activeObservers
        && replacement.activeListeners === phases.settled.activeListeners
        && isDeepStrictEqual(replacement.errors, []), 'root replacement grew resources');
    const positive = probe.sides.candidate.positiveFilter;
    check(positive.sourceVisible === true && positive.hidden === true && positive.filterPassDelta > 0
        && positive.values.masterDisabled === false && positive.values.threshold === 0
        && positive.values.personalEnabled === true
        && isDeepStrictEqual(positive.values.personalList.uids, [{ id: 'blocked-view-owner', name: 'Blocked view owner' }])
        && isDeepStrictEqual(positive.seededWrites, []) && isDeepStrictEqual(positive.uidRequests, [])
        && isDeepStrictEqual(positive.errors, []), 'positive filter/GM/network path changed');
}

export function classifyViewResourceOwnerDelta(input) {
    const { report, reportBytes, controlBytes, candidateBytes, observerBytes, currentBinding,
        architectureArticle, architectureComments, architectureHeader, probe, probeBytes, probeScriptBytes,
        classifierBytes } = input;
    check(sha(reportBytes) === REPORT_SHA && isDeepStrictEqual(JSON.parse(reportBytes), report), 'raw report changed');
    check(sha(controlBytes) === CONTROL_SHA && sha(candidateBytes) === CANDIDATE_SHA, 'control/candidate bytes changed');
    const fallbackBlock = articleAdFallbackBlock(controlBytes);
    check(articleAdFallbackBlock(candidateBytes) === fallbackBlock
        && fallbackBlock.includes('[120, 420, 1100, 2500, 5000]'),
    'article ad fallback scheduling differs between artifacts');
    check(report?.kind === 'observed-shared-filter-storage-differential'
        && report.exactArtifacts.mobile.control === CONTROL_SHA
        && report.exactArtifacts.mobile.candidate === CANDIDATE_SHA, 'wrong exact mobile report');
    check(report.observerSha256 === digestEvidenceBytes('testbed/run-shared-filter-storage-differential.mjs', observerBytes).toUpperCase(),
        'shared observer changed after raw report');
    check(isDeepStrictEqual(report.evidenceBinding, currentBinding), 'raw report evidence binding is stale');
    check(isDeepStrictEqual(JSON.parse(probeBytes), probe), 'lifecycle probe bytes/object mismatch');
    check(probe.probeScriptSha256 === sha(probeScriptBytes)
        && isDeepStrictEqual(probe.evidenceBinding, currentBinding),
    'lifecycle probe source or evidence binding is stale');
    check(report.functionalStatus === 'MATCHED_IN_COVERED_STATES' && report.resourceStatus === 'DIFFERENT_UNCLASSIFIED'
        && report.finalFeatureStatus === 'UNKNOWN' && report.functionalDifferences.length === 0
        && report.positiveFailures.length === 0 && report.rawDifferences.length === 12,
    'raw functional/resource status changed');
    for (const role of ['control', 'candidate']) {
        check(isDeepStrictEqual(report.sides.mobile[role].observations.map(({ caseId, step }) => `${caseId}/${step}`), STEPS),
            `${role}: six-step applicability changed`);
        check(report.sides.mobile[role].observations.every(({ value }) => value.runtime.recovery?.status === 'completed'
            && value.runtime.recovery?.ready === true && value.runtime.recovery?.reason === 'ready'
            && value.runtime.recovery?.active === false), `${role}: recovery did not complete ready`);
    }
    check(report.resourceDifferences.length === 42, 'resource difference count changed');
    for (const step of STEPS) {
        const [caseId, stepName] = step.split('/');
        const fields = report.resourceDifferences.filter((entry) => entry.target === 'mobile'
            && entry.caseId === caseId && entry.step === stepName);
        check(fields.length === 7, `${step}: resource field count changed`);
        check(['control', 'candidate'].every((role) => report.sides.mobile[role].observations
            .find((entry) => entry.caseId === caseId && entry.step === stepName)?.value.runtime.resources.timers === 7),
        `${step}: settled-gate timer count changed`);
        check(fields.some((entry) => entry.field === 'resource.value.subscriberCount' && entry.control === 9 && entry.candidate === 15),
            `${step}: subscriber count changed`);
        check(isDeepStrictEqual(sorted(fields.filter((entry) => entry.field.startsWith('resource.value.subscriberKeys.'))
            .map((entry) => entry.field.slice('resource.value.subscriberKeys.'.length))), sorted(ADDED_OWNERS)),
        `${step}: owner field transition changed`);
    }
    for (const architecture of [architectureArticle, architectureComments, architectureHeader]) {
        check(architecture.scope === 'repository-source-and-build-only' && architecture.findings.length === 0,
            'effective architecture has findings');
    }
    const article = architectureArticle.surfaces.find(({ id }) => id === 'article-recommendation');
    const comments = architectureComments.surfaces.find(({ id }) => id === 'comments-replies');
    const header = architectureHeader.surfaces.find(({ id }) => id === 'header-navigation');
    check(article?.adapter === 'mobile-article-host-adapter' && comments?.adapter === 'mobile-comment-host-adapter',
        'view adapter ownership changed');
    check(['dcuf-header-shell-style', 'dcuf-gallery-page-head-style', 'dcuf-header-gnb-style',
        'dcuf-header-recent-visit-style'].every((id) => header?.styles.some((style) => style.id === id)),
    'header style ownership changed');
    checkLifecycle(probe);
    return {
        schemaVersion: 1,
        kind: 'view-resource-owner-delta-classification',
        rawStatus: 'DIFFERENT_UNCLASSIFIED',
        classificationStatus: 'DECLARED_VIEW_SUBSCRIBERS_ONLY',
        finalFeatureStatus: 'UNKNOWN',
        controlSha256: CONTROL_SHA,
        candidateSha256: CANDIDATE_SHA,
        rawReportSha256: sha(reportBytes),
        observerSha256: sha(observerBytes),
        classifierSha256: sha(classifierBytes),
        lifecycleProbeSha256: sha(probeBytes),
        lifecycleProbeScriptSha256: sha(probeScriptBytes),
        evidenceBinding: currentBinding,
        applicability: STEPS,
        classifiedFields: report.resourceDifferences
            .map(({ target, caseId, step, field, control, candidate }) => (
            { target, caseId, step, field, control, candidate }
        )),
        unclassifiedFields: [],
        addedOwners: ADDED_OWNERS,
        timerEvidence: {
            observedRawCounts: { control: 7, candidate: 7 },
            identicalArticleAdFallbackSourceSha256: sha(Buffer.from(fallbackBlock)),
            probeStartup: Object.fromEntries(['control', 'candidate'].map((role) => [role, {
                observedAtMs: probe.sides[role].startup.observedAtMs,
                timeoutScheduled: probe.sides[role].startup.timeoutScheduled,
                timeoutCompleted: probe.sides[role].startup.timeoutCompleted,
                timeoutCleared: probe.sides[role].startup.timeoutCleared,
                activeTimers: probe.sides[role].startup.timers.map(({ delay, scheduledAtMs, owner }) =>
                    ({ delay, scheduledAtMs, owner })),
            }])),
            settledTimers: 0,
            lateMutationCleanup: 'PASS',
            status: 'MATCHED_AT_CURRENT_GATE',
            reason: 'The repaired candidate matches six current scalar counts at the raw gate. This does not identify the six pending timer sets in the earlier C84 report.',
        },
        lifecycle: {
            disposalReconnectRepeat: 'PASS',
            wholeRootReplacement: 'PASS',
            positiveFilterGmNetwork: 'PASS',
            duplicateOrGrowth: 'NONE_OBSERVED',
        },
        limitations: [
            'The raw shared report remains DIFFERENT_UNCLASSIFIED and is not rewritten.',
            'Only the exact 42 subscriber fields differ and are classified; the six current timer counts match, while six historical C84 timer differences remain unclassified.',
            'Other filter/storage states, actual-extension Canary, full feature inventory, and final assurance remain UNKNOWN.',
        ],
    };
}

async function inspect(surface) {
    const { spawnSync } = await import('node:child_process');
    const result = spawnSync(process.execPath, ['tools/inspect-live-architecture.mjs', '--surface', surface],
        { cwd: root, encoding: 'utf8', shell: false });
    check(result.status === 0, `${surface}: effective architecture inspection failed`);
    return JSON.parse(result.stdout);
}

export async function readCurrentInputs() {
    const files = {
        report: 'testbed/artifacts/final-shared-filter-storage-0C30-1A7.json',
        control: 'testbed/artifacts/baseline-mobile-stable.user.js',
        candidate: 'testbed/artifacts/runtime-under-test.user.js',
        observer: 'testbed/run-shared-filter-storage-differential.mjs',
        probe: 'testbed/artifacts/view-resource-owner-lifecycle-0C30.json',
        probeScript: 'tools/probe-view-resource-owner-lifecycle.mjs',
    };
    const bytes = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([key, relative]) => (
        [key, await readFile(path.join(root, relative))]
    ))));
    return {
        report: JSON.parse(bytes.report),
        reportBytes: bytes.report,
        controlBytes: bytes.control,
        candidateBytes: bytes.candidate,
        observerBytes: bytes.observer,
        currentBinding: await createEvidenceBinding(root),
        architectureArticle: await inspect('article-recommendation'),
        architectureComments: await inspect('comments-replies'),
        architectureHeader: await inspect('header-navigation'),
        probe: JSON.parse(bytes.probe),
        probeBytes: bytes.probe,
        probeScriptBytes: bytes.probeScript,
        classifierBytes: await readFile(scriptPath),
        files,
    };
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
    try {
        const result = classifyViewResourceOwnerDelta(await readCurrentInputs());
        await mkdir(path.dirname(outputPath), { recursive: true });
        await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
        console.log(`View resource owner classification: ${result.classificationStatus}`);
        console.log(`Report: ${outputPath}`);
    } catch (error) {
        console.error(`View resource owner classification BLOCKED: ${error.message}`);
        process.exitCode = 1;
    }
}
