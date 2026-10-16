    const __dcufListPresenter = (() => {
        const VERSION = 'list-snapshot-v1';
        const CSS = `
            [data-dcuf-surface="list-container"] {
                --dcuf-list-border: var(--dcuf-theme-border, #dfe5ee);
                --dcuf-list-surface: var(--dcuf-theme-surface, #fff);
                --dcuf-list-muted: var(--dcuf-theme-surface-muted, #f6f8fb);
                --dcuf-list-fg: var(--dcuf-theme-fg, #273142);
                --dcuf-list-subtle: var(--dcuf-theme-fg-muted, #697386);
                --dcuf-list-accent: var(--dcuf-theme-accent, #245bda);
                overflow: clip;
                border-block: 1px solid var(--dcuf-list-border);
                background: var(--dcuf-list-surface);
            }
            [data-dcuf-surface="list-item"] {
                position: relative;
                display: block;
                padding: 13px 16px 12px;
                border-bottom: 1px solid var(--dcuf-list-border);
                background: var(--dcuf-list-surface);
                color: var(--dcuf-list-fg);
                transition: background-color 160ms ease, transform 100ms ease;
            }
            [data-dcuf-surface="list-item"]:last-child { border-bottom: 0; }
            [data-dcuf-surface="list-item"]:active,
            [data-dcuf-surface="list-item"]:has(.dcuf-list-title-link:active) { transform: scale(.997); }
            [data-dcuf-surface="list-item"][data-dcuf-state="advertisement"] { display: none; }
            [data-dcuf-surface="list-item"][data-dcuf-state="notice"],
            [data-dcuf-surface="list-item"][data-dcuf-state="concept"] {
                padding-left: 58px;
                background: color-mix(in srgb, var(--dcuf-list-accent) 6%, var(--dcuf-list-surface));
            }
            [data-dcuf-surface="list-item"][data-dcuf-state="notice"]::before,
            [data-dcuf-surface="list-item"][data-dcuf-state="concept"]::before {
                position: absolute;
                left: 14px;
                top: 13px;
                padding: 3px 7px;
                border-radius: 999px;
                background: var(--dcuf-list-accent);
                color: var(--dcuf-theme-on-accent, #fff);
                font-size: 11px;
                font-weight: 800;
                line-height: 1.4;
            }
            [data-dcuf-surface="list-item"][data-dcuf-state="notice"]::before { content: "공지"; background: #d93c4a; }
            [data-dcuf-surface="list-item"][data-dcuf-state="concept"]::before { content: "개념"; }
            [data-dcuf-surface="list-item"] .dcuf-list-title {
                display: flex;
                min-width: 0;
                align-items: baseline;
                gap: 6px;
                margin-bottom: 7px;
                color: var(--dcuf-list-fg);
                font-size: clamp(15px, 3.9vw, 17px);
                font-weight: 650;
                line-height: 1.42;
                word-break: break-all;
            }
            [data-dcuf-surface="list-item"] .dcuf-list-title-link {
                min-width: 0;
                color: inherit;
                text-decoration: none;
                -webkit-tap-highlight-color: rgba(36, 91, 218, .16);
            }
            [data-dcuf-surface="list-item"] .dcuf-list-title-link:visited { color: var(--dcuf-theme-fg-visited, #625282); }
            [data-dcuf-surface="list-item"] .dcuf-list-subject,
            [data-dcuf-surface="list-item"] .dcuf-list-reply,
            [data-dcuf-surface="list-item"] .dcuf-title-decoration { flex: none; }
            [data-dcuf-surface="list-item"] .dcuf-list-subject,
            [data-dcuf-surface="list-item"] .dcuf-list-reply,
            [data-dcuf-surface="list-item"] .dcuf-title-decoration { color: var(--dcuf-list-accent); }
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
            [data-dcuf-surface="list-item"] .dcuf-list-author { min-width: 0; cursor: pointer; -webkit-tap-highlight-color: transparent; }
            [data-dcuf-surface="list-item"] .dcuf-list-stats { flex: none; white-space: nowrap; }
            [data-dcuf-surface="list-toolbar"],
            [data-dcuf-surface="list-actions"] {
                position: relative;
                z-index: 2;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                min-height: 48px;
                margin: 10px 0;
                padding: 8px 10px;
                border: 1px solid var(--dcuf-theme-border, #dfe5ee);
                border-radius: 14px;
                background: var(--dcuf-theme-surface-raised, #fff);
                box-shadow: var(--dcuf-theme-card-shadow, 0 5px 16px rgba(20, 39, 75, .07));
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
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="toolbar-actions"] { margin-left: auto; }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="tablist"] { min-width: 0; }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="tablist"] > ul {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 7px;
                min-width: 0;
                margin: 0;
                padding: 0;
                list-style: none;
            }
            @media (max-width: 600px) {
                [data-dcuf-surface="list-toolbar"] { flex-wrap: wrap; }
                [data-dcuf-surface="list-toolbar"] [data-dcuf-role="tablist"] { flex: 1 1 100%; }
            }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="legacy-page-size"][data-dcuf-state="superseded"] { display: none; }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="page-size"] {
                display: block;
                min-width: 76px;
                min-height: 40px;
                box-sizing: border-box;
                padding: 0 9px;
                border: 1px solid var(--dcuf-theme-border-strong, #cbd5e1);
                border-radius: 10px;
                background: var(--dcuf-theme-surface-input, #fff);
                color: var(--dcuf-theme-fg, #273142);
                font: inherit;
            }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="action"],
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="primary-action"],
            [data-dcuf-surface="list-actions"] [data-dcuf-role="action"],
            [data-dcuf-surface="list-actions"] [data-dcuf-role="primary-action"] {
                display: inline-flex;
                min-width: 44px;
                min-height: 40px;
                align-items: center;
                justify-content: center;
                padding: 0 12px;
                border: 1px solid var(--dcuf-theme-border-strong, #cbd5e1);
                border-radius: 11px;
                background: var(--dcuf-theme-surface-input, #fff);
                color: var(--dcuf-theme-fg, #273142);
                font-weight: 700;
                text-decoration: none;
                transition: transform 100ms ease, border-color 160ms ease, background-color 160ms ease;
            }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="action"]:active,
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="primary-action"]:active,
            [data-dcuf-surface="list-actions"] [data-dcuf-role="action"]:active,
            [data-dcuf-surface="list-actions"] [data-dcuf-role="primary-action"]:active { transform: scale(.98); }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-state="current"],
            [data-dcuf-surface="list-actions"] [data-dcuf-state="current"],
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="primary-action"],
            [data-dcuf-surface="list-actions"] [data-dcuf-role="primary-action"] {
                border-color: var(--dcuf-theme-accent-strong, #245bda);
                background: var(--dcuf-theme-accent-strong, #245bda);
                color: var(--dcuf-theme-on-accent, #fff);
            }
            [data-dcuf-surface="list-toolbar"] [data-dcuf-role="primary-action"]::before,
            [data-dcuf-surface="list-actions"] [data-dcuf-role="primary-action"]::before {
                content: "✎";
                display: inline-block;
                margin-right: 6px;
                color: currentColor;
                font-size: 14px;
                line-height: 1;
            }
            [data-dcuf-surface="list-pagination"],
            [data-dcuf-surface="list-search"] {
                display: block;
                width: 100%;
                box-sizing: border-box;
                margin: 10px 0;
                padding: 12px;
                border: 1px solid var(--dcuf-theme-border, #dfe5ee);
                border-radius: 14px;
                background: var(--dcuf-theme-surface-raised, #fff);
                box-shadow: var(--dcuf-theme-card-shadow, 0 5px 16px rgba(20, 39, 75, .07));
            }
            [data-dcuf-surface="list-pagination"] [data-dcuf-role="pages"] {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
                overflow-x: auto;
                scrollbar-width: none;
            }
            [data-dcuf-surface="list-pagination"] [data-dcuf-role="page"],
            [data-dcuf-surface="list-pagination"] [data-dcuf-role="page-direction"] {
                display: inline-flex;
                flex: 0 0 auto;
                min-width: 40px;
                min-height: 40px;
                align-items: center;
                justify-content: center;
                padding: 0 8px;
                border: 1px solid transparent;
                border-radius: 10px;
                color: var(--dcuf-theme-fg, #273142);
                text-decoration: none;
            }
            [data-dcuf-surface="list-pagination"] [data-dcuf-role="page"][data-dcuf-state="current"] {
                border-color: var(--dcuf-theme-accent, #245bda);
                background: var(--dcuf-theme-accent-soft, #e9efff);
                color: var(--dcuf-theme-accent-strong, #245bda);
                font-weight: 800;
            }
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
            [data-dcuf-surface="list-search"] [data-dcuf-role="controls"] {
                display: grid;
                grid-template-columns: minmax(112px, 132px) minmax(0, 1fr);
                align-items: center;
                gap: 8px;
            }
            [data-dcuf-surface="list-search"] [data-dcuf-role="select-group"],
            [data-dcuf-surface="list-search"] [data-dcuf-role="query-group"],
            [data-dcuf-surface="list-search"] [data-dcuf-role="query-controls"] {
                position: static;
                display: flex;
                min-width: 0;
                width: auto;
                align-items: stretch;
                margin: 0;
            }
            [data-dcuf-surface="list-search"] [data-dcuf-role="legacy-select"][data-dcuf-state="superseded"] { display: none; }
            [data-dcuf-surface="list-search"] [data-dcuf-role="select"] {
                display: block;
                width: 100%;
                min-height: 44px;
                box-sizing: border-box;
                padding: 0 10px;
                border: 1px solid var(--dcuf-theme-border-strong, #cbd5e1);
                border-radius: 11px;
                background: var(--dcuf-theme-surface-input, #fff);
                color: var(--dcuf-theme-fg, #273142);
                font: inherit;
            }
            [data-dcuf-surface="list-search"] [data-dcuf-role="field-shell"] {
                display: block;
                flex: 1 1 auto;
                min-width: 0;
                border: 1px solid var(--dcuf-theme-border-strong, #cbd5e1);
                border-radius: 11px 0 0 11px;
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
                font: inherit;
            }
            [data-dcuf-surface="list-search"] [data-dcuf-role="submit"] {
                display: inline-flex;
                flex: 0 0 46px;
                min-width: 46px;
                min-height: 44px;
                align-items: center;
                justify-content: center;
                margin: 0;
                border: 1px solid var(--dcuf-theme-accent-strong, #245bda);
                border-radius: 0 11px 11px 0;
                background: var(--dcuf-theme-accent-strong, #245bda);
                color: var(--dcuf-theme-on-accent, #fff);
            }
            [data-dcuf-surface="list-search"] [data-dcuf-role="options-popup"] {
                left: 0;
                top: calc(100% + 8px);
                border: 1px solid var(--dcuf-theme-border-strong, #cbd5e1);
                border-radius: 11px;
                background: var(--dcuf-theme-surface-raised, #fff);
                box-shadow: var(--dcuf-theme-popup-shadow, 0 12px 30px rgba(20, 39, 75, .16));
            }
            @media (prefers-reduced-motion: no-preference) {
                [data-dcuf-surface="list-container"] > [data-dcuf-surface="list-item"]:nth-child(-n + 8) {
                    animation: dcuf-list-reveal 180ms both;
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
                [data-dcuf-surface="list-toolbar"] [data-dcuf-role="action"],
                [data-dcuf-surface="list-actions"] [data-dcuf-role="action"] { transition: none; animation: none; }
            }
        `;
        const ALLOWED_TAGS = new Set(['a', 'b', 'em', 'i', 'span', 'strong']);
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
        const renderAttributes = (attributes) => Object.entries(attributes || {})
            .filter(([name]) => /^(?:aria-[a-z0-9_-]+|data-[a-z0-9_-]+|href|target|title)$/.test(name))
            .map(([name, value]) => ` ${name}="${escapeHtml(value)}"`)
            .join('');
        const renderDescriptor = (descriptor) => {
            if (!descriptor || typeof descriptor !== 'object') return '';
            if (descriptor.kind === 'text') return escapeHtml(descriptor.text);
            const tag = ALLOWED_TAGS.has(descriptor.tag) ? descriptor.tag : 'span';
            const classes = classText(descriptor.classes);
            const attributes = renderAttributes(descriptor.attributes);
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
