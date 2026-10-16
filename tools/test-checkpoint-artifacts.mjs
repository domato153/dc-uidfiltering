import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertTrackedContentClean } from './git-tree-state.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const temp=mkdtempSync(path.join(os.tmpdir(),'dcuf-checkpoint-build-'));
const checkout=path.join(temp,'checkout');
const run=(command,args,cwd=root)=>{const result=spawnSync(command,args,{cwd,encoding:'utf8',shell:false,maxBuffer:16*1024*1024});assert.equal(result.status,0,result.stderr);return result.stdout;};
const sha=file=>createHash('sha256').update(readFileSync(path.join(checkout,file))).digest('hex');
try {
    // Fresh checkout reproduces hosted LF files without changing the active tree.
    const sourceSha=run('git',['rev-parse','HEAD']).trim();
    run('git',['clone','--depth','1','--no-checkout',pathToFileURL(root+path.sep).href,checkout]);
    run('git',['checkout','--detach',sourceSha],checkout);
    const targets=JSON.parse(readFileSync(path.join(checkout,'build/targets.json'))).targets;
    const files=Object.fromEntries(['mobile','pc'].map(target=>[target,targets[target].outputPattern.replace('{version}',targets[target].version)]));
    const expected=Object.fromEntries(Object.entries(files).map(([target,file])=>[target,createHash('sha256').update(Buffer.from(readFileSync(path.join(checkout,file),'utf8').replace(/\r?\n/g,'\r\n'))).digest('hex')]));
    assert.equal(readFileSync(path.join(checkout,files.mobile),'utf8').includes('\r\n'),false,'fixture must reproduce LF checkout');
    assert.notEqual(sha(files.mobile),expected.mobile,'negative: checkout alone is not exact build bytes');
    run(process.execPath,['tools/build-userscript.mjs'],checkout);
    run(process.execPath,['tools/build-userscript.mjs','--testbed-output','testbed/artifacts/runtime-under-test.user.js'],checkout);
    run(process.execPath,['tools/build-pc-filter-userscript.mjs'],checkout);
    for(const file of [files.mobile,`dist/${files.mobile}`,'testbed/artifacts/runtime-under-test.user.js'])assert.equal(sha(file),expected.mobile);
    for(const file of [files.pc,`dist/${files.pc}`])assert.equal(sha(file),expected.pc);
    const beforeRefresh=run('git',['status','--porcelain','--untracked-files=no'],checkout).trim();
    assert.equal(assertTrackedContentClean(checkout,sourceSha).workingContent,'HEAD_IDENTICAL');
    assert.throws(()=>assertTrackedContentClean(checkout,'0'.repeat(40)),/Wrong-head receipt/,'even a clean checkout must match the receipt HEAD');
    const sourceFile=path.join(checkout,'src/runtime/bootstrap.js');
    const originalSource=readFileSync(sourceFile,'utf8');
    writeFileSync(sourceFile,originalSource+'\n// tracked negative control\n');
    assert.equal(spawnSync('git',['diff','--quiet','HEAD','--'],{cwd:checkout,encoding:'utf8',shell:false}).status,1,'real source changes must remain dirty');
    assert.throws(()=>assertTrackedContentClean(checkout,sourceSha),/Dirty tracked worktree/);
    run('git',['add','--','src/runtime/bootstrap.js'],checkout);
    writeFileSync(sourceFile,originalSource);
    run('git',['diff','--quiet','HEAD','--'],checkout);
    assert.throws(()=>assertTrackedContentClean(checkout,sourceSha),/Dirty tracked worktree/,'staged drift cannot be cancelled by working HEAD bytes');
    console.log(`Artifact content control: initial stat-only status ${beforeRefresh?'dirty':'clean'}, normalized content clean; real source and cancelled-index mutations rejected.`);
    console.log(`Checkpoint artifact fixture PASS at ${run('git',['rev-parse','HEAD'],checkout).trim()}: fresh LF checkout is not raw build identity; canonical build restores mobile/PC/guard bytes without normalized source changes. This committed-fixture check is not validation of uncommitted runtime changes.`);
} finally {
    assert.ok(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(temp).startsWith('dcuf-checkpoint-build-'));
    rmSync(temp,{recursive:true,force:true});
}
