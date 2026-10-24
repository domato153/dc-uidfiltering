import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const admission = await import('./header-stage-admission.mjs').catch(error => {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
    return {};
});
assert.equal(typeof admission.assertHeaderGateResults, 'function',
    'Header completion needs an explicit consumer of the raw failed gate and exact owner classification');
const gates = JSON.parse(await readFile('verification/gates.json'));
const commands = ['policy', 'acceptance'].flatMap(profile =>
    gates.profiles[profile].commands.map(command => ({ profile, ...command })));
const results = commands.map(command => ({ ...command, exitCode: 0, status: 'passed' }));
const palette = results.find(item => item.profile === 'acceptance' && item.id === 'mobile-observed-palette');
palette.exitCode = 1;
palette.status = 'failed';
const receipt = { status: 'failed', results };
const classification = { classificationStatus: 'DECLARED_OWNER_SPLIT_ONLY', rawStatus: 'FAIL',
    classifiedSemanticIndexes: [5, 12, 18], rawDifferenceCount: 14 };
const check = (r = receipt, c = classification) => admission.assertHeaderGateResults(r, commands, c);
assert.equal(check().rawGateStatus, 'failed');
let rejected = 0;
const reject = (name, mutate, pattern) => {
    const r = structuredClone(receipt), c = structuredClone(classification);
    mutate(r, c);
    assert.throws(() => check(r, c), pattern, name);
    rejected++;
};
reject('another failure', r => { r.results[0].exitCode = 1; r.results[0].status = 'failed'; }, /failed|passing/);
reject('missing required command', r => { r.results.pop(); }, /complete|command/);
reject('duplicated command', r => { r.results.push(r.results[0]); }, /complete|command/);
reject('blocked command', r => { r.results[0].exitCode = null; r.results[0].status = 'blocked'; }, /failed|passing/);
reject('substituted command', r => { r.results[0].args = ['--skip']; }, /command/);
reject('substituted environment', r => { r.results[0].env = { SKIP: '1' }; }, /command/);
reject('relabeled raw PASS', r => { r.status = 'passed'; }, /raw/);
reject('hidden raw failure', r => { const p = r.results.find(x => x.id === 'mobile-observed-palette'); p.exitCode = 0; p.status = 'passed'; }, /raw/);
reject('unknown classification', (_, c) => { c.classificationStatus = 'ALLOW_CURRENT'; }, /classification/);
reject('extra normalized state', (_, c) => { c.classifiedSemanticIndexes.push(19); }, /classification/);
reject('different raw count', (_, c) => { c.rawDifferenceCount = 15; }, /classification/);
console.log(`Header stage adjudication: exact raw FAIL accepted; ${rejected} false completions rejected`);
