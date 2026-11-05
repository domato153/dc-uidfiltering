import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEvidenceBinding } from './evidence-binding.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

function valueAfter(flag, required = false) {
    const index = args.indexOf(flag);
    const value = index >= 0 ? args[index + 1] : null;
    if (required && !value) throw new Error(`Missing required argument: ${flag}`);
    return value;
}

function digest(bytes) {
    return createHash('sha256').update(bytes).digest('hex').toUpperCase();
}

const controlPath = path.resolve(rootDir, valueAfter('--control', true));
const candidatePath = path.resolve(rootDir, valueAfter('--candidate', true));
const target = String(valueAfter('--target', true)).toLowerCase();
const outputPath = path.resolve(rootDir, valueAfter('--output', true));
const group = valueAfter('--group');
const filter = valueAfter('--filter');
const excludeFilter = valueAfter('--exclude-filter');
if (!['mobile', 'pc'].includes(target)) throw new Error(`Unsupported target: ${target}`);

const [controlBytes, candidateBytes] = await Promise.all([readFile(controlPath), readFile(candidatePath)]);
const controlSha256 = digest(controlBytes);
const candidateSha256 = digest(candidateBytes);
if (controlSha256 === candidateSha256) {
    throw new Error(`Differential oracle rejected control=candidate digest: ${controlSha256}`);
}

async function runSide(label, userscriptPath) {
    const commandArgs = ['testbed/run-tests.mjs'];
    if (group) commandArgs.push('--group', group);
    if (filter) commandArgs.push('--filter', filter);
    if (excludeFilter) commandArgs.push('--exclude-filter', excludeFilter);
    const result = spawnSync(process.execPath, commandArgs, {
        cwd: rootDir,
        encoding: 'utf8',
        shell: false,
        maxBuffer: 64 * 1024 * 1024,
        env: {
            ...process.env,
            DCUF_TESTBED_USERSCRIPT: userscriptPath,
            DCUF_TESTBED_TARGET: target,
        },
    });
    const combined = `${result.stdout || ''}${result.stderr || ''}`;
    process.stdout.write(`\n[${label}] ${path.relative(rootDir, userscriptPath)}\n${combined}`);
    if (result.status !== 0) throw new Error(`${label} semantic run failed with exit ${result.status}`);
    const report = JSON.parse(await readFile(path.join(rootDir, 'testbed', 'artifacts', 'test-results-latest.json'), 'utf8'));
    if (!Array.isArray(report.results) || report.results.length === 0) throw new Error(`${label} selected no semantic tests`);
    return report.results.map(({ name, group: testGroup, status, error }) => ({
        name,
        group: testGroup,
        status,
        ...(error ? { error } : {}),
    }));
}

const controlResults = await runSide('control', controlPath);
const candidateResults = await runSide('candidate', candidatePath);
const controlIdentity = controlResults.map(({ name, group: testGroup }) => `${testGroup}\0${name}`);
const candidateIdentity = candidateResults.map(({ name, group: testGroup }) => `${testGroup}\0${name}`);
if (JSON.stringify(controlIdentity) !== JSON.stringify(candidateIdentity)) {
    throw new Error('Differential oracle selected different test identities for control and candidate');
}
const failures = [...controlResults, ...candidateResults].filter((item) => item.status !== 'passed');
if (failures.length) throw new Error(`Differential oracle observed ${failures.length} non-passing result(s)`);

const receipt = {
    schemaVersion: 1,
    kind: 'test-outcome-differential',
    generatedAt: new Date().toISOString(),
    target,
    selection: { group: group || null, filter: filter || null, excludeFilter: excludeFilter || null },
    control: { path: path.relative(rootDir, controlPath).replace(/\\/g, '/'), sha256: controlSha256 },
    candidate: { path: path.relative(rootDir, candidatePath).replace(/\\/g, '/'), sha256: candidateSha256 },
    oracle: {
        distinctArtifactDigests: true,
        independentNodeProcesses: true,
        freshBrowserContextPerTest: true,
        sharedCurrentHarnessAndFixtures: true,
        comparedFields: ['test identity', 'status'],
    },
    evidenceBinding: await createEvidenceBinding(rootDir),
    results: { control: controlResults, candidate: candidateResults },
    sameTestOutcomes: true,
};
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(`Test-outcome differential passed: ${target}, ${controlResults.length} tests per artifact.`);
console.log(`Receipt: ${path.relative(rootDir, outputPath)}`);
