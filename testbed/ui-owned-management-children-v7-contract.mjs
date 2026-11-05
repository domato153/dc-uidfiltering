import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {mountManagementV7} from './ui-owned-management-v7-contract.mjs';
import {getMetrics,assertNoRuntimeErrors} from './harness/runner-utils.mjs';
import {renderedLabelContrast} from './ui-control-material-contract.mjs';
const parentRoot='#dc-block-management-panel',manualRoot='#dc-manual-block-panel',backupRoot='#dc-backup-popup';
const settle=async p=>p.evaluate(async()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));
async function hit(n){await n.scrollIntoViewIfNeeded();return n.evaluate(x=>{const r=x.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.width>0&&r.height>=36&&(x===h||x.contains(h))})}
async function primaryMaterial(panel){return panel.evaluate(n=>{
 const read=x=>{const s=getComputedStyle(x);return[s.backgroundColor,s.backgroundImage,s.color,s.borderTopColor,s.boxShadow]};
 const actual=[...n.querySelectorAll('.dcuf-button--primary')].map(read),probe=document.createElement('div');probe.style.cssText='background:var(--dcuf-v7-primary-bg);color:var(--dcuf-v7-primary-ink);border:1px solid var(--dcuf-v7-primary-rim);box-shadow:var(--dcuf-v7-primary-shadow)';n.append(probe);const reference=read(probe);probe.remove();return{actual,reference};
})}
const bounds=async panel=>{const result=await panel.evaluate(n=>{const r=n.getBoundingClientRect();return{inside:r.x>=0&&r.y>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,overflow:n.scrollWidth-n.clientWidth}});assert.ok(result.inside);assert.equal(result.overflow,0)};
const quiet=async n=>{const s=await n.evaluate(n=>{const s=getComputedStyle(n);return[s.backgroundColor,s.backgroundImage,s.boxShadow]});assert.deepEqual(s,['rgba(0, 0, 0, 0)','none','none'],'Auxiliary action is plain at rest')};
async function capture(p,id){if(process.env.DCUF_CHILDREN_CAPTURE_DIR){await fs.mkdir(process.env.DCUF_CHILDREN_CAPTURE_DIR,{recursive:true});await p.mouse.move(0,0);await settle(p);await p.screenshot({path:process.env.DCUF_CHILDREN_CAPTURE_DIR+'/'+id+'.png',animations:'disabled'})}}

export async function runManagementChildrenV7Contract({browser,server}){
 const records=[];
 for(const spec of [{width:980,height:900},{width:980,height:900,dark:true},{width:980,height:2306},{width:390,height:700,dark:true},{width:980,height:420},{width:980,height:420,dark:true}]){
  const e=await mountManagementV7(browser,server,spec),p=e.page,parent=p.locator(parentRoot),id=spec.width+'-'+spec.height+'-'+(spec.dark?'dark':'light');
  try{
   const stored=await p.evaluate(()=>__dcufTestbedGM.snapshot().values);
   await parent.locator('.panel-search-input').fill('합성');await parent.locator('.delete-item-btn').first().click();
   await parent.locator('.panel-add-btn').click();const manual=p.locator(manualRoot);await manual.waitFor({state:'visible'});await settle(p);
   const originalField=await manual.locator('#dc-manual-block-value').elementHandle();
   for(const type of ['uid','nickname','ip']){
    await manual.locator('[data-manual-block-type='+type+']').click();await p.mouse.move(0,0);await settle(p);
    assert.equal(await manual.locator('.dcuf-manual-display-field').isVisible(),type==='uid');
    assert.ok(await originalField.evaluate(n=>n===document.querySelector('#dc-manual-block-value')),'Original input survives type changes');
    const material=await primaryMaterial(manual);for(const a of material.actual)assert.deepEqual(a,material.reference,'Child primary consumes adopted v7 bg/ink/rim/shadow');
    const active=manual.locator('[data-manual-block-type='+type+']');
    await quiet(manual.locator('[data-manual-block-action=close]'));
    const tabs=await manual.locator('[data-manual-block-type]').evaluateAll(ns=>ns.map(n=>{const s=getComputedStyle(n);return{active:n.getAttribute('aria-pressed')==='true',bg:s.backgroundColor,image:s.backgroundImage,shadow:s.boxShadow}}));
    for(const t of tabs){assert.equal(t.bg,'rgba(0, 0, 0, 0)');assert.equal(t.image,'none');assert.equal(t.shadow==='none',!t.active,'Only active text tab has an underline')}
    assert.equal(await active.getAttribute('aria-pressed'),'true');await bounds(manual);
    for(const selector of ['.dcuf-manual-close','[data-manual-block-action=close]','[data-manual-block-action=add]'])assert.ok(await hit(manual.locator(selector)));
    if(type==='uid'){await manual.locator('.dcuf-panel-body').evaluate(n=>n.scrollTop=0);await capture(p,id+'-manual')}
   }
   await manual.locator('[data-manual-block-action=add]').click();assert.equal(await manual.locator('.dcuf-manual-status').getAttribute('data-state'),'error');
   await manual.locator('.dcuf-manual-status').scrollIntoViewIfNeeded();assert.ok(await manual.locator('.dcuf-manual-status').evaluate(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}),'Validation message remains visible in form flow');
   await p.keyboard.press('Tab');await manual.locator('[data-manual-block-action=close]').focus();assert.equal(await manual.locator('[data-manual-block-action=close]').evaluate(n=>getComputedStyle(n).outlineStyle),'solid');
   assert.equal(await hit(parent.locator('.panel-search-input')),false,'Original child scrim blocks parent');
   await manual.locator('.dcuf-manual-close').click();await manual.waitFor({state:'detached'});
   await parent.locator('.panel-backup-btn').click();const backup=p.locator(backupRoot);await backup.waitFor({state:'visible'});await p.mouse.move(0,0);await settle(p);await bounds(backup);
   await quiet(backup.locator('.export-btn-download'));const material=await primaryMaterial(backup);for(const a of material.actual)assert.deepEqual(a,material.reference);
   const gap=await backup.evaluate(n=>n.querySelector('.import-btn').getBoundingClientRect().top-n.querySelector('textarea').getBoundingClientRect().bottom);assert.ok(gap>=10,'Backup input and import action need visible separation: '+gap);
   const compact=await backup.locator('.dcuf-button--primary').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(n);return{label:n.textContent.trim(),width:r.width,height:r.height,textWidth:range.getBoundingClientRect().width}}));
   for(const button of compact){assert.ok(button.height>=36&&button.height<=40,'Backup primary keeps a compact positive target: '+JSON.stringify(button));assert.ok(button.width<=button.textWidth+28,'Backup primary follows its label instead of a long fixed minimum: '+JSON.stringify(button))}
   for(const selector of ['.popup-close-btn','.export-btn-download','.export-btn','.import-file-input','textarea','.import-btn'])assert.ok(await hit(backup.locator(selector)),selector+' has an original positive reachable target');
   await backup.locator('.dcuf-panel-body').evaluate(n=>n.scrollTop=0);await capture(p,id+'-backup');
   await backup.locator('.popup-close-btn').click();await backup.waitFor({state:'detached'});
   assert.equal(await parent.locator('.panel-search-input').inputValue(),'합성');assert.equal(await parent.locator('.item-to-delete').count(),1);assert.equal(await parent.locator('[data-type=uids]').getAttribute('aria-selected'),'true');
   await parent.locator('.panel-close-btn').click();await parent.waitFor({state:'detached'});assert.deepEqual(await p.evaluate(()=>__dcufTestbedGM.snapshot().values),stored);
   // The same direct-block child is also reachable through the original menu.
   await p.locator('#dc-personal-block-fab').click();await p.locator('[data-dcuf-fab-action=manual-block]').click();await manual.waitFor({state:'visible'});await p.keyboard.press('Escape');await manual.waitFor({state:'detached'});
   assertNoRuntimeErrors(await getMetrics(p),e.consoleErrors);records.push({...spec,gap});
  }finally{await e.close()}
 }
 return{records};
}

export async function runManagementChildrenV7PaletteContract({browser,server}){
 const records=[];
 for(const dark of [false,true]){
  const e=await mountManagementV7(browser,server,{dark}),p=e.page;
  try{
   for(const [action,root]of[['.panel-add-btn',manualRoot],['.panel-backup-btn',backupRoot]]){
    await p.locator(parentRoot+' '+action).click();const child=p.locator(root);await child.waitFor({state:'visible'});
    const read=()=>child.evaluate(n=>{const s=getComputedStyle(n.querySelector('.dcuf-button--primary')),tab=n.querySelector('[aria-pressed=true]');return{face:s.backgroundColor+'|'+s.backgroundImage,ink:s.color,rim:s.borderTopColor,tab:tab?getComputedStyle(tab).color:null,underline:tab?getComputedStyle(tab).boxShadow:null}});
    const values=[];
    for(const id of ['blue','mono','rose']){
     await p.evaluate(()=>__dcufTestbedGM.invokeMenu('UI 색상 설정'));const palette=p.locator('#dcuf-palette-panel');await palette.locator('[data-palette-id='+id+']').click();await settle(p);const preview=await read();await palette.locator('[data-dcuf-palette-action=save]').click();await palette.waitFor({state:'detached'});await settle(p);assert.deepEqual(await read(),preview);values.push(preview);
     for(const button of await child.locator('.dcuf-button--primary').all()){await button.scrollIntoViewIfNeeded();const selector=root+' .'+(await button.getAttribute('class')).split(' ').find(c=>['export-btn','import-btn'].includes(c)||c==='dcuf-button--primary');const contrast=await renderedLabelContrast(p,selector);assert.ok(contrast.min>=4.5,JSON.stringify({dark,root,id,contrast:contrast.min}));records.push({dark,root,palette:id,contrast:contrast.min})}
    }
    for(const key of Object.keys(values[0]).filter(key=>values[0][key]!==null))assert.equal(new Set(values.map(v=>v[key])).size,3,key+' follows actual palette selection');
    const saved=await read();await p.evaluate(()=>__dcufTestbedGM.invokeMenu('UI 색상 설정'));const palette=p.locator('#dcuf-palette-panel');await palette.locator('[data-palette-id=teal]').click();await settle(p);assert.notDeepEqual(await read(),saved);await palette.locator('[data-dcuf-palette-action=cancel]').click();await palette.waitFor({state:'detached'});await settle(p);assert.deepEqual(await read(),saved);
    await child.locator('.dcuf-icon-button').click();await child.waitFor({state:'detached'});
   }
   assertNoRuntimeErrors(await getMetrics(p),e.consoleErrors);
  }finally{await e.close()}
 }
 console.log(JSON.stringify({childPaletteLabels:records.length,minContrast:Math.min(...records.map(r=>r.contrast)),palettes:['blue','mono','rose']}));
 return{records};
}
