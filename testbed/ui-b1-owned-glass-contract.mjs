import {assert,createTestPage,storageKeys,getMetrics,assertNoRuntimeErrors} from './harness/runner-utils.mjs';
import {mountB1NativeFixture} from './fixtures/b1-native-list.mjs';
import {renderedLabelContrast} from './ui-control-material-contract.mjs';

async function gutterColor(page,bytes) {
    return page.evaluate(async data=>{
        const image=new Image();image.src=data;await image.decode();
        const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
        const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
        return [...ctx.getImageData(6,Math.floor(image.height/2),1,1).data];
    },'data:image/png;base64,'+bytes.toString('base64'));
}

export async function runOwnedGlassContract({browser,server}) {
    const records=[];
    for(const dark of [false,true]){
        const e=await createTestPage(browser,server.baseUrl,{viewport:{width:980,height:900},storage:{
            [storageKeys.threshold]:0,[storageKeys.palette]:'teal',[storageKeys.personalEnabled]:true,
            [storageKeys.personalList]:{uids:[],nicknames:[],ips:[]}}});
        try{
            await mountB1NativeFixture(e,server.baseUrl,{dark});
            await e.page.evaluate(()=>window.__dcufTestbedGM.invokeMenu('차단 유저 관리'));
            const panel=e.page.locator('#dc-block-management-panel');await panel.waitFor({state:'visible'});
            await panel.evaluate(async n=>Promise.all(n.getAnimations({subtree:true}).filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));
            const before=await e.page.evaluate(()=>window.__dcufTestbedGM.snapshot().values);
            // Neutral witness is below the real modal scrim. Above-scrim color
            // plates cannot qualify normal modal material.
            const order=await panel.evaluate(n=>{
                const overlay=document.querySelector('#dc-block-management-panel-overlay');
                const backing=document.createElement('div');backing.id='dcuf-neutral-backing-witness';
                backing.setAttribute('aria-hidden','true');backing.style.cssText='position:fixed;inset:0;pointer-events:none;background:#e6e9e8;z-index:'+(Number(getComputedStyle(overlay).zIndex)-1);
                overlay.before(backing);
                return {underScrim:Number(getComputedStyle(backing).zIndex)<Number(getComputedStyle(overlay).zIndex),outsideHit:document.elementFromPoint(2,2)===overlay};
            });
            assert.deepEqual(order,{underScrim:true,outsideHit:true},'Witness must preserve actual modal dimming and pointer blocking');
            const light=await gutterColor(e.page,await panel.screenshot({animations:'disabled'}));
            await e.page.locator('#dcuf-neutral-backing-witness').evaluate(n=>n.style.background='#74817f');
            const muted=await gutterColor(e.page,await panel.screenshot({animations:'disabled'}));
            const transmitted=Math.max(...light.slice(0,3).map((v,i)=>Math.abs(v-muted[i])));
            assert.ok(transmitted>=12,'Ordinary neutral brightness must transmit through the actual scrim and panel: '+JSON.stringify({dark,light,muted,transmitted}));
            await e.page.locator('#dcuf-neutral-backing-witness').evaluate(n=>n.remove());
            const geometry=await panel.evaluate(n=>{
                const r=n.getBoundingClientRect(),s=getComputedStyle(n),close=n.querySelector('.dcuf-icon-button'),c=close.getBoundingClientRect();
                return {width:r.width,height:r.height,overflow:n.scrollWidth-n.clientWidth,backdrop:s.backdropFilter,closeWidth:c.width,closeHeight:c.height,closeHit:close.contains(document.elementFromPoint(c.x+c.width/2,c.y+c.height/2))};
            });
            assert.equal(geometry.overflow,0);assert.ok(geometry.backdrop.includes('blur'));assert.ok(geometry.closeWidth>=44&&geometry.closeHeight>=44&&geometry.closeHit);
            const titleContrast=await renderedLabelContrast(e.page,'#dc-block-management-panel .dcuf-panel-title');
            assert.ok(titleContrast.min>=4.5,'Panel title stays readable on actual normal backing: '+JSON.stringify({dark,titleContrast}));
            await panel.locator('.panel-close-btn').click();await panel.waitFor({state:'detached'});
            assert.deepEqual(await e.page.evaluate(()=>window.__dcufTestbedGM.snapshot().values),before,'Inspection and close preserve saved settings');
            assertNoRuntimeErrors(await getMetrics(e.page),e.consoleErrors);
            records.push({dark,transmitted,geometry,titleContrast});
        }finally{await e.close()}
    }
    console.log('Owned glass neutral/scrim checks',JSON.stringify(records));return {contexts:records.length,records};
}
