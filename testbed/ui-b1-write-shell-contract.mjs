import {assert,createTestPage,storageKeys,getMetrics,assertNoRuntimeErrors} from './harness/runner-utils.mjs';
import {writeHeaderHtml} from './fixtures/b1-form-header.mjs';

export async function runB1WriteShellContract({browser,server}) {
 const records=[];
 const settle=async page=>{const result=await page.evaluate(()=>new Promise(resolve=>{let frames=0,last=-1,attempts=0;const changes=[];const observer=new MutationObserver(records=>records.forEach(r=>{if(changes.length<40)changes.push([r.target.id||r.target.tagName,r.attributeName,r.oldValue,r.target.getAttribute?.(r.attributeName)])}));observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:["class","style"],attributeOldValue:true,childList:true});const c=__dcufRuntimeCoordinator,step=()=>{const g=c.getMutationGeneration(),idle=!c._pendingMutationRecords.length&&!c._pendingMutationRafId&&!c._pendingMutationTimerId;frames=idle&&g===last?frames+1:0;last=g;if(frames>=4||++attempts>=90){observer.disconnect();return resolve({idle:frames>=4,g,changes})}requestAnimationFrame(step)};requestAnimationFrame(step)}));assert.equal(result.idle,true,'UI did not settle: '+JSON.stringify(result));return true};
 for(const[variant,formMode,width,height,dark]of[['major','write',980,900,false],['minor','write',980,2306,false],['minor','write',980,900,true],['major','modify',980,900,false],['minor','modify',390,520,true]]){
  const e=await createTestPage(browser,server.baseUrl,{viewport:{width,height},storage:{[storageKeys.threshold]:0,[storageKeys.palette]:'teal'}});
  try{
   const route=formMode==='modify'?'/board/modify/':'/mgallery/board/write/';
   await e.page.route(u=>u.origin===server.baseUrl&&u.pathname===route,r=>r.fulfill({contentType:'text/html',body:writeHeaderHtml({variant,formMode})}));
   await e.goto(route+'?id=test&no=1001');
   await e.page.waitForFunction(()=>document.body.getAttribute('data-dcuf-native-form-state')==='write-editor');
   const form=e.page.locator('form#write,form[name=modify]');
   await e.page.evaluate(()=>{const f=document.querySelector('form#write,form[name=modify]');window.__writeShellOriginals=[f,...f.querySelectorAll('input,textarea,select,.note-editable,.note-toolbar')].map(node=>({node,parent:node.parentNode,click:node.onclick}));window.__writeShellForm={action:f.action,method:f.method,hidden:[...f.querySelectorAll('input[type=hidden]')].map(n=>[n.name,n.value])}});
   if(dark)await e.page.evaluate(()=>{const s=document.createElement('style');s.id='css-darkmode';s.textContent='html{color-scheme:dark}';document.head.append(s);document.body.classList.add('dc-filter-dark-mode');document.documentElement.classList.add('darkmode')});
   const initial=await e.page.evaluate(()=>({header:document.querySelector('.dcheader')?.getAttribute('data-dcuf-header-shell-role'),hasList:__dcufPageContext.hasListSurface}));
   assert.equal(initial.header,'root','Supported editor must reuse the shared B1 header');assert.equal(initial.hasList,false);
   const nickname=form.locator('#gall_nick_name');await nickname.fill('작성닉');
   assert.equal(await nickname.getAttribute('data-dcuf-native-form-role'),'name-input','Visible gallery nickname shares the credential role without changing its native name');
   await form.locator('#subject').fill('B1 입력 유지');
   await form.locator('.note-editable').fill('작성 중인 본문');
   await form.locator('.note-editable').press('End');await form.locator('.note-editable').press('!');
   await e.page.locator('.newvisit_history > .btn_open').click();
   assert.equal(await form.locator('#subject').inputValue(),'B1 입력 유지');assert.match(await form.locator('.note-editable').innerText(),/작성 중인 본문!/);
   const state=await e.page.evaluate(()=>{
    const f=document.querySelector('form#write,form[name=modify]'),box=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
    const editor=document.querySelector('[data-dcuf-native-form-role="editor-frame"]'),subject=document.querySelector('#subject'),head=document.querySelector('.page_head');
    return{originals:__writeShellOriginals.every(({node,parent,click})=>node.isConnected&&node.parentNode===parent&&node.onclick===click),headerOriginals:__formHeaderFixture.originals.every(({node,parent,click,focus})=>node.isConnected&&node.parentNode===parent&&node.onclick===click&&node.onfocus===focus),form:{action:f.action,method:f.method,hidden:[...f.querySelectorAll('input[type=hidden]')].map(n=>[n.name,n.value])},before:__writeShellForm,overflow:document.documentElement.scrollWidth-innerWidth,formBox:box(f),editor:box(editor),subject:box(subject),head:box(head),background:getComputedStyle(f).backgroundImage,backing:getComputedStyle(f,'::before').backgroundImage,styleCount:document.querySelectorAll('#dcuf-header-shell-style').length};
   });
   assert.equal(state.originals,true);assert.equal(state.headerOriginals,true);assert.deepEqual(state.form,state.before);assert.equal(state.styleCount,1);assert.ok(state.backing.includes('linear-gradient'),'Decorative backing consumes the shared B1 sheen without filtering the popup ancestor');
   assert.ok(state.overflow<=1);assert.ok(state.editor.width>200);assert.ok(state.subject.height>=40);assert.ok(state.formBox.y>=state.head.bottom-1);
   assert.ok(state.subject.width>=state.editor.width-80,'Title must occupy the writing measure, not a half-width grid cell');
   assert.equal(await settle(e.page),true,'Editor/header must settle without mutation feedback');
   await e.page.evaluate(()=>{const form=document.querySelector('form#write,form[name=modify]'),node=form.closest('#write_wrap')||form;window.__removedWriteShell={form,node,parent:node.parentNode,next:node.nextSibling};node.remove()});
   await e.page.waitForFunction(()=>!document.getElementById('dcuf-header-shell-style'),null,{timeout:2500});
   assert.equal(await settle(e.page),true,'Removed form must release header owners');
   await e.page.evaluate(()=>{const{node,parent,next}=__removedWriteShell;parent.insertBefore(node,next?.parentNode===parent?next:null)});
   await e.page.waitForFunction(()=>document.querySelector('.dcheader')?.getAttribute('data-dcuf-header-shell-role')==='root',null,{timeout:2500});
   assert.equal(await form.locator('#subject').inputValue(),'B1 입력 유지');assert.equal(await nickname.inputValue(),'작성닉');
   assert.equal(await settle(e.page),true,'Reinserted form must reconnect once and settle');
   assertNoRuntimeErrors(await getMetrics(e.page),e.consoleErrors);records.push({variant,formMode,width,height,dark,...state});
  }finally{await e.close()}
 }
 return{contexts:records.length,records};
}
