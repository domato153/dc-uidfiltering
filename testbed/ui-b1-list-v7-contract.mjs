import assert from 'node:assert/strict';
import {createTestPage,storageKeys,assertNoRuntimeErrors,getMetrics} from './harness/runner-utils.mjs';
import {mountB1NativeFixture} from './fixtures/b1-native-list.mjs';
import {renderedLabelContrast} from './ui-control-material-contract.mjs';
import {installLiveControlFixture} from './ui-live-control-contract.mjs';

const toolbar='[data-dcuf-surface="list-toolbar"]';
const hit=loc=>loc.evaluate(n=>{const r=n.getBoundingClientRect(),t=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.width>0&&r.height>0&&(t===n||n.contains(t));});
const settle=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
export async function runListV7Contract({browser,server,onCapture}){
 const records=[];
 for(const state of[{width:1536,height:1024},{width:980,height:900},{width:980,height:900,dark:true},{width:980,height:2306},{width:390,height:700,dark:true}]){
  const e=await createTestPage(browser,server.baseUrl,{viewport:{width:state.width,height:state.height},storage:{[storageKeys.threshold]:0,[storageKeys.palette]:'teal'}});
  try{
   await mountB1NativeFixture(e,server.baseUrl,{dark:state.dark});
   await e.page.evaluate(installLiveControlFixture);
   await e.page.waitForFunction(()=>{
    const buttons=[...document.querySelectorAll('.list_array_option .array_tab button')];
    return buttons.length>=3&&buttons.every(n=>n.dataset.dcufRole==='action')&&document.querySelector('.btn_subject_more')?.dataset.dcufRole==='category-toggle';
   });
   await e.page.mouse.move(0,0);await settle(e.page);
   // Newly projected native controls legitimately transition from host paint.
   // Observe their settled default state rather than a mid-fade RGBA sample.
   await e.page.locator(toolbar).evaluate(async n=>{await Promise.all(n.getAnimations({subtree:true}).filter(a=>Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{})))});
   const tabs=e.page.locator(toolbar+' [data-dcuf-role="tablist"] [data-dcuf-role="action"]');
   const paint=await tabs.evaluateAll(ns=>ns.map(n=>{const s=getComputedStyle(n);return {image:s.backgroundImage,color:s.backgroundColor,shadow:s.boxShadow,width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height}}));
   assert.ok(paint.length>=3&&paint.every(s=>s.image==='none'&&s.color==='rgba(0, 0, 0, 0)'&&s.shadow==='none'),'Primary tabs are plain text at rest, not individual glass boxes: '+JSON.stringify(paint));
   const active=e.page.locator(toolbar+' [data-dcuf-role="tablist"] [data-dcuf-state="current"]').first();
   assert.ok(await active.evaluate(n=>parseFloat(getComputedStyle(n).borderBottomWidth)>=2),'Selected tab keeps an underline');
   await tabs.nth(1).hover();assert.notEqual(await tabs.nth(1).evaluate(n=>getComputedStyle(n).backgroundImage+'|'+getComputedStyle(n).backgroundColor),'none|rgba(0, 0, 0, 0)','Hover supplies the local interaction surface');
   await e.page.mouse.move(0,0);await e.page.keyboard.press('Tab');await tabs.nth(1).focus();assert.notEqual(await tabs.nth(1).evaluate(n=>getComputedStyle(n).outlineStyle),'none');await tabs.nth(1).evaluate(n=>n.blur());
   const primary=e.page.locator(toolbar+' [data-dcuf-role="primary-action"]').first();
   assert.ok(await hit(primary));assert.ok((await primary.boundingBox()).height>=40);
   const color=await primary.evaluate(n=>{const p=document.createElement('i');n.append(p);p.style.color='var(--dcuf-v7-primary-ink)';const expected=getComputedStyle(p).color;p.remove();return{expected,actual:getComputedStyle(n).color}});assert.equal(color.actual,color.expected);
   const contrast=await renderedLabelContrast(e.page,toolbar+' [data-dcuf-role="primary-action"]');assert.ok(contrast.min>=4.5,'Primary rendered contrast '+contrast.min);
   await e.page.mouse.move(0,0);await settle(e.page);
   const utilities=e.page.locator('[data-dcuf-gallery-page-head-role="utility-control"]').filter({visible:true});
   assert.ok(await utilities.evaluateAll(ns=>ns.every(n=>getComputedStyle(n).backgroundImage==='none'&&getComputedStyle(n).backgroundColor==='rgba(0, 0, 0, 0)')),'Gallery utilities are text at rest');
   const rows=e.page.locator('[data-dcuf-surface="list-item"]').filter({visible:true});
   const row=rows.first();assert.equal(await row.locator('[data-dcuf-stat]').count(),3,'Original date/views/recommendations have presentation slots');
   if(state.width>=1250){
    const boxes=await row.locator('[data-dcuf-stat],.dcuf-list-author').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().toJSON()));assert.ok(Math.max(...boxes.map(b=>b.y))-Math.min(...boxes.map(b=>b.y))<=3,'Wide metadata aligns on one row');const title=await row.locator('.dcuf-list-title').boundingBox();assert.ok(Math.abs(title.y+title.height/2-boxes[0].y-boxes[0].height/2)<8,'Wide title and metadata share the same reading row');
    const longCounts=await e.page.evaluate(()=>{
     const source=document.querySelector('.gall_list tbody tr:has(.gall_count)').cloneNode(true),out=[];
     for(const value of ['99999999','999999999999999999999999']){
      source.querySelector('.gall_count').textContent=value;source.querySelector('.gall_recommend').textContent=value;
      const item=window.__dcufListHostAdapter.createItem(source,'fixture-large-count');document.querySelector('[data-dcuf-surface="list-container"]').append(item);
      out.push([...item.querySelectorAll('[data-dcuf-stat]')].map(n=>({text:n.textContent,tooltip:n.title,width:n.clientWidth,scroll:n.scrollWidth,overflow:getComputedStyle(n).overflowX,ellipsis:getComputedStyle(n).textOverflow,rect:n.getBoundingClientRect().toJSON()})));item.remove();
     }return out;
    });
    assert.ok(longCounts[0].every(n=>n.scroll<=n.width+1),'Eight-digit native counts fit without adjacent-column overlap: '+JSON.stringify(longCounts[0]));
    assert.ok(longCounts[1].every(n=>n.scroll<=n.width+1||(n.overflow==='hidden'&&n.ellipsis==='ellipsis'&&n.tooltip===n.text)),'Extreme values stay contained and retain their complete accessible/native text');
   }
   assert.ok(await e.page.evaluate(()=>window.__b1Originals.every(o=>o.node.parentNode===o.parent&&o.node.onclick===o.handler)),'Original header nodes/handlers preserved');
   const toggle=e.page.locator(toolbar+' [data-dcuf-role="category-toggle"]');await toggle.click();const menu=e.page.locator(toolbar+' [data-dcuf-role="category-popup"]');await menu.waitFor({state:'visible'});assert.ok(await hit(menu.locator('a').first()));await toggle.click();
   {
    const before=await e.page.locator(toolbar).boundingBox();await primary.focus();await e.page.evaluate(()=>scrollTo(0,600));
    await e.page.waitForFunction(()=>document.querySelector('[data-dcuf-surface="list-toolbar"]')?.dataset.dcufScroll==='shown');
    const floating=await e.page.locator(toolbar).boundingBox();assert.ok(Math.abs(floating.x-before.x)<=1&&Math.abs(floating.width-before.width)<=1,'Floating toolbar retains the content gutter instead of moving to viewport left: '+JSON.stringify({before,floating}));
    await e.page.evaluate(()=>scrollTo(0,0));await e.page.waitForFunction(()=>document.querySelector('[data-dcuf-surface="list-toolbar"]')?.dataset.dcufScroll==='top');await primary.evaluate(n=>n.blur());
   }
   assert.ok(await e.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow');
   await onCapture?.(e,state);assertNoRuntimeErrors(await getMetrics(e.page),e.consoleErrors);records.push({state,contrast:contrast.min});
  }finally{await e.close()}
 }
 return records;
}

export async function runListV7PaletteContract({browser,server}){
 const records=[];
 for(const dark of[false,true]){
  const e=await createTestPage(browser,server.baseUrl,{viewport:{width:980,height:900},storage:{[storageKeys.threshold]:0,[storageKeys.palette]:'teal'}});
  try{
   await mountB1NativeFixture(e,server.baseUrl,{dark});const signatures=[];
   const read=()=>e.page.evaluate(()=>{const p=document.querySelector('[data-dcuf-surface="list-toolbar"] [data-dcuf-role="primary-action"]'),t=document.querySelector('.array_tab [data-dcuf-state="current"]'),n=document.querySelector('[data-dcuf-surface="list-pagination"] [data-dcuf-role="page"][data-dcuf-state="current"]'),r=document.querySelector('.newvisit_history .btn_open'),face=(node,pseudo)=>{const s=getComputedStyle(node,pseudo);return s.backgroundColor+'|'+s.backgroundImage};return{primaryFace:face(p,'::after'),primaryInk:getComputedStyle(p).color,tabLine:getComputedStyle(t).borderBottomColor,tabInk:getComputedStyle(t).color,pageFace:face(n),pageInk:getComputedStyle(n).color,recentFace:face(r),recentInk:getComputedStyle(r).color}});
   const waitPaint=()=>e.page.locator(toolbar).evaluate(async n=>Promise.all(n.getAnimations({subtree:true}).filter(a=>Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{}))));
   for(const id of['blue','purple','green','orange','mono','indigo','sky','cyan','teal','lime','amber','red','rose','pink']){
    await e.page.evaluate(()=>window.__dcufTestbedGM.invokeMenu('UI 색상 설정'));const panel=e.page.locator('#dcuf-palette-panel');await panel.locator(`[data-palette-id="${id}"]`).click();await waitPaint();const preview=await read();await panel.locator('[data-dcuf-palette-action="save"]').click();await panel.waitFor({state:'detached'});
    const signature=await read();assert.deepEqual(signature,preview,'List/header preview and saved accent roles match');signatures.push(signature);
    const contrast=await renderedLabelContrast(e.page,toolbar+' [data-dcuf-role="primary-action"]');assert.ok(contrast.min>=4.5,`${id}/${dark} contrast ${contrast.min}`);
    const pageContrast=await renderedLabelContrast(e.page,'[data-dcuf-surface="list-pagination"] [data-dcuf-role="page"][data-dcuf-state="current"]');assert.ok(pageContrast.min>=4.5,`${id}/${dark} current page contrast ${pageContrast.min}`);
    await e.page.evaluate(()=>scrollTo(0,0));await e.page.locator(toolbar+' [data-dcuf-role="primary-action"]').first().waitFor({state:'visible'});
   }
   for(const key of ['primaryFace','primaryInk','tabLine','tabInk','pageFace','pageInk','recentFace','recentInk'])assert.equal(new Set(signatures.map(s=>s[key])).size,14,key+' follows all palettes');
   const committed=await read();await e.page.evaluate(()=>window.__dcufTestbedGM.invokeMenu('UI 색상 설정'));const panel=e.page.locator('#dcuf-palette-panel');await panel.locator('[data-palette-id="blue"]').click();await waitPaint();assert.notDeepEqual(await read(),committed);await panel.locator('[data-dcuf-palette-action="cancel"]').click();await panel.waitFor({state:'detached'});await waitPaint();assert.deepEqual(await read(),committed,'Cancel restores every list/header accent role');
   assertNoRuntimeErrors(await getMetrics(e.page),e.consoleErrors);records.push({dark,palettes:14});
  }finally{await e.close()}
 }
 return records;
}
