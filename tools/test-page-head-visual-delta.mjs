import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyPageHeadDelta, readCurrentInputs, recomputeRawDifferences } from './classify-page-head-visual-delta.mjs';

const baseline = await readCurrentInputs();
const fixture = () => ({
    ...baseline,
    report: structuredClone(baseline.report),
    controlSide: structuredClone(baseline.controlSide),
    candidateSide: structuredClone(baseline.candidateSide),
    deltas: structuredClone(baseline.deltas),
});
const syncJsonBytes = (input) => {
    input.rawReportBytes = Buffer.from(JSON.stringify(input.report));
    input.controlSideBytes = Buffer.from(JSON.stringify(input.controlSide));
    input.candidateSideBytes = Buffer.from(JSON.stringify(input.candidateSide));
    input.deltasBytes = Buffer.from(JSON.stringify(input.deltas));
    return input;
};
const refreshRawDifferences = (input) => {
    input.report.differences = recomputeRawDifferences(input.controlSide, input.candidateSide);
    return syncJsonBytes(input);
};

test('exact current raw FAIL is narrowly classified without a header PASS', () => {
    const result = classifyPageHeadDelta(fixture());
    assert.equal(result.rawStatus, 'FAIL');
    assert.equal(result.classificationStatus, 'DECLARED_VISUAL_ONLY');
    assert.equal(result.stageStatus, 'UNKNOWN');
    assert.equal(result.rawDifferenceCount, 33);
    assert.equal(result.semanticDifferenceCount, 0);
    assert.equal(result.caseReceipts.length, 9);
});

test('mutated candidate bytes cannot borrow the raw report', () => {
    const input = fixture();
    input.candidateBytes = Buffer.concat([input.candidateBytes, Buffer.from('\n// mutation\n')]);
    assert.throws(() => classifyPageHeadDelta(input), /guarded candidate bytes changed/);
});

test('stale modernization binding blocks classification', () => {
    const input = fixture();
    input.report.evidenceBinding.modernizationContractSha256 = '0'.repeat(64);
    assert.throws(() => classifyPageHeadDelta(syncJsonBytes(input)), /evidence binding is stale/);
});

test('retired or missing active popup scope cannot authorize the difference', () => {
    const input = fixture();
    input.deltas.contracts.find((entry) => entry.id === 'header-native-door-v1').status = 'retired';
    assert.throws(() => classifyPageHeadDelta(syncJsonBytes(input)), /active original relation-popup contract is missing/);
});

test('unexpected visual field is not hidden by a broad visual waiver', () => {
    const input = fixture();
    input.candidateSide.observations[0].visual.titleStyle.backgroundColor = 'rgb(1, 2, 3)';
    assert.throws(() => classifyPageHeadDelta(refreshRawDifferences(input)), /unclassified field or value visual.titleStyle.backgroundColor/);
});

test('unexpected value on an allowed field still fails', () => {
    const input = fixture();
    input.candidateSide.observations.find((entry) => entry.caseId === 'minor-list-390' && entry.step === 'relation-open')
        .visual.popupStyle.zIndex = '4';
    assert.throws(() => classifyPageHeadDelta(refreshRawDifferences(input)), /unclassified field or value visual.popupStyle.zIndex/);
});

test('semantic difference is never classified as visual', () => {
    const input = fixture();
    input.candidateSide.observations[0].semantic.submitCount = 99;
    assert.throws(() => classifyPageHeadDelta(refreshRawDifferences(input)), /raw difference count changed|semantic or unknown difference/);
});

test('missing popup hit fails even with the same popup geometry', () => {
    const input = fixture();
    input.candidateSide.observations.find((entry) => entry.caseId === 'minor-list-390' && entry.step === 'relation-open')
        .visual.popupHit = false;
    assert.throws(() => classifyPageHeadDelta(refreshRawDifferences(input)), /original relation popup is not positively reachable/);
});

test('skipped case or step is not silently inapplicable', () => {
    const input = fixture();
    input.candidateSide.observations.splice(0, 1);
    assert.throws(() => classifyPageHeadDelta(refreshRawDifferences(input)), /applicability matrix changed or skipped/);
});

test('edited raw FAIL without matching side observations is rejected', () => {
    const input = fixture();
    input.report.differences[0].candidate.listOptionAfterStyle.display = 'grid';
    assert.throws(() => classifyPageHeadDelta(syncJsonBytes(input)), /raw report does not match independent side observations/);
});
