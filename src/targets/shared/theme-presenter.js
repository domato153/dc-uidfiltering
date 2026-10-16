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
        Object.freeze({ id: 'pink', label: '핑크', light: ['#db2777', '#be185d', '#fce7f3'], dark: ['#c52a72', '#9d174d', '#472138'] }),
    ]);
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

    const buildPresetVariables = () => PRESETS.map((preset) => {
        const [accent, strong, soft, onAccent = '#fff'] = preset.light;
        const [darkAccent, darkStrong, darkSoft, darkOnAccent = '#fff'] = preset.dark;
        return `
            html[${ROOT_ATTRIBUTE}="${preset.id}"] { --dcuf-theme-accent:${accent};--dcuf-theme-accent-strong:${strong};--dcuf-theme-accent-soft:${soft};--dcuf-theme-on-accent:${onAccent}; }
            html[${ROOT_ATTRIBUTE}="${preset.id}"].dc-filter-dark-mode,
            html[${ROOT_ATTRIBUTE}="${preset.id}"] body.dc-filter-dark-mode { --dcuf-theme-accent:${darkAccent};--dcuf-theme-accent-strong:${darkStrong};--dcuf-theme-accent-soft:${darkSoft};--dcuf-theme-on-accent:${darkOnAccent}; }
        `;
    }).join('\n');

    const buildCss = () => `
        ${buildPresetVariables()}
        html[${ROOT_ATTRIBUTE}] {
            --dcuf-theme-fg:#27313f;--dcuf-theme-fg-muted:#687384;--dcuf-theme-border:color-mix(in srgb,var(--dcuf-theme-accent) 7%,#d9dde3);--dcuf-theme-border-strong:color-mix(in srgb,var(--dcuf-theme-accent) 14%,#cbd2db);--dcuf-theme-page:#f6f7f9;--dcuf-theme-surface:color-mix(in srgb,var(--dcuf-theme-accent-soft) 8%,#f7f8fa);--dcuf-theme-surface-raised:color-mix(in srgb,var(--dcuf-theme-accent-soft) 12%,#fbfcfd);--dcuf-theme-surface-muted:color-mix(in srgb,var(--dcuf-theme-accent-soft) 9%,#f1f3f6);--dcuf-theme-surface-input:color-mix(in srgb,var(--dcuf-theme-accent-soft) 2%,#fff);--dcuf-theme-canvas:color-mix(in srgb,var(--dcuf-theme-accent-soft) 14%,#f6f7f9);--dcuf-theme-card-top:color-mix(in srgb,var(--dcuf-theme-accent-soft) 1%,#fff);--dcuf-theme-card-bottom:color-mix(in srgb,var(--dcuf-theme-accent-soft) 4%,#fafbfc);--dcuf-theme-article-surface:color-mix(in srgb,var(--dcuf-theme-accent-soft) 6%,#f8f9fb);--dcuf-theme-concept-surface:color-mix(in srgb,var(--dcuf-theme-accent-soft) 7%,#fff);--dcuf-theme-notice-surface:#f2f4f7;--dcuf-theme-reply-surface:color-mix(in srgb,var(--dcuf-theme-accent-soft) 10%,#f4f6f8);--dcuf-theme-card-shadow:0 1px 3px rgba(31,41,55,.07),0 6px 16px rgba(31,41,55,.075);--dcuf-theme-panel-shadow:0 18px 42px rgba(31,41,55,.16),0 3px 9px rgba(31,41,55,.09);--dcuf-theme-primary-top:color-mix(in srgb,var(--dcuf-theme-accent) 78%,white);--dcuf-theme-focus-ring:color-mix(in srgb,var(--dcuf-theme-accent) 18%,transparent);--dcuf-theme-accent-shadow:color-mix(in srgb,var(--dcuf-theme-accent-strong) 25%,transparent);
        }
        html[${ROOT_ATTRIBUTE}].dc-filter-dark-mode,html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode {
            --dcuf-theme-fg:#edf2f7;--dcuf-theme-fg-muted:#aeb8c4;--dcuf-theme-border:color-mix(in srgb,var(--dcuf-theme-accent) 7%,#3a4149);--dcuf-theme-border-strong:color-mix(in srgb,var(--dcuf-theme-accent) 14%,#4b525b);--dcuf-theme-page:#121417;--dcuf-theme-surface:color-mix(in srgb,var(--dcuf-theme-accent-soft) 5%,#1b1f24);--dcuf-theme-surface-raised:color-mix(in srgb,var(--dcuf-theme-accent-soft) 8%,#22262c);--dcuf-theme-surface-muted:color-mix(in srgb,var(--dcuf-theme-accent-soft) 6%,#1d2228);--dcuf-theme-surface-input:color-mix(in srgb,var(--dcuf-theme-accent-soft) 2%,#171b20);--dcuf-theme-canvas:color-mix(in srgb,var(--dcuf-theme-accent-soft) 10%,#171a1f);--dcuf-theme-card-top:color-mix(in srgb,var(--dcuf-theme-accent-soft) 3%,#24272d);--dcuf-theme-card-bottom:color-mix(in srgb,var(--dcuf-theme-accent-soft) 4%,#20242a);--dcuf-theme-article-surface:color-mix(in srgb,var(--dcuf-theme-accent-soft) 5%,#1a1e23);--dcuf-theme-concept-surface:color-mix(in srgb,var(--dcuf-theme-accent-soft) 8%,#22262c);--dcuf-theme-notice-surface:#252a31;--dcuf-theme-reply-surface:color-mix(in srgb,var(--dcuf-theme-accent-soft) 10%,#21262c);--dcuf-theme-card-shadow:0 1px 3px rgba(0,0,0,.28),0 7px 18px rgba(0,0,0,.22);--dcuf-theme-panel-shadow:0 20px 46px rgba(0,0,0,.44),0 3px 9px rgba(0,0,0,.24);--dcuf-theme-primary-top:color-mix(in srgb,var(--dcuf-theme-accent) 68%,white);
        }
        ${__dcufBuildTargetThemeCss(ROOT_ATTRIBUTE)}
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
