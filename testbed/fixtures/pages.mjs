import { imageCommentItem, liveCommentRows, liveListRows, longArticleNodes } from './builders.mjs';

const baseHead = (title, { dark = false } = {}) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><link rel="stylesheet" href="/__testbed/fixture.css">${dark ? '<style id="css-darkmode">html { color-scheme: dark; }</style>' : ''}</head>`;
const controls = `<aside id="dcuf-testbed-controls" aria-label="testbed controls">
    <button data-action="add-one-comment">댓글 1개</button><button data-action="add-100-comments">댓글 100개</button><button data-action="add-500-comments">댓글 500개</button>
    <button data-action="rerender-comments">댓글 재렌더</button><button data-action="insert-blocked">차단 UID</button><button data-action="insert-ads">광고 삽입</button>
    <button data-action="long-article">장문 노드</button><button data-action="dark">야간모드</button><button data-action="change-row">한 행 변경</button><button data-action="replace-list">목록 교체</button>
    <button data-action="change-style">style mutation</button><button data-action="uid-delay">UID delay</button><button data-action="uid-fail">UID fail</button><button data-action="uid-normal">UID normal</button>
</aside>`;
const scripts = `<script src="/__testbed/fixture-client.js"></script><script>
if (document.body.dataset.fixturePage === 'list') {
    const container = document.querySelector('#container article');
    container?.insertAdjacentHTML('afterbegin', '<div class="list_array_option" style="height:36px"><div class="array_tab left_box"><ul><li class="on"><a href="#" onclick="return false">All</a></li><li><a href="#" onclick="return false">Concept</a></li><li><a href="#" onclick="return false">Notice</a></li></ul></div><div class="center_box"></div><div class="right_box" style="position:absolute;right:0;top:0"><div class="output_array clear"><div class="select_box array_num"><select id="sarray_numbers" aria-label="rows per page"><option>50 items</option></select><div class="select_area"><a href="#" onclick="return false">50 items<em class="sp_img icon_option_more"></em></a></div><ul id="listSizeLayer" class="option_box"><li>30 items</li><li>50 items</li></ul></div><div class="switch_btnbox"><a class="btn_write txt" href="/board/write?id=test" onclick="window.__fixtureWriteClicks=(window.__fixtureWriteClicks||0)+1;return false">Write</a></div></div></div></div>');
    const tabs = document.querySelector('.list_bottom_btnbox');
    if (tabs) tabs.innerHTML = '<div class="fl"><button type="button" class="on">All</button><button type="button">Concept</button></div><div class="fr"><a class="btn_write write" href="/board/write?id=test" onclick="/* goWrite */window.__fixtureWriteClicks=(window.__fixtureWriteClicks||0)+1;return false">Write</a></div>';
    const paging = document.querySelector('.bottom_paging_box');
    if (paging) paging.innerHTML = '<a href="?id=test&page=1" class="sp_pagingicon page_first">First</a><a href="?id=test&page=15" class="sp_pagingicon page_prev">Previous</a><em>16</em><a href="?id=test&page=17">17</a><a href="?id=test&page=18">18</a><a href="?id=test&page=19">19</a><a href="?id=test&page=20">20</a><a href="?id=test&page=21">21</a><a href="?id=test&page=22">22</a><a href="?id=test&page=23">23</a><a href="?id=test&page=24">24</a><a href="?id=test&page=25">25</a><a href="?id=test&page=26">26</a><a href="?id=test&page=27">27</a><a href="?id=test&page=28">28</a><a href="?id=test&page=29">29</a><a href="?id=test&page=30">30</a><a href="?id=test&page=31" class="sp_pagingicon page_next">Next</a><a href="?id=test&page=999" class="sp_pagingicon page_end">End</a>';
    const searchForm = document.querySelector('form[name="frmSearch"]');
    if (searchForm) {
        searchForm.innerHTML = '<fieldset><legend>Search posts</legend><div class="bottom_search_wrap"><div class="search_left_box"><div class="select_box bottom_array"><button class="select_area" type="button">Title and content</button><span class="inner"></span></div><select name="search_type" aria-label="search type"><option value="title_content">Title and content</option><option value="title">Title</option></select></div><div class="search_right_box"><div class="bottom_search"><div class="inner_search"><input class="in_keyword" type="text" name="search_keyword" aria-label="search keyword"></div><button class="sp_img bnt_search" style="background-image:linear-gradient(#243d91,#243d91);background-position:center;background-repeat:no-repeat" type="button" aria-label="search" onclick="window.__fixtureSearchClicks=(window.__fixtureSearchClicks||0)+1">Go</button></div></div></div></fieldset>';
        const layer = document.getElementById('searchTypeLayer');
        if (layer) searchForm.appendChild(layer);
    }
        const hostPositionedSearch = searchForm?.querySelector('.bottom_search');
        if (hostPositionedSearch) {
            hostPositionedSearch.style.cssText += ';position:absolute;right:0;top:0;border:4px solid #3b4890;background:#3b4890;box-shadow:inset 0 0 0 1px #3b4890';
        }
    const moveBox = document.querySelector('.bottom_movebox');
    if (moveBox) moveBox.innerHTML = '<button class="btn_grey_roundbg btn_schmove" type="button">Go to page</button>';
}
if (document.body.dataset.fixturePage === 'view') {
    const embeddedList = document.querySelector('.fixture-view-list');
    embeddedList?.insertAdjacentHTML('beforebegin', '<div class="list_bottom_btnbox"><div class="fl"><button type="button" class="list_bottom btn_blue">All</button><button type="button" class="list_bottom btn_white">Concept</button></div><div class="fr"><a class="btn_write write" href="/board/write?id=test">Write</a></div></div><div class="bottom_paging_wrap"><div class="bottom_paging_box"><a href="?id=test&page=1" class="sp_pagingicon page_first">First</a><a href="?id=test&page=15" class="sp_pagingicon page_prev">Previous</a><em>16</em><a href="?id=test&page=17">17</a><a href="?id=test&page=18">18</a><a href="?id=test&page=19">19</a><a href="?id=test&page=20">20</a><a href="?id=test&page=21">21</a><a href="?id=test&page=22">22</a><a href="?id=test&page=23">23</a><a href="?id=test&page=24">24</a><a href="?id=test&page=25">25</a><a href="?id=test&page=26">26</a><a href="?id=test&page=27">27</a><a href="?id=test&page=28">28</a><a href="?id=test&page=29">29</a><a href="?id=test&page=30">30</a><a href="?id=test&page=31" class="sp_pagingicon page_next">Next</a><a href="?id=test&page=999" class="sp_pagingicon page_end">End</a></div><div class="bottom_movebox"><button class="btn_grey_roundbg btn_schmove" type="button">Go to page</button></div></div><form name="frmSearch"><fieldset><legend>Search posts</legend><div class="bottom_search_wrap"><div class="search_left_box"><div class="select_box bottom_array"><button class="select_area" type="button">Title and content</button><span class="inner"></span></div><select name="search_type" aria-label="search type"><option value="title_content">Title and content</option><option value="title">Title</option></select></div><div class="search_right_box"><div class="bottom_search" style="position:absolute;right:0;top:0;border:4px solid #3b4890;background:#3b4890;box-shadow:inset 0 0 0 1px #3b4890"><div class="inner_search"><input class="in_keyword" type="text" name="search_keyword" aria-label="search keyword"></div><button class="sp_img bnt_search" style="background-image:linear-gradient(#243d91,#243d91);background-position:center;background-repeat:no-repeat" type="button" aria-label="search">Go</button></div></div></div></fieldset><div id="searchTypeLayer"></div></form>');
    const viewActionAnchor = document.querySelector('.view_bottom');
    if (document.body.dataset.fixtureVariant !== 'mini') {
        viewActionAnchor?.insertAdjacentHTML('beforebegin', '<div class="view_bottom_btnbox clear" style="height:35px"><div class="fl"><button type="button" class="btn_blue concept">All</button><button type="button" class="btn_white concept">Concept</button></div><div class="fr" style="position:absolute;right:0"><button type="button" class="btn_grey modify">Edit</button><button type="button" class="btn_grey cancle">Delete</button><a class="btn_write write" href="/board/write?id=test">Write</a></div></div>');
    }
}

</script></body></html>`;

const tableHead = (variant) => `<thead><tr><th>번호</th>${variant === 'minor' ? '<th>구분</th>' : ''}<th>제목</th><th>작성자</th><th>날짜</th><th>조회</th><th>추천</th></tr></thead>`;
const listTable = (variant, className = '') => `<table class="gall_list ${className}">${tableHead(variant)}<tbody class="${className ? '' : 'listwrap2'}">${liveListRows(variant)}</tbody></table>`;
const headtextNav = (variant) => variant === 'major' ? '' : `<nav class="fixture-headtext-nav" aria-label="말머리 탐색">
    <a href="#" onclick="return listSearchHead(this)" data-fixture-headtext-nav="1">일반</a>
    <a href="#" onclick="return listSearchHead(this)" data-fixture-headtext-nav="1">🌳🌳</a>
    <button type="button" class="fixture-headtext-more" aria-label="말머리 더보기">▼</button>
    <div class="subject_morelist" hidden>
        <a href="#" onclick="return listSearchHead(this)" data-fixture-headtext-nav="1">🔫저격</a>
        <a href="#" onclick="return listSearchHead(this)" data-fixture-headtext-nav="1"><span data-val="®️ACT">®️ACT</span></a>
    </div>
</nav>`;

const hostChrome = `<header class="dcheader typea fixture-host-chrome"><div class="dchead">
    <h1 class="dc_logo"><span>dcinside.com</span></h1>
    <div class="wrap_search"><form><div class="top_search"><div class="inner_search"><input aria-label="통합검색"></div><button type="submit" class="sp_img bnt_search" aria-label="통합검색 실행"></button></div></form></div>
    <div class="area_links"><a class="btn_top_loginout" style="background:#3b4890;color:#fff" href="#login">로그인</a></div>
</div><div class="gnb_bar"><nav class="gnb"><ul class="gnb_list"><li><a href="#gallery">갤러리</a></li><li><a href="#minor">마이너갤</a></li><li><a href="#mini">미니갤</a></li><li><a href="#gallog">갤로그</a><em class="sp_img icon_next" style="background-image:linear-gradient(#3b4890,#3b4890)"></em></li></ul></nav></div>
<div class="newvisit_history"><strong class="tit">최근 방문</strong><button class="btn_open" type="button" aria-label="최근 방문 레이어 열기">▾</button><button class="bnt_visit_prev" type="button" aria-label="최근 방문 이전" onclick="this.parentElement.querySelector('.newvisit_list').style.left='0px'">‹</button><div class="newvisit_box"><ul class="newvisit_list">${Array.from({ length: 18 }, (_, index) => `<li><a class="${index === 0 ? 'on' : ''}" href="#recent-${index + 1}">최근 갤러리 ${index + 1}</a></li>`).join('')}</ul></div><button class="bnt_visit_next on" type="button" aria-label="최근 방문 다음" onclick="this.parentElement.querySelector('.newvisit_list').style.left='-1445px'">›</button><button class="bnt_newvisit_more" type="button">전체</button></div></header>`;

const galleryHeading = (variant) => `<header class="page_head fixture-gallery-heading"><div class="fl"><h2><a href="#gallery-title">테스트 갤러리</a>${variant === 'major' ? '' : `<div class="pagehead_titicon ${variant === 'mini' ? 'ngall' : 'mgall'} sp_img" style="background-image:linear-gradient(#3b4890,#3b4890)"><span class="blind">${variant === 'mini' ? '미니' : '마이너'}</span></div>`}</h2><form class="gall_search"><div class="inner_search"><input aria-label="닉네임 또는 IP 검색"><button type="submit" class="btn_search">검색</button></div></form></div></header>`;

export function listPage({ variant = 'major' } = {}) {
    const isMinor = variant === 'minor';
    const viewPath = isMinor ? '/mgallery/board/view' : '/board/view';
    const listPath = isMinor ? '/mgallery/board/lists' : '/board/lists';
    const galleryDoor = isMinor ? `<header class="page_head"><div class="fr gall_issuebox"><button type="button" class="relate" onclick="open_relation(6965)">연관 갤러리</button><button type="button" class="gall_useinfo" onclick="open_user_guide()">이용안내</button><button type="button" class="fixture-issue-more" onclick="gt_toggle_issue(this)"><span>더보기</span><em class="sp_img icon_listmore"></em></button></div></header><div class="issue_wrap" style="border-top:2px solid #3b4890" data-fixture-original-issue-wrap="1"><div id="relation_popup" class="pop_wrap type3" style="display:none"><div>연관 갤러리 원본 팝업</div></div><section class="issue_contentbox" data-fixture-original-door="1"><div class="minor_intro_box">원본 갤러리 대문</div><button type="button" class="btn_hotall_list" onclick="toggle_hot_rank_pop()">흥한갤 전체 순위</button><div id="hot_rank_pop2" class="pop_wrap type2" style="display:none;right:-1px;top:139px"><div class="pop_content pop_hot_mgall"><div class="hot_rank_list_wrap"><ul id="heung_list_ul_top" class="pop_hotmgall_listbox">${Array.from({ length: 100 }, (_, index) => `<li>${index + 1}. fixture gallery ${index + 1}</li>`).join('')}</ul></div></div><button type="button" class="under poply_close" onclick="toggle_hot_rank_pop()">닫기</button></div></section></div><script>window.__fixtureHotRankToggles=0;window.__fixtureHostHeaderToggles={relation:0,guide:0,issue:0};window.toggle_hot_rank_pop=()=>{const popup=document.getElementById('hot_rank_pop2');if(!popup)return;popup.style.display=popup.style.display==='none'?'block':'none';window.__fixtureHotRankToggles+=1;};window.open_relation=()=>{const popup=document.getElementById('relation_popup');popup.style.display=popup.style.display==='none'?'block':'none';window.__fixtureHostHeaderToggles.relation+=1;};window.open_user_guide=()=>{window.__fixtureHostHeaderToggles.guide+=1;};window.gt_toggle_issue=()=>{document.querySelector('.issue_wrap').classList.toggle('open');window.__fixtureHostHeaderToggles.issue+=1;};</script>` : '';
    return `${baseHead(`DCUF ${variant} list fixture`)}<body data-fixture-page="list" data-fixture-variant="${variant}">${hostChrome}${controls}${galleryHeading(variant)}${galleryDoor}<div id="top" class="dcwrap width1160 list_wrap"><main id="container" class="listwrap clear"><section class="left_content"><article>${headtextNav(variant)}<section class="gall_listwrap list">${listTable(variant)}</section><div class="bottom_paging_wrap"><div class="bottom_paging_box"><a href="${listPath}?id=test&page=2">2</a></div><div class="bottom_movebox"></div></div><div class="list_bottom_btnbox"></div><form name="frmSearch"><input name="search_keyword"><button>검색</button></form><div id="searchTypeLayer"></div></article></section></main></div><a id="fixture-to-view" href="${viewPath}?id=test&no=1001">본문으로 이동</a>${scripts}`;
}

const normalCommentComposer = `<div class="cmt_write_box fixture-normal-comment-composer">
    <div class="fl"><div class="user_info_input"><input type="text" aria-label="comment nickname"><input type="password" aria-label="comment password"></div></div>
    <div class="cmt_txt_cont"><div class="cmt_write"><textarea aria-label="comment body"></textarea></div><div class="cmt_cont_bottm"><div class="fr"><button type="button" class="btn_blue">Register</button></div></div></div>
</div>`;

const imageCommentComposer = `<div id="img_cmt_write_box_1" class="cmt_write_box fixture-image-comment-composer">
    <div class="fl"><div class="user_info_input"><input id="img_cmt_name_1" type="text" aria-label="image comment nickname"><input id="all_nick_name_1" type="hidden"></div></div>
    <div class="cmt_txt_cont"><div class="cmt_write"><textarea aria-label="image comment body"></textarea></div><div class="cmt_cont_bottm"><div class="fr"><button type="button" class="btn_blue">Register</button></div></div></div>
</div>`;

const replyCommentComposer = `<div class="reply show fixture-reply-composer-host"><div class="reply_box"><div class="cmt_write_box small fixture-reply-comment-composer">
    <div class="fl"><div class="user_info_input"><input type="text" aria-label="reply nickname"><input type="password" aria-label="reply password"><input type="text" aria-label="reply code"></div></div>
    <div class="cmt_txt_cont"><div class="cmt_write"><textarea aria-label="reply body"></textarea></div><div class="cmt_cont_bottm"><div class="fr"><button type="button" class="btn_blue">Register reply</button></div></div></div>
</div></div></div>`;

const recommendBox = `<div class="btn_recommend_box recommuse_y morebox fixture-recommend-box">
    <div class="inner_box"><div class="inner">
        <div class="up_num_box"><p class="up_num font_red" id="recommend_view_up_fixture">7</p><p class="sup_num"><span class="writer_nikcon"></span><span class="font_blue smallnum" id="recommend_view_up_fix_fixture">2</span></p></div>
        <button type="button" class="btn_recom_up"><span class="blind">개념 추천</span><em class="sp_img icon_recom_up"></em></button>
    </div><div class="inner">
        <button type="button" class="btn_recom_down"><span class="blind">비추천</span><em class="sp_img icon_recom_down"></em></button><div class="down_num_box"><p class="down_num">0</p></div>
    </div></div><div class="recom_bottom_box"><button type="button">공유</button><button type="button">스크랩</button><button type="button">신고</button><div class="pop_wrap type3 fixture-original-action-popup" style="display:block;position:absolute;width:320px;padding:11px;background:rgb(249, 250, 251);color:rgb(35, 42, 52);line-height:19px"><div class="pop_content" style="display:block;padding:7px;background:rgb(241, 243, 245);color:rgb(35, 42, 52);line-height:19px"><button type="button" class="fixture-original-popup-button" style="position:absolute;width:41px;height:19px;padding:3px;border-radius:0;background:rgb(223, 226, 230);color:rgb(35, 42, 52)">원본</button></div></div></div>
</div>`;

export function viewPage({ long = false, massComments = 0, variant = 'major', darkAtStart = false, brokenTheme = false } = {}) {
    const isMinor = variant === 'minor';
    const isMini = variant === 'mini';
    const comments = liveCommentRows(variant, massComments);
    const baseCommentCount = isMinor ? 9 : 4;
    const viewClass = isMini ? 'mini_view' : (isMinor ? 'minor_view' : 'gallery_view');
    const routeRoot = isMini ? '/mini' : (isMinor ? '/mgallery' : '');
    const listPath = `${routeRoot}/board/lists`;
    const viewPath = `${routeRoot}/board/view`;
    const miniButtons = isMini ? `<div class="view_bottom_btnbox clear"><div class="fr"><button type="button" class="btn_grey modify" onclick="window.__fixtureMiniButtonClicks=(window.__fixtureMiniButtonClicks||0)+1">수정</button><button type="button" class="btn_grey cancle" onclick="window.__fixtureMiniButtonClicks=(window.__fixtureMiniButtonClicks||0)+1">삭제</button><button type="button" id="btn_write" class="btn_lightpurple write" onclick="window.__fixtureMiniButtonClicks=(window.__fixtureMiniButtonClicks||0)+1">글쓰기</button></div></div><div class="fixture-mini-absolute-obstruction" aria-hidden="true"></div>` : '';
    const darkBootstrap = darkAtStart ? `<script>document.documentElement.classList.add('dc-filter-dark-mode')</script>` : '';
    const brokenThemeBootstrap = brokenTheme ? `<script>document.querySelector('.gallview_head')?.style.setProperty('box-shadow','none','important')</script>` : '';
    return `${baseHead(`DCUF ${variant} view fixture`, { dark: darkAtStart })}<body class="${darkAtStart ? 'dc-filter-dark-mode' : ''}" data-fixture-page="view" data-fixture-variant="${variant}">${darkBootstrap}${controls}<main id="container" class="clear ${viewClass}"><article class="view_content_wrap"><header class="view_content_wrap"><div class="gallview_head"><span class="title_subject">테스트 본문</span></div></header><section class="writing_view_box"><div class="write_div"><p>본문 시작</p>${long ? longArticleNodes(1600) : ''}<div id="fixture-long-article"></div></div></section><div class="view_ad_wrap" id="fixture-initial-ad"><iframe id="google_ads_iframe_fixture" title="advertisement"></iframe></div><div class="gall_exposure_list fixture-synthetic-related"><ul><li><span class="ub-writer" data-uid="safe-related-1" data-nick="관련글작성자"></span><a href="${viewPath}?id=test&no=2001">관련 글 1</a></li><li><span class="ub-writer" data-uid="blocked-related-user" data-nick="관련차단"></span><a href="${viewPath}?id=test&no=2002">관련 글 2</a></li></ul></div>${recommendBox}${miniButtons}</article><section id="focus_cmt"><div id="comment_wrap_1" class="gall_comment comment_wrap show"><div class="comment_count"><span class="num_box"><span class="font_red">${massComments || baseCommentCount}</span></span><div class="fr"><button type="button" class="btn_cmt_refresh" data-no="1001" data-sort="">새로고침</button></div></div><div class="comment_box"><ul class="cmt_list add">${comments}</ul></div></div>${normalCommentComposer}${replyCommentComposer}</section><section class="view_comment image_comment fixture-synthetic-image-comments"><div class="comment_wrap"><div class="comment_box img_comment_box"><ul class="cmt_list">${imageCommentItem(1, { uid: 'safe-image-user' })}${imageCommentItem(2, { uid: 'blocked-image-user' })}</ul></div>${imageCommentComposer}</div></section><div class="view_bottom"><a href="${listPath}?id=test">목록</a><section class="gall_listwrap fixture-view-list">${listTable(variant, 'fixture-view-table')}</section></div></main><a id="fixture-to-list" href="${listPath}?id=test">목록으로 이동</a>${brokenThemeBootstrap}${scripts}`;
}

export function blankPage() {
    return `${baseHead('DCUF navigation fixture')}<body data-fixture-page="blank"><main id="container"><p>navigation target</p><a href="/board/lists?id=test">목록으로</a></main>${scripts}`;
}
