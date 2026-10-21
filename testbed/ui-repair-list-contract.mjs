import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assert, createTestPage, launchBrowser, storageKeys, getMetrics, assertNoRuntimeErrors } from './harness/runner-utils.mjs';
import { resolveBuiltUserscript } from './harness/userscript-loader.mjs';
import { startServer } from './server/server.mjs';

// Exact sampled ancestry/specificity, nested SELECT, empty sprite and fixed write
// width are the causal inputs. This probe owns its fixture additions only.
const nativeShape = () => {
    document.getElementById('dcuf-testbed-controls')?.remove();
    const style = document.createElement('style');
    style.textContent = `
        .list .gall_writer .addbox { display:inline-block; max-width:100%; }
        .list .gall_writer .addbox .nickname.in { display:inline-block; max-width:70%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; vertical-align:middle; }
        .list .gall_writer .addbox img { vertical-align:middle; }
        .buttom_search_wrap { width:451px; margin:20px auto 0; }
        .listwrap .buttom_search_wrap .bottom_search { position:absolute; right:0; bottom:0; height:38px; }
        .bottom_search .inner_search { width:278px; margin:3px 0 0 3px; }
        .listwrap .buttom_search_wrap .bnt_search { font-size:0; width:37px; height:38px; background-image:linear-gradient(#334d94,#334d94); }
        .list_bottom_btnbox .btn_write { width:82px; height:40px; box-sizing:border-box; font-size:14px; line-height:20px; }
    `;
    document.head.prepend(style);
    const originals = Array.from(document.querySelectorAll('table.gall_list tbody tr')).filter(row => row.querySelector('.gall_writer') && getComputedStyle(row).display !== 'none');
    originals.slice(0, 2).forEach((row, index) => {
        const writer = row.querySelector('.gall_writer');
        const name = index ? '매우긴닉네임가나다라마바사아자차카타파하'.repeat(8) : '게이머';
        writer.dataset.nick = name;
        writer.innerHTML = `<span class="addbox"><span class="nickname in"><em>${name}</em></span><img class="fixture-author-badge" src="/__testbed/ui-repair-badge.svg" alt="고정닉" width="12" height="11"><img class="fixture-author-gallery" src="/__testbed/ui-repair-gallery.svg" alt="갤러콘" width="24" height="24"></span>`;
        writer.addEventListener('click', () => { window.__listRepairAuthorCalls = (window.__listRepairAuthorCalls || 0) + 1; });
        row.dataset.repairAuthor = index ? 'long' : 'short';
    });
    const form = document.querySelector('form[name="frmSearch"]');
    if (!form) throw new Error('native search form is required');
    form.closest('article, #container').classList.add('listwrap');
    form.querySelector('.bottom_search_wrap, .buttom_search_wrap').className = 'buttom_search_wrap';
    if (new URL(location.href).searchParams.has('bareSearch')) {
        const group = form.querySelector('.search_right_box');
        group.replaceWith(...group.childNodes);
    }
    const select = form.querySelector('select[name="search_type"]');
    const legacy = form.querySelector('.select_box.bottom_array');
    legacy.append(select); // Real host SELECT lives inside this shell.
    const button = form.querySelector('.bnt_search');
    button.replaceChildren(Object.assign(document.createElement('span'), { className: 'blind', textContent: '검색' }));
    button.type = 'submit';
    form.setAttribute('action', '/__testbed/search-contract');
    form.setAttribute('method', 'get');
    form.append(Object.assign(document.createElement('input'), { type: 'hidden', name: 'id', value: 'test' }));
    const write = document.querySelector('.list_bottom_btnbox .btn_write');
    write.textContent = '글쓰기';
    write.addEventListener('click', event => { event.preventDefault(); window.__listRepairWriteCalls = (window.__listRepairWriteCalls || 0) + 1; });
    const controls = [select, form.querySelector('input[name="search_keyword"]'), button, write];
    window.__listRepairBaseline = {
        form, select, legacy, controls: controls.map(element => ({ element, parent: element.parentNode, next: element.nextSibling })),
        attributes: [form, ...form.querySelectorAll('*')].map(element => ({ element, style:element.getAttribute('style'),
            markers:['data-dcuf-surface','data-dcuf-role','data-dcuf-state'].map(name => [name,element.getAttribute(name)]) })),
        fields: Array.from(form.elements).map(element => [element.tagName, element.type, element.name, element.value]),
        submissions: [], changes: 0,
    };
    select.addEventListener('change', () => { window.__listRepairBaseline.changes++; });
    form.addEventListener('submit', event => {
        event.preventDefault();
        window.__listRepairBaseline.submissions.push(Object.fromEntries(new FormData(form)));
    });
};

const shapeScript = `<script>(${nativeShape.toString()})();</script>`;
const defaultScenarios = [
    { route: '/mgallery/board/lists?id=test&bareSearch=1', width: 980, height: 900 },
    { route: '/mgallery/board/lists?id=test&bareSearch=1', width: 390, height: 480 },
    { route: '/board/lists?id=test', width: 980, height: 900 },
    { route: '/mgallery/board/lists?id=test', width: 390, height: 480 },
    { route: '/mini/board/lists?id=test', width: 412, height: 844 },
    { route: '/mgallery/board/view?id=test&no=1001', width: 980, height: 900 },
].flatMap(scenario => [false, true].map(dark => ({ ...scenario, dark })));

export async function runListRepairContract({ browser, server, scenarios = defaultScenarios, diagnose = false } = {}) {
    const reports = [];
    for (const scenario of scenarios) {
        const session = await createTestPage(browser, server.baseUrl, {
            storage: { [storageKeys.threshold]: 0, [storageKeys.ratioEnabled]: false, [storageKeys.personalEnabled]: true,
                [storageKeys.personalList]: { uids: [], nicknames: [], ips: [] }, [storageKeys.palette]: 'blue' },
            viewport: { width: scenario.width, height: scenario.height },
        });
        const { page } = session;
        page.setDefaultTimeout(7000);
        try {
            await page.route('**/__testbed/ui-repair-*.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" fill="red"/></svg>' }));
            await page.route(url => url.origin === server.baseUrl && /\/board\/(lists|view)$/.test(url.pathname), async route => {
                const response = await route.fetch();
                await route.fulfill({ response, body: (await response.text()).replace('</body>', `${shapeScript}</body>`) });
            });
            await session.goto(scenario.route);
            if (scenario.dark) await page.evaluate(() => window.__dcufFixture.toggleDark(true));
            await page.waitForSelector('[data-dcuf-surface="list-search"] [data-dcuf-role="submit"]');
            await page.waitForFunction(() => Array.from(document.querySelectorAll('.custom-mobile-list img')).every(img => img.complete));
            const report = { scenario, checks: [], geometry: null };
            const check = (id, pass, observed) => report.checks.push({ id, pass: Boolean(pass), observed });
            const geometry = await page.evaluate(() => {
                const box = element => { const r = element.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom }; };
                const rangeBox = element => { const range = document.createRange(); range.selectNodeContents(element); return box(range); };
                const rows = Array.from(document.querySelectorAll('.custom-mobile-list .dcuf-list-author')).filter(row => row.querySelector('.addbox')).slice(0, 2);
                const form = document.querySelector('[data-dcuf-surface="list-search"]');
                const select = form.querySelector('select[name="search_type"]'), query = form.querySelector('.bottom_search'), button = form.querySelector('.bnt_search');
                const write = document.querySelector('[data-dcuf-surface="list-actions"] [data-dcuf-role="primary-action"]');
                const media = rows.flatMap(row => Array.from(row.querySelectorAll('img')).map(img => ({ src:img.getAttribute('src'), alt:img.alt, rect:box(img), loaded:img.complete && img.naturalWidth > 0 })));
                return { authors:rows.map(row => ({ rect:box(row), nickname:box(row.querySelector('.nickname')), text:rangeBox(row.querySelector('.nickname em')) })), media,
                    form:box(form), select:box(select), query:box(query), button:box(button), queryPosition:getComputedStyle(query).position,
                    submitIcon:getComputedStyle(button, '::before').content, submitText:getComputedStyle(button).fontSize,
                    submitMask:{image:getComputedStyle(button,'::before').maskImage,width:parseFloat(getComputedStyle(button,'::before').width),height:parseFloat(getComputedStyle(button,'::before').height)},
                    write:box(write), writeText:rangeBox(write), writeWhiteSpace:getComputedStyle(write).whiteSpace,
                    viewport:{ width:innerWidth, height:innerHeight, screenWidth:screen.width, dpr:devicePixelRatio, scale:visualViewport.scale } };
            });
            report.geometry = geometry;
            const short = geometry.authors[0], long = geometry.authors[1];
            check('UI-02 short author untruncated', short.nickname.width >= short.text.width - 1, short);
            check('UI-02 long author bounded', long.nickname.width > 40 && long.nickname.right <= long.rect.right + 1 && long.rect.right <= scenario.width + 1, long);
            check('UI-03 author images preserved', geometry.media.length === 4 && geometry.media.every(img => img.loaded && img.src?.includes('/__testbed/ui-repair-') && (img.alt === '고정닉' ? img.rect.width === 12 && img.rect.height === 11 : img.rect.width === 24 && img.rect.height === 24)), geometry.media);
            check('UI-04 original nested select visible', geometry.select.width >= 80 && geometry.select.height >= 40, geometry.select);
            check('UI-05 query contained', geometry.queryPosition === 'static' && geometry.query.x >= geometry.form.x && geometry.query.right <= geometry.form.right + 1 && geometry.query.y >= geometry.form.y && geometry.query.bottom <= geometry.form.bottom + 1, { form:geometry.form, query:geometry.query, position:geometry.queryPosition });
            check('UI-05 visible search affordance', geometry.submitIcon && !['none', 'normal', '""'].includes(geometry.submitIcon) || Number.parseFloat(geometry.submitText) >= 10 || geometry.submitMask.image !== 'none' && geometry.submitMask.width >= 16 && geometry.submitMask.height >= 16, { content:geometry.submitIcon, fontSize:geometry.submitText, mask:geometry.submitMask });
            check('UI-07 bottom write single line', geometry.write.width >= 80 && geometry.write.height >= 40 && geometry.writeText.height <= 22 && geometry.writeWhiteSpace === 'nowrap', { rect:geometry.write, text:geometry.writeText, whiteSpace:geometry.writeWhiteSpace });

            const hit = async selector => {
                const locator = page.locator(selector).first();
                await locator.scrollIntoViewIfNeeded();
                const inspect = element => { const r=element.getBoundingClientRect(), target=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); return {pass:r.width>0 && r.height>0 && (target===element || element.contains(target)), rect:[r.x,r.y,r.width,r.height], target:target ? [target.tagName,target.id,target.className] : null}; };
                let observed = await locator.evaluate(inspect);
                if (!observed.pass) {
                    (report.initialHitObstructions ||= []).push({selector,...observed});
                    // A normal scroll may move the control away from the fixed
                    // floating menu; retain the initial obstruction, never hide
                    // the menu or force a pointer through it.
                    await locator.evaluate(element => element.scrollIntoView({ block: 'center' }));
                    observed = await locator.evaluate(inspect);
                }
                if (!observed.pass) (report.hitMisses ||= []).push({selector,...observed});
                return observed.pass;
            };
            const pagesSelector = '[data-dcuf-surface="list-pagination"] [data-dcuf-role="pages"]';
            await page.locator(pagesSelector).scrollIntoViewIfNeeded();
            const ends = await page.locator(pagesSelector).evaluate(pages => {
                const first=pages.firstElementChild,last=pages.lastElementChild;
                const visible = element => { const r=element.getBoundingClientRect(),p=pages.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); return r.width>=40&&r.height>=40&&r.x>=p.x-1&&r.right<=p.right+1&&(hit===element||element.contains(hit)); };
                pages.scrollLeft=0; const leading=visible(first), overflow=pages.scrollWidth>pages.clientWidth;
                pages.scrollLeft=pages.scrollWidth; const trailing=visible(last);
                pages.scrollLeft=0; return {leading,trailing,overflow};
            });
            check('UI-06 both pagination ends reachable', ends.leading && ends.trailing, ends);
            if (geometry.select.width > 0 && geometry.select.height > 0) {
                check('UI-04 select hit', await hit('select[name="search_type"]'));
                await page.locator('select[name="search_type"]').focus();
                check('UI-04 select focus', await page.locator('select[name="search_type"]').evaluate(el => document.activeElement === el));
                await page.locator('select[name="search_type"]').selectOption('title');
                await page.locator('input[name="search_keyword"]').fill('긴 검색어 & 계약');
                check('UI-05 submit hit', await hit('[data-dcuf-surface="list-search"] [data-dcuf-role="submit"]'));
                await page.locator('[data-dcuf-surface="list-search"] [data-dcuf-role="submit"]').click();
                await page.locator('input[name="search_keyword"]').press('Enter');
                const events = await page.evaluate(() => ({ submissions:window.__listRepairBaseline.submissions, changes:window.__listRepairBaseline.changes,
                    topology:window.__listRepairBaseline.controls.every(s => s.element.parentNode === s.parent && s.element.nextSibling === s.next),
                    form: [window.__listRepairBaseline.form.getAttribute('action'), window.__listRepairBaseline.form.getAttribute('method')] }));
                check('UI-04/05 native forms and events', events.changes === 1 && events.submissions.length === 2 && events.submissions.every(s => s.search_type === 'title' && s.search_keyword === '긴 검색어 & 계약' && s.id === 'test') && events.topology && events.form[0] === '/__testbed/search-contract' && events.form[1] === 'get', events);
            }
            check('UI-07 write hit', await hit('[data-dcuf-surface="list-actions"] [data-dcuf-role="primary-action"]'));
            await page.locator('[data-dcuf-surface="list-actions"] [data-dcuf-role="primary-action"]').click();
            await page.locator('[data-dcuf-surface="list-actions"] [data-dcuf-role="primary-action"]').press('Enter');
            check('UI-07 native write pointer/Enter', await page.evaluate(() => window.__listRepairWriteCalls === 2));
            const shortAuthorSelector = '.custom-mobile-list .dcuf-list-author:has([data-nick="게이머"]) .nickname';
            check('UI-02 author hit', await hit(shortAuthorSelector));
            await page.locator(shortAuthorSelector).click();
            check('UI-02 original identity proxy', await page.evaluate(() => window.__listRepairAuthorCalls === 1));
            const boundary = await page.evaluate(() => {
                // An inactive document lets the adapter inspect rejected URLs
                // without the fixture itself attempting a browser request.
                const inertDocument = document.implementation.createHTMLDocument('attribute boundary');
                const row = inertDocument.importNode(document.querySelector('table.gall_list tbody tr[data-repair-author="short"]'), true);
                const writer = row.querySelector('.gall_writer');
                const img = inertDocument.createElement('img');
                img.setAttribute('src', 'javascript:alert(1)'); img.setAttribute('onerror', 'alert(2)'); img.setAttribute('style', 'position:fixed');
                img.setAttribute('srcset', 'https://invalid.test/img.png 2x'); img.setAttribute('width', '999999'); img.alt='unsafe'; writer.append(img);
                const snapshot = window.__dcufListHostAdapter.snapshotRow(row, 'boundary-check');
                const item = window.__dcufListHostAdapter.createItem(row, 'boundary-check');
                const images = Array.from(item.querySelectorAll('img'));
                const unsafe = images.find(image => image.alt === 'unsafe');
                writer.removeChild(img);
                return { serializable:JSON.parse(JSON.stringify(snapshot)).rowId==='boundary-check', frozen:Object.isFrozen(snapshot)&&Object.isFrozen(snapshot.author)&&Object.isFrozen(snapshot.author.children),
                    images:images.length, safe:images.filter(image => image.src.includes('/__testbed/ui-repair-')).length,
                    unsafeAbsent:!unsafe || (!unsafe.hasAttribute('src')&&!unsafe.hasAttribute('onerror')&&!unsafe.hasAttribute('style')&&!unsafe.hasAttribute('srcset')&&!unsafe.hasAttribute('width')) };
            });
            check('UI-03 immutable safe attribute boundary', boundary.serializable && boundary.frozen && boundary.images >= 2 && boundary.safe === 2 && boundary.unsafeAbsent, boundary);
            const restored = await page.evaluate(() => {
                const listWrap=document.querySelector('[data-dcuf-surface="list-host"]');
                const adapter=window.__dcufListHostAdapter, form=window.__listRepairBaseline.form;
                const options={listWrap, toolbar:document.querySelector('.list_array_option'), actionBar:document.querySelector('.list_bottom_btnbox'),
                    pagination:document.querySelector('.bottom_paging_box'), pageMoveBox:document.querySelector('.bottom_movebox'), searchForm:form, searchLayer:form.querySelector('#searchTypeLayer')};
                adapter.dispose(listWrap);
                const exact=window.__listRepairBaseline.attributes.every(s => s.element.getAttribute('style')===s.style && s.markers.every(([name,value])=>s.element.getAttribute(name)===value));
                adapter.connect(options); adapter.refresh(options);
                return {exact, oneStyle:document.querySelectorAll('#dcuf-phase1-list-theme').length===1,
                    selectIdentity:form.querySelector('select[name="search_type"]')===window.__listRepairBaseline.select,
                    nested:window.__listRepairBaseline.legacy.contains(window.__listRepairBaseline.select)};
            });
            check('UI-04/05 reversible roles and reconnect', restored.exact && restored.oneStyle && restored.selectIdentity && restored.nested, restored);
            assertNoRuntimeErrors(await getMetrics(page), session.consoleErrors);
            reports.push(report);
        } finally { await session.close(); }
    }
    if (!diagnose) assert.deepEqual(reports.flatMap(report => report.checks.filter(check => !check.pass).map(check => ({ scenario:report.scenario, ...check }))), [], 'List UI repair positive contracts');
    return reports;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    const runtime = await resolveBuiltUserscript();
    if (!args.includes('--require-runtime-under-test') || !/[\\/]testbed[\\/]artifacts[\\/]runtime-under-test\.user\.js$/i.test(runtime)) throw new Error('Set DCUF_TESTBED_USERSCRIPT to testbed/artifacts/runtime-under-test.user.js and pass --require-runtime-under-test');
    console.log(`Runtime: ${runtime}\nSHA-256: ${createHash('sha256').update(await readFile(runtime)).digest('hex').toUpperCase()}`);
    const browser = await launchBrowser(), server = await startServer();
    try {
        const reports = await runListRepairContract({ browser, server, diagnose:true, ...(args.includes('--quick') ? { scenarios:[defaultScenarios[0]] } : {}) });
        if (args.includes('--output')) {
            const output=path.resolve(args[args.indexOf('--output')+1]); await mkdir(path.dirname(output),{recursive:true}); await writeFile(output, `${JSON.stringify(reports,null,2)}\n`);
        }
        const failures=reports.flatMap(report => report.checks.filter(check => !check.pass).map(check => ({ scenario:report.scenario, ...check })));
        console.log(JSON.stringify({scenarios:reports.length, checks:reports.reduce((sum,r)=>sum+r.checks.length,0),failures},null,2));
        if (failures.length) process.exitCode=1;
    } finally { await browser.close(); await server.close(); }
}
