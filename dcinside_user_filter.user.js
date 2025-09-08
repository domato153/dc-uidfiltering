// ==UserScript==
// @name         DCInside 유저 필터
// @namespace    http://tampermonkey.net/
// @version      1.7.1
// @description  글/댓글 합/비율 필터링, 유동/통신사 IP 차단 + 개인 차단 기능
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

    // [v1.7.0 이식] 개인 차단 기능 UI를 위한 스타일 추가
    GM_addStyle(`
        /* [v1.7.2 수정] FOUC(깜빡임) 방지: 스크립트 준비 완료 전까지 본문 숨김 */
        body:not(.dc-filter-ready) {
            visibility: hidden !important;
        }
        /* 로딩 중 표시 (선택 사항) */
        body:not(.dc-filter-ready)::before {
            content: '유저 필터 적용 중...';
            visibility: visible !important;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 16px;
            font-weight: bold;
            color: #555;
            background-color: #f0f0f0;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0,0,0,0.2);
            z-index: 2147483647;
        }

        /* --- 개인 차단 기능 UI --- */
        #dc-personal-block-fab {
            position: fixed;
            bottom: 20px; right: 20px;
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
            cursor: pointer;
            user-select: none;
            transition: transform 0.2s ease-out;
        }
        #dc-personal-block-fab:active {
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
        #dc-selection-popup .block-option span { font-size: 15px; color: #333; word-break: break-all; margin-right: 15px; text-align: left; }
        #dc-selection-popup .block-option button { font-size: 14px; padding: 6px 12px; cursor: pointer; border: none; border-radius: 6px; background-color: #4263eb; color: #fff; font-weight: 500; }
        #dc-selection-popup .popup-buttons button { width: 100%; font-size: 16px; padding: 10px; cursor: pointer; border: none; border-radius: 8px; background-color: #e9ecef; color: #555; }
        body.selection-mode-active .gall_writer,
        body.selection-mode-active .ub-writer {
            cursor: pointer !important;
            outline: 2px dashed #4263eb;
        }


        #dc-block-management-panel-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 2147483645;
        }
        #dc-block-management-panel {
            position: fixed;
            top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #f9f9f9;
            border: 1px solid #ccc;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 2147483646;
            display: flex;
            flex-direction: column;
            width: 400px; height: 500px;
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
        #dc-block-management-panel .panel-backup-btn {
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
            display: flex; justify-content: space-between; align-items: center;
            padding: 10px; border-top: 1px solid #ccc; background: #f9f9f9;
        }
        #dc-block-management-panel .panel-footer-left { display: flex; align-items: center; }
        #dc-block-management-panel .panel-save-btn { padding: 8px 16px; font-size: 14px; background: #3b71fd; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
        #dc-block-management-panel .panel-resize-handle { position: absolute; right: 0; bottom: 0; width: 15px; height: 15px; cursor: nwse-resize; }
        .switch-container { display: flex; align-items: center; margin-left: 15px; }
        .switch { position: relative; display: inline-block; width: 40px; height: 22px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .switch-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 22px; }
        .switch-slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .switch-slider { background-color: #3b71fd; }
        input:checked + .switch-slider:before { transform: translateX(18px); }
        #dc-backup-popup-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.6); z-index: 2147483647;
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
        #dc-backup-popup label { font-size: 14px; font-weight: bold; }
        #dc-backup-popup .description { font-size: 12px; color: #666; margin-bottom: 5px; }
        #dc-backup-popup textarea { width: 100%; box-sizing: border-box; height: 100px; resize: vertical; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; font-family: monospace; }
        #dc-backup-popup button { padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
        #dc-backup-popup .export-btn { background-color: #28a745; color: white; width: 100%; }
        /* [v1.7.1 수정] 백업/복원 UI 수정 */
        #dc-backup-popup .import-controls { display: flex; align-items: stretch; gap: 8px; }
        #dc-backup-popup .import-controls textarea { flex-grow: 1; }
        #dc-backup-popup .import-btn { background-color: #007bff; color: white; flex-shrink: 0; }

        /* --- [최종 수정] 야간 모드 지원 스타일 (JS 연동) --- */
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
        /* 설정창 헤더/푸터/구분선 */
        body.dc-filter-dark-mode #dcinside-filter-setting > div:first-child,
        body.dc-filter-dark-mode #dcinside-filter-setting > div:last-child {
            border-color: #4a4a4a !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting hr {
            border-top-color: #4a4a4a !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting div,
        body.dc-filter-dark-mode #dcinside-filter-setting label,
        body.dc-filter-dark-mode #dcinside-filter-setting h3,
        body.dc-filter-dark-mode #dcinside-filter-setting b,
        body.dc-filter-dark-mode #dc-selection-popup h4,
        body.dc-filter-dark-mode #dc-selection-popup .block-option span,
        body.dc-filter-dark-mode #dc-backup-popup .description,
        body.dc-filter-dark-mode #dc-backup-popup h4 {
            color: #e0e0e0 !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting a {
            color: #8ab4f8 !important;
        }
        /* 입력 필드 */
        body.dc-filter-dark-mode input[type="number"],
        body.dc-filter-dark-mode #dc-backup-popup textarea {
            background-color: #1e1e1e !important;
            color: #f0f0f0 !important;
            border: 1px solid #666 !important;
        }
        /* 각종 버튼 */
        body.dc-filter-dark-mode #dcinside-filter-setting #dcinside-threshold-save,
        body.dc-filter-dark-mode #dc-block-management-panel .select-all-btn,
        body.dc-filter-dark-mode #dc-block-management-panel .select-all-global-btn,
        body.dc-filter-dark-mode #dc-block-management-panel .panel-backup-btn {
            background-color: #555 !important;
            color: #fff !important;
            border-color: #777 !important;
        }
        body.dc-filter-dark-mode #dc-selection-popup .popup-buttons button,
        body.dc-filter-dark-mode #dcinside-shortcut-modal button:last-child {
            background-color: #444 !important;
            color: #ccc !important;
        }
        /* 차단 관리 패널 */
        body.dc-filter-dark-mode #dc-block-management-panel .panel-header,
        body.dc-filter-dark-mode #dc-block-management-panel .panel-footer,
        body.dc-filter-dark-mode #dc-backup-popup .popup-header {
            background: #252525 !important;
            border-color: #4a4a4a !important;
        }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-tabs,
        body.dc-filter-dark-mode #dc-block-management-panel .panel-body,
        body.dc-filter-dark-mode #dc-selection-popup .block-option {
            background: #3a3a3c !important;
            border-color: #4a4a4a !important;
        }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-tab {
            border-right-color: #555 !important;
        }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-list-controls,
        body.dc-filter-dark-mode #dc-block-management-panel .blocked-item {
            background-color: #2d2d2d !important;
            border-color: #4a4a4a !important;
        }
        /* 닫기 버튼 */
        body.dc-filter-dark-mode #dcinside-filter-setting #dcinside-filter-close,
        body.dc-filter-dark-mode #dc-block-management-panel .panel-close-btn,
        body.dc-filter-dark-mode #dc-backup-popup .popup-close-btn {
            color: #ccc !important;
        }
    `);

    // ... (이하 코드는 v1.7.0과 동일하므로 생략) ...
    // [이식] 현재 활성화된 단축키 객체를 저장하기 위한 변수
    let activeShortcutObject = null;

    // =================================================================
    // =========== 통신사 IP 차단 기능을 위한 데이터 (기존 기능) ===========
    // =================================================================
    const TELECOM = [
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
    ];


    const CONSTANTS = {
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
            SHORTCUT_KEY: 'dcinside_shortcut_key', // 단축키 저장 키
            // [v1.7.0 이식] 개인 차단 기능용 저장 키
            PERSONAL_BLOCK_LIST: 'dcinside_personal_block_list',
            PERSONAL_BLOCK_ENABLED: 'dcinside_personal_block_enabled',
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
    };

    // 개념글 관련 기능용 헬퍼 함수
    function isRecommendedContext() {
        return window.location.search.includes('exception_mode=recommend');
    }

    async function regblockMobile() {
        let conf = await GM_getValue(CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG, {});
        if (conf.ip && conf.ip.includes(CONSTANTS.ETC.MOBILE_IP_MARKER)) {
            return;
        }

        let ip_arr = [CONSTANTS.ETC.MOBILE_IP_MARKER];
        const len = TELECOM.length;
        for (let i = 0; i < len; i++) {
            const sublen = TELECOM[i][1].length;
            for (let j = 0; j < sublen; j++) {
                if (TELECOM[i][1][j][2] === 'MOB') {
                    const ip_prefix = TELECOM[i][0] + '.' + TELECOM[i][1][j][0];
                    ip_arr.push(ip_prefix);
                }
            }
        }

        const mobile_ips_string = ip_arr.join('||');
        conf.ip = conf.ip ? conf.ip + '||' + mobile_ips_string : mobile_ips_string;

        await GM_setValue(CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG, conf);
    }

    async function delblockMobile() {
        let conf = await GM_getValue(CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG, {});
        if (conf.ip && conf.ip.includes(CONSTANTS.ETC.MOBILE_IP_MARKER)) {
            const user_ips = conf.ip.split('||' + CONSTANTS.ETC.MOBILE_IP_MARKER)[0];
            conf.ip = user_ips.endsWith('||') ? user_ips.slice(0, -2) : user_ips;
            if (conf.ip === CONSTANTS.ETC.MOBILE_IP_MARKER || !conf.ip) {
                conf.ip = '';
            }
            await GM_setValue(CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG, conf);
        }
    }

    async function showSettings() {
        await reloadSettings();
        const settings = window.dcFilterSettings || {};
        const {
            masterDisabled = false,
            excludeRecommended = false,
            threshold = 0,
            ratioEnabled = false,
            ratioMin = '',
            ratioMax = '',
            blockGuestEnabled = false,
            telecomBlockEnabled = false
        } = settings;

        const currentShortcut = await GM_getValue(CONSTANTS.STORAGE_KEYS.SHORTCUT_KEY, 'Shift+S');

        const existingDiv = document.getElementById(CONSTANTS.UI_IDS.SETTINGS_PANEL);
        if (existingDiv) {
            existingDiv.remove();
        }

        const div = document.createElement('div');
        div.id = CONSTANTS.UI_IDS.SETTINGS_PANEL;
        div.style = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:24px 20px 18px 20px;min-width:280px;z-index:99999;border:2px solid #333;border-radius:10px;box-shadow:0 0 10px #0008; cursor: move; user-select: none;';

        div.innerHTML = `
            <div style="margin-bottom:15px;padding-bottom:12px;border-bottom: 2px solid #ccc; display:flex;align-items:center; justify-content: space-between;">
                <div style="display:flex; align-items: center;">
                    <div>
                        <input id="${CONSTANTS.UI_IDS.MASTER_DISABLE_CHECKBOX}" type="checkbox" style="vertical-align:middle;width:16px;height:16px;" ${masterDisabled ? 'checked' : ''}>
                        <label for="${CONSTANTS.UI_IDS.MASTER_DISABLE_CHECKBOX}" style="font-size:16px;vertical-align:middle;cursor:pointer;margin-left:6px;"><b>모든 기능 끄기</b></label>
                    </div>
                    <div style="margin-left: 15px; border-left: 2px solid #ccc; padding-left: 15px;">
                        <input id="${CONSTANTS.UI_IDS.EXCLUDE_RECOMMENDED_CHECKBOX}" type="checkbox" style="vertical-align:middle;width:16px;height:16px;" ${excludeRecommended ? 'checked' : ''}>
                        <label for="${CONSTANTS.UI_IDS.EXCLUDE_RECOMMENDED_CHECKBOX}" style="font-size:14px;vertical-align:middle;cursor:pointer;margin-left:6px;"><b>개념글 제외</b></label>
                    </div>
                </div>
                <div>
                    <button id="${CONSTANTS.UI_IDS.CLOSE_BUTTON}" style="background:none;border:none;font-size:24px;cursor:pointer;line-height:1;padding:0 4px;color:#555;">✕</button>
                </div>
            </div>
            <div id="${CONSTANTS.UI_IDS.SETTINGS_CONTAINER}" style="opacity:${masterDisabled ? 0.5 : 1}; pointer-events:${masterDisabled ? 'none' : 'auto'};">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <h3 style="cursor: default;margin-top:0;margin-bottom:5px;">
                            유저 글+댓글 합 기준값(이 값 이하 차단)
                        </h3>
                        <input id="${CONSTANTS.UI_IDS.THRESHOLD_INPUT}" type="number" min="0" value="${threshold}" style="width:80px;font-size:16px; cursor: initial;">
                        <div style="font-size:13px;color:#666;margin-top:5px;">0 또는 빈칸으로 두면 비활성화됩니다.</div>
                    </div>
                    <div style="border: 2px solid #000; border-radius: 5px; padding: 8px 8px 5px 6px;">
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 5px;">
                            <span style="display:inline-flex; align-items:center; gap:4px; padding-bottom: 5px; border-bottom: 1px solid #ddd;">
                                <input id="${CONSTANTS.UI_IDS.BLOCK_GUEST_CHECKBOX}" type="checkbox" ${blockGuestEnabled ? 'checked' : ''} style="vertical-align:middle;">
                                <label for="${CONSTANTS.UI_IDS.BLOCK_GUEST_CHECKBOX}" style="font-size:13px;vertical-align:middle;cursor:pointer;">유동 전체 차단</label>
                            </span>
                            <span style="display:inline-flex; align-items:center; gap:4px; margin-top: 5px;">
                                <input id="${CONSTANTS.UI_IDS.TELECOM_BLOCK_CHECKBOX}" type="checkbox" ${telecomBlockEnabled ? 'checked' : ''} style="vertical-align:middle;">
                                <label for="${CONSTANTS.UI_IDS.TELECOM_BLOCK_CHECKBOX}" style="font-size:13px;vertical-align:middle;cursor:pointer;">통신사 IP 차단</label>
                            </span>
                        </div>
                    </div>
                </div>
                <hr style="border:0;border-top:2px solid #222;margin:16px 0 12px 0;">
                <div style="margin-bottom:8px;display:flex;align-items:center;">
                    <input id="${CONSTANTS.UI_IDS.RATIO_ENABLE_CHECKBOX}" type="checkbox" style="vertical-align:middle;" ${ratioEnabled ? 'checked' : ''}>
                    <label for="${CONSTANTS.UI_IDS.RATIO_ENABLE_CHECKBOX}" style="font-size:15px;vertical-align:middle;cursor:pointer;margin-left:4px;">글/댓글 비율 필터 사용</label>
                </div>
                <div id="${CONSTANTS.UI_IDS.RATIO_SECTION}">
                    <div style="display:flex;gap:10px;align-items:center;">
                        <div style="display:flex;flex-direction:column;align-items:center;">
                            <label for="${CONSTANTS.UI_IDS.RATIO_MIN_INPUT}" style="font-size:14px;">댓글/글 비율 일정 이상 차단 </label>
                            <div style="font-size:12px;color:#888;line-height:1.2;">(댓글만 많은 놈)</div>
                            <input id="${CONSTANTS.UI_IDS.RATIO_MIN_INPUT}" type="number" step="any" placeholder="예: 10" value="${ratioMin !== '' ? ratioMin : ''}" style="width:100px;font-size:15px;text-align:center; margin-top: 4px;">
                        </div>
                        <div style="display:flex;flex-direction:column;align-items:center;">
                            <label for="${CONSTANTS.UI_IDS.RATIO_MAX_INPUT}" style="font-size:14px;">글/댓글 비율 일정 이상 차단 </label>
                            <div style="font-size:12px;color:#888;line-height:1.2;">(글만 많은 놈)</div>
                            <input id="${CONSTANTS.UI_IDS.RATIO_MAX_INPUT}" type="number" step="any" placeholder="예: 1" value="${ratioMax !== '' ? ratioMax : ''}" style="width:100px;font-size:15px;text-align:center; margin-top: 4px;">
                        </div>
                    </div>
                    <div style="margin-top:8px;font-size:13px;color:#666;text-align:left;">비율이 입력값과 같거나 큰(이상)인 유저를 차단합니다.</div>
                </div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; padding-top:15px; border-top: 2px solid #ccc;">
                <div style="font-size:15px;color:#444;text-align:left;">
                    창 여닫는 단축키: <b id="${CONSTANTS.UI_IDS.SHORTCUT_DISPLAY}">${currentShortcut}</b>
                    <a href="#" id="${CONSTANTS.UI_IDS.CHANGE_SHORTCUT_BTN}" style="margin-left: 8px; font-size: 13px; text-decoration: underline; cursor: pointer;">(변경)</a>
                </div>
                <button id="${CONSTANTS.UI_IDS.SAVE_BUTTON}" style="font-size:16px;border:2px solid #000;border-radius:4px;background:#fff; cursor: pointer; padding: 4px 10px;">저장 & 실행</button>
            </div>
        `;
        document.body.appendChild(div);

        document.getElementById(CONSTANTS.UI_IDS.CHANGE_SHORTCUT_BTN).onclick = (e) => {
            e.preventDefault();
            showShortcutChanger();
        };

        const input = document.getElementById(CONSTANTS.UI_IDS.THRESHOLD_INPUT);
        input.focus();
        input.select();

        const masterDisableCheckbox = document.getElementById(CONSTANTS.UI_IDS.MASTER_DISABLE_CHECKBOX);
        const settingsContainer = document.getElementById(CONSTANTS.UI_IDS.SETTINGS_CONTAINER);

        function updateMasterState() {
            const isMasterDisabled = masterDisableCheckbox.checked;
            settingsContainer.style.opacity = isMasterDisabled ? 0.5 : 1;
            settingsContainer.style.pointerEvents = isMasterDisabled ? 'none' : 'auto';
        }
        masterDisableCheckbox.addEventListener('change', updateMasterState);
        updateMasterState();

        const ratioSection = document.getElementById(CONSTANTS.UI_IDS.RATIO_SECTION);
        const ratioEnableCheckbox = document.getElementById(CONSTANTS.UI_IDS.RATIO_ENABLE_CHECKBOX);
        const ratioMinInput = document.getElementById(CONSTANTS.UI_IDS.RATIO_MIN_INPUT);
        const ratioMaxInput = document.getElementById(CONSTANTS.UI_IDS.RATIO_MAX_INPUT);

        function updateRatioSectionState() {
            const enabled = ratioEnableCheckbox.checked;
            ratioSection.style.opacity = enabled ? 1 : 0.5;
            ratioMinInput.disabled = !enabled;
            ratioMaxInput.disabled = !enabled;
        }
        ratioEnableCheckbox.addEventListener('change', updateRatioSectionState);
        updateRatioSectionState();

        document.getElementById(CONSTANTS.UI_IDS.CLOSE_BUTTON).onclick = function() { div.remove(); };

        const saveButton = document.getElementById(CONSTANTS.UI_IDS.SAVE_BUTTON);

        const enterKeySave = (e) => { if (e.key === 'Enter') saveButton.click(); };
        input.addEventListener('keydown', enterKeySave);
        ratioMinInput.addEventListener('keydown', enterKeySave);
        ratioMaxInput.addEventListener('keydown', enterKeySave);

        let isDragging = false, offsetX, offsetY;
        div.addEventListener('mousedown', function(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'LABEL' || e.target.id === CONSTANTS.UI_IDS.CLOSE_BUTTON || e.target.id === CONSTANTS.UI_IDS.CHANGE_SHORTCUT_BTN) return;
            isDragging = true;
            const rect = div.getBoundingClientRect();
            if (div.style.transform !== 'none') {
                div.style.transform = 'none';
                div.style.left = `${rect.left}px`;
                div.style.top = `${rect.top}px`;
            }
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp, { once: true });
        });

        function onMouseMove(e) {
            if (!isDragging) return;
            e.preventDefault();
            const rect = div.getBoundingClientRect();
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;
            newX = Math.max(0, Math.min(newX, window.innerWidth - rect.width));
            newY = Math.max(0, Math.min(newY, window.innerHeight - rect.height));
            div.style.left = `${newX}px`;
            div.style.top = `${newY}px`;
        }
        function onMouseUp() {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
        }

        saveButton.onclick = async function() {
            saveButton.disabled = true;
            saveButton.textContent = '저장 중...';

            const blockGuestChecked = document.getElementById(CONSTANTS.UI_IDS.BLOCK_GUEST_CHECKBOX).checked;
            let val = parseInt(document.getElementById(CONSTANTS.UI_IDS.THRESHOLD_INPUT).value, 10);
            if (isNaN(val)) val = 0;

            const promises = [
                GM_setValue(CONSTANTS.STORAGE_KEYS.MASTER_DISABLED, document.getElementById(CONSTANTS.UI_IDS.MASTER_DISABLE_CHECKBOX).checked),
                GM_setValue(CONSTANTS.STORAGE_KEYS.EXCLUDE_RECOMMENDED, document.getElementById(CONSTANTS.UI_IDS.EXCLUDE_RECOMMENDED_CHECKBOX).checked),
                GM_setValue(CONSTANTS.STORAGE_KEYS.THRESHOLD, val),
                GM_setValue(CONSTANTS.STORAGE_KEYS.RATIO_ENABLED, document.getElementById(CONSTANTS.UI_IDS.RATIO_ENABLE_CHECKBOX).checked),
                GM_setValue(CONSTANTS.STORAGE_KEYS.RATIO_MIN, document.getElementById(CONSTANTS.UI_IDS.RATIO_MIN_INPUT).value),
                GM_setValue(CONSTANTS.STORAGE_KEYS.RATIO_MAX, document.getElementById(CONSTANTS.UI_IDS.RATIO_MAX_INPUT).value),
                GM_setValue(CONSTANTS.STORAGE_KEYS.BLOCK_GUEST, blockGuestChecked),
                GM_setValue(CONSTANTS.STORAGE_KEYS.BLOCK_TELECOM, document.getElementById(CONSTANTS.UI_IDS.TELECOM_BLOCK_CHECKBOX).checked)
            ];

            if (!blockGuestChecked) {
                promises.push(clearBlockedGuests());
            }

            try {
                await Promise.all(promises);
                location.reload();
            } catch (error) {
                console.error('DCinside User Filter: Settings save failed.', error);
                saveButton.disabled = false;
                saveButton.textContent = '저장 & 실행';
                alert('설정 저장에 실패했습니다. 콘솔을 확인해주세요.');
            }
        };
    }

    function showShortcutChanger() {
        if (document.getElementById(CONSTANTS.UI_IDS.SHORTCUT_MODAL)) return;

        const settingsPanel = document.getElementById(CONSTANTS.UI_IDS.SETTINGS_PANEL);
        settingsPanel.style.pointerEvents = 'none';

        const overlay = document.createElement('div');
        overlay.id = CONSTANTS.UI_IDS.SHORTCUT_MODAL_OVERLAY;
        overlay.style = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 100000;';
        document.body.appendChild(overlay);

        const modal = document.createElement('div');
        modal.id = CONSTANTS.UI_IDS.SHORTCUT_MODAL;
        modal.style = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff; padding: 20px; border-radius: 8px; z-index: 100001; text-align: center; box-shadow: 0 0 15px rgba(0,0,0,0.3);';
        modal.innerHTML = `
            <h4 style="margin-top: 0; margin-bottom: 15px; font-size: 16px;">새로운 단축키를 입력하세요 (최대 3개)</h4>
            <div id="${CONSTANTS.UI_IDS.NEW_SHORTCUT_PREVIEW}" style="min-width: 200px; height: 40px; line-height: 40px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 20px; font-size: 18px; font-weight: bold; color: #333;">입력 대기 중...</div>
            <div>
                <button id="${CONSTANTS.UI_IDS.SAVE_SHORTCUT_BTN}" style="padding: 8px 16px; margin-right: 10px; border: 1px solid #3b71fd; background: #3b71fd; color: #fff; border-radius: 4px; cursor: pointer;">변경</button>
                <button id="${CONSTANTS.UI_IDS.CANCEL_SHORTCUT_BTN}" style="padding: 8px 16px; border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px; cursor: pointer;">취소</button>
            </div>
        `;
        document.body.appendChild(modal);

        let pressedKeys = new Set();
        let combinationTimeout = null;
        const previewEl = document.getElementById(CONSTANTS.UI_IDS.NEW_SHORTCUT_PREVIEW);

        const updatePreview = () => {
            if (pressedKeys.size > 0) {
                previewEl.textContent = formatShortcutKeys(pressedKeys);
            } else {
                previewEl.textContent = '입력 대기 중...';
            }
        };

        const keydownHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            clearTimeout(combinationTimeout);
            if (pressedKeys.size < 3) {
                pressedKeys.add(e.key);
                updatePreview();
            }
            combinationTimeout = setTimeout(() => {
                pressedKeys.clear();
            }, 500);
        };

        const keyupHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
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

        document.getElementById(CONSTANTS.UI_IDS.SAVE_SHORTCUT_BTN).onclick = async () => {
            const newShortcut = previewEl.textContent;
            if (newShortcut && newShortcut !== '입력 대기 중...') {
                await GM_setValue(CONSTANTS.STORAGE_KEYS.SHORTCUT_KEY, newShortcut);
                activeShortcutObject = parseShortcutString(newShortcut);
                document.getElementById(CONSTANTS.UI_IDS.SHORTCUT_DISPLAY).textContent = newShortcut;
                cleanup();
            } else {
                alert('유효한 단축키를 입력해주세요.');
            }
        };

        document.getElementById(CONSTANTS.UI_IDS.CANCEL_SHORTCUT_BTN).onclick = cleanup;
        overlay.onclick = cleanup;
    }

    function formatShortcutKeys(keySet) {
        if (keySet.size === 0) return '';
        const priority = ['Control', 'Meta', 'Alt', 'Shift', 'CapsLock', 'Tab'];
        const keys = Array.from(keySet);
        const modifiers = keys
            .filter(k => priority.includes(k))
            .sort((a, b) => priority.indexOf(a) - priority.indexOf(b));
        const others = keys
            .filter(k => !priority.includes(k) && k.length === 1)
            .sort();
        return [...modifiers, ...others].map(k => k === 'Control' ? 'Ctrl' : k).join('+');
    }

    function parseShortcutString(shortcutString) {
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
    }


    GM_registerMenuCommand('글댓합 설정하기', showSettings);
    // [v1.7.0 이식] 차단 유저 관리 메뉴 추가
    GM_registerMenuCommand('차단 유저 관리', () => PersonalBlockModule.createManagementPanel());


    async function getUserPostCommentSum(uid) {
        if (!window._dcinside_user_sum_cache) window._dcinside_user_sum_cache = {};
        if (window._dcinside_user_sum_cache[uid]) return window._dcinside_user_sum_cache[uid];

        function getCookie(name) {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
        }
        let ci = getCookie(CONSTANTS.ETC.COOKIE_NAME_1) || getCookie(CONSTANTS.ETC.COOKIE_NAME_2);
        if (!ci) return null;

        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', CONSTANTS.API.USER_INFO, true);
            xhr.withCredentials = true;
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            xhr.onload = function() {
                const text = xhr.responseText;
                const [post, comment] = text.split(',').map(x => parseInt(x, 10));
                if (!isNaN(post) && !isNaN(comment)) {
                    const userData = { sum: post + comment, post, comment };
                    window._dcinside_user_sum_cache[uid] = userData;
                    resolve(userData);
                } else {
                    resolve(null);
                }
            };
            xhr.onerror = () => resolve(null);
            xhr.send(`ci_t=${encodeURIComponent(ci)}&user_id=${encodeURIComponent(uid)}`);
        });
    }

    const BLOCK_UID_EXPIRE = 1000 * 60 * 60 * 24 * 7;
    let BLOCKED_UIDS_CACHE = {};

    async function addBlockedUid(uid, sum, post, comment, ratioBlocked) {
        await refreshBlockedUidsCache(true);
        BLOCKED_UIDS_CACHE[uid] = { ts: Date.now(), sum, post, comment, ratioBlocked: !!ratioBlocked };
        await GM_setValue(CONSTANTS.STORAGE_KEYS.BLOCKED_UIDS, JSON.stringify(BLOCKED_UIDS_CACHE));
    }

    async function getBlockedGuests() {
        let data = await GM_getValue(CONSTANTS.STORAGE_KEYS.BLOCKED_GUESTS, '[]');
        try { return JSON.parse(data); } catch { return []; }
    }

    async function setBlockedGuests(list) {
        await GM_setValue(CONSTANTS.STORAGE_KEYS.BLOCKED_GUESTS, JSON.stringify(list));
    }

    async function addBlockedGuest(ip) {
        const settings = window.dcFilterSettings || {};
        if (settings.blockedGuests && !settings.blockedGuests.includes(ip)) {
             settings.blockedGuests.push(ip);
             await setBlockedGuests(settings.blockedGuests);
        }
    }

    async function clearBlockedGuests() {
        await setBlockedGuests([]);
    }

    function isUserBlocked({ sum, post, comment }) {
        const settings = window.dcFilterSettings || {};
        if (settings.masterDisabled) return { sumBlocked: false, ratioBlocked: false };

        let sumBlocked = settings.threshold > 0 && sum > 0 && sum <= settings.threshold;

        let ratioBlocked = false;
        if (settings.ratioEnabled) {
            const useMin = !isNaN(settings.ratioMin) && settings.ratioMin > 0;
            const useMax = !isNaN(settings.ratioMax) && settings.ratioMax > 0;

            if (useMin || useMax) {
                const ratioCommentPerPost = (post > 0) ? (comment / post) : (comment > 0 ? Infinity : 0);
                const ratioPostPerComment = (comment > 0) ? (post / comment) : (post > 0 ? Infinity : 0);

                if (useMin && ratioCommentPerPost >= settings.ratioMin) ratioBlocked = true;
                if (!ratioBlocked && useMax && ratioPostPerComment >= settings.ratioMax) ratioBlocked = true;
            }
        }
        return { sumBlocked, ratioBlocked };
    }

    async function applyBlockFilterToElement(element, uid, userData, addBlockedUidFn) {
        if (!userData) return;
        const { sumBlocked, ratioBlocked } = isUserBlocked(userData);
        const shouldBeBlocked = sumBlocked || ratioBlocked;

        if (element.style.display !== 'none') {
             element.style.display = shouldBeBlocked ? 'none' : '';
        }

        if (shouldBeBlocked) {
            await addBlockedUidFn(uid, userData.sum, userData.post, userData.comment, ratioBlocked);
        }
    }

    function shouldSkipFiltering(element) {
        const settings = window.dcFilterSettings || {};
        if (!settings.excludeRecommended || !isRecommendedContext()) {
            return false;
        }
        if (window.location.pathname.includes('/view/')) {
            // 본문 영역은 필터링을 건너뛰고, 댓글 영역은 필터링을 수행합니다.
            if (element.closest(CONSTANTS.SELECTORS.COMMENT_CONTAINER)) {
                return false;
            }
            return true;
        }
        // 목록 페이지의 경우 필터링을 건너뜁니다.
        return true;
    }

    async function applyAsyncBlock(element) {
        // [리팩토링] 개인 차단은 sync에서 처리되므로, 이 함수에서는 '개념글 제외' 옵션만 확인합니다.
        if (shouldSkipFiltering(element)) {
            return; // 글댓합/비율 필터링을 건너뜁니다.
        }

        try {
            if (element.style.display === 'none') return;

            const writerInfo = element.querySelector(CONSTANTS.SELECTORS.WRITER_INFO);
            if (!writerInfo) return;

            const uid = writerInfo.getAttribute('data-uid');
            if (!uid || uid.length < 3) return;

            if (BLOCKED_UIDS_CACHE[uid]) return;

            const userData = await getUserPostCommentSum(uid);
            if (!userData) return;
            await applyBlockFilterToElement(element, uid, userData, addBlockedUid);

        } catch (e) {
            console.warn(`DCinside User Filter: Async filter exception.`, e, element);
        }
    }

    async function refreshBlockedUidsCache() {
        let data = await GM_getValue(CONSTANTS.STORAGE_KEYS.BLOCKED_UIDS, '{}');
        try { BLOCKED_UIDS_CACHE = JSON.parse(data); } catch { BLOCKED_UIDS_CACHE = {}; }

        const now = Date.now();
        let changed = false;
        for (const [uid, cacheData] of Object.entries(BLOCKED_UIDS_CACHE)) {
            if (typeof cacheData !== 'object' || cacheData === null || typeof cacheData.ts !== 'number') {
                delete BLOCKED_UIDS_CACHE[uid];
                changed = true;
                continue;
            }
            if (now - cacheData.ts > BLOCK_UID_EXPIRE) {
                delete BLOCKED_UIDS_CACHE[uid]; changed = true;
            }
        }
        if (changed) await GM_setValue(CONSTANTS.STORAGE_KEYS.BLOCKED_UIDS, JSON.stringify(BLOCKED_UIDS_CACHE));
    }

    /**
     * [v1.7.1 리팩토링]
     * 필터링 로직을 v2.5.4 버전처럼 재구성하여 요구사항을 만족시킵니다.
     * 1. 개인 차단 필터를 최우선으로, 다른 설정과 독립적으로 실행합니다.
     * 2. 개인 차단 대상이 아닌 경우에만 '개념글 제외', '모든 기능 끄기' 옵션을 확인합니다.
     * 3. 모든 조건을 통과한 후에야 글댓합, 통피 등 나머지 필터를 적용합니다.
     */
    function applySyncBlock(element) {
        const settings = window.dcFilterSettings || {};
        const { masterDisabled, blockGuestEnabled, telecomBlockEnabled, blockConfig = {}, blockedGuests = [], personalBlockList, personalBlockEnabled } = settings;

        const writerInfo = element.querySelector(CONSTANTS.SELECTORS.WRITER_INFO);
        if (!writerInfo) return;

        const uid = writerInfo.getAttribute('data-uid');
        const nickname = writerInfo.getAttribute('data-nick');
        const ipSpan = element.querySelector(CONSTANTS.SELECTORS.IP_SPAN);
        const ip = ipSpan ? ipSpan.textContent.trim().slice(1, -1) : null;

        // 1. [리팩토링] 개인 차단 필터를 최우선으로 실행합니다.
        // 이 필터는 '모든 기능 끄기'나 '개념글 제외' 옵션의 영향을 받지 않습니다.
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

        // 2. [리팩토링] 개인 차단 대상이 아닐 경우, 나머지 필터링 조건(개념글, 전체끄기)을 확인합니다.
        if (shouldSkipFiltering(element)) {
            element.style.display = ''; // 필터링을 건너뛰므로, 보이도록 설정
            return;
        }

        if (masterDisabled) {
            element.style.display = ''; // 기능이 꺼져있으므로, 보이도록 설정
            return;
        }

        // 3. 기존 필터링 로직 (글댓합 캐시, 통피, 유동 등)
        let isBlocked = false;
        const telecomBlockRegex = (telecomBlockEnabled && blockConfig.ip) ? new RegExp('^(' + blockConfig.ip.split('||').map(prefix => prefix.replace(/\./g, '\\.')).join('|') + ')') : null;
        const isGuest = (!uid || uid.length < 3) && ip;

        if (isGuest) {
            if (blockGuestEnabled) { isBlocked = true; }
            else if (telecomBlockRegex && ip && telecomBlockRegex.test(ip)) { isBlocked = true; }
        } else if (ip && telecomBlockRegex && telecomBlockRegex.test(ip)) {
            isBlocked = true;
        }

        if (!isBlocked && ip && blockedGuests.includes(ip)) { isBlocked = true; }

        if (!isBlocked && uid && BLOCKED_UIDS_CACHE[uid]) {
            const { sumBlocked, ratioBlocked } = isUserBlocked(BLOCKED_UIDS_CACHE[uid]);
            if (sumBlocked || ratioBlocked) {
                isBlocked = true;
            }
        }
        element.style.display = isBlocked ? 'none' : '';
    }

    function initializeUniversalObserver() {
        const targets = [
            { container: CONSTANTS.SELECTORS.POST_LIST_CONTAINER, item: CONSTANTS.SELECTORS.POST_ITEM },
            { container: CONSTANTS.SELECTORS.COMMENT_CONTAINER, item: CONSTANTS.SELECTORS.COMMENT_ITEM },
            { container: CONSTANTS.SELECTORS.POST_VIEW_LIST_CONTAINER, item: 'li' }
        ];

        const filterItems = (items) => {
            items.forEach(item => {
                applySyncBlock(item);
                applyAsyncBlock(item);
            });
        };

        const attachItemObserver = (container, itemSelector) => {
            if (container.matches(`[${CONSTANTS.CUSTOM_ATTRS.OBSERVER_ATTACHED}]`)) return;
            container.setAttribute(CONSTANTS.CUSTOM_ATTRS.OBSERVER_ATTACHED, 'true');

            filterItems(Array.from(container.querySelectorAll(itemSelector)));

            const itemObserver = new MutationObserver((mutations) => {
                const newItems = [];
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType !== Node.ELEMENT_NODE) return;
                        if (node.matches(itemSelector)) { newItems.push(node); }
                        else if (node.querySelectorAll) { newItems.push(...node.querySelectorAll(itemSelector)); }
                    });
                });
                if (newItems.length > 0) filterItems(newItems);
            });
            itemObserver.observe(container, { childList: true, subtree: true });
        };

        const bodyObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        for (const target of targets) {
                            if (node.matches(target.container)) {
                                attachItemObserver(node, target.item);
                            } else if (node.querySelectorAll) {
                                node.querySelectorAll(target.container).forEach(container => {
                                    attachItemObserver(container, target.item);
                                });
                            }
                        }
                    }
                }
            }
        });

        targets.forEach(target => {
            document.querySelectorAll(target.container).forEach(container => {
                attachItemObserver(container, target.item);
            });
        });

        bodyObserver.observe(document.body, { childList: true, subtree: true });
    }

    async function reloadSettings() {
        const [
            masterDisabled, excludeRecommended, threshold, ratioEnabled,
            ratioMin, ratioMax, blockGuestEnabled, telecomBlockEnabled,
            blockedGuests, blockConfig, personalBlockList, personalBlockEnabled
        ] = await Promise.all([
            GM_getValue(CONSTANTS.STORAGE_KEYS.MASTER_DISABLED, false),
            GM_getValue(CONSTANTS.STORAGE_KEYS.EXCLUDE_RECOMMENDED, false),
            GM_getValue(CONSTANTS.STORAGE_KEYS.THRESHOLD, 0),
            GM_getValue(CONSTANTS.STORAGE_KEYS.RATIO_ENABLED, false),
            GM_getValue(CONSTANTS.STORAGE_KEYS.RATIO_MIN, ''),
            GM_getValue(CONSTANTS.STORAGE_KEYS.RATIO_MAX, ''),
            GM_getValue(CONSTANTS.STORAGE_KEYS.BLOCK_GUEST, false),
            GM_getValue(CONSTANTS.STORAGE_KEYS.BLOCK_TELECOM, false),
            getBlockedGuests(),
            GM_getValue(CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG, {}),
            // [v1.7.0 이식] 개인 차단 관련 설정 불러오기
            PersonalBlockModule.loadPersonalBlocks(),
            GM_getValue(CONSTANTS.STORAGE_KEYS.PERSONAL_BLOCK_ENABLED, true)
        ]);

        window.dcFilterSettings = {
            masterDisabled,
            excludeRecommended,
            threshold,
            ratioEnabled,
            ratioMin: parseFloat(ratioMin),
            ratioMax: parseFloat(ratioMax),
            blockGuestEnabled,
            telecomBlockEnabled,
            blockedGuests,
            blockConfig,
            // [v1.7.0 이식] 설정 객체에 추가
            personalBlockList,
            personalBlockEnabled
        };
    }

    async function refilterAllContent() {
        await reloadSettings();
        const allContentItems = document.querySelectorAll([
            CONSTANTS.SELECTORS.POST_ITEM,
            CONSTANTS.SELECTORS.COMMENT_ITEM,
            `${CONSTANTS.SELECTORS.POST_VIEW_LIST_CONTAINER} > li`
        ].join(', '));

        allContentItems.forEach(element => {
            // 필터링 전 모든 요소를 보이도록 초기화합니다.
            // 개인 차단은 masterDisabled와 무관하게 작동하므로, 이 초기화는 개인 차단이 아닌 요소에만 적용됩니다.
            element.style.display = '';
            applySyncBlock(element);
            applyAsyncBlock(element);
        });
    }

    function handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            refilterAllContent();
        }
    }

    // [v1.7.0 이식된 기능 시작] PersonalBlockModule: 간편 차단 및 관리 기능
    const PersonalBlockModule = {
        isSelectionMode: false,
        personalBlockListCache: { uids: [], nicknames: [], ips: [] },

        async init() {
            this.personalBlockListCache = await this.loadPersonalBlocks();
            this.createFab();
            document.addEventListener('click', this.handleSelectionClick.bind(this), true);
        },

        async loadPersonalBlocks() {
            const list = await GM_getValue(CONSTANTS.STORAGE_KEYS.PERSONAL_BLOCK_LIST, { uids: [], nicknames: [], ips: [] });
            if (!list.uids) list.uids = [];
            if (!list.nicknames) list.nicknames = [];
            if (!list.ips) list.ips = [];
            return list;
        },

        async savePersonalBlocks() {
            await GM_setValue(CONSTANTS.STORAGE_KEYS.PERSONAL_BLOCK_LIST, this.personalBlockListCache);
        },

        async addBlock(type, value, displayName = null) {
            if (!value) return;
            this.personalBlockListCache = await this.loadPersonalBlocks();

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
            await refilterAllContent();
            this.exitSelectionMode();
        },

        createFab() {
            // [v1.7.1 리팩토링] FAB 생성 조건 완화 (항상 생성 시도)
            const currentPath = window.location.pathname;
            // 글 목록, 글 보기 페이지에서만 FAB를 생성합니다.
            if (!currentPath.includes('/board/lists') && !currentPath.includes('/board/view')) {
                return;
            }
            if (document.getElementById('dc-personal-block-fab')) return;

            const fab = document.createElement('div');
            fab.id = 'dc-personal-block-fab';
            fab.textContent = '간편차단';
            document.body.appendChild(fab);

            fab.addEventListener('click', () => this.enterSelectionMode());
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

            const writerEl = e.target.closest('.ub-writer');
            if (writerEl) {
                e.preventDefault();
                e.stopPropagation();

                const nick = writerEl.getAttribute('data-nick');
                const uid = writerEl.getAttribute('data-uid');
                const parentItem = writerEl.closest('.ub-content');
                const ipSpan = parentItem ? parentItem.querySelector('span.ip') : null;
                const ip = ipSpan ? ipSpan.textContent.trim().slice(1, -1) : null;

                this.showSelectionPopup({ nick, uid, ip });
            }
        },

        showSelectionPopup(userInfo) {
            this.exitSelectionMode();
            this.isSelectionMode = true;
            document.body.classList.add('selection-mode-active');

            const popup = document.createElement('div');
            popup.id = 'dc-selection-popup';

            let optionsHtml = '';
            if (userInfo.nick) {
                optionsHtml += `<div class="block-option"><span>닉네임: ${userInfo.nick}</span><button data-type="nickname" data-value="${userInfo.nick}">차단</button></div>`;
            }
            if (userInfo.uid) {
                const displayName = `${userInfo.nick || '유저'}(${userInfo.uid})`;
                optionsHtml += `<div class="block-option"><span>식별번호: ${displayName}</span><button data-type="uid" data-value="${userInfo.uid}" data-display-name="${displayName}">차단</button></div>`;
            }
            if (userInfo.ip) {
                optionsHtml += `<div class="block-option"><span>IP: ${userInfo.ip}</span><button data-type="ip" data-value="${userInfo.ip}">차단</button></div>`;
            }

            popup.innerHTML = `
                <h4>어떤 정보를 차단할까요?</h4>
                <div class="block-options">${optionsHtml}</div>
                <div class="popup-buttons"><button class="cancel-btn">취소</button></div>
            `;
            document.body.appendChild(popup);

            popup.querySelector('.cancel-btn').onclick = () => this.exitSelectionMode();
            popup.querySelectorAll('.block-options button').forEach(btn => {
                btn.onclick = () => {
                    const { type, value, displayName } = btn.dataset;
                    this.addBlock(type, value, displayName);
                };
            });
        },

        mergeBlockLists(existing, imported) {
            const existingUIDs = new Set(existing.uids.map(u => u.id));
            const mergedUIDs = [...existing.uids];
            imported.uids.forEach(importedUser => {
                if (!existingUIDs.has(importedUser.id)) {
                    mergedUIDs.push(importedUser);
                }
            });
            const mergedNicknames = [...new Set([...existing.nicknames, ...imported.nicknames])];
            const mergedIPs = [...new Set([...existing.ips, ...imported.ips])];
            return { uids: mergedUIDs, nicknames: mergedNicknames, ips: mergedIPs };
        },

        async createBackupPopup() {
            if (document.getElementById('dc-backup-popup')) return;
            const overlay = document.createElement('div');
            overlay.id = 'dc-backup-popup-overlay';
            const popup = document.createElement('div');
            popup.id = 'dc-backup-popup';
            // [v1.7.1 수정] 백업/복원 HTML 구조 수정
            popup.innerHTML = `
                <div class="popup-header"><h4>차단 목록 백업/복원</h4><button class="popup-close-btn">×</button></div>
                <div class="popup-content">
                    <div>
                        <label>내보내기</label>
                        <div class="description">현재 차단 목록 전체를 클립보드에 복사합니다.</div>
                        <button class="export-btn">클립보드에 복사</button>
                    </div>
                    <hr>
                    <div>
                        <label>불러오기</label>
                        <div class="description">백업한 데이터를 붙여넣고 불러오면 기존 목록에 추가됩니다.</div>
                        <div class="import-controls">
                            <textarea placeholder="백업 데이터를 여기에 붙여넣으세요..."></textarea>
                            <button class="import-btn">불러오기</button>
                        </div>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            document.body.appendChild(popup);
            const closePopup = () => { overlay.remove(); popup.remove(); };
            popup.querySelector('.popup-close-btn').onclick = closePopup;
            overlay.onclick = closePopup;
            popup.querySelector('.export-btn').onclick = async () => {
                const data = await this.loadPersonalBlocks();
                navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => alert('차단 목록이 클립보드에 복사되었습니다.')).catch(err => alert('클립보드 복사 실패: ' + err));
            };
            popup.querySelector('.import-btn').onclick = async () => {
                const jsonString = popup.querySelector('textarea').value;
                if (!jsonString.trim()) return alert('불러올 데이터를 입력해주세요.');
                try {
                    const importedList = JSON.parse(jsonString);
                    if (typeof importedList !== 'object' || !importedList.uids || !importedList.nicknames || !importedList.ips) throw new Error('Invalid format');
                    const currentList = await this.loadPersonalBlocks();
                    this.personalBlockListCache = this.mergeBlockLists(currentList, importedList);
                    await this.savePersonalBlocks();
                    await refilterAllContent();
                    alert('차단 목록을 성공적으로 불러와 추가했습니다.');
                    closePopup();
                    const mgmtPanel = document.getElementById('dc-block-management-panel');
                    if(mgmtPanel) mgmtPanel.querySelector('.panel-close-btn').click();
                } catch (err) { alert('데이터 형식이 올바르지 않습니다.'); }
            };
        },

        // [v1.7.1 수정] 관리 패널 기능 전체 수정
        async createManagementPanel() {
            if (document.getElementById('dc-block-management-panel')) return;

            const originalBlockList = await this.loadPersonalBlocks();
            const itemsToDelete = { uids: new Set(), nicknames: new Set(), ips: new Set() };
            const isPersonalBlockEnabled = await GM_getValue(CONSTANTS.STORAGE_KEYS.PERSONAL_BLOCK_ENABLED, true);

            const overlay = document.createElement('div');
            overlay.id = 'dc-block-management-panel-overlay';
            const panel = document.createElement('div');
            panel.id = 'dc-block-management-panel';
            panel.innerHTML = `
                <div class="panel-header"><h3>차단 유저 관리</h3><div class="switch-container"><label class="switch"><input type="checkbox" id="personal-block-toggle" ${isPersonalBlockEnabled ? 'checked' : ''}><span class="switch-slider"></span></label></div><button class="panel-close-btn">×</button></div>
                <div class="panel-tabs"><div class="panel-tab active" data-type="uids">식별 번호</div><div class="panel-tab" data-type="nicknames">닉네임</div><div class="panel-tab" data-type="ips">아이피</div></div>
                <div class="panel-body"><div class="panel-list-controls"><button class="select-all-btn">해당 탭 전체 선택</button></div><div class="panel-content"><ul class="blocked-list"></ul></div></div>
                <div class="panel-footer"><div class="panel-footer-left"><button class="select-all-global-btn">모든 탭 전체 선택</button><button class="panel-backup-btn">백업</button></div><button class="panel-save-btn">저장</button></div>
                <div class="panel-resize-handle"></div>`;

            document.body.appendChild(overlay);
            document.body.appendChild(panel);

            const listEl = panel.querySelector('.blocked-list');
            const selectAllBtn = panel.querySelector('.select-all-btn');
            const globalSelectAllBtn = panel.querySelector('.select-all-global-btn');

            const updateButtonStates = (type) => {
                const currentList = originalBlockList[type] || [];
                selectAllBtn.textContent = (currentList.length > 0 && itemsToDelete[type].size === currentList.length) ? '해당 탭 전체 해제' : '해당 탭 전체 선택';
                selectAllBtn.dataset.action = (currentList.length > 0 && itemsToDelete[type].size === currentList.length) ? 'deselect' : 'select';

                const totalItems = originalBlockList.uids.length + originalBlockList.nicknames.length + originalBlockList.ips.length;
                const totalSelected = itemsToDelete.uids.size + itemsToDelete.nicknames.size + itemsToDelete.ips.size;
                globalSelectAllBtn.textContent = (totalItems > 0 && totalSelected === totalItems) ? '모든 탭 전체 해제' : '모든 탭 전체 선택';
            };

            const renderList = (type) => {
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
                        li.classList.toggle('item-to-delete') ? itemsToDelete[type].add(value) : itemsToDelete[type].delete(value);
                        updateButtonStates(type);
                    };
                    listEl.appendChild(li);
                });
                updateButtonStates(type);
            };

            selectAllBtn.onclick = () => {
                const type = panel.querySelector('.panel-tab.active').dataset.type;
                const shouldSelectAll = selectAllBtn.dataset.action === 'select';
                (originalBlockList[type] || []).forEach(item => {
                    const value = (typeof item === 'object') ? item.id : item;
                    shouldSelectAll ? itemsToDelete[type].add(value) : itemsToDelete[type].delete(value);
                });
                renderList(type);
            };

            globalSelectAllBtn.onclick = () => {
                const totalItems = originalBlockList.uids.length + originalBlockList.nicknames.length + originalBlockList.ips.length;
                const totalSelected = itemsToDelete.uids.size + itemsToDelete.nicknames.size + itemsToDelete.ips.size;
                const shouldSelectEverything = totalSelected < totalItems;

                Object.keys(originalBlockList).forEach(type => {
                    (originalBlockList[type] || []).forEach(item => {
                        const value = (typeof item === 'object') ? item.id : item;
                        shouldSelectEverything ? itemsToDelete[type].add(value) : itemsToDelete[type].delete(value);
                    });
                });
                renderList(panel.querySelector('.panel-tab.active').dataset.type);
            };


            panel.querySelector('#personal-block-toggle').addEventListener('change', async (e) => {
                await GM_setValue(CONSTANTS.STORAGE_KEYS.PERSONAL_BLOCK_ENABLED, e.target.checked);
                await refilterAllContent();
            });
            panel.querySelector('.panel-backup-btn').onclick = () => this.createBackupPopup();
            panel.querySelectorAll('.panel-tab').forEach(tab => tab.onclick = () => {
                panel.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderList(tab.dataset.type);
            });
            const closePanel = () => { overlay.remove(); panel.remove(); };
            panel.querySelector('.panel-close-btn').onclick = closePanel;
            overlay.onclick = closePanel;
            panel.querySelector('.panel-save-btn').onclick = async () => {
                this.personalBlockListCache = {
                    uids: originalBlockList.uids.filter(u => !itemsToDelete.uids.has(u.id)),
                    nicknames: originalBlockList.nicknames.filter(n => !itemsToDelete.nicknames.has(n)),
                    ips: originalBlockList.ips.filter(i => !itemsToDelete.ips.has(i))
                };
                await this.savePersonalBlocks();
                await refilterAllContent();
                closePanel();
            };

            let isDragging = false, isResizing = false, lastX, lastY, offsetX, offsetY;
            panel.addEventListener('mousedown', (e) => {
                if (e.target.classList.contains('panel-resize-handle')) isResizing = true;
                else if (e.target.closest('.panel-header')) isDragging = true;
                else return;
                const rect = panel.getBoundingClientRect();
                lastX = e.clientX; lastY = e.clientY;
                offsetX = e.clientX - rect.left; offsetY = e.clientY - rect.top;
                document.addEventListener('mousemove', onDragMove);
                document.addEventListener('mouseup', onDragEnd, { once: true });
            });
            const onDragMove = (e) => {
                if (isDragging) {
                    const rect = panel.getBoundingClientRect();
                    let newX = e.clientX - offsetX;
                    let newY = e.clientY - offsetY;
                    // 드래그 경계 제한
                    newX = Math.max(0, Math.min(newX, window.innerWidth - rect.width));
                    newY = Math.max(0, Math.min(newY, window.innerHeight - rect.height));
                    panel.style.left = `${newX}px`; panel.style.top = `${newY}px`;
                    panel.style.transform = 'none'; // transform이 있으면 left/top이 제대로 안 먹힘
                }
                if (isResizing) {
                    panel.style.width = `${panel.offsetWidth + e.clientX - lastX}px`;
                    panel.style.height = `${panel.offsetHeight + e.clientY - lastY}px`;
                    lastX = e.clientX; lastY = e.clientY;
                }
            };
            const onDragEnd = () => { isDragging = false; isResizing = false; document.removeEventListener('mousemove', onDragMove); };
            renderList('uids');
        }
    };
    // [v1.7.0 이식된 기능 끝]

    async function start() {
        await reloadSettings();

        // [v1.7.1 리팩토링] 요구사항 1번 해결.
        // 개념글 목록 페이지에서 스크립트가 조기 종료되어 '간편차단' 버튼(FAB)이
        // 생성되지 않는 문제를 해결하기 위해 해당 조건문을 제거합니다.
        // if (window.dcFilterSettings.excludeRecommended && window.location.pathname.includes('/lists/') && isRecommendedContext()) {
        //     console.log('DCInside 유저 필터: 개념글 목록 페이지이므로 필터 기능을 비활성화합니다.');
        //     return;
        // }

        const telecomBlockEnabled = await GM_getValue(CONSTANTS.STORAGE_KEYS.BLOCK_TELECOM, false);
        if (telecomBlockEnabled) {
            await regblockMobile();
        } else {
            await delblockMobile();
        }

        await refreshBlockedUidsCache();

        document.addEventListener('visibilitychange', handleVisibilityChange);
        initializeUniversalObserver();
        // [v1.7.0 이식] 개인 차단 기능 초기화
        await PersonalBlockModule.init();
    }

    const runSafely = async () => {
        try {
            // 기존 실행부의 로직을 이곳으로 이동
            const shortcutString = await GM_getValue(CONSTANTS.STORAGE_KEYS.SHORTCUT_KEY, 'Shift+S');
            activeShortcutObject = parseShortcutString(shortcutString);

            window.addEventListener('keydown', async (e) => {
                if (!activeShortcutObject || !activeShortcutObject.key) return;

                const isMatch = e.key.toUpperCase() === activeShortcutObject.key &&
                                e.ctrlKey === activeShortcutObject.ctrlKey &&
                                e.shiftKey === activeShortcutObject.shiftKey &&
                                e.altKey === activeShortcutObject.altKey &&
                                e.metaKey === activeShortcutObject.metaKey;

                if (isMatch) {
                    e.preventDefault();
                    const settingsPanel = document.getElementById(CONSTANTS.UI_IDS.SETTINGS_PANEL);
                    if (settingsPanel) {
                        settingsPanel.remove();
                    } else {
                        await showSettings();
                    }
                }
            });

            // start() 함수는 DOM 요소에 접근하므로 DOMContentLoaded 이후에 실행되어야 함
            await start();

            // 최초 실행 시 설정 창 표시 로직
            const val = await GM_getValue(CONSTANTS.STORAGE_KEYS.THRESHOLD);
            if (val === undefined) {
                await GM_setValue(CONSTANTS.STORAGE_KEYS.THRESHOLD, 0);
                await showSettings();
            }

        } catch (error) {
            console.error("[DCInside User Filter] A critical error occurred:", error);
        } finally {
            // 모든 작업이 끝난 후 body에 클래스를 추가하여 화면을 표시
            document.body.classList.add('dc-filter-ready');
        }
    };

    // DOM이 준비되면 스크립트의 메인 로직을 안전하게 실행
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
