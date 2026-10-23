import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {buildB1ListPreview} from '../tools/build-b1-list-preview.mjs';
import {assert,launchBrowser} from './harness/runner-utils.mjs';
import {readToolbarVisualContract,assessToolbarVisualContract} from './harness/toolbar-visual-contract.mjs';

const output='testbed/artifacts/toolbar-visual-contract';await mkdir(output,{recursive:true});
const preview=await buildB1ListPreview(),allowed=new Set(['list.html','presentation.css','host-preview.mjs','fixture-client.js']);
const types={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript'};
const browser=await launchBrowser(),cases=[];
try{for(const theme of ['light','dark']){
 const context=await browser.newContext({viewport:{width:980,height:900}}),page=await context.newPage();
 try{
  await context.route('**/*',async route=>{const name=new URL(route.request().url()).pathname.slice(1);if(!allowed.has(name))return route.abort();await route.fulfill({body:await readFile(path.join(preview,name)),contentType:types[path.extname(name)]})});
  await page.goto(`http://dcuf-reference.test/list.html?nativeToolbar=1&theme=${theme}`);
  await page.waitForFunction(()=>document.body.dataset.b1Ready==='1');
  const toolbar=page.locator('.list_array_option'),snapshot=await toolbar.evaluate(readToolbarVisualContract);
  assert.deepEqual(assessToolbarVisualContract(snapshot),[],`Selected ${theme} reference must be admitted`);
  const shifted=structuredClone(snapshot);for(const label of shifted.categories)label.textCenter-=10;
  assert.equal(assessToolbarVisualContract(shifted)[0].code,'CATEGORY_LABEL_ALIGNMENT','A shifted label group must be rejected');
  const clearfix=structuredClone(snapshot);clearfix.layout='grid';clearfix.clearfix={display:'block',content:'""'};
  assert.equal(assessToolbarVisualContract(clearfix)[0].code,'LEGACY_CLEARFIX_GRID_ITEM','A native float clearfix must be rejected in a grid');
  assert.equal(assessToolbarVisualContract(clearfix,{sameRow:false})[0].code,'LEGACY_CLEARFIX_GRID_ITEM','Separate responsive rows still reject a legacy clearfix');
  await toolbar.screenshot({path:`${output}/reference-${theme}-toolbar.png`,animations:'disabled'});
  cases.push({theme,snapshot,reference:'PASS',shiftedNegative:'REJECTED',clearfixNegative:'REJECTED'});
 }finally{await context.close()}
}}finally{await browser.close();await writeFile(`${output}/report.json`,JSON.stringify({scope:'TOOLBAR_ALIGNMENT_AND_CLEARFIX_NOT_BEAUTY_OR_MATERIAL',cases},null,2)+'\n')}
console.log(`Toolbar visual contract: ${cases.length} selected-reference positives; shifted-label and clearfix negatives rejected`);
