import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { classifyViewResourceOwnerDelta, readCurrentInputs } from './classify-view-resource-owner-delta.mjs';

const clone = (value) => JSON.parse(JSON.stringify(value));
const input = await readCurrentInputs();
const positive = classifyViewResourceOwnerDelta(input);
assert.equal(positive.classificationStatus, 'DECLARED_VIEW_SUBSCRIBERS_ONLY');
assert.equal(positive.classifiedFields.length, 42);
assert.equal(positive.unclassifiedFields.length, 0);
assert.equal(positive.timerEvidence.status, 'MATCHED_AT_CURRENT_GATE');
let rejected = 0;

function rebuild(mutator) {
    const next = {
        ...input,
        report: clone(input.report),
        currentBinding: clone(input.currentBinding),
        architectureArticle: clone(input.architectureArticle),
        architectureComments: clone(input.architectureComments),
        architectureHeader: clone(input.architectureHeader),
        probe: clone(input.probe),
    };
    mutator(next);
    next.probeBytes = Buffer.from(JSON.stringify(next.probe));
    return next;
}

function rejects(name, mutator, reason) {
    assert.throws(() => classifyViewResourceOwnerDelta(rebuild(mutator)), reason, name);
    rejected += 1;
}

rejects('missing view owner', (next) => {
    next.probe.sides.candidate.lifecycle.reconnected.ownerKeys.pop();
}, /owner set changed/);
rejects('duplicate subscriber', (next) => {
    const phase = next.probe.sides.candidate.lifecycle.repeated;
    phase.allSubscriberKeys.push(phase.allSubscriberKeys[0]);
}, /subscriber map changed|duplicate subscriber/);
rejects('repeated connection replaces subscriber callback', (next) => {
    next.probe.sides.candidate.lifecycle.repeatedRetainedSubscriberIdentity = false;
}, /repeated connect replaced a subscriber/);
rejects('immediate comment subscriber survives disposal', (next) => {
    next.probe.sides.candidate.lifecycle.disposed.immediateSubscriberKeys.push('ui-comment-surface-state');
}, /disposed: owners or styles survived/);
rejects('timer growth', (next) => {
    next.probe.sides.candidate.lifecycle.repeated.timers = 1;
}, /resources did not settle/);
rejects('observer growth', (next) => {
    next.probe.sides.candidate.lifecycle.reconnected.activeObservers += 1;
}, /changed observer count/);
rejects('listener growth', (next) => {
    next.probe.sides.candidate.lifecycle.repeated.activeListeners += 1;
}, /leaked or duplicated listeners/);
rejects('detached article markers survive', (next) => {
    next.probe.sides.candidate.replacement.detachedArticleClean = false;
}, /detached cleanup failed/);
rejects('late ad retry path lost', (next) => {
    next.probe.sides.candidate.lateAd.removed = false;
}, /late ad cleanup path failed/);
rejects('filter effect changed', (next) => {
    next.probe.sides.candidate.positiveFilter.hidden = false;
}, /positive filter\/GM\/network path changed/);
rejects('filter pass missing', (next) => {
    next.probe.sides.candidate.positiveFilter.filterPassDelta = 0;
}, /positive filter\/GM\/network path changed/);
rejects('GM write introduced', (next) => {
    next.probe.sides.candidate.positiveFilter.seededWrites.push({ key: 'dcinside_threshold', value: 0 });
}, /positive filter\/GM\/network path changed/);
rejects('network effect introduced', (next) => {
    next.probe.sides.candidate.positiveFilter.uidRequests.push({ url: '/api/gallog_user_layer/gallog_content_reple/' });
}, /positive filter\/GM\/network path changed/);
rejects('timer ownership changed', (next) => {
    next.probe.sides.candidate.startup.timers[0].owner = 'unknown-owner';
}, /timer provenance snapshot changed/);
rejects('stale evidence binding', (next) => {
    next.currentBinding.proofSystemSha256 = 'stale';
}, /raw report evidence binding is stale/);
rejects('stale lifecycle probe binding', (next) => {
    next.probe.evidenceBinding.proofSystemSha256 = 'stale';
}, /lifecycle probe source or evidence binding is stale/);
rejects('stale lifecycle probe script', (next) => {
    next.probe.probeScriptSha256 = 'stale';
}, /lifecycle probe source or evidence binding is stale/);
rejects('architecture owner changed', (next) => {
    next.architectureArticle.surfaces[0].adapter = 'unknown-adapter';
}, /view adapter ownership changed/);
rejects('raw resource field erased', (next) => {
    next.report.resourceDifferences.pop();
}, /raw report changed|resource difference count changed/);
rejects('recovery timeout in raw observation', (next) => {
    next.report.sides.mobile.candidate.observations[0].value.runtime.recovery.status = 'timeout';
}, /raw report changed|recovery did not complete ready/);
rejects('control artifact substitution', (next) => {
    next.controlBytes = next.candidateBytes;
}, /control\/candidate bytes changed/);
{
    const next = rebuild(() => {});
    next.report.functionalDifferences.push({ field: 'functional.changed' });
    assert.equal(isDeepStrictEqual(next.report.functionalDifferences, input.report.functionalDifferences), false);
    assert.throws(() => classifyViewResourceOwnerDelta(next), /raw report changed|raw functional\/resource status changed/);
    rejected += 1;
}

console.log(`View resource owner classifier: positive accepted; ${rejected} negative controls rejected`);
