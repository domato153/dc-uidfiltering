    const __dcufBuildTargetThemeCss = (ROOT_ATTRIBUTE) => `
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
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="page"][data-dcuf-native-form-state="write-editor"] {
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
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-control-kind]:focus-visible,
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="popup-cancel"][data-dcuf-native-form-state="write-editor"]:focus-visible,
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="popup-confirm"][data-dcuf-native-form-state="write-editor"]:focus-visible,
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="popup-close"][data-dcuf-native-form-state="write-editor"]:focus-visible {
            border-color: var(--dcuf-theme-accent) !important;
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--dcuf-theme-accent) 18%, transparent) !important;
        }
        html[${ROOT_ATTRIBUTE}] [data-dcuf-surface="personal-selection-target"][data-dcuf-state="active"] {
            outline-color: color-mix(in srgb, var(--dcuf-theme-accent) 66%, transparent) !important;
            background: color-mix(in srgb, var(--dcuf-theme-accent) 16%, transparent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .post-title .reply_num,
        html[${ROOT_ATTRIBUTE}] body #focus_cmt .comment_box .gall_writer .nickname.me,
        html[${ROOT_ATTRIBUTE}] body div[id^="comment_wrap_"] .comment_box .gall_writer .nickname.me {
            color: var(--dcuf-theme-accent) !important;
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
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="outer-action-primary"][data-dcuf-native-form-state="write-editor"],
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="ai-prompt-submit"][data-dcuf-native-form-state="write-editor"],
        html[${ROOT_ATTRIBUTE}] body #focus_cmt .cmt_write_box .cmt_btn_bot > button,
        html[${ROOT_ATTRIBUTE}] body #focus_cmt .cmt_write_box .cmt_cont_bottm > .fr > button,
        html[${ROOT_ATTRIBUTE}] body #container .view_comment.image_comment .cmt_write_box .cmt_btn_bot > button,
        html[${ROOT_ATTRIBUTE}] body #container .view_comment.image_comment .cmt_write_box .cmt_cont_bottm > .fr > button,
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="popup-confirm"][data-dcuf-native-form-state="write-editor"] {
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
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] {
            border-color: var(--dcuf-theme-border) !important;
            background-color: var(--dcuf-theme-canvas) !important;
            background-image: linear-gradient(180deg, color-mix(in srgb, white 5%, var(--dcuf-theme-canvas)), var(--dcuf-theme-canvas)) !important;
            box-shadow: var(--dcuf-theme-panel-shadow) !important;
        }
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="headtext-shell"][data-dcuf-native-form-state="write-editor"],
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="outer-actions"][data-dcuf-native-form-state="write-editor"],
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="ai-prompt-shell"][data-dcuf-native-form-state="write-editor"],
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="ai-prompt"][data-dcuf-native-form-state="write-editor"],
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="attachment-shell"][data-dcuf-native-form-state="write-editor"],
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="attachment-info"][data-dcuf-native-form-state="write-editor"],
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="attachment-list-shell"][data-dcuf-native-form-state="write-editor"] {
            border-color: var(--dcuf-theme-border) !important;
            background-color: var(--dcuf-theme-surface) !important;
            background-image: linear-gradient(180deg, var(--dcuf-theme-surface-raised), var(--dcuf-theme-surface)) !important;
        }
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="subject-input"][data-dcuf-native-form-state="write-editor"],
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="name-input"][data-dcuf-native-form-state="write-editor"],
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="password-input"][data-dcuf-native-form-state="write-editor"],
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="captcha-input"][data-dcuf-native-form-state="write-editor"],
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="captcha-image-shell"][data-dcuf-native-form-state="write-editor"],
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="captcha-panel"][data-dcuf-native-form-state="write-editor"] {
            border-color: var(--dcuf-theme-border-strong) !important;
            background-color: var(--dcuf-theme-surface-input) !important;
            background-image: none !important;
        }
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="editor-wrapper"][data-dcuf-native-form-state="write-editor"],
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="editor-frame"][data-dcuf-native-form-state="write-editor"] {
            border-color: var(--dcuf-theme-border) !important;
            background-color: var(--dcuf-theme-surface-input) !important;
        }
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="editor-toolbar"][data-dcuf-native-form-state="write-editor"],
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="editor-statusbar"][data-dcuf-native-form-state="write-editor"] {
            border-color: var(--dcuf-theme-border) !important;
            background-color: var(--dcuf-theme-surface-muted) !important;
            background-image: none !important;
        }
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="editor-area"][data-dcuf-native-form-state="write-editor"],
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="editor-editable"][data-dcuf-native-form-state="write-editor"] {
            background-color: var(--dcuf-theme-surface-input) !important;
            background-image: none !important;
        }
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="editor-area"][data-dcuf-native-form-state="write-editor"],
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="editor-editable"][data-dcuf-native-form-state="write-editor"],
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="editor-source"][data-dcuf-native-form-state="write-editor"],
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-control-kind="textarea"],
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="subject-input"][data-dcuf-native-form-state="write-editor"],
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="name-input"][data-dcuf-native-form-state="write-editor"],
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="password-input"][data-dcuf-native-form-state="write-editor"],
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="captcha-input"][data-dcuf-native-form-state="write-editor"],
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="outer-action-secondary"][data-dcuf-native-form-state="write-editor"] {
            border-color: var(--dcuf-theme-border-strong) !important;
            background-color: var(--dcuf-theme-surface-input) !important;
            background-image: none !important;
        }
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-toolbar-control~="ordinary"][data-dcuf-native-form-state="write-editor"] {
            border-color: var(--dcuf-theme-border-strong) !important;
            background-color: var(--dcuf-theme-surface-input) !important;
            background-image: none !important;
            box-shadow: none !important;
        }
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-toolbar-control~="ordinary"][data-dcuf-native-form-state="write-editor"]:is(:hover, :focus-visible),
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-toolbar-control~="ordinary"][data-dcuf-native-form-state="write-editor"][data-dcuf-native-form-control-state~="active"] {
            border-color: var(--dcuf-theme-accent) !important;
            box-shadow: 0 0 0 1px color-mix(in srgb, var(--dcuf-theme-accent) 28%, transparent) !important;
        }
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="headtext-label"][data-dcuf-native-form-state="write-editor"] {
            background-color: var(--dcuf-theme-surface-muted) !important;
        }
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="popup-heading"][data-dcuf-native-form-state="write-editor"] {
            background: linear-gradient(135deg, var(--dcuf-theme-accent), var(--dcuf-theme-accent-strong)) !important;
        }

        /* Inactive navigation/actions are neutral; selected and primary actions keep the preset accent. */
        html[${ROOT_ATTRIBUTE}] body:not(.is-write-page) .list_array_option .array_tab li:not(.on) > a,
        html[${ROOT_ATTRIBUTE}] body:not(.is-write-page) .list_array_option .array_tab :is(button, a):not(.on),
        html[${ROOT_ATTRIBUTE}] body .custom-bottom-controls .dcuf-bottom-action-card :is(button, a):not(.on):not(.btn_write):not(.write),
        html[${ROOT_ATTRIBUTE}] body #container:is(.gallery_view, .minor_view, .mini_view) .view_bottom_btnbox :is(.btn_white, .btn_grey),
        html[${ROOT_ATTRIBUTE}] [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="outer-action-secondary"][data-dcuf-native-form-state="write-editor"] {
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

        `
            .replaceAll('.custom-mobile-list', '.dcuf-retired-custom-mobile-list')
            .replaceAll('.custom-post-item', '.dcuf-retired-custom-post-item')
            .replaceAll('.custom-bottom-controls', '.dcuf-retired-custom-bottom-controls')
            .replaceAll('.list_array_option', '.dcuf-retired-list-array-option')
            .replaceAll('.post-title', '.dcuf-retired-post-title')
            .replaceAll('.post-meta', '.dcuf-retired-post-meta')
            .replaceAll('.view_content_wrap', '.dcuf-retired-view-content-wrap')
            .replaceAll('.view_bottom_btnbox', '.dcuf-retired-view-bottom-btnbox')
            .replaceAll('#focus_cmt', '#dcuf-retired-focus-cmt')
            .replaceAll('div[id^="comment_wrap_"]', 'div[id^="dcuf-retired-comment-wrap-"]')
            .replaceAll('.view_comment', '.dcuf-retired-view-comment')
            .replaceAll('.gall_comment', '.dcuf-retired-gall-comment')
            .replaceAll('.comment_box', '.dcuf-retired-comment-box')
            .replaceAll('.comment_count', '.dcuf-retired-comment-count')
            .replaceAll('.cmt_write_box', '.dcuf-retired-cmt-write-box')
            .replaceAll('.cmt_list', '.dcuf-retired-cmt-list')
            .replaceAll('.reply_box', '.dcuf-retired-reply-box')
            .replaceAll('.reply_list', '.dcuf-retired-reply-list');
