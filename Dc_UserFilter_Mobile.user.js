// ==UserScript==
// @name         DC_UserFilter_Mobile
// @namespace    http://tampermonkey.net/
// @version      2.6.5
// @description  유저 필터링, UI 개선, 개인 차단/해제 기능 추가
// @author       domato153
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
        /* [최종 해결] 링크 미리보기 텍스트 박스 스타일 재정의 */
        .thum-txtin {
            box-sizing: border-box !important;  /* [핵심] 너비 계산 방식을 올바르게 수정 */
            width: 100% !important;            /* 부모 너비에 꽉 채우도록 설정 */
            overflow: visible !important;      /* 내용이 잘리는 것을 원천 방지 */
        }

        /* [v2.2.7 추가] 즉시 나타나는 커스텀 툴팁 스타일 */
        #custom-instant-tooltip {
            position: fixed; /* 화면 기준으로 위치 고정 */
            display: none; /* 평소에는 숨김 */
            z-index: 2147483647; /* 모든 요소 위에 표시 */
            background-color: rgba(0, 0, 0, 0.8);
            color: #fff;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 14px;
            white-space: nowrap; /* 툴팁 내용이 길어도 줄바꿈 안 함 */
            pointer-events: none; /* 툴팁이 마우스 이벤트를 방해하지 않도록 설정 (중요!) */
        }


        /* [v2.2.3 최종 수정] JS 의존성을 제거한 선언적 FOUC 방지 (새로고침 깜빡임 완벽 해결) */
        /* 스크립트 UI 준비가 완료되기 전까지 body를 숨겨 원본 UI 노출을 원천 차단합니다. */
        body:not(.script-ui-ready) {
            visibility: hidden !important;
        }
        /* body가 숨겨진 상태에서도 로딩 인디케이터는 표시되도록 합니다. */
        body:not(.script-ui-ready)::before {
            content: '스크립트 UI 적용 중...\\A\\A※ 광고 차단 프로그램과 충돌할 수 있습니다.\\A오작동 시  비활성화해주세요.'; /* <-- 수정된 부분 */
            white-space: pre-wrap; /* <-- 추가된 부분 (줄바꿈 적용) */
            text-align: center; /* <-- 추가된 부분 (가운데 정렬) */
            line-height: 1.6; /* <-- 추가된 부분 (줄 간격 조절) */
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
        /* [신규 추가] 야간 모드 전용 로딩 인디케이터 스타일 */
        body.dc-filter-dark-mode:not(.script-ui-ready)::before {
            color: #e0e0e0;
            background-color: #2d2d2d;
            box-shadow: 0 0 15px rgba(0,0,0,0.7);
        }


        /* [수정] FOUC(화면 깜빡임) 방지 및 원본 테이블 숨김 강화 */
        table.gall_list {
            visibility: hidden !important; position: absolute !important;
            top: -9999px !important; left: -9999px !important;
            height: 0 !important; overflow: hidden !important;
        }


        /* [수정] 불필요한 PC버전 요소 및 사이트 광고 아이콘 숨김 */
        #dc_header, #dc_gnb, .adv_area, .right_content, .dc_all, .dcfoot, .dc_ft, .info_policy, .copyrigh, .ad_bottom_list, .bottom_paging_box + div, .intro_bg, .fixed_write_btn, .bottom_movebox, #zzbang_ad ,#zzbang_div,#zzbang_div .my_zzal, .my_dccon, .issue_contentbox, #gall_top_recom.concept_wrap,
        .gall_exposure, .stickyunit, #kakao_search, .banner_box, #ad-layer,#ad-layer-closer, #ad_floating, .__dcNewsWidgetTypeB__, .dctrend_ranking, .cm_ad, .con_banner.writing_banbox, [id^="criteo-"], .ad_left_wing_right_top._BTN_AD_, .ad_left_wing_list_top._BTN_AD_,
        .ad_left_wing_list_top, div:has(> script[src*="list@right_wing_game_main"]),
        .adv_bottom_write, ins.kakao_ad_area, em.icon_ad {
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
        .view_content_wrap, .gall_content, .gall_comment, .comment_box {
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

        /* [최종 수정] 마이너 갤러리 탭 버튼 크기 및 너비 축소 */
        .is-mgallery .list_array_option .array_tab button {
            width: auto !important;        /* 고정 너비 해제 */
            height: auto !important;       /* 고정 높이 해제 */
            font-size: 12px !important;    /* 글자 크기 줄이기 */
            padding: 6px 12px !important;  /* 상하, 좌우 내부 여백 줄이기 */
            line-height: 1.4 !important;   /* 줄 간격 조정 */
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

        /* [이식된 기능] 광고 게시물 기본 숨김 처리 */
        .custom-post-item.is-ad-post {
            display: none !important;
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
            font-size: 24px !important; /* [핵심 수정] 제목/말머리 크기 기준을 부모로 이동 */
        }
        .post-title a {
            color: inherit;
            text-decoration: none;
            display: flex;
            align-items: center;
            /* [핵심 수정] font-size 제거, 부모 크기를 상속받음 */
        }
        .post-title a:visited { color: #770088; }
        .post-title .gall_subject {
            font-weight: bold !important;
            margin-right: 8px; /* 간격 살짝 조정 */
            flex-shrink: 0; /* 말머리가 줄어들지 않도록 설정 */
            border: none !important; /* [요청 수정] 글머리 테두리 제거 */
        }
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


        /* [기존 스타일 유지] 본문/댓글 너비 및 잘림 문제 해결 */
        .writing_view_box .write_div {
            width: 100% !important;
            overflow: visible !important;
            box-sizing: border-box !important;
        }
        .comment_box {
            overflow: visible !important;
        }
        .comment_box .usertxt {
            font-size: 18px !important;
            line-height: 1.7 !important;
            word-break: break-all !important;
            color: #333 !important;
            box-sizing: border-box !important;
        }
        
        /* --- 글 보기/댓글 UI --- */
        .gall_content, .gall_tit_box, .gall_writer_info, .btn_recommend_box, .view_bottom, .gall_comment {
            background: #fff !important;
            padding: 15px !important;
            border-bottom: 1px solid #ddd;
        }


        /* ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ */
        /* [최종 수정] 이미지 댓글 UI 가로 배치 및 모든 문제 해결 */
        
        /* 1. 부모 컨테이너 너비 100%로 확보 */
        .writing_view_box .img_area,
        .writing_view_box .img_comment {
            width: 100% !important;
            box-sizing: border-box !important;
        }

        .writing_view_box .img_comment {
            padding: 15px !important;
            border-top: 1px solid #ddd !important;
            margin-top: 10px !important;
        }

        /* 2. float-flex 충돌 방지 */
        .writing_view_box .img_comment .fl {
            float: none !important;
        }

        /* 3. 텍스트 컨테이너가 남은 공간을 모두 차지하도록 강제 */
        .writing_view_box .img_comment .cmt_txt_cont {
            flex: 1 1 0 !important;
            min-width: 0 !important;
            display: flex !important; /* 자식들을 가로(기본값)로 배치 */
            align-items: stretch !important; /* 자식들의 높이를 통일 */
        }
        
        /* 4. textarea를 감싸는 div가 남은 가로 공간을 모두 차지하도록 설정 (핵심 수정) */
        .writing_view_box .img_comment .cmt_write {
            flex-grow: 1 !important; /* 가로 방향으로 남은 공간 차지 */
            display: flex !important;
        }

        /* 5. textarea가 부모 공간을 꽉 채우도록 설정 */
        .writing_view_box .img_comment textarea {
            width: 100% !important;
            flex-grow: 1 !important;
            box-sizing: border-box !important;
            resize: none !important;
        }

        /* 6. 등록 버튼 영역이 고정된 크기를 갖도록 설정 */
        .writing_view_box .img_comment .cmt_cont_bottm {
            flex-shrink: 0 !important; /* 공간이 부족해도 줄어들지 않음 */
            padding-left: 5px !important; /* textarea와 간격 추가 */
            display: flex;
            align-items: flex-end; /* 버튼을 아래쪽에 정렬 */
        }
                    /* ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ */
        /* [신규 추가] 이미지 댓글 가독성 개선 (폰트 크기 조정) */
        .img_comment .cmt_nickbox {
            font-size: 15px !important; /* 닉네임/IP 폰트 크기 (일반 댓글과 통일) */
        }

        .img_comment .usertxt {
            font-size: 18px !important; /* 댓글 내용 폰트 크기 (일반 댓글과 통일) */
            line-height: 1.6 !important;
        }
        /* ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ */
        /* ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ */

        .gallview_contents img, .gallview_contents video { max-width: 100% !important; height: auto !important;  }


        /* [v2.2.0 이식] 글 본문 가독성 개선 */
        .view_content_wrap .title_subject {
            font-size: 21px !important;
            font-weight: 500 !important;
        }
        .gallview_contents {
            font-size: 26px !important;
            line-height: 1.9 !important;
            word-break: break-all !important;
            /* [최종 해결] 댓글과 동일한 원리로 box-sizing 속성 추가 */
            width: 100% !important;
            box-sizing: border-box !important;
        }
        .gallview_contents p,
        .gallview_contents div,
        .gallview_contents span {
            font-size: inherit !important;
            line-height: inherit !important;
            color: inherit !important;
        }


        /* [v2.2.0 이식] 댓글 가독성 개선 (box-sizing 추가를 위해 위치 이동) */
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
        /* [종합 수정] 글쓰기 페이지 광고 및 빈 공간 제거 */
        .is-write-page .cm_ad,.is-write-page .adv_bottom_write,.is-write-page div[id^="kakao_ad_"] {display: none !important;height: 0 !important;margin: 0 !important;padding: 0 !important;visibility: hidden !important;}

        @media (max-width: 480px) {
            .is-write-page .write_box .user_info_box { flex-direction: column; }
        }


        /* --- [v2.3.2 수정] 개인 차단 기능 UI --- */
        #dc-personal-block-fab {
            position: fixed;
            z-index: 2147483640;
            width: 60px; height: 60px;
            background-color: #3b71fd;
            color: white;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer; /* [수정] 기본 커서를 손가락 모양으로 변경 */
            user-select: none;
            transition: transform 0.2s ease-out, cursor 0.1s; /* [추가] 커서 변경에도 트랜지션 적용 */
        }
        #dc-personal-block-fab:active {
            cursor: grabbing; /* [수정] 드래그 시작(누르는 순간) 시에만 잡는 모양으로 변경 */
            transform: scale(0.95);
        }
        #dc-selection-popup {
            position: fixed;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            z-index: 2147483641;
            background: #fff;
            border: 1px solid #ccc;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            min-width: 320px;
            text-align: center;
        }
        #dc-selection-popup h4 { margin: 0 0 20px 0; font-size: 18px; font-weight: 600; }
        #dc-selection-popup .block-options { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
        #dc-selection-popup .block-option { display: flex; justify-content: space-between; align-items: center; background-color: #f8f9fa; padding: 12px; border-radius: 8px; }
        #dc-selection-popup .block-option span { font-size: 15px; color: #333; word-break: break-all; margin-right: 15px; }
        #dc-selection-popup .block-option button { font-size: 14px; padding: 6px 12px; cursor: pointer; border: none; border-radius: 6px; background-color: #4263eb; color: #fff; font-weight: 500; }
        /* [v2.5.7 추가] 차단 해제 버튼 스타일 */
        #dc-selection-popup .block-option button.btn-unblock { background-color: #e03131; }
        #dc-selection-popup .popup-buttons button { width: 100%; font-size: 16px; padding: 10px; cursor: pointer; border: none; border-radius: 8px; background-color: #e9ecef; color: #555; }
        body.selection-mode-active .gall_writer,
        body.selection-mode-active .ub-writer {
            cursor: pointer !important;
        }


        #dc-block-management-panel-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 2147483645;
        }
        #dc-block-management-panel {
            position: fixed;
            background: #f9f9f9;
            border: 1px solid #ccc;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 2147483646;
            display: flex;
            flex-direction: column;
            min-width: 350px; min-height: 300px;
            resize: both;
            overflow: hidden;
        }
        #dc-block-management-panel .panel-header {
            display: flex;  align-items: center;
            padding: 10px 15px;
            background: #eee;
            border-bottom: 1px solid #ccc;
            cursor: move;
            user-select: none;
        }
        #dc-block-management-panel .panel-header h3 { margin: 0; font-size: 16px; }
        #dc-block-management-panel .panel-close-btn { font-size: 20px; cursor: pointer; border: none; background: none; margin-left: auto;}
        #dc-block-management-panel .panel-tabs { display: flex; border-bottom: 1px solid #ccc; background: #fff; }
        #dc-block-management-panel .panel-tab { flex: 1; padding: 10px; text-align: center; cursor: pointer; border-right: 1px solid #eee; }
        #dc-block-management-panel .panel-tab:last-child { border-right: none; }
        #dc-block-management-panel .panel-tab.active { background: #3b71fd; color: #fff; font-weight: bold; }
        #dc-block-management-panel .panel-body { flex-grow: 1; display: flex; flex-direction: column; overflow: hidden; background: #fff; }
        #dc-block-management-panel .panel-list-controls { padding: 8px 10px; border-bottom: 1px solid #eee; text-align: left; }
        #dc-block-management-panel .select-all-btn,
        #dc-block-management-panel .select-all-global-btn,
        #dc-block-management-panel .panel-backup-btn { /* [수정] 백업 버튼 공통 스타일 적용 */
            font-size: 13px; padding: 4px 8px; cursor: pointer;
            border: 1px solid #ccc; background: #f1f3f5; border-radius: 4px; margin-left: 5px;
        }
        #dc-block-management-panel .panel-content { flex-grow: 1; overflow-y: auto; }
        #dc-block-management-panel .blocked-list { list-style: none; margin: 0; padding: 10px; }
        #dc-block-management-panel .blocked-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 5px; border-bottom: 1px solid #f0f0f0; }
        #dc-block-management-panel .blocked-item.item-to-delete { text-decoration: line-through; opacity: 0.5; }
        #dc-block-management-panel .item-name { font-size: 14px; word-break: break-all; }
        #dc-block-management-panel .delete-item-btn { cursor: pointer; color: #e03131; font-weight: bold; padding: 0 5px; }
        #dc-block-management-panel .panel-footer {
            display: flex; /* [수정] Flexbox 레이아웃으로 변경 */
            justify-content: space-between; /* [수정] 양쪽 끝으로 요소 배치 */
            align-items: center; /* [수정] 세로 중앙 정렬 */
            padding: 10px;
            border-top: 1px solid #ccc;
            background: #f9f9f9;
        }
        #dc-block-management-panel .panel-footer-left {
            display: flex;
            align-items: center;
        }
        #dc-block-management-panel .panel-save-btn { padding: 8px 16px; font-size: 14px; background: #3b71fd; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
        #dc-block-management-panel .panel-resize-handle {
            position: absolute;
            right: 0; bottom: 0;
            width: 15px; height: 15px;
            cursor: nwse-resize;
            background: repeating-linear-gradient(135deg, #ccc, #ccc 1px, transparent 1px, transparent 3px);
        }

        /* [신규] 개인 차단 On/Off 스위치 UI */
        .switch-container { display: flex; align-items: center; margin-left: 15px; }
        .switch { position: relative; display: inline-block; width: 40px; height: 22px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .switch-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 22px; }
        .switch-slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .switch-slider { background-color: #3b71fd; }
        input:checked + .switch-slider:before { transform: translateX(18px); }

        /* [신규] 백업/복원 팝업 UI */
        #dc-backup-popup-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.6);
            z-index: 2147483647;
        }
        #dc-backup-popup {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #fff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 2147483647; padding: 20px; min-width: 350px;
        }
        #dc-backup-popup .popup-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee; }
        #dc-backup-popup .popup-header h4 { margin: 0; font-size: 16px; }
        #dc-backup-popup .popup-close-btn { font-size: 20px; background: none; border: none; cursor: pointer; color: #888; }
        #dc-backup-popup .popup-content { display: flex; flex-direction: column; gap: 15px; }
        #dc-backup-popup .export-section, #dc-backup-popup .import-section { display: flex; flex-direction: column; gap: 8px; }
        #dc-backup-popup label { font-size: 14px; font-weight: bold; }
        #dc-backup-popup .description { font-size: 12px; color: #666; }
        /* [수정] import-controls를 세로 정렬로 변경 */
        #dc-backup-popup .import-controls { display: flex; flex-direction: column; gap: 8px; }
        /* [추가] 파일 입력(<input type="file">) 스타일 */
        #dc-backup-popup .import-file-input {
            font-size: 14px;
            padding: 5px;
            border: 1px solid #ccc;
            border-radius: 4px;
            background-color: #f8f9fa;
        }
        #dc-backup-popup textarea { flex-grow: 1; height: 80px; resize: vertical; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; font-family: monospace; }
        #dc-backup-popup button { padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
        /* [수정] 기존 버튼들에 flex 속성 추가 */
        #dc-backup-popup .export-btn { background-color: #28a745; color: white; flex: 1; }
        /* [추가] '파일로 다운로드' 버튼 전용 스타일 */
        #dc-backup-popup .export-btn-download { background-color: #17a2b8; color: white; flex: 1; }
        /* [수정] 불러오기 버튼 스타일 조정 */
        #dc-backup-popup .import-btn { background-color: #007bff; color: white; width: 100%; margin-top: 8px; }

        /* [수정] DCCon 및 각종 팝업 모바일 반응형 중앙 정렬 */
        #div_con,
        div.popup_content.dccon_popinfo,
        div.pop_wrap.type3 {
            position: fixed !important;      /* 화면(Viewport) 기준 고정 위치 */
            left: 50% !important;             /* 왼쪽에서 50% 지점으로 이동 */
            top: 50% !important;              /* 위쪽에서 50% 지점으로 이동 (수직 중앙 정렬도 함께 적용) */
            transform: translate(-50%, -50%) !important; /* 자신의 크기 절반만큼 왼쪽/위로 이동하여 완벽 중앙 정렬 */
            margin: 0 !important;             /* 외부 여백 제거 */
            z-index: 2147483647 !important;   /* 다른 UI 요소들 위에 표시되도록 z-index 최대값 설정 */
        }
         /* --- [최종 진짜 수정 v9] 야간 모드 완벽 지원 (색상 반전 대응) --- */

        /* 1. 전역 및 기본 레이웃 다크 테마 */
        body.dc-filter-dark-mode,
        body.dc-filter-dark-mode #container,
        body.dc-filter-dark-mode .gall_content,
        body.dc-filter-dark-mode .gall_comment {
            background: #121212 !important;
            color: #e0e0e0 !important;
        }

        body.dc-filter-dark-mode .dcheader.typea,
        body.dc-filter-dark-mode .minor_intro_area,
        body.dc-filter-dark-mode .newvisit_history {
            background: #1c1c1e !important;
            border-bottom-color: #3a3a3c !important;
        }

        body.dc-filter-dark-mode .newvisit_history > .tit {
            color: #e0e0e0 !important;
        }

        /* 2. 커스텀 게시글 목록 다크 테마 */
        body.dc-filter-dark-mode .custom-mobile-list {
            background: #1c1c1e !important;
            border-top-color: #3a3a3c !important;
        }
        body.dc-filter-dark-mode .custom-post-item {
            color: #e0e0e0 !important;
            border-bottom-color: #3a3a3c !important;
        }
        body.dc-filter-dark-mode .custom-post-item:hover {
            background-color: #2a2a2a !important;
        }
        body.dc-filter-dark-mode .custom-post-item.notice,
        body.dc-filter-dark-mode .custom-post-item.concept {
            background-color: #252525 !important;
        }
        body.dc-filter-dark-mode .post-title {
            color: #e0e0e0 !important;
        }
        body.dc-filter-dark-mode .post-title a:visited {
            color: #a9a9a9 !important; /* 방문한 링크 색상 */
        }
        body.dc-filter-dark-mode .post-meta .author .nickname,
        body.dc-filter-dark-mode .post-meta .author .ip {
            color: #b0b0b0 !important;
        }
        body.dc-filter-dark-mode .post-meta,
        body.dc-filter-dark-mode .post-meta .stats {
            color: #888 !important;
        }

        /* 3. 글 본문 및 댓글 다크 테마 */
        body.dc-filter-dark-mode .gall_tit_box,
        body.dc-filter-dark-mode .gall_writer_info,
        body.dc-filter-dark-mode .btn_recommend_box,
        body.dc-filter-dark-mode .view_bottom {
            background: #1c1c1e !important;
            border-bottom-color: #3a3a3c !important;
        }
        
        /* [최종 해결] 본문 글자색 문제 해결: 반전 필터에 대응하여 검은색으로 설정 */
        body.dc-filter-dark-mode .gallview_contents p,
        body.dc-filter-dark-mode .gallview_contents span,
        body.dc-filter-dark-mode .gallview_contents div {
            color: #000000 !important; /* 검은색으로 설정해야 반전되어 흰색으로 보임 */
        }
        
        /* 댓글은 반전 필터의 영향을 받지 않으므로 그대로 밝은 색 설정 */
        body.dc-filter-dark-mode .comment_box .usertxt {
            color: #e0e0e0 !important;
        }

        body.dc-filter-dark-mode .btn_recommend_box .inner_box > .inner {
            background-color: #2a2a2a !important;
            border-color: #444 !important;
        }
        body.dc-filter-dark-mode .btn_recommend_box .up_num,
        body.dc-filter-dark-mode .btn_recommend_box .down_num {
            color: #e0e0e0 !important;
        }

        /* 4. 하단 컨트롤 및 검색창 다크 테마 */
        body.dc-filter-dark-mode .custom-bottom-controls,
        body.dc-filter-dark-mode .custom-bottom-controls form[name="frmSearch"] select {
            background: #1c1c1e !important;
        }
        body.dc-filter-dark-mode .custom-bottom-controls form[name="frmSearch"] input[type="text"] {
            background: #333 !important;
            color: #fff !important;
            border-color: #555 !important;
        }

        /* 5. 스크립트 팝업창 전체 다크 테마 */
        body.dc-filter-dark-mode #dcinside-filter-setting,
        body.dc-filter-dark-mode #dc-selection-popup,
        body.dc-filter-dark-mode #dc-block-management-panel,
        body.dc-filter-dark-mode #dc-backup-popup,
        body.dc-filter-dark-mode #dcinside-shortcut-modal {
            background-color: #2d2d2d !important;
            color: #e0e0e0 !important;
            border-color: #555 !important;
            box-shadow: 0 0 15px rgba(0,0,0,0.7) !important;
        }

        /* 팝업 내부 요소들 */
        body.dc-filter-dark-mode #dcinside-filter-setting > div:first-child,
        body.dc-filter-dark-mode #dcinside-filter-setting > div:last-child,
        body.dc-filter-dark-mode #dc-block-management-panel .panel-header,
        body.dc-filter-dark-mode #dc-block-management-panel .panel-footer,
        body.dc-filter-dark-mode #dc-backup-popup .popup-header,
        body.dc-filter-dark-mode #dc-block-management-panel .panel-tabs {
            background: #252525 !important;
            border-color: #4a4a4a !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting hr,
        body.dc-filter-dark-mode #dc-block-management-panel .panel-tab {
            border-color: #4a4a4a !important;
        }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-body,
        body.dc-filter-dark-mode #dc-selection-popup .block-option {
            background: #3a3a3c !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting div,
        body.dc-filter-dark-mode #dcinside-filter-setting label,
        body.dc-filter-dark-mode #dcinside-filter-setting h3,
        body.dc-filter-dark-mode #dc-selection-popup h4,
        body.dc-filter-dark-mode #dc-selection-popup .block-option span,
        body.dc-filter-dark-mode #dc-backup-popup .description,
        body.dc-filter-dark-mode #dc-backup-popup h4,
        body.dc-filter-dark-mode .item-name {
            color: #e0e0e0 !important;
        }
        body.dc-filter-dark-mode input[type="number"],
        body.dc-filter-dark-mode #dc-backup-popup textarea {
            background-color: #1e1e1e !important;
            color: #f0f0f0 !important;
            border: 1px solid #666 !important;
        }
        body.dc-filter-dark-mode .panel-tab.active {
            background: #007bff !important; /* 활성 탭은 색상 유지 */
        }

        /* 버튼 배경 문제 해결 (필요한 버튼만 개별 적용) */
        body.dc-filter-dark-mode #dcinside-filter-setting button,
        body.dc-filter-dark-mode #dc-selection-popup button,
        body.dc-filter-dark-mode #dc-block-management-panel button,
        body.dc-filter-dark-mode #dc-backup-popup button,
        body.dc-filter-dark-mode #dcinside-shortcut-modal button,
        body.dc-filter-dark-mode .list_bottom_btnbox .btn_grey,
        body.dc-filter-dark-mode .list_bottom_btnbox .btn_blue {
             background-color: #555 !important;
             color: #fff !important;
             border-color: #777 !important;
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
                SHORTCUT_KEY: 'dcinside_shortcut_key',
                // [v2.3.1 추가] 개인 차단 기능용 저장 키
                PERSONAL_BLOCK_LIST: 'dcinside_personal_block_list',
                // [신규] 개인 차단 기능 On/Off 저장 키
                PERSONAL_BLOCK_ENABLED: 'dcinside_personal_block_enabled',
                FAB_POSITION: 'dcinside_fab_position',
                MANAGEMENT_PANEL_GEOMETRY: 'dcinside_management_panel_geometry',
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
            await this.refreshBlockedUidsCache();
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
            // [이식된 기능] 공지 글인 경우 비동기 필터(글댓합/비율)는 건너뜀
            if (element.querySelector('em.icon_notice')) {
                return;
            }
            // [최종 검증 후 수정] '개념글 제외' 기능이 비동기 필터(글댓합)에도 적용되도록 검사 로직을 다시 추가합니다.
            if (this.shouldSkipFiltering(element)) {
                // '개념글 제외'가 켜져있으면 글댓합/비율 필터를 적용하지 않습니다.
                // 단, 개인 차단은 이미 applySyncBlock에서 처리되었으므로 여기서는 display 속성을 건드리지 않습니다.
                return;
            }
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
            const { masterDisabled, blockGuestEnabled, telecomBlockEnabled, blockConfig = {}, blockedGuests = [], personalBlockList, personalBlockEnabled } = dcFilterSettings;

            const writerInfo = element.querySelector(this.CONSTANTS.SELECTORS.WRITER_INFO);
            if (!writerInfo) return;

            const uid = writerInfo.getAttribute('data-uid');
            const nickname = writerInfo.getAttribute('data-nick');
            const ipSpan = element.querySelector(this.CONSTANTS.SELECTORS.IP_SPAN);
            const ip = ipSpan ? ipSpan.textContent.trim().slice(1, -1) : null;

            // 1. 개인 차단 필터 (최고 우선순위)
            // '개념글 제외'나 '모든 기능 끄기'와 관계없이 무조건 먼저 실행됩니다.
            if (personalBlockEnabled && personalBlockList) {
                let isPersonallyBlocked = false;
                if (uid && personalBlockList.uids?.some(u => u.id === uid)) isPersonallyBlocked = true;
                else if (nickname && personalBlockList.nicknames?.includes(nickname)) isPersonallyBlocked = true;
                else if (ip && personalBlockList.ips?.includes(ip)) isPersonallyBlocked = true;

                if (isPersonallyBlocked) {
                    element.style.display = 'none';
                    return; // 개인 차단이므로 다른 필터를 검사하지 않고 즉시 종료
                }
            }

            // [이식된 기능] 개인 차단 로직 실행 후, 공지 글인 경우 일반 필터는 건너뜀
            if (element.querySelector('em.icon_notice')) {
                element.style.display = ''; // 숨겨져 있었다면 다시 표시
                return; // 일반 필터링(유동, 통피 등)을 건너뛰고 함수 종료
            }

            // 2. 개인 차단이 아닌 경우, 나머지 필터 로직 진행
            // '개념글 제외' 옵션이 켜져있고, 개념글 페이지라면 필터링을 건너뜀
            if (this.shouldSkipFiltering(element)) {
                element.style.display = '';
                return;
            }

            // '모든 기능 끄기' 옵션이 켜져있다면 필터링을 건너뜀
            if (masterDisabled) {
                element.style.display = '';
                return;
            }

            // 3. 일반 필터링 (글댓합, 통피, 유동 등)
            const isGuest = (!uid || uid.length < 3) && ip;
            let isBlocked = false;

            const telecomBlockRegex = (telecomBlockEnabled && blockConfig.ip) ? new RegExp('^(' + blockConfig.ip.split('||').map(p => p.replace(/\./g, '\\.') + '(?=\\.|$)').join('|') + ')') : null;
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
                // [디버깅 추가]
                new MutationObserver(mutations => {
                    console.log(`[디버깅] FilterModule attachObserver 실행됨. (container:`, container, `, mutations: ${mutations.length}개)`); // 디버깅 로그 추가
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


            // [디버깅 추가]
            const bodyObserver = new MutationObserver(mutations => {
                console.log(`[디버깅] FilterModule bodyObserver 실행됨. (mutations: ${mutations.length}개)`); // 디버깅 로그 추가
                mutations.forEach(m => m.addedNodes.forEach(n => {
                    if (n.parentNode && n.parentNode.closest && (n.parentNode.closest('#dc-backup-popup') || n.parentNode.closest('#dc-block-management-panel') || n.parentNode.closest('#dcinside-filter-setting'))) {
                        return;
                    }
                    if (n.nodeType === 1 && !n.closest('.user_data')) {
                        targets.forEach(t => { if (n.matches(t.c)) attachObserver(n, t.i); else if (n.querySelectorAll) n.querySelectorAll(t.c).forEach(c => attachObserver(c, t.i)); });
                    }
                }));
            });
            targets.forEach(t => document.querySelectorAll(t.c).forEach(c => attachObserver(c, t.i)));
            bodyObserver.observe(observerTarget, { childList: true, subtree: true });
        },
        async reloadSettings() {
            const [
                masterDisabled, excludeRecommended, threshold, ratioEnabled,
                ratioMin, ratioMax, blockGuestEnabled, telecomBlockEnabled,
                blockedGuests, blockConfig, personalBlockList, personalBlockEnabled
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
                GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG, {}),
                PersonalBlockModule.loadPersonalBlocks(),
                // [신규] 개인 차단 기능 활성화 상태 로드 (기본값 true)
                GM_getValue(this.CONSTANTS.STORAGE_KEYS.PERSONAL_BLOCK_ENABLED, true)
            ]);


            dcFilterSettings = {
                masterDisabled, excludeRecommended, threshold, ratioEnabled,
                ratioMin: parseFloat(ratioMin),
                ratioMax: parseFloat(ratioMax),
                blockGuestEnabled, telecomBlockEnabled, blockedGuests, blockConfig,
                personalBlockList,
                personalBlockEnabled // [신규] 설정 객체에 추가
            };
        },
        async refilterAllContent() {
            await this.reloadSettings();
            const allContentItems = document.querySelectorAll([this.CONSTANTS.SELECTORS.POST_ITEM, this.CONSTANTS.SELECTORS.COMMENT_ITEM, `${this.CONSTANTS.SELECTORS.POST_VIEW_LIST_CONTAINER} > li`].join(', '));
            allContentItems.forEach(element => { if (!dcFilterSettings.masterDisabled) element.style.display = ''; this.applySyncBlock(element); this.applyAsyncBlock(element); });
            document.dispatchEvent(new CustomEvent('dcFilterRefiltered'));
        },
        // [수정] handleVisibilityChange를 async 함수로 변경하고 reloadShortcutKey 호출 추가
        async handleVisibilityChange() {
            if (document.visibilityState === 'visible') {
                await reloadShortcutKey(); // 단축키 설정을 다시 로드
                this.refilterAllContent(); // 기존 필터 설정을 다시 로드하고 적용
            }
        },
        async init() {
            if (isInitialized) return; isInitialized = true;
            await this.reloadSettings();

            // [수정] 개념글 목록에서 스크립트가 조기 종료되던 문제를 해결하기 위해 아래 라인을 삭제했습니다.
            // if (dcFilterSettings.excludeRecommended && window.location.pathname.includes('/lists/') && this.isRecommendedContext()) return;

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
     * =================== Personal Block Module =======================
     * =================================================================
     */
    const PersonalBlockModule = {
        isSelectionMode: false,
        personalBlockListCache: { uids: [], nicknames: [], ips: [] },


        async init() {
            this.personalBlockListCache = await this.loadPersonalBlocks();
            this.createFab();
            document.addEventListener('click', this.handleSelectionClick.bind(this), true);
        },


        async loadPersonalBlocks() {
            const list = await GM_getValue(FilterModule.CONSTANTS.STORAGE_KEYS.PERSONAL_BLOCK_LIST, { uids: [], nicknames: [], ips: [] });
            // 데이터 구조 보정
            if (!list.uids) list.uids = [];
            if (!list.nicknames) list.nicknames = [];
            if (!list.ips) list.ips = [];
            return list;
        },


        async savePersonalBlocks() {
            await GM_setValue(FilterModule.CONSTANTS.STORAGE_KEYS.PERSONAL_BLOCK_LIST, this.personalBlockListCache);
        },


        async addBlock(type, value, displayName = null) {
            if (!value) return;
            this.personalBlockListCache = await this.loadPersonalBlocks(); // 최신 데이터로 갱신


            switch (type) {
                case 'uid':
                    if (!this.personalBlockListCache.uids.some(u => u.id === value)) {
                        this.personalBlockListCache.uids.push({ id: value, name: displayName || value });
                    }
                    break;
                case 'nickname':
                    if (!this.personalBlockListCache.nicknames.includes(value)) {
                        this.personalBlockListCache.nicknames.push(value);
                    }
                    break;
                case 'ip':
                    if (!this.personalBlockListCache.ips.includes(value)) {
                        this.personalBlockListCache.ips.push(value);
                    }
                    break;
            }
            await this.savePersonalBlocks();
            await FilterModule.refilterAllContent();
            this.exitSelectionMode();
        },

        // [v2.5.7 추가] 사용자의 차단 상태를 확인하는 헬퍼 함수
        checkBlockStatus(userInfo) {
            const { nick, uid, ip } = userInfo;
            const cache = this.personalBlockListCache;
            return {
                isNickBlocked: nick ? cache.nicknames.includes(nick) : false,
                isUidBlocked: uid ? cache.uids.some(u => u.id === uid) : false,
                isIpBlocked: ip ? cache.ips.includes(ip) : false,
            };
        },

        // [v2.5.7 추가] 특정 항목을 차단 목록에서 제거하는 함수
        async removeBlock(type, value) {
            if (!value) return;
            this.personalBlockListCache = await this.loadPersonalBlocks(); // 최신 데이터로 갱신

            switch (type) {
                case 'uid':
                    this.personalBlockListCache.uids = this.personalBlockListCache.uids.filter(u => u.id !== value);
                    break;
                case 'nickname':
                    this.personalBlockListCache.nicknames = this.personalBlockListCache.nicknames.filter(n => n !== value);
                    break;
                case 'ip':
                    this.personalBlockListCache.ips = this.personalBlockListCache.ips.filter(i => i !== value);
                    break;
            }
            await this.savePersonalBlocks();
            await FilterModule.refilterAllContent();
            this.exitSelectionMode();
        },

        createFab() {
            // [수정] 글 목록 및 글 내용 페이지에서만 '간편차단' 버튼을 표시합니다.
            const currentPath = window.location.pathname;
            if (!currentPath.includes('/board/lists') && !currentPath.includes('/board/view')) {
                return; // 대상 페이지가 아니면 버튼을 생성하지 않고 함수를 종료합니다.
            }

            // [방어 코드 1] 이미 FAB가 존재하면 중복 생성을 방지
            if (document.getElementById('dc-personal-block-fab')) {
                return;
            }


            const fab = document.createElement('div');
            fab.id = 'dc-personal-block-fab';
            fab.textContent = '간편차단';
            document.body.appendChild(fab);


            fab.addEventListener('click', (e) => {
                if (fab.getAttribute('data-dragged') === 'true') {
                    fab.removeAttribute('data-dragged');
                    return;
                }
                this.enterSelectionMode();
            });


            // 드래그 기능
            let isDragging = false, offsetX, offsetY;
            const onDragStart = (e) => { // async 제거 (필요 없음)
                isDragging = true;
                fab.style.transition = 'none';
                const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
                const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
                const rect = fab.getBoundingClientRect();
                offsetX = clientX - rect.left;
                offsetY = clientY - rect.top;
                fab.setAttribute('data-dragged', 'false');
            };


            const onDragMove = (e) => {
                if (!isDragging) return;
                e.preventDefault();
                fab.setAttribute('data-dragged', 'true');
                const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
                const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
                let newX = clientX - offsetX;
                let newY = clientY - offsetY;
                newX = Math.max(0, Math.min(newX, window.innerWidth - fab.offsetWidth));
                newY = Math.max(0, Math.min(newY, window.innerHeight - fab.offsetHeight));
                fab.style.left = `${newX}px`;
                fab.style.top = `${newY}px`;
                // [방어 코드 2] right, bottom 속성 제거하여 left/top과 충돌 방지
                fab.style.right = 'auto';
                fab.style.bottom = 'auto';
            };


            const onDragEnd = () => { // async 키워드 제거
                if (!isDragging) return;
                isDragging = false;
                fab.style.transition = 'transform 0.2s ease-out';

                // GM_setValue 호출을 포함한 위치 저장 로직 전체를 제거하여
                // 드래그가 끝나도 위치가 저장되지 않도록 합니다.
            };


            fab.addEventListener('mousedown', onDragStart);
            document.addEventListener('mousemove', onDragMove);
            document.addEventListener('mouseup', onDragEnd);
            fab.addEventListener('touchstart', onDragStart, { passive: true });
            document.addEventListener('touchmove', onDragMove, { passive: false });
            document.addEventListener('touchend', onDragEnd);


            // 저장된 위치 로드 대신 항상 기본 위치에 생성
            (() => { // async 키워드 제거
                // 저장된 위치를 불러오는 대신 항상 기본 위치를 사용하도록 수정
                const defaultPos = { left: 'auto', top: 'auto', right: '20px', bottom: '20px' };
                // GM_getValue 및 유효성 검사 로직을 제거하고, defaultPos를 바로 적용합니다.
                Object.assign(fab.style, defaultPos);
            })();
        },

        enterSelectionMode() {
            if (this.isSelectionMode) return;
            this.isSelectionMode = true;
            document.body.classList.add('selection-mode-active');


            const popup = document.createElement('div');
            popup.id = 'dc-selection-popup';
            popup.innerHTML = `
                <h4>차단할 유저를 선택하세요</h4>
                <div class="popup-buttons">
                    <button class="cancel-btn">취소</button>
                </div>
            `;
            document.body.appendChild(popup);
            popup.querySelector('.cancel-btn').onclick = () => this.exitSelectionMode();
        },


        exitSelectionMode() {
            if (!this.isSelectionMode) return;
            this.isSelectionMode = false;
            document.body.classList.remove('selection-mode-active');
            const popup = document.getElementById('dc-selection-popup');
            if (popup) popup.remove();
        },


        handleSelectionClick(e) {
            if (!this.isSelectionMode) return;
            const popup = document.getElementById('dc-selection-popup');
            if (popup && popup.contains(e.target)) return;


            const writerEl = e.target.closest('.gall_writer, .ub-writer');
            if (writerEl) {
                e.preventDefault();
                e.stopPropagation();


                const nick = writerEl.getAttribute('data-nick');
                const uid = writerEl.getAttribute('data-uid');
                const ip = writerEl.getAttribute('data-ip');


                this.showSelectionPopup({ nick, uid, ip });
            }
        },


        // [v2.5.7 수정] 차단/차단 해제 버튼을 동적으로 생성
        showSelectionPopup(userInfo) {
            this.exitSelectionMode();
            this.isSelectionMode = true;
            document.body.classList.add('selection-mode-active');

            const popup = document.createElement('div');
            popup.id = 'dc-selection-popup';

            // [핵심 변경] 사용자의 차단 상태를 먼저 확인
            const blockStatus = this.checkBlockStatus(userInfo);
            let optionsHtml = '';

            // 닉네임 처리
            if (userInfo.nick) {
                if (blockStatus.isNickBlocked) {
                    optionsHtml += `<div class="block-option"><span>닉네임: ${userInfo.nick}</span><button class="btn-unblock" data-type="nickname" data-value="${userInfo.nick}">차단 해제</button></div>`;
                } else {
                    optionsHtml += `<div class="block-option"><span>닉네임: ${userInfo.nick}</span><button data-type="nickname" data-value="${userInfo.nick}">차단</button></div>`;
                }
            }
            // UID 처리
            if (userInfo.uid) {
                const displayName = `${userInfo.nick}(${userInfo.uid})`;
                if (blockStatus.isUidBlocked) {
                    optionsHtml += `<div class="block-option"><span>식별번호: ${displayName}</span><button class="btn-unblock" data-type="uid" data-value="${userInfo.uid}" data-display-name="${displayName}">차단 해제</button></div>`;
                } else {
                    optionsHtml += `<div class="block-option"><span>식별번호: ${displayName}</span><button data-type="uid" data-value="${userInfo.uid}" data-display-name="${displayName}">차단</button></div>`;
                }
            }
            // IP 처리
            if (userInfo.ip) {
                if (blockStatus.isIpBlocked) {
                    optionsHtml += `<div class="block-option"><span>IP: ${userInfo.ip}</span><button class="btn-unblock" data-type="ip" data-value="${userInfo.ip}">차단 해제</button></div>`;
                } else {
                    optionsHtml += `<div class="block-option"><span>IP: ${userInfo.ip}</span><button data-type="ip" data-value="${userInfo.ip}">차단</button></div>`;
                }
            }

            popup.innerHTML = `
                <h4>어떤 정보를 처리할까요?</h4>
                <div class="block-options">${optionsHtml}</div>
                <div class="popup-buttons"><button class="cancel-btn">취소</button></div>
            `;
            document.body.appendChild(popup);

            popup.querySelector('.cancel-btn').onclick = () => this.exitSelectionMode();

            // [핵심 변경] 이벤트 핸들러 통합
            popup.querySelectorAll('.block-options button').forEach(btn => {
                btn.onclick = () => {
                    const { type, value, displayName } = btn.dataset;
                    if (btn.classList.contains('btn-unblock')) {
                        // '차단 해제' 버튼 클릭 시
                        this.removeBlock(type, value);
                    } else {
                        // '차단' 버튼 클릭 시
                        this.addBlock(type, value, displayName);
                    }
                };
            });
        },


        // [신규] 차단 목록 병합 헬퍼 함수
        mergeBlockLists(existing, imported) {
            // UIDs 병합 (중복 ID 확인)
            const existingUIDs = new Set(existing.uids.map(u => u.id));
            const mergedUIDs = [...existing.uids];
            imported.uids.forEach(importedUser => {
                if (!existingUIDs.has(importedUser.id)) {
                    mergedUIDs.push(importedUser);
                }
            });

            // Nicknames, IPs 병합 (Set을 사용하여 간단하게 중복 제거)
            const mergedNicknames = [...new Set([...existing.nicknames, ...imported.nicknames])];
            const mergedIPs = [...new Set([...existing.ips, ...imported.ips])];

            return { uids: mergedUIDs, nicknames: mergedNicknames, ips: mergedIPs };
        },

        // [신규] 백업 및 복원 팝업 생성 함수
        async createBackupPopup() {
            if (document.getElementById('dc-backup-popup')) return;

            const overlay = document.createElement('div');
            overlay.id = 'dc-backup-popup-overlay';

            const popup = document.createElement('div');
            popup.id = 'dc-backup-popup';
            popup.innerHTML = `
                <div class="popup-header">
                    <h4>차단 목록 백업/복원</h4>
                    <button class="popup-close-btn">×</button>
                </div>
                <div class="popup-content">
                    <div class="export-section">
                        <label>내보내기</label>
                        <span class="description">현재 차단 목록 전체를 파일로 저장하거나 클립보드에 복사합니다.</span>
                        <div style="display: flex; gap: 8px; margin-top: 5px;">
                            <button class="export-btn-download">파일로 다운로드</button>
                            <button class="export-btn">클립보드에 복사</button>
                        </div>
                    </div>
                    <hr style="border: 0; border-top: 1px solid #eee;">
                    <div class="import-section">
                        <label>불러오기</label>
                        <span class="description">백업 파일을 선택하거나, 아래 텍스트 영역에 직접 붙여넣으세요.</span>
                        <div class="import-controls">
                           <input type="file" class="import-file-input" accept=".json,.txt">
                           <textarea placeholder="또는, 백업 데이터를 여기에 붙여넣으세요..."></textarea>
                        </div>
                         <button class="import-btn">불러오기</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);
            document.body.appendChild(popup);

            const closePopup = () => {
                overlay.remove();
                popup.remove();
            };

            popup.querySelector('.popup-close-btn').onclick = closePopup;
            overlay.onclick = closePopup;
            // [추가] 파일로 다운로드 버튼 이벤트 핸들러
            popup.querySelector('.export-btn-download').onclick = async () => {
                const data = await this.loadPersonalBlocks();
                const jsonString = JSON.stringify(data, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = url;

                const date = new Date();
                const timestamp = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}`;
                a.download = `dc_blocklist_backup_${timestamp}.json`;

                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                alert('백업 파일 다운로드를 시작합니다.');
            };
            popup.querySelector('.export-btn').onclick = async () => {
                const data = await this.loadPersonalBlocks();
                const jsonString = JSON.stringify(data, null, 2);
                try {
                    await navigator.clipboard.writeText(jsonString);
                    alert('차단 목록이 클립보드에 복사되었습니다.');
                } catch (err) {
                    alert('클립보드 복사에 실패했습니다. 콘솔을 확인해주세요.');
                    console.error('클립보드 복사 실패:', err);
                }
            };

            // [수정] 불러오기 기능 (파일/텍스트 모두 처리)

            // 공통 데이터 처리 로직을 별도 함수로 분리
            const processImportData = async (jsonString) => {
                if (!jsonString || !jsonString.trim()) {
                    alert('불러올 데이터가 없습니다.');
                    return;
                }

                let importedList;
                try {
                    importedList = JSON.parse(jsonString);
                    if (typeof importedList !== 'object' || !importedList.uids || !importedList.nicknames || !importedList.ips) {
                       throw new Error('Invalid data format');
                    }
                } catch (err) {
                    alert('데이터 형식이 올바르지 않습니다. JSON 형식이 맞는지 확인해주세요.');
                    return;
                }

                const currentList = await this.loadPersonalBlocks();
                const mergedList = this.mergeBlockLists(currentList, importedList);

                this.personalBlockListCache = mergedList;
                await this.savePersonalBlocks();
                await FilterModule.refilterAllContent();

                alert('차단 목록을 성공적으로 불러와서 추가했습니다.');
                closePopup();
                const managementPanel = document.getElementById('dc-block-management-panel');
                if (managementPanel) managementPanel.querySelector('.panel-close-btn').click();
            };

            // 불러오기 버튼 클릭 이벤트
            popup.querySelector('.import-btn').onclick = async () => {
                const fileInput = popup.querySelector('.import-file-input');
                const textarea = popup.querySelector('textarea');

                // 1순위: 파일이 선택되었는지 확인
                if (fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    const reader = new FileReader();

                    reader.onload = (e) => {
                        // 파일 읽기가 완료되면 데이터 처리 함수 호출
                        processImportData(e.target.result);
                    };
                    reader.onerror = () => {
                        alert('파일을 읽는 중 오류가 발생했습니다.');
                    };

                    reader.readAsText(file); // 파일 읽기 시작
                }
                // 2순위: 파일이 없다면 textarea의 값을 사용
                else {
                    processImportData(textarea.value);
                }
            };
        },


        // [수정] 차단 관리 패널 로직 전체 개선 (On/Off 스위치, 백업 버튼 추가)
        async createManagementPanel() {
            if (document.getElementById('dc-block-management-panel')) return;


            const originalBlockList = await this.loadPersonalBlocks();
            const itemsToDelete = { uids: new Set(), nicknames: new Set(), ips: new Set() };
            const isPersonalBlockEnabled = await GM_getValue(FilterModule.CONSTANTS.STORAGE_KEYS.PERSONAL_BLOCK_ENABLED, true);


            const overlay = document.createElement('div');
            overlay.id = 'dc-block-management-panel-overlay';


            const panel = document.createElement('div');
            panel.id = 'dc-block-management-panel';
            panel.innerHTML = `
                <div class="panel-header">
                    <h3>차단 유저 관리</h3>
                    <div class="switch-container">
                        <label class="switch">
                            <input type="checkbox" id="personal-block-toggle" ${isPersonalBlockEnabled ? 'checked' : ''}>
                            <span class="switch-slider"></span>
                        </label>
                    </div>
                    <button class="panel-close-btn">×</button>
                </div>
                <div class="panel-tabs">
                    <div class="panel-tab active" data-type="uids">식별 번호</div>
                    <div class="panel-tab" data-type="nicknames">닉네임</div>
                    <div class="panel-tab" data-type="ips">아이피</div>
                </div>
                <div class="panel-body">
                    <div class="panel-list-controls">
                        <button class="select-all-btn">해당 탭 전체 선택/해제</button>
                    </div>
                    <div class="panel-content">
                        <ul class="blocked-list"></ul>
                    </div>
                </div>
                <div class="panel-footer">
                    <div class="panel-footer-left">
                        <button class="select-all-global-btn">모든 탭 전체 선택/해제</button>
                        <button class="panel-backup-btn">백업</button>
                    </div>
                    <button class="panel-save-btn">저장</button>
                </div>
                <div class="panel-resize-handle"></div>
            `;
            document.body.appendChild(overlay);
            document.body.appendChild(panel);

            // [신규] On/Off 스위치 이벤트 리스너
            const toggleSwitch = panel.querySelector('#personal-block-toggle');
            toggleSwitch.addEventListener('change', async (e) => {
                const isEnabled = e.target.checked;
                await GM_setValue(FilterModule.CONSTANTS.STORAGE_KEYS.PERSONAL_BLOCK_ENABLED, isEnabled);
                dcFilterSettings.personalBlockEnabled = isEnabled; // 즉시 설정 반영
                await FilterModule.refilterAllContent(); // 필터 재적용
            });

            // [신규] 백업 버튼 이벤트 리스너
            panel.querySelector('.panel-backup-btn').onclick = () => {
                this.createBackupPopup();
            };

            const globalSelectAllBtn = panel.querySelector('.select-all-global-btn');


            const isEverythingSelected = () => {
                const totalItems = originalBlockList.uids.length + originalBlockList.nicknames.length + originalBlockList.ips.length;
                if (totalItems === 0) return false; // 아무것도 없으면 선택된 게 아님
                const totalSelected = itemsToDelete.uids.size + itemsToDelete.nicknames.size + itemsToDelete.ips.size;
                return totalItems === totalSelected;
            };


            const updateGlobalSelectAllButtonState = () => {
                if (isEverythingSelected()) {
                    globalSelectAllBtn.textContent = '모든 탭 전체 해제';
                } else {
                    globalSelectAllBtn.textContent = '모든 탭 전체 선택';
                }
            };


            const renderList = (type) => {
                const listEl = panel.querySelector('.blocked-list');
                listEl.innerHTML = '';
                const data = originalBlockList[type] || [];


                data.forEach(item => {
                    const li = document.createElement('li');
                    li.className = 'blocked-item';
                    const value = (typeof item === 'object') ? item.id : item;
                    const name = (typeof item === 'object') ? item.name : item;
                    li.dataset.value = value;
                    li.innerHTML = `<span class="item-name">${name}</span><span class="delete-item-btn">X</span>`;


                    if (itemsToDelete[type].has(value)) {
                        li.classList.add('item-to-delete');
                    }


                    li.querySelector('.delete-item-btn').onclick = () => {
                        if (li.classList.toggle('item-to-delete')) {
                            itemsToDelete[type].add(value);
                        } else {
                            itemsToDelete[type].delete(value);
                        }
                        updateSelectAllButtonState(type);
                        updateGlobalSelectAllButtonState(); // [추가] 개별 변경 시 전역 버튼 상태도 업데이트
                    };
                    listEl.appendChild(li);
                });
                updateSelectAllButtonState(type);
                updateGlobalSelectAllButtonState(); // [추가] 탭 변경 시 전역 버튼 상태도 업데이트
            };


            const updateSelectAllButtonState = (type) => {
                const selectAllBtn = panel.querySelector('.select-all-btn');
                const currentList = originalBlockList[type] || [];
                if (currentList.length > 0 && itemsToDelete[type].size === currentList.length) {
                    selectAllBtn.textContent = '해당 탭 전체 해제';
                    selectAllBtn.dataset.action = 'deselect';
                } else {
                    selectAllBtn.textContent = '해당 탭 전체 선택';
                    selectAllBtn.dataset.action = 'select';
                }
            };


            const handleSelectAll = () => {
                const type = panel.querySelector('.panel-tab.active').dataset.type;
                const selectAllBtn = panel.querySelector('.select-all-btn');
                const shouldSelectAll = selectAllBtn.dataset.action === 'select';


                const currentList = originalBlockList[type] || [];
                currentList.forEach(item => {
                    const value = (typeof item === 'object') ? item.id : item;
                    if (shouldSelectAll) {
                        itemsToDelete[type].add(value);
                    } else {
                        itemsToDelete[type].delete(value);
                    }
                });
                renderList(type);
            };


            panel.querySelector('.select-all-btn').onclick = handleSelectAll;


            globalSelectAllBtn.onclick = () => {
                const shouldSelectEverything = !isEverythingSelected();


                if (shouldSelectEverything) {
                    originalBlockList.uids.forEach(u => itemsToDelete.uids.add(u.id));
                    originalBlockList.nicknames.forEach(n => itemsToDelete.nicknames.add(n));
                    originalBlockList.ips.forEach(i => itemsToDelete.ips.add(i));
                } else {
                    itemsToDelete.uids.clear();
                    itemsToDelete.nicknames.clear();
                    itemsToDelete.ips.clear();
                }
                const activeTabType = panel.querySelector('.panel-tab.active').dataset.type;
                renderList(activeTabType);
            };




            const tabs = panel.querySelectorAll('.panel-tab');
            tabs.forEach(tab => {
                tab.onclick = () => {
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    renderList(tab.dataset.type);
                };
            });


            const closePanel = () => {
                overlay.remove();
                panel.remove();
            };


            panel.querySelector('.panel-close-btn').onclick = closePanel;
            overlay.onclick = closePanel;


            panel.querySelector('.panel-save-btn').onclick = async () => {
                const finalBlockList = {
                    uids: originalBlockList.uids.filter(u => !itemsToDelete.uids.has(u.id)),
                    nicknames: originalBlockList.nicknames.filter(n => !itemsToDelete.nicknames.has(n)),
                    ips: originalBlockList.ips.filter(i => !itemsToDelete.ips.has(i))
                };


                this.personalBlockListCache = finalBlockList;
                await this.savePersonalBlocks();
                await FilterModule.refilterAllContent();
                closePanel();
            };


            // 드래그 & 리사이즈 로직 전체 개선
            let isDragging = false, isResizing = false;
            let offsetX, offsetY, lastX, lastY; // lastX, lastY는 리사이즈 전용


            const onDragStart = (e) => {
                if (e.button !== 0) return;


                if (e.target.classList.contains('panel-resize-handle')) {
                    isResizing = true;
                } else if (e.target.closest('.panel-header')) {
                    isDragging = true;
                } else {
                    return;
                }


                const rect = panel.getBoundingClientRect();


                if (panel.style.transform !== 'none') {
                    panel.style.transform = 'none';
                    panel.style.left = `${rect.left}px`;
                    panel.style.top = `${rect.top}px`;
                }


                if (isDragging) {
                    offsetX = e.clientX - rect.left;
                    offsetY = e.clientY - rect.top;
                } else if (isResizing) {
                    lastX = e.clientX;
                    lastY = e.clientY;
                }


                document.addEventListener('mousemove', onDragMove);
                document.addEventListener('mouseup', onDragEnd, { once: true });
            };


            const onDragMove = (e) => {
                e.preventDefault();


                if (isDragging) {
                    const rect = panel.getBoundingClientRect();
                    let newX = e.clientX - offsetX;
                    let newY = e.clientY - offsetY;


                    newX = Math.max(0, Math.min(newX, window.innerWidth - rect.width));
                    newY = Math.max(0, Math.min(newY, window.innerHeight - rect.height));


                    panel.style.left = `${newX}px`;
                    panel.style.top = `${newY}px`;
                } else if (isResizing) {
                    const dx = e.clientX - lastX;
                    const dy = e.clientY - lastY;
                    lastX = e.clientX;
                    lastY = e.clientY;


                    const rect = panel.getBoundingClientRect();
                    panel.style.width = `${rect.width + dx}px`;
                    panel.style.height = `${rect.height + dy}px`;
                }
            };


            const onDragEnd = () => { // async 키워드 제거
                isDragging = false;
                isResizing = false;
                document.removeEventListener('mousemove', onDragMove);
                // GM_setValue 호출을 제거하여 창의 위치/크기 상태를 저장하지 않음
            };


            panel.addEventListener('mousedown', onDragStart);


            (() => { // async 키워드 제거
                // 저장된 값을 불러오는 대신 항상 기본값으로 패널 위치와 크기를 설정
                const defaultGeo = {
                    left: '50%', top: '50%', width: '400px', height: '500px'
                };
                // 기본값은 항상 % 단위이므로, transform 스타일을 항상 적용하여 정중앙에 배치
                panel.style.transform = 'translate(-50%, -50%)';
                Object.assign(panel.style, defaultGeo);

                renderList('uids'); // 초기 렌더링
            })();
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


        proxyClick(customItem, originalRow) {
            customItem.addEventListener('click', (e) => {
                // 개인 차단 모드일 때는 클릭 프록시 비활성화
                if (PersonalBlockModule.isSelectionMode) {
                    e.preventDefault();
                    return;
                }
                const clickedElement = e.target;
                if (clickedElement.closest('span.reply_num')) {
                    e.preventDefault();
                    const originalReplyLink = originalRow.querySelector('a.reply_numbox');
                    if (originalReplyLink) originalReplyLink.click();
                    return;
                }
                if (clickedElement.closest('.author')) {
                    e.preventDefault();
                    const originalAuthor = originalRow.querySelector('.gall_writer');
                    if (originalAuthor) originalAuthor.click();
                    return;
                }
            });
        },


        updateItemVisibility(originalRow, mirroredItem) {
            const isDibsBlocked = originalRow.classList.contains('block-disable');
            const isUserFilterBlocked = originalRow.style.display === 'none';
            mirroredItem.style.display = (isDibsBlocked || isUserFilterBlocked) ? 'block' : 'none';
            // [수정] block/none이 반대로 되어있던 것을 수정
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

            // [이식된 기능] 광고 글(icon_ad)인 경우 식별 클래스 추가
            if (originalRow.querySelector('em.icon_ad')) {
                newItem.classList.add('is-ad-post');
            }

            if (originalRow.classList.contains('us-post--notice')) newItem.classList.add('notice');
            if (originalRow.classList.contains('us-post--recommend')) newItem.classList.add('concept');


            const postTitleDiv = document.createElement('div');
            postTitleDiv.className = 'post-title';


            const originalLink = titleContainer.querySelector('a');
            const subjectSpan = originalRow.querySelector('.gall_subject');
            const replyNumSpan = titleContainer.querySelector('.reply_num');


            if (subjectSpan) {
                const newSubjectSpan = subjectSpan.cloneNode(true);
                newSubjectSpan.setAttribute('title', subjectSpan.textContent.trim());
                postTitleDiv.appendChild(newSubjectSpan);
            }


            if (originalLink) {
                const newLink = document.createElement('a');
                newLink.href = originalLink.href;
                newLink.className = 'post-title-link';
                if (originalLink.target) newLink.target = originalLink.target;


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
                buttonRow.appendChild(gallTabs);
                bottomControls.appendChild(buttonRow);
            }


            if (searchForm && !bottomControls.contains(searchForm)) {
                bottomControls.appendChild(searchForm);
            }


            if (pagination) {
                bottomControls.appendChild(pagination);
            }


            return bottomControls;
        },


        applyForceRefreshPagination(containerElement) {
            if (!containerElement) return;
            containerElement.addEventListener('click', (e) => {
                const link = e.target.closest('a');
                if (!link) return;

                // ▼▼▼ [수정됨] 이 부분을 추가하여 'javascript:;' 링크는 무시하도록 변경 ▼▼▼
                // 'ㅇㅇ님' 버튼과 같이 자바스크립트 실행이 목적인 링크의 이벤트를 가로채지 않도록 예외 처리합니다.
                if (link.getAttribute('href') === 'javascript:;') {
                    return;
                }
                // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

                const onclickAttr = link.getAttribute('onclick') || '';
                const hrefAttr = link.getAttribute('href') || '';
                if (onclickAttr.includes('goWrite') || onclickAttr.includes('showLayer') || hrefAttr.includes('listDisp') || onclickAttr.includes('listSearchHead')) {
                    return;
                }
                if (link.href) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    window.location.href = link.href;
                }
            }, true);
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


            // [핵심 수정] 이벤트 위임을 사용하여 툴팁 로직 추가
            const tooltip = document.getElementById('custom-instant-tooltip');
            if (tooltip) {
                newListContainer.addEventListener('mouseover', (e) => {
                    const subject = e.target.closest('.gall_subject');
                    if (subject && subject.title) {
                        tooltip.textContent = subject.title;
                        tooltip.style.display = 'block';
                    }
                });
                newListContainer.addEventListener('mouseout', () => {
                    tooltip.style.display = 'none';
                });
                newListContainer.addEventListener('mousemove', (e) => {
                    if (tooltip.style.display === 'block') {
                        tooltip.style.left = `${e.clientX + 10}px`;
                        tooltip.style.top = `${e.clientY + 10}px`;
                    }
                });
            }


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


            this.applyForceRefreshPagination(listWrap);


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

            // [최종 완전판] 글쓰기 페이지의 광고 컨테이너를 직접 찾아 제거하는 함수
            const removeWritePageAds = () => {
                // "ba.min.js" 스크립트 태그를 찾음
                const adScript = document.querySelector('script[src*="//t1.daumcdn.net/kas/static/ba.min.js"]');

                // 해당 스크립트가 존재하고, 그 부모가 DIV 태그라면
                if (adScript && adScript.parentElement.tagName === 'DIV') {
                    const adContainer = adScript.parentElement; // 바로 그 <div>가 범인
                    adContainer.remove(); // 컨테이너를 페이지에서 완전히 제거
                    
                    console.log('[DC Filter+UI] 글쓰기 페이지 광고 컨테이너 제거 완료.');
                    clearInterval(adRemovalInterval); // 임무 완수 후 타이머 종료
                }
            };

            // 0.1초마다 광고가 있는지 확인하고, 있으면 제거
            const adRemovalInterval = setInterval(removeWritePageAds, 100);

            // 5초 후에는 검색을 멈춰서 불필요한 부하 방지
            setTimeout(() => clearInterval(adRemovalInterval), 5000);
        },
        init() {
            if (isUiInitialized) return;
            isUiInitialized = true;


            // [핵심 수정] 스크립트 시작 시, 툴팁으로 사용할 div를 미리 한 번만 생성
            if (!document.getElementById('custom-instant-tooltip')) {
                const tooltip = document.createElement('div');
                tooltip.id = 'custom-instant-tooltip';
                document.body.appendChild(tooltip);
            }


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
            } else if (window.location.pathname.includes('/board/view/')) {
                const viewBottomContainer = document.querySelector('.view_bottom');
                if (viewBottomContainer) {
                    this.applyForceRefreshPagination(viewBottomContainer);
                }
            }


            const processAllLists = () => {
                document.querySelectorAll(this.SELECTORS.LIST_WRAP).forEach(lw => this.transformList(lw));
            };


            processAllLists();


            // [디버깅 추가]
            const observer = new MutationObserver((mutations) => {
                // console.log(`[디버깅] UIModule observer 실행됨. (mutations: ${mutations.length}개)`); // 디버깅용 로그 (해결 후 제거 가능)
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        // [최종 수정] 텍스트 노드 자체에는 .closest가 없으므로,
                        // 반드시 node.parentNode에서 UI 요소를 찾아야 오류가 발생하지 않습니다.
                        if (node.parentNode && node.parentNode.closest && (node.parentNode.closest('#dc-backup-popup') || node.parentNode.closest('#dc-block-management-panel') || node.parentNode.closest('#dcinside-filter-setting'))) {
                            continue; // 스크립트 UI 내부 변화이므로 무시
                        }
                        
                        // Element 노드일 경우에만 UI 변환 로직을 실행합니다.
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
    GM_registerMenuCommand('차단 유저 관리', PersonalBlockModule.createManagementPanel.bind(PersonalBlockModule));


    // [신규] 단축키 설정을 다시 로드하는 전용 함수
    async function reloadShortcutKey() {
        const shortcutString = await GM_getValue(FilterModule.CONSTANTS.STORAGE_KEYS.SHORTCUT_KEY, 'Shift+S');
        activeShortcutObject = FilterModule.parseShortcutString(shortcutString);
    }


    async function main() {
        if (isInitialized) return;
        console.log("[DC Filter+UI] Initializing v2.5.7...");


        // [수정] main 함수에서 reloadShortcutKey 함수를 호출하여 초기화
        await reloadShortcutKey();


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
        await PersonalBlockModule.init();
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



        // ==========================================================
    // ▼▼▼▼▼▼▼▼▼▼▼ 바로 이 위치에 아래 코드를 추가하세요 ▼▼▼▼▼▼▼▼▼▼▼
    // ==========================================================
    const observeDarkMode = () => {
        const head = document.head;
        if (!head) {
            setTimeout(observeDarkMode, 100);
            return;
        }

        const checkDarkModeStatus = () => {
            const darkModeStylesheet = document.getElementById('css-darkmode');
            if (darkModeStylesheet) {
                document.body.classList.add('dc-filter-dark-mode');
            } else {
                document.body.classList.remove('dc-filter-dark-mode');
            }
        };

        const observer = new MutationObserver(checkDarkModeStatus);
        observer.observe(head, { childList: true });

        // 초기 상태 확인
        checkDarkModeStatus();
    };
    observeDarkMode();
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
})();
