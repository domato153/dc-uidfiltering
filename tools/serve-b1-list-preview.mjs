import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { buildB1ListPreview } from './build-b1-list-preview.mjs';

const output=await buildB1ListPreview();
const allowed=new Set(['index.html','list.html','presentation.css','host-preview.mjs','fixture-client.js']);
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript'};
const server=createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    const name=pathname==='/'||pathname==='/b1-list/'?'index.html':pathname.replace(/^\/b1-list\//,'');
    if(req.method!=='GET'||!allowed.has(name)){res.writeHead(404);res.end();return;}
    try{const bytes=await readFile(path.join(output,name));res.writeHead(200,{'content-type':types[path.extname(name)],'cache-control':'no-store','content-security-policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; form-action 'none'; base-uri 'none'"});res.end(bytes);}
    catch{res.writeHead(404);res.end();}
});
server.listen(10062,'127.0.0.1',()=>console.log('B1 design preview: http://127.0.0.1:10062/b1-list/index.html'));
