import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {createTestPage,storageKeys} from './harness/runner-utils.mjs';
import {startServer} from './server/server.mjs';
import {withHeaderDarkToggleFixture} from './fixtures/header-dark-toggle.mjs';
import {createEvidenceBinding} from '../tools/evidence-binding.mjs';
const require=createRequire(import.meta.url),{chromium}=require('./harness/playwright-loader.cjs');
const args=process.argv.slice(2);assert.ok(args.includes('--require-runtime-under-test'),'Guard required');
const runtime=path.resolve('testbed/artifacts/runtime-under-test.user.js'),sha=b=>createHash('sha256').update(b).digest('hex').toUpperCase();
const bytes=await readFile(runtime);assert.match(bytes.toString(),/^\/\/\s*@name\s+DC_UserFilter_Mobile\s*$/m);
process.env.DCUF_TESTBED_USERSCRIPT=runtime;process.env.DCUF_TESTBED_TARGET='mobile';
const index=args.indexOf('--output'),output=index<0?'testbed/artifacts/header-dark-toggle-contract.json':args[index+1];
const report={kind:'header-native-dark-toggle-contract',scope:'guarded live-shaped fixture, not actual-extension evidence',runtime,sha256:sha(bytes),evidenceBinding:await createEvidenceBinding(process.cwd()),results:[]};
report.dependencies=Object.fromEntries(await Promise.all(['testbed/run-header-dark-toggle-contract.mjs','testbed/fixtures/header-dark-toggle.mjs','testbed/harness/runner-utils.mjs','testbed/harness/playwright-loader.cjs'].map(async p=>[p,sha(await readFile(p))])));
console.log(`Dark-toggle runtime: ${runtime}; SHA-256 ${report.sha256}`);
const settle=page=>page.waitForFunction(()=>{const m=window.__dcufTestbedMetrics.snapshot();return m.activeTimeouts===0&&m.activeAnimationFrames===0&&m.activeIntervals===0&&document.getAnimations({subtree:true}).every(a=>a.playState!=='running');},null,{timeout:12000});
const server=await startServer(),browser=await chromium.launch({headless:true,ignoreDefaultArgs:['--hide-scrollbars']});
try{for(const [width,height]of [[390,500],[390,900],[750,900],[1280,900]])for(const kind of ['major','minor']){
 const result={width,height,kind,browser:browser.version()},route=kind==='minor'?'/mgallery/board/lists?id=test':'/board/lists?id=test';
 const session=await createTestPage(browser,server.baseUrl,{viewport:{width,height},storage:{[storageKeys.threshold]:0,[storageKeys.ratioEnabled]:false}});
 try{
 await session.page.route(`**${route}`,async route=>{const response=await route.fetch();await route.fulfill({response,body:withHeaderDarkToggleFixture(await response.text())});});
 await session.goto(route);if(await session.page.locator('#dcinside-filter-setting').isVisible())await session.page.locator('#dcinside-filter-close').click();
 await session.page.waitForFunction(()=>window.__dcufHeaderShellHostAdapter.snapshotResources().mutationSubscribers===1);await settle(session.page);
 const sample=()=>session.page.evaluate(()=>{const nodes=['a.darkonoff','#preSWord','#searchSubmit','.btn_top_loginout'].map(selector=>{const node=document.querySelector(selector),b=node.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return{selector,box:b.toJSON(),hit:hit?.tagName+'#'+hit?.id+'.'+hit?.className,reachable:hit===node||node.contains(hit)};});return{clientWidth:document.documentElement.clientWidth,nodes,linksDisplay:getComputedStyle(document.querySelector('.area_links')).display,searchZ:getComputedStyle(document.querySelector('.top_search')).zIndex};});
 const original=await session.page.evaluateHandle(()=>['a.darkonoff','#preSWord','#searchSubmit','#searchform'].map(s=>{const n=document.querySelector(s);return{node:n,parent:n.parentNode,next:n.nextSibling,attributes:Array.from(n.attributes).filter(a=>!a.name.startsWith('data-dcuf')).map(a=>[a.name,a.value]),handler:n.onclick||n.onsubmit||n.onfocus};}));
 const baseline=await session.page.evaluate(()=>({storage:window.__dcufTestbedGM.snapshot(),resources:window.__dcufHeaderShellHostAdapter.snapshotResources()}));
 result.light=await sample();const dark=result.light.nodes[0];assert.ok(dark.box.width>0&&dark.box.height>0);assert.ok(dark.box.left>=0&&dark.box.right<=result.light.clientWidth);assert.ok(dark.reachable,'Original dark toggle must be hit-reachable above native search');
 assert.ok(result.light.nodes.every(n=>n.box.width>0&&n.box.height>0&&n.reachable),'Search and native login must also remain reachable');
 const toggle=session.page.locator('a.darkonoff');await toggle.click();await session.page.waitForFunction(()=>document.body.classList.contains('dc-filter-dark-mode'));await settle(session.page);result.dark=await sample();assert.ok(result.dark.nodes.every(n=>n.box.width>0&&n.box.height>0&&n.reachable),'Native dark state keeps original theme/search/login input reachable');
 await toggle.focus();await toggle.press('Enter');await session.page.waitForFunction(()=>!document.body.classList.contains('dc-filter-dark-mode'));await settle(session.page);
 const search=session.page.locator('#preSWord');await search.click();await search.fill('native query');await search.press('Enter');await session.page.locator('#searchSubmit').click();await settle(session.page);
 assert.deepEqual(await session.page.evaluate(()=>({...window.__fixtureNativeHeader,focusCalls:undefined})),{darkCalls:2,searchCalls:2,focusCalls:undefined,trusted:[true,true,true,true]});
 assert.equal(await search.inputValue(),'native query');assert.ok(await session.page.evaluate(()=>window.__fixtureNativeHeader.focusCalls>0));
 assert.ok(await session.page.evaluate(saved=>saved.every(({node,parent,next,attributes,handler})=>node.isConnected&&node.parentNode===parent&&node.nextSibling===next&&JSON.stringify(Array.from(node.attributes).filter(a=>!a.name.startsWith('data-dcuf')).map(a=>[a.name,a.value]))===JSON.stringify(attributes)&&(node.onclick||node.onsubmit||node.onfocus)===handler),original),'Native nodes/form attributes/handlers remain exact');
 if(width===390){
  // Restore just the old declaration at the final owner, not a low-specificity
  // competing override. This independently reintroduces the native hit failure.
  const style=session.page.locator('#dcuf-header-shell-style'),css=await style.textContent();
  await style.evaluate(n=>{const r=Array.from(n.sheet.cssRules).find(r=>r.selectorText==='[data-dcuf-header-shell-role="head"] [data-dcuf-header-shell-role="links"]');r.style.setProperty('display','block','important');});
  assert.equal((await sample()).nodes[0].reachable,false,'Original float layout must reproduce the search hit failure');
  await style.evaluate((n,css)=>n.textContent=css,css);await settle(session.page);assert.ok((await sample()).nodes[0].reachable);result.rejectedOldLayout=true;
 }
 await session.page.evaluate(()=>window.__dcufHeaderShellHostAdapter.dispose());await settle(session.page);assert.equal(await session.page.locator('.area_links').getAttribute('data-dcuf-header-shell-role'),null);
 await session.page.evaluate(()=>{window.__dcufHeaderShellHostAdapter.connect(document,{runtimeCoordinator:window.__dcufRuntimeCoordinator});window.__dcufHeaderShellHostAdapter.connect(document,{runtimeCoordinator:window.__dcufRuntimeCoordinator});});await settle(session.page);assert.ok((await sample()).nodes[0].reachable);
 assert.deepEqual(await session.page.evaluate(()=>({storage:window.__dcufTestbedGM.snapshot(),resources:window.__dcufHeaderShellHostAdapter.snapshotResources()})),baseline);
 result.errors=session.consoleErrors.filter(error=>!error.includes('Failed to load resource'));assert.deepEqual(result.errors,[]);await original.dispose();result.status='PASS';
 }catch(error){result.status='FAIL';result.failure=error.message;result.failureDetail=error.stack;}finally{await session.close();}
 report.results.push(result);console.log(`${kind}/${width}x${height}: ${result.status}${result.failure?' '+result.failure:''}`);
}}finally{await browser.close();await server.close();}
report.status=report.results.every(x=>x.status==='PASS')?'PASS':'FAIL';await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');if(report.status!=='PASS')process.exitCode=1;
