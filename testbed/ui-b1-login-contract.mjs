import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {loadHarnessSource,resolveBuiltUserscript} from './harness/userscript-loader.mjs';
import {loginFixtureHtml} from './fixtures/login-native.mjs';

const paletteKey='dcuf_mobile_ui_palette';
const palettes=['blue','purple','green','orange','mono','indigo','sky','cyan','teal','lime','amber','red','rose','pink'];
export async function runLoginEntryContract({browser,outputDirectory}={}) {
 const raw=await readFile(await resolveBuiltUserscript(),'utf8');
 const logo=await readFile(new URL('./fixtures/login-wordmark.svg',import.meta.url));
 const security=await readFile(new URL('./fixtures/login-security-sprite.png',import.meta.url));
 const records=[];
 if(outputDirectory)await mkdir(outputDirectory,{recursive:true});
 const create=async({url='https://sign.dcinside.com/login?s_url=https://gall.dcinside.com/board/lists/?id=synthetic#login',dark=false,palette='teal',viewport={width:980,height:900},broken=false,nativeDark=false,gmBehavior={},late=false,duplicateEarly=false,fault=false,disposeEarly=false,rejectPending=false}={})=>{
  const context=await browser.newContext({viewport,colorScheme:dark?'dark':'light'});
  const errors=[],requests=[];
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',async route=>{
   const q=route.request();requests.push({method:q.method(),url:q.url()});
   if(q.isNavigationRequest()&&q.frame()===page.mainFrame())return route.fulfill({contentType:'text/html; charset=utf-8',body:loginFixtureHtml({broken,nativeDark,disposeEarly,rejectPending})});
   if(q.url().endsWith('/logo-wordmark.svg'))return route.fulfill({contentType:'image/svg+xml',body:logo});
   if(q.url().endsWith('/sp_loginout.png'))return route.fulfill({contentType:'image/png',body:security});
   return route.abort();
  });
  const harness=await loadHarnessSource({storage:{[paletteKey]:palette},gmBehavior});
  if(fault)await context.addInitScript(()=>{const append=HTMLHeadElement.prototype.appendChild;HTMLHeadElement.prototype.appendChild=function(n){if(n.id==='dcuf-mobile-login-style')throw Error('synthetic style failure');return append.call(this,n);};});
  if(!late)await context.addInitScript({content:harness+(duplicateEarly?'\n'+raw:'')});
  await page.goto(url,{waitUntil:'domcontentloaded'});
  if(late)await page.addScriptTag({content:harness});
  return {context,page,errors,requests,close:()=>context.close()};
 };
 const mounted=async e=>{await e.page.waitForFunction(()=>document.documentElement.hasAttribute('data-dcuf-login'),null,{timeout:4000});await e.page.waitForFunction(()=>window.__dcufLoginController?.getSnapshot().paletteSettled);};
 const observe=async e=>e.page.evaluate(()=>{
  const f=document.querySelector('.login_inputbox form'),o=window.__loginOriginal;
  const controls=[...f.querySelectorAll('input:not([type=hidden]),button,a')].map(n=>{const r=n.getBoundingClientRect();return {id:n.getAttribute('id'),width:r.width,height:r.height,hit:n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});
  return {state:window.__dcufLoginController?.getSnapshot(),htmlPreserved:f.innerHTML===o.html,formPreserved:f===o.form&&f.onsubmit===o.submit&&f.getAttribute('action')===o.action&&f.getAttribute('method')===o.method,nodesPreserved:[...f.elements].every((n,i)=>n===o.nodes[i]&&n.parentNode===o.parents[i]),controls,horizontalExcess:document.documentElement.scrollWidth-innerWidth,boot:!!window.__dcufBootController,coordinator:!!window.__dcufRuntimeCoordinator,bootOverlay:!!document.getElementById('dcuf-boot-overlay'),styles:document.querySelectorAll('#dcuf-mobile-login-style').length,gm:window.__dcufTestbedGM.snapshot(),palette:document.documentElement.getAttribute('data-dcuf-palette'),dark:document.documentElement.classList.contains('dc-filter-dark-mode')};
 });
 const assertOriginal=o=>{assert.ok(o.htmlPreserved&&o.formPreserved&&o.nodesPreserved,'original native form/field/handler/parent changed');assert.ok(!o.boot&&!o.coordinator&&!o.bootOverlay,'gallery initialization ran on sign');assert.equal(o.gm.writes.length,0);assert.equal(o.gm.menuLabels.length,0);assert.ok(o.gm.reads.every(r=>r.key===paletteKey),'login read unrelated settings');};
 for(const viewport of [{width:980,height:900},{width:980,height:2306},{width:390,height:560}])for(const dark of [false,true]){
  const e=await create({viewport,dark});try{
   await mounted(e);const o=await observe(e);assertOriginal(o);assert.equal(await e.page.locator('#id').inputValue(),'synthetic-existing-id');assert.equal(await e.page.locator('#pw').inputValue(),'synthetic-existing-password');assert.equal(o.palette,'teal');assert.equal(o.dark,dark);assert.equal(o.styles,1);assert.ok(o.horizontalExcess<=0);assert.equal(o.controls.length,7);assert.ok(o.controls.every(c=>c.width>0&&c.height>0&&c.hit));
   for(let i=0;i<7&&await e.page.evaluate(()=>document.activeElement?.id!=='id');i++)await e.page.keyboard.press('Tab');
   assert.equal(await e.page.evaluate(()=>document.activeElement?.id),'id');assert.equal(await e.page.locator('#id').evaluate(n=>getComputedStyle(n).outlineWidth),'2px','keyboard focus ring missing');
   await e.page.locator('#id').fill('synthetic-user');await e.page.locator('#pw').fill('synthetic-not-a-real-password');await e.page.locator('#pw').press('Enter');assert.equal(await e.page.evaluate(()=>window.__loginCalls.length),1,'original Enter/submit handler did not run exactly once');
   await e.page.locator('label[for=checksaveid]').click();assert.equal(await e.page.locator('#checksaveid').isChecked(),true);
   await e.page.locator('#id').fill('');await e.page.locator('#pw').fill('');await e.page.locator('#checksaveid').uncheck();await e.page.mouse.move(1,1);
   if(outputDirectory)await e.page.screenshot({path:outputDirectory+`/login-${viewport.width}-${viewport.height}-${dark?'dark':'light'}.png`,animations:'disabled'});
   await e.page.locator('#id').fill('synthetic-dup-id');await e.page.locator('#pw').fill('synthetic-duplicate-password');
   await e.page.addScriptTag({content:raw});assert.equal(await e.page.locator('#dcuf-mobile-login-style').count(),1);assert.equal((await e.page.evaluate(()=>window.__dcufTestbedGM.snapshot())).reads.length,1,'duplicate startup read settings again');assert.equal(await e.page.locator('#id').inputValue(),'synthetic-dup-id');assert.equal(await e.page.locator('#pw').inputValue(),'synthetic-duplicate-password');
   assert.deepEqual(e.errors,[]);assert.ok(e.requests.every(r=>r.method==='GET'),'fixture attempted native network write');records.push({case:'layout',viewport,dark,...o});
  }finally{await e.close();}
 }
 for(const palette of palettes)for(const dark of [false,true]){
  const e=await create({palette,dark});try{await mounted(e);const o=await observe(e);assertOriginal(o);assert.equal(o.palette,palette);const values=await e.page.locator('button[type=submit]').evaluate(n=>({color:getComputedStyle(n).color,background:getComputedStyle(n).backgroundImage}));assert.ok(values.background.includes('gradient'));records.push({case:'palette',palette,dark,values});assert.deepEqual(e.errors,[]);}finally{await e.close();}
 }
 for(const url of ['https://sign.dcinside.com/login/member_check','https://sign.dcinside.com/myinfo/find_id','https://sign.dcinside.com/join/','https://sign.dcinside.com.evil.test/login','http://sign.dcinside.com/login']){
  const e=await create({url});try{assert.equal(await e.page.locator('#dcuf-mobile-login-style').count(),0);assert.equal(await e.page.evaluate(()=>!!window.__dcufLoginController),false);const gm=await e.page.evaluate(()=>window.__dcufTestbedGM.snapshot());assert.equal(gm.reads.length,0);assert.equal(gm.writes.length,0);assert.deepEqual(e.errors,[]);records.push({case:'unsupported',url});}finally{await e.close();}
 }
 for(const options of [{late:true},{duplicateEarly:true},{gmBehavior:{rejectOnceKeys:[paletteKey]}},{broken:true},{fault:true},{nativeDark:true},{disposeEarly:true}]){
  const e=await create(options);try{
   if(options.broken||options.fault||options.disposeEarly){assert.equal(await e.page.locator('#dcuf-mobile-login-style').count(),0);assert.equal(await e.page.evaluate(()=>document.documentElement.hasAttribute('data-dcuf-login')),false);assertOriginal(await observe(e));if(options.disposeEarly){assert.equal(await e.page.evaluate(()=>window.__dcufLoginController.getSnapshot().state),'disposed');assert.equal((await e.page.evaluate(()=>window.__dcufTestbedGM.snapshot())).reads.length,0);}}
   else{await mounted(e);const o=await observe(e);assertOriginal(o);assert.equal(o.styles,1);assert.equal(o.palette,options.gmBehavior?'blue':'teal');if(options.nativeDark){assert.equal(o.dark,true);await e.page.emulateMedia({colorScheme:'light'});assert.equal(await e.page.evaluate(()=>window.__dcufLoginController.getSnapshot().dark),true);}}
   if(options.late){await e.page.emulateMedia({colorScheme:'dark'});await e.page.waitForFunction(()=>window.__dcufLoginController.getSnapshot().dark);await e.page.emulateMedia({colorScheme:'light'});await e.page.waitForFunction(()=>!window.__dcufLoginController.getSnapshot().dark);}
   if(options.nativeDark){await e.page.evaluate(()=>{document.getElementById('css-darkmode').remove();window.dispatchEvent(new Event('pageshow'));});assert.equal(await e.page.evaluate(()=>window.__dcufLoginController.getSnapshot().dark),false);}
   assert.deepEqual(e.errors,[]);records.push({case:'lifecycle',options});
  }finally{await e.close();}
 }
 const e=await create({gmBehavior:{pendingKeys:[paletteKey]}});try{
  await e.page.waitForFunction(()=>window.__dcufLoginController?.getSnapshot().state==='mounted');await e.page.evaluate(()=>window.__dcufLoginController.dispose());await e.page.waitForFunction(()=>window.__dcufTestbedGM.snapshot().reads.length===1);await e.page.evaluate(()=>window.__dcufTestbedGM.release('dcuf_mobile_ui_palette'));await e.page.waitForFunction(()=>window.__dcufLoginController.getSnapshot().paletteSettled);
  assert.equal(await e.page.locator('#dcuf-mobile-login-style').count(),0);assert.equal(await e.page.evaluate(()=>document.documentElement.hasAttribute('data-dcuf-login')),false);assert.equal(await e.page.evaluate(()=>document.documentElement.hasAttribute('data-dcuf-palette')),false);assert.equal(await e.page.evaluate(()=>window.__dcufTestbedGM.snapshot().writes.length),0);records.push({case:'late-read-after-dispose'});assert.deepEqual(e.errors,[]);
 }finally{await e.close();}
 const rejected=await create({rejectPending:true});try{
  await rejected.page.waitForFunction(()=>typeof window.__rejectLoginRead==='function');
  const before=await rejected.page.evaluate(()=>window.__dcufTestbedMetrics.snapshot());
  await rejected.page.evaluate(()=>window.__dcufLoginController.dispose());
  await rejected.page.evaluate(()=>window.__rejectLoginRead());await rejected.page.waitForFunction(()=>window.__dcufLoginController.getSnapshot().paletteSettled);
  const after=await rejected.page.evaluate(()=>window.__dcufTestbedMetrics.snapshot());
  assert.equal(after.activeListenerKeys,before.activeListenerKeys-3,'ready/media/pageshow hooks not restored');
  for(const key of ['activeTimeouts','activeIntervals','activeAnimationFrames'])assert.equal(after[key],before[key],`login changed ${key} baseline: ${JSON.stringify({before:before.activeTimeoutDetails,after:after.activeTimeoutDetails})}`);
  assert.equal(await rejected.page.locator('#dcuf-mobile-login-style').count(),0);assert.equal(await rejected.page.evaluate(()=>document.documentElement.hasAttribute('data-dcuf-login')),false);assert.equal(await rejected.page.evaluate(()=>document.documentElement.hasAttribute('data-dcuf-palette')),false);assert.deepEqual(rejected.errors,[]);records.push({case:'late-rejection-disposal-resource-restoration',listenersRemoved:3,baseline:{timeouts:before.activeTimeouts,intervals:before.activeIntervals,frames:before.activeAnimationFrames},restored:{timeouts:after.activeTimeouts,intervals:after.activeIntervals,frames:after.activeAnimationFrames}});
 }finally{await rejected.close();}
 if(outputDirectory)await writeFile(outputDirectory+'/observations.json',JSON.stringify({records},null,2)+'\n');
 console.log(`Login source contract: ${records.length} observations; synthetic native submits only, no authentication network writes.`);return records;
}
