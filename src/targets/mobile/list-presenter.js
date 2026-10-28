    const __dcufListPresenter = (() => {
        const VERSION = 'list-snapshot-v1';
        const CSS = `
            [data-dcuf-surface="list-container"] {
                font-family: system-ui, -apple-system, "Segoe UI", "Malgun Gothic", sans-serif;
                --dcuf-list-border: var(--dcuf-b1-line, var(--dcuf-theme-border, #dfe5ee));
                --dcuf-list-surface: var(--dcuf-b1-paper, var(--dcuf-theme-surface, #fff));
                --dcuf-list-muted: var(--dcuf-theme-surface-muted, #f6f8fb);
                --dcuf-list-fg: var(--dcuf-theme-fg, #273142);
                --dcuf-list-subtle: var(--dcuf-theme-fg-muted, #697386);
                --dcuf-list-accent: var(--dcuf-theme-accent, #245bda);
                overflow: clip;
                border: 1px solid var(--dcuf-list-border);
                border-radius: 12px;
                background: var(--dcuf-list-surface);
                width: calc(100% - 40px);
                max-width: 1120px;
                margin: 10px auto;
                padding: 0 12px;
                box-sizing: border-box;
            }
            [data-dcuf-surface="list-item"] {
                position: relative;
                display: block;
                padding: 12px 16px;
                border-bottom: 1px solid var(--dcuf-list-border);
                background: var(--dcuf-list-surface);
                color: var(--dcuf-list-fg);
                transition: background-color 160ms ease, transform 100ms ease;
            }
            [data-dcuf-surface="list-item"]:last-child { border-bottom: 0; }
            [data-dcuf-surface="list-item"]:has(.dcuf-native-author-open) { z-index: 10001; }
            [data-dcuf-surface="list-item"]:not(:has(.dcuf-native-author-open)):active,
            [data-dcuf-surface="list-item"]:not(:has(.dcuf-native-author-open)):has(.dcuf-list-title-link:active) { transform: scale(.997); }
            [data-dcuf-surface="list-item"][data-dcuf-state="advertisement"] { display: none; }
            [data-dcuf-surface="list-item"][data-dcuf-state="notice"],
            [data-dcuf-surface="list-item"][data-dcuf-state="concept"] {
                padding-left: 58px;
                background: var(--dcuf-list-surface);
            }
            [data-dcuf-surface="list-item"][data-dcuf-state="notice"]::before,
            [data-dcuf-surface="list-item"][data-dcuf-state="concept"]::before {
                position: absolute;
                left: 14px;
                top: 13px;
                padding: 3px 7px;
                border-radius: 6px;
                background: var(--dcuf-theme-accent-soft);
                color: var(--dcuf-theme-accent-ink);
                font-size: 11px;
                font-weight: 600;
                line-height: 1.4;
            }
            [data-dcuf-surface="list-item"][data-dcuf-state="notice"]::before { content: "공지"; }
            [data-dcuf-surface="list-item"][data-dcuf-state="concept"]::before { content: "개념"; }
            [data-dcuf-surface="list-item"] .dcuf-list-title {
                display: flex;
                min-width: 0;
                align-items: baseline;
                gap: 6px;
                margin-bottom: 7px;
                color: var(--dcuf-list-fg);
                font-size: 15px;
                font-weight: 400;
                line-height: 1.42;
                word-break: break-all;
            }
            [data-dcuf-surface="list-item"][data-dcuf-state="notice"] .dcuf-list-title,
            [data-dcuf-surface="list-item"][data-dcuf-state="concept"] .dcuf-list-title { font-weight: 600; }
            [data-dcuf-surface="list-item"] .dcuf-list-title-link {
                min-width: 0;
                color: inherit;
                text-decoration: none;
                -webkit-tap-highlight-color: rgba(36, 91, 218, .16);
            }
            [data-dcuf-surface="list-item"] .dcuf-list-title-link:visited { color: var(--dcuf-theme-fg-visited, #625282); }
            [data-dcuf-surface="list-item"] [data-dcuf-role="subject-description"] { display: none; }
            [data-dcuf-surface="list-item"].dcuf-recent-post {
                background: color-mix(in srgb, var(--dcuf-list-accent) 5%, var(--dcuf-list-surface));
                box-shadow: inset 3px 0 0 var(--dcuf-list-accent);
            }
            [data-dcuf-surface="list-item"] .dcuf-recent-label {
                display: inline-flex;
                flex: none;
                align-items: center;
                margin-inline-end: 7px;
                padding: 3px 6px;
                border-radius: 6px;
                background: var(--dcuf-theme-accent-soft, #e9efff);
                color: var(--dcuf-theme-accent-ink, #245bda);
                font-size: 11px;
                font-weight: 700;
                line-height: 1.4;
            }
            @keyframes dcuf-recent-pulse {
                0%, 100% { box-shadow: inset 3px 0 0 var(--dcuf-list-accent); }
                45% { box-shadow: inset 5px 0 0 var(--dcuf-list-accent); }
            }
            [data-dcuf-surface="list-item"].dcuf-recent-pulse { animation: dcuf-recent-pulse .55s ease-in-out 3; }
            [data-dcuf-surface="list-item"] .dcuf-list-subject,
            [data-dcuf-surface="list-item"] .dcuf-list-reply,
            [data-dcuf-surface="list-item"] .dcuf-title-decoration { flex: none; }
            [data-dcuf-surface="list-item"] .dcuf-list-subject,
            [data-dcuf-surface="list-item"] .dcuf-list-reply,
            [data-dcuf-surface="list-item"] .dcuf-title-decoration { color: var(--dcuf-theme-accent-ink, var(--dcuf-list-accent)); }
            [data-dcuf-surface="list-item"] .dcuf-list-meta {
                display: flex;
                min-width: 0;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                color: var(--dcuf-list-subtle);
                font-size: 12px;
                line-height: 1.4;
            }
            [data-dcuf-surface="list-item"] .dcuf-list-author {
                flex: 1 1 auto;
                min-width: 0;
                max-width: 100%;
                cursor: pointer;
                -webkit-tap-highlight-color: transparent;
            }
            [data-dcuf-surface="list-item"] .dcuf-list-author [data-dcuf-role="author-identity"],
            [data-dcuf-surface="list-item"] .dcuf-list-author [data-dcuf-role="author-group"] {
                display: inline-flex;
                align-items: center;
                min-width: 0;
                max-width: 100%;
                width: auto;
                white-space: nowrap;
                vertical-align: middle;
            }
            [data-dcuf-surface="list-item"] .dcuf-list-author [data-dcuf-role="author-name"],
            [data-dcuf-surface="list-item"] .dcuf-list-author [data-dcuf-role="author-identity"] [data-dcuf-role="author-group"] [data-dcuf-role="author-name"] {
                display: inline-block;
                flex: 0 1 auto;
                min-width: 0;
                max-width: min(56vw, 420px);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                vertical-align: middle;
            }
            [data-dcuf-surface="list-item"] .dcuf-list-author img,
            [data-dcuf-surface="list-item"] .dcuf-list-author [data-dcuf-role="author-ip"] { flex: none; }
            [data-dcuf-surface="list-item"] .dcuf-list-stats { flex: none; white-space: nowrap; }
            @media (min-width: 760px) {
                /* Filtering owns row inline display; arrange its children instead. */
                [data-dcuf-surface="list-item"] { padding-right: 250px; min-height: 54px; box-sizing: border-box; }
                [data-dcuf-surface="list-item"] .dcuf-list-title { margin: 0; min-height: 29px; align-items: center; font-size: 14px; }
                [data-dcuf-surface="list-item"] .dcuf-list-meta { position: absolute; right: 16px; top: 0; bottom: 0; transform: none; justify-content: center; width: 220px; flex-direction: column; align-items: flex-end; gap: 4px; font-size: 11px; }
                [data-dcuf-surface="list-item"] .dcuf-list-author { flex: none; }
            }
            [data-dcuf-surface="list-toolbar"],
            [data-dcuf-surface="list-actions"] {
                position: relative;
                z-index: 2;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                min-height: 48px;
                margin: 10px auto;
                padding: 8px 10px;
                border: 1px solid var(--dcuf-b1-rim, var(--dcuf-theme-border, #dfe5ee));
                border-radius: 12px;
                background: var(--dcuf-b1-glass);
                box-shadow: var(--dcuf-b1-shadow), inset 0 1px 0 var(--dcuf-b1-rim);
                backdrop-filter: var(--dcuf-b1-structural-filter,blur(20px) saturate(1.1));
            }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="tablist"],
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="toolbar-actions"],
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="toolbar-cluster"],
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="page-size-shell"],
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="primary-group"],
            [data-dcuf-surface="list-actions"] [data-dcuf-role="action-start"],
            [data-dcuf-surface="list-actions"] [data-dcuf-role="action-end"] {
                position: static;
                display: flex;
                align-items: center;
                gap: 7px;
                margin: 0;
            }
            [data-dcuf-surface="list-toolbar"] {
                display: grid;
                grid-template-columns: auto minmax(0, 1fr) auto;
                width: calc(100% - 40px);
                max-width: 1120px;
                height: auto;
                box-sizing: border-box;
                flex-wrap: wrap;
            }
            /* Once the adapter is ready, grid replaces the host's float clearfix. */
            [data-dcuf-surface="list-toolbar"][data-dcuf-state="ready"]::after { content: none; display: none; }
            [data-dcuf-surface="list-toolbar"][data-dcuf-scroll]:not([data-dcuf-scroll="measuring"]) {
                transform: none;
                transition: transform 200ms ease, visibility 200ms;
            }
            [data-dcuf-scroll-space="1"] { display: none; }
            [data-dcuf-scroll-space="1"][data-dcuf-scroll-active] {
                display: block;
                height: var(--dcuf-scroll-size);
                margin: 10px 0;
            }
            [data-dcuf-surface="list-toolbar"]:is([data-dcuf-scroll="shown"], [data-dcuf-scroll="hidden"]) {
                position: fixed;
                z-index: 1003;
                top: 0;
                left: var(--dcuf-scroll-left);
                width: var(--dcuf-scroll-width);
                margin: 0;
            }
            [data-dcuf-surface="list-toolbar"][data-dcuf-scroll="hidden"] {
                transform: translateY(calc(-100% - 12px));
                visibility: hidden;
                pointer-events: none;
            }
            @media (prefers-reduced-motion: reduce) {
                [data-dcuf-surface="list-toolbar"][data-dcuf-scroll]:not([data-dcuf-scroll="measuring"]) { transition: none; }
            }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="toolbar-actions"] {
                grid-area: 1 / 3;
                width: auto;
                height: auto;
                padding: 0;
                margin-left: auto;
            }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="tablist"] {
                grid-area: 1 / 1;
                width: auto;
                min-width: 0;
                flex: none;
                gap: 4px;
            }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="toolbar-categories"] {
                grid-area: 1 / 2;
                position: static;
                display: flex;
                width: auto;
                min-width: 0;
                max-width: 100%;
                align-items: center;
                margin: 0;
                line-height: normal;
                transform: none;
                border-left: 1px solid var(--dcuf-theme-border);
                padding-left: 12px;
            }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="category-shell"] {
                position: relative;
                display: flex;
                align-items: center;
                gap: 7px;
                height: auto;
                min-width: 0;
                width: 100%;
                max-width: 100%;
            }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="toolbar-categories"] [data-dcuf-role="category-list"] {
                float: none;
                display: grid;
                grid-auto-flow: column;
                grid-auto-columns: max-content;
                align-items: center;
                flex-wrap: nowrap;
                gap: 2px;
                height: 40px;
                margin: 0;
                padding: 0;
                overflow-x: auto;
                scrollbar-width: thin;
                scroll-snap-type: x proximity;
                min-width: 0;
                flex: 1 1 auto;
            }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="toolbar-categories"] [data-dcuf-role="category-list"] > li { display: flex; align-items: center; min-width: 0; max-width: 200px; height: 40px; padding: 0; scroll-snap-align: start; }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="toolbar-categories"] [data-dcuf-role="category-list"] > li > a { display: block; box-sizing: border-box; height: 40px; max-width: 100%; padding: 0 10px; border-radius: 6px; font-size: 11px; line-height: 40px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="category-toggle"] {
                position: static;
                display: inline-flex;
                flex: none;
                align-items: center;
                justify-content: center;
                width: 36px;
                height: 40px;
                margin: 0;
                padding: 0;
                border: 1px solid transparent;
                border-radius: 8px;
                background: transparent;
                color: var(--dcuf-theme-fg-muted, #697386);
            }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="category-toggle"]::before {
                content: "";
                border-inline: 4px solid transparent;
                border-block-start: 5px solid currentColor;
            }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="category-toggle-icon"] { display: none; }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="category-popup"] {
                position: absolute;
                z-index: 3;
                top: calc(100% + 8px);
                right: 0;
                width: max-content;
                min-width: 140px;
                max-width: min(300px, calc(100vw - 24px));
                max-height: min(360px, 60vh);
                padding: 6px;
                border: 1px solid var(--dcuf-b1-rim);
                border-radius: 14px;
                background: color-mix(in srgb, var(--dcuf-b1-paper) 96%, transparent);
                box-shadow: var(--dcuf-b1-shadow), inset 0 1px 0 var(--dcuf-b1-rim);
                backdrop-filter: var(--dcuf-b1-floating-filter,blur(24px));
                overflow: auto;
                box-sizing: border-box;
            }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="category-popup-list"] {
                display: grid;
                float: none;
                gap: 4px;
                height: auto;
                margin: 0;
                padding: 0;
                list-style: none;
            }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="category-popup-item"] {
                display: block;
                height: auto;
                margin: 0;
                padding: 0;
                line-height: normal;
            }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="category-option"] {
                display: flex;
                min-height: 40px;
                align-items: center;
                padding: 6px 10px;
                border-radius: 8px;
                box-sizing: border-box;
                color: var(--dcuf-theme-fg, #273142);
                white-space: nowrap;
                text-decoration: none;
            }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="category-option"]:is(:hover, :focus-visible) {
                background: var(--dcuf-control-selected-bg);
                box-shadow: var(--dcuf-control-shadow);
            }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="primary-group"] {
                width: auto;
                flex: none;
                font-size: inherit;
            }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="primary-action"] {
                width: auto;
                height: auto;
                flex: none;
                box-sizing: border-box;
                font-size: inherit;
                white-space: nowrap;
            }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="tablist"] > ul {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 4px;
                min-width: 0;
                margin: 0;
                padding: 0;
                list-style: none;
            }
            @media (max-width: 759px) {
                [data-dcuf-surface="list-toolbar"] { width: calc(100% - 24px); grid-template-columns: minmax(0, 1fr) auto; padding: 8px; gap: 8px; }
                [data-dcuf-surface="list-toolbar"] [data-dcuf-role="toolbar-actions"] { grid-area: 1 / 2; }
                [data-dcuf-surface="list-toolbar"] [data-dcuf-role="toolbar-categories"] { grid-area: 2 / 1 / 3 / -1; border-left: 0; border-top: 1px solid var(--dcuf-theme-border); padding: 6px 0 0; }
                [data-dcuf-surface="list-toolbar"] [data-dcuf-role="tablist"] { gap: 2px; }
                [data-dcuf-surface="list-toolbar"] [data-dcuf-role="tablist"] button[data-dcuf-role="action"] { width: auto; padding: 0 8px; font-size: 12px; }
                [data-dcuf-surface="list-container"] { width: calc(100% - 24px); padding: 0 4px; }
            }
            @media (max-width: 359px) {
                [data-dcuf-surface="list-toolbar"] { grid-template-columns: minmax(0, 1fr); }
                [data-dcuf-surface="list-toolbar"] [data-dcuf-role="toolbar-actions"] { grid-area: 2 / 1; justify-self: end; }
                [data-dcuf-surface="list-toolbar"] [data-dcuf-role="toolbar-categories"] { grid-area: 3 / 1; }
            }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="legacy-page-size"][data-dcuf-state="superseded"] { display: none; }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="page-size"] {
                display: block;
                min-width: 64px;
                min-height: 40px;
                box-sizing: border-box;
                padding: 0 9px;
                border: 1px solid var(--dcuf-control-rim);
                border-radius: 8px;
                color: var(--dcuf-theme-fg, #273142);
                font: 11px/1.4 system-ui, sans-serif;
                background: var(--dcuf-control-secondary-bg);
                box-shadow: var(--dcuf-control-shadow);
            }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="action"],
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="tablist"] button[data-dcuf-role="action"],
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="primary-action"],
            [data-dcuf-surface="list-actions"] [data-dcuf-role="action"],
            [data-dcuf-surface="list-actions"] [data-dcuf-role="primary-action"] {
                display: inline-flex;
                min-width: 44px;
                min-height: 40px;
                align-items: center;
                justify-content: center;
                padding: 0 12px;
                border: 1px solid var(--dcuf-control-rim);
                border-radius: 8px;
                color: var(--dcuf-theme-fg-muted, #697386);
                font-size: 12px;
                font-weight: 600;
                line-height: 1.2;
                text-decoration: none;
                text-shadow: none;
                transition: transform 100ms ease, border-color 160ms ease, background-color 160ms ease;
                background: var(--dcuf-control-glaze);
                box-shadow: var(--dcuf-control-quiet-shadow);
            }
            [data-dcuf-surface="list-actions"] [data-dcuf-role="primary-action"] {
                width: auto;
                height: auto;
                flex: none;
                box-sizing: border-box;
                white-space: nowrap;
            }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="action"]:active,
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="primary-action"]:active,
            [data-dcuf-surface="list-actions"] [data-dcuf-role="action"]:active,
            [data-dcuf-surface="list-actions"] [data-dcuf-role="primary-action"]:active { transform: scale(.98); }
            @media (min-width: 760px) {
                [data-dcuf-surface="list-toolbar"] [data-dcuf-role="tablist"] button[data-dcuf-role="action"] { width: auto; padding-inline: 13px; }
            }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-state="current"],
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="tablist"] button[data-dcuf-state="current"],
            [data-dcuf-surface="list-actions"] [data-dcuf-state="current"] {
                border-color: var(--dcuf-control-rim);
                color: var(--dcuf-theme-accent-ink);
                background: var(--dcuf-control-selected-bg);
                box-shadow: var(--dcuf-control-shadow);
            }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="primary-action"],
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="primary-group"] [data-dcuf-role="primary-action"],
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="primary-group"] [data-dcuf-role="primary-action"]:visited,
            [data-dcuf-surface="list-actions"] [data-dcuf-role="action-end"] [data-dcuf-role="primary-action"],
            [data-dcuf-surface="list-actions"] [data-dcuf-role="action-end"] [data-dcuf-role="primary-action"]:visited,
            [data-dcuf-surface="list-actions"] [data-dcuf-role="primary-action"] {
                position: relative;
                isolation: isolate;
                min-width: 88px;
                height: 40px;
                box-sizing: border-box;
                padding-inline: 15px;
                border: 0;
                border-radius: 8px;
                background: transparent;
                color: var(--dcuf-theme-on-accent, #fff);
                font-weight: 650;
                box-shadow: none;
            }
            /* A36px painted face preserves the original40px native hit target. */
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="primary-action"]::after,
            [data-dcuf-surface="list-actions"] [data-dcuf-role="primary-action"]::after {
                content: "";
                position: absolute;
                inset: 2px 0;
                z-index: -1;
                pointer-events: none;
                border: 1px solid var(--dcuf-control-primary-rim);
                border-radius: 8px;
                /* Keep a legible fallback for older phone color parsers. */
                background: var(--dcuf-control-primary-bg);
                box-shadow: var(--dcuf-control-shadow);
            }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="primary-action"]::before,
            [data-dcuf-surface="list-actions"] [data-dcuf-role="primary-action"]::before {
                content: "";
                display: inline-block;
                width: 16px;
                height: 16px;
                margin: 0 7px 0 0;
                background: currentColor;
                mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M3.9 7.5a2.5 2.5 0 0 1 0-3.6l.4-.4a2.5 2.5 0 0 1 3.6 0L19 14.6l-3.6 3.6L3.9 7.5Zm12.6 11.8 4.8 1.4-1.4-4.8-3.4 3.4Z' fill='black'/%3E%3C/svg%3E") center / contain no-repeat;
                color: currentColor;
                font-size: 14px;
                line-height: 1;
            }
            [data-dcuf-surface="list-pagination"][data-dcuf-role="navigation"],
            [data-dcuf-surface="list-pagination"][data-dcuf-role="pages"],
            [data-dcuf-surface="list-search"] {
                display: block;
                width: calc(100% - 40px);
                max-width: 1120px;
                box-sizing: border-box;
                margin: 12px auto;
                padding: 4px 0;
                border: 0;
                border-radius: 10px;
                background: transparent;
                box-shadow: none;
            }
            [data-dcuf-surface="list-pagination"][data-dcuf-role="navigation"] [data-dcuf-role="pages"] {
                display: flex;
                align-items: center;
                justify-content: safe center;
                gap: 4px;
                overflow-x: auto;
                scrollbar-width: none;
                width: 100%;
                max-width: none;
                height: auto;
                min-height: 40px;
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            [data-dcuf-surface="list-pagination"]:is([data-dcuf-role="navigation"], [data-dcuf-role="pages"]) [data-dcuf-role="page"],
            [data-dcuf-surface="list-pagination"]:is([data-dcuf-role="navigation"], [data-dcuf-role="pages"]) [data-dcuf-role="page-direction"] {
                display: inline-flex;
                flex: 0 0 auto;
                min-width: 40px;
                min-height: 40px;
                align-items: center;
                justify-content: center;
                padding: 0 8px;
                border: 1px solid transparent;
                border-radius: 8px;
                color: var(--dcuf-theme-fg, #273142);
                text-decoration: none;
                height: 40px;
                margin: 0;
                box-sizing: border-box;
                font: 500 12px/1.2 system-ui, sans-serif;
                font-variant-numeric: tabular-nums;
            }
            [data-dcuf-surface="list-pagination"] [data-dcuf-role="page-direction"] {
                padding: 0;
                background: none;
                text-indent: 0;
            }
            [data-dcuf-surface="list-pagination"] [data-dcuf-role="page-direction"]::before { font: 600 22px/1 Arial, sans-serif; }
            [data-dcuf-surface="list-pagination"] [data-dcuf-role="page-direction"][data-dcuf-state="first"]::before { content: "«"; }
            [data-dcuf-surface="list-pagination"] [data-dcuf-role="page-direction"][data-dcuf-state="prev"]::before { content: "‹"; }
            [data-dcuf-surface="list-pagination"] [data-dcuf-role="page-direction"][data-dcuf-state="next"]::before { content: "›"; }
            [data-dcuf-surface="list-pagination"] [data-dcuf-role="page-direction"][data-dcuf-state="end"]::before { content: "»"; }
            [data-dcuf-surface="list-actions"] { width: calc(100% - 40px); max-width: 1120px; flex-wrap: wrap; box-sizing: border-box; }
            [data-dcuf-surface="list-actions"]::after { content: none; display: none; }
            [data-dcuf-surface="list-actions"] [data-dcuf-role="action-start"],
            [data-dcuf-surface="list-actions"] [data-dcuf-role="action-end"] { float: none; flex-wrap: wrap; }
            [data-dcuf-surface="list-actions"] [data-dcuf-role="action-end"] { margin-inline-start: auto; }
            [data-dcuf-surface="list-pagination"] [data-dcuf-role="page"][data-dcuf-state="current"] {
                border-color: var(--dcuf-control-rim);
                color: var(--dcuf-theme-accent-ink, #245bda);
                font-weight: 650;
                background: var(--dcuf-control-selected-bg);
                box-shadow: var(--dcuf-control-shadow);
            }
            [data-dcuf-surface="list-pagination"]:is([data-dcuf-role="navigation"], [data-dcuf-role="pages"]) a:is(:hover, :focus-visible) { background: var(--dcuf-theme-accent-soft); color: var(--dcuf-theme-accent-ink); }
            [data-dcuf-surface="list-pagination"] [data-dcuf-role="page-jump"] {
                display: flex;
                justify-content: center;
                margin-top: 8px;
            }
            [data-dcuf-surface="list-search"] fieldset {
                min-width: 0;
                margin: 0;
                padding: 0;
                border: 0;
            }
            [data-dcuf-surface="list-search"][data-dcuf-role="search"] { margin-block-end: 160px; }
            [data-dcuf-surface="list-search"] [data-dcuf-role="controls"] {
                display: grid;
                width: 100%;
                max-width: 640px;
                min-width: 0;
                margin: 0 auto;
                box-sizing: border-box;
                grid-template-columns: minmax(112px, 132px) minmax(0, 1fr);
                align-items: center;
                gap: 8px;
            }
            [data-dcuf-surface="list-search"] [data-dcuf-role="select-group"],
            [data-dcuf-surface="list-search"] [data-dcuf-role="query-group"],
            [data-dcuf-surface="list-search"][data-dcuf-role="search"] [data-dcuf-role="query-controls"] {
                position: static;
                display: flex;
                min-width: 0;
                width: auto;
                height: auto;
                align-items: stretch;
                margin: 0;
                padding: 0;
                border: 0;
                background: transparent;
                box-sizing: border-box;
            }
            [data-dcuf-surface="list-search"][data-dcuf-role="search"] [data-dcuf-role="query-controls"] { flex: 1 1 auto; }
            [data-dcuf-surface="list-search"] [data-dcuf-role="legacy-select"][data-dcuf-state="superseded"] { display: none; }
            [data-dcuf-surface="list-search"] [data-dcuf-role="select-shell"] {
                position: relative;
                display: block;
                width: 100%;
                min-width: 0;
                height: auto;
                border: 0;
                padding: 0;
                background: transparent;
                box-sizing: border-box;
            }
            [data-dcuf-surface="list-search"] [data-dcuf-role="select"] {
                display: block;
                width: 100%;
                min-height: 44px;
                box-sizing: border-box;
                padding: 0 10px;
                border: 1px solid var(--dcuf-b1-line, #dfe5ee);
                border-radius: 8px;
                background: var(--dcuf-theme-surface-input, #fff);
                color: var(--dcuf-theme-fg, #273142);
                font: 12px/1.4 system-ui, sans-serif;
            }
            [data-dcuf-surface="list-search"] [data-dcuf-role="field-shell"] {
                display: block;
                flex: 1 1 auto;
                min-width: 0;
                width: auto;
                margin: 0;
                box-sizing: border-box;
                border: 1px solid var(--dcuf-b1-line, #dfe5ee);
                border-radius: 8px 0 0 8px;
                background: var(--dcuf-theme-surface-input, #fff);
                overflow: hidden;
            }
            [data-dcuf-surface="list-search"] [data-dcuf-role="field"] {
                display: block;
                width: 100%;
                min-height: 42px;
                box-sizing: border-box;
                padding: 0 12px;
                border: 0;
                background: transparent;
                color: var(--dcuf-theme-fg, #273142);
                font: 12px/1.4 system-ui, sans-serif;
            }
            [data-dcuf-surface="list-search"] [data-dcuf-role="submit"] {
                display: inline-flex;
                flex: 0 0 46px;
                min-width: 46px;
                min-height: 44px;
                align-items: center;
                justify-content: center;
                margin: 0;
                border: 1px solid var(--dcuf-b1-line, #dfe5ee);
                border-inline-start: 0;
                border-radius: 0 8px 8px 0;
                background: var(--dcuf-theme-surface-input, #fff);
                color: var(--dcuf-theme-accent-ink, #245bda);
            }
            [data-dcuf-surface="list-search"] [data-dcuf-role="submit"]:is(:hover, :focus-visible) { background: var(--dcuf-theme-accent-soft); }
            [data-dcuf-surface="list-search"] [data-dcuf-role="field-shell"]:focus-within { border-color: var(--dcuf-theme-accent-ink); }
            [data-dcuf-surface="list-search"] [data-dcuf-role="submit"]::before {
                content: "";
                display: block;
                width: 20px;
                height: 20px;
                flex: none;
                background: currentColor;
                mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cg fill='none' stroke='black' stroke-width='2' stroke-linecap='round'%3E%3Ccircle cx='10.5' cy='10.5' r='6.5'/%3E%3Cpath d='m16 16 5 5'/%3E%3C/g%3E%3C/svg%3E") center / contain no-repeat;
            }
            [data-dcuf-surface="list-search"] [data-dcuf-role="options-popup"] {
                left: 0;
                top: calc(100% + 8px);
                border: 1px solid var(--dcuf-b1-rim);
                border-radius: 14px;
                background: color-mix(in srgb, var(--dcuf-b1-paper) 96%, transparent);
                box-shadow: var(--dcuf-b1-shadow), inset 0 1px 0 var(--dcuf-b1-rim);
                backdrop-filter: var(--dcuf-b1-floating-filter,blur(24px));
            }
            @media (max-width: 759px) {
                [data-dcuf-surface="list-actions"],
                [data-dcuf-surface="list-pagination"][data-dcuf-role="navigation"],
                [data-dcuf-surface="list-search"] { width: calc(100% - 24px); }
            }
            @media (prefers-reduced-motion: no-preference) {
                [data-dcuf-surface="list-container"] > [data-dcuf-surface="list-item"]:nth-child(-n + 8):not(:has(.dcuf-native-author-open)) {
                    animation: dcuf-list-reveal 180ms backwards;
                    animation-delay: calc((var(--dcuf-list-index, 0)) * 18ms);
                }
                @keyframes dcuf-list-reveal {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            }
            @media (max-width: 520px) {
                [data-dcuf-surface="list-item"] { padding-inline: 13px; }
                [data-dcuf-surface="list-item"] .dcuf-list-meta { align-items: flex-start; flex-direction: column; gap: 3px; }
                [data-dcuf-surface="list-search"] [data-dcuf-role="controls"] { grid-template-columns: 1fr; }
            }
            @media (prefers-reduced-motion: reduce) {
                [data-dcuf-surface="list-item"],
                [data-dcuf-surface="list-item"].dcuf-recent-pulse,
                [data-dcuf-surface="list-toolbar"] [data-dcuf-role="action"],
                [data-dcuf-surface="list-actions"] [data-dcuf-role="action"] { transition: none; animation: none; }
            }
        `;
        const ALLOWED_TAGS = new Set(['a', 'b', 'em', 'i', 'img', 'span', 'strong']);
        const escapeHtml = (value) => String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
        const classText = (classes) => (Array.isArray(classes) ? classes : [])
            .filter((value) => /^[a-zA-Z0-9_-]+$/.test(value))
            .map(escapeHtml)
            .join(' ');
        const isSafeImageSource = (value) => {
            if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return false;
            try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch (_) { return false; }
        };
        const renderAttributes = (attributes, tag) => Object.entries(attributes || {})
            .filter(([name, value]) => /^(?:aria-[a-z0-9_-]+|data-[a-z0-9_-]+|href|target|title)$/.test(name)
                || (tag === 'img' && (name === 'alt'
                    || (name === 'src' && isSafeImageSource(value))
                    || (/^(?:width|height)$/.test(name) && /^[1-9]\d{0,3}$/.test(String(value)) && Number(value) <= 4096))))
            .map(([name, value]) => ` ${name}="${escapeHtml(value)}"`)
            .join('');
        const renderDescriptor = (descriptor) => {
            if (!descriptor || typeof descriptor !== 'object') return '';
            if (descriptor.kind === 'text') return escapeHtml(descriptor.text);
            const tag = ALLOWED_TAGS.has(descriptor.tag) ? descriptor.tag : 'span';
            const classes = classText(descriptor.classes);
            const attributes = renderAttributes(descriptor.attributes, tag);
            if (tag === 'img') return `<img${classes ? ` class="${classes}"` : ''}${attributes}>`;
            const children = (descriptor.children || []).map(renderDescriptor).join('');
            return `<${tag}${classes ? ` class="${classes}"` : ''}${attributes}>${children}</${tag}>`;
        };
        const renderPostItem = (snapshot) => {
            const rowClasses = classText(['custom-post-item', ...(snapshot?.classes || [])]);
            const subject = renderDescriptor(snapshot?.title?.subject);
            const link = snapshot?.title?.link
                ? `<a class="post-title-link" href="${escapeHtml(snapshot.title.link.href)}"${snapshot.title.link.target ? ` target="${escapeHtml(snapshot.title.link.target)}"` : ''}>${(snapshot.title.link.children || []).map(renderDescriptor).join('')}</a>`
                : '';
            const decorations = (snapshot?.title?.decorations || [])
                .map((descriptor) => `<span class="dcuf-title-decoration">${renderDescriptor(descriptor)}</span>`)
                .join('');
            const reply = renderDescriptor(snapshot?.title?.reply);
            const author = renderDescriptor(snapshot?.author);
            return `<div class="${rowClasses}" data-custom-row-id="${escapeHtml(snapshot?.rowId)}" data-dcuf-surface="list-item" data-dcuf-role="row" data-dcuf-state="${escapeHtml(snapshot?.state || 'normal')}">
                <div class="post-title dcuf-list-title"><span class="dcuf-list-subject">${subject}</span>${link.replace('class="post-title-link"', 'class="post-title-link dcuf-list-title-link"')}${decorations}<span class="dcuf-list-reply">${reply}</span></div>
                <div class="post-meta dcuf-list-meta"><span class="author dcuf-list-author">${author}</span><span class="stats dcuf-list-stats">조회 ${escapeHtml(snapshot?.stats?.views || '0')} | 추천 ${escapeHtml(snapshot?.stats?.recommendations || '0')} | ${escapeHtml(snapshot?.stats?.date || '')}</span></div>
            </div>`;
        };
        return Object.freeze({ VERSION, CSS, renderPostItem });
    })();
