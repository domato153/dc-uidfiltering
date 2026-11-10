import {mkdir,appendFile} from'node:fs/promises';
import {assert,getMetrics,assertNoRuntimeErrors} from'./harness/runner-utils.mjs';
import {mountPopupBatch} from'./ui-popup-batch-v7-contract.mjs';
import {mountB1AccountPickerFixture} from'./fixtures/b1-account-picker.mjs';
import {mountWriterV7} from'./ui-b1-write-v7-contract.mjs';
import {mountFolderChildren,mountEditorChildren} from'./fixtures/b1-residual-children.mjs';
import {nativeResidualCss,folderNativeHtml,editorNativeHtml,writerDcconNativeHtml} from'./fixtures/b1-residual-native-data.mjs';

export const residualSpecs=[{width:980,height:900},{width:980,height:900,dark:true},{width:390,height:700,dark:true},{width:980,height:420},{width:980,height:2306}];
const settle=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const geometry=n=>n.evaluate(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,hits:[.2,.5,.8].map(t=>n.contains(document.elementFromPoint(r.x+r.width*t,r.y+r.height*.5)))}});
const paint=n=>n.evaluate(n=>{const s=getComputedStyle(n),p=document.createElement('span');p.style.color='var(--dcuf-v7-primary-ink)';n.parentElement.append(p);const expected=getComputedStyle(p).color;p.remove();return{color:s.color,background:s.backgroundImage,border:s.borderColor,shadow:s.boxShadow,expected}});
async function capture(p,s,name,root){if(!process.env.DCUF_RESIDUAL_CAPTURE||s.width!==980||s.height!==900)return;await mkdir(process.env.DCUF_RESIDUAL_CAPTURE,{recursive:true});await p.mouse.move(0,0);await root.screenshot({path:`${process.env.DCUF_RESIDUAL_CAPTURE}/${s.dark?'dark':'light'}-${name}.png`,animations:'disabled',timeout:6000});await p.screenshot({path:`${process.env.DCUF_RESIDUAL_CAPTURE}/${s.dark?'dark':'light'}-${name}-page.png`,animations:'disabled'});}

export async function runResidualChildren({browser,server},{verify=true,specs=residualSpecs}={}){
 const rows=[];
 for(const s of specs)for(const family of['folders','editor']){
  const e=family==='folders'?await mountPopupBatch(browser,server,s,'content'):await mountWriterV7(browser,server,s),p=e.page,issues=[];
  const check=(value,message)=>{if(!value)issues.push(message)};
  try{
   if(family==='folders'){
    await p.evaluate(mountB1AccountPickerFixture);await p.evaluate(mountFolderChildren,{html:folderNativeHtml,css:nativeResidualCss});await settle(p);
    const header=p.locator('#focus_cmt .comment_count'),jump=header.locator('.cmtup');
    await jump.scrollIntoViewIfNeeded();check((await geometry(jump)).hits.every(Boolean),'Native comment jump stays reachable');
    check(await jump.evaluate(n=>getComputedStyle(n).backgroundColor==='rgba(0, 0, 0, 0)'&&getComputedStyle(n).color!=='rgb(59, 72, 144)'),'Native comment jump no longer retains the white/blue host box');
    const nextSort=header.locator('#residual-sort-n');check((await geometry(nextSort)).hits.every(Boolean),'Native transparent sort input owns its intended hit area');
    await nextSort.check();check(await nextSort.isChecked(),'Original native sort radio still selects');
    check(await header.locator('label[for="residual-sort-n"]').evaluate(n=>{const probe=document.createElement('span');probe.style.color='var(--dcuf-comment-fg)';n.parentElement.append(probe);const expected=getComputedStyle(probe).color;probe.remove();return getComputedStyle(n).color===expected}),'Selected native sort uses themed reading ink');
    check(await header.locator('#residual-sort-n + .checkmark').evaluate(n=>getComputedStyle(n).backgroundImage==='none'&&parseFloat(getComputedStyle(n,'::after').borderRightWidth)===2),'Native sprite is replaced by one theme-linked checked decoration');
    await header.locator('#residual-sort-d').check();
    await p.locator('#focus_cmt .tx_dccon').click();
    check(await p.locator('#div_con').evaluate(n=>getComputedStyle(n).overflowY==='auto'),'Normal picker retains bounded scroll with closed folder/helpers');
    for(const kind of['list','add','select','inline-add','edit','color','help']){
     await p.evaluate(kind=>__residualFixture.openFolder(kind),kind);await settle(p);
     const selector=await p.evaluate(kind=>__residualFixture.roots[kind],kind);let root=p.locator(selector).first();if(kind==='help')root=p.locator(selector).first();
     await root.scrollIntoViewIfNeeded();const box=await geometry(root);
     check(box.width>=120&&box.height>=60,kind+' has meaningful open panel bounds');
     const panel=kind==='help'?root:root;
     const role=await root.getAttribute('data-dcuf-comment-role');
     check(role==='comment-folder'||kind==='help'&&await root.locator('xpath=..').getAttribute('data-dcuf-role')==='native-comment-popup',kind+' has contextual folder/popup root');
     check(box.x>=-1&&box.right<=s.width+1,kind+' fits horizontal viewport');
     const primary=root.locator('.btn_blue:visible,.btn_apply:visible').last();
     if(kind!=='help')check(await primary.count()===1,kind+' requires its visible native primary');
     if(kind==='list')check(await root.locator('.bkmark_editlist li:visible').count()===3,'Folder list requires three visible native rows');
     if(await primary.count()){
      await primary.scrollIntoViewIfNeeded();const q=await geometry(primary),ink=await paint(primary);
      const liveBox=await geometry(root),contained=q.hits.every(Boolean)&&q.y>=liveBox.y-1&&q.bottom<=liveBox.bottom+1;check(contained,kind+' primary is vertically contained with positive hits');
      if(!contained)console.log('RESIDUAL_GEOMETRY',JSON.stringify({kind,viewport:s,root:liveBox,primary:q,top:await primary.evaluate(n=>{const r=n.getBoundingClientRect();return document.elementsFromPoint(r.x+r.width/2,r.y+r.height/2).slice(0,4).map(e=>e.id||e.className)})}));
      check(ink.color===ink.expected&&ink.background!=='none'&&ink.shadow!=='none',kind+' primary consumes paired v7 material');
      check(q.width<=200&&q.height>=32,kind+' primary is label-sized');
     }
     const field=root.locator('input[type=text]:visible').first();if(await field.count()){
      await field.scrollIntoViewIfNeeded();const q=await geometry(field),liveBox=await geometry(root);check(q.hits.every(Boolean)&&q.width>40&&q.right<=liveBox.right+1,kind+' field is reachable and contained');await field.focus();check(await field.evaluate(n=>n===document.activeElement),kind+' native field retains focus');
     }
     if(['add','inline-add','edit'].includes(kind))check(await field.count()===1,kind+' requires visible native field');
     if(await field.count()&&await root.locator('.naming .num:visible').count()){
      const input=await geometry(field),count=await geometry(root.locator('.naming .num:visible').first());
      check(count.x>=input.right+3&&count.right<=box.right+1,kind+' count stays beside the input without overlap');
     }
     const text=root.locator('.fdname:visible,.stxt:visible,.tip_txtbox:visible,.txt_box p:visible');if(await text.count())check(await text.evaluateAll(ns=>ns.every(n=>{const p=document.createElement('span');p.style.color='var(--dcuf-theme-fg)';n.parentElement.append(p);const expected=getComputedStyle(p).color;p.remove();return getComputedStyle(n).color===expected})),kind+' all guidance uses readable themed ink');
     const swatch=root.locator('.sel_color').first();if(await swatch.count())check(await swatch.evaluate(n=>!n.style.background||getComputedStyle(n).backgroundColor===n.style.backgroundColor),kind+' authored color survives');
     await root.scrollIntoViewIfNeeded();await capture(p,s,'folder-'+kind,panel);
     if(kind!=='help'){
      const close=root.locator('.poply_whiteclose:visible,.poply_bgblueclose:visible,.btn_bkm_close:visible').last();check(await close.count()===1,kind+' requires native close control');
      if(await close.count()){await close.scrollIntoViewIfNeeded();const reachable=(await geometry(close)).hits.every(Boolean);check(reachable,kind+' close has positive hits');if(reachable)await close.click({timeout:2500});else if(!verify)await close.evaluate(n=>n.click());check(await root.isHidden(),kind+' original close callback hides root');}
     }
     await p.evaluate(()=>__residualFixture.closeFolders());
     await settle(p);check(await p.locator('#div_con').evaluate(n=>getComputedStyle(n).overflowY==='auto'),'Closing '+kind+' restores normal picker scroll');
    }
   }else{
    await p.evaluate(mountEditorChildren,{html:editorNativeHtml,css:nativeResidualCss,dccon:writerDcconNativeHtml});await settle(p);
    for(const kind of['modal-link','modal-image','modal-video','modal-help','popover-link','popover-image','popover-table','dccon']){
     await p.evaluate(kind=>__residualFixture.openEditor(kind),kind);await settle(p);
     const selector=kind==='dccon'?'#div_con':`[data-fixture-child="${kind}"]`,root=p.locator(selector);await root.scrollIntoViewIfNeeded();
     const panel=kind.startsWith('modal')?root.locator('.note-modal-content'):root;const box=await geometry(panel);
     check(box.width>=120&&box.height>=28,kind+' has meaningful open bounds');check(box.x>=-1&&box.right<=s.width+1,kind+' fits horizontal viewport');
     if(kind!=='dccon'){
      check(await root.getAttribute('data-dcuf-native-form-role')===(kind.startsWith('modal')?'editor-dialog':'editor-popover'),kind+' has contextual native form role');
      check(await panel.evaluate(n=>getComputedStyle(n).backdropFilter!=='none'),kind+' uses transmitting glass');
      if(kind.startsWith('modal'))check((await geometry(root.locator('.note-modal-header'))).hits.every(Boolean),kind+' header is above native search chrome');
      const field=panel.locator('input[type=text]:visible').first();if(await field.count()){await field.scrollIntoViewIfNeeded();check((await geometry(field)).hits.every(Boolean),kind+' original input hit');await field.focus();check(await field.evaluate(n=>n===document.activeElement),kind+' original focus');}
      const primary=panel.locator('.note-modal-footer input[type=button]:visible,.note-modal-footer button:visible').last();if(await primary.count()){const ink=await paint(primary);check(ink.color===ink.expected&&ink.background!=='none',kind+' primary uses paired v7 material');}
     }else{
      const heading=root.locator('.pop_content>.blind h3');check(await heading.evaluate(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return r.width>0&&r.height>0&&s.visibility==='visible'&&parseFloat(s.fontSize)>=14}),'Writer DCCon heading is visible');
      const media=root.locator('.dccon_list .list_li:visible');check(await media.count()===8,'Writer DCCon requires eight visible native-shaped media items');
      check(await root.locator('.dccon_list img').evaluateAll(ns=>ns.length===12&&ns.every(n=>n.complete&&n.naturalWidth===100)),'Writer DCCon synthetic media actually decode');
      const first=media.first();await first.scrollIntoViewIfNeeded();check((await geometry(first)).hits.every(Boolean),'Writer DCCon actual media has positive hits');
      const strip=root.locator('.dccon_tab_btnbox');await strip.scrollIntoViewIfNeeded();
      const packs=await strip.locator('.tab_btnlist > li').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().toJSON()));
      check(packs.length>=2&&packs.every(n=>n.height>=36)&&Math.max(...packs.map(n=>n.y))-Math.min(...packs.map(n=>n.y))<=1,'Writer pack choices share a compact horizontal row');
      check((await geometry(strip)).height<=60,'Writer pack strip does not expand into multiple vertical rows');
      check(await strip.locator('.dccon_btn.recent').evaluate(n=>getComputedStyle(n).backgroundColor==='rgba(0, 0, 0, 0)'),'Writer recent icon retains a quiet transparent face in both themes');
      check(await strip.locator('.recent_li').evaluate(n=>getComputedStyle(n).backgroundColor==='rgba(0, 0, 0, 0)'),'Writer recent tile does not retain the native white backdrop in dark mode');
      check(await root.locator('.dccon_list .list_2:visible').count()===0,'Native second page stays hidden until selected');
      const pager=root.locator('.dccon_list_paging');await pager.scrollIntoViewIfNeeded();
      const pagerBox=await geometry(pager),frame=await geometry(root);check(pagerBox.x>=frame.x-1&&pagerBox.right<=frame.right+1,'Native paging footer spans and fits the media grid');
      for(const [button,expected]of[['.btn_next',4],['.btn_prev',8]]){const b=pager.locator(button);const reachable=(await geometry(b)).hits.every(Boolean);check(reachable,'Native '+button+' paging has positive hits');if(reachable)await b.click();else if(!verify)await b.evaluate(n=>n.click());check(await root.locator('.dccon_list .list_li:visible').count()===expected,'Original paging callback retains native hidden-page counts');}
      check(await root.locator('.pop_content.dcconlayer').evaluate(n=>getComputedStyle(n).overflow==='visible'&&getComputedStyle(n).backdropFilter==='none'),'Writer native popup ancestor stays unclipped and unfiltered');
      const primary=root.locator('.btn_blue:visible,.btn_apply:visible').first();if(await primary.count()){const ink=await paint(primary);check(ink.color===ink.expected,'Writer DCCon paired action');}
     }
     await panel.scrollIntoViewIfNeeded();await capture(p,s,kind,panel);
     if(kind.startsWith('modal')){
      const close=root.locator('.note-modal-header .close'),reachable=(await geometry(close)).hits.every(Boolean);
      check(reachable,kind+' native close is reachable');
      // The frozen deficient control can put its close outside the viewport.
      // Diagnostic replay still compares its callback;candidate requires a real hit.
      if(reachable)await close.click({timeout:2500});else if(!verify)await close.evaluate(n=>n.click());
      check(await root.isHidden(),kind+' original close hides dialog');
     }
     await p.evaluate(()=>__residualFixture.closeEditor());await settle(p);
    }
   }
   const semantic=await p.evaluate(()=>({calls:__residualFixture.calls,identity:__residualFixture.originals.concat(window.__residualHeaderOriginals||[]).every(({node,parent,handler,type,name})=>node.isConnected&&node.parentNode===parent&&node.onclick===handler&&node.getAttribute('type')===type&&node.getAttribute('name')===name),values:__residualFixture.originals.concat(window.__residualHeaderOriginals||[]).filter(x=>x.node.matches('input')).map(x=>[x.type,x.name,x.node.value,x.node.checked,x.node.disabled])}));
   check(semantic.identity,'Original nodes/parents/handlers/native field identity retained');assertNoRuntimeErrors(await getMetrics(p),e.consoleErrors);
   const row={id:`${family}-${s.width}-${s.height}-${s.dark?'dark':'light'}`,issues,semantic};rows.push(row);if(process.env.DCUF_RESIDUAL_OBSERVATIONS)await appendFile(process.env.DCUF_RESIDUAL_OBSERVATIONS,JSON.stringify(row)+'\n');
  }finally{await e.close()}
 }
 if(verify)assert.equal(rows.filter(r=>r.issues.length).length,0,JSON.stringify(rows.map(({id,issues})=>({id,issues}))));return rows;
}
