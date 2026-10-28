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
                margin-block: 14px;
                color: var(--dcuf-comment-fg);
                overflow: visible;
                box-sizing: border-box;
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
                border: 1px solid var(--dcuf-comment-border);
                border-block-end: 0;
                border-radius: 14px 14px 0 0;
                background: var(--dcuf-b1-sheen, none), var(--dcuf-b1-glass, var(--dcuf-comment-surface-muted));
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
            [data-dcuf-role="native-comment-header-action"] {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-block-size: 32px;
                padding-inline: 11px;
                border: 1px solid var(--dcuf-control-rim);
                border-radius: 8px;
                color: var(--dcuf-comment-muted);
                font-weight: 700;
                transition: transform 110ms ease, filter 110ms ease;
                background: var(--dcuf-control-secondary-bg);
                box-shadow: var(--dcuf-control-shadow);
            }
            [data-dcuf-role="comment-box"] {
                position: relative;
                overflow: visible;
                border: 0;
                border-radius: 12px;
                background-color: var(--dcuf-comment-surface);
                background-image: none;
                box-shadow: var(--dcuf-comment-shadow);
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
                margin: 0 10px 10px;
                padding: 14px 16px;
                border: 1px solid color-mix(in srgb, var(--dcuf-comment-border) 86%, transparent);
                border-radius: 14px;
                background-color: var(--dcuf-comment-surface);
                background-image: none;
                box-shadow: 0 1px 3px color-mix(in srgb, var(--dcuf-comment-fg) 3%, transparent);
                box-sizing: border-box;
                overflow: visible;
            }
            [data-dcuf-role="comment-list"] > [data-dcuf-role="comment-item"]:first-child { margin-block-start: 10px; }
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
            [data-dcuf-role="comments-root"] [data-dcuf-role="comment-content-stack"] [data-dcuf-role="comment-text"] {
                inline-size: 100%;
                max-inline-size: 100%;
                box-sizing: border-box;
            }
            [data-dcuf-role="reply-info"] > [data-dcuf-role="reply-body"] { flex: 1 1 100%; }
            [data-dcuf-role="comment-author-group"] {
                position: relative;
                display: inline-flex;
                align-items: center;
                flex: 1 1 auto;
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
                border: 1px solid var(--dcuf-comment-border);
                border-inline-start: 1px solid var(--dcuf-comment-border-strong);
                border-radius: 12px;
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
                padding: 14px;
                border: 1px solid var(--dcuf-comment-border);
                border-radius: 16px;
                background-color: var(--dcuf-comment-surface);
                background-image: none;
                box-shadow: var(--dcuf-comment-shadow);
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
                min-inline-size: 0;
                inline-size: 100%;
                background: transparent;
            }
            [data-dcuf-surface="comments-replies"] [data-dcuf-role="comment-field-shell"] {
                inline-size: 100%;
                block-size: auto;
                margin-block-end: 6px;
                border: 0;
                background: transparent;
                box-sizing: border-box;
            }
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-role="comment-editor"] {
                grid-column: 2;
                display: flex;
                min-inline-size: 0;
                flex-direction: column;
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
                border: 1px solid var(--dcuf-comment-border);
                border-radius: 8px;
                background: var(--dcuf-comment-input);
                color: var(--dcuf-comment-fg);
                box-sizing: border-box;
            }
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-role="native-comment-field"] {
                display: block;
                min-block-size: 38px;
                margin-block-end: 6px;
                padding-inline: 11px;
            }
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-role="native-comment-textarea"] {
                display: block;
                min-block-size: 112px;
                padding: 12px 14px;
                border: 0;
                border-radius: 12px 12px 0 0;
                resize: vertical;
            }
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-role="comment-composer-actions"] {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                justify-content: flex-end;
                gap: 8px;
                min-block-size: 44px;
                padding: 7px;
                border-block-start: 1px solid var(--dcuf-comment-border);
                background: var(--dcuf-comment-input);
                border-radius: 0 0 12px 12px;
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
                border: 1px solid var(--dcuf-control-rim);
                border-radius: 10px;
                color: var(--dcuf-comment-fg);
                white-space: nowrap;
                line-height: 1.25;
                box-sizing: border-box;
                background: var(--dcuf-control-secondary-bg);
                box-shadow: var(--dcuf-control-shadow);
            }
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-role="native-comment-submit"] {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-block-size: 34px;
                inline-size: auto;
                block-size: auto;
                padding: 8px 14px;
                border: 1px solid var(--dcuf-control-primary-rim);
                border-radius: 8px;
                color: var(--dcuf-theme-on-accent, #fff);
                font-weight: 800;
                white-space: nowrap;
                text-shadow: none;
                line-height: 1.25;
                box-sizing: border-box;
                transition: transform 110ms ease, filter 110ms ease;
                background: var(--dcuf-control-primary-bg);
                box-shadow: var(--dcuf-control-shadow);
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
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-picker"] [data-dcuf-comment-role="popup-panel"] {
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
            [data-dcuf-comment-role="popup-heading"] {
                position: relative; display: grid; gap: 4px; inline-size: auto; block-size: auto; overflow: visible;
                margin: -20px -20px 16px; padding: 18px 20px 14px;
                border-block-end: 1px solid var(--dcuf-comment-border);
                background: var(--dcuf-b1-sheen, none); border-radius: 16px 16px 0 0;
            }
            [data-dcuf-comment-role="popup-content-stack"] > [data-dcuf-comment-role="popup-heading"] { margin-block-end: 0; }
            [data-dcuf-comment-role="popup-panel"] > [data-dcuf-comment-role="popup-heading"] { position: relative; inline-size: auto; block-size: auto; width: auto; height: auto; overflow: visible; }
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
            [data-dcuf-comment-role="popup-pack-controls"] { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; float: none; min-inline-size: 0; margin-block-end: 12px; }
            [data-dcuf-role="native-comment-popup"] [data-dcuf-comment-role="popup-media-wrap"],
            [data-dcuf-role="native-comment-popup"] [data-dcuf-comment-role="popup-media-list"] { inline-size: 100%; max-inline-size: 100%; min-inline-size: 0; margin-inline: 0; padding-inline: 0; box-sizing: border-box; }
            [data-dcuf-role="native-comment-popup"] [data-dcuf-comment-role="popup-media-list"] { line-height: 0; }
            [data-dcuf-role="native-comment-popup"] [data-dcuf-comment-role="popup-media-item"] { display: inline-block; float: none; inline-size: 25%; min-inline-size: 0; margin: 0; padding: 4px; vertical-align: top; box-sizing: border-box; }
            [data-dcuf-role="native-comment-popup"] [data-dcuf-comment-role="popup-media-button"] { inline-size: 100%; block-size: auto; min-block-size: 44px; padding: 0; border: 0; border-radius: 8px; background: transparent; }
            [data-dcuf-comment-role="popup-media-button"] img { max-inline-size: 100%; block-size: auto; }
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
                min-block-size: 40px;
                padding-inline: 12px;
                border: 1px solid var(--dcuf-control-rim);
                border-radius: 8px;
                color: var(--dcuf-comment-fg);
                font: 600 13px/1.4 system-ui, sans-serif;
                cursor: pointer;
                background: var(--dcuf-control-secondary-bg);
                box-shadow: var(--dcuf-control-shadow);
            }
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-picker"] [data-dcuf-comment-role="popup-primary-action"] {
                /* Native .latest_section_box + .btn_blue centers with an important margin. */
                margin: 0 !important;
                display: inline-flex; justify-self: end; min-inline-size: 96px; border-radius: 8px;
                font: 600 13px/1.4 system-ui, sans-serif; text-shadow: none;
                color: var(--dcuf-theme-on-accent); border-color: var(--dcuf-control-primary-rim);
                background: var(--dcuf-control-primary-bg);
                box-shadow: var(--dcuf-control-shadow);
            }
            [data-dcuf-comment-role="popup-action"]:hover {
                background: var(--dcuf-control-secondary-bg);
                box-shadow: var(--dcuf-control-shadow);
            }
            [data-dcuf-comment-role="popup-primary-action"]:hover { filter: brightness(1.06); }
            [data-dcuf-comment-role="popup-primary-action"]:active { box-shadow: inset 0 1px 3px #0002; }
            [data-dcuf-comment-role="popup-swatch"]:focus-visible,
            [data-dcuf-role="native-comment-picker-field"]:focus-visible,
            [data-dcuf-role="native-comment-picker-option"]:focus-visible,
            [data-dcuf-comment-role="popup-action"]:focus-visible,
            [data-dcuf-comment-role="popup-primary-action"]:focus-visible { outline: 2px solid var(--dcuf-comment-accent); outline-offset: 2px; }
            [data-dcuf-role="comments-root"][data-dcuf-state="dark"] [data-dcuf-role="comment-item"],
            [data-dcuf-role="comments-root"][data-dcuf-state="dark"] [data-dcuf-role="comment-box"],
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"][data-dcuf-state="dark"] [data-dcuf-role="comment-composer"] {
                box-shadow: 0 2px 8px #0002;
            }
            @media screen and (max-width: 640px) {
                [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-picker"] {
                    --dcuf-picker-center: calc(50% - 48px);
                    --dcuf-picker-clearance: 128px;
                }
                [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] { margin-block: 10px; }
                [data-dcuf-role="comment-item"] {
                    margin-inline: 8px;
                    padding: 13px 14px;
                    border-radius: 10px;
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
