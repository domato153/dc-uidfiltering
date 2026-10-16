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
                inline-size: 100%;
                min-inline-size: 0;
                margin: 0;
                padding: 10px 10px 0 !important;
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
                border: 1px solid var(--dcuf-theme-border-strong, var(--dcuf-view-border-strong));
                border-radius: 18px;
                background-color: var(--dcuf-theme-surface-raised, var(--dcuf-view-surface));
                background-image: linear-gradient(180deg, color-mix(in srgb, white 20%, var(--dcuf-theme-surface-raised, var(--dcuf-view-surface))) 0%, var(--dcuf-theme-surface, var(--dcuf-view-surface)) 100%);
                box-shadow: inset 0 1px 0 color-mix(in srgb, white 70%, transparent), var(--dcuf-theme-card-shadow, var(--dcuf-view-shadow));
                box-sizing: border-box;
            }
            [data-dcuf-role="article"][data-dcuf-state="dark"] [data-dcuf-role="article-header"] {
                background-image: linear-gradient(180deg, color-mix(in srgb, white 5%, var(--dcuf-theme-surface-raised, var(--dcuf-view-surface))) 0%, var(--dcuf-theme-surface, var(--dcuf-view-surface)) 100%);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, .07), 0 5px 14px rgba(0, 0, 0, .22);
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
                font-weight: 800;
                letter-spacing: -.03em;
            }
            [data-dcuf-role="article-title-device"] {
                margin-inline-start: 6px;
            }
            [data-dcuf-role="article-meta"] {
                block-size: auto;
                margin-block-start: 14px;
                padding-block-start: 11px;
                border-block-start: 1px solid var(--dcuf-view-border);
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
            [data-dcuf-role="native-article-scrap"] {
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
                color: var(--dcuf-view-accent);
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
            [data-dcuf-role="article-media"],
            [data-dcuf-role="article-content"] :is(img, picture, video, canvas) {
                max-inline-size: 100%;
                block-size: auto;
                border-radius: 14px;
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
                border: 1px solid var(--dcuf-theme-border, var(--dcuf-view-border));
                border-radius: 14px;
                background-image: linear-gradient(180deg, var(--dcuf-theme-card-top, var(--dcuf-view-surface-muted)), var(--dcuf-theme-surface-raised, var(--dcuf-view-surface)));
                box-shadow: var(--dcuf-theme-card-shadow, var(--dcuf-view-shadow));
                box-sizing: border-box;
            }
            [data-dcuf-role="native-article-action"] {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-block-size: 38px;
                padding-inline: 16px;
                border: 1px solid var(--dcuf-theme-border-strong, var(--dcuf-view-border-strong));
                border-radius: 11px;
                background-color: var(--dcuf-theme-surface-input, var(--dcuf-view-surface-muted));
                background-image: linear-gradient(180deg, var(--dcuf-theme-card-top, var(--dcuf-view-surface-muted)), var(--dcuf-theme-surface-input, var(--dcuf-view-surface-muted)));
                color: var(--dcuf-theme-fg, var(--dcuf-view-fg));
                box-shadow: 0 3px 8px color-mix(in srgb, var(--dcuf-theme-accent-strong, var(--dcuf-view-accent)) 6%, transparent), inset 0 1px 0 color-mix(in srgb, white 72%, transparent);
                transition: transform 110ms ease, filter 110ms ease;
            }
            [data-dcuf-role="native-article-action"][data-dcuf-state="primary"] {
                border-color: var(--dcuf-theme-accent-strong, var(--dcuf-view-accent));
                background-color: var(--dcuf-theme-accent-strong, var(--dcuf-view-accent));
                background-image: linear-gradient(145deg, var(--dcuf-theme-accent, var(--dcuf-view-accent)), var(--dcuf-theme-accent-strong, var(--dcuf-view-accent)));
                color: var(--dcuf-theme-on-accent, #fff);
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
                border-color: #d87070;
                background: #fff1f2;
                color: #b42318;
            }
            [data-dcuf-role="article"][data-dcuf-state="dark"] [data-dcuf-role="native-article-action"][data-dcuf-state="destructive"]:is(:hover, :focus-visible) {
                border-color: #b95d65;
                background: #3b2025;
                color: #ffb4bc;
            }
            [data-dcuf-surface="article-recommendation"][data-dcuf-role="recommendation"] {
                display: block;
                inline-size: min(680px, 100%);
                max-inline-size: 100%;
                min-inline-size: 0;
                margin: 14px auto 6px;
                padding: 14px 16px 28px;
                border: 1px solid var(--dcuf-theme-border, var(--dcuf-view-border));
                border-radius: 18px;
                background-color: var(--dcuf-theme-article-surface, var(--dcuf-view-surface));
                background-image: linear-gradient(180deg, var(--dcuf-theme-surface-raised, var(--dcuf-view-surface)), var(--dcuf-theme-article-surface, var(--dcuf-view-surface)));
                box-shadow: 0 2px 7px rgba(31, 41, 55, .07);
                box-sizing: border-box;
                overflow: visible;
            }
            [data-dcuf-role="article"][data-dcuf-state="dark"] [data-dcuf-role="recommendation"] {
                box-shadow: 0 4px 12px rgba(0, 0, 0, .18), inset 0 1px 0 rgba(255, 255, 255, .035);
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
            [data-dcuf-role="recommendation-vote-group"] {
                display: grid;
                align-items: center;
                justify-content: center;
                column-gap: 10px;
                row-gap: 0;
                flex: 0 1 168px;
                min-block-size: 0;
                padding: 8px 10px;
                border: 1px solid var(--dcuf-theme-border, var(--dcuf-view-border));
                border-radius: 14px;
                background-color: var(--dcuf-theme-card-top, var(--dcuf-view-surface-muted));
                background-image: linear-gradient(180deg, var(--dcuf-theme-card-top, var(--dcuf-view-surface-muted)), var(--dcuf-theme-card-bottom, var(--dcuf-view-surface-muted)));
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
                color: var(--dcuf-theme-accent, var(--dcuf-view-accent));
            }
            [data-dcuf-role="recommendation-accent-count"] {
                color: var(--dcuf-theme-accent, var(--dcuf-view-accent));
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
                border: 1px solid color-mix(in srgb, var(--dcuf-theme-accent) 72%, transparent);
                border-radius: 50%;
                background: linear-gradient(145deg, var(--dcuf-theme-accent), var(--dcuf-theme-accent-strong));
                box-shadow: 0 6px 14px var(--dcuf-theme-accent-shadow);
                transition: transform 110ms ease, filter 110ms ease;
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
            [data-dcuf-role="recommend-up-icon"] {
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
                color: var(--dcuf-theme-on-accent);
                font: 900 26px/.9 Arial, sans-serif;
                text-shadow: 0 1px 1px rgba(0, 0, 0, .12);
            }
            [data-dcuf-role="recommend-up-icon"]::after {
                content: "개념";
                display: block;
                margin-block-start: 2px;
                color: var(--dcuf-theme-on-accent);
                font: 850 10px/1.05 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                letter-spacing: -.04em;
                text-shadow: 0 1px 1px rgba(0, 0, 0, .12);
            }
            [data-dcuf-role="recommendation-actions"] {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                justify-content: center;
                gap: 10px;
                inline-size: 100%;
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
                padding-inline: 12px;
                border: 1px solid var(--dcuf-theme-border-strong, var(--dcuf-view-border-strong));
                border-radius: 999px;
                background-color: var(--dcuf-theme-card-top, transparent);
                background-image: linear-gradient(180deg, var(--dcuf-theme-card-top, transparent), var(--dcuf-theme-surface-input, transparent));
                color: var(--dcuf-theme-fg-muted, var(--dcuf-view-fg-sub));
                white-space: nowrap;
                transition: transform 110ms ease, filter 110ms ease;
            }
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
            @media screen and (max-width: 640px) {
                [data-dcuf-surface="article-recommendation"][data-dcuf-role="article"] {
                    padding: 8px 8px 0 !important;
                }
                [data-dcuf-role="article-header"] {
                    padding: 15px 14px 12px;
                    border-radius: 16px;
                }
                [data-dcuf-role="article-title"] { font-size: 20px; }
                [data-dcuf-role="article-body"] { padding-inline: 14px; }
                [data-dcuf-surface="article-recommendation"][data-dcuf-role="recommendation"] {
                    padding-inline: 14px;
                    border-radius: 16px;
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
        return Object.freeze({ STYLE_ID, cssText });
    })();
    __dcufRoot.__dcufArticlePresenter = __dcufArticlePresenter;
