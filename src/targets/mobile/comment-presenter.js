    const __dcufCommentPresenter = (() => {
        const STYLE_ID = 'dcuf-comment-presenter';
        const cssText = `
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] {
                --dcuf-comment-fg: var(--dcuf-theme-fg, #27313f);
                --dcuf-comment-muted: var(--dcuf-theme-fg-muted, #687384);
                --dcuf-comment-border: var(--dcuf-theme-border, #d9dde3);
                --dcuf-comment-border-strong: var(--dcuf-theme-border-strong, #cbd2db);
                --dcuf-comment-surface: var(--dcuf-theme-surface-raised, #fbfcfd);
                --dcuf-comment-surface-muted: var(--dcuf-theme-surface-muted, #f1f3f6);
                --dcuf-comment-input: var(--dcuf-theme-surface-input, #fff);
                --dcuf-comment-reply: var(--dcuf-theme-reply-surface, #f4f6f8);
                --dcuf-comment-accent: var(--dcuf-theme-accent, #3f6de0);
                --dcuf-comment-accent-strong: var(--dcuf-theme-accent-strong, #315bc1);
                --dcuf-comment-shadow: var(--dcuf-theme-card-shadow, 0 1px 3px rgba(31, 41, 55, .07), 0 6px 16px rgba(31, 41, 55, .075));
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
                border-radius: 16px 16px 0 0;
                background: var(--dcuf-comment-surface-muted);
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
            [data-dcuf-role="comment-count-accent"] { color: var(--dcuf-comment-accent); }
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
                border: 1px solid var(--dcuf-comment-border-strong);
                border-radius: 999px;
                background: var(--dcuf-comment-input);
                color: var(--dcuf-comment-muted);
                font-weight: 700;
                transition: transform 110ms ease, filter 110ms ease;
            }
            [data-dcuf-role="comment-box"] {
                position: relative;
                overflow: visible;
                border: 1px solid var(--dcuf-comment-border);
                border-radius: 18px;
                background-color: var(--dcuf-comment-surface);
                background-image: linear-gradient(180deg, var(--dcuf-theme-card-top, #fff), var(--dcuf-theme-card-bottom, #fafbfc));
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
                border-radius: 15px;
                background-color: var(--dcuf-theme-card-top, var(--dcuf-comment-surface));
                background-image: linear-gradient(180deg, var(--dcuf-theme-card-top, var(--dcuf-comment-surface)), var(--dcuf-theme-card-bottom, var(--dcuf-comment-surface)));
                box-shadow: 0 4px 12px color-mix(in srgb, var(--dcuf-comment-accent-strong) 7%, transparent);
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
            }
            [data-dcuf-role="comment-author-group"] {
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
            [data-dcuf-comment-role="author"][data-dcuf-comment-state="self"] { color: var(--dcuf-comment-accent); }
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
                border-inline-start: 3px solid var(--dcuf-comment-border-strong);
                border-radius: 12px;
                background-color: var(--dcuf-comment-reply);
                background-image: linear-gradient(180deg, var(--dcuf-comment-reply), color-mix(in srgb, var(--dcuf-comment-reply) 92%, var(--dcuf-comment-input)));
                overflow: visible;
                box-sizing: border-box;
            }
            [data-dcuf-role="reply-item"] {
                position: relative;
                margin: 0;
                padding: 8px 0;
                border: 0;
                background: transparent;
                box-shadow: none;
                overflow: visible;
            }
            [data-dcuf-role="reply-item"] + [data-dcuf-role="reply-item"] {
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
            [data-dcuf-role="comment-composer"] {
                display: grid;
                grid-template-columns: minmax(120px, 150px) minmax(0, 1fr);
                align-items: stretch;
                gap: 12px;
                margin-block-start: 14px;
                padding: 14px;
                border: 1px solid var(--dcuf-comment-border);
                border-radius: 18px;
                background-color: var(--dcuf-theme-surface, var(--dcuf-comment-surface));
                background-image: linear-gradient(180deg, var(--dcuf-theme-card-top, #fff), var(--dcuf-theme-card-bottom, #fafbfc));
                box-shadow: var(--dcuf-comment-shadow);
                box-sizing: border-box;
                overflow: visible;
            }
            [data-dcuf-role="comment-composer"][data-dcuf-state="reply"] {
                grid-template-columns: minmax(100px, 140px) minmax(0, 1fr);
                margin-block-start: 10px;
                padding: 10px;
                border-radius: 13px;
                box-shadow: none;
            }
            [data-dcuf-role="comment-identity-fields"] {
                grid-column: 1;
                min-inline-size: 0;
                inline-size: 100%;
                background: transparent;
            }
            [data-dcuf-role="comment-editor"] {
                grid-column: 2;
                display: flex;
                min-inline-size: 0;
                flex-direction: column;
                border: 1px solid var(--dcuf-comment-border);
                border-radius: 13px;
                background: var(--dcuf-comment-input);
                overflow: visible;
                box-sizing: border-box;
            }
            [data-dcuf-role="native-comment-field"],
            [data-dcuf-role="native-comment-textarea"] {
                inline-size: 100%;
                min-inline-size: 0;
                border: 1px solid var(--dcuf-comment-border);
                border-radius: 10px;
                background: var(--dcuf-comment-input);
                color: var(--dcuf-comment-fg);
                box-sizing: border-box;
            }
            [data-dcuf-role="native-comment-field"] {
                display: block;
                min-block-size: 38px;
                margin-block-end: 6px;
                padding-inline: 11px;
            }
            [data-dcuf-role="native-comment-textarea"] {
                display: block;
                min-block-size: 112px;
                padding: 12px 14px;
                border: 0;
                border-radius: 12px 12px 0 0;
                resize: vertical;
            }
            [data-dcuf-role="comment-composer-actions"] {
                display: flex;
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
            [data-dcuf-role="native-comment-submit"] {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-block-size: 34px;
                padding-inline: 14px;
                border: 1px solid var(--dcuf-comment-accent-strong);
                border-radius: 10px;
                background-color: var(--dcuf-comment-accent-strong);
                background-image: linear-gradient(145deg, var(--dcuf-comment-accent), var(--dcuf-comment-accent-strong));
                color: var(--dcuf-theme-on-accent, #fff);
                font-weight: 800;
                transition: transform 110ms ease, filter 110ms ease;
            }
            [data-dcuf-role="native-comment-header-action"]:active,
            [data-dcuf-role="native-comment-submit"]:active {
                transform: translateY(1px);
                filter: brightness(.96);
            }
            [data-dcuf-role="native-comment-header-action"]:focus-visible,
            [data-dcuf-role="native-comment-field"]:focus-visible,
            [data-dcuf-role="native-comment-textarea"]:focus-visible,
            [data-dcuf-role="native-comment-submit"]:focus-visible {
                outline: 2px solid var(--dcuf-comment-accent);
                outline-offset: 2px;
            }
            [data-dcuf-role="native-comment-popup"] {
                z-index: 2147483647;
                overflow: visible;
            }
            [data-dcuf-role="comments-root"][data-dcuf-state="dark"] [data-dcuf-role="comment-item"],
            [data-dcuf-role="comments-root"][data-dcuf-state="dark"] [data-dcuf-role="comment-box"],
            [data-dcuf-role="comments-root"][data-dcuf-state="dark"] [data-dcuf-role="comment-composer"] {
                box-shadow: 0 7px 18px rgba(0, 0, 0, .22), inset 0 1px 0 rgba(255, 255, 255, .035);
            }
            @media screen and (max-width: 640px) {
                [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] { margin-block: 10px; }
                [data-dcuf-role="comment-item"] {
                    margin-inline: 8px;
                    padding: 13px 14px;
                    border-radius: 14px;
                }
                [data-dcuf-role="comment-composer"],
                [data-dcuf-role="comment-composer"][data-dcuf-state="reply"] {
                    grid-template-columns: minmax(0, 1fr);
                    gap: 8px;
                    padding: 12px;
                    border-radius: 16px;
                }
                [data-dcuf-role="comment-identity-fields"],
                [data-dcuf-role="comment-editor"] {
                    grid-column: 1;
                }
                [data-dcuf-role="reply-box"] { margin-inline-start: 12px; }
            }
            @media (prefers-reduced-motion: reduce) {
                [data-dcuf-role="native-comment-header-action"],
                [data-dcuf-role="native-comment-submit"] { transition: none; }
            }
        `;
        return Object.freeze({ STYLE_ID, cssText });
    })();
    __dcufRoot.__dcufCommentPresenter = __dcufCommentPresenter;
