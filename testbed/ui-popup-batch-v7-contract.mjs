import {mkdir,appendFile} from 'node:fs/promises';
import {assert,createTestPage,storageKeys,getMetrics,assertNoRuntimeErrors} from './harness/runner-utils.mjs';
import {mountB1NativeFixture} from './fixtures/b1-native-list.mjs';
import {gallerySearchHtml,gallerySearchHostCss} from './fixtures/b1-gallery-search.mjs';
import {mountGallerySearchFixture} from './fixtures/b1-gallery-search-mount.mjs';
import {articleActionHtml,articleActionHostCss,mountArticleActionFixture} from './fixtures/b1-article-actions.mjs';
import {mountB1ContentFixture} from './fixtures/b1-content.mjs';
import {writeHeaderHtml} from './fixtures/b1-form-header.mjs';

export const popupBatchSpecs=[{width:980,height:900},{width:980,height:900,dark:true},{width:390,height:520,dark:true},{width:390,height:420,dark:true},{width:980,height:420}];
export async function popupTheme(page,dark){await page.evaluate(dark=>{document.getElementById('css-darkmode')?.remove();if(dark){const s=document.createElement('style');s.id='css-darkmode';s.textContent='html{color-scheme:dark}';document.head.append(s)}document.body.classList.toggle('dc-filter-dark-mode',!!dark);document.documentElement.classList.toggle('darkmode',!!dark)},dark)}
export async function mountPopupBatch(browser,server,spec,kind){
 const e=await createTestPage(browser,server.baseUrl,{viewport:{width:spec.width,height:spec.height},storage:{[storageKeys.threshold]:0,[storageKeys.personalEnabled]:false,[storageKeys.palette]:spec.palette||'teal'}});
 try{
  if(kind==='header'){await mountB1NativeFixture(e,server.baseUrl,{dark:spec.dark});await e.page.evaluate(mountGallerySearchFixture,{html:gallerySearchHtml,css:gallerySearchHostCss})}
  else if(kind==='editor'){await e.page.route(u=>u.origin===server.baseUrl&&u.pathname==='/mgallery/board/write/',r=>r.fulfill({contentType:'text/html',body:writeHeaderHtml({variant:'minor',formMode:'write'})}));await e.goto('/mgallery/board/write/?id=test');await e.page.waitForFunction(()=>document.body.dataset.dcufNativeFormState==='write-editor');await e.page.locator('.note-editable').fill('작성 중인 본문 유지');await popupTheme(e.page,spec.dark)}
  else{await e.page.route(u=>u.origin===server.baseUrl&&u.pathname==='/board/view',async r=>{const response=await r.fetch();const body=(await response.text()).replace(/<body\b[^>]*>/,s=>s+'<div class="dcwrap width1160">').replace('</body>','</div></body>');await r.fulfill({response,body})});await e.goto('/board/view?id=test&no=1001&comments=4&header=1');if(kind==='actions')await e.page.evaluate(mountArticleActionFixture,{html:articleActionHtml,css:articleActionHostCss});else await e.page.evaluate(mountB1ContentFixture);await popupTheme(e.page,spec.dark)}
  return e;
 }catch(error){await e.close();throw error}
}
export async function capturePopupBatch(page,spec,name,dir=process.env.DCUF_POPUP_BATCH_CAPTURE){if(!dir)return;await mkdir(dir,{recursive:true});await page.mouse.move(0,0);await page.screenshot({path:`${dir}/${spec.width}-${spec.height}-${spec.dark?'dark':'light'}-${name}.png`,animations:'disabled'});if(process.env.DCUF_POPUP_BATCH_OBSERVATIONS){const semantic=await page.evaluate(()=>{
 const roots=[...document.querySelectorAll('[data-dcuf-article-popup],[data-dcuf-role="native-comment-popup"],.issue_contentbox,#hot_rank_pop2,#relation_popup,#visit_history_lyr,[data-dcuf-native-form-layer-kind~="dropdown"]')].filter(n=>getComputedStyle(n).display!=='none'&&getComputedStyle(n).visibility!=='hidden');
 const controls=roots.map(root=>({root:root.id||root.dataset.dcufNativeFormLayerAnchor||root.className,text:root.textContent.replace(/\s+/g,' ').trim(),controls:[...root.querySelectorAll('button,a,input,textarea,select')].map(n=>({tag:n.tagName,id:n.id,name:n.name||'',type:n.type||'',text:n.textContent.replace(/\s+/g,' ').trim(),value:n.type==='password'?'[redacted]':n.value,checked:n.checked,disabled:n.disabled,readOnly:n.readOnly,parent:n.parentElement.id||n.parentElement.className,display:getComputedStyle(n).display}))}));
 const original=window.__actionFixture?__actionFixture.originals.every(({node,parent,handler,focus})=>node.isConnected&&node.parentNode===parent&&node.onclick===handler&&node.onfocus===focus):window.__b1ContentOriginals?__b1ContentOriginals.every(({node,parent,handler})=>node.isConnected&&node.parentNode===parent&&node.onclick===handler):window.__gallerySearchFixture?__gallerySearchFixture.originals.every(({node,parent,click,focus,input})=>!node.isConnected||node.parentNode===parent&&node.onclick===click&&node.onfocus===focus&&node.oninput===input):true;
 return{controls,original,calls:window.__actionFixture?.calls||window.__gallerySearchFixture?.calls||[],pickerCalls:window.__b1PickerCalls||0,editorText:document.querySelector('.note-editable')?.textContent};
 });await appendFile(process.env.DCUF_POPUP_BATCH_OBSERVATIONS,JSON.stringify({id:spec.width+'-'+spec.height+'-'+(spec.dark?'dark':'light')+'-'+name,semantic})+'\n')}}
export async function openPopupEditor(page,kind){const control=page.locator('[data-dcuf-native-form-toolbar-control~='+kind+']').first();if(await control.count())await control.evaluate(n=>n.scrollIntoView({block:'center',inline:'nearest'}));await page.evaluate(k=>{if(k==='fontname')document.querySelector('.fixture-fontname-layer').style.removeProperty('display');__dcufFixture.toggleWriteLayer(k,true)},kind);const anchor=kind==='lineheight'?'line-height':kind;const menu=page.locator(`[data-dcuf-native-form-layer-kind~="dropdown"][data-dcuf-native-form-layer-anchor="${anchor}"]`);await menu.waitFor({state:'visible'});await page.waitForFunction(a=>document.querySelector(`[data-dcuf-native-form-layer-anchor="${a}"]`)?.dataset.dcufNativeFormLayerState==='positioned',anchor);return menu}
export async function primaryPopupMaterial(control){
 await control.scrollIntoViewIfNeeded();
 const m=await control.evaluate(n=>{const s=getComputedStyle(n),r=n.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(n);const labelWidth=range.getBoundingClientRect().width,naturalWidth=labelWidth+parseFloat(s.paddingLeft)+parseFloat(s.paddingRight)+parseFloat(s.borderLeftWidth)+parseFloat(s.borderRightWidth),probe=document.createElement('span');probe.style.cssText='background:var(--dcuf-v7-primary-bg);color:var(--dcuf-v7-primary-ink);border:1px solid var(--dcuf-v7-primary-rim);box-shadow:var(--dcuf-v7-primary-shadow)';n.parentElement.append(probe);const t=getComputedStyle(probe),expected=[t.backgroundColor,t.backgroundImage,t.color,t.borderTopColor,t.boxShadow];probe.remove();return{actual:[s.backgroundColor,s.backgroundImage,s.color,s.borderTopColor,s.boxShadow],expected,naturalWidth,width:r.width,height:r.height,hit:n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}});
 assert.deepEqual(m.actual,m.expected,'Primary consumes the adopted paired v7 material');assert.ok(m.width>=44&&m.width<=Math.max(44,m.naturalWidth)+2&&m.height>=36&&m.hit,JSON.stringify(m));return m;
}
export async function quietPopupControl(control){const s=await control.evaluate(n=>{const s=getComputedStyle(n);return{background:s.backgroundColor,shadow:s.boxShadow,border:s.borderTopWidth}});assert.deepEqual(s,{background:'rgba(0, 0, 0, 0)',shadow:'none',border:'0px'})}
const originalActions=p=>p.evaluate(()=>__actionFixture.originals.every(({node,parent,handler,focus})=>node.isConnected&&node.parentNode===parent&&node.onclick===handler&&node.onfocus===focus));

export async function runPopupBatchHeader({browser,server},{verify=true,specs=popupBatchSpecs}={}){
 for(const spec of specs){const e=await mountPopupBatch(browser,server,spec,'header'),p=e.page;try{
  const trigger=p.locator('.newvisit_history > .btn_open');await trigger.click();const selected=p.locator('#visit_history_lyr .tabslist > .on');await capturePopupBatch(p,spec,'recent');if(verify){assert.equal(await selected.evaluate(n=>getComputedStyle(n).backgroundColor),'rgba(0, 0, 0, 0)');assert.ok(await selected.locator('button').evaluate(n=>getComputedStyle(n).boxShadow.includes('inset')))}await trigger.click();
  await p.locator('.dcuf-header-drawer__toggle').click();const door=p.locator('.issue_contentbox');await p.waitForFunction(()=>document.querySelector('.issue_contentbox [data-dcuf-header-drawer-part="image"]'));const action=door.locator('.btn_hotall_list');await action.scrollIntoViewIfNeeded();await capturePopupBatch(p,spec,'door');
  if(verify){await quietPopupControl(action);const hits=await action.evaluate(n=>{const r=n.getBoundingClientRect();return[[.1,.5],[.5,.5],[.9,.5],[.5,.1],[.5,.9]].map(([x,y])=>n.contains(document.elementFromPoint(r.x+r.width*x,r.y+r.height*y)))});assert.ok(hits.every(Boolean),'Original door action edges must remain clear of the menu FAB: '+JSON.stringify(hits));assert.equal(await door.evaluate(n=>getComputedStyle(n).backdropFilter),'none')}
  await action.click();const rank=p.locator('#hot_rank_pop2');await p.waitForFunction(()=>document.querySelector('#hot_rank_pop2 [data-dcuf-header-drawer-part="panel"]'));await capturePopupBatch(p,spec,'rank');if(verify)await quietPopupControl(rank.locator('.btn_next').last());await rank.locator('.btn_next').last().click();assert.equal(await rank.locator('[data-dcuf-header-drawer-part="rank-list"]:visible').count(),1);await rank.locator('[data-dcuf-header-drawer-part="close"]').click();
  await p.locator('.dcuf-header-drawer__toggle').focus();await p.locator('.dcuf-header-drawer__toggle').press('Enter');await p.locator('[data-fixture-related]').click();const related=p.locator('#relation_popup');await p.waitForFunction(()=>document.querySelector('#relation_popup')?.dataset.dcufHeaderRelationPopup==='1');await capturePopupBatch(p,spec,'related');if(verify)await quietPopupControl(related.locator('.btn_next').last());await related.locator('[data-dcuf-header-drawer-part="close"]').click();assertNoRuntimeErrors(await getMetrics(p),e.consoleErrors);
 }finally{await e.close()}}
}
export async function runPopupBatchActions({browser,server},{verify=true,specs=popupBatchSpecs}={}){
 for(const spec of specs){const e=await mountPopupBatch(browser,server,spec,'actions'),p=e.page;try{
  for(const kind of['share','realbest','report','scrap','pum']){await p.locator(`[data-action-fixture="${kind}"]`).click();const root=p.locator(`[data-fixture-root="${kind}"]`);await p.waitForFunction(k=>document.querySelector(`[data-fixture-root="${k}"]`)?.dataset.dcufArticlePopup===k,kind);await capturePopupBatch(p,spec,'action-'+kind);
   if(verify){for(const c of await root.locator('[data-dcuf-article-part="primary"]:visible').all())await primaryPopupMaterial(c);const aux=root.locator('[data-dcuf-article-part="action"]:visible').first();if(await aux.count()){await aux.scrollIntoViewIfNeeded();await quietPopupControl(aux)}}assert.equal(await originalActions(p),true);await root.locator('[data-dcuf-article-part="close"]').last().click();await root.waitFor({state:'detached'});
  }assertNoRuntimeErrors(await getMetrics(p),e.consoleErrors);
 }finally{await e.close()}
 const picker=await mountPopupBatch(browser,server,spec,'pickers'),q=picker.page;try{await q.waitForSelector('#div_txtcon[data-dcuf-role="native-comment-popup"]',{state:'attached'});for(const[id,trigger]of[['div_txtcon','.tx_txtcon'],['div_con','.tx_dccon']]){await q.locator('#focus_cmt .dccon_guidebox > '+trigger).click();const root=q.locator('#'+id);await root.waitFor({state:'visible'});await capturePopupBatch(q,spec,'picker-'+id);if(verify){for(const c of await root.locator('[data-dcuf-comment-role="popup-primary-action"]:visible').all())await primaryPopupMaterial(c);const aux=root.locator('[data-dcuf-comment-role="popup-action"]:visible').first();if(await aux.count())await quietPopupControl(aux)}await q.locator('#focus_cmt .dccon_guidebox > '+trigger).focus();await q.locator('#focus_cmt .dccon_guidebox > '+trigger).press('Enter');await root.waitFor({state:'hidden'})}assertNoRuntimeErrors(await getMetrics(q),picker.consoleErrors)}finally{await picker.close()}
 }
}
export async function runPopupBatchEditor({browser,server},{verify=true,specs=popupBatchSpecs}={}){
 for(const spec of specs){const e=await mountPopupBatch(browser,server,spec,'editor'),p=e.page;try{
  const swatches=()=>p.locator('.note-color-btn').evaluateAll(ns=>ns.map(n=>[n.style.background,getComputedStyle(n).backgroundColor]));const before=await swatches();
  for(const kind of['fontname','fontsize','color','paragraph','lineheight','table']){
   let menu=await openPopupEditor(p,kind);await capturePopupBatch(p,spec,'editor-'+kind);
   if(verify){const paint=await menu.evaluate(n=>{const s=getComputedStyle(n),probe=document.createElement('span');probe.style.background='var(--dcuf-b1-floating)';n.append(probe);const expected=getComputedStyle(probe).backgroundColor;probe.remove();return{actual:s.backgroundColor,expected,fixed:[...n.querySelectorAll('*')].some(n=>getComputedStyle(n).position==='fixed')}});assert.equal(paint.actual,paint.expected);assert.equal(paint.fixed,false);if(kind==='paragraph')await quietPopupControl(menu.locator('button').first())}
   if(['fontname','fontsize','lineheight','paragraph'].includes(kind)){
    const generated=kind==='fontname'&&await menu.locator('[data-dcuf-font-value]').count()>0;
    const selector=generated?'[data-dcuf-font-value]':kind==='paragraph'?'button':'[data-value]';
    await menu.locator(selector).first().click();menu=await openPopupEditor(p,kind);
    if(generated)assert.equal(await menu.locator('[data-dcuf-font-value].checked').count(),1,'Original font intent must select exactly one real option');
    else {
     // Summernote owns selection paint on the live page. This fixture has only
     // its value callback; seed the native checked class after the trusted click.
     await menu.locator(selector).evaluateAll(ns=>{ns.forEach(n=>n.classList.remove('checked'));ns[0].classList.add('checked')});
    }
    const selected=menu.locator('.checked').first();await selected.waitFor({state:'visible'});
    if(verify){const paint=await selected.evaluate(n=>{const s=getComputedStyle(n),probe=document.createElement('span');probe.style.cssText='background:var(--dcuf-v7-primary-fill);color:var(--dcuf-v7-primary-ink)';n.parentElement.append(probe);const t=getComputedStyle(probe),expected=[t.backgroundColor,t.color];probe.remove();return{actual:[s.backgroundColor,s.color],expected,shadow:s.boxShadow,borderWidth:s.borderTopWidth,border:s.borderTopColor}});assert.deepEqual(paint.actual,paint.expected,'Selected option consumes paired fill and ink');assert.equal(paint.shadow,'none');assert.ok(paint.borderWidth==='0px'||paint.border==='rgba(0, 0, 0, 0)','No visible selected border cue');const unselected=menu.locator(selector).nth(1);assert.notEqual(await unselected.evaluate(n=>getComputedStyle(n).backgroundColor),paint.actual[0],'Unselected option has no persistent selected face')}
    await capturePopupBatch(p,spec,'editor-'+kind+'-selected');
   }
   await p.evaluate(k=>__dcufFixture.toggleWriteLayer(k,false),kind);await menu.waitFor({state:'hidden'});
  }
  assert.deepEqual(await swatches(),before,'Authored editor color swatches remain intact');assert.equal(await p.locator('.note-editable').textContent(),'작성 중인 본문 유지');assertNoRuntimeErrors(await getMetrics(p),e.consoleErrors);
 }finally{await e.close()}}
}
