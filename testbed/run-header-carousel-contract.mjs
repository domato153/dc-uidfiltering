import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {createTestPage,storageKeys} from './harness/runner-utils.mjs';
import {startServer} from './server/server.mjs';
import {withHeaderCarouselFixture} from './fixtures/header-carousel.mjs';
import {createEvidenceBinding} from '../tools/evidence-binding.mjs';
import {validateCarouselStackBoundary} from './header-carousel-stack-contract.mjs';
const require=createRequire(import.meta.url),{chromium}=require('./harness/playwright-loader.cjs');
const args=process.argv.slice(2);assert.ok(args.includes('--require-runtime-under-test'),'Guard required');
const runtime=path.resolve('testbed/artifacts/runtime-under-test.user.js'),sha=b=>createHash('sha256').update(b).digest('hex').toUpperCase();
const bytes=await readFile(runtime);assert.match(bytes.toString(),/^\/\/\s*@name\s+DC_UserFilter_Mobile\s*$/m);
process.env.DCUF_TESTBED_USERSCRIPT=runtime;process.env.DCUF_TESTBED_TARGET='mobile';
const index=args.indexOf('--output'),output=index<0?'testbed/artifacts/header-carousel-contract.json':args[index+1];
const report={kind:'header-native-carousel-stack-contract',scope:'guarded live-shaped fixture, not actual-extension evidence',runtime,sha256:sha(bytes),
 observerSha256:sha(await readFile('testbed/run-header-carousel-contract.mjs')),fixtureSha256:sha(await readFile('testbed/fixtures/header-carousel.mjs')),evidenceBinding:await createEvidenceBinding(process.cwd()),results:[]};
report.oracleDependencies=Object.fromEntries(await Promise.all(['testbed/header-carousel-stack-contract.mjs','testbed/header-drawer-body-contract.mjs','tools/header-drawer-priority-contract.mjs'].map(async p=>[p,sha(await readFile(p))])));
console.log(`Carousel runtime: ${runtime}; SHA-256 ${report.sha256}`);
report.pureBoundary=await validateCarouselStackBoundary();
const settle=page=>page.waitForFunction(()=>{const m=window.__dcufTestbedMetrics.snapshot();return m.activeTimeouts===0&&m.activeAnimationFrames===0&&m.activeIntervals===0&&document.getAnimations({subtree:true}).every(a=>a.playState!=='running');},null,{timeout:12000});
const server=await startServer(),browser=await chromium.launch({headless:true,ignoreDefaultArgs:['--hide-scrollbars']});
try{for(const [width,height]of [[390,500],[390,900],[750,900],[1280,900]])for(const dark of [false,true]){
 const result={width,height,dark,browser:browser.version()},session=await createTestPage(browser,server.baseUrl,{viewport:{width,height},storage:{[storageKeys.threshold]:0,[storageKeys.ratioEnabled]:false}});
 try{
 await session.page.route('**/board/lists?id=test',async route=>{const response=await route.fetch();await route.fulfill({response,body:withHeaderCarouselFixture(await response.text(),{dark})});});
 await session.goto('/board/lists?id=test');if(await session.page.locator('#dcinside-filter-setting').isVisible())await session.page.locator('#dcinside-filter-close').click();
 await session.page.waitForFunction(()=>window.__dcufHeaderDrawerHostAdapter.snapshotResources().mutationSubscribers===1);
 await session.page.waitForFunction(dark=>document.body.classList.contains('dc-filter-dark-mode')===dark,dark);await settle(session.page);
 const sample=()=>session.page.evaluate(()=>{const button=document.querySelector('#gall_top_recom .btn_bluenext'),source=document.getElementById('gall_top_recom'),ancestor=source.closest('.issue_wrap'),nav=document.querySelector('.gnb_bar nav.gnb');const b=button.getBoundingClientRect(),s=source.getBoundingClientRect(),n=nav.getBoundingClientRect();const hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return{clientWidth:document.documentElement.clientWidth,button:b.toJSON(),source:s.toJSON(),nav:n.toJSON(),ancestorZ:getComputedStyle(ancestor).zIndex,navZ:getComputedStyle(nav).zIndex,reachable:hit===button||button.contains(hit),hit:hit&&hit.className,sourceDisplay:getComputedStyle(source).display};});
 const native=await session.page.evaluateHandle(()=>{const nodes=[document.getElementById('gall_top_recom'),document.querySelector('#gall_top_recom .btn_bluenext')];return nodes.map(node=>({node,parent:node.parentNode,next:node.nextSibling}));});
 result.closed=await sample();assert.equal(result.closed.ancestorZ,'13');assert.equal(result.closed.navZ,'1001');assert.equal(result.closed.sourceDisplay,'none');
 const baseline=await session.page.evaluate(()=>({writes:window.__dcufTestbedGM.snapshot().writes.length,resources:window.__dcufHeaderDrawerHostAdapter.snapshotResources()}));
 const toggle=session.page.locator('.dcuf-header-drawer__toggle');await toggle.click();await settle(session.page);result.open=await sample();
 assert.ok(result.open.button.width>0&&result.open.button.height>0,'Original next button must have area');
 if(height===500)assert.ok(result.open.button.top<result.open.nav.bottom&&result.open.button.bottom>result.open.nav.top,'Short fixture must reproduce the native overlap');
 assert.ok(result.open.reachable,'Original carousel next must be hit-reachable above GNB');
 if(height===500&&!dark){
  await session.page.locator('.issue_wrap').evaluate(node=>node.style.zIndex='13');
  assert.equal((await sample()).reachable,false,'Restored host ancestor layer must reproduce the GNB hit failure');
  await session.page.locator('.issue_wrap').evaluate(node=>node.style.removeProperty('z-index'));await settle(session.page);
  assert.ok((await sample()).reachable);result.rejectedHostStack=true;
 }
 const next=session.page.locator('#gall_top_recom .btn_bluenext');await next.click();await next.focus();await next.press('Enter');await settle(session.page);
 assert.equal(await session.page.locator('#gall_top_recom .page_num').textContent(),'3/3');assert.deepEqual(await session.page.evaluate(()=>window.__fixtureCarousel),{calls:2,trusted:[true,true]});
 assert.ok(await session.page.evaluate(saved=>saved.every(({node,parent,next})=>node.isConnected&&node.parentNode===parent&&node.nextSibling===next),native));
 assert.ok(result.open.source.left>=12&&result.open.source.right<=result.open.clientWidth-12+1&&result.open.source.bottom<=height-12+1,'Original card viewport containment');
 if(height===500&&!dark){
  await session.page.mouse.move(result.open.source.left+50,result.open.source.top+100);await session.page.mouse.wheel(0,120);
  await session.page.waitForFunction(()=>document.getElementById('gall_top_recom').scrollTop>0);
  await session.page.locator('#gall_top_recom').evaluate(node=>node.scrollTop=0);result.nativeScroll=true;
 }
 await toggle.focus();await toggle.press('Enter');await settle(session.page);result.closedAgain=await sample();assert.equal(result.closedAgain.ancestorZ,'13');assert.equal(result.closedAgain.sourceDisplay,'none');
 if(height===500&&!dark){
  await session.page.evaluate(()=>{const clone=document.querySelector('.issue_wrap').cloneNode(true);clone.id='fixture-copied-issue';clone.querySelector('#gall_top_recom').setAttribute('data-dcuf-header-native-recom-open','1');document.body.append(clone);});
  await session.page.waitForFunction(()=>document.querySelector('#fixture-copied-issue #gall_top_recom').getAttribute('data-dcuf-header-native-recom')!=='1');await settle(session.page);
  assert.equal(await session.page.locator('#fixture-copied-issue').evaluate(node=>getComputedStyle(node).zIndex),'13');
  await session.page.locator('#fixture-copied-issue').evaluate(node=>node.remove());await settle(session.page);result.copiedOwnerCleanup=true;
 }
 if(height===500&&!dark){await toggle.click();await settle(session.page);assert.equal((await sample()).ancestorZ,'1002');result.disposeWhileOpen=true;}
 await session.page.evaluate(()=>window.__dcufHeaderDrawerHostAdapter.dispose());await settle(session.page);assert.equal((await sample()).ancestorZ,'13');
 await session.page.evaluate(()=>{window.__dcufHeaderDrawerHostAdapter.connect();window.__dcufHeaderDrawerHostAdapter.connect();});await settle(session.page);
 assert.deepEqual(await session.page.evaluate(()=>({writes:window.__dcufTestbedGM.snapshot().writes.length,resources:window.__dcufHeaderDrawerHostAdapter.snapshotResources()})),baseline);
 if(height===500&&!dark){
  await toggle.click();await settle(session.page);assert.equal((await sample()).ancestorZ,'1002');
  await session.page.evaluate(()=>{const node=document.getElementById('gall_top_recom');window.__fixtureDetachedCarousel={node,parent:node.parentNode,next:node.nextSibling};node.remove();});
  await settle(session.page);
  const sourceLost=await session.page.evaluate(()=>({drawer:window.__dcufHeaderDrawerHostAdapter.snapshotResources().drawerCount,open:document.querySelector('.dcuf-header-drawer')?.getAttribute('data-open'),source:document.getElementById('gall_top_recom')!==null}));
  assert.deepEqual(sourceLost,{drawer:1,open:'1',source:false},'Preserve the independently observed F272 temporary-source-loss state');
  assert.equal(await session.page.locator('.issue_wrap').evaluate(node=>getComputedStyle(node).zIndex),'13');
  await session.page.evaluate(()=>{const saved=window.__fixtureDetachedCarousel;saved.parent.insertBefore(saved.node,saved.next);delete window.__fixtureDetachedCarousel;});
  await session.page.waitForFunction(()=>document.getElementById('gall_top_recom').getAttribute('data-dcuf-header-native-recom')==='1');await settle(session.page);
  assert.equal((await sample()).ancestorZ,'1002');assert.ok((await sample()).reachable);
  await toggle.click();await settle(session.page);assert.equal((await sample()).ancestorZ,'13');assert.equal((await sample()).sourceDisplay,'none');
  assert.ok(await session.page.evaluate(saved=>saved.every(({node,parent,next})=>node.isConnected&&node.parentNode===parent&&node.nextSibling===next),native));
  assert.deepEqual(await session.page.evaluate(()=>({writes:window.__dcufTestbedGM.snapshot().writes.length,resources:window.__dcufHeaderDrawerHostAdapter.snapshotResources()})),baseline);result.sourceLossRestoration=true;
 }
 result.errors=session.consoleErrors.filter(error=>!error.includes('Failed to load resource'));assert.deepEqual(result.errors,[]);
 await native.dispose();result.status='PASS';
 }catch(error){result.status='FAIL';result.failure=error.message;result.failureDetail=error.stack;}finally{await session.close();}
 report.results.push(result);console.log(`${width}x${height}/${dark?'dark':'light'}: ${result.status}${result.failure?' '+result.failure:''}`);
}}finally{await browser.close();await server.close();}
report.status=report.results.every(x=>x.status==='PASS')?'PASS':'FAIL';await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');if(report.status!=='PASS')process.exitCode=1;
