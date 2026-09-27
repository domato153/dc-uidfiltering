import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertEvidenceBinding, createCandidateFingerprint, createEvidenceBinding, digestEvidenceBytes } from './evidence-binding.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stageIndex = process.argv.indexOf('--stage');
const outputIndex = process.argv.indexOf('--output');
const stage = stageIndex >= 0 ? process.argv[stageIndex + 1] : null;
const outputArg = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;
if (!stage || stage.startsWith('--') || !outputArg || outputArg.startsWith('--')) {
    throw new Error('Usage: node tools/write-modernization-receipt.mjs --stage <id> --output <verification/receipts/*.json>');
}
const stageConfigs = Object.freeze({
    'foundation-sealing': Object.freeze({
        inputPrefix: 'foundation',
        expectedMobileResults: 97,
        minimumRejectedMutations: 48,
        minimumAcceptedControls: 8,
    }),
    'shared-ui-boundary': Object.freeze({
        inputPrefix: 'shared-boundary',
        expectedMobileResults: 97,
        minimumRejectedMutations: 54,
        minimumAcceptedControls: 9,
    }),
    'tokens-settings-palette': Object.freeze({
        inputPrefix: 'tokens-settings',
        expectedMobileResults: 98,
        minimumRejectedMutations: 57,
        minimumAcceptedControls: 9,
    }),
    'list-search-paging': Object.freeze({
        inputPrefix: 'list-search-paging',
        expectedMobileResults: 99,
        minimumRejectedMutations: 58,
        minimumAcceptedControls: 9,
        listDifferential: true,
    }),
    'article-recommendation': Object.freeze({
        inputPrefix: 'article-recommendation',
        expectedMobileResults: 99,
        minimumRejectedMutations: 59,
        minimumAcceptedControls: 9,
        articleDifferential: true,
    }),
    'comments-replies': Object.freeze({
        inputPrefix: 'comments-replies',
        expectedMobileResults: 99,
        minimumRejectedMutations: 63,
        minimumAcceptedControls: 9,
        commentDifferential: true,
    }),
    'write-edit-delete-popup': Object.freeze({
        inputPrefix: 'write-edit-delete-popup',
        expectedMobileResults: 115,
        minimumRejectedMutations: 64,
        minimumAcceptedControls: 9,
        nativeFormDifferential: true,
    }),
});
const stageConfig = stageConfigs[stage];
if (!stageConfig) throw new Error(`Unsupported modernization receipt stage: ${stage}`);

const outputPath = path.resolve(rootDir, outputArg);
const receiptRoot = `${path.resolve(rootDir, 'verification', 'receipts')}${path.sep}`;
if (!outputPath.startsWith(receiptRoot) || !outputPath.endsWith('.json')) throw new Error('Modernization receipts must be JSON files inside verification/receipts');

const evidenceBinding = await createEvidenceBinding(rootDir);
const inputs = Object.freeze({
    mobile: `artifacts/${stageConfig.inputPrefix}-mobile-results.json`,
    host: `artifacts/${stageConfig.inputPrefix}-host-results.json`,
    pc: `artifacts/${stageConfig.inputPrefix}-pc-results.json`,
    mobileDifferential: `artifacts/${stageConfig.inputPrefix}-mobile-differential.json`,
    pcDifferential: `artifacts/${stageConfig.inputPrefix}-pc-differential.json`,
    ...(stageConfig.listDifferential ? { listDifferential: `artifacts/${stageConfig.inputPrefix}-list-differential.json` } : {}),
    ...(stageConfig.articleDifferential ? { articleDifferential: `artifacts/${stageConfig.inputPrefix}-article-differential.json` } : {}),
    ...(stageConfig.commentDifferential ? { commentDifferential: `artifacts/${stageConfig.inputPrefix}-comment-differential.json` } : {}),
    ...(stageConfig.nativeFormDifferential ? { nativeFormDifferential: `artifacts/${stageConfig.inputPrefix}-native-form-differential.json` } : {}),
    proof: `artifacts/${stageConfig.inputPrefix}-proof-audit.json`,
});
const records = {};
for (const [id, relative] of Object.entries(inputs)) records[id] = JSON.parse(await readFile(path.join(rootDir, relative), 'utf8'));

function requirePassedTests(id, expectedTarget, expectedCount) {
    const report = records[id];
    if (report.runtime?.target !== expectedTarget) throw new Error(`${id}: wrong target ${report.runtime?.target || '<missing>'}`);
    const failures = (report.results || []).filter((item) => item.status !== 'passed');
    if (report.results?.length !== expectedCount || failures.length) throw new Error(`${id}: expected ${expectedCount} passes and zero failures`);
    return report.runtime.sha256;
}

const mobileSha256 = requirePassedTests('mobile', 'mobile', stageConfig.expectedMobileResults);
const pcSha256 = requirePassedTests('pc', 'pc', 14);
const hostResults = records.host.results || [];
if (hostResults.length !== 11 || hostResults.some((item) => item.status !== 'passed')) throw new Error('host: expected 11 passes and zero failures');
if (records.host.runtime?.sha256 !== mobileSha256) throw new Error('host: runtime digest differs from mobile candidate');
for (const [id, target, candidateSha256] of [
    ['mobileDifferential', 'mobile', mobileSha256],
    ['pcDifferential', 'pc', pcSha256],
]) {
    const report = records[id];
    if (report.target !== target || report.equivalent !== true || (report.differences || []).length !== 0) throw new Error(`${id}: semantic differential did not pass`);
    if (report.candidateSha256 !== candidateSha256) throw new Error(`${id}: candidate digest differs from test report`);
    if (report.controlSha256 === report.candidateSha256) throw new Error(`${id}: control and candidate artifacts are identical`);
    assertEvidenceBinding(report.evidenceBinding, evidenceBinding);
}
if (stageConfig.listDifferential) {
    const report = records.listDifferential;
    if (report.kind !== 'observed-list-semantic-differential'
        || report.target !== 'mobile'
        || report.equivalent !== true
        || (report.differences || []).length !== 0) {
        throw new Error('listDifferential: semantic differential did not pass');
    }
    if (report.candidateSha256 !== mobileSha256) throw new Error('listDifferential: candidate digest differs from test report');
    if (report.controlSha256 === report.candidateSha256) throw new Error('listDifferential: control and candidate artifacts are identical');
    assertEvidenceBinding(report.evidenceBinding, evidenceBinding);
}
if (stageConfig.articleDifferential) {
    const report = records.articleDifferential;
    if (report.kind !== 'observed-article-semantic-differential'
        || report.target !== 'mobile'
        || report.equivalent !== true
        || (report.differences || []).length !== 0) {
        throw new Error('articleDifferential: semantic differential did not pass');
    }
    if (report.candidateSha256 !== mobileSha256) throw new Error('articleDifferential: candidate digest differs from test report');
    if (report.controlSha256 === report.candidateSha256) throw new Error('articleDifferential: control and candidate artifacts are identical');
    assertEvidenceBinding(report.evidenceBinding, evidenceBinding);
}
if (stageConfig.commentDifferential) {
    const report = records.commentDifferential;
    if (report.kind !== 'observed-comment-semantic-differential'
        || report.target !== 'mobile'
        || report.equivalent !== true
        || (report.differences || []).length !== 0) {
        throw new Error('commentDifferential: semantic differential did not pass');
    }
    if (report.candidateSha256 !== mobileSha256) throw new Error('commentDifferential: candidate digest differs from test report');
    if (report.controlSha256 === report.candidateSha256) throw new Error('commentDifferential: control and candidate artifacts are identical');
    assertEvidenceBinding(report.evidenceBinding, evidenceBinding);
}
if (stageConfig.nativeFormDifferential) {
    const report = records.nativeFormDifferential;
    if (report.kind !== 'observed-native-form-semantic-differential'
        || report.target !== 'mobile'
        || report.equivalent !== true
        || (report.differences || []).length !== 0) {
        throw new Error('nativeFormDifferential: semantic differential did not pass');
    }
    if (report.candidateSha256 !== mobileSha256) throw new Error('nativeFormDifferential: candidate digest differs from test report');
    if (report.controlSha256 === report.candidateSha256) throw new Error('nativeFormDifferential: control and candidate artifacts are identical');
    assertEvidenceBinding(report.evidenceBinding, evidenceBinding);
}
if (records.proof.status !== 'passed'
    || records.proof.rejectedMutations < stageConfig.minimumRejectedMutations
    || records.proof.acceptedControls < stageConfig.minimumAcceptedControls) {
    throw new Error('proof: adversarial audit result is incomplete');
}
if (records.proof.runtime?.target !== 'mobile'
    || String(records.proof.runtime?.sha256 || '').toLowerCase() !== mobileSha256.toLowerCase()) {
    throw new Error('proof: guarded runtime differs from the mobile candidate');
}
const proofImpactPath = String(records.proof.impactReceipt || '');
const proofImpactBytes = await readFile(path.join(rootDir, proofImpactPath));
if (records.proof.impactReceiptSha256 !== digestEvidenceBytes(proofImpactPath, proofImpactBytes)) {
    throw new Error('proof: impact receipt digest is stale');
}
assertEvidenceBinding(records.proof.evidenceBinding, evidenceBinding);

for (const [label, args] of [
    ['architecture', ['tools/architecture-registry.mjs', 'validate']],
    ['modernization assurance', ['tools/verify-modernization-assurance.mjs']],
    ['UI boundaries', ['tools/verify-ui-boundaries.mjs']],
    ['repository', ['tools/verify-repo.mjs', 'all']],
]) {
    const result = spawnSync(process.execPath, args, { cwd: rootDir, encoding: 'utf8', shell: false });
    if (result.status !== 0) throw new Error(`${label} verification failed:\n${result.stdout || ''}\n${result.stderr || ''}`);
}

for (const [relative, expected] of [
    ['Dc_UserFilter_Mobile_v3.5.5.user.js', mobileSha256],
    ['dist/Dc_UserFilter_Mobile_v3.5.5.user.js', mobileSha256],
    ['dcinside_user_filter_v1.9.9.user.js', pcSha256],
    ['dist/dcinside_user_filter_v1.9.9.user.js', pcSha256],
]) {
    const actual = createHash('sha256').update(await readFile(path.join(rootDir, relative))).digest('hex').toUpperCase();
    if (actual !== expected) throw new Error(`${relative}: artifact digest mismatch`);
}

const receipt = {
    schemaVersion: 1,
    kind: 'modernization-stage-assurance',
    stage,
    status: 'PASS',
    sourceHead: git(['rev-parse', 'HEAD']),
    candidateFingerprint: await createCandidateFingerprint(rootDir),
    evidenceBinding,
    artifacts: {
        mobile: { version: '3.5.5', sha256: mobileSha256 },
        pc: { version: '1.9.9', sha256: pcSha256 },
    },
    evidence: await Promise.all(Object.entries(inputs).map(async ([id, relative]) => ({
        id,
        path: relative,
        sha256: digestEvidenceBytes(relative, await readFile(path.join(rootDir, relative))),
        applicability: 'applicable',
    }))),
    results: {
        mobile: { passed: stageConfig.expectedMobileResults, failed: 0 },
        host: { passed: 11, failed: 0 },
        pc: { passed: 14, failed: 0 },
        semanticDifferences: 0,
        rawDifferencesPreserved: records.mobileDifferential.rawDifferences.length
            + records.pcDifferential.rawDifferences.length
            + (records.listDifferential?.rawDifferences?.length || 0)
            + (records.articleDifferential?.rawDifferences?.length || 0)
            + (records.commentDifferential?.rawDifferences?.length || 0),
        rejectedMutations: records.proof.rejectedMutations,
        acceptedControls: records.proof.acceptedControls,
    },
    liveCanary: 'UNKNOWN',
};
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(`Wrote ${path.relative(rootDir, outputPath)} for candidate ${receipt.candidateFingerprint}`);

function git(args) {
    const result = spawnSync('git', args, { cwd: rootDir, encoding: 'utf8', shell: false });
    if (result.status !== 0) throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed`);
    return result.stdout.trim();
}
