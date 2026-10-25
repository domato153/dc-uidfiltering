import {assert,createTestPage,storageKeys,assertNoRuntimeErrors,getMetrics} from './harness/runner-utils.mjs';
import {gallerySearchHtml,gallerySearchHostCss} from './fixtures/b1-gallery-search.mjs';
import {mountGallerySearchFixture} from './fixtures/b1-gallery-search-mount.mjs';
import {mountB1NativeFixture} from './fixtures/b1-native-list.mjs';
export async function runB1GallerySearchContract({browser,server}) {
 const records=[];
 for(const [width,height,dark] of [[980,900,false],[980,900,true],[980,2306,false],[390,520,true]]){
 const e=await createTestPage(browser,server.baseUrl,{viewport:{width,height},storage:{[storageKeys.threshold]:0,[storageKeys.palette]:'teal'}});
 try{
  await mountB1NativeFixture(e,server.baseUrl,{siblings:true,dark});await e.page.evaluate(mountGallerySearchFixture,{html:gallerySearchHtml,css:gallerySearchHostCss});
  const inspect=async(kind,selector,closeSelector)=>{
   const root=e.page.locator(selector).first();await root.waitFor({state:'visible'});await e.page.mouse.move(0,0);
   const m=await root.evaluate(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,overflow:n.scrollWidth-n.clientWidth,blur:s.backdropFilter,radius:parseFloat(s.borderRadius),background:s.backgroundColor,position:s.position,left:s.left,minWidth:s.minWidth,maxWidth:s.maxWidth,padding:s.padding,marked:n.getAttribute('data-dcuf-header-drawer-popup'),filteredParent:n.parentElement.closest('.issue_contentbox')?getComputedStyle(n.parentElement.closest('.issue_contentbox')).backdropFilter:null}});
   assert.ok(m.width>100&&m.height>24&&m.x>=-1&&m.right<=width+1&&m.y>=-1&&m.bottom<=height+1&&m.overflow<=1,JSON.stringify({kind,...m}));
   assert.ok(m.radius>=12,'Each affected frame retains the B1 shape');
   if(kind==='door'){
    assert.equal(m.blur,'none','Original fixed descendants must not gain a filtered containing block');
    assert.ok(await root.evaluate(n=>getComputedStyle(n,'::before').backdropFilter!=='none'),'The separate decoration plane supplies the actual glass effect');
   }else assert.ok(m.blur!=='none','Floating leaves retain their own B1 material');
   if(closeSelector){const close=root.locator(closeSelector).first();const hit=await close.evaluate(n=>{const r=n.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{width:r.width,height:r.height,x:r.x,y:r.y,hit:n.contains(top),cover:top?.outerHTML.slice(0,160)}});assert.ok(hit.width>=30&&hit.height>=30&&hit.hit,kind+' original close must be a positive reachable control '+JSON.stringify(hit));}
   assert.equal(await e.page.evaluate(()=>window.__gallerySearchFixture.originals.every(({node,parent,click,focus,input})=>!node.isConnected||node.parentNode===parent&&node.onclick===click&&node.onfocus===focus&&node.oninput===input)),true,'Native controls retain parents and callbacks');
   if(process.env.DCUF_GALLERY_CAPTURE){const {mkdir}=await import('node:fs/promises');await mkdir(process.env.DCUF_GALLERY_CAPTURE,{recursive:true});await e.page.screenshot({path:`${process.env.DCUF_GALLERY_CAPTURE}/${kind}-${width}-${height}-${dark?'dark':'light'}.png`});}
   records.push({kind,width,height,dark,...m});return root;
  };
  await e.page.locator('#issue_setting').click();
  await e.page.waitForFunction(()=>document.querySelector('#setting_list')?.getAttribute('data-dcuf-gallery-page-head-role')==='settings-layer',null,{timeout:1500});
  const menu=await inspect('settings','#setting_list');assert.ok(await menu.locator('button').first().evaluate(n=>{const r=n.getBoundingClientRect();return r.height>=36&&n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}));
  assert.equal(await menu.locator('li').nth(1).evaluate(n=>getComputedStyle(n).borderTopWidth),'0px','Settings rows use the B1 quiet menu rhythm');
  await e.page.locator('#issue_setting').click();await menu.waitFor({state:'hidden'});
  await e.page.locator('.dcuf-header-drawer__toggle').click();
  await e.page.waitForFunction(()=>document.querySelector('.issue_contentbox')?.querySelector('[data-dcuf-header-drawer-part="image"]'));
  const door=await inspect('door','.issue_contentbox');const image=door.locator('[data-dcuf-header-drawer-part="image"]');assert.ok(await image.evaluate(n=>{const r=n.getBoundingClientRect();return r.width>=80&&r.height>=60&&getComputedStyle(n).backgroundImage.includes('data:image/svg')}));
  assert.ok(await image.locator('.cover').evaluate(n=>{const r=n.getBoundingClientRect(),p=n.parentElement.getBoundingClientRect();return Math.abs(r.width-p.width)<1&&Math.abs(r.height-p.height)<1}),'Native image cover must fit the actual image frame');
  assert.ok(await door.locator('.info_contbox').evaluate(n=>n.scrollHeight<=n.clientHeight+1),'All native manager/date rows remain visible without a clipped fixed-height box');
  assert.ok(await door.locator('[data-dcuf-header-drawer-part="rank-title"] [data-dcuf-header-drawer-part="visible-label"]').evaluate(n=>n.getBoundingClientRect().width>10),'Original ranking text replaces its decorative sprite without losing meaning');
  await door.locator('.btn_hotall_list').click();await e.page.waitForFunction(()=>document.querySelector('#hot_rank_pop2 [data-dcuf-header-drawer-part="panel"]'));
  const rank=await inspect('rank','#hot_rank_pop2','[data-dcuf-header-drawer-part="close"]');const list=rank.locator('[data-dcuf-header-drawer-part="rank-list"]:visible').first();assert.ok(await list.locator('li').count()>=24);
  assert.ok(await rank.locator('[data-dcuf-header-drawer-part="title"]').evaluate(n=>getComputedStyle(n).color===getComputedStyle(n.closest('#hot_rank_pop2')).color),'Ranking title follows the B1 foreground in both themes');
  assert.ok(await list.locator('.num').first().evaluate(n=>parseFloat(getComputedStyle(n).marginRight)>=6),'Rank numbers have a readable gap before the original name');
  await e.page.locator('.dcuf-header-drawer__toggle').focus();await e.page.locator('.dcuf-header-drawer__toggle').press('Enter');
  await e.page.waitForFunction(()=>document.querySelector('.issue_contentbox')?.getAttribute('data-dcuf-header-native-door-popup-only')==='1');
  await inspect('rank-only','#hot_rank_pop2','[data-dcuf-header-drawer-part="close"]');
  await rank.locator('.btn_next').last().click();assert.equal(await rank.locator('[data-dcuf-header-drawer-part="rank-list"]:visible').count(),1,'Native hidden rank pages stay hidden');
  assert.ok(await rank.locator('[data-dcuf-header-drawer-part="rank-list"]:visible').evaluate(n=>{const c=[...n.children].filter(n=>n.tagName==='LI');return getComputedStyle(n).display==='block'&&Math.abs(c[0].getBoundingClientRect().y-c[4].getBoundingClientRect().y)<1}),'Native inline block page replacement retains its original five-column rank order');
  await rank.locator('.btn_prev').last().click();
  await rank.locator('[data-dcuf-header-drawer-part="rank-body"]').evaluate(n=>n.scrollTop=n.scrollHeight);assert.ok(await rank.locator('[data-dcuf-header-drawer-part="close"]').evaluate(n=>{const r=n.getBoundingClientRect();return n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}));await rank.locator('[data-dcuf-header-drawer-part="close"]').click();await rank.waitFor({state:'hidden'});
  await e.page.locator('.dcuf-header-drawer__toggle').click();
  await door.locator('.minor_ranking_box > button:not(.btn_hotall_list)').first().click();
  const tip=await inspect('tip','#hot_tip_pop','[data-dcuf-header-drawer-part="close"]');await tip.locator('[data-dcuf-header-drawer-part="close"]').click();await tip.waitFor({state:'hidden'});
  await e.page.locator('.dcuf-header-drawer__toggle').click();await door.waitFor({state:'hidden'});
  await e.page.locator('[data-fixture-related]').click();await e.page.waitForFunction(()=>document.querySelector('#relation_popup')?.getAttribute('data-dcuf-header-relation-popup')==='1');
  const related=await inspect('related','#relation_popup','[data-dcuf-header-drawer-part="close"]');assert.equal(await related.locator('[data-dcuf-header-drawer-part="relation-group"]').count(),2);
  assert.ok(await related.locator('[data-dcuf-header-drawer-part="relation-link"]').first().evaluate(n=>n.clientWidth>80&&n.scrollWidth<=n.clientWidth+1),'Related names retain readable width rather than native clipped columns');
  assert.equal(await related.locator('.pop_info').first().evaluate(n=>getComputedStyle(n).backgroundColor),'rgba(0, 0, 0, 0)','Nested relation information uses the floating material');
  await related.locator('.btn_next').last().click();assert.ok(await e.page.evaluate(()=>window.__gallerySearchFixture.calls.includes('related-page')));await related.locator('[data-dcuf-header-drawer-part="close"]').click();await related.waitFor({state:'hidden'});
  await e.page.locator('#preSWord').focus();await e.page.waitForFunction(()=>document.querySelector('.auto_wordwrap')?.getAttribute('data-dcuf-header-shell-role')==='search-layer');
  const history=await inspect('search-history','.auto_wordwrap','[data-dcuf-header-shell-role="search-close"]');const field=e.page.locator('#preSWord');assert.equal(await field.getAttribute('type'),'text');const saved=await history.locator('#open_mem').isChecked();await history.locator('#open_mem').click();assert.equal(await history.locator('#open_mem').isChecked(),!saved);await history.locator('.btn_autoword_del').first().click();assert.equal(await history.locator('.word_list > li').count(),1);
  assert.ok(await history.locator('.word_list > li > a').first().evaluate(n=>n.getBoundingClientRect().height<=44),'History rows use the intended 40px border-box rhythm');
  assert.equal(await history.locator('.round_label .inr').evaluate(n=>getComputedStyle(n).fontStyle),'normal','History preference text uses the B1 type role');
  assert.ok(await history.locator('.round_label .inr').evaluate(n=>getComputedStyle(n).color===getComputedStyle(n.closest('.word_close')).color),'Native preference label follows the B1 muted text role');
  assert.equal(await history.locator('.round_label').evaluate(n=>getComputedStyle(n,'::before').width),'15px','Original switch knob remains rendered');
  await field.fill('합성');await e.page.waitForFunction(()=>document.querySelector('.auto_wordwrap:not(.lately)')?.getAttribute('data-dcuf-header-shell-role')==='search-layer');
  const suggestions=await inspect('search-suggestions','.auto_wordwrap','[data-dcuf-header-shell-role="search-close"]');assert.ok(await suggestions.locator('[data-dcuf-header-shell-role="search-link"]').count()>4);await suggestions.locator('[data-dcuf-header-shell-role="search-close"]').click();await suggestions.waitFor({state:'hidden'});
  await e.page.locator('[data-fixture-guide]').click();await e.page.waitForFunction(()=>document.querySelector('.user_guide_popup.pop_wrap')?.getAttribute('data-dcuf-gallery-page-head-role')==='guide-layer');
  const guide=await inspect('guide','.user_guide_popup.pop_wrap','[data-dcuf-gallery-page-head-role="layer-close"]');const color=await guide.evaluate(n=>{const h=n.querySelector('[data-dcuf-gallery-page-head-role="layer-head"]'),t=h.querySelector('h3');return{transparent:getComputedStyle(h).backgroundColor==='rgba(0, 0, 0, 0)',title:getComputedStyle(t).color===getComputedStyle(n).color}});assert.deepEqual(color,{transparent:true,title:true});
  await guide.locator('[data-dcuf-gallery-page-head-role="layer-body"]').evaluate(n=>n.scrollTop=n.scrollHeight);
  assert.ok(await guide.locator('.sub_list > li').last().evaluate(n=>{const r=n.getBoundingClientRect(),p=n.closest('.caption_box').getBoundingClientRect(),g=n.closest('.user_guide_popup').getBoundingClientRect();return r.top>=Math.max(p.top,g.top)-1&&r.bottom<=Math.min(p.bottom,g.bottom)+1&&n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}),'The actual last guide item must remain visible and reachable after maximum scroll');
  await guide.locator('[data-dcuf-gallery-page-head-role="layer-close"]').click();await guide.waitFor({state:'detached'});assert.equal(await e.page.locator('.user_guide_popup').count(),0);
  assert.ok(await e.page.evaluate(()=>{const shell=window.__dcufHeaderShellHostAdapter,head=window.__dcufGalleryPageHeadHostAdapter,drawer=window.__dcufHeaderDrawerHostAdapter;shell.dispose();head.dispose();drawer.dispose();const clean=!document.querySelector('[data-dcuf-header-shell-role],[data-dcuf-gallery-page-head-role],[data-dcuf-header-drawer-part],[data-dcuf-header-native-door-layer-open]');shell.connect(document);head.connect(document);drawer.connect();return clean}),'Original role/part attributes restore before reconnecting existing owners');
  assertNoRuntimeErrors(await getMetrics(e.page),e.consoleErrors);
 }finally{await e.close()}
 }
 return records;
}
