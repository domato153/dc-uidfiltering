import { mkdir } from 'node:fs/promises';
import { assert, createTestPage, storageKeys, assertNoRuntimeErrors, getMetrics } from './harness/runner-utils.mjs';
import { mountB1ContentFixture } from './fixtures/b1-content.mjs';
import { mountB1NativeFixture } from './fixtures/b1-native-list.mjs';

export async function runB1ContentContract({browser,server}) {
    const records=[];
    for(const [width,height,dark] of [[980,900,false],[980,900,true],[390,900,false],[390,520,true],[980,2306,false]]) {
        const e=await createTestPage(browser,server.baseUrl,{viewport:{width,height},storage:{[storageKeys.threshold]:0,[storageKeys.palette]:'teal'}});
        try {
            await e.page.emulateMedia({reducedMotion:'reduce'});
            await e.page.route(url=>url.origin===server.baseUrl&&url.pathname==='/board/view',async route=>{
                const response=await route.fetch();let html=await response.text();
                html=html.replace(/<body\b[^>]*>/,match=>match+'<div class="dcwrap width1160">').replace('</body>','</div></body>');
                await route.fulfill({response,body:html});
            });
            await e.goto('/board/view?id=test&no=1001&comments=4&header=1');
            await e.page.evaluate(mountB1ContentFixture);
            if(dark)await e.page.evaluate(()=>window.__dcufFixture.toggleDark(true));
            await e.page.waitForSelector('#div_txtcon[data-dcuf-role="native-comment-popup"]',{state:'attached'});
            assert.equal(await e.page.locator('#div_txtcon > [data-dcuf-comment-role="popup-panel"]').count(),1,'A native picker panel must have its own reversible presentation role');
            const rec={width,height,dark};
            for(const [id,trigger] of [['div_txtcon','.tx_txtcon'],['div_con','.tx_dccon']]) {
                await e.page.locator(`#focus_cmt .dccon_guidebox > ${trigger}`).click();
                const popup=e.page.locator(`#${id}`);await popup.waitFor({state:'visible'});
                await popup.scrollIntoViewIfNeeded();
                const title=popup.locator('[data-dcuf-comment-role="popup-title"]').first();
                await title.waitFor({state:'visible'});
                assert.ok(await title.isVisible(),'The actual native title must form a visible heading band');
                await popup.locator('#btn_txtcon_submit,.btn_dccon_setting').first().scrollIntoViewIfNeeded();
                const value=await popup.evaluate(n=>{
                    const r=n.getBoundingClientRect(),s=getComputedStyle(n),field=n.querySelector('textarea'),checkbox=n.querySelector('input[type="checkbox"]'),swatch=n.querySelector('.btn_color'),preview=n.querySelector('.txtcon_txt');
                    const control=n.querySelector('#btn_txtcon_submit,.btn_dccon_setting'),c=control.getBoundingClientRect();
                    const selected=n.querySelector('.color_section .btn_color[aria-pressed="true"]');
                    const shell=n.querySelector('.coment_dccon_txt');
                    return {x:r.x,right:r.right,top:r.top,bottom:r.bottom,width:r.width,blur:s.backdropFilter,background:s.backgroundColor,sheen:s.backgroundImage,panel:getComputedStyle(n.firstElementChild).backgroundColor,radius:parseFloat(s.borderRadius),fieldRole:field?.getAttribute('data-dcuf-role'),fieldHeight:field?.getBoundingClientRect().height,fieldWidth:field?.getBoundingClientRect().width,checkboxWidth:checkbox?.getBoundingClientRect().width,swatch:selected&&getComputedStyle(selected).backgroundColor,preview:shell&&getComputedStyle(shell).backgroundColor,controlWidth:c.width,controlHeight:c.height,controlRight:c.right,primaryTexture:getComputedStyle(control).backgroundImage,controlHit:control.contains(document.elementFromPoint(c.x+c.width/2,c.y+c.height/2)),broken:Array.from(n.querySelectorAll('img')).filter(img=>!img.complete||img.naturalWidth===0).length};
                });
                assert.ok(value.width>0&&value.x>=-1&&value.right<=width+1,`Picker containment: ${JSON.stringify(value)}`);
                assert.ok(value.top>=-1&&value.bottom<=height+1,`Picker remains vertically visible in short/phone layouts: ${JSON.stringify(value)}`);
                if(width<=640)assert.ok(value.bottom<=height-108,'Narrow stress layout reserves the persistent menu area');
                assert.ok(await popup.evaluate(n=>n.scrollWidth<=n.clientWidth+1),'Native media rows remain inside the visible picker width');
                assert.ok(value.controlHit,'The original picker action remains reachable');
                assert.ok(value.radius>=12&&value.blur!=='none'&&value.sheen!=='none','Floating glass has backing, edge and sheen');
                assert.equal(value.panel,'rgba(0, 0, 0, 0)','The original opaque inner shell cannot cover the glass material');
                const alpha=Number(value.background.match(/\/\s*([\d.]+)\)/)?.[1]??1);
                assert.ok(alpha<=.86,'Trial floating backing must transmit color; actual composited appearance still requires visual review');
                if(id==='div_txtcon') {
                    const composition=await popup.evaluate(n=>{
                        const rect=selector=>{const r=n.querySelector(selector).getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
                        return{title:rect('.pop_dccon_tit'),help:rect('.tiptxt'),previewShell:rect('.txtcon_box'),preview:rect('.coment_dccon_txt'),field:rect('#txtcon_input'),label:rect('.color_section h5'),swatches:rect('.color_options'),stack:rect('.txt_dccon_box'),action:rect('#btn_txtcon_submit')};
                    });
                    assert.ok(composition.help.y>=composition.title.bottom&&Math.abs(composition.help.x-composition.title.x)<2,'Native floated title and help become aligned separate lines');
                    assert.ok(composition.previewShell.x>=value.x&&composition.previewShell.right<=value.right,'Every preview shell stays inside the picker, not merely its clipped scroll bounds');
                    assert.ok(Math.abs((composition.preview.x+composition.preview.width/2)-(value.x+value.width/2))<2,'Native100px preview is centered in the actual panel');
                    assert.ok(composition.swatches.y>=composition.label.bottom,'Color names sit above their original swatch groups');
                    assert.ok(composition.field.x>=value.x+16&&composition.field.right<=value.right-16,'Native field retains the panel inset');
                    assert.notEqual(value.fieldRole,'native-comment-textarea','Picker input is separate from the main composer');
                    assert.ok(value.fieldHeight<112,'Picker must not inherit112px composer minimum');
                    assert.ok(value.controlWidth>=88&&value.controlHeight>=40,'Primary action has a distinct full-size face');
                    assert.ok(value.controlRight>=value.right-28,'Primary action aligns to the content trailing edge');
                    assert.notEqual(value.primaryTexture,'none','Primary action carries the selected B1 surface detail');
                    assert.equal(value.swatch,'rgb(210, 240, 230)');assert.equal(value.preview,'rgb(210, 240, 230)');
                    await popup.locator('.btn_color[data-color="3b4890"]').click();
                    assert.equal(await popup.locator('.coment_dccon_txt').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(59, 72, 144)','Original color selection handler remains active');
                    await popup.locator('.btn_color[data-color="d2f0e6"]').click();
                    await e.page.locator('#txtcon_input').fill('원래 입력 보존');
                    await e.page.locator('#txtcon_input').press('Tab');
                    assert.equal(await e.page.evaluate(()=>document.activeElement?.id),'btn_txtcon_submit','Native keyboard order reaches the primary action');
                    await e.page.locator('#btn_txtcon_submit').click();
                    assert.equal(await e.page.evaluate(()=>window.__b1PickerCalls),1);
                } else {assert.ok(value.checkboxWidth<30,'Native checkbox does not become a full-width credential field');assert.equal(value.broken,0);assert.equal(await popup.locator('.dccon_list_box.hot').isVisible(),false,'Polish cannot unhide another native page');assert.equal(await popup.locator('.poply_greyclose').count(),0,'No invented top-level close control');await popup.locator('#double_dcon').check();assert.equal(await popup.locator('#double_dcon').isChecked(),true);}
                if(process.env.DCUF_B1_CONTENT_CAPTURE) {
                    await mkdir(process.env.DCUF_B1_CONTENT_CAPTURE,{recursive:true});
                    await e.page.screenshot({path:`${process.env.DCUF_B1_CONTENT_CAPTURE}/${width}-${height}-${dark?'dark':'light'}-${id}.png`,animations:'disabled'});
                }
                rec[id]=value;
                await e.page.locator(`#focus_cmt .dccon_guidebox > ${trigger}`).click();
                await popup.waitFor({state:'hidden'});
            }
            assert.equal(await e.page.evaluate(()=>window.__b1ContentOriginals.every(({node,parent,handler})=>node.isConnected&&node.parentNode===parent&&node.onclick===handler)),true,'Original controls/handlers retain identity');
            assert.notEqual(await e.page.locator('.dcuf-fab-button').evaluate(n=>getComputedStyle(n).backdropFilter),'none','The actual menu-button owner consumes mobile glass material');
            await e.page.locator('.btn_imgcmt').click();
            const imageRoot=e.page.locator('.img_area .view_comment.image_comment');
            await imageRoot.waitFor({state:'visible'});
            assert.equal(await imageRoot.locator('textarea').count(),0,'A native folded preview has no invented input');
            assert.ok(await imageRoot.locator('img').evaluate(n=>n.complete&&n.naturalWidth>1),'Image comments use decoded actual-size synthetic media, not1x1 placeholders');
            await e.page.locator('.btn_imgcmt').click();await imageRoot.waitFor({state:'hidden'});
            assert.equal(await e.page.locator('[data-dcuf-role="comment-box"]').first().evaluate(n=>getComputedStyle(n).borderTopWidth),'0px');
            assertNoRuntimeErrors(await getMetrics(e.page), e.consoleErrors);records.push(rec);
        } finally {await e.close();}
    }
    for(const [width,height,dark]of [[980,900,false],[980,900,true],[390,520,true]]){
        const e=await createTestPage(browser,server.baseUrl,{viewport:{width,height},storage:{[storageKeys.threshold]:0,[storageKeys.palette]:'teal'}});
        try{
            await mountB1NativeFixture(e,server.baseUrl,{dark});
            await e.page.locator('.newvisit_history > .btn_open').click();
            const layer=e.page.locator('#visit_history_lyr');await layer.waitFor({state:'visible'});
            const result=await layer.evaluate(n=>{const r=n.getBoundingClientRect(),b=n.querySelector('.under_listbox > li > button'),f=n.querySelector('.tabcon_bottom button'),c=b.getBoundingClientRect(),s=getComputedStyle(b);return {left:r.left,right:r.right,bottom:r.bottom,deleteWidth:c.width,deleteHeight:c.height,deleteBackground:s.backgroundImage,footerBackground:getComputedStyle(f).backgroundColor,footerHeight:f.getBoundingClientRect().height,hit:b.contains(document.elementFromPoint(c.x+c.width/2,c.y+c.height/2))};});
            assert.ok(result.left>=-1&&result.right<=width+1&&result.bottom<=height+1,JSON.stringify(result));
            assert.ok(result.deleteWidth>=32&&result.deleteHeight>=32&&result.hit,'Native remove control remains a visible hit target');
            assert.equal(result.deleteBackground,'none');assert.equal(result.footerBackground,'rgba(0, 0, 0, 0)');assert.ok(result.footerHeight>=40);
            await layer.locator('[aria-label="목록에서 삭제"]').click();assert.equal(await e.page.evaluate(()=>window.__b1DeleteClicks),1);
            assert.equal(await e.page.evaluate(()=>window.__b1Originals.every(({node,parent,handler})=>node.isConnected&&node.parentNode===parent&&node.onclick===handler)),true);
            await e.page.locator('.newvisit_history > .btn_open').click();await layer.waitFor({state:'hidden'});
            assertNoRuntimeErrors(await getMetrics(e.page),e.consoleErrors);records.push({recent:true,width,height,dark,...result});
        }finally{await e.close()}
    }
    return records;
}
