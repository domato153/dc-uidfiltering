import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCandidateFingerprint, digestEvidenceBytes } from './evidence-binding.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readyMode = process.argv.includes('--ready');
const mutationIndex = process.argv.indexOf('--audit-mutation');
const mutation = mutationIndex >= 0 ? process.argv[mutationIndex + 1] : null;
const matrixIndex = process.argv.indexOf('--write-matrix');
const matrixOutput = matrixIndex >= 0 ? process.argv[matrixIndex + 1] : null;
if (mutationIndex >= 0 && (!mutation || mutation.startsWith('--'))) throw new Error('--audit-mutation requires a mutation id');
if (matrixIndex >= 0 && (!matrixOutput || matrixOutput.startsWith('--'))) throw new Error('--write-matrix requires an output path');

const paths = Object.freeze({
    surfaces: 'architecture/ui-surfaces.json',
    deltas: 'verification/intended-deltas.json',
    observations: 'verification/semantic-observation-schema.json',
    states: 'verification/state-model.json',
    assurance: 'verification/assurance-case.json',
    continuityContract: 'verification/continuity-contract.json',
    continuity: 'docs/work/CURRENT_STATE.md',
    nextTask: 'docs/work/NEXT_TASK.md',
});
const values = {};
for (const [key, relative] of Object.entries(paths)) {
    values[key] = relative.endsWith('.json')
        ? JSON.parse(await readFile(path.join(rootDir, relative), 'utf8'))
        : await readFile(path.join(rootDir, relative), 'utf8');
}

applyAuditMutation(mutation, values);

const failures = [];
const fail = (message) => failures.push(message);
const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const unique = (items) => new Set(items).size === items.length;

function exactKeys(value, keys, label) {
    if (!isPlainObject(value)) {
        fail(`${label}: expected an object`);
        return;
    }
    const actual = Object.keys(value).sort();
    const expected = [...keys].sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        fail(`${label}: unknown or missing fields; expected ${expected.join(',')}, actual ${actual.join(',')}`);
    }
}

function nonEmptyStrings(items, label) {
    if (!Array.isArray(items) || items.length === 0 || items.some((item) => typeof item !== 'string' || !item.trim())) {
        fail(`${label}: expected a non-empty string array`);
        return false;
    }
    if (!unique(items)) fail(`${label}: duplicate values are forbidden`);
    return true;
}

function validateSurfaces(manifest, deltas) {
    exactKeys(manifest, ['schemaVersion', 'markerAttributes', 'presentationSelectorPrefixes', 'forbiddenHostOperations', 'surfaces'], 'ui-surfaces');
    if (manifest.schemaVersion !== 1) fail('ui-surfaces: schemaVersion must be 1');
    const exactMarkers = [
        'data-dcuf-surface',
        'data-dcuf-role',
        'data-dcuf-state',
        'data-dcuf-comment-role',
        'data-dcuf-comment-state',
        'data-dcuf-native-form-role',
        'data-dcuf-native-form-state',
        'data-dcuf-native-form-option-state',
        'data-dcuf-native-form-editor-mode',
        'data-dcuf-native-form-toolbar-kind',
        'data-dcuf-native-form-toolbar-scroll',
        'data-dcuf-native-form-toolbar-item',
        'data-dcuf-native-form-toolbar-control',
        'data-dcuf-native-form-control-state',
        'data-dcuf-native-form-toolbar-content',
        'data-dcuf-native-form-toolbar-state',
        'data-dcuf-native-form-layer-kind',
        'data-dcuf-native-form-layer-anchor',
        'data-dcuf-native-form-layer-state',
        'data-dcuf-native-form-box-sizing',
        'data-dcuf-native-form-control-kind',
    ];
    if (JSON.stringify(manifest.markerAttributes) !== JSON.stringify(exactMarkers)) fail('ui-surfaces: semantic marker set changed');
    const requiredOperations = ['clone', 'replace', 'move', 'reorder', 'wrap', 'portal'];
    for (const operation of requiredOperations) {
        if (!manifest.forbiddenHostOperations?.includes(operation)) fail(`ui-surfaces: forbidden host operation missing: ${operation}`);
    }
    const deltaIds = new Set((deltas.contracts || []).map(({ id }) => id));
    const ids = [];
    const modernOwners = new Map();
    for (const [index, surface] of (manifest.surfaces || []).entries()) {
        const label = `ui-surfaces.surfaces[${index}]`;
        exactKeys(surface, [
            'id', 'sequence', 'risk', 'state', 'routeFamilies', 'currentVisualOwner', 'sourceRefs', 'adapter', 'presenter',
            'styleIds', 'allowedRoots', 'states', 'intendedDelta', 'cascadeExceptions', 'cascadeExceptionProfiles', 'testRefs', 'canaryCheckpoint',
        ], label);
        ids.push(surface.id);
        if (!Number.isInteger(surface.sequence) || surface.sequence !== index + 1) fail(`${label}: sequence must be contiguous and ordered`);
        if (!['R1', 'R2', 'R3'].includes(surface.risk)) fail(`${label}: invalid risk ${surface.risk}`);
        if (!['legacy-debt', 'adapted-zero-delta', 'modern-candidate', 'modern'].includes(surface.state)) fail(`${label}: invalid state ${surface.state}`);
        for (const [field, items] of Object.entries({ routeFamilies: surface.routeFamilies, sourceRefs: surface.sourceRefs, styleIds: surface.styleIds, allowedRoots: surface.allowedRoots, states: surface.states, testRefs: surface.testRefs })) {
            nonEmptyStrings(items, `${label}.${field}`);
        }
        if (!deltaIds.has(surface.intendedDelta)) fail(`${label}: unknown intended delta ${surface.intendedDelta}`);
        if (!['settings-list', 'article-comments', 'native-form-header'].includes(surface.canaryCheckpoint)) fail(`${label}: invalid canary checkpoint`);
        if (surface.allowedRoots.some((root) => ['*', 'html', 'body', 'document'].includes(root.toLowerCase()))) fail(`${label}: broad allowed root is forbidden`);
        if (!Array.isArray(surface.cascadeExceptions)) fail(`${label}: cascadeExceptions must be an array`);
        for (const [exceptionIndex, exception] of (surface.cascadeExceptions || []).entries()) {
            exactKeys(exception, ['selector', 'property', 'hostCollision', 'testRef'], `${label}.cascadeExceptions[${exceptionIndex}]`);
            if (![exception.selector, exception.property, exception.hostCollision, exception.testRef].every((item) => typeof item === 'string' && item.trim())) {
                fail(`${label}.cascadeExceptions[${exceptionIndex}]: every exception field is required`);
            }
        }
        if (!Array.isArray(surface.cascadeExceptionProfiles)) fail(`${label}: cascadeExceptionProfiles must be an array`);
        for (const [profileIndex, profile] of (surface.cascadeExceptionProfiles || []).entries()) {
            const profileLabel = `${label}.cascadeExceptionProfiles[${profileIndex}]`;
            exactKeys(profile, [
                'sourceRef', 'styleKey', 'requiredSelectorPrefix', 'declarationCount', 'declarationLedgerSha256',
                'hostCollision', 'testRefs',
            ], profileLabel);
            if (![profile.sourceRef, profile.styleKey, profile.requiredSelectorPrefix, profile.declarationLedgerSha256, profile.hostCollision]
                .every((item) => typeof item === 'string' && item.trim())) {
                fail(`${profileLabel}: every string field is required`);
            }
            if (!surface.sourceRefs.includes(profile.sourceRef)) fail(`${profileLabel}: sourceRef is not owned by the surface`);
            if (!Number.isInteger(profile.declarationCount) || profile.declarationCount <= 0) fail(`${profileLabel}: declarationCount must be positive`);
            if (!/^[a-f0-9]{64}$/i.test(profile.declarationLedgerSha256)) fail(`${profileLabel}: declarationLedgerSha256 must be SHA-256`);
            if (!profile.requiredSelectorPrefix.startsWith('[data-dcuf-')) fail(`${profileLabel}: requiredSelectorPrefix must be semantic-marker scoped`);
            nonEmptyStrings(profile.testRefs, `${profileLabel}.testRefs`);
            if (surface.state !== 'adapted-zero-delta') fail(`${profileLabel}: profiles are transitional and require adapted-zero-delta state`);
        }
        if (surface.state === 'modern-candidate' || surface.state === 'modern') {
            if (surface.adapter.startsWith('planned-') || surface.presenter.startsWith('planned-')) fail(`${label}: modern surface still references a planned owner`);
            const previous = modernOwners.get(surface.currentVisualOwner);
            if (previous) fail(`${label}: second modern visual owner collision with ${previous}`);
            modernOwners.set(surface.currentVisualOwner, surface.id);
        }
        if (surface.state === 'modern') {
            if (surface.sourceRefs.length !== 2) fail(`${label}: modern surface must name exactly one adapter and one presenter source`);
        }
    }
    if (!unique(ids)) fail('ui-surfaces: duplicate surface id');
}

function validateDeltas(deltas, observations) {
    exactKeys(deltas, ['schemaVersion', 'allowedVisualKinds', 'invariantKinds', 'contracts'], 'intended-deltas');
    if (deltas.schemaVersion !== 1) fail('intended-deltas: schemaVersion must be 1');
    const allowedKinds = new Set(deltas.allowedVisualKinds || []);
    const invariantKinds = new Set(deltas.invariantKinds || []);
    const ids = [];
    for (const [index, contract] of (deltas.contracts || []).entries()) {
        const label = `intended-deltas.contracts[${index}]`;
        exactKeys(contract, ['id', 'status', 'surfaces', 'allowed', 'invariants', 'normalizer', 'unknownDifferencePolicy', 'missingApplicabilityPolicy'], label);
        ids.push(contract.id);
        if (!['planned', 'active', 'accepted', 'retired'].includes(contract.status)) fail(`${label}: invalid status`);
        nonEmptyStrings(contract.surfaces, `${label}.surfaces`);
        nonEmptyStrings(contract.invariants, `${label}.invariants`);
        for (const invariant of contract.invariants || []) if (!invariantKinds.has(invariant)) fail(`${label}: unknown invariant ${invariant}`);
        if (!Array.isArray(contract.allowed)) fail(`${label}.allowed: expected array`);
        for (const [allowedIndex, allowed] of (contract.allowed || []).entries()) {
            exactKeys(allowed, ['kind', 'surface', 'scope', 'reason', 'contractTests'], `${label}.allowed[${allowedIndex}]`);
            if (!allowedKinds.has(allowed.kind)) fail(`${label}.allowed[${allowedIndex}]: unknown visual kind ${allowed.kind}`);
            if (!contract.surfaces.includes(allowed.surface)) fail(`${label}.allowed[${allowedIndex}]: surface is outside the contract`);
            if (!allowed.scope || !allowed.reason) fail(`${label}.allowed[${allowedIndex}]: scope and reason are required`);
            nonEmptyStrings(allowed.contractTests, `${label}.allowed[${allowedIndex}].contractTests`);
        }
        if (contract.normalizer !== observations.id) fail(`${label}: normalizer does not match semantic observation schema`);
        if (contract.unknownDifferencePolicy !== 'fail') fail(`${label}: unknown differences must fail`);
        if (contract.missingApplicabilityPolicy !== 'fail') fail(`${label}: missing applicability must fail`);
    }
    if (!unique(ids)) fail('intended-deltas: duplicate contract id');
}

function validateObservations(schema) {
    exactKeys(schema, ['schemaVersion', 'id', 'unknownFieldPolicy', 'missingFieldPolicy', 'warningPolicy', 'fields', 'geometryTolerances'], 'semantic-observation-schema');
    if (schema.schemaVersion !== 1 || schema.id !== 'semantic-observation-v1') fail('semantic-observation-schema: unsupported schema identity');
    if (schema.unknownFieldPolicy !== 'fail' || schema.missingFieldPolicy !== 'fail') fail('semantic-observation-schema: unknown and missing fields must fail');
    if (schema.warningPolicy !== 'preserve-and-fail-unclassified') fail('semantic-observation-schema: warnings must be preserved and unclassified warnings must fail');
    const requiredIds = [
        'applicability', 'filterResult', 'storageTrace', 'networkTrace', 'hostNodeIdentity', 'hostNodeOrder',
        'nativeHandlers', 'nativeForm', 'submitTrace', 'focus', 'resources', 'geometry', 'hitTest', 'accessibility',
        'semanticStyle', 'warnings',
    ];
    const ids = [];
    for (const [index, field] of (schema.fields || []).entries()) {
        exactKeys(field, ['id', 'required', 'normalization', 'family'], `semantic-observation-schema.fields[${index}]`);
        ids.push(field.id);
        if (field.required !== true) fail(`semantic-observation-schema.fields[${index}]: every observation is required`);
        if (!field.normalization || !field.family) fail(`semantic-observation-schema.fields[${index}]: normalization and family are required`);
    }
    if (JSON.stringify(ids) !== JSON.stringify(requiredIds)) fail('semantic-observation-schema: required observation field set or order changed');
    exactKeys(schema.geometryTolerances, ['containmentPx', 'anchorTrackingPx', 'justification'], 'semantic-observation-schema.geometryTolerances');
    if (schema.geometryTolerances.containmentPx !== 1 || schema.geometryTolerances.anchorTrackingPx !== 2) {
        fail('semantic-observation-schema: geometry tolerance widened without a new evidence-backed schema');
    }
    if (!schema.geometryTolerances.justification) fail('semantic-observation-schema: geometry tolerance justification is required');
}

function choose(items, count, start = 0, prefix = [], output = []) {
    if (prefix.length === count) {
        output.push([...prefix]);
        return output;
    }
    for (let index = start; index <= items.length - (count - prefix.length); index += 1) {
        prefix.push(items[index]);
        choose(items, count, index + 1, prefix, output);
        prefix.pop();
    }
    return output;
}

function cartesian(factors) {
    const names = Object.keys(factors);
    const rows = [];
    const visit = (index, row) => {
        if (index === names.length) {
            rows.push({ ...row });
            return;
        }
        const name = names[index];
        for (const value of factors[name]) {
            row[name] = value;
            visit(index + 1, row);
        }
    };
    visit(0, {});
    return rows;
}

function violates(row, forbidden) {
    return forbidden.some((rule) => Object.entries(rule).every(([name, value]) => row[name] === value));
}

function tupleKeys(row, factorCombinations) {
    return factorCombinations.map((names) => names.map((name) => `${name}=${row[name]}`).join('|'));
}

function generateCoveringArray(profile) {
    const factorNames = Object.keys(profile.factors);
    const combinations = choose(factorNames, profile.strength);
    const validRows = cartesian(profile.factors).filter((row) => !violates(row, profile.forbidden));
    const required = new Set();
    const selectedIndices = new Set();
    for (let rowIndex = 0; rowIndex < validRows.length; rowIndex += 1) {
        for (const key of tupleKeys(validRows[rowIndex], combinations)) {
            if (!required.has(key)) {
                required.add(key);
                selectedIndices.add(rowIndex);
            }
        }
    }
    const selected = [...selectedIndices].sort((a, b) => a - b).map((index) => validRows[index]);
    const covered = new Set();
    for (const row of selected) for (const key of tupleKeys(row, combinations)) covered.add(key);
    for (const key of required) if (!covered.has(key)) fail(`state-model.${profile.id}: uncovered ${profile.strength}-way tuple ${key}`);
    for (const row of selected) if (violates(row, profile.forbidden)) fail(`state-model.${profile.id}: generated a forbidden case`);
    return {
        id: profile.id,
        strength: profile.strength,
        validCombinations: validRows.length,
        requiredTuples: required.size,
        generatedCases: selected.length,
        cases: selected,
    };
}

function validateStateModel(model) {
    exactKeys(model, ['schemaVersion', 'generator', 'profiles'], 'state-model');
    if (model.schemaVersion !== 1 || model.generator !== 'deterministic-first-cover-v1') fail('state-model: unsupported schema or generator');
    const ids = [];
    const matrices = [];
    for (const [index, profile] of (model.profiles || []).entries()) {
        const label = `state-model.profiles[${index}]`;
        exactKeys(profile, ['id', 'strength', 'risk', 'factors', 'forbidden'], label);
        ids.push(profile.id);
        if (!['R1', 'R2', 'R3'].includes(profile.risk)) fail(`${label}: invalid risk`);
        if (!Number.isInteger(profile.strength) || profile.strength < 2) fail(`${label}: invalid strength`);
        if (profile.risk === 'R3' && profile.strength !== 4) fail(`${label}: R3 coverage must be 4-way`);
        if (profile.risk === 'R2' && profile.strength !== 3) fail(`${label}: R2 coverage must be 3-way`);
        if (!isPlainObject(profile.factors) || Object.keys(profile.factors).length < profile.strength) fail(`${label}: insufficient factors`);
        for (const [name, factorValues] of Object.entries(profile.factors || {})) nonEmptyStrings(factorValues, `${label}.factors.${name}`);
        if (!Array.isArray(profile.forbidden)) fail(`${label}.forbidden: expected array`);
        for (const [ruleIndex, rule] of (profile.forbidden || []).entries()) {
            if (!isPlainObject(rule) || Object.keys(rule).length === 0) fail(`${label}.forbidden[${ruleIndex}]: expected non-empty object`);
            for (const [name, value] of Object.entries(rule || {})) {
                if (!Object.hasOwn(profile.factors, name)) fail(`${label}.forbidden[${ruleIndex}]: unknown factor ${name}`);
                else if (!profile.factors[name].includes(value)) fail(`${label}.forbidden[${ruleIndex}]: unknown value ${name}=${value}`);
            }
        }
        if (failures.length === 0) matrices.push(generateCoveringArray(profile));
    }
    if (!unique(ids)) fail('state-model: duplicate profile id');
    return matrices;
}

async function validateContinuityContract(contract, continuity, nextTask) {
    exactKeys(contract, [
        'schemaVersion', 'authorityOrder', 'requiredStateFields', 'allowedStatuses', 'updateTriggers',
        'retrievalConcepts', 'handoff', 'thinRouter',
    ], 'continuity-contract');
    if (contract.schemaVersion !== 1) fail('continuity-contract: schemaVersion must be 1');

    const authorityIds = [];
    for (const [index, authority] of (contract.authorityOrder || []).entries()) {
        const label = `continuity-contract.authorityOrder[${index}]`;
        exactKeys(authority, ['id', 'rank', 'sources'], label);
        authorityIds.push(authority.id);
        if (authority.rank !== index + 1) fail(`${label}: ranks must be contiguous and ordered`);
        nonEmptyStrings(authority.sources, `${label}.sources`);
    }
    const requiredAuthorityIds = [
        'fresh-local-state', 'tracked-current-projection', 'machine-contracts-and-receipts',
        'plans-and-history', 'conversation-context',
    ];
    if (JSON.stringify(authorityIds) !== JSON.stringify(requiredAuthorityIds)) {
        fail('continuity-contract: authority order changed or remote/chat state outranks fresh local state');
    }

    const stateFieldIds = [];
    for (const [index, field] of (contract.requiredStateFields || []).entries()) {
        const label = `continuity-contract.requiredStateFields[${index}]`;
        exactKeys(field, ['id', 'markdownLabel'], label);
        stateFieldIds.push(field.id);
        if (!field.markdownLabel || !continuity.includes(`- ${field.markdownLabel}:`)) {
            fail(`${label}: CURRENT_STATE.md is missing - ${field.markdownLabel}:`);
        }
    }
    const requiredStateFieldIds = [
        'active-plan', 'workspace-path', 'active-stage', 'source-state', 'local-only-state', 'candidate-fingerprint', 'last-current-audit',
        'accepted-baseline', 'current-artifact', 'blockers', 'pending-live-checks',
    ];
    if (JSON.stringify(stateFieldIds) !== JSON.stringify(requiredStateFieldIds)) fail('continuity-contract: required current-state fields changed');
    if (JSON.stringify(contract.allowedStatuses) !== JSON.stringify(['PASS', 'READY', 'BLOCKED', 'UNKNOWN'])) {
        fail('continuity-contract: allowed statuses must be PASS, READY, BLOCKED, UNKNOWN');
    }

    const requiredTriggerIds = [
        'resume-or-compaction', 'stage-start', 'evidence-input-change', 'audit-completion',
        'failure-reclassification', 'canary-result', 'completion-or-archive',
    ];
    const triggerIds = [];
    for (const [index, trigger] of (contract.updateTriggers || []).entries()) {
        const label = `continuity-contract.updateTriggers[${index}]`;
        exactKeys(trigger, ['id', 'alternativeLabels', 'requiredActions'], label);
        triggerIds.push(trigger.id);
        nonEmptyStrings(trigger.alternativeLabels, `${label}.alternativeLabels`);
        nonEmptyStrings(trigger.requiredActions, `${label}.requiredActions`);
    }
    if (JSON.stringify(triggerIds) !== JSON.stringify(requiredTriggerIds)) fail('continuity-contract: mandatory trigger set or order changed');

    const routing = JSON.parse(await readFile(path.join(rootDir, 'verification/skill-routing-cases.json'), 'utf8'));
    const routingById = new Map((routing.cases || []).map((item) => [item.id, item]));
    const conceptIds = [];
    const labels = new Map();
    for (const [index, concept] of (contract.retrievalConcepts || []).entries()) {
        const label = `continuity-contract.retrievalConcepts[${index}]`;
        exactKeys(concept, ['id', 'preferredLabel', 'alternativeLabels', 'hiddenLabels', 'relatedPaths', 'routingCaseIds'], label);
        conceptIds.push(concept.id);
        nonEmptyStrings(concept.alternativeLabels, `${label}.alternativeLabels`);
        nonEmptyStrings(concept.hiddenLabels, `${label}.hiddenLabels`);
        nonEmptyStrings(concept.relatedPaths, `${label}.relatedPaths`);
        nonEmptyStrings(concept.routingCaseIds, `${label}.routingCaseIds`);
        for (const candidate of [concept.preferredLabel, ...concept.alternativeLabels, ...concept.hiddenLabels]) {
            const normalized = candidate.trim().toLocaleLowerCase('en-US');
            const previous = labels.get(normalized);
            if (previous) fail(`${label}: retrieval label collision ${candidate} with ${previous}`);
            else labels.set(normalized, concept.id);
        }
        for (const relative of concept.relatedPaths) {
            try {
                await stat(path.join(rootDir, relative));
            } catch {
                fail(`${label}: related path does not exist: ${relative}`);
            }
        }
        for (const caseId of concept.routingCaseIds) {
            const route = routingById.get(caseId);
            if (!route) fail(`${label}: routing case does not exist: ${caseId}`);
            else if (!route.expectedSkills.includes('dcuf-long-work-continuity')) fail(`${label}: routing case does not select continuity: ${caseId}`);
        }
    }
    const requiredConceptIds = [
        'current-state', 'next-task', 'evidence-and-audit', 'semantic-preservation',
        'live-architecture', 'failure-and-blocker', 'canary-and-release', 'decision-rationale', 'context-free-handoff',
    ];
    if (JSON.stringify(conceptIds) !== JSON.stringify(requiredConceptIds)) fail('continuity-contract: retrieval concept set or order changed');

    exactKeys(contract.handoff, [
        'canonicalLocator', 'currentPacket', 'methodReference', 'requiredTaskFields',
        'receiverOutcomes', 'localStateLabel', 'workspacePathPolicy', 'requiresFreshContext',
    ], 'continuity-contract.handoff');
    if (contract.handoff.canonicalLocator !== 'docs/work/INDEX.md') fail('handoff: canonical locator changed');
    if (JSON.stringify(contract.handoff.currentPacket) !== JSON.stringify(['docs/work/CURRENT_STATE.md', 'docs/work/NEXT_TASK.md'])) fail('handoff: current packet changed');
    if (contract.handoff.methodReference !== '.agents/skills/dcuf-long-work-continuity/references/handoff-contract.md') fail('handoff: governing method path changed');
    if (JSON.stringify(contract.handoff.requiredTaskFields) !== JSON.stringify(['Objective', 'Why next', 'Expected transition', 'Stop/replan'])) fail('handoff: situation model field set changed');
    if (JSON.stringify(contract.handoff.receiverOutcomes) !== JSON.stringify(['ACCEPTED', 'STALE_REPLAN'])) fail('handoff: receiver outcomes changed');
    if (contract.handoff.localStateLabel !== 'LOCAL_ONLY_EVIDENCE' || contract.handoff.requiresFreshContext !== true) fail('handoff: local-state or fresh-context boundary changed');
    if (contract.handoff.workspacePathPolicy !== 'repo-relative-dot-private-prompt-locator') fail('handoff: tracked workspace path policy changed');
    for (const relative of [contract.handoff.canonicalLocator, ...contract.handoff.currentPacket, contract.handoff.methodReference]) {
        try { await stat(path.join(rootDir, relative)); }
        catch { fail(`handoff: missing canonical path ${relative}`); }
    }
    const locator = await readFile(path.join(rootDir, contract.handoff.canonicalLocator), 'utf8');
    if (!locator.includes(contract.handoff.methodReference) || !locator.includes('CURRENT_STATE.md') || !locator.includes('NEXT_TASK.md')) fail('handoff: locator does not route to current packet and method');
    const workspacePath = continuity.match(/^- Workspace path:\s*`([^`]+)`/m)?.[1];
    if (workspacePath !== '.' || path.resolve(rootDir, workspacePath).toLowerCase() !== rootDir.toLowerCase()) fail('handoff: recorded active worktree path differs from verifier root');
    if (!new RegExp(`^- Local-only state:\\s*\`${contract.handoff.localStateLabel}\``,'m').test(continuity)) fail('handoff: uncommitted local-state boundary is missing');
    for (const field of contract.handoff.requiredTaskFields) {
        if (!new RegExp(`^- ${field}: .+`, 'm').test(nextTask)) fail(`handoff: NEXT_TASK.md is missing ${field}`);
    }

    exactKeys(contract.thinRouter, ['skillPath', 'detailReference', 'inspectionCommand', 'maxEntrypointCharacters', 'forbiddenEmbeddedFacts'], 'continuity-contract.thinRouter');
    if (JSON.stringify(contract.thinRouter.inspectionCommand) !== JSON.stringify(['node', 'tools/inspect-continuity.mjs'])) {
        fail('continuity-contract: thin-router inspection command changed');
    }
    if (contract.thinRouter.maxEntrypointCharacters !== 2600) fail('continuity-contract: thin-router entrypoint limit changed');
    if (JSON.stringify(contract.thinRouter.forbiddenEmbeddedFacts) !== JSON.stringify(['commit-sha', 'artifact-sha', 'current-stage', 'current-status'])) {
        fail('continuity-contract: thin-router forbidden fact set changed');
    }
    let skillText = '';
    for (const relative of [contract.thinRouter.skillPath, contract.thinRouter.detailReference, contract.thinRouter.inspectionCommand[1]]) {
        try {
            const contents = await readFile(path.join(rootDir, relative), 'utf8');
            if (relative === contract.thinRouter.skillPath) skillText = contents;
        } catch {
            fail(`continuity-contract: thin-router path does not exist: ${relative}`);
        }
    }
    if (skillText.length > contract.thinRouter.maxEntrypointCharacters) fail('continuity-contract: thin router exceeds the entrypoint character limit');
    if (/[a-f0-9]{40}(?:[a-f0-9]{24})?/i.test(skillText)) fail('continuity-contract: thin router embeds a commit or artifact SHA');
    if (!skillText.includes('(references/retrieval-contract.md)')) fail('continuity-contract: thin router does not route to its detail reference');
    if (!skillText.includes('(references/handoff-contract.md)')) fail('handoff: thin router does not route to its cold-start method');

    const runGit = (args) => {
        const result = spawnSync('git', args, { cwd: rootDir, encoding: 'utf8', shell: false });
        if (result.status !== 0) {
            fail(`continuity: git ${args.join(' ')} failed`);
            return '';
        }
        return result.stdout.trim();
    };
    const sourceState = continuity.match(/^- Source state:\s*source checkpoint base HEAD\s*`([a-f0-9]{40})`\s*on\s*`([^`]+)`/mi);
    if (!sourceState) fail('continuity: source state must bind a source-checkpoint base HEAD and branch');
    else {
        const actualHead = runGit(['rev-parse', 'HEAD']);
        const actualBranch = runGit(['branch', '--show-current']);
        const ancestry = spawnSync('git', ['merge-base', '--is-ancestor', sourceState[1], actualHead], { cwd: rootDir, encoding: 'utf8', shell: false });
        if (ancestry.status !== 0) fail('continuity: recorded source checkpoint HEAD is not an ancestor of current HEAD');
        if (sourceState[2] !== actualBranch) fail('continuity: recorded source branch is stale');
    }
    const fingerprint = continuity.match(/^- Candidate fingerprint:\s*`(UNKNOWN|[a-f0-9]{64})`/mi)?.[1];
    if (!fingerprint) fail('continuity: candidate fingerprint is missing or malformed');
    else if (fingerprint !== 'UNKNOWN') {
        const actualFingerprint = await createCandidateFingerprint(rootDir);
        if (fingerprint.toLowerCase() !== actualFingerprint.toLowerCase()) fail('continuity: recorded candidate fingerprint is stale');
    }
    const artifact = continuity.match(/^- Current artifact:\s*mobile root\/`dist\/` and guarded runtime SHA-256 `([a-f0-9]{64})`;\s*PC root\/`dist\/` SHA-256 `([a-f0-9]{64})`/mi);
    if (!artifact) fail('continuity: current mobile/PC artifact digests are missing or malformed');
    else {
        const buildTargets = JSON.parse(await readFile(path.join(rootDir, 'build/targets.json'), 'utf8')).targets;
        const outputName = (target) => buildTargets[target].outputPattern.replace('{version}', buildTargets[target].version);
        const artifacts = [
            { target: 'mobile', relative: outputName('mobile'), recorded: artifact[1] },
            { target: 'mobile', relative: path.join('dist', outputName('mobile')), recorded: artifact[1] },
            { target: 'mobile', relative: 'testbed/artifacts/runtime-under-test.user.js', recorded: artifact[1] },
            { target: 'PC', relative: outputName('pc'), recorded: artifact[2] },
            { target: 'PC', relative: path.join('dist', outputName('pc')), recorded: artifact[2] },
        ];
        for (const entry of artifacts) {
            try {
                const actual = createHash('sha256').update(await readFile(path.join(rootDir, entry.relative))).digest('hex');
                if (entry.recorded.toLowerCase() !== actual) {
                    fail(`continuity: recorded current ${entry.target} artifact digest is stale: ${entry.relative}`);
                }
            } catch (error) {
                if (error.code === 'ENOENT') fail(`continuity: recorded current artifact does not exist: ${entry.relative}`);
                else throw error;
            }
        }
    }

    const activeStage = continuity.match(/^- Active stage:\s*`([^`]+)`/m)?.[1];
    const taskIds = Array.from(nextTask.matchAll(/^- Task ID:\s*`([^`]+)`/gm), (match) => match[1]);
    if (!activeStage) fail('continuity: active stage is missing');
    if (taskIds.length !== 1) fail('continuity: NEXT_TASK.md must contain exactly one Task ID');
    else if (activeStage && taskIds[0] !== activeStage) fail('continuity: active stage and next bounded task disagree');
}

async function validateAssuranceCase(assurance, continuity) {
    exactKeys(assurance, ['schemaVersion', 'topClaim', 'allowedStatuses', 'evidenceFamilies', 'claims', 'defeaters', 'receipts'], 'assurance-case');
    if (assurance.schemaVersion !== 1) fail('assurance-case: schemaVersion must be 1');
    exactKeys(assurance.topClaim, ['id', 'status', 'scope'], 'assurance-case.topClaim');
    const statuses = ['PASS', 'BLOCKED', 'UNKNOWN'];
    if (JSON.stringify(assurance.allowedStatuses) !== JSON.stringify(statuses)) fail('assurance-case: allowed statuses must be PASS, BLOCKED, UNKNOWN');
    if (!statuses.includes(assurance.topClaim.status)) fail('assurance-case.topClaim: invalid status');
    const requiredClaimIds = [
        'declared-visual-delta-only',
        'storage-filter-network-pc-preserved',
        'host-dom-event-form-popup-lifecycle-preserved',
        'presentation-boundary-one-owner-realized',
        'accessibility-geometry-performance-bounded',
        'evidence-bound-to-current-system',
        'synthetic-evidence-live-applicable',
    ];
    const claimIds = [];
    const evidenceFamilies = new Set(assurance.evidenceFamilies || []);
    const evidenceById = new Map();
    for (const [index, claim] of (assurance.claims || []).entries()) {
        const label = `assurance-case.claims[${index}]`;
        exactKeys(claim, ['id', 'status', 'requiredEvidenceFamilies', 'evidence', 'assumptions', 'defeaters'], label);
        claimIds.push(claim.id);
        if (!statuses.includes(claim.status)) fail(`${label}: invalid status`);
        nonEmptyStrings(claim.requiredEvidenceFamilies, `${label}.requiredEvidenceFamilies`);
        nonEmptyStrings(claim.assumptions, `${label}.assumptions`);
        nonEmptyStrings(claim.defeaters, `${label}.defeaters`);
        for (const family of claim.requiredEvidenceFamilies || []) if (!evidenceFamilies.has(family)) fail(`${label}: unknown evidence family ${family}`);
        if (!Array.isArray(claim.evidence)) fail(`${label}.evidence: expected array`);
        for (const [evidenceIndex, evidence] of (claim.evidence || []).entries()) {
            const evidenceLabel = `${label}.evidence[${evidenceIndex}]`;
            exactKeys(evidence, ['id', 'family', 'path', 'sha256', 'artifactSha256', 'producer', 'oracle', 'applicability'], evidenceLabel);
            if (!evidenceFamilies.has(evidence.family)) fail(`${evidenceLabel}: unknown family`);
            if (evidence.applicability !== 'applicable') fail(`${evidenceLabel}: non-applicable evidence cannot support a claim`);
            if (!/^[a-fA-F0-9]{64}$/.test(evidence.sha256) || !/^[a-fA-F0-9]{64}$/.test(evidence.artifactSha256)) fail(`${evidenceLabel}: receipt and artifact SHA-256 are required`);
            const previous = evidenceById.get(evidence.id);
            if (previous && JSON.stringify(previous) !== JSON.stringify(evidence)) fail(`${evidenceLabel}: evidence id is inconsistent across claims`);
            evidenceById.set(evidence.id, evidence);
        }
        if (claim.status === 'PASS') {
            for (const family of claim.requiredEvidenceFamilies) {
                if (!claim.evidence.some((evidence) => evidence.family === family && evidence.applicability === 'applicable')) fail(`${label}: PASS is missing evidence family ${family}`);
            }
        }
    }
    if (JSON.stringify(claimIds) !== JSON.stringify(requiredClaimIds)) fail('assurance-case: mandatory claim set or order changed');
    const defeaterIds = [];
    for (const [index, defeater] of (assurance.defeaters || []).entries()) {
        exactKeys(defeater, ['id', 'status', 'mandatory'], `assurance-case.defeaters[${index}]`);
        defeaterIds.push(defeater.id);
        if (!['OPEN', 'RESOLVED'].includes(defeater.status)) fail(`assurance-case.defeaters[${index}]: invalid status`);
        if (defeater.mandatory !== true) fail(`assurance-case.defeaters[${index}]: mandatory defeaters cannot be downgraded`);
    }
    if (!unique(defeaterIds)) fail('assurance-case: duplicate defeater id');
    for (const claim of assurance.claims || []) for (const id of claim.defeaters || []) if (!defeaterIds.includes(id)) fail(`assurance-case.${claim.id}: missing referenced defeater ${id}`);
    if (!Array.isArray(assurance.receipts)) fail('assurance-case.receipts: expected array');
    for (const [index, receipt] of (assurance.receipts || []).entries()) {
        exactKeys(receipt, ['id', 'path', 'sha256'], `assurance-case.receipts[${index}]`);
        if (!/^[a-fA-F0-9]{64}$/.test(receipt.sha256)) fail(`assurance-case.receipts[${index}]: invalid SHA-256`);
        try {
            const bytes = await readFile(path.join(rootDir, receipt.path));
            const actual = digestEvidenceBytes(receipt.path, bytes);
            if (actual.toLowerCase() !== receipt.sha256.toLowerCase()) fail(`assurance-case.receipts[${index}]: stale receipt digest`);
        } catch (error) {
            fail(`assurance-case.receipts[${index}]: receipt does not exist: ${receipt.path}`);
        }
    }
    const auditStatus = continuity.match(/^- Last current audit:\s*`?(PASS|READY|BLOCKED|UNKNOWN)/m)?.[1];
    if (!auditStatus) fail('continuity: Last current audit status is missing or invalid');
    if (['PASS', 'READY'].includes(auditStatus)) {
        const receiptMatch = continuity.match(/^- Current stage receipt:\s*`([^`]+)`\s+SHA-256\s+`([a-fA-F0-9]{64})`/m);
        if (!receiptMatch) {
            fail('continuity: PASS/READY has no current stage receipt and SHA-256');
        } else {
            try {
                const bytes = await readFile(path.join(rootDir, receiptMatch[1]));
                const actual = digestEvidenceBytes(receiptMatch[1], bytes);
                if (actual.toLowerCase() !== receiptMatch[2].toLowerCase()) fail('continuity: current stage receipt SHA-256 is stale');
            } catch {
                fail(`continuity: current stage receipt does not exist: ${receiptMatch[1]}`);
            }
        }
    }
    if (readyMode) {
        if (assurance.topClaim.status !== 'PASS') fail('assurance-case: top claim is not PASS');
        for (const claim of assurance.claims || []) if (claim.status !== 'PASS') fail(`assurance-case: mandatory claim is not PASS: ${claim.id}`);
        for (const defeater of assurance.defeaters || []) if (defeater.mandatory && defeater.status !== 'RESOLVED') fail(`assurance-case: unresolved mandatory defeater ${defeater.id}`);
        if (assurance.receipts.length === 0) fail('assurance-case: READY requires current receipts');
    }
}

validateObservations(values.observations);
validateDeltas(values.deltas, values.observations);
validateSurfaces(values.surfaces, values.deltas);
const matrices = validateStateModel(values.states);
await validateContinuityContract(values.continuityContract, values.continuity, values.nextTask);
await validateAssuranceCase(values.assurance, values.continuity);

if (failures.length) {
    throw new Error(`Modernization assurance verification failed:\n${failures.map((item) => ` - ${item}`).join('\n')}`);
}

const authorityEntries = [];
for (const [key, relative] of Object.entries(paths)) {
    const bytes = Buffer.from(typeof values[key] === 'string' ? values[key] : `${JSON.stringify(values[key], null, 2)}\n`, 'utf8');
    authorityEntries.push(`${relative}\0${digestEvidenceBytes(relative, bytes)}`);
}
const output = {
    schemaVersion: 1,
    status: readyMode ? 'READY' : 'VALID',
    authoritySha256: createHash('sha256').update(authorityEntries.sort().join('\n')).digest('hex'),
    topClaim: values.assurance.topClaim.status,
    openMandatoryDefeaters: values.assurance.defeaters.filter((item) => item.mandatory && item.status === 'OPEN').map(({ id }) => id),
    matrices,
};
if (matrixOutput) {
    const outputPath = path.resolve(rootDir, matrixOutput);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
}
console.log(`Modernization assurance contracts ${output.status}: ${matrices.map((item) => `${item.id} ${item.strength}-way ${item.generatedCases}/${item.validCombinations}`).join(', ')}`);
console.log(`Authority SHA-256: ${output.authoritySha256}`);

function applyAuditMutation(id, state) {
    if (!id) return;
    const mutations = {
        'unknown-surface-field': () => { state.surfaces.auditBypass = true; },
        'missing-host-operation': () => { state.surfaces.forbiddenHostOperations = state.surfaces.forbiddenHostOperations.filter((item) => item !== 'replace'); },
        'broad-surface-root': () => { state.surfaces.surfaces[0].allowedRoots.push('*'); },
        'cascade-profile-promoted': () => {
            state.surfaces.surfaces.find(({ id: surfaceId }) => surfaceId === 'write-edit-delete-popup').state = 'modern-candidate';
        },
        'second-modern-owner': () => {
            for (const surface of state.surfaces.surfaces.slice(0, 2)) {
                surface.state = 'modern';
                surface.currentVisualOwner = 'duplicate-owner';
                surface.adapter = 'src/targets/mobile/example-host-adapter.js';
                surface.presenter = 'src/targets/mobile/example-presenter.js';
                surface.sourceRefs = [surface.adapter, surface.presenter];
            }
        },
        'delta-laundering': () => {
            state.deltas.contracts[0].allowed.push({ kind: 'network', surface: 'tokens-settings-palette', scope: 'all', reason: 'make it pass', contractTests: ['none'] });
        },
        'missing-observation': () => { state.observations.fields.pop(); },
        'warning-policy-weakened': () => { state.observations.warningPolicy = 'ignore'; },
        'geometry-tolerance-widened': () => { state.observations.geometryTolerances.anchorTrackingPx = 20; },
        'r3-strength-downgraded': () => { state.states.profiles.find(({ risk }) => risk === 'R3').strength = 3; },
        'unknown-state-factor': () => { state.states.profiles[0].forbidden.push({ nonexistent: 'value' }); },
        'missing-assurance-claim': () => { state.assurance.claims.pop(); },
        'missing-assurance-defeater': () => { state.assurance.defeaters.pop(); },
        'non-applicable-pass': () => {
            const claim = state.assurance.claims[0];
            claim.status = 'PASS';
            claim.evidence = claim.requiredEvidenceFamilies.map((family, index) => ({
                id: `forged-${index}`, family, path: 'none', sha256: '0'.repeat(64), artifactSha256: '0'.repeat(64), producer: 'same', oracle: 'same', applicability: 'not-applicable',
            }));
        },
        'nonexistent-pass-receipt': () => {
            state.assurance.receipts.push({ id: 'forged', path: 'verification/receipts/does-not-exist.json', sha256: '0'.repeat(64) });
        },
        'continuity-false-ready': () => {
            state.continuity = state.continuity
                .replace(/Last current audit:\s*`?(?:PASS|READY|BLOCKED|UNKNOWN)`?/, 'Last current audit: `READY`')
                .replace(/^- Current stage receipt:.*\r?\n/m, '');
        },
        'continuity-missing-trigger': () => { state.continuityContract.updateTriggers.pop(); },
        'continuity-label-collision': () => { state.continuityContract.retrievalConcepts[1].alternativeLabels.push('status'); },
        'continuity-missing-route': () => { state.continuityContract.retrievalConcepts[0].relatedPaths.push('docs/work/does-not-exist.md'); },
        'handoff-wrong-worktree': () => { state.continuity = state.continuity.replace(/^- Workspace path:.*$/m, '- Workspace path: `C:\\wrong-checkout`'); },
        'handoff-missing-rationale': () => { state.nextTask = state.nextTask.replace(/^- Why next:.*\r?\n/m, ''); },
        'handoff-stale-artifact': () => {
            state.continuity = state.continuity.replace(/(^- Current artifact:.*?SHA-256 `)[a-f0-9]{64}(`)/mi, `$1${'0'.repeat(64)}$2`);
        },
    };
    if (!Object.hasOwn(mutations, id)) throw new Error(`Unknown modernization assurance audit mutation: ${id}`);
    mutations[id]();
}
