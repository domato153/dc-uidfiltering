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
        Object.freeze({ id: 'mono', label: '모노톤', light: ['#526274', '#374151', '#eef2f7'], dark: ['#cbd5e1', '#475569', '#28323f'] })
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
        const [accent, strong, soft] = preset.light;
        const [darkAccent, darkStrong, darkSoft] = preset.dark;
        return `
            html[${ROOT_ATTRIBUTE}="${preset.id}"] {
                --dcuf-theme-accent: ${accent};
                --dcuf-theme-accent-strong: ${strong};
                --dcuf-theme-accent-soft: ${soft};
                --dcuf-theme-on-accent: #fff;
            }
            html[${ROOT_ATTRIBUTE}="${preset.id}"].dc-filter-dark-mode,
            html[${ROOT_ATTRIBUTE}="${preset.id}"] body.dc-filter-dark-mode {
                --dcuf-theme-accent: ${darkAccent};
                --dcuf-theme-accent-strong: ${darkStrong};
                --dcuf-theme-accent-soft: ${darkSoft};
                --dcuf-theme-on-accent: #fff;
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
            background: var(--dcuf-theme-accent-strong) !important;
            color: var(--dcuf-theme-on-accent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body #dc-block-management-panel input:checked + .switch-slider,
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting input:checked + .switch-slider {
            background-color: var(--dcuf-theme-accent-strong) !important;
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
        html[${ROOT_ATTRIBUTE}] body .view_content_wrap .btn_recommend_box .recom_bottom_box :is(button, a) {
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
        html[${ROOT_ATTRIBUTE}] body .gnb_bar,
        html[${ROOT_ATTRIBUTE}] body .dchead .top_search,
        html[${ROOT_ATTRIBUTE}] body .dchead .top_search .bnt_search,
        html[${ROOT_ATTRIBUTE}] body .dchead .top_search button.sp_img.bnt_search,
        html[${ROOT_ATTRIBUTE}] body .dchead .area_links .btn_login,
        html[${ROOT_ATTRIBUTE}] body .dchead .area_links .btn_top_loginout,
        html[${ROOT_ATTRIBUTE}] body .page_head :is(.gall_search, .gall_search_box, .inner_search) :is(.btn_search, .bnt_search, button[type="submit"]),
        html[${ROOT_ATTRIBUTE}] body .page_head > .fl form :is(.btn_search, .bnt_search, button[type="submit"]) {
            border-color: var(--dcuf-theme-accent-strong) !important;
            background-color: var(--dcuf-theme-accent-strong) !important;
            background-image: none !important;
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
        html[${ROOT_ATTRIBUTE}] body .issue_wrap {
            border-top-color: var(--dcuf-theme-accent) !important;
            box-shadow: inset 0 2px 0 color-mix(in srgb, var(--dcuf-theme-accent) 78%, transparent) !important;
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
        html[${ROOT_ATTRIBUTE}] body #container .view_comment.image_comment .cmt_write_box .cmt_cont_bottm > .fr > button,
        html[${ROOT_ATTRIBUTE}] body.is-write-page > #leave_confirm_box.dcuf-write-leave-confirm .write_cont > .btn_box > .btn_blue {
            border-color: var(--dcuf-theme-accent-strong) !important;
            background-color: var(--dcuf-theme-accent-strong) !important;
            background-image: linear-gradient(180deg, var(--dcuf-theme-primary-top), var(--dcuf-theme-accent-strong)) !important;
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
            -webkit-tap-highlight-color: color-mix(in srgb, var(--dcuf-theme-accent) 24%, transparent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .custom-mobile-list .custom-post-item {
            border-color: var(--dcuf-theme-border) !important;
            background-color: var(--dcuf-theme-card-top) !important;
            background-image: linear-gradient(180deg, var(--dcuf-theme-card-top) 0%, var(--dcuf-theme-card-bottom) 100%) !important;
            box-shadow: var(--dcuf-theme-card-shadow) !important;
            outline: 2px solid transparent !important;
            outline-offset: -2px !important;
            transition: transform .14s ease, filter .08s ease, border-color .08s ease, outline-color .08s ease, box-shadow .14s ease !important;
        }
        html[${ROOT_ATTRIBUTE}] body .custom-mobile-list .custom-post-item.concept {
            border-color: color-mix(in srgb, var(--dcuf-theme-accent) 18%, var(--dcuf-theme-border)) !important;
            background-color: var(--dcuf-theme-concept-surface) !important;
            background-image: linear-gradient(180deg, color-mix(in srgb, white 24%, var(--dcuf-theme-concept-surface)), var(--dcuf-theme-concept-surface)) !important;
            box-shadow: inset 3px 0 0 var(--dcuf-theme-accent), var(--dcuf-theme-card-shadow) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .custom-mobile-list .custom-post-item.notice {
            border-color: color-mix(in srgb, #7b8492 22%, var(--dcuf-theme-border)) !important;
            background-color: var(--dcuf-theme-notice-surface) !important;
            background-image: linear-gradient(180deg, color-mix(in srgb, white 24%, var(--dcuf-theme-notice-surface)), var(--dcuf-theme-notice-surface)) !important;
            box-shadow: inset 3px 0 0 #8993a1, var(--dcuf-theme-card-shadow) !important;
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
        html[${ROOT_ATTRIBUTE}] body .custom-mobile-list .post-meta .author {
            flex: 0 1 auto !important;
            align-self: flex-start !important;
            width: max-content !important;
            max-width: calc(100% - 120px) !important;
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
        html[${ROOT_ATTRIBUTE}] body.is-write-page > #leave_confirm_box.dcuf-write-leave-confirm .pop_head.bg {
            background: linear-gradient(135deg, var(--dcuf-theme-accent), var(--dcuf-theme-accent-strong)) !important;
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
        html[${ROOT_ATTRIBUTE}] body #dcinside-filter-setting input:checked + .switch-slider,
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
            width: min(520px, calc(100vw - 32px)) !important;
            max-height: calc(100dvh - 32px) !important;
            overflow: hidden auto !important;
            padding: 0 !important;
            border: 1px solid var(--dcuf-theme-border-strong) !important;
            border-radius: 20px !important;
            background: var(--dcuf-theme-card-top) !important;
            color: var(--dcuf-theme-fg) !important;
            box-shadow: var(--dcuf-theme-panel-shadow) !important;
            font: 500 14px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        }
        #${PANEL_ID} .dcuf-palette-header {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 12px !important;
            padding: 18px 18px 14px !important;
            border-bottom: 1px solid var(--dcuf-theme-border) !important;
            background: linear-gradient(180deg, var(--dcuf-theme-card-top), var(--dcuf-theme-surface-raised)) !important;
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
        #${PANEL_ID} .dcuf-palette-body { padding: 16px 18px 18px !important; }
        #${PANEL_ID} .dcuf-palette-description { margin: 0 0 14px !important; color: var(--dcuf-theme-fg-muted) !important; }
        #${PANEL_ID} .dcuf-palette-options { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 10px !important; }
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

    const closePaletteDialog = ({ restore = true } = {}) => {
        const overlay = document.getElementById(OVERLAY_ID);
        if (!overlay) return false;
        const returnFocus = overlay.__dcufReturnFocus;
        if (restore) apply(committedId, 'preview-cancel');
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
        `;
        overlay.appendChild(panel);
        (document.body || document.documentElement).appendChild(overlay);
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
