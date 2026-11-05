const ThemeModule = (() => {
    const STORAGE_KEY = 'dcuf_mobile_ui_palette';
    const ROOT_ATTRIBUTE = 'data-dcuf-palette';
    const STYLE_ID = 'dcuf-mobile-palette-style';
    const OVERLAY_ID = 'dcuf-palette-overlay';
    const PANEL_ID = 'dcuf-palette-panel';
    const DEFAULT_ID = 'blue';
    const PRESETS = __dcufGetThemePresets();
    const VALID_IDS = new Set(PRESETS.map((preset) => preset.id));

    let committedId = DEFAULT_ID;
    let writeRevision = 0;
    let initialReadSettled = false;
    let initialReadPromise = null;
    let domReadyApplyScheduled = false;

    const normalize = (value) => typeof value === 'string' && VALID_IDS.has(value) ? value : DEFAULT_ID;
    const markOwned = (element, role, state = 'open') => __dcufThemeHost.invokeNative('mark-owned-surface', {
        element,
        surface: 'palette',
        role,
        state,
        presentation: __dcufSettingsPresenter.VERSION,
    });

    const apply = (value, reason = 'apply') => {
        const id = normalize(value);
        const root = __dcufThemeHost.findAnchor('root');
        if (root) root.setAttribute(ROOT_ATTRIBUTE, id);
        else if (!domReadyApplyScheduled) {
            domReadyApplyScheduled = true;
            __dcufThemeHost.invokeNative('on-dom-ready', () => {
                domReadyApplyScheduled = false;
                apply(committedId, 'dom-ready');
            }, { once: true });
        }
        __dcufThemeHost.invokeNative('palette-change', { id, reason });
        return id;
    };

    const buildCss = () => `${__dcufBuildThemeBaseCss(ROOT_ATTRIBUTE, PRESETS)}${__dcufBuildTargetThemeCss(ROOT_ATTRIBUTE)}
        ${__dcufSettingsPresenter.PALETTE_CSS}
    `;

    const ensureStyle = () => {
        if (__dcufThemeHost.invokeNative('get-by-id', STYLE_ID)) return true;
        const mount = __dcufThemeHost.findAnchor('head') || __dcufThemeHost.findAnchor('root');
        if (!mount) return false;
        const style = __dcufThemeHost.invokeNative('create-element', 'style');
        style.id = STYLE_ID;
        style.textContent = buildCss();
        mount.appendChild(style);
        return true;
    };

    const beginInitialRead = () => {
        if (initialReadPromise) return initialReadPromise;
        const revisionAtStart = writeRevision;
        initialReadPromise = Promise.resolve()
            .then(() => __dcufUiPort.dispatch({ type: DCUF_UI_CONTRACTS.UI_INTENT_TYPES.PALETTE_LOAD, defaultValue: DEFAULT_ID }))
            .then((result) => {
                if (!result.ok) throw new Error(`palette load failed: ${result.code}`);
                const value = result.committedSnapshot?.palette?.value ?? __dcufUiPort.getSnapshot().palette?.value ?? DEFAULT_ID;
                initialReadSettled = true;
                if (writeRevision !== revisionAtStart) return committedId;
                committedId = normalize(value);
                if (!__dcufThemeHost.invokeNative('get-by-id', OVERLAY_ID)) apply(committedId, 'storage-load');
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
        panel.dataset.dcufState = 'preview';
        panel.querySelectorAll('.dcuf-palette-option').forEach((option) => option.setAttribute('aria-checked', option.dataset.paletteId === normalized ? 'true' : 'false'));
        return normalized;
    };

    const attachPanelPointerGeometry = (panel) => __dcufPopupGeometryHostAdapter.connect(panel, {
        minWidth: 300,
        minHeight: 320,
        pointerDragSelector: '.dcuf-palette-header',
        pointerResizeSelector: '.dcuf-palette-resize-handle',
        pointerInteractiveSelector: 'button, input, label, a',
        viewportGap: 4,
    });

    const closePaletteDialog = ({ restore = true } = {}) => {
        const overlay = __dcufThemeHost.invokeNative('get-by-id', OVERLAY_ID);
        if (!overlay) return false;
        const returnFocus = overlay.__dcufReturnFocus;
        if (restore) apply(committedId, 'preview-cancel');
        const panel = overlay.querySelector(`#${PANEL_ID}`);
        if (panel) __dcufPopupGeometryHostAdapter.dispose(panel);
        overlay.remove();
        if (returnFocus instanceof HTMLElement && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
        return true;
    };

    const openPaletteDialog = () => {
        ensureStyle();
        const existing = __dcufThemeHost.invokeNative('get-by-id', PANEL_ID);
        if (existing) {
            existing.focus({ preventScroll: true });
            return existing;
        }
        const overlay = __dcufThemeHost.invokeNative('create-element', 'div');
        overlay.id = OVERLAY_ID;
        overlay.__dcufReturnFocus = __dcufThemeHost.findAnchor('active-element');
        markOwned(overlay, 'overlay');

        const panel = __dcufThemeHost.invokeNative('create-element', 'section');
        panel.id = PANEL_ID;
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('aria-labelledby', 'dcuf-palette-title');
        panel.tabIndex = -1;
        markOwned(panel, 'panel');
        panel.innerHTML = __dcufSettingsPresenter.renderPalettePanel(PRESETS);
        overlay.appendChild(panel);
        __dcufThemeHost.findAnchor('mount').appendChild(overlay);
        attachPanelPointerGeometry(panel);
        setSelectedOption(panel, committedId);

        const status = panel.querySelector('.dcuf-palette-status');
        const saveButton = panel.querySelector('[data-dcuf-palette-action="save"]');
        const actionButtons = Array.from(panel.querySelectorAll('button'));
        panel.querySelectorAll('.dcuf-palette-option').forEach((option) => option.addEventListener('click', () => {
            status.textContent = '';
            setSelectedOption(panel, option.dataset.paletteId);
        }));
        panel.querySelector('.dcuf-palette-close').addEventListener('click', () => closePaletteDialog({ restore: true }));
        panel.querySelector('[data-dcuf-palette-action="cancel"]').addEventListener('click', () => closePaletteDialog({ restore: true }));
        panel.querySelector('[data-dcuf-palette-action="default"]').addEventListener('click', () => {
            status.textContent = '';
            setSelectedOption(panel, DEFAULT_ID);
        });
        saveButton.addEventListener('click', async () => {
            const selectedId = normalize(panel.dataset.selectedPalette);
            actionButtons.forEach((button) => { button.disabled = true; });
            panel.dataset.dcufState = 'saving';
            status.textContent = '';
            try {
                const result = await __dcufUiPort.dispatch({ type: DCUF_UI_CONTRACTS.UI_INTENT_TYPES.PALETTE_COMMIT, value: selectedId });
                if (!result.ok) throw new Error(`palette commit failed: ${result.code}`);
                writeRevision += 1;
                committedId = selectedId;
                apply(committedId, 'save');
                closePaletteDialog({ restore: false });
            } catch (error) {
                console.warn('[DCUF] palette storage write failed:', error);
                panel.dataset.dcufState = 'error';
                status.textContent = '색상 설정을 저장하지 못했습니다. 다시 시도해 주세요.';
                actionButtons.forEach((button) => { button.disabled = false; });
                saveButton.focus({ preventScroll: true });
            }
        });
        overlay.addEventListener('click', (event) => { if (event.target === overlay) closePaletteDialog({ restore: true }); });
        panel.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closePaletteDialog({ restore: true });
                return;
            }
            if (event.key !== 'Tab') return;
            const focusable = actionButtons.filter((button) => !button.disabled && button.offsetParent !== null);
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && __dcufThemeHost.findAnchor('active-element') === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && __dcufThemeHost.findAnchor('active-element') === last) {
                event.preventDefault();
                first.focus();
            }
        });
        panel.querySelector(`.dcuf-palette-option[data-palette-id="${committedId}"]`)?.focus({ preventScroll: true });
        return panel;
    };

    apply(DEFAULT_ID, 'default');
    __dcufThemeHost.invokeNative('on-dom-ready', () => apply(committedId, 'dom-ready-sync'), { once: true });
    if (!ensureStyle()) __dcufThemeHost.invokeNative('on-dom-ready', ensureStyle, { once: true });
    beginInitialRead();

    return Object.freeze({ STORAGE_KEY, PRESETS, DEFAULT_ID, normalize, apply, openPaletteDialog, closePaletteDialog, getCommittedId: () => committedId, isInitialReadSettled: () => initialReadSettled });
})();
