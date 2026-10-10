import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { classifyPaletteOwnerSplit, readCurrentInputs } from './classify-palette-owner-split.mjs';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const clone = (value) => JSON.parse(JSON.stringify(value));
const input = await readCurrentInputs();
assert.equal(classifyPaletteOwnerSplit(input).classificationStatus, 'DECLARED_OWNER_SPLIT_ONLY');
let rejected = 0;

function rebuild(mutator) {
    const next = { ...input, report: clone(input.report), fullMobile: clone(input.fullMobile), probe: clone(input.probe),
        surfaceManifest: clone(input.surfaceManifest), deltas: clone(input.deltas),
        currentBinding: clone(input.currentBinding) };
    mutator(next);
    const sides = next.report.sides;
    next.controlSideBytes = Buffer.from(JSON.stringify(sides.control));
    next.candidateSideBytes = Buffer.from(JSON.stringify(sides.candidate));
    for (const sideName of ['control', 'candidate']) {
        next.report.observationEvidence[sideName].observationsSha256 = sha(Buffer.from(JSON.stringify(sides[sideName].observations)));
    }
    next.report.rawDifferences = sides.control.observations.flatMap((entry, index) =>
        isDeepStrictEqual(entry, sides.candidate.observations[index]) ? []
            : [{ index, control: entry, candidate: sides.candidate.observations[index] }]);
    const projected = (entry) => {
        const result = clone(entry);
        if (result.step === 'settled-resources') {
            const { observerCreations, observerDisconnects, ...value } = result.value;
            result.value = { ...value, activeObservers: observerCreations - observerDisconnects };
        } else {
            if (result.value?.paletteWarnings) result.value.paletteWarnings = result.value.paletteWarnings.semantic;
            if (result.value?.geometry) result.value.geometry = { contained: result.value.geometry.contained };
        }
        return result;
    };
    next.report.differences = sides.control.observations.flatMap((entry, index) => {
        const control = projected(entry);
        const candidate = projected(sides.candidate.observations[index]);
        return isDeepStrictEqual(control, candidate) ? [] : [{ index, control, candidate }];
    });
    next.reportBytes = Buffer.from(JSON.stringify(next.report));
    next.fullMobileBytes = Buffer.from(JSON.stringify(next.fullMobile));
    return next;
}

function rejects(name, mutator, reason) {
    const changed = rebuild(mutator);
    assert.throws(() => classifyPaletteOwnerSplit(changed), reason, name);
    rejected += 1;
}

rejects('missing header owner', (next) => {
    next.report.sides.candidate.observations[5].value.subscribers.splice(2, 1);
}, /missing, extra or duplicate owner/);
rejects('extra owner', (next) => {
    next.report.sides.candidate.observations[5].value.subscribers.splice(2, 0, 'unknown-owner');
}, /missing, extra or duplicate owner/);
rejects('duplicate owner', (next) => {
    next.report.sides.candidate.observations[5].value.subscribers.splice(2, 0, 'header-shell-style');
}, /missing, extra or duplicate owner/);
rejects('unsettled timer', (next) => {
    next.report.sides.candidate.observations[12].value.timers = 1;
}, /resources did not settle/);
rejects('increased observer', (next) => {
    next.report.sides.candidate.observations[18].value.observerCreations = 7;
}, /active observer or startup churn changed/);
rejects('increased listener', (next) => {
    next.report.sides.candidate.observations[5].value.listeners = 189;
}, /listener transition changed/);
rejects('unknown settled field', (next) => {
    next.report.sides.candidate.observations[5].value.hiddenWork = 1;
}, /non-owner resource changed/);
rejects('palette effect changed', (next) => {
    next.report.sides.candidate.observations[2].value.palette = 'red';
}, /preview\/storage\/focus is not positive/);
rejects('GM write changed', (next) => {
    next.report.sides.candidate.observations[4].value.writes[0].value = 'red';
}, /save\/storage is not positive/);
rejects('event trace changed', (next) => {
    next.report.sides.candidate.observations[4].value.events.pop();
}, /raw differences changed or were erased|semantic differences are not exactly the three settled snapshots/);
rejects('focus trace changed', (next) => {
    next.report.sides.candidate.observations[2].value.focus.action = 'unknown';
}, /semantic differences are not exactly the three settled snapshots/);
rejects('network trace changed', (next) => {
    next.report.sides.candidate.observations[4].value.requests.push({ method: 'GET', path: '/unknown', body: null, status: 200 });
}, /raw differences changed or were erased|semantic differences are not exactly the three settled snapshots/);
rejects('palette containment lost', (next) => {
    next.report.sides.candidate.observations[1].value.geometry.contained = false;
}, /palette open\/focus\/containment is not positive/);
rejects('owner lifecycle test failed', (next) => {
    next.fullMobile.results.find((entry) => entry.name.startsWith('헤더 셸 CSS')).status = 'failed';
}, /exact-candidate mobile owner test run is unavailable/);
rejects('subscription survives disposal', (next) => {
    next.probe.lifecycle.disposed.allSubscriberKeys.push('header-shell-style');
}, /disposed: lifecycle subscriber ownership changed/);
rejects('repeated connect duplicates listener', (next) => {
    next.probe.lifecycle.repeated.activeListeners += 1;
}, /duplicate connect or disposal changed listener ownership/);
rejects('probe retains extra observer', (next) => {
    next.probe.lifecycle.disposed.activeObservers += 1;
}, /disposed: lifecycle observer count changed/);
rejects('palette effect after reconnect changes', (next) => {
    next.probe.cancelled.palette = 'purple';
}, /palette path changed after owner lifecycle/);
{
    const next = rebuild(() => {});
    next.report.rawDifferences.pop();
    next.reportBytes = Buffer.from(JSON.stringify(next.report));
    assert.throws(() => classifyPaletteOwnerSplit(next), /raw differences changed or were erased/, 'raw difference erased');
    rejected += 1;
}
rejects('stale proof binding', (next) => {
    next.currentBinding.proofSystemSha256 = 'stale';
}, /raw report evidence binding is stale/);
rejects('inactive geometry contract', (next) => {
    next.deltas.contracts.find((entry) => entry.id === next.surfaceManifest.surfaces
        .find((surface) => surface.id === 'tokens-settings-palette').intendedDelta).status = 'retired';
    next.deltasBytes = Buffer.from(JSON.stringify(next.deltas));
}, /palette geometry normalization has no active contract/);
rejects('control/candidate identity substitution', (next) => {
    next.candidateBytes = next.controlBytes;
}, /control\/candidate bytes changed/);

console.log(`Palette owner classifier: positive accepted; ${rejected} negative controls rejected`);
