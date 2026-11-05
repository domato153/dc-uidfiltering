import {readFile} from 'node:fs/promises';
const base=new URL('./',import.meta.url);
const [body,css]=await Promise.all(['login-native.html','login-native.css'].map(p=>readFile(new URL(p,base),'utf8')));
export function loginFixtureHtml({broken=false,nativeDark=false,disposeEarly=false,rejectPending=false}={}) {
 const html=broken?body.replace('name="pw"','name="unsupported_password"'):body;
 return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${css}</style>${nativeDark?'<style id="css-darkmode"></style>':''}</head><body>${html}<script>
 window.__loginCalls=[];
 window.login_submit=function(){window.__loginCalls.push({id:document.getElementById('id').value,password:document.getElementById('pw').value});return false;};
 const f=document.querySelector('.login_inputbox form');
 document.getElementById('id').value='synthetic-existing-id';
 document.getElementById('pw').value='synthetic-existing-password';
 window.__loginOriginal={form:f,nodes:[...f.elements],parents:[...f.elements].map(n=>n.parentNode),html:f.innerHTML,submit:f.onsubmit,action:f.getAttribute('action'),method:f.getAttribute('method')};
 ${disposeEarly?'window.__dcufLoginController.dispose();':''}
 ${rejectPending?"window.GM_getValue=()=>new Promise((resolve,reject)=>{window.__rejectLoginRead=()=>reject(Error('synthetic delayed rejection'));});":''}
 </script></body></html>`;
}
