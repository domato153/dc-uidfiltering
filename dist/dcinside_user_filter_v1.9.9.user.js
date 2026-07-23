// ==UserScript==
// @name         DCInside PC User Filter
// @namespace    http://tampermonkey.net/
// @version      1.9.9
// @description  DCInside PC filter port based on the latest mobile filter runtime and shared filter core
// @author       domato153
// @match        https://gall.dcinside.com/board/*
// @match        https://gall.dcinside.com/mgallery/board/*
// @match        https://gall.dcinside.com/mini/board/*
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

    const detectedRouteType = ((window.location.pathname || '').match(/\/board\/(lists|view|write|modify|delete)(?:\/|$)/) || [])[1] || 'other';
    const detectedPageType = detectedRouteType === 'delete' && 'off' !== 'mobile'
        ? 'other'
        : detectedRouteType;
    const pageContext = Object.freeze({
        type: detectedPageType,
        isList: detectedPageType === 'lists',
        isView: detectedPageType === 'view',
        isWrite: detectedPageType === 'write',
        isModify: detectedPageType === 'modify',
        isDelete: detectedPageType === 'delete',
        isWriteSurface: detectedPageType === 'write' || detectedPageType === 'modify',
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

    // The metadata covers a few gallery-adjacent pages, but the mobile runtime owns
    // only board list/view/write/modify plus the mobile delete-password surface. Keep the lightweight page-context bridge
    // and stop before installing observers, menus, or styles elsewhere.
    if (!pageContext.isTargetPage) return;

    const previousBoot = __dcufRoot.__dcufBootController || window.__dcufBootController;
    if (previousBoot) {
        if (previousBoot.state === 'locked' || previousBoot.state === 'preparing') previousBoot.ensure('duplicate-runtime');
        else if (previousBoot.state === 'degraded') previousBoot.requestRecovery?.('duplicate-runtime');
        console.warn('DCinside User Filter: duplicate runtime detected; reusing bootstrap.');
        return;
    }

    let dcFilterSettings = {};
    let userSumCache = {};
    let isInitialized = false;
    let isUiInitialized = false;
    let activeShortcutObject = null;
    let activeShortcutString = null;

    const READY_CLASS = 'script-ui-ready';
    const STATE_ATTR = 'data-dcuf-boot-state';
    const LOCK_STYLE_ID = 'dcuf-initial-lock-style';
    const OVERLAY_ID = 'dcuf-boot-overlay';
    const OVERLAY_STYLE_ID = 'dcuf-boot-overlay-style';
    const DEGRADED_STYLE_ID = 'dcuf-degraded-filter-style';
    const DEGRADED_BANNER_ID = 'dcuf-degraded-banner';
    const FILTER_READY_ATTR = 'data-dcuf-filter-ready';
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
                    border-radius: inherit !important;
                    background: linear-gradient(90deg,var(--dcuf-theme-accent-strong,#245bda),var(--dcuf-theme-accent,#5d87f0)) !important;
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
        if ((pageType === 'lists' || pageType === 'view') && !document.getElementById(DEGRADED_STYLE_ID)) {
            const style = document.createElement('style');
            style.id = DEGRADED_STYLE_ID;
            style.textContent = `
                html[${STATE_ATTR}="degraded"]:not([${FILTER_READY_ATTR}="true"]) :is(
                    .gall_listwrap table.gall_list,.list_wrap table.gall_list,.custom-mobile-list,
                    .gall_exposure_list,#focus_cmt .comment_box,div[id^="comment_wrap_"] .comment_box,
                    .view_comment.image_comment .comment_box
                ) { opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; }
            `;
            (document.head || document.documentElement)?.appendChild(style);
        }
        const existingBanner = document.getElementById(DEGRADED_BANNER_ID);
        if (existingBanner) {
            existingBanner.dataset.reason = reason;
            return;
        }
        if (!document.body) return;
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
        filterReady: false,
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
        markFilterReady(reason = 'filter-ready') {
            if (this.filterReady) return;
            this.filterReady = true;
            document.documentElement?.setAttribute(FILTER_READY_ATTR, 'true');
            note('boot.filter-ready', { reason, state: this.state });
            if (this.state === 'degraded') this.requestRecovery('filter-ready');
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
            if ((pageType === 'lists' || pageType === 'view') && !criticalTimer) {
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
    // PC filter port shared prelude
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
                BLOCK_PUM_POSTS: 'dcinside_block_pum_posts',
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
                GALLERY_HEADTEXT_BLOCKS: 'dcinside_gallery_headtext_blocks_v1',
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
                BLOCK_PUM_POSTS_CHECKBOX: 'dcinside-block-pum-posts-checkbox',
                SAVE_BUTTON: 'dcinside-threshold-save',
                CLOSE_BUTTON: 'dcinside-filter-close',
                SHORTCUT_DISPLAY: 'dcinside-shortcut-display',
                CHANGE_SHORTCUT_BTN: 'dcinside-change-shortcut-btn',
                SHORTCUT_MODAL_OVERLAY: 'dcinside-shortcut-modal-overlay',
                SHORTCUT_MODAL: 'dcinside-shortcut-modal',
                NEW_SHORTCUT_PREVIEW: 'dcinside-new-shortcut-preview',
                SAVE_SHORTCUT_BTN: 'dcinside-save-shortcut-btn',
                CANCEL_SHORTCUT_BTN: 'dcinside-cancel-shortcut-btn',
                HEADTEXT_MANAGER_BUTTON: 'dcinside-headtext-manager-button',
                HEADTEXT_MANAGER_PANEL: 'dcinside-headtext-manager-panel',
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
const TELECOM = () => [
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
        `;

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
        `;

const KR_IP_RANGES = () => ({ "1": [[11, 11], [16, 19], [96, 111], [176, 177], [201, 201], [208, 223], [224, 255]], "14": [[0, 0], [4, 7], [32, 63], [64, 95], [128, 128], [129, 129], [138, 138], [192, 192], [206, 206]], "27": [[0, 0], [1, 1], [35, 35], [96, 96], [100, 100], [101, 101], [102, 102], [111, 111], [112, 112], [113, 113], [115, 115], [116, 116], [117, 117], [118, 118], [119, 119], [120, 120], [122, 122], [124, 124], [125, 125], [126, 126], [160, 175], [176, 183], [232, 239], [255, 255]], "36": [[38, 39]], "39": [[4, 7], [16, 31], [112, 127]], "42": [[8, 15], [16, 31], [32, 47], [82, 82]], "43": [[224, 224], [227, 227], [228, 228], [230, 230], [230, 230], [230, 230], [241, 241], [242, 242], [243, 243], [246, 246], [247, 247], [247, 247], [250, 250], [251, 251], [254, 254], [255, 255]], "45": [[64, 64], [64, 64], [64, 64], [112, 112], [112, 112], [113, 113], [115, 115], [117, 117], [119, 119], [120, 120], [121, 121], [125, 125], [248, 248], [249, 249], [249, 249], [250, 250], [250, 250]], "49": [[1, 1], [8, 11], [16, 31], [50, 50], [50, 50], [50, 50], [56, 63], [128, 128], [142, 142], [143, 143], [160, 175], [236, 236], [238, 238], [239, 239], [246, 246], [247, 247], [254, 254]], "58": [[29, 29], [65, 65], [72, 79], [84, 84], [87, 87], [102, 103], [120, 127], [138, 138], [140, 143], [145, 145], [146, 146], [147, 147], [148, 151], [180, 180], [181, 181], [184, 184], [224, 239]], "59": [[0, 31], [86, 86], [150, 150], [151, 151], [152, 152], [186, 187]], "60": [[196, 197], [253, 253]], "61": [[4, 4], [5, 5], [14, 14], [32, 39], [40, 43], [47, 47], [72, 77], [78, 79], [80, 83], [84, 85], [96, 111], [245, 245], [245, 245], [247, 247], [247, 247], [248, 255]], "101": [[1, 1], [1, 1], [53, 53], [55, 55], [79, 79], [101, 101], [202, 202], [235, 235], [250, 250]], "103": [[2, 2], [2, 2], [2, 2], [3, 3], [4, 4], [4, 4], [4, 4], [5, 5], [5, 5], [6, 6], [6, 6], [6, 6], [6, 6], [7, 7], [7, 7], [7, 7], [8, 8], [8, 8], [9, 9], [9, 9], [10, 10], [10, 10], [11, 11], [11, 11], [11, 11], [11, 11], [11, 11], [12, 12], [13, 13], [13, 13], [19, 19], [20, 20], [21, 21], [21, 21], [22, 22], [23, 23], [24, 24], [25, 25], [27, 27], [27, 27], [28, 28], [30, 30], [30, 30], [30, 30], [31, 31], [38, 38], [39, 39], [42, 42], [42, 42], [43, 43], [43, 43], [49, 49], [50, 50], [51, 51], [51, 51], [51, 51], [52, 52], [53, 53], [55, 55], [55, 55], [57, 57], [59, 59], [60, 60], [62, 62], [66, 66], [67, 67], [68, 68], [68, 68], [71, 71], [74, 74], [77, 77], [79, 79], [85, 85], [87, 87], [90, 90], [90, 90], [104, 104], [105, 105], [106, 106], [108, 108], [109, 109], [114, 114], [114, 114], [117, 117], [122, 122], [122, 122], [124, 124], [125, 125], [126, 126], [126, 126], [127, 127], [129, 129], [132, 132], [138, 138], [139, 139], [139, 139], [139, 139], [140, 140], [141, 141], [141, 141], [143, 143], [143, 143], [144, 144], [145, 145], [146, 146], [150, 150], [150, 150], [150, 150], [150, 150], [153, 153], [157, 157], [157, 157], [159, 159], [161, 161], [162, 162], [162, 162], [164, 164], [166, 166], [171, 171], [175, 175], [178, 178], [182, 182], [182, 182], [186, 186], [187, 187], [187, 187], [188, 188], [194, 194], [194, 194], [206, 206], [212, 212], [212, 212], [214, 214], [214, 214], [215, 215], [216, 216], [218, 218], [219, 219], [226, 226], [226, 226], [229, 229], [230, 230], [231, 231], [234, 234], [235, 235], [237, 237], [238, 238], [239, 239], [239, 239], [240, 240], [240, 240], [243, 243], [244, 244], [244, 244], [246, 246], [246, 246], [246, 246], [247, 247], [247, 247], [248, 248], [249, 249], [251, 251], [253, 253], [254, 254]], "106": [[10, 10], [96, 103], [240, 255]], "110": [[4, 4], [5, 5], [8, 15], [34, 34], [35, 35], [35, 35], [44, 44], [44, 44], [45, 45], [46, 47], [68, 71], [76, 76], [76, 76], [92, 92], [92, 92], [93, 93], [93, 93], [165, 165], [165, 165], [172, 172], [232, 232]], "111": [[65, 65], [67, 67], [91, 91], [92, 92], [118, 118], [171, 171], [218, 219], [221, 221]], "112": [[72, 72], [72, 72], [76, 77], [106, 107], [108, 108], [109, 109], [121, 121], [121, 121], [133, 133], [136, 136], [137, 137], [140, 140], [140, 140], [140, 140], [144, 159], [160, 191], [196, 196], [212, 212], [213, 213], [214, 214], [216, 223]], "113": [[10, 10], [21, 21], [29, 29], [30, 30], [52, 52], [52, 52], [59, 59], [60, 60], [61, 61], [61, 61], [130, 130], [130, 130], [131, 131], [192, 192], [197, 197], [198, 198], [199, 199], [216, 217]], "114": [[29, 29], [30, 30], [30, 30], [30, 30], [31, 31], [31, 31], [52, 53], [70, 71], [108, 108], [110, 110], [110, 110], [111, 111], [111, 111], [129, 129], [129, 129], [141, 141], [141, 141], [141, 141], [199, 199], [199, 199], [200, 207]], "115": [[0, 23], [31, 31], [40, 41], [68, 68], [69, 69], [71, 71], [84, 84], [85, 85], [86, 86], [88, 95], [126, 126], [136, 143], [144, 144], [145, 145], [160, 160], [161, 161], [165, 165], [178, 178], [178, 178], [187, 187], [187, 187]], "116": [[32, 47], [67, 67], [68, 68], [68, 68], [84, 84], [89, 89], [90, 90], [93, 93], [120, 127], [193, 193], [199, 199], [200, 201], [212, 212], [255, 255]], "117": [[16, 17], [20, 20], [20, 20], [52, 52], [53, 53], [53, 53], [55, 55], [58, 58], [110, 111], [123, 123]], "118": [[32, 63], [67, 67], [91, 91], [91, 91], [103, 103], [107, 107], [127, 127], [128, 131], [139, 139], [176, 176], [216, 223], [234, 235]], "119": [[17, 17], [17, 17], [18, 18], [30, 30], [31, 31], [42, 42], [56, 56], [59, 59], [63, 63], [64, 71], [75, 75], [77, 77], [82, 82], [148, 148], [149, 149], [161, 161], [192, 223], [235, 235], [235, 235]], "120": [[29, 29], [50, 50], [73, 73], [136, 136], [142, 142], [143, 143]], "121": [[0, 0], [1, 1], [50, 50], [50, 50], [50, 50], [53, 53], [54, 54], [55, 55], [64, 67], [78, 78], [88, 88], [100, 100], [101, 101], [101, 101], [124, 125], [126, 126], [127, 127], [128, 159], [160, 191], [200, 200], [252, 253], [254, 254], [254, 254]], "122": [[0, 0], [0, 0], [32, 47], [49, 49], [99, 99], [100, 100], [101, 101], [128, 128], [128, 128], [129, 129], [129, 129], [152, 152], [153, 153], [199, 199], [202, 202], [202, 202], [203, 203], [252, 252], [252, 252], [254, 254]], "123": [[0, 0], [32, 47], [98, 98], [99, 99], [100, 100], [108, 108], [108, 108], [109, 109], [111, 111], [140, 143], [199, 199], [200, 200], [212, 215], [228, 229], [248, 248], [250, 251], [253, 253], [254, 254], [254, 254]], "124": [[0, 1], [2, 2], [3, 3], [5, 5], [28, 28], [46, 46], [48, 63], [66, 66], [66, 66], [80, 80], [111, 111], [136, 139], [146, 146], [153, 153], [194, 194], [195, 195], [195, 195], [197, 197], [198, 198], [199, 199], [199, 199], [216, 216], [217, 217], [243, 243], [254, 254]], "125": [[7, 7], [31, 31], [57, 57], [60, 60], [61, 61], [62, 62], [128, 159], [176, 191], [208, 208], [208, 208], [209, 209], [209, 209], [240, 247], [248, 251], [252, 252]], "128": [[134, 134]], "129": [[254, 254]], "134": [[75, 75]], "137": [[68, 68]], "139": [[5, 5], [150, 150]], "141": [[223, 223]], "143": [[248, 248]], "144": [[48, 48], [48, 48], [48, 48]], "147": [[6, 6], [43, 43], [46, 46], [47, 47]], "150": [[107, 107], [107, 107], [129, 129], [150, 150], [183, 183], [197, 197], [242, 242], [242, 242]], "152": [[99, 99], [149, 149]], "154": [[10, 10]], "155": [[230, 230]], "156": [[147, 147]], "157": [[119, 119], [197, 197]], "158": [[44, 44]], "160": [[202, 202]], "161": [[122, 122]], "163": [[53, 53], [152, 152], [180, 180], [213, 213], [222, 222], [229, 229], [239, 239], [255, 255]], "164": [[124, 124], [125, 125]], "165": [[132, 132], [133, 133], [141, 141], [186, 186], [194, 194], [213, 213], [229, 229], [243, 243], [244, 244], [246, 246]], "166": [[79, 79], [103, 103], [104, 104], [125, 125]], "168": [[78, 78], [115, 115], [126, 126], [131, 131], [154, 154], [188, 188], [219, 219], [248, 249]], "169": [[140, 140], [208, 223]], "175": [[28, 28], [41, 41], [45, 45], [45, 45], [106, 106], [107, 107], [111, 111], [112, 127], [158, 158], [176, 176], [192, 255]], "180": [[64, 71], [80, 83], [92, 92], [92, 92], [94, 94], [131, 131], [132, 135], [148, 148], [150, 150], [182, 182], [189, 189], [189, 189], [210, 210], [210, 210], [211, 211], [222, 222], [224, 231], [233, 233], [236, 239]], "182": [[31, 31], [50, 50], [161, 161], [162, 162], [163, 163], [172, 172], [173, 173], [173, 173], [192, 199], [208, 223], [224, 231], [237, 237], [237, 237], [252, 252], [252, 252], [255, 255]], "183": [[78, 78], [78, 78], [86, 86], [90, 90], [91, 91], [96, 127]], "192": [[5, 5], [100, 100], [104, 104], [132, 132], [132, 132], [195, 195], [203, 203], [245, 245], [249, 249]], "202": [[3, 3], [6, 6], [8, 8], [14, 14], [14, 14], [14, 14], [20, 20], [20, 20], [20, 20], [20, 20], [21, 21], [22, 22], [30, 31], [43, 43], [59, 59], [68, 68], [73, 73], [86, 86], [89, 89], [89, 89], [90, 90], [126, 126], [128, 128], [131, 131], [133, 133], [136, 136], [148, 148], [150, 150], [158, 158], [163, 163], [165, 165], [167, 167], [171, 171], [174, 174], [179, 179], [179, 179]], "203": [[17, 17], [81, 81], [81, 81], [82, 82], [82, 82], [83, 83], [84, 84], [90, 90], [100, 100], [109, 109], [123, 123], [128, 128], [128, 128], [129, 129], [130, 130], [130, 130], [132, 132], [133, 133], [142, 142], [142, 142], [149, 149], [152, 152], [153, 153], [160, 160], [166, 166], [169, 169], [170, 170], [171, 171], [173, 173], [175, 175], [175, 175], [190, 190], [190, 190], [191, 191], [207, 207], [210, 210], [212, 212], [212, 212], [215, 215], [216, 216], [217, 217], [223, 223], [223, 223], [224, 224], [225, 225], [226, 227], [228, 229], [230, 231], [232, 233], [234, 235], [236, 239], [240, 243], [244, 247], [248, 251], [252, 255]], "210": [[0, 0], [2, 2], [4, 4], [4, 4], [16, 16], [57, 57], [87, 87], [89, 89], [90, 91], [92, 95], [96, 96], [97, 97], [98, 98], [99, 99], [100, 103], [104, 107], [108, 111], [112, 115], [116, 119], [120, 123], [124, 127], [178, 179], [180, 181], [182, 183], [192, 192], [204, 207], [210, 210], [211, 211], [211, 211], [216, 219], [220, 223]], "211": [[32, 39], [40, 51], [52, 63], [104, 111], [112, 119], [168, 175], [176, 191], [192, 199], [200, 205], [206, 211], [212, 215], [216, 225], [226, 231], [232, 255]], "218": [[36, 39], [48, 49], [50, 55], [101, 101], [144, 159], [209, 209], [232, 233], [234, 239]], "219": [[240, 241], [248, 255]], "220": [[64, 71], [72, 91], [92, 95], [103, 103], [116, 127], [149, 149], [230, 230]], "221": [[132, 132], [133, 133], [133, 133], [138, 143], [144, 168]], "222": [[96, 122], [231, 231], [232, 239], [251, 251]], "223": [[26, 26], [28, 28], [32, 63], [130, 130], [131, 131], [165, 165], [168, 175], [194, 195], [222, 222], [253, 253], [255, 255]] });

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

function normalizeHeadtext(value) {
    return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function normalizeGalleryHeadtextBlocks(rawValue) {
    if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) return {};
    const normalized = {};
    Object.entries(rawValue).forEach(([rawKey, rawItems]) => {
        const key = typeof rawKey === 'string' ? rawKey.trim() : '';
        if (!/^(?:board|mgallery|mini):[^:\s]+$/.test(key) || !Array.isArray(rawItems)) return;
        const items = Array.from(new Set(rawItems.map(normalizeHeadtext).filter(Boolean))).slice(0, 100);
        if (items.length > 0) normalized[key] = items;
    });
    return normalized;
}

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
        blockPumPosts: false,
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
        blockPumPosts: toBoolean(rawValues[STORAGE_KEYS.BLOCK_PUM_POSTS], defaults.blockPumPosts),
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
        normalizeHeadtext,
        normalizeGalleryHeadtextBlocks,
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
        galleryHeadtextBlocked: Boolean(matches.galleryHeadtextBlock),
        pumPostMatch: Boolean(matches.pumPostMatch),
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

    if (decision.galleryHeadtextBlocked) {
        decision.isBlocked = true;
        decision.path = 'gallery-headtext';
        decision.reasons.push('galleryHeadtext');
    }

    if (!decision.isBlocked && settings?.blockPumPosts && decision.pumPostMatch) {
        decision.isBlocked = true;
        decision.path = 'pum-post';
        decision.reasons.push('pumPost');
    }

    if (!decision.isBlocked && subject?.isGuest && settings?.blockGuestEnabled) {
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
(() => {
    'use strict';

    const root = typeof unsafeWindow !== 'undefined' ? unsafeWindow : globalThis;
    if (root.__dcufWriteDefaultsAttached) return;
    root.__dcufWriteDefaultsAttached = true;

    if (!/\/board\/write(?:\/|$)/.test(window.location.pathname || '')) return;

    const activatePumx = () => {
        const button = document.getElementById('btn_pumx');
        if (!(button instanceof HTMLButtonElement)) return false;
        if (button.dataset.dcufPumxDefaultActivated === '1') return true;

        button.dataset.dcufPumxDefaultActivated = '1';
        button.click();
        return true;
    };

    const start = () => {
        if (activatePumx()) return;

        const observer = new MutationObserver(() => {
            if (activatePumx()) observer.disconnect();
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
        window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
})();
    // PC-only filter UI adapter rail.
    //
    // The visual rules for settings, shortcut modal, personal-block FAB,
    // selection popup, management panel, and backup popup are owned by the
    // marked sections in targets/mobile/filter-module.js. The PC builder
    // extracts those sections verbatim so the two targets cannot drift.
    // Add rules here only for a verified PC host-DOM difference; do not copy
    // shared filter UI declarations back into this file.
    // Extracted verbatim from the mobile-owned filter UI style rail.
    GM_addStyle(`
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
        #dc-selection-popup .block-option button { font-size: 14px; padding: 6px 12px; cursor: pointer; border: none; border-radius: 6px; background-color: var(--dcuf-theme-accent-strong, #4263eb); color: var(--dcuf-theme-on-accent, #fff); font-weight: 500; }
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
        #dc-block-management-panel .switch-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; box-sizing: border-box; border: 1px solid transparent; background-color: #ccc; transition: .25s; border-radius: 22px; }
        #dcinside-filter-setting .switch-slider:before,
        #dc-block-management-panel .switch-slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 2px; bottom: 2px; background-color: white; transition: .25s; border-radius: 50%; box-shadow: 0 1px 4px rgba(15, 23, 42, .38); }
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

        /* [v1.9.9] Script-owned soft-depth control surfaces */
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
            background: var(--dcuf-theme-accent, #4d7cff) !important;
        }

        /* 5. 스크립트 팝업창 전체 다크 테마 */
        body.dc-filter-dark-mode #dcinside-filter-setting,
        body.dc-filter-dark-mode #dcinside-headtext-manager-panel,
        body.dc-filter-dark-mode #dc-selection-popup,
        body.dc-filter-dark-mode #dc-block-management-panel,
        body.dc-filter-dark-mode #dc-backup-popup,
        body.dc-filter-dark-mode #dcinside-shortcut-modal {
            background-color: #2d2d2d !important;
            color: #e0e0e0 !important;
            border-color: #555 !important;
            box-shadow: 0 0 15px rgba(0,0,0,0.7) !important;
        }
        body.dc-filter-dark-mode #dcinside-headtext-manager-panel input,
        body.dc-filter-dark-mode #dcinside-headtext-manager-panel button {
            background:#343a44 !important;
            color:#e6edf7 !important;
            border-color:#596474 !important;
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
    `);
const ThemeModule = (() => {
    const STORAGE_KEY = 'dcuf_mobile_ui_palette';
    const ROOT_ATTRIBUTE = 'data-dcuf-palette';
    const STYLE_ID = 'dcuf-mobile-palette-style';
    const OVERLAY_ID = 'dcuf-palette-overlay';
    const PANEL_ID = 'dcuf-palette-panel';
    const DEFAULT_ID = 'blue';
    const PRESETS = Object.freeze([
        Object.freeze({ id: 'blue', label: '기본 블루', light: ['#3f6de0', '#245bda', '#eaf1ff'], dark: ['#8cb4ff', '#3868df', '#243a64'] }),
        Object.freeze({ id: 'purple', label: '퍼플', light: ['#7c3aed', '#6d28d9', '#f3e8ff'], dark: ['#c4b5fd', '#7c3aed', '#39275a'] }),
        Object.freeze({ id: 'green', label: '그린', light: ['#16805d', '#047857', '#e7f7ef'], dark: ['#6ee7b7', '#047857', '#173c32'] }),
        Object.freeze({ id: 'orange', label: '오렌지', light: ['#c2410c', '#9a3412', '#fff0e7'], dark: ['#fdba74', '#c2410c', '#4a2a1b'] }),
        Object.freeze({ id: 'mono', label: '모노톤', light: ['#526274', '#374151', '#eef2f7'], dark: ['#cbd5e1', '#475569', '#28323f'] }),
        Object.freeze({ id: 'indigo', label: '인디고', light: ['#4f46e5', '#4338ca', '#eef2ff'], dark: ['#4f46e5', '#3730a3', '#29274f'] }),
        Object.freeze({ id: 'sky', label: '스카이', light: ['#0284c7', '#0369a1', '#e0f2fe'], dark: ['#0369a1', '#075985', '#17384a'] }),
        Object.freeze({ id: 'cyan', label: '시안', light: ['#0891b2', '#0e7490', '#ecfeff'], dark: ['#0e7490', '#155e75', '#173b44'] }),
        Object.freeze({ id: 'teal', label: '틸', light: ['#0f766e', '#115e59', '#e6f7f4'], dark: ['#0f766e', '#115e59', '#173c38'] }),
        Object.freeze({ id: 'lime', label: '라임', light: ['#65a30d', '#4d7c0f', '#f7fee7'], dark: ['#4d7c0f', '#3f6212', '#2c3918'] }),
        Object.freeze({ id: 'amber', label: '앰버', light: ['#d97706', '#b45309', '#fffbeb'], dark: ['#b45309', '#92400e', '#493016'] }),
        Object.freeze({ id: 'red', label: '레드', light: ['#dc2626', '#b91c1c', '#fef2f2'], dark: ['#c62828', '#991b1b', '#4a2020'] }),
        Object.freeze({ id: 'rose', label: '로즈', light: ['#e11d48', '#be123c', '#fff1f2'], dark: ['#cf234c', '#9f1239', '#4a202d'] }),
        Object.freeze({ id: 'pink', label: '핑크', light: ['#db2777', '#be185d', '#fce7f3'], dark: ['#c52a72', '#9d174d', '#472138'] })
    ]);
    const VALID_IDS = new Set(PRESETS.map((preset) => preset.id));

    let committedId = DEFAULT_ID;
    let writeRevision = 0;
    let initialReadSettled = false;
    let initialReadPromise = null;
    let domReadyApplyScheduled = false;

    const normalize = (value) => typeof value === 'string' && VALID_IDS.has(value) ? value : DEFAULT_ID;

    const apply = (value, reason = 'apply') => {
        const id = normalize(value);
        const root = document.documentElement;
        if (root) root.setAttribute(ROOT_ATTRIBUTE, id);
        else if (!domReadyApplyScheduled) {
            domReadyApplyScheduled = true;
            document.addEventListener('DOMContentLoaded', () => {
                domReadyApplyScheduled = false;
                apply(committedId, 'dom-ready');
            }, { once: true });
        }
        window.__dcufActivePalette = id;
        window.dispatchEvent(new CustomEvent('dcuf:palette-change', { detail: { id, reason } }));
        return id;
    };

    const buildPresetVariables = () => PRESETS.map((preset) => {
        const [accent, strong, soft, onAccent = '#fff'] = preset.light;
        const [darkAccent, darkStrong, darkSoft, darkOnAccent = '#fff'] = preset.dark;
        return `
            html[${ROOT_ATTRIBUTE}="${preset.id}"] {
                --dcuf-theme-accent: ${accent};
                --dcuf-theme-accent-strong: ${strong};
                --dcuf-theme-accent-soft: ${soft};
                --dcuf-theme-on-accent: ${onAccent};
            }
            html[${ROOT_ATTRIBUTE}="${preset.id}"].dc-filter-dark-mode,
            html[${ROOT_ATTRIBUTE}="${preset.id}"] body.dc-filter-dark-mode {
                --dcuf-theme-accent: ${darkAccent};
                --dcuf-theme-accent-strong: ${darkStrong};
                --dcuf-theme-accent-soft: ${darkSoft};
                --dcuf-theme-on-accent: ${darkOnAccent};
            }
        `;
    }).join('\n');

    const buildCss = () => `
        ${buildPresetVariables()}

        html[${ROOT_ATTRIBUTE}] {
            --dcuf-theme-fg: #27313f;
            --dcuf-theme-fg-muted: #687384;
            --dcuf-theme-border: color-mix(in srgb, var(--dcuf-theme-accent) 7%, #d9dde3);
            --dcuf-theme-border-strong: color-mix(in srgb, var(--dcuf-theme-accent) 14%, #cbd2db);
            --dcuf-theme-page: #f6f7f9;
            --dcuf-theme-surface: color-mix(in srgb, var(--dcuf-theme-accent-soft) 8%, #f7f8fa);
            --dcuf-theme-surface-raised: color-mix(in srgb, var(--dcuf-theme-accent-soft) 12%, #fbfcfd);
            --dcuf-theme-surface-muted: color-mix(in srgb, var(--dcuf-theme-accent-soft) 9%, #f1f3f6);
            --dcuf-theme-surface-input: color-mix(in srgb, var(--dcuf-theme-accent-soft) 2%, #fff);
            --dcuf-theme-canvas: color-mix(in srgb, var(--dcuf-theme-accent-soft) 14%, #f6f7f9);
            --dcuf-theme-card-top: color-mix(in srgb, var(--dcuf-theme-accent-soft) 1%, #fff);
            --dcuf-theme-card-bottom: color-mix(in srgb, var(--dcuf-theme-accent-soft) 4%, #fafbfc);
            --dcuf-theme-article-surface: color-mix(in srgb, var(--dcuf-theme-accent-soft) 6%, #f8f9fb);
            --dcuf-theme-concept-surface: color-mix(in srgb, var(--dcuf-theme-accent-soft) 7%, #fff);
            --dcuf-theme-notice-surface: #f2f4f7;
            --dcuf-theme-reply-surface: color-mix(in srgb, var(--dcuf-theme-accent-soft) 10%, #f4f6f8);
            --dcuf-theme-card-shadow: 0 1px 3px rgba(31, 41, 55, .07), 0 6px 16px rgba(31, 41, 55, .075);
            --dcuf-theme-panel-shadow: 0 18px 42px rgba(31, 41, 55, .16), 0 3px 9px rgba(31, 41, 55, .09);
            --dcuf-theme-primary-top: color-mix(in srgb, var(--dcuf-theme-accent) 78%, white);
            --dcuf-theme-focus-ring: color-mix(in srgb, var(--dcuf-theme-accent) 18%, transparent);
            --dcuf-theme-accent-shadow: color-mix(in srgb, var(--dcuf-theme-accent-strong) 25%, transparent);
        }
        html[${ROOT_ATTRIBUTE}].dc-filter-dark-mode,
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode {
            --dcuf-theme-fg: #edf2f7;
            --dcuf-theme-fg-muted: #aeb8c4;
            --dcuf-theme-border: color-mix(in srgb, var(--dcuf-theme-accent) 7%, #3a4149);
            --dcuf-theme-border-strong: color-mix(in srgb, var(--dcuf-theme-accent) 14%, #4b525b);
            --dcuf-theme-page: #121417;
            --dcuf-theme-surface: color-mix(in srgb, var(--dcuf-theme-accent-soft) 5%, #1b1f24);
            --dcuf-theme-surface-raised: color-mix(in srgb, var(--dcuf-theme-accent-soft) 8%, #22262c);
            --dcuf-theme-surface-muted: color-mix(in srgb, var(--dcuf-theme-accent-soft) 6%, #1d2228);
            --dcuf-theme-surface-input: color-mix(in srgb, var(--dcuf-theme-accent-soft) 2%, #171b20);
            --dcuf-theme-canvas: color-mix(in srgb, var(--dcuf-theme-accent-soft) 10%, #171a1f);
            --dcuf-theme-card-top: color-mix(in srgb, var(--dcuf-theme-accent-soft) 3%, #24272d);
            --dcuf-theme-card-bottom: color-mix(in srgb, var(--dcuf-theme-accent-soft) 4%, #20242a);
            --dcuf-theme-article-surface: color-mix(in srgb, var(--dcuf-theme-accent-soft) 5%, #1a1e23);
            --dcuf-theme-concept-surface: color-mix(in srgb, var(--dcuf-theme-accent-soft) 8%, #22262c);
            --dcuf-theme-notice-surface: #252a31;
            --dcuf-theme-reply-surface: color-mix(in srgb, var(--dcuf-theme-accent-soft) 10%, #21262c);
            --dcuf-theme-card-shadow: 0 1px 3px rgba(0,0,0,.28), 0 7px 18px rgba(0,0,0,.22);
            --dcuf-theme-panel-shadow: 0 20px 46px rgba(0,0,0,.44), 0 3px 9px rgba(0,0,0,.24);
            --dcuf-theme-primary-top: color-mix(in srgb, var(--dcuf-theme-accent) 68%, white);
        }

        /* DCUF_MOBILE_THEME_CSS_START */
        /* Mobile host palette CSS removed by the PC port rail. */
        /* DCUF_MOBILE_THEME_CSS_END */

        /* DCUF_SHARED_PALETTE_UI_START */
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting #dcinside-threshold-save,
        html[${ROOT_ATTRIBUTE}] body #dcinside-shortcut-modal #dcinside-save-shortcut-btn,
        html[${ROOT_ATTRIBUTE}] body #dc-personal-block-size-panel [data-dcuf-fab-size-action="save"],
        html[${ROOT_ATTRIBUTE}] body #dc-selection-popup .block-option button:not(.btn-unblock),
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel .panel-save-btn,
        html[${ROOT_ATTRIBUTE}] body #dc-backup-popup :is(.export-btn, .import-btn),
        html[${ROOT_ATTRIBUTE}] body #dc-manual-block-panel .dcuf-manual-actions [data-manual-block-action="add"],
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting #dcinside-proxy-ip-block-mode-group button[data-proxy-mode][aria-pressed="true"] {
            border-color: var(--dcuf-theme-accent-strong) !important;
            background-color: var(--dcuf-theme-accent-strong) !important;
            background-image: linear-gradient(180deg, var(--dcuf-theme-primary-top), var(--dcuf-theme-accent-strong)) !important;
            color: var(--dcuf-theme-on-accent) !important;
            box-shadow: 0 7px 16px var(--dcuf-theme-accent-shadow) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel input:checked + .switch-slider,
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting input:checked + .switch-slider {
            border-color: var(--dcuf-theme-accent-strong) !important;
            background-color: var(--dcuf-theme-accent-strong) !important;
            background-image: linear-gradient(180deg, var(--dcuf-theme-primary-top), var(--dcuf-theme-accent-strong)) !important;
            box-shadow: 0 3px 9px var(--dcuf-theme-accent-shadow), inset 0 1px 0 color-mix(in srgb, white 28%, transparent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel input:checked + .switch-slider::before,
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting input:checked + .switch-slider::before {
            background: #fff !important;
            box-shadow: 0 1px 4px rgba(15, 23, 42, .5) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel .panel-tab.active {
            border-color: var(--dcuf-theme-accent) !important;
            background-color: var(--dcuf-theme-accent-soft) !important;
            background-image: none !important;
            color: var(--dcuf-theme-accent-strong) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-personal-block-fab {
            border-color: var(--dcuf-theme-accent) !important;
            background: linear-gradient(180deg, var(--dcuf-theme-card-top), var(--dcuf-theme-surface-raised)) !important;
            color: var(--dcuf-theme-accent-strong) !important;
            box-shadow: 0 8px 20px var(--dcuf-theme-accent-shadow) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-personal-block-drawer button:is(:hover, :focus-visible),
        html[${ROOT_ATTRIBUTE}] body #dc-manual-block-panel [data-manual-block-type][aria-pressed="true"] {
            border-color: var(--dcuf-theme-accent) !important;
            background: var(--dcuf-theme-accent-soft) !important;
            color: var(--dcuf-theme-accent-strong) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-backup-popup .export-btn-download {
            border-color: color-mix(in srgb, var(--dcuf-theme-accent) 30%, transparent) !important;
            background: var(--dcuf-theme-accent-soft) !important;
            color: var(--dcuf-theme-accent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-backup-popup .export-btn-download:hover {
            border-color: color-mix(in srgb, var(--dcuf-theme-accent) 45%, transparent) !important;
            background: color-mix(in srgb, var(--dcuf-theme-accent) 18%, var(--dcuf-theme-accent-soft)) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-personal-block-drawer {
            border-color: var(--dcuf-theme-border-strong) !important;
            background-color: var(--dcuf-theme-card-bottom) !important;
            background-image: linear-gradient(145deg, var(--dcuf-theme-card-top), var(--dcuf-theme-card-bottom)) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-personal-block-drawer .dcuf-menu-icon,
        html[${ROOT_ATTRIBUTE}] body #dc-selection-popup .dcuf-selection-prompt-icon {
            border-color: color-mix(in srgb, var(--dcuf-theme-accent) 28%, transparent) !important;
            background: linear-gradient(145deg, var(--dcuf-theme-card-top), var(--dcuf-theme-accent-soft)) !important;
            color: var(--dcuf-theme-accent) !important;
            box-shadow: 0 5px 11px color-mix(in srgb, var(--dcuf-theme-accent) 18%, transparent), inset 0 1px 0 color-mix(in srgb, white 70%, transparent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-manual-block-panel {
            border-color: var(--dcuf-theme-border-strong) !important;
            background-color: var(--dcuf-theme-card-bottom) !important;
            background-image: linear-gradient(155deg, var(--dcuf-theme-card-top), var(--dcuf-theme-card-bottom)) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-manual-block-panel .dcuf-manual-header {
            border-color: var(--dcuf-theme-border) !important;
            background: linear-gradient(135deg, var(--dcuf-theme-accent-soft), var(--dcuf-theme-card-top)) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-manual-block-panel .dcuf-manual-type-tabs {
            border-color: color-mix(in srgb, var(--dcuf-theme-accent) 24%, var(--dcuf-theme-border)) !important;
            background: color-mix(in srgb, var(--dcuf-theme-accent-soft) 68%, var(--dcuf-theme-surface-muted)) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-manual-block-panel .dcuf-manual-status[data-state="info"],
        html[${ROOT_ATTRIBUTE}] body #dc-manual-block-panel .dcuf-manual-kicker,
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel .panel-kicker {
            color: var(--dcuf-theme-accent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel .panel-add-btn {
            border-color: color-mix(in srgb, var(--dcuf-theme-accent) 30%, transparent) !important;
            background: var(--dcuf-theme-accent-soft) !important;
            color: var(--dcuf-theme-accent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel :is(.select-all-btn, .select-all-global-btn, .panel-backup-btn):hover,
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel .blocked-item:not(.item-to-delete):hover {
            border-color: color-mix(in srgb, var(--dcuf-theme-accent) 28%, transparent) !important;
            background: color-mix(in srgb, var(--dcuf-theme-accent-soft) 72%, var(--dcuf-theme-card-top)) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-selection-popup.dcuf-selection-prompt {
            border-color: color-mix(in srgb, var(--dcuf-theme-accent) 34%, transparent) !important;
            background-color: var(--dcuf-theme-card-bottom) !important;
            background-image: linear-gradient(145deg, var(--dcuf-theme-card-top), var(--dcuf-theme-accent-soft)) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-manual-block-panel .dcuf-manual-field input:focus {
            border-color: var(--dcuf-theme-accent) !important;
            box-shadow: 0 0 0 3px var(--dcuf-theme-focus-ring) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting :is(input, button):focus-visible,
        html[${ROOT_ATTRIBUTE}] body #dcinside-shortcut-modal :is(input, button):focus-visible,
        html[${ROOT_ATTRIBUTE}] body #dc-personal-block-size-panel :is(input, button):focus-visible,
        html[${ROOT_ATTRIBUTE}] body #dc-personal-block-drawer button:focus-visible,
        html[${ROOT_ATTRIBUTE}] body #dc-selection-popup button:focus-visible,
        html[${ROOT_ATTRIBUTE}] body #dc-manual-block-panel :is(input, button):focus-visible,
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel :is(input, button):focus-visible,
        html[${ROOT_ATTRIBUTE}] body #dc-backup-popup :is(input, textarea, button):focus-visible {
            outline: 3px solid var(--dcuf-theme-focus-ring) !important;
            outline-offset: 2px !important;
        }

        /* Script-owned management surfaces use the same neutralized card hierarchy. */
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting,
        html[${ROOT_ATTRIBUTE}] body #dc-backup-popup,
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel {
            border-color: var(--dcuf-theme-border-strong) !important;
            background-color: var(--dcuf-theme-canvas) !important;
            background-image: linear-gradient(160deg, var(--dcuf-theme-card-top), var(--dcuf-theme-canvas)) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: var(--dcuf-theme-panel-shadow) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting :is(.dcuf-settings-header, .dcuf-settings-footer),
        html[${ROOT_ATTRIBUTE}] body #dc-backup-popup .popup-header,
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel :is(.panel-header, .panel-tabs, .panel-footer) {
            border-color: var(--dcuf-theme-border) !important;
            background-color: var(--dcuf-theme-surface-raised) !important;
            background-image: linear-gradient(180deg, var(--dcuf-theme-card-top), var(--dcuf-theme-surface-raised)) !important;
            color: var(--dcuf-theme-fg) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting :is(.dcuf-settings-section, .dcuf-settings-threshold > div:last-child, .dcuf-settings-guest-controls),
        html[${ROOT_ATTRIBUTE}] body #dc-backup-popup :is(.export-section, .import-section),
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel :is(.panel-list-controls, .blocked-item) {
            border-color: var(--dcuf-theme-border) !important;
            background-color: var(--dcuf-theme-card-top) !important;
            background-image: linear-gradient(145deg, var(--dcuf-theme-card-top), var(--dcuf-theme-card-bottom)) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: 0 5px 14px color-mix(in srgb, var(--dcuf-theme-accent-strong) 5%, transparent), inset 0 1px 0 color-mix(in srgb, white 60%, transparent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #dcinside-filter-setting :is(.dcuf-settings-section, .dcuf-settings-threshold > div:last-child, .dcuf-settings-guest-controls),
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #dc-backup-popup :is(.export-section, .import-section),
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #dc-block-management-panel :is(.panel-list-controls, .blocked-item) {
            box-shadow: 0 6px 15px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.045) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel :is(.panel-body, .panel-content, .blocked-list) {
            background-color: var(--dcuf-theme-canvas) !important;
            background-image: none !important;
            color: var(--dcuf-theme-fg) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel .panel-tab:not(.active),
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel :is(.select-all-btn, .select-all-global-btn, .panel-backup-btn),
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting button:not(#dcinside-threshold-save):not([aria-pressed="true"]),
        html[${ROOT_ATTRIBUTE}] body #dc-backup-popup button:not(.export-btn):not(.export-btn-download):not(.import-btn):not(.delete-item-btn) {
            border-color: var(--dcuf-theme-border-strong) !important;
            background-color: var(--dcuf-theme-surface-input) !important;
            background-image: linear-gradient(180deg, var(--dcuf-theme-card-top), var(--dcuf-theme-surface-input)) !important;
            color: var(--dcuf-theme-fg) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting :is(input, textarea, select),
        html[${ROOT_ATTRIBUTE}] body #dc-backup-popup :is(.import-file-input, textarea),
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel :is(.panel-search-input, input:not([type="checkbox"])) {
            border-color: var(--dcuf-theme-border-strong) !important;
            background-color: var(--dcuf-theme-surface-input) !important;
            background-image: none !important;
            color: var(--dcuf-theme-fg) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting #dcinside-threshold-input,
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting #dcinside-ratio-min,
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting #dcinside-ratio-max {
            border-color: var(--dcuf-theme-border-strong) !important;
            background-color: var(--dcuf-theme-surface-input) !important;
            background-image: none !important;
            color: var(--dcuf-theme-fg) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting :is(.dcuf-settings-description, .dcuf-settings-help, small),
        html[${ROOT_ATTRIBUTE}] body #dc-backup-popup .description,
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel :is(.panel-list-summary, .blocked-list-empty) {
            color: var(--dcuf-theme-fg-muted) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel .blocked-item.item-to-delete {
            border-color: #efb9c1 !important;
            background: #fff5f6 !important;
        }
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #dc-block-management-panel .blocked-item.item-to-delete {
            border-color: #7f3d48 !important;
            background: #372127 !important;
        }
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #dc-personal-block-drawer,
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #dc-manual-block-panel,
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #dc-selection-popup.dcuf-selection-prompt {
            border-color: var(--dcuf-theme-border-strong) !important;
            background-color: var(--dcuf-theme-card-bottom) !important;
            background-image: linear-gradient(145deg, var(--dcuf-theme-card-top), var(--dcuf-theme-card-bottom)) !important;
        }
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #dc-manual-block-panel .dcuf-manual-header,
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #dc-manual-block-panel .dcuf-manual-type-tabs {
            border-color: var(--dcuf-theme-border) !important;
            background: var(--dcuf-theme-surface-muted) !important;
        }
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #dc-personal-block-drawer .dcuf-menu-icon,
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #dc-selection-popup .dcuf-selection-prompt-icon {
            border-color: var(--dcuf-theme-border-strong) !important;
            background: linear-gradient(145deg, var(--dcuf-theme-card-top), var(--dcuf-theme-surface-raised)) !important;
            color: var(--dcuf-theme-accent) !important;
        }
        /* DCUF_SHARED_PALETTE_UI_END */

        #${OVERLAY_ID} {
            position: fixed !important;
            inset: 0 !important;
            z-index: 2147483646 !important;
            box-sizing: border-box !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left)) !important;
            background: rgba(18, 25, 35, .52) !important;
            backdrop-filter: blur(3px);
            pointer-events: auto !important;
        }
        #${PANEL_ID} {
            box-sizing: border-box !important;
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%);
            display: flex !important;
            flex-direction: column !important;
            width: min(520px, calc(100vw - 32px)) !important;
            height: min(680px, calc(100dvh - 32px)) !important;
            min-width: min(300px, calc(100vw - 16px)) !important;
            min-height: min(360px, calc(100dvh - 16px)) !important;
            max-height: calc(100dvh - 32px) !important;
            overflow: hidden !important;
            padding: 0 !important;
            border: 1px solid var(--dcuf-theme-border-strong) !important;
            border-radius: 20px !important;
            background: var(--dcuf-theme-card-top) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: var(--dcuf-theme-panel-shadow) !important;
            font: 500 14px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        }
        #${PANEL_ID}[data-dcuf-palette-interacting="true"] { transition: none !important; animation: none !important; }
        #${PANEL_ID} .dcuf-palette-header {
            flex: 0 0 auto !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 12px !important;
            padding: 18px 18px 14px !important;
            border-bottom: 1px solid var(--dcuf-theme-border) !important;
            background: linear-gradient(180deg, var(--dcuf-theme-card-top), var(--dcuf-theme-surface-raised)) !important;
            cursor: move !important;
            touch-action: none !important;
            user-select: none !important;
        }
        #${PANEL_ID} h2 { margin: 0 !important; color: inherit !important; font-size: 20px !important; line-height: 1.2 !important; }
        #${PANEL_ID} .dcuf-palette-close {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 44px !important;
            height: 44px !important;
            min-width: 44px !important;
            padding: 0 !important;
            border: 1px solid transparent !important;
            border-radius: 12px !important;
            background: transparent !important;
            color: var(--dcuf-theme-fg-muted) !important;
            font-size: 24px !important;
            cursor: pointer !important;
        }
        #${PANEL_ID} .dcuf-palette-body {
            box-sizing: border-box !important;
            display: flex !important;
            flex: 1 1 auto !important;
            flex-direction: column !important;
            min-height: 0 !important;
            padding: 16px 18px 38px !important;
            overflow: hidden !important;
        }
        #${PANEL_ID} .dcuf-palette-description { margin: 0 0 14px !important; color: var(--dcuf-theme-fg-muted) !important; }
        #${PANEL_ID} .dcuf-palette-options {
            display: grid !important;
            flex: 1 1 auto !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            align-content: start !important;
            min-height: 0 !important;
            gap: 10px !important;
            padding: 2px 4px 6px 2px !important;
            overflow: hidden auto !important;
            overscroll-behavior: contain !important;
            scrollbar-gutter: stable !important;
            touch-action: pan-y !important;
            -webkit-overflow-scrolling: touch;
        }
        #${PANEL_ID} .dcuf-palette-option {
            box-sizing: border-box !important;
            display: grid !important;
            grid-template-columns: 50px minmax(0, 1fr) !important;
            align-items: center !important;
            gap: 11px !important;
            min-height: 70px !important;
            padding: 10px !important;
            border: 1px solid var(--dcuf-theme-border) !important;
            border-radius: 14px !important;
            background: var(--dcuf-theme-surface-input) !important;
            color: var(--dcuf-theme-fg) !important;
            text-align: left !important;
            cursor: pointer !important;
        }
        #${PANEL_ID} .dcuf-palette-option[aria-checked="true"] {
            border-color: var(--dcuf-theme-accent) !important;
            background: var(--dcuf-theme-accent-soft) !important;
            color: var(--dcuf-theme-accent-strong) !important;
            box-shadow: 0 0 0 2px color-mix(in srgb, var(--dcuf-theme-accent) 18%, transparent) !important;
        }
        #${PANEL_ID} .dcuf-palette-swatch {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            width: 48px !important;
            height: 38px !important;
            overflow: hidden !important;
            border: 1px solid rgba(0,0,0,.09) !important;
            border-radius: 10px !important;
        }
        #${PANEL_ID} .dcuf-palette-swatch > span { display: block !important; }
        #${PANEL_ID} .dcuf-palette-name { font-weight: 800 !important; }
        #${PANEL_ID} .dcuf-palette-status { min-height: 20px !important; margin: 12px 2px 0 !important; color: #d7485a !important; font-weight: 700 !important; }
        #${PANEL_ID} .dcuf-palette-actions { display: grid !important; grid-template-columns: 1fr 1fr 1.2fr !important; gap: 9px !important; margin-top: 4px !important; }
        #${PANEL_ID} .dcuf-palette-actions button {
            min-height: 44px !important;
            padding: 8px 10px !important;
            border: 1px solid var(--dcuf-theme-border-strong) !important;
            border-radius: 11px !important;
            background: var(--dcuf-theme-surface-input) !important;
            color: var(--dcuf-theme-fg) !important;
            font-weight: 800 !important;
            cursor: pointer !important;
        }
        #${PANEL_ID} .dcuf-palette-actions [data-dcuf-palette-action="save"] {
            border-color: var(--dcuf-theme-accent-strong) !important;
            background: var(--dcuf-theme-accent-strong) !important;
            color: var(--dcuf-theme-on-accent) !important;
        }
        #${PANEL_ID} .dcuf-palette-resize-handle {
            position: absolute !important;
            right: 4px !important;
            bottom: 4px !important;
            width: 36px !important;
            height: 30px !important;
            border: 0 !important;
            border-radius: 9px !important;
            background:
                linear-gradient(135deg, transparent 50%, var(--dcuf-theme-border-strong) 51%, var(--dcuf-theme-border-strong) 56%, transparent 57%) 13px 7px / 15px 15px no-repeat,
                linear-gradient(135deg, transparent 50%, var(--dcuf-theme-accent) 51%, var(--dcuf-theme-accent) 57%, transparent 58%) 20px 14px / 10px 10px no-repeat !important;
            cursor: nwse-resize !important;
            touch-action: none !important;
        }
        #${PANEL_ID} :focus-visible { outline: 3px solid color-mix(in srgb, var(--dcuf-theme-accent) 38%, transparent) !important; outline-offset: 2px !important; }
        #${PANEL_ID} button:disabled { opacity: .62 !important; cursor: wait !important; }

        body.dc-filter-dark-mode #${PANEL_ID} {
            border-color: var(--dcuf-theme-border-strong) !important;
            background: var(--dcuf-theme-card-top) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: var(--dcuf-theme-panel-shadow) !important;
        }
        body.dc-filter-dark-mode #${PANEL_ID} .dcuf-palette-header { border-color: var(--dcuf-theme-border) !important; background: linear-gradient(180deg, var(--dcuf-theme-card-top), var(--dcuf-theme-surface-raised)) !important; }
        body.dc-filter-dark-mode #${PANEL_ID} .dcuf-palette-description { color: var(--dcuf-theme-fg-muted) !important; }
        body.dc-filter-dark-mode #${PANEL_ID} .dcuf-palette-close { color: var(--dcuf-theme-fg) !important; }
        body.dc-filter-dark-mode #${PANEL_ID} .dcuf-palette-option { border-color: var(--dcuf-theme-border) !important; background: var(--dcuf-theme-surface-input) !important; color: var(--dcuf-theme-fg) !important; }
        body.dc-filter-dark-mode #${PANEL_ID} .dcuf-palette-option[aria-checked="true"] { border-color: var(--dcuf-theme-accent) !important; background: var(--dcuf-theme-accent-soft) !important; color: var(--dcuf-theme-accent) !important; }
        body.dc-filter-dark-mode #${PANEL_ID} .dcuf-palette-actions button { border-color: var(--dcuf-theme-border-strong) !important; background: var(--dcuf-theme-surface-input) !important; color: var(--dcuf-theme-fg) !important; }
        body.dc-filter-dark-mode #${PANEL_ID} .dcuf-palette-actions [data-dcuf-palette-action="save"] { border-color: var(--dcuf-theme-accent-strong) !important; background: var(--dcuf-theme-accent-strong) !important; color: var(--dcuf-theme-on-accent) !important; }

        @media (max-width: 440px) {
            #${PANEL_ID} .dcuf-palette-options { grid-template-columns: 1fr !important; }
        }
        @media (prefers-reduced-motion: reduce) {
            #${OVERLAY_ID}, #${PANEL_ID}, #${PANEL_ID} * { scroll-behavior: auto !important; transition: none !important; animation: none !important; }
        }
    `;

    const ensureStyle = () => {
        if (document.getElementById(STYLE_ID)) return true;
        const mount = document.head || document.documentElement;
        if (!mount) return false;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = buildCss();
        mount.appendChild(style);
        return true;
    };

    const beginInitialRead = () => {
        if (initialReadPromise) return initialReadPromise;
        const revisionAtStart = writeRevision;
        initialReadPromise = Promise.resolve()
            .then(() => GM_getValue(STORAGE_KEY, DEFAULT_ID))
            .then((value) => {
                initialReadSettled = true;
                if (writeRevision !== revisionAtStart) return committedId;
                committedId = normalize(value);
                if (!document.getElementById(OVERLAY_ID)) apply(committedId, 'storage-load');
                return committedId;
            })
            .catch((error) => {
                initialReadSettled = true;
                console.warn('[DCUF] palette storage read failed; using blue:', error);
                return committedId;
            });
        return initialReadPromise;
    };

    const setSelectedOption = (panel, id) => {
        const normalized = apply(id, 'preview');
        panel.dataset.selectedPalette = normalized;
        panel.querySelectorAll('.dcuf-palette-option').forEach((option) => {
            option.setAttribute('aria-checked', option.dataset.paletteId === normalized ? 'true' : 'false');
        });
        return normalized;
    };

    const attachPanelPointerGeometry = (panel) => {
        if (!panel || panel.dataset.dcufPaletteGeometryBound === 'true') return;
        panel.dataset.dcufPaletteGeometryBound = 'true';

        const viewportGap = 4;
        let active = null;
        let pendingPoint = null;
        let frameId = 0;

        const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
        const viewportSize = () => ({ width: window.innerWidth, height: window.innerHeight });
        const normalizePosition = () => {
            const rect = panel.getBoundingClientRect();
            panel.style.setProperty('transform', 'none', 'important');
            panel.style.setProperty('left', `${rect.left}px`, 'important');
            panel.style.setProperty('top', `${rect.top}px`, 'important');
            panel.style.setProperty('width', `${rect.width}px`, 'important');
            panel.style.setProperty('height', `${rect.height}px`, 'important');
            return panel.getBoundingClientRect();
        };

        const applyGeometry = () => {
            frameId = 0;
            if (!active || !pendingPoint) return;
            const point = pendingPoint;
            pendingPoint = null;
            const viewport = viewportSize();

            if (active.mode === 'drag') {
                const maxLeft = Math.max(viewportGap, viewport.width - active.width - viewportGap);
                const maxTop = Math.max(viewportGap, viewport.height - active.height - viewportGap);
                panel.style.setProperty('left', `${clamp(point.x - active.offsetX, viewportGap, maxLeft)}px`, 'important');
                panel.style.setProperty('top', `${clamp(point.y - active.offsetY, viewportGap, maxTop)}px`, 'important');
                return;
            }

            const maxWidth = Math.max(120, viewport.width - active.left - viewportGap);
            const maxHeight = Math.max(120, viewport.height - active.top - viewportGap);
            const minWidth = Math.min(300, maxWidth);
            const minHeight = Math.min(320, maxHeight);
            const nextWidth = clamp(active.width + point.x - active.startX, minWidth, maxWidth);
            const nextHeight = clamp(active.height + point.y - active.startY, minHeight, maxHeight);
            panel.style.setProperty('min-width', `${minWidth}px`, 'important');
            panel.style.setProperty('min-height', `${minHeight}px`, 'important');
            panel.style.setProperty('max-width', `${maxWidth}px`, 'important');
            panel.style.setProperty('max-height', `${maxHeight}px`, 'important');
            panel.style.setProperty('width', `${nextWidth}px`, 'important');
            panel.style.setProperty('height', `${nextHeight}px`, 'important');
        };

        const finishInteraction = (event) => {
            if (!active || (event && event.pointerId !== active.pointerId)) return;
            if (frameId) cancelAnimationFrame(frameId);
            applyGeometry();
            if (panel.hasPointerCapture?.(active.pointerId)) panel.releasePointerCapture(active.pointerId);
            active = null;
            pendingPoint = null;
            panel.removeAttribute('data-dcuf-palette-interacting');
        };

        const onPointerDown = (event) => {
            if (active || event.button !== 0 || event.isPrimary === false) return;
            const target = event.target instanceof Element ? event.target : null;
            if (!target) return;
            const resizeHandle = target.closest('.dcuf-palette-resize-handle');
            const dragHeader = target.closest('.dcuf-palette-header');
            if (!resizeHandle && (!dragHeader || target.closest('button, input, label, a'))) return;

            const rect = normalizePosition();
            active = {
                mode: resizeHandle ? 'resize' : 'drag',
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                offsetX: event.clientX - rect.left,
                offsetY: event.clientY - rect.top,
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height
            };
            panel.dataset.dcufPaletteInteracting = 'true';
            panel.setPointerCapture?.(event.pointerId);
            event.preventDefault();
        };

        const onPointerMove = (event) => {
            if (!active || event.pointerId !== active.pointerId) return;
            pendingPoint = { x: event.clientX, y: event.clientY };
            if (!frameId) frameId = requestAnimationFrame(applyGeometry);
            event.preventDefault();
        };

        const keepInsideViewport = () => {
            if (!panel.isConnected) return;
            const rect = normalizePosition();
            const viewport = viewportSize();
            const width = Math.min(rect.width, Math.max(120, viewport.width - (viewportGap * 2)));
            const height = Math.min(rect.height, Math.max(120, viewport.height - (viewportGap * 2)));
            panel.style.setProperty('width', `${width}px`, 'important');
            panel.style.setProperty('height', `${height}px`, 'important');
            panel.style.setProperty('left', `${clamp(rect.left, viewportGap, Math.max(viewportGap, viewport.width - width - viewportGap))}px`, 'important');
            panel.style.setProperty('top', `${clamp(rect.top, viewportGap, Math.max(viewportGap, viewport.height - height - viewportGap))}px`, 'important');
        };

        panel.addEventListener('pointerdown', onPointerDown);
        panel.addEventListener('pointermove', onPointerMove);
        panel.addEventListener('pointerup', finishInteraction);
        panel.addEventListener('pointercancel', finishInteraction);
        window.addEventListener('resize', keepInsideViewport, { passive: true });
        window.visualViewport?.addEventListener('resize', keepInsideViewport, { passive: true });
        panel.__dcufPaletteGeometryCleanup = () => {
            if (frameId) cancelAnimationFrame(frameId);
            window.removeEventListener('resize', keepInsideViewport);
            window.visualViewport?.removeEventListener('resize', keepInsideViewport);
        };
    };

    const closePaletteDialog = ({ restore = true } = {}) => {
        const overlay = document.getElementById(OVERLAY_ID);
        if (!overlay) return false;
        const returnFocus = overlay.__dcufReturnFocus;
        if (restore) apply(committedId, 'preview-cancel');
        overlay.querySelector(`#${PANEL_ID}`)?.__dcufPaletteGeometryCleanup?.();
        overlay.remove();
        if (returnFocus instanceof HTMLElement && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
        return true;
    };

    const openPaletteDialog = () => {
        ensureStyle();
        const existing = document.getElementById(PANEL_ID);
        if (existing) {
            existing.focus({ preventScroll: true });
            return existing;
        }

        const overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        overlay.__dcufReturnFocus = document.activeElement;

        const panel = document.createElement('section');
        panel.id = PANEL_ID;
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('aria-labelledby', 'dcuf-palette-title');
        panel.tabIndex = -1;

        const optionsHtml = PRESETS.map((preset) => `
            <button type="button" class="dcuf-palette-option" role="radio" aria-checked="false" data-palette-id="${preset.id}">
                <span class="dcuf-palette-swatch" aria-hidden="true">
                    <span style="background:${preset.light[0]}"></span>
                    <span style="background:${preset.light[1]}"></span>
                    <span style="background:${preset.light[2]}"></span>
                </span>
                <span class="dcuf-palette-name">${preset.label}</span>
            </button>
        `).join('');

        panel.innerHTML = `
            <div class="dcuf-palette-header">
                <h2 id="dcuf-palette-title">UI 색상 설정</h2>
                <button type="button" class="dcuf-palette-close" aria-label="UI 색상 설정 닫기">×</button>
            </div>
            <div class="dcuf-palette-body">
                <p class="dcuf-palette-description">색상을 선택해 미리 본 뒤 저장하세요.</p>
                <div class="dcuf-palette-options" role="radiogroup" aria-label="UI 색상 프리셋">${optionsHtml}</div>
                <p class="dcuf-palette-status" role="status" aria-live="polite"></p>
                <div class="dcuf-palette-actions">
                    <button type="button" data-dcuf-palette-action="default">기본값</button>
                    <button type="button" data-dcuf-palette-action="cancel">취소</button>
                    <button type="button" data-dcuf-palette-action="save">저장</button>
                </div>
            </div>
            <div class="dcuf-palette-resize-handle" role="separator" aria-label="UI 색상 설정 크기 조절"></div>
        `;
        overlay.appendChild(panel);
        (document.body || document.documentElement).appendChild(overlay);
        attachPanelPointerGeometry(panel);
        if (typeof PersonalBlockModule !== 'undefined' && typeof PersonalBlockModule.attachPopupPinchResize === 'function') {
            PersonalBlockModule.attachPopupPinchResize(panel, { minWidth: 300, minHeight: 320 });
        }
        setSelectedOption(panel, committedId);

        const status = panel.querySelector('.dcuf-palette-status');
        const saveButton = panel.querySelector('[data-dcuf-palette-action="save"]');
        const actionButtons = Array.from(panel.querySelectorAll('button'));

        panel.querySelectorAll('.dcuf-palette-option').forEach((option) => {
            option.addEventListener('click', () => {
                status.textContent = '';
                setSelectedOption(panel, option.dataset.paletteId);
            });
        });
        panel.querySelector('.dcuf-palette-close').addEventListener('click', () => closePaletteDialog({ restore: true }));
        panel.querySelector('[data-dcuf-palette-action="cancel"]').addEventListener('click', () => closePaletteDialog({ restore: true }));
        panel.querySelector('[data-dcuf-palette-action="default"]').addEventListener('click', () => {
            status.textContent = '';
            setSelectedOption(panel, DEFAULT_ID);
        });
        saveButton.addEventListener('click', async () => {
            const selectedId = normalize(panel.dataset.selectedPalette);
            actionButtons.forEach((button) => { button.disabled = true; });
            status.textContent = '';
            try {
                await GM_setValue(STORAGE_KEY, selectedId);
                writeRevision += 1;
                committedId = selectedId;
                apply(committedId, 'save');
                closePaletteDialog({ restore: false });
            } catch (error) {
                console.warn('[DCUF] palette storage write failed:', error);
                status.textContent = '색상 설정을 저장하지 못했습니다. 다시 시도해 주세요.';
                actionButtons.forEach((button) => { button.disabled = false; });
                saveButton.focus({ preventScroll: true });
            }
        });
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) closePaletteDialog({ restore: true });
        });
        panel.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closePaletteDialog({ restore: true });
                return;
            }
            if (event.key !== 'Tab') return;
            const focusable = actionButtons.filter((button) => !button.disabled && button.offsetParent !== null);
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });

        panel.querySelector(`.dcuf-palette-option[data-palette-id="${committedId}"]`)?.focus({ preventScroll: true });
        return panel;
    };

    apply(DEFAULT_ID, 'default');
    document.addEventListener('DOMContentLoaded', () => apply(committedId, 'dom-ready-sync'), { once: true });
    if (!ensureStyle()) document.addEventListener('DOMContentLoaded', ensureStyle, { once: true });
    beginInitialRead();

    return Object.freeze({
        STORAGE_KEY,
        PRESETS,
        DEFAULT_ID,
        normalize,
        apply,
        openPaletteDialog,
        closePaletteDialog,
        getCommittedId: () => committedId,
        isInitialReadSettled: () => initialReadSettled
    });
})();
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
        _blockedUidWriteTimerId: 0,
        _blockedUidDirtyGeneration: 0,
        _blockedUidPersistedGeneration: 0,
        _blockedUidDirtyUids: null,
        _blockedUidWriteWaiters: null,
        _blockedUidPagehideHandler: null,
        BLOCKED_UID_WRITE_DELAY: 120,
        _queuedObserverFilterItems: null,
        _queuedObserverFilterRafId: 0,
        _queuedObserverFilterTimerId: 0,
        _syncRefilterRafId: 0,
        _syncRefilterTimerIds: null,
        _settingsSignature: '',
        _hiddenAt: 0,
        _hiddenMutationGeneration: 0,
        _hiddenBody: null,
        _hiddenRecoverySurface: null,
        _hiddenBfcacheRecoveryId: 0,
        _visibilityCycleId: 0,
        _visibilityRecoveryPromise: null,
        VISIBILITY_LONG_RESTORE_MS: 5 * 60 * 1000,
        _krPrefixSet: null,
        _telecomPrefixSet: null,
        _proxyStrictPrefixSet: null,
        _proxyAggressiveExtraPrefixSet: null,
        _proxyAggressivePrefixSet: null,
        PROXY_MODE: DCUF_SHARED_IP.PROXY_MODE,
        PROXY_STRICT_PREFIXES: DCUF_SHARED_IP.PROXY_STRICT_PREFIXES,
        PROXY_AGGRESSIVE_EXTRA_PREFIXES: DCUF_SHARED_IP.PROXY_AGGRESSIVE_EXTRA_PREFIXES,
        KR_IP_RANGES: DCUF_SHARED_IP.KR_IP_RANGES,
        isMobile: () => false,
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
                const rangeSource = typeof this.KR_IP_RANGES === 'function'
                    ? this.KR_IP_RANGES()
                    : this.KR_IP_RANGES;
                Object.entries(rangeSource || {}).forEach(([first, ranges]) => {
                    ranges.forEach(([start, end]) => {
                        for (let second = start; second <= end; second += 1) {
                            prefixes.push(`${first}.${second}`);
                        }
                    });
                });
                this._krPrefixSet = new Set(prefixes);
                this.incrementRuntimeDiagnostic('filter.ipData.kr.decodes');
            }
            return this._krPrefixSet;
        },
        isForeignIpPrefix(ipPrefix) {
            return Boolean(ipPrefix) && !this.getKrPrefixSet().has(ipPrefix);
        },
        getTelecomPrefixSet() {
            if (!this._telecomPrefixSet) {
                const prefixes = [];
                const telecomSource = typeof this.TELECOM === 'function'
                    ? this.TELECOM()
                    : this.TELECOM;
                (telecomSource || []).forEach((group) => group[1].forEach((item) => {
                    if (item[2] === 'MOB') prefixes.push(`${group[0]}.${item[0]}`);
                }));
                this._telecomPrefixSet = new Set(prefixes);
                this.incrementRuntimeDiagnostic('filter.ipData.telecom.decodes');
            }
            return this._telecomPrefixSet;
        },
        getProxyStrictPrefixSet() {
            if (!this._proxyStrictPrefixSet) {
                const source = this.PROXY_STRICT_PREFIXES;
                const prefixes = typeof source === 'string' ? source.trim().split(/\s+/).filter(Boolean) : source;
                this._proxyStrictPrefixSet = new Set(prefixes || []);
                this.incrementRuntimeDiagnostic('filter.ipData.proxyStrict.decodes');
            }
            return this._proxyStrictPrefixSet;
        },
        getProxyAggressiveExtraPrefixSet() {
            if (!this._proxyAggressiveExtraPrefixSet) {
                const source = this.PROXY_AGGRESSIVE_EXTRA_PREFIXES;
                const prefixes = typeof source === 'string' ? source.trim().split(/\s+/).filter(Boolean) : source;
                this._proxyAggressiveExtraPrefixSet = new Set(prefixes || []);
                this.incrementRuntimeDiagnostic('filter.ipData.proxyAggressive.decodes');
            }
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
                blockPumPosts: !!s.blockPumPosts,
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
            const { masterDisabled = false, excludeRecommended = false, threshold = 0, ratioEnabled = false, ratioMin = '', ratioMax = '', blockPumPosts = false, blockGuestEnabled = false, proxyBlockMode = 0, telecomBlockEnabled = false } = dcFilterSettings;
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
                    <div class="dcuf-settings-section dcuf-settings-pum" style="display:flex;align-items:center;gap:8px;"><label class="switch" style="flex-shrink:0;"><input id="${this.CONSTANTS.UI_IDS.BLOCK_PUM_POSTS_CHECKBOX}" type="checkbox" ${blockPumPosts ? 'checked' : ''}><span class="switch-slider"></span></label><label for="${this.CONSTANTS.UI_IDS.BLOCK_PUM_POSTS_CHECKBOX}" style="font-size:15px;cursor:pointer;">펌 게시물 차단</label></div>
                    <button type="button" id="${this.CONSTANTS.UI_IDS.HEADTEXT_MANAGER_BUTTON}" style="width:100%;margin-top:14px;padding:9px 10px;border:1px solid #9aa4b2;border-radius:7px;background:#f6f8fb;color:#222;font-weight:700;cursor:pointer;">갤러리별 말머리 차단 관리</button>
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
            const blockPumPostsCheckbox = div.querySelector(`#${this.CONSTANTS.UI_IDS.BLOCK_PUM_POSTS_CHECKBOX}`);
            const closeButton = div.querySelector(`#${this.CONSTANTS.UI_IDS.CLOSE_BUTTON}`);
            const saveButton = div.querySelector(`#${this.CONSTANTS.UI_IDS.SAVE_BUTTON}`);
            const excludeRecommendedCheckbox = div.querySelector(`#${this.CONSTANTS.UI_IDS.EXCLUDE_RECOMMENDED_CHECKBOX}`);
            const blockGuestCheckbox = div.querySelector(`#${this.CONSTANTS.UI_IDS.BLOCK_GUEST_CHECKBOX}`);
            const proxyBlockModeGroup = div.querySelector(`#${this.CONSTANTS.UI_IDS.PROXY_BLOCK_MODE_GROUP}`);
            const telecomBlockCheckbox = div.querySelector(`#${this.CONSTANTS.UI_IDS.TELECOM_BLOCK_CHECKBOX}`);
            const headtextManagerButton = div.querySelector(`#${this.CONSTANTS.UI_IDS.HEADTEXT_MANAGER_BUTTON}`);

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

            if (!masterDisableCheckbox || !settingsContainer || !ratioSection || !ratioEnableCheckbox || !ratioMinInput || !ratioMaxInput || !blockPumPostsCheckbox || !saveButton || !excludeRecommendedCheckbox || !blockGuestCheckbox || !proxyBlockModeGroup || !telecomBlockCheckbox) {
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
            blockPumPostsCheckbox.addEventListener('change', (e) =>
                applyCheckboxChange(this.CONSTANTS.STORAGE_KEYS.BLOCK_PUM_POSTS, e.target.checked)
            );
            headtextManagerButton?.addEventListener('click', () => this.showHeadtextBlockManager());
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
                    GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_PUM_POSTS, blockPumPostsCheckbox.checked),
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
        getGalleryKey(urlLike = window.location.href) {
            try {
                const url = new URL(urlLike, window.location.href);
                const id = (url.searchParams.get('id') || '').trim();
                if (!id) return null;
                const path = url.pathname.toLowerCase();
                const type = path.includes('/mini/') ? 'mini' : (path.includes('/mgallery/') ? 'mgallery' : 'board');
                return `${type}:${id}`;
            } catch {
                return null;
            }
        },
        normalizeHeadtext(value) {
            return DCUF_SHARED_STORAGE.normalizeHeadtext(value);
        },
        normalizeGalleryHeadtextBlocks(value) {
            return DCUF_SHARED_STORAGE.normalizeGalleryHeadtextBlocks(value);
        },
        async loadGalleryHeadtextBlocks() {
            const raw = await GM_getValue(this.CONSTANTS.STORAGE_KEYS.GALLERY_HEADTEXT_BLOCKS, {});
            return this.normalizeGalleryHeadtextBlocks(raw);
        },
        async saveGalleryHeadtextBlocks(rules, reason = 'gallery headtext blocks') {
            const normalized = this.normalizeGalleryHeadtextBlocks(rules);
            await GM_setValue(this.CONSTANTS.STORAGE_KEYS.GALLERY_HEADTEXT_BLOCKS, normalized);
            await this.reloadSettings();
            await this.refilterAllContent(reason);
            return normalized;
        },
        getCanonicalHeadtextFromNode(source) {
            if (!(source instanceof Element)) return '';
            const explicit = source.getAttribute('data-headtext');
            if (explicit) return this.normalizeHeadtext(explicit);
            const canonical = source.matches('.subject_inner') ? source : source.querySelector('.subject_inner');
            if (canonical?.textContent?.trim()) return this.normalizeHeadtext(canonical.textContent);
            const valueNode = source.matches('[data-val]') ? source : source.querySelector('[data-val]');
            if (valueNode?.getAttribute('data-val')) return this.normalizeHeadtext(valueNode.getAttribute('data-val'));
            const directText = Array.from(source.childNodes)
                .filter((node) => node.nodeType === Node.TEXT_NODE)
                .map((node) => node.textContent || '')
                .join(' ');
            return this.normalizeHeadtext(directText || source.textContent || '');
        },
        collectDiscoveredHeadtexts() {
            const values = new Set();
            document.querySelectorAll('tr.ub-content, .custom-post-item, .view_bottom li').forEach((element) => {
                const descriptor = this.describeFilterTarget(element);
                if (descriptor?.isHeadtextTarget && descriptor.writerInfo && descriptor.headtext && !descriptor.isNotice) values.add(descriptor.headtext);
            });
            document.querySelectorAll('a[onclick*="listSearchHead"], .subject_morelist a, [data-fixture-headtext-nav]').forEach((element) => {
                const headtext = this.getCanonicalHeadtextFromNode(element);
                if (headtext && !['전체', '공지'].includes(headtext)) values.add(headtext);
            });
            return Array.from(values).sort((a, b) => a.localeCompare(b, 'ko'));
        },
        async showHeadtextBlockManager() {
            document.getElementById(this.CONSTANTS.UI_IDS.HEADTEXT_MANAGER_PANEL)?.remove();
            const currentKey = this.getGalleryKey();
            const panel = document.createElement('section');
            panel.id = this.CONSTANTS.UI_IDS.HEADTEXT_MANAGER_PANEL;
            panel.className = 'dcuf-settings-panel';
            panel.setAttribute('role', 'dialog');
            panel.setAttribute('aria-modal', 'true');
            panel.style.cssText = 'position:fixed;z-index:2147483646;left:50%;top:50%;transform:translate(-50%,-50%);width:min(420px,calc(100vw - 24px));max-height:min(680px,calc(100vh - 24px));overflow:auto;padding:18px;border:1px solid #8d98a6;border-radius:12px;background:#fff;color:#20242a;box-shadow:0 20px 60px #0007;box-sizing:border-box;';
            document.body.appendChild(panel);

            const render = async () => {
                const rules = await this.loadGalleryHeadtextBlocks();
                const current = new Set(currentKey ? (rules[currentKey] || []) : []);
                const discovered = Array.from(new Set([...this.collectDiscoveredHeadtexts(), ...current])).sort((a, b) => a.localeCompare(b, 'ko'));
                panel.replaceChildren();

                const header = document.createElement('div');
                header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px;';
                const title = document.createElement('strong');
                title.textContent = '갤러리별 말머리 차단';
                const close = document.createElement('button');
                close.type = 'button'; close.textContent = '✕'; close.setAttribute('aria-label', '닫기');
                close.style.cssText = 'border:0;background:transparent;font-size:22px;cursor:pointer;color:inherit;';
                close.onclick = () => panel.remove();
                header.append(title, close);
                panel.appendChild(header);

                const keyLabel = document.createElement('div');
                keyLabel.textContent = currentKey ? `현재 갤러리: ${currentKey}` : '현재 페이지의 갤러리를 확인할 수 없습니다.';
                keyLabel.style.cssText = 'font-size:13px;color:#667085;margin-bottom:10px;';
                panel.appendChild(keyLabel);

                const choices = document.createElement('div');
                choices.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:7px;margin-bottom:10px;';
                discovered.forEach((headtext) => {
                    const label = document.createElement('label');
                    label.style.cssText = 'display:flex;align-items:center;gap:6px;padding:7px;border:1px solid #d7dde5;border-radius:7px;cursor:pointer;min-width:0;';
                    const input = document.createElement('input');
                    input.type = 'checkbox'; input.checked = current.has(headtext); input.disabled = !currentKey;
                    input.addEventListener('change', async () => {
                        if (input.checked) current.add(headtext); else current.delete(headtext);
                        const next = { ...rules };
                        if (current.size) next[currentKey] = Array.from(current); else delete next[currentKey];
                        input.disabled = true;
                        await this.saveGalleryHeadtextBlocks(next, 'headtext checkbox');
                        await render();
                    });
                    const text = document.createElement('span'); text.textContent = headtext;
                    label.append(input, text); choices.appendChild(label);
                });
                if (!discovered.length) {
                    const empty = document.createElement('div'); empty.textContent = '현재 목록에서 발견한 말머리가 없습니다.'; empty.style.cssText = 'grid-column:1/-1;color:#667085;font-size:13px;'; choices.appendChild(empty);
                }
                panel.appendChild(choices);

                const manual = document.createElement('div');
                manual.style.cssText = 'display:flex;gap:7px;margin-bottom:10px;';
                const manualInput = document.createElement('input');
                manualInput.type = 'text'; manualInput.placeholder = '목록에 없는 말머리'; manualInput.disabled = !currentKey;
                manualInput.style.cssText = 'flex:1;min-width:0;padding:8px;border:1px solid #b9c2ce;border-radius:7px;';
                const add = document.createElement('button'); add.type = 'button'; add.textContent = '추가'; add.disabled = !currentKey;
                add.style.cssText = 'padding:8px 12px;border:1px solid #8793a2;border-radius:7px;background:#f6f8fb;cursor:pointer;';
                add.onclick = async () => {
                    const value = this.normalizeHeadtext(manualInput.value);
                    if (!value) return;
                    current.add(value);
                    await this.saveGalleryHeadtextBlocks({ ...rules, [currentKey]: Array.from(current) }, 'manual headtext add');
                    await render();
                };
                manualInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') add.click(); });
                manual.append(manualInput, add); panel.appendChild(manual);

                const clear = document.createElement('button');
                clear.type = 'button'; clear.textContent = '현재 갤러리 전체 해제'; clear.disabled = !currentKey || !current.size;
                clear.style.cssText = 'width:100%;padding:8px;border:1px solid #c5ccd5;border-radius:7px;background:transparent;color:inherit;cursor:pointer;margin-bottom:14px;';
                clear.onclick = async () => {
                    const next = { ...rules }; delete next[currentKey];
                    await this.saveGalleryHeadtextBlocks(next, 'clear current gallery headtexts');
                    await render();
                };
                panel.appendChild(clear);

                const savedTitle = document.createElement('strong'); savedTitle.textContent = '저장된 다른 갤러리'; panel.appendChild(savedTitle);
                const saved = document.createElement('div'); saved.style.cssText = 'display:grid;gap:7px;margin-top:8px;';
                const others = Object.entries(rules).filter(([key]) => key !== currentKey).sort(([a], [b]) => a.localeCompare(b));
                others.forEach(([key, values]) => {
                    const row = document.createElement('div'); row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px;border:1px solid #d7dde5;border-radius:7px;';
                    const text = document.createElement('span'); text.textContent = `${key}: ${values.join(', ')}`; text.style.cssText = 'flex:1;min-width:0;overflow-wrap:anywhere;font-size:13px;';
                    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '삭제';
                    remove.style.cssText = 'border:1px solid #d49a9a;border-radius:6px;background:#fff5f5;color:#b42318;padding:5px 8px;cursor:pointer;';
                    remove.onclick = async () => { const next = { ...rules }; delete next[key]; await this.saveGalleryHeadtextBlocks(next, 'remove saved gallery headtexts'); await render(); };
                    row.append(text, remove); saved.appendChild(row);
                });
                if (!others.length) { const none = document.createElement('div'); none.textContent = '다른 갤러리에 저장된 항목이 없습니다.'; none.style.cssText = 'font-size:13px;color:#667085;'; saved.appendChild(none); }
                panel.appendChild(saved);
            };
            await render();
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
                    activeShortcutString = newShortcut;
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
        normalizeFilterTarget(target, { includeHeadtext = true, includePum = true } = {}) {
            if (this.isFilterTargetDescriptor(target)) return target;
            return this.describeFilterTarget(target, { includeHeadtext, includePum });
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
        isHeadtextFilterTarget(element) {
            if (!(element instanceof HTMLElement) || this.isCommentListItem(element)) return false;
            if (element.matches('tr.ub-content')) return true;
            return Boolean(element.closest('.view_bottom, .gall_listwrap'))
                && Boolean(element.querySelector('[data-headtext], .gall_subject'));
        },
        extractHeadtext(element) {
            if (!(element instanceof HTMLElement)) return '';
            const source = element.matches('[data-headtext]')
                ? element
                : element.querySelector('[data-headtext], .gall_subject');
            return this.getCanonicalHeadtextFromNode(source);
        },
        isPumPost(element) {
            if (!(element instanceof HTMLElement) || !this.isHeadtextFilterTarget(element)) return false;
            const marker = element.querySelector(':scope > .gall_tit > b.font_blue009');
            return this.normalizeHeadtext(marker?.textContent || '') === '(펌)';
        },
        describeFilterTarget(element, { includeHeadtext = true, includePum = true } = {}) {
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
            const isHeadtextTarget = includeHeadtext && this.isHeadtextFilterTarget(element);
            const isPumPost = includePum && this.isPumPost(element);
            const hasNoticeMarker = Boolean(element.querySelector('em.icon_notice'))
                || element.classList.contains('notice')
                || element.classList.contains('us-post--notice');
            // `.gall_num` exists on post rows, not comments. Keeping this lookup row-only
            // avoids adding a selector call to every repeated comment-filter pass.
            const isNotice = hasNoticeMarker || (element.tagName === 'TR'
                && this.normalizeHeadtext(element.querySelector('.gall_num')?.textContent || '') === '공지');

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
                isNotice,
                shouldSkipFiltering: this.shouldSkipFiltering(element),
                hasBlockDisableClass: element.classList.contains('block-disable'),
                galleryKey: isHeadtextTarget ? this.getGalleryKey() : null,
                headtext: isHeadtextTarget ? this.extractHeadtext(element) : '',
                isHeadtextTarget,
                isPumPost
            };
        },
        describeFilterTargets(items) {
            if (!Array.isArray(items) || items.length === 0) return [];
            const seen = new Set();
            const descriptors = [];
            // The default rule set is empty. Avoid all headtext DOM probing on the
            // ordinary mutation hot path until the user has an active rule.
            const includeHeadtext = dcFilterSettings.galleryHeadtextBlockSet?.size > 0;
            const includePum = Boolean(dcFilterSettings.blockPumPosts);
            items.forEach((item) => {
                const descriptor = this.normalizeFilterTarget(item, { includeHeadtext, includePum });
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
        updateBlockedUidWriteDiagnostics(reason = '') {
            const pendingEntries = this._blockedUidDirtyUids instanceof Map
                ? this._blockedUidDirtyUids.size
                : 0;
            this.setRuntimeDiagnosticGauge('filter.blockedUidPersist.pendingEntries', pendingEntries);
            this.setRuntimeDiagnosticGauge('filter.blockedUidPersist.timerActive', this._blockedUidWriteTimerId ? 1 : 0);
            this.setRuntimeDiagnosticGauge('filter.blockedUidPersist.writeActive', this._blockedUidWritePromise ? 1 : 0);
            if (reason) this.setRuntimeDiagnosticGauge('filter.blockedUidPersist.lastReason', reason);
        },
        waitForBlockedUidGeneration(generation) {
            if (this._blockedUidPersistedGeneration >= generation) return Promise.resolve();
            if (!Array.isArray(this._blockedUidWriteWaiters)) this._blockedUidWriteWaiters = [];
            return new Promise((resolve, reject) => {
                this._blockedUidWriteWaiters.push({ generation, resolve, reject });
            });
        },
        settleBlockedUidWriteWaiters(generation, error = null) {
            if (!Array.isArray(this._blockedUidWriteWaiters)) return;
            const pending = [];
            this._blockedUidWriteWaiters.forEach((waiter) => {
                if (waiter.generation > generation) {
                    pending.push(waiter);
                    return;
                }
                if (error) waiter.reject(error);
                else waiter.resolve();
            });
            this._blockedUidWriteWaiters = pending;
        },
        scheduleBlockedUidCachePersist(generation) {
            const waiter = this.waitForBlockedUidGeneration(generation);
            if (this._blockedUidWriteTimerId) window.clearTimeout(this._blockedUidWriteTimerId);
            this._blockedUidWriteTimerId = window.setTimeout(() => {
                this._blockedUidWriteTimerId = 0;
                this.updateBlockedUidWriteDiagnostics('timer');
                void this.flushBlockedUidCache('timer').catch((error) => {
                    console.warn('DCinside User Filter: blocked UID cache write failed.', error);
                });
            }, this.BLOCKED_UID_WRITE_DELAY);
            this.updateBlockedUidWriteDiagnostics('scheduled');
            return waiter;
        },
        flushBlockedUidCache(reason = 'manual') {
            if (this._blockedUidWriteTimerId) {
                window.clearTimeout(this._blockedUidWriteTimerId);
                this._blockedUidWriteTimerId = 0;
            }
            if (this._blockedUidWritePromise) {
                const activeWrite = this._blockedUidWritePromise;
                return activeWrite.catch(() => {}).then(() => this.flushBlockedUidCache(reason));
            }

            const generation = this._blockedUidDirtyGeneration;
            if (generation <= this._blockedUidPersistedGeneration) {
                this.updateBlockedUidWriteDiagnostics(reason);
                return Promise.resolve();
            }
            const dirtyUids = this._blockedUidDirtyUids instanceof Map
                ? Array.from(this._blockedUidDirtyUids.entries())
                    .filter(([, dirtyGeneration]) => dirtyGeneration <= generation)
                    .map(([uid]) => uid)
                : [];
            const serializedCache = JSON.stringify(this.BLOCKED_UIDS_CACHE);
            const writePromise = (async () => {
                try {
                    await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCKED_UIDS, serializedCache);
                    this._blockedUidPersistedGeneration = Math.max(this._blockedUidPersistedGeneration, generation);
                    dirtyUids.forEach((uid) => {
                        if (this._blockedUidDirtyUids?.get(uid) <= generation) this._blockedUidDirtyUids.delete(uid);
                    });
                    this.incrementRuntimeDiagnostic('filter.blockedUidPersist.writes');
                    this.incrementRuntimeDiagnostic('filter.blockedUidPersist.entries', dirtyUids.length);
                    this.setRuntimeDiagnosticGauge('filter.blockedUidPersist.lastBatchSize', dirtyUids.length);
                    this.settleBlockedUidWriteWaiters(generation);
                } catch (error) {
                    this.incrementRuntimeDiagnostic('filter.blockedUidPersist.failures');
                    this.settleBlockedUidWriteWaiters(generation, error);
                    throw error;
                } finally {
                    if (this._blockedUidWritePromise === writePromise) this._blockedUidWritePromise = null;
                    this.updateBlockedUidWriteDiagnostics(reason);
                }
            })();
            this._blockedUidWritePromise = writePromise;
            this.updateBlockedUidWriteDiagnostics(reason);
            return writePromise;
        },
        async addBlockedUid(uid, sum, post, comment, ratioBlocked) {
            if (!uid) return;
            const isMobile = this.isMobile();
            if (!isMobile) {
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
            if (!isMobile) {
                await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCKED_UIDS, JSON.stringify(this.BLOCKED_UIDS_CACHE));
                return;
            }
            const generation = this._blockedUidDirtyGeneration + 1;
            this._blockedUidDirtyGeneration = generation;
            if (!(this._blockedUidDirtyUids instanceof Map)) this._blockedUidDirtyUids = new Map();
            this._blockedUidDirtyUids.set(uid, generation);
            this.incrementRuntimeDiagnostic('filter.blockedUidPersist.queuedEntries');
            await this.scheduleBlockedUidCachePersist(generation);
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
                blockPumPosts,
                personalBlockEnabled,
                personalBlockUidSet,
                personalBlockNicknameSet,
                personalBlockIpSet
            } = dcFilterSettings;
            const normalizedProxyBlockMode = this.normalizeProxyBlockMode(proxyBlockMode);
            const proxyBlockEnabled = normalizedProxyBlockMode !== this.PROXY_MODE.OFF;

            const { element, uid, nickname, ip, ipText, writerDataIp, ipPrefix, isGuest, isNotice, shouldSkipFiltering, hasBlockDisableClass, galleryKey, headtext, isHeadtextTarget, isPumPost } = descriptor;
            const subject = {
                uid,
                nickname,
                ip,
                ipPrefix,
                isGuest,
                isNotice,
                shouldSkipFiltering,
                hasBlockDisableClass,
                galleryKey,
                headtext,
                isHeadtextTarget
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
                isPumPost,
                blockPumPosts,
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
                    blockPumPosts,
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
                    blockedGuestMatch: Boolean(ip && (blockedGuestSet instanceof Set ? blockedGuestSet.has(ip) : blockedGuests.includes(ip))),
                    galleryHeadtextBlock: Boolean(isHeadtextTarget && galleryKey && headtext && dcFilterSettings.galleryHeadtextBlockSet?.has(headtext)),
                    pumPostMatch: Boolean(isPumPost)
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
                    blockedGuestMatch: decision.blockedGuestMatch,
                    pumPostMatch: decision.pumPostMatch
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
                        { contexts: ['comments'], mutationScope: 'comments' }
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
                GM_getValue(keys.BLOCK_PUM_POSTS, false),
                GM_getValue(keys.BLOCK_GUEST, false),
                GM_getValue(keys.BLOCK_PROXY, 0),
                GM_getValue(keys.BLOCK_TELECOM, false),
                GM_getValue(keys.BLOCKED_GUESTS, '[]'),
                GM_getValue(keys.BLOCK_CONFIG, {}),
                GM_getValue(keys.PERSONAL_BLOCK_LIST, { uids: [], nicknames: [], ips: [] }),
                GM_getValue(keys.PERSONAL_BLOCK_ENABLED, true),
                GM_getValue(keys.GALLERY_HEADTEXT_BLOCKS, {}),
                GM_getValue(keys.BLOCKED_UIDS, '{}')
            ]).then((values) => {
                const [
                    migrationDone, masterDisabled, excludeRecommended, rawThreshold, ratioEnabled,
                    ratioMin, ratioMax, blockPumPosts, blockGuestEnabled, proxyBlockMode, telecomBlockEnabled,
                    blockedGuestsRaw, blockConfig, personalBlockList, personalBlockEnabled, galleryHeadtextBlocks, blockedUidsRaw
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
                    blockPumPosts,
                    blockGuestEnabled,
                    proxyBlockMode,
                    telecomBlockEnabled,
                    blockedGuests: Array.isArray(blockedGuests) ? blockedGuests : [],
                    blockConfig,
                    personalBlockList,
                    personalBlockEnabled,
                    galleryHeadtextBlocks,
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
        createSettingsSignature(settings = dcFilterSettings) {
            if (!settings || typeof settings !== 'object') return '';
            const normalizeStrings = (values) => (Array.isArray(values) ? values : [])
                .map((value) => String(value ?? ''))
                .filter(Boolean)
                .sort();
            const personalBlockList = settings.personalBlockList || {};
            return JSON.stringify({
                masterDisabled: Boolean(settings.masterDisabled),
                excludeRecommended: Boolean(settings.excludeRecommended),
                threshold: Number(settings.threshold) || 0,
                ratioEnabled: Boolean(settings.ratioEnabled),
                ratioMin: String(settings.ratioMin ?? ''),
                ratioMax: String(settings.ratioMax ?? ''),
                blockPumPosts: Boolean(settings.blockPumPosts),
                blockGuestEnabled: Boolean(settings.blockGuestEnabled),
                proxyBlockMode: this.normalizeProxyBlockMode(settings.proxyBlockMode),
                telecomBlockEnabled: Boolean(settings.telecomBlockEnabled),
                blockedGuests: normalizeStrings(settings.blockedGuests),
                customIpPrefixes: settings.customIpPrefixSet instanceof Set
                    ? Array.from(settings.customIpPrefixSet, (value) => String(value)).sort()
                    : [],
                personalBlockEnabled: Boolean(settings.personalBlockEnabled),
                personalUids: normalizeStrings((personalBlockList.uids || []).map((item) => item?.id)),
                personalNicknames: normalizeStrings(personalBlockList.nicknames),
                personalIps: normalizeStrings(personalBlockList.ips),
                galleryHeadtextBlocks: settings.galleryHeadtextBlocks || {}
            });
        },
        async reloadSettings(snapshot = null) {
            let values;
            if (snapshot) {
                values = [
                    snapshot.masterDisabled, snapshot.excludeRecommended, snapshot.threshold,
                    snapshot.ratioEnabled, snapshot.ratioMin, snapshot.ratioMax,
                    snapshot.blockPumPosts,
                    snapshot.blockGuestEnabled, snapshot.proxyBlockMode, snapshot.telecomBlockEnabled,
                    snapshot.blockedGuests, snapshot.blockConfig, snapshot.personalBlockList,
                    snapshot.personalBlockEnabled, snapshot.galleryHeadtextBlocks
                ];
            } else {
                values = await Promise.all([
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.MASTER_DISABLED, false),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.EXCLUDE_RECOMMENDED, false),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.THRESHOLD, 0),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.RATIO_ENABLED, false),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.RATIO_MIN, ''),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.RATIO_MAX, ''),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_PUM_POSTS, false),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_GUEST, false),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_PROXY, 0),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_TELECOM, false),
                    this.getBlockedGuests(),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG, {}),
                    PersonalBlockModule.loadPersonalBlocks(),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.PERSONAL_BLOCK_ENABLED, true),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.GALLERY_HEADTEXT_BLOCKS, {})
                ]);
            }
            const [
                masterDisabled, excludeRecommended, threshold, ratioEnabled,
                ratioMin, ratioMax, blockPumPosts, blockGuestEnabled, proxyBlockMode, telecomBlockEnabled,
                blockedGuests, blockConfig, personalBlockList, personalBlockEnabled, galleryHeadtextBlocksRaw
            ] = values;
            const normalizedSettings = DCUF_SHARED_STORAGE.normalizeStoredFilterSettings({
                [this.CONSTANTS.STORAGE_KEYS.MASTER_DISABLED]: masterDisabled,
                [this.CONSTANTS.STORAGE_KEYS.EXCLUDE_RECOMMENDED]: excludeRecommended,
                [this.CONSTANTS.STORAGE_KEYS.THRESHOLD]: threshold,
                [this.CONSTANTS.STORAGE_KEYS.RATIO_ENABLED]: ratioEnabled,
                [this.CONSTANTS.STORAGE_KEYS.RATIO_MIN]: ratioMin,
                [this.CONSTANTS.STORAGE_KEYS.RATIO_MAX]: ratioMax,
                [this.CONSTANTS.STORAGE_KEYS.BLOCK_PUM_POSTS]: blockPumPosts,
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
            const galleryHeadtextBlocks = this.normalizeGalleryHeadtextBlocks(galleryHeadtextBlocksRaw);
            const galleryKey = this.getGalleryKey();
            const galleryHeadtextBlockSet = new Set(galleryKey ? (galleryHeadtextBlocks[galleryKey] || []) : []);
            dcFilterSettings = {
                masterDisabled: normalizedSettings.masterDisabled,
                excludeRecommended: normalizedSettings.excludeRecommended,
                threshold: normalizedSettings.threshold,
                ratioEnabled: normalizedSettings.ratioEnabled,
                ratioMin: normalizedSettings.ratioMin,
                ratioMax: normalizedSettings.ratioMax,
                blockPumPosts: normalizedSettings.blockPumPosts,
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
                personalBlockEnabled,
                galleryHeadtextBlocks,
                galleryKey,
                galleryHeadtextBlockSet
            };
            this._settingsSignature = this.createSettingsSignature(dcFilterSettings);
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
                const descriptor = this.describeFilterTarget(element, {
                    includeHeadtext: dcFilterSettings.galleryHeadtextBlockSet?.size > 0,
                    includePum: Boolean(dcFilterSettings.blockPumPosts)
                });
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
        getVisibilityRecoverySurface() {
            const pageType = window.__dcufRuntimeCoordinator?.getPageContext?.().type
                || window.__dcufPageContext?.type
                || 'other';
            if (pageType === 'lists') {
                return document.querySelector('table.gall_list, .gall_listwrap, .list_wrap');
            }
            if (pageType === 'view') {
                return document.querySelector('.writing_view_box, .gallview_contents, .view_content_wrap');
            }
            if (pageType === 'write') {
                return document.querySelector('form#write, form[name="modify"][action*="modify_submit"], #write_wrap, .gall_write, .write_box');
            }
            return document.body;
        },
        captureHiddenVisibilityState() {
            const runtimeCoordinator = window.__dcufRuntimeCoordinator;
            runtimeCoordinator?.ensureMutationBus?.();
            const generation = runtimeCoordinator?.flushPendingMutations?.('visibility-hidden-snapshot')
                ?? runtimeCoordinator?.getMutationGeneration?.()
                ?? 0;
            const bfcacheState = runtimeCoordinator?.getBfcacheRecoveryState?.() || {};
            this._visibilityCycleId += 1;
            this._hiddenAt = Date.now();
            this._hiddenMutationGeneration = generation;
            this._hiddenBody = document.body;
            this._hiddenRecoverySurface = this.getVisibilityRecoverySurface();
            this._hiddenBfcacheRecoveryId = Number(bfcacheState.id) || 0;
            this.incrementRuntimeDiagnostic('lifecycle.visibility.hidden');
            this.setRuntimeDiagnosticGauge('lifecycle.visibility.hiddenGeneration', generation);
        },
        getHiddenVisibilitySnapshot() {
            return {
                cycleId: this._visibilityCycleId,
                hiddenAt: this._hiddenAt,
                mutationGeneration: this._hiddenMutationGeneration,
                body: this._hiddenBody,
                recoverySurface: this._hiddenRecoverySurface,
                bfcacheRecoveryId: this._hiddenBfcacheRecoveryId
            };
        },
        isMatchingBfcacheRecovery(snapshot, recoveryState) {
            return Boolean(
                snapshot?.hiddenAt
                && recoveryState?.succeeded
                && Number(recoveryState.id) > Number(snapshot.bfcacheRecoveryId || 0)
                && Number(recoveryState.startedAt) >= Number(snapshot.hiddenAt)
                && recoveryState.body === document.body
            );
        },
        async restoreVisibleState(snapshot) {
            const runtimeCoordinator = window.__dcufRuntimeCoordinator;
            runtimeCoordinator?.ensureMutationBus?.();

            let recoveryState = runtimeCoordinator?.getBfcacheRecoveryState?.() || {};
            const recoveryBelongsToCycle = Number(recoveryState.id) > Number(snapshot.bfcacheRecoveryId || 0)
                && Number(recoveryState.startedAt) >= Number(snapshot.hiddenAt || 0)
                && recoveryState.body === document.body;
            if (recoveryState.pending && recoveryBelongsToCycle) {
                await runtimeCoordinator.waitForBfcacheRecovery?.();
                recoveryState = runtimeCoordinator?.getBfcacheRecoveryState?.() || recoveryState;
            }

            if (this.isMatchingBfcacheRecovery(snapshot, recoveryState)) {
                await reloadShortcutKey();
                this.incrementRuntimeDiagnostic('lifecycle.visibility.restore.skippedBfcache');
                this.setRuntimeDiagnosticGauge('lifecycle.visibility.restore.lastReason', 'bfcache-handled');
                return { restored: false, reason: 'bfcache-handled' };
            }

            const previousSettingsSignature = this._settingsSignature;
            const [, shortcutState] = await Promise.all([
                this.reloadSettings(),
                reloadShortcutKey()
            ]);
            const generation = runtimeCoordinator?.flushPendingMutations?.('visibility-visible-check')
                ?? runtimeCoordinator?.getMutationGeneration?.()
                ?? 0;
            const currentSurface = this.getVisibilityRecoverySurface();
            const reasons = [];
            if (generation !== snapshot.mutationGeneration) reasons.push('mutation');
            if (snapshot.body !== document.body || (snapshot.body && !snapshot.body.isConnected)) reasons.push('body');
            if (snapshot.recoverySurface !== currentSurface
                || (snapshot.recoverySurface && !snapshot.recoverySurface.isConnected)) reasons.push('surface');
            if (previousSettingsSignature !== this._settingsSignature) reasons.push('settings');
            if (snapshot.hiddenAt && Date.now() - snapshot.hiddenAt >= this.VISIBILITY_LONG_RESTORE_MS) reasons.push('long-suspend');

            this.setRuntimeDiagnosticGauge('lifecycle.visibility.restore.shortcutChanged', Boolean(shortcutState?.changed));
            if (reasons.length === 0) {
                this.incrementRuntimeDiagnostic('lifecycle.visibility.restore.skippedClean');
                this.setRuntimeDiagnosticGauge('lifecycle.visibility.restore.lastReason', 'clean');
                return { restored: false, reason: 'clean', shortcutChanged: Boolean(shortcutState?.changed) };
            }

            const reason = `visibilitychange-visible:${reasons.join('+')}`;
            await this.refilterAllContent(reason, {
                scheduleFollowups: false,
                settingsAlreadyLoaded: true
            });
            this.incrementRuntimeDiagnostic('lifecycle.visibility.restore.runs');
            this.setRuntimeDiagnosticGauge('lifecycle.visibility.restore.lastReason', reasons.join(','));
            return { restored: true, reason, shortcutChanged: Boolean(shortcutState?.changed) };
        },
        async runFullRefilterPass(reason = 'refilterAllContent', { scheduleFollowups = true, settingsAlreadyLoaded = false } = {}) {
            if (!settingsAlreadyLoaded) await this.reloadSettings();
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
        async refilterAllContent(reason = 'refilterAllContent', { scheduleFollowups = true, settingsAlreadyLoaded = false } = {}) {
            if (!this._pendingFullRefilterReasons) this._pendingFullRefilterReasons = [];
            this._pendingFullRefilterReasons.push({ reason, scheduleFollowups, settingsAlreadyLoaded });

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
                    const settingsWereLoaded = pendingRequests.every((request) => request.settingsAlreadyLoaded === true);
                    await this.runFullRefilterPass(runReason, {
                        scheduleFollowups: shouldScheduleFollowups,
                        settingsAlreadyLoaded: settingsWereLoaded
                    });
                }
            })();

            try {
                await this._refilterAllContentPromise;
            } finally {
                this._refilterAllContentRunning = false;
                this._refilterAllContentPromise = null;
            }
        },
        async handleVisibilityChange() {
            if (document.visibilityState !== 'visible') {
                this.captureHiddenVisibilityState();
                await this.flushBlockedUidCache('visibility-hidden');
                return;
            }
            if (this._visibilityRecoveryPromise) return this._visibilityRecoveryPromise;

            const snapshot = this.getHiddenVisibilitySnapshot();
            this._visibilityRecoveryPromise = this.restoreVisibleState(snapshot).catch(async (error) => {
                this.incrementRuntimeDiagnostic('lifecycle.visibility.restore.failed');
                console.warn('[DCUF lifecycle] visibility restore failed; running fallback refilter.', error);
                await this.refilterAllContent('visibilitychange-visible:fallback', { scheduleFollowups: false });
                return { restored: true, reason: 'fallback' };
            }).finally(() => {
                this._visibilityRecoveryPromise = null;
                if (this._visibilityCycleId === snapshot.cycleId && document.visibilityState === 'visible') {
                    this._hiddenAt = 0;
                    this._hiddenMutationGeneration = 0;
                    this._hiddenBody = null;
                    this._hiddenRecoverySurface = null;
                    this._hiddenBfcacheRecoveryId = 0;
                }
            });
            return this._visibilityRecoveryPromise;
        },
        init() {
            if (this._initState === 'ready') return Promise.resolve('already-ready');
            if (this._initState === 'initializing' && this._initPromise) return this._initPromise;
            this._initState = 'initializing';
            this._initPromise = (async () => {
                this.installDebugApi();
                this.debugLog('init', 'FilterModule init start', { version: '1.9.9' });
                const snapshot = await this.loadBootSnapshot();
                await this.cleanupLegacyManagedBlockConfig(snapshot);
                await this.reloadSettings(snapshot);
                await this.refreshBlockedUidsCache(snapshot.blockedUidsRaw);
                if (!this._visibilityChangeHandler) {
                    this._visibilityChangeHandler = () => this.handleVisibilityChange();
                    document.addEventListener('visibilitychange', this._visibilityChangeHandler);
                }
                if (!this._blockedUidPagehideHandler) {
                    this._blockedUidPagehideHandler = () => {
                        void this.flushBlockedUidCache('pagehide').catch((error) => {
                            console.warn('DCinside User Filter: pagehide blocked UID flush failed.', error);
                        });
                    };
                    window.addEventListener('pagehide', this._blockedUidPagehideHandler);
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

    if (!__dcufRoot.__dcufPcMenuCommandsRegistered) {
        __dcufRoot.__dcufPcMenuCommandsRegistered = true;
        const menuCommands = [
            ['글댓합 설정하기', FilterModule.showSettings.bind(FilterModule)],
            ['차단 유저 관리', PersonalBlockModule.createManagementPanel.bind(PersonalBlockModule)],
            ['플로팅 버튼 원위치', PersonalBlockModule.resetFabPosition.bind(PersonalBlockModule)],
            ['메뉴 버튼 크기 조절', PersonalBlockModule.showFabScalePanel.bind(PersonalBlockModule)],
            ['UI 색상 설정', ThemeModule.openPaletteDialog.bind(ThemeModule)]
        ];
        menuCommands.forEach(([label, handler]) => {
            try {
                GM_registerMenuCommand(label, handler);
            } catch (error) {
                console.warn('[DCUF PC] menu registration failed:', label, error);
            }
        });
    }

    async function reloadShortcutKey() {
        const shortcutString = String(await GM_getValue(FilterModule.CONSTANTS.STORAGE_KEYS.SHORTCUT_KEY, 'Shift+S') || 'Shift+S');
        const changed = activeShortcutString !== null && activeShortcutString !== shortcutString;
        activeShortcutString = shortcutString;
        activeShortcutObject = FilterModule.parseShortcutString(activeShortcutString);
        return { changed, shortcutString: activeShortcutString };
    }

    function observeDarkMode() {
        if (__dcufRoot.__dcufPcDarkModeObserverAttached) return;
        __dcufRoot.__dcufPcDarkModeObserverAttached = true;

        const applyDarkModeState = () => {
            const enabled = Boolean(document.getElementById('css-darkmode'));
            document.documentElement.classList.toggle('dc-filter-dark-mode', enabled);
            if (document.body) document.body.classList.toggle('dc-filter-dark-mode', enabled);
        };

        const mountObserver = () => {
            const head = document.head || document.documentElement;
            if (!head) return false;
            const observer = new MutationObserver(applyDarkModeState);
            observer.observe(head, { childList: true });
            applyDarkModeState();
            return true;
        };

        if (!mountObserver()) {
            document.addEventListener('DOMContentLoaded', mountObserver, { once: true });
        }
    }

    function bindSettingsShortcut() {
        if (__dcufRoot.__dcufPcFilterShortcutBound) return;
        __dcufRoot.__dcufPcFilterShortcutBound = true;

        window.addEventListener('keydown', async (e) => {
            if (!activeShortcutObject || !activeShortcutObject.key) return;

            const isMatch = e.key.toUpperCase() === activeShortcutObject.key &&
                e.ctrlKey === activeShortcutObject.ctrlKey &&
                e.shiftKey === activeShortcutObject.shiftKey &&
                e.altKey === activeShortcutObject.altKey &&
                e.metaKey === activeShortcutObject.metaKey;

            if (!isMatch) return;
            e.preventDefault();

            const settingsPanel = document.getElementById(FilterModule.CONSTANTS.UI_IDS.SETTINGS_PANEL);
            if (settingsPanel) settingsPanel.remove();
            else await FilterModule.showSettings();
        }, true);
    }

    async function main() {
        if (__dcufRoot.__dcufPcFilterPortState === 'ready') return 'ready';
        if (__dcufRoot.__dcufPcFilterPortPromise) return __dcufRoot.__dcufPcFilterPortPromise;

        __dcufRoot.__dcufPcFilterPortState = 'initializing';
        __dcufRoot.__dcufPcFilterPortPromise = (async () => {
            console.log('[DCUF PC] Initializing filter port v1.9.9...');

            observeDarkMode();
            bindSettingsShortcut();
            if (window.__dcufBootController) {
                window.__dcufBootController.startPreparing('pc-main');
                window.__dcufBootController.onReady(() => reloadShortcutKey().catch((error) => {
                    console.warn('[DCUF PC] shortcut initialization failed:', error);
                }));
            }
            await FilterModule.init();
            await PersonalBlockModule.init(FilterModule.getBootSnapshot(), { deferUi: true });
            window.__dcufBootController?.note?.('boot.local-filter-ready');
            __dcufRoot.__dcufPcFilterPortState = 'ready';
            console.log('[DCUF PC] Filter port ready.');
            return 'ready';
        })();

        try {
            return await __dcufRoot.__dcufPcFilterPortPromise;
        } catch (error) {
            __dcufRoot.__dcufPcFilterPortState = 'failed';
            __dcufRoot.__dcufPcFilterPortPromise = null;
            throw error;
        }
    }

    let initializationRecoveryAttempts = 0;
    const runSafely = async () => {
        let initState = 'ok';

        try {
            await main();
        } catch (error) {
            initState = 'error';
            console.error('[DCUF PC] A critical error occurred during initialization:', error);
        } finally {
            if (initState === 'ok') markUiReady('pc-ready');
            else if (window.__dcufBootController) window.__dcufBootController.degrade('pc-initialization-error');
            if (initState === 'error' && initializationRecoveryAttempts < 2) {
                initializationRecoveryAttempts += 1;
                const retryBaseMs = Math.max(20, Number(__dcufRoot.__DCUF_TESTBED_CONFIG__?.boot?.recoveryRetryDelayMs) || 160);
                window.setTimeout(() => {
                    if (window.__dcufBootController?.state === 'degraded') runSafely();
                }, retryBaseMs * initializationRecoveryAttempts);
            }
            console.log(`[DCUF PC] UI is now visible. (${initState})`);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runSafely, { once: true });
    } else {
        runSafely();
    }
})();
