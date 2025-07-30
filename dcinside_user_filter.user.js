// ==UserScript==
// @name         DCInside 유저 필터
// @namespace    http://tampermonkey.net/
// @version      1.6.0
// @description  유저의 글+댓글 합/비율 필터링, 유동/통신사 IP 차단, 단축키 변경 기능을 제공합니다.
// @author       domato153
// @match        https://gall.dcinside.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @license      MIT
// ==/UserScript==

/*-----------------------------------------------------------------
DBAD license / Copyright (C) 2025 domato153
https://github.com/philsturgeon/dbad/blob/master/LICENSE.md
https://namu.wiki/w/DBAD%20%EB%9D%BC%EC%9D%B4%EC%84%A0%EC%8A%A4
------------------------------------------------------------------*/

(function() {
    'use strict';

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
            SHORTCUT_KEY: 'dcinside_shortcut_key', // [이식] 단축키 저장 키
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
            // [이식] 단축키 변경 UI ID 추가
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

        // [이식] 현재 단축키 불러오기
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

        // [이식] 단축키 변경 버튼 이벤트 리스너 추가
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

    // [이식] 단축키 변경 모달 표시 함수
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

    // [이식] 키 Set을 정해진 형식의 문자열로 변환하는 헬퍼 함수
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

    // [이식] 단축키 문자열을 이벤트 비교용 객체로 변환하는 헬퍼 함수
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
            if (element.closest(CONSTANTS.SELECTORS.COMMENT_CONTAINER)) {
                return false;
            }
            return true;
        }
        return true;
    }

    async function applyAsyncBlock(element) {
        if (shouldSkipFiltering(element)) {
            element.style.display = '';
            return;
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

    function applySyncBlock(element) {
        if (shouldSkipFiltering(element)) {
            element.style.display = '';
            return;
        }

        const settings = window.dcFilterSettings || {};
        const { masterDisabled, blockGuestEnabled, telecomBlockEnabled, blockConfig = {}, blockedGuests = [] } = settings;

        if (masterDisabled) {
            element.style.display = '';
            return;
        }

        const writerInfo = element.querySelector(CONSTANTS.SELECTORS.WRITER_INFO);
        if (!writerInfo) return;

        const uid = writerInfo.getAttribute('data-uid');
        const ipSpan = element.querySelector(CONSTANTS.SELECTORS.IP_SPAN);
        const ip = ipSpan ? ipSpan.textContent.trim().slice(1, -1) : null;
        const isGuest = (!uid || uid.length < 3) && ip;

        let isBlocked = false;
        const telecomBlockRegex = (telecomBlockEnabled && blockConfig.ip) ? new RegExp('^(' + blockConfig.ip.split('||').map(prefix => prefix.replace(/\./g, '\\.')).join('|') + ')') : null;

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
        const blockedGuests = await getBlockedGuests();
        const blockConfig = await GM_getValue(CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG, {});

        window.dcFilterSettings = {
            masterDisabled: await GM_getValue(CONSTANTS.STORAGE_KEYS.MASTER_DISABLED, false),
            excludeRecommended: await GM_getValue(CONSTANTS.STORAGE_KEYS.EXCLUDE_RECOMMENDED, false),
            threshold: await GM_getValue(CONSTANTS.STORAGE_KEYS.THRESHOLD, 0),
            ratioEnabled: await GM_getValue(CONSTANTS.STORAGE_KEYS.RATIO_ENABLED, false),
            ratioMin: parseFloat(await GM_getValue(CONSTANTS.STORAGE_KEYS.RATIO_MIN, '')),
            ratioMax: parseFloat(await GM_getValue(CONSTANTS.STORAGE_KEYS.RATIO_MAX, '')),
            blockGuestEnabled: await GM_getValue(CONSTANTS.STORAGE_KEYS.BLOCK_GUEST, false),
            telecomBlockEnabled: await GM_getValue(CONSTANTS.STORAGE_KEYS.BLOCK_TELECOM, false),
            blockedGuests,
            blockConfig
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
            if (!window.dcFilterSettings.masterDisabled) {
                element.style.display = '';
            }
            applySyncBlock(element);
            applyAsyncBlock(element);
        });
    }

    function handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            refilterAllContent();
        }
    }

    async function start() {
        await reloadSettings();

        if (window.dcFilterSettings.excludeRecommended && window.location.pathname.includes('/lists/') && isRecommendedContext()) {
            console.log('DCInside 유저 필터: 개념글 목록 페이지이므로 필터 기능을 비활성화합니다.');
            return;
        }

        const telecomBlockEnabled = await GM_getValue(CONSTANTS.STORAGE_KEYS.BLOCK_TELECOM, false);
        if (telecomBlockEnabled) {
            await regblockMobile();
        } else {
            await delblockMobile();
        }

        await refreshBlockedUidsCache();

        document.addEventListener('visibilitychange', handleVisibilityChange);
        initializeUniversalObserver();
    }

    (async () => {
        // [이식] 단축키 로드 및 이벤트 리스너 설정
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

        // 기존 시작 로직
        const val = await GM_getValue(CONSTANTS.STORAGE_KEYS.THRESHOLD);
        if (val === undefined) {
            await GM_setValue(CONSTANTS.STORAGE_KEYS.THRESHOLD, 0);
            await showSettings();
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', start);
        } else {
            start();
        }
    })();
})();
