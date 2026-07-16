// ==UserScript==
// @name         DC_UserFilter_Mobile
// @namespace    http://tampermonkey.net/
// @version      3.4.5-beta
// @description  유저 필터링, UI 개선, 개인 차단/해제 기능
// @author       domato153
// @match        https://gall.dcinside.com/*
// @noframes
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
https://namu.wiki/w/DBAD%20%EB%9D%BC%EC%9D%B4%EC%84%A0%EC%8A%A4
------------------------------------------------------------------*/

(function () {
    'use strict';

    const __dcufRoot = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
    if (window.top !== window.self) return;

    const detectedPageType = ((window.location.pathname || '').match(/\/board\/(lists|view|write)(?:\/|$)/) || [])[1] || 'other';
    const pageContext = Object.freeze({
        type: detectedPageType,
        isList: detectedPageType === 'lists',
        isView: detectedPageType === 'view',
        isWrite: detectedPageType === 'write',
        isOther: detectedPageType === 'other',
        isTargetPage: detectedPageType !== 'other',
        hasListSurface: detectedPageType === 'lists' || detectedPageType === 'view',
        hasComments: detectedPageType === 'view'
    });
    __dcufRoot.__dcufPageContext = pageContext;
    window.__dcufPageContext = pageContext;
    const exposePageContextAttribute = () => document.documentElement?.setAttribute('data-dcuf-page-context', detectedPageType);
    if (document.documentElement) exposePageContextAttribute();
    else document.addEventListener('DOMContentLoaded', exposePageContextAttribute, { once: true });

    const previousBoot = __dcufRoot.__dcufBootController || window.__dcufBootController;
    if (previousBoot) {
        if (previousBoot.state === 'locked' || previousBoot.state === 'preparing') previousBoot.ensure('duplicate-runtime');
        else if (previousBoot.state === 'degraded') previousBoot.requestRecovery?.('duplicate-runtime');
        console.warn('DCinside User Filter: duplicate runtime detected; reusing bootstrap.');
        return;
    }

    if (!__dcufRoot.__dcufBfcacheOptOutInstalled) {
        __dcufRoot.__dcufBfcacheOptOutInstalled = true;
        const preventBackForwardCache = () => {};
        try { __dcufRoot.addEventListener('unload', preventBackForwardCache, { capture: true }); }
        catch { window.addEventListener('unload', preventBackForwardCache, { capture: true }); }
    }

    let dcFilterSettings = {};
    let userSumCache = {};
    let isInitialized = false;
    let isUiInitialized = false;
    let activeShortcutObject = null;

    const READY_CLASS = 'script-ui-ready';
    const STATE_ATTR = 'data-dcuf-boot-state';
    const LOCK_STYLE_ID = 'dcuf-initial-lock-style';
    const OVERLAY_ID = 'dcuf-boot-overlay';
    const OVERLAY_STYLE_ID = 'dcuf-boot-overlay-style';
    const DEGRADED_STYLE_ID = 'dcuf-degraded-filter-style';
    const DEGRADED_BANNER_ID = 'dcuf-degraded-banner';
    const testBootConfig = __dcufRoot.__DCUF_TESTBED_CONFIG__?.boot || null;
    const ABSOLUTE_DEADLINE_MS = Math.max(20, Number(testBootConfig?.absoluteDeadlineMs) || 15000);
    const CRITICAL_DEADLINE_MS = Math.max(20, Number(testBootConfig?.criticalDeadlineMs) || 6000);
    const startedAt = Date.now();
    const diagnosticsBuffer = [];
    const rollbackHandlers = new Set();
    const recoveryHandlers = new Set();
    const readyHandlers = new Set();
    let ensureTimer = 0;
    let absoluteTimer = 0;
    let criticalTimer = 0;
    let domReadyListener = null;
    let loadListener = null;

    const pageType = pageContext.type;
    const isTargetPage = () => pageType !== 'other';
    const note = (label, detail = null) => {
        const entry = { label, detail, ts: Date.now(), elapsedMs: Date.now() - startedAt };
        const api = window.__dcufDiagnostics;
        if (typeof api?.note === 'function') api.note(label, entry);
        else {
            diagnosticsBuffer.push(entry);
            if (diagnosticsBuffer.length > 40) diagnosticsBuffer.shift();
        }
    };
    const flushDiagnostics = () => {
        const api = window.__dcufDiagnostics;
        if (typeof api?.note !== 'function') return;
        diagnosticsBuffer.splice(0).forEach((entry) => api.note(entry.label, entry));
    };
    const removeBootChrome = () => {
        document.getElementById(OVERLAY_ID)?.remove();
        document.getElementById(LOCK_STYLE_ID)?.remove();
        document.getElementById(OVERLAY_STYLE_ID)?.remove();
    };
    const stopTimers = () => {
        if (ensureTimer) clearInterval(ensureTimer);
        if (absoluteTimer) clearTimeout(absoluteTimer);
        if (criticalTimer) clearTimeout(criticalTimer);
        ensureTimer = absoluteTimer = criticalTimer = 0;
        if (domReadyListener) document.removeEventListener('DOMContentLoaded', domReadyListener);
        if (loadListener) window.removeEventListener('load', loadListener);
        domReadyListener = loadListener = null;
    };
    const ensureLockStyle = () => {
        const mount = document.head || document.documentElement;
        if (!mount || document.getElementById(LOCK_STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = LOCK_STYLE_ID;
        style.textContent = `
            html[${STATE_ATTR}="locked"] body,
            html[${STATE_ATTR}="preparing"] body {
                opacity: 0 !important;
                visibility: hidden !important;
                pointer-events: none !important;
            }
        `;
        mount.appendChild(style);
    };
    const ensureOverlay = () => {
        if (!isTargetPage() || !document.documentElement) return;
        const mount = document.head || document.documentElement;
        if (mount && !document.getElementById(OVERLAY_STYLE_ID)) {
            const style = document.createElement('style');
            style.id = OVERLAY_STYLE_ID;
            style.textContent = `
                #${OVERLAY_ID} {
                    position: fixed !important; inset: 0 !important; z-index: 2147483646 !important;
                    box-sizing: border-box !important; display: flex !important; align-items: center !important;
                    justify-content: center !important; width: 100vw !important; height: 100vh !important;
                    margin: 0 !important; padding: 24px !important; visibility: visible !important;
                    opacity: 1 !important; pointer-events: auto !important;
                    background: linear-gradient(180deg,#f7f9fc,#eef2f7) !important;
                }
                #${OVERLAY_ID} .dcuf-boot-card {
                    box-sizing: border-box !important; width: min(420px,calc(100vw - 32px)) !important;
                    padding: 22px 20px 18px !important; border: 1px solid #c5ceda !important;
                    border-radius: 18px !important; background: #fff !important; color: #2b3340 !important;
                    text-align: center !important; box-shadow: 0 20px 48px rgba(31,45,68,.12) !important;
                }
                #${OVERLAY_ID} .dcuf-boot-title { margin-bottom: 8px !important; font: 700 17px/1.35 sans-serif !important; }
                #${OVERLAY_ID} .dcuf-boot-copy { margin-bottom: 14px !important; color: #5a6575 !important; font: 500 13px/1.55 sans-serif !important; }
                #${OVERLAY_ID} .dcuf-boot-bar { height: 4px !important; overflow: hidden !important; border-radius: 999px !important; background: #cbd3df !important; }
                #${OVERLAY_ID} .dcuf-boot-bar::before {
                    content: '' !important; display: block !important; width: 42% !important; height: 100% !important;
                    border-radius: inherit !important; background: linear-gradient(90deg,#245bda,#5d87f0) !important;
                    animation: dcuf-boot-progress 1s ease-in-out infinite !important;
                }
                html.dc-filter-dark-mode #${OVERLAY_ID} { background: linear-gradient(180deg,#1d222a,#11151b) !important; }
                html.dc-filter-dark-mode #${OVERLAY_ID} .dcuf-boot-card { border-color: #475160 !important; background: #1c2129 !important; color: #e7ebf2 !important; }
                @keyframes dcuf-boot-progress { from { transform: translateX(-120%); } to { transform: translateX(260%); } }
                @media (prefers-reduced-motion: reduce) { #${OVERLAY_ID} .dcuf-boot-bar::before { width: 100% !important; animation: none !important; } }
            `;
            mount.appendChild(style);
        }
        if (document.getElementById(OVERLAY_ID)) return;
        const overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        overlay.setAttribute('role', 'status');
        overlay.setAttribute('aria-live', 'polite');
        overlay.setAttribute('aria-atomic', 'true');
        const card = document.createElement('div');
        card.className = 'dcuf-boot-card';
        const title = document.createElement('div');
        title.className = 'dcuf-boot-title';
        title.textContent = 'UI 준비 중';
        const copy = document.createElement('div');
        copy.className = 'dcuf-boot-copy';
        copy.append(
            document.createTextNode('광고 차단과 충돌하면 로딩이 지연될 수 있습니다.'),
            document.createElement('br'),
            document.createTextNode('DCInside에서는 광고 차단을 꺼주세요.')
        );
        const bar = document.createElement('div');
        bar.className = 'dcuf-boot-bar';
        bar.setAttribute('aria-hidden', 'true');
        card.append(title, copy, bar);
        overlay.appendChild(card);
        document.documentElement.appendChild(overlay);
    };
    const ensureDegradedUi = (reason) => {
        if ((pageType === 'list' || pageType === 'view') && !document.getElementById(DEGRADED_STYLE_ID)) {
            const style = document.createElement('style');
            style.id = DEGRADED_STYLE_ID;
            style.textContent = `
                html[${STATE_ATTR}="degraded"] :is(
                    .gall_listwrap table.gall_list,.list_wrap table.gall_list,.custom-mobile-list,
                    .gall_exposure_list,#focus_cmt .comment_box,div[id^="comment_wrap_"] .comment_box,
                    .view_comment.image_comment .comment_box
                ) { opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; }
            `;
            (document.head || document.documentElement)?.appendChild(style);
        }
        if (!document.body || document.getElementById(DEGRADED_BANNER_ID)) return;
        const banner = document.createElement('aside');
        banner.id = DEGRADED_BANNER_ID;
        banner.dataset.reason = reason;
        banner.setAttribute('role', 'status');
        banner.style.cssText = 'position:fixed!important;left:12px!important;right:12px!important;bottom:12px!important;z-index:2147483645!important;box-sizing:border-box!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;padding:12px 14px!important;border:1px solid #d5a93a!important;border-radius:12px!important;background:#fff8dd!important;color:#4f3b00!important;box-shadow:0 8px 28px rgba(0,0,0,.18)!important;font:600 13px/1.4 sans-serif!important;pointer-events:auto!important;visibility:visible!important;opacity:1!important;';
        const message = document.createElement('span');
        message.textContent = pageType === 'write' ? 'DCUF failed; the native write page is available.' : 'DCUF is recovering; filterable areas are temporarily withheld.';
        const reload = document.createElement('button');
        reload.type = 'button';
        reload.textContent = 'Reload';
        reload.style.cssText = 'min-width:76px!important;min-height:40px!important;padding:8px 12px!important;border:1px solid #9c7716!important;border-radius:9px!important;background:#fff!important;color:#4f3b00!important;font-weight:700!important;cursor:pointer!important;';
        reload.addEventListener('click', () => location.reload());
        banner.append(message, reload);
        document.body.appendChild(banner);
    };

    const bootController = {
        state: isTargetPage() ? 'locked' : 'idle',
        pageType,
        startedAt,
        ensure(reason = 'ensure') {
            if (!isTargetPage() || this.state === 'ready' || this.state === 'degraded') return true;
            document.documentElement?.setAttribute(STATE_ATTR, this.state === 'preparing' ? 'preparing' : 'locked');
            ensureLockStyle();
            ensureOverlay();
            note('boot.ensure', { reason });
            return !!document.getElementById(LOCK_STYLE_ID) && !!document.getElementById(OVERLAY_ID);
        },
        startPreparing(reason = 'main') {
            if (!isTargetPage() || this.state === 'ready' || this.state === 'degraded') return;
            this.state = 'preparing';
            document.documentElement?.setAttribute(STATE_ATTR, 'preparing');
            note('boot.preparing', { reason });
        },
        registerRollback(fn) { if (typeof fn === 'function') rollbackHandlers.add(fn); return () => rollbackHandlers.delete(fn); },
        registerRecovery(fn) { if (typeof fn === 'function') recoveryHandlers.add(fn); return () => recoveryHandlers.delete(fn); },
        onReady(fn) {
            if (typeof fn !== 'function') return () => {};
            if (this.state === 'ready') queueMicrotask(fn);
            else readyHandlers.add(fn);
            return () => readyHandlers.delete(fn);
        },
        requestRecovery(reason = 'manual') {
            recoveryHandlers.forEach((fn) => { try { fn(reason); } catch (error) { console.warn('[DCUF boot] recovery failed:', error); } });
        },
        markReady(reason = 'ready') {
            if (this.state === 'ready') return;
            const recovered = this.state === 'degraded';
            this.state = 'ready';
            __dcufRoot.__dcufRuntimeState = 'ready';
            document.documentElement?.setAttribute(STATE_ATTR, 'ready');
            document.documentElement?.classList.add(READY_CLASS);
            document.body?.classList.add(READY_CLASS);
            stopTimers();
            removeBootChrome();
            document.getElementById(DEGRADED_STYLE_ID)?.remove();
            document.getElementById(DEGRADED_BANNER_ID)?.remove();
            note(recovered ? 'boot.recovered' : 'boot.ready', { reason });
            flushDiagnostics();
            readyHandlers.forEach((fn) => { try { fn(); } catch (error) { console.warn('[DCUF boot] ready handler failed:', error); } });
            readyHandlers.clear();
            window.dispatchEvent(new CustomEvent('dcuf:boot-ready', { detail: { reason, recovered } }));
        },
        degrade(reason = 'deadline') {
            if (this.state === 'ready' || this.state === 'degraded') return;
            rollbackHandlers.forEach((fn) => { try { fn(reason); } catch (error) { console.warn('[DCUF boot] rollback failed:', error); } });
            ensureDegradedUi(reason);
            this.state = 'degraded';
            __dcufRoot.__dcufRuntimeState = 'degraded';
            document.documentElement?.setAttribute(STATE_ATTR, 'degraded');
            document.documentElement?.classList.add(READY_CLASS);
            document.body?.classList.add(READY_CLASS);
            stopTimers();
            removeBootChrome();
            note('boot.degraded', { reason });
            flushDiagnostics();
            window.dispatchEvent(new CustomEvent('dcuf:boot-degraded', { detail: { reason } }));
        },
        note,
        flushDiagnostics
    };

    const markUiReady = (reason = 'ready') => bootController.markReady(reason);
    const ensureBootUi = (reason = 'ensure-boot-ui') => bootController.ensure(reason);
    const startBootUiWatchdog = () => {
        if (!isTargetPage() || ensureTimer) return;
        const tick = () => bootController.ensure('watchdog');
        ensureTimer = setInterval(tick, 80);
        absoluteTimer = setTimeout(() => bootController.degrade('absolute-deadline'), ABSOLUTE_DEADLINE_MS);
        domReadyListener = () => {
            note('boot.dom-content-loaded');
            tick();
            if ((pageType === 'list' || pageType === 'view') && !criticalTimer) {
                criticalTimer = setTimeout(() => bootController.degrade('critical-deadline'), CRITICAL_DEADLINE_MS);
            }
        };
        loadListener = tick;
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', domReadyListener, { once: true });
        } else {
            domReadyListener();
        }
        window.addEventListener('load', loadListener, { once: true });
        tick();
    };

    __dcufRoot.__dcufRuntimeLoaded = `dcuf-${Date.now()}`;
    __dcufRoot.__dcufRuntimeState = 'initializing';
    __dcufRoot.__dcufBootController = bootController;
    window.__dcufBootController = bootController;
    __dcufRoot.__dcufEnsureBootUi = ensureBootUi;
    window.__dcufEnsureBootUi = ensureBootUi;
    note('boot.start', { pageType });
    if (isTargetPage()) {
        document.documentElement?.setAttribute(STATE_ATTR, 'locked');
        ensureLockStyle();
        ensureOverlay();
        startBootUiWatchdog();
    }
    // Phase 2 runtime shared prelude
/**
 * Shared storage/schema constants extracted from v2.7.5.4.
 */
const FILTER_CONSTANTS = {
            STORAGE_KEYS: {
                MASTER_DISABLED: 'dcinside_master_disabled',
                EXCLUDE_RECOMMENDED: 'dcinside_exclude_recommended',
                THRESHOLD: 'dcinside_threshold',
                RATIO_ENABLED: 'dcinside_ratio_filter_enabled',
                RATIO_MIN: 'dcinside_ratio_min',
                RATIO_MAX: 'dcinside_ratio_max',
                BLOCK_GUEST: 'dcinside_block_guest',
                BLOCK_PROXY: 'dcinside_proxy_ip_block_enabled',
                BLOCK_TELECOM: 'dcinside_telecom_ip_block_enabled',
                BLOCK_CONFIG: 'dcinside_block_config',
                BLOCK_CONFIG_MIGRATION_V275_DONE: 'dcinside_block_config_migration_v275_done',
                BLOCK_CONFIG_MIGRATION_V275_BACKUP: 'dcinside_block_config_migration_v275_backup',
                BLOCKED_UIDS: 'dcinside_blocked_uids',
                BLOCKED_GUESTS: 'dcinside_blocked_guests',
                SHORTCUT_KEY: 'dcinside_shortcut_key',
                // [v2.3.1 추가] 개인 차단 기능용 저장 키
                PERSONAL_BLOCK_LIST: 'dcinside_personal_block_list',
                // [신규] 개인 차단 기능 On/Off 저장 키
                PERSONAL_BLOCK_ENABLED: 'dcinside_personal_block_enabled',
                FAB_POSITION: 'dcinside_fab_position',
                FAB_SCALE_PERCENT: 'dcinside_fab_scale_percent',
                MANAGEMENT_PANEL_GEOMETRY: 'dcinside_management_panel_geometry',
            },
            SELECTORS: {
                POST_LIST_CONTAINER: 'table.gall_list tbody',
                COMMENT_CONTAINER: 'div.comment_box ul.cmt_list',
                POST_VIEW_LIST_CONTAINER: 'div.gall_exposure_list > ul',
                POST_ITEM: 'tr.ub-content',
                COMMENT_ITEM: 'li.ub-content, li[id^="comment_li_"], li[id^="reply_li_"]',
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
                PROXY_BLOCK_MODE_GROUP: 'dcinside-proxy-ip-block-mode-group',
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

const STORAGE_KEYS = FILTER_CONSTANTS.STORAGE_KEYS;
const SELECTORS = FILTER_CONSTANTS.SELECTORS;
const API_PATHS = FILTER_CONSTANTS.API;
const CUSTOM_ATTRS = FILTER_CONSTANTS.CUSTOM_ATTRS;
const UI_IDS = FILTER_CONSTANTS.UI_IDS;
const ETC_CONSTANTS = FILTER_CONSTANTS.ETC;

    const DCUF_SHARED_SCHEMA = Object.freeze({ FILTER_CONSTANTS, STORAGE_KEYS, SELECTORS, API_PATHS, CUSTOM_ATTRS, UI_IDS, ETC_CONSTANTS });

/**
 * Shared IP-related datasets extracted from v2.7.5.4 for 3.0 refactoring.
 * This is the planned single source of truth for mobile and PC filter rules.
 */
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

const PROXY_MODE = Object.freeze({ OFF: 0, STRICT: 1, AGGRESSIVE: 2 });

// IMPORTANT: split on real whitespace (`/\s+/`), not a literal backslash-s.
// A bad escape here collapses the whole dataset into one token, which breaks
// domestic VPN/owner-based blocking (for example Mudfish) while foreign-IP
// blocking may still appear to work.
const PROXY_STRICT_PREFIXES = `
            1.176 1.201 1.215 1.227 1.228 1.229 1.231 1.237 1.245 1.248 1.252 1.254 2.56 2.57 2.58 2.59 3.36 5.22
            5.44 5.45 5.61 5.79 5.104 5.133 5.157 5.180 5.181 5.182 5.183 5.252 5.253 5.254 13.125 14.32 14.37 14.42
            14.51 14.56 14.63 14.136 20.194 23.26 23.27 23.29 23.227 23.249 24.235 27.102 31.3 31.13 31.14 31.24 31.25 31.40
            31.42 31.56 31.57 31.58 31.59 31.130 31.131 31.133 31.135 31.169 31.170 31.186 31.187 31.193 31.204 31.217 31.220 31.222
            34.22 34.64 36.38 36.50 36.255 37.0 37.19 37.35 37.46 37.49 37.58 37.97 37.120 37.143 37.221 37.235 38.48 38.54
            38.65 38.95 38.132 38.180 38.200 38.201 38.202 38.203 38.204 38.205 38.206 39.114 39.116 39.118 39.121 39.123 39.126 40.183
            41.223 43.225 43.226 45.8 45.9 45.10 45.11 45.12 45.13 45.14 45.15 45.33 45.38 45.59 45.66 45.67 45.74 45.80
            45.81 45.82 45.83 45.84 45.85 45.86 45.87 45.88 45.89 45.90 45.91 45.92 45.93 45.94 45.95 45.128 45.129 45.130
            45.131 45.132 45.133 45.134 45.135 45.136 45.137 45.139 45.140 45.141 45.142 45.143 45.144 45.145 45.146 45.147 45.148 45.149
            45.150 45.152 45.153 45.154 45.155 45.156 45.157 45.192 45.251 46.28 46.34 46.37 46.102 46.148 46.183 46.202 46.203 49.161
            49.246 50.7 50.114 52.78 52.79 52.141 52.144 52.231 58.124 58.226 58.228 58.237 59.4 59.6 59.8 59.10 59.14 59.20
            59.22 59.24 61.74 61.82 61.84 61.85 61.101 61.254 62.3 62.68 62.112 62.133 62.197 62.204 62.210 62.216 63.141 63.246
            64.43 64.79 64.224 66.78 66.85 66.90 66.150 66.225 66.249 66.251 67.207 67.210 67.227 69.10 69.168 72.5 72.14 72.18
            74.49 74.63 74.91 74.118 77.36 77.78 77.81 77.83 77.232 77.237 77.243 77.247 78.31 78.41 79.98 79.110 79.127 79.135
            80.71 80.76 80.89 80.93 80.96 80.97 80.243 81.17 81.22 81.29 81.92 81.161 81.180 81.181 82.102 82.117 82.140 82.149
            82.152 82.153 82.180 82.197 83.97 83.136 83.143 83.150 83.171 83.243 84.17 84.21 84.32 84.39 84.46 84.54 84.247 84.252
            85.8 85.11 85.28 85.31 85.120 85.121 85.122 85.132 85.190 85.203 85.204 85.206 85.208 85.209 85.254 86.38 86.48 86.62
            86.104 86.105 86.106 86.107 87.101 87.236 87.239 87.249 88.214 88.216 88.218 89.31 89.33 89.36 89.37 89.38 89.40 89.41
            89.42 89.44 89.45 89.46 89.47 89.116 89.117 89.184 89.185 89.187 89.213 89.238 89.249 91.90 91.92 91.102 91.123 91.132
            91.190 91.193 91.195 91.196 91.197 91.204 91.205 91.207 91.209 91.214 91.217 91.219 91.220 91.221 91.225 91.226 91.229 91.231
            91.232 91.233 91.234 91.238 91.239 91.240 91.242 91.245 91.246 92.38 92.50 92.51 92.61 92.62 92.112 92.113 92.114 92.118
            92.119 92.223 92.240 92.242 92.243 92.249 93.113 93.114 93.115 93.119 93.120 93.152 93.177 93.185 93.189 94.74 94.101 94.137
            94.140 94.154 94.156 94.176 94.177 94.190 94.198 94.242 95.141 95.153 95.156 95.173 95.174 95.181 95.214 102.38 102.128 102.129
            102.165 102.218 103.4 103.6 103.10 103.18 103.27 103.44 103.46 103.47 103.69 103.75 103.86 103.99 103.100 103.110 103.111 103.115
            103.119 103.130 103.149 103.155 103.160 103.209 103.210 103.221 103.225 103.254 104.16 104.17 104.18 104.19 104.20 104.21 104.22 104.23
            104.24 104.25 104.26 104.27 104.28 104.128 104.131 104.167 104.218 104.222 104.232 104.233 104.234 104.236 104.239 104.243 104.245 104.250
            104.251 104.252 106.185 106.186 106.187 106.243 107.22 107.155 107.161 107.167 107.170 107.181 107.190 107.191 108.61 108.165 108.181 109.70
            109.74 109.123 109.160 109.176 109.200 109.203 109.207 109.236 109.238 110.47 112.72 112.152 112.156 112.158 112.160 112.167 112.169 112.171
            112.172 112.173 112.186 113.52 113.130 113.203 114.199 114.207 115.22 115.23 115.40 115.71 116.120 118.32 118.33 118.37 118.38 118.40
            118.47 118.99 118.221 118.222 119.194 119.197 119.203 119.205 120.142 121.129 121.130 121.132 121.133 121.135 121.139 121.140 121.141 121.148
            121.149 121.151 121.155 121.162 121.171 121.172 121.173 121.176 121.183 121.185 121.187 122.42 123.215 124.5 124.54 124.111 125.132 125.138
            125.140 125.181 125.182 125.186 125.240 128.199 130.185 130.195 134.255 136.0 138.128 138.199 139.28 140.99 140.248 141.0 141.11 141.98
            141.164 141.193 142.111 142.252 145.14 145.223 146.19 146.56 146.66 146.70 146.75 146.255 147.46 147.47 147.78 147.79 147.136 148.135
            149.19 149.22 149.34 149.36 149.40 149.50 149.62 149.88 149.102 149.143 149.154 151.101 151.236 152.89 154.7 154.9 154.13 154.16
            154.17 154.28 154.29 154.30 154.36 154.37 154.47 154.70 154.85 154.92 154.95 154.127 154.194 154.199 154.216 154.218 155.133 156.67
            156.146 156.225 156.238 156.246 157.254 158.46 158.115 158.179 158.220 158.247 158.255 159.48 159.148 160.20 160.238 162.159 162.213 162.217
            162.218 162.221 162.243 162.246 162.248 162.252 162.254 163.5 165.231 165.246 166.0 166.88 167.88 167.100 167.253 168.91 168.93 168.199
            168.235 169.150 171.22 171.25 172.84 172.85 172.94 172.98 172.102 172.103 172.111 172.224 172.225 172.226 173.46 173.211 173.245 173.255
            174.140 175.110 175.115 175.118 175.127 175.197 175.203 175.205 175.207 175.208 175.210 175.211 176.9 176.10 176.46 176.53 176.58 176.67
            176.96 176.97 176.98 176.100 176.105 176.110 176.111 176.112 176.113 176.116 176.118 176.121 176.123 176.124 176.125 176.126 176.223 176.227
            177.67 178.62 178.79 178.132 178.157 178.159 178.162 178.171 178.209 178.211 178.212 178.218 178.249 178.255 179.43 179.61 180.68 180.149
            180.224 181.41 181.214 181.215 182.161 182.218 182.226 182.229 183.101 183.103 183.104 183.105 183.107 184.174 185.4 185.9 185.12 185.15
            185.19 185.23 185.25 185.26 185.30 185.34 185.37 185.45 185.46 185.49 185.51 185.52 185.54 185.59 185.75 185.76 185.81 185.82
            185.87 185.89 185.90 185.91 185.92 185.93 185.94 185.95 185.96 185.100 185.101 185.104 185.105 185.107 185.111 185.114 185.119 185.120
            185.123 185.126 185.128 185.130 185.132 185.135 185.143 185.144 185.145 185.147 185.151 185.152 185.153 185.154 185.156 185.158 185.159 185.161
            185.162 185.163 185.164 185.165 185.167 185.169 185.171 185.172 185.173 185.174 185.175 185.177 185.180 185.181 185.182 185.183 185.184 185.185
            185.187 185.188 185.189 185.192 185.193 185.194 185.195 185.196 185.197 185.198 185.199 185.200 185.201 185.202 185.203 185.204 185.205 185.206
            185.207 185.208 185.209 185.210 185.211 185.212 185.213 185.215 185.216 185.217 185.218 185.219 185.220 185.221 185.222 185.225 185.226 185.227
            185.228 185.229 185.230 185.231 185.232 185.233 185.235 185.236 185.237 185.238 185.239 185.240 185.241 185.242 185.243 185.244 185.245 185.246
            185.247 185.248 185.249 185.250 185.251 185.252 185.253 185.254 185.255 188.66 188.74 188.116 188.119 188.191 188.208 188.209 188.213 188.214
            188.215 188.226 188.240 188.241 190.2 190.106 191.96 191.101 192.30 192.34 192.36 192.40 192.54 192.55 192.71 192.73 192.81 192.99
            192.109 192.110 192.119 192.121 192.142 192.145 192.162 192.184 192.211 192.223 192.241 192.253 193.0 193.9 193.22 193.27 193.29 193.30
            193.31 193.32 193.36 193.37 193.38 193.42 193.43 193.46 193.47 193.56 193.57 193.58 193.105 193.106 193.108 193.111 193.135 193.142
            193.148 193.149 193.160 193.168 193.176 193.182 193.187 193.189 193.201 193.203 193.223 193.226 193.227 193.231 193.238 193.239 194.5 194.14
            194.15 194.26 194.31 194.32 194.33 194.34 194.35 194.36 194.37 194.48 194.50 194.53 194.59 194.60 194.61 194.68 194.71 194.79
            194.93 194.99 194.102 194.104 194.105 194.110 194.114 194.124 194.126 194.135 194.145 194.146 194.147 194.153 194.156 194.169 194.180 194.187
            194.195 194.233 194.242 195.8 195.12 195.34 195.54 195.58 195.64 195.80 195.88 195.158 195.160 195.179 195.181 195.184 195.189 195.206
            195.210 195.216 195.242 196.16 196.17 196.18 196.240 196.244 196.245 198.56 198.58 198.60 198.145 198.147 198.190 198.211 198.232 199.84
            199.96 199.115 199.120 199.241 202.168 203.21 203.32 203.34 204.93 204.124 204.217 205.142 205.143 206.53 206.80 206.123 206.127 206.144
            206.195 206.220 206.232 207.45 207.230 207.244 208.68 209.58 209.198 209.222 209.235 210.97 210.123 210.222 211.43 211.53 211.55 211.107
            211.183 211.184 211.222 211.226 211.228 211.230 211.237 211.245 211.251 211.253 212.30 212.60 212.80 212.81 212.90 212.92 212.97 212.102
            212.103 212.119 212.192 213.109 213.134 213.139 213.152 213.184 213.229 213.230 213.232 216.97 216.131 216.158 216.173 216.189 216.227 216.246
            216.247 217.9 217.64 217.78 217.138 217.148 217.151 217.156 217.170 217.197 218.55 218.145 218.146 218.150 218.153 218.155 218.158 218.232
            218.234 218.239 220.67 220.71 220.76 220.78 220.82 220.89 220.90 220.116 220.118 220.123 221.140 221.144 221.147 221.150 221.153 221.158
            221.160 221.164 221.167 222.102 222.108 222.109 222.110 222.111 222.112 222.118 222.238
        `.trim().split(/\s+/);

const PROXY_AGGRESSIVE_EXTRA_PREFIXES = `
            1.209 1.224 1.255 14.129 27.96 27.255 38.77 39.115 43.227 43.228 43.250 43.254 45.114 45.119 45.125 45.164 45.225 45.249
            49.8 49.50 49.128 49.143 49.236 49.238 49.254 58.229 59.150 61.14 61.42 61.97 61.100 61.106 61.109 61.111 61.247 61.250
            61.251 61.252 61.255 63.105 64.23 66.232 101.79 101.101 103.11 103.24 103.54 103.79 103.87 103.103 103.122 103.124 103.131 103.132
            103.138 103.140 103.146 103.151 103.193 103.194 103.212 103.215 103.218 103.230 103.237 103.238 103.240 103.243 103.249 106.10 106.249 110.4
            110.44 110.93 110.165 110.172 110.234 111.91 111.92 113.30 114.110 114.111 114.141 115.85 115.88 115.89 115.92 115.144 115.187 116.121
            116.122 116.125 117.52 118.67 118.91 118.129 119.30 121.0 121.50 121.78 121.126 121.170 122.49 122.99 124.198 124.217 125.6 125.7
            125.209 133.186 139.150 150.107 157.119 160.202 162.251 175.45 175.106 175.125 175.126 175.158 180.131 180.150 180.189 180.210 182.162 182.173
            182.252 182.255 183.78 202.31 202.68 202.86 202.126 202.131 202.133 202.158 202.179 203.84 203.104 203.109 203.216 203.231 203.235 203.236
            203.238 203.246 203.248 210.4 210.16 210.89 210.92 210.93 210.108 210.109 210.112 210.116 210.121 210.122 210.124 210.205 210.206 210.216
            210.219 211.32 211.37 211.41 211.47 211.50 211.56 211.60 211.63 211.104 211.110 211.115 211.116 211.118 211.168 211.169 211.170 211.171
            211.172 211.175 211.180 211.188 211.189 211.233 211.234 211.235 211.236 211.238 211.239 211.241 211.249 211.254 211.255 218.36 220.230 222.239
            223.26 223.130 223.165 223.255
        `.trim().split(/\s+/);

const KR_IP_RANGES = { "1": [[11, 11], [16, 19], [96, 111], [176, 177], [201, 201], [208, 223], [224, 255]], "14": [[0, 0], [4, 7], [32, 63], [64, 95], [128, 128], [129, 129], [138, 138], [192, 192], [206, 206]], "27": [[0, 0], [1, 1], [35, 35], [96, 96], [100, 100], [101, 101], [102, 102], [111, 111], [112, 112], [113, 113], [115, 115], [116, 116], [117, 117], [118, 118], [119, 119], [120, 120], [122, 122], [124, 124], [125, 125], [126, 126], [160, 175], [176, 183], [232, 239], [255, 255]], "36": [[38, 39]], "39": [[4, 7], [16, 31], [112, 127]], "42": [[8, 15], [16, 31], [32, 47], [82, 82]], "43": [[224, 224], [227, 227], [228, 228], [230, 230], [230, 230], [230, 230], [241, 241], [242, 242], [243, 243], [246, 246], [247, 247], [247, 247], [250, 250], [251, 251], [254, 254], [255, 255]], "45": [[64, 64], [64, 64], [64, 64], [112, 112], [112, 112], [113, 113], [115, 115], [117, 117], [119, 119], [120, 120], [121, 121], [125, 125], [248, 248], [249, 249], [249, 249], [250, 250], [250, 250]], "49": [[1, 1], [8, 11], [16, 31], [50, 50], [50, 50], [50, 50], [56, 63], [128, 128], [142, 142], [143, 143], [160, 175], [236, 236], [238, 238], [239, 239], [246, 246], [247, 247], [254, 254]], "58": [[29, 29], [65, 65], [72, 79], [84, 84], [87, 87], [102, 103], [120, 127], [138, 138], [140, 143], [145, 145], [146, 146], [147, 147], [148, 151], [180, 180], [181, 181], [184, 184], [224, 239]], "59": [[0, 31], [86, 86], [150, 150], [151, 151], [152, 152], [186, 187]], "60": [[196, 197], [253, 253]], "61": [[4, 4], [5, 5], [14, 14], [32, 39], [40, 43], [47, 47], [72, 77], [78, 79], [80, 83], [84, 85], [96, 111], [245, 245], [245, 245], [247, 247], [247, 247], [248, 255]], "101": [[1, 1], [1, 1], [53, 53], [55, 55], [79, 79], [101, 101], [202, 202], [235, 235], [250, 250]], "103": [[2, 2], [2, 2], [2, 2], [3, 3], [4, 4], [4, 4], [4, 4], [5, 5], [5, 5], [6, 6], [6, 6], [6, 6], [6, 6], [7, 7], [7, 7], [7, 7], [8, 8], [8, 8], [9, 9], [9, 9], [10, 10], [10, 10], [11, 11], [11, 11], [11, 11], [11, 11], [11, 11], [12, 12], [13, 13], [13, 13], [19, 19], [20, 20], [21, 21], [21, 21], [22, 22], [23, 23], [24, 24], [25, 25], [27, 27], [27, 27], [28, 28], [30, 30], [30, 30], [30, 30], [31, 31], [38, 38], [39, 39], [42, 42], [42, 42], [43, 43], [43, 43], [49, 49], [50, 50], [51, 51], [51, 51], [51, 51], [52, 52], [53, 53], [55, 55], [55, 55], [57, 57], [59, 59], [60, 60], [62, 62], [66, 66], [67, 67], [68, 68], [68, 68], [71, 71], [74, 74], [77, 77], [79, 79], [85, 85], [87, 87], [90, 90], [90, 90], [104, 104], [105, 105], [106, 106], [108, 108], [109, 109], [114, 114], [114, 114], [117, 117], [122, 122], [122, 122], [124, 124], [125, 125], [126, 126], [126, 126], [127, 127], [129, 129], [132, 132], [138, 138], [139, 139], [139, 139], [139, 139], [140, 140], [141, 141], [141, 141], [143, 143], [143, 143], [144, 144], [145, 145], [146, 146], [150, 150], [150, 150], [150, 150], [150, 150], [153, 153], [157, 157], [157, 157], [159, 159], [161, 161], [162, 162], [162, 162], [164, 164], [166, 166], [171, 171], [175, 175], [178, 178], [182, 182], [182, 182], [186, 186], [187, 187], [187, 187], [188, 188], [194, 194], [194, 194], [206, 206], [212, 212], [212, 212], [214, 214], [214, 214], [215, 215], [216, 216], [218, 218], [219, 219], [226, 226], [226, 226], [229, 229], [230, 230], [231, 231], [234, 234], [235, 235], [237, 237], [238, 238], [239, 239], [239, 239], [240, 240], [240, 240], [243, 243], [244, 244], [244, 244], [246, 246], [246, 246], [246, 246], [247, 247], [247, 247], [248, 248], [249, 249], [251, 251], [253, 253], [254, 254]], "106": [[10, 10], [96, 103], [240, 255]], "110": [[4, 4], [5, 5], [8, 15], [34, 34], [35, 35], [35, 35], [44, 44], [44, 44], [45, 45], [46, 47], [68, 71], [76, 76], [76, 76], [92, 92], [92, 92], [93, 93], [93, 93], [165, 165], [165, 165], [172, 172], [232, 232]], "111": [[65, 65], [67, 67], [91, 91], [92, 92], [118, 118], [171, 171], [218, 219], [221, 221]], "112": [[72, 72], [72, 72], [76, 77], [106, 107], [108, 108], [109, 109], [121, 121], [121, 121], [133, 133], [136, 136], [137, 137], [140, 140], [140, 140], [140, 140], [144, 159], [160, 191], [196, 196], [212, 212], [213, 213], [214, 214], [216, 223]], "113": [[10, 10], [21, 21], [29, 29], [30, 30], [52, 52], [52, 52], [59, 59], [60, 60], [61, 61], [61, 61], [130, 130], [130, 130], [131, 131], [192, 192], [197, 197], [198, 198], [199, 199], [216, 217]], "114": [[29, 29], [30, 30], [30, 30], [30, 30], [31, 31], [31, 31], [52, 53], [70, 71], [108, 108], [110, 110], [110, 110], [111, 111], [111, 111], [129, 129], [129, 129], [141, 141], [141, 141], [141, 141], [199, 199], [199, 199], [200, 207]], "115": [[0, 23], [31, 31], [40, 41], [68, 68], [69, 69], [71, 71], [84, 84], [85, 85], [86, 86], [88, 95], [126, 126], [136, 143], [144, 144], [145, 145], [160, 160], [161, 161], [165, 165], [178, 178], [178, 178], [187, 187], [187, 187]], "116": [[32, 47], [67, 67], [68, 68], [68, 68], [84, 84], [89, 89], [90, 90], [93, 93], [120, 127], [193, 193], [199, 199], [200, 201], [212, 212], [255, 255]], "117": [[16, 17], [20, 20], [20, 20], [52, 52], [53, 53], [53, 53], [55, 55], [58, 58], [110, 111], [123, 123]], "118": [[32, 63], [67, 67], [91, 91], [91, 91], [103, 103], [107, 107], [127, 127], [128, 131], [139, 139], [176, 176], [216, 223], [234, 235]], "119": [[17, 17], [17, 17], [18, 18], [30, 30], [31, 31], [42, 42], [56, 56], [59, 59], [63, 63], [64, 71], [75, 75], [77, 77], [82, 82], [148, 148], [149, 149], [161, 161], [192, 223], [235, 235], [235, 235]], "120": [[29, 29], [50, 50], [73, 73], [136, 136], [142, 142], [143, 143]], "121": [[0, 0], [1, 1], [50, 50], [50, 50], [50, 50], [53, 53], [54, 54], [55, 55], [64, 67], [78, 78], [88, 88], [100, 100], [101, 101], [101, 101], [124, 125], [126, 126], [127, 127], [128, 159], [160, 191], [200, 200], [252, 253], [254, 254], [254, 254]], "122": [[0, 0], [0, 0], [32, 47], [49, 49], [99, 99], [100, 100], [101, 101], [128, 128], [128, 128], [129, 129], [129, 129], [152, 152], [153, 153], [199, 199], [202, 202], [202, 202], [203, 203], [252, 252], [252, 252], [254, 254]], "123": [[0, 0], [32, 47], [98, 98], [99, 99], [100, 100], [108, 108], [108, 108], [109, 109], [111, 111], [140, 143], [199, 199], [200, 200], [212, 215], [228, 229], [248, 248], [250, 251], [253, 253], [254, 254], [254, 254]], "124": [[0, 1], [2, 2], [3, 3], [5, 5], [28, 28], [46, 46], [48, 63], [66, 66], [66, 66], [80, 80], [111, 111], [136, 139], [146, 146], [153, 153], [194, 194], [195, 195], [195, 195], [197, 197], [198, 198], [199, 199], [199, 199], [216, 216], [217, 217], [243, 243], [254, 254]], "125": [[7, 7], [31, 31], [57, 57], [60, 60], [61, 61], [62, 62], [128, 159], [176, 191], [208, 208], [208, 208], [209, 209], [209, 209], [240, 247], [248, 251], [252, 252]], "128": [[134, 134]], "129": [[254, 254]], "134": [[75, 75]], "137": [[68, 68]], "139": [[5, 5], [150, 150]], "141": [[223, 223]], "143": [[248, 248]], "144": [[48, 48], [48, 48], [48, 48]], "147": [[6, 6], [43, 43], [46, 46], [47, 47]], "150": [[107, 107], [107, 107], [129, 129], [150, 150], [183, 183], [197, 197], [242, 242], [242, 242]], "152": [[99, 99], [149, 149]], "154": [[10, 10]], "155": [[230, 230]], "156": [[147, 147]], "157": [[119, 119], [197, 197]], "158": [[44, 44]], "160": [[202, 202]], "161": [[122, 122]], "163": [[53, 53], [152, 152], [180, 180], [213, 213], [222, 222], [229, 229], [239, 239], [255, 255]], "164": [[124, 124], [125, 125]], "165": [[132, 132], [133, 133], [141, 141], [186, 186], [194, 194], [213, 213], [229, 229], [243, 243], [244, 244], [246, 246]], "166": [[79, 79], [103, 103], [104, 104], [125, 125]], "168": [[78, 78], [115, 115], [126, 126], [131, 131], [154, 154], [188, 188], [219, 219], [248, 249]], "169": [[140, 140], [208, 223]], "175": [[28, 28], [41, 41], [45, 45], [45, 45], [106, 106], [107, 107], [111, 111], [112, 127], [158, 158], [176, 176], [192, 255]], "180": [[64, 71], [80, 83], [92, 92], [92, 92], [94, 94], [131, 131], [132, 135], [148, 148], [150, 150], [182, 182], [189, 189], [189, 189], [210, 210], [210, 210], [211, 211], [222, 222], [224, 231], [233, 233], [236, 239]], "182": [[31, 31], [50, 50], [161, 161], [162, 162], [163, 163], [172, 172], [173, 173], [173, 173], [192, 199], [208, 223], [224, 231], [237, 237], [237, 237], [252, 252], [252, 252], [255, 255]], "183": [[78, 78], [78, 78], [86, 86], [90, 90], [91, 91], [96, 127]], "192": [[5, 5], [100, 100], [104, 104], [132, 132], [132, 132], [195, 195], [203, 203], [245, 245], [249, 249]], "202": [[3, 3], [6, 6], [8, 8], [14, 14], [14, 14], [14, 14], [20, 20], [20, 20], [20, 20], [20, 20], [21, 21], [22, 22], [30, 31], [43, 43], [59, 59], [68, 68], [73, 73], [86, 86], [89, 89], [89, 89], [90, 90], [126, 126], [128, 128], [131, 131], [133, 133], [136, 136], [148, 148], [150, 150], [158, 158], [163, 163], [165, 165], [167, 167], [171, 171], [174, 174], [179, 179], [179, 179]], "203": [[17, 17], [81, 81], [81, 81], [82, 82], [82, 82], [83, 83], [84, 84], [90, 90], [100, 100], [109, 109], [123, 123], [128, 128], [128, 128], [129, 129], [130, 130], [130, 130], [132, 132], [133, 133], [142, 142], [142, 142], [149, 149], [152, 152], [153, 153], [160, 160], [166, 166], [169, 169], [170, 170], [171, 171], [173, 173], [175, 175], [175, 175], [190, 190], [190, 190], [191, 191], [207, 207], [210, 210], [212, 212], [212, 212], [215, 215], [216, 216], [217, 217], [223, 223], [223, 223], [224, 224], [225, 225], [226, 227], [228, 229], [230, 231], [232, 233], [234, 235], [236, 239], [240, 243], [244, 247], [248, 251], [252, 255]], "210": [[0, 0], [2, 2], [4, 4], [4, 4], [16, 16], [57, 57], [87, 87], [89, 89], [90, 91], [92, 95], [96, 96], [97, 97], [98, 98], [99, 99], [100, 103], [104, 107], [108, 111], [112, 115], [116, 119], [120, 123], [124, 127], [178, 179], [180, 181], [182, 183], [192, 192], [204, 207], [210, 210], [211, 211], [211, 211], [216, 219], [220, 223]], "211": [[32, 39], [40, 51], [52, 63], [104, 111], [112, 119], [168, 175], [176, 191], [192, 199], [200, 205], [206, 211], [212, 215], [216, 225], [226, 231], [232, 255]], "218": [[36, 39], [48, 49], [50, 55], [101, 101], [144, 159], [209, 209], [232, 233], [234, 239]], "219": [[240, 241], [248, 255]], "220": [[64, 71], [72, 91], [92, 95], [103, 103], [116, 127], [149, 149], [230, 230]], "221": [[132, 132], [133, 133], [133, 133], [138, 143], [144, 168]], "222": [[96, 122], [231, 231], [232, 239], [251, 251]], "223": [[26, 26], [28, 28], [32, 63], [130, 130], [131, 131], [165, 165], [168, 175], [194, 195], [222, 222], [253, 253], [255, 255]] };

    const DCUF_SHARED_IP = Object.freeze({ TELECOM, PROXY_MODE, PROXY_STRICT_PREFIXES, PROXY_AGGRESSIVE_EXTRA_PREFIXES, KR_IP_RANGES });


const toInteger = (value, fallback) => {
    const parsed = Number.parseInt(String(value), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const toFloat = (value, fallback) => {
    const parsed = Number.parseFloat(String(value));
    return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value, fallback = false) => {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return fallback;
};

const STORAGE_SCHEMA_VERSION = '3.0.0';

function normalizeProxyBlockModeValue(rawValue) {
    if (rawValue === true || rawValue === 'true') return PROXY_MODE.STRICT;
    if (rawValue === false || rawValue === 'false' || rawValue == null) return PROXY_MODE.OFF;

    const numeric = toInteger(rawValue, PROXY_MODE.OFF);
    if (numeric === PROXY_MODE.AGGRESSIVE) return PROXY_MODE.AGGRESSIVE;
    if (numeric === PROXY_MODE.STRICT) return PROXY_MODE.STRICT;
    return PROXY_MODE.OFF;
}

function normalizeIpPrefix(value) {
    if (typeof value !== 'string') return null;
    const parts = value.trim().split('.');
    if (parts.length !== 2) return null;

    const normalizedParts = parts.map((part) => {
        if (!/^\d{1,3}$/.test(part)) return null;
        const numeric = Number(part);
        return numeric >= 0 && numeric <= 255 ? String(numeric) : null;
    });

    return normalizedParts.includes(null) ? null : normalizedParts.join('.');
}

function stripLegacyMobileIpMarker(rawIpValue) {
    if (typeof rawIpValue !== 'string' || !rawIpValue.trim()) return '';

    const marker = ETC_CONSTANTS.MOBILE_IP_MARKER;
    const markerToken = `||${marker}`;
    const prefixedMarkerToken = `${marker}||`;

    if (rawIpValue.startsWith(prefixedMarkerToken)) return '';

    const markerIndex = rawIpValue.indexOf(markerToken);
    if (markerIndex >= 0) return rawIpValue.slice(0, markerIndex);

    return rawIpValue;
}

function parseIpPrefixList(value, marker = ETC_CONSTANTS.MOBILE_IP_MARKER) {
    if (typeof value !== 'string' || !value) return [];

    let source = value;
    const markerIndex = source.indexOf(marker);
    if (markerIndex !== -1) {
        source = source.slice(0, markerIndex);
        source = source.replace(/\|\|$/, '');
    }

    const seen = new Set();
    return source.split('||').reduce((prefixes, token) => {
        const normalized = normalizeIpPrefix(token);
        if (!normalized || seen.has(normalized)) return prefixes;
        seen.add(normalized);
        prefixes.push(normalized);
        return prefixes;
    }, []);
}

function extractIpPrefix(ip) {
    if (typeof ip !== 'string' || !ip) return null;
    const match = ip.trim().match(/^(\d{1,3}\.\d{1,3})(?=\.|$)/);
    return match ? normalizeIpPrefix(match[1]) : null;
}

function normalizeBlockConfigIp(rawIpValue, marker = ETC_CONSTANTS.MOBILE_IP_MARKER) {
    return parseIpPrefixList(stripLegacyMobileIpMarker(String(rawIpValue || '')).replace(new RegExp(marker, 'g'), ''), marker).join('||');
}

function isSuspiciousLegacyManagedIpList(rawIpValue, marker = ETC_CONSTANTS.MOBILE_IP_MARKER, threshold = 100) {
    if (typeof rawIpValue !== 'string' || !rawIpValue) return false;
    if (rawIpValue.includes(marker)) return false;
    return parseIpPrefixList(rawIpValue, marker).length >= threshold;
}

function formatShortcutKeys(keySet) {
    if (!keySet || keySet.size === 0) return '';

    const priority = ['Control', 'Meta', 'Alt', 'Shift', 'CapsLock', 'Tab'];
    const keys = Array.from(keySet);

    const modifiers = keys
        .filter((key) => priority.includes(key))
        .sort((a, b) => priority.indexOf(a) - priority.indexOf(b));

    const others = keys
        .filter((key) => !priority.includes(key) && key.length === 1)
        .sort();

    return [...modifiers, ...others].map((key) => key === 'Control' ? 'Ctrl' : key).join('+');
}

function parseShortcutString(shortcutString) {
    const result = { ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, key: '' };
    if (!shortcutString) return result;

    const parts = String(shortcutString).split('+');
    const nonModifiers = [];

    parts.forEach((part) => {
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
        result.key = String(nonModifiers[0] || '').toUpperCase();
    }

    return result;
}

function createDefaultFilterSettings() {
    return {
        masterDisabled: false,
        excludeRecommended: true,
        threshold: 200,
        ratioEnabled: true,
        ratioMin: 99,
        ratioMax: 1,
        blockGuest: false,
        proxyBlockMode: PROXY_MODE.OFF,
        telecomBlockEnabled: false,
        personalBlockEnabled: true,
        blockConfig: { uid: '', nick: '', ip: '' },
        personalBlockList: { uids: [], nicknames: [], ips: [] },
    };
}

function normalizeStoredFilterSettings(rawValues = {}) {
    const defaults = createDefaultFilterSettings();
    const blockConfig = rawValues[STORAGE_KEYS.BLOCK_CONFIG] || defaults.blockConfig;
    const normalizedBlockConfig = {
        ...defaults.blockConfig,
        ...(blockConfig || {}),
        ip: normalizeBlockConfigIp((blockConfig && blockConfig.ip) || defaults.blockConfig.ip),
    };

    return {
        masterDisabled: toBoolean(rawValues[STORAGE_KEYS.MASTER_DISABLED], defaults.masterDisabled),
        excludeRecommended: toBoolean(rawValues[STORAGE_KEYS.EXCLUDE_RECOMMENDED], defaults.excludeRecommended),
        threshold: toInteger(rawValues[STORAGE_KEYS.THRESHOLD], defaults.threshold),
        ratioEnabled: toBoolean(rawValues[STORAGE_KEYS.RATIO_ENABLED], defaults.ratioEnabled),
        ratioMin: toFloat(rawValues[STORAGE_KEYS.RATIO_MIN], defaults.ratioMin),
        ratioMax: toFloat(rawValues[STORAGE_KEYS.RATIO_MAX], defaults.ratioMax),
        blockGuest: toBoolean(rawValues[STORAGE_KEYS.BLOCK_GUEST], defaults.blockGuest),
        proxyBlockMode: normalizeProxyBlockModeValue(rawValues[STORAGE_KEYS.BLOCK_PROXY]),
        telecomBlockEnabled: toBoolean(rawValues[STORAGE_KEYS.BLOCK_TELECOM], defaults.telecomBlockEnabled),
        personalBlockEnabled: toBoolean(rawValues[STORAGE_KEYS.PERSONAL_BLOCK_ENABLED], defaults.personalBlockEnabled),
        blockConfig: normalizedBlockConfig,
        personalBlockList: rawValues[STORAGE_KEYS.PERSONAL_BLOCK_LIST]
            && typeof rawValues[STORAGE_KEYS.PERSONAL_BLOCK_LIST] === 'object'
            && !Array.isArray(rawValues[STORAGE_KEYS.PERSONAL_BLOCK_LIST])
            ? rawValues[STORAGE_KEYS.PERSONAL_BLOCK_LIST]
            : defaults.personalBlockList,
    };
}

    const DCUF_SHARED_STORAGE = Object.freeze({
        STORAGE_SCHEMA_VERSION,
        normalizeProxyBlockModeValue,
        normalizeIpPrefix,
        stripLegacyMobileIpMarker,
        parseIpPrefixList,
        extractIpPrefix,
        normalizeBlockConfigIp,
        isSuspiciousLegacyManagedIpList,
        formatShortcutKeys,
        parseShortcutString,
        createDefaultFilterSettings,
        normalizeStoredFilterSettings,
    });


const modeToTier = (mode) => {
    if (mode === PROXY_MODE.AGGRESSIVE) return 'aggressive';
    if (mode === PROXY_MODE.STRICT) return 'strict';
    return 'off';
};

const collectionHasValue = (collection, value) => {
    if (!value || !collection) return false;
    if (typeof collection.has === 'function') return collection.has(value);
    if (Array.isArray(collection)) return collection.includes(value);
    return false;
};

const uidCollectionHasValue = (collection, value) => {
    if (!value || !collection) return false;
    if (typeof collection.has === 'function') return collection.has(value);
    if (!Array.isArray(collection)) return false;
    return collection.some((item) => (typeof item === 'string' ? item : item?.id) === value);
};

const hasPersonalUidBlock = (subject, personalBlockList) =>
    Boolean(subject?.uid && uidCollectionHasValue(personalBlockList?.uidSet ?? personalBlockList?.uids, subject.uid));

const hasPersonalNicknameBlock = (subject, personalBlockList) =>
    Boolean(subject?.nickname && collectionHasValue(personalBlockList?.nicknameSet ?? personalBlockList?.nicknames, subject.nickname));

const hasPersonalIpBlock = (subject, personalBlockList) =>
    Boolean(subject?.ip && collectionHasValue(personalBlockList?.ipSet ?? personalBlockList?.ips, subject.ip));

const FILTER_CORE_PHASE = '3.2.2';

function createEmptyDecision(proxyBlockMode = PROXY_MODE.OFF) {
    return {
        isBlocked: false,
        reasons: [],
        proxyTier: modeToTier(proxyBlockMode),
        matchedBy: [],
    };
}

function evaluateUserStatsBlock(userData, settings) {
    const decision = { sumBlocked: false, ratioBlocked: false };
    if (!userData || !settings || settings.masterDisabled) return decision;

    const sum = Number(userData.sum) || 0;
    const post = Number(userData.post) || 0;
    const comment = Number(userData.comment) || 0;

    decision.sumBlocked = settings.threshold > 0 && sum > 0 && sum <= settings.threshold;

    if (!settings.ratioEnabled) return decision;

    const useMin = !Number.isNaN(settings.ratioMin) && Number(settings.ratioMin) > 0;
    const useMax = !Number.isNaN(settings.ratioMax) && Number(settings.ratioMax) > 0;
    if (!useMin && !useMax) return decision;

    const replyToPostRatio = post > 0 ? (comment / post) : (comment > 0 ? Infinity : 0);
    const postToReplyRatio = comment > 0 ? (post / comment) : (post > 0 ? Infinity : 0);

    if (useMin && replyToPostRatio >= settings.ratioMin) {
        decision.ratioBlocked = true;
    } else if (useMax && postToReplyRatio >= settings.ratioMax) {
        decision.ratioBlocked = true;
    }

    return decision;
}

function isPersonalBlockHit(subject, personalBlockList) {
    return hasPersonalUidBlock(subject, personalBlockList)
        || hasPersonalNicknameBlock(subject, personalBlockList)
        || hasPersonalIpBlock(subject, personalBlockList);
}

function evaluateSyncBlockDecision({ subject, settings, matches = {}, blockedUidEntry = null }) {
    const proxyBlockMode = settings?.proxyBlockMode ?? PROXY_MODE.OFF;
    const decision = {
        ...createEmptyDecision(proxyBlockMode),
        path: 'sync-final',
        hasCustomIpPrefixBlock: Boolean(matches.hasCustomIpPrefixBlock),
        proxyPrefixMatch: Boolean(matches.proxyMatchInfo?.matched),
        proxyMatchTier: matches.proxyMatchInfo?.tier || null,
        telecomPrefixMatch: Boolean(matches.telecomPrefixMatch),
        blockedGuestMatch: Boolean(matches.blockedGuestMatch),
        personallyBlocked: Boolean(matches.personalBlockHit),
    };

    if (decision.personallyBlocked) {
        decision.isBlocked = true;
        decision.path = 'personal-block';
        decision.reasons = ['personalBlock'];
        decision.matchedBy = ['personalBlock'];
        return decision;
    }

    if (subject?.hasBlockDisableClass) {
        decision.isBlocked = true;
        decision.path = 'dibs-block';
        decision.reasons = ['block-disable-class'];
        decision.matchedBy = ['block-disable-class'];
        return decision;
    }

    if (subject?.isNotice) {
        decision.path = 'notice-skip';
        decision.reasons = ['notice'];
        decision.matchedBy = ['notice'];
        return decision;
    }

    if (subject?.shouldSkipFiltering) {
        decision.path = 'recommended-skip';
        decision.reasons = ['excludeRecommended-skip'];
        decision.matchedBy = ['excludeRecommended-skip'];
        return decision;
    }

    if (settings?.masterDisabled) {
        decision.path = 'master-disabled';
        decision.reasons = ['masterDisabled'];
        decision.matchedBy = ['masterDisabled'];
        return decision;
    }

    if (subject?.isGuest && settings?.blockGuestEnabled) {
        decision.isBlocked = true;
        decision.reasons.push('guest-toggle');
    }
    if (!decision.isBlocked && decision.hasCustomIpPrefixBlock) {
        decision.isBlocked = true;
        decision.reasons.push('custom-ip-prefix');
    }
    if (!decision.isBlocked && decision.proxyPrefixMatch) {
        decision.isBlocked = true;
        decision.reasons.push(`proxy-prefix-match:${decision.proxyMatchTier}`);
    }
    if (!decision.isBlocked && decision.telecomPrefixMatch) {
        decision.isBlocked = true;
        decision.reasons.push('telecom-prefix-match');
    }
    if (!decision.isBlocked && decision.blockedGuestMatch) {
        decision.isBlocked = true;
        decision.reasons.push('blockedGuests-list-hit');
    }

    if (!decision.isBlocked && blockedUidEntry) {
        const uidCacheDecision = evaluateUserStatsBlock(blockedUidEntry, settings);
        if (uidCacheDecision.sumBlocked || uidCacheDecision.ratioBlocked) {
            decision.isBlocked = true;
            decision.reasons.push(`uid-cache:${uidCacheDecision.sumBlocked ? 'sum' : ''}${uidCacheDecision.ratioBlocked ? 'ratio' : ''}`);
        }
    }

    decision.matchedBy = decision.reasons.slice();
    return decision;
}

    const DCUF_SHARED_FILTER_CORE = Object.freeze({
        FILTER_CORE_PHASE,
        createEmptyDecision,
        evaluateUserStatsBlock,
        isPersonalBlockHit,
        evaluateSyncBlockDecision,
    });
    // =================================================================
    // ======================== UI Module Style ========================
    // =================================================================
    const RuntimeCoordinator = {
        SCRIPT_UI_SELECTOR: [
            '#dc-backup-popup',
            '#dc-block-management-panel',
            '#dcinside-filter-setting',
            '#dc-selection-popup',
            '#custom-instant-tooltip',
            '#dcuf-boot-overlay',
            '.dcuf-comment-placeholder',
            '.dcuf-header-drawer',
            '.dcuf-header-drawer__toggle',
            '.dcuf-header-drawer__body',
            '.custom-mobile-list',
            '.custom-post-item',
            '.custom-bottom-controls'
        ].join(', '),
        COMMENT_VISIBILITY_SELECTOR: [
            '#focus_cmt',
            'div[id^="comment_wrap_"]',
            '.comment_box',
            '.view_comment.image_comment',
            'li[id^="comment_li_"]',
            'li[id^="reply_li_"]',
            'li[id^="img_comment_li_"]',
            'li[id^="mg_comment_li_"]'
        ].join(', '),
        IDENTITY_ATTRIBUTE_NAMES: new Set(['id', 'data-uid', 'data-nick', 'data-ip', 'data-no', 'p-no']),
        _mutationObserver: null,
        _mutationObserverTarget: null,
        _bodyMountObserver: null,
        _mutationObserverReady: false,
        _mutationSubscribers: new Map(),
        _immediateMutationSubscribers: new Map(),
        _pendingMutationRecords: [],
        _pendingMutationRafId: 0,
        _pendingMutationTimerId: 0,
        _mutationGeneration: 0,
        _taskQueues: Object.create(null),
        _diagnosticsEnabled: false,
        _diagnosticCounters: Object.create(null),
        _diagnosticGauges: Object.create(null),
        _diagnosticEvents: [],

        installDiagnosticsApi() {
            if (window.__dcufDiagnostics) return window.__dcufDiagnostics;

            const api = {
                enable: () => {
                    this._diagnosticsEnabled = true;
                    return this.snapshotDiagnostics();
                },
                disable: () => {
                    this._diagnosticsEnabled = false;
                    return this.snapshotDiagnostics();
                },
                reset: () => {
                    this._diagnosticCounters = Object.create(null);
                    this._diagnosticGauges = Object.create(null);
                    this._diagnosticEvents = [];
                    return this.snapshotDiagnostics();
                },
                increment: (label, amount = 1) => {
                    this.incrementDiagnostic(label, amount);
                },
                setGauge: (label, value) => {
                    this.setDiagnosticGauge(label, value);
                },
                note: (label, detail = null) => {
                    this.noteDiagnostic(label, detail);
                },
                snapshot: () => this.snapshotDiagnostics()
            };

            window.__dcufDiagnostics = api;
            return api;
        },

        snapshotDiagnostics() {
            return {
                enabled: this._diagnosticsEnabled,
                counters: { ...this._diagnosticCounters },
                gauges: { ...this._diagnosticGauges },
                events: this._diagnosticEvents.slice(-50),
                pageContext: { ...this.getPageContext() },
                subscribers: Array.from(this._mutationSubscribers.keys()),
                immediateSubscribers: Array.from(this._immediateMutationSubscribers.keys())
            };
        },

        getPageContext() {
            const sharedContext = window.__dcufPageContext;
            if (sharedContext && typeof sharedContext === 'object') return sharedContext;
            const type = ((window.location.pathname || '').match(/\/board\/(lists|view|write)(?:\/|$)/) || [])[1] || 'other';
            return {
                type,
                isList: type === 'lists',
                isView: type === 'view',
                isWrite: type === 'write',
                isOther: type === 'other',
                isTargetPage: type !== 'other',
                hasListSurface: type === 'lists' || type === 'view',
                hasComments: type === 'view'
            };
        },

        pageSupports(contexts) {
            const requested = Array.isArray(contexts) ? contexts : [contexts];
            if (requested.length === 0 || requested.every((context) => !context)) return true;
            const pageContext = this.getPageContext();
            return requested.some((context) => {
                if (context === 'list-surface') return pageContext.hasListSurface;
                if (context === 'comments') return pageContext.hasComments;
                if (context === 'target') return pageContext.isTargetPage;
                return pageContext.type === context;
            });
        },

        getMutationSurfaceSelector() {
            const pageContext = this.getPageContext();
            const shared = [
                '#user_data_lyr',
                '.user_data',
                '#user_memo_config',
                '#um_picker_lay'
            ];
            const list = [
                '.list_wrap',
                '.gall_listwrap',
                '.gall_list',
                '.issue_contentbox',
                '#gall_top_recom'
            ];
            if (pageContext.isList) return [...shared, ...list].join(', ');
            if (pageContext.isView) {
                return [
                    ...shared,
                    ...list,
                    '.view_content_wrap',
                    '.gallview_contents',
                    '.writing_view_box',
                    '.gall_comment',
                    '#focus_cmt',
                    'div[id^="comment_wrap_"]',
                    '.view_comment'
                ].join(', ');
            }
            if (pageContext.isWrite) return 'form#write, #write_wrap, .gall_write, .write_box';
            return shared.join(', ');
        },

        isMutationSurfaceElement(element) {
            if (!(element instanceof Element) || this.isScriptOwnedElement(element)) return false;
            if (element === document.body) return true;
            const selector = this.getMutationSurfaceSelector();
            return Boolean(selector && (element.matches(selector) || element.closest(selector)));
        },

        prefilterMutationRecords(records) {
            if (!Array.isArray(records) || records.length === 0) return [];
            return records.filter((record) => {
                if (!record) return false;
                if (record.type === 'childList') return !this.isScriptOwnedElement(record.target);
                if (record.type === 'attributes') {
                    if (this.isScriptOwnedElement(record.target)) return false;
                    if (this.IDENTITY_ATTRIBUTE_NAMES.has(record.attributeName)) return true;
                    return this.isMutationSurfaceElement(record.target);
                }
                if (record.type === 'characterData') {
                    return this.isMutationSurfaceElement(record.target?.parentElement || null);
                }
                return false;
            });
        },

        isCommentVisibilityElement(element) {
            if (!(element instanceof Element) || this.isScriptOwnedElement(element)) return false;
            return element.matches(this.COMMENT_VISIBILITY_SELECTOR)
                || Boolean(element.closest(this.COMMENT_VISIBILITY_SELECTOR))
                || Boolean(element.querySelector?.(this.COMMENT_VISIBILITY_SELECTOR));
        },

        filterImmediateMutationRecords(records) {
            if (!Array.isArray(records) || records.length === 0 || !this.getPageContext().hasComments) return [];
            return records.filter((record) => {
                if (record?.type === 'attributes') {
                    return ['data-uid', 'data-nick', 'data-ip'].includes(record.attributeName)
                        && this.isCommentVisibilityElement(record.target);
                }
                if (record?.type !== 'childList' || record.addedNodes.length === 0) return false;
                if (this.isCommentVisibilityElement(record.target)) return true;
                return Array.from(record.addedNodes).some((node) => this.isCommentVisibilityElement(node));
            });
        },

        incrementDiagnostic(label, amount = 1) {
            if (!label) return;
            const nextValue = (this._diagnosticCounters[label] || 0) + amount;
            this._diagnosticCounters[label] = nextValue;
            return nextValue;
        },

        setDiagnosticGauge(label, value) {
            if (!label) return;
            this._diagnosticGauges[label] = value;
        },

        noteDiagnostic(label, detail = null) {
            if (!label) return;
            if (!Array.isArray(this._diagnosticEvents)) this._diagnosticEvents = [];
            this._diagnosticEvents.push({
                label,
                detail,
                ts: Date.now()
            });
            if (this._diagnosticEvents.length > 120) {
                this._diagnosticEvents.splice(0, this._diagnosticEvents.length - 120);
            }
            if (this._diagnosticsEnabled) {
                console.debug('[DCUF diagnostics]', label, detail);
            }
        },

        isScriptOwnedElement(element) {
            return element instanceof Element && !!element.closest(this.SCRIPT_UI_SELECTOR);
        },

        toRelevantElement(node) {
            if (node instanceof Element) {
                if (this.isScriptOwnedElement(node)) return null;
                return node;
            }
            if (node instanceof CharacterData) {
                const parentElement = node.parentElement || null;
                if (parentElement && !this.isScriptOwnedElement(parentElement)) return parentElement;
            }
            return null;
        },

        addUniqueElement(targetSet, targetList, node) {
            const element = this.toRelevantElement(node);
            if (!(element instanceof Element) || targetSet.has(element)) return;
            targetSet.add(element);
            targetList.push(element);
        },

        normalizeSelectors(selectors) {
            if (Array.isArray(selectors)) return selectors.filter(Boolean).join(', ');
            return typeof selectors === 'string' ? selectors : '';
        },

        collectMatchesFromRoots(roots, selectors, options = {}) {
            const selectorText = this.normalizeSelectors(selectors);
            if (!selectorText) return [];

            const includeRoots = options.includeRoots !== false;
            const includeDescendants = options.includeDescendants !== false;
            const matches = [];
            const seen = new Set();
            const pushMatch = (element) => {
                if (!(element instanceof Element)) return;
                if (this.isScriptOwnedElement(element)) return;
                if (!element.matches(selectorText) || seen.has(element)) return;
                seen.add(element);
                matches.push(element);
            };

            roots.forEach((root) => {
                if (!(root instanceof Element)) return;
                if (includeRoots) pushMatch(root);
                if (includeDescendants && typeof root.querySelectorAll === 'function') {
                    root.querySelectorAll(selectorText).forEach(pushMatch);
                }
            });

            return matches;
        },

        buildMutationPayload(records) {
            const addedElements = [];
            const removedElements = [];
            const attributeTargets = [];
            const characterDataTargets = [];
            const childListTargets = [];
            const roots = [];
            const addedSet = new Set();
            const removedSet = new Set();
            const attributeSet = new Set();
            const charDataSet = new Set();
            const childListSet = new Set();
            const rootSet = new Set();
            const collectMatchesCache = new Map();
            const addRoot = (node) => this.addUniqueElement(rootSet, roots, node);

            records.forEach((record) => {
                if (!record) return;

                if (record.type === 'childList') {
                    this.addUniqueElement(childListSet, childListTargets, record.target);
                    addRoot(record.target);
                    record.addedNodes.forEach((node) => {
                        this.addUniqueElement(addedSet, addedElements, node);
                        addRoot(node);
                    });
                    record.removedNodes.forEach((node) => {
                        this.addUniqueElement(removedSet, removedElements, node);
                    });
                    return;
                }

                if (record.type === 'attributes') {
                    this.addUniqueElement(attributeSet, attributeTargets, record.target);
                    addRoot(record.target);
                    return;
                }

                if (record.type === 'characterData') {
                    this.addUniqueElement(charDataSet, characterDataTargets, record.target);
                    addRoot(record.target);
                }
            });

            const collectMatches = (selectors, options = {}) => {
                const selectorText = this.normalizeSelectors(selectors);
                if (!selectorText) return [];
                const includeRoots = options.includeRoots !== false;
                const includeDescendants = options.includeDescendants !== false;
                const cacheKey = `${includeRoots ? 1 : 0}:${includeDescendants ? 1 : 0}:${selectorText}`;
                if (collectMatchesCache.has(cacheKey)) {
                    this.incrementDiagnostic('mutation.collectMatches.cacheHits');
                    return collectMatchesCache.get(cacheKey).slice();
                }
                const matches = this.collectMatchesFromRoots(roots, selectorText, { includeRoots, includeDescendants });
                collectMatchesCache.set(cacheKey, matches);
                this.incrementDiagnostic('mutation.collectMatches.cacheMisses');
                return matches.slice();
            };

            return {
                records,
                addedElements,
                removedElements,
                attributeTargets,
                characterDataTargets,
                childListTargets,
                roots,
                collectMatches
            };
        },

        clearPendingMutationDispatch() {
            if (this._pendingMutationRafId) {
                cancelAnimationFrame(this._pendingMutationRafId);
                this._pendingMutationRafId = 0;
            }
            if (this._pendingMutationTimerId) {
                clearTimeout(this._pendingMutationTimerId);
                this._pendingMutationTimerId = 0;
            }
        },

        dispatchQueuedMutations() {
            this.clearPendingMutationDispatch();
            if (!Array.isArray(this._pendingMutationRecords) || this._pendingMutationRecords.length === 0) return;

            const records = this._pendingMutationRecords.splice(0);
            const payload = this.buildMutationPayload(records);
            this._mutationGeneration += 1;
            payload.generation = this._mutationGeneration;
            this.incrementDiagnostic('mutation.dispatches');
            this.setDiagnosticGauge('mutation.roots', payload.roots.length);
            this.setDiagnosticGauge('mutation.subscribers', this._mutationSubscribers.size);
            this.setDiagnosticGauge('mutation.generation', this._mutationGeneration);

            const measureDispatch = this._diagnosticsEnabled && typeof performance?.now === 'function';
            const dispatchStartedAt = measureDispatch ? performance.now() : 0;

            this._mutationSubscribers.forEach((listener, key) => {
                try {
                    listener(payload);
                } catch (error) {
                    console.error('[DCUF runtime] mutation subscriber failed:', key, error);
                }
            });

            if (measureDispatch) {
                this.setDiagnosticGauge('mutation.lastDispatchDurationMs', Math.round((performance.now() - dispatchStartedAt) * 1000) / 1000);
            }
        },

        dispatchImmediateMutations(records) {
            if (!Array.isArray(records) || records.length === 0) return;
            if (!(this._immediateMutationSubscribers instanceof Map) || this._immediateMutationSubscribers.size === 0) return;

            const payload = this.buildMutationPayload(records);
            this.incrementDiagnostic('mutation.immediateDispatches');
            this.incrementDiagnostic('mutation.immediateRecords', records.length);
            this.setDiagnosticGauge('mutation.immediateSubscribers', this._immediateMutationSubscribers.size);

            const measureDispatch = this._diagnosticsEnabled && typeof performance?.now === 'function';
            const dispatchStartedAt = measureDispatch ? performance.now() : 0;
            this._immediateMutationSubscribers.forEach((listener, key) => {
                try {
                    listener(payload);
                } catch (error) {
                    console.error('[DCUF runtime] immediate mutation subscriber failed:', key, error);
                }
            });
            if (measureDispatch) {
                this.setDiagnosticGauge(
                    'mutation.lastImmediateDispatchDurationMs',
                    Math.round((performance.now() - dispatchStartedAt) * 1000) / 1000
                );
            }
        },

        queueMutationRecords(records) {
            if (!Array.isArray(records) || records.length === 0) return;
            const filteredRecords = this.prefilterMutationRecords(records);
            const skippedRecords = records.length - filteredRecords.length;
            this.incrementDiagnostic('mutation.rawRecords', records.length);
            if (skippedRecords > 0) this.incrementDiagnostic('mutation.skippedRecords', skippedRecords);
            if (filteredRecords.length === 0) return;
            // MutationObserver callbacks run before the next paint. Critical visibility
            // subscribers must see the fresh records here; the ordinary bus remains
            // animation-frame batched for heavier UI and async work.
            this.dispatchImmediateMutations(this.filterImmediateMutationRecords(filteredRecords));
            this._pendingMutationRecords.push(...filteredRecords);
            this.incrementDiagnostic('mutation.bursts');
            this.incrementDiagnostic('mutation.records', filteredRecords.length);

            if (this._pendingMutationRafId || this._pendingMutationTimerId) return;

            this._pendingMutationRafId = requestAnimationFrame(() => {
                this._pendingMutationRafId = 0;
                this.dispatchQueuedMutations();
            });
            this._pendingMutationTimerId = window.setTimeout(() => {
                this._pendingMutationTimerId = 0;
                this.dispatchQueuedMutations();
            }, 50);
        },

        flushPendingMutations(reason = 'manual-flush') {
            this.installDiagnosticsApi();
            if (this._mutationObserver) {
                const records = this._mutationObserver.takeRecords();
                if (records.length > 0) this.queueMutationRecords(records);
            }
            if (this._pendingMutationRecords.length > 0) this.dispatchQueuedMutations();
            this.noteDiagnostic('mutation.bus.flushed', { reason, generation: this._mutationGeneration });
            return this._mutationGeneration;
        },

        ensureMutationBus() {
            this.installDiagnosticsApi();
            const observerTarget = document.body;
            if (this._mutationObserverReady
                && this._mutationObserverTarget === observerTarget
                && observerTarget?.isConnected) {
                return true;
            }
            if (!observerTarget) {
                if (!this._awaitingBodyForMutationBus) {
                    this._awaitingBodyForMutationBus = true;
                    document.addEventListener('DOMContentLoaded', () => {
                        this._awaitingBodyForMutationBus = false;
                        this.ensureMutationBus();
                    }, { once: true });
                }
                return false;
            }

            if (this._mutationObserver) {
                const pending = this._mutationObserver.takeRecords();
                if (pending.length > 0) this.queueMutationRecords(pending);
                this._mutationObserver.disconnect();
            }

            this._mutationObserver = new MutationObserver((records) => {
                this.queueMutationRecords(records);
            });
            this._mutationObserver.observe(observerTarget, {
                childList: true,
                subtree: true,
                attributes: true,
                characterData: true,
                attributeFilter: ['class', 'style', 'src', 'id', 'data-uid', 'data-nick', 'data-ip', 'data-no', 'p-no']
            });
            this._mutationObserverTarget = observerTarget;
            this._mutationObserverReady = true;
            if (!this._bodyMountObserver && document.documentElement) {
                this._bodyMountObserver = new MutationObserver((records) => {
                    if (this._mutationObserverTarget !== document.body) {
                        this.ensureMutationBus();
                        this.queueMutationRecords(records);
                    }
                });
                this._bodyMountObserver.observe(document.documentElement, { childList: true });
            }
            this.noteDiagnostic('mutation.bus.ready', { target: 'document.body', rebound: true });
            if (this._pendingMutationRecords.length > 0) this.dispatchQueuedMutations();
            return true;
        },

        subscribeMutations(key, listener, options = {}) {
            if (typeof listener !== 'function') return () => {};
            if (!this.pageSupports(options.contexts || [])) {
                this.noteDiagnostic('mutation.subscriber.skipped', { key, contexts: options.contexts || [], pageType: this.getPageContext().type });
                return () => {};
            }
            this.ensureMutationBus();
            this._mutationSubscribers.set(key, listener);
            this.setDiagnosticGauge('mutation.subscribers', this._mutationSubscribers.size);
            return () => {
                this._mutationSubscribers.delete(key);
                this.setDiagnosticGauge('mutation.subscribers', this._mutationSubscribers.size);
            };
        },

        subscribeImmediateMutations(key, listener, options = {}) {
            if (typeof listener !== 'function') return () => {};
            if (!this.pageSupports(options.contexts || [])) {
                this.noteDiagnostic('mutation.immediateSubscriber.skipped', { key, contexts: options.contexts || [], pageType: this.getPageContext().type });
                return () => {};
            }
            this.ensureMutationBus();
            this._immediateMutationSubscribers.set(key, listener);
            this.setDiagnosticGauge('mutation.immediateSubscribers', this._immediateMutationSubscribers.size);
            return () => {
                this._immediateMutationSubscribers.delete(key);
                this.setDiagnosticGauge('mutation.immediateSubscribers', this._immediateMutationSubscribers.size);
            };
        },

        createPhaseScheduler(label, run, options = {}) {
            const delays = Array.isArray(options?.delays) ? options.delays.filter((delay) => Number.isFinite(delay) && delay >= 0) : [];
            let rafId = 0;
            let timerIds = new Set();
            let lastMeta = null;

            const clearTimers = () => {
                timerIds.forEach((timerId) => clearTimeout(timerId));
                timerIds.clear();
            };

            const invoke = (phase, delay = 0) => {
                this.incrementDiagnostic(`scheduler.${label}.${phase}`);
                run({
                    label,
                    phase,
                    delay,
                    meta: lastMeta
                });
            };

            return {
                schedule: (meta = null) => {
                    lastMeta = meta;
                    if (rafId) cancelAnimationFrame(rafId);
                    clearTimers();

                    rafId = requestAnimationFrame(() => {
                        rafId = 0;
                        invoke('raf', 0);
                        delays.forEach((delay) => {
                            const timerId = window.setTimeout(() => {
                                timerIds.delete(timerId);
                                invoke(`delay:${delay}`, delay);
                            }, delay);
                            timerIds.add(timerId);
                        });
                    });
                },
                cancel: () => {
                    if (rafId) {
                        cancelAnimationFrame(rafId);
                        rafId = 0;
                    }
                    clearTimers();
                },
                flush: (meta = null) => {
                    lastMeta = meta;
                    if (rafId) {
                        cancelAnimationFrame(rafId);
                        rafId = 0;
                    }
                    clearTimers();
                    invoke('flush', 0);
                }
            };
        },

        createTaskQueue(label, options = {}) {
            if (this._taskQueues[label]) return this._taskQueues[label];

            const concurrency = Math.max(1, Number(options?.concurrency) || 1);
            const pending = [];
            let activeCount = 0;

            const updateGauge = () => {
                this.setDiagnosticGauge(`queue.${label}.active`, activeCount);
                this.setDiagnosticGauge(`queue.${label}.pending`, pending.length);
            };

            const drain = () => {
                while (activeCount < concurrency && pending.length > 0) {
                    const nextTask = pending.shift();
                    if (!nextTask) break;
                    activeCount += 1;
                    this.incrementDiagnostic(`queue.${label}.started`);
                    updateGauge();

                    Promise.resolve()
                        .then(nextTask.run)
                        .then(nextTask.resolve, nextTask.reject)
                        .finally(() => {
                            activeCount -= 1;
                            this.incrementDiagnostic(`queue.${label}.finished`);
                            updateGauge();
                            drain();
                        });
                }
            };

            const queue = {
                enqueue: (run) => new Promise((resolve, reject) => {
                    pending.push({ run, resolve, reject });
                    this.incrementDiagnostic(`queue.${label}.enqueued`);
                    updateGauge();
                    drain();
                }),
                snapshot: () => ({
                    label,
                    concurrency,
                    activeCount,
                    pendingCount: pending.length
                })
            };

            this._taskQueues[label] = queue;
            updateGauge();
            return queue;
        }
    };

    RuntimeCoordinator.installDiagnosticsApi();
    window.__dcufRuntimeCoordinator = RuntimeCoordinator;
    const __dcufFilterPageContext = window.__dcufPageContext || {
        type: 'other',
        isList: false,
        isView: false,
        hasListSurface: false,
        hasComments: false
    };
    const __dcufAllFilterCss = `
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
        .custom-bottom-controls form[name="frmSearch"] .bottom_search_wrap,
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
        /* DCUF_VIEW_SURFACE_START */
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
        /* --- [v2.3.2 수정] 개인 차단 기능 UI --- */
        /* DCUF_SHARED_FILTER_UI_START */
        #dc-personal-block-controls {
            --dcuf-fab-width: 152px;
            --dcuf-fab-height: 76px;
            --dcuf-fab-padding-x: 28px;
            --dcuf-fab-font-size: 32px;
            position: fixed;
            z-index: 2147483640;
            width: max-content;
            height: var(--dcuf-fab-height);
            overflow: visible;
        }
        #dc-personal-block-fab {
            box-sizing: border-box;
            appearance: none;
            width: auto !important;
            min-width: var(--dcuf-fab-width) !important;
            height: var(--dcuf-fab-height) !important;
            padding: 0 var(--dcuf-fab-padding-x);
            background: linear-gradient(180deg, #fbfcfe 0%, #f1f4f8 100%) !important;
            color: #4d5e76;
            border-radius: 999px;
            border: 1px solid #c7d2df;
            box-shadow: 0 6px 16px rgba(36, 49, 72, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            font-size: var(--dcuf-fab-font-size) !important;
            font-weight: 800;
            letter-spacing: -0.03em;
            line-height: 1;
            white-space: nowrap;
            word-break: keep-all;
            cursor: pointer;
            user-select: none;
            touch-action: none;
            font-family: inherit;
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
        #dc-personal-block-fab:focus-visible {
            outline: 3px solid rgba(59, 113, 253, 0.36);
            outline-offset: 2px;
        }
        #dc-personal-block-drawer {
            position: absolute;
            z-index: 2147483641;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            gap: 4px;
            width: max-content;
            min-width: 164px;
            padding: 6px;
            background: #fff;
            border: 1px solid #c7d2df;
            border-radius: 12px;
            box-shadow: 0 12px 28px rgba(36, 49, 72, 0.2);
        }
        #dc-personal-block-drawer[hidden] {
            display: none !important;
        }
        #dc-personal-block-drawer button {
            box-sizing: border-box;
            appearance: none;
            width: 100%;
            min-height: 40px;
            padding: 8px 12px;
            background: transparent;
            color: #34445a;
            border: 0;
            border-radius: 8px;
            text-align: left;
            font-family: inherit;
            font-size: 14px;
            font-weight: 700;
            line-height: 1.2;
            white-space: nowrap;
            cursor: pointer;
        }
        #dc-personal-block-drawer button:hover,
        #dc-personal-block-drawer button:focus-visible {
            background: #edf2f8;
            color: #24364f;
            outline: none;
        }
        /* DCUF_FAB_SHELL_END */
        #dc-personal-block-size-overlay {
            position: fixed;
            inset: 0;
            z-index: 2147483644;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            background: rgba(18, 25, 35, 0.45);
        }
        #dc-personal-block-size-panel {
            box-sizing: border-box;
            width: min(360px, calc(100vw - 32px));
            padding: 20px;
            background: #fff;
            color: #34445a;
            border: 1px solid #c7d2df;
            border-radius: 14px;
            box-shadow: 0 18px 48px rgba(36, 49, 72, 0.28);
        }
        #dc-personal-block-size-panel h3 {
            margin: 0 0 8px;
            color: inherit;
            font-size: 19px;
        }
        #dc-personal-block-size-panel .dcuf-fab-size-description {
            margin: 0 0 16px;
            color: #66758a;
            font-size: 13px;
            line-height: 1.45;
        }
        #dc-personal-block-size-panel .dcuf-fab-size-value {
            display: block;
            margin-bottom: 8px;
            color: #33445b;
            text-align: center;
            font-size: 18px;
            font-weight: 800;
        }
        #dc-personal-block-size-panel input[type="range"] {
            width: 100%;
            min-height: 36px;
            margin: 0;
            cursor: pointer;
        }
        #dc-personal-block-size-panel .dcuf-fab-size-bounds {
            display: flex;
            justify-content: space-between;
            margin-top: -2px;
            color: #7b8798;
            font-size: 11px;
        }
        #dc-personal-block-size-panel .dcuf-fab-size-actions {
            display: flex;
            gap: 8px;
            margin-top: 18px;
        }
        #dc-personal-block-size-panel .dcuf-fab-size-actions button {
            flex: 1;
            min-height: 42px;
            padding: 8px;
            background: #edf2f8;
            color: #34445a;
            border: 0;
            border-radius: 9px;
            font-family: inherit;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
        }
        #dc-personal-block-size-panel .dcuf-fab-size-actions [data-dcuf-fab-size-action="save"] {
            background: #3b71fd;
            color: #fff;
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
        #dc-block-management-panel .switch-container { display: flex; align-items: center; margin-left: 15px; }
        #dcinside-filter-setting .switch,
        #dc-block-management-panel .switch { position: relative; display: inline-block; width: 40px; height: 22px; }
        #dcinside-filter-setting .switch input,
        #dc-block-management-panel .switch input { opacity: 0; width: 0; height: 0; }
        #dcinside-filter-setting .switch-slider,
        #dc-block-management-panel .switch-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 22px; }
        #dcinside-filter-setting .switch-slider:before,
        #dc-block-management-panel .switch-slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        #dcinside-filter-setting input:checked + .switch-slider,
        #dc-block-management-panel input:checked + .switch-slider { background-color: #3b71fd; }
        #dcinside-filter-setting input:checked + .switch-slider:before,
        #dc-block-management-panel input:checked + .switch-slider:before { transform: translateX(18px); }

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
            box-sizing: border-box !important;
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
            align-items: stretch !important;
            justify-content: space-between !important;
        }
        #dcinside-filter-setting .dcuf-settings-threshold > div:first-child {
            flex: 0 1 280px !important;
            min-width: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
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

        /* [v3.4.5-beta] Script-owned soft-depth control surfaces */
        #dc-personal-block-fab {
            background: linear-gradient(180deg, #fff 0%, #eef4ff 100%) !important;
            color: #29466f !important;
            border: 1px solid rgba(127,154,196,.46) !important;
            box-shadow: 0 14px 30px rgba(40,68,112,.2), 0 3px 8px rgba(40,68,112,.12), inset 0 1px 0 #fff !important;
        }
        #dc-personal-block-fab:hover {
            background: linear-gradient(180deg, #fff 0%, #e7f0ff 100%) !important;
            border-color: rgba(86,124,185,.56) !important;
            box-shadow: 0 17px 34px rgba(40,68,112,.24), inset 0 1px 0 #fff !important;
        }
        #dc-personal-block-fab:active {
            transform: translateY(2px) scale(.98) !important;
            box-shadow: 0 7px 16px rgba(40,68,112,.17), inset 0 1px 3px rgba(40,68,112,.12) !important;
        }
        #dc-personal-block-drawer {
            width: 260px !important;
            min-width: 260px !important;
            max-height: min(440px, calc(100dvh - 24px)) !important;
            gap: 6px !important;
            padding: 9px !important;
            overflow-y: auto !important;
            border: 1px solid rgba(151,171,202,.5) !important;
            border-radius: 18px !important;
            background: linear-gradient(145deg, rgba(255,255,255,.98), rgba(241,246,255,.98)) !important;
            box-shadow: 0 22px 48px rgba(35,55,91,.25), 0 6px 16px rgba(35,55,91,.12), inset 0 1px 0 #fff !important;
        }
        #dc-personal-block-drawer button {
            display: grid !important;
            grid-template-columns: 36px minmax(0,1fr) !important;
            align-items: center !important;
            gap: 10px !important;
            min-height: 58px !important;
            padding: 8px 10px !important;
            border: 1px solid transparent !important;
            border-radius: 13px !important;
            white-space: normal !important;
            transition: transform .14s ease, background .14s ease, border-color .14s ease, box-shadow .14s ease !important;
        }
        #dc-personal-block-drawer button:hover,
        #dc-personal-block-drawer button:focus-visible {
            background: linear-gradient(180deg,#fff,#eaf2ff) !important;
            border-color: #cfddf2 !important;
            box-shadow: 0 7px 16px rgba(52,83,132,.12), inset 0 1px 0 #fff !important;
        }
        #dc-personal-block-drawer button:active { transform: translateY(1px) !important; }
        #dc-personal-block-drawer .dcuf-menu-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 34px;
            height: 34px;
            border: 1px solid #cedbf0;
            border-radius: 11px;
            background: linear-gradient(145deg,#fff,#e6efff);
            color: #3b71fd;
            font-size: 19px;
            font-weight: 800;
            box-shadow: 0 5px 11px rgba(59,113,253,.13), inset 0 1px 0 #fff;
        }
        #dc-personal-block-drawer button > span:last-child { min-width: 0; }
        #dc-personal-block-drawer strong,
        #dc-personal-block-drawer small { display: block; }
        #dc-personal-block-drawer strong { color: #263b5a; font-size: 14px; line-height: 1.25; }
        #dc-personal-block-drawer small { margin-top: 3px; color: #71819a; font-size: 11px; font-weight: 500; line-height: 1.25; }

        #dc-manual-block-overlay {
            position: fixed;
            inset: 0;
            z-index: 2147483647;
            box-sizing: border-box;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            background: rgba(20,31,50,.48);
            backdrop-filter: blur(3px);
        }
        #dc-manual-block-panel {
            box-sizing: border-box;
            width: min(430px, calc(100vw - 32px));
            max-height: calc(100dvh - 32px);
            overflow: hidden auto;
            border: 1px solid rgba(151,171,202,.56);
            border-radius: 22px;
            background: linear-gradient(155deg,#fff,#f3f7ff);
            color: #20334f;
            box-shadow: 0 28px 70px rgba(18,34,60,.32), 0 8px 24px rgba(18,34,60,.14), inset 0 1px 0 #fff;
            animation: dcuf-popup-fade-in .18s ease-out;
        }
        #dc-manual-block-panel .dcuf-manual-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-height: 68px;
            padding: 14px 14px 13px 20px;
            border-bottom: 1px solid #dce5f3;
            background: linear-gradient(135deg,#eff5ff,#fff);
        }
        #dc-manual-block-panel .dcuf-manual-kicker,
        #dc-block-management-panel .panel-kicker {
            display: block;
            margin-bottom: 3px;
            color: #6684b4;
            font-size: 9px;
            font-weight: 900;
            letter-spacing: .14em;
        }
        #dc-manual-block-panel h3 { margin: 0; color: #1f3555; font-size: 20px; line-height: 1.15; }
        #dc-manual-block-panel .dcuf-manual-close,
        #dc-block-management-panel .panel-close-btn,
        #dc-backup-popup .popup-close-btn,
        #dcinside-filter-setting #dcinside-filter-close {
            box-sizing: border-box !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 44px !important;
            min-width: 44px !important;
            height: 44px !important;
            min-height: 44px !important;
            padding: 0 !important;
            border: 1px solid transparent !important;
            border-radius: 13px !important;
            background: transparent !important;
            color: #61728d !important;
            font-size: 23px !important;
            line-height: 1 !important;
        }
        #dc-manual-block-panel .dcuf-manual-close:hover,
        #dc-block-management-panel .panel-close-btn:hover,
        #dc-backup-popup .popup-close-btn:hover,
        #dcinside-filter-setting #dcinside-filter-close:hover {
            border-color: #d8e2f0 !important;
            background: #edf3fb !important;
            color: #29405f !important;
        }
        #dc-manual-block-panel .dcuf-manual-form { padding: 18px 20px 20px; }
        #dc-manual-block-panel .dcuf-manual-type-tabs {
            display: grid;
            grid-template-columns: repeat(3,1fr);
            gap: 4px;
            padding: 4px;
            border: 1px solid #d6e0ef;
            border-radius: 14px;
            background: #eaf0f8;
            box-shadow: inset 0 2px 5px rgba(48,72,111,.08);
        }
        #dc-manual-block-panel [data-manual-block-type] {
            min-height: 42px;
            padding: 8px 6px;
            border: 1px solid transparent;
            border-radius: 10px;
            background: transparent;
            color: #65758d;
            font: 700 13px/1.2 inherit;
            cursor: pointer;
        }
        #dc-manual-block-panel [data-manual-block-type][aria-pressed="true"] {
            border-color: #ccdaf0;
            background: linear-gradient(180deg,#fff,#edf4ff);
            color: #3265d2;
            box-shadow: 0 5px 12px rgba(46,81,139,.16), inset 0 1px 0 #fff;
        }
        #dc-manual-block-panel .dcuf-manual-field {
            display: grid;
            gap: 7px;
            margin-top: 17px;
            color: #314867;
            font-size: 13px;
            font-weight: 800;
        }
        #dc-manual-block-panel .dcuf-manual-field[hidden] { display: none !important; }
        #dc-manual-block-panel .dcuf-manual-field small { color: #8a98ac; font-weight: 500; }
        #dc-manual-block-panel .dcuf-manual-field input {
            box-sizing: border-box;
            width: 100%;
            min-height: 48px;
            padding: 11px 13px;
            border: 1px solid #cad7e9;
            border-radius: 12px;
            outline: 0;
            background: #fff;
            color: #1d2f49;
            font: 600 15px/1.3 inherit;
            box-shadow: inset 0 2px 5px rgba(37,60,96,.08), 0 1px 0 #fff;
        }
        #dc-manual-block-panel .dcuf-manual-field input:focus {
            border-color: #7199f5;
            box-shadow: 0 0 0 3px rgba(59,113,253,.15), inset 0 1px 3px rgba(37,60,96,.08);
        }
        #dc-manual-block-panel .dcuf-manual-hint {
            min-height: 34px;
            margin: 10px 2px 0;
            color: #6d7d94;
            font-size: 12px;
            line-height: 1.45;
        }
        #dc-manual-block-panel .dcuf-manual-status {
            min-height: 20px;
            margin: 4px 2px 0;
            color: #65758d;
            font-size: 12px;
            font-weight: 700;
            line-height: 1.4;
        }
        #dc-manual-block-panel .dcuf-manual-status[data-state="success"] { color: #16835f; }
        #dc-manual-block-panel .dcuf-manual-status[data-state="error"] { color: #d7485a; }
        #dc-manual-block-panel .dcuf-manual-status[data-state="info"] { color: #3b68c6; }
        #dc-manual-block-panel .dcuf-manual-actions {
            display: grid;
            grid-template-columns: .75fr 1.25fr;
            gap: 9px;
            margin-top: 10px;
        }
        #dc-manual-block-panel .dcuf-manual-actions button {
            min-height: 46px;
            border: 1px solid #ccd8e8;
            border-radius: 12px;
            background: linear-gradient(180deg,#fff,#edf2f8);
            color: #53657e;
            font: 800 14px/1 inherit;
            box-shadow: 0 5px 12px rgba(35,56,89,.1), inset 0 1px 0 #fff;
            cursor: pointer;
        }
        #dc-manual-block-panel .dcuf-manual-actions [data-manual-block-action="add"] {
            border-color: #3b71fd;
            background: linear-gradient(180deg,#5687ff,#376af0);
            color: #fff;
            box-shadow: 0 9px 18px rgba(59,113,253,.28), inset 0 1px 0 rgba(255,255,255,.34);
        }
        #dc-manual-block-panel .dcuf-manual-actions button:active { transform: translateY(1px); }
        #dc-manual-block-panel .dcuf-manual-actions button:disabled { opacity: .65; cursor: wait; }


        @keyframes dcuf-selection-prompt-in {
            from { opacity: 0; transform: translate(-50%,-8px) scale(.98); }
            to { opacity: 1; transform: translate(-50%,0) scale(1); }
        }
        #dc-selection-popup.dcuf-selection-prompt {
            top: calc(env(safe-area-inset-top,0px) + 14px) !important;
            left: 50% !important;
            bottom: auto !important;
            box-sizing: border-box !important;
            display: grid !important;
            grid-template-columns: 42px minmax(0,1fr) auto !important;
            align-items: center !important;
            gap: 11px !important;
            width: min(560px,calc(100vw - 24px)) !important;
            min-width: 0 !important;
            max-width: calc(100vw - 24px) !important;
            padding: 11px 12px !important;
            border: 1px solid rgba(142,166,203,.58) !important;
            border-radius: 18px !important;
            transform: translateX(-50%) !important;
            text-align: left !important;
            background: linear-gradient(145deg,rgba(255,255,255,.98),rgba(237,244,255,.98)) !important;
            box-shadow: 0 18px 40px rgba(31,51,83,.25), inset 0 1px 0 #fff !important;
            animation: dcuf-selection-prompt-in .18s ease-out !important;
        }
        #dc-selection-popup .dcuf-selection-prompt-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            border-radius: 13px;
            background: linear-gradient(145deg,#fff,#dfeaff);
            color: #3b71fd;
            font-size: 21px;
            font-weight: 900;
            box-shadow: 0 6px 14px rgba(59,113,253,.18), inset 0 1px 0 #fff;
        }
        #dc-selection-popup .dcuf-selection-prompt-copy h4 {
            margin: 0 0 3px !important;
            color: #233a5b !important;
            font-size: 15px !important;
            font-weight: 850 !important;
        }
        #dc-selection-popup .dcuf-selection-prompt-copy p {
            margin: 0;
            color: #71819a;
            font-size: 12px;
            line-height: 1.35;
        }
        #dc-selection-popup.dcuf-selection-prompt .popup-buttons button {
            width: auto !important;
            min-width: 86px;
            min-height: 42px;
            padding: 9px 12px !important;
            border: 1px solid #cfdaea !important;
            border-radius: 11px !important;
            background: linear-gradient(180deg,#fff,#e9eff7) !important;
            color: #50627d !important;
            font-size: 13px !important;
            font-weight: 800 !important;
            box-shadow: 0 5px 12px rgba(41,62,96,.1), inset 0 1px 0 #fff;
        }
        body.selection-mode-active .gall_writer,
        body.selection-mode-active .ub-writer {
            border-radius: 6px !important;
            outline: 2px solid rgba(59,113,253,.44) !important;
            outline-offset: 2px !important;
            background: rgba(59,113,253,.08) !important;
        }
        #dc-selection-popup:not(.dcuf-selection-prompt) {
            border: 1px solid #d1dceb !important;
            border-radius: 20px !important;
            background: linear-gradient(150deg,#fff,#f3f7fd) !important;
            box-shadow: 0 24px 58px rgba(24,42,71,.3), inset 0 1px 0 #fff !important;
        }
        #dc-selection-popup .block-option {
            border-radius: 13px !important;
            background: linear-gradient(145deg,#fff,#eef4fc) !important;
            box-shadow: 0 6px 15px rgba(38,60,96,.09), inset 0 1px 0 #fff !important;
        }
        #dc-selection-popup .block-option button,
        #dc-selection-popup .popup-buttons button { min-height: 42px; }

        #dcinside-filter-setting,
        #dc-block-management-panel,
        #dc-backup-popup {
            border: 1px solid rgba(149,169,201,.55) !important;
            border-radius: 22px !important;
            background: linear-gradient(155deg,#fff,#f4f7fc) !important;
            box-shadow: 0 28px 68px rgba(23,39,67,.3), 0 7px 20px rgba(23,39,67,.13), inset 0 1px 0 #fff !important;
        }
        #dcinside-filter-setting .dcuf-settings-header,
        #dc-block-management-panel .panel-header,
        #dc-backup-popup .popup-header {
            background: linear-gradient(135deg,rgba(238,244,255,.98),rgba(255,255,255,.98)) !important;
            border-bottom: 1px solid #dbe4f1 !important;
        }
        #dcinside-filter-setting .dcuf-settings-section,
        #dcinside-filter-setting .dcuf-settings-threshold > div:last-child,
        #dcinside-filter-setting .dcuf-settings-guest-controls {
            border: 1px solid #dce5f1 !important;
            border-radius: 16px !important;
            background: linear-gradient(145deg,#fff,#f3f7fd) !important;
            box-shadow: 0 8px 20px rgba(36,58,94,.09), inset 0 1px 0 #fff !important;
        }
        #dcinside-filter-setting input[type="number"] {
            min-height: 44px !important;
            border-radius: 11px !important;
            box-shadow: inset 0 2px 5px rgba(37,60,96,.09), 0 1px 0 #fff !important;
        }
        #dcinside-filter-setting #dcinside-threshold-save {
            min-height: 46px !important;
            border-radius: 12px !important;
            background: linear-gradient(180deg,#5687ff,#376af0) !important;
            box-shadow: 0 9px 18px rgba(59,113,253,.28), inset 0 1px 0 rgba(255,255,255,.32) !important;
        }

        #dc-block-management-panel .panel-header {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            min-height: 68px !important;
            padding: 10px 12px 10px 18px !important;
            cursor: move;
        }
        #dc-block-management-panel .panel-title-group { min-width: 0; }
        #dc-block-management-panel .panel-title-group h3 { color: #213756 !important; font-size: 18px !important; }
        #dc-block-management-panel .panel-header-actions { display: flex; align-items: center; gap: 7px; }
        #dc-block-management-panel .switch-container { margin-left: 0 !important; }
        #dc-block-management-panel .panel-add-btn {
            min-height: 40px;
            padding: 8px 11px;
            border: 1px solid #cbdaf0;
            border-radius: 11px;
            background: linear-gradient(180deg,#fff,#e8f1ff);
            color: #3564c4;
            font-size: 12px;
            font-weight: 850;
            box-shadow: 0 6px 13px rgba(47,78,128,.12), inset 0 1px 0 #fff;
            cursor: pointer;
        }
        #dc-block-management-panel .panel-tabs {
            gap: 5px !important;
            padding: 7px !important;
            border-bottom: 1px solid #dce4f0 !important;
            background: #edf2f8 !important;
            box-shadow: inset 0 2px 5px rgba(38,59,91,.06);
        }
        #dc-block-management-panel .panel-tab {
            appearance: none;
            border: 1px solid transparent !important;
            border-radius: 11px !important;
            background: transparent !important;
            color: #65758d !important;
            font-family: inherit;
            font-weight: 750 !important;
        }
        #dc-block-management-panel .panel-tab.active {
            border-color: #ccdaf0 !important;
            background: linear-gradient(180deg,#fff,#e8f1ff) !important;
            color: #315fc2 !important;
            box-shadow: 0 6px 14px rgba(45,74,121,.15), inset 0 1px 0 #fff !important;
        }
        #dc-block-management-panel .panel-tab.active::after { display: none !important; }
        #dc-block-management-panel .panel-tab-count {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 20px;
            height: 20px;
            margin-left: 4px;
            padding: 0 5px;
            border-radius: 999px;
            background: rgba(74,111,182,.12);
            font-size: 10px;
            font-weight: 900;
        }
        #dc-block-management-panel .panel-body { background: #f5f8fc !important; }
        #dc-block-management-panel .panel-list-controls {
            display: grid !important;
            grid-template-columns: minmax(150px,1fr) auto !important;
            align-items: center;
            gap: 8px;
            padding: 10px !important;
            text-align: left !important;
            background: rgba(255,255,255,.72);
        }
        #dc-block-management-panel .panel-search {
            box-sizing: border-box;
            display: flex;
            align-items: center;
            gap: 7px;
            min-height: 42px;
            padding: 0 11px;
            border: 1px solid #d0dbea;
            border-radius: 11px;
            background: #fff;
            color: #71819a;
            box-shadow: inset 0 2px 5px rgba(35,56,88,.07);
        }
        #dc-block-management-panel .panel-search-input {
            min-width: 0;
            width: 100%;
            border: 0;
            outline: 0;
            background: transparent;
            color: #263a58;
            font: 600 13px/1.2 inherit;
        }
        #dc-block-management-panel .panel-list-summary {
            grid-column: 1 / -1;
            color: #7a899e;
            font-size: 11px;
        }


        #dc-block-management-panel .select-all-btn,
        #dc-block-management-panel .select-all-global-btn,
        #dc-block-management-panel .panel-backup-btn {
            min-height: 40px !important;
            border-radius: 10px !important;
            background: linear-gradient(180deg,#fff,#edf2f8) !important;
            box-shadow: 0 5px 12px rgba(35,56,89,.09), inset 0 1px 0 #fff !important;
        }
        #dc-block-management-panel .blocked-list {
            display: grid;
            gap: 8px;
            padding: 10px !important;
        }
        #dc-block-management-panel .blocked-item {
            min-height: 52px;
            padding: 8px 9px 8px 13px !important;
            border: 1px solid #dce5f1 !important;
            border-radius: 13px !important;
            background: linear-gradient(145deg,#fff,#f0f5fb) !important;
            box-shadow: 0 6px 15px rgba(34,55,88,.08), inset 0 1px 0 #fff;
        }
        #dc-block-management-panel .blocked-item.item-to-delete {
            border-color: #f1bdc5 !important;
            background: linear-gradient(145deg,#fff8f9,#fbecef) !important;
            text-decoration: none !important;
            opacity: .72 !important;
        }
        #dc-block-management-panel .blocked-item.item-to-delete .item-name { text-decoration: line-through; }
        #dc-block-management-panel .delete-item-btn {
            min-width: 52px !important;
            min-height: 36px !important;
            padding: 7px 9px !important;
            border: 1px solid #ffd3da !important;
            border-radius: 10px !important;
            background: linear-gradient(180deg,#fff8f9,#ffe9ed) !important;
            color: #df5366 !important;
            font-size: 11px !important;
            font-weight: 850 !important;
            text-decoration: none !important;
        }
        #dc-block-management-panel .blocked-list-empty {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 150px;
            color: #8290a4;
            font-size: 13px;
            text-align: center;
        }
        #dc-block-management-panel .panel-footer {
            min-height: 64px;
            background: linear-gradient(180deg,rgba(250,252,255,.98),rgba(239,244,251,.98)) !important;
        }
        #dc-block-management-panel .panel-save-btn {
            min-height: 44px;
            border-radius: 11px !important;
            background: linear-gradient(180deg,#5687ff,#376af0) !important;
            box-shadow: 0 8px 17px rgba(59,113,253,.28), inset 0 1px 0 rgba(255,255,255,.32) !important;
        }
        #dc-backup-popup .popup-content { gap: 12px !important; padding: 4px 2px 2px !important; }
        #dc-backup-popup .export-section,
        #dc-backup-popup .import-section {
            padding: 14px !important;
            border: 1px solid #dce5f1;
            border-radius: 16px;
            background: linear-gradient(145deg,#fff,#f2f6fc);
            box-shadow: 0 8px 20px rgba(36,58,94,.09), inset 0 1px 0 #fff;
        }
        #dc-backup-popup .popup-content > hr { display: none; }
        #dc-backup-popup .export-btn,
        #dc-backup-popup .export-btn-download,
        #dc-backup-popup .import-btn,
        #dc-backup-popup .import-file-input,
        #dc-backup-popup textarea {
            min-height: 44px;
            border-radius: 11px !important;
        }
        #dc-backup-popup .export-btn,
        #dc-backup-popup .import-btn {
            background: linear-gradient(180deg,#5687ff,#376af0) !important;
            box-shadow: 0 8px 17px rgba(59,113,253,.25), inset 0 1px 0 rgba(255,255,255,.3) !important;
        }
        #dc-manual-block-panel.dcuf-pop-leave {
            animation: dcuf-popup-out .13s ease-in forwards !important;
            pointer-events: none !important;
        }
        #dc-manual-block-overlay.dcuf-overlay-leave {
            animation: dcuf-overlay-out .13s ease-in forwards !important;
            pointer-events: none !important;
        }
        @media (max-width: 640px) {
            #dc-manual-block-overlay {
                align-items: flex-end;
                padding: 10px 8px max(8px,env(safe-area-inset-bottom,0px));
            }
            #dc-manual-block-panel {
                width: 100%;
                max-height: calc(100dvh - 10px);
                border-radius: 22px 22px 16px 16px;
            }
            #dc-block-management-panel .panel-header { padding-left: 14px !important; }
            #dc-block-management-panel .panel-kicker { display: none; }
            #dc-block-management-panel .panel-add-btn {
                width: 44px;
                min-width: 44px;
                padding: 0;
                overflow: hidden;
                color: transparent;
                white-space: nowrap;
            }
            #dc-block-management-panel .panel-add-btn::first-letter {
                color: #3564c4;
                font-size: 18px;
            }
            #dc-block-management-panel .panel-list-controls { grid-template-columns: 1fr !important; }
            #dc-block-management-panel .panel-list-summary { grid-column: 1; }
            #dc-selection-popup.dcuf-selection-prompt { grid-template-columns: 38px minmax(0,1fr) !important; }
            #dc-selection-popup.dcuf-selection-prompt .popup-buttons { grid-column: 1 / -1; }
            #dc-selection-popup.dcuf-selection-prompt .popup-buttons button { width: 100% !important; }
        }
        @media (prefers-reduced-motion: reduce) {
            #dc-manual-block-panel,
            #dc-manual-block-overlay,
            #dc-selection-popup.dcuf-selection-prompt {
                animation: none !important;
                transition: none !important;
            }
        }


        #dc-personal-block-drawer { background-color: #f1f6ff !important; }
        #dc-manual-block-panel { background-color: #f3f7ff; }
        #dc-selection-popup.dcuf-selection-prompt { background-color: #edf4ff !important; }
        #dc-selection-popup:not(.dcuf-selection-prompt) { background-color: #f3f7fd !important; }
        #dcinside-filter-setting,
        #dc-block-management-panel,
        #dc-backup-popup { background-color: #f4f7fc !important; }

        /* DCUF_SHARED_FILTER_UI_END */

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

        /* [v3.0 alpha] 본문 글자색은 실제 다크 팔레트로 직접 덮어씁니다. */
        body.dc-filter-dark-mode .gallview_contents,
        body.dc-filter-dark-mode .gallview_contents p,
        body.dc-filter-dark-mode .gallview_contents span,
        body.dc-filter-dark-mode .gallview_contents div,
        body.dc-filter-dark-mode .gallview_contents *,
        body.dc-filter-dark-mode .writing_view_box,
        body.dc-filter-dark-mode .writing_view_box *,
        body.dc-filter-dark-mode .write_div,
        body.dc-filter-dark-mode .write_div *,
        body.dc-filter-dark-mode .write_div [data-scaled-by-filter],
        body.dc-filter-dark-mode .write_div [data-scaled-by-filter] * {
            color: var(--dcuf-view-fg) !important;
            -webkit-text-fill-color: var(--dcuf-view-fg) !important;
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

        /* DCUF_SHARED_FILTER_UI_DARK_START */
        body.dc-filter-dark-mode #dc-personal-block-fab {
            background: linear-gradient(180deg, #3b414b 0%, #303640 100%) !important;
            color: #e9eef6 !important;
            border-color: #596474 !important;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3) !important;
        }
        body.dc-filter-dark-mode #dc-personal-block-fab:hover {
            background: linear-gradient(180deg, #464d58 0%, #373e49 100%) !important;
            border-color: #6c788a !important;
        }
        body.dc-filter-dark-mode #dc-personal-block-drawer {
            background: #2d323a !important;
            border-color: #596474 !important;
            box-shadow: 0 14px 32px rgba(0, 0, 0, 0.5) !important;
        }
        body.dc-filter-dark-mode #dc-personal-block-drawer button {
            background: transparent !important;
            color: #e2e8f0 !important;
        }
        body.dc-filter-dark-mode #dc-personal-block-drawer button:hover,
        body.dc-filter-dark-mode #dc-personal-block-drawer button:focus-visible {
            background: #414956 !important;
            color: #fff !important;
        }
        /* DCUF_FAB_SHELL_DARK_END */
        body.dc-filter-dark-mode #dc-personal-block-size-overlay {
            background: rgba(0, 0, 0, 0.62) !important;
        }
        body.dc-filter-dark-mode #dc-personal-block-size-panel {
            background: #2d323a !important;
            color: #e2e8f0 !important;
            border-color: #596474 !important;
            box-shadow: 0 20px 52px rgba(0, 0, 0, 0.58) !important;
        }
        body.dc-filter-dark-mode #dc-personal-block-size-panel .dcuf-fab-size-description,
        body.dc-filter-dark-mode #dc-personal-block-size-panel .dcuf-fab-size-bounds {
            color: #aeb9c8 !important;
        }
        body.dc-filter-dark-mode #dc-personal-block-size-panel .dcuf-fab-size-value {
            color: #f2f6fb !important;
        }
        body.dc-filter-dark-mode #dc-personal-block-size-panel .dcuf-fab-size-actions button {
            background: #4a5360 !important;
            color: #fff !important;
        }
        body.dc-filter-dark-mode #dc-personal-block-size-panel .dcuf-fab-size-actions [data-dcuf-fab-size-action="save"] {
            background: #4d7cff !important;
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
        body.dc-filter-dark-mode #dc-block-management-panel .panel-tabs {
            background: #252525 !important;
            border-color: #4a4a4a !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting .dcuf-settings-header,
        body.dc-filter-dark-mode #dcinside-filter-setting .dcuf-settings-footer,
        body.dc-filter-dark-mode #dc-backup-popup .popup-header,
        body.dc-filter-dark-mode #dc-block-management-panel .panel-header,
        body.dc-filter-dark-mode #dc-block-management-panel .panel-footer {
            background: transparent !important;
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
        body.dc-filter-dark-mode #dc-block-management-panel .item-name {
            color: #e0e0e0 !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting input[type="number"],
        body.dc-filter-dark-mode #dc-backup-popup textarea {
            background-color: #1e1e1e !important;
            color: #f0f0f0 !important;
            border: 1px solid #666 !important;
        }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-tab.active {
            background: #007bff !important; /* 활성 탭은 색상 유지 */
        }

        /* 버튼 배경 문제 해결 (필요한 버튼만 개별 적용) */
        body.dc-filter-dark-mode #dcinside-filter-setting button,
        body.dc-filter-dark-mode #dc-selection-popup button,
        body.dc-filter-dark-mode #dc-block-management-panel button,
        body.dc-filter-dark-mode #dc-backup-popup button,
        body.dc-filter-dark-mode #dcinside-shortcut-modal button {
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
        body.dc-filter-dark-mode #dcinside-filter-setting .dcuf-settings-threshold > div:last-child,
        body.dc-filter-dark-mode #dcinside-filter-setting .dcuf-settings-guest-controls {
            background: #2b313d !important;
            border-color: #47556f !important;
            box-shadow: none !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting .dcuf-settings-guest-controls [style*="border-bottom"] {
            border-bottom-color: #47556f !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting .dcuf-settings-guest-controls [style*="color:#666"],
        body.dc-filter-dark-mode #dcinside-filter-setting .dcuf-settings-guest-controls .dcuf-proxy-mode-desc {
            color: #9fb0c8 !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting #dcinside-proxy-ip-block-mode-group {
            background: #252b36 !important;
            border-color: #47556f !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting #dcinside-proxy-ip-block-mode-group button[data-proxy-mode] {
            background: transparent !important;
            color: #dbe6f5 !important;
            border-color: transparent !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting #dcinside-proxy-ip-block-mode-group button[data-proxy-mode][aria-pressed="true"] {
            background: #3b71fd !important;
            color: #fff !important;
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

        body.dc-filter-dark-mode #dc-personal-block-fab {
            background: linear-gradient(180deg,#34435b,#253247) !important;
            color: #eef4ff !important;
            border-color: #52657f !important;
            box-shadow: 0 16px 34px rgba(0,0,0,.46), inset 0 1px 0 rgba(255,255,255,.1) !important;
        }
        body.dc-filter-dark-mode #dc-personal-block-drawer {
            border-color: #465a76 !important;
            background: linear-gradient(145deg,#27354a,#1d293b) !important;
            box-shadow: 0 24px 52px rgba(0,0,0,.58), inset 0 1px 0 rgba(255,255,255,.08) !important;
        }
        body.dc-filter-dark-mode #dc-personal-block-drawer .dcuf-menu-icon {
            border-color: #49617f;
            background: linear-gradient(145deg,#344760,#25354c);
            color: #8db2ff;
            box-shadow: 0 6px 14px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.08);
        }
        body.dc-filter-dark-mode #dc-personal-block-drawer strong { color: #edf3ff; }
        body.dc-filter-dark-mode #dc-personal-block-drawer small { color: #9fb0c8; }
        body.dc-filter-dark-mode #dc-personal-block-drawer button:hover,
        body.dc-filter-dark-mode #dc-personal-block-drawer button:focus-visible {
            border-color: #506987 !important;
            background: linear-gradient(180deg,#34465e,#29394f) !important;
        }
        body.dc-filter-dark-mode #dc-manual-block-overlay { background: rgba(0,0,0,.68); }
        body.dc-filter-dark-mode #dc-manual-block-panel {
            border-color: #475a74;
            background: linear-gradient(155deg,#26354a,#1c283a);
            color: #edf3ff;
            box-shadow: 0 30px 74px rgba(0,0,0,.62), inset 0 1px 0 rgba(255,255,255,.08);
        }
        body.dc-filter-dark-mode #dc-manual-block-panel .dcuf-manual-header {
            border-color: #40536d;
            background: linear-gradient(135deg,#2b3b52,#223047);
        }
        body.dc-filter-dark-mode #dc-manual-block-panel h3 { color: #f1f5ff; }
        body.dc-filter-dark-mode #dc-manual-block-panel .dcuf-manual-kicker,
        body.dc-filter-dark-mode #dc-block-management-panel .panel-kicker { color: #89a9dd; }
        body.dc-filter-dark-mode #dc-manual-block-panel .dcuf-manual-close,
        body.dc-filter-dark-mode #dc-block-management-panel .panel-close-btn,
        body.dc-filter-dark-mode #dc-backup-popup .popup-close-btn,
        body.dc-filter-dark-mode #dcinside-filter-setting #dcinside-filter-close {
            background: transparent !important;
            color: #b8c6da !important;
            border-color: transparent !important;
        }
        body.dc-filter-dark-mode #dc-manual-block-panel .dcuf-manual-close:hover,
        body.dc-filter-dark-mode #dc-block-management-panel .panel-close-btn:hover,
        body.dc-filter-dark-mode #dc-backup-popup .popup-close-btn:hover,
        body.dc-filter-dark-mode #dcinside-filter-setting #dcinside-filter-close:hover {
            border-color: #4a5e79 !important;
            background: #314159 !important;
            color: #fff !important;
        }
        body.dc-filter-dark-mode #dc-manual-block-panel .dcuf-manual-type-tabs {
            border-color: #40536d;
            background: #172335;
            box-shadow: inset 0 2px 6px rgba(0,0,0,.32);
        }
        body.dc-filter-dark-mode #dc-manual-block-panel [data-manual-block-type] {
            background: transparent !important;
            color: #aab8ca !important;
            border-color: transparent !important;
        }
        body.dc-filter-dark-mode #dc-manual-block-panel [data-manual-block-type][aria-pressed="true"] {
            border-color: #4e6685 !important;
            background: linear-gradient(180deg,#344862,#293a52) !important;
            color: #9fbdff !important;
            box-shadow: 0 6px 14px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.08);
        }
        body.dc-filter-dark-mode #dc-manual-block-panel .dcuf-manual-field { color: #dce6f5; }
        body.dc-filter-dark-mode #dc-manual-block-panel .dcuf-manual-field small,
        body.dc-filter-dark-mode #dc-manual-block-panel .dcuf-manual-hint { color: #9dadc2; }
        body.dc-filter-dark-mode #dc-manual-block-panel .dcuf-manual-field input {
            border-color: #465a76;
            background: #162234;
            color: #f2f6ff;
            box-shadow: inset 0 2px 6px rgba(0,0,0,.35);
        }
        body.dc-filter-dark-mode #dc-manual-block-panel .dcuf-manual-actions button {
            border-color: #465a76;
            background: linear-gradient(180deg,#34445b,#29384e);
            color: #dce6f5;
            box-shadow: 0 6px 14px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.08);
        }
        body.dc-filter-dark-mode #dc-manual-block-panel .dcuf-manual-actions [data-manual-block-action="add"] {
            border-color: #5e8cff;
            background: linear-gradient(180deg,#5f8dff,#3d6de7);
            color: #fff;
        }
        body.dc-filter-dark-mode #dc-selection-popup.dcuf-selection-prompt,
        body.dc-filter-dark-mode #dc-selection-popup:not(.dcuf-selection-prompt) {
            border-color: #465a76 !important;
            background: linear-gradient(145deg,#29384e,#1d2a3d) !important;
            box-shadow: 0 22px 52px rgba(0,0,0,.58), inset 0 1px 0 rgba(255,255,255,.08) !important;
        }
        body.dc-filter-dark-mode #dc-selection-popup .dcuf-selection-prompt-icon {
            background: linear-gradient(145deg,#344862,#26374f);
            color: #8db2ff;
            box-shadow: 0 7px 15px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.08);
        }
        body.dc-filter-dark-mode #dc-selection-popup .dcuf-selection-prompt-copy h4 { color: #edf3ff !important; }
        body.dc-filter-dark-mode #dc-selection-popup .dcuf-selection-prompt-copy p { color: #9fb0c8; }
        body.dc-filter-dark-mode #dc-selection-popup.dcuf-selection-prompt .popup-buttons button {
            border-color: #4b607c !important;
            background: linear-gradient(180deg,#34445b,#28384e) !important;
            color: #dce6f5 !important;
            box-shadow: 0 6px 13px rgba(0,0,0,.26), inset 0 1px 0 rgba(255,255,255,.08) !important;
        }
        body.dc-filter-dark-mode.selection-mode-active .gall_writer,
        body.dc-filter-dark-mode.selection-mode-active .ub-writer {
            outline-color: rgba(117,159,255,.66) !important;
            background: rgba(92,137,241,.16) !important;
        }


        body.dc-filter-dark-mode #dcinside-filter-setting,
        body.dc-filter-dark-mode #dc-block-management-panel,
        body.dc-filter-dark-mode #dc-backup-popup {
            border-color: #455a76 !important;
            background: linear-gradient(155deg,#26354a,#1b2738) !important;
            box-shadow: 0 30px 72px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.07) !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting .dcuf-settings-header,
        body.dc-filter-dark-mode #dc-block-management-panel .panel-header,
        body.dc-filter-dark-mode #dc-backup-popup .popup-header {
            border-color: #40536d !important;
            background: linear-gradient(135deg,#2b3b52,#223047) !important;
        }
        body.dc-filter-dark-mode #dcinside-filter-setting .dcuf-settings-section,
        body.dc-filter-dark-mode #dcinside-filter-setting .dcuf-settings-threshold > div:last-child,
        body.dc-filter-dark-mode #dcinside-filter-setting .dcuf-settings-guest-controls,
        body.dc-filter-dark-mode #dc-backup-popup .export-section,
        body.dc-filter-dark-mode #dc-backup-popup .import-section {
            border-color: #40536d !important;
            background: linear-gradient(145deg,#29394f,#202e43) !important;
            box-shadow: 0 9px 21px rgba(0,0,0,.26), inset 0 1px 0 rgba(255,255,255,.06) !important;
        }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-title-group h3 { color: #edf3ff !important; }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-add-btn {
            border-color: #4e6685 !important;
            background: linear-gradient(180deg,#344862,#293a52) !important;
            color: #9fbdff !important;
            box-shadow: 0 6px 14px rgba(0,0,0,.27), inset 0 1px 0 rgba(255,255,255,.07);
        }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-tabs {
            border-color: #3e5069 !important;
            background: #172335 !important;
            box-shadow: inset 0 2px 6px rgba(0,0,0,.3);
        }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-tab {
            background: transparent !important;
            color: #aab8ca !important;
            border-color: transparent !important;
        }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-tab.active {
            border-color: #4e6685 !important;
            background: linear-gradient(180deg,#344862,#293a52) !important;
            color: #9fbdff !important;
            box-shadow: 0 6px 14px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.08) !important;
        }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-body { background: #1b2738 !important; }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-list-controls {
            border-color: #40536d !important;
            background: rgba(28,40,58,.84);
        }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-search {
            border-color: #455a76;
            background: #162234;
            color: #9dadc2;
            box-shadow: inset 0 2px 6px rgba(0,0,0,.34);
        }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-search-input { color: #edf3ff; }
        body.dc-filter-dark-mode #dc-block-management-panel .blocked-item {
            border-color: #40536d !important;
            background: linear-gradient(145deg,#29394f,#202e43) !important;
            box-shadow: 0 7px 16px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.06);
        }
        body.dc-filter-dark-mode #dc-block-management-panel .blocked-item.item-to-delete {
            border-color: #714856 !important;
            background: linear-gradient(145deg,#3d2b35,#34232c) !important;
        }
        body.dc-filter-dark-mode #dc-block-management-panel .delete-item-btn {
            border-color: #704653 !important;
            background: linear-gradient(180deg,#4d303a,#402731) !important;
            color: #ff9cad !important;
        }
        body.dc-filter-dark-mode #dc-block-management-panel .select-all-btn,
        body.dc-filter-dark-mode #dc-block-management-panel .select-all-global-btn,
        body.dc-filter-dark-mode #dc-block-management-panel .panel-backup-btn {
            border-color: #465a76 !important;
            background: linear-gradient(180deg,#34445b,#29384e) !important;
            color: #dce6f5 !important;
            box-shadow: 0 6px 14px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.06) !important;
        }
        body.dc-filter-dark-mode #dc-block-management-panel .panel-footer {
            border-color: #40536d !important;
            background: linear-gradient(180deg,#253449,#1d2a3d) !important;
        }


        body.dc-filter-dark-mode #dc-personal-block-drawer { background-color: #1d293b !important; }
        body.dc-filter-dark-mode #dc-manual-block-panel { background-color: #1c283a; }
        body.dc-filter-dark-mode #dc-selection-popup.dcuf-selection-prompt,
        body.dc-filter-dark-mode #dc-selection-popup:not(.dcuf-selection-prompt) { background-color: #1d2a3d !important; }
        body.dc-filter-dark-mode #dcinside-filter-setting,
        body.dc-filter-dark-mode #dc-block-management-panel,
        body.dc-filter-dark-mode #dc-backup-popup { background-color: #1b2738 !important; }

        /* DCUF_SHARED_FILTER_UI_DARK_END */
    `;

    const __dcufCssMarkers = Object.freeze({
        view: '/* DCUF_VIEW_SURFACE_START */',
        ui: '/* DCUF_SHARED_FILTER_UI_START */',
        uiEnd: '/* DCUF_SHARED_FILTER_UI_END */',
        uiDark: '/* DCUF_SHARED_FILTER_UI_DARK_START */',
        uiDarkEnd: '/* DCUF_SHARED_FILTER_UI_DARK_END */',
        fabEnd: '/* DCUF_FAB_SHELL_END */',
        fabDarkEnd: '/* DCUF_FAB_SHELL_DARK_END */'
    });
    const __dcufCssIndex = (marker) => {
        const index = __dcufAllFilterCss.indexOf(marker);
        if (index < 0) throw new Error(`DCUF CSS marker missing: ${marker}`);
        return index;
    };
    const __dcufViewCssIndex = __dcufCssIndex(__dcufCssMarkers.view);
    const __dcufUiCssIndex = __dcufCssIndex(__dcufCssMarkers.ui);
    const __dcufUiCssEndIndex = __dcufCssIndex(__dcufCssMarkers.uiEnd) + __dcufCssMarkers.uiEnd.length;
    const __dcufUiDarkCssIndex = __dcufCssIndex(__dcufCssMarkers.uiDark);
    const __dcufUiDarkCssEndIndex = __dcufCssIndex(__dcufCssMarkers.uiDarkEnd) + __dcufCssMarkers.uiDarkEnd.length;
    const __dcufFabCssEndIndex = __dcufCssIndex(__dcufCssMarkers.fabEnd) + __dcufCssMarkers.fabEnd.length;
    const __dcufFabDarkCssEndIndex = __dcufCssIndex(__dcufCssMarkers.fabDarkEnd) + __dcufCssMarkers.fabDarkEnd.length;
    const __dcufCoreFilterCss = __dcufAllFilterCss.slice(0, __dcufViewCssIndex);
    const __dcufViewFilterCss = __dcufAllFilterCss.slice(__dcufViewCssIndex, __dcufUiCssIndex);
    const __dcufGlobalDarkCss = __dcufAllFilterCss.slice(__dcufUiCssEndIndex, __dcufUiDarkCssIndex);
    const __dcufLazyFilterUiCss = [
        __dcufAllFilterCss.slice(__dcufUiCssIndex, __dcufUiCssEndIndex),
        __dcufAllFilterCss.slice(__dcufUiDarkCssIndex, __dcufUiDarkCssEndIndex)
    ].join('\n');
    const __dcufFabShellCss = [
        __dcufAllFilterCss.slice(__dcufUiCssIndex, __dcufFabCssEndIndex),
        __dcufAllFilterCss.slice(__dcufUiDarkCssIndex, __dcufFabDarkCssEndIndex)
    ].join('\n');

    if (__dcufFilterPageContext.hasListSurface) {
        GM_addStyle(`${__dcufCoreFilterCss}\n${__dcufGlobalDarkCss}`);
        GM_addStyle(__dcufFabShellCss);
    }
    if (__dcufFilterPageContext.isView) GM_addStyle(__dcufViewFilterCss);

    let __dcufFilterUiStylesLoaded = false;
    const __dcufEnsureFilterUiStyles = () => {
        if (__dcufFilterUiStylesLoaded) return false;
        GM_addStyle(__dcufLazyFilterUiCss);
        __dcufFilterUiStylesLoaded = true;
        window.__dcufFilterUiStylesLoaded = true;
        window.__dcufDiagnostics?.increment?.('style.filterUi.lazyLoads');
        return true;
    };
    window.__dcufFilterUiStylesLoaded = false;
    window.__dcufEnsureFilterUiStyles = __dcufEnsureFilterUiStyles;


    if (__dcufFilterPageContext.hasListSurface) GM_addStyle(`
        /* [v2.7.5] 댓글/글목록 닉네임 폭 보정 */
        .post-meta {
            justify-content: flex-start !important;
            gap: 10px !important;
        }
        .post-meta .author {
            flex: 1 1 auto !important;
            min-width: 0 !important;
            max-width: calc(100% - 120px) !important;
            justify-content: flex-start !important;
            overflow: visible !important;
        }
        .post-meta .author .gall_writer,
        .post-meta .author .addbox {
            display: inline-flex !important;
            align-items: center !important;
            flex-wrap: nowrap !important;
            min-width: 0 !important;
            max-width: 100% !important;
            width: auto !important;
            overflow: visible !important;
            text-overflow: clip !important;
            white-space: nowrap !important;
        }
        .post-meta .author .nickname {
            max-width: min(56vw, 420px) !important;
        }
        .post-meta .author .ip {
            flex: 0 0 auto !important;
            max-width: none !important;
            overflow: visible !important;
            text-overflow: clip !important;
            white-space: nowrap !important;
        }
        .post-meta .stats {
            flex: 0 0 auto !important;
            margin-left: auto !important;
        }

        div[id^="comment_wrap_"] .comment_box .cmt_nickbox,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_nickbox,
        .gall_comment .comment_box .cmt_nickbox {
            display: inline-flex !important;
            align-items: center !important;
            flex: 1 1 auto !important;
            flex-wrap: nowrap !important;
            min-width: 0 !important;
            max-width: calc(100% - 84px) !important;
            width: auto !important;
            overflow: visible !important;
            white-space: nowrap !important;
        }
        div[id^="comment_wrap_"] .comment_box .gall_writer,
        div[id^="comment_wrap_"] .comment_box .gall_writer.ub-writer,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .gall_writer,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .gall_writer.ub-writer,
        .gall_comment .comment_box .gall_writer,
        .gall_comment .comment_box .gall_writer.ub-writer {
            display: inline-flex !important;
            align-items: center !important;
            flex-wrap: nowrap !important;
            gap: 4px !important;
            min-width: 0 !important;
            max-width: 100% !important;
            width: auto !important;
            overflow: visible !important;
            text-overflow: clip !important;
            white-space: nowrap !important;
            vertical-align: middle !important;
        }
        div[id^="comment_wrap_"] .comment_box .nickname,
        div[id^="comment_wrap_"] .comment_box .nickname em,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .nickname,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .nickname em,
        .gall_comment .comment_box .nickname,
        .gall_comment .comment_box .nickname em {
            display: inline-block !important;
            max-width: min(52vw, 360px) !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            vertical-align: middle !important;
        }
        div[id^="comment_wrap_"] .comment_box .ip,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .ip,
        .gall_comment .comment_box .ip {
            display: inline-block !important;
            flex: 0 0 auto !important;
            max-width: none !important;
            overflow: visible !important;
            text-overflow: clip !important;
            white-space: nowrap !important;
            vertical-align: middle !important;
        }

        @media screen and (max-width: 640px) {
            .post-meta .author {
                max-width: 100% !important;
            }
            .post-meta .author .nickname {
                max-width: min(72vw, 520px) !important;
            }
            div[id^="comment_wrap_"] .comment_box .cmt_nickbox,
            #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_nickbox,
            .gall_comment .comment_box .cmt_nickbox {
                max-width: calc(100vw - 118px) !important;
            }
            div[id^="comment_wrap_"] .comment_box .nickname,
            div[id^="comment_wrap_"] .comment_box .nickname em,
            #focus_cmt > div[id^="comment_wrap_"] .comment_box .nickname,
            #focus_cmt > div[id^="comment_wrap_"] .comment_box .nickname em,
            .gall_comment .comment_box .nickname,
            .gall_comment .comment_box .nickname em {
                max-width: calc(100vw - 160px) !important;
            }
        }
    `);

    /**
     * =================================================================
     * ======================== Filter Module ==========================
     * =================================================================
     */
    const FilterModule = {
        TELECOM: DCUF_SHARED_IP.TELECOM,

        CONSTANTS: DCUF_SHARED_SCHEMA.FILTER_CONSTANTS,
        BLOCK_UID_EXPIRE: 1000 * 60 * 60 * 24 * 7,
        BLOCKED_UIDS_CACHE: {},
        ASYNC_UID_REQUEST_CONCURRENCY: 4,
        INFLIGHT_USER_SUM_REQUESTS: Object.create(null),
        USER_SUM_NEGATIVE_CACHE: new Map(),
        USER_SUM_NEGATIVE_TTL: 30000,
        USER_SUM_NEGATIVE_MAX_ENTRIES: 256,
        _negativeUserSumCacheWrites: 0,
        DEBUG_ENABLED: false,
        DEBUG_MAX_DECISIONS_PER_PASS: 150,
        DEBUG_PASS_ID: 0,
        DEBUG_DECISION_LOG_COUNT: 0,
        DEBUG_DECISION_KEYS: null,
        _runtimeMutationUnsubscribe: null,
        _userSumTaskQueue: null,
        _blockedUidWritePromise: null,
        _queuedObserverFilterItems: null,
        _queuedObserverFilterRafId: 0,
        _queuedObserverFilterTimerId: 0,
        _syncRefilterRafId: 0,
        _syncRefilterTimerIds: null,
        _krPrefixSet: null,
        _telecomPrefixSet: null,
        _proxyStrictPrefixSet: null,
        _proxyAggressiveExtraPrefixSet: null,
        _proxyAggressivePrefixSet: null,
        PROXY_MODE: DCUF_SHARED_IP.PROXY_MODE,
        PROXY_STRICT_PREFIXES: DCUF_SHARED_IP.PROXY_STRICT_PREFIXES,
        PROXY_AGGRESSIVE_EXTRA_PREFIXES: DCUF_SHARED_IP.PROXY_AGGRESSIVE_EXTRA_PREFIXES,
        KR_IP_RANGES: DCUF_SHARED_IP.KR_IP_RANGES,
        // This source is the mobile target adapter. The PC builder rewrites this
        // target flag to false when it ports the shared filter module.
        isMobile: () => true,
        isRecommendedContext: () => window.location.search.includes('exception_mode=recommend'),
        normalizeProxyBlockMode(value) {
            return DCUF_SHARED_STORAGE.normalizeProxyBlockModeValue(value);
        },
        getProxyModeLabel(mode) {
            switch (this.normalizeProxyBlockMode(mode)) {
                case this.PROXY_MODE.STRICT: return '확실한 우회 차단';
                case this.PROXY_MODE.AGGRESSIVE: return '공격적 우회 차단';
                default: return '끔';
            }
        },
        normalizeIpPrefix(value) {
            return DCUF_SHARED_STORAGE.normalizeIpPrefix(value);
        },
        parseIpPrefixList(value) {
            return DCUF_SHARED_STORAGE.parseIpPrefixList(value, this.CONSTANTS.ETC.MOBILE_IP_MARKER);
        },
        getIpPrefix(ip) {
            return DCUF_SHARED_STORAGE.extractIpPrefix(ip);
        },
        getKrPrefixSet() {
            if (!this._krPrefixSet) {
                const prefixes = [];
                Object.entries(this.KR_IP_RANGES).forEach(([first, ranges]) => {
                    ranges.forEach(([start, end]) => {
                        for (let second = start; second <= end; second += 1) {
                            prefixes.push(`${first}.${second}`);
                        }
                    });
                });
                this._krPrefixSet = new Set(prefixes);
            }
            return this._krPrefixSet;
        },
        isForeignIpPrefix(ipPrefix) {
            return Boolean(ipPrefix) && !this.getKrPrefixSet().has(ipPrefix);
        },
        getTelecomPrefixSet() {
            if (!this._telecomPrefixSet) {
                const prefixes = [];
                this.TELECOM.forEach((group) => group[1].forEach((item) => {
                    if (item[2] === 'MOB') prefixes.push(`${group[0]}.${item[0]}`);
                }));
                this._telecomPrefixSet = new Set(prefixes);
            }
            return this._telecomPrefixSet;
        },
        getProxyStrictPrefixSet() {
            if (!this._proxyStrictPrefixSet) this._proxyStrictPrefixSet = new Set(this.PROXY_STRICT_PREFIXES);
            return this._proxyStrictPrefixSet;
        },
        getProxyAggressiveExtraPrefixSet() {
            if (!this._proxyAggressiveExtraPrefixSet) this._proxyAggressiveExtraPrefixSet = new Set(this.PROXY_AGGRESSIVE_EXTRA_PREFIXES);
            return this._proxyAggressiveExtraPrefixSet;
        },
        getProxyPrefixSet(mode = this.PROXY_MODE.STRICT) {
            const normalizedMode = this.normalizeProxyBlockMode(mode);
            if (normalizedMode === this.PROXY_MODE.AGGRESSIVE) {
                if (!this._proxyAggressivePrefixSet) {
                    this._proxyAggressivePrefixSet = new Set(this.getProxyStrictPrefixSet());
                    this.getProxyAggressiveExtraPrefixSet().forEach((prefix) => this._proxyAggressivePrefixSet.add(prefix));
                }
                return this._proxyAggressivePrefixSet;
            }
            return normalizedMode === this.PROXY_MODE.STRICT ? this.getProxyStrictPrefixSet() : null;
        },
        getProxyPrefixMatch(ipPrefix, mode) {
            const normalizedMode = this.normalizeProxyBlockMode(mode);
            if (!ipPrefix || normalizedMode === this.PROXY_MODE.OFF) return { matched: false, tier: null };
            if (this.getProxyStrictPrefixSet().has(ipPrefix) || this.isForeignIpPrefix(ipPrefix)) return { matched: true, tier: 'strict' };
            if (normalizedMode === this.PROXY_MODE.AGGRESSIVE && this.getProxyAggressiveExtraPrefixSet().has(ipPrefix)) {
                return { matched: true, tier: 'aggressive' };
            }
            return { matched: false, tier: null };
        },
        debugLog(scope, message, payload) {
            if (!this.DEBUG_ENABLED) return;
            if (payload === undefined) console.log(`[DCUF DEBUG][${scope}] ${message}`);
            else console.log(`[DCUF DEBUG][${scope}] ${message}`, payload);
        },
        debugSettingsSnapshot(extra = {}) {
            const s = dcFilterSettings || {};
            const proxyBlockMode = this.normalizeProxyBlockMode(s.proxyBlockMode ?? s.proxyBlockEnabled);
            return {
                masterDisabled: !!s.masterDisabled,
                excludeRecommended: !!s.excludeRecommended,
                threshold: s.threshold,
                ratioEnabled: !!s.ratioEnabled,
                ratioMin: s.ratioMin,
                ratioMax: s.ratioMax,
                blockGuestEnabled: !!s.blockGuestEnabled,
                proxyBlockMode,
                proxyBlockModeLabel: this.getProxyModeLabel(proxyBlockMode),
                proxyBlockEnabled: proxyBlockMode !== this.PROXY_MODE.OFF,
                telecomBlockEnabled: !!s.telecomBlockEnabled,
                blockedGuestsCount: Array.isArray(s.blockedGuests) ? s.blockedGuests.length : 0,
                blockedGuestsPreview: Array.isArray(s.blockedGuests) ? s.blockedGuests.slice(0, 10) : [],
                customIpPrefixCount: s.customIpPrefixSet instanceof Set ? s.customIpPrefixSet.size : 0,
                customIpPrefixPreview: s.customIpPrefixSet instanceof Set ? Array.from(s.customIpPrefixSet).slice(0, 15) : [],
                telecomPrefixCount: this.getTelecomPrefixSet().size,
                proxyStrictPrefixCount: this.getProxyStrictPrefixSet().size,
                proxyAggressiveExtraPrefixCount: this.getProxyAggressiveExtraPrefixSet().size,
                proxyAggressivePrefixCount: this.getProxyPrefixSet(this.PROXY_MODE.AGGRESSIVE).size,
                effectiveProxyPrefixCount: proxyBlockMode === this.PROXY_MODE.AGGRESSIVE ? this.getProxyPrefixSet(this.PROXY_MODE.AGGRESSIVE).size : (proxyBlockMode === this.PROXY_MODE.STRICT ? this.getProxyStrictPrefixSet().size : 0),
                ...extra
            };
        },
        debugStringifySafe(value) {
            try {
                return JSON.stringify(value);
            } catch (error) {
                return `[stringify-failed:${error?.message || 'unknown'}]`;
            }
        },
        debugDescribeElement(element) {
            if (!(element instanceof HTMLElement)) return { tag: null };
            const titleNode = element.querySelector('.gall_tit a, .post-title-link, .usertxt, .gall_tit, .post-title');
            return {
                tag: element.tagName,
                id: element.id || null,
                className: typeof element.className === 'string' ? element.className : '',
                rowId: element.getAttribute('data-custom-row-id'),
                title: titleNode ? titleNode.textContent.trim().replace(/\s+/g, ' ').slice(0, 80) : null
            };
        },
        startDebugPass(reason, extra = {}) {
            if (!this.DEBUG_ENABLED) return;
            this.DEBUG_PASS_ID += 1;
            this.DEBUG_DECISION_LOG_COUNT = 0;
            if (!(this.DEBUG_DECISION_KEYS instanceof Set)) this.DEBUG_DECISION_KEYS = new Set();
            this.DEBUG_DECISION_KEYS.clear();
            this.debugLog('pass', `start #${this.DEBUG_PASS_ID} ${reason}`, {
                passId: this.DEBUG_PASS_ID,
                ...extra,
                settings: this.debugSettingsSnapshot()
            });
        },
        debugDecision(element, payload) {
            if (!this.DEBUG_ENABLED) return;
            if (!(this.DEBUG_DECISION_KEYS instanceof Set)) this.DEBUG_DECISION_KEYS = new Set();
            const reasons = Array.isArray(payload.reasons) ? payload.reasons.filter(Boolean) : [];
            const identity = [
                this.DEBUG_PASS_ID,
                payload.branch || '',
                payload.uid || '',
                payload.ip || '',
                payload.ipPrefix || '',
                payload.isBlocked ? 'hide' : 'show',
                reasons.join(',')
            ].join('|');
            if (this.DEBUG_DECISION_KEYS.has(identity)) return;
            if (this.DEBUG_DECISION_LOG_COUNT >= this.DEBUG_MAX_DECISIONS_PER_PASS) return;
            this.DEBUG_DECISION_KEYS.add(identity);
            this.DEBUG_DECISION_LOG_COUNT += 1;
            this.debugLog('decision', `${payload.branch || 'sync'} #${this.DEBUG_DECISION_LOG_COUNT}`, {
                passId: this.DEBUG_PASS_ID,
                element: this.debugDescribeElement(element),
                ...payload,
                reasons
            });
            console.log(
                `[DCUF DEBUG][decision-line] pass=${this.DEBUG_PASS_ID} idx=${this.DEBUG_DECISION_LOG_COUNT} branch=${payload.branch || 'sync'} blocked=${payload.isBlocked} ` +
                `uid=${payload.uid || '(none)'} nick=${payload.nickname || '(none)'} ip=${payload.ip || '(none)'} prefix=${payload.ipPrefix || '(none)'} ` +
                `guest=${payload.isGuest} custom=${payload.hasCustomIpPrefixBlock} proxyMode=${payload.proxyBlockMode} proxy=${payload.proxyPrefixMatch} proxyTier=${payload.proxyMatchTier || '(none)'} telecom=${payload.telecomPrefixMatch} ` +
                `blockedGuest=${payload.blockedGuestMatch} reasons=${reasons.join(',') || '(none)'}`
            );
        },
        debugMirrorSync(originalRow, mirroredItem, nextDisplay, source) {
            if (!this.DEBUG_ENABLED) return;
            const prevDisplay = mirroredItem.style.display || '';
            if (prevDisplay === nextDisplay && nextDisplay !== 'none') return;
            this.debugLog('mirror', source, {
                original: this.debugDescribeElement(originalRow),
                mirrored: this.debugDescribeElement(mirroredItem),
                originalDisplay: originalRow.style.display || '',
                mirroredBefore: prevDisplay,
                mirroredAfter: nextDisplay,
                originalClassName: typeof originalRow.className === 'string' ? originalRow.className : ''
            });
        },
        async debugDumpState(reason = 'manual') {
            if (!this.DEBUG_ENABLED) return null;
            await this.reloadSettings();
            const rawBlockConfig = await GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG, {});
            const payload = this.debugSettingsSnapshot({
                reason,
                rawBlockConfigIp: typeof rawBlockConfig?.ip === 'string' ? rawBlockConfig.ip : '',
                rawBlockConfigIpPreview: typeof rawBlockConfig?.ip === 'string' ? rawBlockConfig.ip.split('||').slice(0, 20) : [],
                rawBlockConfigIpCount: this.parseIpPrefixList(rawBlockConfig?.ip || '').length
            });
            this.debugLog('dump', reason, payload);
            console.log(`[DCUF DEBUG][dump-line] ${this.debugStringifySafe(payload)}`);
            return payload;
        },
        installDebugApi() {
            if (window.DCUFDebug && window.DCUFDebug.__dcufInstalled) return;
            window.DCUFDebug = {
                __dcufInstalled: true,
                dumpState: (reason = 'manual dumpState') => this.debugDumpState(reason),
                inspectCurrentPage: async (reason = 'manual inspectCurrentPage') => {
                    await this.reloadSettings();
                    this.startDebugPass(reason, { source: 'window.DCUFDebug.inspectCurrentPage' });
                    this.runSyncRefilterPass();
                    return this.debugDumpState(`${reason} after runSyncRefilterPass`);
                },
                refilter: async (reason = 'manual refilter') => {
                    await this.refilterAllContent(reason);
                    return this.debugDumpState(`${reason} after refilter`);
                }
            };
            this.debugLog('api', 'window.DCUFDebug installed', Object.keys(window.DCUFDebug));
        },
        async cleanupLegacyManagedBlockConfig(snapshot = null) {
            const migrationDone = snapshot ? snapshot.migrationDone : await GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG_MIGRATION_V275_DONE, false);
            if (migrationDone) return;
            const conf = snapshot?.blockConfig || await GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG, {});
            if (!conf || typeof conf !== 'object') {
                await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG_MIGRATION_V275_DONE, true);
                if (snapshot) snapshot.migrationDone = true;
                return;
            }
            const currentIp = typeof conf.ip === 'string' ? conf.ip : '';
            const parsedPrefixes = DCUF_SHARED_STORAGE.parseIpPrefixList(currentIp, this.CONSTANTS.ETC.MOBILE_IP_MARKER);
            const normalizedIp = DCUF_SHARED_STORAGE.normalizeBlockConfigIp(currentIp, this.CONSTANTS.ETC.MOBILE_IP_MARKER);
            const suspiciousLargeLegacyList = DCUF_SHARED_STORAGE.isSuspiciousLegacyManagedIpList(currentIp, this.CONSTANTS.ETC.MOBILE_IP_MARKER);

            if (suspiciousLargeLegacyList) {
                this.debugLog('migration', 'detected suspicious large legacy blockConfig.ip list, backing up and clearing', {
                    beforeCount: parsedPrefixes.length,
                    beforePreview: parsedPrefixes.slice(0, 20)
                });
                await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG_MIGRATION_V275_BACKUP, currentIp);
                conf.ip = '';
                await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG, conf);
                await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG_MIGRATION_V275_DONE, true);
                if (snapshot) { snapshot.blockConfig = conf; snapshot.migrationDone = true; }
                return;
            }

            if (normalizedIp !== currentIp) {
                this.debugLog('migration', 'cleanupLegacyManagedBlockConfig updating blockConfig.ip', {
                    before: currentIp,
                    after: normalizedIp
                });
                conf.ip = normalizedIp;
                await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG, conf);
            }
            await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG_MIGRATION_V275_DONE, true);
            if (snapshot) { snapshot.blockConfig = conf; snapshot.migrationDone = true; }
        },
        async showSettings() {
            window.__dcufEnsureFilterUiStyles?.();
            await this.reloadSettings();
            const { masterDisabled = false, excludeRecommended = false, threshold = 0, ratioEnabled = false, ratioMin = '', ratioMax = '', blockGuestEnabled = false, proxyBlockMode = 0, telecomBlockEnabled = false } = dcFilterSettings;
            const currentShortcut = await GM_getValue(this.CONSTANTS.STORAGE_KEYS.SHORTCUT_KEY, 'Shift+S');
            const normalizedProxyBlockMode = this.normalizeProxyBlockMode(proxyBlockMode);
            const existingDiv = document.getElementById(this.CONSTANTS.UI_IDS.SETTINGS_PANEL);
            if (existingDiv) existingDiv.remove();
            const div = document.createElement('div');
            div.id = this.CONSTANTS.UI_IDS.SETTINGS_PANEL;
            div.style = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:24px 20px 18px 20px;min-width:280px;z-index:99999;border:2px solid #333;border-radius:10px;box-shadow:0 0 10px #0008; cursor: default; user-select: none;';
            const proxyModeButtonsHtml = [
                [this.PROXY_MODE.OFF, '끔'],
                [this.PROXY_MODE.STRICT, '확실'],
                [this.PROXY_MODE.AGGRESSIVE, '공격적']
            ].map(([mode, label]) => {
                const active = normalizedProxyBlockMode === mode;
                return `<button type="button" data-proxy-mode="${mode}" aria-pressed="${active}" style="flex:1;min-width:0;border:0;background:${active ? '#3b71fd' : 'transparent'};color:${active ? '#fff' : '#333'};font-size:12px;font-weight:${active ? '700' : '600'};padding:5px 0;border-radius:7px;cursor:pointer;">${label}</button>`;
            }).join('');
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
                        <div style="border: 2px solid #000; border-radius: 5px; padding: 8px 8px 5px 6px;"><div style="display: flex; flex-direction: column; align-items: center; gap: 7px; text-align:center;"><div style="display:flex; align-items:center; justify-content:center; gap:6px; padding-bottom: 5px; border-bottom: 1px solid #ddd; width:100%;"><label class="switch" style="flex-shrink:0;"><input id="${this.CONSTANTS.UI_IDS.BLOCK_GUEST_CHECKBOX}" type="checkbox" ${blockGuestEnabled ? 'checked' : ''}><span class="switch-slider"></span></label><label for="${this.CONSTANTS.UI_IDS.BLOCK_GUEST_CHECKBOX}" style="font-size:13px;cursor:pointer;">유동 전체 차단</label></div><div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding-bottom: 5px; border-bottom: 1px solid #ddd; width:100%; text-align:center;"><div style="font-size:13px;">우회 IP 차단(오탐 위험 있음)</div><div id="${this.CONSTANTS.UI_IDS.PROXY_BLOCK_MODE_GROUP}" style="display:flex; width:100%; max-width:220px; gap:2px; background:#edf1f5; border:1px solid #cfd6dd; border-radius:8px; padding:2px; justify-content:center;">${proxyModeButtonsHtml}</div><div class="dcuf-proxy-mode-desc" style="font-size:11px;color:#666;line-height:1.2; text-align:center;">끔 - 확실한 우회 차단 - 공격적 우회 차단</div></div><div style="display:flex; align-items:center; gap:6px;"><label class="switch" style="flex-shrink:0;"><input id="${this.CONSTANTS.UI_IDS.TELECOM_BLOCK_CHECKBOX}" type="checkbox" ${telecomBlockEnabled ? 'checked' : ''}><span class="switch-slider"></span></label><label for="${this.CONSTANTS.UI_IDS.TELECOM_BLOCK_CHECKBOX}" style="font-size:13px;cursor:pointer;">통신사 IP 차단</label></div></div></div>
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
                if (thresholdSection) {
                    thresholdSection.classList.add('dcuf-settings-section', 'dcuf-settings-threshold');
                    const guestControls = thresholdSection.lastElementChild;
                    if (guestControls) guestControls.classList.add('dcuf-settings-guest-controls');
                }
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
            const proxyBlockModeGroup = div.querySelector(`#${this.CONSTANTS.UI_IDS.PROXY_BLOCK_MODE_GROUP}`);
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

            if (!masterDisableCheckbox || !settingsContainer || !ratioSection || !ratioEnableCheckbox || !ratioMinInput || !ratioMaxInput || !saveButton || !excludeRecommendedCheckbox || !blockGuestCheckbox || !proxyBlockModeGroup || !telecomBlockCheckbox) {
                console.error('DCinside User Filter: settings popup init failed - required control missing.');
                return;
            }

            const updateMasterState = () => { const isMasterDisabled = masterDisableCheckbox.checked; settingsContainer.style.opacity = isMasterDisabled ? 0.5 : 1; settingsContainer.style.pointerEvents = isMasterDisabled ? 'none' : 'auto'; };
            masterDisableCheckbox.addEventListener('change', updateMasterState); updateMasterState();
            const updateRatioSectionState = () => { const enabled = ratioEnableCheckbox.checked; ratioSection.style.opacity = enabled ? 1 : 0.5; ratioMinInput.disabled = !enabled; ratioMaxInput.disabled = !enabled; };
            ratioEnableCheckbox.addEventListener('change', updateRatioSectionState); updateRatioSectionState();
            let currentProxyBlockMode = normalizedProxyBlockMode;
            const renderProxyModeButtons = (mode) => {
                const isDarkMode = document.body.classList.contains('dc-filter-dark-mode');
                proxyBlockModeGroup.querySelectorAll('button[data-proxy-mode]').forEach((button) => {
                    const buttonMode = this.normalizeProxyBlockMode(button.getAttribute('data-proxy-mode'));
                    const active = mode === buttonMode;
                    button.setAttribute('aria-pressed', active ? 'true' : 'false');
                    button.style.background = active ? '#3b71fd' : 'transparent';
                    button.style.color = active ? '#fff' : (isDarkMode ? '#dbe6f5' : '#333');
                    button.style.fontWeight = active ? '700' : '600';
                    button.style.border = '0';
                });
            };
            renderProxyModeButtons(currentProxyBlockMode);

            // [v2.6.8 추가] 스위치 실시간 저장 & 필터 즉시 적용
            const applyCheckboxChange = async (storageKey, value, extraLogic) => {
                this.debugLog('toggle', 'applyCheckboxChange requested', { storageKey, value });
                await GM_setValue(storageKey, value);
                if (extraLogic) {
                    this.debugLog('toggle', 'applyCheckboxChange running extraLogic', { storageKey, value });
                    await extraLogic();
                }
                await this.debugDumpState(`after ${storageKey}=${value} before refilter`);
                await this.refilterAllContent(`toggle ${storageKey}=${value}`);
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
            proxyBlockModeGroup.addEventListener('click', (e) => {
                const targetButton = e.target.closest('button[data-proxy-mode]');
                if (!targetButton) return;
                const nextMode = this.normalizeProxyBlockMode(targetButton.getAttribute('data-proxy-mode'));
                if (nextMode === currentProxyBlockMode) return;
                currentProxyBlockMode = nextMode;
                renderProxyModeButtons(currentProxyBlockMode);
                applyCheckboxChange(this.CONSTANTS.STORAGE_KEYS.BLOCK_PROXY, currentProxyBlockMode);
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
            let dragWidth = 0, dragHeight = 0;
            let dragRafId = 0, pendingDragX = null, pendingDragY = null;
            const applyDragPosition = () => {
                dragRafId = 0;
                if (!isDragging || pendingDragX === null || pendingDragY === null) return;
                let newX = pendingDragX - offsetX;
                let newY = pendingDragY - offsetY;
                pendingDragX = null;
                pendingDragY = null;
                newX = Math.max(0, Math.min(newX, window.innerWidth - dragWidth));
                newY = Math.max(0, Math.min(newY, window.innerHeight - dragHeight));
                div.style.left = `${newX}px`;
                div.style.top = `${newY}px`;
            };
            const onDragStart = (e) => {
                if (e.type === 'touchstart' && e.touches && e.touches.length > 1) return;
                const startTarget = (e.target && e.target.nodeType === 1) ? e.target : e.target.parentElement;
                if (!startTarget || !startTarget.closest('.dcuf-settings-header')) return;
                if (startTarget.closest('button, input, label, a, .switch') || startTarget.id === FilterModule.CONSTANTS.UI_IDS.CLOSE_BUTTON || startTarget.id === FilterModule.CONSTANTS.UI_IDS.CHANGE_SHORTCUT_BTN) return;
                isDragging = true;
                const rect = div.getBoundingClientRect();
                if (div.style.transform !== 'none') { div.style.transform = 'none'; div.style.left = `${rect.left}px`; div.style.top = `${rect.top}px`; }
                dragWidth = rect.width;
                dragHeight = rect.height;
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
                const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
                const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
                pendingDragX = clientX;
                pendingDragY = clientY;
                if (!dragRafId) dragRafId = requestAnimationFrame(applyDragPosition);
            };
            const onDragEnd = () => {
                if (dragRafId) cancelAnimationFrame(dragRafId);
                applyDragPosition();
                isDragging = false;
                document.removeEventListener('mousemove', onDragMove);
                document.removeEventListener('touchmove', onDragMove);
            };
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
                    GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_PROXY, currentProxyBlockMode),
                    GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_TELECOM, telecomBlockCheckbox.checked)
                ];
                if (!blockGuestChecked) promises.push(this.clearBlockedGuests()); try {
                    await Promise.all(promises);
                    await this.debugDumpState('save button before refilter');
                    await this.refilterAllContent('save button');
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
            return DCUF_SHARED_STORAGE.formatShortcutKeys(keySet);
        },
        // [v2.1 추가] 단축키 문자열을 이벤트 비교용 객체로 변환
        parseShortcutString(shortcutString) {
            return DCUF_SHARED_STORAGE.parseShortcutString(shortcutString);
        },
        buildLookupSet(items, mapValue = (item) => item) {
            const set = new Set();
            if (!Array.isArray(items)) return set;
            items.forEach((item) => {
                const value = mapValue(item);
                if (value) set.add(value);
            });
            return set;
        },
        isFilterTargetDescriptor(value) {
            return Boolean(value && value.element instanceof HTMLElement);
        },
        normalizeFilterTarget(target) {
            if (this.isFilterTargetDescriptor(target)) return target;
            return this.describeFilterTarget(target);
        },
        isReplyOnlyCommentWrapper(element) {
            if (!(element instanceof HTMLElement)) return false;
            if (!this.isCommentListItem(element)) return false;
            return Boolean(element.querySelector(':scope > div.reply.show'))
                && !element.querySelector(':scope > div.cmt_info');
        },
        findWriterInfoForFilterTarget(element) {
            if (!(element instanceof HTMLElement)) return null;
            const directCommentWriter = element.querySelector(':scope > div.cmt_info .ub-writer');
            if (directCommentWriter instanceof HTMLElement) return directCommentWriter;

            const directReplyWriter = element.querySelector(':scope > div.reply_info .ub-writer');
            if (directReplyWriter instanceof HTMLElement) return directReplyWriter;

            if (this.isCommentListItem(element)) return null;
            return element.querySelector(this.CONSTANTS.SELECTORS.WRITER_INFO);
        },
        describeFilterTarget(element) {
            if (!(element instanceof HTMLElement)) return null;
            if (this.isReplyOnlyCommentWrapper(element)) return null;

            const writerInfo = this.findWriterInfoForFilterTarget(element);
            const uid = writerInfo?.getAttribute('data-uid') || null;
            const nickname = writerInfo?.getAttribute('data-nick') || null;
            const writerDataIp = writerInfo?.getAttribute('data-ip') || null;
            const ipSpan = element.querySelector(this.CONSTANTS.SELECTORS.IP_SPAN);
            const ipText = ipSpan ? ipSpan.textContent.trim() : '';
            const ipFromSpan = (ipText.startsWith('(') && ipText.endsWith(')')) ? ipText.slice(1, -1) : ipText;
            const ip = ipFromSpan || writerDataIp || null;
            const ipPrefix = this.getIpPrefix(ip);

            return {
                element,
                writerInfo,
                uid,
                nickname,
                ip,
                ipText,
                writerDataIp,
                ipPrefix,
                isGuest: Boolean((!uid || uid.length < 3) && ip),
                isNotice: Boolean(element.querySelector('em.icon_notice')),
                shouldSkipFiltering: this.shouldSkipFiltering(element),
                hasBlockDisableClass: element.classList.contains('block-disable')
            };
        },
        describeFilterTargets(items) {
            if (!Array.isArray(items) || items.length === 0) return [];
            const seen = new Set();
            const descriptors = [];
            items.forEach((item) => {
                const descriptor = this.normalizeFilterTarget(item);
                const element = descriptor?.element;
                if (!(element instanceof HTMLElement) || seen.has(element)) return;
                seen.add(element);
                descriptors.push(descriptor);
            });
            return descriptors;
        },
        applySyncToDescriptors(descriptors, { resetDisplay = false } = {}) {
            if (!Array.isArray(descriptors) || descriptors.length === 0) return;
            descriptors.forEach((descriptor) => {
                const element = descriptor?.element;
                if (!(element instanceof HTMLElement)) return;
                if (resetDisplay && !dcFilterSettings.masterDisabled) {
                    // Comment items can already be hidden by async UID blocking.
                    // Clearing display before the next sync decision makes blocked comments briefly flash back in
                    // until a later async/stabilized pass hides them again, so preserve current visibility here.
                    if (!this.isCommentListItem(element)) {
                        element.style.display = '';
                    }
                }
                this.applySyncBlock(descriptor);
            });
        },
        applyAsyncToDescriptors(descriptors) {
            if (!Array.isArray(descriptors) || descriptors.length === 0) return;
            descriptors.forEach((descriptor) => {
                void this.applyAsyncBlock(descriptor);
            });
        },
        applyFilterItems(items) {
            const descriptors = this.describeFilterTargets(items);
            if (descriptors.length === 0) return;
            this.applySyncToDescriptors(descriptors);
            this.applyAsyncToDescriptors(descriptors);
        },
        flushQueuedObservedFilterItems() {
            if (this._queuedObserverFilterRafId) {
                cancelAnimationFrame(this._queuedObserverFilterRafId);
                this._queuedObserverFilterRafId = 0;
            }
            if (this._queuedObserverFilterTimerId) {
                clearTimeout(this._queuedObserverFilterTimerId);
                this._queuedObserverFilterTimerId = 0;
            }
            if (!(this._queuedObserverFilterItems instanceof Set) || this._queuedObserverFilterItems.size === 0) return;
            const items = Array.from(this._queuedObserverFilterItems);
            this._queuedObserverFilterItems.clear();
            this.applyFilterItems(items);
        },
        queueObservedFilterItems(items) {
            if (!Array.isArray(items) || items.length === 0) return;
            if (!(this._queuedObserverFilterItems instanceof Set)) this._queuedObserverFilterItems = new Set();
            items.forEach((item) => {
                if (item instanceof HTMLElement) this._queuedObserverFilterItems.add(item);
            });
            if (this._queuedObserverFilterItems.size === 0) return;
            if (this._queuedObserverFilterRafId || this._queuedObserverFilterTimerId) return;

            this._queuedObserverFilterRafId = requestAnimationFrame(() => {
                this._queuedObserverFilterRafId = 0;
                this.flushQueuedObservedFilterItems();
            });
            this._queuedObserverFilterTimerId = window.setTimeout(() => {
                this._queuedObserverFilterTimerId = 0;
                this.flushQueuedObservedFilterItems();
            }, 80);
        },
        collectMutationFilterItems(payload, containerSelector, itemSelector, {
            attributeNames = [],
            includeChildListTargets = false
        } = {}) {
            if (!payload || typeof payload !== 'object') return [];
            const items = [];
            const seen = new Set();
            const watchedAttributes = new Set(attributeNames);
            const addItem = (element) => {
                if (!(element instanceof HTMLElement) || !element.isConnected || seen.has(element)) return;
                if (!element.matches(itemSelector) || !element.closest(containerSelector)) return;
                seen.add(element);
                items.push(element);
            };
            const scanTarget = (root) => {
                if (!(root instanceof Element)) return;
                addItem(root);
                const closestItem = root.closest(itemSelector);
                if (closestItem) addItem(closestItem);
            };
            const scanAddedRoot = (root) => {
                if (!(root instanceof Element)) return;
                scanTarget(root);
                if (typeof root.querySelectorAll === 'function') {
                    root.querySelectorAll(itemSelector).forEach(addItem);
                }
            };

            if (Array.isArray(payload.addedElements)) payload.addedElements.forEach(scanAddedRoot);
            if (Array.isArray(payload.records)) {
                payload.records.forEach((record) => {
                    if (record?.type === 'attributes' && watchedAttributes.has(record.attributeName)) {
                        scanTarget(record.target);
                    } else if (includeChildListTargets && record?.type === 'childList') {
                        scanTarget(record.target);
                    }
                });
            }
            return items;
        },
        collectImmediateCommentFilterItems(payload) {
            return this.collectMutationFilterItems(
                payload,
                this.CONSTANTS.SELECTORS.COMMENT_CONTAINER,
                this.CONSTANTS.SELECTORS.COMMENT_ITEM,
                { attributeNames: ['data-uid', 'data-nick', 'data-ip'] }
            );
        },
        applyImmediateCommentMutations(payload) {
            const items = this.collectImmediateCommentFilterItems(payload);
            if (items.length === 0) return;
            const descriptors = this.describeFilterTargets(items);
            this.applySyncToDescriptors(descriptors);
            this.incrementRuntimeDiagnostic('filter.immediateComment.runs');
            this.setRuntimeDiagnosticGauge('filter.immediateComment.lastTargetCount', descriptors.length);
        },
        getRuntimeCoordinator() {
            return window.__dcufRuntimeCoordinator || null;
        },
        incrementRuntimeDiagnostic(label, amount = 1) {
            const runtimeCoordinator = this.getRuntimeCoordinator();
            if (typeof runtimeCoordinator?.incrementDiagnostic === 'function') {
                runtimeCoordinator.incrementDiagnostic(label, amount);
            }
        },
        setRuntimeDiagnosticGauge(label, value) {
            const runtimeCoordinator = this.getRuntimeCoordinator();
            if (typeof runtimeCoordinator?.setDiagnosticGauge === 'function') {
                runtimeCoordinator.setDiagnosticGauge(label, value);
            }
        },
        getRelevantMutationGeneration(scope = 'all') {
            if (scope === 'comments') return Number(this._commentRelevantMutationGeneration) || 0;
            return Number(this._filterRelevantMutationGeneration) || 0;
        },
        markRelevantMutation(scope = 'all') {
            this._filterRelevantMutationGeneration = (Number(this._filterRelevantMutationGeneration) || 0) + 1;
            if (scope === 'comments') {
                this._commentRelevantMutationGeneration = (Number(this._commentRelevantMutationGeneration) || 0) + 1;
            }
            this.setRuntimeDiagnosticGauge('filter.relevantGeneration', this._filterRelevantMutationGeneration);
            this.setRuntimeDiagnosticGauge('filter.commentRelevantGeneration', Number(this._commentRelevantMutationGeneration) || 0);
        },
        getUserSumTaskQueue() {
            if (this._userSumTaskQueue) return this._userSumTaskQueue;
            const runtimeCoordinator = this.getRuntimeCoordinator();
            if (runtimeCoordinator && typeof runtimeCoordinator.createTaskQueue === 'function') {
                this._userSumTaskQueue = runtimeCoordinator.createTaskQueue('filter-user-sum', {
                    concurrency: this.ASYNC_UID_REQUEST_CONCURRENCY
                });
                return this._userSumTaskQueue;
            }

            this._userSumTaskQueue = {
                enqueue(run) {
                    return Promise.resolve().then(run);
                }
            };
            return this._userSumTaskQueue;
        },
        getNegativeUserSumCache(uid) {
            const cached = this.USER_SUM_NEGATIVE_CACHE.get(uid);
            if (!cached) return null;
            if (Date.now() - cached.ts > this.USER_SUM_NEGATIVE_TTL) {
                this.USER_SUM_NEGATIVE_CACHE.delete(uid);
                this.setRuntimeDiagnosticGauge('filter.negativeUserSumCache.size', this.USER_SUM_NEGATIVE_CACHE.size);
                return null;
            }
            return cached;
        },
        pruneNegativeUserSumCache(now = Date.now()) {
            let removed = 0;
            this.USER_SUM_NEGATIVE_CACHE.forEach((entry, key) => {
                if (!entry || typeof entry.ts !== 'number' || now - entry.ts > this.USER_SUM_NEGATIVE_TTL) {
                    this.USER_SUM_NEGATIVE_CACHE.delete(key);
                    removed += 1;
                }
            });
            while (this.USER_SUM_NEGATIVE_CACHE.size > this.USER_SUM_NEGATIVE_MAX_ENTRIES) {
                const oldestKey = this.USER_SUM_NEGATIVE_CACHE.keys().next().value;
                if (oldestKey === undefined) break;
                this.USER_SUM_NEGATIVE_CACHE.delete(oldestKey);
                removed += 1;
            }
            if (removed > 0) this.incrementRuntimeDiagnostic('filter.negativeUserSumCache.pruned', removed);
            this.setRuntimeDiagnosticGauge('filter.negativeUserSumCache.size', this.USER_SUM_NEGATIVE_CACHE.size);
            return removed;
        },
        setNegativeUserSumCache(uid, reason = 'error') {
            if (!uid) return null;
            const cached = { ts: Date.now(), reason };
            this.USER_SUM_NEGATIVE_CACHE.delete(uid);
            this.USER_SUM_NEGATIVE_CACHE.set(uid, cached);
            this._negativeUserSumCacheWrites = (this._negativeUserSumCacheWrites + 1) % 32;
            if (this.USER_SUM_NEGATIVE_CACHE.size > this.USER_SUM_NEGATIVE_MAX_ENTRIES || this._negativeUserSumCacheWrites === 0) {
                this.pruneNegativeUserSumCache(cached.ts);
            } else {
                this.setRuntimeDiagnosticGauge('filter.negativeUserSumCache.size', this.USER_SUM_NEGATIVE_CACHE.size);
            }
            return cached;
        },
        async getUserPostCommentSum(uid) {
            if (userSumCache[uid]) return userSumCache[uid];
            if (this.getNegativeUserSumCache(uid)) return null;
            if (this.INFLIGHT_USER_SUM_REQUESTS[uid]) return this.INFLIGHT_USER_SUM_REQUESTS[uid];
            const getCookie = (name) => { const v = `; ${document.cookie}`; const p = v.split(`; ${name}=`); if (p.length === 2) return p.pop().split(';').shift(); };
            let ci = getCookie(this.CONSTANTS.ETC.COOKIE_NAME_1) || getCookie(this.CONSTANTS.ETC.COOKIE_NAME_2);
            if (!ci) return null;
            const taskQueue = this.getUserSumTaskQueue();
            const requestPromise = taskQueue.enqueue(() => new Promise((resolve) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', this.CONSTANTS.API.USER_INFO, true); xhr.withCredentials = true;
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8'); xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');


                xhr.timeout = 5000;
                xhr.ontimeout = () => {
                    console.warn(`DCinside User Filter: User info request for UID ${uid} timed out.`);
                    this.setNegativeUserSumCache(uid, 'timeout');
                    resolve(null);
                };


                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const [post, comment] = xhr.responseText.split(',').map(x => parseInt(x, 10));
                        if (!isNaN(post) && !isNaN(comment)) {
                            const d = { sum: post + comment, post, comment };
                            userSumCache[uid] = d;
                            this.USER_SUM_NEGATIVE_CACHE.delete(uid);
                            resolve(d);
                        } else {
                            this.setNegativeUserSumCache(uid, 'parse');
                            resolve(null);
                        }
                    } else {
                        this.setNegativeUserSumCache(uid, `status:${xhr.status}`);
                        resolve(null);
                    }
                };
                xhr.onerror = () => {
                    this.setNegativeUserSumCache(uid, 'network');
                    resolve(null);
                };
                xhr.send(`ci_t=${encodeURIComponent(ci)}&user_id=${encodeURIComponent(uid)}`);
            }));
            this.INFLIGHT_USER_SUM_REQUESTS[uid] = requestPromise;
            try {
                return await requestPromise;
            } finally {
                delete this.INFLIGHT_USER_SUM_REQUESTS[uid];
            }
        },
        async addBlockedUid(uid, sum, post, comment, ratioBlocked) {
            if (!uid) return;
            if (!this.isMobile()) {
                await this.refreshBlockedUidsCache();
            }
            const nextEntry = { ts: Date.now(), sum, post, comment, ratioBlocked: !!ratioBlocked };
            const currentEntry = this.BLOCKED_UIDS_CACHE[uid];
            if (currentEntry
                && currentEntry.sum === nextEntry.sum
                && currentEntry.post === nextEntry.post
                && currentEntry.comment === nextEntry.comment
                && currentEntry.ratioBlocked === nextEntry.ratioBlocked) {
                return;
            }
            this.BLOCKED_UIDS_CACHE[uid] = nextEntry;
            if (!this.isMobile()) {
                await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCKED_UIDS, JSON.stringify(this.BLOCKED_UIDS_CACHE));
                return;
            }
            const serializedCache = JSON.stringify(this.BLOCKED_UIDS_CACHE);
            const previousWrite = this._blockedUidWritePromise || Promise.resolve();
            const writePromise = previousWrite
                .catch(() => {})
                .then(() => GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCKED_UIDS, serializedCache));
            this._blockedUidWritePromise = writePromise;
            try {
                await writePromise;
            } finally {
                if (this._blockedUidWritePromise === writePromise) this._blockedUidWritePromise = null;
            }
        },
        async getBlockedGuests() { try { return JSON.parse(await GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCKED_GUESTS, '[]')); } catch { return []; } },
        async setBlockedGuests(list) { await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCKED_GUESTS, JSON.stringify(list)); },
        async addBlockedGuest(ip) {
            if (!ip) return;
            if (!(dcFilterSettings.blockedGuestSet instanceof Set)) {
                dcFilterSettings.blockedGuestSet = new Set(Array.isArray(dcFilterSettings.blockedGuests) ? dcFilterSettings.blockedGuests : []);
            }
            if (dcFilterSettings.blockedGuestSet.has(ip)) return;
            if (!Array.isArray(dcFilterSettings.blockedGuests)) dcFilterSettings.blockedGuests = [];
            dcFilterSettings.blockedGuests.push(ip);
            dcFilterSettings.blockedGuestSet.add(ip);
            await this.setBlockedGuests(dcFilterSettings.blockedGuests);
        },
        async clearBlockedGuests() {
            dcFilterSettings.blockedGuests = [];
            dcFilterSettings.blockedGuestSet = new Set();
            await this.setBlockedGuests([]);
        },
        isUserBlocked({ sum, post, comment }) {
            return DCUF_SHARED_FILTER_CORE.evaluateUserStatsBlock({ sum, post, comment }, dcFilterSettings);
        },
        isUserStatsFilterActive(settings = dcFilterSettings) {
            if (!settings || settings.masterDisabled) return false;

            const threshold = Number(settings.threshold);
            if (Number.isFinite(threshold) && threshold > 0) return true;
            if (!settings.ratioEnabled) return false;

            return [settings.ratioMin, settings.ratioMax].some((value) => {
                const numeric = Number(value);
                return Number.isFinite(numeric) && numeric > 0;
            });
        },
        isCommentListItem(element) {
            return element instanceof HTMLElement && !!element.closest(this.CONSTANTS.SELECTORS.COMMENT_CONTAINER);
        },
        setElementVisibility(element, shouldHide) {
            if (!(element instanceof HTMLElement)) return;
            if (element.hasAttribute('data-dcuf-parent-filtered')) {
                element.removeAttribute('data-dcuf-parent-filtered');
            }
            if (element.hasAttribute('data-dcuf-parent-placeholder')) {
                element.removeAttribute('data-dcuf-parent-placeholder');
            }
            if (element.classList.contains('dcuf-parent-comment-filtered')) {
                element.classList.remove('dcuf-parent-comment-filtered');
            }
            if (this.isCommentListItem(element)) {
                const stalePlaceholder = element.querySelector(':scope > .dcuf-comment-placeholder');
                if (stalePlaceholder instanceof HTMLElement) stalePlaceholder.remove();
            }
            const nextDisplay = shouldHide ? 'none' : '';
            if (element.style.display !== nextDisplay) element.style.display = nextDisplay;
        },
        async applyBlockFilterToElement(element, uid, userData, addBlockedUidFn) {
            if (!userData || !(element instanceof HTMLElement) || !element.isConnected) return;
            const { sumBlocked, ratioBlocked } = this.isUserBlocked(userData);
            const shouldBeBlocked = sumBlocked || ratioBlocked;
            // UID statistics are an additional blocking reason, not an authority to reveal content.
            // A request can begin before a personal block is saved and resolve afterwards; letting a
            // negative statistics result call setElementVisibility(false) in that race briefly exposes
            // the personally blocked comment and starts a shell-attribute refilter loop.
            if (!shouldBeBlocked && element.getAttribute('data-dcuf-personal-blocked') === '1') {
                this.incrementRuntimeDiagnostic('filter.asyncAllow.suppressedPersonalBlock');
                return;
            }
            this.setElementVisibility(element, shouldBeBlocked);
            if (shouldBeBlocked) await addBlockedUidFn.call(this, uid, userData.sum, userData.post, userData.comment, ratioBlocked);
        },
        shouldSkipFiltering(element) {
            const s = dcFilterSettings; if (!s.excludeRecommended || !this.isRecommendedContext()) return false;
            if (window.location.pathname.includes('/view/')) return !element.closest(this.CONSTANTS.SELECTORS.COMMENT_CONTAINER);
            return true;
        },
        async applyAsyncBlock(target) {
            const descriptor = this.normalizeFilterTarget(target);
            if (!descriptor) return;

            const { element, writerInfo, uid, isNotice, shouldSkipFiltering } = descriptor;
            if (isNotice || shouldSkipFiltering) return;
            if (!this.isUserStatsFilterActive()) return;

            try {
                if (element.style.display === 'none') return;
                if (element.getAttribute('data-dcuf-personal-blocked') === '1') return;
                if (!(writerInfo instanceof HTMLElement)) return;
                if (!uid || uid.length < 3) return;
                if (this.BLOCKED_UIDS_CACHE[uid]) return;
                const userData = await this.getUserPostCommentSum(uid); if (!userData) return;
                await this.applyBlockFilterToElement(element, uid, userData, this.addBlockedUid);
            } catch (e) { console.warn(`DCinside User Filter: Async filter exception.`, e, element); }
        },
        async refreshBlockedUidsCache(rawValue = null) {
            let data; try { data = JSON.parse(rawValue === null ? await GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCKED_UIDS, '{}') : rawValue); } catch { data = {}; }
            let changed = false;
            if (!data || typeof data !== 'object' || Array.isArray(data)) {
                data = {};
                changed = true;
            }
            const now = Date.now();
            for (const [uid, cacheData] of Object.entries(data)) {
                if (typeof cacheData !== 'object' || cacheData === null || typeof cacheData.ts !== 'number' || now - cacheData.ts > this.BLOCK_UID_EXPIRE) { delete data[uid]; changed = true; }
            }
            this.BLOCKED_UIDS_CACHE = data;
            if (changed) await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCKED_UIDS, JSON.stringify(this.BLOCKED_UIDS_CACHE));
        },
        applySyncBlock(target) {
            const descriptor = this.normalizeFilterTarget(target);
            if (!descriptor?.writerInfo) return;

            const {
                masterDisabled,
                blockGuestEnabled,
                proxyBlockMode = 0,
                telecomBlockEnabled,
                blockedGuests = [],
                blockedGuestSet,
                customIpPrefixSet,
                personalBlockEnabled,
                personalBlockUidSet,
                personalBlockNicknameSet,
                personalBlockIpSet
            } = dcFilterSettings;
            const normalizedProxyBlockMode = this.normalizeProxyBlockMode(proxyBlockMode);
            const proxyBlockEnabled = normalizedProxyBlockMode !== this.PROXY_MODE.OFF;

            const { element, uid, nickname, ip, ipText, writerDataIp, ipPrefix, isGuest, isNotice, shouldSkipFiltering, hasBlockDisableClass } = descriptor;
            const subject = {
                uid,
                nickname,
                ip,
                ipPrefix,
                isGuest,
                isNotice,
                shouldSkipFiltering,
                hasBlockDisableClass
            };
            const baseDebug = this.DEBUG_ENABLED ? {
                branch: 'sync-base',
                uid,
                nickname,
                ip,
                ipText,
                writerDataIp,
                ipPrefix,
                isGuest,
                blockGuestEnabled,
                proxyBlockMode: normalizedProxyBlockMode,
                proxyBlockEnabled,
                telecomBlockEnabled
            } : null;

            const proxyMatchInfo = this.getProxyPrefixMatch(ipPrefix, normalizedProxyBlockMode);
            const telecomPrefixSet = telecomBlockEnabled && ipPrefix ? this.getTelecomPrefixSet() : null;
            const decision = DCUF_SHARED_FILTER_CORE.evaluateSyncBlockDecision({
                subject,
                settings: {
                    masterDisabled,
                    blockGuestEnabled,
                    proxyBlockMode: normalizedProxyBlockMode,
                    telecomBlockEnabled,
                    customIpPrefixSet,
                    personalBlockEnabled,
                    threshold: dcFilterSettings.threshold,
                    ratioEnabled: dcFilterSettings.ratioEnabled,
                    ratioMin: dcFilterSettings.ratioMin,
                    ratioMax: dcFilterSettings.ratioMax
                },
                matches: {
                    personalBlockHit: personalBlockEnabled && DCUF_SHARED_FILTER_CORE.isPersonalBlockHit(subject, {
                        uidSet: personalBlockUidSet,
                        nicknameSet: personalBlockNicknameSet,
                        ipSet: personalBlockIpSet
                    }),
                    hasCustomIpPrefixBlock: Boolean(customIpPrefixSet && customIpPrefixSet.size > 0 && ipPrefix && customIpPrefixSet.has(ipPrefix)),
                    proxyMatchInfo,
                    telecomPrefixMatch: Boolean(ipPrefix && telecomPrefixSet && telecomPrefixSet.has(ipPrefix)),
                    blockedGuestMatch: Boolean(ip && (blockedGuestSet instanceof Set ? blockedGuestSet.has(ip) : blockedGuests.includes(ip)))
                },
                blockedUidEntry: uid ? (this.BLOCKED_UIDS_CACHE[uid] || userSumCache[uid] || null) : null
            });
            const allowPersonalBlockReveal = Boolean(this._syncPassOptions?.allowPersonalBlockReveal);
            const wasPersonallyBlocked = element.getAttribute('data-dcuf-personal-blocked') === '1';

            if (decision.path === 'personal-block') {
                element.setAttribute('data-dcuf-personal-blocked', '1');
            } else if (decision.isBlocked) {
                element.removeAttribute('data-dcuf-personal-blocked');
            } else if (wasPersonallyBlocked && this.isCommentListItem(element) && !allowPersonalBlockReveal) {
                // Reply-merge / comment-stabilization passes can temporarily rebuild comment UI in a
                // state where personal-block metadata is not reliable yet. Keep already personal-blocked
                // comments hidden until a full refilter with refreshed settings explicitly reveals them.
                if (this.DEBUG_ENABLED) {
                    this.debugDecision(element, {
                        ...baseDebug,
                        branch: 'personal-block-hold',
                        isBlocked: true,
                        reasons: ['personalBlock-hold']
                    });
                }
                this.setElementVisibility(element, true);
                return;
            } else {
                element.removeAttribute('data-dcuf-personal-blocked');
            }

            if (this.DEBUG_ENABLED) {
                this.debugDecision(element, {
                    ...baseDebug,
                    branch: decision.path || 'sync-final',
                    isBlocked: decision.isBlocked,
                    reasons: decision.reasons,
                    blockedGuestsCount: blockedGuestSet instanceof Set ? blockedGuestSet.size : blockedGuests.length,
                    customIpPrefixCount: customIpPrefixSet instanceof Set ? customIpPrefixSet.size : 0,
                    hasCustomIpPrefixBlock: decision.hasCustomIpPrefixBlock,
                    proxyPrefixMatch: decision.proxyPrefixMatch,
                    proxyMatchTier: decision.proxyMatchTier,
                    telecomPrefixMatch: decision.telecomPrefixMatch,
                    blockedGuestMatch: decision.blockedGuestMatch
                });
            }
            this.setElementVisibility(element, decision.isBlocked);
        },
        initializeUniversalObserver() {
            const pageContext = window.__dcufPageContext || {};
            const targets = [];
            if (pageContext.hasListSurface) {
                targets.push(
                    { c: this.CONSTANTS.SELECTORS.POST_LIST_CONTAINER, i: this.CONSTANTS.SELECTORS.POST_ITEM, scope: 'posts' },
                    { c: this.CONSTANTS.SELECTORS.POST_VIEW_LIST_CONTAINER, i: 'li', scope: 'posts' }
                );
            }
            if (pageContext.hasComments) {
                targets.push({ c: this.CONSTANTS.SELECTORS.COMMENT_CONTAINER, i: this.CONSTANTS.SELECTORS.COMMENT_ITEM, scope: 'comments' });
            }
            if (targets.length === 0) return;
            const filterItems = (items) => this.applyFilterItems(items);
            const queueFilterItems = (items) => this.queueObservedFilterItems(items);
            const runtimeCoordinator = this.getRuntimeCoordinator();
            const hasRuntimeMutationBus = runtimeCoordinator && typeof runtimeCoordinator.subscribeMutations === 'function';
            const attachObserver = (container, itemSelector, { attachDomObserver = true } = {}) => {
                if (container.hasAttribute(this.CONSTANTS.CUSTOM_ATTRS.OBSERVER_ATTACHED)) return;
                container.setAttribute(this.CONSTANTS.CUSTOM_ATTRS.OBSERVER_ATTACHED, 'true');
                filterItems(Array.from(container.querySelectorAll(itemSelector)));
                if (!attachDomObserver) return;
                // [디버깅 추가]
                new MutationObserver(mutations => {
                    const newItems = [];
                    mutations.forEach(m => m.addedNodes.forEach(n => {
                        if (n.nodeType !== 1) return;
                        if (n.matches(itemSelector)) newItems.push(n); else if (n.querySelectorAll) newItems.push(...n.querySelectorAll(itemSelector));
                    }));
                    if (newItems.length > 0) queueFilterItems(newItems);
                }).observe(container, { childList: true, subtree: true });
            };
            targets.forEach(t => document.querySelectorAll(t.c).forEach(c => attachObserver(c, t.i, { attachDomObserver: !hasRuntimeMutationBus })));

            if (hasRuntimeMutationBus) {
                if (typeof this._runtimeMutationUnsubscribe === 'function') this._runtimeMutationUnsubscribe();
                if (typeof this._runtimeImmediateMutationUnsubscribe === 'function') this._runtimeImmediateMutationUnsubscribe();
                if (typeof runtimeCoordinator.subscribeImmediateMutations === 'function') {
                    this._runtimeImmediateMutationUnsubscribe = runtimeCoordinator.subscribeImmediateMutations(
                        'filter-immediate-comment-visibility',
                        (payload) => this.applyImmediateCommentMutations(payload),
                        { contexts: ['comments'] }
                    );
                }
                this._runtimeMutationUnsubscribe = runtimeCoordinator.subscribeMutations('filter-universal-observer', (payload) => {
                    let hasRelevantMutation = false;
                    let hasCommentMutation = false;
                    targets.forEach((target) => {
                        const changedContainers = payload.collectMatches(target.c);
                        changedContainers.forEach((container) => attachObserver(container, target.i, { attachDomObserver: false }));
                        const changedItems = this.collectMutationFilterItems(payload, target.c, target.i, {
                            attributeNames: ['class', 'id', 'data-uid', 'data-nick', 'data-ip'],
                            includeChildListTargets: true
                        });
                        if (changedContainers.length > 0 || changedItems.length > 0) {
                            hasRelevantMutation = true;
                            if (target.scope === 'comments') hasCommentMutation = true;
                        }
                        if (changedItems.length > 0) queueFilterItems(changedItems);
                    });
                    if (hasRelevantMutation) this.markRelevantMutation(hasCommentMutation ? 'comments' : 'all');
                }, { contexts: ['list-surface'] });
                return;
            }

            const mainContainer = document.querySelector(this.CONSTANTS.SELECTORS.MAIN_CONTAINER);
            const observerTarget = mainContainer || document.body;
            const bodyObserver = new MutationObserver(mutations => {
                mutations.forEach(m => m.addedNodes.forEach(n => {
                    if (n.parentNode && n.parentNode.closest && (n.parentNode.closest('#dc-backup-popup') || n.parentNode.closest('#dc-block-management-panel') || n.parentNode.closest('#dcinside-filter-setting'))) {
                        return;
                    }
                    if (n.nodeType === 1 && !n.closest('.user_data')) {
                        targets.forEach(t => {
                            if (n.matches(t.c)) attachObserver(n, t.i);
                            else if (n.querySelectorAll) n.querySelectorAll(t.c).forEach(c => attachObserver(c, t.i));
                        });
                    }
                }));
            });
            bodyObserver.observe(observerTarget, { childList: true, subtree: true });
        },
        loadBootSnapshot() {
            if (this._bootSnapshotPromise) return this._bootSnapshotPromise;
            const keys = this.CONSTANTS.STORAGE_KEYS;
            this._bootSnapshotPromise = Promise.all([
                GM_getValue(keys.BLOCK_CONFIG_MIGRATION_V275_DONE, false),
                GM_getValue(keys.MASTER_DISABLED, false),
                GM_getValue(keys.EXCLUDE_RECOMMENDED, false),
                GM_getValue(keys.THRESHOLD),
                GM_getValue(keys.RATIO_ENABLED, false),
                GM_getValue(keys.RATIO_MIN, ''),
                GM_getValue(keys.RATIO_MAX, ''),
                GM_getValue(keys.BLOCK_GUEST, false),
                GM_getValue(keys.BLOCK_PROXY, 0),
                GM_getValue(keys.BLOCK_TELECOM, false),
                GM_getValue(keys.BLOCKED_GUESTS, '[]'),
                GM_getValue(keys.BLOCK_CONFIG, {}),
                GM_getValue(keys.PERSONAL_BLOCK_LIST, { uids: [], nicknames: [], ips: [] }),
                GM_getValue(keys.PERSONAL_BLOCK_ENABLED, true),
                GM_getValue(keys.BLOCKED_UIDS, '{}')
            ]).then((values) => {
                const [
                    migrationDone, masterDisabled, excludeRecommended, rawThreshold, ratioEnabled,
                    ratioMin, ratioMax, blockGuestEnabled, proxyBlockMode, telecomBlockEnabled,
                    blockedGuestsRaw, blockConfig, personalBlockList, personalBlockEnabled, blockedUidsRaw
                ] = values;
                let blockedGuests = [];
                try { blockedGuests = JSON.parse(blockedGuestsRaw); } catch { blockedGuests = []; }
                const snapshot = {
                    migrationDone,
                    masterDisabled,
                    excludeRecommended,
                    threshold: rawThreshold === undefined ? 0 : rawThreshold,
                    thresholdMissing: rawThreshold === undefined,
                    ratioEnabled,
                    ratioMin,
                    ratioMax,
                    blockGuestEnabled,
                    proxyBlockMode,
                    telecomBlockEnabled,
                    blockedGuests: Array.isArray(blockedGuests) ? blockedGuests : [],
                    blockConfig,
                    personalBlockList,
                    personalBlockEnabled,
                    blockedUidsRaw
                };
                this._bootSnapshot = snapshot;
                window.__dcufBootController?.note?.('boot.storage-snapshot', { keys: values.length });
                return snapshot;
            }).catch((error) => {
                this._bootSnapshotPromise = null;
                throw error;
            });
            return this._bootSnapshotPromise;
        },
        getBootSnapshot() {
            return this._bootSnapshot || null;
        },
        async reloadSettings(snapshot = null) {
            let values;
            if (snapshot) {
                values = [
                    snapshot.masterDisabled, snapshot.excludeRecommended, snapshot.threshold,
                    snapshot.ratioEnabled, snapshot.ratioMin, snapshot.ratioMax,
                    snapshot.blockGuestEnabled, snapshot.proxyBlockMode, snapshot.telecomBlockEnabled,
                    snapshot.blockedGuests, snapshot.blockConfig, snapshot.personalBlockList,
                    snapshot.personalBlockEnabled
                ];
            } else {
                values = await Promise.all([
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.MASTER_DISABLED, false),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.EXCLUDE_RECOMMENDED, false),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.THRESHOLD, 0),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.RATIO_ENABLED, false),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.RATIO_MIN, ''),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.RATIO_MAX, ''),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_GUEST, false),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_PROXY, 0),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_TELECOM, false),
                    this.getBlockedGuests(),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG, {}),
                    PersonalBlockModule.loadPersonalBlocks(),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.PERSONAL_BLOCK_ENABLED, true)
                ]);
            }
            const [
                masterDisabled, excludeRecommended, threshold, ratioEnabled,
                ratioMin, ratioMax, blockGuestEnabled, proxyBlockMode, telecomBlockEnabled,
                blockedGuests, blockConfig, personalBlockList, personalBlockEnabled
            ] = values;
            const normalizedSettings = DCUF_SHARED_STORAGE.normalizeStoredFilterSettings({
                [this.CONSTANTS.STORAGE_KEYS.MASTER_DISABLED]: masterDisabled,
                [this.CONSTANTS.STORAGE_KEYS.EXCLUDE_RECOMMENDED]: excludeRecommended,
                [this.CONSTANTS.STORAGE_KEYS.THRESHOLD]: threshold,
                [this.CONSTANTS.STORAGE_KEYS.RATIO_ENABLED]: ratioEnabled,
                [this.CONSTANTS.STORAGE_KEYS.RATIO_MIN]: ratioMin,
                [this.CONSTANTS.STORAGE_KEYS.RATIO_MAX]: ratioMax,
                [this.CONSTANTS.STORAGE_KEYS.BLOCK_GUEST]: blockGuestEnabled,
                [this.CONSTANTS.STORAGE_KEYS.BLOCK_PROXY]: proxyBlockMode,
                [this.CONSTANTS.STORAGE_KEYS.BLOCK_TELECOM]: telecomBlockEnabled,
                [this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG]: blockConfig,
                [this.CONSTANTS.STORAGE_KEYS.PERSONAL_BLOCK_LIST]: personalBlockList,
                [this.CONSTANTS.STORAGE_KEYS.PERSONAL_BLOCK_ENABLED]: personalBlockEnabled
            });
            const customIpPrefixSet = new Set(DCUF_SHARED_STORAGE.parseIpPrefixList(blockConfig?.ip || '', this.CONSTANTS.ETC.MOBILE_IP_MARKER));
            const blockedGuestSet = this.buildLookupSet(blockedGuests);
            const personalBlockUidSet = this.buildLookupSet(personalBlockList?.uids, (item) => item?.id);
            const personalBlockNicknameSet = this.buildLookupSet(personalBlockList?.nicknames);
            const personalBlockIpSet = this.buildLookupSet(personalBlockList?.ips);
            dcFilterSettings = {
                masterDisabled: normalizedSettings.masterDisabled,
                excludeRecommended: normalizedSettings.excludeRecommended,
                threshold: normalizedSettings.threshold,
                ratioEnabled: normalizedSettings.ratioEnabled,
                ratioMin: normalizedSettings.ratioMin,
                ratioMax: normalizedSettings.ratioMax,
                blockGuestEnabled: normalizedSettings.blockGuest,
                proxyBlockMode: normalizedSettings.proxyBlockMode,
                proxyBlockEnabled: normalizedSettings.proxyBlockMode !== this.PROXY_MODE.OFF,
                telecomBlockEnabled: normalizedSettings.telecomBlockEnabled,
                blockedGuests,
                blockedGuestSet,
                customIpPrefixSet,
                personalBlockList,
                personalBlockUidSet,
                personalBlockNicknameSet,
                personalBlockIpSet,
                personalBlockEnabled
            };
            if (this.DEBUG_ENABLED) {
                this.debugLog('settings', 'reloadSettings complete', this.debugSettingsSnapshot({
                    rawBlockConfigIp: typeof blockConfig?.ip === 'string' ? blockConfig.ip : '',
                    rawBlockConfigPreview: typeof blockConfig?.ip === 'string' ? blockConfig.ip.split('||').slice(0, 20) : []
                }));
            }
            return dcFilterSettings;
        },
        getRefilterTargetSelectors(scope = 'all') {
            const commentSelectors = [
                this.CONSTANTS.SELECTORS.COMMENT_ITEM,
                'li[id^="comment_li_"]',
                'li[id^="reply_li_"]',
                'li[id^="img_comment_li_"]',
                'li[id^="mg_comment_li_"]'
            ];
            const postSelectors = [
                this.CONSTANTS.SELECTORS.POST_ITEM,
                `${this.CONSTANTS.SELECTORS.POST_VIEW_LIST_CONTAINER} > li`
            ];

            if (scope === 'comments') return commentSelectors;
            if (scope === 'posts') return postSelectors;
            return [...postSelectors, ...commentSelectors];
        },
        resolveRefilterRoot(root = document) {
            if (root instanceof Document || root instanceof Element || root instanceof DocumentFragment) return root;
            return document;
        },
        getRefilterTargets(scope = 'all', root = document) {
            const queryRoot = this.resolveRefilterRoot(root);
            const selectors = this.getRefilterTargetSelectors(scope);
            const selectorText = selectors.join(', ');
            const seen = new Set();
            const candidates = [];

            if (queryRoot instanceof Element && queryRoot.matches(selectorText)) candidates.push(queryRoot);
            if (typeof queryRoot.querySelectorAll === 'function') {
                candidates.push(...queryRoot.querySelectorAll(selectorText));
            }

            return candidates.reduce((descriptors, element) => {
                if (!(element instanceof HTMLElement) || seen.has(element)) return descriptors;
                seen.add(element);
                const descriptor = this.describeFilterTarget(element);
                if (descriptor) descriptors.push(descriptor);
                return descriptors;
            }, []);
        },
        runSyncRefilterPass(scope = 'all', root = document, descriptors = null, options = null) {
            const runtimeCoordinator = this.getRuntimeCoordinator();
            const measureDuration = Boolean(runtimeCoordinator?._diagnosticsEnabled) && typeof performance?.now === 'function';
            const startedAt = measureDuration ? performance.now() : 0;
            const targetDescriptors = Array.isArray(descriptors) ? descriptors : this.getRefilterTargets(scope, root);
            const previousSyncPassOptions = this._syncPassOptions;
            this._syncPassOptions = options && typeof options === 'object' ? options : null;
            try {
                this.applySyncToDescriptors(targetDescriptors, { resetDisplay: true });
            } finally {
                this._syncPassOptions = previousSyncPassOptions;
            }
            this.incrementRuntimeDiagnostic(`filter.syncPass.${scope}.runs`);
            this.setRuntimeDiagnosticGauge(`filter.syncPass.${scope}.lastTargetCount`, targetDescriptors.length);
            if (measureDuration) {
                this.setRuntimeDiagnosticGauge(`filter.syncPass.${scope}.lastDurationMs`, Math.round((performance.now() - startedAt) * 1000) / 1000);
            }
            return targetDescriptors;
        },
        scheduleSyncRefilterPasses(scope = 'all', root = document) {
            if (this._syncRefilterRafId) cancelAnimationFrame(this._syncRefilterRafId);
            if (!this._syncRefilterTimerIds) this._syncRefilterTimerIds = new Set();
            this._syncRefilterTimerIds.forEach((timerId) => clearTimeout(timerId));
            this._syncRefilterTimerIds.clear();

            const runtimeCoordinator = this.getRuntimeCoordinator();
            const hasRuntimeMutationBus = Boolean(runtimeCoordinator && typeof runtimeCoordinator.subscribeMutations === 'function');
            let lastGeneration = this.getRelevantMutationGeneration(scope);
            const rerun = (phase, { force = false } = {}) => {
                const generation = this.getRelevantMutationGeneration(scope);
                if (!force && hasRuntimeMutationBus && generation === lastGeneration) {
                    this.incrementRuntimeDiagnostic(`filter.syncPass.${scope}.skippedUnchanged`);
                    return;
                }
                this.runSyncRefilterPass(scope, root);
                lastGeneration = this.getRelevantMutationGeneration(scope);
                this.setRuntimeDiagnosticGauge(`filter.syncPass.${scope}.lastPhase`, phase);
            };
            this._syncRefilterRafId = requestAnimationFrame(() => {
                this._syncRefilterRafId = 0;
                rerun('raf', { force: true });
            });
            [90, 220].forEach((delay) => {
                const timerId = window.setTimeout(() => {
                    this._syncRefilterTimerIds.delete(timerId);
                    rerun(`delay:${delay}`);
                }, delay);
                this._syncRefilterTimerIds.add(timerId);
            });
        },
        scheduleCommentStabilizedRefilter(reason = 'comment-stabilized', roots = null) {
            if (this._commentRefilterRafId) cancelAnimationFrame(this._commentRefilterRafId);
            if (!this._commentRefilterTimerIds) this._commentRefilterTimerIds = new Set();
            this._commentRefilterTimerIds.forEach((timerId) => clearTimeout(timerId));
            this._commentRefilterTimerIds.clear();

            const requestedRoots = roots && typeof roots[Symbol.iterator] === 'function'
                ? Array.from(roots)
                : (roots ? [roots] : [document]);
            this.debugLog('comment-refilter', 'scheduleCommentStabilizedRefilter', { reason, rootCount: requestedRoots.length });
            this._commentRefilterRafId = requestAnimationFrame(() => {
                this._commentRefilterRafId = 0;
                const descriptors = [];
                const seenElements = new Set();
                requestedRoots.forEach((root) => {
                    if (root instanceof Element && !root.isConnected) return;
                    this.getRefilterTargets('comments', this.resolveRefilterRoot(root)).forEach((descriptor) => {
                        if (!descriptor?.element || seenElements.has(descriptor.element)) return;
                        seenElements.add(descriptor.element);
                        descriptors.push(descriptor);
                    });
                });
                if (descriptors.length === 0) {
                    this.incrementRuntimeDiagnostic('filter.syncPass.comments.skippedEmptyRoots');
                    return;
                }
                this.runSyncRefilterPass('comments', document, descriptors);
                this.setRuntimeDiagnosticGauge('filter.syncPass.comments.lastPhase', 'raf:root-scoped');
                this.setRuntimeDiagnosticGauge('filter.syncPass.comments.lastRootCount', requestedRoots.length);
            });
        },
        async runFullRefilterPass(reason = 'refilterAllContent', { scheduleFollowups = true } = {}) {
            await this.reloadSettings();
            const descriptors = this.getRefilterTargets('all');
            this.startDebugPass(reason, { targetCount: descriptors.length });
            this.runSyncRefilterPass('all', document, descriptors, {
                allowPersonalBlockReveal: true
            });
            if (scheduleFollowups) this.scheduleSyncRefilterPasses();
            this.applyAsyncToDescriptors(descriptors);
            this.incrementRuntimeDiagnostic('filter.fullRefilter.runs');
            this.setRuntimeDiagnosticGauge('filter.fullRefilter.lastTargetCount', descriptors.length);
            document.dispatchEvent(new CustomEvent('dcFilterRefiltered'));
        },
        async refilterAllContent(reason = 'refilterAllContent', { scheduleFollowups = true } = {}) {
            if (!this._pendingFullRefilterReasons) this._pendingFullRefilterReasons = [];
            this._pendingFullRefilterReasons.push({ reason, scheduleFollowups });

            if (this._refilterAllContentRunning) {
                this.debugLog('refilter', 'coalesced full refilter request', {
                    reason,
                    pendingCount: this._pendingFullRefilterReasons.length
                });
                return this._refilterAllContentPromise;
            }

            this._refilterAllContentRunning = true;
            this._refilterAllContentPromise = (async () => {
                while (this._pendingFullRefilterReasons.length > 0) {
                    const pendingRequests = this._pendingFullRefilterReasons.splice(0);
                    const lastRequest = pendingRequests[pendingRequests.length - 1];
                    const runReason = pendingRequests.length > 1
                        ? `${lastRequest.reason} [coalesced:${pendingRequests.length}]`
                        : lastRequest.reason;
                    const shouldScheduleFollowups = pendingRequests.some((request) => request.scheduleFollowups !== false);
                    await this.runFullRefilterPass(runReason, { scheduleFollowups: shouldScheduleFollowups });
                }
            })();

            try {
                await this._refilterAllContentPromise;
            } finally {
                this._refilterAllContentRunning = false;
                this._refilterAllContentPromise = null;
            }
        },
        // [수정] handleVisibilityChange를 async 함수로 변경하고 reloadShortcutKey 호출 추가
        async handleVisibilityChange() {
            if (document.visibilityState === 'visible') {
                await reloadShortcutKey(); // 단축키 설정을 다시 로드
                await this.refilterAllContent('visibilitychange-visible', { scheduleFollowups: false }); // 복구 패스 1회는 유지하고 무변화 지연 패스는 생략
            }
        },
        init() {
            if (this._initState === 'ready') return Promise.resolve('already-ready');
            if (this._initState === 'initializing' && this._initPromise) return this._initPromise;
            this._initState = 'initializing';
            this._initPromise = (async () => {
                this.installDebugApi();
                this.debugLog('init', 'FilterModule init start', { version: '3.4.5-beta' });
                const snapshot = await this.loadBootSnapshot();
                await this.cleanupLegacyManagedBlockConfig(snapshot);
                await this.reloadSettings(snapshot);
                await this.refreshBlockedUidsCache(snapshot.blockedUidsRaw);
                if (!this._visibilityChangeHandler) {
                    this._visibilityChangeHandler = () => this.handleVisibilityChange();
                    document.addEventListener('visibilitychange', this._visibilityChangeHandler);
                }
                this.initializeUniversalObserver();
                window.__dcufBootController?.note?.('boot.local-filter-settings-ready');
                if (snapshot.thresholdMissing) {
                    const showFirstRunSettings = async () => {
                        await GM_setValue(this.CONSTANTS.STORAGE_KEYS.THRESHOLD, 0);
                        await this.showSettings();
                    };
                    const bootController = window.__dcufBootController;
                    if (typeof bootController?.onReady === 'function') bootController.onReady(showFirstRunSettings);
                    else queueMicrotask(showFirstRunSettings);
                }
                this._initState = 'ready';
                return 'ready';
            })().catch((error) => {
                this._initState = 'failed';
                this._initPromise = null;
                throw error;
            });
            return this._initPromise;
        }
    };

    // post-main-fixes.js는 별도 IIFE 스코프라 FilterModule 심볼을 직접 못 잡을 수 있습니다.
    // 유지보수 시 후처리 코드가 FilterModule을 참조해야 하면 이 브리지로 접근하세요.
    window.__dcufFilterModule = FilterModule;
    /**
     * =================================================================
     * =================== Personal Block Module =======================
     * =================================================================
     */
    const PersonalBlockModule = {
        isSelectionMode: false,
        personalBlockListCache: { uids: [], nicknames: [], ips: [] },
        fabScalePercent: 100,
        _initState: 'idle',
        _initPromise: null,
        _uiMounted: false,
        _selectionClickHandler: null,
        FAB_SCALE_MIN: 60,
        FAB_SCALE_MAX: 160,


        async init(snapshot = null, { deferUi = false } = {}) {
            if (this._initState === 'ready') return 'already-ready';
            if (this._initState === 'initializing' && this._initPromise) return this._initPromise;
            this._initState = 'initializing';
            this._initPromise = (async () => {
                const list = snapshot?.personalBlockList || await this.loadPersonalBlocks();
                this.personalBlockListCache = {
                    uids: Array.isArray(list?.uids) ? list.uids : [],
                    nicknames: Array.isArray(list?.nicknames) ? list.nicknames : [],
                    ips: Array.isArray(list?.ips) ? list.ips : []
                };
                const mountUi = async () => {
                    if (this._uiMounted) return;
                    this.fabScalePercent = await this.loadFabScalePercent();
                    this.createFab();
                    if (!this._selectionClickHandler) {
                        this._selectionClickHandler = this.handleSelectionClick.bind(this);
                        document.addEventListener('click', this._selectionClickHandler, true);
                    }
                    this._uiMounted = true;
                };
                if (deferUi && typeof window.__dcufBootController?.onReady === 'function') {
                    window.__dcufBootController.onReady(() => mountUi().catch((error) => console.warn('[DCUF] deferred FAB mount failed:', error)));
                } else {
                    await mountUi();
                }
                this._initState = 'ready';
                return 'ready';
            })();
            try {
                return await this._initPromise;
            } catch (error) {
                this._initState = 'failed';
                this._initPromise = null;
                throw error;
            }
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

        normalizeFabScalePercent(value) {
            const numeric = Number(value);
            if (!Number.isFinite(numeric)) return 100;
            return Math.max(this.FAB_SCALE_MIN, Math.min(this.FAB_SCALE_MAX, Math.round(numeric)));
        },

        async loadFabScalePercent() {
            const stored = await GM_getValue(FilterModule.CONSTANTS.STORAGE_KEYS.FAB_SCALE_PERCENT, 100);
            return this.normalizeFabScalePercent(stored);
        },

        clampFabPosition() {
            const controls = document.getElementById('dc-personal-block-controls');
            if (!controls) return;
            const currentLeft = Number.parseFloat(controls.style.left);
            const currentTop = Number.parseFloat(controls.style.top);
            if (!Number.isFinite(currentLeft) || !Number.isFinite(currentTop)) return;
            const maxX = Math.max(0, window.innerWidth - controls.offsetWidth);
            const maxY = Math.max(0, window.innerHeight - controls.offsetHeight);
            controls.style.left = `${Math.round(Math.max(0, Math.min(currentLeft, maxX)))}px`;
            controls.style.top = `${Math.round(Math.max(0, Math.min(currentTop, maxY)))}px`;
        },

        applyFabScalePercent(value, { clamp = true } = {}) {
            const normalized = this.normalizeFabScalePercent(value);
            this.fabScalePercent = normalized;
            const controls = document.getElementById('dc-personal-block-controls');
            if (!controls) return normalized;
            const ratio = normalized / 100;
            const scaledValue = (base) => `${Number((base * ratio).toFixed(2))}px`;
            controls.style.setProperty('--dcuf-fab-width', scaledValue(152));
            controls.style.setProperty('--dcuf-fab-height', scaledValue(76));
            controls.style.setProperty('--dcuf-fab-padding-x', scaledValue(28));
            controls.style.setProperty('--dcuf-fab-font-size', scaledValue(32));
            this.closeFabDrawer();
            if (clamp) this.clampFabPosition();
            return normalized;
        },

        async showFabScalePanel() {
            window.__dcufEnsureFilterUiStyles?.();
            document.getElementById('dc-personal-block-size-overlay')?.remove();
            const savedPercent = await this.loadFabScalePercent();
            this.applyFabScalePercent(savedPercent);
            if (this.isFabSupportedPage()) this.createFab();

            const overlay = document.createElement('div');
            overlay.id = 'dc-personal-block-size-overlay';
            const panel = document.createElement('div');
            panel.id = 'dc-personal-block-size-panel';
            panel.setAttribute('role', 'dialog');
            panel.setAttribute('aria-modal', 'true');
            panel.setAttribute('aria-labelledby', 'dc-personal-block-size-title');
            panel.innerHTML = `
                <h3 id="dc-personal-block-size-title">메뉴 버튼 크기 조절</h3>
                <p class="dcuf-fab-size-description">버튼과 글자 크기가 같은 비율로 조절됩니다.</p>
                <output class="dcuf-fab-size-value" for="dc-personal-block-size-range">${savedPercent}%</output>
                <input id="dc-personal-block-size-range" type="range" min="${this.FAB_SCALE_MIN}" max="${this.FAB_SCALE_MAX}" step="5" value="${savedPercent}" aria-label="메뉴 버튼 크기 비율">
                <div class="dcuf-fab-size-bounds"><span>${this.FAB_SCALE_MIN}%</span><span>${this.FAB_SCALE_MAX}%</span></div>
                <div class="dcuf-fab-size-actions">
                    <button type="button" data-dcuf-fab-size-action="reset">기본값</button>
                    <button type="button" data-dcuf-fab-size-action="cancel">취소</button>
                    <button type="button" data-dcuf-fab-size-action="save">저장</button>
                </div>
            `;
            overlay.appendChild(panel);
            document.body.appendChild(overlay);

            const range = panel.querySelector('#dc-personal-block-size-range');
            const valueOutput = panel.querySelector('.dcuf-fab-size-value');
            const closePanel = (restoreSaved) => {
                if (restoreSaved) this.applyFabScalePercent(savedPercent);
                document.removeEventListener('keydown', handleKeydown, true);
                overlay.remove();
            };
            const handleKeydown = (event) => {
                if (event.key !== 'Escape') return;
                event.preventDefault();
                closePanel(true);
            };

            range.addEventListener('input', () => {
                const nextPercent = this.applyFabScalePercent(range.value);
                valueOutput.textContent = `${nextPercent}%`;
            });
            panel.querySelector('[data-dcuf-fab-size-action="reset"]').addEventListener('click', () => {
                range.value = '100';
                range.dispatchEvent(new Event('input', { bubbles: true }));
            });
            panel.querySelector('[data-dcuf-fab-size-action="cancel"]').addEventListener('click', () => closePanel(true));
            panel.querySelector('[data-dcuf-fab-size-action="save"]').addEventListener('click', async () => {
                const nextPercent = this.applyFabScalePercent(range.value);
                await GM_setValue(FilterModule.CONSTANTS.STORAGE_KEYS.FAB_SCALE_PERCENT, nextPercent);
                closePanel(false);
            });
            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) closePanel(true);
            });
            document.addEventListener('keydown', handleKeydown, true);
            range.focus();
        },


        async createManualBlockPanel({ initialType = 'nickname', onAdded = null } = {}) {
            window.__dcufEnsureFilterUiStyles?.();
            const existingPanel = document.getElementById('dc-manual-block-panel');
            if (existingPanel) {
                existingPanel.querySelector('#dc-manual-block-value')?.focus();
                return existingPanel;
            }

            const typeConfig = {
                uid: { label: '식별번호', placeholder: '예: user1234', hint: '입력한 식별번호와 정확히 일치하는 작성자를 차단합니다.' },
                nickname: { label: '닉네임', placeholder: '차단할 닉네임을 입력하세요', hint: '대소문자와 공백을 포함해 정확히 같은 닉네임만 차단합니다.' },
                ip: { label: '아이피', placeholder: '예: 123.45 또는 화면에 표시된 IP', hint: '화면에 표시되는 IP 문자열과 정확히 일치할 때만 차단합니다.' }
            };
            let activeType = typeConfig[initialType] ? initialType : 'nickname';

            const overlay = document.createElement('div');
            overlay.id = 'dc-manual-block-overlay';
            const panel = document.createElement('section');
            panel.id = 'dc-manual-block-panel';
            panel.setAttribute('role', 'dialog');
            panel.setAttribute('aria-modal', 'true');
            panel.setAttribute('aria-labelledby', 'dc-manual-block-title');
            panel.innerHTML = `
                <div class="dcuf-manual-header">
                    <div>
                        <span class="dcuf-manual-kicker">PERSONAL BLOCK</span>
                        <h3 id="dc-manual-block-title">직접 차단</h3>
                    </div>
                    <button type="button" class="dcuf-manual-close" aria-label="직접 차단 닫기">×</button>
                </div>
                <form class="dcuf-manual-form">
                    <div class="dcuf-manual-type-tabs" role="group" aria-label="차단 정보 종류">
                        <button type="button" data-manual-block-type="uid">식별번호</button>
                        <button type="button" data-manual-block-type="nickname">닉네임</button>
                        <button type="button" data-manual-block-type="ip">아이피</button>
                    </div>
                    <label class="dcuf-manual-field" for="dc-manual-block-value">
                        <span id="dc-manual-block-value-label">닉네임</span>
                        <input id="dc-manual-block-value" type="text" autocomplete="off" autocapitalize="off" spellcheck="false">
                    </label>
                    <label class="dcuf-manual-field dcuf-manual-display-field" for="dc-manual-block-display" hidden>
                        <span>닉네임 / 표시 이름 <small>(선택)</small></span>
                        <input id="dc-manual-block-display" type="text" autocomplete="off" spellcheck="false" placeholder="예: 홍길동">
                    </label>
                    <p class="dcuf-manual-hint"></p>
                    <p class="dcuf-manual-status" role="status" aria-live="polite"></p>
                    <div class="dcuf-manual-actions">
                        <button type="button" data-manual-block-action="close">닫기</button>
                        <button type="submit" data-manual-block-action="add">차단 추가</button>
                    </div>
                </form>
            `;
            overlay.appendChild(panel);
            document.body.appendChild(overlay);

            const form = panel.querySelector('.dcuf-manual-form');
            const valueInput = panel.querySelector('#dc-manual-block-value');
            const displayField = panel.querySelector('.dcuf-manual-display-field');
            const displayInput = panel.querySelector('#dc-manual-block-display');
            const valueLabel = panel.querySelector('#dc-manual-block-value-label');
            const hint = panel.querySelector('.dcuf-manual-hint');
            const status = panel.querySelector('.dcuf-manual-status');
            const addButton = panel.querySelector('[data-manual-block-action="add"]');
            let isClosing = false;

            const setStatus = (message = '', state = '') => {
                status.textContent = message;
                status.dataset.state = state;
            };
            const selectType = (type) => {
                if (!typeConfig[type]) return;
                activeType = type;
                panel.querySelectorAll('[data-manual-block-type]').forEach((button) => {
                    button.setAttribute('aria-pressed', String(button.dataset.manualBlockType === type));
                });
                valueLabel.textContent = typeConfig[type].label;
                valueInput.placeholder = typeConfig[type].placeholder;
                hint.textContent = typeConfig[type].hint;
                displayField.hidden = type !== 'uid';
                setStatus();
                valueInput.focus();
            };
            const closePanel = () => {
                if (isClosing) return;
                isClosing = true;
                document.removeEventListener('keydown', handleKeydown, true);
                panel.classList.add('dcuf-pop-leave');
                overlay.classList.add('dcuf-overlay-leave');
                window.setTimeout(() => overlay.remove(), 140);
            };
            const handleKeydown = (event) => {
                if (event.key !== 'Escape') return;
                event.preventDefault();
                closePanel();
            };

            panel.querySelectorAll('[data-manual-block-type]').forEach((button) => {
                button.addEventListener('click', () => selectType(button.dataset.manualBlockType));
            });
            panel.querySelector('.dcuf-manual-close').addEventListener('click', closePanel);
            panel.querySelector('[data-manual-block-action="close"]').addEventListener('click', closePanel);
            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) closePanel();
            });
            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                const value = valueInput.value.trim();
                const displayValue = displayInput.value.trim();
                if (!value) {
                    setStatus(`${typeConfig[activeType].label}을(를) 입력해주세요.`, 'error');
                    valueInput.focus();
                    return;
                }

                const currentList = await this.loadPersonalBlocks();
                const isDuplicate = activeType === 'uid'
                    ? currentList.uids.some((item) => item?.id === value)
                    : activeType === 'nickname'
                        ? currentList.nicknames.includes(value)
                        : currentList.ips.includes(value);
                if (isDuplicate) {
                    setStatus('이미 차단 목록에 있는 값입니다.', 'info');
                    valueInput.select();
                    return;
                }

                addButton.disabled = true;
                addButton.textContent = '추가 중…';
                try {
                    const displayName = activeType === 'uid' && displayValue ? `${displayValue}(${value})` : null;
                    await this.addBlock(activeType, value, displayName);
                    if (typeof onAdded === 'function') await onAdded({ type: activeType, value });
                    const isEnabled = await GM_getValue(FilterModule.CONSTANTS.STORAGE_KEYS.PERSONAL_BLOCK_ENABLED, true);
                    setStatus(
                        isEnabled ? `${typeConfig[activeType].label} 차단을 추가했습니다.` : '목록에 추가했습니다. 개인 차단 기능은 현재 꺼져 있습니다.',
                        'success'
                    );
                    valueInput.value = '';
                    if (activeType === 'uid') displayInput.value = '';
                    valueInput.focus();
                } catch (error) {
                    console.error('[DCUF] 직접 차단 추가 실패:', error);
                    setStatus('차단을 추가하지 못했습니다. 잠시 후 다시 시도해주세요.', 'error');
                } finally {
                    addButton.disabled = false;
                    addButton.textContent = '차단 추가';
                }
            });
            document.addEventListener('keydown', handleKeydown, true);
            selectType(activeType);
            return panel;
        },

        isFabSupportedPage() {
            const currentPath = window.location.pathname;
            return currentPath.includes('/board/lists') || currentPath.includes('/board/view');
        },

        closeFabDrawer() {
            const fab = document.getElementById('dc-personal-block-fab');
            const drawer = document.getElementById('dc-personal-block-drawer');
            if (!fab || !drawer) return;
            drawer.hidden = true;
            fab.setAttribute('aria-expanded', 'false');
        },

        positionFabDrawer() {
            const controls = document.getElementById('dc-personal-block-controls');
            const drawer = document.getElementById('dc-personal-block-drawer');
            if (!controls || !drawer || drawer.hidden) return;

            const viewportGap = 8;
            const drawerGap = 8;
            const controlsRect = controls.getBoundingClientRect();
            const drawerRect = drawer.getBoundingClientRect();
            const maxLeft = Math.max(viewportGap, window.innerWidth - drawerRect.width - viewportGap);
            const left = Math.max(viewportGap, Math.min(controlsRect.right - drawerRect.width, maxLeft));
            let top = controlsRect.top - drawerRect.height - drawerGap;

            if (top < viewportGap) {
                top = Math.min(
                    controlsRect.bottom + drawerGap,
                    Math.max(viewportGap, window.innerHeight - drawerRect.height - viewportGap)
                );
            }

            drawer.style.left = `${Math.round(left - controlsRect.left)}px`;
            drawer.style.top = `${Math.round(top - controlsRect.top)}px`;
        },

        toggleFabDrawer() {
            const fab = document.getElementById('dc-personal-block-fab');
            const drawer = document.getElementById('dc-personal-block-drawer');
            if (!fab || !drawer) return;
            const willOpen = drawer.hidden;
            if (willOpen) window.__dcufEnsureFilterUiStyles?.();
            drawer.hidden = !willOpen;
            fab.setAttribute('aria-expanded', String(willOpen));
            if (willOpen) this.positionFabDrawer();
        },

        resetFabPosition() {
            if (!this.isFabSupportedPage()) {
                alert('플로팅 메뉴는 글 목록과 본문 페이지에서만 표시됩니다.');
                return false;
            }

            const controls = this.createFab();
            if (!controls) return false;
            this.closeFabDrawer();
            Object.assign(controls.style, {
                left: 'auto',
                top: 'auto',
                right: '20px',
                bottom: '20px'
            });
            return true;
        },

        createFab() {
            if (!this.isFabSupportedPage() || !document.body) return null;

            const existingControls = document.getElementById('dc-personal-block-controls');
            const existingFab = document.getElementById('dc-personal-block-fab');
            const existingDrawer = document.getElementById('dc-personal-block-drawer');
            if (existingControls && existingFab && existingDrawer && existingControls.contains(existingFab) && existingControls.contains(existingDrawer)) {
                return existingControls;
            }
            existingControls?.remove();
            existingFab?.remove();
            existingDrawer?.remove();

            const controls = document.createElement('div');
            controls.id = 'dc-personal-block-controls';
            Object.assign(controls.style, { left: 'auto', top: 'auto', right: '20px', bottom: '20px' });

            const fab = document.createElement('button');
            fab.id = 'dc-personal-block-fab';
            fab.type = 'button';
            fab.textContent = '메뉴';
            fab.setAttribute('aria-expanded', 'false');
            fab.setAttribute('aria-controls', 'dc-personal-block-drawer');
            fab.setAttribute('aria-label', 'DC 유저 필터 메뉴');

            const drawer = document.createElement('div');
            drawer.id = 'dc-personal-block-drawer';
            drawer.hidden = true;
            drawer.setAttribute('role', 'menu');
            drawer.setAttribute('aria-label', 'DC 유저 필터 기능');
            drawer.innerHTML = `
                <button type="button" role="menuitem" data-dcuf-fab-action="quick-block"><span class="dcuf-menu-icon" aria-hidden="true">◎</span><span><strong>화면에서 간편차단</strong><small>글·댓글 작성자를 눌러 선택</small></span></button>
                <button type="button" role="menuitem" data-dcuf-fab-action="manual-block"><span class="dcuf-menu-icon" aria-hidden="true">＋</span><span><strong>직접 차단</strong><small>닉네임·식별번호·IP 입력</small></span></button>
                <button type="button" role="menuitem" data-dcuf-fab-action="filter-settings"><span class="dcuf-menu-icon" aria-hidden="true">◫</span><span><strong>글댓합 설정</strong><small>필터 기준과 범위 조정</small></span></button>
                <button type="button" role="menuitem" data-dcuf-fab-action="block-management"><span class="dcuf-menu-icon" aria-hidden="true">☰</span><span><strong>차단 유저 관리</strong><small>목록 확인·삭제·백업</small></span></button>
            `;

            controls.append(fab, drawer);
            document.body.appendChild(controls);
            this.applyFabScalePercent(this.fabScalePercent, { clamp: false });

            let activePointerId = null;
            let offsetX = 0;
            let offsetY = 0;
            let startX = 0;
            let startY = 0;
            let wasDragged = false;
            let suppressClick = false;
            let dragWidth = 0;
            let dragHeight = 0;
            let dragRafId = 0;
            let pendingDragX = null;
            let pendingDragY = null;

            const applyFabDragPosition = () => {
                dragRafId = 0;
                if (activePointerId === null || pendingDragX === null || pendingDragY === null) return;
                const nextX = Math.max(0, Math.min(pendingDragX - offsetX, window.innerWidth - dragWidth));
                const nextY = Math.max(0, Math.min(pendingDragY - offsetY, window.innerHeight - dragHeight));
                pendingDragX = null;
                pendingDragY = null;
                Object.assign(controls.style, {
                    left: `${Math.round(nextX)}px`,
                    top: `${Math.round(nextY)}px`,
                    right: 'auto',
                    bottom: 'auto'
                });
            };

            fab.addEventListener('pointerdown', (event) => {
                if (event.button !== 0 || activePointerId !== null) return;
                const rect = controls.getBoundingClientRect();
                activePointerId = event.pointerId;
                offsetX = event.clientX - rect.left;
                offsetY = event.clientY - rect.top;
                dragWidth = rect.width;
                dragHeight = rect.height;
                startX = event.clientX;
                startY = event.clientY;
                wasDragged = false;
                fab.setPointerCapture?.(event.pointerId);
            });

            fab.addEventListener('pointermove', (event) => {
                if (event.pointerId !== activePointerId) return;
                if (!wasDragged && Math.hypot(event.clientX - startX, event.clientY - startY) < 5) return;
                if (!wasDragged) this.closeFabDrawer();
                wasDragged = true;
                event.preventDefault();
                pendingDragX = event.clientX;
                pendingDragY = event.clientY;
                if (!dragRafId) dragRafId = requestAnimationFrame(applyFabDragPosition);
            });

            const finishDrag = (event) => {
                if (event.pointerId !== activePointerId) return;
                if (dragRafId) cancelAnimationFrame(dragRafId);
                applyFabDragPosition();
                suppressClick = wasDragged;
                activePointerId = null;
                fab.releasePointerCapture?.(event.pointerId);
            };
            fab.addEventListener('pointerup', finishDrag);
            fab.addEventListener('pointercancel', finishDrag);

            fab.addEventListener('click', () => {
                if (suppressClick) {
                    suppressClick = false;
                    return;
                }
                this.toggleFabDrawer();
            });

            drawer.addEventListener('click', async (event) => {
                const actionButton = event.target.closest('[data-dcuf-fab-action]');
                if (!actionButton || !drawer.contains(actionButton)) return;
                const action = actionButton.dataset.dcufFabAction;
                this.closeFabDrawer();
                if (action === 'quick-block') this.enterSelectionMode();
                else if (action === 'manual-block') await this.createManualBlockPanel();
                else if (action === 'filter-settings') await FilterModule.showSettings();
                else if (action === 'block-management') await this.createManagementPanel();
            });

            if (!this._fabGlobalHandlersBound) {
                document.addEventListener('click', (event) => {
                    const currentControls = document.getElementById('dc-personal-block-controls');
                    if (currentControls && !currentControls.contains(event.target)) this.closeFabDrawer();
                });
                document.addEventListener('keydown', (event) => {
                    if (event.key === 'Escape') this.closeFabDrawer();
                });
                window.addEventListener('resize', () => {
                    this.clampFabPosition();
                    if (!document.getElementById('dc-personal-block-drawer')?.hidden) this.positionFabDrawer();
                });
                this._fabGlobalHandlersBound = true;
            }

            return controls;
        },

        enterSelectionMode() {
            if (this.isSelectionMode) return;
            window.__dcufEnsureFilterUiStyles?.();
            this.isSelectionMode = true;
            document.body.classList.add('selection-mode-active');


            const popup = document.createElement('div');
            popup.id = 'dc-selection-popup';
            popup.className = 'dcuf-selection-prompt';
            popup.innerHTML = `
                <div class="dcuf-selection-prompt-icon" aria-hidden="true">◎</div>
                <div class="dcuf-selection-prompt-copy">
                    <h4>차단할 작성자를 선택하세요</h4>
                    <p>글이나 댓글의 닉네임을 눌러주세요.</p>
                </div>
                <div class="popup-buttons">
                    <button class="cancel-btn">선택 취소</button>
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
            window.__dcufEnsureFilterUiStyles?.();
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
            let startAnchorX = 0.5;
            let startAnchorY = 0.5;
            let lastMoveTs = 0;
            let lastMoveDistance = -1;

            const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
            const getDistance = (t1, t2) => Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            const getMidpoint = (t1, t2) => ({ x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 });
            const viewportSize = () => ({ width: window.innerWidth, height: window.innerHeight });

            const normalizeFixedPosition = () => {
                const rect = target.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(target);
                if (computedStyle.transform && computedStyle.transform !== 'none') {
                    target.style.setProperty('transform', 'none', 'important');
                    target.style.setProperty('left', `${rect.left}px`, 'important');
                    target.style.setProperty('top', `${rect.top}px`, 'important');
                }

                // Pinch geometry is calculated from the border box. Keep the CSS sizing
                // model and the runtime dimensions in the same coordinate space so that
                // padded popups do not grow or jump on the first move.
                target.style.setProperty('box-sizing', 'border-box', 'important');
                target.style.setProperty('width', `${rect.width}px`, 'important');
                target.style.setProperty('height', `${rect.height}px`, 'important');
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
                const midpoint = getMidpoint(touches[0], touches[1]);
                startAnchorX = rect.width > 0 ? clamp((midpoint.x - rect.left) / rect.width, 0, 1) : 0.5;
                startAnchorY = rect.height > 0 ? clamp((midpoint.y - rect.top) / rect.height, 0, 1) : 0.5;
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

                const requestedScale = distance / startDistance;
                const minScale = Math.min(1, Math.max(dynamicMinWidth / startWidth, dynamicMinHeight / startHeight));
                const maxScale = Math.max(1, Math.min(maxWidth / startWidth, maxHeight / startHeight));
                const scale = clamp(requestedScale, minScale, maxScale);
                const nextWidth = startWidth * scale;
                const nextHeight = startHeight * scale;

                const rawLeft = mid.x - (nextWidth * startAnchorX);
                const rawTop = mid.y - (nextHeight * startAnchorY);
                const viewportGap = 4;
                const nextLeft = clamp(rawLeft, viewportGap, Math.max(viewportGap, vp.width - nextWidth - viewportGap));
                const nextTop = clamp(rawTop, viewportGap, Math.max(viewportGap, vp.height - nextHeight - viewportGap));

                // The centered settings/backup popups have responsive !important width,
                // max-width, and min-height rules. Override those constraints only after
                // an explicit pinch starts so the rendered box matches these calculations.
                target.style.setProperty('min-width', `${dynamicMinWidth}px`, 'important');
                target.style.setProperty('min-height', `${dynamicMinHeight}px`, 'important');
                target.style.setProperty('max-width', `${maxWidth}px`, 'important');
                target.style.setProperty('max-height', `${maxHeight}px`, 'important');
                target.style.setProperty('width', `${nextWidth}px`, 'important');
                target.style.setProperty('height', `${nextHeight}px`, 'important');
                target.style.setProperty('left', `${nextLeft}px`, 'important');
                target.style.setProperty('top', `${nextTop}px`, 'important');

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
            window.__dcufEnsureFilterUiStyles?.();
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

            const textarea = popup.querySelector('textarea');
            const fileInput = popup.querySelector('.import-file-input');
            let bufferedClipboardImport = '';
            const originalTextareaPlaceholder = textarea ? (textarea.getAttribute('placeholder') || '') : '';

            const formatImportSize = (text) => {
                const size = new Blob([text]).size;
                if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)}MB`;
                if (size >= 1024) return `${(size / 1024).toFixed(1)}KB`;
                return `${size}B`;
            };

            const setBufferedImportPreview = (text) => {
                if (!textarea) return;
                textarea.value = '';
                textarea.placeholder = `클립보드 백업 데이터 붙여넣기 완료 (${formatImportSize(text)})\n불러오기 버튼을 누르면 가져옵니다.`;
                textarea.dataset.dcufBufferedImport = '1';
            };

            const clearBufferedImport = () => {
                bufferedClipboardImport = '';
                if (!textarea) return;
                textarea.placeholder = originalTextareaPlaceholder;
                delete textarea.dataset.dcufBufferedImport;
            };

            if (textarea) {
                textarea.addEventListener('paste', (e) => {
                    const pastedText = e.clipboardData?.getData('text');
                    if (typeof pastedText !== 'string' || !pastedText.length) return;

                    e.preventDefault();
                    bufferedClipboardImport = pastedText;
                    setBufferedImportPreview(pastedText);
                });

                textarea.addEventListener('input', () => {
                    if (textarea.dataset.dcufBufferedImport === '1') {
                        clearBufferedImport();
                    }
                });
            }


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
                const jsonString = JSON.stringify(data);
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
                    const importText = textarea && textarea.dataset.dcufBufferedImport === '1'
                        ? bufferedClipboardImport
                        : (textarea ? textarea.value : '');
                    processImportData(importText);
                }
            };
        },


        // [수정] 차단 관리 패널 로직 전체 개선 (On/Off 스위치, 백업 버튼 추가)
        async createManagementPanel() {
            window.__dcufEnsureFilterUiStyles?.();
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
                    <div class="panel-title-group">
                        <span class="panel-kicker">PERSONAL BLOCK</span>
                        <h3>차단 유저 관리</h3>
                    </div>
                    <div class="panel-header-actions">
                        <button type="button" class="panel-add-btn">＋ 직접 추가</button>
                        <div class="switch-container">
                            <label class="switch" aria-label="개인 차단 기능 사용">
                                <input type="checkbox" id="personal-block-toggle" ${isPersonalBlockEnabled ? 'checked' : ''}>
                                <span class="switch-slider"></span>
                            </label>
                        </div>
                        <button type="button" class="panel-close-btn" aria-label="차단 유저 관리 닫기">×</button>
                    </div>
                </div>
                <div class="panel-tabs" role="tablist" aria-label="차단 정보 종류">
                    <button type="button" class="panel-tab active" data-type="uids">식별 번호 <span class="panel-tab-count">${originalBlockList.uids.length}</span></button>
                    <button type="button" class="panel-tab" data-type="nicknames">닉네임 <span class="panel-tab-count">${originalBlockList.nicknames.length}</span></button>
                    <button type="button" class="panel-tab" data-type="ips">아이피 <span class="panel-tab-count">${originalBlockList.ips.length}</span></button>
                </div>
                <div class="panel-body">
                    <div class="panel-list-controls">
                        <label class="panel-search">
                            <span aria-hidden="true">⌕</span>
                            <input type="search" class="panel-search-input" placeholder="현재 탭에서 검색" autocomplete="off" aria-label="차단 목록 검색">
                        </label>
                        <button type="button" class="select-all-btn">해당 탭 전체 선택/해제</button>
                        <span class="panel-list-summary" aria-live="polite"></span>
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
            const saveButton = panel.querySelector('.panel-save-btn');
            const searchInput = panel.querySelector('.panel-search-input');
            const listSummary = panel.querySelector('.panel-list-summary');
            const updateTabCounts = () => {
                panel.querySelectorAll('.panel-tab').forEach((tab) => {
                    const count = originalBlockList[tab.dataset.type]?.length || 0;
                    const countEl = tab.querySelector('.panel-tab-count');
                    if (countEl) countEl.textContent = String(count);
                });
            };


            const isEverythingSelected = () => {
                const totalItems = originalBlockList.uids.length + originalBlockList.nicknames.length + originalBlockList.ips.length;
                if (totalItems === 0) return false; // 아무것도 없으면 선택된 게 아님
                const totalSelected = itemsToDelete.uids.size + itemsToDelete.nicknames.size + itemsToDelete.ips.size;
                return totalItems === totalSelected;
            };


            const updateGlobalSelectAllButtonState = () => {
                const pendingCount = itemsToDelete.uids.size + itemsToDelete.nicknames.size + itemsToDelete.ips.size;
                saveButton.textContent = pendingCount ? `${pendingCount}건 변경 저장` : '변경 저장';
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
                const query = searchInput.value.trim().toLocaleLowerCase();
                const filteredData = data.filter((item) => {
                    const value = typeof item === 'object' ? item?.id : item;
                    const name = typeof item === 'object' ? item?.name : item;
                    return !query || String(name ?? value ?? '').toLocaleLowerCase().includes(query)
                        || String(value ?? '').toLocaleLowerCase().includes(query);
                });

                listSummary.textContent = query ? `${filteredData.length} / ${data.length}개 표시` : `총 ${data.length}개`;
                if (filteredData.length === 0) {
                    const emptyItem = document.createElement('li');
                    emptyItem.className = 'blocked-list-empty';
                    emptyItem.textContent = query ? '검색 결과가 없습니다.' : '이 탭에 차단된 항목이 없습니다.';
                    listEl.appendChild(emptyItem);
                }

                filteredData.forEach((item) => {
                    const li = document.createElement('li');
                    li.className = 'blocked-item';
                    const value = (typeof item === 'object') ? item.id : item;
                    const name = (typeof item === 'object') ? item.name : item;
                    li.dataset.value = value;

                    const nameEl = document.createElement('span');
                    nameEl.className = 'item-name';
                    nameEl.textContent = String(name ?? value ?? '');
                    const deleteButton = document.createElement('button');
                    deleteButton.type = 'button';
                    deleteButton.className = 'delete-item-btn';
                    deleteButton.textContent = '삭제';
                    deleteButton.setAttribute('aria-label', `${nameEl.textContent} 삭제 선택`);
                    li.append(nameEl, deleteButton);

                    if (itemsToDelete[type].has(value)) {
                        li.classList.add('item-to-delete');
                    }

                    deleteButton.onclick = () => {
                        if (li.classList.toggle('item-to-delete')) {
                            itemsToDelete[type].add(value);
                        } else {
                            itemsToDelete[type].delete(value);
                        }
                        updateSelectAllButtonState(type);
                        updateGlobalSelectAllButtonState();
                    };
                    listEl.appendChild(li);
                });
                updateTabCounts();
                updateSelectAllButtonState(type);
                updateGlobalSelectAllButtonState();
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


            searchInput.addEventListener('input', () => {
                const activeType = panel.querySelector('.panel-tab.active').dataset.type;
                renderList(activeType);
            });

            panel.querySelector('.panel-add-btn').onclick = async () => {
                const activeType = panel.querySelector('.panel-tab.active').dataset.type;
                const manualType = activeType === 'uids' ? 'uid' : activeType === 'nicknames' ? 'nickname' : 'ip';
                await this.createManualBlockPanel({
                    initialType: manualType,
                    onAdded: async () => {
                        const latestList = await this.loadPersonalBlocks();
                        originalBlockList.uids = latestList.uids;
                        originalBlockList.nicknames = latestList.nicknames;
                        originalBlockList.ips = latestList.ips;
                        renderList(panel.querySelector('.panel-tab.active').dataset.type);
                    }
                });
            };


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
            let offsetX, offsetY, resizeStartX, resizeStartY;
            let panelWidth = 0, panelHeight = 0;
            let dragRafId = 0, pendingPointerX = null, pendingPointerY = null;

            const applyPanelGeometry = () => {
                dragRafId = 0;
                if (pendingPointerX === null || pendingPointerY === null) return;
                const clientX = pendingPointerX;
                const clientY = pendingPointerY;
                pendingPointerX = null;
                pendingPointerY = null;

                if (isDragging) {
                    let newX = clientX - offsetX;
                    let newY = clientY - offsetY;
                    newX = Math.max(0, Math.min(newX, window.innerWidth - panelWidth));
                    newY = Math.max(0, Math.min(newY, window.innerHeight - panelHeight));
                    panel.style.left = `${newX}px`;
                    panel.style.top = `${newY}px`;
                } else if (isResizing) {
                    panel.style.width = `${panelWidth + clientX - resizeStartX}px`;
                    panel.style.height = `${panelHeight + clientY - resizeStartY}px`;
                }
            };


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
                    resizeStartX = e.clientX;
                    resizeStartY = e.clientY;
                }
                panelWidth = rect.width;
                panelHeight = rect.height;


                document.addEventListener('mousemove', onDragMove);
                document.addEventListener('mouseup', onDragEnd, { once: true });
            };


            const onDragMove = (e) => {
                e.preventDefault();
                pendingPointerX = e.clientX;
                pendingPointerY = e.clientY;
                if (!dragRafId) dragRafId = requestAnimationFrame(applyPanelGeometry);
            };


            const onDragEnd = () => { // async 키워드 제거
                if (dragRafId) cancelAnimationFrame(dragRafId);
                applyPanelGeometry();
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
        _initState: 'idle',
        _initPromise: null,
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
            SEARCH_LAYER: '#searchTypeLayer',
            PAGE_MOVE_BOX: '.bottom_movebox',
        },


        CUSTOM_CLASSES: {
            MOBILE_LIST: 'custom-mobile-list',
            POST_ITEM: 'custom-post-item',
            BOTTOM_CONTROLS: 'custom-bottom-controls',
            SEARCH_SLOT: 'dcuf-search-drawer-slot',
        },

        LIST_STATE_MAP: new WeakMap(),
        ACTIVE_LIST_STATES: new Set(),
        _bootRollbackRegistered: false,
        PAGINATION_BOUND_ATTR: 'data-dcuf-force-refresh-bound',
        TOOLTIP_BOUND_ATTR: 'data-dcuf-tooltip-bound',
        SEARCH_LAYER_BOUND_ATTR: 'data-dcuf-search-layer-bound',
        POST_REVEAL_RECOVERY_MAX_MS: 4500,
        POST_REVEAL_RECOVERY_POLL_MS: 280,
        POST_REVEAL_RECOVERY_STABLE_PASSES: 3,
        POST_REVEAL_RECOVERY_THEME_REFRESH_LIMIT: 2,
        _nextRowId: 1,
        _nextListRuntimeId: 1,
        _listMutationUnsubscribe: null,
        _initialRevealStartedAt: 0,
        _postRevealRecoveryStop: null,
        ARTICLE_AD_STYLE_ID: 'dcuf-article-native-ad-style',
        SEARCH_DRAWER_ROOTS: new Set(),
        _searchDrawerGlobalHandlersBound: false,
        _searchDrawerUpdateRafId: 0,
        _searchDrawerUpdateTimerId: 0,

        getRuntimeCoordinator() {
            return window.__dcufRuntimeCoordinator || null;
        },

        getPhase1Theme() {
            return window.__dcufPhase1Theme || null;
        },

        getPhase1ViewTheme() {
            return window.__dcufPhase1ViewTheme || null;
        },

        getCurrentRevealTheme() {
            if (this.isViewPage()) return this.getPhase1ViewTheme();
            return this.getPhase1Theme();
        },

        getRevealThemeForState(state = null) {
            if (state?.detail?.revealTheme === 'list') return this.getPhase1Theme();
            if (state?.detail?.revealTheme === 'view') return this.getPhase1ViewTheme();
            return this.getCurrentRevealTheme();
        },

        ensureBootUi(reason = 'reveal-check') {
            if (typeof window.__dcufEnsureBootUi === 'function') {
                try {
                    window.__dcufEnsureBootUi(reason);
                } catch (error) {
                    console.warn('[DC Filter+UI] Failed to ensure boot UI:', error);
                }
            }
        },

        resolveOwnedListWrap(candidate) {
            if (!(candidate instanceof Element)) return null;

            let originalTable = null;
            if (candidate.matches?.(this.SELECTORS.ORIGINAL_TABLE)) {
                originalTable = candidate;
            } else if (candidate.matches?.(this.SELECTORS.LIST_WRAP)) {
                originalTable = candidate.querySelector(this.SELECTORS.ORIGINAL_TABLE);
            } else {
                originalTable = candidate.closest?.(this.SELECTORS.ORIGINAL_TABLE)
                    || candidate.querySelector?.(this.SELECTORS.ORIGINAL_TABLE)
                    || candidate.closest?.(this.SELECTORS.LIST_WRAP)?.querySelector?.(this.SELECTORS.ORIGINAL_TABLE);
            }

            if (!(originalTable instanceof Element)) return null;
            const ownerWrap = originalTable.closest(this.SELECTORS.LIST_WRAP);
            return ownerWrap instanceof HTMLElement ? ownerWrap : null;
        },

        collectOwnedListWraps(root = document) {
            const queryRoot = (root instanceof Document || root instanceof Element || root instanceof DocumentFragment) ? root : document;
            const seen = new Set();
            const results = [];
            const pushOwned = (candidate) => {
                const ownerWrap = this.resolveOwnedListWrap(candidate);
                if (!(ownerWrap instanceof HTMLElement) || seen.has(ownerWrap)) return;
                seen.add(ownerWrap);
                results.push(ownerWrap);
            };

            if (queryRoot instanceof Element) pushOwned(queryRoot);
            if (queryRoot.querySelectorAll) {
                queryRoot.querySelectorAll(this.SELECTORS.LIST_WRAP).forEach(pushOwned);
                queryRoot.querySelectorAll(this.SELECTORS.ORIGINAL_TABLE).forEach(pushOwned);
            }

            return results;
        },

        resolveBottomControlScope(listWrap) {
            if (!(listWrap instanceof HTMLElement)) return null;
            // Live view pages keep the embedded-list controls beside the
            // list wrapper. closest('section') returned the wrapper itself,
            // which made those sibling controls impossible to discover.
            return listWrap.parentElement || listWrap;
        },

        findBottomControlElement(listWrap, selector) {
            if (!(listWrap instanceof HTMLElement) || !selector) return null;
            const scope = this.resolveBottomControlScope(listWrap);
            if (!(scope instanceof HTMLElement)) return null;

            const candidates = Array.from(scope.querySelectorAll(selector));
            return candidates.find((element) => {
                if (!(element instanceof HTMLElement)) return false;
                if (element.closest(`.${this.CUSTOM_CLASSES.BOTTOM_CONTROLS}`)) return false;

                // Live list controls are siblings of `.gall_listwrap`, but the
                // whole page is nested in `#top.list_wrap`. Comparing only the
                // nearest LIST_WRAP assigns them to that decorative outer wrapper
                // and rejects every control. Resolve the table-owned list instead.
                const controlOwner = this.resolveOwnedListWrap(element);
                return !(controlOwner instanceof HTMLElement) || controlOwner === listWrap;
            }) || null;
        },

        findAdjacentViewListActionBar(listWrap) {
            if (!(listWrap instanceof HTMLElement)) return null;
            const sibling = listWrap.previousElementSibling;
            if (!(sibling instanceof HTMLElement)) return null;
            if (!sibling.matches('.view_bottom_btnbox')) return null;
            if (sibling.closest(`.${this.CUSTOM_CLASSES.BOTTOM_CONTROLS}`)) return null;
            return sibling;
        },

        recordDiagnostic(label, amount = 1) {
            const diagnostics = window.__dcufDiagnostics;
            if (typeof diagnostics?.increment === 'function') diagnostics.increment(label, amount);
        },

        createPhaseScheduler(label, run, delays = []) {
            const runtimeCoordinator = this.getRuntimeCoordinator();
            if (runtimeCoordinator && typeof runtimeCoordinator.createPhaseScheduler === 'function') {
                return runtimeCoordinator.createPhaseScheduler(label, run, { delays });
            }

            let rafId = 0;
            const timerIds = new Set();
            const clearTimers = () => {
                timerIds.forEach((timerId) => clearTimeout(timerId));
                timerIds.clear();
            };

            return {
                schedule: (meta = null) => {
                    if (rafId) cancelAnimationFrame(rafId);
                    clearTimers();

                    rafId = requestAnimationFrame(() => {
                        rafId = 0;
                        run({ label, phase: 'raf', delay: 0, meta });
                        delays.forEach((delay) => {
                            const timerId = window.setTimeout(() => {
                                timerIds.delete(timerId);
                                run({ label, phase: `delay:${delay}`, delay, meta });
                            }, delay);
                            timerIds.add(timerId);
                        });
                    });
                },
                cancel: () => {
                    if (rafId) {
                        cancelAnimationFrame(rafId);
                        rafId = 0;
                    }
                    clearTimers();
                },
                flush: (meta = null) => {
                    if (rafId) {
                        cancelAnimationFrame(rafId);
                        rafId = 0;
                    }
                    clearTimers();
                    run({ label, phase: 'flush', delay: 0, meta });
                }
            };
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
            // Host CSS also hides non-post survey/advertisement rows. The original table is
            // off-screen, but each row retains its own computed display value.
            const isHostHidden = window.getComputedStyle(originalRow).display === 'none';
            const nextDisplay = (isDibsBlocked || isUserFilterBlocked || isHostHidden) ? 'none' : 'block';
            if (typeof FilterModule?.debugMirrorSync === 'function') {
                FilterModule.debugMirrorSync(originalRow, mirroredItem, nextDisplay, 'UIModule.updateItemVisibility');
            }
            if (mirroredItem.style.display !== nextDisplay) {
                mirroredItem.style.display = nextDisplay;
            }
        },


        createMobileListItem(originalRow, rowId) {
            const titleContainer = originalRow.querySelector('.gall_tit');
            const writerEl = originalRow.querySelector('.gall_writer');
            const dateEl = originalRow.querySelector('.gall_date');
            if (!titleContainer || !writerEl || !dateEl) return null;


            const newItem = document.createElement('div');
            newItem.setAttribute(this.DATA_ATTR, rowId);
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


        updateSearchDrawerReserve(searchRoot) {
            if (!(searchRoot instanceof HTMLElement)) return;
            const searchForm = searchRoot.matches?.(this.SELECTORS.SEARCH_FORM)
                ? searchRoot
                : searchRoot.querySelector(this.SELECTORS.SEARCH_FORM);
            if (!(searchForm instanceof HTMLElement)) return;

            const layer = searchForm.querySelector(this.SELECTORS.SEARCH_LAYER);
            if (!(layer instanceof HTMLElement)) {
                searchRoot.style.removeProperty('--dcuf-search-layer-reserve');
                searchRoot.style.removeProperty('padding-bottom');
                searchRoot.removeAttribute('data-dcuf-search-layer-open');
                return;
            }

            const computed = window.getComputedStyle(layer);
            const isVisible = computed.display !== 'none'
                && computed.visibility !== 'hidden'
                && Number(computed.opacity || '1') > 0;

            if (!isVisible) {
                searchRoot.style.removeProperty('--dcuf-search-layer-reserve');
                searchRoot.style.removeProperty('padding-bottom');
                searchRoot.removeAttribute('data-dcuf-search-layer-open');
                return;
            }

            const measuredHeight = Math.max(
                Math.ceil(layer.scrollHeight || 0),
                Math.ceil(layer.getBoundingClientRect().height || 0),
                0
            );
            const reserve = Math.max(120, Math.min(220, measuredHeight + 12));
            searchRoot.style.setProperty('--dcuf-search-layer-reserve', `${reserve}px`);
            searchRoot.style.setProperty('padding-bottom', `${reserve}px`, 'important');
            searchRoot.setAttribute('data-dcuf-search-layer-open', '1');
        },

        pruneSearchDrawerRoots() {
            this.SEARCH_DRAWER_ROOTS.forEach((searchRoot) => {
                const hasSearchForm = searchRoot instanceof HTMLElement
                    && (searchRoot.matches?.(this.SELECTORS.SEARCH_FORM)
                        || searchRoot.querySelector?.(this.SELECTORS.SEARCH_FORM));
                if (!searchRoot.isConnected || !hasSearchForm) this.SEARCH_DRAWER_ROOTS.delete(searchRoot);
            });
            const diagnostics = window.__dcufDiagnostics;
            if (typeof diagnostics?.setGauge === 'function') {
                diagnostics.setGauge('ui.searchDrawer.activeRoots', this.SEARCH_DRAWER_ROOTS.size);
                diagnostics.setGauge('ui.searchDrawer.globalListeners', this._searchDrawerGlobalHandlersBound ? 4 : 0);
            }
        },

        flushSearchDrawerReserveUpdates() {
            this.pruneSearchDrawerRoots();
            this.SEARCH_DRAWER_ROOTS.forEach((searchRoot) => this.updateSearchDrawerReserve(searchRoot));
        },

        scheduleSearchDrawerReserveUpdate() {
            if (!this._searchDrawerUpdateRafId) {
                this._searchDrawerUpdateRafId = requestAnimationFrame(() => {
                    this._searchDrawerUpdateRafId = 0;
                    this.flushSearchDrawerReserveUpdates();
                });
            }
            if (this._searchDrawerUpdateTimerId) window.clearTimeout(this._searchDrawerUpdateTimerId);
            this._searchDrawerUpdateTimerId = window.setTimeout(() => {
                this._searchDrawerUpdateTimerId = 0;
                this.flushSearchDrawerReserveUpdates();
            }, 40);
        },

        ensureSearchDrawerGlobalHandlers() {
            if (this._searchDrawerGlobalHandlersBound) return;
            const scheduleUpdate = () => this.scheduleSearchDrawerReserveUpdate();
            document.addEventListener('click', scheduleUpdate, true);
            document.addEventListener('change', scheduleUpdate, true);
            document.addEventListener('focusin', scheduleUpdate, true);
            window.addEventListener('resize', scheduleUpdate);
            this._searchDrawerGlobalHandlersBound = true;
        },

        bindSearchDrawerReserve(searchRoot) {
            if (!(searchRoot instanceof HTMLElement)) return;
            const searchForm = searchRoot.matches?.(this.SELECTORS.SEARCH_FORM)
                ? searchRoot
                : searchRoot.querySelector(this.SELECTORS.SEARCH_FORM);
            if (!(searchForm instanceof HTMLElement)) return;

            const searchSlot = searchForm.closest(`.${this.CUSTOM_CLASSES.SEARCH_SLOT}`);
            const reserveRoot = searchSlot instanceof HTMLElement ? searchSlot : searchRoot;
            this.SEARCH_DRAWER_ROOTS.forEach((registeredRoot) => {
                if (registeredRoot === reserveRoot) return;
                const registeredForm = registeredRoot.matches?.(this.SELECTORS.SEARCH_FORM)
                    ? registeredRoot
                    : registeredRoot.querySelector?.(this.SELECTORS.SEARCH_FORM);
                if (registeredForm === searchForm) this.SEARCH_DRAWER_ROOTS.delete(registeredRoot);
            });
            this.SEARCH_DRAWER_ROOTS.add(reserveRoot);
            this.ensureSearchDrawerGlobalHandlers();
            if (reserveRoot.getAttribute(this.SEARCH_LAYER_BOUND_ATTR) === '1') {
                this.scheduleSearchDrawerReserveUpdate();
                return;
            }
            reserveRoot.setAttribute(this.SEARCH_LAYER_BOUND_ATTR, '1');

            reserveRoot.style.setProperty('overflow', 'visible', 'important');
            reserveRoot.style.setProperty('position', 'relative', 'important');
            reserveRoot.style.setProperty('transition', 'padding-bottom 0.18s ease', 'important');

            this.scheduleSearchDrawerReserveUpdate();
        },

        enhanceOriginalSearchForms(listWrap) {
            const searchForm = this.findBottomControlElement(listWrap, this.SELECTORS.SEARCH_FORM);
            if (!(searchForm instanceof HTMLElement)) return;
            this.bindSearchDrawerReserve(searchForm);
        },

        normalizeSearchFormLayout(searchSlot) {
            if (!(searchSlot instanceof HTMLElement)) return;

            const searchForm = searchSlot.querySelector(this.SELECTORS.SEARCH_FORM);
            if (!(searchForm instanceof HTMLElement)) return;

            const fieldset = searchForm.querySelector('fieldset');
            const searchWrap = searchForm.querySelector('.bottom_search_wrap, .buttom_search_wrap')
                || (fieldset instanceof HTMLElement ? fieldset : searchForm);
            const leftBox = searchForm.querySelector('.search_left_box');
            const rightBox = searchForm.querySelector('.search_right_box');
            const nativeSelect = searchForm.querySelector('select[name="search_type"], #search_type');
            const selectBox = searchForm.querySelector('.select_box.bottom_array');
            const selectArea = searchForm.querySelector('.select_area');
            const selectInner = searchForm.querySelector('.select_box.bottom_array .inner');
            const bottomSearch = searchForm.querySelector('.bottom_search');
            const innerSearch = searchForm.querySelector('.inner_search');
            const keywordInput = searchForm.querySelector('input.in_keyword, input[type="text"]');
            const searchButton = searchForm.querySelector('.bnt_search, button.sp_img.bnt_search');
            const searchLayer = searchForm.querySelector(this.SELECTORS.SEARCH_LAYER);
            const hasLegacySearchColumns = Boolean(searchForm.querySelector('.search_left_box, .search_right_box'));
            let nativeSelectHost = searchForm.querySelector('.dcuf-native-search-type');

            if (nativeSelect instanceof HTMLSelectElement && !(nativeSelectHost instanceof HTMLElement)) {
                nativeSelectHost = document.createElement('div');
                nativeSelectHost.className = 'dcuf-native-search-type';
            }

            searchForm.style.setProperty('display', 'block', 'important');
            searchForm.style.setProperty('width', '100%', 'important');
            searchForm.style.setProperty('max-width', 'none', 'important');
            searchForm.style.setProperty('margin', '0', 'important');
            searchForm.style.setProperty('padding', '0', 'important');
            searchForm.style.setProperty('border', 'none', 'important');
            searchForm.style.setProperty('background', 'transparent', 'important');
            searchForm.style.setProperty('box-shadow', 'none', 'important');

            if (fieldset instanceof HTMLElement) {
                fieldset.style.setProperty('display', 'block', 'important');
                fieldset.style.setProperty('min-width', '0', 'important');
                fieldset.style.setProperty('margin', '0', 'important');
                fieldset.style.setProperty('padding', '0', 'important');
                fieldset.style.setProperty('border', 'none', 'important');
            }

            if (searchWrap instanceof HTMLElement) {
                searchWrap.style.setProperty('display', 'flex', 'important');
                searchWrap.style.setProperty('align-items', 'center', 'important');
                searchWrap.style.setProperty('justify-content', 'flex-start', 'important');
                searchWrap.style.setProperty('gap', '8px', 'important');
                searchWrap.style.setProperty('width', '100%', 'important');
                searchWrap.style.setProperty('max-width', '100%', 'important');
                searchWrap.style.setProperty('margin', '0 auto', 'important');
                searchWrap.style.setProperty('padding', '0', 'important');
                searchWrap.style.setProperty('flex-wrap', 'wrap', 'important');
            }

            if (hasLegacySearchColumns && searchWrap instanceof HTMLElement) {
                searchWrap.style.setProperty('display', 'flex', 'important');
                searchWrap.style.setProperty('align-items', 'center', 'important');
                searchWrap.style.setProperty('justify-content', 'flex-start', 'important');
                searchWrap.style.setProperty('gap', '8px', 'important');
                searchWrap.style.setProperty('width', '100%', 'important');
                searchWrap.style.setProperty('max-width', '100%', 'important');
                searchWrap.style.setProperty('margin', '0 auto', 'important');
                searchWrap.style.setProperty('padding', '0', 'important');
                searchWrap.style.setProperty('flex-wrap', 'wrap', 'important');
            }

            if (leftBox instanceof HTMLElement) {
                leftBox.style.setProperty('display', 'block', 'important');
                leftBox.style.setProperty('flex', '0 0 128px', 'important');
                leftBox.style.setProperty('width', '128px', 'important');
                leftBox.style.setProperty('min-width', '128px', 'important');
                leftBox.style.setProperty('margin', '0', 'important');
                leftBox.style.setProperty('padding', '0', 'important');
                leftBox.style.setProperty('float', 'none', 'important');
                leftBox.style.setProperty('overflow', 'visible', 'important');
            }

            if (rightBox instanceof HTMLElement) {
                rightBox.style.setProperty('display', 'flex', 'important');
                rightBox.style.setProperty('align-items', 'center', 'important');
                rightBox.style.setProperty('flex', '1 1 260px', 'important');
                rightBox.style.setProperty('width', 'auto', 'important');
                rightBox.style.setProperty('min-width', '0', 'important');
                rightBox.style.setProperty('margin', '0', 'important');
                rightBox.style.setProperty('padding', '0', 'important');
                rightBox.style.setProperty('float', 'none', 'important');
                rightBox.style.setProperty('overflow', 'visible', 'important');
            }

            if (nativeSelectHost instanceof HTMLElement) {
                nativeSelectHost.style.setProperty('display', 'block', 'important');
                nativeSelectHost.style.setProperty('flex', '0 0 128px', 'important');
                nativeSelectHost.style.setProperty('width', '128px', 'important');
                nativeSelectHost.style.setProperty('min-width', '128px', 'important');
                nativeSelectHost.style.setProperty('height', '44px', 'important');
                nativeSelectHost.style.setProperty('margin', '0', 'important');
                nativeSelectHost.style.setProperty('padding', '0', 'important');
                nativeSelectHost.style.setProperty('box-sizing', 'border-box', 'important');
                nativeSelectHost.style.setProperty('overflow', 'hidden', 'important');
            }

            if (nativeSelect instanceof HTMLSelectElement && nativeSelectHost instanceof HTMLElement) {
                const hostParent = leftBox instanceof HTMLElement
                    ? leftBox
                    : (searchWrap instanceof HTMLElement ? searchWrap : searchForm);
                if (nativeSelect.parentElement !== nativeSelectHost) {
                    nativeSelectHost.replaceChildren(nativeSelect);
                }
                if (nativeSelectHost.parentElement !== hostParent) {
                    if (hostParent === searchWrap && bottomSearch instanceof HTMLElement) {
                        hostParent.insertBefore(nativeSelectHost, bottomSearch);
                    } else {
                        hostParent.prepend(nativeSelectHost);
                    }
                }

                nativeSelect.style.setProperty('display', 'block', 'important');
                nativeSelect.style.setProperty('width', '100%', 'important');
                nativeSelect.style.setProperty('min-width', '128px', 'important');
                nativeSelect.style.setProperty('height', '44px', 'important');
                nativeSelect.style.setProperty('margin', '0', 'important');
                nativeSelect.style.setProperty('padding', '0 10px', 'important');
                nativeSelect.style.setProperty('border', '1px solid var(--dcuf-control-border, #c6d2e4)', 'important');
                nativeSelect.style.setProperty('border-radius', '12px', 'important');
                nativeSelect.style.setProperty('background', 'var(--dcuf-control-surface, linear-gradient(180deg, #ffffff 0%, #f4f7fb 100%))', 'important');
                nativeSelect.style.setProperty('box-shadow', 'inset 0 1px 0 rgba(255, 255, 255, 0.96), 0 4px 10px rgba(20, 39, 75, 0.08)', 'important');
                nativeSelect.style.setProperty('color', 'var(--dcuf-control-text, #333)', 'important');
                nativeSelect.style.setProperty('font-size', '13px', 'important');
                nativeSelect.style.setProperty('font-weight', '700', 'important');
                nativeSelect.style.setProperty('box-sizing', 'border-box', 'important');
                nativeSelect.style.setProperty('appearance', 'auto', 'important');
                nativeSelect.style.setProperty('-webkit-appearance', 'menulist', 'important');
                nativeSelect.style.setProperty('visibility', 'visible', 'important');
                nativeSelect.style.removeProperty('position');

                if (selectBox instanceof HTMLElement) {
                    selectBox.style.setProperty('display', 'none', 'important');
                    selectBox.style.setProperty('visibility', 'hidden', 'important');
                }
                if (searchLayer instanceof HTMLElement) {
                    searchLayer.style.setProperty('display', 'none', 'important');
                }
            }

            if (!(nativeSelect instanceof HTMLSelectElement) && hasLegacySearchColumns && leftBox instanceof HTMLElement && selectBox instanceof HTMLElement && selectBox.parentElement !== leftBox) {
                leftBox.replaceChildren(selectBox);
            }

            if (hasLegacySearchColumns && rightBox instanceof HTMLElement && bottomSearch instanceof HTMLElement && bottomSearch.parentElement !== rightBox) {
                rightBox.replaceChildren(bottomSearch);
            }

            if (!(nativeSelect instanceof HTMLSelectElement) && !hasLegacySearchColumns && searchWrap instanceof HTMLElement && selectBox instanceof HTMLElement && bottomSearch instanceof HTMLElement) {
                if (selectBox.parentElement !== searchWrap) {
                    searchWrap.insertBefore(selectBox, bottomSearch);
                } else if (selectBox.nextElementSibling !== bottomSearch) {
                    searchWrap.insertBefore(selectBox, bottomSearch);
                }
            }

            if (selectBox instanceof HTMLElement && !(nativeSelect instanceof HTMLSelectElement)) {
                selectBox.style.setProperty('display', 'flex', 'important');
                selectBox.style.setProperty('align-items', 'stretch', 'important');
                selectBox.style.setProperty('position', 'relative', 'important');
                selectBox.style.setProperty('flex', '0 0 128px', 'important');
                selectBox.style.setProperty('width', '128px', 'important');
                selectBox.style.setProperty('min-width', '128px', 'important');
                selectBox.style.setProperty('height', '44px', 'important');
                selectBox.style.setProperty('margin', '0', 'important');
                selectBox.style.setProperty('float', 'none', 'important');
                selectBox.style.setProperty('overflow', 'visible', 'important');
                selectBox.style.setProperty('box-sizing', 'border-box', 'important');
                selectBox.style.setProperty('visibility', 'visible', 'important');
                selectBox.style.setProperty('border', '1px solid var(--dcuf-control-border, #c6d2e4)', 'important');
                selectBox.style.setProperty('border-radius', '12px', 'important');
                selectBox.style.setProperty('background', 'var(--dcuf-control-surface, linear-gradient(180deg, #ffffff 0%, #f4f7fb 100%))', 'important');
                selectBox.style.setProperty('box-shadow', 'inset 0 1px 0 rgba(255, 255, 255, 0.96), 0 4px 10px rgba(20, 39, 75, 0.08)', 'important');
            }

            if (selectArea instanceof HTMLElement) {
                selectArea.style.setProperty('display', 'flex', 'important');
                selectArea.style.setProperty('align-items', 'center', 'important');
                selectArea.style.setProperty('justify-content', 'space-between', 'important');
                selectArea.style.setProperty('position', 'relative', 'important');
                selectArea.style.setProperty('width', '100%', 'important');
                selectArea.style.setProperty('height', '100%', 'important');
                selectArea.style.setProperty('padding', '0 30px 0 10px', 'important');
                selectArea.style.setProperty('border', '0', 'important');
                selectArea.style.setProperty('background', 'transparent', 'important');
                selectArea.style.setProperty('box-sizing', 'border-box', 'important');
                selectArea.style.setProperty('overflow', 'hidden', 'important');
                selectArea.style.setProperty('color', 'var(--dcuf-control-text, #333)', 'important');
            }

            if (selectInner instanceof HTMLElement) {
                selectInner.style.setProperty('display', 'block', 'important');
                selectInner.style.setProperty('position', 'absolute', 'important');
                selectInner.style.setProperty('right', '0', 'important');
                selectInner.style.setProperty('top', '0', 'important');
                selectInner.style.setProperty('width', '34px', 'important');
                selectInner.style.setProperty('height', '100%', 'important');
            }

            if (bottomSearch instanceof HTMLElement) {
                bottomSearch.style.setProperty('display', 'flex', 'important');
                bottomSearch.style.setProperty('align-items', 'center', 'important');
                bottomSearch.style.setProperty('flex', '1 1 260px', 'important');
                bottomSearch.style.setProperty('width', 'auto', 'important');
                bottomSearch.style.setProperty('height', 'auto', 'important');
                bottomSearch.style.setProperty('min-width', '0', 'important');
                bottomSearch.style.setProperty('margin', '0', 'important');
                bottomSearch.style.setProperty('float', 'none', 'important');
                bottomSearch.style.setProperty('position', 'static', 'important');
                bottomSearch.style.setProperty('inset', 'auto', 'important');
                bottomSearch.style.setProperty('transform', 'none', 'important');
            }

            if (innerSearch instanceof HTMLElement) {
                innerSearch.style.setProperty('display', 'block', 'important');
                innerSearch.style.setProperty('flex', '1 1 auto', 'important');
                innerSearch.style.setProperty('width', 'auto', 'important');
                innerSearch.style.setProperty('height', '44px', 'important');
                innerSearch.style.setProperty('margin', '0', 'important');
                innerSearch.style.setProperty('padding', '0', 'important');
                innerSearch.style.setProperty('border', '1px solid var(--dcuf-control-border, #c6d2e4)', 'important');
                innerSearch.style.setProperty('border-radius', '12px', 'important');
                innerSearch.style.setProperty('background', 'var(--dcuf-search-input, #fff)', 'important');
                innerSearch.style.setProperty('box-shadow', 'inset 0 1px 2px rgba(20, 39, 75, 0.06), 0 4px 10px rgba(20, 39, 75, 0.07)', 'important');
                innerSearch.style.setProperty('overflow', 'hidden', 'important');
            }

            if (keywordInput instanceof HTMLInputElement) {
                keywordInput.style.setProperty('width', '100%', 'important');
                keywordInput.style.setProperty('height', '42px', 'important');
                keywordInput.style.setProperty('margin', '0', 'important');
                keywordInput.style.setProperty('padding', '0 13px', 'important');
                keywordInput.style.setProperty('border', 'none', 'important');
                keywordInput.style.setProperty('border-radius', '11px', 'important');
                keywordInput.style.setProperty('background', 'var(--dcuf-search-input, #fff)', 'important');
                keywordInput.style.setProperty('box-shadow', 'none', 'important');
                keywordInput.style.setProperty('box-sizing', 'border-box', 'important');
            }

            if (searchButton instanceof HTMLElement) {
                searchButton.style.setProperty('flex', 'none', 'important');
                searchButton.style.setProperty('width', '44px');
                searchButton.style.setProperty('min-width', '44px');
                searchButton.style.setProperty('height', '44px');
                searchButton.style.setProperty('margin', '0', 'important');
            }

            if (searchLayer instanceof HTMLElement) {
                searchLayer.style.setProperty('left', '0', 'important');
                searchLayer.style.setProperty('top', 'calc(100% + 8px)', 'important');
                searchLayer.style.setProperty('border', '1px solid #3b4890', 'important');
                searchLayer.style.setProperty('background', '#fff', 'important');
                searchLayer.style.setProperty('box-shadow', 'none', 'important');
            }
        },

        enhanceBottomControls(bottomControls) {
            if (!(bottomControls instanceof HTMLElement)) return;

            const searchSlot = bottomControls.querySelector(`.${this.CUSTOM_CLASSES.SEARCH_SLOT}`);
            if (searchSlot instanceof HTMLElement) {
                this.normalizeSearchFormLayout(searchSlot);
                this.bindSearchDrawerReserve(searchSlot);
            }
            bottomControls.setAttribute('data-dcuf-controls-ready', '1');
        },

        createBottomControls(listWrap) {
            const gallTabs = this.findBottomControlElement(listWrap, this.SELECTORS.GALL_TABS)
                || this.findAdjacentViewListActionBar(listWrap);
            const pagination = this.findBottomControlElement(listWrap, this.SELECTORS.PAGINATION);
            const pageMoveBox = this.findBottomControlElement(listWrap, this.SELECTORS.PAGE_MOVE_BOX);
            const searchForm = this.findBottomControlElement(listWrap, this.SELECTORS.SEARCH_FORM);
            const searchLayer = this.findBottomControlElement(listWrap, this.SELECTORS.SEARCH_LAYER);


            if (!gallTabs && !pagination && !pageMoveBox && !searchForm) return null;


            const bottomControls = document.createElement('div');
            bottomControls.className = this.CUSTOM_CLASSES.BOTTOM_CONTROLS;


            if (gallTabs) {
                const buttonRow = document.createElement('div');
                buttonRow.className = 'custom-button-row dcuf-bottom-action-card';
                buttonRow.appendChild(gallTabs);
                bottomControls.appendChild(buttonRow);
            }


            if (pagination || pageMoveBox) {
                const paginationCard = document.createElement('div');
                paginationCard.className = 'dcuf-pagination-card';
                if (pagination) paginationCard.appendChild(pagination);
                if (pageMoveBox) paginationCard.appendChild(pageMoveBox);
                bottomControls.appendChild(paginationCard);
            }

            if (searchForm) {
                const searchCard = document.createElement('div');
                searchCard.className = 'dcuf-search-card';
                const searchSlot = document.createElement('div');
                searchSlot.className = this.CUSTOM_CLASSES.SEARCH_SLOT;
                if (searchLayer instanceof HTMLElement && !searchForm.contains(searchLayer)) {
                    searchForm.appendChild(searchLayer);
                }
                searchSlot.appendChild(searchForm);
                searchCard.appendChild(searchSlot);
                bottomControls.appendChild(searchCard);
            }

            this.enhanceBottomControls(bottomControls);

            return bottomControls;
        },

        ensureBottomControls(listWrap) {
            if (!(listWrap instanceof HTMLElement)) return null;
            let bottomControls = listWrap.querySelector(`.${this.CUSTOM_CLASSES.BOTTOM_CONTROLS}`);
            if (!(bottomControls instanceof HTMLElement)) {
                bottomControls = this.createBottomControls(listWrap);
            }
            if (bottomControls instanceof HTMLElement && bottomControls.parentElement !== listWrap) {
                listWrap.appendChild(bottomControls);
            }
            this.enhanceBottomControls(bottomControls);
            return bottomControls instanceof HTMLElement ? bottomControls : null;
        },

        bindTooltipEvents(listContainer) {
            if (!(listContainer instanceof HTMLElement)) return;
            if (listContainer.getAttribute(this.TOOLTIP_BOUND_ATTR) === '1') return;
            listContainer.setAttribute(this.TOOLTIP_BOUND_ATTR, '1');

            const tooltip = document.getElementById('custom-instant-tooltip');
            if (!tooltip) return;

            listContainer.addEventListener('mouseover', (e) => {
                const subject = e.target.closest('.gall_subject');
                if (subject && subject.title) {
                    tooltip.textContent = subject.title;
                    tooltip.style.display = 'block';
                }
            });
            listContainer.addEventListener('mouseout', () => {
                tooltip.style.display = 'none';
            });
            listContainer.addEventListener('mousemove', (e) => {
                if (tooltip.style.display === 'block') {
                    tooltip.style.left = `${e.clientX + 10}px`;
                    tooltip.style.top = `${e.clientY + 10}px`;
                }
            });
        },

        getOrAssignRowId(originalRow) {
            if (!(originalRow instanceof HTMLElement)) return '';
            let rowId = originalRow.getAttribute(this.DATA_ATTR);
            if (rowId) return rowId;
            rowId = `dcuf-row-${this._nextRowId++}`;
            originalRow.setAttribute(this.DATA_ATTR, rowId);
            return rowId;
        },

        captureListTransaction(listWrap, originalTable) {
            const scope = this.resolveBottomControlScope(listWrap) || listWrap;
            const movableSelector = [
                this.SELECTORS.PAGINATION, this.SELECTORS.GALL_TABS, this.SELECTORS.SEARCH_FORM,
                this.SELECTORS.SEARCH_LAYER, this.SELECTORS.PAGE_MOVE_BOX, '.view_bottom_btnbox'
            ].join(', ');
            const movedNodes = Array.from(scope.querySelectorAll(movableSelector))
                .filter((node) => !node.closest(`.${this.CUSTOM_CLASSES.BOTTOM_CONTROLS}`))
                .map((node) => ({
                    node, parent: node.parentNode, nextSibling: node.nextSibling,
                    style: node.getAttribute('style'), className: node.getAttribute('class')
                }));
            return {
                originalTableStyle: originalTable.getAttribute('style'),
                transformedValue: listWrap.getAttribute(this.TRANSFORMED_ATTR),
                existingCustomLists: new Set(listWrap.querySelectorAll(`.${this.CUSTOM_CLASSES.MOBILE_LIST}`)),
                existingBottomControls: new Set(scope.querySelectorAll(`.${this.CUSTOM_CLASSES.BOTTOM_CONTROLS}`)),
                movedNodes
            };
        },

        rollbackListState(state, reason = 'boot-degraded') {
            if (!state) return;
            state.tbodyObserver?.disconnect();
            state.syncScheduler?.cancel?.();
            const transaction = state.transaction || {};
            const listWrap = state.listWrap;
            const originalTable = state.originalTable;
            if (state.newListContainer instanceof HTMLElement && !transaction.existingCustomLists?.has(state.newListContainer)) state.newListContainer.remove();
            const scope = this.resolveBottomControlScope(listWrap) || listWrap;
            scope?.querySelectorAll?.(`.${this.CUSTOM_CLASSES.BOTTOM_CONTROLS}`).forEach((node) => {
                if (!transaction.existingBottomControls?.has(node)) node.remove();
            });
            Array.from(transaction.movedNodes || []).reverse().forEach((entry) => {
                if (!entry?.node || !entry.parent) return;
                if (entry.nextSibling?.parentNode === entry.parent) entry.parent.insertBefore(entry.node, entry.nextSibling);
                else entry.parent.appendChild(entry.node);
                if (entry.style === null) entry.node.removeAttribute('style');
                else entry.node.setAttribute('style', entry.style);
                if (entry.className === null) entry.node.removeAttribute('class');
                else entry.node.setAttribute('class', entry.className);
            });
            if (originalTable instanceof HTMLElement) {
                if (transaction.originalTableStyle === null) originalTable.removeAttribute('style');
                else originalTable.setAttribute('style', transaction.originalTableStyle);
            }
            if (listWrap instanceof HTMLElement) {
                if (transaction.transformedValue === null) listWrap.removeAttribute(this.TRANSFORMED_ATTR);
                else listWrap.setAttribute(this.TRANSFORMED_ATTR, transaction.transformedValue);
                this.LIST_STATE_MAP.delete(listWrap);
            }
            this.ACTIVE_LIST_STATES.delete(state);
            state.rolledBack = true;
            this.recordDiagnostic('ui.listState.rolledBack');
            this.getRuntimeCoordinator()?.noteDiagnostic?.('ui.list.rollback', { reason });
        },

        rollbackInitialListTransactions(reason = 'boot-degraded') {
            Array.from(this.ACTIVE_LIST_STATES).reverse().forEach((state) => this.rollbackListState(state, reason));
        },

        createListState(listWrap, originalTable, originalTbody, newListContainer, transaction = null) {
            const state = {
                runtimeId: this._nextListRuntimeId++,
                listWrap,
                originalTable,
                originalTbody,
                newListContainer,
                transaction,
                committed: false,
                itemByRowId: new Map(),
                dirtyRows: new Set(),
                tbodyObserver: null,
                syncScheduler: null,
                rebuildAll: false,
                mutationGeneration: 0,
                lastSyncedGeneration: -1,
                lastSyncReason: 'init'
            };

            state.syncScheduler = this.createPhaseScheduler(`ui-list-${state.runtimeId}`, ({ delay }) => {
                if (delay > 0 && state.lastSyncedGeneration === state.mutationGeneration) {
                    this.recordDiagnostic('ui.listState.skippedUnchanged');
                    return;
                }
                this.syncListState(state, state.lastSyncReason);
                state.lastSyncedGeneration = state.mutationGeneration;
            }, [90]);

            this.ACTIVE_LIST_STATES.add(state);
            return state;
        },

        hydrateExistingListItems(state) {
            if (!(state?.newListContainer instanceof HTMLElement)) return;
            state.itemByRowId.clear();
            state.newListContainer.querySelectorAll(`.${this.CUSTOM_CLASSES.POST_ITEM}[${this.DATA_ATTR}]`).forEach((item) => {
                const rowId = item.getAttribute(this.DATA_ATTR);
                if (rowId) state.itemByRowId.set(rowId, item);
            });
        },

        destroyListState(state, reason = 'destroy') {
            if (!state) return;
            if (state.tbodyObserver) state.tbodyObserver.disconnect();
            if (state.syncScheduler && typeof state.syncScheduler.cancel === 'function') {
                state.syncScheduler.cancel();
            }
            if (state.listWrap instanceof HTMLElement) {
                state.listWrap.removeAttribute(this.TRANSFORMED_ATTR);
            }
            this.ACTIVE_LIST_STATES.delete(state);
            this.LIST_STATE_MAP.delete(state.listWrap);
            if (state.itemByRowId && typeof state.itemByRowId.clear === 'function') {
                state.itemByRowId.clear();
            }
            if (state.dirtyRows && typeof state.dirtyRows.clear === 'function') {
                state.dirtyRows.clear();
            }
            state.listWrap = null;
            state.originalTable = null;
            state.originalTbody = null;
            state.newListContainer = null;
            state.itemByRowId = null;
            state.tbodyObserver = null;
            state.syncScheduler = null;
            this.recordDiagnostic('ui.listState.destroyed');
        },


        applyForceRefreshPagination(containerElement) {
            if (!(containerElement instanceof HTMLElement)) return;
            if (containerElement.getAttribute(this.PAGINATION_BOUND_ATTR) === '1') return;
            containerElement.setAttribute(this.PAGINATION_BOUND_ATTR, '1');
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

        scheduleListSync(state, reason = 'sync', { rebuildAll = false, dirtyRows = null } = {}) {
            if (!state) return;
            if (rebuildAll) state.rebuildAll = true;
            if (dirtyRows && typeof dirtyRows[Symbol.iterator] === 'function') {
                Array.from(dirtyRows).forEach((row) => {
                    if (row instanceof HTMLElement) state.dirtyRows?.add(row);
                });
            }
            state.mutationGeneration = (Number(state.mutationGeneration) || 0) + 1;
            state.lastSyncReason = reason;
            state.syncScheduler?.schedule({ reason });
        },

        syncListState(state, reason = 'sync') {
            if (!state?.listWrap?.isConnected) {
                this.destroyListState(state, 'list-wrap-detached');
                return;
            }

            const originalTable = state.listWrap.querySelector(this.SELECTORS.ORIGINAL_TABLE);
            const originalTbody = originalTable?.querySelector(this.SELECTORS.ORIGINAL_TBODY);
            if (!originalTable || !originalTbody) return;

            if (originalTbody !== state.originalTbody) {
                this.destroyListState(state, 'tbody-replaced');
                this.ensureListRuntime(state.listWrap, `${reason}:tbody-replaced`);
                return;
            }

            state.originalTable = originalTable;
            state.originalTbody = originalTbody;

            if (!state.newListContainer.isConnected && state.originalTable.parentNode) {
                state.originalTable.parentNode.insertBefore(state.newListContainer, state.originalTable.nextSibling);
            }

            const shouldRebuildAll = state.rebuildAll;
            const originalRows = Array.from(state.originalTbody.querySelectorAll(this.SELECTORS.ORIGINAL_POST_ITEM));
            const seenRowIds = new Set();
            let previousItem = null;
            let rebuiltRowCount = 0;

            originalRows.forEach((row) => {
                try {
                    const rowId = this.getOrAssignRowId(row);
                    if (!rowId) return;
                    seenRowIds.add(rowId);

                    let mirroredItem = state.itemByRowId.get(rowId);
                    if ((shouldRebuildAll || state.dirtyRows?.has(row)) && mirroredItem instanceof HTMLElement) {
                        mirroredItem.remove();
                        state.itemByRowId.delete(rowId);
                        mirroredItem = null;
                        rebuiltRowCount += 1;
                    }

                    if (!(mirroredItem instanceof HTMLElement)) {
                        mirroredItem = this.createMobileListItem(row, rowId);
                        if (!mirroredItem) return;
                        this.proxyClick(mirroredItem, row);
                        state.itemByRowId.set(rowId, mirroredItem);
                    }

                    this.updateItemVisibility(row, mirroredItem);

                    if (previousItem === null) {
                        if (state.newListContainer.firstElementChild !== mirroredItem) {
                            state.newListContainer.insertBefore(mirroredItem, state.newListContainer.firstElementChild);
                        }
                    } else if (previousItem.nextElementSibling !== mirroredItem) {
                        state.newListContainer.insertBefore(mirroredItem, previousItem.nextElementSibling);
                    }

                    previousItem = mirroredItem;
                } catch (error) {
                    console.error('[DC Filter+UI] Failed to sync a mirrored post item:', error, row);
                }
            });

            Array.from(state.itemByRowId.entries()).forEach(([rowId, mirroredItem]) => {
                if (seenRowIds.has(rowId)) return;
                if (mirroredItem instanceof HTMLElement) mirroredItem.remove();
                state.itemByRowId.delete(rowId);
            });

            state.rebuildAll = false;
            state.dirtyRows?.clear();
            state.listWrap.setAttribute(this.TRANSFORMED_ATTR, 'true');
            state.originalTable.style.setProperty('display', 'none', 'important');
            state.committed = true;
            if (rebuiltRowCount > 0) this.recordDiagnostic('ui.listRows.rebuilt', rebuiltRowCount);
            this.getRuntimeCoordinator()?.setDiagnosticGauge?.('ui.listRows.lastRebuilt', rebuiltRowCount);
            this.recordDiagnostic('ui.listState.synced');
        },

        attachOriginalTbodyObserver(state) {
            if (!state?.originalTbody || state.tbodyObserver) return;

            state.tbodyObserver = new MutationObserver((mutations) => {
                const visibilityTargets = new Set();
                const dirtyRows = new Set();
                let needsResync = false;

                const addDirtyRow = (node) => {
                    const element = node instanceof Element ? node : node?.parentElement;
                    if (!(element instanceof Element)) return;
                    const row = element.matches?.(this.SELECTORS.ORIGINAL_POST_ITEM)
                        ? element
                        : element.closest?.(this.SELECTORS.ORIGINAL_POST_ITEM);
                    if (row instanceof HTMLElement && row.closest(this.SELECTORS.ORIGINAL_TBODY) === state.originalTbody) {
                        dirtyRows.add(row);
                    }
                };

                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
                        const originalRow = mutation.target;
                        if (originalRow instanceof HTMLElement && originalRow.matches(this.SELECTORS.ORIGINAL_POST_ITEM)) {
                            visibilityTargets.add(originalRow);
                        }
                        return;
                    }

                    if (mutation.type === 'characterData') {
                        addDirtyRow(mutation.target);
                        needsResync = true;
                        return;
                    }

                    if (mutation.type === 'childList') {
                        addDirtyRow(mutation.target);
                        mutation.addedNodes.forEach(addDirtyRow);
                        mutation.removedNodes.forEach(addDirtyRow);
                        needsResync = true;
                    }
                });

                visibilityTargets.forEach((originalRow) => {
                    const rowId = originalRow.getAttribute(this.DATA_ATTR);
                    if (!rowId) return;
                    const mirroredItem = state.itemByRowId.get(rowId);
                    if (mirroredItem) this.updateItemVisibility(originalRow, mirroredItem);
                });

                if (needsResync) {
                    this.scheduleListSync(state, 'tbody-mutated', { dirtyRows });
                }
            });

            state.tbodyObserver.observe(state.originalTbody, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: true,
                attributeFilter: ['style', 'class']
            });
        },

        ensureListRuntime(listWrap, reason = 'ensure') {
            if (!(listWrap instanceof HTMLElement)) return null;
            const ownedListWrap = this.resolveOwnedListWrap(listWrap);
            if (!(ownedListWrap instanceof HTMLElement) || ownedListWrap !== listWrap) return null;

            const originalTable = listWrap.querySelector(this.SELECTORS.ORIGINAL_TABLE);
            const originalTbody = originalTable?.querySelector(this.SELECTORS.ORIGINAL_TBODY);
            if (!originalTable || !originalTbody) return null;

            const existingState = this.LIST_STATE_MAP.get(listWrap);
            if (existingState && existingState.originalTbody === originalTbody && existingState.newListContainer instanceof HTMLElement) {
                this.ensureBottomControls(listWrap);
                this.enhanceOriginalSearchForms(listWrap);
                this.scheduleListSync(existingState, reason);
                return existingState;
            }

            if (existingState) this.destroyListState(existingState, 'list-runtime-refresh');

            const transaction = this.captureListTransaction(listWrap, originalTable);
            let newListContainer = null;
            let state = null;
            try {
                newListContainer = listWrap.querySelector(`.${this.CUSTOM_CLASSES.MOBILE_LIST}`);
                if (!(newListContainer instanceof HTMLElement)) {
                    newListContainer = document.createElement('div');
                    newListContainer.className = this.CUSTOM_CLASSES.MOBILE_LIST;
                    originalTable.parentNode.insertBefore(newListContainer, originalTable.nextSibling);
                }

                this.bindTooltipEvents(newListContainer);
                this.ensureBottomControls(listWrap);
                this.enhanceOriginalSearchForms(listWrap);
                this.applyForceRefreshPagination(listWrap);
                const testBoot = __dcufRoot.__DCUF_TESTBED_CONFIG__?.boot;
                if (testBoot?.failListPrepareOnce && !__dcufRoot.__dcufListPrepareFailureInjected) {
                    __dcufRoot.__dcufListPrepareFailureInjected = true;
                    throw new Error('testbed list prepare failure');
                }

                state = this.createListState(listWrap, originalTable, originalTbody, newListContainer, transaction);
                this.LIST_STATE_MAP.set(listWrap, state);
                this.hydrateExistingListItems(state);
                this.attachOriginalTbodyObserver(state);
                this.scheduleListSync(state, reason, { rebuildAll: true });
                this.recordDiagnostic('ui.listState.created');
                return state;
            } catch (error) {
                this.rollbackListState(state || { listWrap, originalTable, newListContainer, transaction }, 'list-prepare-failed');
                throw error;
            }
        },

        ensureKnownListRuntimes(root = document, reason = 'ensure-known') {
            this.collectOwnedListWraps(root).forEach((listWrap) => this.ensureListRuntime(listWrap, reason));
        },

        ensureListRuntimesFromCandidates(candidates, reason = 'ensure-candidates') {
            if (!candidates || typeof candidates[Symbol.iterator] !== 'function') return [];
            const seen = new Set();
            const resolved = [];
            Array.from(candidates).forEach((candidate) => {
                const listWrap = this.resolveOwnedListWrap(candidate);
                if (!(listWrap instanceof HTMLElement) || seen.has(listWrap)) return;
                seen.add(listWrap);
                resolved.push(listWrap);
                this.ensureListRuntime(listWrap, reason);
            });
            return resolved;
        },

        subscribeListRuntimeUpdates() {
            if (typeof this._listMutationUnsubscribe === 'function') return;
            if (!this.getPageContext().hasListSurface) return;

            const runtimeCoordinator = this.getRuntimeCoordinator();
            if (runtimeCoordinator && typeof runtimeCoordinator.subscribeMutations === 'function') {
                this._listMutationUnsubscribe = runtimeCoordinator.subscribeMutations('ui-list-runtime', (payload) => {
                    const candidates = payload.collectMatches([
                        this.SELECTORS.LIST_WRAP,
                        this.SELECTORS.ORIGINAL_TABLE,
                        this.SELECTORS.ORIGINAL_TBODY,
                        this.SELECTORS.GALL_TABS,
                        this.SELECTORS.PAGINATION,
                        this.SELECTORS.PAGE_MOVE_BOX,
                        this.SELECTORS.SEARCH_FORM
                    ], { includeRoots: true });
                    if (candidates.length === 0) return;

                    this.ensureListRuntimesFromCandidates(candidates, 'mutation-bus');
                }, { contexts: ['list-surface'] });
                return;
            }

            if (window.__dcufUiListObserver) return;
            const observer = new MutationObserver((mutations) => {
                const candidates = [];
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (!(node instanceof Element)) return;
                        candidates.push(node);
                    });
                });
                this.ensureListRuntimesFromCandidates(candidates, 'mutation-observer');
            });
            observer.observe(document.body, { childList: true, subtree: true });
            window.__dcufUiListObserver = observer;
        },

        processAllLists(reason = 'processAllLists') {
            this.recordDiagnostic('ui.processAllLists');
            this.ensureKnownListRuntimes(document, `${reason}:full-scan`);
        },

        isBoardPage(pageName) {
            return this.getPageContext().type === pageName;
        },

        getPageContext() {
            const sharedContext = window.__dcufPageContext;
            if (sharedContext && typeof sharedContext === 'object') return sharedContext;
            const type = ((window.location.pathname || '').match(/\/board\/(lists|view|write)(?:\/|$)/) || [])[1] || 'other';
            return {
                type,
                isList: type === 'lists',
                isView: type === 'view',
                isWrite: type === 'write',
                isOther: type === 'other',
                isTargetPage: type !== 'other',
                hasListSurface: type === 'lists' || type === 'view',
                hasComments: type === 'view'
            };
        },

        isListPage() {
            return this.isBoardPage('lists');
        },

        isViewPage() {
            return this.isBoardPage('view');
        },

        isWritePage() {
            return this.isBoardPage('write');
        },

        shouldEnsureListRuntimeForReveal() {
            return this.isListPage();
        },

        updateInitialRevealDebug(_state, _meta = {}) {
        },

        updatePostRevealRecoveryDebug(_state, _meta = {}) {
        },

        evaluateListInitialRevealState(listWrap) {
            if (!(listWrap instanceof HTMLElement)) {
                return {
                    ready: false,
                    reason: 'waiting-list',
                    detail: { message: 'list wrap unavailable' }
                };
            }

            const originalTable = listWrap.querySelector(this.SELECTORS.ORIGINAL_TABLE);
            const originalTbody = originalTable?.querySelector(this.SELECTORS.ORIGINAL_TBODY);
            const newListContainer = listWrap.querySelector(`.${this.CUSTOM_CLASSES.MOBILE_LIST}`);
            if (!(newListContainer instanceof HTMLElement)) {
                return {
                    ready: false,
                    reason: 'waiting-list',
                    detail: {
                        listWrapClass: listWrap.className || null,
                        hasOriginalTable: !!originalTable,
                        hasOriginalTbody: !!originalTbody
                    }
                };
            }

            const originalRowCount = originalTbody
                ? originalTbody.querySelectorAll(this.SELECTORS.ORIGINAL_POST_ITEM).length
                : 0;
            const customItemCount = newListContainer.querySelectorAll(`.${this.CUSTOM_CLASSES.POST_ITEM}`).length;
            if (originalRowCount > 0 && customItemCount === 0) {
                return {
                    ready: false,
                    reason: 'waiting-items',
                    detail: { originalRowCount, customItemCount }
                };
            }

            if (customItemCount === 0) {
                return {
                    ready: true,
                    reason: 'ready',
                    detail: { originalRowCount, customItemCount }
                };
            }

            const themeBridge = this.getPhase1Theme();
            if (typeof themeBridge?.verify !== 'function') {
                return {
                    ready: false,
                    reason: 'waiting-style',
                    detail: {
                        originalRowCount,
                        customItemCount,
                        missingThemeBridge: true
                    }
                };
            }

            const verifyResult = themeBridge.verify(newListContainer);
            if (!verifyResult?.ready) {
                return {
                    ready: false,
                    reason: 'waiting-style',
                    detail: {
                        originalRowCount,
                        customItemCount,
                        verifyReason: verifyResult?.reason || 'unknown',
                        verifyDetail: verifyResult?.detail || null
                    }
                };
            }

            return {
                ready: true,
                reason: 'ready',
                detail: {
                    originalRowCount,
                    customItemCount,
                    verifyReason: verifyResult.reason || 'ready',
                    verifyDetail: verifyResult.detail || null
                }
            };
        },

        evaluateViewInitialRevealState() {
            const viewWrap = document.querySelector('.view_content_wrap');
            if (!(viewWrap instanceof HTMLElement)) {
                return {
                    ready: false,
                    reason: 'waiting-view',
                    detail: { hasViewWrap: false }
                };
            }

            const viewBottom = document.querySelector('.view_bottom');
            const recommendBox = viewWrap.querySelector('.btn_recommend_box');
            const commentSignal = document.querySelector('#focus_cmt, .view_comment, div[id^="comment_wrap_"]');
            const commentBox = document.querySelector('#focus_cmt .comment_box, div[id^="comment_wrap_"] .comment_box, .view_comment .comment_box');
            const commentWriteBox = document.querySelector('#focus_cmt > .cmt_write_box, #focus_cmt .cmt_write_box, .view_comment .cmt_write_box');

            const themeBridge = this.getPhase1ViewTheme();
            if (typeof themeBridge?.verify !== 'function') {
                return {
                    ready: false,
                    reason: 'waiting-style',
                    detail: {
                        hasViewWrap: true,
                        hasViewBottom: viewBottom instanceof HTMLElement,
                        hasRecommendBox: recommendBox instanceof HTMLElement,
                        revealTheme: 'view',
                        missingThemeBridge: true
                    }
                };
            }

            const verifyResult = themeBridge.verify(document, { mode: 'core' });
            if (!verifyResult?.ready) {
                return {
                    ready: false,
                    reason: verifyResult?.reason === 'waiting-comments' ? 'waiting-comments' : 'waiting-style',
                    detail: {
                        hasViewWrap: true,
                        hasViewBottom: viewBottom instanceof HTMLElement,
                        hasRecommendBox: recommendBox instanceof HTMLElement,
                        hasCommentSignal: commentSignal instanceof HTMLElement,
                        hasCommentBox: commentBox instanceof HTMLElement,
                        hasCommentWriteBox: commentWriteBox instanceof HTMLElement,
                        revealTheme: 'view',
                        verifyReason: verifyResult?.reason || 'unknown',
                        verifyDetail: verifyResult?.detail || null
                    }
                };
            }

            return {
                ready: true,
                reason: 'ready',
                detail: {
                    hasViewWrap: true,
                    hasViewBottom: viewBottom instanceof HTMLElement,
                    hasRecommendBox: recommendBox instanceof HTMLElement,
                    hasCommentSignal: commentSignal instanceof HTMLElement,
                    hasCommentBox: commentBox instanceof HTMLElement,
                    hasCommentWriteBox: commentWriteBox instanceof HTMLElement,
                    revealTheme: 'view',
                    verifyReason: verifyResult.reason || 'ready',
                    verifyDetail: verifyResult.detail || null
                }
            };
        },

        evaluateViewPostRevealRecoveryState() {
            const viewWrap = document.querySelector('.view_content_wrap');
            if (!(viewWrap instanceof HTMLElement)) {
                return {
                    ready: false,
                    reason: 'waiting-view',
                    detail: {
                        phase: 'post-reveal',
                        hasViewWrap: false,
                        revealTheme: 'view'
                    }
                };
            }

            const viewBottom = document.querySelector('.view_bottom');
            const recommendBox = viewWrap.querySelector('.btn_recommend_box');
            const commentSignal = document.querySelector('#focus_cmt, .view_comment, div[id^="comment_wrap_"]');
            const commentBox = document.querySelector('#focus_cmt .comment_box, div[id^="comment_wrap_"] .comment_box, .view_comment .comment_box');
            const commentWriteBox = document.querySelector('#focus_cmt > .cmt_write_box, #focus_cmt .cmt_write_box, .view_comment .cmt_write_box');
            const hasBottomListSignal = !!document.querySelector('.view_bottom .gall_listwrap, .view_bottom .list_wrap, .view_bottom table.gall_list, .view_bottom tr.ub-content');
            const embeddedListWraps = this.collectOwnedListWraps(viewBottom || document);

            if (!(recommendBox instanceof HTMLElement)) {
                return {
                    ready: false,
                    reason: 'waiting-view',
                    detail: {
                        phase: 'post-reveal',
                        hasViewWrap: true,
                        hasViewBottom: viewBottom instanceof HTMLElement,
                        hasRecommendBox: false,
                        hasBottomListSignal,
                        embeddedListCount: embeddedListWraps.length,
                        revealTheme: 'view'
                    }
                };
            }

            if (!(viewBottom instanceof HTMLElement)) {
                return {
                    ready: false,
                    reason: 'waiting-view',
                    detail: {
                        phase: 'post-reveal',
                        hasViewWrap: true,
                        hasViewBottom: false,
                        hasRecommendBox: true,
                        hasBottomListSignal,
                        embeddedListCount: embeddedListWraps.length,
                        revealTheme: 'view'
                    }
                };
            }

            if (commentSignal instanceof HTMLElement && !(commentBox instanceof HTMLElement) && !(commentWriteBox instanceof HTMLElement)) {
                return {
                    ready: false,
                    reason: 'waiting-comments',
                    detail: {
                        phase: 'post-reveal',
                        hasViewWrap: true,
                        hasViewBottom: true,
                        hasRecommendBox: true,
                        hasCommentSignal: true,
                        hasCommentBox: false,
                        hasCommentWriteBox: false,
                        revealTheme: 'view'
                    }
                };
            }

            if (hasBottomListSignal && embeddedListWraps.length === 0) {
                return {
                    ready: false,
                    reason: 'waiting-list',
                    detail: {
                        phase: 'post-reveal',
                        hasViewWrap: true,
                        hasViewBottom: true,
                        hasRecommendBox: true,
                        hasBottomListSignal: true,
                        embeddedListCount: 0,
                        revealTheme: 'list'
                    }
                };
            }

            for (let index = 0; index < embeddedListWraps.length; index += 1) {
                const wrapState = this.evaluateListInitialRevealState(embeddedListWraps[index]);
                if (!wrapState.ready) {
                    return {
                        ready: false,
                        reason: wrapState.reason,
                        detail: {
                            phase: 'post-reveal',
                            hasViewWrap: true,
                            hasViewBottom: true,
                            hasRecommendBox: true,
                            hasBottomListSignal,
                            embeddedListCount: embeddedListWraps.length,
                            embeddedListIndex: index,
                            revealTheme: wrapState.reason === 'waiting-style' ? 'list' : 'view',
                            ...wrapState.detail
                        }
                    };
                }
            }

            const themeBridge = this.getPhase1ViewTheme();
            if (typeof themeBridge?.verify !== 'function') {
                return {
                    ready: false,
                    reason: 'waiting-style',
                    detail: {
                        phase: 'post-reveal',
                        hasViewWrap: true,
                        hasViewBottom: true,
                        hasRecommendBox: true,
                        hasBottomListSignal,
                        embeddedListCount: embeddedListWraps.length,
                        missingThemeBridge: true,
                        revealTheme: 'view'
                    }
                };
            }

            const verifyResult = themeBridge.verify(document, { mode: 'full' });
            if (!verifyResult?.ready) {
                return {
                    ready: false,
                    reason: verifyResult?.reason === 'waiting-comments'
                        ? 'waiting-comments'
                        : (verifyResult?.reason === 'waiting-view' ? 'waiting-view' : 'waiting-style'),
                    detail: {
                        phase: 'post-reveal',
                        hasViewWrap: true,
                        hasViewBottom: true,
                        hasRecommendBox: true,
                        hasBottomListSignal,
                        embeddedListCount: embeddedListWraps.length,
                        hasCommentSignal: commentSignal instanceof HTMLElement,
                        hasCommentBox: commentBox instanceof HTMLElement,
                        hasCommentWriteBox: commentWriteBox instanceof HTMLElement,
                        verifyReason: verifyResult?.reason || 'unknown',
                        verifyDetail: verifyResult?.detail || null,
                        revealTheme: 'view'
                    }
                };
            }

            return {
                ready: true,
                reason: 'ready',
                detail: {
                    phase: 'post-reveal',
                    hasViewWrap: true,
                    hasViewBottom: true,
                    hasRecommendBox: true,
                    hasBottomListSignal,
                    embeddedListCount: embeddedListWraps.length,
                    hasCommentSignal: commentSignal instanceof HTMLElement,
                    hasCommentBox: commentBox instanceof HTMLElement,
                    hasCommentWriteBox: commentWriteBox instanceof HTMLElement,
                    verifyReason: verifyResult.reason || 'ready',
                    verifyDetail: verifyResult.detail || null,
                    revealTheme: 'view'
                }
            };
        },

        getInitialRevealState() {
            if (this.isWritePage()) {
                return { ready: true, reason: 'non-list', detail: { pageType: 'write' } };
            }
            if (this.isViewPage()) {
                return this.evaluateViewInitialRevealState();
            }
            if (!this.isListPage()) {
                return { ready: true, reason: 'non-list', detail: { pageType: 'other' } };
            }

            const targetWraps = this.collectOwnedListWraps(document);
            if (targetWraps.length === 0) {
                return {
                    ready: false,
                    reason: 'waiting-list',
                    detail: { targetWrapCount: 0 }
                };
            }

            for (let index = 0; index < targetWraps.length; index += 1) {
                const wrapState = this.evaluateListInitialRevealState(targetWraps[index]);
                if (!wrapState.ready) {
                    return {
                        ready: false,
                        reason: wrapState.reason,
                        detail: {
                            targetWrapCount: targetWraps.length,
                            wrapIndex: index,
                            ...wrapState.detail
                        }
                    };
                }
            }

            return {
                ready: true,
                reason: 'ready',
                detail: { targetWrapCount: targetWraps.length }
            };
        },

        getInitialRevealMutationSelectors() {
            if (this.isViewPage()) {
                return [
                    '.view_content_wrap',
                    '.gallview_head',
                    '.gallview_contents',
                    '.btn_recommend_box',
                    '.writing_view_box',
                    '.write_div',
                    '.view_comment',
                    '.comment_box',
                    '.cmt_write_box',
                    '#focus_cmt'
                ];
            }

            return [
                this.SELECTORS.LIST_WRAP,
                this.SELECTORS.ORIGINAL_TABLE,
                this.SELECTORS.ORIGINAL_TBODY,
                this.SELECTORS.ORIGINAL_POST_ITEM
            ];
        },

        isInitialUiReady() {
            return this.getInitialRevealState().ready;
        },

        waitForInitialRevealReady(timeoutMs = 6000) {
            return new Promise((resolve) => {
                this.ensureBootUi('initial-reveal:start');
                this._initialRevealStartedAt = Date.now();
                if (this.shouldEnsureListRuntimeForReveal()) {
                    this.ensureKnownListRuntimes(document, 'initial-reveal:start');
                }

                let lastState = this.getInitialRevealState();
                let refreshTriggered = false;
                let timeoutExtended = false;
                const timeoutDeadline = Date.now() + timeoutMs;
                this.updateInitialRevealDebug(lastState, {
                    refreshAttempted: false,
                    refreshTriggered: false
                });
                if (lastState.ready) {
                    this._initialRevealStartedAt = 0;
                    resolve(lastState.reason);
                    return;
                }

                let rafId = 0;
                let timeoutId = 0;
                let refreshTimerId = 0;
                let observer = null;
                let unsubscribe = null;

                const cleanup = () => {
                    if (typeof unsubscribe === 'function') unsubscribe();
                    if (observer) observer.disconnect();
                    if (rafId) window.cancelAnimationFrame(rafId);
                    if (refreshTimerId) window.clearTimeout(refreshTimerId);
                    if (timeoutId) window.clearTimeout(timeoutId);
                    this._initialRevealStartedAt = 0;
                };

                const finish = (reason) => {
                    cleanup();
                    resolve(reason);
                };

                const scheduleTimeout = (deadline) => {
                    if (timeoutId) window.clearTimeout(timeoutId);
                    const delay = Math.max(0, deadline - Date.now());
                    timeoutId = window.setTimeout(() => {
                        if (this.shouldEnsureListRuntimeForReveal()) {
                            this.processAllLists('initial-reveal-timeout');
                        }
                        lastState = this.getInitialRevealState();
                        this.updateInitialRevealDebug(lastState, {
                            refreshAttempted: refreshTriggered,
                            refreshTriggered
                        });
                        if (lastState.ready) {
                            finish(lastState.reason);
                            return;
                        }

                        const timeoutReason = `timeout-${lastState.reason || 'unknown'}`;
                        console.warn('[DC Filter+UI] Initial reveal readiness timed out; revealing page with current state.', lastState);
                        finish(timeoutReason);
                    }, delay);
                };

                const scheduleCheck = (reason = 'mutation', candidates = null) => {
                    if (rafId) return;
                    rafId = window.requestAnimationFrame(() => {
                        rafId = 0;
                        checkReady(reason, candidates);
                    });
                };

                const maybeRefreshStyle = (state, reason = 'check') => {
                    if (!state || state.reason !== 'waiting-style' || refreshTriggered) return false;
                    const themeBridge = this.getRevealThemeForState(state);
                    if (typeof themeBridge?.ensure !== 'function') return false;

                    refreshTriggered = true;
                    if (!timeoutExtended) {
                        timeoutExtended = true;
                        scheduleTimeout(timeoutDeadline + 600);
                    }

                    try {
                        themeBridge.ensure({ refresh: true, reason: `initial-reveal:${reason}` });
                    } catch (error) {
                        console.warn('[DC Filter+UI] Initial reveal style refresh failed:', error);
                        return false;
                    }

                    this.updateInitialRevealDebug(state, {
                        refreshAttempted: true,
                        refreshTriggered: true
                    });
                    scheduleCheck(`style-refresh:${reason}`);
                    refreshTimerId = window.setTimeout(() => {
                        refreshTimerId = 0;
                        scheduleCheck(`style-refresh-delay:${reason}`);
                    }, 120);
                    return true;
                };

                const checkReady = (reason = 'check', candidates = null) => {
                    try {
                        this.ensureBootUi(`initial-reveal:${reason}`);
                        if (this.shouldEnsureListRuntimeForReveal()) {
                            if (candidates && typeof candidates[Symbol.iterator] === 'function') {
                                this.ensureListRuntimesFromCandidates(candidates, `initial-reveal:${reason}`);
                            } else {
                                this.ensureKnownListRuntimes(document, `initial-reveal:${reason}`);
                            }
                        }
                        lastState = this.getInitialRevealState();
                        this.updateInitialRevealDebug(lastState, {
                            refreshAttempted: refreshTriggered,
                            refreshTriggered
                        });
                        if (lastState.ready) {
                            finish(lastState.reason);
                            return;
                        }
                        maybeRefreshStyle(lastState, reason);
                    } catch (error) {
                        console.error('[DC Filter+UI] Failed while evaluating initial reveal readiness:', error);
                        finish('error');
                    }
                };

                const runtimeCoordinator = this.getRuntimeCoordinator();
                if (runtimeCoordinator && typeof runtimeCoordinator.subscribeMutations === 'function') {
                    unsubscribe = runtimeCoordinator.subscribeMutations('ui-initial-reveal', (payload) => {
                        const relevantNodes = payload.collectMatches(this.getInitialRevealMutationSelectors(), { includeRoots: true });
                        if (relevantNodes.length > 0) scheduleCheck('mutation-bus', relevantNodes);
                    });
                } else if (document.body) {
                    observer = new MutationObserver((mutations) => {
                        const candidates = [];
                        mutations.forEach((mutation) => {
                            candidates.push(mutation.target);
                            mutation.addedNodes.forEach((node) => {
                                if (node instanceof Element) candidates.push(node);
                            });
                        });
                        scheduleCheck('mutation-observer', candidates);
                    });
                    observer.observe(document.body, { childList: true, subtree: true });
                }

                scheduleTimeout(timeoutDeadline);
                maybeRefreshStyle(lastState, 'start');
                scheduleCheck('initial');
            });
        },

        waitForInitialUiReady(timeoutMs = 6000) {
            return this.waitForInitialRevealReady(timeoutMs);
        },

        startPostRevealRecoveryWatch(context = {}) {
            const isViewPage = this.isViewPage();
            if (!isViewPage && !this.isListPage()) return 'not-applicable';
            if (typeof this._postRevealRecoveryStop === 'function') {
                this._postRevealRecoveryStop('restart');
            }

            const startedAt = new Date().toISOString();
            const startedTime = Date.now();
            let active = true;
            let lastState = isViewPage
                ? this.evaluateViewPostRevealRecoveryState()
                : this.getInitialRevealState();
            let checkCount = 0;
            let stablePasses = 0;
            let viewThemeRefreshes = 0;
            let listThemeRefreshes = 0;
            let rafId = 0;
            let pollId = 0;
            let unsubscribe = null;
            let observer = null;
            let resizeObserver = null;

            const cleanup = (status = 'stopped') => {
                if (!active) return;
                active = false;
                if (typeof unsubscribe === 'function') unsubscribe();
                if (observer) observer.disconnect();
                if (resizeObserver) resizeObserver.disconnect();
                if (rafId) window.cancelAnimationFrame(rafId);
                if (pollId) window.clearInterval(pollId);
                document.removeEventListener('load', handleMediaEvent, true);
                document.removeEventListener('error', handleMediaEvent, true);
                window.removeEventListener('resize', handleWindowResize);
                this._postRevealRecoveryStop = null;
                this.updatePostRevealRecoveryDebug(lastState, {
                    active: false,
                    status,
                    checkCount,
                    stablePasses,
                    viewThemeRefreshes,
                    listThemeRefreshes,
                    startedAt
                });
            };

            const runFilteredCommentRepair = (reason = 'post-reveal') => {
                if (typeof window.__dcufRepairFilteredCommentPlaceholders !== 'function') return;
                try {
                    window.__dcufRepairFilteredCommentPlaceholders({
                        reason,
                        onlyIfBroken: true,
                        runFilter: false,
                        mergeDetachedReplies: false
                    });
                } catch (error) {
                    console.warn('[DC Filter+UI] Post-reveal filtered comment repair failed:', error);
                }
            };

            const runSupportPasses = (reason = 'post-reveal') => {
                this.ensureKnownListRuntimes(document, `post-reveal:${reason}`);

                const viewBottomContainer = document.querySelector('.view_bottom');
                if (viewBottomContainer instanceof HTMLElement) {
                    this.applyForceRefreshPagination(viewBottomContainer);
                }

                this.hideArticleNativeAdFrames();
                this.scaleAllFontSizes();

                if (typeof window.__dcufSyncArticleDarkText === 'function') {
                    try {
                        window.__dcufSyncArticleDarkText(null, { forceFullScan: true });
                    } catch (error) {
                        console.warn('[DC Filter+UI] Post-reveal article dark sync failed:', error);
                    }
                }

                if (typeof window.__dcufScheduleCommentNormalize === 'function') {
                    try {
                        window.__dcufScheduleCommentNormalize({ forceFullPass: true });
                    } catch (error) {
                        console.warn('[DC Filter+UI] Post-reveal comment normalize failed:', error);
                    }
                }
            };

            const maybeRefreshThemes = (state, reason = 'post-reveal') => {
                let refreshed = false;
                const needsListTheme = state?.detail?.revealTheme === 'list'
                    || state?.reason === 'waiting-list'
                    || state?.reason === 'waiting-items';
                const needsViewTheme = !needsListTheme || state?.reason === 'waiting-style' || state?.reason === 'waiting-view' || state?.reason === 'waiting-comments';

                if (needsViewTheme && viewThemeRefreshes < this.POST_REVEAL_RECOVERY_THEME_REFRESH_LIMIT) {
                    const viewTheme = this.getPhase1ViewTheme();
                    if (typeof viewTheme?.ensure === 'function') {
                        viewThemeRefreshes += 1;
                        viewTheme.ensure({ refresh: true, reason: `post-reveal:${reason}` });
                        refreshed = true;
                    }
                }

                if ((needsListTheme || state?.detail?.embeddedListCount > 0)
                    && listThemeRefreshes < this.POST_REVEAL_RECOVERY_THEME_REFRESH_LIMIT) {
                    const listTheme = this.getPhase1Theme();
                    if (typeof listTheme?.ensure === 'function') {
                        listThemeRefreshes += 1;
                        listTheme.ensure({ refresh: true, reason: `post-reveal:${reason}` });
                        refreshed = true;
                    }
                }

                return refreshed;
            };

            const requestCheck = (reason = 'event', candidates = null) => {
                if (!active || rafId) return;
                rafId = window.requestAnimationFrame(() => {
                    rafId = 0;
                    runCheck(reason, candidates);
                });
            };

            const runCheck = (reason = 'check', candidates = null) => {
                if (!active) return;
                checkCount += 1;

                if (Date.now() - startedTime >= this.POST_REVEAL_RECOVERY_MAX_MS) {
                    cleanup('timeout');
                    return;
                }

                try {
                    if (candidates && typeof candidates[Symbol.iterator] === 'function') {
                        this.ensureListRuntimesFromCandidates(candidates, `post-reveal:${reason}`);
                    } else {
                        this.ensureKnownListRuntimes(document, `post-reveal:${reason}`);
                    }
                } catch (error) {
                    console.warn('[DC Filter+UI] Post-reveal list runtime ensure failed:', error);
                }
                runFilteredCommentRepair(reason);

                lastState = isViewPage
                    ? this.evaluateViewPostRevealRecoveryState()
                    : this.getInitialRevealState();
                if (lastState.ready) {
                    stablePasses += 1;
                    this.updatePostRevealRecoveryDebug(lastState, {
                        active: true,
                        status: 'ready',
                        checkCount,
                        stablePasses,
                        viewThemeRefreshes,
                        listThemeRefreshes,
                        startedAt
                    });
                    if (stablePasses >= this.POST_REVEAL_RECOVERY_STABLE_PASSES) {
                        const bootController = window.__dcufBootController;
                        if (bootController && bootController.state === 'degraded') {
                            if (isViewPage && typeof window.__dcufFlushInitialCommentBarrier === 'function') {
                                window.__dcufFlushInitialCommentBarrier({ reason: 'post-reveal-recovery' });
                            }
                            bootController.markReady('post-reveal-recovery');
                        }
                        cleanup('completed');
                    }
                    return;
                }

                stablePasses = 0;
                runSupportPasses(reason);
                maybeRefreshThemes(lastState, reason);
                this.updatePostRevealRecoveryDebug(lastState, {
                    active: true,
                    status: 'recovering',
                    checkCount,
                    stablePasses,
                    viewThemeRefreshes,
                    listThemeRefreshes,
                    startedAt
                });
            };

            const handleMediaEvent = (event) => {
                const target = event.target;
                if (!(target instanceof Element)) return;
                if (!target.matches('img, video')) return;
                if (!target.closest('.view_content_wrap, #focus_cmt, .view_bottom')) return;
                requestCheck(`media:${event.type}`, [target]);
            };

            const handleWindowResize = () => {
                requestCheck('window-resize');
            };

            const runtimeCoordinator = this.getRuntimeCoordinator();
            if (runtimeCoordinator && typeof runtimeCoordinator.subscribeMutations === 'function') {
                unsubscribe = runtimeCoordinator.subscribeMutations('ui-post-reveal-recovery', (payload) => {
                    const relevantNodes = payload.collectMatches(this.getInitialRevealMutationSelectors(), { includeRoots: true });
                    if (relevantNodes.length > 0) requestCheck('mutation-bus', relevantNodes);
                });
            } else if (document.body) {
                observer = new MutationObserver((mutations) => {
                    const candidates = [];
                    mutations.forEach((mutation) => {
                        candidates.push(mutation.target);
                        mutation.addedNodes.forEach((node) => {
                            if (node instanceof Element) candidates.push(node);
                        });
                    });
                    requestCheck('mutation-observer', candidates);
                });
                observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
            }

            if (window.ResizeObserver) {
                resizeObserver = new ResizeObserver((entries) => {
                    requestCheck('resize-observer', entries.map((entry) => entry?.target).filter(Boolean));
                });
                document.querySelectorAll('.view_content_wrap, .view_bottom, #focus_cmt, .view_comment').forEach((element) => {
                    if (element instanceof Element) resizeObserver.observe(element);
                });
            }

            document.addEventListener('load', handleMediaEvent, true);
            document.addEventListener('error', handleMediaEvent, true);
            window.addEventListener('resize', handleWindowResize);

            pollId = window.setInterval(() => {
                requestCheck('poll');
            }, this.POST_REVEAL_RECOVERY_POLL_MS);

            this._postRevealRecoveryStop = cleanup;
            this.updatePostRevealRecoveryDebug(lastState, {
                active: true,
                status: 'started',
                checkCount,
                stablePasses,
                viewThemeRefreshes,
                listThemeRefreshes,
                startedAt
            });
            requestCheck(`start:${context.revealState || 'unknown'}`);
            return 'started';
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
                    contentEl.querySelectorAll('[style]').forEach(el => {
                        // [v2.7.0.1 추가] 이미 스케일링된 요소는 중복 처리 방지
                        if (el.closest('.comment_box, .img_comment, #focus_cmt')) return;

                        if (el.dataset.scaledByFilter) return;
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
                        el.dataset.scaledByFilter = '1';
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

        getArticleAdContentRoots(root = document) {
            const queryRoot = (root instanceof Document || root instanceof Element || root instanceof DocumentFragment) ? root : document;
            const selector = '.gallview_contents, .writing_view_box, .view_content_wrap';
            const roots = [];
            const seen = new Set();
            const addRoot = (element) => {
                if (!(element instanceof HTMLElement) || seen.has(element)) return;
                seen.add(element);
                roots.push(element);
            };

            if (queryRoot instanceof HTMLElement && queryRoot.matches(selector)) addRoot(queryRoot);
            if (typeof queryRoot.querySelectorAll === 'function') {
                queryRoot.querySelectorAll(selector).forEach(addRoot);
            }

            return roots;
        },

        isArticleNativeAdFrame(frame) {
            if (!(frame instanceof HTMLIFrameElement)) return false;

            const frameId = frame.id || '';
            const frameName = frame.name || '';
            const frameSrc = frame.getAttribute('src') || '';
            const signature = [
                frameId,
                frameName,
                frame.title,
                frame.className,
                frameSrc
            ].join(' ');

            const isGoogleArticleSafeFrame = (/^aswift_\d+$/i.test(frameId) || /^aswift_\d+$/i.test(frameName))
                && /googleads\.g\.doubleclick\.net\/pagead\/ads/i.test(frameSrc);
            if (isGoogleArticleSafeFrame) return true;

            if (/google_ads_iframe_|gfp|pstatic\.net\/tvetalibs|tivan\.naver\.com/i.test(signature)) {
                return true;
            }

            try {
                const frameDocument = frame.contentDocument;
                const frameBody = frameDocument?.body;
                if (!frameBody) return false;
                if (frameBody.id === 'gfp_sf_body' || frameBody.classList.contains('banner_ad_wrapper')) return true;
                return Boolean(frameDocument.querySelector('#ad-element.native_image_wrap, [data-gfp-role]'));
            } catch (error) {
                return false;
            }
        },

        installArticleNativeAdStyles() {
            if (__dcufRoot.__dcufArticleNativeAdStyleInstalled || document.getElementById(this.ARTICLE_AD_STYLE_ID)) return;
            __dcufRoot.__dcufArticleNativeAdStyleInstalled = true;

            const css = `
                .gallview_contents iframe[data-dcuf-article-ad-hidden="true"],
                .writing_view_box iframe[data-dcuf-article-ad-hidden="true"],
                .view_content_wrap iframe[data-dcuf-article-ad-hidden="true"],
                .gallview_contents #ad_nv_slot,
                .writing_view_box #ad_nv_slot,
                .view_content_wrap #ad_nv_slot,
                .gallview_contents iframe[id^="google_ads_iframe_"],
                .gallview_contents iframe[name^="google_ads_iframe_"],
                .gallview_contents iframe[id*="gfp"],
                .gallview_contents iframe[name*="gfp"],
                .gallview_contents iframe[src*="pstatic.net/tvetalibs"],
                .gallview_contents iframe[src*="tivan.naver.com"],
                .writing_view_box iframe[id^="google_ads_iframe_"],
                .writing_view_box iframe[name^="google_ads_iframe_"],
                .writing_view_box iframe[id*="gfp"],
                .writing_view_box iframe[name*="gfp"],
                .writing_view_box iframe[src*="pstatic.net/tvetalibs"],
                .writing_view_box iframe[src*="tivan.naver.com"],
                .gallview_contents iframe[id^="aswift_"][src*="googleads.g.doubleclick.net/pagead/ads"],
                .writing_view_box iframe[id^="aswift_"][src*="googleads.g.doubleclick.net/pagead/ads"],
                .view_content_wrap iframe[id^="aswift_"][src*="googleads.g.doubleclick.net/pagead/ads"] {
                    display: none !important;
                    width: 0 !important;
                    height: 0 !important;
                    min-width: 0 !important;
                    min-height: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border: 0 !important;
                    visibility: hidden !important;
                    overflow: hidden !important;
                }
            `;

            const styleElement = GM_addStyle(css);
            if (styleElement instanceof HTMLElement) {
                styleElement.id = this.ARTICLE_AD_STYLE_ID;
            }
        },

        hideArticleNativeAdFrames(root = document) {
            this.getArticleAdContentRoots(root).forEach((articleRoot) => {
                articleRoot.querySelectorAll('#ad_nv_slot').forEach((slot) => {
                    if (!(slot instanceof HTMLElement)) return;
                    slot.setAttribute('data-dcuf-article-ad-hidden', 'true');
                    slot.style.setProperty('display', 'none', 'important');
                    slot.style.setProperty('width', '0', 'important');
                    slot.style.setProperty('height', '0', 'important');
                    slot.style.setProperty('min-width', '0', 'important');
                    slot.style.setProperty('min-height', '0', 'important');
                    slot.style.setProperty('margin', '0', 'important');
                    slot.style.setProperty('padding', '0', 'important');
                    slot.style.setProperty('border', '0', 'important');
                    slot.style.setProperty('visibility', 'hidden', 'important');
                    slot.style.setProperty('overflow', 'hidden', 'important');
                });
                articleRoot.querySelectorAll('iframe').forEach((frame) => {
                    if (!this.isArticleNativeAdFrame(frame)) return;
                    frame.setAttribute('data-dcuf-article-ad-hidden', 'true');
                    frame.style.setProperty('display', 'none', 'important');
                    frame.style.setProperty('width', '0', 'important');
                    frame.style.setProperty('height', '0', 'important');
                    frame.style.setProperty('margin', '0', 'important');
                    frame.style.setProperty('padding', '0', 'important');
                    frame.style.setProperty('border', '0', 'important');
                    frame.style.setProperty('visibility', 'hidden', 'important');
                });
            });
        },

        scheduleArticleNativeAdHide() {
            if (__dcufRoot.__dcufArticleNativeAdRafId) return;
            __dcufRoot.__dcufArticleNativeAdRafId = requestAnimationFrame(() => {
                __dcufRoot.__dcufArticleNativeAdRafId = 0;
                this.hideArticleNativeAdFrames();
            });
        },

        scheduleArticleNativeAdHidePasses() {
            this.hideArticleNativeAdFrames();
            [40, 120, 300, 900, 1800, 3200].forEach((delay) => {
                window.setTimeout(() => this.scheduleArticleNativeAdHide(), delay);
            });
        },

        isArticleNativeAdMutationTarget(node) {
            if (!(node instanceof Element)) return false;
            if (node.matches('#ad_nv_slot, iframe')) return true;
            if (node.closest?.('#ad_nv_slot')) return true;
            return Boolean(node.querySelector?.('#ad_nv_slot, iframe'));
        },

        attachArticleNativeAdObserver() {
            if (__dcufRoot.__dcufArticleNativeAdObserver) return;

            const observerTarget = document.body || document.documentElement;
            if (!(observerTarget instanceof Element)) {
                if (!__dcufRoot.__dcufArticleNativeAdObserverRetryId) {
                    __dcufRoot.__dcufArticleNativeAdObserverRetryId = window.setTimeout(() => {
                        __dcufRoot.__dcufArticleNativeAdObserverRetryId = 0;
                        this.attachArticleNativeAdObserver();
                    }, 50);
                }
                return;
            }

            const observer = new MutationObserver((mutations) => {
                const hasAdChange = mutations.some((mutation) => (
                    this.isArticleNativeAdMutationTarget(mutation.target)
                    || Array.from(mutation.addedNodes).some((node) => this.isArticleNativeAdMutationTarget(node))
                ));
                if (hasAdChange) this.scheduleArticleNativeAdHide();
            });

            observer.observe(observerTarget, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class']
            });
            window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
            __dcufRoot.__dcufArticleNativeAdObserver = observer;
        },

        ensureArticleNativeAdBlocker() {
            this.installArticleNativeAdStyles();
            this.attachArticleNativeAdObserver();
            this.scheduleArticleNativeAdHidePasses();
        },

        transformWritePage() {
            if (document.body.classList.contains('is-write-page')) return;
            document.body.classList.add('is-write-page');

            const writeBox = document.querySelector('.write_box');
            const writeForm = writeBox?.querySelector('form#write') || document.querySelector('form#write');
            const leaveConfirm = writeForm?.querySelector('#leave_confirm_box');
            if (leaveConfirm instanceof HTMLElement) {
                leaveConfirm.classList.add('dcuf-write-leave-confirm');
                document.body.appendChild(leaveConfirm);
            }
            const gallType = writeForm?.querySelector('input[name="_GALLTYPE_"]')?.value || '';
            const isMinorWrite = gallType.toUpperCase() === 'M'
                || document.querySelector('#container.minor_write') instanceof Element
                || (window.location.pathname || '').includes('/mgallery/');
            document.body.classList.add(isMinorWrite ? 'dcuf-write-minor' : 'dcuf-write-major');
            writeForm?.classList.add(isMinorWrite ? 'dcuf-write-form-minor' : 'dcuf-write-form-major');

            const syncDesktopSiteMobileWriteMode = () => {
                const screenWidth = Number(window.screen?.width) || 0;
                const layoutWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
                const scale = screenWidth > 0 ? layoutWidth / screenWidth : 1;
                const enabled = screenWidth > 0 && screenWidth <= 600 && layoutWidth >= 800 && scale >= 1.5;
                document.body.classList.toggle('dcuf-write-desktop-site-mobile', enabled);
                if (enabled) {
                    const initialScale = Math.min(3, scale);
                    document.body.style.setProperty('--dcuf-write-desktop-site-scale', String(initialScale));
                    document.body.style.setProperty('--dcuf-write-desktop-site-inverse-scale', String(1 / initialScale));
                    document.body.style.setProperty('--dcuf-write-device-width', `${screenWidth}px`);
                } else {
                    document.body.style.removeProperty('--dcuf-write-desktop-site-scale');
                    document.body.style.removeProperty('--dcuf-write-desktop-site-inverse-scale');
                    document.body.style.removeProperty('--dcuf-write-device-width');
                }
            };
            syncDesktopSiteMobileWriteMode();
            if (document.body.dataset.dcufWriteViewportBound !== '1') {
                document.body.dataset.dcufWriteViewportBound = '1';
                window.addEventListener('resize', syncDesktopSiteMobileWriteMode, { passive: true });
                window.visualViewport?.addEventListener('resize', syncDesktopSiteMobileWriteMode, { passive: true });
            }

            const liveFieldset = writeForm?.querySelector('fieldset');
            if (liveFieldset) liveFieldset.classList.add('dcuf-write-fields');

            writeForm?.querySelectorAll('input[type="text"]:not([id]):not([name]), input[type="password"]:not([id]):not([name])')
                .forEach((input) => input.classList.add('dcuf-write-decoy-input'));

            const subjectRow = writeForm?.querySelector('#subject')?.closest('tr');
            if (subjectRow) subjectRow.classList.add('dcuf-write-subject-row');
            const subjectField = writeForm?.querySelector('#subject')?.closest('.input_box');
            if (subjectField) subjectField.classList.add('dcuf-write-subject-field');

            const guestControls = ['#name', '#password', '#code']
                .map((selector) => writeForm?.querySelector(selector))
                .filter((control) => control instanceof HTMLElement);
            const guestRows = new Set(guestControls.map((control) => control.closest('tr')).filter(Boolean));
            guestRows.forEach((row) => {
                row.classList.add('user_info_box', 'dcuf-write-guest-row');
                row.querySelectorAll('td').forEach((cell) => cell.classList.add('user_info_input'));
            });

            const liveFieldClasses = new Map([
                ['#name', 'dcuf-write-name-field'],
                ['#password', 'dcuf-write-password-field'],
                ['#code', 'dcuf-write-captcha-field']
            ]);
            liveFieldClasses.forEach((className, selector) => {
                const field = writeForm?.querySelector(selector)?.closest('.input_box');
                if (field) field.classList.add('dcuf-write-guest-field', className);
            });

            const captchaImageBox = writeForm?.querySelector('#kcaptcha')?.closest('.kap_codeimg');
            if (captchaImageBox) captchaImageBox.classList.add('dcuf-write-captcha-image');

            const headtextLabel = writeForm?.querySelector('.write_subject > .tit, .write_subject > .write_subject_label');
            if (headtextLabel) headtextLabel.classList.add('dcuf-write-headtext-label');

            const headtextList = writeForm?.querySelector('.write_subject .subject_list');
            if (headtextList instanceof HTMLElement) {
                let draggedHeadtext = false;
                let headtextDrag = null;
                const revealHeadtext = (candidate, behavior = 'smooth') => {
                    if (!(candidate instanceof HTMLElement)) return;
                    requestAnimationFrame(() => {
                        const maxScrollLeft = Math.max(0, headtextList.scrollWidth - headtextList.clientWidth);
                        const centeredLeft = candidate.offsetLeft - ((headtextList.clientWidth - candidate.offsetWidth) / 2);
                        headtextList.scrollTo({
                            left: Math.max(0, Math.min(maxScrollLeft, centeredLeft)),
                            behavior
                        });
                    });
                };
                const positionHeadtextTips = () => {
                    headtextList.querySelectorAll(':scope > li .tip_box2').forEach((tip) => {
                        if (!(tip instanceof HTMLElement)) return;
                        const item = tip.closest('li');
                        if (!(item instanceof HTMLElement) || getComputedStyle(tip).display === 'none') return;
                        const itemRect = item.getBoundingClientRect();
                        const tipRect = tip.getBoundingClientRect();
                        const viewportWidth = window.visualViewport?.width || window.innerWidth;
                        const modeScale = document.body.classList.contains('dcuf-write-desktop-site-mobile')
                            ? (Number(document.body.style.getPropertyValue('--dcuf-write-desktop-site-scale')) || 1)
                            : 1;
                        const left = Math.max(8, Math.min(viewportWidth - tipRect.width - 8, itemRect.left + ((itemRect.width - tipRect.width) / 2)));
                        const top = Math.max(8, itemRect.top - tipRect.height - 8);
                        tip.style.setProperty('--dcuf-headtext-tip-left', `${Math.round(left / modeScale)}px`);
                        tip.style.setProperty('--dcuf-headtext-tip-top', `${Math.round(top / modeScale)}px`);
                        tip.style.setProperty('--dcuf-headtext-tip-max-width', `${Math.floor((viewportWidth - 16) / modeScale)}px`);
                        tip.classList.remove('dcuf-headtext-tip-positioning');
                        tip.classList.add('dcuf-headtext-tip-positioned');
                    });
                };
                const scheduleHeadtextTipPosition = () => {
                    requestAnimationFrame(() => requestAnimationFrame(positionHeadtextTips));
                };
                revealHeadtext(headtextList.querySelector(':scope > li.sel, :scope > li.active'), 'auto');
                if (headtextList.dataset.dcufScrollBound !== '1') {
                    headtextList.dataset.dcufScrollBound = '1';
                    headtextList.addEventListener('pointerdown', (event) => {
                        if (event.pointerType === 'touch' || event.button !== 0) return;
                        headtextDrag = {
                            pointerId: event.pointerId,
                            startX: event.clientX,
                            startScrollLeft: headtextList.scrollLeft,
                            moved: false
                        };
                    });
                    headtextList.addEventListener('pointermove', (event) => {
                        if (!headtextDrag || headtextDrag.pointerId !== event.pointerId) return;
                        const delta = event.clientX - headtextDrag.startX;
                        if (!headtextDrag.moved && Math.abs(delta) >= 8) {
                            headtextDrag.moved = true;
                            headtextList.setPointerCapture?.(event.pointerId);
                            headtextList.classList.add('dcuf-headtext-dragging');
                        }
                        if (!headtextDrag.moved) return;
                        event.preventDefault();
                        headtextList.scrollLeft = headtextDrag.startScrollLeft - delta;
                        positionHeadtextTips();
                    });
                    const finishHeadtextDrag = (event) => {
                        if (!headtextDrag || headtextDrag.pointerId !== event.pointerId) return;
                        draggedHeadtext = headtextDrag.moved;
                        headtextDrag = null;
                        headtextList.classList.remove('dcuf-headtext-dragging');
                        if (headtextList.hasPointerCapture?.(event.pointerId)) headtextList.releasePointerCapture(event.pointerId);
                        if (draggedHeadtext) window.setTimeout(() => { draggedHeadtext = false; }, 0);
                    };
                    headtextList.addEventListener('pointerup', finishHeadtextDrag);
                    headtextList.addEventListener('pointercancel', finishHeadtextDrag);
                    headtextList.addEventListener('click', (event) => {
                        if (draggedHeadtext) {
                            event.preventDefault();
                            event.stopImmediatePropagation();
                            return;
                        }
                        const clicked = event.target instanceof Element ? event.target.closest('li') : null;
                        if (!(clicked instanceof HTMLElement) || clicked.parentElement !== headtextList) return;
                        requestAnimationFrame(() => {
                            revealHeadtext(headtextList.querySelector(':scope > li.sel, :scope > li.active') || clicked);
                        });
                    });
                    const prepareHeadtextTipPosition = (event) => {
                        const item = event.target instanceof Element ? event.target.closest('li') : null;
                        if (!(item instanceof HTMLElement) || item.parentElement !== headtextList) return;
                        const tip = item.querySelector(':scope > .tip_box2');
                        if (tip instanceof HTMLElement) {
                            tip.classList.remove('dcuf-headtext-tip-positioned');
                            tip.classList.add('dcuf-headtext-tip-positioning');
                        }
                        positionHeadtextTips();
                        scheduleHeadtextTipPosition();
                    };
                    headtextList.addEventListener('pointerover', prepareHeadtextTipPosition);
                    headtextList.addEventListener('focusin', prepareHeadtextTipPosition);
                    headtextList.addEventListener('scroll', positionHeadtextTips, { passive: true });
                    window.addEventListener('resize', scheduleHeadtextTipPosition, { passive: true });
                    window.addEventListener('scroll', scheduleHeadtextTipPosition, { passive: true, capture: true });
                    const runtimeCoordinator = this.getRuntimeCoordinator();
                    if (runtimeCoordinator && typeof runtimeCoordinator.subscribeMutations === 'function') {
                        runtimeCoordinator.subscribeMutations('ui-write-headtext-tip-position', (payload) => {
                            const relevantTargets = [
                                ...(payload.attributeTargets || []),
                                ...(payload.addedElements || []),
                                ...(payload.childListTargets || [])
                            ];
                            if (!relevantTargets.some((node) => (
                                node === headtextList
                                || (node instanceof Node && headtextList.contains(node))
                            ))) return;
                            const hasVisiblePendingTip = Array.from(headtextList.querySelectorAll(':scope > li .tip_box2:not(.dcuf-headtext-tip-positioned)'))
                                .some((tip) => tip instanceof HTMLElement && getComputedStyle(tip).display !== 'none');
                            if (hasVisiblePendingTip) positionHeadtextTips();
                        });
                    }
                }
            }

            const captchaCell = writeForm?.querySelector('#code')?.closest('td');
            if (captchaCell) {
                captchaCell.classList.add('user_info_input', 'dcuf-write-captcha-cell');
            }

            const mobileFontNames = [
                '맑은 고딕', '굴림체', '굴림', '바탕체', '바탕', '궁서',
                'helvetica', 'Arial', 'Arial Black', 'Comic Sans MS', 'Courier New',
                'Impact', 'Tahoma', 'Times New Roman', 'Verdana', 'MS Gothic',
                'MS PGothic', 'MS UI Gothic'
            ];
            const ensureMobileFontMenu = () => {
                const isMobileScreen = (Number(window.screen?.width) || window.innerWidth || 0) <= 600;
                document.body.classList.toggle('dcuf-write-mobile-font-menu', isMobileScreen);
                if (!isMobileScreen || !(writeForm instanceof HTMLElement)) return;

                writeForm.querySelectorAll('.note-toolbar .note-fontname').forEach((fontGroup) => {
                    if (!(fontGroup instanceof HTMLElement)) return;
                    const button = fontGroup.querySelector('button.dropdown-toggle, button.note-btn');
                    const label = button?.querySelector('.note-current-fontname');
                    const menu = fontGroup.querySelector('.note-dropdown-menu.dropdown-fontname');
                    if (label instanceof HTMLElement && !(label.textContent || '').trim()) {
                        label.textContent = '글꼴';
                        label.style.removeProperty('font-family');
                    }
                    if (!(menu instanceof HTMLElement)) return;

                    if (menu.dataset.dcufMobileFonts !== '1') {
                        const selectedValue = menu.querySelector('.note-dropdown-item.checked')?.getAttribute('data-value') || '';
                        const fragment = document.createDocumentFragment();
                        mobileFontNames.forEach((fontName) => {
                            const item = document.createElement('a');
                            item.className = `note-dropdown-item${selectedValue === fontName ? ' checked' : ''}`;
                            item.href = '#';
                            item.setAttribute('data-value', fontName);
                            item.setAttribute('data-dcuf-mobile-font-item', '1');
                            item.setAttribute('role', 'listitem');
                            item.setAttribute('aria-label', fontName);
                            const check = document.createElement('i');
                            check.className = 'note-icon-menu-check';
                            const text = document.createElement('span');
                            text.textContent = fontName;
                            text.style.fontFamily = fontName;
                            item.append(check, document.createTextNode(' '), text);
                            fragment.appendChild(item);
                        });
                        menu.replaceChildren(fragment);
                        menu.dataset.dcufMobileFonts = '1';
                    }

                    if (menu.__dcufMobileFontBound) return;
                    menu.__dcufMobileFontBound = true;

                    menu.addEventListener('mousedown', (event) => {
                        if (event.target instanceof Element && event.target.closest('[data-dcuf-mobile-font-item="1"]')) {
                            event.preventDefault();
                        }
                    });
                    menu.addEventListener('click', (event) => {
                        const item = event.target instanceof Element
                            ? event.target.closest('[data-dcuf-mobile-font-item="1"]')
                            : null;
                        if (!(item instanceof HTMLElement)) return;
                        event.preventDefault();
                        event.stopPropagation();
                        const fontName = item.getAttribute('data-value') || '';
                        if (!fontName) return;

                        const memo = writeForm.querySelector('textarea#memo');
                        const jq = window.jQuery;
                        if (memo instanceof HTMLTextAreaElement && typeof jq === 'function' && typeof jq(memo).summernote === 'function') {
                            jq(memo).summernote('fontName', fontName);
                        } else {
                            document.execCommand('fontName', false, fontName);
                        }
                        menu.querySelectorAll('.note-dropdown-item').forEach((candidate) => {
                            candidate.classList.toggle('checked', candidate === item);
                        });
                        if (label instanceof HTMLElement) {
                            label.textContent = fontName;
                            label.style.fontFamily = fontName;
                        }
                        fontGroup.querySelectorAll('.note-btn-group.open').forEach((group) => group.classList.remove('open'));
                        button?.classList.remove('active');
                        menu.style.display = 'none';
                    });
                });
            };
            ensureMobileFontMenu();

            if (writeForm instanceof HTMLElement && writeForm.dataset.dcufEditorLayersBound !== '1') {
                writeForm.dataset.dcufEditorLayersBound = '1';
                let editorToolbarDrag = null;
                let draggedEditorToolbar = false;
                const editorToolbarSelector = '.note-toolbar, .note-toolbar-media';
                writeForm.addEventListener('pointerdown', (event) => {
                    if (event.pointerType === 'touch' || event.button !== 0) return;
                    if (!(event.target instanceof Element)
                        || event.target.closest('.note-dropdown-menu, .pop_wrap, input, textarea, select')) return;
                    const toolbar = event.target.closest(editorToolbarSelector);
                    if (!(toolbar instanceof HTMLElement)) return;
                    draggedEditorToolbar = false;
                    editorToolbarDrag = {
                        toolbar,
                        pointerId: event.pointerId,
                        startX: event.clientX,
                        startScrollLeft: toolbar.scrollLeft,
                        moved: false
                    };
                });
                writeForm.addEventListener('pointermove', (event) => {
                    if (!editorToolbarDrag || editorToolbarDrag.pointerId !== event.pointerId) return;
                    const delta = event.clientX - editorToolbarDrag.startX;
                    if (!editorToolbarDrag.moved && Math.abs(delta) >= 8) {
                        editorToolbarDrag.moved = true;
                        editorToolbarDrag.toolbar.setPointerCapture?.(event.pointerId);
                        editorToolbarDrag.toolbar.classList.add('dcuf-editor-toolbar-dragging');
                    }
                    if (!editorToolbarDrag.moved) return;
                    event.preventDefault();
                    editorToolbarDrag.toolbar.scrollLeft = editorToolbarDrag.startScrollLeft - delta;
                    positionEditorLayers();
                });
                const finishEditorToolbarDrag = (event) => {
                    if (!editorToolbarDrag || editorToolbarDrag.pointerId !== event.pointerId) return;
                    const { toolbar, moved } = editorToolbarDrag;
                    editorToolbarDrag = null;
                    draggedEditorToolbar = moved;
                    toolbar.classList.remove('dcuf-editor-toolbar-dragging');
                    if (toolbar.hasPointerCapture?.(event.pointerId)) toolbar.releasePointerCapture(event.pointerId);
                    if (draggedEditorToolbar) window.setTimeout(() => { draggedEditorToolbar = false; }, 0);
                };
                writeForm.addEventListener('pointerup', finishEditorToolbarDrag);
                writeForm.addEventListener('pointercancel', finishEditorToolbarDrag);
                writeForm.addEventListener('click', (event) => {
                    if (!draggedEditorToolbar) return;
                    event.preventDefault();
                    event.stopImmediatePropagation();
                }, true);
                // Live Summernote editor dropdown contracts. Keep the generic selector as a
                // forward-compatible fallback and list known menus here for fixture/audit parity.
                const editorDropdownSelector = [
                    '.note-toolbar .note-dropdown-menu',
                    '.note-toolbar .dropdown-fontname',
                    '.note-toolbar .dropdown-fontsize',
                    '.note-toolbar .note-color .note-dropdown-menu',
                    '.note-toolbar .note-table',
                    '.note-toolbar .note-height .dropdown-line-height',
                    '.note-toolbar .note-para .note-dropdown-menu'
                ].join(', ');
                const editorLayerSelector = `${editorDropdownSelector}, .note-toolbar .pop_wrap`;
                const prepareEditorLayersForTrigger = (event) => {
                    if (!(event.target instanceof Element)
                        || event.target.closest('.note-dropdown-menu, .pop_wrap')) return;
                    const group = event.target.closest('.note-toolbar .note-btn-group');
                    if (!(group instanceof HTMLElement)) return;
                    if (event.type === 'pointerover'
                        && event.relatedTarget instanceof Node
                        && group.contains(event.relatedTarget)) return;
                    group.querySelectorAll('.note-dropdown-menu, .pop_wrap').forEach((layer) => {
                        layer.classList.remove('dcuf-editor-layer-positioned');
                        layer.classList.add('dcuf-editor-layer-positioning');
                    });
                };
                writeForm.addEventListener('pointerdown', prepareEditorLayersForTrigger, true);
                writeForm.addEventListener('pointerover', prepareEditorLayersForTrigger, true);
                writeForm.addEventListener('click', prepareEditorLayersForTrigger, true);
                writeForm.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' || event.key === ' ') prepareEditorLayersForTrigger(event);
                }, true);
                const positionEditorLayers = ({ includeDropdowns = true } = {}) => {
                    writeForm.querySelectorAll(editorLayerSelector).forEach((layer) => {
                        if (!(layer instanceof HTMLElement) || getComputedStyle(layer).display === 'none') return;
                        const isDropdown = layer.matches('.note-dropdown-menu');
                        if (isDropdown && !includeDropdowns) return;
                        const anchor = layer.closest('.note-btn-group');
                        if (!(anchor instanceof HTMLElement)) return;
                        layer.classList.add('dcuf-editor-layer-positioning');
                        layer.classList.remove('dcuf-editor-layer-positioned');
                        const anchorRect = anchor.getBoundingClientRect();
                        const layerRect = layer.getBoundingClientRect();
                        // Fixed Summernote dropdowns still inherit the desktop-site mobile
                        // zoom. Convert viewport coordinates back into that local CSS space
                        // while keeping the host menu's intended physical size.
                        const measuredLocalScale = isDropdown && anchor.offsetWidth > 0
                            ? anchorRect.width / anchor.offsetWidth
                            : 1;
                        const localCoordinateScale = Number.isFinite(measuredLocalScale) && measuredLocalScale > 0
                            ? measuredLocalScale
                            : 1;
                        const visualViewport = window.visualViewport;
                        const visualScale = visualViewport?.scale || 1;
                        const scaledVisualWidth = (visualViewport?.width || window.innerWidth) * visualScale;
                        const containerRect = writeForm.closest('#container')?.getBoundingClientRect();
                        const rectUsesScaledVisualCoordinates = document.body.classList.contains('dcuf-write-desktop-site-mobile')
                            && containerRect instanceof DOMRect
                            && containerRect.width <= scaledVisualWidth + 2;
                        const viewportCoordinateScale = rectUsesScaledVisualCoordinates ? visualScale : 1;
                        const viewportLeft = (visualViewport?.offsetLeft || 0) * viewportCoordinateScale;
                        const viewportTop = (visualViewport?.offsetTop || 0) * viewportCoordinateScale;
                        const viewportWidth = (visualViewport?.width || window.innerWidth) * viewportCoordinateScale;
                        const viewportHeight = (visualViewport?.height || window.innerHeight) * viewportCoordinateScale;
                        const viewportRight = viewportLeft + viewportWidth;
                        const viewportBottom = viewportTop + viewportHeight;
                        // Leave two extra visual pixels for browser zoom rounding so a fixed
                        // layer cannot bleed into the clipped page edge.
                        const edgePadding = 10;
                        const layerGap = 6;
                        const maxWidth = Math.max(1, viewportWidth - (edgePadding * 2));
                        const maxHeight = Math.max(1, viewportHeight - (edgePadding * 2));
                        const constrainToViewport = isDropdown;
                        const width = constrainToViewport ? Math.min(layerRect.width, maxWidth) : layerRect.width;
                        const height = constrainToViewport ? Math.min(layerRect.height, maxHeight) : layerRect.height;
                        const left = Math.max(
                            viewportLeft + edgePadding,
                            Math.min(viewportRight - width - edgePadding, anchorRect.left)
                        );
                        const below = Math.max(0, viewportBottom - anchorRect.bottom - edgePadding - layerGap);
                        const above = Math.max(0, anchorRect.top - viewportTop - edgePadding - layerGap);
                        const openAbove = height > below && above > below;
                        const preferredTop = openAbove
                            ? anchorRect.top - height - layerGap
                            : anchorRect.bottom + layerGap;
                        const top = Math.max(
                            viewportTop + edgePadding,
                            Math.min(viewportBottom - height - edgePadding, preferredTop)
                        );
                        const positionedLeft = isDropdown ? left / localCoordinateScale : left;
                        const positionedTop = isDropdown ? top / localCoordinateScale : top;
                        const localMaxWidth = isDropdown ? maxWidth / localCoordinateScale : maxWidth;
                        const localMaxHeight = isDropdown ? maxHeight / localCoordinateScale : maxHeight;
                        layer.style.setProperty('--dcuf-editor-layer-left', `${positionedLeft.toFixed(3)}px`);
                        layer.style.setProperty('--dcuf-editor-layer-top', `${positionedTop.toFixed(3)}px`);
                        layer.style.setProperty('--dcuf-editor-layer-max-width', `${Math.floor(localMaxWidth)}px`);
                        layer.style.setProperty('--dcuf-editor-layer-max-height', `${Math.floor(localMaxHeight)}px`);
                        layer.classList.remove('dcuf-editor-layer-positioning');
                        layer.classList.add('dcuf-editor-layer-positioned');
                    });
                };
                const scheduleEditorLayerPosition = () => {
                    requestAnimationFrame(() => {
                        positionEditorLayers();
                        requestAnimationFrame(positionEditorLayers);
                    });
                };
                const scheduleEditorPopupPosition = () => {
                    requestAnimationFrame(() => {
                        positionEditorLayers();
                        requestAnimationFrame(positionEditorLayers);
                    });
                };
                const runtimeCoordinator = this.getRuntimeCoordinator();
                if (runtimeCoordinator && typeof runtimeCoordinator.subscribeMutations === 'function') {
                    runtimeCoordinator.subscribeMutations('ui-write-editor-layer-position', (payload) => {
                        const relevantTargets = [
                            ...(payload.attributeTargets || []),
                            ...(payload.addedElements || []),
                            ...(payload.childListTargets || [])
                        ];
                        if (!relevantTargets.some((node) => (
                            node === writeForm
                            || (node instanceof Node && writeForm.contains(node))
                        ))) return;
                        const hasVisiblePendingLayer = Array.from(writeForm.querySelectorAll(editorLayerSelector))
                            .some((layer) => (
                                layer instanceof HTMLElement
                                && !layer.classList.contains('dcuf-editor-layer-positioned')
                                && getComputedStyle(layer).display !== 'none'
                            ));
                        if (hasVisiblePendingLayer) positionEditorLayers();
                    });
                }
                writeForm.addEventListener('click', (event) => {
                    if (!(event.target instanceof Element) || !event.target.closest('.note-toolbar')) return;
                    if (event.target.closest('.note-fontname')) ensureMobileFontMenu();
                    positionEditorLayers();
                    scheduleEditorLayerPosition();
                });
                writeForm.addEventListener('pointerover', (event) => {
                    if (!(event.target instanceof Element) || !event.target.closest('.note-toolbar')) return;
                    if (event.target.closest('.note-fontname')) ensureMobileFontMenu();
                    scheduleEditorLayerPosition();
                });
                writeForm.addEventListener('scroll', scheduleEditorPopupPosition, { passive: true, capture: true });
                window.addEventListener('resize', scheduleEditorLayerPosition, { passive: true });
                window.addEventListener('scroll', scheduleEditorPopupPosition, { passive: true, capture: true });
                window.visualViewport?.addEventListener('resize', scheduleEditorLayerPosition, { passive: true });
                window.visualViewport?.addEventListener('scroll', scheduleEditorPopupPosition, { passive: true });
            }

            // [최종 완전판] 글쓰기 페이지의 광고 컨테이너를 직접 찾아 제거하는 함수
            const removeWritePageAds = () => {
                const adContainers = new Set();
                const searchRoot = writeBox instanceof Element ? writeBox : document;

                searchRoot.querySelectorAll('script[src*="/kas/static/ba.min.js"], ins.kakao_ad_area').forEach((node) => {
                    const adContainer = node.parentElement;
                    if (!(adContainer instanceof HTMLDivElement)) return;
                    adContainers.add(adContainer);
                });

                if (adContainers.size === 0) {
                    return false;
                }

                adContainers.forEach((adContainer) => adContainer.remove());
                console.log(`[DC Filter+UI] 글쓰기 페이지 광고 컨테이너 ${adContainers.size}개 제거 완료.`);
                return true;
            };
            const stopAdCleanup = () => {
                if (adRemovalInterval) {
                    clearInterval(adRemovalInterval);
                    adRemovalInterval = 0;
                }
                if (adRemovalObserver) {
                    adRemovalObserver.disconnect();
                    adRemovalObserver = null;
                }
            };
            let adRemovalObserver = null;
            let adRemovalInterval = 0;
            let adRemovalAttempts = 0;

            if (removeWritePageAds()) return;

            const observerTarget = writeBox || document.body;
            if (observerTarget instanceof Element) {
                adRemovalObserver = new MutationObserver(() => {
                    if (removeWritePageAds()) {
                        stopAdCleanup();
                    }
                });
                adRemovalObserver.observe(observerTarget, { childList: true, subtree: true });
            }

            adRemovalInterval = window.setInterval(() => {
                adRemovalAttempts += 1;
                if (removeWritePageAds() || adRemovalAttempts >= 10) {
                    stopAdCleanup();
                }
            }, 250);
        },
        async init() {
            if (this._initState === 'ready') return 'already-ready';
            if (this._initState === 'initializing' && this._initPromise) return this._initPromise;
            this._initState = 'initializing';
            this._initPromise = (async () => {
            const bootController = window.__dcufBootController;
            if (!this._bootRollbackRegistered && typeof bootController?.registerRollback === 'function') {
                this._bootRollbackRegistered = true;
                bootController.registerRollback((reason) => this.rollbackInitialListTransactions(reason));
                bootController.registerRecovery(() => this.ensureKnownListRuntimes(document, 'boot-recovery'));
            }


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


            if (this.isWritePage()) {
                this.transformWritePage();
                return 'non-list';
            } else if (this.isViewPage()) {
                const viewBottomContainer = document.querySelector('.view_bottom');
                if (viewBottomContainer) {
                    this.applyForceRefreshPagination(viewBottomContainer);
                }
                // [v2.6.8] 본문 + 댓글 글자크기 배율 스케일링 (통합)
                this.scaleAllFontSizes();
            }

            this.ensureKnownListRuntimes(document, 'init');
            this.subscribeListRuntimeUpdates();

            if (this.isListPage()) return 'list-runtime-ready';
            return 'non-list';
            })();
            try {
                const result = await this._initPromise;
                this._initState = 'ready';
                return result;
            } catch (error) {
                this._initState = 'failed';
                this._initPromise = null;
                this.rollbackInitialListTransactions('ui-init-failed');
                throw error;
            }
        }
    };
    window.__dcufUIModule = UIModule;

    const getDcufCollectionSize = (value) => {
        if (!value) return 0;
        if (value instanceof Map || value instanceof Set) return value.size;
        if (Array.isArray(value)) return value.length;
        if (typeof value === 'object') return Object.keys(value).length;
        return 0;
    };

    const getDcufHeapMb = () => {
        const heap = performance.memory || {};
        const toMb = (bytes) => Number.isFinite(bytes) ? Math.round((bytes / 1048576) * 10) / 10 : null;
        return {
            used: toMb(heap.usedJSHeapSize),
            total: toMb(heap.totalJSHeapSize),
            limit: toMb(heap.jsHeapSizeLimit)
        };
    };

    const getDcufApproxJsonKb = (value) => {
        try {
            return Math.round((JSON.stringify(value || {}).length / 1024) * 10) / 10;
        } catch (error) {
            return null;
        }
    };

    const collectDcufInternalMemorySample = (reason = 'manual') => {
        const runtimeCoordinator = window.__dcufRuntimeCoordinator || null;
        const diagnostics = typeof runtimeCoordinator?.snapshotDiagnostics === 'function'
            ? runtimeCoordinator.snapshotDiagnostics()
            : null;
        const taskQueues = runtimeCoordinator?._taskQueues || {};
        const taskQueueSnapshots = Object.fromEntries(
            Object.entries(taskQueues).map(([key, queue]) => [
                key,
                typeof queue?.snapshot === 'function' ? queue.snapshot() : null
            ])
        );

        return {
            reason,
            version: '3.4.5-beta',
            time: new Date().toISOString(),
            href: location.href,
            heap: getDcufHeapMb(),
            runtime: {
                mutationObserverReady: Boolean(runtimeCoordinator?._mutationObserverReady),
                subscriberCount: getDcufCollectionSize(runtimeCoordinator?._mutationSubscribers),
                pendingMutationRecords: getDcufCollectionSize(runtimeCoordinator?._pendingMutationRecords),
                pendingMutationRafActive: Boolean(runtimeCoordinator?._pendingMutationRafId),
                pendingMutationTimerActive: Boolean(runtimeCoordinator?._pendingMutationTimerId),
                taskQueueCount: getDcufCollectionSize(taskQueues),
                taskQueues: taskQueueSnapshots,
                diagnostics
            },
            filter: {
                userSumCache: getDcufCollectionSize(userSumCache),
                negativeUserSumCache: getDcufCollectionSize(FilterModule.USER_SUM_NEGATIVE_CACHE),
                negativeUserSumCacheLimit: FilterModule.USER_SUM_NEGATIVE_MAX_ENTRIES,
                inflightUserSumRequests: getDcufCollectionSize(FilterModule.INFLIGHT_USER_SUM_REQUESTS),
                blockedUidsCache: getDcufCollectionSize(FilterModule.BLOCKED_UIDS_CACHE),
                debugDecisionKeys: getDcufCollectionSize(FilterModule.DEBUG_DECISION_KEYS),
                queuedObserverFilterItems: getDcufCollectionSize(FilterModule._queuedObserverFilterItems),
                syncRefilterTimers: getDcufCollectionSize(FilterModule._syncRefilterTimerIds),
                commentRefilterTimers: getDcufCollectionSize(FilterModule._commentRefilterTimerIds),
                userSumCacheKb: getDcufApproxJsonKb(userSumCache),
                negativeUserSumCacheKb: getDcufApproxJsonKb(Array.from(FilterModule.USER_SUM_NEGATIVE_CACHE || [])),
                blockedUidsCacheKb: getDcufApproxJsonKb(FilterModule.BLOCKED_UIDS_CACHE)
            },
            ui: {
                nextRowId: UIModule._nextRowId,
                nextListRuntimeId: UIModule._nextListRuntimeId,
                listMutationSubscribed: typeof UIModule._listMutationUnsubscribe === 'function',
                postRevealRecoveryActive: typeof UIModule._postRevealRecoveryStop === 'function',
                searchDrawerRoots: getDcufCollectionSize(UIModule.SEARCH_DRAWER_ROOTS),
                searchDrawerGlobalHandlersBound: UIModule._searchDrawerGlobalHandlersBound,
                searchDrawerRafActive: Boolean(UIModule._searchDrawerUpdateRafId),
                searchDrawerTimerActive: Boolean(UIModule._searchDrawerUpdateTimerId),
                effectiveDarkMode: window.__dcufEffectiveDarkMode ?? null
            },
            dom: {
                nodes: document.getElementsByTagName('*').length,
                listWraps: document.querySelectorAll(UIModule.SELECTORS.LIST_WRAP).length,
                originalRows: document.querySelectorAll(UIModule.SELECTORS.ORIGINAL_POST_ITEM).length,
                customLists: document.querySelectorAll(`.${UIModule.CUSTOM_CLASSES.MOBILE_LIST}`).length,
                customPosts: document.querySelectorAll(`.${UIModule.CUSTOM_CLASSES.POST_ITEM}`).length,
                customBottomControls: document.querySelectorAll(`.${UIModule.CUSTOM_CLASSES.BOTTOM_CONTROLS}`).length,
                dcufStyles: document.querySelectorAll('style[id^="dcuf"], style[id*="dcuf"]').length
            }
        };
    };

    const emitDcufInternalMemorySample = (reason = 'manual') => {
        const sample = collectDcufInternalMemorySample(reason);
        window.__dcufLastMemorySample = sample;
        __dcufRoot.__dcufLastMemorySample = sample;
        __dcufRoot.postMessage({ type: 'DCUF_INTERNAL_MEMORY_SAMPLE', data: sample }, '*');
        return sample;
    };

    const dcufMemoryDebugApi = {
        sample: collectDcufInternalMemorySample,
        emit: emitDcufInternalMemorySample,
        dump(reason = 'manual-dump') {
            const sample = emitDcufInternalMemorySample(reason);
            console.table([{
                heapUsedMB: sample.heap.used,
                heapTotalMB: sample.heap.total,
                subscribers: sample.runtime.subscriberCount,
                pendingMutations: sample.runtime.pendingMutationRecords,
                userSumCache: sample.filter.userSumCache,
                userSumCacheKb: sample.filter.userSumCacheKb,
                negativeCache: sample.filter.negativeUserSumCache,
                inflight: sample.filter.inflightUserSumRequests,
                blockedUidsCache: sample.filter.blockedUidsCache,
                blockedUidsCacheKb: sample.filter.blockedUidsCacheKb,
                customPosts: sample.dom.customPosts
            }]);
            return sample;
        }
    };
    window.__dcufMemoryDebug = dcufMemoryDebugApi;
    __dcufRoot.__dcufMemoryDebug = dcufMemoryDebugApi;

    const isDcufMemoryDebugAutoEnabled = () => {
        try {
            return window.__DCUF_MEMORY_DEBUG__ === true
                || __dcufRoot.__DCUF_MEMORY_DEBUG__ === true
                || localStorage.getItem('dcufMemoryDebug') === '1';
        } catch (error) {
            return window.__DCUF_MEMORY_DEBUG__ === true || __dcufRoot.__DCUF_MEMORY_DEBUG__ === true;
        }
    };

    let dcufMemoryDebugTimerId = 0;
    if (isDcufMemoryDebugAutoEnabled()) {
        dcufMemoryDebugTimerId = window.setInterval(() => emitDcufInternalMemorySample('interval'), 10000);
    }
    window.addEventListener('pagehide', () => {
        if (dcufMemoryDebugTimerId) {
            emitDcufInternalMemorySample('pagehide');
            window.clearInterval(dcufMemoryDebugTimerId);
            dcufMemoryDebugTimerId = 0;
        }
    }, { once: true });


    // =================================================================
    // ================ Script-Level Initializations ===================
    // =================================================================
    const registerMenuCommandsSafely = () => {
        if (__dcufRoot.__dcufMenuCommandsRegistered) return;
        const commands = [
            ['글댓합 설정하기', FilterModule.showSettings.bind(FilterModule)],
            ['차단 유저 관리', PersonalBlockModule.createManagementPanel.bind(PersonalBlockModule)],
            ['플로팅 버튼 원위치', PersonalBlockModule.resetFabPosition.bind(PersonalBlockModule)],
            ['메뉴 버튼 크기 조절', PersonalBlockModule.showFabScalePanel.bind(PersonalBlockModule)]
        ];
        commands.forEach(([label, handler]) => {
            try { GM_registerMenuCommand(label, handler); }
            catch (error) { console.warn('[DCUF] menu registration failed:', label, error); }
        });
        __dcufRoot.__dcufMenuCommandsRegistered = true;
    };
    registerMenuCommandsSafely();


    // [신규] 단축키 설정을 다시 로드하는 전용 함수
    async function reloadShortcutKey() {
        const shortcutString = await GM_getValue(FilterModule.CONSTANTS.STORAGE_KEYS.SHORTCUT_KEY, 'Shift+S');
        activeShortcutObject = FilterModule.parseShortcutString(shortcutString);
    }

    async function awaitInitialCommentStabilization() {
        if (!UIModule.isViewPage()) return { reason: 'non-view' };
        const flushBarrier = window.__dcufFlushInitialCommentBarrier;
        if (typeof flushBarrier !== 'function') return { reason: 'unavailable' };

        const runtimeCoordinator = window.__dcufRuntimeCoordinator;
        const deadline = Date.now() + 500;
        let lastState = null;
        for (let attempt = 1; attempt <= 3 && Date.now() < deadline; attempt += 1) {
            runtimeCoordinator?.ensureMutationBus?.();
            lastState = flushBarrier({ reason: 'initial-comment-barrier', attempt });
            const firstGeneration = runtimeCoordinator?._mutationGeneration || lastState?.generation || 0;
            await new Promise((resolve) => requestAnimationFrame(resolve));
            runtimeCoordinator?.flushPendingMutations?.('initial-comment:quiet-1');
            const secondGeneration = runtimeCoordinator?._mutationGeneration || 0;
            if (secondGeneration !== firstGeneration) continue;
            await new Promise((resolve) => requestAnimationFrame(resolve));
            runtimeCoordinator?.flushPendingMutations?.('initial-comment:quiet-2');
            const thirdGeneration = runtimeCoordinator?._mutationGeneration || 0;
            if (thirdGeneration === secondGeneration) {
                lastState = flushBarrier({ reason: 'initial-comment-quiet', attempt });
                runtimeCoordinator?.incrementDiagnostic?.('ui.initialComment.mutationQuiet');
                return { reason: 'mutation-quiet', attempt, generation: thirdGeneration, prepareState: lastState };
            }
        }
        lastState = flushBarrier({ reason: 'initial-comment-bounded-timeout', attempt: 3 });
        return { reason: 'bounded-timeout', prepareState: lastState };
    }
    function prepareInitialCommentRevealBeforeMark(state = null) {
        const prepare = window.__dcufFlushInitialCommentBarrier || window.__dcufPrepareInitialCommentReveal;
        try {
            if (typeof prepare === 'function') {
                return prepare({
                    reason: 'before-mark-ui-ready',
                    previous: state?.commentInitState?.reason || ''
                });
            }
            if (UIModule.isViewPage() && typeof FilterModule?.runSyncRefilterPass === 'function') {
                const descriptors = FilterModule.runSyncRefilterPass('comments');
                return {
                    reason: 'filter-only',
                    targetCount: Array.isArray(descriptors) ? descriptors.length : 0
                };
            }
            return null;
        } catch (error) {
            return { reason: 'error', message: error?.message || 'unknown' };
        }
    }


    async function main() {
        if (isInitialized) {
            return {
                uiInitState: 'already-initialized',
                commentInitState: { reason: 'already-initialized' }
            };
        }
        isInitialized = true;
        if (window.__dcufBootController) {
            window.__dcufBootController.startPreparing('mobile-main');
            if (!__dcufRoot.__dcufShortcutReadyHookRegistered) {
                __dcufRoot.__dcufShortcutReadyHookRegistered = true;
                window.__dcufBootController.onReady(() => reloadShortcutKey().catch((error) => {
                    console.warn('[DCUF] shortcut initialization failed:', error);
                }));
            }
        }
        console.log("[DC Filter+UI] Initializing v3.4.5-beta...");


        if (!__dcufRoot.__dcufShortcutBound) {
            __dcufRoot.__dcufShortcutBound = true;
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
        }


        if (UIModule.isWritePage() || (!UIModule.isListPage() && !UIModule.isViewPage())) {
            const uiInitState = await UIModule.init();
            window.__dcufBootController?.note?.(UIModule.isWritePage() ? 'boot.write-ui-ready' : 'boot.other-ui-ready', { uiInitState });
            if (window.__dcufBootController) {
                window.__dcufBootController.onReady(() => {
                    void (async () => {
                        await FilterModule.init();
                        await PersonalBlockModule.init(FilterModule.getBootSnapshot(), { deferUi: true });
                    })().catch((error) => console.warn('[DCUF] deferred non-view initialization failed:', error));
                });
            }
            return { uiInitState, commentInitState: { reason: 'non-view' } };
        }

        await FilterModule.init();
        await PersonalBlockModule.init(FilterModule.getBootSnapshot(), { deferUi: true });
        window.__dcufBootController?.note?.('boot.local-filter-ready');
        const uiInitState = await UIModule.init();
        window.__dcufBootController?.note?.('boot.ui-ready', { uiInitState });
        // Mobile comment reply-merge cleanup can rerender blocked comment rows
        // once more after Filter/UI init. Keep the initial body lock until that first
        // stabilization window finishes so personally blocked comments do not flash visible.
        const commentInitState = await awaitInitialCommentStabilization();
        window.__dcufBootController?.note?.('boot.comment-barrier', { reason: commentInitState?.reason || 'unknown' });
        const initState = { uiInitState, commentInitState };
        console.log(`[DC Filter+UI] Initialization complete. ui=${uiInitState} comment=${commentInitState?.reason || 'unknown'}`);
        return initState;
    }


    let initializationRecoveryAttempts = 0;
    const runSafely = async () => {
        let initState = {
            uiInitState: 'fallback',
            commentInitState: { reason: 'not-started' }
        };
        let revealState = 'error';
        let initializationSucceeded = false;

        try {
            const mainState = await main();
            if (mainState && typeof mainState === 'object') initState = mainState;
            if (typeof UIModule?.waitForInitialRevealReady === 'function') {
                revealState = await UIModule.waitForInitialRevealReady();
            }
            window.__dcufBootController?.note?.('boot.style-verified', { revealState });
            initializationSucceeded = revealState !== 'error' && !String(revealState).startsWith('timeout-');
        } catch (error) {
            initState = {
                ...initState,
                uiInitState: 'error'
            };
            revealState = 'error';
            isInitialized = false;
            console.error("[DC Filter+UI] A critical error occurred during main execution:", error);
        } finally {
            // [v2.2.2 수정] 모든 UI 처리 및 필터링 적용이 끝난 후,
            // 루트 준비 완료 클래스를 추가하여 화면을 표시합니다.
            if (initializationSucceeded) {
                // Do not yield between the final local comment pass and removing the body lock.
                // This closes the window where host AJAX can replace comments after the initial
                // barrier but before markUiReady exposes the page.
                const finalCommentState = prepareInitialCommentRevealBeforeMark(initState);
                window.__dcufBootController?.note?.('boot.comment-finalized', {
                    reason: finalCommentState?.reason || 'not-applicable',
                    targetCount: finalCommentState?.targetCount || 0
                });
                if (UIModule.isViewPage() && finalCommentState?.reason === 'error') {
                    initializationSucceeded = false;
                    revealState = 'comment-finalize-error';
                }
            }
            if (initializationSucceeded) markUiReady('ready:' + revealState);
            else if (window.__dcufBootController) window.__dcufBootController.degrade('initialization:' + revealState);
            if (typeof UIModule?.startPostRevealRecoveryWatch === 'function') {
                const recoveryWatchDelayMs = Math.max(0, Number(__dcufRoot.__DCUF_TESTBED_CONFIG__?.boot?.recoveryWatchDelayMs) || 0);
                if (recoveryWatchDelayMs > 0) {
                    window.setTimeout(() => UIModule.startPostRevealRecoveryWatch({ revealState }), recoveryWatchDelayMs);
                } else {
                    UIModule.startPostRevealRecoveryWatch({ revealState });
                }
            }
            if (!initializationSucceeded && revealState === 'error' && initializationRecoveryAttempts < 2) {
                initializationRecoveryAttempts += 1;
                const retryBaseMs = Math.max(20, Number(__dcufRoot.__DCUF_TESTBED_CONFIG__?.boot?.recoveryRetryDelayMs) || 160);
                window.setTimeout(() => {
                    if (window.__dcufBootController?.state === 'degraded') runSafely();
                }, retryBaseMs * initializationRecoveryAttempts);
            }
            console.log(`[DC Filter+UI] UI is now visible. ui=${initState.uiInitState} comment=${initState.commentInitState?.reason || 'unknown'} reveal=${revealState}`);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runSafely, { once: true });
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
            const nextDarkMode = Boolean(darkModeStylesheet);
            const classStateChanged = body.classList.contains('dc-filter-dark-mode') !== nextDarkMode
                || Boolean(root && root.classList.contains('dc-filter-dark-mode') !== nextDarkMode);
            const effectiveStateChanged = window.__dcufEffectiveDarkMode !== nextDarkMode;

            if (!classStateChanged && !effectiveStateChanged) {
                UIModule.recordDiagnostic('ui.darkMode.skippedUnchanged');
                return;
            }

            body.classList.toggle('dc-filter-dark-mode', nextDarkMode);
            if (root) root.classList.toggle('dc-filter-dark-mode', nextDarkMode);
            window.__dcufEffectiveDarkMode = nextDarkMode;
            UIModule.recordDiagnostic('ui.darkMode.synced');
            window.__dcufDiagnostics?.setGauge?.('ui.darkMode.enabled', nextDarkMode ? 1 : 0);

            // 본문/이미지댓글은 host 쪽 늦은 렌더가 다시 색을 덮는 경우가 있어
            // dark class 토글 직후 후처리 동기화도 같이 다시 태웁니다.
            if (typeof window.__dcufSyncArticleDarkText === 'function') {
                window.__dcufSyncArticleDarkText();
            }
            if (typeof window.__dcufScheduleCommentNormalize === 'function') {
                window.__dcufScheduleCommentNormalize();
            }
        };

        if (window.__dcufDarkModeHeadObserver) {
            checkDarkModeStatus();
            return;
        }

        const observer = new MutationObserver(checkDarkModeStatus);
        observer.observe(head, { childList: true });
        window.__dcufDarkModeHeadObserver = observer;

        // 초기 상태 확인
        checkDarkModeStatus();
    };
    observeDarkMode();

})();

; (() => {
    const __dcufPostMainRoot = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
    if (window.top !== window.self) return;
    const previousState = __dcufPostMainRoot.__dcufPostMainFixesState;
    if (previousState === 'initializing' || previousState === 'ready') return;
    __dcufPostMainRoot.__dcufPostMainFixesState = 'initializing';
    try {

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
            overflow: visible !important;
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
        .custom-bottom-controls form[name="frmSearch"] .search_left_box {
            display: block !important;
            flex: 0 0 125px !important;
            min-width: 125px !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .search_left_box,
        .custom-bottom-controls form[name="frmSearch"] select {
            height: 38px !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .bottom_search_wrap,
        .custom-bottom-controls form[name="frmSearch"] .buttom_search_wrap {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 4px !important;
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
            display: flex !important;
            align-items: stretch !important;
            flex: 0 0 125px !important;
            min-width: 125px !important;
            width: 125px !important;
            height: 38px !important;
            border: 1px solid #3b4890 !important;
            border-radius: 0 !important;
            background: #fff !important;
            box-shadow: none !important;
            overflow: visible !important;
            box-sizing: border-box !important;
            visibility: visible !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .select_box.bottom_array .select_area {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            width: 100% !important;
            height: 100% !important;
            padding: 0 30px 0 10px !important;
            position: relative !important;
            border: 0 !important;
            background: transparent !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            color: #333 !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .select_box.bottom_array #search_type_txt,
        .custom-bottom-controls form[name="frmSearch"] .select_box.bottom_array .search_type_txt {
            display: block !important;
            min-width: 0 !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            color: inherit !important;
            font-size: 13px !important;
            font-weight: 700 !important;
            line-height: 30px !important;
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
        .custom-bottom-controls form[name="frmSearch"] #searchTypeLayer {
            border: 1px solid #3b4890 !important;
            background: #fff !important;
            box-shadow: none !important;
        }
        .custom-bottom-controls form[name="frmSearch"] #searchTypeLayer li,
        .custom-bottom-controls form[name="frmSearch"] #searchTypeLayer a {
            color: #333 !important;
            font-size: 13px !important;
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
        .custom-bottom-controls .dcuf-search-drawer-slot {
            width: 100% !important;
            display: flex !important;
            justify-content: center !important;
            position: relative !important;
            overflow: visible !important;
            padding-bottom: var(--dcuf-search-layer-reserve, 0px) !important;
            transition: padding-bottom 0.18s ease !important;
        }
        .custom-bottom-controls .dcuf-search-drawer-slot[data-dcuf-search-layer-open="1"] {
            z-index: 4 !important;
        }
        .custom-bottom-controls .dcuf-search-drawer-slot form[name="frmSearch"] {
            position: relative !important;
            z-index: 2 !important;
        }
        .custom-bottom-controls .dcuf-search-drawer-slot #searchTypeLayer {
            position: absolute !important;
            left: 0 !important;
            top: calc(100% + 8px) !important;
            width: 125px !important;
            z-index: 5 !important;
        }
        .custom-bottom-controls .bottom_movebox {
            display: flex !important;
            justify-content: flex-end !important;
            width: 100% !important;
            margin: -2px auto 0 !important;
            padding: 0 !important;
            position: relative !important;
            overflow: visible !important;
        }
        .custom-bottom-controls .bottom_movebox > .btn_grey_roundbg.btn_schmove {
            min-width: 124px !important;
            min-height: 38px !important;
            border: 1px solid var(--dcuf-border) !important;
            border-radius: 999px !important;
            background: rgba(255, 255, 255, 0.92) !important;
            box-shadow: 0 4px 12px rgba(12, 22, 40, 0.08) !important;
            color: var(--dcuf-fg-sub) !important;
        }
        .custom-bottom-controls .bottom_movebox > .btn_grey_roundbg.btn_schmove::after {
            margin-left: 6px !important;
        }
        /* DCUF list navigation surfaces */
        body:not(.is-write-page) .list_array_option {
            display: flex !important;
            align-items: center !important;
            flex-wrap: wrap !important;
            gap: 10px !important;
            width: calc(100% - 12px) !important;
            min-height: 64px !important;
            height: auto !important;
            position: relative !important;
            margin: 12px 6px 16px !important;
            padding: 10px 12px !important;
            border: 1px solid rgba(201, 213, 230, 0.96) !important;
            border-radius: 16px !important;
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(244, 248, 253, 0.98) 100%) !important;
            box-shadow:
                inset 0 1px 0 rgba(255, 255, 255, 0.98),
                inset 0 -8px 16px rgba(211, 222, 237, 0.18),
                0 12px 24px rgba(22, 39, 72, 0.08),
                0 2px 6px rgba(22, 39, 72, 0.05) !important;
            box-sizing: border-box !important;
            overflow: visible !important;
        }
        body:not(.is-write-page) .list_array_option .array_tab,
        body:not(.is-write-page) .list_array_option > .fl,
        body:not(.is-write-page) .list_array_option .center_box,
        body:not(.is-write-page) .list_array_option .right_box,
        body:not(.is-write-page) .list_array_option .fr {
            display: flex !important;
            align-items: center !important;
            flex-wrap: wrap !important;
            float: none !important;
            gap: 7px !important;
            min-width: 0 !important;
            position: static !important;
            inset: auto !important;
            width: auto !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            margin-top: 0 !important;
            margin-bottom: 0 !important;
        }
        body:not(.is-write-page) .list_array_option .center_box {
            flex: 1 1 220px !important;
            justify-content: center !important;
        }
        body:not(.is-write-page) .list_array_option .right_box,
        body:not(.is-write-page) .list_array_option .fr {
            margin-left: auto !important;
            justify-content: flex-end !important;
        }
        body:not(.is-write-page) .list_array_option .array_tab > ul,
        body:not(.is-write-page) .list_array_option .array_tab > ol {
            display: flex !important;
            align-items: center !important;
            flex-wrap: wrap !important;
            gap: 7px !important;
            position: static !important;
            float: none !important;
            width: auto !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            list-style: none !important;
        }
        body:not(.is-write-page) .list_array_option .array_tab li {
            position: static !important;
            float: none !important;
            width: auto !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            list-style: none !important;
        }
        body:not(.is-write-page) .list_array_option .array_tab button,
        body:not(.is-write-page) .list_array_option .array_tab a,
        .custom-bottom-controls .dcuf-bottom-action-card button,
        .custom-bottom-controls .dcuf-bottom-action-card a {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            min-width: 72px !important;
            min-height: 42px !important;
            margin: 0 !important;
            padding: 0 15px !important;
            border: 1px solid #c7d3e4 !important;
            border-radius: 11px !important;
            background: linear-gradient(180deg, #ffffff 0%, #f2f6fb 100%) !important;
            color: #35445d !important;
            font-size: 14px !important;
            font-weight: 800 !important;
            line-height: 1 !important;
            text-decoration: none !important;
            box-shadow:
                inset 0 1px 0 rgba(255, 255, 255, 0.98),
                0 4px 10px rgba(24, 43, 79, 0.08) !important;
            box-sizing: border-box !important;
        }
        body:not(.is-write-page) .list_array_option .array_tab .on,
        body:not(.is-write-page) .list_array_option .array_tab button.on,
        body:not(.is-write-page) .list_array_option .array_tab a.on,
        body:not(.is-write-page) .list_array_option .array_tab li.on > a,
        .custom-bottom-controls .dcuf-bottom-action-card .on,
        .custom-bottom-controls .dcuf-bottom-action-card button.on,
        .custom-bottom-controls .dcuf-bottom-action-card a.on {
            border-color: #315fdb !important;
            background: linear-gradient(180deg, #527df0 0%, #315fdc 100%) !important;
            color: #fff !important;
            box-shadow:
                inset 0 1px 0 rgba(255, 255, 255, 0.28),
                0 7px 14px rgba(49, 95, 220, 0.24) !important;
        }
        body:not(.is-write-page) .list_array_option select,
        body:not(.is-write-page) .list_array_option .select_box {
            min-height: 42px !important;
            margin: 0 !important;
            border: 1px solid #c7d3e4 !important;
            border-radius: 11px !important;
            background: linear-gradient(180deg, #ffffff 0%, #f2f6fb 100%) !important;
            color: #43516a !important;
            box-shadow: inset 0 1px 0 #fff, 0 4px 10px rgba(24, 43, 79, 0.07) !important;
        }
        body:not(.is-write-page) .list_array_option .btn_write,
        body:not(.is-write-page) .list_array_option .write,
        .custom-bottom-controls .dcuf-bottom-action-card .btn_write,
        .custom-bottom-controls .dcuf-bottom-action-card .write {
            min-width: 92px !important;
            min-height: 44px !important;
            border-color: #2e5bd4 !important;
            background: linear-gradient(180deg, #527cf0 0%, #2e5bd4 100%) !important;
            color: #fff !important;
            box-shadow:
                inset 0 1px 0 rgba(255, 255, 255, 0.28),
                0 8px 16px rgba(46, 91, 212, 0.25) !important;
        }
        .custom-bottom-controls {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 12px !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 16px 8px 24px !important;
            background: transparent !important;
            box-sizing: border-box !important;
            overflow: visible !important;
        }
        .custom-bottom-controls > .dcuf-bottom-action-card,
        .custom-bottom-controls > .dcuf-pagination-card,
        .custom-bottom-controls > .dcuf-search-card {
            width: 100% !important;
            max-width: 820px !important;
            margin: 0 auto !important;
            border: 1px solid rgba(201, 213, 230, 0.96) !important;
            border-radius: 16px !important;
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(244, 248, 253, 0.98) 100%) !important;
            box-shadow:
                inset 0 1px 0 rgba(255, 255, 255, 0.98),
                inset 0 -10px 18px rgba(211, 222, 237, 0.16),
                0 12px 24px rgba(22, 39, 72, 0.08),
                0 2px 6px rgba(22, 39, 72, 0.05) !important;
            box-sizing: border-box !important;
            overflow: visible !important;
        }
        .custom-bottom-controls > .dcuf-pagination-card {
            max-width: 1100px !important;
        }
        .custom-bottom-controls > .dcuf-search-card {
            max-width: 820px !important;
        }
        .custom-bottom-controls > .dcuf-bottom-action-card {
            max-width: none !important;
            padding: 10px !important;
        }
        .custom-bottom-controls .dcuf-bottom-action-card .list_bottom_btnbox,
        .custom-bottom-controls .dcuf-bottom-action-card .view_bottom_btnbox {
            display: flex !important;
            align-items: center !important;
            flex-wrap: wrap !important;
            gap: 8px !important;
            width: 100% !important;
            min-height: 44px !important;
            height: auto !important;
            position: static !important;
            inset: auto !important;
            float: none !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        .custom-bottom-controls .dcuf-bottom-action-card .fl,
        .custom-bottom-controls .dcuf-bottom-action-card .fr,
        .custom-bottom-controls .dcuf-bottom-action-card .right_box {
            display: flex !important;
            align-items: center !important;
            flex-wrap: wrap !important;
            gap: 8px !important;
            position: static !important;
            inset: auto !important;
            float: none !important;
            width: auto !important;
            height: auto !important;
        }
        .custom-bottom-controls .dcuf-bottom-action-card .fr,
        .custom-bottom-controls .dcuf-bottom-action-card .right_box {
            margin-left: auto !important;
        }
        .custom-bottom-controls > .dcuf-pagination-card {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 10px !important;
            padding: 12px !important;
        }
        .custom-bottom-controls .dcuf-pagination-card .bottom_paging_box {
            display: flex !important;
            align-items: center !important;
            justify-content: safe center !important;
            flex-wrap: nowrap !important;
            gap: 5px !important;
            width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            position: static !important;
            float: none !important;
            height: auto !important;
            min-height: 38px !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            scrollbar-width: thin !important;
            overscroll-behavior-x: contain !important;
        }
        .custom-bottom-controls .bottom_paging_box > a,
        .custom-bottom-controls .bottom_paging_box > strong,
        .custom-bottom-controls .bottom_paging_box > em,
        .custom-bottom-controls .bottom_paging_box > span > a,
        .custom-bottom-controls .bottom_paging_box > div > a,
        .custom-bottom-controls .bottom_paging_box > span > strong,
        .custom-bottom-controls .bottom_paging_box > div > strong,
        .custom-bottom-controls .bottom_paging_box > span > em,
        .custom-bottom-controls .bottom_paging_box > div > em {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex: 0 0 auto !important;
            min-width: 38px !important;
            height: 38px !important;
            margin: 0 !important;
            padding: 0 8px !important;
            border: 1px solid transparent !important;
            border-radius: 10px !important;
            color: #43516a !important;
            font-size: 14px !important;
            font-weight: 800 !important;
            line-height: 1 !important;
            text-decoration: none !important;
            box-sizing: border-box !important;
            position: static !important;
            float: none !important;
        }
        .custom-bottom-controls .bottom_paging_box > span,
        .custom-bottom-controls .bottom_paging_box > div {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: safe center !important;
            flex-wrap: nowrap !important;
            gap: 5px !important;
            position: static !important;
            inset: auto !important;
            float: none !important;
            min-width: 0 !important;
            width: auto !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            overflow: visible !important;
        }
        .custom-bottom-controls .bottom_paging_box > span > *,
        .custom-bottom-controls .bottom_paging_box > div > * {
            position: static !important;
            float: none !important;
        }
        .custom-bottom-controls .bottom_paging_box > a:hover,
        .custom-bottom-controls .bottom_paging_box > span > a:hover,
        .custom-bottom-controls .bottom_paging_box > div > a:hover {
            border-color: #c7d3e4 !important;
            background: rgba(255, 255, 255, 0.86) !important;
        }
        .custom-bottom-controls .bottom_paging_box > strong,
        .custom-bottom-controls .bottom_paging_box > em,
        .custom-bottom-controls .bottom_paging_box > .on {
            border-color: #315fdb !important;
            background: linear-gradient(180deg, #527df0 0%, #315fdc 100%) !important;
            color: #fff !important;
            box-shadow: 0 6px 12px rgba(49, 95, 220, 0.22) !important;
        }
        .custom-bottom-controls .dcuf-pagination-card .bottom_movebox {
            display: flex !important;
            justify-content: flex-end !important;
            width: 100% !important;
            position: static !important;
            margin: 0 !important;
        }
        .custom-bottom-controls .dcuf-pagination-card .bottom_movebox > .btn_grey_roundbg.btn_schmove,
        .custom-bottom-controls .dcuf-pagination-card .bottom_movebox > button,
        .custom-bottom-controls .dcuf-pagination-card .bottom_movebox > a {
            min-width: 116px !important;
            min-height: 42px !important;
            padding: 0 14px !important;
            border: 1px solid #c7d3e4 !important;
            border-radius: 11px !important;
            background: linear-gradient(180deg, #ffffff 0%, #f2f6fb 100%) !important;
            color: #43516a !important;
            font-weight: 800 !important;
            box-shadow: inset 0 1px 0 #fff, 0 4px 10px rgba(24, 43, 79, 0.08) !important;
        }
        .custom-bottom-controls > .dcuf-search-card {
            padding: 12px !important;
        }
        .custom-bottom-controls .dcuf-search-card .dcuf-search-drawer-slot {
            display: flex !important;
            justify-content: flex-start !important;
            width: 100% !important;
            padding-bottom: var(--dcuf-search-layer-reserve, 0px) !important;
        }
        .custom-bottom-controls .dcuf-search-card form[name="frmSearch"] {
            width: 100% !important;
            max-width: none !important;
        }
        .custom-bottom-controls[data-dcuf-controls-ready="1"] .dcuf-search-card form[name="frmSearch"] .bnt_search,
        .custom-bottom-controls[data-dcuf-controls-ready="1"] .dcuf-search-card form[name="frmSearch"] button.sp_img.bnt_search {
            flex: none !important;
            position: relative !important;
            width: 44px !important;
            min-width: 44px !important;
            height: 44px !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 1px solid #2e5bd4 !important;
            border-radius: 12px !important;
            background-color: #3768df !important;
            background-image: none !important;
            background-position: 0 0 !important;
            background-repeat: no-repeat !important;
            color: transparent !important;
            font-size: 0 !important;
            line-height: 0 !important;
            text-indent: 0 !important;
            overflow: hidden !important;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 7px 14px rgba(46, 91, 212, 0.24) !important;
        }
        .custom-bottom-controls[data-dcuf-controls-ready="1"] .dcuf-search-card form[name="frmSearch"] .bnt_search::before,
        .custom-bottom-controls[data-dcuf-controls-ready="1"] .dcuf-search-card form[name="frmSearch"] button.sp_img.bnt_search::before {
            content: "" !important;
            position: absolute !important;
            left: 50% !important;
            top: 50% !important;
            display: block !important;
            width: 15px !important;
            height: 15px !important;
            border: 3px solid #fff !important;
            border-radius: 50% !important;
            background: transparent !important;
            background-image: none !important;
            box-sizing: border-box !important;
            transform: translate(-62%, -62%) !important;
            pointer-events: none !important;
        }
        .custom-bottom-controls[data-dcuf-controls-ready="1"] .dcuf-search-card form[name="frmSearch"] .bnt_search::after,
        .custom-bottom-controls[data-dcuf-controls-ready="1"] .dcuf-search-card form[name="frmSearch"] button.sp_img.bnt_search::after {
            content: "" !important;
            position: absolute !important;
            left: 50% !important;
            top: 50% !important;
            display: block !important;
            width: 8px !important;
            height: 3px !important;
            border: 0 !important;
            border-radius: 999px !important;
            background: #fff !important;
            background-image: none !important;
            box-sizing: border-box !important;
            transform: translate(3px, 5px) rotate(45deg) !important;
            transform-origin: left center !important;
            pointer-events: none !important;
        }

        /* Live DCInside list controls: normalize host wrappers without cloning them. */
        body:not(.is-write-page) .list_array_option .output_array {
            display: flex !important;
            align-items: center !important;
            justify-content: flex-end !important;
            gap: 8px !important;
            position: static !important;
            inset: auto !important;
            float: none !important;
            width: auto !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
        }
        body:not(.is-write-page) .list_array_option .select_box.array_num {
            display: block !important;
            position: relative !important;
            inset: auto !important;
            flex: 0 0 76px !important;
            width: 76px !important;
            min-width: 76px !important;
            height: 44px !important;
            min-height: 44px !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            box-sizing: border-box !important;
        }
        body:not(.is-write-page) .list_array_option .select_box.array_num > select {
            position: absolute !important;
            width: 1px !important;
            height: 1px !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }
        body:not(.is-write-page) .list_array_option .select_box.array_num > .select_area {
            display: flex !important;
            align-items: stretch !important;
            position: relative !important;
            inset: auto !important;
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            background: transparent !important;
        }
        body:not(.is-write-page) .list_array_option .select_box.array_num > .select_area > a {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 10px 0 12px !important;
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            color: #43516a !important;
            font-size: 13px !important;
            font-weight: 800 !important;
            line-height: 1 !important;
            text-indent: 0 !important;
            text-decoration: none !important;
            box-sizing: border-box !important;
        }
        body:not(.is-write-page) .list_array_option .select_box.array_num > .option_box {
            position: absolute !important;
            left: 0 !important;
            top: calc(100% + 7px) !important;
            z-index: 30 !important;
            width: 100% !important;
            min-width: 76px !important;
            margin: 0 !important;
            border: 1px solid #c7d3e4 !important;
            border-radius: 10px !important;
            background: #fff !important;
            box-shadow: 0 10px 22px rgba(24, 43, 79, 0.16) !important;
            overflow: hidden !important;
        }
        body:not(.is-write-page) .list_array_option .switch_btnbox {
            display: flex !important;
            align-items: center !important;
            position: static !important;
            inset: auto !important;
            float: none !important;
            width: auto !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        body:not(.is-write-page) .list_array_option .btn_write,
        body:not(.is-write-page) .list_array_option .btn_write.txt {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            position: static !important;
            inset: auto !important;
            float: none !important;
            width: auto !important;
            min-width: 92px !important;
            height: 44px !important;
            margin: 0 !important;
            padding: 0 18px !important;
            border: 1px solid #2e5bd4 !important;
            border-radius: 11px !important;
            background-color: #2e5bd4 !important;
            background-image: linear-gradient(180deg, #527cf0 0%, #2e5bd4 100%) !important;
            background-position: 0 0 !important;
            background-repeat: no-repeat !important;
            color: #fff !important;
            font-size: 14px !important;
            font-weight: 800 !important;
            line-height: 1 !important;
            text-indent: 0 !important;
            text-decoration: none !important;
            box-sizing: border-box !important;
        }
        .custom-bottom-controls .dcuf-search-card form[name="frmSearch"] .bottom_search {
            position: static !important;
            inset: auto !important;
            transform: none !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            outline: 0 !important;
            background: transparent !important;
            background-image: none !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
        }
        .custom-bottom-controls .bottom_paging_box > a.sp_pagingicon {
            position: static !important;
            inset: auto !important;
            float: none !important;
            width: auto !important;
            min-width: 52px !important;
            height: 38px !important;
            padding: 0 10px !important;
            background: transparent !important;
            background-image: none !important;
            background-position: 0 0 !important;
            color: #43516a !important;
            font-size: 13px !important;
            font-weight: 800 !important;
            line-height: 38px !important;
            text-indent: 0 !important;
            white-space: nowrap !important;
            overflow: visible !important;
        }
        .custom-bottom-controls .bottom_paging_box > a.sp_pagingicon::before,
        .custom-bottom-controls .bottom_paging_box > a.sp_pagingicon::after {
            display: none !important;
            content: none !important;
        }
        #container.gallery_view .view_bottom_btnbox,
        #container.minor_view .view_bottom_btnbox,
        #container.mini_view .view_bottom_btnbox {
            display: flex !important;
            align-items: center !important;
            flex-wrap: wrap !important;
            gap: 8px !important;
            position: relative !important;
            inset: auto !important;
            float: none !important;
            width: calc(100% - 12px) !important;
            min-height: 64px !important;
            height: auto !important;
            margin: 12px 6px 16px !important;
            padding: 10px !important;
            border: 1px solid rgba(201, 213, 230, 0.96) !important;
            border-radius: 16px !important;
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(244, 248, 253, 0.98) 100%) !important;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.98), 0 12px 24px rgba(22, 39, 72, 0.08) !important;
            box-sizing: border-box !important;
            overflow: visible !important;
        }
        #container.gallery_view .view_bottom_btnbox > .fl,
        #container.gallery_view .view_bottom_btnbox > .fr,
        #container.minor_view .view_bottom_btnbox > .fl,
        #container.minor_view .view_bottom_btnbox > .fr,
        #container.mini_view .view_bottom_btnbox > .fl,
        #container.mini_view .view_bottom_btnbox > .fr {
            display: flex !important;
            align-items: center !important;
            flex-wrap: wrap !important;
            gap: 8px !important;
            position: static !important;
            inset: auto !important;
            float: none !important;
            width: auto !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        #container.gallery_view .view_bottom_btnbox > .fr,
        #container.minor_view .view_bottom_btnbox > .fr,
        #container.mini_view .view_bottom_btnbox > .fr {
            margin-left: auto !important;
        }
        #container.gallery_view .view_bottom_btnbox button,
        #container.gallery_view .view_bottom_btnbox a,
        #container.minor_view .view_bottom_btnbox button,
        #container.minor_view .view_bottom_btnbox a,
        #container.mini_view .view_bottom_btnbox button,
        #container.mini_view .view_bottom_btnbox a {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            position: static !important;
            inset: auto !important;
            min-width: 72px !important;
            min-height: 44px !important;
            margin: 0 !important;
            padding: 0 15px !important;
            border: 1px solid #c7d3e4 !important;
            border-radius: 11px !important;
            background: linear-gradient(180deg, #ffffff 0%, #f2f6fb 100%) !important;
            background-image: none !important;
            color: #35445d !important;
            font-size: 14px !important;
            font-weight: 800 !important;
            line-height: 1 !important;
            text-indent: 0 !important;
            text-decoration: none !important;
            box-sizing: border-box !important;
        }
        #container.gallery_view .view_bottom_btnbox .btn_blue,
        #container.gallery_view .view_bottom_btnbox .write,
        #container.minor_view .view_bottom_btnbox .btn_blue,
        #container.minor_view .view_bottom_btnbox .write,
        #container.mini_view .view_bottom_btnbox .btn_blue,
        #container.mini_view .view_bottom_btnbox .write {
            border-color: #2e5bd4 !important;
            background: linear-gradient(180deg, #527cf0 0%, #2e5bd4 100%) !important;
            color: #fff !important;
            box-shadow: 0 8px 16px rgba(46, 91, 212, 0.25) !important;
        }

        .page_head > .fr {
            position: relative !important;
            overflow: visible !important;
        }
        .dcuf-header-drawer {
            position: relative !important;
            margin: 0 !important;
            padding: 0 !important;
            display: inline-flex !important;
            align-items: center !important;
            flex: 0 0 auto !important;
        }
        .dcuf-header-drawer__toggle {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 8px !important;
            min-height: 32px !important;
            padding: 0 12px !important;
            border: 1px solid var(--dcuf-border) !important;
            border-radius: 999px !important;
            background: rgba(255, 255, 255, 0.94) !important;
            color: var(--dcuf-fg-sub) !important;
            font-size: 12px !important;
            font-weight: 700 !important;
            letter-spacing: -0.01em !important;
            box-shadow: none !important;
            white-space: nowrap !important;
        }
        .dcuf-header-drawer__toggle::after {
            content: "\\25be";
            font-size: 10px !important;
            transition: transform 0.18s ease !important;
        }
        .dcuf-header-drawer[data-open="1"] .dcuf-header-drawer__toggle::after {
            transform: rotate(180deg) !important;
        }
        .dcuf-header-drawer__body {
            display: none !important;
            max-height: 0 !important;
            opacity: 0 !important;
            visibility: hidden !important;
            margin-top: 0 !important;
            position: absolute !important;
            top: calc(100% + 8px) !important;
            right: 0 !important;
            width: min(640px, calc(100vw - 24px)) !important;
            max-width: calc(100vw - 24px) !important;
            overflow: hidden !important;
            pointer-events: none !important;
            z-index: 60 !important;
            transition: opacity 0.18s ease !important;
        }
        .dcuf-header-drawer[data-open="1"] .dcuf-header-drawer__body {
            display: block !important;
            opacity: 1 !important;
            visibility: visible !important;
            margin-top: 0 !important;
            pointer-events: auto !important;
            overflow: visible !important;
        }
        .dcuf-header-drawer__body-inner {
            min-height: 0 !important;
            overflow: visible !important;
            display: grid !important;
            gap: 0 !important;
            border: 1px solid var(--dcuf-border, #dfe5ee) !important;
            background: #fff !important;
            box-shadow: 0 10px 22px rgba(12, 22, 40, 0.12) !important;
        }
        .dcuf-header-drawer__panel {
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            padding: 0 !important;
            overflow: visible !important;
            max-height: min(70vh, 520px) !important;
        }
        .dcuf-header-drawer__panel + .dcuf-header-drawer__panel {
            border-top: 1px solid var(--dcuf-border, #dfe5ee) !important;
        }
        .dcuf-header-drawer__panel[data-source="issue"] > .issue_contentbox,
        .dcuf-header-drawer__panel[data-source="top-recom"] > .concept_wrap {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: static !important;
            left: auto !important;
            top: auto !important;
            height: auto !important;
            max-height: none !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            float: none !important;
            border: 0 !important;
            background: #fff !important;
            box-shadow: none !important;
            overflow: visible !important;
        }
        .dcuf-header-drawer__panel[data-source="issue"] > .issue_contentbox *:not(#hot_rank_pop2):not(#hot_rank_pop2 *),
        .dcuf-header-drawer__panel[data-source="top-recom"] > .concept_wrap * {
            box-sizing: border-box !important;
            max-width: 100% !important;
        }
        .dcuf-header-drawer__panel[data-source="issue"] > .issue_contentbox .minor_intro_box,
        .dcuf-header-drawer__panel[data-source="issue"] > .issue_contentbox .minor_ranking_box,
        .dcuf-header-drawer__panel[data-source="top-recom"] > .concept_wrap .concept_txt_list {
            width: 100% !important;
        }
        body #hot_rank_pop2 {
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            right: auto !important;
            bottom: auto !important;
            margin: 0 !important;
            transform: translate(-50%, -50%) !important;
            z-index: 2147483647 !important;
        }
        .dcuf-header-drawer__panel .btn_mgall_dcp:not(#hot_rank_pop2 *)::before,
        .dcuf-header-drawer__panel .under_poply_close:not(#hot_rank_pop2 *)::before,
        .dcuf-header-drawer__panel button[class*="btn_blue"]:not(#hot_rank_pop2 *)::before {
            content: none !important;
            display: none !important;
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
        body.dc-filter-dark-mode .custom-bottom-controls .bottom_movebox > .btn_grey_roundbg.btn_schmove,
        body.dc-filter-dark-mode .dcuf-header-drawer__toggle,
        body.dc-filter-dark-mode .dcuf-header-drawer__panel {
            background: rgba(26, 34, 46, 0.92) !important;
            border-color: #3d4c60 !important;
            color: #d2dced !important;
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3) !important;
        }
        body.dc-filter-dark-mode .dcuf-header-drawer__body-inner,
        body.dc-filter-dark-mode .dcuf-header-drawer__panel[data-source="issue"] > .issue_contentbox,
        body.dc-filter-dark-mode .dcuf-header-drawer__panel[data-source="issue"] > .issue_contentbox .minor_intro_box,
        body.dc-filter-dark-mode .dcuf-header-drawer__panel[data-source="issue"] > .issue_contentbox .minor_ranking_box {
            background: #1a222e !important;
            border-color: #3d4c60 !important;
            color: #d2dced !important;
        }
        body.dc-filter-dark-mode .dcuf-header-drawer__panel[data-source="issue"] > .issue_contentbox .minor_intro_box {
            background: linear-gradient(180deg, #233044 0%, #203044 100%) !important;
        }
        body.dc-filter-dark-mode .dcuf-header-drawer__panel[data-source="issue"] > .issue_contentbox .minor_ranking_box {
            background: linear-gradient(180deg, #1a222e 0%, #18202b 100%) !important;
            border-top: 1px solid rgba(88, 106, 132, 0.45) !important;
            box-shadow: inset 0 1px 0 rgba(120, 138, 164, 0.08) !important;
        }
        body.dc-filter-dark-mode .dcuf-header-drawer__panel[data-source="issue"] > .issue_contentbox *:not(#hot_rank_pop2):not(#hot_rank_pop2 *) {
            color: #d2dced !important;
        }
        body.dc-filter-dark-mode .custom-bottom-controls form[name="frmSearch"] input[type="text"] {
            background: #111722 !important;
            border-color: #445267 !important;
            color: #f3f6ff !important;
        }
        body.dc-filter-dark-mode:not(.is-write-page) .list_array_option,
        body.dc-filter-dark-mode .custom-bottom-controls > .dcuf-bottom-action-card,
        body.dc-filter-dark-mode .custom-bottom-controls > .dcuf-pagination-card,
        body.dc-filter-dark-mode .custom-bottom-controls > .dcuf-search-card {
            --dcuf-control-border: #43526a;
            --dcuf-control-surface: linear-gradient(180deg, #263347 0%, #202b3a 100%);
            --dcuf-control-text: #e8eef8;
            --dcuf-search-input: #111722;
            border-color: #3d4c60 !important;
            background: linear-gradient(180deg, rgba(35, 46, 62, 0.98) 0%, rgba(25, 34, 47, 0.98) 100%) !important;
            box-shadow:
                inset 0 1px 0 rgba(133, 153, 183, 0.14),
                inset 0 -10px 18px rgba(5, 10, 18, 0.18),
                0 14px 28px rgba(0, 0, 0, 0.3),
                0 2px 7px rgba(0, 0, 0, 0.24) !important;
        }
        body.dc-filter-dark-mode:not(.is-write-page) .list_array_option .array_tab button,
        body.dc-filter-dark-mode:not(.is-write-page) .list_array_option .array_tab a,
        body.dc-filter-dark-mode .custom-bottom-controls .dcuf-bottom-action-card button,
        body.dc-filter-dark-mode .custom-bottom-controls .dcuf-bottom-action-card a,
        body.dc-filter-dark-mode:not(.is-write-page) .list_array_option select,
        body.dc-filter-dark-mode:not(.is-write-page) .list_array_option .select_box,
        body.dc-filter-dark-mode .custom-bottom-controls .dcuf-pagination-card .bottom_movebox > button,
        body.dc-filter-dark-mode .custom-bottom-controls .dcuf-pagination-card .bottom_movebox > a {
            border-color: #43526a !important;
            background: linear-gradient(180deg, #2a384c 0%, #222d3d 100%) !important;
            color: #e1e9f5 !important;
            box-shadow: inset 0 1px 0 rgba(135, 155, 184, 0.14), 0 5px 12px rgba(0, 0, 0, 0.22) !important;
        }
        body.dc-filter-dark-mode:not(.is-write-page) .list_array_option .array_tab .on,
        body.dc-filter-dark-mode:not(.is-write-page) .list_array_option .array_tab button.on,
        body.dc-filter-dark-mode:not(.is-write-page) .list_array_option .array_tab a.on,
        body.dc-filter-dark-mode .custom-bottom-controls .dcuf-bottom-action-card .on,
        body.dc-filter-dark-mode .custom-bottom-controls .dcuf-bottom-action-card button.on,
        body.dc-filter-dark-mode .custom-bottom-controls .dcuf-bottom-action-card a.on {
            border-color: #4c7bf0 !important;
            background: linear-gradient(180deg, #5b86f2 0%, #3868df 100%) !important;
            color: #fff !important;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.24), 0 7px 14px rgba(31, 68, 164, 0.4) !important;
        }

        body.dc-filter-dark-mode .custom-bottom-controls .bottom_paging_box > a,
        body.dc-filter-dark-mode .custom-bottom-controls .bottom_paging_box > span > a,
        body.dc-filter-dark-mode .custom-bottom-controls .bottom_paging_box > div > a {
            color: #cbd7e8 !important;
        }
        body.dc-filter-dark-mode .custom-bottom-controls .bottom_paging_box > a:hover,
        body.dc-filter-dark-mode .custom-bottom-controls .bottom_paging_box > span > a:hover,
        body.dc-filter-dark-mode .custom-bottom-controls .bottom_paging_box > div > a:hover {
            border-color: #4b5c74 !important;
            background: rgba(46, 60, 80, 0.86) !important;
        }
        body.dc-filter-dark-mode .custom-bottom-controls .dcuf-search-card form[name="frmSearch"] input[type="text"] {
            background: var(--dcuf-search-input) !important;
            color: #f3f6ff !important;
        }
        body.dc-filter-dark-mode #container.gallery_view .view_bottom_btnbox,
        body.dc-filter-dark-mode #container.minor_view .view_bottom_btnbox,
        body.dc-filter-dark-mode #container.mini_view .view_bottom_btnbox {
            border-color: #3d4c60 !important;
            background: linear-gradient(180deg, rgba(35, 46, 62, 0.98) 0%, rgba(25, 34, 47, 0.98) 100%) !important;
            box-shadow: inset 0 1px 0 rgba(133, 153, 183, 0.14), 0 14px 28px rgba(0, 0, 0, 0.3) !important;
        }
        body.dc-filter-dark-mode #container.gallery_view .view_bottom_btnbox button,
        body.dc-filter-dark-mode #container.gallery_view .view_bottom_btnbox a,
        body.dc-filter-dark-mode #container.minor_view .view_bottom_btnbox button,
        body.dc-filter-dark-mode #container.minor_view .view_bottom_btnbox a,
        body.dc-filter-dark-mode #container.mini_view .view_bottom_btnbox button,
        body.dc-filter-dark-mode #container.mini_view .view_bottom_btnbox a {
            border-color: #43526a !important;
            background: linear-gradient(180deg, #2a384c 0%, #222d3d 100%) !important;
            color: #e1e9f5 !important;
            box-shadow: inset 0 1px 0 rgba(135, 155, 184, 0.14), 0 5px 12px rgba(0, 0, 0, 0.22) !important;
        }
        body.dc-filter-dark-mode #container.gallery_view .view_bottom_btnbox .btn_blue,
        body.dc-filter-dark-mode #container.gallery_view .view_bottom_btnbox .write,
        body.dc-filter-dark-mode #container.minor_view .view_bottom_btnbox .btn_blue,
        body.dc-filter-dark-mode #container.minor_view .view_bottom_btnbox .write,
        body.dc-filter-dark-mode #container.mini_view .view_bottom_btnbox .btn_blue,
        body.dc-filter-dark-mode #container.mini_view .view_bottom_btnbox .write {
            border-color: #4c7bf0 !important;
            background: linear-gradient(180deg, #5b86f2 0%, #3868df 100%) !important;
            color: #fff !important;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.24), 0 7px 14px rgba(31, 68, 164, 0.4) !important;
        }
        body.dc-filter-dark-mode:not(.is-write-page) .list_array_option .select_box.array_num > .select_area > a {
            color: #e1e9f5 !important;
        }
        body.dc-filter-dark-mode:not(.is-write-page) .list_array_option .select_box.array_num > .option_box {
            border-color: #43526a !important;
            background: #222d3d !important;
            color: #e1e9f5 !important;
        }

        @media screen and (max-width: 640px) {
            body:not(.is-write-page) .list_array_option {
                width: calc(100% - 8px) !important;
                margin: 8px 4px 12px !important;
                padding: 9px !important;
                border-radius: 14px !important;
                gap: 8px !important;
            }
            #container.gallery_view .view_bottom_btnbox,
            #container.minor_view .view_bottom_btnbox,
            #container.mini_view .view_bottom_btnbox {
                width: calc(100% - 8px) !important;
                margin: 8px 4px 12px !important;
                padding: 9px 88px 9px 9px !important;
                border-radius: 14px !important;
                gap: 8px !important;
            }
            #container.gallery_view .view_bottom_btnbox button,
            #container.gallery_view .view_bottom_btnbox a,
            #container.minor_view .view_bottom_btnbox button,
            #container.minor_view .view_bottom_btnbox a,
            #container.mini_view .view_bottom_btnbox button,
            #container.mini_view .view_bottom_btnbox a {
                min-width: 64px !important;
                min-height: 42px !important;
                padding: 0 12px !important;
            }

            body:not(.is-write-page) .list_array_option .center_box {
                order: 3 !important;
                flex-basis: 100% !important;
                justify-content: flex-start !important;
            }
            body:not(.is-write-page) .list_array_option .right_box,
            body:not(.is-write-page) .list_array_option .fr {
                flex: 1 1 auto !important;
            }
            body:not(.is-write-page) .list_array_option .array_tab button,
            body:not(.is-write-page) .list_array_option .array_tab a,
            .custom-bottom-controls .dcuf-bottom-action-card button,
            .custom-bottom-controls .dcuf-bottom-action-card a {
                min-width: 64px !important;
                min-height: 42px !important;
                padding: 0 12px !important;
            }
            .custom-bottom-controls {
                padding: 12px 4px 20px !important;
                gap: 10px !important;
            }
            .custom-bottom-controls > .dcuf-bottom-action-card,
            .custom-bottom-controls > .dcuf-pagination-card,
            .custom-bottom-controls > .dcuf-search-card {
                border-radius: 14px !important;
            }
            .custom-bottom-controls > .dcuf-bottom-action-card {
                padding: 9px 88px 9px 9px !important;
            }
            .custom-bottom-controls > .dcuf-pagination-card {
                padding: 10px !important;
            }
            .custom-bottom-controls .dcuf-pagination-card .bottom_movebox {
                width: 100% !important;
                justify-content: center !important;
            }
            .custom-bottom-controls .bottom_paging_box > a,
            .custom-bottom-controls .bottom_paging_box > strong,
            .custom-bottom-controls .bottom_paging_box > em,
            .custom-bottom-controls .bottom_paging_box > span > a,
            .custom-bottom-controls .bottom_paging_box > div > a,
            .custom-bottom-controls .bottom_paging_box > span > strong,
            .custom-bottom-controls .bottom_paging_box > div > strong,
            .custom-bottom-controls .bottom_paging_box > span > em {
                min-width: 36px !important;
                height: 36px !important;
                padding: 0 6px !important;
            }
            .custom-bottom-controls > .dcuf-search-card {
                padding: 10px !important;
            }
            .custom-bottom-controls .dcuf-search-card form[name="frmSearch"] .bottom_search {
                flex-wrap: wrap !important;
                height: auto !important;
                gap: 8px !important;
            }
            .custom-bottom-controls .dcuf-search-card form[name="frmSearch"] .inner_search {
                flex: 1 1 100% !important;
                width: 100% !important;
            }
            .custom-bottom-controls[data-dcuf-controls-ready="1"] .dcuf-search-card form[name="frmSearch"] .bnt_search,
            .custom-bottom-controls[data-dcuf-controls-ready="1"] .dcuf-search-card form[name="frmSearch"] button.sp_img.bnt_search {
                width: 100% !important;
                min-width: 100% !important;
                height: 44px !important;
            }

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

    const debugState = {
        status: 'idle',
        detail: null,
        ts: null,
        href: location.href,
        refreshCount: 0,
        refreshAttempted: false,
        lastFailureReason: null,
        lastVerify: null
    };

    const setDebug = (status, detail, extra = {}) => {
        debugState.status = status;
        debugState.detail = detail;
        debugState.ts = new Date().toISOString();
        debugState.href = location.href;
        Object.assign(debugState, extra);
        const previousPayload = (window[DEBUG_KEY] && typeof window[DEBUG_KEY] === 'object')
            ? window[DEBUG_KEY]
            : {};
        const payload = { ...previousPayload, ...debugState };
        window[DEBUG_KEY] = payload;
        const root = document.documentElement;
        if (root instanceof HTMLElement) {
            root.setAttribute('data-dcuf-phase1', status);
        }
        return payload;
    };

    const toPixelValue = (value) => {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const isTransparentColor = (value) => {
        if (!value) return true;
        const normalized = String(value).trim().toLowerCase();
        return normalized === 'transparent' || normalized === 'rgba(0, 0, 0, 0)' || normalized === 'rgba(0,0,0,0)';
    };

    const hasRenderableBorder = (style) => {
        const edges = ['Top', 'Right', 'Bottom', 'Left'];
        return edges.some((edge) => {
            const width = toPixelValue(style[`border${edge}Width`]);
            const borderStyle = style[`border${edge}Style`];
            const color = style[`border${edge}Color`];
            return width > 0 && borderStyle !== 'none' && !isTransparentColor(color);
        });
    };

    const resolveScopeRoot = (root = document) => {
        if (root instanceof Document || root instanceof Element || root instanceof DocumentFragment) return root;
        return document;
    };

    const findWithinRoot = (root, selector) => {
        const scope = resolveScopeRoot(root);
        if (scope instanceof Element && scope.matches(selector)) return scope;
        return typeof scope.querySelector === 'function' ? scope.querySelector(selector) : null;
    };

    const injectStyle = ({ refresh = false, reason = 'ensure' } = {}) => {
        const target = document.head || document.documentElement;
        if (!target) {
            setDebug('no-target', `${reason} / head/documentElement unavailable`);
            return false;
        }

        let style = document.getElementById(STYLE_ID);
        if (style instanceof HTMLStyleElement) {
            if (refresh) {
                debugState.refreshAttempted = true;
                debugState.refreshCount += 1;
                style.textContent = css;
                target.appendChild(style);
                setDebug('style-refreshed', `${reason} / style tag refreshed`, {
                    refreshAttempted: true,
                    refreshCount: debugState.refreshCount
                });
                return true;
            }

            setDebug('style-exists', `${reason} / style tag already present`, {
                refreshAttempted: debugState.refreshAttempted,
                refreshCount: debugState.refreshCount
            });
            return true;
        }

        style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;
        target.appendChild(style);
        if (refresh) {
            debugState.refreshAttempted = true;
            debugState.refreshCount += 1;
        }
        setDebug(refresh ? 'style-refreshed' : 'style-injected', `${reason} / style tag appended`, {
            refreshAttempted: debugState.refreshAttempted,
            refreshCount: debugState.refreshCount
        });
        return true;
    };

    const verifyApplied = (reason = 'verify', root = document) => {
        const list = findWithinRoot(root, '.custom-mobile-list');
        if (!(list instanceof HTMLElement)) {
            const result = {
                ready: false,
                reason: 'waiting-list',
                detail: { reason, scope: root instanceof Element ? root.className || root.tagName : 'document' }
            };
            setDebug('waiting-list', JSON.stringify(result.detail), {
                lastFailureReason: result.reason,
                lastVerify: result
            });
            return result;
        }

        const items = Array.from(list.querySelectorAll('.custom-post-item'));
        if (items.length === 0) {
            const result = {
                ready: false,
                reason: 'waiting-items',
                detail: { reason, itemCount: 0 }
            };
            setDebug('waiting-items', JSON.stringify(result.detail), {
                lastFailureReason: result.reason,
                lastVerify: result
            });
            return result;
        }

        const item = items[0];
        const listStyle = window.getComputedStyle(list);
        const itemStyle = window.getComputedStyle(item);
        const detail = {
            reason,
            itemCount: items.length,
            listPaddingLeft: toPixelValue(listStyle.paddingLeft),
            listPaddingRight: toPixelValue(listStyle.paddingRight),
            listBackgroundColor: listStyle.backgroundColor,
            listBackgroundImage: listStyle.backgroundImage,
            itemRadius: toPixelValue(itemStyle.borderRadius),
            itemMarginBottom: toPixelValue(itemStyle.marginBottom),
            itemBackgroundColor: itemStyle.backgroundColor,
            itemBackgroundImage: itemStyle.backgroundImage,
            itemBoxShadow: itemStyle.boxShadow,
            hasVisibleBackground: itemStyle.backgroundImage !== 'none' || !isTransparentColor(itemStyle.backgroundColor),
            hasRenderableBorder: hasRenderableBorder(itemStyle)
        };

        let failureReason = null;
        if (detail.itemRadius < 10) {
            failureReason = 'insufficient-radius';
        } else if (detail.itemCount > 1 && detail.itemMarginBottom < 6) {
            failureReason = 'insufficient-spacing';
        } else if (Math.max(detail.listPaddingLeft, detail.listPaddingRight) < 8) {
            failureReason = 'insufficient-padding';
        } else if (!detail.hasVisibleBackground) {
            failureReason = 'transparent-background';
        } else if (itemStyle.boxShadow === 'none' && !detail.hasRenderableBorder) {
            failureReason = 'missing-elevation';
        }

        const result = {
            ready: !failureReason,
            reason: failureReason || 'ready',
            detail
        };
        setDebug(result.ready ? 'applied' : 'not-applied', JSON.stringify({
            ...detail,
            reason: result.reason
        }), {
            lastFailureReason: failureReason,
            lastVerify: result
        });
        return result;
    };

    window.__dcufPhase1Theme = {
        ensure(options = {}) {
            return injectStyle(options);
        },
        verify(root = document) {
            return verifyApplied('bridge', root);
        },
        getDebugState() {
            const previousPayload = (window[DEBUG_KEY] && typeof window[DEBUG_KEY] === 'object')
                ? window[DEBUG_KEY]
                : {};
            return { ...previousPayload, ...debugState };
        }
    };

    injectStyle({ reason: 'initial' });
    verifyApplied('initial');

    const scheduleVerify = (reason, delay) => {
        setTimeout(() => verifyApplied(reason), delay);
    };

    scheduleVerify('after-100ms', 100);
    scheduleVerify('after-500ms', 500);
    scheduleVerify('after-1500ms', 1500);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            injectStyle({ reason: 'domcontentloaded' });
            verifyApplied('domcontentloaded');
            scheduleVerify('domcontentloaded+300ms', 300);
        }, { once: true });
    }

    window.addEventListener('load', () => {
        injectStyle({ reason: 'window-load' });
        verifyApplied('window-load');
        scheduleVerify('window-load+300ms', 300);
    }, { once: true });
})();

(() => {
    if (!__dcufPageSupports('view')) return;

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
            color: var(--dcuf-view-fg) !important;
            -webkit-text-fill-color: var(--dcuf-view-fg) !important;
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
        body.dc-filter-dark-mode .view_content_wrap .gallview_contents div,
        body.dc-filter-dark-mode .view_content_wrap .gallview_contents *,
        body.dc-filter-dark-mode .view_content_wrap .writing_view_box,
        body.dc-filter-dark-mode .view_content_wrap .writing_view_box *,
        body.dc-filter-dark-mode .view_content_wrap .write_div,
        body.dc-filter-dark-mode .view_content_wrap .write_div *,
        body.dc-filter-dark-mode .view_content_wrap .write_div [data-scaled-by-filter],
        body.dc-filter-dark-mode .view_content_wrap .write_div [data-scaled-by-filter] * {
            color: var(--dcuf-view-fg) !important;
            -webkit-text-fill-color: var(--dcuf-view-fg) !important;
            background-color: transparent !important;
        }
        body.dc-filter-dark-mode .view_content_wrap :is(.gallview_contents, .writing_view_box, .write_div)
            :is([style], p, div, span, font, b, strong, em, i, a, li, td, th, pre, blockquote) {
            opacity: 1 !important;
            filter: none !important;
            mix-blend-mode: normal !important;
            text-shadow: none !important;
            -webkit-text-stroke: 0 transparent !important;
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
        .comment_box,
        .comment_box .cmt_txtbox,
        .comment_box .usertxt,
        .comment_box .reply_box,
        .comment_box .reply_list > li {
            -webkit-text-size-adjust: 100% !important;
            text-size-adjust: 100% !important;
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
            font-size: clamp(16px, 4.2vw, 19px) !important;
            line-height: 1.5 !important;
            white-space: pre-wrap !important;
            word-break: normal !important;
            overflow-wrap: anywhere !important;
            max-width: none !important;
            overflow: visible !important;
            text-overflow: clip !important;
        }
        .comment_box .reply_box .usertxt {
            font-size: clamp(16px, 4.2vw, 19px) !important;
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
        #container.mini_view article > .view_bottom_btnbox {
            position: relative !important;
            z-index: 1 !important;
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
        /* [v3.1.1-beta.1] 이미지댓글 내부 소형 팝업(닉네임/삭제비번)이 카드에 잘리지 않도록 필요한 컨텍스트만 해제 */
        .view_comment.image_comment,
        .view_comment.image_comment .comment_wrap,
        .view_comment.image_comment .comment_box.img_comment_box,
        .view_comment.image_comment .comment_box.img_comment_box .cmt_list,
        .view_comment.image_comment .comment_box.img_comment_box .reply_list,
        .view_comment.image_comment .comment_box.img_comment_box .cmt_list > li,
        .view_comment.image_comment .comment_box.img_comment_box .reply_list > li,
        .view_comment.image_comment .comment_box.img_comment_box .cmt_info,
        .view_comment.image_comment .comment_box.img_comment_box .reply_info,
        .view_comment.image_comment .comment_box.img_comment_box .cmt_nickbox,
        .view_comment.image_comment .comment_box.img_comment_box .gall_writer,
        .view_comment.image_comment .comment_box.img_comment_box .fr.clear {
            overflow: visible !important;
        }
        .view_comment.image_comment .comment_box.img_comment_box .cmt_info,
        .view_comment.image_comment .comment_box.img_comment_box .reply_info,
        .view_comment.image_comment .comment_box.img_comment_box .fr.clear {
            position: relative !important;
            z-index: auto !important;
        }
        .view_comment.image_comment #user_data_lyr,
        .view_comment.image_comment .user_data,
        .view_comment.image_comment #dccon_guide_lyr,
        .view_comment.image_comment .pop_wrap.type2,
        .view_comment.image_comment .pop_wrap.type3,
        .view_comment.image_comment .comment_box.img_comment_box .cmt_delpw_box,
        .view_comment.image_comment .comment_box.img_comment_box [id$="_delpw_box"] {
            z-index: 2147483647 !important;
        }
        .view_comment.image_comment #user_data_lyr,
        .view_comment.image_comment .user_data {
            overflow: visible !important;
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
        .view_comment.image_comment .cmt_write_box .user_info_input input[name="gall_nick_name"],
        .view_comment.image_comment .cmt_write_box .user_info_input input[readonly][id^="gall_nick_name_"] {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            min-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            border: 0 !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }
        .view_comment.image_comment .cmt_write_box .user_info_input input[id^="img_cmt_name_"] {
            display: block !important;
            position: relative !important;
            z-index: 1 !important;
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
            -webkit-text-fill-color: #dbe6f5 !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box .ip,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box .date_time,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box .txt_del {
            color: #9fb0c8 !important;
            -webkit-text-fill-color: #9fb0c8 !important;
        }
        body.dc-filter-dark-mode .comment_box.img_comment_box .gall_writer,
        body.dc-filter-dark-mode .comment_box.img_comment_box .nickname,
        body.dc-filter-dark-mode .comment_box.img_comment_box .nickname em,
        body.dc-filter-dark-mode .comment_box.img_comment_box .usertxt {
            color: #dbe6f5 !important;
            -webkit-text-fill-color: #dbe6f5 !important;
        }
        body.dc-filter-dark-mode .comment_box.img_comment_box .ip,
        body.dc-filter-dark-mode .comment_box.img_comment_box .date_time,
        body.dc-filter-dark-mode .comment_box.img_comment_box .txt_del,
        body.dc-filter-dark-mode .comment_box.img_comment_box .reply_num {
            color: #9fb0c8 !important;
            -webkit-text-fill-color: #9fb0c8 !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment #user_data_lyr .user_data_list,
        body.dc-filter-dark-mode .view_comment.image_comment .user_data .user_data_list,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box .cmt_delpw_box,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box [id$="_delpw_box"] {
            background: #1f2937 !important;
            border-color: rgba(120, 144, 175, 0.52) !important;
            box-shadow: 0 18px 32px rgba(2, 7, 15, 0.52) !important;
            color: #e3ebf8 !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box .cmt_delpw_box input[type="password"],
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box [id$="_delpw_box"] input[type="password"] {
            background: rgba(18, 26, 37, 0.94) !important;
            color: #e3ebf8 !important;
            border-color: rgba(120, 144, 175, 0.44) !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment #user_data_lyr .user_data_list > li,
        body.dc-filter-dark-mode .view_comment.image_comment .user_data .user_data_list > li {
            background: linear-gradient(180deg, rgba(34, 45, 60, 0.98) 0%, rgba(27, 37, 50, 0.98) 100%) !important;
            border-top-color: rgba(120, 144, 175, 0.3) !important;
            color: #e3ebf8 !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box .cmt_delpw_box button,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box [id$="_delpw_box"] button {
            color: #e3ebf8 !important;
            -webkit-text-fill-color: #e3ebf8 !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment #user_data_lyr .user_data_list > li > a,
        body.dc-filter-dark-mode .view_comment.image_comment #user_data_lyr .user_data_list > li > button,
        body.dc-filter-dark-mode .view_comment.image_comment .user_data .user_data_list > li > a,
        body.dc-filter-dark-mode .view_comment.image_comment .user_data .user_data_list > li > button,
        body.dc-filter-dark-mode .view_comment.image_comment #user_data_lyr .user_data_list > li > span,
        body.dc-filter-dark-mode .view_comment.image_comment .user_data .user_data_list > li > span {
            color: #e3ebf8 !important;
            -webkit-text-fill-color: #e3ebf8 !important;
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
        div[id^="comment_wrap_"] .comment_box .cmt_list > li[data-dcuf-comment-shell-blocked="1"] > :not(.reply) {
            display: none !important;
        }
        div[id^="comment_wrap_"] .comment_box .cmt_list > li[data-dcuf-comment-shell-blocked="1"] {
            min-height: 0 !important;
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
            font-size: clamp(16px, 4.2vw, 19px) !important;
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
        #focus_cmt > .cmt_write_box,
        #focus_cmt > .cmt_write_box .cmt_txt_cont,
        #focus_cmt > .cmt_write_box .cmt_cont_bottm,
        #focus_cmt > .cmt_write_box .dccon_guidebox {
            overflow: visible !important;
        }
        /* Live comment close removes the show class and collapses the wrapper to its header height.
           Do not let the open-state popup overflow rule leak the comment body outside it. */
        #focus_cmt > div[id^="comment_wrap_"].comment_wrap:not(.show) {
            overflow: hidden !important;
        }
        #focus_cmt > div[id^="comment_wrap_"].comment_wrap:not(.show) > .comment_box {
            display: none !important;
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
            box-shadow: 0 14px 28px rgba(15, 23, 42, 0.09), 0 3px 8px rgba(15, 23, 42, 0.06) !important;
        }
        /* Focus-comment parent cards paint their merged reply background through ::after.
           Later popup z-index fixes must not blindly lift this whole card above siblings,
           or the extended white background covers nearby comments/replies. */
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li[data-dcuf-focus-group-parent="1"] {
            position: relative !important;
            background: transparent !important;
            box-shadow: none !important;
            overflow: visible !important;
            z-index: 0 !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li[data-dcuf-focus-group-parent="1"]::after {
            content: "" !important;
            position: absolute !important;
            left: 0 !important;
            right: 0 !important;
            top: 0 !important;
            bottom: calc(var(--dcuf-focus-group-extend, 0px) * -1) !important;
            border-radius: 16px !important;
            background: linear-gradient(180deg, #ffffff 0%, #f7f7f8 100%) !important;
            border: 1px solid rgba(222, 230, 239, 0.92) !important;
            box-shadow:
                inset 0 1px 0 rgba(255, 255, 255, 0.92),
                inset 0 12px 18px rgba(255, 255, 255, 0.28),
                inset 0 -10px 18px rgba(214, 223, 235, 0.26),
                0 10px 22px rgba(15, 23, 42, 0.08),
                0 2px 6px rgba(15, 23, 42, 0.04) !important;
            z-index: -1 !important;
            pointer-events: none !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li[data-dcuf-focus-group-parent="1"] > * {
            position: relative !important;
            z-index: 1 !important;
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
        /* fcno 포커스 댓글은 "대댓글만 담긴 top-level li"가 따로 생길 수 있습니다.
           이 wrapper는 카드처럼 보이면 부모/대댓글이 분리돼 보이므로, 시각적으로는 reply 박스처럼 눌러줍니다. */
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li:has(> .reply.show):not(:has(> .cmt_info)) {
            margin: -6px 0 12px !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li:has(> .reply.show):not(:has(> .cmt_info)) > .reply.show {
            margin-top: 0 !important;
            padding-top: 0 !important;
            border-top: 0 !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_txtbox,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .usertxt,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li .cmt_txtbox,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li .usertxt {
            position: static !important;
            inset: auto !important;
            float: none !important;
            clear: both !important;
            width: auto !important;
            max-width: none !important;
            min-width: 0 !important;
            transform: none !important;
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
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li[data-dcuf-focus-group-reply="1"] {
            margin: -16px 0 12px !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li[data-dcuf-focus-group-reply="1"] > .reply.show {
            margin-top: 0 !important;
            padding-top: 0 !important;
            border-top: 0 !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li[data-dcuf-focus-group-reply="1"] > .reply.show > .reply_box {
            margin: -14px 0 0 8px !important;
            padding: 8px 12px 10px 14px !important;
            border-left: 1px solid #d2dbe7 !important;
            border-radius: 12px !important;
            background: linear-gradient(180deg, rgba(244, 247, 251, 0.98) 0%, rgba(239, 243, 248, 0.98) 100%) !important;
            box-shadow: inset 0 0 0 1px rgba(208, 218, 230, 0.84) !important;
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
        #focus_cmt .user_data_add,
        #focus_cmt .user_data_add .user_data_list,
        #focus_cmt ul.user_data_list,
        #focus_cmt #dccon_guide_lyr,
        #focus_cmt .pop_wrap.type2 {
            z-index: 2147483647 !important;
            overflow: visible !important;
        }
        #focus_cmt #user_data_lyr,
        #focus_cmt .user_data,
        #focus_cmt .user_data_add {
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
        #focus_cmt .comment_box .reply_list > li:has(.user_data_add .user_data_list),
        #focus_cmt .comment_box .reply_list > li:has(ul.user_data_list),
        #focus_cmt .comment_box .cmt_list > li:has(#user_data_lyr[style*="display:block"]),
        #focus_cmt .comment_box .cmt_list > li:has(#user_data_lyr[style*="display: block"]),
        #focus_cmt .comment_box .cmt_list > li:has(.user_data[style*="display:block"]),
        #focus_cmt .comment_box .cmt_list > li:has(.user_data[style*="display: block"]),
        #focus_cmt .comment_box .cmt_list > li:has(.user_data_add .user_data_list),
        #focus_cmt .comment_box .cmt_list > li:has(ul.user_data_list),
        #focus_cmt .comment_box .cmt_list > li:has(.reply_list > li:has(#user_data_lyr[style*="display:block"])),
        #focus_cmt .comment_box .cmt_list > li:has(.reply_list > li:has(#user_data_lyr[style*="display: block"])),
        #focus_cmt .comment_box .cmt_list > li:has(.reply_list > li:has(.user_data[style*="display:block"])),
        #focus_cmt .comment_box .cmt_list > li:has(.reply_list > li:has(.user_data[style*="display: block"])),
        #focus_cmt .comment_box .cmt_list > li:has(.reply_list > li:has(.user_data_add .user_data_list)),
        #focus_cmt .comment_box .cmt_list > li:has(.reply_list > li:has(ul.user_data_list)) {
            position: relative !important;
            z-index: 2147483646 !important;
            overflow: visible !important;
        }
        #focus_cmt .comment_box .cmt_info:has(#user_data_lyr[style*="display:block"]),
        #focus_cmt .comment_box .cmt_info:has(#user_data_lyr[style*="display: block"]),
        #focus_cmt .comment_box .cmt_info:has(.user_data[style*="display:block"]),
        #focus_cmt .comment_box .cmt_info:has(.user_data[style*="display: block"]),
        #focus_cmt .comment_box .cmt_info:has(.user_data_add .user_data_list),
        #focus_cmt .comment_box .cmt_info:has(ul.user_data_list),
        #focus_cmt .comment_box .reply_info:has(#user_data_lyr[style*="display:block"]),
        #focus_cmt .comment_box .reply_info:has(#user_data_lyr[style*="display: block"]),
        #focus_cmt .comment_box .reply_info:has(.user_data[style*="display:block"]),
        #focus_cmt .comment_box .reply_info:has(.user_data[style*="display: block"]),
        #focus_cmt .comment_box .reply_info:has(.user_data_add .user_data_list),
        #focus_cmt .comment_box .reply_info:has(ul.user_data_list) {
            position: relative !important;
            z-index: 2147483647 !important;
            overflow: visible !important;
        }
        body.dc-filter-dark-mode #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li {
            background: linear-gradient(180deg, rgba(19, 28, 39, 0.92) 0%, rgba(16, 23, 33, 0.94) 100%) !important;
            box-shadow: 0 1px 0 rgba(90, 112, 145, 0.36), 0 14px 28px rgba(3, 8, 16, 0.3) !important;
        }
        body.dc-filter-dark-mode #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li[data-dcuf-focus-group-parent="1"]::after {
            background: linear-gradient(180deg, rgba(19, 28, 39, 0.92) 0%, rgba(16, 23, 33, 0.94) 100%) !important;
            border-color: rgba(86, 104, 130, 0.5) !important;
            box-shadow:
                inset 0 1px 0 rgba(120, 138, 164, 0.18),
                inset 0 12px 18px rgba(36, 49, 66, 0.22),
                inset 0 -10px 18px rgba(6, 11, 18, 0.26),
                0 12px 24px rgba(3, 8, 16, 0.22),
                0 2px 8px rgba(3, 8, 16, 0.12) !important;
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
        body.dc-filter-dark-mode #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li[data-dcuf-focus-group-reply="1"] > .reply.show > .reply_box {
            border-left-color: rgba(122, 140, 166, 0.5) !important;
            background: linear-gradient(180deg, rgba(28, 39, 52, 0.88) 0%, rgba(25, 35, 47, 0.9) 100%) !important;
            box-shadow: inset 0 0 0 1px rgba(86, 104, 130, 0.56) !important;
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

    const DEBUG_KEY = '__DCUF_PHASE1_VIEW_DEBUG__';
    const debugState = {
        status: 'idle',
        detail: null,
        ts: null,
        href: location.href,
        refreshCount: 0,
        refreshAttempted: false,
        lastFailureReason: null,
        lastVerify: null
    };

    const setDebug = (status, detail, extra = {}) => {
        debugState.status = status;
        debugState.detail = detail;
        debugState.ts = new Date().toISOString();
        debugState.href = location.href;
        Object.assign(debugState, extra);
        const previousPayload = (window[DEBUG_KEY] && typeof window[DEBUG_KEY] === 'object')
            ? window[DEBUG_KEY]
            : {};
        const payload = { ...previousPayload, ...debugState };
        window[DEBUG_KEY] = payload;
        const root = document.documentElement;
        if (root instanceof HTMLElement) {
            root.setAttribute('data-dcuf-phase1-view', status);
        }
        return payload;
    };

    const toPixelValue = (value) => {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const isTransparentColor = (value) => {
        if (!value) return true;
        const normalized = String(value).trim().toLowerCase();
        return normalized === 'transparent' || normalized === 'rgba(0, 0, 0, 0)' || normalized === 'rgba(0,0,0,0)';
    };

    const hasRenderableBorder = (style) => {
        const edges = ['Top', 'Right', 'Bottom', 'Left'];
        return edges.some((edge) => {
            const width = toPixelValue(style[`border${edge}Width`]);
            const borderStyle = style[`border${edge}Style`];
            const color = style[`border${edge}Color`];
            return width > 0 && borderStyle !== 'none' && !isTransparentColor(color);
        });
    };

    const resolveScopeRoot = (root = document) => {
        if (root instanceof Document || root instanceof Element || root instanceof DocumentFragment) return root;
        return document;
    };

    const findWithinRoot = (root, selector) => {
        const scope = resolveScopeRoot(root);
        if (scope instanceof Element && scope.matches(selector)) return scope;
        return typeof scope.querySelector === 'function' ? scope.querySelector(selector) : null;
    };

    const injectStyle = ({ refresh = false, reason = 'ensure' } = {}) => {
        const target = document.head || document.documentElement;
        if (!target) {
            setDebug('no-target', `${reason} / head/documentElement unavailable`);
            return false;
        }

        let style = document.getElementById(STYLE_ID);
        if (style instanceof HTMLStyleElement) {
            if (refresh) {
                debugState.refreshAttempted = true;
                debugState.refreshCount += 1;
                style.textContent = css;
                target.appendChild(style);
                setDebug('style-refreshed', `${reason} / style tag refreshed`, {
                    refreshAttempted: true,
                    refreshCount: debugState.refreshCount
                });
                return true;
            }

            setDebug('style-exists', `${reason} / style tag already present`, {
                refreshAttempted: debugState.refreshAttempted,
                refreshCount: debugState.refreshCount
            });
            return true;
        }

        style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;
        target.appendChild(style);
        if (refresh) {
            debugState.refreshAttempted = true;
            debugState.refreshCount += 1;
        }
        setDebug(refresh ? 'style-refreshed' : 'style-injected', `${reason} / style tag appended`, {
            refreshAttempted: debugState.refreshAttempted,
            refreshCount: debugState.refreshCount
        });
        return true;
    };

    const verifyApplied = (reason = 'verify', root = document, options = {}) => {
        const mode = options && options.mode === 'core' ? 'core' : 'full';
        const viewWrap = findWithinRoot(root, '.view_content_wrap');
        if (!(viewWrap instanceof HTMLElement)) {
            const result = {
                ready: false,
                reason: 'waiting-view',
                detail: { reason, mode, hasViewWrap: false }
            };
            setDebug('waiting-view', JSON.stringify(result.detail), {
                lastFailureReason: result.reason,
                lastVerify: result
            });
            return result;
        }

        const head = viewWrap.querySelector('.gallview_head');
        const content = viewWrap.querySelector('.gallview_contents, .writing_view_box');
        const contentIsWritingBox = content?.classList.contains('writing_view_box') || false;
        if (!(head instanceof HTMLElement) || !(content instanceof HTMLElement)) {
            const result = {
                ready: false,
                reason: 'waiting-view',
                detail: {
                    reason,
                    mode,
                    hasViewWrap: true,
                    hasHead: head instanceof HTMLElement,
                    hasContent: content instanceof HTMLElement
                }
            };
            setDebug('waiting-view', JSON.stringify(result.detail), {
                lastFailureReason: result.reason,
                lastVerify: result
            });
            return result;
        }

        const wrapStyle = window.getComputedStyle(viewWrap);
        const headStyle = window.getComputedStyle(head);
        const contentStyle = window.getComputedStyle(content);
        const recommendBox = viewWrap.querySelector('.btn_recommend_box');
        const recommendBoxStyle = recommendBox instanceof HTMLElement ? window.getComputedStyle(recommendBox) : null;
        const commentBox = document.querySelector('#focus_cmt .comment_box, div[id^="comment_wrap_"] .comment_box, .view_comment .comment_box');
        const commentWriteBox = document.querySelector('#focus_cmt > .cmt_write_box, #focus_cmt .cmt_write_box, .view_comment .cmt_write_box');
        const commentTextContainer = commentWriteBox instanceof HTMLElement
            ? commentWriteBox.querySelector('.cmt_txt_cont')
            : null;
        const commentBoxStyle = commentBox instanceof HTMLElement ? window.getComputedStyle(commentBox) : null;
        const commentWriteBoxStyle = commentWriteBox instanceof HTMLElement ? window.getComputedStyle(commentWriteBox) : null;
        const commentTextContainerStyle = commentTextContainer instanceof HTMLElement ? window.getComputedStyle(commentTextContainer) : null;
        const detail = {
            reason,
            mode,
            wrapPaddingLeft: toPixelValue(wrapStyle.paddingLeft),
            wrapPaddingRight: toPixelValue(wrapStyle.paddingRight),
            headRadius: toPixelValue(headStyle.borderRadius),
            headBackgroundColor: headStyle.backgroundColor,
            headBackgroundImage: headStyle.backgroundImage,
            headBoxShadow: headStyle.boxShadow,
            headHasRenderableBorder: hasRenderableBorder(headStyle),
            contentVariant: contentIsWritingBox ? 'writing-view-box' : 'gallview-contents',
            contentRadius: toPixelValue(contentStyle.borderRadius),
            contentBackgroundColor: contentStyle.backgroundColor,
            contentBackgroundImage: contentStyle.backgroundImage,
            contentBoxShadow: contentStyle.boxShadow,
            contentHasRenderableBorder: hasRenderableBorder(contentStyle),
            hasRecommendBox: recommendBox instanceof HTMLElement,
            recommendBoxRadius: recommendBoxStyle ? toPixelValue(recommendBoxStyle.borderRadius) : 0,
            recommendBoxBackgroundColor: recommendBoxStyle?.backgroundColor || '',
            recommendBoxBackgroundImage: recommendBoxStyle?.backgroundImage || 'none',
            recommendBoxBoxShadow: recommendBoxStyle?.boxShadow || 'none',
            recommendBoxHasRenderableBorder: recommendBoxStyle ? hasRenderableBorder(recommendBoxStyle) : false,
            hasCommentBox: commentBox instanceof HTMLElement,
            commentBoxRadius: commentBoxStyle ? toPixelValue(commentBoxStyle.borderRadius) : 0,
            commentBoxBackgroundColor: commentBoxStyle?.backgroundColor || '',
            commentBoxBackgroundImage: commentBoxStyle?.backgroundImage || 'none',
            commentBoxBoxShadow: commentBoxStyle?.boxShadow || 'none',
            commentBoxHasRenderableBorder: commentBoxStyle ? hasRenderableBorder(commentBoxStyle) : false,
            hasCommentWriteBox: commentWriteBox instanceof HTMLElement,
            commentWriteBoxRadius: commentWriteBoxStyle ? toPixelValue(commentWriteBoxStyle.borderRadius) : 0,
            commentWriteBoxBackgroundColor: commentWriteBoxStyle?.backgroundColor || '',
            commentWriteBoxBackgroundImage: commentWriteBoxStyle?.backgroundImage || 'none',
            commentWriteBoxBoxShadow: commentWriteBoxStyle?.boxShadow || 'none',
            commentWriteBoxHasRenderableBorder: commentWriteBoxStyle ? hasRenderableBorder(commentWriteBoxStyle) : false,
            hasCommentTextContainer: commentTextContainer instanceof HTMLElement,
            commentTextContainerRadius: commentTextContainerStyle ? toPixelValue(commentTextContainerStyle.borderRadius) : 0,
            commentTextContainerBackgroundColor: commentTextContainerStyle?.backgroundColor || '',
            commentTextContainerBackgroundImage: commentTextContainerStyle?.backgroundImage || 'none',
            commentTextContainerHasRenderableBorder: commentTextContainerStyle ? hasRenderableBorder(commentTextContainerStyle) : false
        };

        let failureReason = null;
        if (Math.max(detail.wrapPaddingLeft, detail.wrapPaddingRight) < 8) {
            failureReason = 'insufficient-wrap-padding';
        } else if (detail.headRadius < 16) {
            failureReason = 'insufficient-head-radius';
        } else if (headStyle.boxShadow === 'none') {
            failureReason = 'missing-head-elevation';
        } else if (headStyle.backgroundImage === 'none' && isTransparentColor(detail.headBackgroundColor)) {
            failureReason = 'transparent-head-background';
        } else if (!contentIsWritingBox && detail.contentRadius < 16) {
            failureReason = 'insufficient-content-radius';
        } else if (!contentIsWritingBox && contentStyle.boxShadow === 'none') {
            failureReason = 'missing-content-elevation';
        } else if (!contentIsWritingBox && contentStyle.backgroundImage === 'none' && isTransparentColor(detail.contentBackgroundColor)) {
            failureReason = 'transparent-content-background';
        } else if (mode !== 'core' && recommendBox instanceof HTMLElement && detail.recommendBoxRadius < 16) {
            failureReason = 'insufficient-recommend-radius';
        } else if (mode !== 'core' && recommendBox instanceof HTMLElement && recommendBoxStyle.boxShadow === 'none') {
            failureReason = 'missing-recommend-elevation';
        } else if (mode !== 'core' && recommendBox instanceof HTMLElement && recommendBoxStyle.backgroundImage === 'none' && isTransparentColor(detail.recommendBoxBackgroundColor)) {
            failureReason = 'transparent-recommend-background';
        } else if (mode !== 'core' && commentBox instanceof HTMLElement && detail.commentBoxRadius < 16) {
            failureReason = 'insufficient-comment-radius';
        } else if (mode !== 'core' && commentBox instanceof HTMLElement && commentBoxStyle.boxShadow === 'none') {
            failureReason = 'missing-comment-elevation';
        } else if (mode !== 'core' && commentBox instanceof HTMLElement && commentBoxStyle.backgroundImage === 'none' && isTransparentColor(detail.commentBoxBackgroundColor)) {
            failureReason = 'transparent-comment-background';
        } else if (mode !== 'core' && commentWriteBox instanceof HTMLElement && detail.commentWriteBoxRadius < 16) {
            failureReason = 'insufficient-comment-write-radius';
        } else if (mode !== 'core' && commentWriteBox instanceof HTMLElement && commentWriteBoxStyle.boxShadow === 'none') {
            failureReason = 'missing-comment-write-elevation';
        } else if (mode !== 'core' && commentWriteBox instanceof HTMLElement && commentWriteBoxStyle.backgroundImage === 'none' && isTransparentColor(detail.commentWriteBoxBackgroundColor)) {
            failureReason = 'transparent-comment-write-background';
        } else if (mode !== 'core' && commentTextContainer instanceof HTMLElement && detail.commentTextContainerRadius < 12) {
            failureReason = 'insufficient-comment-input-radius';
        } else if (mode !== 'core' && commentTextContainer instanceof HTMLElement && commentTextContainerStyle.backgroundImage === 'none' && isTransparentColor(detail.commentTextContainerBackgroundColor)) {
            failureReason = 'transparent-comment-input-background';
        } else if (mode !== 'core' && commentTextContainer instanceof HTMLElement && !detail.commentTextContainerHasRenderableBorder) {
            failureReason = 'missing-comment-input-border';
        }

        const result = {
            ready: !failureReason,
            reason: failureReason || 'ready',
            detail
        };
        setDebug(result.ready ? 'applied' : 'not-applied', JSON.stringify({
            ...detail,
            reason: result.reason
        }), {
            lastFailureReason: failureReason,
            lastVerify: result
        });
        return result;
    };

    window.__dcufPhase1ViewTheme = {
        ensure(options = {}) {
            return injectStyle(options);
        },
        verify(root = document, options = {}) {
            return verifyApplied('bridge', root, options);
        },
        getDebugState() {
            const previousPayload = (window[DEBUG_KEY] && typeof window[DEBUG_KEY] === 'object')
                ? window[DEBUG_KEY]
                : {};
            return { ...previousPayload, ...debugState };
        }
    };

    injectStyle({ reason: 'initial' });
    verifyApplied('initial');
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            injectStyle({ reason: 'domcontentloaded' });
            verifyApplied('domcontentloaded');
        }, { once: true });
    }
    window.addEventListener('load', () => {
        injectStyle({ reason: 'window-load' });
        verifyApplied('window-load');
    }, { once: true });
})();
(() => {
    if (!__dcufPageSupports('view')) return;
    const STYLE_ID = 'dcuf-runtime-fixes';
    const ARTICLE_AD_SELECTOR = [
        'div[id^="foin_"]',
        'iframe[id^="pageid_"]',
        'iframe[src*="adnmore"]',
        '.power_link',
        '.power_link .pwlink_list',
        '.power_link .pwlink_img_list',
        '.view_content_wrap div:has(> ins.adsbygoogle[data-ad-client][data-ad-slot])',
        '.view_content_wrap #ad_nv_slot',
        '.gallview_contents #ad_nv_slot',
        '.writing_view_box #ad_nv_slot',
        '.write_div #ad_nv_slot',
        '.view_content_wrap iframe[id^="ad_nv_slot_tgt"]',
        '.gallview_contents iframe[id^="ad_nv_slot_tgt"]',
        '.writing_view_box iframe[id^="ad_nv_slot_tgt"]',
        '.write_div iframe[id^="ad_nv_slot_tgt"]',
        '.view_content_wrap .view_ad_wrap',
        '.gallview_contents .view_ad_wrap',
        '.writing_view_box .view_ad_wrap',
        '.write_div .view_ad_wrap',
        '.view_bottom .view_ad_wrap',
        '.view_content_wrap ins.kakao_ad_area',
        '.view_content_wrap div[id^="kakao_ad_"]',
        '.gallview_contents iframe[id^="google_ads_iframe_"]',
        '.gallview_contents iframe[name^="google_ads_iframe_"]',
        '.gallview_contents iframe[id*="gfp"]',
        '.gallview_contents iframe[name*="gfp"]',
        '.gallview_contents iframe[src*="pstatic.net/tvetalibs"]',
        '.gallview_contents iframe[src*="tivan.naver.com"]',
        '.writing_view_box iframe[id^="google_ads_iframe_"]',
        '.writing_view_box iframe[name^="google_ads_iframe_"]',
        '.writing_view_box iframe[id*="gfp"]',
        '.writing_view_box iframe[name*="gfp"]',
        '.writing_view_box iframe[src*="pstatic.net/tvetalibs"]',
        '.writing_view_box iframe[src*="tivan.naver.com"]',
        '.wrap_inner > div:has(> script[src*="/dcinside/pc/list@right_wing_"])'
    ].join(', ');
    const ARTICLE_FRAME_CANDIDATE_SELECTOR = [
        '.gallview_contents iframe',
        '.writing_view_box iframe',
        '.view_content_wrap iframe'
    ].join(', ');
    const css = `
        div[id^="foin_"],
        div[id^="foin_"] .closebtn,
        div[id^="foin_"] + .closebtn,
        iframe[id^="pageid_"],
        iframe[id^="pageid_"][src*="adnmore"],
        iframe[src*="adnmore"],
        .power_link,
        .power_link .pwlink_list,
        .power_link .pwlink_img_list,
        .view_content_wrap div:has(> ins.adsbygoogle[data-ad-client][data-ad-slot]),
        .wrap_inner > div:has(> script[src*="/dcinside/pc/list@right_wing_"]),
        .view_content_wrap #ad_nv_slot,
        .gallview_contents #ad_nv_slot,
        .writing_view_box #ad_nv_slot,
        .write_div #ad_nv_slot,
        .view_content_wrap iframe[id^="ad_nv_slot_tgt"],
        .gallview_contents iframe[id^="ad_nv_slot_tgt"],
        .writing_view_box iframe[id^="ad_nv_slot_tgt"],
        .write_div iframe[id^="ad_nv_slot_tgt"],
        .view_content_wrap .view_ad_wrap,
        .gallview_contents .view_ad_wrap,
        .writing_view_box .view_ad_wrap,
        .write_div .view_ad_wrap,
        .view_bottom .view_ad_wrap,
        .view_content_wrap ins.kakao_ad_area,
        .view_content_wrap div[id^="kakao_ad_"],
        .gallview_contents iframe[id^="google_ads_iframe_"],
        .gallview_contents iframe[name^="google_ads_iframe_"],
        .gallview_contents iframe[id*="gfp"],
        .gallview_contents iframe[name*="gfp"],
        .gallview_contents iframe[src*="pstatic.net/tvetalibs"],
        .gallview_contents iframe[src*="tivan.naver.com"],
        .writing_view_box iframe[id^="google_ads_iframe_"],
        .writing_view_box iframe[name^="google_ads_iframe_"],
        .writing_view_box iframe[id*="gfp"],
        .writing_view_box iframe[name*="gfp"],
        .writing_view_box iframe[src*="pstatic.net/tvetalibs"],
        .writing_view_box iframe[src*="tivan.naver.com"],
        .gallview_contents iframe[id^="aswift_"][src*="googleads.g.doubleclick.net/pagead/ads"],
        .writing_view_box iframe[id^="aswift_"][src*="googleads.g.doubleclick.net/pagead/ads"],
        .view_content_wrap iframe[id^="aswift_"][src*="googleads.g.doubleclick.net/pagead/ads"] {
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

    const isArticleNativeAdFrame = (frame) => {
        if (!(frame instanceof HTMLIFrameElement)) return false;
        const frameId = frame.id || '';
        const frameName = frame.name || '';
        const frameSrc = frame.getAttribute('src') || '';
        const signature = [
            frameId,
            frameName,
            frame.title,
            frame.className,
            frameSrc
        ].join(' ');
        const isGoogleArticleSafeFrame = (/^aswift_\d+$/i.test(frameId) || /^aswift_\d+$/i.test(frameName))
            && /googleads\.g\.doubleclick\.net\/pagead\/ads/i.test(frameSrc);
        if (isGoogleArticleSafeFrame) return true;
        if (/google_ads_iframe_|gfp|pstatic\.net\/tvetalibs|tivan\.naver\.com/i.test(signature)) return true;

        try {
            const frameDocument = frame.contentDocument;
            const frameBody = frameDocument?.body;
            if (!frameBody) return false;
            if (frameBody.id === 'gfp_sf_body' || frameBody.classList.contains('banner_ad_wrapper')) return true;
            return Boolean(frameDocument.querySelector('#ad-element.native_image_wrap, [data-gfp-role]'));
        } catch (error) {
            return false;
        }
    };

    const collectArticleAdCandidates = (roots = [document]) => {
        const rootList = Array.isArray(roots) ? roots : [roots];
        const seen = new Set();
        const candidates = [];
        const push = (element) => {
            if (!(element instanceof Element) || seen.has(element)) return;
            if (!element.matches(ARTICLE_AD_SELECTOR) && !isArticleNativeAdFrame(element)) return;
            seen.add(element);
            candidates.push(element);
        };

        rootList.forEach((root) => {
            if (root instanceof Element) push(root);
            if (root && typeof root.querySelectorAll === 'function') {
                root.querySelectorAll(`${ARTICLE_AD_SELECTOR}, ${ARTICLE_FRAME_CANDIDATE_SELECTOR}`).forEach(push);
            }
        });
        return candidates;
    };

    const resolveArticleAdRemovalTarget = (element) => {
        if (!(element instanceof Element)) return null;
        if (element.matches('#ad_nv_slot, .view_ad_wrap, div[id^="foin_"], div[id^="kakao_ad_"], .power_link')) {
            return element;
        }
        if (element.matches('iframe[id^="ad_nv_slot_tgt"]')) {
            return element.closest('#ad_nv_slot') || element;
        }
        if (element.matches('iframe[id^="pageid_"], iframe[src*="adnmore"], ins.kakao_ad_area')) {
            return element.closest('.view_ad_wrap, div[id^="foin_"], div[id^="kakao_ad_"], .cm_ad') || element;
        }
        if (isArticleNativeAdFrame(element)) {
            const safeFrameHost = element.parentElement;
            if (safeFrameHost instanceof HTMLElement && /^aswift_\d+_host$/i.test(safeFrameHost.id || '')) {
                return safeFrameHost;
            }
            return element.closest('#ad_nv_slot, .view_ad_wrap, .cm_ad') || element;
        }
        const ownedAdWrap = element.closest('#ad_nv_slot, .view_ad_wrap, .power_link');
        return ownedAdWrap || element;
    };

    const removeArticleAds = (roots = [document]) => {
        const targets = new Set();
        collectArticleAdCandidates(roots).forEach((candidate) => {
            const target = resolveArticleAdRemovalTarget(candidate);
            if (target instanceof Element && target.isConnected) targets.add(target);
        });
        targets.forEach((target) => target.remove());
        return targets.size;
    };

    let cleanupRafId = 0;
    let pendingCleanupRoots = [];
    let articleAdGeneration = 0;
    let lastArticleAdCleanupGeneration = -1;
    const scheduleArticleAdCleanup = (reason = 'scheduled', roots = [document]) => {
        pendingCleanupRoots.push(...(Array.isArray(roots) ? roots : [roots]));
        if (cleanupRafId) return;
        cleanupRafId = window.requestAnimationFrame(() => {
            cleanupRafId = 0;
            const rootsForPass = pendingCleanupRoots.splice(0).filter(Boolean);
            const removedCount = removeArticleAds(rootsForPass.length > 0 ? rootsForPass : [document]);
            lastArticleAdCleanupGeneration = articleAdGeneration;
            const runtimeCoordinator = window.__dcufRuntimeCoordinator;
            runtimeCoordinator?.incrementDiagnostic?.('ui.articleAd.scans');
            if (removedCount > 0) runtimeCoordinator?.incrementDiagnostic?.('ui.articleAd.removed', removedCount);
            runtimeCoordinator?.setDiagnosticGauge?.('ui.articleAd.lastRemoved', removedCount);
        });
    };

    const bindArticleAdCleanup = () => {
        scheduleArticleAdCleanup('initial');
        const runtimeCoordinator = window.__dcufRuntimeCoordinator;
        const hasMutationBus = Boolean(runtimeCoordinator && typeof runtimeCoordinator.subscribeMutations === 'function');
        const scheduleFallbackIfChanged = (reason) => {
            const requiresFrameContentFallback = reason === 'delayed:1100' || reason === 'delayed:5000';
            if (hasMutationBus && !requiresFrameContentFallback && articleAdGeneration === lastArticleAdCleanupGeneration) {
                runtimeCoordinator?.incrementDiagnostic?.('ui.articleAd.skippedUnchanged');
                return;
            }
            scheduleArticleAdCleanup(reason);
        };
        [120, 420, 1100, 2500, 5000].forEach((delay) => {
            window.setTimeout(() => scheduleFallbackIfChanged(`delayed:${delay}`), delay);
        });

        if (!hasMutationBus) return;
        runtimeCoordinator.subscribeMutations('runtime-article-ad-cleanup', (payload) => {
            const relevantNodes = payload.collectMatches(`${ARTICLE_AD_SELECTOR}, ${ARTICLE_FRAME_CANDIDATE_SELECTOR}`, { includeRoots: true })
                .filter((element) => element.matches(ARTICLE_AD_SELECTOR) || isArticleNativeAdFrame(element));
            if (relevantNodes.length > 0) {
                articleAdGeneration += 1;
                runtimeCoordinator.setDiagnosticGauge?.('ui.articleAd.generation', articleAdGeneration);
                scheduleArticleAdCleanup('mutation-bus', relevantNodes);
            }
        });
    };

    injectStyle();
    bindArticleAdCleanup();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            injectStyle();
            if (articleAdGeneration !== lastArticleAdCleanupGeneration) scheduleArticleAdCleanup('domcontentloaded');
        }, { once: true });
    }
    window.addEventListener('load', () => {
        injectStyle();
        scheduleArticleAdCleanup('window-load');
    }, { once: true });
})();

(() => {
    if (!__dcufPageSupports('view')) return;

    const setImportant = (element, property, value) => {
        if (!element) return;
        if (element.style.getPropertyValue(property) === value && element.style.getPropertyPriority(property) === 'important') return;
        element.style.setProperty(property, value, 'important');
    };
    const setImportantIfChanged = (element, property, value) => {
        setImportant(element, property, value);
    };
    const removeStyleIfPresent = (element, property) => {
        if (!element) return;
        if (!element.style.getPropertyValue(property) && !element.style.getPropertyPriority(property)) return;
        element.style.removeProperty(property);
    };
    const restoreInlineStyleIfStored = (element, property, storageKey) => {
        if (!element || !storageKey) return;
        const hasStoredValue = Object.prototype.hasOwnProperty.call(element.dataset, storageKey)
            || Object.prototype.hasOwnProperty.call(element.dataset, `${storageKey}Priority`);
        if (!hasStoredValue && !element.style.getPropertyValue(property) && !element.style.getPropertyPriority(property)) return;
        restoreInlineStyle(element, property, storageKey);
    };
    const setTextFillIfChanged = (element, value) => {
        setImportantIfChanged(element, '-webkit-text-fill-color', value);
    };
    const rememberInlineStyle = (element, property, storageKey) => {
        if (!element || !storageKey) return;
        if (Object.prototype.hasOwnProperty.call(element.dataset, storageKey)) return;
        element.dataset[storageKey] = element.style.getPropertyValue(property) || '';
        element.dataset[`${storageKey}Priority`] = element.style.getPropertyPriority(property) || '';
    };
    const restoreInlineStyle = (element, property, storageKey) => {
        if (!element || !storageKey) return;
        if (!Object.prototype.hasOwnProperty.call(element.dataset, storageKey)) {
            element.style.removeProperty(property);
            return;
        }
        const value = element.dataset[storageKey] || '';
        const priority = element.dataset[`${storageKey}Priority`] || '';
        if (value) {
            element.style.setProperty(property, value, priority);
        } else {
            element.style.removeProperty(property);
        }
        delete element.dataset[storageKey];
        delete element.dataset[`${storageKey}Priority`];
    };

    const NORMALIZE_DELAYS = [120, 420, 1100, 2400];
    const COMMENT_TYPOGRAPHY_SCOPE_SELECTOR = '.view_content_wrap .comment_box, #focus_cmt';
    const ARTICLE_TYPOGRAPHY_SCOPE_SELECTOR = '.view_content_wrap .gallview_contents, .view_content_wrap .write_div, .view_content_wrap .writing_view_box';
    const COMMENT_SCOPE_SELECTOR = '.comment_box';
    const COMMENT_STABLE_ROOT_SELECTOR = ['.comment_box', '#focus_cmt', 'div[id^="comment_wrap_"]', '.view_comment.image_comment'].join(', ');
    const ARTICLE_SCOPE_SELECTOR = '.gallview_contents, .write_div, .writing_view_box';
    const ARTICLE_STABLE_ROOT_SELECTOR = '.view_content_wrap, .writing_view_box, .gallview_contents, .write_div';
    // 본문은 글마다 font/span/div/inline style/data-scaled-by-filter 조합이 달라서
    // 좁은 selector로는 검은 글씨가 남는 경우가 있습니다. article scope 안에서만 넓게 잡습니다.
    const ARTICLE_DARK_TEXT_SELECTOR = [
        '.view_content_wrap .gallview_contents',
        '.view_content_wrap .gallview_contents *',
        '.view_content_wrap .gallview_contents [style]',
        '.view_content_wrap .gallview_contents [data-scaled-by-filter]',
        '.view_content_wrap .gallview_contents [data-scaled-by-filter] *',
        '.view_content_wrap .gallview_contents p',
        '.view_content_wrap .gallview_contents div',
        '.view_content_wrap .gallview_contents span',
        '.view_content_wrap .gallview_contents font',
        '.view_content_wrap .gallview_contents b',
        '.view_content_wrap .gallview_contents strong',
        '.view_content_wrap .gallview_contents em',
        '.view_content_wrap .gallview_contents i',
        '.view_content_wrap .gallview_contents a',
        '.view_content_wrap .gallview_contents li',
        '.view_content_wrap .gallview_contents td',
        '.view_content_wrap .gallview_contents th',
        '.view_content_wrap .gallview_contents pre',
        '.view_content_wrap .gallview_contents blockquote',
        '.view_content_wrap .writing_view_box',
        '.view_content_wrap .write_div',
        '.view_content_wrap .write_div p',
        '.view_content_wrap .write_div div',
        '.view_content_wrap .write_div span',
        '.view_content_wrap .write_div font',
        '.view_content_wrap .write_div b',
        '.view_content_wrap .write_div strong',
        '.view_content_wrap .write_div em',
        '.view_content_wrap .write_div i',
        '.view_content_wrap .write_div a',
        '.view_content_wrap .write_div li',
        '.view_content_wrap .write_div td',
        '.view_content_wrap .write_div th',
        '.view_content_wrap .write_div pre',
        '.view_content_wrap .write_div blockquote',
        '.view_content_wrap .write_div [data-scaled-by-filter]',
        '.view_content_wrap .write_div [data-scaled-by-filter] p',
        '.view_content_wrap .write_div [data-scaled-by-filter] div',
        '.view_content_wrap .write_div [data-scaled-by-filter] span',
        '.gallview_contents',
        '.gallview_contents *',
        '.gallview_contents [style]',
        '.gallview_contents [data-scaled-by-filter]',
        '.gallview_contents [data-scaled-by-filter] *',
        '.write_div',
        '.write_div *',
        '.write_div [style]',
        '.write_div [data-scaled-by-filter]',
        '.write_div [data-scaled-by-filter] *',
    ].join(', ');
    const IMAGE_COMMENT_TEXT_SELECTOR = [
        '.comment_box.img_comment_box .gall_writer',
        '.comment_box.img_comment_box .nickname',
        '.comment_box.img_comment_box .nickname em',
        '.comment_box.img_comment_box .usertxt',
    ].join(', ');
    const IMAGE_COMMENT_META_SELECTOR = [
        '.comment_box.img_comment_box .ip',
        '.comment_box.img_comment_box .date_time',
        '.comment_box.img_comment_box .txt_del',
        '.comment_box.img_comment_box .reply_num',
    ].join(', ');

    const getPreferredCommentFontSize = () => {
        const viewportWidth = Math.max(window.innerWidth || 0, document.documentElement?.clientWidth || 0, 0);
        if (!viewportWidth) return '18px';
        const calculated = Math.round(viewportWidth * 0.042);
        return `${Math.max(16, Math.min(19, calculated))}px`;
    };
    const COMMENT_NORMALIZE_TARGET_SELECTOR = [
        '.usertxt',
        '.nickname',
        '.nickname .ip',
        '.cmt_txtbox',
        '.reply_box',
        '.reply_list > li',
        '.writer_nikcon',
        '.writer_nikcon img',
        'img.gallercon'
    ].join(', ');
    // 기본 야간 보정은 위 CSS가 담당합니다. JS는 inline !important가 CSS보다
    // 우선하는 예외만 만지므로 article 전체 하위 노드를 반복 순회하지 않습니다.
    const ARTICLE_DARK_TARGET_SELECTOR = '[style]';
    const IMAGE_COMMENT_DARK_TEXT_TARGET_SELECTOR = '.gall_writer, .nickname, .nickname em, .usertxt';
    const IMAGE_COMMENT_DARK_META_TARGET_SELECTOR = '.ip, .date_time, .txt_del, .reply_num';
    const pendingNormalizeRoots = new Set();
    const pendingNormalizeTargets = new Set();
    const pendingDarkTextTargets = new Set();
    const pendingImageCommentDarkTextTargets = new Set();
    const pendingImageCommentDarkMetaTargets = new Set();
    const articleInlineStyleState = new WeakMap();
    const articleInlineOverrideElements = new Set();
    let forceNormalizeFullPass = false;
    let normalizeMutationGeneration = 0;
    let lastNormalizeGeneration = -1;
    let hasCentralNormalizeBus = false;
    const addUniqueElement = (targetSet, element) => {
        if (!(element instanceof Element)) return;
        targetSet.add(element);
    };
    const takeConnectedElements = (targetSet) => {
        const items = Array.from(targetSet).filter((element) => element instanceof Element && element.isConnected);
        targetSet.clear();
        return items;
    };
    const collectScopedRoots = (roots, selector) => {
        const seen = new Set();
        const results = [];
        const push = (element) => {
            if (!(element instanceof Element) || seen.has(element)) return;
            seen.add(element);
            results.push(element);
        };
        if (!Array.isArray(roots) || roots.length === 0) {
            document.querySelectorAll(selector).forEach(push);
            return results;
        }
        roots.forEach((root) => {
            if (!(root instanceof Element)) return;
            if (root.matches?.(selector)) push(root);
            root.querySelectorAll?.(selector).forEach(push);
        });
        return results;
    };
    const collectMatchesWithinRoots = (roots, selector) => {
        const seen = new Set();
        const results = [];
        const push = (element) => {
            if (!(element instanceof Element) || seen.has(element)) return;
            seen.add(element);
            results.push(element);
        };
        roots.forEach((root) => {
            if (!(root instanceof Element)) return;
            if (root.matches?.(selector)) push(root);
            root.querySelectorAll?.(selector).forEach(push);
        });
        return results;
    };
    const addMatchesFromElement = (targetSet, element, selector) => {
        if (!(element instanceof Element)) return;
        if (element.matches?.(selector)) addUniqueElement(targetSet, element);
        element.querySelectorAll?.(selector).forEach((match) => addUniqueElement(targetSet, match));
    };
    const addScopeMatchesFromElement = (targetSet, element, scopeSelector, targetSelector) => {
        if (!(element instanceof Element)) return;
        const nearestScope = element.closest?.(scopeSelector);
        if (nearestScope instanceof Element) {
            addMatchesFromElement(targetSet, element, targetSelector);
        }
        if (element.matches?.(scopeSelector)) {
            addMatchesFromElement(targetSet, element, targetSelector);
        }
        element.querySelectorAll?.(scopeSelector).forEach((scope) => {
            addMatchesFromElement(targetSet, scope, targetSelector);
        });
    };
    const findStableNormalizeRoot = (element) => {
        if (!(element instanceof Element)) return null;
        if (element.matches?.(COMMENT_STABLE_ROOT_SELECTOR) || element.matches?.(ARTICLE_STABLE_ROOT_SELECTOR)) return element;
        return element.closest(`${COMMENT_STABLE_ROOT_SELECTOR}, ${ARTICLE_STABLE_ROOT_SELECTOR}`);
    };
    const queueNormalizeWork = (elements = null, { forceFullPass = false } = {}) => {
        if (forceFullPass) forceNormalizeFullPass = true;
        if (!elements || typeof elements[Symbol.iterator] !== 'function') {
            forceNormalizeFullPass = true;
            return;
        }
        Array.from(elements).forEach((element) => {
            if (!(element instanceof Element)) return;
            const nearestRoot = findStableNormalizeRoot(element);
            if (nearestRoot instanceof Element) {
                pendingNormalizeRoots.add(nearestRoot);
            } else {
                element.querySelectorAll?.(`${COMMENT_STABLE_ROOT_SELECTOR}, ${ARTICLE_STABLE_ROOT_SELECTOR}`).forEach((root) => {
                    if (root instanceof Element) pendingNormalizeRoots.add(root);
                });
            }
            addScopeMatchesFromElement(pendingNormalizeTargets, element, COMMENT_SCOPE_SELECTOR, COMMENT_NORMALIZE_TARGET_SELECTOR);
            addScopeMatchesFromElement(pendingDarkTextTargets, element, ARTICLE_SCOPE_SELECTOR, ARTICLE_DARK_TARGET_SELECTOR);
            addScopeMatchesFromElement(pendingImageCommentDarkTextTargets, element, '.comment_box.img_comment_box', IMAGE_COMMENT_DARK_TEXT_TARGET_SELECTOR);
            addScopeMatchesFromElement(pendingImageCommentDarkMetaTargets, element, '.comment_box.img_comment_box', IMAGE_COMMENT_DARK_META_TARGET_SELECTOR);
        });
    };
    const resolveViewScope = (roots = null) => {
        if (Array.isArray(roots) && roots.length > 0) {
            for (const root of roots) {
                if (!(root instanceof Element)) continue;
                if (root.matches?.('.view_content_wrap')) return root;
                const closestScope = root.closest('.view_content_wrap');
                if (closestScope instanceof HTMLElement) return closestScope;
            }
        }
        return document.querySelector('.view_content_wrap');
    };

    const isRelevantNormalizeNode = (node) => {
        if (!node) return false;
        if (node.nodeType === Node.TEXT_NODE) {
            return Boolean(node.parentElement?.closest(`${COMMENT_TYPOGRAPHY_SCOPE_SELECTOR}, ${ARTICLE_TYPOGRAPHY_SCOPE_SELECTOR}`));
        }
        if (!(node instanceof Element)) return false;
        return Boolean(
            node.closest(`${COMMENT_TYPOGRAPHY_SCOPE_SELECTOR}, ${ARTICLE_TYPOGRAPHY_SCOPE_SELECTOR}`)
            || node.querySelector?.(COMMENT_TYPOGRAPHY_SCOPE_SELECTOR)
            || node.querySelector?.(ARTICLE_TYPOGRAPHY_SCOPE_SELECTOR)
        );
    };

    const applyNormalizeTarget = (element, preferredCommentFontSize) => {
        if (!(element instanceof HTMLElement)) return;
        if (element.matches('.nickname .ip')) {
            setImportantIfChanged(element, 'font-size', '12px');
            return;
        }
        if (element.matches('.usertxt')) {
            setImportantIfChanged(element, 'font-size', preferredCommentFontSize);
            setImportantIfChanged(element, 'line-height', '1.58');
            setImportantIfChanged(element, '-webkit-text-size-adjust', '100%');
            setImportantIfChanged(element, 'text-size-adjust', '100%');
            return;
        }
        if (element.matches('.nickname')) {
            setImportantIfChanged(element, 'font-size', '13px');
            return;
        }
        if (element.matches('.cmt_txtbox, .reply_box, .reply_list > li')) {
            setImportantIfChanged(element, '-webkit-text-size-adjust', '100%');
            setImportantIfChanged(element, 'text-size-adjust', '100%');
            return;
        }
        if (element.matches('.writer_nikcon')) {
            removeStyleIfPresent(element, 'font-size');
            return;
        }
        if (element.matches('.writer_nikcon img, img.gallercon')) {
            setImportantIfChanged(element, 'width', 'auto');
            setImportantIfChanged(element, 'height', '13px');
            setImportantIfChanged(element, 'max-width', 'none');
        }
    };
    const normalizeCommentTypographyForRoots = (roots = null, { targets = null, forceFullScan = false } = {}) => {
        const preferredCommentFontSize = getPreferredCommentFontSize();
        const scopedTargets = Array.isArray(targets)
            ? targets.filter((element) => element instanceof HTMLElement && element.closest(COMMENT_SCOPE_SELECTOR))
            : [];
        if (!forceFullScan && scopedTargets.length > 0) {
            scopedTargets.forEach((element) => applyNormalizeTarget(element, preferredCommentFontSize));
            return;
        }

        const commentScopes = collectScopedRoots(Array.isArray(roots) ? roots : null, COMMENT_SCOPE_SELECTOR);
        if (commentScopes.length === 0 && !document.querySelector('#focus_cmt > .cmt_write_box')) return;

        collectMatchesWithinRoots(commentScopes, COMMENT_NORMALIZE_TARGET_SELECTOR).forEach((element) => {
            applyNormalizeTarget(element, preferredCommentFontSize);
        });
    };

    const applyArticleDarkTarget = (element, articleDarkProps) => {
        if (!(element instanceof HTMLElement)) return;
        articleDarkProps.forEach(([property, value]) => {
            if (element.style.getPropertyPriority(property) !== 'important') return;
            if (element.style.getPropertyValue(property).trim() === value) return;

            let storedProperties = articleInlineStyleState.get(element);
            if (!storedProperties) {
                storedProperties = new Map();
                articleInlineStyleState.set(element, storedProperties);
                articleInlineOverrideElements.add(element);
            }
            if (!storedProperties.has(property)) {
                storedProperties.set(property, {
                    value: element.style.getPropertyValue(property) || '',
                    priority: element.style.getPropertyPriority(property) || ''
                });
            }
            setImportantIfChanged(element, property, value);
        });
    };
    const restoreArticleDarkOverrides = () => {
        articleInlineOverrideElements.forEach((element) => {
            const storedProperties = articleInlineStyleState.get(element);
            storedProperties?.forEach(({ value, priority }, property) => {
                if (value) element.style.setProperty(property, value, priority);
                else element.style.removeProperty(property);
            });
            articleInlineStyleState.delete(element);
        });
        articleInlineOverrideElements.clear();
    };
    const pruneDetachedArticleDarkOverrides = () => {
        articleInlineOverrideElements.forEach((element) => {
            if (element.isConnected) return;
            articleInlineStyleState.delete(element);
            articleInlineOverrideElements.delete(element);
        });
    };
    const applyImageCommentDarkTarget = (element, darkMode, colorValue) => {
        if (!(element instanceof HTMLElement)) return;
        if (darkMode) {
            rememberInlineStyle(element, 'color', 'dcufOrigColor');
            rememberInlineStyle(element, '-webkit-text-fill-color', 'dcufOrigTextFill');
            setImportantIfChanged(element, 'color', colorValue);
            setTextFillIfChanged(element, colorValue);
            return;
        }
        restoreInlineStyleIfStored(element, 'color', 'dcufOrigColor');
        restoreInlineStyleIfStored(element, '-webkit-text-fill-color', 'dcufOrigTextFill');
    };
    const syncArticleDarkTextForRoots = (roots = null, {
        articleTargets = null,
        imageCommentTextTargets = null,
        imageCommentMetaTargets = null,
        forceFullScan = false
    } = {}) => {
        const darkMode = document.body?.classList.contains('dc-filter-dark-mode');
        pruneDetachedArticleDarkOverrides();
        const scopedRoots = Array.isArray(roots) ? roots : null;
        const viewScope = resolveViewScope(scopedRoots);
        const resolvedViewFg = (viewScope ? getComputedStyle(viewScope).getPropertyValue('--dcuf-view-fg') : '').trim() || '#edf3ff';
        const resolvedImageCommentFg = '#dbe6f5';
        const resolvedImageCommentMeta = '#9fb0c8';
        // 본문은 color만으로 안 끝나는 케이스가 있습니다.
        // 인라인 text-fill/opacity/filter/blend/stroke까지 같이 정리해야 야간모드가 안정적으로 먹습니다.
        const articleDarkProps = [
            ['color', resolvedViewFg],
            ['-webkit-text-fill-color', resolvedViewFg],
            ['opacity', '1'],
            ['filter', 'none'],
            ['mix-blend-mode', 'normal'],
            ['text-shadow', 'none'],
            ['-webkit-text-stroke', '0px transparent'],
        ];

        if (!darkMode) {
            restoreArticleDarkOverrides();
        } else {
            const scopedArticleTargets = Array.isArray(articleTargets)
                ? articleTargets.filter((element) => element instanceof HTMLElement && element.closest(ARTICLE_SCOPE_SELECTOR))
                : [];
            if (!forceFullScan && scopedArticleTargets.length > 0) {
                scopedArticleTargets.forEach((element) => applyArticleDarkTarget(element, articleDarkProps));
            } else {
                const articleScopes = collectScopedRoots(scopedRoots, ARTICLE_SCOPE_SELECTOR);
                collectMatchesWithinRoots(articleScopes, ARTICLE_DARK_TARGET_SELECTOR).forEach((element) => {
                    applyArticleDarkTarget(element, articleDarkProps);
                });
            }
        }

        const scopedImageCommentTextTargets = Array.isArray(imageCommentTextTargets)
            ? imageCommentTextTargets.filter((element) => element instanceof HTMLElement && element.closest('.comment_box.img_comment_box'))
            : [];
        if (!forceFullScan && scopedImageCommentTextTargets.length > 0) {
            scopedImageCommentTextTargets.forEach((element) => applyImageCommentDarkTarget(element, darkMode, resolvedImageCommentFg));
        } else {
            const imageCommentScopes = collectScopedRoots(scopedRoots, '.comment_box.img_comment_box');
            collectMatchesWithinRoots(imageCommentScopes, IMAGE_COMMENT_DARK_TEXT_TARGET_SELECTOR).forEach((element) => {
                applyImageCommentDarkTarget(element, darkMode, resolvedImageCommentFg);
            });
        }

        const scopedImageCommentMetaTargets = Array.isArray(imageCommentMetaTargets)
            ? imageCommentMetaTargets.filter((element) => element instanceof HTMLElement && element.closest('.comment_box.img_comment_box'))
            : [];
        if (!forceFullScan && scopedImageCommentMetaTargets.length > 0) {
            scopedImageCommentMetaTargets.forEach((element) => applyImageCommentDarkTarget(element, darkMode, resolvedImageCommentMeta));
            return;
        }

        const imageCommentScopes = collectScopedRoots(scopedRoots, '.comment_box.img_comment_box');
        collectMatchesWithinRoots(imageCommentScopes, IMAGE_COMMENT_DARK_META_TARGET_SELECTOR).forEach((element) => {
            applyImageCommentDarkTarget(element, darkMode, resolvedImageCommentMeta);
        });
    };
    const normalizeCommentTypography = (roots = null, options = {}) => {
        normalizeCommentTypographyForRoots(roots, options);
    };
    const syncArticleDarkText = (roots = null, options = {}) => {
        syncArticleDarkTextForRoots(roots, options);
    };

    let bindCommentResizeTargets = null;
    const COMMENT_MUTATION_SELECTOR = '.view_content_wrap, .writing_view_box, #focus_cmt, .comment_box, .img_comment, .view_comment.image_comment, div[id^="comment_wrap_"]';
    const COMMENT_RESIZE_SELECTOR = '.view_content_wrap, .writing_view_box, #focus_cmt';
    const flushPendingNormalize = ({ forceFullPass = false } = {}) => {
        const roots = takeConnectedElements(pendingNormalizeRoots);
        const normalizeTargets = takeConnectedElements(pendingNormalizeTargets);
        const articleTargets = takeConnectedElements(pendingDarkTextTargets);
        const imageCommentTextTargets = takeConnectedElements(pendingImageCommentDarkTextTargets);
        const imageCommentMetaTargets = takeConnectedElements(pendingImageCommentDarkMetaTargets);
        const hasPendingWork = roots.length > 0
            || normalizeTargets.length > 0
            || articleTargets.length > 0
            || imageCommentTextTargets.length > 0
            || imageCommentMetaTargets.length > 0;
        const useFullPass = forceFullPass || forceNormalizeFullPass || !hasPendingWork;
        forceNormalizeFullPass = false;
        normalizeCommentTypography(useFullPass ? null : roots, {
            targets: useFullPass ? null : normalizeTargets,
            forceFullScan: useFullPass
        });
        syncArticleDarkText(useFullPass ? null : roots, {
            articleTargets: useFullPass ? null : articleTargets,
            imageCommentTextTargets: useFullPass ? null : imageCommentTextTargets,
            imageCommentMetaTargets: useFullPass ? null : imageCommentMetaTargets,
            forceFullScan: useFullPass
        });
    };
    const normalizeScheduler = __dcufCreatePhaseScheduler('comment-normalize', ({ delay }) => {
        const runtimeCoordinator = window.__dcufRuntimeCoordinator;
        if (delay > 0
            && hasCentralNormalizeBus
            && !forceNormalizeFullPass
            && lastNormalizeGeneration === normalizeMutationGeneration) {
            runtimeCoordinator?.incrementDiagnostic?.('ui.normalize.skippedUnchanged');
            return;
        }
        const measureDuration = Boolean(runtimeCoordinator?._diagnosticsEnabled) && typeof performance?.now === 'function';
        const startedAt = measureDuration ? performance.now() : 0;
        flushPendingNormalize({ forceFullPass: delay > 0 });
        lastNormalizeGeneration = normalizeMutationGeneration;
        runtimeCoordinator?.incrementDiagnostic?.('ui.normalize.executed');
        runtimeCoordinator?.setDiagnosticGauge?.('ui.normalize.generation', normalizeMutationGeneration);
        if (measureDuration) {
            runtimeCoordinator?.setDiagnosticGauge?.(
                'ui.normalize.lastDurationMs',
                Math.round((performance.now() - startedAt) * 1000) / 1000
            );
        }
    }, NORMALIZE_DELAYS);

    const scheduleNormalize = ({ elements = null, forceFullPass = false } = {}) => {
        queueNormalizeWork(elements, { forceFullPass });
        normalizeMutationGeneration += 1;
        normalizeScheduler.schedule();
    };

    const observeComments = () => {
        if (window.__dcufCommentTypographyMutationUnsubscribe || window.__dcufCommentTypographyObserver) return;

        const unsubscribe = __dcufSubscribeMutationBus('comment-typography', (payload) => {
            const relevantNodes = __dcufCollectMatches(payload, COMMENT_MUTATION_SELECTOR, { includeRoots: true });
            if (relevantNodes.length === 0) return;
            if (typeof bindCommentResizeTargets === 'function') {
                bindCommentResizeTargets(__dcufCollectMatches(payload, COMMENT_RESIZE_SELECTOR, { includeRoots: true }));
            }
            if (relevantNodes.some(isRelevantNormalizeNode)) {
                const bodyMutated = Array.isArray(payload.attributeTargets) && payload.attributeTargets.includes(document.body);
                scheduleNormalize({ elements: relevantNodes, forceFullPass: bodyMutated });
            }
        });
        if (typeof unsubscribe === 'function') {
            hasCentralNormalizeBus = true;
            window.__dcufCommentTypographyMutationUnsubscribe = unsubscribe;
            return;
        }

        if (!document.body) return;
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'characterData' && isRelevantNormalizeNode(mutation.target)) {
                    scheduleNormalize({ elements: [mutation.target.parentElement].filter(Boolean) });
                    break;
                }

                if (mutation.type === 'attributes' && isRelevantNormalizeNode(mutation.target)) {
                    scheduleNormalize({ elements: [mutation.target], forceFullPass: mutation.target === document.body });
                    break;
                }

                if (mutation.type === 'childList') {
                    const hasRelevantNode = Array.from(mutation.addedNodes || []).some(isRelevantNormalizeNode)
                        || Array.from(mutation.removedNodes || []).some(isRelevantNormalizeNode)
                        || isRelevantNormalizeNode(mutation.target);
                    if (hasRelevantNode) {
                        scheduleNormalize({
                            elements: [mutation.target, ...Array.from(mutation.addedNodes || []), ...Array.from(mutation.removedNodes || [])]
                        });
                        break;
                    }
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
            scheduleNormalize({ elements: [target] });
        }, true);

        document.addEventListener('error', (event) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            if (!target.matches('img, video')) return;
            if (!target.closest('.view_content_wrap, #focus_cmt')) return;
            scheduleNormalize({ elements: [target] });
        }, true);

        window.__dcufCommentTypographyLoadBound = true;
    };

    const observeLayoutChanges = () => {
        if (!window.ResizeObserver || window.__dcufCommentTypographyResizeObserver) return;

        const observer = new ResizeObserver((entries) => {
            scheduleNormalize({ elements: entries.map((entry) => entry?.target).filter(Boolean) });
        });

        bindCommentResizeTargets = (elements = null) => {
            const candidates = elements && typeof elements[Symbol.iterator] === 'function'
                ? Array.from(elements)
                : Array.from(document.querySelectorAll(COMMENT_RESIZE_SELECTOR));
            candidates.forEach((element) => {
                if (!(element instanceof Element)) return;
                if (element.dataset.dcufCommentResizeObserved === '1') return;
                observer.observe(element);
                element.dataset.dcufCommentResizeObserved = '1';
            });
        };

        bindCommentResizeTargets();

        window.__dcufCommentTypographyResizeObserver = observer;
    };

    window.__dcufScheduleCommentNormalize = scheduleNormalize;
    window.__dcufSyncArticleDarkText = syncArticleDarkText;

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

    window.addEventListener('load', () => scheduleNormalize({ forceFullPass: true }), { once: true });
    window.addEventListener('resize', () => {
        const resizeTargets = Array.from(document.querySelectorAll(`${COMMENT_RESIZE_SELECTOR}, .view_comment.image_comment`));
        if (resizeTargets.length === 0) {
            scheduleNormalize({ forceFullPass: true });
            return;
        }
        scheduleNormalize({ elements: resizeTargets });
    });
})();

(() => {
    if (!__dcufPageSupports('view')) {
        window.__dcufAwaitInitialCommentStabilization = () => Promise.resolve({ reason: 'non-view-page' });
        return;
    }
    const COMMENT_LIST_SELECTOR = 'div[id^="comment_wrap_"] .comment_box .cmt_list';
    const PLACEHOLDER_ATTR = 'data-dcuf-parent-placeholder';
    const PLACEHOLDER_CLASS = 'dcuf-comment-placeholder';
    const COMMENT_BLOCKED_ATTR = 'data-dcuf-comment-blocked';
    const COMMENT_SHELL_BLOCKED_ATTR = 'data-dcuf-comment-shell-blocked';
    const COMMENT_SHELL_BLOCKED_CLASS = 'dcuf-comment-shell-blocked';
    const isReplyOnlyCommentWrapper = (li) => {
        if (!(li instanceof HTMLElement)) return false;
        return Boolean(li.querySelector(':scope > div.reply.show'))
            && !li.querySelector(':scope > div.cmt_info');
    };

    const getParentNoFromCommentLi = (li) => {
        if (!(li instanceof HTMLElement)) return '';

        const info = li.querySelector(':scope > div.cmt_info[data-no]');
        if (info) {
            const no = info.getAttribute('data-no');
            if (no) return no;
        }

        if (isReplyOnlyCommentWrapper(li)) return '';

        const idMatch = (li.id || '').match(/^comment_li_(\d+)$/);
        return idMatch && idMatch[1] !== '0' ? idMatch[1] : '';
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

    const hasVisibleReplyItems = (replyShow) => {
        if (!(replyShow instanceof HTMLElement)) return false;
        return Array.from(replyShow.querySelectorAll(':scope > .reply_box > .reply_list > li, :scope > .reply_list > li, .reply_list > li'))
            .some((replyLi) => replyLi instanceof HTMLElement && replyLi.style.display !== 'none');
    };

    const clearFilteredParentPlaceholder = (parentLi) => {
        if (!(parentLi instanceof HTMLElement)) return;

        const placeholder = parentLi.querySelector(`:scope > .${PLACEHOLDER_CLASS}`);
        if (placeholder instanceof HTMLElement) placeholder.remove();
        if (parentLi.hasAttribute(PLACEHOLDER_ATTR)) parentLi.removeAttribute(PLACEHOLDER_ATTR);
        if (parentLi.hasAttribute('data-dcuf-parent-filtered')) parentLi.removeAttribute('data-dcuf-parent-filtered');
        if (parentLi.classList.contains('dcuf-parent-comment-filtered')) parentLi.classList.remove('dcuf-parent-comment-filtered');
    };

    const isCommentListItem = (element) => {
        return element instanceof HTMLElement && !!element.closest(COMMENT_LIST_SELECTOR);
    };

    const getAssociatedVisibleReplyItems = (parentLi) => {
        if (!(parentLi instanceof HTMLElement)) return [];
        const parentNo = getParentNoFromCommentLi(parentLi);
        if (!parentNo) return [];

        const replyItems = [];
        const addVisibleReplies = (replyShow) => {
            if (!(replyShow instanceof HTMLElement)) return;
            replyShow.querySelectorAll(':scope > .reply_box > .reply_list > li, :scope > .reply_list > li, .reply_list > li').forEach((replyLi) => {
                if (replyLi instanceof HTMLElement && replyLi.style.display !== 'none') {
                    replyItems.push(replyLi);
                }
            });
        };

        addVisibleReplies(parentLi.querySelector(':scope > div.reply.show'));

        const list = parentLi.parentElement;
        if (list instanceof HTMLElement) {
            list.querySelectorAll(':scope > li > div.reply.show').forEach((replyShow) => {
                if (!(replyShow instanceof HTMLElement)) return;
                const wrapperLi = replyShow.closest('li');
                if (!(wrapperLi instanceof HTMLElement) || wrapperLi === parentLi) return;
                if (getParentNoFromCommentLi(wrapperLi)) return;
                if (wrapperLi.style.display === 'none') return;
                if (getParentNoFromReplyBlock(replyShow) !== parentNo) return;
                addVisibleReplies(replyShow);
            });
        }

        return replyItems;
    };

    const clearBlockedCommentShell = (element) => {
        if (!(element instanceof HTMLElement)) return;
        if (element.hasAttribute(COMMENT_SHELL_BLOCKED_ATTR)) element.removeAttribute(COMMENT_SHELL_BLOCKED_ATTR);
        if (element.classList.contains(COMMENT_SHELL_BLOCKED_CLASS)) element.classList.remove(COMMENT_SHELL_BLOCKED_CLASS);
    };

    const applyBlockedCommentShell = (parentLi) => {
        if (!(parentLi instanceof HTMLElement)) return;
        clearFilteredParentPlaceholder(parentLi);
        if (parentLi.getAttribute(COMMENT_SHELL_BLOCKED_ATTR) !== '1') parentLi.setAttribute(COMMENT_SHELL_BLOCKED_ATTR, '1');
        if (!parentLi.classList.contains(COMMENT_SHELL_BLOCKED_CLASS)) parentLi.classList.add(COMMENT_SHELL_BLOCKED_CLASS);
        if (parentLi.style.display !== '') parentLi.style.display = '';
    };

    const shouldKeepBlockedParentCommentShell = (parentLi) => {
        return isCommentListItem(parentLi)
            && Boolean(getParentNoFromCommentLi(parentLi))
            && getAssociatedVisibleReplyItems(parentLi).length > 0;
    };

    const installBlockedCommentShellFilterHook = () => {
        const filterModule = window.__dcufFilterModule;
        if (!filterModule || typeof filterModule.setElementVisibility !== 'function') return false;
        if (filterModule.__dcufCommentShellBlockHooked) return true;

        const originalSetElementVisibility = filterModule.setElementVisibility.bind(filterModule);
        filterModule.setElementVisibility = (element, shouldHide) => {
            if (!isCommentListItem(element)) {
                originalSetElementVisibility(element, shouldHide);
                return;
            }

            if (shouldHide) {
                element.setAttribute(COMMENT_BLOCKED_ATTR, '1');
                if (shouldKeepBlockedParentCommentShell(element)) {
                    applyBlockedCommentShell(element);
                    return;
                }
            } else {
                element.removeAttribute(COMMENT_BLOCKED_ATTR);
                clearBlockedCommentShell(element);
            }

            originalSetElementVisibility(element, shouldHide);
        };
        filterModule.__dcufCommentShellBlockHooked = true;
        return true;
    };

    installBlockedCommentShellFilterHook();

    const collectCommentLists = (roots = null) => {
        const candidates = roots && typeof roots[Symbol.iterator] === 'function'
            ? Array.from(roots)
            : (roots ? [roots] : [document]);
        const lists = [];
        const seen = new Set();
        const addList = (list) => {
            if (!(list instanceof HTMLElement) || !list.isConnected || seen.has(list)) return;
            if (!list.matches(COMMENT_LIST_SELECTOR)) return;
            seen.add(list);
            lists.push(list);
        };
        candidates.forEach((root) => {
            if (root instanceof Element) {
                addList(root);
                addList(root.closest(COMMENT_LIST_SELECTOR));
            }
            if (typeof root?.querySelectorAll === 'function') {
                root.querySelectorAll(COMMENT_LIST_SELECTOR).forEach(addList);
            }
        });
        return lists;
    };

    const syncFilteredParentPlaceholders = (roots = null) => {
        collectCommentLists(roots).forEach((list) => {
            list.querySelectorAll(':scope > li[id^="comment_li_"]').forEach((parentLi) => {
                clearFilteredParentPlaceholder(parentLi);
            });
        });
    };

    const syncFocusCommentCardGroups = (roots = null) => {
        collectCommentLists(roots).filter((list) => list.closest('#focus_cmt')).forEach((list) => {
            if (!(list instanceof HTMLElement)) return;

            const children = Array.from(list.children).filter((li) => li instanceof HTMLElement);
            const desiredParentExtends = new Map();
            const desiredReplyLis = new Set();

            children.forEach((parentLi, index) => {
                if (!(parentLi instanceof HTMLElement)) return;
                const parentNo = getParentNoFromCommentLi(parentLi);
                if (!parentNo) return;

                const groupedReplyLis = [];
                for (let cursor = index + 1; cursor < children.length; cursor += 1) {
                    const candidateLi = children[cursor];
                    if (!(candidateLi instanceof HTMLElement)) continue;
                    if (getParentNoFromCommentLi(candidateLi)) break;
                    if (candidateLi.style.display === 'none') continue;

                    const replyShow = candidateLi.querySelector(':scope > .reply.show');
                    if (!(replyShow instanceof HTMLElement)) continue;
                    if (getParentNoFromReplyBlock(replyShow) !== parentNo) continue;
                    if (!hasVisibleReplyItems(replyShow)) continue;

                    groupedReplyLis.push(candidateLi);
                }

                if (groupedReplyLis.length === 0) return;

                const parentBottom = parentLi.offsetTop + parentLi.offsetHeight;
                const lastGroupedReplyLi = groupedReplyLis[groupedReplyLis.length - 1];
                const groupBottom = lastGroupedReplyLi.offsetTop + lastGroupedReplyLi.offsetHeight;
                const extend = Math.max(0, groupBottom - parentBottom);

                desiredParentExtends.set(parentLi, `${extend}px`);
                groupedReplyLis.forEach((replyLi) => {
                    desiredReplyLis.add(replyLi);
                });
            });

            children.forEach((li) => {
                if (!(li instanceof HTMLElement)) return;

                if (desiredParentExtends.has(li)) {
                    const nextExtend = desiredParentExtends.get(li);
                    if (li.getAttribute('data-dcuf-focus-group-parent') !== '1') {
                        li.setAttribute('data-dcuf-focus-group-parent', '1');
                    }
                    if (li.style.getPropertyValue('--dcuf-focus-group-extend') !== nextExtend) {
                        li.style.setProperty('--dcuf-focus-group-extend', nextExtend);
                    }
                } else {
                    if (li.hasAttribute('data-dcuf-focus-group-parent')) {
                        li.removeAttribute('data-dcuf-focus-group-parent');
                    }
                    if (li.style.getPropertyValue('--dcuf-focus-group-extend')) {
                        li.style.removeProperty('--dcuf-focus-group-extend');
                    }
                }

                if (desiredReplyLis.has(li)) {
                    if (li.getAttribute('data-dcuf-focus-group-reply') !== '1') {
                        li.setAttribute('data-dcuf-focus-group-reply', '1');
                    }
                } else if (li.hasAttribute('data-dcuf-focus-group-reply')) {
                    li.removeAttribute('data-dcuf-focus-group-reply');
                }
            });
        });
    };

    const getStaleFilteredParentPlaceholders = () => {
        const stale = [];
        document.querySelectorAll(`${COMMENT_LIST_SELECTOR} > li[id^="comment_li_"]`).forEach((parentLi) => {
            if (!(parentLi instanceof HTMLElement)) return;
            if (parentLi.hasAttribute(PLACEHOLDER_ATTR)
                || parentLi.hasAttribute('data-dcuf-parent-filtered')
                || parentLi.classList.contains('dcuf-parent-comment-filtered')
                || parentLi.querySelector(`:scope > .${PLACEHOLDER_CLASS}`)) {
                stale.push(parentLi);
            }
        });
        return stale;
    };

    const repairFilteredCommentPlaceholders = (meta = null) => {
        const options = meta && typeof meta === 'object' ? meta : {};
        const source = options.reason || options.source || '';
        const staleBefore = getStaleFilteredParentPlaceholders();
        if (options.onlyIfBroken && staleBefore.length === 0) {
            return {
                reason: 'skipped',
                source,
                targetCount: 0,
                staleCount: 0,
                remainingStaleCount: 0,
                brokenCount: 0
            };
        }

        const filterModule = window.__dcufFilterModule;
        let targetCount = 0;
        if (options.runFilter !== false && typeof filterModule?.runSyncRefilterPass === 'function') {
            const descriptors = filterModule.runSyncRefilterPass('comments');
            targetCount = Array.isArray(descriptors) ? descriptors.length : 0;
        }
        if (options.mergeDetachedReplies !== false) {
            mergeDetachedRepliesIntoParent();
        }
        syncFilteredParentPlaceholders();
        syncFocusCommentCardGroups();
        const staleAfter = options.onlyIfBroken ? getStaleFilteredParentPlaceholders() : [];
        return {
            reason: 'prepared',
            source,
            targetCount,
            staleCount: staleBefore.length,
            remainingStaleCount: staleAfter.length,
            brokenCount: staleBefore.length,
            remainingBrokenCount: staleAfter.length
        };
    };
    window.__dcufRepairFilteredCommentPlaceholders = repairFilteredCommentPlaceholders;
    window.__dcufPrepareInitialCommentReveal = repairFilteredCommentPlaceholders;
    window.__dcufFlushInitialCommentBarrier = (meta = null) => {
        const runtimeCoordinator = __dcufGetRuntimeCoordinator();
        runtimeCoordinator?.ensureMutationBus?.();
        runtimeCoordinator?.flushPendingMutations?.('initial-comment:before');
        const state = repairFilteredCommentPlaceholders({
            ...(meta && typeof meta === 'object' ? meta : {}),
            runFilter: true,
            mergeDetachedReplies: true
        });
        runtimeCoordinator?.flushPendingMutations?.('initial-comment:after');
        return {
            ...state,
            generation: runtimeCoordinator?._mutationGeneration || 0
        };
    };

    const shouldSkipReplyMergeTarget = (parentLi, replyShow = null) => {
        if (!(parentLi instanceof HTMLElement)) return true;
        const isFocusCommentTarget = Boolean(parentLi.closest('#focus_cmt'));
        if (isFocusCommentTarget) return true;
        if (parentLi.style.display === 'none') {
            if (parentLi.getAttribute(COMMENT_BLOCKED_ATTR) === '1' && hasVisibleReplyItems(replyShow)) {
                applyBlockedCommentShell(parentLi);
                return false;
            }
            return true;
        }
        return false;
    };

    const mergeDetachedRepliesIntoParent = (roots = null) => {
        collectCommentLists(roots).forEach((list) => {
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
                if (shouldSkipReplyMergeTarget(parentLi, replyShow)) return;

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
    const pendingReplyMergeRoots = new Set();
    let forceFullReplyMerge = false;
    let lastReplyMergeRoots = [];
    const addPendingReplyMergeRoots = (roots) => {
        collectCommentLists(roots).forEach((list) => pendingReplyMergeRoots.add(list));
    };
    const replyMergeScheduler = __dcufCreatePhaseScheduler('reply-merge', ({ delay, meta }) => {
        const options = meta && typeof meta === 'object' ? meta : {};
        const source = options.source || '';
        const filterModule = window.__dcufFilterModule;

        if (delay === 0) {
            const roots = forceFullReplyMerge
                ? collectCommentLists()
                : Array.from(pendingReplyMergeRoots).filter((root) => root.isConnected);
            pendingReplyMergeRoots.clear();
            forceFullReplyMerge = false;
            lastReplyMergeRoots = roots;
            if (roots.length === 0) return;
            if (source !== 'window-load') mergeDetachedRepliesIntoParent(roots);
            syncFilteredParentPlaceholders(roots);
            syncFocusCommentCardGroups(roots);
            return;
        }

        if (delay === 140
            && !options.skipRefilter
            && lastReplyMergeRoots.length > 0
            && typeof filterModule?.scheduleCommentStabilizedRefilter === 'function') {
            filterModule.scheduleCommentStabilizedRefilter('reply-merge', lastReplyMergeRoots);
        }
    }, [140]);
    const scheduleReplyMerge = (meta = null) => {
        const options = meta && typeof meta === 'object' ? meta : {};
        if (options.forceFull) forceFullReplyMerge = true;
        if (options.roots) addPendingReplyMergeRoots(options.roots);
        replyMergeScheduler.schedule(options);
    };
    const flushReplyMerge = (meta = null) => {
        const options = meta && typeof meta === 'object' ? meta : {};
        if (options.forceFull) forceFullReplyMerge = true;
        if (options.roots) addPendingReplyMergeRoots(options.roots);
        replyMergeScheduler.flush(options);
    };
    const isReplyMergeMutationNode = (node) => {
        if (!(node instanceof Element)) return false;
        const runtimeCoordinator = __dcufGetRuntimeCoordinator();
        if (typeof runtimeCoordinator?.isScriptOwnedElement === 'function' && runtimeCoordinator.isScriptOwnedElement(node)) {
            return false;
        }
        if (node.matches('#focus_cmt')) return true;
        if (node.matches(COMMENT_LIST_SELECTOR)) return true;
        if (node.matches('div[id^="comment_wrap_"] .comment_box .reply.show, div[id^="comment_wrap_"] .comment_box .reply_box, div[id^="comment_wrap_"] .comment_box .reply_list')) {
            return true;
        }
        if (node.matches('div[id^="comment_wrap_"] .comment_box li[id^="comment_li_"], div[id^="comment_wrap_"] .comment_box li[id^="reply_li_"]')) {
            return true;
        }
        if (typeof node.querySelector === 'function' && node.querySelector([
            '#focus_cmt',
            'div[id^="comment_wrap_"] .comment_box .reply.show',
            'div[id^="comment_wrap_"] .comment_box .reply_box',
            'div[id^="comment_wrap_"] .comment_box .reply_list',
            'div[id^="comment_wrap_"] .comment_box li[id^="comment_li_"]',
            'div[id^="comment_wrap_"] .comment_box li[id^="reply_li_"]'
        ].join(', '))) {
            return true;
        }
        return false;
    };
    const isReplyMergeAttributeTarget = (node) => {
        if (!(node instanceof Element)) return false;
        const runtimeCoordinator = __dcufGetRuntimeCoordinator();
        if (typeof runtimeCoordinator?.isScriptOwnedElement === 'function' && runtimeCoordinator.isScriptOwnedElement(node)) {
            return false;
        }
        if (node.matches('#focus_cmt')) return true;
        if (node.matches('div[id^="comment_wrap_"] .comment_box .reply.show, div[id^="comment_wrap_"] .comment_box .reply_box, div[id^="comment_wrap_"] .comment_box .reply_list')) {
            return true;
        }
        return !!node.closest('div[id^="comment_wrap_"] .comment_box .reply.show, #focus_cmt');
    };
    const collectReplyMergeRootsFromPayload = (payload) => {
        if (!payload || typeof payload !== 'object') return [];
        const roots = new Set();
        const addRoots = (nodes, predicate) => {
            if (!Array.isArray(nodes)) return;
            nodes.forEach((node) => {
                if (!predicate(node)) return;
                collectCommentLists([node]).forEach((list) => roots.add(list));
            });
        };
        addRoots(payload.addedElements, isReplyMergeMutationNode);
        addRoots(payload.removedElements, isReplyMergeMutationNode);
        // Removed reply-composer trees are detached by dispatch time, so use the
        // still-connected childList target to clear stale focus grouping.
        addRoots(payload.childListTargets, isReplyMergeAttributeTarget);
        addRoots(payload.attributeTargets, isReplyMergeAttributeTarget);
        return Array.from(roots);
    };

    const observeReplyMergeTargets = () => {
        if (window.__dcufReplyMergeMutationUnsubscribe || window.__dcufReplyMergeObserver) return;

        const unsubscribe = __dcufSubscribeMutationBus('reply-merge', (payload) => {
            const roots = collectReplyMergeRootsFromPayload(payload);
            if (roots.length > 0) scheduleReplyMerge({ source: 'mutation-bus', roots });
        });
        if (typeof unsubscribe === 'function') {
            window.__dcufReplyMergeMutationUnsubscribe = unsubscribe;
            return;
        }

        if (!document.body) return;

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
                    const hasRelevantChange = isReplyMergeAttributeTarget(mutation.target)
                        || Array.from(mutation.addedNodes).some(isReplyMergeMutationNode)
                        || Array.from(mutation.removedNodes).some(isReplyMergeMutationNode);
                    if (hasRelevantChange) {
                        scheduleReplyMerge({ source: 'mutation-observer', roots: [mutation.target, ...Array.from(mutation.addedNodes)] });
                        return;
                    }
                }

                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    if (isReplyMergeAttributeTarget(target)) {
                        scheduleReplyMerge({ source: 'mutation-observer', roots: [target] });
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Run the initial reply merge synchronously so blocked parent comments stay
            // filtered before the comment area becomes visually stable.
            flushReplyMerge({ source: 'dom-ready-initial', forceFull: true });
            observeReplyMergeTargets();
        }, { once: true });
    } else {
        flushReplyMerge({ source: 'ready-initial', forceFull: true });
        observeReplyMergeTargets();
    }

    window.addEventListener('load', () => scheduleReplyMerge({ source: 'window-load', forceFull: true, skipRefilter: true }), { once: true });
    window.addEventListener('resize', () => scheduleReplyMerge({ source: 'resize', forceFull: true, skipRefilter: true }));
})();

(() => {
    if (!__dcufPageSupports('view')) return;

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
    if (!__dcufPageSupports('list')) return;
    const DRAWER_SELECTOR = '.dcuf-header-drawer';
    const DRAWER_BODY_SELECTOR = '.dcuf-header-drawer__body-inner';
    const CLOSED_LABEL = '갤러리 대문 열기';
    const OPEN_LABEL = '갤러리 대문 닫기';
    const SOURCE_ORDER = [
        { key: 'issue', selector: '.issue_contentbox' },
        { key: 'top-recom', selector: '#gall_top_recom.concept_wrap' }
    ];

    const isListPage = () => !document.querySelector('.view_content_wrap');
    const findOutsideDrawer = (selector) => Array.from(document.querySelectorAll(selector))
        .find((element) => element instanceof HTMLElement && !element.closest(DRAWER_SELECTOR));
    const isInsideDrawer = (node) => node instanceof Element && Boolean(node.closest(DRAWER_SELECTOR));
    const portalOriginalHotRankPopup = () => {
        const popup = document.getElementById('hot_rank_pop2');
        if (!(popup instanceof HTMLElement) || !document.body || popup.parentElement === document.body) return;
        popup.setAttribute('data-dcuf-host-popup-portal', '1');
        document.body.appendChild(popup);
    };

    const resolveDrawerMount = () => {
        const pageHeadActions = document.querySelector('.page_head > .fr');
        if (pageHeadActions instanceof HTMLElement) {
            return { parent: pageHeadActions, before: pageHeadActions.firstChild || null };
        }

        const pageHead = document.querySelector('.page_head');
        if (pageHead instanceof HTMLElement && pageHead.parentElement) {
            return { parent: pageHead.parentElement, before: pageHead.nextSibling };
        }

        const listArrayOption = document.querySelector('.list_array_option');
        if (listArrayOption instanceof HTMLElement && listArrayOption.parentElement) {
            return { parent: listArrayOption.parentElement, before: listArrayOption };
        }

        const listWrap = document.querySelector('.gall_listwrap, .list_wrap');
        if (listWrap instanceof HTMLElement && listWrap.parentElement) {
            return { parent: listWrap.parentElement, before: listWrap };
        }

        return null;
    };

    const setDrawerOpenState = (drawer, nextOpen) => {
        if (!(drawer instanceof HTMLElement)) return;
        const toggle = drawer.querySelector('.dcuf-header-drawer__toggle');
        const label = drawer.querySelector('.dcuf-header-drawer__toggle-label');
        const body = drawer.querySelector('.dcuf-header-drawer__body');
        const bodyInner = drawer.querySelector(DRAWER_BODY_SELECTOR);
        drawer.setAttribute('data-open', nextOpen ? '1' : '0');
        if (toggle instanceof HTMLElement) toggle.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
        if (label instanceof HTMLElement) label.textContent = nextOpen ? OPEN_LABEL : CLOSED_LABEL;
        if (body instanceof HTMLElement) {
            if (nextOpen) {
                body.style.setProperty('display', 'block', 'important');
                body.style.setProperty('visibility', 'visible', 'important');
                body.style.setProperty('opacity', '1', 'important');
                body.style.setProperty('pointer-events', 'auto', 'important');
                body.style.setProperty('overflow', 'visible', 'important');
                const measuredHeight = Math.max(
                    Math.ceil(bodyInner instanceof HTMLElement ? bodyInner.scrollHeight : 0),
                    Math.ceil(bodyInner instanceof HTMLElement ? bodyInner.getBoundingClientRect().height : 0),
                    Math.ceil(body.scrollHeight || 0),
                    1
                );
                body.style.setProperty('max-height', `${measuredHeight}px`, 'important');
            } else {
                body.style.setProperty('max-height', '0px', 'important');
                body.style.setProperty('opacity', '0', 'important');
                body.style.setProperty('visibility', 'hidden', 'important');
                body.style.setProperty('pointer-events', 'none', 'important');
                body.style.setProperty('overflow', 'hidden', 'important');
                body.style.setProperty('display', 'none', 'important');
            }
        }
    };

    const ensureDrawerShell = (mount) => {
        if (!mount?.parent) return null;

        let drawer = document.querySelector(DRAWER_SELECTOR);
        if (!(drawer instanceof HTMLElement)) {
            drawer = document.createElement('div');
            drawer.className = 'dcuf-header-drawer';
            drawer.setAttribute('data-open', '0');
            drawer.innerHTML = `
                <button type="button" class="dcuf-header-drawer__toggle" aria-expanded="false">
                    <span class="dcuf-header-drawer__toggle-label">${CLOSED_LABEL}</span>
                </button>
                <div class="dcuf-header-drawer__body">
                    <div class="dcuf-header-drawer__body-inner"></div>
                </div>
            `;
        }

        if (drawer.parentElement !== mount.parent || drawer.nextSibling !== mount.before) {
            mount.parent.insertBefore(drawer, mount.before);
        }

        return drawer;
    };

    const syncHeaderDrawer = () => {
        const existingDrawer = document.querySelector(DRAWER_SELECTOR);
        if (!isListPage()) {
            if (existingDrawer instanceof HTMLElement) existingDrawer.remove();
            return;
        }

        const mount = resolveDrawerMount();
        if (!mount?.parent) {
            if (existingDrawer instanceof HTMLElement) existingDrawer.remove();
            return;
        }

        const drawer = ensureDrawerShell(mount);
        if (!(drawer instanceof HTMLElement)) return;

        const body = drawer.querySelector(DRAWER_BODY_SELECTOR);
        if (!(body instanceof HTMLElement)) return;

        // The host hides the desktop issue content after mobile list conversion.
        // Portal only the original rank popup so it is not clipped by that hidden ancestor.
        portalOriginalHotRankPopup();

        SOURCE_ORDER.forEach(({ key, selector }) => {
            let panel = body.querySelector(`.dcuf-header-drawer__panel[data-source="${key}"]`);
            const source = findOutsideDrawer(selector);

            if (!(source instanceof HTMLElement)) {
                if (panel instanceof HTMLElement) panel.remove();
                return;
            }

            if (!(panel instanceof HTMLElement)) {
                panel = document.createElement('div');
                panel.className = 'dcuf-header-drawer__panel';
                panel.setAttribute('data-source', key);
            }

            const nextSignature = source.outerHTML;
            if (panel.__dcufSourceSignature !== nextSignature) {
                const clonedSource = source.cloneNode(true);
                if (clonedSource instanceof HTMLElement) {
                    // Host dropdown functions depend on the original issue_wrap hierarchy.
                    // Keep every host node in place and make the drawer clone presentation-only.
                    clonedSource.querySelectorAll('.pop_wrap, script, template').forEach((element) => element.remove());
                    clonedSource.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
                    clonedSource.removeAttribute('id');
                    clonedSource.setAttribute('data-dcuf-drawer-source', key);
                    clonedSource.setAttribute('data-dcuf-drawer-clone', '1');
                    panel.replaceChildren(clonedSource);
                    panel.__dcufSourceSignature = nextSignature;
                }
            }
            body.appendChild(panel);
        });

        Array.from(body.querySelectorAll('.dcuf-header-drawer__panel')).forEach((panel) => {
            if (!(panel instanceof HTMLElement)) return;
            if (panel.childElementCount === 0) panel.remove();
        });

        if (body.childElementCount === 0) {
            drawer.remove();
            return;
        }

        setDrawerOpenState(drawer, drawer.getAttribute('data-open') === '1');
    };

    const headerDrawerScheduler = __dcufCreatePhaseScheduler('list-header-drawer', () => {
        syncHeaderDrawer();
    }, [120]);
    const scheduleHeaderDrawer = () => {
        headerDrawerScheduler.schedule();
    };

    const observeHeaderDrawerTargets = () => {
        if (window.__dcufHeaderDrawerMutationUnsubscribe || window.__dcufHeaderDrawerObserver) return;

        const unsubscribe = __dcufSubscribeMutationBus('header-drawer', (payload) => {
            const relevantNodes = __dcufCollectMatches(
                payload,
                '.page_head, .list_array_option, .gall_listwrap, .list_wrap, .issue_contentbox, #gall_top_recom.concept_wrap',
                { includeRoots: true }
            ).filter((node) => !isInsideDrawer(node));
            if (relevantNodes.length > 0) scheduleHeaderDrawer();
        });
        if (typeof unsubscribe === 'function') {
            window.__dcufHeaderDrawerMutationUnsubscribe = unsubscribe;
            return;
        }

        if (!document.body) return;
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (isInsideDrawer(mutation.target)) continue;
                scheduleHeaderDrawer();
                return;
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });
        window.__dcufHeaderDrawerObserver = observer;
    };

    scheduleHeaderDrawer();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            scheduleHeaderDrawer();
            observeHeaderDrawerTargets();
        }, { once: true });
    } else {
        observeHeaderDrawerTargets();
    }

    window.addEventListener('load', scheduleHeaderDrawer, { once: true });
    window.addEventListener('resize', scheduleHeaderDrawer);
    document.addEventListener('click', (event) => {
        const toggle = event.target instanceof Element
            ? event.target.closest('.dcuf-header-drawer__toggle')
            : null;
        if (!(toggle instanceof HTMLButtonElement)) return;
        const drawer = toggle.closest(DRAWER_SELECTOR);
        if (!(drawer instanceof HTMLElement)) return;
        event.preventDefault();
        event.stopPropagation();
        setDrawerOpenState(drawer, drawer.getAttribute('data-open') !== '1');
    }, true);
})();

(() => {
    if (!__dcufPageSupports('write')) return;

    const STYLE_ID = 'dcuf-mobile-write-theme';
    if (document.getElementById(STYLE_ID)) return;

    const css = `
        html, body {
            overflow-x: hidden !important;
        }
        body.is-write-page {
            box-sizing: border-box !important;
            width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            --dcuf-write-fg: #22324c;
            --dcuf-write-fg-sub: #5f6f86;
            --dcuf-write-accent: #3f6de0;
            --dcuf-write-accent-strong: #245bda;
            --dcuf-write-surface: #ffffff;
            --dcuf-write-surface-muted: #f6f8fb;
            --dcuf-write-border: #d7e0ec;
            --dcuf-write-border-strong: #c7d3e4;
            --dcuf-write-shadow: 0 8px 24px rgba(18, 35, 69, 0.08);
            background: #f2f6fb !important;
            overflow-x: clip !important;
        }
        body.is-write-page.dc-filter-dark-mode {
            --dcuf-write-fg: #edf3ff;
            --dcuf-write-fg-sub: #b6c4d9;
            --dcuf-write-accent: #8cb4ff;
            --dcuf-write-accent-strong: #6f9dff;
            --dcuf-write-surface: #18212d;
            --dcuf-write-surface-muted: #1e2a39;
            --dcuf-write-border: #314258;
            --dcuf-write-border-strong: #45607c;
            --dcuf-write-shadow: 0 10px 24px rgba(0, 0, 0, 0.32);
            background: #121922 !important;
        }
        body.is-write-page #container,
        body.is-write-page #top.dcwrap,
        body.is-write-page #write_wrap,
        body.is-write-page #container .center_content,
        body.is-write-page #container .gall_write,
        body.is-write-page #container .write_box {
            box-sizing: border-box !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
        }
        body.is-write-page #top.dcwrap {
            width: 100% !important;
            max-width: none !important;
            min-width: 0 !important;
        }
        body.is-write-page #container {
            padding: 8px !important;
            background: transparent !important;
            overflow: visible !important;
        }
        body.is-write-page #write_wrap {
            padding-right: 0 !important;
            padding-left: 0 !important;
        }
        body.is-write-page.dcuf-write-desktop-site-mobile #container {
            width: var(--dcuf-write-device-width) !important;
            max-width: var(--dcuf-write-device-width) !important;
            padding: 8px !important;
            zoom: var(--dcuf-write-desktop-site-scale);
        }
        body.is-write-page.dcuf-write-desktop-site-mobile {
            padding-right: 0 !important;
            padding-left: 0 !important;
        }
        body.is-write-page #container .center_content,
        body.is-write-page #container .gall_write,
        body.is-write-page #container .write_box {
            padding: 0 !important;
            background: transparent !important;
            overflow: visible !important;
        }
        body.is-write-page form#write {
            box-sizing: border-box !important;
            display: block !important;
            width: min(100%, 1120px) !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin: 0 auto !important;
            padding: 12px !important;
            border: 1px solid var(--dcuf-write-border) !important;
            border-radius: 12px !important;
            background: var(--dcuf-write-surface) !important;
            box-shadow: var(--dcuf-write-shadow) !important;
            overflow: visible !important;
        }
        body.is-write-page form#write *:not(.pop_wrap):not(.pop_wrap *):not(.note-dropdown-menu):not(.note-dropdown-menu *):not(.note-popover):not(.note-popover *):not(.note-modal):not(.note-modal *),
        body.is-write-page form#write *:not(.pop_wrap):not(.pop_wrap *):not(.note-dropdown-menu):not(.note-dropdown-menu *):not(.note-popover):not(.note-popover *):not(.note-modal):not(.note-modal *)::before,
        body.is-write-page form#write *:not(.pop_wrap):not(.pop_wrap *):not(.note-dropdown-menu):not(.note-dropdown-menu *):not(.note-popover):not(.note-popover *):not(.note-modal):not(.note-modal *)::after {
            box-sizing: border-box;
        }
        body.is-write-page form#write .dcuf-write-decoy-input {
            width: 0 !important;
            height: 0 !important;
            min-width: 0 !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            position: absolute !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }
        body.is-write-page form#write .dcuf-write-fields {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px !important;
            width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
        }
        body.is-write-page form#write .dcuf-write-fields > legend {
            position: absolute !important;
            width: 1px !important;
            height: 1px !important;
            overflow: hidden !important;
            clip-path: inset(50%) !important;
        }
        body.is-write-page form#write .dcuf-write-guest-field,
        body.is-write-page form#write .dcuf-write-subject-field,
        body.is-write-page form#write .dcuf-write-captcha-image {
            width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            float: none !important;
        }
        body.is-write-page form#write .dcuf-write-subject-field,
        body.is-write-page form#write .dcuf-write-fields > .write_subject,
        body.is-write-page form#write .dcuf-write-fields > [style*="clear"] {
            grid-column: 1 / -1;
        }
        body.is-write-page form#write .dcuf-write-fields > [style*="clear"] {
            display: none !important;
        }
        body.is-write-page form#write .dcuf-write-captcha-image {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            min-height: 46px !important;
            padding: 4px !important;
            border: 1px solid var(--dcuf-write-border) !important;
            border-radius: 9px !important;
            background: var(--dcuf-write-surface-muted) !important;
        }
        body.is-write-page form#write .dcuf-write-captcha-image img {
            display: block !important;
            width: auto !important;
            max-width: 100% !important;
            height: 38px !important;
            object-fit: contain !important;
        }
        body.is-write-page form#write .w_top,
        body.is-write-page form#write .w_top > tbody {
            display: block !important;
            width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            border: 0 !important;
            border-spacing: 0 !important;
        }
        body.is-write-page form#write .w_top > tbody > tr {
            width: 100% !important;
            min-width: 0 !important;
            margin: 0 0 10px !important;
            padding: 0 !important;
            border: 0 !important;
        }
        body.is-write-page form#write .dcuf-write-subject-row {
            display: grid !important;
            grid-template-columns: 58px minmax(0, 1fr);
            align-items: center;
            gap: 8px;
        }
        body.is-write-page form#write .user_info_box {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            gap: 8px;
        }
        body.is-write-page form#write .dcuf-write-subject-row > th,
        body.is-write-page form#write .dcuf-write-subject-row > td,
        body.is-write-page form#write .user_info_box > th,
        body.is-write-page form#write .user_info_box > td {
            display: block !important;
            width: auto !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            color: var(--dcuf-write-fg-sub) !important;
        }
        body.is-write-page form#write .user_info_box > th {
            position: absolute !important;
            width: 1px !important;
            height: 1px !important;
            overflow: hidden !important;
            clip-path: inset(50%) !important;
        }
        body.is-write-page form#write .user_info_box > .fixture-captcha-cell,
        body.is-write-page form#write .user_info_box > td:has(.captcha) {
            grid-column: 1 / -1;
        }
        body.is-write-page form#write #subject,
        body.is-write-page form#write #name,
        body.is-write-page form#write #password,
        body.is-write-page form#write #code,
        body.is-write-page form#write select:not(.pop_wrap *):not(.note-dropdown-menu *):not(.note-popover *):not(.note-modal *) {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            height: 46px !important;
            padding: 0 12px !important;
            border: 1px solid var(--dcuf-write-border-strong) !important;
            border-radius: 9px !important;
            outline: none !important;
            background: var(--dcuf-write-surface) !important;
            color: var(--dcuf-write-fg) !important;
            font-size: 16px !important;
            line-height: 1.2 !important;
        }
        body.is-write-page form#write input:not(.pop_wrap *):not(.note-dropdown-menu *):not(.note-popover *):not(.note-modal *):focus,
        body.is-write-page form#write select:not(.pop_wrap *):not(.note-dropdown-menu *):not(.note-popover *):not(.note-modal *):focus,
        body.is-write-page form#write .note-editable:focus,
        body.is-write-page form#write .note-codable:focus {
            border-color: var(--dcuf-write-accent) !important;
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--dcuf-write-accent) 18%, transparent) !important;
        }
        body.is-write-page form#write .captcha {
            display: grid !important;
            grid-template-columns: minmax(108px, 0.42fr) minmax(0, 1fr);
            align-items: center !important;
            gap: 8px !important;
            width: 100% !important;
            min-width: 0 !important;
            padding: 8px !important;
            border: 1px solid var(--dcuf-write-border) !important;
            border-radius: 10px !important;
            background: var(--dcuf-write-surface-muted) !important;
        }
        body.is-write-page form#write .captcha label {
            position: absolute !important;
            width: 1px !important;
            height: 1px !important;
            overflow: hidden !important;
            clip-path: inset(50%) !important;
        }
        body.is-write-page form#write .captcha .fixture-captcha-image,
        body.is-write-page form#write .captcha img {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            height: 38px !important;
            object-fit: contain !important;
            border-radius: 7px !important;
        }
        body.is-write-page form#write .write_subject {
            display: flex !important;
            flex-wrap: nowrap !important;
            align-items: center !important;
            gap: 6px !important;
            width: 100% !important;
            min-width: 0 !important;
            min-height: 48px !important;
            margin: 0 0 10px !important;
            padding: 6px !important;
            border: 1px solid var(--dcuf-write-border) !important;
            border-radius: 10px !important;
            background: var(--dcuf-write-surface-muted) !important;
            position: relative !important;
            overflow: visible !important;
        }
        body.is-write-page form#write .write_subject > * {
            flex: 0 0 auto !important;
        }
        body.is-write-page form#write .write_subject .subject_list {
            display: flex !important;
            flex-wrap: nowrap !important;
            align-items: center !important;
            gap: 3px !important;
            flex: 1 1 auto !important;
            width: auto !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 4px 0 0 !important;
            float: none !important;
            list-style: none !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            overscroll-behavior-inline: contain;
            scroll-behavior: smooth;
            scroll-snap-type: x proximity;
            scroll-padding-inline: 12px;
            scrollbar-width: none !important;
            -ms-overflow-style: none;
            -webkit-overflow-scrolling: touch;
            touch-action: pan-x pinch-zoom;
            cursor: grab;
            user-select: none;
        }
        body.is-write-page form#write .write_subject .subject_list.dcuf-headtext-dragging {
            cursor: grabbing;
            scroll-behavior: auto;
            scroll-snap-type: none;
        }
        body.is-write-page form#write .write_subject .subject_list::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
        }
        body.is-write-page form#write .write_subject .subject_list > li {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            min-width: 48px !important;
            min-height: 38px !important;
            width: auto !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 10px !important;
            float: none !important;
            flex: 0 0 auto !important;
            scroll-snap-align: start;
            border-radius: 999px !important;
            cursor: pointer;
        }
        body.is-write-page form#write .write_subject .subject_list > li .tip_box2 {
            position: fixed !important;
            left: var(--dcuf-headtext-tip-left, 8px) !important;
            top: var(--dcuf-headtext-tip-top, 8px) !important;
            right: auto !important;
            bottom: auto !important;
            z-index: 1200 !important;
            max-width: min(320px, var(--dcuf-headtext-tip-max-width, calc(100vw - 16px))) !important;
        }
        body.is-write-page form#write .write_subject_label {
            padding: 0 6px !important;
            color: var(--dcuf-write-fg-sub) !important;
            font-weight: 700 !important;
        }
        body.is-write-page form#write .write_subject > .tit {
            padding: 0 6px !important;
            color: var(--dcuf-write-fg-sub) !important;
            font-weight: 700 !important;
        }
        body.is-write-page form#write .write_subject > button,
        body.is-write-page form#write .write_subject .subject_list > li > button,
        body.is-write-page form#write [data-headtext] {
            min-width: 48px !important;
            min-height: 38px !important;
            padding: 0 12px !important;
            border: 1px solid var(--dcuf-write-border) !important;
            border-radius: 999px !important;
            background: var(--dcuf-write-surface) !important;
            color: var(--dcuf-write-fg-sub) !important;
        }
        body.is-write-page form#write .write_subject > button.active,
        body.is-write-page form#write .write_subject .subject_list > li > button.active,
        body.is-write-page form#write [data-headtext].active {
            border-color: var(--dcuf-write-accent-strong) !important;
            background: var(--dcuf-write-accent-strong) !important;
            color: #fff !important;
        }
        body.is-write-page form#write .editor_wrap,
        body.is-write-page form#write .note-editor,
        body.is-write-page form#write .note-editing-area {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
        }
        body.is-write-page form#write .editor_wrap,
        body.is-write-page form#write .note-editor {
            border: 1px solid var(--dcuf-write-border-strong) !important;
            border-radius: 10px !important;
            background: var(--dcuf-write-surface) !important;
            position: relative !important;
            overflow: visible !important;
        }
        body.is-write-page form#write .note-toolbar,
        body.is-write-page form#write .note-toolbar-media {
            position: relative !important;
            z-index: 3 !important;
            border-radius: 13px 13px 0 0 !important;
        }
        body.is-write-page form#write .note-editing-area {
            position: relative !important;
            z-index: 0 !important;
            overflow: hidden !important;
        }
        body.is-write-page form#write .note-statusbar {
            border-radius: 0 0 13px 13px !important;
        }
        body.is-write-page form#write .write_subject .toast,
        body.is-write-page form#write .write_subject [role="alert"] {
            z-index: 1000 !important;
            max-width: calc(100vw - 24px) !important;
            visibility: visible;
            pointer-events: auto;
        }
        body.is-write-page form#write .write_subject .tip_box2:not(.dcuf-headtext-tip-positioned) {
            visibility: hidden !important;
            pointer-events: none !important;
        }
        body.is-write-page form#write .write_subject .tip_box2.dcuf-headtext-tip-positioned {
            visibility: visible !important;
            pointer-events: auto !important;
        }
        body.is-write-page form#write .note-toolbar :is(.note-dropdown-menu, .pop_wrap):not(.dcuf-editor-layer-positioned) {
            visibility: hidden !important;
            pointer-events: none !important;
        }
        body.is-write-page form#write .note-toolbar :is(.note-dropdown-menu, .pop_wrap).dcuf-editor-layer-positioned {
            visibility: visible !important;
            pointer-events: auto !important;
        }
        body.is-write-page form#write .note-toolbar .pop_wrap.dcuf-editor-layer-positioned {
            position: fixed !important;
            zoom: var(--dcuf-write-desktop-site-inverse-scale, 1);
        }
        body.is-write-page form#write .note-toolbar .note-dropdown-menu.dcuf-editor-layer-positioned {
            position: fixed !important;
            zoom: 1 !important;
        }
        body.is-write-page form#write .note-toolbar :is(.note-dropdown-menu, .pop_wrap).dcuf-editor-layer-positioned {
            left: var(--dcuf-editor-layer-left) !important;
            top: var(--dcuf-editor-layer-top) !important;
            right: auto !important;
            bottom: auto !important;
            z-index: 2147483647 !important;
        }
        body.is-write-page form#write .note-toolbar .note-dropdown-menu.dcuf-editor-layer-positioned {
            max-width: var(--dcuf-editor-layer-max-width) !important;
            max-height: var(--dcuf-editor-layer-max-height) !important;
            overflow: auto !important;
            overscroll-behavior: contain !important;
            -webkit-overflow-scrolling: touch !important;
        }
        body.is-write-page.dcuf-write-mobile-font-menu form#write .note-toolbar .note-fontname button.dropdown-toggle,
        body.is-write-page.dcuf-write-mobile-font-menu form#write .note-toolbar .note-fontname button.note-btn {
            width: auto !important;
            min-width: 88px !important;
            max-width: 132px !important;
            flex: 0 0 auto !important;
        }
        body.is-write-page form#write .note-toolbar .note-current-fontname {
            display: inline-block !important;
            min-width: 42px !important;
            max-width: 88px !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            vertical-align: middle !important;
            white-space: nowrap !important;
            color: var(--dcuf-write-fg) !important;
            -webkit-text-fill-color: currentColor !important;
            opacity: 1 !important;
            visibility: visible !important;
        }
        body.is-write-page form#write .note-toolbar .note-current-fontname:empty::before {
            content: "글꼴";
            color: inherit !important;
            -webkit-text-fill-color: currentColor !important;
        }
        body.is-write-page form#write .note-toolbar-media,
        body.is-write-page form#write .note-toolbar,
        body.is-write-page form#write .tx-toolbar-basic,
        body.is-write-page form#write .btns-box {
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            gap: 5px !important;
            width: 100% !important;
            min-width: 0 !important;
            min-height: 48px !important;
            margin: 0 !important;
            padding: 5px !important;
            border-color: var(--dcuf-write-border) !important;
            background: var(--dcuf-write-surface-muted) !important;
            overflow: visible !important;
        }
        body.is-write-page form#write .note-toolbar-media > :not(.pop_wrap):not(.note-dropdown-menu):not(.note-popover):not(.note-modal),
        body.is-write-page form#write .note-toolbar > :not(.pop_wrap):not(.note-dropdown-menu):not(.note-popover):not(.note-modal),
        body.is-write-page form#write .tx-toolbar-basic > *,
        body.is-write-page form#write .btns-box > * {
            flex: 0 0 auto !important;
        }
        body.is-write-page form#write .note-toolbar-media,
        body.is-write-page form#write .note-toolbar,
        body.is-write-page form#write .tx-toolbar-basic {
            flex-wrap: nowrap !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            overscroll-behavior-inline: contain;
            scroll-behavior: smooth;
            scrollbar-width: none !important;
            -ms-overflow-style: none;
            -webkit-overflow-scrolling: touch;
            touch-action: pan-x pinch-zoom;
            cursor: grab;
            user-select: none;
        }
        body.is-write-page form#write :is(.note-toolbar-media, .note-toolbar, .tx-toolbar-basic).dcuf-editor-toolbar-dragging {
            scroll-behavior: auto;
            cursor: grabbing;
        }
        body.is-write-page form#write :is(.note-toolbar-media, .note-toolbar, .tx-toolbar-basic)::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
        }
        body.is-write-page form#write .note-toolbar > .note-btn,
        body.is-write-page form#write .note-toolbar > button,
        body.is-write-page form#write .note-toolbar > input[type="button"],
        body.is-write-page form#write .note-toolbar .note-btn-group > .note-btn:not(.pop_wrap *):not(.note-dropdown-menu *):not(.note-popover *):not(.note-modal *),
        body.is-write-page form#write .note-toolbar .note-btn-group > button:not(.pop_wrap *):not(.note-dropdown-menu *):not(.note-popover *):not(.note-modal *),
        body.is-write-page form#write .note-toolbar .note-btn-group > input[type="button"]:not(.pop_wrap *):not(.note-dropdown-menu *):not(.note-popover *):not(.note-modal *),
        body.is-write-page form#write .note-toolbar-media > .note-btn,
        body.is-write-page form#write .note-toolbar-media > button,
        body.is-write-page form#write .btns-box button:not(.pop_wrap *):not(.note-dropdown-menu *):not(.note-popover *):not(.note-modal *) {
            min-width: 38px !important;
            min-height: 38px !important;
            padding: 0 9px !important;
            border: 1px solid var(--dcuf-write-border) !important;
            border-radius: 8px !important;
            background: var(--dcuf-write-surface) !important;
            color: var(--dcuf-write-fg) !important;
        }
        body.is-write-page form#write .note-toolbar > .note-btn-danger,
        body.is-write-page form#write .note-toolbar .note-btn-group > .note-btn-danger:not(.pop_wrap *):not(.note-dropdown-menu *):not(.note-popover *):not(.note-modal *),
        body.is-write-page form#write .note-toolbar-media > .note-btn-danger {
            border-color: #d5525b !important;
            background: #d5525b !important;
            color: #fff !important;
        }
        body.is-write-page form#write .write-html-toggle {
            display: inline-flex !important;
            align-items: center !important;
            gap: 5px !important;
            min-height: 38px !important;
            margin-left: auto !important;
            padding: 0 9px !important;
            color: var(--dcuf-write-fg-sub) !important;
            white-space: nowrap !important;
        }
        body.is-write-page form#write .note-editable,
        body.is-write-page form#write .note-codable {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            min-height: 320px !important;
            padding: 14px !important;
            border: 0 !important;
            border-radius: 0 !important;
            outline: none !important;
            background: var(--dcuf-write-surface) !important;
            color: var(--dcuf-write-fg) !important;
            font-size: 16px !important;
            line-height: 1.6 !important;
            resize: vertical !important;
            overflow-wrap: anywhere !important;
        }
        body.is-write-page form#write .note-editable {
            display: block !important;
        }
        body.is-write-page form#write .note-codable {
            display: none !important;
        }
        body.is-write-page form#write .note-editor.codeview .note-editable,
        body.is-write-page form#write .note-editor.fixture-html-mode .note-editable,
        body.is-write-page form#write .note-editable[hidden],
        body.is-write-page form#write .note-codable[hidden] {
            display: none !important;
        }
        body.is-write-page form#write .note-editor.codeview .note-codable,
        body.is-write-page form#write .note-editor.fixture-html-mode .note-codable {
            display: block !important;
        }
        body.is-write-page form#write .note-statusbar {
            border-color: var(--dcuf-write-border) !important;
            background: var(--dcuf-write-surface-muted) !important;
        }
        body.is-write-page form#write .fixture-attachment-panel,
        body.is-write-page form#write [class*="file_upload"]:not(.pop_wrap *):not(.note-dropdown-menu *):not(.note-popover *):not(.note-modal *),
        body.is-write-page form#write .upload-img-lst:not(.pop_wrap *):not(.note-dropdown-menu *):not(.note-popover *):not(.note-modal *) {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin: 10px 0 0 !important;
            padding: 10px !important;
            border: 1px solid var(--dcuf-write-border) !important;
            border-radius: 10px !important;
            background: var(--dcuf-write-surface-muted) !important;
            overflow: hidden !important;
        }
        body.is-write-page form#write input[type="file"]:not(.pop_wrap *):not(.note-dropdown-menu *):not(.note-popover *):not(.note-modal *) {
            width: 100% !important;
            max-width: 100% !important;
            min-height: 38px !important;
            color: var(--dcuf-write-fg-sub) !important;
        }
        body.is-write-page form#write .fixture-attachment-list,
        body.is-write-page form#write .upload-img-lst:not(.pop_wrap *):not(.note-dropdown-menu *):not(.note-popover *):not(.note-modal *) ul {
            min-width: 0 !important;
            overflow-wrap: anywhere !important;
        }
        body.is-write-page form#write .fixture-attachment {
            max-width: 100% !important;
            background: color-mix(in srgb, var(--dcuf-write-accent) 12%, var(--dcuf-write-surface)) !important;
            color: var(--dcuf-write-fg) !important;
        }
        body.is-write-page form#write .ai_easy_wrap {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin: 8px 0 0 !important;
            overflow: hidden !important;
        }
        body.is-write-page form#write .ai_easy_box {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) auto auto !important;
            align-items: stretch !important;
            gap: 6px !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
        }
        body.is-write-page form#write .ai_easy_box .ipt_box,
        body.is-write-page form#write .ai_easy_box .ipt_txt {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
        }
        body.is-write-page form#write .ai_easy_box .ipt_box {
            display: flex !important;
            align-items: center !important;
            overflow: hidden !important;
        }
        body.is-write-page form#write .ai_easy_box .ipt_txt {
            flex: 1 1 auto !important;
            resize: none !important;
        }
        body.is-write-page form#write #write_option_box {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
        }
        body.is-write-page form#write .fixture-adult {
            display: inline-flex !important;
            align-items: center !important;
            gap: 8px !important;
            min-height: 38px !important;
            margin: 8px 0 0 !important;
            color: var(--dcuf-write-fg-sub) !important;
        }
        body.is-write-page form#write .btn_bottom_box,
        body.is-write-page form#write .btm-btns-box,
        body.is-write-page form#write > .btn_box.write {
            display: flex !important;
            align-items: stretch !important;
            gap: 8px !important;
            width: 100% !important;
            min-width: 0 !important;
            margin: 10px 0 0 !important;
            padding: 10px 0 0 !important;
            border-top: 1px solid var(--dcuf-write-border) !important;
            background: var(--dcuf-write-surface) !important;
        }
        body.is-write-page form#write .btn_bottom_box > *,
        body.is-write-page form#write .btm-btns-box > *,
        body.is-write-page form#write .btm-btns-box > .fr,
        body.is-write-page form#write > .btn_box.write > button {
            flex: 1 1 0 !important;
            min-width: 0 !important;
            float: none !important;
        }
        body.is-write-page form#write .btn_bottom_box a,
        body.is-write-page form#write .btn_bottom_box button,
        body.is-write-page form#write .btm-btns-box button,
        body.is-write-page form#write > .btn_box.write > button {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 100% !important;
            min-width: 0 !important;
            min-height: 46px !important;
            padding: 0 12px !important;
            border: 1px solid var(--dcuf-write-border-strong) !important;
            border-radius: 9px !important;
            background: var(--dcuf-write-surface-muted) !important;
            color: var(--dcuf-write-fg) !important;
            font-size: 16px !important;
            font-weight: 700 !important;
            line-height: 1.2 !important;
            text-align: center !important;
            text-decoration: none !important;
        }
        body.is-write-page form#write .btn_bottom_box .btn_blue,
        body.is-write-page form#write .btm-btns-box .btn-line-blue,
        body.is-write-page form#write > .btn_box.write > .btn_blue {
            border-color: var(--dcuf-write-accent-strong) !important;
            background: linear-gradient(180deg, #426fe4 0%, var(--dcuf-write-accent-strong) 100%) !important;
            color: #fff !important;
        }
        /* Visual refinement: match the mobile list/article card language. */
        body.is-write-page form#write {
            border-color: #dbe6f3 !important;
            border-radius: 16px !important;
            box-shadow: 0 12px 30px rgba(25, 50, 92, 0.1) !important;
        }
        body.is-write-page form#write #subject,
        body.is-write-page form#write #name,
        body.is-write-page form#write #password,
        body.is-write-page form#write #code {
            border-color: #cfdbeb !important;
            border-radius: 11px !important;
            background: #fff !important;
            box-shadow: 0 2px 7px rgba(25, 50, 92, 0.04) !important;
        }
        body.is-write-page form#write .dcuf-write-captcha-image,
        body.is-write-page form#write .captcha {
            border-color: #cfdbeb !important;
            background: #fff !important;
            box-shadow: 0 2px 7px rgba(25, 50, 92, 0.04) !important;
        }
        body.is-write-page form#write .dcuf-write-captcha-image img,
        body.is-write-page form#write .captcha img,
        body.is-write-page form#write .captcha .fixture-captcha-image {
            background: #fff !important;
        }
        body.is-write-page form#write .write_subject {
            min-height: 52px !important;
            padding: 7px 9px !important;
            border-color: #d7e2f0 !important;
            border-radius: 13px !important;
            background: #fff !important;
            box-shadow: 0 3px 10px rgba(25, 50, 92, 0.05) !important;
        }
        body.is-write-page form#write .write_subject > .tit,
        body.is-write-page form#write .write_subject > .tit::before,
        body.is-write-page form#write .write_subject > .tit::after {
            min-height: 38px !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            content: none !important;
        }
        body.is-write-page form#write .write_subject::before,
        body.is-write-page form#write .write_subject::after {
            display: none !important;
            content: none !important;
        }
        body.is-write-page form#write .write_subject > .dcuf-write-headtext-label {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            align-self: center !important;
            min-width: 58px !important;
            min-height: 36px !important;
            margin: 0 4px 0 0 !important;
            padding: 0 12px !important;
            border: 0 !important;
            border-radius: 9px !important;
            background: #eef2f7 !important;
            color: #4d5e76 !important;
            box-shadow: none !important;
            line-height: 1 !important;
        }
        body.is-write-page form#write .write_subject .subject_list > li {
            border: 1px solid transparent !important;
            background: transparent !important;
            color: var(--dcuf-write-fg-sub) !important;
        }
        body.is-write-page form#write .write_subject .subject_list > li.sel,
        body.is-write-page form#write .write_subject .subject_list > li.active {
            border-color: var(--dcuf-write-accent-strong) !important;
            background: var(--dcuf-write-accent-strong) !important;
            color: #fff !important;
            box-shadow: 0 4px 10px rgba(36, 91, 218, 0.2) !important;
        }
        body.is-write-page form#write .editor_wrap,
        body.is-write-page form#write .note-editor {
            border-color: #d4e0ef !important;
            border-radius: 14px !important;
            box-shadow: 0 5px 16px rgba(25, 50, 92, 0.06) !important;
        }
        body.is-write-page form#write .note-toolbar-media,
        body.is-write-page form#write .note-toolbar,
        body.is-write-page form#write .tx-toolbar-basic,
        body.is-write-page form#write .btns-box {
            border-bottom: 1px solid #dce6f2 !important;
            background: linear-gradient(180deg, #fbfdff 0%, #f5f9ff 100%) !important;
        }
        body.is-write-page form#write .note-toolbar > .note-btn-group,
        body.is-write-page form#write .note-toolbar > .note-btn-group > .note-btn-group,
        body.is-write-page form#write .note-toolbar > .note-mybutton {
            position: relative !important;
            float: none !important;
            width: auto !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        body.is-write-page form#write .note-toolbar > .note-btn-group::before,
        body.is-write-page form#write .note-toolbar > .note-btn-group::after,
        body.is-write-page form#write .note-toolbar > .note-btn-group > .note-btn-group::before,
        body.is-write-page form#write .note-toolbar > .note-btn-group > .note-btn-group::after,
        body.is-write-page form#write .note-toolbar > .note-mybutton::before,
        body.is-write-page form#write .note-toolbar > .note-mybutton::after {
            display: none !important;
            content: none !important;
            border: 0 !important;
        }
        body.is-write-page form#write .note-toolbar .fixture-html-group,
        body.is-write-page form#write .note-toolbar .note-btn-group:has(#chk_html) {
            order: 99 !important;
            margin-left: auto !important;
        }
        body.is-write-page form#write .note-toolbar-media .fixture-html-group,
        body.is-write-page form#write .note-toolbar .note-btn-group:has(#chk_html) {
            display: inline-flex !important;
            align-items: center !important;
            align-self: center !important;
            position: relative !important;
            inset: auto !important;
            width: auto !important;
            height: auto !important;
            min-width: 0 !important;
            min-height: 0 !important;
            margin: 0 0 0 auto !important;
            padding: 0 !important;
            float: none !important;
            transform: none !important;
        }
        body.is-write-page form#write .note-toolbar-media .fixture-html-group > .note-btn,
        body.is-write-page form#write .note-toolbar .note-btn-group:has(#chk_html) > .note-btn {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            position: static !important;
            inset: auto !important;
            width: auto !important;
            height: 38px !important;
            min-width: 70px !important;
            min-height: 38px !important;
            margin: 0 !important;
            padding: 0 10px !important;
            float: none !important;
            transform: none !important;
            overflow: visible !important;
        }
        body.is-write-page form#write .note-toolbar-media .fixture-html-group label,
        body.is-write-page form#write .note-toolbar .note-btn-group:has(#chk_html) label {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            position: static !important;
            inset: auto !important;
            width: auto !important;
            height: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            float: none !important;
            transform: none !important;
            white-space: nowrap !important;
            line-height: 1 !important;
        }
        body.is-write-page form#write #chk_html {
            appearance: auto !important;
            display: inline-block !important;
            position: static !important;
            inset: auto !important;
            width: 16px !important;
            height: 16px !important;
            min-width: 16px !important;
            min-height: 16px !important;
            margin: 0 6px 0 0 !important;
            padding: 0 !important;
            clip: auto !important;
            clip-path: none !important;
            opacity: 1 !important;
            float: none !important;
            transform: none !important;
            pointer-events: auto !important;
            vertical-align: middle !important;
        }
        body.is-write-page form#write .note-toolbar > .note-btn,
        body.is-write-page form#write .note-toolbar .note-btn-group > .note-btn:not(.pop_wrap *):not(.note-dropdown-menu *):not(.note-popover *):not(.note-modal *),
        body.is-write-page form#write .note-toolbar-media > .note-btn,
        body.is-write-page form#write .btns-box button:not(.pop_wrap *):not(.note-dropdown-menu *):not(.note-popover *):not(.note-modal *) {
            border-color: #d4e0ef !important;
            border-radius: 10px !important;
            background: #fff !important;
            box-shadow: 0 2px 6px rgba(25, 50, 92, 0.05) !important;
        }
        body.is-write-page form#write .note-statusbar {
            background: #f7faff !important;
        }
        body.is-write-page form#write .btn_bottom_box,
        body.is-write-page form#write .btm-btns-box {
            position: static !important;
        }
        body.is-write-page form#write > .btn_box.write {
            position: relative !important;
        }
        body.is-write-page form#write .btn_bottom_box,
        body.is-write-page form#write .btm-btns-box,
        body.is-write-page form#write > .btn_box.write {
            clear: both !important;
            float: none !important;
            transform: none !important;
            gap: 10px !important;
            margin: 12px 0 0 !important;
            padding: 10px !important;
            border: 1px solid #dbe6f3 !important;
            border-radius: 14px !important;
            background: linear-gradient(180deg, #f8fbff 0%, #f3f7fd 100%) !important;
            box-shadow: 0 4px 12px rgba(25, 50, 92, 0.06) !important;
        }
        body.is-write-page form#write .btn_bottom_box a,
        body.is-write-page form#write .btn_bottom_box button,
        body.is-write-page form#write .btm-btns-box button,
        body.is-write-page form#write > .btn_box.write > button {
            min-height: 48px !important;
            border-radius: 12px !important;
            box-shadow: 0 3px 8px rgba(25, 50, 92, 0.06) !important;
        }
        body.is-write-page form#write .btn_bottom_box .btn_lightred,
        body.is-write-page form#write .btm-btns-box .btn-line-gray,
        body.is-write-page form#write > .btn_box.write > .btn_grey {
            border-color: #cbd8e9 !important;
            background: #fff !important;
            color: #42536d !important;
        }
        body.is-write-page form#write .btn_bottom_box .btn_blue,
        body.is-write-page form#write .btm-btns-box .btn-line-blue,
        body.is-write-page form#write > .btn_box.write > .btn_blue {
            border-color: var(--dcuf-write-accent-strong) !important;
            background: linear-gradient(180deg, #426fe4 0%, #245bda 100%) !important;
            color: #fff !important;
            box-shadow: 0 6px 14px rgba(36, 91, 218, 0.24) !important;
        }
        body.is-write-page > #leave_confirm_box.dcuf-write-leave-confirm {
            box-sizing: border-box !important;
            position: fixed !important;
            inset: 50% auto auto 50% !important;
            width: min(420px, calc(100vw - 32px)) !important;
            min-width: 0 !important;
            max-width: calc(100vw - 32px) !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: calc(100dvh - 32px) !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 1px solid var(--dcuf-write-border-strong) !important;
            border-radius: 16px !important;
            background: var(--dcuf-write-surface) !important;
            color: var(--dcuf-write-fg) !important;
            transform: translate(-50%, -50%) !important;
            overflow: hidden auto !important;
            z-index: 2147483646 !important;
            box-shadow: 0 20px 54px rgba(15, 28, 52, 0.28), 0 0 0 100vmax rgba(15, 23, 42, 0.28) !important;
            isolation: isolate !important;
            pointer-events: auto !important;
            animation: none !important;
            transition: none !important;
        }
        body.is-write-page > #leave_confirm_box.dcuf-write-leave-confirm .pop_content.write_ly {
            box-sizing: border-box !important;
            position: relative !important;
            width: 100% !important;
            min-width: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            background: var(--dcuf-write-surface) !important;
            color: var(--dcuf-write-fg) !important;
        }
        body.is-write-page > #leave_confirm_box.dcuf-write-leave-confirm .pop_head.bg {
            box-sizing: border-box !important;
            display: flex !important;
            align-items: center !important;
            width: 100% !important;
            height: 52px !important;
            margin: 0 !important;
            padding: 0 56px 0 18px !important;
            border: 0 !important;
            border-radius: 15px 15px 0 0 !important;
            background: linear-gradient(135deg, #3f6de0 0%, #2d57bd 100%) !important;
        }
        body.is-write-page > #leave_confirm_box.dcuf-write-leave-confirm .pop_head.bg h3 {
            margin: 0 !important;
            padding: 0 !important;
            color: #fff !important;
            font-size: 17px !important;
            font-weight: 700 !important;
            line-height: 1.2 !important;
        }
        body.is-write-page > #leave_confirm_box.dcuf-write-leave-confirm .write_cont {
            box-sizing: border-box !important;
            width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 28px 24px 24px !important;
            background: var(--dcuf-write-surface) !important;
            color: var(--dcuf-write-fg) !important;
            text-align: center !important;
        }
        body.is-write-page > #leave_confirm_box.dcuf-write-leave-confirm .write_cont > .txt {
            margin: 0 !important;
            padding: 0 !important;
            color: var(--dcuf-write-fg) !important;
            font-size: 16px !important;
            font-weight: 600 !important;
            line-height: 1.5 !important;
        }
        body.is-write-page > #leave_confirm_box.dcuf-write-leave-confirm .write_cont > .btn_box {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            position: static !important;
            width: 100% !important;
            height: auto !important;
            margin: 20px 0 0 !important;
            padding: 0 !important;
            gap: 10px !important;
            float: none !important;
        }
        body.is-write-page > #leave_confirm_box.dcuf-write-leave-confirm .write_cont > .btn_box > button {
            box-sizing: border-box !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex: 1 1 0 !important;
            width: auto !important;
            max-width: 132px !important;
            min-width: 0 !important;
            min-height: 44px !important;
            margin: 0 !important;
            padding: 0 16px !important;
            border: 1px solid var(--dcuf-write-border-strong) !important;
            border-radius: 10px !important;
            background: var(--dcuf-write-surface-muted) !important;
            color: var(--dcuf-write-fg) !important;
            font-size: 15px !important;
            font-weight: 700 !important;
            line-height: 1 !important;
            box-shadow: none !important;
            cursor: pointer !important;
        }
        body.is-write-page > #leave_confirm_box.dcuf-write-leave-confirm .write_cont > .btn_box > .btn_blue {
            border-color: var(--dcuf-write-accent-strong) !important;
            background: linear-gradient(180deg, #426fe4 0%, #245bda 100%) !important;
            color: #fff !important;
            box-shadow: 0 6px 14px rgba(36, 91, 218, 0.22) !important;
        }
        body.is-write-page > #leave_confirm_box.dcuf-write-leave-confirm .pop_content.write_ly > .poply_whiteclose {
            box-sizing: border-box !important;
            position: absolute !important;
            inset: 0 0 auto auto !important;
            width: 52px !important;
            min-width: 52px !important;
            height: 52px !important;
            min-height: 52px !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 15px 0 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            cursor: pointer !important;
        }
        body.is-write-page > #leave_confirm_box.dcuf-write-leave-confirm .pop_content.write_ly > .poply_whiteclose::before,
        body.is-write-page > #leave_confirm_box.dcuf-write-leave-confirm .pop_content.write_ly > .poply_whiteclose::after {
            content: '' !important;
            position: absolute !important;
            top: 25px !important;
            left: 15px !important;
            width: 22px !important;
            height: 1px !important;
            border: 0 !important;
            background: #fff !important;
            transform: rotate(45deg) !important;
        }
        body.is-write-page > #leave_confirm_box.dcuf-write-leave-confirm .pop_content.write_ly > .poply_whiteclose::after {
            transform: rotate(-45deg) !important;
        }
        body.is-write-page > #leave_confirm_box.dcuf-write-leave-confirm .pop_content.write_ly > .poply_whiteclose > em {
            display: none !important;
        }
        body.is-write-page.dc-filter-dark-mode > #leave_confirm_box.dcuf-write-leave-confirm {
            border-color: var(--dcuf-write-border) !important;
            background: var(--dcuf-write-surface) !important;
            box-shadow: 0 22px 58px rgba(0, 0, 0, 0.48), 0 0 0 100vmax rgba(0, 0, 0, 0.52) !important;
        }
        body.is-write-page.dc-filter-dark-mode > #leave_confirm_box.dcuf-write-leave-confirm .write_cont > .btn_box > button:not(.btn_blue) {
            border-color: #40526b !important;
            background: #233044 !important;
            color: #edf3ff !important;
        }
        @media screen and (max-width: 480px) {
            body.is-write-page > #leave_confirm_box.dcuf-write-leave-confirm {
                width: calc(100vw - 24px) !important;
                max-width: calc(100vw - 24px) !important;
                border-radius: 14px !important;
            }
            body.is-write-page > #leave_confirm_box.dcuf-write-leave-confirm .pop_head.bg {
                height: 48px !important;
                padding: 0 52px 0 16px !important;
                border-radius: 13px 13px 0 0 !important;
            }
            body.is-write-page > #leave_confirm_box.dcuf-write-leave-confirm .write_cont {
                padding: 24px 16px 18px !important;
            }
            body.is-write-page > #leave_confirm_box.dcuf-write-leave-confirm .write_cont > .btn_box {
                margin-top: 18px !important;
            }
            body.is-write-page > #leave_confirm_box.dcuf-write-leave-confirm .pop_content.write_ly > .poply_whiteclose {
                width: 48px !important;
                min-width: 48px !important;
                height: 48px !important;
                min-height: 48px !important;
                border-radius: 0 13px 0 0 !important;
            }
            body.is-write-page > #leave_confirm_box.dcuf-write-leave-confirm .pop_content.write_ly > .poply_whiteclose::before,
            body.is-write-page > #leave_confirm_box.dcuf-write-leave-confirm .pop_content.write_ly > .poply_whiteclose::after {
                top: 23px !important;
                left: 14px !important;
                width: 20px !important;
            }
        }
        body.is-write-page.dc-filter-dark-mode form#write,
        body.is-write-page.dc-filter-dark-mode form#write .write_subject,
        body.is-write-page.dc-filter-dark-mode form#write .dcuf-write-captcha-image,
        body.is-write-page.dc-filter-dark-mode form#write .captcha,
        body.is-write-page.dc-filter-dark-mode form#write #subject,
        body.is-write-page.dc-filter-dark-mode form#write #name,
        body.is-write-page.dc-filter-dark-mode form#write #password,
        body.is-write-page.dc-filter-dark-mode form#write #code {
            border-color: var(--dcuf-write-border) !important;
            background: var(--dcuf-write-surface) !important;
        }
        body.is-write-page.dc-filter-dark-mode form#write .note-toolbar,
        body.is-write-page.dc-filter-dark-mode form#write .note-toolbar-media,
        body.is-write-page.dc-filter-dark-mode form#write .tx-toolbar-basic,
        body.is-write-page.dc-filter-dark-mode form#write .btns-box,
        body.is-write-page.dc-filter-dark-mode form#write .btn_bottom_box,
        body.is-write-page.dc-filter-dark-mode form#write .btm-btns-box,
        body.is-write-page.dc-filter-dark-mode form#write > .btn_box.write {
            border-color: var(--dcuf-write-border) !important;
            background: var(--dcuf-write-surface-muted) !important;
        }
        body.is-write-page.dc-filter-dark-mode form#write .write_subject > .dcuf-write-headtext-label {
            background: #273446 !important;
            color: #d2dced !important;
        }
        body.is-write-page.dc-filter-dark-mode form#write .note-toolbar > .note-btn,
        body.is-write-page.dc-filter-dark-mode form#write .note-toolbar .note-btn-group > .note-btn:not(.pop_wrap *):not(.note-dropdown-menu *):not(.note-popover *):not(.note-modal *),
        body.is-write-page.dc-filter-dark-mode form#write .note-toolbar-media > .note-btn,
        body.is-write-page.dc-filter-dark-mode form#write .btns-box button:not(.pop_wrap *):not(.note-dropdown-menu *):not(.note-popover *):not(.note-modal *),
        body.is-write-page.dc-filter-dark-mode form#write select:not(.pop_wrap *):not(.note-dropdown-menu *):not(.note-popover *):not(.note-modal *) {
            border-color: #40526b !important;
            background: #233044 !important;
            color: #edf3ff !important;
            -webkit-text-fill-color: #edf3ff !important;
            box-shadow: 0 2px 7px rgba(0, 0, 0, 0.2) !important;
            opacity: 1 !important;
        }
        body.is-write-page.dc-filter-dark-mode form#write .note-toolbar > .note-btn *,
        body.is-write-page.dc-filter-dark-mode form#write .note-toolbar .note-btn-group > .note-btn:not(.pop_wrap *):not(.note-dropdown-menu *):not(.note-popover *):not(.note-modal *) *,
        body.is-write-page.dc-filter-dark-mode form#write .note-toolbar-media > .note-btn *,
        body.is-write-page.dc-filter-dark-mode form#write .btns-box button:not(.pop_wrap *):not(.note-dropdown-menu *):not(.note-popover *):not(.note-modal *) * {
            color: inherit !important;
            -webkit-text-fill-color: inherit !important;
            opacity: 1 !important;
        }
        body.is-write-page.dc-filter-dark-mode form#write .write_subject .subject_list > li:not(.sel):not(.active) {
            color: #d2dced !important;
            -webkit-text-fill-color: #d2dced !important;
        }
        body.is-write-page.dc-filter-dark-mode form#write #chk_html {
            accent-color: var(--dcuf-write-accent-strong) !important;
        }
        body.is-write-page form#write .tx-toolbar-advanced,
        body.is-write-page form#write .write_infobox,
        body.is-write-page form#write .file_upload_info,
        body.is-write-page form#write .cm_ad,
        body.is-write-page form#write .adv_bottom_write,
        body.is-write-page form#write div[id^="kakao_ad_"] {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            visibility: hidden !important;
        }
        @media screen and (max-width: 480px) {
            body.is-write-page #container {
                padding: 6px !important;
            }
            body.is-write-page form#write {
                padding: 10px !important;
                border-radius: 11px !important;
            }
            body.is-write-page form#write .dcuf-write-subject-row {
                grid-template-columns: 50px minmax(0, 1fr);
                gap: 6px;
            }
        }
        @media screen and (min-width: 900px) {
            body.is-write-page #container {
                padding: 16px 24px !important;
            }
            body.is-write-page form#write {
                padding: 18px !important;
            }
            body.is-write-page form#write .dcuf-write-fields {
                grid-template-columns: repeat(4, minmax(0, 1fr));
            }
            body.is-write-page form#write .dcuf-write-fields > .write_subject,
            body.is-write-page form#write .dcuf-write-subject-field,
            body.is-write-page form#write .dcuf-write-fields > [style*="clear"] {
                grid-column: 1 / -1;
            }
        }
    `;

    const injectWriteStyle = () => {
        if (document.getElementById(STYLE_ID)) return true;
        const target = document.head || document.documentElement;
        if (!target) return false;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;
        target.appendChild(style);
        return true;
    };

    if (!injectWriteStyle()) {
        document.addEventListener('DOMContentLoaded', injectWriteStyle, { once: true });
    }
})();

(() => {
    if (!__dcufPageSupports('view')) return;

    const FORM_SELECTOR = '.view_comment.image_comment .cmt_write_box';
    const VISIBLE_INPUT_SELECTOR = 'input[id^="img_cmt_name_"]';
    const CANONICAL_PREFIX = 'all_nick_name_';
    const BOUND_ATTR = 'data-dcuf-image-comment-sync-bound';
    const PROXY_ATTR = 'data-dcuf-image-nick-proxied';
    const SUBMIT_NAME_ATTR = 'data-dcuf-image-submit-name';
    const pendingForms = new Set();
    const nativeValueDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

    const resolveVisibleInput = (form, suffix) => {
        if (!(form instanceof HTMLElement) || !suffix) return null;
        const input = form.querySelector(`#img_cmt_name_${suffix}`);
        return input instanceof HTMLInputElement ? input : null;
    };

    const getCanonicalInputs = (form, suffix) => {
        if (!(form instanceof HTMLElement) || !suffix) return [];
        const seen = new Set();
        const results = [];
        const push = (candidate) => {
            if (!(candidate instanceof HTMLInputElement) || seen.has(candidate)) return;
            seen.add(candidate);
            results.push(candidate);
        };

        push(form.querySelector(`#${CANONICAL_PREFIX}${suffix}`));
        push(document.getElementById(`${CANONICAL_PREFIX}${suffix}`));
        form.querySelectorAll('input[name="gall_nick_name"]').forEach(push);
        form.querySelectorAll(`input[id$="${suffix}"][readonly]`).forEach(push);
        return results;
    };

    const ensureSubmitNameInput = (form) => {
        if (!(form instanceof HTMLElement)) return null;
        let input = form.querySelector(`input[name="name"][${SUBMIT_NAME_ATTR}="1"]`);
        if (!(input instanceof HTMLInputElement)) {
            input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'name';
            input.setAttribute(SUBMIT_NAME_ATTR, '1');
            form.appendChild(input);
        }
        return input;
    };

    const readImageCommentNickname = (formOrImageNo) => {
        const form = typeof formOrImageNo === 'string' || typeof formOrImageNo === 'number'
            ? document.getElementById(`img_cmt_write_box_${formOrImageNo}`)
            : formOrImageNo;
        if (!(form instanceof HTMLElement)) return '';

        const visibleInput = form.querySelector(VISIBLE_INPUT_SELECTOR);
        if (visibleInput instanceof HTMLInputElement && visibleInput.value) {
            return visibleInput.value;
        }

        const gallNickInput = form.querySelector('input[name="gall_nick_name"]');
        if (gallNickInput instanceof HTMLInputElement && gallNickInput.value) {
            return gallNickInput.value;
        }

        return '';
    };

    const ensureCanonicalNicknameProxy = (form, suffix, canonicalInput) => {
        if (!(form instanceof HTMLElement) || !(canonicalInput instanceof HTMLInputElement) || !nativeValueDescriptor) return;
        if (canonicalInput.getAttribute(PROXY_ATTR) === '1') return;

        Object.defineProperty(canonicalInput, 'value', {
            configurable: true,
            enumerable: nativeValueDescriptor.enumerable,
            get() {
                const visibleInput = resolveVisibleInput(form, suffix);
                if (visibleInput instanceof HTMLInputElement) {
                    return visibleInput.value || '';
                }
                return nativeValueDescriptor.get.call(this);
            },
            set(nextValue) {
                const normalizedValue = typeof nextValue === 'string' ? nextValue : `${nextValue ?? ''}`;
                nativeValueDescriptor.set.call(this, normalizedValue);
                this.setAttribute('value', normalizedValue);
            }
        });

        canonicalInput.setAttribute(PROXY_ATTR, '1');
    };

    const syncImageCommentNickname = (form) => {
        if (!(form instanceof HTMLElement)) return;

        form.querySelectorAll(VISIBLE_INPUT_SELECTOR).forEach((visibleInput) => {
            if (!(visibleInput instanceof HTMLInputElement)) return;
            const suffixMatch = (visibleInput.id || '').match(/^img_cmt_name_(\d+)$/);
            if (!suffixMatch) return;

            const nextValue = visibleInput.value || '';
            getCanonicalInputs(form, suffixMatch[1]).forEach((canonicalInput) => {
                ensureCanonicalNicknameProxy(form, suffixMatch[1], canonicalInput);
                if (!(canonicalInput instanceof HTMLInputElement)) return;
                if (nativeValueDescriptor) {
                    nativeValueDescriptor.set.call(canonicalInput, nextValue);
                } else {
                    canonicalInput.value = nextValue;
                }
                canonicalInput.defaultValue = nextValue;
                canonicalInput.setAttribute('value', nextValue);
                canonicalInput.dispatchEvent(new Event('input', { bubbles: true }));
                canonicalInput.dispatchEvent(new Event('change', { bubbles: true }));
            });

            const submitNameInput = ensureSubmitNameInput(form);
            if (submitNameInput instanceof HTMLInputElement) {
                submitNameInput.value = nextValue;
                submitNameInput.defaultValue = nextValue;
                submitNameInput.setAttribute('value', nextValue);
            }
        });
    };

    const bindImageCommentNicknameForm = (form) => {
        if (!(form instanceof HTMLElement)) return;

        form.querySelectorAll('input[name="gall_nick_name"], input[readonly][id^="gall_nick_name_"]').forEach((input) => {
            if (!(input instanceof HTMLInputElement)) return;
            input.style.setProperty('display', 'none', 'important');
            input.style.setProperty('width', '0', 'important');
            input.style.setProperty('height', '0', 'important');
            input.style.setProperty('padding', '0', 'important');
            input.style.setProperty('margin', '0', 'important');
            input.setAttribute('tabindex', '-1');
            input.setAttribute('aria-hidden', 'true');
        });

        const scheduleSync = ({ immediate = false } = {}) => {
            if (immediate) syncImageCommentNickname(form);
            requestAnimationFrame(() => syncImageCommentNickname(form));
            window.setTimeout(() => syncImageCommentNickname(form), 0);
        };

        if (form.getAttribute(BOUND_ATTR) !== '1') {
            form.setAttribute(BOUND_ATTR, '1');

            form.addEventListener('input', (event) => {
                if (event.target instanceof Element && event.target.matches(VISIBLE_INPUT_SELECTOR)) scheduleSync();
            }, true);
            form.addEventListener('change', (event) => {
                if (event.target instanceof Element && event.target.matches(VISIBLE_INPUT_SELECTOR)) scheduleSync();
            }, true);
            form.addEventListener('keydown', (event) => {
                if (!(event.target instanceof Element) || !event.target.matches(VISIBLE_INPUT_SELECTOR)) return;
                if (event.key === 'Enter') scheduleSync({ immediate: true });
            }, true);
            form.addEventListener('click', (event) => {
                const trigger = event.target instanceof Element
                    ? event.target.closest('button, input[type="submit"], input[type="button"]')
                    : null;
                if (trigger) scheduleSync({ immediate: true });
            }, true);
            form.addEventListener('submit', () => scheduleSync({ immediate: true }), true);
        }

        scheduleSync();
    };

    const collectImageCommentForms = (elements = null, { forceFullPass = false } = {}) => {
        if (forceFullPass || !elements || typeof elements[Symbol.iterator] !== 'function') {
            document.querySelectorAll(FORM_SELECTOR).forEach((form) => {
                if (form instanceof HTMLElement) pendingForms.add(form);
            });
            return;
        }

        Array.from(elements).forEach((element) => {
            if (!(element instanceof Element)) return;
            const form = element.matches(FORM_SELECTOR)
                ? element
                : element.closest(FORM_SELECTOR);
            if (form instanceof HTMLElement) pendingForms.add(form);
        });
    };

    const imageCommentNicknameScheduler = __dcufCreatePhaseScheduler('image-comment-nick-sync', () => {
        const forms = pendingForms.size > 0
            ? Array.from(pendingForms)
            : Array.from(document.querySelectorAll(FORM_SELECTOR));
        pendingForms.clear();
        forms.forEach((form) => bindImageCommentNicknameForm(form));
    }, [90]);

    const scheduleImageCommentNicknameSync = (elements = null, { forceFullPass = false } = {}) => {
        collectImageCommentForms(elements, { forceFullPass });
        imageCommentNicknameScheduler.schedule();
    };

    const observeImageCommentNicknameTargets = () => {
        if (window.__dcufImageCommentNickMutationUnsubscribe || window.__dcufImageCommentNickObserver) return;

        const unsubscribe = __dcufSubscribeMutationBus('image-comment-nick-sync', (payload) => {
            const relevantNodes = __dcufCollectMatches(
                payload,
                '.view_comment.image_comment, .view_comment.image_comment .cmt_write_box, .view_comment.image_comment input[id^="img_cmt_name_"], .view_comment.image_comment input[id^="all_nick_name_"]',
                { includeRoots: true }
            );
            if (relevantNodes.length > 0) {
                scheduleImageCommentNicknameSync(relevantNodes);
            }
        });
        if (typeof unsubscribe === 'function') {
            window.__dcufImageCommentNickMutationUnsubscribe = unsubscribe;
            return;
        }

        if (!document.body) return;
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                scheduleImageCommentNicknameSync([mutation.target, ...Array.from(mutation.addedNodes || [])]);
            });
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['value', 'style', 'class']
        });
        window.__dcufImageCommentNickObserver = observer;
    };

    const hookImageNicknameHelpers = () => {
        const helperNames = ['use_gall_nick_name_img', 'show_gall_nick_use_btn_img'];
        helperNames.forEach((helperName) => {
            const original = window[helperName];
            if (typeof original !== 'function' || original.__dcufWrapped === true) return;
            const wrapped = function (...args) {
                const result = original.apply(this, args);
                scheduleImageCommentNicknameSync(null, { forceFullPass: true });
                return result;
            };
            wrapped.__dcufWrapped = true;
            window[helperName] = wrapped;
        });
    };

    const patchImageCommentRequestBody = (body, requestUrl) => {
        if (typeof requestUrl !== 'string' || requestUrl.indexOf('image_comment_submit') === -1 || !body) {
            return body;
        }

        const applyNickname = (paramsLike, imageNo, setValue) => {
            const nickname = readImageCommentNickname(imageNo);
            if (!nickname) return;
            setValue(paramsLike, 'name', nickname);
            setValue(paramsLike, 'gall_nick_name', nickname);
            setValue(paramsLike, 'use_gall_nick', 'N');
        };

        if (body instanceof FormData) {
            const imageNo = body.get('image_no');
            applyNickname(body, imageNo, (target, key, value) => target.set(key, value));
            return body;
        }

        if (body instanceof URLSearchParams) {
            const imageNo = body.get('image_no');
            applyNickname(body, imageNo, (target, key, value) => target.set(key, value));
            return body;
        }

        if (typeof body === 'string') {
            const params = new URLSearchParams(body);
            const imageNo = params.get('image_no');
            applyNickname(params, imageNo, (target, key, value) => target.set(key, value));
            return params.toString();
        }

        return body;
    };

    const installImageCommentRequestPatch = () => {
        if (window.__dcufImageCommentRequestPatched) return;
        window.__dcufImageCommentRequestPatched = true;

        const nativeOpen = XMLHttpRequest.prototype.open;
        const nativeSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (method, url, ...rest) {
            this.__dcufImageCommentUrl = typeof url === 'string' ? url : `${url ?? ''}`;
            return nativeOpen.call(this, method, url, ...rest);
        };

        XMLHttpRequest.prototype.send = function (body) {
            const patchedBody = patchImageCommentRequestBody(body, this.__dcufImageCommentUrl || '');
            return nativeSend.call(this, patchedBody);
        };

        if (typeof window.fetch === 'function') {
            const nativeFetch = window.fetch.bind(window);
            window.fetch = function (resource, init) {
                const requestUrl = typeof resource === 'string'
                    ? resource
                    : resource instanceof Request
                        ? resource.url
                        : `${resource ?? ''}`;

                if (!init || typeof init !== 'object') {
                    return nativeFetch(resource, init);
                }

                const nextInit = { ...init };
                nextInit.body = patchImageCommentRequestBody(init.body, requestUrl);
                return nativeFetch(resource, nextInit);
            };
        }
    };

    scheduleImageCommentNicknameSync(null, { forceFullPass: true });
    hookImageNicknameHelpers();
    installImageCommentRequestPatch();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            scheduleImageCommentNicknameSync(null, { forceFullPass: true });
            hookImageNicknameHelpers();
            installImageCommentRequestPatch();
            observeImageCommentNicknameTargets();
        }, { once: true });
    } else {
        hookImageNicknameHelpers();
        installImageCommentRequestPatch();
        observeImageCommentNicknameTargets();
    }

    window.addEventListener('load', () => {
        hookImageNicknameHelpers();
        installImageCommentRequestPatch();
        scheduleImageCommentNicknameSync(null, { forceFullPass: true });
    }, { once: true });
})();

(() => {
    if (!__dcufPageSupports('view')) return;

    const pendingImageCommentSections = new Set();
    const imageCommentWidthState = new WeakMap();
    let forceImageCommentWidthFullPass = false;
    const IMAGE_COMMENT_SECTION_SELECTOR = '.view_comment.image_comment';

    const setStyleValueIfChanged = (element, property, value) => {
        if (!(element instanceof HTMLElement)) return;
        if (element.style.getPropertyValue(property) === value) return;
        element.style.setProperty(property, value);
    };
    const removeStyleIfPresent = (element, property) => {
        if (!(element instanceof HTMLElement)) return;
        if (!element.style.getPropertyValue(property) && !element.style.getPropertyPriority(property)) return;
        element.style.removeProperty(property);
    };

    const collectImageCommentSections = (elements = null, { forceFullPass = false } = {}) => {
        if (forceFullPass) forceImageCommentWidthFullPass = true;
        if (!elements || typeof elements[Symbol.iterator] !== 'function') {
            document.querySelectorAll(IMAGE_COMMENT_SECTION_SELECTOR).forEach((section) => {
                if (section instanceof HTMLElement) pendingImageCommentSections.add(section);
            });
            return;
        }

        Array.from(elements).forEach((element) => {
            if (!(element instanceof Element)) return;
            const section = element.matches('.view_comment.image_comment')
                ? element
                : element.closest('.view_comment.image_comment');
            if (section instanceof HTMLElement) pendingImageCommentSections.add(section);
        });
    };

    const buildImageCommentWidthState = (width) => {
        if (width > 80) {
            const widthPx = `${width}px`;
            return {
                mode: 'fixed',
                width: widthPx,
                maxWidth: widthPx,
                marginLeft: '0px',
                marginRight: '0px'
            };
        }

        return {
            mode: 'reset',
            width: '',
            maxWidth: '',
            marginLeft: '',
            marginRight: ''
        };
    };
    const isSameImageCommentWidthState = (prev, next) => {
        if (!prev || !next) return false;
        return prev.mode === next.mode
            && prev.width === next.width
            && prev.maxWidth === next.maxWidth
            && prev.marginLeft === next.marginLeft
            && prev.marginRight === next.marginRight;
    };
    const readImageCommentWidths = (sections) => sections.map((section) => {
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
            return {
                section,
                targets: [imgCommentRoot, section, wrap, box, list],
                nextState: buildImageCommentWidthState(width)
            };
        });

    const writeImageCommentWidths = (measurements) => {
        measurements.forEach(({ section, targets, nextState }) => {
            if (!(section instanceof HTMLElement)) return;
            const previousState = imageCommentWidthState.get(section);
            if (isSameImageCommentWidthState(previousState, nextState)) return;

            if (nextState.mode === 'fixed') {
                targets.forEach((element) => {
                    if (!(element instanceof HTMLElement)) return;
                    setStyleValueIfChanged(element, 'width', nextState.width);
                    setStyleValueIfChanged(element, 'max-width', nextState.maxWidth);
                    setStyleValueIfChanged(element, 'margin-left', nextState.marginLeft);
                    setStyleValueIfChanged(element, 'margin-right', nextState.marginRight);
                });
            } else {
                targets.forEach((element) => {
                    if (!(element instanceof HTMLElement)) return;
                    removeStyleIfPresent(element, 'width');
                    removeStyleIfPresent(element, 'max-width');
                    removeStyleIfPresent(element, 'margin-left');
                    removeStyleIfPresent(element, 'margin-right');
                });
            }

            imageCommentWidthState.set(section, { ...nextState });
        });
    };

    const imageCommentWidthScheduler = __dcufCreatePhaseScheduler('image-comment-width', () => {
        if (pendingImageCommentSections.size === 0) {
            if (!forceImageCommentWidthFullPass) return;
            collectImageCommentSections(null, { forceFullPass: true });
        }
        const sections = Array.from(pendingImageCommentSections);
        pendingImageCommentSections.clear();
        forceImageCommentWidthFullPass = false;
        if (sections.length === 0) return;
        writeImageCommentWidths(readImageCommentWidths(sections));
    });
    const scheduleApplyImageCommentWidths = (elements = null, { forceFullPass = false } = {}) => {
        collectImageCommentSections(elements, { forceFullPass });
        imageCommentWidthScheduler.schedule();
    };

    const observeImageComments = () => {
        if (window.__dcufImageCommentWidthMutationUnsubscribe || window.__dcufImageCommentWidthObserver) return;
        const unsubscribe = __dcufSubscribeMutationBus('image-comment-width', (payload) => {
            const relevantNodes = __dcufCollectMatches(payload, '.view_comment.image_comment, .comment_box.img_comment_box, .img_comment, .writing_view_box img[data-fileno]', { includeRoots: true });
            if (relevantNodes.length > 0) {
                scheduleApplyImageCommentWidths(relevantNodes);
            }
        });
        if (typeof unsubscribe === 'function') {
            window.__dcufImageCommentWidthMutationUnsubscribe = unsubscribe;
            return;
        }

        if (!document.body) return;
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if ((mutation.addedNodes && mutation.addedNodes.length > 0) || mutation.type === 'attributes') {
                    scheduleApplyImageCommentWidths([mutation.target, ...Array.from(mutation.addedNodes || [])]);
                    break;
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'style', 'class'] });
        window.__dcufImageCommentWidthObserver = observer;
    };

    scheduleApplyImageCommentWidths(null, { forceFullPass: true });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            scheduleApplyImageCommentWidths(null, { forceFullPass: true });
            observeImageComments();
        }, { once: true });
    } else {
        observeImageComments();
    }

    window.addEventListener('load', () => scheduleApplyImageCommentWidths(null, { forceFullPass: true }), { once: true });
    window.addEventListener('resize', () => scheduleApplyImageCommentWidths(null, { forceFullPass: true }));
})();


(() => {
    if (!__dcufPageSupports('view')) return;

    const ACTIVE_ATTR = 'data-dcuf-userpopup-active';
    const ACTIVE_INFO_ATTR = 'data-dcuf-userpopup-info-active';
    const ACTIVE_LAYER_ATTR = 'data-dcuf-userpopup-layer-active';
    const ORIG_Z = 'data-dcuf-userpopup-orig-z';
    const ORIG_POS = 'data-dcuf-userpopup-orig-pos';
    const ORIG_OV = 'data-dcuf-userpopup-orig-ov';
    const ORIG_LEFT = 'data-dcuf-userpopup-orig-left';
    const ORIG_TOP = 'data-dcuf-userpopup-orig-top';
    const ORIG_RIGHT = 'data-dcuf-userpopup-orig-right';
    const ORIG_BOTTOM = 'data-dcuf-userpopup-orig-bottom';
    const ORIG_WIDTH = 'data-dcuf-userpopup-orig-width';
    const ORIG_MIN_WIDTH = 'data-dcuf-userpopup-orig-min-width';
    const ORIG_MAX_WIDTH = 'data-dcuf-userpopup-orig-max-width';
    const ORIG_DISPLAY = 'data-dcuf-userpopup-orig-display';
    const ORIG_MARGIN = 'data-dcuf-userpopup-orig-margin';
    const LAYER_DX = 'data-dcuf-userpopup-layer-dx';
    const LAYER_DY = 'data-dcuf-userpopup-layer-dy';
    const NONE = '__none__';
    const POPUP_CONTEXT_SELECTOR = '#focus_cmt, div[id^="comment_wrap_"], .view_comment.image_comment';
    const ACTIVE_POPUP_SELECTOR = [
        '#focus_cmt #user_data_lyr',
        '#focus_cmt .user_data',
        '#focus_cmt .user_data_add',
        '#focus_cmt .user_data_add .user_data_list',
        '#focus_cmt ul.user_data_list',
        '#focus_cmt #dccon_guide_lyr',
        '#focus_cmt .pop_wrap.type2',
        '#focus_cmt .pop_wrap.type3',
        'div[id^="comment_wrap_"] #user_data_lyr',
        'div[id^="comment_wrap_"] .user_data',
        'div[id^="comment_wrap_"] .user_data_add',
        'div[id^="comment_wrap_"] .user_data_add .user_data_list',
        'div[id^="comment_wrap_"] ul.user_data_list',
        'div[id^="comment_wrap_"] #dccon_guide_lyr',
        'div[id^="comment_wrap_"] .pop_wrap.type2',
        'div[id^="comment_wrap_"] .pop_wrap.type3',
        '.view_comment.image_comment #user_data_lyr',
        '.view_comment.image_comment .user_data',
        '.view_comment.image_comment .user_data_add',
        '.view_comment.image_comment .user_data_add .user_data_list',
        '.view_comment.image_comment ul.user_data_list',
        '.view_comment.image_comment #dccon_guide_lyr',
        '.view_comment.image_comment .pop_wrap.type2',
        '.view_comment.image_comment .pop_wrap.type3',
        '.view_comment.image_comment .comment_box.img_comment_box .cmt_delpw_box',
        '.view_comment.image_comment .comment_box.img_comment_box [id$="_delpw_box"]'
    ].join(', ');
    const COMMENT_LI_SELECTOR = 'li[id^="reply_li_"], li[id^="comment_li_"], li[id^="img_comment_li_"], li[id^="mg_comment_li_"]';
    const IMAGE_COMMENT_LI_SELECTOR = '.view_comment.image_comment .comment_box.img_comment_box .cmt_list > li, .view_comment.image_comment .comment_box.img_comment_box .reply_list > li';
    const IMAGE_COMMENT_DELETE_POPUP_SELECTOR = '.view_comment.image_comment .comment_box.img_comment_box .cmt_delpw_box, .view_comment.image_comment .comment_box.img_comment_box [id$="_delpw_box"]';
    const POPUP_CANDIDATE_SELECTOR = [POPUP_CONTEXT_SELECTOR, ACTIVE_POPUP_SELECTOR, COMMENT_LI_SELECTOR, IMAGE_COMMENT_LI_SELECTOR].join(', ');
    const POPUP_TRIGGER_SELECTOR = [
        '.writer_nikcon',
        '.gall_writer',
        '.nickname',
        '.txt_del',
        '.btn_cmt_delete',
        '.btn_img_cmt_delete',
        '.author',
        '.cmt_mdf_del button'
    ].join(', ');
    const pendingPopupCandidates = new Set();
    const activePopupOwners = new Set();
    const activePopupInfoOwners = new Set();
    const activePopupElements = new Set();
    let forcePopupLayerFullPass = false;
    let lastPopupOwnerStateKey = '';
    let popupStateIdCounter = 1;
    const popupStateIds = new WeakMap();

    const isVisible = (element) => {
        if (!(element instanceof HTMLElement)) return false;
        const cs = window.getComputedStyle(element);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity || '1') === 0) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    };

    const findPopupOwnerLi = (popup) => {
        if (!(popup instanceof HTMLElement)) return null;
        return popup.closest(COMMENT_LI_SELECTOR) || popup.closest(IMAGE_COMMENT_LI_SELECTOR);
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
    const setImportantStyleIfChanged = (element, property, value) => {
        if (!(element instanceof HTMLElement)) return;
        if (element.style.getPropertyValue(property) === value && element.style.getPropertyPriority(property) === 'important') return;
        element.style.setProperty(property, value, 'important');
    };
    const setAttributeIfChanged = (element, name, value) => {
        if (!(element instanceof HTMLElement)) return;
        if (element.getAttribute(name) === value) return;
        element.setAttribute(name, value);
    };
    const replaceElementSet = (targetSet, elements) => {
        targetSet.clear();
        elements.forEach((element) => {
            if (element instanceof Element && element.isConnected) targetSet.add(element);
        });
    };
    const takeConnectedPopupCandidates = () => {
        const candidates = Array.from(pendingPopupCandidates).filter((candidate) => candidate instanceof Element && candidate.isConnected);
        pendingPopupCandidates.clear();
        return candidates;
    };
    const findPopupInfoOwner = (popup) => {
        if (!(popup instanceof HTMLElement)) return null;
        const li = popup.closest(COMMENT_LI_SELECTOR) || popup.closest(IMAGE_COMMENT_LI_SELECTOR);
        if (li instanceof HTMLElement) {
            return li.querySelector('.cmt_nickbox .gall_writer')
                || li.querySelector('.reply_info .gall_writer')
                || li.querySelector('.cmt_info .gall_writer')
                || li.querySelector('.cmt_nickbox .nickname')
                || li.querySelector('.reply_info .nickname')
                || li.querySelector('.cmt_info .nickname')
                || li.querySelector('.cmt_nickbox')
                || li.querySelector('.reply_info')
                || li.querySelector('.cmt_info')
                || li.querySelector('.fr.clear');
        }
        return popup.closest('.gall_writer')
            || popup.closest('.nickname')
            || popup.closest('.cmt_nickbox')
            || popup.closest('.reply_info')
            || popup.closest('.cmt_info')
            || popup.closest('.fr.clear');
    };
    const isViewportLayerPopup = (popup) => popup instanceof HTMLElement
        && popup.matches('#user_data_lyr, .user_data, .user_data_add, .user_data_add .user_data_list, ul.user_data_list');
    const isCommentUserPopup = (popup) => popup instanceof HTMLElement
        && popup.matches('#user_data_lyr, .user_data, .user_data_add, .user_data_add .user_data_list, ul.user_data_list')
        && Boolean(popup.closest('#focus_cmt, div[id^="comment_wrap_"], .view_comment.image_comment'));
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const getPopupElementStateKey = (element) => {
        if (!(element instanceof Element)) return '';
        let stateId = popupStateIds.get(element);
        if (!stateId) {
            stateId = popupStateIdCounter++;
            popupStateIds.set(element, stateId);
        }
        return `${element.id || element.tagName}:${stateId}`;
    };
    const buildPopupOwnerStateKey = (owners) => Array.from(owners)
        .filter((owner) => owner instanceof Element)
        .map((owner) => getPopupElementStateKey(owner))
        .sort()
        .join('|');
    const isPopupOwnerElevationIntact = (li) => li instanceof HTMLElement
        && li.getAttribute(ACTIVE_ATTR) === '1'
        && li.style.getPropertyValue('position') === 'relative'
        && li.style.getPropertyPriority('position') === 'important'
        && li.style.getPropertyValue('z-index') === '2147483646'
        && li.style.getPropertyPriority('z-index') === 'important'
        && li.style.getPropertyValue('overflow') === 'visible'
        && li.style.getPropertyPriority('overflow') === 'important';
    const getActivePopupCandidates = () => ([
        ...Array.from(activePopupElements).filter((element) => element instanceof HTMLElement && element.isConnected && isVisible(element)),
        ...Array.from(activePopupOwners).filter((element) => element instanceof HTMLElement && element.isConnected),
        ...Array.from(activePopupInfoOwners).filter((element) => element instanceof HTMLElement && element.isConnected)
    ]);
    const isRelevantPopupEventTarget = (target) => target instanceof Element
        && Boolean(target.closest(`${POPUP_CANDIDATE_SELECTOR}, ${POPUP_TRIGGER_SELECTOR}, ${ACTIVE_POPUP_SELECTOR}`));

    const elevateLi = (li) => {
        if (!(li instanceof HTMLElement)) return;
        const isFocusGroupParentLi = li.getAttribute('data-dcuf-focus-group-parent') === '1';
        saveStyleIfNeeded(li, ORIG_Z, 'z-index');
        saveStyleIfNeeded(li, ORIG_POS, 'position');
        saveStyleIfNeeded(li, ORIG_OV, 'overflow');
        setImportantStyleIfChanged(li, 'position', 'relative');
        /* Raising a focus-group parent card also raises its ::after white background,
           which makes the original comment look like it jumps in front of the whole thread.
           Keep the card itself in the normal stack and lift only the nickname/popup layer. */
        setImportantStyleIfChanged(li, 'z-index', isFocusGroupParentLi ? 'auto' : '2147483646');
        setImportantStyleIfChanged(li, 'overflow', 'visible');
        setAttributeIfChanged(li, ACTIVE_ATTR, '1');
    };
    const elevateInfoOwner = (element) => {
        if (!(element instanceof HTMLElement)) return;
        saveStyleIfNeeded(element, ORIG_Z, 'z-index');
        saveStyleIfNeeded(element, ORIG_POS, 'position');
        saveStyleIfNeeded(element, ORIG_OV, 'overflow');
        setImportantStyleIfChanged(element, 'position', 'relative');
        setImportantStyleIfChanged(element, 'z-index', '2147483647');
        setImportantStyleIfChanged(element, 'overflow', 'visible');
        setAttributeIfChanged(element, ACTIVE_INFO_ATTR, '1');
    };
    const elevatePopupLayer = (popup) => {
        if (!(popup instanceof HTMLElement)) return;
        if (!isViewportLayerPopup(popup)) return;

        const anchor = findPopupInfoOwner(popup);
        if (!(anchor instanceof HTMLElement)) return;

        const anchorRect = anchor.getBoundingClientRect();
        const popupLi = popup.closest(COMMENT_LI_SELECTOR) || popup.closest(IMAGE_COMMENT_LI_SELECTOR);
        const popupRect = popup.getBoundingClientRect();
        const popupWidth = popupRect.width || popup.offsetWidth || 140;
        const popupHeight = popupRect.height || popup.offsetHeight || 120;
        const viewportWidth = document.documentElement?.clientWidth || window.innerWidth || 0;
        const viewportHeight = window.innerHeight || document.documentElement?.clientHeight || 0;
        const edgePadding = 8;
        const sideGap = 8;
        const verticalGap = 4;
        let targetLeft;
        let targetTop;

        if (isCommentUserPopup(popup)) {
            // Comment nickname popups are host-owned absolute layers.
            // Converting them to fixed fought the site logic and caused flicker/jumps,
            // so keep them in the owning comment li and only rewrite left/top locally.
            const preferredRight = anchorRect.right + sideGap;
            const fitsRight = preferredRight + popupWidth <= (viewportWidth - edgePadding);
            const preferredLeft = anchorRect.left - popupWidth - sideGap;
            const fallbackLeft = clamp(preferredLeft, edgePadding, Math.max(edgePadding, viewportWidth - popupWidth - edgePadding));
            targetLeft = fitsRight ? preferredRight : fallbackLeft;

            const alignedTop = anchorRect.top - verticalGap;
            const maxTop = Math.max(edgePadding, viewportHeight - popupHeight - edgePadding);
            const minTop = edgePadding;
            targetTop = clamp(alignedTop, minTop, maxTop);

            const overlapsAnchorVertically = targetTop < anchorRect.bottom && (targetTop + popupHeight) > anchorRect.top;
            const overlapsAnchorHorizontally = targetLeft < anchorRect.right && (targetLeft + popupWidth) > anchorRect.left;
            if (overlapsAnchorVertically && overlapsAnchorHorizontally) {
                const belowTop = anchorRect.bottom + verticalGap;
                targetTop = clamp(belowTop, minTop, maxTop);
            }
        } else {
            const hasStoredOffset = popup.hasAttribute(LAYER_DX) && popup.hasAttribute(LAYER_DY);
            const dx = hasStoredOffset
                ? Number.parseFloat(popup.getAttribute(LAYER_DX) || '0') || 0
                : (popupRect.left - anchorRect.left);
            const dy = hasStoredOffset
                ? Number.parseFloat(popup.getAttribute(LAYER_DY) || '0') || 0
                : (popupRect.top - anchorRect.top);

            if (!hasStoredOffset) {
                popup.setAttribute(LAYER_DX, `${dx}`);
                popup.setAttribute(LAYER_DY, `${dy}`);
            }

            targetLeft = Math.round(anchorRect.left + dx);
            targetTop = Math.round(anchorRect.top + dy);
        }

        saveStyleIfNeeded(popup, ORIG_Z, 'z-index');
        saveStyleIfNeeded(popup, ORIG_POS, 'position');
        saveStyleIfNeeded(popup, ORIG_OV, 'overflow');
        saveStyleIfNeeded(popup, ORIG_LEFT, 'left');
        saveStyleIfNeeded(popup, ORIG_TOP, 'top');
        saveStyleIfNeeded(popup, ORIG_RIGHT, 'right');
        saveStyleIfNeeded(popup, ORIG_BOTTOM, 'bottom');
        saveStyleIfNeeded(popup, ORIG_WIDTH, 'width');
        saveStyleIfNeeded(popup, ORIG_MIN_WIDTH, 'min-width');
        saveStyleIfNeeded(popup, ORIG_MAX_WIDTH, 'max-width');
        saveStyleIfNeeded(popup, ORIG_DISPLAY, 'display');
        saveStyleIfNeeded(popup, ORIG_MARGIN, 'margin');

        if (isCommentUserPopup(popup) && popupLi instanceof HTMLElement) {
            const liRect = popupLi.getBoundingClientRect();
            const localLeft = Math.max(0, Math.round(targetLeft - liRect.left));
            const localTop = Math.max(0, Math.round(targetTop - liRect.top));

            setImportantStyleIfChanged(popup, 'position', 'absolute');
            setImportantStyleIfChanged(popup, 'left', `${localLeft}px`);
            setImportantStyleIfChanged(popup, 'top', `${localTop}px`);
            setImportantStyleIfChanged(popup, 'right', 'auto');
            setImportantStyleIfChanged(popup, 'bottom', 'auto');
            setImportantStyleIfChanged(popup, 'display', 'block');
            popup.style.removeProperty('width');
            popup.style.removeProperty('min-width');
            popup.style.removeProperty('max-width');
            setImportantStyleIfChanged(popup, 'margin', '0');
        } else {
            setImportantStyleIfChanged(popup, 'position', 'fixed');
            setImportantStyleIfChanged(popup, 'left', `${Math.round(targetLeft)}px`);
            setImportantStyleIfChanged(popup, 'top', `${Math.round(targetTop)}px`);
            setImportantStyleIfChanged(popup, 'right', 'auto');
            setImportantStyleIfChanged(popup, 'bottom', 'auto');
            setImportantStyleIfChanged(popup, 'display', 'block');
            setImportantStyleIfChanged(popup, 'width', 'max-content');
            setImportantStyleIfChanged(popup, 'min-width', '140px');
            setImportantStyleIfChanged(popup, 'max-width', '240px');
            setImportantStyleIfChanged(popup, 'margin', '0');
        }
        setImportantStyleIfChanged(popup, 'z-index', '2147483647');
        setImportantStyleIfChanged(popup, 'overflow', 'visible');
        setAttributeIfChanged(popup, ACTIVE_LAYER_ATTR, '1');
    };

    const clearElevated = () => {
        document.querySelectorAll('li[' + ACTIVE_ATTR + '="1"]').forEach((li) => {
            if (!(li instanceof HTMLElement)) return;
            restoreStyle(li, ORIG_Z, 'z-index');
            restoreStyle(li, ORIG_POS, 'position');
            restoreStyle(li, ORIG_OV, 'overflow');
            li.removeAttribute(ACTIVE_ATTR);
        });
        document.querySelectorAll('[' + ACTIVE_INFO_ATTR + '="1"]').forEach((element) => {
            if (!(element instanceof HTMLElement)) return;
            restoreStyle(element, ORIG_Z, 'z-index');
            restoreStyle(element, ORIG_POS, 'position');
            restoreStyle(element, ORIG_OV, 'overflow');
            element.removeAttribute(ACTIVE_INFO_ATTR);
        });
        document.querySelectorAll('[' + ACTIVE_LAYER_ATTR + '="1"]').forEach((popup) => {
            if (!(popup instanceof HTMLElement)) return;
            restoreStyle(popup, ORIG_Z, 'z-index');
            restoreStyle(popup, ORIG_POS, 'position');
            restoreStyle(popup, ORIG_OV, 'overflow');
            restoreStyle(popup, ORIG_LEFT, 'left');
            restoreStyle(popup, ORIG_TOP, 'top');
            restoreStyle(popup, ORIG_RIGHT, 'right');
            restoreStyle(popup, ORIG_BOTTOM, 'bottom');
            restoreStyle(popup, ORIG_WIDTH, 'width');
            restoreStyle(popup, ORIG_MIN_WIDTH, 'min-width');
            restoreStyle(popup, ORIG_MAX_WIDTH, 'max-width');
            restoreStyle(popup, ORIG_DISPLAY, 'display');
            restoreStyle(popup, ORIG_MARGIN, 'margin');
            popup.removeAttribute(ACTIVE_LAYER_ATTR);
            popup.removeAttribute(LAYER_DX);
            popup.removeAttribute(LAYER_DY);
        });
    };

    const collectPopupCandidates = (elements = null, { forceFullPass = false } = {}) => {
        if (forceFullPass) forcePopupLayerFullPass = true;
        if (!elements || typeof elements[Symbol.iterator] !== 'function') return;
        Array.from(elements).forEach((element) => {
            if (!(element instanceof Element)) return;
            if (element.matches?.(POPUP_CANDIDATE_SELECTOR)) pendingPopupCandidates.add(element);
            element.querySelectorAll?.(POPUP_CANDIDATE_SELECTOR).forEach((candidate) => {
                if (candidate instanceof Element) pendingPopupCandidates.add(candidate);
            });
        });
    };
    const addPopupOwners = (activeLis, activeInfos, popup) => {
        if (!(popup instanceof HTMLElement)) return;
        if (!isVisible(popup)) return;

        const li = findPopupOwnerLi(popup);
        if (li instanceof HTMLElement) {
            activeLis.add(li);

            if ((li.id || '').indexOf('reply_li_') === 0) {
                // Reply nickname popups can still be covered by their parent comment card.
                // Keep tracking the parent li too, but do not lift focus-group parent cards
                // to a high z-index in elevateLi().
                const parentCommentLi = li.closest('li[id^="comment_li_"]');
                if (parentCommentLi instanceof HTMLElement) activeLis.add(parentCommentLi);
            }
        }

        const infoOwner = findPopupInfoOwner(popup);
        if (infoOwner instanceof HTMLElement) activeInfos.add(infoOwner);
    };
    const collectActiveLis = () => {
        const activeLis = new Set();
        const activeInfos = new Set();
        document.querySelectorAll(ACTIVE_POPUP_SELECTOR).forEach((popup) => {
            addPopupOwners(activeLis, activeInfos, popup);
        });
        return { activeLis, activeInfos };
    };
    const collectVisiblePopups = () => Array.from(document.querySelectorAll(ACTIVE_POPUP_SELECTOR))
        .filter((popup) => popup instanceof HTMLElement && isVisible(popup));
    const collectVisiblePopupsFromCandidates = (candidates) => {
        const visiblePopups = new Set();
        candidates.forEach((candidate) => {
            if (!(candidate instanceof Element)) return;
            if (candidate.matches?.(ACTIVE_POPUP_SELECTOR) && isVisible(candidate)) {
                visiblePopups.add(candidate);
            }
            candidate.querySelectorAll?.(ACTIVE_POPUP_SELECTOR).forEach((popup) => {
                if (popup instanceof HTMLElement && isVisible(popup)) visiblePopups.add(popup);
            });
        });
        return Array.from(visiblePopups);
    };
    const collectDeletePopupOwners = (candidates = null, { forceFullPass = false } = {}) => {
        const owners = new Set();
        const addOwner = (element) => {
            if (!(element instanceof Element)) return;
            const ownerLi = element.matches?.(IMAGE_COMMENT_LI_SELECTOR)
                ? element
                : findPopupOwnerLi(element) || element.closest?.(IMAGE_COMMENT_LI_SELECTOR);
            if (ownerLi instanceof HTMLElement) owners.add(ownerLi);
        };

        if (forceFullPass || !Array.isArray(candidates) || candidates.length === 0) {
            document.querySelectorAll(IMAGE_COMMENT_DELETE_POPUP_SELECTOR).forEach((popup) => addOwner(popup));
            return owners;
        }

        candidates.forEach((candidate) => {
            if (!(candidate instanceof Element)) return;
            addOwner(candidate);
            if (candidate.matches?.(IMAGE_COMMENT_DELETE_POPUP_SELECTOR)) addOwner(candidate);
            candidate.querySelectorAll?.(IMAGE_COMMENT_DELETE_POPUP_SELECTOR).forEach((popup) => addOwner(popup));
            candidate.querySelectorAll?.(IMAGE_COMMENT_LI_SELECTOR).forEach((li) => addOwner(li));
        });
        return owners;
    };
    const cleanupDuplicateImageCommentDeletePopups = (candidates = null, { forceFullPass = false } = {}) => {
        const owners = collectDeletePopupOwners(candidates, { forceFullPass });
        owners.forEach((ownerLi) => {
            if (!(ownerLi instanceof HTMLElement)) return;
            const popups = Array.from(ownerLi.querySelectorAll('.cmt_delpw_box, [id$="_delpw_box"]'))
                .filter((popup) => popup instanceof HTMLElement && popup.closest('.view_comment.image_comment'));
            if (popups.length <= 1) return;

            const keepPopup = [...popups].reverse().find((popup) => isVisible(popup)) || popups[popups.length - 1];
            popups.forEach((popup) => {
                if (popup === keepPopup) return;
                popup.remove();
            });
        });
    };
    const collectActiveLisFromCandidates = (candidates) => {
        const activeLis = new Set();
        const activeInfos = new Set();
        candidates.forEach((candidate) => {
            if (!(candidate instanceof Element)) return;
            if (candidate.matches?.(ACTIVE_POPUP_SELECTOR)) addPopupOwners(activeLis, activeInfos, candidate);
            candidate.querySelectorAll?.(ACTIVE_POPUP_SELECTOR).forEach((popup) => addPopupOwners(activeLis, activeInfos, popup));
        });
        return { activeLis, activeInfos };
    };
    const collectActivePopupState = (candidates = null, { forceFullPass = false } = {}) => {
        const visiblePopups = forceFullPass || !Array.isArray(candidates) || candidates.length === 0
            ? collectVisiblePopups()
            : collectVisiblePopupsFromCandidates(candidates);
        const owners = new Set();
        const infoOwners = new Set();
        visiblePopups.forEach((popup) => addPopupOwners(owners, infoOwners, popup));
        return { visiblePopups, owners, infoOwners };
    };
    const applyPopupFixForCandidates = (candidates = null, { forceFullPass = false } = {}) => {
        cleanupDuplicateImageCommentDeletePopups(candidates, { forceFullPass });
        let { visiblePopups, owners, infoOwners } = collectActivePopupState(candidates, { forceFullPass });
        const activeVisibleFallback = !forceFullPass
            && Array.isArray(candidates)
            && candidates.length > 0
            && visiblePopups.length === 0
            ? Array.from(activePopupElements).filter((popup) => popup instanceof HTMLElement && popup.isConnected && isVisible(popup))
            : [];

        if (activeVisibleFallback.length > 0) {
            const fallbackOwners = new Set();
            const fallbackInfoOwners = new Set();
            activeVisibleFallback.forEach((popup) => addPopupOwners(fallbackOwners, fallbackInfoOwners, popup));
            visiblePopups = activeVisibleFallback;
            owners.clear();
            infoOwners.clear();
            fallbackOwners.forEach((owner) => owners.add(owner));
            fallbackInfoOwners.forEach((owner) => infoOwners.add(owner));
        }
        const nextOwnerStateKey = buildPopupOwnerStateKey(owners);
        const canReuseState = nextOwnerStateKey === lastPopupOwnerStateKey
            && document.querySelectorAll('li[' + ACTIVE_ATTR + '="1"]').length === owners.size
            && Array.from(owners).every((li) => isPopupOwnerElevationIntact(li));

        if (canReuseState) {
            return;
        }

        // Important ordering: clear old elevated styles first, then apply popup placement.
        // Reversing this brought comment popups back to the site's default left:0/top:-16
        // position right after we placed them.
        clearElevated();
        replaceElementSet(activePopupElements, visiblePopups);
        replaceElementSet(activePopupOwners, owners);
        replaceElementSet(activePopupInfoOwners, infoOwners);
        owners.forEach((li) => elevateLi(li));
        infoOwners.forEach((element) => elevateInfoOwner(element));
        visiblePopups.forEach((popup) => elevatePopupLayer(popup));
        lastPopupOwnerStateKey = nextOwnerStateKey;
    };

    const popupLayerScheduler = __dcufCreatePhaseScheduler('user-popup-layer', () => {
        const candidates = takeConnectedPopupCandidates();
        const useFullPass = forcePopupLayerFullPass;
        forcePopupLayerFullPass = false;
        if (candidates.length === 0 && !useFullPass) {
            const activeCandidates = getActivePopupCandidates();
            if (activeCandidates.length === 0) return;
            applyPopupFixForCandidates(activeCandidates, { forceFullPass: false });
            return;
        }
        applyPopupFixForCandidates(useFullPass ? null : candidates, { forceFullPass: useFullPass });
    });
    const scheduleApply = ({ elements = null, forceFullPass = false } = {}) => {
        collectPopupCandidates(elements, { forceFullPass });
        popupLayerScheduler.schedule();
    };

    const observe = () => {
        if (window.__dcufUserPopupLayerMutationUnsubscribe || window.__dcufUserPopupLayerObserver) return;
        const unsubscribe = __dcufSubscribeMutationBus('user-popup-layer', (payload) => {
            const relevantNodes = __dcufCollectMatches(payload, [
                POPUP_CONTEXT_SELECTOR,
                ACTIVE_POPUP_SELECTOR,
                COMMENT_LI_SELECTOR,
                IMAGE_COMMENT_LI_SELECTOR
            ], { includeRoots: true });
            if (relevantNodes.length > 0) {
                scheduleApply({ elements: relevantNodes });
            }
        });
        if (typeof unsubscribe === 'function') {
            window.__dcufUserPopupLayerMutationUnsubscribe = unsubscribe;
            return;
        }

        if (!document.body) return;
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
                        scheduleApply({ elements: [mutation.target, ...Array.from(mutation.addedNodes || []), ...Array.from(mutation.removedNodes || [])] });
                        return;
                    }
                }
                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    if (target instanceof Element && target.closest(POPUP_CONTEXT_SELECTOR)) {
                        scheduleApply({ elements: [target] });
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
        document.addEventListener('click', (event) => {
            if (!isRelevantPopupEventTarget(event.target)) return;
            scheduleApply({ elements: [event.target].filter(Boolean) });
        }, true);
        document.addEventListener('mouseup', (event) => {
            if (!isRelevantPopupEventTarget(event.target)) return;
            scheduleApply({ elements: [event.target].filter(Boolean) });
        }, true);
        document.addEventListener('keyup', (event) => {
            if (!isRelevantPopupEventTarget(event.target)) return;
            scheduleApply({ elements: [event.target].filter(Boolean) });
        }, true);
        window.addEventListener('scroll', () => {
            const activeCandidates = getActivePopupCandidates();
            if (activeCandidates.length === 0) return;
            scheduleApply({ elements: activeCandidates });
        }, true);
        window.addEventListener('resize', () => {
            const activeCandidates = getActivePopupCandidates();
            if (activeCandidates.length === 0) return;
            scheduleApply({ elements: activeCandidates });
        }, true);
        window.__dcufUserPopupLayerBound = true;
    };

    scheduleApply({ forceFullPass: true });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            scheduleApply({ forceFullPass: true });
            observe();
            bindEvents();
        }, { once: true });
    } else {
        observe();
        bindEvents();
    }

    window.addEventListener('load', () => scheduleApply({ forceFullPass: true }), { once: true });
})();
(() => {
    if (!__dcufPageSupports('list-surface')) return;
    const STYLE_ID = 'dcuf-list-memo-popup-fix';
    const CENTER_ATTR = 'data-dcuf-list-memo-centered';
    const POPUP_SELECTOR = '#user_memo_config.pop_wrap.type3, #um_picker_lay.pop_wrap.type3';
    const MEMO_CONTEXT_SELECTOR = [POPUP_SELECTOR, '.custom-mobile-list', '.custom-post-item', '.view_content_wrap'].join(', ');
    const MEMO_EVENT_TARGET_SELECTOR = [MEMO_CONTEXT_SELECTOR, '#user_data_lyr', '.user_data', '.pop_wrap.type2', '.pop_wrap.type3'].join(', ');
    const MEMO_FORCE_FULLPASS_EVENT_SELECTOR = '#user_data_lyr, .user_data, .pop_wrap.type2, .pop_wrap.type3';
    const pendingMemoPopupCandidates = new Set();
    const activeMemoPopups = new Set();
    let forceMemoPopupFullPass = false;
    let lastMemoPopupStateKey = '';
    let memoPopupStateIdCounter = 1;
    const memoPopupStateIds = new WeakMap();
    const memoPopupStateCache = new WeakMap();
    let memoPopupOpenFollowupRafId = 0;
    const memoPopupOpenFollowupTimerIds = new Set();
    const LIST_MEMO_POPUP_IMMEDIATE_SELECTOR = [
        '.custom-mobile-list #user_memo_config.pop_wrap.type3',
        '.custom-post-item #user_memo_config.pop_wrap.type3',
        '.custom-mobile-list #um_picker_lay.pop_wrap.type3',
        '.custom-post-item #um_picker_lay.pop_wrap.type3'
    ].join(', ');
    const css = `
        ${LIST_MEMO_POPUP_IMMEDIATE_SELECTOR},
        .pop_wrap.type3[${CENTER_ATTR}="1"] {
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            right: auto !important;
            bottom: auto !important;
            margin: 0 !important;
            transform: translate(-50%, -50%) !important;
            z-index: 2147483647 !important;
        }
        .custom-mobile-list #user_memo_config.pop_wrap.type3,
        .custom-post-item #user_memo_config.pop_wrap.type3,
        #user_memo_config.pop_wrap.type3[${CENTER_ATTR}="1"] {
            width: min(478px, calc(100vw - 16px)) !important;
            max-width: min(478px, calc(100vw - 16px)) !important;
            max-height: calc(100vh - 16px) !important;
        }
        .custom-mobile-list #user_memo_config.pop_wrap.type3 .pop_content.memo_sel,
        .custom-post-item #user_memo_config.pop_wrap.type3 .pop_content.memo_sel,
        #user_memo_config.pop_wrap.type3[${CENTER_ATTR}="1"] .pop_content.memo_sel {
            width: 100% !important;
            max-width: 100% !important;
            max-height: calc(100vh - 16px) !important;
            overflow-y: auto !important;
            box-sizing: border-box !important;
        }
        .custom-mobile-list #user_memo_config.pop_wrap.type3 .pop_head,
        .custom-mobile-list #user_memo_config.pop_wrap.type3 .inner,
        .custom-mobile-list #user_memo_config.pop_wrap.type3 .btn_box,
        .custom-post-item #user_memo_config.pop_wrap.type3 .pop_head,
        .custom-post-item #user_memo_config.pop_wrap.type3 .inner,
        .custom-post-item #user_memo_config.pop_wrap.type3 .btn_box,
        #user_memo_config.pop_wrap.type3[${CENTER_ATTR}="1"] .pop_head,
        #user_memo_config.pop_wrap.type3[${CENTER_ATTR}="1"] .inner,
        #user_memo_config.pop_wrap.type3[${CENTER_ATTR}="1"] .btn_box {
            box-sizing: border-box !important;
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

    const isVisible = (element) => {
        if (!(element instanceof HTMLElement)) return false;
        const cs = window.getComputedStyle(element);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity || '1') === 0) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    };

    const isListMemoContext = (popup) => {
        if (!(popup instanceof HTMLElement)) return false;
        if (!isVisible(popup)) return false;
        if (popup.closest('.view_content_wrap, #focus_cmt')) return false;
        if (popup.closest('.custom-mobile-list, .custom-post-item')) return true;

        const hasCustomList = !!document.querySelector('.custom-mobile-list, .custom-post-item');
        const hasViewContent = !!document.querySelector('.view_content_wrap');
        return hasCustomList && !hasViewContent;
    };
    const setCenteredAttr = (popup, centered) => {
        if (!(popup instanceof HTMLElement)) return;
        if (centered) {
            if (popup.getAttribute(CENTER_ATTR) !== '1') popup.setAttribute(CENTER_ATTR, '1');
            return;
        }
        if (popup.hasAttribute(CENTER_ATTR)) popup.removeAttribute(CENTER_ATTR);
    };
    const replaceMemoPopupSet = (elements) => {
        activeMemoPopups.clear();
        elements.forEach((element) => {
            if (element instanceof HTMLElement && element.isConnected && isVisible(element)) {
                activeMemoPopups.add(element);
            }
        });
    };
    const getMemoPopupStateId = (popup) => {
        if (!(popup instanceof HTMLElement)) return '';
        let stateId = memoPopupStateIds.get(popup);
        if (!stateId) {
            stateId = memoPopupStateIdCounter++;
            memoPopupStateIds.set(popup, stateId);
        }
        return `${popup.id || popup.className || popup.tagName}:${stateId}`;
    };
    const buildMemoPopupStateKey = (popups) => Array.from(popups)
        .filter((popup) => popup instanceof HTMLElement && isVisible(popup))
        .map((popup) => {
            const cached = memoPopupStateCache.get(popup) || '0';
            return `${getMemoPopupStateId(popup)}:${cached}`;
        })
        .sort()
        .join('|');
    const takeConnectedMemoCandidates = () => {
        const candidates = Array.from(pendingMemoPopupCandidates).filter((candidate) => candidate instanceof Element && candidate.isConnected);
        pendingMemoPopupCandidates.clear();
        return candidates;
    };
    const getActiveMemoPopupCandidates = () => Array.from(activeMemoPopups)
        .filter((popup) => popup instanceof HTMLElement && popup.isConnected && isVisible(popup));
    const isRelevantMemoEventTarget = (target) => target instanceof Element
        && Boolean(target.closest(MEMO_EVENT_TARGET_SELECTOR));
    const clearMemoPopupOpenFollowups = () => {
        if (memoPopupOpenFollowupRafId) {
            cancelAnimationFrame(memoPopupOpenFollowupRafId);
            memoPopupOpenFollowupRafId = 0;
        }
        memoPopupOpenFollowupTimerIds.forEach((timerId) => clearTimeout(timerId));
        memoPopupOpenFollowupTimerIds.clear();
    };
    const collectMemoPopupCandidates = (elements = null, { forceFullPass = false } = {}) => {
        if (forceFullPass) forceMemoPopupFullPass = true;
        if (!elements || typeof elements[Symbol.iterator] !== 'function') return;
        Array.from(elements).forEach((element) => {
            if (!(element instanceof Element)) return;
            if (element.matches?.(MEMO_CONTEXT_SELECTOR)) pendingMemoPopupCandidates.add(element);
            element.querySelectorAll?.(MEMO_CONTEXT_SELECTOR).forEach((candidate) => {
                if (candidate instanceof Element) pendingMemoPopupCandidates.add(candidate);
            });
        });
    };
    const resolveMemoPopupTargets = (candidates = null, { forceFullPass = false } = {}) => {
        if (forceFullPass || !Array.isArray(candidates) || candidates.length === 0) {
            return Array.from(document.querySelectorAll(POPUP_SELECTOR));
        }

        const popups = new Set();
        let needsGlobalPopupLookup = false;
        candidates.forEach((candidate) => {
            if (!(candidate instanceof Element)) return;
            if (candidate.matches?.(POPUP_SELECTOR)) popups.add(candidate);
            candidate.querySelectorAll?.(POPUP_SELECTOR).forEach((popup) => {
                if (popup instanceof HTMLElement) popups.add(popup);
            });
            if (candidate.matches?.('.custom-mobile-list, .custom-post-item, .view_content_wrap')
                || candidate.querySelector?.('.custom-mobile-list, .custom-post-item, .view_content_wrap')) {
                needsGlobalPopupLookup = true;
            }
        });

        if (needsGlobalPopupLookup) {
            document.querySelectorAll(POPUP_SELECTOR).forEach((popup) => {
                if (popup instanceof HTMLElement) popups.add(popup);
            });
        }

        return Array.from(popups);
    };

    const syncPopup = (popup) => {
        if (!(popup instanceof HTMLElement)) return;
        const centered = isListMemoContext(popup);
        const nextState = centered ? '1' : '0';
        const previousState = memoPopupStateCache.get(popup);
        if (previousState === nextState && ((centered && popup.getAttribute(CENTER_ATTR) === '1') || (!centered && !popup.hasAttribute(CENTER_ATTR)))) {
            return;
        }
        setCenteredAttr(popup, centered);
        memoPopupStateCache.set(popup, nextState);
    };

    const syncMemoPopups = (candidates = null, { forceFullPass = false } = {}) => {
        const popups = resolveMemoPopupTargets(candidates, { forceFullPass });
        popups.forEach((popup) => syncPopup(popup));
        replaceMemoPopupSet(popups);
        lastMemoPopupStateKey = buildMemoPopupStateKey(activeMemoPopups);
    };

    const memoPopupScheduler = __dcufCreatePhaseScheduler('list-memo-popup', () => {
        const candidates = takeConnectedMemoCandidates();
        const useFullPass = forceMemoPopupFullPass;
        forceMemoPopupFullPass = false;
        if (candidates.length === 0 && !useFullPass) {
            const activeCandidates = getActiveMemoPopupCandidates();
            if (activeCandidates.length === 0) return;
            const nextStateKey = buildMemoPopupStateKey(activeCandidates);
            if (nextStateKey === lastMemoPopupStateKey) return;
            syncMemoPopups(activeCandidates, { forceFullPass: false });
            return;
        }
        syncMemoPopups(useFullPass ? null : candidates, { forceFullPass: useFullPass });
    });
    const scheduleApply = ({ elements = null, forceFullPass = false } = {}) => {
        collectMemoPopupCandidates(elements, { forceFullPass });
        memoPopupScheduler.schedule();
    };
    const scheduleMemoPopupOpenFollowups = () => {
        clearMemoPopupOpenFollowups();
        memoPopupOpenFollowupRafId = requestAnimationFrame(() => {
            memoPopupOpenFollowupRafId = 0;
            scheduleApply({ forceFullPass: true });
        });
        [70, 180].forEach((delay) => {
            const timerId = window.setTimeout(() => {
                memoPopupOpenFollowupTimerIds.delete(timerId);
                scheduleApply({ forceFullPass: true });
            }, delay);
            memoPopupOpenFollowupTimerIds.add(timerId);
        });
    };

    const observe = () => {
        if (window.__dcufListMemoPopupMutationUnsubscribe || window.__dcufListMemoPopupObserver) return;
        const unsubscribe = __dcufSubscribeMutationBus('list-memo-popup', (payload) => {
            const relevantNodes = __dcufCollectMatches(payload, [POPUP_SELECTOR, '.custom-mobile-list', '.custom-post-item', '.view_content_wrap'], { includeRoots: true });
            if (relevantNodes.length > 0) {
                scheduleApply({ elements: relevantNodes });
            }
        });
        if (typeof unsubscribe === 'function') {
            window.__dcufListMemoPopupMutationUnsubscribe = unsubscribe;
            return;
        }

        if (!document.body) return;
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
                        scheduleApply({ elements: [mutation.target, ...Array.from(mutation.addedNodes || []), ...Array.from(mutation.removedNodes || [])] });
                        return;
                    }
                }
                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    if (target instanceof Element && target.matches(POPUP_SELECTOR)) {
                        scheduleApply({ elements: [target] });
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

        window.__dcufListMemoPopupObserver = observer;
    };

    const bindEvents = () => {
        if (window.__dcufListMemoPopupBound) return;
        document.addEventListener('click', (event) => {
            if (!isRelevantMemoEventTarget(event.target)) return;
            const forceFullPass = event.target instanceof Element && Boolean(event.target.closest(MEMO_FORCE_FULLPASS_EVENT_SELECTOR));
            if (forceFullPass) scheduleMemoPopupOpenFollowups();
            scheduleApply(forceFullPass
                ? { forceFullPass: true }
                : { elements: [event.target].filter(Boolean) });
        }, true);
        document.addEventListener('mouseup', (event) => {
            if (!isRelevantMemoEventTarget(event.target)) return;
            const forceFullPass = event.target instanceof Element && Boolean(event.target.closest(MEMO_FORCE_FULLPASS_EVENT_SELECTOR));
            if (forceFullPass) scheduleMemoPopupOpenFollowups();
            scheduleApply(forceFullPass
                ? { forceFullPass: true }
                : { elements: [event.target].filter(Boolean) });
        }, true);
        document.addEventListener('keyup', (event) => {
            if (!isRelevantMemoEventTarget(event.target)) return;
            const forceFullPass = event.target instanceof Element && Boolean(event.target.closest(MEMO_FORCE_FULLPASS_EVENT_SELECTOR));
            if (forceFullPass) scheduleMemoPopupOpenFollowups();
            scheduleApply(forceFullPass
                ? { forceFullPass: true }
                : { elements: [event.target].filter(Boolean) });
        }, true);
        window.addEventListener('scroll', () => {
            const activeCandidates = getActiveMemoPopupCandidates();
            if (activeCandidates.length === 0) return;
            scheduleApply({ elements: activeCandidates });
        }, true);
        window.addEventListener('resize', () => {
            const activeCandidates = getActiveMemoPopupCandidates();
            if (activeCandidates.length === 0) return;
            scheduleApply({ elements: activeCandidates });
        }, true);
        window.__dcufListMemoPopupBound = true;
    };

    injectStyle();
    scheduleApply({ forceFullPass: true });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            injectStyle();
            scheduleApply({ forceFullPass: true });
            observe();
            bindEvents();
        }, { once: true });
    } else {
        observe();
        bindEvents();
    }

    window.addEventListener('load', () => {
        injectStyle();
        scheduleApply({ forceFullPass: true });
    }, { once: true });
})();
(() => {
    if (!__dcufPageSupports('view')) return;

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

function __dcufGetRuntimeCoordinator() {
    return window.__dcufRuntimeCoordinator || null;
}

function __dcufGetPageContext() {
    const sharedContext = window.__dcufPageContext;
    if (sharedContext && typeof sharedContext === 'object') return sharedContext;
    const type = ((window.location.pathname || '').match(/\/board\/(lists|view|write)(?:\/|$)/) || [])[1] || 'other';
    return {
        type,
        isList: type === 'lists',
        isView: type === 'view',
        isWrite: type === 'write',
        isOther: type === 'other',
        isTargetPage: type !== 'other',
        hasListSurface: type === 'lists' || type === 'view',
        hasComments: type === 'view'
    };
}

function __dcufPageSupports(surface) {
    const pageContext = __dcufGetPageContext();
    if (surface === 'list') return pageContext.isList;
    if (surface === 'view') return pageContext.isView;
    if (surface === 'write') return pageContext.isWrite;
    if (surface === 'list-surface') return pageContext.hasListSurface;
    if (surface === 'comments') return pageContext.hasComments;
    if (surface === 'target') return pageContext.isTargetPage;
    return false;
}

function __dcufCreatePhaseScheduler(label, run, delays = []) {
    const runtimeCoordinator = __dcufGetRuntimeCoordinator();
    if (runtimeCoordinator && typeof runtimeCoordinator.createPhaseScheduler === 'function') {
        return runtimeCoordinator.createPhaseScheduler(label, run, { delays });
    }

    let rafId = 0;
    const timerIds = new Set();
    const clearTimers = () => {
        timerIds.forEach((timerId) => clearTimeout(timerId));
        timerIds.clear();
    };

    return {
        schedule(meta = null) {
            if (rafId) cancelAnimationFrame(rafId);
            clearTimers();

            rafId = requestAnimationFrame(() => {
                rafId = 0;
                run({ label, phase: 'raf', delay: 0, meta });
                delays.forEach((delay) => {
                    const timerId = window.setTimeout(() => {
                        timerIds.delete(timerId);
                        run({ label, phase: `delay:${delay}`, delay, meta });
                    }, delay);
                    timerIds.add(timerId);
                });
            });
        },
        cancel() {
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = 0;
            }
            clearTimers();
        },
        flush(meta = null) {
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = 0;
            }
            clearTimers();
            run({ label, phase: 'flush', delay: 0, meta });
        }
    };
}

function __dcufSubscribeMutationBus(key, listener) {
    const runtimeCoordinator = __dcufGetRuntimeCoordinator();
    if (!runtimeCoordinator || typeof runtimeCoordinator.subscribeMutations !== 'function') return null;
    return runtimeCoordinator.subscribeMutations(key, listener);
}

function __dcufCollectMatches(payload, selectors, options = {}) {
    if (payload && typeof payload.collectMatches === 'function') {
        return payload.collectMatches(selectors, options);
    }
    const selectorText = Array.isArray(selectors) ? selectors.filter(Boolean).join(', ') : selectors;
    if (!selectorText) return [];
    return Array.from(document.querySelectorAll(selectorText));
}

    __dcufPostMainRoot.__dcufPostMainFixesState = 'ready';
    } catch (error) {
        __dcufPostMainRoot.__dcufPostMainFixesState = 'failed';
        throw error;
    }
})();
