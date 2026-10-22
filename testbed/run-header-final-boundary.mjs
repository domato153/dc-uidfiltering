import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {parse} from 'acorn';
import {restoreHistoricalGnbPriorities,restoreHistoricalHeaderLayoutPriorities} from '../tools/header-gnb-priority-contract.mjs';
import {restoreHeaderCompositionCss} from '../tools/header-composition-contract.mjs';
import {restoreConcept01HeaderVisualDelta} from '../tools/concept01-header-visual-delta.mjs';

const dir='artifacts/header-finish-2026-10-13';
const sha=b=>createHash('sha256').update(b).digest('hex').toUpperCase();
const controlSha256='602810EB816C7FBED63386E0713E3CE8C07772DC90E3BB5F0893B40061FE3017';
const snapshotContract=process.argv.includes('--snapshot-contract');
const control=snapshotContract?null:await readFile('artifacts/controls/header-early-6028.user.js','utf8');
if(control!==null)assert.equal(sha(control),controlSha256);
// Exact complete CSS snapshots independently derived from the pinned 6028
// artifact, not recomputed from candidate producers. Cold policy runs explicitly
// select this pure contract; actual browser comparisons still require control bytes.
const frozenCss={
 'header-shell':'A9650C2FBDE781E0CE3161F543EB80EBE01C8E1F60EF8E04E5855922C6154282',
 'gallery-page-head':'D405C5786E4535FE6E80B8C9DB1AB7C5ABC7EF16739B3779C8856174E7FFF78F',
 'header-gnb':'7D38EE8ACE033023A228CEB251D4D13F7210B0C26B2C68C2FEFB207A51019337',
 'header-recent-visit':'948ED978E0E81867C53631E4E7484B92F7DDA2BD754BE9D736023DE144252820',
};
const walk=(node,fn)=>{if(!node||typeof node!=='object')return;if(node.type)fn(node);for(const [k,v] of Object.entries(node)){if(['start','end','loc'].includes(k))continue;if(Array.isArray(v))v.forEach(x=>walk(x,fn));else if(v&&typeof v==='object')walk(v,fn);}};
const functions=source=>{const out=new Map();walk(parse(source,{ecmaVersion:'latest'}),n=>{if(n.type==='FunctionDeclaration'&&n.id?.name.startsWith('__dcuf'))out.set(n.id.name,source.slice(n.start,n.end));});return out;};
const initializer=(source,name)=>{let value;walk(parse(source,{ecmaVersion:'latest'}),n=>{if(n.type==='VariableDeclarator'&&n.id?.name===name)value=source.slice(n.init.start,n.init.end);});assert.ok(value,name);return value;};
const cases=[
 ['header-shell','HeaderShell',['root','head','logo','logoImage','logoImageAlt','searchWrap','topSearch','links','darkRoot']],
 ['gallery-page-head','GalleryPageHead',['root','left','right','clearfix']],
 ['header-gnb','HeaderGnb',['root','nav','list','darkList']],
 ['header-recent-visit','HeaderRecentVisit',['root','decoration','title','box','list','scrollbar','item','controls','arrow','darkRoot','darkTitle']],
];
const canonical=s=>s.replace(/\r\n/g,'\n');
const historicalCss=(surface,css)=>{
 css=restoreHeaderCompositionCss(surface,css);
 if(surface==='header-gnb')return restoreHistoricalGnbPriorities(css,'base');
 if(['gallery-page-head','header-recent-visit'].includes(surface))return restoreHistoricalHeaderLayoutPriorities(css,surface);
 if(surface==='header-shell'){
  css=restoreHistoricalHeaderLayoutPriorities(css,surface);
  const changed='[data-dcuf-header-shell-role="head"] [data-dcuf-header-shell-role="links"] { display: flex !important; flex-shrink: 0 !important; white-space: nowrap !important; }';
  assert.equal(css.split(changed).length,2,'Exactly one declared native links display correction');
  return css.replace(changed,changed.replace('display: flex','display: block'));
 }

 return css;
};
const originalFunctions=control===null?new Map():functions(control), results=[], dependencies={};
dependencies['tools/header-gnb-priority-contract.mjs']=sha(await readFile('tools/header-gnb-priority-contract.mjs'));
dependencies['tools/header-composition-contract.mjs']=sha(await readFile('tools/header-composition-contract.mjs'));
dependencies['tools/concept01-header-visual-delta.mjs']=sha(await readFile('tools/concept01-header-visual-delta.mjs'));
dependencies['verification/concept01-header-visual-delta.json']=sha(await readFile('verification/concept01-header-visual-delta.json'));
for(const [surface,family,slots] of cases){
 const file=`src/targets/mobile/${surface}-presenter.js`,adapterFile=`src/targets/mobile/${surface}-host-adapter.js`;
 const source=await readFile(file,'utf8'),historicalSource=restoreConcept01HeaderVisualDelta(source),adapter=await readFile(adapterFile,'utf8');dependencies[file]=sha(source);dependencies[adapterFile]=sha(adapter);
 const builder=`__dcufBuild${family}Style`,producer=`__dcufDescribe${family}StyleSelectors`;
 const build=functions(source).get(builder),input=functions(adapter).get(producer);
 assert.ok(build,`${surface}: pure late style builder required`);assert.ok(input,`${surface}: adapter selector input required`);
 const run=expr=>vm.runInNewContext(`${expr}\n${build}\n${input}`,{}, {timeout:1000});
 const record=run(`${producer}();`);assert.ok(Object.isFrozen(record));assert.deepEqual(Object.keys(record),slots);
 const oldPrelude=[...originalFunctions].filter(([name])=>name.startsWith(`__dcufBuild${family}`)).map(([,text])=>text).join('\n');
 const old=control===null?null:vm.runInNewContext(`${oldPrelude}\n(${initializer(control,`__dcuf${family}Presenter`)}).style`,{}, {timeout:1000});
 const style=run(`${builder}(${producer}());`);assert.ok(Object.isFrozen(style));
 const historicalBuild=functions(historicalSource).get(builder);
 const historicalStyle=vm.runInNewContext(`${historicalBuild}\n${input}\n${builder}(${producer}());`,{}, {timeout:1000});
 assert.equal(style.key,surface);assert.equal(style.id,`dcuf-${surface}-style`);assert.equal(sha(canonical(historicalCss(surface,historicalStyle.css))),frozenCss[surface],'Independent frozen full CSS except declared GNB priority and shell links display');
 if(old!==null){assert.equal(style.key,old.key);assert.equal(style.id,old.id);assert.equal(canonical(historicalCss(surface,historicalStyle.css)),canonical(old.css),'Complete original CSS except declared GNB priority and shell links display');}
 if(surface==='header-shell'){
  for(const changed of [historicalStyle.css.replace('display: flex; flex-shrink','display: grid; flex-shrink'),historicalStyle.css.replace('white-space: nowrap;','white-space: normal;'),historicalStyle.css.replace('min-width: 320px','min-width: 321px')]){
   assert.throws(()=>assert.equal(sha(canonical(historicalCss(surface,changed))),frozenCss[surface]),'Reject changes outside the one links display declaration');
  }
 }
 if(['header-gnb','gallery-page-head','header-shell','header-recent-visit'].includes(surface)){
  // Reintroducing any selected old priority must fail before the immutable
  // historical digest is compared; an unrelated value/rule change also fails.
  const targets=surface==='header-shell'?['justify-content: space-between;','align-items: center;','padding: 8px 15px;','gap: 15px;','box-sizing: border-box;','flex-shrink: 0;','margin: 0;','display: block;','height: 22px;','width: auto;','display: none;','flex-grow: 1;','min-width: 100px;','width: 100%;','display: flex;','white-space: nowrap;','background: #1c1c1e;','border-bottom-color: #3a3a3c;']
   :surface==='header-recent-visit'?['min-width: 0;','height: auto;','padding: 8px 10px;','background: #f8f9fa;','border: none;','box-sizing: border-box;','margin: 0;','font-size: 14px;','width: 100%;','transform: none;','overflow: visible;','background: #1c1c1e;','border-bottom-color: #3a3a3c;']
   :surface==='header-gnb'?['display: block;','height: auto;','width: auto;','min-width: 0;','padding: 0 15px;','justify-content: center;','width: 100%;']
   :['display: flex;','justify-content: space-between;','align-items: center;','box-sizing: border-box;','width: 100%;','float: none;'];
  for(const declaration of targets){
   let at=historicalStyle.css.indexOf(declaration);
   assert.ok(at>=0,declaration);
   while(at>=0){
    const changed=historicalStyle.css.slice(0,at)+declaration.replace(';',' !important;')+historicalStyle.css.slice(at+declaration.length);
    assert.throws(()=>assert.equal(sha(canonical(historicalCss(surface,changed))),frozenCss[surface]),'Reject undeclared restored priority');
    at=historicalStyle.css.indexOf(declaration,at+declaration.length);
   }
  }
  for(const changed of [historicalStyle.css.replace('width: 100%;','width: 99%;'),historicalStyle.css+'\n.changed { color: red; }']){
   assert.throws(()=>assert.equal(sha(canonical(historicalCss(surface,changed))),frozenCss[surface]),'Reject value or extra rule beyond declared priorities');
  }
 }
 const realm={__dcufRoot:{}};
 vm.runInNewContext(`${input}\n${source}`,realm,{timeout:1000});
 assert.equal(realm.__dcufRoot[`__dcuf${family}Presenter`].style.css,style.css,'Current .style diagnostic consumer preserved');
 assert.equal(run(`${builder}(Object.freeze(Object.fromEntries(Object.entries(${producer}()).reverse()))).css;`),style.css,'Slots bind by name');
 for(const slot of slots){
  const css=vm.runInNewContext(`${build}\n${builder}(input).css`,{input:Object.freeze({...record,[slot]:`.changed-${slot}`})},{timeout:1000});
  assert.notEqual(css,style.css,`${surface}/${slot}: input consumed independently`);assert.ok(css.includes(`.changed-${slot}`));
 }
 let accessed=false;const accessor={...record};Object.defineProperty(accessor,slots[0],{enumerable:true,get(){accessed=true;return record[slots[0]];}});Object.freeze(accessor);
 const inherited=Object.freeze(Object.assign(Object.create({[slots[0]]:record[slots[0]]}),Object.fromEntries(Object.entries(record).slice(1))));
 const malformed=[null,{...record},Object.freeze({...record,extra:'.extra'}),Object.freeze(Object.fromEntries(Object.entries(record).slice(1))),Object.freeze({...record,[slots[0]]:''}),Object.freeze({...record,[slots[0]]:'  '}),Object.freeze({...record,[slots[0]]:42}),accessor,inherited,Object.freeze({...record,[Symbol('extra')]:'.extra'})];
 for(const input of malformed)assert.throws(()=>vm.runInNewContext(`${build}\n${builder}(input)`,{input},{timeout:1000}),{name:'TypeError'});
 assert.equal(accessed,false);assert.ok(!/\.typea|\bbody\s|\b(?:h1|img|nav)\[|\.dc-filter-dark-mode/.test(build),'No native predicate construction in presentation builder');
 results.push({surface,slots:slots.length,independentNegatives:slots.length,malformedNegatives:malformed.length,cssSha256:sha(canonical(style.css)),historicalCssSha256:frozenCss[surface],declaredPriorityChanges:surface==='header-shell'?19:surface==='header-recent-visit'?13:surface==='header-gnb'?8:surface==='gallery-page-head'?7:0,declaredDisplayChanges:surface==='header-shell'?1:0,declaredCompositionChanges:['header-gnb','gallery-page-head'].includes(surface)?2:0,exactCss:false,preInitialization:true,diagnosticInterface:true});
}
const recentFile='src/targets/mobile/header-recent-visit-presenter.js',recentAdapter='src/targets/mobile/header-recent-visit-host-adapter.js';
const recent=await readFile(recentFile,'utf8'),recentInputs=functions(await readFile(recentAdapter,'utf8')).get('__dcufDescribeHeaderRecentVisitStyleSelectors');
const realm={__dcufRoot:{}};vm.runInNewContext(`${recentInputs}\n${recent}`,realm,{timeout:1000});
const presenter=realm.__dcufRoot.__dcufHeaderRecentVisitPresenter;
assert.equal(typeof presenter.describeListStyle,'function','Recent list presentation belongs to presenter');
assert.equal(typeof presenter.describeControls,'function','Recent control presentation belongs to presenter');
const list=presenter.describeListStyle();assert.ok(Object.isFrozen(list)&&list.every(Object.isFrozen));
assert.equal(JSON.stringify(list),JSON.stringify([{name:'left',value:'0px',priority:'important'},{name:'margin-left',value:'0px',priority:'important'}]));
for(const canPrev of [false,true])for(const canNext of [false,true]){
 const value=presenter.describeControls(Object.freeze({canPrev,canNext}));assert.ok(Object.isFrozen(value)&&Object.isFrozen(value.prev)&&Object.isFrozen(value.next));
 assert.equal(value.prev.on,canPrev);assert.equal(value.next.on,canNext);assert.equal(value.prev.ariaDisabled,String(!canPrev));assert.equal(value.next.ariaDisabled,String(!canNext));
}
const adapter=await readFile(recentAdapter,'utf8');assert.ok(!/setProperty\('(?:left|margin-left)',\s*'0px'/.test(adapter),'No owned fixed list presentation literals in adapter');
await mkdir(dir,{recursive:true});
const report={kind:'header-final-pure-boundary',status:'PASS',controlSha256,controlArtifactAvailable:control!==null,mode:snapshotContract?'FROZEN_CSS_SNAPSHOT_CONTRACT':'EXACT_CONTROL_CSS_COMPARISON',visualProjection:'EXACT_REGISTERED_CSS_INVERSE_NOT_CURRENT_VISUAL_ACCEPTANCE',observerSha256:sha(await readFile('testbed/run-header-final-boundary.mjs')),dependencies,results,recentControlStates:4,recentListDescriptions:2,scope:'PURE_BOUNDARY_NOT_HEADER_STAGE_ADMISSION'};
await writeFile(`${dir}/pure-boundary.json`,JSON.stringify(report,null,2)+'\n');
console.log(`Header final pure boundary PASS: ${results.length} builders/${results.reduce((n,x)=>n+x.slots,0)} slots; recent list/control descriptions.`);
