import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCheckpointPolicy, resolveCheckpointValidation } from './checkpoint-core.mjs';
import { digestEvidenceBytes } from './evidence-binding.mjs';
import { assertTrackedContentClean } from './git-tree-state.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policy = validateCheckpointPolicy(JSON.parse(readFileSync(path.join(root,'verification/checkpoint-policy.json'))));
const git = args => { const result=spawnSync('git',args,{cwd:root,encoding:'utf8',shell:false}); assert.equal(result.status,0,result.stderr); return result.stdout; };
assert.equal(process.env.GITHUB_ACTIONS,'true');
assert.equal(process.env.GITHUB_EVENT_NAME,'push');
assert.equal(process.env.GITHUB_REF_NAME,policy.branch);
const sourceSha=git(['rev-parse','HEAD']).trim();
assert.equal(process.env.CANDIDATE_SHA,sourceSha);
assert.match(sourceSha,/^[a-f0-9]{40}$/);
assert.match(process.env.GITHUB_RUN_ID || '',/^\d+$/);
assert.match(process.env.GITHUB_RUN_ATTEMPT || '',/^\d+$/);
assertTrackedContentClean(root,sourceSha);
const tree=git(['rev-parse','HEAD^{tree}']).trim();
assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--plan'), 'Use no options or --plan');
// Use the whole push range, not HEAD^: one push can contain runtime work followed by docs.
const plan=resolveCheckpointValidation(git,process.env.CHECKPOINT_BASE_SHA);
if (process.argv[2] === '--plan') {
    assert.ok(process.env.GITHUB_OUTPUT, 'GitHub output path required');
    appendFileSync(process.env.GITHUB_OUTPUT, `needs_build=${plan.mode !== 'continuity'}\n`);
    console.log(JSON.stringify(plan,null,2));
} else {
const artifactFixture=plan.mode === 'all' ? spawnSync(process.execPath,['tools/test-checkpoint-artifacts.mjs'],{cwd:root,encoding:'utf8',shell:false,maxBuffer:16*1024*1024}) : null;
if (artifactFixture) {
process.stdout.write(artifactFixture.stdout || ''); process.stderr.write(artifactFixture.stderr || '');
assert.equal(artifactFixture.status,0,'fresh checkout artifact transport controls failed');
}
const validationCommand=[...policy.localValidation,'--base',plan.base || '0'.repeat(40)];
const result=spawnSync(process.execPath,validationCommand.slice(1),{cwd:root,encoding:'utf8',shell:false,maxBuffer:16*1024*1024});
process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || '');
assert.equal(result.status,0,'checkpoint repository validation failed');
assert.equal(git(['rev-parse','HEAD']).trim(),sourceSha);
assert.equal(git(['rev-parse','HEAD^{tree}']).trim(),tree);
assertTrackedContentClean(root,sourceSha);
const targets=JSON.parse(readFileSync(path.join(root,'build/targets.json'))).targets;
const artifacts=[];
for(const target of plan.mode === 'all' ? ['mobile','pc'] : []) {
    const file=targets[target].outputPattern.replace('{version}',targets[target].version);
    for(const relative of [file,`dist/${file}`,...(target==='mobile'?['testbed/artifacts/runtime-under-test.user.js']:[])]) artifacts.push({path:relative,sha256:createHash('sha256').update(readFileSync(path.join(root,relative))).digest('hex')});
}
const inputs=['AGENTS.md','verification/checkpoint-policy.json','verification/continuity-contract.json','docs/work/CURRENT_STATE.md','docs/work/NEXT_TASK.md','.github/workflows/development-ci.yml','tools/checkpoint-core.mjs','tools/verify-repo.mjs','tools/verify-checkpoint-ci.mjs'].map(relative=>({path:relative,sha256:digestEvidenceBytes(relative,readFileSync(path.join(root,relative)))}));
const receipt={schemaVersion:1,status:'PASS',scope:'CHECKPOINT_ONLY',workSuccessCertified:false,sourceSha,tree,workflow:policy.workflowName,job:policy.requiredJob,runId:process.env.GITHUB_RUN_ID,runAttempt:process.env.GITHUB_RUN_ATTEMPT,validation:{command:validationCommand,mode:plan.mode,base:plan.base,changedPaths:plan.changedPaths,exitCode:result.status},artifactTransportControl:artifactFixture ? {command:['node','tools/test-checkpoint-artifacts.mjs'],exitCode:artifactFixture.status,fixtureHead:sourceSha} : null,artifactVerification:artifactFixture ? 'CANONICAL_BUILD' : 'NOT_RUN_CONTINUITY_ONLY',inputs,artifacts,productAcceptance:'UNKNOWN',liveSiteExecuted:false};
mkdirSync(path.join(root,'artifacts'),{recursive:true});
writeFileSync(path.join(root,'artifacts/checkpoint-ci.json'),`${JSON.stringify(receipt,null,2)}\n`);
console.log('Exact-source checkpoint PASS; not product/live/release acceptance.');
}
