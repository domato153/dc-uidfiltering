import {assert} from './runner-utils.mjs';
import {readSurfaceInPage} from './surface-observation.mjs';
export async function runSurfaceObservationContract({browser}) {
 const page=await browser.newPage({viewport:{width:980,height:900}});
 try{
  const css='.frame{overflow:hidden;transform:translateX(2px)}.pop_wrap.type2{border:1px solid #29367c;background:white}.description{color:#333}@media(max-width:400px){.pop_wrap.type2{border:2px solid red}}';
  await page.setContent(`<style>${css}</style><section class="frame"><div id="sample" class="pop_wrap type2"><button><span class="description">원본 닫기</span></button><input type="hidden" value="synthetic-private"><input type="password" value="synthetic-password"><script type="text/plain">synthetic script</script></div></section>`);
  const opaque='a'.repeat(40);
  await page.evaluate(opaque=>{const n=document.querySelector('input[type=hidden]');n.id=opaque;n.name=opaque;n.setAttribute(opaque,'synthetic-private-attribute')},opaque);
  await page.evaluate(()=>{window.originalAction=()=>{};document.querySelector('button').onclick=window.originalAction;window.originalMarkup=document.querySelector('#sample').outerHTML});
  const result=await page.evaluate(readSurfaceInPage,{selector:'#sample',styles:[{source:'synthetic-native.css',css}],ancestorDepth:1});
  assert.equal(result.nodes[0].id,'sample','The root itself is part of the CSS inventory');
  assert.ok(result.nodes[0].rules.some(r=>r.selector==='.pop_wrap.type2'&&r.css.includes('border: 1px')),'Original native root border must be visible to the review');
  assert.ok(result.ancestors[0].computed.transform!=='none'&&result.ancestors[0].computed.overflow==='hidden','Ancestor stacking and clipping must be visible');
  assert.ok(!result.nodes[0].rules.some(r=>r.css.includes('2px solid red')),'Inactive media rules cannot masquerade as current winners');
  assert.ok(!result.html.includes('synthetic-private')&&!result.html.includes('synthetic-password')&&!result.html.includes('<script'),'Recorded markup excludes hidden/password values and scripts');
  assert.ok(!result.html.includes(opaque)&&!result.html.includes('synthetic-private-attribute'),'Hidden opaque identifiers and nonstandard attributes cannot enter captured fixture markup');
  assert.ok(result.nodes[0].box.width>0&&result.nodes[0].box.height>0);
  assert.equal(await page.evaluate(()=>document.querySelector('#sample').outerHTML===window.originalMarkup&&document.querySelector('button').onclick===window.originalAction),true,'Observation preserves original DOM and handlers');
 }finally{await page.close()}
}
