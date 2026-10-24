import {assert,createTestPage,storageKeys,assertNoRuntimeErrors,getMetrics} from './harness/runner-utils.mjs';
import {articleActionHtml,articleActionHostCss,mountArticleActionFixture} from './fixtures/b1-article-actions.mjs';

export async function runB1ArticleActionsContract({browser,server}) {
 const records=[];
 for(const[width,height,dark]of[[980,900,false],[980,900,true],[980,2306,false],[390,520,true]]){
  const e=await createTestPage(browser,server.baseUrl,{viewport:{width,height},storage:{[storageKeys.threshold]:0,[storageKeys.palette]:'teal'}});
  try{
   await e.page.route(url=>url.origin===server.baseUrl&&url.pathname==='/board/view',async route=>{const response=await route.fetch(),html=(await response.text()).replace(/<body\b[^>]*>/,s=>s+'<div class="dcwrap width1160">').replace('</body>','</div></body>');await route.fulfill({response,body:html});});
   await e.goto('/board/view?id=test&no=1001&comments=2');
   await e.page.evaluate(mountArticleActionFixture,{html:articleActionHtml,css:articleActionHostCss});
   if(dark)await e.page.evaluate(()=>window.__dcufFixture.toggleDark(true));
   for(const kind of ['share','realbest','report','scrap','pum']){
    await e.page.locator(`[data-action-fixture="${kind}"]`).click();
    const popup=e.page.locator(`[data-fixture-root="${kind}"]`);
    await e.page.waitForFunction(kind=>document.querySelector(`[data-fixture-root="${kind}"]`)?.getAttribute('data-dcuf-article-popup')===kind,kind,{timeout:4000});
    const title=popup.locator('[data-dcuf-article-part="title"]').first();await title.waitFor({state:'visible'});
    const control=popup.locator('[data-dcuf-article-part="close"]').last();await control.scrollIntoViewIfNeeded();
    const m=await popup.evaluate(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n),p=n.querySelector(':scope > .pop_content'),t=n.querySelector('[data-dcuf-article-part="title"]'),c=Array.from(n.querySelectorAll('[data-dcuf-article-part="close"]')).find(el=>el.closest('[data-dcuf-article-popup]')===n),a=c.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,blur:s.backdropFilter,background:s.backgroundColor,sheen:s.backgroundImage,radius:parseFloat(s.borderRadius),panel:getComputedStyle(p).backgroundColor,titleWidth:t.getBoundingClientRect().width,closeWidth:a.width,closeHeight:a.height,closeHit:c.contains(document.elementFromPoint(a.x+a.width/2,a.y+a.height/2)),overflow:n.scrollWidth-n.clientWidth};});
    assert.ok(m.left>=-1&&m.right<=width+1&&m.top>=-1&&m.bottom<=height+1,JSON.stringify({kind,...m}));
    assert.ok(m.overflow<=1&&m.titleWidth>20&&m.closeWidth>=32&&m.closeHeight>=32&&m.closeHit,JSON.stringify({kind,...m}));
    assert.ok(m.blur!=='none'&&m.sheen!=='none'&&m.radius>=14,'The family uses the selected backing/sheens/rim, not an opaque native panel');
    assert.equal(m.panel,'rgba(0, 0, 0, 0)');
    assert.deepEqual(await popup.evaluate(n=>{const s=getComputedStyle(n),probe=document.createElement('span');probe.style.border='1px solid var(--dcuf-b1-rim)';n.append(probe);const rim=getComputedStyle(probe).borderTopColor;probe.remove();return{rim:s.borderTopColor===rim,width:s.borderTopWidth}}),{rim:true,width:'1px'},'Native type2/type3 blue root borders cannot replace the selected B1 rim');
    assert.deepEqual(await popup.evaluate(n=>{const h=n.querySelector('[data-dcuf-article-part="head"]'),t=h.querySelector('h3');return{head:getComputedStyle(h).backgroundColor,title:getComputedStyle(t).color===getComputedStyle(n).color}}),{head:'rgba(0, 0, 0, 0)',title:true},'The original opaque blue header cannot replace the chosen transparent title band');
    if(width<640)assert.ok(m.bottom<=height-104,'Persistent menu clearance remains available');
    assert.equal(await e.page.evaluate(()=>window.__actionFixture.originals.every(({node,parent,handler,focus})=>node.isConnected&&node.parentNode===parent&&node.onclick===handler&&node.onfocus===focus)),true,'Original controls/parents/handlers remain intact');
    if(process.env.DCUF_ACTIONS_CAPTURE){const {mkdir}=await import('node:fs/promises');await mkdir(process.env.DCUF_ACTIONS_CAPTURE,{recursive:true});await popup.evaluate(n=>{n.scrollTop=0});await e.page.screenshot({path:`${process.env.DCUF_ACTIONS_CAPTURE}/${kind}-${width}-${height}-${dark?'dark':'light'}.png`});}
    if(kind==='share'){
     assert.equal(await popup.locator('.sns_share_btn').count(),3);assert.equal(await popup.locator('#exid').getAttribute('readonly'),'');
     const f=await popup.locator('#exid').boundingBox();assert.ok(f.width>80&&f.x>=m.left&&f.x+f.width<=m.right);
     const copy=await popup.locator('.urlcopy_box > label').boundingBox();assert.ok(copy.x>=f.x+f.width+6&&copy.x+copy.width<=m.right-16,'Readonly URL and copy action are adjacent independent controls');
     const face=await popup.evaluate(n=>{const s=getComputedStyle(n),label=n.querySelector('.description'),copy=n.querySelector('.urlcopy_box > label'),probe=document.createElement('span');probe.style.background='var(--dcuf-b1-paper)';n.append(probe);const paper=getComputedStyle(probe).backgroundColor;probe.remove();return{label:getComputedStyle(label).color===s.color,copy:getComputedStyle(copy).color===s.color,face:getComputedStyle(copy).backgroundColor===paper}});
     assert.deepEqual(face,{label:true,copy:true,face:true},'Nested native share labels and copy face must consume the current theme');
    }
    if(kind==='realbest'){
     const primary=popup.locator('#user_dcbest_lyr_btn_ok'),box=await primary.boundingBox();assert.ok(box.width>=88&&box.height>=40);
     await primary.click();assert.ok(await e.page.evaluate(()=>window.__actionFixture.calls.includes('user_dcbest_lyr_btn_ok')),'Synthetic fixture proves dispatch identity; never a native vote');
    }
    if(kind==='pum'){
     const history=await popup.locator('.pop_head .fr').first().boundingBox(),closeBox=await control.boundingBox();assert.ok(history.x+history.width<=closeBox.x-6,'Original history and close controls cannot overlap');
     assert.equal(await popup.locator('#pum_password').getAttribute('type'),'password');assert.equal(await popup.locator('#pum_gall_nick').isVisible(),false);
     assert.equal(await popup.locator('#pum_card .gallview_head').getAttribute('data-dcuf-role'),null,'Preview cannot inherit main-article header styling');
     assert.equal(await popup.locator('.input_kcapcode').isVisible(),false,'Presentation cannot reveal a hidden CAPTCHA');
     await popup.locator('.in_keyword').focus();const menu=popup.locator('.auto_wordwrap');await menu.waitFor({state:'visible'});
     const item=menu.locator('a').first();await item.scrollIntoViewIfNeeded();assert.ok(await item.evaluate(n=>{const r=n.getBoundingClientRect();return n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}));
     assert.deepEqual(await item.evaluate(n=>({color:getComputedStyle(n).color===getComputedStyle(n.closest('[data-dcuf-article-popup]')).color,underline:getComputedStyle(n).textDecorationLine,bullet:getComputedStyle(n.closest('li')).listStyleType})),{color:true,underline:'none',bullet:'none'},'PUM suggestions use the same readable menu treatment as the family');
     await menu.locator('.word_close a').click();await menu.waitFor({state:'hidden'});
     await popup.locator('#pum_name').fill('합성 이름');await popup.locator('#subject').fill('합성 제목');
     for(const id of ['copyright_law','post_guide']){await popup.locator(`[data-fixture-guide="${id}"]`).click();const guide=popup.locator('#'+id);await guide.waitFor({state:'visible'});assert.equal(await guide.getAttribute('data-dcuf-article-popup'),'guide');await guide.locator('button').click();await guide.waitFor({state:'hidden'});}
     await popup.locator('#pum_comment').fill('합성 의견');const field=await popup.locator('#pum_comment').boundingBox();assert.ok(field.x>=m.left&&field.x+field.width<=m.right,'Native fixed textarea remains within PUM content');
     assert.ok(await popup.locator('.cloned_media img').evaluate(n=>n.complete&&n.naturalWidth===500));
     await popup.locator('[data-fixture-submit]').click();assert.ok(await e.page.evaluate(()=>window.__actionFixture.calls.includes('등록')));
     assert.equal(await popup.evaluate(n=>{const root=n.closest('.view_content_wrap'),a=window.__dcufArticleHostAdapter;a.dispose(root);const restored=!root.querySelector('[data-dcuf-article-popup],[data-dcuf-article-part]');a.refresh(root);return restored}),true,'Popup parts restore before the same owner reprojects them');
     await popup.evaluate(n=>{n.scrollTop=0});
    }
    await control.click();await popup.waitFor({state:'detached'});records.push({kind,width,height,dark,...m});
   }
   assertNoRuntimeErrors(await getMetrics(e.page),e.consoleErrors);
  }finally{await e.close()}
 }
 return records;
}
