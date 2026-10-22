import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {assert,createTestPage,launchBrowser,storageKeys,getMetrics,assertNoRuntimeErrors} from './harness/runner-utils.mjs';
import {startServer} from './server/server.mjs';
assert.ok(process.argv.includes('--require-runtime-under-test'),'Guard required');
process.env.DCUF_TESTBED_USERSCRIPT='testbed/artifacts/runtime-under-test.user.js';
const runtime=path.resolve(process.env.DCUF_TESTBED_USERSCRIPT),sha256=createHash('sha256').update(await readFile(runtime)).digest('hex');
const output=path.resolve('testbed/artifacts/b1-product');await mkdir(output,{recursive:true});
const server=await startServer(),browser=await launchBrowser(),report={runtime,sha256,cases:[]};
try{
 for(const [width,height,dark,siblings] of [[980,900,false,true],[980,900,true,true],[980,2306,false,true],[1280,900,false,true],[390,900,false,true],[390,900,true,true],[980,900,false,false]]){
  const e=await createTestPage(browser,server.baseUrl,{viewport:{width,height},storage:{[storageKeys.threshold]:0,[storageKeys.palette]:'teal'}});
  try{
   await e.page.route(url=>url.origin===server.baseUrl&&/\/board\/lists$/.test(url.pathname),async route=>{
    const response=await route.fetch();let html=await response.text();
    html=html.replace(/(<div class="wrap_search"><form>)([\s\S]*?)(<\/form>)/,'$1<fieldset>$2</fieldset>$3');
    html=html.replace('<div class="inner_search"><input','<div class="inner_search"><input class="in_keyword"').replace('</head>','<style>.dchead .top_search .in_keyword{width:297px;height:38px}.typea .inner_search{width:315px}.typea .top_search{width:364px}.visit_bookmark .newvisit_history .btn_open{width:15px;height:15px}</style></head>');
    html=html.replace(/<div class="area_links">([\s\S]*?)<\/div>/,'<div class="area_links"><ul><li>$1</li><li><a href="#native-service">서비스 링크</a></li></ul><div class="darkmodebox"><button type="button" aria-label="네이티브 테마">◐</button></div></div>');
    if(siblings){
    const start=html.indexOf('<header class="dcheader'),end=html.indexOf('</header>',start)+9;
    const chrome=html.slice(start,end-9).replace('<div class="gnb_bar">','</header><div class="gnb_bar">').replace('<div class="newvisit_history">','<div class="visit_bookmark"><div class="newvisit_history">');
    html=html.slice(0,start)+'<div class="dcwrap width1160 list_wrap">'+chrome+'</div></div>'+html.slice(end);
    }
    await route.fulfill({response,body:html});
   });
   await e.goto('/mgallery/board/lists?id=test&nativeToolbar=1');
   await e.page.waitForSelector('[data-dcuf-header-layout]');
   await e.page.evaluate(()=>{
    document.getElementById('dcuf-testbed-controls')?.remove();
    // Native-shaped layer: the original button and original source handlers own
    // display/tab/delete semantics. Product adds no replacement popup/controller.
    const root=document.querySelector('.newvisit_history'),trigger=root.querySelector('.btn_open');
    root.insertAdjacentHTML('afterbegin','<h3 class="tit bookmark_title" style="display:block">즐겨찾기 갤러리</h3>');
    root.insertAdjacentHTML('beforeend','<div class="pop_wrap gray1px" id="visit_history_lyr" style="left:0;top:37px;display:none"><div class="pop_content newvisit_layer"><ul class="tabslist"><li><button type="button">최근 방문</button></li><li><button type="button">즐겨찾기</button></li></ul><ul class="under_listbox"><li><a href="#native-recent">명조 워더링 웨이브</a><button type="button" aria-label="목록에서 삭제">×</button></li></ul></div></div>');
    const layer=root.querySelector('#visit_history_lyr');
    trigger.onclick=()=>{layer.style.display=layer.style.display==='none'?'block':'none';window.__b1RecentOpens=(window.__b1RecentOpens||0)+1};
    layer.querySelector('a').onclick=ev=>{ev.preventDefault();window.__b1RecentClicks=(window.__b1RecentClicks||0)+1};
    layer.querySelector('[aria-label="목록에서 삭제"]').onclick=()=>window.__b1DeleteClicks=(window.__b1DeleteClicks||0)+1;
    window.__b1Originals=Array.from(document.querySelectorAll('.dcheader a,.dcheader button,.dcheader input,.gnb_bar a,.newvisit_history button,#visit_history_lyr a')).map(node=>({node,parent:node.parentNode,handler:node.onclick}));
    document.querySelector('#listSizeLayer')?.style.setProperty('display','none');
    window.dispatchEvent(new Event('resize'));
   });
   if(dark)await e.page.evaluate(()=>window.__dcufFixture.toggleDark(true));
   await e.page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const utility=e.page.getByRole('button',{name:'서비스 메뉴',exact:true});
   await utility.click();await e.page.getByRole('link',{name:'서비스 링크',exact:true}).waitFor({state:'visible'});
   await e.page.keyboard.press('Escape');await e.page.waitForFunction(()=>document.querySelector('[data-dcuf-header-utility-toggle]')?.getAttribute('aria-expanded')==='false');
   assert.equal(await utility.getAttribute('aria-expanded'),'false','Native popover Escape closes utilities');
   const top=await e.page.evaluate(()=>{
    const rect=s=>{const n=document.querySelector(s),r=n.getBoundingClientRect(),c=getComputedStyle(n);return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,display:c.display,background:c.backgroundColor,filter:c.backdropFilter}};
    return {overflow:document.documentElement.scrollWidth>innerWidth+1,logo:rect('[data-dcuf-header-shell-role="logo"]'),search:rect('.wrap_search'),field:rect('.top_search'),recent:rect('.newvisit_history .btn_open'),nav:rect('.gnb_bar'),toolbar:rect('[data-dcuf-surface="list-toolbar"]'),row:rect('[data-dcuf-surface="list-item"]')};
   });
   assert.equal(top.overflow,false,JSON.stringify(top));
   assert.ok(top.nav.bottom<=260,'Compact native navigation must leave room for content');
   assert.ok(top.toolbar.filter.includes('blur'),'Glass belongs to the existing toolbar owner');
   assert.ok(top.search.right<=top.recent.x,'Native search field does not invade recent-menu hit area');
   assert.ok(top.field.right<=top.search.right+1,'Native fieldset min-content cannot expand search beyond its grid slot');
   assert.ok(top.recent.width>=100&&top.recent.height>=36,'Actual native15px control rule cannot shrink the B1 trigger');
   assert.equal(await e.page.locator('.newvisit_history > .tit:visible').count(),0,'Both recent/favorite inline titles stay inside the native menu');
   const trigger=e.page.locator('.newvisit_history > .btn_open');await trigger.click();
   const popup=await e.page.locator('#visit_history_lyr').evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,right:r.right,y:r.y,bottom:r.bottom,width:r.width,height:r.height,hit:el.contains(document.elementFromPoint(r.x+Math.min(25,r.width/2),r.y+Math.min(20,r.height/2)))}});
   assert.ok(popup.width>=250&&popup.height>0&&popup.x>=0&&popup.right<=width&&popup.hit,JSON.stringify(popup));
   await e.page.getByRole('link',{name:'명조 워더링 웨이브',exact:true}).click();
   await e.page.getByRole('button',{name:'목록에서 삭제',exact:true}).click();
   assert.equal(await e.page.evaluate(()=>window.__b1RecentClicks),1);assert.equal(await e.page.evaluate(()=>window.__b1DeleteClicks),1);
   await e.page.screenshot({path:path.join(output,`${width}-${height}-${dark?'dark':'light'}-${siblings?'native':'nested'}-menu.png`),animations:'disabled'});
   await trigger.click();assert.equal(await e.page.locator('#visit_history_lyr').isVisible(),false);
   const original=await e.page.evaluate(()=>window.__b1Originals.every(({node,parent,handler})=>node.isConnected&&node.parentNode===parent&&node.onclick===handler));assert.equal(original,true,'Native topology and handlers preserved');
   if(width===980&&height===900&&!dark&&siblings){
    const paletteIds=[...(await readFile('src/targets/shared/theme-presenter.js','utf8')).matchAll(/Object\.freeze\(\{ id: '([^']+)'/g)].map(match=>match[1]);assert.equal(paletteIds.length,14);
    const palettes=await e.page.evaluate(ids=>{const root=document.documentElement,previous=root.getAttribute('data-dcuf-palette'),wasDark=document.body.classList.contains('dc-filter-dark-mode'),probe=document.createElement('span');document.body.append(probe);const results=[];for(const dark of [false,true]){document.body.classList.toggle('dc-filter-dark-mode',dark);for(const id of ids){root.setAttribute('data-dcuf-palette',id);probe.style.color='var(--dcuf-theme-accent-ink)';const expected=getComputedStyle(probe).color,selected=getComputedStyle(document.querySelector('.array_tab button.on')).color;probe.style.color='var(--dcuf-theme-on-accent)';const onAccent=getComputedStyle(probe).color,write=getComputedStyle(document.querySelector('[data-dcuf-surface="list-toolbar"] [data-dcuf-role="primary-action"]')).color;results.push({id,dark,selected,expected,write,onAccent})}}root.setAttribute('data-dcuf-palette',previous);document.body.classList.toggle('dc-filter-dark-mode',wasDark);probe.remove();return results},paletteIds);
    assert.ok(palettes.every(p=>p.selected===p.expected&&p.write===p.onAccent),'All14 palettes/theme bindings remain usable');report.palettes=palettes;
   }
   await e.page.screenshot({path:path.join(output,`${width}-${height}-${dark?'dark':'light'}-${siblings?'native':'nested'}.png`),animations:'disabled'});
   const fallback=await e.page.evaluate(()=>{const root=document.querySelector('.newvisit_history'),layer=root.querySelector('#visit_history_lyr');layer.remove();const visible=getComputedStyle(root.querySelector('.newvisit_box')).display!=='none';root.append(layer);return visible});
   assert.equal(fallback,true,'Source-layer loss immediately restores native horizontal fallback');
   const copied=await e.page.evaluate(()=>{const adapter=window.__dcufHeaderShellHostAdapter,header=document.querySelector('.dcheader');header.replaceWith(header.cloneNode(true));adapter.refresh(document);const list=document.querySelector('.area_links > ul');return {buttons:document.querySelectorAll('[data-dcuf-header-utility-toggle]').length,targets:document.querySelectorAll(`[id="${list.id}"]`).length,listeners:adapter.snapshotResources().utilityToggleListeners}});
   assert.deepEqual(copied,{buttons:1,targets:1,listeners:1},'Copied popover baseline recovers one invoker and listener');
   const partial=await e.page.evaluate(()=>{const adapter=window.__dcufHeaderShellHostAdapter,links=document.querySelector('.area_links'),list=links.querySelector(':scope > ul'),copy=links.querySelector('[data-dcuf-header-utility-toggle]').cloneNode(true),fresh=document.createElement('ul');fresh.innerHTML='<li><a href="#fresh-service">새 서비스</a></li>';list.replaceWith(fresh);links.append(copy);adapter.refresh(document);fresh.removeAttribute('id');fresh.removeAttribute('popover');adapter.refresh(document);const button=links.querySelector('[data-dcuf-header-utility-toggle]');return {buttons:links.querySelectorAll('[data-dcuf-header-utility-toggle]').length,target:button.getAttribute('popovertarget'),id:fresh.id,popover:fresh.getAttribute('popover')}});
   assert.equal(partial.buttons,1,'Partial native UL replacement cannot retain copied dead invokers');
   assert.ok(partial.id&&partial.target===partial.id&&partial.popover==='auto','Same-node attribute loss reconnects native popover invoker');
   const cleanup=await e.page.evaluate(()=>{window.__dcufHeaderShellHostAdapter.dispose();return {markers:document.querySelectorAll('[data-dcuf-header-layout],[data-dcuf-header-bridge]').length,resources:window.__dcufHeaderShellHostAdapter.snapshotResources(),popover:document.querySelector('.area_links > ul').getAttribute('popover'),id:document.querySelector('.area_links > ul').getAttribute('id')}});
   assert.equal(cleanup.markers,0,'Layout projections restored on disposal');assert.equal(cleanup.resources.activeRoots,0);
   assert.equal(cleanup.resources.utilityToggleListeners,0);assert.equal(cleanup.popover,null);assert.equal(cleanup.id,null);
   assertNoRuntimeErrors(await getMetrics(e.page));assert.deepEqual(e.consoleErrors,[]);
   report.cases.push({width,height,dark,siblings,top,popup,original,cleanup});
  }finally{await e.close()}
 }
 report.status='PASS';
}finally{await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));await browser.close();await server.close()}
console.log(`B1 product ${report.status}; ${report.cases.length} contexts; ${runtime}; SHA-256 ${sha256}`);
