import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertEvidenceBinding, createEvidenceBinding, createCandidateFingerprint, hashPaths, digestEvidenceBytes } from './evidence-binding.mjs';
import { assertTrackedContentClean } from './git-tree-state.mjs';
import { executeGateSequence } from './gate-execution.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const receiptArg = process.argv[2];
if (!receiptArg) throw new Error('Usage: node tools/run-gates.mjs <impact-receipt.json> [result.json]');
const resultArg = process.argv[3]?.startsWith('--') ? null : process.argv[3];
const onlyIndex = process.argv.indexOf('--only');
if (onlyIndex >= 0 && (!process.argv[onlyIndex + 1] || process.argv[onlyIndex + 1].startsWith('--'))) {
    throw new Error('--only requires at least one selected profile');
}
const onlyProfiles = onlyIndex >= 0 ? new Set(process.argv[onlyIndex + 1].split(',').filter(Boolean)) : null;
if (onlyProfiles?.size === 0) throw new Error('--only requires at least one selected profile');
const receiptPath = path.resolve(rootDir, receiptArg);
const receiptBytes = await readFile(receiptPath);
const receipt = JSON.parse(receiptBytes.toString('utf8'));
if (receipt.schemaVersion !== 2 || !['git-diff', 'worktree'].includes(receipt.routeSource)) {
    throw new Error('Executable impact receipts must be schema 2 routes derived from git diff or the current worktree');
}
const gitHead = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: rootDir, encoding: 'utf8' });
if (gitHead.status !== 0) throw new Error(gitHead.stderr.trim() || 'Unable to resolve HEAD');
if (gitHead.stdout.trim() !== receipt.head) {
    throw new Error(`Wrong-head receipt: expected ${receipt.head}, actual ${gitHead.stdout.trim()}`);
}
assertEvidenceBinding(receipt.evidenceBinding, await createEvidenceBinding(rootDir));
const routeArgs = ['tools/resolve-impact.mjs', '--base', receipt.base, '--head', receipt.head];
if (receipt.routeSource === 'worktree') routeArgs.push('--worktree');
if (receipt.full) routeArgs.push('--full');
const resolvedRoute = spawnSync(process.execPath, routeArgs, { cwd: rootDir, encoding: 'utf8', shell: false });
if (resolvedRoute.status !== 0) {
    throw new Error(resolvedRoute.stderr.trim() || 'Unable to recompute impact route');
}
const recomputed = JSON.parse(resolvedRoute.stdout);
for (const key of ['schemaVersion', 'routeSource', 'full', 'base', 'head', 'candidateFingerprint', 'continuitySha256', 'changedFiles', 'generatedFiles', 'boundedScope', 'selectedComponents', 'selectedProfiles', 'resolvedCommands', 'unmappedFiles']) {
    if (JSON.stringify(receipt[key]) !== JSON.stringify(recomputed[key])) {
        throw new Error(`Impact route mismatch: ${key} does not match a fresh git-derived route`);
    }
}
if (!Array.isArray(receipt.resolvedCommands) || receipt.resolvedCommands.length === 0) {
    throw new Error('Impact route resolved no executable gate commands');
}
if (onlyProfiles) {
    const gates = JSON.parse(await readFile(path.join(rootDir, 'verification', 'gates.json'), 'utf8'));
    for (const profile of onlyProfiles) {
        if (!Object.hasOwn(gates.profiles || {}, profile)) throw new Error(`--only references an unknown gate profile: ${profile}`);
    }
}
if (process.argv.includes('--verify-receipt-only')) {
    console.log(`Evidence receipt and git-derived route are current for ${receipt.head}.`);
    process.exit(0);
}
const assertCurrentInputs = async () => {
    const actualHead = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: rootDir, encoding: 'utf8', shell: false });
    if (actualHead.status !== 0 || actualHead.stdout.trim() !== receipt.head) throw new Error('Wrong-head receipt: HEAD changed during gate execution');
    if (receipt.routeSource === 'git-diff') assertTrackedContentClean(rootDir, receipt.head);
    else {
        if (receipt.candidateFingerprint !== await createCandidateFingerprint(rootDir)
            || receipt.continuitySha256 !== await hashPaths(rootDir, ['docs/work/CURRENT_STATE.md', 'docs/work/NEXT_TASK.md'])) {
            throw new Error('Stale worktree receipt: candidate or continuity inputs changed');
        }
    }
};
await assertCurrentInputs();
const commands = receipt.resolvedCommands.filter(item => !onlyProfiles || onlyProfiles.has(item.profile));
const resultPath = resultArg ? path.resolve(rootDir, resultArg) : null;
if (resultPath) await mkdir(path.dirname(resultPath), { recursive: true });
const snapshot = results => ({
    schemaVersion: 2,
    sourceHead: receipt.head,
    routeSource: receipt.routeSource,
    candidateFingerprint: receipt.candidateFingerprint,
    impactReceipt: normalizePath(receiptArg),
    impactReceiptSha256: digestEvidenceBytes(normalizePath(receiptArg), receiptBytes),
    evidenceBinding: receipt.evidenceBinding,
    status: results.length < commands.length ? 'in-progress' : results.length === 0 ? 'not-applicable'
        : results.every(result => result.exitCode === 0) ? 'passed' : 'failed',
    results,
});
const persist = async results => { if (resultPath) await writeFile(resultPath, `${JSON.stringify(snapshot(results), null, 2)}\n`, 'utf8'); };
await persist([]);
const results = await executeGateSequence(commands, async item => {
    await assertCurrentInputs();
    console.log(`\n[gate:${item.profile}/${item.id}] ${item.command} ${item.args.join(' ')}`);
    const result = spawnSync(item.command, item.args, {
        cwd: rootDir,
        stdio: 'inherit',
        shell: false,
        env: {
            ...process.env,
            DCUF_TESTBED_USERSCRIPT: path.join(rootDir, 'testbed', 'artifacts', 'runtime-under-test.user.js'),
            DCUF_TESTBED_REPORT: path.join(rootDir, 'testbed', 'artifacts', `${item.profile}-${item.id}-results.json`),
            ...(item.env || {}),
        },
    });
    await assertCurrentInputs();
    return result.status ?? 1;
}, persist);
const output = snapshot(results);
console.log(`\nGate result: ${output.status.toUpperCase()} (${results.filter((result) => result.exitCode !== 0).length} failures)`);
if (output.status === 'failed') process.exitCode = 1;

function normalizePath(value) {
    return value.replace(/\\/g, '/');
}
