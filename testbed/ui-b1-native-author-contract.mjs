import assert from 'node:assert/strict';
import {createTestPage,storageKeys} from './harness/runner-utils.mjs';
import {mountNativeAuthorFixture,nativeMemoMarkup} from './fixtures/b1-native-author.mjs';

export async function createAuthorState(browser,server,{dark=false,viewport={width:980,height:2306},path='/board/lists?id=test',location='list'}={}) {
 const e=await createTestPage(browser,server.baseUrl,{viewport,screen:{width:412,height:1006},hasTouch:true,deviceScaleFactor:1,storage:{[storageKeys.threshold]:0,[storageKeys.palette]:'teal',[storageKeys.personalEnabled]:false}});
 await e.goto(path);await e.page.evaluate(mountNativeAuthorFixture,nativeMemoMarkup);
 if(location!=='list')await e.page.evaluate(location=>{const target=location==='article'?document.querySelector('.gallview_head'):location==='image'?document.querySelector('.view_comment.image_comment .cmt_info'):document.querySelector('#focus_cmt .cmt_info');if(!target)throw Error('Missing native fixture context '+location);const old=target.querySelector('.gall_writer,.ub-writer');if(old)old.replaceWith(window.__authorFixture.writer);else target.append(window.__authorFixture.writer);},location);
 if(dark)await e.page.evaluate(()=>window.__dcufFixture.toggleDark(true));
 return e;
}

export async function authorGeometry(page,selector) {
 return page.locator(selector).first().evaluate(n=>{const r=n.getBoundingClientRect(),c=getComputedStyle(n);return{box:{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom},filter:c.backdropFilter,controls:[...n.querySelectorAll('button,input:not([type="hidden"]),a')].filter(e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0}).map(e=>{const b=e.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return{id:e.id,width:b.width,height:b.height,hit:!!hit&&(hit===e||e.contains(hit))};})};});
}

export async function runNativeAuthorContract({browser,server,control=false,onCapture}) {
 const states=control?[{}]:[{}, {dark:true}, {viewport:{width:390,height:560}}, {dark:true,viewport:{width:390,height:560}}, {viewport:{width:1440,height:900}}, {path:'/board/view?id=test&no=9001',location:'article'}, {path:'/board/view?id=test&no=9001',location:'comment'}, {path:'/board/view?id=test&no=9001',location:'comment',dark:true}, {path:'/board/view?id=test&no=9001',location:'image',dark:true}];
 const reports=[];
 for(const state of states){console.log('Native author state '+JSON.stringify(state));const e=await createAuthorState(browser,server,state);try{
   const legacy=e.page.locator('#user_data_lyr');
   if(await legacy.count())assert.equal(await legacy.evaluate(n=>getComputedStyle(n).display),'none','Legacy closed state has no inline display dependency');
   await e.page.locator('.nickname em').filter({visible:true}).filter({hasText:'합성 이용자'}).click();
   if(!control)await e.page.locator('.dcuf-native-author-menu').filter({visible:true}).first().waitFor();
   if(await legacy.count()){
     assert.ok(await legacy.evaluate(n=>n.classList.contains('dcuf-native-author-anchor')),'Hidden legacy layer is actually projected,not omitted from the check');
     assert.equal(await legacy.evaluate(n=>getComputedStyle(n).display),'none','Semantic projection never opens a retained legacy layer');
   }
   const menu=await authorGeometry(e.page,'.user_data.add .user_data_list');
   assert.equal(menu.box.width,224,'Native three-class host rule cannot replace the chosen menu width');
   assert.ok(menu.box.x>=0&&menu.box.right<=(state.viewport?.width||980),'Actual UL must fit viewport,not just its0×0 native anchor');
   assert.ok(menu.controls.every(c=>c.hit),'Every menu action must remain above following rows');
   assert.ok(await e.page.locator('.user_data.add .user_data_list > li > a').evaluateAll(ns=>ns.every(n=>{const a=n.getBoundingClientRect(),p=n.parentElement.getBoundingClientRect();return a.y>=p.y-1&&a.bottom<=p.bottom+1;})),'Original25px rows cannot overlap the38px chosen actions');
   assert.match(menu.filter,/blur\(/,'Menu uses the same B1 shell,not old opaque paint');
   await onCapture?.(e,'menu',state);
   await e.page.locator('.user_data.add').getByText('이용자 메모',{exact:true}).click();
   await e.page.locator('.dcuf-native-memo').waitFor();
   const memo=e.page.locator('#user_memo_config');await e.page.evaluate(()=>window.__authorFixture.remember());
   const bounds=await authorGeometry(e.page,'#user_memo_config');
   assert.ok(bounds.box.x>=0&&bounds.box.right<=(state.viewport?.width||980)+1,'Memo must escape metadata containing block');
   assert.match(bounds.filter,/blur\(/,'Memo consumes the B1 shell');
   await e.page.locator('#gall_memo').fill('합성 임시 메모');
   await e.page.locator('#gall_color').click();await e.page.locator('#um_picker_lay').waitFor({state:'visible'});
   const color=await authorGeometry(e.page,'#um_picker_lay');assert.ok(color.box.x>=-1&&color.box.right<=(state.viewport?.width||980)+1,'Nested native palette fits horizontally');
   assert.ok(color.box.y>=-1&&color.box.bottom<=(state.viewport?.height||2306)+1,'Nested palette and its close remain within vertical viewport');
   const close=e.page.locator('#um_picker_lay > .poply_bgblueclose');await close.click();await e.page.locator('#um_picker_lay').waitFor({state:'hidden'});
   await e.page.locator('#gall_color').click();await e.page.locator('#um_picker_lay').waitFor({state:'visible'});
   await e.page.locator('#um_picker_lay .btn_cancle').click();await e.page.locator('#um_picker_lay').waitFor({state:'hidden'});
   assert.equal(await e.page.locator('#gall_memo').inputValue(),'합성 임시 메모');
   assert.equal(await e.page.evaluate(()=>window.__authorFixture.preserved()),true,'Native fields/parents/handlers retain identity');
   await e.page.locator('#user_memo_config .icon_qmark_aaa').click();await e.page.locator('#user_memo_config .pop_tipbox').waitFor({state:'visible'});
   await e.page.locator('#user_memo_config .btn_tipclose').click();await e.page.locator('#user_memo_config .pop_tipbox').waitFor({state:'hidden'});
   await e.page.locator('#user_memo_config .btn_toggle15').click();assert.equal(await e.page.locator('#chk_color_toggle').evaluate(n=>n.classList.contains('hide')),false);
   const toggle=await e.page.locator('#user_memo_config .btn_toggle15').boundingBox();assert.ok(toggle.width>=24&&toggle.height>=24,'Bulk-color trigger never collapses into a line');
   await e.page.locator('#user_memo_config .btn_toggle15').click();assert.equal(await e.page.locator('#chk_color_toggle').evaluate(n=>n.classList.contains('hide')),true);
   const before=await e.page.evaluate(()=>window.__authorFixture.counts.forwarded);
   await e.page.locator('#all_color').click();await e.page.locator('#um_picker_lay .btn_cancle').click();
   assert.equal(await e.page.evaluate(()=>window.__authorFixture.counts.forwarded),before,'Nested tools never replay the author-entry proxy');
   await onCapture?.(e,'memo',state);
   await e.page.locator('#user_memo_config > .pop_content > .btn_box > .btn_grey').click();await memo.waitFor({state:'detached'});
   await e.page.mouse.click(4,4);assert.equal(await e.page.locator('.user_data.add').count(),0);
   await e.page.evaluate(()=>window.__authorFixture.openMenu());await e.page.locator('.dcuf-native-author-menu').filter({visible:true}).first().waitFor();
   await e.page.locator('.user_data.add').getByText('이용자 메모',{exact:true}).click();await e.page.locator('.dcuf-native-memo').waitFor();
   assert.equal(await e.page.locator('#gall_memo').inputValue(),'','Close/reopen has native unsaved semantics');
   reports.push({state,menu:menu.box,memo:bounds.box,color:color.box,counts:await e.page.evaluate(()=>window.__authorFixture.counts)});
 }catch(error){console.log('Native author diagnostic '+JSON.stringify(await e.page.evaluate(()=>({postMain:window.__dcufPostMainFixesState,style:!!document.getElementById('dcuf-list-memo-popup-fix'),menus:[...document.querySelectorAll('.user_data_list')].map(n=>({class:n.className,display:getComputedStyle(n).display,width:n.getBoundingClientRect().width})),resources:window.__dcufDiagnostics?.snapshot?.().subscribers}))));throw error;}finally{await e.close();}}
 return reports;
}
