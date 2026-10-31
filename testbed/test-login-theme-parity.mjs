import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const index=process.argv.indexOf('--control-directory');assert.ok(index>=0,'bind an explicit preserved control source directory');const dir=process.argv[index+1];
const read=async p=>(await fs.readFile(p,'utf8')).replaceAll('\r\n','\n');
const currentTheme=await read('src/targets/shared/theme-presenter.js'),currentHost=await read('src/targets/mobile/theme-host-style.js');
const primitive=await read('src/shared/theme-primitives.js'),material=await read('src/targets/mobile/theme-material-values.js');
const oldTheme=await read(dir+'/control-theme-presenter.js'),oldHost=await read(dir+'/control-theme-host-style.js');
const targetCss=(source,prelude='')=>{
 const context={};for(const m of source.matchAll(/(__dcuf(?:Build|Describe)\w+)\(/g))if(!['__dcufBuildB1MaterialCss','__dcufBuildTargetThemeCss'].includes(m[1]))context[m[1]]=()=>m[1].startsWith('__dcufDescribe')?{}:`HEADER_SLOT_${m[1]}`;
 vm.runInNewContext(prelude+'\n'+source+'\nglobalThis.result=__dcufBuildTargetThemeCss("data-dcuf-palette");',context);return context.result;
};
const expectedTarget=targetCss(oldHost),actualTarget=targetCss(currentHost,material);assert.equal(actualTarget,expectedTarget,'Mobile target CSS changed while lifting material values');
function themeCss(source,target,prelude=''){
 let css='';const root={setAttribute(){}};const mount={appendChild(n){css=n.textContent;}};
 const host={findAnchor:name=>name==='root'?root:mount,invokeNative:(name)=>name==='create-element'?{}:name==='get-by-id'?null:undefined};
 const ctx={__dcufThemeHost:host,__dcufBuildTargetThemeCss:()=>target,__dcufSettingsPresenter:{PALETTE_CSS:'SETTINGS_CSS_SENTINEL'},DCUF_UI_CONTRACTS:{UI_INTENT_TYPES:{PALETTE_LOAD:'load'}},__dcufUiPort:{dispatch:async()=>({ok:true,committedSnapshot:{palette:{value:'blue'}}}),getSnapshot:()=>({palette:{value:'blue'}})},console};
 vm.runInNewContext(prelude+'\n'+source+'\nglobalThis.presets=ThemeModule.PRESETS;globalThis.norm=[null,"wrong","teal",7].map(ThemeModule.normalize);',ctx);
 return {css,presets:JSON.stringify(ctx.presets),normalize:JSON.stringify(ctx.norm)};
}
assert.deepEqual(themeCss(currentTheme,actualTarget,primitive),themeCss(oldTheme,expectedTarget),'Mobile full mounted theme/presets changed');
assert.deepEqual(themeCss(currentTheme,'',primitive),themeCss(oldTheme,''),'PC full mounted theme/presets changed');
console.log('Theme lift: exact Mobile target CSS, Mobile/PC full mounted CSS,14 presets and normalization preserved.');
