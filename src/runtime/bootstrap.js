(function () {
    'use strict';

    const __dcufRoot = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
    if (window.top !== window.self) return;

    const detectedPageType = ((window.location.pathname || '').match(/\/board\/(lists|view|write|modify)(?:\/|$)/) || [])[1] || 'other';
    const pageContext = Object.freeze({
        type: detectedPageType,
        isList: detectedPageType === 'lists',
        isView: detectedPageType === 'view',
        isWrite: detectedPageType === 'write',
        isModify: detectedPageType === 'modify',
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
    // only board list/view/write/modify surfaces. Keep the lightweight page-context bridge
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
