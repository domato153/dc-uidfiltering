import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { GOVERNANCE_PROOF_PATHS } from './evidence-binding.mjs';

// Proof-only temporary repositories execute the real router, gate runner and
// registry CLI. Their trivial gate is not product or header acceptance evidence.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const toolsToPin = [
    'architecture-registry.mjs', 'architecture-state.mjs', 'evidence-binding.mjs',
    'impact-routing.mjs', 'resolve-impact.mjs', 'run-gates.mjs',
    'git-tree-state.mjs', 'gate-execution.mjs',
];
const pinned = new Map(await Promise.all(toolsToPin.map(async name => [
    `tools/${name}`, await readFile(path.join(root, 'tools', name)),
])));
const bytes = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const digest = value => createHash('sha256').update(value).digest('hex');
const candidatePath = 'architecture/candidates/fixture-exit.json';
const receiptPath = 'verification/receipts/fixture-gates.json';
const foldPath = 'verification/receipts/fixture-exit-fold.json';
const sourcePath = 'src/targets/mobile/header-fixture-presenter.js';
const ownerId = 'fixture-header-presenter';

async function removeFixture(directory) {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('dcuf-exit-plan-fixture-'));
    await rm(directory, { recursive: true, force: true });
}

async function fixture(directory) {
    const write = async (relative, value) => {
        const target = path.join(directory, relative);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, value);
    };
    const readJson = async relative => JSON.parse(await readFile(path.join(directory, relative), 'utf8'));
    const writeJson = (relative, value) => write(relative, bytes(value));
    const run = (command, args) => spawnSync(command, args, {
        cwd: directory, encoding: 'utf8', shell: false,
        env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1' },
    });
    const node = args => run(process.execPath, args);
    const cli = args => node(['tools/architecture-registry.mjs', ...args]);
    const succeeds = (result, label) => assert.equal(result.status, 0,
        `${label}\n${result.stdout}\n${result.stderr}`);
    const rejects = (result, expected) => {
        assert.notEqual(result.status, 0, `Unexpected success: ${result.stdout}`);
        assert.match(`${result.stdout}\n${result.stderr}`, expected);
    };

    // Supply inert bytes for binding-only inputs; pin every executed helper.
    const bindingSource = pinned.get('tools/evidence-binding.mjs').toString();
    const bindingPaths = new Set(GOVERNANCE_PROOF_PATHS);
    for (const block of bindingSource.matchAll(/hashPaths\(rootDir, \[([\s\S]*?)\]\)/g)) {
        for (const literal of block[1].matchAll(/'([^']+)'/g)) bindingPaths.add(literal[1]);
    }
    for (const relative of bindingPaths) {
        if (path.extname(relative) || relative.startsWith('.gitattributes')) await write(relative, 'fixture-only\n');
        else await mkdir(path.join(directory, relative), { recursive: true });
    }
    for (const [relative, content] of pinned) await write(relative, content);
    await mkdir(path.join(directory, 'architecture/candidates'), { recursive: true });
    await mkdir(path.join(directory, 'verification/receipts'), { recursive: true });
    await write('.gitignore', 'artifacts/\nverification/receipts/fixture-gates.json\n');
    await write('package.json', '{"type":"module","private":true}\n');
    await write('docs/work/CURRENT_STATE.md', 'Proof-only fixture state.\n');
    await write('docs/work/NEXT_TASK.md', 'Prove transition receipt lifecycle.\n');
    await write(sourcePath, 'export const fixtureValue = 1;\n');
    await write('tools/fixture-proof-gate.mjs', `import assert from 'node:assert/strict';
import { appendFile } from 'node:fs/promises';
assert.deepEqual(process.argv.slice(2), ['--proof-only']);
assert.equal(process.env.DCUF_EXIT_FIXTURE, 'proof-only');
await appendFile('artifacts/executed.ndjson', JSON.stringify({ proofOnly: true, commandExecuted: true }) + '\\n');
`);
    const registry = {
        schemaVersion: 1, registryVersion: 2,
        authorities: [{ id: 'fixture-authority', path: 'src', owns: 'Proof-only fixture source' }],
        contracts: [{ id: 'fixture-contract', summary: 'Preserve proof-only source behavior' }],
        components: [
            { id: 'architecture-governance', status: 'accepted', classification: 'governance', layer: 'verification',
                boundaryState: 'verification', responsibility: 'Validate proof-only fixture governance',
                sourceRefs: ['architecture'], contractRefs: ['fixture-contract'], fitnessRefs: ['fixture-integrity'] },
            { id: ownerId, status: 'accepted', classification: 'presentation-source', layer: 'presentation-ui',
                boundaryState: 'mixed', responsibility: 'Own the proof-only fixture presentation',
                sourceRefs: [sourcePath], contractRefs: ['fixture-contract'], fitnessRefs: ['fixture-integrity'],
                transition: { targetBoundaryState: 'conforming', exitCriteria:
                    'The fixture owner preserves its source behavior and passes its complete current policy and acceptance command evidence.' } },
        ],
        relations: [],
        invariants: [{ id: 'fixture-integrity', state: 'enforced', exceptions: [], summary: 'Verify fixture integrity' }],
    };
    await writeJson('architecture/registry.json', registry);
    // The existing lineage contract starts with a legacy version-2 seed.
    // This is historical fixture metadata, never a fabricated passed gate run.
    await writeJson('verification/receipts/fixture-genesis-fold.json', {
        schemaVersion: 1, resultingRegistryVersion: 2,
        beforeRegistrySha256: digest(bytes({ ...registry, registryVersion: 1 })),
        afterRegistrySha256: digest(bytes(registry)),
        candidateRemoved: true, idempotencyReplayMatched: true, temporaryRefLeakDetected: false,
        scope: 'PROOF_ONLY_LEGACY_FIXTURE_SEED',
    });
    await writeJson('build/targets.json', { targets: { mobile: {
        version: 'fixture', outputPattern: 'fixture-{version}.user.js', inputs: [{ path: sourcePath }],
    } } });
    const gates = {
        schemaVersion: 1, fallbackProfile: 'acceptance', relationImpact: {},
        profileSupersedence: {
            acceptance: ['mobile-focused', 'pc-focused', 'header-focused'], 'header-focused': ['mobile-focused'],
        },
        boundedScopes: { 'header-navigation': { profile: 'header-focused', sourcePaths: [sourcePath] } },
        profiles: {
            policy: { commands: [{ id: 'architecture', command: process.execPath,
                args: ['tools/architecture-registry.mjs', 'validate', '--transition-plan'], prerequisite: true }] },
            'proof-core': { commands: [] }, 'proof-runtime': { commands: [] },
            'mobile-focused': { commands: [] }, 'pc-focused': { commands: [] }, 'header-focused': { commands: [] },
            acceptance: { commands: [{ id: 'fixture-behavior', command: process.execPath,
                args: ['tools/fixture-proof-gate.mjs', '--proof-only'], env: { DCUF_EXIT_FIXTURE: 'proof-only' } }] },
        },
        componentProfiles: { 'architecture-governance': ['policy'], [ownerId]: ['acceptance'] },
        invariantProfiles: { 'fixture-integrity': ['policy'] },
    };
    await writeJson('verification/gates.json', gates);
    succeeds(cli(['generate-index']), 'generate fixture accepted index');
    for (const args of [['init', '-q'], ['config', 'user.name', 'DCUF proof fixture'],
        ['config', 'user.email', 'fixture@example.invalid'], ['add', '.'], ['commit', '-qm', 'Proof-only fixture baseline']]) {
        succeeds(run('git', args), `git ${args[0]} in isolated fixture`);
    }
    const next = structuredClone(registry.components[1]);
    next.boundaryState = 'conforming';
    delete next.transition;
    const candidate = {
        schemaVersion: 1, id: 'proof-only-transition', baseRegistrySha256: digest(bytes(registry)),
        changes: { upsertComponents: [next] },
        transitionExits: [{ componentId: ownerId, fromBoundaryState: 'mixed', toBoundaryState: 'conforming',
            exitCriteriaSha256: digest(Buffer.from(registry.components[1].transition.exitCriteria)), gateReceipt: receiptPath }],
    };
    await writeJson(candidatePath, candidate);
    return { directory, write, readJson, writeJson, node, cli, succeeds, rejects, candidate, registry, gates };
}

test('a future transition plan runs real gates before strict receipt validation and replay', async t => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'dcuf-exit-plan-fixture-'));
    try {
        const f = await fixture(directory);
        f.rejects(f.cli(['validate']), /transition gateReceipt is unreadable/);
        const planned = f.cli(['validate', '--transition-plan']);
        f.succeeds(planned, 'plan validation must not require its future completed receipt');
        assert.match(planned.stdout, /plan.*finished.*deferred/i);

        const planNegatives = [
            ['missing exit evidence', value => { value.transitionExits = []; }, /mixed boundary exit requires verified transition evidence/],
            ['wrong criteria', value => { value.transitionExits[0].exitCriteriaSha256 = '0'.repeat(64); }, /accepted exit criteria/],
            ['outside receipt path', value => { value.transitionExits[0].gateReceipt = 'artifacts/not-a-receipt.json'; }, /inside verification\/receipts/],
            ['traversing receipt path', value => { value.transitionExits[0].gateReceipt = 'verification/receipts/../../outside.json'; }, /inside verification\/receipts/],
            ['duplicate exit', value => { value.transitionExits.push(structuredClone(value.transitionExits[0])); }, /duplicate transition exit evidence/],
            ['nonaccepted exit', value => { value.transitionExits.push({ ...value.transitionExits[0], componentId: 'not-accepted' }); }, /accepted mixed component/],
            ['wrong source state', value => { value.transitionExits[0].fromBoundaryState = 'conforming'; }, /boundary states do not match/],
            ['wrong target', value => { value.changes.upsertComponents[0].boundaryState = 'verification'; }, /declared target conforming/],
            ['evidence without an exit', value => { value.changes.upsertComponents[0] = structuredClone(f.registry.components[1]); }, /evidence was supplied without a boundary exit/],
            ['unknown graph endpoint', value => { value.changes.upsertRelations = [
                { id: 'bad-relation', from: ownerId, to: 'absent-component', kind: 'fixture-kind' },
            ]; }, /unknown to component absent-component/],
            ['presentation owner relabeling', value => { value.changes.upsertComponents[0].layer = 'application-runtime'; }, /cannot be relabeled/],
        ];
        for (const [name, mutate, expected] of planNegatives) await t.test(`plan rejects ${name}`, async () => {
            const value = structuredClone(f.candidate); mutate(value);
            await f.writeJson(candidatePath, value);
            try { f.rejects(f.cli(['validate', '--transition-plan']), expected); }
            finally { await f.writeJson(candidatePath, f.candidate); }
        });
        await t.test('plan mode cannot be applied to promotion', () => {
            f.rejects(f.cli(['promote', candidatePath, foldPath, '--transition-plan']), /transition-plan.*only.*validate/i);
        });
        const frozen = new Map(await Promise.all(['architecture/registry.json', 'architecture/INDEX.md', candidatePath]
            .map(async relative => [relative, await readFile(path.join(f.directory, relative))])));
        f.rejects(f.cli(['promote', candidatePath, foldPath]), /transition gateReceipt is unreadable/);
        for (const [relative, value] of frozen) assert.deepEqual(await readFile(path.join(f.directory, relative)), value);

        const route = f.node(['tools/resolve-impact.mjs', '--worktree', '--base', 'HEAD', '--head', 'HEAD', '--full', '--output', 'artifacts/impact.json']);
        f.succeeds(route, 'resolve real fixture worktree route');
        const execution = f.node(['tools/run-gates.mjs', 'artifacts/impact.json', receiptPath]);
        f.succeeds(execution, 'run actual fixture policy and acceptance commands');
        const receipt = await f.readJson(receiptPath);
        assert.equal(receipt.status, 'passed');
        assert.equal(receipt.results.length, 2);
        assert.ok(receipt.results.every(result => result.exitCode === 0));
        assert.deepEqual((await readFile(path.join(f.directory, 'artifacts/executed.ndjson'), 'utf8')).trim().split('\n').map(JSON.parse),
            [{ proofOnly: true, commandExecuted: true }]);
        const evidence = await import(`${pathToFileURL(path.join(f.directory, 'tools/evidence-binding.mjs'))}?fixture=${Date.now()}`);
        const bindingBefore = await evidence.createEvidenceBinding(f.directory);
        const fingerprintBefore = await evidence.createCandidateFingerprint(f.directory);
        f.candidate.transitionExits[0].gateReceiptSha256 = digest(await readFile(path.join(f.directory, receiptPath)));
        await f.writeJson(candidatePath, f.candidate);
        const bindingAfter = await evidence.createEvidenceBinding(f.directory);
        assert.equal(bindingBefore.architecturePlanSha256, bindingAfter.architecturePlanSha256);
        assert.notEqual(bindingBefore.architectureStateSha256, bindingAfter.architectureStateSha256);
        assert.notEqual(fingerprintBefore, await evidence.createCandidateFingerprint(f.directory));
        f.succeeds(f.cli(['validate']), 'strict validation accepts the completed genuine receipt');
        f.rejects(f.node(['tools/run-gates.mjs', 'artifacts/impact.json', '--verify-receipt-only']), /Stale evidence receipt/);

        const receiptNegatives = [
            ['in-progress result', value => { value.status = 'in-progress'; }, /not a passed run-gates receipt/],
            ['failed result', value => { value.status = 'failed'; }, /not a passed run-gates receipt/],
            ['wrong head', value => { value.sourceHead = '0'.repeat(40); }, /expected promotion HEAD/],
            ['wrong source', value => { value.evidenceBinding.sourceInputsSha256 = '0'.repeat(64); }, /stale sourceInputsSha256/],
            ['wrong gates', value => { value.evidenceBinding.gatesSha256 = '0'.repeat(64); }, /stale gatesSha256/],
            ['missing command', value => { value.results.pop(); }, /missing passed command acceptance\/fixture-behavior/],
            ['failed command', value => { value.results[1].exitCode = 1; }, /missing passed command acceptance\/fixture-behavior/],
            ['wrong args', value => { value.results[1].args.push('--unexecuted'); }, /missing passed command acceptance\/fixture-behavior/],
            ['wrong env', value => { value.results[1].env.DCUF_EXIT_FIXTURE = 'wrong'; }, /missing passed command acceptance\/fixture-behavior/],
        ];
        const goodReceiptBytes = await readFile(path.join(f.directory, receiptPath));
        for (const [name, mutate, expected] of receiptNegatives) await t.test(`strict validation rejects ${name}`, async () => {
            const value = structuredClone(receipt); mutate(value);
            await f.writeJson(receiptPath, value);
            const badCandidate = structuredClone(f.candidate);
            badCandidate.transitionExits[0].gateReceiptSha256 = digest(bytes(value));
            await f.writeJson(candidatePath, badCandidate);
            try { f.rejects(f.cli(['validate']), expected); }
            finally { await f.write(receiptPath, goodReceiptBytes); await f.writeJson(candidatePath, f.candidate); }
        });
        await t.test('strict validation rejects an incorrect receipt digest', async () => {
            const badCandidate = structuredClone(f.candidate);
            badCandidate.transitionExits[0].gateReceiptSha256 = '0'.repeat(64);
            await f.writeJson(candidatePath, badCandidate);
            try { f.rejects(f.cli(['validate']), /digest does not match/); }
            finally { await f.writeJson(candidatePath, f.candidate); }
        });
        await t.test('strict validation detects a changed real source after gate execution', async () => {
            const original = await readFile(path.join(f.directory, sourcePath));
            await f.write(sourcePath, 'export const fixtureValue = 2;\n');
            try { f.rejects(f.cli(['validate']), /stale sourceInputsSha256/); }
            finally { await f.write(sourcePath, original); }
        });
        await t.test('strict validation rejects semantic plan changes after gate execution', async () => {
            const value = structuredClone(f.candidate);
            value.changes.upsertComponents[0].responsibility += ' Changed after gate execution.';
            await f.writeJson(candidatePath, value);
            try { f.rejects(f.cli(['validate']), /stale architecturePlanSha256/); }
            finally { await f.writeJson(candidatePath, f.candidate); }
        });
        f.succeeds(f.cli(['promote', candidatePath, foldPath]), 'perform the real proof-only fixture fold');
        assert.equal((await f.readJson('architecture/registry.json')).components.find(value => value.id === ownerId).boundaryState, 'conforming');
        assert.equal((await readdir(path.join(f.directory, 'architecture/candidates'))).length, 0);
        const fold = await f.readJson(foldPath);
        assert.equal(fold.schemaVersion, 3);
        assert.equal(fold.transitionEvidenceValidated, true);
        f.succeeds(f.cli(['validate']), 'strict historical fold replay accepts the real lifecycle');
        await t.test('plan mode still rejects forged historical fold receipt evidence', async () => {
            const value = structuredClone(receipt); value.results[1].args.push('--unexecuted');
            await f.writeJson(receiptPath, value);
            try { f.rejects(f.cli(['validate', '--transition-plan']), /digest does not match|missing passed command/); }
            finally { await f.write(receiptPath, goodReceiptBytes); }
        });
    } finally { await removeFixture(directory); }
});
