import assert from 'node:assert/strict';

// Public native shape: both link groups float left inside the absolute links
// row. At390px the first UL wraps; darkmodebox then drops under search z4000.
// Preserve native parent order, fieldset/input identity and default form input.
export function withHeaderDarkToggleFixture(html) {
    // The live width1160 ancestor gives the native head a higher-specificity
    // fixed width; its auto margins move search when semantic width loses.
    const shellRoot = 'class="dcheader typea fixture-host-chrome"';
    assert.equal(html.split(shellRoot).length, 2);
    html = html.replace(shellRoot, 'class="dcheader typea fixture-host-chrome width1160"');
    const original=/<div class="dchead">[\s\S]*?<\/div><div class="gnb_bar">/;
    assert.equal([...html.matchAll(new RegExp(original.source,'g'))].length,1);
    html=html.replace(original,`<div class="dchead">
        <h1 class="dc_logo"><span>dcinside.com</span></h1>
        <div id="search_wrap" class="wrap_search"><form id="searchform" name="search_process" class="sch_smit" method="get" accept-charset="utf-8" action="" role="search" onsubmit="return fixtureGlobalSearch(event)"><fieldset>
            <div class="top_search clear"><div class="inner_search"><input class="in_keyword" type="text" name="search" id="preSWord" title="검색어 입력" placeholder="갤러리 &amp; 통합검색" accesskey="f" autocomplete="off" onfocus="fixtureSearchFocus(event)"></div><button type="submit" class="sp_img bnt_search" id="searchSubmit"><span class="blind">검색</span></button></div>
        </fieldset></form></div>
        <div class="area_links clear"><ul class="fl clear">${['마이너갤','미니갤','인물갤','갤로그','디시게임','이벤트','디시콘','로그인'].map((label,i)=>`<li><a href="#native-link-${i}" ${i===7?'class="btn_top_loginout"':''}>${label}</a></li>`).join('')}</ul>
            <div class="fl darkmodebox"><a href="javascript:;" class="darkonoff" onclick="fixtureDarkmode(event)"><em class="sp_img icon_tdark"></em>야간모드</a><div class="pop_tipbox join_tip dark" style="display:none">Native dark tip</div></div>
        </div>
    </div><div class="gnb_bar">`);
    html=html.replace('</head>',`<style id="fixture-header-dark-toggle">
        body { min-height:2000px; }
        #dcuf-testbed-controls { display:none !important; }
        .dchead { position:relative; height:105px; }
        .width1160 .dchead { width:1160px; margin:0 auto; }
        .dchead .dc_logo { position:absolute; left:0; top:40px; }
        .dchead .wrap_search { position:absolute; left:50%; top:37px; margin-left:-182px; width:364px; }
        .dchead .sch_smit, .dchead fieldset { margin:0; padding:0; border:0; }
        .dchead .top_search { position:relative; height:46px; z-index:4000; }
        .dchead .inner_search { float:left; width:315px; margin:4px 0 0 4px; }
        .dchead .in_keyword { width:297px; height:38px; padding:0 9px; margin:0; border:0; box-sizing:content-box; }
        .dchead .bnt_search { float:right; width:45px; height:46px; padding:0; border:0; }
        .dchead .area_links { position:absolute; top:9px; right:0; font:12px/18px Arial,sans-serif; }
        .area_links .fl, .area_links li { float:left; }
        .area_links ul { margin:0; padding:0; list-style:none; }
        .area_links li { width:47px; height:18px; }
        .area_links .darkmodebox { position:relative; }
        .area_links .darkonoff { margin-left:10px; }
        .area_links .icon_tdark { display:inline-block; width:15px; height:15px; }
        .dchead .clear::after { content:""; display:block; clear:both; }
    </style></head>`);
    return html.replace('</body>',`<script>
        window.__fixtureNativeHeader={darkCalls:0,searchCalls:0,focusCalls:0,trusted:[]};
        window.fixtureDarkmode=event=>{
            window.__fixtureNativeHeader.darkCalls++;window.__fixtureNativeHeader.trusted.push(event.isTrusted);
            const old=document.getElementById('css-darkmode');
            if(old)old.remove();else{const style=document.createElement('style');style.id='css-darkmode';style.textContent='html{color-scheme:dark}';document.head.append(style);}
        };
        window.fixtureGlobalSearch=event=>{window.__fixtureNativeHeader.searchCalls++;window.__fixtureNativeHeader.trusted.push(event.isTrusted);return false;};
        window.fixtureSearchFocus=event=>{window.__fixtureNativeHeader.focusCalls++;};
    </script></body>`);
}
