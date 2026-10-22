import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {assert,createTestPage,launchBrowser,storageKeys,getMetrics,assertNoRuntimeErrors} from './harness/runner-utils.mjs';
import {startServer} from './server/server.mjs';
assert.ok(process.argv.includes('--require-runtime-under-test'),'Guard required');
process.env.DCUF_TESTBED_USERSCRIPT='testbed/artifacts/runtime-under-test.user.js';
const runtime=path.resolve(process.env.DCUF_TESTBED_USERSCRIPT),sha256=createHash('sha256').update(await readFile(runtime)).digest('hex');
console.log(`Header layout runtime: ${runtime}; SHA-256 ${sha256}`);
const output=path.resolve('testbed/artifacts/header-layout-redesign');await mkdir(output,{recursive:true});
const server=await startServer(),browser=await launchBrowser(),report={runtime,sha256,results:[]};
try{
 for(const [prefix,width,dark,height=900] of [['',980,false],['/mgallery',980,false],['/mini',980,false],['/mgallery',980,true],['/mgallery',390,false],['/mgallery',390,true],['/mgallery',1280,false],['/mgallery',980,false,2306]]){
  const e=await createTestPage(browser,server.baseUrl,{viewport:{width,height},storage:{[storageKeys.threshold]:0,[storageKeys.palette]:'teal'}});
  try{
   await e.page.route(url=>url.origin===server.baseUrl&&/\/board\/lists$/.test(url.pathname),async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('<h1 class="dc_logo"><span>dcinside.com</span></h1>','<h1 class="dclogo"><a class="logo_img" href="#home">dcinside</a><a class="logo_img2" href="#gallery-kind">갤러리</a></h1>')});});
   await e.goto(`${prefix}/board/lists?id=test&nativeToolbar=1`);
   await e.page.evaluate(()=>{
    document.getElementById('dcuf-testbed-controls')?.remove();
    const firstNav=document.querySelector('.gnb_list > li > a');firstNav.classList.add('on');
    const navItem=firstNav.parentElement;navItem.style.position='relative';
    const menu=document.createElement('div');menu.className='depth2';menu.style.cssText='display:none;position:absolute;top:100%;left:0;min-width:130px;padding:8px;background:white;z-index:5000';
    menu.innerHTML='<a href="#native-submenu">하위 탐색</a>';navItem.append(menu);navItem.addEventListener('mouseenter',()=>menu.style.display='block');
    menu.firstChild.onclick=ev=>{ev.preventDefault();window.__layoutSubmenuClicks=(window.__layoutSubmenuClicks||0)+1;menu.style.display='none'};
    const heading=document.querySelector('.page_head');
    if(!heading.querySelector(':scope > .fr'))heading.insertAdjacentHTML('beforeend','<div class="fr"><button type="button" onclick="window.__layoutToolClicks=(window.__layoutToolClicks||0)+1">갤러리 정보</button><a href="#settings">설정</a></div>');
    const style=document.createElement('style');style.textContent='.dclogo{position:absolute;left:0;top:35px}.area_links{position:absolute;right:0;top:0}';document.head.prepend(style);
    window.__layoutOriginals=Array.from(document.querySelectorAll('.dchead a,.dchead input,.dchead button,.gnb_bar a,.page_head button,.page_head a')).map(node=>({node,parent:node.parentNode,handler:node.onclick}));
    window.__layoutSearchCount=0;document.querySelector('.wrap_search form').addEventListener('submit',ev=>{ev.preventDefault();window.__layoutSearchCount++});
   });
   if(dark)await e.page.evaluate(()=>{
    window.__dcufFixture.toggleDark(true);document.documentElement.classList.add('darkmode');
    const nativeDark=document.createElement('style');nativeDark.textContent='.darkmode .gnb_list li a.on{color:#eee222}.darkmode .dchead .dclogo .logo_img2{color:#7a86af}';document.head.append(nativeDark);
   });
   await e.page.waitForFunction(()=>document.querySelector('.dclogo')?.getAttribute('data-dcuf-header-shell-role')==='logo',{},{timeout:3000});
   await e.page.waitForSelector('[data-dcuf-gallery-page-head-role="right"]');
   await e.page.waitForSelector('[data-dcuf-header-gnb-role="current-link"]',{timeout:3000});
   if(dark){
    const colors=await e.page.evaluate(()=>{
     const token=name=>{const probe=document.createElement('span');probe.style.color=`var(${name})`;document.body.append(probe);const color=getComputedStyle(probe).color;probe.remove();return color};
     return {selected:getComputedStyle(document.querySelector('[data-dcuf-header-gnb-role="current-link"]')).color,accent:token('--dcuf-theme-accent-ink'),brand:getComputedStyle(document.querySelector('.dclogo > a + a')).color,muted:token('--dcuf-theme-fg-muted')};
    });
    assert.equal(colors.selected,colors.accent,'Native dark selected-link color follows the theme');assert.equal(colors.brand,colors.muted,'Native dark secondary brand follows the theme');
   }
   const geometry=await e.page.evaluate(()=>{
    const q=s=>document.querySelector(s),rect=s=>{const r=q(s).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
    const head=q('[data-dcuf-header-shell-role="head"]'),tools=q('[data-dcuf-gallery-page-head-role="right"]');
    return {display:getComputedStyle(head).display,layout:getComputedStyle(q('[data-dcuf-header-layout]')).display,logo:rect('.dclogo'),search:rect('.wrap_search'),links:rect('.area_links'),title:rect('[data-dcuf-gallery-page-head-role="left"]'),tools:tools?rect('[data-dcuf-gallery-page-head-role="right"]'):null,boardRadius:parseFloat(getComputedStyle(q('.page_head')).borderRadius),overflow:document.documentElement.scrollWidth>innerWidth+1};
   });
   assert.equal(geometry.display,'contents','Native head keeps its children in the common B1 grid');
   assert.equal(geometry.layout,'grid','Existing ancestor owns the B1 composition');
   assert.equal(geometry.overflow,false,JSON.stringify(geometry));
   assert.equal(geometry.boardRadius,0,'Approved B1 removes the rejected large title card');
   assert.ok(geometry.tools&&(width>=900?geometry.tools.x>=geometry.title.right:geometry.tools.y>=geometry.title.bottom),'Gallery tools share the wide title row and stack in narrow layouts');
   if(width>=760)assert.ok(geometry.links.x>=geometry.search.right,'Original utilities remain beside search');
   if(width>=760)assert.ok(geometry.search.x>geometry.logo.right+8,'Search beside the compact brand');
   else assert.ok(geometry.search.y>=geometry.logo.bottom+6,'Narrow search stacks below brand');
   const search=e.page.locator('.wrap_search input');await search.fill('재배치 검색');await search.press('Enter');assert.equal(await e.page.evaluate(()=>window.__layoutSearchCount),1);
   await e.page.locator('.gnb_list > li > a').first().hover();
   await e.page.getByRole('link',{name:'하위 탐색',exact:true}).click();assert.equal(await e.page.evaluate(()=>window.__layoutSubmenuClicks),1,'Original secondary navigation remains pointer-reachable');
   await e.page.evaluate(()=>{const links=document.querySelectorAll('.gnb_list > li > a');links[0].classList.remove('on');links[1].classList.add('on');});
   await e.page.waitForFunction(()=>document.querySelectorAll('.gnb_list > li > a')[1].getAttribute('data-dcuf-header-gnb-role')==='current-link');
   const topology=await e.page.evaluate(()=>window.__layoutOriginals.every(({node,parent,handler})=>node.isConnected&&node.parentNode===parent&&node.onclick===handler));assert.equal(topology,true);
   await e.page.screenshot({path:path.join(output,`${prefix.slice(1)||'major'}-${width}-${height}-${dark?'dark':'light'}.png`),animations:'disabled'});
   await e.page.evaluate(()=>{const root=document.querySelector('.gnb_bar'),clone=root.cloneNode(true),links=clone.querySelectorAll('.gnb_list > li > a');links[1].classList.remove('on');links[0].classList.add('on');root.replaceWith(clone);});
   await e.page.waitForFunction(()=>window.__dcufHeaderGnbHostAdapter.snapshotResources().activeRoots===1&&document.querySelector('.gnb_list > li > a')?.getAttribute('data-dcuf-header-gnb-role')==='current-link');
   const selectionCount=await e.page.locator('[data-dcuf-header-gnb-role="current-link"]').count();assert.equal(selectionCount,1,'Copied inactive selection marker is removed after native replacement');
   const cleanup=await e.page.evaluate(()=>{window.__dcufHeaderGnbHostAdapter.dispose();window.__dcufHeaderShellHostAdapter.dispose();return {gnb:document.querySelectorAll('[data-dcuf-header-gnb-role]').length,shell:document.querySelectorAll('[data-dcuf-header-shell-role]').length,roots:window.__dcufHeaderGnbHostAdapter.snapshotResources().activeRoots};});
   assert.deepEqual(cleanup,{gnb:0,shell:0,roots:0},'New roles restore exactly on disposal');
   assertNoRuntimeErrors(await getMetrics(e.page),e.consoleErrors);report.results.push({prefix,width,height,dark,geometry,topology});
  }finally{await e.close();}
 }
 report.status='PASS';
}finally{await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(`Header layout redesign: ${report.status}; ${report.results.length} contexts`);
