import assert from 'node:assert/strict';
import {createTestPage,storageKeys,getMetrics,assertNoRuntimeErrors} from './harness/runner-utils.mjs';
import {createSettingsState} from './ui-b1-native-settings-contract.mjs';
import {populateMemoRows} from './ui-b1-memo-workbench-contract.mjs';
import {mountManagementV7} from './ui-owned-management-v7-contract.mjs';
import {mountArticleV7State} from './ui-b1-article-v7-contract.mjs';
import {mountWriterV7} from './ui-b1-write-v7-contract.mjs';
import {mountB1NativeFixture} from './fixtures/b1-native-list.mjs';
import {b1PasswordHtml} from './fixtures/b1-password.mjs';

export const darkMaterialFamilies=['memo','management','list','article','writer','password'];
const memo='#user_memo_config';
const settle=page=>page.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})))});
export async function mountDarkMaterialFamily(browser,server,family,dark){
 let e,selectors;
 if(family==='memo'){
  e=await createSettingsState(browser,server,{dark,viewport:{width:1440,height:1000}});
  await e.page.evaluate(()=>window.__settingsFixture.open('memo'));
  await e.page.waitForFunction(()=>document.querySelector('#user_memo_config')?.dataset.dcufGalleryPageHeadRole==='settings-popup-memo');
  await populateMemoRows(e.page);await e.page.locator('#chk_sample_0').check();
  selectors=['#user_memo_cont > .btn_box > button'];
 }else if(family==='management'){
  e=await mountManagementV7(browser,server,{dark});selectors=['#dc-block-management-panel .panel-save-btn'];
 }else if(family==='article'){
  ({e}=await mountArticleV7State(browser,server,{width:980,height:900,dark}));
  selectors=['[data-dcuf-role="comment-composer"][data-dcuf-state="main"] [data-dcuf-role="native-comment-submit"]','.img_area.no1 [data-dcuf-role="native-comment-submit"]'];
 }else if(family==='writer'){
  e=await mountWriterV7(browser,server,{width:980,height:900,dark});selectors=['[data-dcuf-native-form-role="outer-action-primary"]'];
 }else if(family==='password'){
  e=await createTestPage(browser,server.baseUrl,{viewport:{width:980,height:900},storage:{[storageKeys.threshold]:0,[storageKeys.palette]:'teal'}});
  await e.page.route(u=>u.origin===server.baseUrl&&u.pathname==='/board/modify/',r=>r.fulfill({contentType:'text/html',body:b1PasswordHtml('modify')}));
  await e.goto('/board/modify/?id=test&no=1001');
  if(dark)await e.page.evaluate(()=>{const s=document.createElement('style');s.id='css-darkmode';s.textContent='html{color-scheme:dark}';document.head.append(s);document.body.classList.add('dc-filter-dark-mode');document.documentElement.classList.add('darkmode')});
  selectors=['[data-dcuf-native-form-role="popup-shell"][data-dcuf-native-form-state="password"] .btn_box button:last-child'];
 }else{
  e=await createTestPage(browser,server.baseUrl,{viewport:{width:980,height:900},storage:{[storageKeys.threshold]:0,[storageKeys.palette]:'teal'}});
  await mountB1NativeFixture(e,server.baseUrl,{dark});selectors=['[data-dcuf-surface="list-toolbar"] [data-dcuf-role="primary-action"]','.newvisit_history .btn_open'];
 }
 for(const s of selectors)await e.page.locator(s).first().waitFor({state:'visible'});
 await e.page.mouse.move(0,0);await settle(e.page);return{e,selectors};
}
export async function sampleMaterial(page,selector){
 return page.locator(selector).first().evaluate(n=>{
  const s=getComputedStyle(n);
  const face=n.matches('[data-dcuf-surface="list-toolbar"] [data-dcuf-role="primary-action"]')?getComputedStyle(n,'::after'):s;
  const actual={fill:face.backgroundColor,image:face.backgroundImage,ink:s.color,rim:face.borderTopColor,shadow:face.boxShadow};
  const probe=document.createElement('span');probe.style.cssText='background:var(--dcuf-v7-primary-bg);color:var(--dcuf-v7-primary-ink);border:1px solid var(--dcuf-v7-primary-rim);box-shadow:var(--dcuf-v7-primary-shadow)';n.append(probe);const p=getComputedStyle(probe);
  const recipe={fill:p.backgroundColor,image:p.backgroundImage,ink:p.color,rim:p.borderTopColor,shadow:p.boxShadow};probe.remove();
  return{actual,recipe,commonGlaze:s.getPropertyValue('--dcuf-control-glaze').trim()};
 });
}
const whiteAlphas=image=>[...image.matchAll(/rgba\(255, 255, 255, ([\d.]+)\)/g)].map(m=>Number(m[1]));
export async function runDarkMaterialFamilyContract({browser,server}){
 const records=[];
 for(const family of darkMaterialFamilies)for(const dark of[false,true]){
  const {e,selectors}=await mountDarkMaterialFamily(browser,server,family,dark);
  try{
   for(const selector of selectors){const paint=await sampleMaterial(e.page,selector);
    if(family!=='password'){assert.equal(paint.actual.fill,paint.recipe.fill,family+' shares primary fill');assert.equal(paint.actual.image,paint.recipe.image,family+' shares primary glaze');
     // Light recent-visit ink stays adopted;dark primary surfaces require paired dark ink.
     if(family!=='list'||dark||selector.includes('primary-action'))assert.equal(paint.actual.ink,paint.recipe.ink,family+' shares primary ink');
    }
    if(dark){const highlights=whiteAlphas(paint.actual.image);assert.ok(highlights.length&&highlights.every(a=>a<=(family==='password'?.04:.19)),family+' dark highlights stay within the light-like material budget: '+paint.actual.image);
     if(family!=='password')assert.ok(paint.actual.fill.includes('/ 0.92)'),family+' uses the brighter tinted translucent primary fill');
    }
    records.push({family,dark,selector,paint});
   }
   if(family==='memo'&&dark){
    const modes=await e.page.locator(selectors[0]).evaluate(n=>{
     const html=document.documentElement,body=document.body,saved=[html.className,body.className],results=[];
     try{for(const mode of['root','body']){html.classList.remove('dc-filter-dark-mode','darkmode');body.classList.remove('dc-filter-dark-mode','darkmode');(mode==='root'?html:body).classList.add('dc-filter-dark-mode');const s=getComputedStyle(n);results.push({mode,image:s.backgroundImage,fill:s.backgroundColor,rim:s.borderTopColor,shadow:s.boxShadow});}}
     finally{html.className=saved[0];body.className=saved[1]}return results;
    });
    assert.equal(modes[0].image,modes[1].image,'Root/body-only dark states share the same material');assert.deepEqual(modes[0].fill,modes[1].fill);assert.equal(modes[0].rim,modes[1].rim);assert.equal(modes[0].shadow,modes[1].shadow);
    for(const mode of modes)assert.ok(whiteAlphas(mode.image).every(a=>a<=.19)&&mode.fill.includes('/ 0.92)'));
   }
   assertNoRuntimeErrors(await getMetrics(e.page),e.consoleErrors);
  }finally{await e.close()}
 }
 return{records};
}
export async function runMemoRowSurfaceContract({browser,server}){
 const records=[];
 for(const dark of[false,true]){
  const {e}=await mountDarkMaterialFamily(browser,server,'memo',dark),p=e.page,root=p.locator(memo);
  try{
   const rows=root.locator('[data-dcuf-gallery-page-head-role="settings-memo-list"] > li');
   assert.equal(await rows.count(),3);
   for(const row of await rows.all()){
    const paint=await row.locator('button.btn').evaluate(n=>{const s=getComputedStyle(n);return{shadow:s.boxShadow,radius:s.borderRadius,border:s.borderTopWidth,image:s.backgroundImage,fill:s.backgroundColor}});
    assert.equal(paint.shadow,'none','Memo click-target buttons cannot inherit a raised upper arc');assert.equal(paint.radius,'0px');assert.equal(paint.border,'0px');assert.equal(paint.image,'none');assert.equal(paint.fill,'rgba(0, 0, 0, 0)');
   }
   const selected=rows.first();assert.notEqual(await selected.evaluate(n=>getComputedStyle(n).backgroundColor),'rgba(0, 0, 0, 0)');
   const rowBox=await selected.boundingBox(),checkBox=await selected.locator('input').boundingBox();assert.ok(checkBox.x>=rowBox.x+8,'Selection has an inset checkbox,not one touching its rounded corner');
   const authored=await rows.locator('.mone').evaluateAll(ns=>ns.map(n=>n.style.color));
   await root.locator('#chk_sample_0').uncheck();assert.equal(await selected.evaluate(n=>getComputedStyle(n).backgroundColor),'rgba(0, 0, 0, 0)');await root.locator('#chk_sample_1').check();
   assert.deepEqual(await rows.locator('.mone').evaluateAll(ns=>ns.map(n=>n.style.color)),authored);
   for(const selector of ['[data-dcuf-gallery-page-head-role="settings-memo-sort"] button:not(.on)','[data-dcuf-gallery-page-head-role="settings-memo-tools"] button']){const controls=root.locator(selector);assert.ok(await controls.count(),'A real auxiliary group must be inspected');for(const control of await controls.all()){
    const s=await control.evaluate(n=>{const s=getComputedStyle(n);return[s.backgroundColor,s.backgroundImage,s.boxShadow]});assert.deepEqual(s,['rgba(0, 0, 0, 0)','none','none'],'Auxiliary memo actions are plain at rest');
   }}
   const rowButton=rows.nth(1).locator('button.btn');await p.keyboard.press('Tab');await rowButton.focus();assert.equal(await rowButton.evaluate(n=>getComputedStyle(n).outlineStyle),'solid');
   const hit=await rowButton.evaluate(n=>{const r=n.getBoundingClientRect(),t=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.width>0&&r.height>0&&(n===t||n.contains(t))});assert.ok(hit,'Original row target stays reachable');
   assert.ok(await p.evaluate(()=>window.__settingsFixture.preserved()));assertNoRuntimeErrors(await getMetrics(p),e.consoleErrors);records.push({dark});
  }finally{await e.close()}
 }
 return{records};
}
