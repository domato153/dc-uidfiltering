import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { createEvidenceBinding } from './evidence-binding.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), '..');
const CONTROL_SHA = '32BA208DDD9973A7EEC343F01E963A833AB4F0C084987077EDAE46844383C25D';
const CANDIDATE_SHA = 'C84AD9220A060CC3AF91F3039F07B13FAD75521DA63201046E3693F875DC03C7';
const LIST_GEOMETRY_SCOPE = 'Only the native list toolbar `.list_array_option::after` pseudo-element on list routes: `display,width,minWidth,height,minHeight,content,clear` transition from the retired clearfix to no generated content; no heading or interactive host node.';
const LIST_COLOR_SCOPE = "Only the non-rendered `.list_array_option::after` pseudo-element's computed `color,borderColor` after its `content:none` transition, in light and dark list states.";
const RELATION_SCOPE = 'Only the original list-route `.issue_wrap > #relation_popup`: `position:static→relative` and `z-index:auto→3` on the popup itself, with unchanged box/parent/descendants/handlers and positive open-state hit reachability.';
const CASE_STEPS = Object.freeze({
    'major-list-390': ['initial', 'pointer-search', 'keyboard-search', 'title-replaced'],
    'minor-list-390': ['initial', 'pointer-search', 'keyboard-search', 'relation-open', 'native-actions', 'title-replaced', 'issue-replaced'],
    'mini-list-390': ['initial', 'pointer-search', 'keyboard-search', 'title-replaced'],
    'minor-list-750': ['initial', 'pointer-search', 'keyboard-search', 'relation-open', 'native-actions', 'title-replaced', 'issue-replaced'],
    'minor-list-750-dark': ['initial', 'pointer-search', 'keyboard-search', 'relation-open', 'native-actions', 'title-replaced', 'issue-replaced'],
    'mini-list-1280': ['initial', 'pointer-search', 'keyboard-search', 'title-replaced'],
    'major-view-750': ['initial', 'pointer-search', 'keyboard-search', 'title-replaced'],
    'minor-view-750-dark': ['initial', 'pointer-search', 'keyboard-search', 'title-replaced'],
    'minor-write-1280': ['initial'],
});
const LIST_GEOMETRY = Object.freeze({
    'visual.listOptionAfterStyle.display': ['table', 'block'],
    'visual.listOptionAfterStyle.width': ['0px', 'auto'],
    'visual.listOptionAfterStyle.minWidth': ['auto', '0px'],
    'visual.listOptionAfterStyle.height': ['0px', 'auto'],
    'visual.listOptionAfterStyle.minHeight': ['auto', '0px'],
    'visual.listOptionAfterStyle.content': ['""', 'none'],
    'visual.listOptionAfterStyle.clear': ['both', 'none'],
});
const RELATION_GEOMETRY = Object.freeze({
    'visual.popupStyle.position': ['static', 'relative'],
    'visual.popupStyle.zIndex': ['auto', '3'],
});
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const requireTrue = (condition, message) => { if (!condition) throw new Error(message); };

export function recomputeRawDifferences(controlSide, candidateSide) {
    const differences = [];
    controlSide.observations.forEach((control, index) => {
        const candidate = candidateSide.observations[index];
        for (const field of ['semantic', 'visual']) {
            if (!candidate || !isDeepStrictEqual(control[field], candidate[field])) {
                differences.push({ caseId: control.caseId, step: control.step, field, control: control[field], candidate: candidate?.[field] ?? null });
            }
        }
    });
    if (controlSide.observations.length !== candidateSide.observations.length) {
        differences.push({ field: 'observation-count', control: controlSide.observations.length, candidate: candidateSide.observations.length });
    }
    if (controlSide.browser !== candidateSide.browser) differences.push({ field: 'browser', control: controlSide.browser, candidate: candidateSide.browser });
    return differences;
}

function changedLeaves(control, candidate, prefix, output) {
    if (isDeepStrictEqual(control, candidate)) return;
    if (control && candidate && typeof control === 'object' && typeof candidate === 'object'
        && !Array.isArray(control) && !Array.isArray(candidate)) {
        for (const key of new Set([...Object.keys(control), ...Object.keys(candidate)])) {
            changedLeaves(control[key], candidate[key], `${prefix}.${key}`, output);
        }
        return;
    }
    output.push({ path: prefix, control, candidate });
}

function hasActiveScope(deltas, id, surface, kind, scope) {
    const contract = deltas.contracts?.find((entry) => entry.id === id);
    return contract?.status === 'active' && contract.surfaces?.includes(surface)
        && contract.allowed?.some((entry) => entry.surface === surface && entry.kind === kind
            && entry.scope === scope && Array.isArray(entry.contractTests) && entry.contractTests.length > 0);
}

function positiveCandidateChecks(observation) {
    const { caseId, step, semantic, visual } = observation;
    requireTrue(semantic && visual, `${caseId}/${step}: missing semantic or visual observation`);
    if (visual.input) requireTrue(visual.input.width > 0 && visual.input.height > 0 && visual.inputHit === true,
        `${caseId}/${step}: search input is not positively reachable`);
    if (step === 'pointer-search') requireTrue(semantic.submitCount === 1 && visual.submit?.width > 0 && visual.submitHit === true,
        `${caseId}/${step}: pointer search did not reach native submit`);
    if (step === 'keyboard-search') requireTrue(semantic.submitCount === 2 && semantic.focus === 'search-input',
        `${caseId}/${step}: keyboard search/focus is not positive`);
    if (step === 'relation-open') requireTrue(semantic.popupDisplay === 'block' && semantic.originalRelationPopup === true
        && semantic.parentClasses?.[4] === 'issue_wrap' && visual.relationPopup?.width > 0
        && visual.relationPopup?.height > 0 && visual.popupHit === true && visual.popupHitTarget,
    `${caseId}/${step}: original relation popup is not positively reachable`);
    if (step === 'native-actions') requireTrue(semantic.hostActions?.relation === 2 && semantic.hostActions?.guide === 1
        && semantic.hostActions?.issue === 1 && visual.relationHit === true && visual.guideHit === true
        && visual.moreHit === true, `${caseId}/${step}: native heading actions are not positive`);
}

function rawPositiveChecks(side) {
    const entries = side.observations;
    return {
        positivePointerSearch: entries.some((entry) => entry.step === 'pointer-search'
            && entry.semantic.submitCount === 1 && entry.visual.submitHit && entry.visual.submit?.width > 0),
        positiveKeyboardSearch: entries.some((entry) => entry.step === 'keyboard-search'
            && entry.semantic.submitCount === 2 && entry.semantic.focus === 'search-input'),
        positiveNativeActions: entries.some((entry) => entry.step === 'native-actions'
            && entry.semantic.hostActions?.relation === 2 && entry.semantic.hostActions?.guide === 1
            && entry.semantic.hostActions?.issue === 1 && entry.visual.relationHit
            && entry.visual.guideHit && entry.visual.moreHit),
        positivePopup: entries.some((entry) => entry.step === 'relation-open'
            && entry.semantic.popupDisplay === 'block' && entry.semantic.originalRelationPopup
            && entry.visual.relationPopup?.width > 0 && entry.visual.popupHit),
    };
}

export function classifyPageHeadDelta(input) {
    const { report, controlSide, candidateSide, controlBytes, candidateBytes, observerBytes,
        currentBinding, deltas, rawReportBytes, controlSideBytes, candidateSideBytes, deltasBytes, classifierBytes } = input;
    requireTrue(isDeepStrictEqual(JSON.parse(rawReportBytes), report), 'raw report bytes/object mismatch');
    requireTrue(isDeepStrictEqual(JSON.parse(controlSideBytes), controlSide), 'control side bytes/object mismatch');
    requireTrue(isDeepStrictEqual(JSON.parse(candidateSideBytes), candidateSide), 'candidate side bytes/object mismatch');
    requireTrue(isDeepStrictEqual(JSON.parse(deltasBytes), deltas), 'intended-delta bytes/object mismatch');
    requireTrue(sha256(controlBytes) === CONTROL_SHA, 'published stable control bytes changed');
    requireTrue(sha256(candidateBytes) === CANDIDATE_SHA, 'guarded candidate bytes changed');
    requireTrue(report?.schemaVersion === 1 && report.kind === 'gallery-page-head-zero-delta-differential', 'wrong raw report');
    requireTrue(report.controlSha256 === CONTROL_SHA && report.expectedControlSha256 === CONTROL_SHA
        && report.candidateSha256 === CANDIDATE_SHA, 'raw report artifact identity is stale');
    requireTrue(report.observerSha256 === sha256(observerBytes), 'raw observer changed after report');
    requireTrue(isDeepStrictEqual(report.evidenceBinding, currentBinding), 'raw report evidence binding is stale');
    requireTrue(hasActiveScope(deltas, 'modern-list-fluid-tactile-v1', 'list-search-paging', 'geometry', LIST_GEOMETRY_SCOPE),
        'active list pseudo-element geometry contract is missing');
    requireTrue(hasActiveScope(deltas, 'modern-list-fluid-tactile-v1', 'list-search-paging', 'color-role', LIST_COLOR_SCOPE),
        'active list pseudo-element color contract is missing');
    requireTrue(hasActiveScope(deltas, 'header-native-door-v1', 'header-navigation', 'geometry', RELATION_SCOPE),
        'active original relation-popup contract is missing');
    for (const [sideName, side, expectedSha] of [['control', controlSide, CONTROL_SHA], ['candidate', candidateSide, CANDIDATE_SHA]]) {
        requireTrue(side?.schemaVersion === 1 && side.artifactSha256 === expectedSha && side.browser === report.browser,
            `${sideName} side artifact/browser identity is stale`);
        requireTrue(Array.isArray(side.observations), `${sideName} observations missing`);
        const actualSteps = side.observations.map((entry) => `${entry.caseId}/${entry.step}`);
        const expectedSteps = Object.entries(CASE_STEPS).flatMap(([caseId, steps]) => steps.map((step) => `${caseId}/${step}`));
        requireTrue(isDeepStrictEqual(actualSteps, expectedSteps), `${sideName} applicability matrix changed or skipped`);
    }
    requireTrue(report.observations === 42 && candidateSide.observations.length === 42, 'zero or missing observation applicability');
    requireTrue(isDeepStrictEqual(recomputeRawDifferences(controlSide, candidateSide), report.differences),
        'raw report does not match independent side observations');
    requireTrue(report.differences.length === 33, 'raw difference count changed');
    for (const flag of ['positivePointerSearch', 'positiveKeyboardSearch', 'positiveNativeActions', 'positivePopup']) {
        requireTrue(report[flag] === true && rawPositiveChecks(controlSide)[flag] === true
            && rawPositiveChecks(candidateSide)[flag] === true, `raw positive check missing: ${flag}`);
    }
    candidateSide.observations.forEach(positiveCandidateChecks);

    const counts = new Map();
    const byCase = new Map();
    for (const difference of report.differences) {
        requireTrue(difference.field === 'visual', `${difference.caseId}/${difference.step}: semantic or unknown difference`);
        const leaves = [];
        changedLeaves(difference.control, difference.candidate, 'visual', leaves);
        requireTrue(leaves.length > 0, `${difference.caseId}/${difference.step}: empty difference`);
        for (const leaf of leaves) {
            let expected = LIST_GEOMETRY[leaf.path] || RELATION_GEOMETRY[leaf.path];
            if (leaf.path === 'visual.listOptionAfterStyle.color' || leaf.path === 'visual.listOptionAfterStyle.borderColor') {
                expected = difference.caseId.endsWith('-dark')
                    ? ['rgb(224, 224, 224)', 'rgb(237, 242, 247)']
                    : ['rgb(34, 34, 34)', 'rgb(39, 49, 63)'];
            }
            requireTrue(expected && isDeepStrictEqual([leaf.control, leaf.candidate], expected),
                `${difference.caseId}/${difference.step}: unclassified field or value ${leaf.path}`);
            requireTrue(leaf.path.startsWith('visual.listOptionAfterStyle.') ? difference.caseId.includes('-list-')
                : difference.caseId.startsWith('minor-list-'), `${difference.caseId}/${difference.step}: delta outside declared route`);
            counts.set(leaf.path, (counts.get(leaf.path) || 0) + 1);
            const paths = byCase.get(difference.caseId) || new Set();
            paths.add(leaf.path);
            byCase.set(difference.caseId, paths);
        }
    }
    for (const field of [...Object.keys(LIST_GEOMETRY), 'visual.listOptionAfterStyle.color', 'visual.listOptionAfterStyle.borderColor']) {
        requireTrue(counts.get(field) === 33, `missing/extra list pseudo-element observation: ${field}`);
    }
    for (const field of Object.keys(RELATION_GEOMETRY)) {
        requireTrue(counts.get(field) === 21, `missing/extra relation-popup observation: ${field}`);
    }
    requireTrue(counts.size === 11, 'unexpected changed field path');

    return {
        schemaVersion: 1,
        kind: 'header-page-head-visual-delta-classification',
        rawStatus: 'FAIL',
        classificationStatus: 'DECLARED_VISUAL_ONLY',
        stageStatus: 'UNKNOWN',
        controlSha256: CONTROL_SHA,
        candidateSha256: CANDIDATE_SHA,
        rawReportSha256: sha256(rawReportBytes),
        controlSideSha256: sha256(controlSideBytes),
        candidateSideSha256: sha256(candidateSideBytes),
        observerSha256: sha256(observerBytes),
        classifierSha256: sha256(classifierBytes),
        intendedDeltasSha256: sha256(deltasBytes),
        evidenceBinding: currentBinding,
        observations: report.observations,
        rawDifferenceCount: report.differences.length,
        semanticDifferenceCount: 0,
        fieldPathCounts: Object.fromEntries([...counts].sort(([left], [right]) => left.localeCompare(right))),
        caseReceipts: Object.entries(CASE_STEPS).map(([caseId, steps]) => {
            const [galleryType, routeFamily, width] = caseId.split('-');
            const classifiedFieldPaths = [...(byCase.get(caseId) || [])].sort();
            return {
                featureIds: [caseId.includes('-list-') ? 'list-toolbar-clearfix' : 'gallery-heading',
                    ...(steps.includes('relation-open') ? ['native-relation-popup'] : [])],
                caseId,
                context: { galleryType, routeFamily, viewportWidth: Number(width), theme: caseId.endsWith('-dark') ? 'dark' : 'light', authentication: 'anonymous-fixture' },
                applicable: true,
                steps,
                classifiedFieldPaths,
                positiveChecks: {
                    search: steps.includes('pointer-search') ? 'PASS' : 'N/A',
                    nativeActions: steps.includes('native-actions') ? 'PASS' : 'N/A',
                    relationPopup: steps.includes('relation-open') ? 'PASS' : 'N/A',
                },
                disposition: classifiedFieldPaths.length ? 'DECLARED_VISUAL_ONLY' : 'UNCHANGED_IN_THIS_ORACLE',
            };
        }),
        contractIds: ['modern-list-fluid-tactile-v1', 'header-native-door-v1'],
        limitations: ['raw comparator remains FAIL', 'actual Tampermonkey-extension Canary not run', 'full-header and final inventory not approved'],
    };
}

export async function readCurrentInputs() {
    const paths = {
        report: 'testbed/artifacts/header-stable-to-current-page-head-differential-D12.json',
        controlSide: 'testbed/artifacts/gallery-page-head-control-side.json',
        candidateSide: 'testbed/artifacts/gallery-page-head-candidate-side.json',
        control: 'testbed/artifacts/baseline-mobile-stable.user.js',
        candidate: 'testbed/artifacts/runtime-under-test.user.js',
        observer: 'testbed/run-gallery-page-head-differential.mjs',
        deltas: 'verification/intended-deltas.json',
    };
    const bytes = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, relative]) =>
        [key, await readFile(path.join(root, relative))])));
    return {
        report: JSON.parse(bytes.report), controlSide: JSON.parse(bytes.controlSide), candidateSide: JSON.parse(bytes.candidateSide),
        deltas: JSON.parse(bytes.deltas), controlBytes: bytes.control, candidateBytes: bytes.candidate,
        observerBytes: bytes.observer, rawReportBytes: bytes.report, controlSideBytes: bytes.controlSide,
        candidateSideBytes: bytes.candidateSide, deltasBytes: bytes.deltas,
        classifierBytes: await readFile(scriptPath), currentBinding: await createEvidenceBinding(root), paths,
    };
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
    const output = path.join(root, 'testbed/artifacts/header-page-head-visual-classification.json');
    try {
        const input = await readCurrentInputs();
        const result = classifyPageHeadDelta(input);
        result.inputs = input.paths;
        await mkdir(path.dirname(output), { recursive: true });
        await writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
        console.log(`Page-head classification: ${result.classificationStatus}; raw ${result.rawStatus} ${result.rawDifferenceCount}/${result.observations}; stage ${result.stageStatus}`);
    } catch (error) {
        await mkdir(path.dirname(output), { recursive: true });
        await writeFile(output, `${JSON.stringify({ schemaVersion: 1, kind: 'header-page-head-visual-delta-classification', rawStatus: 'FAIL', classificationStatus: 'BLOCKED', stageStatus: 'UNKNOWN', reason: error.message }, null, 2)}\n`);
        console.error(`Page-head classification BLOCKED: ${error.message}`);
        process.exitCode = 1;
    }
}
