import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createTestPage,storageKeys,getMetrics,assertNoRuntimeErrors} from './harness/runner-utils.mjs';
import {mountB1NativeFixture} from './fixtures/b1-native-list.mjs';
const root='#dc-block-management-panel';
export async function mountManagementV7(browser,server,{width=980,height=900,dark=false}={}) {
 const session=await createTestPage(browser,server.baseUrl,{viewport:{width,height},storage:{[storageKeys.threshold]:0,[storageKeys.palette]:'teal',[storageKeys.personalEnabled]:true,[storageKeys.personalList]:{uids:[{id:'synthetic-a',name:'합성 작성자 A'},{id:'synthetic-b',name:'긴 표시 이름을 사용하는 합성 작성자 B'},{id:'synthetic-c',name:'합성 작성자 C'}],nicknames:['합성 닉네임 A','합성 닉네임 B'],ips:['203.0.113.9']}}});
 await mountB1NativeFixture(session,server.baseUrl,{dark});await session.page.evaluate(()=>__dcufTestbedGM.invokeMenu('차단 유저 관리'));
 await session.page.locator(root).waitFor({state:'visible'});await settle(session.page);
 return session;
}
async function settle(page){await page.locator(root).evaluate(async n=>{await Promise.all(n.getAnimations({subtree:true}).filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})))});}
const hit=async locator=>{await locator.scrollIntoViewIfNeeded();return locator.evaluate(n=>{const r=n.getBoundingClientRect(),t=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.width>0&&r.height>0&&(n===t||n.contains(t))})};
export async function runManagementV7Contract({browser,server}) {
 const records=[];
 for(const spec of [{width:980,height:900},{width:980,height:900,dark:true},{width:980,height:2306},{width:390,height:700,dark:true},{width:980,height:420}]) {
  const e=await mountManagementV7(browser,server,spec),p=e.page,panel=p.locator(root);
  try {
   const saved=await p.evaluate(()=>__dcufTestbedGM.snapshot().values);
   const paint=await panel.evaluate(n=>{
    const button=n.querySelector('.panel-save-btn'),s=getComputedStyle(button),probe=document.createElement('div');probe.style.cssText='background:var(--dcuf-v7-primary-bg);color:var(--dcuf-v7-primary-ink);border:1px solid var(--dcuf-v7-primary-rim);box-shadow:var(--dcuf-v7-primary-shadow)';n.append(probe);const t=getComputedStyle(probe);
    const out={actual:[s.backgroundColor,s.backgroundImage,s.color,s.borderTopColor,s.boxShadow],memo:[t.backgroundColor,t.backgroundImage,t.color,t.borderTopColor,t.boxShadow]};probe.remove();return out;
   });assert.deepEqual(paint.actual,paint.memo,'Management primary must consume exact adopted memo material');
   const geometry=await panel.boundingBox();assert.ok(geometry.x>=8&&geometry.y>=8&&geometry.x+geometry.width<=spec.width-8&&geometry.y+geometry.height<=spec.height-8);
   if(spec.width>=980)assert.equal(Math.round(geometry.width),720,'The real default geometry follows the presentation value,not retired inline400px');
   const ordinary=await panel.locator('.panel-add-btn,.select-all-btn,.select-all-global-btn,.panel-backup-btn,.delete-item-btn').evaluateAll(ns=>ns.map(n=>{const s=getComputedStyle(n);return{background:s.backgroundColor,image:s.backgroundImage,shadow:s.boxShadow}}));for(const s of ordinary){assert.equal(s.background,'rgba(0, 0, 0, 0)');assert.equal(s.image,'none');assert.equal(s.shadow,'none')}
   assert.equal(await panel.locator('.panel-tab.active').evaluate(n=>getComputedStyle(n).backgroundColor),'rgba(0, 0, 0, 0)');
   assert.notEqual(await panel.locator('.panel-tab.active').evaluate(n=>getComputedStyle(n).boxShadow),'none','Active text tab keeps its underline');
   assert.equal(await panel.locator('.blocked-item').first().evaluate(n=>getComputedStyle(n).backgroundColor),'rgba(0, 0, 0, 0)');
   if(spec.width>=980&&spec.height>=900){const list=await panel.locator('.panel-content').boundingBox();for(const row of await panel.locator('.blocked-item').all()){const r=await row.boundingBox();assert.ok(r.y>=list.y&&r.y+r.height<=list.y+list.height,'Three sample rows fit without hiding the last item')}}
   for(const selector of ['.panel-close-btn','.panel-save-btn','.panel-search-input','.panel-backup-btn'])assert.ok(await hit(panel.locator(selector)),selector+' is reachable');
   const saveBox=await panel.locator('.panel-save-btn').boundingBox(),resizeBox=await panel.locator('.panel-resize-handle').boundingBox();assert.ok(saveBox.x+saveBox.width<=resizeBox.x||saveBox.y+saveBox.height<=resizeBox.y||resizeBox.y+resizeBox.height<=saveBox.y,'Resize handle does not paint over the primary action');assert.ok(await hit(panel.locator('.panel-resize-handle')));
   await p.keyboard.press('Tab');await panel.locator('.panel-save-btn').focus();assert.equal(await panel.locator('.panel-save-btn').evaluate(n=>getComputedStyle(n).outlineStyle),'solid');
   await panel.locator('.delete-item-btn').first().click();assert.equal(await panel.locator('.item-to-delete').count(),1);await panel.locator('.panel-search-input').fill('없는 합성 이름');assert.equal(await panel.locator('.blocked-list-empty').innerText(),'검색 결과가 없습니다.');await panel.locator('.panel-search-input').fill('');assert.equal(await panel.locator('.item-to-delete').count(),1);
   await panel.locator('.panel-backup-btn').click();const backup=p.locator('#dc-backup-popup');await backup.waitFor({state:'visible'});assert.ok(await hit(backup.locator('.popup-close-btn')));await backup.locator('.popup-close-btn').click();await backup.waitFor({state:'detached'});assert.equal(await panel.locator('.item-to-delete').count(),1);
   assert.equal(await panel.evaluate(n=>n.scrollWidth-n.clientWidth),0);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
   if(process.env.DCUF_MANAGEMENT_V7_CAPTURE_DIR){await fs.mkdir(process.env.DCUF_MANAGEMENT_V7_CAPTURE_DIR,{recursive:true});await panel.locator('.delete-item-btn').first().click();await p.mouse.move(0,0);await p.screenshot({path:process.env.DCUF_MANAGEMENT_V7_CAPTURE_DIR+'/'+spec.width+'-'+spec.height+(spec.dark?'-dark':'-light')+'.png',animations:'disabled'})}
   await panel.locator('.panel-close-btn').click();await panel.waitFor({state:'detached'});assert.deepEqual(await p.evaluate(()=>__dcufTestbedGM.snapshot().values),saved,'Inspection/unsaved selection/close preserve original persisted data');
   assertNoRuntimeErrors(await getMetrics(p),e.consoleErrors);records.push(spec);
  }finally{await e.close()}
 }
 return{contexts:records.length,records};
}
export async function runManagementV7PaletteContract({browser,server}) {
 const records=[];
 for(const dark of [false,true]){
  const e=await mountManagementV7(browser,server,{dark}),p=e.page;
  try {
   const read=()=>p.locator(root).evaluate(n=>{const primary=getComputedStyle(n.querySelector('.panel-save-btn')),tab=getComputedStyle(n.querySelector('.panel-tab.active')),add=getComputedStyle(n.querySelector('.panel-add-btn'));return{face:primary.backgroundColor+'|'+primary.backgroundImage,ink:primary.color,rim:primary.borderTopColor,tab:tab.color,underline:tab.boxShadow,add:add.color}});
   const signatures=[];
   for(const id of ['blue','purple','green','orange','mono','indigo','sky','cyan','teal','lime','amber','red','rose','pink']){
    await p.evaluate(()=>__dcufTestbedGM.invokeMenu('UI 색상 설정'));const palette=p.locator('#dcuf-palette-panel');await palette.locator('[data-palette-id="'+id+'"]').click();await settle(p);const preview=await read();await palette.locator('[data-dcuf-palette-action=save]').click();await palette.waitFor({state:'detached'});await settle(p);assert.deepEqual(await read(),preview);signatures.push(preview);
   }
   for(const key of Object.keys(signatures[0]))assert.equal(new Set(signatures.map(x=>x[key])).size,14,key+' follows14 palettes');
   const saved=await read();await p.evaluate(()=>__dcufTestbedGM.invokeMenu('UI 색상 설정'));const palette=p.locator('#dcuf-palette-panel');await palette.locator('[data-palette-id=blue]').click();await settle(p);assert.notDeepEqual(await read(),saved);await palette.locator('[data-dcuf-palette-action=cancel]').click();await palette.waitFor({state:'detached'});await settle(p);assert.deepEqual(await read(),saved);assertNoRuntimeErrors(await getMetrics(p),e.consoleErrors);records.push({dark,palettes:14});
  }finally{await e.close()}
 }
 return{records};
}
