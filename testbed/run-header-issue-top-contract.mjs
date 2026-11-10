import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {startServer} from './server/server.mjs';
import {createTestPage,launchBrowser,storageKeys,assertNoRuntimeErrors,getMetrics} from './harness/runner-utils.mjs';
const dir='artifacts/header-finish-2026-10-13';await mkdir(dir,{recursive:true});
assert.ok(process.argv.includes('--require-runtime-under-test'));
const runtime=path.resolve('testbed/artifacts/runtime-under-test.user.js');
const bytes=await readFile(runtime),sha=b=>createHash('sha256').update(b).digest('hex').toUpperCase();
assert.match(bytes.toString(),/@name\s+DC_UserFilter_Mobile\r?\n/);
console.log(`Issue top contract: ${runtime}; SHA-256 ${sha(bytes)}`);
const cases=[{width:390,height:480,dark:false},{width:390,height:480,dark:true},{width:1280,height:480,dark:false},{width:1280,height:900,dark:true}];
const report={kind:'header-issue-final-top-contract',runtimeSha256:sha(bytes),observerSha256:sha(await readFile('testbed/run-header-issue-top-contract.mjs')),scope:'FIXTURE_HOST_HEIGHT_NOT_LIVE',observations:[]};
report.dependencies={};
for(const file of ['src/targets/mobile/header-drawer-host-adapter.js','src/targets/mobile/header-drawer-presenter.js','src/targets/mobile/runtime-coordinator.js','testbed/harness/runner-utils.mjs','testbed/harness/userscript-loader.mjs','testbed/harness/gm-shim.js','testbed/harness/boot-probe.js','testbed/harness/runtime-instrumentation.js','testbed/harness/playwright-loader.cjs','testbed/server/server.mjs','testbed/fixtures/builders.mjs','testbed/fixtures/pages.mjs','testbed/public/fixture.css','testbed/public/fixture-client.js'])report.dependencies[file]=sha(await readFile(file));
const controlArg=process.argv.indexOf('--control'),sides=[{id:'candidate',runtime}];
if(controlArg>=0){
 const control=path.resolve(process.argv[controlArg+1]);assert.equal(sha(await readFile(control)),'602810EB816C7FBED63386E0713E3CE8C07772DC90E3BB5F0893B40061FE3017');
 report.controlSha256='602810EB816C7FBED63386E0713E3CE8C07772DC90E3BB5F0893B40061FE3017';sides.unshift({id:'control',runtime:control});
}
const server=await startServer();let browser;
try{
 browser=await launchBrowser();report.browser=browser.version();
 for(const side of sides)for(const testCase of cases){
  process.env.DCUF_TESTBED_USERSCRIPT=side.runtime;process.env.DCUF_TESTBED_TARGET='mobile';
  const session=await createTestPage(browser,server.baseUrl,{viewport:{width:testCase.width,height:testCase.height},storage:{[storageKeys.threshold]:0,[storageKeys.ratioEnabled]:false}});
  try{
   const page=session.page;await session.goto('/mgallery/board/lists?id=test');
   if(testCase.dark)await page.evaluate(()=>window.__dcufFixture.toggleDark(true));
   await page.waitForFunction(()=>window.__dcufHeaderDrawerHostAdapter?.snapshotResources().mutationSubscribers===1&&document.querySelector('.dcuf-header-drawer__toggle'));
   await page.locator('#dcuf-testbed-controls').evaluate(el=>el.style.display='none');
   await page.evaluate(()=>{const source=document.querySelector('.issue_contentbox');window.__issueTopNative=source;source.style.minHeight='420px';});
   await page.locator('.dcuf-header-drawer__toggle').click();
   const value=await page.evaluate(()=>{
    const source=document.querySelector('.issue_contentbox'),drawer=document.querySelector('.dcuf-header-drawer'),body=drawer.querySelector('.dcuf-header-drawer__body');
    const original=CSSStyleDeclaration.prototype.setProperty,writes=[];
    CSSStyleDeclaration.prototype.setProperty=function(name,value,priority){if(this===document.body.style&&name==='--dcuf-header-native-door-top')writes.push(value);return original.call(this,name,value,priority);};
    const before={native:source===window.__issueTopNative,sourceRect:Array.from([source.getBoundingClientRect().x,source.getBoundingClientRect().y,source.getBoundingClientRect().width,source.getBoundingClientRect().height]),body:body.style.cssText};
    try{window.__dcufHeaderDrawerHostAdapter.refresh();window.__dcufHeaderDrawerHostAdapter.refresh();}finally{CSSStyleDeclaration.prototype.setProperty=original;}
    const bodyRect=body.getBoundingClientRect(),sourceRect=source.getBoundingClientRect(),preferred=Math.max(12,Math.round(bodyRect.top)),expected=Math.max(12,Math.min(preferred,innerHeight-Math.ceil(sourceRect.height)-12));
    return {before,writes,preferred,expected,top:document.body.style.getPropertyValue('--dcuf-header-native-door-top'),native:source===window.__issueTopNative,sourceRect:[sourceRect.x,sourceRect.y,sourceRect.width,sourceRect.height],body:body.style.cssText,open:drawer.getAttribute('data-open')};
   });
   report.observations.push({side:side.id,testCase,...value});await writeFile(`${dir}/issue-top-partial.json`,JSON.stringify(report,null,2)+'\n');
   assert.equal(value.open,'1');assert.ok(value.native&&value.before.native&&value.sourceRect[2]>0&&value.sourceRect[3]>=420);
   assert.equal(value.top,`${value.expected}px`,'Final independently derived viewport clamp');
   assert.deepEqual(value.sourceRect,value.before.sourceRect,'Repeated refresh preserves final native geometry');assert.equal(value.body,value.before.body,'Both body measure/apply phases preserve final declarations');
   if(side.id==='candidate')assert.equal(value.writes.length,0,'Idempotent refresh must not write transient preferred issue top and feed body mutations');
   assertNoRuntimeErrors(await getMetrics(page),session.consoleErrors);
  }finally{await session.close();}
 }
 if(sides.length===2){
  let detected=0;
  for(let i=0;i<cases.length;i++){
   const old=report.observations[i],value=report.observations[i+cases.length];
   assert.deepEqual(value.sourceRect,old.sourceRect,'Exact frozen control final native geometry');assert.equal(value.body,old.body,'Exact frozen control body declarations');assert.equal(value.top,old.top,'Exact frozen control final top');
   if(old.writes.length>0)detected++;
  }
  assert.ok(detected>0,'Frozen faulty control must expose transient writes');report.controlFaultContexts=detected;
 }
 report.node=process.version;report.status='PASS';await writeFile(`${dir}/issue-top.json`,JSON.stringify(report,null,2)+'\n');console.log(`Issue final top PASS: four route/theme/viewport contexts; exact final geometry and zero transient refresh writes; ${report.controlFaultContexts??0} frozen-control faults.`);
}finally{await browser?.close();await server.close();}
