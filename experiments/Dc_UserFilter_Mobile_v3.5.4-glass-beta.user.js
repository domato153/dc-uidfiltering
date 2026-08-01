// ==UserScript==
// @name         DC UserFilter Mobile 3.5.4 Glass Beta
// @namespace    http://tampermonkey.net/
// @version      3.5.4-glass-beta.1
// @description  Experimental glass-material theme add-on for DC_UserFilter_Mobile 3.5.4-beta
// @author       domato153
// @match        https://gall.dcinside.com/board/*
// @match        https://gall.dcinside.com/mgallery/board/*
// @match        https://gall.dcinside.com/mini/board/*
// @noframes
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(() => {
    'use strict';

    const ROOT_ATTR = 'data-dcuf-glass-beta';
    const STYLE_ID = 'dcuf-glass-beta-style';
    const STORAGE_KEY = 'dcuf_glass_beta_enabled';

    const isEnabled = () => GM_getValue(STORAGE_KEY, true) !== false;

    const setRootState = (enabled) => {
        const root = document.documentElement;
        if (!root) return;
        if (enabled) root.setAttribute(ROOT_ATTR, 'true');
        else root.removeAttribute(ROOT_ATTR);
    };

    const css = String.raw`
html[${ROOT_ATTR}="true"] {
    --dcuf-glass-page: #dce7f5;
    --dcuf-glass-page-alt: #edf3fb;
    --dcuf-glass-shell: rgba(239, 245, 253, .56);
    --dcuf-glass-shell-strong: rgba(244, 248, 254, .72);
    --dcuf-glass-paper: rgba(250, 252, 255, .82);
    --dcuf-glass-row: rgba(255, 255, 255, .34);
    --dcuf-glass-row-hover: rgba(255, 255, 255, .52);
    --dcuf-glass-control: rgba(255, 255, 255, .42);
    --dcuf-glass-input: rgba(255, 255, 255, .50);
    --dcuf-glass-rim: rgba(255, 255, 255, .86);
    --dcuf-glass-border: rgba(80, 101, 139, .17);
    --dcuf-glass-border-soft: rgba(255, 255, 255, .58);
    --dcuf-glass-shadow: 0 15px 42px rgba(35, 53, 88, .12), 0 3px 12px rgba(35, 53, 88, .07);
    --dcuf-glass-popup-shadow: 0 30px 86px rgba(25, 39, 72, .25), 0 8px 25px rgba(25, 39, 72, .12);
    --dcuf-glass-blur-shell: 18px;
    --dcuf-glass-blur-paper: 13px;
}

html[${ROOT_ATTR}="true"].dc-filter-dark-mode,
html[${ROOT_ATTR}="true"] body.dc-filter-dark-mode {
    --dcuf-glass-page: #091321;
    --dcuf-glass-page-alt: #101b2b;
    --dcuf-glass-shell: rgba(19, 29, 47, .64);
    --dcuf-glass-shell-strong: rgba(25, 36, 56, .76);
    --dcuf-glass-paper: rgba(19, 28, 44, .86);
    --dcuf-glass-row: rgba(34, 47, 69, .40);
    --dcuf-glass-row-hover: rgba(48, 63, 90, .54);
    --dcuf-glass-control: rgba(150, 171, 214, .11);
    --dcuf-glass-input: rgba(8, 15, 27, .48);
    --dcuf-glass-rim: rgba(232, 241, 255, .18);
    --dcuf-glass-border: rgba(196, 213, 244, .14);
    --dcuf-glass-border-soft: rgba(235, 243, 255, .10);
    --dcuf-glass-shadow: 0 18px 50px rgba(0, 0, 0, .34), 0 4px 14px rgba(0, 0, 0, .22);
    --dcuf-glass-popup-shadow: 0 34px 92px rgba(0, 0, 0, .58), 0 9px 28px rgba(0, 0, 0, .34);
}

html[${ROOT_ATTR}="true"],
html[${ROOT_ATTR}="true"] body {
    background:
        radial-gradient(70% 48% at 5% -5%, color-mix(in srgb, var(--dcuf-theme-accent, #3f6de0) 22%, transparent), transparent 70%),
        radial-gradient(56% 44% at 100% 8%, rgba(57, 197, 228, .13), transparent 72%),
        linear-gradient(145deg, var(--dcuf-glass-page-alt), var(--dcuf-glass-page)) fixed !important;
}

/* Outer glass shells: one material layer per major surface. */
html[${ROOT_ATTR}="true"] body :is(
    .dcheader.typea .dchead,
    .gnb_bar,
    .newvisit_history,
    .page_head,
    .list_array_option,
    .custom-mobile-list,
    .view_content_wrap .gallview_head,
    .view_content_wrap .gallview_contents,
    .view_content_wrap .btn_recommend_box,
    #focus_cmt .comment_box,
    #container .view_comment.image_comment .comment_box.img_comment_box,
    form.dcuf-write-form,
    .dcuf-password-card,
    .no_memberwrap,
    .custom-bottom-controls .dcuf-bottom-action-card,
    .custom-bottom-controls .dcuf-pagination-card,
    .custom-bottom-controls .dcuf-search-card
) {
    border-color: var(--dcuf-glass-border) !important;
    background-color: var(--dcuf-glass-shell) !important;
    background-image:
        radial-gradient(ellipse 54% 38% at 100% 0%, color-mix(in srgb, var(--dcuf-theme-accent-soft, #eaf1ff) 44%, transparent), transparent 70%),
        linear-gradient(180deg, var(--dcuf-glass-rim), color-mix(in srgb, var(--dcuf-glass-rim) 25%, transparent) 2px, transparent 54%) !important;
    box-shadow: var(--dcuf-glass-shadow), inset 0 1px 0 var(--dcuf-glass-rim) !important;
}

@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    html[${ROOT_ATTR}="true"] body :is(
        .dcheader.typea .dchead,
        .gnb_bar,
        .newvisit_history,
        .page_head,
        .list_array_option,
        .custom-mobile-list,
        .view_content_wrap .gallview_head,
        .view_content_wrap .gallview_contents,
        .view_content_wrap .btn_recommend_box,
        #focus_cmt .comment_box,
        #container .view_comment.image_comment .comment_box.img_comment_box,
        form.dcuf-write-form,
        .dcuf-password-card,
        .no_memberwrap,
        .custom-bottom-controls .dcuf-bottom-action-card,
        .custom-bottom-controls .dcuf-pagination-card,
        .custom-bottom-controls .dcuf-search-card
    ) {
        -webkit-backdrop-filter: blur(var(--dcuf-glass-blur-shell)) saturate(1.16) !important;
        backdrop-filter: blur(var(--dcuf-glass-blur-shell)) saturate(1.16) !important;
    }
}

/* Reading surfaces stay more opaque than navigation chrome. */
html[${ROOT_ATTR}="true"] body :is(
    .view_content_wrap .gallview_contents,
    form.dcuf-write-form .write_subject,
    form.dcuf-write-form .write_infobox,
    form.dcuf-write-form .write_textarea,
    form.dcuf-write-form .editor_wrap,
    .dcuf-password-card,
    .no_memberwrap
) {
    background-color: var(--dcuf-glass-paper) !important;
    background-image: linear-gradient(180deg, color-mix(in srgb, var(--dcuf-glass-rim) 46%, transparent), transparent 150px) !important;
}

@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    html[${ROOT_ATTR}="true"] body :is(
        .view_content_wrap .gallview_contents,
        form.dcuf-write-form .write_subject,
        form.dcuf-write-form .write_infobox,
        form.dcuf-write-form .write_textarea,
        form.dcuf-write-form .editor_wrap,
        .dcuf-password-card,
        .no_memberwrap
    ) {
        -webkit-backdrop-filter: blur(var(--dcuf-glass-blur-paper)) saturate(1.08) !important;
        backdrop-filter: blur(var(--dcuf-glass-blur-paper)) saturate(1.08) !important;
    }
}

/* List rows and comments are shallow layers, not separate heavy glass cards. */
html[${ROOT_ATTR}="true"] body :is(
    .custom-mobile-list .custom-post-item,
    #focus_cmt .cmt_list > li,
    #focus_cmt .reply_list > li,
    #container .view_comment.image_comment .cmt_list > li,
    #container .view_comment.image_comment .reply_list > li,
    .gall_exposure_list > ul > li
) {
    border-color: var(--dcuf-glass-border-soft) !important;
    background-color: var(--dcuf-glass-row) !important;
    background-image: linear-gradient(180deg, color-mix(in srgb, var(--dcuf-glass-rim) 28%, transparent), transparent 72%) !important;
    box-shadow: inset 0 1px 0 color-mix(in srgb, var(--dcuf-glass-rim) 58%, transparent) !important;
}

html[${ROOT_ATTR}="true"] body .custom-mobile-list .custom-post-item:is(:hover, :focus-within, :active) {
    background-color: var(--dcuf-glass-row-hover) !important;
}

html[${ROOT_ATTR}="true"] body :is(
    #focus_cmt .reply_list > li,
    #container .view_comment.image_comment .reply_list > li
) {
    background-color: color-mix(in srgb, var(--dcuf-glass-row) 86%, var(--dcuf-theme-accent-soft, #eaf1ff)) !important;
}

/* Inputs are inset translucent controls. */
html[${ROOT_ATTR}="true"] body :is(
    input[type="text"],
    input[type="password"],
    input[type="number"],
    input[type="search"],
    textarea,
    select
) {
    border-color: var(--dcuf-glass-border) !important;
    background-color: var(--dcuf-glass-input) !important;
    background-image: linear-gradient(180deg, color-mix(in srgb, var(--dcuf-glass-rim) 40%, transparent), transparent 70%) !important;
    box-shadow: inset 0 2px 5px rgba(24, 38, 64, .09), inset 0 1px 0 var(--dcuf-glass-rim) !important;
}

html[${ROOT_ATTR}="true"] body :is(input, textarea, select):focus {
    border-color: var(--dcuf-theme-accent, #3f6de0) !important;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--dcuf-theme-accent, #3f6de0) 18%, transparent), inset 0 1px 0 var(--dcuf-glass-rim) !important;
}

/* Script-owned dialogs receive the strongest, most legible glass material. */
html[${ROOT_ATTR}="true"] body :is(
    #dcinside-filter-setting,
    #dcinside-shortcut-modal,
    #dcinside-headtext-manager-panel,
    #dc-personal-block-size-panel,
    #dc-personal-block-drawer,
    #dc-manual-block-panel,
    #dc-selection-popup,
    #dc-block-management-panel,
    #dc-backup-popup,
    #dcuf-palette-panel
) {
    border-color: var(--dcuf-glass-border) !important;
    border-top-color: var(--dcuf-glass-rim) !important;
    background-color: var(--dcuf-glass-shell-strong) !important;
    background-image:
        radial-gradient(ellipse 62% 42% at 100% 0%, color-mix(in srgb, var(--dcuf-theme-accent-soft, #eaf1ff) 52%, transparent), transparent 68%),
        linear-gradient(145deg, var(--dcuf-glass-rim), color-mix(in srgb, var(--dcuf-glass-rim) 30%, transparent) 2px, transparent 48%) !important;
    box-shadow: var(--dcuf-glass-popup-shadow), inset 0 1px 0 var(--dcuf-glass-rim) !important;
}

@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    html[${ROOT_ATTR}="true"] body :is(
        #dcinside-filter-setting,
        #dcinside-shortcut-modal,
        #dcinside-headtext-manager-panel,
        #dc-personal-block-size-panel,
        #dc-personal-block-drawer,
        #dc-manual-block-panel,
        #dc-selection-popup,
        #dc-block-management-panel,
        #dc-backup-popup,
        #dcuf-palette-panel
    ) {
        -webkit-backdrop-filter: blur(20px) saturate(1.24) !important;
        backdrop-filter: blur(20px) saturate(1.24) !important;
    }
}

html[${ROOT_ATTR}="true"] body :is(
    #dcinside-shortcut-modal-overlay,
    #dc-personal-block-size-overlay,
    #dc-manual-block-overlay,
    #dc-personal-block-management-overlay,
    #dc-block-management-panel-overlay,
    #dc-backup-popup-overlay,
    #dcuf-palette-overlay
) {
    background:
        radial-gradient(58% 46% at 12% 8%, color-mix(in srgb, var(--dcuf-theme-accent, #3f6de0) 18%, transparent), transparent 68%),
        radial-gradient(52% 44% at 94% 92%, rgba(43, 191, 221, .14), transparent 70%),
        rgba(8, 16, 31, .26) !important;
    -webkit-backdrop-filter: blur(10px) saturate(1.12) !important;
    backdrop-filter: blur(10px) saturate(1.12) !important;
}

/* Accent controls: colored glass rather than flat fills. */
html[${ROOT_ATTR}="true"] body :is(
    #dcinside-threshold-save,
    #dcinside-save-shortcut-btn,
    [data-dcuf-fab-size-action="save"],
    #dc-block-management-panel .panel-save-btn,
    #dc-backup-popup .export-btn,
    #dc-backup-popup .import-btn,
    #dc-manual-block-panel [data-manual-block-action="add"]
) {
    border-color: color-mix(in srgb, var(--dcuf-theme-accent-strong, #245bda) 68%, var(--dcuf-glass-rim)) !important;
    background-color: color-mix(in srgb, var(--dcuf-theme-accent-strong, #245bda) 72%, rgba(18, 30, 58, .34)) !important;
    background-image:
        radial-gradient(circle at 24% 0%, rgba(255, 255, 255, .45), transparent 40%),
        linear-gradient(145deg, color-mix(in srgb, var(--dcuf-theme-accent, #3f6de0) 66%, white), var(--dcuf-theme-accent-strong, #245bda)) !important;
    box-shadow: 0 10px 24px color-mix(in srgb, var(--dcuf-theme-accent-strong, #245bda) 26%, transparent), inset 0 1px 0 rgba(255, 255, 255, .46) !important;
}

@media (max-width: 520px) {
    html[${ROOT_ATTR}="true"] body :is(
        .custom-mobile-list,
        .view_content_wrap .gallview_head,
        .view_content_wrap .gallview_contents,
        #focus_cmt .comment_box,
        #container .view_comment.image_comment .comment_box.img_comment_box,
        form.dcuf-write-form
    ) {
        border-radius: 18px !important;
    }
}

@media (prefers-reduced-transparency: reduce) {
    html[${ROOT_ATTR}="true"] body :is(
        .dcheader.typea .dchead,
        .gnb_bar,
        .newvisit_history,
        .page_head,
        .list_array_option,
        .custom-mobile-list,
        .view_content_wrap .gallview_head,
        .view_content_wrap .gallview_contents,
        .view_content_wrap .btn_recommend_box,
        #focus_cmt .comment_box,
        #container .view_comment.image_comment .comment_box.img_comment_box,
        form.dcuf-write-form,
        #dcinside-filter-setting,
        #dcinside-shortcut-modal,
        #dcinside-headtext-manager-panel,
        #dc-personal-block-size-panel,
        #dc-personal-block-drawer,
        #dc-manual-block-panel,
        #dc-selection-popup,
        #dc-block-management-panel,
        #dc-backup-popup,
        #dcuf-palette-panel
    ) {
        background-color: var(--dcuf-theme-surface-raised, #f7f8fa) !important;
        -webkit-backdrop-filter: none !important;
        backdrop-filter: none !important;
    }
}

@media (prefers-reduced-motion: reduce) {
    html[${ROOT_ATTR}="true"] body *,
    html[${ROOT_ATTR}="true"] body *::before,
    html[${ROOT_ATTR}="true"] body *::after {
        transition: none !important;
        animation: none !important;
    }
}
`;

    const installStyle = () => {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;
        (document.head || document.documentElement)?.appendChild(style);
    };

    const applyCurrentState = () => {
        installStyle();
        setRootState(isEnabled());
    };

    GM_registerMenuCommand('Glass Beta 켜기/끄기', () => {
        const next = !isEnabled();
        GM_setValue(STORAGE_KEY, next);
        setRootState(next);
    });

    if (document.documentElement) applyCurrentState();
    else document.addEventListener('DOMContentLoaded', applyCurrentState, { once: true });
})();
