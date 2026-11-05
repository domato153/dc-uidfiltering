import assert from 'node:assert/strict';
import {createTestPage,storageKeys,getMetrics,assertNoRuntimeErrors} from './harness/runner-utils.mjs';

const settle=p=>p.evaluate(async()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));
export async function runPcMaterialPortContract({browser,server}) {
 const records=[];
 for(const dark of [false,true]){
  const e=await createTestPage(browser,server.baseUrl,{viewport:{width:1280,height:900},hasTouch:false,isMobile:false,storage:{[storageKeys.threshold]:0,[storageKeys.palette]:'teal',[storageKeys.personalEnabled]:true,[storageKeys.personalList]:{uids:[{id:'synthetic-pc-author',name:'합성 PC 작성자'}],nicknames:['합성 닉네임'],ips:['203.0.113.5']}}}),p=e.page;
  try{
   await e.goto('/mgallery/board/lists?id=test');
   if(dark)await p.evaluate(()=>__dcufFixture.toggleDark(true));
   await p.evaluate(()=>document.getElementById('dcuf-testbed-controls')?.remove());
   const host=()=>p.locator('.dcheader,.page_head,.gall_list').evaluateAll(ns=>ns.map(n=>{const s=getComputedStyle(n),r=n.getBoundingClientRect();return{className:n.className,rect:r.toJSON(),color:s.color,background:s.backgroundColor,image:s.backgroundImage,filter:s.backdropFilter}}));
   const originalHost=await host();assert.ok(originalHost.length>=2);
   await p.evaluate(()=>__dcufTestbedGM.invokeMenu('차단 유저 관리'));const panel=p.locator('#dc-block-management-panel');await panel.waitFor({state:'visible'});await settle(p);
   assert.ok(await panel.evaluate(n=>getComputedStyle(n).getPropertyValue('--dcuf-v7-primary-bg').trim()),'PC must load the existing adopted Mobile material factory');
   const primary=()=>panel.locator('.panel-save-btn').evaluate(n=>{const read=x=>{const s=getComputedStyle(x);return[s.backgroundColor,s.backgroundImage,s.color,s.borderTopColor,s.boxShadow]},probe=document.createElement('div');probe.style.cssText='background:var(--dcuf-v7-primary-bg);color:var(--dcuf-v7-primary-ink);border:1px solid var(--dcuf-v7-primary-rim);box-shadow:var(--dcuf-v7-primary-shadow)';n.parentElement.append(probe);const out={actual:read(n),adopted:read(probe)};probe.remove();return out;});
   let paint=await primary();assert.deepEqual(paint.actual,paint.adopted,'PC uses exact existing memo/v7 primary material');
   assert.match(await panel.evaluate(n=>getComputedStyle(n).backdropFilter),/blur/);
   const savedData=await p.evaluate(()=>__dcufTestbedGM.snapshot().values),faces=[];
   for(const id of ['blue','purple','green','orange','mono','indigo','sky','cyan','teal','lime','amber','red','rose','pink']){
    await p.evaluate(()=>__dcufTestbedGM.invokeMenu('UI 색상 설정'));const palette=p.locator('#dcuf-palette-panel');await palette.locator('[data-palette-id="'+id+'"]').click();await settle(p);paint=await primary();assert.deepEqual(paint.actual,paint.adopted);faces.push(paint.actual.join('|'));await palette.locator('[data-dcuf-palette-action="cancel"]').click();await palette.waitFor({state:'detached'});await settle(p);
   }
   assert.equal(new Set(faces).size,14,'All existing palette previews reach PC material');
   assert.deepEqual(await host(),originalHost,'Palette and owned UI cannot restyle/reflow the native PC page');
   assert.equal(await p.locator('.custom-mobile-list,[data-dcuf-header-layout]').count(),0,'No Mobile host UI port');
   assert.deepEqual(await p.evaluate(()=>__dcufTestbedGM.snapshot().values),savedData,'Preview/cancel preserves persisted settings and block data');
   await panel.locator('.panel-backup-btn').click();const backup=p.locator('#dc-backup-popup');await backup.waitFor({state:'visible'});await settle(p);assert.match(await backup.evaluate(n=>getComputedStyle(n).backdropFilter),/blur/);await backup.locator('.popup-close-btn').click();await backup.waitFor({state:'detached'});
   await panel.locator('.panel-close-btn').click();await panel.waitFor({state:'detached'});assertNoRuntimeErrors(await getMetrics(p),e.consoleErrors);records.push({dark,palettes:faces.length});
  }finally{await e.close()}
 }
 return records;
}
