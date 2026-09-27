import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const normalize = (value) => value.replace(/\\/g, '/');
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const CANONICAL_TEXT_EXTENSIONS = new Set([
    '.cjs', '.css', '.html', '.js', '.json', '.md', '.mjs', '.sh', '.svg', '.toml', '.txt', '.xml', '.yaml', '.yml',
]);
const CANONICAL_TEXT_BASENAMES = new Set(['.gitattributes', '.gitignore', '.gitkeep']);
const CANDIDATE_EXCLUSIONS = Object.freeze([
    /^(?:artifacts|dist|node_modules|testbed\/artifacts|verification\/receipts)\//,
    /^docs\/work\/(?:CURRENT_STATE|NEXT_TASK)\.md$/,
    /^(?:Dc_UserFilter_Mobile_v[^/]+|dcinside_user_filter_v[^/]+)\.user\.js$/,
    /^debug\.log$/,
]);

export function digestEvidenceBytes(relativePath, bytes) {
    const extension = path.extname(relativePath).toLowerCase();
    const basename = path.basename(relativePath).toLowerCase();
    if (!CANONICAL_TEXT_EXTENSIONS.has(extension) && !CANONICAL_TEXT_BASENAMES.has(basename)) return digest(bytes);
    const canonical = Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
    return digest(canonical);
}

async function collect(rootDir, relativePath, entries) {
    const absolutePath = path.join(rootDir, relativePath);
    const info = await stat(absolutePath);
    if (info.isDirectory()) {
        const children = await readdir(absolutePath);
        for (const child of children.sort()) {
            await collect(rootDir, path.join(relativePath, child), entries);
        }
        return;
    }
    const relative = normalize(path.relative(rootDir, absolutePath));
    entries.push(`${relative}\0${digestEvidenceBytes(relative, await readFile(absolutePath))}`);
}

export async function hashPaths(rootDir, relativePaths) {
    const entries = [];
    for (const relativePath of [...relativePaths].sort()) await collect(rootDir, relativePath, entries);
    return digest(Buffer.from(entries.join('\n')));
}

export function listCandidateFiles(rootDir) {
    const listed = spawnSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], { cwd: rootDir, encoding: 'utf8', shell: false });
    if (listed.status !== 0) throw new Error(listed.stderr.trim() || 'Unable to enumerate candidate files');
    return listed.stdout.split('\0').filter(Boolean).map(normalize)
        .filter((relative) => !CANDIDATE_EXCLUSIONS.some((pattern) => pattern.test(relative))).sort();
}

export function listChangedCandidateFiles(rootDir) {
    const run = (args) => {
        const result = spawnSync('git', args, { cwd: rootDir, encoding: 'utf8', shell: false });
        if (result.status !== 0) throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed`);
        return result.stdout.split('\0').filter(Boolean).map(normalize);
    };
    return [...new Set([
        ...run(['diff', '--name-only', '-z']),
        ...run(['diff', '--cached', '--name-only', '-z']),
        ...run(['ls-files', '--others', '--exclude-standard', '-z']),
    ])].filter((relative) => !CANDIDATE_EXCLUSIONS.some((pattern) => pattern.test(relative))).sort();
}

export async function createCandidateFingerprint(rootDir) {
    const entries = [];
    for (const relative of listCandidateFiles(rootDir)) {
        let bytes;
        try {
            bytes = await readFile(path.join(rootDir, relative));
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
            bytes = Buffer.from('<deleted>', 'utf8');
        }
        entries.push(`${relative}\0${digestEvidenceBytes(relative, bytes)}`);
    }
    return digest(Buffer.from(entries.join('\n')));
}

function architecturePlanCandidate(candidate) {
    const planned = structuredClone(candidate);
    for (const evidence of planned.transitionExits || []) delete evidence.gateReceiptSha256;
    return planned;
}

export function digestArchitecturePlan(registryBytes, candidates) {
    const entries = [`architecture/registry.json\0${digestEvidenceBytes('architecture/registry.json', registryBytes)}`];
    for (const candidate of [...candidates].sort((a, b) => a.relativePath.localeCompare(b.relativePath))) {
        const relative = normalize(candidate.relativePath);
        const canonical = Buffer.from(`${JSON.stringify(architecturePlanCandidate(candidate.value), null, 2)}\n`, 'utf8');
        entries.push(`${relative}\0${digestEvidenceBytes(relative, canonical)}`);
    }
    return digest(Buffer.from(entries.join('\n')));
}

async function hashArchitecturePlan(rootDir) {
    const architectureDir = path.join(rootDir, 'architecture');
    const registryBytes = await readFile(path.join(architectureDir, 'registry.json'));
    const candidateNames = (await readdir(path.join(architectureDir, 'candidates')))
        .filter((name) => name.endsWith('.json'))
        .sort();
    const candidates = await Promise.all(candidateNames.map(async (name) => ({
        relativePath: normalize(path.join('architecture', 'candidates', name)),
        value: JSON.parse(await readFile(path.join(architectureDir, 'candidates', name), 'utf8')),
    })));
    return digestArchitecturePlan(registryBytes, candidates);
}

export async function createEvidenceBinding(rootDir) {
    return {
        bindingSchemaVersion: 4,
        registrySha256: digestEvidenceBytes('architecture/registry.json', await readFile(path.join(rootDir, 'architecture', 'registry.json'))),
        architectureStateSha256: await hashPaths(rootDir, [
            'architecture/registry.json',
            'architecture/candidates',
        ]),
        architecturePlanSha256: await hashArchitecturePlan(rootDir),
        modernizationContractSha256: await hashPaths(rootDir, [
            'docs/work/MOBILE_UI_MODERNIZATION.md',
            'architecture/ui-surfaces.json',
            'verification/intended-deltas.json',
            'verification/semantic-observation-schema.json',
            'verification/state-model.json',
            'verification/assurance-case.json',
            'verification/continuity-contract.json',
            'verification/research-selection.json',
        ]),
        gatesSha256: digestEvidenceBytes('verification/gates.json', await readFile(path.join(rootDir, 'verification', 'gates.json'))),
        sourceInputsSha256: await hashPaths(rootDir, [
            'build/targets.json',
            'src',
            'tools/build-userscript.mjs',
            'tools/build-pc-filter-userscript.mjs',
        ]),
        harnessSha256: await hashPaths(rootDir, [
            'testbed/harness',
            'testbed/server',
            'testbed/run-tests.mjs',
            'testbed/run-host-compatibility.mjs',
            'testbed/run-bfcache.mjs',
        ]),
        fixturesSha256: await hashPaths(rootDir, [
            'testbed/fixtures',
            'testbed/public',
            'testbed/evidence/live',
        ]),
        toolchainSha256: await hashPaths(rootDir, [
            '.gitattributes',
            'package.json',
            'pnpm-lock.yaml',
            'testbed/package.json',
        ]),
        proofSystemSha256: await hashPaths(rootDir, [
            'tools/architecture-state.mjs',
            'tools/architecture-registry.mjs',
            'tools/evidence-binding.mjs',
            'tools/resolve-impact.mjs',
            'tools/run-gates.mjs',
            'tools/audit-proof-system.mjs',
            'tools/run-semantic-differential.mjs',
            'tools/classify-page-head-visual-delta.mjs',
            'tools/test-page-head-visual-delta.mjs',
            'tools/verify-baseline.mjs',
            'tools/verify-ui-boundaries.mjs',
            'tools/inspect-live-architecture.mjs',
            'tools/test-live-architecture.mjs',
            'tools/verify-modernization-assurance.mjs',
            'tools/verify-research-selection.mjs',
            'tools/write-modernization-receipt.mjs',
            'tools/verify-workflows.mjs',
            'tools/verify-skills.mjs',
            'tools/verify-repo.mjs',
            'tools/write-ci-manifest.mjs',
            'tools/inspect-continuity.mjs',
            'verification/skill-routing-cases.json',
            '.agents/skills/dcuf-long-work-continuity',
            '.agents/skills/dcuf-semantic-architecture',
            '.agents/skills/dcuf-evidence-adversarial-selection',
            'testbed/run-palette-differential.mjs',
            'testbed/run-article-differential.mjs',
            'testbed/run-comment-differential.mjs',
            'testbed/run-native-form-differential.mjs',
        ]),
        node: process.version,
    };
}

export function assertEvidenceBinding(expected, actual) {
    const expectedKeys = Object.keys(expected || {}).sort();
    const actualKeys = Object.keys(actual).sort();
    if (JSON.stringify(expectedKeys) !== JSON.stringify(actualKeys)) {
        throw new Error(`Stale evidence receipt: binding keys expected ${expectedKeys.join(',') || '<missing>'}, actual ${actualKeys.join(',')}`);
    }
    for (const [key, value] of Object.entries(actual)) {
        if (expected?.[key] !== value) {
            throw new Error(`Stale evidence receipt: ${key} expected ${expected?.[key] || '<missing>'}, actual ${value}`);
        }
    }
}
