import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const receiptArg = process.argv[2];
if (!receiptArg) throw new Error('Usage: node tools/run-gates.mjs <impact-receipt.json> [result.json]');
const resultArg = process.argv[3];
const onlyIndex = process.argv.indexOf('--only');
const onlyProfiles = onlyIndex >= 0 ? new Set((process.argv[onlyIndex + 1] || '').split(',').filter(Boolean)) : null;
const receipt = JSON.parse(await readFile(path.resolve(rootDir, receiptArg), 'utf8'));
const seen = new Set();
const results = [];

for (const item of receipt.resolvedCommands || []) {
    if (onlyProfiles && !onlyProfiles.has(item.profile)) continue;
    const key = JSON.stringify([item.command, item.args]);
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`\n[gate:${item.profile}/${item.id}] ${item.command} ${item.args.join(' ')}`);
    const startedAt = Date.now();
    const result = spawnSync(item.command, item.args, {
        cwd: rootDir,
        stdio: 'inherit',
        shell: false,
        env: { ...process.env, DCUF_TESTBED_USERSCRIPT: path.join(rootDir, 'testbed', 'artifacts', 'runtime-under-test.user.js') },
    });
    results.push({
        profile: item.profile,
        id: item.id,
        command: item.command,
        args: item.args,
        exitCode: result.status ?? 1,
        durationMs: Date.now() - startedAt,
    });
}

const output = {
    schemaVersion: 1,
    sourceHead: receipt.head,
    impactReceipt: normalizePath(receiptArg),
    status: results.every((result) => result.exitCode === 0) ? 'passed' : 'failed',
    results,
};
if (resultArg) {
    const resultPath = path.resolve(rootDir, resultArg);
    await mkdir(path.dirname(resultPath), { recursive: true });
    await writeFile(resultPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
}
console.log(`\nGate result: ${output.status.toUpperCase()} (${results.filter((result) => result.exitCode !== 0).length} failures)`);
if (output.status !== 'passed') process.exitCode = 1;

function normalizePath(value) {
    return value.replace(/\\/g, '/');
}
