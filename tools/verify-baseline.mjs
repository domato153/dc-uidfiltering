import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseline = JSON.parse(await readFile(path.join(rootDir, 'verification/baselines.json'), 'utf8'));
const sourceSha = baseline.mobile.behaviorSourceCommit;
if (!/^[a-f0-9]{40}$/.test(sourceSha)) throw new Error('Baseline requires a full source SHA');
const outputDir = path.join(rootDir, 'testbed/artifacts');
await mkdir(outputDir, { recursive: true });
const exportDir = await mkdtemp(path.join(outputDir, 'baseline-export-'));

function run(command, args, cwd = rootDir) {
    const result = spawnSync(command, args, { cwd, maxBuffer: 32 * 1024 * 1024 });
    if (result.status !== 0) throw new Error(result.stderr?.toString() || result.error?.message || command + ' failed');
    return result.stdout;
}
function digest(bytes) { return createHash('sha256').update(bytes).digest('hex').toUpperCase(); }

// Export immutable tracked build inputs, never candidate sources or old
// generated files. Retain the isolated export as diagnostic evidence.
const files = run('git', ['ls-tree', '-r', '--name-only', '-z', sourceSha, '--', 'src', 'tools'])
    .toString('utf8').split('\0').filter(Boolean);
if (!files.includes('tools/build-userscript.mjs')) throw new Error('Baseline build tool is missing');
for (const file of files) {
    const destination = path.resolve(exportDir, file);
    if (!destination.startsWith(exportDir + path.sep)) throw new Error('Invalid baseline input: ' + file);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, run('git', ['show', sourceSha + ':' + file]));
}
const betaPath = path.join(outputDir, 'baseline-mobile-beta.user.js');
process.stdout.write(run(process.execPath, ['tools/build-userscript.mjs', '--testbed-output', betaPath], exportDir));
const betaBytes = await readFile(betaPath);
const betaHash = digest(betaBytes);
if (betaHash !== baseline.mobile.beta.sha256) throw new Error('Baseline beta digest mismatch: ' + betaHash);
const betaText = betaBytes.toString('utf8');
const normalization = baseline.mobile.normalization;
const occurrences = betaText.split(normalization.from).length - 1;
if (occurrences !== normalization.expectedOccurrences) throw new Error('Version normalization count mismatch: ' + occurrences);
const stableBytes = Buffer.from(betaText.split(normalization.from).join(normalization.to), 'utf8');
const stableHash = digest(stableBytes);
if (stableHash !== baseline.mobile.stable.sha256) throw new Error('Baseline stable digest mismatch: ' + stableHash);
await writeFile(path.join(outputDir, 'baseline-mobile-stable.user.js'), stableBytes);
const receipt = {
    schemaVersion: 1, sourceSha, exportDir: path.relative(rootDir, exportDir),
    betaSha256: betaHash, normalizedStableSha256: stableHash, normalizedOccurrences: occurrences,
    candidateSourcesConsumed: false, status: 'passed'
};
await writeFile(path.join(outputDir, 'baseline-lineage.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log('\nBaseline verified from ' + sourceSha + ': ' + betaHash + ' -> ' + stableHash);
