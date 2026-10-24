import assert from 'node:assert/strict';
import {withHeaderDarkToggleFixture} from './header-dark-toggle.mjs';

// Anonymous public wutheringwaves sample,2026-10-20: eight original GNB links,
//44px native nav/list, one page_head with left title and right actions. The
// observed candidate heading was fixed at50px; actions occupied44px including
//12px native top padding. Model this finite pressure, not a complete host DOM.
export function withHeaderCompositionFixture(html) {
    html=withHeaderDarkToggleFixture(html);
    const gnb=/<ul class="gnb_list">[\s\S]*?<\/ul>/;
    assert.equal([...html.matchAll(new RegExp(gnb.source,'g'))].length,1);
    html=html.replace(gnb,`<ul class="gnb_list clear">${['갤러리','마이너갤','미니갤','인물갤','갤로그','이벤트','디시콘','광고문의'].map((text,i)=>`<li><a href="#native-gnb-${i}">${text}</a></li>`).join('')}</ul>`);
    const actions=/<header class="page_head">(<div class="fr gall_issuebox">[\s\S]*?<\/div>)<\/header>/;
    const match=html.match(actions);assert.ok(match,'minor original action group');
    html=html.replace(actions,'');
    const end='</form></div></header>';assert.equal(html.split(end).length,2);
    html=html.replace(end,'</form></div>'+match[1].replace('</div>','<button type="button" class="fixture-address">갤주소 복사</button><button type="button" class="fixture-settings">설정</button></div>')+'</header>');
    return html.replace('</head>',`<style id="fixture-header-composition">
        .gnb_bar nav.gnb { position:relative; z-index:1001; height:44px; }
        .gnb_list { height:44px; margin:0; padding:0; list-style:none; }
        .gnb_list>li { height:44px; margin:0 10px; line-height:44px; }
        .gnb_list>li>a { white-space:nowrap; font:700 14px Arial,sans-serif; }
        .page_head { height:50px; margin-bottom:3px; border-bottom:2px solid #3b4890; }
        .page_head h2 { font:700 22px/26px Arial,sans-serif; margin:0; }
        .fixture-gallery-heading .gall_search { display:none; }
        .gall_issuebox { padding-top:12px; }
        .gall_issuebox>button { font:12px/16px Arial,sans-serif; padding:0; border:0; background:transparent; }
    </style></head>`);
}
