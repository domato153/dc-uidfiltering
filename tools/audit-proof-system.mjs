import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { digestEvidenceBytes } from './evidence-binding.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const receiptPath = path.resolve(rootDir, process.argv[2] || 'artifacts/impact.json');
const receipt = JSON.parse(await readFile(receiptPath, 'utf8'));
const auditDir = path.join(rootDir, 'artifacts', 'proof-audit');
await mkdir(auditDir, { recursive: true });
const guardedRuntime = path.join(rootDir, 'testbed', 'artifacts', 'runtime-under-test.user.js');
const guardedName = (await readFile(guardedRuntime, 'utf8')).match(/^\/\/\s*@name\s+(.+)$/m)?.[1]?.trim();
const guardedTarget = guardedName === 'DC_UserFilter_Mobile'
    ? 'mobile'
    : guardedName === 'DCInside PC User Filter' ? 'pc' : null;
if (!guardedTarget) throw new Error(`Proof audit requires a recognized guarded runtime, received ${guardedName || '<missing>'}`);

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

const nonGuardedRuntime = path.join(auditDir, 'non-guarded-runtime.user.js');
await copyFile(guardedRuntime, nonGuardedRuntime);
expectFailure('non-guarded artifact path is rejected', 'node', [
    'testbed/run-tests.mjs',
    '--group',
    'smoke',
    '--require-runtime-under-test',
], {
    env: {
        DCUF_TESTBED_USERSCRIPT: nonGuardedRuntime,
        DCUF_TESTBED_TARGET: guardedTarget,
    },
    pattern: /Runtime guard rejected non-source artifact/,
});

expectFailure('control=candidate differential is rejected', 'node', [
    'tools/run-semantic-differential.mjs',
    '--control', guardedRuntime,
    '--candidate', guardedRuntime,
    '--target', 'mobile',
    '--filter', 'smoke:',
    '--output', path.join(auditDir, 'control-equals-candidate.json'),
], { pattern: /Differential oracle rejected control=candidate digest/ });

expectFailure('presentation-source forbidden GM mutation is rejected', 'node', [
    'tools/verify-ui-boundaries.mjs',
    '--audit-inject-forbidden',
    'mobile-theme-module',
], { pattern: /theme-module\.js:\d+: presentation directly references GM_setValue/ });

expectFailure('mixed architecture without an exit contract is rejected', 'node', [
    'tools/architecture-registry.mjs',
    'validate',
    '--audit-drop-transition',
    'mobile-filter-module',
], { pattern: /mobile-filter-module: mixed boundary requires a transition exit contract/ });

const lfText = Buffer.from('first\nsecond\n', 'utf8');
const crlfText = Buffer.from('first\r\nsecond\r\n', 'utf8');
for (const textPath of ['fixture.mjs', 'playwright-loader.cjs', '.gitattributes']) {
    if (digestEvidenceBytes(textPath, lfText) !== digestEvidenceBytes(textPath, crlfText)) {
        throw new Error(`${textPath}: text evidence hashing is not portable across LF and CRLF checkouts`);
    }
}
if (digestEvidenceBytes('fixture.bin', lfText) === digestEvidenceBytes('fixture.bin', crlfText)) {
    throw new Error('binary evidence hashing silently normalized distinct bytes');
}
console.log('PASS text evidence binding is LF/CRLF portable while binary binding remains byte-exact');

console.log('Proof-system adversarial audit passed: 6 mutations rejected and portable evidence hashing verified.');
