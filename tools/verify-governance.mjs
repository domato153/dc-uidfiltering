import assert from 'node:assert/strict';
import { readFileSync, existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { currentSection, parseCurrentArtifacts, parseNextAction, reconcileNextAction, selectContinuityProfile } from './continuity-state.mjs';
import { validateCheckpointPolicy } from './checkpoint-core.mjs';

const root = realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
assert.equal(realpathSync(process.cwd()), root, 'WRONG_ROOT: use the actual development repository');
const gitRoot = spawnSync('git',['rev-parse','--show-toplevel'],{cwd:root,encoding:'utf8',shell:false});
assert.equal(gitRoot.status,0); assert.equal(realpathSync(gitRoot.stdout.trim()),root);
const agents = readFileSync(path.join(root,'AGENTS.md'),'utf8');
assert.ok(agents.includes('single basic policy') && agents.includes('Standing instruction:') && agents.includes('tools/checkpoint.mjs'));
assert.ok(agents.length <= 9000, 'basic policy grew beyond the compact contract');
assert.ok(!agents.includes('workflow is discontinued') && !agents.includes('uncommitted by default'), 'retired policy leaked into current authority');
// Only a known historical parent checkout is checked, never unrelated/global policy.
const locatorParent = path.resolve(root,'../../..');
if (existsSync(path.join(locatorParent,'DEV_WORKSPACE.md'))) {
    assert.ok(!existsSync(path.join(locatorParent,'AGENTS.md')) && !existsSync(path.join(locatorParent,'AGENTS.override.md')), 'two executable basic policies');
}
const current=readFileSync(path.join(root,'docs/work/CURRENT_STATE.md'),'utf8');
assert.ok(current.length <= 12000,'current projection must stay compact'); currentSection(current);
parseCurrentArtifacts(current);
const next=readFileSync(path.join(root,'docs/work/NEXT_TASK.md'),'utf8');
assert.ok(next.length <= 9000, 'next action must contain direct dependencies; retrieve historical evidence by link');
const reconciliation=reconcileNextAction(parseNextAction(next),root);
const policy=validateCheckpointPolicy(JSON.parse(readFileSync(path.join(root,'verification/checkpoint-policy.json'))));
assert.ok(agents.includes(`origin/${policy.branch}`),'checkpoint target detached from basic policy');
assert.ok(!/local-only\/no-commit\/no-push boundary|No commit, push, hosted dispatch/.test(next),'obsolete next-task publication boundary');
const signals=process.argv.includes('--closure') ? ['explicit-closure'] : [];
console.log(JSON.stringify({status:'VALID',profile:selectContinuityProfile(signals),scope:'GOVERNANCE_ONLY',workSuccessCertified:false,reconciliation},null,2));
