// ==UserScript==
// @name         DC_UserFilter_Mobile
// @namespace    http://tampermonkey.net/
// @version      2.7.3
// @description  유저 필터링, UI 개선, 개인 차단/해제 기능
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


(function () {
    'use strict';

    const __dcufRoot = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
    if (__dcufRoot.__dcufRuntimeLoaded) {
        console.warn('DCinside User Filter: duplicate runtime detected, skip init.');
        return;
    }
    __dcufRoot.__dcufRuntimeLoaded = `dcuf-${Date.now()}`;


    // [개선] 전역 스코프 오염 방지를 위해 스크립트 상태 변수를 IIFE 내부 스코프로 이동
    let dcFilterSettings = {};
    let userSumCache = {};
    let isInitialized = false;
    let isUiInitialized = false;
    let activeShortcutObject = null; // [v2.1 추가] 현재 활성화된 단축키 객체
    const ROOT_READY_CLASS = 'script-ui-ready';
    const INITIAL_LOCK_STYLE_ID = 'dcuf-initial-lock-style';
    const BOOT_OVERLAY_ID = 'dcuf-boot-overlay';
    const BOOT_OVERLAY_STYLE_ID = 'dcuf-boot-overlay-style';

    const isBootOverlayTargetPage = () => true;
    const removeBootOverlay = (reason = 'unknown') => {
        const overlay = document.getElementById(BOOT_OVERLAY_ID);
        if (overlay) overlay.remove();
    };

    const ensureBootOverlay = () => {
        if (!isBootOverlayTargetPage()) return;

        const mountPoint = document.head || document.documentElement;
        if (mountPoint && !document.getElementById(BOOT_OVERLAY_STYLE_ID)) {
            const style = document.createElement('style');
            style.id = BOOT_OVERLAY_STYLE_ID;
            style.textContent = `
                #${BOOT_OVERLAY_ID} {
                    position: fixed;
                    inset: 0;
                    z-index: 2147483646;
                    background:
                        radial-gradient(circle at top, rgba(255,255,255,0.96), rgba(245,247,251,0.98) 45%, rgba(238,241,246,0.99)),
                        linear-gradient(180deg, #f7f9fc 0%, #eef2f7 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 24px;
                    pointer-events: auto;
                }
                #${BOOT_OVERLAY_ID} .dcuf-boot-card {
                    width: min(420px, calc(100vw - 32px));
                    border: 1px solid rgba(197, 206, 218, 0.9);
                    border-radius: 18px;
                    background: rgba(255,255,255,0.96);
                    box-shadow: 0 20px 48px rgba(31, 45, 68, 0.12);
                    padding: 22px 20px 18px;
                    color: #2b3340;
                    text-align: center;
                }
                #${BOOT_OVERLAY_ID} .dcuf-boot-title {
                    font-size: 17px;
                    font-weight: 700;
                    letter-spacing: -0.01em;
                    margin-bottom: 8px;
                }
                #${BOOT_OVERLAY_ID} .dcuf-boot-copy {
                    font-size: 13px;
                    line-height: 1.55;
                    color: #5a6575;
                    margin-bottom: 14px;
                }
                #${BOOT_OVERLAY_ID} .dcuf-boot-bar {
                    height: 4px;
                    border-radius: 999px;
                    background: rgba(203, 211, 223, 0.6);
                    overflow: hidden;
                }
                #${BOOT_OVERLAY_ID} .dcuf-boot-bar::before {
                    content: '';
                    display: block;
                    width: 42%;
                    height: 100%;
                    border-radius: inherit;
                    background: linear-gradient(90deg, #245bda 0%, #5d87f0 100%);
                    animation: dcuf-boot-progress 1s ease-in-out infinite;
                }
                html.dc-filter-dark-mode #${BOOT_OVERLAY_ID} {
                    background:
                        radial-gradient(circle at top, rgba(34,39,48,0.95), rgba(20,24,31,0.98) 48%, rgba(14,17,22,0.99)),
                        linear-gradient(180deg, #1d222a 0%, #11151b 100%);
                }
                html.dc-filter-dark-mode #${BOOT_OVERLAY_ID} .dcuf-boot-card {
                    border-color: rgba(71, 81, 96, 0.92);
                    background: rgba(28, 33, 41, 0.96);
                    box-shadow: 0 20px 48px rgba(0, 0, 0, 0.34);
                    color: #e7ebf2;
                }
                html.dc-filter-dark-mode #${BOOT_OVERLAY_ID} .dcuf-boot-copy {
                    color: #adb7c7;
                }
                html.dc-filter-dark-mode #${BOOT_OVERLAY_ID} .dcuf-boot-bar {
                    background: rgba(63, 73, 88, 0.9);
                }
                @keyframes dcuf-boot-progress {
                    0% { transform: translateX(-120%); }
                    100% { transform: translateX(260%); }
                }
            `;
            mountPoint.appendChild(style);
        }

        if (document.getElementById(BOOT_OVERLAY_ID)) return;
        if (!document.documentElement) return;

        const overlay = document.createElement('div');
        overlay.id = BOOT_OVERLAY_ID;
        overlay.innerHTML = `
            <div class="dcuf-boot-card">
                <div class="dcuf-boot-title">UI 준비 중</div>
                <div class="dcuf-boot-copy">광고 차단과 충돌하면 로딩이 지연될 수 있습니다.<br>DCInside에서는 광고 차단을 꺼주세요.</div>
                <div class="dcuf-boot-bar" aria-hidden="true"></div>
            </div>
        `;
        document.documentElement.appendChild(overlay);
    };

    const markUiReady = () => {
        const root = document.documentElement;
        if (root) root.classList.add(ROOT_READY_CLASS);

        const body = document.body;
        if (body) body.classList.add(ROOT_READY_CLASS);

        removeBootOverlay('mark-ui-ready');
    };

    const injectInitialLockStyle = () => {
        const mountPoint = document.head || document.documentElement;
        if (!mountPoint || document.getElementById(INITIAL_LOCK_STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = INITIAL_LOCK_STYLE_ID;
        style.textContent = `
            html:not(.${ROOT_READY_CLASS}) body {
                visibility: hidden !important;
            }
        `;
        mountPoint.appendChild(style);
    };

    injectInitialLockStyle();
    ensureBootOverlay();




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


        /* 초기 로딩 잠금과 로딩 팝업은 상단 injectInitialLockStyle()에서 즉시 주입합니다. */


        /* [수정] FOUC(화면 깜빡임) 방지 및 원본 테이블 숨김 강화 */
        table.gall_list {
            visibility: hidden !important; position: absolute !important;
            top: -9999px !important; left: -9999px !important;
            height: 0 !important; overflow: hidden !important;
        }


        /* [수정] 불필요한 PC버전 요소 및 사이트 광고 아이콘 숨김 */
        #dc_header, #dc_gnb, .adv_area, .right_content, .dc_all, .dcfoot, .dc_ft, .info_policy, .copyrigh, .ad_bottom_list, .bottom_paging_box + div, .intro_bg, .fixed_write_btn, .bottom_movebox, #zzbang_ad ,#zzbang_div,#zzbang_div .my_zzal, .my_dccon, .issue_contentbox, #gall_top_recom.concept_wrap,
        .gall_exposure, .stickyunit, #kakao_search, .banner_box, #ad-layer,#ad-layer-closer, #ad_floating, .__dcNewsWidgetTypeB__, .dctrend_ranking, .cm_ad, .con_banner.writing_banbox, [id^="criteo-"], .ad_left_wing_right_top._BTN_AD_, .ad_left_wing_list_top._BTN_AD_,
        .ad_left_wing_list_top, div:has(> script[src*="list@right_wing_game"]),
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
        .custom-button-row .list_bottom_btnbox {
            border: 1px solid var(--dcuf-border);
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.9) !important;
            box-shadow: 0 2px 8px rgba(12, 22, 40, 0.05);
            padding: 10px !important;
        }
        .custom-bottom-controls form[name="frmSearch"] {
            display: block !important;
            width: 100% !important;
            max-width: 520px;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        .custom-bottom-controls form[name="frmSearch"] fieldset {
            display: block !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        .custom-bottom-controls form[name="frmSearch"] legend {
            display: none !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .buttom_search_wrap {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 6px !important;
            width: fit-content !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .select_box.bottom_array,
        .custom-bottom-controls form[name="frmSearch"] .bottom_search {
            float: none !important;
            margin: 0 !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .select_box.bottom_array {
            width: 125px !important;
            height: 38px !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .select_box.bottom_array .select_area {
            width: 117px !important;
            height: 30px !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .select_box.bottom_array .select_area .inner {
            width: 34px !important;
            height: 30px !important;
            right: 0 !important;
            top: 0 !important;
            box-sizing: border-box !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .bottom_search {
            display: flex !important;
            align-items: center !important;
            width: 320px !important;
            height: 38px !important;
            min-width: 0 !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .inner_search {
            width: 278px !important;
            height: 30px !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            background: #fff !important;
            box-shadow: none !important;
            overflow: hidden !important;
        }
        .custom-bottom-controls form[name="frmSearch"] input.in_keyword,
        .custom-bottom-controls form[name="frmSearch"] input[type="text"] {
            width: 100% !important;
            height: 30px !important;
            margin: 0 !important;
            padding: 0 9px !important;
            border: none !important;
            border-radius: 0 !important;
            background: #fff !important;
            box-shadow: none !important;
            color: #333 !important;
            font-size: 14px !important;
            font-weight: 700 !important;
            line-height: 30px !important;
            box-sizing: border-box !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .bnt_search,
        .custom-bottom-controls form[name="frmSearch"] button.sp_img.bnt_search {
            flex: none !important;
            width: 37px !important;
            min-width: 37px !important;
            height: 36px !important;
            margin: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
        }
        .custom-bottom-controls .page_box {
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.85) !important;
            padding: 8px 10px;
            box-shadow: 0 2px 8px rgba(12, 22, 40, 0.05);
        }
        .comment_box .all_comment {
            display: flex !important;
            align-items: flex-start !important;
            padding: 8px 15px !important;
            border-bottom: 1px solid #eee;
            gap: 15px !important; /* 작성자와 내용 사이 간격 */
        }
        .comment_box .usertxt {
            flex: 1 !important;
            min-width: 0 !important;
            /* [v2.6.8] font-size는 JS scaleAllFontSizes()에서 배율 적용으로 설정됩니다 */
            line-height: 1.7 !important;
            word-break: break-all !important;
            color: #333 !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: 0 !important;
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
        /* [v2.6.8 수정] 댓글창과 게시글 목록 모두 닉네임 팝업이 잘리지 않도록 overflow 해제 */
        /* [v2.6.9] 댓글 리스트 열맞춤을 위해 cmt_nickbox에 최소 너비 및 정렬 설정 */
        .cmt_nickbox, .author {
            display: inline-flex !important;
            align-items: center !important;
            position: relative !important; /* 팝업 위치 기준점 */
            width: auto !important;
            min-width: 140px !important; /* 작성자 영역 최소 너비 확보로 열맞춤 */
            max-width: none !important;
            overflow: visible !important; /* 팝업 노출 허용 */
            white-space: nowrap !important;
            vertical-align: middle !important;
            line-height: normal !important;
            background: transparent !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            flex-shrink: 0 !important;
        }
        /* 게시글 목록(.author)은 고정 너비 불필요하므로 해제 */
        .author { min-width: 0 !important; }

        .nickname, .ip {
            display: inline-block !important;
            max-width: 240px !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            vertical-align: middle !important;
        }
        .gall_writer { max-width: none !important; }
        .nickname { max-width: 240px !important; }
        
        /* 게시글 목록 내 닉네임 텍스트 크기 조정 */
        .author .nickname { font-size: 15px !important; }

        /* [v2.6.8] 유저 데이터 레이어(작성글 검색 등) 위치 최적화 */
        #user_data_lyr {
            position: absolute !important;
            top: 100% !important; /* 닉네임 바로 아래에서 시작 */
            left: 0 !important;   /* 왼쪽 정렬 */
            margin-top: 5px !important;
            z-index: 10001 !important;
            background: #fff !important;
            border: 1px solid #ccc !important;
            box-shadow: 2px 2px 8px rgba(0,0,0,0.2) !important;
            display: none; /* 기본은 숨김 (JS에서 제어) */
        }
        /* 이미지 댓글 내에서의 위치 미세 조정 */
        .img_comment #user_data_lyr {
            top: 25px !important;
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
            /* [v2.6.8 수정] font-size: inherit 제거 → JS 배율 스케일링으로 대체하여 원본 서식 유지 */
            line-height: inherit !important;
            color: inherit !important;
        }


        /* [v2.2.0 이식] 댓글 가독성 개선 (box-sizing 추가를 위해 위치 이동) */
        .comment_box .date_time {
            font-size: 15px !important;
        }


        /* [v2.2.0 이식] 추천/비추천 버튼 UI 개선 */
        /* [v2.6.8] 고정닉 추천수 및 아이콘 노출 (위치 조정) */
        .btn_recommend_box .writer_nikcon { display: inline-block !important; margin-right: 2px !important; vertical-align: middle !important; }
        .btn_recommend_box .writer_nikcon img { width: 14px !important; height: 14px !important; vertical-align: middle !important; }
        .btn_recommend_box .font_blue.smallnum {
            display: inline-block !important; font-size: 11px !important; color: #4263eb !important; vertical-align: middle !important;
            background: rgba(66, 99, 235, 0.08); padding: 1px 4px; border-radius: 3px; font-weight: normal !important;
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
        .btn_recommend_box .up_num_box {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 2px !important;
        }
        .btn_recommend_box .up_num,
        .btn_recommend_box .down_num {
            font-size: 16px !important;
            font-weight: bold !important;
            color: #333 !important;
            line-height: 1 !important;
        }
        .btn_recommend_box .sup_num {
            display: inline-flex !important;
            align-items: center !important;
            margin: 0 !important;
        }


        .cmt_write_box { display: flex !important; flex-wrap: wrap !important; gap: 10px !important; padding: 10px !important; }
        .cmt_write_box > .fl { float: none !important; flex-basis: 200px; flex-shrink: 1; min-width: 180px; }
        .cmt_write_box > .fl .usertxt { display: flex; flex-direction: column; gap: 5px; }
        .cmt_write_box > .fl .usertxt input { width: 100% !important; box-sizing: border-box; }
        .cmt_write_box .cmt_txt_cont { flex: 1; min-width: 250px; padding: 0 !important; }
        .cmt_write_box .cmt_txt_cont textarea { width: 100% !important; height: 85px !important; box-sizing: border-box !important; resize: vertical; }
        .cmt_write_box .cmt_cont_bott { width: 100%; padding: 0 !important; }
        .cmt_write_box .cmt_btn_bot { display: flex; justify-content: flex-end; }
        @media screen and (max-width: 600px) {
            .cmt_write_box { flex-direction: column !important; }
            .cmt_write_box > .fl, .cmt_write_box .cmt_txt_cont { flex-basis: auto; width: 100% !important; min-width: 100%; }
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
            width: auto !important;
            min-width: 76px;
            height: 38px;
            padding: 0 10px;
            background: linear-gradient(180deg, #fbfcfe 0%, #f1f4f8 100%) !important;
            color: #4d5e76;
            border-radius: 999px;
            border: 1px solid #c7d2df;
            box-shadow: 0 6px 16px rgba(36, 49, 72, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            font-size: 15px;
            font-weight: 800;
            letter-spacing: -0.03em;
            line-height: 1;
            white-space: nowrap;
            word-break: keep-all;
            cursor: pointer;
            user-select: none;
            transition: transform 0.18s ease-out, box-shadow 0.18s ease-out, border-color 0.18s ease-out, background-color 0.18s ease-out;
        }
        #dc-personal-block-fab:hover {
            background: linear-gradient(180deg, #ffffff 0%, #eef2f7 100%) !important;
            border-color: #b6c2d1;
            box-shadow: 0 8px 18px rgba(36, 49, 72, 0.14);
        }
        #dc-personal-block-fab:active {
            cursor: grabbing;
            transform: scale(0.97);
            box-shadow: 0 4px 10px rgba(36, 49, 72, 0.1);
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
        #dc-backup-popup .export-btn { background-color: #3b71fd; color: #fff; border: 1px solid #3b71fd; flex: 1; }
        /* [추가] '파일로 다운로드' 버튼 전용 스타일 */
        #dc-backup-popup .export-btn-download { background-color: #ffffff; color: #374151; border: 1px solid #d4dbe8; flex: 1; }
        /* [수정] 불러오기 버튼 스타일 조정 */
        #dc-backup-popup .import-btn { background-color: #3b71fd; color: #fff; border: 1px solid #3b71fd; width: 100%; margin-top: 8px; }

        /* Popup refresh */
        #dcinside-filter-setting,
        #dc-selection-popup,
        #dc-backup-popup,
        #dc-block-management-panel {
            border: 1px solid #d9dee7 !important;
            border-radius: 14px !important;
            box-shadow: 0 18px 42px rgba(26, 39, 60, 0.18) !important;
        }
        #dcinside-filter-setting,
        #dc-selection-popup,
        #dc-backup-popup {
            animation: dcuf-popup-center-in 0.16s ease-out;
        }
        #dc-block-management-panel {
            animation: dcuf-popup-fade-in 0.16s ease-out;
            min-width: 460px !important;
            min-height: 340px !important;
            background: #f7f9fc !important;
        }
        #dcinside-filter-setting {
            min-width: 540px !important;
            max-width: min(92vw, 680px) !important;
            padding: 18px !important;
            cursor: default !important;
        }
        #dcinside-filter-setting .dcuf-settings-header {
            margin-bottom: 12px !important;
            padding: 0 0 12px !important;
            border-bottom: 1px solid #e5e9f1 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 10px !important;
        }
        #dcinside-filter-setting .dcuf-settings-header > div:first-child {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 10px !important;
            align-items: center !important;
        }
        #dcinside-filter-setting .dcuf-settings-header > div:first-child > div {
            border-left: 0 !important;
            padding-left: 0 !important;
        }
        #dcinside-filter-setting .dcuf-settings-body {
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
        }
        #dcinside-filter-setting .dcuf-settings-body > hr {
            display: none !important;
        }
        #dcinside-filter-setting .dcuf-settings-section {
            border: 1px solid #e5e9f1 !important;
            background: #fbfcff !important;
            border-radius: 10px !important;
            padding: 12px !important;
        }
        #dcinside-filter-setting .dcuf-settings-threshold {
            display: flex !important;
            gap: 12px !important;
            align-items: flex-start !important;
            justify-content: space-between !important;
        }
        #dcinside-filter-setting .dcuf-settings-threshold > div:first-child {
            flex: 0 1 280px !important;
            min-width: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
        }
        #dcinside-filter-setting .dcuf-settings-threshold > div:first-child > h3 {
            width: 100% !important;
            text-align: center !important;
        }
        #dcinside-filter-setting .dcuf-settings-threshold > div:first-child > input {
            margin: 0 auto !important;
        }
        #dcinside-filter-setting .dcuf-settings-threshold > div:first-child > div {
            width: auto !important;
            min-height: 0 !important;
            max-width: 100% !important;
            border: 0 !important;
            background: transparent !important;
            padding: 0 !important;
            text-align: center !important;
        }
        #dcinside-filter-setting .dcuf-settings-threshold > div:last-child {
            flex: 0 0 auto !important;
            border: 0 !important;
            border-radius: 10px !important;
            background: #fff !important;
            padding: 10px !important;
            box-shadow: none !important;
        }
        #dcinside-filter-setting #dcinside-ratio-section > div:first-child {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 10px !important;
            align-items: stretch !important;
        }
        #dcinside-filter-setting #dcinside-ratio-section > div:last-child {
            text-align: center !important;
        }
        #dcinside-filter-setting #dcinside-threshold-input,
        #dcinside-filter-setting #dcinside-ratio-min,
        #dcinside-filter-setting #dcinside-ratio-max {
            min-height: 40px !important;
            border: 1px solid #cfd7e6 !important;
            border-radius: 8px !important;
            padding: 6px 10px !important;
            box-sizing: border-box !important;
            background: #fff !important;
        }
        #dcinside-filter-setting .dcuf-settings-footer {
            margin-top: 11px !important;
            padding-top: 11px !important;
            border-top: 1px solid #e5e9f1 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 10px !important;
        }
        #dcinside-filter-setting #dcinside-threshold-save {
            background: #3b71fd !important;
            color: #fff !important;
            border: 1px solid #3b71fd !important;
            border-radius: 9px !important;
            min-height: 42px !important;
            padding: 0 16px !important;
            font-weight: 700 !important;
        }
        #dcinside-filter-setting #dcinside-filter-close,
        #dc-backup-popup .popup-close-btn,
        #dc-block-management-panel .panel-close-btn {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            padding: 0 !important;
            line-height: 1 !important;
        }
        #dcinside-filter-setting #dcinside-filter-close {
            width: 30px !important;
            height: 30px !important;
            border-radius: 999px !important;
        }

        #dc-block-management-panel .panel-header {
            background: #f3f6fc !important;
            border-bottom: 1px solid #e3e8f2 !important;
            padding: 12px 14px !important;
        }
        #dc-block-management-panel .panel-close-btn {
            width: 28px !important;
            height: 28px !important;
            border-radius: 999px !important;
            color: #4b5563 !important;
        }
        #dc-block-management-panel .panel-close-btn:hover {
            background: #e9eef8 !important;
        }
        #dc-block-management-panel .panel-tabs {
            background: #f8faff !important;
            border-bottom: 1px solid #e5e9f1 !important;
            padding: 6px !important;
            gap: 6px !important;
        }
        #dc-block-management-panel .panel-tab {
            border-right: 0 !important;
            border-radius: 8px !important;
            font-weight: 600 !important;
            color: #4b5563 !important;
            padding: 10px 8px !important;
            position: relative !important;
        }
        #dc-block-management-panel .panel-tab.active {
            background: #eaf1ff !important;
            color: #1d4ed8 !important;
            font-weight: 700 !important;
        }
        #dc-block-management-panel .panel-tab.active::after {
            content: '';
            position: absolute;
            left: 12px;
            right: 12px;
            bottom: 6px;
            height: 2px;
            border-radius: 999px;
            background: #3b71fd;
        }
        #dc-block-management-panel .select-all-btn,
        #dc-block-management-panel .select-all-global-btn,
        #dc-block-management-panel .panel-backup-btn {
            min-height: 36px !important;
            border: 1px solid #d4dbe8 !important;
            border-radius: 8px !important;
            background: #fff !important;
            color: #374151 !important;
            font-weight: 600 !important;
            transition: background-color 0.14s ease, border-color 0.14s ease;
        }
        #dc-block-management-panel .select-all-btn:hover,
        #dc-block-management-panel .select-all-global-btn:hover,
        #dc-block-management-panel .panel-backup-btn:hover {
            background: #f6f9ff !important;
            border-color: #b8c8ea !important;
        }
        #dc-block-management-panel .panel-save-btn {
            min-height: 38px !important;
            border-radius: 9px !important;
            padding: 0 18px !important;
            font-weight: 700 !important;
            box-shadow: 0 6px 16px rgba(59, 113, 253, 0.24) !important;
        }
        #dc-block-management-panel .blocked-list {
            padding: 6px 10px 12px !important;
        }
        #dc-block-management-panel .blocked-item {
            min-height: 44px !important;
            padding: 10px 8px !important;
            border-bottom: 1px solid #edf1f7 !important;
            transition: background-color 0.14s ease, opacity 0.14s ease;
        }
        #dc-block-management-panel .blocked-item:hover {
            background: #f6f9ff !important;
        }
        #dc-block-management-panel .blocked-item.item-to-delete {
            background: #fff5f6 !important;
            opacity: 0.5 !important;
        }
        #dc-block-management-panel .delete-item-btn {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 24px !important;
            height: 24px !important;
            border-radius: 999px !important;
            background: #ffe9ec !important;
            color: #e03131 !important;
            font-size: 14px !important;
            line-height: 1 !important;
            padding: 0 !important;
            transition: background-color 0.14s ease;
        }
        #dc-block-management-panel .delete-item-btn:hover {
            background: #ffd4dc !important;
        }

        #dc-backup-popup {
            min-width: 420px !important;
            max-width: min(92vw, 560px) !important;
            padding: 18px !important;
        }
        #dc-backup-popup .popup-header {
            margin-bottom: 12px !important;
            padding-bottom: 10px !important;
            border-bottom: 1px solid #e5e9f1 !important;
        }
        #dc-backup-popup .popup-close-btn {
            width: 28px !important;
            height: 28px !important;
            border-radius: 999px !important;
        }
        #dc-backup-popup .popup-close-btn:hover {
            background: #eef3fb !important;
        }
        #dc-backup-popup .export-btn,
        #dc-backup-popup .export-btn-download,
        #dc-backup-popup .import-btn {
            min-height: 40px !important;
            border-radius: 8px !important;
            font-weight: 700 !important;
            transition: background-color 0.14s ease, border-color 0.14s ease, color 0.14s ease !important;
        }
        #dc-backup-popup .export-btn {
            background: #3b71fd !important;
            border: 1px solid #3b71fd !important;
            color: #fff !important;
        }
        #dc-backup-popup .export-btn:hover {
            background: #2f63ea !important;
            border-color: #2f63ea !important;
        }
        #dc-backup-popup .export-btn-download {
            background: #eef4ff !important;
            border: 1px solid #c8d8ff !important;
            color: #315fc2 !important;
        }
        #dc-backup-popup .export-btn-download:hover {
            background: #e2edff !important;
            border-color: #b4cbff !important;
        }
        #dc-backup-popup .import-btn {
            background: #3b71fd !important;
            border: 1px solid #3b71fd !important;
            color: #fff !important;
            box-shadow: 0 6px 16px rgba(59, 113, 253, 0.22) !important;
        }
        #dc-backup-popup .import-btn:hover {
            background: #2f63ea !important;
            border-color: #2f63ea !important;
        }
        #dc-backup-popup .import-file-input,
        #dc-backup-popup textarea {
            border: 1px solid #d2dae8 !important;
            border-radius: 8px !important;
            background: #fff !important;
        }

        #dcinside-filter-setting,
        #dc-backup-popup,
        #dc-block-management-panel {
            touch-action: pan-x pan-y !important;
        }

        #dcinside-filter-setting,
        #dc-backup-popup {
            overflow: hidden !important;
            resize: both !important;
        }
        #dcinside-filter-setting {
            min-height: 360px !important;
        }
        #dc-backup-popup {
            min-height: 320px !important;
        }

        #dcinside-filter-setting .dcuf-settings-body {
            max-height: calc(92vh - 156px) !important;
            overflow-y: auto !important;
            padding-right: 2px !important;
        }

        #dc-backup-popup .popup-content {
            max-height: calc(92vh - 96px) !important;
            overflow-y: auto !important;
            padding-right: 2px !important;
        }


        #dc-selection-popup {
            min-width: 360px !important;
            max-width: min(92vw, 520px) !important;
            padding: 18px !important;
        }
        #dc-selection-popup .block-option {
            border: 1px solid #e4e9f3 !important;
            background: #f8fbff !important;
            border-radius: 9px !important;
        }

        #dc-block-management-panel-overlay,
        #dc-backup-popup-overlay {
            backdrop-filter: blur(2px);
        }

        @keyframes dcuf-popup-center-in {
            from { opacity: 0; transform: translate(-50%, -48%) scale(0.985); }
            to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes dcuf-popup-fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes dcuf-popup-out {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        @keyframes dcuf-overlay-out {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        #dcinside-filter-setting.dcuf-pop-leave,
        #dc-selection-popup.dcuf-pop-leave,
        #dc-backup-popup.dcuf-pop-leave,
        #dc-block-management-panel.dcuf-pop-leave {
            animation: dcuf-popup-out 0.13s ease-in forwards !important;
            pointer-events: none !important;
        }
        #dc-block-management-panel-overlay.dcuf-overlay-leave,
        #dc-backup-popup-overlay.dcuf-overlay-leave {
            animation: dcuf-overlay-out 0.13s ease-in forwards !important;
            pointer-events: none !important;
        }

        @media (max-width: 640px) {
            #dcinside-filter-setting { min-width: auto !important; width: min(96vw, 640px) !important; }
            #dcinside-filter-setting #dcinside-ratio-section > div:first-child {
                grid-template-columns: 1fr !important;
            }
            #dc-block-management-panel { min-width: min(96vw, 520px) !important; }
            #dc-backup-popup { min-width: auto !important; width: min(96vw, 560px) !important; }
        }

        @media (prefers-reduced-motion: reduce) {
            #dcinside-filter-setting,
            #dc-selection-popup,
            #dc-backup-popup,
            #dc-block-management-panel,
            #dcinside-filter-setting.dcuf-pop-leave,
            #dc-selection-popup.dcuf-pop-leave,
            #dc-backup-popup.dcuf-pop-leave,
            #dc-block-management-panel.dcuf-pop-leave,
            #dc-block-management-panel-overlay.dcuf-overlay-leave,
            #dc-backup-popup-overlay.dcuf-overlay-leave {
                animation: none !important;
                transition: none !important;
            }
        }

        /* [수정] DCCon 및 각종 팝업 모바일 반응형 중앙 정렬 */
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

        body.dc-filter-dark-mode #dcinside-filter-setting,
        body.dc-filter-dark-mode #dc-selection-popup,
        body.dc-filter-dark-mode #dc-backup-popup,
        body.dc-filter-dark-mode #dc-block-management-panel {
            border-color: #445066 !important;
            box-shadow: 0 18px 44px rgba(0, 0, 0, 0.45) !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting .dcuf-settings-section,
        body.dc-filter-dark-mode #dc-selection-popup .block-option {
            background: #323845 !important;
            border-color: #434f66 !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting #dcinside-threshold-input,
        body.dc-filter-dark-mode #dcinside-filter-setting #dcinside-ratio-min,
        body.dc-filter-dark-mode #dcinside-filter-setting #dcinside-ratio-max,
        body.dc-filter-dark-mode #dc-backup-popup .import-file-input,
        body.dc-filter-dark-mode #dc-backup-popup textarea {
            background: #252b36 !important;
            border-color: #47556f !important;
            color: #eef3ff !important;
        }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-tab.active {
            background: #253556 !important;
            color: #8db2ff !important;
        }
        body.dc-filter-dark-mode #dc-block-management-panel .blocked-item:hover {
            background: #2f394b !important;
        }
        body.dc-filter-dark-mode #dc-block-management-panel .delete-item-btn {
            background: #53313a !important;
            color: #ff9fb1 !important;
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
            div.style = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:24px 20px 18px 20px;min-width:280px;z-index:99999;border:2px solid #333;border-radius:10px;box-shadow:0 0 10px #0008; cursor: default; user-select: none;';
            div.innerHTML = `
                <div style="margin-bottom:15px;padding-bottom:12px;border-bottom: 2px solid #ccc; display:flex;align-items:center; justify-content: space-between;">
                    <div style="display:flex; align-items: center; gap: 10px;">
                        <div style="display:flex; align-items:center; gap:7px;"><label class="switch" style="flex-shrink:0;"><input id="${this.CONSTANTS.UI_IDS.MASTER_DISABLE_CHECKBOX}" type="checkbox" ${masterDisabled ? 'checked' : ''}><span class="switch-slider"></span></label><label for="${this.CONSTANTS.UI_IDS.MASTER_DISABLE_CHECKBOX}" style="font-size:15px;cursor:pointer;"><b>모든 기능 끄기</b></label></div>
                        <div style="border-left: 2px solid #ccc; padding-left: 10px; display:flex; align-items:center; gap:7px;"><label class="switch" style="flex-shrink:0;"><input id="${this.CONSTANTS.UI_IDS.EXCLUDE_RECOMMENDED_CHECKBOX}" type="checkbox" ${excludeRecommended ? 'checked' : ''}><span class="switch-slider"></span></label><label for="${this.CONSTANTS.UI_IDS.EXCLUDE_RECOMMENDED_CHECKBOX}" style="font-size:14px;cursor:pointer;"><b>개념글 제외</b></label></div>
                    </div>
                    <div><button id="${this.CONSTANTS.UI_IDS.CLOSE_BUTTON}" style="background:none;border:none;font-size:24px;cursor:pointer;line-height:1;padding:0 4px;color:#555;">✕</button></div>
                </div>
                <div id="${this.CONSTANTS.UI_IDS.SETTINGS_CONTAINER}" style="opacity:${masterDisabled ? 0.5 : 1}; pointer-events:${masterDisabled ? 'none' : 'auto'};">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; flex-direction: column; align-items: center;"><h3 style="cursor: default;margin-top:0;margin-bottom:5px;">유저 글+댓글 합 기준값(이 값 이하 차단)</h3><input id="${this.CONSTANTS.UI_IDS.THRESHOLD_INPUT}" type="number" min="0" value="${threshold}" style="width:80px;font-size:16px; cursor: initial;"><div style="font-size:13px;color:#666;margin-top:5px;">0 또는 빈칸으로 두면 비활성화됩니다.</div></div>
                        <div style="border: 2px solid #000; border-radius: 5px; padding: 8px 8px 5px 6px;"><div style="display: flex; flex-direction: column; align-items: flex-start; gap: 7px;"><div style="display:flex; align-items:center; gap:6px; padding-bottom: 5px; border-bottom: 1px solid #ddd; width:100%;"><label class="switch" style="flex-shrink:0;"><input id="${this.CONSTANTS.UI_IDS.BLOCK_GUEST_CHECKBOX}" type="checkbox" ${blockGuestEnabled ? 'checked' : ''}><span class="switch-slider"></span></label><label for="${this.CONSTANTS.UI_IDS.BLOCK_GUEST_CHECKBOX}" style="font-size:13px;cursor:pointer;">유동 전체 차단</label></div><div style="display:flex; align-items:center; gap:6px;"><label class="switch" style="flex-shrink:0;"><input id="${this.CONSTANTS.UI_IDS.TELECOM_BLOCK_CHECKBOX}" type="checkbox" ${telecomBlockEnabled ? 'checked' : ''}><span class="switch-slider"></span></label><label for="${this.CONSTANTS.UI_IDS.TELECOM_BLOCK_CHECKBOX}" style="font-size:13px;cursor:pointer;">통신사 IP 차단</label></div></div></div>
                    </div>
                    <hr style="border:0;border-top:2px solid #222;margin:16px 0 12px 0;">
                    <div style="margin-bottom:8px;display:flex;align-items:center;gap:8px;"><label class="switch" style="flex-shrink:0;"><input id="${this.CONSTANTS.UI_IDS.RATIO_ENABLE_CHECKBOX}" type="checkbox" ${ratioEnabled ? 'checked' : ''}><span class="switch-slider"></span></label><label for="${this.CONSTANTS.UI_IDS.RATIO_ENABLE_CHECKBOX}" style="font-size:15px;cursor:pointer;">글/댓글 비율 필터 사용</label></div>
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


            div.classList.add('dcuf-settings-panel');
            const settingsHeader = div.firstElementChild;
            if (settingsHeader) settingsHeader.classList.add('dcuf-settings-header');
            const settingsFooter = div.lastElementChild;
            if (settingsFooter) settingsFooter.classList.add('dcuf-settings-footer');
            const settingsMain = document.getElementById(this.CONSTANTS.UI_IDS.SETTINGS_CONTAINER);
            if (settingsMain) {
                settingsMain.classList.add('dcuf-settings-body');
                const thresholdSection = settingsMain.firstElementChild;
                if (thresholdSection) thresholdSection.classList.add('dcuf-settings-section', 'dcuf-settings-threshold');
            }
            const ratioSectionRoot = document.getElementById(this.CONSTANTS.UI_IDS.RATIO_SECTION);
            if (ratioSectionRoot) ratioSectionRoot.classList.add('dcuf-settings-section', 'dcuf-settings-ratio');

            try {
                PersonalBlockModule.attachPopupPinchResize(div, { minWidth: 280, minHeight: 220 });
            } catch (e) {
                console.warn('DCinside User Filter: settings pinch init failed.', e);
            }

            const closeSettingsPanel = () => {
                div.classList.add('dcuf-pop-leave');
                window.setTimeout(() => div.remove(), 140);
            };

            const input = div.querySelector(`#${this.CONSTANTS.UI_IDS.THRESHOLD_INPUT}`);
            const changeShortcutBtn = div.querySelector(`#${this.CONSTANTS.UI_IDS.CHANGE_SHORTCUT_BTN}`);
            const masterDisableCheckbox = div.querySelector(`#${this.CONSTANTS.UI_IDS.MASTER_DISABLE_CHECKBOX}`);
            const settingsContainer = div.querySelector(`#${this.CONSTANTS.UI_IDS.SETTINGS_CONTAINER}`);
            const ratioSection = div.querySelector(`#${this.CONSTANTS.UI_IDS.RATIO_SECTION}`);
            const ratioEnableCheckbox = div.querySelector(`#${this.CONSTANTS.UI_IDS.RATIO_ENABLE_CHECKBOX}`);
            const ratioMinInput = div.querySelector(`#${this.CONSTANTS.UI_IDS.RATIO_MIN_INPUT}`);
            const ratioMaxInput = div.querySelector(`#${this.CONSTANTS.UI_IDS.RATIO_MAX_INPUT}`);
            const closeButton = div.querySelector(`#${this.CONSTANTS.UI_IDS.CLOSE_BUTTON}`);
            const saveButton = div.querySelector(`#${this.CONSTANTS.UI_IDS.SAVE_BUTTON}`);
            const excludeRecommendedCheckbox = div.querySelector(`#${this.CONSTANTS.UI_IDS.EXCLUDE_RECOMMENDED_CHECKBOX}`);
            const blockGuestCheckbox = div.querySelector(`#${this.CONSTANTS.UI_IDS.BLOCK_GUEST_CHECKBOX}`);
            const telecomBlockCheckbox = div.querySelector(`#${this.CONSTANTS.UI_IDS.TELECOM_BLOCK_CHECKBOX}`);

            if (input) { input.focus(); input.select(); }

            if (changeShortcutBtn) {
                changeShortcutBtn.onclick = (e) => {
                    e.preventDefault();
                    this.showShortcutChanger();
                };
            }

            if (closeButton) {
                closeButton.onclick = closeSettingsPanel;
                closeButton.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    closeSettingsPanel();
                }, { passive: false });
            }

            if (!masterDisableCheckbox || !settingsContainer || !ratioSection || !ratioEnableCheckbox || !ratioMinInput || !ratioMaxInput || !saveButton || !excludeRecommendedCheckbox || !blockGuestCheckbox || !telecomBlockCheckbox) {
                console.error('DCinside User Filter: settings popup init failed - required control missing.');
                return;
            }

            const updateMasterState = () => { const isMasterDisabled = masterDisableCheckbox.checked; settingsContainer.style.opacity = isMasterDisabled ? 0.5 : 1; settingsContainer.style.pointerEvents = isMasterDisabled ? 'none' : 'auto'; };
            masterDisableCheckbox.addEventListener('change', updateMasterState); updateMasterState();
            const updateRatioSectionState = () => { const enabled = ratioEnableCheckbox.checked; ratioSection.style.opacity = enabled ? 1 : 0.5; ratioMinInput.disabled = !enabled; ratioMaxInput.disabled = !enabled; };
            ratioEnableCheckbox.addEventListener('change', updateRatioSectionState); updateRatioSectionState();

            // [v2.6.8 추가] 스위치 실시간 저장 & 필터 즉시 적용
            const applyCheckboxChange = async (storageKey, value, extraLogic) => {
                await GM_setValue(storageKey, value);
                if (extraLogic) await extraLogic();
                await this.refilterAllContent();
            };

            masterDisableCheckbox.addEventListener('change', () =>
                applyCheckboxChange(this.CONSTANTS.STORAGE_KEYS.MASTER_DISABLED, masterDisableCheckbox.checked)
            );
            excludeRecommendedCheckbox.addEventListener('change', (e) =>
                applyCheckboxChange(this.CONSTANTS.STORAGE_KEYS.EXCLUDE_RECOMMENDED, e.target.checked)
            );
            blockGuestCheckbox.addEventListener('change', async (e) => {
                const checked = e.target.checked;
                await applyCheckboxChange(this.CONSTANTS.STORAGE_KEYS.BLOCK_GUEST, checked,
                    checked ? null : () => this.clearBlockedGuests()
                );
            });
            telecomBlockCheckbox.addEventListener('change', (e) =>
                applyCheckboxChange(this.CONSTANTS.STORAGE_KEYS.BLOCK_TELECOM, e.target.checked)
            );
            ratioEnableCheckbox.addEventListener('change', (e) =>
                applyCheckboxChange(this.CONSTANTS.STORAGE_KEYS.RATIO_ENABLED, e.target.checked)
            );

            const enterKeySave = (e) => { if (e.key === 'Enter') saveButton.click(); };
            [input, ratioMinInput, ratioMaxInput].forEach(el => { if (el) el.addEventListener('keydown', enterKeySave); });
            let isDragging = false, offsetX, offsetY;
            const onDragStart = (e) => {
                if (e.type === 'touchstart' && e.touches && e.touches.length > 1) return;
                const startTarget = (e.target && e.target.nodeType === 1) ? e.target : e.target.parentElement;
                if (!startTarget || !startTarget.closest('.dcuf-settings-header')) return;
                if (startTarget.closest('button, input, label, a, .switch') || startTarget.id === FilterModule.CONSTANTS.UI_IDS.CLOSE_BUTTON || startTarget.id === FilterModule.CONSTANTS.UI_IDS.CHANGE_SHORTCUT_BTN) return;
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
                if (!isDragging) return;
                if (e.type === 'touchmove' && e.touches && e.touches.length > 1) return;
                e.preventDefault();
                const rect = div.getBoundingClientRect();
                const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
                const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
                let newX = clientX - offsetX; let newY = clientY - offsetY;
                newX = Math.max(0, Math.min(newX, window.innerWidth - rect.width)); newY = Math.max(0, Math.min(newY, window.innerHeight - rect.height));
                div.style.left = `${newX}px`; div.style.top = `${newY}px`;
            };
            const onDragEnd = () => { isDragging = false; document.removeEventListener('mousemove', onDragMove); document.removeEventListener('touchmove', onDragMove); };
            const dragHandle = settingsHeader || div;
            try {
                dragHandle.addEventListener('mousedown', onDragStart);
                dragHandle.addEventListener('touchstart', onDragStart, { passive: true });
            } catch (e) {
                console.warn('DCinside User Filter: settings drag init failed.', e);
            }
            saveButton.onclick = async () => {
                saveButton.disabled = true; saveButton.textContent = '저장 중...';
                const blockGuestChecked = blockGuestCheckbox.checked;
                let val = parseInt(input ? input.value : '0', 10);
                if (isNaN(val)) val = 0;
                const promises = [
                    GM_setValue(this.CONSTANTS.STORAGE_KEYS.MASTER_DISABLED, masterDisableCheckbox.checked),
                    GM_setValue(this.CONSTANTS.STORAGE_KEYS.EXCLUDE_RECOMMENDED, excludeRecommendedCheckbox.checked),
                    GM_setValue(this.CONSTANTS.STORAGE_KEYS.THRESHOLD, val),
                    GM_setValue(this.CONSTANTS.STORAGE_KEYS.RATIO_ENABLED, ratioEnableCheckbox.checked),
                    GM_setValue(this.CONSTANTS.STORAGE_KEYS.RATIO_MIN, ratioMinInput.value),
                    GM_setValue(this.CONSTANTS.STORAGE_KEYS.RATIO_MAX, ratioMaxInput.value),
                    GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_GUEST, blockGuestChecked),
                    GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_TELECOM, telecomBlockCheckbox.checked)
                ];
                if (!blockGuestChecked) promises.push(this.clearBlockedGuests()); try {
                    await Promise.all(promises);
                    await this.reloadSettings();
                    await this.refilterAllContent();
                    closeSettingsPanel();
                } catch (error) {
                    console.error('DCinside User Filter: Settings save failed.', error);
                    saveButton.disabled = false;
                    saveButton.textContent = '저장 & 실행';
                    alert('설정 저장에 실패했습니다. 콘솔을 확인해 주세요.');
                }
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
        isCommentListItem(element) {
            return element instanceof HTMLElement && !!element.closest(this.CONSTANTS.SELECTORS.COMMENT_CONTAINER);
        },
        isParentCommentListItem(element) {
            return this.isCommentListItem(element) && /^comment_li_/.test(element.id || '');
        },
        isReplyCommentListItem(element) {
            return this.isCommentListItem(element) && /^reply_li_/.test(element.id || '');
        },
        hasReplyChildren(element) {
            return element instanceof HTMLElement && !!element.querySelector(':scope > div.reply.show .reply_list > li');
        },
        syncFilteredParentCommentVisibility(parentElement) {
            if (!(parentElement instanceof HTMLElement)) return;
            if (parentElement.getAttribute('data-dcuf-parent-filtered') !== '1') return;
            const replyItems = parentElement.querySelectorAll(':scope > div.reply.show .reply_list > li');
            const hasVisibleReply = Array.from(replyItems).some(li => li.style.display !== 'none');
            parentElement.style.display = hasVisibleReply ? '' : 'none';
        },
        updateParentVisibilityFromReply(replyElement) {
            if (!this.isReplyCommentListItem(replyElement)) return;
            const parentElement = replyElement.closest('li[id^="comment_li_"]');
            this.syncFilteredParentCommentVisibility(parentElement);
        },
        setElementVisibility(element, shouldHide) {
            if (!(element instanceof HTMLElement)) return;
            const isolateParentOnly = shouldHide && this.isParentCommentListItem(element);
            if (isolateParentOnly) {
                element.setAttribute('data-dcuf-parent-filtered', '1');
                element.classList.add('dcuf-parent-comment-filtered');
                this.syncFilteredParentCommentVisibility(element);
                return;
            }
            element.removeAttribute('data-dcuf-parent-filtered');
            element.classList.remove('dcuf-parent-comment-filtered');
            element.style.display = shouldHide ? 'none' : '';
            this.updateParentVisibilityFromReply(element);
        },
        async applyBlockFilterToElement(element, uid, userData, addBlockedUidFn) {
            if (!userData) return;
            const { sumBlocked, ratioBlocked } = this.isUserBlocked(userData);
            const shouldBeBlocked = sumBlocked || ratioBlocked;
            this.setElementVisibility(element, shouldBeBlocked);
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

            if (personalBlockEnabled && personalBlockList) {
                let isPersonallyBlocked = false;
                if (uid && personalBlockList.uids?.some(u => u.id === uid)) isPersonallyBlocked = true;
                else if (nickname && personalBlockList.nicknames?.includes(nickname)) isPersonallyBlocked = true;
                else if (ip && personalBlockList.ips?.includes(ip)) isPersonallyBlocked = true;

                if (isPersonallyBlocked) {
                    this.setElementVisibility(element, true);
                    return;
                }
            }
            if (element.classList.contains('block-disable')) {
                this.setElementVisibility(element, true);
                return;
            }

            if (element.querySelector('em.icon_notice')) {
                this.setElementVisibility(element, false);
                return;
            }

            if (this.shouldSkipFiltering(element)) {
                this.setElementVisibility(element, false);
                return;
            }

            if (masterDisabled) {
                this.setElementVisibility(element, false);
                return;
            }

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
            this.setElementVisibility(element, isBlocked);
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
            if (popup) {
                popup.classList.add('dcuf-pop-leave');
                window.setTimeout(() => popup.remove(), 120);
            }
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
        attachPopupPinchResize(target, options = {}) {
            if (!target) return;
            if (target.getAttribute('data-dcuf-pinch-resize-bound') === '1') return;
            target.setAttribute('data-dcuf-pinch-resize-bound', '1');

            const baseMinWidth = Number(options.minWidth) || 320;
            const baseMinHeight = Number(options.minHeight) || 260;
            const maxWidthOption = Number(options.maxWidth) || 0;
            const maxHeightOption = Number(options.maxHeight) || 0;

            let isPinching = false;
            let startDistance = 0;
            let startWidth = 0;
            let startHeight = 0;
            let lastMoveTs = 0;
            let lastMoveDistance = -1;

            const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
            const getDistance = (t1, t2) => Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            const getMidpoint = (t1, t2) => ({ x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 });
            const viewportSize = () => ({ width: window.innerWidth, height: window.innerHeight });

            const normalizeFixedPosition = () => {
                const rect = target.getBoundingClientRect();
                if (target.style.transform && target.style.transform !== 'none') {
                    target.style.transform = 'none';
                    target.style.left = `${rect.left}px`;
                    target.style.top = `${rect.top}px`;
                }
                return target.getBoundingClientRect();
            };

            const isTouchInsideRect = (touch, rect, padding = 24) => (
                touch.clientX >= rect.left - padding &&
                touch.clientX <= rect.right + padding &&
                touch.clientY >= rect.top - padding &&
                touch.clientY <= rect.bottom + padding
            );

            const canStartPinch = (touches, rect) => {
                if (!touches || touches.length < 2) return false;
                const t1 = touches[0];
                const t2 = touches[1];
                if (!isTouchInsideRect(t1, rect) || !isTouchInsideRect(t2, rect)) return false;
                const mid = getMidpoint(t1, t2);
                return isTouchInsideRect({ clientX: mid.x, clientY: mid.y }, rect, 48);
            };

            const startPinch = (touches) => {
                const rect = normalizeFixedPosition();
                if (!canStartPinch(touches, rect)) return;

                const distance = getDistance(touches[0], touches[1]);
                if (!distance || !isFinite(distance)) return;

                isPinching = true;
                startDistance = distance;
                startWidth = rect.width;
                startHeight = rect.height;
                lastMoveTs = 0;
                lastMoveDistance = -1;
            };

            const onTouchStart = (e) => {
                if (!target.isConnected) return;
                if (!e.touches || e.touches.length < 2) return;
                startPinch(e.touches);
                if (isPinching) {
                    if (e.cancelable) e.preventDefault();
                    e.stopPropagation();
                }
            };

            const onTouchMove = (e) => {
                if (!target.isConnected || !isPinching) return;
                if (!e.touches || e.touches.length < 2) {
                    isPinching = false;
                    return;
                }

                const distance = getDistance(e.touches[0], e.touches[1]);
                if (!distance || !isFinite(distance)) return;

                const now = Date.now();
                if (lastMoveDistance >= 0 && Math.abs(distance - lastMoveDistance) < 0.0001 && (now - lastMoveTs) < 6) {
                    if (e.cancelable) e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                lastMoveDistance = distance;
                lastMoveTs = now;

                const mid = getMidpoint(e.touches[0], e.touches[1]);
                const vp = viewportSize();
                const maxViewportWidth = Math.max(120, vp.width - 8);
                const maxViewportHeight = Math.max(120, vp.height - 8);

                const dynamicMinWidth = Math.max(120, Math.min(baseMinWidth, Math.max(120, vp.width - 12)));
                const dynamicMinHeight = Math.max(120, Math.min(baseMinHeight, Math.max(120, vp.height - 12)));

                const configuredMaxWidth = maxWidthOption > 0 ? Math.min(maxWidthOption, maxViewportWidth) : maxViewportWidth;
                const configuredMaxHeight = maxHeightOption > 0 ? Math.min(maxHeightOption, maxViewportHeight) : maxViewportHeight;
                const maxWidth = Math.max(dynamicMinWidth, configuredMaxWidth);
                const maxHeight = Math.max(dynamicMinHeight, configuredMaxHeight);

                const scale = distance / startDistance;
                const nextWidth = clamp(startWidth * scale, dynamicMinWidth, maxWidth);
                const nextHeight = clamp(startHeight * scale, dynamicMinHeight, maxHeight);

                const rawLeft = mid.x - (nextWidth / 2);
                const rawTop = mid.y - (nextHeight / 2);
                const nextLeft = clamp(rawLeft, 0, Math.max(0, vp.width - nextWidth));
                const nextTop = clamp(rawTop, 0, Math.max(0, vp.height - nextHeight));

                target.style.width = `${nextWidth}px`;
                target.style.height = `${nextHeight}px`;
                target.style.left = `${nextLeft}px`;
                target.style.top = `${nextTop}px`;

                if (e.cancelable) e.preventDefault();
                e.stopPropagation();
            };

            const onTouchEnd = () => {
                if (!target.isConnected) return;
                isPinching = false;
            };

            target.addEventListener('touchstart', onTouchStart, { passive: false });
            target.addEventListener('touchmove', onTouchMove, { passive: false });
            target.addEventListener('touchend', onTouchEnd, { passive: true });
            target.addEventListener('touchcancel', onTouchEnd, { passive: true });
        },
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

            this.attachPopupPinchResize(popup, { minWidth: 300, minHeight: 240 });


            const closePopup = () => {
                popup.classList.add('dcuf-pop-leave');
                overlay.classList.add('dcuf-overlay-leave');
                window.setTimeout(() => {
                    overlay.remove();
                    popup.remove();
                }, 140);
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

            this.attachPopupPinchResize(panel, { minWidth: 320, minHeight: 260 });

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
                panel.classList.add('dcuf-pop-leave');
                overlay.classList.add('dcuf-overlay-leave');
                window.setTimeout(() => {
                    overlay.remove();
                    panel.remove();
                }, 140);
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

                // [v2.6.8 수정] 댓글창처럼 정상 작동하게끔 이식 (복제 방식 + 위치 보정)
                if (clickedElement.closest('.author')) {
                    e.preventDefault();

                    const originalAuthor = originalRow.querySelector('.gall_writer');
                    if (originalAuthor) {
                        // 클릭 좌표 저장 (경계 검사용)
                        const clientX = e.clientX;
                        const clientY = e.clientY;

                        originalAuthor.click();

                        // 팝업 위치 고도화 (댓글창 로직 이식 + 화면 이탈 방지)
                        setTimeout(() => {
                            const lyr = document.getElementById('user_data_lyr');
                            if (lyr) {
                                // 게시글 목록의 .author 영역에 맞춰 위치 강제 재설정
                                lyr.style.setProperty('position', 'absolute', 'important');
                                lyr.style.setProperty('top', '100%', 'important');
                                lyr.style.setProperty('left', '0', 'important');
                                lyr.style.setProperty('margin-top', '5px', 'important');
                                lyr.style.setProperty('z-index', '2147483647', 'important');
                                lyr.style.setProperty('display', 'block', 'important');
                                lyr.style.setProperty('visibility', 'visible', 'important');

                                // 화면 이탈 방지 (경계 검사)
                                const rect = lyr.getBoundingClientRect();
                                const windowW = window.innerWidth;
                                const windowH = window.innerHeight;

                                // 우측 끝에 너무 붙어있으면 왼쪽으로 이동
                                if (rect.right > windowW) {
                                    lyr.style.setProperty('left', 'auto', 'important');
                                    lyr.style.setProperty('right', '0', 'important');
                                }

                                // [v2.6.8 추가] 왼쪽 끝에 너무 붙어있으면 오른쪽으로 이동
                                if (rect.left < 0) {
                                    lyr.style.setProperty('left', '0', 'important');
                                    lyr.style.setProperty('right', 'auto', 'important');
                                    lyr.style.setProperty('margin-left', '0', 'important');
                                }

                                // 아래쪽 끝에 너무 붙어있으면 위쪽으로 이동
                                if (rect.bottom > windowH) {
                                    lyr.style.setProperty('top', 'auto', 'important');
                                    lyr.style.setProperty('bottom', '100%', 'important');
                                    lyr.style.setProperty('margin-bottom', '5px', 'important');
                                }
                            }
                        }, 50);
                    }
                    return;
                }
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

            // [v2.6.8 수정] 다시 복제(cloneNode) 방식으로 원복합니다. (안정성 확보)
            // 대신 CSS와 proxyClick 로직을 통해 팝업의 위치와 기능을 완벽히 이식합니다.
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

        processAllLists() {
            const wraps = document.querySelectorAll(this.SELECTORS.LIST_WRAP);
            wraps.forEach(lw => this.transformList(lw));
        },

        isListPage() {
            return window.location.pathname.includes('/board/lists');
        },

        isInitialUiReady() {
            if (window.location.pathname.includes('/board/write/')) return true;
            if (window.location.pathname.includes('/board/view/')) return true;

            const targetWraps = Array.from(document.querySelectorAll(this.SELECTORS.LIST_WRAP))
                .filter(listWrap => listWrap.querySelector(this.SELECTORS.ORIGINAL_TABLE));

            let ready;
            if (this.isListPage()) {
                ready = targetWraps.length > 0 && targetWraps.every(listWrap => listWrap.querySelector(`.${this.CUSTOM_CLASSES.MOBILE_LIST}`));
            } else {
                ready = targetWraps.length === 0 || targetWraps.every(listWrap => listWrap.querySelector(`.${this.CUSTOM_CLASSES.MOBILE_LIST}`));
            }

            return ready;
        },

        waitForInitialUiReady(timeoutMs = 4000) {
            return new Promise((resolve) => {
                if (this.isInitialUiReady()) {
                    resolve('ready');
                    return;
                }

                let rafId = 0;
                let timeoutId = 0;
                let observer = null;

                const cleanup = () => {
                    if (observer) observer.disconnect();
                    if (rafId) window.cancelAnimationFrame(rafId);
                    if (timeoutId) window.clearTimeout(timeoutId);
                };

                const finish = (reason) => {
                    cleanup();
                    resolve(reason);
                };

                const checkReady = () => {
                    this.processAllLists();
                    if (this.isInitialUiReady()) {
                        finish('ready');
                    }
                };

                const scheduleCheck = () => {
                    if (rafId) return;
                    rafId = window.requestAnimationFrame(() => {
                        rafId = 0;
                        checkReady();
                    });
                };

                observer = new MutationObserver(() => {
                    scheduleCheck();
                });
                observer.observe(document.body, { childList: true, subtree: true });

                timeoutId = window.setTimeout(() => {
                    this.processAllLists();
                    if (this.isInitialUiReady()) {
                        finish('ready');
                        return;
                    }

                    console.warn('[DC Filter+UI] Initial UI readiness timed out; revealing page with current state.');
                    finish('timeout');
                }, timeoutMs);

                scheduleCheck();
            });
        },

        transformList(listWrap) {
            if (listWrap.querySelector(`.${this.CUSTOM_CLASSES.MOBILE_LIST}`)) return;
            if (listWrap.hasAttribute(this.TRANSFORMED_ATTR)) return;

            const originalTable = listWrap.querySelector(this.SELECTORS.ORIGINAL_TABLE);
            if (!originalTable) return;
            const originalTbody = originalTable.querySelector(this.SELECTORS.ORIGINAL_TBODY);
            if (!originalTbody) return;
            listWrap.setAttribute(this.TRANSFORMED_ATTR, 'true');

            originalTable.style.setProperty('display', 'none', 'important');

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


        /**
         * [v2.6.8 수정] 본문 + 댓글 글자크기 배율 스케일링 통합 함수
         *
         * [본문 처리]
         *   DC 에디터 기본 글자크기(12pt = 16px)를 기준으로 배율을 계산하여,
         *   .gallview_contents 내 인라인 font-size가 있는 요소들만 비례 확대합니다.
         *   → 원본 서식(크기 차이)은 그대로 유지됩니다.
         *
         * [댓글 처리]
         *   .comment_box .usertxt 및 .img_comment .usertxt 요소에 대해
         *   DC 댓글 기본 글자크기(13px)를 기준으로 배율을 계산하여 적용합니다.
         *   인라인 서식이 지정된 경우에도 해당 크기에 배율을 적용합니다.
         */
        scaleAllFontSizes() {
            // ── pt → px 변환 계수 ──
            const PT_TO_PX = 4 / 3; // 1pt = 1.333...px

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // [1] 본문 글자크기 배율 스케일링
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            const contentEl = document.querySelector('.gallview_contents');
            if (contentEl) {
                // CSS로 설정된 .gallview_contents font-size (현재 26px)
                const targetSize = parseFloat(window.getComputedStyle(contentEl).fontSize);
                // DC 에디터 기본: 12pt = 16px
                const contentBasePx = 16;
                const contentRatio = targetSize / contentBasePx;

                if (contentRatio > 1) {
                    contentEl.querySelectorAll('*').forEach(el => {
                        // [v2.7.0.1 추가] 이미 스케일링된 요소는 중복 처리 방지
                        if (el.closest('.comment_box, .img_comment, #focus_cmt')) return;

                        if (el.dataset.scaledByFilter) return;
                        el.dataset.scaledByFilter = '1';

                        const inlineFontSize = el.style.fontSize;
                        if (!inlineFontSize) return; // 인라인 없으면 부모 상속

                        let originalPx = 0;
                        if (inlineFontSize.endsWith('pt')) {
                            originalPx = parseFloat(inlineFontSize) * PT_TO_PX;
                        } else if (inlineFontSize.endsWith('px')) {
                            originalPx = parseFloat(inlineFontSize);
                        } else {
                            return; // em, rem 등 무시
                        }
                        if (isNaN(originalPx) || originalPx <= 0) return;

                        const scaledPx = Math.round(originalPx * contentRatio * 10) / 10;
                        el.style.setProperty('font-size', scaledPx + 'px', 'important');
                    });
                }
            }

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // [2] 댓글 글자크기 배율 스케일링
            //     대상: .comment_box .usertxt
            //           .img_comment .usertxt (이미지 댓글)
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // ??/????? ???? ??? ?? normalize ??? ?????.
            return;
        },

        transformWritePage() {
            if (document.body.classList.contains('is-write-page')) return;
            document.body.classList.add('is-write-page');

            const writeBox = document.querySelector('.write_box');
            if (writeBox) {
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
        async init() {
            if (isUiInitialized) return 'already-ready';
            isUiInitialized = true;


            // [핵심 수정] 스크립트 시작 시, 툴팁으로 사용할 div를 미리 한 번만 생성
            if (!document.getElementById('custom-instant-tooltip')) {
                const tooltip = document.createElement('div');
                tooltip.id = 'custom-instant-tooltip';
                document.body.appendChild(tooltip);
            }


            const viewportMeta = document.querySelector('meta[name="viewport"]');
            if (!viewportMeta) {
                const newViewportMeta = document.createElement('meta');
                newViewportMeta.name = 'viewport';
                newViewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes';
                document.head.appendChild(newViewportMeta);
            } else if (/user-scalable\s*=\s*no/i.test(viewportMeta.content) || /maximum-scale\s*=\s*1(\.0+)?/i.test(viewportMeta.content)) {
                viewportMeta.content = viewportMeta.content
                    .replace(/user-scalable\s*=\s*no/ig, 'user-scalable=yes')
                    .replace(/maximum-scale\s*=\s*1(\.0+)?/ig, 'maximum-scale=5.0');
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
                // [v2.6.8] 본문 + 댓글 글자크기 배율 스케일링 (통합)
                this.scaleAllFontSizes();
            }


            this.processAllLists();


            // [UI 이벤트 기반 변화 감지 옵저버]
            const observer = new MutationObserver((mutations) => {
                let needsListUpdate = false;
                let needsCommentScale = false;

                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (node.parentNode && node.parentNode.closest && (node.parentNode.closest('#dc-backup-popup') || node.parentNode.closest('#dc-block-management-panel') || node.parentNode.closest('#dcinside-filter-setting'))) {
                            continue; // 스크립트 UI 내부 변화 무시
                        }

                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // 글 목록 변화 감지
                            if (node.matches(this.SELECTORS.LIST_WRAP) || node.querySelector(this.SELECTORS.LIST_WRAP)) {
                                needsListUpdate = true;
                            }
                            // [v2.6.8 추가] 댓글 목록 변화 감지 (페이장 전환 등 동적 로딩)
                            if (
                                node.matches('ul.cmt_list') ||
                                node.querySelector('ul.cmt_list') ||
                                node.matches('li.ub-content') ||
                                (node.parentNode && node.parentNode.matches && node.parentNode.matches('ul.cmt_list'))
                            ) {
                                needsCommentScale = true;
                            }
                        }
                    }
                }

                if (needsListUpdate) this.processAllLists();
                if (needsCommentScale && typeof window.__dcufScheduleCommentNormalize === 'function') {
                    window.__dcufScheduleCommentNormalize();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });

            return this.waitForInitialUiReady();
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
        const uiInitState = await UIModule.init();
        console.log("[DC Filter+UI] Initialization complete.", uiInitState);
        return uiInitState;
    }


    const runSafely = async () => {
        let uiInitState = 'fallback';

        try {
            uiInitState = await main();
        } catch (error) {
            uiInitState = 'error';
            console.error("[DC Filter+UI] A critical error occurred during main execution:", error);
        } finally {
            // [v2.2.2 수정] 모든 UI 처리 및 필터링 적용이 끝난 후,
            // 루트 준비 완료 클래스를 추가하여 화면을 표시합니다.
            markUiReady();
            console.log(`[DC Filter+UI] UI is now visible. (${uiInitState})`);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runSafely);
    } else {
        runSafely();
    }




    const observeDarkMode = () => {
        const head = document.head;
        if (!head) {
            setTimeout(observeDarkMode, 100);
            return;
        }

        const checkDarkModeStatus = () => {
            const body = document.body;
            if (!body) return;
            const root = document.documentElement;

            const darkModeStylesheet = document.getElementById('css-darkmode');
            if (darkModeStylesheet) {
                body.classList.add('dc-filter-dark-mode');
                if (root) root.classList.add('dc-filter-dark-mode');
            } else {
                body.classList.remove('dc-filter-dark-mode');
                if (root) root.classList.remove('dc-filter-dark-mode');
            }
        };

        const observer = new MutationObserver(checkDarkModeStatus);
        observer.observe(head, { childList: true });

        // 초기 상태 확인
        checkDarkModeStatus();
    };
    observeDarkMode();

})();

; (() => {
    const STYLE_ID = 'dcuf-phase1-list-theme';
    const DEBUG_KEY = '__DCUF_PHASE1_DEBUG__';
    const css = `
        .custom-mobile-list {
            --dcuf-fg: #2b3340;
            --dcuf-fg-sub: #4a5566;
            --dcuf-fg-meta: #667285;
            --dcuf-accent: #245bda;
            --dcuf-surface: #f6f8fb;
            --dcuf-border: #dfe5ee;
            background: linear-gradient(180deg, #f2f6fb 0%, #f8fafc 100%) !important;
            border-top: 1px solid var(--dcuf-border) !important;
            padding: 8px 10px !important;
        }
        .custom-post-item {
            margin: 0 0 8px 0 !important;
            padding: 13px 14px !important;
            border: 1px solid var(--dcuf-border) !important;
            border-radius: 12px !important;
            background: #fff !important;
            box-shadow: 0 2px 8px rgba(12, 22, 40, 0.06);
            color: var(--dcuf-fg) !important;
        }
        .custom-post-item:last-child {
            margin-bottom: 0 !important;
        }
        .custom-post-item:hover {
            background: var(--dcuf-surface) !important;
            border-color: #d2dce9 !important;
        }
        .custom-post-item.notice,
        .custom-post-item.concept {
            padding-left: 14px !important;
            padding-top: 40px !important;
        }
        .custom-post-item.notice::before,
        .custom-post-item.concept::before {
            top: 10px !important;
            left: 12px !important;
            transform: none !important;
            border-radius: 999px !important;
            font-size: 11px !important;
            padding: 3px 8px !important;
        }
        .post-title {
            font-size: 18px !important;
            line-height: 1.42 !important;
            margin-bottom: 8px !important;
            color: var(--dcuf-fg) !important;
            letter-spacing: -0.01em;
            gap: 6px;
        }
        .post-title a {
            min-width: 0;
        }
        .post-title a:visited {
            color: #6f45aa !important;
        }
        .post-title .gall_subject {
            border: none !important;
            border-radius: 999px;
            background: #eef2f7;
            color: #516075 !important;
            font-size: 12px !important;
            font-weight: 700 !important;
            padding: 2px 8px !important;
            margin-right: 2px !important;
        }
        .post-title .reply_num {
            color: var(--dcuf-accent) !important;
            background: transparent !important;
            border-radius: 0 !important;
            padding: 0 !important;
            margin-left: 2px !important;
        }
        .post-meta {
            color: var(--dcuf-fg-meta) !important;
            align-items: center !important;
            gap: 8px !important;
        }
        .post-meta .author .nickname,
        .post-meta .author .ip {
            color: var(--dcuf-fg-sub) !important;
        }
        .post-meta .author .nickname {
            font-size: 14px !important;
            font-weight: 700 !important;
        }
        .post-meta .stats {
            font-size: 12px !important;
            gap: 8px !important;
        }
        .custom-bottom-controls {
            background: transparent !important;
            padding: 10px 6px 14px !important;
            gap: 10px;
        }
        .custom-button-row .list_bottom_btnbox {
            border: 1px solid var(--dcuf-border);
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.9) !important;
            box-shadow: 0 2px 8px rgba(12, 22, 40, 0.05);
            padding: 10px !important;
        }
        .custom-bottom-controls form[name="frmSearch"] {
            display: block !important;
            width: 100% !important;
            max-width: 520px;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        .custom-bottom-controls form[name="frmSearch"] fieldset,
        .custom-bottom-controls form[name="frmSearch"] .sch_smit {
            display: flex !important;
            align-items: stretch !important;
            flex-direction: row !important;
            gap: 6px !important;
            width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        .custom-bottom-controls form[name="frmSearch"] legend {
            display: none !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .search_left_box,
        .custom-bottom-controls form[name="frmSearch"] select {
            height: 38px !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .buttom_search_wrap {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 6px !important;
            width: fit-content !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .select_box.bottom_array,
        .custom-bottom-controls form[name="frmSearch"] .bottom_search {
            float: none !important;
            margin: 0 !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .select_box.bottom_array {
            width: 125px !important;
            height: 38px !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .select_box.bottom_array .select_area {
            width: 117px !important;
            height: 30px !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .bottom_search {
            display: flex !important;
            align-items: center !important;
            width: 320px !important;
            height: 38px !important;
            min-width: 0 !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .inner_search {
            width: 278px !important;
            height: 30px !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            background: #fff !important;
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06) !important;
            overflow: hidden !important;
        }
        .custom-bottom-controls form[name="frmSearch"] input.in_keyword,
        .custom-bottom-controls form[name="frmSearch"] input[type="text"] {
            width: 100% !important;
            height: 30px !important;
            margin: 0 !important;
            padding: 0 9px !important;
            border: none !important;
            border-radius: 0 !important;
            background: #fff !important;
            box-shadow: none !important;
            color: #333 !important;
            font-size: 14px !important;
            font-weight: 700 !important;
            line-height: 30px !important;
            box-sizing: border-box !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .bnt_search,
        .custom-bottom-controls form[name="frmSearch"] button.sp_img.bnt_search {
            flex: none !important;
            width: 37px !important;
            min-width: 37px !important;
            height: 36px !important;
            margin: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
        }
        .custom-bottom-controls .page_box {
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.85) !important;
            padding: 8px 10px;
            box-shadow: 0 2px 8px rgba(12, 22, 40, 0.05);
        }
        body.dc-filter-dark-mode .custom-mobile-list {
            --dcuf-fg: #edf3ff;
            --dcuf-fg-sub: #d2dced;
            --dcuf-fg-meta: #a6b3c8;
            --dcuf-accent: #8cb4ff;
            --dcuf-surface: #1f2834;
            --dcuf-border: #3a4658;
            background: linear-gradient(180deg, #121922 0%, #17202c 100%) !important;
        }
        body.dc-filter-dark-mode .custom-post-item {
            background: linear-gradient(180deg, #222d3a 0%, #1d2734 100%) !important;
            border-color: var(--dcuf-border) !important;
            color: var(--dcuf-fg) !important;
            box-shadow: 0 6px 14px rgba(0, 0, 0, 0.25);
        }
        body.dc-filter-dark-mode .custom-post-item:hover {
            background: var(--dcuf-surface) !important;
            border-color: #4b5a70 !important;
        }
        body.dc-filter-dark-mode .post-title,
        body.dc-filter-dark-mode .post-meta,
        body.dc-filter-dark-mode .post-meta .stats,
        body.dc-filter-dark-mode .post-meta .author .nickname,
        body.dc-filter-dark-mode .post-meta .author .ip {
            color: var(--dcuf-fg-sub) !important;
        }
        body.dc-filter-dark-mode .post-title a:visited {
            color: #d3beff !important;
        }        .custom-mobile-list .post-meta .author,
        .custom-mobile-list .post-meta .author:hover,
        .custom-mobile-list .post-meta .author .gall_writer,
        .custom-mobile-list .post-meta .author .gall_writer:hover,
        .custom-mobile-list .post-meta .author .nickname,
        .custom-mobile-list .post-meta .author .nickname:hover,
        .custom-mobile-list .post-meta .author .ip,
        .custom-mobile-list .post-meta .author .ip:hover {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            outline: none !important;
        }
        .custom-mobile-list .post-meta .author .gall_writer {
            border-radius: 0 !important;
            padding: 0 !important;
        }

        body.dc-filter-dark-mode .post-title .gall_subject {
            background: #324153;
            color: #d8e3f4 !important;
        }
        body.dc-filter-dark-mode .custom-button-row .list_bottom_btnbox,
        body.dc-filter-dark-mode .custom-bottom-controls form[name="frmSearch"],
        body.dc-filter-dark-mode .custom-bottom-controls .page_box {
            background: rgba(26, 34, 46, 0.9) !important;
            border-color: #3d4c60;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.28);
        }
        body.dc-filter-dark-mode .custom-bottom-controls form[name="frmSearch"] input[type="text"] {
            background: #111722 !important;
            border-color: #445267 !important;
            color: #f3f6ff !important;
        }
        @media screen and (max-width: 640px) {
            .custom-mobile-list { padding: 8px !important; }
            .custom-post-item { padding: 12px !important; border-radius: 11px !important; }
            .custom-post-item.notice,
            .custom-post-item.concept { padding-top: 36px !important; }
            .post-title { font-size: 17px !important; }
            .post-meta { flex-direction: column; align-items: stretch !important; }
            .post-meta .stats { justify-content: flex-start; }
        }
    `
        ;

    const setDebug = (status, detail) => {
        const payload = { status, detail, ts: new Date().toISOString(), href: location.href };
        window[DEBUG_KEY] = payload;
        document.documentElement.setAttribute('data-dcuf-phase1', status);
    };

    const injectStyle = () => {
        if (document.getElementById(STYLE_ID)) {
            setDebug('style-exists', 'style tag already present');
            return true;
        }

        const target = document.head || document.documentElement;
        if (!target) {
            setDebug('no-target', 'head/documentElement unavailable');
            return false;
        }

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;
        target.appendChild(style);
        setDebug('style-injected', 'style tag appended');
        return true;
    };

    const verifyApplied = (reason) => {
        const list = document.querySelector('.custom-mobile-list');
        const item = document.querySelector('.custom-post-item');

        if (!list || !item) {
            setDebug('waiting-list', reason + ' / custom list not ready');
            return false;
        }

        const listStyle = window.getComputedStyle(list);
        const itemStyle = window.getComputedStyle(item);
        const applied = itemStyle.borderRadius === '12px' && itemStyle.marginBottom === '8px';
        const detail = JSON.stringify({
            reason: reason,
            listBg: listStyle.backgroundImage || listStyle.backgroundColor,
            itemRadius: itemStyle.borderRadius,
            itemMarginBottom: itemStyle.marginBottom,
            itemBoxShadow: itemStyle.boxShadow
        });

        setDebug(applied ? 'applied' : 'not-applied', detail);
        return applied;
    };

    injectStyle();
    verifyApplied('initial');

    const scheduleVerify = (reason, delay) => {
        setTimeout(() => verifyApplied(reason), delay);
    };

    scheduleVerify('after-100ms', 100);
    scheduleVerify('after-500ms', 500);
    scheduleVerify('after-1500ms', 1500);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            injectStyle();
            verifyApplied('domcontentloaded');
            scheduleVerify('domcontentloaded+300ms', 300);
        }, { once: true });
    }

    window.addEventListener('load', () => {
        injectStyle();
        verifyApplied('window-load');
        scheduleVerify('window-load+300ms', 300);
    }, { once: true });
})();

(() => {
    const STYLE_ID = 'dcuf-phase1-view-theme';
    const css = `
        .view_content_wrap {
            --dcuf-view-surface: rgba(255, 255, 255, 0.96);
            --dcuf-view-surface-muted: #f7f9fd;
            --dcuf-view-border: #d7e0ec;
            --dcuf-view-border-strong: #c7d3e4;
            --dcuf-view-shadow: 0 8px 24px rgba(18, 35, 69, 0.08);
            --dcuf-view-shadow-soft: 0 4px 14px rgba(18, 35, 69, 0.05);
            --dcuf-view-fg: #22324c;
            --dcuf-view-fg-sub: #5f6f86;
            --dcuf-view-accent: #3f6de0;
            padding: 10px 10px 0 !important;
            color: var(--dcuf-view-fg) !important;
        }
        body.dc-filter-dark-mode .view_content_wrap {
            --dcuf-view-surface: #18212d;
            --dcuf-view-surface-muted: #1e2a39;
            --dcuf-view-border: #314258;
            --dcuf-view-border-strong: #45607c;
            --dcuf-view-shadow: 0 10px 24px rgba(0, 0, 0, 0.32);
            --dcuf-view-shadow-soft: 0 6px 18px rgba(0, 0, 0, 0.24);
            --dcuf-view-fg: #edf3ff;
            --dcuf-view-fg-sub: #b6c4d9;
            --dcuf-view-accent: #8cb4ff;
        }
        .view_content_wrap > header {
            margin-bottom: 12px !important;
        }
        .view_content_wrap .gallview_head {
            padding: 18px 18px 14px !important;
            border: 1px solid var(--dcuf-view-border) !important;
            border-radius: 18px !important;
            background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%) !important;
            box-shadow: var(--dcuf-view-shadow) !important;
        }
        body.dc-filter-dark-mode .view_content_wrap .gallview_head {
            background: linear-gradient(180deg, #1d2734 0%, #18212d 100%) !important;
        }
        .view_content_wrap .title {
            margin: 0 !important;
            line-height: 1.45 !important;
        }
        .view_content_wrap .title_headtext {
            display: inline !important;
            padding: 0 !important;
            margin: 0 8px 0 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            color: #111 !important;
            font-size: 14px !important;
            font-weight: 700 !important;
        }
        .view_content_wrap .title_headtext:empty {
            display: none !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        body.dc-filter-dark-mode .view_content_wrap .title_headtext {
            background: transparent !important;
            color: #111 !important;
        }        .view_content_wrap .title_subject {
            color: var(--dcuf-view-fg) !important;
            font-size: 22px !important;
            font-weight: 800 !important;
            letter-spacing: -0.03em !important;
        }
        .view_content_wrap .title_device {
            margin-left: 6px !important;
        }
        .view_content_wrap .gall_writer {
            height: auto !important;
            margin-top: 14px !important;
            padding-top: 11px !important;
            border-top: 1px solid var(--dcuf-view-border) !important;
            background: transparent !important;
            color: var(--dcuf-view-fg-sub) !important;
            overflow: hidden !important;
        }
        .view_content_wrap .gall_writer .fl {
            float: left !important;
            display: inline-flex !important;
            align-items: center !important;
            flex-wrap: wrap !important;
            gap: 8px !important;
            min-width: 0 !important;
            background: transparent !important;
        }
        .view_content_wrap .gall_writer .fr {
            float: right !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: flex-end !important;
            flex-wrap: nowrap !important;
            gap: 12px !important;
            min-width: 0 !important;
            background: transparent !important;
        }
        .view_content_wrap .gall_writer .nickname,
        .view_content_wrap .gall_writer .nickname em,
        .view_content_wrap .gall_writer .ip {
            background: transparent !important;
        }
        .view_content_wrap .gall_writer .nickname,
        .view_content_wrap .gall_writer .nickname em {
            color: var(--dcuf-view-fg) !important;
            font-size: 15px !important;
            font-weight: 800 !important;
        }
        .view_content_wrap .gall_writer .fr > span {
            display: inline-flex !important;
            align-items: center !important;
            min-height: 0 !important;
            padding: 0 !important;
            white-space: nowrap !important;
            background: transparent !important;
            border: 0 !important;
            box-shadow: none !important;
        }
        .view_content_wrap .gall_writer .gall_date,
        .view_content_wrap .gall_writer .gall_count,
        .view_content_wrap .gall_writer .gall_recommend,
        .view_content_wrap .gall_writer .gall_comment,
        .view_content_wrap .gall_writer .gall_comment a {
            color: var(--dcuf-view-fg-sub) !important;
            font-size: 13px !important;
        }
        .view_content_wrap .gall_writer .gall_comment,
        .view_content_wrap .gall_writer .gall_comment a {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: auto !important;
            min-width: 0 !important;
            min-height: 0 !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            background-image: none !important;
            box-shadow: none !important;
            line-height: 1.2 !important;
            text-indent: 0 !important;
            overflow: visible !important;
        }
        .view_content_wrap .gall_writer .gall_comment a:hover {
            color: var(--dcuf-view-accent) !important;
        }
        .view_content_wrap .gall_writer .gall_scrap button {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: auto !important;
            min-width: 58px !important;
            max-width: none !important;
            height: 32px !important;
            min-height: 32px !important;
            padding: 0 12px !important;
            border-radius: 999px !important;
            border: 1px solid var(--dcuf-view-border-strong) !important;
            background: var(--dcuf-view-surface-muted) !important;
            background-image: none !important;
            color: var(--dcuf-view-accent) !important;
            font-size: 13px !important;
            font-weight: 700 !important;
            line-height: 1 !important;
            white-space: nowrap !important;
            text-indent: 0 !important;
            box-sizing: border-box !important;
            overflow: visible !important;
        }
        .view_content_wrap .gallview_contents {
            margin-bottom: 14px !important;
            padding: 16px !important;
            border: 1px solid var(--dcuf-view-border) !important;
            border-radius: 18px !important;
            background: var(--dcuf-view-surface) !important;
            box-shadow: var(--dcuf-view-shadow) !important;
        }
        .view_content_wrap .gallview_contents > .inner {
            width: 100% !important;
        }
        .view_content_wrap .writing_view_box,
        .view_content_wrap .write_div {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            overflow: visible !important;
            background: transparent !important;
        }
        .view_content_wrap .gallview_contents img,
        .view_content_wrap .gallview_contents video {
            border-radius: 14px !important;
        }
        body.dc-filter-dark-mode .view_content_wrap .gallview_contents,
        body.dc-filter-dark-mode .view_content_wrap .gallview_contents p,
        body.dc-filter-dark-mode .view_content_wrap .gallview_contents span,
        body.dc-filter-dark-mode .view_content_wrap .gallview_contents div {
            color: var(--dcuf-view-fg) !important;
            background-color: transparent !important;
        }
        .view_content_wrap .recommend_kapcode {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 290px !important;
            min-width: 290px !important;
            max-width: 290px !important;
            margin: 14px auto 10px !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            text-align: left !important;
            overflow: visible !important;
        }
        .view_content_wrap .recommend_kapcode .kap_codeimg {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex: 0 0 140px !important;
            width: 140px !important;
            height: 31px !important;
            min-height: 31px !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 1px solid var(--dcuf-view-border-strong) !important;
            border-right: 0 !important;
            border-radius: 0 !important;
            background: #fff !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
        }
        .view_content_wrap .recommend_kapcode .kcaptcha {
            display: block !important;
            width: 140px !important;
            height: 31px !important;
            margin: 0 !important;
            vertical-align: middle !important;
        }
        .view_content_wrap .recommend_kapcode .recom_input_kapcode {
            display: block !important;
            flex: 0 0 150px !important;
            width: 150px !important;
            min-width: 150px !important;
            max-width: 150px !important;
            height: 31px !important;
            min-height: 31px !important;
            margin: 0 !important;
            padding: 0 10px !important;
            border: 1px solid var(--dcuf-view-border-strong) !important;
            border-radius: 0 !important;
            background: #fff !important;
            color: var(--dcuf-view-fg-sub) !important;
            box-sizing: border-box !important;
            opacity: 1 !important;
            line-height: 29px !important;
        }
        .view_content_wrap .btn_recommend_box {
            display: block !important;
            width: 100% !important;
            min-width: 0 !important;
            margin: 14px 0 6px !important;
            padding: 14px 16px !important;
            border: 1px solid var(--dcuf-view-border) !important;
            border-radius: 18px !important;
            background: var(--dcuf-view-surface) !important;
            box-shadow: var(--dcuf-view-shadow-soft) !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
        }
        body.dc-filter-dark-mode .view_content_wrap .btn_recommend_box {
            background: var(--dcuf-view-surface) !important;
            border-color: var(--dcuf-view-border) !important;
        }
        .view_content_wrap .btn_recommend_box .inner_box,
        .view_content_wrap .btn_recommend_box .recom_bottom_box,
        .view_content_wrap .btn_recommend_box .inner_box > .inner {
            box-sizing: border-box !important;
        }
        .view_content_wrap .btn_recommend_box .inner_box {
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: stretch !important;
            justify-content: center !important;
            gap: 12px !important;
            width: 100% !important;
        }
        .view_content_wrap .btn_recommend_box .recom_bottom_box {
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 10px !important;
            width: 100% !important;
            margin-top: 11px !important;
            padding-top: 11px !important;
            border-top: 1px solid var(--dcuf-view-border) !important;
        }
        .view_content_wrap .btn_recommend_box .inner_box > .inner {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 8px !important;
            flex: 0 1 210px !important;
            min-height: 0 !important;
            padding: 10px 14px !important;
            border: 1px solid var(--dcuf-view-border) !important;
            border-radius: 16px !important;
            background: var(--dcuf-view-surface-muted) !important;
        }
        body.dc-filter-dark-mode .view_content_wrap .btn_recommend_box .inner_box > .inner {
            background: var(--dcuf-view-surface-muted) !important;
            border-color: var(--dcuf-view-border) !important;
        }
        .view_content_wrap .btn_recommend_box .up_num,
        .view_content_wrap .btn_recommend_box .down_num {
            color: var(--dcuf-view-fg) !important;
        }
        .view_content_wrap .btn_recommend_box .recom_bottom_box button,
        .view_content_wrap .btn_recommend_box .recom_bottom_box a {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            min-height: 34px !important;
            padding: 0 12px !important;
            border: 1px solid var(--dcuf-view-border-strong) !important;
            border-radius: 999px !important;
            background: transparent !important;
            color: var(--dcuf-view-fg-sub) !important;
            white-space: nowrap !important;
        }
        .view_content_wrap .img_bottom_box,
        .view_content_wrap .appending_file_box {
            margin-top: 16px !important;
            padding-top: 14px !important;
            border-top: 1px solid var(--dcuf-view-border) !important;
        }
        #focus_cmt,
        div[id^="comment_wrap_"] {
            margin-top: 14px !important;
        }
        .comment_box {
            border: 1px solid var(--dcuf-view-border) !important;
            border-radius: 18px !important;
            background: var(--dcuf-view-surface) !important;
            box-shadow: var(--dcuf-view-shadow-soft) !important;
            overflow: hidden !important;
        }
        .comment_box .cmt_list,
        .comment_box .reply_list {
            margin: 0 !important;
        }
        .comment_box .cmt_list > li,
        .comment_box .reply_list > li {
            padding: 12px 16px !important;
            border-top: 1px solid var(--dcuf-view-border-strong) !important;
            background: transparent !important;
        }
        .comment_box .cmt_list > li:first-child {
            border-top: none !important;
        }
        .comment_box .reply.show {
            margin-top: 8px !important;
            padding-top: 8px !important;
            border-top: 1px solid var(--dcuf-view-border) !important;
        }
        .comment_box .reply_box {
            margin-left: 18px !important;
            border: 1px solid var(--dcuf-view-border) !important;
            border-radius: 14px !important;
            background: var(--dcuf-view-surface-muted) !important;
            overflow: hidden !important;
        }
        .comment_box .cmt_info,
        .comment_box .reply_info {
            display: block !important;
        }
        .comment_box .cmt_nickbox {
            display: inline-flex !important;
            align-items: center !important;
            min-width: 0 !important;
            background: transparent !important;
        }
        .comment_box .cmt_info > .fr,
        .comment_box .reply_info > .fr {
            float: right !important;
            display: block !important;
            margin: 0 !important;
            background: transparent !important;
        }
        .comment_box .cmt_txtbox {
            clear: both !important;
            width: auto !important;
            margin: 0 !important;
            padding-top: 6px !important;
        }
        .comment_box .reply_box .cmt_txtbox {
            padding-top: 5px !important;
        }
        .comment_box .nickname,
        .comment_box .nickname em {
            background: transparent !important;
            color: var(--dcuf-view-fg) !important;
            font-size: 13px !important;
            font-weight: 800 !important;
        }
        .comment_box .nickname .ip,
        .comment_box .date_time,
        .comment_box .reply_num,
        .comment_box .txt_del {
            background: transparent !important;
            color: var(--dcuf-view-fg-sub) !important;
            font-size: 12px !important;
        }
        .comment_box .usertxt {
            color: var(--dcuf-view-fg) !important;
            font-size: 24px !important;
            line-height: 1.5 !important;
            white-space: pre-wrap !important;
            word-break: normal !important;
            overflow-wrap: anywhere !important;
            max-width: none !important;
            overflow: visible !important;
            text-overflow: clip !important;
        }
        .comment_box .reply_box .usertxt {
            font-size: 24px !important;
        }
        .comment_box .cmt_txtbox img {
            max-width: 100% !important;
            border-radius: 12px !important;
        }
        .cmt_write_box {
            margin-top: 14px !important;
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: flex-start !important;
            gap: 12px !important;
            padding: 16px !important;
            border: 1px solid var(--dcuf-view-border) !important;
            border-radius: 18px !important;
            background: var(--dcuf-view-surface) !important;
            box-shadow: var(--dcuf-view-shadow-soft) !important;
        }
        .cmt_write_box > .fl {
            flex: 0 0 172px !important;
            min-width: 150px !important;
            background: transparent !important;
        }
        .cmt_write_box .user_info_input {
            margin-bottom: 8px !important;
        }
        .cmt_write_box .cmt_txt_cont {
            flex: 1 1 420px !important;
            min-width: 280px !important;
            display: flex !important;
            flex-direction: column !important;
            padding: 0 !important;
            border: 1px solid var(--dcuf-view-border) !important;
            border-radius: 14px !important;
            background: var(--dcuf-view-surface-muted) !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
        }
        .cmt_write_box .user_info_input input {
            min-height: 40px !important;
            padding: 0 12px !important;
            border: 1px solid var(--dcuf-view-border-strong) !important;
            border-radius: 12px !important;
            background: var(--dcuf-view-surface-muted) !important;
            color: var(--dcuf-view-fg) !important;
            box-shadow: none !important;
        }
        .cmt_write_box .cmt_write {
            min-height: 0 !important;
            padding: 12px 14px 0 !important;
        }
        .cmt_write_box .cmt_textarea_label {
            display: block !important;
            color: var(--dcuf-view-fg-sub) !important;
            line-height: 1.55 !important;
        }
        .cmt_write_box textarea {
            min-height: 104px !important;
            padding: 10px 0 14px !important;
            border: none !important;
            border-radius: 0 !important;
            background: transparent !important;
            color: var(--dcuf-view-fg) !important;
            resize: vertical !important;
            box-shadow: none !important;
        }
        .cmt_write_box .cmt_cont_bottm {
            width: 100% !important;
            margin-top: 0 !important;
            padding: 10px 14px 12px !important;
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 10px !important;
            border-top: 1px solid var(--dcuf-view-border) !important;
            box-sizing: border-box !important;
        }
        .cmt_write_box .cmt_btn_bot {
            margin-left: auto !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
        }
                .cmt_write_box .cmt_btn_bot > button,
        .cmt_write_box .cmt_btn_bot > a,
        .cmt_write_box .cmt_btn_bot > input[type="submit"],
        .cmt_write_box .cmt_btn_bot > input[type="button"] {
            min-height: 38px !important;
            padding: 0 16px !important;
            border-radius: 12px !important;
        }
        .bottom_paging_box,
        .view_bottom,
        #bottom_listwrap {
            margin-top: 18px !important;
        }
        .view_content_wrap .recommend_kapcode {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 290px !important;
            min-width: 290px !important;
            max-width: 290px !important;
            margin: 14px auto 10px !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            text-align: left !important;
            overflow: visible !important;
        }
        .view_content_wrap .recommend_kapcode .kap_codeimg {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex: 0 0 140px !important;
            width: 140px !important;
            height: 31px !important;
            min-height: 31px !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 1px solid var(--dcuf-view-border-strong) !important;
            border-right: 0 !important;
            border-radius: 0 !important;
            background: #fff !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
        }
        .view_content_wrap .recommend_kapcode .kcaptcha {
            display: block !important;
            width: 140px !important;
            height: 31px !important;
            margin: 0 !important;
            vertical-align: middle !important;
        }
        .view_content_wrap .recommend_kapcode .recom_input_kapcode {
            display: block !important;
            flex: 0 0 150px !important;
            width: 150px !important;
            min-width: 150px !important;
            max-width: 150px !important;
            height: 31px !important;
            min-height: 31px !important;
            margin: 0 !important;
            padding: 0 10px !important;
            border: 1px solid var(--dcuf-view-border-strong) !important;
            border-radius: 0 !important;
            background: #fff !important;
            color: var(--dcuf-view-fg-sub) !important;
            box-sizing: border-box !important;
            opacity: 1 !important;
            line-height: 29px !important;
        }
        .comment_box .cmt_list > li,
        .comment_box .reply_list > li {
            position: relative !important;
            padding: 14px 16px !important;
            border-top: 1px solid var(--dcuf-view-border-strong) !important;
        }
        .comment_box .cmt_info,
        .comment_box .reply_info {
            overflow: hidden !important;
        }
        .comment_box .cmt_info > .fr,
        .comment_box .reply_info > .fr {
            float: right !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 8px !important;
            margin-left: 10px !important;
        }
        .comment_box .cmt_txtbox,
        .comment_box .reply_box .cmt_txtbox {
            padding-top: 8px !important;
        }
        .comment_box .reply.show {
            margin-top: 10px !important;
            padding-top: 10px !important;
            border-top: 1px dashed var(--dcuf-view-border-strong) !important;
        }
        .comment_box .reply_box {
            margin: 10px 0 0 16px !important;
            padding-left: 12px !important;
            border: none !important;
            border-left: 3px solid var(--dcuf-view-border-strong) !important;
            border-radius: 0 14px 14px 0 !important;
            background: var(--dcuf-view-surface-muted) !important;
            overflow: hidden !important;
        }
        .comment_box .reply_list > li {
            padding: 12px 14px !important;
            border-top: 1px solid var(--dcuf-view-border) !important;
        }
        .comment_box .reply_list > li:first-child {
            border-top: none !important;
        }
        .cmt_write_box .cmt_write {
            min-height: 118px !important;
        }
        .cmt_write_box textarea {
            width: 100% !important;
            min-height: 96px !important;
        }
        .cmt_write_box .cmt_cont_bottm {
            margin-top: 0 !important;
            padding: 12px 14px !important;
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            gap: 10px !important;
            border-top: 1px solid var(--dcuf-view-border) !important;
            background: rgba(255, 255, 255, 0.35) !important;
        }
        body.dc-filter-dark-mode .cmt_write_box .cmt_cont_bottm {
            background: rgba(24, 33, 45, 0.45) !important;
        }
        .cmt_write_box .cmt_cont_bottm > .fr {
            float: none !important;
            margin-left: auto !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: flex-end !important;
            gap: 8px !important;
            width: auto !important;
        }
        .cmt_write_box .cmt_cont_bottm > .fr > button {
            min-width: 94px !important;
            min-height: 38px !important;
            padding: 0 16px !important;
            border-radius: 12px !important;
            white-space: nowrap !important;
        }
        .view_content_wrap .recommend_kapcode {
            justify-content: center !important;
            text-align: left !important;
        }
        .view_content_wrap .recommend_kapcode .recom_input_kapcode {
            display: block !important;
            flex: 0 0 150px !important;
            width: 150px !important;
            min-width: 150px !important;
            max-width: 150px !important;
            opacity: 1 !important;
        }
        .view_content_wrap .btn_recommend_box {
            padding-bottom: 28px !important;
        }
        .view_content_wrap .btn_recommend_box .inner_box {
            gap: 10px !important;
        }
        .view_content_wrap .btn_recommend_box .inner_box > .inner {
            display: grid !important;
            align-items: center !important;
            justify-content: center !important;
            column-gap: 10px !important;
            row-gap: 0 !important;
            flex: 0 1 168px !important;
            padding: 8px 10px !important;
            border-radius: 14px !important;
        }
        .view_content_wrap .btn_recommend_box .inner_box > .inner:first-child {
            grid-template-columns: 34px auto !important;
        }
        .view_content_wrap .btn_recommend_box .inner_box > .inner:last-child {
            grid-template-columns: auto 34px !important;
        }
        .view_content_wrap .btn_recommend_box .up_num_box,
        .view_content_wrap .btn_recommend_box .down_num_box {
            display: inline-flex !important;
            width: 34px !important;
            min-width: 34px !important;
            align-items: center !important;
            justify-content: center !important;
            justify-self: center !important;
        }
        .view_content_wrap .btn_recommend_box .up_num_box {
            flex-direction: column !important;
            gap: 1px !important;
            align-self: center !important;
        }
        .view_content_wrap .btn_recommend_box .down_num_box {
            gap: 0 !important;
            align-self: center !important;
        }
        .view_content_wrap .btn_recommend_box .up_num,
        .view_content_wrap .btn_recommend_box .down_num {
            width: 100% !important;
            text-align: center !important;
            position: static !important;
            left: auto !important;
        }
        .view_content_wrap .btn_recommend_box .btn_recom_up,
        .view_content_wrap .btn_recommend_box .btn_recom_down {
            flex: 0 0 auto !important;
            justify-self: center !important;
            margin: 0 !important;
        }
        .view_content_wrap .btn_recommend_box .font_blue.smallnum {
            display: inline !important;
            margin-left: 2px !important;
            padding: 0 !important;
            background: transparent !important;
            color: var(--dcuf-view-fg) !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            font-size: 12px !important;
            font-weight: 700 !important;
            line-height: 1 !important;
        }
        .view_content_wrap .btn_recommend_box .sup_num {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 1px !important;
            line-height: 1 !important;
        }
        .view_content_wrap .btn_recommend_box .writer_nikcon {
            margin-right: 0 !important;
        }
        .view_content_wrap .btn_recommend_box .writer_nikcon img {
            width: 12px !important;
            height: 11px !important;
        }
        .view_content_wrap .btn_recommend_box .recom_bottom_box {
            margin-top: 14px !important;
            margin-bottom: 6px !important;
            padding: 14px 0 10px !important;
        }
        .view_comment.image_comment,
        .view_comment.image_comment .comment_wrap,
        .view_comment.image_comment .comment_box.img_comment_box {
            width: auto !important;
            max-width: 100% !important;
            margin-left: auto !important;
            margin-right: auto !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        .view_comment.image_comment .comment_wrap,
        .view_comment.image_comment .comment_box.img_comment_box {
            display: block !important;
            border: 0 !important;
            border-radius: 0 !important;
            overflow: visible !important;
        }
        .view_comment.image_comment .comment_box.img_comment_box .cmt_list {
            width: auto !important;
            max-width: 100% !important;
            margin: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
        }
        .view_comment.image_comment .comment_box.img_comment_box .cmt_list > li {
            width: auto !important;
            max-width: 100% !important;
            padding: 12px 14px !important;
            border: 1px solid #d8e1ed !important;
            border-radius: 12px !important;
            background: rgba(247, 249, 252, 0.96) !important;
            box-sizing: border-box !important;
        }
        .view_comment.image_comment .comment_box.img_comment_box .cmt_list > li + li {
            padding-top: 11px !important;
            border-top: 1px solid #d8e1ed !important;
            margin-top: 0 !important;
        }
        .view_comment.image_comment .comment_box.img_comment_box .cmt_info,
        .view_comment.image_comment .comment_box.img_comment_box .cmt_txtbox,
        .view_comment.image_comment .comment_box.img_comment_box .clear.cmt_txtbox,
        .view_comment.image_comment .comment_box.img_comment_box .cmt_nickbox,
        .view_comment.image_comment .comment_box.img_comment_box .fr.clear {
            border: 0 !important;
            border-top: 0 !important;
            box-shadow: none !important;
            background: transparent !important;
        }
        .view_comment.image_comment .comment_box.img_comment_box .cmt_txtbox {
            padding-top: 6px !important;
        }
        .view_comment.image_comment .comment_box.img_comment_box .cmt_nickbox,
        .view_comment.image_comment .comment_box.img_comment_box .gall_writer,
        .view_comment.image_comment .comment_box.img_comment_box .nickname,
        .view_comment.image_comment .comment_box.img_comment_box .nickname em,
        .view_comment.image_comment .comment_box.img_comment_box .ip,
        .view_comment.image_comment .comment_box.img_comment_box .writer_nikcon {
            min-width: 0 !important;
            width: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            line-height: 1.3 !important;
        }
        .view_comment.image_comment .comment_box.img_comment_box .cmt_nickbox::before,
        .view_comment.image_comment .comment_box.img_comment_box .cmt_nickbox::after,
        .view_comment.image_comment .comment_box.img_comment_box .gall_writer::before,
        .view_comment.image_comment .comment_box.img_comment_box .gall_writer::after,
        .view_comment.image_comment .comment_box.img_comment_box .nickname::before,
        .view_comment.image_comment .comment_box.img_comment_box .nickname::after {
            content: none !important;
            display: none !important;
        }
        .view_comment.image_comment .comment_box.img_comment_box .clear {
            display: block !important;
            border: 0 !important;
            border-top: 0 !important;
            background-image: none !important;
            box-shadow: none !important;
        }
        .view_comment.image_comment .comment_box.img_comment_box .clear::before,
        .view_comment.image_comment .comment_box.img_comment_box .clear::after,
        .view_comment.image_comment .comment_box.img_comment_box .cmt_info::before,
        .view_comment.image_comment .comment_box.img_comment_box .cmt_info::after {
            content: none !important;
            border-top: 0 !important;
            background-image: none !important;
            box-shadow: none !important;
        }
        .comment_box {
            border-color: #cfd8e6 !important;
            box-shadow: none !important;
        }
        .comment_box .cmt_list > li,
        .comment_box .reply_list > li {
            background: transparent !important;
        }
        .comment_box .cmt_list > li + li {
            border-top: 1px solid #d5dde9 !important;
        }
        .comment_box .cmt_info,
        .comment_box .reply_info {
            min-height: 20px !important;
        }
        .comment_box .cmt_txtbox {
            padding-top: 8px !important;
        }
        .comment_box .reply.show {
            margin-top: 10px !important;
            padding-top: 10px !important;
            border-top: 1px solid #dbe3ef !important;
        }
        .comment_box .reply_box {
            margin: 8px 0 0 14px !important;
            padding-left: 0 !important;
            border: 0 !important;
            border-left: 2px solid #ccd7ea !important;
            border-radius: 0 !important;
            background: rgba(240, 244, 250, 0.72) !important;
            box-shadow: none !important;
        }
        .comment_box .reply_list > li {
            padding: 10px 12px !important;
            border-top: 1px solid #dde5f0 !important;
        }
        .comment_box .reply_list > li:first-child {
            border-top: none !important;
        }
        .comment_box .reply_box .cmt_txtbox {
            padding-top: 6px !important;
        }
        body.dc-filter-dark-mode .comment_box {
            border-color: rgba(143, 163, 192, 0.28) !important;
        }
        body.dc-filter-dark-mode .comment_box .cmt_list > li + li {
            border-top-color: rgba(143, 163, 192, 0.24) !important;
        }
        body.dc-filter-dark-mode .comment_box .reply.show {
            border-top-color: rgba(143, 163, 192, 0.2) !important;
        }
        body.dc-filter-dark-mode .comment_box .reply_box {
            border-left-color: rgba(120, 154, 214, 0.4) !important;
            background: rgba(31, 44, 63, 0.45) !important;
        }
        body.dc-filter-dark-mode .comment_box .reply_list > li {
            border-top-color: rgba(143, 163, 192, 0.18) !important;
        }
        .view_comment.image_comment .cmt_write_box {
            margin-top: 11px !important;
            display: grid !important;
            grid-template-columns: 124px minmax(0, 1fr) auto !important;
            gap: 10px !important;
            padding: 12px !important;
            border-radius: 16px !important;
            box-shadow: none !important;
            align-items: stretch !important;
        }
        .view_comment.image_comment .cmt_write_box > .fl {
            grid-column: 1 !important;
            min-width: 0 !important;
            width: 124px !important;
            flex: none !important;
            background: transparent !important;
            border: 0 !important;
            box-shadow: none !important;
        }
        .view_comment.image_comment .cmt_write_box > .fl table,
        .view_comment.image_comment .cmt_write_box > .fl tbody,
        .view_comment.image_comment .cmt_write_box > .fl tr,
        .view_comment.image_comment .cmt_write_box > .fl td {
            width: 100% !important;
            background: transparent !important;
            border: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
        }
        .view_comment.image_comment .cmt_write_box .user_info_input {
            display: block !important;
            margin-bottom: 4px !important;
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            padding: 0 !important;
            overflow: visible !important;
        }
        .view_comment.image_comment .cmt_write_box .user_info_input input {
            display: block !important;
            width: 100% !important;
            min-height: 36px !important;
            padding: 0 12px !important;
            border-radius: 10px !important;
            background: #fff !important;
            box-sizing: border-box !important;
        }
        .view_comment.image_comment .cmt_write_box .cmt_txt_cont {
            grid-column: 2 / span 2 !important;
            min-width: 0 !important;
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) auto !important;
            align-items: stretch !important;
            border-radius: 12px !important;
            background: var(--dcuf-view-surface-muted) !important;
            overflow: hidden !important;
        }
        .view_comment.image_comment .cmt_write_box .cmt_write {
            grid-column: 1 !important;
            min-height: 0 !important;
            padding: 10px 12px !important;
            display: flex !important;
        }
        .view_comment.image_comment .cmt_write_box .cmt_textarea_label {
            display: none !important;
        }
        .view_comment.image_comment .cmt_write_box textarea {
            display: block !important;
            width: 100% !important;
            min-height: 72px !important;
            height: 100% !important;
            padding: 0 !important;
            resize: none !important;
            box-sizing: border-box !important;
        }
        .view_comment.image_comment .cmt_write_box .cmt_cont_bottm {
            grid-column: 2 !important;
            width: auto !important;
            margin-top: 0 !important;
            padding: 10px !important;
            border: 0 !important;
            border-left: 1px solid var(--dcuf-view-border) !important;
            background: transparent !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            align-self: stretch !important;
        }
        .view_comment.image_comment .cmt_write_box .cmt_cont_bottm > .fr {
            margin-left: 0 !important;
            width: auto !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            height: auto !important;
        }
        .view_comment.image_comment .cmt_write_box .cmt_cont_bottm > .fr > button {
            min-width: 84px !important;
            min-height: 56px !important;
            padding: 0 18px !important;
            border-radius: 12px !important;
            white-space: nowrap !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .cmt_write_box .user_info_input input {
            background: rgba(24, 33, 45, 0.92) !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box .cmt_list > li {
            background: rgba(24, 33, 45, 0.86) !important;
            border-color: rgba(120, 144, 175, 0.28) !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box .cmt_list > li + li {
            border-top-color: rgba(120, 144, 175, 0.28) !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box .gall_writer,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box .nickname,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box .nickname em,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box .usertxt {
            color: #dbe6f5 !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box .ip,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box .date_time,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box .txt_del {
            color: #9fb0c8 !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .cmt_write_box {
            background: rgba(19, 27, 38, 0.92) !important;
            border-color: rgba(120, 144, 175, 0.24) !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .cmt_write_box .cmt_txt_cont {
            background: rgba(27, 37, 51, 0.92) !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .cmt_write_box textarea {
            color: #dbe6f5 !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .cmt_write_box .cmt_cont_bottm {
            border-left-color: rgba(120, 144, 175, 0.24) !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .cmt_write_box .cmt_cont_bottm > .fr > button {
            background: #2b4f9b !important;
            border-color: #3a62b8 !important;
            color: #eef4ff !important;
            box-shadow: none !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .comment_top,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_top .num_box,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_top .fr,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_top .fr button,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_top .fr .img_cmt_label {
            color: #dbe6f5 !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .comment_top .num_box,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_top .num_box * {
            color: #dbe6f5 !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .comment_top .num_box .font_red {
            color: #7db0ff !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .comment_top .fr button,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_top .fr .img_cmt_label,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_top .fr em,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_top .fr span {
            color: #dbe6f5 !important;
            opacity: 1 !important;
        }
        .gall_comment .comment_box {
            border: 1px solid #d7dfec !important;
            border-radius: 16px !important;
            background: var(--dcuf-view-surface) !important;
            box-shadow: none !important;
        }
        .gall_comment .comment_box .cmt_list > li {
            padding: 14px 18px !important;
            border-top: 1px solid #dde4ef !important;
            background: transparent !important;
        }
        .gall_comment .comment_box .cmt_info,
        .gall_comment .comment_box .reply_info {
            display: flex !important;
            align-items: flex-start !important;
            justify-content: space-between !important;
            gap: 12px !important;
            min-height: 0 !important;
        }
        .gall_comment .comment_box .cmt_nickbox {
            flex: 1 1 auto !important;
            min-width: 0 !important;
        }
        .gall_comment .comment_box .cmt_info > .fr,
        .gall_comment .comment_box .reply_info > .fr {
            float: none !important;
            margin: 0 0 0 auto !important;
            display: inline-flex !important;
            align-items: center !important;
            white-space: nowrap !important;
        }
        .gall_comment .comment_box .cmt_txtbox {
            clear: none !important;
            padding-top: 6px !important;
        }
        .gall_comment .comment_box .reply.show {
            margin-top: 8px !important;
            padding-top: 0 !important;
            border-top: 0 !important;
        }
        .gall_comment .comment_box .reply_box {
            margin: 8px 0 0 16px !important;
            padding-left: 12px !important;
            border: 0 !important;
            border-left: 2px solid #d6dfec !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        .gall_comment .comment_box .reply_list > li {
            padding: 10px 0 !important;
            border-top: 1px solid #e5ebf3 !important;
            background: transparent !important;
        }
        .gall_comment .cmt_write_box {
            margin-top: 16px !important;
            display: grid !important;
            grid-template-columns: 150px minmax(0, 1fr) !important;
            gap: 12px !important;
            padding: 14px !important;
            border: 1px solid #d7dfec !important;
            border-radius: 16px !important;
            background: var(--dcuf-view-surface) !important;
            box-shadow: none !important;
            align-items: stretch !important;
        }
        .gall_comment .cmt_write_box > .fl {
            grid-column: 1 !important;
            min-width: 0 !important;
            width: 150px !important;
            flex: none !important;
            background: transparent !important;
            border: 0 !important;
            box-shadow: none !important;
        }
        .gall_comment .cmt_write_box > .fl table,
        .gall_comment .cmt_write_box > .fl tbody,
        .gall_comment .cmt_write_box > .fl tr,
        .gall_comment .cmt_write_box > .fl td {
            width: 100% !important;
            background: transparent !important;
            border: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
        }
        .gall_comment .cmt_write_box .user_info_input {
            margin-bottom: 6px !important;
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            padding: 0 !important;
        }
        .gall_comment .cmt_write_box .user_info_input input {
            display: block !important;
            width: 100% !important;
            min-height: 40px !important;
            padding: 0 12px !important;
            border: 1px solid #d7dfec !important;
            border-radius: 10px !important;
            background: #fff !important;
            box-sizing: border-box !important;
        }
        .gall_comment .cmt_write_box .cmt_txt_cont {
            grid-column: 2 !important;
            min-width: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            padding: 0 !important;
            border: 1px solid #d7dfec !important;
            border-radius: 14px !important;
            background: #fff !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
        }
        .gall_comment .cmt_write_box .cmt_write {
            min-height: 0 !important;
            padding: 0 !important;
        }
        .gall_comment .cmt_write_box .cmt_textarea_label {
            display: none !important;
        }
        .gall_comment .cmt_write_box textarea {
            display: block !important;
            width: 100% !important;
            min-height: 124px !important;
            padding: 14px 16px !important;
            border: 0 !important;
            background: transparent !important;
            box-sizing: border-box !important;
            resize: vertical !important;
        }
        .gall_comment .cmt_write_box .cmt_cont_bottm {
            width: 100% !important;
            margin-top: 0 !important;
            padding: 10px 14px !important;
            border-top: 1px solid #e2e8f1 !important;
            background: rgba(246, 248, 251, 0.96) !important;
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 10px !important;
        }
        .gall_comment .cmt_write_box .cmt_cont_bottm > .fr {
            margin-left: auto !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 8px !important;
        }
        .gall_comment .cmt_write_box .cmt_cont_bottm > .fr > button {
            min-width: 98px !important;
            min-height: 40px !important;
            border-radius: 10px !important;
        }
        body.dc-filter-dark-mode .gall_comment .comment_box {
            border-color: rgba(120, 144, 175, 0.24) !important;
            background: rgba(17, 24, 34, 0.92) !important;
        }
        body.dc-filter-dark-mode .gall_comment .comment_box .cmt_list > li {
            border-top-color: rgba(120, 144, 175, 0.2) !important;
        }
        body.dc-filter-dark-mode .gall_comment .comment_box .reply_box {
            border-left-color: rgba(120, 144, 175, 0.32) !important;
        }
        body.dc-filter-dark-mode .gall_comment .cmt_write_box {
            border-color: rgba(120, 144, 175, 0.24) !important;
            background: rgba(17, 24, 34, 0.92) !important;
        }
        body.dc-filter-dark-mode .gall_comment .cmt_write_box .user_info_input input,
        body.dc-filter-dark-mode .gall_comment .cmt_write_box .cmt_txt_cont {
            border-color: rgba(120, 144, 175, 0.24) !important;
            background: rgba(24, 33, 45, 0.94) !important;
        }
        body.dc-filter-dark-mode .gall_comment .cmt_write_box textarea {
            color: #dbe6f5 !important;
        }
        body.dc-filter-dark-mode .gall_comment .cmt_write_box .cmt_cont_bottm {
            border-top-color: rgba(120, 144, 175, 0.2) !important;
            background: rgba(20, 28, 39, 0.84) !important;
        }
        div[id^="comment_wrap_"] .comment_count {
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            gap: 10px 12px !important;
            margin: 0 0 14px !important;
            padding: 0 2px 6px !important;
            border-bottom: 0 !important;
            background: transparent !important;
        }
        div[id^="comment_wrap_"] .comment_count .num_box {
            order: 1 !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 3px !important;
            min-width: 0 !important;
            margin: 0 !important;
        }
        div[id^="comment_wrap_"] .comment_count .num_box,
        div[id^="comment_wrap_"] .comment_count .num_box * {
            color: var(--dcuf-view-fg) !important;
            font-size: 15px !important;
            font-weight: 800 !important;
            letter-spacing: -0.02em !important;
        }
        div[id^="comment_wrap_"] .comment_count .num_box .font_red {
            color: #eb5b2f !important;
        }
        div[id^="comment_wrap_"] .comment_count .comment_sort,
        div[id^="comment_wrap_"] .comment_count .comment_sort * {
            color: var(--dcuf-view-fg-sub) !important;
            font-size: 13px !important;
            font-weight: 600 !important;
        }
        div[id^="comment_wrap_"] .comment_count .comment_sort {
            display: inline-flex !important;
            align-items: center !important;
            gap: 10px !important;
            margin: 0 !important;
        }
        div[id^="comment_wrap_"] .comment_count .fr {
            order: 2 !important;
            float: none !important;
            margin-left: auto !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 10px !important;
            white-space: nowrap !important;
            color: var(--dcuf-view-fg-sub) !important;
            font-size: 13px !important;
            font-weight: 600 !important;
        }
        div[id^="comment_wrap_"] .comment_count .fr,
        div[id^="comment_wrap_"] .comment_count .fr button,
        div[id^="comment_wrap_"] .comment_count .fr a,
        div[id^="comment_wrap_"] .comment_count .fr span,
        div[id^="comment_wrap_"] .comment_count .fr em {
            color: inherit !important;
            background: transparent !important;
        }
        div[id^="comment_wrap_"] .comment_box {
            width: auto !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            overflow: visible !important;
        }
        div[id^="comment_wrap_"] .comment_box .cmt_list,
        div[id^="comment_wrap_"] .comment_box .reply_list {
            margin: 0 !important;
            padding: 0 !important;
            list-style: none !important;
        }
        div[id^="comment_wrap_"] .comment_box .cmt_list > li {
            position: relative !important;
            margin: 0 0 12px !important;
            padding: 15px 17px 15px 19px !important;
            border: 0 !important;
            border-top: 0 !important;
            border-radius: 16px !important;
            background: linear-gradient(180deg, #ffffff 0%, #f7f7f8 100%) !important;
            box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.05) !important;
            overflow: visible !important;
            z-index: auto !important;
        }
        div[id^="comment_wrap_"] .comment_box .cmt_list > li:first-child,
        div[id^="comment_wrap_"] .comment_box .cmt_list > li + li {
            border-top: 0 !important;
        }
        div[id^="comment_wrap_"] .comment_box .cmt_list > li::before {
            content: none !important;
            display: none !important;
        }
        div[id^="comment_wrap_"] .comment_box .cmt_list > li.dcuf-parent-comment-filtered > .cmt_info,
        div[id^="comment_wrap_"] .comment_box .cmt_list > li.dcuf-parent-comment-filtered > .cmt_txtbox {
            display: none !important;
        }
        div[id^="comment_wrap_"] .comment_box .cmt_list > li.dcuf-parent-comment-filtered > .reply.show {
            margin-top: 0 !important;
            padding-top: 0 !important;
            border-top: 0 !important;
        }
        div[id^="comment_wrap_"] .comment_box .cmt_list > li:has(> .reply.show):not(:has(> .cmt_info)) {
            margin: -6px 0 12px !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        div[id^="comment_wrap_"] .comment_box .cmt_info,
        div[id^="comment_wrap_"] .comment_box .reply_info {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) auto !important;
            align-items: start !important;
            column-gap: 16px !important;
            row-gap: 7px !important;
            min-height: 0 !important;
        }
        div[id^="comment_wrap_"] .comment_box .cmt_nickbox {
            grid-column: 1 !important;
            grid-row: 1 !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 5px !important;
            min-width: 0 !important;
            padding-left: 13px !important;
            background: transparent !important;
            position: relative !important;
            z-index: 5 !important;
        }
        div[id^="comment_wrap_"] .comment_box .writer_nikcon {
            display: inline-flex !important;
            align-items: center !important;
            line-height: 1 !important;
            margin-left: 1px !important;
            vertical-align: middle !important;
        }
        div[id^="comment_wrap_"] .comment_box .writer_nikcon img,
        div[id^="comment_wrap_"] .comment_box img.gallercon {
            width: auto !important;
            height: 13px !important;
            max-width: none !important;
            object-fit: contain !important;
            vertical-align: middle !important;
        }
        div[id^="comment_wrap_"] .comment_box .gall_writer,
        div[id^="comment_wrap_"] .comment_box .nickname,
        div[id^="comment_wrap_"] .comment_box .nickname em {
            color: var(--dcuf-view-fg) !important;
            font-size: 13px !important;
            font-weight: 800 !important;
            letter-spacing: -0.01em !important;
            background: transparent !important;
        }
        div[id^="comment_wrap_"] .comment_box .nickname.me,
        div[id^="comment_wrap_"] .comment_box .nickname.me em,
        div[id^="comment_wrap_"] .comment_box .gall_writer .nickname.me,
        div[id^="comment_wrap_"] .comment_box .gall_writer .nickname.me em {
            color: #2f6dff !important;
            font-weight: 900 !important;
            background: transparent !important;
        }
        div[id^="comment_wrap_"] .comment_box .ip {
            color: #5a6b82 !important;
            font-size: 12px !important;
            font-weight: 700 !important;
            background: transparent !important;
        }
        div[id^="comment_wrap_"] .comment_box .cmt_info > .fr,
        div[id^="comment_wrap_"] .comment_box .reply_info > .fr {
            grid-column: 2 !important;
            grid-row: 1 !important;
            align-self: start !important;
            justify-self: end !important;
            float: none !important;
            margin: 0 !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 6px !important;
            white-space: nowrap !important;
            color: #72839b !important;
            font-size: 12px !important;
            background: transparent !important;
        }
        div[id^="comment_wrap_"] .comment_box .date_time,
        div[id^="comment_wrap_"] .comment_box .txt_del {
            color: #72839b !important;
            font-size: 12px !important;
            background: transparent !important;
        }
        div[id^="comment_wrap_"] .comment_box .cmt_txtbox {
            grid-column: 1 / -1 !important;
            grid-row: 2 !important;
            clear: none !important;
            width: 100% !important;
            max-width: none !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 0 0 13px !important;
            overflow: visible !important;
        }
        div[id^="comment_wrap_"] .comment_box .usertxt {
            color: var(--dcuf-view-fg) !important;
            font-size: 24px !important;
            line-height: 1.62 !important;
            letter-spacing: -0.01em !important;
            white-space: pre-wrap !important;
            word-break: normal !important;
            overflow-wrap: anywhere !important;
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            overflow: visible !important;
            text-overflow: clip !important;
        }
        div[id^="comment_wrap_"] .comment_box .cmt_mdf_del {
            display: inline-flex !important;
            align-items: center !important;
            gap: 6px !important;
            margin-left: 6px !important;
        }
        div[id^="comment_wrap_"] .comment_box .reply.show {
            margin-top: 10px !important;
            padding-top: 10px !important;
            border-top: 1px solid #e3e9f1 !important;
        }
        div[id^="comment_wrap_"] .comment_box .reply_box {
            margin: 2px 0 0 8px !important;
            padding: 10px 12px 10px 14px !important;
            border: 0 !important;
            border-left: 1px solid #d7dee8 !important;
            border-radius: 12px !important;
            background: linear-gradient(180deg, rgba(247, 249, 252, 0.96) 0%, rgba(243, 246, 250, 0.96) 100%) !important;
            box-shadow: inset 0 0 0 1px rgba(211, 220, 232, 0.76) !important;
            overflow: visible !important;
        }
        div[id^="comment_wrap_"] .comment_box .reply_list > li {
            position: relative !important;
            margin: 0 !important;
            padding: 10px 0 0 0 !important;
            border: 0 !important;
            border-top: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        div[id^="comment_wrap_"] .comment_box .reply_list > li::before,
        div[id^="comment_wrap_"] .comment_box .reply_list > li::after,
        div[id^="comment_wrap_"] .comment_box .reply_list > li .reply_info::before,
        div[id^="comment_wrap_"] .comment_box .reply_list > li .reply_info::after,
        div[id^="comment_wrap_"] .comment_box .reply_list > li .cmt_nickbox::before,
        div[id^="comment_wrap_"] .comment_box .reply_list > li .cmt_nickbox::after,
        div[id^="comment_wrap_"] .comment_box .reply_list > li .gall_writer::before,
        div[id^="comment_wrap_"] .comment_box .reply_list > li .gall_writer::after,
        div[id^="comment_wrap_"] .comment_box .reply_list > li .comment_dccon::before,
        div[id^="comment_wrap_"] .comment_box .reply_list > li .comment_dccon::after,
        div[id^="comment_wrap_"] .comment_box .reply_list > li a.mention::before,
        div[id^="comment_wrap_"] .comment_box .reply_list > li a.mention::after,
        div[id^="comment_wrap_"] .comment_box .reply_list > li a.mention.deco::before,
        div[id^="comment_wrap_"] .comment_box .reply_list > li a.mention.deco::after,
        div[id^="comment_wrap_"] .comment_box .reply_list > li p.usertxt::before,
        div[id^="comment_wrap_"] .comment_box .reply_list > li p.usertxt::after,
        div[id^="comment_wrap_"] .comment_box .reply_list > li p.usertxt.ub-word::before,
        div[id^="comment_wrap_"] .comment_box .reply_list > li p.usertxt.ub-word::after {
            content: none !important;
            display: none !important;
        }
        div[id^="comment_wrap_"] .comment_box .reply_list > li .cmt_nickbox {
            padding-left: 24px !important;
            position: relative !important;
        }

        div[id^="comment_wrap_"] .comment_box .reply_list > li .cmt_txtbox {
            padding-left: 24px !important;
            position: relative !important;
        }
        div[id^="comment_wrap_"] .comment_box .reply_list > li .cmt_txtbox::before {
            content: none !important;
            display: none !important;
        }
        div[id^="comment_wrap_"] .comment_box .reply_list > li .cmt_nickbox::before {
            content: "\\3134" !important;
            position: absolute !important;
            left: 4px !important;
            top: 1px !important;
            display: block !important;
            font-size: 13px !important;
            line-height: 1 !important;
            color: #78899f !important;
            font-weight: 700 !important;
        }
        div[id^="comment_wrap_"] .comment_box .reply_list > li:first-child {
            padding-top: 0 !important;
            border-top: 0 !important;
        }
        div[id^="comment_wrap_"] .comment_box .reply_list > li + li {
            margin-top: 8px !important;
            padding-top: 8px !important;
            border-top: 1px solid #e1e8f0 !important;
        }
        div[id^="comment_wrap_"] .comment_box .reply_list > li:last-child {
            margin-bottom: 0 !important;
        }


        #focus_cmt > .cmt_write_box {
            margin-top: 16px !important;
            display: grid !important;
            grid-template-columns: 150px minmax(0, 1fr) !important;
            gap: 12px !important;
            padding: 14px !important;
            border: 1px solid #d9e1ed !important;
            border-radius: 16px !important;
            background: var(--dcuf-view-surface) !important;
            box-shadow: none !important;
            align-items: stretch !important;
        }
        #focus_cmt > .cmt_write_box > .fl {
            grid-column: 1 !important;
            min-width: 0 !important;
            width: 150px !important;
            flex: none !important;
            display: flex !important;
            flex-direction: column !important;
            align-self: start !important;
            gap: 8px !important;
            background: transparent !important;
            border: 0 !important;
            box-shadow: none !important;
        }
        #focus_cmt > .cmt_write_box > .fl table,
        #focus_cmt > .cmt_write_box > .fl tbody,
        #focus_cmt > .cmt_write_box > .fl tr,
        #focus_cmt > .cmt_write_box > .fl td {
            width: 100% !important;
            background: transparent !important;
            border: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
        }
        #focus_cmt > .cmt_write_box > .fl .usertxt {
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
            margin: 0 !important;
        }
        #focus_cmt > .cmt_write_box > .fl .usertxt > * {
            margin: 0 !important;
        }
        #focus_cmt > .cmt_write_box .user_info_input {
            position: relative !important;
            overflow: hidden !important;
            margin: 0 !important;
            border: 0 !important;
            border-radius: 10px !important;
            background: transparent !important;
            box-shadow: none !important;
            padding: 0 !important;
        }
        #focus_cmt > .cmt_write_box .user_info_input::before,
        #focus_cmt > .cmt_write_box .user_info_input::after,
        #focus_cmt > .cmt_write_box .user_info_input *::before,
        #focus_cmt > .cmt_write_box .user_info_input *::after {
            content: none !important;
        }
        #focus_cmt > .cmt_write_box .user_info_input input:not([readonly]):not([type="hidden"]) {
            position: relative !important;
            z-index: 1 !important;
            display: block !important;
            width: 100% !important;
            height: 32px !important;
            min-height: 32px !important;
            margin: 0 !important;
            padding: 0 12px !important;
            border: 1px solid #d9e1ed !important;
            border-radius: 10px !important;
            background: #fff !important;
            box-sizing: border-box !important;
            line-height: 32px !important;
        }
        #focus_cmt > .cmt_write_box .cmt_txt_cont {
            grid-column: 2 !important;
            min-width: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            padding: 0 !important;
            border: 1px solid #d9e1ed !important;
            border-radius: 14px !important;
            background: #fff !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
        }
        #focus_cmt > .cmt_write_box .cmt_write {
            display: flex !important;
            flex-direction: column !important;
            min-height: 0 !important;
            padding: 0 !important;
            position: relative !important;
            background: #fff !important;
        }
        #focus_cmt > .cmt_write_box .cmt_textarea_label,
        #focus_cmt > .cmt_write_box .txt-placeholder {
            display: none !important;
        }
        #focus_cmt > .cmt_write_box textarea {
            display: block !important;
            width: 100% !important;
            min-height: 132px !important;
            padding: 14px 16px !important;
            border: 0 !important;
            background: #fff !important;
            box-sizing: border-box !important;
            resize: vertical !important;
            position: relative !important;
            z-index: 2 !important;
        }
        #focus_cmt > .cmt_write_box .cmt_cont_bottm {
            width: 100% !important;
            margin-top: 0 !important;
            padding: 10px 14px !important;
            border-top: 1px solid #e4ebf3 !important;
            background: #f7f9fc !important;
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 10px !important;
        }
        #focus_cmt > .cmt_write_box .cmt_cont_bottm > .fr {
            margin-left: auto !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 8px !important;
        }
        #focus_cmt > .cmt_write_box .cmt_cont_bottm > .fr > button {
            min-width: 98px !important;
            min-height: 40px !important;
            border-radius: 10px !important;
        }
        #focus_cmt .reply_box .reply_list > li[id^="reply_li_empty"] {
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        #focus_cmt .reply_box .cmt_write_box.small {
            margin-top: 8px !important;
            display: grid !important;
            grid-template-columns: 138px minmax(0, 1fr) !important;
            gap: 10px !important;
            padding: 10px !important;
            border: 1px solid #d9e1ed !important;
            border-radius: 12px !important;
            background: #fff !important;
            box-shadow: none !important;
            align-items: start !important;
        }
        #focus_cmt .reply_box .cmt_write_box.small > .fl {
            grid-column: 1 !important;
            width: 138px !important;
            min-width: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 6px !important;
            background: transparent !important;
            border: 0 !important;
            box-shadow: none !important;
        }
        #focus_cmt .reply_box .cmt_write_box.small:not(:has(.kap_codeimg)) > .fl {
            align-self: start !important;
        }
        #focus_cmt .reply_box .cmt_write_box.small:not(:has(.kap_codeimg)) textarea {
            min-height: 72px !important;
        }
        #focus_cmt .reply_box .cmt_write_box.small > .fl table,
        #focus_cmt .reply_box .cmt_write_box.small > .fl tbody,
        #focus_cmt .reply_box .cmt_write_box.small > .fl tr,
        #focus_cmt .reply_box .cmt_write_box.small > .fl td {
            width: 100% !important;
            padding: 0 !important;
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        #focus_cmt .reply_box .cmt_write_box.small .user_info_input {
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        #focus_cmt .reply_box .cmt_write_box.small .user_info_input input:not([readonly]):not([type="hidden"]) {
            height: 32px !important;
            min-height: 32px !important;
            margin: 0 !important;
            padding: 0 10px !important;
            border: 1px solid #d9e1ed !important;
            border-radius: 10px !important;
            background: #fff !important;
            box-sizing: border-box !important;
        }
        #focus_cmt > .cmt_write_box .user_info_input input[readonly],
        #focus_cmt .reply_box .cmt_write_box.small .user_info_input input[readonly],
        #focus_cmt > .cmt_write_box .user_info_input input[id^="gall_nick_name_"],
        #focus_cmt .reply_box .cmt_write_box.small .user_info_input input[id^="gall_nick_name_"] {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
        }
        #focus_cmt .reply_box .cmt_write_box.small .cmt_txt_cont {
            grid-column: 2 !important;
            min-width: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            border: 1px solid #d9e1ed !important;
            border-radius: 12px !important;
            background: #fff !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
        }
        #focus_cmt .reply_box .cmt_write_box.small .cmt_write {
            min-height: 0 !important;
            padding: 0 !important;
            background: #fff !important;
        }
        #focus_cmt .reply_box .cmt_write_box.small .cmt_textarea_label,
        #focus_cmt .reply_box .cmt_write_box.small .txt-placeholder {
            display: none !important;
        }
        #focus_cmt .reply_box .cmt_write_box.small textarea {
            width: 100% !important;
            min-height: 84px !important;
            padding: 10px 12px !important;
            border: 0 !important;
            background: #fff !important;
            box-sizing: border-box !important;
            resize: vertical !important;
        }
        #focus_cmt .reply_box .cmt_write_box.small .cmt_cont_bottm {
            width: 100% !important;
            margin-top: 0 !important;
            padding: 8px 10px !important;
            border-top: 1px solid #e4ebf3 !important;
            background: #f7f9fc !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
        }
        #focus_cmt .reply_box .cmt_write_box.small .cmt_cont_bottm > .fr {
            margin-left: auto !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 8px !important;
        }
        #focus_cmt .reply_box .cmt_write_box.small .cmt_cont_bottm > .fr > button {
            min-width: 92px !important;
            min-height: 36px !important;
            border-radius: 10px !important;
        }
        body.dc-filter-dark-mode #focus_cmt .reply_box .cmt_write_box.small {
            border-color: rgba(120, 144, 175, 0.24) !important;
            background: rgba(17, 24, 34, 0.92) !important;
        }
        body.dc-filter-dark-mode #focus_cmt .reply_box .cmt_write_box.small .user_info_input input,
        body.dc-filter-dark-mode #focus_cmt .reply_box .cmt_write_box.small .cmt_txt_cont {
            border-color: rgba(120, 144, 175, 0.24) !important;
            background: rgba(24, 33, 45, 0.94) !important;
        }
        body.dc-filter-dark-mode #focus_cmt .reply_box .cmt_write_box.small textarea {
            background: rgba(24, 33, 45, 0.94) !important;
            color: #dbe6f5 !important;
        }
        body.dc-filter-dark-mode #focus_cmt .reply_box .cmt_write_box.small .cmt_cont_bottm {
            border-top-color: rgba(120, 144, 175, 0.2) !important;
            background: rgba(20, 28, 39, 0.84) !important;
        }
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_count {
            border-bottom: 0 !important;
        }
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_count .num_box,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_count .num_box *,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_count .fr,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_count .fr button,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_count .fr a,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_count .fr span,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_count .fr em,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_count .comment_sort,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_count .comment_sort * {
            color: #dbe6f5 !important;
        }
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_count .num_box .font_red {
            color: #7db0ff !important;
        }
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box {
            background: transparent !important;
        }
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .cmt_list > li {
            border-color: rgba(90, 112, 145, 0.46) !important;
            background: linear-gradient(180deg, rgba(19, 28, 39, 0.92) 0%, rgba(16, 23, 33, 0.94) 100%) !important;
            box-shadow: inset 0 0 0 1px rgba(90, 112, 145, 0.46), 0 12px 26px rgba(3, 8, 16, 0.28) !important;
            border: 0 !important;
            border-top: 0 !important;
        }
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .cmt_list > li::before {
            content: none !important;
            display: none !important;
        }
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .reply.show {
            border-top-color: rgba(122, 140, 166, 0.28) !important;
        }
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .reply_box {
            border-left-color: rgba(116, 136, 164, 0.54) !important;
            background: linear-gradient(180deg, rgba(32, 42, 56, 0.78) 0%, rgba(28, 37, 50, 0.82) 100%) !important;
            box-shadow: inset 0 0 0 1px rgba(86, 104, 130, 0.52) !important;
        }
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .reply_list > li {
            background: transparent !important;
            box-shadow: none !important;
            border: 0 !important;
            border-top: 0 !important;
        }
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .reply_list > li + li {
            border-top-color: rgba(122, 140, 166, 0.24) !important;
        }
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .reply_list > li .cmt_nickbox::before {
            color: #b9c9dd !important;
        }

        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .cmt_nickbox,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .gall_writer,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .nickname,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .nickname em,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .usertxt {
            color: #dbe6f5 !important;
        }
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .nickname.me,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .nickname.me em,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .gall_writer .nickname.me,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .gall_writer .nickname.me em {
            color: #8ab4ff !important;
            font-weight: 900 !important;
            background: transparent !important;
        }
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .ip,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .date_time,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .txt_del,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .cmt_info > .fr,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .reply_info > .fr {
            color: #97abc7 !important;
        }
        body.dc-filter-dark-mode #focus_cmt > .cmt_write_box {
            border-color: rgba(120, 144, 175, 0.24) !important;
            background: rgba(17, 24, 34, 0.92) !important;
        }
        body.dc-filter-dark-mode #focus_cmt > .cmt_write_box .user_info_input input,
        body.dc-filter-dark-mode #focus_cmt > .cmt_write_box .cmt_txt_cont,
        body.dc-filter-dark-mode #focus_cmt > .cmt_write_box .cmt_write,
        body.dc-filter-dark-mode #focus_cmt > .cmt_write_box textarea {
            border-color: rgba(120, 144, 175, 0.24) !important;
            background: rgba(24, 33, 45, 0.94) !important;
            color: #dbe6f5 !important;
        }
        body.dc-filter-dark-mode #focus_cmt > .cmt_write_box .cmt_cont_bottm {
            border-top-color: rgba(120, 144, 175, 0.2) !important;
            background: rgba(20, 28, 39, 0.84) !important;
        }
        /* [?? ??/??? ?? ?? ?????] */
        #focus_cmt,
        #focus_cmt > div[id^="comment_wrap_"],
        #focus_cmt > div[id^="comment_wrap_"] .comment_box,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_box,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list,
        #focus_cmt > .cmt_write_box,
        #focus_cmt > .cmt_write_box .cmt_txt_cont,
        #focus_cmt > .cmt_write_box .cmt_cont_bottm,
        #focus_cmt > .cmt_write_box .dccon_guidebox {
            overflow: visible !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_info,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_info,
        #focus_cmt > div[id^="comment_wrap_"] .view_comment .cmt_info,
        #focus_cmt > div[id^="comment_wrap_"] .view_comment .reply_info {
            overflow: visible !important;
            position: relative !important;
            z-index: auto !important;
            border-top: 0 !important;
            padding-top: 0 !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li {
            margin: 0 0 10px !important;
            padding: 14px 17px 14px 18px !important;
            border: 0 !important;
            border-top: 0 !important;
            border-radius: 16px !important;
            background: linear-gradient(180deg, #ffffff 0%, #f7f7f8 100%) !important;
            box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.05) !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li::before,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_nickbox::before,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_nickbox::after,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .gall_writer::before,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .gall_writer::after,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .nickname::before,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .nickname::after {
            content: none !important;
            display: none !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_info::before,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_info::after,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_info::before,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_info::after {
            content: none !important;
            display: none !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_txtbox {
            border-top: 0 !important;
            box-shadow: none !important;
            background: transparent !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply.show {
            margin-top: 10px !important;
            padding-top: 10px !important;
            border-top: 1px solid #e3e9f1 !important;
            background: transparent !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_box {
            margin: 2px 0 0 8px !important;
            padding: 10px 12px 10px 14px !important;
            border: 0 !important;
            border-left: 1px solid #d7dee8 !important;
            border-radius: 12px !important;
            background: linear-gradient(180deg, rgba(247, 249, 252, 0.96) 0%, rgba(243, 246, 250, 0.96) 100%) !important;
            box-shadow: inset 0 0 0 1px rgba(211, 220, 232, 0.76) !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list {
            margin: 0 !important;
            padding: 0 !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li {
            margin: 0 !important;
            padding: 8px 0 0 0 !important;
            border: 0 !important;
            border-top: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li + li {
            margin-top: 8px !important;
            padding-top: 8px !important;
            border-top: 1px solid #e1e8f0 !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li::before,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li::after,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li .reply_info::before,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li .reply_info::after,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li .cmt_nickbox::before,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li .cmt_nickbox::after,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li .gall_writer::before,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li .gall_writer::after,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li .comment_dccon::before,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li .comment_dccon::after,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li a.mention::before,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li a.mention::after,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li a.mention.deco::before,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li a.mention.deco::after,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li p.usertxt::before,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li p.usertxt::after,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li p.usertxt.ub-word::before,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li p.usertxt.ub-word::after {
            content: none !important;
            display: none !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li .cmt_nickbox {
            padding-left: 24px !important;
            position: relative !important;
        }

        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li .cmt_txtbox {
            padding-left: 24px !important;
            position: relative !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li .cmt_txtbox::before {
            content: none !important;
            display: none !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li .cmt_nickbox::before {
            content: "\\3134" !important;
            position: absolute !important;
            left: 4px !important;
            top: 1px !important;
            display: block !important;
            font-size: 13px !important;
            line-height: 1 !important;
            color: #78899f !important;
            font-weight: 700 !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_nickbox,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .gall_writer.ub-writer {
            overflow: visible !important;
            position: relative !important;
            z-index: auto !important;
        }
        #focus_cmt #user_data_lyr,
        #focus_cmt .user_data,
        #focus_cmt #dccon_guide_lyr,
        #focus_cmt .pop_wrap.type2 {
            z-index: 2147483647 !important;
            overflow: visible !important;
        }
        #focus_cmt #user_data_lyr,
        #focus_cmt .user_data {
            position: absolute !important;
        }
        #focus_cmt > .cmt_write_box .cmt_txt_cont,
        #focus_cmt > .cmt_write_box .cmt_cont_bottm {
            overflow: visible !important;
        }
        .view_content_wrap .gall_writer,
        .view_content_wrap .gall_writer .fr,
        .view_content_wrap .gall_writer .fr > span,
        .view_content_wrap .gall_writer .gall_scrap,
        .view_content_wrap .gall_writer .gall_scrap button,
        .view_content_wrap .btn_recommend_box,
        .view_content_wrap .recom_bottom_box,
        .view_content_wrap .recom_bottom_box > button,
        #focus_cmt .reply_box,
        #focus_cmt .reply_box .cmt_write_box.small,
        #focus_cmt .reply_box .cmt_write_box.small .cmt_txt_cont,
        #focus_cmt .reply_box .cmt_cont_bottm,
        #focus_cmt .reply_box .dccon_guidebox {
            overflow: visible !important;
        }
        .view_content_wrap .pop_wrap.type2,
        .view_content_wrap .pop_wrap.type3,
        #focus_cmt .pop_wrap.type2,
        #focus_cmt .pop_wrap.type3 {
            z-index: 2147483647 !important;
        }
        .view_content_wrap .gall_writer:has(.pop_wrap.type2[style*="display:block"]),
        .view_content_wrap .gall_writer:has(.pop_wrap.type2[style*="display: block"]),
        .view_content_wrap .gall_writer:has(.pop_wrap.type3[style*="display:block"]),
        .view_content_wrap .gall_writer:has(.pop_wrap.type3[style*="display: block"]),
        .view_content_wrap .btn_recommend_box:has(.pop_wrap.type2[style*="display:block"]),
        .view_content_wrap .btn_recommend_box:has(.pop_wrap.type2[style*="display: block"]),
        .view_content_wrap .btn_recommend_box:has(.pop_wrap.type3[style*="display:block"]),
        .view_content_wrap .btn_recommend_box:has(.pop_wrap.type3[style*="display: block"]),
        #focus_cmt .reply_box:has(.pop_wrap.type2[style*="display:block"]),
        #focus_cmt .reply_box:has(.pop_wrap.type2[style*="display: block"]),
        #focus_cmt .reply_box:has(.pop_wrap.type3[style*="display:block"]),
        #focus_cmt .reply_box:has(.pop_wrap.type3[style*="display: block"]),
        #focus_cmt .comment_box .cmt_list > li:has(.pop_wrap.type2[style*="display:block"]),
        #focus_cmt .comment_box .cmt_list > li:has(.pop_wrap.type2[style*="display: block"]),
        #focus_cmt .comment_box .cmt_list > li:has(.pop_wrap.type3[style*="display:block"]),
        #focus_cmt .comment_box .cmt_list > li:has(.pop_wrap.type3[style*="display: block"]),
        #focus_cmt .comment_box .reply_list > li:has(#user_data_lyr[style*="display:block"]),
        #focus_cmt .comment_box .reply_list > li:has(#user_data_lyr[style*="display: block"]),
        #focus_cmt .comment_box .reply_list > li:has(.user_data[style*="display:block"]),
        #focus_cmt .comment_box .reply_list > li:has(.user_data[style*="display: block"]),
        #focus_cmt .comment_box .cmt_list > li:has(#user_data_lyr[style*="display:block"]),
        #focus_cmt .comment_box .cmt_list > li:has(#user_data_lyr[style*="display: block"]),
        #focus_cmt .comment_box .cmt_list > li:has(.user_data[style*="display:block"]),
        #focus_cmt .comment_box .cmt_list > li:has(.user_data[style*="display: block"]),
        #focus_cmt .comment_box .cmt_list > li:has(.reply_list > li:has(#user_data_lyr[style*="display:block"])),
        #focus_cmt .comment_box .cmt_list > li:has(.reply_list > li:has(#user_data_lyr[style*="display: block"])),
        #focus_cmt .comment_box .cmt_list > li:has(.reply_list > li:has(.user_data[style*="display:block"])),
        #focus_cmt .comment_box .cmt_list > li:has(.reply_list > li:has(.user_data[style*="display: block"])) {
            position: relative !important;
            z-index: 2147483646 !important;
            overflow: visible !important;
        }
        #focus_cmt .comment_box .cmt_info:has(#user_data_lyr[style*="display:block"]),
        #focus_cmt .comment_box .cmt_info:has(#user_data_lyr[style*="display: block"]),
        #focus_cmt .comment_box .cmt_info:has(.user_data[style*="display:block"]),
        #focus_cmt .comment_box .cmt_info:has(.user_data[style*="display: block"]),
        #focus_cmt .comment_box .reply_info:has(#user_data_lyr[style*="display:block"]),
        #focus_cmt .comment_box .reply_info:has(#user_data_lyr[style*="display: block"]),
        #focus_cmt .comment_box .reply_info:has(.user_data[style*="display:block"]),
        #focus_cmt .comment_box .reply_info:has(.user_data[style*="display: block"]) {
            position: relative !important;
            z-index: 2147483647 !important;
            overflow: visible !important;
        }
        body.dc-filter-dark-mode #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li {
            background: linear-gradient(180deg, rgba(19, 28, 39, 0.92) 0%, rgba(16, 23, 33, 0.94) 100%) !important;
            box-shadow: 0 1px 0 rgba(90, 112, 145, 0.34), 0 12px 24px rgba(3, 8, 16, 0.28) !important;
        }
        body.dc-filter-dark-mode #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply.show {
            border-top: 1px solid rgba(122, 140, 166, 0.28) !important;
        }
        body.dc-filter-dark-mode #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li + li {
            border-top-color: rgba(122, 140, 166, 0.24) !important;
        }
        body.dc-filter-dark-mode #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li .cmt_nickbox::before {
            color: #b9c9dd !important;
        }
        body.dc-filter-dark-mode #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_box {
            border-left-color: rgba(116, 136, 164, 0.54) !important;
            background: linear-gradient(180deg, rgba(32, 42, 56, 0.78) 0%, rgba(28, 37, 50, 0.82) 100%) !important;
            box-shadow: inset 0 0 0 1px rgba(86, 104, 130, 0.52) !important;
        }
        @media screen and (max-width: 820px) {
            .cmt_write_box {
                flex-direction: column !important;
            }
            .cmt_write_box > .fl,
            .cmt_write_box .cmt_txt_cont {
                flex-basis: auto !important;
                width: 100% !important;
                min-width: 0 !important;
            }
            .cmt_write_box .cmt_cont_bottm > .fr {
                margin-left: 0 !important;
                width: 100% !important;
                justify-content: flex-end !important;
            }
            #focus_cmt .reply_box .cmt_write_box.small {
                grid-template-columns: 1fr !important;
                gap: 8px !important;
            }
            #focus_cmt .reply_box .cmt_write_box.small > .fl,
            #focus_cmt .reply_box .cmt_write_box.small .cmt_txt_cont {
                grid-column: 1 !important;
                width: 100% !important;
                min-width: 0 !important;
            }
            .view_content_wrap .recommend_kapcode {
                width: 290px !important;
                min-width: 290px !important;
                max-width: 290px !important;
            }
            .view_content_wrap .recommend_kapcode .recom_input_kapcode {
                flex: 0 0 150px !important;
                width: 150px !important;
                min-width: 150px !important;
                max-width: 150px !important;
            }
            .comment_box .reply_box {
                margin-left: 12px !important;
                padding-left: 12px !important;
            }
        }
        @media screen and (max-width: 640px) {
            .view_content_wrap {
                padding: 8px 8px 0 !important;
            }
            .view_content_wrap .gallview_head,
            .view_content_wrap .gallview_contents,
            .comment_box,
            .cmt_write_box,
            .view_content_wrap .btn_recommend_box {
                border-radius: 16px !important;
            }
            .view_content_wrap .gallview_head {
                padding: 15px 14px 12px !important;
            }
            .view_content_wrap .title_subject {
                font-size: 20px !important;
            }
            .view_content_wrap .gallview_contents,
            .view_content_wrap .btn_recommend_box,
            .comment_box .cmt_list > li,
            .comment_box .reply_list > li,
            .cmt_write_box {
                padding-left: 14px !important;
                padding-right: 14px !important;
            }
            .comment_box .cmt_list > li {
                padding-top: 14px !important;
                padding-bottom: 14px !important;
            }
            .comment_box .reply_list > li {
                padding-top: 11px !important;
                padding-bottom: 11px !important;
            }
        }
    `;

    const injectStyle = () => {
        if (document.getElementById(STYLE_ID)) return true;
        const target = document.head || document.documentElement;
        if (!target) return false;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;
        target.appendChild(style);
        return true;
    };

    injectStyle();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectStyle, { once: true });
    }
    window.addEventListener('load', injectStyle, { once: true });
})();
(() => {
    const STYLE_ID = 'dcuf-runtime-fixes';
    const css = `
        div[id^="foin_"],
        div[id^="foin_"] .closebtn,
        div[id^="foin_"] + .closebtn,
        iframe[id^="pageid_"][src*="adnmore"],
        .power_link,
        .power_link .pwlink_list,
        .power_link .pwlink_img_list,
        .view_ad_wrap:has(> .power_link) {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            overflow: hidden !important;
            visibility: hidden !important;
            pointer-events: none !important;
        }
        body.dc-filter-dark-mode #dc-personal-block-fab {
            background: linear-gradient(180deg, #202a36 0%, #1a2330 100%) !important;
            color: #d9e3f2 !important;
            border-color: #445468 !important;
            box-shadow: 0 8px 18px rgba(0, 0, 0, 0.28) !important;
        }
        body.dc-filter-dark-mode #dc-personal-block-fab:hover {
            background: linear-gradient(180deg, #24303d 0%, #1d2734 100%) !important;
            border-color: #53657d !important;
            box-shadow: 0 10px 22px rgba(0, 0, 0, 0.34) !important;
        }
        body.dc-filter-dark-mode #dc-personal-block-fab:active {
            box-shadow: 0 5px 12px rgba(0, 0, 0, 0.26) !important;
        }
        body.dc-filter-dark-mode .cmt_nickbox,
        body.dc-filter-dark-mode .author {
            background: transparent !important;
        }
        body.dc-filter-dark-mode .cmt_nickbox .nickname,
        body.dc-filter-dark-mode .cmt_nickbox .ip,
        body.dc-filter-dark-mode .author .nickname,
        body.dc-filter-dark-mode .author .ip {
            background: transparent !important;
            color: #d6e1f5 !important;
        }
    `;

    const injectStyle = () => {
        if (document.getElementById(STYLE_ID)) return true;
        const target = document.head || document.documentElement;
        if (!target) return false;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;
        target.appendChild(style);
        return true;
    };

    injectStyle();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectStyle, { once: true });
    }
    window.addEventListener('load', injectStyle, { once: true });
})();

(() => {
    const setImportant = (element, property, value) => {
        if (!element) return;
        element.style.setProperty(property, value, 'important');
    };

    const NORMALIZE_DELAYS = [120, 420, 1200, 2600];

    const normalizeCommentTypography = () => {
        if (!document.querySelector('.view_content_wrap .comment_box, #focus_cmt > .cmt_write_box')) return;

        document.querySelectorAll('.comment_box .usertxt').forEach((element) => {
            setImportant(element, 'font-size', '24px');
            setImportant(element, 'line-height', '1.58');
        });

        document.querySelectorAll('.comment_box .nickname').forEach((element) => {
            setImportant(element, 'font-size', '13px');
        });

        document.querySelectorAll('.comment_box .nickname .ip').forEach((element) => {
            setImportant(element, 'font-size', '12px');
        });

        document.querySelectorAll('.comment_box .writer_nikcon').forEach((element) => {
            element.style.removeProperty('font-size');
        });
        document.querySelectorAll('.comment_box .writer_nikcon img, .comment_box img.gallercon').forEach((element) => {
            setImportant(element, 'width', 'auto');
            setImportant(element, 'height', '13px');
            setImportant(element, 'max-width', 'none');
        });
    };

    let rafId = 0;
    const timerIds = new Set();

    const clearTimers = () => {
        timerIds.forEach((timerId) => clearTimeout(timerId));
        timerIds.clear();
    };

    const scheduleNormalize = () => {
        if (rafId) cancelAnimationFrame(rafId);
        clearTimers();

        rafId = requestAnimationFrame(() => {
            rafId = 0;
            normalizeCommentTypography();

            NORMALIZE_DELAYS.forEach((delay) => {
                const timerId = setTimeout(() => {
                    timerIds.delete(timerId);
                    normalizeCommentTypography();
                }, delay);
                timerIds.add(timerId);
            });
        });
    };

    const observeComments = () => {
        if (!document.body || window.__dcufCommentTypographyObserver) return;

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'characterData') {
                    scheduleNormalize();
                    break;
                }

                if ((mutation.addedNodes && mutation.addedNodes.length > 0) || mutation.type === 'attributes') {
                    scheduleNormalize();
                    break;
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true,
            attributeFilter: ['style', 'class']
        });

        window.__dcufCommentTypographyObserver = observer;
    };

    const bindMediaLoadNormalize = () => {
        if (window.__dcufCommentTypographyLoadBound) return;

        document.addEventListener('load', (event) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            if (!target.matches('img, video')) return;
            if (!target.closest('.view_content_wrap, #focus_cmt')) return;
            scheduleNormalize();
        }, true);

        document.addEventListener('error', (event) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            if (!target.matches('img, video')) return;
            if (!target.closest('.view_content_wrap, #focus_cmt')) return;
            scheduleNormalize();
        }, true);

        window.__dcufCommentTypographyLoadBound = true;
    };

    const observeLayoutChanges = () => {
        if (!window.ResizeObserver || window.__dcufCommentTypographyResizeObserver) return;

        const observer = new ResizeObserver(() => {
            scheduleNormalize();
        });

        const bindTargets = () => {
            document.querySelectorAll('.view_content_wrap, .writing_view_box, #focus_cmt').forEach((element) => {
                if (!(element instanceof Element)) return;
                if (element.dataset.dcufCommentResizeObserved === '1') return;
                observer.observe(element);
                element.dataset.dcufCommentResizeObserved = '1';
            });
        };

        bindTargets();

        const binder = new MutationObserver(() => {
            bindTargets();
        });
        binder.observe(document.body, { childList: true, subtree: true });

        window.__dcufCommentTypographyResizeObserver = observer;
        window.__dcufCommentTypographyResizeBinder = binder;
    };

    window.__dcufScheduleCommentNormalize = scheduleNormalize;

    scheduleNormalize();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            scheduleNormalize();
            observeComments();
            bindMediaLoadNormalize();
            observeLayoutChanges();
        }, { once: true });
    } else {
        observeComments();
        bindMediaLoadNormalize();
        observeLayoutChanges();
    }

    window.addEventListener('load', scheduleNormalize, { once: true });
    window.addEventListener('resize', scheduleNormalize);
})();

(() => {
    const COMMENT_LIST_SELECTOR = 'div[id^="comment_wrap_"] .comment_box .cmt_list';

    const getParentNoFromCommentLi = (li) => {
        if (!(li instanceof HTMLElement)) return '';

        const info = li.querySelector(':scope > div.cmt_info[data-no]');
        if (info) {
            const no = info.getAttribute('data-no');
            if (no) return no;
        }

        const idMatch = (li.id || '').match(/^comment_li_(\d+)$/);
        return idMatch ? idMatch[1] : '';
    };

    const getParentNoFromReplyBlock = (replyShow) => {
        if (!(replyShow instanceof HTMLElement)) return '';

        const replyList = replyShow.querySelector(':scope > .reply_box > .reply_list[p-no], :scope > .reply_box > ul.reply_list[p-no], .reply_list[p-no]');
        if (replyList) {
            const pNo = replyList.getAttribute('p-no');
            if (pNo) return pNo;
        }

        const wrapperLi = replyShow.closest('li');
        const liMatch = (wrapperLi?.id || '').match(/^reply_li_(\d+)$/);
        return liMatch ? liMatch[1] : '';
    };

    const mergeDetachedRepliesIntoParent = () => {
        document.querySelectorAll(COMMENT_LIST_SELECTOR).forEach((list) => {
            if (!(list instanceof HTMLElement)) return;

            const parentMap = new Map();
            list.querySelectorAll(':scope > li').forEach((li) => {
                if (!(li instanceof HTMLElement)) return;
                const no = getParentNoFromCommentLi(li);
                if (no) parentMap.set(no, li);
            });

            list.querySelectorAll(':scope > li > div.reply.show').forEach((replyShow) => {
                if (!(replyShow instanceof HTMLElement)) return;

                const wrapperLi = replyShow.closest('li');
                if (!(wrapperLi instanceof HTMLElement)) return;

                if (getParentNoFromCommentLi(wrapperLi)) return;

                const parentNo = getParentNoFromReplyBlock(replyShow);
                if (!parentNo) return;

                const parentLi = parentMap.get(parentNo) || list.querySelector(':scope > li#comment_li_' + parentNo);
                if (!(parentLi instanceof HTMLElement) || parentLi === wrapperLi) return;

                const alreadyMerged = parentLi.querySelector(':scope > div.reply.show .reply_list[p-no="' + parentNo + '"]');
                if (alreadyMerged) {
                    wrapperLi.remove();
                    return;
                }

                parentLi.appendChild(replyShow);
                wrapperLi.remove();
            });
        });
    };

    const scheduleReplyMerge = (() => {
        let rafId = 0;
        let timerId = 0;

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            if (timerId) clearTimeout(timerId);

            rafId = requestAnimationFrame(() => {
                rafId = 0;
                mergeDetachedRepliesIntoParent();

                timerId = window.setTimeout(() => {
                    timerId = 0;
                    mergeDetachedRepliesIntoParent();
                }, 140);
            });
        };
    })();

    const observeReplyMergeTargets = () => {
        if (!document.body || window.__dcufReplyMergeObserver) return;

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
                    scheduleReplyMerge();
                    return;
                }

                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    if (target instanceof Element && target.closest('div[id^="comment_wrap_"] .comment_box')) {
                        scheduleReplyMerge();
                        return;
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'id']
        });

        window.__dcufReplyMergeObserver = observer;
    };

    scheduleReplyMerge();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            scheduleReplyMerge();
            observeReplyMergeTargets();
        }, { once: true });
    } else {
        observeReplyMergeTargets();
    }

    window.addEventListener('load', scheduleReplyMerge, { once: true });
    window.addEventListener('resize', scheduleReplyMerge);
})();

(() => {
    const cleanupViewHeader = () => {
        document.querySelectorAll('.view_content_wrap .title_headtext').forEach((element) => {
            if ((element.textContent || '').replace(/s+/g, '') === '') {
                element.remove();
            }
        });
    };

    cleanupViewHeader();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', cleanupViewHeader, { once: true });
    }
    window.addEventListener('load', cleanupViewHeader, { once: true });
})();

(() => {
    const applyImageCommentWidths = () => {
        document.querySelectorAll('.view_comment.image_comment').forEach((section) => {
            const box = section.querySelector('.comment_box.img_comment_box');
            const imgNo = box?.getAttribute('data-imgno');
            const image = imgNo
                ? document.querySelector('.writing_view_box img[data-fileno="' + imgNo + '"]')
                : section.closest('.img_area')?.querySelector('img');

            const width = image
                ? Math.round(image.getBoundingClientRect().width || image.clientWidth || image.naturalWidth || 0)
                : 0;

            const imgCommentRoot = section.closest('.img_comment');
            const wrap = section.querySelector('.comment_wrap');
            const list = box?.querySelector('.cmt_list');

            if (width > 80) {
                const widthPx = width + 'px';
                [imgCommentRoot, section, wrap, box, list].forEach((element) => {
                    if (!element) return;
                    element.style.width = widthPx;
                    element.style.maxWidth = widthPx;
                    element.style.marginLeft = '0';
                    element.style.marginRight = '0';
                });
            } else {
                [imgCommentRoot, section, wrap, box, list].forEach((element) => {
                    if (!element) return;
                    element.style.removeProperty('width');
                    element.style.removeProperty('max-width');
                    element.style.removeProperty('margin-left');
                    element.style.removeProperty('margin-right');
                });
            }
        });
    };

    const scheduleApplyImageCommentWidths = (() => {
        let rafId = 0;
        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                rafId = 0;
                applyImageCommentWidths();
            });
        };
    })();

    const observeImageComments = () => {
        if (!document.body || window.__dcufImageCommentWidthObserver) return;
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if ((mutation.addedNodes && mutation.addedNodes.length > 0) || mutation.type === 'attributes') {
                    scheduleApplyImageCommentWidths();
                    break;
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'style', 'class'] });
        window.__dcufImageCommentWidthObserver = observer;
    };

    scheduleApplyImageCommentWidths();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            scheduleApplyImageCommentWidths();
            observeImageComments();
        }, { once: true });
    } else {
        observeImageComments();
    }

    window.addEventListener('load', scheduleApplyImageCommentWidths, { once: true });
    window.addEventListener('resize', scheduleApplyImageCommentWidths);
})();


(() => {
    const ACTIVE_ATTR = 'data-dcuf-userpopup-active';
    const ORIG_Z = 'data-dcuf-userpopup-orig-z';
    const ORIG_POS = 'data-dcuf-userpopup-orig-pos';
    const ORIG_OV = 'data-dcuf-userpopup-orig-ov';
    const NONE = '__none__';

    const isVisible = (element) => {
        if (!(element instanceof HTMLElement)) return false;
        const cs = window.getComputedStyle(element);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity || '1') === 0) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    };

    const saveStyleIfNeeded = (element, attr, prop) => {
        if (!(element instanceof HTMLElement)) return;
        if (element.hasAttribute(attr)) return;
        const raw = element.style.getPropertyValue(prop);
        element.setAttribute(attr, raw ? raw : NONE);
    };

    const restoreStyle = (element, attr, prop) => {
        if (!(element instanceof HTMLElement)) return;
        if (!element.hasAttribute(attr)) {
            element.style.removeProperty(prop);
            return;
        }
        const value = element.getAttribute(attr);
        if (!value || value === NONE) {
            element.style.removeProperty(prop);
        } else {
            element.style.setProperty(prop, value);
        }
        element.removeAttribute(attr);
    };

    const elevateLi = (li) => {
        if (!(li instanceof HTMLElement)) return;
        saveStyleIfNeeded(li, ORIG_Z, 'z-index');
        saveStyleIfNeeded(li, ORIG_POS, 'position');
        saveStyleIfNeeded(li, ORIG_OV, 'overflow');
        li.style.setProperty('position', 'relative', 'important');
        li.style.setProperty('z-index', '2147483646', 'important');
        li.style.setProperty('overflow', 'visible', 'important');
        li.setAttribute(ACTIVE_ATTR, '1');
    };

    const clearElevated = () => {
        document.querySelectorAll('li[' + ACTIVE_ATTR + '="1"]').forEach((li) => {
            if (!(li instanceof HTMLElement)) return;
            restoreStyle(li, ORIG_Z, 'z-index');
            restoreStyle(li, ORIG_POS, 'position');
            restoreStyle(li, ORIG_OV, 'overflow');
            li.removeAttribute(ACTIVE_ATTR);
        });
    };

    const collectActiveLis = () => {
        const active = new Set();
        document.querySelectorAll('#focus_cmt #user_data_lyr, #focus_cmt .user_data, #focus_cmt #dccon_guide_lyr, #focus_cmt .pop_wrap.type2, #focus_cmt .pop_wrap.type3').forEach((popup) => {
            if (!(popup instanceof HTMLElement)) return;
            if (!isVisible(popup)) return;

            const li = popup.closest('li[id^="reply_li_"], li[id^="comment_li_"]');
            if (!(li instanceof HTMLElement)) return;
            active.add(li);

            if ((li.id || '').indexOf('reply_li_') === 0) {
                const parentCommentLi = li.closest('li[id^="comment_li_"]');
                if (parentCommentLi instanceof HTMLElement) active.add(parentCommentLi);
            }
        });
        return active;
    };

    const applyFix = () => {
        clearElevated();
        const activeLis = collectActiveLis();
        activeLis.forEach((li) => elevateLi(li));
    };

    const scheduleApply = (() => {
        let rafId = 0;
        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                rafId = 0;
                applyFix();
            });
        };
    })();

    const observe = () => {
        if (!document.body || window.__dcufUserPopupLayerObserver) return;
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
                        scheduleApply();
                        return;
                    }
                }
                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    if (target instanceof Element && target.closest('#focus_cmt')) {
                        scheduleApply();
                        return;
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });

        window.__dcufUserPopupLayerObserver = observer;
    };

    const bindEvents = () => {
        if (window.__dcufUserPopupLayerBound) return;
        document.addEventListener('click', scheduleApply, true);
        document.addEventListener('mouseup', scheduleApply, true);
        document.addEventListener('keyup', scheduleApply, true);
        window.addEventListener('scroll', scheduleApply, true);
        window.__dcufUserPopupLayerBound = true;
    };

    scheduleApply();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            scheduleApply();
            observe();
            bindEvents();
        }, { once: true });
    } else {
        observe();
        bindEvents();
    }

    window.addEventListener('load', scheduleApply, { once: true });
})();
(() => {
    const WRITER_SCOPE = '.view_content_wrap .gallview_head .gall_writer.ub-writer';

    const isPopupVisible = () => {
        const popup = document.getElementById('user_data_lyr') || document.querySelector('.user_data');
        if (!(popup instanceof HTMLElement)) return false;
        const cs = window.getComputedStyle(popup);
        return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity || '1') > 0;
    };

    const recoverSelectionModeIfStale = () => {
        try {
            if (typeof PersonalBlockModule === 'undefined' || !PersonalBlockModule) return;
            if (!PersonalBlockModule.isSelectionMode) return;
            if (document.getElementById('dc-selection-popup')) return;
            if (typeof PersonalBlockModule.exitSelectionMode === 'function') {
                PersonalBlockModule.exitSelectionMode();
            }
        } catch (_) {
            // ignore
        }
    };

    const emitMouseSequence = (element) => {
        if (!(element instanceof HTMLElement)) return;
        const init = { bubbles: true, cancelable: true, view: window };
        element.dispatchEvent(new MouseEvent('mousedown', init));
        element.dispatchEvent(new MouseEvent('mouseup', init));
        element.dispatchEvent(new MouseEvent('click', init));
    };

    const tryOpenWriterPopup = (writer) => {
        if (!(writer instanceof HTMLElement)) return;
        if (window.__dcufWriterPopupBridgeLock) return;
        if (isPopupVisible()) return;

        window.__dcufWriterPopupBridgeLock = true;
        try {
            const icon = writer.querySelector('.writer_nikcon');
            if (icon instanceof HTMLElement) emitMouseSequence(icon);
            if (!isPopupVisible()) emitMouseSequence(writer);
            if (!isPopupVisible()) {
                const nickname = writer.querySelector('.nickname');
                if (nickname instanceof HTMLElement) emitMouseSequence(nickname);
            }
        } finally {
            window.setTimeout(() => {
                window.__dcufWriterPopupBridgeLock = false;
            }, 0);
        }
    };

    const onHeaderWriterClick = (event) => {
        recoverSelectionModeIfStale();
        if (window.__dcufWriterPopupBridgeLock) return;

        const target = event.target;
        if (!(target instanceof Element)) return;
        const writer = target.closest(WRITER_SCOPE);
        if (!(writer instanceof HTMLElement)) return;
        if (target.closest('#user_data_lyr, .user_data')) return;

        window.setTimeout(() => {
            recoverSelectionModeIfStale();
            if (isPopupVisible()) return;
            tryOpenWriterPopup(writer);
        }, 90);
    };

    const bind = () => {
        if (window.__dcufWriterPopupBridgeBound) return;
        document.addEventListener('click', onHeaderWriterClick, true);
        document.addEventListener('mouseup', onHeaderWriterClick, true);
        window.__dcufWriterPopupBridgeBound = true;
    };

    recoverSelectionModeIfStale();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            recoverSelectionModeIfStale();
            bind();
        }, { once: true });
    } else {
        bind();
    }

    window.addEventListener('load', recoverSelectionModeIfStale, { once: true });
})();
