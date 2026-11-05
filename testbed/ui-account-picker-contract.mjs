import {mkdir,appendFile} from 'node:fs/promises';
import {assert,getMetrics,assertNoRuntimeErrors} from './harness/runner-utils.mjs';
import {mountPopupBatch} from './ui-popup-batch-v7-contract.mjs';
import {mountB1AccountPickerFixture} from './fixtures/b1-account-picker.mjs';

export const accountPickerSpecs=[{width:980,height:900},{width:980,height:900,dark:true},{width:390,height:560,dark:true},{width:980,height:420},{width:980,height:2306}];
async function geometry(control){return control.evaluate(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,display:s.display,fontSize:s.fontSize,hits:[.1,.5,.9].map(p=>n.contains(document.elementFromPoint(r.x+r.width*p,r.y+r.height*.5)))}})}
async function capture(page,spec,name){const dir=process.env.DCUF_ACCOUNT_CAPTURE;if(!dir)return;await mkdir(dir,{recursive:true});await page.mouse.move(0,0);await page.screenshot({path:`${dir}/${spec.width}-${spec.height}-${spec.dark?'dark':'light'}-${name}.png`,animations:'disabled'});}
async function paintPair(control){return control.evaluate(n=>{const s=getComputedStyle(n),q=document.createElement('span');q.style.cssText='background:var(--dcuf-v7-primary-bg);color:var(--dcuf-v7-primary-ink);border:1px solid var(--dcuf-v7-primary-rim);box-shadow:var(--dcuf-v7-primary-shadow)';n.append(q);const t=getComputedStyle(q),keys=['backgroundColor','backgroundImage','color','borderTopColor','borderTopWidth','boxShadow'],expected=keys.map(k=>t[k]);q.remove();return{actual:keys.map(k=>s[k]),expected}})}

export async function runAccountPickerContract({browser,server},{verify=true,specs=accountPickerSpecs}={}){
    const records=[],failures=[];
    for(const spec of specs){
        const e=await mountPopupBatch(browser,server,spec,'pickers'),page=e.page;
        const issues=[];let diagnosticControls=0;const check=(condition,message)=>{if(!condition)issues.push(message)};
        const select=async control=>{await control.scrollIntoViewIfNeeded();const hit=(await geometry(control)).hits.every(Boolean);check(hit,'Original management select/option must be hit-testable');if(hit)await control.click();else{diagnosticControls++;await control.evaluate(n=>n.onclick())}};
        try{
            await page.evaluate(mountB1AccountPickerFixture);
            await page.waitForSelector('#btn__daewangcon[data-dcuf-comment-role]',{state:'attached'});
            const trigger=page.locator('#focus_cmt .tx_dccon');await trigger.click();
            const root=page.locator('#div_con');await root.waitFor({state:'visible'});
            await page.waitForFunction(()=>[...document.querySelectorAll('#div_con img')].every(n=>n.complete&&n.naturalWidth>0));
            await page.mouse.move(0,0);
            const toolbar=await geometry(root.locator('.doublecon_wrap')),pack=await geometry(root.locator('.dccon_tab_btnbox'));
            const actions=await Promise.all(['#btn__daewangcon','.btn_dccon_hot','.btn_dccon_setting'].map(s=>geometry(root.locator(s))));
            check(actions.every(a=>a.bottom<=toolbar.bottom+1&&a.y>=toolbar.y-1&&a.hits.every(Boolean)),'Account toolbar actions must fit their reserved band and be hit-testable');
            const options=await Promise.all(['#double_dcon','#bkmark'].map(s=>geometry(root.locator(s))));
            check(options.every(o=>o.width>0&&o.height>0&&o.hits.every(Boolean)),'Original double/favorite mode hit areas remain reachable');
            check(pack.y>=toolbar.bottom+8,'Pack strip must follow the complete toolbar with separation');
            const star=root.locator('.list_1 .btn_starmark').first(),item=root.locator('.list_1.list_li').first();
            const resting=await geometry(star);check(resting.display==='none','Native favorite stays hidden at rest');
            await item.hover();const hovered=await geometry(star);
            check(hovered.width===24&&hovered.height===24&&hovered.fontSize==='0px'&&hovered.hits.every(Boolean),'Native favorite retains its contained sprite action on hover');
            await star.click();await page.mouse.move(0,0);await trigger.focus();
            check((await geometry(star)).display!=='none','Native selected favorite remains visible');
            await star.click();await page.mouse.move(0,0);await trigger.focus();
            await item.locator('.img_dccon').focus();check((await geometry(star)).display!=='none','Keyboard focus exposes the corresponding favorite action');
            await trigger.focus();await page.mouse.move(0,0);
            check(await root.locator('#favoriteFolderLayer').isHidden(),'Unopened original folder remains hidden');
            await capture(page,spec,'account');

            const management=root.locator('.btn_dccon_setting'),managementGeometry=await geometry(management);
            const diagnosticOpen=!managementGeometry.hits.every(Boolean);
            if(diagnosticOpen)await management.evaluate(n=>n.onclick());else await management.click();
            // Only the deliberately failing frozen control may need diagnostic
            // opening;the preceding positive hit assertion still fails it.
            const setting=root.locator('.setting');await setting.waitFor({state:'visible'});
            const table=root.locator('#setting_use .dccon_storage_table');check(await table.locator('th').count()===5,'All original used-management columns remain');
            const containment=await root.evaluate(n=>({overflow:n.scrollWidth-n.clientWidth,scrolls:n.querySelector('.setting .scrolls').scrollWidth-n.querySelector('.setting .scrolls').clientWidth}));
            check(containment.overflow<=1,'Management table must not widen its picker');
            for(const checkbox of[table.locator('.package_check').first(),table.locator('.package_check').last()]){await checkbox.scrollIntoViewIfNeeded();check((await geometry(checkbox)).hits.every(Boolean),'First/last native package checkbox remains reachable after scrolling')}
            await setting.locator('#setting_use').evaluate(n=>n.scrollLeft=n.scrollWidth);const drag=table.locator('.handle').last();await drag.scrollIntoViewIfNeeded();check((await geometry(drag)).hits.every(Boolean),'Original final-column drag cell is reachable after horizontal scroll');
            await select(setting.locator('.select_area'));await select(setting.locator('[data-value="notuse"]'));
            check(await setting.locator('#setting_use').isHidden()&&await setting.locator('#setting_notuse').isVisible(),'Original use/notuse selection changes only its visible pane');
            check(await setting.locator('#setting_notuse th').count()===6,'Original unused table retains all six columns');
            check(await root.evaluate(n=>n.scrollWidth-n.clientWidth)<=1,'Unused/empty table remains within its picker');
            await select(setting.locator('.select_area'));await select(setting.locator('[data-value="use"]'));
            await setting.locator('#setting_use').evaluate(n=>{n.scrollTop=0;n.scrollLeft=0});
            const save=setting.locator('.submit');await save.scrollIntoViewIfNeeded();await save.focus();
            const savePaint=await paintPair(save);check(JSON.stringify(savePaint.actual)===JSON.stringify(savePaint.expected),'Management save consumes paired v7 material');
            check((await geometry(save)).hits.every(Boolean),'Management save remains reachable after original scroll');
            const quiet=await setting.locator('.close').evaluate(n=>({background:getComputedStyle(n).backgroundColor,shadow:getComputedStyle(n).boxShadow,border:getComputedStyle(n).borderTopWidth,radius:getComputedStyle(n).borderTopLeftRadius}));
            check(quiet.background==='rgba(0, 0, 0, 0)'&&quiet.shadow==='none'&&quiet.border==='0px'&&quiet.radius==='8px','Management cancel stays a quiet auxiliary');
            await capture(page,spec,'management');await setting.locator('.close').click();
            check(await setting.isHidden()&&await root.locator('.dcconlist').isVisible(),'Original management close returns to packs');
            await trigger.focus();await trigger.press('Enter');await root.waitFor({state:'hidden'});

            const passwordTrigger=page.locator('#fixture-password-anchor>.btn_cmt_delete');await passwordTrigger.click();
            const password=page.locator('#cmt_delpw_box');await page.waitForSelector('#cmt_delpw_box[data-dcuf-role="native-comment-popup"]',{state:'visible'});
            check(await password.evaluate(n=>document.activeElement===n.querySelector('input')),'Original password input receives focus on open');
            check(await page.evaluate(()=>__b1AccountFixture.passwordCycles.at(-1).every(({node,parent,handler})=>node.isConnected&&node.parentNode===parent&&node.onclick===handler)),'Dynamically created password controls retain identity/parents/handlers');
            await password.scrollIntoViewIfNeeded();
            const passwordBox=await geometry(password),fields=await Promise.all(['.cmt_delpw','.btn_ok','.btn_cmtpw_close'].map(s=>geometry(password.locator(s))));
            check(fields.every(c=>c.x>=passwordBox.x&&c.right<=passwordBox.right+1&&c.y>=passwordBox.y&&c.bottom<=passwordBox.bottom+1&&c.hits.every(Boolean)),'Password field/confirm/X must be contained and reachable');
            check(await password.evaluate(n=>n.scrollWidth-n.clientWidth)<=1,'Compact password root has no horizontal overflow');
            const passwordPaint=await paintPair(password.locator('.btn_ok'));check(JSON.stringify(passwordPaint.actual)===JSON.stringify(passwordPaint.expected),'Password confirm consumes paired v7 material');
            await page.mouse.move(0,0);const closePaint=await password.locator('.btn_cmtpw_close').evaluate(n=>{const s=getComputedStyle(n),r=n.getBoundingClientRect();return{background:s.backgroundColor,image:s.backgroundImage,strokes:['::before','::after'].map(p=>{const a=getComputedStyle(n,p),m=new DOMMatrix(a.transform);return{centerX:parseFloat(a.left)+parseFloat(a.width)/2+m.e,centerY:parseFloat(a.top)+parseFloat(a.height)/2+m.f,angle:m.b}}),width:r.width,height:r.height}});
            check(closePaint.background==='rgba(0, 0, 0, 0)'&&closePaint.image==='none'&&closePaint.strokes.every(s=>Math.abs(s.centerX-closePaint.width/2)<.6&&Math.abs(s.centerY-closePaint.height/2)<.6)&&closePaint.strokes[0].angle*closePaint.strokes[1].angle<0,'Password close is quiet with two centered crossing strokes');
            check(await password.locator('input').inputValue()==='','Password input stays empty during appearance inspection');
            await capture(page,spec,'password');await password.locator('.btn_cmtpw_close').click();await passwordTrigger.click();await password.waitFor({state:'visible'});
            check(await password.evaluate(n=>document.activeElement===n.querySelector('input')),'Original password input receives focus on reopen');
            check(await page.evaluate(()=>__b1AccountFixture.passwordCycles.at(-1).every(({node,parent,handler})=>node.isConnected&&node.parentNode===parent&&node.onclick===handler)),'Reopened password controls retain original identity/parents/handlers');
            await password.locator('.btn_cmtpw_close').click();
            const semantic=await page.evaluate(()=>({identity:__b1AccountFixture.originals.every(({node,parent,handler})=>node.isConnected&&node.parentNode===parent&&node.onclick===handler),calls:__b1AccountFixture.calls,checked:[...__b1AccountFixture.setting.querySelectorAll('.package_check')].map(n=>n.checked),columns:[...__b1AccountFixture.setting.querySelectorAll('#setting_use th')].map(n=>n.textContent),list:__b1AccountFixture.setting.querySelector('input[name="list"]').value,passwordCycles:__b1AccountFixture.passwordCycles.map(c=>c.every(({node,parent,handler})=>!node.isConnected&&node.parentNode===parent&&node.onclick===handler)),passwordRemoved:!document.querySelector('#cmt_delpw_box'),folderHidden:getComputedStyle(document.querySelector('#favoriteFolderLayer')).display==='none'}));
            assert.equal(semantic.identity,true);assert.equal(semantic.passwordRemoved,true);
            assert.deepEqual(semantic.checked,[true,false,false,false,false,false,false,false]);assert.deepEqual(semantic.columns,['사용','디시콘명','제작자','구분','순서']);assert.equal(semantic.list,'use');assert.deepEqual(semantic.passwordCycles,[true,true]);
            assert.deepEqual(semantic.calls,['synthetic-star','synthetic-star','management-open','filter-open','filter-notuse','filter-open','filter-use','management-close','password-open','password-close','password-open','password-close']);
            assert.equal(semantic.calls.some(c=>/save|confirm/.test(c)),false,'No synthetic save/confirm during inspection');
            assertNoRuntimeErrors(await getMetrics(page),e.consoleErrors);
            const record={id:`${spec.width}-${spec.height}-${spec.dark?'dark':'light'}`,issues,toolbar,actions,containment,diagnosticOpen,diagnosticControls,passwordBox,semantic};records.push(record);
            if(process.env.DCUF_ACCOUNT_OBSERVATIONS)await appendFile(process.env.DCUF_ACCOUNT_OBSERVATIONS,JSON.stringify(record)+'\n');
            if(verify&&issues.length)failures.push({id:record.id,issues});
        }finally{await e.close()}
    }
    assert.equal(failures.length,0,JSON.stringify(failures));return records;
}
