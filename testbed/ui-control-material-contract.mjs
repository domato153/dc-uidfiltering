import {assert,createTestPage,storageKeys,getMetrics,assertNoRuntimeErrors} from './harness/runner-utils.mjs';
import {writeHeaderHtml} from './fixtures/b1-form-header.mjs';

async function stripeSpread(page,bytes){return page.evaluate(async data=>{const image=new Image();image.src=data;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const context=canvas.getContext('2d');context.drawImage(image,0,0);const samples=[];for(let y=450;y<700;y+=3)samples.push([...context.getImageData(34,y,1,1).data]);return Math.max(...[0,1,2].map(k=>Math.max(...samples.map(v=>v[k]))-Math.min(...samples.map(v=>v[k]))))},'data:image/png;base64,'+bytes.toString('base64'))}

export async function renderedLabelContrast(page,selector,{glyphMask=false}={}){
 const button=page.locator(selector).first();
 const label=await button.evaluate(n=>{const r=n.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(n);const t=range.getBoundingClientRect();return{foreground:getComputedStyle(n).color,x:t.x-r.x,y:t.y-r.y,width:t.width,height:t.height,buttonWidth:r.width,buttonHeight:r.height}});
 assert.ok(label.width>0&&label.height>0,'Contrast needs an actual positive label rectangle');
 // A circular control's generated/hidden label range can cover the complete
 // face and its transparent corners. Locate glyphs with two known ink colors,
 // independently of candidate ink/background contrast. The caller verifies
 // generated glyphs use the same foreground as the measured element.
 const styles=await button.evaluate((n,glyphMask)=>{const nodes=[n,...n.querySelectorAll('*')],saved=nodes.map(e=>e.getAttribute('style'));for(const e of nodes){if(!glyphMask)e.style.setProperty('color','transparent','important');e.style.setProperty('-webkit-text-fill-color','transparent','important');e.style.setProperty('text-shadow','none','important')}return saved},glyphMask);
 let bytes,foregroundBytes,blackMaskBytes,whiteMaskBytes;
 try{
  if(glyphMask){
   const fill=color=>button.evaluate((n,color)=>{for(const e of[n,...n.querySelectorAll('*')])e.style.setProperty('-webkit-text-fill-color',color,'important')},color);
   await fill('#000');blackMaskBytes=await button.screenshot({animations:'disabled'});
   await fill('#fff');whiteMaskBytes=await button.screenshot({animations:'disabled'});
   await fill('transparent');
  }
  bytes=await button.screenshot({animations:'disabled'});
  // Render the foreground in its actual opacity/ancestor group. Parsing
  // color(srgb ...) as 0..255 RGB or ignoring parent opacity produces false passes.
  await button.evaluate((n,label)=>{
   if(getComputedStyle(n).position==='static')n.style.position='relative';
   const patch=document.createElement('span');patch.dataset.dcufContrastWitness='1';
   patch.style.cssText='position:absolute;inset:0;z-index:2147483647;pointer-events:none;border:0;border-radius:0;opacity:1;background:'+label.foreground;
   n.append(patch);
  },label);
  foregroundBytes=await button.screenshot({animations:'disabled'});
 }finally{
  await button.evaluate((n,saved)=>{n.querySelector('[data-dcuf-contrast-witness]')?.remove();[n,...n.querySelectorAll('*')].forEach((e,i)=>saved[i]===null?e.removeAttribute('style'):e.setAttribute('style',saved[i]))},styles);
 }
 return page.evaluate(async({data,foregroundData,blackMaskData,whiteMaskData,label})=>{
  const pixels=async source=>{const image=new Image();image.src=source;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const x=c.getContext('2d');x.drawImage(image,0,0);return{width:c.width,height:c.height,data:x.getImageData(0,0,c.width,c.height).data}};
  const image=await pixels(data),foreground=await pixels(foregroundData),blackMask=blackMaskData?await pixels(blackMaskData):null,whiteMask=whiteMaskData?await pixels(whiteMaskData):null;
  const luminance=rgb=>rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
  let min=Infinity,samples=0;const sx=image.width/label.buttonWidth,sy=image.height/label.buttonHeight;
  for(let py=Math.max(2,Math.ceil(label.y*sy)+1);py<Math.min(image.height-2,Math.floor((label.y+label.height)*sy)-1);py++)for(let px=Math.max(2,Math.ceil(label.x*sx)+1);px<Math.min(image.width-2,Math.floor((label.x+label.width)*sx)-1);px++){
   const offset=(py*image.width+px)*4,rgb=[...image.data.slice(offset,offset+4)],fg=[...foreground.data.slice(offset,offset+4)];
   if(blackMask&&Math.max(...[0,1,2].map(k=>Math.abs(blackMask.data[offset+k]-whiteMask.data[offset+k])))<12)continue;
   if(rgb[3]!==255||fg[3]!==255)throw Error('Contrast screenshot must include the real backing');
   const b=luminance(rgb.slice(0,3)),f=luminance(fg.slice(0,3));min=Math.min(min,(Math.max(f,b)+.05)/(Math.min(f,b)+.05));samples++;
  }
  if(!samples)throw Error('Contrast requires interior label samples');return{min,samples};
 },{data:'data:image/png;base64,'+bytes.toString('base64'),foregroundData:'data:image/png;base64,'+foregroundBytes.toString('base64'),blackMaskData:blackMaskBytes?'data:image/png;base64,'+blackMaskBytes.toString('base64'):null,whiteMaskData:whiteMaskBytes?'data:image/png;base64,'+whiteMaskBytes.toString('base64'):null,label});
}

export async function runControlMaterialContract({browser,server}) {
 const records=[];
 for(const {dark,palette} of[{dark:false,palette:'teal'},{dark:true,palette:'teal'},{dark:false,palette:'lime'}]){
  const e=await createTestPage(browser,server.baseUrl,{viewport:{width:980,height:900},storage:{[storageKeys.threshold]:0,[storageKeys.palette]:palette}});
  try{
   await e.page.route(u=>u.origin===server.baseUrl&&u.pathname==='/mgallery/board/write/',r=>r.fulfill({contentType:'text/html',body:writeHeaderHtml({variant:'minor',formMode:'write'})}));
   await e.goto('/mgallery/board/write/?id=test');await e.page.waitForFunction(()=>document.body.getAttribute('data-dcuf-native-form-state')==='write-editor');
   if(dark)await e.page.evaluate(()=>{const s=document.createElement('style');s.id='css-darkmode';s.textContent='html{color-scheme:dark}';document.head.append(s);document.body.classList.add('dc-filter-dark-mode');document.documentElement.classList.add('darkmode')});
   await e.page.locator('#subject').fill('재질 변경 중 입력 보존');await e.page.locator('.note-editable').fill('본문과 커서 보존');
   const result=await e.page.evaluate(()=>{
    const f=document.querySelector('form#write'),p=f.querySelector('[data-dcuf-native-form-role="outer-action-primary"]'),s=f.querySelector('[data-dcuf-native-form-role="outer-action-secondary"]'),r=n=>{const b=n.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom}},cs=n=>getComputedStyle(n),resolve=(n,v)=>{const x=document.createElement('span');x.style.color=v;n.append(x);const c=cs(x).color;x.remove();return c};
    const layer=document.createElement('button');layer.type='button';layer.textContent='native fixed layer probe';layer.style.cssText='position:fixed;left:19px;top:17px;width:110px;height:40px;z-index:2147483001';f.querySelector('.note-editor').append(layer);const before=r(layer),hit=layer.contains(document.elementFromPoint(30,30));layer.remove();
    return{primaryToken:cs(p).getPropertyValue('--dcuf-control-primary-fill').trim(),secondaryToken:cs(s).getPropertyValue('--dcuf-control-secondary-fill').trim(),primary:{...r(p),fill:cs(p).backgroundColor,image:cs(p).backgroundImage,shadow:cs(p).boxShadow},secondary:{...r(s),fill:cs(s).backgroundColor,image:cs(s).backgroundImage,shadow:cs(s).boxShadow},expectedPrimary:resolve(p,'var(--dcuf-v7-primary-fill)'),expectedSecondary:resolve(s,'var(--dcuf-control-secondary-fill)'),form:r(f),formFilter:cs(f).backdropFilter,decorationFilter:getComputedStyle(f,'::before').backdropFilter,paper:cs(f.querySelector('.note-editable')).backgroundColor,layer:{...before,hit}};
   });
   assert.ok(result.primaryToken&&result.secondaryToken,'Common button material roles must reach actual native actions');
   if(result.primary.fill!==result.expectedPrimary||result.secondary.fill!==result.expectedSecondary)console.log('Material cascade',JSON.stringify(await e.page.locator('[data-dcuf-native-form-role="'+(result.primary.fill!==result.expectedPrimary?'outer-action-primary':'outer-action-secondary')+'"]').evaluate(n=>({inline:n.getAttribute('style'),matches:[...document.styleSheets].flatMap(s=>{try{return [...s.cssRules].filter(r=>r.selectorText&&n.matches(r.selectorText)&&/background/.test(r.style.cssText)).map(r=>({sheet:s.ownerNode?.id,selector:r.selectorText,background:r.style.background,color:r.style.backgroundColor,image:r.style.backgroundImage,priority:r.style.getPropertyPriority('background')}))}catch{return[]}})}))));
   assert.equal(result.primary.fill,result.expectedPrimary);assert.equal(result.secondary.fill,result.expectedSecondary);
   const footer=await e.page.locator('[data-dcuf-native-form-role="outer-actions"]').evaluate(n=>({fill:getComputedStyle(n).backgroundColor,image:getComputedStyle(n).backgroundImage,shadow:getComputedStyle(n).boxShadow}));
   assert.deepEqual(footer,{fill:'rgba(0, 0, 0, 0)',image:'none',shadow:'none'},'Footer inherits the glass exterior; only its two actions receive button material');
   const trim=await e.page.evaluate(()=>{const bar=document.querySelector('[data-dcuf-native-form-role="editor-statusbar"]'),ai=document.querySelector('[data-dcuf-native-form-role="ai-prompt-shell"]'),p=document.createElement('span');p.style.color='var(--dcuf-write-surface-muted)';bar.append(p);const expected=getComputedStyle(p).color;p.remove();return{status:getComputedStyle(bar).backgroundColor,expected,aiBorder:getComputedStyle(ai).borderTopWidth}});
   assert.equal(trim.status,trim.expected,'Statusbar follows the theme instead of retaining a white strip in dark mode');assert.equal(trim.aiBorder,'0px','AI prompt wrapper must not duplicate its rounded input/button frames');
   for(const b of[result.primary,result.secondary]){assert.ok(b.width>=88&&b.width<=160,'Writer footer is compact with a positive target');assert.ok(b.height>=40);assert.ok(b.image.includes('gradient')&&b.shadow!=='none','Material has rendered glaze and depth')}
   assert.ok(Math.abs(result.primary.right-(result.form.right-20))<=3);assert.ok(Math.abs(result.primary.y-result.secondary.y)<=1);
   assert.equal(result.formFilter,'none','Native popup ancestor must not become a backdrop-filter containing block');assert.ok(result.decorationFilter.includes('blur'),'Glass blur belongs to the decorative backing');
   assert.equal(result.layer.x,19);assert.equal(result.layer.y,17);assert.equal(result.layer.hit,true,'Native fixed descendant remains at viewport coordinates and hittable');
   const ordinary=e.page.locator('[data-dcuf-native-form-toolbar-control~="ordinary"]:not([data-dcuf-native-form-toolbar-control~="danger"])').first();
   const inactive=await ordinary.evaluate(n=>({classes:n.getAttribute('class'),border:getComputedStyle(n).borderColor,shadow:getComputedStyle(n).boxShadow,fill:getComputedStyle(n).backgroundColor}));
   await ordinary.evaluate(n=>n.classList.add('active'));await e.page.waitForFunction(()=>document.querySelector('[data-dcuf-native-form-toolbar-control~="ordinary"]:not([data-dcuf-native-form-toolbar-control~="danger"])')?.getAttribute('data-dcuf-native-form-control-state')?.includes('active'));
   const active=await ordinary.evaluate(n=>{n.getAnimations().forEach(a=>a.finish());return{border:getComputedStyle(n).borderColor,shadow:getComputedStyle(n).boxShadow,fill:getComputedStyle(n).backgroundColor}});
   if(active.border===inactive.border&&active.shadow===inactive.shadow&&active.fill===inactive.fill)console.log('Active cascade',JSON.stringify(await ordinary.evaluate(n=>({tag:n.tagName,classes:n.className,state:n.getAttribute('data-dcuf-native-form-control-state'),role:n.getAttribute('data-dcuf-native-form-role'),matches:[...document.styleSheets].flatMap(s=>{try{return [...s.cssRules].filter(r=>r.selectorText&&n.matches(r.selectorText)&&/background|box-shadow|border-color/.test(r.style.cssText)).map(r=>({sheet:s.ownerNode?.id,selector:r.selectorText,css:r.style.cssText.slice(0,380)}))}catch{return[]}})}))));
   assert.notDeepEqual(active,{border:inactive.border,shadow:inactive.shadow,fill:inactive.fill},'Projected active toolbar state must have a visible distinction '+JSON.stringify({active,inactive}));
   await ordinary.evaluate((n,c)=>c===null?n.removeAttribute('class'):n.setAttribute('class',c),inactive.classes);
   const danger=e.page.locator('[data-dcuf-native-form-toolbar-control~="danger"]').first();
   const dangerPaint=await danger.evaluate(n=>{const p=document.createElement('span');p.style.background='var(--dcuf-control-danger-bg)';n.append(p);const expected=getComputedStyle(p).backgroundColor;p.remove();return{fill:getComputedStyle(n).backgroundColor,expected}});
   assert.equal(dangerPaint.fill,dangerPaint.expected,'Danger role must win over its ordinary material');
   result.primaryContrast=await renderedLabelContrast(e.page,'[data-dcuf-native-form-role="outer-action-primary"]');
   result.dangerContrast=await renderedLabelContrast(e.page,'[data-dcuf-native-form-toolbar-control~="danger"]');
   assert.ok(result.primaryContrast.samples>0&&result.primaryContrast.min>=4.5,JSON.stringify({palette,dark,primaryContrast:result.primaryContrast}));
   assert.ok(result.dangerContrast.samples>0&&result.dangerContrast.min>=4.5,JSON.stringify({palette,dark,dangerContrast:result.dangerContrast}));
   const paperAlpha=await e.page.evaluate(color=>{const c=document.createElement('canvas');c.width=c.height=1;const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,1,1);return x.getImageData(0,0,1,1).data[3]},result.paper);assert.equal(paperAlpha,255,'Editing paper stays opaque');
   const backing=await e.page.addStyleTag({content:'[data-dcuf-header-layout]{background:repeating-linear-gradient(0deg,#d3a5ab 0 18px,#80beb9 18px 36px)!important}'});
   const blurSpread=await stripeSpread(e.page,await e.page.screenshot());
   const inverse=await e.page.addStyleTag({content:'[data-dcuf-header-layout] [data-dcuf-native-form-role="form"]::before{backdrop-filter:none!important}'});
   const unblurredSpread=await stripeSpread(e.page,await e.page.screenshot());await inverse.evaluate(n=>n.remove());await backing.evaluate(n=>n.remove());
   assert.ok(unblurredSpread>=6,'Backing must actually transmit through the form exterior; opaque paint cannot pass');assert.ok(blurSpread<unblurredSpread*.7,'Decorative blur must visibly soften the transmitted pattern');result.renderedProbe={blurSpread,unblurredSpread,paperAlpha};
   assert.equal(await e.page.locator('#subject').inputValue(),'재질 변경 중 입력 보존');assert.equal(await e.page.locator('.note-editable').innerText(),'본문과 커서 보존');assertNoRuntimeErrors(await getMetrics(e.page),e.consoleErrors);records.push({dark,palette,...result});
  }finally{await e.close()}
 }
 console.log('Material checks',JSON.stringify(records.map(({dark,palette,primaryContrast,dangerContrast,renderedProbe})=>({dark,palette,primaryContrast,dangerContrast,renderedProbe}))));
 return{contexts:records.length,records};
}
