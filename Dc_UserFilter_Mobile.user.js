// ==UserScript==
// @name         DC_UserFilter_Mobile_v1.0.1
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @description  유저 필터링 기능과 PC-모바일 UI 개선 기능을 함께 제공합니다. (안정성 개선)
// @author       domato153
// @match        https://gall.dcinside.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @license      MIT
// ==/UserScript==

/*-----------------------------------------------------------------
DBAD license / Copyright (C) 2025 domato153
https://github.com/philsturgeon/dbad/blob/master/LICENSE.md
https://namu.wiki/w/DBAD%20%EB%9D%BC%EC%9D%B4%EC%84%A0%EC%8A%A4
------------------------------------------------------------------*/

(function() {
    'use strict';

    // =================================================================
    // ======================== UI Module Style ========================
    // =================================================================
    GM_addStyle(`
        /* --- 숨김 처리 (정교하게 재조정) --- */
        table.gall_list.filter-ui-hidden {
            visibility: hidden !important; position: absolute !important;
            top: -9999px !important; left: -9999px !important;
            height: 0 !important; overflow: hidden !important;
        }

        #dchead, #dc_header, #dc_gnb, .adv_area, .right_content, .dc_all, .dcfoot, .dc_ft, .info_policy,.copyrigh, .ad_bottom_list, .bottom_paging_box + div, .minor_intro_area, .intro_bg, .fixed_write_btn, .bottom_movebox, h1.dc_logo, .area_links, .zzbang_div, .my_zzal, .my_dccon, .issue_contentbox, #gall_top_recom.concept_wrap,
/* ... */
.gall_exposure {
    display: none !important;
}


        /* --- 기본 레이아웃 재정의 --- */
        body { background: #fff !important; }
        html, body { overflow-x: hidden !important; }

        /* 모든 주요 컨테이너의 너비/여백 초기화 */
        html, body, #wrap, #top, .dcheader, #gnb_bar, .gnb, #container, .wrap_inner,
        .list_array_option, .newvisit_history, .left_content, .center_box,
        .view_content_wrap, .gall_content, .gall_comment {
            width: 100vw !important; min-width: 0 !important; float: none !important;
            position: relative !important; box-sizing: border-box !important;
            margin: 0 !important; padding: 0 !important;
        }
        #container { padding-top: 5px; }
        .dcheader.typea, .dcheader.typea .dcheader_info { min-width: 0 !important; width: 100% !important; height: auto !important; }
        .dcheader .dcheader_info { display: flex !important; justify-content: center !important; align-items: center !important; float: none !important; padding: 8px 15px !important; }
        .dcheader .top_search, .dcheader .gall_search_form { width: 100% !important; }

        .list_array_option {
            padding: 10px 15px !important; background: #fff; display: flex !important;
            align-items: center !important; flex-wrap: wrap !important;
            gap: 10px !important; margin-bottom: 8px !important;
        }
        .list_array_option > div { float: none !important; }
        .list_array_option > .left_box { flex: 1 1 200px; }
        .list_array_option > .right_box { display: flex; align-items: center; justify-content: flex-end; flex: 1 1 180px; }
        .list_array_option > .center_box {
            flex-basis: 100%; order: -1;
            border-top: 1px solid #4263eb; border-bottom: 1px solid #4263eb;
            margin-top: 10px; margin-bottom: 10px;
            padding-top: 18px; padding-bottom: 18px;
        }

        .center_box {
            background: #fff; padding: 8px 15px !important; margin-top: 1px !important;
            display: flex !important; justify-content: center !important; align-items: center !important;
            flex-wrap: wrap; gap: 5px;
        }

        /* --- 커스텀 모바일 리스트 UI --- */
        .custom-mobile-list { border-top: 1px solid #ddd; background: #fff; }
        body.is-mgallery .custom-mobile-list { padding-top: 50px !important; }
        .custom-post-item.notice + .custom-post-item:not(.notice):not(.concept),
        .custom-post-item.concept + .custom-post-item:not(.notice):not(.concept) {
            border-top: 1px solid #4263eb !important;
        }
        .custom-post-item { display: block; padding: 15px 18px; border-bottom: 1px solid #e6e6e6; text-decoration: none; color: #333; }
        .custom-post-item:hover { background-color: #f8f9fa; }
        .custom-post-item .post-title, .custom-post-item .author { cursor: pointer; }
        .custom-post-item.notice, .custom-post-item.concept { background-color: #f8f9fa; position: relative; padding-left: 60px; }
        .custom-post-item.notice::before { content: '공지'; background-color: #e03131; position: absolute; left: 18px; top: 50%; transform: translateY(-50%); font-size: 13px; font-weight: bold; color: #fff; padding: 4px 9px; border-radius: 4px; }
        .custom-post-item.concept::before { content: '개념'; background-color: #4263eb; position: absolute; left: 18px; top: 50%; transform: translateY(-50%); font-size: 13px; font-weight: bold; color: #fff; padding: 4px 9px; border-radius: 4px; }
        .post-title { font-size: 17px !important; font-weight: 500; line-height: 1.5; color: #333; margin-bottom: 10px; }
        .post-title a { color: inherit; text-decoration: none; }
        .post-title a:visited { color: #770088; }
        .post-title .gall_subject { color: #9b6b43 !important; font-weight: bold !important; margin-right: 6px; }
        .post-title .reply_num { color: #4263eb !important; font-weight: bold !important; margin-left: 6px; }
        .post-meta { display: flex; justify-content: space-between; align-items: center; font-size: 13px !important; color: #888; }
        .post-meta .author .gall_writer { display: inline !important; padding: 0 !important; text-align: left !important; border: none !important; }
        .post-meta .author .nickname, .post-meta .author .ip { color: #555 !important; }
        .post-meta .stats { display: flex; gap: 10px; }

        /* --- 커스텀 하단 컨트롤 UI (원본 이동 방식) --- */
        .custom-bottom-controls { display: flex; flex-direction: column; align-items: center; padding: 15px; background: #fff; }
        .custom-bottom-controls form[name="frmSearch"] {
            display: flex !important; width: 100%; max-width: 500px;
            box-sizing: border-box !important; margin: 15px 0 !important;
            gap: 5px; flex-wrap: nowrap !important;
        }
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
        .gallview_contents img { max-width: 100% !important; height: auto !important; box-sizing: border-box; }
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

        /* --- 글쓰기 페이지 전용 스타일 --- */
        .is-write-page #container { background: #fff !important; padding: 0 !important; }
        .is-write-page .center_content, .is-write-page .gall_write, .is-write-page .write_box { padding: 0 !important; border: none !important; box-shadow: none !important; margin: 0 !important; }
        .is-write-page .write_box { padding: 15px !important; }
        .is-write-page .write_box > table { width: 100% !important; }
        .is-write-page .write_box select, .is-write-page .write_box input[type="text"], .is-write-page .write_box input[type="password"] {
            width: 100% !important; height: 45px !important; padding: 0 12px !important; font-size: 16px !important;
            border: 1px solid #ddd !important; border-radius: 4px !important; box-sizing: border-box !important;
        }
        .is-write-page .write_box .w_top { display: flex; flex-direction: column; gap: 10px; }
        .is-write-page .write_box .w_top > tbody > tr > td { padding: 0 !important; }
        .is-write-page .write_box .w_top .write_subject { display: block; }
        .is-write-page .write_box .tx-editor-container { margin-top: 15px; }
        .is-write-page .write_box .btn_bottom_box { display: flex !important; gap: 10px; padding: 15px 0 0 0 !important; border-top: 1px solid #eee; margin-top: 15px; }
        .is-write-page .write_box .btn_bottom_box a, .is-write-page .write_box .btn_bottom_box button {
            flex: 1; display: inline-block !important; text-align: center !important; padding: 12px 0 !important;
            font-size: 16px !important; border-radius: 4px !important; text-decoration: none !important;
            height: auto !important; float: none !important; line-height: normal !important;
        }
        .is-write-page .write_box .btn_bottom_box .btn_blue { background-color: #3b71fd !important; color: #fff !important; border: none !important; }
        .is-write-page .write_box .btn_bottom_box .btn_lightred { background-color: #e9e9e9 !important; color: #555 !important; border: none !important; }
        .is-write-page .tx-toolbar-basic { border-bottom: 1px solid #ddd !important; }
        .is-write-page .tx-toolbar-advanced, .is-write-page .write_infobox, .is-write-page .file_upload_info { display: none !important; }

        /* 데스크탑 뷰포트 복원 */
        @media screen and (min-width: 1161px) {
            html, body, #wrap, #top { width: 100% !important; overflow-x: auto !important; }
            #wrap, #top, .dcheader, #gnb_bar, .gnb, #container, .wrap_inner, .left_content, .center_content, .center_box,
            .view_content_wrap, .gall_content, .gall_comment {
                width: 1160px !important; margin: 0 auto !important;
            }
            #container { margin-top: 10px !important; }
            .center_box { width: auto !important; margin: 0 !important; padding: 0 !important; border: none !important; background: none !important; display: block !important; flex-wrap: nowrap; }
            .custom-bottom-controls form[name="frmSearch"] .search_left_box, .custom-bottom-controls form[name="frmSearch"] .search_right_box { display: flex !important; flex-grow: 1; }
            .custom-bottom-controls form[name="frmSearch"] select, .custom-bottom-controls form[name="frmSearch"] input[type="text"] { flex: 1; min-width: 50px; }
        }
    `);

    /**
     * =================================================================
     * ======================== Filter Module ==========================
     * =================================================================
     * 설명: 유저 글/댓글, IP 기반 필터링 로직을 담당합니다. (v1.0.1의 압축된 코드 유지)
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
            },
            SELECTORS: {
                POST_LIST_CONTAINER: 'table.gall_list tbody',
                COMMENT_CONTAINER: 'div.comment_box ul.cmt_list',
                POST_VIEW_LIST_CONTAINER: 'div.gall_exposure_list > ul',
                POST_ITEM: 'tr.ub-content',
                COMMENT_ITEM: 'li.ub-content',
                WRITER_INFO: '.ub-writer',
                IP_SPAN: 'span.ip',
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
            const settings = window.dcFilterSettings || {};
            const { masterDisabled = false, excludeRecommended = false, threshold = 0, ratioEnabled = false, ratioMin = '', ratioMax = '', blockGuestEnabled = false, telecomBlockEnabled = false } = settings;
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
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; padding-top:15px; border-top: 2px solid #ccc;"><div style="font-size:15px;color:#444;text-align:left;">창 여닫는 단축키: <b>Shift+s</b></div><button id="${this.CONSTANTS.UI_IDS.SAVE_BUTTON}" style="font-size:16px;border:2px solid #000;border-radius:4px;background:#fff; cursor: pointer; padding: 4px 10px;">저장 & 실행</button></div>`;
            document.body.appendChild(div);
            const input = document.getElementById(this.CONSTANTS.UI_IDS.THRESHOLD_INPUT);
            input.focus(); input.select();
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
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'LABEL' || e.target.id === FilterModule.CONSTANTS.UI_IDS.CLOSE_BUTTON) return;
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
        async getUserPostCommentSum(uid) {
            if (!window._dcinside_user_sum_cache) window._dcinside_user_sum_cache = {};
            if (window._dcinside_user_sum_cache[uid]) return window._dcinside_user_sum_cache[uid];
            const getCookie = (name) => { const v = `; ${document.cookie}`; const p = v.split(`; ${name}=`); if (p.length === 2) return p.pop().split(';').shift(); };
            let ci = getCookie(this.CONSTANTS.ETC.COOKIE_NAME_1) || getCookie(this.CONSTANTS.ETC.COOKIE_NAME_2);
            if (!ci) return null;
            return new Promise((resolve) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', this.CONSTANTS.API.USER_INFO, true); xhr.withCredentials = true;
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8'); xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                
                // --- 수정된 부분 시작 ---
                xhr.timeout = 5000; // 5초 타임아웃 설정
                xhr.ontimeout = () => {
                    console.warn(`DCinside User Filter: User info request for UID ${uid} timed out.`);
                    resolve(null);
                };
                // --- 수정된 부분 끝 ---

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const [post, comment] = xhr.responseText.split(',').map(x => parseInt(x, 10));
                        if (!isNaN(post) && !isNaN(comment)) {
                            const d = { sum: post + comment, post, comment };
                            window._dcinside_user_sum_cache[uid] = d;
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
        async addBlockedGuest(ip) { const s = window.dcFilterSettings || {}; if (s.blockedGuests && !s.blockedGuests.includes(ip)) { s.blockedGuests.push(ip); await this.setBlockedGuests(s.blockedGuests); } },
        async clearBlockedGuests() { await this.setBlockedGuests([]); },
        isUserBlocked({ sum, post, comment }) {
            const s = window.dcFilterSettings || {}; if (s.masterDisabled) return { sumBlocked: false, ratioBlocked: false };
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
            const s = window.dcFilterSettings || {}; if (!s.excludeRecommended || !this.isRecommendedContext()) return false;
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
            const s = window.dcFilterSettings || {}; const { masterDisabled, blockGuestEnabled, telecomBlockEnabled, blockConfig = {}, blockedGuests = [] } = s;
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
            const bodyObserver = new MutationObserver(mutations => mutations.forEach(m => m.addedNodes.forEach(n => {
                if (n.nodeType === 1 && !n.closest('.user_data')) { // 사용자 정보 팝업은 무시
                    targets.forEach(t => { if (n.matches(t.c)) attachObserver(n, t.i); else if (n.querySelectorAll) n.querySelectorAll(t.c).forEach(c => attachObserver(c, t.i)); });
                }
            })));
            targets.forEach(t => document.querySelectorAll(t.c).forEach(c => attachObserver(c, t.i)));
            bodyObserver.observe(document.body, { childList: true, subtree: true });
        },
        async reloadSettings() {
            window.dcFilterSettings = {
                masterDisabled: await GM_getValue(this.CONSTANTS.STORAGE_KEYS.MASTER_DISABLED, false), excludeRecommended: await GM_getValue(this.CONSTANTS.STORAGE_KEYS.EXCLUDE_RECOMMENDED, false),
                threshold: await GM_getValue(this.CONSTANTS.STORAGE_KEYS.THRESHOLD, 0), ratioEnabled: await GM_getValue(this.CONSTANTS.STORAGE_KEYS.RATIO_ENABLED, false),
                ratioMin: parseFloat(await GM_getValue(this.CONSTANTS.STORAGE_KEYS.RATIO_MIN, '')), ratioMax: parseFloat(await GM_getValue(this.CONSTANTS.STORAGE_KEYS.RATIO_MAX, '')),
                blockGuestEnabled: await GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_GUEST, false), telecomBlockEnabled: await GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_TELECOM, false),
                blockedGuests: await this.getBlockedGuests(), blockConfig: await GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG, {})
            };
        },
        async refilterAllContent() {
            await this.reloadSettings();
            const allContentItems = document.querySelectorAll([this.CONSTANTS.SELECTORS.POST_ITEM, this.CONSTANTS.SELECTORS.COMMENT_ITEM, `${this.CONSTANTS.SELECTORS.POST_VIEW_LIST_CONTAINER} > li`].join(', '));
            allContentItems.forEach(element => { if (!window.dcFilterSettings.masterDisabled) element.style.display = ''; this.applySyncBlock(element); this.applyAsyncBlock(element); });
            document.dispatchEvent(new CustomEvent('dcFilterRefiltered'));
        },
        handleVisibilityChange() { if (document.visibilityState === 'visible') this.refilterAllContent(); },
        async init() {
            if (window.dcFilterInitialized) return; window.dcFilterInitialized = true;
            await this.reloadSettings();
            if (window.dcFilterSettings.excludeRecommended && window.location.pathname.includes('/lists/') && this.isRecommendedContext()) return;
            const telecomBlockEnabled = await GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_TELECOM, false);
            if (telecomBlockEnabled) await this.regblockMobile(); else await this.delblockMobile();
            await this.refreshBlockedUidsCache();
            document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
            this.initializeUniversalObserver();
            window.addEventListener('keydown', async (e) => {
                if (e.shiftKey && (e.key === 's' || e.key === 'S')) { e.preventDefault(); const p = document.getElementById(this.CONSTANTS.UI_IDS.SETTINGS_PANEL); p ? p.remove() : await this.showSettings(); }
            });
            if (await GM_getValue(this.CONSTANTS.STORAGE_KEYS.THRESHOLD) === undefined) { await GM_setValue(this.CONSTANTS.STORAGE_KEYS.THRESHOLD, 0); await this.showSettings(); }
        }
    };

    /**
     * =================================================================
     * ========================== UI Module ============================
     * =================================================================
     * 설명: PC버전 UI를 모바일 친화적으로 변경하고, FilterModule의
     * 변경사항을 UI에 동기화하는 역할을 담당합니다. (v0.9의 안정적인 프록시 클릭 방식 채택)
     */
    const UIModule = {
        DATA_ATTR: 'data-custom-row-id',
        listMutationObserver: null,

        SELECTORS: {
            LIST_WRAP: '.gall_list_wrap, .list_wrap',
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
            UI_HIDDEN: 'filter-ui-hidden',
        },

        proxyClick(customItem, targetSelector, originalRow) {
            customItem.addEventListener('click', (e) => {
                const clickedElement = e.target;

                // 제목 링크 클릭 시 게시물로 이동
                if (clickedElement.closest('a.post-title-link')) {
                    const originalLink = originalRow.querySelector('.gall_tit a:not(.reply_numbox)');
                    if (originalLink) {
                        originalLink.click();
                    }
                }
                // 댓글 수 클릭 시, 원본의 '댓글만 보기' 링크를 클릭
                else if (clickedElement.closest('span.reply_num')) {
                    e.preventDefault();
                    const originalReplyLink = originalRow.querySelector('a.reply_numbox');
                    if (originalReplyLink) {
                        originalReplyLink.click();
                    }
                }
                // 작성자 닉네임 클릭 시 정보 팝업
                else if (clickedElement.closest('.author')) {
                    const originalAuthor = originalRow.querySelector('.gall_writer');
                    if (originalAuthor) originalAuthor.click();
                }
            });
        },

        updateItemVisibility(originalRow, mirroredItem) {
            const isDibeBlocked = originalRow.classList.contains('block-disable');
            const isUserFilterBlocked = originalRow.style.display === 'none';
            mirroredItem.style.display = (isDibeBlocked || isUserFilterBlocked) ? 'none' : 'block';
        },

        createMobileListItem(originalRow, index) {
            const titleContainer = originalRow.querySelector('.gall_tit');
            const writerEl = originalRow.querySelector('.gall_writer');
            const dateEl = originalRow.querySelector('.gall_date');
            if (!titleContainer || !writerEl || !dateEl) return null;

            const newItem = document.createElement('div');
            newItem.setAttribute(this.DATA_ATTR, index);
            newItem.className = `${this.CUSTOM_CLASSES.POST_ITEM} ${originalRow.className.replace('ub-content', '').trim()}`;

            if (originalRow.classList.contains('list_notice')) newItem.classList.add('notice');
            if (originalRow.classList.contains('gall_issue')) newItem.classList.add('concept');

            const postTitleDiv = document.createElement('div');
            postTitleDiv.className = 'post-title';

            const originalLink = titleContainer.querySelector('a');
            const subjectSpan = titleContainer.querySelector('.gall_subject');
            const replyNumSpan = titleContainer.querySelector('.reply_num');

            if (subjectSpan) {
                postTitleDiv.appendChild(subjectSpan.cloneNode(true));
            }

            if (originalLink) {
                const newLink = document.createElement('a');
                newLink.href = originalLink.href;
                newLink.textContent = originalLink.textContent;
                newLink.className = 'post-title-link';

                if (originalLink.target) {
                    newLink.target = originalLink.target;
                }
                postTitleDiv.appendChild(newLink);
            }

            if (replyNumSpan) {
                postTitleDiv.appendChild(replyNumSpan.cloneNode(true));
            }

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
            if (searchForm) {
                bottomControls.appendChild(searchForm);
            }
            if (pagination) {
                bottomControls.appendChild(pagination);
            }
            return bottomControls;
        },

        transformList(listWrap) {
            if (this.listMutationObserver) this.listMutationObserver.disconnect();

            listWrap.querySelector(`.${this.CUSTOM_CLASSES.MOBILE_LIST}`)?.remove();
            listWrap.querySelectorAll(`${this.SELECTORS.ORIGINAL_TABLE}.${this.CUSTOM_CLASSES.UI_HIDDEN}`).forEach(t => t.remove());

            const originalTable = listWrap.querySelector(`${this.SELECTORS.ORIGINAL_TABLE}:not(.${this.CUSTOM_CLASSES.UI_HIDDEN})`);
            if (!originalTable) return;

            const originalTbody = originalTable.querySelector(this.SELECTORS.ORIGINAL_TBODY);
            if (!originalTbody) return;

            const newListContainer = document.createElement('div');
            newListContainer.className = this.CUSTOM_CLASSES.MOBILE_LIST;

            const originalRows = Array.from(originalTbody.querySelectorAll(this.SELECTORS.ORIGINAL_POST_ITEM));
            originalRows.forEach((row, index) => {
                row.setAttribute(this.DATA_ATTR, index);
                const newItem = this.createMobileListItem(row, index);
                if (newItem) {
                    this.proxyClick(newItem, '.gall_tit a, .gall_writer', row);
                    newListContainer.appendChild(newItem);
                }
            });

            let bottomControls = listWrap.querySelector(`.${this.CUSTOM_CLASSES.BOTTOM_CONTROLS}`);
            if (bottomControls) {
                listWrap.insertBefore(newListContainer, bottomControls);
            } else {
                listWrap.appendChild(newListContainer);
                bottomControls = this.createBottomControls(listWrap);
                if (bottomControls) {
                    listWrap.appendChild(bottomControls);
                }
            }

            originalTable.classList.add(this.CUSTOM_CLASSES.UI_HIDDEN);

            this.listMutationObserver = new MutationObserver(mutations => {
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

            this.listMutationObserver.observe(originalTbody, {
                attributes: true,
                attributeFilter: ['style', 'class'],
                subtree: true
            });
        },

        transformWritePage() {
            document.body.classList.add('is-write-page');
        },

        init() {
            if (window.dcUiInitialized) return;
            window.dcUiInitialized = true;

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
                document.querySelectorAll(this.SELECTORS.LIST_WRAP).forEach(lw => {
                    this.transformList(lw);
                });
            };

            processAllLists();

            const observer = new MutationObserver((mutations) => {
                let needsReprocessing = false;
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.matches(this.SELECTORS.ORIGINAL_TABLE) && node.closest(this.SELECTORS.LIST_WRAP)) {
                                needsReprocessing = true;
                                break;
                            }
                            if (node.matches(this.SELECTORS.LIST_WRAP) || node.querySelector(this.SELECTORS.LIST_WRAP)) {
                                needsReprocessing = true;
                                break;
                            }
                        }
                    }
                    if (needsReprocessing) break;
                }

                if (needsReprocessing) {
                    observer.disconnect();
                    processAllLists();
                    observer.observe(document.body, { childList: true, subtree: true });
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
        console.log("[DC Filter+UI] Initializing...");
        await FilterModule.init();
        UIModule.init();
        console.log("[DC Filter+UI] Initialization complete.");
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }

    window.addEventListener('pageshow', function(event) {
        if (event.persisted) {
            console.log("[DC Filter+UI] Page loaded from bfcache. Forcing reload for UI consistency.");
            location.reload();
        }
    });

})();
