import {mkdir,writeFile} from 'node:fs/promises';
import {assert,createTestPage,storageKeys,getMetrics,assertNoRuntimeErrors} from './harness/runner-utils.mjs';
import {b1PasswordHtml} from './fixtures/b1-password.mjs';

export async function runB1PasswordContract({browser,server}) {
 const records=[];
 for(const kind of ['modify','delete'])for(const[width,height,dark]of[[980,900,false],[980,900,true],[980,2306,false],[390,520,true]]){
  const e=await createTestPage(browser,server.baseUrl,{viewport:{width,height},storage:{[storageKeys.threshold]:0,[storageKeys.palette]:'teal'}});
  try{
   const route=kind==='delete'?'/mini/board/delete/':'/board/modify/';
   await e.page.route(url=>url.origin===server.baseUrl&&url.pathname===route,r=>r.fulfill({contentType:'text/html',body:b1PasswordHtml(kind)}));
   await e.goto(route+'?id=test&no=1001');
   if(dark){await e.page.evaluate(()=>{const s=document.createElement('style');s.id='css-darkmode';s.textContent='html{color-scheme:dark}';document.head.append(s);document.body.classList.add('dc-filter-dark-mode');document.documentElement.classList.add('darkmode')});await e.page.waitForFunction(()=>getComputedStyle(document.body).getPropertyValue('--dcuf-b1-paper').trim()==='#20292c');}
   const card=e.page.locator('[data-dcuf-native-form-role="popup-shell"][data-dcuf-native-form-state="password"]');
   await card.waitFor({state:'visible'});
   const c=await card.evaluate(n=>{const s=getComputedStyle(n),p=n.querySelector('.inner'),i=n.querySelector('#password'),a=n.querySelector('.btn_box'),buttons=[...a.querySelectorAll('button')],r=n.getBoundingClientRect();const probe=document.createElement('span');probe.style.background='var(--dcuf-b1-floating)';n.append(probe);const material=getComputedStyle(probe).backgroundColor;probe.remove();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,radius:s.borderRadius,background:s.backgroundColor,material,blur:s.backdropFilter,panel:getComputedStyle(p).backgroundColor,input:getComputedStyle(i).backgroundColor,inputHeight:i.getBoundingClientRect().height,buttonBoxes:buttons.map(b=>{const r=b.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===b}}),primaryColor:getComputedStyle(buttons[1]).color,primaryWeight:getComputedStyle(buttons[1]).fontWeight,primaryBackground:getComputedStyle(buttons[1]).backgroundImage,overflow:document.documentElement.scrollWidth-innerWidth}});
   assert.equal(c.background,c.material,'Password card consumes the selected B1 translucent material');
   assert.ok(c.blur.includes('blur(8px)'),'Shared ordinary-page floating blur belongs to the original card');
   assert.equal(c.radius,'16px');assert.equal(c.panel,'rgba(0, 0, 0, 0)');
   assert.ok(c.width>250&&c.width<=520&&c.height>150&&c.left>=0&&c.right<=width&&c.top>=0&&c.bottom<=height,'Original card is positively contained');
   assert.ok(c.inputHeight>=44&&c.overflow<=1);
   assert.ok(c.buttonBoxes.every(b=>b.width>=80&&b.height>=44&&b.hit));
   assert.ok(Math.abs(c.buttonBoxes[0].y-c.buttonBoxes[1].y)<1&&c.buttonBoxes[1].x>=c.buttonBoxes[0].x+c.buttonBoxes[0].width+8);
   assert.equal(c.primaryColor,'rgb(255, 255, 255)');assert.equal(c.primaryWeight,'650');
   const form=await e.page.locator('form').evaluate(n=>({action:new URL(n.action).pathname,method:n.method,hidden:[...n.querySelectorAll('input[type="hidden"]')].map(i=>[i.name,i.value]),passwords:n.querySelectorAll('input[type="password"]').length}));
   assert.equal(form.action,`/__testbed/${kind}_password_submit`);assert.equal(form.method,'post');assert.equal(form.passwords,1);
   e.page.on('dialog',d=>d.dismiss());await e.page.locator('.btn_ok').click();
   await e.page.locator('#password').fill('synthetic-only');await e.page.locator('#password').focus();
   assert.equal(await e.page.locator('#password').evaluate(n=>getComputedStyle(n).outlineStyle!=='none'||getComputedStyle(n).boxShadow!=='none'),true,'Keyboard focus remains visible');
   await e.page.locator('.btn_ok').focus();await e.page.locator('.btn_ok').press('Enter');await e.page.locator('.btn_grey').click();
   const semantics=await e.page.evaluate(()=>({calls:__passwordFixture.calls,preserved:__passwordFixture.originals.every(({node,parent,handler})=>node.isConnected&&node.parentNode===parent&&node.onclick===handler),value:document.querySelector('#password').value,autocomplete:document.querySelector('#password').autocomplete}));
   assert.deepEqual(semantics.calls,['empty','confirm','submit','cancel']);assert.equal(semantics.preserved,true);assert.equal(semantics.value,'synthetic-only');assert.equal(semantics.autocomplete,'current-password');
   if(process.env.DCUF_PASSWORD_CAPTURE){await mkdir(process.env.DCUF_PASSWORD_CAPTURE,{recursive:true});await e.page.locator('#password').fill('');await e.page.locator('#password').blur();await e.page.screenshot({path:`${process.env.DCUF_PASSWORD_CAPTURE}/${kind}-${width}-${height}-${dark?'dark':'light'}.png`});await card.screenshot({path:`${process.env.DCUF_PASSWORD_CAPTURE}/${kind}-${width}-${height}-${dark?'dark':'light'}-detail.png`});}
   records.push({kind,width,height,dark,composition:c,form,semantics});assertNoRuntimeErrors(await getMetrics(e.page),e.consoleErrors);
  }finally{await e.close()}
 }
 if(process.env.DCUF_PASSWORD_CAPTURE)await writeFile(`${process.env.DCUF_PASSWORD_CAPTURE}/contexts.json`,JSON.stringify(records,null,2));
}
