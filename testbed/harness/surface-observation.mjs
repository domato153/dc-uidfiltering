// Read-only browser-side observation shared by original/current visual captures.
export function readSurfaceInPage({selector,styles=[],ancestorDepth=3,maxNodes=500}) {
 const root=document.querySelector(selector);
 if(!root)throw new Error(`Missing surface: ${selector}`);
 const sheets=[],unreadableStyleSheets=[];
 for(const native of document.styleSheets){
  const source=native.ownerNode?.id||native.href||'inline';
  try{sheets.push({source,rules:native.cssRules});}
  catch{
   const supplied=styles.find(s=>s.source===native.href||s.source===new URL(native.href,location.href).pathname);
   if(!supplied){unreadableStyleSheets.push(source);continue;}
   const parsed=new CSSStyleSheet();parsed.replaceSync(supplied.css);sheets.push({source,rules:parsed.cssRules});
  }
 }
 const inspect=n=>{
  const s=getComputedStyle(n),r=n.getBoundingClientRect(),rules=[];
  const visit=(list,source)=>{for(const rule of list){
   if(rule instanceof CSSMediaRule&&!matchMedia(rule.conditionText).matches)continue;
   if(rule instanceof CSSSupportsRule&&!CSS.supports(rule.conditionText))continue;
   if(rule.selectorText){try{if(n.matches(rule.selectorText))rules.push({source,selector:rule.selectorText,css:rule.style.cssText})}catch{}}
   else if(rule.cssRules)visit(rule.cssRules,source);
  }};
  sheets.forEach(sheet=>visit(sheet.rules,sheet.source));
  return {tag:n.tagName,id:n.id,class:n.getAttribute('class')||'',inline:n.getAttribute('style'),text:n.matches('input,textarea')?'':n.textContent.trim().slice(0,160),box:{x:r.x,y:r.y,width:r.width,height:r.height},computed:Object.fromEntries(['display','position','float','width','height','margin','padding','border','background','color','font','boxSizing','overflow','transform','zIndex','backdropFilter'].map(k=>[k,s[k]])),rules};
 };
 const all=[root,...root.querySelectorAll('*')].filter(n=>!n.matches('script,input[type="hidden"]'));
 const ancestors=[];let parent=root.parentElement;
 for(let i=0;parent&&i<Math.min(Math.max(ancestorDepth,0),5);i++,parent=parent.parentElement)ancestors.push(inspect(parent));
 const clone=root.cloneNode(true);clone.querySelectorAll('script').forEach(n=>n.remove());
 clone.querySelectorAll('input[type="hidden"],input[type="password"]').forEach(n=>n.setAttribute('value','[redacted]'));
 return {selector,html:clone.outerHTML,nodes:all.slice(0,maxNodes).map(inspect),ancestors,truncated:all.length>maxNodes,unreadableStyleSheets};
}

export async function captureSurface(page,{selector,styles=[],ancestorDepth=3,maxNodes=500,screenshotPath}) {
 const root=page.locator(selector).first();await root.waitFor({state:'visible',timeout:6000});
 const observation=await page.evaluate(readSurfaceInPage,{selector,styles,ancestorDepth,maxNodes});
 if(screenshotPath)await root.screenshot({path:screenshotPath});
 return observation;
}
