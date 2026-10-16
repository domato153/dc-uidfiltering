import assert from 'node:assert/strict';
import { repositoryPath } from './continuity-state.mjs';

export const POLICY_KEYS = ['schemaVersion', 'governingOwner', 'repository', 'remoteUrl', 'branch', 'scope', 'workflowName', 'requiredJob', 'localValidation', 'forbiddenActions', 'evidenceScope', 'workSuccessCertified'];
export function validateCheckpointPolicy(policy) {
    assert.deepEqual(Object.keys(policy).sort(), [...POLICY_KEYS].sort(), 'checkpoint policy fields');
    assert.equal(policy.schemaVersion, 1);
    assert.equal(policy.governingOwner, 'AGENTS.md');
    assert.equal(policy.repository, 'domato153/dc-uidfiltering');
    assert.equal(policy.remoteUrl, 'https://github.com/domato153/dc-uidfiltering.git');
    assert.equal(policy.branch, 'codex/ui-port-boundary');
    assert.equal(policy.scope, 'WORKING_CHECKPOINT_ONLY');
    assert.equal(policy.evidenceScope, 'CHECKPOINT_ONLY');
    assert.equal(policy.workSuccessCertified, false);
    assert.equal(policy.workflowName, 'DCUF development CI');
    assert.equal(policy.requiredJob, 'working-checkpoint');
    assert.deepEqual(policy.localValidation, ['node', 'tools/verify-repo.mjs', 'all']);
    assert.deepEqual(policy.forbiddenActions, ['force-push', 'merge', 'rebase', 'branch-switch', 'official-branch', 'tag', 'release', 'live-dispatch']);
    return policy;
}
export function validateCheckpointPaths(paths) {
    assert.ok(Array.isArray(paths) && paths.length && new Set(paths).size === paths.length, 'explicit unique paths required');
    for (const relative of paths) {
        repositoryPath(relative);
        assert.ok(!/[\r\n*?\[\]]/.test(relative) && !relative.startsWith('-'), 'literal file paths only');
        assert.ok(!/^(?:artifacts|testbed\/artifacts|node_modules|Legacy[^/]*|\.codex|\.git|attachments)(?:\/|$)/i.test(relative), 'local/raw/ignored paths forbidden');
        assert.ok(!/(?:^|\/)(?:\.env(?:\..*)?|credentials[^/]*|secrets?[^/]*|debug\.log)$/i.test(relative), 'sensitive/diagnostic path forbidden');
    }
    return paths;
}
export function validateCheckpointFiles(paths, describe) {
    validateCheckpointPaths(paths);
    for (const relative of paths) {
        const entry = describe(relative);
        assert.ok(entry && !entry.symlink && (entry.file || entry.deletedTrackedFile), `explicit regular file required: ${relative}`);
    }
    return paths;
}
export function assertCheckpointContext(context, policy) {
    assert.equal(context.cwd, context.toolRoot, 'WRONG_ROOT: run from the development repository root');
    assert.equal(context.gitRoot, context.toolRoot, 'WRONG_ROOT: Git and tool roots differ');
    assert.equal(context.branch, policy.branch, 'WRONG_BRANCH: do not switch automatically');
    assert.equal(context.remote, policy.remoteUrl, 'WRONG_REMOTE');
    assert.equal(context.upstream, `origin/${policy.branch}`, 'WRONG_UPSTREAM');
}
export function reconcilePush(expected, commit, observed) {
    if (observed === commit) return 'REMOTE_SYNCED_CI_PENDING';
    if (observed === null) return 'COMMITTED_PENDING_PUSH';
    if (observed === expected) return 'COMMITTED_PENDING_PUSH';
    throw new Error('REMOTE_DRIFT: retain the local commit; do not merge, overwrite or force');
}
// Dependency injection makes transport and tree-boundary faults testable without a production bypass.
export async function publishCheckpoint({ git, remoteHead, validate, checkBoundary, save, paths, message, expectedRemote, policySha256 }) {
    assert.equal(typeof checkBoundary, 'function', 'fresh context/input boundary check required');
    validateCheckpointPaths(paths);
    assert.match(expectedRemote, /^[a-f0-9]{40}$/);
    assert.ok(typeof message === 'string' && message.trim() && !message.startsWith('-'), 'commit message required');
    assert.equal(git(['diff', '--cached', '--name-only']).trim(), '', 'existing staged user changes: stop');
    assert.equal(await remoteHead(), expectedRemote, 'REMOTE_DRIFT before staging');
    const base = git(['rev-parse', 'HEAD']).trim();
    git(['merge-base', '--is-ancestor', expectedRemote, base]);
    git(['add', '--', ...paths]);
    const tree = git(['write-tree']).trim();
    assert.notEqual(tree, git(['rev-parse', 'HEAD^{tree}']).trim(), 'empty checkpoint');
    await validate(paths);
    await checkBoundary();
    assert.equal(git(['rev-parse', 'HEAD']).trim(), base, 'HEAD changed during validation');
    assert.equal(git(['write-tree']).trim(), tree, 'index changed during validation');
    assert.equal(git(['diff', '--name-only']).trim(), '', 'working files changed during validation');
    assert.equal(await remoteHead(), expectedRemote, 'REMOTE_DRIFT before commit');
    git(['commit', '-m', message]);
    const commit = git(['rev-parse', 'HEAD']).trim();
    assert.equal(git(['rev-parse', `${commit}^{tree}`]).trim(), tree, 'commit hook changed the validated tree; do not push');
    assert.equal(git(['diff', '--name-only']).trim(), '', 'commit hook changed the worktree; do not push');
    await checkBoundary();
    const receipt = { schemaVersion: 1, scope: 'CHECKPOINT_ONLY', workSuccessCertified: false, base, tree, commit, expectedRemote, policySha256, validation: 'LOCAL_VALIDATED', status: 'COMMITTED_PENDING_PUSH' };
    await save(receipt);
    return pushCheckpoint({ git, remoteHead, checkBoundary, save, receipt });
}
export async function pushCheckpoint({ git, remoteHead, checkBoundary, save, receipt }) {
    assert.equal(typeof checkBoundary, 'function', 'fresh retry boundary check required');
    await checkBoundary();
    assert.equal(git(['rev-parse', 'HEAD']).trim(), receipt.commit, 'retry requires the same local HEAD');
    assert.equal(git(['rev-parse', `${receipt.commit}^{tree}`]).trim(), receipt.tree, 'retry tree mismatch');
    assert.equal(git(['diff', '--name-only']).trim(), '', 'dirty tracked retry');
    assert.equal(git(['diff', '--cached', '--name-only']).trim(), '', 'staged retry');
    const before = await remoteHead();
    await checkBoundary();
    if (before !== receipt.commit) {
        assert.equal(before, receipt.expectedRemote, 'REMOTE_DRIFT before push');
        try { git(['push', 'origin', `${receipt.commit}:refs/heads/codex/ui-port-boundary`]); }
        catch { /* A lost acknowledgement may still have published exactly this commit. */ }
    }
    let observed = null;
    try { observed = await remoteHead(); } catch { /* Preserve the committed checkpoint for retry. */ }
    await checkBoundary();
    receipt.status = reconcilePush(receipt.expectedRemote, receipt.commit, observed);
    receipt.observedRemote = observed;
    await save(receipt);
    return receipt;
}
export function qualifyCheckpointCI(run, jobs, commit, observedRemote) {
    assert.equal(observedRemote, commit, 'fresh identical remote observation required for CI qualification');
    assert.equal(run.head_sha, commit, 'CI is for a different commit');
    assert.equal(run.event, 'push', 'CI must be a push checkpoint');
    assert.equal(run.name, 'DCUF development CI', 'wrong CI workflow');
    assert.equal(run.head_branch, 'codex/ui-port-boundary', 'wrong CI branch');
    assert.equal(run.status, 'completed', 'CI still pending');
    assert.equal(run.conclusion, 'success', 'CI did not succeed');
    const selected = jobs.filter(job => job.name === 'working-checkpoint');
    assert.equal(selected.length, 1, 'missing/duplicate checkpoint job');
    assert.equal(selected[0].conclusion, 'success', 'checkpoint job did not succeed');
    return { status: 'CI_VERIFIED_CHECKPOINT', scope: 'CHECKPOINT_ONLY', workSuccessCertified: false, commit, runId: run.id, runAttempt: run.run_attempt, url: run.html_url };
}
export function observeCheckpointCI(run, jobs, commit, observedRemote) {
    assert.equal(observedRemote, commit, 'fresh identical remote observation required for CI qualification');
    if (run) {
        assert.equal(run.head_sha, commit, 'CI is for a different commit');
        assert.equal(run.event, 'push', 'CI must be a push checkpoint');
        assert.equal(run.name, 'DCUF development CI', 'wrong CI workflow');
        assert.equal(run.head_branch, 'codex/ui-port-boundary', 'wrong CI branch');
    }
    if (!run || run.status !== 'completed') {
        return { status: 'REMOTE_SYNCED_CI_PENDING', scope: 'CHECKPOINT_ONLY', workSuccessCertified: false,
            commit, runId: run?.id || null, url: run?.html_url || null, reason: run ? run.status : 'run-not-visible' };
    }
    return qualifyCheckpointCI(run, jobs, commit, observedRemote);
}
