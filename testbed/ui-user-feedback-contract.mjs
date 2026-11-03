import assert from 'node:assert/strict';
import {createTestPage,storageKeys,getMetrics,assertNoRuntimeErrors} from './harness/runner-utils.mjs';
import {mountB1NativeFixture} from './fixtures/b1-native-list.mjs';
import {installLiveControlFixture} from './ui-live-control-contract.mjs';
import {mountArticleV7State} from './ui-b1-article-v7-contract.mjs';
import {mountWriterV7} from './ui-b1-write-v7-contract.mjs';
import {renderedLabelContrast} from './ui-control-material-contract.mjs';
import {createConvenienceState} from './ui-b1-convenience-contract.mjs';

const paint=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const hit=async l=>{await l.scrollIntoViewIfNeeded();return l.evaluate(n=>{const r=n.getBoundingClientRect(),t=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.width>0&&r.height>0&&(n===t||n.contains(t))})};
const stateWidths=[{width:1630,height:900},{width:1630,height:900,dark:true},{width:980,height:2306},{width:390,height:700,dark:true}];

export async function runShortcutFeedbackContract({browser,server,observeOnly=false,target='mobile'}) {
 const e=await createTestPage(browser,server.baseUrl,{storage:{[storageKeys.threshold]:0,[storageKeys.shortcut]:'Shift+S'}}),p=e.page,records=[],defects=[];
 const check=(ok,message)=>{if(!ok){defects.push(message);if(!observeOnly)assert.ok(ok,message)}};
 const value=()=>p.evaluate(k=>__dcufTestbedGM.snapshot().values[k],storageKeys.shortcut);
 try {
  await e.goto('/board/lists?id=test');await p.evaluate(()=>__dcufTestbedGM.invokeMenu('글댓합 설정하기'));
  const parent=p.locator('#dcinside-filter-setting'),modal=p.locator('#dcinside-shortcut-modal');await parent.waitFor({state:'visible'});
  for(const sample of ['fast','meta-shift','held','function','ime','rerecord','active']) {
   await parent.locator('#dcinside-change-shortcut-btn').click();await modal.waitFor({state:'visible'});
   if(sample==='fast')await p.keyboard.press('Control+Alt+K');
   if(sample==='meta-shift')await p.keyboard.press('Meta+Shift+K');
   if(sample==='held'){await p.keyboard.down('Control');await p.keyboard.down('Alt');await p.waitForTimeout(650);await p.keyboard.press('K');await p.keyboard.up('Alt');await p.keyboard.up('Control')}
   if(sample==='function')await p.keyboard.press('Control+Alt+F2');
   if(sample==='ime')await p.evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Process',code:'KeyK',ctrlKey:true,altKey:true,isComposing:true,bubbles:true})));
   if(sample==='active')await p.keyboard.press('Shift+S');
   if(sample==='rerecord'){await p.keyboard.press('Control+Alt+K');await p.keyboard.press('Control+Alt+L')}
   const preview=await modal.locator('output').innerText(),expected=sample==='active'?'Shift+S':sample==='meta-shift'?'Meta+Shift+K':sample==='function'?'Ctrl+Alt+F2':sample==='rerecord'?'Ctrl+Alt+L':'Ctrl+Alt+K';
   check(preview===expected,sample+': expected '+expected+', got '+preview);check(await parent.count()===1,'Recording existing shortcut keeps parent connected');records.push({sample,preview,expected});
   await modal.getByRole('button',{name:'취소',exact:true}).click();check(await value()==='Shift+S','Cancel preserves saved shortcut');
  }
  if(!observeOnly) {
   for(const chord of ['Control+Alt','Control+Alt+Shift+K']) {
    await parent.locator('#dcinside-change-shortcut-btn').click();await p.keyboard.press(chord);
    const notice=p.waitForEvent('dialog').then(d=>d.accept());await modal.getByRole('button',{name:'변경',exact:true}).click();await notice;
    check(await value()==='Shift+S','Invalid '+chord+' does not save');await modal.getByRole('button',{name:'취소',exact:true}).click();
   }
   for(const chord of ['Control+Alt+F2','Control+Alt+K']) {
    await parent.locator('#dcinside-change-shortcut-btn').click();await p.keyboard.press(chord);const expected=await modal.locator('output').innerText();await modal.getByRole('button',{name:'변경',exact:true}).click();await modal.waitFor({state:'detached'});check(await value()===expected,'Valid shortcut retains string storage');
    await parent.locator('#dcinside-filter-close').click();await parent.waitFor({state:'detached'});await p.keyboard.press(chord);await parent.waitFor({state:'visible'});
   }
   // An IME-shaped replay must also launch the saved logical K shortcut.
    await parent.locator('#dcinside-filter-close').click();await parent.waitFor({state:'detached'});await p.evaluate(()=>document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'Process',code:'KeyK',ctrlKey:true,altKey:true,isComposing:true,bubbles:true,cancelable:true})));await parent.waitFor({state:'visible',timeout:2500});
  }
  assertNoRuntimeErrors(await getMetrics(p),e.consoleErrors);return {target,records,defects,physicalKeyboard:'not asserted;Process is a shaped replay'};
 }finally{await e.close()}
}

export async function mountFeedbackPage(browser,server,kind,state) {
 let e;
 if(kind==='list') {e=await createTestPage(browser,server.baseUrl,{viewport:{width:state.width,height:state.height},storage:{[storageKeys.threshold]:0,[storageKeys.palette]:'teal'}});await mountB1NativeFixture(e,server.baseUrl,{dark:state.dark});await e.page.evaluate(installLiveControlFixture)}
 if(kind==='article') {({e}=await mountArticleV7State(browser,server,{...state,header:true}));await e.page.evaluate(()=>{const article=document.querySelector('[data-dcuf-role="article"]'),bar=document.querySelector('.fixture-v7-native-actions');article.after(bar)})}
 if(kind==='write')e=await mountWriterV7(browser,server,state);
 await paint(e.page);return e;
}

export async function pageGeometry(p) {return p.evaluate(()=>{
 const b=n=>n.getBoundingClientRect().toJSON(),positive=sel=>[...document.querySelectorAll(sel)].filter(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0});
 const layout=positive('[data-dcuf-header-layout]').find(n=>getComputedStyle(n,'::before').content==='""');
 const header=layout&&(()=>{const r=b(layout),s=getComputedStyle(layout,'::before');return {left:r.left+parseFloat(s.marginLeft),right:r.right-parseFloat(s.marginRight)}})();
 return {width:innerWidth,gutter:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dcuf-page-gutter')),header,
  planes:positive('[data-dcuf-role="article"],[data-dcuf-surface="list-container"],[data-dcuf-surface="list-toolbar"],[data-dcuf-role="article-native-actions"],[data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"],[data-dcuf-role="gallery-page-head"],[data-dcuf-role="comments-root"]:not(.image_comment)').map(n=>({role:n.dataset.dcufRole||n.dataset.dcufSurface||n.dataset.dcufNativeFormRole,box:b(n),nested:!!n.parentElement.closest('[data-dcuf-role="article"]')})),overflow:document.documentElement.scrollWidth-innerWidth};
 })}

export async function runPageFeedbackContract({browser,server,onCapture,observeOnly=false}) {
 const records=[],defects=[];const check=(ok,message)=>{if(!ok){defects.push(message);if(!observeOnly)assert.ok(ok,message)}};
 for(const state of stateWidths)for(const kind of ['list','article','write']) {
  const e=await mountFeedbackPage(browser,server,kind,state),p=e.page;
  try {
   const g=await pageGeometry(p);check(!!g.header,kind+' has a positive header pane');check(g.planes.length>0,kind+' has positive content');
   for(const plane of g.planes.filter(x=>!x.nested))check(Math.abs(plane.box.left-g.header.left)<1&&Math.abs(plane.box.right-g.header.right)<1,`${kind}@${state.width} ${plane.role} shares header edges: ${JSON.stringify({header:g.header,box:plane.box})}`);
   check(g.overflow<=1,kind+' no page overflow');
   if(kind==='list') {
    const arrow=p.locator('[data-dcuf-role="category-toggle"]');await arrow.waitFor({state:'visible'});
    const adjacency=await arrow.evaluate(n=>{const a=n.getBoundingClientRect(),l=document.querySelector('[data-dcuf-role="category-list"]'),r=l.getBoundingClientRect(),last=l.lastElementChild.getBoundingClientRect();return {gap:a.left-Math.min(r.right,last.right),width:r.width,scroll:l.scrollWidth}});
    check(adjacency.gap>=0&&adjacency.gap<=12,'Category arrow follows labels: '+JSON.stringify(adjacency));check(await hit(arrow),'Category arrow hit');await arrow.click();const option=p.locator('[data-dcuf-role="category-popup"] a').last();check(await hit(option),'Original last category popup item hit');await option.click();check(await p.evaluate(()=>__liveNative.categoryClicks)===1,'Original category callback');await arrow.click();
    await p.evaluate(()=>{const list=document.querySelector('[data-dcuf-role="category-list"]');for(let i=0;i<16;i++){const li=document.createElement('li');li.innerHTML='<a href="javascript:;">길이가 긴 합성 말머리 '+i+'</a>';list.append(li)}});await paint(p);
    const long=await arrow.evaluate(n=>{const a=n.getBoundingClientRect(),l=document.querySelector('[data-dcuf-role="category-list"]'),r=l.getBoundingClientRect();l.scrollLeft=l.scrollWidth;return {gap:a.left-r.right,scroll:l.scrollWidth,client:l.clientWidth}});check(long.scroll>long.client&&long.gap>=0&&long.gap<=12,'Long category strip shrinks/scrolls without detaching arrow: '+JSON.stringify(long));
    await p.evaluate(()=>{const list=document.querySelector('[data-dcuf-role="category-list"]');for(let i=0;i<16;i++)list.lastElementChild.remove();list.scrollLeft=0});await paint(p);
   }
   if(kind==='article') {
    // Native dynamic reply forms may carry a desktop textarea width. Keep
    // the original field and inline value while constraining its used size.
    const textarea=p.locator('[data-dcuf-role="comment-composer"][data-dcuf-state="reply"] textarea').first();await textarea.evaluate(n=>n.style.width='927px');await paint(p);
    const containment=await textarea.evaluate(n=>{const t=n.getBoundingClientRect(),input=n.closest('[data-dcuf-role="comment-input-box"]').getBoundingClientRect(),editor=n.closest('[data-dcuf-role="comment-editor"]').getBoundingClientRect();return {t:t.toJSON(),input:input.toJSON(),editor:editor.toJSON(),nativeWidth:n.style.width}});
    check(containment.t.right<=containment.input.right+1&&containment.input.right<=containment.editor.right+1&&containment.t.left>=containment.input.left-1,'Native-width reply textarea remains inside editor: '+JSON.stringify(containment));check(containment.nativeWidth==='927px','Native inline reply value retained');
    const native=p.locator('.fixture-v7-native-actions button').last();check(await hit(native),'Sibling native write action hit');await native.click();check(await p.evaluate(()=>__v7ActionCalls)===1,'Original sibling action callback');
    check(await p.evaluate(()=>__v7ActionOriginals.every(o=>o.node.isConnected&&o.node.parentNode===o.parent&&o.node.onclick===o.handler)),'Native action parents/handlers retained');
   }
   if(!observeOnly&&kind==='list') {
    const fab=p.locator('#dc-personal-block-fab');await fab.waitFor({state:'visible'});check(await fab.innerText()==='menu','FAB lowercase label');const size=await fab.evaluate(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return {w:r.width,h:r.height,font:parseFloat(s.fontSize),ink:s.color,backdrop:s.backdropFilter,background:s.backgroundColor}});
    check(size.w<120&&size.h>=44&&size.h<55&&size.ink==='rgb(255, 255, 255)'&&size.backdrop!=='none','Compact white glass FAB: '+JSON.stringify(size));
    const contrast=await renderedLabelContrast(p,'#dc-personal-block-fab',{glyphMask:true});check(contrast.min>=4.5,'FAB white ink contrast '+contrast.min);await fab.click();await p.locator('#dc-personal-block-drawer').waitFor({state:'visible'});check(await hit(p.locator('[data-dcuf-fab-action="filter-settings"]')),'Drawer action reachable');await fab.click();
   }
   const semantic=await p.evaluate(()=>({storage:__dcufTestbedGM.snapshot().values,categoryCalls:window.__liveNative?.categoryClicks??null,actionCalls:window.__v7ActionCalls??null,form:[...document.querySelectorAll('form')].map(n=>({action:n.getAttribute('action'),method:n.getAttribute('method'),fields:[...n.querySelectorAll('input[type="hidden"]')].map(x=>({name:x.name,value:x.value}))})),originals:window.__v7ActionOriginals?.every(o=>o.node.isConnected&&o.node.parentNode===o.parent&&o.node.onclick===o.handler)??null}));
   await onCapture?.(e,{...state,kind});assertNoRuntimeErrors(await getMetrics(p),e.consoleErrors);records.push({state,kind,geometry:g,semantic});
  }finally{await e.close()}
 }
 return {records,defects};
}

export async function runBadgeFeedbackContract({browser,server,observeOnly=false,onCapture}) {
 const {e}=await mountArticleV7State(browser,server,{width:980,height:900}),p=e.page;
 try {
  await p.route('**/feedback-badges/**',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="12" height="11"><rect width="12" height="11" fill="#789"/></svg>'}));
  await p.evaluate(()=>{
   const style=document.createElement('style');style.textContent='.writer_nikcon img[src*="nik.gif"],.writer_nikcon img[src*="/bestcon"]{box-sizing:content-box;width:0;height:0;background:linear-gradient(90deg,#789 0 12px,#f90 12px 24px,#0a9 24px);background-size:92px;background-repeat:no-repeat}.writer_nikcon img[src*="nik.gif"]{padding:11px 0 0 12px}.writer_nikcon img[src*="fix_nik.gif"]{background-size:101px;background-position:-.5px -17px}.writer_nikcon img[src*="/bestcon"]{padding:20px 0 0 18px;border:solid transparent;border-width:2px 3px;background-clip:padding-box;background-size:137px}';document.head.prepend(style);
   const visible=sel=>[...document.querySelectorAll(sel)].find(n=>n.getBoundingClientRect().width>0&&n.getBoundingClientRect().height>0);
   const scopes=[visible('#focus_cmt .cmt_nickbox'),visible('.reply_list .cmt_nickbox'),visible('.image_comment .cmt_nickbox'),visible('[data-dcuf-role="article"] .recommend_box')||document.querySelector('[data-dcuf-role="article"]')];
   window.__feedbackBadgeOriginals=[];
   scopes.forEach((scope,i)=>{if(!scope)throw Error('Badge scope missing '+i);for(const file of ['nik.gif','fix_nik.gif','bestcon.gif','classic.svg']){const a=document.createElement('a');a.className='writer_nikcon feedback-badge';a.innerHTML='<img src="/__testbed/feedback-badges/'+file+'" alt="합성 회원 마크">';scope.append(a);const n=a.firstChild;window.__feedbackBadgeOriginals.push({node:n,parent:a,src:n.src})}});
  });
  await p.locator('.feedback-badge img').evaluateAll(ns=>Promise.all(ns.map(n=>n.decode())));await paint(p);
  const records=await p.locator('.feedback-badge img').evaluateAll(ns=>ns.map(n=>{const s=getComputedStyle(n),r=n.getBoundingClientRect();return {src:n.getAttribute('src'),w:s.width,h:s.height,padding:s.padding,box:{width:r.width,height:r.height},loaded:n.complete&&n.naturalWidth>0}}));
  const defects=records.filter(r=>!r.loaded||(r.src.endsWith('classic.svg')?!['11px','13px'].includes(r.h):r.w!=='0px'||r.h!=='0px'||r.box.width<=0||r.box.height<=0));
  if(!observeOnly)assert.deepEqual(defects,[],'Native padded sprites remain zero-content;ordinary fallback stays13px');
  if(!observeOnly){
   await p.locator('.feedback-badge img[src$="fix_nik.gif"]').filter({visible:true}).first().evaluate(n=>{n.dataset.feedbackDelayedSprite='1';for(const[k,v]of[['width','auto'],['height','13px'],['max-width','none']])n.style.setProperty(k,v,'important')});
   // Exercise the existing resize normalization hook,not an invented
   // attribute observer or a claim that every arbitrary style write is watched.
   await p.setViewportSize({width:981,height:900});
   await p.waitForFunction(()=>{const n=document.querySelector('[data-feedback-delayed-sprite]');return getComputedStyle(n).width==='0px'&&getComputedStyle(n).height==='0px'&&!n.style.width&&!n.style.height});
  }
  assert.ok(await p.evaluate(()=>__feedbackBadgeOriginals.every(o=>o.node.isConnected&&o.node.parentNode===o.parent&&o.node.src===o.src)),'Native badge identities/art unchanged');await onCapture?.(e);assertNoRuntimeErrors(await getMetrics(p),e.consoleErrors);return {records,defects};
 }finally{await e.close()}
}

export async function runPreviewFeedbackContract({browser,server,observeOnly=false,onCapture}) {
 const records=[];
 for(const state of [{width:980,height:900},{width:980,height:900,dark:true},{width:390,height:560,dark:true}]) {
  const e=await createConvenienceState(browser,server,{viewport:{width:state.width,height:state.height},sheet:false,dark:state.dark}),p=e.page;
  try {
   const root=p.locator('#dcuf-post-preview'),link=root.locator('.dcuf-preview-head a'),original=await link.getAttribute('href');
   const material=await link.evaluate(n=>{const s=getComputedStyle(n),r=n.getBoundingClientRect();return {border:s.borderWidth,ink:s.color,background:s.backgroundImage+'|'+s.backgroundColor,radius:s.borderRadius,width:r.width,height:r.height,backdrop:getComputedStyle(n.closest('.dcuf-preview-panel')).backdropFilter}});
   if(!observeOnly){assert.equal(material.border,'0px','Preview action has no outlined edge');assert.match(material.backdrop,/blur/);assert.ok(await hit(link),'Original link reachable');assert.ok((await renderedLabelContrast(p,'#dcuf-post-preview .dcuf-preview-head a')).min>=4.5,'Preview link ink contrast');assert.ok(await root.locator('img').evaluate(n=>n.complete&&n.naturalWidth===640),'Preview image still decoded');assert.equal(await link.getAttribute('href'),original,'Original navigation destination preserved');}
   await onCapture?.(e,{...state,kind:'preview'});await root.getByRole('button',{name:'미리보기 닫기',exact:true}).click();await root.waitFor({state:'detached'});records.push({state,material,href:original});
  }finally{await e.close()}
 }
 return {records,defects:[]};
}
