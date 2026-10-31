import assert from 'node:assert/strict';
import { readCurrentInputs, verifyViewTimerPhase } from './verify-view-timer-phase.mjs';

const input = await readCurrentInputs();
const positive = verifyViewTimerPhase(input);
assert.equal(positive.status, 'REPRODUCED_COUNTS_WITH_RECOVERY_PHASE_DIVERGENCE');
assert.equal(positive.originalTimerFieldsStatus, 'UNCLASSIFIED_ORIGINAL_SNAPSHOTS');
assert.equal(positive.cases, 6);

let rejected = 0;
function rejects(name, mutate, reason) {
    const changed = structuredClone(input);
    mutate(changed);
    assert.throws(() => verifyViewTimerPhase(changed), reason, name);
    rejected += 1;
}

rejects('raw bytes stale', (next) => { next.rawSha256 = 'STALE'; }, /raw report binding changed/);
rejects('observer stale', (next) => { next.report.observerSha256 = 'STALE'; }, /probe or raw observer binding changed/);
rejects('probe source stale', (next) => { next.report.probeScriptSha256 = 'STALE'; }, /probe or raw observer binding changed/);
rejects('candidate bytes stale', (next) => { next.exactArtifacts.candidate = 'STALE'; }, /exact mobile artifacts changed/);
rejects('browser changed', (next) => { next.report.browser = 'STALE'; }, /browser binding changed/);
rejects('harness binding stale', (next) => { next.report.evidenceBinding.harnessSha256 = 'STALE'; }, /evidence binding changed/);
rejects('false original classification', (next) => {
    next.report.originalTimerFieldsStatus = 'CLASSIFIED';
}, /raw or reobservation disposition changed/);
rejects('altered original timer field', (next) => {
    next.raw.resourceDifferences.find((item) => item.target === 'mobile' && item.field === 'resource.value.timers').candidate = 5;
}, /raw six timer fields changed/);
rejects('missing scenario', (next) => { next.report.sides.control.pop(); }, /missing or reordered scenarios/);
rejects('recovery outcome changed', (next) => {
    next.report.sides.candidate[0].samples.before.value.recovery.status = 'completed';
}, /explicit recovery outcome changed/);
rejects('recovery reason changed', (next) => {
    next.report.sides.candidate[0].samples.before.value.recovery.detail.verifyReason = 'ready';
}, /recovery reason changed/);
rejects('bus absent', (next) => {
    next.report.sides.candidate[0].samples.before.value.busPresent = false;
}, /phase gate or recovery terminal state changed/);
rejects('phase reordered', (next) => {
    next.report.sides.control[0].samples.after.value.observedAtMs = 0;
}, /phase time order changed/);
rejects('active timer omitted', (next) => {
    next.report.sides.control[0].samples.before.value.active.pop();
}, /active timer count changed/);
rejects('host hidden first row lost', (next) => {
    next.report.sides.candidate[0].samples.before.value.embeddedList.firstOriginalHostHidden = false;
}, /hidden-first-row or visible-list control changed/);
rejects('visible ordinary rows lost', (next) => {
    next.report.sides.candidate[0].samples.before.value.embeddedList.positiveAreaItemCount = 0;
}, /hidden-first-row or visible-list control changed/);
rejects('timer owner corrupted', (next) => {
    next.report.sides.control[0].timerEvents.find((event) =>
        event.type === 'scheduled' && event.owner === 'article-ad-cleanup').owner = 'unattributed-source-site';
}, /article-ad fallback schedule\/completion changed/);
rejects('timer delay corrupted', (next) => {
    next.report.sides.control[0].timerEvents.find((event) =>
        event.type === 'scheduled' && event.owner === 'article-ad-cleanup').delay = 777;
}, /timer provenance or delay changed/);
rejects('fallback completion missing', (next) => {
    const events = next.report.sides.candidate[0].timerEvents;
    const id = events.find((event) => event.type === 'scheduled'
        && event.owner === 'article-ad-cleanup' && event.delay === 5000).id;
    events.splice(events.findIndex((event) => event.type === 'completed' && event.id === id), 1);
}, /timer left without completion or clear/);
rejects('event chronology changed', (next) => {
    next.report.sides.control[0].timerEvents[1].scheduledAtMs = -1;
}, /timer event order changed/);
rejects('positive filter action lost', (next) => {
    const sample = next.report.sides.candidate[0].samples.after.value;
    sample.filterPassCount = next.report.sides.candidate[0].samples.before.value.filterPassCount;
}, /positive filter pass missing/);
rejects('safe comment hidden', (next) => {
    next.report.sides.candidate[0].samples.after.value.comment.visible = false;
}, /positive visibility changed/);
rejects('GM value changed', (next) => {
    next.report.sides.candidate[0].samples.after.value.gm.values.dcinside_threshold = 999;
}, /GM or filter effect changed/);
rejects('UID request inserted', (next) => {
    next.report.sides.candidate[0].samples.after.uidRequests.push({ uid: 'unexpected' });
}, /UID network effect changed/);
rejects('terminal timer leak', (next) => {
    next.report.sides.candidate[0].samples.terminal.value.timers = 1;
}, /active timer count changed/);
rejects('fallback effect absent', (next) => {
    next.report.sides.candidate[0].samples.terminal.value.articleAdScans = 0;
}, /terminal retry\/resource state changed/);

console.log(`View timer phase: positive accepted; ${rejected} negative controls rejected`);
