import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { createEvidenceBinding, digestEvidenceBytes } from './evidence-binding.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = path.join(root, 'testbed/artifacts/view-timer-phase-reobservation.json');
const rawPath = path.join(root, 'testbed/artifacts/final-shared-filter-storage-C84-1A7.json');
const probePath = path.join(root, 'tools/reobserve-view-timer-phase.mjs');
const observerPath = path.join(root, 'testbed/run-shared-filter-storage-differential.mjs');
const paths = {
    control: path.join(root, 'testbed/artifacts/baseline-mobile-stable.user.js'),
    candidate: path.join(root, 'testbed/artifacts/runtime-under-test.user.js'),
};
const exactHashes = {
    control: '32BA208DDD9973A7EEC343F01E963A833AB4F0C084987077EDAE46844383C25D',
    candidate: 'C84AD9220A060CC3AF91F3039F07B13FAD75521DA63201046E3693F875DC03C7',
};
const rawSha256 = 'B7D18ED62CB84144424E082AC6AD3BE5B9C4B322828590D0EBC758E42EA1DEFF';
const scenarioIds = ['threshold-zero', 'master-disabled', 'personal-block-positive'];
const adDelays = [120, 420, 1100, 2500, 5000];
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const check = (ok, message) => { if (!ok) throw new Error(message); };

export async function readCurrentInputs() {
    const [reportBytes, rawBytes, probeBytes, observerBytes, controlBytes, candidateBytes, evidenceBinding] = await Promise.all([
        readFile(reportPath), readFile(rawPath), readFile(probePath), readFile(observerPath),
        readFile(paths.control), readFile(paths.candidate), createEvidenceBinding(root),
    ]);
    return {
        report: JSON.parse(reportBytes), raw: JSON.parse(rawBytes),
        rawSha256: sha(rawBytes), probeScriptSha256: sha(probeBytes),
        observerSha256: digestEvidenceBytes('testbed/run-shared-filter-storage-differential.mjs', observerBytes).toUpperCase(),
        exactArtifacts: { control: sha(controlBytes), candidate: sha(candidateBytes) }, evidenceBinding,
    };
}

function validateTrace(caseResult, role) {
    const { caseId, samples, timerEvents } = caseResult;
    check(samples?.before?.step === 'before-insertion' && samples.after?.step === 'after-insertion'
        && samples.terminal?.step === 'terminal-settled', `${role}/${caseId}: phase names or order changed`);
    const phases = [samples.before, samples.after, samples.terminal];
    check(phases.every((sample) => sample.caseId === caseId), `${role}/${caseId}: case identity changed`);
    const times = phases.map((sample) => sample.value.observedAtMs);
    check(times[0] < times[1] && times[1] < times[2], `${role}/${caseId}: phase time order changed`);
    check(Array.isArray(timerEvents) && timerEvents.length > 0, `${role}/${caseId}: timer history missing`);
    const schedule = new Map();
    const end = new Map();
    let previousAt = -1;
    for (const event of timerEvents) {
        const at = event.type === 'scheduled' ? event.scheduledAtMs : event.atMs;
        check(Number.isFinite(at) && at >= previousAt, `${role}/${caseId}: timer event order changed`);
        previousAt = at;
        if (event.type === 'scheduled') {
            check(Number.isInteger(event.id) && event.id > 0 && !schedule.has(event.id),
                `${role}/${caseId}: duplicate or invalid timer ID`);
            check(Number.isFinite(event.delay) && event.delay >= 0
                && Math.abs(event.dueAtMs - (at + event.delay)) < 0.01
                && typeof event.stack === 'string' && event.stack.includes('timer scheduled'),
            `${role}/${caseId}: timer provenance or delay changed`);
            schedule.set(event.id, event);
        } else {
            check(['completed', 'cleared-timeout', 'cleared-interval'].includes(event.type)
                && schedule.has(event.id) && !end.has(event.id)
                && event.atMs >= schedule.get(event.id).scheduledAtMs,
            `${role}/${caseId}: timer completion/clear history changed`);
            end.set(event.id, event);
        }
    }
    check(schedule.size === end.size, `${role}/${caseId}: timer left without completion or clear`);
    const ads = [...schedule.values()].filter((event) => event.owner === 'article-ad-cleanup');
    check(isDeepStrictEqual(ads.map((event) => event.delay), adDelays)
        && ads.every((event) => event.stack.includes('bindArticleAdCleanup')
            && end.get(event.id)?.type === 'completed'),
    `${role}/${caseId}: article-ad fallback schedule/completion changed`);
    for (const phase of phases) {
        const { value } = phase;
        check(value.uiReady === true && value.busPresent === true
            && value.recoverySubscriberPresent === false && value.recovery?.active === false,
        `${role}/${caseId}: phase gate or recovery terminal state changed`);
        check(value.timers === value.active?.length && value.frames >= 0 && value.intervals >= 0,
            `${role}/${caseId}: active timer count changed`);
        const list = value.embeddedList;
        check(list?.itemCount === 51 && list.firstOriginalHostHidden === true
            && list.firstOriginalDisplay === 'none' && list.firstDisplay === 'none'
            && list.visibleItemCount === 49 && list.positiveAreaItemCount === 49,
        `${role}/${caseId}: hidden-first-row or visible-list control changed`);
        const pending = value.pending;
        check(pending && pending.mutations === 0 && pending.mutationRaf === false
            && pending.mutationTimer === false && pending.taskQueues === 0,
        `${role}/${caseId}: pending work at sample`);
        const activeAtPhase = [...schedule.values()].filter((event) =>
            event.scheduledAtMs <= value.observedAtMs
            && (!end.has(event.id) || end.get(event.id).atMs > value.observedAtMs));
        check(isDeepStrictEqual(value.active.map((item) => item.id).sort((a, b) => a - b),
            activeAtPhase.map((item) => item.id).sort((a, b) => a - b)),
        `${role}/${caseId}: active IDs disagree with timer history`);
        for (const item of value.active) {
            const scheduled = schedule.get(item.id);
            check(scheduled && item.owner === scheduled.owner && item.delay === scheduled.delay
                && Math.abs(item.scheduledAtMs - scheduled.scheduledAtMs) < 0.01
                && Math.abs(item.ageMs - (value.observedAtMs - scheduled.scheduledAtMs)) < 0.01,
            `${role}/${caseId}: active timer owner/age changed`);
        }
        check(value.traceEventCount === timerEvents.filter((event) =>
            (event.type === 'scheduled' ? event.scheduledAtMs : event.atMs) <= value.observedAtMs).length,
        `${role}/${caseId}: phase event cursor changed`);
        check(value.errors?.length === 0 && phase.consoleErrors?.length === 0,
            `${role}/${caseId}: runtime/console error`);
    }
    check(samples.terminal.value.timers === 0 && samples.terminal.value.frames === 0
        && samples.terminal.value.intervals === 0 && samples.terminal.value.articleAdScans >= 3
        && samples.terminal.value.traceEventCount === timerEvents.length,
    `${role}/${caseId}: terminal retry/resource state changed`);
    check(samples.after.value.filterPassCount > samples.before.value.filterPassCount,
        `${role}/${caseId}: positive filter pass missing`);
    check(samples.after.value.comment?.text === 'Synthetic filter observation'
        && samples.after.value.comment.visible === (caseId !== 'personal-block-positive'),
    `${role}/${caseId}: positive visibility changed`);
    check(samples.after.uidRequests.length === 0
        && !samples.after.value.xhrRequests.some((item) => item.path === '/api/gallog_user_layer/gallog_content_reple/'),
    `${role}/${caseId}: UID network effect changed`);
    return { before: samples.before.value, after: samples.after.value, terminal: samples.terminal.value };
}

export function verifyViewTimerPhase(input) {
    const { report, raw } = input;
    check(input.rawSha256 === rawSha256 && report.rawReportSha256 === input.rawSha256,
        'raw report binding changed');
    check(report.probeScriptSha256 === input.probeScriptSha256
        && report.observerSha256 === input.observerSha256
        && raw.observerSha256 === input.observerSha256,
    'probe or raw observer binding changed');
    check(isDeepStrictEqual(report.evidenceBinding, input.evidenceBinding)
        && isDeepStrictEqual(raw.evidenceBinding, input.evidenceBinding),
    'evidence binding changed');
    check(isDeepStrictEqual(report.exactArtifacts, exactHashes)
        && isDeepStrictEqual(input.exactArtifacts, exactHashes)
        && isDeepStrictEqual(raw.exactArtifacts.mobile, exactHashes),
    'exact mobile artifacts changed');
    check(report.browser === raw.sideEvidence.mobile.control.browser
        && report.browser === raw.sideEvidence.mobile.candidate.browser,
    'browser binding changed');
    check(report.schemaVersion === 1 && report.kind === 'view-timer-phase-reobservation'
        && report.rawStatus === 'DIFFERENT_UNCLASSIFIED'
        && report.originalTimerFieldsStatus === 'UNCLASSIFIED_ORIGINAL_SNAPSHOTS'
        && raw.resourceStatus === 'DIFFERENT_UNCLASSIFIED'
        && raw.functionalStatus === 'MATCHED_IN_COVERED_STATES'
        && raw.finalFeatureStatus === 'UNKNOWN',
    'raw or reobservation disposition changed');
    check(isDeepStrictEqual(report.scenarios.map((scenario) => scenario.id), scenarioIds),
        'scenario applicability changed');
    check(raw.resourceDifferences.length === 48 && raw.functionalDifferences.length === 0
        && raw.positiveFailures.length === 0,
    'raw functional/resource field scope changed');
    const rawTimers = raw.resourceDifferences.filter((item) => item.target === 'mobile'
        && item.field === 'resource.value.timers');
    check(rawTimers.length === 6 && rawTimers.every((item) => item.control === 7 && item.candidate === 4),
        'raw six timer fields changed');
    const recoveryStatus = { control: 'completed', candidate: 'timeout' };
    for (const role of ['control', 'candidate']) {
        const cases = report.sides?.[role];
        check(Array.isArray(cases) && isDeepStrictEqual(cases.map((entry) => entry.caseId), scenarioIds),
            `${role}: missing or reordered scenarios`);
        for (const entry of cases) {
            const { before, after, terminal } = validateTrace(entry, role);
            const rawBefore = raw.sides.mobile[role].observations.find((item) =>
                item.caseId === entry.caseId && item.step === 'before-insertion');
            const rawAfter = raw.sides.mobile[role].observations.find((item) =>
                item.caseId === entry.caseId && item.step === 'after-insertion');
            check(rawBefore && rawAfter && before.timers === rawBefore.value.runtime.resources.timers
                && after.timers === rawAfter.value.runtime.resources.timers,
            `${role}/${entry.caseId}: raw-gate timer count did not reproduce`);
            check([before, after, terminal].every((value) => value.recovery.status === recoveryStatus[role]),
                `${role}/${entry.caseId}: explicit recovery outcome changed`);
            check(role === 'control'
                ? before.recovery.ready === true && before.recovery.reason === 'ready'
                : before.recovery.ready === false && before.recovery.reason === 'waiting-style'
                    && before.recovery.detail?.verifyReason === 'hidden-list-surface',
            `${role}/${entry.caseId}: recovery reason changed`);
            check(isDeepStrictEqual(after.gm.values, rawAfter.value.gm.values)
                && isDeepStrictEqual(after.gm.writes.map(({ key, value }) => ({ key, value })),
                    rawAfter.value.gm.writes.map(({ key, value }) => ({ key, value })))
                && after.comment.visible === rawAfter.value.comment.contentVisible,
            `${role}/${entry.caseId}: GM or filter effect changed`);
        }
    }
    return {
        status: 'REPRODUCED_COUNTS_WITH_RECOVERY_PHASE_DIVERGENCE',
        originalTimerFieldsStatus: 'UNCLASSIFIED_ORIGINAL_SNAPSHOTS',
        cases: 6,
        articleAdRetriesCompletedPerCase: 5,
        terminalActiveTimersPerCase: 0,
    };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        const result = verifyViewTimerPhase(await readCurrentInputs());
        console.log(`View timer phase: ${result.status}; ${result.cases} cases; original fields ${result.originalTimerFieldsStatus}`);
    } catch (error) {
        console.error(`View timer phase BLOCKED: ${error.message}`);
        process.exitCode = 1;
    }
}
