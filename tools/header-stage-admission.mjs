import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { createEvidenceBinding, createCandidateFingerprint, digestEvidenceBytes } from './evidence-binding.mjs';
import { readQualifiedPaletteInputs, assertQualifiedInputsUnchanged, runQualifiedMobilePalette } from './run-qualified-mobile-palette.mjs';
import { classifyPaletteOwnerSplit } from './classify-palette-owner-split.mjs';

const CRITERIA = 'verification/receipts/2026-10-20-header-exit-qualification.json';
const CRITERIA_SHA = '8C2B9500A7E181F5EC76D9051943F1F682AE0474F98E04279533E2E5201B87E2';
const sha = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const requireThat = (condition, message) => { if (!condition) throw new Error(message); };
const commandIdentity = item => ({ profile: item.profile, id: item.id, command: item.command,
    args: item.args, env: item.env || {} });

// This adjudicates a failed raw run, never changes it into a passed run-gates
// receipt. The caller must first recompute the route and replay the classifier.
export function assertHeaderGateResults(receipt, commands, classification) {
    requireThat(receipt.status === 'failed', 'raw gate status must remain failed');
    requireThat(classification.classificationStatus === 'DECLARED_OWNER_SPLIT_ONLY'
        && classification.rawStatus === 'FAIL' && classification.rawDifferenceCount === 14
        && isDeepStrictEqual(classification.classifiedSemanticIndexes, [5, 12, 18]),
    'exact header owner classification missing');
    requireThat(['policy', 'acceptance'].every(profile => commands.some(item => item.profile === profile)),
        'required policy and acceptance commands missing');
    requireThat(Array.isArray(receipt.results) && receipt.results.length === commands.length,
        'incomplete required command results');
    let qualified = 0;
    commands.forEach((command, index) => {
        const result = receipt.results[index];
        requireThat(isDeepStrictEqual(commandIdentity(result), commandIdentity(command)),
            `required command changed: ${command.profile}/${command.id}`);
        if (command.profile === 'acceptance' && command.id === 'mobile-observed-palette') {
            requireThat(result.status === 'failed' && result.exitCode === 1, 'raw palette failure must remain visible');
            qualified++;
        } else requireThat(result.status === 'passed' && result.exitCode === 0,
            `required command is not passing: ${command.profile}/${command.id}`);
    });
    requireThat(qualified === 1, 'exactly one raw palette command is required');
    return { rawGateStatus: 'failed', qualifiedCommand: 'acceptance/mobile-observed-palette',
        otherCommandsPassed: commands.length - 1 };
}

export async function writeHeaderStageReceipt(root, { gateReceiptPath, outputPath }) {
    const localPath = (relative, prefix) => {
        requireThat(typeof relative === 'string' && relative.startsWith(prefix) && relative.endsWith('.json')
            && !relative.includes('\\') && !relative.split('/').some(part => ['', '.', '..'].includes(part)),
        `invalid header evidence path: ${relative}`);
        const absolute = path.resolve(root, relative);
        requireThat(absolute.startsWith(root + path.sep), 'header evidence escapes repository');
        return absolute;
    };
    const readJson = async relative => JSON.parse(await readFile(path.join(root, relative), 'utf8'));
    const gateFile = localPath(gateReceiptPath, 'artifacts/');
    const output = localPath(outputPath, 'verification/receipts/');
    requireThat(outputPath !== CRITERIA, 'cannot overwrite the scoped criteria receipt');
    // Invalidate an older success before checking any supplied evidence.
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, JSON.stringify({ kind: 'modernization-stage-assurance', stage: 'header-navigation', status: 'UNKNOWN' }) + '\n');
    const binding = await createEvidenceBinding(root);
    const fingerprint = await createCandidateFingerprint(root);
    const criteriaBytes = await readFile(path.join(root, CRITERIA));
    requireThat(digestEvidenceBytes(CRITERIA, criteriaBytes).toUpperCase() === CRITERIA_SHA,
        'reviewed header criterion packet changed');
    const criteria = JSON.parse(criteriaBytes);
    requireThat(criteria.stageId === 'header-navigation' && criteria.components.length === 6, 'wrong header criterion scope');
    const authorityBytes = await readFile(path.join(root, criteria.criterionAuthority.path));
    requireThat(digestEvidenceBytes(criteria.criterionAuthority.path, authorityBytes).toUpperCase()
        === criteria.criterionAuthority.sha256, 'candidate criterion authority changed');
    const authority = JSON.parse(authorityBytes).changes.upsertComponents;
    for (const component of criteria.components) {
        const current = authority.find(item => item.id === component.componentId);
        requireThat(current?.boundaryState === 'mixed'
            && current.transition?.exitCriteria === component.criterion
            && sha(Buffer.from(component.criterion)) === component.criterionSha256,
        `header criterion changed: ${component.componentId}`);
        for (const source of component.sources) requireThat(sha(await readFile(path.join(root, source.path))) === source.sha256,
            `header source changed: ${source.path}`);
    }
    for (const key of ['sourceInputsSha256', 'harnessSha256', 'fixturesSha256', 'toolchainSha256', 'node']) {
        requireThat(criteria.evidenceBinding[key] === binding[key], `reused header evidence input changed: ${key}`);
    }
    const evidence = [];
    // Frozen scoped evidence is reused only with its exact bytes and direct inputs.
    for (const [id, ref] of Object.entries(criteria.evidence)) {
        const bytes = await readFile(path.join(root, ref.path));
        requireThat(digestEvidenceBytes(ref.path, bytes).toUpperCase() === ref.sha256, `header evidence changed: ${id}`);
        const report = JSON.parse(bytes);
        for (const [input, digest] of Object.entries(report.inputs || {})) {
            requireThat(sha(await readFile(path.join(root, input))) === digest, `header evidence dependency changed: ${input}`);
        }
        if (['nativeExtension', 'startupExtension'].includes(id)) {
            requireThat(report.status === 'PASS' && report.binding?.candidateSha256 === criteria.artifacts.mobile.sha256,
                `actual extension runtime changed: ${id}`);
            for (const [key, file] of Object.entries({
                driverSha256: 'testbed/run-live-site-canary.mjs',
                browserAdapterSha256: 'testbed/harness/live-site-browser.mjs',
                headerObserverSha256: 'testbed/harness/header-live-canary.mjs',
                contractDriverSha256: 'testbed/harness/live-site-contract.mjs',
                contractSha256: 'verification/live-site-canary.json',
                ...(id === 'nativeExtension' ? { headerContractSha256: 'verification/header-live-canary.json' } : {}),
            })) requireThat(sha(await readFile(path.join(root, file))) === report.binding[key],
                `actual extension observer dependency changed: ${file}`);
        }
        evidence.push({ id, ...ref, disposition: 'REUSED_EXACT_DIRECT_INPUTS' });
    }
    const gateBytes = await readFile(gateFile);
    const gates = JSON.parse(gateBytes);
    localPath(gates.impactReceipt, 'artifacts/');
    const route = await readJson(gates.impactReceipt);
    requireThat(digestEvidenceBytes(gates.impactReceipt, await readFile(path.join(root, gates.impactReceipt)))
        === gates.impactReceiptSha256, 'header gate route digest changed');
    assert.deepEqual(gates.evidenceBinding, binding, 'header gate evidence binding changed');
    requireThat(gates.sourceHead === route.head && gates.candidateFingerprint === fingerprint,
        'header gate head or worktree changed');
    const verified = spawnSync(process.execPath, ['tools/run-gates.mjs', gates.impactReceipt, '--verify-receipt-only'],
        { cwd: root, encoding: 'utf8', shell: false });
    requireThat(verified.status === 0, `header gate route is stale: ${verified.stderr || verified.stdout}`);
    const config = await readJson('verification/gates.json');
    const exact = config.profiles['qualified-header-palette'].commands[0];
    const arg = name => exact.args[exact.args.indexOf(name) + 1];
    const options = { qualificationPath: arg('--qualification'), qualificationSha256: arg('--qualification-sha256') };
    // Fresh strict execution clears old reports before running. A crashed raw
    // command cannot qualify merely because an old FAIL file still exists.
    const freshRaw = 'artifacts/header-admission-2026-10-20/palette.json';
    await runQualifiedMobilePalette({ ...options, output: freshRaw });
    const input = await readQualifiedPaletteInputs(options);
    requireThat(input.qualification.candidateSha256 === criteria.artifacts.mobile.sha256, 'header runtime changed');
    const paletteCommand = route.resolvedCommands.find(item => item.profile === 'acceptance' && item.id === 'mobile-observed-palette');
    requireThat(paletteCommand?.args[0] === 'testbed/run-palette-differential.mjs', 'raw comparator changed');
    const rawPath = paletteCommand.args[paletteCommand.args.indexOf('--output') + 1];
    localPath(rawPath, 'artifacts/');
    input.reportBytes = await readFile(path.join(root, rawPath));
    input.report = JSON.parse(input.reportBytes);
    for (const side of ['control', 'candidate']) input[side + 'SideBytes'] = await readFile(path.join(root,
        'testbed/artifacts', `${path.basename(rawPath)}.${side}.json`));
    input.probe = await readJson(freshRaw + '.lifecycle.json');
    await assertQualifiedInputsUnchanged(input);
    const classification = classifyPaletteOwnerSplit(input);
    const result = assertHeaderGateResults(gates, route.resolvedCommands, classification);
    for (const [target, artifact] of Object.entries(criteria.artifacts)) {
        const targets = (await readJson('build/targets.json')).targets;
        const name = targets[target].outputPattern.replace('{version}', targets[target].version);
        for (const file of [name, `dist/${name}`]) requireThat(sha(await readFile(path.join(root, file))) === artifact.sha256,
            `header ${target} artifact changed`);
    }
    assert.deepEqual(await createEvidenceBinding(root), binding, 'header inputs changed during adjudication');
    requireThat(sha(await readFile(gateFile)) === sha(gateBytes), 'raw gate receipt changed during adjudication');
    requireThat(await createCandidateFingerprint(root) === fingerprint, 'worktree changed during adjudication');
    const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', shell: false }).stdout.trim();
    requireThat(head === gates.sourceHead, 'HEAD changed during header adjudication');
    const receipt = { schemaVersion: 1, kind: 'modernization-stage-assurance', stage: 'header-navigation',
        status: 'PASS', scope: 'EXACT_HEADER_STAGE_WITH_DECLARED_OWNER_DELTA', sourceHead: head,
        candidateFingerprint: fingerprint, evidenceBinding: binding, artifacts: criteria.artifacts,
        criterionAuthority: criteria.criterionAuthority,
        components: criteria.components.map(item => ({ componentId: item.componentId, criterionSha256: item.criterionSha256,
            sources: item.sources, disposition: 'SUPPORTED', boundaryState: 'mixed' })),
        evidence: [...evidence, { id: 'scopedCriteria', path: CRITERIA, sha256: CRITERIA_SHA },
            { id: 'currentRawGates', path: gateReceiptPath,
                sha256: digestEvidenceBytes(gateReceiptPath, gateBytes), rawStatus: gates.status },
            { id: 'currentRawPalette', path: rawPath, sha256: sha(input.reportBytes), rawStatus: 'FAIL' },
            ...await Promise.all(['', '.qualified.json', '.lifecycle.json'].map(async suffix => ({
                id: 'freshPalette' + (suffix || 'Raw'), path: freshRaw + suffix,
                sha256: digestEvidenceBytes(freshRaw + suffix, await readFile(path.join(root, freshRaw + suffix))) })))],
        results: result, classification,
        proofInputs: await Promise.all(['tools/header-stage-admission.mjs', 'tools/test-header-stage-admission.mjs',
            'tools/write-modernization-receipt.mjs'].map(async file => ({ path: file,
            sha256: digestEvidenceBytes(file, await readFile(path.join(root, file))) }))),
        architectureTransitionAdmitted: false, liveCanary: 'SCOPED_PUBLIC_NATIVE_AND_STARTUP',
        limits: [...criteria.limits, 'No accepted-registry fold, release, whole-UI or Concept01 completion claim.'] };
    await writeFile(output, JSON.stringify(receipt, null, 2) + '\n');
    console.log(`Header stage: PASS; raw gates remain FAILED; ${result.otherCommandsPassed} other commands passed; boundaries remain mixed`);
    return receipt;
}
