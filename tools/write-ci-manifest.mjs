import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputArg = process.argv[2] || 'artifacts/ci-manifest.json';
const targets = JSON.parse(await readFile(path.join(rootDir, 'build', 'targets.json'), 'utf8')).targets;
const rootPackage = JSON.parse(await readFile(path.join(rootDir, 'package.json'), 'utf8'));
const testbedPackage = JSON.parse(await readFile(path.join(rootDir, 'testbed', 'package.json'), 'utf8'));

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
const pnpmVersion = process.platform === 'win32'
    ? commandVersion(process.execPath, [path.join(path.dirname(process.execPath), 'node_modules', 'corepack', 'dist', 'corepack.js'), 'pnpm', '--version'])
    : commandVersion('pnpm', ['--version']);
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
    schemaVersion: 2,
    sourceHead: git(['rev-parse', 'HEAD']),
    branch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
    targetVersions: { mobile: targets.mobile.version, pc: targets.pc.version },
    toolchain: {
        node: process.version,
        pnpm: pnpmVersion,
        playwright: commandVersion(process.execPath, [path.join(rootDir, 'testbed', 'node_modules', 'playwright', 'cli.js'), '--version']),
    },
    files,
};
const issues = [];
if (!/^[0-9a-f]{40}$/.test(manifest.sourceHead || '')) issues.push('sourceHead is missing or is not an exact commit SHA');
for (const [name, version] of Object.entries(manifest.toolchain)) {
    if (!version) issues.push(`toolchain.${name} is missing`);
}
const expectedToolchain = {
    node: `v${rootPackage.engines.node}`,
    pnpm: rootPackage.packageManager.replace(/^pnpm@/, ''),
    playwright: `Version ${testbedPackage.devDependencies.playwright}`,
};
for (const [name, expected] of Object.entries(expectedToolchain)) {
    if (manifest.toolchain[name] && manifest.toolchain[name] !== expected) {
        issues.push(`toolchain.${name} is ${manifest.toolchain[name]}, expected ${expected}`);
    }
}
for (const file of manifest.files) {
    if (file.missing) issues.push(`artifact is missing: ${file.path}`);
}
manifest.status = issues.length === 0 ? 'passed' : 'incomplete';
manifest.issues = issues;
const outputPath = path.resolve(rootDir, outputArg);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Wrote ${path.relative(rootDir, outputPath)} for ${manifest.sourceHead}`);
if (issues.length) {
    console.error(`CI manifest is incomplete:\n${issues.map((issue) => ` - ${issue}`).join('\n')}`);
    process.exitCode = 1;
}
