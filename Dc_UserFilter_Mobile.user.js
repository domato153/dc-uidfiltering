// ==UserScript==
// @name         DC_UserFilter_Mobile
// @namespace    http://tampermonkey.net/
// @version      2.2.1
// @description  유저 필터링, UI 개선 
// @author       domato153 (Refactored by Assistant)
// @match        https://gall.dcinside.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @run-at       document-start
// @license      MIT
// ==/UserScript==

/*-----------------------------------------------------------------
DBAD license / Copyright (C) 2025 domato153
https://github.com/philsturgeon/dbad/blob/master/LICENSE.md
https://namu.wiki/w/DBAD%20%EB%9D%BC%EC%9D%B4%EC%84%A4%EC%8A%A4
------------------------------------------------------------------*/

(function() {
    'use strict';

    // [개선] 전역 스코프 오염 방지를 위해 스크립트 상태 변수를 IIFE 내부 스코프로 이동
    let dcFilterSettings = {};
    let userSumCache = {};
    let isInitialized = false;
    let isUiInitialized = false;
    let activeShortcutObject = null; // [v2.1 추가] 현재 활성화된 단축키 객체


     // =================================================================
    // ======================== UI Module Style ========================
    // =================================================================
    GM_addStyle(`
        /* [v2.2.3 최종 수정] JS 의존성을 제거한 선언적 FOUC 방지 (새로고침 깜빡임 완벽 해결) */
        /* 스크립트 UI 준비가 완료되기 전까지 body를 숨겨 원본 UI 노출을 원천 차단합니다. */
        body:not(.script-ui-ready) {
            visibility: hidden !important;
        }
        /* body가 숨겨진 상태에서도 로딩 인디케이터는 표시되도록 합니다. */
        body:not(.script-ui-ready)::before {
            content: '스크립트 UI 적용 중...';
            visibility: visible !important; /* body가 hidden이어도 로딩 문구는 보이도록 설정 */
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 16px;
            font-weight: bold;
            color: #555;
            background-color: #fff;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 0 15px rgba(0,0,0,0.2);
            z-index: 2147483647; /* Max z-index */
        }

        /* [수정] FOUC(화면 깜빡임) 방지 및 원본 테이블 숨김 강화 */
        table.gall_list {
            visibility: hidden !important; position: absolute !important;
            top: -9999px !important; left: -9999px !important;
            height: 0 !important; overflow: hidden !important;
        }

        /* [수정] 불필요한 PC버전 요소 숨김 */
        #dc_header, #dc_gnb, .adv_area, .right_content, .dc_all, .dcfoot, .dc_ft, .info_policy, .copyrigh, .ad_bottom_list, .bottom_paging_box + div, .intro_bg, .fixed_write_btn, .bottom_movebox, .zzbang_div, .my_zzal, .my_dccon, .issue_contentbox, #gall_top_recom.concept_wrap,
        .gall_exposure, .stickyunit {
            display: none !important;
        }

        /* --- 기본 레이아웃 재정의 --- */
        /* [개선] 마이너 갤러리 상단 링크 영역 모바일 최적화 */
        .minor_intro_area {
            display: block !important; /* 숨김 처리를 확실히 무효화 */
            padding: 10px 15px !important;
            background: #f8f9fa !important;
            border-bottom: 1px solid #e5e5e5;
            width: 100% !important;
            box-sizing: border-box !important;
        }
        .minor_intro_area .user_wrap {
            display: flex !important;
            justify-content: space-around !important;
            align-items: center !important;
            gap: 10px;
            padding: 0 !important;
            margin: 0 auto !important;
            max-width: 500px; /* 링크들이 너무 퍼지지 않게 중앙 정렬 효과 */
        }

        body { background: #fff !important; }
        html, body { overflow-x: hidden !important; }

        html, body, #top, .dcheader, .gnb_bar, #container, .wrap_inner, .visit_bookmark,
        .list_array_option, .left_content,
        .view_content_wrap, .gall_content, .gall_comment {
            width: 100% !important; /* 100vw 대신 100% 사용 */
            min-width: 0 !important; float: none !important;
            position: relative !important; box-sizing: border-box !important;
            margin: 0 !important; padding: 0 !important;
        }
        #container { padding-top: 5px; }

        /* [수정] dcheader(상단 전체) 및 dchead(내부 컨테이너) 반응형 스타일 */
        .dcheader.typea { min-width: 0 !important; width: 100% !important; height: auto !important; background: #fff; border-bottom: 1px solid #e5e5e5; }
        .dchead {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 8px 15px !important;
            gap: 15px !important;
            min-width: 320px;
            box-sizing: border-box !important;
            width: 100% !important;
        }

        .dchead h1.dc_logo { flex-shrink: 0 !important; margin: 0 !important; display: block !important; }
        .dchead h1.dc_logo img.logo_img { height: 22px !important; width: auto !important; }
        .dchead h1.dc_logo img.logo_img2 { display: none !important; }

        .dchead .wrap_search { flex-grow: 1 !important; min-width: 100px !important; max-width: 600px; }
        .dchead .top_search { width: 100% !important; }

        .dchead .area_links { display: block !important; flex-shrink: 0 !important; white-space: nowrap !important; }

        /* [추가] 갤러리 헤더(제목, 설정 버튼 등) 반응형 스타일 */
        .page_head {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 10px 15px !important;
            box-sizing: border-box !important;
            width: 100% !important;
            min-height: 50px;
            flex-wrap: wrap;
            gap: 10px;
        }
        /* [수정됨] .fr 오른쪽 정렬을 위해 margin-left: auto 사용 */
        .page_head > .fl { float: none !important; }
        .page_head > .fr {
            float: none !important;
            margin-left: auto; /* 핵심: 이 속성으로 오른쪽 끝으로 밀어냄 */
            display: flex;
            align-items: center;
            gap: 8px; /* 버튼 등 내부 요소간 간격 */
        }

        /* [추가] Clearfix: float으로 인한 부모 요소의 높이 붕괴 방지 */
        .page_head::after, .list_array_option::after {
            content: ""; display: table; clear: both;
        }

        /* [추가] 일반/마이너 갤러리 글 목록 상단 공통 여백 */
        .list_array_option {
            margin-bottom: 10px !important;
        }

        /* [수정] gnb_bar (메인 GNB) 반응형 스타일 개선 */
        .gnb_bar { display: block !important; width: 100% !important; min-width: 0 !important; height: auto !important; box-sizing: border-box !important; background: #3b4890 !important; }
        .gnb_bar nav.gnb { width: auto !important; min-width: 0 !important; padding: 0 15px !important; display: flex !important; justify-content: center !important; }
        .gnb_bar .gnb_list { display: flex; flex-wrap: wrap; justify-content: space-around; width: 100% !important; }

        /* [개선] newvisit_history (최근 방문 갤러리) 상/하단 선 모두 제거 */
        .newvisit_history { display: flex !important; align-items: center; width: 100% !important; min-width: 0 !important; height: auto !important; padding: 8px 10px !important; background: #f8f9fa !important; border: none !important; box-sizing: border-box !important; gap: 5px; }
        .newvisit_history::before { display: none !important; }
        .newvisit_history > .tit { flex-shrink: 0; margin: 0 !important; padding-right: 5px; font-size: 14px !important; font-weight: bold; color: #333; }
        .newvisit_history > .newvisit_box { flex: 1; min-width: 0; overflow: hidden; }
        .newvisit_history .newvisit_list { display: flex; flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .newvisit_history .newvisit_list::-webkit-scrollbar { display: none; }
        .newvisit_history .newvisit_list li { white-space: nowrap; flex-shrink: 0; }
        .newvisit_history > .bnt_visit_prev, .newvisit_history > .bnt_visit_next, .newvisit_history > .btn_open, .newvisit_history > .bnt_newvisit_more { flex-shrink: 0; position: static !important; transform: none !important; margin: 0 !important; padding: 0 4px; }

        /* [최종 수정] 마이너 갤러리 전용 탭/말머리 레이아웃 (v1.0.5) */
        .is-mgallery .list_array_option {
            display: flex !important;
            align-items: center !important; /* 세로 중앙 정렬 */
            flex-wrap: nowrap !important; /* 자식 요소들이 줄바꿈되지 않도록 강제 */
            width: 100% !important;
            box-sizing: border-box !important;
            padding: 10px 15px !important;
            margin-bottom: 10px !important;
            gap: 10px; /* 요소들 사이의 간격 */
        }

        /* 모든 자식 div의 float 속성 원천 차단 및 기본 너비 설정 */
        .is-mgallery .list_array_option > div {
            float: none !important;
            width: auto !important; /* [핵심] 원본 CSS의 width: 1% 덮어쓰기 */
            flex-shrink: 0; /* 기본적으로 내용물 크기 유지 */
        }

        /* [신규] '전체글/개념글' 탭 컨테이너(.array_tab) 직접 스타일링 */
        .is-mgallery .list_array_option .array_tab {
            display: flex !important;
            white-space: nowrap; /* 버튼 줄바꿈 방지 */
            gap: 4px; /* 버튼 사이 간격 */
        }

        /* 중앙 요소 (주로 말머리) - 남는 공간 모두 차지 */
        .is-mgallery .list_array_option > .center_box {
            flex-grow: 1; /* 남는 공간을 모두 차지 */
            flex-shrink: 1; /* 공간 부족 시 줄어들도록 허용 */
            min-width: 0; /* 내용이 길어도 줄어들 수 있도록 설정 */
            justify-content: center !important; /* 내부 아이템 중앙 정렬 */
            display: flex !important;
            flex-wrap: wrap;
            gap: 5px;
            background: none !important;
            padding: 0 !important;
            border: none !important;
            margin: 0 !important;
        }

        /* 오른쪽 요소 (글쓰기 버튼 등) - 오른쪽 끝으로 정렬 */
        .is-mgallery .list_array_option > .right_box {
            margin-left: auto; /* 왼쪽 요소들과 최대한 멀리 떨어지도록 설정 */
        }
        /* --- 마이너 갤러리 레이아웃 수정 완료 --- */

        /* [해결] 마이너 갤러리에서 헤더와 글 목록 겹침 현상 방지 */
        .is-mgallery .gall_listwrap {
            margin-top: 0 !important; /* 위에서 list_array_option의 margin-bottom으로 간격을 조절하므로 0으로 초기화 */
        }

        /* --- 커스텀 모바일 리스트 UI --- */
        .custom-mobile-list {
            border-top: 1px solid #ddd;
            background: #fff;
        }

        .custom-post-item.notice + .custom-post-item:not(.notice):not(.concept),
        .custom-post-item.concept + .custom-post-item:not(.notice):not(.concept) { border-top: 1px solid #4263eb !important; }
        .custom-post-item { display: block; padding: 15px 18px; border-bottom: 1px solid #e6e6e6; text-decoration: none; color: #333; }
        .custom-post-item:hover { background-color: #f8f9fa; }
        .custom-post-item .author { cursor: pointer; }
        .custom-post-item.notice, .custom-post-item.concept { background-color: #f8f9fa; position: relative; padding-left: 60px; }
        .custom-post-item.notice::before { content: '공지'; background-color: #e03131; position: absolute; left: 18px; top: 50%; transform: translateY(-50%); font-size: 13px; font-weight: bold; color: #fff; padding: 4px 9px; border-radius: 4px; }
        .custom-post-item.concept::before { content: '개념'; background-color: #4263eb; position: absolute; left: 18px; top: 50%; transform: translateY(-50%); font-size: 13px; font-weight: bold; color: #fff; padding: 4px 9px; border-radius: 4px; }
        
        /* [v2.2.0 이식] 게시글 목록: 제목, 말머리, 댓글수 */
        .post-title { 
            font-weight: 500; 
            color: #333; 
            margin-bottom: 10px; 
            word-break: break-all;
            line-height: 1.5 !important;
            display: flex !important;
            align-items: center !important;
        }
        .post-title a { 
            color: inherit; 
            text-decoration: none; 
            display: flex; 
            align-items: center; 
            font-size: 24px !important; /* 폰트 크기 키움 */
        }
        .post-title a:visited { color: #770088; }
        .post-title .gall_subject { color: #9b6b43 !important; font-weight: bold !important; margin-right: 6px; }
        .post-title .reply_num { 
            color: #4263eb !important; 
            font-weight: bold !important; 
            margin-left: 8px !important; /* 간격 조정 */
            cursor: pointer; 
            flex-shrink: 0 !important;
        }
        
        /* [v2.2.0 이식] 게시글 목록: 작성자, 통계 */
        .post-meta { display: flex; justify-content: space-between; align-items: center; color: #888; }
        .post-meta .author { display: flex; align-items: center; }
        .post-meta .author .gall_writer { display: inline !important; padding: 0 !important; text-align: left !important; border: none !important; }
        .post-meta .author .nickname { 
            color: #555 !important;
            font-size: 15px !important; /* 폰트 크기 키움 */
            font-weight: 500 !important;
        }
        .post-meta .author .ip { color: #555 !important; }
        .post-meta .stats { 
            display: flex; 
            gap: 10px;
            font-size: 15px !important; /* 폰트 크기 키움 */
        }

        /* --- 커스텀 하단 컨트롤 UI --- */
        .custom-bottom-controls { display: flex; flex-direction: column; align-items: center; padding: 15px; background: #fff; }
        .custom-bottom-controls form[name="frmSearch"] { display: flex !important; width: 100%; max-width: 500px; box-sizing: border-box !important; margin: 15px 0 !important; gap: 5px; flex-wrap: nowrap !important; }
        .custom-bottom-controls form[name="frmSearch"] .search_left_box { flex: 0 1 auto; }
        .custom-bottom-controls form[name="frmSearch"] .search_right_box { display: flex; flex: 1 1 0; }
        .custom-bottom-controls form[name="frmSearch"] input[type="text"] { width: 100% !important; min-width: 100px; }
        .custom-button-row { width: 100%; }
        .custom-button-row .list_bottom_btnbox { display: flex !important; align-items: center !important; width: 100% !important; gap: 10px; }
        .custom-button-row .list_bottom_btnbox > .fl { flex-grow: 1; }
        .custom-button-row .list_bottom_btnbox > .fr { flex-shrink: 0; }
        .custom-button-row .list_bottom_btnbox > div { float: none !important; }
        .custom-bottom-controls .page_box { float: none !important; display: inline-block; }

        /* --- 글 보기/댓글 UI --- */
        .gall_content, .gall_tit_box, .gall_writer_info, .gallview_contents, .btn_recommend_box, .view_bottom, .gall_comment, .comment_box { background: #fff !important; padding: 15px !important; border-bottom: 1px solid #ddd; }
        .gallview_contents img, .gallview_contents video { max-width: 100% !important; height: auto !important; box-sizing: border-box; }
        
        /* [v2.2.0 이식] 글 본문 가독성 개선 */
        .view_content_wrap .title_subject {
            font-size: 21px !important;
            font-weight: 500 !important;
        }
        .gallview_contents {
            font-size: 26px !important;
            line-height: 1.9 !important;
        }
        .gallview_contents p,
        .gallview_contents div,
        .gallview_contents span {
            font-size: inherit !important;
            line-height: inherit !important;
            color: inherit !important;
        }

        /* [v2.2.0 이식] 댓글 가독성 개선 */
        .comment_box .usertxt {
            font-size: 18px !important;
            line-height: 1.7 !important;
        }
        .comment_box .date_time {
            font-size: 15px !important;
        }
        
        /* [v2.2.0 이식] 추천/비추천 버튼 UI 개선 */
        .btn_recommend_box .writer_nikcon,
        .btn_recommend_box .font_blue.smallnum {
            display: none !important;
        }
        .btn_recommend_box {
            display: flex !important;
            flex-wrap: wrap !important; 
            justify-content: center !important; 
            align-items: center !important;
            gap: 5px 8px !important; 
            border: none !important;
            padding: 10px !important;
        }
        .btn_recommend_box .inner_box,
        .btn_recommend_box .recom_bottom_box {
            display: contents !important;
        }
        .btn_recommend_box .inner_box > .inner {
            display: inline-flex !important;
            align-items: center !important;
            gap: 5px !important;
            border: 1px solid #ddd;
            padding: 8px 12px;
            border-radius: 5px;
            background-color: #f8f9fa;
        }
        .btn_recommend_box button,
        .btn_recommend_box .up_num_box,
        .btn_recommend_box .down_num_box {
            position: static !important;
            float: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: auto !important;
            height: auto !important;
            background: none !important;
        }
        .btn_recommend_box .up_num,
        .btn_recommend_box .down_num {
            font-size: 16px !important;
            font-weight: bold !important;
            color: #333 !important;
        }
        
        .cmt_write_box { display: flex !important; flex-wrap: wrap !important; gap: 10px !important; padding: 10px !important; }
        .cmt_write_box .fl { float: none !important; flex-basis: 200px; flex-shrink: 1; min-width: 180px; }
        .cmt_write_box .fl .usertxt { display: flex; flex-direction: column; gap: 5px; }
        .cmt_write_box .fl .usertxt input { width: 100% !important; box-sizing: border-box; }
        .cmt_write_box .cmt_txt_cont { flex: 1; min-width: 250px; padding: 0 !important; }
        .cmt_write_box .cmt_txt_cont textarea { width: 100% !important; height: 85px !important; box-sizing: border-box !important; resize: vertical; }
        .cmt_write_box .cmt_cont_bott { width: 100%; padding: 0 !important; }
        .cmt_write_box .cmt_btn_bot { display: flex; justify-content: flex-end; }
        @media screen and (max-width: 600px) {
            .cmt_write_box { flex-direction: column !important; }
            .cmt_write_box .fl, .cmt_write_box .cmt_txt_cont { flex-basis: auto; width: 100% !important; min-width: 100%; }
        }

        /* [개선] --- 글쓰기 페이지 전용 스타일 --- */
        .is-write-page #container { background: #fff !important; padding: 0 !important; }
        .is-write-page .center_content, .is-write-page .gall_write, .is-write-page .write_box { padding: 0 !important; border: none !important; box-shadow: none !important; margin: 0 !important; }
        .is-write-page .write_box { padding: 15px !important; }
        .is-write-page .write_box > table, .is-write-page .write_box .w_top > tbody, .is-write-page .write_box .w_top > tbody > tr, .is-write-page .write_box .w_top > tbody > tr > th, .is-write-page .write_box .w_top > tbody > tr > td { display: block; width: 100% !important; border: none !important; padding: 0 !important; }
        .is-write-page .write_box .w_top { display: flex; flex-direction: column; gap: 10px; margin-bottom: 15px; }
        .is-write-page .write_box .w_top .write_subject, .is-write-page .write_box .w_top .user_info_box { display: flex; flex-direction: column; gap: 10px; }
        .is-write-page .write_box .user_info_box { flex-direction: row; }
        .is-write-page .write_box select, .is-write-page .write_box input[type="text"], .is-write-page .write_box input[type="password"] { width: 100% !important; height: 45px !important; padding: 0 12px !important; font-size: 16px !important; border: 1px solid #ddd !important; border-radius: 4px !important; box-sizing: border-box !important; }
        .is-write-page .write_box .user_info_box .user_info_input { flex: 1; }
        .is-write-page .write_box .btn_bottom_box { display: flex !important; gap: 10px; padding: 15px 0 0 0 !important; border-top: 1px solid #eee; margin-top: 15px; }
        .is-write-page .write_box .btn_bottom_box a, .is-write-page .write_box .btn_bottom_box button { flex: 1; display: inline-block !important; text-align: center !important; padding: 12px 0 !important; font-size: 16px !important; border-radius: 4px !important; text-decoration: none !important; height: auto !important; float: none !important; line-height: normal !important; }
        .is-write-page .write_box .btn_bottom_box .btn_blue { background-color: #3b71fd !important; color: #fff !important; border: none !important; }
        .is-write-page .write_box .btn_bottom_box .btn_lightred { background-color: #e9e9e9 !important; color: #555 !important; border: none !important; }
        .is-write-page .tx-toolbar-basic { border-bottom: 1px solid #ddd !important; }
        .is-write-page .tx-toolbar-advanced, .is-write-page .write_infobox, .is-write-page .file_upload_info { display: none !important; }
        @media (max-width: 480px) {
            .is-write-page .write_box .user_info_box { flex-direction: column; }
        }
    `);

    /**
     * =================================================================
     * ======================== Filter Module ==========================
     * =================================================================
     */
    const FilterModule = {
        TELECOM: [
            [1, [[96, "KT모바일", "MOB"], [97, "KT모바일", "MOB"], [98, "KT모바일", "MOB"], [99, "KT모바일", "MOB"], [100, "KT모바일", "MOB"], [101, "KT모바일", "MOB"], [102, "KT모바일", "MOB"], [103, "KT모바일", "MOB"], [104, "KT모바일", "MOB"], [105, "KT모바일", "MOB"], [106, "KT모바일", "MOB"], [107, "KT모바일", "MOB"], [108, "KT모바일", "MOB"], [109, "KT모바일", "MOB"], [110, "KT모바일", "MOB"], [111, "KT모바일", "MOB"]]],
            [27, [[160, "SKT", "MOB"], [161, "SKT", "MOB"], [162, "SKT", "MOB"], [163, "SKT", "MOB"], [164, "SKT", "MOB"], [165, "SKT", "MOB"], [166, "SKT", "MOB"], [167, "SKT", "MOB"], [168, "SKT", "MOB"], [169, "SKT", "MOB"], [170, "SKT", "MOB"], [171, "SKT", "MOB"], [172, "SKT", "MOB"], [173, "SKT", "MOB"], [174, "SKT", "MOB"], [175, "SKT", "MOB"], [176, "SKT", "MOB"], [177, "SKT", "MOB"], [178, "SKT", "MOB"], [179, "SKT", "MOB"], [180, "SKT", "MOB"], [181, "SKT", "MOB"], [182, "SKT", "MOB"], [183, "SKT", "MOB"]]],
            [39, [[4, "KT모바일", "MOB"], [5, "KT모바일", "MOB"], [6, "KT모바일", "MOB"], [7, "KT모바일", "MOB"]]],
            [42, [[16, "SKT", "MOB"], [17, "SKT", "MOB"], [18, "SKT", "MOB"], [19, "SKT", "MOB"], [20, "SKT", "MOB"], [21, "SKT", "MOB"], [22, "SKT", "MOB"], [23, "SKT", "MOB"], [24, "SKT", "MOB"], [25, "SKT", "MOB"], [26, "SKT", "MOB"], [27, "SKT", "MOB"], [28, "SKT", "MOB"], [29, "SKT", "MOB"], [30, "SKT", "MOB"], [31, "SKT", "MOB"], [32, "SKT", "MOB"], [33, "SKT", "MOB"], [34, "SKT", "MOB"], [35, "SKT", "MOB"], [36, "SKT", "MOB"], [37, "SKT", "MOB"], [38, "SKT", "MOB"], [39, "SKT", "MOB"], [40, "SKT", "MOB"], [41, "SKT", "MOB"], [42, "SKT", "MOB"], [43, "SKT", "MOB"], [44, "SKT", "MOB"], [45, "SKT", "MOB"], [46, "SKT", "MOB"], [47, "SKT", "MOB"]]],
            [49, [[16, "KT모바일", "MOB"], [17, "KT모바일", "MOB"], [18, "KT모바일", "MOB"], [19, "KT모바일", "MOB"], [20, "KT모바일", "MOB"], [21, "KT모바일", "MOB"], [22, "KT모바일", "MOB"], [23, "KT모바일", "MOB"], [24, "KT모바일", "MOB"], [25, "KT모바일", "MOB"], [26, "KT모바일", "MOB"], [27, "KT모바일", "MOB"], [28, "KT모바일", "MOB"], [29, "KT모바일", "MOB"], [30, "KT모바일", "MOB"], [31, "KT모바일", "MOB"], [56, "KT모바일", "MOB"], [57, "KT모바일", "MOB"], [58, "KT모바일", "MOB"], [59, "KT모바일", "MOB"], [60, "KT모바일", "MOB"], [61, "KT모바일", "MOB"], [62, "KT모바일", "MOB"], [63, "KT모바일", "MOB"]]],
            [58, [[102, "SKT", "MOB"], [103, "SKT", "MOB"]]],
            [61, [[104, "SKT", "MOB"], [250, "SKT/세종텔레콤/하이라인닷넷", "MOB"], [252, "KT모바일/SKB/딜라이브/엘엑스/세종텔레콤/한국정보화진흥원/한국인터넷진흥원/두루안/기타등등", "MOB"], [254, "SKB/SKT/기타등등", "MOB"]]],
            [106, [[96, "LGU+모바일", "MOB"], [97, "LGU+모바일", "MOB"], [98, "LGU+모바일", "MOB"], [99, "LGU+모바일", "MOB"], [100, "LGU+모바일", "MOB"], [101, "LGU+모바일", "MOB"], [102, "LGU+모바일", "MOB"], [103, "LGU+모바일", "MOB"]]],
            [110, [[68, "KT모바일", "MOB"], [69, "KT모바일", "MOB"], [70, "KT모바일", "MOB"], [71, "KT모바일", "MOB"]]],
            [111, [[218, "SKT", "MOB"], [219, "SKT", "MOB"]]],
            [113, [[216, "SKT", "MOB"], [217, "SKT", "MOB"]]],
            [114, [[52, "SKT", "MOB"], [53, "SKT", "MOB"]]],
            [116, [[200, "KT모바일", "MOB"], [201, "KT모바일", "MOB"]]],
            [117, [[110, "LGU+모바일", "MOB"], [111, "LGT+모바일", "MOB"]]],
            [118, [[234, "KT모바일", "MOB"], [235, "KT모바일", "MOB"]]],
            [119, [[194, "KT모바일", "MOB"]]],
            [123, [[228, "SKT", "MOB"], [229, "SKT", "MOB"]]],
            [124, [[0, "SKT", "MOB"], [1, "SKT", "MOB"]]],
            [163, [[213, "KT모바일", "MOB"], [222, "KT모바일", "MOB"], [229, "KT모바일", "MOB"], [255, "KT모바일", "MOB"]]],
            [175, [[216, "KT모바일", "MOB"], [217, "KT모바일", "MOB"], [218, "KT모바일", "MOB"], [219, "KT모바일", "MOB"], [220, "KT모바일", "MOB"], [221, "KT모바일", "MOB"], [222, "KT모바일", "MOB"], [223, "KT모바일", "MOB"]]],
            [180, [[132, "SKT", "MOB"], [133, "SKT", "MOB"], [134, "SKT", "MOB"], [135, "SKT", "MOB"], [210, "LGT+모바일/퍼플스톤즈/네이버클라우드/기타등등", "MOB"]]],
            [203, [[82, "LGT+모바일/하이플러스카드/한국케이블텔레콤/기타등등", "MOB"], [226, "SKT/SK컴즈/대림아이앤에스/두산중공업/두산정보통신사업부/기타등등", "MOB"], [236, "SKT/KT/KINX/세종텔레콤", "MOB"]]],
            [211, [[36, "LGT+모바일/딜라이브/세종텔레콤/엘림넷/삼성SDS/기타등등", "MOB"], [111, "SKT/아름방송네트워크/드림라인/KDDI코리아/브이토피아/세종텔레콤/지오레이넷/기타등등", "MOB"], [115, "SKB/SKT/반송종합유선방송/한국정보보호진흥원/KT/네오위즈게임즈/세종텔레콤/LGU+/기타등등", "MOB"], [188, "SKT/네트로피/네이버클라우드/NHN/누리링크시스템/기타등등", "MOB"], [234, "LGU+모바일/LGU+/SKT/SK커뮤니케이션즈/기타등등", "MOB"], [235, "SKT/남인천방송/유엘네트웍스/하이라인닷넷/기타등등", "MOB"], [240, "SKT/엘림넷/싸이크로스/기타등등", "MOB"], [246, "KT모바일/서경방송/기타등등", "MOB"]]],
            [220, [[103, "SKT", "MOB"]]],
            [223, [[32, "SKT", "MOB"], [33, "SKT", "MOB"], [34, "SKT", "MOB"], [35, "SKT", "MOB"], [36, "SKT", "MOB"], [37, "SKT", "MOB"], [38, "SKT", "MOB"], [39, "SKT", "MOB"], [40, "SKT", "MOB"], [41, "SKT", "MOB"], [42, "SKT", "MOB"], [43, "SKT", "MOB"], [44, "SKT", "MOB"], [45, "SKT", "MOB"], [46, "SKT", "MOB"], [47, "SKT", "MOB"], [48, "SKT", "MOB"], [49, "SKT", "MOB"], [50, "SKT", "MOB"], [51, "SKT", "MOB"], [52, "SKT", "MOB"], [53, "SKT", "MOB"], [54, "SKT", "MOB"], [55, "SKT", "MOB"], [56, "SKT", "MOB"], [57, "SKT", "MOB"], [58, "SKT", "MOB"], [59, "SKT", "MOB"], [60, "SKT", "MOB"], [61, "SKT", "MOB"], [62, "SKT", "MOB"], [63, "SKT", "MOB"], [168, "LGT+모바일", "MOB"], [169, "LGT+모바일", "MOB"], [170, "LGT+모바일", "MOB"], [171, "LGT+모바일", "MOB"], [172, "LGT+모바일", "MOB"], [173, "LGT+모바일", "MOB"], [174, "LGT+모바일", "MOB"], [175, "LGT+모바일", "MOB"]]]
        ],

        CONSTANTS: {
            STORAGE_KEYS: {
                MASTER_DISABLED: 'dcinside_master_disabled',
                EXCLUDE_RECOMMENDED: 'dcinside_exclude_recommended',
                THRESHOLD: 'dcinside_threshold',
                RATIO_ENABLED: 'dcinside_ratio_filter_enabled',
                RATIO_MIN: 'dcinside_ratio_min',
                RATIO_MAX: 'dcinside_ratio_max',
                BLOCK_GUEST: 'dcinside_block_guest',
                BLOCK_TELECOM: 'dcinside_telecom_ip_block_enabled',
                BLOCK_CONFIG: 'dcinside_block_config',
                BLOCKED_UIDS: 'dcinside_blocked_uids',
                BLOCKED_GUESTS: 'dcinside_blocked_guests',
                SHORTCUT_KEY: 'dcinside_shortcut_key', // [v2.1 추가]
            },
            SELECTORS: {
                POST_LIST_CONTAINER: 'table.gall_list tbody',
                COMMENT_CONTAINER: 'div.comment_box ul.cmt_list',
                POST_VIEW_LIST_CONTAINER: 'div.gall_exposure_list > ul',
                POST_ITEM: 'tr.ub-content',
                COMMENT_ITEM: 'li.ub-content',
                WRITER_INFO: '.ub-writer',
                IP_SPAN: 'span.ip',
                MAIN_CONTAINER: '#container',
            },
            API: {
                USER_INFO: '/api/gallog_user_layer/gallog_content_reple/',
            },
            CUSTOM_ATTRS: {
                OBSERVER_ATTACHED: 'data-filter-observer-attached',
            },
            UI_IDS: {
                SETTINGS_PANEL: 'dcinside-filter-setting',
                MASTER_DISABLE_CHECKBOX: 'dcinside-master-disable-checkbox',
                EXCLUDE_RECOMMENDED_CHECKBOX: 'dcinside-exclude-recommended-checkbox',
                SETTINGS_CONTAINER: 'dcinside-settings-container',
                THRESHOLD_INPUT: 'dcinside-threshold-input',
                BLOCK_GUEST_CHECKBOX: 'dcinside-block-guest-checkbox',
                TELECOM_BLOCK_CHECKBOX: 'dcinside-telecom-ip-block-checkbox',
                RATIO_ENABLE_CHECKBOX: 'dcinside-ratio-enable-checkbox',
                RATIO_SECTION: 'dcinside-ratio-section',
                RATIO_MIN_INPUT: 'dcinside-ratio-min',
                RATIO_MAX_INPUT: 'dcinside-ratio-max',
                SAVE_BUTTON: 'dcinside-threshold-save',
                CLOSE_BUTTON: 'dcinside-filter-close',
                // [v2.1 추가] 단축키 변경 UI ID
                SHORTCUT_DISPLAY: 'dcinside-shortcut-display',
                CHANGE_SHORTCUT_BTN: 'dcinside-change-shortcut-btn',
                SHORTCUT_MODAL_OVERLAY: 'dcinside-shortcut-modal-overlay',
                SHORTCUT_MODAL: 'dcinside-shortcut-modal',
                NEW_SHORTCUT_PREVIEW: 'dcinside-new-shortcut-preview',
                SAVE_SHORTCUT_BTN: 'dcinside-save-shortcut-btn',
                CANCEL_SHORTCUT_BTN: 'dcinside-cancel-shortcut-btn',
            },
            ETC: {
                MOBILE_IP_MARKER: 'mblck',
                COOKIE_NAME_1: 'ci_t',
                COOKIE_NAME_2: 'ci_c',
            }
        },
        BLOCK_UID_EXPIRE: 1000 * 60 * 60 * 24 * 7,
        BLOCKED_UIDS_CACHE: {},
        isMobile: () => /Mobi/i.test(navigator.userAgent),
        isRecommendedContext: () => window.location.search.includes('exception_mode=recommend'),
        async regblockMobile() {
            let conf = await GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG, {});
            if (conf.ip && conf.ip.includes(this.CONSTANTS.ETC.MOBILE_IP_MARKER)) return;
            let ip_arr = [this.CONSTANTS.ETC.MOBILE_IP_MARKER];
            this.TELECOM.forEach(t1 => t1[1].forEach(t2 => {
                if (t2[2] === 'MOB') ip_arr.push(t1[0] + '.' + t2[0]);
            }));
            const mobile_ips_string = ip_arr.join('||');
            conf.ip = conf.ip ? conf.ip + '||' + mobile_ips_string : mobile_ips_string;
            await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG, conf);
        },
        async delblockMobile() {
            let conf = await GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG, {});
            if (conf.ip && conf.ip.includes(this.CONSTANTS.ETC.MOBILE_IP_MARKER)) {
                const user_ips = conf.ip.split('||' + this.CONSTANTS.ETC.MOBILE_IP_MARKER)[0];
                conf.ip = user_ips.endsWith('||') ? user_ips.slice(0, -2) : user_ips;
                if (conf.ip === this.CONSTANTS.ETC.MOBILE_IP_MARKER || !conf.ip) conf.ip = '';
                await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG, conf);
            }
        },
        async showSettings() {
            await this.reloadSettings();
            const { masterDisabled = false, excludeRecommended = false, threshold = 0, ratioEnabled = false, ratioMin = '', ratioMax = '', blockGuestEnabled = false, telecomBlockEnabled = false } = dcFilterSettings;
            const currentShortcut = await GM_getValue(this.CONSTANTS.STORAGE_KEYS.SHORTCUT_KEY, 'Shift+S');
            const existingDiv = document.getElementById(this.CONSTANTS.UI_IDS.SETTINGS_PANEL);
            if (existingDiv) existingDiv.remove();
            const div = document.createElement('div');
            div.id = this.CONSTANTS.UI_IDS.SETTINGS_PANEL;
            div.style = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:24px 20px 18px 20px;min-width:280px;z-index:99999;border:2px solid #333;border-radius:10px;box-shadow:0 0 10px #0008; cursor: move; user-select: none;';
            div.innerHTML = `
                <div style="margin-bottom:15px;padding-bottom:12px;border-bottom: 2px solid #ccc; display:flex;align-items:center; justify-content: space-between;">
                    <div style="display:flex; align-items: center;">
                        <div><input id="${this.CONSTANTS.UI_IDS.MASTER_DISABLE_CHECKBOX}" type="checkbox" style="vertical-align:middle;width:16px;height:16px;" ${masterDisabled ? 'checked' : ''}><label for="${this.CONSTANTS.UI_IDS.MASTER_DISABLE_CHECKBOX}" style="font-size:16px;vertical-align:middle;cursor:pointer;margin-left:6px;"><b>모든 기능 끄기</b></label></div>
                        <div style="margin-left: 15px; border-left: 2px solid #ccc; padding-left: 15px;"><input id="${this.CONSTANTS.UI_IDS.EXCLUDE_RECOMMENDED_CHECKBOX}" type="checkbox" style="vertical-align:middle;width:16px;height:16px;" ${excludeRecommended ? 'checked' : ''}><label for="${this.CONSTANTS.UI_IDS.EXCLUDE_RECOMMENDED_CHECKBOX}" style="font-size:14px;vertical-align:middle;cursor:pointer;margin-left:6px;"><b>개념글 제외</b></label></div>
                    </div>
                    <div><button id="${this.CONSTANTS.UI_IDS.CLOSE_BUTTON}" style="background:none;border:none;font-size:24px;cursor:pointer;line-height:1;padding:0 4px;color:#555;">✕</button></div>
                </div>
                <div id="${this.CONSTANTS.UI_IDS.SETTINGS_CONTAINER}" style="opacity:${masterDisabled ? 0.5 : 1}; pointer-events:${masterDisabled ? 'none' : 'auto'};">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; flex-direction: column; align-items: center;"><h3 style="cursor: default;margin-top:0;margin-bottom:5px;">유저 글+댓글 합 기준값(이 값 이하 차단)</h3><input id="${this.CONSTANTS.UI_IDS.THRESHOLD_INPUT}" type="number" min="0" value="${threshold}" style="width:80px;font-size:16px; cursor: initial;"><div style="font-size:13px;color:#666;margin-top:5px;">0 또는 빈칸으로 두면 비활성화됩니다.</div></div>
                        <div style="border: 2px solid #000; border-radius: 5px; padding: 8px 8px 5px 6px;"><div style="display: flex; flex-direction: column; align-items: flex-end; gap: 5px;"><span style="display:inline-flex; align-items:center; gap:4px; padding-bottom: 5px; border-bottom: 1px solid #ddd;"><input id="${this.CONSTANTS.UI_IDS.BLOCK_GUEST_CHECKBOX}" type="checkbox" ${blockGuestEnabled ? 'checked' : ''} style="vertical-align:middle;"><label for="${this.CONSTANTS.UI_IDS.BLOCK_GUEST_CHECKBOX}" style="font-size:13px;vertical-align:middle;cursor:pointer;">유동 전체 차단</label></span><span style="display:inline-flex; align-items:center; gap:4px; margin-top: 5px;"><input id="${this.CONSTANTS.UI_IDS.TELECOM_BLOCK_CHECKBOX}" type="checkbox" ${telecomBlockEnabled ? 'checked' : ''} style="vertical-align:middle;"><label for="${this.CONSTANTS.UI_IDS.TELECOM_BLOCK_CHECKBOX}" style="font-size:13px;vertical-align:middle;cursor:pointer;">통신사 IP 차단</label></span></div></div>
                    </div>
                    <hr style="border:0;border-top:2px solid #222;margin:16px 0 12px 0;">
                    <div style="margin-bottom:8px;display:flex;align-items:center;"><input id="${this.CONSTANTS.UI_IDS.RATIO_ENABLE_CHECKBOX}" type="checkbox" style="vertical-align:middle;" ${ratioEnabled ? 'checked' : ''}><label for="${this.CONSTANTS.UI_IDS.RATIO_ENABLE_CHECKBOX}" style="font-size:15px;vertical-align:middle;cursor:pointer;margin-left:4px;">글/댓글 비율 필터 사용</label></div>
                    <div id="${this.CONSTANTS.UI_IDS.RATIO_SECTION}">
                        <div style="display:flex;gap:10px;align-items:center;">
                            <div style="display:flex;flex-direction:column;align-items:center;"><label for="${this.CONSTANTS.UI_IDS.RATIO_MIN_INPUT}" style="font-size:14px;">댓글/글 비율 일정 이상 차단 </label><div style="font-size:12px;color:#888;line-height:1.2;">(댓글만 많은 놈)</div><input id="${this.CONSTANTS.UI_IDS.RATIO_MIN_INPUT}" type="number" step="any" placeholder="예: 10" value="${ratioMin !== '' ? ratioMin : ''}" style="width:100px;font-size:15px;text-align:center; margin-top: 4px;"></div>
                            <div style="display:flex;flex-direction:column;align-items:center;"><label for="${this.CONSTANTS.UI_IDS.RATIO_MAX_INPUT}" style="font-size:14px;">글/댓글 비율 일정 이상 차단 </label><div style="font-size:12px;color:#888;line-height:1.2;">(글만 많은 놈)</div><input id="${this.CONSTANTS.UI_IDS.RATIO_MAX_INPUT}" type="number" step="any" placeholder="예: 1" value="${ratioMax !== '' ? ratioMax : ''}" style="width:100px;font-size:15px;text-align:center; margin-top: 4px;"></div>
                        </div><div style="margin-top:8px;font-size:13px;color:#666;text-align:left;">비율이 입력값과 같거나 큰(이상)인 유저를 차단합니다.</div>
                    </div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; padding-top:15px; border-top: 2px solid #ccc;">
                    <div style="font-size:15px;color:#444;text-align:left;">
                        창 여닫는 단축키: <b id="${this.CONSTANTS.UI_IDS.SHORTCUT_DISPLAY}">${currentShortcut}</b>
                        <a href="#" id="${this.CONSTANTS.UI_IDS.CHANGE_SHORTCUT_BTN}" style="margin-left: 8px; font-size: 13px; text-decoration: underline; cursor: pointer;">(변경)</a>
                    </div>
                    <button id="${this.CONSTANTS.UI_IDS.SAVE_BUTTON}" style="font-size:16px;border:2px solid #000;border-radius:4px;background:#fff; cursor: pointer; padding: 4px 10px;">저장 & 실행</button>
                </div>`;
            document.body.appendChild(div);
            const input = document.getElementById(this.CONSTANTS.UI_IDS.THRESHOLD_INPUT);
            input.focus(); input.select();

            // [v2.1 추가] 단축키 변경 버튼 이벤트 리스너
            document.getElementById(this.CONSTANTS.UI_IDS.CHANGE_SHORTCUT_BTN).onclick = (e) => {
                e.preventDefault();
                this.showShortcutChanger();
            };

            const masterDisableCheckbox = document.getElementById(this.CONSTANTS.UI_IDS.MASTER_DISABLE_CHECKBOX);
            const settingsContainer = document.getElementById(this.CONSTANTS.UI_IDS.SETTINGS_CONTAINER);
            const updateMasterState = () => { const isMasterDisabled = masterDisableCheckbox.checked; settingsContainer.style.opacity = isMasterDisabled ? 0.5 : 1; settingsContainer.style.pointerEvents = isMasterDisabled ? 'none' : 'auto'; };
            masterDisableCheckbox.addEventListener('change', updateMasterState); updateMasterState();
            const ratioSection = document.getElementById(this.CONSTANTS.UI_IDS.RATIO_SECTION);
            const ratioEnableCheckbox = document.getElementById(this.CONSTANTS.UI_IDS.RATIO_ENABLE_CHECKBOX);
            const ratioMinInput = document.getElementById(this.CONSTANTS.UI_IDS.RATIO_MIN_INPUT);
            const ratioMaxInput = document.getElementById(this.CONSTANTS.UI_IDS.RATIO_MAX_INPUT);
            const updateRatioSectionState = () => { const enabled = ratioEnableCheckbox.checked; ratioSection.style.opacity = enabled ? 1 : 0.5; ratioMinInput.disabled = !enabled; ratioMaxInput.disabled = !enabled; };
            ratioEnableCheckbox.addEventListener('change', updateRatioSectionState); updateRatioSectionState();
            document.getElementById(this.CONSTANTS.UI_IDS.CLOSE_BUTTON).onclick = () => div.remove();
            const saveButton = document.getElementById(this.CONSTANTS.UI_IDS.SAVE_BUTTON);
            const enterKeySave = (e) => { if (e.key === 'Enter') saveButton.click(); };
            [input, ratioMinInput, ratioMaxInput].forEach(el => el.addEventListener('keydown', enterKeySave));
            let isDragging = false, offsetX, offsetY;
            const onDragStart = (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'LABEL' || e.target.id === FilterModule.CONSTANTS.UI_IDS.CLOSE_BUTTON || e.target.id === FilterModule.CONSTANTS.UI_IDS.CHANGE_SHORTCUT_BTN) return;
                isDragging = true;
                const rect = div.getBoundingClientRect();
                if (div.style.transform !== 'none') { div.style.transform = 'none'; div.style.left = `${rect.left}px`; div.style.top = `${rect.top}px`; }
                const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
                const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
                offsetX = clientX - rect.left; offsetY = clientY - rect.top;
                document.addEventListener('mousemove', onDragMove); document.addEventListener('touchmove', onDragMove, { passive: false });
                document.addEventListener('mouseup', onDragEnd, { once: true }); document.addEventListener('touchend', onDragEnd, { once: true });
            };
            const onDragMove = (e) => {
                if (!isDragging) return; e.preventDefault();
                const rect = div.getBoundingClientRect();
                const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
                const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
                let newX = clientX - offsetX; let newY = clientY - offsetY;
                newX = Math.max(0, Math.min(newX, window.innerWidth - rect.width)); newY = Math.max(0, Math.min(newY, window.innerHeight - rect.height));
                div.style.left = `${newX}px`; div.style.top = `${newY}px`;
            };
            const onDragEnd = () => { isDragging = false; document.removeEventListener('mousemove', onDragMove); document.removeEventListener('touchmove', onDragMove); };
            div.addEventListener('mousedown', onDragStart); div.addEventListener('touchstart', onDragStart);
            saveButton.onclick = async () => {
                saveButton.disabled = true; saveButton.textContent = '저장 중...';
                const blockGuestChecked = document.getElementById(this.CONSTANTS.UI_IDS.BLOCK_GUEST_CHECKBOX).checked;
                let val = parseInt(document.getElementById(this.CONSTANTS.UI_IDS.THRESHOLD_INPUT).value, 10);
                if (isNaN(val)) val = 0;
                const promises = [
                    GM_setValue(this.CONSTANTS.STORAGE_KEYS.MASTER_DISABLED, document.getElementById(this.CONSTANTS.UI_IDS.MASTER_DISABLE_CHECKBOX).checked),
                    GM_setValue(this.CONSTANTS.STORAGE_KEYS.EXCLUDE_RECOMMENDED, document.getElementById(this.CONSTANTS.UI_IDS.EXCLUDE_RECOMMENDED_CHECKBOX).checked),
                    GM_setValue(this.CONSTANTS.STORAGE_KEYS.THRESHOLD, val),
                    GM_setValue(this.CONSTANTS.STORAGE_KEYS.RATIO_ENABLED, document.getElementById(this.CONSTANTS.UI_IDS.RATIO_ENABLE_CHECKBOX).checked),
                    GM_setValue(this.CONSTANTS.STORAGE_KEYS.RATIO_MIN, document.getElementById(this.CONSTANTS.UI_IDS.RATIO_MIN_INPUT).value),
                    GM_setValue(this.CONSTANTS.STORAGE_KEYS.RATIO_MAX, document.getElementById(this.CONSTANTS.UI_IDS.RATIO_MAX_INPUT).value),
                    GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_GUEST, blockGuestChecked),
                    GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_TELECOM, document.getElementById(this.CONSTANTS.UI_IDS.TELECOM_BLOCK_CHECKBOX).checked)
                ];
                if (!blockGuestChecked) promises.push(this.clearBlockedGuests());
                try { await Promise.all(promises); location.reload(); } catch (error) { console.error('DCinside User Filter: Settings save failed.', error); saveButton.disabled = false; saveButton.textContent = '저장 & 실행'; alert('설정 저장에 실패했습니다. 콘솔을 확인해주세요.'); }
            };
        },
        // [v2.1.1 수정] 단축키 변경 모달 표시 (실시간 입력 감지 로직 개선)
        showShortcutChanger() {
            if (document.getElementById(this.CONSTANTS.UI_IDS.SHORTCUT_MODAL)) return;

            const settingsPanel = document.getElementById(this.CONSTANTS.UI_IDS.SETTINGS_PANEL);
            settingsPanel.style.pointerEvents = 'none';

            const overlay = document.createElement('div');
            overlay.id = this.CONSTANTS.UI_IDS.SHORTCUT_MODAL_OVERLAY;
            overlay.style = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 100000;';
            document.body.appendChild(overlay);

            const modal = document.createElement('div');
            modal.id = this.CONSTANTS.UI_IDS.SHORTCUT_MODAL;
            modal.style = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff; padding: 20px; border-radius: 8px; z-index: 100001; text-align: center; box-shadow: 0 0 15px rgba(0,0,0,0.3);';
            modal.innerHTML = `
                <h4 style="margin-top: 0; margin-bottom: 15px; font-size: 16px;">새로운 단축키를 입력하세요 (최대 3개)</h4>
                <div id="${this.CONSTANTS.UI_IDS.NEW_SHORTCUT_PREVIEW}" style="min-width: 200px; height: 40px; line-height: 40px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 20px; font-size: 18px; font-weight: bold; color: #333;">입력 대기 중...</div>
                <div>
                    <button id="${this.CONSTANTS.UI_IDS.SAVE_SHORTCUT_BTN}" style="padding: 8px 16px; margin-right: 10px; border: 1px solid #3b71fd; background: #3b71fd; color: #fff; border-radius: 4px; cursor: pointer;">변경</button>
                    <button id="${this.CONSTANTS.UI_IDS.CANCEL_SHORTCUT_BTN}" style="padding: 8px 16px; border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px; cursor: pointer;">취소</button>
                </div>
            `;
            document.body.appendChild(modal);

            let pressedKeys = new Set();
            let combinationTimeout = null;
            const previewEl = document.getElementById(this.CONSTANTS.UI_IDS.NEW_SHORTCUT_PREVIEW);

            const updatePreview = () => {
                if (pressedKeys.size > 0) {
                    previewEl.textContent = this.formatShortcutKeys(pressedKeys);
                } else {
                    previewEl.textContent = '입력 대기 중...';
                }
            };

            const keydownHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();

                // 타이머가 있다면, 아직 조합이 진행 중이라는 의미이므로 초기화
                clearTimeout(combinationTimeout);

                if (pressedKeys.size < 3) {
                    pressedKeys.add(e.key);
                    updatePreview();
                }

                // 키 입력이 0.5초간 없으면 현재 조합을 확정하고 Set을 비움
                combinationTimeout = setTimeout(() => {
                    pressedKeys.clear();
                }, 500);
            };

            const keyupHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                // 키를 떼는 시점은 조합 확정과 관련 없으므로, pressedKeys를 유지합니다.
            };

            document.addEventListener('keydown', keydownHandler, true);
            document.addEventListener('keyup', keyupHandler, true);


            const cleanup = () => {
                document.removeEventListener('keydown', keydownHandler, true);
                document.removeEventListener('keyup', keyupHandler, true);
                overlay.remove();
                modal.remove();
                settingsPanel.style.pointerEvents = 'auto';
            };

            document.getElementById(this.CONSTANTS.UI_IDS.SAVE_SHORTCUT_BTN).onclick = async () => {
                const newShortcut = previewEl.textContent;
                if (newShortcut && newShortcut !== '입력 대기 중...') {
                    await GM_setValue(this.CONSTANTS.STORAGE_KEYS.SHORTCUT_KEY, newShortcut);
                    activeShortcutObject = this.parseShortcutString(newShortcut);
                    document.getElementById(this.CONSTANTS.UI_IDS.SHORTCUT_DISPLAY).textContent = newShortcut;
                    cleanup();
                } else {
                    alert('유효한 단축키를 입력해주세요.');
                }
            };

            document.getElementById(this.CONSTANTS.UI_IDS.CANCEL_SHORTCUT_BTN).onclick = cleanup;
            overlay.onclick = cleanup;
        },
        // [v2.1 추가] 키 Set을 정해진 형식의 문자열로 변환
        formatShortcutKeys(keySet) {
            if (keySet.size === 0) return '';

            const priority = ['Control', 'Meta', 'Alt', 'Shift', 'CapsLock', 'Tab'];
            const keys = Array.from(keySet);

            const modifiers = keys
                .filter(k => priority.includes(k))
                .sort((a, b) => priority.indexOf(a) - priority.indexOf(b));

            const others = keys
                .filter(k => !priority.includes(k) && k.length === 1) // 일반 문자키만
                .sort();

            return [...modifiers, ...others].map(k => k === 'Control' ? 'Ctrl' : k).join('+');
        },
        // [v2.1 추가] 단축키 문자열을 이벤트 비교용 객체로 변환
        parseShortcutString(shortcutString) {
            const result = { ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, key: '' };
            if (!shortcutString) return result;

            const parts = shortcutString.split('+');
            const nonModifiers = [];

            parts.forEach(part => {
                switch (part.toLowerCase()) {
                    case 'ctrl':
                    case 'control':
                        result.ctrlKey = true;
                        break;
                    case 'meta':
                    case 'win':
                        result.metaKey = true;
                        break;
                    case 'alt':
                        result.altKey = true;
                        break;
                    case 'shift':
                        result.shiftKey = true;
                        break;
                    default:
                        nonModifiers.push(part);
                        break;
                }
            });

            if (nonModifiers.length > 0) {
                result.key = nonModifiers[0].toUpperCase();
            }
            return result;
        },
        async getUserPostCommentSum(uid) {
            if (userSumCache[uid]) return userSumCache[uid];
            const getCookie = (name) => { const v = `; ${document.cookie}`; const p = v.split(`; ${name}=`); if (p.length === 2) return p.pop().split(';').shift(); };
            let ci = getCookie(this.CONSTANTS.ETC.COOKIE_NAME_1) || getCookie(this.CONSTANTS.ETC.COOKIE_NAME_2);
            if (!ci) return null;
            return new Promise((resolve) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', this.CONSTANTS.API.USER_INFO, true); xhr.withCredentials = true;
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8'); xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

                xhr.timeout = 5000;
                xhr.ontimeout = () => {
                    console.warn(`DCinside User Filter: User info request for UID ${uid} timed out.`);
                    resolve(null);
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const [post, comment] = xhr.responseText.split(',').map(x => parseInt(x, 10));
                        if (!isNaN(post) && !isNaN(comment)) {
                            const d = { sum: post + comment, post, comment };
                            userSumCache[uid] = d;
                            resolve(d);
                        } else {
                            resolve(null);
                        }
                    } else {
                        resolve(null);
                    }
                };
                xhr.onerror = () => resolve(null);
                xhr.send(`ci_t=${encodeURIComponent(ci)}&user_id=${encodeURIComponent(uid)}`);
            });
        },
        async addBlockedUid(uid, sum, post, comment, ratioBlocked) {
            if (this.isMobile()) return;
            await this.refreshBlockedUidsCache(true);
            this.BLOCKED_UIDS_CACHE[uid] = { ts: Date.now(), sum, post, comment, ratioBlocked: !!ratioBlocked };
            await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCKED_UIDS, JSON.stringify(this.BLOCKED_UIDS_CACHE));
        },
        async getBlockedGuests() { try { return JSON.parse(await GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCKED_GUESTS, '[]')); } catch { return []; } },
        async setBlockedGuests(list) { await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCKED_GUESTS, JSON.stringify(list)); },
        async addBlockedGuest(ip) { if (dcFilterSettings.blockedGuests && !dcFilterSettings.blockedGuests.includes(ip)) { dcFilterSettings.blockedGuests.push(ip); await this.setBlockedGuests(dcFilterSettings.blockedGuests); } },
        async clearBlockedGuests() { await this.setBlockedGuests([]); },
        isUserBlocked({ sum, post, comment }) {
            const s = dcFilterSettings; if (s.masterDisabled) return { sumBlocked: false, ratioBlocked: false };
            let sumBlocked = s.threshold > 0 && sum > 0 && sum <= s.threshold; let ratioBlocked = false;
            if (s.ratioEnabled) {
                const useMin = !isNaN(s.ratioMin) && s.ratioMin > 0; const useMax = !isNaN(s.ratioMax) && s.ratioMax > 0;
                if (useMin || useMax) {
                    const r1 = (post > 0) ? (comment / post) : (comment > 0 ? Infinity : 0); const r2 = (comment > 0) ? (post / comment) : (post > 0 ? Infinity : 0);
                    if (useMin && r1 >= s.ratioMin) ratioBlocked = true; if (!ratioBlocked && useMax && r2 >= s.ratioMax) ratioBlocked = true;
                }
            }
            return { sumBlocked, ratioBlocked };
        },
        async applyBlockFilterToElement(element, uid, userData, addBlockedUidFn) {
            if (!userData) return;
            const { sumBlocked, ratioBlocked } = this.isUserBlocked(userData);
            const shouldBeBlocked = sumBlocked || ratioBlocked;
            if (element.style.display !== 'none') element.style.display = shouldBeBlocked ? 'none' : '';
            if (shouldBeBlocked) await addBlockedUidFn.call(this, uid, userData.sum, userData.post, userData.comment, ratioBlocked);
        },
        shouldSkipFiltering(element) {
            const s = dcFilterSettings; if (!s.excludeRecommended || !this.isRecommendedContext()) return false;
            if (window.location.pathname.includes('/view/')) return !element.closest(this.CONSTANTS.SELECTORS.COMMENT_CONTAINER);
            return true;
        },
        async applyAsyncBlock(element) {
            if (this.shouldSkipFiltering(element)) { element.style.display = ''; return; }
            try {
                if (element.style.display === 'none') return;
                const writerInfo = element.querySelector(this.CONSTANTS.SELECTORS.WRITER_INFO); if (!writerInfo) return;
                const uid = writerInfo.getAttribute('data-uid'); if (!uid || uid.length < 3) return;
                if (this.BLOCKED_UIDS_CACHE[uid]) return;
                const userData = await this.getUserPostCommentSum(uid); if (!userData) return;
                await this.applyBlockFilterToElement(element, uid, userData, this.addBlockedUid);
            } catch (e) { console.warn(`DCinside User Filter: Async filter exception.`, e, element); }
        },
        async refreshBlockedUidsCache() {
            if (this.isMobile()) { this.BLOCKED_UIDS_CACHE = {}; return; }
            let data; try { data = JSON.parse(await GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCKED_UIDS, '{}')); } catch { data = {}; }
            const now = Date.now(); let changed = false;
            for (const [uid, cacheData] of Object.entries(data)) {
                if (typeof cacheData !== 'object' || cacheData === null || typeof cacheData.ts !== 'number' || now - cacheData.ts > this.BLOCK_UID_EXPIRE) { delete data[uid]; changed = true; }
            }
            this.BLOCKED_UIDS_CACHE = data;
            if (changed) await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCKED_UIDS, JSON.stringify(this.BLOCKED_UIDS_CACHE));
        },
        applySyncBlock(element) {
            if (this.shouldSkipFiltering(element)) { element.style.display = ''; return; }
            const { masterDisabled, blockGuestEnabled, telecomBlockEnabled, blockConfig = {}, blockedGuests = [] } = dcFilterSettings;
            if (masterDisabled) { element.style.display = ''; return; }
            const writerInfo = element.querySelector(this.CONSTANTS.SELECTORS.WRITER_INFO); if (!writerInfo) return;
            const uid = writerInfo.getAttribute('data-uid'); const ipSpan = element.querySelector(this.CONSTANTS.SELECTORS.IP_SPAN);
            const ip = ipSpan ? ipSpan.textContent.trim().slice(1, -1) : null; const isGuest = (!uid || uid.length < 3) && ip;
            let isBlocked = false; const telecomBlockRegex = (telecomBlockEnabled && blockConfig.ip) ? new RegExp('^(' + blockConfig.ip.split('||').map(p => p.replace(/\./g, '\\.')).join('|') + ')') : null;
            if (isGuest) { if (blockGuestEnabled || (telecomBlockRegex && ip && telecomBlockRegex.test(ip))) isBlocked = true; }
            else if (ip && telecomBlockRegex && telecomBlockRegex.test(ip)) isBlocked = true;
            if (!isBlocked && ip && blockedGuests.includes(ip)) isBlocked = true;
            if (!isBlocked && uid && this.BLOCKED_UIDS_CACHE[uid]) {
                const { sumBlocked, ratioBlocked } = this.isUserBlocked(this.BLOCKED_UIDS_CACHE[uid]);
                if (sumBlocked || ratioBlocked) isBlocked = true;
            }
            element.style.display = isBlocked ? 'none' : '';
        },
        initializeUniversalObserver() {
            const targets = [{ c: this.CONSTANTS.SELECTORS.POST_LIST_CONTAINER, i: this.CONSTANTS.SELECTORS.POST_ITEM }, { c: this.CONSTANTS.SELECTORS.COMMENT_CONTAINER, i: this.CONSTANTS.SELECTORS.COMMENT_ITEM }, { c: this.CONSTANTS.SELECTORS.POST_VIEW_LIST_CONTAINER, i: 'li' }];
            const filterItems = (items) => items.forEach(item => { this.applySyncBlock(item); this.applyAsyncBlock(item); });
            const attachObserver = (container, itemSelector) => {
                if (container.hasAttribute(this.CONSTANTS.CUSTOM_ATTRS.OBSERVER_ATTACHED)) return;
                container.setAttribute(this.CONSTANTS.CUSTOM_ATTRS.OBSERVER_ATTACHED, 'true');
                filterItems(Array.from(container.querySelectorAll(itemSelector)));
                new MutationObserver(mutations => {
                    const newItems = [];
                    mutations.forEach(m => m.addedNodes.forEach(n => {
                        if (n.nodeType !== 1) return;
                        if (n.matches(itemSelector)) newItems.push(n); else if (n.querySelectorAll) newItems.push(...n.querySelectorAll(itemSelector));
                    }));
                    if (newItems.length > 0) filterItems(newItems);
                }).observe(container, { childList: true, subtree: true });
            };
            const mainContainer = document.querySelector(this.CONSTANTS.SELECTORS.MAIN_CONTAINER);
            const observerTarget = mainContainer || document.body;

            const bodyObserver = new MutationObserver(mutations => mutations.forEach(m => m.addedNodes.forEach(n => {
                if (n.nodeType === 1 && !n.closest('.user_data')) {
                    targets.forEach(t => { if (n.matches(t.c)) attachObserver(n, t.i); else if (n.querySelectorAll) n.querySelectorAll(t.c).forEach(c => attachObserver(c, t.i)); });
                }
            })));
            targets.forEach(t => document.querySelectorAll(t.c).forEach(c => attachObserver(c, t.i)));
            bodyObserver.observe(observerTarget, { childList: true, subtree: true });
        },
        async reloadSettings() {
            const [
                masterDisabled, excludeRecommended, threshold, ratioEnabled,
                ratioMin, ratioMax, blockGuestEnabled, telecomBlockEnabled,
                blockedGuests, blockConfig
            ] = await Promise.all([
                GM_getValue(this.CONSTANTS.STORAGE_KEYS.MASTER_DISABLED, false),
                GM_getValue(this.CONSTANTS.STORAGE_KEYS.EXCLUDE_RECOMMENDED, false),
                GM_getValue(this.CONSTANTS.STORAGE_KEYS.THRESHOLD, 0),
                GM_getValue(this.CONSTANTS.STORAGE_KEYS.RATIO_ENABLED, false),
                GM_getValue(this.CONSTANTS.STORAGE_KEYS.RATIO_MIN, ''),
                GM_getValue(this.CONSTANTS.STORAGE_KEYS.RATIO_MAX, ''),
                GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_GUEST, false),
                GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_TELECOM, false),
                this.getBlockedGuests(),
                GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG, {})
            ]);

            dcFilterSettings = {
                masterDisabled, excludeRecommended, threshold, ratioEnabled,
                ratioMin: parseFloat(ratioMin),
                ratioMax: parseFloat(ratioMax),
                blockGuestEnabled, telecomBlockEnabled, blockedGuests, blockConfig
            };
        },
        async refilterAllContent() {
            await this.reloadSettings();
            const allContentItems = document.querySelectorAll([this.CONSTANTS.SELECTORS.POST_ITEM, this.CONSTANTS.SELECTORS.COMMENT_ITEM, `${this.CONSTANTS.SELECTORS.POST_VIEW_LIST_CONTAINER} > li`].join(', '));
            allContentItems.forEach(element => { if (!dcFilterSettings.masterDisabled) element.style.display = ''; this.applySyncBlock(element); this.applyAsyncBlock(element); });
            document.dispatchEvent(new CustomEvent('dcFilterRefiltered'));
        },
        handleVisibilityChange() { if (document.visibilityState === 'visible') this.refilterAllContent(); },
        async init() {
            if (isInitialized) return; isInitialized = true;
            await this.reloadSettings();
            if (dcFilterSettings.excludeRecommended && window.location.pathname.includes('/lists/') && this.isRecommendedContext()) return;
            const telecomBlockEnabled = await GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_TELECOM, false);
            if (telecomBlockEnabled) await this.regblockMobile(); else await this.delblockMobile();
            await this.refreshBlockedUidsCache();
            document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
            this.initializeUniversalObserver();
            if (await GM_getValue(this.CONSTANTS.STORAGE_KEYS.THRESHOLD) === undefined) { await GM_setValue(this.CONSTANTS.STORAGE_KEYS.THRESHOLD, 0); await this.showSettings(); }
        }
    };

    /**
     * =================================================================
     * ========================== UI Module ============================
     * =================================================================
     */
    const UIModule = {
        DATA_ATTR: 'data-custom-row-id',
        TRANSFORMED_ATTR: 'data-ui-transformed',

        SELECTORS: {
            LIST_WRAP: '.gall_listwrap, .list_wrap',
            ORIGINAL_TABLE: 'table.gall_list',
            ORIGINAL_TBODY: '.gall_list tbody',
            ORIGINAL_POST_ITEM: 'tr.ub-content',
            PAGINATION: '.bottom_paging_box',
            GALL_TABS: '.list_bottom_btnbox',
            SEARCH_FORM: 'form[name="frmSearch"]',
        },

        CUSTOM_CLASSES: {
            MOBILE_LIST: 'custom-mobile-list',
            POST_ITEM: 'custom-post-item',
            BOTTOM_CONTROLS: 'custom-bottom-controls',
        },

        // [v2.2.0 수정] 클릭 동작 개선 (사용자 요청 반영)
        proxyClick(customItem, originalRow) {
            customItem.addEventListener('click', (e) => {
                const clickedElement = e.target;

                // 1. 댓글 수('span.reply_num')를 클릭한 경우
                // 원본 HTML의 댓글 보기 링크('a.reply_numbox')를 찾아 클릭 이벤트를 실행합니다.
                if (clickedElement.closest('span.reply_num')) {
                    e.preventDefault(); // 혹시 모를 기본 동작을 막습니다.
                    const originalReplyLink = originalRow.querySelector('a.reply_numbox');
                    if (originalReplyLink) {
                        originalReplyLink.click();
                    }
                    return; // 댓글 클릭 처리가 끝났으므로 함수를 종료합니다.
                }

                // 2. 작성자 영역('.author')을 클릭한 경우
                // 기존 기능을 유지하여 원본의 작성자(.gall_writer) 클릭을 실행합니다.
                if (clickedElement.closest('.author')) {
                    e.preventDefault();
                    const originalAuthor = originalRow.querySelector('.gall_writer');
                    if (originalAuthor) {
                        originalAuthor.click();
                    }
                    return; // 작성자 클릭 처리가 끝났으므로 함수를 종료합니다.
                }

                // 3. 제목 링크('a.post-title-link')를 클릭한 경우
                // 이 경우에는 아무런 코드도 실행하지 않습니다.
                // 브라우저가 <a> 태그의 href 속성을 따라가는 기본 동작을 그대로 수행하도록 둡니다.

                // 4. 그 외의 영역(예: 제목의 빈 공간)을 클릭한 경우
                // 위 조건들에 해당하지 않으면 아무런 동작도 하지 않고 이벤트가 종료됩니다.
                // 기존의 '.post-title' 전체를 감지하던 로직을 제거하여 이 동작을 구현했습니다.
            });
        },

        updateItemVisibility(originalRow, mirroredItem) {
            const isDibsBlocked = originalRow.classList.contains('block-disable');
            const isUserFilterBlocked = originalRow.style.display === 'none';
            mirroredItem.style.display = (isDibsBlocked || isUserFilterBlocked) ? 'none' : 'block';
        },

        createMobileListItem(originalRow, index) {
            const titleContainer = originalRow.querySelector('.gall_tit');
            const writerEl = originalRow.querySelector('.gall_writer');
            const dateEl = originalRow.querySelector('.gall_date');
            if (!titleContainer || !writerEl || !dateEl) return null;

            const newItem = document.createElement('div');
            newItem.setAttribute(this.DATA_ATTR, index);
            newItem.className = `${this.CUSTOM_CLASSES.POST_ITEM} ${originalRow.className.replace('ub-content', '').trim()}`;

            if (originalRow.classList.contains('us-post--notice')) newItem.classList.add('notice');
            if (originalRow.classList.contains('us-post--recommend')) newItem.classList.add('concept');

            const postTitleDiv = document.createElement('div');
            postTitleDiv.className = 'post-title';

            const originalLink = titleContainer.querySelector('a');
            const subjectSpan = titleContainer.querySelector('.gall_subject');
            const replyNumSpan = titleContainer.querySelector('.reply_num');

            if (subjectSpan) postTitleDiv.appendChild(subjectSpan.cloneNode(true));

            if (originalLink) {
                const newLink = document.createElement('a');
                newLink.href = originalLink.href;
                newLink.className = 'post-title-link';
                if (originalLink.target) newLink.target = originalLink.target;
                
                // [v2.2.0 이식] innerHTML 대신 자식 노드를 직접 복제하여 아이콘(em) 누락 방지
                originalLink.childNodes.forEach(child => {
                    newLink.appendChild(child.cloneNode(true));
                });

                postTitleDiv.appendChild(newLink);
            }

            if (replyNumSpan) postTitleDiv.appendChild(replyNumSpan.cloneNode(true));
            newItem.appendChild(postTitleDiv);

            const postMeta = document.createElement('div');
            postMeta.className = 'post-meta';
            const authorSpan = document.createElement('span');
            authorSpan.className = 'author';
            authorSpan.appendChild(writerEl.cloneNode(true));

            const countEl = originalRow.querySelector('.gall_count');
            const recommendEl = originalRow.querySelector('.gall_recommend');
            const statsSpan = document.createElement('span');
            statsSpan.className = 'stats';
            statsSpan.innerHTML = `조회 ${countEl?.textContent.trim() || '0'} | 추천 ${recommendEl?.textContent.trim() || '0'} | ${dateEl.textContent.trim()}`;

            postMeta.appendChild(authorSpan);
            postMeta.appendChild(statsSpan);
            newItem.appendChild(postMeta);

            this.updateItemVisibility(originalRow, newItem);
            return newItem;
        },

        createBottomControls(listWrap) {
            const gallTabs = listWrap.querySelector(this.SELECTORS.GALL_TABS);
            const pagination = listWrap.querySelector(this.SELECTORS.PAGINATION);
            const searchForm = listWrap.querySelector(this.SELECTORS.SEARCH_FORM);

            if (!gallTabs && !pagination && !searchForm) return null;
            const bottomControls = document.createElement('div');
            bottomControls.className = this.CUSTOM_CLASSES.BOTTOM_CONTROLS;
            if (gallTabs) {
                const buttonRow = document.createElement('div');
                buttonRow.className = 'custom-button-row';
                buttonRow.appendChild(gallTabs.cloneNode(true));
                bottomControls.appendChild(buttonRow);
            }

            if (searchForm) {
                bottomControls.appendChild(searchForm);
            }

            if (pagination) bottomControls.appendChild(pagination.cloneNode(true));

            return bottomControls;
        },

        transformList(listWrap) {
            if (listWrap.querySelector(`.${this.CUSTOM_CLASSES.MOBILE_LIST}`)) return;
            if (listWrap.hasAttribute(this.TRANSFORMED_ATTR)) return;
            listWrap.setAttribute(this.TRANSFORMED_ATTR, 'true');

            const originalTable = listWrap.querySelector(this.SELECTORS.ORIGINAL_TABLE);
            if (!originalTable) return;
            const originalTbody = originalTable.querySelector(this.SELECTORS.ORIGINAL_TBODY);
            if (!originalTbody) return;

            const newListContainer = document.createElement('div');
            newListContainer.className = this.CUSTOM_CLASSES.MOBILE_LIST;

            const originalRows = Array.from(originalTbody.querySelectorAll(this.SELECTORS.ORIGINAL_POST_ITEM));
            originalRows.forEach((row, index) => {
                try {
                    row.setAttribute(this.DATA_ATTR, index);
                    const newItem = this.createMobileListItem(row, index);
                    if (newItem) {
                        this.proxyClick(newItem, row);
                        newListContainer.appendChild(newItem);
                    }
                } catch (error) {
                    console.error('[DC Filter+UI] Failed to process a post item, skipping:', error, row);
                }
            });

            originalTable.parentNode.insertBefore(newListContainer, originalTable.nextSibling);

            const bottomControls = this.createBottomControls(listWrap);
            if (bottomControls) {
                listWrap.appendChild(bottomControls);
            }

            const originalGallTabs = listWrap.querySelector(this.SELECTORS.GALL_TABS);
            const originalPagination = listWrap.querySelector(this.SELECTORS.PAGINATION);
            if(originalGallTabs) originalGallTabs.style.display = 'none';
            if(originalPagination) originalPagination.style.display = 'none';

            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    if (mutation.type === 'attributes' && (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
                        const originalRow = mutation.target;
                        if (!originalRow.matches(this.SELECTORS.ORIGINAL_POST_ITEM)) return;
                        const rowId = originalRow.getAttribute(this.DATA_ATTR);
                        if (rowId) {
                            const mirroredItem = newListContainer.querySelector(`.${this.CUSTOM_CLASSES.POST_ITEM}[${this.DATA_ATTR}='${rowId}']`);
                            if (mirroredItem) this.updateItemVisibility(originalRow, mirroredItem);
                        }
                    }
                });
            });
            observer.observe(originalTbody, { attributes: true, attributeFilter: ['style', 'class'], subtree: true });
        },

        transformWritePage() {
            if (document.body.classList.contains('is-write-page')) return;
            document.body.classList.add('is-write-page');

            const writeBox = document.querySelector('.write_box');
            if(writeBox) {
                const topTable = writeBox.querySelector('.w_top');
                if (topTable) {
                    const userInfoRow = topTable.querySelector('tr:nth-child(2)');
                    if (userInfoRow) {
                        userInfoRow.classList.add('user_info_box');
                        userInfoRow.querySelectorAll('td').forEach(td => td.classList.add('user_info_input'));
                    }
                }
            }
        },

        init() {
            if (isUiInitialized) return;
            isUiInitialized = true;

            if (!document.querySelector('meta[name="viewport"]')) {
                const viewportMeta = document.createElement('meta');
                viewportMeta.name = 'viewport';
                viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
                document.head.appendChild(viewportMeta);
            }

            if (window.location.pathname.includes('/mgallery/')) {
                document.body.classList.add('is-mgallery');
            }

            if (window.location.pathname.includes('/board/write/')) {
                this.transformWritePage();
                return;
            }

            const processAllLists = () => {
                document.querySelectorAll(this.SELECTORS.LIST_WRAP).forEach(lw => this.transformList(lw));
            };

            processAllLists();

            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.matches(this.SELECTORS.LIST_WRAP) || node.querySelector(this.SELECTORS.LIST_WRAP)) {
                                processAllLists();
                                return;
                            }
                        }
                    }
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
    };

    // =================================================================
    // ================ Script-Level Initializations ===================
    // =================================================================
    GM_registerMenuCommand('글댓합 설정하기', FilterModule.showSettings.bind(FilterModule));

    async function main() {
        if (isInitialized) return;
        console.log("[DC Filter+UI] Initializing v2.2.2 (FOUC Fixed)...");

        // [v2.1 수정] 단축키 로드 및 이벤트 리스너 설정
        const shortcutString = await GM_getValue(FilterModule.CONSTANTS.STORAGE_KEYS.SHORTCUT_KEY, 'Shift+S');
        activeShortcutObject = FilterModule.parseShortcutString(shortcutString);

        window.addEventListener('keydown', async (e) => {
            if (!activeShortcutObject || !activeShortcutObject.key) return;

            const isMatch = e.key.toUpperCase() === activeShortcutObject.key &&
                            e.ctrlKey === activeShortcutObject.ctrlKey &&
                            e.shiftKey === activeShortcutObject.shiftKey &&
                            e.altKey === activeShortcutObject.altKey &&
                            e.metaKey === activeShortcutObject.metaKey;

            if (isMatch) {
                e.preventDefault();
                const settingsPanel = document.getElementById(FilterModule.CONSTANTS.UI_IDS.SETTINGS_PANEL);
                if (settingsPanel) {
                    settingsPanel.remove();
                } else {
                    await FilterModule.showSettings();
                }
            }
        });

        await FilterModule.init();
        UIModule.init();
        console.log("[DC Filter+UI] Initialization complete.");
    }

    const runSafely = async () => {
        try {
            await main();
        } catch (error) {
            console.error("[DC Filter+UI] A critical error occurred during main execution:", error);
        } finally {
            // [v2.2.2 수정] 모든 UI 처리 및 필터링 적용이 끝난 후,
            // body에 준비 완료 클래스를 추가하여 화면을 표시합니다.
            document.body.classList.add('script-ui-ready');
            console.log("[DC Filter+UI] UI is now visible.");
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runSafely);
    } else {
        runSafely();
    }
})();
