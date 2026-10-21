import { writeFile, mkdir } from 'node:fs/promises';
import { assert, createTestPage, storageKeys, getMetrics, assertNoRuntimeErrors } from './harness/runner-utils.mjs';

// Native shapes missing from the earlier repair fixtures: contextual selected
// rules, generated sprites/clearfix, popup rows and auxiliary composer buttons.
const nativeShape = () => {
    document.getElementById('dcuf-testbed-controls')?.remove();
    const mini = location.pathname.startsWith('/mini/');
    if (mini) document.querySelector('#container').classList.add('miniwrap');
    const style = document.createElement('style');
    style.textContent = `
      .clear::after,.list_bottom_btnbox::after{content:'';display:block;clear:both}
      .array_tab button.on{background:#3b4890;border:1px solid #29367c;color:white}
      .miniwrap .array_tab button.on{background:#6f6dd9}
      .miniwrap .btn_write.txt{color:#4f4dc6}
      .btn_write.txt::before{content:'';display:inline-block;width:15px;height:15px;margin-top:2px;background:linear-gradient(45deg,blue,blue)}
      .bottom_paging_box{width:85%;height:48px;margin:0 auto}
      .listwrap .bottom_paging_wrap{padding:0 121px}
      .bottom_paging_wrap .bottom_paging_box.iconpaging{padding:6px 0}
      .bottom_paging_box a,.bottom_paging_box em,.bottom_paging_box span{margin:0 9px;line-height:20px}
      .sp_pagingicon{background-image:linear-gradient(blue,blue)}
      .iconpaging .page_first,.iconpaging .page_prev,.iconpaging .page_next,.iconpaging .page_end{font-size:0!important;width:12px;height:14px;background-position:-11px -19px}
      .bottom_array{border:1px solid #29367c;background:#3b4890}
      .center_box .inner{position:relative;display:inline-block}
      .center_box .inner>ul>li{padding-left:12px}
      .btn_subject_more{position:absolute;left:0;top:30px;width:16px;height:16px}
      .subject_morelist{position:absolute;right:0;top:31px;padding:3px;border:1px solid #ccc;background:white;width:74px}
      .subject_morelist li{height:19px;line-height:19px;white-space:nowrap}
      .subject_morelist a{display:block}
      .subject_inner{position:absolute;left:100%;top:3px;border:1px solid #ccc;white-space:nowrap;background:white}
      .blind{position:absolute;overflow:hidden;clip:rect(0,0,0,0);width:0;height:0;font-size:0}
      .user_info_input{position:relative;width:140px;height:30px;border:1px solid #cecdce}
      .user_info_input input{width:140px;height:28px;line-height:29px}
      .btn_circledel{position:absolute;right:4px;top:10px;width:12px;height:12px;padding:0;border:0;background:red}
      .tip_native{position:absolute;left:0;top:-24px}
      .tip_native button{width:12px;height:12px;padding:0;border:0}
      .cmt_info{padding:9px 12px 7px;border-top:1px solid #eee}
      .cmt_list li:first-child .cmt_info{border-top:none}
      .reply_list li{padding:9px 12px 7px;border-top:1px solid #ddd}
      .reply_info .usertxt{position:relative;width:774px;padding-left:16px}
      .reply_info .usertxt::before{content:' ';position:absolute;left:0;top:3px;display:block;width:8px;height:8px;background:blue}
      .cmt_cont_bottm .fr button{width:85px;height:30px;line-height:29px;font-size:12px}
      .cmt_cont_bottm .fr,.cmt_cont_bottm .dccon_guidebox{float:right}
    `;
    document.head.prepend(style);
    document.querySelector('#container')?.classList.add('listwrap');
    const tabs = document.querySelector('.list_array_option .array_tab');
    if (tabs) tabs.innerHTML = '<button type="button" class="on">전체글</button><button type="button">개념글</button><button type="button">공지</button>';
    const categories = document.querySelector('.list_array_option .center_box');
    if (categories) {
        categories.innerHTML = '<div class="inner"><ul><li><a href="javascript:;" class="on">일반</a></li><li><a href="javascript:;">긴 말머리 카테고리</a></li></ul><button type="button" class="btn_subject_more"><em class="sp_img icon_subject_more"></em><span class="blind">말머리 더보기</span></button><div class="subject_morelist" style="display:none"><ul>' + Array.from({length:8},(_,i)=>`<li><a href="javascript:;">선택 ${i+1}</a></li>`).join('') + '</ul></div></div>';
        categories.querySelector('.btn_subject_more').addEventListener('click',()=>{
            const popup=categories.querySelector('.subject_morelist');popup.style.display=popup.style.display==='none'?'block':'none';
        });
        categories.querySelectorAll('.subject_morelist a').forEach(a=>a.addEventListener('click',()=>{window.__liveNative.categoryClicks++;}));
    }
    document.querySelectorAll('table.gall_list tbody tr .gall_subject').forEach(subject=>{subject.removeAttribute('title');subject.innerHTML='말머리<span class="subject_inner" style="display:none">전체 말머리 설명</span>';});
    document.querySelector('.bottom_paging_box')?.classList.add('iconpaging');
    const search=document.querySelector('form[name="frmSearch"]');
    const nativeSelect=search?.querySelector('select[name="search_type"]');
    const nativeShell=search?.querySelector('.bottom_array');
    if(nativeSelect&&nativeShell)nativeShell.append(nativeSelect);
    search?.querySelector('legend')?.classList.add('blind');
    const searchButton=search?.querySelector('.bnt_search');
    if(searchButton)searchButton.innerHTML='<span class="blind">검색</span>';
    document.querySelectorAll('.view_bottom_btnbox').forEach(bar=>bar.classList.add('clear'));
    document.querySelectorAll('.reply_list .cmt_txtbox').forEach(body=>body.classList.add('reply_info'));
    document.querySelectorAll('.cmt_write_box').forEach(composer=>{
        const identity=composer.querySelector(':scope>.fl');
        identity.innerHTML='<div class="user_info_input"><input type="text" aria-label="nickname"><button type="button" class="btn_circledel" aria-label="clear nickname"></button><div class="tip_native"><button type="button" aria-label="close nickname tip"></button></div></div><div class="user_info_input"><input type="password" aria-label="password"></div>';
        const actions=composer.querySelector('.cmt_cont_bottm');actions.classList.add('clear');
        actions.innerHTML='<div class="dccon_guidebox"><button type="button" class="btn_white small tx_dccon">디시콘</button><button type="button" class="btn_white small tx_txtcon">글자콘</button></div><div class="fr"><button type="button" class="btn_blue">등록</button><button type="button" class="btn_blue btn_recommend">등록+추천</button></div>';
    });
    window.__liveNative={categoryClicks:0,buttonClicks:0,nodes:[]};
    document.querySelectorAll('.list_array_option button,.list_array_option a,.list_bottom_btnbox button,.list_bottom_btnbox a,.view_bottom_btnbox button,.view_bottom_btnbox a,.cmt_write_box input,.cmt_write_box textarea,.cmt_write_box button').forEach(element=>{
        window.__liveNative.nodes.push({element,parent:element.parentNode,next:element.nextSibling});
        if(element.matches('button'))element.addEventListener('click',()=>window.__liveNative.buttonClicks++);
    });
};
const shapeScript=`<script>(${nativeShape.toString()})()</script>`;
export { nativeShape as installLiveControlFixture };
const cases=[
    {prefix:'',width:1660,dark:false},{prefix:'',width:980,dark:true},
    {prefix:'/mgallery',width:980,dark:false},{prefix:'/mgallery',width:980,dark:true},
    {prefix:'/mini',width:1660,dark:false},{prefix:'/mini',width:980,dark:true},
    {prefix:'/mini',width:390,dark:false,stress:true},
];

export async function runLiveControlContract({browser,server}) {
    const reports=[];
    for(const scenario of cases) for(const kind of ['lists','view']) {
        const session=await createTestPage(browser,server.baseUrl,{viewport:{width:scenario.width,height:900},storage:{[storageKeys.threshold]:0,[storageKeys.ratioEnabled]:false,[storageKeys.palette]:'green',[storageKeys.fabScalePercent]:scenario.width===1660?160:100}});
        const {page}=session;
        const report={scenario,kind,checks:[]};
        const check=(id,pass,observed)=>report.checks.push({id,pass:Boolean(pass),observed});
        try {
            await page.route(url=>url.origin===server.baseUrl&&/\/board\/(lists|view)$/.test(url.pathname),async route=>{
                const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('</body>',`${shapeScript}</body>`)});
            });
            await session.goto(`${scenario.prefix}/board/${kind}?id=test&no=1001&comments=4`);
            if(scenario.dark)await page.evaluate(()=>{window.__dcufFixture.toggleDark(true);document.querySelectorAll('[data-dcuf-surface="list-toolbar"] *').forEach(el=>el.getAnimations().forEach(animation=>animation.finish()));});
            await page.waitForSelector('[data-dcuf-surface="list-item"]:visible');
            const observations=await page.evaluate(()=>{
                const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
                const expected=(element,property,value)=>{const probe=document.createElement('span');probe.style[property]=value;element.append(probe);const actual=getComputedStyle(probe)[property];probe.remove();return actual;};
                const bars=Array.from(document.querySelectorAll('[data-dcuf-surface="list-actions"],.view_bottom_btnbox'));
                const selected=document.querySelector('.list_array_option .array_tab button.on');
                const writes=Array.from(document.querySelectorAll('.list_array_option .btn_write.txt'));
                const search=document.querySelector('[data-dcuf-surface="list-search"]');
                const shell=search?.querySelector('.bottom_array');
                const directions=Array.from(document.querySelectorAll('.bottom_paging_box .sp_pagingicon'));
                const descriptions=Array.from(document.querySelectorAll('.custom-post-item .subject_inner'));
                const composers=Array.from(document.querySelectorAll('.cmt_write_box'));
                const submit=search?.querySelector('.bnt_search');
                return {
                    selected:selected&&{actual:getComputedStyle(selected).backgroundColor,expected:expected(selected,'backgroundColor','var(--dcuf-theme-accent-soft)'),color:getComputedStyle(selected).color,ink:expected(selected,'color','var(--dcuf-theme-accent-ink)')},
                    writes:writes.map(e=>({color:getComputedStyle(e).color,expected:expected(e,'color','var(--dcuf-theme-on-accent)'),image:getComputedStyle(e,'::before').backgroundImage})),
                    bars:bars.map(e=>{const end=e.querySelector(':scope>.fr');return {root:box(e),end:end&&box(end),padding:parseFloat(getComputedStyle(e).paddingRight),after:getComputedStyle(e,'::after').content};}),
                    shell:shell&&{border:getComputedStyle(shell).borderTopWidth,background:getComputedStyle(shell).backgroundColor},
                    searchIcon:submit&&{width:getComputedStyle(submit,'::before').width,height:getComputedStyle(submit,'::before').height,mask:getComputedStyle(submit,'::before').maskImage,align:getComputedStyle(submit).alignItems,justify:getComputedStyle(submit).justifyContent},
                    searchFlow:search&&{root:box(search),query:box(search.querySelector('.bottom_search'))},
                    directions:directions.map(e=>({box:box(e),image:getComputedStyle(e).backgroundImage,before:getComputedStyle(e,'::before').content,font:getComputedStyle(e,'::before').fontSize})),
                    paging:document.querySelector('.bottom_paging_wrap')&&{padding:parseFloat(getComputedStyle(document.querySelector('.bottom_paging_wrap')).paddingLeft),first:box(document.querySelector('.bottom_paging_box')).x-box(document.querySelector('.bottom_paging_wrap')).x},
                    descriptions:descriptions.map(e=>({display:getComputedStyle(e).display,box:box(e)})),
                    composers:composers.map(composer=>({
                        identity:Array.from(composer.querySelectorAll('.user_info_input')).map(e=>({border:getComputedStyle(e).borderTopWidth,box:box(e),field:box(e.querySelector('input'))})),
                        auxiliary:Array.from(composer.querySelectorAll('.btn_circledel,.tip_native button')).map(e=>({role:e.getAttribute('data-dcuf-role'),box:box(e)})),
                        submits:Array.from(composer.querySelectorAll('.cmt_cont_bottm>.fr>button')).map(e=>{const range=document.createRange();range.selectNodeContents(e);return {box:box(e),text:box(range),nowrap:getComputedStyle(e).whiteSpace};}),
                        actions:box(composer.querySelector('.cmt_cont_bottm')),
                    })),
                    commentInfo:Array.from(document.querySelectorAll('[data-dcuf-role="comment-info"]')).map(e=>getComputedStyle(e).borderTopWidth),
                    replies:Array.from(document.querySelectorAll('.reply_list')).map(list=>Array.from(list.querySelectorAll(':scope>li'),e=>({border:getComputedStyle(e).borderTopWidth,nativeIcons:Array.from(e.querySelectorAll('.usertxt'),text=>({content:getComputedStyle(text,'::before').content,display:getComputedStyle(text,'::before').display}))}))),
                    topology:window.__liveNative.nodes.every(({element,parent,next})=>element.isConnected&&element.parentNode===parent&&element.nextSibling===next),
                };
            });
            if(kind==='lists') {
                check('selected native tab follows palette',observations.selected?.actual===observations.selected?.expected&&observations.selected?.color===observations.selected?.ink,observations.selected);
                check('mini write uses on-accent and one decoration',observations.writes.length>0&&observations.writes.every(w=>w.color===w.expected&&w.image==='none'),observations.writes);
                check('native search select shell has no second frame',observations.shell?.border==='0px'&&observations.shell?.background==='rgba(0, 0, 0, 0)',observations.shell);
                check('search glyph has a centered square box',observations.searchIcon?.width==='20px'&&observations.searchIcon?.height==='20px'&&observations.searchIcon?.mask!=='none'&&observations.searchIcon?.align==='center'&&observations.searchIcon?.justify==='center',observations.searchIcon);
                check('wrapped search query fills the available row',observations.searchFlow.query.right>=observations.searchFlow.root.right-20,observations.searchFlow);
                const recent=await page.evaluate(()=>{
                    const list=document.querySelector('.custom-mobile-list');
                    const link=Array.from(list.querySelectorAll('a.post-title-link')).find(e=>e.getBoundingClientRect().width>0);
                    window.__dcufMobileConvenienceModule.markRecentCard(list,new URL(link.href).searchParams.get('no'));
                    const label=list.querySelector('.dcuf-recent-label'),card=label.closest('.custom-post-item');
                    const probe=document.createElement('span');probe.style.color='var(--dcuf-theme-accent-ink)';label.append(probe);const color=getComputedStyle(probe).color;probe.remove();
                    return {color:getComputedStyle(label).color,expected:color,font:parseFloat(getComputedStyle(label).fontSize),state:card.classList.contains('dcuf-recent-post')};
                });
                check('recent state uses readable restrained badge',recent.state&&recent.color===recent.expected&&recent.font>=11,recent);
                const toggle=page.locator('.btn_subject_more');
                await toggle.scrollIntoViewIfNeeded();
                const category=await toggle.evaluate(e=>{const r=e.getBoundingClientRect(),shell=e.closest('.inner').getBoundingClientRect();return {contained:r.y>=shell.y-1&&r.bottom<=shell.bottom+1,width:r.width,height:r.height};});
                check('category toggle remains in its row',category.contained&&category.width>=32&&category.height>=32,category);
                await toggle.click();
                const popup=page.locator('.list_array_option .center_box .subject_morelist');
                const menu=await popup.evaluate(e=>{const root=e.getBoundingClientRect(),links=Array.from(e.querySelectorAll('a'),a=>a.getBoundingClientRect());return {display:getComputedStyle(e).display,nonOverlap:links.every((r,i)=>i===0||r.top>=links[i-1].bottom-1),contained:links.every(r=>r.width>0&&r.height>=30&&r.left>=root.left-1&&r.right<=root.right+1&&r.top>=root.top-1&&r.bottom<=root.bottom+1)};});
                check('native category popup options do not overlap',menu.display!=='none'&&menu.nonOverlap&&menu.contained,menu);
                await popup.locator('a').last().click();
                check('native category option receives trusted click',await page.evaluate(()=>window.__liveNative.categoryClicks===1));
                await toggle.click();
                const badge=page.locator('.custom-post-item .gall_subject:has(.subject_inner):visible').first();
                await badge.hover();
                check('description remains in existing tooltip',await page.locator('#custom-instant-tooltip').evaluate(e=>getComputedStyle(e).display!=='none'&&e.textContent==='전체 말머리 설명'));
                await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
                const searchHit=await page.locator('form[name="frmSearch"] .bnt_search').evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {hit:Boolean(hit&&(hit===e||e.contains(hit))),target:hit?.className};});
                check('last search button remains reachable below menu',searchHit.hit,searchHit);
            }
            check('footer end group aligns with trailing edge',observations.bars.length>0&&observations.bars.every(b=>!b.end||b.root.right-b.end.right<=b.padding+2),observations.bars);
            check('page directions have one centered visible decoration',observations.directions.length>0&&observations.directions.every(d=>d.image==='none'&&d.before&&!['none','normal','""'].includes(d.before)&&parseFloat(d.font)>=16&&d.box.width>=36),observations.directions);
            check('paging uses owned row padding',observations.paging?.padding<=24&&observations.paging?.first<=25,observations.paging);
            check('row descriptions stay outside visible title flow',observations.descriptions.length>0&&observations.descriptions.every(d=>d.display==='none'&&d.box.width===0),observations.descriptions);
            if(kind==='view') {
                check('ordinary comment has no inner top rule',observations.commentInfo.length>0&&observations.commentInfo.every(b=>b==='0px'),observations.commentInfo);
                check('reply separators occur only between siblings',observations.replies.length>0&&observations.replies.every(items=>items.every((r,i)=>r.border===(i===0?'0px':'1px'))),observations.replies);
                check('legacy reply marker cannot overlap text',observations.replies.every(items=>items.every(r=>r.nativeIcons.every(i=>i.display==='none'||['none','normal','""'].includes(i.content)))),observations.replies);
                check('credential wrappers have one contained field border',observations.composers.length>0&&observations.composers.every(c=>c.identity.every(i=>i.border==='0px'&&i.field.y>=i.box.y-1&&i.field.bottom<=i.box.bottom+1)),observations.composers.map(c=>c.identity));
                check('native auxiliary controls remain native-sized',observations.composers.every(c=>c.auxiliary.every(a=>a.role!=='native-comment-submit'&&a.box.width===12&&a.box.height===12)),observations.composers.map(c=>c.auxiliary));
                check('submit and recommend labels remain on one line',observations.composers.every(c=>c.submits.every(s=>s.nowrap==='nowrap'&&s.text.height<=20&&s.box.y>=c.actions.y-1&&s.box.bottom<=c.actions.bottom+1)),observations.composers.map(c=>c.submits));
                await page.locator('.fixture-normal-comment-composer .cmt_cont_bottm>.fr>button').first().click();
                check('native register listener preserved',await page.evaluate(()=>window.__liveNative.buttonClicks===1));
                const ownership=await page.evaluate(()=>{
                    const bar=document.querySelector('.view_bottom_btnbox'),root=document.querySelector('[data-dcuf-surface="list-host"]');
                    window.__dcufListHostAdapter.connect({listWrap:root,actionBar:bar});
                    window.__dcufArticleHostAdapter.refresh(document);
                    window.__dcufListHostAdapter.connect({listWrap:root,actionBar:bar});
                    return {role:bar.getAttribute('data-dcuf-role'),surface:bar.getAttribute('data-dcuf-surface')};
                });
                check('article action owner stable across embedded-list refresh',ownership.role==='article-native-actions'&&ownership.surface!=='list-actions',ownership);
            }
            check('original control identity/order preserved',observations.topology);
            assertNoRuntimeErrors(await getMetrics(page),session.consoleErrors);
            reports.push(report);
        } finally {await session.close();}
    }
    await mkdir('testbed/artifacts',{recursive:true});
    await writeFile('testbed/artifacts/ui-live-control-latest.json',JSON.stringify(reports,null,2));
    assert.deepEqual(reports.flatMap(r=>r.checks.filter(c=>!c.pass).map(c=>({scenario:r.scenario,kind:r.kind,id:c.id}))),[],'Live native control composition; details: testbed/artifacts/ui-live-control-latest.json');
}
