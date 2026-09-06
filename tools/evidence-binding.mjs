import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const normalize = (value) => value.replace(/\\/g, '/');
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const CANONICAL_TEXT_EXTENSIONS = new Set([
    '.cjs', '.css', '.html', '.js', '.json', '.md', '.mjs', '.sh', '.svg', '.toml', '.txt', '.xml', '.yaml', '.yml',
]);
const CANONICAL_TEXT_BASENAMES = new Set(['.gitattributes', '.gitignore', '.gitkeep']);

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

export async function createEvidenceBinding(rootDir) {
    return {
        bindingSchemaVersion: 2,
        registrySha256: digestEvidenceBytes('architecture/registry.json', await readFile(path.join(rootDir, 'architecture', 'registry.json'))),
        architectureStateSha256: await hashPaths(rootDir, [
            'architecture/registry.json',
            'architecture/candidates',
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
            'tools/verify-baseline.mjs',
            'tools/verify-ui-boundaries.mjs',
            'tools/verify-workflows.mjs',
            'tools/verify-skills.mjs',
            'tools/verify-repo.mjs',
            'tools/write-ci-manifest.mjs',
            'testbed/run-palette-differential.mjs',
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
