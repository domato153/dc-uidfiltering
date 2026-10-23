import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { assert, launchBrowser } from './harness/runner-utils.mjs';

const directory = await mkdtemp(path.resolve('testbed/artifacts/visual-review-test-'));
const browser = await launchBrowser();
try {
    const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
    await page.setContent('<style>body{margin:0;background:white}button{margin:20px;width:100px;height:40px;border:0;background:teal;color:white}</style><button>Menu</button>');
    await page.screenshot({ path: path.join(directory, 'reference.png'), animations: 'disabled' });
    await page.locator('button').evaluate(node => { node.style.transform = 'translateY(25px)'; });
    await page.screenshot({ path: path.join(directory, 'changed.png'), animations: 'disabled' });
} finally { await browser.close(); }

const base = { schemaVersion: 1, purpose: 'regression', provenance: { environment: 'same browser/context', reference: 'test fixture, not product approval' } };
const caseFor = (candidate, reference = 'reference.png') => ({ id: 'menu', width: 320, height: 180, theme: 'light', reference: path.relative(process.cwd(), path.join(directory, reference)), candidate: path.relative(process.cwd(), path.join(directory, candidate)) });
async function run(name, item, expectedCode, assessment) {
    const manifest = path.join(directory, `${name}.json`), output = path.join(directory, name);
    await writeFile(manifest, JSON.stringify({ ...base, cases: [item], ...(assessment ? { assessment } : {}) }));
    const result = spawnSync(process.execPath, ['tools/visual-review.mjs', '--manifest', manifest, '--output', output], { encoding: 'utf8', env: process.env });
    assert.equal(result.status, expectedCode, `${name}: ${result.stdout}\n${result.stderr}`);
    return JSON.parse(await readFile(path.join(output, 'review.json'), 'utf8'));
}
const same = await run('unchanged', caseFor('reference.png'), 0);
assert.equal(same.status, 'PIXEL_MATCH');
assert.equal(same.referenceFidelity?.status, 'NOT_REVIEWED', 'Pixel equality alone must not imply a design judgement');
const changed = await run('shifted-control', caseFor('changed.png'), 1);
assert.equal(changed.status, 'DIFFERENCES_REQUIRE_REVIEW');
assert.equal(changed.productApproved, false);
const assessment = {
    reviewer: 'Transfer fixture, not an autonomous beauty evaluation',
    basis: 'Compare the selected reference before considering implementation changes or test results',
    limitations: 'Tests validate review binding and unresolved-findings handling, not perception',
    cases: [{
        id: 'menu', referenceSha256: changed.cases[0].files.reference.sha256,
        candidateSha256: changed.cases[0].files.candidate.sha256,
        summary: 'The candidate control is visibly below its reference position.',
        findings: [{ disposition: 'FIX', expected: 'Control on the reference baseline', actual: 'Control shifted down 25px', action: 'Restore the reference baseline' }]
    }]
};
const reviewed = await run('reviewed-gap', caseFor('changed.png'), 1, assessment);
assert.equal(reviewed.referenceFidelity.status, 'NEEDS_WORK');
assert.equal(reviewed.productApproved, false);
const positive = structuredClone(assessment);
positive.cases[0].candidateSha256 = same.cases[0].files.candidate.sha256;
positive.cases[0].summary = 'Identical selected reference; no visible difference in this fixture.';
positive.cases[0].findings = [];
assert.equal((await run('reviewed-reference', caseFor('reference.png'), 0, positive)).referenceFidelity.status, 'REVIEWED');
const stale = structuredClone(assessment);
stale.cases[0].candidateSha256 = same.cases[0].files.candidate.sha256;
assert.equal((await run('stale-review', caseFor('changed.png'), 2, stale)).status, 'INVALID_INPUT');
assert.equal((await run('missing-case-review', caseFor('reference.png'), 2, { ...positive, cases: [] })).status, 'INVALID_INPUT');
const unknown = structuredClone(positive);
unknown.cases[0].findings = [{ disposition: 'UNKNOWN', expected: 'Reference material in motion', actual: 'Only a still image is supplied', action: 'Inspect motion only when it enters scope' }];
assert.equal((await run('unknown-review', caseFor('reference.png'), 0, unknown)).referenceFidelity.status, 'UNVERIFIED');
const missing = await run('missing-reference', caseFor('changed.png', 'absent.png'), 2);
assert.equal(missing.status, 'INVALID_INPUT');
const wrongSize = await run('wrong-size', { ...caseFor('reference.png'), width: 390 }, 2);
assert.equal(wrongSize.status, 'INVALID_INPUT');
await writeFile(path.join(directory, 'corrupt.png'), (await readFile(path.join(directory, 'reference.png'))).subarray(0, 32));
const corrupt = await run('corrupt-image', caseFor('corrupt.png', 'corrupt.png'), 2);
assert.equal(corrupt.status, 'INVALID_INPUT', 'Matching broken image bytes are not a visual pass');
assert.equal(corrupt.referenceFidelity.status, 'INVALID_INPUT', 'An undecodable image cannot retain a valid fidelity result');
const after = await readFile(path.join(directory, 'reference.png'));
assert.equal(after.equals(await readFile(path.join(directory, 'unchanged/baselines/menu.png'))), true);
assert.equal(after.equals(await readFile(path.join(directory, 'shifted-control/baselines/menu.png'))), true, 'Failure cannot update a baseline');
console.log(`Visual review transfer: pixel checks preserved; missing judgement remains NOT_REVIEWED; exact reviewed reference admitted; unresolved/unknown/stale/missing-case reviews handled; baselines preserved. This does not test autonomous aesthetic detection. ${directory}`);
