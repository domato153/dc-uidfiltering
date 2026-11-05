import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCandidateFingerprint, listChangedCandidateFiles } from './evidence-binding.mjs';
import { parseNextAction } from './continuity-state.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function git(args) {
    const result = spawnSync('git', args, { cwd: rootDir, encoding: 'utf8', shell: false });
    if (result.status !== 0) throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed`);
    return result.stdout.trim();
}

async function digestFile(relative) {
    try {
        const bytes = await readFile(path.join(rootDir, relative));
        return {
            path: relative,
            sha256: createHash('sha256').update(bytes).digest('hex').toUpperCase(),
            state: 'present',
        };
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        return { path: relative, sha256: null, state: 'missing' };
    }
}

const changedFiles = listChangedCandidateFiles(rootDir);
const nextText = await readFile(path.join(rootDir, 'docs/work/NEXT_TASK.md'), 'utf8');
const nextAction = parseNextAction(nextText);
const selected = nextAction.requiredDependencies.find(item => item.id === 'selected-design-image');
const selectedDesignReference = selected ? {
    ...await digestFile(selected.path),
    expectedSha256: selected.sha256,
    region: nextText.match(/^- Design reference region: (.+)$/m)?.[1] || null,
} : null;
if (selectedDesignReference) selectedDesignReference.matchesSelection = selected.mode === 'FROZEN'
    && Boolean(selectedDesignReference.region)
    && selectedDesignReference.sha256?.toLowerCase() === selected.sha256.toLowerCase();
const artifacts = await Promise.all([
    'testbed/artifacts/runtime-under-test.user.js',
    'Dc_UserFilter_Mobile_v3.5.5.user.js',
    'dist/Dc_UserFilter_Mobile_v3.5.5.user.js',
    'dcinside_user_filter_v1.9.9.user.js',
    'dist/dcinside_user_filter_v1.9.9.user.js',
].map(digestFile));

console.log(JSON.stringify({
    schemaVersion: 1,
    branch: git(['branch', '--show-current']),
    head: git(['rev-parse', 'HEAD']),
    nextActionId: nextAction.id,
    selectedDesignReference,
    candidateFingerprint: await createCandidateFingerprint(rootDir),
    changedFileCount: changedFiles.length,
    changedFiles,
    artifacts,
}, null, 2));
