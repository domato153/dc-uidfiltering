import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { CHECKS, selectCases, caseVerdict, reportVerdict } from '../testbed/harness/live-site-contract.mjs';
import { sha256, unpackCrx, verifyPackage } from './prepare-live-extension.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(await readFile(path.join(root, 'verification/live-site-canary.json')));
const driver = await readFile(path.join(root, 'testbed/run-live-site-canary.mjs'), 'utf8');
let count = 0;
const test = (name, run) => { run(); count++; console.log(`PASS ${name}`); };
const copy = value => structuredClone(value);
const positive = { httpStatus: 200, checks: Object.fromEntries(CHECKS.map(key => [key, true])) };
const binding = { candidateSha256: 'A'.repeat(64), controlSha256: 'B'.repeat(64), extensionSha256: 'C'.repeat(64) };
const good = { binding, selectedCases: ['sample'], profiles: Object.fromEntries(['candidate', 'control'].map(role => [role,
    { installed: true, userScriptsAllowed: true, registeredAtDocumentStart: true, isolated: true, servedSha256: binding[role + 'Sha256'] }])),
results: ['candidate', 'control'].map(role => ({ ...copy(positive), role, id: 'sample' })) };

test('wide desktop only; smoke 3/full 4 routes', () => { assert.equal(selectCases(contract, 'smoke').length, 3); assert.equal(selectCases(contract, 'full').length, 4); });
for (const mutation of [c => { c.routes[0].url = 'https://example.org/board/lists/'; },
    c => { c.routes[0].url = 'https://gall.dcinside.com/board/delete/'; }, c => { c.viewports[0].width = 390; },
    c => { c.smokeCases.push('missing'); }, c => { c.candidatePath = 'dist/example.user.js'; },
    c => { c.routes[0].id = '../../escape'; }]) {
    test('unsafe or undeclared contract rejected', () => { const changed = copy(contract); mutation(changed); assert.throws(() => selectCases(changed, 'smoke')); });
}
test('unknown suite rejected', () => assert.throws(() => selectCases(contract, 'skip')));
test('complete actual-extension result passes', () => assert.equal(reportVerdict(good), 'PASS'));
for (const key of CHECKS) test(`candidate missing positive ${key} fails`, () => {
    const changed = copy(good); delete changed.results[0].checks[key]; assert.equal(reportVerdict(changed), 'FAIL');
});
test('control failure retained without blessing a failed candidate', () => {
    const changed = copy(good); changed.results[1].checks.rowsVisible = false;
    assert.equal(caseVerdict(changed.results[1]), 'FAIL'); assert.equal(reportVerdict(changed), 'PASS');
    changed.results[0].checks.rowsVisible = false; assert.equal(reportVerdict(changed), 'FAIL');
});
for (const mutation of [r => { r.results.pop(); }, r => { r.results.push(copy(r.results[0])); },
    r => { r.results[0].unavailable = '403'; }, r => { r.profiles.candidate.installed = false; },
    r => { r.profiles.control.userScriptsAllowed = false; }, r => { r.profiles.candidate.isolated = false; },
    r => { r.profiles.candidate.servedSha256 = 'D'.repeat(64); }, r => { r.binding.candidateSha256 = 'unknown'; },
    r => { r.setupFailure = 'download failed'; }]) {
    test('partial/setup/binding failures cannot pass', () => { const changed = copy(good); mutation(changed); assert.equal(reportVerdict(changed), 'UNAVAILABLE'); });
}

// Minimal stored ZIP/CRX3 fixtures exercise extractor safety without network or browser.
function crx(entries) {
    const local = [], directory = []; let offset = 0;
    for (const [name, text, mode = 0, flags = 0] of entries) {
        const n = Buffer.from(name), data = Buffer.from(text);
        const l = Buffer.alloc(30); l.writeUInt32LE(0x04034b50); l.writeUInt16LE(flags, 6);
        l.writeUInt32LE(data.length, 18); l.writeUInt32LE(data.length, 22); l.writeUInt16LE(n.length, 26);
        const d = Buffer.alloc(46); d.writeUInt32LE(0x02014b50); d.writeUInt16LE(flags, 8);
        d.writeUInt32LE(data.length, 20); d.writeUInt32LE(data.length, 24); d.writeUInt16LE(n.length, 28);
        d.writeUInt32LE((mode << 16) >>> 0, 38); d.writeUInt32LE(offset, 42);
        local.push(l, n, data); directory.push(d, n); offset += l.length + n.length + data.length;
    }
    const central = Buffer.concat(directory), end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(central.length, 12); end.writeUInt32LE(offset, 16);
    const head = Buffer.alloc(12); head.write('Cr24'); head.writeUInt32LE(3, 4);
    return Buffer.concat([head, ...local, central, end]);
}
const manifest = JSON.stringify({ manifest_version: 3, version: '1', permissions: ['userScripts'] });
const packageBytes = crx([['manifest.json', manifest], ['background.js', 'test']]);
test('pinned manifest and extraction accepted', () => assert.equal(verifyPackage(packageBytes, { sha256: sha256(packageBytes), version: '1' }).entries.size, 2));
test('changed package/version rejected', () => {
    assert.throws(() => verifyPackage(packageBytes, { sha256: '0'.repeat(64), version: '1' }));
    assert.throws(() => verifyPackage(packageBytes, { sha256: sha256(packageBytes), version: '2' }));
});
for (const name of ['../escape', '/absolute', 'C:/absolute', 'nested\\escape', 'null\0path']) {
    test('unsafe archive path rejected', () => assert.throws(() => unpackCrx(crx([[name, 'x']]))));
}
test('symlink/encrypted/duplicate/truncated archive rejected', () => {
    assert.throws(() => unpackCrx(crx([['symlink', 'x', 0xa000]])));
    assert.throws(() => unpackCrx(crx([['encrypted', 'x', 0, 1]])));
    assert.throws(() => unpackCrx(crx([['same', 'x'], ['same', 'y']])));
    assert.throws(() => unpackCrx(packageBytes.subarray(0, 20)));
});
test('driver never uses injected runtime or GM shim', () => {
    // Names in the documentation comment are permitted; invocation/import is forbidden.
    assert.ok(!/\.addInitScript\s*\(|gm-shim\.js|createTestPage\s*\(|eval\s*\(/.test(driver), 'Synthetic script injection is forbidden');
});
console.log(`Live-site Canary contracts: ${count} offline tests passed. No live-site PASS is implied.`);
