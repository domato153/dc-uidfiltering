import assert from 'node:assert/strict';
import {createSettingsState,settingsGeometry} from './ui-b1-native-settings-contract.mjs';
import {assertNoRuntimeErrors,getMetrics} from './harness/runner-utils.mjs';
import {renderedLabelContrast} from './ui-control-material-contract.mjs';

// Row anatomy: public GET /ajax/user_memo_ajax/list, user_memo_row-tmpl,
// observed2026-10-29. Only illustrative names/memos; no stored user data.
export async function populateMemoRows(page){
 await page.evaluate(()=>{
  const list=document.querySelector('#user_memo_table .memo_list');
  list.innerHTML=['작성자 A','작성자 B','긴 식별 코드 작성자 C'].map((user,i)=>`<li><div class="btn-wrap"><button type="button" class="btn"><span class="checkbox"><input type="checkbox" id="chk_sample_${i}" name="memo_chk" class="chk_um_list" value="sample-${i}"><em class="checkmark"></em><label><span class="nik icon">${user}</span><span class="mone" style="color:${['#206d70','#506db5','#796021'][i]}">-${['자주 확인할 사용자','참고할 글이 많음','긴 메모도 목록 영역 안에서 자연스럽게 이어집니다. '.repeat(4)][i]}</span></label></span></button></div></li>`).join('');
  document.querySelector('.user_memo_count').textContent='3';
 });
}
const hit=async loc=>loc.evaluate(n=>{const r=n.getBoundingClientRect(),t=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.width>0&&r.height>0&&(t===n||n.contains(t));});
export async function runMemoWorkbenchContract({browser,server,onCapture}){
 const records=[];
 for(const state of[{},{dark:true},{viewport:{width:1536,height:1024}},{viewport:{width:980,height:2306}},{dark:true,viewport:{width:390,height:560}}]){
  const e=await createSettingsState(browser,server,state),v=state.viewport||{width:980,height:900};
  try{
   await e.page.evaluate(()=>window.__settingsFixture.open('memo'));
   await e.page.waitForFunction(()=>document.querySelector('#user_memo_config')?.dataset.dcufGalleryPageHeadRole==='settings-popup-memo');
   const root=e.page.locator('#user_memo_config'),g=await settingsGeometry(root);
   assert.ok(g.x>=0&&g.y>=0&&g.right<=v.width+1&&g.bottom<=v.height+1&&g.overflow<=1,'Contained memo window');
   assert.equal(await root.evaluate(n=>{const r=n.getBoundingClientRect();return !!document.elementFromPoint(r.right-20,r.bottom-20)?.closest('#user_memo_config')}),true,'The floating script menu cannot cover the memo window');
   assert.equal(g.transform,'none');assert.equal(g.filter,'none');assert.match(g.glass,/blur\(/);
   const input=root.locator('#user_memo_list'),list=root.locator('.memo_list');
   const a=await input.boundingBox(),b=await list.boundingBox();
   if(v.width>=760){assert.ok(g.width>=850,'Wide memo uses the selected workbench, not the incumbent478px column');assert.ok(b.x+b.width<a.x,'List is left of the editor');assert.ok(Math.abs(b.y-a.y)<140,'Reading/editing regions remain adjacent');assert.ok(a.height>=220,'Real multiline editing area');}
   assert.equal(await list.getByText('등록된 메모가 없습니다.').isVisible(),true);
   await populateMemoRows(e.page);
   await input.fill('합성 초안\n두 번째 줄');
   await root.locator('.tab_menubox button.all').click();assert.equal(await input.isVisible(),true,'Native memo scope changes data, not the composition pane');
   await root.locator('.tab_menubox button').nth(1).click();assert.equal(await root.locator('.tab_menubox button').nth(1).evaluate(n=>n.classList.contains('on')),true);
   await root.locator('.sort button').nth(1).click();assert.equal(await root.locator('.sort button').nth(1).evaluate(n=>n.classList.contains('on')),true);
   await root.locator('#chk_sample_0').check();
   for(const loc of[input,root.locator('#user_memo_search input'),root.locator('#user_memo_cont > .btn_box > button')]){
    await loc.scrollIntoViewIfNeeded();assert.ok(await hit(loc),'Visible native field/action is reachable');
    const box=await loc.boundingBox();assert.ok(box.x>=g.x&&box.x+box.width<=g.right+1,'Descendant remains horizontally contained');
   }
   const primary=root.locator('#user_memo_cont > .btn_box > button');
   assert.ok((await primary.boundingBox()).width<=150,'Primary is compact, not a full-width dark bar');
   const sortBox=await root.locator('.sort').boundingBox(),toolsBox=await root.locator('.copydel').boundingBox();
   assert.ok(sortBox.x+sortBox.width<=toolsBox.x||Math.abs(sortBox.y-toolsBox.y)>=30,'Sort and tools must not overlap');
   if(!state.viewport){
    const colors=[];
    for(const palette of['blue','purple','green','orange','mono','indigo','sky','cyan','teal','lime','amber','red','rose','pink']){
     await e.page.evaluate(id=>document.documentElement.setAttribute('data-dcuf-palette',id),palette);
     await primary.scrollIntoViewIfNeeded();await e.page.mouse.move(0,0);
     const contrast=await renderedLabelContrast(e.page,'#user_memo_cont > .btn_box > button');
     assert.ok(contrast.min>=4.5,`Primary ${palette}/${state.dark?'dark':'light'} contrast ${contrast.min}`);
     colors.push(await primary.evaluate(n=>getComputedStyle(n).backgroundColor+'|'+getComputedStyle(n).backgroundImage));
    }
    assert.equal(new Set(colors).size,14,'Every existing theme changes the actual primary material');
    await e.page.evaluate(()=>document.documentElement.setAttribute('data-dcuf-palette','teal'));
    await e.page.keyboard.press('Tab');await primary.focus();assert.notEqual(await primary.evaluate(n=>getComputedStyle(n).outlineStyle),'none','Visible keyboard focus');
   }
   for(const id of['memo_color','btn_user_memo_backup']){
    await root.locator('#'+id).click();const nested=root.locator(id==='memo_color'?'#um_picker_lay':'#user_memo_backup');await nested.waitFor({state:'visible'});
    const ng=await settingsGeometry(nested);assert.ok(ng.x>=0&&ng.right<=v.width+1&&ng.bottom<=v.height+1,'Nested dialog fits');
    const close=nested.locator('[data-dcuf-gallery-page-head-role="settings-close"],.btn_cancle').filter({visible:true}).first();assert.ok(await hit(close));await close.click();
   }
   assert.equal(await input.inputValue(),'합성 초안\n두 번째 줄');
   if(!state.viewport&&!state.dark){
    // Minimal duplicate-ID projection witness from public GET
    // /ajax/user_memo_ajax/modify (2026-10-29), not a child visual fixture.
    await root.locator('.memo_list').evaluate(n=>n.insertAdjacentHTML('afterend','<div id="user_memo_modify" class="pop_wrap type3" style="display:none"><div class="pop_content memo_sel"><div id="user_memo_setting" class="inner"><div id="um_gall_cont" class="set_cont"></div></div></div></div>'));
    await e.page.waitForFunction(()=>document.querySelector('#user_memo_modify > .pop_content')?.dataset.dcufGalleryPageHeadRole==='settings-panel');
    assert.equal(await root.locator('#user_memo_modify [data-dcuf-gallery-page-head-role^="settings-memo-"]').count(),0,'Nested row-edit duplicate IDs cannot inherit management layout roles');
    await root.locator('#user_memo_modify').evaluate(n=>n.remove());
   }
   assert.equal(await e.page.evaluate(()=>window.__settingsFixture.preserved()),true,'Original parents/callbacks preserved');
   assert.equal(await e.page.evaluate(()=>window.__settingsFixture.traces.some(t=>/writeSet|chkDel|chkCopy|save|upload/.test(t.action))),false,'No persistent action exercised');
   await e.page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   await onCapture?.(e,state);
   assertNoRuntimeErrors(await getMetrics(e.page),e.consoleErrors);records.push({state,geometry:g});
  }finally{await e.close()}
 }
 return records;
}
