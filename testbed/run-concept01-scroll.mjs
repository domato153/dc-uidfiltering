import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { assert, createTestPage, launchBrowser, storageKeys, getMetrics, assertNoRuntimeErrors } from './harness/runner-utils.mjs';
import { resolveBuiltUserscript } from './harness/userscript-loader.mjs';
import { startServer } from './server/server.mjs';

if (process.argv.includes('--require-runtime-under-test')) process.env.DCUF_TESTBED_USERSCRIPT ||= 'testbed/artifacts/runtime-under-test.user.js';
const runtime = await resolveBuiltUserscript();
if (process.argv.includes('--require-runtime-under-test')) assert.equal(runtime,path.resolve('testbed/artifacts/runtime-under-test.user.js'));
const sha256 = createHash('sha256').update(await readFile(runtime)).digest('hex');
console.log(`Source runtime: ${runtime}; SHA-256 ${sha256}`);
const output = path.resolve('testbed/artifacts/concept01-scroll-2026-10-22');
await mkdir(output, { recursive: true });
const server = await startServer(), browser = await launchBrowser();
const report = { runtime, sha256, observations: [] };
try {
  for (const [width, dark, height=720] of [[980,false],[980,true],[390,false],[1280,false],[980,false,2306]]) {
    const env = await createTestPage(browser, server.baseUrl, { viewport:{width,height}, storage:{[storageKeys.threshold]:0,dcuf_mobile_ui_palette:'teal'} });
    try {
      await env.goto('/board/lists/?id=test');
      if (dark) await env.page.evaluate(()=>{document.documentElement.classList.add('dc-filter-dark-mode');document.body.classList.add('dc-filter-dark-mode');});
      await env.page.waitForSelector('[data-dcuf-surface="list-toolbar"]');
      await env.page.evaluate(()=>{
        const toolbar=document.querySelector('[data-dcuf-surface="list-toolbar"]');
        document.getElementById('dcuf-testbed-controls')?.remove();
        window.__trialToolbar=toolbar; window.__trialParent=toolbar.parentNode;
        window.__trialOriginalGeometry=['--dcuf-scroll-left','--dcuf-scroll-width'].map(name=>[name,toolbar.style.getPropertyValue(name),toolbar.style.getPropertyPriority(name)]);
        document.querySelector('#listSizeLayer').style.display='none';
        const spacer=document.createElement('div');spacer.style.height='4200px';toolbar.parentNode.append(spacer);
        window.__trialInitialNext=toolbar.nextElementSibling;
        window.__trialTrace=[];window.addEventListener('scroll',()=>window.__trialTrace.push({y:scrollY,mode:toolbar.getAttribute('data-dcuf-scroll')}));
        window.dispatchEvent(new Event('resize'));
      });
      const settle=()=>env.page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
      const scroll=async y=>{await env.page.evaluate(y=>window.scrollTo(0,y),y);await settle();};
      const mode=()=>env.page.locator('[data-dcuf-surface="list-toolbar"]').getAttribute('data-dcuf-scroll');
      await settle();
      await scroll(900);
      if(await mode()!=='hidden') console.log(await env.page.evaluate(()=>({y:scrollY,rect:window.__trialToolbar.getBoundingClientRect().toJSON(),active:document.activeElement?.tagName})));
      assert.equal(await mode(),'hidden','Downward travel hides original toolbar');
      assert.equal(await env.page.evaluate(()=>scrollY),900,'Floating transition does not change reading position');
      for(const y of [901,900,901,900]) await scroll(y);
      if(await mode()!=='hidden') console.log('trace',await env.page.evaluate(()=>window.__trialTrace));
      assert.equal(await mode(),'hidden','Pixel jitter does not reveal');
      for(let y=899;y>=860;y--) await scroll(y);
      assert.equal(await mode(),'shown','Slow cumulative upward travel reveals');
      await env.page.locator('[data-dcuf-surface="list-toolbar"]').evaluate(el=>el.getAnimations().forEach(a=>a.finish()));
      const geometry=await env.page.locator('[data-dcuf-surface="list-toolbar"]').evaluate(el=>{
        const r=el.getBoundingClientRect(); return {top:r.top,width:r.width,height:r.height,position:getComputedStyle(el).position,hit:el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),over:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML.slice(0,150)};
      });
      if(geometry.top< -1) console.log(await env.page.evaluate(()=>{let e=window.__trialToolbar;const a=[];while(e){const c=getComputedStyle(e);a.push({tag:e.tagName,cls:e.className,position:c.position,overflow:c.overflow,rect:e.getBoundingClientRect().toJSON()});e=e.parentElement;}return a;}));
      assert.ok(geometry.top>=-1&&geometry.top<=2&&geometry.width<=width&&geometry.hit,JSON.stringify(geometry));
      await env.page.screenshot({path:path.join(output,`${width}-${height}-${dark?'dark':'light'}-revealed.png`)});
      // Controlled native click-created popup branch; preserve the original tab.
      await env.page.evaluate(()=>{
        const toolbar=window.__trialToolbar,popup=document.createElement('div');
        popup.className='subject_morelist';popup.setAttribute('data-dcuf-role','category-popup');popup.style.display='none';
        popup.innerHTML='<button type="button">팝업 동작</button>';toolbar.append(popup);
        window.__trialPopupCalls=0;popup.querySelector('button').onclick=()=>window.__trialPopupCalls++;
        const trigger=document.createElement('button');trigger.type='button';trigger.textContent='말머리';trigger.setAttribute('data-trial-popup-trigger','1');trigger.setAttribute('data-dcuf-role','category-toggle');
        trigger.onclick=()=>popup.style.display=popup.style.display==='none'?'block':'none';toolbar.append(trigger);
        window.dispatchEvent(new Event('resize'));
      });
      await settle();await env.page.locator('[data-trial-popup-trigger]').click();
      await settle();await scroll(1200);assert.equal(await mode(),'shown','Original click-created popup holds navigation');
      await env.page.getByRole('button',{name:'팝업 동작',exact:true}).click();
      assert.equal(await env.page.evaluate(()=>window.__trialPopupCalls),1,'Popup keeps its original pointer handler');
      await env.page.locator('[data-trial-popup-trigger]').click();await settle();
      await scroll(1300);assert.equal(await mode(),'shown','Focused native button remains visible after pointer release');
      const select=env.page.locator('[data-dcuf-surface="list-toolbar"] select').first();
      await select.focus();await scroll(1200);assert.equal(await mode(),'shown','Focused native select pins toolbar');
      await env.page.evaluate(()=>document.activeElement.blur());await settle();
      await scroll(1400);assert.equal(await mode(),'hidden');
      await env.page.keyboard.press('Tab');await settle();assert.equal(await mode(),'shown','Keyboard navigation reveals before focus advances');
      await env.page.emulateMedia({reducedMotion:'reduce'});
      const reduced=await env.page.locator('[data-dcuf-surface="list-toolbar"]').evaluate(el=>getComputedStyle(el).transitionDuration);
      assert.ok(reduced.split(',').every(v=>parseFloat(v)===0),'Reduced motion settles immediately');
      await env.page.setViewportSize({width,height:600});await settle();
      await scroll(0);assert.equal(await mode(),'top');
      const identity=await env.page.evaluate(()=>window.__trialToolbar===document.querySelector('[data-dcuf-surface="list-toolbar"]')&&window.__trialToolbar.parentNode===window.__trialParent&&window.__trialToolbar.nextElementSibling===window.__trialInitialNext);
      assert.equal(identity,true,'Original toolbar topology survives scroll and resize');
      await env.page.screenshot({path:path.join(output,`${width}-${dark?'dark':'light'}.png`)});
      const resource=await env.page.evaluate(()=>{
        const adapter=window.__dcufListHostAdapter, root=document.querySelector('[data-dcuf-surface="list-host"]');
        adapter.dispose(root);const disposed=adapter.snapshotResources();return {disposed,attribute:window.__trialToolbar.getAttribute('data-dcuf-scroll'),styleRestored:window.__trialOriginalGeometry.every(([name,value,priority])=>window.__trialToolbar.style.getPropertyValue(name)===value&&window.__trialToolbar.style.getPropertyPriority(name)===priority)};
      });
      assert.equal(resource.attribute,null);assert.equal(resource.disposed.scrollToolbars,0);assert.equal(resource.disposed.scrollFrameActive,false);
      assert.equal(resource.styleRestored,true,'Disposal restores original inline geometry');
      assertNoRuntimeErrors(await getMetrics(env.page));
      assert.deepEqual(env.consoleErrors,[]);
      report.observations.push({width,height,dark,geometry,reduced,identity,resource});
    } finally { await env.close(); }
  }
  report.status='PASS';
} finally {
  await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
  await browser.close();await server.close();
}
console.log(`Concept01 scroll: ${report.status}; ${report.observations.length} contexts`);
