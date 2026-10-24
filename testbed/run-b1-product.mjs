import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {assert,createTestPage,launchBrowser,storageKeys,getMetrics,assertNoRuntimeErrors} from './harness/runner-utils.mjs';
import {startServer} from './server/server.mjs';
import {mountB1NativeFixture} from './fixtures/b1-native-list.mjs';
import {readToolbarVisualContract,assessToolbarVisualContract} from './harness/toolbar-visual-contract.mjs';
assert.ok(process.argv.includes('--require-runtime-under-test'),'Guard required');
process.env.DCUF_TESTBED_USERSCRIPT='testbed/artifacts/runtime-under-test.user.js';
const runtime=path.resolve(process.env.DCUF_TESTBED_USERSCRIPT),sha256=createHash('sha256').update(await readFile(runtime)).digest('hex');
const output=path.resolve('testbed/artifacts/b1-product');await mkdir(output,{recursive:true});
const server=await startServer(),browser=await launchBrowser(),report={runtime,sha256,cases:[]};
try{
 for(const [width,height,dark,siblings] of [[980,900,false,true],[980,900,true,true],[980,2306,false,true],[1280,900,false,true],[390,900,false,true],[390,900,true,true],[980,900,false,false],[980,900,true,false]]){
  const e=await createTestPage(browser,server.baseUrl,{viewport:{width,height},storage:{[storageKeys.threshold]:0,[storageKeys.palette]:'teal'}});
  try{
   await mountB1NativeFixture(e,server.baseUrl,{siblings,dark});
   await e.page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const utility=e.page.getByRole('button',{name:'서비스 메뉴',exact:true});
   await utility.click();await e.page.getByRole('link',{name:'서비스 링크',exact:true}).waitFor({state:'visible'});
   const utilityItems=await e.page.locator('.area_links > ul:popover-open > li').evaluateAll(items=>items.map(n=>{const a=n.querySelector('a'),r=a.getBoundingClientRect();return {separator:getComputedStyle(n,'::before').content,height:r.height,hit:a.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}}));
   assert.ok(utilityItems.length>0&&utilityItems.every(n=>n.separator==='none'&&n.height>=34&&n.hit),'Vertical utility menu retires native horizontal pipes and keeps each original link reachable: '+JSON.stringify(utilityItems));
   report.utilityChecks=(report.utilityChecks||[]).concat({width,height,dark,items:utilityItems});
   await e.page.keyboard.press('Escape');await e.page.waitForFunction(()=>document.querySelector('[data-dcuf-header-utility-toggle]')?.getAttribute('aria-expanded')==='false');
   assert.equal(await utility.getAttribute('aria-expanded'),'false','Native popover Escape closes utilities');
   const top=await e.page.evaluate(()=>{
    const rect=s=>{const n=document.querySelector(s),r=n.getBoundingClientRect(),c=getComputedStyle(n);return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,display:c.display,background:c.backgroundColor,filter:c.backdropFilter}};
    return {overflow:document.documentElement.scrollWidth>innerWidth+1,logo:rect('[data-dcuf-header-shell-role="logo"]'),search:rect('.wrap_search'),field:rect('.top_search'),recent:rect('.newvisit_history .btn_open'),nav:rect('.gnb_bar'),toolbar:rect('[data-dcuf-surface="list-toolbar"]'),row:rect('[data-dcuf-surface="list-item"]')};
   });
   assert.equal(top.overflow,false,JSON.stringify(top));
   const detail=await e.page.evaluate(()=>{
    const button=document.querySelector('.top_search .bnt_search'),icon=getComputedStyle(button,'::before');
    const tab=document.querySelector('.array_tab button.on'),category=document.querySelector('[data-dcuf-role="category-list"] > li');
    const title=state=>document.querySelector(`[data-dcuf-surface="list-item"][data-dcuf-state="${state}"] .dcuf-list-title`);
    const ordinary=document.querySelector('[data-dcuf-surface="list-item"]:not([data-dcuf-state="notice"]):not([data-dcuf-state="concept"]) .dcuf-list-title');
    return {searchFill:getComputedStyle(button).backgroundColor,iconStroke:parseFloat(icon.borderTopWidth),tabSize:parseFloat(getComputedStyle(tab).fontSize),tabShadow:getComputedStyle(tab).boxShadow,categoryWidth:category?.getBoundingClientRect().width,ordinaryWeight:ordinary?Number(getComputedStyle(ordinary).fontWeight):null,noticeWeight:title('notice')?Number(getComputedStyle(title('notice')).fontWeight):null};
   });
   assert.equal(detail.searchFill,'rgba(0, 0, 0, 0)','Search is a quiet secondary action inside the original field');
   assert.ok(detail.iconStroke>0&&detail.iconStroke<=2,'Search glyph has the thin weight of the B1 control family');
   assert.ok(detail.tabSize>=12&&detail.tabSize<=13&&detail.tabShadow!=='none','Compact selected tabs retain their subtle rim/depth');
   if(width>=760)assert.ok(detail.categoryWidth<125,'Short category labels remain a tight group rather than equal-width columns');
   assert.ok(detail.ordinaryWeight!==null&&detail.noticeWeight>detail.ordinaryWeight,'Notice and ordinary reading hierarchy remain distinct');
   report.detailChecks=(report.detailChecks||[]).concat({width,height,dark,siblings,...detail});
   const material=await e.page.evaluate(()=>{
    const layout=document.querySelector('[data-dcuf-header-layout]'),bar=document.querySelector('[data-dcuf-surface="list-toolbar"]'),row=document.querySelector('[data-dcuf-surface="list-item"]');
    const resolve=(el,value)=>{const probe=document.createElement('span');probe.style.color=value;el.append(probe);const color=getComputedStyle(probe).color;probe.remove();return color};
    return {canvas:getComputedStyle(layout).backgroundColor,expectedCanvas:resolve(layout,'var(--dcuf-b1-canvas)'),token:getComputedStyle(layout).getPropertyValue('--dcuf-b1-canvas').trim(),glass:getComputedStyle(bar).backgroundColor,expectedGlass:resolve(bar,'var(--dcuf-b1-glass)'),rim:getComputedStyle(bar).borderTopColor,expectedRim:resolve(bar,'var(--dcuf-b1-rim)'),row:getComputedStyle(row).backgroundColor,expectedPaper:resolve(row,'var(--dcuf-b1-paper)'),container:getComputedStyle(document.querySelector('#container')).backgroundColor};
   });
   assert.ok(material.token,'B1 material tokens must reach the actual native canvas');
   assert.equal(material.canvas,material.expectedCanvas,'One palette-aware canvas paints the page');
   assert.equal(material.glass,material.expectedGlass,'Header and toolbar share the B1 glass role');
   assert.equal(material.rim,material.expectedRim,'Toolbar rim uses the glass edge, not the reading separator');
   assert.equal(material.row,material.expectedPaper,'Reading rows remain opaque B1 paper');
   if(dark)assert.equal(material.container,'rgba(0, 0, 0, 0)','Legacy dark container cannot obscure the page canvas');
   report.materialChecks=(report.materialChecks||[]).concat({width,height,dark,...material});
   const fidelity=await e.page.evaluate(()=>{
    const rect=n=>n.getBoundingClientRect().toJSON(),tip=document.querySelector('.darkmodebox .pop_tipbox'),sprite=document.querySelector('.newvisit_history > .btn_open > em'),tab=document.querySelector('.array_tab button:not(.on)');
    return {tip:rect(tip),tipHit:tip.contains(document.elementFromPoint(rect(tip).x+rect(tip).width/2,rect(tip).y+rect(tip).height/2)),hitClass:document.elementFromPoint(rect(tip).x+rect(tip).width/2,rect(tip).y+rect(tip).height/2)?.className,ancestors:[tip.parentElement,tip.parentElement.parentElement].map(n=>({class:n.className,z:getComputedStyle(n).zIndex,transform:getComputedStyle(n).transform})),sprite:getComputedStyle(sprite).display,tabBg:getComputedStyle(tab).backgroundColor};
   });
   assert.equal(fidelity.sprite,'none','Original sprite cannot duplicate the owned recent chevron');
   assert.equal(await e.page.locator('.newvisit_history .blind').evaluate(n=>getComputedStyle(n).position==='absolute'&&n.getBoundingClientRect().width<=1),true,'Native accessible label stays clipped rather than duplicating the visible recent label');
   assert.equal(fidelity.tabBg,'rgba(0, 0, 0, 0)','Native dark sheet cannot replace quiet inactive tabs');
   assert.ok(fidelity.tip.x>=0&&fidelity.tip.right<=width&&fidelity.tipHit,'Visible original tip remains contained and dismissible '+JSON.stringify(fidelity));
   await e.page.locator('.darkmodebox .pop_tipbox').click();
   assert.equal(await e.page.locator('.darkmodebox .pop_tipbox').isVisible(),false,'Original tip dismissal remains intact');
   assert.ok(top.toolbar.height<=(width>=760?110:180),'Categories cannot inflate the native toolbar into a tall empty block');
   assert.ok(top.nav.bottom<=260,'Compact native navigation must leave room for content');
   assert.ok(top.toolbar.filter.includes('blur'),'Glass belongs to the existing toolbar owner');
   assert.ok(top.search.right<=top.recent.x,'Native search field does not invade recent-menu hit area');
   assert.ok(top.field.right<=top.search.right+1,'Native fieldset min-content cannot expand search beyond its grid slot');
   assert.ok(top.recent.width>=100&&top.recent.height>=36,'Actual native15px control rule cannot shrink the B1 trigger');
   assert.equal(await e.page.locator('.newvisit_history > .tit:visible').count(),0,'Both recent/favorite inline titles stay inside the native menu');
   const trigger=e.page.locator('.newvisit_history > .btn_open');await trigger.click();
   const popup=await e.page.locator('#visit_history_lyr').evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,right:r.right,y:r.y,bottom:r.bottom,width:r.width,height:r.height,hit:el.contains(document.elementFromPoint(r.x+Math.min(25,r.width/2),r.y+Math.min(20,r.height/2)))}});
   assert.ok(popup.width>=250&&popup.height>0&&popup.x>=0&&popup.right<=width&&popup.hit,JSON.stringify(popup));
   assert.ok(popup.height<240,'One-entry native menu cannot retain the old minimum-height whitespace');
   assert.equal(await e.page.locator('#visit_history_lyr > .pop_content').evaluate(n=>getComputedStyle(n).backgroundColor),'rgba(0, 0, 0, 0)','The native dark inner wrapper cannot obscure the B1 menu material');
   assert.equal(await e.page.locator('#visit_history_lyr .on button').evaluate(n=>getComputedStyle(n,'::before').content),'none','Native blue selected-tab pseudo decoration is retired in the existing presenter');
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
   const toolbar=e.page.locator('[data-dcuf-surface="list-toolbar"]');
   const composition=await toolbar.evaluate(readToolbarVisualContract);
   const findings=assessToolbarVisualContract(composition,{sameRow:width>=760});
   const regionImage=path.join(output,`${width}-${height}-${dark?'dark':'light'}-${siblings?'native':'nested'}-toolbar.png`);
   await toolbar.screenshot({path:regionImage,animations:'disabled'});
   report.visualReview=(report.visualReview||[]).concat({width,height,dark,siblings,regionImage,composition,findings});
   const fallback=await e.page.evaluate(()=>{const root=document.querySelector('.newvisit_history'),layer=root.querySelector('#visit_history_lyr');layer.remove();const visible=getComputedStyle(root.querySelector('.newvisit_box')).display!=='none';root.append(layer);return visible});
   assert.equal(fallback,true,'Source-layer loss immediately restores native horizontal fallback');
   const copied=await e.page.evaluate(()=>{const adapter=window.__dcufHeaderShellHostAdapter,header=document.querySelector('.dcheader');header.replaceWith(header.cloneNode(true));adapter.refresh(document);const list=document.querySelector('.area_links > ul');return {buttons:document.querySelectorAll('[data-dcuf-header-utility-toggle]').length,targets:document.querySelectorAll(`[id="${list.id}"]`).length,listeners:adapter.snapshotResources().utilityToggleListeners}});
   assert.deepEqual(copied,{buttons:1,targets:1,listeners:1},'Copied popover baseline recovers one invoker and listener');
   const partial=await e.page.evaluate(()=>{const adapter=window.__dcufHeaderShellHostAdapter,links=document.querySelector('.area_links'),list=links.querySelector(':scope > ul'),copy=links.querySelector('[data-dcuf-header-utility-toggle]').cloneNode(true),fresh=document.createElement('ul');fresh.innerHTML='<li><a href="#fresh-service">새 서비스</a></li>';list.replaceWith(fresh);links.append(copy);adapter.refresh(document);fresh.removeAttribute('id');fresh.removeAttribute('popover');adapter.refresh(document);const button=links.querySelector('[data-dcuf-header-utility-toggle]');return {buttons:links.querySelectorAll('[data-dcuf-header-utility-toggle]').length,target:button.getAttribute('popovertarget'),id:fresh.id,popover:fresh.getAttribute('popover')}});
   assert.equal(partial.buttons,1,'Partial native UL replacement cannot retain copied dead invokers');
   assert.ok(partial.id&&partial.target===partial.id&&partial.popover==='auto','Same-node attribute loss reconnects native popover invoker');
   const absentUtility=await e.page.evaluate(()=>{const adapter=window.__dcufHeaderShellHostAdapter,links=document.querySelector('.area_links'),parent=links.parentNode,next=links.nextSibling;links.remove();adapter.refresh(document);adapter.refresh(document);const result={listeners:adapter.snapshotResources().utilityToggleListeners};parent.insertBefore(links,next);adapter.refresh(document);return result});
   assert.deepEqual(absentUtility,{listeners:0},'A native header without the utility cluster must stay valid across repeated refresh');
   const cleanup=await e.page.evaluate(()=>{window.__dcufHeaderShellHostAdapter.dispose();return {markers:document.querySelectorAll('[data-dcuf-header-layout],[data-dcuf-header-bridge]').length,resources:window.__dcufHeaderShellHostAdapter.snapshotResources(),popover:document.querySelector('.area_links > ul').getAttribute('popover'),id:document.querySelector('.area_links > ul').getAttribute('id')}});
   assert.equal(cleanup.markers,0,'Layout projections restored on disposal');assert.equal(cleanup.resources.activeRoots,0);
   assert.equal(cleanup.resources.utilityToggleListeners,0);assert.equal(cleanup.popover,null);assert.equal(cleanup.id,null);
   assertNoRuntimeErrors(await getMetrics(e.page));assert.deepEqual(e.consoleErrors,[]);
   report.cases.push({width,height,dark,siblings,top,popup,original,cleanup});
  }finally{await e.close()}
 }
 report.functionalStatus='PASS';
 report.visualStatus=report.visualReview.some(x=>x.findings.length)?'NEEDS_WORK':'MANUAL_REFERENCE_REVIEW_REQUIRED';
 report.status=report.visualStatus==='NEEDS_WORK'?'NEEDS_WORK':'FUNCTIONAL_PASS';
}finally{await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));await browser.close();await server.close()}
console.log(`B1 functional ${report.functionalStatus}; visual ${report.visualStatus}; ${report.cases.length} contexts; ${runtime}; SHA-256 ${sha256}`);
if(report.visualStatus==='NEEDS_WORK')process.exitCode=1;
