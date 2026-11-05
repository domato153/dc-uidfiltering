import{readFile}from'node:fs/promises';
import path from'node:path';
import{createHash}from'node:crypto';
import{parseNextAction}from'../../tools/continuity-state.mjs';

export function applyVisualRequirementStatus(fidelity,contract){
 if(contract?.status==='NEEDS_WORK')return{...fidelity,status:'NEEDS_WORK'};
 if(contract?.status==='UNVERIFIED'&&fidelity.status==='REVIEWED')return{...fidelity,status:'UNVERIFIED'};
 return fidelity;
}

// Evidence validation, not an aesthetic scorer. Both preparation and the
// comparator enforce it so a handwritten manifest cannot skip the reference.
export async function validateVisualReference(manifest,root){
 if(manifest.purpose==='regression'){
  if(manifest.assessment||manifest.visualRequirements)throw Error('Regression pixels cannot certify design fidelity');
  return null;
 }
 const d=manifest.designReference;
 if(!d?.path||!d.sha256||!d.region?.trim()||!d.decisionPath)throw Error('Design comparison requires the selected designReference, region and decisionPath');
 const read=async relative=>{if(typeof relative!=='string'||path.isAbsolute(relative))throw Error('Reference/evidence paths must be repository-relative');const absolute=path.resolve(root,relative),r=path.relative(root,absolute);if(!r||r.startsWith('..')||path.isAbsolute(r))throw Error('Reference/evidence outside repository');return readFile(absolute)};
 const check=async(asset,rendered=false)=>{const bytes=await read(asset.path),sha256=createHash('sha256').update(bytes).digest('hex');if(sha256!==asset.sha256?.toLowerCase())throw Error('Stale reference/evidence hash: '+asset.path);if(rendered&&(bytes.length<24||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||!bytes.readUInt32BE(16)||!bytes.readUInt32BE(20)))throw Error('Visual proof must be a positive-size rendered PNG: '+asset.path);return sha256};
 const sha256=await check(d),decision=(await read(d.decisionPath)).toString('utf8');
 if(!decision.toLowerCase().includes(sha256))throw Error('Design decision does not bind the selected reference hash');
 const next=await read('docs/work/NEXT_TASK.md'),action=parseNextAction(next.toString('utf8'));
 const selected=action.requiredDependencies.find(item=>item.id==='selected-design-image');
 if(selected?.mode!=='FROZEN'||selected.path!==d.path||selected.sha256.toLowerCase()!==sha256)throw Error('Design reference differs from the active continuity selection');
 const region=next.toString('utf8').match(/^- Design reference region: (.+)$/m)?.[1];
 if(region!==d.region)throw Error('Design reference region differs from the active task');
 if(manifest.cases?.some(c=>c.candidate===d.path))throw Error('Current output cannot be its own selected design reference');
 if(!Array.isArray(manifest.visualRequirements)||!manifest.visualRequirements.length)throw Error('Design comparison requires explicit visualRequirements');
 const ids=new Set();let status='REVIEWED';
 for(const r of manifest.visualRequirements){
  if(!r.id||ids.has(r.id)||!r.expected?.trim()||!['present','missing'].includes(r.implementation)||!['passed','unverified','failed'].includes(r.verification))throw Error('Invalid/duplicate visual requirement');ids.add(r.id);
  if(r.implementation==='missing'&&r.verification!=='failed')throw Error('A known missing effect is NEEDS_WORK, not preference/unverified/passed');
  if(r.verification==='passed'&&!r.evidence?.length)throw Error('Verified visual requirement needs rendered evidence');
  for(const e of r.evidence||[]){
   await check(e,true);
   if(!manifest.cases?.some(c=>c.candidate===e.path))throw Error('Visual proof must be a declared current image consumed by the comparator');
  }
  if(r.implementation==='missing'||r.verification==='failed')status='NEEDS_WORK';
  else if(r.verification==='unverified'&&status!=='NEEDS_WORK')status='UNVERIFIED';
 }
 return{designReference:{...d,sha256},visualRequirements:manifest.visualRequirements,status};
}
