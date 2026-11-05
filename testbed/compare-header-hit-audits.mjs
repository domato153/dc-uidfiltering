import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const required = (flag) => {
    const index = args.indexOf(flag);
    if (index < 0 || !args[index + 1]) throw new Error(`Missing ${flag}`);
    return path.resolve(root, args[index + 1]);
};
const controlPath = required('--control');
const candidatePath = required('--candidate');
const output = required('--output');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const controlBytes = await readFile(controlPath);
const candidateBytes = await readFile(candidatePath);
const control = JSON.parse(controlBytes);
const candidate = JSON.parse(candidateBytes);
const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };

check(control.sha256 === hash(await readFile(control.runtime)), 'control artifact digest drift');
check(candidate.sha256 === hash(await readFile(candidate.runtime)), 'candidate artifact digest drift');
check(control.sha256 !== candidate.sha256, 'control and candidate artifacts are identical');
check(control.browser === candidate.browser, 'browser version differs');
check(control.observations.length === candidate.observations.length, 'observation counts differ');
check(control.failures.length > 0 && candidate.failures.length === 0, 'positive hit repair was not demonstrated');

const unaffected = ['title', 'issueHeading', 'issueActions', 'sourceRank', 'relationAction',
    'listOption', 'listTab', 'listSelect'];
const allowedSemantic = [];
let unaffectedBoxCount = 0;
for (const [index, original] of control.observations.entries()) {
    const changed = candidate.observations[index];
    if (!changed) break;
    const name = `${original.caseId}/${original.step}`;
    check(name === `${changed.caseId}/${changed.step}`, `${name}: observation order drift`);
    const narrow = /^minor-list-(390|750)/.test(original.caseId);
    const permitted = new Set();
    if (/^minor-list-390/.test(original.caseId) && original.step === 'toggle-pointer') permitted.add('drawerOpen');
    if (narrow && ['rank-pointer', 'rank-close-pointer'].includes(original.step)) {
        permitted.add('rankCalls');
        permitted.add('rankDisplay');
    }
    for (const key of new Set([...Object.keys(original.semantic), ...Object.keys(changed.semantic)])) {
        if (JSON.stringify(original.semantic[key]) === JSON.stringify(changed.semantic[key])) continue;
        if (!permitted.has(key)) errors.push(`${name}: undeclared semantic delta ${key}`);
        else allowedSemantic.push({ caseId: original.caseId, step: original.step, field: key });
    }
    if (original.step === 'initial') {
        for (const selector of unaffected) {
            check(JSON.stringify(original.elements[selector]?.box) === JSON.stringify(changed.elements[selector]?.box),
                `${name}: unaffected ${selector} geometry drift`);
            unaffectedBoxCount += 1;
        }
    }
    if (!original.caseId.startsWith('minor-list')) continue;
    for (const side of [original, changed]) {
        const invariant = side.semantic;
        check(invariant.sourceOriginal && invariant.rankPopupOriginal && invariant.rankContentOriginal
            && invariant.rankCloseOriginal && invariant.relationPopupOriginal && invariant.relationContentOriginal,
        `${name}: original host/popup descendant identity lost`);
        check(invariant.rankItemCount === 100 && invariant.sourceRankHandler === invariant.cloneRankHandler,
            `${name}: original rank content or handler drift`);
        check(invariant.rankPopupParent?.tag === 'BODY' && invariant.relationPopupParent?.className === 'issue_wrap',
            `${name}: popup parent drift`);
    }
}

const result = {
    schemaVersion: 1,
    kind: 'header-hit-intended-geometry-differential',
    controlSha256: control.sha256,
    candidateSha256: candidate.sha256,
    controlObservationSha256: hash(controlBytes),
    candidateObservationSha256: hash(candidateBytes),
    browser: candidate.browser,
    observations: candidate.observations.length,
    controlFailureCount: control.failures.length,
    candidateFailureCount: candidate.failures.length,
    unaffectedBoxCount,
    allowedSemantic,
    errors,
};
await writeFile(output, JSON.stringify(result, null, 2) + '\n');
console.log(`Header hit differential: ${result.observations} matched observations; ${unaffectedBoxCount} unaffected boxes; ${allowedSemantic.length} declared semantic deltas; ${errors.length} errors`);
if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
}
