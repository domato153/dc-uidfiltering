import {mkdir,appendFile} from 'node:fs/promises';
import {assert,getMetrics,assertNoRuntimeErrors} from './harness/runner-utils.mjs';
import {mountPopupBatch} from './ui-popup-batch-v7-contract.mjs';
import {mountB1AccountPickerFixture} from './fixtures/b1-account-picker.mjs';
import {mountConditionalChildrenFixture} from './fixtures/b1-conditional-children.mjs';

export const conditionalSpecs=[{width:980,height:900},{width:980,height:900,dark:true},{width:390,height:560,dark:true},{width:980,height:420},{width:980,height:2306}];
const geometry=n=>n.evaluate(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,hits:[.15,.5,.85].map(t=>n.contains(document.elementFromPoint(r.x+r.width*t,r.y+r.height*.5)))}});
export async function conditionalPaint(n){return n.evaluate(n=>{const s=getComputedStyle(n),probe=document.createElement('span');probe.style.cssText='background:var(--dcuf-v7-primary-bg);color:var(--dcuf-v7-primary-ink);border:1px solid var(--dcuf-v7-primary-rim);box-shadow:var(--dcuf-v7-primary-shadow)';n.append(probe);const t=getComputedStyle(probe),keys=['backgroundColor','backgroundImage','color','borderTopColor','boxShadow'],expected=keys.map(k=>t[k]);probe.remove();return{actual:keys.map(k=>s[k]),expected}})}
export async function mountConditional(browser,server,spec){const e=await mountPopupBatch(browser,server,spec,'pickers');await e.page.evaluate(mountB1AccountPickerFixture);await e.page.evaluate(mountConditionalChildrenFixture);await e.page.waitForSelector('#btn__daewangcon[data-dcuf-comment-role]',{state:'attached'});return e}
async function screenshot(page,spec,name,root){const dir=process.env.DCUF_CONDITIONAL_CAPTURE;if(!dir||spec.width!==980||spec.height!==900)return;await mkdir(dir,{recursive:true});await page.mouse.move(0,0);await root.screenshot({path:`${dir}/${spec.dark?'dark':'light'}-${name}.png`,animations:'disabled',timeout:10000});if(name!=='info-disabled')await page.screenshot({path:`${dir}/${spec.dark?'dark':'light'}-${name}-page.png`,animations:'disabled'});}
export async function runConditionalChildren({browser,server},{verify=true,specs=conditionalSpecs}={}){
    const rows=[];
    for(const spec of specs){const e=await mountConditional(browser,server,spec),p=e.page,issues=[];const check=(ok,msg)=>{if(!ok)issues.push(msg)};
        try{
            await p.locator('#focus_cmt .tx_dccon').click();const picker=p.locator('#div_con');await picker.waitFor({state:'visible'});
            for(const state of ['enabled','disabled']){
                await p.evaluate(s=>__conditionalFixture.setInfoState(s),state);const trigger=picker.locator('#btn__daewangcon');await trigger.scrollIntoViewIfNeeded();await trigger.click();
                const info=p.locator('#daewangcon_layer');await info.waitFor({state:'visible'});await info.scrollIntoViewIfNeeded();
                check(await info.getAttribute('data-dcuf-comment-role')==='comment-info','Info has contextual role');
                const close=info.locator('.poply_greyclose');const b=await geometry(info),c=await geometry(close);
                check(c.width>=32&&c.height>=32&&c.x>=b.x&&c.right<=b.right+1&&c.y>=b.y&&c.bottom<=b.bottom+1&&c.hits.every(Boolean),'Info single X has contained positive hit area');
                check(await close.evaluate(n=>getComputedStyle(n).fontSize==='0px'&&getComputedStyle(n,'::before').content!=='none'&&getComputedStyle(n,'::after').content!=='none'),'Info X hides native text and has two strokes');
                check(await info.evaluate(n=>n.scrollWidth-n.clientWidth<=1),'Info has no horizontal overflow');
                check(await info.evaluate(n=>{const r=n.getBoundingClientRect();return[...n.querySelectorAll('.inner')].filter(x=>getComputedStyle(x).display!=='none').every(x=>[...x.querySelectorAll('h3,p')].every(c=>{const q=c.getBoundingClientRect();return q.y>=r.y&&q.bottom<=r.bottom-8}))}),'All visible info copy stays inside its glass frame');
                check(await info.locator('.bigcon-'+(state==='enabled'?'disabled':'enabled')).isHidden(),'Native alternate info state stays hidden');
                await screenshot(p,spec,'info-'+state,info);await close.click();assert.equal(await info.isHidden(),true);
            }
            await p.locator('#focus_cmt .tx_dccon').focus();await p.locator('#focus_cmt .tx_dccon').press('Enter');await picker.waitFor({state:'hidden'});
            const detailTrigger=p.locator('.coment_dccon_info>.div_package');await detailTrigger.click();const detail=p.locator('#package_detail');await p.waitForSelector('#package_detail[data-dcuf-role]');await detail.scrollIntoViewIfNeeded();
            check(await detail.getAttribute('data-dcuf-comment-role')==='comment-detail','Detail has contextual role');
            check(await detail.locator('.pop_head').evaluate(n=>{const s=getComputedStyle(n);return s.borderBottomWidth==='0px'&&getComputedStyle(n.querySelector('h3')).fontSize==='16px'}),'Detail header replaces native border/14px paint in its own context');
            check(await detail.evaluate(n=>n.scrollWidth-n.clientWidth<=1),'Detail does not overflow horizontally');
            const action=detail.locator('.btn_buy');await action.scrollIntoViewIfNeeded();const a=await geometry(action),b=await geometry(detail);const paint=await conditionalPaint(action);
            check(JSON.stringify(paint.actual)===JSON.stringify(paint.expected),'Detail primary consumes paired v7 material');
            check(a.width>=44&&a.width<=90&&a.height>=32&&a.height<=40&&a.hits.every(Boolean)&&a.x>=b.x&&a.right<=b.right+1,'Detail use is content-sized,contained and reachable');
            const heading=await geometry(detail.locator('h4')),summary=await geometry(detail.locator('.info_viewbox'));
            check(heading.right<=a.x+1||heading.bottom<=a.y+1||a.bottom<=heading.y+1,'Detail title and action do not overlap');
            check(await detail.locator('.seller_name a').first().evaluate(n=>{const probe=document.createElement('i');probe.style.color='var(--dcuf-theme-accent-ink, var(--dcuf-comment-accent-strong))';n.append(probe);const ok=getComputedStyle(n).color===getComputedStyle(probe).color;probe.remove();return ok}),'Detail metadata uses theme ink');
            check(await detail.locator('.makeday').evaluate(n=>{const q=document.createElement('i');q.style.color='color-mix(in srgb, var(--dcuf-comment-fg) 75%, var(--dcuf-comment-muted))';n.append(q);const ok=getComputedStyle(n).color===getComputedStyle(q).color;q.remove();return ok}),'Detail secondary metadata uses readable muted ink');
            check(await detail.locator('#package_buy').isHidden()&&await detail.locator('.btn_my_dccon_edit').isHidden(),'Unopened nested purchase/edit stay hidden');
            const media=detail.locator('.popinfo'),scroll=await media.evaluate(n=>({client:n.clientHeight,scroll:n.scrollHeight}));check(scroll.scroll>scroll.client&&scroll.client>40,'Detail media has bounded real scroll');
            check(await detail.locator('.popinfo img').first().evaluate(n=>{const s=getComputedStyle(n);return s.marginTop==='0px'&&s.marginBottom==='0px'&&s.borderTopLeftRadius==='0px'}),'Detail originals are not clipped or displaced by comment-media decoration');
            // Center the native scrolling area using ordinary page scrolling,
            // then scroll its contents to the end;never hide the menu FAB.
            await media.evaluate(n=>{n.scrollIntoView({block:'center'});n.scrollTop=n.scrollHeight});check((await geometry(detail.locator('.popinfo li').last())).hits.every(Boolean),'Last detail media stays reachable through scroll');
            await media.evaluate(n=>n.scrollTop=0);await action.scrollIntoViewIfNeeded();await screenshot(p,spec,'detail',detail);const x=detail.locator('.package_close');await x.scrollIntoViewIfNeeded();check((await geometry(x)).hits.every(Boolean),'Detail original close remains reachable');await x.click();assert.equal(await detail.isHidden(),true);
            await p.locator('.img_area .btn_imgcmt').first().click();const imageTrigger=p.locator('#fixture-image-password-anchor>.btn_img_cmt_delete');
            for(let cycle=0;cycle<2;cycle++){
                await imageTrigger.scrollIntoViewIfNeeded();await imageTrigger.click();const box=p.locator('#img_cmt_delpw_box');await p.waitForSelector('#img_cmt_delpw_box[data-dcuf-role]');await box.scrollIntoViewIfNeeded();
                check(await box.getAttribute('data-dcuf-comment-role')==='comment-password','Image password shares ordinary family');const q=await geometry(box),controls=[];
                for(const s of ['input','.btn_ok','.btn_cmtpw_close'])controls.push(await geometry(box.locator(s)));
                check(controls.every(r=>r.width>0&&r.height>0&&r.x>=q.x&&r.right<=q.right+1&&r.y>=q.y&&r.bottom<=q.bottom+1&&r.hits.every(Boolean)),'Image password field/confirm/X fit and hit');
                check(controls[0].right<=controls[1].x+1&&controls[1].right<=controls[2].x+1,'Image password controls do not overlap');
                const pp=await conditionalPaint(box.locator('.btn_ok'));check(JSON.stringify(pp.actual)===JSON.stringify(pp.expected),'Image password confirm consumes paired v7 material');
                assert.equal(await box.locator('input').inputValue(),'');await box.locator('input').fill('synthetic-test-only');
                assert.equal(await box.getAttribute('re_no'),'synthetic');assert.equal(await box.getAttribute('c_mode'),'del');assert.ok((await box.getAttribute('style')).includes('-242px'));
                if(!cycle)await screenshot(p,spec,'image-password',box);await box.locator('.btn_img_cmtpw_close').click();assert.equal(await box.count(),0);
            }
            const semantic=await p.evaluate(()=>({calls:__conditionalFixture.calls,identity:__conditionalFixture.originals.every(({node,parent,handler})=>node.parentNode===parent&&node.onclick===handler),cycles:__conditionalFixture.cycles.map(c=>c.every(({node,parent,handler})=>node.parentNode===parent&&node.onclick===handler)),infoHidden:getComputedStyle(document.querySelector('#daewangcon_layer')).display==='none',purchaseHidden:getComputedStyle(document.querySelector('#package_buy')).display==='none',media:[...document.querySelectorAll('#package_detail img')].map(n=>[n.getAttribute('src'),n.getAttribute('alt')]),actionLabels:[...document.querySelectorAll('#package_detail button')].map(n=>n.textContent.trim()),passwordRemoved:!document.querySelector('#img_cmt_delpw_box')}));
            assert.equal(semantic.identity,true);assert.deepEqual(semantic.cycles,[true,true]);assert.equal(semantic.calls.some(x=>/synthetic-(?:use|edit|image-confirm)/.test(x)),false);assertNoRuntimeErrors(await getMetrics(p),e.consoleErrors);
            const row={id:`${spec.width}-${spec.height}-${spec.dark?'dark':'light'}`,issues,summary,scroll,semantic};rows.push(row);if(process.env.DCUF_CONDITIONAL_OBSERVATIONS)await appendFile(process.env.DCUF_CONDITIONAL_OBSERVATIONS,JSON.stringify(row)+'\n');
        }finally{await e.close()}
    }
    if(verify)assert.equal(rows.filter(r=>r.issues.length).length,0,JSON.stringify(rows.map(({id,issues})=>({id,issues}))));return rows;
}
