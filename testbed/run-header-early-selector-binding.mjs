import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {parse} from 'acorn';
import path from 'node:path';
import {restoreHistoricalGnbPriorities} from '../tools/header-gnb-priority-contract.mjs';

const controlPath='artifacts/controls/header-removal-D52D.user.js';
const control=await readFile(controlPath);
const sha=b=>createHash('sha256').update(b).digest('hex').toUpperCase();
assert.equal(sha(control),'D52D8C7C9AE46A2BD3D37974B929D36952B9E3F55EB5D19F5C3680602B9E1B59');
const cases=[
 ['header-shell','HeaderShell','Theme',['root','search','searchButton','spriteButton','login','logout','searchInset','searchField','buttonDecoration','spriteDecoration']],
 ['header-shell','HeaderShell','Reset',['root']],
 ['gallery-page-head','GalleryPageHead','Theme',['root','search','directSearch','title','badge','titleIcon','linkedTitleIcon','titleDecoration','linkedTitleDecoration','miniFixtureDecoration','miniRootDecoration','nestedMiniDecoration','miniDecoration']],
 ['header-gnb','HeaderGnb','Theme',['root','nextIcon']],
 ['header-gnb','HeaderGnb','Reset',['root']],
 ['header-recent-visit','HeaderRecentVisit','Theme',['title','open','activeLink']],
 ['header-drawer','HeaderDrawer','Theme',['issue']],
 ['header-drawer','HeaderDrawer','Visibility',['door','recommendation']],
];
const walk=(node,fn)=>{ if(!node||typeof node!=='object')return; if(node.type)fn(node); for(const [k,v] of Object.entries(node)){if(k==='start'||k==='end')continue;if(Array.isArray(v))v.forEach(x=>walk(x,fn));else if(v&&typeof v==='object')walk(v,fn);} };
function functions(source){const result=new Map();walk(parse(source,{ecmaVersion:'latest'}),node=>{if(node.type==='FunctionDeclaration'&&node.id?.name.startsWith('__dcuf')){assert.ok(!result.has(node.id.name),`Duplicate ${node.id.name}`);result.set(node.id.name,{node,text:source.slice(node.start,node.end)});}});return result;}
const original=functions(control.toString());
const canonical=text=>text.replace(/\r\n/g,'\n').replace(/[ \t]+$/gm,'').trimEnd();
const results=[];
const bindings={};
bindings['tools/header-gnb-priority-contract.mjs']=sha(await readFile('tools/header-gnb-priority-contract.mjs'));
const candidateDeclarations=[];
const controlDeclarations=[];
for(const [surface,family,kind,slots] of cases){
 const presenterPath=`src/targets/mobile/${surface}-presenter.js`,adapterPath=`src/targets/mobile/${surface}-host-adapter.js`;
 const presenter=await readFile(presenterPath,'utf8'),adapter=await readFile(adapterPath,'utf8');
 bindings[presenterPath]=sha(presenter);bindings[adapterPath]=sha(adapter);
 const buildName=`__dcufBuild${family}${kind}Css`,inputName=`__dcufDescribe${family}${kind}Selectors`;
 const build=functions(presenter).get(buildName),input=functions(adapter).get(inputName);
 assert.ok(build&&!build.node.async&&!build.node.generator,`${surface}/${kind}: synchronous hoisted presentation builder`);
 assert.ok(input&&!input.node.async&&!input.node.generator,`${surface}/${kind}: hoisted adapter selector input required`);
 const declaration=`${build.text}\n${input.text}`;
 const old=original.get(buildName);assert.ok(old,`Exact control builder ${buildName}`);
 candidateDeclarations.push(declaration);controlDeclarations.push(old.text);
 // Invoke BEFORE either declaration. No const presenter/adapter, DOM, theme
 // owner or mutable global is available to rescue an initialization regression.
 const run=(prefix,declarations=declaration)=>vm.runInNewContext(`${prefix}\n${declarations}`,{}, {timeout:1000});
 for(const attribute of ['data-dcuf-palette','data-dcuf-audit-palette']){
  const oldCss=vm.runInNewContext(`${old.text}\n${buildName}(${JSON.stringify(attribute)})`,{}, {timeout:1000});
  const css=run(`${buildName}(${inputName}(${JSON.stringify(attribute)}));`);
  const historical=surface==='header-gnb'&&kind==='Theme'?restoreHistoricalGnbPriorities(css,'theme'):css;
  assert.equal(canonical(historical),canonical(oldCss),`${surface}/${kind}: exact CSS except declared GNB background priorities`);
 }
 const record=run(`${inputName}('data-dcuf-palette');`);
 assert.ok(Object.isFrozen(record));assert.deepEqual(Object.keys(record),slots);
 assert.ok(slots.every(slot=>typeof Object.getOwnPropertyDescriptor(record,slot)?.value==='string'));
 assert.ok(!/\.(?:dcheader|dchead|page_head|gnb_bar|newvisit_history|issue_wrap|issue_contentbox)\b|#gall_top_recom\b|html\[|\bbody\b/.test(build.text),`${surface}/${kind}: presentation must not own native selectors`);
 const reversed=Object.freeze(Object.fromEntries(Object.entries(record).reverse()));
 const baseline=vm.runInNewContext(`${build.text}\n${buildName}(input)`,{input:record},{timeout:1000});
 assert.equal(vm.runInNewContext(`${build.text}\n${buildName}(input)`,{input:reversed},{timeout:1000}),baseline,'Names, not record order, bind selectors');
 for(const slot of slots){
  const sentinel=`.independent-native-selector-${slot}`;
  const changed=Object.freeze({...record,[slot]:sentinel});
  const css=vm.runInNewContext(`${build.text}\n${buildName}(input)`,{input:changed},{timeout:1000});
  assert.notEqual(css,baseline,`${surface}/${kind}/${slot}: every named input affects CSS`);
  assert.ok(css.includes(sentinel),`${surface}/${kind}/${slot}: changed native input is consumed`);
 }
 let accessed=false;
 const accessor={...record};Object.defineProperty(accessor,slots[0],{get(){accessed=true;return record[slots[0]];},enumerable:true});Object.freeze(accessor);
 const malformed=[null,{...record},Object.freeze({...record,extra:'.native-extra'}),
  Object.freeze(Object.fromEntries(Object.entries(record).slice(1))),Object.freeze({...record,[slots[0]]:''}),
  Object.freeze({...record,[slots[0]]:42}),accessor];
 for(const input of malformed)assert.throws(()=>vm.runInNewContext(`${build.text}\n${buildName}(input)`,{input},{timeout:1000}),{name:'TypeError'});
 assert.equal(accessed,false,'Accessor input rejected without executing its getter');
 results.push({surface,kind,slots:slots.length,independentInputNegatives:slots.length,exactControlCss:surface!=='header-gnb'||kind!=='Theme',declaredPriorityChanges:surface==='header-gnb'&&kind==='Theme'?2:0,hoistedBeforeInitialization:true,rejectedInputs:malformed.length});
}
function initializer(source,name){let found;walk(parse(source,{ecmaVersion:'latest'}),node=>{if(node.type==='VariableDeclarator'&&node.id?.name===name){assert.equal(found,undefined,`Duplicate ${name}`);found=source.slice(node.init.start,node.init.end);}});assert.ok(found,`Missing ${name}`);return found;}
const composition={};
for(const [kind,file,name] of [['theme','src/targets/mobile/theme-host-style.js','__dcufBuildTargetThemeCss'],['core','src/targets/mobile/filter-module.js','__dcufAllFilterCss']]){
 const source=await readFile(file,'utf8');bindings[file]=sha(source);
 const expression=initializer(source,name),baselineExpression=initializer(control.toString(),name);
 const evaluate=(expr,declarations,attribute)=>vm.runInNewContext(`const value=${expr};\n${kind==='theme'?`value(${JSON.stringify(attribute)})`:'value'};\n${declarations.join('\n')}`,{}, {timeout:1000});
 for(const attribute of kind==='theme'?['data-dcuf-palette','data-dcuf-audit-palette']:[null]){
  const current=evaluate(expression,candidateDeclarations,attribute);
  assert.equal(canonical(kind==='theme'?restoreHistoricalGnbPriorities(current,'theme'):current),canonical(evaluate(baselineExpression,controlDeclarations,attribute)),`Complete ${kind} stylesheet except declared GNB priorities`);
 }
 if(kind==='theme'){
  const reordered=expression.replace('__dcufBuildHeaderShellThemeCss','__swapTheme').replace('__dcufBuildHeaderGnbThemeCss','__dcufBuildHeaderShellThemeCss').replace('__swapTheme','__dcufBuildHeaderGnbThemeCss')
   .replace('__dcufDescribeHeaderShellThemeSelectors','__swapInput').replace('__dcufDescribeHeaderGnbThemeSelectors','__dcufDescribeHeaderShellThemeSelectors').replace('__swapInput','__dcufDescribeHeaderGnbThemeSelectors');
  assert.notEqual(canonical(restoreHistoricalGnbPriorities(evaluate(reordered,candidateDeclarations,'data-dcuf-palette'),'theme')),canonical(evaluate(baselineExpression,controlDeclarations,'data-dcuf-palette')),'Cross-surface phase order cannot hide in grouped palette digest');
 }
 composition[kind]={exactCompleteCss:kind!=='theme',declaredPriorityChanges:kind==='theme'?2:0,attributes:kind==='theme'?2:0,invokedBeforePresenterAdapterInitialization:true};
}
const report={kind:'header-early-native-selector-contract',status:'PASS',scope:'PURE_FACTORY_AND_INPUT_NOT_BROWSER_OR_STAGE_ADMISSION',control:{path:controlPath,sha256:sha(control)},observerSha256:sha(await readFile(new URL(import.meta.url))),inputs:bindings,results,composition,compositionOrderNegative:true};
const index=process.argv.indexOf('--output');if(index>=0){await mkdir(path.dirname(process.argv[index+1]),{recursive:true});await writeFile(process.argv[index+1],JSON.stringify(report,null,2)+'\n');}
console.log(`Header early binding PASS: ${results.length} builders, ${results.reduce((n,r)=>n+r.slots,0)} named inputs; exact control CSS except two GNB priorities and hoisted execution; ${results.reduce((n,r)=>n+r.rejectedInputs,0)} malformed controls rejected.`);
