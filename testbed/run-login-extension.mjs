// Actual pinned Tampermonkey + installed Chrome, with public native-shaped replay.
// Installation follows run-live-site-canary.mjs's supported Utilities UI route.
// This is metadata/execution evidence, not a real-account/live-authentication test.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,mkdtemp,readdir,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import {sha256,verifyPackage} from '../tools/prepare-live-extension.mjs';
import {launchLiveBrowser} from './harness/live-site-browser.mjs';
import {resolveBuiltUserscript} from './harness/userscript-loader.mjs';
import {loginFixtureHtml} from './fixtures/login-native.mjs';
const require=createRequire(import.meta.url),{chromium}=require('./harness/playwright-loader.cjs');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
assert.ok(process.argv.includes('--require-runtime-under-test'));
const runtime=await resolveBuiltUserscript();assert.equal(path.basename(runtime),'runtime-under-test.user.js');
const output=path.resolve(root,'artifacts/b1-login-implementation-2026-10-28/extension');
await mkdir(output,{recursive:true});
const pin=JSON.parse(await readFile(path.join(root,'verification/live-site-canary.json'))).extension;
const vendor=verifyPackage(await readFile(path.join(root,`testbed/artifacts/live-site-extension/official-${pin.sha256}.crx`)),pin);
const bytes=await readFile(runtime),logo=await readFile(path.join(root,'testbed/fixtures/login-wordmark.svg')),security=await readFile(path.join(root,'testbed/fixtures/login-security-sprite.png'));
const report={schemaVersion:1,kind:'actual-tampermonkey-login-native-replay',status:'UNKNOWN',candidateSha256:sha256(bytes),extensionSha256:pin.sha256,extensionVersion:pin.version,driverSha256:sha256(await readFile(fileURLToPath(import.meta.url))),scope:'Actual installed Chrome/Tampermonkey metadata and isolated entry on synthetic native replay; no auth request, real account, or live-authentication claim.',cases:[]};
console.log('Actual extension login runtime:',runtime,report.candidateSha256);
async function until(check,label,timeout=20000){const deadline=Date.now()+timeout;while(Date.now()<deadline){const value=await check();if(value)return value;await new Promise(r=>setTimeout(r,100));}throw Error(`Timed out: ${label}`);}
async function files(directory){let count=0;for(const e of await readdir(directory,{withFileTypes:true})){assert.ok(e.isFile()||e.isDirectory());count+=e.isDirectory()?await files(path.join(directory,e.name)):1;}return count;}
async function install(context,worker,id){
 const page=await context.newPage();await page.goto(`chrome://extensions/?id=${id}`);
 const allowed=page.locator('#allow-user-scripts');await allowed.waitFor({state:'visible'});if(!await allowed.evaluate(n=>n.checked))await allowed.click();
 await until(()=>worker.evaluate(()=>Boolean(chrome.userScripts)),'Allow User Scripts');
 await page.goto(`chrome-extension://${id}/options.html`);await page.getByText('Utilities',{exact:true}).click();
 let served=0;
 const server=createServer((req,res)=>{if(req.url!=='/dcuf.user.js'||req.method!=='GET'){res.writeHead(404);res.end();return;}served++;res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});res.end(bytes);});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 try{
  await page.locator('#input_dXRpbHNfdXRpbHM_url').fill(`http://127.0.0.1:${server.address().port}/dcuf.user.js`);await page.locator('#input_dXRpbHNfdXRpbHNfaV91cmw_bu').click();
  const ask=await until(()=>context.pages().find(p=>p.url().startsWith(`chrome-extension://${id}/ask.html?`)),'installer');
  await ask.getByText('DC_UserFilter_Mobile',{exact:true}).waitFor();const version=bytes.toString('utf8').match(/^\/\/\s*@version\s+(\S+)/m)?.[1];assert.ok(version&&(await ask.locator('body').innerText()).includes(`v${version}`));
  await ask.locator('input[type="button"][value="Install"]').click();await until(()=>ask.isClosed(),'installer closure');
  await page.goto(`chrome-extension://${id}/options.html`);await page.getByText('Installed Userscripts',{exact:true}).click();await page.getByText('DC_UserFilter_Mobile',{exact:true}).waitFor();assert.equal(await page.getByText('DC_UserFilter_Mobile',{exact:true}).count(),1);assert.ok(served>0);
  const registrations=await until(async()=>{const entries=await worker.evaluate(async()=>(await chrome.userScripts.getScripts()).map(s=>({runAt:s.runAt,world:s.world||null})));return entries.some(s=>s.runAt==='document_start')&&entries;},'document-start registration');
  await page.close();return {method:'Utilities / Import from URL / Install',servedSha256:sha256(bytes),registrations,settings:'fresh defaults; no storage seeding or private RPC'};
 }finally{await new Promise(r=>server.close(r));}
}
assert.ok(os.freemem()>=4*2**30,'4GiB free RAM floor');
const extensionDirectory=await mkdtemp(path.join(root,'testbed/artifacts/live-site-extension/login-'));
let profile,session;
try{
 for(const [name,content] of vendor.entries){const target=path.resolve(extensionDirectory,name);assert.ok(target.startsWith(extensionDirectory+path.sep));await mkdir(path.dirname(target),{recursive:true});await writeFile(target,content);assert.deepEqual(await readFile(target),content);}
 assert.equal(await files(extensionDirectory),vendor.entries.size);
 profile=await mkdtemp(path.join(os.tmpdir(),'dcuf-login-'));
 session=await launchLiveBrowser({chromium,flavor:'installed-chrome',profile,extensionDirectory,headed:false});report.browser=session.metadata;
 const {context}=session,worker=await until(()=>context.serviceWorkers().find(w=>w.url().startsWith(`chrome-extension://${session.extensionId}/`)),'pinned worker');
 assert.equal(await worker.evaluate(()=>chrome.runtime.getManifest().version),pin.version);report.install=await install(context,worker,session.extensionId);
 const requests=[];
 await context.route('**/*',route=>{const q=route.request();requests.push({method:q.method(),url:q.url()});if(q.method()!=='GET')return route.abort();if(q.isNavigationRequest())return route.fulfill({contentType:'text/html; charset=utf-8',body:loginFixtureHtml()});if(q.url().endsWith('/logo-wordmark.svg'))return route.fulfill({contentType:'image/svg+xml',body:logo});if(q.url().endsWith('/sp_loginout.png'))return route.fulfill({contentType:'image/png',body:security});return route.abort();});
 const cases=[
  {url:'https://sign.dcinside.com/login',active:true},
  {url:'https://sign.dcinside.com/login/',active:true},
  {url:'https://sign.dcinside.com/login?s_url=https%3A%2F%2Fgall.dcinside.com%2Fboard%2Flists%2F',active:true},
  {url:'https://sign.dcinside.com/login#native-fragment',active:true},
  {url:'https://sign.dcinside.com/login/?s_url=synthetic#native-fragment',active:true,dark:true},
  {url:'https://sign.dcinside.com/login/member_check',active:false},
  {url:'https://sign.dcinside.com/myinfo/find_id',active:false},
  {url:'https://sign.dcinside.com/join/',active:false},
  {url:'https://sign.dcinside.com.evil.test/login',active:false},
  {url:'http://sign.dcinside.com/login',active:false,allowExactHttpsUpgrade:true}
 ];
 for(const [index,c] of cases.entries()){
  assert.ok(os.freemem()>=4*2**30,'4GiB free RAM floor');const page=await context.newPage();await page.setViewportSize({width:980,height:900});await page.emulateMedia({colorScheme:c.dark?'dark':'light'});
  try{
   await page.goto(c.url,{waitUntil:'domcontentloaded'});
   const upgraded=Boolean(c.allowExactHttpsUpgrade&&page.url()==='https://sign.dcinside.com/login');
   assert.equal(page.url(),upgraded?'https://sign.dcinside.com/login':c.url,'Unexpected navigation destination');
   const expectedActive=c.active||upgraded;
   if(expectedActive)await page.locator('[data-dcuf-login="ready"]').waitFor({timeout:12000});
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const o=await page.evaluate(()=>{const f=document.querySelector('.login_inputbox form'),old=window.__loginOriginal;return {resolvedUrl:location.href,styles:document.querySelectorAll('#dcuf-mobile-login-style').length,mounted:document.documentElement.hasAttribute('data-dcuf-login'),dark:document.documentElement.classList.contains('dc-filter-dark-mode'),palette:document.documentElement.getAttribute('data-dcuf-palette'),originalForm:f===old.form&&f.onsubmit===old.submit&&f.innerHTML===old.html,originalValues:document.getElementById('id').value==='synthetic-existing-id'&&document.getElementById('pw').value==='synthetic-existing-password',galleryStyles:document.querySelectorAll('#dcuf-theme-module-style,#dcuf-mobile-header-style,#dcuf-boot-overlay').length};});
   assert.equal(o.mounted,expectedActive);assert.equal(o.styles,expectedActive?1:0);assert.ok(o.originalForm&&o.originalValues);assert.equal(o.galleryStyles,0);if(expectedActive){assert.equal(o.dark,Boolean(c.dark));assert.equal(o.palette,'blue');await page.locator('#id').fill('');await page.locator('#pw').fill('');await page.screenshot({path:path.join(output,`case-${index}.png`),animations:'disabled'});}
   report.cases.push({...c,...o,expectedActive,requestedHttpApplicability:upgraded?'N/A_BROWSER_UPGRADED_TO_EXACT_HTTPS':undefined,status:'PASS'});console.log(`Extension ${index+1}/${cases.length}: PASS ${c.url}${upgraded?' -> exact HTTPS (direct HTTP case N/A)':''}`);
  }finally{await page.close();}
 }
 assert.ok(requests.every(r=>r.method==='GET'),'authentication/network write attempted');report.requestMethods=[...new Set(requests.map(r=>r.method))];report.status='PASS';
}catch(error){report.status='FAIL';report.failure=String(error.stack||error);throw error;}
finally{
 if(session){await session.close();report.ownedChromeClosed=true;}
 if(profile){assert.equal(path.dirname(profile),path.resolve(os.tmpdir()));assert.ok(path.basename(profile).startsWith('dcuf-login-'));await rm(profile,{recursive:true,force:true});}
 assert.equal(path.dirname(extensionDirectory),path.join(root,'testbed/artifacts/live-site-extension'));assert.ok(path.basename(extensionDirectory).startsWith('login-'));await rm(extensionDirectory,{recursive:true,force:true});
 await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
}
