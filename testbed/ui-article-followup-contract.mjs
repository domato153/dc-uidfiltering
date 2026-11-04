import assert from 'node:assert/strict';
import {mountArticleV7State} from './ui-b1-article-v7-contract.mjs';
import {createTestPage,storageKeys} from './harness/runner-utils.mjs';
import {mountB1NativeFixture} from './fixtures/b1-native-list.mjs';
import {installLiveControlFixture} from './ui-live-control-contract.mjs';
import {createAuthorState} from './ui-b1-native-author-contract.mjs';
import {renderedLabelContrast} from './ui-control-material-contract.mjs';

// Public common.css/comment.js topology observed2026-11-03;synthetic content.
export function mountNativeFollowupShape() {
 for(const sheet of document.styleSheets)if(sheet.href?.endsWith('/__testbed/fixture.css'))for(let i=sheet.cssRules.length-1;i>=0;i--)if(sheet.cssRules[i].selectorText==='.comment_dccon')sheet.deleteRule(i);
 const style=document.createElement('style');
 style.textContent='.gallview_head{margin:16px 0 29px;padding:0 0 11px}.gallview_head .title{margin-bottom:7px;padding:0 2px}.gallview_head .gall_writer{padding:0 2px}.gall_writer>.fl{float:left}.gall_writer>.fr{float:right}.cmt_txtbox{float:left;width:820px}.addbox .cmt_txtbox{width:800px}.cmt_write_box.small .cmt_txt_cont textarea{width:927px}.comment_wrap .bottom_paging_box{margin-top:18px;border-top:1px solid #eee}.clear::after{content:"";display:block;clear:both}';
 document.head.prepend(style);
 const article=document.querySelector('[data-dcuf-role="article"]');
 let header=article.querySelector(':scope > header');if(!header){header=document.createElement('header');article.prepend(header)}
 article.querySelector('.gallview_head')?.remove();
 header.innerHTML='<div class="gallview_head"><h3 class="title"><span class="title_headtext">[일반]</span><span class="title_subject">긴 제목도 자연스럽게 이어지는 글 제목</span></h3><div class="gall_writer"><div class="fl"><span class="nickname">작성자</span><span class="gall_date">2026.11.03 23:27</span></div><div class="fr"><span class="gall_scrap"><button>스크랩</button></span><span class="gall_count">조회 3</span><span class="gall_recommend">추천 0</span><span class="gall_comment">댓글 1</span></div></div></div>';
 const root=document.querySelector('#focus_cmt'),list=root.querySelector('.cmt_list');
 const composer=root.querySelector('.cmt_write_box.small');composer.remove();
 const media='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" rx="8" fill="%233f4890"/%3E%3Ctext x="50" y="62" font-size="28" text-anchor="middle" fill="white"%3EWOW%3C/text%3E%3C/svg%3E';
 const nick=name=>'<div class="cmt_nickbox"><span class="gall_writer"><span class="nickname">'+name+'</span></span></div>';
 const meta='<div class="fr clear"><span class="date_time">11.03 23:27</span></div>';
 list.innerHTML='<li id="comment_li_101"><div class="cmt_info"><div class="addbox">'+nick('일반 작성자')+'<div class="cmt_txtbox"><div class="comment_dccon clear"><div class="coment_dccon_img"><img class="written_dccon" width="100" height="100" src=\''+media+'\' alt="합성 스티커"></div></div></div></div>'+meta+'</div></li>'+
 '<li id="reply_li_101"><div class="reply show"><div class="reply_box"><ul class="reply_list"><li id="reply_li_201"><div class="reply_info"><div class="addbox">'+nick('답글 작성자')+'<div class="cmt_txtbox"><p class="usertxt">닉네임과 대댓글 본문이 자연스럽게 정렬됩니다.</p></div></div>'+meta+'</div></li></ul></div></div></li>'+
 '<li id="comment_li_102"><div class="cmt_info"><div class="addbox">'+nick('다음 작성자')+'<div class="cmt_txtbox"><p class="usertxt">대댓글 묶음 다음에는 구분선이 보입니다.</p></div></div>'+meta+'</div></li>';
 const reply=root.querySelector('.reply_info');root.querySelector('.reply_box').append(composer);composer.querySelector('textarea').style.width='927px';
 const footer=document.createElement('div');footer.className='bottom_paging_box';footer.innerHTML='<div class="cmt_paging">1</div><div class="cmt_inner"><a href="#container" class="contgo">본문 보기</a><button class="btn_cmt_close">댓글닫기</button><button class="btn_cmt_refresh">새로고침</button></div>';
 root.querySelector('.comment_box').append(footer);
 window.__followupNative=[...reply.querySelectorAll('*'),...header.querySelectorAll('*')].map(node=>({node,parent:node.parentNode}));
}
const paint=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
export async function runHeaderResumeContract({browser,server}) {
 const records=[];
 for(const viewport of [{width:1630,height:900},{width:980,height:2306}]){
  const e=await createTestPage(browser,server.baseUrl,{viewport,storage:{[storageKeys.threshold]:0},boot:{criticalDeadlineMs:700,absoluteDeadlineMs:3000,revealTimeoutMs:2500}}),p=e.page;
  try{
   // Live DCInside wraps header and page content in the same dcwrap. The old
   // generic fixture placed its header outside that wrapper and missed canvas loss.
   await p.route(url=>url.origin===server.baseUrl&&/\/board\/lists$/.test(url.pathname),async route=>{const response=await route.fetch();let html=await response.text();const wrapper='<div id="top" class="dcwrap width1160 list_wrap">';assert.ok(html.includes(wrapper));html=html.replace(wrapper,'').replace(/(<body[^>]*>)/,'$1'+wrapper);await route.fulfill({response,body:html})});
   // Background tabs can suspend frames while wall-clock boot deadlines keep
   // advancing. Hold only rendering callbacks,then resume the original ones.
   await e.context.addInitScript(()=>{
    const request=window.requestAnimationFrame,cancel=window.cancelAnimationFrame,pending=new Map();let next=-1,released=false;
    window.requestAnimationFrame=fn=>{if(released)return request.call(window,fn);const id=next--;pending.set(id,fn);return id};
    window.cancelAnimationFrame=id=>{if(id<0)pending.delete(id);else cancel.call(window,id)};
    window.__resumeHeaderFrames=()=>{released=true;window.requestAnimationFrame=request;window.cancelAnimationFrame=cancel;for(const fn of pending.values())request.call(window,fn);pending.clear()};
   });
   await e.goto('/mgallery/board/lists?id=test',{waitForReady:false});
   await p.locator('[data-dcuf-header-shell-role="root"]').waitFor({state:'attached'});
   const canvas=()=>p.locator('#top').evaluate(n=>{const s=getComputedStyle(n);return{marked:n.hasAttribute('data-dcuf-header-layout'),containsContent:!!n.querySelector('#container'),background:s.backgroundColor+'|'+s.backgroundImage}});
   const originalCanvas=await canvas();assert.equal(originalCanvas.marked,true);assert.equal(originalCanvas.containsContent,true);
   await p.waitForFunction(()=>__dcufBootController.state==='degraded',null,{polling:20,timeout:5000});
   const lost=await p.evaluate(()=>({filterReady:__dcufBootController.filterReady,roots:__dcufHeaderShellHostAdapter.snapshot().activeRoots,style:!!document.getElementById('dcuf-header-shell-style')}));
   assert.equal(lost.filterReady,true,'Local filtering completed before the delayed visual deadline');assert.equal(lost.roots,0,'The existing rollback actually ran');assert.equal(lost.style,false);
   const lostCanvas=await canvas();assert.notEqual(lostCanvas.background,originalCanvas.background,'The same rollback reproduces the page-wide washed-out canvas');
   await p.evaluate(()=>__resumeHeaderFrames());
   await p.waitForFunction(()=>__dcufBootController.state==='ready',null,{polling:20,timeout:8000});await paint(p);
   await p.waitForFunction(()=>window.__dcufRevealDebug?.recovery?.active===false&&__dcufHeaderRecentVisitHostAdapter.snapshotResources().timers===0&&__dcufHeaderRecentVisitHostAdapter.snapshotResources().animationFrames===0,null,{polling:20,timeout:6000});
   const recovered=await p.evaluate(()=>({events:__dcufBootProbe.events().map(e=>e.type),resources:[__dcufHeaderShellHostAdapter,__dcufGalleryPageHeadHostAdapter,__dcufHeaderGnbHostAdapter,__dcufHeaderRecentVisitHostAdapter].map(a=>a.snapshotResources()),styles:['dcuf-header-shell-style','dcuf-gallery-page-head-style','dcuf-header-gnb-style','dcuf-header-recent-visit-style'].map(id=>document.querySelectorAll('#'+id).length),listContext:document.body.hasAttribute('data-dcuf-list-header')}));
   assert.deepEqual(recovered.events,['degraded','ready']);
   assert.ok(recovered.resources.every(r=>r.activeRoots>0&&r.mutationSubscribers===1),'Ready after suspended rendering restores all four header owners: '+JSON.stringify(recovered));
   assert.deepEqual(recovered.styles,[1,1,1,1]);assert.equal(recovered.listContext,true);
   assert.deepEqual(await canvas(),originalCanvas,'Ready restores the shared whole-page canvas,not only header geometry');
   await p.evaluate(()=>document.getElementById('dcuf-testbed-controls')?.remove());
   await p.locator('[data-dcuf-explore-toggle]').click();assert.equal(await p.locator('.gnb_list').isVisible(),true);await p.keyboard.press('Escape');
   for(let i=0;i<2;i++)await p.evaluate(async()=>{let visibility='hidden';Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>visibility});document.dispatchEvent(new Event('visibilitychange'));visibility='visible';document.dispatchEvent(new Event('visibilitychange'));await window.__dcufFilterModule?._visibilityRecoveryPromise;delete document.visibilityState;__dcufBootController.markReady('repeat-ready');});
   await paint(p);
   const repeated=await p.evaluate(()=>[__dcufHeaderShellHostAdapter,__dcufGalleryPageHeadHostAdapter,__dcufHeaderGnbHostAdapter,__dcufHeaderRecentVisitHostAdapter].map(a=>a.snapshotResources()));
   assert.deepEqual(repeated,recovered.resources,'Repeated visible/ready transitions do not duplicate header listeners/subscribers');
   records.push({viewport,lost,recovered,originalCanvas,lostCanvas});
  }finally{await e.close()}
 }
 return records;
}
export async function runArticleFollowupContract({browser,server,onCapture}) {
 const records=[];
 for(const state of[{width:1630,height:900},{width:980,height:2306,dark:true},{width:390,height:760}]){
  const {e}=await mountArticleV7State(browser,server,state),p=e.page;
  try{
   await p.evaluate(mountNativeFollowupShape);
   await p.locator('#focus_cmt .reply_info > [data-dcuf-role="comment-content-stack"]').waitFor();await paint(p);
   const measure=await p.evaluate(()=>{
    const b=n=>n.getBoundingClientRect().toJSON(),reply=document.querySelector('#focus_cmt .reply_info'),author=reply.querySelector('.cmt_nickbox'),body=reply.querySelector('.cmt_txtbox'),ta=document.querySelector('#focus_cmt .cmt_write_box.small textarea'),input=ta.closest('.cmt_write');
    const info=document.querySelector('#focus_cmt .cmt_info'),meta=info.querySelector('.fr'),img=info.querySelector('img');
    const h=document.querySelector('[data-dcuf-role="article-header-shell"]'),m=h.querySelector('.gall_writer'),t=h.querySelector('.title');
    return {author:b(author),body:b(body),textarea:b(ta),input:b(input),info:b(info),meta:b(meta),media:b(img),header:b(h),head:b(h.firstElementChild),title:b(t),metadata:b(m),footer:getComputedStyle(document.querySelector('#focus_cmt .bottom_paging_box')).marginTop,preserved:__followupNative.every(o=>o.node.parentNode===o.parent)};
   });
   assert.ok(measure.author.x<=measure.body.x+1,'Reply author remains on the left');
   assert.ok(measure.body.right<=state.width,'Reply body contained');
   assert.ok(Math.abs(measure.textarea.width-measure.input.width)<=2,'Reply editor fills its column,not only a maximum-width cap');
   assert.ok(measure.media.width>=99&&measure.media.height>=99,'Native100px sticker is preserved '+JSON.stringify(measure.media));
   assert.ok(measure.info.height<=measure.media.height+40,'Sticker row fits content instead of a second full metadata row');
   assert.ok(measure.metadata.height>=20,'Metadata parent contains its children');
   assert.ok(measure.metadata.y>=measure.title.bottom+7,'Title and metadata have breathing space');
   const boundaries=await p.locator('#focus_cmt .cmt_list > [data-dcuf-role="comment-item"] ~ [data-dcuf-role="comment-item"]').evaluateAll(ns=>ns.map(n=>getComputedStyle(n).borderTopWidth));
   assert.ok(boundaries.length>0&&boundaries.every(x=>x==='1px'),'Next parent comment has a boundary after any intervening reply shell');
   assert.equal(measure.footer,'0px','No18px duplicate-footer gap');assert.equal(measure.preserved,true);
   await onCapture?.(e,'article',state);
   records.push({state,measure});
  }finally{await e.close()}
 }
 return records;
}

export async function runHeaderFollowupContract({browser,server,onCapture}) {
 const records=[];
 for(const state of[{width:1630,height:900},{width:1158,height:900},{width:980,height:2306,dark:true},{width:390,height:760}]){
  const e=await createTestPage(browser,server.baseUrl,{viewport:state,storage:{[storageKeys.threshold]:0,[storageKeys.palette]:'teal'}}),p=e.page;
  try{
   await mountB1NativeFixture(e,server.baseUrl,{dark:state.dark});await p.evaluate(installLiveControlFixture);
   await p.evaluate(()=>{
    const carrier=document.createElement('div');carrier.className='issuebox gallery_box';document.querySelector('.issue_wrap').prepend(carrier);
    const native=document.createElement('style');native.textContent='.issuebox.gallery_box{margin:0 0 15px}';document.head.prepend(native);
    const right=document.querySelector('.page_head > .fr');
    for(const cls of ['relate','adr_copy','gall_useinfo'])if(!right.querySelector('.'+cls)){const n=document.createElement('button');n.type='button';n.className=cls;n.textContent=cls;right.append(n)}
    window.__followupActions=[...right.querySelectorAll('.relate,.adr_copy,.gall_useinfo')].map(node=>({node,parent:node.parentNode}));
   });
   await p.locator('[data-dcuf-gallery-more-toggle]').waitFor();await paint(p);
   await p.locator('[data-dcuf-header-drawer-part="carrier"]').waitFor({state:'attached'});
   assert.equal(await p.locator('[data-dcuf-header-drawer-part="carrier"]').evaluate(n=>getComputedStyle(n).marginBottom),'0px','Empty native door carrier cannot split the unified header plate');
   // The fixture inserted native parts after boot; measure only after their
   // existing owner projection has settled,as the ordinary resize path does.
   await p.evaluate(()=>window.dispatchEvent(new Event('resize')));await paint(p);
   const glass=p.locator('[data-dcuf-surface="list-toolbar"]');
   const backing=()=>glass.evaluate(n=>{const s=getComputedStyle(n,'::before'),r=getComputedStyle(n);return{content:s.content,background:s.backgroundColor+'|'+s.backgroundImage,blur:s.backdropFilter,mask:s.maskImage,pointer:s.pointerEvents,border:s.borderTopWidth,shadow:s.boxShadow,rootBlur:r.backdropFilter}});
   const firstBacking=await backing();
   assert.equal(firstBacking.content,'""','List-top toolbar has its owned glass backing');
   assert.equal(firstBacking.pointer,'none','Glass paint cannot intercept input');
   assert.ok(firstBacking.blur.includes('blur(')&&firstBacking.background.includes('linear-gradient'),'Glass uses the existing blur plus a soft vertical surface fade');
   if(state.dark)assert.ok(firstBacking.mask.includes('linear-gradient'),'Dark retains its earlier soft masked face');
   else assert.equal(firstBacking.mask,'none','Light tint uses an alpha fade without masking away its backdrop blur');
   assert.equal(firstBacking.border,'0px');assert.equal(firstBacking.shadow,'none','No new rule/rim or outlined shadow');assert.equal(firstBacking.rootBlur,'none','Native popup ancestors acquire no new filter');
   const paletteFaces=[];
   for(const id of ['blue','purple','green','orange','mono','indigo','sky','cyan','teal','lime','amber','red','rose','pink']){
    await p.evaluate(()=>__dcufTestbedGM.invokeMenu('UI 색상 설정'));const panel=p.locator('#dcuf-palette-panel');await panel.locator('[data-palette-id="'+id+'"]').click();await paint(p);paletteFaces.push((await backing()).background);await panel.locator('[data-dcuf-palette-action="cancel"]').click();await panel.waitFor({state:'detached'});await paint(p);assert.deepEqual(await backing(),firstBacking,'Palette cancel restores toolbar material');
   }
   assert.equal(new Set(paletteFaces).size,14,'All14 actual palette previews reach the glass tint');
   await p.evaluate(()=>__dcufTestbedGM.invokeMenu('UI 색상 설정'));let palette=p.locator('#dcuf-palette-panel');await palette.locator('[data-palette-id="orange"]').click();await paint(p);const orangePreview=await backing();await palette.locator('[data-dcuf-palette-action="save"]').click();await palette.waitFor({state:'detached'});await paint(p);assert.deepEqual(await backing(),orangePreview,'Saved tint matches its actual palette preview');
   await p.evaluate(()=>__dcufTestbedGM.invokeMenu('UI 색상 설정'));palette=p.locator('#dcuf-palette-panel');await palette.locator('[data-palette-id="purple"]').click();await palette.locator('[data-dcuf-palette-action="cancel"]').click();await palette.waitFor({state:'detached'});await paint(p);assert.deepEqual(await backing(),orangePreview,'Cancel returns to the saved tint');
   await p.evaluate(()=>__dcufTestbedGM.invokeMenu('UI 색상 설정'));palette=p.locator('#dcuf-palette-panel');await palette.locator('[data-palette-id="teal"]').click();await palette.locator('[data-dcuf-palette-action="save"]').click();await palette.waitFor({state:'detached'});await paint(p);assert.deepEqual(await backing(),firstBacking);
   const galleryBefore=await p.locator('[data-dcuf-gallery-page-head-role="root"]').evaluateAll(ns=>ns.map(n=>({padding:getComputedStyle(n).padding,box:n.getBoundingClientRect().toJSON()})));
   // User2026-11-04: a later DCMOD stylesheet supplies this exact important
   // longhand. It must not undo the list-only owner after the first good paint.
   await p.evaluate(()=>{const s=document.createElement('style');s.textContent='.page_head { padding-top: 4px !important; }';document.head.append(s)});await paint(p);
   const galleryAfter=await p.locator('[data-dcuf-gallery-page-head-role="root"]').evaluateAll(ns=>ns.map(n=>({padding:getComputedStyle(n).padding,box:n.getBoundingClientRect().toJSON()})));
   assert.ok(galleryBefore.length>0,'A rendered gallery header is required');
   for(let i=0;i<galleryBefore.length;i++){
    assert.equal(galleryAfter[i].padding,galleryBefore[i].padding,'Late external important padding cannot revert the adopted gallery-row spacing');
    assert.deepEqual(galleryAfter[i].box,galleryBefore[i].box,'Late external padding cannot shift gallery-row geometry');
   }
   const frame=await p.evaluate(()=>{const layout=document.querySelector('[data-dcuf-header-layout]'),s=getComputedStyle(layout,'::before'),gallery=document.querySelector('[data-dcuf-gallery-page-head-role="root"]'),toolbar=document.querySelector('[data-dcuf-surface="list-toolbar"]');return{bottom:layout.getBoundingClientRect().top+parseFloat(s.marginTop)+parseFloat(s.height),toolbarBottom:toolbar.getBoundingClientRect().bottom,galleryBorder:getComputedStyle(gallery).borderLeftWidth,toolbarBorder:getComputedStyle(toolbar).borderLeftWidth}});
   assert.ok(Math.abs(frame.bottom-frame.toolbarBottom)<2,'One header frame spans all three tiers: '+JSON.stringify(frame));assert.equal(frame.galleryBorder,'0px');assert.equal(frame.toolbarBorder,'0px');
   const chrome=await p.evaluate(()=>{const layout=document.querySelector('[data-dcuf-header-layout]'),box=layout.getBoundingClientRect(),height=parseFloat(getComputedStyle(layout).gridTemplateRows),top=box.top+parseFloat(getComputedStyle(layout,'::before').marginTop),center=(top+box.top+height)/2;return{center,searchCenter:innerWidth<900?box.top+height+24:center,items:['[data-dcuf-header-shell-role="logo"]','[data-dcuf-explore-toggle]','[data-dcuf-header-shell-role="links"]','[data-dcuf-header-shell-role="top-search"]','[data-dcuf-header-recent-visit-role="root"] > .btn_open'].map(selector=>{const n=document.querySelector(selector),r=n.getBoundingClientRect();return{selector,center:r.y+r.height/2,area:r.width*r.height}})}});
   for(const item of chrome.items){const expected=/top-search|recent-visit/.test(item.selector)?chrome.searchCenter:chrome.center;assert.ok(item.area>0&&Math.abs(item.center-expected)<=1,'Global header controls center within the visible plate: '+JSON.stringify({item,expected}));}
   const recent=p.locator('[data-dcuf-header-recent-visit-role="root"] > .btn_open');await recent.click();const history=p.locator('#visit_history_lyr');await history.waitFor({state:'visible'});const historyBox=await history.boundingBox();assert.ok(historyBox.width>0&&historyBox.height>0&&historyBox.x>=0&&historyBox.x+historyBox.width<=state.width+1,'Moved recent-visit control keeps its original popup visible and contained');await recent.click();
   const destinations=await p.locator('.gnb_list > li > a').evaluateAll(ns=>ns.map(n=>n.getAttribute('href')));
   await p.locator('[data-dcuf-explore-toggle]').click();await p.locator('.gnb_list').waitFor({state:'visible'});
   assert.ok((await p.locator('.gnb_list').boundingBox()).height>30);await p.keyboard.press('Escape');await paint(p);
   assert.equal(await p.locator('[data-dcuf-explore-toggle]').getAttribute('aria-expanded'),'false');
   await p.locator('[data-dcuf-gallery-more-toggle]').click();
   const actions=p.locator('.page_head > .fr > [data-dcuf-gallery-more-index]');
   for(const n of await actions.all())assert.equal(await n.isVisible(),true);
   assert.equal(await p.evaluate(()=>__followupActions.every(o=>o.node.parentNode===o.parent)),true,'Native action parent identity');
   await actions.first().evaluate(n=>n.onclick=()=>{});await p.keyboard.press('Enter');
   assert.equal(await p.locator('[data-dcuf-gallery-more-toggle]').evaluate(n=>n===document.activeElement),true,'Closing native action returns keyboard focus');
   await p.locator('[data-dcuf-gallery-more-toggle]').click();
   await p.keyboard.press('Escape');assert.equal(await actions.first().isVisible(),false);
   await p.evaluate(()=>{document.querySelector('#relation_popup')?.remove();const popup=document.createElement('div');popup.id='relation_popup';popup.style.cssText='position:absolute;display:block;left:1px;top:900px';popup.innerHTML='<div class="pop_content"><div class="pop_head"><h3>연관 갤러리</h3></div><div class="following inner">연관 목록</div></div>';document.querySelector('.issue_wrap').append(popup)});await paint(p);
   const relation=await p.locator('#relation_popup').boundingBox(),more=await p.locator('[data-dcuf-gallery-more-toggle]').boundingBox();
   assert.ok(Math.abs(relation.y-more.y-more.height-8)<=2,'Related gallery starts below its visible More trigger: '+JSON.stringify({relation,more}));
   await p.evaluate(()=>document.querySelector('#relation_popup').remove());
   await p.evaluate(()=>{document.querySelector('.gnb_bar').replaceWith(document.querySelector('.gnb_bar').cloneNode(true));const right=document.querySelector('.page_head > .fr');right.replaceWith(right.cloneNode(true));});await paint(p);
   await p.locator('[data-dcuf-explore-toggle]').click();await p.locator('.gnb_list').waitFor({state:'visible'});
   assert.equal(await p.locator('[data-dcuf-explore-toggle]').count(),1);assert.deepEqual(await p.locator('.gnb_list > li > a').evaluateAll(ns=>ns.map(n=>n.getAttribute('href'))),destinations);
   await p.keyboard.press('Escape');await p.locator('[data-dcuf-gallery-more-toggle]').click();assert.equal(await p.locator('[data-dcuf-gallery-more-toggle]').count(),1);await p.keyboard.press('Escape');
   const invoker=p.locator('[data-dcuf-role="category-invoker"]');await invoker.click();
   const picker=p.locator('[data-dcuf-role="category-shell"]');await picker.waitFor({state:'visible'});
   const toggle=p.locator('[data-dcuf-role="category-toggle"]');await toggle.click();
   const menu=p.locator('[data-dcuf-role="category-popup"]');await menu.waitFor({state:'visible'});
   const a=await toggle.boundingBox(),b=await menu.boundingBox(),outer=await picker.boundingBox();assert.ok(b.x>=outer.x&&b.x+b.width<=outer.x+outer.width,'Original overflow stays inside the anchored category picker');
   await onCapture?.(e,'category',state);await toggle.click();await p.keyboard.press('Escape');await p.locator('body').click({position:{x:2,y:Math.min(250,state.height-10)}});
   await p.evaluate(()=>{const tail=document.createElement('div');tail.style.height='4000px';document.body.append(tail);document.activeElement?.blur();});
   const toolbar=p.locator('[data-dcuf-surface="list-toolbar"]');
   for(const y of [300,500,700]){await p.evaluate(y=>scrollTo(0,y),y);await paint(p)}
   assert.equal(await toolbar.getAttribute('data-dcuf-scroll'),'hidden','Existing down-scroll behavior');
   for(const y of [650,600,550]){await p.evaluate(y=>scrollTo(0,y),y);await paint(p)}
   assert.equal(await toolbar.getAttribute('data-dcuf-scroll'),'shown','Existing up-scroll reappears');
   assert.equal(await toolbar.evaluate(n=>getComputedStyle(n,'::before').content),'none','Floating toolbar retains its original independent surface');
   assert.equal(await invoker.isVisible(),false,'Reappearing toolbar keeps its original category strip');
   assert.equal(await p.locator('[data-dcuf-role="category-list"]').isVisible(),true);
   assert.equal(await picker.getAttribute('popover'),null,'The floating toolbar uses original inline controls');
   await onCapture?.(e,'scroll',state);
   for(const y of [650,750,850]){await p.evaluate(y=>scrollTo(0,y),y);await paint(p)}
   assert.equal(await toolbar.getAttribute('data-dcuf-scroll'),'hidden','Down again hides');
   records.push({state,destinations:destinations.length,category:{a,b},scroll:'down/up/down'});
  }finally{await e.close()}
 }
 return records;
}

export async function runAuthorPlacementFollowup({browser,server,onCapture}) {
 const records=[];
 for(const state of[{path:'/board/view?id=test&no=9001',location:'comment',viewport:{width:1630,height:900}},{path:'/board/view?id=test&no=9001',location:'comment',dark:true,viewport:{width:980,height:2306}},{path:'/board/view?id=test&no=9001',location:'comment',viewport:{width:390,height:760}}]){
  const e=await createAuthorState(browser,server,state),p=e.page;
  try{
   // Install before input;awaiting the automation click first could miss a paint.
   await p.evaluate(()=>{window.__firstAuthorFrame=new Promise(resolve=>document.addEventListener('click',()=>requestAnimationFrame(()=>{
    const n=[...document.querySelectorAll('.user_data.add > .user_data_list')].find(n=>n.getBoundingClientRect().width>0),a=n.closest('.gall_writer');
    const b=n.getBoundingClientRect(),r=a.getBoundingClientRect();resolve({projected:n.classList.contains('dcuf-native-author-menu'),box:b.toJSON(),anchor:r.toJSON(),vh:innerHeight,ch:document.documentElement.clientHeight,style:n.style.cssText,hit:n.contains(document.elementFromPoint(b.x+b.width/2,b.y+75))});
   }),{once:true,capture:true}));});
   await p.locator('.nickname em').filter({hasText:'합성 이용자'}).filter({visible:true}).click();
   const first=await p.evaluate(()=>window.__firstAuthorFrame);
   assert.equal(first.projected,true,'Native menu material projected before first frame');
   assert.ok(first.box.x>=0&&first.box.right<=state.viewport.width,'Author menu contained');
   assert.ok(first.box.y>=0&&first.box.bottom<=state.viewport.height,'Author menu vertically contained: '+JSON.stringify(first));
   assert.ok(Math.min(Math.abs(first.box.x-first.anchor.right),Math.abs(first.box.right-first.anchor.x),Math.abs(first.box.bottom-first.anchor.y),Math.abs(first.box.y-first.anchor.bottom))<=24,'Author menu stays adjacent to nickname,with above/below fallback: '+JSON.stringify(first));
   assert.equal(first.hit,true,'Native author action reachable');await onCapture?.(e,'author',state);records.push({state,first});
  }finally{await e.close()}
 }
 return records;
}

export async function runFabMaterialFollowup({browser,server}) {
 const records=[];
 for(const dark of[false,true]){
  const e=await createTestPage(browser,server.baseUrl,{storage:{[storageKeys.threshold]:0,[storageKeys.palette]:'teal',[storageKeys.convenience]:{postPreview:false}}}),p=e.page;
  try{
   await e.goto('/board/lists?id=test');if(dark)await p.evaluate(()=>window.__dcufFixture.toggleDark(true));
   const fab=p.locator('#dc-personal-block-fab'),read=()=>fab.evaluate(n=>{const s=getComputedStyle(n),probe=document.createElement('span');probe.style.color='var(--dcuf-v7-primary-ink)';n.append(probe);const expected=getComputedStyle(probe).color;probe.remove();return{background:s.backgroundColor+'|'+s.backgroundImage,ink:s.color,expected}});
   const faces=[];
   for(const id of['blue','purple','green','orange','mono','indigo','sky','cyan','teal','lime','amber','red','rose','pink']){
    await p.evaluate(()=>window.__dcufTestbedGM.invokeMenu('UI 색상 설정'));const panel=p.locator('#dcuf-palette-panel');await panel.locator('[data-palette-id="'+id+'"]').click();const preview=await read();await panel.locator('[data-dcuf-palette-action="save"]').click();await panel.waitFor({state:'detached'});await paint(p);
    const saved=await read();assert.deepEqual(saved,preview,'FAB palette preview/save agree');assert.equal(saved.ink,saved.expected,'FAB uses the common paired ink,including body-only dark state');
    const contrast=await renderedLabelContrast(p,'#dc-personal-block-fab',{glyphMask:true});assert.ok(contrast.min>=4.5,'FAB contrast '+id+'/'+dark+': '+contrast.min);faces.push(saved.background);records.push({id,dark,min:contrast.min});
   }
   assert.equal(new Set(faces).size,14,'All14 theme colors reach the FAB');
  }finally{await e.close()}
 }
 return records;
}
