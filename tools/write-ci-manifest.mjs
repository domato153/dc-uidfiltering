import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputArg = process.argv[2] || 'artifacts/ci-manifest.json';
const targets = JSON.parse(await readFile(path.join(rootDir, 'build', 'targets.json'), 'utf8')).targets;

function git(args) {
    const result = spawnSync('git', args, { cwd: rootDir, encoding: 'utf8' });
    return result.status === 0 ? result.stdout.trim() : null;
}

function commandVersion(command, args) {
    const result = spawnSync(command, args, { cwd: rootDir, encoding: 'utf8' });
    return result.status === 0 ? result.stdout.trim() : null;
}

function digest(bytes) {
    return createHash('sha256').update(bytes).digest('hex').toUpperCase();
}

async function describe(relativePath) {
    const absolute = path.join(rootDir, relativePath);
    try {
        await access(absolute);
        const bytes = await readFile(absolute);
        return { path: relativePath.replace(/\\/g, '/'), bytes: bytes.length, sha256: digest(bytes) };
    } catch {
        return { path: relativePath.replace(/\\/g, '/'), missing: true };
    }
}

const mobileName = targets.mobile.outputPattern.replace('{version}', targets.mobile.version);
const pcName = targets.pc.outputPattern.replace('{version}', targets.pc.version);
const files = await Promise.all([
    describe(mobileName),
    describe(`dist/${mobileName}`),
    describe(pcName),
    describe(`dist/${pcName}`),
    describe('testbed/artifacts/runtime-under-test.user.js'),
    describe('pnpm-lock.yaml'),
    describe('architecture/registry.json'),
    describe('verification/gates.json'),
]);
const manifest = {
    schemaVersion: 1,
    sourceHead: git(['rev-parse', 'HEAD']),
    branch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
    targetVersions: { mobile: targets.mobile.version, pc: targets.pc.version },
    toolchain: {
        node: process.version,
        pnpm: commandVersion('pnpm', ['--version']),
        playwright: commandVersion('pnpm', ['exec', 'playwright', '--version']),
    },
    files,
};
const outputPath = path.resolve(rootDir, outputArg);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Wrote ${path.relative(rootDir, outputPath)} for ${manifest.sourceHead}`);
