import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {startServer} from './server/server.mjs';
import {loadHarnessSource} from './harness/userscript-loader.mjs';
import {storageKeys} from './harness/runner-utils.mjs';
import {withHeaderDarkToggleFixture} from './fixtures/header-dark-toggle.mjs';
import {restoreHeaderCompositionSource} from '../tools/header-composition-contract.mjs';

const args=process.argv.slice(2),root=process.cwd();
assert.ok(args.includes('--require-runtime-under-test'),'Source guard required');
const value=flag=>{const i=args.indexOf(flag);assert.ok(i>=0&&args[i+1],flag);return path.resolve(args[i+1]);};
const candidate=path.resolve('testbed/artifacts/runtime-under-test.user.js'),control=value('--control'),output=value('--output');
assert.ok(output.startsWith(path.resolve('testbed/artifacts')+path.sep));await fs.mkdir(path.dirname(output),{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex').toUpperCase(),bytes=await fs.readFile(candidate),controlSha='3BC9829BA3E1CF7EA111518B001BA3A5D7AE336CF3CA84831FB10E5DB748F4FA';
assert.equal(sha(await fs.readFile(control)),controlSha);assert.equal(sha(restoreHeaderCompositionSource(bytes.toString())),controlSha);
console.log(`Header exit input runtime: ${candidate}; SHA-256 ${sha(bytes)}`);
const report={scope:'HEADER_980_NATIVE_INPUTS_ONLY',status:'RUNNING',sourceHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),control:{sha256:controlSha},candidate:{path:candidate,sha256:sha(bytes)},inputs:{},cases:[]};
for(const f of ['testbed/run-header-exit-inputs.mjs','testbed/fixtures/header-dark-toggle.mjs','testbed/fixtures/pages.mjs','testbed/harness/userscript-loader.mjs','tools/header-composition-contract.mjs'])report.inputs[f]=sha(await fs.readFile(f));
const {chromium}=createRequire(import.meta.url)('./harness/playwright-loader.cjs');
const browser=await chromium.launch({headless:true,args:['--disable-background-timer-throttling','--blink-settings=primaryPointerType=2,availablePointerTypes=2,primaryHoverType=2,availableHoverTypes=2,maxTouchPoints=5,forceTouchEventFeatureDetectionForInspector=true']}),server=await startServer();report.browser=browser.version();
try{
 for(const route of ['/board/lists?id=test','/mgallery/board/lists?id=test','/mini/board/lists?id=test','/mgallery/board/view?id=test&no=1001&header=1'])for(const dark of [false,true]){
  const sides={};
  for(const [side,runtime]of [['control',control],['candidate',candidate]]){
   process.env.DCUF_TESTBED_USERSCRIPT=runtime;
   const context=await browser.newContext({viewport:{width:980,height:2306},screen:{width:412,height:1006},deviceScaleFactor:2.625,isMobile:true,hasTouch:false,userAgent:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'});
   await context.addInitScript({content:await loadHarnessSource({storage:{[storageKeys.threshold]:0,[storageKeys.ratioEnabled]:false,[storageKeys.personalEnabled]:true,[storageKeys.personalList]:{uids:[],nicknames:[],ips:[]}}})});
   const page=await context.newPage();
   try{
    await page.route('**'+route,async r=>{const response=await r.fetch();await r.fulfill({response,body:withHeaderDarkToggleFixture(await response.text())});});
    await page.goto(server.baseUrl+route,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.documentElement.classList.contains('script-ui-ready')&&document.querySelector('.newvisit_list')?.dataset.dcufRecentNavigationBound==='1'&&document.querySelector('[data-dcuf-gallery-page-head-role="root"]'));
    if(dark){await page.locator('.darkonoff').click();await page.waitForFunction(()=>document.body.classList.contains('dc-filter-dark-mode'));}
    await page.waitForFunction(()=>{const m=window.__dcufTestbedMetrics.snapshot();return !m.activeTimeouts&&!m.activeAnimationFrames&&!m.activeIntervals&&!m.dcuf?.subscribers?.includes('ui-post-reveal-recovery');});
    await page.evaluate(()=>{
     const selectors='.wrap_search input,.wrap_search button,.page_head form,.page_head input,.page_head button,.gnb_list a,.newvisit_list,.bnt_visit_prev,.bnt_visit_next';
     window.__exitOriginal=[...document.querySelectorAll(selectors)].map(n=>[n,n.parentNode,n.nextSibling]);window.__exitGM=JSON.stringify(window.__dcufTestbedGM.snapshot());window.__exitEvents=[];window.__exitGallerySubmits=0;
     document.addEventListener('submit',e=>{if(e.target.matches('.page_head form.gall_search')){e.preventDefault();window.__exitGallerySubmits++;window.__exitEvents.push(e.isTrusted);}},true);
     window.addEventListener('click',e=>{if(e.target.closest('.gnb_list a,.bnt_visit_prev,.bnt_visit_next'))window.__exitEvents.push(e.isTrusted);},true);
    });
    await page.locator('#preSWord').fill('exit native search');await page.locator('#preSWord').press('Enter');await page.locator('#searchSubmit').click();
    const gallery=page.locator('.page_head form.gall_search input');assert.equal(await gallery.count(),1);await gallery.fill('gallery native search');await page.locator('.page_head form.gall_search button[type=submit]').click();await gallery.press('Enter');
    assert.equal(await page.evaluate(()=>window.__exitGallerySubmits),2,'Original gallery search button and Enter submit');
    const links=page.locator('.gnb_list a');assert.ok(await links.count()>=2);await links.nth(0).click();assert.equal(await page.evaluate(()=>location.hash),'#gallery');await links.nth(1).press('Enter');assert.equal(await page.evaluate(()=>location.hash),'#minor');
    await page.locator('.bnt_visit_next').click();await page.waitForFunction(()=>document.querySelector('.newvisit_list').scrollLeft>1);await page.locator('.bnt_visit_prev').press('Enter');await page.waitForFunction(()=>document.querySelector('.newvisit_list').scrollLeft<1);
    sides[side]=await page.evaluate(()=>({globalSearchCalls:window.__fixtureNativeHeader.searchCalls,gallerySubmits:window.__exitGallerySubmits,hash:location.hash,recentAtStart:document.querySelector('.newvisit_list').scrollLeft<1,trusted:window.__exitEvents.length===6&&window.__exitEvents.every(Boolean)&&window.__fixtureNativeHeader.trusted.every(Boolean),identity:window.__exitOriginal.length>10&&window.__exitOriginal.every(([n,p,next])=>n.isConnected&&n.parentNode===p&&n.nextSibling===next),noSettingsWrite:window.__exitGM===JSON.stringify(window.__dcufTestbedGM.snapshot()),readback:{layout:[innerWidth,innerHeight],screen:[screen.width,screen.height],dpr:devicePixelRatio,scale:visualViewport.scale}}));
    assert.equal(sides[side].globalSearchCalls,2);assert.ok(sides[side].recentAtStart&&sides[side].trusted&&sides[side].identity&&sides[side].noSettingsWrite,JSON.stringify({side,route,dark,observation:sides[side]}));
    assert.deepEqual(sides[side].readback.layout,[980,2306]);assert.deepEqual(sides[side].readback.screen,[412,1006]);
    assert.equal(sides[side].readback.dpr,2.625);assert.equal(sides[side].readback.scale,1,'Proxy scale1 remains distinct from the observed phone');
   }finally{await context.close();}
  }
  assert.deepEqual(sides.candidate,sides.control,'No native-input semantic delta');report.cases.push({route,dark,...sides});console.log(`PASS980 ${route} ${dark?'dark':'light'}`);
 }
 report.status='PASS';
}finally{await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();}
