    if (!__dcufRoot.__dcufPcMenuCommandsRegistered) {
        __dcufRoot.__dcufPcMenuCommandsRegistered = true;
        const menuCommands = [
            ['글댓합 설정하기', FilterModule.showSettings.bind(FilterModule)],
            ['차단 유저 관리', PersonalBlockModule.createManagementPanel.bind(PersonalBlockModule)],
            ['플로팅 버튼 원위치', PersonalBlockModule.resetFabPosition.bind(PersonalBlockModule)],
            ['메뉴 버튼 크기 조절', PersonalBlockModule.showFabScalePanel.bind(PersonalBlockModule)]
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
        const shortcutString = await GM_getValue(FilterModule.CONSTANTS.STORAGE_KEYS.SHORTCUT_KEY, 'Shift+S');
        activeShortcutObject = FilterModule.parseShortcutString(shortcutString);
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
            console.log('[DCUF PC] Initializing filter port v__VERSION__...');

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
