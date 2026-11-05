import {assert,createTestPage,storageKeys,getMetrics,assertNoRuntimeErrors} from './harness/runner-utils.mjs';

// Native public view markup/script observed2026-10-26: body DIV#gaejukimg,
// off→moveimg, and blockClick() appends a transparent full-window click-blocker.
// No native ad script/network execution is needed to exercise that DOM contract.
const sprite='<div id="gaejukimg" class="moveimg" style="position:fixed;left:40px;top:400px;width:90px;height:90px;z-index:99997"><img alt="개죽이 방해 요소" data-src="moveimg.png"></div>';
const blocker='<div class="click-blocker" style="position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0)"></div>';

export async function runGaejukContract({browser,server}) {
 const records=[];
 for(const scenario of[
  {path:'/board/lists?id=test',dark:false},
  {path:'/board/view?id=test&no=1001',dark:false},
  {path:'/mgallery/board/lists?id=test',dark:true},
  {path:'/mini/board/view?id=test&no=1001',dark:true,masterDisabled:true}
 ]){
  const session=await createTestPage(browser,server.baseUrl,{viewport:{width:980,height:900},storage:{[storageKeys.threshold]:0,[storageKeys.masterDisabled]:Boolean(scenario.masterDisabled)}});
  try{
   await session.page.route(u=>u.origin===server.baseUrl&&/\/board\/(lists|view)$/.test(u.pathname),async route=>{const response=await route.fetch();const html=await response.text();assert.ok(html.includes('</body>'));await route.fulfill({response,body:html.replace('</body>','<style>.moveimg{display:block}.moveimg_off{display:none}</style>'+sprite+blocker+'</body>')})});
   await session.goto(scenario.path);
   if(scenario.dark)await session.page.evaluate(()=>window.__dcufFixture.toggleDark(true));
   await session.page.evaluate(()=>{
    const host=document.querySelector('.write_div,.gallview_contents,#container')||document.body;
    const content=document.createElement('section');content.id='dcuf-gaejuk-content-control';
    for(const [id,name]of[['dcuf-gaejuk-photo','개죽이 본문 사진'],['dcuf-gaejuk-dccon','개죽이 디시콘']]){const img=document.createElement('img');img.id=id;img.alt=name;img.className=id.endsWith('dccon')?'written_dccon':'authored-photo';img.src='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="20" height="20"%3E%3Crect width="20" height="20" fill="teal"/%3E%3C/svg%3E';img.style.cssText='width:20px;height:20px';content.append(img)}
    const unrelated=document.createElement('div');unrelated.id='dcuf-gaejuk-unrelated';unrelated.className='click-blocker';unrelated.textContent='Nested non-nuisance control';content.append(unrelated);host.append(content);
    const target=document.createElement('button');target.id='dcuf-gaejuk-native-target';target.textContent='원래 버튼';target.style.cssText='position:fixed;left:40px;top:400px;width:130px;height:42px;z-index:100';target.addEventListener('click',()=>window.__gaejukNativeClicks=(window.__gaejukNativeClicks||0)+1);document.body.append(target);
   });
   await session.page.evaluate(()=>Promise.all([...document.querySelectorAll('#dcuf-gaejuk-content-control img')].map(img=>img.decode())));
   const observe=()=>session.page.evaluate(()=>{const mascot=document.querySelector('body > #gaejukimg'),blocker=document.querySelector('body > .click-blocker'),target=document.querySelector('#dcuf-gaejuk-native-target');const r=target.getBoundingClientRect();return{mascotPresent:Boolean(mascot),mascotDisplay:mascot&&getComputedStyle(mascot).display,blockerDisplay:blocker&&getComputedStyle(blocker).display,targetWidth:r.width,targetHeight:r.height,hit:target===document.elementFromPoint(r.x+r.width/2,r.y+r.height/2),nestedDisplay:getComputedStyle(document.querySelector('#dcuf-gaejuk-unrelated')).display,content:[...document.querySelectorAll('#dcuf-gaejuk-content-control img')].map(n=>({display:getComputedStyle(n).display,width:n.getBoundingClientRect().width,complete:n.complete,naturalWidth:n.naturalWidth}))}});
   const stages=[];
   for(const stage of['initial','toggled','reinserted']){
    if(stage==='toggled')await session.page.evaluate(()=>{const n=document.querySelector('body > #gaejukimg');n.className='moveimg_off';n.className='moveimg';n.style.display='block'});
    if(stage==='reinserted')await session.page.evaluate(({sprite,blocker})=>{document.querySelector('body > #gaejukimg').remove();document.querySelector('body > .click-blocker').remove();document.body.insertAdjacentHTML('beforeend',sprite+blocker)},{sprite,blocker});
    const result=await observe();
    assert.equal(result.mascotPresent,true,'Keep native mascot nodes available to their existing listeners');
    assert.equal(result.mascotDisplay,'none',stage+' nuisance mascot must be hidden');
    assert.equal(result.blockerDisplay,'none',stage+' transparent nuisance layer must not intercept controls');
    assert.ok(result.targetWidth>=40&&result.targetHeight>=40&&result.hit,stage+' original control must remain positively hittable');
    assert.notEqual(result.nestedDisplay,'none','Do not blanket-hide authored/nested content by class');
    assert.ok(result.content.length===2&&result.content.every(n=>n.display!=='none'&&n.width>0&&n.complete&&n.naturalWidth>0),'Authored dog photos and DCCon remain visible and decoded');
    await session.page.locator('#dcuf-gaejuk-native-target').click();stages.push({stage,...result});
   }
   assert.equal(await session.page.evaluate(()=>window.__gaejukNativeClicks),3);
   assertNoRuntimeErrors(await getMetrics(session.page),session.consoleErrors);records.push({...scenario,stages});
  }finally{await session.close()}
 }
 return {contexts:records.length,records};
}
