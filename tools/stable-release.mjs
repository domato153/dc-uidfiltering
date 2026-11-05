import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

export const repository='domato153/dc-uidfiltering';
export const development='codex/ui-port-boundary';
export const sitePaths=['README.md','index.html','style.css',...['menu-detail.png','menu.png','mobile-article.png','mobile-list.png','mobile-write.png','palette.png','pc-backup.png','pc-filter.png','pc-management.png'].map(n=>'assets/'+n)];
export const digest=b=>createHash('sha256').update(b).digest('hex').toUpperCase();
// Git stores userscripts as LF; both canonical builders emit BOM+CRLF.
// Restore only that documented transport encoding,without executing source.
export const sourcePayloadBytes=(name,b)=>name.endsWith('.user.js')?Buffer.from(b.toString('utf8').replace(/\r?\n/g,'\r\n'),'utf8'):b;
export function validateSpec(s) {
 assert.equal(s.schemaVersion,1);
 for(const sha of [s.sourceSha,s.expectedHeads?.main,s.expectedHeads?.mobile])assert.match(sha,/^[0-9a-f]{40}$/);
 for(const target of ['mobile','pc']) {assert.match(s[target]?.version,/^\d\.\d\.\d$/);assert.match(s[target]?.sha256,/^[A-F0-9]{64}$/);}
 assert.equal(s.canary?.result,'PASS');assert.equal(s.canary?.artifactSha256,s.mobile.sha256);
 assert.ok(s.canary.scope?.trim().length>=20);assert.match(String(s.checkpointRunId),/^\d+$/);
 return s;
}
export function releaseFiles(s) {validateSpec(s);return {mobile:`Dc_UserFilter_Mobile_v${s.mobile.version}.user.js`,pc:`dcinside_user_filter_v${s.pc.version}.user.js`};}
export function validateBundle(s,entries,manifest) {
 const names=releaseFiles(s),expected=[...Object.values(names),...sitePaths,'RELEASE_NOTES.md'];
 assert.deepEqual(Object.keys(entries).sort(),expected.sort(),'Only explicit release/site payloads are allowed');
 assert.equal(manifest.sourceSha,s.sourceSha);
 for(const name of expected)assert.equal(digest(entries[name]),manifest.files[name],`Payload mismatch: ${name}`);
 assert.deepEqual(Object.keys(manifest.files).sort(),expected.sort());
 for(const target of ['mobile','pc']) {
  const bytes=entries[names[target]];assert.equal(digest(bytes),s[target].sha256);
  assert.equal(bytes.toString().match(/^\/\/ @version\s+([^\r\n]+)/m)?.[1].trim(),s[target].version);
 }
 assert.ok(entries['RELEASE_NOTES.md'].toString().trim().length>30);
 for(const file of ['README.md','index.html'])for(const target of ['mobile','pc'])assert.ok(entries[file].toString().includes(s[target].version),`${file} lacks ${target} version`);
 return names;
}
function run(command,args,{cwd,input,binary=false}={}) {
 const r=spawnSync(command,args,{cwd,input,encoding:binary?null:'utf8',maxBuffer:32*1024*1024});
 assert.equal(r.status,0,r.stderr?.toString()||`${command} failed`);return binary?r.stdout:r.stdout.trim();
}
function api(endpoint,{method='GET',body}={}) {
 const output=run('gh',['api','--method',method,`repos/${repository}/${endpoint}`,...(body?['--input','-']:[])],{input:body?JSON.stringify(body):undefined});
 return output?JSON.parse(output):null;
}
const head=branch=>api(`git/ref/heads/${branch}`).object.sha;
async function readBundle(dir,s) {
 const names=releaseFiles(s),entries={};
 for(const file of [...Object.values(names),...sitePaths,'RELEASE_NOTES.md'])entries[file]=await fs.readFile(path.join(dir,file));
 const manifest=JSON.parse(await fs.readFile(path.join(dir,'release-manifest.json')));
 validateBundle(s,entries,manifest);return {entries,manifest,names};
}
async function prepare(s,source,dir) {
 assert.equal(run('git',['rev-parse','HEAD'],{cwd:source}),s.sourceSha);
 assert.equal(head(development),s.sourceSha,'Source branch moved');
 assert.equal(head('main'),s.expectedHeads.main,'main moved');assert.equal(head('Mobile'),s.expectedHeads.mobile,'Mobile moved');
 const ci=JSON.parse(run('gh',['run','view',String(s.checkpointRunId),'--repo',repository,'--json','headSha,conclusion,workflowName,event']));
 assert.equal(ci.headSha,s.sourceSha);assert.equal(ci.conclusion,'success');assert.equal(ci.workflowName,'DCUF development CI');assert.equal(ci.event,'push');
 const names=releaseFiles(s),entries={};
 for(const name of [...Object.values(names),...sitePaths])entries[name]=await fs.readFile(path.join(source,name));
 entries['RELEASE_NOTES.md']=await fs.readFile(path.join(source,`docs/releases/mobile-${s.mobile.version}-pc-${s.pc.version}.md`));
 const manifest={schemaVersion:1,sourceSha:s.sourceSha,files:Object.fromEntries(Object.entries(entries).map(([n,b])=>[n,digest(b)]))};
 validateBundle(s,entries,manifest);
 for(const [name,bytes]of Object.entries(entries)){await fs.mkdir(path.dirname(path.join(dir,name)),{recursive:true});await fs.writeFile(path.join(dir,name),bytes);}
 await fs.writeFile(path.join(dir,'release-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 await fs.writeFile(path.join(dir,'SHA256SUMS.txt'),Object.values(names).map(name=>`${digest(entries[name])}  ${name}\n`).join(''));
 console.log('PREPARED: exact Mobile,PC and site payloads;no official writes');
}
function stageTree(base,files,message) {
 const tree=api('git/trees',{method:'POST',body:{base_tree:api(`git/commits/${base}`).tree.sha,tree:files.map(([name,bytes])=>({path:name,mode:'100644',type:'blob',sha:api('git/blobs',{method:'POST',body:{content:bytes.toString('base64'),encoding:'base64'}}).sha}))}});
 return api('git/commits',{method:'POST',body:{message,tree:tree.sha,parents:[base]}}).sha;
}
async function publish(s,dir,control) {
 assert.equal(process.env.PUBLISH_CONFIRMATION,'PUBLISH');
 assert.equal(process.env.GITHUB_REF,'refs/heads/main');assert.equal(process.env.GITHUB_SHA,s.expectedHeads.main);
 assert.equal(run('git',['rev-parse','HEAD'],{cwd:control}),s.expectedHeads.main);
 const {entries,names}=await readBundle(dir,s);
 // Independently bind the downloaded payload to exact source Git objects. Never
 // execute candidate code with write credentials or trust its manifest alone.
 run('git',['fetch','origin',s.sourceSha],{cwd:control});
 for(const [name,bytes]of Object.entries(entries)) {
  const sourcePath=name==='RELEASE_NOTES.md'?`docs/releases/mobile-${s.mobile.version}-pc-${s.pc.version}.md`:name;
  assert.equal(digest(sourcePayloadBytes(name,run('git',['show',`${s.sourceSha}:${sourcePath}`],{cwd:control,binary:true}))),digest(bytes),`Source mismatch: ${name}`);
 }
 const checksum=Object.values(names).map(name=>`${digest(entries[name])}  ${name}\n`).join('');
 assert.equal(await fs.readFile(path.join(dir,'SHA256SUMS.txt'),'utf8'),checksum);
 assert.equal(head(development),s.sourceSha);assert.equal(head('main'),s.expectedHeads.main);assert.equal(head('Mobile'),s.expectedHeads.mobile);
 const mainFiles=sitePaths.map(n=>[n,entries[n]]);mainFiles.push(['dcinside_user_filter.user.js',entries[names.pc]],[names.pc,entries[names.pc]]);
 const mobileFiles=sitePaths.filter(n=>n==='README.md'||n.startsWith('assets/')).map(n=>[n,entries[n]]);mobileFiles.push(['Dc_UserFilter_Mobile.user.js',entries[names.mobile]],[names.mobile,entries[names.mobile]]);
 const mainCommit=stageTree(s.expectedHeads.main,mainFiles,`release: PC ${s.pc.version} and v7 distribution site`);
 const mobileCommit=stageTree(s.expectedHeads.mobile,mobileFiles,`release: Mobile ${s.mobile.version}`);
 const tag=`mobile-v${s.mobile.version}`,title=`Mobile ${s.mobile.version} · PC ${s.pc.version}`;
 const releases=api('releases?per_page=100'),existing=releases.find(r=>r.tag_name===tag);
 assert.ok(!existing||existing.draft,'Published version cannot be overwritten');
 const payload={tag_name:tag,target_commitish:mobileCommit,name:title,body:entries['RELEASE_NOTES.md'].toString(),draft:true,prerelease:false};
 const release=existing?api(`releases/${existing.id}`,{method:'PATCH',body:payload}):api('releases',{method:'POST',body:payload});
 const stageName=`release-staging/combined-${s.mobile.version}`;
 for(const [suffix,sha]of [['main',mainCommit],['mobile',mobileCommit]])api('git/refs',{method:'POST',body:{ref:`refs/heads/${stageName}-${suffix}`,sha}});
 run('gh',['release','upload',tag,...Object.values(names).map(n=>path.join(dir,n)),path.join(dir,'SHA256SUMS.txt'),'--clobber','--repo',repository]);
 async function verifyAssets(draft) {
  const r=api(`releases/${release.id}`);assert.equal(r.draft,draft);
  const checks=[...Object.values(names),'SHA256SUMS.txt'];
  for(const name of checks){const asset=r.assets.find(a=>a.name===name);assert.ok(asset,`Missing asset ${name}`);const bytes=run('gh',['api','-H','Accept: application/octet-stream',`repos/${repository}/releases/assets/${asset.id}`],{binary:true});assert.equal(digest(bytes),digest(await fs.readFile(path.join(dir,name))),`Downloaded asset mismatch ${name}`);}
 }
 await verifyAssets(true);
 // Each commit has exactly the expected official head as its sole parent.
 // Non-force atomic push rejects concurrent changes to either branch.
 assert.equal(head('main'),s.expectedHeads.main);assert.equal(head('Mobile'),s.expectedHeads.mobile);
 for(const sha of [mainCommit,mobileCommit])run('git',['fetch','origin',sha],{cwd:control});
 run('git',['push','--atomic','origin',`${mainCommit}:refs/heads/main`,`${mobileCommit}:refs/heads/Mobile`],{cwd:control});
 assert.equal(head('main'),mainCommit);assert.equal(head('Mobile'),mobileCommit);
 const canonical=async(branch,name,expected)=>{const meta=api(`contents/${name}?ref=${branch}`),blob=api(`git/blobs/${meta.sha}`);assert.equal(digest(Buffer.from(blob.content.replace(/\s/g,''),'base64')),expected);};
 await canonical('Mobile','Dc_UserFilter_Mobile.user.js',s.mobile.sha256);await canonical('main','dcinside_user_filter.user.js',s.pc.sha256);
 for(const [name,bytes]of mainFiles.filter(([n])=>sitePaths.includes(n)))await canonical('main',name,digest(bytes));
 for(const [name,bytes]of mobileFiles.filter(([n])=>n==='README.md'||n.startsWith('assets/')))await canonical('Mobile',name,digest(bytes));
 assert.ok(!run('git',['ls-remote','origin',`refs/tags/${tag}`],{cwd:control}),'Existing tag must not be moved');
 api('git/refs',{method:'POST',body:{ref:`refs/tags/${tag}`,sha:mobileCommit}});
 api(`releases/${release.id}`,{method:'PATCH',body:{draft:false,make_latest:'true'}});
 await verifyAssets(false);assert.equal(api(`git/ref/tags/${tag}`).object.sha,mobileCommit);
 const receipt={status:'PUBLISHED',sourceSha:s.sourceSha,mainCommit,mobileCommit,tag,mobile:s.mobile,pc:s.pc,releaseUrl:api(`releases/${release.id}`).html_url};
 await fs.writeFile(path.join(dir,'publication-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
 for(const suffix of ['main','mobile'])api(`git/refs/heads/${stageName}-${suffix}`,{method:'DELETE'});
 console.log(JSON.stringify(receipt,null,2));
}
export async function main() {
 const s=validateSpec(JSON.parse(process.env.RELEASE_SPEC||'null'));
 const mode=process.argv[2],dir=path.resolve(process.env.STAGING_DIR||'release-preparation');
 if(mode==='prepare')return prepare(s,path.resolve(process.env.SOURCE_DIR||'.'),dir);
 assert.equal(mode,'publish');return publish(s,dir,path.resolve(process.env.CONTROL_DIR||'.'));
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await main();
