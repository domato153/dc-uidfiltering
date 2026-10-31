import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let checks = 0;
const test = async (name, run) => { await run(); checks++; console.log(`PASS ${name}`); };
const route = files => {
    const result = spawnSync(process.execPath, ['tools/resolve-impact.mjs', '--files', files], { cwd: root, encoding: 'utf8', shell: false });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
};

await test('current/next document edits do not select product acceptance or mutation audit', () => {
    assert.deepEqual(route('docs/work/NEXT_TASK.md').selectedProfiles, ['policy']);
});
await test('bounded mobile header source selects its header coverage without PC or full acceptance', () => {
    const result = route('src/targets/mobile/header-drawer-presenter.js');
    assert.deepEqual(result.selectedProfiles, ['policy', 'header-focused']);
    assert.equal(result.boundedScope, 'header-navigation');
});
await test('shared storage, bootstrap, unknown sources and harness retain full fallback', () => {
    for (const file of ['src/shared/storage-schema.js', 'src/runtime/bootstrap.js', 'src/unknown.js', 'testbed/harness/unknown.js']) {
        const result = route(file);
        assert.ok(result.selectedProfiles.includes('acceptance'), file);
        assert.ok(!result.selectedProfiles.includes('header-focused'), file);
    }
});
await test('proof tooling selects adversarial coverage without claiming a product change', () => {
    const result = route('tools/resolve-impact.mjs');
    assert.ok(result.selectedProfiles.includes('proof-core'));
    assert.ok(!result.selectedProfiles.includes('acceptance'));
});
await test('canonical generated outputs are classified instead of becoming unknown runtime paths', () => {
    const targets = JSON.parse(readFileSync(path.join(root, 'build/targets.json'))).targets;
    const file = targets.mobile.outputPattern.replace('{version}', targets.mobile.version);
    const result = route(file);
    assert.deepEqual(result.generatedFiles, [{ path: file, target: 'mobile' }]);
    assert.deepEqual(result.unmappedFiles, []);
    assert.ok(result.selectedProfiles.includes('acceptance'), 'artifact-only change must still be checked');
});

const { minimizeProfiles, validateImpactPolicy } = await import('./impact-routing.mjs');
const { executeGateSequence } = await import('./gate-execution.mjs');
const { loadArchitectureState } = await import('./architecture-state.mjs');
const gates = JSON.parse(readFileSync(path.join(root, 'verification/gates.json')));
const registry = (await loadArchitectureState(root)).effective;
await test('acceptance replaces focused coverage once without merging stateful command results', () => {
    assert.deepEqual(minimizeProfiles(['policy', 'mobile-focused', 'pc-focused', 'header-focused', 'acceptance'], gates), ['policy', 'acceptance']);
});
await test('unknown relation and unsafe shared bounded path are rejected', () => {
    const invalid = structuredClone(registry); invalid.relations.push({ id: 'unknown', from: invalid.components[0].id, to: invalid.components[1].id, kind: 'unknown' });
    assert.throws(() => validateImpactPolicy(invalid, gates), /Unknown impact relation/);
    const unsafe = structuredClone(gates); unsafe.boundedScopes['header-navigation'].sourcePaths.push('src/shared/storage-core.js');
    assert.throws(() => validateImpactPolicy(registry, unsafe), /Unsafe bounded header/);
    const bypass = structuredClone(gates); bypass.profileSupersedence.acceptance.push('proof-core');
    assert.throws(() => validateImpactPolicy(registry, bypass), /Unproven profile supersedence/);
});
await test('failed builder blocks its consumers, executes restoration and preserves independent profile work', async () => {
    const executed = [];
    const commands = [
        { profile: 'mobile', id: 'build', prerequisite: true }, { profile: 'mobile', id: 'test' },
        { profile: 'mobile', id: 'restore', always: true }, { profile: 'pc', id: 'test' },
    ];
    const results = await executeGateSequence(commands, item => { executed.push(item.id); return item.id === 'build' ? 1 : 0; });
    assert.deepEqual(executed, ['build', 'restore', 'test']);
    assert.equal(results[1].status, 'blocked'); assert.equal(results[1].exitCode, null);
    assert.equal(results[2].status, 'passed'); assert.equal(results[3].status, 'passed');
});
await test('failed policy prerequisite blocks expensive dependent profiles', async () => {
    const executed = [];
    const results = await executeGateSequence([{ profile: 'policy', id: 'architecture', prerequisite: true }, { profile: 'acceptance', id: 'browser' }], item => { executed.push(item.id); return 1; });
    assert.deepEqual(executed, ['architecture']); assert.equal(results[1].blockedBy, 'policy/architecture');
});
await test('independent assertion failure does not suppress unrelated evidence', async () => {
    const results = await executeGateSequence([{ profile: 'mobile', id: 'palette' }, { profile: 'mobile', id: 'native' }], item => item.id === 'palette' ? 1 : 0);
    assert.deepEqual(results.map(item => item.status), ['failed', 'passed']);
});
const { createAuditProgress, parseAuditGroups } = await import('./proof-audit-progress.mjs');
const { developmentJobRoutingIsValid } = await import('./workflow-sequence.mjs');
const { parseCurrentArtifacts } = await import('./continuity-state.mjs');
const { observeCheckpointCI } = await import('./checkpoint-core.mjs');
await test('CI pending is an observation and never qualifies another SHA or incomplete job', () => {
    const sha = 'a'.repeat(40);
    const run = { head_sha: sha, event: 'push', name: 'DCUF development CI', head_branch: 'codex/ui-port-boundary', status: 'queued' };
    assert.equal(observeCheckpointCI(null, [], sha, sha).status, 'REMOTE_SYNCED_CI_PENDING');
    assert.equal(observeCheckpointCI(run, [], sha, sha).workSuccessCertified, false);
    assert.throws(() => observeCheckpointCI({ ...run, head_sha: 'b'.repeat(40) }, [], sha, sha), /different commit/);
    assert.throws(() => observeCheckpointCI({ ...run, status: 'completed', conclusion: 'success' }, [{ name: 'working-checkpoint', conclusion: 'skipped' }], sha, sha), /did not succeed/);
});
await test('typed artifact identity is independent of prose and rejects missing/extra/malformed fields', () => {
    const text = readFileSync(path.join(root, 'docs/work/CURRENT_STATE.md'), 'utf8');
    const artifacts = parseCurrentArtifacts(text);
    const withArtifacts = value => text.replace(/```dcuf-current-artifacts[\s\S]*?```/,
        '```dcuf-current-artifacts\n'+JSON.stringify(value,null,2)+'\n```');
    assert.deepEqual(parseCurrentArtifacts(withArtifacts(artifacts)),artifacts,'Reformatted typed positive control');
    assert.deepEqual(parseCurrentArtifacts(text.replace(/^- Current artifact:.*$/m, '- Current artifact: human explanation changed')), artifacts);
    assert.throws(() => parseCurrentArtifacts(text.replace(/```dcuf-current-artifacts[\s\S]*?```/, '')), /typed current artifact/);
    assert.throws(() => parseCurrentArtifacts(withArtifacts({...artifacts,unexpected:true})), /closed fields/);
    assert.throws(() => parseCurrentArtifacts(withArtifacts({...artifacts,mobile:{sha256:'bad'}})), /digest/);
});
await test('CI rejects unconditional acceptance, forced full routing and absent dependency cache', () => {
    const workflow = readFileSync(path.join(root, '.github/workflows/development-ci.yml'), 'utf8');
    assert.equal(developmentJobRoutingIsValid(workflow), true);
    for (const modified of [workflow.replace("needs.policy.outputs.acceptance == 'true'", 'true'),
        workflow.replace(' --ci-output "$GITHUB_OUTPUT"', ''), workflow.replace(/uses: actions\/cache@[^\s]+/, 'uses: missing-cache'),
        workflow.replace('--head HEAD --output', '--head HEAD --full --output')]) assert.equal(developmentJobRoutingIsValid(modified), false);
});
const { mkdtempSync, rmSync } = await import('node:fs');
const { tmpdir } = await import('node:os');
await test('audit group selection rejects unknown, duplicate and empty groups', () => {
    assert.equal(parseAuditGroups().length, 6);
    for (const value of ['unknown', 'routing,routing', '']) assert.throws(() => parseAuditGroups(value), /proof audit group/);
});
const temp = mkdtempSync(path.join(tmpdir(), 'dcuf-proof-progress-'));
try {
    await test('fresh worktree routes execute before commit and reject changed candidate identity', () => {
        const file = path.join(root, 'artifacts/efficiency-worktree-receipt.json');
        const resultFile = path.join(root, 'artifacts/efficiency-empty-selection.json');
        const run = args => spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', shell: false });
        assert.equal(run(['tools/resolve-impact.mjs', '--worktree', '--output', file]).status, 0);
        const result = run(['tools/run-gates.mjs', file, resultFile, '--only', 'live-canary']);
        assert.equal(result.status, 0, result.stderr);
        assert.equal(JSON.parse(readFileSync(resultFile)).status, 'not-applicable');
        const receipt = JSON.parse(readFileSync(file)); receipt.candidateFingerprint = '0'.repeat(64);
        writeFileSync(file, JSON.stringify(receipt));
        const stale = run(['tools/run-gates.mjs', file, '--verify-receipt-only']);
        assert.notEqual(stale.status, 0); assert.match(stale.stderr, /Impact route mismatch: candidateFingerprint/);
    });
    await test('interrupted audit saves completed cases and resumes exact inputs only', () => {
        const file = path.join(temp, 'progress.json'); const identity = { source: 'a', platform: 'windows', environment: 'b' };
        const first = createAuditProgress({ identity, outputPath: file });
        first.execute('routing', 'negative', 'negative', 'node', [], { pattern: /right failure/ }, () => ({ status: 1, stdout: 'right failure' }));
        assert.equal(JSON.parse(readFileSync(file)).status, 'in-progress');
        const resumed = createAuditProgress({ identity, outputPath: file, resumePath: file });
        resumed.execute('routing', 'negative', 'negative', 'node', [], { pattern: /right failure/ }, () => { throw new Error('completed case reran'); });
        assert.equal(resumed.snapshot().cases[0].reused, true);
        assert.throws(() => createAuditProgress({ identity: { ...identity, environment: 'changed' }, resumePath: file }), /inputs or environment changed/);
    });
    await test('wrong-reason failures remain failures and never become reusable passes', () => {
        const audit = createAuditProgress({ identity: {}, outputPath: path.join(temp, 'failure.json') });
        assert.throws(() => audit.execute('routing', 'bad', 'negative', 'node', [], { pattern: /expected/ }, () => ({ status: 1, stderr: 'environment failure' })), /wrong reason/);
        assert.equal(audit.snapshot().status, 'failed'); assert.equal(audit.snapshot().cases[0].status, 'failed');
    });
} finally {
    assert.ok(path.resolve(temp).startsWith(path.resolve(tmpdir()) + path.sep) && path.basename(temp).startsWith('dcuf-proof-progress-'));
    rmSync(temp, { recursive: true, force: true });
}
console.log(`Verification efficiency controls passed: ${checks}.`);
