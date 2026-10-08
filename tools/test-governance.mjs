import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { currentSection, STATE_LABELS, parseNextAction, reconcileNextAction, selectContinuityProfile, repositoryPath } from './continuity-state.mjs';
import { validateCheckpointPolicy, validateCheckpointPaths, validateCheckpointFiles, assertCheckpointContext, reconcilePush, publishCheckpoint, pushCheckpoint, qualifyCheckpointCI } from './checkpoint-core.mjs';
import { GOVERNANCE_PROOF_PATHS, hashPaths, assertEvidenceBinding } from './evidence-binding.mjs';
import { policyBrowserSequenceIsValid } from './workflow-sequence.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policy = validateCheckpointPolicy(JSON.parse(readFileSync(path.join(root, 'verification/checkpoint-policy.json'))));
let checks = 0;
const test = async (name, action) => { await action(); checks++; console.log(`PASS ${name}`); };
await test('retired dirty parent policy is losslessly recoverable, not executable',()=> {
    const archive=readFileSync(path.join(root,'docs/archive/policy/parent-agent-policy-2026-10-04.md'),'utf8').replace(/\r\n/g,'\n');
    const original=archive.split('<!-- preserved original begins -->\n')[1];
    assert.equal(createHash('sha256').update(original).digest('hex'),archive.match(/Canonical LF original SHA-256: `([a-f0-9]{64})`/)[1]);
    const dirtyDiff=JSON.parse(readFileSync(path.join(root,'docs/archive/policy/parent-agent-policy-2026-10-04.diff.json'),'utf8'));
    assert.equal(dirtyDiff.kind,'HISTORICAL_DIFF'); assert.equal(dirtyDiff.encoding,'UTF-8-LF');
    assert.ok(dirtyDiff.diff.includes('workflow is discontinued'));
});
const current = `# State\n\n## Current execution\n${STATE_LABELS.map(label => `- ${label}: value`).join('\n')}\n\n## History\nold evidence\n`;
await test('current fields are section-bound', () => assert.ok(currentSection(current).includes('- Active stage: value')));
await test('history cannot fill missing current field', () => assert.throws(() => currentSection(current.replace('- Active stage: value\n', '').replace('old evidence', '- Active stage: historical')), /never fall back/));
await test('duplicate current/history field rejected', () => assert.throws(() => currentSection(current.replace('old evidence', '- Active stage: historical')), /once/));
await test('duplicate active section rejected', () => assert.throws(() => currentSection(`${current}\n## Current execution\n`), /exactly one/));
await test('routine/closure are signal-selected, not thread/HEAD selected', () => { assert.equal(selectContinuityProfile([]), 'routine'); assert.equal(selectContinuityProfile(['policy-change']), 'closure'); assert.throws(() => selectContinuityProfile(['new-thread']), /unknown/); });
const packet = readFileSync(path.join(root, 'docs/work/NEXT_TASK.md'), 'utf8');
const action = parseNextAction(packet);
const withAction = changed => packet.replace(/```dcuf-next-action\r?\n[\s\S]*?\r?\n```/, `\`\`\`dcuf-next-action\n${JSON.stringify(changed)}\n\`\`\``);
await test('typed action reconciles declared current files only', () => { const receipt = reconcileNextAction(action, root); assert.equal(receipt.outcome, 'ACCEPTED'); assert.equal(receipt.workSuccessCertified, false); });
await test('missing entry decision rejected despite fresh hashes', () => { const value = structuredClone(action); value.decisions = value.decisions.filter(item => item.id !== value.requiredDecisions[0]); assert.throws(() => parseNextAction(withAction(value)), /entry decision/); });
await test('provisional decision cannot authorize entry', () => { const value = structuredClone(action); value.decisions.find(item => item.id === value.requiredDecisions[0]).status = 'PROVISIONAL'; assert.throws(() => parseNextAction(withAction(value)), /entry decision/); });
await test('missing decision owner dependency rejected', () => { const value = structuredClone(action); value.requiredDependencies = value.requiredDependencies.filter(item => item.path !== value.decisions[1].source); assert.throws(() => parseNextAction(withAction(value)), /owner omitted/); });
await test('unrecoverable required local evidence rejected', () => { const value = structuredClone(action); value.localEvidence.push({path:value.requiredDependencies[0].path,disposition:'UNRECOVERABLE',recovery:'No recovery'}); assert.throws(() => parseNextAction(withAction(value)), /unrecoverable/); });
await test('handoff cannot certify product success', () => { const value = structuredClone(action); value.workSuccessCertified = true; assert.throws(() => parseNextAction(withAction(value)), /certify/); });
await test('stage disagreement rejected', () => assert.throws(() => parseNextAction(packet.replace(/^- Task ID:.*$/m, '- Task ID: `other-stage`')), /stage mismatch/));
await test('missing dependency/frozen drift rejected', () => { const value = structuredClone(action); value.requiredDependencies.push({id:'missing',path:'not-present',mode:'LIVE',sha256:null}); assert.throws(() => reconcileNextAction(value,root), /missing dependency/); const frozen = structuredClone(action); frozen.requiredDependencies.find(item => item.mode === 'FROZEN').sha256 = '0'.repeat(64); assert.throws(() => reconcileNextAction(frozen,root), /changed frozen/); });
await test('literal safe paths only', () => { for (const value of ['../x', '/x', 'C:/x', 'a\\b', 'a//b']) assert.throws(() => repositoryPath(value)); for(const value of ['src/*','artifacts/a.json','.env','debug.log','-x']) assert.throws(() => validateCheckpointPaths([value])); assert.throws(() => validateCheckpointPaths(['x','x'])); });
await test('directory/symlink sweeps rejected; explicit file/deletion accepted', () => { assert.throws(()=>validateCheckpointFiles(['src'],()=>({file:false})),/regular file/); assert.throws(()=>validateCheckpointFiles(['src/link'],()=>({file:true,symlink:true})),/regular file/); validateCheckpointFiles(['src/file'],()=>({file:true})); validateCheckpointFiles(['src/deleted'],()=>({deletedTrackedFile:true})); });
const context = {cwd:'root',toolRoot:'root',gitRoot:'root',branch:policy.branch,remote:policy.remoteUrl,upstream:`origin/${policy.branch}`};
await test('root/branch/remote/upstream guards cannot be waived by CI', () => { assertCheckpointContext(context,policy); for(const key of ['cwd','gitRoot','branch','remote','upstream']) assert.throws(() => assertCheckpointContext({...context,[key]:'wrong'},policy)); });
await test('policy cannot widen to official publication', () => { assert.throws(() => validateCheckpointPolicy({...policy,branch:'main'})); assert.throws(() => validateCheckpointPolicy({...policy,workSuccessCertified:true})); assert.throws(() => validateCheckpointPolicy({...policy,extra:true})); });
await test('policy Chromium prerequisites reject missing, commented, duplicate and misordered commands',()=> {
    const command = '        run: node testbed/node_modules/playwright/cli.js install --with-deps chromium\n';
    const locked = '        run: pnpm install --frozen-lockfile\n';
    const gate = '        run: node tools/run-gates.mjs artifacts/impact.json artifacts/policy-result.json --only policy,proof-core,proof-runtime\n';
    const condition = "        if: steps.route.outputs.proofRuntime == 'true'\n";
    const fixture = '\n  policy:\n'+locked+condition+command+gate+'\n  affected:\n';
    assert.equal(policyBrowserSequenceIsValid(readFileSync(path.join(root,'.github/workflows/development-ci.yml'),'utf8')),true);
    assert.equal(policyBrowserSequenceIsValid(fixture),true);
    for(const changed of [fixture.replace(command,''),fixture.replace(command,'        # '+command.trim()+'\n        run: echo skipped\n'),fixture.replace(command,command+command),'\n  policy:\n'+command+locked+gate+'\n  affected:\n','\n  policy:\n'+locked+gate+command+'\n  affected:\n',fixture.replace(command,'')+command,fixture.replace(locked,'')])assert.equal(policyBrowserSequenceIsValid(changed),false);
});
await test('push acknowledgement and unknown transport are separate', () => { assert.equal(reconcilePush('base','commit','commit'),'REMOTE_SYNCED_CI_PENDING'); assert.equal(reconcilePush('base','commit',null),'COMMITTED_PENDING_PUSH'); assert.equal(reconcilePush('base','commit','base'),'COMMITTED_PENDING_PUSH'); assert.throws(() => reconcilePush('base','commit','other'),/REMOTE_DRIFT/); });
const sha = 'a'.repeat(40);
const run = {id:1,run_attempt:1,name:policy.workflowName,event:'push',head_sha:sha,head_branch:policy.branch,status:'completed',conclusion:'success',html_url:'https://github.com/example/run/1'};
await test('CI qualification exact SHA, event, branch and successful job', () => { assert.equal(qualifyCheckpointCI(run,[{name:policy.requiredJob,conclusion:'success'}],sha,sha).workSuccessCertified,false); for(const patch of [{head_sha:'b'.repeat(40)},{event:'workflow_dispatch'},{head_branch:'main'},{status:'in_progress'},{conclusion:'failure'}]) assert.throws(() => qualifyCheckpointCI({...run,...patch},[{name:policy.requiredJob,conclusion:'success'}],sha,sha)); assert.throws(() => qualifyCheckpointCI(run,[{name:policy.requiredJob,conclusion:'skipped'}],sha,sha)); assert.throws(() => qualifyCheckpointCI(run,[{name:policy.requiredJob,conclusion:'success'}],sha,'b'.repeat(40)),/fresh identical remote/); });

const temp = mkdtempSync(path.join(os.tmpdir(), 'dcuf-governance-'));
const local = path.join(temp,'local'), bare = path.join(temp,'remote.git');
mkdirSync(local); mkdirSync(bare);
const command = (cwd,args) => { const result=spawnSync('git',args,{cwd,encoding:'utf8',shell:false}); if(result.status!==0) throw new Error(result.stderr); return result.stdout; };
const git = args => command(local,args);
try {
    await test('governance proof inputs bind helper-only edits to evidence validity',async()=> {
        const fixture=path.join(temp,'proof-inputs');
        for(const relative of GOVERNANCE_PROOF_PATHS) {
            mkdirSync(path.dirname(path.join(fixture,relative)),{recursive:true});
            writeFileSync(path.join(fixture,relative),readFileSync(path.join(root,relative)));
        }
        for(const relative of ['tools/git-tree-state.mjs','tools/continuity-state.mjs','tools/checkpoint-core.mjs','verification/checkpoint-policy.json'])assert.ok(GOVERNANCE_PROOF_PATHS.includes(relative));
        const original={proofSystemSha256:await hashPaths(fixture,GOVERNANCE_PROOF_PATHS)};
        const helper=path.join(fixture,'tools/git-tree-state.mjs');
        writeFileSync(helper,readFileSync(helper,'utf8')+'\n// isolated proof-input negative\n');
        const changed={proofSystemSha256:await hashPaths(fixture,GOVERNANCE_PROOF_PATHS)};
        assert.throws(()=>assertEvidenceBinding(original,changed),/Stale evidence receipt: proofSystemSha256/);
    });
    command(bare,['init','--bare']); git(['init','-b',policy.branch]); git(['config','user.name','Governance Test']); git(['config','user.email','test@example.invalid']); git(['config','core.autocrlf','false']);
    writeFileSync(path.join(local,'input.txt'),'base\n'); git(['add','--','input.txt']); git(['commit','-m','base']); git(['remote','add','origin',bare]); git(['push','-u','origin',policy.branch]);
    const base=git(['rev-parse','HEAD']).trim();
    const remoteHead=async()=>git(['ls-remote','origin',`refs/heads/${policy.branch}`]).split(/\s+/)[0];
    const saved=[]; const save=async receipt=>saved.push(structuredClone(receipt));
    writeFileSync(path.join(local,'input.txt'),'candidate\n');
    await test('real temporary Git exact-tree commit/push and no duplicate resume', async()=> {
        const receipt=await publishCheckpoint({git,remoteHead,checkBoundary:async()=>{},save,paths:['input.txt'],message:'candidate',expectedRemote:base,policySha256:'0'.repeat(64),validate:async()=>assert.equal(git(['diff','--name-only']).trim(),'')});
        assert.equal(receipt.status,'REMOTE_SYNCED_CI_PENDING'); assert.equal(receipt.commit,await remoteHead()); assert.equal(receipt.tree,git(['rev-parse','HEAD^{tree}']).trim()); assert.equal(saved[0].status,'COMMITTED_PENDING_PUSH');
        await pushCheckpoint({git,remoteHead,checkBoundary:async()=>{},save,receipt}); assert.equal(git(['rev-list','--count','HEAD']).trim(),'2');
    });
    writeFileSync(path.join(local,'input.txt'),'next\n');
    await test('validation worktree drift prevents commit', async()=> {
        const expectedRemote=await remoteHead(); const head=git(['rev-parse','HEAD']).trim();
        await assert.rejects(()=>publishCheckpoint({git,remoteHead,checkBoundary:async()=>{},save,paths:['input.txt'],message:'must not commit',expectedRemote,policySha256:'0'.repeat(64),validate:async()=>writeFileSync(path.join(local,'input.txt'),'changed during validation\n')}),/working files changed/);
        assert.equal(git(['rev-parse','HEAD']).trim(),head);
    });
} finally {
    assert.ok(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep) && path.basename(temp).startsWith('dcuf-governance-'));
    rmSync(temp,{recursive:true,force:true});
}
// Simulated loss after publication and retry-without-commit exercise the real push state machine.
await test('lost push acknowledgement reconciles exact remote commit', async()=> {
    const receipt={commit:'c'.repeat(40),tree:'t',expectedRemote:'b'.repeat(40)}; let observed=receipt.expectedRemote;
    const fakeGit=args=>{ if(args[0]==='push'){observed=receipt.commit; throw new Error('lost ack');} if(args[0]==='diff')return ''; return args[1]==='HEAD' ? receipt.commit : receipt.tree; };
    assert.equal((await pushCheckpoint({git:fakeGit,remoteHead:async()=>observed,checkBoundary:async()=>{},save:async()=>{},receipt})).status,'REMOTE_SYNCED_CI_PENDING');
});
await test('failed transport preserves same commit and pending state', async()=> {
    const receipt={commit:'c'.repeat(40),tree:'t',expectedRemote:'b'.repeat(40)};
    const fakeGit=args=>{ if(args[0]==='push')throw new Error('offline'); if(args[0]==='diff')return ''; return args[1]==='HEAD' ? receipt.commit : receipt.tree; };
    assert.equal((await pushCheckpoint({git:fakeGit,remoteHead:async()=>receipt.expectedRemote,checkBoundary:async()=>{},save:async()=>{},receipt})).status,'COMMITTED_PENDING_PUSH');
});
await test('fresh branch/remote drift and post-hook untracked input stop publication', async()=> {
    for(const variant of ['context','untracked']) {
        let head='b'.repeat(40), branch=policy.branch, untracked=false, committed=false, pushed=false;
        const fakeGit=args=> {
            if(args[0]==='diff')return '';
            if(args[0]==='write-tree')return 'candidate-tree';
            if(args[0]==='rev-parse')return args[1]==='HEAD'?head:(args[1]==='HEAD^{tree}'?'base-tree':'candidate-tree');
            if(args[0]==='commit'){head='c'.repeat(40);committed=true;untracked=true;return '';}
            if(args[0]==='push'){pushed=true;return '';}
            return '';
        };
        const checkBoundary=async()=> { assertCheckpointContext({...context,branch},policy); assert.equal(untracked,false,'hook added untracked validation input'); };
        await assert.rejects(()=>publishCheckpoint({git:fakeGit,remoteHead:async()=> 'b'.repeat(40),checkBoundary,save:async()=>{},paths:['input.txt'],message:'negative',expectedRemote:'b'.repeat(40),policySha256:'0'.repeat(64),validate:async()=> {if(variant==='context')branch='main';}}), variant==='context'?/WRONG_BRANCH/:/hook added untracked/);
        assert.equal(pushed,false); assert.equal(committed,variant==='untracked');
    }
});
console.log(`Governance controls passed: ${checks}; scope GOVERNANCE_ONLY, product acceptance UNKNOWN.`);
