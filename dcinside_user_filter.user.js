// ==UserScript==
// @name         DCInside 유저 글댓합/글댓비 차단필터
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  유저의 글+댓글 합과 비율이 기준 이하/이상일 경우 해당 유저의 글을 가립니다.
// @author       domato153
// @match        https://gall.dcinside.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @license MIT
// ==/UserScript==
/*-----------------------------------------------------------------
DBAD license / Copyright (C) 2025 domato153

https://github.com/philsturgeon/dbad/blob/master/LICENSE.md
https://namu.wiki/w/DBAD%20%EB%9D%BC%EC%9D%B4%EC%84%A0%EC%8A%A4
------------------------------------------------------------------*/

(function() {
    'use strict';

    let threshold = GM_getValue('dcinside_threshold', 0);
    let ratioEnabled, ratioMin, ratioMax, masterDisabled;

    async function showSettings() {
        masterDisabled = await GM_getValue('dcinside_master_disabled', false);
        const currentThreshold = await GM_getValue('dcinside_threshold', 0);
        const ratioEnabled = await GM_getValue('dcinside_ratio_filter_enabled', false);
        const ratioMin = await GM_getValue('dcinside_ratio_min', '');
        const ratioMax = await GM_getValue('dcinside_ratio_max', '');

        const existingDiv = document.getElementById('dcinside-filter-setting');
        if (existingDiv) {
            existingDiv.remove();
        }

        const div = document.createElement('div');
        div.id = 'dcinside-filter-setting';
        div.style = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:24px 20px 18px 20px;min-width:280px;z-index:99999;border:2px solid #333;border-radius:10px;box-shadow:0 0 10px #0008; cursor: move; user-select: none;';
        div.innerHTML = `
            <div style="position:absolute;top:8px;right:12px;z-index:100000;">
                <button id="dcinside-filter-close" style="background:none;border:none;font-size:20px;cursor:pointer;line-height:1;">✕</button>
            </div>
            <div style="margin-bottom:15px;padding-bottom:12px;border-bottom: 2px solid #ccc; display:flex;align-items:center;">
                <input id="dcinside-master-disable-checkbox" type="checkbox" style="vertical-align:middle;width:16px;height:16px;" ${masterDisabled ? 'checked' : ''}>
                <label for="dcinside-master-disable-checkbox" style="font-size:16px;vertical-align:middle;cursor:pointer;margin-left:6px;"><b>모든 기능 끄기</b></label>
            </div>
            <div id="dcinside-settings-container" style="opacity:${masterDisabled ? 0.5 : 1}; pointer-events:${masterDisabled ? 'none' : 'auto'};">
                <h3 style="cursor: default;margin-top:0;margin-bottom:10px;">유저 글+댓글 합 기준값</h3>
                <input id="dcinside-threshold-input" type="number" min="0" value="${currentThreshold}" style="width:80px;font-size:16px; cursor: initial;">
                <div style="font-size:13px;color:#666;margin-top:5px;">0 또는 빈칸으로 두면 비활성화됩니다.</div>

                <hr style="border:0;border-top:2px solid #222;margin:22px 0 12px 0;">

                <div style="margin-bottom:8px;display:flex;align-items:center;">
                    <input id="dcinside-ratio-enable-checkbox" type="checkbox" style="vertical-align:middle;" ${ratioEnabled ? 'checked' : ''}>
                    <label for="dcinside-ratio-enable-checkbox" style="font-size:15px;vertical-align:middle;cursor:pointer;margin-left:4px;">글/댓글 비율 필터 사용</label>
                </div>
                <div id="dcinside-ratio-section">
                    <div style="display:flex;gap:10px;align-items:center;">
                        <div style="display:flex;flex-direction:column;align-items:center;">
                            <label for="dcinside-ratio-min" style="font-size:14px;">댓글/글 비율 이상 차단 </label>
                            <div style="font-size:12px;color:#888;line-height:1.2;">(댓글만 많은 놈)</div>
                            <input id="dcinside-ratio-min" type="number" step="any" placeholder="예: 0.5" value="${ratioMin !== '' ? ratioMin : ''}" style="width:100px;font-size:15px;text-align:center;">
                        </div>
                        <div style="display:flex;flex-direction:column;align-items:center;">
                            <label for="dcinside-ratio-max" style="font-size:14px;">글/댓글 비율 이상 차단 </label>
                            <div style="font-size:12px;color:#888;line-height:1.2;">(글만 많은 놈)</div>
                            <input id="dcinside-ratio-max" type="number" step="any" placeholder="예: 2" value="${ratioMax !== '' ? ratioMax : ''}" style="width:100px;font-size:15px;text-align:center;">
                        </div>
                    </div>
                    <div style="margin-top:8px;font-size:13px;color:#666;text-align:left;">비율이 입력값보다 작거나(이하), 크거나(이상)인 유저를 차단합니다.</div>
                </div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:22px; padding-top:15px; border-top: 2px solid #ccc;">
                <div style="font-size:15px;color:#444;text-align:left;">창 여는 단축키: <b>Shift+s</b></div>
                <button id="dcinside-threshold-save" style="font-size:16px;border:2px solid #000;border-radius:4px;background:#fff; cursor: pointer; padding: 4px 10px;">저장 & 실행</button>
            </div>
        `;
        document.body.appendChild(div);

        const input = document.getElementById('dcinside-threshold-input');
        input.focus();
        input.select();

        const masterDisableCheckbox = document.getElementById('dcinside-master-disable-checkbox');
        const settingsContainer = document.getElementById('dcinside-settings-container');

        function updateMasterState() {
            const isMasterDisabled = masterDisableCheckbox.checked;
            settingsContainer.style.opacity = isMasterDisabled ? 0.5 : 1;
            settingsContainer.style.pointerEvents = isMasterDisabled ? 'none' : 'auto';
        }
        masterDisableCheckbox.addEventListener('change', updateMasterState);
        updateMasterState();

        const ratioSection = document.getElementById('dcinside-ratio-section');
        const ratioEnableCheckbox = document.getElementById('dcinside-ratio-enable-checkbox');
        const ratioMinInput = document.getElementById('dcinside-ratio-min');
        const ratioMaxInput = document.getElementById('dcinside-ratio-max');

        function updateRatioSectionState() {
            const enabled = ratioEnableCheckbox.checked;
            ratioSection.style.opacity = enabled ? 1 : 0.5;
            ratioMinInput.disabled = !enabled;
            ratioMaxInput.disabled = !enabled;
        }
        ratioEnableCheckbox.addEventListener('change', updateRatioSectionState);
        updateRatioSectionState();

        document.getElementById('dcinside-filter-close').onclick = function() {
            div.remove();
        };

        // ratio 입력칸에서 Enter 누르면 저장 & 실행
        ratioMinInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                document.getElementById('dcinside-threshold-save').click();
            }
        });
        ratioMaxInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                document.getElementById('dcinside-threshold-save').click();
            }
        });

        let isDragging = false;
        let offsetX, offsetY;

        div.addEventListener('mousedown', function(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'LABEL') return;
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

        document.getElementById('dcinside-threshold-save').onclick = async function() {
            await GM_setValue('dcinside_master_disabled', masterDisableCheckbox.checked);

            let val = parseInt(input.value, 10);
            if (isNaN(val)) val = 0;
            await GM_setValue('dcinside_threshold', val);
            threshold = val;
            await GM_setValue('dcinside_ratio_filter_enabled', ratioEnableCheckbox.checked);
            await GM_setValue('dcinside_ratio_min', ratioMinInput.value);
            await GM_setValue('dcinside_ratio_max', ratioMaxInput.value);
            div.remove();
            location.reload();
        };

        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                document.getElementById('dcinside-threshold-save').click();
            }
        });
    }

    window.addEventListener('keydown', async function(e) {
        if (e.shiftKey && (e.key === 's' || e.key === 'S')) {
            e.preventDefault(); // 브라우저의 기본 동작(키 입력)을 막음
            const popup = document.getElementById('dcinside-filter-setting');
            if (popup) {
                popup.remove();
            } else {
                await showSettings();
            }
        }
    });

    GM_registerMenuCommand('글댓합 설정하기', showSettings);
    
    async function getUserPostCommentSum(uid) {
        if (!window._dcinside_user_sum_cache) window._dcinside_user_sum_cache = {};
        if (window._dcinside_user_sum_cache[uid]) return window._dcinside_user_sum_cache[uid];

        function getCookie(name) {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
        }
        let ci = getCookie('ci_t');
        if (!ci) ci = getCookie('ci_c');
        if (!ci) {
            return null;
        }

        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/gallog_user_layer/gallog_content_reple/', true);
            xhr.withCredentials = true;
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

            xhr.onload = function() {
                const text = xhr.responseText;
                const [post, comment] = text.split(',').map(x => parseInt(x, 10));
                if (!isNaN(post) && !isNaN(comment)) {
                    window._dcinside_user_sum_cache[uid] = { sum: post + comment, post, comment };
                    resolve({ sum: post + comment, post, comment });
                } else {
                    resolve(null);
                }
            };
            xhr.onerror = function() {
                resolve(null);
            };
            xhr.send(`ci_t=${encodeURIComponent(ci)}&user_id=${encodeURIComponent(uid)}`);
        });
    }

    const BLOCK_UID_KEY = 'dcinside_blocked_uids';
    const BLOCK_UID_EXPIRE = 1000 * 60 * 60 * 24 * 30; 

    async function addBlockedUid(uid, sum, post, comment, ratioBlocked) {
        await refreshBlockedUidsCache(true); 
        BLOCKED_UIDS_CACHE[uid] = { ts: Date.now(), sum: sum, post: post, comment: comment, ratioBlocked: !!ratioBlocked };
        await GM_setValue(BLOCK_UID_KEY, JSON.stringify(BLOCKED_UIDS_CACHE));
    }

    // 차단 여부 판단 헬퍼 함수
    function isUserBlocked({ sum, post, comment }) {
        if (masterDisabled) return false;
        // sum 차단
        let sumBlocked = threshold > 0 && sum > 0 && sum <= threshold;
        // ratio 차단
        let isRatioBlocked = false;
        if (ratioEnabled) {
            const useMin = !isNaN(ratioMin) && ratioMin > 0;
            const useMax = !isNaN(ratioMax) && ratioMax > 0;
            // 댓글/글 비율 (comment/post)
            let ratio = (post > 0) ? (comment / post) : 0;
            if (useMin && ratio >= ratioMin) {
                isRatioBlocked = true;
            }
            if (useMax && post > 0 && (post / comment) > ratioMax) {
                isRatioBlocked = true;
            }
        }
        return sumBlocked || isRatioBlocked;
    }

    // 범용 필터링 함수: DOM 요소, uid, userData, addBlockedUidFn
    async function applyBlockFilterToElement(element, uid, userData, addBlockedUidFn) {
        if (!userData) return;
        const blocked = isUserBlocked(userData);
        element.style.display = blocked ? 'none' : '';
        if (blocked) {
            let ratioBlocked = false;
            if (ratioEnabled) {
                let ratio = (userData.post > 0) ? (userData.comment / userData.post) : 0;
                if (ratioMin > 0 && ratio >= ratioMin) ratioBlocked = true;
                if (ratioMax > 0 && userData.post > 0 && (userData.post / userData.comment) > ratioMax) ratioBlocked = true;
            }
            await addBlockedUidFn(uid, userData.sum, userData.post, userData.comment, ratioBlocked);
        }
    }

    async function filterUsers() {
        if (masterDisabled) return;
        const rows = Array.from(document.querySelectorAll('tr.ub-content.us-post'));
        await Promise.all(rows.map(async (row) => {
            try {
                const writerTd = row.querySelector('td.gall_writer.ub-writer');
                if (!writerTd) return;
                const uid = writerTd.getAttribute('data-uid');
                if (!uid || uid.length < 3) return;

                const cachedData = BLOCKED_UIDS_CACHE[uid];
                if (cachedData) {
                    await applyBlockFilterToElement(row, uid, cachedData, addBlockedUid);
                    return;
                }

                const userData = await getUserPostCommentSum(uid);
                if (!userData) return;
                await applyBlockFilterToElement(row, uid, userData, addBlockedUid);
            } catch (e) {
                console.warn('[필터] 예외 발생:', e, row);
            }
        }));
    }

    async function filterComments() {
        if (masterDisabled) return;
        const comments = Array.from(document.querySelectorAll('div.comment_box ul.cmt_list li.ub-content'));
        await Promise.all(comments.map(async (commentEl) => {
            try {
                const writerSpan = commentEl.querySelector('span.gall_writer.ub-writer');
                if (!writerSpan) return;
                const uid = writerSpan.getAttribute('data-uid');
                if (!uid || uid.length < 3) return;

                const cachedData = BLOCKED_UIDS_CACHE[uid];
                if (cachedData) {
                    await applyBlockFilterToElement(commentEl, uid, cachedData, addBlockedUid);
                    return;
                }

                const userData = await getUserPostCommentSum(uid);
                if (!userData) return;
                await applyBlockFilterToElement(commentEl, uid, userData, addBlockedUid);
            } catch (e) {
                console.warn('[필터-댓글] 예외 발생:', e, commentEl);
            }
        }));
    }
    
    let BLOCKED_UIDS_CACHE = {};

    async function refreshBlockedUidsCache(noLog = false) {
        let data = await GM_getValue(BLOCK_UID_KEY, '{}');
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
        if (changed) await GM_setValue(BLOCK_UID_KEY, JSON.stringify(BLOCKED_UIDS_CACHE));
    }

    function hideBlockedRowsSync() {
        const useMin = !isNaN(ratioMin) && ratioMin > 0;
        const useMax = !isNaN(ratioMax) && ratioMax > 0;

        for (const row of document.querySelectorAll('tr.ub-content.us-post')) {
            if (masterDisabled) {
                row.style.display = '';
                continue;
            }
            const writerTd = row.querySelector('td.gall_writer.ub-writer');
            if (!writerTd) continue;
            const uid = writerTd.getAttribute('data-uid');
            if (!uid || uid.length < 3) continue;
            const cacheData = BLOCKED_UIDS_CACHE[uid];
            if (cacheData) {
                let sumBlocked = threshold > 0 && cacheData.sum > 0 && cacheData.sum <= threshold;
                let isRatioBlocked = false;
                if (ratioEnabled && cacheData.post !== undefined && cacheData.comment > 0) {
                    const ratio = cacheData.post / cacheData.comment;
                    if ((useMin && ratio < ratioMin) || (useMax && ratio > ratioMax)) {
                        isRatioBlocked = true;
                    }
                }
                row.style.display = (sumBlocked || isRatioBlocked) ? 'none' : '';
            }
        }
    }

    function setupBlocklistObserverSync() {
        const table = document.querySelector('table.gall_list');
        if (!table) return;
        const hideRows = hideBlockedRowsSync;
        hideRows();
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE && node.matches('tr.ub-content.us-post')) {
                        // 새로 추가된 행만 필터링
                        (async () => {
                            await filterUsers();
                        })();
                    }
                }
            }
        });
        observer.observe(table, { childList: true, subtree: true });
    }

    function hideBlockedCommentsSync() {
        const useMin = !isNaN(ratioMin) && ratioMin > 0;
        const useMax = !isNaN(ratioMax) && ratioMax > 0;

        for (const comment of document.querySelectorAll('div.comment_box ul.cmt_list li.ub-content')) {
            if (masterDisabled) {
                comment.style.display = '';
                continue;
            }
            const writerSpan = comment.querySelector('span.gall_writer.ub-writer');
            if (!writerSpan) continue;
            const uid = writerSpan.getAttribute('data-uid');
            if (!uid || uid.length < 3) continue;
            const cacheData = BLOCKED_UIDS_CACHE[uid];
            if (cacheData) {
                let sumBlocked = threshold > 0 && cacheData.sum > 0 && cacheData.sum <= threshold;
                let isRatioBlocked = false;
                if (ratioEnabled && cacheData.post !== undefined && cacheData.comment > 0) {
                    const ratio = cacheData.post / cacheData.comment;
                    if ((useMin && ratio < ratioMin) || (useMax && ratio > ratioMax)) {
                        isRatioBlocked = true;
                    }
                }
                comment.style.display = (sumBlocked || isRatioBlocked) ? 'none' : '';
            }
        }
    }

    function setupCommentBlocklistObserverSync() {
        const ul = document.querySelector('div.comment_box ul.cmt_list');
        if (!ul) return;
        const hideComments = hideBlockedCommentsSync;
        hideComments();
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE && node.matches('li.ub-content')) {
                        (async () => {
                            await filterComments();
                        })();
                    }
                }
            }
        });
        observer.observe(ul, { childList: true, subtree: true });
    }

    function initCommentObserver() {
        const commentBox = document.querySelector('div.comment_box');
        if (commentBox) {
            setupCommentBlocklistObserverSync();
            return;
        }
        
        const bodyObserver = new MutationObserver((mutations, observer) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.matches('div.comment_box') || node.querySelector('div.comment_box')) {
                            setupCommentBlocklistObserverSync();
                            observer.disconnect(); 
                            return;
                        }
                    }
                }
            }
        });
        bodyObserver.observe(document.body, { childList: true, subtree: true });
    }

    async function startBlocklist() {
        masterDisabled = await GM_getValue('dcinside_master_disabled', false);
        threshold = await GM_getValue('dcinside_threshold', 0);
        ratioEnabled = await GM_getValue('dcinside_ratio_filter_enabled', false);
        ratioMin = parseFloat(await GM_getValue('dcinside_ratio_min', ''));
        ratioMax = parseFloat(await GM_getValue('dcinside_ratio_max', ''));

        await refreshBlockedUidsCache();
        setupBlocklistObserverSync();
        initCommentObserver();
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startBlocklist);
    } else {
        startBlocklist();
    }

    window.addEventListener('load', () => {
        setTimeout(filterUsers, 1000);
        setTimeout(filterComments, 1000);
    });

    if (GM_getValue('dcinside_threshold') === undefined) {
        showSettings();
        GM_setValue('dcinside_threshold', 0);
    }
})(); 
