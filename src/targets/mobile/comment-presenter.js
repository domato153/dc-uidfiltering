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
                border: 1px solid var(--dcuf-comment-border-strong);
                border-radius: 8px;
                background: var(--dcuf-comment-input);
                color: var(--dcuf-comment-muted);
                font-weight: 700;
                transition: transform 110ms ease, filter 110ms ease;
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
                border: 1px solid var(--dcuf-comment-border-strong);
                border-radius: 10px;
                background: var(--dcuf-comment-input);
                color: var(--dcuf-comment-fg);
                white-space: nowrap;
                line-height: 1.25;
                box-sizing: border-box;
            }
            [data-dcuf-surface="comments-replies"][data-dcuf-role="comments-root"] [data-dcuf-role="native-comment-submit"] {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-block-size: 34px;
                inline-size: auto;
                block-size: auto;
                padding: 8px 14px;
                border: 1px solid var(--dcuf-comment-accent-strong);
                border-radius: 8px;
                background-color: var(--dcuf-comment-accent-strong);
                background-image: linear-gradient(180deg, #ffffff14, transparent 72%);
                color: var(--dcuf-theme-on-accent, #fff);
                font-weight: 800;
                white-space: nowrap;
                text-shadow: none;
                line-height: 1.25;
                box-sizing: border-box;
                transition: transform 110ms ease, filter 110ms ease;
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
            [data-dcuf-role="comments-root"] [data-dcuf-role="native-comment-popup"] {
                border: 1px solid var(--dcuf-b1-rim, var(--dcuf-comment-border));
                border-radius: 16px;
                background: var(--dcuf-b1-sheen, none), var(--dcuf-b1-floating, var(--dcuf-comment-surface));
                color: var(--dcuf-comment-fg);
                box-shadow: var(--dcuf-b1-shadow), inset 0 1px 0 var(--dcuf-b1-rim);
                backdrop-filter: blur(24px) saturate(1.15);
                box-sizing: border-box;
            }
            [data-dcuf-role="native-comment-popup"][data-dcuf-comment-role="comment-picker"] {
                /* Native textcon/DCCon write inline left:0;top:38px.
                   Only these verified pickers use the centered dialog geometry. */
                position: fixed;
                left: 50% !important;
                top: 50% !important;
                bottom: auto;
                right: auto;
                transform: translate(-50%, -50%);
                inline-size: min(520px, calc(100vw - 32px));
                max-inline-size: calc(100vw - 32px);
                max-block-size: calc(100dvh - 32px);
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
            [data-dcuf-comment-role="popup-title"] { color: inherit; font: 700 16px/1.5 system-ui, sans-serif; }
            [data-dcuf-role="native-comment-popup"] [data-dcuf-comment-role="popup-media-wrap"],
            [data-dcuf-role="native-comment-popup"] [data-dcuf-comment-role="popup-media-list"] { inline-size: 100%; max-inline-size: 100%; min-inline-size: 0; margin-inline: 0; padding-inline: 0; box-sizing: border-box; }
            [data-dcuf-role="native-comment-popup"] [data-dcuf-comment-role="popup-media-list"] { line-height: 0; }
            [data-dcuf-role="native-comment-popup"] [data-dcuf-comment-role="popup-media-item"] { display: inline-block; float: none; inline-size: 25%; min-inline-size: 0; margin: 0; padding: 4px; vertical-align: top; box-sizing: border-box; }
            [data-dcuf-role="native-comment-popup"] [data-dcuf-comment-role="popup-media-button"] { inline-size: 100%; block-size: auto; min-block-size: 44px; padding: 0; border: 0; border-radius: 8px; background: transparent; }
            [data-dcuf-comment-role="popup-media-button"] img { max-inline-size: 100%; block-size: auto; }
            [data-dcuf-role="native-comment-picker-field"] {
                display: block;
                inline-size: 100%;
                min-inline-size: 0;
                min-block-size: 40px;
                margin-block: 12px;
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
                min-block-size: 36px;
                padding-inline: 12px;
                border: 1px solid var(--dcuf-comment-border-strong);
                border-radius: 8px;
                background: var(--dcuf-b1-paper);
                color: var(--dcuf-comment-fg);
                font: 600 13px/1.4 system-ui, sans-serif;
                cursor: pointer;
            }
            [data-dcuf-comment-role="popup-primary-action"] { background: var(--dcuf-comment-accent-strong); color: var(--dcuf-theme-on-accent); border-color: transparent; }
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
