import { spawnSync } from 'node:child_process';

export function assertTrackedContentClean(rootDir, expectedHead) {
    if(!/^[a-f0-9]{40}$/.test(expectedHead || ''))throw new Error('Expected receipt HEAD must be an exact commit SHA');
    const run=args=>{const result=spawnSync('git',args,{cwd:rootDir,encoding:'utf8',shell:false});if(![0,1].includes(result.status))throw new Error(result.stderr || 'Unable to compare Git content');return result;};
    const checkHead=()=>{const result=run(['rev-parse','HEAD']);if(result.status!==0 || result.stdout.trim()!==expectedHead)throw new Error(`Wrong-head receipt: expected ${expectedHead}, actual ${result.stdout.trim()}`);};
    checkHead();
    const working=run(['diff','--quiet',expectedHead,'--']);
    const indexed=run(['diff','--cached','--quiet',expectedHead,'--']);
    const status=run(['status','--porcelain','--untracked-files=no']);
    if(status.status!==0)throw new Error('Unable to read Git status');
    checkHead();
    // Porcelain may retain a stat-only M for canonical CRLF build outputs whose Git content is LF-identical.
    // Check index separately: a staged change cancelled by the working file must not look clean.
    if(working.status!==0 || indexed.status!==0)throw new Error(`Dirty tracked worktree cannot consume a commit receipt:\n${status.stdout.trim()}`);
    return {head:expectedHead,workingContent:'HEAD_IDENTICAL',indexContent:'HEAD_IDENTICAL',statStatus:status.stdout.trim()};
}
