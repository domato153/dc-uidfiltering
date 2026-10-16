export async function executeGateSequence(commands, execute, onProgress = async () => {}) {
    const results = [];
    const blockedProfiles = new Map();
    let policyBlock = null;
    for (const item of commands) {
        const blocker = policyBlock || blockedProfiles.get(item.profile);
        if (blocker && !item.always) {
            results.push({ ...item, status: 'blocked', exitCode: null, durationMs: 0, blockedBy: blocker });
        } else {
            const startedAt = Date.now();
            const exitCode = await execute(item);
            results.push({ ...item, status: exitCode === 0 ? 'passed' : 'failed', exitCode, durationMs: Date.now() - startedAt });
            if (exitCode !== 0 && item.prerequisite) {
                const cause = `${item.profile}/${item.id}`;
                blockedProfiles.set(item.profile, cause);
                if (item.profile === 'policy') policyBlock = cause;
            }
        }
        await onProgress(results);
    }
    return results;
}
