import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const normalize = (value) => value.replace(/\\/g, '/');
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

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
    entries.push(`${relative}\0${digest(await readFile(absolutePath))}`);
}

export async function hashPaths(rootDir, relativePaths) {
    const entries = [];
    for (const relativePath of [...relativePaths].sort()) await collect(rootDir, relativePath, entries);
    return digest(Buffer.from(entries.join('\n')));
}

export async function createEvidenceBinding(rootDir) {
    return {
        registrySha256: digest(await readFile(path.join(rootDir, 'architecture', 'registry.json'))),
        gatesSha256: digest(await readFile(path.join(rootDir, 'verification', 'gates.json'))),
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
            'package.json',
            'pnpm-lock.yaml',
            'testbed/package.json',
        ]),
        node: process.version,
    };
}

export function assertEvidenceBinding(expected, actual) {
    for (const [key, value] of Object.entries(actual)) {
        if (expected?.[key] !== value) {
            throw new Error(`Stale evidence receipt: ${key} expected ${expected?.[key] || '<missing>'}, actual ${value}`);
        }
    }
}
