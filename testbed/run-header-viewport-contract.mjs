import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createTestPage,storageKeys} from './harness/runner-utils.mjs';
import {startServer} from './server/server.mjs';
import {withHeaderViewportFixture} from './fixtures/header-viewport.mjs';
import {createEvidenceBinding} from '../tools/evidence-binding.mjs';
const require=createRequire(import.meta.url),{chromium}=require('./harness/playwright-loader.cjs');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),args=process.argv.slice(2);
assert.ok(args.includes('--require-runtime-under-test'),'Guard required');
const runtime='testbed/artifacts/runtime-under-test.user.js',bytes=await readFile(runtime);
const sha=b=>createHash('sha256').update(b).digest('hex').toUpperCase();
assert.match(bytes.toString(),/^\/\/\s*@name\s+DC_UserFilter_Mobile\s*$/m);
process.env.DCUF_TESTBED_USERSCRIPT=path.resolve(runtime);process.env.DCUF_TESTBED_TARGET='mobile';
const at=args.indexOf('--output'),output=at<0?'testbed/artifacts/header-viewport-contract.json':args[at+1];
const report={kind:'header-client-viewport-contract',scope:'guarded fixture; classic scrollbar geometry; not actual-extension live evidence',
 runtime:path.resolve(runtime),sha256:sha(bytes),observerSha256:sha(await readFile(fileURLToPath(import.meta.url))),
 fixtureSha256:sha(await readFile('testbed/fixtures/header-viewport.mjs')),evidenceBinding:await createEvidenceBinding(root),results:[]};
console.log(`Viewport runtime: ${report.runtime}; SHA-256 ${report.sha256}`);
const settle=page=>page.waitForFunction(()=>{const m=window.__dcufTestbedMetrics.snapshot();return m.activeTimeouts===0&&m.activeAnimationFrames===0&&m.activeIntervals===0
 && document.getAnimations({subtree:true}).every(a=>a.playState!=='running');},null,{timeout:12000});
const server=await startServer();
try{
 for(const classic of [false,true]){
  const browser=await chromium.launch({headless:true,args:['--disable-background-timer-throttling'],...(classic?{ignoreDefaultArgs:['--hide-scrollbars']}:{} )});
  try{
   for(const [width,height]of(classic?[[390,900],[390,500],[1280,900]]:[[390,500]]))for(const dark of [false,true]){
    const result={classic,width,height,dark,browser:browser.version()};
    const session=await createTestPage(browser,server.baseUrl,{viewport:{width,height},storage:{[storageKeys.threshold]:0,[storageKeys.ratioEnabled]:false}});
    try{
     await session.page.route('**/mgallery/board/lists?id=test',async route=>{const response=await route.fetch();await route.fulfill({response,body:withHeaderViewportFixture(await response.text(),{dark})});});
     await session.goto('/mgallery/board/lists?id=test');
     if(await session.page.locator('#dcinside-filter-setting').isVisible()){await session.page.locator('#dcinside-filter-close').click();}
     await session.page.waitForFunction(()=>window.__dcufHeaderDrawerHostAdapter.snapshotResources().mutationSubscribers===1);
     await session.page.waitForFunction(dark=>document.body.classList.contains('dc-filter-dark-mode')===dark,dark);
     await settle(session.page);
     const native=await session.page.evaluateHandle(()=>{const nodes=[document.querySelector('.issue_contentbox'),document.querySelector('#hot_tip_pop'),document.querySelector('.btn_tipclose')];
      return nodes.map(node=>({node,parent:node.parentNode,next:node.nextSibling,handler:node.onclick}));});
     const baseline=await session.page.evaluate(()=>({writes:window.__dcufTestbedGM.snapshot().writes.length,resources:window.__dcufHeaderDrawerHostAdapter.snapshotResources()}));
     const toggle=session.page.locator('.dcuf-header-drawer__toggle');await toggle.click();
     await session.page.locator('.btn_mgall_dcp').click();await settle(session.page);
     const sample=()=>session.page.evaluate(()=>{const source=document.querySelector('.issue_contentbox'),body=document.querySelector('.dcuf-header-drawer__body'),close=document.querySelector('.btn_tipclose');
      const rect=close.getBoundingClientRect(),points=[.25,.5,.75].map(f=>({x:rect.left+rect.width*f,y:rect.top+rect.height/2}));
      return {innerWidth,clientWidth:document.documentElement.clientWidth,source:JSON.parse(JSON.stringify(source.getBoundingClientRect())),
       body:JSON.parse(JSON.stringify(body.getBoundingClientRect())),close:JSON.parse(JSON.stringify(rect)),hits:points.map(p=>document.elementFromPoint(p.x,p.y)===close),
       viewportVar:document.body.style.getPropertyValue('--dcuf-header-drawer-viewport-width')};});
     result.open=await sample();
     assert.equal(result.open.innerWidth,width);if(classic)assert.ok(result.open.clientWidth<width,'Classic scrollbar must be rendered');else assert.equal(result.open.clientWidth,width);
     assert.ok(result.open.hits.every(Boolean),'Original tip close must be hit-reachable inside the client viewport');
     const expected=Math.min(640,result.open.clientWidth-24);
     assert.ok(Math.abs(result.open.source.width-expected)<1&&Math.abs(result.open.body.width-expected)<1,'Owned/native widths use client viewport');
     assert.ok(result.open.source.right<=result.open.clientWidth-12+1&&result.open.body.right<=result.open.clientWidth-12+1,'Right gutter inside usable viewport');
     if(classic&&!dark&&width===390&&height===900){
      await session.page.locator('#hot_tip_pop .inner').evaluate(node=>node.style.minWidth='365px');
      assert.ok((await sample()).hits.some(hit=>!hit),'Host minimum-width negative must lose a close hit');
      await session.page.locator('#hot_tip_pop .inner').evaluate(node=>node.style.removeProperty('min-width'));
      assert.ok((await sample()).hits.every(Boolean));result.rejectedHostMinimum=true;
      // The host explicitly owns root overflow; lock both scroll containers.
      await session.page.evaluate(()=>{document.documentElement.style.setProperty('overflow','hidden','important');document.body.style.setProperty('overflow','hidden','important');});
      await session.page.waitForFunction(()=>document.body.style.getPropertyValue('--dcuf-header-drawer-viewport-width')===`${document.documentElement.clientWidth}px`);
      await settle(session.page);result.locked=await sample();
      assert.equal(result.locked.clientWidth,width);assert.ok(result.locked.hits.every(Boolean));
      await session.page.evaluate(()=>{document.documentElement.style.removeProperty('overflow');document.body.style.removeProperty('overflow');});
      await session.page.waitForFunction(()=>document.body.style.getPropertyValue('--dcuf-header-drawer-viewport-width')===`${document.documentElement.clientWidth}px`);
      await settle(session.page);result.unlocked=await sample();
      assert.equal(result.unlocked.clientWidth,result.open.clientWidth);assert.ok(result.unlocked.hits.every(Boolean));
      // An outer-width CSS input must lose the reserved usable right gutter.
      await session.page.evaluate(()=>document.body.style.setProperty('--dcuf-header-drawer-viewport-width',`${innerWidth}px`));
      const wrong=await sample();assert.ok(wrong.source.right>wrong.clientWidth-12+1,'Outer-width negative must lose client containment');
      await session.page.evaluate(()=>window.__dcufHeaderDrawerHostAdapter.refresh());await settle(session.page);
      await session.page.setViewportSize({width:750,height});
      await session.page.waitForFunction(()=>document.body.style.getPropertyValue('--dcuf-header-drawer-viewport-width')===`${document.documentElement.clientWidth}px`);
      await settle(session.page);result.resized=await sample();
      assert.equal(result.resized.innerWidth,750);assert.equal(result.resized.source.width,640);assert.ok(result.resized.hits.every(Boolean));
      await session.page.setViewportSize({width,height});
      await session.page.waitForFunction(()=>document.body.style.getPropertyValue('--dcuf-header-drawer-viewport-width')===`${document.documentElement.clientWidth}px`);
      await settle(session.page);assert.ok((await sample()).hits.every(Boolean));
      result.rejectedOuterWidth=true;
     }
     if(classic&&width===1280){
      const drawer=session.page.locator('.dcuf-header-drawer');
      await drawer.evaluate(node=>{const width=node.getBoundingClientRect().width;node.style.position='fixed';node.style.left=`${document.documentElement.clientWidth-width-24}px`;node.style.top='120px';});
      await session.page.evaluate(()=>window.__dcufHeaderDrawerHostAdapter.refresh());await settle(session.page);result.rightAligned=await sample();
      const alignedTrigger=await drawer.boundingBox();
      assert.ok(alignedTrigger&&alignedTrigger.x+alignedTrigger.width<=result.rightAligned.clientWidth-12,'Non-overflow control stays inside the usable edge');
      assert.ok(Math.abs(result.rightAligned.body.right-(alignedTrigger.x+alignedTrigger.width))<1,'Inside-viewport mount aligns the owned body to the original toggle');
      assert.ok(Math.abs(result.rightAligned.source.right-result.rightAligned.body.right)<1,'Native and owned non-overflow alignment agree');
      assert.ok(result.rightAligned.hits.every(Boolean));
      await drawer.evaluate(node=>node.style.left=`${document.documentElement.clientWidth-1}px`);
      const overflowingTrigger=await drawer.boundingBox();
      assert.ok(overflowingTrigger&&overflowingTrigger.x+overflowingTrigger.width>result.rightAligned.clientWidth-12,'Clamp control actually extends past the usable edge');
      await session.page.evaluate(()=>window.__dcufHeaderDrawerHostAdapter.refresh());await settle(session.page);result.rightMount=await sample();
      assert.equal(result.rightMount.body.right,result.rightMount.clientWidth-12,'Right mount clamps to usable viewport');
      assert.equal(result.rightMount.source.right,result.rightMount.clientWidth-12,'Native and owned right clamps agree');
      assert.ok(result.rightMount.hits.every(Boolean));
      await session.page.locator('.dcuf-header-drawer').evaluate(node=>node.removeAttribute('style'));
      await session.page.evaluate(()=>window.__dcufHeaderDrawerHostAdapter.refresh());await settle(session.page);
     }
     await toggle.focus();await toggle.press('Enter');await settle(session.page);result.popupOnly=await sample();
     assert.ok(result.popupOnly.hits.every(Boolean));await session.page.locator('.btn_tipclose').click();await settle(session.page);
     assert.equal(await session.page.evaluate(()=>window.__fixtureTipToggles),2);
     assert.equal(await session.page.locator('#hot_tip_pop').evaluate(node=>getComputedStyle(node).display),'none');
     const preserved=await session.page.evaluate(saved=>saved.every(({node,parent,next,handler})=>node.isConnected&&node.parentNode===parent&&node.nextSibling===next&&node.onclick===handler),native);assert.ok(preserved);
     await session.page.evaluate(()=>window.__dcufHeaderDrawerHostAdapter.dispose());await settle(session.page);
     const restored=await session.page.evaluate(()=>({value:document.body.style.getPropertyValue('--dcuf-header-drawer-viewport-width'),priority:document.body.style.getPropertyPriority('--dcuf-header-drawer-viewport-width'),resources:window.__dcufHeaderDrawerHostAdapter.snapshotResources()}));
     assert.equal(restored.value,'23px');assert.equal(restored.priority,'important');assert.equal(restored.resources.drawerCount,0);assert.equal(restored.resources.mutationSubscribers,0);
     await session.page.evaluate(()=>{window.__dcufHeaderDrawerHostAdapter.connect();window.__dcufHeaderDrawerHostAdapter.connect();});await settle(session.page);
     const final=await session.page.evaluate(()=>({writes:window.__dcufTestbedGM.snapshot().writes.length,resources:window.__dcufHeaderDrawerHostAdapter.snapshotResources()}));
     assert.deepEqual(final,baseline);await native.dispose();result.status='PASS';
    }catch(error){result.status='FAIL';result.failure=String(error.message);}
    finally{await session.close();}
    report.results.push(result);console.log(`${classic?'classic':'overlay'}/${width}x${height}/${dark?'dark':'light'}: ${result.status}${result.failure?' '+result.failure:''}`);
   }
  }finally{await browser.close();}
 }
}finally{await server.close();}
report.status=report.results.every(r=>r.status==='PASS')?'PASS':'FAIL';await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
if(report.status!=='PASS')process.exitCode=1;
