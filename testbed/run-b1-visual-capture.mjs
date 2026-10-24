import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {assert,createTestPage,launchBrowser,storageKeys} from './harness/runner-utils.mjs';
import {startServer} from './server/server.mjs';
import {mountB1NativeFixture} from './fixtures/b1-native-list.mjs';
const args=process.argv.slice(2),option=n=>args[args.indexOf(n)+1];
assert.ok(args.includes('--require-runtime-under-test')&&args.includes('--control')&&args.includes('--output'));
const candidate=path.resolve('testbed/artifacts/runtime-under-test.user.js'),control=path.resolve(option('--control')),output=path.resolve(option('--output'));
assert.ok(output.startsWith(path.resolve('artifacts')+path.sep)||output.startsWith(path.resolve('testbed/artifacts')+path.sep));
await mkdir(output,{recursive:true});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),bindings={};
for(const [role,file]of [['reference',control],['candidate',candidate]])bindings[role]={path:path.relative(process.cwd(),file).replaceAll('\\','/'),sha256:hash(await readFile(file))};
console.log(JSON.stringify({scope:'BEFORE_REPAIR_VS_CURRENT_NOT_GOLDEN_APPROVAL',bindings}));
const server=await startServer(),browser=await launchBrowser(),cases=[];
try{for(const [id,width,height,dark,open]of [['list-light',980,900,false,false],['list-dark',980,900,true,false],['phone-layout',980,2306,false,false],['stress-narrow',390,900,false,false],['recent-light',980,900,false,true],['recent-dark',980,900,true,true]]){
 const item={id,width,height,theme:dark?'dark':'light'};
 for(const [role,file]of [['reference',control],['candidate',candidate]]){
  process.env.DCUF_TESTBED_USERSCRIPT=file;
  const e=await createTestPage(browser,server.baseUrl,{viewport:{width,height},storage:{[storageKeys.threshold]:0,[storageKeys.palette]:'teal'}});
  try{await mountB1NativeFixture(e,server.baseUrl,{dark});await e.page.evaluate(()=>document.fonts.ready);if(open)await e.page.locator('.newvisit_history>.btn_open').click();await e.page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const image=path.join(output,`${id}-${role}.png`);await e.page.screenshot({path:image,animations:'disabled'});item[role]=path.relative(process.cwd(),image).replaceAll('\\','/');
   const toolbar=e.page.locator('[data-dcuf-surface="list-toolbar"]'),regionImage=path.join(output,`${id}-${role}-toolbar.png`);
   await toolbar.screenshot({path:regionImage,animations:'disabled'});
   (item.regions||= {})[role]={toolbar:path.relative(process.cwd(),regionImage).replaceAll('\\','/'),bounds:await toolbar.boundingBox()};
  }finally{await e.close()}
 }cases.push(item);
}const manifest={schemaVersion:1,purpose:'design-comparison',provenance:{scope:'Before-repair defective control versus current; same fixture/browser/viewport/theme/open state. Reference is not an approved golden.',browser:browser.version(),bindings,fixtureSha256:hash(await readFile('testbed/fixtures/b1-native-list.mjs'))},cases};await writeFile(path.join(output,'pairs.json'),JSON.stringify(manifest,null,2));console.log(`Captured ${cases.length} matched states in separate contexts. ${output}`);
}finally{process.env.DCUF_TESTBED_USERSCRIPT=candidate;await browser.close();await server.close()}
