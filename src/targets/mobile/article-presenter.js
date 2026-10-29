    const __dcufArticlePresenter = (() => {
        const STYLE_ID = 'dcuf-article-presenter';
        const cssText = `
            [data-dcuf-surface="article-recommendation"][data-dcuf-role="article"] {
                --dcuf-view-surface: rgba(255, 255, 255, .96);
                --dcuf-view-surface-muted: var(--dcuf-theme-surface-muted, #f7f9fd);
                --dcuf-view-border: var(--dcuf-theme-border, #d7e0ec);
                --dcuf-view-border-strong: var(--dcuf-theme-border-strong, #c7d3e4);
                --dcuf-view-shadow: 0 8px 24px rgba(18, 35, 69, .08);
                --dcuf-view-fg: var(--dcuf-theme-fg, #22324c);
                --dcuf-view-fg-sub: var(--dcuf-theme-fg-muted, #5f6f86);
                --dcuf-view-accent: var(--dcuf-theme-accent, #3f6de0);
                inline-size: calc(100% - 40px);
                max-inline-size: 1120px;
                min-inline-size: 0;
                float: none;
                position: relative;
                margin: 14px auto;
                padding: 20px 20px 8px !important;
                border: 1px solid var(--dcuf-b1-line, var(--dcuf-view-border));
                border-radius: 16px;
                background: var(--dcuf-b1-paper, var(--dcuf-view-surface));
                color: var(--dcuf-view-fg);
                box-sizing: border-box;
            }
            [data-dcuf-role="article"][data-dcuf-state="dark"] {
                --dcuf-view-surface: var(--dcuf-theme-article-surface, #18212d);
                --dcuf-view-surface-muted: var(--dcuf-theme-surface-muted, #1e2a39);
                --dcuf-view-border: var(--dcuf-theme-border, #314258);
                --dcuf-view-border-strong: var(--dcuf-theme-border-strong, #45607c);
                --dcuf-view-shadow: 0 10px 24px rgba(0, 0, 0, .32);
                --dcuf-view-fg: var(--dcuf-theme-fg, #edf3ff);
                --dcuf-view-fg-sub: var(--dcuf-theme-fg-muted, #b6c4d9);
                --dcuf-view-accent: var(--dcuf-theme-accent, #8cb4ff);
            }
            [data-dcuf-role="article-header-shell"] {
                margin-block-end: 12px;
            }
            [data-dcuf-role="article-header"] {
                padding: 18px 18px 14px;
                border: 0;
                border-radius: 16px;
                background-color: var(--dcuf-b1-paper, var(--dcuf-view-surface));
                background-image: none;
                box-shadow: none;
                box-sizing: border-box;
            }
            [data-dcuf-role="article"][data-dcuf-state="dark"] [data-dcuf-role="article-header"] {
                background-image: none;
                box-shadow: none;
            }
            [data-dcuf-role="article-title-row"] {
                margin: 0;
                line-height: 1.45;
            }
            [data-dcuf-role="article-headtext"] {
                display: inline;
                margin: 0 8px 0 0;
                padding: 0;
                border: 0;
                border-radius: 0;
                background: transparent;
                color: var(--dcuf-view-fg);
                font-size: 14px;
                font-weight: 700;
            }
            [data-dcuf-role="article-headtext"]:empty {
                display: none;
                margin: 0;
            }
            [data-dcuf-role="article-title"] {
                color: var(--dcuf-view-fg);
                font-size: var(--dcuf-article-title-font-size, 21px);
                font-weight: 750;
                letter-spacing: -.025em;
            }
            [data-dcuf-role="article-title-device"] {
                margin-inline-start: 6px;
            }
            [data-dcuf-role="article-meta"] {
                block-size: auto;
                margin-block-start: 14px;
                padding-block-start: 11px;
                border-block-start: 1px solid var(--dcuf-b1-line, var(--dcuf-view-border));
                background: transparent;
                color: var(--dcuf-view-fg-sub);
                overflow: visible;
            }
            [data-dcuf-role="article-author-group"],
            [data-dcuf-role="article-stat-group"] {
                display: inline-flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 8px;
                min-inline-size: 0;
                background: transparent;
            }
            [data-dcuf-role="article-author-group"] { float: inline-start; }
            [data-dcuf-role="article-stat-group"] {
                float: inline-end;
                justify-content: flex-end;
                flex-wrap: nowrap;
                gap: 12px;
            }
            [data-dcuf-role="article-stat-group"] > :is(
                [data-dcuf-role="article-view-count"],
                [data-dcuf-role="article-recommend-count"],
                [data-dcuf-role="article-comment-count"]
            ) {
                display: inline-flex;
                align-items: center;
                gap: 3px;
                white-space: nowrap;
            }
            [data-dcuf-role="article-stat-group"] > [data-dcuf-role="article-comment-count"] {
                inline-size: auto;
                block-size: auto;
                margin: 0;
                padding: 0;
                border: 0;
                background: transparent;
            }
            [data-dcuf-role="article-author"],
            [data-dcuf-role="article-author-ip"] {
                display: inline-block;
                max-inline-size: 240px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                vertical-align: middle;
                background: transparent;
            }
            [data-dcuf-role="article-author"] {
                color: var(--dcuf-view-fg);
                font-size: 15px;
                font-weight: 800;
            }
            [data-dcuf-role="article-author-ip"],
            [data-dcuf-role="article-date"],
            [data-dcuf-role="article-view-count"],
            [data-dcuf-role="article-recommend-count"],
            [data-dcuf-role="article-comment-count"] {
                color: var(--dcuf-view-fg-sub);
                font-size: 13px;
            }
            [data-dcuf-role="article-scrap"] { background: transparent; }
            [data-dcuf-role="article-header"] [data-dcuf-role="article-scrap"] > [data-dcuf-role="native-article-scrap"] {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                inline-size: auto;
                min-inline-size: 58px;
                block-size: 32px;
                padding-inline: 12px;
                border: 1px solid var(--dcuf-view-border-strong);
                border-radius: 999px;
                background: var(--dcuf-view-surface-muted);
                color: var(--dcuf-theme-accent-ink, var(--dcuf-view-accent));
                font-size: 13px;
                font-weight: 700;
                line-height: 1;
                white-space: nowrap;
                box-sizing: border-box;
            }
            [data-dcuf-role="article-body"],
            [data-dcuf-role="article-writing-body"],
            [data-dcuf-role="article-content"] {
                inline-size: 100%;
                max-inline-size: 100%;
                margin-inline: auto;
                border: 0;
                border-radius: 0;
                background: transparent;
                box-shadow: none;
                box-sizing: border-box;
                overflow: visible;
            }
            [data-dcuf-role="article-body"] {
                margin-block-end: 14px;
                padding: 16px;
                font-size: var(--dcuf-article-body-font-size, 26px);
                line-height: var(--dcuf-article-body-line-height, 1.9);
                word-break: break-all;
            }
            [data-dcuf-role="article-body-inner"] { inline-size: 100%; }
            [data-dcuf-role="article-writing-body"] {
                font-size: var(--dcuf-article-body-font-size, 26px);
                line-height: var(--dcuf-article-body-line-height, 1.9);
                word-break: break-all;
            }
            [data-dcuf-role="article"][data-dcuf-state="dark"] [data-dcuf-role="article-content"] {
                color: var(--dcuf-view-fg);
                filter: none;
                -webkit-filter: none;
            }
            [data-dcuf-role="article"][data-dcuf-state="dark"] [data-dcuf-role="article-content"] > :is(p, div, span, font, b, strong, em, i, a, li, td, th, pre, blockquote) {
                color: var(--dcuf-view-fg);
            }
            [data-dcuf-role="article-media"],
            [data-dcuf-role="article-content"] :is(img, picture, video, canvas) {
                max-inline-size: 100%;
                block-size: auto;
                border-radius: 10px;
            }
            [data-dcuf-role="article"][data-dcuf-state="dark"] [data-dcuf-role="article-media"],
            [data-dcuf-role="article"][data-dcuf-state="dark"] [data-dcuf-role="article-content"] :is(img, picture, video, canvas) {
                opacity: 1;
                filter: none;
                -webkit-filter: none;
                mix-blend-mode: normal;
            }
            [data-dcuf-role="article"][data-dcuf-state="dark"] [data-dcuf-role="article-content"] :is(img, picture, video, canvas) {
                filter: none !important;
                -webkit-filter: none !important;
                mix-blend-mode: normal !important;
            }
            [data-dcuf-role="article-attachments"] {
                margin-block-start: 16px;
                padding-block-start: 14px;
                border-block-start: 1px solid var(--dcuf-view-border);
            }
            [data-dcuf-role="article-native-actions"] {
                position: relative;
                z-index: 1;
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                padding: 10px;
                border: 0;
                border-radius: 12px;
                background-image: none;
                box-shadow: none;
                box-sizing: border-box;
            }
            [data-dcuf-role="article-native-actions"]::after { content: none; display: none; }
            [data-dcuf-role="article-native-actions"] [data-dcuf-role="article-action-start"],
            [data-dcuf-role="article-native-actions"] [data-dcuf-role="article-action-end"] {
                position: static;
                display: flex;
                flex-wrap: wrap;
                float: none;
                align-items: center;
                gap: 8px;
            }
            [data-dcuf-role="article-native-actions"] [data-dcuf-role="article-action-end"] { margin-inline-start: auto; }
            [data-dcuf-role="article-native-actions"] [data-dcuf-role="native-article-action"] {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-block-size: 38px;
                inline-size: auto;
                block-size: auto;
                padding-inline: 16px;
                white-space: nowrap;
                text-shadow: none;
                border: 1px solid transparent;
                border-radius: 8px;
                color: var(--dcuf-theme-fg, var(--dcuf-view-fg));
                transition: transform 110ms ease, filter 110ms ease;
                background: transparent;
                box-shadow: none;
            }
            [data-dcuf-role="native-article-action"]:not([data-dcuf-state="primary"]):is(:hover,:focus-visible) { background: var(--dcuf-control-selected-bg); color: var(--dcuf-theme-accent-ink); }
            [data-dcuf-role="article-native-actions"] [data-dcuf-role="native-article-action"][data-dcuf-state="primary"],
            [data-dcuf-role="article-native-actions"] [data-dcuf-role="native-article-action"][data-dcuf-state="primary"]:visited {
                border-color: var(--dcuf-v7-primary-rim);
                color: var(--dcuf-v7-primary-ink);
                background: var(--dcuf-v7-primary-bg);
                box-shadow: var(--dcuf-v7-primary-shadow);
            }
            [data-dcuf-role="native-article-action"]:active {
                transform: translateY(1px);
                filter: brightness(.96);
            }
            [data-dcuf-role="native-article-action"]:focus-visible,
            [data-dcuf-role="native-article-scrap"]:focus-visible {
                outline: 2px solid var(--dcuf-theme-accent, var(--dcuf-view-accent));
                outline-offset: 3px;
            }
            [data-dcuf-role="native-article-action"][data-dcuf-state="destructive"]:is(:hover, :focus-visible) {
                border-color: var(--dcuf-control-rim);
                color: #b42318;
                background: var(--dcuf-control-danger-bg);
                box-shadow: var(--dcuf-control-shadow);
            }
            [data-dcuf-role="article"][data-dcuf-state="dark"] [data-dcuf-role="native-article-action"][data-dcuf-state="destructive"]:is(:hover, :focus-visible) {
                border-color: var(--dcuf-control-rim);
                color: #ffb4bc;
                background: var(--dcuf-control-danger-bg);
                box-shadow: var(--dcuf-control-shadow);
            }
            [data-dcuf-surface="article-recommendation"][data-dcuf-role="recommendation"] {
                display: block;
                inline-size: min(680px, 100%);
                max-inline-size: 100%;
                min-inline-size: 0;
                margin: 14px auto 6px;
                padding: 14px 16px 20px;
                border: 0;
                border-radius: 16px;
                background-color: var(--dcuf-b1-paper, var(--dcuf-view-surface));
                background-image: none;
                box-shadow: none;
                box-sizing: border-box;
                overflow: visible;
            }
            [data-dcuf-role="article"][data-dcuf-state="dark"] [data-dcuf-role="recommendation"] {
                box-shadow: none;
            }
            [data-dcuf-role="recommendation-score"],
            [data-dcuf-role="recommendation-actions"],
            [data-dcuf-role="recommendation-vote-group"] {
                box-sizing: border-box;
            }
            [data-dcuf-role="recommendation-score"] {
                display: flex;
                flex-wrap: wrap;
                align-items: stretch;
                justify-content: center;
                gap: 10px;
                inline-size: 100%;
            }
            [data-dcuf-role="recommendation"] [data-dcuf-role="recommendation-vote-group"] {
                display: grid;
                align-items: center;
                justify-content: center;
                column-gap: 10px;
                row-gap: 0;
                flex: 0 1 148px;
                block-size: auto;
                min-block-size: 86px;
                padding: 14px 16px;
                border: 1px solid var(--dcuf-theme-border, var(--dcuf-view-border));
                border-radius: 10px;
                background-color: var(--dcuf-theme-card-top, var(--dcuf-view-surface-muted));
                background-image: none;
                box-shadow: var(--dcuf-theme-card-shadow, none), inset 0 1px 0 color-mix(in srgb, white 70%, transparent);
            }
            [data-dcuf-role="recommendation-vote-group"][data-dcuf-state="up"] {
                grid-template-columns: 34px auto;
            }
            [data-dcuf-role="recommendation-vote-group"][data-dcuf-state="down"] {
                grid-template-columns: auto 34px;
            }
            [data-dcuf-role="article"][data-dcuf-state="dark"] [data-dcuf-role="recommendation-vote-group"] {
                box-shadow: 0 4px 12px rgba(0, 0, 0, .18), inset 0 1px 0 rgba(255, 255, 255, .035);
            }
            [data-dcuf-role="recommendation-count"] {
                color: var(--dcuf-theme-fg, var(--dcuf-view-fg));
                inline-size: 100%;
                font-size: 16px;
                font-weight: 700;
                line-height: 1;
                text-align: center;
                position: static;
            }
            [data-dcuf-role="recommendation-vote-group"][data-dcuf-state="up"] [data-dcuf-role="recommendation-count"] {
                color: var(--dcuf-theme-accent-ink, var(--dcuf-view-accent));
            }
            [data-dcuf-role="recommendation-accent-count"] {
                color: var(--dcuf-theme-accent-ink, var(--dcuf-view-accent));
                display: inline;
                margin-inline-start: 2px;
                padding: 0;
                border: 0;
                border-radius: 0;
                background: transparent;
                box-shadow: none;
                font-size: 12px;
                font-weight: 700;
                line-height: 1;
            }
            [data-dcuf-role="recommendation-up-count-group"],
            [data-dcuf-role="recommendation-down-count-group"] {
                display: inline-flex;
                inline-size: 34px;
                min-inline-size: 34px;
                align-items: center;
                justify-content: center;
                justify-self: center;
            }
            [data-dcuf-role="recommendation-up-count-group"] {
                flex-direction: column;
                gap: 1px;
                align-self: center;
            }
            [data-dcuf-role="recommendation-down-count-group"] {
                gap: 0;
                align-self: center;
            }
            [data-dcuf-role="recommendation-fixed-count"] {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 1px;
                margin: 0;
                line-height: 1;
            }
            [data-dcuf-role="recommendation-fixed-writer"] {
                display: inline-block;
                margin-inline-end: 0;
                vertical-align: middle;
            }
            [data-dcuf-role="recommendation-fixed-writer-icon"] {
                inline-size: 12px;
                block-size: 11px;
                vertical-align: middle;
            }
            [data-dcuf-role="native-recommend-up"],
            [data-dcuf-role="native-recommend-down"] {
                position: static;
                float: none;
                flex: 0 0 auto;
                justify-self: center;
                margin: 0;
                padding: 0;
            }
            [data-dcuf-role="native-recommend-up"] {
                display: inline-flex;
                inline-size: 56px;
                min-inline-size: 56px;
                block-size: 56px;
                align-items: center;
                justify-content: center;
                border: 1px solid var(--dcuf-v7-primary-rim);
                border-radius: 50%;
                transition: transform 110ms ease, filter 110ms ease;
                color: var(--dcuf-v7-primary-ink);
                background: var(--dcuf-v7-primary-bg);
                box-shadow: var(--dcuf-v7-primary-shadow);
            }
            [data-dcuf-role="native-recommend-up"]:active {
                transform: scale(.96);
                filter: brightness(.95);
            }
            [data-dcuf-role="native-recommend-up"]:focus-visible,
            [data-dcuf-role="native-recommend-down"]:focus-visible,
            [data-dcuf-role="native-recommendation-action"]:focus-visible,
            [data-dcuf-role="recommendation-captcha-input"]:focus-visible {
                outline: 2px solid var(--dcuf-theme-accent, var(--dcuf-view-accent));
                outline-offset: 3px;
            }
            [data-dcuf-role="recommendation"] [data-dcuf-role="native-recommend-up"] > [data-dcuf-role="recommend-up-icon"] {
                position: relative;
                display: inline-flex;
                inline-size: 100%;
                block-size: 100%;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 0;
                background: none;
            }
            [data-dcuf-role="recommend-up-icon"]::before {
                content: "★";
                color: var(--dcuf-v7-primary-ink);
                font: 900 26px/.9 Arial, sans-serif;
                text-shadow: 0 1px 1px rgba(0, 0, 0, .12);
            }
            [data-dcuf-role="recommend-up-icon"]::after {
                content: "개념";
                display: block;
                margin-block-start: 2px;
                color: var(--dcuf-v7-primary-ink);
                font: 850 10px/1.05 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                letter-spacing: -.04em;
                text-shadow: 0 1px 1px rgba(0, 0, 0, .12);
            }
            [data-dcuf-surface="article-recommendation"][data-dcuf-role="recommendation"] > [data-dcuf-role="recommendation-actions"] {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                justify-content: center;
                gap: 10px;
                inline-size: 100%;
                block-size: auto;
                margin: 14px 0 6px;
                padding: 14px 0 10px;
                border-block-start: 1px solid var(--dcuf-theme-border, var(--dcuf-view-border));
                background: transparent;
                box-shadow: none;
                overflow: visible;
            }
            [data-dcuf-role="native-recommendation-action"] {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-block-size: 34px;
                block-size: auto;
                padding-inline: 12px;
                border: 1px solid transparent;
                border-radius: 8px;
                color: var(--dcuf-theme-fg-muted, var(--dcuf-view-fg-sub));
                font-size: 13px;
                line-height: 1.3;
                white-space: nowrap;
                box-sizing: border-box;
                transition: transform 110ms ease, filter 110ms ease;
                background: transparent;
                box-shadow: none;
            }
            [data-dcuf-role="native-recommendation-action"]:is(:hover,:focus-visible) { background: var(--dcuf-control-selected-bg); color: var(--dcuf-theme-accent-ink); }
            [data-dcuf-role="native-recommendation-action"]:active {
                transform: translateY(1px);
                filter: brightness(.96);
            }
            [data-dcuf-role="recommendation-captcha"] {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                justify-content: center;
                gap: 0;
                inline-size: min(290px, 100%);
                min-inline-size: 0;
                max-inline-size: 290px;
                margin: 14px auto 10px;
                padding: 0;
                border: 0;
                border-radius: 0;
                background: transparent;
                box-shadow: none;
                text-align: start;
                overflow: visible;
            }
            [data-dcuf-role="recommendation-captcha-image-shell"] {
                display: flex;
                align-items: center;
                justify-content: center;
                flex: 0 1 140px;
                inline-size: 140px;
                block-size: 31px;
                min-block-size: 31px;
                margin: 0;
                padding: 0;
                border: 1px solid var(--dcuf-theme-border-strong, var(--dcuf-view-border-strong));
                background: #fff;
                box-sizing: border-box;
                overflow: hidden;
            }
            [data-dcuf-role="recommendation-captcha-image"] {
                display: block;
                max-inline-size: 140px;
                block-size: 31px;
                margin: 0;
                vertical-align: middle;
            }
            [data-dcuf-role="recommendation-captcha-input"] {
                display: block;
                flex: 1 1 150px;
                inline-size: 150px;
                min-inline-size: 0;
                max-inline-size: 150px;
                block-size: 31px;
                min-block-size: 31px;
                margin: 0;
                padding-inline: 10px;
                border: 1px solid var(--dcuf-theme-border-strong, var(--dcuf-view-border-strong));
                background: #fff;
                color: var(--dcuf-theme-fg-muted, var(--dcuf-view-fg-sub));
                box-sizing: border-box;
                opacity: 1;
                line-height: 29px;
            }
            [data-dcuf-role="article"] .pop_wrap[data-dcuf-article-popup] {
                box-sizing: border-box; color: var(--dcuf-view-fg); font: 400 14px/1.5 system-ui, sans-serif;
                border: 1px solid var(--dcuf-b1-rim); border-radius: 16px;
                background: var(--dcuf-b1-sheen), var(--dcuf-b1-floating);
                backdrop-filter: var(--dcuf-b1-floating-filter,blur(24px) saturate(1.15)); box-shadow: var(--dcuf-b1-shadow), inset 0 1px 0 var(--dcuf-b1-rim);
                scrollbar-color: var(--dcuf-view-border-strong) transparent;
            }
            [data-dcuf-article-popup]:not([data-dcuf-article-popup="pum"]):not([data-dcuf-article-popup="guide"]) {
                position: fixed; left: 50%; top: var(--dcuf-article-popup-center, 50%);
                bottom: auto !important; right: auto; margin: 0 !important; transform: translate(-50%, -50%);
                inline-size: min(440px, calc(100vw - 32px)); max-inline-size: calc(100vw - 32px);
                max-block-size: calc(100dvh - var(--dcuf-article-popup-clearance, 32px));
                overflow: auto; overscroll-behavior: contain; z-index: 2147483647;
            }
            [data-dcuf-role="article"] .pop_wrap[data-dcuf-article-popup="guide"] {
                position: relative; inline-size: 100%; max-inline-size: 100%; margin-block-start: 12px; padding: 0;
                border-color: var(--dcuf-b1-line); border-radius: 12px; box-shadow: 0 4px 12px #0000000c;
            }
            [data-dcuf-article-popup] > [data-dcuf-article-part="panel"] { inline-size: 100%; min-inline-size: 0; max-inline-size: 100%; margin: 0; padding: 0; border: 0; border-radius: inherit; background: transparent; color: inherit; box-sizing: border-box; }
            [data-dcuf-article-popup] > [data-dcuf-article-part="panel"] > [data-dcuf-article-part="head"] { display: flex; align-items: center; gap: 12px; inline-size: 100%; block-size: auto; min-block-size: 70px; margin: 0; padding: 18px 62px 16px 20px; border: 0; border-block-end: 1px solid var(--dcuf-b1-line); background: transparent; color: inherit; box-sizing: border-box; }
            [data-dcuf-article-popup] [data-dcuf-article-part="head"] > h3[data-dcuf-article-part="title"] { float: none; flex: 1; min-inline-size: 0; margin: 0; padding: 0; color: inherit; font: 750 16px/1.5 system-ui, sans-serif; letter-spacing: -.015em; }
            [data-dcuf-article-popup] [data-dcuf-article-part="head-actions"] { float: none; margin-inline-start: auto; }
            [data-dcuf-article-popup] [data-dcuf-article-part="body"] { display: block; inline-size: 100%; min-inline-size: 0; margin: 0; padding: 20px; color: inherit; box-sizing: border-box; }
            [data-dcuf-article-popup] [data-dcuf-article-part="form-stack"] { display: grid; gap: 12px; inline-size: 100%; min-inline-size: 0; margin: 0; padding: 0; border: 0; box-sizing: border-box; }
            [data-dcuf-article-popup] [data-dcuf-article-part="form-stack"] > [data-dcuf-article-part="form-stack"] { gap: 12px; }
            [data-dcuf-article-popup] [data-dcuf-article-part="field-row"] { display: flex; flex-wrap: wrap; gap: 12px; min-inline-size: 0; margin: 0; }
            [data-dcuf-article-popup] [data-dcuf-article-part="field-shell"] { position: relative; flex: 1 1 140px; float: none; inline-size: auto; min-inline-size: 0; margin: 0; padding: 0; border: 0; box-sizing: border-box; }
            [data-dcuf-article-popup] [data-dcuf-article-part="search-shell"] { display: flex; inline-size: 100%; min-inline-size: 0; block-size: auto; padding: 0; margin: 0; border: 0; box-sizing: border-box; }
            [data-dcuf-article-popup][data-dcuf-role] [data-dcuf-article-part="field"] { inline-size: 100%; min-inline-size: 0; max-inline-size: 100%; block-size: auto; min-block-size: 40px; padding: 9px 12px; margin: 0; border: 1px solid var(--dcuf-view-border-strong); border-radius: 8px; background: var(--dcuf-theme-surface-input); color: var(--dcuf-view-fg); caret-color: var(--dcuf-view-accent); font: 400 13px/1.5 system-ui, sans-serif; box-sizing: border-box; }
            [data-dcuf-article-popup] textarea[data-dcuf-article-part="field"] { min-block-size: 72px; resize: vertical; }
            [data-dcuf-article-popup] [data-dcuf-article-part="field"]::placeholder { color: var(--dcuf-view-fg-sub); opacity: 1; }
            [data-dcuf-article-popup] [data-dcuf-article-part="actions"] { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px; inline-size: 100%; min-inline-size: 0; margin: 16px 0 0; padding: 16px 0 0; border-block-start: 1px solid var(--dcuf-b1-line); box-sizing: border-box; }
            [data-dcuf-article-popup] [data-dcuf-article-part="action"], [data-dcuf-article-popup] [data-dcuf-article-part="primary"] {
 display: inline-flex; align-items: center; justify-content: center; min-block-size: 40px; inline-size: auto; block-size: auto; margin: 0; padding: 8px 12px; border: 1px solid var(--dcuf-control-rim); border-radius: 8px;  color: var(--dcuf-view-fg); font: 600 13px/1.5 system-ui, sans-serif; text-shadow: none; text-decoration: none; cursor: pointer; box-sizing: border-box;
                background: var(--dcuf-control-secondary-bg);
                box-shadow: var(--dcuf-control-shadow);
            }
            [data-dcuf-article-popup] [data-dcuf-article-part="primary"] {
 min-inline-size: 96px; color: var(--dcuf-theme-on-accent); border-color: var(--dcuf-control-primary-rim);
                background: var(--dcuf-control-primary-bg);
                box-shadow: var(--dcuf-control-shadow);
            }
            [data-dcuf-article-popup] [data-dcuf-article-part="choices"] { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 12px; inline-size: 100%; margin: 0; padding: 20px; list-style: none; box-sizing: border-box; }
            [data-dcuf-article-popup] [data-dcuf-article-part="choice-item"] { float: none; inline-size: auto; margin: 0; padding: 0; }
            [data-dcuf-article-popup] [data-dcuf-article-part="choice-item"] > [data-dcuf-article-part="action"] > [data-dcuf-article-part="choice-label"] { margin: 0; color: inherit; font: inherit; }
            [data-dcuf-article-part="choices"] > [data-dcuf-article-part="action"], [data-dcuf-article-part="choice-item"] > [data-dcuf-article-part="action"] {
 display: flex; flex-direction: column; gap: 8px; inline-size: 100%; min-block-size: 80px; padding: 8px 4px; border: 0;  text-align: center;
                background: var(--dcuf-control-glaze);
                box-shadow: var(--dcuf-control-quiet-shadow);
            }
            [data-dcuf-article-popup] [data-dcuf-article-part="copy-row"] { display: flex; gap: 8px; inline-size: 100%; block-size: auto; margin: 0; padding: 0 20px 20px; border: 0; box-sizing: border-box; }
            [data-dcuf-article-part="copy-row"] > [data-dcuf-article-part="field"] { flex: 1; inline-size: 0; min-inline-size: 0; }
            [data-dcuf-article-popup] [data-dcuf-article-part="copy-row"] > [data-dcuf-article-part="action"] {
 position: static; inset: auto; flex: 0 0 auto; inline-size: auto; white-space: nowrap;  color: var(--dcuf-view-fg);
                background: var(--dcuf-control-secondary-bg);
                box-shadow: var(--dcuf-control-shadow);
            }
            [data-dcuf-article-popup] [data-dcuf-article-part="message"] { min-inline-size: 0; margin: 0; padding: 0; color: inherit; font: 400 14px/1.7 system-ui, sans-serif; text-align: start; }
            [data-dcuf-article-popup="guide"] [data-dcuf-article-part="message"] { padding: 16px 20px; }
            [data-dcuf-article-popup] [data-dcuf-article-part="footnote"] { display: block; margin: 16px 0 0; padding: 12px 20px; border-block-start: 1px solid var(--dcuf-b1-line); background: transparent; color: var(--dcuf-view-fg-sub); font: 400 12px/1.6 system-ui,sans-serif; }
            [data-dcuf-article-popup] [data-dcuf-article-part="guidance"] { position: relative; inline-size: 100%; margin: 0; color: var(--dcuf-view-fg-sub); font: 400 12px/1.65 system-ui,sans-serif; }
            [data-dcuf-article-part="guidance"] > p > [data-dcuf-article-part="action"] {
 display: inline; min-block-size: 0; margin: 0; padding: 0; border: 0;  color: inherit; font: inherit;
                background: var(--dcuf-control-glaze);
                box-shadow: var(--dcuf-control-quiet-shadow);
            }
            [data-dcuf-article-popup] [data-dcuf-article-part="preview"] { inline-size: 100%; max-inline-size: 100%; min-inline-size: 0; padding: 0; border: 1px solid var(--dcuf-b1-line); border-radius: 10px; background: var(--dcuf-b1-paper); overflow: hidden; box-sizing: border-box; }
            [data-dcuf-article-popup] [data-dcuf-article-part="preview-head"], [data-dcuf-article-popup] [data-dcuf-article-part="preview-body"] { margin: 0; padding: 12px 16px; }
            [data-dcuf-article-popup] [data-dcuf-article-part="preview-head"] { border-block-end: 1px solid var(--dcuf-b1-line); }
            [data-dcuf-article-part="preview-head"] > h3, [data-dcuf-article-part="preview-body"] h4 { margin: 0; color: var(--dcuf-view-fg); font: 650 13px/1.5 system-ui,sans-serif; }
            [data-dcuf-article-part="preview-meta"] { display: flex; gap: 12px; margin-block-start: 4px; color: var(--dcuf-view-fg-sub); font: 400 12px/1.5 system-ui,sans-serif; }
            [data-dcuf-article-popup] [data-dcuf-article-part="media"] { display: block; max-inline-size: 100%; block-size: auto; margin-block-start: 8px; border-radius: 6px; }
            [data-dcuf-article-popup] [data-dcuf-article-part="comment"] { inline-size: 100%; margin: 16px 0 0; padding: 0; border: 0; box-sizing: border-box; }
            [data-dcuf-article-popup] [data-dcuf-article-part="submenu"] { max-inline-size: 100%; padding: 10px; border: 1px solid var(--dcuf-view-border); border-radius: 10px; background: var(--dcuf-b1-sheen),var(--dcuf-b1-floating); color: inherit; backdrop-filter: var(--dcuf-b1-floating-filter,blur(24px)); box-shadow: var(--dcuf-b1-shadow); box-sizing: border-box; z-index: 2; }
            [data-dcuf-article-popup] [data-dcuf-article-part="submenu-list"], [data-dcuf-article-part="submenu-list"] > ul, [data-dcuf-article-popup] [data-dcuf-article-part="submenu-item"] { margin: 0; padding: 0; list-style: none; }
            [data-dcuf-article-popup] [data-dcuf-article-part="submenu-link"] { display: block; min-block-size: 40px; padding: 10px 12px; border-radius: 6px; color: var(--dcuf-view-fg); font: 500 13px/1.5 system-ui,sans-serif; text-decoration: none; box-sizing: border-box; }
            [data-dcuf-article-part="submenu-link"]:hover { background: var(--dcuf-theme-accent-soft); }
            [data-dcuf-article-popup] [data-dcuf-article-part="close"] { position: absolute; inset: 12px 12px auto auto; display: inline-flex; align-items: center; justify-content: center; inline-size: 36px; block-size: 36px; margin: 0; padding: 0; border: 0; border-radius: 8px; background: var(--dcuf-control-glaze); box-shadow: var(--dcuf-control-quiet-shadow); color: var(--dcuf-view-fg-sub); font-size: 0; cursor: pointer; }
            [data-dcuf-article-part="inline-close"] { position: static; display: inline-flex; align-items: center; justify-content: center; inline-size: 32px; block-size: 32px; margin: 0; padding: 0; border-radius: 8px; background: var(--dcuf-control-glaze); box-shadow: var(--dcuf-control-quiet-shadow); color: var(--dcuf-view-fg-sub); font-size: 0; }
            [data-dcuf-article-part="close"] > em { display: none; }
            [data-dcuf-article-part="close"]::before, [data-dcuf-article-part="inline-close"]::before { content: ""; inline-size: 14px; block-size: 14px; background: currentColor; mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='m4 4 8 8M12 4l-8 8' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E") center/contain no-repeat; }
            [data-dcuf-article-popup] [data-dcuf-article-part="action"]:hover, [data-dcuf-article-popup] [data-dcuf-article-part="close"]:hover {
                background: var(--dcuf-control-secondary-bg);
                box-shadow: var(--dcuf-control-shadow);
            }
            [data-dcuf-article-part="primary"]:hover { filter: brightness(1.06); }
            [data-dcuf-article-part="primary"]:active { box-shadow: inset 0 1px 3px #0002; }
            [data-dcuf-article-popup] :is(input,textarea,button,a,label):focus-visible { outline: 2px solid var(--dcuf-view-accent); outline-offset: 2px; }
            [data-dcuf-article-popup] button:disabled { opacity: .55; cursor: default; }
            @media screen and (max-width: 640px) {
                [data-dcuf-article-popup] { --dcuf-article-popup-center: calc(50% - 48px); --dcuf-article-popup-clearance: 128px; }
                [data-dcuf-surface="article-recommendation"][data-dcuf-role="article"] {
                    inline-size: calc(100% - 24px);
                    padding: 8px 8px 0 !important;
                }
                [data-dcuf-role="article-header"] {
                    padding: 15px 14px 12px;
                    border-radius: 12px;
                }
                [data-dcuf-role="article-title"] { font-size: 20px; }
                [data-dcuf-role="article-body"] { padding-inline: 14px; }
                [data-dcuf-surface="article-recommendation"][data-dcuf-role="recommendation"] {
                    padding-inline: 14px;
                    border-radius: 12px;
                }
            }
            @media (prefers-reduced-motion: reduce) {
                [data-dcuf-role="native-recommend-up"],
                [data-dcuf-role="native-recommendation-action"],
                [data-dcuf-role="native-article-action"] {
                    transition: none;
                }
            }
        `;
        // Readiness belongs to this visual owner; the adapter only measures.
        const describeReadiness = (s) => {
            if (!s.contentIsWritingBox && !s.contentIsModernBody) return 'missing-content-owner';
            if (!s.contentIsWritingBox && !s.contentStyleOwnerPresent) return 'missing-content-style-owner';
            if (Math.max(s.wrapPaddingLeft, s.wrapPaddingRight) < 8) return 'insufficient-wrap-padding';
            if (s.headRadius < 10) return 'insufficient-head-radius';
            if (s.headTransparent) return 'transparent-head-background';
            if (!s.contentIsWritingBox && (s.contentPaddingTop < 16 || s.contentPaddingBottom < 16)) return 'insufficient-content-padding';
            if (!s.contentIsWritingBox && (s.contentRadius > 1 || s.contentBoxShadow !== 'none'
                || s.contentBackgroundImage !== 'none' || !s.contentTransparent || s.contentHasRenderableBorder)) return 'content-card-drift';
            if (s.includeExtendedSurfaces && s.hasRecommendBox) {
                if (s.recommendBoxRadius < 10) return 'insufficient-recommend-radius';
                if (s.recommendBoxTransparent) return 'transparent-recommend-background';
            }
            return null;
        };
        return Object.freeze({ STYLE_ID, cssText, describeReadiness });
    })();
    __dcufRoot.__dcufArticlePresenter = __dcufArticlePresenter;
