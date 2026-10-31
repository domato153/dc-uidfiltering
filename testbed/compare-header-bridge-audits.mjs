import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const required = (flag) => {
    const index = args.indexOf(flag);
    if (index < 0 || !args[index + 1]) throw new Error(`Missing ${flag}`);
    return path.resolve(root, args[index + 1]);
};
const controlPath = required('--control');
const candidatePath = required('--candidate');
const outputPath = required('--output');
const [controlBytes, candidateBytes] = await Promise.all([readFile(controlPath), readFile(candidatePath)]);
const control = JSON.parse(controlBytes.toString('utf8'));
const candidate = JSON.parse(candidateBytes.toString('utf8'));
assert.equal(control.runtimeSha256, '93D9DEB43D829F37CA2DE3320D67BC5E1F31CFC7FD18DABE7353A2DE22F5AFBA');
assert.match(candidate.runtime, /[\\/]testbed[\\/]artifacts[\\/]runtime-under-test\.user\.js$/i);
assert.notEqual(control.runtimeSha256, candidate.runtimeSha256);
assert.equal(control.browser, candidate.browser);
assert.equal(control.observations.length, 4);
assert.equal(candidate.observations.length, control.observations.length);

const declared = [];
const undeclared = [];
let observations = 0;
for (let index = 0; index < control.observations.length; index += 1) {
    const beforeCase = control.observations[index];
    const afterCase = candidate.observations[index];
    assert.equal(afterCase.caseId, beforeCase.caseId);
    assert.equal(afterCase.steps.length, beforeCase.steps.length);
    for (let stepIndex = 0; stepIndex < beforeCase.steps.length; stepIndex += 1) {
        const before = beforeCase.steps[stepIndex];
        const after = afterCase.steps[stepIndex];
        observations += 1;
        assert.equal(after.step, before.step);
        const expected = structuredClone(before);
        if (before.step === 'replacement-disposed') {
            assert.equal(before.popup.nextSiblingIsMarker, false);
            assert.equal(after.popup.nextSiblingIsMarker, true);
            expected.popup.nextSiblingIsMarker = true;
            declared.push({ caseId: beforeCase.caseId, step: before.step, field: 'popup.nextSiblingIsMarker' });
        }
        if (!isDeepStrictEqual(expected, after)) {
            undeclared.push({ caseId: beforeCase.caseId, step: before.step, before, after });
        }
    }
}
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const result = {
    schemaVersion: 1,
    kind: 'header-popup-portal-order-differential',
    controlSha256: control.runtimeSha256,
    candidateSha256: candidate.runtimeSha256,
    controlAuditSha256: hash(controlBytes),
    candidateAuditSha256: hash(candidateBytes),
    observerSha256: hash(await readFile(fileURLToPath(import.meta.url))),
    browser: candidate.browser,
    observations,
    declared,
    undeclared
};
await writeFile(outputPath, JSON.stringify(result, null, 2) + '\n');
console.log(`Header bridge differential: ${undeclared.length ? 'FAIL' : 'PASS'}; ${declared.length} declared, ${undeclared.length} undeclared, ${observations} observations`);
if (undeclared.length) process.exitCode = 1;
