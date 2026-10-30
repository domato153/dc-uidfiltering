import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createTestPage,storageKeys,getMetrics,assertNoRuntimeErrors} from './harness/runner-utils.mjs';
import {writerV7Html} from './fixtures/b1-write-v7.mjs';
import {renderedLabelContrast} from './ui-control-material-contract.mjs';
const R=role=>'[data-dcuf-native-form-role="'+role+'"][data-dcuf-native-form-state="write-editor"]';
const settle=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
export async function mountWriterV7(browser,server,s) {
 const e=await createTestPage(browser,server.baseUrl,{viewport:{width:s.width,height:s.height},storage:{[storageKeys.threshold]:0,[storageKeys.palette]:'teal'}});
 const route=s.modify?'/board/modify/':'/mgallery/board/write/';
 await e.page.route(u=>u.origin===server.baseUrl&&u.pathname===route,r=>r.fulfill({contentType:'text/html',body:writerV7Html({variant:s.minor?'minor':'major',formMode:s.modify?'modify':'write'})}));
 await e.goto(route+'?id=test&no=1001');await e.page.waitForFunction(()=>document.body.getAttribute('data-dcuf-native-form-state')==='write-editor');
 if(s.dark)await e.page.evaluate(()=>{const marker=document.createElement('style');marker.id='css-darkmode';marker.textContent='html{color-scheme:dark}';document.head.append(marker);document.body.classList.add('dc-filter-dark-mode');document.documentElement.classList.add('darkmode')});
 return e;
}
const hit=async l=>{await l.scrollIntoViewIfNeeded({timeout:2500});return l.evaluate(n=>{const b=n.getBoundingClientRect(),t=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return b.width>0&&b.height>0&&(n===t||n.contains(t))})};
export async function runWriterV7Contract({browser,server}) {
 const records=[];
 for(const s of [{width:1440,height:1100},{width:980,height:2306,minor:true},{width:980,height:900,minor:true,dark:true},{width:980,height:900,modify:true},{width:390,height:700,dark:true}]) {
  const e=await mountWriterV7(browser,server,s),p=e.page;
  try {
   const primary=p.locator(R('outer-action-primary'));
   const ink=await p.evaluate(()=>{const probe=document.createElement('span');probe.style.color='var(--dcuf-v7-primary-ink)';document.body.append(probe);const ink=getComputedStyle(probe).color;probe.remove();return ink});
   assert.equal(await primary.evaluate(n=>getComputedStyle(n).color),ink,'Writer primary uses actual memo v7 ink rather than retired white-on-dense face');
   await p.locator(R('nickname-use')).waitFor({state:'attached'});
   assert.equal(await p.locator('#btn_gall_nick_name_x').evaluate(n=>getComputedStyle(n,'::before').backgroundImage),'none','Native sprite must not overlap the single clear glyph');
   assert.equal(await p.locator('#tip_nomem_nick').evaluate(n=>parseFloat(getComputedStyle(n,'::after').borderTopWidth)),0,'Native green border arrow is removed');
   assert.equal(await p.locator('#password').getAttribute('placeholder'),'비밀번호','Image-backed empty native password label has a readable hint');
   const box=await primary.boundingBox();assert.ok(box.width>=100&&box.width<=140&&box.height>=40&&box.height<=50,'Primary is a compact memo-family action');
   assert.ok((await renderedLabelContrast(p,R('outer-action-primary'))).min>=4.5,'Actual primary label contrast');
   const before=await p.locator('form#write,form[name=modify]').evaluate(f=>({action:f.action,method:f.method,hidden:[...f.querySelectorAll('input[type=hidden]')].map(n=>[n.name,n.value])}));
   const checkNick=async expected=>{await settle(p);const n=p.locator(expected==='recommended'?'#gall_nick_name':'#name');assert.ok(await hit(n));assert.equal(await p.locator('#gall_nick_name').getAttribute('readonly'),'');assert.ok(await hit(p.locator(expected==='recommended'?'#btn_gall_nick_name_x':'#btn_gall_nick_name_y')))};
   await checkNick('recommended');await p.locator('#btn_gall_nick_name_x').click();await checkNick('direct');
   assert.equal(await p.locator('#name').evaluate(n=>n.parentElement.classList.contains('nomem_nick')),false);
   await p.locator('#name').fill('직접 입력한 닉네임');
   const reserve=await p.locator('#name').evaluate(n=>({padding:parseFloat(getComputedStyle(n).paddingRight),button:n.parentElement.querySelector('#btn_gall_nick_name_y').getBoundingClientRect().width}));assert.ok(reserve.padding>=reserve.button,'Typing reserves native use-Y area');
   await p.locator('#btn_gall_nick_name_y').click();await checkNick('recommended');assert.equal(await p.locator('#gall_nick_name').inputValue(),'합성 갤닉');
   assert.deepEqual(await p.evaluate(()=>__v7NickCalls),['N','Y']);
   const tip=p.locator(R('nickname-help'));assert.ok(await hit(p.locator(R('nickname-help-close'))));
   assert.equal(await p.locator(R('nickname-help-content')).evaluate(n=>getComputedStyle(n).padding),'0px','Native important inner padding is cleared once by the contextual owner');
   assert.equal(await p.locator('#subject').evaluate(n=>getComputedStyle(n).paddingRight),'12px','Nickname action reserve does not leak to other fields');
   const tb=await tip.boundingBox(),nb=await p.locator('#gall_nick_name').boundingBox();assert.ok(tb.y+tb.height<=nb.y+1,'Help does not cover native field');
   await p.locator(R('nickname-help-close')).click();assert.equal(await tip.isVisible(),false);await p.waitForFunction(()=>getComputedStyle(document.querySelector('[data-dcuf-native-form-role="fields"]')).paddingTop==='0px',null,{timeout:2500});
   const toolbar=p.locator('.note-toolbar').first(),rows=await toolbar.evaluate(n=>{const ns=[...n.querySelectorAll(':scope > .note-mybutton button')],font=n.querySelector('.note-fontname button');return{media:ns.map(n=>n.getBoundingClientRect().toJSON()),font:font.getBoundingClientRect().toJSON(),frame:getComputedStyle(n).backdropFilter}});
   if(s.width>=980)assert.ok(rows.font.y>=Math.max(...rows.media.map(r=>r.bottom)),'Native media and format are separate rows');
   assert.equal(rows.frame,'none','Fixed native menus have no new filtered ancestor');
   const ordinary=p.locator(R('editor-toolbar-control')).filter({visible:true}).first();assert.equal(await ordinary.evaluate(n=>getComputedStyle(n).boxShadow),'none','Small tools are unboxed at rest');
   await p.keyboard.press('Tab');await ordinary.focus();
   assert.equal(await ordinary.evaluate(n=>getComputedStyle(n).outlineStyle),'solid','Keyboard focus remains visible without an important override');
   assert.equal(await ordinary.evaluate(n=>getComputedStyle(n).outlineWidth),'2px');
   assert.ok(await p.locator(R('write-notice')).isVisible(),'Original warning/help copy retained');
   if(s.minor){assert.ok(await p.locator('#code').isVisible());assert.ok(await p.locator(R('headtext-shell')).isVisible());assert.equal(await p.locator('[data-dcuf-native-form-option-state="selected"]').first().evaluate(n=>getComputedStyle(n).borderBottomWidth),'2px','Selected headtext underline survives the normal cascade')}
   await p.locator('#subject').fill('작성 중 제목');await p.locator('.note-editable').fill('작성 중 본문');await p.locator('.note-editable').press('End');await p.locator('.note-editable').press('!');
   const font=p.locator('.note-fontname [data-command=font]');await font.click();
   // This fixture has no Summernote opener. Match the established menu contract:
   // expose its native layer explicitly,then use trusted input on real options.
   await p.evaluate(()=>{document.querySelector('.fixture-fontname-layer').style.removeProperty('display');__dcufFixture.toggleWriteLayer('fontname',true)});
   const menu=p.locator('[data-dcuf-native-form-layer-kind="dropdown"][data-dcuf-native-form-layer-anchor="fontname"]');await menu.waitFor({state:'visible',timeout:2500});assert.ok(await hit(menu.locator('a,button').filter({visible:true}).first()));
   await p.evaluate(()=>__dcufFixture.toggleWriteLayer('fontname',false));
   assert.equal(await p.locator('#subject').inputValue(),'작성 중 제목');assert.match(await p.locator('.note-editable').innerText(),/작성 중 본문!/);
   assert.ok(await hit(primary));assert.ok(await hit(p.locator(R('outer-action-secondary'))));
   const preserved=await p.evaluate(()=>__v7NativeOriginals.every(({node,parent,onclick,name})=>node.isConnected&&node.parentNode===parent&&node.getAttribute('onclick')===onclick&&node.getAttribute('name')===name));assert.equal(preserved,true,'Original native nodes/parents/names/inline callbacks retained');
   const after=await p.locator('form#write,form[name=modify]').evaluate(f=>({action:f.action,method:f.method,hidden:[...f.querySelectorAll('input[type=hidden]')].map(n=>[n.name,n.value])}));assert.deepEqual(after,before);
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=1);
   if(process.env.DCUF_WRITE_V7_CAPTURE_DIR){await fs.mkdir(process.env.DCUF_WRITE_V7_CAPTURE_DIR,{recursive:true});await p.keyboard.press('Escape');await p.evaluate(()=>window.scrollTo(0,0));await p.mouse.move(0,0);await p.screenshot({path:process.env.DCUF_WRITE_V7_CAPTURE_DIR+'/'+s.width+'-'+s.height+(s.minor?'-minor':s.modify?'-modify':'-major')+(s.dark?'-dark':'-light')+'.png',animations:'disabled'})}
   assertNoRuntimeErrors(await getMetrics(p),e.consoleErrors);records.push(s);
   assert.equal(await p.evaluate(()=>document.body.classList.contains('dc-filter-dark-mode')),Boolean(s.dark),'Observed theme must match the tested state');
  }finally{await e.close()}
 }
 return{contexts:records.length,records};
}
export async function runWriterV7PaletteContract({browser,server}) {
 const records=[];
 for(const dark of[false,true]) {
  const e=await mountWriterV7(browser,server,{width:980,height:900,minor:true,dark}),p=e.page;
  try{
   await p.locator('#btn_gall_nick_name_x').click();
   const read=()=>p.evaluate(()=>{const s=q=>getComputedStyle(document.querySelector(q)),primary=s('[data-dcuf-native-form-role="outer-action-primary"]'),use=s('#btn_gall_nick_name_y'),tip=s('#tip_nomem_nick'),selected=s('[data-dcuf-native-form-option-state="selected"]');return{primary:primary.backgroundColor+'|'+primary.backgroundImage,ink:primary.color,rim:primary.borderTopColor,use:use.color,tip:tip.borderTopColor,selected:selected.color}});
   const waitPaint=()=>p.locator(R('outer-action-primary')).evaluate(async n=>{await Promise.all(n.getAnimations().map(a=>a.finished.catch(()=>{})))});
   const signatures=[];
   for(const id of['blue','purple','green','orange','mono','indigo','sky','cyan','teal','lime','amber','red','rose','pink']){
    await p.evaluate(()=>__dcufTestbedGM.invokeMenu('UI 색상 설정'));const panel=p.locator('#dcuf-palette-panel');await panel.locator('[data-palette-id="'+id+'"]').click();await waitPaint();const preview=await read();await panel.locator('[data-dcuf-palette-action=save]').click();await panel.waitFor({state:'detached'});await waitPaint();assert.deepEqual(await read(),preview);signatures.push(preview);
   }
   for(const key of Object.keys(signatures[0]))assert.equal(new Set(signatures.map(s=>s[key])).size,14,key+' follows14 palettes');
   const committed=await read();await p.evaluate(()=>__dcufTestbedGM.invokeMenu('UI 색상 설정'));const panel=p.locator('#dcuf-palette-panel');await panel.locator('[data-palette-id=blue]').click();await waitPaint();assert.notDeepEqual(await read(),committed);await panel.locator('[data-dcuf-palette-action=cancel]').click();await panel.waitFor({state:'detached'});await waitPaint();assert.deepEqual(await read(),committed);
   records.push({dark,palettes:14});assertNoRuntimeErrors(await getMetrics(p),e.consoleErrors);
   assert.equal(await p.evaluate(()=>document.body.classList.contains('dc-filter-dark-mode')),dark,'Palette preview/save/cancel must preserve the tested theme');
  }finally{await e.close()}
 }
 return{records};
}
