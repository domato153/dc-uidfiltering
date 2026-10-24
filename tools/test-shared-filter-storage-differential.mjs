import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { compareSharedObservations } from '../testbed/run-shared-filter-storage-differential.mjs';
import { assertEvidenceBinding, createEvidenceBinding, digestEvidenceBytes } from './evidence-binding.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = path.join(root, 'testbed/artifacts/final-shared-filter-storage-0C30-1A7.json');
const observerPath = 'testbed/run-shared-filter-storage-differential.mjs';
const artifacts = {
    mobile: {
        control: ['testbed/artifacts/baseline-mobile-stable.user.js', '32BA208DDD9973A7EEC343F01E963A833AB4F0C084987077EDAE46844383C25D'],
        candidate: ['testbed/artifacts/runtime-under-test.user.js', '0C3076699E696AD3C252B5DF21D216F9B6EA32928B4C8A7C160DE0888926450A'],
    },
    pc: {
        control: ['testbed/artifacts/baseline-pc.user.js', 'D3A95C479D8D50F88D97700DE91FA17D1D338B3AEBB488F53D865F445B656212'],
        candidate: ['dcinside_user_filter_v1.9.9.user.js', '1A7A00468F4DCFB57C7341063098B827743091FD7593BA3FBA86A17E282BDC33'],
    },
};
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const clone = (value) => structuredClone(value);
const report = JSON.parse(await readFile(reportPath, 'utf8'));

async function verifyCurrentReport(value) {
    assert.equal(value.schemaVersion, 1);
    assert.equal(value.kind, 'observed-shared-filter-storage-differential');
    assert.equal(value.observerSha256, digestEvidenceBytes(observerPath,
        await readFile(path.join(root, observerPath))).toUpperCase(), 'observer source changed');
    assertEvidenceBinding(value.evidenceBinding, await createEvidenceBinding(root));
    for (const target of ['mobile', 'pc']) {
        for (const role of ['control', 'candidate']) {
            const [relativePath, expectedSha] = artifacts[target][role];
            const side = value.sides[target][role];
            const sideEvidence = value.sideEvidence[target][role];
            assert.equal(sha(await readFile(path.join(root, relativePath))), expectedSha, `${target}/${role} SUT changed`);
            assert.equal(value.exactArtifacts[target][role], expectedSha);
            assert.equal(side.runtimePath, path.join(root, relativePath));
            assert.equal(side.artifactSha256, expectedSha);
            assert.equal(sideEvidence.artifactSha256, expectedSha);
            assert.equal(sideEvidence.browser, side.browser);
            assert.equal(sideEvidence.observationCount, side.observations.length);
            assert.equal(sideEvidence.observationsSha256, sha(Buffer.from(JSON.stringify(side.observations))),
                `${target}/${role} observationsSha256 changed`);
        }
        assert.equal(value.sides[target].control.browser, value.sides[target].candidate.browser);
    }
    const compared = compareSharedObservations(value.sides);
    for (const key of ['rawDifferences', 'functionalDifferences', 'resourceDifferences', 'positiveFailures']) {
        assert.ok(isDeepStrictEqual(value[key], compared[key]), `${key} was changed or erased`);
    }
    assert.equal(value.functionalStatus,
        compared.functionalDifferences.length === 0 && compared.positiveFailures.length === 0
            ? 'MATCHED_IN_COVERED_STATES' : 'FAIL');
    assert.equal(value.resourceStatus, compared.resourceDifferences.length === 0 ? 'MATCHED' : 'DIFFERENT_UNCLASSIFIED');
    assert.equal(value.finalFeatureStatus, 'UNKNOWN');
    return compared;
}

const baseline = await verifyCurrentReport(report);
assert.equal(baseline.functionalDifferences.length, 0);
assert.equal(baseline.positiveFailures.length, 0);
assert.equal(baseline.resourceDifferences.length, 42);
assert.equal(baseline.rawDifferences.length, 12);
let rejected = 0;

function detects(name, mutate, predicate) {
    const sides = clone(report.sides);
    mutate(sides);
    assert.ok(predicate(compareSharedObservations(sides)), `${name} mutation was not detected`);
    rejected += 1;
}

detects('master value changes', (sides) => {
    sides.mobile.candidate.observations[3].value.gm.values.dcinside_master_disabled = false;
}, (result) => result.functionalDifferences.some((entry) => entry.field.includes('gmValues.dcinside_master_disabled'))
    && result.positiveFailures.some((entry) => entry.caseId === 'master-disabled'));
detects('stored shape changes', (sides) => {
    sides.pc.candidate.observations[5].value.gm.values.dcinside_personal_block_list = [];
}, (result) => result.functionalDifferences.length > 0 && result.positiveFailures.some((entry) => entry.reason.includes('GM')));
detects('unexpected GM write', (sides) => {
    sides.mobile.candidate.observations[1].value.gm.writes.push({ key: 'dcinside_master_disabled', value: true });
}, (result) => result.functionalDifferences.some((entry) => entry.field.includes('gmWrites'))
    && result.positiveFailures.some((entry) => entry.reason.includes('rewritten')));
detects('UID network request', (sides) => {
    sides.pc.candidate.observations[3].value.uidRequests.push({ uid: 'synthetic', body: null, mode: 'fixture' });
}, (result) => result.functionalDifferences.some((entry) => entry.field.includes('uidRequests'))
    && result.positiveFailures.some((entry) => entry.caseId === 'master-disabled'));
detects('filter visibility changes', (sides) => {
    sides.mobile.candidate.observations[5].value.comment.contentVisible = true;
}, (result) => result.functionalDifferences.some((entry) => entry.field.includes('contentVisible'))
    && result.positiveFailures.some((entry) => entry.caseId === 'personal-block-positive'));
detects('recovery timeout', (sides) => {
    sides.mobile.candidate.observations[1].value.runtime.recovery.status = 'timeout';
}, (result) => result.functionalDifferences.some((entry) => entry.field.includes('recovery.status'))
    && result.positiveFailures.some((entry) => entry.reason.includes('recovery did not complete')));
detects('PC resource changes', (sides) => {
    sides.pc.candidate.observations[1].value.runtime.resources.timers += 1;
}, (result) => result.resourceDifferences.some((entry) => entry.target === 'pc' && entry.field.endsWith('.timers')));
{
    const sides = clone(report.sides);
    sides.mobile.candidate.observations.pop();
    assert.throws(() => compareSharedObservations(sides), /missing or zero applicability/);
    rejected += 1;
}
{
    const stale = clone(report);
    stale.evidenceBinding.fixturesSha256 = 'stale';
    await assert.rejects(verifyCurrentReport(stale), /Stale evidence receipt/);
    rejected += 1;
}
{
    const changed = clone(report);
    changed.sides.mobile.candidate.observations[1].value.comment.contentVisible = false;
    await assert.rejects(verifyCurrentReport(changed), /observationsSha256/);
    rejected += 1;
}

console.log(`Shared filter/storage differential: positive accepted; ${rejected} negative controls rejected`);
