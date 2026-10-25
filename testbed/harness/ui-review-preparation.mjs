import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const repositoryRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const pngSignature=Buffer.from([137,80,78,71,13,10,26,10]);
const safeId=id=>{if(!/^[a-z0-9][a-z0-9-]*$/.test(id))throw Error('A simple capture/case id is required');return id};
const within=(root,file)=>{const full=path.resolve(root,file),relative=path.relative(root,full);if(!relative||relative.startsWith('..')||path.isAbsolute(relative))throw Error('Path must stay inside the review root');return full};
async function png(root,file){
 const bytes=await readFile(within(root,file));
 if(bytes.length<24||!bytes.subarray(0,8).equals(pngSignature))throw Error('Expected a PNG: '+file);
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 if(!width||!height)throw Error('PNG must have positive dimensions: '+file);
 return{path:path.relative(root,within(root,file)).replaceAll('\\','/'),sha256:digest(bytes),width,height};
}

// Preparation only: callers retain their guarded browser setup, interactions,
// reference choice and judgement. visual-review.mjs owns decoding/diff/report.
export async function createUiReviewPreparation({outputDir,provenance,expectedRuntimeSha256,rootDir=repositoryRoot}){
 const root=path.resolve(rootDir),output=within(root,outputDir),relative=path.relative(root,output).replaceAll('\\','/');
 if(!relative.startsWith('artifacts/')&&!relative.startsWith('testbed/artifacts/'))throw Error('Review output must be an artifacts child');
 if(typeof provenance!=='string'||!provenance.trim())throw Error('State the capture provenance');
 const runtimePath=path.join(root,'testbed/artifacts/runtime-under-test.user.js'),runtimeSha256=digest(await readFile(runtimePath));
 if(expectedRuntimeSha256&&runtimeSha256!==expectedRuntimeSha256.toLowerCase())throw Error('Unexpected guarded runtime');
 await mkdir(output,{recursive:true});if((await readdir(output)).length)throw Error('Review output must be new and empty');
 const captures=new Map();let failed=null;
 const unchanged=async()=>{if(failed)throw Error('Review preparation failed: '+failed.message);if(digest(await readFile(runtimePath))!==runtimeSha256){failed=Error('Guarded runtime changed during review');throw failed}};
 const save=()=>writeFile(path.join(output,'capture-metadata.json'),JSON.stringify({runtime:{path:runtimePath,sha256:runtimeSha256},provenance,captures:[...captures.values()]},null,2)+'\n');
 return Object.freeze({
  runtime:Object.freeze({path:runtimePath,sha256:runtimeSha256}),
  async capture(page,{id,selector,clip,theme='light',fullPage=false}){
   safeId(id);if(captures.has(id))throw Error('Duplicate capture id: '+id);if(!['light','dark'].includes(theme))throw Error('Theme must be explicit light/dark');
   try{
    await unchanged();const file=path.join(output,id+'.png');
    if(selector)await page.locator(selector).screenshot({path:file});else await page.screenshot({path:file,...(clip?{clip}:{fullPage})});
    await unchanged();const asset=await png(root,file),record={id,theme,...asset,browser:page.context().browser()?.version()||'unavailable',viewport:page.viewportSize(),capture:selector?{selector}:clip?{clip}:{fullPage}};
    captures.set(id,record);await save();return Object.freeze({...record});
   }catch(error){failed=error;throw error}
  },
  async writeManifest(cases,{assessment}={}){
   await unchanged();if(!cases?.length)throw Error('Comparison cases are required');const seen=new Set(),records=[],bindings=[];
   for(const item of cases){safeId(item.id);if(seen.has(item.id))throw Error('Duplicate case id');seen.add(item.id);const current=captures.get(item.captureId);if(!current)throw Error('Capture is missing: '+item.captureId);const reference=await png(root,item.reference),candidate=await png(root,current.path);if(candidate.sha256!==current.sha256)throw Error('Captured image changed: '+item.captureId);if(reference.width!==candidate.width||reference.height!==candidate.height)throw Error('Reference/current dimensions differ: '+item.id);records.push({id:item.id,theme:current.theme,width:candidate.width,height:candidate.height,reference:reference.path,candidate:candidate.path});bindings.push({id:item.id,referenceSha256:reference.sha256,candidateSha256:candidate.sha256})}
   const manifest={schemaVersion:1,purpose:'design-comparison',provenance:{description:provenance,runtime:{path:runtimePath,sha256:runtimeSha256}},cases:records};
   if(assessment){if(assessment.cases?.length!==records.length||!['reviewer','basis','limitations'].every(k=>typeof assessment[k]==='string'&&assessment[k].trim()))throw Error('Explicit complete image review required');manifest.assessment={...assessment,cases:records.map((item,i)=>{const review=assessment.cases.find(r=>r.id===item.id);if(!review?.summary||!Array.isArray(review.findings))throw Error('Missing image judgement: '+item.id);return{...review,...bindings[i]}})}}
   await unchanged();const file=path.join(output,'comparison.json');await writeFile(file,JSON.stringify(manifest,null,2)+'\n');return Object.freeze({path:file,cases:records.length,reviewed:Boolean(assessment)});
  },
 });
}
