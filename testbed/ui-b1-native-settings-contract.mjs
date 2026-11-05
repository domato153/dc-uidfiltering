import assert from 'node:assert/strict';
import{createTestPage,storageKeys,assertNoRuntimeErrors,getMetrics}from'./harness/runner-utils.mjs';
import{nativeSettingsHtml,nativeSettingsHostCss,mountNativeSettingsFixture}from'./fixtures/b1-native-settings.mjs';

export async function createSettingsState(browser,server,{dark=false,viewport={width:980,height:900},path='/board/lists?id=test'}={}){
 const e=await createTestPage(browser,server.baseUrl,{viewport,storage:{[storageKeys.threshold]:0,[storageKeys.palette]:'teal'}});await e.goto(path);await e.page.addStyleTag({content:'#dcuf-testbed-controls{display:none}'});if(dark)await e.page.evaluate(()=>window.__dcufFixture.toggleDark(true));await e.page.evaluate(mountNativeSettingsFixture,{html:nativeSettingsHtml,css:nativeSettingsHostCss});return e;
}
export async function settingsGeometry(root){return root.evaluate(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,overflow:n.scrollWidth-n.clientWidth,transform:s.transform,filter:s.backdropFilter,glass:getComputedStyle(n,'::before').backdropFilter};});}
async function hit(locator){return locator.evaluate(n=>{const r=n.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.width>0&&r.height>0&&!!top&&(top===n||n.contains(top));});}

export async function runNativeSettingsContract({browser,server,onCapture}){
 const records=[];
 for(const state of[{},{dark:true},{viewport:{width:980,height:2306}},{dark:true,viewport:{width:390,height:560}},{path:'/board/view?id=test&no=9001'}]){
 const e=await createSettingsState(browser,server,state),v=state.viewport||{width:980,height:900};
 try{for(const kind of['memo','block','headtail','spoiler','trusted','auto']){
  const id=await e.page.evaluate(k=>window.__settingsFixture.open(k),kind),root=e.page.locator('#'+id);
  try{await e.page.waitForFunction(id=>document.getElementById(id)?.getAttribute('data-dcuf-gallery-page-head-role')?.startsWith('settings-popup-'),id,{timeout:1800});}catch(error){console.log('Settings projection diagnostic',JSON.stringify(await e.page.evaluate(id=>({id,root:document.getElementById(id)?.outerHTML.slice(0,350),head:document.querySelector('.page_head')?.outerHTML.slice(0,250),api:window.__dcufGalleryPageHeadHostAdapter?.snapshot?.(),post:window.__dcufPostMainFixesState}),id)),e.consoleErrors);throw error;}
  const g=await settingsGeometry(root);assert.ok(g.width>100&&g.height>24&&g.x>=-1&&g.y>=-1&&g.right<=v.width+1&&g.bottom<=v.height+1&&g.overflow<=1,kind+' bounds '+JSON.stringify(g));
  assert.match(g.glass,/blur\(/,'Separate glass plane is present');assert.equal(g.transform,'none','Main settings root must not trap native fixed children');assert.equal(g.filter,'none','Root remains outside a filtered containing block');
  const close=root.locator('[data-dcuf-gallery-page-head-role="settings-close"]').filter({visible:true}).first();assert.ok(await hit(close),kind+' close is reachable');const cb=await close.boundingBox();assert.ok(cb.width>=36&&cb.height>=36);
  const title=root.locator('[data-dcuf-gallery-page-head-role="settings-title"]').filter({visible:true}).first();assert.ok(await hit(title),kind+' title is visible');
  assert.equal(await root.evaluate(n=>getComputedStyle(n).borderTopWidth),'1px','Late host CSS cannot restore native thick blue rim');
  assert.ok(await root.locator('[data-dcuf-gallery-page-head-role="settings-toggle-group"]').evaluateAll(ns=>ns.every(n=>getComputedStyle(n).backgroundColor==='rgba(0, 0, 0, 0)')),'Native toggle groups keep transparent B1 backing');
  if(kind==='memo'){
   assert.equal(await root.evaluate(n=>n.classList.contains('dcuf-native-memo')),false,'Management composition does not inherit individual memo owner');
   await root.locator('#user_memo_list').fill('합성 임시 메모');await root.locator('#memo_color').click();const picker=root.locator('#um_picker_lay');await picker.waitFor({state:'visible'});const pg=await settingsGeometry(picker);assert.ok(pg.x>=-1&&pg.y>=-1&&pg.right<=v.width+1&&pg.bottom<=v.height+1,'Nested settings picker fits '+JSON.stringify(pg));assert.equal(await picker.evaluate(n=>n.classList.contains('dcuf-native-memo-picker')),false,'Settings picker belongs to settings family');await picker.locator('.btn_cancle').click();assert.equal(await root.locator('#user_memo_list').inputValue(),'합성 임시 메모');
   await root.locator('#btn_user_memo_backup').click();const backup=root.locator('#user_memo_backup');await backup.waitFor({state:'visible'});assert.ok(await hit(backup.locator('[data-dcuf-gallery-page-head-role="settings-close"]')));await backup.locator('[data-dcuf-gallery-page-head-role="settings-close"]').click();
   const sort=root.locator('.btn_tabbox.sort button');await sort.nth(1).click();const colors=await sort.evaluateAll(ns=>ns.map(n=>({on:n.classList.contains('on'),color:getComputedStyle(n).color,background:getComputedStyle(n).backgroundColor})));assert.equal(colors[1].on,true);assert.notEqual(colors[0].background,colors[1].background,'Memo sort selection keeps a distinct treatment');
  }
  const tabs=root.locator('[data-dcuf-gallery-page-head-role="settings-tab"]').filter({visible:true});if(await tabs.count()>1){const second=tabs.nth(1);await second.click();assert.equal(await second.evaluate(n=>n.classList.contains('on')),true);}
  const panes=await root.locator('.tabcontent').evaluateAll(ns=>ns.filter(n=>n.getClientRects().length).map(n=>({width:n.getBoundingClientRect().width,scroll:n.scrollWidth,client:n.clientWidth})));assert.ok(panes.every(p=>p.width<=g.width&&p.scroll<=p.client+1),kind+' visible native panes fit after tab selection '+JSON.stringify(panes));
  if(kind==='block'){
   assert.equal(await root.locator('.part_schbox .set_cont').evaluate(n=>getComputedStyle(n).position),'static','Gallery search stays in its original row flow after late native CSS');
   for(const control of await root.locator('.part_schbox .set_cont > input,.part_schbox .set_cont > button').all()){await control.scrollIntoViewIfNeeded();assert.ok(await hit(control),'Gallery search input/action has a positive unobstructed hit');const box=await control.boundingBox();assert.ok(box.x>=g.x&&box.x+box.width<=g.right+1,'Gallery search control fits the settings window');}
  }
  if(kind==='spoiler'){const toggle=root.locator('[data-dcuf-gallery-page-head-role="settings-switch"]').first(),before=await toggle.evaluate(n=>n.classList.contains('on'));await toggle.click();assert.notEqual(await toggle.evaluate(n=>n.classList.contains('on')),before);}
  if(kind==='headtail'){
   const swatch=root.locator('.sel_color').filter({visible:true}).first();await swatch.click();const picker=root.locator('#picker_lay');await picker.waitFor({state:'visible'});const pg=await settingsGeometry(picker);assert.ok(pg.x>=-1&&pg.y>=-1&&pg.right<=v.width+1&&pg.bottom<=v.height+1,'Head/tail palette fits');await picker.locator('.btn_cancle').click();
   await root.locator('#headTailSave').scrollIntoViewIfNeeded();assert.ok(await hit(root.locator('#headTailSave')),'Native save remains reachable without submitting');
  }
  if(kind==='auto'){
   assert.equal(await root.locator('#autozzal_image_file').getAttribute('type'),'file','Native upload input remains native and unselected');
   const notice=root.locator('#autozzal_img_notice_box');await notice.evaluate(n=>n.style.display='block');assert.ok(await hit(notice.locator('[data-dcuf-gallery-page-head-role="settings-close"]')));await notice.locator('[data-dcuf-gallery-page-head-role="settings-close"]').click();
   await root.locator('.btn_my_autozzal').filter({visible:true}).first().click();await root.locator('#autozzal_image_upload_form').waitFor({state:'visible'});assert.equal(await root.locator('#autozzal_image_file').evaluate(n=>n.files.length),0);assert.ok(await hit(root.locator('#autozzal_image_upload_form > [data-dcuf-gallery-page-head-role="settings-close"]')),'Image library close remains reachable');
  }
  assert.equal(await e.page.evaluate(()=>window.__settingsFixture.preserved()),true,'Original controls,parents and handlers stay intact');await onCapture?.(e,kind,state);
  await close.click();await root.waitFor({state:'detached'});records.push({kind,state,geometry:g});
 }
 assert.equal(await e.page.evaluate(()=>window.__settingsFixture.traces.some(t=>/save|writeSet|upload|save_conf/.test(t.action))),false,'No native save/upload callback is exercised');assertNoRuntimeErrors(await getMetrics(e.page),e.consoleErrors);
 }finally{await e.close();}}
 return records;
}
