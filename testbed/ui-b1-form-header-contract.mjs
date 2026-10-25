import {mkdir,writeFile} from 'node:fs/promises';
import {assert,createTestPage,storageKeys,getMetrics,assertNoRuntimeErrors} from './harness/runner-utils.mjs';
import {formHeaderHtml} from './fixtures/b1-form-header.mjs';

export async function runB1FormHeaderContract({browser,server}) {
 const records=[];
 const settle=async page=>{
  const result=await page.evaluate(()=>new Promise(resolve=>{const c=__dcufRuntimeCoordinator;let frames=0,attempts=0,last=-1;const check=()=>{const generation=c.getMutationGeneration(),idle=c._pendingMutationRecords.length===0&&!c._pendingMutationRafId&&!c._pendingMutationTimerId;frames=idle&&generation===last?frames+1:0;last=generation;if(frames>=4)return resolve({idle:true,generation});if(++attempts>=60)return resolve({idle:false,generation,pending:c._pendingMutationRecords.length});requestAnimationFrame(check)};requestAnimationFrame(check)}));
  assert.equal(result.idle,true,'Unchanged password form/header must stop scheduling its own mutation work: '+JSON.stringify(result));return result;
 };
 for(const kind of ['modify','delete'])for(const[width,height,dark]of[[980,900,false],[980,900,true],[980,2306,false],[390,520,true]]){
  const e=await createTestPage(browser,server.baseUrl,{viewport:{width,height},storage:{[storageKeys.threshold]:0,[storageKeys.palette]:'teal'}});
  try{
   const route=kind==='delete'?'/mini/board/delete/':'/board/modify/';
   await e.page.route(url=>url.origin===server.baseUrl&&url.pathname===route,r=>r.fulfill({contentType:'text/html',body:formHeaderHtml(kind)}));
   await e.goto(route+'?id=test&no=1001');
   await e.page.waitForFunction(()=>document.querySelector('.dcheader')?.getAttribute('data-dcuf-header-shell-role')==='root',null,{timeout:3000});
   if(dark)await e.page.evaluate(()=>{const s=document.createElement('style');s.id='css-darkmode';s.textContent='html{color-scheme:dark}';document.head.append(s);document.body.classList.add('dc-filter-dark-mode');document.documentElement.classList.add('darkmode')});
   const contract=await e.page.evaluate(()=>{
    const box=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
    return{pageType:__dcufPageContext.type,hasList:__dcufPageContext.hasListSurface,shellRole:document.querySelector('.dcheader').getAttribute('data-dcuf-header-shell-role'),gnbRole:document.querySelector('.gnb_bar').getAttribute('data-dcuf-header-gnb-role'),headRole:document.querySelector('.page_head').getAttribute('data-dcuf-gallery-page-head-role'),layout:document.querySelector('#top').getAttribute('data-dcuf-header-layout'),header:box(document.querySelector('.dcheader .wrap_search')),head:box(document.querySelector('.page_head')),card:box(document.querySelector('.no_memberwrap')),footer:getComputedStyle(document.querySelector('footer.dcfoot')).display,overflow:document.documentElement.scrollWidth-innerWidth,subscribers:[...__dcufRuntimeCoordinator._mutationSubscribers.keys()].sort(),originalCount:__formHeaderFixture.originals.length,originals:__formHeaderFixture.originals.every(({node,parent,click,focus})=>node.isConnected&&node.parentNode===parent&&node.onclick===click&&node.onfocus===focus),passwordOriginals:__passwordFixture.originals.every(({node,parent,handler})=>node.isConnected&&node.parentNode===parent&&node.onclick===handler)};
   });
   assert.equal(contract.pageType,kind);assert.equal(contract.hasList,false,'Reuse header presentation without declaring a list surface');
   assert.equal(contract.shellRole,'root');assert.equal(contract.gnbRole,'root');assert.equal(contract.headRole,'root');assert.equal(contract.layout,'parent');
   assert.ok(contract.originalCount>=15);assert.equal(contract.originals,true);assert.equal(contract.passwordOriginals,true);assert.equal(contract.footer,'none');
   if(process.env.DCUF_FORM_HEADER_CAPTURE){await mkdir(process.env.DCUF_FORM_HEADER_CAPTURE,{recursive:true});await e.page.screenshot({path:`${process.env.DCUF_FORM_HEADER_CAPTURE}/${kind}-${width}-${height}-${dark?'dark':'light'}-initial.png`});}
   assert.ok(contract.header.width>200&&contract.header.x>=0&&contract.header.right<=width+1&&contract.head.bottom<=contract.card.y+1,JSON.stringify(contract));
   assert.ok(contract.card.width>250&&contract.card.right<=width&&contract.overflow<=1);
   assert.ok(Math.abs(contract.head.x-(width>=760?20:12))<1&&Math.abs(contract.head.width-(width>=760?width-40:width-24))<1,'Gallery title/tools use the same outer margins as the list; the password card must not constrain the header');
   const utilities=await e.page.locator('.page_head > .fr [data-dcuf-gallery-page-head-role="utility-control"]').evaluateAll(ns=>ns.filter(n=>n.getBoundingClientRect().width).map(n=>{const s=getComputedStyle(n),r=n.getBoundingClientRect();return{height:r.height,background:s.backgroundColor,hit:n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}}));
   assert.ok(utilities.length>=3&&utilities.every(n=>n.height>=28&&n.background==='rgba(0, 0, 0, 0)'&&n.hit),'Native utility controls have a readable quiet hit area without residual white patches');
   contract.settled=await settle(e.page);
   for(const key of ['header-shell-style','header-gnb-style','header-recent-visit-navigation','gallery-page-head-style'])assert.ok(contract.subscribers.includes(key),key+' is connected to the existing mutation bus');
   const ids=['dcuf-header-shell-style','dcuf-header-gnb-style','dcuf-header-recent-visit-style','dcuf-gallery-page-head-style'];
   assert.deepEqual(await e.page.evaluate(ids=>ids.map(id=>document.querySelectorAll('#'+id).length),ids),[1,1,1,1]);
   const input=e.page.locator('.dcheader input:not([type=hidden])').first();await input.fill('합성 검색');await input.focus();
   const popup=e.page.locator('[data-fixture-header-search-history]');await popup.waitFor({state:'visible'});
   assert.equal(await popup.getAttribute('data-dcuf-header-shell-role'),'search-layer');await popup.locator('.btn_close').click();
   await input.press('Enter');assert.ok(await e.page.evaluate(()=>__formHeaderFixture.calls.includes('search')));
   const trigger=e.page.locator('.newvisit_history > .btn_open');await trigger.click();await e.page.locator('#visit_history_lyr').waitFor({state:'visible'});
   const remove=e.page.locator('#visit_history_lyr .btn_visit_del');
   assert.equal(await remove.locator('em').evaluate(n=>getComputedStyle(n).display),'none','The original sprite must not remain beside the new remove icon');
   assert.equal(await remove.locator('.blind').textContent(),'삭제','Keep the original accessible name');await remove.click();assert.ok(await e.page.evaluate(()=>__formHeaderFixture.calls.includes('recent-remove')));
   await trigger.click();
   // Host replaces a search layer without touching the native password form.
   await e.page.evaluate(()=>{const old=document.querySelector('[data-fixture-header-search-history]'),next=old.cloneNode(true);next.removeAttribute('data-dcuf-header-shell-role');old.replaceWith(next);next.querySelector('.btn_close').onclick=()=>{__formHeaderFixture.calls.push('replacement-close');next.style.display='none'};document.querySelector('.dcheader input:not([type=hidden])').onfocus=()=>next.style.display='block';next.style.display='block'});
   await e.page.waitForFunction(()=>document.querySelector('.auto_wordwrap')?.getAttribute('data-dcuf-header-shell-role')==='search-layer',null,{timeout:3000});await e.page.locator('[data-fixture-header-search-history] .btn_close').click();
   assert.ok(await e.page.evaluate(()=>__formHeaderFixture.calls.includes('replacement-close')));
   const beforeCount=contract.subscribers.length;await e.page.evaluate(kind=>{const f=kind==='modify'?'syncModifySurface':'syncDeleteSurface';__dcufUIModule[f]('duplicate-test');__dcufUIModule[f]('duplicate-test')},kind);
   assert.equal(await e.page.evaluate(()=>__dcufRuntimeCoordinator._mutationSubscribers.size),beforeCount);
   if(process.env.DCUF_FORM_HEADER_CAPTURE){await mkdir(process.env.DCUF_FORM_HEADER_CAPTURE,{recursive:true});await input.fill('');await input.blur();await e.page.screenshot({path:`${process.env.DCUF_FORM_HEADER_CAPTURE}/${kind}-${width}-${height}-${dark?'dark':'light'}.png`});}
   const disposed=await e.page.evaluate(()=>{__dcufHeaderShellHostAdapter.dispose();__dcufHeaderGnbHostAdapter.dispose();__dcufHeaderRecentVisitHostAdapter.dispose();__dcufGalleryPageHeadHostAdapter.dispose();return{role:document.querySelector('.dcheader').hasAttribute('data-dcuf-header-shell-role'),keys:[...__dcufRuntimeCoordinator._mutationSubscribers.keys()].sort()}});
   assert.equal(disposed.role,false,'Each adapter restores its own original attributes synchronously; the active application may subsequently reconnect it');
   const headerKeys=['header-shell-style','header-gnb-style','header-recent-visit-navigation','gallery-page-head-style'];
   assert.deepEqual(disposed.keys,contract.subscribers.filter(k=>!headerKeys.includes(k)),'Only the four newly admitted header subscribers are removed');
   await e.page.evaluate(kind=>__dcufUIModule[kind==='modify'?'syncModifySurface':'syncDeleteSurface']('reconnect-test'),kind);
   assert.deepEqual(await e.page.evaluate(ids=>ids.map(id=>document.querySelectorAll('#'+id).length),ids),[1,1,1,1]);
   await settle(e.page);
   await e.page.evaluate(()=>{const form=document.querySelector('form[name="password_confirm"],form[name="delete"]');window.__removedForm={form,parent:form.parentNode,next:form.nextSibling};form.remove()});
   await e.page.waitForFunction(ids=>ids.every(id=>!document.getElementById(id)),ids,{timeout:1500});
   assert.equal(await e.page.evaluate(()=>document.body.getAttribute('data-dcuf-native-form-state')),null,'Removing the original password form exits native header context');
   await settle(e.page);
   await e.page.evaluate(()=>{const{form,parent,next}=__removedForm;parent.insertBefore(form,next?.parentNode===parent?next:null);delete window.__removedForm});
   await e.page.waitForFunction(ids=>ids.every(id=>document.querySelectorAll('#'+id).length===1),ids,{timeout:1500});
   await settle(e.page);
   records.push({kind,width,height,dark,contract});assertNoRuntimeErrors(await getMetrics(e.page),e.consoleErrors);
  }finally{await e.close()}
 }
 if(process.env.DCUF_FORM_HEADER_CAPTURE)await writeFile(`${process.env.DCUF_FORM_HEADER_CAPTURE}/contexts.json`,JSON.stringify(records,null,2));
}
