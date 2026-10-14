import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from './prepare-live-extension.mjs';
import { selectCases, caseVerdict, reportVerdict } from '../testbed/harness/live-site-contract.mjs';
import { selectHeaderCases, headerCaseVerdict, headerChecks } from '../testbed/harness/header-live-canary.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.resolve(root, process.argv[2] || 'testbed/artifacts/live-site-canary');
const report = JSON.parse(await readFile(path.join(directory, 'report.json')));
const bytes = await readFile(path.join(root, 'verification/live-site-canary.json'));
const contract = JSON.parse(bytes);
assert.equal(report.schemaVersion, 1);
assert.ok(['actual-tampermonkey-desktop-startup-canary', 'actual-tampermonkey-header-native-canary'].includes(report.kind), 'Unknown live receipt kind');
const headerNative = report.kind === 'actual-tampermonkey-header-native-canary';
const headerBytes = headerNative ? await readFile(path.join(root, 'verification/header-live-canary.json')) : null;
const runtimeContract = headerNative ? JSON.parse(headerBytes) : contract;
if (headerNative) {
    assert.equal(report.suite, 'full');
    assert.equal(report.binding?.headerContractSha256, sha256(headerBytes), 'Stale header live contract');
}
assert.equal(report.binding?.headerObserverSha256, sha256(await readFile(path.join(root, 'testbed/harness/header-live-canary.mjs'))), 'Stale imported header observer');
assert.equal(report.binding?.contractSha256, sha256(bytes), 'Stale live contract');
assert.equal(report.binding?.driverSha256, sha256(await readFile(path.join(root, 'testbed/run-live-site-canary.mjs'))), 'Stale live driver');
assert.equal(report.binding?.browserAdapterSha256, sha256(await readFile(path.join(root, 'testbed/harness/live-site-browser.mjs'))), 'Stale live browser adapter');
assert.equal(report.binding?.contractDriverSha256, sha256(await readFile(path.join(root, 'testbed/harness/live-site-contract.mjs'))), 'Stale verdict contract');
assert.equal(report.binding?.candidatePath, path.join(root, runtimeContract.candidatePath), 'Wrong candidate runtime path');
assert.equal(report.binding?.candidateSha256, sha256(await readFile(path.join(root, runtimeContract.candidatePath))), 'Stale candidate');
assert.equal(report.binding?.controlSha256, runtimeContract.control.sha256);
assert.equal(report.binding?.controlSha256, sha256(await readFile(path.join(root, runtimeContract.control.path))), 'Stale control bytes');
assert.equal(report.binding?.extensionSha256, contract.extension.sha256);
assert.equal(report.binding?.extensionVersion, contract.extension.version);
assert.ok(['chromium', 'installed-chrome'].includes(report.environment.browserFlavor), 'Unknown browser provenance');
for (const role of ['control', 'candidate']) {
    const metadata = report.profiles?.[role]?.browser;
    assert.deepEqual(report.profiles?.[role]?.cleanup, { browserClosed: true, profileRemoved: true }, 'Missing profile cleanup');
    assert.equal(metadata?.flavor, report.environment.browserFlavor, 'Browser flavor mismatch');
    if (metadata.flavor === 'installed-chrome') {
        assert.equal(metadata.registryChanged, false, 'Profile-only route must not change registry');
        assert.equal(metadata.installRoute, 'CDP Extensions.loadUnpacked');
        assert.equal(metadata.extensionVersion, contract.extension.version);
        assert.equal(metadata.browserVersion, report.environment.browserVersion);
        assert.equal(metadata.executableSha256, sha256(await readFile(metadata.executable)), 'Installed Chrome executable changed');
    }
}
const cases = headerNative ? selectHeaderCases(runtimeContract, contract) : selectCases(contract, report.suite);
assert.deepEqual(report.selectedCases, cases.map(c => c.id));
for (const result of report.results) {
    assert.equal(result.url, cases.find(c => c.id === result.id)?.url);
    assert.equal(result.status, (headerNative ? headerCaseVerdict : caseVerdict)(result), 'Forged per-case status');
    if (result.status === 'PASS') {
        if (headerNative) {
            const testCase = cases.find(c => c.id === result.id);
            assert.deepEqual(result.viewport, testCase.viewport);
            assert.equal(result.surface, testCase.surface);
            assert.equal(result.theme, testCase.theme);
            assert.deepEqual(result.environment.viewport, [testCase.viewport.width, testCase.viewport.height]);
            assert.equal(result.environment.gmShimPresent, false);
            assert.equal(result.environment.requestedDark, testCase.theme === 'dark');
            assert.deepEqual(result.checks, headerChecks(result), 'Forged header check summary');
            const [x, , width, height] = result.gnb.box;
            assert.ok(width > 0 && height > 0 && x >= -1 && x + width <= testCase.viewport.width + 1);
        } else {
            assert.deepEqual(result.state.viewport, [1280, 900]);
            assert.equal(result.state.gmShimPresent, false);
            assert.ok(result.hit.positive && result.hit.hits.length === 3 && result.hit.hits.every(Boolean));
            assert.ok(result.state.visibleRows > 0 && result.state.hostRowCount > 0);
        }
        assert.equal(result.dcufErrorCount, 0);
        assert.match(result.screenshot, /^(control|candidate)-[a-z-]+\.png$/);
        const png = await readFile(path.join(directory, result.screenshot));
        assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'Missing screenshot evidence');
    }
}
assert.equal(report.status, reportVerdict(report, headerNative ? headerCaseVerdict : caseVerdict), 'Forged aggregate status');
console.log(`Live receipt replay: ${report.status}; ${report.results.length} observations; candidate ${report.binding.candidateSha256}`);
if (report.status !== 'PASS') process.exitCode = 1;
