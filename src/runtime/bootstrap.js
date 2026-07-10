(function () {
    'use strict';

    const __dcufRoot = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
    if (__dcufRoot.__dcufRuntimeLoaded) {
        console.warn('DCinside User Filter: duplicate runtime detected, skip init.');
        return;
    }
    __dcufRoot.__dcufRuntimeLoaded = `dcuf-${Date.now()}`;

    if (!__dcufRoot.__dcufBfcacheOptOutInstalled) {
        __dcufRoot.__dcufBfcacheOptOutInstalled = true;
        const preventBackForwardCache = () => {};
        try {
            __dcufRoot.addEventListener('unload', preventBackForwardCache, { capture: true });
        } catch (error) {
            window.addEventListener('unload', preventBackForwardCache, { capture: true });
        }
    }


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
    const BOOT_UI_WATCHDOG_MAX_MS = 8000;
    const BOOT_UI_WATCHDOG_INTERVAL_MS = 50;
    let bootUiWatchdogTimerId = 0;
    let bootUiWatchdogStartedAt = 0;
    let bootUiWatchdogDomReadyHandler = null;
    let bootUiWatchdogLoadHandler = null;

    const isBootOverlayTargetPage = () => true;
    const isRootUiReady = () => !!document.documentElement?.classList.contains(ROOT_READY_CLASS);
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

        stopBootUiWatchdog();
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

    const ensureBootUi = (reason = 'ensure-boot-ui') => {
        if (!isBootOverlayTargetPage() || isRootUiReady()) return true;
        injectInitialLockStyle();
        ensureBootOverlay();
        return !!document.getElementById(INITIAL_LOCK_STYLE_ID) && !!document.getElementById(BOOT_OVERLAY_ID);
    };

    const stopBootUiWatchdog = () => {
        if (bootUiWatchdogTimerId) {
            window.clearInterval(bootUiWatchdogTimerId);
            bootUiWatchdogTimerId = 0;
        }
        if (bootUiWatchdogDomReadyHandler) {
            document.removeEventListener('DOMContentLoaded', bootUiWatchdogDomReadyHandler);
            bootUiWatchdogDomReadyHandler = null;
        }
        if (bootUiWatchdogLoadHandler) {
            window.removeEventListener('load', bootUiWatchdogLoadHandler);
            bootUiWatchdogLoadHandler = null;
        }
    };

    const startBootUiWatchdog = () => {
        if (bootUiWatchdogTimerId || isRootUiReady() || !isBootOverlayTargetPage()) return;
        bootUiWatchdogStartedAt = Date.now();

        const tick = () => {
            if (isRootUiReady()) {
                stopBootUiWatchdog();
                return;
            }

            ensureBootUi('watchdog');
            if (Date.now() - bootUiWatchdogStartedAt >= BOOT_UI_WATCHDOG_MAX_MS) {
                stopBootUiWatchdog();
            }
        };

        bootUiWatchdogTimerId = window.setInterval(tick, BOOT_UI_WATCHDOG_INTERVAL_MS);
        bootUiWatchdogDomReadyHandler = () => tick();
        bootUiWatchdogLoadHandler = () => tick();
        document.addEventListener('DOMContentLoaded', bootUiWatchdogDomReadyHandler, { once: true });
        window.addEventListener('load', bootUiWatchdogLoadHandler, { once: true });
        tick();
    };

    __dcufRoot.__dcufEnsureBootUi = ensureBootUi;
    injectInitialLockStyle();
    ensureBootOverlay();
    startBootUiWatchdog();
