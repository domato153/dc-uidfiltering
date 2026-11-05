import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { viewPage } from './fixtures/pages.mjs';
import { createTestPage, launchBrowser, storageKeys } from './harness/runner-utils.mjs';
import { resolveBuiltUserscript } from './harness/userscript-loader.mjs';
import { startServer } from './server/server.mjs';

// Exact competing selectors/values from the public-host cause audit (contents.css
// v260910 and dark.css v241108). The source owner must win without changing them.
const nativeCompetitionCss = `
.blind { position:absolute; width:0; height:0; overflow:hidden; font-size:0; line-height:0; }
.gallview_head .gall_writer { font-size:12px; }
.gallview_head .gall_writer::after { content:""; display:block; clear:both; }
.gallview_head .gall_writer > .fl { float:left; }
.gallview_head .gall_writer > .fr { float:right; }
.gallview_head .gall_scrap > button { width:19px; height:17px; color:transparent; font-size:0; }
.sp_img { background-image:linear-gradient(90deg, #293e8e 50%, #d2d9ee 50%); }
.recom_bottom_box { position:relative; height:37px; }
.btn_recommend_box.morebox .recom_bottom_box { height:36px; }
.darkmode .sp_img { background-image:linear-gradient(90deg, #a4a4a4 50%, #454545 50%); }
.darkmode .recom_bottom_box { background:#454545; }
.darkmode .write_div, .darkmode .write_div > * { color:#444; }
.darkmode .write_div, .darkmode .write_div img { filter:invert(100%); }
.darkmode .write_div .fixture-article-known-media { filter:invert(100%) hue-rotate(180deg) !important; mix-blend-mode:difference !important; }
`;

const knownMedia = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><path fill="#f02040" d="M0 0h40v40H0z"/><path fill="#20a060" d="M40 0h40v40H40z"/><path fill="#2050e0" d="M80 0h40v40H80z"/></svg>')}`;

function articleFixture({ dark }) {
    const metadata = `<div class="gall_writer clear">
<div class="fl"><span class="nickname">짧은작성자</span><span class="ip">(127.0)</span><span class="gall_date">2026.10.18 12:00</span></div>
<div class="fr"><span class="gall_count">조회 <b>123</b></span><span class="gall_reply_num">추천 <b>7</b></span><span class="gall_comment"><a href="#focus_cmt">댓글 <b>12</b></a></span><span class="gall_scrap"><button class="sp_img" type="button" onclick="window.__articleRepairScrapCalls=(window.__articleRepairScrapCalls||0)+1">스크랩</button></span></div>
</div>`;
    return viewPage({ variant: 'minor', darkAtStart: dark })
        .replace(/<aside id="dcuf-testbed-controls"[\s\S]*?<\/aside>/, '')
        .replace('</head>', `<style id="fixture-article-native-competition">${nativeCompetitionCss}</style></head>`)
        .replace('<body class="', `<body class="${dark ? 'darkmode ' : ''}`)
        .replace('<span class="title_subject">테스트 본문</span>', `<span class="title_subject">테스트 본문</span>${metadata}`)
        .replace('<p>본문 시작</p>', `<p class="fixture-article-readable">본문 시작 <a href="#native-link">본문 링크</a></p><img class="fixture-article-known-media" src="${knownMedia}" width="120" height="40" alt="known red green blue media">`)
        .replace('<button type="button">공유</button>', '<button type="button" onclick="window.__articleRepairShareCalls=(window.__articleRepairShareCalls||0)+1">공유</button>')
        // This contract starts with the native action menu closed. Its open
        // interior/handler preservation remains covered by the differential.
        .replace('fixture-original-action-popup" style="display:block;', 'fixture-original-action-popup" style="display:none;')
        .replace('<script src="/__testbed/fixture-client.js">', `<script>
window.__articleRepairNative = Array.from(document.querySelectorAll('.gallview_head .gall_writer, .gallview_head .gall_writer *, .write_div, .fixture-article-known-media, .btn_recommend_box, .btn_recommend_box button')).map(element=>({element,parent:element.parentNode,next:element.nextSibling,type:element.getAttribute('type'),onclick:element.getAttribute('onclick')}));
</script><script src="/__testbed/fixture-client.js">`);
}

async function observe(page) {
    return page.evaluate(() => {
        const role = (name) => document.querySelector(`[data-dcuf-role="${name}"]`);
        const box = (element) => {
            const r = element.getBoundingClientRect();
            return { x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom };
        };
        const visual = (element) => {
            const s = getComputedStyle(element);
            return { ...box(element), display:s.display, fontSize:s.fontSize, color:s.color, background:s.backgroundColor, backgroundImage:s.backgroundImage, whiteSpace:s.whiteSpace, padding:s.padding, filter:s.filter, opacity:s.opacity, mixBlendMode:s.mixBlendMode };
        };
        const stats = ['article-view-count','article-recommend-count','article-comment-count'].map(name => ({role:name,...visual(role(name))}));
        const media = document.querySelector('.fixture-article-known-media');
        const ancestors = [];
        for (let current=media; current; current=current.parentElement) {
            const s=getComputedStyle(current);
            ancestors.push({role:current.getAttribute('data-dcuf-role'),filter:s.filter,opacity:s.opacity,blend:s.mixBlendMode});
        }
        const native = window.__articleRepairNative;
        const actions=role('recommendation-actions');
        return {
            viewport:{ width:innerWidth,height:innerHeight,screen:[screen.width,screen.height],dpr:devicePixelRatio,scale:visualViewport?.scale },
            state:role('article').getAttribute('data-dcuf-state'),
            stats, statGroup:visual(role('article-stat-group')), header:box(role('article-header')),
            scrap:visual(role('native-article-scrap')),
            media:{ ...visual(media),src:media.getAttribute('src'),complete:media.complete,naturalWidth:media.naturalWidth,ancestors },
            content:visual(role('article-content')), text:visual(document.querySelector('.fixture-article-readable')),
            icon:{...visual(role('recommend-up-icon')),star:getComputedStyle(role('recommend-up-icon'),'::before').content,label:getComputedStyle(role('recommend-up-icon'),'::after').content},
            actions:visual(actions), actionButtons:Array.from(actions.children).filter(n=>n.matches('button,a')).map(visual),
            nativeIdentity:native.every(entry=>entry.element.isConnected&&entry.element.parentNode===entry.parent&&entry.element.nextSibling===entry.next&&entry.element.getAttribute('type')===entry.type&&entry.element.getAttribute('onclick')===entry.onclick),
        };
    });
}

function checkObservation(observation, context) {
    const failures=[];
    const check=(condition,id,message)=>{ if(!condition)failures.push(`${context} ${id}: ${message}`); };
    const { stats,statGroup,scrap,media,actions,actionButtons,icon }=observation;
    // A flex item's inline-flex outer display is blockified to computed flex.
    check(stats.every(s=>s.width>20&&s.height>10&&s.height<36&&['flex','inline-flex'].includes(s.display)&&s.whiteSpace==='nowrap'),'UI-08','metadata spans must keep readable adjacent label/count groups');
    check(stats.slice(1).every((s,i)=>s.x>=stats[i].right-1&&Math.abs(s.y-stats[i].y)<5),'UI-08','view/recommend/comment groups must stay adjacent');
    check(stats[2].background==='rgba(0, 0, 0, 0)'&&stats[2].backgroundImage==='none'&&stats[2].padding==='0px'&&stats[2].width<110,'UI-08','comment count must not inherit comment-box geometry or material');
    check(statGroup.height<50&&statGroup.width<=observation.header.width,'UI-08','metadata must fit the header');
    check(scrap.width>=44&&scrap.height>=30&&parseFloat(scrap.fontSize)>=12&&scrap.color!=='rgba(0, 0, 0, 0)'&&scrap.color!=='transparent'&&scrap.backgroundImage==='none','UI-09','scrap must expose its native label with usable bounds and no sprite');
    check(media.complete&&media.naturalWidth===120&&media.width>0&&media.height>0&&media.src===knownMedia,'UI-10','known-color image must load unchanged');
    check(media.ancestors.every(s=>s.filter==='none'&&Number(s.opacity)===1&&s.blend==='normal'),'UI-10','media and every composing ancestor must preserve colors');
    if(observation.state==='dark')check(observation.content.color!=='rgb(68, 68, 68)'&&observation.text.color!=='rgb(68, 68, 68)','UI-10','dark article root and direct text must replace host #444');
    check(icon.backgroundImage==='none'&&icon.star==='"★"'&&icon.label==='"개념"','UI-11','recommendation icon must have one intended visual');
    check(actions.background==='rgba(0, 0, 0, 0)'&&actions.backgroundImage==='none'&&actions.height>50,'UI-11','action bar must be content-sized without the native gray strip');
    check(actionButtons.length>=4&&actionButtons.every(b=>b.width>0&&b.height>=30&&b.x>=actions.x-1&&b.right<=actions.right+1&&b.y>=actions.y-1&&b.bottom<=actions.bottom+1),'UI-11','all original actions must remain inside the wrapping bar');
    check(observation.nativeIdentity,'native-contract','native nodes, parents, order, control types and handlers must survive');
    return failures;
}

export async function runArticleRepairContract({ browser, server, outputDir=null, collectFailures=false, widths=[980,390,412] }) {
    if(outputDir)await mkdir(outputDir,{recursive:true});
    const publicDir=fileURLToPath(new URL('./public/',import.meta.url));
    const [fixtureCss,fixtureClient]=await Promise.all(['fixture.css','fixture-client.js'].map(name=>readFile(path.join(publicDir,name),'utf8')));
    const observations=[];
    const failures=[];
    for(const width of widths)for(const dark of [false,true]){
        const context=`${width}-${dark?'dark':'light'}`;
        const session=await createTestPage(browser,server.baseUrl,{
            storage:{[storageKeys.threshold]:0,[storageKeys.ratioEnabled]:false,[storageKeys.personalList]:{uids:[],nicknames:[],ips:[]}},
            viewport:{width,height:900}, screen:{width:412,height:900}, deviceScaleFactor:1,hasTouch:true,isMobile:false,
        });
        session.page.setDefaultTimeout(5000);
        session.page.setDefaultNavigationTimeout(20000);
        try{
            // Fulfill the same checked-in local assets as the server; this also
            // keeps the fixture usable in runners denying browser loopback I/O.
            await session.page.route('**/__testbed/fixture.css',route=>route.fulfill({status:200,contentType:'text/css',body:fixtureCss}));
            await session.page.route('**/__testbed/fixture-client.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:fixtureClient}));
            await session.page.route(url=>url.pathname==='/mgallery/board/view',route=>route.fulfill({status:200,contentType:'text/html',body:articleFixture({dark})}));
            await session.goto('/mgallery/board/view?id=test&no=1001&article-repair=1');
            await session.page.waitForFunction(()=>document.querySelector('.gallview_head .gall_scrap > button')?.getAttribute('data-dcuf-role')==='native-article-scrap'&&document.getElementById('dcuf-article-presenter'));
            await session.page.locator('.fixture-article-known-media').evaluate(image=>image.decode());
            const observation=await observe(session.page);
            observations.push({context,...observation});
            failures.push(...checkObservation(observation,context));
            if(outputDir)await session.page.locator('[data-dcuf-role="article"]').screenshot({path:path.join(outputDir,`${context}.png`)});
            // Real pointer and default keyboard activation against the original
            // fixture handlers. These are controlled local actions, never votes.
            const scrap=session.page.locator('[data-dcuf-role="native-article-scrap"]');
            await scrap.click();
            await scrap.focus();
            await scrap.press('Enter');
            assert.equal(await session.page.evaluate(()=>window.__articleRepairScrapCalls),2,`${context}: original scrap pointer/Enter handler`);
            const share=session.page.locator('[data-dcuf-role="native-recommendation-action"]').filter({hasText:'공유'});
            await share.click();
            assert.equal(await session.page.evaluate(()=>window.__articleRepairShareCalls),1,`${context}: original share handler`);
            // Explicit pressure for wrapping: no node is moved or replaced.
            await session.page.locator('.recom_bottom_box').evaluate(element=>element.style.inlineSize='150px');
            const wrapped=await observe(session.page);
            failures.push(...checkObservation(wrapped,`${context}-wrap`).filter(f=>!f.includes('UI-08')));
            await session.page.locator('.recom_bottom_box').evaluate(element=>element.style.removeProperty('inline-size'));
            for(const round of [!dark,dark]){
                await session.page.evaluate(enabled=>{
                    window.__dcufFixture.toggleDark(enabled);
                    document.body.classList.toggle('darkmode',enabled);
                },round);
                await session.page.waitForFunction(expected=>document.querySelector('[data-dcuf-role="article"]')?.getAttribute('data-dcuf-state')===(expected?'dark':'ready'),round);
                const roundTrip=await observe(session.page);
                failures.push(...checkObservation(roundTrip,`${context}-roundtrip-${round?'dark':'light'}`));
            }
            assert.deepEqual(session.consoleErrors.filter(message=>!message.includes('favicon')),[],`${context}: runtime errors`);
        }catch(error){failures.push(`${context}: ${error.stack||error.message}; console=${JSON.stringify(session.consoleErrors)}; url=${session.page.url()}`);}
        finally{await session.close();}
    }
    const report={kind:'ui-repair-article-contract',observations,failures};
    if(outputDir)await writeFile(path.join(outputDir,'report.json'),`${JSON.stringify(report,null,2)}\n`);
    if(!collectFailures)assert.deepEqual(failures,[],failures.join('\n'));
    return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
    const args=process.argv.slice(2);
    const argument=name=>args.includes(name)?args[args.indexOf(name)+1]:null;
    if(argument('--runtime'))process.env.DCUF_TESTBED_USERSCRIPT=path.resolve(argument('--runtime'));
    const runtimePath=await resolveBuiltUserscript();
    if(args.includes('--require-runtime-under-test'))assert.match(runtimePath,/[\\/]testbed[\\/]artifacts[\\/]runtime-under-test\.user\.js$/i);
    const sha256=createHash('sha256').update(await readFile(runtimePath)).digest('hex').toUpperCase();
    if(argument('--expected-sha'))assert.equal(sha256,argument('--expected-sha').toUpperCase());
    console.log(JSON.stringify({runtimePath,sha256}));
    const browser=await launchBrowser();
    const server=await startServer();
    try{
        const report=await runArticleRepairContract({browser,server,outputDir:argument('--output'),collectFailures:true});
        console.log(JSON.stringify({observations:report.observations.length,failures:report.failures}));
        if(report.failures.length)process.exitCode=1;
    }finally{await browser.close();await server.close();}
}
