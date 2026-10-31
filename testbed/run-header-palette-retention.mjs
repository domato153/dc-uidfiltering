import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createTestPage,launchBrowser,storageKeys} from './harness/runner-utils.mjs';
import {startServer} from './server/server.mjs';
import {transformHeaderPalettePriorities} from '../tools/header-palette-priority-contract.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),args=process.argv.slice(2);
assert.ok(args.includes('--require-runtime-under-test'));
const runtime=path.join(root,'testbed/artifacts/runtime-under-test.user.js'),bytes=await readFile(runtime);
const sha=b=>createHash('sha256').update(b).digest('hex').toUpperCase();
assert.equal(sha(transformHeaderPalettePriorities(bytes.toString()).source),'FD58B82236AC08D0208FD7982E7083945B6A79F132B257C04C56C79BF1B2C1E2');
process.env.DCUF_TESTBED_USERSCRIPT=runtime;process.env.DCUF_TESTBED_TARGET='mobile';
const at=args.indexOf('--output');assert.ok(at>=0&&args[at+1]);const output=path.resolve(root,args[at+1]);
assert.ok(output.startsWith(path.join(root,'testbed/artifacts')+path.sep));await mkdir(path.dirname(output),{recursive:true});
console.log(`Retained palette runtime: ${runtime}; SHA-256 ${sha(bytes)}`);
const server=await startServer(),browser=await launchBrowser();
const session=await createTestPage(browser,server.baseUrl,{viewport:{width:980,height:2306},storage:{[storageKeys.threshold]:0,[storageKeys.ratioEnabled]:false,[storageKeys.personalEnabled]:true,[storageKeys.personalList]:{uids:[],nicknames:[],ips:[]}}});
try{
 await session.goto('/mgallery/board/lists?id=test');
 await session.page.evaluate(()=>{const s=document.createElement('style');s.id='css-darkmode';document.head.append(s);});
 await session.page.waitForFunction(()=>document.body.classList.contains('dc-filter-dark-mode')&&document.querySelector('[data-dcuf-header-recent-visit-role="list"]'));
 await session.page.waitForFunction(()=>{const m=window.__dcufTestbedMetrics.snapshot();return !m.activeTimeouts&&!m.activeAnimationFrames&&!m.activeIntervals;});
 const results=await session.page.evaluate(()=>{
  const check=(ok,m)=>{if(!ok)throw Error(m)};
  const palette=document.getElementById('dcuf-mobile-palette-style');
  const root=document.documentElement,rootInline=root.getAttribute('style'),gm=JSON.stringify(window.__dcufTestbedGM.snapshot());
  const rules=[...palette.sheet.cssRules];
  const find=(family,index)=>{
   const css=window['__dcuf'+family+'Presenter'].buildThemeCss(window['__dcuf'+family+'HostAdapter'].describeThemeSelectors('data-dcuf-palette'));
   const sheet=new CSSStyleSheet();sheet.replaceSync(css);const matches=rules.filter(r=>r.selectorText===sheet.cssRules[index].selectorText);
   check(matches.length===1,'exact retained palette rule');return matches[0];
  };
  const records=[];
  const reject=(id,family,index,property,selector,readProperty,prepare)=>{
   const rule=find(family,index),target=document.querySelector(selector);check(target,'positive native target '+id);
   const css=rule.style.cssText,inline=target.getAttribute('style'),parent=target.parentNode,next=target.nextSibling;
   let before,after;
   try{
    prepare?.(target);
    check(rule.style.getPropertyPriority(property)==='important','retained priority '+id);
    before=getComputedStyle(target).getPropertyValue(readProperty);
    rule.style.setProperty(property,rule.style.getPropertyValue(property),'');
    after=getComputedStyle(target).getPropertyValue(readProperty);
    check(before!==after,'retained priority has a causal native conflict '+id);
    rule.style.cssText=css;
    check(getComputedStyle(target).getPropertyValue(readProperty)===before,'exact positive restoration '+id);
   }finally{
    rule.style.cssText=css;
    if(inline===null)target.removeAttribute('style');else target.setAttribute('style',inline);
    if(rootInline===null)root.removeAttribute('style');else root.setAttribute('style',rootInline);
   }
   check(target.parentNode===parent&&target.nextSibling===next,'native target not moved');records.push({id,before,after,rejected:true});
  };
  reject('shell-background-colour','HeaderShell',1,'background-color','.btn_top_loginout','background-color',t=>t.style.setProperty('--dcuf-theme-accent-strong','rgb(17, 41, 73)','important'));
  reject('shell-background-image','HeaderShell',1,'background-image','.btn_top_loginout','background-image',t=>{t.style.backgroundImage='linear-gradient(rgb(17, 41, 73), rgb(17, 41, 73))';});
  reject('shell-on-accent-colour','HeaderShell',1,'color','.btn_top_loginout','color',t=>t.style.setProperty('--dcuf-theme-on-accent','rgb(17, 41, 73)','important'));
  reject('page-native-sprite','GalleryPageHead',4,'background-image','.pagehead_titicon.mgall','background-image');
  reject('gnb-native-sprite','HeaderGnb',1,'background','.gnb_bar .icon_next','background-image');
  reject('recent-dark-fallback','HeaderRecentVisit',0,'color','.newvisit_history>.tit','color',t=>t.style.setProperty('--dcuf-theme-accent','rgb(17, 41, 73)','important'));
  reject('issue-inline-border','HeaderDrawer',0,'border-top-color','.issue_wrap','border-top-color',t=>t.style.setProperty('--dcuf-theme-accent','rgb(17, 41, 73)','important'));
  check(JSON.stringify(window.__dcufTestbedGM.snapshot())===gm,'no settings write');
  return records;
 });
 assert.equal(results.length,7);assert.ok(results.every(x=>x.rejected));
 await writeFile(output,JSON.stringify({scope:'SEVEN_RETAINED_PALETTE_CONFLICTS_ONLY',status:'PASS',runtime:{path:runtime,sha256:sha(bytes)},browser:browser.version(),results},null,2)+'\n');
 console.log('Retained palette conflicts PASS:7 causal normal-inline/sprite/fallback cases; exact restoration.');
}finally{await session.close();await browser.close();await server.close();}
