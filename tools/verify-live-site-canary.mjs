import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from './prepare-live-extension.mjs';
import { selectCases, caseVerdict, reportVerdict } from '../testbed/harness/live-site-contract.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.resolve(root, process.argv[2] || 'testbed/artifacts/live-site-canary');
const report = JSON.parse(await readFile(path.join(directory, 'report.json')));
const bytes = await readFile(path.join(root, 'verification/live-site-canary.json'));
const contract = JSON.parse(bytes);
assert.equal(report.schemaVersion, 1);
assert.equal(report.kind, 'actual-tampermonkey-desktop-startup-canary');
assert.equal(report.binding?.contractSha256, sha256(bytes), 'Stale live contract');
assert.equal(report.binding?.driverSha256, sha256(await readFile(path.join(root, 'testbed/run-live-site-canary.mjs'))), 'Stale live driver');
assert.equal(report.binding?.contractDriverSha256, sha256(await readFile(path.join(root, 'testbed/harness/live-site-contract.mjs'))), 'Stale verdict contract');
assert.equal(report.binding?.candidateSha256, sha256(await readFile(path.join(root, contract.candidatePath))), 'Stale candidate');
assert.equal(report.binding?.controlSha256, contract.control.sha256);
assert.equal(report.binding?.extensionSha256, contract.extension.sha256);
assert.equal(report.binding?.extensionVersion, contract.extension.version);
const cases = selectCases(contract, report.suite);
assert.deepEqual(report.selectedCases, cases.map(c => c.id));
for (const result of report.results) {
    assert.equal(result.url, cases.find(c => c.id === result.id)?.url);
    assert.equal(result.status, caseVerdict(result), 'Forged per-case status');
    if (result.status === 'PASS') {
        assert.deepEqual(result.state.viewport, [1280, 900]);
        assert.equal(result.state.gmShimPresent, false);
        assert.ok(result.hit.positive && result.hit.hits.length === 3 && result.hit.hits.every(Boolean));
        assert.equal(result.dcufErrorCount, 0);
        assert.ok(result.state.visibleRows > 0 && result.state.hostRowCount > 0);
        assert.match(result.screenshot, /^(control|candidate)-[a-z-]+\.png$/);
        const png = await readFile(path.join(directory, result.screenshot));
        assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'Missing screenshot evidence');
    }
}
assert.equal(report.status, reportVerdict(report), 'Forged aggregate status');
console.log(`Live receipt replay: ${report.status}; ${report.results.length} observations; candidate ${report.binding.candidateSha256}`);
if (report.status !== 'PASS') process.exitCode = 1;
