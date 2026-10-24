import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {startServer} from './server/server.mjs';
import {loadHarnessSource} from './harness/userscript-loader.mjs';
import {storageKeys} from './harness/runner-utils.mjs';
import {withHeaderCompositionFixture} from './fixtures/header-composition.mjs';
import {restoreHeaderCompositionSource} from '../tools/header-composition-contract.mjs';

const args=process.argv.slice(2),root=process.cwd();
const required=flag=>{const i=args.indexOf(flag);assert.ok(i>=0&&args[i+1],flag);return path.resolve(args[i+1]);};
assert.ok(args.includes('--require-runtime-under-test'));
const runtime=path.resolve('testbed/artifacts/runtime-under-test.user.js'),control=required('--control'),out=required('--output');
assert.ok(out.startsWith(path.resolve('testbed/artifacts')+path.sep));await fs.mkdir(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex').toUpperCase();
const oldSha='3BC9829BA3E1CF7EA111518B001BA3A5D7AE336CF3CA84831FB10E5DB748F4FA';
const old=await fs.readFile(control),current=await fs.readFile(runtime);assert.equal(sha(old),oldSha);
const characterize=args.includes('--characterize');
if(characterize)assert.equal(sha(current),oldSha,'Characterization requires the unchanged frozen control');
else assert.equal(sha(restoreHeaderCompositionSource(current.toString())),oldSha,'Entire artifact differs only by four declared composition declarations');
console.log(`Header composition runtime ${runtime}; SHA-256 ${sha(current)}`);
const {chromium}=createRequire(import.meta.url)('./harness/playwright-loader.cjs');
const browser=await chromium.launch({headless:true,args:['--disable-background-timer-throttling','--blink-settings=primaryPointerType=2,availablePointerTypes=2,primaryHoverType=2,availableHoverTypes=2,maxTouchPoints=5,forceTouchEventFeatureDetectionForInspector=true']});
const server=await startServer();
const report={scope:characterize?'CHARACTERIZATION_NOT_ADMISSION':'HEADER_COMPOSITION_ONLY',status:'RUNNING',control:{sha256:oldSha},candidate:{path:runtime,sha256:sha(current)},browser:browser.version(),inputs:{},cases:[]};
for(const f of ['testbed/run-header-composition.mjs','testbed/fixtures/header-composition.mjs','testbed/fixtures/header-dark-toggle.mjs','tools/header-composition-contract.mjs'])report.inputs[f]=sha(await fs.readFile(f));
try{
 for(const width of [980,390,1280])for(const dark of [false,true]){
  const sides={};
  for(const [side,file] of [['control',control],['candidate',runtime]]){
   process.env.DCUF_TESTBED_USERSCRIPT=file;
   const context=await browser.newContext({viewport:{width,height:2306},screen:{width:412,height:1006},deviceScaleFactor:2.625,isMobile:true,hasTouch:false,userAgent:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'});
   await context.addInitScript({content:await loadHarnessSource({storage:{[storageKeys.threshold]:0,[storageKeys.ratioEnabled]:false,[storageKeys.personalEnabled]:true,[storageKeys.personalList]:{uids:[],nicknames:[],ips:[]}}})});
   const page=await context.newPage();
   try{
    await page.route('**/mgallery/board/lists?id=test',async route=>{const response=await route.fetch();await route.fulfill({response,body:withHeaderCompositionFixture(await response.text())});});
    await page.goto(server.baseUrl+'/mgallery/board/lists?id=test',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.documentElement.classList.contains('script-ui-ready')&&document.querySelector('[data-dcuf-header-gnb-role="list"]')&&document.querySelector('[data-dcuf-header-recent-visit-role="root"]')&&document.querySelector('.dcuf-header-drawer__toggle'));
    if(dark){await page.locator('.darkonoff').click();await page.waitForFunction(()=>document.body.classList.contains('dc-filter-dark-mode'));}
    await page.waitForFunction(()=>{const m=window.__dcufTestbedMetrics.snapshot();return !m.activeTimeouts&&!m.activeAnimationFrames&&!m.activeIntervals&&!m.dcuf?.subscribers?.includes('ui-post-reveal-recovery');});
    await page.evaluate(()=>{window.__compositionNodes=[...document.querySelectorAll('.gnb_list a,.page_head button,.page_head input')].map(n=>[n,n.parentNode,n.nextSibling]);window.__compositionSettings=JSON.stringify(window.__dcufTestbedGM.snapshot());});
    const geometry=await page.evaluate(()=>{
     const rect=n=>{const r=n.getBoundingClientRect();return[r.x,r.y,r.width,r.height];},box=s=>rect(document.querySelector(s));
     const menu=[...document.querySelectorAll('.gnb_list>li')].map(rect),recent=box('.newvisit_history'),heading=box('.page_head'),right=box('.page_head>.fr');
     const actions=[...document.querySelectorAll('.page_head>.fr>button,.page_head>.fr>.dcuf-header-drawer')].map(n=>{const r=n.getBoundingClientRect();return{box:rect(n),hit:n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});
     return{menu,recent,heading,right,actions,gnb:box('.gnb_bar'),gnbLinks:[...document.querySelectorAll('.gnb_list a')].map(a=>a.getAttribute('href')),compositionPass:menu.every(r=>r[3]>0&&r[1]+r[3]<=recent[1]+.5)&&actions.length>=4&&actions.every(a=>a.box[3]>0&&a.hit&&a.box[1]+a.box[3]<=heading[1]+heading[3]+.5)};
    });
    assert.equal(geometry.menu.length,8,'Positive native eight-link composition case');
    await page.locator('.in_keyword').first().fill('native composition search');await page.locator('.in_keyword').first().press('Enter');await page.locator('#searchSubmit').click();
    await page.locator('.page_head .relate').press('Enter');await page.locator('.page_head .relate').press('Enter');
    await page.locator('.page_head .gall_useinfo').press('Enter');await page.locator('.page_head .gall_useinfo').press('Enter');
    const semantics=await page.evaluate(()=>({nativeSearchCalls:window.__fixtureNativeHeader.searchCalls,originalTrusted:window.__fixtureNativeHeader.trusted.every(Boolean),hostActions:window.__fixtureHostHeaderToggles,originalIdentity:window.__compositionNodes.every(([n,p,next])=>n.isConnected&&n.parentNode===p&&n.nextSibling===next),noSettingsWrite:window.__compositionSettings===JSON.stringify(window.__dcufTestbedGM.snapshot())}));
    assert.equal(semantics.nativeSearchCalls,2);assert.ok(semantics.originalTrusted&&semantics.originalIdentity&&semantics.noSettingsWrite);assert.equal(semantics.hostActions.relation,2);assert.equal(semantics.hostActions.guide,2);
    const pointerReachable=geometry.actions.every(a=>a.hit);
    if(pointerReachable){
     for(const selector of ['.page_head .relate','.page_head .gall_useinfo']){await page.locator(selector).click();await page.locator(selector).click();}
     const calls=await page.evaluate(()=>window.__fixtureHostHeaderToggles);assert.equal(calls.relation,4);assert.equal(calls.guide,4);
    }
    if(side==='candidate')await page.screenshot({path:path.join(out,`${width}-${dark?'dark':'light'}.png`),clip:{x:0,y:0,width,height:500},scale:'css'});
    sides[side]={geometry,semantics,pointerReachable};
   }finally{await context.close();}
  }
  assert.deepEqual(sides.candidate.semantics,sides.control.semantics);assert.deepEqual(sides.candidate.geometry.gnbLinks,sides.control.geometry.gnbLinks);
  if(width>=980)assert.deepEqual(sides.candidate.geometry.menu,sides.control.geometry.menu,'Default980 and wide GNB geometry remains exact');
  report.cases.push({width,dark,...sides});console.log(`${width} ${dark?'dark':'light'}: control ${sides.control.geometry.compositionPass}, candidate ${sides.candidate.geometry.compositionPass}`);
 }
 report.status=report.cases.every(c=>c.candidate.geometry.compositionPass)?'PASS':'RED';
}finally{await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();}
assert.equal(report.status,'PASS','Visible GNB/recent adjacency and page-head native-action containment');
