import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildB1ListPreview } from '../tools/build-b1-list-preview.mjs';
import { createHash } from 'node:crypto';
import { assert, launchBrowser } from './harness/runner-utils.mjs';

const output = await buildB1ListPreview();
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const allowed = new Set(['index.html', 'list.html', 'presentation.css', 'host-preview.mjs', 'fixture-client.js']);
const server = createServer(async (req, res) => {
    const name = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html';
    if (!allowed.has(name)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(name)] });
    res.end(await readFile(path.join(output, name)));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await launchBrowser();
const results = [];
try {
    for (const [width, height, theme, reduced = false] of [[980,900,'light'],[980,900,'dark'],[980,2306,'light'],[980,2306,'dark'],[1280,900,'light'],[390,900,'light'],[390,900,'dark'],[980,900,'light',true]]) {
        console.log(`B1 preview ${width}x${height} ${theme}${reduced?' reduced-motion':''}`);
        const context = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        try {
            await page.goto(`${base}/list.html?nativeToolbar=1&theme=${theme}`);
            const initial = await page.evaluate(() => ({
                header: document.querySelector('.dcheader').getBoundingClientRect().height,
                overflow: document.documentElement.scrollWidth > innerWidth + 1,
            }));
            assert.ok(initial.header <= (width < 600 ? 190 : 86), `Compact B1 header: ${JSON.stringify(initial)}`);
            assert.equal(initial.overflow, false, 'No page horizontal overflow');
            await page.waitForFunction(() => document.body.dataset.b1Ready === '1');
            await page.screenshot({path:path.join(output,`top-${width}-${height}-${theme}${reduced?'-reduced':''}.png`),animations:'disabled'});
            const recent = page.getByRole('button', { name: '최근 방문', exact: true });
            await recent.click();
            await page.waitForFunction(() => document.querySelector('.newvisit_history').dataset.open === 'true');
            await page.locator('.newvisit_list a').first().hover();
            const menu = await page.locator('.newvisit_box').evaluate(node => {
                const r=node.getBoundingClientRect(), hit=document.elementFromPoint(r.x+r.width/2,r.y+25);
                return {x:r.x,right:r.right,width:r.width,height:r.height,hit:node.contains(hit)};
            });
            assert.ok(menu.width > 200 && menu.height > 150 && menu.x >= 0 && menu.right <= width + 1 && menu.hit, JSON.stringify(menu));
            if(width===980&&height===900&&!reduced)await page.screenshot({path:path.join(output,`recent-${theme}.png`),animations:'disabled'});
            await page.keyboard.press('Escape');
            assert.equal(await recent.getAttribute('aria-expanded'), 'false');
            assert.equal(await recent.evaluate(node => document.activeElement === node), true, 'Escape restores trigger focus');
            await recent.click(); await page.locator('.page_head h2').click({position:{x:2,y:2}});
            assert.equal(await recent.getAttribute('aria-expanded'), 'false', 'Outside click closes recent menu');
            const more = page.getByRole('button', { name: '말머리 더보기', exact: true });
            await more.click();
            const last = page.locator('.center_box li a').last();
            await last.click();
            assert.equal(await more.getAttribute('aria-expanded'), 'false');
            assert.equal(await page.evaluate(() => window.__fixtureNativeCategoryClicks), 1, 'Original category handler fires once');
            const collapsed=await page.evaluate(()=>{const list=document.querySelector('.center_box ul'),r=list.getBoundingClientRect();return {scroll:list.scrollLeft,whole:[...list.children].filter(n=>getComputedStyle(n).display!=='none').every(n=>{const t=n.getBoundingClientRect();return t.left>=r.left-1&&t.right<=r.right+1;}),selectedVisible:document.querySelector('.center_box [aria-current=true]').getBoundingClientRect().width>0};});
            assert.deepEqual(collapsed,{scroll:0,whole:true,selectedVisible:true},'Whole category items and selected overflow remain visible');
            await page.locator('.array_tab button').nth(1).click();
            assert.equal(await page.evaluate(() => window.__fixtureNativeTabClicks), 1, 'Original tab handler fires once');
            await page.locator('.array_tab button').first().click();
            await page.locator('input[name=search_keyword]').fill('신규 공명자');
            await page.locator('form[name=frmSearch] .bnt_search').click();
            const search = await page.evaluate(() => ({count:[...document.querySelectorAll('tbody tr')].filter(n=>!n.hidden).length, calls:window.__fixtureSearchClicks}));
            assert.ok(search.count > 0 && search.count < 20, JSON.stringify(search));
            assert.equal(search.calls, 1);
            await page.locator('input[name=search_keyword]').fill('');
            await page.locator('input[name=search_keyword]').press('Enter');
            await page.locator('.array_num select').selectOption('30');
            assert.equal(await page.locator('tbody tr:not([hidden])').count(),30,'Page-size preview shows30 complete sample rows');
            assert.equal(await page.evaluate(()=>window.__fixtureNativeCountChanges),1);
            await page.locator('.array_num select').selectOption('50');
            await page.locator('.bottom_paging_box .page_next').click();
            assert.equal(await page.locator('.bottom_paging_box em').innerText(),'2','Next page retains a numeric indicator');
            await page.locator('.bottom_paging_box .page_prev').click();
            assert.equal(await page.locator('.bottom_paging_box em').innerText(),'1');
            await page.locator('.switch_btnbox .btn_write').click();
            assert.equal(await page.evaluate(() => window.__fixtureWriteClicks), 1);
            assert.equal(await page.evaluate(() => window.__b1Preview.originals.every(({node,parent,handler})=>node.isConnected&&node.parentNode===parent&&node.onclick===handler)),true,'Original controls remain in place with their handlers');
            await page.screenshot({path:path.join(output,`${width}-${height}-${theme}${reduced?'-reduced':''}.png`),animations:'disabled'});
            if(width>=600) {
                await page.evaluate(()=>window.scrollTo(0,0));
                await page.waitForFunction(()=>scrollY===0&&document.body.dataset.scrollDirection==='up');
                await page.evaluate(()=>window.scrollTo(0,450));
                await page.waitForFunction(()=>document.body.dataset.scrollDirection==='down');
                await page.waitForFunction(()=>document.querySelector('.list_array_option').getBoundingClientRect().y<=24);
                const down = await page.locator('.list_array_option').boundingBox();
                assert.ok(down.y >= 10 && down.y <= 24, JSON.stringify(down));
                await page.evaluate(()=>window.scrollTo(0,330));
                await page.waitForFunction(()=>document.body.dataset.scrollDirection==='up');
                await page.waitForFunction(()=>{const h=document.querySelector('.dcheader').getBoundingClientRect(),t=document.querySelector('.list_array_option').getBoundingClientRect();return h.y>=0&&t.y>=h.bottom+6;});
                const header=await page.locator('.dcheader').boundingBox(), toolbar=await page.locator('.list_array_option').boundingBox();
                assert.ok(header.y>=0&&toolbar.y>=header.y+header.height+6,'Returned header and toolbar do not overlap');
                await page.screenshot({path:path.join(output,`${width}-${height}-${theme}-scroll-up.png`),animations:'disabled'});
            }
            if(reduced) assert.equal(await page.locator('.dcheader').evaluate(n=>getComputedStyle(n).transitionDuration),'0s');
            assert.deepEqual(errors, []);
            results.push({width,height,theme,reduced,initial,menu,search});
        } catch(error) {
            await page.screenshot({path:path.join(output,'failure.png')});
            const observation=await page.evaluate(()=>({y:scrollY,scrollDirection:document.body.dataset.scrollDirection,open:document.querySelector('.center_box')?.dataset.open,center:document.querySelector('.center_box')?.getBoundingClientRect().toJSON(),list:document.querySelector('.center_box ul')?.getBoundingClientRect().toJSON(),last:document.querySelector('.center_box li:last-child')?.getBoundingClientRect().toJSON()}));
            console.error(JSON.stringify(observation));
            throw error;
        } finally { await context.close(); }
    }
    // Parent viewer must change the physical presentation, not squeeze layout to412.
    const viewer = await browser.newPage({viewport:{width:1280,height:1000}});
    await viewer.goto(base);
    await viewer.getByRole('button',{name:'폰 배율',exact:true}).click();
    const frame=viewer.frames().find(frame=>frame.url().includes('list.html'));
    assert.equal(await frame.evaluate(()=>innerWidth),980);
    assert.equal(await frame.evaluate(()=>innerHeight),2306);
    const phone=await viewer.locator('.preview-stage').boundingBox();
    assert.ok(Math.abs(phone.width-412.2706)<2,JSON.stringify(phone));
    await viewer.screenshot({path:path.join(output,'phone-viewer.png')});
    await viewer.close();
    const inputs={};
    for(const file of ['design-prototypes/b1-list/presentation.css','design-prototypes/b1-list/host-preview.mjs','design-prototypes/b1-list/index.html','tools/build-b1-list-preview.mjs','tools/serve-b1-list-preview.mjs','testbed/run-b1-list-preview.mjs','testbed/fixtures/pages.mjs','testbed/fixtures/builders.mjs','testbed/public/fixture-client.js'])inputs[file]=createHash('sha256').update(await readFile(file)).digest('hex');
    await writeFile(path.join(output,'validation.json'),JSON.stringify({scope:'ISOLATED_DESIGN_PREVIEW_ONLY',productRuntimeChanged:false,browser:browser.version(),inputs,results},null,2));
    console.log(`B1 list design preview: ${results.length} contexts + phone viewer PASS. No product/live-site acceptance.`);
} finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
