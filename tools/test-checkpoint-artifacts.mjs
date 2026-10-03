import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const temp=mkdtempSync(path.join(os.tmpdir(),'dcuf-checkpoint-build-'));
const checkout=path.join(temp,'checkout');
const run=(command,args,cwd=root)=>{const result=spawnSync(command,args,{cwd,encoding:'utf8',shell:false,maxBuffer:16*1024*1024});assert.equal(result.status,0,result.stderr);return result.stdout;};
const sha=file=>createHash('sha256').update(readFileSync(path.join(checkout,file))).digest('hex');
try {
    // Fresh checkout reproduces hosted LF files without changing the active tree.
    run('git',['clone','--depth','1','--branch','codex/ui-port-boundary',pathToFileURL(root+path.sep).href,checkout]);
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
    assert.equal(run('git',['diff','--name-only','HEAD'],checkout).trim(),'','rehydration must preserve Git-normalized content');
    console.log(`Checkpoint artifact fixture PASS at ${run('git',['rev-parse','HEAD'],checkout).trim()}: fresh LF checkout is not raw build identity; canonical build restores mobile/PC/guard bytes without normalized source changes. This committed-fixture check is not validation of uncommitted runtime changes.`);
} finally {
    assert.ok(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(temp).startsWith('dcuf-checkpoint-build-'));
    rmSync(temp,{recursive:true,force:true});
}
