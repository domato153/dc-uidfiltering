import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as qualified from './classify-palette-owner-split.mjs';
import { digestEvidenceBytes } from './evidence-binding.mjs';

assert.equal(typeof qualified.assertPaletteQualification, 'function',
    'An exact reviewed qualification must be validated before a gate can accept the known owner split');
const digest = 'A'.repeat(64);
const binding = Object.fromEntries(['sourceInputsSha256', 'harnessSha256', 'fixturesSha256', 'toolchainSha256']
    .map(key => [key, digest.toLowerCase()]));
binding.node = process.version;
const sample = {
    schemaVersion: 1, kind: 'exact-header-palette-owner-qualification',
    controlSha256: 'A03038FE68126B62054EBA11244D4EE2E1766D308983FC5C27127FD3794CB343',
    candidateSha256: digest, controlSemanticSha256: digest, browser: 'test-browser',
    platform: `${process.platform}/${process.arch}`, evidenceBinding: binding,
    dependencies: Object.fromEntries(['baseline', 'observer', 'classifier', 'probe', 'gate', 'mobileOracle',
        'listOracle', 'articleOracle', 'commentOracle', 'dialogOracle', 'surfaceManifest', 'deltas'].map(key => [key, digest])),
    fullMobile: { path: 'artifacts/palette-test/full-mobile.json', sha256: digest, testCount: 143 },
};
assert.deepEqual(qualified.assertPaletteQualification(sample), sample);
let rejected = 0;
const rejects = (name, mutate, expression) => {
    const changed = structuredClone(sample);
    mutate(changed);
    assert.throws(() => qualified.assertPaletteQualification(changed), expression, name);
    rejected += 1;
};
rejects('dynamic current identity', value => { value.candidateSha256 = 'current'; }, /candidateSha256/);
rejects('identical control and candidate', value => { value.candidateSha256 = value.controlSha256; }, /distinct/);
rejects('unqualified original control effects', value => { value.controlSemanticSha256 = ''; }, /controlSemanticSha256/);
rejects('wrong original beta baseline', value => { value.controlSha256 = digest; }, /controlSha256/);
rejects('unqualified baseline source', value => { value.dependencies.baseline = ''; }, /baseline/);
rejects('missing lifecycle observer identity', value => { delete value.dependencies.probe; }, /dependencies/);
rejects('unknown waiver', value => { value.allowUnknownOwners = true; }, /qualification fields/);
rejects('unknown dependency', value => { value.dependencies.anyCurrentRuntime = digest; }, /dependencies/);
rejects('missing source identity', value => { delete value.evidenceBinding.sourceInputsSha256; }, /evidenceBinding/);
rejects('unknown direct input', value => { value.evidenceBinding.ignored = 'allowed'; }, /evidenceBinding/);
rejects('unqualified browser', value => { value.browser = ''; }, /browser/);
rejects('unqualified platform', value => { value.platform = 'current'; }, /platform/);
rejects('missing full-mobile report identity', value => { value.fullMobile.sha256 = ''; }, /fullMobile.sha256/);
rejects('missing full-mobile count', value => { delete value.fullMobile.testCount; }, /fullMobile/);
rejects('empty full-mobile count', value => { value.fullMobile.testCount = 0; }, /fullMobile.testCount/);
rejects('fractional full-mobile count', value => { value.fullMobile.testCount = 143.5; }, /fullMobile.testCount/);
rejects('unbound repair oracle', value => { delete value.dependencies.listOracle; }, /dependencies/);
rejects('absolute evidence path', value => { value.fullMobile.path = 'C:/other/report.json'; }, /fullMobile.path/);
rejects('evidence path escape', value => { value.fullMobile.path = 'artifacts/../report.json'; }, /fullMobile.path/);
rejects('unscoped evidence path', value => { value.fullMobile.path = 'README.md'; }, /fullMobile.path/);
console.log(`Exact palette qualification schema: positive accepted; ${rejected} negative controls rejected`);

// The exact local ruling must be executable and pinned without replacing the
// platform-independent raw comparator or being silently selected for admission.
const gates = JSON.parse(await readFile('verification/gates.json'));
const profile = gates.profiles['qualified-header-palette'];
assert.deepEqual(profile.runsOn, ['manual-qualified-windows']);
assert.equal(profile.commands.length, 1);
const command = profile.commands[0];
assert.equal(command.command, 'node');
assert.equal(command.args[0], 'tools/run-qualified-mobile-palette.mjs');
const argument = name => command.args[command.args.indexOf(name) + 1];
const qualificationPath = argument('--qualification');
const certificateBytes = await readFile(qualificationPath);
assert.equal(argument('--qualification-sha256'), digestEvidenceBytes(qualificationPath, certificateBytes).toUpperCase());
qualified.assertPaletteQualification(JSON.parse(certificateBytes));
for (const profileId of ['acceptance', 'promotion-windows']) {
    assert.equal(gates.profiles[profileId].commands.find(item => item.id === 'mobile-observed-palette')?.args[0],
        'testbed/run-palette-differential.mjs', `${profileId} must retain its raw comparator`);
}
for (const references of [gates.componentProfiles, gates.invariantProfiles, gates.profileSupersedence]) {
    assert.ok(Object.values(references).every(ids => !ids.includes('qualified-header-palette')),
        'Local exact qualification must not silently close an admission profile');
}
assert.ok(Object.values(gates.boundedScopes).every(scope => scope.profile !== 'qualified-header-palette'));
console.log('Exact local qualification command pinned; automatic raw admission gates preserved');
