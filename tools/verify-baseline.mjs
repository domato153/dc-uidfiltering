import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseline = JSON.parse(await readFile(path.join(rootDir, 'verification', 'baselines.json'), 'utf8'));
const target = JSON.parse(await readFile(path.join(rootDir, 'build', 'targets.json'), 'utf8')).targets.mobile;
const outputDir = path.join(rootDir, 'testbed', 'artifacts');
const betaPath = path.join(outputDir, 'baseline-mobile-beta.user.js');
const stablePath = path.join(rootDir, target.outputPattern.replace('{version}', target.version));

function run(command, args) {
    const result = spawnSync(command, args, { cwd: rootDir, encoding: 'utf8' });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.status !== 0) process.exit(result.status || 1);
}

function digest(bytes) {
    return createHash('sha256').update(bytes).digest('hex').toUpperCase();
}

await mkdir(outputDir, { recursive: true });
run(process.execPath, [
    'tools/build-userscript.mjs',
    '--testbed-output',
    path.relative(rootDir, betaPath),
    '--version',
    baseline.mobile.beta.version,
]);
run(process.execPath, ['tools/build-userscript.mjs']);

const [betaBytes, stableBytes] = await Promise.all([readFile(betaPath), readFile(stablePath)]);
const betaHash = digest(betaBytes);
const stableHash = digest(stableBytes);
const betaText = betaBytes.toString('utf8');
const stableText = stableBytes.toString('utf8');
const occurrenceCount = betaText.split(baseline.mobile.normalization.from).length - 1;
const normalized = betaText.split(baseline.mobile.normalization.from).join(baseline.mobile.normalization.to);
const failures = [];

if (target.version !== baseline.mobile.stable.version) {
    failures.push(`configured mobile version ${target.version} != ${baseline.mobile.stable.version}`);
}
if (betaHash !== baseline.mobile.beta.sha256) {
    failures.push(`beta SHA-256 ${betaHash} != ${baseline.mobile.beta.sha256}`);
}
if (stableHash !== baseline.mobile.stable.sha256) {
    failures.push(`stable SHA-256 ${stableHash} != ${baseline.mobile.stable.sha256}`);
}
if (occurrenceCount !== baseline.mobile.normalization.expectedOccurrences) {
    failures.push(`version occurrence count ${occurrenceCount} != ${baseline.mobile.normalization.expectedOccurrences}`);
}
if (normalized !== stableText) {
    failures.push('stable artifact differs from the beta after the declared version-only normalization');
}

console.log('\nBaseline verification');
console.log(` - behavior source: ${baseline.mobile.behaviorSourceCommit}`);
console.log(` - beta SHA-256: ${betaHash}`);
console.log(` - stable SHA-256: ${stableHash}`);
console.log(` - normalized version occurrences: ${occurrenceCount}`);

if (failures.length) {
    for (const failure of failures) console.error(` - ${failure}`);
    process.exitCode = 1;
} else {
    console.log(' - exact baseline: PASS');
}
