import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const receiptPath = path.resolve(rootDir, process.argv[2] || 'artifacts/impact.json');
const receipt = JSON.parse(await readFile(receiptPath, 'utf8'));
const auditDir = path.join(rootDir, 'artifacts', 'proof-audit');
await mkdir(auditDir, { recursive: true });

function expectFailure(label, command, args, { env = {}, pattern } = {}) {
    const result = spawnSync(command, args, {
        cwd: rootDir,
        encoding: 'utf8',
        shell: false,
        env: { ...process.env, ...env },
    });
    const output = `${result.stdout || ''}\n${result.stderr || ''}`;
    if (result.status === 0) throw new Error(`${label}: mutation was not rejected`);
    if (pattern && !pattern.test(output)) {
        throw new Error(`${label}: failed for the wrong reason\n${output}`);
    }
    console.log(`PASS ${label}`);
}

const wrongHeadPath = path.join(auditDir, 'wrong-head.json');
await writeFile(wrongHeadPath, `${JSON.stringify({ ...receipt, head: '0'.repeat(40) }, null, 2)}\n`, 'utf8');
expectFailure('wrong-head receipt is rejected', 'node', [
    'tools/run-gates.mjs',
    path.relative(rootDir, wrongHeadPath),
    '--verify-receipt-only',
], { pattern: /Wrong-head receipt/ });

const staleBindingPath = path.join(auditDir, 'stale-binding.json');
await writeFile(staleBindingPath, `${JSON.stringify({
    ...receipt,
    evidenceBinding: { ...receipt.evidenceBinding, harnessSha256: '0'.repeat(64) },
}, null, 2)}\n`, 'utf8');
expectFailure('stale harness receipt is rejected', 'node', [
    'tools/run-gates.mjs',
    path.relative(rootDir, staleBindingPath),
    '--verify-receipt-only',
], { pattern: /Stale evidence receipt: harnessSha256/ });

expectFailure('non-guarded artifact path is rejected', 'node', [
    'testbed/run-tests.mjs',
    '--group',
    'smoke',
    '--require-runtime-under-test',
], {
    env: {
        DCUF_TESTBED_USERSCRIPT: path.join(rootDir, 'dcinside_user_filter.user.js'),
        DCUF_TESTBED_TARGET: 'mobile',
    },
    pattern: /Runtime guard rejected non-source artifact/,
});

console.log('Proof-system adversarial audit passed: 3 mutations rejected.');
