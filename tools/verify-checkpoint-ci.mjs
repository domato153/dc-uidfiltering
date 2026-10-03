import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCheckpointPolicy } from './checkpoint-core.mjs';
import { digestEvidenceBytes } from './evidence-binding.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policy = validateCheckpointPolicy(JSON.parse(readFileSync(path.join(root,'verification/checkpoint-policy.json'))));
const git = args => { const result=spawnSync('git',args,{cwd:root,encoding:'utf8',shell:false}); assert.equal(result.status,0,result.stderr); return result.stdout.trim(); };
assert.equal(process.env.GITHUB_ACTIONS,'true');
assert.equal(process.env.GITHUB_EVENT_NAME,'push');
assert.equal(process.env.GITHUB_REF_NAME,policy.branch);
const sourceSha=git(['rev-parse','HEAD']);
assert.equal(process.env.CANDIDATE_SHA,sourceSha);
assert.match(sourceSha,/^[a-f0-9]{40}$/);
assert.match(process.env.GITHUB_RUN_ID || '',/^\d+$/);
assert.match(process.env.GITHUB_RUN_ATTEMPT || '',/^\d+$/);
assert.equal(git(['diff','--name-only','HEAD']),'','build changed tracked files');
const tree=git(['rev-parse','HEAD^{tree}']);
const result=spawnSync(process.execPath,policy.localValidation.slice(1),{cwd:root,encoding:'utf8',shell:false,maxBuffer:16*1024*1024});
process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || '');
assert.equal(result.status,0,'checkpoint repository validation failed');
assert.equal(git(['rev-parse','HEAD']),sourceSha);
assert.equal(git(['rev-parse','HEAD^{tree}']),tree);
assert.equal(git(['diff','--name-only','HEAD']),'','validation changed tracked files');
const targets=JSON.parse(readFileSync(path.join(root,'build/targets.json'))).targets;
const artifacts=[];
for(const target of ['mobile','pc']) {
    const file=targets[target].outputPattern.replace('{version}',targets[target].version);
    for(const relative of [file,`dist/${file}`,...(target==='mobile'?['testbed/artifacts/runtime-under-test.user.js']:[])]) artifacts.push({path:relative,sha256:createHash('sha256').update(readFileSync(path.join(root,relative))).digest('hex')});
}
const inputs=['AGENTS.md','verification/checkpoint-policy.json','verification/continuity-contract.json','docs/work/CURRENT_STATE.md','docs/work/NEXT_TASK.md','.github/workflows/development-ci.yml'].map(relative=>({path:relative,sha256:digestEvidenceBytes(relative,readFileSync(path.join(root,relative)))}));
const receipt={schemaVersion:1,status:'PASS',scope:'CHECKPOINT_ONLY',workSuccessCertified:false,sourceSha,tree,workflow:policy.workflowName,job:policy.requiredJob,runId:process.env.GITHUB_RUN_ID,runAttempt:process.env.GITHUB_RUN_ATTEMPT,validation:{command:policy.localValidation,exitCode:result.status},inputs,artifacts,productAcceptance:'UNKNOWN',liveSiteExecuted:false};
mkdirSync(path.join(root,'artifacts'),{recursive:true});
writeFileSync(path.join(root,'artifacts/checkpoint-ci.json'),`${JSON.stringify(receipt,null,2)}\n`);
console.log('Exact-source checkpoint PASS; not product/live/release acceptance.');
