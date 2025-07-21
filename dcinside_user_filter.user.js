// ==UserScript==
// @name         DCInside 유저 글댓합/글댓비,유동 차단필터 
// @namespace    http://tampermonkey.net/
// @version      1.3.2
// @description  유저의 글+댓글 합과 비율을 기준으로 글/댓글을 차단. 유동 차단 기능 포함.
// @author       domato153 (Refactored by Gemini)
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

    // --- 설정 변수 (스크립트 스코프 내에서 관리) ---
    let settings = {
        masterDisabled: false,
        threshold: 0,
        ratioEnabled: false,
        ratioMin: 0,
        ratioMax: 0,
        blockGuest: false,
    };

    // --- 캐시 및 상수 ---
    const USER_SUM_CACHE = {}; // API 호출 결과를 담는 세션 캐시
    const BLOCK_UID_KEY = 'dcinside_blocked_uids';
    const BLOCK_GUEST_KEY = 'dcinside_blocked_guests';
    const BLOCK_UID_EXPIRE_MS = 1000 * 60 * 60 * 24 * 30; // 30일
    let BLOCKED_UIDS_CACHE = {}; // 영구 차단 목록 캐시 (GM_storage)
    let BLOCKED_GUESTS = [];   // 유동 차단 목록

    // --- 설정 UI 표시 ---
    async function showSettings() {
        // 현재 저장된 값 불러오기
        const storedSettings = {
            masterDisabled: await GM_getValue('dcinside_master_disabled', false),
            threshold: await GM_getValue('dcinside_threshold', 0),
            ratioEnabled: await GM_getValue('dcinside_ratio_filter_enabled', false),
            ratioMin: await GM_getValue('dcinside_ratio_min', ''),
            ratioMax: await GM_getValue('dcinside_ratio_max', ''),
            blockGuest: await GM_getValue('dcinside_block_guest', false),
        };

        // 기존 UI 제거
        const existingDiv = document.getElementById('dcinside-filter-setting');
        if (existingDiv) existingDiv.remove();

        const div = document.createElement('div');
        div.id = 'dcinside-filter-setting';
        div.style = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:24px 20px 18px 20px;min-width:280px;z-index:99999;border:2px solid #333;border-radius:10px;box-shadow:0 0 10px #0008; cursor: move; user-select: none;';
        div.innerHTML = `
            <div style="position:absolute;top:8px;right:12px;z-index:100000;">
                <button id="dcinside-filter-close" style="background:none;border:none;font-size:20px;cursor:pointer;line-height:1;">✕</button>
            </div>
            <div style="margin-bottom:15px;padding-bottom:12px;border-bottom: 2px solid #ccc; display:flex;align-items:center;">
                <input id="dcinside-master-disable-checkbox" type="checkbox" style="vertical-align:middle;width:16px;height:16px;" ${storedSettings.masterDisabled ? 'checked' : ''}>
                <label for="dcinside-master-disable-checkbox" style="font-size:16px;vertical-align:middle;cursor:pointer;margin-left:6px;"><b>모든 기능 끄기</b></label>
            </div>
            <div id="dcinside-settings-container" style="opacity:${storedSettings.masterDisabled ? 0.5 : 1}; pointer-events:${storedSettings.masterDisabled ? 'none' : 'auto'};">
                <h3 style="cursor: default;margin-top:0;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;">
                    <span>유저 글+댓글 합 기준값</span>
                    <span style="float:right;display:flex;align-items:center;gap:4px;">
                        <input id="dcinside-block-guest-checkbox" type="checkbox" ${storedSettings.blockGuest ? 'checked' : ''} style="vertical-align:middle;">
                        <label for="dcinside-block-guest-checkbox" style="font-size:13px;vertical-align:middle;cursor:pointer;">유동 차단</label>
                    </span>
                </h3>
                <input id="dcinside-threshold-input" type="number" min="0" value="${storedSettings.threshold}" style="width:80px;font-size:16px; cursor: initial;">
                <div style="font-size:13px;color:#666;margin-top:5px;">0 또는 빈칸으로 두면 비활성화됩니다.</div>

                <hr style="border:0;border-top:2px solid #222;margin:22px 0 12px 0;">

                <div style="margin-bottom:8px;display:flex;align-items:center;">
                    <input id="dcinside-ratio-enable-checkbox" type="checkbox" style="vertical-align:middle;" ${storedSettings.ratioEnabled ? 'checked' : ''}>
                    <label for="dcinside-ratio-enable-checkbox" style="font-size:15px;vertical-align:middle;cursor:pointer;margin-left:4px;">글/댓글 비율 필터 사용</label>
                </div>
                <div id="dcinside-ratio-section">
                    <div style="display:flex;gap:10px;align-items:center;">
                        <div style="display:flex;flex-direction:column;align-items:center;">
                            <label for="dcinside-ratio-min" style="font-size:14px;">댓글/글 비율 이상 차단</label>
                            <div style="font-size:12px;color:#888;line-height:1.2;">(댓글만 많은 유저)</div>
                            <input id="dcinside-ratio-min" type="number" step="any" placeholder="예: 0.5" value="${storedSettings.ratioMin}" style="width:100px;font-size:15px;text-align:center;">
                        </div>
                        <div style="display:flex;flex-direction:column;align-items:center;">
                            <label for="dcinside-ratio-max" style="font-size:14px;">글/댓글 비율 이상 차단</label>
                            <div style="font-size:12px;color:#888;line-height:1.2;">(글만 많은 유저)</div>
                            <input id="dcinside-ratio-max" type="number" step="any" placeholder="예: 2" value="${storedSettings.ratioMax}" style="width:100px;font-size:15px;text-align:center;">
                        </div>
                    </div>
                    <div style="margin-top:8px;font-size:13px;color:#666;text-align:left;">비율이 입력값보다 크거나(이상)인 유저를 차단합니다.</div>
                </div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:22px; padding-top:15px; border-top: 2px solid #ccc;">
                <div style="font-size:15px;color:#444;text-align:left;">창 여는 단축키: <b>Shift+S</b></div>
                <button id="dcinside-threshold-save" style="font-size:16px;border:2px solid #000;border-radius:4px;background:#fff; cursor: pointer; padding: 4px 10px;">저장 & 실행</button>
            </div>
        `;
        document.body.appendChild(div);

        // --- UI 이벤트 핸들러 ---
        const masterDisableCheckbox = document.getElementById('dcinside-master-disable-checkbox');
        const settingsContainer = document.getElementById('dcinside-settings-container');
        const ratioEnableCheckbox = document.getElementById('dcinside-ratio-enable-checkbox');
        const ratioSection = document.getElementById('dcinside-ratio-section');
        const ratioMinInput = document.getElementById('dcinside-ratio-min');
        const ratioMaxInput = document.getElementById('dcinside-ratio-max');

        const updateMasterState = () => {
            const isDisabled = masterDisableCheckbox.checked;
            settingsContainer.style.opacity = isDisabled ? 0.5 : 1;
            settingsContainer.style.pointerEvents = isDisabled ? 'none' : 'auto';
        };
        const updateRatioState = () => {
            const isEnabled = ratioEnableCheckbox.checked;
            ratioSection.style.opacity = isEnabled ? 1 : 0.5;
            ratioMinInput.disabled = !isEnabled;
            ratioMaxInput.disabled = !isEnabled;
        };
        masterDisableCheckbox.addEventListener('change', updateMasterState);
        ratioEnableCheckbox.addEventListener('change', updateRatioState);
        updateMasterState();
        updateRatioState();
        
        document.getElementById('dcinside-filter-close').onclick = () => div.remove();
        
        // 저장 버튼 클릭 시
        document.getElementById('dcinside-threshold-save').onclick = async () => {
            const newMasterDisabled = masterDisableCheckbox.checked;
            const newBlockGuest = document.getElementById('dcinside-block-guest-checkbox').checked;
            
            await GM_setValue('dcinside_master_disabled', newMasterDisabled);
            await GM_setValue('dcinside_threshold', parseInt(document.getElementById('dcinside-threshold-input').value, 10) || 0);
            await GM_setValue('dcinside_ratio_filter_enabled', ratioEnableCheckbox.checked);
            await GM_setValue('dcinside_ratio_min', ratioMinInput.value);
            await GM_setValue('dcinside_ratio_max', ratioMaxInput.value);
            await GM_setValue('dcinside_block_guest', newBlockGuest);

            if (!newBlockGuest) {
                await GM_setValue(BLOCK_GUEST_KEY, '[]');
            }
            
            div.remove();
            location.reload();
        };

        // Enter 키로 저장
        const handleEnterKey = (e) => {
            if (e.key === 'Enter') document.getElementById('dcinside-threshold-save').click();
        };
        document.getElementById('dcinside-threshold-input').addEventListener('keydown', handleEnterKey);
        ratioMinInput.addEventListener('keydown', handleEnterKey);
        ratioMaxInput.addEventListener('keydown', handleEnterKey);

        // 창 드래그 로직
        let isDragging = false, offsetX, offsetY;
        div.addEventListener('mousedown', (e) => {
            if (e.target.closest('input, button, label')) return;
            isDragging = true;
            offsetX = e.clientX - div.offsetLeft;
            offsetY = e.clientY - div.offsetTop;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp, { once: true });
        });
        function onMouseMove(e) {
            if (!isDragging) return;
            div.style.left = `${e.clientX - offsetX}px`;
            div.style.top = `${e.clientY - offsetY}px`;
        }
        function onMouseUp() {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
        }
    }

    // --- 핵심 로직 ---

    /** 유저의 글/댓글 수를 API로 가져옵니다. */
    async function getUserPostCommentSum(uid) {
        if (USER_SUM_CACHE[uid]) return USER_SUM_CACHE[uid];

        function getCookie(name) {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
        }
        const ci = getCookie('ci_t') || getCookie('ci_c');
        if (!ci) return null;

        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/gallog_user_layer/gallog_content_reple/', true);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            xhr.onload = () => {
                const [post, comment] = xhr.responseText.split(',').map(Number);
                if (!isNaN(post) && !isNaN(comment)) {
                    const data = { sum: post + comment, post, comment };
                    USER_SUM_CACHE[uid] = data;
                    resolve(data);
                } else {
                    resolve(null);
                }
            };
            xhr.onerror = () => resolve(null);
            xhr.send(`ci_t=${encodeURIComponent(ci)}&user_id=${encodeURIComponent(uid)}`);
        });
    }

    /** 차단 여부를 판단합니다. */
    function isUserBlocked(userData) {
        if (!userData) return false;
        const { sum, post, comment } = userData;

        // 글댓합 기준
        if (settings.threshold > 0 && sum > 0 && sum <= settings.threshold) {
            return true;
        }

        // 비율 기준
        if (settings.ratioEnabled) {
            // 댓글/글 비율 (댓글만 많은 유저)
            if (settings.ratioMin > 0 && post > 0) {
                if ((comment / post) >= settings.ratioMin) return true;
            }
            // 글/댓글 비율 (글만 많은 유저)
            if (settings.ratioMax > 0) {
                if (comment > 0) {
                    if ((post / comment) >= settings.ratioMax) return true;
                } else if (post > 0) {
                    // 댓글 0개, 글 1개 이상 -> 비율 무한대
                    return true;
                }
            }
        }
        return false;
    }

    /** 차단된 UID를 캐시에 저장합니다. */
    async function addBlockedUid(uid, userData) {
        BLOCKED_UIDS_CACHE[uid] = { ts: Date.now(), ...userData };
        await GM_setValue(BLOCK_UID_KEY, JSON.stringify(BLOCKED_UIDS_CACHE));
    }
    
    /** 차단된 유동 IP를 저장합니다. */
    async function addBlockedGuest(ip) {
        if (!BLOCKED_GUESTS.includes(ip)) {
            BLOCKED_GUESTS.push(ip);
            await GM_setValue(BLOCK_GUEST_KEY, JSON.stringify(BLOCKED_GUESTS));
        }
    }

    /** 게시글/댓글 요소를 필터링하는 핵심 함수 */
    async function processElement(element) {
        if (settings.masterDisabled) {
            element.style.display = '';
            return;
        }
        
        try {
            const writerEl = element.querySelector('.gall_writer.ub-writer');
            const ipSpan = element.querySelector('span.ip');
            if (!writerEl) return;

            const uid = writerEl.getAttribute('data-uid');
            const ip = ipSpan ? ipSpan.textContent.trim() : null;

            // 1. 유동(Guest) 유저 처리
            if (settings.blockGuest && ip && (!uid || uid.length < 3)) {
                element.style.display = 'none';
                await addBlockedGuest(ip);
                return;
            }
            if (ip && BLOCKED_GUESTS.includes(ip)) {
                 element.style.display = 'none';
                 return;
            }

            // 2. 고정닉(UID) 유저 처리
            if (!uid || uid.length < 3) return;

            // 2-1. 영구 차단 캐시 확인
            let userData = BLOCKED_UIDS_CACHE[uid];
            if (userData) {
                if (isUserBlocked(userData)) {
                    element.style.display = 'none';
                }
                return;
            }
            
            // 2-2. API로 정보 조회
            userData = await getUserPostCommentSum(uid);
            if (userData && isUserBlocked(userData)) {
                element.style.display = 'none';
                await addBlockedUid(uid, userData);
            }

        } catch (e) {
            console.warn('[DC Filter] Element processing error:', e, element);
        }
    }

    /** MutationObserver를 설정하여 동적으로 추가되는 콘텐츠를 감시합니다. */
    function setupObserver(selector, targetNode) {
        if (!targetNode) return;
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE && node.matches(selector)) {
                        processElement(node);
                    }
                }
            }
        });
        observer.observe(targetNode, { childList: true, subtree: true });
    }

    /** 스크립트 초기화 */
    async function initialize() {
        // 1. 설정 불러오기
        settings.masterDisabled = await GM_getValue('dcinside_master_disabled', false);
        if (settings.masterDisabled) return; // 기능 꺼져있으면 여기서 중단

        settings.threshold = await GM_getValue('dcinside_threshold', 0);
        settings.ratioEnabled = await GM_getValue('dcinside_ratio_filter_enabled', false);
        settings.ratioMin = parseFloat(await GM_getValue('dcinside_ratio_min', '')) || 0;
        settings.ratioMax = parseFloat(await GM_getValue('dcinside_ratio_max', '')) || 0;
        settings.blockGuest = await GM_getValue('dcinside_block_guest', false);

        // 2. 차단 목록 캐시 불러오기 및 만료 데이터 정리
        try { BLOCKED_UIDS_CACHE = JSON.parse(await GM_getValue(BLOCK_UID_KEY, '{}')); } catch { BLOCKED_UIDS_CACHE = {}; }
        try { BLOCKED_GUESTS = JSON.parse(await GM_getValue(BLOCK_GUEST_KEY, '[]')); } catch { BLOCKED_GUESTS = []; }
        
        const now = Date.now();
        let cacheChanged = false;
        for (const uid in BLOCKED_UIDS_CACHE) {
            if (now - BLOCKED_UIDS_CACHE[uid].ts > BLOCK_UID_EXPIRE_MS) {
                delete BLOCKED_UIDS_CACHE[uid];
                cacheChanged = true;
            }
        }
        if (cacheChanged) await GM_setValue(BLOCK_UID_KEY, JSON.stringify(BLOCKED_UIDS_CACHE));

        // 3. 현재 페이지의 모든 글과 댓글에 필터 즉시 적용
        document.querySelectorAll('tr.ub-content.us-post, li.ub-content').forEach(processElement);

        // 4. Observer 설정으로 동적 로딩 콘텐츠 감시
        setupObserver('tr.ub-content.us-post', document.querySelector('table.gall_list > tbody'));
        const commentBox = document.querySelector('div.comment_box');
        if (commentBox) {
            setupObserver('li.ub-content', commentBox.querySelector('ul.cmt_list'));
        } else {
            // 댓글 영역이 나중에 로드될 경우 대비
            const bodyObserver = new MutationObserver((mutations, observer) => {
                const newCommentBox = document.querySelector('div.comment_box ul.cmt_list');
                if (newCommentBox) {
                    setupObserver('li.ub-content', newCommentBox);
                    observer.disconnect(); // 찾았으면 더 이상 감시할 필요 없음
                }
            });
            bodyObserver.observe(document.body, { childList: true, subtree: true });
        }
    }

    // --- 실행 ---
    GM_registerMenuCommand('글댓합 필터 설정', showSettings);

    // 단축키 (Shift+S)로 설정창 열기
    window.addEventListener('keydown', async (e) => {
        if (e.shiftKey && e.key.toUpperCase() === 'S') {
            e.preventDefault();
            const popup = document.getElementById('dcinside-filter-setting');
            if (popup) popup.remove();
            else await showSettings();
        }
    });
    
    // 문서 로딩 상태에 따라 초기화 실행
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})(); 
