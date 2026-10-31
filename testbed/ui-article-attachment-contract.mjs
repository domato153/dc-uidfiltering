import assert from 'node:assert/strict';
import { createTestPage, storageKeys, assertNoRuntimeErrors, getMetrics } from './harness/runner-utils.mjs';
import { mountB1ContentFixture } from './fixtures/b1-content.mjs';

// Anonymous6778319 native ancestry and16px row,observed2026-10-30.
// All filenames,download destinations and action handlers below are synthetic.
export async function mountAttachmentSpecimen(browser,server,state) {
 const e=await createTestPage(browser,server.baseUrl,{viewport:{width:state.width,height:state.height},storage:{[storageKeys.threshold]:0,[storageKeys.palette]:'teal'}});
 await e.goto('/board/view?id=test&no=1001&comments=1&live-shape=1');
 await e.page.evaluate(({count,long,font,dark})=>{
  document.getElementById('dcuf-testbed-controls')?.remove();
  const style=document.createElement('style');
  style.textContent='.appending_file_box{border:1px solid #ccc;padding:8px 13px}.appending_file_box>strong{font-size:12px}.appending_file{list-style:none;padding:0;margin-top:3px;overflow:hidden}.appending_file>li{float:left;height:16px;line-height:16px;margin-right:7px}.appending_file>li>a{color:#555}.appending_file_box>.btn_file_dw{display:inline-block;height:16px;line-height:16px;margin-left:7px;padding:0 5px;background:#3b4890;color:#fff;font-size:11px}';
  document.head.append(style);
  const body=document.querySelector('[data-dcuf-role="article-body"]'),box=document.createElement('div');box.className='appending_file_box';
  box.innerHTML='<strong>원본 첨부파일 <em>'+count+'</em></strong><a href="javascript:;" class="btn_file_dw">본문 이미지 다운로드</a><img class="loading_btntype" alt="" style="display:none"><ul class="appending_file">'+Array.from({length:count},(_,i)=>'<li><a href="/__testbed/download?file='+i+'">'+(long&&i===count-1?'긴_첨부파일_이름_'+('long_name_'.repeat(18))+'.png':'sample_'+String(i+1).padStart(3,'0')+'.jpg')+'</a></li>').join('')+'</ul>';
  body.append(box);body.style.setProperty('--dcuf-article-body-font-size',font+'px');
  window.__attachmentCalls={file:0,bulk:0};
  for(const a of box.querySelectorAll('a'))a.onclick=event=>{event.preventDefault();window.__attachmentCalls[a.classList.contains('btn_file_dw')?'bulk':'file']++};
  window.__attachmentOriginals=[...box.querySelectorAll('a')].map(node=>({node,parent:node.parentNode,handler:node.onclick,href:node.getAttribute('href'),text:node.textContent}));
  const list=box.querySelector('.appending_file'),loading=box.querySelector('.loading_btntype');
  window.__attachmentTopology={box,parent:body,list,rows:[...list.children],loading,loadingStyle:loading.getAttribute('style')};
  if(dark)window.__dcufFixture.toggleDark(true);
 },state);
 const box=e.page.locator('.appending_file_box[data-dcuf-role="article-attachments"]');await box.waitFor();await e.page.evaluate(()=>document.fonts.ready);return{e,box};
}

export async function runArticleAttachmentContract({browser,server,onCapture}) {
 const records=[];
 for(const state of[{width:1440,height:1000,count:16,font:26},{width:980,height:2306,count:16,font:26},{width:980,height:900,count:3,font:42,long:true,dark:true},{width:390,height:700,count:64,font:38,long:true},{width:390,height:700,count:1,font:26,dark:true}]) {
  const {e,box}=await mountAttachmentSpecimen(browser,server,state);
  try {
   await box.scrollIntoViewIfNeeded();await onCapture?.(e,box,state);
   const observation=await box.evaluate(n=>{
    const rect=x=>x.getBoundingClientRect().toJSON();
    const t=window.__attachmentTopology;
    return{outer:rect(n),bodyFont:getComputedStyle(n.parentElement).fontSize,links:[...n.querySelectorAll('.appending_file>li')].map(li=>{const a=li.querySelector('a'),range=document.createRange();range.selectNodeContents(a);return{row:rect(li),link:rect(a),text:range.getBoundingClientRect().toJSON(),font:getComputedStyle(a).fontSize,overflow:a.scrollWidth-a.clientWidth}}),preserved:window.__attachmentOriginals.every(x=>x.node.isConnected&&x.node.parentNode===x.parent&&x.node.onclick===x.handler&&x.node.getAttribute('href')===x.href&&x.node.textContent===x.text)&&t.box===n&&n.parentNode===t.parent&&t.list.parentNode===n&&t.rows.length===t.list.children.length&&t.rows.every((row,i)=>t.list.children[i]===row)&&t.loading.parentNode===n&&t.loading.getAttribute('style')===t.loadingStyle};
   });
   assert.equal(observation.bodyFont,state.font+'px','The independent reading-size stress actually applies');
   assert.equal(observation.links.length,state.count);assert.ok(observation.preserved,'Original links/parents/handlers/URLs/text survive projection');
   const changedReading=await box.evaluate((n,font)=>{n.parentElement.style.setProperty('--dcuf-article-body-font-size',font+'px');return{body:getComputedStyle(n.parentElement).fontSize,files:[...n.querySelectorAll('.appending_file a')].map(a=>getComputedStyle(a).fontSize)}},state.font+9);
   assert.equal(changedReading.body,(state.font+9)+'px');
   assert.deepEqual(changedReading.files,observation.links.map(x=>x.font),'Attachment utility typography stays independent when only reading size changes');
   await box.evaluate((n,font)=>n.parentElement.style.setProperty('--dcuf-article-body-font-size',font+'px'),state.font);
   for(const item of observation.links) {
    assert.ok(item.row.height>=item.text.height-1,'Native file row encloses its actual text instead of retaining16px beneath enlarged glyphs');
    assert.ok(item.link.left>=observation.outer.left&&item.link.right<=observation.outer.right+1,'Filename remains inside its own attachment box');
    assert.ok(item.text.bottom<=item.row.bottom+1&&item.text.top>=item.row.top-1,'Wrapped text stays inside its own row');
    assert.ok(item.overflow<=1,'Long filename wraps without hidden horizontal content');
   }
   for(let i=0;i<observation.links.length;i++)for(let j=i+1;j<observation.links.length;j++) {
    const a=observation.links[i].text,b=observation.links[j].text;
    assert.ok(Math.min(a.right,b.right)-Math.max(a.left,b.left)<=1||Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)<=1,'Distinct filename text rectangles do not overlap');
   }
   const file=box.locator('.appending_file a').first();await file.evaluate(n=>n.scrollIntoView({block:'center'}));
   assert.ok(await file.evaluate(n=>{const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return n===hit||n.contains(hit)}),'Original filename is positively hit-testable');
   await file.click();await box.locator('.btn_file_dw').click();await e.page.keyboard.press('Tab');await file.focus();
   assert.ok(await file.evaluate(n=>document.activeElement===n),'Native link remains keyboard focusable');await e.page.keyboard.press('Enter');
   assert.deepEqual(await e.page.evaluate(()=>window.__attachmentCalls),{file:2,bulk:1});
   assertNoRuntimeErrors(await getMetrics(e.page),e.consoleErrors);records.push({state,observation});
  } finally {await e.close()}
 }
 return records;
}

// Actual contents.css/dark.css v261028 button faces and separators. Native
// styles precede the presenter;darkmode is an independent native root flag.
const nativeActionCss=`
.btn_snsmore,.btn_report,.btn_snscrap,.btn_silbechu,.btn_cloned{display:block;float:left;width:95px;height:37px;margin-left:1px;border-right:1px solid #c4c4c4;background:#f9f9f9;color:#555;text-shadow:0 1px #fff}
.btn_recommend_box.morebox .btn_snsmore,.btn_recommend_box.morebox .btn_report,.btn_recommend_box.morebox .btn_snscrap,.btn_recommend_box.morebox .btn_silbechu,.btn_recommend_box.morebox .btn_cloned{position:relative;width:82px;height:36px;margin-left:0;box-sizing:content-box}
.btn_recommend_box.morebox .btn_snsmore::before,.btn_recommend_box.morebox .btn_report::before,.btn_recommend_box.morebox .btn_snscrap::before,.btn_recommend_box.morebox .btn_silbechu::before,.btn_recommend_box.morebox .btn_cloned::before{content:"";display:block;position:absolute;left:0;top:0;width:1px;height:100%;background:#fff}
.btn_recommend_box.morebox .recom_bottom_box>button:first-child::before{display:none}
.darkmode .btn_snsmore,.darkmode .btn_report,.darkmode .btn_snscrap,.darkmode .btn_silbechu,.darkmode .btn_cloned{background:#343434;color:#d3d3d3;border-color:#282828;text-shadow:0 1px #363636}
.darkmode .btn_recommend_box.morebox .btn_snsmore::before,.darkmode .btn_recommend_box.morebox .btn_report::before,.darkmode .btn_recommend_box.morebox .btn_snscrap::before,.darkmode .btn_recommend_box.morebox .btn_cloned::before{background:#454545}
.recom_bottom_box>button>.sp_img{display:inline-block;width:20px;height:20px;background-image:linear-gradient(45deg,#777,#ddd)}
`;

export async function runRecommendationSeparatorContract({browser,server}) {
 const records=[];
 for(const state of[{width:1440,height:1000},{width:980,height:900,dark:true},{width:980,height:2306},{width:390,height:700,dark:true}]) {
  const e=await createTestPage(browser,server.baseUrl,{viewport:{width:state.width,height:state.height},storage:{[storageKeys.threshold]:0,[storageKeys.palette]:'teal'}});
  try {
   await e.page.route(url=>url.origin===server.baseUrl&&url.pathname==='/board/view',async route=>{const response=await route.fetch(),html=(await response.text()).replace('</head>','<style>'+nativeActionCss+'</style></head>');await route.fulfill({response,body:html})});
   await e.goto('/board/view?id=test&no=1001');await e.page.evaluate(mountB1ContentFixture);
   await e.page.evaluate(dark=>{
    const bar=document.querySelector('.recom_bottom_box');bar.querySelectorAll(':scope>button').forEach(n=>n.remove());
    const parts=[['btn_silbechu','icon_silbechu','실베추'],['btn_cloned btn_svc','icon_cloned_b','펌 0'],['btn_snsmore','icon_sns','공유'],['btn_snscrap','icon_scrap','스크랩'],['btn_report','icon_report','신고']];
    window.__recommendActionCalls=0;window.__recommendActionOriginals=[];
    for(const[classes,icon,label]of parts){const n=document.createElement('button');n.type='button';n.className=classes;n.innerHTML='<em class="sp_img '+icon+'"></em>'+label;n.onclick=()=>window.__recommendActionCalls++;bar.append(n);window.__recommendActionOriginals.push({node:n,parent:bar,handler:n.onclick,icon:n.firstElementChild})}
    document.documentElement.classList.toggle('darkmode',Boolean(dark));if(dark)window.__dcufFixture.toggleDark(true);
   },state.dark);
   const buttons=e.page.locator('.recom_bottom_box>[data-dcuf-role="native-recommendation-action"]');await buttons.nth(4).waitFor();await buttons.first().evaluate(n=>n.scrollIntoView({block:'center'}));await e.page.mouse.move(0,0);
   const observe=()=>buttons.evaluateAll(ns=>ns.map(n=>{const s=getComputedStyle(n),p=getComputedStyle(n,'::before'),icon=n.firstElementChild,r=icon.getBoundingClientRect();return{pseudo:p.content==='none'||p.display==='none',face:s.backgroundColor,image:s.backgroundImage,border:s.borderLeftColor,shadow:s.textShadow,iconVisible:r.width>0&&r.height>0&&getComputedStyle(icon).backgroundImage!=='none'}}));
   const paint=await observe();assert.equal(paint.length,5);assert.ok(paint.every(x=>x.pseudo),'Every native action,including buttons2–5,has no leftover decorative vertical separator');
   assert.ok(paint.every(x=>x.face==='rgba(0, 0, 0, 0)'&&x.image==='none'&&x.border==='rgba(0, 0, 0, 0)'&&x.shadow==='none'),'Native dark root cannot restore old gray boxed paint or text emboss');assert.ok(paint.every(x=>x.iconVisible),'Original child icons remain visible');
   for(const button of await buttons.all()){await button.evaluate(n=>n.scrollIntoView({block:'center'}));assert.ok(await button.evaluate(n=>{const r=n.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return h===n||n.contains(h)}));await button.click()}
   await e.page.mouse.move(0,0);await e.page.keyboard.press('Tab');await buttons.nth(1).focus();assert.ok(await buttons.nth(1).evaluate(n=>n.matches(':focus-visible')&&parseFloat(getComputedStyle(n).outlineWidth)>0),'Keyboard focus remains visible');await e.page.keyboard.press('Enter');
   assert.equal(await e.page.evaluate(()=>window.__recommendActionCalls),6);assert.ok(await e.page.evaluate(()=>window.__recommendActionOriginals.every(x=>x.node.isConnected&&x.node.parentNode===x.parent&&x.node.onclick===x.handler&&x.node.firstElementChild===x.icon)),'Native action parents/handlers/icon nodes are retained');
   await buttons.nth(2).hover();assert.notEqual(await buttons.nth(2).evaluate(n=>getComputedStyle(n).backgroundColor),'rgba(0, 0, 0, 0)','Hover still has a local highlight');
   if(state.width===1440||state.width===980&&state.dark){
    const initial=await buttons.nth(2).evaluate(n=>getComputedStyle(n).backgroundColor);
    await e.page.evaluate(()=>window.__dcufTestbedGM.invokeMenu('UI 색상 설정'));const panel=e.page.locator('#dcuf-palette-panel');await panel.locator('[data-palette-id="purple"]').click();await panel.locator('[data-dcuf-palette-action="save"]').click();await panel.waitFor({state:'detached'});await buttons.nth(2).hover();
    assert.notEqual(await buttons.nth(2).evaluate(n=>getComputedStyle(n).backgroundColor),initial,'Restored hover paint consumes the actual theme setting rather than fixed teal');
   }
   assertNoRuntimeErrors(await getMetrics(e.page),e.consoleErrors);records.push({state,paint});
  }finally{await e.close()}
 }
 return records;
}
