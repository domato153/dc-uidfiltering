    const __dcufCommentPresenter = (() => {
        const STYLE_ID = 'dcuf-comment-presenter';
        const cssText = `
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] {
                --dcuf-comment-fg: var(--dcuf-theme-fg, #27313f);
                --dcuf-comment-muted: var(--dcuf-theme-fg-muted, #687384);
                --dcuf-comment-border: var(--dcuf-b1-line, var(--dcuf-theme-border, #d9dde3));
                --dcuf-comment-border-strong: var(--dcuf-theme-border-strong, #cbd2db);
                --dcuf-comment-surface: var(--dcuf-b1-paper, var(--dcuf-theme-surface-raised, #fbfcfd));
                --dcuf-comment-surface-muted: var(--dcuf-theme-surface-muted, #f1f3f6);
                --dcuf-comment-input: var(--dcuf-theme-surface-input, #fff);
                --dcuf-comment-reply: var(--dcuf-theme-reply-surface, #f4f6f8);
                --dcuf-comment-accent: var(--dcuf-theme-accent, #3f6de0);
                --dcuf-comment-accent-strong: var(--dcuf-theme-accent-strong, #315bc1);
                --dcuf-comment-shadow: 0 2px 8px color-mix(in srgb, var(--dcuf-comment-fg) 4%, transparent);
                position: relative;
                inline-size: calc(100% - 2 * var(--dcuf-page-gutter,10px));
                max-inline-size: none;
                margin: 14px auto;
                padding: 12px;
                border: 1px solid var(--dcuf-comment-border);
                border-radius: 16px;
                background: var(--dcuf-comment-surface);
                color: var(--dcuf-comment-fg);
                overflow: visible;
                box-sizing: border-box;
            }
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"].image_comment {
                inline-size: 100%;
                max-inline-size: 100%;
                margin: 0;
                /* Native descendants inherit the image's exact width. Keep
                   this nested root flush; the original composer owns padding. */
                padding: 0;
                border: 0;
            }
            [data-dcuf-role="comment-wrapper"] {
                position: relative;
                overflow: visible;
            }
            [data-dcuf-role="image-comment-pane"] {
                inline-size: 100%;
                max-inline-size: 100%;
                border: 0;
                box-sizing: border-box;
            }
            [data-dcuf-role="comment-wrapper"]:is([data-dcuf-state="closed"], [data-dcuf-state="image-closed"]) {
                overflow: hidden;
            }
            [data-dcuf-role="comment-wrapper"]:is([data-dcuf-state="closed"], [data-dcuf-state="image-closed"]) > [data-dcuf-role="comment-box"] {
                display: none;
            }
            [data-dcuf-role="comment-wrapper"]:is([data-dcuf-state="image-open"], [data-dcuf-state="image-closed"]) {
                background-color: var(--dcuf-theme-canvas, transparent);
            }
            [data-dcuf-role="comment-header"] {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                min-block-size: 44px;
                padding: 10px 14px;
                border: 0;
                border-block-end: 1px solid var(--dcuf-comment-border);
                border-radius: 12px 12px 0 0;
                background: var(--dcuf-comment-surface);
                color: var(--dcuf-comment-fg);
                box-sizing: border-box;
            }
            [data-dcuf-role="comment-count"] {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                color: var(--dcuf-comment-fg);
                font-weight: 750;
            }
            [data-dcuf-role="comment-count-accent"] { color: var(--dcuf-theme-accent-ink, var(--dcuf-comment-accent)); }
            [data-dcuf-role="comment-header-actions"] {
                display: inline-flex;
                align-items: center;
                justify-content: flex-end;
                gap: 8px;
                margin-inline-start: auto;
            }
            [data-dcuf-role="comments-root"] [data-dcuf-role="comment-header"] [data-dcuf-role="native-comment-header-action"] {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-block-size: 32px;
                padding-inline: 11px;
                border: 1px solid transparent;
                border-radius: 8px;
                color: var(--dcuf-comment-muted);
                font-weight: 700;
                transition: transform 110ms ease, filter 110ms ease;
                background: transparent;
                box-shadow: none;
            }
            [data-dcuf-role="comments-root"] [data-dcuf-role="native-comment-header-action"] > span { color: inherit; }
            [data-dcuf-role="comments-root"] [data-dcuf-role="comment-header"] [data-dcuf-role="native-comment-header-action"]::before { display: none; }
            [data-dcuf-role="comment-sort"] .radiobox.imgcheck label { color: var(--dcuf-comment-muted); }
            [data-dcuf-role="comment-sort"] .radiobox.imgcheck input:checked ~ label { color: var(--dcuf-comment-fg); }
            [data-dcuf-role="comment-sort"] .radiobox.imgcheck input + .checkmark { background: none; border: 0; }
            [data-dcuf-role="comment-sort"] .radiobox.imgcheck input:checked + .checkmark::after { content: ''; position: absolute; left: 3px; top: 1px; width: 4px; height: 8px; border-right: 2px solid var(--dcuf-comment-accent); border-bottom: 2px solid var(--dcuf-comment-accent); transform: rotate(45deg); }
            [data-dcuf-role="comments-root"] [data-dcuf-role="comment-header"] [data-dcuf-role="native-comment-header-action"]:is(:hover,:focus-visible) { background: var(--dcuf-control-selected-bg); color: var(--dcuf-theme-accent-ink); }
            [data-dcuf-role="comment-box"] {
                position: relative;
                overflow: visible;
                border: 0;
                border-radius: 12px;
                background-color: var(--dcuf-comment-surface);
                background-image: none;
                box-shadow: none;
                box-sizing: border-box;
            }
            [data-dcuf-role="comment-header"] + [data-dcuf-role="comment-box"] {
                border-start-start-radius: 0;
                border-start-end-radius: 0;
            }
            [data-dcuf-role="comment-list"],
            [data-dcuf-role="reply-list"] {
                margin: 0;
                padding: 0;
                list-style: none;
            }
            [data-dcuf-role="comment-item"] {
                position: relative;
                margin: 0;
                padding: 14px 8px;
                border: 0;
                border-radius: 0;
                background-color: var(--dcuf-comment-surface);
                background-image: none;
                box-shadow: none;
                box-sizing: border-box;
                overflow: visible;
            }
            [data-dcuf-role="comment-list"] > [data-dcuf-role="comment-item"]:first-child { margin-block-start: 0; }
            [data-dcuf-role="comment-list"] > [data-dcuf-role="comment-item"]:last-child { border-block-end: 0; }
            /* The next parent starts the separator,even when native reply
               shells are intervening sibling LIs. No rule above comment text. */
            [data-dcuf-role="comment-list"] > [data-dcuf-role="comment-item"] ~ [data-dcuf-role="comment-item"] { border-block-start: 1px solid var(--dcuf-comment-border); }
            [data-dcuf-role="comments-root"] [data-dcuf-role="comment-footer"] { display: flex; align-items: center; gap: 12px; min-block-size: 40px; margin-block-start: 0; padding: 8px 14px; border-block-start: 1px solid var(--dcuf-comment-border); box-sizing: border-box; }
            [data-dcuf-role="comment-footer"] [data-dcuf-role="comment-footer-pages"] { position: static; flex: 1; margin: 0; padding: 0; text-align: center; font-size: 12px; line-height: 1.5; }
            [data-dcuf-role="comment-footer"] [data-dcuf-role="comment-footer-actions"] { position: static; display: inline-flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 10px; margin: 0; padding: 0; font-size: 12px; }
            [data-dcuf-role="comment-footer-actions"] > :is(a,button) { display: inline-flex; align-items: center; min-block-size: 28px; padding: 0; border: 0; background: transparent; color: var(--dcuf-comment-muted); font: inherit; cursor: pointer; }
            [data-dcuf-role="comment-footer-actions"] > :is(a,button):is(:hover,:focus-visible) { color: var(--dcuf-theme-accent-ink); }
            [data-dcuf-role="comment-item"].dcuf-comment-shell-blocked > :not([data-dcuf-role="reply-shell"]) {
                display: none;
            }
            [data-dcuf-role="comment-item"].dcuf-comment-shell-blocked {
                min-block-size: 0;
                padding-block-start: 8px;
            }
            [data-dcuf-role="comment-info"],
            [data-dcuf-role="reply-info"] {
                position: relative;
                z-index: auto;
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 10px;
                min-block-size: 0;
                overflow: visible;
                padding: 0;
                border-block-start: 0;
            }
            [data-dcuf-role="reply-info"] { flex-wrap: wrap; }
            [data-dcuf-role="comment-content-stack"] {
                display: flex;
                flex-direction: column;
                min-inline-size: 0;
                inline-size: 100%;
                gap: 7px;
            }
            [data-dcuf-role="comment-content-stack"] > [data-dcuf-role="comment-author-group"] {
                float: none;
                inline-size: auto;
                margin: 0;
            }
            [data-dcuf-role="comments-root"] [data-dcuf-role="comment-content-stack"] [data-dcuf-role="comment-body"],
            [data-dcuf-role="comments-root"] [data-dcuf-role="comment-content-stack"] [data-dcuf-role="reply-body"],
            [data-dcuf-role="comments-root"] [data-dcuf-role="comment-content-stack"] [data-dcuf-role="comment-text"] {
                float: none;
                inline-size: 100%;
                max-inline-size: 100%;
                box-sizing: border-box;
            }
            [data-dcuf-role="reply-info"] > [data-dcuf-role="reply-body"] { flex: 1 1 100%; }
            @media (min-width: 760px) {
                [data-dcuf-role="comment-info"], [data-dcuf-role="reply-info"] { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: start; gap: 7px 16px; }
                [data-dcuf-role="comment-content-stack"] { display: grid; grid-template-columns: 128px minmax(0, 1fr); align-items: start; gap: 7px 16px; }
                [data-dcuf-role="comment-info"] > [data-dcuf-role="comment-author-group"] { grid-column: 1; }
                [data-dcuf-role="comment-info"]:not(:has(> [data-dcuf-role="comment-content-stack"])) { grid-template-columns: 128px minmax(0, 1fr) auto; }
                [data-dcuf-role="reply-info"]:not(:has(> [data-dcuf-role="comment-content-stack"])) { grid-template-columns: 128px minmax(0, 1fr) auto; }
                [data-dcuf-role="comment-info"] > [data-dcuf-role="comment-author-group"], [data-dcuf-role="comment-content-stack"] > [data-dcuf-role="comment-author-group"] { grid-column: 1; grid-row: 1 / 3; }
                [data-dcuf-role="comment-info"] > [data-dcuf-role="comment-body"], [data-dcuf-role="comment-content-stack"] > :is([data-dcuf-role="comment-body"], [data-dcuf-role="comment-meta"]) { grid-column: 2; }
                [data-dcuf-role="comment-info"] > [data-dcuf-role="comment-meta"], [data-dcuf-role="reply-info"] > [data-dcuf-role="comment-meta"] { grid-column: -2; grid-row: 1; }
            }
            [data-dcuf-role="comment-author-group"] {
                position: relative;
                display: inline-flex;
                align-items: center;
                flex: 1 1 auto;
                flex-wrap: nowrap;
                float: none;
                inline-size: auto;
                max-inline-size: 100%;
                min-inline-size: 0;
                overflow: visible;
            }
            [data-dcuf-comment-role="author"] {
                display: inline-block;
                max-inline-size: min(62vw, 340px);
                overflow: hidden;
                color: var(--dcuf-comment-fg);
                font-size: 13px;
                font-weight: 800;
                font-style: normal;
                text-overflow: ellipsis;
                white-space: nowrap;
                vertical-align: middle;
            }
            [data-dcuf-comment-role="author"][data-dcuf-comment-state="self"] { color: var(--dcuf-theme-accent-ink, var(--dcuf-comment-accent)); }
            [data-dcuf-role="comment-meta"] {
                display: inline-flex;
                align-items: center;
                flex: 0 0 auto;
                gap: 7px;
                margin-inline-start: auto;
                color: var(--dcuf-comment-muted);
                font-size: 12px;
                white-space: nowrap;
            }
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-comment-role="icon-action"] {
                position: relative;
                inline-size: 32px;
                block-size: 32px;
                margin: 0;
                padding: 0;
                border: 0;
                border-radius: 8px;
                appearance: none;
                background: transparent;
                box-shadow: none;
                color: var(--dcuf-comment-muted);
                font-size: 0;
                line-height: 0;
                cursor: pointer;
                box-sizing: border-box;
            }
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-comment-role="icon-action"]::before {
                content: "";
                position: absolute;
                inset-block-start: 50%;
                inset-inline-start: 50%;
                inline-size: 14px;
                block-size: 14px;
                background: currentColor;
                mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='m4 4 8 8M12 4l-8 8' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E") center/contain no-repeat;
                transform: translate(-50%, -50%);
            }
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-comment-role="icon-action"]:not(:disabled):hover { background: var(--dcuf-control-secondary-bg); }
            [data-dcuf-comment-role="icon-action"]:focus-visible { outline: 2px solid var(--dcuf-comment-accent); outline-offset: 2px; }
            [data-dcuf-comment-role="icon-action"]:disabled { opacity: .5; cursor: default; }
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-comment-role="icon-action"][hidden] { display: none; }
            [data-dcuf-comment-role="nickname-field"] { position: relative; }
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-comment-role="nickname-field"] [data-dcuf-role="native-comment-field"] { padding-inline-end: 44px; }
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-comment-role="icon-action"][data-dcuf-comment-state="clear"] {
                position: absolute;
                inset-block-start: 3px;
                inset-inline-end: 4px;
            }
            [data-dcuf-role="comment-body"],
            [data-dcuf-role="reply-body"] {
                position: static;
                clear: both;
                inline-size: auto;
                min-inline-size: 0;
                max-inline-size: none;
                padding-block-start: 7px;
                background: transparent;
                overflow: visible;
            }
            [data-dcuf-role="comment-text"] {
                margin: 0;
                color: var(--dcuf-comment-fg);
                font-size: clamp(16px, 4.2vw, 19px);
                line-height: 1.58;
                overflow-wrap: anywhere;
                -webkit-text-size-adjust: 100%;
                text-size-adjust: 100%;
            }
            [data-dcuf-role="comment-media"] {
                display: block;
                max-inline-size: 100%;
                block-size: auto;
                margin-block-start: 8px;
                border-radius: 12px;
            }
            [data-dcuf-role="reply-shell"] {
                position: relative;
                margin-block-start: 10px;
                padding-block-start: 0;
                border: 0;
                background: transparent;
                overflow: visible;
            }
            [data-dcuf-role="detached-reply-item"] {
                position: relative;
                margin: 8px 10px 10px;
                padding: 0;
                border: 0;
                background: transparent;
                box-shadow: none;
                overflow: visible;
            }
            [data-dcuf-role="detached-reply-item"] > [data-dcuf-role="reply-shell"] { margin-block-start: 0; }
            [data-dcuf-role="reply-box"] {
                position: relative;
                margin-inline-start: 18px;
                padding: 9px 12px 10px 14px;
                border: 0;
                border-inline-start: 1px solid var(--dcuf-comment-border-strong);
                border-radius: 8px;
                background-color: var(--dcuf-comment-reply);
                background-image: none;
                overflow: visible;
                box-sizing: border-box;
            }
            [data-dcuf-role="reply-list"] > [data-dcuf-role="reply-item"] {
                position: relative;
                margin: 0;
                padding: 8px 0;
                border: 0;
                background: transparent;
                box-shadow: none;
                overflow: visible;
            }
            [data-dcuf-role="reply-list"] > [data-dcuf-role="reply-item"] + [data-dcuf-role="reply-item"] {
                border-block-start: 1px solid var(--dcuf-comment-border);
            }
            [data-dcuf-role="reply-item"] [data-dcuf-role="comment-author-group"],
            [data-dcuf-role="reply-item"] [data-dcuf-role="reply-body"] {
                padding-inline-start: 22px;
            }
            [data-dcuf-role="reply-item"] [data-dcuf-role="comment-author-group"]::before {
                content: "ㄴ";
                position: absolute;
                inset-inline-start: 3px;
                inset-block-start: 1px;
                color: var(--dcuf-comment-muted);
                font-size: 13px;
                font-weight: 750;
                line-height: 1;
            }
            [data-dcuf-role="reply-body"] [data-dcuf-role="comment-text"] {
                inline-size: auto;
                max-inline-size: 100%;
                margin: 0;
                padding: 0;
            }
            [data-dcuf-role="reply-body"] [data-dcuf-role="comment-text"]::before,
            [data-dcuf-role="reply-body"] [data-dcuf-role="comment-media"]::before { content: none; display: none; }
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-role="comment-composer"] {
                display: grid;
                grid-template-columns: minmax(120px, 150px) minmax(0, 1fr);
                align-items: stretch;
                gap: 12px;
                margin-block-start: 14px;
                padding: 16px;
                border: 1px solid var(--dcuf-comment-border);
                border-radius: 16px;
                background-color: var(--dcuf-comment-surface);
                background-image: none;
                box-shadow: none;
                box-sizing: border-box;
                overflow: visible;
            }
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-role="comment-composer"][data-dcuf-state="reply"] {
                grid-template-columns: minmax(100px, 140px) minmax(0, 1fr);
                margin-block-start: 10px;
                padding: 10px;
                border-radius: 13px;
                box-shadow: none;
            }
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-role="comment-identity-fields"] {
                grid-column: 1;
                display: grid;
                align-content: start;
                gap: 8px;
                min-inline-size: 0;
                inline-size: 100%;
                background: transparent;
            }
            [data-dcuf-surface="comments-replies"] [data-dcuf-role="comment-field-shell"] {
                inline-size: 100%;
                block-size: auto;
                margin-block-end: 0;
                border: 0;
                background: transparent;
                box-sizing: border-box;
            }
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-role="comment-editor"] {
                grid-column: 2;
                display: flex;
                min-inline-size: 0;
                max-inline-size: 100%;
                flex-direction: column;
                gap: 12px;
                padding: 10px;
                border: 1px solid var(--dcuf-comment-border);
                border-radius: 13px;
                background: var(--dcuf-comment-input);
                overflow: visible;
                box-sizing: border-box;
                float: none;
                margin: 0;
            }
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-role="comment-input-box"] {
                float: none;
                min-inline-size: 0;
                inline-size: 100%;
                max-inline-size: 100%;
                box-sizing: border-box;
            }
            [data-dcuf-role="comment-input-hint"] { color: var(--dcuf-comment-muted); }
            [data-dcuf-comment-role="image-nickname-input"] {
                /* Existing sync hides the canonical input; native inline style hides this editable one. */
                display: block !important;
            }
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-role="native-comment-field"],
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-role="native-comment-textarea"] {
                inline-size: 100%;
                min-inline-size: 0;
                max-inline-size: 100%;
                border: 1px solid var(--dcuf-comment-border);
                border-radius: 8px;
                background: var(--dcuf-comment-input);
                color: var(--dcuf-comment-fg);
                box-sizing: border-box;
            }
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-role="native-comment-field"] {
                display: block;
                min-block-size: 38px;
                margin-block-end: 0;
                padding-inline: 11px;
            }
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-role="native-comment-textarea"] {
                display: block;
                /* Native small-composer CSS and inline width both retain927px.
                   The editor owns this visual width,not the host's old viewport. */
                inline-size: 100% !important;
                min-block-size: 112px;
                padding: 12px 14px;
                border: 1px solid var(--dcuf-comment-border);
                border-radius: 8px;
                resize: vertical;
            }
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-role="comment-composer-actions"] {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                justify-content: flex-end;
                gap: 8px;
                min-block-size: 44px;
                padding: 0;
                border: 0;
                background: transparent;
                border-radius: 0;
                box-sizing: border-box;
                overflow: visible;
            }
            [data-dcuf-role="comments-root"] [data-dcuf-role="comment-composer"][data-dcuf-state="image"] [data-dcuf-role="comment-composer-actions"] {
                float: none;
                margin: 0;
                inline-size: 100%;
            }
            [data-dcuf-role="comment-composer-actions"]::after { content: none; display: none; }
            [data-dcuf-role="comment-tool-group"] {
                display: flex;
                flex-wrap: wrap;
                float: none;
                align-items: center;
                gap: 8px;
            }
            [data-dcuf-role="comment-submit-group"] {
                display: flex;
                flex-wrap: wrap;
                float: none;
                align-items: center;
                justify-content: flex-end;
                gap: 8px;
                margin-inline-start: auto;
            }
            [data-dcuf-surface="comments-replies"] [data-dcuf-role="native-comment-tool"] {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                inline-size: auto;
                block-size: auto;
                min-block-size: 34px;
                padding: 6px 10px;
                border: 0;
                border-radius: 6px;
                color: var(--dcuf-comment-fg);
                white-space: nowrap;
                line-height: 1.25;
                box-sizing: border-box;
                background: transparent;
                box-shadow: none;
            }
            [data-dcuf-role="native-comment-tool"]:is(:hover,:focus-visible) { background: var(--dcuf-control-selected-bg); color: var(--dcuf-theme-accent-ink); }
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-role="native-comment-submit"] {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-block-size: 40px;
                inline-size: auto;
                block-size: auto;
                padding: 8px 14px;
                border: 1px solid var(--dcuf-v7-primary-rim);
                border-radius: 8px;
                color: var(--dcuf-v7-primary-ink);
                font-weight: 600;
                white-space: nowrap;
                text-shadow: none;
                line-height: 1.25;
                box-sizing: border-box;
                transition: transform 110ms ease, filter 110ms ease;
                background: var(--dcuf-v7-primary-bg);
                box-shadow: var(--dcuf-v7-primary-shadow);
            }
            /* Native image composers size this action70x70 through five
               host classes. The image-state reset changes size, not paint. */
            [data-dcuf-role="comments-root"] [data-dcuf-role="comment-composer"][data-dcuf-state="image"] [data-dcuf-role="comment-composer-actions"] [data-dcuf-role="native-comment-submit"] {
                inline-size: auto;
                block-size: auto;
            }
            [data-dcuf-role="native-comment-header-action"]:active,
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-role="native-comment-submit"]:active {
                transform: translateY(1px);
                filter: brightness(.96);
            }
            [data-dcuf-role="native-comment-header-action"]:focus-visible,
            [data-dcuf-role="native-comment-tool"]:focus-visible,
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-role="native-comment-field"]:focus-visible,
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-role="native-comment-textarea"]:focus-visible,
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-role="native-comment-submit"]:focus-visible {
                outline: 2px solid var(--dcuf-comment-accent);
                outline-offset: 2px;
            }
            [data-dcuf-role="native-comment-popup"] {
                z-index: 2147483647;
                overflow: visible;
            }
            @media (prefers-reduced-motion: no-preference) {
                [data-dcuf-role="comments-root"] .dccon_guidebox > :is(#div_con, #div_txtcon),
                [data-dcuf-role="native-comment-popup"]:is([data-dcuf-comment-role="comment-picker"], [data-dcuf-comment-role="comment-detail"], [data-dcuf-comment-role="comment-info"], [data-dcuf-comment-role="comment-folder"]) {
                    animation: dcuf-comment-popup-enter 180ms cubic-bezier(.2,.8,.2,1);
                    @supports (transition-behavior: allow-discrete) {
                        transition: opacity 130ms ease-in, display 130ms allow-discrete;
                        &:is([style*="display:none"], [style*="display: none"]) { animation: none; opacity: 0; pointer-events: none; }
                    }
                }
                @keyframes dcuf-comment-popup-enter { from { opacity: 0; } }
            }
            [data-dcuf-role="comments-root"] [data-dcuf-role="native-comment-popup"]:not(.dcuf-native-author-anchor):not(.dcuf-native-author-menu):not(.dcuf-native-memo):not(.dcuf-native-memo-picker) {
                border: 1px solid var(--dcuf-b1-rim, var(--dcuf-comment-border));
                border-radius: 16px;
                background: var(--dcuf-b1-sheen, none), var(--dcuf-b1-floating, var(--dcuf-comment-surface));
                color: var(--dcuf-comment-fg);
                box-shadow: var(--dcuf-b1-shadow), inset 0 1px 0 var(--dcuf-b1-rim);
                backdrop-filter: var(--dcuf-b1-floating-filter,blur(24px) saturate(1.15));
                box-sizing: border-box;
            }
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-picker"] {
                /* Native textcon/DCCon write inline left:0;top:38px.
                   Only these verified pickers use the centered dialog geometry. */
                position: fixed;
                left: 50% !important;
                top: var(--dcuf-picker-center, 50%) !important;
                bottom: auto;
                right: auto;
                transform: translate(-50%, -50%);
                inline-size: min(480px, calc(100vw - 32px));
                max-inline-size: calc(100vw - 32px);
                max-block-size: calc(100dvh - var(--dcuf-picker-clearance, 32px));
                overflow: auto;
                overscroll-behavior: contain;
                scrollbar-color: var(--dcuf-comment-border-strong) transparent;
            }
            /* These four native shells use inline show/hide. CSS-hover helper
               roots are excluded:their projected state alone is not visibility. */
            [data-dcuf-comment-role="comment-picker"]:has(:is([id="favoriteFolderLayer"], [id="favoriteFolderAddLayer"], [id="favoriteFolderSelectLayer"], [id="folderEditLayer"])[data-dcuf-state="open"]) { overflow: visible; }
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-picker"] > [data-dcuf-comment-role="popup-panel"] {
                inline-size: 100%;
                min-inline-size: 0;
                max-inline-size: 100%;
                padding: 20px;
                border: 0;
                border-radius: inherit;
                background: transparent;
                color: inherit;
                box-sizing: border-box;
            }
            [data-dcuf-comment-role="popup-content-stack"] { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; inline-size: 100%; min-inline-size: 0; margin: 0; padding: 0; box-sizing: border-box; }
            [data-dcuf-comment-role="comment-picker"] [data-dcuf-comment-role="popup-heading"] {
                position: relative; inset: auto; display: grid; gap: 4px; inline-size: auto; block-size: auto; overflow: visible; visibility: visible;
                margin: -20px -20px 16px; padding: 18px 20px 14px;
                border-block-end: 1px solid var(--dcuf-comment-border);
                background: var(--dcuf-b1-sheen, none); border-radius: 16px 16px 0 0;
            }
            [data-dcuf-comment-role="popup-content-stack"] > [data-dcuf-comment-role="popup-heading"] { margin-block-end: 0; }
            [data-dcuf-comment-role="popup-panel"] > [data-dcuf-comment-role="popup-heading"] { position: relative; inset: auto; inline-size: auto; block-size: auto; width: auto; height: auto; overflow: visible; }
            [data-dcuf-comment-role="popup-title"] { display: block; float: none; margin: 0; color: inherit; font: 750 16px/1.5 system-ui, sans-serif; letter-spacing: -.015em; }
            [data-dcuf-comment-role="popup-content-stack"] > [data-dcuf-comment-role="popup-heading"] > [data-dcuf-comment-role="popup-help"] { display: block; margin: 0; color: var(--dcuf-comment-muted); font: 400 12px/1.5 system-ui, sans-serif; }
            [data-dcuf-comment-role="popup-preview-shell"] { display: flex; justify-content: center; inline-size: 100%; max-inline-size: 100%; block-size: auto; min-inline-size: 0; margin: 0; padding: 0; border: 0; }
            [data-dcuf-comment-role="popup-preview"] { max-inline-size: 100%; border-radius: 10px; overflow: hidden; }
            [data-dcuf-comment-role="popup-color-groups"] { display: flex; flex-wrap: wrap; justify-content: flex-start; gap: 16px 24px; min-inline-size: 0; margin: 0; }
            [data-dcuf-comment-role="popup-color-group"] { display: block; min-inline-size: 0; }
            [data-dcuf-comment-role="popup-color-group"] > [data-dcuf-comment-role="popup-field-label"] { margin: 0 0 8px; color: var(--dcuf-comment-muted); font: 600 12px/1.4 system-ui, sans-serif; }
            [data-dcuf-comment-role="popup-swatches"] { display: flex; flex-wrap: wrap; gap: 8px; }
            [data-dcuf-comment-role="popup-swatches"] > [data-dcuf-comment-role="popup-swatch"] { box-sizing: border-box; inline-size: 28px; block-size: 28px; padding: 0; border: 1px solid var(--dcuf-comment-border-strong); border-radius: 50%; cursor: pointer; }
            [data-dcuf-comment-role="popup-recent-list"] { margin: 0; padding: 0; list-style: none; }
            [data-dcuf-comment-role="popup-input-section"] { margin: 0; min-inline-size: 0; }
            [data-dcuf-comment-role="popup-recent"]:has(> [data-dcuf-comment-role="popup-recent-list"]:empty) { display: none; }
            [data-dcuf-comment-role="popup-swatch"][aria-pressed="true"] { outline: 2px solid var(--dcuf-comment-accent); outline-offset: 2px; }
            [data-dcuf-comment-role="popup-toolbar"] { position: relative; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; inline-size: 100%; min-inline-size: 0; padding-block-end: 14px; margin-block-end: 12px; border-block-end: 1px solid var(--dcuf-comment-border); box-sizing: border-box; }
            [data-dcuf-comment-role="popup-toolbar-side"] { display: flex; align-items: center; gap: 8px; float: none; min-inline-size: 0; }
            [data-dcuf-comment-role="popup-toolbar"] > .right { float: none; inline-size: auto; min-inline-size: 0; }
            .dcconlayer.edit [data-dcuf-comment-role="popup-toolbar"].daewangcon { block-size: auto; padding: 0 0 14px; }
            .dcconlayer.edit .daewangcon [data-dcuf-comment-role="popup-toolbar-side"] { block-size: auto; padding: 0; float: none; font-size: 13px; }
            [data-dcuf-comment-role="popup-toolbar"] > .right { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 4px; margin-inline-start: auto; }
            [data-dcuf-comment-role="popup-toolbar-side"] > [data-dcuf-comment-role="popup-action"] { inline-size: auto; min-inline-size: max-content; max-inline-size: max-content; block-size: auto; white-space: nowrap; }
            [data-dcuf-comment-role="popup-toolbar-side"] > [data-dcuf-comment-role="popup-action"] > .blind { position: static; inset: auto; display: inline; width: auto; height: auto; margin: 0; overflow: visible; visibility: visible; font: inherit; }
            [data-dcuf-comment-role="popup-toolbar-side"] > [data-dcuf-comment-role="popup-action"] > .sp_img { display: none; }
            [data-dcuf-comment-role="popup-toolbar-side"] > [data-dcuf-comment-role="popup-action"].on { background: var(--dcuf-v7-primary-fill); color: var(--dcuf-v7-primary-ink); box-shadow: none; }
            [data-dcuf-comment-role="popup-media-wrap"] > .inner { block-size: auto; margin: 0; padding: 0; border: 0; }
            [data-dcuf-comment-role="popup-pack-controls"] { display: grid; grid-template-columns: 36px minmax(0, 1fr) 36px; align-items: center; gap: 6px; float: none; inline-size: 100%; min-inline-size: 0; block-size: auto; margin-block-end: 12px; border: 0; background: transparent; overflow: visible; box-sizing: border-box; }
            [data-dcuf-comment-role="popup-pack-controls"] > [data-dcuf-comment-role="popup-action"] { position: static; inset: auto; min-inline-size: 36px; max-inline-size: 36px; block-size: 44px; min-block-size: 44px; padding: 0; box-sizing: border-box; }
            [data-dcuf-comment-role="comment-picker"] [data-dcuf-comment-role="popup-pack-controls"] > .tab_btnlist { display: flex; flex-wrap: nowrap; gap: 4px; float: none; inline-size: auto; max-inline-size: 100%; block-size: auto; min-inline-size: 0; margin: 0; padding: 0; overflow-x: auto; overflow-y: hidden; background: transparent; list-style: none; scrollbar-width: thin; }
            [data-dcuf-comment-role="popup-pack-controls"] .tab_btnlist > li { flex: none; float: none; inline-size: auto; max-inline-size: 44px; block-size: auto; margin: 0; padding: 0; background: transparent; border: 0; }
            [data-dcuf-comment-role="popup-pack-controls"] .tab_btnlist > li > .frame { display: none; }
            [data-dcuf-comment-role="popup-pack-controls"] .tab_btnlist [data-dcuf-comment-role="popup-action"] { box-sizing: border-box; inline-size: 44px; block-size: 44px; min-inline-size: 44px; min-block-size: 44px; margin: 0; padding: 4px; }
            [data-dcuf-comment-role="popup-pack-controls"] .tab_btnlist img { inline-size: 36px; block-size: 36px; object-fit: contain; }
            [data-dcuf-comment-role="popup-pack-controls"] .tab_btnlist > .on > [data-dcuf-comment-role="popup-action"] { background: var(--dcuf-v7-primary-fill); color: var(--dcuf-v7-primary-ink); box-shadow: none; }
            [data-dcuf-role="native-comment-popup"] [data-dcuf-comment-role="popup-media-wrap"],
            [data-dcuf-role="native-comment-popup"] [data-dcuf-comment-role="popup-media-list"] { inline-size: 100%; max-inline-size: 100%; min-inline-size: 0; margin-inline: 0; padding-inline: 0; box-sizing: border-box; }
            [data-dcuf-role="native-comment-popup"] [data-dcuf-comment-role="popup-media-list"] { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; line-height: 0; }
            [data-dcuf-role="native-comment-popup"] [data-dcuf-comment-role="popup-media-list"]::after { content: none; }
            [data-dcuf-comment-role="popup-media-list"] > li[data-dcuf-comment-role="popup-media-item"] { display: block; float: none; inline-size: auto; min-inline-size: 0; margin: 0; padding: 0; box-sizing: border-box; }
            [data-dcuf-comment-role="popup-media-list"] > .dccon_list_btm { grid-column: 1 / -1; }
            [data-dcuf-comment-role="popup-media-list"] .dccon_list_paging { display: flex; align-items: center; justify-content: center; gap: 8px; max-inline-size: 100%; min-inline-size: 0; box-sizing: border-box; }
            [data-dcuf-comment-role="popup-media-list"] .dccon_list_paging > button[data-dcuf-comment-role="popup-action"] { inline-size: 36px; min-inline-size: 36px; block-size: 36px; min-block-size: 36px; padding: 0; }
            [data-dcuf-comment-role="comment-picker"] .tabbox_btn { display: flex; flex-wrap: wrap; gap: 4px; inline-size: auto; margin: 0; padding: 4px; border: 0; border-radius: 8px; background: var(--dcuf-v7-reading); }
            [data-dcuf-comment-role="comment-picker"] .tabbox_btn.angled > button[data-dcuf-comment-role="popup-action"] { float: none; inline-size: auto; min-inline-size: 44px; max-inline-size: max-content; block-size: auto; min-block-size: 36px; margin: 0; padding: 7px 10px; border: 0; border-radius: 6px; background: transparent; color: var(--dcuf-comment-fg); box-shadow: none; text-shadow: none; }
            [data-dcuf-comment-role="comment-picker"] .tabbox_btn.angled > button[data-dcuf-comment-role="popup-action"].on { border: 0; background: var(--dcuf-v7-primary-fill); color: var(--dcuf-v7-primary-ink); }
            [data-dcuf-comment-role="comment-picker"] .tabbox_btn.angled > button[data-dcuf-comment-role="popup-action"]::before { content: none; }
            [data-dcuf-role="native-comment-popup"] [data-dcuf-comment-role="popup-media-button"] { inline-size: 100%; block-size: auto; min-block-size: 44px; padding: 0; border: 0; border-radius: 8px; background: transparent; }
            [data-dcuf-comment-role="popup-media-button"] img { max-inline-size: 100%; block-size: auto; }
            [data-dcuf-comment-role="popup-media-item"]:focus-within > .btn_starmark { display: block; }
            [data-dcuf-comment-role="comment-picker"] .dccon_list_box.setting { min-inline-size: 0; padding: 0; margin-block-start: 8px; color: var(--dcuf-comment-fg); font: 400 12px/1.5 system-ui, sans-serif; }
            [data-dcuf-comment-role="comment-picker"] .setting .table_head { inline-size: 100%; min-inline-size: 0; margin-block: 12px 0; padding: 0; border: 0; }
            [data-dcuf-comment-role="comment-picker"] .setting .setting_cl { max-block-size: 294px; overflow: auto; border-radius: 8px; background: var(--dcuf-v7-reading); }
            [data-dcuf-comment-role="comment-picker"] .dccon_storage_table { inline-size: 100%; min-inline-size: 450px; block-size: auto; border-collapse: collapse; color: inherit; }
            [data-dcuf-comment-role="comment-picker"] .dccon_storage_table thead { block-size: auto; }
            [data-dcuf-comment-role="comment-picker"] .dccon_storage_table thead tr { position: static; }
            [data-dcuf-comment-role="comment-picker"] .dccon_storage_table th { block-size: 34px; padding: 6px 8px; border: 0; border-block-end: 1px solid var(--dcuf-comment-border-strong); color: var(--dcuf-comment-muted); font-weight: 600; white-space: nowrap; }
            [data-dcuf-comment-role="comment-picker"] .dccon_storage_table td { block-size: auto; padding: 8px; border: 0; border-block-end: 1px solid var(--dcuf-comment-border); vertical-align: middle; }
            [data-dcuf-comment-role="comment-picker"] .setting .storage_name { block-size: auto; max-inline-size: 18ch; line-height: 1.5; overflow-wrap: anywhere; text-align: start; }
            [data-dcuf-comment-role="comment-picker"] .setting .dccon_infobox { margin-block: 14px; padding: 10px 12px; border-radius: 8px; background: var(--dcuf-v7-reading); color: var(--dcuf-comment-muted); }
            [data-dcuf-comment-role="comment-picker"] .setting > .btn_box { display: flex; justify-content: flex-end; gap: 8px; margin-block-start: 16px; padding: 0; border: 0; }
            [data-dcuf-comment-role="comment-picker"] .setting > .btn_box > button { inline-size: auto; block-size: auto; margin: 0; }
            [data-dcuf-comment-role="comment-picker"] .setting > .btn_box > [data-dcuf-comment-role="popup-action"] { border: 0; border-radius: 8px; }
            [data-dcuf-comment-role="comment-picker"] .setting .dccon_use { block-size: auto; padding: 0; border: 0; background: transparent; color: inherit; }
            [data-dcuf-comment-role="comment-picker"] .setting .dccon_use .option_box { padding: 6px; border: 1px solid var(--dcuf-comment-border); border-radius: 8px; background: var(--dcuf-v7-reading); color: var(--dcuf-comment-fg); }
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-detail"] {
                inline-size: min(715px, calc(100vw - 32px)); max-inline-size: 100%; block-size: auto;
                /* Native .cmt_txtbox #package_detail adds a 167px margin after
                   its offset is set. Keep the native offset,not that legacy gutter. */
                margin: 0 !important; padding: 12px;
            }
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-detail"] > [data-dcuf-comment-role="popup-panel"],
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-info"] > [data-dcuf-comment-role="popup-panel"] {
                inline-size: 100%; min-inline-size: 0; max-inline-size: 100%; padding: 0; border: 0; background: transparent; color: inherit; box-sizing: border-box;
            }
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-detail"] [data-dcuf-comment-role="popup-detail-heading"] { block-size: auto; padding: 2px 40px 12px 4px; border: 0; background: transparent; color: var(--dcuf-comment-fg); }
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-detail"] h3[data-dcuf-comment-role="popup-title"] { margin: 0; color: inherit; font: 750 16px/1.5 system-ui, sans-serif; }
            [data-dcuf-comment-role="popup-detail-summary"] { display: grid; grid-template-columns: 140px minmax(0, 1fr); gap: 16px; padding: 16px; border: 0; border-radius: 10px 10px 0 0; background: var(--dcuf-v7-reading); box-sizing: border-box; }
            [data-dcuf-comment-role="popup-detail-summary"]::after,
            [data-dcuf-comment-role="popup-detail-actions"]::after { content: none; }
            [data-dcuf-comment-role="popup-detail-thumbnail"] { float: none; inline-size: auto; block-size: auto; padding: 0; }
            [data-dcuf-comment-role="popup-detail-thumbnail"] > img { display: block; max-inline-size: 100%; block-size: auto; margin: 0; border-radius: 8px; }
            [data-dcuf-comment-role="comment-detail"] .dccon_popinfo [data-dcuf-comment-role="popup-detail-info"] { float: none; inline-size: auto; min-inline-size: 0; block-size: auto; padding: 0; background: transparent; }
            [data-dcuf-comment-role="popup-detail-actions"] { display: flex; align-items: flex-start; gap: 12px; }
            [data-dcuf-comment-role="popup-detail-title"] { flex: 1; min-inline-size: 0; margin: 4px 0 0; color: var(--dcuf-comment-fg); font: 700 16px/1.45 system-ui, sans-serif; overflow-wrap: anywhere; }
            [data-dcuf-comment-role="popup-detail-body"] { margin-block-start: 10px; color: var(--dcuf-comment-fg); font: 400 12px/1.6 system-ui, sans-serif; overflow-wrap: anywhere; }
            [data-dcuf-comment-role="popup-detail-body"] .inner_txt { margin: 0 0 8px; font: inherit; }
            [data-dcuf-comment-role="comment-detail"] [data-dcuf-comment-role="popup-detail-meta"] { margin-block: 4px; color: color-mix(in srgb, var(--dcuf-comment-fg) 75%, var(--dcuf-comment-muted)); font: 400 11px/1.6 system-ui, sans-serif; overflow-wrap: anywhere; }
            [data-dcuf-comment-role="popup-detail-meta"] .tbox { padding: 0; margin-inline-end: 4px; border: 0; background: transparent; color: inherit; font: inherit; }
            /* Match the native edit variant's actual link cascade locally. */
            [data-dcuf-comment-role="comment-detail"] a[data-dcuf-comment-role="popup-detail-link"],
            [data-dcuf-comment-role="comment-detail"] .dccon_popinfo.edit a[data-dcuf-comment-role="popup-detail-link"] { color: var(--dcuf-theme-accent-ink, var(--dcuf-comment-accent-strong)); font: 400 12px/1.6 system-ui, sans-serif; text-underline-offset: 2px; }
            [data-dcuf-comment-role="popup-detail-link"]:focus-visible { outline: 2px solid var(--dcuf-comment-accent); outline-offset: 2px; }
            [data-dcuf-comment-role="comment-detail"] [data-dcuf-comment-role="popup-detail-media"] { inline-size: 100%; min-inline-size: 0; block-size: auto; max-block-size: min(360px, 48dvh); padding: 12px; overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain; background: var(--dcuf-v7-reading); border-radius: 0 0 10px 10px; box-sizing: border-box; scrollbar-color: var(--dcuf-comment-border-strong) transparent; }
            [data-dcuf-comment-role="comment-detail"] [data-dcuf-comment-role="popup-media-list"] { grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; }
            [data-dcuf-comment-role="comment-detail"] [data-dcuf-comment-role="popup-media-button"] { display: block; min-block-size: 0; border-radius: 0; }
            [data-dcuf-comment-role="comment-detail"] [data-dcuf-comment-role="popup-media-button"] > img { display: block; inline-size: 100%; block-size: auto; margin: 0; border-radius: 0; object-fit: contain; }
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-info"] { left: auto; bottom: auto; inline-size: min(360px, calc(100vw - 32px)); max-inline-size: 100%; }
            [data-dcuf-comment-role="comment-info"] .ly_daewang .inner { block-size: auto; border: 0; padding: 24px 42px 24px 20px; text-align: start; color: var(--dcuf-comment-fg); font: 400 13px/1.6 system-ui, sans-serif; }
            [data-dcuf-comment-role="comment-info"] .ly_daewang .tit { margin: 0 0 10px; color: inherit; font: 700 16px/1.5 system-ui, sans-serif; }
            [data-dcuf-comment-role="comment-info"] .tit > h3 { margin: 0; color: inherit; font: inherit; }
            [data-dcuf-comment-role="comment-info"] .ly_daewang .font_grey.situation { margin-block-start: 12px; color: var(--dcuf-comment-muted); }
            [data-dcuf-comment-role="comment-info"] .ly_daewang .font_red { color: color-mix(in srgb, var(--dcuf-panel-status-error, #a52b40) 40%, var(--dcuf-comment-fg)); font-style: normal; }
            [data-dcuf-comment-role="popup-context-close"] { position: absolute; inset: 8px 8px auto auto; display: block; inline-size: 32px; block-size: 32px; min-inline-size: 32px; min-block-size: 32px; padding: 0; border: 0; border-radius: 6px; background: transparent; color: var(--dcuf-comment-fg); font-size: 0; box-shadow: none; cursor: pointer; }
            [data-dcuf-comment-role="popup-context-close"] > .sp_img { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); background: none; font-size: 0; }
            [data-dcuf-comment-role="popup-context-close"]::before,
            [data-dcuf-comment-role="popup-context-close"]::after { content: ''; position: absolute; left: 50%; top: 50%; inline-size: 14px; block-size: 1.5px; border-radius: 1px; background: currentColor; transform: translate(-50%, -50%) rotate(45deg); }
            [data-dcuf-comment-role="popup-context-close"]::after { transform: translate(-50%, -50%) rotate(-45deg); }
            [data-dcuf-comment-role="popup-context-close"]:hover { background: var(--dcuf-theme-accent-soft); }
            [data-dcuf-comment-role="popup-context-close"]:focus-visible { outline: 2px solid var(--dcuf-comment-accent); outline-offset: 2px; }
            @media screen and (max-width: 640px) {
                [data-dcuf-comment-role="popup-detail-summary"] { grid-template-columns: 88px minmax(0, 1fr); gap: 12px; padding: 12px; }
                [data-dcuf-comment-role="popup-detail-actions"] { flex-wrap: wrap; }
                [data-dcuf-comment-role="popup-detail-title"] { flex-basis: 100%; font-size: 14px; }
                [data-dcuf-comment-role="comment-detail"] [data-dcuf-comment-role="popup-media-list"] { grid-template-columns: repeat(3, minmax(0, 1fr)); }
            }
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-password"] { display: flex; align-items: center; gap: 4px; inline-size: min(280px, calc(100vw - 32px)); block-size: auto; padding: 6px; border-radius: 10px; }
            [data-dcuf-comment-role="comment-password"] [data-dcuf-comment-role="popup-password-field"] { flex: 1; float: none; inline-size: auto; min-inline-size: 0; block-size: 32px; padding: 6px 8px; border: 1px solid var(--dcuf-comment-border-strong); border-radius: 6px; box-sizing: border-box; background: var(--dcuf-comment-input); color: var(--dcuf-comment-fg); font: 400 13px/1.4 system-ui, sans-serif; caret-color: var(--dcuf-comment-accent); }
            [data-dcuf-comment-role="comment-password"] [data-dcuf-comment-role="popup-password-field"]::placeholder { color: var(--dcuf-comment-muted); }
            [data-dcuf-comment-role="comment-picker"] [data-dcuf-role="native-comment-picker-field"] {
                display: block;
                inline-size: 100%;
                /* Bound native #txtcon_input width without a priority contest. */
                min-inline-size: 100%;
                max-inline-size: 100%;
                min-block-size: 40px;
                margin-block: 0;
                padding: 10px 12px;
                border: 1px solid var(--dcuf-comment-border-strong);
                border-radius: 8px;
                background: var(--dcuf-comment-input);
                color: var(--dcuf-comment-fg);
                caret-color: var(--dcuf-comment-accent);
                box-sizing: border-box;
            }
            [data-dcuf-role="native-comment-picker-option"] { inline-size: 16px; block-size: 16px; min-inline-size: 0; accent-color: var(--dcuf-comment-accent-strong); }
            [data-dcuf-comment-role="popup-action"], [data-dcuf-comment-role="popup-primary-action"] {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-block-size: 36px;
                padding-inline: 12px;
                border: 0;
                border-radius: 8px;
                color: var(--dcuf-comment-fg);
                font: 600 13px/1.4 system-ui, sans-serif;
                cursor: pointer;
                background: transparent;
                box-shadow: none;
            }
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-picker"] [data-dcuf-comment-role="popup-primary-action"] {
                /* Native .latest_section_box + .btn_blue centers with an important margin. */
                margin: 0 !important;
            }
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-picker"] [data-dcuf-comment-role="popup-primary-action"],
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-folder"] [data-dcuf-comment-role="popup-primary-action"],
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-detail"] [data-dcuf-comment-role="popup-primary-action"],
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-password"] [data-dcuf-comment-role="popup-primary-action"] {
                display: inline-flex; justify-self: end; inline-size: auto; block-size: auto; min-inline-size: 44px; max-inline-size: max-content; border-radius: 8px;
                font: 600 13px/1.4 system-ui, sans-serif; text-shadow: none;
                color: var(--dcuf-v7-primary-ink); border: 1px solid var(--dcuf-v7-primary-rim);
                background: var(--dcuf-v7-primary-bg);
                box-shadow: var(--dcuf-v7-primary-shadow);
            }
            [data-dcuf-comment-role="popup-detail-actions"] > [data-dcuf-comment-role="popup-primary-action"],
            [data-dcuf-comment-role="popup-detail-actions"] > [data-dcuf-comment-role="popup-action"] { flex: none; float: none; inline-size: auto; min-block-size: 36px; block-size: 36px; margin: 0; padding: 0 14px; box-sizing: border-box; line-height: 1.4; }
            [data-dcuf-comment-role="comment-password"] [data-dcuf-comment-role="popup-primary-action"] { flex: none; float: none; min-block-size: 32px; block-size: 32px; padding: 0 10px; margin: 0; box-sizing: border-box; line-height: 1.4; }
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-folder"] {
                /* Native folder overlays are not the doublecon preview scrim. */
                position: fixed; left: 50% !important; top: 50% !important; margin: 0 !important;
                transform: translate(-50%, -50%); inline-size: min(400px, calc(100vw - 32px));
                font: 500 13px/1.5 system-ui, sans-serif;
            }
            [data-dcuf-comment-role="popup-toolbar"] > [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-folder"].bkmk_area {
                inline-size: min(440px, calc(100vw - 24px)); block-size: auto; min-block-size: 132px;
                bottom: auto;
                padding: 14px; font: 500 13px/1.5 system-ui, sans-serif; text-align: start;
                background: var(--dcuf-b1-sheen), var(--dcuf-b1-floating); color: var(--dcuf-comment-fg);
            }
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-folder"] .pop_head {
                background: transparent; color: var(--dcuf-comment-fg); border-color: var(--dcuf-comment-border);
            }
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-folder"] .pop_head > h3 { color: inherit; font: 650 16px/1.5 system-ui, sans-serif; }
            [data-dcuf-comment-role="comment-folder"] .bg_grey,
            [data-dcuf-comment-role="comment-folder"] .bkmark_editlist { background: transparent; color: var(--dcuf-comment-fg); }
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-folder"] :is(.fdname, .stxt, .txt_box, .tip_txtbox, .font_grey, h4) { color: var(--dcuf-comment-fg); text-shadow: none; }
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-folder"] :is(.txt_box, .tip_txtbox) p:not(.font_red) { color: var(--dcuf-comment-fg); }
            [data-dcuf-comment-role="comment-folder"] .tbox { color: var(--dcuf-comment-fg); text-shadow: none; padding: 0 24px 10px 0; }
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-folder"] .naming { display: flex; align-items: center; gap: 8px; inline-size: min(240px, 100%); max-inline-size: 100%; block-size: auto; margin: 0; border: 0; background: transparent; box-shadow: none; }
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-folder"] .naming > input { flex: 1; inline-size: 0; max-inline-size: 100%; min-inline-size: 0; block-size: 36px; box-sizing: border-box; }
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-folder"] .naming .num { flex: none; line-height: 1.4; color: var(--dcuf-comment-fg); }
            [data-dcuf-comment-role="comment-folder"] .ly_folder_add .inr { align-items: stretch; padding-inline: 12px; }
            [data-dcuf-comment-role="comment-folder"] .ly_folder_add .box { gap: 8px; }
            [data-dcuf-comment-role="comment-folder"] .ly_folder_add .box h4 { flex: none; white-space: nowrap; margin: 0; }
            [data-dcuf-comment-role="comment-folder"] .ly_folder_add .box .naming { flex: 1; inline-size: auto; min-inline-size: 0; }
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-folder"] .tbox { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
            [data-dcuf-comment-role="comment-folder"] .tbox > .inr { position: relative; display: flex; align-items: center; gap: 6px; }
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-folder"] .btn_cancle { min-block-size: 36px; padding: 0 12px; border: 0; border-radius: 6px; background: transparent; color: var(--dcuf-comment-fg); box-shadow: none; text-shadow: none; }
            [data-dcuf-comment-role="comment-folder"] .btn_box { display: flex; justify-content: flex-end; gap: 8px; padding: 12px; }
            [data-dcuf-comment-role="comment-folder"] [data-dcuf-comment-role="popup-primary-action"] { inline-size: auto; min-inline-size: 0; block-size: 36px; padding: 0 14px; }
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-folder"] > .pop_content {
                inline-size: auto; max-inline-size: 100%; box-sizing: border-box; background: transparent; color: inherit;
            }
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-folder"] .bkmk_folder { display: grid; grid-template-columns: minmax(0, 1fr); min-inline-size: 0; gap: 10px; }
            [data-dcuf-comment-role="comment-folder"] .bkmrk_listcont .wr { min-inline-size: 0; flex: 1; }
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-folder"].bkmk_area .btn_area { position: static; display: flex; justify-content: flex-end; }
            [data-dcuf-comment-role="comment-folder"] .bkmark_editlist { max-block-size: min(240px, calc(100dvh - 220px)); overflow-y: auto; }
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-folder"] .rcont button.sp_img {
                position: relative; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; min-width: 0; padding: 6px;
                border: 0; border-radius: 6px; background: transparent; color: var(--dcuf-comment-fg); font-size: 0; text-indent: 0; box-sizing: border-box;
            }
            [data-dcuf-comment-role="comment-folder"] .rcont button.sp_img::after { content: ''; display: block; width: 14px; height: 14px; background: currentColor; mask: var(--dcuf-folder-icon) center / contain no-repeat; pointer-events: none; }
            [data-dcuf-comment-role="comment-folder"] .btn_fdedit { --dcuf-folder-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3 11l1 2 2-1 7-7-3-3zM9 3l3 3' fill='none' stroke='black' stroke-width='1.5' stroke-linejoin='round'/%3E%3C/svg%3E"); }
            [data-dcuf-comment-role="comment-folder"] .btn_change { --dcuf-folder-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M5 5l3-3 3 3M8 2v12M5 11l3 3 3-3' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); }
            [data-dcuf-comment-role="comment-folder"] .btn_del { --dcuf-folder-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3 4h10M6 4V2h4v2M4 4l1 10h6l1-10M7 7v4M9 7v4' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); }
            [data-dcuf-comment-role="comment-folder"] .btn_foldadd { position: relative; min-inline-size: 28px; block-size: 28px; padding: 0; border: 0; background: transparent; color: var(--dcuf-comment-fg); }
            [data-dcuf-comment-role="comment-folder"] .btn_foldadd > .sp_img { width: 0; height: 0; overflow: hidden; font-size: 0; background: none; }
            [data-dcuf-comment-role="comment-folder"] .btn_foldadd::before,
            [data-dcuf-comment-role="comment-folder"] .btn_foldadd::after { content: ''; position: absolute; left: 50%; top: 50%; width: 13px; height: 1.5px; background: currentColor; transform: translate(-50%, -50%); }
            [data-dcuf-comment-role="comment-folder"] .btn_foldadd::after { transform: translate(-50%, -50%) rotate(90deg); }
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-folder"] .btn_qmark { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: 0; background: transparent; color: var(--dcuf-comment-fg); font-size: 0; }
            [data-dcuf-comment-role="comment-folder"] .btn_qmark::after { content: ''; display: block; width: 16px; height: 16px; background: currentColor; mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='6.3' fill='none' stroke='black' stroke-width='1.3'/%3E%3Cpath d='M6 6a2 2 0 1 1 3 1.7c-1 .5-1 1-1 1.8M8 11.5v.2' fill='none' stroke='black' stroke-width='1.3' stroke-linecap='round'/%3E%3C/svg%3E") center / contain no-repeat; }
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-folder"] button.sel_color { width: 28px; height: 22px; min-height: 22px; padding: 0; border: 0; border-radius: 5px; }
            [data-dcuf-comment-role="comment-folder"] .nav_btn { position: relative; width: 28px; height: 28px; padding: 0; border: 0; background: transparent; color: var(--dcuf-comment-fg); }
            [data-dcuf-comment-role="comment-folder"] .nav_btn .sp_img { width: 0; height: 0; overflow: hidden; font-size: 0; background: none; }
            [data-dcuf-comment-role="comment-folder"] .nav_btn::after { content: ''; position: absolute; left: 50%; top: 50%; width: 7px; height: 7px; border-top: 1.5px solid currentColor; border-right: 1.5px solid currentColor; transform: translate(-25%, -50%) rotate(-135deg); }
            [data-dcuf-comment-role="comment-folder"] .nav_btn.next::after { transform: translate(-75%, -50%) rotate(45deg); }
            [data-dcuf-comment-role="comment-password"] [data-dcuf-comment-role="popup-password-close"] { position: relative; flex: none; float: none; inline-size: 32px; block-size: 32px; padding: 0; border: 0; border-radius: 6px; background: transparent; color: var(--dcuf-comment-fg); font-size: 0; cursor: pointer; }
            [data-dcuf-comment-role="comment-password"] [data-dcuf-comment-role="popup-password-close"]::before, [data-dcuf-comment-role="comment-password"] [data-dcuf-comment-role="popup-password-close"]::after { content: ''; position: absolute; left: 50%; top: 50%; inline-size: 12px; block-size: 1.5px; border-radius: 1px; background: currentColor; transform: translate(-50%, -50%) rotate(45deg); }
            [data-dcuf-comment-role="comment-password"] [data-dcuf-comment-role="popup-password-close"]::after { transform: translate(-50%, -50%) rotate(-45deg); }
            [data-dcuf-comment-role="popup-password-close"] > .sp_img { display: none; }
            [data-dcuf-comment-role="comment-password"] [data-dcuf-comment-role="popup-password-close"]:hover { background: var(--dcuf-theme-accent-soft); }
            [data-dcuf-comment-role="popup-action"]:hover {
                background: var(--dcuf-theme-accent-soft);
                box-shadow: none;
            }
            [data-dcuf-comment-role="popup-primary-action"]:hover { filter: brightness(1.025); }
            [data-dcuf-comment-role="popup-primary-action"]:active { box-shadow: inset 0 1px 2px #0001; }
            [data-dcuf-comment-role="popup-swatch"]:focus-visible,
            [data-dcuf-role="native-comment-picker-field"]:focus-visible,
            [data-dcuf-role="native-comment-picker-option"]:focus-visible,
            [data-dcuf-comment-role="popup-action"]:focus-visible,
            [data-dcuf-comment-role="popup-primary-action"]:focus-visible { outline: 2px solid var(--dcuf-comment-accent); outline-offset: 2px; }
            [data-dcuf-comment-role="popup-icon-action"]:focus-visible,
            [data-dcuf-comment-role="popup-password-close"]:focus-visible,
            [data-dcuf-comment-role="popup-password-field"]:focus-visible { outline: 2px solid var(--dcuf-comment-accent); outline-offset: 2px; }
            @media screen and (max-width: 640px) {
                [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-picker"] {
                    --dcuf-picker-center: calc(50% - 48px);
                    --dcuf-picker-clearance: 128px;
                }
                [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] { inline-size: calc(100% - 2 * var(--dcuf-page-gutter,10px)); margin: 10px auto; padding: 8px; }
                [data-dcuf-role="comment-item"] {
                    margin-inline: 0;
                    padding: 13px 4px;
                    border-radius: 0;
                }
                [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-role="comment-composer"],
                [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-role="comment-composer"][data-dcuf-state="reply"] {
                    grid-template-columns: minmax(0, 1fr);
                    gap: 8px;
                    padding: 12px;
                    border-radius: 12px;
                }
                [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-role="comment-identity-fields"],
                [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-role="comment-editor"] {
                    grid-column: 1;
                }
                [data-dcuf-role="reply-box"] { margin-inline-start: 12px; }
            }
            @media (prefers-reduced-motion: reduce) {
                [data-dcuf-role="native-comment-header-action"],
                [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-role="native-comment-submit"] { transition: none; }
            }
        `;
        // Flat surfaces need no elevation; measured appearance is immutable input.
        const describeReadiness = (s) => {
            if (!s.includeExtendedSurfaces) return null;
            if (s.hasCommentBox) {
                if (s.commentBoxRadius < 10) return 'insufficient-comment-radius';
                if (s.commentBoxTransparent) return 'transparent-comment-background';
            }
            if (s.hasCommentWriteBox) {
                if (s.commentWriteBoxRadius < 10) return 'insufficient-comment-write-radius';
                if (s.commentWriteBoxTransparent) return 'transparent-comment-write-background';
            }
            if (s.hasCommentTextContainer) {
                if (s.commentTextContainerRadius < 10) return 'insufficient-comment-input-radius';
                if (s.commentTextContainerTransparent) return 'transparent-comment-input-background';
                if (!s.commentTextContainerHasRenderableBorder) return 'missing-comment-input-border';
            }
            return null;
        };
        return Object.freeze({ STYLE_ID, cssText, describeReadiness });
    })();
    __dcufRoot.__dcufCommentPresenter = __dcufCommentPresenter;
