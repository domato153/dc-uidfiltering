import assert from 'node:assert/strict';
import {createTestPage,storageKeys,getMetrics,assertNoRuntimeErrors} from './harness/runner-utils.mjs';
import {mountB1NativeFixture} from './fixtures/b1-native-list.mjs';
import {installLiveControlFixture} from './ui-live-control-contract.mjs';

// The user reverted only the added disclosures, not the native overflow menu.
export async function runCategoryPickerContract({browser,server}) {
 const records=[];
 for(const state of [{width:1536,height:1024},{width:980,height:900,dark:true},{width:390,height:700},{width:390,height:700,dark:true}]) {
  const e=await createTestPage(browser,server.baseUrl,{viewport:{width:state.width,height:state.height},storage:{[storageKeys.threshold]:0,[storageKeys.palette]:'teal'}}),p=e.page;
  try {
   await mountB1NativeFixture(e,server.baseUrl,{dark:state.dark});await p.evaluate(installLiveControlFixture);
   await p.waitForSelector('[data-dcuf-role="category-list"]');
   assert.equal(await p.locator('[data-dcuf-category-invoker]').count(),0,'Categories are inline at page top; no added disclosure');
   const root=p.locator('[data-dcuf-role="category-shell"]');
   assert.equal(await root.getAttribute('popover'),null);
   const links=root.locator(':scope > ul > li > a');
   assert.ok(await links.count()>1);
   for(const n of await links.all())assert.ok(await n.isVisible(),'Original inline category destination is rendered');
   await p.evaluate(()=>{
    window.__inlineCalls=[];
    window.__inlineOriginals=[...document.querySelectorAll('.list_array_option .center_box a')].map((node,index)=>{
     node.onclick=event=>{event.preventDefault();__inlineCalls.push(index)};
     return {node,parent:node.parentNode,onclick:node.onclick,href:node.getAttribute('href')};
    });
   });
   await links.first().click();
   const arrow=p.locator('[data-dcuf-role="category-toggle"]'),popup=p.locator('[data-dcuf-role="category-popup"]');
   await arrow.click();await popup.waitFor({state:'visible'});
   const geometry=await popup.evaluate(n=>{const b=n.getBoundingClientRect(),a=document.querySelector('[data-dcuf-role="category-toggle"]').getBoundingClientRect();return{box:b.toJSON(),arrow:a.toJSON(),viewport:innerWidth}});
   assert.ok(geometry.box.width>0&&geometry.box.x>=-1&&geometry.box.right<=geometry.viewport+1,'Native overflow stays on screen: '+JSON.stringify(geometry));
   assert.ok(Math.abs(geometry.box.top-geometry.arrow.bottom-8)<3,'Native overflow stays adjacent to its arrow');
   const last=popup.locator('a').last();await last.scrollIntoViewIfNeeded();
   assert.ok(await last.evaluate(n=>{const b=n.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return b.width>0&&b.height>0&&(hit===n||n.contains(hit))}),'Last native overflow choice remains reachable');
   await last.click();await arrow.click();
   assert.ok(await p.evaluate(()=>__inlineCalls.length===2&&__inlineOriginals.every(o=>o.node.isConnected&&o.node.parentNode===o.parent&&o.node.onclick===o.onclick&&o.node.getAttribute('href')===o.href)),'Native parent/destination/callback identity retained');
   await p.evaluate(()=>{
    const old=document.querySelector('.list_array_option'),copy=old.cloneNode(true);old.replaceWith(copy);
    window.__dcufListHostAdapter.refresh({listWrap:document.querySelector('[data-dcuf-controls-ready="1"]'),toolbar:copy});
   });
   await p.waitForSelector('[data-dcuf-role="category-list"]');
   assert.equal(await p.locator('[data-dcuf-category-invoker]').count(),0,'Refresh/clone does not recreate retired disclosure');
   assert.equal(await p.locator('[data-dcuf-role="category-list"]').isVisible(),true);
   assertNoRuntimeErrors(await getMetrics(p),e.consoleErrors);records.push({state,geometry});
  } finally {await e.close()}
 }
 return records;
}
