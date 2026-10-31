import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policy = JSON.parse(await readFile(path.join(rootDir, 'verification/research-selection.json'), 'utf8'));
const rationale = await readFile(path.join(rootDir, 'docs/work/DECISION_RATIONALE.md'), 'utf8');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const unique = (values) => new Set(values).size === values.length;

function selectTier(signals) {
    const selected = new Set(signals);
    if (selected.has('conflictingEvidence') && selected.has('highConsequence')) return 'ER3';
    if ([
        'explicitExternalResearch', 'competingMethods', 'novelFailure', 'generalizedClaim',
        'internalEvidenceGap', 'testPlanPrecedent', 'conflictingEvidence',
    ].some((signal) => selected.has(signal))) return 'ER2';
    if (selected.has('currentExternalAuthority')) return 'ER1';
    return 'ER0';
}

check(policy.schemaVersion === 1, 'schemaVersion must be 1');
check(JSON.stringify(policy.tiers) === JSON.stringify(['ER0', 'ER1', 'ER2', 'ER3']), 'tier order changed');
check(unique(policy.signals), 'duplicate signal');
check(unique(policy.cases.map((entry) => entry.id)), 'duplicate case ID');
check(JSON.stringify(Object.keys(policy.selectionRule).sort()) === JSON.stringify([...policy.tiers].sort()), 'selection rule is incomplete');
for (const [tier, description] of Object.entries(policy.selectionRule)) {
    check(typeof description === 'string' && description.length > 40, `${tier}: empty selection rule`);
}
for (const entry of policy.cases) {
    check(['positive', 'negative', 'overlap', 'held-out'].includes(entry.category), `${entry.id}: invalid category`);
    check(Array.isArray(entry.signals) && unique(entry.signals), `${entry.id}: invalid signal list`);
    for (const signal of entry.signals || []) check(policy.signals.includes(signal), `${entry.id}: unknown signal ${signal}`);
    check(selectTier(entry.signals || []) === entry.expectedTier, `${entry.id}: expected ${entry.expectedTier}, got ${selectTier(entry.signals || [])}`);
}
for (const category of ['positive', 'negative', 'overlap', 'held-out']) {
    check(policy.cases.some((entry) => entry.category === category), `missing ${category} case`);
}
for (const tier of policy.tiers) check(policy.cases.some((entry) => entry.expectedTier === tier), `no ${tier} control`);

const entries = [...rationale.matchAll(/^## (D-\d+) — .+$/gm)];
check(entries.length > 0 && unique(entries.map((entry) => entry[1])), 'decision rationale has no unique decision IDs');
for (const [index, entry] of entries.entries()) {
    const body = rationale.slice(entry.index + entry[0].length, entries[index + 1]?.index ?? rationale.length);
    for (const field of ['SELECTED', 'NOT ADOPTED', 'DEFERRED', 'Reason', 'Evidence', 'Revisit']) {
        check(new RegExp(`^- ${field}: .+`, 'm').test(body), `${entry[1]}: missing ${field}`);
    }
}
check(rationale.includes('not') && rationale.includes('PASS'), 'decision rationale must distinguish choices from PASS');

if (failures.length) {
    console.error('Research selection verification failed:');
    for (const failure of failures) console.error(` - ${failure}`);
    process.exitCode = 1;
} else {
    console.log(`Research selection verification passed: ${policy.cases.length} positive/negative/overlap/held-out controls and ${entries.length} decision entries.`);
}
