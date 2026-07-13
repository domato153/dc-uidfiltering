    GM_registerMenuCommand('글댓합 설정하기', FilterModule.showSettings.bind(FilterModule));
    GM_registerMenuCommand('차단 유저 관리', PersonalBlockModule.createManagementPanel.bind(PersonalBlockModule));
    GM_registerMenuCommand('플로팅 버튼 원위치', PersonalBlockModule.resetFabPosition.bind(PersonalBlockModule));
    GM_registerMenuCommand('메뉴 버튼 크기 조절', PersonalBlockModule.showFabScalePanel.bind(PersonalBlockModule));

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
        if (__dcufRoot.__dcufPcFilterPortInitialized) return;
        __dcufRoot.__dcufPcFilterPortInitialized = true;

        console.log('[DCUF PC] Initializing filter port v__VERSION__...');

        observeDarkMode();
        await reloadShortcutKey();
        bindSettingsShortcut();
        await PersonalBlockModule.init();
        await FilterModule.init();

        console.log('[DCUF PC] Filter port ready.');
    }

    const runSafely = async () => {
        let initState = 'ok';

        try {
            await main();
        } catch (error) {
            initState = 'error';
            console.error('[DCUF PC] A critical error occurred during initialization:', error);
        } finally {
            markUiReady();
            console.log(`[DCUF PC] UI is now visible. (${initState})`);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runSafely, { once: true });
    } else {
        runSafely();
    }
