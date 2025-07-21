// ==UserScript==
// @name         DCInside 유저 글+댓글 합산 필터 (자동 가림)
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  유저의 글+댓글 합이 기준 이하일 경우 해당 유저의 글을 가립니다.
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

    async function showSettings() {
        const currentThreshold = await GM_getValue('dcinside_threshold', 0);
        let isDisabled = currentThreshold === 0;
        let lastNonZero = (currentThreshold > 0) ? currentThreshold : 100;

        const existingDiv = document.getElementById('dcinside-filter-setting');
        if (existingDiv) {
            existingDiv.remove();
        }

        const div = document.createElement('div');
        div.id = 'dcinside-filter-setting';
        div.style = 'position:fixed;top:30%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:24px 20px 18px 20px;min-width:220px;min-height:100px;z-index:99999;border:2px solid #333;border-radius:10px;box-shadow:0 0 10px #0008; cursor: move; user-select: none;';
        div.innerHTML = `
            <div style="position:absolute;top:8px;right:12px;z-index:100000;">
                <button id="dcinside-filter-close" style="background:none;border:none;font-size:20px;cursor:pointer;line-height:1;">✕</button>
            </div>
            <h3 style="cursor: default;">유저 글+댓글 합 기준값 입력</h3>
            <div style="margin-bottom:8px;">
                <input id="dcinside-disable-checkbox" type="checkbox" style="vertical-align:middle;" ${isDisabled ? 'checked' : ''}>
                <label for="dcinside-disable-checkbox" style="font-size:15px;vertical-align:middle;cursor:pointer;">기능 끄기</label>
            </div>
            <input id="dcinside-threshold-input" type="number" min="0" value="${currentThreshold}" style="width:80px;font-size:16px; cursor: initial;" ${isDisabled ? 'disabled' : ''}>
            <button id="dcinside-threshold-save" style="margin-left:10px;font-size:16px;border:2px solid #000;border-radius:4px;background:#fff; cursor: pointer;">저장 & 실행</button>
            <div style="margin-top:18px;font-size:15px;color:#444;text-align:left;">단축키: <b>Shift+s</b></div>
        `;
        document.body.appendChild(div);

        const input = document.getElementById('dcinside-threshold-input');
        const disableCheckbox = document.getElementById('dcinside-disable-checkbox');
        input.focus();
        input.select();

        disableCheckbox.addEventListener('change', function() {
            if (disableCheckbox.checked) {
                lastNonZero = parseInt(input.value, 10) > 0 ? parseInt(input.value, 10) : lastNonZero;
                input.value = 0;
                input.disabled = true;
            } else {
                input.value = lastNonZero;
                input.disabled = false;
                input.focus();
                input.select();
            }
        });

        document.getElementById('dcinside-filter-close').onclick = function() {
            div.remove();
        };

        let isDragging = false;
        let offsetX, offsetY;

        div.addEventListener('mousedown', function(e) {
            if (e.target.id === 'dcinside-threshold-input' || e.target.id === 'dcinside-threshold-save' || e.target.id === 'dcinside-filter-close' || e.target.id === 'dcinside-disable-checkbox') return;
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
            let val = parseInt(input.value, 10);
            if (isNaN(val)) val = 0;
            await GM_setValue('dcinside_threshold', val);
            threshold = val;
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
            await showSettings();
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
                    window._dcinside_user_sum_cache[uid] = post + comment;
                    resolve(post + comment);
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

    async function addBlockedUid(uid, sum) {
        await refreshBlockedUidsCache(true); 
        BLOCKED_UIDS_CACHE[uid] = { ts: Date.now(), sum: sum };
        await GM_setValue(BLOCK_UID_KEY, JSON.stringify(BLOCKED_UIDS_CACHE));
    }

    async function filterUsers() {
        const rows = document.querySelectorAll('tr.ub-content.us-post');
        for (const row of rows) {
            try {
                const writerTd = row.querySelector('td.gall_writer.ub-writer');
                if (!writerTd) continue;
                const uid = writerTd.getAttribute('data-uid');
                if (!uid || uid.length < 3) continue;

                const cachedData = BLOCKED_UIDS_CACHE[uid];
                if (cachedData) {
                    if (cachedData.sum <= threshold) {
                        row.style.display = 'none';
                    } else {
                        row.style.display = '';
                    }
                    continue;
                }

                const sum = await getUserPostCommentSum(uid);
                
                if (sum !== null && sum <= threshold && sum !== 0) {
                    row.style.display = 'none';
                    await addBlockedUid(uid, sum);
                }
            } catch (e) {
                console.warn('[필터] 예외 발생:', e, row);
            }
        }
    }

    async function filterComments() {
        const comments = document.querySelectorAll('div.comment_box ul.cmt_list li.ub-content');
        for (const comment of comments) {
            try {
                const writerSpan = comment.querySelector('span.gall_writer.ub-writer');
                if (!writerSpan) continue;
                const uid = writerSpan.getAttribute('data-uid');
                if (!uid || uid.length < 3) continue; 

                const cachedData = BLOCKED_UIDS_CACHE[uid];
                if (cachedData) {
                    if (cachedData.sum <= threshold) {
                        comment.style.display = 'none';
                    } else {
                        comment.style.display = '';
                    }
                    continue;
                }

                const sum = await getUserPostCommentSum(uid);
                
                if (sum !== null && sum <= threshold && sum !== 0) {
                    comment.style.display = 'none';
                    await addBlockedUid(uid, sum);
                }
            } catch (e) {
                console.warn('[필터-댓글] 예외 발생:', e, comment);
            }
        }
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
        const rows = document.querySelectorAll('tr.ub-content.us-post');
        for (const row of rows) {
            const writerTd = row.querySelector('td.gall_writer.ub-writer');
            if (!writerTd) continue;
            const uid = writerTd.getAttribute('data-uid');
            if (!uid || uid.length < 3) continue;

            const cacheData = BLOCKED_UIDS_CACHE[uid];
            if (cacheData && cacheData.sum <= threshold) {
                row.style.display = 'none';
            }
        }
    }

    function setupBlocklistObserverSync() {
        const table = document.querySelector('table.gall_list');
        if (!table) return;
        const hideRows = hideBlockedRowsSync;
        hideRows();
        const observer = new MutationObserver(hideRows);
        observer.observe(table, { childList: true, subtree: true });
    }

    function hideBlockedCommentsSync() {
        const comments = document.querySelectorAll('div.comment_box ul.cmt_list li.ub-content');
        for (const comment of comments) {
            const writerSpan = comment.querySelector('span.gall_writer.ub-writer');
            if (!writerSpan) continue;
            const uid = writerSpan.getAttribute('data-uid');
            if (!uid || uid.length < 3) continue;
            const cacheData = BLOCKED_UIDS_CACHE[uid];
            if (cacheData && cacheData.sum <= threshold) {
                comment.style.display = 'none';
            }
        }
    }

    function setupCommentBlocklistObserverSync() {
        const ul = document.querySelector('div.comment_box ul.cmt_list');
        if (!ul) return;
        const hideComments = hideBlockedCommentsSync;
        hideComments();
        const observer = new MutationObserver(hideComments);
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

    if (GM_getValue('dcinside_threshold') === 0 && !GM_getValue('dcinside_threshold_set')) {
        showSettings();
        GM_setValue('dcinside_threshold_set', true);
    }
})(); 
