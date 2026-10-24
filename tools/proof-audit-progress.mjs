import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

export const AUDIT_GROUPS = Object.freeze(['routing', 'runtime-oracles', 'native-ui', 'presentation', 'assurance', 'architecture']);
export function parseAuditGroups(value) {
    const groups = value === undefined ? [...AUDIT_GROUPS] : value.split(',');
    assert.ok(groups.length && new Set(groups).size === groups.length && groups.every(group => AUDIT_GROUPS.includes(group)), 'Unknown, empty or duplicate proof audit group');
    return groups;
}
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function createAuditProgress({ identity, outputPath, resumePath = null }) {
    const identitySha256 = digest(identity);
    const previous = resumePath ? JSON.parse(readFileSync(resumePath, 'utf8')) : null;
    if (previous) {
        assert.equal(previous.schemaVersion, 1, 'Invalid audit progress schema');
        assert.equal(previous.identitySha256, identitySha256, 'Stale audit progress: inputs or environment changed');
        assert.equal(digest(previous.identity), identitySha256, 'Tampered audit progress identity');
        assert.ok(Array.isArray(previous.cases), 'Invalid audit progress cases');
    }
    const reusable = new Map((previous?.cases || []).filter(item => item.status === 'passed').map(item => [item.key, item]));
    const progress = { schemaVersion: 1, kind: 'proof-audit-progress', status: 'in-progress', identity, identitySha256, cases: [], workSuccessCertified: false };
    const save = () => {
        if (!outputPath) return;
        mkdirSync(path.dirname(outputPath), { recursive: true });
        // A truncated write is invalid JSON and cannot be resumed as a pass.
        writeFileSync(outputPath, `${JSON.stringify(progress, null, 2)}\n`);
    };
    save();
    return {
        execute(group, label, kind, command, args, { env = {}, pattern } = {}, run) {
            const key = digest({ group, label, kind, command, args, env, pattern: pattern?.source, flags: pattern?.flags });
            const prior = reusable.get(key);
            const startedAt = Date.now();
            const result = prior?.result || run();
            const output = `${result.stdout || ''}\n${result.stderr || ''}`;
            const valid = kind === 'positive' ? result.status === 0 : Number.isInteger(result.status) && result.status !== 0 && (!pattern || new RegExp(pattern.source, pattern.flags).test(output));
            const item = { key, group, label, kind, status: valid ? 'passed' : 'failed', reused: Boolean(prior), durationMs: Date.now() - startedAt,
                result: { status: result.status, stdout: result.stdout || '', stderr: result.stderr || '' } };
            progress.cases.push(item);
            if (!valid) progress.status = 'failed';
            save();
            if (!valid) throw new Error(kind === 'positive' ? `${label}: valid control was rejected\n${output}`
                : result.status === 0 ? `${label}: mutation was not rejected` : `${label}: failed for the wrong reason\n${output}`);
            return result;
        },
        finish() { progress.status = 'passed'; save(); return progress; },
        fail(error) { progress.status = 'failed'; progress.failure = String(error.message); save(); },
        snapshot() { return structuredClone(progress); },
    };
}
