import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

export const CURRENT_HEADING = '## Current execution';
export const STATE_LABELS = ['Active plan', 'Workspace path', 'Active stage', 'Source state', 'Local-only state', 'Candidate fingerprint', 'Last current audit', 'Accepted baseline', 'Current artifact', 'Blockers', 'Pending live checks'];
export const DECISION_STATUSES = ['ADOPTED', 'PROVISIONAL', 'DEFERRED', 'REJECTED', 'FULFILLED', 'SUPERSEDED'];
export const CLOSURE_TRIGGERS = ['policy-change', 'routing-change', 'material-handoff-failure', 'stage-close', 'high-risk-transfer', 'explicit-closure'];

function requireValue(condition, message) { if (!condition) throw new Error(message); }
function exactKeys(value, keys, label) {
    requireValue(value && typeof value === 'object' && !Array.isArray(value), `${label}: object required`);
    requireValue(Object.keys(value).every(key => keys.includes(key)) && keys.every(key => Object.hasOwn(value, key)), `${label}: closed fields required`);
}
export function repositoryPath(relative) {
    requireValue(typeof relative === 'string' && relative.length > 0 && !/[\\\x00-\x1f:]/.test(relative) && !relative.startsWith('/') && !relative.split('/').some(part => !part || part === '.' || part === '..'), 'unsafe repository path');
    return relative;
}
export function currentSection(text) {
    const normalized = text.replace(/\r\n/g, '\n');
    const headings = [...normalized.matchAll(/^## Current execution$/gm)];
    requireValue(headings.length === 1, 'continuity: exactly one Current execution section required');
    const start = headings[0].index + CURRENT_HEADING.length;
    const tail = normalized.slice(start);
    const end = tail.search(/^## /m);
    const section = end < 0 ? tail : tail.slice(0, end);
    for (const label of STATE_LABELS) {
        const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`^- ${escaped}: (.+)$`, 'gm');
        const all = [...normalized.matchAll(pattern)];
        const own = [...section.matchAll(pattern)];
        requireValue(own.length === 1 && all.length === 1, `continuity: ${label} must occur once in the current section, never fall back to history`);
    }
    return section;
}
export function parseCurrentArtifacts(text) {
    const section = currentSection(text);
    const blocks = [...section.matchAll(/```dcuf-current-artifacts\r?\n([\s\S]*?)\r?\n```/g)];
    requireValue(blocks.length === 1, 'continuity: exactly one typed current artifact identity required');
    const artifacts = JSON.parse(blocks[0][1]);
    exactKeys(artifacts, ['schemaVersion', 'mobile', 'pc'], 'current artifacts');
    requireValue(artifacts.schemaVersion === 1, 'invalid artifact identity schema');
    for (const target of ['mobile', 'pc']) {
        exactKeys(artifacts[target], ['sha256'], `${target} artifact`);
        requireValue(/^[a-f0-9]{64}$/i.test(artifacts[target].sha256), 'invalid current artifact digest');
    }
    return artifacts;
}
export function selectContinuityProfile(signals = []) {
    requireValue(signals.every(signal => CLOSURE_TRIGGERS.includes(signal)), 'unknown continuity trigger');
    return signals.length ? 'closure' : 'routine';
}
export function parseNextAction(text) {
    const blocks = [...text.matchAll(/```dcuf-next-action\r?\n([\s\S]*?)\r?\n```/g)];
    requireValue(blocks.length === 1, 'handoff: exactly one typed next action required');
    const action = JSON.parse(blocks[0][1]);
    exactKeys(action, ['id', 'stageId', 'requiredDependencies', 'requiredDecisions', 'decisions', 'hazards', 'localEvidence', 'qualificationScope', 'workSuccessCertified'], 'next action');
    requireValue(/^[a-z0-9][a-z0-9-]*$/.test(action.id) && /^[a-z0-9][a-z0-9-]*$/.test(action.stageId), 'invalid action identity');
    requireValue(action.qualificationScope === 'CONTINUITY_ONLY' && action.workSuccessCertified === false, 'handoff cannot certify work success');
    requireValue(text.match(/^- Task ID:\s*`([^`]+)`/m)?.[1] === action.stageId, 'typed action stage mismatch');
    requireValue(text.match(/^- Bounded slice:\s*`([^`]+)`/m)?.[1] === action.id, 'typed action identity mismatch');
    for (const field of ['Objective', 'Why next', 'Expected transition', 'Stop/replan']) {
        requireValue([...text.matchAll(new RegExp(`^- ${field}: .+`, 'gm'))].length === 1, `next action requires one ${field}`);
    }
    requireValue(Array.isArray(action.requiredDependencies) && action.requiredDependencies.length > 0, 'missing action dependency closure');
    const dependencyIds = new Set();
    for (const dependency of action.requiredDependencies) {
        exactKeys(dependency, ['id', 'path', 'mode', 'sha256'], 'dependency');
        requireValue(typeof dependency.id === 'string' && dependency.id && !dependencyIds.has(dependency.id), 'duplicate dependency');
        dependencyIds.add(dependency.id);
        repositoryPath(dependency.path);
        requireValue(['LIVE', 'FROZEN'].includes(dependency.mode), 'invalid dependency mode');
        requireValue(dependency.mode === 'FROZEN' ? /^[a-f0-9]{64}$/i.test(dependency.sha256) : dependency.sha256 === null, 'invalid dependency identity');
    }
    requireValue(action.requiredDependencies.find(dependency => dependency.id === 'governing-policy')?.path === 'AGENTS.md', 'missing governing policy dependency');
    requireValue(Array.isArray(action.decisions) && Array.isArray(action.requiredDecisions) && action.requiredDecisions.length > 0, 'missing decision closure');
    const decisions = new Map();
    for (const decision of action.decisions) {
        exactKeys(decision, ['id', 'status', 'boundary', 'source'], 'decision');
        requireValue(typeof decision.id === 'string' && decision.id && !decisions.has(decision.id), 'duplicate decision');
        requireValue(DECISION_STATUSES.includes(decision.status) && typeof decision.boundary === 'string' && decision.boundary.trim(), 'invalid decision disposition');
        repositoryPath(decision.source);
        requireValue(action.requiredDependencies.some(dependency => dependency.path === decision.source), 'decision owner omitted from dependencies');
        decisions.set(decision.id, decision);
    }
    requireValue(new Set(action.requiredDecisions).size === action.requiredDecisions.length, 'duplicate entry decision');
    for (const id of action.requiredDecisions) requireValue(decisions.get(id)?.status === 'ADOPTED', 'missing adopted entry decision; do not skip admission');
    requireValue(Array.isArray(action.hazards) && Array.isArray(action.localEvidence), 'missing hazard/local evidence inventory');
    const hazardIds = new Set();
    for (const hazard of action.hazards) {
        exactKeys(hazard, ['id', 'effect', 'status'], 'hazard');
        requireValue(hazard.id && !hazardIds.has(hazard.id) && typeof hazard.effect === 'string' && hazard.effect.trim() && hazard.status === 'ACTIVE', 'invalid current hazard');
        hazardIds.add(hazard.id);
    }
    const evidencePaths = new Set();
    for (const item of action.localEvidence) {
        exactKeys(item, ['path', 'disposition', 'recovery'], 'local evidence');
        repositoryPath(item.path);
        requireValue(!evidencePaths.has(item.path) && ['DURABLE', 'REGENERATE', 'UNRECOVERABLE'].includes(item.disposition) && typeof item.recovery === 'string' && item.recovery.trim(), 'invalid local evidence');
        evidencePaths.add(item.path);
        requireValue(item.disposition !== 'UNRECOVERABLE' || !action.requiredDependencies.some(dependency => dependency.path === item.path), 'next action depends on unrecoverable evidence');
    }
    return action;
}
export function reconcileNextAction(action, rootDir) {
    for (const dependency of action.requiredDependencies) {
        const absolute = path.join(rootDir, dependency.path);
        requireValue(existsSync(absolute), `STALE_REPLAN: missing dependency ${dependency.id}`);
        if (dependency.mode === 'FROZEN') {
            const actual = createHash('sha256').update(readFileSync(absolute)).digest('hex');
            requireValue(actual === dependency.sha256.toLowerCase(), `STALE_REPLAN: changed frozen dependency ${dependency.id}`);
        }
    }
    return { outcome: 'ACCEPTED', scope: 'DECLARED_DEPENDENCIES_ONLY', actionId: action.id, semanticCompletenessRequiresColdReader: true, workSuccessCertified: false };
}
