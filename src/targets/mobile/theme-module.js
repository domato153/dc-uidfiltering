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

    const relativeLuminance = (hex) => {
        const value = String(hex || '').replace('#', '');
        if (!/^[\da-f]{6}$/i.test(value)) return 0;
        const channels = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255)
            .map((channel) => channel <= .03928 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
        return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
    };
    const readableForeground = (background, preferred = '') => {
        if (preferred) return preferred;
        const luminance = relativeLuminance(background);
        const whiteContrast = 1.05 / (luminance + .05);
        return whiteContrast >= 4.5 ? '#fff' : '#172033';
    };

    const buildPresetVariables = () => PRESETS.map((preset) => {
        const [accent, strong, soft, preferredOnAccent = ''] = preset.light;
        const [darkAccent, darkStrong, darkSoft, preferredDarkOnAccent = ''] = preset.dark;
        const onAccent = readableForeground(strong, preferredOnAccent);
        const darkOnAccent = readableForeground(darkStrong, preferredDarkOnAccent);
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
            --dcuf-glass-page: #edf3fa;
            --dcuf-glass-panel: color-mix(in srgb, var(--dcuf-theme-accent-soft) 18%, rgba(248, 251, 255, .72));
            --dcuf-glass-panel-soft: color-mix(in srgb, var(--dcuf-theme-accent-soft) 14%, rgba(255, 255, 255, .26));
            --dcuf-glass-panel-solid: color-mix(in srgb, var(--dcuf-theme-accent-soft) 12%, #f4f7fb);
            --dcuf-glass-panel-strong: color-mix(in srgb, var(--dcuf-theme-accent-soft) 14%, rgba(250, 252, 255, .82));
            --dcuf-glass-cell: color-mix(in srgb, var(--dcuf-theme-accent-soft) 4%, rgba(255, 255, 255, .82));
            --dcuf-glass-cell-soft: color-mix(in srgb, var(--dcuf-theme-accent-soft) 8%, rgba(255, 255, 255, .58));
            --dcuf-glass-input: color-mix(in srgb, var(--dcuf-theme-accent-soft) 6%, rgba(255, 255, 255, .82));
            --dcuf-glass-control: color-mix(in srgb, var(--dcuf-theme-accent-soft) 12%, rgba(255, 255, 255, .46));
            --dcuf-glass-paper: color-mix(in srgb, var(--dcuf-theme-accent-soft) 3%, rgba(255, 255, 255, .94));
            --dcuf-glass-control-active: color-mix(in srgb, var(--dcuf-theme-accent) 20%, rgba(255, 255, 255, .68));
            --dcuf-glass-control-active-top: color-mix(in srgb, var(--dcuf-theme-accent) 12%, rgba(255, 255, 255, .88));
            --dcuf-glass-on-active: var(--dcuf-theme-fg);
            --dcuf-glass-border: rgba(255, 255, 255, .72);
            --dcuf-glass-border-strong: rgba(70, 88, 124, .15);
            --dcuf-glass-highlight: rgba(255, 255, 255, .46);
            --dcuf-glass-rim: rgba(255, 255, 255, .88);
            --dcuf-glass-card-shadow: 0 6px 18px rgba(42, 57, 94, .06), 0 1px 4px rgba(42, 57, 94, .04);
            --dcuf-glass-popup-shadow: 0 26px 72px rgba(26, 38, 72, .22), 0 7px 22px rgba(26, 38, 72, .10);
            --dcuf-glass-accent-shadow: color-mix(in srgb, var(--dcuf-theme-accent-strong) 10%, transparent);
            --dcuf-glass-blur: 16px;
            --dcuf-radius-panel: 18px;
            --dcuf-radius-row: 11px;
            --dcuf-radius-control: 9px;
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
            --dcuf-glass-page: #111722;
            --dcuf-glass-panel: color-mix(in srgb, var(--dcuf-theme-accent-soft) 12%, rgba(24, 32, 47, .72));
            --dcuf-glass-panel-soft: color-mix(in srgb, var(--dcuf-theme-accent-soft) 10%, rgba(139, 158, 199, .10));
            --dcuf-glass-panel-solid: color-mix(in srgb, var(--dcuf-theme-accent-soft) 8%, #192232);
            --dcuf-glass-panel-strong: color-mix(in srgb, var(--dcuf-theme-accent-soft) 10%, rgba(29, 39, 57, .82));
            --dcuf-glass-cell: color-mix(in srgb, var(--dcuf-theme-accent-soft) 3%, rgba(28, 37, 53, .86));
            --dcuf-glass-cell-soft: color-mix(in srgb, var(--dcuf-theme-accent-soft) 5%, rgba(31, 42, 61, .72));
            --dcuf-glass-input: color-mix(in srgb, var(--dcuf-theme-accent-soft) 4%, rgba(15, 22, 34, .78));
            --dcuf-glass-control: color-mix(in srgb, var(--dcuf-theme-accent-soft) 8%, rgba(151, 170, 214, .12));
            --dcuf-glass-paper: color-mix(in srgb, var(--dcuf-theme-accent-soft) 2%, rgba(19, 27, 40, .94));
            --dcuf-glass-control-active: color-mix(in srgb, var(--dcuf-theme-accent) 22%, rgba(35, 45, 64, .82));
            --dcuf-glass-control-active-top: color-mix(in srgb, var(--dcuf-theme-accent) 13%, rgba(80, 94, 122, .42));
            --dcuf-glass-on-active: var(--dcuf-theme-fg);
            --dcuf-glass-border: rgba(222, 234, 255, .14);
            --dcuf-glass-border-strong: rgba(0, 0, 0, .22);
            --dcuf-glass-highlight: rgba(255, 255, 255, .08);
            --dcuf-glass-rim: rgba(239, 246, 255, .21);
            --dcuf-glass-card-shadow: 0 7px 20px rgba(0, 0, 0, .22), 0 1px 5px rgba(0, 0, 0, .15);
            --dcuf-glass-popup-shadow: 0 32px 86px rgba(0, 0, 0, .52), 0 8px 25px rgba(0, 0, 0, .30);
            --dcuf-glass-accent-shadow: color-mix(in srgb, var(--dcuf-theme-accent-strong) 13%, transparent);
            --dcuf-glass-blur: 17px;
        }

        /* DCUF_MOBILE_THEME_CSS_START */
        html[${ROOT_ATTRIBUTE}] #dcuf-boot-overlay .dcuf-boot-bar::before {
            background: linear-gradient(90deg, var(--dcuf-theme-accent-strong), var(--dcuf-theme-accent)) !important;
        }

        html[${ROOT_ATTRIBUTE}] body .custom-mobile-list {
            --dcuf-accent: var(--dcuf-theme-accent) !important;
            --dcuf-border: var(--dcuf-theme-border) !important;
            --dcuf-surface: var(--dcuf-theme-surface-muted) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap,
        html[${ROOT_ATTRIBUTE}] body #focus_cmt,
        html[${ROOT_ATTRIBUTE}] body div[id^="comment_wrap_"],
        html[${ROOT_ATTRIBUTE}] body .view_comment.image_comment {
            --dcuf-view-accent: var(--dcuf-theme-accent) !important;
            --dcuf-view-border: var(--dcuf-theme-border) !important;
            --dcuf-view-border-strong: var(--dcuf-theme-border-strong) !important;
            --dcuf-view-surface: var(--dcuf-theme-surface) !important;
            --dcuf-view-surface-muted: var(--dcuf-theme-surface-muted) !important;
        }
        html[${ROOT_ATTRIBUTE}] body.is-write-page,
        html[${ROOT_ATTRIBUTE}] body.is-write-page.dc-filter-dark-mode {
            --dcuf-write-accent: var(--dcuf-theme-accent) !important;
            --dcuf-write-accent-strong: var(--dcuf-theme-accent-strong) !important;
            --dcuf-write-border: var(--dcuf-theme-border) !important;
            --dcuf-write-border-strong: var(--dcuf-theme-border-strong) !important;
            --dcuf-write-surface: var(--dcuf-theme-surface) !important;
            --dcuf-write-surface-muted: var(--dcuf-theme-surface-muted) !important;
        }

        html[${ROOT_ATTRIBUTE}] body .custom-post-item.concept::before,
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting #dcinside-threshold-save,
        html[${ROOT_ATTRIBUTE}] body #dcinside-shortcut-modal #dcinside-save-shortcut-btn,
        html[${ROOT_ATTRIBUTE}] body #dc-personal-block-size-panel [data-dcuf-fab-size-action="save"],
        html[${ROOT_ATTRIBUTE}] body #dc-selection-popup .block-option button:not(.btn-unblock),
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel .panel-save-btn,
        html[${ROOT_ATTRIBUTE}] body #dc-backup-popup .export-btn,
        html[${ROOT_ATTRIBUTE}] body #dc-backup-popup .import-btn,
        html[${ROOT_ATTRIBUTE}] body #dc-manual-block-panel .dcuf-manual-actions [data-manual-block-action="add"],
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting #dcinside-proxy-ip-block-mode-group button[data-proxy-mode][aria-pressed="true"] {
            border-color: var(--dcuf-theme-accent-strong) !important;
            background-color: var(--dcuf-glass-control-active) !important;
            background-image: linear-gradient(145deg,var(--dcuf-glass-control-active-top),var(--dcuf-glass-control-active)) !important;
            color: var(--dcuf-theme-on-accent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel input:checked + .switch-slider,
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting input:checked + .switch-slider {
            background-color: var(--dcuf-glass-control-active) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel .panel-tab.active {
            border-color: color-mix(in srgb, var(--dcuf-theme-accent) 42%, transparent) !important;
            background: var(--dcuf-theme-accent-soft) !important;
            color: var(--dcuf-theme-accent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel .panel-tab.active::after {
            background: var(--dcuf-theme-accent-strong) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .custom-post-item.concept + .custom-post-item:not(.notice):not(.concept) {
            border-top-color: var(--dcuf-theme-accent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-personal-block-size-panel input[type="range"] {
            accent-color: var(--dcuf-theme-accent-strong) !important;
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
        html[${ROOT_ATTRIBUTE}] body #dc-personal-block-fab {
            border-color: color-mix(in srgb, var(--dcuf-theme-accent) 38%, transparent) !important;
            background: linear-gradient(180deg, #fff 0%, var(--dcuf-theme-accent-soft) 100%) !important;
            color: var(--dcuf-theme-accent-strong) !important;
            box-shadow: 0 14px 30px color-mix(in srgb, var(--dcuf-theme-accent) 20%, transparent), 0 3px 8px rgba(40,68,112,.1), inset 0 1px 0 #fff !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-personal-block-fab:hover {
            border-color: color-mix(in srgb, var(--dcuf-theme-accent) 54%, transparent) !important;
            background: linear-gradient(180deg, #fff 0%, color-mix(in srgb, var(--dcuf-theme-accent) 16%, var(--dcuf-theme-accent-soft)) 100%) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-personal-block-drawer button:hover,
        html[${ROOT_ATTRIBUTE}] body #dc-personal-block-drawer button:focus-visible {
            border-color: color-mix(in srgb, var(--dcuf-theme-accent) 28%, transparent) !important;
            background: linear-gradient(180deg, #fff, var(--dcuf-theme-accent-soft)) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-personal-block-drawer {
            background: linear-gradient(145deg, rgba(255,255,255,.98), color-mix(in srgb, var(--dcuf-theme-accent-soft) 78%, white)) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-personal-block-drawer .dcuf-menu-icon,
        html[${ROOT_ATTRIBUTE}] body #dc-selection-popup .dcuf-selection-prompt-icon {
            border-color: color-mix(in srgb, var(--dcuf-theme-accent) 28%, transparent) !important;
            background: linear-gradient(145deg, #fff, var(--dcuf-theme-accent-soft)) !important;
            color: var(--dcuf-theme-accent) !important;
            box-shadow: 0 5px 11px color-mix(in srgb, var(--dcuf-theme-accent) 18%, transparent), inset 0 1px 0 #fff !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-manual-block-panel [data-manual-block-type][aria-pressed="true"] {
            border-color: color-mix(in srgb, var(--dcuf-theme-accent) 35%, transparent) !important;
            background: linear-gradient(180deg, #fff, var(--dcuf-theme-accent-soft)) !important;
            color: var(--dcuf-theme-accent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-manual-block-panel {
            background: linear-gradient(155deg, #fff, color-mix(in srgb, var(--dcuf-theme-accent-soft) 72%, white)) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-manual-block-panel .dcuf-manual-header {
            background: linear-gradient(135deg, var(--dcuf-theme-accent-soft), #fff) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-manual-block-panel .dcuf-manual-type-tabs {
            border-color: color-mix(in srgb, var(--dcuf-theme-accent) 24%, #d6e0ef) !important;
            background: color-mix(in srgb, var(--dcuf-theme-accent-soft) 68%, #eaf0f8) !important;
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
            background: color-mix(in srgb, var(--dcuf-theme-accent-soft) 72%, white) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-selection-popup.dcuf-selection-prompt {
            border-color: color-mix(in srgb, var(--dcuf-theme-accent) 34%, transparent) !important;
            background: linear-gradient(145deg, rgba(255,255,255,.98), color-mix(in srgb, var(--dcuf-theme-accent-soft) 82%, white)) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-manual-block-panel .dcuf-manual-field input:focus,
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting :is(input, button):focus-visible,
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel :is(input, button):focus-visible,
        html[${ROOT_ATTRIBUTE}] body.is-write-page :is(input, textarea, select, button):focus-visible {
            border-color: var(--dcuf-theme-accent) !important;
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--dcuf-theme-accent) 18%, transparent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body.selection-mode-active .gall_writer,
        html[${ROOT_ATTRIBUTE}] body.selection-mode-active .ub-writer {
            outline-color: color-mix(in srgb, var(--dcuf-theme-accent) 66%, transparent) !important;
            background: color-mix(in srgb, var(--dcuf-theme-accent) 16%, transparent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .btn_recommend_box .up_num,
        html[${ROOT_ATTRIBUTE}] body .btn_recommend_box .font_blue.smallnum,
        html[${ROOT_ATTRIBUTE}] body .post-title .reply_num,
        html[${ROOT_ATTRIBUTE}] body #focus_cmt .comment_box .gall_writer .nickname.me,
        html[${ROOT_ATTRIBUTE}] body div[id^="comment_wrap_"] .comment_box .gall_writer .nickname.me {
            color: var(--dcuf-theme-accent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap .btn_recommend_box {
            border-color: var(--dcuf-theme-border) !important;
            background-color: var(--dcuf-theme-article-surface) !important;
            background-image: linear-gradient(180deg, var(--dcuf-theme-surface-raised), var(--dcuf-theme-article-surface)) !important;
            box-shadow: 0 2px 7px rgba(31, 41, 55, .07) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap .btn_recommend_box .inner_box > .inner {
            border-color: var(--dcuf-theme-border) !important;
            background-color: var(--dcuf-theme-card-top) !important;
            background-image: linear-gradient(180deg, var(--dcuf-theme-card-top), var(--dcuf-theme-card-bottom)) !important;
            box-shadow: var(--dcuf-theme-card-shadow), inset 0 1px 0 color-mix(in srgb, white 70%, transparent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap .btn_recommend_box .recom_bottom_box {
            border-color: var(--dcuf-theme-border) !important;
            background-color: transparent !important;
            background-image: none !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap .btn_recommend_box .recom_bottom_box > :is(button, a) {
            border-color: var(--dcuf-theme-border-strong) !important;
            background-color: var(--dcuf-theme-card-top) !important;
            background-image: linear-gradient(180deg, var(--dcuf-theme-card-top), var(--dcuf-theme-surface-input)) !important;
            color: var(--dcuf-theme-fg-muted) !important;
        }
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode .view_content_wrap .btn_recommend_box,
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode .view_content_wrap .btn_recommend_box .inner_box > .inner,
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode .view_content_wrap .btn_recommend_box .recom_bottom_box {
            border-color: var(--dcuf-theme-border) !important;
            box-shadow: 0 4px 12px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.035) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap .btn_recommend_box .btn_recom_up {
            display: inline-flex !important;
            width: 56px !important;
            min-width: 56px !important;
            height: 56px !important;
            align-items: center !important;
            justify-content: center !important;
            border: 1px solid color-mix(in srgb, var(--dcuf-theme-accent) 72%, transparent) !important;
            border-radius: 50% !important;
            background: linear-gradient(145deg, var(--dcuf-theme-accent), var(--dcuf-theme-accent-strong)) !important;
            box-shadow: 0 6px 14px var(--dcuf-theme-accent-shadow) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap .btn_recommend_box .btn_recom_up > em.icon_recom_up {
            position: relative !important;
            display: inline-flex !important;
            width: 100% !important;
            height: 100% !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 0 !important;
            background: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap .btn_recommend_box .btn_recom_up > em.icon_recom_up::before {
            content: "★" !important;
            color: var(--dcuf-theme-on-accent) !important;
            font: 900 26px/.9 Arial, sans-serif !important;
            text-shadow: 0 1px 1px rgba(0,0,0,.12) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap .btn_recommend_box .btn_recom_up > em.icon_recom_up::after {
            content: "개념" !important;
            display: block !important;
            margin-top: 2px !important;
            color: var(--dcuf-theme-on-accent) !important;
            font: 850 10px/1.05 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
            letter-spacing: -.04em !important;
            text-shadow: 0 1px 1px rgba(0,0,0,.12) !important;
        }
        /* Host chrome uses the palette only where DCInside itself uses its fixed blue accent. */
        html[${ROOT_ATTRIBUTE}] body .dcheader.typea,
        html[${ROOT_ATTRIBUTE}] body .page_head {
            border-color: var(--dcuf-theme-border-strong) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .dchead .top_search .bnt_search,
        html[${ROOT_ATTRIBUTE}] body .dchead .top_search button.sp_img.bnt_search,
        html[${ROOT_ATTRIBUTE}] body .dchead .area_links .btn_login,
        html[${ROOT_ATTRIBUTE}] body .dchead .area_links .btn_top_loginout,
        html[${ROOT_ATTRIBUTE}] body .page_head :is(.gall_search, .gall_search_box, .inner_search) :is(.btn_search, .bnt_search, button[type="submit"]),
        html[${ROOT_ATTRIBUTE}] body .page_head > .fl form :is(.btn_search, .bnt_search, button[type="submit"]) {
            border-color: color-mix(in srgb,var(--dcuf-theme-accent) 42%,rgba(255,255,255,.42)) !important;
            background-color: var(--dcuf-glass-control-active) !important;
            background-image: linear-gradient(145deg,var(--dcuf-glass-control-active-top),var(--dcuf-glass-control-active)) !important;
            color: var(--dcuf-theme-on-accent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .dchead .top_search {
            box-shadow: inset 0 0 0 1px var(--dcuf-theme-accent-strong) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .dchead .top_search :is(input, .inner_search) {
            border-color: var(--dcuf-theme-accent-strong) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .dchead .top_search .bnt_search::before,
        html[${ROOT_ATTRIBUTE}] body .dchead .top_search button.sp_img.bnt_search::before {
            content: "" !important;
            display: block !important;
            width: 12px !important;
            height: 12px !important;
            margin: auto !important;
            border: 3px solid var(--dcuf-theme-on-accent) !important;
            border-radius: 50% !important;
            box-shadow: 7px 7px 0 -5px var(--dcuf-theme-on-accent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .page_head :is(h2, h2 a, .gall_tit, .gall_tit a, .gallery_title, .gallery_title a),
        html[${ROOT_ATTRIBUTE}] body .newvisit_history > .tit,
        html[${ROOT_ATTRIBUTE}] body .newvisit_history > :is(.btn_open, .bnt_newvisit_more),
        html[${ROOT_ATTRIBUTE}] body .newvisit_history .newvisit_list a.on {
            color: var(--dcuf-theme-accent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .page_head :is(.icon_mini, .mini_icon, .gallery_badge) {
            border-color: var(--dcuf-theme-accent) !important;
            color: var(--dcuf-theme-accent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .page_head .pagehead_titicon:is(.mgall, .ngall).sp_img,
        html[${ROOT_ATTRIBUTE}] body .page_head h2 a > .pagehead_titicon:is(.mgall, .ngall).sp_img {
            display: inline-flex !important;
            width: 26px !important;
            height: 20px !important;
            margin-left: 5px !important;
            align-items: center !important;
            justify-content: center !important;
            border: 2px solid var(--dcuf-theme-accent) !important;
            border-radius: 2px !important;
            background: none !important;
            background-image: none !important;
            background-position: 0 0 !important;
            text-indent: 0 !important;
            overflow: hidden !important;
            color: var(--dcuf-theme-accent) !important;
            font-size: 0 !important;
            line-height: 1 !important;
            box-sizing: border-box !important;
            vertical-align: middle !important;
        }
        html[${ROOT_ATTRIBUTE}] body .page_head .pagehead_titicon:is(.mgall, .ngall).sp_img::before,
        html[${ROOT_ATTRIBUTE}] body .page_head h2 a > .pagehead_titicon:is(.mgall, .ngall).sp_img::before {
            content: "m" !important;
            font: 900 12px/1 Arial, sans-serif !important;
            text-transform: lowercase !important;
        }
        html[${ROOT_ATTRIBUTE}] body[data-fixture-variant="mini"] .page_head .pagehead_titicon:is(.mgall, .ngall).sp_img::before,
        html[${ROOT_ATTRIBUTE}] body:has(#top.miniwrap) .page_head .pagehead_titicon:is(.mgall, .ngall).sp_img::before,
        html[${ROOT_ATTRIBUTE}] body .miniwrap .page_head .pagehead_titicon:is(.mgall, .ngall).sp_img::before,
        html[${ROOT_ATTRIBUTE}] body .page_head .pagehead_titicon.ngall.sp_img::before {
            content: "mi" !important;
            font-size: 10px !important;
        }
        html[${ROOT_ATTRIBUTE}] body .gnb_bar .sp_img.icon_next {
            display: inline-block !important;
            width: 0 !important;
            height: 0 !important;
            margin-left: 8px !important;
            border: 0 solid transparent !important;
            border-right-width: 7px !important;
            border-left-width: 7px !important;
            border-top: 10px solid var(--dcuf-theme-on-accent) !important;
            background: none !important;
            filter: none !important;
            vertical-align: middle !important;
        }
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #dc-personal-block-fab {
            border-color: color-mix(in srgb, var(--dcuf-theme-accent) 45%, transparent) !important;
            background: linear-gradient(180deg, color-mix(in srgb, var(--dcuf-theme-accent-soft) 78%, #263347), #202b3a) !important;
            color: var(--dcuf-theme-accent) !important;
            box-shadow: 0 12px 28px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.08) !important;
        }
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #dc-personal-block-drawer button:hover,
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #dc-personal-block-drawer button:focus-visible,
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #dc-manual-block-panel [data-manual-block-type][aria-pressed="true"],
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #dc-block-management-panel .panel-tab.active {
            border-color: var(--dcuf-theme-border-strong) !important;
            background: linear-gradient(180deg, var(--dcuf-theme-surface-raised), var(--dcuf-theme-surface-muted)) !important;
            color: var(--dcuf-theme-accent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #dc-personal-block-drawer,
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #dc-manual-block-panel,
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #dc-selection-popup.dcuf-selection-prompt {
            border-color: var(--dcuf-theme-border-strong) !important;
            background: linear-gradient(145deg, var(--dcuf-theme-card-top), var(--dcuf-theme-card-bottom)) !important;
        }
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #dc-personal-block-drawer,
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #dc-manual-block-panel,
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #dc-selection-popup.dcuf-selection-prompt { background-color: var(--dcuf-theme-card-bottom) !important; }
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #dc-manual-block-panel .dcuf-manual-header,
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #dc-manual-block-panel .dcuf-manual-type-tabs {
            border-color: var(--dcuf-theme-border) !important;
            background: var(--dcuf-theme-reply-surface) !important;
        }
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #dc-personal-block-drawer .dcuf-menu-icon,
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #dc-selection-popup .dcuf-selection-prompt-icon {
            border-color: var(--dcuf-theme-border-strong) !important;
            background: linear-gradient(145deg, var(--dcuf-theme-card-top), var(--dcuf-theme-surface-raised)) !important;
            color: var(--dcuf-theme-accent) !important;
        }

        html[${ROOT_ATTRIBUTE}] body:not(.is-write-page) .list_array_option .array_tab .on,
        html[${ROOT_ATTRIBUTE}] body:not(.is-write-page) .list_array_option .array_tab button.on,
        html[${ROOT_ATTRIBUTE}] body:not(.is-write-page) .list_array_option .array_tab a.on,
        html[${ROOT_ATTRIBUTE}] body:not(.is-write-page) .list_array_option .array_tab li.on > a,
        html[${ROOT_ATTRIBUTE}] body:not(.is-write-page) .list_array_option .btn_write,
        html[${ROOT_ATTRIBUTE}] body:not(.is-write-page) .list_array_option .write,
        html[${ROOT_ATTRIBUTE}] body .custom-bottom-controls .dcuf-bottom-action-card .on,
        html[${ROOT_ATTRIBUTE}] body .custom-bottom-controls .dcuf-bottom-action-card .btn_write,
        html[${ROOT_ATTRIBUTE}] body .custom-bottom-controls .dcuf-bottom-action-card .write,
        html[${ROOT_ATTRIBUTE}] body .custom-bottom-controls .bottom_paging_box > strong,
        html[${ROOT_ATTRIBUTE}] body .custom-bottom-controls .bottom_paging_box > em,
        html[${ROOT_ATTRIBUTE}] body .custom-bottom-controls .bottom_paging_box > .on,
        html[${ROOT_ATTRIBUTE}] body .custom-bottom-controls .bottom_paging_box > span > strong,
        html[${ROOT_ATTRIBUTE}] body .custom-bottom-controls .bottom_paging_box > div > strong,
        html[${ROOT_ATTRIBUTE}] body .custom-bottom-controls .dcuf-search-card form[name="frmSearch"] .bnt_search,
        html[${ROOT_ATTRIBUTE}] body #container.gallery_view .view_bottom_btnbox .btn_blue,
        html[${ROOT_ATTRIBUTE}] body #container.gallery_view .view_bottom_btnbox .write,
        html[${ROOT_ATTRIBUTE}] body #container.minor_view .view_bottom_btnbox .btn_blue,
        html[${ROOT_ATTRIBUTE}] body #container.minor_view .view_bottom_btnbox .write,
        html[${ROOT_ATTRIBUTE}] body #container.mini_view .view_bottom_btnbox .btn_blue,
        html[${ROOT_ATTRIBUTE}] body #container.mini_view .view_bottom_btnbox .write,
        html[${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form .btn_bottom_box .btn_blue,
        html[${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form .btm-btns-box .btn-line-blue,
        html[${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form > .btn_box.write > .btn_blue,
        html[${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form .ai_easy_box > .btn_aigo,
        html[${ROOT_ATTRIBUTE}] body #focus_cmt .cmt_write_box .cmt_btn_bot > button,
        html[${ROOT_ATTRIBUTE}] body #focus_cmt .cmt_write_box .cmt_cont_bottm > .fr > button,
        html[${ROOT_ATTRIBUTE}] body #container .view_comment.image_comment .cmt_write_box .cmt_btn_bot > button,
        html[${ROOT_ATTRIBUTE}] body #container .view_comment.image_comment .cmt_write_box .cmt_cont_bottm > .fr > button {
            border-color: var(--dcuf-theme-accent-strong) !important;
            background-color: var(--dcuf-glass-control-active) !important;
            background-image: linear-gradient(145deg,var(--dcuf-glass-control-active-top),var(--dcuf-glass-control-active)) !important;
            color: var(--dcuf-theme-on-accent) !important;
            box-shadow: 0 6px 14px var(--dcuf-theme-accent-shadow) !important;
        }
        html[${ROOT_ATTRIBUTE}] body:not(.is-write-page) .list_array_option .btn_write::before,
        html[${ROOT_ATTRIBUTE}] body .custom-bottom-controls .dcuf-bottom-action-card .btn_write::before,
        html[${ROOT_ATTRIBUTE}] body .custom-bottom-controls .dcuf-bottom-action-card .write::before {
            content: "\\270E" !important;
            display: inline-block !important;
            width: auto !important;
            height: auto !important;
            margin: 0 5px 0 0 !important;
            border: 0 !important;
            background: none !important;
            color: var(--dcuf-theme-on-accent) !important;
            font: 900 15px/1 Arial, sans-serif !important;
            filter: none !important;
            transform: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body:not(.is-write-page) .list_array_option,
        html[${ROOT_ATTRIBUTE}] body .custom-bottom-controls .dcuf-bottom-action-card,
        html[${ROOT_ATTRIBUTE}] body .custom-bottom-controls .dcuf-pagination-card,
        html[${ROOT_ATTRIBUTE}] body .custom-bottom-controls .dcuf-search-card,
        html[${ROOT_ATTRIBUTE}] body #container.gallery_view .view_bottom_btnbox,
        html[${ROOT_ATTRIBUTE}] body #container.minor_view .view_bottom_btnbox,
        html[${ROOT_ATTRIBUTE}] body #container.mini_view .view_bottom_btnbox {
            border-color: var(--dcuf-theme-border) !important;
            background-color: var(--dcuf-theme-surface-raised) !important;
            background-image: none !important;
        }

        /* The list canvas carries the preset softly; each post remains a readable raised card. */
        html[${ROOT_ATTRIBUTE}] body #container .custom-mobile-list {
            border-color: var(--dcuf-theme-border) !important;
            background-color: var(--dcuf-theme-canvas) !important;
            background-image: linear-gradient(180deg, var(--dcuf-theme-canvas), color-mix(in srgb, var(--dcuf-theme-canvas) 76%, var(--dcuf-theme-surface-raised))) !important;
        }
        html[${ROOT_ATTRIBUTE}] body:not(.is-write-page) .list_array_option,
        html[${ROOT_ATTRIBUTE}] body .custom-bottom-controls .dcuf-bottom-action-card {
            background-color: var(--dcuf-theme-surface-raised) !important;
            background-image: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body .custom-bottom-controls .dcuf-pagination-card,
        html[${ROOT_ATTRIBUTE}] body .custom-bottom-controls .dcuf-search-card {
            background-color: var(--dcuf-theme-card-top) !important;
            background-image: linear-gradient(180deg, var(--dcuf-theme-card-top), var(--dcuf-theme-card-bottom)) !important;
            box-shadow: var(--dcuf-theme-card-shadow) !important;
        }
        html[${ROOT_ATTRIBUTE}] body:not(.is-write-page) .list_array_option :is(select, .select_area),
        html[${ROOT_ATTRIBUTE}] body .custom-bottom-controls .dcuf-bottom-action-card :is(button, .btn_white),
        html[${ROOT_ATTRIBUTE}] body .custom-bottom-controls .dcuf-pagination-card .btn_schmove,
        html[${ROOT_ATTRIBUTE}] body .custom-bottom-controls .dcuf-search-card :is(select, .select_area, .in_keyword, input[type="text"]) {
            border-color: var(--dcuf-theme-border-strong) !important;
            background-color: var(--dcuf-theme-surface-input) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .custom-mobile-list .custom-post-item,
        html[${ROOT_ATTRIBUTE}] body .custom-mobile-list .post-meta,
        html[${ROOT_ATTRIBUTE}] body .custom-mobile-list .post-meta .author {
            -webkit-tap-highlight-color: transparent !important;
        }
        html[${ROOT_ATTRIBUTE}] body .custom-mobile-list .post-title-link {
            display: inline-block !important;
            flex: 0 1 auto !important;
            width: auto !important;
            min-width: 0 !important;
            max-width: 100% !important;
            -webkit-tap-highlight-color: color-mix(in srgb, var(--dcuf-theme-accent) 24%, transparent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .custom-mobile-list .custom-post-item {
            border-color: var(--dcuf-theme-border) !important;
            background-color: var(--dcuf-theme-card-top) !important;
            background-image: linear-gradient(180deg, var(--dcuf-theme-card-top) 0%, var(--dcuf-theme-card-bottom) 100%) !important;
            box-shadow: none !important;
            outline: 2px solid transparent !important;
            outline-offset: -2px !important;
            transition: transform .14s ease, filter .08s ease, border-color .08s ease, outline-color .08s ease !important;
        }
        html[${ROOT_ATTRIBUTE}] body .custom-mobile-list .custom-post-item.concept {
            border-color: color-mix(in srgb, var(--dcuf-theme-accent) 18%, var(--dcuf-theme-border)) !important;
            background-color: var(--dcuf-theme-concept-surface) !important;
            background-image: linear-gradient(180deg, color-mix(in srgb, white 24%, var(--dcuf-theme-concept-surface)), var(--dcuf-theme-concept-surface)) !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body .custom-mobile-list .custom-post-item.notice {
            border-color: color-mix(in srgb, #7b8492 22%, var(--dcuf-theme-border)) !important;
            background-color: var(--dcuf-theme-notice-surface) !important;
            background-image: linear-gradient(180deg, color-mix(in srgb, white 24%, var(--dcuf-theme-notice-surface)), var(--dcuf-theme-notice-surface)) !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode .custom-mobile-list .custom-post-item:is(.concept, .notice) {
            background-image: linear-gradient(180deg, rgba(255,255,255,.018), transparent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .custom-mobile-list .custom-post-item .post-title {
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        /* Preserve the native title link while giving touch and mouse presses immediate feedback. */
        html[${ROOT_ATTRIBUTE}] body .custom-mobile-list .custom-post-item:has(.post-title-link:active) {
            border-color: color-mix(in srgb, var(--dcuf-theme-accent) 56%, var(--dcuf-theme-border)) !important;
            outline-color: color-mix(in srgb, var(--dcuf-theme-accent) 34%, transparent) !important;
            filter: brightness(.94) saturate(1.06) !important;
        }
        @media (hover: hover) and (pointer: fine) {
            html[${ROOT_ATTRIBUTE}] body .custom-mobile-list .custom-post-item:hover {
                transform: translateY(-1px) !important;
                border-color: var(--dcuf-theme-border-strong) !important;
            }
        }
        @media (max-width: 1023px) {
            html[${ROOT_ATTRIBUTE}] body .custom-mobile-list .post-meta .author {
                flex: 0 1 auto !important;
                align-self: flex-start !important;
                width: max-content !important;
                max-width: calc(100% - 120px) !important;
            }
        }

        /* View title, article, and comment hierarchy. */
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap .gallview_head {
            border-color: var(--dcuf-theme-border-strong) !important;
            background-color: var(--dcuf-theme-surface-raised) !important;
            background-image: linear-gradient(180deg, color-mix(in srgb, white 20%, var(--dcuf-theme-surface-raised)) 0%, var(--dcuf-theme-surface) 100%) !important;
            box-shadow: inset 0 1px 0 color-mix(in srgb, white 70%, transparent), 0 5px 14px rgba(31, 41, 55, .09) !important;
        }
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode .view_content_wrap .gallview_head {
            background-image: linear-gradient(180deg, color-mix(in srgb, white 5%, var(--dcuf-theme-surface-raised)) 0%, var(--dcuf-theme-surface) 100%) !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,.07), 0 5px 14px rgba(0,0,0,.22) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap .gallview_contents,
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap .writing_view_box {
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap .writing_view_box > .write_div {
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body #focus_cmt {
            border-color: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body #focus_cmt .comment_box {
            border-color: transparent !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body #focus_cmt .comment_count,
        html[${ROOT_ATTRIBUTE}] body #focus_cmt .bottom_paging_box {
            background: transparent !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li {
            border-color: var(--dcuf-theme-border) !important;
            background-color: var(--dcuf-theme-card-top) !important;
            background-image: linear-gradient(180deg, var(--dcuf-theme-card-top), var(--dcuf-theme-card-bottom)) !important;
            box-shadow: var(--dcuf-theme-card-shadow) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li[data-dcuf-focus-group-parent="1"]::after {
            border-color: var(--dcuf-theme-border) !important;
            background-color: var(--dcuf-theme-card-top) !important;
            background-image: linear-gradient(180deg, var(--dcuf-theme-card-top), var(--dcuf-theme-card-bottom)) !important;
            box-shadow: var(--dcuf-theme-card-shadow) !important;
        }
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li,
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li[data-dcuf-focus-group-parent="1"]::after {
            border-color: var(--dcuf-theme-border) !important;
            background-color: var(--dcuf-theme-card-top) !important;
            background-image: linear-gradient(180deg, var(--dcuf-theme-card-top), var(--dcuf-theme-card-bottom)) !important;
            box-shadow: var(--dcuf-theme-card-shadow) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #focus_cmt .comment_box .reply.show {
            border-top-color: var(--dcuf-theme-border) !important;
            background: transparent !important;
        }
        html[${ROOT_ATTRIBUTE}] body #focus_cmt .comment_box .reply_box,
        html[${ROOT_ATTRIBUTE}] body #focus_cmt .comment_box .cmt_list > li[data-dcuf-focus-group-reply="1"] > .reply.show > .reply_box {
            border-color: var(--dcuf-theme-border) !important;
            border-left-color: color-mix(in srgb, var(--dcuf-theme-accent) 28%, var(--dcuf-theme-border-strong)) !important;
            background-color: var(--dcuf-theme-reply-surface) !important;
            background-image: linear-gradient(180deg, color-mix(in srgb, white 20%, var(--dcuf-theme-reply-surface)), var(--dcuf-theme-reply-surface)) !important;
            box-shadow: 0 1px 3px rgba(49,42,38,.045), 0 5px 14px color-mix(in srgb, var(--dcuf-theme-accent-strong) 5%, transparent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_box,
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li[data-dcuf-focus-group-reply="1"] > .reply.show > .reply_box {
            border-color: var(--dcuf-theme-border) !important;
            border-left-color: color-mix(in srgb, var(--dcuf-theme-accent) 28%, var(--dcuf-theme-border-strong)) !important;
            background-color: var(--dcuf-theme-reply-surface) !important;
            background-image: linear-gradient(180deg, color-mix(in srgb, white 3%, var(--dcuf-theme-reply-surface)), var(--dcuf-theme-reply-surface)) !important;
            box-shadow: 0 2px 7px rgba(0,0,0,.16) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #focus_cmt .comment_box .reply_list > li,
        html[${ROOT_ATTRIBUTE}] body #focus_cmt .comment_box .reply_list > li + li {
            border-color: var(--dcuf-theme-border) !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body #focus_cmt .comment_box .reply_list > li .cmt_nickbox::before {
            color: var(--dcuf-theme-fg-muted) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #focus_cmt .cmt_write_box,
        html[${ROOT_ATTRIBUTE}] body #container .view_comment.image_comment .cmt_write_box {
            border-color: var(--dcuf-theme-border) !important;
            background-color: var(--dcuf-theme-surface) !important;
            background-image: linear-gradient(180deg, var(--dcuf-theme-surface-raised), var(--dcuf-theme-surface)) !important;
            box-shadow: 0 3px 10px rgba(31, 41, 55, .07) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #focus_cmt .cmt_write_box :is(.cmt_txt_cont, .user_info_input input),
        html[${ROOT_ATTRIBUTE}] body #container .view_comment.image_comment .cmt_write_box :is(.cmt_txt_cont, .user_info_input input) {
            border-color: var(--dcuf-theme-border-strong) !important;
            background-color: var(--dcuf-theme-surface-input) !important;
            background-image: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body #focus_cmt .cmt_write_box :is(.cmt_write, textarea),
        html[${ROOT_ATTRIBUTE}] body #container .view_comment.image_comment .cmt_write_box :is(.cmt_write, textarea) {
            background-color: var(--dcuf-theme-surface-input) !important;
            background-image: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body #focus_cmt .cmt_write_box .cmt_cont_bottm,
        html[${ROOT_ATTRIBUTE}] body #container .view_comment.image_comment .cmt_write_box .cmt_cont_bottm {
            border-color: var(--dcuf-theme-border) !important;
            background-color: var(--dcuf-theme-surface-input) !important;
            background-image: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body #focus_cmt .reply_box .cmt_write_box.small {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            border-color: var(--dcuf-theme-border) !important;
            background-color: var(--dcuf-theme-surface) !important;
            background-image: none !important;
            box-sizing: border-box !important;
        }
        html[${ROOT_ATTRIBUTE}] body #focus_cmt .reply_box .cmt_write_box.small > .fl,
        html[${ROOT_ATTRIBUTE}] body #focus_cmt .reply_box .cmt_write_box.small .cmt_txt_cont {
            max-width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
        }
        html[${ROOT_ATTRIBUTE}] body #focus_cmt .reply_box .cmt_write_box.small .cmt_txt_cont,
        html[${ROOT_ATTRIBUTE}] body #focus_cmt .reply_box .cmt_write_box.small .cmt_write,
        html[${ROOT_ATTRIBUTE}] body #focus_cmt .reply_box .cmt_write_box.small textarea,
        html[${ROOT_ATTRIBUTE}] body #focus_cmt .reply_box .cmt_write_box.small .user_info_input input:not([type="hidden"]) {
            border-color: var(--dcuf-theme-border-strong) !important;
            background-color: var(--dcuf-theme-surface-input) !important;
            background-image: none !important;
            color: var(--dcuf-theme-fg) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #focus_cmt .reply_box .cmt_write_box.small .cmt_cont_bottm {
            border-color: var(--dcuf-theme-border) !important;
            background-color: var(--dcuf-theme-surface-input) !important;
            background-image: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body #container .view_comment.image_comment .comment_box.img_comment_box,
        html[${ROOT_ATTRIBUTE}] body #container .view_comment.image_comment .comment_wrap {
            border-color: var(--dcuf-theme-border) !important;
            background-color: var(--dcuf-theme-canvas) !important;
            background-image: linear-gradient(180deg, color-mix(in srgb, white 5%, var(--dcuf-theme-canvas)), var(--dcuf-theme-canvas)) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #container .view_comment.image_comment .comment_box.img_comment_box .cmt_list > li,
        html[${ROOT_ATTRIBUTE}] body #container .view_comment.image_comment .comment_box.img_comment_box .reply_list > li {
            border-color: var(--dcuf-theme-border) !important;
            background-color: var(--dcuf-theme-card-top) !important;
            background-image: linear-gradient(180deg, var(--dcuf-theme-card-top), var(--dcuf-theme-card-bottom)) !important;
            box-shadow: var(--dcuf-theme-card-shadow) !important;
        }

        /* Write-page card hierarchy. Inputs remain nearly neutral while grouping cards carry the preset tint. */
        html[${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form {
            border-color: var(--dcuf-theme-border) !important;
            background-color: var(--dcuf-theme-canvas) !important;
            background-image: linear-gradient(180deg, color-mix(in srgb, white 5%, var(--dcuf-theme-canvas)), var(--dcuf-theme-canvas)) !important;
            box-shadow: var(--dcuf-theme-panel-shadow) !important;
        }
        html[${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form :is(.write_subject, .btn_bottom_box, .btm-btns-box),
        html[${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form > .btn_box.write,
        html[${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form :is(.ai_easy_wrap, .ai_easy_box),
        html[${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form [class*="file_upload"]:not(.pop_wrap *):not(.note-dropdown-menu *):not(.note-popover *):not(.note-modal *) {
            border-color: var(--dcuf-theme-border) !important;
            background-color: var(--dcuf-theme-surface) !important;
            background-image: linear-gradient(180deg, var(--dcuf-theme-surface-raised), var(--dcuf-theme-surface)) !important;
        }
        html[${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form :is(#subject, #name, #password, #code, .dcuf-write-captcha-image),
        html[${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form .captcha {
            border-color: var(--dcuf-theme-border-strong) !important;
            background-color: var(--dcuf-theme-surface-input) !important;
            background-image: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form :is(.editor_wrap, .note-editor) {
            border-color: var(--dcuf-theme-border) !important;
            background-color: var(--dcuf-theme-surface-input) !important;
        }
        html[${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form :is(.note-toolbar, .note-toolbar-media, .tx-toolbar-basic, .btns-box, .note-statusbar) {
            border-color: var(--dcuf-theme-border) !important;
            background-color: var(--dcuf-theme-surface-muted) !important;
            background-image: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form :is(.note-editing-area, .note-editable) {
            background-color: var(--dcuf-theme-surface-input) !important;
            background-image: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form :is(.note-editing-area, .note-editable, #subject, #name, #password, #code, textarea),
        html[${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form :is(.btn_bottom_box, .btm-btns-box) :is(.btn_lightred, .btn-line-gray),
        html[${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form > .btn_box.write > .btn_grey {
            border-color: var(--dcuf-theme-border-strong) !important;
            background-color: var(--dcuf-theme-surface-input) !important;
            background-image: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form :is(.note-toolbar, .note-toolbar-media, .tx-toolbar-basic, .btns-box) :is(.note-btn, button, select),
        html[${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form :is(.note-toolbar, .note-toolbar-media, .tx-toolbar-basic, .btns-box) .note-btn-group > :is(a, span) {
            border-color: var(--dcuf-theme-border-strong) !important;
            background-color: var(--dcuf-theme-surface-input) !important;
            background-image: none !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form :is(.note-toolbar, .note-toolbar-media, .tx-toolbar-basic, .btns-box) :is(.note-btn, button, select):is(:hover, :focus-visible, .active),
        html[${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form :is(.note-toolbar, .note-toolbar-media, .tx-toolbar-basic, .btns-box) .note-btn-group.open > :is(.note-btn, button, a) {
            border-color: var(--dcuf-theme-accent) !important;
            box-shadow: 0 0 0 1px color-mix(in srgb, var(--dcuf-theme-accent) 28%, transparent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form .write_subject > .dcuf-write-headtext-label {
            background-color: var(--dcuf-theme-surface-muted) !important;
        }
        /* Inactive navigation/actions are neutral; selected and primary actions keep the preset accent. */
        html[${ROOT_ATTRIBUTE}] body:not(.is-write-page) .list_array_option .array_tab li:not(.on) > a,
        html[${ROOT_ATTRIBUTE}] body:not(.is-write-page) .list_array_option .array_tab :is(button, a):not(.on),
        html[${ROOT_ATTRIBUTE}] body .custom-bottom-controls .dcuf-bottom-action-card :is(button, a):not(.on):not(.btn_write):not(.write),
        html[${ROOT_ATTRIBUTE}] body #container:is(.gallery_view, .minor_view, .mini_view) .view_bottom_btnbox :is(.btn_white, .btn_grey),
        html[${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form :is(.btn_lightred, .btn-line-gray, .btn_grey) {
            border-color: var(--dcuf-theme-border-strong) !important;
            background-color: var(--dcuf-theme-surface-input) !important;
            background-image: linear-gradient(180deg, var(--dcuf-theme-card-top), var(--dcuf-theme-surface-input)) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: 0 2px 6px color-mix(in srgb, var(--dcuf-theme-accent-strong) 4%, transparent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #container:is(.gallery_view, .minor_view, .mini_view) .view_bottom_btnbox .cancle:is(:hover, :focus-visible) {
            border-color: #d87070 !important;
            background: #fff1f2 !important;
            color: #b42318 !important;
        }
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #container:is(.gallery_view, .minor_view, .mini_view) .view_bottom_btnbox .cancle:is(:hover, :focus-visible) {
            border-color: #b95d65 !important;
            background: #3b2025 !important;
            color: #ffb4bc !important;
        }
        html[${ROOT_ATTRIBUTE}] body .custom-bottom-controls .dcuf-bottom-action-card,
        html[${ROOT_ATTRIBUTE}] body #container:is(.gallery_view, .minor_view, .mini_view) .view_bottom_btnbox {
            border-color: var(--dcuf-theme-border) !important;
            background-color: var(--dcuf-theme-surface-raised) !important;
            background-image: linear-gradient(180deg, var(--dcuf-theme-card-top), var(--dcuf-theme-surface-raised)) !important;
            box-shadow: var(--dcuf-theme-card-shadow), inset 0 1px 0 color-mix(in srgb, white 68%, transparent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .custom-bottom-controls .dcuf-bottom-action-card :is(button, a),
        html[${ROOT_ATTRIBUTE}] body #container:is(.gallery_view, .minor_view, .mini_view) .view_bottom_btnbox :is(button, a) {
            border-radius: 11px !important;
            box-shadow: 0 3px 8px color-mix(in srgb, var(--dcuf-theme-accent-strong) 6%, transparent), inset 0 1px 0 color-mix(in srgb, white 72%, transparent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode .custom-bottom-controls .dcuf-bottom-action-card,
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #container:is(.gallery_view, .minor_view, .mini_view) .view_bottom_btnbox {
            box-shadow: 0 7px 18px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.045) !important;
        }

        /* Glass material pass: visual-only overrides, with the existing geometry and event rails intact. */
        html[${ROOT_ATTRIBUTE}] body {
            background-color: var(--dcuf-glass-page) !important;
            background-image:
                radial-gradient(circle at 18% 5%, color-mix(in srgb, var(--dcuf-theme-accent-soft) 28%, transparent), transparent 34%),
                linear-gradient(180deg, color-mix(in srgb, var(--dcuf-glass-highlight) 34%, transparent), transparent 320px) !important;
            color: var(--dcuf-theme-fg) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            .dcheader.typea,
            .gnb_bar,
            .newvisit_history,
            .list_array_option,
            .custom-bottom-controls .dcuf-bottom-action-card,
            .custom-bottom-controls .dcuf-pagination-card,
            .custom-bottom-controls .dcuf-search-card,
            #container:is(.gallery_view,.minor_view,.mini_view) .view_bottom_btnbox
        ) {
            border-color: var(--dcuf-glass-border) !important;
            background-color: var(--dcuf-glass-panel-solid) !important;
            background-image: linear-gradient(180deg, var(--dcuf-glass-highlight), transparent 68%) !important;
            box-shadow: var(--dcuf-glass-card-shadow), inset 0 1px 0 var(--dcuf-glass-highlight) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            .view_content_wrap,
            #focus_cmt > div[id^="comment_wrap_"],
            #container .view_comment.image_comment .comment_wrap,
            form.dcuf-write-form,
            .dcuf-password-card
        ) {
            border-color: var(--dcuf-glass-border) !important;
            box-shadow: var(--dcuf-glass-card-shadow), inset 0 1px 0 var(--dcuf-glass-highlight) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .custom-post-item:not(.notice):not(.concept) {
            background-color: var(--dcuf-glass-panel-solid) !important;
            background-image: linear-gradient(150deg, var(--dcuf-glass-highlight), transparent 48%) !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body .custom-post-item.notice {
            border-left-color: color-mix(in srgb, var(--dcuf-theme-fg-muted) 36%, var(--dcuf-glass-border)) !important;
            background-image: linear-gradient(150deg, var(--dcuf-glass-highlight), transparent 48%) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .custom-post-item.concept {
            border-left-color: color-mix(in srgb, var(--dcuf-theme-accent) 64%, var(--dcuf-glass-border)) !important;
            background-image:
                linear-gradient(150deg, color-mix(in srgb, var(--dcuf-theme-accent-soft) 42%, var(--dcuf-glass-highlight)), transparent 55%),
                linear-gradient(180deg, var(--dcuf-theme-concept-surface), var(--dcuf-theme-card-bottom)) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            .dchead .top_search,
            .page_head :is(.gall_search,.gall_search_box,.inner_search),
            .custom-bottom-controls .bottom_search,
            form.dcuf-write-form :is(input:not([type="checkbox"]):not([type="radio"]),textarea,select),
            #focus_cmt .cmt_write_box :is(input:not([type="checkbox"]),textarea),
            #container .view_comment.image_comment .cmt_write_box :is(input:not([type="checkbox"]),textarea)
        ) {
            border-color: var(--dcuf-glass-border-strong) !important;
            background-color: var(--dcuf-glass-input) !important;
            background-image: linear-gradient(180deg, color-mix(in srgb, var(--dcuf-glass-highlight) 54%, transparent), transparent 62%) !important;
            box-shadow: inset 0 1px 2px rgba(27,39,61,.08), 0 1px 0 var(--dcuf-glass-highlight) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            .list_array_option .array_tab li:not(.on) > a,
            .list_array_option .array_tab :is(button,a):not(.on),
            .list_array_option .select_area,
            .custom-bottom-controls :is(button,select):not(.btn_write):not(.write),
            .custom-bottom-controls a:not(.sp_pagingicon):not(.btn_write):not(.write),
            #container:is(.gallery_view,.minor_view,.mini_view) .view_bottom_btnbox :is(.btn_white,.btn_grey),
            form.dcuf-write-form :is(.btn_lightred,.btn-line-gray,.btn_grey)
        ) {
            border-color: var(--dcuf-glass-border-strong) !important;
            background-color: var(--dcuf-glass-control) !important;
            background-image: linear-gradient(180deg, var(--dcuf-glass-highlight), transparent 74%) !important;
            box-shadow: 0 4px 11px rgba(31,45,70,.07), inset 0 1px 0 var(--dcuf-glass-highlight) !important;
            color: var(--dcuf-theme-fg) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            .dchead .top_search .bnt_search,
            .dchead .area_links .btn_login,
            .dchead .area_links .btn_top_loginout,
            .page_head :is(.gall_search,.gall_search_box,.inner_search) :is(.btn_search,.bnt_search,button[type="submit"]),
            .list_array_option .array_tab .on,
            .list_array_option .array_tab li.on > a,
            .list_array_option .btn_write,
            .custom-bottom-controls .bottom_paging_box > em,
            .custom-bottom-controls .dcuf-search-card .bnt_search,
            .custom-bottom-controls :is(.btn_write,.write),
            #container:is(.gallery_view,.minor_view,.mini_view) .view_bottom_btnbox :is(.btn_blue,.btn_write,.write),
            #focus_cmt .cmt_write_box .btn_blue,
            #container .view_comment.image_comment .cmt_write_box .btn_blue,
            form.dcuf-write-form :is(.btn_blue,.btn_svc,#write-submit),
            .dcuf-password-card :is(.btn_blue,.btn_svc,.btn_ok)
        ) {
            border-color: color-mix(in srgb, var(--dcuf-theme-accent-strong) 74%, var(--dcuf-glass-border-strong)) !important;
            background-color: var(--dcuf-glass-control-active) !important;
            background-image: linear-gradient(180deg, var(--dcuf-glass-control-active-top), var(--dcuf-glass-control-active)) !important;
            color: var(--dcuf-glass-on-active) !important;
            box-shadow: 0 9px 20px var(--dcuf-glass-accent-shadow), inset 0 1px 0 color-mix(in srgb, white 38%, transparent), inset 0 -1px 0 rgba(0,0,0,.12) !important;
            text-shadow: 0 1px 1px rgba(0,0,0,.12) !important;
            transition: transform .15s ease, box-shadow .15s ease, filter .15s ease !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            .list_array_option .array_tab .on,
            .list_array_option .array_tab li.on > a,
            .list_array_option .btn_write,
            .custom-bottom-controls .bottom_paging_box > em,
            .custom-bottom-controls .dcuf-search-card .bnt_search,
            .custom-bottom-controls :is(.btn_write,.write),
            #container:is(.gallery_view,.minor_view,.mini_view) .view_bottom_btnbox :is(.btn_blue,.btn_write,.write),
            #focus_cmt .cmt_write_box .btn_blue,
            form.dcuf-write-form :is(.btn_blue,.btn_svc,#write-submit)
        ):active {
            transform: translateY(1px) !important;
            box-shadow: 0 4px 10px var(--dcuf-glass-accent-shadow), inset 0 1px 3px rgba(0,0,0,.16) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap .btn_recommend_box .btn_recom_up {
            background-color: var(--dcuf-glass-control-active) !important;
            background-image: linear-gradient(145deg, var(--dcuf-glass-control-active-top), var(--dcuf-glass-control-active)) !important;
            box-shadow: 0 10px 22px var(--dcuf-glass-accent-shadow), inset 0 1px 0 color-mix(in srgb, white 38%, transparent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            .view_content_wrap .btn_recommend_box,
            .view_content_wrap .btn_recommend_box .inner_box > .inner,
            #focus_cmt .comment_box .cmt_list > li,
            #container .view_comment.image_comment .comment_box.img_comment_box .cmt_list > li,
            #container .view_comment.image_comment .comment_box.img_comment_box .reply_list > li
        ) {
            border-color: var(--dcuf-glass-border) !important;
            box-shadow: var(--dcuf-glass-card-shadow), inset 0 1px 0 var(--dcuf-glass-highlight) !important;
        }
        @supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
            html[${ROOT_ATTRIBUTE}] body :is(
                .dcheader.typea,
                .gnb_bar,
                .newvisit_history,
                .list_array_option,
                .custom-bottom-controls .dcuf-bottom-action-card,
                .custom-bottom-controls .dcuf-pagination-card,
                .custom-bottom-controls .dcuf-search-card,
                #container:is(.gallery_view,.minor_view,.mini_view) .view_bottom_btnbox
            ) {
                background-color: var(--dcuf-glass-panel) !important;
                -webkit-backdrop-filter: blur(var(--dcuf-glass-blur)) saturate(1.08) !important;
                backdrop-filter: blur(var(--dcuf-glass-blur)) saturate(1.08) !important;
            }
            html[${ROOT_ATTRIBUTE}] body .custom-bottom-controls .dcuf-bottom-action-card {
                background-color: var(--dcuf-glass-panel-strong) !important;
            }
        }
        @media (prefers-reduced-transparency: reduce) {
            html[${ROOT_ATTRIBUTE}] body :is(
                .dcheader.typea,.gnb_bar,.newvisit_history,.list_array_option,
                .custom-bottom-controls .dcuf-bottom-action-card,
                .custom-bottom-controls .dcuf-pagination-card,
                .custom-bottom-controls .dcuf-search-card,
                #container:is(.gallery_view,.minor_view,.mini_view) .view_bottom_btnbox
            ) {
                background-color: var(--dcuf-glass-panel-solid) !important;
                -webkit-backdrop-filter: none !important;
                backdrop-filter: none !important;
            }
        }
        @media (prefers-reduced-motion: reduce) {
            html[${ROOT_ATTRIBUTE}] body *, html[${ROOT_ATTRIBUTE}] body *::before, html[${ROOT_ATTRIBUTE}] body *::after {
                scroll-behavior: auto !important;
                transition: none !important;
                animation: none !important;
            }
        }

        /* Glass remodeling: replace the remaining flat host chrome without changing its DOM rails. */
        html[${ROOT_ATTRIBUTE}],
        html[${ROOT_ATTRIBUTE}] body {
            background-color: var(--dcuf-glass-page) !important;
        }
        html[${ROOT_ATTRIBUTE}] body {
            background-image:
                radial-gradient(ellipse 82% 52% at 4% -8%, color-mix(in srgb, var(--dcuf-theme-accent) 30%, transparent), transparent 69%),
                radial-gradient(ellipse 68% 48% at 98% 3%, color-mix(in srgb, color-mix(in srgb, var(--dcuf-theme-accent) 52%, #67d8ff) 21%, transparent), transparent 72%),
                radial-gradient(ellipse 72% 54% at 54% 92%, color-mix(in srgb, var(--dcuf-theme-accent-soft) 25%, transparent), transparent 74%),
                linear-gradient(145deg, color-mix(in srgb, var(--dcuf-glass-page) 92%, white), var(--dcuf-glass-page) 48%, color-mix(in srgb, var(--dcuf-glass-page) 93%, var(--dcuf-theme-accent-soft))) !important;
            background-attachment: fixed !important;
        }
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode {
            background-image:
                radial-gradient(ellipse 80% 56% at 2% -8%, color-mix(in srgb, var(--dcuf-theme-accent) 24%, transparent), transparent 68%),
                radial-gradient(ellipse 68% 50% at 100% 4%, color-mix(in srgb, color-mix(in srgb, var(--dcuf-theme-accent) 60%, #42c8ff) 16%, transparent), transparent 72%),
                radial-gradient(ellipse 72% 58% at 50% 102%, color-mix(in srgb, var(--dcuf-theme-accent-soft) 20%, transparent), transparent 73%),
                linear-gradient(145deg, #111a2d, var(--dcuf-glass-page) 48%, #0b1020) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            .dcwrap,
            #container,
            #container > .left_content,
            #container article,
            .gall_listwrap,
            #focus_cmt,
            .view_comment.image_comment,
            .comment_box,
            .reply_box,
            .newvisit_box,
            .dchead .wrap_search,
            .dchead .area_links
        ) {
            background-color: transparent !important;
            background-image: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body .custom-mobile-list {
            border-radius: 22px !important;
            background-color: var(--dcuf-glass-panel-soft) !important;
            background-image:
                radial-gradient(ellipse 58% 34% at 100% 0%, color-mix(in srgb, var(--dcuf-theme-accent-soft) 28%, transparent), transparent 72%),
                linear-gradient(180deg, color-mix(in srgb, var(--dcuf-glass-rim) 34%, transparent), transparent 220px) !important;
        }

        html[${ROOT_ATTRIBUTE}] body .dcheader.typea {
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body .dcheader.typea .dchead {
            border: 1px solid var(--dcuf-glass-border) !important;
            border-radius: 0 0 22px 22px !important;
            background-color: var(--dcuf-glass-panel) !important;
            background-image:
                radial-gradient(circle at 78% -20%, color-mix(in srgb, var(--dcuf-theme-accent-soft) 50%, transparent), transparent 44%),
                linear-gradient(180deg, var(--dcuf-glass-rim), color-mix(in srgb, var(--dcuf-glass-highlight) 42%, transparent) 2px, transparent 72%) !important;
            box-shadow: 0 18px 42px rgba(38,56,93,.09), inset 0 1px 0 var(--dcuf-glass-rim) !important;
            -webkit-backdrop-filter: blur(var(--dcuf-glass-blur)) saturate(1.22) !important;
            backdrop-filter: blur(var(--dcuf-glass-blur)) saturate(1.22) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .gnb_bar {
            box-sizing: border-box !important;
            margin-top: 8px !important;
            border: 1px solid var(--dcuf-glass-border-strong) !important;
            border-radius: 18px !important;
            background-color: color-mix(in srgb, var(--dcuf-glass-panel) 78%, var(--dcuf-theme-accent-soft)) !important;
            background-image:
                radial-gradient(ellipse 42% 150% at 12% -45%, color-mix(in srgb, var(--dcuf-theme-accent) 30%, transparent), transparent 70%),
                linear-gradient(180deg, var(--dcuf-glass-rim), color-mix(in srgb, var(--dcuf-glass-highlight) 34%, transparent) 2px, transparent 76%) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: 0 16px 38px rgba(33,51,89,.12), inset 0 1px 0 var(--dcuf-glass-rim) !important;
            -webkit-backdrop-filter: blur(var(--dcuf-glass-blur)) saturate(1.28) !important;
            backdrop-filter: blur(var(--dcuf-glass-blur)) saturate(1.28) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .gnb_bar .gnb_list li > a {
            border-radius: 999px !important;
            color: var(--dcuf-theme-fg) !important;
            text-shadow: none !important;
            transition: color .16s ease, background-color .16s ease, box-shadow .16s ease !important;
        }
        html[${ROOT_ATTRIBUTE}] body .gnb_bar .gnb_list li > a:is(:hover,:focus-visible),
        html[${ROOT_ATTRIBUTE}] body .gnb_bar .gnb_list li.on > a {
            background: color-mix(in srgb, var(--dcuf-theme-accent-soft) 64%, var(--dcuf-glass-panel-soft)) !important;
            color: var(--dcuf-theme-accent-strong) !important;
            box-shadow: inset 0 1px 0 var(--dcuf-glass-rim), 0 7px 18px var(--dcuf-glass-accent-shadow) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .newvisit_history {
            border-radius: 17px !important;
            background-color: var(--dcuf-glass-panel-soft) !important;
            background-image:
                linear-gradient(180deg, color-mix(in srgb, var(--dcuf-glass-rim) 72%, transparent), transparent 68%) !important;
            box-shadow: 0 12px 30px rgba(38,56,93,.07), inset 0 1px 0 var(--dcuf-glass-rim) !important;
            -webkit-backdrop-filter: blur(18px) saturate(1.18) !important;
            backdrop-filter: blur(18px) saturate(1.18) !important;
        }

        html[${ROOT_ATTRIBUTE}] body :is(
            .dchead .top_search,
            .page_head :is(.gall_search .inner_search,.gall_search_box .inner_search,.inner_search),
            .custom-bottom-controls .bottom_search,
            form[name="frmSearch"] .bottom_search
        ) {
            position: relative !important;
            box-sizing: border-box !important;
            padding: 3px !important;
            border: 1px solid var(--dcuf-glass-border-strong) !important;
            border-radius: 999px !important;
            overflow: hidden !important;
            background-color: var(--dcuf-glass-input) !important;
            background-image:
                linear-gradient(180deg, color-mix(in srgb, var(--dcuf-glass-rim) 82%, transparent), transparent 68%) !important;
            box-shadow: inset 0 1px 2px rgba(27,39,61,.1), 0 10px 24px rgba(38,58,100,.08), inset 0 1px 0 var(--dcuf-glass-rim) !important;
            -webkit-backdrop-filter: blur(18px) saturate(1.18) !important;
            backdrop-filter: blur(18px) saturate(1.18) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            .dchead .top_search,
            .page_head .inner_search,
            .custom-bottom-controls .bottom_search,
            form[name="frmSearch"] .bottom_search
        ) .inner_search,
        html[${ROOT_ATTRIBUTE}] body :is(
            .dchead .top_search,
            .page_head .inner_search,
            .custom-bottom-controls .bottom_search,
            form[name="frmSearch"] .bottom_search
        ) input {
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            .dchead .top_search .bnt_search,
            .page_head :is(.btn_search,.bnt_search,button[type="submit"]),
            .custom-bottom-controls .bottom_search .bnt_search,
            form[name="frmSearch"] .bottom_search .bnt_search
        ) {
            flex: none !important;
            box-sizing: border-box !important;
            width: 40px !important;
            min-width: 40px !important;
            height: 40px !important;
            margin: 0 !important;
            border: 1px solid color-mix(in srgb, var(--dcuf-theme-accent) 52%, var(--dcuf-glass-rim)) !important;
            border-radius: 50% !important;
            background-color: color-mix(in srgb, var(--dcuf-theme-accent-strong) 72%, transparent) !important;
            background-image:
                radial-gradient(circle at 30% 18%, rgba(255,255,255,.62), transparent 35%),
                linear-gradient(145deg, var(--dcuf-glass-control-active-top), var(--dcuf-glass-control-active)) !important;
            box-shadow: 0 9px 22px var(--dcuf-glass-accent-shadow), inset 0 1px 0 rgba(255,255,255,.52), inset 0 -1px 0 rgba(0,0,0,.12) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .dchead .top_search .bnt_search,
        html[${ROOT_ATTRIBUTE}] body :is(.custom-bottom-controls,form[name="frmSearch"]) .bottom_search .bnt_search {
            position: absolute !important;
            top: 3px !important;
            right: 3px !important;
            bottom: auto !important;
            left: auto !important;
        }
        html[${ROOT_ATTRIBUTE}] body .dchead .top_search {
            min-height: 46px !important;
        }
        html[${ROOT_ATTRIBUTE}] body .dchead .top_search .inner_search,
        html[${ROOT_ATTRIBUTE}] body .dchead .top_search input {
            min-height: 38px !important;
        }
        html[${ROOT_ATTRIBUTE}] body .dchead .top_search input,
        html[${ROOT_ATTRIBUTE}] body :is(.custom-bottom-controls,form[name="frmSearch"]) .bottom_search input {
            box-sizing: border-box !important;
            padding-right: 48px !important;
        }
        html[${ROOT_ATTRIBUTE}] body .dcuf-search-card .search_right_box .bottom_search,
        html[${ROOT_ATTRIBUTE}] body form[name="frmSearch"] .search_right_box .bottom_search {
            border-width: 0 !important;
        }

        html[${ROOT_ATTRIBUTE}] body .list_array_option {
            border-radius: 24px !important;
            background-color: var(--dcuf-glass-panel) !important;
            background-image:
                radial-gradient(ellipse 42% 180% at 100% -50%, color-mix(in srgb, var(--dcuf-theme-accent-soft) 58%, transparent), transparent 66%),
                linear-gradient(180deg, var(--dcuf-glass-rim), color-mix(in srgb, var(--dcuf-glass-highlight) 38%, transparent) 2px, transparent 72%) !important;
            box-shadow: 0 22px 52px rgba(34,54,96,.13), inset 0 1px 0 var(--dcuf-glass-rim) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .list_array_option :is(.array_tab a,.array_tab button,.select_area,.btn_write) {
            border-radius: 999px !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            .list_array_option .select_area select,
            .custom-bottom-controls select
        ) {
            border: 0 !important;
            border-radius: 999px !important;
            background-color: transparent !important;
            background-image: none !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            .list_array_option .array_tab .on,
            .list_array_option .array_tab li.on > a,
            .list_array_option .btn_write,
            .custom-bottom-controls .bottom_paging_box > em,
            .custom-bottom-controls :is(.btn_write,.write),
            #container:is(.gallery_view,.minor_view,.mini_view) .view_bottom_btnbox :is(.btn_blue,.btn_write,.write)
        ) {
            background-color: color-mix(in srgb, var(--dcuf-theme-accent-strong) 76%, transparent) !important;
            background-image:
                radial-gradient(circle at 22% 0%, rgba(255,255,255,.58), transparent 42%),
                linear-gradient(145deg, var(--dcuf-glass-control-active-top), var(--dcuf-glass-control-active)) !important;
            box-shadow: 0 12px 28px var(--dcuf-glass-accent-shadow), inset 0 1px 0 rgba(255,255,255,.48), inset 0 -1px 0 rgba(0,0,0,.13) !important;
        }

        html[${ROOT_ATTRIBUTE}] body .custom-post-item:not(.notice):not(.concept) {
            border-color: color-mix(in srgb, var(--dcuf-glass-border) 82%, var(--dcuf-glass-rim)) !important;
            border-radius: 18px !important;
            background-color: var(--dcuf-glass-cell) !important;
            background-image:
                radial-gradient(ellipse 44% 180% at 100% -65%, color-mix(in srgb, var(--dcuf-theme-accent-soft) 35%, transparent), transparent 70%),
                linear-gradient(155deg, color-mix(in srgb, var(--dcuf-glass-rim) 72%, transparent), transparent 46%) !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body .custom-post-item:is(.notice,.concept) {
            border-radius: 18px !important;
            background-color: color-mix(in srgb, var(--dcuf-glass-cell) 82%, var(--dcuf-theme-accent-soft)) !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            .view_content_wrap,
            form.dcuf-write-form,
            .dcuf-password-card
        ) {
            border-radius: 26px !important;
            background-color: var(--dcuf-glass-panel-strong) !important;
            background-image:
                radial-gradient(ellipse 48% 40% at 100% 0%, color-mix(in srgb, var(--dcuf-theme-accent-soft) 38%, transparent), transparent 72%),
                linear-gradient(150deg, color-mix(in srgb, var(--dcuf-glass-rim) 74%, transparent), transparent 34%) !important;
            box-shadow: 0 28px 72px rgba(29,46,86,.16), inset 0 1px 0 var(--dcuf-glass-rim) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            #focus_cmt .comment_box .cmt_list > li,
            #container .view_comment.image_comment .comment_box.img_comment_box .cmt_list > li
        ) {
            border: 1px solid color-mix(in srgb, var(--dcuf-glass-border) 78%, var(--dcuf-glass-rim)) !important;
            border-radius: 18px !important;
            background-color: var(--dcuf-glass-cell) !important;
            background-image:
                linear-gradient(150deg, color-mix(in srgb, var(--dcuf-glass-rim) 64%, transparent), transparent 46%) !important;
            box-shadow: var(--dcuf-glass-card-shadow), inset 0 1px 0 var(--dcuf-glass-rim) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            #focus_cmt .comment_box .reply_list > li,
            #container .view_comment.image_comment .comment_box.img_comment_box .reply_list > li,
            #focus_cmt li[id^="reply_li_"]
        ) {
            border: 1px solid var(--dcuf-glass-border) !important;
            border-left: 3px solid color-mix(in srgb, var(--dcuf-theme-accent) 62%, var(--dcuf-glass-border)) !important;
            border-radius: 4px 18px 18px 4px !important;
            background-color: var(--dcuf-glass-cell-soft) !important;
            background-image:
                linear-gradient(150deg, color-mix(in srgb, var(--dcuf-theme-accent-soft) 28%, var(--dcuf-glass-rim)), transparent 52%) !important;
            box-shadow: 0 12px 30px rgba(34,52,89,.08), inset 0 1px 0 var(--dcuf-glass-rim) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            #focus_cmt .cmt_write_box,
            #container .view_comment.image_comment .cmt_write_box,
            .view_content_wrap .btn_recommend_box,
            .view_content_wrap .btn_recommend_box .inner_box > .inner
        ) {
            border-color: var(--dcuf-glass-border) !important;
            border-radius: 18px !important;
            background-color: var(--dcuf-glass-panel-soft) !important;
            background-image: linear-gradient(150deg, color-mix(in srgb, var(--dcuf-glass-rim) 64%, transparent), transparent 52%) !important;
            box-shadow: 0 14px 34px rgba(34,52,89,.085), inset 0 1px 0 var(--dcuf-glass-rim) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap .gall_exposure_list {
            box-sizing: border-box !important;
            margin: 18px 0 !important;
            padding: 8px 10px !important;
            border: 1px solid var(--dcuf-glass-border) !important;
            border-radius: 17px !important;
            background-color: var(--dcuf-glass-panel-soft) !important;
            background-image: linear-gradient(150deg, color-mix(in srgb, var(--dcuf-glass-rim) 64%, transparent), transparent 54%) !important;
            box-shadow: 0 14px 34px rgba(34,52,89,.08), inset 0 1px 0 var(--dcuf-glass-rim) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap .gall_exposure_list li {
            padding: 8px 9px !important;
            border-radius: 11px !important;
        }
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap .gall_exposure_list li + li {
            border-top: 1px solid color-mix(in srgb, var(--dcuf-glass-border) 72%, transparent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap .gall_exposure_list a {
            color: var(--dcuf-theme-accent-strong) !important;
            text-decoration: none !important;
        }

        @media (max-width: 767px) {
            html[${ROOT_ATTRIBUTE}] body .dcheader.typea .dchead {
                border-radius: 0 0 18px 18px !important;
            }
            html[${ROOT_ATTRIBUTE}] body .gnb_bar {
                margin-top: 6px !important;
                border-radius: 15px !important;
            }
            html[${ROOT_ATTRIBUTE}] body :is(.newvisit_history,.page_head) {
                border-radius: 14px !important;
            }
            html[${ROOT_ATTRIBUTE}] body :is(.view_content_wrap,form.dcuf-write-form,.dcuf-password-card) {
                border-radius: 21px !important;
            }
        }
        @media (prefers-reduced-transparency: reduce) {
            html[${ROOT_ATTRIBUTE}] body :is(
                .dcheader.typea .dchead,.gnb_bar,.newvisit_history,.page_head,.list_array_option
            ) {
                background-color: var(--dcuf-glass-panel-solid) !important;
                -webkit-backdrop-filter: none !important;
                backdrop-filter: none !important;
            }
        }

        /*
         * Aurora glass v3
         * The page supplies neutral colour and depth; the selected palette appears only
         * on active controls. One blurred shell per region keeps the material legible.
         */
        html[${ROOT_ATTRIBUTE}],
        html[${ROOT_ATTRIBUTE}] body {
            background-color: var(--dcuf-glass-page) !important;
        }
        html[${ROOT_ATTRIBUTE}] body {
            --dcuf-control-border: rgba(255,255,255,.48);
            --dcuf-control-surface: linear-gradient(180deg,rgba(255,255,255,.28),rgba(255,255,255,.14));
            --dcuf-control-shadow: inset 0 1px 0 rgba(255,255,255,.40),0 7px 20px rgba(31,48,84,.08);
            --dcuf-search-input: rgba(255,255,255,.20);
            --dcuf-search-layer: rgba(248,251,255,.62);
            background-image:
                radial-gradient(70% 55% at 8% 0%, rgba(101,118,255,.34), transparent 66%),
                radial-gradient(58% 48% at 96% 8%, rgba(52,196,224,.25), transparent 68%),
                radial-gradient(65% 52% at 52% 100%, rgba(177,106,255,.20), transparent 70%),
                linear-gradient(135deg,#d8e4f3 0%,#eef3fb 48%,#dce5f5 100%) !important;
            background-attachment: fixed !important;
            color: var(--dcuf-theme-fg) !important;
        }
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode {
            --dcuf-control-border: rgba(222,234,255,.15);
            --dcuf-control-surface: linear-gradient(180deg,rgba(151,170,214,.13),rgba(151,170,214,.06));
            --dcuf-control-shadow: inset 0 1px 0 rgba(239,246,255,.16),0 9px 24px rgba(0,0,0,.22);
            --dcuf-search-input: rgba(7,13,25,.32);
            --dcuf-search-layer: rgba(17,27,47,.72);
            background-image:
                radial-gradient(70% 55% at 8% 0%, rgba(76,96,255,.26), transparent 66%),
                radial-gradient(58% 48% at 96% 8%, rgba(31,171,209,.18), transparent 68%),
                radial-gradient(65% 52% at 52% 100%, rgba(142,74,224,.16), transparent 70%),
                linear-gradient(135deg,#08111f 0%,#111a2d 48%,#070c18 100%) !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page,
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page.dc-filter-dark-mode {
            --dcuf-write-surface: var(--dcuf-glass-panel) !important;
            --dcuf-write-surface-muted: var(--dcuf-glass-control) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            .dcwrap,#container,#container > .left_content,#container article,.gall_listwrap,
            .view_content_wrap,.view_bottom,#focus_cmt,.view_comment.image_comment,
            .comment_box,.reply_box,.newvisit_box
        ) {
            background-color: transparent !important;
            background-image: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #focus_cmt .comment_box .reply_box,
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #focus_cmt .comment_box .cmt_list > li[data-dcuf-focus-group-reply="1"] > .reply.show > .reply_box,
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_box,
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li[data-dcuf-focus-group-reply="1"] > .reply.show > .reply_box {
            border: 0 !important;
            border-left: 2px solid color-mix(in srgb,var(--dcuf-theme-accent) 34%,var(--dcuf-theme-border-strong)) !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }

        /* Header: a pale floating search shell over a single smoky navigation rail. */
        html[${ROOT_ATTRIBUTE}] body .dcheader.typea {
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body .dcheader.typea .dchead {
            border: 1px solid var(--dcuf-glass-border) !important;
            border-top-color: var(--dcuf-glass-rim) !important;
            border-radius: 0 0 24px 24px !important;
            background-color: rgba(248,251,255,.40) !important;
            background-image: linear-gradient(145deg,rgba(255,255,255,.34),transparent 42%) !important;
            box-shadow: 0 18px 48px rgba(38,54,91,.10),inset 0 1px 0 var(--dcuf-glass-rim) !important;
            -webkit-backdrop-filter: blur(30px) saturate(1.34) !important;
            backdrop-filter: blur(30px) saturate(1.34) !important;
        }
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode .dcheader.typea .dchead {
            background-color: rgba(17,27,47,.42) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .gnb_bar {
            margin-top: 8px !important;
            border: 1px solid rgba(255,255,255,.22) !important;
            border-radius: 18px !important;
            background-color: rgba(18,32,58,.72) !important;
            background-image:
                radial-gradient(80% 180% at 12% -80%,rgba(103,126,255,.34),transparent 65%),
                linear-gradient(180deg,rgba(255,255,255,.12),transparent 72%) !important;
            color: rgba(246,249,255,.88) !important;
            box-shadow: 0 18px 44px rgba(22,35,65,.22),inset 0 1px 0 rgba(255,255,255,.22) !important;
            -webkit-backdrop-filter: blur(26px) saturate(1.30) !important;
            backdrop-filter: blur(26px) saturate(1.30) !important;
        }
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode .gnb_bar {
            background-color: rgba(6,12,24,.70) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .gnb_bar :is(a,button,span,em) {
            color: inherit !important;
            text-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body .gnb_bar .gnb_list li > a {
            border-radius: 999px !important;
            color: rgba(246,249,255,.84) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .gnb_bar .gnb_list li > a:is(:hover,:focus-visible),
        html[${ROOT_ATTRIBUTE}] body .gnb_bar .gnb_list li.on > a {
            background: rgba(255,255,255,.12) !important;
            color: #fff !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,.19),0 8px 20px rgba(0,0,0,.14) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .newvisit_history {
            border: 0 !important;
            border-radius: 16px !important;
            background-color: rgba(255,255,255,.16) !important;
            background-image: linear-gradient(180deg,rgba(255,255,255,.22),transparent 76%) !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,.50),0 8px 24px rgba(39,58,96,.055) !important;
            -webkit-backdrop-filter: blur(18px) saturate(1.15) !important;
            backdrop-filter: blur(18px) saturate(1.15) !important;
        }
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode :is(.newvisit_history,.page_head) {
            background-color: rgba(22,34,56,.22) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .page_head {
            box-shadow: inset 0 -1px 0 color-mix(in srgb,var(--dcuf-theme-accent) 36%,transparent) !important;
        }

        /* Search controls have one capsule and one luminous lens, not nested rectangles. */
        html[${ROOT_ATTRIBUTE}] body :is(
            .dchead .top_search,
            .page_head :is(.gall_search .inner_search,.gall_search_box .inner_search,.inner_search),
            .custom-bottom-controls .bottom_search,
            form[name="frmSearch"] .bottom_search
        ) {
            padding: 3px !important;
            border: 1px solid rgba(255,255,255,.48) !important;
            border-radius: 999px !important;
            background-color: rgba(255,255,255,.24) !important;
            background-image: linear-gradient(180deg,rgba(255,255,255,.34),transparent 70%) !important;
            box-shadow: inset 0 1px 3px rgba(27,39,61,.10),0 8px 22px rgba(32,51,89,.08) !important;
            -webkit-backdrop-filter: blur(16px) saturate(1.18) !important;
            backdrop-filter: blur(16px) saturate(1.18) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            .dchead .top_search,
            .page_head .inner_search,
            .custom-bottom-controls .bottom_search,
            form[name="frmSearch"] .bottom_search
        ) :is(input,.inner_search) {
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            .dchead .top_search .bnt_search,
            .page_head :is(.btn_search,.bnt_search,button[type="submit"]),
            .custom-bottom-controls .bottom_search .bnt_search,
            form[name="frmSearch"] .bottom_search .bnt_search
        ) {
            width: 38px !important;
            min-width: 38px !important;
            height: 38px !important;
            margin: 0 !important;
            border: 1px solid rgba(255,255,255,.32) !important;
            border-radius: 50% !important;
            background-color: var(--dcuf-glass-control-active) !important;
            background-image:
                radial-gradient(circle at 28% 16%,rgba(255,255,255,.48),transparent 36%),
                linear-gradient(145deg,var(--dcuf-glass-control-active-top),var(--dcuf-glass-control-active)) !important;
            box-shadow: 0 9px 22px var(--dcuf-glass-accent-shadow),inset 0 1px 0 rgba(255,255,255,.45) !important;
        }

        /* List: one floating control dock, then quiet translucent cards over the aurora. */
        html[${ROOT_ATTRIBUTE}] body .custom-mobile-list {
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body .list_array_option {
            border: 1px solid var(--dcuf-glass-border) !important;
            border-top-color: var(--dcuf-glass-rim) !important;
            border-radius: 20px !important;
            background-color: var(--dcuf-glass-panel) !important;
            background-image: linear-gradient(145deg,rgba(255,255,255,.20),transparent 44%) !important;
            box-shadow: 0 18px 46px rgba(31,48,84,.13),inset 0 1px 0 var(--dcuf-glass-rim) !important;
            -webkit-backdrop-filter: blur(24px) saturate(1.22) !important;
            backdrop-filter: blur(24px) saturate(1.22) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .list_array_option :is(.array_tab a,.array_tab button,.select_area,.btn_write) {
            border-radius: 999px !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            .list_array_option .array_tab li:not(.on) > a,
            .list_array_option .array_tab :is(button,a):not(.on),
            .list_array_option .select_area,
            .custom-bottom-controls :is(button,select):not(.btn_write):not(.write),
            .custom-bottom-controls a:not(.sp_pagingicon):not(.btn_write):not(.write)
        ) {
            border: 1px solid rgba(255,255,255,.42) !important;
            background-color: var(--dcuf-glass-control) !important;
            background-image: linear-gradient(180deg,rgba(255,255,255,.24),transparent 76%) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,.38),0 5px 14px rgba(34,50,82,.06) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            .list_array_option .array_tab .on,
            .list_array_option .array_tab li.on > a,
            .list_array_option .btn_write,
            .custom-bottom-controls .bottom_paging_box > em,
            .custom-bottom-controls :is(.btn_write,.write)
        ) {
            border: 1px solid color-mix(in srgb,var(--dcuf-theme-accent) 42%,rgba(255,255,255,.44)) !important;
            background-color: var(--dcuf-glass-control-active) !important;
            background-image:
                radial-gradient(circle at 22% 0%,rgba(255,255,255,.42),transparent 42%),
                linear-gradient(145deg,var(--dcuf-glass-control-active-top),var(--dcuf-glass-control-active)) !important;
            color: var(--dcuf-glass-on-active) !important;
            box-shadow: 0 10px 24px var(--dcuf-glass-accent-shadow),inset 0 1px 0 rgba(255,255,255,.44) !important;
            text-shadow: 0 1px 1px rgba(0,0,0,.12) !important;
        }
        /*
         * Specificity bridge for legacy host selectors that also carry !important.
         * It changes material only; the original elements, dimensions, and handlers stay intact.
         */
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body:not(.is-write-page) #container .list_array_option .array_tab li.on,
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body:not(.is-write-page) #container .list_array_option .array_tab li.on > a,
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body:not(.is-write-page) #container .list_array_option .array_tab :is(a,button).on,
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body:not(.is-write-page) #container .list_array_option .btn_write,
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #container .custom-bottom-controls .bottom_paging_box > :is(em,strong,.on),
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #container .custom-bottom-controls .dcuf-bottom-action-card :is(.btn_write,.write),
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .dcheader.typea .dchead .top_search .bnt_search,
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .dcheader.typea .dchead .area_links :is(.btn_login,.btn_top_loginout),
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .page_head .fl form :is(.btn_search,.bnt_search,button[type="submit"]) {
            border-color: color-mix(in srgb,var(--dcuf-theme-accent) 42%,rgba(255,255,255,.42)) !important;
            background-color: var(--dcuf-glass-control-active) !important;
            background-image:
                radial-gradient(circle at 22% 0%,rgba(255,255,255,.42),transparent 42%),
                linear-gradient(145deg,var(--dcuf-glass-control-active-top),var(--dcuf-glass-control-active)) !important;
            color: var(--dcuf-glass-on-active) !important;
            box-shadow: 0 10px 24px var(--dcuf-glass-accent-shadow),inset 0 1px 0 rgba(255,255,255,.44) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .custom-post-item {
            border: 1px solid var(--dcuf-glass-border) !important;
            border-top-color: var(--dcuf-glass-rim) !important;
            border-radius: 15px !important;
            background-color: var(--dcuf-glass-cell) !important;
            background-image: linear-gradient(145deg,rgba(255,255,255,.18),transparent 46%) !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body .custom-post-item:hover {
            background-color: color-mix(in srgb,var(--dcuf-glass-cell) 80%,rgba(255,255,255,.18)) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .custom-post-item.notice {
            border-left: 3px solid rgba(103,116,141,.52) !important;
            background-color: color-mix(in srgb,var(--dcuf-glass-cell) 86%,rgba(255,255,255,.12)) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .custom-post-item.concept {
            border-left: 3px solid color-mix(in srgb,var(--dcuf-theme-accent) 68%,rgba(255,255,255,.28)) !important;
            background-color: color-mix(in srgb,var(--dcuf-theme-accent-soft) 8%,var(--dcuf-glass-cell)) !important;
        }

        /* Reading surface: separate frosted title, paper, and a compact action dock. */
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap {
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap :is(.gallview_head,.gallview_contents) {
            border: 1px solid var(--dcuf-glass-border) !important;
            border-top-color: var(--dcuf-glass-rim) !important;
            border-radius: 20px !important;
            background-color: var(--dcuf-glass-panel-strong) !important;
            background-image: linear-gradient(145deg,rgba(255,255,255,.18),transparent 42%) !important;
            box-shadow: 0 18px 48px rgba(30,47,83,.11),inset 0 1px 0 var(--dcuf-glass-rim) !important;
            -webkit-backdrop-filter: blur(24px) saturate(1.20) !important;
            backdrop-filter: blur(24px) saturate(1.20) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap .gallview_contents {
            background-color: color-mix(in srgb,var(--dcuf-glass-paper) 78%,transparent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap .gall_writer {
            border-top-color: color-mix(in srgb,var(--dcuf-glass-border-strong) 45%,transparent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap .btn_recommend_box {
            width: min(480px,calc(100% - 20px)) !important;
            min-width: 0 !important;
            margin: 26px auto 16px !important;
            padding: 12px 14px !important;
            border: 1px solid var(--dcuf-glass-border) !important;
            border-top-color: var(--dcuf-glass-rim) !important;
            border-radius: 20px !important;
            background-color: var(--dcuf-glass-panel-soft) !important;
            background-image: linear-gradient(145deg,rgba(255,255,255,.14),transparent 48%) !important;
            box-shadow: 0 16px 38px rgba(31,48,84,.10),inset 0 1px 0 rgba(255,255,255,.42) !important;
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap .btn_recommend_box .inner_box {
            gap: 9px !important;
        }
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap .btn_recommend_box .inner_box > .inner {
            flex: 0 1 156px !important;
            min-height: 62px !important;
            padding: 7px 10px !important;
            border: 1px solid rgba(255,255,255,.34) !important;
            border-radius: 16px !important;
            background-color: rgba(255,255,255,.13) !important;
            background-image: linear-gradient(180deg,rgba(255,255,255,.16),transparent 76%) !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,.30) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap .btn_recommend_box .recom_bottom_box {
            gap: 7px !important;
            margin-top: 9px !important;
            padding-top: 9px !important;
            border-top-color: rgba(255,255,255,.26) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap .btn_recommend_box .recom_bottom_box > :is(button,a) {
            min-height: 32px !important;
            padding: 0 11px !important;
            border: 1px solid rgba(255,255,255,.34) !important;
            background-color: rgba(255,255,255,.10) !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,.26) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap .btn_recommend_box .btn_recom_up {
            background-color: var(--dcuf-glass-control-active) !important;
            background-image:
                radial-gradient(circle at 26% 12%,rgba(255,255,255,.46),transparent 38%),
                linear-gradient(145deg,var(--dcuf-glass-control-active-top),var(--dcuf-glass-control-active)) !important;
            box-shadow: 0 10px 22px var(--dcuf-glass-accent-shadow),inset 0 1px 0 rgba(255,255,255,.42) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap .recommend_kapcode {
            border-radius: 999px !important;
        }
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap .recommend_kapcode .kap_codeimg {
            border-radius: 999px 0 0 999px !important;
        }
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap .recommend_kapcode .recom_input_kapcode {
            border-radius: 0 999px 999px 0 !important;
            background-color: var(--dcuf-glass-input) !important;
        }

        /* Comments keep depth through translucency; replies use one accent rail only. */
        html[${ROOT_ATTRIBUTE}] body :is(
            #focus_cmt .comment_box,
            #focus_cmt > div[id^="comment_wrap_"],
            #container .view_comment.image_comment .comment_box.img_comment_box,
            #container .view_comment.image_comment .comment_wrap
        ) {
            border: 1px solid var(--dcuf-glass-border) !important;
            border-radius: 20px !important;
            background-color: rgba(255,255,255,.14) !important;
            background-image: linear-gradient(145deg,rgba(255,255,255,.12),transparent 44%) !important;
            box-shadow: 0 16px 42px rgba(31,48,84,.09),inset 0 1px 0 rgba(255,255,255,.38) !important;
            -webkit-backdrop-filter: blur(20px) saturate(1.16) !important;
            backdrop-filter: blur(20px) saturate(1.16) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            #focus_cmt .comment_box .cmt_list > li,
            #container .view_comment.image_comment .comment_box.img_comment_box .cmt_list > li
        ) {
            border: 1px solid var(--dcuf-glass-border) !important;
            border-radius: 15px !important;
            background-color: var(--dcuf-glass-cell) !important;
            background-image: linear-gradient(145deg,rgba(255,255,255,.14),transparent 44%) !important;
            box-shadow: var(--dcuf-glass-card-shadow),inset 0 1px 0 rgba(255,255,255,.38) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            #focus_cmt .comment_box .reply_list > li,
            #container .view_comment.image_comment .comment_box.img_comment_box .reply_list > li,
            #focus_cmt li[id^="reply_li_"]
        ) {
            border: 0 !important;
            border-left: 3px solid color-mix(in srgb,var(--dcuf-theme-accent) 56%,rgba(255,255,255,.22)) !important;
            border-radius: 4px 14px 14px 4px !important;
            background-color: var(--dcuf-glass-cell-soft) !important;
            background-image: none !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,.18) !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body :is(
            #focus_cmt .cmt_write_box,
            #container .view_comment.image_comment .cmt_write_box
        ) {
            border-color: var(--dcuf-glass-border) !important;
            background-color: var(--dcuf-glass-panel-soft) !important;
            background-image: linear-gradient(145deg,rgba(255,255,255,.12),transparent 52%) !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,.22),0 8px 24px rgba(28,44,77,.055) !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body :is(
            #focus_cmt .cmt_write_box .cmt_txt_cont,
            #focus_cmt .cmt_write_box .cmt_cont_bottm,
            #focus_cmt .cmt_write_box .user_info_input input:not([type="hidden"]),
            #container .view_comment.image_comment .cmt_write_box .cmt_txt_cont,
            #container .view_comment.image_comment .cmt_write_box .cmt_cont_bottm,
            #container .view_comment.image_comment .cmt_write_box .user_info_input input:not([type="hidden"])
        ) {
            border-color: var(--dcuf-glass-border-strong) !important;
            background-color: var(--dcuf-glass-input) !important;
            background-image: linear-gradient(180deg,rgba(255,255,255,.12),transparent 72%) !important;
            box-shadow: inset 0 2px 5px rgba(18,29,50,.08),inset 0 1px 0 rgba(255,255,255,.20) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            #focus_cmt .cmt_write_box textarea,
            #container .view_comment.image_comment .cmt_write_box textarea
        ) {
            background: transparent !important;
        }

        /* Write form: frosted shell, quiet toolbar, intentionally readable paper. */
        html[${ROOT_ATTRIBUTE}] body.is-write-page #container,
        html[${ROOT_ATTRIBUTE}] body.is-write-page :is(.center_content,.gall_write,.write_box) {
            background: transparent !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form {
            border: 1px solid var(--dcuf-glass-border) !important;
            border-top-color: var(--dcuf-glass-rim) !important;
            border-radius: 22px !important;
            background-color: rgba(248,251,255,.38) !important;
            background-image: linear-gradient(145deg,rgba(255,255,255,.18),transparent 42%) !important;
            box-shadow: 0 28px 72px rgba(28,44,81,.16),inset 0 1px 0 var(--dcuf-glass-rim) !important;
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page.dc-filter-dark-mode form.dcuf-write-form {
            background-color: rgba(17,27,47,.42) !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form :is(
            input:not([type="checkbox"]):not([type="radio"]),textarea,select,.write_subject,.captcha,.dcuf-write-captcha-image
        ) {
            border-color: rgba(255,255,255,.42) !important;
            border-radius: 13px !important;
            background-color: var(--dcuf-glass-input) !important;
            background-image: linear-gradient(180deg,rgba(255,255,255,.18),transparent 72%) !important;
            box-shadow: inset 0 2px 5px rgba(21,32,54,.10),inset 0 1px 0 rgba(255,255,255,.34) !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form :is(.note-editor,.tx-editor-container,.tx-editor) {
            overflow: visible !important;
            border: 1px solid var(--dcuf-glass-border) !important;
            border-radius: 18px !important;
            background-color: rgba(255,255,255,.12) !important;
            box-shadow: 0 16px 38px rgba(31,48,84,.09),inset 0 1px 0 rgba(255,255,255,.36) !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form :is(
            .note-toolbar,.note-toolbar-media,.tx-toolbar,.tx-toolbar-basic,.btns-box,.note-statusbar,
            .btn_bottom_box,.btm-btns-box
        ),
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form > .btn_box.write {
            border: 0 !important;
            border-bottom: 1px solid rgba(255,255,255,.28) !important;
            background-color: rgba(255,255,255,.13) !important;
            background-image: linear-gradient(180deg,rgba(255,255,255,.15),transparent 76%) !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,.16) !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form :is(
            .note-btn,.note-toolbar-media > button,.btns-box button,.tx-toolbar button,.tx-toolbar a
        ) {
            border-color: transparent !important;
            border-radius: 9px !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form :is(
            .note-btn,.note-toolbar-media > button,.btns-box button,.tx-toolbar button,.tx-toolbar a
        ):is(:hover,:focus-visible,.active) {
            border-color: rgba(255,255,255,.28) !important;
            background-color: rgba(255,255,255,.18) !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,.28) !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form :is(.note-editable,.tx-content-container,.tx-canvas) {
            background-color: var(--dcuf-glass-paper) !important;
            background-image: linear-gradient(145deg,rgba(255,255,255,.16),transparent 38%) !important;
            color: var(--dcuf-theme-fg) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(.dcuf-password-card,.no_memberwrap) {
            border: 1px solid var(--dcuf-glass-border) !important;
            border-top-color: var(--dcuf-glass-rim) !important;
            border-radius: 22px !important;
            background-color: var(--dcuf-glass-panel) !important;
            background-image: linear-gradient(145deg,rgba(255,255,255,.18),transparent 42%) !important;
            box-shadow: var(--dcuf-glass-popup-shadow),inset 0 1px 0 var(--dcuf-glass-rim) !important;
            -webkit-backdrop-filter: blur(var(--dcuf-glass-blur)) saturate(1.24) !important;
            backdrop-filter: blur(var(--dcuf-glass-blur)) saturate(1.24) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(.dcuf-password-card,.no_memberwrap) :is(
            input:not([type="checkbox"]):not([type="radio"]),textarea,select
        ) {
            border: 1px solid rgba(255,255,255,.30) !important;
            border-radius: 12px !important;
            background-color: var(--dcuf-glass-input) !important;
            background-image: linear-gradient(180deg,rgba(255,255,255,.14),transparent 72%) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: inset 0 2px 5px rgba(18,29,50,.10),inset 0 1px 0 rgba(255,255,255,.24) !important;
        }

        /* Native primary actions share the same coloured glass as DCUF controls. */
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body :is(
            .dchead .area_links .btn_login,
            .dchead .area_links .btn_top_loginout,
            #container.gallery_view .view_bottom_btnbox .btn_blue,
            #container.gallery_view .view_bottom_btnbox .write,
            #container.minor_view .view_bottom_btnbox .btn_blue,
            #container.minor_view .view_bottom_btnbox .write,
            #container.mini_view .view_bottom_btnbox .btn_blue,
            #container.mini_view .view_bottom_btnbox .write,
            form.dcuf-write-form .btn_bottom_box .btn_blue,
            form.dcuf-write-form .btm-btns-box .btn-line-blue,
            form.dcuf-write-form > .btn_box.write > .btn_blue,
            form.dcuf-write-form #write-submit,
            form.dcuf-write-form .ai_easy_box > .btn_aigo,
            .dcuf-password-card .btn_ok,
            .no_memberwrap .btn_ok,
            #focus_cmt .cmt_write_box .cmt_btn_bot > button,
            #focus_cmt .cmt_write_box .cmt_cont_bottm > .fr > button,
            #container .view_comment.image_comment .cmt_write_box .cmt_btn_bot > button,
            #container .view_comment.image_comment .cmt_write_box .cmt_cont_bottm > .fr > button
        ) {
            border: 1px solid color-mix(in srgb,var(--dcuf-theme-accent) 42%,rgba(255,255,255,.42)) !important;
            border-radius: var(--dcuf-radius-control) !important;
            background-color: var(--dcuf-glass-control-active) !important;
            background-image:
                radial-gradient(circle at 22% 0%,rgba(255,255,255,.42),transparent 42%),
                linear-gradient(145deg,var(--dcuf-glass-control-active-top),var(--dcuf-glass-control-active)) !important;
            color: var(--dcuf-glass-on-active) !important;
            box-shadow: 0 10px 24px var(--dcuf-glass-accent-shadow),inset 0 1px 0 rgba(255,255,255,.44) !important;
            text-shadow: 0 1px 1px rgba(0,0,0,.12) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .dchead .area_links :is(.btn_login,.btn_top_loginout) {
            padding: 2px 8px !important;
            -webkit-backdrop-filter: blur(12px) saturate(1.18) !important;
            backdrop-filter: blur(12px) saturate(1.18) !important;
        }

        /*
         * Live-surface correction.
         * Keep one real glass shell in the header and use structural rails below it.
         * This avoids the stacked-card look while preserving every host element and handler.
         */
        html[${ROOT_ATTRIBUTE}] body:not(.dc-filter-dark-mode) .gnb_bar {
            border-color: rgba(255,255,255,.56) !important;
            background-color: rgba(225,234,246,.30) !important;
            background-image:
                radial-gradient(75% 150% at 10% -70%,rgba(255,255,255,.52),transparent 66%),
                linear-gradient(180deg,rgba(255,255,255,.22),rgba(255,255,255,.045)) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: 0 12px 30px rgba(31,48,84,.085),inset 0 1px 0 rgba(255,255,255,.66) !important;
        }
        html[${ROOT_ATTRIBUTE}] body:not(.dc-filter-dark-mode) .gnb_bar :is(a,button,span,em),
        html[${ROOT_ATTRIBUTE}] body:not(.dc-filter-dark-mode) .gnb_bar .gnb_list li > a {
            color: var(--dcuf-theme-fg) !important;
        }
        html[${ROOT_ATTRIBUTE}] body:not(.dc-filter-dark-mode) .gnb_bar .gnb_list li > a:is(:hover,:focus-visible),
        html[${ROOT_ATTRIBUTE}] body:not(.dc-filter-dark-mode) .gnb_bar .gnb_list li.on > a {
            background-color: rgba(255,255,255,.18) !important;
            color: var(--dcuf-theme-accent-strong) !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,.48),0 7px 18px rgba(31,48,84,.075) !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body :is(#dcuf-structural-header-rail,.newvisit_history) {
            border: 0 !important;
            border-radius: 0 !important;
            background-color: transparent !important;
            background-image: none !important;
            box-shadow: none !important;
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
            transition: none !important;
            pointer-events: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #visit_history > .newvisit_history.vst :is(
            a,
            button,
            input,
            select,
            .newvisit_box,
            .newvisit_list,
            [role="button"]
        ) {
            pointer-events: auto !important;
        }
        html[${ROOT_ATTRIBUTE}] body .newvisit_history {
            border-bottom: 1px solid color-mix(in srgb,var(--dcuf-glass-border) 72%,transparent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .page_head {
            border-bottom: 1px solid color-mix(in srgb,var(--dcuf-theme-accent) 34%,var(--dcuf-glass-border)) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .page_head :is(.fr,.gall_issuebox) {
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body .page_head > .fr.gall_issuebox > :is(
            .relate,.gall_useinfo,.fixture-issue-more,.btn_hotall_list
        ) {
            border: 1px solid rgba(255,255,255,.32) !important;
            border-radius: 999px !important;
            background-color: var(--dcuf-glass-control) !important;
            background-image: linear-gradient(180deg,rgba(255,255,255,.18),transparent 76%) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,.30),0 6px 16px rgba(30,46,79,.055) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .custom-post-item {
            background-color: var(--dcuf-glass-cell) !important;
            box-shadow: none !important;
        }

        /*
         * A popup cannot escape a backdrop-filter stacking context with z-index alone.
         * Comment shells therefore keep the frosted colour/depth but leave the actual blur
         * to the page behind them. When the host DCCon layer is open, its existing ancestor
         * is promoted without moving, cloning, or replacing the host popup.
         */
        html[${ROOT_ATTRIBUTE}] body :is(
            #focus_cmt > div[id^="comment_wrap_"],
            #focus_cmt .comment_box,
            #container .view_comment.image_comment .comment_wrap,
            #container .view_comment.image_comment .comment_box.img_comment_box
        ) {
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(#focus_cmt,.view_comment.image_comment) :is(
            .cmt_write_box,.cmt_txt_cont,.cmt_cont_bottm,.dccon_guidebox,
            #dccon_guide_lyr,.pop_wrap.type2,.pop_wrap.type3
        ) {
            overflow: visible !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(#focus_cmt,.view_comment.image_comment):has(
            #dccon_guide_lyr:not([style*="display: none"]):not([hidden]),
            .dccon_guidebox .pop_wrap:not([style*="display: none"]):not([hidden])
        ) {
            position: relative !important;
            z-index: 2147483600 !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(#focus_cmt,.view_comment.image_comment) :is(
            #dccon_guide_lyr,.dccon_guidebox,.dccon_guidebox .pop_wrap
        ) {
            z-index: 2147483647 !important;
        }
        html[${ROOT_ATTRIBUTE}] body #focus_cmt > div[id^="comment_wrap_"].comment_wrap:not(.show) {
            overflow: hidden !important;
        }

        @media (max-width:767px) {
            html[${ROOT_ATTRIBUTE}] body .dcheader.typea .dchead { border-radius:0 0 18px 18px !important; }
            html[${ROOT_ATTRIBUTE}] body .gnb_bar { border-radius:15px !important; }
            html[${ROOT_ATTRIBUTE}] body :is(.newvisit_history,.page_head) { border-radius:0 !important; }
            html[${ROOT_ATTRIBUTE}] body .custom-post-item { border-radius:14px !important; }
            html[${ROOT_ATTRIBUTE}] body form.dcuf-write-form { border-radius:18px !important; }
        }
        @media (prefers-reduced-transparency:reduce) {
            html[${ROOT_ATTRIBUTE}] body :is(
                .dcheader.typea .dchead,.gnb_bar,.newvisit_history,.page_head,.list_array_option,
                .view_content_wrap .gallview_head,.view_content_wrap .gallview_contents,
                .view_content_wrap .btn_recommend_box,#focus_cmt .comment_box,
                #container .view_comment.image_comment .comment_box.img_comment_box,
                form.dcuf-write-form,.dcuf-password-card,.no_memberwrap
            ) {
                background-color:var(--dcuf-glass-panel-solid) !important;
                -webkit-backdrop-filter:none !important;
                backdrop-filter:none !important;
            }
        }

        /*
         * Selective-glass pass.
         * Large shells carry the refraction; repeated reading rows stay calm and flat.
         */
        html[${ROOT_ATTRIBUTE}] body {
            background-color: var(--dcuf-glass-page) !important;
            background-image:
                radial-gradient(circle at 88% 4%,color-mix(in srgb,var(--dcuf-theme-accent) 8%,transparent),transparent 34%),
                radial-gradient(circle at 8% 2%,rgba(133,151,214,.09),transparent 38%) !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .dcheader.typea {
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .dcheader.typea .dchead {
            border: 1px solid var(--dcuf-glass-border) !important;
            border-radius: var(--dcuf-radius-panel) !important;
            background-color: var(--dcuf-glass-panel) !important;
            background-image: linear-gradient(180deg,var(--dcuf-glass-rim),transparent 72%) !important;
            box-shadow: 0 10px 28px rgba(38,54,88,.08),inset 0 1px 0 var(--dcuf-glass-rim) !important;
            -webkit-backdrop-filter: blur(var(--dcuf-glass-blur)) saturate(1.12) !important;
            backdrop-filter: blur(var(--dcuf-glass-blur)) saturate(1.12) !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .gnb_bar {
            border: 1px solid var(--dcuf-glass-border) !important;
            border-radius: 14px !important;
            background-color: color-mix(in srgb,var(--dcuf-glass-panel) 72%,transparent) !important;
            background-image: linear-gradient(180deg,rgba(255,255,255,.22),transparent 78%) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: 0 6px 18px rgba(38,54,88,.055),inset 0 1px 0 var(--dcuf-glass-rim) !important;
            -webkit-backdrop-filter: blur(12px) saturate(1.08) !important;
            backdrop-filter: blur(12px) saturate(1.08) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .gnb_bar :is(a,button,span,em),
        html[${ROOT_ATTRIBUTE}] body .gnb_bar .gnb_list li > a {
            color: var(--dcuf-theme-fg) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .gnb_bar .sp_img.icon_next {
            border-top-color: var(--dcuf-theme-fg-muted) !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .newvisit_history {
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
            overflow: visible !important;
        }
        html[${ROOT_ATTRIBUTE}] body .issue_wrap {
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body .newvisit_history {
            border-bottom: 1px solid color-mix(in srgb,var(--dcuf-theme-border-strong) 46%,transparent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .page_head {
            position: relative !important;
            z-index: 20 !important;
            overflow: visible !important;
            border: 1px solid var(--dcuf-glass-border) !important;
            border-radius: var(--dcuf-radius-panel) !important;
            background-color: var(--dcuf-glass-panel) !important;
            background-image: linear-gradient(180deg,var(--dcuf-glass-highlight),transparent 76%) !important;
            box-shadow: 0 9px 24px rgba(36,52,84,.07),inset 0 1px 0 var(--dcuf-glass-rim) !important;
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body .page_head :is(.fr,.gall_issuebox) {
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body .page_head > .fr.gall_issuebox > :is(
            .relate,.gall_useinfo,.fixture-issue-more,.btn_hotall_list
        ) {
            border-color: var(--dcuf-glass-border) !important;
            border-radius: var(--dcuf-radius-control) !important;
            background-color: var(--dcuf-glass-control) !important;
            background-image: linear-gradient(180deg,var(--dcuf-glass-highlight),transparent 78%) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: inset 0 1px 0 var(--dcuf-glass-rim) !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body:not(.is-write-page) .list_array_option {
            overflow: visible !important;
            border: 1px solid var(--dcuf-glass-border) !important;
            border-radius: var(--dcuf-radius-panel) !important;
            background-color: var(--dcuf-glass-panel) !important;
            background-image: linear-gradient(180deg,var(--dcuf-glass-highlight),transparent 76%) !important;
            box-shadow: 0 8px 22px rgba(36,52,84,.065),inset 0 1px 0 var(--dcuf-glass-rim) !important;
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #container .custom-mobile-list {
            overflow: hidden !important;
            padding: 0 !important;
            border: 1px solid var(--dcuf-glass-border) !important;
            border-radius: var(--dcuf-radius-panel) !important;
            background: var(--dcuf-glass-cell) !important;
            box-shadow: 0 9px 26px rgba(35,52,88,.065),inset 0 1px 0 var(--dcuf-glass-rim) !important;
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .custom-mobile-list .custom-post-item {
            margin: 0 !important;
            border: 0 !important;
            border-bottom: 1px solid color-mix(in srgb,var(--dcuf-theme-border-strong) 55%,transparent) !important;
            border-radius: 0 !important;
            background-color: var(--dcuf-glass-cell) !important;
            background-image: none !important;
            box-shadow: none !important;
            transform: none !important;
            transition: none !important;
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .custom-mobile-list .custom-post-item.dcuf-recent-post {
            outline: 1px solid color-mix(in srgb,var(--dcuf-theme-accent) 22%,var(--dcuf-glass-border)) !important;
            outline-offset: -1px !important;
            background-color: color-mix(in srgb,var(--dcuf-theme-accent) 4%,var(--dcuf-glass-cell)) !important;
            box-shadow: inset 3px 0 0 color-mix(in srgb,var(--dcuf-theme-accent) 54%,transparent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .custom-mobile-list .custom-post-item:last-child {
            border-bottom: 0 !important;
        }
        html[${ROOT_ATTRIBUTE}] body .custom-mobile-list .custom-post-item:is(:hover,:focus-within) {
            background-color: color-mix(in srgb,var(--dcuf-theme-accent) 4%,var(--dcuf-glass-cell)) !important;
            transform: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body .custom-mobile-list .custom-post-item:has(
            #user_data_lyr:not([style*="display: none"]),
            .user_data:not([style*="display: none"]),
            .pop_wrap.type2[style*="display:block"],
            .pop_wrap.type2[style*="display: block"],
            .pop_wrap.type3[style*="display:block"],
            .pop_wrap.type3[style*="display: block"]
        ) {
            position: relative !important;
            z-index: 2147483600 !important;
            transform: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body .custom-post-item :is(#user_data_lyr,.user_data,.pop_wrap.type2,.pop_wrap.type3) {
            z-index: 2147483647 !important;
        }
        html[${ROOT_ATTRIBUTE}] body .custom-post-item:is(.notice,.concept)::before,
        html[${ROOT_ATTRIBUTE}] body .list_array_option .array_tab :is(.on,button.on,a.on) {
            border-color: color-mix(in srgb,var(--dcuf-theme-accent) 24%,var(--dcuf-glass-border)) !important;
            background-color: var(--dcuf-glass-control-active) !important;
            background-image: linear-gradient(180deg,var(--dcuf-glass-control-active-top),var(--dcuf-glass-control-active)) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: inset 0 1px 0 var(--dcuf-glass-rim),0 5px 14px var(--dcuf-glass-accent-shadow) !important;
            text-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body:not(.is-write-page) .list_array_option :is(.btn_write,.btn_write.txt) {
            border-color: color-mix(in srgb,var(--dcuf-theme-accent) 26%,var(--dcuf-glass-border)) !important;
            border-radius: var(--dcuf-radius-control) !important;
            background-color: color-mix(in srgb,var(--dcuf-theme-accent) 16%,var(--dcuf-glass-control)) !important;
            background-image: linear-gradient(180deg,var(--dcuf-glass-control-active-top),transparent 86%) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: inset 0 1px 0 var(--dcuf-glass-rim),0 6px 16px var(--dcuf-glass-accent-shadow) !important;
            text-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body:not(.is-write-page) .list_array_option .select_box.array_num {
            z-index: 2147483600 !important;
        }
        html[${ROOT_ATTRIBUTE}] body:not(.is-write-page) .list_array_option:has(
            #listSizeLayer:not([style*="display: none"]):not([style*="display:none"])
        ) {
            position: relative !important;
            z-index: 2147483600 !important;
            filter: none !important;
            transform: none !important;
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body:not(.is-write-page) .list_array_option .select_box.array_num .icon_option_more {
            position: static !important;
            inset: auto !important;
            align-self: center !important;
            margin: 0 0 0 6px !important;
            transform: none !important;
            vertical-align: middle !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(.dcheader,.wrap_search,.top_search,.inner_search) {
            overflow: visible !important;
        }
        html[${ROOT_ATTRIBUTE}] body .dcheader:has(.auto_wordwrap.lately:not([style*="display: none"])) {
            position: relative !important;
            z-index: 2147483600 !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            .auto_wordwrap.lately,#listSizeLayer.option_box,#hot_rank_pop2,
            .issue_wrap .pop_wrap,.alarmPopup.pop_wrap
        ) {
            z-index: 2147483647 !important;
            pointer-events: auto !important;
        }

        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #container > article > .view_content_wrap:not(header) {
            box-sizing: border-box !important;
            overflow: hidden !important;
            border: 1px solid var(--dcuf-glass-border) !important;
            border-color: var(--dcuf-glass-border) !important;
            border-radius: var(--dcuf-radius-panel) !important;
            background-color: var(--dcuf-glass-panel) !important;
            background-image: linear-gradient(145deg,var(--dcuf-glass-highlight),transparent 44%) !important;
            box-shadow: 0 10px 30px rgba(32,48,82,.075),inset 0 1px 0 var(--dcuf-glass-rim) !important;
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #container > article > .view_content_wrap:not(header) > header {
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .view_content_wrap :is(
            .gallview_head,.gallview_contents,.writing_view_box,.write_div
        ) {
            border-right: 0 !important;
            border-left: 0 !important;
            border-radius: 0 !important;
            background-color: transparent !important;
            background-image: none !important;
            box-shadow: none !important;
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .view_content_wrap :is(.gallview_contents,.writing_view_box) {
            background-color: var(--dcuf-glass-paper) !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .view_content_wrap .gallview_contents {
            padding: 18px clamp(20px,3vw,34px) clamp(20px,3vw,34px) !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .view_content_wrap .write_div {
            color: var(--dcuf-theme-fg) !important;
            font-size: 17px !important;
            line-height: 1.72 !important;
        }
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap .btn_recommend_box {
            border-radius: 15px !important;
            background-color: var(--dcuf-glass-panel-strong) !important;
            background-image: linear-gradient(180deg,var(--dcuf-glass-highlight),transparent 78%) !important;
            box-shadow: 0 6px 18px rgba(32,48,82,.06),inset 0 1px 0 var(--dcuf-glass-rim) !important;
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .view_content_wrap .btn_recommend_box .inner_box > .inner {
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .view_content_wrap .gall_exposure_list {
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            border-top: 1px solid color-mix(in srgb,var(--dcuf-theme-border-strong) 52%,transparent) !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .view_content_wrap .gall_exposure_list li {
            padding: 10px clamp(20px,3vw,34px) !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }

        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body :is(
            #focus_cmt > div[id^="comment_wrap_"].show,
            #container .view_comment.image_comment > .comment_wrap
        ) {
            overflow: visible !important;
            border: 1px solid var(--dcuf-glass-border) !important;
            border-radius: var(--dcuf-radius-panel) !important;
            background-color: var(--dcuf-glass-cell) !important;
            background-image: none !important;
            box-shadow: 0 8px 24px rgba(32,48,82,.06),inset 0 1px 0 var(--dcuf-glass-rim) !important;
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body :is(
            #focus_cmt .comment_box,
            #container .view_comment.image_comment .comment_box.img_comment_box
        ) {
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body :is(
            #focus_cmt .comment_box .cmt_list > li,
            #container .view_comment.image_comment .comment_box.img_comment_box .cmt_list > li
        ) {
            margin: 0 !important;
            border: 0 !important;
            border-bottom: 1px solid color-mix(in srgb,var(--dcuf-theme-border-strong) 50%,transparent) !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #focus_cmt .comment_box .cmt_list > li {
            padding: 12px 16px !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #focus_cmt .comment_box .cmt_txtbox img:is(
            .comment_dccon,.written_dccon,.bigdccon
        ) {
            display: block !important;
            width: auto !important;
            height: auto !important;
            max-width: min(112px,30vw) !important;
            max-height: 112px !important;
            object-fit: contain !important;
            border-radius: 8px !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #focus_cmt .comment_box .cmt_txtbox img.written_dccon:not(.bigdccon) {
            max-width: min(88px,24vw) !important;
            max-height: 88px !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #focus_cmt :is(.reply.show,.reply_box) {
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #focus_cmt .reply_box {
            margin-left: 18px !important;
            padding-left: 14px !important;
            border-left: 2px solid color-mix(in srgb,var(--dcuf-theme-accent) 34%,var(--dcuf-theme-border-strong)) !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #focus_cmt :is(.reply_list > li,li[id^="reply_li_"]) {
            border: 0 !important;
            border-bottom: 1px solid color-mix(in srgb,var(--dcuf-theme-border-strong) 42%,transparent) !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #focus_cmt .reply_box .cmt_write_box {
            border: 1px solid var(--dcuf-glass-border) !important;
            border-radius: var(--dcuf-radius-row) !important;
            background-color: var(--dcuf-glass-cell-soft) !important;
            background-image: none !important;
            box-shadow: inset 0 1px 0 var(--dcuf-glass-rim) !important;
        }

        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form {
            border-radius: var(--dcuf-radius-panel) !important;
            background-color: var(--dcuf-glass-panel) !important;
            background-image: linear-gradient(145deg,var(--dcuf-glass-highlight),transparent 44%) !important;
            box-shadow: 0 12px 34px rgba(31,47,80,.09),inset 0 1px 0 var(--dcuf-glass-rim) !important;
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page #container form.dcuf-write-form .write_subject {
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form :is(
            .note-editor,.tx-editor-container,.tx-editor
        ) {
            border-radius: var(--dcuf-radius-row) !important;
            background-color: transparent !important;
            background-image: none !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form :is(
            .note-editable,.tx-content-container,.tx-canvas
        ) {
            border-radius: 0 0 var(--dcuf-radius-control) var(--dcuf-radius-control) !important;
            background-color: var(--dcuf-glass-paper) !important;
            background-image: none !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form :is(
            .note-toolbar,.note-toolbar-media,.tx-toolbar,.tx-toolbar-basic,.btns-box
        ) {
            background-color: color-mix(in srgb,var(--dcuf-glass-panel-strong) 82%,transparent) !important;
            background-image: none !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form :is(
            .note-btn,.note-toolbar-media > button,.btns-box button,.tx-toolbar button,.tx-toolbar a
        ):not(.pop_wrap *):not(.note-dropdown-menu *) {
            border-color: transparent !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form > .btn_box.write {
            display: grid !important;
            grid-template-columns: minmax(0,1fr) minmax(0,1fr) !important;
            gap: 10px !important;
            border: 0 !important;
            border-top: 1px solid var(--dcuf-theme-border) !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page #container form.dcuf-write-form > .btn_box.write > button {
            width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
        }
        html[${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form:has(
            #leave_confirm_box[style*="display:block"],
            #leave_confirm_box[style*="display: block"]
        ) {
            position: relative !important;
            z-index: 2147483600 !important;
            overflow: visible !important;
        }
        html[${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form #leave_confirm_box {
            position: fixed !important;
            inset: auto !important;
            left: 50% !important;
            top: 50% !important;
            width: min(400px,calc(100vw - 16px)) !important;
            max-width: calc(100vw - 16px) !important;
            margin: 0 !important;
            transform: translate(-50%,-50%) !important;
            z-index: 2147483647 !important;
        }

        html[${ROOT_ATTRIBUTE}] body.is-delete-confirm-page #top {
            box-sizing: border-box !important;
            width: 100% !important;
            max-width: none !important;
            margin-right: auto !important;
            margin-left: auto !important;
        }
        html[${ROOT_ATTRIBUTE}] body.is-delete-confirm-page #container {
            display: grid !important;
            box-sizing: border-box !important;
            width: 100% !important;
            min-width: 0 !important;
            min-height: calc(100dvh - 170px) !important;
            padding: 28px 14px !important;
            place-items: center !important;
            background: transparent !important;
        }
        html[${ROOT_ATTRIBUTE}] body.is-delete-confirm-page #container > section,
        html[${ROOT_ATTRIBUTE}] body.is-delete-confirm-page #container form,
        html[${ROOT_ATTRIBUTE}] body.is-delete-confirm-page #container article {
            width: 100% !important;
            min-width: 0 !important;
        }
        html[${ROOT_ATTRIBUTE}] body.is-delete-confirm-page .dcuf-delete-confirm-page {
            width: min(520px,100%) !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: transparent !important;
        }
        html[${ROOT_ATTRIBUTE}] body.is-delete-confirm-page .dcuf-delete-confirm-card {
            position: static !important;
            box-sizing: border-box !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 28px !important;
            border: 1px solid var(--dcuf-glass-border) !important;
            border-radius: var(--dcuf-radius-panel) !important;
            background-color: var(--dcuf-glass-panel) !important;
            background-image: linear-gradient(145deg,var(--dcuf-glass-highlight),transparent 46%) !important;
            box-shadow: var(--dcuf-glass-popup-shadow),inset 0 1px 0 var(--dcuf-glass-rim) !important;
            -webkit-backdrop-filter: blur(var(--dcuf-glass-blur)) saturate(1.12) !important;
            backdrop-filter: blur(var(--dcuf-glass-blur)) saturate(1.12) !important;
        }
        html[${ROOT_ATTRIBUTE}] body.is-delete-confirm-page .dcuf-delete-confirm-content {
            width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            color: var(--dcuf-theme-fg) !important;
        }
        html[${ROOT_ATTRIBUTE}] body.is-delete-confirm-page .dcuf-delete-confirm-content > .btn_box {
            display: grid !important;
            grid-template-columns: minmax(0,1fr) minmax(0,1fr) !important;
            gap: 10px !important;
            width: 100% !important;
            margin-top: 20px !important;
        }
        html[${ROOT_ATTRIBUTE}] body.is-delete-confirm-page .dcuf-delete-confirm-content > .btn_box > button {
            width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
        }
        html[${ROOT_ATTRIBUTE}] body.is-delete-confirm-page :is(footer.dcfoot,#data_info) {
            display: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body .alarmPopup.pop_wrap {
            position: fixed !important;
            max-width: min(420px,calc(100vw - 24px)) !important;
        }

        @media (min-width:1024px) {
            html[${ROOT_ATTRIBUTE}] body > :is(#top,#container,.dcheader.typea,.page_head,.issue_wrap) {
                box-sizing: border-box !important;
                width: min(1480px,calc(100% - 48px)) !important;
                max-width: 1480px !important;
                margin-right: auto !important;
                margin-left: auto !important;
            }
            html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .dcheader.typea {
                height: 92px !important;
                min-height: 92px !important;
            }
            html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .dcheader.typea .dchead {
                box-sizing: border-box !important;
                display: grid !important;
                grid-template-columns: minmax(230px,1fr) minmax(360px,480px) minmax(230px,1fr) !important;
                align-items: center !important;
                width: 100% !important;
                max-width: none !important;
                height: 92px !important;
                min-height: 92px !important;
                margin: 0 !important;
                padding: 0 28px !important;
            }
            html[${ROOT_ATTRIBUTE}] body .dcheader.typea .dc_logo {
                position: static !important;
                inset: auto !important;
                display: flex !important;
                align-items: center !important;
                justify-self: start !important;
                gap: 8px !important;
                width: auto !important;
                max-width: 100% !important;
                height: auto !important;
                margin: 0 !important;
                overflow: visible !important;
                transform: none !important;
            }
            html[${ROOT_ATTRIBUTE}] body .dcheader.typea .dc_logo > a {
                display: flex !important;
                align-items: center !important;
                width: auto !important;
                height: auto !important;
            }
            html[${ROOT_ATTRIBUTE}] body .dcheader.typea .dc_logo img.logo_img {
                width: auto !important;
                height: 28px !important;
            }
            html[${ROOT_ATTRIBUTE}] body .dcheader.typea .dc_logo img.logo_img2 {
                display: block !important;
                width: auto !important;
                height: 18px !important;
            }
            html[${ROOT_ATTRIBUTE}] body .dcheader.typea .wrap_search {
                position: relative !important;
                inset: auto !important;
                justify-self: center !important;
                width: 100% !important;
                max-width: 480px !important;
                margin: 0 !important;
                transform: none !important;
            }
            html[${ROOT_ATTRIBUTE}] body .dcheader.typea .area_links {
                position: static !important;
                inset: auto !important;
                justify-self: end !important;
                max-width: 100% !important;
                margin: 0 !important;
                transform: none !important;
            }
            html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body :is(.gnb_bar,.newvisit_history) {
                box-sizing: border-box !important;
                width: min(1480px,calc(100% - 48px)) !important;
                max-width: 1480px !important;
                margin-right: auto !important;
                margin-left: auto !important;
            }
            html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .gnb_bar {
                min-height: 48px !important;
                margin-top: 8px !important;
            }
            html[${ROOT_ATTRIBUTE}] body .gnb_bar .gnb {
                box-sizing: border-box !important;
                width: 100% !important;
                max-width: none !important;
                margin: 0 !important;
            }
            html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .newvisit_history {
                min-height: 44px !important;
                height: 44px !important;
                padding: 3px 14px !important;
            }
            html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page .page_head {
                display: none !important;
            }
            html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page .newvisit_history {
                margin-top: 8px !important;
            }
        }
        @media (max-width:600px) {
            html[${ROOT_ATTRIBUTE}] body.is-write-page :is(.gnb_bar,.newvisit_history,footer.dcfoot,#data_info),
            html[${ROOT_ATTRIBUTE}] body.dcuf-write-desktop-site-mobile :is(.gnb_bar,.newvisit_history,footer.dcfoot,#data_info) {
                display: none !important;
            }
            html[${ROOT_ATTRIBUTE}] body.is-write-page .dcheader.typea .dchead {
                border-radius: 0 0 14px 14px !important;
            }
            html[${ROOT_ATTRIBUTE}] body .custom-mobile-list > .custom-post-item {
                border-radius: 0 !important;
            }
        }

        /*
         * Live reference alignment.
         * Keep native popup descendants untouched; only the page-head doors and
         * script-adapted reading/write shells receive bounded geometry changes.
         */
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .page_head {
            box-sizing: border-box !important;
            display: flex !important;
            align-items: center !important;
            flex-wrap: wrap !important;
            gap: 12px !important;
            width: 100% !important;
            min-width: 0 !important;
            min-height: 66px !important;
            margin: 14px 0 12px !important;
            padding: 12px 18px !important;
            border: 1px solid var(--dcuf-glass-border) !important;
            border-radius: 18px !important;
            background-color: var(--dcuf-glass-panel) !important;
            background-image: linear-gradient(180deg,var(--dcuf-glass-rim),transparent 76%) !important;
            box-shadow: 0 8px 24px rgba(32,48,82,.07),inset 0 1px 0 var(--dcuf-glass-rim) !important;
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body .page_head > .fl {
            display: flex !important;
            align-items: center !important;
            flex: 1 1 260px !important;
            min-width: 0 !important;
            margin: 0 !important;
            float: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body .page_head > .fr.gall_issuebox {
            display: flex !important;
            align-items: center !important;
            justify-content: flex-end !important;
            flex: 0 1 auto !important;
            flex-wrap: wrap !important;
            gap: 8px !important;
            width: auto !important;
            min-width: 0 !important;
            height: auto !important;
            margin: 0 0 0 auto !important;
            padding: 0 !important;
            float: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body .page_head > .fr.gall_issuebox > :is(
            button.relate,button.adr_copy,button.gall_useinfo,button.fixture-issue-more,
            .bundle,.dcuf-header-drawer
        ),
        html[${ROOT_ATTRIBUTE}] body .page_head > .fr.gall_issuebox > .dcuf-header-drawer > .dcuf-header-drawer__toggle,
        html[${ROOT_ATTRIBUTE}] body .page_head > .fr.gall_issuebox > .bundle > :is(button,a,#issue_setting) {
            box-sizing: border-box !important;
            display: inline-flex !important;
            position: static !important;
            inset: auto !important;
            align-items: center !important;
            justify-content: center !important;
            width: auto !important;
            min-width: 0 !important;
            min-height: 38px !important;
            margin: 0 !important;
            padding: 0 14px !important;
            float: none !important;
            transform: none !important;
            border: 1px solid var(--dcuf-glass-border) !important;
            border-radius: 10px !important;
            background-color: var(--dcuf-glass-control) !important;
            background-image: linear-gradient(180deg,var(--dcuf-glass-highlight),transparent 78%) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: inset 0 1px 0 var(--dcuf-glass-rim) !important;
            line-height: 1.2 !important;
            white-space: nowrap !important;
        }
        html[${ROOT_ATTRIBUTE}] body .page_head > .fr.gall_issuebox > .bundle,
        html[${ROOT_ATTRIBUTE}] body .page_head > .fr.gall_issuebox > .dcuf-header-drawer {
            padding: 0 !important;
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body .page_head > .fr.gall_issuebox > :is(
            button.relate,button.adr_copy,button.gall_useinfo,button.fixture-issue-more
        )::before,
        html[${ROOT_ATTRIBUTE}] body .page_head > .fr.gall_issuebox > :is(
            button.relate,button.adr_copy,button.gall_useinfo,button.fixture-issue-more
        )::after,
        html[${ROOT_ATTRIBUTE}] body .page_head > .fr.gall_issuebox > .bundle > :is(button,a,#issue_setting)::before,
        html[${ROOT_ATTRIBUTE}] body .page_head > .fr.gall_issuebox > .bundle > :is(button,a,#issue_setting)::after {
            content: none !important;
            display: none !important;
        }

        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #container :is(
            .img_comment:has(> .view_comment.image_comment),
            .view_comment.image_comment,
            .view_comment.image_comment > .comment_wrap,
            .view_comment.image_comment .comment_box.img_comment_box,
            .view_comment.image_comment .comment_box.img_comment_box > .cmt_list
        ) {
            box-sizing: border-box !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin-right: 0 !important;
            margin-left: 0 !important;
        }

        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page #container {
            box-sizing: border-box !important;
            width: min(1480px,calc(100% - 48px)) !important;
            max-width: 1480px !important;
            margin-right: auto !important;
            margin-left: auto !important;
            padding: 12px 20px 28px !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page.dcuf-write-desktop-site-mobile #container {
            width: var(--dcuf-write-device-width) !important;
            max-width: var(--dcuf-write-device-width) !important;
            margin-right: 0 !important;
            margin-left: 0 !important;
            padding: 8px !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page #container > section,
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page #container > article,
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page #container .content,
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page #container article,
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page #container #write_wrap {
            box-sizing: border-box !important;
            width: 100% !important;
            max-width: none !important;
            min-width: 0 !important;
            margin-right: auto !important;
            margin-left: auto !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form {
            width: min(1400px,100%) !important;
            max-width: 1400px !important;
            margin: 8px auto 0 !important;
            padding: 18px !important;
            border-radius: 18px !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page #container form.dcuf-write-form .write_subject {
            min-height: 54px !important;
            margin-bottom: 12px !important;
            padding: 7px 9px !important;
            border: 1px solid var(--dcuf-write-border,var(--dcuf-theme-border)) !important;
            border-radius: 12px !important;
            background-color: var(--dcuf-glass-cell-soft) !important;
            background-image: none !important;
            box-shadow: inset 0 1px 0 var(--dcuf-glass-rim) !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form :is(
            .note-btn,.note-toolbar-media > button,.btns-box button,.tx-toolbar button,.tx-toolbar a
        ):not(.pop_wrap *):not(.note-dropdown-menu *) {
            border-radius: 9px !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form > .btn_box.write {
            gap: 12px !important;
            margin-top: 16px !important;
            padding-top: 14px !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form > .btn_box.write > button {
            position: static !important;
            inset: auto !important;
            min-height: 56px !important;
            border-radius: 11px !important;
            float: none !important;
            transform: none !important;
        }

        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-dcuf-password-page #container form.dcuf-password-form .btn_box > button,
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-dcuf-password-page #container form.dcuf-password-form .btn_box > .btn_ok {
            position: static !important;
            inset: auto !important;
            width: 100% !important;
            min-width: 0 !important;
            min-height: 48px !important;
            margin: 0 !important;
            border-radius: 11px !important;
            float: none !important;
            transform: none !important;
        }

        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-delete-confirm-page #container {
            display: block !important;
            min-height: 0 !important;
            padding: 16px 20px 36px !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-delete-confirm-page #container > section {
            max-width: 1360px !important;
            margin: 0 auto !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-delete-confirm-page .dcuf-delete-confirm-page {
            width: min(680px,100%) !important;
            margin: 16px auto 0 !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-delete-confirm-page .dcuf-delete-confirm-card {
            padding: 26px !important;
            border-radius: 16px !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-delete-confirm-page .dcuf-delete-confirm-content > p {
            margin: 0 !important;
            color: var(--dcuf-theme-fg) !important;
            font-weight: 650 !important;
            line-height: 1.55 !important;
            text-align: center !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-delete-confirm-page .dcuf-delete-confirm-content > .btn_box > button {
            position: static !important;
            inset: auto !important;
            min-height: 50px !important;
            border: 1px solid var(--dcuf-glass-border-strong) !important;
            border-radius: 10px !important;
            background-color: var(--dcuf-glass-control) !important;
            background-image: linear-gradient(180deg,var(--dcuf-glass-highlight),transparent 78%) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: inset 0 1px 0 var(--dcuf-glass-rim) !important;
            font-weight: 750 !important;
            float: none !important;
            transform: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-delete-confirm-page .dcuf-delete-confirm-content > .btn_box > :is(
            .btn_blue,button[type="submit"]
        ) {
            border-color: color-mix(in srgb,var(--dcuf-theme-accent) 32%,var(--dcuf-glass-border)) !important;
            background-color: var(--dcuf-glass-control-active) !important;
            background-image: linear-gradient(180deg,var(--dcuf-glass-control-active-top),var(--dcuf-glass-control-active)) !important;
            color: var(--dcuf-glass-on-active) !important;
            box-shadow: inset 0 1px 0 var(--dcuf-glass-rim),0 5px 14px var(--dcuf-glass-accent-shadow) !important;
        }

        @media (max-width:767px) {
            html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .page_head {
                min-height: 0 !important;
                margin: 8px 0 10px !important;
                padding: 10px !important;
                border-radius: 14px !important;
            }
            html[${ROOT_ATTRIBUTE}] body .page_head > .fl {
                flex-basis: 100% !important;
            }
            html[${ROOT_ATTRIBUTE}] body .page_head > .fr.gall_issuebox {
                justify-content: flex-start !important;
                width: 100% !important;
                margin-left: 0 !important;
            }
            html[${ROOT_ATTRIBUTE}] body .page_head > .fr.gall_issuebox > :is(
                button.relate,button.adr_copy,button.gall_useinfo,button.fixture-issue-more
            ),
            html[${ROOT_ATTRIBUTE}] body .page_head > .fr.gall_issuebox > .dcuf-header-drawer > .dcuf-header-drawer__toggle,
            html[${ROOT_ATTRIBUTE}] body .page_head > .fr.gall_issuebox > .bundle > :is(button,a,#issue_setting) {
                min-height: 40px !important;
                padding-right: 12px !important;
                padding-left: 12px !important;
            }
            html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page #container {
                padding: 8px 0 20px !important;
            }
            html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page form.dcuf-write-form {
                margin-top: 0 !important;
                padding: 12px !important;
                border-right: 0 !important;
                border-left: 0 !important;
                border-radius: 14px !important;
            }
            html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-delete-confirm-page #container {
                padding: 8px 10px 24px !important;
            }
            html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-delete-confirm-page .dcuf-delete-confirm-card {
                padding: 22px 18px !important;
            }
        }
        @media (prefers-reduced-transparency:reduce) {
            html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .page_head {
                background-color: var(--dcuf-glass-panel-solid) !important;
                -webkit-backdrop-filter: none !important;
                backdrop-filter: none !important;
            }
        }
        /*
         * Native gallery popups can be fixed descendants of this shell. Keep the
         * shell translucent through color only: any backdrop filter here changes
         * their containing block and buries otherwise-correct popup geometry.
         */
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .page_head {
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .gnb_bar .gnb_list,
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .newvisit_history .newvisit_list {
            margin: 0 !important;
            padding: 0 !important;
            list-style: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .gnb_bar .gnb_list {
            display: flex !important;
            align-items: center !important;
            justify-content: space-around !important;
            width: 100% !important;
            min-height: 52px !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body :is(
            .gnb_bar .gnb_list > li,
            .newvisit_history .newvisit_list > li
        ) {
            margin: 0 !important;
            padding: 0 !important;
            list-style: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .gnb_bar .gnb_list > li > a {
            display: inline-flex !important;
            align-items: center !important;
            min-height: 36px !important;
            padding: 0 14px !important;
            text-decoration: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .newvisit_history .newvisit_list > li > a,
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .page_head h2 > a {
            text-decoration: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .newvisit_history .newvisit_box {
            min-width: 0 !important;
            overflow: hidden !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .newvisit_history .newvisit_list {
            display: flex !important;
            align-items: center !important;
            flex-wrap: nowrap !important;
            gap: 0 !important;
            width: 100% !important;
            min-width: 0 !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            scrollbar-width: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .newvisit_history .newvisit_list::-webkit-scrollbar {
            display: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .newvisit_history .newvisit_list > li {
            flex: 0 0 auto !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .newvisit_history .newvisit_list > li > a {
            display: inline-flex !important;
            align-items: center !important;
            min-height: 32px !important;
            padding: 0 9px !important;
            color: var(--dcuf-theme-fg-muted) !important;
            font-size: 12px !important;
            line-height: 1 !important;
            white-space: nowrap !important;
        }

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
            background-color: var(--dcuf-glass-control-active) !important;
            background-image: linear-gradient(145deg,var(--dcuf-glass-control-active-top),var(--dcuf-glass-control-active)) !important;
            color: var(--dcuf-theme-on-accent) !important;
            box-shadow: 0 7px 16px var(--dcuf-theme-accent-shadow) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel input:checked + .switch-slider,
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting input:checked + .switch-slider {
            border-color: var(--dcuf-theme-accent-strong) !important;
            background-color: var(--dcuf-glass-control-active) !important;
            background-image: linear-gradient(145deg,var(--dcuf-glass-control-active-top),var(--dcuf-glass-control-active)) !important;
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

        /* Shared glass rail. This remains inside the PC extraction boundary. */
        html[${ROOT_ATTRIBUTE}] body :is(
            #dcinside-filter-setting,
            #dcinside-shortcut-modal,
            #dcinside-headtext-manager-panel,
            #dc-personal-block-size-panel,
            #dc-personal-block-drawer,
            #dc-manual-block-panel,
            #dc-selection-popup,
            #dc-block-management-panel,
            #dc-backup-popup
        ) {
            border-color: var(--dcuf-glass-border-strong) !important;
            background-color: var(--dcuf-glass-panel-solid) !important;
            background-image:
                linear-gradient(145deg, var(--dcuf-glass-highlight), transparent 45%),
                radial-gradient(circle at 96% 0%, color-mix(in srgb, var(--dcuf-theme-accent-soft) 42%, transparent), transparent 38%) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: var(--dcuf-glass-popup-shadow), inset 0 1px 0 var(--dcuf-glass-highlight) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            #dcinside-filter-setting .dcuf-settings-header,
            #dcinside-filter-setting .dcuf-settings-footer,
            #dcinside-shortcut-modal .modal-header,
            #dcinside-headtext-manager-panel .panel-header,
            #dc-personal-block-size-panel .dcuf-fab-size-header,
            #dc-manual-block-panel .dcuf-manual-header,
            #dc-block-management-panel .panel-header,
            #dc-block-management-panel .panel-tabs,
            #dc-block-management-panel .panel-footer,
            #dc-backup-popup .popup-header
        ) {
            border-color: var(--dcuf-glass-border) !important;
            background-color: var(--dcuf-glass-panel-strong) !important;
            background-image: linear-gradient(180deg, var(--dcuf-glass-highlight), transparent 70%) !important;
            box-shadow: inset 0 1px 0 var(--dcuf-glass-highlight) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            #dcinside-filter-setting .dcuf-settings-section,
            #dcinside-filter-setting .dcuf-settings-threshold > div:last-child,
            #dcinside-filter-setting .dcuf-settings-guest-controls,
            #dcinside-shortcut-modal .shortcut-content,
            #dcinside-headtext-manager-panel .headtext-manager-row,
            #dc-personal-block-drawer button,
            #dc-personal-block-size-panel .dcuf-fab-size-preview,
            #dc-manual-block-panel .dcuf-manual-type-tabs,
            #dc-selection-popup .block-option,
            #dc-block-management-panel .panel-list-controls,
            #dc-block-management-panel .blocked-item,
            #dc-backup-popup .export-section,
            #dc-backup-popup .import-section
        ) {
            border-color: var(--dcuf-glass-border) !important;
            background-color: var(--dcuf-glass-control) !important;
            background-image: linear-gradient(145deg, var(--dcuf-glass-highlight), transparent 58%) !important;
            box-shadow: var(--dcuf-glass-card-shadow), inset 0 1px 0 var(--dcuf-glass-highlight) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            #dcinside-filter-setting,
            #dcinside-shortcut-modal,
            #dcinside-headtext-manager-panel,
            #dc-personal-block-size-panel,
            #dc-manual-block-panel,
            #dc-selection-popup,
            #dc-block-management-panel,
            #dc-backup-popup
        ) :is(input:not([type="checkbox"]):not([type="radio"]),textarea,select) {
            border-color: var(--dcuf-glass-border-strong) !important;
            background-color: var(--dcuf-glass-input) !important;
            background-image: linear-gradient(180deg, color-mix(in srgb, var(--dcuf-glass-highlight) 52%, transparent), transparent 64%) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: inset 0 1px 2px rgba(19,29,48,.1), 0 1px 0 var(--dcuf-glass-highlight) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting :is(
            #dcinside-threshold-input,
            #dcinside-ratio-min,
            #dcinside-ratio-max
        ),
        html[${ROOT_ATTRIBUTE}] body #dc-backup-popup textarea,
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel .panel-search-input {
            border-color: var(--dcuf-glass-border-strong) !important;
            background-color: var(--dcuf-glass-input) !important;
            background-image: linear-gradient(180deg, color-mix(in srgb, var(--dcuf-glass-highlight) 52%, transparent), transparent 64%) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: inset 0 1px 2px rgba(19,29,48,.1), 0 1px 0 var(--dcuf-glass-highlight) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            #dcinside-filter-setting,
            #dc-block-management-panel
        ) .switch-slider {
            border-color: var(--dcuf-glass-border-strong) !important;
            background-color: color-mix(in srgb, var(--dcuf-theme-fg-muted) 25%, var(--dcuf-glass-control)) !important;
            background-image: linear-gradient(180deg, color-mix(in srgb, white 26%, transparent), transparent) !important;
            box-shadow: inset 0 1px 2px rgba(0,0,0,.15), 0 1px 0 var(--dcuf-glass-highlight) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            #dcinside-filter-setting,
            #dc-block-management-panel
        ) input:checked + .switch-slider {
            border-color: color-mix(in srgb, var(--dcuf-theme-accent-strong) 72%, var(--dcuf-glass-border-strong)) !important;
            background-color: var(--dcuf-glass-control-active) !important;
            background-image: linear-gradient(180deg, var(--dcuf-glass-control-active-top), var(--dcuf-glass-control-active)) !important;
            box-shadow: 0 5px 12px var(--dcuf-glass-accent-shadow), inset 0 1px 0 color-mix(in srgb, white 34%, transparent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            #dcinside-filter-setting,
            #dc-block-management-panel
        ) .switch-slider::before {
            background: #fff !important;
            box-shadow: 0 3px 7px rgba(15,23,42,.32), inset 0 1px 0 rgba(255,255,255,.9) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            #dcinside-filter-setting #dcinside-threshold-save,
            #dcinside-shortcut-modal #dcinside-save-shortcut-btn,
            #dc-personal-block-size-panel [data-dcuf-fab-size-action="save"],
            #dc-selection-popup .block-option button:not(.btn-unblock),
            #dc-block-management-panel .panel-save-btn,
            #dc-backup-popup .export-btn,
            #dc-backup-popup .import-btn,
            #dc-manual-block-panel .dcuf-manual-actions [data-manual-block-action="add"],
            #dcinside-filter-setting #dcinside-proxy-ip-block-mode-group button[data-proxy-mode][aria-pressed="true"]
        ) {
            border-color: color-mix(in srgb, var(--dcuf-theme-accent-strong) 74%, var(--dcuf-glass-border-strong)) !important;
            background-color: var(--dcuf-glass-control-active) !important;
            background-image: linear-gradient(180deg, var(--dcuf-glass-control-active-top), var(--dcuf-glass-control-active)) !important;
            color: var(--dcuf-glass-on-active) !important;
            box-shadow: 0 9px 20px var(--dcuf-glass-accent-shadow), inset 0 1px 0 color-mix(in srgb, white 38%, transparent), inset 0 -1px 0 rgba(0,0,0,.12) !important;
            text-shadow: 0 1px 1px rgba(0,0,0,.12) !important;
            transition: transform .15s ease, box-shadow .15s ease, filter .15s ease !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            #dc-block-management-panel .panel-tab.active,
            #dc-manual-block-panel [data-manual-block-type][aria-pressed="true"],
            #dcinside-headtext-manager-panel [aria-pressed="true"],
            #dc-personal-block-drawer button:is(:hover,:focus-visible),
            #dc-backup-popup .export-btn-download
        ) {
            border-color: color-mix(in srgb, var(--dcuf-theme-accent) 44%, var(--dcuf-glass-border)) !important;
            background-color: color-mix(in srgb, var(--dcuf-theme-accent-soft) 72%, var(--dcuf-glass-control)) !important;
            background-image: linear-gradient(180deg, var(--dcuf-glass-highlight), transparent 72%) !important;
            color: var(--dcuf-theme-accent-strong) !important;
            box-shadow: 0 6px 15px color-mix(in srgb, var(--dcuf-theme-accent) 12%, transparent), inset 0 1px 0 var(--dcuf-glass-highlight) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            #dc-selection-popup .btn-unblock,
            #dc-block-management-panel .delete-item-btn,
            #dc-manual-block-panel [data-manual-block-action="remove"]
        ) {
            border-color: color-mix(in srgb, #c83a4b 45%, var(--dcuf-glass-border)) !important;
            background-color: color-mix(in srgb, #c83a4b 13%, var(--dcuf-glass-control)) !important;
            background-image: linear-gradient(180deg, var(--dcuf-glass-highlight), transparent 72%) !important;
            color: color-mix(in srgb, #b42335 88%, var(--dcuf-theme-fg)) !important;
        }
        @supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
            html[${ROOT_ATTRIBUTE}] body :is(
                #dcinside-filter-setting,
                #dcinside-shortcut-modal,
                #dcinside-headtext-manager-panel,
                #dc-personal-block-size-panel,
                #dc-personal-block-drawer,
                #dc-manual-block-panel,
                #dc-selection-popup,
                #dc-block-management-panel,
                #dc-backup-popup
            ) {
                background-color: var(--dcuf-glass-panel) !important;
                -webkit-backdrop-filter: blur(var(--dcuf-glass-blur)) saturate(1.08) !important;
                backdrop-filter: blur(var(--dcuf-glass-blur)) saturate(1.08) !important;
            }
        }
        @media (prefers-reduced-transparency: reduce) {
            html[${ROOT_ATTRIBUTE}] body :is(
                #dcinside-filter-setting,#dcinside-shortcut-modal,#dcinside-headtext-manager-panel,
                #dc-personal-block-size-panel,#dc-personal-block-drawer,#dc-manual-block-panel,
                #dc-selection-popup,#dc-block-management-panel,#dc-backup-popup
            ) {
                background-color: var(--dcuf-glass-panel-solid) !important;
                -webkit-backdrop-filter: none !important;
                backdrop-filter: none !important;
            }
        }

        /* Script-owned floating glass: one deep shell, lighter nested panes, no stacked white cards. */
        html[${ROOT_ATTRIBUTE}] body :is(
            #dcinside-shortcut-modal-overlay,
            #dc-personal-block-size-overlay,
            #dc-manual-block-overlay,
            #dc-block-management-panel-overlay,
            #dc-backup-popup-overlay
        ) {
            background:
                radial-gradient(circle at 16% 8%, color-mix(in srgb, var(--dcuf-theme-accent) 16%, transparent), transparent 42%),
                rgba(18, 28, 48, .24) !important;
            -webkit-backdrop-filter: blur(8px) saturate(.9) !important;
            backdrop-filter: blur(8px) saturate(.9) !important;
        }
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode :is(
            #dcinside-shortcut-modal-overlay,
            #dc-personal-block-size-overlay,
            #dc-manual-block-overlay,
            #dc-block-management-panel-overlay,
            #dc-backup-popup-overlay
        ) {
            background:
                radial-gradient(circle at 16% 8%, color-mix(in srgb, var(--dcuf-theme-accent) 18%, transparent), transparent 44%),
                rgba(3, 8, 18, .52) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            #dcinside-filter-setting,
            #dcinside-shortcut-modal,
            #dcinside-headtext-manager-panel,
            #dc-personal-block-size-panel,
            #dc-manual-block-panel,
            #dc-selection-popup,
            #dc-block-management-panel,
            #dc-backup-popup
        ) {
            border: 1px solid color-mix(in srgb, var(--dcuf-glass-border-strong) 74%, var(--dcuf-glass-rim)) !important;
            border-radius: 28px !important;
            background-color: var(--dcuf-glass-panel) !important;
            background-image:
                radial-gradient(ellipse 62% 42% at 100% 0%, color-mix(in srgb, var(--dcuf-theme-accent-soft) 52%, transparent), transparent 68%),
                radial-gradient(ellipse 56% 38% at 0% 100%, color-mix(in srgb, var(--dcuf-theme-accent) 12%, transparent), transparent 72%),
                linear-gradient(145deg, var(--dcuf-glass-rim), color-mix(in srgb, var(--dcuf-glass-highlight) 36%, transparent) 2px, transparent 48%) !important;
            box-shadow: var(--dcuf-glass-popup-shadow), inset 0 1px 0 var(--dcuf-glass-rim), inset 0 -1px 0 color-mix(in srgb, var(--dcuf-glass-border) 52%, transparent) !important;
            -webkit-backdrop-filter: blur(var(--dcuf-glass-blur)) saturate(1.3) !important;
            backdrop-filter: blur(var(--dcuf-glass-blur)) saturate(1.3) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting {
            z-index: 2147483642 !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dcinside-shortcut-modal-overlay {
            z-index: 2147483644 !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dcinside-shortcut-modal {
            z-index: 2147483645 !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dcinside-headtext-manager-panel {
            z-index: 2147483643 !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-personal-block-drawer {
            border-radius: 24px !important;
            background-color: color-mix(in srgb, var(--dcuf-glass-panel) 88%, var(--dcuf-theme-accent-soft)) !important;
            background-image:
                radial-gradient(ellipse 72% 40% at 100% 0%, color-mix(in srgb, var(--dcuf-theme-accent-soft) 62%, transparent), transparent 70%),
                linear-gradient(145deg, var(--dcuf-glass-rim), color-mix(in srgb, var(--dcuf-glass-highlight) 34%, transparent) 2px, transparent 52%) !important;
            box-shadow: 0 28px 72px rgba(24,40,78,.27), 0 8px 22px rgba(38,60,105,.14), inset 0 1px 0 var(--dcuf-glass-rim) !important;
            -webkit-backdrop-filter: blur(var(--dcuf-glass-blur)) saturate(1.32) !important;
            backdrop-filter: blur(var(--dcuf-glass-blur)) saturate(1.32) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-personal-block-fab {
            border: 1px solid color-mix(in srgb, var(--dcuf-theme-accent) 44%, var(--dcuf-glass-rim)) !important;
            background-color: color-mix(in srgb, var(--dcuf-glass-panel) 78%, var(--dcuf-theme-accent-soft)) !important;
            background-image:
                radial-gradient(circle at 24% 0%, rgba(255,255,255,.58), transparent 38%),
                linear-gradient(145deg, color-mix(in srgb, var(--dcuf-glass-panel-strong) 72%, var(--dcuf-theme-accent-soft)), color-mix(in srgb, var(--dcuf-glass-panel-soft) 66%, var(--dcuf-theme-accent-soft))) !important;
            color: var(--dcuf-theme-accent-strong) !important;
            text-shadow: 0 1px 0 color-mix(in srgb, white 72%, transparent) !important;
            box-shadow: 0 20px 46px rgba(27,48,92,.22), 0 6px 16px var(--dcuf-glass-accent-shadow), inset 0 1px 0 var(--dcuf-glass-rim), inset 0 -1px 0 color-mix(in srgb, var(--dcuf-theme-accent) 18%, transparent) !important;
            -webkit-backdrop-filter: blur(20px) saturate(1.28) !important;
            backdrop-filter: blur(20px) saturate(1.28) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-personal-block-fab:hover {
            border-color: color-mix(in srgb, var(--dcuf-theme-accent) 62%, var(--dcuf-glass-rim)) !important;
            background-color: color-mix(in srgb, var(--dcuf-glass-panel) 68%, var(--dcuf-theme-accent-soft)) !important;
            box-shadow: 0 25px 56px rgba(27,48,92,.27), 0 8px 20px var(--dcuf-glass-accent-shadow), inset 0 1px 0 var(--dcuf-glass-rim) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            #dcinside-filter-setting .dcuf-settings-header,
            #dcinside-filter-setting .dcuf-settings-footer,
            #dcinside-shortcut-modal .modal-header,
            #dcinside-headtext-manager-panel .panel-header,
            #dc-personal-block-size-panel .dcuf-fab-size-header,
            #dc-manual-block-panel .dcuf-manual-header,
            #dc-block-management-panel .panel-header,
            #dc-block-management-panel .panel-tabs,
            #dc-block-management-panel .panel-footer,
            #dc-backup-popup .popup-header
        ) {
            background-color: color-mix(in srgb, var(--dcuf-glass-panel-strong) 72%, transparent) !important;
            background-image:
                linear-gradient(180deg, color-mix(in srgb, var(--dcuf-glass-rim) 82%, transparent), transparent 78%) !important;
            box-shadow: inset 0 1px 0 var(--dcuf-glass-rim), 0 12px 30px rgba(35,53,92,.055) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            #dcinside-filter-setting .dcuf-settings-section,
            #dcinside-filter-setting .dcuf-settings-threshold > div:last-child,
            #dcinside-filter-setting .dcuf-settings-guest-controls,
            #dcinside-shortcut-modal .shortcut-content,
            #dcinside-headtext-manager-panel .headtext-manager-row,
            #dc-personal-block-drawer button,
            #dc-personal-block-size-panel .dcuf-fab-size-preview,
            #dc-manual-block-panel .dcuf-manual-type-tabs,
            #dc-selection-popup .block-option,
            #dc-block-management-panel .panel-list-controls,
            #dc-block-management-panel .blocked-item,
            #dc-backup-popup .export-section,
            #dc-backup-popup .import-section
        ) {
            border-color: color-mix(in srgb, var(--dcuf-glass-border) 78%, var(--dcuf-glass-rim)) !important;
            border-radius: 17px !important;
            background-color: var(--dcuf-glass-panel-soft) !important;
            background-image:
                linear-gradient(150deg, color-mix(in srgb, var(--dcuf-glass-rim) 68%, transparent), transparent 54%) !important;
            box-shadow: 0 12px 28px rgba(34,52,89,.075), inset 0 1px 0 var(--dcuf-glass-rim), inset 0 -1px 0 color-mix(in srgb, var(--dcuf-glass-border) 42%, transparent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-personal-block-drawer button {
            border-radius: 16px !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-personal-block-drawer .dcuf-menu-icon {
            border: 1px solid color-mix(in srgb, var(--dcuf-theme-accent) 34%, var(--dcuf-glass-rim)) !important;
            border-radius: 13px !important;
            background-color: color-mix(in srgb, var(--dcuf-glass-control) 72%, var(--dcuf-theme-accent-soft)) !important;
            background-image:
                radial-gradient(circle at 28% 12%, rgba(255,255,255,.62), transparent 38%),
                linear-gradient(145deg, color-mix(in srgb, var(--dcuf-glass-panel-strong) 68%, var(--dcuf-theme-accent-soft)), color-mix(in srgb, var(--dcuf-glass-control) 80%, var(--dcuf-theme-accent-soft))) !important;
            color: var(--dcuf-theme-accent-strong) !important;
            box-shadow: 0 8px 18px var(--dcuf-glass-accent-shadow), inset 0 1px 0 var(--dcuf-glass-rim) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            #dcinside-filter-setting,
            #dcinside-shortcut-modal,
            #dcinside-headtext-manager-panel,
            #dc-personal-block-size-panel,
            #dc-manual-block-panel,
            #dc-selection-popup,
            #dc-block-management-panel,
            #dc-backup-popup
        ) :is(button,a,[role="button"]) {
            border-radius: 14px !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel .panel-tab {
            border-radius: 14px !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            #dcinside-filter-setting,
            #dcinside-shortcut-modal,
            #dcinside-headtext-manager-panel,
            #dc-personal-block-size-panel,
            #dc-manual-block-panel,
            #dc-selection-popup,
            #dc-block-management-panel,
            #dc-backup-popup
        ) :is(input:not([type="checkbox"]):not([type="radio"]),textarea,select) {
            border-radius: 13px !important;
            background-color: var(--dcuf-glass-input) !important;
            background-image:
                linear-gradient(180deg, color-mix(in srgb, var(--dcuf-glass-rim) 68%, transparent), transparent 70%) !important;
            box-shadow: inset 0 2px 5px rgba(18,29,50,.105), 0 1px 0 var(--dcuf-glass-rim) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            #dcinside-filter-setting #dcinside-threshold-save,
            #dcinside-shortcut-modal #dcinside-save-shortcut-btn,
            #dc-personal-block-size-panel [data-dcuf-fab-size-action="save"],
            #dc-selection-popup .block-option button:not(.btn-unblock),
            #dc-block-management-panel .panel-save-btn,
            #dc-backup-popup .export-btn,
            #dc-backup-popup .import-btn,
            #dc-manual-block-panel .dcuf-manual-actions [data-manual-block-action="add"]
        ) {
            background-color: color-mix(in srgb, var(--dcuf-theme-accent-strong) 76%, transparent) !important;
            background-image:
                radial-gradient(circle at 22% 0%, rgba(255,255,255,.58), transparent 42%),
                linear-gradient(145deg, var(--dcuf-glass-control-active-top), var(--dcuf-glass-control-active)) !important;
            box-shadow: 0 14px 32px var(--dcuf-glass-accent-shadow), inset 0 1px 0 rgba(255,255,255,.5), inset 0 -1px 0 rgba(0,0,0,.14) !important;
        }
        @media (max-width: 520px) {
            html[${ROOT_ATTRIBUTE}] body :is(
                #dcinside-filter-setting,
                #dcinside-shortcut-modal,
                #dcinside-headtext-manager-panel,
                #dc-personal-block-size-panel,
                #dc-manual-block-panel,
                #dc-selection-popup,
                #dc-block-management-panel,
                #dc-backup-popup
            ) {
                border-radius: 24px !important;
            }
            html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting {
                box-sizing: border-box !important;
                width: calc(100vw - 24px) !important;
                max-width: calc(100vw - 24px) !important;
                padding: 14px !important;
            }
            html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting .dcuf-settings-threshold {
                display: grid !important;
                grid-template-columns: minmax(0,1fr) !important;
                gap: 10px !important;
            }
            html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting .dcuf-settings-threshold > div:first-child,
            html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting .dcuf-settings-threshold > div:last-child {
                box-sizing: border-box !important;
                width: 100% !important;
                max-width: none !important;
                flex: none !important;
            }
            html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting .dcuf-settings-threshold > div:first-child > h3 {
                max-width: 24em !important;
                margin-right: auto !important;
                margin-left: auto !important;
                font-size: 15px !important;
                line-height: 1.45 !important;
                word-break: keep-all !important;
            }
            html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting .dcuf-settings-footer {
                flex-wrap: wrap !important;
            }
            html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting #dcinside-threshold-save {
                margin-left: auto !important;
            }
        }
        @media (prefers-reduced-transparency: reduce) {
            html[${ROOT_ATTRIBUTE}] body :is(
                #dcinside-shortcut-modal-overlay,#dc-personal-block-size-overlay,#dc-manual-block-overlay,
                #dc-block-management-panel-overlay,#dc-backup-popup-overlay
            ) {
                -webkit-backdrop-filter: none !important;
                backdrop-filter: none !important;
            }
        }

        /* Shared aurora glass v3: one translucent shell, transparent internal hierarchy. */
        html[${ROOT_ATTRIBUTE}] body :is(
            #dcinside-shortcut-modal-overlay,
            #dc-personal-block-size-overlay,
            #dc-manual-block-overlay,
            #dc-personal-block-management-overlay,
            #dc-block-management-panel-overlay,
            #dc-backup-popup-overlay
        ) {
            background:
                radial-gradient(58% 46% at 12% 8%,rgba(93,105,255,.18),transparent 68%),
                radial-gradient(52% 44% at 94% 92%,rgba(43,191,221,.14),transparent 70%),
                rgba(8,16,31,.24) !important;
            -webkit-backdrop-filter:blur(12px) saturate(1.15) !important;
            backdrop-filter:blur(12px) saturate(1.15) !important;
        }
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode :is(
            #dcinside-shortcut-modal-overlay,
            #dc-personal-block-size-overlay,
            #dc-manual-block-overlay,
            #dc-personal-block-management-overlay,
            #dc-block-management-panel-overlay,
            #dc-backup-popup-overlay
        ) {
            background:
                radial-gradient(58% 46% at 12% 8%,rgba(76,91,239,.16),transparent 68%),
                radial-gradient(52% 44% at 94% 92%,rgba(31,164,201,.10),transparent 70%),
                rgba(2,7,16,.50) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            #dcinside-filter-setting,
            #dcinside-shortcut-modal,
            #dcinside-headtext-manager-panel,
            #dc-personal-block-size-panel,
            #dc-manual-block-panel,
            #dc-selection-popup,
            #dc-block-management-panel,
            #dc-backup-popup
        ) {
            border:1px solid var(--dcuf-glass-border) !important;
            border-top-color:var(--dcuf-glass-rim) !important;
            border-radius:24px !important;
            background-color:var(--dcuf-glass-panel) !important;
            background-image:linear-gradient(145deg,rgba(255,255,255,.18),transparent 42%) !important;
            color:var(--dcuf-theme-fg) !important;
            box-shadow:var(--dcuf-glass-popup-shadow),inset 0 1px 0 var(--dcuf-glass-rim) !important;
            -webkit-backdrop-filter:blur(var(--dcuf-glass-blur)) saturate(1.28) brightness(1.03) !important;
            backdrop-filter:blur(var(--dcuf-glass-blur)) saturate(1.28) brightness(1.03) !important;
        }
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode :is(
            #dcinside-filter-setting,
            #dcinside-shortcut-modal,
            #dcinside-headtext-manager-panel,
            #dc-personal-block-size-panel,
            #dc-manual-block-panel,
            #dc-selection-popup,
            #dc-block-management-panel,
            #dc-backup-popup
        ) {
            -webkit-backdrop-filter:blur(var(--dcuf-glass-blur)) saturate(1.22) !important;
            backdrop-filter:blur(var(--dcuf-glass-blur)) saturate(1.22) !important;
        }

        /* Headers and footers are thin refraction bands, never nested white cards. */
        html[${ROOT_ATTRIBUTE}] body :is(
            #dcinside-filter-setting .dcuf-settings-header,
            #dcinside-filter-setting .dcuf-settings-footer,
            #dcinside-shortcut-modal .modal-header,
            #dcinside-headtext-manager-panel .panel-header,
            #dc-personal-block-size-panel .dcuf-fab-size-header,
            #dc-manual-block-panel .dcuf-manual-header,
            #dc-block-management-panel .panel-header,
            #dc-block-management-panel .panel-tabs,
            #dc-block-management-panel .panel-footer,
            #dc-backup-popup .popup-header
        ) {
            border-color:rgba(255,255,255,.24) !important;
            background-color:rgba(255,255,255,.08) !important;
            background-image:linear-gradient(180deg,rgba(255,255,255,.14),transparent 76%) !important;
            box-shadow:inset 0 1px 0 rgba(255,255,255,.22) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            #dcinside-filter-setting .dcuf-settings-body,
            #dcinside-shortcut-modal .shortcut-content,
            #dcinside-headtext-manager-panel .panel-body,
            #dc-personal-block-size-panel .dcuf-fab-size-body,
            #dc-manual-block-panel .dcuf-manual-body,
            #dc-block-management-panel .panel-body,
            #dc-block-management-panel .panel-content,
            #dc-block-management-panel .blocked-list,
            #dc-block-management-panel .panel-empty-state,
            #dc-backup-popup .popup-body
        ) {
            background-color:transparent !important;
            background-image:none !important;
            box-shadow:none !important;
        }

        /* Settings use space and hairlines instead of a white rectangle around every row. */
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting :is(
            .dcuf-settings-section,
            .dcuf-settings-threshold,
            .dcuf-settings-ratio,
            .dcuf-settings-pum
        ) {
            border:0 !important;
            border-radius:14px !important;
            background-color:rgba(255,255,255,.075) !important;
            background-image:linear-gradient(145deg,rgba(255,255,255,.08),transparent 52%) !important;
            box-shadow:inset 0 1px 0 rgba(255,255,255,.16) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting .dcuf-settings-threshold > div:last-child,
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting .dcuf-settings-guest-controls {
            border:1px solid rgba(255,255,255,.24) !important;
            border-radius:14px !important;
            background-color:rgba(255,255,255,.09) !important;
            background-image:none !important;
            box-shadow:inset 0 1px 0 rgba(255,255,255,.18) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting .dcuf-settings-body > hr {
            display:none !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting #dcinside-proxy-ip-block-mode-group {
            border:1px solid rgba(255,255,255,.26) !important;
            border-radius:12px !important;
            background-color:rgba(255,255,255,.10) !important;
            background-image:none !important;
            box-shadow:inset 0 1px 3px rgba(22,32,54,.09) !important;
        }

        /* Management tabs and lists float within the shell without an opaque empty body. */
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel .panel-tabs {
            gap:6px !important;
            padding:7px !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel .panel-tab {
            border:1px solid transparent !important;
            border-radius:12px !important;
            background:transparent !important;
            color:var(--dcuf-theme-fg-muted) !important;
            box-shadow:none !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel .panel-tab.active {
            border-color:color-mix(in srgb,var(--dcuf-theme-accent) 30%,rgba(255,255,255,.28)) !important;
            background-color:color-mix(in srgb,var(--dcuf-theme-accent-soft) 12%,rgba(255,255,255,.12)) !important;
            background-image:linear-gradient(180deg,rgba(255,255,255,.16),transparent 76%) !important;
            color:var(--dcuf-theme-accent-strong) !important;
            box-shadow:inset 0 1px 0 rgba(255,255,255,.26),0 7px 18px var(--dcuf-glass-accent-shadow) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel .panel-tab.active::after {
            height:2px !important;
            background:var(--dcuf-theme-accent) !important;
            box-shadow:0 0 12px var(--dcuf-glass-accent-shadow) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel .panel-list-controls {
            border:0 !important;
            border-bottom:1px solid rgba(255,255,255,.18) !important;
            border-radius:0 !important;
            background-color:rgba(255,255,255,.055) !important;
            background-image:none !important;
            box-shadow:none !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel .blocked-item {
            border:0 !important;
            border-bottom:1px solid rgba(255,255,255,.14) !important;
            border-radius:12px !important;
            background-color:rgba(255,255,255,.055) !important;
            background-image:none !important;
            box-shadow:none !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel .panel-search {
            border:1px solid rgba(255,255,255,.30) !important;
            border-radius:12px !important;
            background-color:var(--dcuf-glass-input) !important;
            background-image:linear-gradient(180deg,rgba(255,255,255,.14),transparent 72%) !important;
            color:var(--dcuf-theme-fg-muted) !important;
            box-shadow:inset 0 2px 5px rgba(18,29,50,.10),inset 0 1px 0 rgba(255,255,255,.24) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel .panel-search-input {
            border:0 !important;
            background-color:transparent !important;
            background-image:none !important;
            color:var(--dcuf-theme-fg) !important;
            box-shadow:none !important;
            -webkit-backdrop-filter:none !important;
            backdrop-filter:none !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel .blocked-list-empty {
            border:0 !important;
            background:transparent !important;
            box-shadow:none !important;
            -webkit-backdrop-filter:none !important;
            backdrop-filter:none !important;
        }

        /* Inputs and secondary controls remain translucent and visually quiet. */
        html[${ROOT_ATTRIBUTE}] body :is(
            #dcinside-filter-setting,
            #dcinside-shortcut-modal,
            #dcinside-headtext-manager-panel,
            #dc-personal-block-size-panel,
            #dc-manual-block-panel,
            #dc-selection-popup,
            #dc-block-management-panel,
            #dc-backup-popup
        ) :is(input:not([type="checkbox"]):not([type="radio"]),textarea,select) {
            border:1px solid rgba(255,255,255,.30) !important;
            border-radius:12px !important;
            background-color:var(--dcuf-glass-input) !important;
            background-image:linear-gradient(180deg,rgba(255,255,255,.14),transparent 72%) !important;
            color:var(--dcuf-theme-fg) !important;
            box-shadow:inset 0 2px 5px rgba(18,29,50,.10),inset 0 1px 0 rgba(255,255,255,.24) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel .panel-search > input.panel-search-input {
            border:0 !important;
            background-color:transparent !important;
            background-image:none !important;
            box-shadow:none !important;
            -webkit-backdrop-filter:none !important;
            backdrop-filter:none !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            #dcinside-filter-setting,
            #dcinside-shortcut-modal,
            #dcinside-headtext-manager-panel,
            #dc-personal-block-size-panel,
            #dc-manual-block-panel,
            #dc-selection-popup,
            #dc-block-management-panel,
            #dc-backup-popup
        ) :is(button,a,[role="button"]) {
            border-radius:12px !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            #dcinside-filter-setting button,
            #dcinside-shortcut-modal button,
            #dcinside-headtext-manager-panel button,
            #dc-personal-block-size-panel button,
            #dc-manual-block-panel button,
            #dc-selection-popup button,
            #dc-block-management-panel button,
            #dc-backup-popup button
        ):not(
            #dcinside-threshold-save,
            #dcinside-save-shortcut-btn,
            .panel-save-btn,
            .export-btn,
            .import-btn,
            [data-manual-block-action="add"]
        ) {
            border:1px solid rgba(255,255,255,.30) !important;
            background-color:var(--dcuf-glass-control) !important;
            background-image:linear-gradient(180deg,rgba(255,255,255,.16),transparent 76%) !important;
            color:var(--dcuf-theme-fg) !important;
            box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 6px 16px rgba(24,38,70,.07) !important;
        }

        /* Primary actions are coloured glass, not solid palette blocks. */
        html[${ROOT_ATTRIBUTE}] body :is(
            #dcinside-filter-setting #dcinside-threshold-save,
            #dcinside-filter-setting #dcinside-proxy-ip-block-mode-group button[data-proxy-mode][aria-pressed="true"],
            #dcinside-shortcut-modal #dcinside-save-shortcut-btn,
            #dc-personal-block-size-panel [data-dcuf-fab-size-action="save"],
            #dc-selection-popup .block-option button:not(.btn-unblock),
            #dc-block-management-panel .panel-save-btn,
            #dc-backup-popup .export-btn,
            #dc-backup-popup .import-btn,
            #dc-manual-block-panel .dcuf-manual-actions [data-manual-block-action="add"]
        ) {
            border:1px solid color-mix(in srgb,var(--dcuf-theme-accent) 42%,rgba(255,255,255,.42)) !important;
            background-color:var(--dcuf-glass-control-active) !important;
            background-image:
                radial-gradient(circle at 22% 0%,rgba(255,255,255,.40),transparent 42%),
                linear-gradient(145deg,var(--dcuf-glass-control-active-top),var(--dcuf-glass-control-active)) !important;
            color:var(--dcuf-glass-on-active) !important;
            box-shadow:0 11px 26px var(--dcuf-glass-accent-shadow),inset 0 1px 0 rgba(255,255,255,.42) !important;
            text-shadow:0 1px 1px rgba(0,0,0,.12) !important;
        }

        /* Switches have translucent tracks and a dimensional white thumb. */
        html[${ROOT_ATTRIBUTE}] body :is(#dc-block-management-panel,#dcinside-filter-setting) .switch-slider {
            border:1px solid rgba(255,255,255,.26) !important;
            background-color:rgba(90,109,143,.24) !important;
            background-image:linear-gradient(180deg,rgba(255,255,255,.14),transparent 74%) !important;
            box-shadow:inset 0 2px 5px rgba(19,29,49,.18),inset 0 1px 0 rgba(255,255,255,.18) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(#dc-block-management-panel,#dcinside-filter-setting) input:checked + .switch-slider {
            border-color:color-mix(in srgb,var(--dcuf-theme-accent) 42%,rgba(255,255,255,.32)) !important;
            background-color:var(--dcuf-glass-control-active) !important;
            background-image:linear-gradient(180deg,var(--dcuf-glass-control-active-top),var(--dcuf-glass-control-active)) !important;
            box-shadow:0 6px 16px var(--dcuf-glass-accent-shadow),inset 0 1px 0 rgba(255,255,255,.34) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(#dc-block-management-panel,#dcinside-filter-setting) .switch-slider::before {
            background:rgba(255,255,255,.94) !important;
            box-shadow:0 2px 7px rgba(17,29,51,.34),inset 0 1px 0 #fff !important;
        }

        /* The quick menu is compact smoky glass, deliberately distinct from content cards. */
        html[${ROOT_ATTRIBUTE}] body #dc-personal-block-fab {
            position:relative !important;
            border:1px solid rgba(255,255,255,.26) !important;
            border-radius:999px !important;
            background-color:rgba(19,33,58,.72) !important;
            background-image:
                radial-gradient(circle at 18% 0%,rgba(255,255,255,.22),transparent 40%),
                linear-gradient(145deg,rgba(92,112,158,.22),transparent 70%) !important;
            color:#f5f8ff !important;
            text-shadow:0 1px 2px rgba(0,0,0,.34) !important;
            box-shadow:0 18px 42px rgba(24,38,71,.28),inset 0 1px 0 rgba(255,255,255,.28) !important;
            -webkit-backdrop-filter:blur(20px) saturate(1.25) !important;
            backdrop-filter:blur(20px) saturate(1.25) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-personal-block-fab::after {
            content:"";
            position:absolute;
            inset:-6px;
            border-radius:inherit;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-personal-block-drawer {
            border:1px solid rgba(255,255,255,.20) !important;
            border-radius:20px !important;
            background-color:rgba(16,29,52,.76) !important;
            background-image:
                radial-gradient(70% 70% at 100% 0%,rgba(102,120,255,.20),transparent 70%),
                linear-gradient(145deg,rgba(255,255,255,.10),transparent 54%) !important;
            color:#f4f7ff !important;
            box-shadow:0 28px 72px rgba(16,27,53,.36),inset 0 1px 0 rgba(255,255,255,.20) !important;
            -webkit-backdrop-filter:blur(24px) saturate(1.26) !important;
            backdrop-filter:blur(24px) saturate(1.26) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-personal-block-drawer button {
            border:1px solid rgba(255,255,255,.12) !important;
            border-radius:14px !important;
            background-color:rgba(255,255,255,.065) !important;
            background-image:linear-gradient(180deg,rgba(255,255,255,.08),transparent 76%) !important;
            color:#f4f7ff !important;
            box-shadow:inset 0 1px 0 rgba(255,255,255,.12) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-personal-block-drawer button :is(strong,small,span) {
            color:inherit !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-personal-block-drawer button:is(:hover,:focus-visible) {
            border-color:rgba(255,255,255,.24) !important;
            background-color:rgba(255,255,255,.12) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-personal-block-drawer .dcuf-menu-icon {
            border:1px solid rgba(255,255,255,.20) !important;
            background-color:color-mix(in srgb,var(--dcuf-theme-accent) 22%,rgba(255,255,255,.08)) !important;
            background-image:linear-gradient(145deg,rgba(255,255,255,.18),transparent 64%) !important;
            color:#fff !important;
            box-shadow:0 7px 18px var(--dcuf-glass-accent-shadow),inset 0 1px 0 rgba(255,255,255,.24) !important;
        }

        html[${ROOT_ATTRIBUTE}] body :is(
            #dc-selection-popup .btn-unblock,
            #dc-block-management-panel .delete-item-btn,
            #dc-manual-block-panel [data-manual-block-action="remove"]
        ) {
            border-color:rgba(226,95,113,.34) !important;
            background-color:rgba(190,48,69,.14) !important;
            background-image:linear-gradient(180deg,rgba(255,255,255,.12),transparent 72%) !important;
            color:#b42335 !important;
            box-shadow:inset 0 1px 0 rgba(255,255,255,.18) !important;
        }
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode :is(
            #dc-selection-popup .btn-unblock,
            #dc-block-management-panel .delete-item-btn,
            #dc-manual-block-panel [data-manual-block-action="remove"]
        ) {
            color:#ff9dac !important;
        }

        /*
         * Direct-block material is the canonical DCUF dialog material.
         * The settings window carries more content, so its panes are even quieter instead
         * of becoming an opaque white card. Primary actions and switches use the same
         * translucent colour, rim light, and recessed depth as the direct-block action.
         */
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting {
            background-color: color-mix(in srgb,var(--dcuf-glass-panel) 76%,transparent) !important;
            background-image:
                radial-gradient(ellipse 68% 44% at 100% 0%,color-mix(in srgb,var(--dcuf-theme-accent-soft) 42%,transparent),transparent 70%),
                radial-gradient(ellipse 54% 40% at 0% 100%,color-mix(in srgb,var(--dcuf-theme-accent) 9%,transparent),transparent 72%),
                linear-gradient(145deg,color-mix(in srgb,var(--dcuf-glass-rim) 72%,transparent),transparent 48%) !important;
            box-shadow: 0 34px 92px rgba(25,38,70,.25),0 9px 28px rgba(31,49,87,.12),
                inset 0 1px 0 var(--dcuf-glass-rim),inset 0 -1px 0 rgba(255,255,255,.18) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting :is(
            .dcuf-settings-header,.dcuf-settings-footer
        ) {
            background-color: rgba(255,255,255,.045) !important;
            background-image: linear-gradient(180deg,rgba(255,255,255,.12),transparent 78%) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting :is(
            .dcuf-settings-section,
            .dcuf-settings-threshold > div:last-child,
            .dcuf-settings-guest-controls
        ) {
            border-color: rgba(255,255,255,.20) !important;
            background-color: rgba(255,255,255,.042) !important;
            background-image: linear-gradient(145deg,rgba(255,255,255,.075),transparent 54%) !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,.15),0 8px 20px rgba(27,43,75,.045) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting #dcinside-proxy-ip-block-mode-group {
            border-color: rgba(255,255,255,.24) !important;
            background-color: rgba(255,255,255,.065) !important;
            box-shadow: inset 0 2px 5px rgba(17,29,50,.12),inset 0 1px 0 rgba(255,255,255,.18) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            #dcinside-filter-setting #dcinside-threshold-save,
            #dcinside-filter-setting #dcinside-proxy-ip-block-mode-group button[data-proxy-mode][aria-pressed="true"],
            #dcinside-shortcut-modal #dcinside-save-shortcut-btn,
            #dc-personal-block-size-panel [data-dcuf-fab-size-action="save"],
            #dc-selection-popup .block-option button:not(.btn-unblock),
            #dc-block-management-panel .panel-save-btn,
            #dc-backup-popup .export-btn,
            #dc-backup-popup .import-btn,
            #dc-manual-block-panel .dcuf-manual-actions [data-manual-block-action="add"]
        ) {
            background-color: color-mix(in srgb,var(--dcuf-glass-control-active) 88%,transparent) !important;
            background-image:
                radial-gradient(circle at 18% -8%,rgba(255,255,255,.58),transparent 44%),
                linear-gradient(145deg,var(--dcuf-glass-control-active-top),color-mix(in srgb,var(--dcuf-glass-control-active) 88%,transparent)) !important;
            box-shadow: 0 14px 32px var(--dcuf-glass-accent-shadow),inset 0 1px 0 rgba(255,255,255,.52),inset 0 -1px 0 rgba(0,0,0,.16) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(#dc-block-management-panel,#dcinside-filter-setting) .switch-slider {
            border-color: rgba(255,255,255,.30) !important;
            background-color: rgba(82,101,135,.21) !important;
            background-image:
                radial-gradient(circle at 28% 0%,rgba(255,255,255,.30),transparent 42%),
                linear-gradient(180deg,rgba(255,255,255,.10),rgba(36,50,76,.08)) !important;
            box-shadow: inset 0 2px 5px rgba(15,26,47,.22),0 3px 9px rgba(27,43,74,.10),inset 0 1px 0 rgba(255,255,255,.24) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(#dc-block-management-panel,#dcinside-filter-setting) input:checked + .switch-slider {
            border-color: color-mix(in srgb,var(--dcuf-theme-accent) 44%,rgba(255,255,255,.34)) !important;
            background-color: color-mix(in srgb,var(--dcuf-glass-control-active) 86%,transparent) !important;
            background-image:
                radial-gradient(circle at 24% -6%,rgba(255,255,255,.48),transparent 44%),
                linear-gradient(145deg,var(--dcuf-glass-control-active-top),color-mix(in srgb,var(--dcuf-glass-control-active) 86%,transparent)) !important;
            box-shadow: 0 7px 18px var(--dcuf-glass-accent-shadow),inset 0 1px 0 rgba(255,255,255,.38),inset 0 -1px 0 rgba(0,0,0,.15) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(#dc-block-management-panel,#dcinside-filter-setting) .switch-slider::before {
            border: 1px solid rgba(255,255,255,.76) !important;
            background:
                radial-gradient(circle at 34% 22%,#fff 0 14%,rgba(255,255,255,.90) 42%,rgba(229,235,245,.94) 100%) !important;
            box-shadow: 0 3px 8px rgba(15,27,49,.32),inset 0 1px 0 #fff !important;
        }

        /* The light quick menu now belongs to the same frosted family instead of a black HUD. */
        html[${ROOT_ATTRIBUTE}] body:not(.dc-filter-dark-mode) #dc-personal-block-fab {
            border-color: color-mix(in srgb,var(--dcuf-theme-accent) 34%,rgba(255,255,255,.68)) !important;
            background-color: color-mix(in srgb,var(--dcuf-glass-panel) 82%,var(--dcuf-theme-accent-soft)) !important;
            background-image:
                radial-gradient(circle at 22% -8%,rgba(255,255,255,.68),transparent 42%),
                linear-gradient(145deg,color-mix(in srgb,var(--dcuf-glass-panel-strong) 72%,var(--dcuf-theme-accent-soft)),rgba(255,255,255,.08)) !important;
            color: var(--dcuf-theme-accent-strong) !important;
            text-shadow: 0 1px 0 rgba(255,255,255,.78) !important;
            box-shadow: 0 19px 46px rgba(27,47,88,.21),0 7px 18px var(--dcuf-glass-accent-shadow),inset 0 1px 0 var(--dcuf-glass-rim) !important;
        }
        html[${ROOT_ATTRIBUTE}] body:not(.dc-filter-dark-mode) #dc-personal-block-drawer {
            border-color: rgba(255,255,255,.58) !important;
            background-color: color-mix(in srgb,var(--dcuf-glass-panel) 90%,var(--dcuf-theme-accent-soft)) !important;
            background-image:
                radial-gradient(70% 70% at 100% 0%,color-mix(in srgb,var(--dcuf-theme-accent-soft) 46%,transparent),transparent 70%),
                linear-gradient(145deg,rgba(255,255,255,.32),transparent 54%) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: 0 28px 72px rgba(24,40,78,.25),inset 0 1px 0 var(--dcuf-glass-rim) !important;
        }
        html[${ROOT_ATTRIBUTE}] body:not(.dc-filter-dark-mode) #dc-personal-block-drawer button {
            border-color: rgba(255,255,255,.38) !important;
            background-color: rgba(255,255,255,.105) !important;
            background-image: linear-gradient(180deg,rgba(255,255,255,.18),transparent 76%) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,.30),0 7px 18px rgba(31,48,84,.055) !important;
        }
        html[${ROOT_ATTRIBUTE}] body:not(.dc-filter-dark-mode) #dc-personal-block-drawer button :is(strong,small,span) {
            color: inherit !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-selection-popup.dcuf-selection-prompt {
            border: 1px solid var(--dcuf-glass-border) !important;
            border-top-color: var(--dcuf-glass-rim) !important;
            background-color: color-mix(in srgb,var(--dcuf-glass-panel) 84%,transparent) !important;
            background-image:
                radial-gradient(ellipse 48% 140% at 0% 0%,color-mix(in srgb,var(--dcuf-theme-accent-soft) 34%,transparent),transparent 72%),
                linear-gradient(145deg,rgba(255,255,255,.20),transparent 50%) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: 0 24px 64px rgba(25,39,72,.24),0 7px 20px rgba(29,47,84,.10),
                inset 0 1px 0 var(--dcuf-glass-rim) !important;
            -webkit-backdrop-filter: blur(24px) saturate(1.24) !important;
            backdrop-filter: blur(24px) saturate(1.24) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-selection-popup.dcuf-selection-prompt .dcuf-selection-prompt-icon {
            border: 1px solid color-mix(in srgb,var(--dcuf-theme-accent) 30%,rgba(255,255,255,.54)) !important;
            background-color: color-mix(in srgb,var(--dcuf-glass-control) 76%,var(--dcuf-theme-accent-soft)) !important;
            background-image:
                radial-gradient(circle at 28% 12%,rgba(255,255,255,.60),transparent 40%),
                linear-gradient(145deg,rgba(255,255,255,.14),transparent 68%) !important;
            color: var(--dcuf-theme-accent-strong) !important;
            box-shadow: 0 8px 18px var(--dcuf-glass-accent-shadow),inset 0 1px 0 rgba(255,255,255,.42) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-selection-popup.dcuf-selection-prompt .dcuf-selection-prompt-copy :is(h4,p) {
            color: inherit !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-selection-popup.dcuf-selection-prompt .dcuf-selection-prompt-copy p {
            color: var(--dcuf-theme-fg-muted) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-selection-popup.dcuf-selection-prompt .popup-buttons button {
            border-color: rgba(255,255,255,.32) !important;
            background-color: var(--dcuf-glass-control) !important;
            background-image: linear-gradient(180deg,rgba(255,255,255,.16),transparent 76%) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,.28),0 7px 18px rgba(29,46,78,.065) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel :is(
            .panel-header,.panel-tabs,.panel-footer,.panel-list-controls
        ) {
            background-color: rgba(255,255,255,.045) !important;
            background-image: linear-gradient(180deg,rgba(255,255,255,.12),transparent 78%) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel .panel-body {
            background: transparent !important;
        }

        @media (max-width:520px) {
            html[${ROOT_ATTRIBUTE}] body :is(
                #dcinside-filter-setting,#dcinside-shortcut-modal,#dcinside-headtext-manager-panel,
                #dc-personal-block-size-panel,#dc-manual-block-panel,#dc-selection-popup,
                #dc-block-management-panel,#dc-backup-popup
            ) {
                border-radius:21px !important;
            }
            html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting {
                width:calc(100vw - 24px) !important;
                max-width:calc(100vw - 24px) !important;
                padding:14px !important;
            }
        }
        @media (prefers-reduced-transparency:reduce) {
            html[${ROOT_ATTRIBUTE}] body :is(
                #dcinside-filter-setting,#dcinside-shortcut-modal,#dcinside-headtext-manager-panel,
                #dc-personal-block-size-panel,#dc-personal-block-drawer,#dc-manual-block-panel,
                #dc-selection-popup,#dc-block-management-panel,#dc-backup-popup
            ) {
                background-color:var(--dcuf-glass-panel-solid) !important;
                -webkit-backdrop-filter:none !important;
                backdrop-filter:none !important;
            }
        }

        /* Shared DCUF surfaces: direct-block material with fewer nested boxes. */
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body :is(
            #dcinside-filter-setting,#dcinside-shortcut-modal,#dcinside-headtext-manager-panel,
            #dc-personal-block-size-panel,#dc-manual-block-panel,#dc-selection-popup,
            #dc-block-management-panel,#dc-backup-popup
        ) {
            border-radius: var(--dcuf-radius-panel) !important;
            background-color: var(--dcuf-glass-panel) !important;
            background-image: linear-gradient(145deg,var(--dcuf-glass-highlight),transparent 46%) !important;
            box-shadow: var(--dcuf-glass-popup-shadow),inset 0 1px 0 var(--dcuf-glass-rim) !important;
            -webkit-backdrop-filter: blur(var(--dcuf-glass-blur)) saturate(1.12) !important;
            backdrop-filter: blur(var(--dcuf-glass-blur)) saturate(1.12) !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body :is(
            #dcinside-threshold-save,#dcinside-save-shortcut-btn,
            #dc-personal-block-size-panel [data-dcuf-fab-size-action="save"],
            #dc-selection-popup .block-option button:not(.btn-unblock),
            #dc-block-management-panel .panel-save-btn,
            #dc-backup-popup .export-btn,#dc-backup-popup .import-btn,
            #dc-manual-block-panel [data-manual-block-action="add"]
        ) {
            border-color: color-mix(in srgb,var(--dcuf-theme-accent) 26%,var(--dcuf-glass-border)) !important;
            background-color: color-mix(in srgb,var(--dcuf-theme-accent) 17%,var(--dcuf-glass-control)) !important;
            background-image: linear-gradient(180deg,var(--dcuf-glass-control-active-top),transparent 86%) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: 0 7px 18px var(--dcuf-glass-accent-shadow),inset 0 1px 0 var(--dcuf-glass-rim) !important;
            text-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body :is(
            #dc-block-management-panel,#dcinside-filter-setting
        ) .switch-slider {
            border-color: var(--dcuf-glass-border) !important;
            background-color: color-mix(in srgb,var(--dcuf-theme-fg-muted) 18%,var(--dcuf-glass-control)) !important;
            background-image: linear-gradient(180deg,var(--dcuf-glass-highlight),transparent 82%) !important;
            box-shadow: inset 0 1px 3px rgba(25,38,64,.14),inset 0 1px 0 var(--dcuf-glass-rim) !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body :is(
            #dc-block-management-panel,#dcinside-filter-setting
        ) input:checked + .switch-slider {
            border-color: color-mix(in srgb,var(--dcuf-theme-accent) 30%,var(--dcuf-glass-border)) !important;
            background-color: color-mix(in srgb,var(--dcuf-theme-accent) 24%,var(--dcuf-glass-control)) !important;
            box-shadow: 0 5px 13px var(--dcuf-glass-accent-shadow),inset 0 1px 0 var(--dcuf-glass-rim) !important;
        }
        html[${ROOT_ATTRIBUTE}] body :is(
            #dc-block-management-panel,#dcinside-filter-setting
        ) .switch-slider::before {
            border: 1px solid rgba(255,255,255,.82) !important;
            background: color-mix(in srgb,var(--dcuf-glass-paper) 92%,white) !important;
            box-shadow: 0 2px 7px rgba(23,35,58,.22),inset 0 1px 0 white !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #dc-personal-block-fab {
            border-color: color-mix(in srgb,var(--dcuf-theme-accent) 24%,var(--dcuf-glass-border)) !important;
            background-color: color-mix(in srgb,var(--dcuf-theme-accent) 10%,var(--dcuf-glass-panel)) !important;
            background-image: linear-gradient(180deg,var(--dcuf-glass-highlight),transparent 82%) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: 0 10px 26px rgba(30,46,78,.12),inset 0 1px 0 var(--dcuf-glass-rim) !important;
            -webkit-backdrop-filter: blur(14px) saturate(1.10) !important;
            backdrop-filter: blur(14px) saturate(1.10) !important;
            text-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #dc-personal-block-drawer {
            border-color: var(--dcuf-glass-border) !important;
            background-color: var(--dcuf-glass-panel) !important;
            background-image: linear-gradient(145deg,var(--dcuf-glass-highlight),transparent 52%) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: var(--dcuf-glass-popup-shadow),inset 0 1px 0 var(--dcuf-glass-rim) !important;
            -webkit-backdrop-filter: blur(var(--dcuf-glass-blur)) saturate(1.10) !important;
            backdrop-filter: blur(var(--dcuf-glass-blur)) saturate(1.10) !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #dc-personal-block-drawer button {
            border-color: color-mix(in srgb,var(--dcuf-glass-border-strong) 48%,transparent) !important;
            background-color: rgba(255,255,255,.08) !important;
            background-image: none !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: inset 0 1px 0 var(--dcuf-glass-rim) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-personal-block-drawer button:is(:hover,:focus-visible) {
            background-color: color-mix(in srgb,var(--dcuf-theme-accent) 8%,var(--dcuf-glass-control)) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-personal-block-drawer :is(strong,small,span) {
            color: inherit !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-personal-block-drawer small {
            opacity: .68 !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #dcinside-filter-setting :is(
            .dcuf-settings-section,.dcuf-settings-threshold > div:last-child,.dcuf-settings-guest-controls
        ) {
            border-color: color-mix(in srgb,var(--dcuf-theme-border-strong) 54%,transparent) !important;
            background-color: rgba(255,255,255,.055) !important;
            background-image: none !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #dc-block-management-panel :is(
            .panel-header,.panel-tabs,.panel-list-controls,.panel-footer
        ) {
            border-color: color-mix(in srgb,var(--dcuf-theme-border-strong) 50%,transparent) !important;
            background-color: transparent !important;
            background-image: none !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel .panel-header-actions :is(.panel-add-btn,.panel-close-btn) {
            border-color: transparent !important;
            background: transparent !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel .panel-header-actions :is(.panel-add-btn,.panel-close-btn):is(:hover,:focus-visible) {
            border-color: var(--dcuf-glass-border) !important;
            background-color: var(--dcuf-glass-control) !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #dc-block-management-panel .panel-tabs {
            margin: 0 10px !important;
            padding: 3px !important;
            border: 1px solid var(--dcuf-glass-border) !important;
            border-radius: 12px !important;
            background-color: rgba(255,255,255,.08) !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #dc-block-management-panel .panel-tab {
            border: 0 !important;
            background: transparent !important;
            color: var(--dcuf-theme-fg-muted) !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #dc-block-management-panel .panel-tab.active {
            border: 0 !important;
            background-color: var(--dcuf-glass-control-active) !important;
            background-image: linear-gradient(180deg,var(--dcuf-glass-control-active-top),transparent 88%) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: inset 0 1px 0 var(--dcuf-glass-rim),0 4px 12px var(--dcuf-glass-accent-shadow) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel .panel-body {
            background: transparent !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #dc-block-management-panel .panel-list-controls {
            grid-template-columns: minmax(0,1fr) auto !important;
            margin: 0 !important;
            padding: 10px !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel .panel-search {
            border-color: var(--dcuf-glass-border) !important;
            background-color: var(--dcuf-glass-input) !important;
            background-image: none !important;
            box-shadow: inset 0 2px 5px rgba(25,38,64,.08),inset 0 1px 0 var(--dcuf-glass-rim) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel .panel-search-input {
            color: var(--dcuf-theme-fg) !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #dc-block-management-panel .blocked-list {
            display: block !important;
            padding: 0 10px !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #dc-block-management-panel .blocked-item {
            margin: 0 !important;
            border: 0 !important;
            border-bottom: 1px solid color-mix(in srgb,var(--dcuf-theme-border-strong) 52%,transparent) !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel .blocked-item:last-child {
            border-bottom: 0 !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel .delete-item-btn {
            border-color: color-mix(in srgb,#d7485a 18%,var(--dcuf-glass-border)) !important;
            background-color: color-mix(in srgb,#d7485a 7%,var(--dcuf-glass-control)) !important;
            background-image: none !important;
            color: color-mix(in srgb,#d7485a 72%,var(--dcuf-theme-fg)) !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #dc-block-management-panel .panel-save-btn {
            background-color: color-mix(in srgb,var(--dcuf-theme-accent) 17%,var(--dcuf-glass-control)) !important;
            background-image: linear-gradient(180deg,var(--dcuf-glass-control-active-top),transparent 86%) !important;
            color: var(--dcuf-theme-fg) !important;
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
            background:
                radial-gradient(58% 46% at 12% 8%, rgba(93,105,255,.18), transparent 68%),
                radial-gradient(52% 44% at 94% 92%, rgba(43,191,221,.14), transparent 70%),
                rgba(8,16,31,.24) !important;
            -webkit-backdrop-filter: blur(12px) saturate(1.15);
            backdrop-filter: blur(12px) saturate(1.15);
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
            border: 1px solid var(--dcuf-glass-border) !important;
            border-top-color: var(--dcuf-glass-rim) !important;
            border-radius: 24px !important;
            background-color: var(--dcuf-glass-panel) !important;
            background-image: linear-gradient(145deg, rgba(255,255,255,.18), transparent 42%) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: var(--dcuf-glass-popup-shadow), inset 0 1px 0 var(--dcuf-glass-rim) !important;
            -webkit-backdrop-filter: blur(var(--dcuf-glass-blur)) saturate(1.28) brightness(1.03) !important;
            backdrop-filter: blur(var(--dcuf-glass-blur)) saturate(1.28) brightness(1.03) !important;
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
            border-bottom: 1px solid rgba(255,255,255,.24) !important;
            background-color: rgba(255,255,255,.08) !important;
            background-image: linear-gradient(180deg, rgba(255,255,255,.14), transparent 76%) !important;
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
            border: 1px solid rgba(255,255,255,.28) !important;
            border-radius: 14px !important;
            background-color: rgba(255,255,255,.075) !important;
            background-image: linear-gradient(145deg, rgba(255,255,255,.10), transparent 58%) !important;
            color: var(--dcuf-theme-fg) !important;
            text-align: left !important;
            cursor: pointer !important;
        }
        #${PANEL_ID} .dcuf-palette-option[aria-checked="true"] {
            border-color: color-mix(in srgb,var(--dcuf-theme-accent) 34%,rgba(255,255,255,.32)) !important;
            background-color: color-mix(in srgb,var(--dcuf-theme-accent-soft) 14%,rgba(255,255,255,.12)) !important;
            background-image: linear-gradient(145deg, rgba(255,255,255,.15), transparent 62%) !important;
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
            border: 1px solid rgba(255,255,255,.30) !important;
            border-radius: 12px !important;
            background-color: var(--dcuf-glass-control) !important;
            background-image: linear-gradient(180deg,rgba(255,255,255,.16),transparent 76%) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,.25),0 6px 16px rgba(24,38,70,.07) !important;
            font-weight: 800 !important;
            cursor: pointer !important;
        }
        #${PANEL_ID} .dcuf-palette-actions [data-dcuf-palette-action="save"] {
            border-color: color-mix(in srgb,var(--dcuf-theme-accent) 42%,rgba(255,255,255,.42)) !important;
            background-color: var(--dcuf-glass-control-active) !important;
            background-image:
                radial-gradient(circle at 22% 0%,rgba(255,255,255,.40),transparent 42%),
                linear-gradient(145deg,var(--dcuf-glass-control-active-top),var(--dcuf-glass-control-active)) !important;
            color: var(--dcuf-glass-on-active) !important;
            box-shadow: 0 11px 26px var(--dcuf-glass-accent-shadow),inset 0 1px 0 rgba(255,255,255,.42) !important;
            text-shadow: 0 1px 1px rgba(0,0,0,.12) !important;
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
            background-color: var(--dcuf-glass-panel) !important;
            background-image: linear-gradient(145deg, var(--dcuf-glass-highlight), transparent 48%) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: var(--dcuf-theme-panel-shadow) !important;
        }
        body.dc-filter-dark-mode #${PANEL_ID} .dcuf-palette-header { border-color: var(--dcuf-theme-border) !important; background-color: var(--dcuf-glass-panel-strong) !important; background-image: linear-gradient(180deg, var(--dcuf-glass-highlight), transparent 72%) !important; }
        body.dc-filter-dark-mode #${PANEL_ID} .dcuf-palette-description { color: var(--dcuf-theme-fg-muted) !important; }
        body.dc-filter-dark-mode #${PANEL_ID} .dcuf-palette-close { color: var(--dcuf-theme-fg) !important; }
        body.dc-filter-dark-mode #${PANEL_ID} .dcuf-palette-option { border-color: var(--dcuf-theme-border) !important; background-color: var(--dcuf-glass-control) !important; background-image: linear-gradient(145deg, var(--dcuf-glass-highlight), transparent 62%) !important; color: var(--dcuf-theme-fg) !important; }
        body.dc-filter-dark-mode #${PANEL_ID} .dcuf-palette-option[aria-checked="true"] { border-color: var(--dcuf-theme-accent) !important; background-color: color-mix(in srgb, var(--dcuf-theme-accent-soft) 72%, var(--dcuf-glass-control)) !important; background-image: linear-gradient(145deg, var(--dcuf-glass-highlight), transparent 62%) !important; color: var(--dcuf-theme-accent) !important; }
        body.dc-filter-dark-mode #${PANEL_ID} .dcuf-palette-actions button { border-color: rgba(222,234,255,.15) !important; background-color: var(--dcuf-glass-control) !important; background-image: linear-gradient(180deg,rgba(151,170,214,.13),rgba(151,170,214,.06)) !important; color: var(--dcuf-theme-fg) !important; }
        body.dc-filter-dark-mode #${PANEL_ID} .dcuf-palette-actions [data-dcuf-palette-action="save"] { border-color: color-mix(in srgb,var(--dcuf-theme-accent) 42%,rgba(255,255,255,.22)) !important; background-color: var(--dcuf-glass-control-active) !important; background-image: radial-gradient(circle at 22% 0%,rgba(255,255,255,.24),transparent 42%),linear-gradient(145deg,var(--dcuf-glass-control-active-top),var(--dcuf-glass-control-active)) !important; color: var(--dcuf-glass-on-active) !important; }

        /*
         * The bottom navigation is one material shell. Palette rules above paint
         * interactive descendants, but these three direct children are layout
         * rails and must not become nested cards again.
         */
        html[${ROOT_ATTRIBUTE}] body #container .custom-bottom-controls > :is(
            .dcuf-bottom-action-card,
            .dcuf-pagination-card,
            .dcuf-search-card
        ) {
            border: 0 !important;
            border-radius: 0 !important;
            background-color: transparent !important;
            background-image: none !important;
            box-shadow: none !important;
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
        }

        /*
         * Final shared host-header owner for list, view, and write routes.
         * The host keeps header/nav/recent as siblings, so a pointer-transparent
         * pseudo-element on the header supplies their common outer material.
         */
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .dcheader.typea {
            box-sizing: border-box !important;
            position: relative !important;
            z-index: auto !important;
            width: calc(100% - 16px) !important;
            max-width: none !important;
            margin: 0 8px !important;
            border: 0 !important;
            border-radius: 20px !important;
            background: transparent !important;
            box-shadow: none !important;
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
            overflow: visible !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .dcheader.typea::before {
            content: "" !important;
            box-sizing: border-box !important;
            display: block !important;
            position: absolute !important;
            inset: 0 0 auto 0 !important;
            z-index: 0 !important;
            width: 100% !important;
            height: calc(100% + 136px) !important;
            border: 1px solid var(--dcuf-glass-border,rgba(255,255,255,.58)) !important;
            border-radius: 22px !important;
            background-color: var(--dcuf-glass-panel,rgba(232,239,249,.68)) !important;
            background-image:
                radial-gradient(ellipse 54% 78% at 8% -12%,color-mix(in srgb,var(--dcuf-theme-accent-soft,#e9efff) 36%,transparent),transparent 70%),
                linear-gradient(145deg,var(--dcuf-glass-highlight,rgba(255,255,255,.34)),transparent 48%) !important;
            box-shadow:
                0 20px 48px rgba(32,48,82,.11),
                0 4px 14px rgba(32,48,82,.06),
                inset 0 1px 0 var(--dcuf-glass-rim,rgba(255,255,255,.76)) !important;
            -webkit-backdrop-filter: blur(18px) saturate(1.16) !important;
            backdrop-filter: blur(18px) saturate(1.16) !important;
            pointer-events: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .dcheader.typea .dchead {
            position: relative !important;
            z-index: 3 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
            overflow: visible !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .dcheader.typea .wrap_search,
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .dcheader.typea .wrap_search form {
            z-index: 2147483646 !important;
            overflow: visible !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .gnb_bar {
            box-sizing: border-box !important;
            position: relative !important;
            z-index: auto !important;
            width: calc(100% - 32px) !important;
            max-width: none !important;
            min-height: 46px !important;
            margin: 8px 16px 0 !important;
            border: 1px solid var(--dcuf-glass-border,rgba(255,255,255,.58)) !important;
            border-radius: 15px !important;
            background-color: var(--dcuf-glass-control,rgba(255,255,255,.18)) !important;
            background-image: linear-gradient(180deg,var(--dcuf-glass-highlight,rgba(255,255,255,.24)),transparent 76%) !important;
            box-shadow: 0 7px 18px rgba(32,48,82,.065),inset 0 1px 0 var(--dcuf-glass-rim,rgba(255,255,255,.70)) !important;
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #visit_history {
            box-sizing: border-box !important;
            position: relative !important;
            z-index: auto !important;
            width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            pointer-events: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #visit_history.visit_bookmark > .newvisit_history.vst {
            box-sizing: border-box !important;
            width: calc(100% - 32px) !important;
            max-width: none !important;
            min-width: 0 !important;
            min-height: 54px !important;
            height: 54px !important;
            margin: 0 16px !important;
            padding: 8px 10px !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
            transition: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #visit_history > .newvisit_history.vst > :is(.vst_title,.bookmark_title) {
            box-sizing: border-box !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex: 0 0 auto !important;
            min-height: 32px !important;
            margin: 0 !important;
            padding: 0 11px !important;
            border: 1px solid color-mix(in srgb,var(--dcuf-theme-accent,#3f6de0) 24%,var(--dcuf-glass-border,rgba(255,255,255,.58))) !important;
            border-radius: 999px !important;
            background-color: color-mix(in srgb,var(--dcuf-theme-accent-soft,#e9efff) 48%,transparent) !important;
            color: var(--dcuf-theme-accent,#3f6de0) !important;
            font-weight: 800 !important;
            line-height: 1 !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #visit_history > .newvisit_history.vst > .bookmark_title[hidden] {
            display: none !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #visit_history > .newvisit_history.vst > .btn_open {
            box-sizing: border-box !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex: 0 0 32px !important;
            width: 32px !important;
            min-width: 32px !important;
            height: 32px !important;
            min-height: 32px !important;
            margin: 0 2px !important;
            padding: 0 !important;
            border: 1px solid var(--dcuf-glass-border,rgba(255,255,255,.58)) !important;
            border-radius: 50% !important;
            background-color: var(--dcuf-glass-control,rgba(255,255,255,.18)) !important;
            box-shadow: inset 0 1px 0 var(--dcuf-glass-rim,rgba(255,255,255,.70)) !important;
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #visit_history > .newvisit_history.vst > .btn_open > .sp_img.icon_listmore {
            box-sizing: border-box !important;
            display: block !important;
            flex: 0 0 15px !important;
            width: 15px !important;
            min-width: 15px !important;
            height: 15px !important;
            min-height: 15px !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
        }
        @media screen and (min-width: 1024px) {
            html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .dcheader.typea {
                width: min(1480px,calc(100% - 48px)) !important;
                max-width: 1480px !important;
                margin-right: auto !important;
                margin-left: auto !important;
            }
            html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .dcheader.typea::before {
                height: 198px !important;
                border-radius: 24px !important;
            }
            html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .gnb_bar,
            html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #visit_history.visit_bookmark > .newvisit_history.vst {
                width: min(1432px,calc(100% - 96px)) !important;
                max-width: 1432px !important;
                margin-right: auto !important;
                margin-left: auto !important;
            }
            html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body #visit_history.visit_bookmark > .newvisit_history.vst {
                min-height: 44px !important;
                height: 44px !important;
                padding: 6px 10px !important;
            }
        }
        @media screen and (max-width: 600px) {
            html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.is-write-page .dcheader.typea::before {
                height: 100% !important;
            }
        }
        html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body.dcuf-write-desktop-site-mobile .dcheader.typea::before {
            height: 100% !important;
        }
        @media (prefers-reduced-transparency: reduce) {
            html[${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}][${ROOT_ATTRIBUTE}] body .dcheader.typea::before {
                background-color: var(--dcuf-glass-panel-solid,var(--dcuf-theme-card-top,#fff)) !important;
                -webkit-backdrop-filter: none !important;
                backdrop-filter: none !important;
            }
        }

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
