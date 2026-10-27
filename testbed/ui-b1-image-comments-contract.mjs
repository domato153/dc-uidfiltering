import { mkdir } from 'node:fs/promises';
import { assert, createTestPage, storageKeys, assertNoRuntimeErrors, getMetrics } from './harness/runner-utils.mjs';
import { mountB1ImageCommentsFixture } from './fixtures/b1-image-comments.mjs';

export async function runB1ImageCommentsContract({browser, server}) {
    const records = [];
    for (const [width,height,dark] of [[1440,900,false],[980,900,false],[980,900,true],[390,520,false],[390,520,true],[980,2306,false]]) {
        const e = await createTestPage(browser,server.baseUrl,{viewport:{width,height},storage:{[storageKeys.threshold]:0,[storageKeys.palette]:'teal'}});
        try {
            await e.goto('/board/view?id=test&no=1001&comments=4');
            await e.page.evaluate(mountB1ImageCommentsFixture,{imageWidth:width===1440?850:500});
            if(dark) await e.page.evaluate(()=>window.__dcufFixture.toggleDark(true));
            const area=e.page.locator('.img_area.no1'),pane=area.locator('.img_comment'),composer=pane.locator('.cmt_write_box');
            await area.locator('.btn_imgcmt').click();
            await pane.waitFor({state:'visible'});
            assert.equal(await pane.locator('textarea').count(),0,'Fold is a preview, not a hidden invented composer');
            await pane.click();
            await composer.waitFor({state:'visible'});
            await composer.locator('[data-dcuf-role="native-comment-submit"]').waitFor({state:'visible'});
            assert.equal(await e.page.locator('#img_cmt_write_box_1').count(),1,'No baseline fixture composer may shadow the native specimen');
            assert.equal(await e.page.locator('#img_cmt_name_1').count(),1,'Nickname resolution must use this isolated image');
            await composer.scrollIntoViewIfNeeded();
            // A short viewport may place the persistent menu over the trailing
            // edge. A user can scroll the native action to the viewport center.
            await composer.locator('.btn_image_comment').evaluate(n=>n.scrollIntoView({block:'center'}));
            const shape=await composer.evaluate(n=>{
                const box=x=>{const r=x.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
                const editor=n.querySelector('.cmt_txt_cont'),field=n.querySelector('textarea'),action=n.querySelector('.cmt_cont_bottm'),button=n.querySelector('.btn_image_comment');
                const cs=getComputedStyle,main=document.querySelector('#focus_cmt .cmt_write_box'),primary=main.querySelector('.btn_blue');
                return {outer:box(n),editor:box(editor),field:box(field),action:box(action),button:box(button),pane:box(n.closest('.img_comment')),viewport:innerWidth,
                    editorMargin:cs(editor).marginLeft,actionMargin:cs(action).marginLeft,
                    radius:cs(n).borderRadius,mainRadius:cs(main).borderRadius,fill:cs(n).backgroundColor,mainFill:cs(main).backgroundColor,
                    buttonFill:cs(button).backgroundImage,mainButtonFill:cs(primary).backgroundImage,buttonColor:cs(button).color,mainButtonColor:cs(primary).color,
                    hit:button.contains(document.elementFromPoint(box(button).x+box(button).width/2,box(button).y+box(button).height/2))};
            });
            if(process.env.DCUF_IMAGE_COMMENT_CAPTURE){await mkdir(process.env.DCUF_IMAGE_COMMENT_CAPTURE,{recursive:true});await composer.screenshot({path:`${process.env.DCUF_IMAGE_COMMENT_CAPTURE}/composer-${width}-${height}-${dark?'dark':'light'}.png`});}
            assert.ok(shape.pane.x>=-1&&shape.pane.right<=width+1&&shape.pane.width<=shape.outer.width+1,`Native850px pane fits its actual parent: ${JSON.stringify(shape)}`);
            assert.ok(Math.abs(shape.field.x-shape.action.x)<2&&Math.abs(shape.field.right-shape.action.right)<2,'Input and action strip share both edges');
            assert.ok(shape.action.y>=shape.field.bottom-1,'Register occupies a footer, not the native side column');
            assert.ok(shape.button.height>=34&&shape.button.height<50,'Native70px square becomes the ordinary compact button');
            assert.equal(shape.editorMargin,'0px');assert.equal(shape.actionMargin,'0px');
            for(const [a,b]of [['radius','mainRadius'],['fill','mainFill'],['buttonFill','mainButtonFill'],['buttonColor','mainButtonColor']])assert.equal(shape[a],shape[b],`Same comment-family material: ${a}`);
            assert.ok(shape.hit,'Original Register remains reachable');
            assert.equal(await pane.locator('#img_cmt_name_1').isVisible(),true,'Existing nickname-sync input must be visible');
            assert.equal(await pane.locator('[name="gall_nick_name"]').isVisible(),false,'Functional canonical nickname remains hidden');
            assert.equal(await pane.locator('input[type="password"]').isVisible(),true,'The separate password shell remains visible');
            assert.equal(await pane.locator('.btn_gallnickuse').isVisible(),false);
            assert.equal(await pane.locator('.dccon_guidebox').count(),0,'No ordinary-only tools are invented');
            await pane.locator('#img_cmt_name_1').fill('합성작성자');
            await pane.locator('textarea').fill('합성 입력 보존');
            await pane.locator('textarea').press('Tab');
            assert.equal(await e.page.evaluate(()=>document.activeElement.classList.contains('btn_image_comment')),true,'Keyboard reaches the actual native submit');
            await pane.locator('.btn_image_comment').press('Enter');
            assert.deepEqual(await e.page.evaluate(()=>window.__b1ImageCalls),[1]);
            assert.equal(await pane.locator('input[name="name"][data-dcuf-image-submit-name]').inputValue(),'합성작성자','Existing nickname-sync still supplies its original submission field');
            await area.locator('.btn_imgcmt').click();await pane.waitFor({state:'hidden'});
            await area.locator('.btn_imgcmt').click();await pane.waitFor({state:'visible'});
            assert.equal(await pane.locator('textarea').inputValue(),'합성 입력 보존','ON/OFF cannot reset original input');
            const second=e.page.locator('.img_area.no2');await second.locator('.btn_imgcmt').click();await second.locator('.img_comment').click();
            await second.locator('[data-dcuf-role="native-comment-submit"]').waitFor({state:'visible'});
            assert.equal(await pane.locator('textarea').inputValue(),'합성 입력 보존','Other image expansion is isolated');
            assert.equal(await e.page.evaluate(()=>window.__b1ImageOriginals.every(({node,parent,type,style,handler,submit})=>node.isConnected&&node.parentNode===parent&&node.getAttribute('type')===type&&(node.name==='gall_nick_name'||node.style.cssText===style)&&node.onclick===handler&&node.onsubmit===submit)),true,'Original identities, hidden styles, types and callbacks are intact; incumbent nickname owner still controls its canonical inline state');
            assert.equal(await pane.locator('img').evaluate(n=>n.complete&&n.naturalWidth>1),true,'Comment media decodes');
            await e.page.evaluate(()=>{const area=document.querySelector('.img_area.no2');area.remove();});
            await e.page.evaluate(()=>{window.__b1DetachedImage=document.querySelector('.img_area.no1 .view_comment');window.__b1DetachedImage.remove();});
            await e.page.waitForFunction(()=>!document.querySelector('.img_area.no1 .img_comment').hasAttribute('data-dcuf-role')&&!window.__b1DetachedImage.hasAttribute('data-dcuf-surface'));
            await e.page.evaluate(()=>document.querySelector('.img_area.no1 .img_comment').append(window.__b1DetachedImage));
            await pane.locator('[data-dcuf-role="native-comment-submit"]').waitFor({state:'attached'});
            assert.equal(await pane.locator('textarea').inputValue(),'합성 입력 보존','Existing rerun path restores the original reinserted root');
            assertNoRuntimeErrors(await getMetrics(e.page),e.consoleErrors);
            records.push({width,height,dark,...shape});
        } finally {await e.close();}
    }
    return records;
}
