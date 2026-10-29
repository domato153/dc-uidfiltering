import assert from 'node:assert/strict';
import {createTestPage,storageKeys,assertNoRuntimeErrors,getMetrics} from './harness/runner-utils.mjs';
import {mountB1ContentFixture} from './fixtures/b1-content.mjs';
import {mountB1ImageCommentsFixture} from './fixtures/b1-image-comments.mjs';
import {renderedLabelContrast} from './ui-control-material-contract.mjs';

const main='[data-dcuf-role="comment-composer"][data-dcuf-state="main"]';
const hit=loc=>loc.evaluate(n=>{const r=n.getBoundingClientRect(),t=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.width>0&&r.height>0&&(n===t||n.contains(t))});
export async function mountArticleV7State(browser,server,state){
 const e=await createTestPage(browser,server.baseUrl,{viewport:{width:state.width,height:state.height},storage:{[storageKeys.threshold]:0,[storageKeys.palette]:'teal'}});
 await e.goto('/board/view?id=test&no=1001&comments=4');await e.page.evaluate(mountB1ContentFixture);await e.page.evaluate(mountB1ImageCommentsFixture,{imageWidth:700});
 await e.page.evaluate(()=>{const bar=document.createElement('div');bar.className='view_bottom_btnbox fixture-v7-native-actions';bar.innerHTML='<div class="fl"><button type="button" class="btn_grey">전체글</button><button type="button" class="btn_grey">개념글</button></div><div class="fr"><button type="button" class="btn_grey cancle">삭제</button><button type="button" class="btn_blue write">글쓰기</button></div>';window.__v7ActionCalls=0;for(const n of bar.querySelectorAll('button'))n.onclick=()=>window.__v7ActionCalls++;window.__v7ActionOriginals=[...bar.querySelectorAll('button')].map(node=>({node,parent:node.parentNode,handler:node.onclick}));document.querySelector('[data-dcuf-role="article"]').append(bar)});
 await e.page.locator('.fixture-v7-native-actions [data-dcuf-role="native-article-action"]').first().waitFor({state:'visible'});
 if(state.dark)await e.page.evaluate(()=>window.__dcufFixture.toggleDark(true));
 const area=e.page.locator('.img_area.no1').filter({has:e.page.getByRole('button',{name:'이미지댓글 ON/OFF 1',exact:true})});await area.locator('.btn_imgcmt').click();await area.locator('.img_comment').click();await area.locator('[data-dcuf-role="native-comment-submit"]').waitFor({state:'visible'});
 await e.page.evaluate(()=>document.fonts.ready);return {e,area};
}
export async function runArticleV7Contract({browser,server,onCapture}){
 const records=[];
 for(const state of[{width:1440,height:1000},{width:980,height:900},{width:980,height:900,dark:true},{width:980,height:2306},{width:390,height:700,dark:true}]){
  const {e,area}=await mountArticleV7State(browser,server,state);
  try{
   assert.ok((await e.page.locator('[data-dcuf-role="article"]').boundingBox()).width<=1121,'Article uses the coherent content gutter rather than filling the viewport');
   const alignment=await e.page.locator('[data-dcuf-role="article"]').evaluate(n=>{const a=n.getBoundingClientRect(),p=n.parentElement.getBoundingClientRect();return Math.abs(a.left+a.width/2-p.left-p.width/2)});
   assert.ok(alignment<=1,'Native article is centered within its original parent,not only width-limited: '+alignment);
   const row=e.page.locator('#focus_cmt [data-dcuf-role="comment-item"]').filter({visible:true}).first();assert.equal(await row.evaluate(n=>getComputedStyle(n).boxShadow),'none','Ordinary rows use one continuous reading surface rather than repeated raised cards');
   if(state.width>=760)assert.ok(await row.locator('.nickname').first().evaluate(n=>n.clientWidth>=n.scrollWidth-1),'Short native nickname fits the author column without the retired date-width reservation');
   if(state.width===1440){const fallback=await e.page.evaluate(()=>{const probe=document.createElement('div');probe.id='comment_wrap_v7_unowned';probe.innerHTML='<div class="comment_box"><div class="cmt_nickbox">unprojected</div></div>';document.body.append(probe);const width=getComputedStyle(probe.querySelector('.cmt_nickbox')).maxWidth;probe.remove();return width});assert.equal(fallback,'calc(100% - 84px)','Legacy author reservation remains for genuinely unprojected native comments');}
   const quiet=e.page.locator('[data-dcuf-role="native-recommendation-action"]').filter({visible:true});assert.ok(await quiet.count()>0);assert.ok(await quiet.evaluateAll(ns=>ns.every(n=>{const s=getComputedStyle(n);return s.backgroundColor==='rgba(0, 0, 0, 0)'&&s.backgroundImage==='none'&&s.boxShadow==='none'})),'Secondary recommendation utilities are plain at rest');
   const witnesses=[];
   for(const root of[e.page.locator(main).first(),area.locator('[data-dcuf-role="comment-composer"]'),e.page.locator('[data-dcuf-role="comment-composer"][data-dcuf-state="reply"]').first()]){
    const submit=root.locator('[data-dcuf-role="native-comment-submit"]').first();await submit.evaluate(n=>n.scrollIntoView({block:'center'}));
    const g=await root.evaluate(n=>{const r=x=>x?.getBoundingClientRect().toJSON(),q=s=>n.querySelector(`[data-dcuf-role="${s}"]`);return{outer:r(n),editor:r(q('comment-editor')),textarea:r(q('native-comment-textarea')),footer:r(q('comment-composer-actions')),submit:r(q('native-comment-submit')),fields:[...n.querySelectorAll('[data-dcuf-role="native-comment-field"]')].filter(x=>x.getBoundingClientRect().height>0).map(r),tools:[...n.querySelectorAll('[data-dcuf-role="native-comment-tool"]')].filter(x=>x.getBoundingClientRect().height>0).map(r)}});
    assert.ok(g.fields.length>=2,'Visible nickname/password remain');assert.ok(g.footer.top-g.textarea.bottom>=8,'Textarea clears the separate footer: '+JSON.stringify(g));
    assert.ok(g.submit.top>=g.footer.top-1&&g.submit.bottom<=g.footer.bottom+1,'Register remains wholly inside footer');
    assert.ok(g.outer.bottom>=Math.max(g.submit.bottom,...g.fields.map(f=>f.bottom))+9,'Outer enclosure contains both fields and complete footer with padding');
    assert.ok(g.submit.height>=40&&await hit(submit),'Original submit target remains reachable');
    assert.ok(g.tools.every(t=>t.top>=g.textarea.bottom+8),'Tools never touch textarea');
    for(const tool of await root.locator('[data-dcuf-role="native-comment-tool"]').all()){
     await e.page.mouse.move(0,0);await tool.evaluate(n=>n.blur());assert.equal(await tool.evaluate(n=>getComputedStyle(n).backgroundImage+'|'+getComputedStyle(n).backgroundColor),'none|rgba(0, 0, 0, 0)','Tools are plain at rest');
     await tool.hover();assert.notEqual(await tool.evaluate(n=>getComputedStyle(n).backgroundImage+'|'+getComputedStyle(n).backgroundColor),'none|rgba(0, 0, 0, 0)','Actual tool hover paint wins its base rule');
     await e.page.keyboard.press('Tab');await tool.focus();assert.notEqual(await tool.evaluate(n=>getComputedStyle(n).outlineStyle),'none','Tool keyboard focus is visible');await tool.evaluate(n=>n.blur());
    }
    const material=await submit.evaluate(n=>{const p=document.createElement('i');n.append(p);p.style.cssText='background:var(--dcuf-v7-primary-bg);color:var(--dcuf-v7-primary-ink);border:1px solid var(--dcuf-v7-primary-rim);box-shadow:var(--dcuf-v7-primary-shadow)';const a=getComputedStyle(n),s=getComputedStyle(p),pick=x=>({image:x.backgroundImage,fill:x.backgroundColor,ink:x.color,rim:x.borderColor,shadow:x.boxShadow});const out={actual:pick(a),memoRecipe:pick(s)};p.remove();return out});assert.deepEqual(material.actual,material.memoRecipe,'Primary finish consumes actual memo v7 material roles');
    const contrastSelector=await submit.evaluate(n=>{n.dataset.dcufV7ContrastTarget='1';return '[data-dcuf-v7-contrast-target="1"]'});
    const contrast=await renderedLabelContrast(e.page,contrastSelector);await submit.evaluate(n=>delete n.dataset.dcufV7ContrastTarget);assert.ok(contrast.min>=4.5,'Composited register contrast '+contrast.min);
    await e.page.keyboard.press('Tab');await submit.focus();assert.notEqual(await submit.evaluate(n=>getComputedStyle(n).outlineStyle),'none','Keyboard focus remains visible');witnesses.push(g);
   }
   assert.equal(await area.locator('.reply_list').count(),0,'Image comments do not gain invented replies');
   const imageBounds=await area.locator('.view_comment').evaluate(n=>{const r=n.getBoundingClientRect();return{left:r.left,right:r.right,client:n.clientWidth,scroll:n.scrollWidth,children:[...n.querySelectorAll('[data-dcuf-role="comment-wrapper"],[data-dcuf-role="comment-box"],[data-dcuf-role="comment-text"]')].map(c=>c.getBoundingClientRect().toJSON())}});
   assert.ok(imageBounds.scroll<=imageBounds.client+1&&imageBounds.children.every(r=>r.x>=imageBounds.left-1&&r.right<=imageBounds.right+1),'Image rows/text stay inside their own pane,not merely the page viewport: '+JSON.stringify(imageBounds));
   assert.ok(await e.page.evaluate(()=>window.__b1ImageOriginals.every(o=>o.node.isConnected&&o.node.parentNode===o.parent&&o.node.onclick===o.handler)),'Image native parents and callbacks preserved');
   assert.ok(await e.page.evaluate(()=>window.__v7ActionOriginals.every(o=>o.node.isConnected&&o.node.parentNode===o.parent&&o.node.onclick===o.handler)),'Native bottom actions retain their original parents/handlers');
   assert.ok(await e.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No page horizontal overflow');
   await onCapture?.(e,state);assertNoRuntimeErrors(await getMetrics(e.page),e.consoleErrors);records.push({state,witnesses});
  }finally{await e.close()}
 }
 return records;
}

export async function runArticleV7PaletteContract({browser,server}){
 const records=[];
 for(const dark of[false,true]){
  const{e,area}=await mountArticleV7State(browser,server,{width:980,height:900,dark});
  try{
   const targets={main:e.page.locator(main+' [data-dcuf-role="native-comment-submit"]').first(),image:area.locator('[data-dcuf-role="native-comment-submit"]').first(),vote:e.page.locator('[data-dcuf-role="native-recommend-up"]').first(),write:e.page.locator('.fixture-v7-native-actions [data-dcuf-state="primary"]').first()};
   for(const[key,node]of Object.entries(targets))await node.evaluate((n,key)=>n.dataset.dcufV7PalettePart=key,key);
   const read=()=>e.page.evaluate(()=>Object.fromEntries([...document.querySelectorAll('[data-dcuf-v7-palette-part]')].flatMap(n=>{const s=getComputedStyle(n),id=n.dataset.dcufV7PalettePart,rows=[[id+'Face',s.backgroundColor+'|'+s.backgroundImage],[id+'Ink',s.color],[id+'Rim',s.borderColor]];if(id==='vote'){const icon=n.querySelector('[data-dcuf-role="recommend-up-icon"]');for(const pseudo of['::before','::after']){const ink=getComputedStyle(icon,pseudo).color;if(ink!==s.color)throw Error('Pseudo glyph ink differs from measured foreground');rows.push([id+pseudo+'Ink',ink])}}return rows})));
   const settle=()=>e.page.locator('[data-dcuf-role="article"]').evaluate(async n=>Promise.all(n.getAnimations({subtree:true}).filter(a=>Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{}))));
   const signatures=[],contrasts=[];
   for(const id of['blue','purple','green','orange','mono','indigo','sky','cyan','teal','lime','amber','red','rose','pink']){
    await e.page.evaluate(()=>window.__dcufTestbedGM.invokeMenu('UI 색상 설정'));const panel=e.page.locator('#dcuf-palette-panel');await panel.locator(`[data-palette-id="${id}"]`).click();await settle();const preview=await read();await panel.locator('[data-dcuf-palette-action="save"]').click();await panel.waitFor({state:'detached'});await settle();const saved=await read();assert.deepEqual(saved,preview,'Article/comment palette preview and save agree');signatures.push(saved);
    for(const[key,node]of Object.entries(targets)){await node.evaluate(n=>n.scrollIntoView({block:'center'}));const contrast=await renderedLabelContrast(e.page,`[data-dcuf-v7-palette-part="${key}"]`,{glyphMask:key==='vote'});assert.ok(contrast.min>=4.5,`${id}/${dark}/${key} composited contrast ${contrast.min}`);contrasts.push({id,key,min:contrast.min})}
    if(dark&&id==='blue'){
     const vote=targets.vote,selector='[data-dcuf-v7-palette-part="vote"]',original=await vote.getAttribute('style');
     await vote.evaluate(n=>n.style.setProperty('--dcuf-v7-primary-ink','#6b7888'));const lowInk=await renderedLabelContrast(e.page,selector,{glyphMask:true});assert.ok(lowInk.min<4.5,'Glyph-scoped measurement rejects genuinely weak ink');
     await vote.evaluate((n,s)=>s===null?n.removeAttribute('style'):n.setAttribute('style',s),original);
     await vote.evaluate(n=>n.style.opacity='.4');const lowOpacity=await renderedLabelContrast(e.page,selector,{glyphMask:true});assert.ok(lowOpacity.min<4.5,'Glyph-scoped measurement retains ancestor/element opacity effects');
     await vote.evaluate((n,s)=>s===null?n.removeAttribute('style'):n.setAttribute('style',s),original);
    }
   }
   for(const key of Object.keys(signatures[0]))assert.equal(new Set(signatures.map(s=>s[key])).size,14,key+' individually follows all14 palette values');
   const committed=await read();await e.page.evaluate(()=>window.__dcufTestbedGM.invokeMenu('UI 색상 설정'));const panel=e.page.locator('#dcuf-palette-panel');await panel.locator('[data-palette-id="blue"]').click();await settle();assert.notDeepEqual(await read(),committed);await panel.locator('[data-dcuf-palette-action="cancel"]').click();await panel.waitFor({state:'detached'});await settle();assert.deepEqual(await read(),committed,'Cancel restores every changed primary face/ink/rim');
   assertNoRuntimeErrors(await getMetrics(e.page),e.consoleErrors);records.push({dark,palettes:14,contrasts});
  }finally{await e.close()}
 }
 return records;
}

export async function runArticleV7ContrastOracleContract({browser}){
 const context=await browser.newContext({viewport:{width:400,height:180}});
 try{
  const page=await context.newPage();await page.setContent('<style>body{margin:24px}button{position:relative;width:200px;height:60px;border:0;padding:0;color:#fff;background:linear-gradient(90deg,#000 50%,#fafafa 50%);font:600 24px/1 monospace}.glyph{display:flex;align-items:center;justify-content:center;width:100%;height:100%}.glyph::after{content:"MMMMMMMM"}</style><button><span class="glyph"></span></button>');
  const mixed=await renderedLabelContrast(page,'button',{glyphMask:true});assert.ok(mixed.min<4.5,'Glyph measurement must retain the near-white background beneath white ink,not discard its low-difference pixels: '+mixed.min);
  await page.locator('button').evaluate(n=>n.style.background='linear-gradient(90deg,#000 50%,#222 50%)');const good=await renderedLabelContrast(page,'button',{glyphMask:true});assert.ok(good.min>=4.5,'The mask also accepts independently high-contrast backing');return{scope:'ORACLE_CONTROL_NOT_PRODUCT_UI',mixed,good};
 }finally{await context.close()}
}
