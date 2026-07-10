; (() => {
    const STYLE_ID = 'dcuf-phase1-list-theme';
    const DEBUG_KEY = '__DCUF_PHASE1_DEBUG__';
    const css = `
        .custom-mobile-list {
            --dcuf-fg: #2b3340;
            --dcuf-fg-sub: #4a5566;
            --dcuf-fg-meta: #667285;
            --dcuf-accent: #245bda;
            --dcuf-surface: #f6f8fb;
            --dcuf-border: #dfe5ee;
            background: linear-gradient(180deg, #f2f6fb 0%, #f8fafc 100%) !important;
            border-top: 1px solid var(--dcuf-border) !important;
            padding: 8px 10px !important;
        }
        .custom-post-item {
            margin: 0 0 8px 0 !important;
            padding: 13px 14px !important;
            border: 1px solid var(--dcuf-border) !important;
            border-radius: 12px !important;
            background: #fff !important;
            box-shadow: 0 2px 8px rgba(12, 22, 40, 0.06);
            color: var(--dcuf-fg) !important;
        }
        .custom-post-item:last-child {
            margin-bottom: 0 !important;
        }
        .custom-post-item:hover {
            background: var(--dcuf-surface) !important;
            border-color: #d2dce9 !important;
        }
        .custom-post-item.notice,
        .custom-post-item.concept {
            padding-left: 14px !important;
            padding-top: 40px !important;
        }
        .custom-post-item.notice::before,
        .custom-post-item.concept::before {
            top: 10px !important;
            left: 12px !important;
            transform: none !important;
            border-radius: 999px !important;
            font-size: 11px !important;
            padding: 3px 8px !important;
        }
        .post-title {
            font-size: 18px !important;
            line-height: 1.42 !important;
            margin-bottom: 8px !important;
            color: var(--dcuf-fg) !important;
            letter-spacing: -0.01em;
            gap: 6px;
        }
        .post-title a {
            min-width: 0;
        }
        .post-title a:visited {
            color: #6f45aa !important;
        }
        .post-title .gall_subject {
            border: none !important;
            border-radius: 999px;
            background: #eef2f7;
            color: #516075 !important;
            font-size: 12px !important;
            font-weight: 700 !important;
            padding: 2px 8px !important;
            margin-right: 2px !important;
        }
        .post-title .reply_num {
            color: var(--dcuf-accent) !important;
            background: transparent !important;
            border-radius: 0 !important;
            padding: 0 !important;
            margin-left: 2px !important;
        }
        .post-meta {
            color: var(--dcuf-fg-meta) !important;
            align-items: center !important;
            gap: 8px !important;
        }
        .post-meta .author .nickname,
        .post-meta .author .ip {
            color: var(--dcuf-fg-sub) !important;
        }
        .post-meta .author .nickname {
            font-size: 14px !important;
            font-weight: 700 !important;
        }
        .post-meta .stats {
            font-size: 12px !important;
            gap: 8px !important;
        }
        .custom-bottom-controls {
            background: transparent !important;
            padding: 10px 6px 14px !important;
            gap: 10px;
            overflow: visible !important;
        }
        .custom-button-row .list_bottom_btnbox {
            border: 1px solid var(--dcuf-border);
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.9) !important;
            box-shadow: 0 2px 8px rgba(12, 22, 40, 0.05);
            padding: 10px !important;
        }
        .custom-bottom-controls form[name="frmSearch"] {
            display: block !important;
            width: 100% !important;
            max-width: 520px;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        .custom-bottom-controls form[name="frmSearch"] fieldset,
        .custom-bottom-controls form[name="frmSearch"] .sch_smit {
            display: flex !important;
            align-items: stretch !important;
            flex-direction: row !important;
            gap: 6px !important;
            width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        .custom-bottom-controls form[name="frmSearch"] legend {
            display: none !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .search_left_box {
            display: block !important;
            flex: 0 0 125px !important;
            min-width: 125px !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .search_left_box,
        .custom-bottom-controls form[name="frmSearch"] select {
            height: 38px !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .bottom_search_wrap,
        .custom-bottom-controls form[name="frmSearch"] .buttom_search_wrap {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 4px !important;
            width: fit-content !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .select_box.bottom_array,
        .custom-bottom-controls form[name="frmSearch"] .bottom_search {
            float: none !important;
            margin: 0 !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .select_box.bottom_array {
            display: flex !important;
            align-items: stretch !important;
            flex: 0 0 125px !important;
            min-width: 125px !important;
            width: 125px !important;
            height: 38px !important;
            border: 1px solid #3b4890 !important;
            border-radius: 0 !important;
            background: #fff !important;
            box-shadow: none !important;
            overflow: visible !important;
            box-sizing: border-box !important;
            visibility: visible !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .select_box.bottom_array .select_area {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            width: 100% !important;
            height: 100% !important;
            padding: 0 30px 0 10px !important;
            position: relative !important;
            border: 0 !important;
            background: transparent !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            color: #333 !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .select_box.bottom_array #search_type_txt,
        .custom-bottom-controls form[name="frmSearch"] .select_box.bottom_array .search_type_txt {
            display: block !important;
            min-width: 0 !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            color: inherit !important;
            font-size: 13px !important;
            font-weight: 700 !important;
            line-height: 30px !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .bottom_search {
            display: flex !important;
            align-items: center !important;
            width: 320px !important;
            height: 38px !important;
            min-width: 0 !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .inner_search {
            width: 278px !important;
            height: 30px !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            background: #fff !important;
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06) !important;
            overflow: hidden !important;
        }
        .custom-bottom-controls form[name="frmSearch"] input.in_keyword,
        .custom-bottom-controls form[name="frmSearch"] input[type="text"] {
            width: 100% !important;
            height: 30px !important;
            margin: 0 !important;
            padding: 0 9px !important;
            border: none !important;
            border-radius: 0 !important;
            background: #fff !important;
            box-shadow: none !important;
            color: #333 !important;
            font-size: 14px !important;
            font-weight: 700 !important;
            line-height: 30px !important;
            box-sizing: border-box !important;
        }
        .custom-bottom-controls form[name="frmSearch"] #searchTypeLayer {
            border: 1px solid #3b4890 !important;
            background: #fff !important;
            box-shadow: none !important;
        }
        .custom-bottom-controls form[name="frmSearch"] #searchTypeLayer li,
        .custom-bottom-controls form[name="frmSearch"] #searchTypeLayer a {
            color: #333 !important;
            font-size: 13px !important;
        }
        .custom-bottom-controls form[name="frmSearch"] .bnt_search,
        .custom-bottom-controls form[name="frmSearch"] button.sp_img.bnt_search {
            flex: none !important;
            width: 37px !important;
            min-width: 37px !important;
            height: 36px !important;
            margin: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
        }
        .custom-bottom-controls .page_box {
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.85) !important;
            padding: 8px 10px;
            box-shadow: 0 2px 8px rgba(12, 22, 40, 0.05);
        }
        .custom-bottom-controls .dcuf-search-drawer-slot {
            width: 100% !important;
            display: flex !important;
            justify-content: center !important;
            position: relative !important;
            overflow: visible !important;
            padding-bottom: var(--dcuf-search-layer-reserve, 0px) !important;
            transition: padding-bottom 0.18s ease !important;
        }
        .custom-bottom-controls .dcuf-search-drawer-slot[data-dcuf-search-layer-open="1"] {
            z-index: 4 !important;
        }
        .custom-bottom-controls .dcuf-search-drawer-slot form[name="frmSearch"] {
            position: relative !important;
            z-index: 2 !important;
        }
        .custom-bottom-controls .dcuf-search-drawer-slot #searchTypeLayer {
            position: absolute !important;
            left: 0 !important;
            top: calc(100% + 8px) !important;
            width: 125px !important;
            z-index: 5 !important;
        }
        .custom-bottom-controls .bottom_movebox {
            display: flex !important;
            justify-content: flex-end !important;
            width: 100% !important;
            margin: -2px auto 0 !important;
            padding: 0 !important;
            position: relative !important;
            overflow: visible !important;
        }
        .custom-bottom-controls .bottom_movebox > .btn_grey_roundbg.btn_schmove {
            min-width: 124px !important;
            min-height: 38px !important;
            border: 1px solid var(--dcuf-border) !important;
            border-radius: 999px !important;
            background: rgba(255, 255, 255, 0.92) !important;
            box-shadow: 0 4px 12px rgba(12, 22, 40, 0.08) !important;
            color: var(--dcuf-fg-sub) !important;
        }
        .custom-bottom-controls .bottom_movebox > .btn_grey_roundbg.btn_schmove::after {
            margin-left: 6px !important;
        }
        .page_head > .fr {
            position: relative !important;
            overflow: visible !important;
        }
        .dcuf-header-drawer {
            position: relative !important;
            margin: 0 !important;
            padding: 0 !important;
            display: inline-flex !important;
            align-items: center !important;
            flex: 0 0 auto !important;
        }
        .dcuf-header-drawer__toggle {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 8px !important;
            min-height: 32px !important;
            padding: 0 12px !important;
            border: 1px solid var(--dcuf-border) !important;
            border-radius: 999px !important;
            background: rgba(255, 255, 255, 0.94) !important;
            color: var(--dcuf-fg-sub) !important;
            font-size: 12px !important;
            font-weight: 700 !important;
            letter-spacing: -0.01em !important;
            box-shadow: none !important;
            white-space: nowrap !important;
        }
        .dcuf-header-drawer__toggle::after {
            content: "\\25be";
            font-size: 10px !important;
            transition: transform 0.18s ease !important;
        }
        .dcuf-header-drawer[data-open="1"] .dcuf-header-drawer__toggle::after {
            transform: rotate(180deg) !important;
        }
        .dcuf-header-drawer__body {
            display: none !important;
            max-height: 0 !important;
            opacity: 0 !important;
            visibility: hidden !important;
            margin-top: 0 !important;
            position: absolute !important;
            top: calc(100% + 8px) !important;
            right: 0 !important;
            width: min(640px, calc(100vw - 24px)) !important;
            max-width: calc(100vw - 24px) !important;
            overflow: hidden !important;
            pointer-events: none !important;
            z-index: 60 !important;
            transition: opacity 0.18s ease !important;
        }
        .dcuf-header-drawer[data-open="1"] .dcuf-header-drawer__body {
            display: block !important;
            opacity: 1 !important;
            visibility: visible !important;
            margin-top: 0 !important;
            pointer-events: auto !important;
            overflow: visible !important;
        }
        .dcuf-header-drawer__body-inner {
            min-height: 0 !important;
            overflow: visible !important;
            display: grid !important;
            gap: 0 !important;
            border: 1px solid var(--dcuf-border, #dfe5ee) !important;
            background: #fff !important;
            box-shadow: 0 10px 22px rgba(12, 22, 40, 0.12) !important;
        }
        .dcuf-header-drawer__panel {
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            padding: 0 !important;
            overflow: visible !important;
            max-height: min(70vh, 520px) !important;
        }
        .dcuf-header-drawer__panel + .dcuf-header-drawer__panel {
            border-top: 1px solid var(--dcuf-border, #dfe5ee) !important;
        }
        .dcuf-header-drawer__panel[data-source="issue"] > .issue_contentbox,
        .dcuf-header-drawer__panel[data-source="top-recom"] > .concept_wrap {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: static !important;
            left: auto !important;
            top: auto !important;
            height: auto !important;
            max-height: none !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            float: none !important;
            border: 0 !important;
            background: #fff !important;
            box-shadow: none !important;
            overflow: visible !important;
        }
        .dcuf-header-drawer__panel[data-source="issue"] > .issue_contentbox *,
        .dcuf-header-drawer__panel[data-source="top-recom"] > .concept_wrap * {
            box-sizing: border-box !important;
            max-width: 100% !important;
        }
        .dcuf-header-drawer__panel[data-source="issue"] > .issue_contentbox .minor_intro_box,
        .dcuf-header-drawer__panel[data-source="issue"] > .issue_contentbox .minor_ranking_box,
        .dcuf-header-drawer__panel[data-source="top-recom"] > .concept_wrap .concept_txt_list {
            width: 100% !important;
        }
        .dcuf-header-drawer__panel .btn_mgall_dcp::before,
        .dcuf-header-drawer__panel .under_poply_close::before,
        .dcuf-header-drawer__panel button[class*="btn_blue"]::before {
            content: none !important;
            display: none !important;
        }
        body.dc-filter-dark-mode .custom-mobile-list {
            --dcuf-fg: #edf3ff;
            --dcuf-fg-sub: #d2dced;
            --dcuf-fg-meta: #a6b3c8;
            --dcuf-accent: #8cb4ff;
            --dcuf-surface: #1f2834;
            --dcuf-border: #3a4658;
            background: linear-gradient(180deg, #121922 0%, #17202c 100%) !important;
        }
        body.dc-filter-dark-mode .custom-post-item {
            background: linear-gradient(180deg, #222d3a 0%, #1d2734 100%) !important;
            border-color: var(--dcuf-border) !important;
            color: var(--dcuf-fg) !important;
            box-shadow: 0 6px 14px rgba(0, 0, 0, 0.25);
        }
        body.dc-filter-dark-mode .custom-post-item:hover {
            background: var(--dcuf-surface) !important;
            border-color: #4b5a70 !important;
        }
        body.dc-filter-dark-mode .post-title,
        body.dc-filter-dark-mode .post-meta,
        body.dc-filter-dark-mode .post-meta .stats,
        body.dc-filter-dark-mode .post-meta .author .nickname,
        body.dc-filter-dark-mode .post-meta .author .ip {
            color: var(--dcuf-fg-sub) !important;
        }
        body.dc-filter-dark-mode .post-title a:visited {
            color: #d3beff !important;
        }        .custom-mobile-list .post-meta .author,
        .custom-mobile-list .post-meta .author:hover,
        .custom-mobile-list .post-meta .author .gall_writer,
        .custom-mobile-list .post-meta .author .gall_writer:hover,
        .custom-mobile-list .post-meta .author .nickname,
        .custom-mobile-list .post-meta .author .nickname:hover,
        .custom-mobile-list .post-meta .author .ip,
        .custom-mobile-list .post-meta .author .ip:hover {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            outline: none !important;
        }
        .custom-mobile-list .post-meta .author .gall_writer {
            border-radius: 0 !important;
            padding: 0 !important;
        }

        body.dc-filter-dark-mode .post-title .gall_subject {
            background: #324153;
            color: #d8e3f4 !important;
        }
        body.dc-filter-dark-mode .custom-button-row .list_bottom_btnbox,
        body.dc-filter-dark-mode .custom-bottom-controls form[name="frmSearch"],
        body.dc-filter-dark-mode .custom-bottom-controls .page_box {
            background: rgba(26, 34, 46, 0.9) !important;
            border-color: #3d4c60;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.28);
        }
        body.dc-filter-dark-mode .custom-bottom-controls .bottom_movebox > .btn_grey_roundbg.btn_schmove,
        body.dc-filter-dark-mode .dcuf-header-drawer__toggle,
        body.dc-filter-dark-mode .dcuf-header-drawer__panel {
            background: rgba(26, 34, 46, 0.92) !important;
            border-color: #3d4c60 !important;
            color: #d2dced !important;
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3) !important;
        }
        body.dc-filter-dark-mode .dcuf-header-drawer__body-inner,
        body.dc-filter-dark-mode .dcuf-header-drawer__panel[data-source="issue"] > .issue_contentbox,
        body.dc-filter-dark-mode .dcuf-header-drawer__panel[data-source="issue"] > .issue_contentbox .minor_intro_box,
        body.dc-filter-dark-mode .dcuf-header-drawer__panel[data-source="issue"] > .issue_contentbox .minor_ranking_box {
            background: #1a222e !important;
            border-color: #3d4c60 !important;
            color: #d2dced !important;
        }
        body.dc-filter-dark-mode .dcuf-header-drawer__panel[data-source="issue"] > .issue_contentbox .minor_intro_box {
            background: linear-gradient(180deg, #233044 0%, #203044 100%) !important;
        }
        body.dc-filter-dark-mode .dcuf-header-drawer__panel[data-source="issue"] > .issue_contentbox .minor_ranking_box {
            background: linear-gradient(180deg, #1a222e 0%, #18202b 100%) !important;
            border-top: 1px solid rgba(88, 106, 132, 0.45) !important;
            box-shadow: inset 0 1px 0 rgba(120, 138, 164, 0.08) !important;
        }
        body.dc-filter-dark-mode .dcuf-header-drawer__panel[data-source="issue"] > .issue_contentbox *,
        body.dc-filter-dark-mode .dcuf-header-drawer__panel[data-source="issue"] > .issue_contentbox a,
        body.dc-filter-dark-mode .dcuf-header-drawer__panel[data-source="issue"] > .issue_contentbox button,
        body.dc-filter-dark-mode .dcuf-header-drawer__panel[data-source="issue"] > .issue_contentbox span,
        body.dc-filter-dark-mode .dcuf-header-drawer__panel[data-source="issue"] > .issue_contentbox li,
        body.dc-filter-dark-mode .dcuf-header-drawer__panel[data-source="issue"] > .issue_contentbox p,
        body.dc-filter-dark-mode .dcuf-header-drawer__panel[data-source="issue"] > .issue_contentbox div {
            color: #d2dced !important;
        }
        body.dc-filter-dark-mode .dcuf-header-drawer__panel[data-source="issue"] > .issue_contentbox .minor_ranking_box .rank_txt,
        body.dc-filter-dark-mode .dcuf-header-drawer__panel[data-source="issue"] > .issue_contentbox .minor_ranking_box .rank_num,
        body.dc-filter-dark-mode .dcuf-header-drawer__panel[data-source="issue"] > .issue_contentbox .minor_ranking_box .rank_txt *,
        body.dc-filter-dark-mode .dcuf-header-drawer__panel[data-source="issue"] > .issue_contentbox .minor_ranking_box .rank_num * {
            color: #edf3ff !important;
        }
        body.dc-filter-dark-mode .custom-bottom-controls form[name="frmSearch"] input[type="text"] {
            background: #111722 !important;
            border-color: #445267 !important;
            color: #f3f6ff !important;
        }
        @media screen and (max-width: 640px) {
            .custom-mobile-list { padding: 8px !important; }
            .custom-post-item { padding: 12px !important; border-radius: 11px !important; }
            .custom-post-item.notice,
            .custom-post-item.concept { padding-top: 36px !important; }
            .post-title { font-size: 17px !important; }
            .post-meta { flex-direction: column; align-items: stretch !important; }
            .post-meta .stats { justify-content: flex-start; }
        }
    `
        ;

    const debugState = {
        status: 'idle',
        detail: null,
        ts: null,
        href: location.href,
        refreshCount: 0,
        refreshAttempted: false,
        lastFailureReason: null,
        lastVerify: null
    };

    const setDebug = (status, detail, extra = {}) => {
        debugState.status = status;
        debugState.detail = detail;
        debugState.ts = new Date().toISOString();
        debugState.href = location.href;
        Object.assign(debugState, extra);
        const previousPayload = (window[DEBUG_KEY] && typeof window[DEBUG_KEY] === 'object')
            ? window[DEBUG_KEY]
            : {};
        const payload = { ...previousPayload, ...debugState };
        window[DEBUG_KEY] = payload;
        const root = document.documentElement;
        if (root instanceof HTMLElement) {
            root.setAttribute('data-dcuf-phase1', status);
        }
        return payload;
    };

    const toPixelValue = (value) => {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const isTransparentColor = (value) => {
        if (!value) return true;
        const normalized = String(value).trim().toLowerCase();
        return normalized === 'transparent' || normalized === 'rgba(0, 0, 0, 0)' || normalized === 'rgba(0,0,0,0)';
    };

    const hasRenderableBorder = (style) => {
        const edges = ['Top', 'Right', 'Bottom', 'Left'];
        return edges.some((edge) => {
            const width = toPixelValue(style[`border${edge}Width`]);
            const borderStyle = style[`border${edge}Style`];
            const color = style[`border${edge}Color`];
            return width > 0 && borderStyle !== 'none' && !isTransparentColor(color);
        });
    };

    const resolveScopeRoot = (root = document) => {
        if (root instanceof Document || root instanceof Element || root instanceof DocumentFragment) return root;
        return document;
    };

    const findWithinRoot = (root, selector) => {
        const scope = resolveScopeRoot(root);
        if (scope instanceof Element && scope.matches(selector)) return scope;
        return typeof scope.querySelector === 'function' ? scope.querySelector(selector) : null;
    };

    const injectStyle = ({ refresh = false, reason = 'ensure' } = {}) => {
        const target = document.head || document.documentElement;
        if (!target) {
            setDebug('no-target', `${reason} / head/documentElement unavailable`);
            return false;
        }

        let style = document.getElementById(STYLE_ID);
        if (style instanceof HTMLStyleElement) {
            if (refresh) {
                debugState.refreshAttempted = true;
                debugState.refreshCount += 1;
                style.textContent = css;
                target.appendChild(style);
                setDebug('style-refreshed', `${reason} / style tag refreshed`, {
                    refreshAttempted: true,
                    refreshCount: debugState.refreshCount
                });
                return true;
            }

            setDebug('style-exists', `${reason} / style tag already present`, {
                refreshAttempted: debugState.refreshAttempted,
                refreshCount: debugState.refreshCount
            });
            return true;
        }

        style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;
        target.appendChild(style);
        if (refresh) {
            debugState.refreshAttempted = true;
            debugState.refreshCount += 1;
        }
        setDebug(refresh ? 'style-refreshed' : 'style-injected', `${reason} / style tag appended`, {
            refreshAttempted: debugState.refreshAttempted,
            refreshCount: debugState.refreshCount
        });
        return true;
    };

    const verifyApplied = (reason = 'verify', root = document) => {
        const list = findWithinRoot(root, '.custom-mobile-list');
        if (!(list instanceof HTMLElement)) {
            const result = {
                ready: false,
                reason: 'waiting-list',
                detail: { reason, scope: root instanceof Element ? root.className || root.tagName : 'document' }
            };
            setDebug('waiting-list', JSON.stringify(result.detail), {
                lastFailureReason: result.reason,
                lastVerify: result
            });
            return result;
        }

        const items = Array.from(list.querySelectorAll('.custom-post-item'));
        if (items.length === 0) {
            const result = {
                ready: false,
                reason: 'waiting-items',
                detail: { reason, itemCount: 0 }
            };
            setDebug('waiting-items', JSON.stringify(result.detail), {
                lastFailureReason: result.reason,
                lastVerify: result
            });
            return result;
        }

        const item = items[0];
        const listStyle = window.getComputedStyle(list);
        const itemStyle = window.getComputedStyle(item);
        const detail = {
            reason,
            itemCount: items.length,
            listPaddingLeft: toPixelValue(listStyle.paddingLeft),
            listPaddingRight: toPixelValue(listStyle.paddingRight),
            listBackgroundColor: listStyle.backgroundColor,
            listBackgroundImage: listStyle.backgroundImage,
            itemRadius: toPixelValue(itemStyle.borderRadius),
            itemMarginBottom: toPixelValue(itemStyle.marginBottom),
            itemBackgroundColor: itemStyle.backgroundColor,
            itemBackgroundImage: itemStyle.backgroundImage,
            itemBoxShadow: itemStyle.boxShadow,
            hasVisibleBackground: itemStyle.backgroundImage !== 'none' || !isTransparentColor(itemStyle.backgroundColor),
            hasRenderableBorder: hasRenderableBorder(itemStyle)
        };

        let failureReason = null;
        if (detail.itemRadius < 10) {
            failureReason = 'insufficient-radius';
        } else if (detail.itemCount > 1 && detail.itemMarginBottom < 6) {
            failureReason = 'insufficient-spacing';
        } else if (Math.max(detail.listPaddingLeft, detail.listPaddingRight) < 8) {
            failureReason = 'insufficient-padding';
        } else if (!detail.hasVisibleBackground) {
            failureReason = 'transparent-background';
        } else if (itemStyle.boxShadow === 'none' && !detail.hasRenderableBorder) {
            failureReason = 'missing-elevation';
        }

        const result = {
            ready: !failureReason,
            reason: failureReason || 'ready',
            detail
        };
        setDebug(result.ready ? 'applied' : 'not-applied', JSON.stringify({
            ...detail,
            reason: result.reason
        }), {
            lastFailureReason: failureReason,
            lastVerify: result
        });
        return result;
    };

    window.__dcufPhase1Theme = {
        ensure(options = {}) {
            return injectStyle(options);
        },
        verify(root = document) {
            return verifyApplied('bridge', root);
        },
        getDebugState() {
            const previousPayload = (window[DEBUG_KEY] && typeof window[DEBUG_KEY] === 'object')
                ? window[DEBUG_KEY]
                : {};
            return { ...previousPayload, ...debugState };
        }
    };

    injectStyle({ reason: 'initial' });
    verifyApplied('initial');

    const scheduleVerify = (reason, delay) => {
        setTimeout(() => verifyApplied(reason), delay);
    };

    scheduleVerify('after-100ms', 100);
    scheduleVerify('after-500ms', 500);
    scheduleVerify('after-1500ms', 1500);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            injectStyle({ reason: 'domcontentloaded' });
            verifyApplied('domcontentloaded');
            scheduleVerify('domcontentloaded+300ms', 300);
        }, { once: true });
    }

    window.addEventListener('load', () => {
        injectStyle({ reason: 'window-load' });
        verifyApplied('window-load');
        scheduleVerify('window-load+300ms', 300);
    }, { once: true });
})();

(() => {
    if ((window.location.pathname || '').indexOf('/board/lists') !== -1) return;

    const STYLE_ID = 'dcuf-phase1-view-theme';
    const css = `
        .view_content_wrap {
            --dcuf-view-surface: rgba(255, 255, 255, 0.96);
            --dcuf-view-surface-muted: #f7f9fd;
            --dcuf-view-border: #d7e0ec;
            --dcuf-view-border-strong: #c7d3e4;
            --dcuf-view-shadow: 0 8px 24px rgba(18, 35, 69, 0.08);
            --dcuf-view-shadow-soft: 0 4px 14px rgba(18, 35, 69, 0.05);
            --dcuf-view-fg: #22324c;
            --dcuf-view-fg-sub: #5f6f86;
            --dcuf-view-accent: #3f6de0;
            padding: 10px 10px 0 !important;
            color: var(--dcuf-view-fg) !important;
        }
        body.dc-filter-dark-mode .view_content_wrap {
            --dcuf-view-surface: #18212d;
            --dcuf-view-surface-muted: #1e2a39;
            --dcuf-view-border: #314258;
            --dcuf-view-border-strong: #45607c;
            --dcuf-view-shadow: 0 10px 24px rgba(0, 0, 0, 0.32);
            --dcuf-view-shadow-soft: 0 6px 18px rgba(0, 0, 0, 0.24);
            --dcuf-view-fg: #edf3ff;
            --dcuf-view-fg-sub: #b6c4d9;
            --dcuf-view-accent: #8cb4ff;
        }
        .view_content_wrap > header {
            margin-bottom: 12px !important;
        }
        .view_content_wrap .gallview_head {
            padding: 18px 18px 14px !important;
            border: 1px solid var(--dcuf-view-border) !important;
            border-radius: 18px !important;
            background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%) !important;
            box-shadow: var(--dcuf-view-shadow) !important;
        }
        body.dc-filter-dark-mode .view_content_wrap .gallview_head {
            background: linear-gradient(180deg, #1d2734 0%, #18212d 100%) !important;
        }
        .view_content_wrap .title {
            margin: 0 !important;
            line-height: 1.45 !important;
        }
        .view_content_wrap .title_headtext {
            display: inline !important;
            padding: 0 !important;
            margin: 0 8px 0 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            color: #111 !important;
            font-size: 14px !important;
            font-weight: 700 !important;
        }
        .view_content_wrap .title_headtext:empty {
            display: none !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        body.dc-filter-dark-mode .view_content_wrap .title_headtext {
            background: transparent !important;
            color: var(--dcuf-view-fg) !important;
            -webkit-text-fill-color: var(--dcuf-view-fg) !important;
        }        .view_content_wrap .title_subject {
            color: var(--dcuf-view-fg) !important;
            font-size: 22px !important;
            font-weight: 800 !important;
            letter-spacing: -0.03em !important;
        }
        .view_content_wrap .title_device {
            margin-left: 6px !important;
        }
        .view_content_wrap .gall_writer {
            height: auto !important;
            margin-top: 14px !important;
            padding-top: 11px !important;
            border-top: 1px solid var(--dcuf-view-border) !important;
            background: transparent !important;
            color: var(--dcuf-view-fg-sub) !important;
            overflow: hidden !important;
        }
        .view_content_wrap .gall_writer .fl {
            float: left !important;
            display: inline-flex !important;
            align-items: center !important;
            flex-wrap: wrap !important;
            gap: 8px !important;
            min-width: 0 !important;
            background: transparent !important;
        }
        .view_content_wrap .gall_writer .fr {
            float: right !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: flex-end !important;
            flex-wrap: nowrap !important;
            gap: 12px !important;
            min-width: 0 !important;
            background: transparent !important;
        }
        .view_content_wrap .gall_writer .nickname,
        .view_content_wrap .gall_writer .nickname em,
        .view_content_wrap .gall_writer .ip {
            background: transparent !important;
        }
        .view_content_wrap .gall_writer .nickname,
        .view_content_wrap .gall_writer .nickname em {
            color: var(--dcuf-view-fg) !important;
            font-size: 15px !important;
            font-weight: 800 !important;
        }
        .view_content_wrap .gall_writer .fr > span {
            display: inline-flex !important;
            align-items: center !important;
            min-height: 0 !important;
            padding: 0 !important;
            white-space: nowrap !important;
            background: transparent !important;
            border: 0 !important;
            box-shadow: none !important;
        }
        .view_content_wrap .gall_writer .gall_date,
        .view_content_wrap .gall_writer .gall_count,
        .view_content_wrap .gall_writer .gall_recommend,
        .view_content_wrap .gall_writer .gall_comment,
        .view_content_wrap .gall_writer .gall_comment a {
            color: var(--dcuf-view-fg-sub) !important;
            font-size: 13px !important;
        }
        .view_content_wrap .gall_writer .gall_comment,
        .view_content_wrap .gall_writer .gall_comment a {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: auto !important;
            min-width: 0 !important;
            min-height: 0 !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            background-image: none !important;
            box-shadow: none !important;
            line-height: 1.2 !important;
            text-indent: 0 !important;
            overflow: visible !important;
        }
        .view_content_wrap .gall_writer .gall_comment a:hover {
            color: var(--dcuf-view-accent) !important;
        }
        .view_content_wrap .gall_writer .gall_scrap button {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: auto !important;
            min-width: 58px !important;
            max-width: none !important;
            height: 32px !important;
            min-height: 32px !important;
            padding: 0 12px !important;
            border-radius: 999px !important;
            border: 1px solid var(--dcuf-view-border-strong) !important;
            background: var(--dcuf-view-surface-muted) !important;
            background-image: none !important;
            color: var(--dcuf-view-accent) !important;
            font-size: 13px !important;
            font-weight: 700 !important;
            line-height: 1 !important;
            white-space: nowrap !important;
            text-indent: 0 !important;
            box-sizing: border-box !important;
            overflow: visible !important;
        }
        .view_content_wrap .gallview_contents {
            margin-bottom: 14px !important;
            padding: 16px !important;
            border: 1px solid var(--dcuf-view-border) !important;
            border-radius: 18px !important;
            background: var(--dcuf-view-surface) !important;
            box-shadow: var(--dcuf-view-shadow) !important;
        }
        .view_content_wrap .gallview_contents > .inner {
            width: 100% !important;
        }
        .view_content_wrap .writing_view_box,
        .view_content_wrap .write_div {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            overflow: visible !important;
            background: transparent !important;
        }
        .view_content_wrap .gallview_contents img,
        .view_content_wrap .gallview_contents video {
            border-radius: 14px !important;
        }
        body.dc-filter-dark-mode .view_content_wrap .gallview_contents,
        body.dc-filter-dark-mode .view_content_wrap .gallview_contents p,
        body.dc-filter-dark-mode .view_content_wrap .gallview_contents span,
        body.dc-filter-dark-mode .view_content_wrap .gallview_contents div,
        body.dc-filter-dark-mode .view_content_wrap .gallview_contents *,
        body.dc-filter-dark-mode .view_content_wrap .writing_view_box,
        body.dc-filter-dark-mode .view_content_wrap .writing_view_box *,
        body.dc-filter-dark-mode .view_content_wrap .write_div,
        body.dc-filter-dark-mode .view_content_wrap .write_div *,
        body.dc-filter-dark-mode .view_content_wrap .write_div [data-scaled-by-filter],
        body.dc-filter-dark-mode .view_content_wrap .write_div [data-scaled-by-filter] * {
            color: var(--dcuf-view-fg) !important;
            -webkit-text-fill-color: var(--dcuf-view-fg) !important;
            background-color: transparent !important;
        }
        .view_content_wrap .recommend_kapcode {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 290px !important;
            min-width: 290px !important;
            max-width: 290px !important;
            margin: 14px auto 10px !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            text-align: left !important;
            overflow: visible !important;
        }
        .view_content_wrap .recommend_kapcode .kap_codeimg {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex: 0 0 140px !important;
            width: 140px !important;
            height: 31px !important;
            min-height: 31px !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 1px solid var(--dcuf-view-border-strong) !important;
            border-right: 0 !important;
            border-radius: 0 !important;
            background: #fff !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
        }
        .view_content_wrap .recommend_kapcode .kcaptcha {
            display: block !important;
            width: 140px !important;
            height: 31px !important;
            margin: 0 !important;
            vertical-align: middle !important;
        }
        .view_content_wrap .recommend_kapcode .recom_input_kapcode {
            display: block !important;
            flex: 0 0 150px !important;
            width: 150px !important;
            min-width: 150px !important;
            max-width: 150px !important;
            height: 31px !important;
            min-height: 31px !important;
            margin: 0 !important;
            padding: 0 10px !important;
            border: 1px solid var(--dcuf-view-border-strong) !important;
            border-radius: 0 !important;
            background: #fff !important;
            color: var(--dcuf-view-fg-sub) !important;
            box-sizing: border-box !important;
            opacity: 1 !important;
            line-height: 29px !important;
        }
        .view_content_wrap .btn_recommend_box {
            display: block !important;
            width: 100% !important;
            min-width: 0 !important;
            margin: 14px 0 6px !important;
            padding: 14px 16px !important;
            border: 1px solid var(--dcuf-view-border) !important;
            border-radius: 18px !important;
            background: var(--dcuf-view-surface) !important;
            box-shadow: var(--dcuf-view-shadow-soft) !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
        }
        body.dc-filter-dark-mode .view_content_wrap .btn_recommend_box {
            background: var(--dcuf-view-surface) !important;
            border-color: var(--dcuf-view-border) !important;
        }
        .view_content_wrap .btn_recommend_box .inner_box,
        .view_content_wrap .btn_recommend_box .recom_bottom_box,
        .view_content_wrap .btn_recommend_box .inner_box > .inner {
            box-sizing: border-box !important;
        }
        .view_content_wrap .btn_recommend_box .inner_box {
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: stretch !important;
            justify-content: center !important;
            gap: 12px !important;
            width: 100% !important;
        }
        .view_content_wrap .btn_recommend_box .recom_bottom_box {
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 10px !important;
            width: 100% !important;
            margin-top: 11px !important;
            padding-top: 11px !important;
            border-top: 1px solid var(--dcuf-view-border) !important;
        }
        .view_content_wrap .btn_recommend_box .inner_box > .inner {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 8px !important;
            flex: 0 1 210px !important;
            min-height: 0 !important;
            padding: 10px 14px !important;
            border: 1px solid var(--dcuf-view-border) !important;
            border-radius: 16px !important;
            background: var(--dcuf-view-surface-muted) !important;
        }
        body.dc-filter-dark-mode .view_content_wrap .btn_recommend_box .inner_box > .inner {
            background: var(--dcuf-view-surface-muted) !important;
            border-color: var(--dcuf-view-border) !important;
        }
        .view_content_wrap .btn_recommend_box .up_num,
        .view_content_wrap .btn_recommend_box .down_num {
            color: var(--dcuf-view-fg) !important;
        }
        .view_content_wrap .btn_recommend_box .recom_bottom_box button,
        .view_content_wrap .btn_recommend_box .recom_bottom_box a {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            min-height: 34px !important;
            padding: 0 12px !important;
            border: 1px solid var(--dcuf-view-border-strong) !important;
            border-radius: 999px !important;
            background: transparent !important;
            color: var(--dcuf-view-fg-sub) !important;
            white-space: nowrap !important;
        }
        .view_content_wrap .img_bottom_box,
        .view_content_wrap .appending_file_box {
            margin-top: 16px !important;
            padding-top: 14px !important;
            border-top: 1px solid var(--dcuf-view-border) !important;
        }
        #focus_cmt,
        div[id^="comment_wrap_"] {
            margin-top: 14px !important;
        }
        .comment_box {
            border: 1px solid var(--dcuf-view-border) !important;
            border-radius: 18px !important;
            background: var(--dcuf-view-surface) !important;
            box-shadow: var(--dcuf-view-shadow-soft) !important;
            overflow: hidden !important;
        }
        .comment_box .cmt_list,
        .comment_box .reply_list {
            margin: 0 !important;
        }
        .comment_box .cmt_list > li,
        .comment_box .reply_list > li {
            padding: 12px 16px !important;
            border-top: 1px solid var(--dcuf-view-border-strong) !important;
            background: transparent !important;
        }
        .comment_box .cmt_list > li:first-child {
            border-top: none !important;
        }
        .comment_box .reply.show {
            margin-top: 8px !important;
            padding-top: 8px !important;
            border-top: 1px solid var(--dcuf-view-border) !important;
        }
        .comment_box .reply_box {
            margin-left: 18px !important;
            border: 1px solid var(--dcuf-view-border) !important;
            border-radius: 14px !important;
            background: var(--dcuf-view-surface-muted) !important;
            overflow: hidden !important;
        }
        .comment_box .cmt_info,
        .comment_box .reply_info {
            display: block !important;
        }
        .comment_box .cmt_nickbox {
            display: inline-flex !important;
            align-items: center !important;
            min-width: 0 !important;
            background: transparent !important;
        }
        .comment_box .cmt_info > .fr,
        .comment_box .reply_info > .fr {
            float: right !important;
            display: block !important;
            margin: 0 !important;
            background: transparent !important;
        }
        .comment_box .cmt_txtbox {
            clear: both !important;
            width: auto !important;
            margin: 0 !important;
            padding-top: 6px !important;
        }
        .comment_box,
        .comment_box .cmt_txtbox,
        .comment_box .usertxt,
        .comment_box .reply_box,
        .comment_box .reply_list > li {
            -webkit-text-size-adjust: 100% !important;
            text-size-adjust: 100% !important;
        }
        .comment_box .reply_box .cmt_txtbox {
            padding-top: 5px !important;
        }
        .comment_box .nickname,
        .comment_box .nickname em {
            background: transparent !important;
            color: var(--dcuf-view-fg) !important;
            font-size: 13px !important;
            font-weight: 800 !important;
        }
        .comment_box .nickname .ip,
        .comment_box .date_time,
        .comment_box .reply_num,
        .comment_box .txt_del {
            background: transparent !important;
            color: var(--dcuf-view-fg-sub) !important;
            font-size: 12px !important;
        }
        .comment_box .usertxt {
            color: var(--dcuf-view-fg) !important;
            font-size: clamp(16px, 4.2vw, 19px) !important;
            line-height: 1.5 !important;
            white-space: pre-wrap !important;
            word-break: normal !important;
            overflow-wrap: anywhere !important;
            max-width: none !important;
            overflow: visible !important;
            text-overflow: clip !important;
        }
        .comment_box .reply_box .usertxt {
            font-size: clamp(16px, 4.2vw, 19px) !important;
        }
        .comment_box .cmt_txtbox img {
            max-width: 100% !important;
            border-radius: 12px !important;
        }
        .cmt_write_box {
            margin-top: 14px !important;
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: flex-start !important;
            gap: 12px !important;
            padding: 16px !important;
            border: 1px solid var(--dcuf-view-border) !important;
            border-radius: 18px !important;
            background: var(--dcuf-view-surface) !important;
            box-shadow: var(--dcuf-view-shadow-soft) !important;
        }
        .cmt_write_box > .fl {
            flex: 0 0 172px !important;
            min-width: 150px !important;
            background: transparent !important;
        }
        .cmt_write_box .user_info_input {
            margin-bottom: 8px !important;
        }
        .cmt_write_box .cmt_txt_cont {
            flex: 1 1 420px !important;
            min-width: 280px !important;
            display: flex !important;
            flex-direction: column !important;
            padding: 0 !important;
            border: 1px solid var(--dcuf-view-border) !important;
            border-radius: 14px !important;
            background: var(--dcuf-view-surface-muted) !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
        }
        .cmt_write_box .user_info_input input {
            min-height: 40px !important;
            padding: 0 12px !important;
            border: 1px solid var(--dcuf-view-border-strong) !important;
            border-radius: 12px !important;
            background: var(--dcuf-view-surface-muted) !important;
            color: var(--dcuf-view-fg) !important;
            box-shadow: none !important;
        }
        .cmt_write_box .cmt_write {
            min-height: 0 !important;
            padding: 12px 14px 0 !important;
        }
        .cmt_write_box .cmt_textarea_label {
            display: block !important;
            color: var(--dcuf-view-fg-sub) !important;
            line-height: 1.55 !important;
        }
        .cmt_write_box textarea {
            min-height: 104px !important;
            padding: 10px 0 14px !important;
            border: none !important;
            border-radius: 0 !important;
            background: transparent !important;
            color: var(--dcuf-view-fg) !important;
            resize: vertical !important;
            box-shadow: none !important;
        }
        .cmt_write_box .cmt_cont_bottm {
            width: 100% !important;
            margin-top: 0 !important;
            padding: 10px 14px 12px !important;
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 10px !important;
            border-top: 1px solid var(--dcuf-view-border) !important;
            box-sizing: border-box !important;
        }
        .cmt_write_box .cmt_btn_bot {
            margin-left: auto !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
        }
                .cmt_write_box .cmt_btn_bot > button,
        .cmt_write_box .cmt_btn_bot > a,
        .cmt_write_box .cmt_btn_bot > input[type="submit"],
        .cmt_write_box .cmt_btn_bot > input[type="button"] {
            min-height: 38px !important;
            padding: 0 16px !important;
            border-radius: 12px !important;
        }
        .bottom_paging_box,
        .view_bottom,
        #bottom_listwrap {
            margin-top: 18px !important;
        }
        .view_content_wrap .recommend_kapcode {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 290px !important;
            min-width: 290px !important;
            max-width: 290px !important;
            margin: 14px auto 10px !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            text-align: left !important;
            overflow: visible !important;
        }
        .view_content_wrap .recommend_kapcode .kap_codeimg {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex: 0 0 140px !important;
            width: 140px !important;
            height: 31px !important;
            min-height: 31px !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 1px solid var(--dcuf-view-border-strong) !important;
            border-right: 0 !important;
            border-radius: 0 !important;
            background: #fff !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
        }
        .view_content_wrap .recommend_kapcode .kcaptcha {
            display: block !important;
            width: 140px !important;
            height: 31px !important;
            margin: 0 !important;
            vertical-align: middle !important;
        }
        .view_content_wrap .recommend_kapcode .recom_input_kapcode {
            display: block !important;
            flex: 0 0 150px !important;
            width: 150px !important;
            min-width: 150px !important;
            max-width: 150px !important;
            height: 31px !important;
            min-height: 31px !important;
            margin: 0 !important;
            padding: 0 10px !important;
            border: 1px solid var(--dcuf-view-border-strong) !important;
            border-radius: 0 !important;
            background: #fff !important;
            color: var(--dcuf-view-fg-sub) !important;
            box-sizing: border-box !important;
            opacity: 1 !important;
            line-height: 29px !important;
        }
        .comment_box .cmt_list > li,
        .comment_box .reply_list > li {
            position: relative !important;
            padding: 14px 16px !important;
            border-top: 1px solid var(--dcuf-view-border-strong) !important;
        }
        .comment_box .cmt_info,
        .comment_box .reply_info {
            overflow: hidden !important;
        }
        .comment_box .cmt_info > .fr,
        .comment_box .reply_info > .fr {
            float: right !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 8px !important;
            margin-left: 10px !important;
        }
        .comment_box .cmt_txtbox,
        .comment_box .reply_box .cmt_txtbox {
            padding-top: 8px !important;
        }
        .comment_box .reply.show {
            margin-top: 10px !important;
            padding-top: 10px !important;
            border-top: 1px dashed var(--dcuf-view-border-strong) !important;
        }
        .comment_box .reply_box {
            margin: 10px 0 0 16px !important;
            padding-left: 12px !important;
            border: none !important;
            border-left: 3px solid var(--dcuf-view-border-strong) !important;
            border-radius: 0 14px 14px 0 !important;
            background: var(--dcuf-view-surface-muted) !important;
            overflow: hidden !important;
        }
        .comment_box .reply_list > li {
            padding: 12px 14px !important;
            border-top: 1px solid var(--dcuf-view-border) !important;
        }
        .comment_box .reply_list > li:first-child {
            border-top: none !important;
        }
        .cmt_write_box .cmt_write {
            min-height: 118px !important;
        }
        .cmt_write_box textarea {
            width: 100% !important;
            min-height: 96px !important;
        }
        .cmt_write_box .cmt_cont_bottm {
            margin-top: 0 !important;
            padding: 12px 14px !important;
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            gap: 10px !important;
            border-top: 1px solid var(--dcuf-view-border) !important;
            background: rgba(255, 255, 255, 0.35) !important;
        }
        body.dc-filter-dark-mode .cmt_write_box .cmt_cont_bottm {
            background: rgba(24, 33, 45, 0.45) !important;
        }
        .cmt_write_box .cmt_cont_bottm > .fr {
            float: none !important;
            margin-left: auto !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: flex-end !important;
            gap: 8px !important;
            width: auto !important;
        }
        .cmt_write_box .cmt_cont_bottm > .fr > button {
            min-width: 94px !important;
            min-height: 38px !important;
            padding: 0 16px !important;
            border-radius: 12px !important;
            white-space: nowrap !important;
        }
        .view_content_wrap .recommend_kapcode {
            justify-content: center !important;
            text-align: left !important;
        }
        .view_content_wrap .recommend_kapcode .recom_input_kapcode {
            display: block !important;
            flex: 0 0 150px !important;
            width: 150px !important;
            min-width: 150px !important;
            max-width: 150px !important;
            opacity: 1 !important;
        }
        .view_content_wrap .btn_recommend_box {
            padding-bottom: 28px !important;
        }
        .view_content_wrap .btn_recommend_box .inner_box {
            gap: 10px !important;
        }
        .view_content_wrap .btn_recommend_box .inner_box > .inner {
            display: grid !important;
            align-items: center !important;
            justify-content: center !important;
            column-gap: 10px !important;
            row-gap: 0 !important;
            flex: 0 1 168px !important;
            padding: 8px 10px !important;
            border-radius: 14px !important;
        }
        .view_content_wrap .btn_recommend_box .inner_box > .inner:first-child {
            grid-template-columns: 34px auto !important;
        }
        .view_content_wrap .btn_recommend_box .inner_box > .inner:last-child {
            grid-template-columns: auto 34px !important;
        }
        .view_content_wrap .btn_recommend_box .up_num_box,
        .view_content_wrap .btn_recommend_box .down_num_box {
            display: inline-flex !important;
            width: 34px !important;
            min-width: 34px !important;
            align-items: center !important;
            justify-content: center !important;
            justify-self: center !important;
        }
        .view_content_wrap .btn_recommend_box .up_num_box {
            flex-direction: column !important;
            gap: 1px !important;
            align-self: center !important;
        }
        .view_content_wrap .btn_recommend_box .down_num_box {
            gap: 0 !important;
            align-self: center !important;
        }
        .view_content_wrap .btn_recommend_box .up_num,
        .view_content_wrap .btn_recommend_box .down_num {
            width: 100% !important;
            text-align: center !important;
            position: static !important;
            left: auto !important;
        }
        .view_content_wrap .btn_recommend_box .btn_recom_up,
        .view_content_wrap .btn_recommend_box .btn_recom_down {
            flex: 0 0 auto !important;
            justify-self: center !important;
            margin: 0 !important;
        }
        .view_content_wrap .btn_recommend_box .font_blue.smallnum {
            display: inline !important;
            margin-left: 2px !important;
            padding: 0 !important;
            background: transparent !important;
            color: var(--dcuf-view-fg) !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            font-size: 12px !important;
            font-weight: 700 !important;
            line-height: 1 !important;
        }
        .view_content_wrap .btn_recommend_box .sup_num {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 1px !important;
            line-height: 1 !important;
        }
        .view_content_wrap .btn_recommend_box .writer_nikcon {
            margin-right: 0 !important;
        }
        .view_content_wrap .btn_recommend_box .writer_nikcon img {
            width: 12px !important;
            height: 11px !important;
        }
        .view_content_wrap .btn_recommend_box .recom_bottom_box {
            margin-top: 14px !important;
            margin-bottom: 6px !important;
            padding: 14px 0 10px !important;
        }
        .view_comment.image_comment,
        .view_comment.image_comment .comment_wrap,
        .view_comment.image_comment .comment_box.img_comment_box {
            width: auto !important;
            max-width: 100% !important;
            margin-left: auto !important;
            margin-right: auto !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        .view_comment.image_comment .comment_wrap,
        .view_comment.image_comment .comment_box.img_comment_box {
            display: block !important;
            border: 0 !important;
            border-radius: 0 !important;
            overflow: visible !important;
        }
        .view_comment.image_comment .comment_box.img_comment_box .cmt_list {
            width: auto !important;
            max-width: 100% !important;
            margin: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
        }
        .view_comment.image_comment .comment_box.img_comment_box .cmt_list > li {
            width: auto !important;
            max-width: 100% !important;
            padding: 12px 14px !important;
            border: 1px solid #d8e1ed !important;
            border-radius: 12px !important;
            background: rgba(247, 249, 252, 0.96) !important;
            box-sizing: border-box !important;
        }
        .view_comment.image_comment .comment_box.img_comment_box .cmt_list > li + li {
            padding-top: 11px !important;
            border-top: 1px solid #d8e1ed !important;
            margin-top: 0 !important;
        }
        .view_comment.image_comment .comment_box.img_comment_box .cmt_info,
        .view_comment.image_comment .comment_box.img_comment_box .cmt_txtbox,
        .view_comment.image_comment .comment_box.img_comment_box .clear.cmt_txtbox,
        .view_comment.image_comment .comment_box.img_comment_box .cmt_nickbox,
        .view_comment.image_comment .comment_box.img_comment_box .fr.clear {
            border: 0 !important;
            border-top: 0 !important;
            box-shadow: none !important;
            background: transparent !important;
        }
        .view_comment.image_comment .comment_box.img_comment_box .cmt_txtbox {
            padding-top: 6px !important;
        }
        .view_comment.image_comment .comment_box.img_comment_box .cmt_nickbox,
        .view_comment.image_comment .comment_box.img_comment_box .gall_writer,
        .view_comment.image_comment .comment_box.img_comment_box .nickname,
        .view_comment.image_comment .comment_box.img_comment_box .nickname em,
        .view_comment.image_comment .comment_box.img_comment_box .ip,
        .view_comment.image_comment .comment_box.img_comment_box .writer_nikcon {
            min-width: 0 !important;
            width: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            line-height: 1.3 !important;
        }
        .view_comment.image_comment .comment_box.img_comment_box .cmt_nickbox::before,
        .view_comment.image_comment .comment_box.img_comment_box .cmt_nickbox::after,
        .view_comment.image_comment .comment_box.img_comment_box .gall_writer::before,
        .view_comment.image_comment .comment_box.img_comment_box .gall_writer::after,
        .view_comment.image_comment .comment_box.img_comment_box .nickname::before,
        .view_comment.image_comment .comment_box.img_comment_box .nickname::after {
            content: none !important;
            display: none !important;
        }
        .view_comment.image_comment .comment_box.img_comment_box .clear {
            display: block !important;
            border: 0 !important;
            border-top: 0 !important;
            background-image: none !important;
            box-shadow: none !important;
        }
        .view_comment.image_comment .comment_box.img_comment_box .clear::before,
        .view_comment.image_comment .comment_box.img_comment_box .clear::after,
        .view_comment.image_comment .comment_box.img_comment_box .cmt_info::before,
        .view_comment.image_comment .comment_box.img_comment_box .cmt_info::after {
            content: none !important;
            border-top: 0 !important;
            background-image: none !important;
            box-shadow: none !important;
        }
        /* [v3.1.1-beta.1] 이미지댓글 내부 소형 팝업(닉네임/삭제비번)이 카드에 잘리지 않도록 필요한 컨텍스트만 해제 */
        .view_comment.image_comment,
        .view_comment.image_comment .comment_wrap,
        .view_comment.image_comment .comment_box.img_comment_box,
        .view_comment.image_comment .comment_box.img_comment_box .cmt_list,
        .view_comment.image_comment .comment_box.img_comment_box .reply_list,
        .view_comment.image_comment .comment_box.img_comment_box .cmt_list > li,
        .view_comment.image_comment .comment_box.img_comment_box .reply_list > li,
        .view_comment.image_comment .comment_box.img_comment_box .cmt_info,
        .view_comment.image_comment .comment_box.img_comment_box .reply_info,
        .view_comment.image_comment .comment_box.img_comment_box .cmt_nickbox,
        .view_comment.image_comment .comment_box.img_comment_box .gall_writer,
        .view_comment.image_comment .comment_box.img_comment_box .fr.clear {
            overflow: visible !important;
        }
        .view_comment.image_comment .comment_box.img_comment_box .cmt_info,
        .view_comment.image_comment .comment_box.img_comment_box .reply_info,
        .view_comment.image_comment .comment_box.img_comment_box .fr.clear {
            position: relative !important;
            z-index: auto !important;
        }
        .view_comment.image_comment #user_data_lyr,
        .view_comment.image_comment .user_data,
        .view_comment.image_comment #dccon_guide_lyr,
        .view_comment.image_comment .pop_wrap.type2,
        .view_comment.image_comment .pop_wrap.type3,
        .view_comment.image_comment .comment_box.img_comment_box .cmt_delpw_box,
        .view_comment.image_comment .comment_box.img_comment_box [id$="_delpw_box"] {
            z-index: 2147483647 !important;
        }
        .view_comment.image_comment #user_data_lyr,
        .view_comment.image_comment .user_data {
            overflow: visible !important;
        }
        .comment_box {
            border-color: #cfd8e6 !important;
            box-shadow: none !important;
        }
        .comment_box .cmt_list > li,
        .comment_box .reply_list > li {
            background: transparent !important;
        }
        .comment_box .cmt_list > li + li {
            border-top: 1px solid #d5dde9 !important;
        }
        .comment_box .cmt_info,
        .comment_box .reply_info {
            min-height: 20px !important;
        }
        .comment_box .cmt_txtbox {
            padding-top: 8px !important;
        }
        .comment_box .reply.show {
            margin-top: 10px !important;
            padding-top: 10px !important;
            border-top: 1px solid #dbe3ef !important;
        }
        .comment_box .reply_box {
            margin: 8px 0 0 14px !important;
            padding-left: 0 !important;
            border: 0 !important;
            border-left: 2px solid #ccd7ea !important;
            border-radius: 0 !important;
            background: rgba(240, 244, 250, 0.72) !important;
            box-shadow: none !important;
        }
        .comment_box .reply_list > li {
            padding: 10px 12px !important;
            border-top: 1px solid #dde5f0 !important;
        }
        .comment_box .reply_list > li:first-child {
            border-top: none !important;
        }
        .comment_box .reply_box .cmt_txtbox {
            padding-top: 6px !important;
        }
        body.dc-filter-dark-mode .comment_box {
            border-color: rgba(143, 163, 192, 0.28) !important;
        }
        body.dc-filter-dark-mode .comment_box .cmt_list > li + li {
            border-top-color: rgba(143, 163, 192, 0.24) !important;
        }
        body.dc-filter-dark-mode .comment_box .reply.show {
            border-top-color: rgba(143, 163, 192, 0.2) !important;
        }
        body.dc-filter-dark-mode .comment_box .reply_box {
            border-left-color: rgba(120, 154, 214, 0.4) !important;
            background: rgba(31, 44, 63, 0.45) !important;
        }
        body.dc-filter-dark-mode .comment_box .reply_list > li {
            border-top-color: rgba(143, 163, 192, 0.18) !important;
        }
        .view_comment.image_comment .cmt_write_box {
            margin-top: 11px !important;
            display: grid !important;
            grid-template-columns: 124px minmax(0, 1fr) auto !important;
            gap: 10px !important;
            padding: 12px !important;
            border-radius: 16px !important;
            box-shadow: none !important;
            align-items: stretch !important;
        }
        .view_comment.image_comment .cmt_write_box > .fl {
            grid-column: 1 !important;
            min-width: 0 !important;
            width: 124px !important;
            flex: none !important;
            background: transparent !important;
            border: 0 !important;
            box-shadow: none !important;
        }
        .view_comment.image_comment .cmt_write_box > .fl table,
        .view_comment.image_comment .cmt_write_box > .fl tbody,
        .view_comment.image_comment .cmt_write_box > .fl tr,
        .view_comment.image_comment .cmt_write_box > .fl td {
            width: 100% !important;
            background: transparent !important;
            border: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
        }
        .view_comment.image_comment .cmt_write_box .user_info_input {
            display: block !important;
            margin-bottom: 4px !important;
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            padding: 0 !important;
            overflow: visible !important;
        }
        .view_comment.image_comment .cmt_write_box .user_info_input input {
            display: block !important;
            width: 100% !important;
            min-height: 36px !important;
            padding: 0 12px !important;
            border-radius: 10px !important;
            background: #fff !important;
            box-sizing: border-box !important;
        }
        .view_comment.image_comment .cmt_write_box .user_info_input input[name="gall_nick_name"],
        .view_comment.image_comment .cmt_write_box .user_info_input input[readonly][id^="gall_nick_name_"] {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            min-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            border: 0 !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }
        .view_comment.image_comment .cmt_write_box .user_info_input input[id^="img_cmt_name_"] {
            display: block !important;
            position: relative !important;
            z-index: 1 !important;
        }
        .view_comment.image_comment .cmt_write_box .cmt_txt_cont {
            grid-column: 2 / span 2 !important;
            min-width: 0 !important;
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) auto !important;
            align-items: stretch !important;
            border-radius: 12px !important;
            background: var(--dcuf-view-surface-muted) !important;
            overflow: hidden !important;
        }
        .view_comment.image_comment .cmt_write_box .cmt_write {
            grid-column: 1 !important;
            min-height: 0 !important;
            padding: 10px 12px !important;
            display: flex !important;
        }
        .view_comment.image_comment .cmt_write_box .cmt_textarea_label {
            display: none !important;
        }
        .view_comment.image_comment .cmt_write_box textarea {
            display: block !important;
            width: 100% !important;
            min-height: 72px !important;
            height: 100% !important;
            padding: 0 !important;
            resize: none !important;
            box-sizing: border-box !important;
        }
        .view_comment.image_comment .cmt_write_box .cmt_cont_bottm {
            grid-column: 2 !important;
            width: auto !important;
            margin-top: 0 !important;
            padding: 10px !important;
            border: 0 !important;
            border-left: 1px solid var(--dcuf-view-border) !important;
            background: transparent !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            align-self: stretch !important;
        }
        .view_comment.image_comment .cmt_write_box .cmt_cont_bottm > .fr {
            margin-left: 0 !important;
            width: auto !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            height: auto !important;
        }
        .view_comment.image_comment .cmt_write_box .cmt_cont_bottm > .fr > button {
            min-width: 84px !important;
            min-height: 56px !important;
            padding: 0 18px !important;
            border-radius: 12px !important;
            white-space: nowrap !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .cmt_write_box .user_info_input input {
            background: rgba(24, 33, 45, 0.92) !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box .cmt_list > li {
            background: rgba(24, 33, 45, 0.86) !important;
            border-color: rgba(120, 144, 175, 0.28) !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box .cmt_list > li + li {
            border-top-color: rgba(120, 144, 175, 0.28) !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box .gall_writer,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box .nickname,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box .nickname em,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box .usertxt {
            color: #dbe6f5 !important;
            -webkit-text-fill-color: #dbe6f5 !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box .ip,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box .date_time,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box .txt_del {
            color: #9fb0c8 !important;
            -webkit-text-fill-color: #9fb0c8 !important;
        }
        body.dc-filter-dark-mode .comment_box.img_comment_box .gall_writer,
        body.dc-filter-dark-mode .comment_box.img_comment_box .nickname,
        body.dc-filter-dark-mode .comment_box.img_comment_box .nickname em,
        body.dc-filter-dark-mode .comment_box.img_comment_box .usertxt {
            color: #dbe6f5 !important;
            -webkit-text-fill-color: #dbe6f5 !important;
        }
        body.dc-filter-dark-mode .comment_box.img_comment_box .ip,
        body.dc-filter-dark-mode .comment_box.img_comment_box .date_time,
        body.dc-filter-dark-mode .comment_box.img_comment_box .txt_del,
        body.dc-filter-dark-mode .comment_box.img_comment_box .reply_num {
            color: #9fb0c8 !important;
            -webkit-text-fill-color: #9fb0c8 !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment #user_data_lyr .user_data_list,
        body.dc-filter-dark-mode .view_comment.image_comment .user_data .user_data_list,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box .cmt_delpw_box,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box [id$="_delpw_box"] {
            background: #1f2937 !important;
            border-color: rgba(120, 144, 175, 0.52) !important;
            box-shadow: 0 18px 32px rgba(2, 7, 15, 0.52) !important;
            color: #e3ebf8 !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box .cmt_delpw_box input[type="password"],
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box [id$="_delpw_box"] input[type="password"] {
            background: rgba(18, 26, 37, 0.94) !important;
            color: #e3ebf8 !important;
            border-color: rgba(120, 144, 175, 0.44) !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment #user_data_lyr .user_data_list > li,
        body.dc-filter-dark-mode .view_comment.image_comment .user_data .user_data_list > li {
            background: linear-gradient(180deg, rgba(34, 45, 60, 0.98) 0%, rgba(27, 37, 50, 0.98) 100%) !important;
            border-top-color: rgba(120, 144, 175, 0.3) !important;
            color: #e3ebf8 !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box .cmt_delpw_box button,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_box.img_comment_box [id$="_delpw_box"] button {
            color: #e3ebf8 !important;
            -webkit-text-fill-color: #e3ebf8 !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment #user_data_lyr .user_data_list > li > a,
        body.dc-filter-dark-mode .view_comment.image_comment #user_data_lyr .user_data_list > li > button,
        body.dc-filter-dark-mode .view_comment.image_comment .user_data .user_data_list > li > a,
        body.dc-filter-dark-mode .view_comment.image_comment .user_data .user_data_list > li > button,
        body.dc-filter-dark-mode .view_comment.image_comment #user_data_lyr .user_data_list > li > span,
        body.dc-filter-dark-mode .view_comment.image_comment .user_data .user_data_list > li > span {
            color: #e3ebf8 !important;
            -webkit-text-fill-color: #e3ebf8 !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .cmt_write_box {
            background: rgba(19, 27, 38, 0.92) !important;
            border-color: rgba(120, 144, 175, 0.24) !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .cmt_write_box .cmt_txt_cont {
            background: rgba(27, 37, 51, 0.92) !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .cmt_write_box textarea {
            color: #dbe6f5 !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .cmt_write_box .cmt_cont_bottm {
            border-left-color: rgba(120, 144, 175, 0.24) !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .cmt_write_box .cmt_cont_bottm > .fr > button {
            background: #2b4f9b !important;
            border-color: #3a62b8 !important;
            color: #eef4ff !important;
            box-shadow: none !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .comment_top,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_top .num_box,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_top .fr,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_top .fr button,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_top .fr .img_cmt_label {
            color: #dbe6f5 !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .comment_top .num_box,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_top .num_box * {
            color: #dbe6f5 !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .comment_top .num_box .font_red {
            color: #7db0ff !important;
        }
        body.dc-filter-dark-mode .view_comment.image_comment .comment_top .fr button,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_top .fr .img_cmt_label,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_top .fr em,
        body.dc-filter-dark-mode .view_comment.image_comment .comment_top .fr span {
            color: #dbe6f5 !important;
            opacity: 1 !important;
        }
        .gall_comment .comment_box {
            border: 1px solid #d7dfec !important;
            border-radius: 16px !important;
            background: var(--dcuf-view-surface) !important;
            box-shadow: none !important;
        }
        .gall_comment .comment_box .cmt_list > li {
            padding: 14px 18px !important;
            border-top: 1px solid #dde4ef !important;
            background: transparent !important;
        }
        .gall_comment .comment_box .cmt_info,
        .gall_comment .comment_box .reply_info {
            display: flex !important;
            align-items: flex-start !important;
            justify-content: space-between !important;
            gap: 12px !important;
            min-height: 0 !important;
        }
        .gall_comment .comment_box .cmt_nickbox {
            flex: 1 1 auto !important;
            min-width: 0 !important;
        }
        .gall_comment .comment_box .cmt_info > .fr,
        .gall_comment .comment_box .reply_info > .fr {
            float: none !important;
            margin: 0 0 0 auto !important;
            display: inline-flex !important;
            align-items: center !important;
            white-space: nowrap !important;
        }
        .gall_comment .comment_box .cmt_txtbox {
            clear: none !important;
            padding-top: 6px !important;
        }
        .gall_comment .comment_box .reply.show {
            margin-top: 8px !important;
            padding-top: 0 !important;
            border-top: 0 !important;
        }
        .gall_comment .comment_box .reply_box {
            margin: 8px 0 0 16px !important;
            padding-left: 12px !important;
            border: 0 !important;
            border-left: 2px solid #d6dfec !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        .gall_comment .comment_box .reply_list > li {
            padding: 10px 0 !important;
            border-top: 1px solid #e5ebf3 !important;
            background: transparent !important;
        }
        .gall_comment .cmt_write_box {
            margin-top: 16px !important;
            display: grid !important;
            grid-template-columns: 150px minmax(0, 1fr) !important;
            gap: 12px !important;
            padding: 14px !important;
            border: 1px solid #d7dfec !important;
            border-radius: 16px !important;
            background: var(--dcuf-view-surface) !important;
            box-shadow: none !important;
            align-items: stretch !important;
        }
        .gall_comment .cmt_write_box > .fl {
            grid-column: 1 !important;
            min-width: 0 !important;
            width: 150px !important;
            flex: none !important;
            background: transparent !important;
            border: 0 !important;
            box-shadow: none !important;
        }
        .gall_comment .cmt_write_box > .fl table,
        .gall_comment .cmt_write_box > .fl tbody,
        .gall_comment .cmt_write_box > .fl tr,
        .gall_comment .cmt_write_box > .fl td {
            width: 100% !important;
            background: transparent !important;
            border: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
        }
        .gall_comment .cmt_write_box .user_info_input {
            margin-bottom: 6px !important;
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            padding: 0 !important;
        }
        .gall_comment .cmt_write_box .user_info_input input {
            display: block !important;
            width: 100% !important;
            min-height: 40px !important;
            padding: 0 12px !important;
            border: 1px solid #d7dfec !important;
            border-radius: 10px !important;
            background: #fff !important;
            box-sizing: border-box !important;
        }
        .gall_comment .cmt_write_box .cmt_txt_cont {
            grid-column: 2 !important;
            min-width: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            padding: 0 !important;
            border: 1px solid #d7dfec !important;
            border-radius: 14px !important;
            background: #fff !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
        }
        .gall_comment .cmt_write_box .cmt_write {
            min-height: 0 !important;
            padding: 0 !important;
        }
        .gall_comment .cmt_write_box .cmt_textarea_label {
            display: none !important;
        }
        .gall_comment .cmt_write_box textarea {
            display: block !important;
            width: 100% !important;
            min-height: 124px !important;
            padding: 14px 16px !important;
            border: 0 !important;
            background: transparent !important;
            box-sizing: border-box !important;
            resize: vertical !important;
        }
        .gall_comment .cmt_write_box .cmt_cont_bottm {
            width: 100% !important;
            margin-top: 0 !important;
            padding: 10px 14px !important;
            border-top: 1px solid #e2e8f1 !important;
            background: rgba(246, 248, 251, 0.96) !important;
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 10px !important;
        }
        .gall_comment .cmt_write_box .cmt_cont_bottm > .fr {
            margin-left: auto !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 8px !important;
        }
        .gall_comment .cmt_write_box .cmt_cont_bottm > .fr > button {
            min-width: 98px !important;
            min-height: 40px !important;
            border-radius: 10px !important;
        }
        body.dc-filter-dark-mode .gall_comment .comment_box {
            border-color: rgba(120, 144, 175, 0.24) !important;
            background: rgba(17, 24, 34, 0.92) !important;
        }
        body.dc-filter-dark-mode .gall_comment .comment_box .cmt_list > li {
            border-top-color: rgba(120, 144, 175, 0.2) !important;
        }
        body.dc-filter-dark-mode .gall_comment .comment_box .reply_box {
            border-left-color: rgba(120, 144, 175, 0.32) !important;
        }
        body.dc-filter-dark-mode .gall_comment .cmt_write_box {
            border-color: rgba(120, 144, 175, 0.24) !important;
            background: rgba(17, 24, 34, 0.92) !important;
        }
        body.dc-filter-dark-mode .gall_comment .cmt_write_box .user_info_input input,
        body.dc-filter-dark-mode .gall_comment .cmt_write_box .cmt_txt_cont {
            border-color: rgba(120, 144, 175, 0.24) !important;
            background: rgba(24, 33, 45, 0.94) !important;
        }
        body.dc-filter-dark-mode .gall_comment .cmt_write_box textarea {
            color: #dbe6f5 !important;
        }
        body.dc-filter-dark-mode .gall_comment .cmt_write_box .cmt_cont_bottm {
            border-top-color: rgba(120, 144, 175, 0.2) !important;
            background: rgba(20, 28, 39, 0.84) !important;
        }
        div[id^="comment_wrap_"] .comment_count {
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            gap: 10px 12px !important;
            margin: 0 0 14px !important;
            padding: 0 2px 6px !important;
            border-bottom: 0 !important;
            background: transparent !important;
        }
        div[id^="comment_wrap_"] .comment_count .num_box {
            order: 1 !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 3px !important;
            min-width: 0 !important;
            margin: 0 !important;
        }
        div[id^="comment_wrap_"] .comment_count .num_box,
        div[id^="comment_wrap_"] .comment_count .num_box * {
            color: var(--dcuf-view-fg) !important;
            font-size: 15px !important;
            font-weight: 800 !important;
            letter-spacing: -0.02em !important;
        }
        div[id^="comment_wrap_"] .comment_count .num_box .font_red {
            color: #eb5b2f !important;
        }
        div[id^="comment_wrap_"] .comment_count .comment_sort,
        div[id^="comment_wrap_"] .comment_count .comment_sort * {
            color: var(--dcuf-view-fg-sub) !important;
            font-size: 13px !important;
            font-weight: 600 !important;
        }
        div[id^="comment_wrap_"] .comment_count .comment_sort {
            display: inline-flex !important;
            align-items: center !important;
            gap: 10px !important;
            margin: 0 !important;
        }
        div[id^="comment_wrap_"] .comment_count .fr {
            order: 2 !important;
            float: none !important;
            margin-left: auto !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 10px !important;
            white-space: nowrap !important;
            color: var(--dcuf-view-fg-sub) !important;
            font-size: 13px !important;
            font-weight: 600 !important;
        }
        div[id^="comment_wrap_"] .comment_count .fr,
        div[id^="comment_wrap_"] .comment_count .fr button,
        div[id^="comment_wrap_"] .comment_count .fr a,
        div[id^="comment_wrap_"] .comment_count .fr span,
        div[id^="comment_wrap_"] .comment_count .fr em {
            color: inherit !important;
            background: transparent !important;
        }
        div[id^="comment_wrap_"] .comment_box {
            width: auto !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            overflow: visible !important;
        }
        div[id^="comment_wrap_"] .comment_box .cmt_list,
        div[id^="comment_wrap_"] .comment_box .reply_list {
            margin: 0 !important;
            padding: 0 !important;
            list-style: none !important;
        }
        div[id^="comment_wrap_"] .comment_box .cmt_list > li {
            position: relative !important;
            margin: 0 0 12px !important;
            padding: 15px 17px 15px 19px !important;
            border: 0 !important;
            border-top: 0 !important;
            border-radius: 16px !important;
            background: linear-gradient(180deg, #ffffff 0%, #f7f7f8 100%) !important;
            box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.05) !important;
            overflow: visible !important;
            z-index: auto !important;
        }
        div[id^="comment_wrap_"] .comment_box .cmt_list > li:first-child,
        div[id^="comment_wrap_"] .comment_box .cmt_list > li + li {
            border-top: 0 !important;
        }
        div[id^="comment_wrap_"] .comment_box .cmt_list > li::before {
            content: none !important;
            display: none !important;
        }
        div[id^="comment_wrap_"] .comment_box .cmt_list > li[data-dcuf-comment-shell-blocked="1"] > :not(.reply) {
            display: none !important;
        }
        div[id^="comment_wrap_"] .comment_box .cmt_list > li[data-dcuf-comment-shell-blocked="1"] {
            min-height: 0 !important;
        }
        div[id^="comment_wrap_"] .comment_box .cmt_list > li:has(> .reply.show):not(:has(> .cmt_info)) {
            margin: -6px 0 12px !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        div[id^="comment_wrap_"] .comment_box .cmt_info,
        div[id^="comment_wrap_"] .comment_box .reply_info {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) auto !important;
            align-items: start !important;
            column-gap: 16px !important;
            row-gap: 7px !important;
            min-height: 0 !important;
        }
        div[id^="comment_wrap_"] .comment_box .cmt_nickbox {
            grid-column: 1 !important;
            grid-row: 1 !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 5px !important;
            min-width: 0 !important;
            padding-left: 13px !important;
            background: transparent !important;
            position: relative !important;
            z-index: 5 !important;
        }
        div[id^="comment_wrap_"] .comment_box .writer_nikcon {
            display: inline-flex !important;
            align-items: center !important;
            line-height: 1 !important;
            margin-left: 1px !important;
            vertical-align: middle !important;
        }
        div[id^="comment_wrap_"] .comment_box .writer_nikcon img,
        div[id^="comment_wrap_"] .comment_box img.gallercon {
            width: auto !important;
            height: 13px !important;
            max-width: none !important;
            object-fit: contain !important;
            vertical-align: middle !important;
        }
        div[id^="comment_wrap_"] .comment_box .gall_writer,
        div[id^="comment_wrap_"] .comment_box .nickname,
        div[id^="comment_wrap_"] .comment_box .nickname em {
            color: var(--dcuf-view-fg) !important;
            font-size: 13px !important;
            font-weight: 800 !important;
            letter-spacing: -0.01em !important;
            background: transparent !important;
        }
        div[id^="comment_wrap_"] .comment_box .nickname.me,
        div[id^="comment_wrap_"] .comment_box .nickname.me em,
        div[id^="comment_wrap_"] .comment_box .gall_writer .nickname.me,
        div[id^="comment_wrap_"] .comment_box .gall_writer .nickname.me em {
            color: #2f6dff !important;
            font-weight: 900 !important;
            background: transparent !important;
        }
        div[id^="comment_wrap_"] .comment_box .ip {
            color: #5a6b82 !important;
            font-size: 12px !important;
            font-weight: 700 !important;
            background: transparent !important;
        }
        div[id^="comment_wrap_"] .comment_box .cmt_info > .fr,
        div[id^="comment_wrap_"] .comment_box .reply_info > .fr {
            grid-column: 2 !important;
            grid-row: 1 !important;
            align-self: start !important;
            justify-self: end !important;
            float: none !important;
            margin: 0 !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 6px !important;
            white-space: nowrap !important;
            color: #72839b !important;
            font-size: 12px !important;
            background: transparent !important;
        }
        div[id^="comment_wrap_"] .comment_box .date_time,
        div[id^="comment_wrap_"] .comment_box .txt_del {
            color: #72839b !important;
            font-size: 12px !important;
            background: transparent !important;
        }
        div[id^="comment_wrap_"] .comment_box .cmt_txtbox {
            grid-column: 1 / -1 !important;
            grid-row: 2 !important;
            clear: none !important;
            width: 100% !important;
            max-width: none !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 0 0 13px !important;
            overflow: visible !important;
        }
        div[id^="comment_wrap_"] .comment_box .usertxt {
            color: var(--dcuf-view-fg) !important;
            font-size: clamp(16px, 4.2vw, 19px) !important;
            line-height: 1.62 !important;
            letter-spacing: -0.01em !important;
            white-space: pre-wrap !important;
            word-break: normal !important;
            overflow-wrap: anywhere !important;
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            overflow: visible !important;
            text-overflow: clip !important;
        }
        div[id^="comment_wrap_"] .comment_box .cmt_mdf_del {
            display: inline-flex !important;
            align-items: center !important;
            gap: 6px !important;
            margin-left: 6px !important;
        }
        div[id^="comment_wrap_"] .comment_box .reply.show {
            margin-top: 10px !important;
            padding-top: 10px !important;
            border-top: 1px solid #e3e9f1 !important;
        }
        div[id^="comment_wrap_"] .comment_box .reply_box {
            margin: 2px 0 0 8px !important;
            padding: 10px 12px 10px 14px !important;
            border: 0 !important;
            border-left: 1px solid #d7dee8 !important;
            border-radius: 12px !important;
            background: linear-gradient(180deg, rgba(247, 249, 252, 0.96) 0%, rgba(243, 246, 250, 0.96) 100%) !important;
            box-shadow: inset 0 0 0 1px rgba(211, 220, 232, 0.76) !important;
            overflow: visible !important;
        }
        div[id^="comment_wrap_"] .comment_box .reply_list > li {
            position: relative !important;
            margin: 0 !important;
            padding: 10px 0 0 0 !important;
            border: 0 !important;
            border-top: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        div[id^="comment_wrap_"] .comment_box .reply_list > li::before,
        div[id^="comment_wrap_"] .comment_box .reply_list > li::after,
        div[id^="comment_wrap_"] .comment_box .reply_list > li .reply_info::before,
        div[id^="comment_wrap_"] .comment_box .reply_list > li .reply_info::after,
        div[id^="comment_wrap_"] .comment_box .reply_list > li .cmt_nickbox::before,
        div[id^="comment_wrap_"] .comment_box .reply_list > li .cmt_nickbox::after,
        div[id^="comment_wrap_"] .comment_box .reply_list > li .gall_writer::before,
        div[id^="comment_wrap_"] .comment_box .reply_list > li .gall_writer::after,
        div[id^="comment_wrap_"] .comment_box .reply_list > li .comment_dccon::before,
        div[id^="comment_wrap_"] .comment_box .reply_list > li .comment_dccon::after,
        div[id^="comment_wrap_"] .comment_box .reply_list > li a.mention::before,
        div[id^="comment_wrap_"] .comment_box .reply_list > li a.mention::after,
        div[id^="comment_wrap_"] .comment_box .reply_list > li a.mention.deco::before,
        div[id^="comment_wrap_"] .comment_box .reply_list > li a.mention.deco::after,
        div[id^="comment_wrap_"] .comment_box .reply_list > li p.usertxt::before,
        div[id^="comment_wrap_"] .comment_box .reply_list > li p.usertxt::after,
        div[id^="comment_wrap_"] .comment_box .reply_list > li p.usertxt.ub-word::before,
        div[id^="comment_wrap_"] .comment_box .reply_list > li p.usertxt.ub-word::after {
            content: none !important;
            display: none !important;
        }
        div[id^="comment_wrap_"] .comment_box .reply_list > li .cmt_nickbox {
            padding-left: 24px !important;
            position: relative !important;
        }

        div[id^="comment_wrap_"] .comment_box .reply_list > li .cmt_txtbox {
            padding-left: 24px !important;
            position: relative !important;
        }
        div[id^="comment_wrap_"] .comment_box .reply_list > li .cmt_txtbox::before {
            content: none !important;
            display: none !important;
        }
        div[id^="comment_wrap_"] .comment_box .reply_list > li .cmt_nickbox::before {
            content: "\\3134" !important;
            position: absolute !important;
            left: 4px !important;
            top: 1px !important;
            display: block !important;
            font-size: 13px !important;
            line-height: 1 !important;
            color: #78899f !important;
            font-weight: 700 !important;
        }
        div[id^="comment_wrap_"] .comment_box .reply_list > li:first-child {
            padding-top: 0 !important;
            border-top: 0 !important;
        }
        div[id^="comment_wrap_"] .comment_box .reply_list > li + li {
            margin-top: 8px !important;
            padding-top: 8px !important;
            border-top: 1px solid #e1e8f0 !important;
        }
        div[id^="comment_wrap_"] .comment_box .reply_list > li:last-child {
            margin-bottom: 0 !important;
        }


        #focus_cmt > .cmt_write_box {
            margin-top: 16px !important;
            display: grid !important;
            grid-template-columns: 150px minmax(0, 1fr) !important;
            gap: 12px !important;
            padding: 14px !important;
            border: 1px solid #d9e1ed !important;
            border-radius: 16px !important;
            background: var(--dcuf-view-surface) !important;
            box-shadow: none !important;
            align-items: stretch !important;
        }
        #focus_cmt > .cmt_write_box > .fl {
            grid-column: 1 !important;
            min-width: 0 !important;
            width: 150px !important;
            flex: none !important;
            display: flex !important;
            flex-direction: column !important;
            align-self: start !important;
            gap: 8px !important;
            background: transparent !important;
            border: 0 !important;
            box-shadow: none !important;
        }
        #focus_cmt > .cmt_write_box > .fl table,
        #focus_cmt > .cmt_write_box > .fl tbody,
        #focus_cmt > .cmt_write_box > .fl tr,
        #focus_cmt > .cmt_write_box > .fl td {
            width: 100% !important;
            background: transparent !important;
            border: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
        }
        #focus_cmt > .cmt_write_box > .fl .usertxt {
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
            margin: 0 !important;
        }
        #focus_cmt > .cmt_write_box > .fl .usertxt > * {
            margin: 0 !important;
        }
        #focus_cmt > .cmt_write_box .user_info_input {
            position: relative !important;
            overflow: hidden !important;
            margin: 0 !important;
            border: 0 !important;
            border-radius: 10px !important;
            background: transparent !important;
            box-shadow: none !important;
            padding: 0 !important;
        }
        #focus_cmt > .cmt_write_box .user_info_input::before,
        #focus_cmt > .cmt_write_box .user_info_input::after,
        #focus_cmt > .cmt_write_box .user_info_input *::before,
        #focus_cmt > .cmt_write_box .user_info_input *::after {
            content: none !important;
        }
        #focus_cmt > .cmt_write_box .user_info_input input:not([readonly]):not([type="hidden"]) {
            position: relative !important;
            z-index: 1 !important;
            display: block !important;
            width: 100% !important;
            height: 32px !important;
            min-height: 32px !important;
            margin: 0 !important;
            padding: 0 12px !important;
            border: 1px solid #d9e1ed !important;
            border-radius: 10px !important;
            background: #fff !important;
            box-sizing: border-box !important;
            line-height: 32px !important;
        }
        #focus_cmt > .cmt_write_box .cmt_txt_cont {
            grid-column: 2 !important;
            min-width: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            padding: 0 !important;
            border: 1px solid #d9e1ed !important;
            border-radius: 14px !important;
            background: #fff !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
        }
        #focus_cmt > .cmt_write_box .cmt_write {
            display: flex !important;
            flex-direction: column !important;
            min-height: 0 !important;
            padding: 0 !important;
            position: relative !important;
            background: #fff !important;
        }
        #focus_cmt > .cmt_write_box .cmt_textarea_label,
        #focus_cmt > .cmt_write_box .txt-placeholder {
            display: none !important;
        }
        #focus_cmt > .cmt_write_box textarea {
            display: block !important;
            width: 100% !important;
            min-height: 132px !important;
            padding: 14px 16px !important;
            border: 0 !important;
            background: #fff !important;
            box-sizing: border-box !important;
            resize: vertical !important;
            position: relative !important;
            z-index: 2 !important;
        }
        #focus_cmt > .cmt_write_box .cmt_cont_bottm {
            width: 100% !important;
            margin-top: 0 !important;
            padding: 10px 14px !important;
            border-top: 1px solid #e4ebf3 !important;
            background: #f7f9fc !important;
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 10px !important;
        }
        #focus_cmt > .cmt_write_box .cmt_cont_bottm > .fr {
            margin-left: auto !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 8px !important;
        }
        #focus_cmt > .cmt_write_box .cmt_cont_bottm > .fr > button {
            min-width: 98px !important;
            min-height: 40px !important;
            border-radius: 10px !important;
        }
        #focus_cmt .reply_box .reply_list > li[id^="reply_li_empty"] {
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        #focus_cmt .reply_box .cmt_write_box.small {
            margin-top: 8px !important;
            display: grid !important;
            grid-template-columns: 138px minmax(0, 1fr) !important;
            gap: 10px !important;
            padding: 10px !important;
            border: 1px solid #d9e1ed !important;
            border-radius: 12px !important;
            background: #fff !important;
            box-shadow: none !important;
            align-items: start !important;
        }
        #focus_cmt .reply_box .cmt_write_box.small > .fl {
            grid-column: 1 !important;
            width: 138px !important;
            min-width: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 6px !important;
            background: transparent !important;
            border: 0 !important;
            box-shadow: none !important;
        }
        #focus_cmt .reply_box .cmt_write_box.small:not(:has(.kap_codeimg)) > .fl {
            align-self: start !important;
        }
        #focus_cmt .reply_box .cmt_write_box.small:not(:has(.kap_codeimg)) textarea {
            min-height: 72px !important;
        }
        #focus_cmt .reply_box .cmt_write_box.small > .fl table,
        #focus_cmt .reply_box .cmt_write_box.small > .fl tbody,
        #focus_cmt .reply_box .cmt_write_box.small > .fl tr,
        #focus_cmt .reply_box .cmt_write_box.small > .fl td {
            width: 100% !important;
            padding: 0 !important;
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        #focus_cmt .reply_box .cmt_write_box.small .user_info_input {
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        #focus_cmt .reply_box .cmt_write_box.small .user_info_input input:not([readonly]):not([type="hidden"]) {
            height: 32px !important;
            min-height: 32px !important;
            margin: 0 !important;
            padding: 0 10px !important;
            border: 1px solid #d9e1ed !important;
            border-radius: 10px !important;
            background: #fff !important;
            box-sizing: border-box !important;
        }
        #focus_cmt > .cmt_write_box .user_info_input input[readonly],
        #focus_cmt .reply_box .cmt_write_box.small .user_info_input input[readonly],
        #focus_cmt > .cmt_write_box .user_info_input input[id^="gall_nick_name_"],
        #focus_cmt .reply_box .cmt_write_box.small .user_info_input input[id^="gall_nick_name_"] {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
        }
        #focus_cmt .reply_box .cmt_write_box.small .cmt_txt_cont {
            grid-column: 2 !important;
            min-width: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            border: 1px solid #d9e1ed !important;
            border-radius: 12px !important;
            background: #fff !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
        }
        #focus_cmt .reply_box .cmt_write_box.small .cmt_write {
            min-height: 0 !important;
            padding: 0 !important;
            background: #fff !important;
        }
        #focus_cmt .reply_box .cmt_write_box.small .cmt_textarea_label,
        #focus_cmt .reply_box .cmt_write_box.small .txt-placeholder {
            display: none !important;
        }
        #focus_cmt .reply_box .cmt_write_box.small textarea {
            width: 100% !important;
            min-height: 84px !important;
            padding: 10px 12px !important;
            border: 0 !important;
            background: #fff !important;
            box-sizing: border-box !important;
            resize: vertical !important;
        }
        #focus_cmt .reply_box .cmt_write_box.small .cmt_cont_bottm {
            width: 100% !important;
            margin-top: 0 !important;
            padding: 8px 10px !important;
            border-top: 1px solid #e4ebf3 !important;
            background: #f7f9fc !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
        }
        #focus_cmt .reply_box .cmt_write_box.small .cmt_cont_bottm > .fr {
            margin-left: auto !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 8px !important;
        }
        #focus_cmt .reply_box .cmt_write_box.small .cmt_cont_bottm > .fr > button {
            min-width: 92px !important;
            min-height: 36px !important;
            border-radius: 10px !important;
        }
        body.dc-filter-dark-mode #focus_cmt .reply_box .cmt_write_box.small {
            border-color: rgba(120, 144, 175, 0.24) !important;
            background: rgba(17, 24, 34, 0.92) !important;
        }
        body.dc-filter-dark-mode #focus_cmt .reply_box .cmt_write_box.small .user_info_input input,
        body.dc-filter-dark-mode #focus_cmt .reply_box .cmt_write_box.small .cmt_txt_cont {
            border-color: rgba(120, 144, 175, 0.24) !important;
            background: rgba(24, 33, 45, 0.94) !important;
        }
        body.dc-filter-dark-mode #focus_cmt .reply_box .cmt_write_box.small textarea {
            background: rgba(24, 33, 45, 0.94) !important;
            color: #dbe6f5 !important;
        }
        body.dc-filter-dark-mode #focus_cmt .reply_box .cmt_write_box.small .cmt_cont_bottm {
            border-top-color: rgba(120, 144, 175, 0.2) !important;
            background: rgba(20, 28, 39, 0.84) !important;
        }
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_count {
            border-bottom: 0 !important;
        }
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_count .num_box,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_count .num_box *,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_count .fr,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_count .fr button,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_count .fr a,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_count .fr span,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_count .fr em,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_count .comment_sort,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_count .comment_sort * {
            color: #dbe6f5 !important;
        }
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_count .num_box .font_red {
            color: #7db0ff !important;
        }
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box {
            background: transparent !important;
        }
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .cmt_list > li {
            border-color: rgba(90, 112, 145, 0.46) !important;
            background: linear-gradient(180deg, rgba(19, 28, 39, 0.92) 0%, rgba(16, 23, 33, 0.94) 100%) !important;
            box-shadow: inset 0 0 0 1px rgba(90, 112, 145, 0.46), 0 12px 26px rgba(3, 8, 16, 0.28) !important;
            border: 0 !important;
            border-top: 0 !important;
        }
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .cmt_list > li::before {
            content: none !important;
            display: none !important;
        }
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .reply.show {
            border-top-color: rgba(122, 140, 166, 0.28) !important;
        }
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .reply_box {
            border-left-color: rgba(116, 136, 164, 0.54) !important;
            background: linear-gradient(180deg, rgba(32, 42, 56, 0.78) 0%, rgba(28, 37, 50, 0.82) 100%) !important;
            box-shadow: inset 0 0 0 1px rgba(86, 104, 130, 0.52) !important;
        }
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .reply_list > li {
            background: transparent !important;
            box-shadow: none !important;
            border: 0 !important;
            border-top: 0 !important;
        }
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .reply_list > li + li {
            border-top-color: rgba(122, 140, 166, 0.24) !important;
        }
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .reply_list > li .cmt_nickbox::before {
            color: #b9c9dd !important;
        }

        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .cmt_nickbox,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .gall_writer,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .nickname,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .nickname em,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .usertxt {
            color: #dbe6f5 !important;
        }
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .nickname.me,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .nickname.me em,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .gall_writer .nickname.me,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .gall_writer .nickname.me em {
            color: #8ab4ff !important;
            font-weight: 900 !important;
            background: transparent !important;
        }
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .ip,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .date_time,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .txt_del,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .cmt_info > .fr,
        body.dc-filter-dark-mode div[id^="comment_wrap_"] .comment_box .reply_info > .fr {
            color: #97abc7 !important;
        }
        body.dc-filter-dark-mode #focus_cmt > .cmt_write_box {
            border-color: rgba(120, 144, 175, 0.24) !important;
            background: rgba(17, 24, 34, 0.92) !important;
        }
        body.dc-filter-dark-mode #focus_cmt > .cmt_write_box .user_info_input input,
        body.dc-filter-dark-mode #focus_cmt > .cmt_write_box .cmt_txt_cont,
        body.dc-filter-dark-mode #focus_cmt > .cmt_write_box .cmt_write,
        body.dc-filter-dark-mode #focus_cmt > .cmt_write_box textarea {
            border-color: rgba(120, 144, 175, 0.24) !important;
            background: rgba(24, 33, 45, 0.94) !important;
            color: #dbe6f5 !important;
        }
        body.dc-filter-dark-mode #focus_cmt > .cmt_write_box .cmt_cont_bottm {
            border-top-color: rgba(120, 144, 175, 0.2) !important;
            background: rgba(20, 28, 39, 0.84) !important;
        }
        /* [?? ??/??? ?? ?? ?????] */
        #focus_cmt,
        #focus_cmt > div[id^="comment_wrap_"],
        #focus_cmt > .cmt_write_box,
        #focus_cmt > .cmt_write_box .cmt_txt_cont,
        #focus_cmt > .cmt_write_box .cmt_cont_bottm,
        #focus_cmt > .cmt_write_box .dccon_guidebox {
            overflow: visible !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_info,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_info,
        #focus_cmt > div[id^="comment_wrap_"] .view_comment .cmt_info,
        #focus_cmt > div[id^="comment_wrap_"] .view_comment .reply_info {
            overflow: visible !important;
            position: relative !important;
            z-index: auto !important;
            border-top: 0 !important;
            padding-top: 0 !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li {
            margin: 0 0 10px !important;
            padding: 14px 17px 14px 18px !important;
            border: 0 !important;
            border-top: 0 !important;
            border-radius: 16px !important;
            background: linear-gradient(180deg, #ffffff 0%, #f7f7f8 100%) !important;
            box-shadow: 0 14px 28px rgba(15, 23, 42, 0.09), 0 3px 8px rgba(15, 23, 42, 0.06) !important;
        }
        /* Focus-comment parent cards paint their merged reply background through ::after.
           Later popup z-index fixes must not blindly lift this whole card above siblings,
           or the extended white background covers nearby comments/replies. */
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li[data-dcuf-focus-group-parent="1"] {
            position: relative !important;
            background: transparent !important;
            box-shadow: none !important;
            overflow: visible !important;
            z-index: 0 !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li[data-dcuf-focus-group-parent="1"]::after {
            content: "" !important;
            position: absolute !important;
            left: 0 !important;
            right: 0 !important;
            top: 0 !important;
            bottom: calc(var(--dcuf-focus-group-extend, 0px) * -1) !important;
            border-radius: 16px !important;
            background: linear-gradient(180deg, #ffffff 0%, #f7f7f8 100%) !important;
            border: 1px solid rgba(222, 230, 239, 0.92) !important;
            box-shadow:
                inset 0 1px 0 rgba(255, 255, 255, 0.92),
                inset 0 12px 18px rgba(255, 255, 255, 0.28),
                inset 0 -10px 18px rgba(214, 223, 235, 0.26),
                0 10px 22px rgba(15, 23, 42, 0.08),
                0 2px 6px rgba(15, 23, 42, 0.04) !important;
            z-index: -1 !important;
            pointer-events: none !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li[data-dcuf-focus-group-parent="1"] > * {
            position: relative !important;
            z-index: 1 !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li::before,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_nickbox::before,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_nickbox::after,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .gall_writer::before,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .gall_writer::after,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .nickname::before,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .nickname::after {
            content: none !important;
            display: none !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_info::before,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_info::after,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_info::before,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_info::after {
            content: none !important;
            display: none !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_txtbox {
            border-top: 0 !important;
            box-shadow: none !important;
            background: transparent !important;
        }
        /* fcno 포커스 댓글은 "대댓글만 담긴 top-level li"가 따로 생길 수 있습니다.
           이 wrapper는 카드처럼 보이면 부모/대댓글이 분리돼 보이므로, 시각적으로는 reply 박스처럼 눌러줍니다. */
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li:has(> .reply.show):not(:has(> .cmt_info)) {
            margin: -6px 0 12px !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li:has(> .reply.show):not(:has(> .cmt_info)) > .reply.show {
            margin-top: 0 !important;
            padding-top: 0 !important;
            border-top: 0 !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_txtbox,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .usertxt,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li .cmt_txtbox,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li .usertxt {
            position: static !important;
            inset: auto !important;
            float: none !important;
            clear: both !important;
            width: auto !important;
            max-width: none !important;
            min-width: 0 !important;
            transform: none !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply.show {
            margin-top: 10px !important;
            padding-top: 10px !important;
            border-top: 1px solid #e3e9f1 !important;
            background: transparent !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_box {
            margin: 2px 0 0 8px !important;
            padding: 10px 12px 10px 14px !important;
            border: 0 !important;
            border-left: 1px solid #d7dee8 !important;
            border-radius: 12px !important;
            background: linear-gradient(180deg, rgba(247, 249, 252, 0.96) 0%, rgba(243, 246, 250, 0.96) 100%) !important;
            box-shadow: inset 0 0 0 1px rgba(211, 220, 232, 0.76) !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li[data-dcuf-focus-group-reply="1"] {
            margin: -16px 0 12px !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li[data-dcuf-focus-group-reply="1"] > .reply.show {
            margin-top: 0 !important;
            padding-top: 0 !important;
            border-top: 0 !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li[data-dcuf-focus-group-reply="1"] > .reply.show > .reply_box {
            margin: -14px 0 0 8px !important;
            padding: 8px 12px 10px 14px !important;
            border-left: 1px solid #d2dbe7 !important;
            border-radius: 12px !important;
            background: linear-gradient(180deg, rgba(244, 247, 251, 0.98) 0%, rgba(239, 243, 248, 0.98) 100%) !important;
            box-shadow: inset 0 0 0 1px rgba(208, 218, 230, 0.84) !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list {
            margin: 0 !important;
            padding: 0 !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li {
            margin: 0 !important;
            padding: 8px 0 0 0 !important;
            border: 0 !important;
            border-top: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li + li {
            margin-top: 8px !important;
            padding-top: 8px !important;
            border-top: 1px solid #e1e8f0 !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li::before,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li::after,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li .reply_info::before,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li .reply_info::after,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li .cmt_nickbox::before,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li .cmt_nickbox::after,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li .gall_writer::before,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li .gall_writer::after,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li .comment_dccon::before,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li .comment_dccon::after,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li a.mention::before,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li a.mention::after,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li a.mention.deco::before,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li a.mention.deco::after,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li p.usertxt::before,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li p.usertxt::after,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li p.usertxt.ub-word::before,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li p.usertxt.ub-word::after {
            content: none !important;
            display: none !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li .cmt_nickbox {
            padding-left: 24px !important;
            position: relative !important;
        }

        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li .cmt_txtbox {
            padding-left: 24px !important;
            position: relative !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li .cmt_txtbox::before {
            content: none !important;
            display: none !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li .cmt_nickbox::before {
            content: "\\3134" !important;
            position: absolute !important;
            left: 4px !important;
            top: 1px !important;
            display: block !important;
            font-size: 13px !important;
            line-height: 1 !important;
            color: #78899f !important;
            font-weight: 700 !important;
        }
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_nickbox,
        #focus_cmt > div[id^="comment_wrap_"] .comment_box .gall_writer.ub-writer {
            overflow: visible !important;
            position: relative !important;
            z-index: auto !important;
        }
        #focus_cmt #user_data_lyr,
        #focus_cmt .user_data,
        #focus_cmt .user_data_add,
        #focus_cmt .user_data_add .user_data_list,
        #focus_cmt ul.user_data_list,
        #focus_cmt #dccon_guide_lyr,
        #focus_cmt .pop_wrap.type2 {
            z-index: 2147483647 !important;
            overflow: visible !important;
        }
        #focus_cmt #user_data_lyr,
        #focus_cmt .user_data,
        #focus_cmt .user_data_add {
            position: absolute !important;
        }
        #focus_cmt > .cmt_write_box .cmt_txt_cont,
        #focus_cmt > .cmt_write_box .cmt_cont_bottm {
            overflow: visible !important;
        }
        .view_content_wrap .gall_writer,
        .view_content_wrap .gall_writer .fr,
        .view_content_wrap .gall_writer .fr > span,
        .view_content_wrap .gall_writer .gall_scrap,
        .view_content_wrap .gall_writer .gall_scrap button,
        .view_content_wrap .btn_recommend_box,
        .view_content_wrap .recom_bottom_box,
        .view_content_wrap .recom_bottom_box > button,
        #focus_cmt .reply_box,
        #focus_cmt .reply_box .cmt_write_box.small,
        #focus_cmt .reply_box .cmt_write_box.small .cmt_txt_cont,
        #focus_cmt .reply_box .cmt_cont_bottm,
        #focus_cmt .reply_box .dccon_guidebox {
            overflow: visible !important;
        }
        .view_content_wrap .pop_wrap.type2,
        .view_content_wrap .pop_wrap.type3,
        #focus_cmt .pop_wrap.type2,
        #focus_cmt .pop_wrap.type3 {
            z-index: 2147483647 !important;
        }
        .view_content_wrap .gall_writer:has(.pop_wrap.type2[style*="display:block"]),
        .view_content_wrap .gall_writer:has(.pop_wrap.type2[style*="display: block"]),
        .view_content_wrap .gall_writer:has(.pop_wrap.type3[style*="display:block"]),
        .view_content_wrap .gall_writer:has(.pop_wrap.type3[style*="display: block"]),
        .view_content_wrap .btn_recommend_box:has(.pop_wrap.type2[style*="display:block"]),
        .view_content_wrap .btn_recommend_box:has(.pop_wrap.type2[style*="display: block"]),
        .view_content_wrap .btn_recommend_box:has(.pop_wrap.type3[style*="display:block"]),
        .view_content_wrap .btn_recommend_box:has(.pop_wrap.type3[style*="display: block"]),
        #focus_cmt .reply_box:has(.pop_wrap.type2[style*="display:block"]),
        #focus_cmt .reply_box:has(.pop_wrap.type2[style*="display: block"]),
        #focus_cmt .reply_box:has(.pop_wrap.type3[style*="display:block"]),
        #focus_cmt .reply_box:has(.pop_wrap.type3[style*="display: block"]),
        #focus_cmt .comment_box .cmt_list > li:has(.pop_wrap.type2[style*="display:block"]),
        #focus_cmt .comment_box .cmt_list > li:has(.pop_wrap.type2[style*="display: block"]),
        #focus_cmt .comment_box .cmt_list > li:has(.pop_wrap.type3[style*="display:block"]),
        #focus_cmt .comment_box .cmt_list > li:has(.pop_wrap.type3[style*="display: block"]),
        #focus_cmt .comment_box .reply_list > li:has(#user_data_lyr[style*="display:block"]),
        #focus_cmt .comment_box .reply_list > li:has(#user_data_lyr[style*="display: block"]),
        #focus_cmt .comment_box .reply_list > li:has(.user_data[style*="display:block"]),
        #focus_cmt .comment_box .reply_list > li:has(.user_data[style*="display: block"]),
        #focus_cmt .comment_box .reply_list > li:has(.user_data_add .user_data_list),
        #focus_cmt .comment_box .reply_list > li:has(ul.user_data_list),
        #focus_cmt .comment_box .cmt_list > li:has(#user_data_lyr[style*="display:block"]),
        #focus_cmt .comment_box .cmt_list > li:has(#user_data_lyr[style*="display: block"]),
        #focus_cmt .comment_box .cmt_list > li:has(.user_data[style*="display:block"]),
        #focus_cmt .comment_box .cmt_list > li:has(.user_data[style*="display: block"]),
        #focus_cmt .comment_box .cmt_list > li:has(.user_data_add .user_data_list),
        #focus_cmt .comment_box .cmt_list > li:has(ul.user_data_list),
        #focus_cmt .comment_box .cmt_list > li:has(.reply_list > li:has(#user_data_lyr[style*="display:block"])),
        #focus_cmt .comment_box .cmt_list > li:has(.reply_list > li:has(#user_data_lyr[style*="display: block"])),
        #focus_cmt .comment_box .cmt_list > li:has(.reply_list > li:has(.user_data[style*="display:block"])),
        #focus_cmt .comment_box .cmt_list > li:has(.reply_list > li:has(.user_data[style*="display: block"])),
        #focus_cmt .comment_box .cmt_list > li:has(.reply_list > li:has(.user_data_add .user_data_list)),
        #focus_cmt .comment_box .cmt_list > li:has(.reply_list > li:has(ul.user_data_list)) {
            position: relative !important;
            z-index: 2147483646 !important;
            overflow: visible !important;
        }
        #focus_cmt .comment_box .cmt_info:has(#user_data_lyr[style*="display:block"]),
        #focus_cmt .comment_box .cmt_info:has(#user_data_lyr[style*="display: block"]),
        #focus_cmt .comment_box .cmt_info:has(.user_data[style*="display:block"]),
        #focus_cmt .comment_box .cmt_info:has(.user_data[style*="display: block"]),
        #focus_cmt .comment_box .cmt_info:has(.user_data_add .user_data_list),
        #focus_cmt .comment_box .cmt_info:has(ul.user_data_list),
        #focus_cmt .comment_box .reply_info:has(#user_data_lyr[style*="display:block"]),
        #focus_cmt .comment_box .reply_info:has(#user_data_lyr[style*="display: block"]),
        #focus_cmt .comment_box .reply_info:has(.user_data[style*="display:block"]),
        #focus_cmt .comment_box .reply_info:has(.user_data[style*="display: block"]),
        #focus_cmt .comment_box .reply_info:has(.user_data_add .user_data_list),
        #focus_cmt .comment_box .reply_info:has(ul.user_data_list) {
            position: relative !important;
            z-index: 2147483647 !important;
            overflow: visible !important;
        }
        body.dc-filter-dark-mode #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li {
            background: linear-gradient(180deg, rgba(19, 28, 39, 0.92) 0%, rgba(16, 23, 33, 0.94) 100%) !important;
            box-shadow: 0 1px 0 rgba(90, 112, 145, 0.36), 0 14px 28px rgba(3, 8, 16, 0.3) !important;
        }
        body.dc-filter-dark-mode #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li[data-dcuf-focus-group-parent="1"]::after {
            background: linear-gradient(180deg, rgba(19, 28, 39, 0.92) 0%, rgba(16, 23, 33, 0.94) 100%) !important;
            border-color: rgba(86, 104, 130, 0.5) !important;
            box-shadow:
                inset 0 1px 0 rgba(120, 138, 164, 0.18),
                inset 0 12px 18px rgba(36, 49, 66, 0.22),
                inset 0 -10px 18px rgba(6, 11, 18, 0.26),
                0 12px 24px rgba(3, 8, 16, 0.22),
                0 2px 8px rgba(3, 8, 16, 0.12) !important;
        }
        body.dc-filter-dark-mode #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply.show {
            border-top: 1px solid rgba(122, 140, 166, 0.28) !important;
        }
        body.dc-filter-dark-mode #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li + li {
            border-top-color: rgba(122, 140, 166, 0.24) !important;
        }
        body.dc-filter-dark-mode #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_list > li .cmt_nickbox::before {
            color: #b9c9dd !important;
        }
        body.dc-filter-dark-mode #focus_cmt > div[id^="comment_wrap_"] .comment_box .reply_box {
            border-left-color: rgba(116, 136, 164, 0.54) !important;
            background: linear-gradient(180deg, rgba(32, 42, 56, 0.78) 0%, rgba(28, 37, 50, 0.82) 100%) !important;
            box-shadow: inset 0 0 0 1px rgba(86, 104, 130, 0.52) !important;
        }
        body.dc-filter-dark-mode #focus_cmt > div[id^="comment_wrap_"] .comment_box .cmt_list > li[data-dcuf-focus-group-reply="1"] > .reply.show > .reply_box {
            border-left-color: rgba(122, 140, 166, 0.5) !important;
            background: linear-gradient(180deg, rgba(28, 39, 52, 0.88) 0%, rgba(25, 35, 47, 0.9) 100%) !important;
            box-shadow: inset 0 0 0 1px rgba(86, 104, 130, 0.56) !important;
        }
        @media screen and (max-width: 820px) {
            .cmt_write_box {
                flex-direction: column !important;
            }
            .cmt_write_box > .fl,
            .cmt_write_box .cmt_txt_cont {
                flex-basis: auto !important;
                width: 100% !important;
                min-width: 0 !important;
            }
            .cmt_write_box .cmt_cont_bottm > .fr {
                margin-left: 0 !important;
                width: 100% !important;
                justify-content: flex-end !important;
            }
            #focus_cmt .reply_box .cmt_write_box.small {
                grid-template-columns: 1fr !important;
                gap: 8px !important;
            }
            #focus_cmt .reply_box .cmt_write_box.small > .fl,
            #focus_cmt .reply_box .cmt_write_box.small .cmt_txt_cont {
                grid-column: 1 !important;
                width: 100% !important;
                min-width: 0 !important;
            }
            .view_content_wrap .recommend_kapcode {
                width: 290px !important;
                min-width: 290px !important;
                max-width: 290px !important;
            }
            .view_content_wrap .recommend_kapcode .recom_input_kapcode {
                flex: 0 0 150px !important;
                width: 150px !important;
                min-width: 150px !important;
                max-width: 150px !important;
            }
            .comment_box .reply_box {
                margin-left: 12px !important;
                padding-left: 12px !important;
            }
        }
        @media screen and (max-width: 640px) {
            .view_content_wrap {
                padding: 8px 8px 0 !important;
            }
            .view_content_wrap .gallview_head,
            .view_content_wrap .gallview_contents,
            .comment_box,
            .cmt_write_box,
            .view_content_wrap .btn_recommend_box {
                border-radius: 16px !important;
            }
            .view_content_wrap .gallview_head {
                padding: 15px 14px 12px !important;
            }
            .view_content_wrap .title_subject {
                font-size: 20px !important;
            }
            .view_content_wrap .gallview_contents,
            .view_content_wrap .btn_recommend_box,
            .comment_box .cmt_list > li,
            .comment_box .reply_list > li,
            .cmt_write_box {
                padding-left: 14px !important;
                padding-right: 14px !important;
            }
            .comment_box .cmt_list > li {
                padding-top: 14px !important;
                padding-bottom: 14px !important;
            }
            .comment_box .reply_list > li {
                padding-top: 11px !important;
                padding-bottom: 11px !important;
            }
        }
    `;

    const DEBUG_KEY = '__DCUF_PHASE1_VIEW_DEBUG__';
    const debugState = {
        status: 'idle',
        detail: null,
        ts: null,
        href: location.href,
        refreshCount: 0,
        refreshAttempted: false,
        lastFailureReason: null,
        lastVerify: null
    };

    const setDebug = (status, detail, extra = {}) => {
        debugState.status = status;
        debugState.detail = detail;
        debugState.ts = new Date().toISOString();
        debugState.href = location.href;
        Object.assign(debugState, extra);
        const previousPayload = (window[DEBUG_KEY] && typeof window[DEBUG_KEY] === 'object')
            ? window[DEBUG_KEY]
            : {};
        const payload = { ...previousPayload, ...debugState };
        window[DEBUG_KEY] = payload;
        const root = document.documentElement;
        if (root instanceof HTMLElement) {
            root.setAttribute('data-dcuf-phase1-view', status);
        }
        return payload;
    };

    const toPixelValue = (value) => {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const isTransparentColor = (value) => {
        if (!value) return true;
        const normalized = String(value).trim().toLowerCase();
        return normalized === 'transparent' || normalized === 'rgba(0, 0, 0, 0)' || normalized === 'rgba(0,0,0,0)';
    };

    const hasRenderableBorder = (style) => {
        const edges = ['Top', 'Right', 'Bottom', 'Left'];
        return edges.some((edge) => {
            const width = toPixelValue(style[`border${edge}Width`]);
            const borderStyle = style[`border${edge}Style`];
            const color = style[`border${edge}Color`];
            return width > 0 && borderStyle !== 'none' && !isTransparentColor(color);
        });
    };

    const resolveScopeRoot = (root = document) => {
        if (root instanceof Document || root instanceof Element || root instanceof DocumentFragment) return root;
        return document;
    };

    const findWithinRoot = (root, selector) => {
        const scope = resolveScopeRoot(root);
        if (scope instanceof Element && scope.matches(selector)) return scope;
        return typeof scope.querySelector === 'function' ? scope.querySelector(selector) : null;
    };

    const injectStyle = ({ refresh = false, reason = 'ensure' } = {}) => {
        const target = document.head || document.documentElement;
        if (!target) {
            setDebug('no-target', `${reason} / head/documentElement unavailable`);
            return false;
        }

        let style = document.getElementById(STYLE_ID);
        if (style instanceof HTMLStyleElement) {
            if (refresh) {
                debugState.refreshAttempted = true;
                debugState.refreshCount += 1;
                style.textContent = css;
                target.appendChild(style);
                setDebug('style-refreshed', `${reason} / style tag refreshed`, {
                    refreshAttempted: true,
                    refreshCount: debugState.refreshCount
                });
                return true;
            }

            setDebug('style-exists', `${reason} / style tag already present`, {
                refreshAttempted: debugState.refreshAttempted,
                refreshCount: debugState.refreshCount
            });
            return true;
        }

        style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;
        target.appendChild(style);
        if (refresh) {
            debugState.refreshAttempted = true;
            debugState.refreshCount += 1;
        }
        setDebug(refresh ? 'style-refreshed' : 'style-injected', `${reason} / style tag appended`, {
            refreshAttempted: debugState.refreshAttempted,
            refreshCount: debugState.refreshCount
        });
        return true;
    };

    const verifyApplied = (reason = 'verify', root = document, options = {}) => {
        const mode = options && options.mode === 'core' ? 'core' : 'full';
        const viewWrap = findWithinRoot(root, '.view_content_wrap');
        if (!(viewWrap instanceof HTMLElement)) {
            const result = {
                ready: false,
                reason: 'waiting-view',
                detail: { reason, mode, hasViewWrap: false }
            };
            setDebug('waiting-view', JSON.stringify(result.detail), {
                lastFailureReason: result.reason,
                lastVerify: result
            });
            return result;
        }

        const head = viewWrap.querySelector('.gallview_head');
        const content = viewWrap.querySelector('.gallview_contents');
        if (!(head instanceof HTMLElement) || !(content instanceof HTMLElement)) {
            const result = {
                ready: false,
                reason: 'waiting-view',
                detail: {
                    reason,
                    mode,
                    hasViewWrap: true,
                    hasHead: head instanceof HTMLElement,
                    hasContent: content instanceof HTMLElement
                }
            };
            setDebug('waiting-view', JSON.stringify(result.detail), {
                lastFailureReason: result.reason,
                lastVerify: result
            });
            return result;
        }

        const wrapStyle = window.getComputedStyle(viewWrap);
        const headStyle = window.getComputedStyle(head);
        const contentStyle = window.getComputedStyle(content);
        const recommendBox = viewWrap.querySelector('.btn_recommend_box');
        const recommendBoxStyle = recommendBox instanceof HTMLElement ? window.getComputedStyle(recommendBox) : null;
        const commentBox = document.querySelector('#focus_cmt .comment_box, div[id^="comment_wrap_"] .comment_box, .view_comment .comment_box');
        const commentWriteBox = document.querySelector('#focus_cmt > .cmt_write_box, #focus_cmt .cmt_write_box, .view_comment .cmt_write_box');
        const commentTextContainer = commentWriteBox instanceof HTMLElement
            ? commentWriteBox.querySelector('.cmt_txt_cont')
            : null;
        const commentBoxStyle = commentBox instanceof HTMLElement ? window.getComputedStyle(commentBox) : null;
        const commentWriteBoxStyle = commentWriteBox instanceof HTMLElement ? window.getComputedStyle(commentWriteBox) : null;
        const commentTextContainerStyle = commentTextContainer instanceof HTMLElement ? window.getComputedStyle(commentTextContainer) : null;
        const detail = {
            reason,
            mode,
            wrapPaddingLeft: toPixelValue(wrapStyle.paddingLeft),
            wrapPaddingRight: toPixelValue(wrapStyle.paddingRight),
            headRadius: toPixelValue(headStyle.borderRadius),
            headBackgroundColor: headStyle.backgroundColor,
            headBackgroundImage: headStyle.backgroundImage,
            headBoxShadow: headStyle.boxShadow,
            headHasRenderableBorder: hasRenderableBorder(headStyle),
            contentRadius: toPixelValue(contentStyle.borderRadius),
            contentBackgroundColor: contentStyle.backgroundColor,
            contentBackgroundImage: contentStyle.backgroundImage,
            contentBoxShadow: contentStyle.boxShadow,
            contentHasRenderableBorder: hasRenderableBorder(contentStyle),
            hasRecommendBox: recommendBox instanceof HTMLElement,
            recommendBoxRadius: recommendBoxStyle ? toPixelValue(recommendBoxStyle.borderRadius) : 0,
            recommendBoxBackgroundColor: recommendBoxStyle?.backgroundColor || '',
            recommendBoxBackgroundImage: recommendBoxStyle?.backgroundImage || 'none',
            recommendBoxBoxShadow: recommendBoxStyle?.boxShadow || 'none',
            recommendBoxHasRenderableBorder: recommendBoxStyle ? hasRenderableBorder(recommendBoxStyle) : false,
            hasCommentBox: commentBox instanceof HTMLElement,
            commentBoxRadius: commentBoxStyle ? toPixelValue(commentBoxStyle.borderRadius) : 0,
            commentBoxBackgroundColor: commentBoxStyle?.backgroundColor || '',
            commentBoxBackgroundImage: commentBoxStyle?.backgroundImage || 'none',
            commentBoxBoxShadow: commentBoxStyle?.boxShadow || 'none',
            commentBoxHasRenderableBorder: commentBoxStyle ? hasRenderableBorder(commentBoxStyle) : false,
            hasCommentWriteBox: commentWriteBox instanceof HTMLElement,
            commentWriteBoxRadius: commentWriteBoxStyle ? toPixelValue(commentWriteBoxStyle.borderRadius) : 0,
            commentWriteBoxBackgroundColor: commentWriteBoxStyle?.backgroundColor || '',
            commentWriteBoxBackgroundImage: commentWriteBoxStyle?.backgroundImage || 'none',
            commentWriteBoxBoxShadow: commentWriteBoxStyle?.boxShadow || 'none',
            commentWriteBoxHasRenderableBorder: commentWriteBoxStyle ? hasRenderableBorder(commentWriteBoxStyle) : false,
            hasCommentTextContainer: commentTextContainer instanceof HTMLElement,
            commentTextContainerRadius: commentTextContainerStyle ? toPixelValue(commentTextContainerStyle.borderRadius) : 0,
            commentTextContainerBackgroundColor: commentTextContainerStyle?.backgroundColor || '',
            commentTextContainerBackgroundImage: commentTextContainerStyle?.backgroundImage || 'none',
            commentTextContainerHasRenderableBorder: commentTextContainerStyle ? hasRenderableBorder(commentTextContainerStyle) : false
        };

        let failureReason = null;
        if (Math.max(detail.wrapPaddingLeft, detail.wrapPaddingRight) < 8) {
            failureReason = 'insufficient-wrap-padding';
        } else if (detail.headRadius < 16) {
            failureReason = 'insufficient-head-radius';
        } else if (headStyle.boxShadow === 'none') {
            failureReason = 'missing-head-elevation';
        } else if (headStyle.backgroundImage === 'none' && isTransparentColor(detail.headBackgroundColor)) {
            failureReason = 'transparent-head-background';
        } else if (detail.contentRadius < 16) {
            failureReason = 'insufficient-content-radius';
        } else if (contentStyle.boxShadow === 'none') {
            failureReason = 'missing-content-elevation';
        } else if (contentStyle.backgroundImage === 'none' && isTransparentColor(detail.contentBackgroundColor)) {
            failureReason = 'transparent-content-background';
        } else if (mode !== 'core' && recommendBox instanceof HTMLElement && detail.recommendBoxRadius < 16) {
            failureReason = 'insufficient-recommend-radius';
        } else if (mode !== 'core' && recommendBox instanceof HTMLElement && recommendBoxStyle.boxShadow === 'none') {
            failureReason = 'missing-recommend-elevation';
        } else if (mode !== 'core' && recommendBox instanceof HTMLElement && recommendBoxStyle.backgroundImage === 'none' && isTransparentColor(detail.recommendBoxBackgroundColor)) {
            failureReason = 'transparent-recommend-background';
        } else if (mode !== 'core' && commentBox instanceof HTMLElement && detail.commentBoxRadius < 16) {
            failureReason = 'insufficient-comment-radius';
        } else if (mode !== 'core' && commentBox instanceof HTMLElement && commentBoxStyle.boxShadow === 'none') {
            failureReason = 'missing-comment-elevation';
        } else if (mode !== 'core' && commentBox instanceof HTMLElement && commentBoxStyle.backgroundImage === 'none' && isTransparentColor(detail.commentBoxBackgroundColor)) {
            failureReason = 'transparent-comment-background';
        } else if (mode !== 'core' && commentWriteBox instanceof HTMLElement && detail.commentWriteBoxRadius < 16) {
            failureReason = 'insufficient-comment-write-radius';
        } else if (mode !== 'core' && commentWriteBox instanceof HTMLElement && commentWriteBoxStyle.boxShadow === 'none') {
            failureReason = 'missing-comment-write-elevation';
        } else if (mode !== 'core' && commentWriteBox instanceof HTMLElement && commentWriteBoxStyle.backgroundImage === 'none' && isTransparentColor(detail.commentWriteBoxBackgroundColor)) {
            failureReason = 'transparent-comment-write-background';
        } else if (mode !== 'core' && commentTextContainer instanceof HTMLElement && detail.commentTextContainerRadius < 12) {
            failureReason = 'insufficient-comment-input-radius';
        } else if (mode !== 'core' && commentTextContainer instanceof HTMLElement && commentTextContainerStyle.backgroundImage === 'none' && isTransparentColor(detail.commentTextContainerBackgroundColor)) {
            failureReason = 'transparent-comment-input-background';
        } else if (mode !== 'core' && commentTextContainer instanceof HTMLElement && !detail.commentTextContainerHasRenderableBorder) {
            failureReason = 'missing-comment-input-border';
        }

        const result = {
            ready: !failureReason,
            reason: failureReason || 'ready',
            detail
        };
        setDebug(result.ready ? 'applied' : 'not-applied', JSON.stringify({
            ...detail,
            reason: result.reason
        }), {
            lastFailureReason: failureReason,
            lastVerify: result
        });
        return result;
    };

    window.__dcufPhase1ViewTheme = {
        ensure(options = {}) {
            return injectStyle(options);
        },
        verify(root = document, options = {}) {
            return verifyApplied('bridge', root, options);
        },
        getDebugState() {
            const previousPayload = (window[DEBUG_KEY] && typeof window[DEBUG_KEY] === 'object')
                ? window[DEBUG_KEY]
                : {};
            return { ...previousPayload, ...debugState };
        }
    };

    injectStyle({ reason: 'initial' });
    verifyApplied('initial');
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            injectStyle({ reason: 'domcontentloaded' });
            verifyApplied('domcontentloaded');
        }, { once: true });
    }
    window.addEventListener('load', () => {
        injectStyle({ reason: 'window-load' });
        verifyApplied('window-load');
    }, { once: true });
})();
(() => {
    const STYLE_ID = 'dcuf-runtime-fixes';
    const ARTICLE_AD_SELECTOR = [
        'div[id^="foin_"]',
        'iframe[id^="pageid_"]',
        'iframe[src*="adnmore"]',
        '.power_link',
        '.power_link .pwlink_list',
        '.power_link .pwlink_img_list',
        '.view_content_wrap #ad_nv_slot',
        '.gallview_contents #ad_nv_slot',
        '.writing_view_box #ad_nv_slot',
        '.write_div #ad_nv_slot',
        '.view_content_wrap iframe[id^="ad_nv_slot_tgt"]',
        '.gallview_contents iframe[id^="ad_nv_slot_tgt"]',
        '.writing_view_box iframe[id^="ad_nv_slot_tgt"]',
        '.write_div iframe[id^="ad_nv_slot_tgt"]',
        '.view_content_wrap .view_ad_wrap',
        '.gallview_contents .view_ad_wrap',
        '.writing_view_box .view_ad_wrap',
        '.write_div .view_ad_wrap',
        '.view_bottom .view_ad_wrap',
        '.view_content_wrap ins.kakao_ad_area',
        '.view_content_wrap div[id^="kakao_ad_"]'
    ].join(', ');
    const css = `
        div[id^="foin_"],
        div[id^="foin_"] .closebtn,
        div[id^="foin_"] + .closebtn,
        iframe[id^="pageid_"],
        iframe[id^="pageid_"][src*="adnmore"],
        iframe[src*="adnmore"],
        .power_link,
        .power_link .pwlink_list,
        .power_link .pwlink_img_list,
        .view_content_wrap #ad_nv_slot,
        .gallview_contents #ad_nv_slot,
        .writing_view_box #ad_nv_slot,
        .write_div #ad_nv_slot,
        .view_content_wrap iframe[id^="ad_nv_slot_tgt"],
        .gallview_contents iframe[id^="ad_nv_slot_tgt"],
        .writing_view_box iframe[id^="ad_nv_slot_tgt"],
        .write_div iframe[id^="ad_nv_slot_tgt"],
        .view_content_wrap .view_ad_wrap,
        .gallview_contents .view_ad_wrap,
        .writing_view_box .view_ad_wrap,
        .write_div .view_ad_wrap,
        .view_bottom .view_ad_wrap,
        .view_content_wrap ins.kakao_ad_area,
        .view_content_wrap div[id^="kakao_ad_"] {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            overflow: hidden !important;
            visibility: hidden !important;
            pointer-events: none !important;
        }
        body.dc-filter-dark-mode #dc-personal-block-fab {
            background: linear-gradient(180deg, #202a36 0%, #1a2330 100%) !important;
            color: #d9e3f2 !important;
            border-color: #445468 !important;
            box-shadow: 0 8px 18px rgba(0, 0, 0, 0.28) !important;
        }
        body.dc-filter-dark-mode #dc-personal-block-fab:hover {
            background: linear-gradient(180deg, #24303d 0%, #1d2734 100%) !important;
            border-color: #53657d !important;
            box-shadow: 0 10px 22px rgba(0, 0, 0, 0.34) !important;
        }
        body.dc-filter-dark-mode #dc-personal-block-fab:active {
            box-shadow: 0 5px 12px rgba(0, 0, 0, 0.26) !important;
        }
        body.dc-filter-dark-mode .cmt_nickbox,
        body.dc-filter-dark-mode .author {
            background: transparent !important;
        }
        body.dc-filter-dark-mode .cmt_nickbox .nickname,
        body.dc-filter-dark-mode .cmt_nickbox .ip,
        body.dc-filter-dark-mode .author .nickname,
        body.dc-filter-dark-mode .author .ip {
            background: transparent !important;
            color: #d6e1f5 !important;
        }
    `;

    const injectStyle = () => {
        if (document.getElementById(STYLE_ID)) return true;
        const target = document.head || document.documentElement;
        if (!target) return false;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;
        target.appendChild(style);
        return true;
    };

    const collectArticleAdCandidates = (roots = [document]) => {
        const rootList = Array.isArray(roots) ? roots : [roots];
        const seen = new Set();
        const candidates = [];
        const push = (element) => {
            if (!(element instanceof Element) || seen.has(element)) return;
            if (!element.matches(ARTICLE_AD_SELECTOR)) return;
            seen.add(element);
            candidates.push(element);
        };

        rootList.forEach((root) => {
            if (root instanceof Element) push(root);
            if (root && typeof root.querySelectorAll === 'function') {
                root.querySelectorAll(ARTICLE_AD_SELECTOR).forEach(push);
            }
        });
        return candidates;
    };

    const resolveArticleAdRemovalTarget = (element) => {
        if (!(element instanceof Element)) return null;
        if (element.matches('#ad_nv_slot, .view_ad_wrap, div[id^="foin_"], div[id^="kakao_ad_"], .power_link')) {
            return element;
        }
        if (element.matches('iframe[id^="ad_nv_slot_tgt"]')) {
            return element.closest('#ad_nv_slot') || element;
        }
        if (element.matches('iframe[id^="pageid_"], iframe[src*="adnmore"], ins.kakao_ad_area')) {
            return element.closest('.view_ad_wrap, div[id^="foin_"], div[id^="kakao_ad_"], .cm_ad') || element;
        }
        const ownedAdWrap = element.closest('#ad_nv_slot, .view_ad_wrap, .power_link');
        return ownedAdWrap || element;
    };

    const removeArticleAds = (roots = [document]) => {
        const targets = new Set();
        collectArticleAdCandidates(roots).forEach((candidate) => {
            const target = resolveArticleAdRemovalTarget(candidate);
            if (target instanceof Element && target.isConnected) targets.add(target);
        });
        targets.forEach((target) => target.remove());
        return targets.size;
    };

    let cleanupRafId = 0;
    let pendingCleanupRoots = [];
    const scheduleArticleAdCleanup = (reason = 'scheduled', roots = [document]) => {
        pendingCleanupRoots.push(...(Array.isArray(roots) ? roots : [roots]));
        if (cleanupRafId) return;
        cleanupRafId = window.requestAnimationFrame(() => {
            cleanupRafId = 0;
            const rootsForPass = pendingCleanupRoots.splice(0).filter(Boolean);
            removeArticleAds(rootsForPass.length > 0 ? rootsForPass : [document]);
        });
    };

    const bindArticleAdCleanup = () => {
        scheduleArticleAdCleanup('initial');
        [120, 420, 1100, 2500, 5000].forEach((delay) => {
            window.setTimeout(() => scheduleArticleAdCleanup(`delayed:${delay}`), delay);
        });

        const runtimeCoordinator = window.__dcufRuntimeCoordinator;
        if (!runtimeCoordinator || typeof runtimeCoordinator.subscribeMutations !== 'function') return;
        runtimeCoordinator.subscribeMutations('runtime-article-ad-cleanup', (payload) => {
            const relevantNodes = payload.collectMatches(ARTICLE_AD_SELECTOR, { includeRoots: true });
            if (relevantNodes.length > 0) {
                scheduleArticleAdCleanup('mutation-bus', relevantNodes);
            }
        });
    };

    injectStyle();
    bindArticleAdCleanup();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            injectStyle();
            scheduleArticleAdCleanup('domcontentloaded');
        }, { once: true });
    }
    window.addEventListener('load', () => {
        injectStyle();
        scheduleArticleAdCleanup('window-load');
    }, { once: true });
})();

(() => {
    if ((window.location.pathname || '').indexOf('/board/lists') !== -1) return;

    const setImportant = (element, property, value) => {
        if (!element) return;
        if (element.style.getPropertyValue(property) === value && element.style.getPropertyPriority(property) === 'important') return;
        element.style.setProperty(property, value, 'important');
    };
    const setImportantIfChanged = (element, property, value) => {
        setImportant(element, property, value);
    };
    const removeStyleIfPresent = (element, property) => {
        if (!element) return;
        if (!element.style.getPropertyValue(property) && !element.style.getPropertyPriority(property)) return;
        element.style.removeProperty(property);
    };
    const restoreInlineStyleIfStored = (element, property, storageKey) => {
        if (!element || !storageKey) return;
        const hasStoredValue = Object.prototype.hasOwnProperty.call(element.dataset, storageKey)
            || Object.prototype.hasOwnProperty.call(element.dataset, `${storageKey}Priority`);
        if (!hasStoredValue && !element.style.getPropertyValue(property) && !element.style.getPropertyPriority(property)) return;
        restoreInlineStyle(element, property, storageKey);
    };
    const setTextFillIfChanged = (element, value) => {
        setImportantIfChanged(element, '-webkit-text-fill-color', value);
    };
    const rememberInlineStyle = (element, property, storageKey) => {
        if (!element || !storageKey) return;
        if (Object.prototype.hasOwnProperty.call(element.dataset, storageKey)) return;
        element.dataset[storageKey] = element.style.getPropertyValue(property) || '';
        element.dataset[`${storageKey}Priority`] = element.style.getPropertyPriority(property) || '';
    };
    const restoreInlineStyle = (element, property, storageKey) => {
        if (!element || !storageKey) return;
        if (!Object.prototype.hasOwnProperty.call(element.dataset, storageKey)) {
            element.style.removeProperty(property);
            return;
        }
        const value = element.dataset[storageKey] || '';
        const priority = element.dataset[`${storageKey}Priority`] || '';
        if (value) {
            element.style.setProperty(property, value, priority);
        } else {
            element.style.removeProperty(property);
        }
        delete element.dataset[storageKey];
        delete element.dataset[`${storageKey}Priority`];
    };

    const NORMALIZE_DELAYS = [120, 420, 1100, 2400];
    const COMMENT_TYPOGRAPHY_SCOPE_SELECTOR = '.view_content_wrap .comment_box, #focus_cmt';
    const ARTICLE_TYPOGRAPHY_SCOPE_SELECTOR = '.view_content_wrap .gallview_contents, .view_content_wrap .write_div, .view_content_wrap .writing_view_box';
    const COMMENT_SCOPE_SELECTOR = '.comment_box';
    const COMMENT_STABLE_ROOT_SELECTOR = ['.comment_box', '#focus_cmt', 'div[id^="comment_wrap_"]', '.view_comment.image_comment'].join(', ');
    const ARTICLE_SCOPE_SELECTOR = '.gallview_contents, .write_div, .writing_view_box';
    const ARTICLE_STABLE_ROOT_SELECTOR = '.view_content_wrap, .writing_view_box, .gallview_contents, .write_div';
    // 본문은 글마다 font/span/div/inline style/data-scaled-by-filter 조합이 달라서
    // 좁은 selector로는 검은 글씨가 남는 경우가 있습니다. article scope 안에서만 넓게 잡습니다.
    const ARTICLE_DARK_TEXT_SELECTOR = [
        '.view_content_wrap .gallview_contents',
        '.view_content_wrap .gallview_contents *',
        '.view_content_wrap .gallview_contents [style]',
        '.view_content_wrap .gallview_contents [data-scaled-by-filter]',
        '.view_content_wrap .gallview_contents [data-scaled-by-filter] *',
        '.view_content_wrap .gallview_contents p',
        '.view_content_wrap .gallview_contents div',
        '.view_content_wrap .gallview_contents span',
        '.view_content_wrap .gallview_contents font',
        '.view_content_wrap .gallview_contents b',
        '.view_content_wrap .gallview_contents strong',
        '.view_content_wrap .gallview_contents em',
        '.view_content_wrap .gallview_contents i',
        '.view_content_wrap .gallview_contents a',
        '.view_content_wrap .gallview_contents li',
        '.view_content_wrap .gallview_contents td',
        '.view_content_wrap .gallview_contents th',
        '.view_content_wrap .gallview_contents pre',
        '.view_content_wrap .gallview_contents blockquote',
        '.view_content_wrap .writing_view_box',
        '.view_content_wrap .write_div',
        '.view_content_wrap .write_div p',
        '.view_content_wrap .write_div div',
        '.view_content_wrap .write_div span',
        '.view_content_wrap .write_div font',
        '.view_content_wrap .write_div b',
        '.view_content_wrap .write_div strong',
        '.view_content_wrap .write_div em',
        '.view_content_wrap .write_div i',
        '.view_content_wrap .write_div a',
        '.view_content_wrap .write_div li',
        '.view_content_wrap .write_div td',
        '.view_content_wrap .write_div th',
        '.view_content_wrap .write_div pre',
        '.view_content_wrap .write_div blockquote',
        '.view_content_wrap .write_div [data-scaled-by-filter]',
        '.view_content_wrap .write_div [data-scaled-by-filter] p',
        '.view_content_wrap .write_div [data-scaled-by-filter] div',
        '.view_content_wrap .write_div [data-scaled-by-filter] span',
        '.gallview_contents',
        '.gallview_contents *',
        '.gallview_contents [style]',
        '.gallview_contents [data-scaled-by-filter]',
        '.gallview_contents [data-scaled-by-filter] *',
        '.write_div',
        '.write_div *',
        '.write_div [style]',
        '.write_div [data-scaled-by-filter]',
        '.write_div [data-scaled-by-filter] *',
    ].join(', ');
    const IMAGE_COMMENT_TEXT_SELECTOR = [
        '.comment_box.img_comment_box .gall_writer',
        '.comment_box.img_comment_box .nickname',
        '.comment_box.img_comment_box .nickname em',
        '.comment_box.img_comment_box .usertxt',
    ].join(', ');
    const IMAGE_COMMENT_META_SELECTOR = [
        '.comment_box.img_comment_box .ip',
        '.comment_box.img_comment_box .date_time',
        '.comment_box.img_comment_box .txt_del',
        '.comment_box.img_comment_box .reply_num',
    ].join(', ');

    const getPreferredCommentFontSize = () => {
        const viewportWidth = Math.max(window.innerWidth || 0, document.documentElement?.clientWidth || 0, 0);
        if (!viewportWidth) return '18px';
        const calculated = Math.round(viewportWidth * 0.042);
        return `${Math.max(16, Math.min(19, calculated))}px`;
    };
    const COMMENT_NORMALIZE_TARGET_SELECTOR = [
        '.usertxt',
        '.nickname',
        '.nickname .ip',
        '.cmt_txtbox',
        '.reply_box',
        '.reply_list > li',
        '.writer_nikcon',
        '.writer_nikcon img',
        'img.gallercon'
    ].join(', ');
    const ARTICLE_DARK_TARGET_SELECTOR = [
        '[style]',
        '[data-scaled-by-filter]',
        '[data-scaled-by-filter] *',
        'p',
        'div',
        'span',
        'font',
        'b',
        'strong',
        'em',
        'i',
        'a',
        'li',
        'td',
        'th',
        'pre',
        'blockquote'
    ].join(', ');
    const IMAGE_COMMENT_DARK_TEXT_TARGET_SELECTOR = '.gall_writer, .nickname, .nickname em, .usertxt';
    const IMAGE_COMMENT_DARK_META_TARGET_SELECTOR = '.ip, .date_time, .txt_del, .reply_num';
    const pendingNormalizeRoots = new Set();
    const pendingNormalizeTargets = new Set();
    const pendingDarkTextTargets = new Set();
    const pendingImageCommentDarkTextTargets = new Set();
    const pendingImageCommentDarkMetaTargets = new Set();
    let forceNormalizeFullPass = false;
    const addUniqueElement = (targetSet, element) => {
        if (!(element instanceof Element)) return;
        targetSet.add(element);
    };
    const takeConnectedElements = (targetSet) => {
        const items = Array.from(targetSet).filter((element) => element instanceof Element && element.isConnected);
        targetSet.clear();
        return items;
    };
    const collectScopedRoots = (roots, selector) => {
        const seen = new Set();
        const results = [];
        const push = (element) => {
            if (!(element instanceof Element) || seen.has(element)) return;
            seen.add(element);
            results.push(element);
        };
        if (!Array.isArray(roots) || roots.length === 0) {
            document.querySelectorAll(selector).forEach(push);
            return results;
        }
        roots.forEach((root) => {
            if (!(root instanceof Element)) return;
            if (root.matches?.(selector)) push(root);
            root.querySelectorAll?.(selector).forEach(push);
        });
        return results;
    };
    const collectMatchesWithinRoots = (roots, selector) => {
        const seen = new Set();
        const results = [];
        const push = (element) => {
            if (!(element instanceof Element) || seen.has(element)) return;
            seen.add(element);
            results.push(element);
        };
        roots.forEach((root) => {
            if (!(root instanceof Element)) return;
            if (root.matches?.(selector)) push(root);
            root.querySelectorAll?.(selector).forEach(push);
        });
        return results;
    };
    const addMatchesFromElement = (targetSet, element, selector) => {
        if (!(element instanceof Element)) return;
        if (element.matches?.(selector)) addUniqueElement(targetSet, element);
        element.querySelectorAll?.(selector).forEach((match) => addUniqueElement(targetSet, match));
    };
    const addScopeMatchesFromElement = (targetSet, element, scopeSelector, targetSelector) => {
        if (!(element instanceof Element)) return;
        const nearestScope = element.closest?.(scopeSelector);
        if (nearestScope instanceof Element) {
            addMatchesFromElement(targetSet, element, targetSelector);
        }
        if (element.matches?.(scopeSelector)) {
            addMatchesFromElement(targetSet, element, targetSelector);
        }
        element.querySelectorAll?.(scopeSelector).forEach((scope) => {
            addMatchesFromElement(targetSet, scope, targetSelector);
        });
    };
    const findStableNormalizeRoot = (element) => {
        if (!(element instanceof Element)) return null;
        if (element.matches?.(COMMENT_STABLE_ROOT_SELECTOR) || element.matches?.(ARTICLE_STABLE_ROOT_SELECTOR)) return element;
        return element.closest(`${COMMENT_STABLE_ROOT_SELECTOR}, ${ARTICLE_STABLE_ROOT_SELECTOR}`);
    };
    const queueNormalizeWork = (elements = null, { forceFullPass = false } = {}) => {
        if (forceFullPass) forceNormalizeFullPass = true;
        if (!elements || typeof elements[Symbol.iterator] !== 'function') {
            forceNormalizeFullPass = true;
            return;
        }
        Array.from(elements).forEach((element) => {
            if (!(element instanceof Element)) return;
            const nearestRoot = findStableNormalizeRoot(element);
            if (nearestRoot instanceof Element) {
                pendingNormalizeRoots.add(nearestRoot);
            } else {
                element.querySelectorAll?.(`${COMMENT_STABLE_ROOT_SELECTOR}, ${ARTICLE_STABLE_ROOT_SELECTOR}`).forEach((root) => {
                    if (root instanceof Element) pendingNormalizeRoots.add(root);
                });
            }
            addScopeMatchesFromElement(pendingNormalizeTargets, element, COMMENT_SCOPE_SELECTOR, COMMENT_NORMALIZE_TARGET_SELECTOR);
            addScopeMatchesFromElement(pendingDarkTextTargets, element, ARTICLE_SCOPE_SELECTOR, ARTICLE_DARK_TARGET_SELECTOR);
            addScopeMatchesFromElement(pendingImageCommentDarkTextTargets, element, '.comment_box.img_comment_box', IMAGE_COMMENT_DARK_TEXT_TARGET_SELECTOR);
            addScopeMatchesFromElement(pendingImageCommentDarkMetaTargets, element, '.comment_box.img_comment_box', IMAGE_COMMENT_DARK_META_TARGET_SELECTOR);
        });
    };
    const resolveViewScope = (roots = null) => {
        if (Array.isArray(roots) && roots.length > 0) {
            for (const root of roots) {
                if (!(root instanceof Element)) continue;
                if (root.matches?.('.view_content_wrap')) return root;
                const closestScope = root.closest('.view_content_wrap');
                if (closestScope instanceof HTMLElement) return closestScope;
            }
        }
        return document.querySelector('.view_content_wrap');
    };

    const isRelevantNormalizeNode = (node) => {
        if (!node) return false;
        if (node.nodeType === Node.TEXT_NODE) {
            return Boolean(node.parentElement?.closest(`${COMMENT_TYPOGRAPHY_SCOPE_SELECTOR}, ${ARTICLE_TYPOGRAPHY_SCOPE_SELECTOR}`));
        }
        if (!(node instanceof Element)) return false;
        return Boolean(
            node.closest(`${COMMENT_TYPOGRAPHY_SCOPE_SELECTOR}, ${ARTICLE_TYPOGRAPHY_SCOPE_SELECTOR}`)
            || node.querySelector?.(COMMENT_TYPOGRAPHY_SCOPE_SELECTOR)
            || node.querySelector?.(ARTICLE_TYPOGRAPHY_SCOPE_SELECTOR)
        );
    };

    const applyNormalizeTarget = (element, preferredCommentFontSize) => {
        if (!(element instanceof HTMLElement)) return;
        if (element.matches('.nickname .ip')) {
            setImportantIfChanged(element, 'font-size', '12px');
            return;
        }
        if (element.matches('.usertxt')) {
            setImportantIfChanged(element, 'font-size', preferredCommentFontSize);
            setImportantIfChanged(element, 'line-height', '1.58');
            setImportantIfChanged(element, '-webkit-text-size-adjust', '100%');
            setImportantIfChanged(element, 'text-size-adjust', '100%');
            return;
        }
        if (element.matches('.nickname')) {
            setImportantIfChanged(element, 'font-size', '13px');
            return;
        }
        if (element.matches('.cmt_txtbox, .reply_box, .reply_list > li')) {
            setImportantIfChanged(element, '-webkit-text-size-adjust', '100%');
            setImportantIfChanged(element, 'text-size-adjust', '100%');
            return;
        }
        if (element.matches('.writer_nikcon')) {
            removeStyleIfPresent(element, 'font-size');
            return;
        }
        if (element.matches('.writer_nikcon img, img.gallercon')) {
            setImportantIfChanged(element, 'width', 'auto');
            setImportantIfChanged(element, 'height', '13px');
            setImportantIfChanged(element, 'max-width', 'none');
        }
    };
    const normalizeCommentTypographyForRoots = (roots = null, { targets = null, forceFullScan = false } = {}) => {
        const preferredCommentFontSize = getPreferredCommentFontSize();
        const scopedTargets = Array.isArray(targets)
            ? targets.filter((element) => element instanceof HTMLElement && element.closest(COMMENT_SCOPE_SELECTOR))
            : [];
        if (!forceFullScan && scopedTargets.length > 0) {
            scopedTargets.forEach((element) => applyNormalizeTarget(element, preferredCommentFontSize));
            return;
        }

        const commentScopes = collectScopedRoots(Array.isArray(roots) ? roots : null, COMMENT_SCOPE_SELECTOR);
        if (commentScopes.length === 0 && !document.querySelector('#focus_cmt > .cmt_write_box')) return;

        collectMatchesWithinRoots(commentScopes, COMMENT_NORMALIZE_TARGET_SELECTOR).forEach((element) => {
            applyNormalizeTarget(element, preferredCommentFontSize);
        });
    };

    const applyArticleDarkTarget = (element, darkMode, articleDarkProps) => {
        if (!(element instanceof HTMLElement)) return;
        if (darkMode) {
            articleDarkProps.forEach(([property, value, storageKey]) => {
                rememberInlineStyle(element, property, storageKey);
                setImportantIfChanged(element, property, value);
            });
            return;
        }
        articleDarkProps.forEach(([property, _value, storageKey]) => {
            restoreInlineStyleIfStored(element, property, storageKey);
        });
    };
    const applyImageCommentDarkTarget = (element, darkMode, colorValue) => {
        if (!(element instanceof HTMLElement)) return;
        if (darkMode) {
            rememberInlineStyle(element, 'color', 'dcufOrigColor');
            rememberInlineStyle(element, '-webkit-text-fill-color', 'dcufOrigTextFill');
            setImportantIfChanged(element, 'color', colorValue);
            setTextFillIfChanged(element, colorValue);
            return;
        }
        restoreInlineStyleIfStored(element, 'color', 'dcufOrigColor');
        restoreInlineStyleIfStored(element, '-webkit-text-fill-color', 'dcufOrigTextFill');
    };
    const syncArticleDarkTextForRoots = (roots = null, {
        articleTargets = null,
        imageCommentTextTargets = null,
        imageCommentMetaTargets = null,
        forceFullScan = false
    } = {}) => {
        const darkMode = document.body?.classList.contains('dc-filter-dark-mode');
        const scopedRoots = Array.isArray(roots) ? roots : null;
        const viewScope = resolveViewScope(scopedRoots);
        const resolvedViewFg = (viewScope ? getComputedStyle(viewScope).getPropertyValue('--dcuf-view-fg') : '').trim() || '#edf3ff';
        const resolvedImageCommentFg = '#dbe6f5';
        const resolvedImageCommentMeta = '#9fb0c8';
        // 본문은 color만으로 안 끝나는 케이스가 있습니다.
        // 인라인 text-fill/opacity/filter/blend/stroke까지 같이 정리해야 야간모드가 안정적으로 먹습니다.
        const articleDarkProps = [
            ['color', resolvedViewFg, 'dcufOrigColor'],
            ['-webkit-text-fill-color', resolvedViewFg, 'dcufOrigTextFill'],
            ['opacity', '1', 'dcufOrigOpacity'],
            ['filter', 'none', 'dcufOrigFilter'],
            ['mix-blend-mode', 'normal', 'dcufOrigBlendMode'],
            ['text-shadow', 'none', 'dcufOrigTextShadow'],
            ['-webkit-text-stroke', '0px transparent', 'dcufOrigTextStroke'],
        ];

        const scopedArticleTargets = Array.isArray(articleTargets)
            ? articleTargets.filter((element) => element instanceof HTMLElement && element.closest(ARTICLE_SCOPE_SELECTOR))
            : [];
        if (!forceFullScan && scopedArticleTargets.length > 0) {
            scopedArticleTargets.forEach((element) => applyArticleDarkTarget(element, darkMode, articleDarkProps));
        } else {
            const articleScopes = collectScopedRoots(scopedRoots, ARTICLE_SCOPE_SELECTOR);
            collectMatchesWithinRoots(articleScopes, ARTICLE_DARK_TARGET_SELECTOR).forEach((element) => {
                applyArticleDarkTarget(element, darkMode, articleDarkProps);
            });
        }

        const scopedImageCommentTextTargets = Array.isArray(imageCommentTextTargets)
            ? imageCommentTextTargets.filter((element) => element instanceof HTMLElement && element.closest('.comment_box.img_comment_box'))
            : [];
        if (!forceFullScan && scopedImageCommentTextTargets.length > 0) {
            scopedImageCommentTextTargets.forEach((element) => applyImageCommentDarkTarget(element, darkMode, resolvedImageCommentFg));
        } else {
            const imageCommentScopes = collectScopedRoots(scopedRoots, '.comment_box.img_comment_box');
            collectMatchesWithinRoots(imageCommentScopes, IMAGE_COMMENT_DARK_TEXT_TARGET_SELECTOR).forEach((element) => {
                applyImageCommentDarkTarget(element, darkMode, resolvedImageCommentFg);
            });
        }

        const scopedImageCommentMetaTargets = Array.isArray(imageCommentMetaTargets)
            ? imageCommentMetaTargets.filter((element) => element instanceof HTMLElement && element.closest('.comment_box.img_comment_box'))
            : [];
        if (!forceFullScan && scopedImageCommentMetaTargets.length > 0) {
            scopedImageCommentMetaTargets.forEach((element) => applyImageCommentDarkTarget(element, darkMode, resolvedImageCommentMeta));
            return;
        }

        const imageCommentScopes = collectScopedRoots(scopedRoots, '.comment_box.img_comment_box');
        collectMatchesWithinRoots(imageCommentScopes, IMAGE_COMMENT_DARK_META_TARGET_SELECTOR).forEach((element) => {
            applyImageCommentDarkTarget(element, darkMode, resolvedImageCommentMeta);
        });
    };
    const normalizeCommentTypography = (roots = null, options = {}) => {
        normalizeCommentTypographyForRoots(roots, options);
    };
    const syncArticleDarkText = (roots = null, options = {}) => {
        syncArticleDarkTextForRoots(roots, options);
    };

    let bindCommentResizeTargets = null;
    const COMMENT_MUTATION_SELECTOR = '.view_content_wrap, .writing_view_box, #focus_cmt, .comment_box, .img_comment, .view_comment.image_comment, div[id^="comment_wrap_"]';
    const COMMENT_RESIZE_SELECTOR = '.view_content_wrap, .writing_view_box, #focus_cmt';
    const flushPendingNormalize = ({ forceFullPass = false } = {}) => {
        const roots = takeConnectedElements(pendingNormalizeRoots);
        const normalizeTargets = takeConnectedElements(pendingNormalizeTargets);
        const articleTargets = takeConnectedElements(pendingDarkTextTargets);
        const imageCommentTextTargets = takeConnectedElements(pendingImageCommentDarkTextTargets);
        const imageCommentMetaTargets = takeConnectedElements(pendingImageCommentDarkMetaTargets);
        const hasPendingWork = roots.length > 0
            || normalizeTargets.length > 0
            || articleTargets.length > 0
            || imageCommentTextTargets.length > 0
            || imageCommentMetaTargets.length > 0;
        const useFullPass = forceFullPass || forceNormalizeFullPass || !hasPendingWork;
        forceNormalizeFullPass = false;
        normalizeCommentTypography(useFullPass ? null : roots, {
            targets: useFullPass ? null : normalizeTargets,
            forceFullScan: useFullPass
        });
        syncArticleDarkText(useFullPass ? null : roots, {
            articleTargets: useFullPass ? null : articleTargets,
            imageCommentTextTargets: useFullPass ? null : imageCommentTextTargets,
            imageCommentMetaTargets: useFullPass ? null : imageCommentMetaTargets,
            forceFullScan: useFullPass
        });
    };
    const normalizeScheduler = __dcufCreatePhaseScheduler('comment-normalize', ({ delay }) => {
        flushPendingNormalize({ forceFullPass: delay > 0 });
    }, NORMALIZE_DELAYS);

    const scheduleNormalize = ({ elements = null, forceFullPass = false } = {}) => {
        queueNormalizeWork(elements, { forceFullPass });
        normalizeScheduler.schedule();
    };

    const observeComments = () => {
        if (window.__dcufCommentTypographyMutationUnsubscribe || window.__dcufCommentTypographyObserver) return;

        const unsubscribe = __dcufSubscribeMutationBus('comment-typography', (payload) => {
            const relevantNodes = __dcufCollectMatches(payload, COMMENT_MUTATION_SELECTOR, { includeRoots: true });
            if (relevantNodes.length === 0) return;
            if (typeof bindCommentResizeTargets === 'function') {
                bindCommentResizeTargets(__dcufCollectMatches(payload, COMMENT_RESIZE_SELECTOR, { includeRoots: true }));
            }
            if (relevantNodes.some(isRelevantNormalizeNode)) {
                const bodyMutated = Array.isArray(payload.attributeTargets) && payload.attributeTargets.includes(document.body);
                scheduleNormalize({ elements: relevantNodes, forceFullPass: bodyMutated });
            }
        });
        if (typeof unsubscribe === 'function') {
            window.__dcufCommentTypographyMutationUnsubscribe = unsubscribe;
            return;
        }

        if (!document.body) return;
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'characterData' && isRelevantNormalizeNode(mutation.target)) {
                    scheduleNormalize({ elements: [mutation.target.parentElement].filter(Boolean) });
                    break;
                }

                if (mutation.type === 'attributes' && isRelevantNormalizeNode(mutation.target)) {
                    scheduleNormalize({ elements: [mutation.target], forceFullPass: mutation.target === document.body });
                    break;
                }

                if (mutation.type === 'childList') {
                    const hasRelevantNode = Array.from(mutation.addedNodes || []).some(isRelevantNormalizeNode)
                        || Array.from(mutation.removedNodes || []).some(isRelevantNormalizeNode)
                        || isRelevantNormalizeNode(mutation.target);
                    if (hasRelevantNode) {
                        scheduleNormalize({
                            elements: [mutation.target, ...Array.from(mutation.addedNodes || []), ...Array.from(mutation.removedNodes || [])]
                        });
                        break;
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true,
            attributeFilter: ['style', 'class']
        });

        window.__dcufCommentTypographyObserver = observer;
    };

    const bindMediaLoadNormalize = () => {
        if (window.__dcufCommentTypographyLoadBound) return;

        document.addEventListener('load', (event) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            if (!target.matches('img, video')) return;
            if (!target.closest('.view_content_wrap, #focus_cmt')) return;
            scheduleNormalize({ elements: [target] });
        }, true);

        document.addEventListener('error', (event) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            if (!target.matches('img, video')) return;
            if (!target.closest('.view_content_wrap, #focus_cmt')) return;
            scheduleNormalize({ elements: [target] });
        }, true);

        window.__dcufCommentTypographyLoadBound = true;
    };

    const observeLayoutChanges = () => {
        if (!window.ResizeObserver || window.__dcufCommentTypographyResizeObserver) return;

        const observer = new ResizeObserver((entries) => {
            scheduleNormalize({ elements: entries.map((entry) => entry?.target).filter(Boolean) });
        });

        bindCommentResizeTargets = (elements = null) => {
            const candidates = elements && typeof elements[Symbol.iterator] === 'function'
                ? Array.from(elements)
                : Array.from(document.querySelectorAll(COMMENT_RESIZE_SELECTOR));
            candidates.forEach((element) => {
                if (!(element instanceof Element)) return;
                if (element.dataset.dcufCommentResizeObserved === '1') return;
                observer.observe(element);
                element.dataset.dcufCommentResizeObserved = '1';
            });
        };

        bindCommentResizeTargets();

        window.__dcufCommentTypographyResizeObserver = observer;
    };

    window.__dcufScheduleCommentNormalize = scheduleNormalize;
    window.__dcufSyncArticleDarkText = syncArticleDarkText;

    scheduleNormalize();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            scheduleNormalize();
            observeComments();
            bindMediaLoadNormalize();
            observeLayoutChanges();
        }, { once: true });
    } else {
        observeComments();
        bindMediaLoadNormalize();
        observeLayoutChanges();
    }

    window.addEventListener('load', () => scheduleNormalize({ forceFullPass: true }), { once: true });
    window.addEventListener('resize', () => {
        const resizeTargets = Array.from(document.querySelectorAll(`${COMMENT_RESIZE_SELECTOR}, .view_comment.image_comment`));
        if (resizeTargets.length === 0) {
            scheduleNormalize({ forceFullPass: true });
            return;
        }
        scheduleNormalize({ elements: resizeTargets });
    });
})();

(() => {
    if ((window.location.pathname || '').indexOf('/board/lists') !== -1) {
        window.__dcufAwaitInitialCommentStabilization = () => Promise.resolve({ reason: 'list-page' });
        return;
    }
    const COMMENT_LIST_SELECTOR = 'div[id^="comment_wrap_"] .comment_box .cmt_list';
    const PLACEHOLDER_ATTR = 'data-dcuf-parent-placeholder';
    const PLACEHOLDER_CLASS = 'dcuf-comment-placeholder';
    const COMMENT_BLOCKED_ATTR = 'data-dcuf-comment-blocked';
    const COMMENT_SHELL_BLOCKED_ATTR = 'data-dcuf-comment-shell-blocked';
    const COMMENT_SHELL_BLOCKED_CLASS = 'dcuf-comment-shell-blocked';
    const INITIAL_COMMENT_STABILIZE_SOURCES = new Set(['dom-ready-initial', 'ready-initial']);
    const initialCommentStabilization = (() => {
        let resolved = false;
        let resolvePromise;
        let timeoutId = 0;
        const promise = new Promise((resolve) => {
            resolvePromise = resolve;
        });
        const resolve = (reason) => {
            if (resolved) return;
            resolved = true;
            if (timeoutId) {
                window.clearTimeout(timeoutId);
                timeoutId = 0;
            }
            resolvePromise({ reason, ts: Date.now() });
        };
        const startTimeout = () => {
            if (resolved || timeoutId) return;
            timeoutId = window.setTimeout(() => resolve('timeout'), 500);
        };

        window.__dcufAwaitInitialCommentStabilization = () => {
            startTimeout();
            return promise;
        };
        return { resolve, startTimeout };
    })();

    const isReplyOnlyCommentWrapper = (li) => {
        if (!(li instanceof HTMLElement)) return false;
        return Boolean(li.querySelector(':scope > div.reply.show'))
            && !li.querySelector(':scope > div.cmt_info');
    };

    const getParentNoFromCommentLi = (li) => {
        if (!(li instanceof HTMLElement)) return '';

        const info = li.querySelector(':scope > div.cmt_info[data-no]');
        if (info) {
            const no = info.getAttribute('data-no');
            if (no) return no;
        }

        if (isReplyOnlyCommentWrapper(li)) return '';

        const idMatch = (li.id || '').match(/^comment_li_(\d+)$/);
        return idMatch && idMatch[1] !== '0' ? idMatch[1] : '';
    };

    const getParentNoFromReplyBlock = (replyShow) => {
        if (!(replyShow instanceof HTMLElement)) return '';

        const replyList = replyShow.querySelector(':scope > .reply_box > .reply_list[p-no], :scope > .reply_box > ul.reply_list[p-no], .reply_list[p-no]');
        if (replyList) {
            const pNo = replyList.getAttribute('p-no');
            if (pNo) return pNo;
        }

        const wrapperLi = replyShow.closest('li');
        const liMatch = (wrapperLi?.id || '').match(/^reply_li_(\d+)$/);
        return liMatch ? liMatch[1] : '';
    };

    const hasVisibleReplyItems = (replyShow) => {
        if (!(replyShow instanceof HTMLElement)) return false;
        return Array.from(replyShow.querySelectorAll(':scope > .reply_box > .reply_list > li, :scope > .reply_list > li, .reply_list > li'))
            .some((replyLi) => replyLi instanceof HTMLElement && replyLi.style.display !== 'none');
    };

    const clearFilteredParentPlaceholder = (parentLi) => {
        if (!(parentLi instanceof HTMLElement)) return;

        const placeholder = parentLi.querySelector(`:scope > .${PLACEHOLDER_CLASS}`);
        if (placeholder instanceof HTMLElement) placeholder.remove();
        parentLi.removeAttribute(PLACEHOLDER_ATTR);
        parentLi.removeAttribute('data-dcuf-parent-filtered');
        parentLi.classList.remove('dcuf-parent-comment-filtered');
    };

    const isCommentListItem = (element) => {
        return element instanceof HTMLElement && !!element.closest(COMMENT_LIST_SELECTOR);
    };

    const getAssociatedVisibleReplyItems = (parentLi) => {
        if (!(parentLi instanceof HTMLElement)) return [];
        const parentNo = getParentNoFromCommentLi(parentLi);
        if (!parentNo) return [];

        const replyItems = [];
        const addVisibleReplies = (replyShow) => {
            if (!(replyShow instanceof HTMLElement)) return;
            replyShow.querySelectorAll(':scope > .reply_box > .reply_list > li, :scope > .reply_list > li, .reply_list > li').forEach((replyLi) => {
                if (replyLi instanceof HTMLElement && replyLi.style.display !== 'none') {
                    replyItems.push(replyLi);
                }
            });
        };

        addVisibleReplies(parentLi.querySelector(':scope > div.reply.show'));

        const list = parentLi.parentElement;
        if (list instanceof HTMLElement) {
            list.querySelectorAll(':scope > li > div.reply.show').forEach((replyShow) => {
                if (!(replyShow instanceof HTMLElement)) return;
                const wrapperLi = replyShow.closest('li');
                if (!(wrapperLi instanceof HTMLElement) || wrapperLi === parentLi) return;
                if (getParentNoFromCommentLi(wrapperLi)) return;
                if (wrapperLi.style.display === 'none') return;
                if (getParentNoFromReplyBlock(replyShow) !== parentNo) return;
                addVisibleReplies(replyShow);
            });
        }

        return replyItems;
    };

    const clearBlockedCommentShell = (element) => {
        if (!(element instanceof HTMLElement)) return;
        element.removeAttribute(COMMENT_SHELL_BLOCKED_ATTR);
        element.classList.remove(COMMENT_SHELL_BLOCKED_CLASS);
    };

    const applyBlockedCommentShell = (parentLi) => {
        if (!(parentLi instanceof HTMLElement)) return;
        clearFilteredParentPlaceholder(parentLi);
        parentLi.setAttribute(COMMENT_SHELL_BLOCKED_ATTR, '1');
        parentLi.classList.add(COMMENT_SHELL_BLOCKED_CLASS);
        if (parentLi.style.display !== '') parentLi.style.display = '';
    };

    const shouldKeepBlockedParentCommentShell = (parentLi) => {
        return isCommentListItem(parentLi)
            && Boolean(getParentNoFromCommentLi(parentLi))
            && getAssociatedVisibleReplyItems(parentLi).length > 0;
    };

    const installBlockedCommentShellFilterHook = () => {
        const filterModule = window.__dcufFilterModule;
        if (!filterModule || typeof filterModule.setElementVisibility !== 'function') return false;
        if (filterModule.__dcufCommentShellBlockHooked) return true;

        const originalSetElementVisibility = filterModule.setElementVisibility.bind(filterModule);
        filterModule.setElementVisibility = (element, shouldHide) => {
            if (!isCommentListItem(element)) {
                originalSetElementVisibility(element, shouldHide);
                return;
            }

            if (shouldHide) {
                element.setAttribute(COMMENT_BLOCKED_ATTR, '1');
                if (shouldKeepBlockedParentCommentShell(element)) {
                    applyBlockedCommentShell(element);
                    return;
                }
            } else {
                element.removeAttribute(COMMENT_BLOCKED_ATTR);
                clearBlockedCommentShell(element);
            }

            originalSetElementVisibility(element, shouldHide);
        };
        filterModule.__dcufCommentShellBlockHooked = true;
        return true;
    };

    installBlockedCommentShellFilterHook();

    const syncFilteredParentPlaceholders = () => {
        document.querySelectorAll(`${COMMENT_LIST_SELECTOR} > li[id^="comment_li_"]`).forEach((parentLi) => {
            clearFilteredParentPlaceholder(parentLi);
        });
    };

    const syncFocusCommentCardGroups = () => {
        document.querySelectorAll('#focus_cmt div[id^="comment_wrap_"] .comment_box .cmt_list').forEach((list) => {
            if (!(list instanceof HTMLElement)) return;

            const children = Array.from(list.children).filter((li) => li instanceof HTMLElement);
            const desiredParentExtends = new Map();
            const desiredReplyLis = new Set();

            children.forEach((parentLi, index) => {
                if (!(parentLi instanceof HTMLElement)) return;
                const parentNo = getParentNoFromCommentLi(parentLi);
                if (!parentNo) return;

                const groupedReplyLis = [];
                for (let cursor = index + 1; cursor < children.length; cursor += 1) {
                    const candidateLi = children[cursor];
                    if (!(candidateLi instanceof HTMLElement)) continue;
                    if (getParentNoFromCommentLi(candidateLi)) break;
                    if (candidateLi.style.display === 'none') continue;

                    const replyShow = candidateLi.querySelector(':scope > .reply.show');
                    if (!(replyShow instanceof HTMLElement)) continue;
                    if (getParentNoFromReplyBlock(replyShow) !== parentNo) continue;
                    if (!hasVisibleReplyItems(replyShow)) continue;

                    groupedReplyLis.push(candidateLi);
                }

                if (groupedReplyLis.length === 0) return;

                const parentBottom = parentLi.offsetTop + parentLi.offsetHeight;
                const lastGroupedReplyLi = groupedReplyLis[groupedReplyLis.length - 1];
                const groupBottom = lastGroupedReplyLi.offsetTop + lastGroupedReplyLi.offsetHeight;
                const extend = Math.max(0, groupBottom - parentBottom);

                desiredParentExtends.set(parentLi, `${extend}px`);
                groupedReplyLis.forEach((replyLi) => {
                    desiredReplyLis.add(replyLi);
                });
            });

            children.forEach((li) => {
                if (!(li instanceof HTMLElement)) return;

                if (desiredParentExtends.has(li)) {
                    const nextExtend = desiredParentExtends.get(li);
                    if (li.getAttribute('data-dcuf-focus-group-parent') !== '1') {
                        li.setAttribute('data-dcuf-focus-group-parent', '1');
                    }
                    if (li.style.getPropertyValue('--dcuf-focus-group-extend') !== nextExtend) {
                        li.style.setProperty('--dcuf-focus-group-extend', nextExtend);
                    }
                } else {
                    if (li.hasAttribute('data-dcuf-focus-group-parent')) {
                        li.removeAttribute('data-dcuf-focus-group-parent');
                    }
                    if (li.style.getPropertyValue('--dcuf-focus-group-extend')) {
                        li.style.removeProperty('--dcuf-focus-group-extend');
                    }
                }

                if (desiredReplyLis.has(li)) {
                    if (li.getAttribute('data-dcuf-focus-group-reply') !== '1') {
                        li.setAttribute('data-dcuf-focus-group-reply', '1');
                    }
                } else if (li.hasAttribute('data-dcuf-focus-group-reply')) {
                    li.removeAttribute('data-dcuf-focus-group-reply');
                }
            });
        });
    };

    const getStaleFilteredParentPlaceholders = () => {
        const stale = [];
        document.querySelectorAll(`${COMMENT_LIST_SELECTOR} > li[id^="comment_li_"]`).forEach((parentLi) => {
            if (!(parentLi instanceof HTMLElement)) return;
            if (parentLi.hasAttribute(PLACEHOLDER_ATTR)
                || parentLi.hasAttribute('data-dcuf-parent-filtered')
                || parentLi.classList.contains('dcuf-parent-comment-filtered')
                || parentLi.querySelector(`:scope > .${PLACEHOLDER_CLASS}`)) {
                stale.push(parentLi);
            }
        });
        return stale;
    };

    const repairFilteredCommentPlaceholders = (meta = null) => {
        const options = meta && typeof meta === 'object' ? meta : {};
        const source = options.reason || options.source || '';
        const staleBefore = getStaleFilteredParentPlaceholders();
        if (options.onlyIfBroken && staleBefore.length === 0) {
            return {
                reason: 'skipped',
                source,
                targetCount: 0,
                staleCount: 0,
                remainingStaleCount: 0,
                brokenCount: 0
            };
        }

        const filterModule = window.__dcufFilterModule;
        let targetCount = 0;
        if (options.runFilter !== false && typeof filterModule?.runSyncRefilterPass === 'function') {
            const descriptors = filterModule.runSyncRefilterPass('comments');
            targetCount = Array.isArray(descriptors) ? descriptors.length : 0;
        }
        if (options.mergeDetachedReplies !== false) {
            mergeDetachedRepliesIntoParent();
        }
        syncFilteredParentPlaceholders();
        syncFocusCommentCardGroups();
        const staleAfter = options.onlyIfBroken ? getStaleFilteredParentPlaceholders() : [];
        return {
            reason: 'prepared',
            source,
            targetCount,
            staleCount: staleBefore.length,
            remainingStaleCount: staleAfter.length,
            brokenCount: staleBefore.length,
            remainingBrokenCount: staleAfter.length
        };
    };
    window.__dcufRepairFilteredCommentPlaceholders = repairFilteredCommentPlaceholders;
    window.__dcufPrepareInitialCommentReveal = repairFilteredCommentPlaceholders;

    const shouldSkipReplyMergeTarget = (parentLi, replyShow = null) => {
        if (!(parentLi instanceof HTMLElement)) return true;
        const isFocusCommentTarget = Boolean(parentLi.closest('#focus_cmt'));
        if (isFocusCommentTarget) return true;
        if (parentLi.style.display === 'none') {
            if (parentLi.getAttribute(COMMENT_BLOCKED_ATTR) === '1' && hasVisibleReplyItems(replyShow)) {
                applyBlockedCommentShell(parentLi);
                return false;
            }
            return true;
        }
        return false;
    };

    const mergeDetachedRepliesIntoParent = () => {
        document.querySelectorAll(COMMENT_LIST_SELECTOR).forEach((list) => {
            if (!(list instanceof HTMLElement)) return;

            const parentMap = new Map();
            list.querySelectorAll(':scope > li').forEach((li) => {
                if (!(li instanceof HTMLElement)) return;
                const no = getParentNoFromCommentLi(li);
                if (no) parentMap.set(no, li);
            });

            list.querySelectorAll(':scope > li > div.reply.show').forEach((replyShow) => {
                if (!(replyShow instanceof HTMLElement)) return;

                const wrapperLi = replyShow.closest('li');
                if (!(wrapperLi instanceof HTMLElement)) return;

                if (getParentNoFromCommentLi(wrapperLi)) return;

                const parentNo = getParentNoFromReplyBlock(replyShow);
                if (!parentNo) return;

                const parentLi = parentMap.get(parentNo) || list.querySelector(':scope > li#comment_li_' + parentNo);
                if (!(parentLi instanceof HTMLElement) || parentLi === wrapperLi) return;
                if (shouldSkipReplyMergeTarget(parentLi, replyShow)) return;

                const alreadyMerged = parentLi.querySelector(':scope > div.reply.show .reply_list[p-no="' + parentNo + '"]');
                if (alreadyMerged) {
                    wrapperLi.remove();
                    return;
                }

                parentLi.appendChild(replyShow);
                wrapperLi.remove();
            });
        });
    };
    const replyMergeScheduler = __dcufCreatePhaseScheduler('reply-merge', ({ delay, meta }) => {
        const source = meta && typeof meta === 'object' ? meta.source : '';
        const shouldMergeDetachedReplies = source !== 'window-load';
        const filterModule = window.__dcufFilterModule;

        if (shouldMergeDetachedReplies && delay === 0 && typeof filterModule?.runSyncRefilterPass === 'function') {
            // Focus-comment reply merges can recreate parent comment li nodes before the
            // delayed stabilized refilter runs. Re-apply comment blocking before merging
            // so blocked parent comments choose shell/display state before replies move.
            filterModule.runSyncRefilterPass('comments');
        }
        if (shouldMergeDetachedReplies) {
            mergeDetachedRepliesIntoParent();
        }
        syncFilteredParentPlaceholders();
        syncFocusCommentCardGroups();
        if (delay === 140) {
            if (typeof filterModule?.scheduleCommentStabilizedRefilter === 'function') {
                filterModule.scheduleCommentStabilizedRefilter('reply-merge');
            }
            if (INITIAL_COMMENT_STABILIZE_SOURCES.has(source)) {
                window.setTimeout(() => {
                    initialCommentStabilization.resolve('reply-merge-delayed');
                }, 180);
            }
        }
    }, [140]);
    const scheduleReplyMerge = (meta = null) => {
        replyMergeScheduler.schedule(meta);
    };
    const flushReplyMerge = (meta = null) => {
        replyMergeScheduler.flush(meta);
    };
    const isReplyMergeMutationNode = (node) => {
        if (!(node instanceof Element)) return false;
        const runtimeCoordinator = __dcufGetRuntimeCoordinator();
        if (typeof runtimeCoordinator?.isScriptOwnedElement === 'function' && runtimeCoordinator.isScriptOwnedElement(node)) {
            return false;
        }
        if (node.matches('#focus_cmt')) return true;
        if (node.matches('div[id^="comment_wrap_"] .comment_box .reply.show, div[id^="comment_wrap_"] .comment_box .reply_box, div[id^="comment_wrap_"] .comment_box .reply_list')) {
            return true;
        }
        if (node.matches('div[id^="comment_wrap_"] .comment_box li[id^="comment_li_"], div[id^="comment_wrap_"] .comment_box li[id^="reply_li_"]')) {
            return true;
        }
        if (typeof node.querySelector === 'function' && node.querySelector([
            '#focus_cmt',
            'div[id^="comment_wrap_"] .comment_box .reply.show',
            'div[id^="comment_wrap_"] .comment_box .reply_box',
            'div[id^="comment_wrap_"] .comment_box .reply_list',
            'div[id^="comment_wrap_"] .comment_box li[id^="comment_li_"]',
            'div[id^="comment_wrap_"] .comment_box li[id^="reply_li_"]'
        ].join(', '))) {
            return true;
        }
        return false;
    };
    const isReplyMergeAttributeTarget = (node) => {
        if (!(node instanceof Element)) return false;
        const runtimeCoordinator = __dcufGetRuntimeCoordinator();
        if (typeof runtimeCoordinator?.isScriptOwnedElement === 'function' && runtimeCoordinator.isScriptOwnedElement(node)) {
            return false;
        }
        if (node.matches('#focus_cmt')) return true;
        if (node.matches('div[id^="comment_wrap_"] .comment_box .reply.show, div[id^="comment_wrap_"] .comment_box .reply_box, div[id^="comment_wrap_"] .comment_box .reply_list')) {
            return true;
        }
        return !!node.closest('div[id^="comment_wrap_"] .comment_box .reply.show, #focus_cmt');
    };
    const shouldScheduleReplyMergeFromPayload = (payload) => {
        if (!payload || typeof payload !== 'object') return false;
        if (Array.isArray(payload.addedElements) && payload.addedElements.some(isReplyMergeMutationNode)) return true;
        if (Array.isArray(payload.removedElements) && payload.removedElements.some(isReplyMergeMutationNode)) return true;
        if (Array.isArray(payload.attributeTargets) && payload.attributeTargets.some(isReplyMergeAttributeTarget)) return true;
        return false;
    };

    const observeReplyMergeTargets = () => {
        if (window.__dcufReplyMergeMutationUnsubscribe || window.__dcufReplyMergeObserver) return;

        const unsubscribe = __dcufSubscribeMutationBus('reply-merge', (payload) => {
            if (shouldScheduleReplyMergeFromPayload(payload)) {
                scheduleReplyMerge();
            }
        });
        if (typeof unsubscribe === 'function') {
            window.__dcufReplyMergeMutationUnsubscribe = unsubscribe;
            return;
        }

        if (!document.body) return;

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
                    const hasRelevantChange = Array.from(mutation.addedNodes).some(isReplyMergeMutationNode)
                        || Array.from(mutation.removedNodes).some(isReplyMergeMutationNode);
                    if (hasRelevantChange) {
                        scheduleReplyMerge();
                        return;
                    }
                }

                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    if (isReplyMergeAttributeTarget(target)) {
                        scheduleReplyMerge();
                        return;
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'id']
        });

        window.__dcufReplyMergeObserver = observer;
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Run the initial reply merge synchronously so blocked parent comments stay
            // filtered before the comment area becomes visually stable.
            initialCommentStabilization.startTimeout();
            flushReplyMerge({ source: 'dom-ready-initial' });
            if (!document.querySelector(`${COMMENT_LIST_SELECTOR}, #focus_cmt, .view_comment.image_comment .comment_box`)) {
                initialCommentStabilization.resolve('no-comment-target-dom-ready');
            }
            observeReplyMergeTargets();
        }, { once: true });
    } else {
        initialCommentStabilization.startTimeout();
        flushReplyMerge({ source: 'ready-initial' });
        if (!document.querySelector(`${COMMENT_LIST_SELECTOR}, #focus_cmt, .view_comment.image_comment .comment_box`)) {
            initialCommentStabilization.resolve('no-comment-target-ready');
        }
        observeReplyMergeTargets();
    }

    window.addEventListener('load', () => scheduleReplyMerge({ source: 'window-load' }), { once: true });
    window.addEventListener('resize', () => scheduleReplyMerge({ source: 'resize' }));
})();

(() => {
    if ((window.location.pathname || '').indexOf('/board/lists') !== -1) return;

    const cleanupViewHeader = () => {
        document.querySelectorAll('.view_content_wrap .title_headtext').forEach((element) => {
            if ((element.textContent || '').replace(/s+/g, '') === '') {
                element.remove();
            }
        });
    };

    cleanupViewHeader();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', cleanupViewHeader, { once: true });
    }
    window.addEventListener('load', cleanupViewHeader, { once: true });
})();

(() => {
    const DRAWER_SELECTOR = '.dcuf-header-drawer';
    const DRAWER_BODY_SELECTOR = '.dcuf-header-drawer__body-inner';
    const CLOSED_LABEL = '갤러리 대문 열기';
    const OPEN_LABEL = '갤러리 대문 닫기';
    const SOURCE_ORDER = [
        { key: 'issue', selector: '.issue_contentbox' },
        { key: 'top-recom', selector: '#gall_top_recom.concept_wrap' }
    ];

    const isListPage = () => !document.querySelector('.view_content_wrap');
    const findOutsideDrawer = (selector) => Array.from(document.querySelectorAll(selector))
        .find((element) => element instanceof HTMLElement && !element.closest(DRAWER_SELECTOR));
    const isInsideDrawer = (node) => node instanceof Element && Boolean(node.closest(DRAWER_SELECTOR));

    const resolveDrawerMount = () => {
        const pageHeadActions = document.querySelector('.page_head > .fr');
        if (pageHeadActions instanceof HTMLElement) {
            return { parent: pageHeadActions, before: pageHeadActions.firstChild || null };
        }

        const pageHead = document.querySelector('.page_head');
        if (pageHead instanceof HTMLElement && pageHead.parentElement) {
            return { parent: pageHead.parentElement, before: pageHead.nextSibling };
        }

        const listArrayOption = document.querySelector('.list_array_option');
        if (listArrayOption instanceof HTMLElement && listArrayOption.parentElement) {
            return { parent: listArrayOption.parentElement, before: listArrayOption };
        }

        const listWrap = document.querySelector('.gall_listwrap, .list_wrap');
        if (listWrap instanceof HTMLElement && listWrap.parentElement) {
            return { parent: listWrap.parentElement, before: listWrap };
        }

        return null;
    };

    const setDrawerOpenState = (drawer, nextOpen) => {
        if (!(drawer instanceof HTMLElement)) return;
        const toggle = drawer.querySelector('.dcuf-header-drawer__toggle');
        const label = drawer.querySelector('.dcuf-header-drawer__toggle-label');
        const body = drawer.querySelector('.dcuf-header-drawer__body');
        const bodyInner = drawer.querySelector(DRAWER_BODY_SELECTOR);
        drawer.setAttribute('data-open', nextOpen ? '1' : '0');
        if (toggle instanceof HTMLElement) toggle.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
        if (label instanceof HTMLElement) label.textContent = nextOpen ? OPEN_LABEL : CLOSED_LABEL;
        if (body instanceof HTMLElement) {
            if (nextOpen) {
                body.style.setProperty('display', 'block', 'important');
                body.style.setProperty('visibility', 'visible', 'important');
                body.style.setProperty('opacity', '1', 'important');
                body.style.setProperty('pointer-events', 'auto', 'important');
                body.style.setProperty('overflow', 'visible', 'important');
                const measuredHeight = Math.max(
                    Math.ceil(bodyInner instanceof HTMLElement ? bodyInner.scrollHeight : 0),
                    Math.ceil(bodyInner instanceof HTMLElement ? bodyInner.getBoundingClientRect().height : 0),
                    Math.ceil(body.scrollHeight || 0),
                    1
                );
                body.style.setProperty('max-height', `${measuredHeight}px`, 'important');
            } else {
                body.style.setProperty('max-height', '0px', 'important');
                body.style.setProperty('opacity', '0', 'important');
                body.style.setProperty('visibility', 'hidden', 'important');
                body.style.setProperty('pointer-events', 'none', 'important');
                body.style.setProperty('overflow', 'hidden', 'important');
                body.style.setProperty('display', 'none', 'important');
            }
        }
    };

    const restoreDrawerSources = () => {};

    const ensureDrawerShell = (mount) => {
        if (!mount?.parent) return null;

        let drawer = document.querySelector(DRAWER_SELECTOR);
        if (!(drawer instanceof HTMLElement)) {
            drawer = document.createElement('div');
            drawer.className = 'dcuf-header-drawer';
            drawer.setAttribute('data-open', '0');
            drawer.innerHTML = `
                <button type="button" class="dcuf-header-drawer__toggle" aria-expanded="false">
                    <span class="dcuf-header-drawer__toggle-label">${CLOSED_LABEL}</span>
                </button>
                <div class="dcuf-header-drawer__body">
                    <div class="dcuf-header-drawer__body-inner"></div>
                </div>
            `;
        }

        if (drawer.parentElement !== mount.parent || drawer.nextSibling !== mount.before) {
            mount.parent.insertBefore(drawer, mount.before);
        }

        return drawer;
    };

    const syncHeaderDrawer = () => {
        const existingDrawer = document.querySelector(DRAWER_SELECTOR);
        if (!isListPage()) {
            if (existingDrawer instanceof HTMLElement) {
                restoreDrawerSources(existingDrawer);
                existingDrawer.remove();
            }
            return;
        }

        const mount = resolveDrawerMount();
        if (!mount?.parent) {
            if (existingDrawer instanceof HTMLElement) {
                restoreDrawerSources(existingDrawer);
                existingDrawer.remove();
            }
            return;
        }

        const drawer = ensureDrawerShell(mount);
        if (!(drawer instanceof HTMLElement)) return;

        const body = drawer.querySelector(DRAWER_BODY_SELECTOR);
        if (!(body instanceof HTMLElement)) return;

        SOURCE_ORDER.forEach(({ key, selector }) => {
            let panel = body.querySelector(`.dcuf-header-drawer__panel[data-source="${key}"]`);
            const source = findOutsideDrawer(selector);

            if (!(source instanceof HTMLElement)) {
                if (panel instanceof HTMLElement) panel.remove();
                return;
            }

            if (!(panel instanceof HTMLElement)) {
                panel = document.createElement('div');
                panel.className = 'dcuf-header-drawer__panel';
                panel.setAttribute('data-source', key);
            }

            const nextSignature = source.outerHTML;
            if (panel.__dcufSourceSignature !== nextSignature) {
                const clonedSource = source.cloneNode(true);
                if (clonedSource instanceof HTMLElement) {
                    if (key === 'top-recom') clonedSource.removeAttribute('id');
                    clonedSource.setAttribute('data-dcuf-drawer-source', key);
                    panel.replaceChildren(clonedSource);
                    panel.__dcufSourceSignature = nextSignature;
                }
            }
            body.appendChild(panel);
        });

        Array.from(body.querySelectorAll('.dcuf-header-drawer__panel')).forEach((panel) => {
            if (!(panel instanceof HTMLElement)) return;
            if (panel.childElementCount === 0) panel.remove();
        });

        if (body.childElementCount === 0) {
            drawer.remove();
            return;
        }

        setDrawerOpenState(drawer, drawer.getAttribute('data-open') === '1');
    };

    const headerDrawerScheduler = __dcufCreatePhaseScheduler('list-header-drawer', () => {
        syncHeaderDrawer();
    }, [120]);
    const scheduleHeaderDrawer = () => {
        headerDrawerScheduler.schedule();
    };

    const observeHeaderDrawerTargets = () => {
        if (window.__dcufHeaderDrawerMutationUnsubscribe || window.__dcufHeaderDrawerObserver) return;

        const unsubscribe = __dcufSubscribeMutationBus('header-drawer', (payload) => {
            const relevantNodes = __dcufCollectMatches(
                payload,
                '.page_head, .list_array_option, .gall_listwrap, .list_wrap, .issue_contentbox, #gall_top_recom.concept_wrap',
                { includeRoots: true }
            ).filter((node) => !isInsideDrawer(node));
            if (relevantNodes.length > 0) scheduleHeaderDrawer();
        });
        if (typeof unsubscribe === 'function') {
            window.__dcufHeaderDrawerMutationUnsubscribe = unsubscribe;
            return;
        }

        if (!document.body) return;
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (isInsideDrawer(mutation.target)) continue;
                scheduleHeaderDrawer();
                return;
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });
        window.__dcufHeaderDrawerObserver = observer;
    };

    scheduleHeaderDrawer();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            scheduleHeaderDrawer();
            observeHeaderDrawerTargets();
        }, { once: true });
    } else {
        observeHeaderDrawerTargets();
    }

    window.addEventListener('load', scheduleHeaderDrawer, { once: true });
    window.addEventListener('resize', scheduleHeaderDrawer);
    document.addEventListener('click', (event) => {
        const toggle = event.target instanceof Element
            ? event.target.closest('.dcuf-header-drawer__toggle')
            : null;
        if (!(toggle instanceof HTMLButtonElement)) return;
        const drawer = toggle.closest(DRAWER_SELECTOR);
        if (!(drawer instanceof HTMLElement)) return;
        event.preventDefault();
        event.stopPropagation();
        setDrawerOpenState(drawer, drawer.getAttribute('data-open') !== '1');
    }, true);
})();

(() => {
    if ((window.location.pathname || '').indexOf('/board/lists') !== -1) return;

    const FORM_SELECTOR = '.view_comment.image_comment .cmt_write_box';
    const VISIBLE_INPUT_SELECTOR = 'input[id^="img_cmt_name_"]';
    const CANONICAL_PREFIX = 'all_nick_name_';
    const BOUND_ATTR = 'data-dcuf-image-comment-sync-bound';
    const PROXY_ATTR = 'data-dcuf-image-nick-proxied';
    const SUBMIT_NAME_ATTR = 'data-dcuf-image-submit-name';
    const pendingForms = new Set();
    const nativeValueDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

    const resolveVisibleInput = (form, suffix) => {
        if (!(form instanceof HTMLElement) || !suffix) return null;
        const input = form.querySelector(`#img_cmt_name_${suffix}`);
        return input instanceof HTMLInputElement ? input : null;
    };

    const getCanonicalInputs = (form, suffix) => {
        if (!(form instanceof HTMLElement) || !suffix) return [];
        const seen = new Set();
        const results = [];
        const push = (candidate) => {
            if (!(candidate instanceof HTMLInputElement) || seen.has(candidate)) return;
            seen.add(candidate);
            results.push(candidate);
        };

        push(form.querySelector(`#${CANONICAL_PREFIX}${suffix}`));
        push(document.getElementById(`${CANONICAL_PREFIX}${suffix}`));
        form.querySelectorAll('input[name="gall_nick_name"]').forEach(push);
        form.querySelectorAll(`input[id$="${suffix}"][readonly]`).forEach(push);
        return results;
    };

    const ensureSubmitNameInput = (form) => {
        if (!(form instanceof HTMLElement)) return null;
        let input = form.querySelector(`input[name="name"][${SUBMIT_NAME_ATTR}="1"]`);
        if (!(input instanceof HTMLInputElement)) {
            input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'name';
            input.setAttribute(SUBMIT_NAME_ATTR, '1');
            form.appendChild(input);
        }
        return input;
    };

    const readImageCommentNickname = (formOrImageNo) => {
        const form = typeof formOrImageNo === 'string' || typeof formOrImageNo === 'number'
            ? document.getElementById(`img_cmt_write_box_${formOrImageNo}`)
            : formOrImageNo;
        if (!(form instanceof HTMLElement)) return '';

        const visibleInput = form.querySelector(VISIBLE_INPUT_SELECTOR);
        if (visibleInput instanceof HTMLInputElement && visibleInput.value) {
            return visibleInput.value;
        }

        const gallNickInput = form.querySelector('input[name="gall_nick_name"]');
        if (gallNickInput instanceof HTMLInputElement && gallNickInput.value) {
            return gallNickInput.value;
        }

        return '';
    };

    const ensureCanonicalNicknameProxy = (form, suffix, canonicalInput) => {
        if (!(form instanceof HTMLElement) || !(canonicalInput instanceof HTMLInputElement) || !nativeValueDescriptor) return;
        if (canonicalInput.getAttribute(PROXY_ATTR) === '1') return;

        Object.defineProperty(canonicalInput, 'value', {
            configurable: true,
            enumerable: nativeValueDescriptor.enumerable,
            get() {
                const visibleInput = resolveVisibleInput(form, suffix);
                if (visibleInput instanceof HTMLInputElement) {
                    return visibleInput.value || '';
                }
                return nativeValueDescriptor.get.call(this);
            },
            set(nextValue) {
                const normalizedValue = typeof nextValue === 'string' ? nextValue : `${nextValue ?? ''}`;
                nativeValueDescriptor.set.call(this, normalizedValue);
                this.setAttribute('value', normalizedValue);
            }
        });

        canonicalInput.setAttribute(PROXY_ATTR, '1');
    };

    const syncImageCommentNickname = (form) => {
        if (!(form instanceof HTMLElement)) return;

        form.querySelectorAll(VISIBLE_INPUT_SELECTOR).forEach((visibleInput) => {
            if (!(visibleInput instanceof HTMLInputElement)) return;
            const suffixMatch = (visibleInput.id || '').match(/^img_cmt_name_(\d+)$/);
            if (!suffixMatch) return;

            const nextValue = visibleInput.value || '';
            getCanonicalInputs(form, suffixMatch[1]).forEach((canonicalInput) => {
                ensureCanonicalNicknameProxy(form, suffixMatch[1], canonicalInput);
                if (!(canonicalInput instanceof HTMLInputElement)) return;
                if (nativeValueDescriptor) {
                    nativeValueDescriptor.set.call(canonicalInput, nextValue);
                } else {
                    canonicalInput.value = nextValue;
                }
                canonicalInput.defaultValue = nextValue;
                canonicalInput.setAttribute('value', nextValue);
                canonicalInput.dispatchEvent(new Event('input', { bubbles: true }));
                canonicalInput.dispatchEvent(new Event('change', { bubbles: true }));
            });

            const submitNameInput = ensureSubmitNameInput(form);
            if (submitNameInput instanceof HTMLInputElement) {
                submitNameInput.value = nextValue;
                submitNameInput.defaultValue = nextValue;
                submitNameInput.setAttribute('value', nextValue);
            }
        });
    };

    const bindImageCommentNicknameForm = (form) => {
        if (!(form instanceof HTMLElement)) return;

        form.querySelectorAll('input[name="gall_nick_name"], input[readonly][id^="gall_nick_name_"]').forEach((input) => {
            if (!(input instanceof HTMLInputElement)) return;
            input.style.setProperty('display', 'none', 'important');
            input.style.setProperty('width', '0', 'important');
            input.style.setProperty('height', '0', 'important');
            input.style.setProperty('padding', '0', 'important');
            input.style.setProperty('margin', '0', 'important');
            input.setAttribute('tabindex', '-1');
            input.setAttribute('aria-hidden', 'true');
        });

        const scheduleSync = ({ immediate = false } = {}) => {
            if (immediate) syncImageCommentNickname(form);
            requestAnimationFrame(() => syncImageCommentNickname(form));
            window.setTimeout(() => syncImageCommentNickname(form), 0);
        };

        if (form.getAttribute(BOUND_ATTR) !== '1') {
            form.setAttribute(BOUND_ATTR, '1');

            form.addEventListener('input', (event) => {
                if (event.target instanceof Element && event.target.matches(VISIBLE_INPUT_SELECTOR)) scheduleSync();
            }, true);
            form.addEventListener('change', (event) => {
                if (event.target instanceof Element && event.target.matches(VISIBLE_INPUT_SELECTOR)) scheduleSync();
            }, true);
            form.addEventListener('keydown', (event) => {
                if (!(event.target instanceof Element) || !event.target.matches(VISIBLE_INPUT_SELECTOR)) return;
                if (event.key === 'Enter') scheduleSync({ immediate: true });
            }, true);
            form.addEventListener('click', (event) => {
                const trigger = event.target instanceof Element
                    ? event.target.closest('button, input[type="submit"], input[type="button"]')
                    : null;
                if (trigger) scheduleSync({ immediate: true });
            }, true);
            form.addEventListener('submit', () => scheduleSync({ immediate: true }), true);
        }

        scheduleSync();
    };

    const collectImageCommentForms = (elements = null, { forceFullPass = false } = {}) => {
        if (forceFullPass || !elements || typeof elements[Symbol.iterator] !== 'function') {
            document.querySelectorAll(FORM_SELECTOR).forEach((form) => {
                if (form instanceof HTMLElement) pendingForms.add(form);
            });
            return;
        }

        Array.from(elements).forEach((element) => {
            if (!(element instanceof Element)) return;
            const form = element.matches(FORM_SELECTOR)
                ? element
                : element.closest(FORM_SELECTOR);
            if (form instanceof HTMLElement) pendingForms.add(form);
        });
    };

    const imageCommentNicknameScheduler = __dcufCreatePhaseScheduler('image-comment-nick-sync', () => {
        const forms = pendingForms.size > 0
            ? Array.from(pendingForms)
            : Array.from(document.querySelectorAll(FORM_SELECTOR));
        pendingForms.clear();
        forms.forEach((form) => bindImageCommentNicknameForm(form));
    }, [90]);

    const scheduleImageCommentNicknameSync = (elements = null, { forceFullPass = false } = {}) => {
        collectImageCommentForms(elements, { forceFullPass });
        imageCommentNicknameScheduler.schedule();
    };

    const observeImageCommentNicknameTargets = () => {
        if (window.__dcufImageCommentNickMutationUnsubscribe || window.__dcufImageCommentNickObserver) return;

        const unsubscribe = __dcufSubscribeMutationBus('image-comment-nick-sync', (payload) => {
            const relevantNodes = __dcufCollectMatches(
                payload,
                '.view_comment.image_comment, .view_comment.image_comment .cmt_write_box, .view_comment.image_comment input[id^="img_cmt_name_"], .view_comment.image_comment input[id^="all_nick_name_"]',
                { includeRoots: true }
            );
            if (relevantNodes.length > 0) {
                scheduleImageCommentNicknameSync(relevantNodes);
            }
        });
        if (typeof unsubscribe === 'function') {
            window.__dcufImageCommentNickMutationUnsubscribe = unsubscribe;
            return;
        }

        if (!document.body) return;
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                scheduleImageCommentNicknameSync([mutation.target, ...Array.from(mutation.addedNodes || [])]);
            });
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['value', 'style', 'class']
        });
        window.__dcufImageCommentNickObserver = observer;
    };

    const hookImageNicknameHelpers = () => {
        const helperNames = ['use_gall_nick_name_img', 'show_gall_nick_use_btn_img'];
        helperNames.forEach((helperName) => {
            const original = window[helperName];
            if (typeof original !== 'function' || original.__dcufWrapped === true) return;
            const wrapped = function (...args) {
                const result = original.apply(this, args);
                scheduleImageCommentNicknameSync(null, { forceFullPass: true });
                return result;
            };
            wrapped.__dcufWrapped = true;
            window[helperName] = wrapped;
        });
    };

    const patchImageCommentRequestBody = (body, requestUrl) => {
        if (typeof requestUrl !== 'string' || requestUrl.indexOf('image_comment_submit') === -1 || !body) {
            return body;
        }

        const applyNickname = (paramsLike, imageNo, setValue) => {
            const nickname = readImageCommentNickname(imageNo);
            if (!nickname) return;
            setValue(paramsLike, 'name', nickname);
            setValue(paramsLike, 'gall_nick_name', nickname);
            setValue(paramsLike, 'use_gall_nick', 'N');
        };

        if (body instanceof FormData) {
            const imageNo = body.get('image_no');
            applyNickname(body, imageNo, (target, key, value) => target.set(key, value));
            return body;
        }

        if (body instanceof URLSearchParams) {
            const imageNo = body.get('image_no');
            applyNickname(body, imageNo, (target, key, value) => target.set(key, value));
            return body;
        }

        if (typeof body === 'string') {
            const params = new URLSearchParams(body);
            const imageNo = params.get('image_no');
            applyNickname(params, imageNo, (target, key, value) => target.set(key, value));
            return params.toString();
        }

        return body;
    };

    const installImageCommentRequestPatch = () => {
        if (window.__dcufImageCommentRequestPatched) return;
        window.__dcufImageCommentRequestPatched = true;

        const nativeOpen = XMLHttpRequest.prototype.open;
        const nativeSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (method, url, ...rest) {
            this.__dcufImageCommentUrl = typeof url === 'string' ? url : `${url ?? ''}`;
            return nativeOpen.call(this, method, url, ...rest);
        };

        XMLHttpRequest.prototype.send = function (body) {
            const patchedBody = patchImageCommentRequestBody(body, this.__dcufImageCommentUrl || '');
            return nativeSend.call(this, patchedBody);
        };

        if (typeof window.fetch === 'function') {
            const nativeFetch = window.fetch.bind(window);
            window.fetch = function (resource, init) {
                const requestUrl = typeof resource === 'string'
                    ? resource
                    : resource instanceof Request
                        ? resource.url
                        : `${resource ?? ''}`;

                if (!init || typeof init !== 'object') {
                    return nativeFetch(resource, init);
                }

                const nextInit = { ...init };
                nextInit.body = patchImageCommentRequestBody(init.body, requestUrl);
                return nativeFetch(resource, nextInit);
            };
        }
    };

    scheduleImageCommentNicknameSync(null, { forceFullPass: true });
    hookImageNicknameHelpers();
    installImageCommentRequestPatch();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            scheduleImageCommentNicknameSync(null, { forceFullPass: true });
            hookImageNicknameHelpers();
            installImageCommentRequestPatch();
            observeImageCommentNicknameTargets();
        }, { once: true });
    } else {
        hookImageNicknameHelpers();
        installImageCommentRequestPatch();
        observeImageCommentNicknameTargets();
    }

    window.addEventListener('load', () => {
        hookImageNicknameHelpers();
        installImageCommentRequestPatch();
        scheduleImageCommentNicknameSync(null, { forceFullPass: true });
    }, { once: true });
})();

(() => {
    if ((window.location.pathname || '').indexOf('/board/lists') !== -1) return;

    const pendingImageCommentSections = new Set();
    const imageCommentWidthState = new WeakMap();
    let forceImageCommentWidthFullPass = false;
    const IMAGE_COMMENT_SECTION_SELECTOR = '.view_comment.image_comment';

    const setStyleValueIfChanged = (element, property, value) => {
        if (!(element instanceof HTMLElement)) return;
        if (element.style.getPropertyValue(property) === value) return;
        element.style.setProperty(property, value);
    };
    const removeStyleIfPresent = (element, property) => {
        if (!(element instanceof HTMLElement)) return;
        if (!element.style.getPropertyValue(property) && !element.style.getPropertyPriority(property)) return;
        element.style.removeProperty(property);
    };

    const collectImageCommentSections = (elements = null, { forceFullPass = false } = {}) => {
        if (forceFullPass) forceImageCommentWidthFullPass = true;
        if (!elements || typeof elements[Symbol.iterator] !== 'function') {
            document.querySelectorAll(IMAGE_COMMENT_SECTION_SELECTOR).forEach((section) => {
                if (section instanceof HTMLElement) pendingImageCommentSections.add(section);
            });
            return;
        }

        Array.from(elements).forEach((element) => {
            if (!(element instanceof Element)) return;
            const section = element.matches('.view_comment.image_comment')
                ? element
                : element.closest('.view_comment.image_comment');
            if (section instanceof HTMLElement) pendingImageCommentSections.add(section);
        });
    };

    const buildImageCommentWidthState = (width) => {
        if (width > 80) {
            const widthPx = `${width}px`;
            return {
                mode: 'fixed',
                width: widthPx,
                maxWidth: widthPx,
                marginLeft: '0px',
                marginRight: '0px'
            };
        }

        return {
            mode: 'reset',
            width: '',
            maxWidth: '',
            marginLeft: '',
            marginRight: ''
        };
    };
    const isSameImageCommentWidthState = (prev, next) => {
        if (!prev || !next) return false;
        return prev.mode === next.mode
            && prev.width === next.width
            && prev.maxWidth === next.maxWidth
            && prev.marginLeft === next.marginLeft
            && prev.marginRight === next.marginRight;
    };
    const readImageCommentWidths = (sections) => sections.map((section) => {
            const box = section.querySelector('.comment_box.img_comment_box');
            const imgNo = box?.getAttribute('data-imgno');
            const image = imgNo
                ? document.querySelector('.writing_view_box img[data-fileno="' + imgNo + '"]')
                : section.closest('.img_area')?.querySelector('img');

            const width = image
                ? Math.round(image.getBoundingClientRect().width || image.clientWidth || image.naturalWidth || 0)
                : 0;

            const imgCommentRoot = section.closest('.img_comment');
            const wrap = section.querySelector('.comment_wrap');
            const list = box?.querySelector('.cmt_list');
            return {
                section,
                targets: [imgCommentRoot, section, wrap, box, list],
                nextState: buildImageCommentWidthState(width)
            };
        });

    const writeImageCommentWidths = (measurements) => {
        measurements.forEach(({ section, targets, nextState }) => {
            if (!(section instanceof HTMLElement)) return;
            const previousState = imageCommentWidthState.get(section);
            if (isSameImageCommentWidthState(previousState, nextState)) return;

            if (nextState.mode === 'fixed') {
                targets.forEach((element) => {
                    if (!(element instanceof HTMLElement)) return;
                    setStyleValueIfChanged(element, 'width', nextState.width);
                    setStyleValueIfChanged(element, 'max-width', nextState.maxWidth);
                    setStyleValueIfChanged(element, 'margin-left', nextState.marginLeft);
                    setStyleValueIfChanged(element, 'margin-right', nextState.marginRight);
                });
            } else {
                targets.forEach((element) => {
                    if (!(element instanceof HTMLElement)) return;
                    removeStyleIfPresent(element, 'width');
                    removeStyleIfPresent(element, 'max-width');
                    removeStyleIfPresent(element, 'margin-left');
                    removeStyleIfPresent(element, 'margin-right');
                });
            }

            imageCommentWidthState.set(section, { ...nextState });
        });
    };

    const imageCommentWidthScheduler = __dcufCreatePhaseScheduler('image-comment-width', () => {
        if (pendingImageCommentSections.size === 0) {
            if (!forceImageCommentWidthFullPass) return;
            collectImageCommentSections(null, { forceFullPass: true });
        }
        const sections = Array.from(pendingImageCommentSections);
        pendingImageCommentSections.clear();
        forceImageCommentWidthFullPass = false;
        if (sections.length === 0) return;
        writeImageCommentWidths(readImageCommentWidths(sections));
    });
    const scheduleApplyImageCommentWidths = (elements = null, { forceFullPass = false } = {}) => {
        collectImageCommentSections(elements, { forceFullPass });
        imageCommentWidthScheduler.schedule();
    };

    const observeImageComments = () => {
        if (window.__dcufImageCommentWidthMutationUnsubscribe || window.__dcufImageCommentWidthObserver) return;
        const unsubscribe = __dcufSubscribeMutationBus('image-comment-width', (payload) => {
            const relevantNodes = __dcufCollectMatches(payload, '.view_comment.image_comment, .comment_box.img_comment_box, .img_comment, .writing_view_box img[data-fileno]', { includeRoots: true });
            if (relevantNodes.length > 0) {
                scheduleApplyImageCommentWidths(relevantNodes);
            }
        });
        if (typeof unsubscribe === 'function') {
            window.__dcufImageCommentWidthMutationUnsubscribe = unsubscribe;
            return;
        }

        if (!document.body) return;
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if ((mutation.addedNodes && mutation.addedNodes.length > 0) || mutation.type === 'attributes') {
                    scheduleApplyImageCommentWidths([mutation.target, ...Array.from(mutation.addedNodes || [])]);
                    break;
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'style', 'class'] });
        window.__dcufImageCommentWidthObserver = observer;
    };

    scheduleApplyImageCommentWidths(null, { forceFullPass: true });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            scheduleApplyImageCommentWidths(null, { forceFullPass: true });
            observeImageComments();
        }, { once: true });
    } else {
        observeImageComments();
    }

    window.addEventListener('load', () => scheduleApplyImageCommentWidths(null, { forceFullPass: true }), { once: true });
    window.addEventListener('resize', () => scheduleApplyImageCommentWidths(null, { forceFullPass: true }));
})();


(() => {
    if ((window.location.pathname || '').indexOf('/board/lists') !== -1) return;

    const ACTIVE_ATTR = 'data-dcuf-userpopup-active';
    const ACTIVE_INFO_ATTR = 'data-dcuf-userpopup-info-active';
    const ACTIVE_LAYER_ATTR = 'data-dcuf-userpopup-layer-active';
    const ORIG_Z = 'data-dcuf-userpopup-orig-z';
    const ORIG_POS = 'data-dcuf-userpopup-orig-pos';
    const ORIG_OV = 'data-dcuf-userpopup-orig-ov';
    const ORIG_LEFT = 'data-dcuf-userpopup-orig-left';
    const ORIG_TOP = 'data-dcuf-userpopup-orig-top';
    const ORIG_RIGHT = 'data-dcuf-userpopup-orig-right';
    const ORIG_BOTTOM = 'data-dcuf-userpopup-orig-bottom';
    const ORIG_WIDTH = 'data-dcuf-userpopup-orig-width';
    const ORIG_MIN_WIDTH = 'data-dcuf-userpopup-orig-min-width';
    const ORIG_MAX_WIDTH = 'data-dcuf-userpopup-orig-max-width';
    const ORIG_DISPLAY = 'data-dcuf-userpopup-orig-display';
    const ORIG_MARGIN = 'data-dcuf-userpopup-orig-margin';
    const LAYER_DX = 'data-dcuf-userpopup-layer-dx';
    const LAYER_DY = 'data-dcuf-userpopup-layer-dy';
    const NONE = '__none__';
    const POPUP_CONTEXT_SELECTOR = '#focus_cmt, div[id^="comment_wrap_"], .view_comment.image_comment';
    const ACTIVE_POPUP_SELECTOR = [
        '#focus_cmt #user_data_lyr',
        '#focus_cmt .user_data',
        '#focus_cmt .user_data_add',
        '#focus_cmt .user_data_add .user_data_list',
        '#focus_cmt ul.user_data_list',
        '#focus_cmt #dccon_guide_lyr',
        '#focus_cmt .pop_wrap.type2',
        '#focus_cmt .pop_wrap.type3',
        'div[id^="comment_wrap_"] #user_data_lyr',
        'div[id^="comment_wrap_"] .user_data',
        'div[id^="comment_wrap_"] .user_data_add',
        'div[id^="comment_wrap_"] .user_data_add .user_data_list',
        'div[id^="comment_wrap_"] ul.user_data_list',
        'div[id^="comment_wrap_"] #dccon_guide_lyr',
        'div[id^="comment_wrap_"] .pop_wrap.type2',
        'div[id^="comment_wrap_"] .pop_wrap.type3',
        '.view_comment.image_comment #user_data_lyr',
        '.view_comment.image_comment .user_data',
        '.view_comment.image_comment .user_data_add',
        '.view_comment.image_comment .user_data_add .user_data_list',
        '.view_comment.image_comment ul.user_data_list',
        '.view_comment.image_comment #dccon_guide_lyr',
        '.view_comment.image_comment .pop_wrap.type2',
        '.view_comment.image_comment .pop_wrap.type3',
        '.view_comment.image_comment .comment_box.img_comment_box .cmt_delpw_box',
        '.view_comment.image_comment .comment_box.img_comment_box [id$="_delpw_box"]'
    ].join(', ');
    const COMMENT_LI_SELECTOR = 'li[id^="reply_li_"], li[id^="comment_li_"], li[id^="img_comment_li_"], li[id^="mg_comment_li_"]';
    const IMAGE_COMMENT_LI_SELECTOR = '.view_comment.image_comment .comment_box.img_comment_box .cmt_list > li, .view_comment.image_comment .comment_box.img_comment_box .reply_list > li';
    const IMAGE_COMMENT_DELETE_POPUP_SELECTOR = '.view_comment.image_comment .comment_box.img_comment_box .cmt_delpw_box, .view_comment.image_comment .comment_box.img_comment_box [id$="_delpw_box"]';
    const POPUP_CANDIDATE_SELECTOR = [POPUP_CONTEXT_SELECTOR, ACTIVE_POPUP_SELECTOR, COMMENT_LI_SELECTOR, IMAGE_COMMENT_LI_SELECTOR].join(', ');
    const POPUP_TRIGGER_SELECTOR = [
        '.writer_nikcon',
        '.gall_writer',
        '.nickname',
        '.txt_del',
        '.btn_cmt_delete',
        '.btn_img_cmt_delete',
        '.author',
        '.cmt_mdf_del button'
    ].join(', ');
    const pendingPopupCandidates = new Set();
    const activePopupOwners = new Set();
    const activePopupInfoOwners = new Set();
    const activePopupElements = new Set();
    let forcePopupLayerFullPass = false;
    let lastPopupOwnerStateKey = '';
    let popupStateIdCounter = 1;
    const popupStateIds = new WeakMap();

    const isVisible = (element) => {
        if (!(element instanceof HTMLElement)) return false;
        const cs = window.getComputedStyle(element);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity || '1') === 0) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    };

    const findPopupOwnerLi = (popup) => {
        if (!(popup instanceof HTMLElement)) return null;
        return popup.closest(COMMENT_LI_SELECTOR) || popup.closest(IMAGE_COMMENT_LI_SELECTOR);
    };

    const saveStyleIfNeeded = (element, attr, prop) => {
        if (!(element instanceof HTMLElement)) return;
        if (element.hasAttribute(attr)) return;
        const raw = element.style.getPropertyValue(prop);
        element.setAttribute(attr, raw ? raw : NONE);
    };

    const restoreStyle = (element, attr, prop) => {
        if (!(element instanceof HTMLElement)) return;
        if (!element.hasAttribute(attr)) {
            element.style.removeProperty(prop);
            return;
        }
        const value = element.getAttribute(attr);
        if (!value || value === NONE) {
            element.style.removeProperty(prop);
        } else {
            element.style.setProperty(prop, value);
        }
        element.removeAttribute(attr);
    };
    const setImportantStyleIfChanged = (element, property, value) => {
        if (!(element instanceof HTMLElement)) return;
        if (element.style.getPropertyValue(property) === value && element.style.getPropertyPriority(property) === 'important') return;
        element.style.setProperty(property, value, 'important');
    };
    const setAttributeIfChanged = (element, name, value) => {
        if (!(element instanceof HTMLElement)) return;
        if (element.getAttribute(name) === value) return;
        element.setAttribute(name, value);
    };
    const replaceElementSet = (targetSet, elements) => {
        targetSet.clear();
        elements.forEach((element) => {
            if (element instanceof Element && element.isConnected) targetSet.add(element);
        });
    };
    const takeConnectedPopupCandidates = () => {
        const candidates = Array.from(pendingPopupCandidates).filter((candidate) => candidate instanceof Element && candidate.isConnected);
        pendingPopupCandidates.clear();
        return candidates;
    };
    const findPopupInfoOwner = (popup) => {
        if (!(popup instanceof HTMLElement)) return null;
        const li = popup.closest(COMMENT_LI_SELECTOR) || popup.closest(IMAGE_COMMENT_LI_SELECTOR);
        if (li instanceof HTMLElement) {
            return li.querySelector('.cmt_nickbox .gall_writer')
                || li.querySelector('.reply_info .gall_writer')
                || li.querySelector('.cmt_info .gall_writer')
                || li.querySelector('.cmt_nickbox .nickname')
                || li.querySelector('.reply_info .nickname')
                || li.querySelector('.cmt_info .nickname')
                || li.querySelector('.cmt_nickbox')
                || li.querySelector('.reply_info')
                || li.querySelector('.cmt_info')
                || li.querySelector('.fr.clear');
        }
        return popup.closest('.gall_writer')
            || popup.closest('.nickname')
            || popup.closest('.cmt_nickbox')
            || popup.closest('.reply_info')
            || popup.closest('.cmt_info')
            || popup.closest('.fr.clear');
    };
    const isViewportLayerPopup = (popup) => popup instanceof HTMLElement
        && popup.matches('#user_data_lyr, .user_data, .user_data_add, .user_data_add .user_data_list, ul.user_data_list');
    const isCommentUserPopup = (popup) => popup instanceof HTMLElement
        && popup.matches('#user_data_lyr, .user_data, .user_data_add, .user_data_add .user_data_list, ul.user_data_list')
        && Boolean(popup.closest('#focus_cmt, div[id^="comment_wrap_"], .view_comment.image_comment'));
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const getPopupElementStateKey = (element) => {
        if (!(element instanceof Element)) return '';
        let stateId = popupStateIds.get(element);
        if (!stateId) {
            stateId = popupStateIdCounter++;
            popupStateIds.set(element, stateId);
        }
        return `${element.id || element.tagName}:${stateId}`;
    };
    const buildPopupOwnerStateKey = (owners) => Array.from(owners)
        .filter((owner) => owner instanceof Element)
        .map((owner) => getPopupElementStateKey(owner))
        .sort()
        .join('|');
    const isPopupOwnerElevationIntact = (li) => li instanceof HTMLElement
        && li.getAttribute(ACTIVE_ATTR) === '1'
        && li.style.getPropertyValue('position') === 'relative'
        && li.style.getPropertyPriority('position') === 'important'
        && li.style.getPropertyValue('z-index') === '2147483646'
        && li.style.getPropertyPriority('z-index') === 'important'
        && li.style.getPropertyValue('overflow') === 'visible'
        && li.style.getPropertyPriority('overflow') === 'important';
    const getActivePopupCandidates = () => ([
        ...Array.from(activePopupElements).filter((element) => element instanceof HTMLElement && element.isConnected && isVisible(element)),
        ...Array.from(activePopupOwners).filter((element) => element instanceof HTMLElement && element.isConnected),
        ...Array.from(activePopupInfoOwners).filter((element) => element instanceof HTMLElement && element.isConnected)
    ]);
    const isRelevantPopupEventTarget = (target) => target instanceof Element
        && Boolean(target.closest(`${POPUP_CANDIDATE_SELECTOR}, ${POPUP_TRIGGER_SELECTOR}, ${ACTIVE_POPUP_SELECTOR}`));

    const elevateLi = (li) => {
        if (!(li instanceof HTMLElement)) return;
        const isFocusGroupParentLi = li.getAttribute('data-dcuf-focus-group-parent') === '1';
        saveStyleIfNeeded(li, ORIG_Z, 'z-index');
        saveStyleIfNeeded(li, ORIG_POS, 'position');
        saveStyleIfNeeded(li, ORIG_OV, 'overflow');
        setImportantStyleIfChanged(li, 'position', 'relative');
        /* Raising a focus-group parent card also raises its ::after white background,
           which makes the original comment look like it jumps in front of the whole thread.
           Keep the card itself in the normal stack and lift only the nickname/popup layer. */
        setImportantStyleIfChanged(li, 'z-index', isFocusGroupParentLi ? 'auto' : '2147483646');
        setImportantStyleIfChanged(li, 'overflow', 'visible');
        setAttributeIfChanged(li, ACTIVE_ATTR, '1');
    };
    const elevateInfoOwner = (element) => {
        if (!(element instanceof HTMLElement)) return;
        saveStyleIfNeeded(element, ORIG_Z, 'z-index');
        saveStyleIfNeeded(element, ORIG_POS, 'position');
        saveStyleIfNeeded(element, ORIG_OV, 'overflow');
        setImportantStyleIfChanged(element, 'position', 'relative');
        setImportantStyleIfChanged(element, 'z-index', '2147483647');
        setImportantStyleIfChanged(element, 'overflow', 'visible');
        setAttributeIfChanged(element, ACTIVE_INFO_ATTR, '1');
    };
    const elevatePopupLayer = (popup) => {
        if (!(popup instanceof HTMLElement)) return;
        if (!isViewportLayerPopup(popup)) return;

        const anchor = findPopupInfoOwner(popup);
        if (!(anchor instanceof HTMLElement)) return;

        const anchorRect = anchor.getBoundingClientRect();
        const popupLi = popup.closest(COMMENT_LI_SELECTOR) || popup.closest(IMAGE_COMMENT_LI_SELECTOR);
        const popupRect = popup.getBoundingClientRect();
        const popupWidth = popupRect.width || popup.offsetWidth || 140;
        const popupHeight = popupRect.height || popup.offsetHeight || 120;
        const viewportWidth = document.documentElement?.clientWidth || window.innerWidth || 0;
        const viewportHeight = window.innerHeight || document.documentElement?.clientHeight || 0;
        const edgePadding = 8;
        const sideGap = 8;
        const verticalGap = 4;
        let targetLeft;
        let targetTop;

        if (isCommentUserPopup(popup)) {
            // Comment nickname popups are host-owned absolute layers.
            // Converting them to fixed fought the site logic and caused flicker/jumps,
            // so keep them in the owning comment li and only rewrite left/top locally.
            const preferredRight = anchorRect.right + sideGap;
            const fitsRight = preferredRight + popupWidth <= (viewportWidth - edgePadding);
            const preferredLeft = anchorRect.left - popupWidth - sideGap;
            const fallbackLeft = clamp(preferredLeft, edgePadding, Math.max(edgePadding, viewportWidth - popupWidth - edgePadding));
            targetLeft = fitsRight ? preferredRight : fallbackLeft;

            const alignedTop = anchorRect.top - verticalGap;
            const maxTop = Math.max(edgePadding, viewportHeight - popupHeight - edgePadding);
            const minTop = edgePadding;
            targetTop = clamp(alignedTop, minTop, maxTop);

            const overlapsAnchorVertically = targetTop < anchorRect.bottom && (targetTop + popupHeight) > anchorRect.top;
            const overlapsAnchorHorizontally = targetLeft < anchorRect.right && (targetLeft + popupWidth) > anchorRect.left;
            if (overlapsAnchorVertically && overlapsAnchorHorizontally) {
                const belowTop = anchorRect.bottom + verticalGap;
                targetTop = clamp(belowTop, minTop, maxTop);
            }
        } else {
            const hasStoredOffset = popup.hasAttribute(LAYER_DX) && popup.hasAttribute(LAYER_DY);
            const dx = hasStoredOffset
                ? Number.parseFloat(popup.getAttribute(LAYER_DX) || '0') || 0
                : (popupRect.left - anchorRect.left);
            const dy = hasStoredOffset
                ? Number.parseFloat(popup.getAttribute(LAYER_DY) || '0') || 0
                : (popupRect.top - anchorRect.top);

            if (!hasStoredOffset) {
                popup.setAttribute(LAYER_DX, `${dx}`);
                popup.setAttribute(LAYER_DY, `${dy}`);
            }

            targetLeft = Math.round(anchorRect.left + dx);
            targetTop = Math.round(anchorRect.top + dy);
        }

        saveStyleIfNeeded(popup, ORIG_Z, 'z-index');
        saveStyleIfNeeded(popup, ORIG_POS, 'position');
        saveStyleIfNeeded(popup, ORIG_OV, 'overflow');
        saveStyleIfNeeded(popup, ORIG_LEFT, 'left');
        saveStyleIfNeeded(popup, ORIG_TOP, 'top');
        saveStyleIfNeeded(popup, ORIG_RIGHT, 'right');
        saveStyleIfNeeded(popup, ORIG_BOTTOM, 'bottom');
        saveStyleIfNeeded(popup, ORIG_WIDTH, 'width');
        saveStyleIfNeeded(popup, ORIG_MIN_WIDTH, 'min-width');
        saveStyleIfNeeded(popup, ORIG_MAX_WIDTH, 'max-width');
        saveStyleIfNeeded(popup, ORIG_DISPLAY, 'display');
        saveStyleIfNeeded(popup, ORIG_MARGIN, 'margin');

        if (isCommentUserPopup(popup) && popupLi instanceof HTMLElement) {
            const liRect = popupLi.getBoundingClientRect();
            const localLeft = Math.max(0, Math.round(targetLeft - liRect.left));
            const localTop = Math.max(0, Math.round(targetTop - liRect.top));

            setImportantStyleIfChanged(popup, 'position', 'absolute');
            setImportantStyleIfChanged(popup, 'left', `${localLeft}px`);
            setImportantStyleIfChanged(popup, 'top', `${localTop}px`);
            setImportantStyleIfChanged(popup, 'right', 'auto');
            setImportantStyleIfChanged(popup, 'bottom', 'auto');
            setImportantStyleIfChanged(popup, 'display', 'block');
            popup.style.removeProperty('width');
            popup.style.removeProperty('min-width');
            popup.style.removeProperty('max-width');
            setImportantStyleIfChanged(popup, 'margin', '0');
        } else {
            setImportantStyleIfChanged(popup, 'position', 'fixed');
            setImportantStyleIfChanged(popup, 'left', `${Math.round(targetLeft)}px`);
            setImportantStyleIfChanged(popup, 'top', `${Math.round(targetTop)}px`);
            setImportantStyleIfChanged(popup, 'right', 'auto');
            setImportantStyleIfChanged(popup, 'bottom', 'auto');
            setImportantStyleIfChanged(popup, 'display', 'block');
            setImportantStyleIfChanged(popup, 'width', 'max-content');
            setImportantStyleIfChanged(popup, 'min-width', '140px');
            setImportantStyleIfChanged(popup, 'max-width', '240px');
            setImportantStyleIfChanged(popup, 'margin', '0');
        }
        setImportantStyleIfChanged(popup, 'z-index', '2147483647');
        setImportantStyleIfChanged(popup, 'overflow', 'visible');
        setAttributeIfChanged(popup, ACTIVE_LAYER_ATTR, '1');
    };

    const clearElevated = () => {
        document.querySelectorAll('li[' + ACTIVE_ATTR + '="1"]').forEach((li) => {
            if (!(li instanceof HTMLElement)) return;
            restoreStyle(li, ORIG_Z, 'z-index');
            restoreStyle(li, ORIG_POS, 'position');
            restoreStyle(li, ORIG_OV, 'overflow');
            li.removeAttribute(ACTIVE_ATTR);
        });
        document.querySelectorAll('[' + ACTIVE_INFO_ATTR + '="1"]').forEach((element) => {
            if (!(element instanceof HTMLElement)) return;
            restoreStyle(element, ORIG_Z, 'z-index');
            restoreStyle(element, ORIG_POS, 'position');
            restoreStyle(element, ORIG_OV, 'overflow');
            element.removeAttribute(ACTIVE_INFO_ATTR);
        });
        document.querySelectorAll('[' + ACTIVE_LAYER_ATTR + '="1"]').forEach((popup) => {
            if (!(popup instanceof HTMLElement)) return;
            restoreStyle(popup, ORIG_Z, 'z-index');
            restoreStyle(popup, ORIG_POS, 'position');
            restoreStyle(popup, ORIG_OV, 'overflow');
            restoreStyle(popup, ORIG_LEFT, 'left');
            restoreStyle(popup, ORIG_TOP, 'top');
            restoreStyle(popup, ORIG_RIGHT, 'right');
            restoreStyle(popup, ORIG_BOTTOM, 'bottom');
            restoreStyle(popup, ORIG_WIDTH, 'width');
            restoreStyle(popup, ORIG_MIN_WIDTH, 'min-width');
            restoreStyle(popup, ORIG_MAX_WIDTH, 'max-width');
            restoreStyle(popup, ORIG_DISPLAY, 'display');
            restoreStyle(popup, ORIG_MARGIN, 'margin');
            popup.removeAttribute(ACTIVE_LAYER_ATTR);
            popup.removeAttribute(LAYER_DX);
            popup.removeAttribute(LAYER_DY);
        });
    };

    const collectPopupCandidates = (elements = null, { forceFullPass = false } = {}) => {
        if (forceFullPass) forcePopupLayerFullPass = true;
        if (!elements || typeof elements[Symbol.iterator] !== 'function') return;
        Array.from(elements).forEach((element) => {
            if (!(element instanceof Element)) return;
            if (element.matches?.(POPUP_CANDIDATE_SELECTOR)) pendingPopupCandidates.add(element);
            element.querySelectorAll?.(POPUP_CANDIDATE_SELECTOR).forEach((candidate) => {
                if (candidate instanceof Element) pendingPopupCandidates.add(candidate);
            });
        });
    };
    const addPopupOwners = (activeLis, activeInfos, popup) => {
        if (!(popup instanceof HTMLElement)) return;
        if (!isVisible(popup)) return;

        const li = findPopupOwnerLi(popup);
        if (li instanceof HTMLElement) {
            activeLis.add(li);

            if ((li.id || '').indexOf('reply_li_') === 0) {
                // Reply nickname popups can still be covered by their parent comment card.
                // Keep tracking the parent li too, but do not lift focus-group parent cards
                // to a high z-index in elevateLi().
                const parentCommentLi = li.closest('li[id^="comment_li_"]');
                if (parentCommentLi instanceof HTMLElement) activeLis.add(parentCommentLi);
            }
        }

        const infoOwner = findPopupInfoOwner(popup);
        if (infoOwner instanceof HTMLElement) activeInfos.add(infoOwner);
    };
    const collectActiveLis = () => {
        const activeLis = new Set();
        const activeInfos = new Set();
        document.querySelectorAll(ACTIVE_POPUP_SELECTOR).forEach((popup) => {
            addPopupOwners(activeLis, activeInfos, popup);
        });
        return { activeLis, activeInfos };
    };
    const collectVisiblePopups = () => Array.from(document.querySelectorAll(ACTIVE_POPUP_SELECTOR))
        .filter((popup) => popup instanceof HTMLElement && isVisible(popup));
    const collectVisiblePopupsFromCandidates = (candidates) => {
        const visiblePopups = new Set();
        candidates.forEach((candidate) => {
            if (!(candidate instanceof Element)) return;
            if (candidate.matches?.(ACTIVE_POPUP_SELECTOR) && isVisible(candidate)) {
                visiblePopups.add(candidate);
            }
            candidate.querySelectorAll?.(ACTIVE_POPUP_SELECTOR).forEach((popup) => {
                if (popup instanceof HTMLElement && isVisible(popup)) visiblePopups.add(popup);
            });
        });
        return Array.from(visiblePopups);
    };
    const collectDeletePopupOwners = (candidates = null, { forceFullPass = false } = {}) => {
        const owners = new Set();
        const addOwner = (element) => {
            if (!(element instanceof Element)) return;
            const ownerLi = element.matches?.(IMAGE_COMMENT_LI_SELECTOR)
                ? element
                : findPopupOwnerLi(element) || element.closest?.(IMAGE_COMMENT_LI_SELECTOR);
            if (ownerLi instanceof HTMLElement) owners.add(ownerLi);
        };

        if (forceFullPass || !Array.isArray(candidates) || candidates.length === 0) {
            document.querySelectorAll(IMAGE_COMMENT_DELETE_POPUP_SELECTOR).forEach((popup) => addOwner(popup));
            return owners;
        }

        candidates.forEach((candidate) => {
            if (!(candidate instanceof Element)) return;
            addOwner(candidate);
            if (candidate.matches?.(IMAGE_COMMENT_DELETE_POPUP_SELECTOR)) addOwner(candidate);
            candidate.querySelectorAll?.(IMAGE_COMMENT_DELETE_POPUP_SELECTOR).forEach((popup) => addOwner(popup));
            candidate.querySelectorAll?.(IMAGE_COMMENT_LI_SELECTOR).forEach((li) => addOwner(li));
        });
        return owners;
    };
    const cleanupDuplicateImageCommentDeletePopups = (candidates = null, { forceFullPass = false } = {}) => {
        const owners = collectDeletePopupOwners(candidates, { forceFullPass });
        owners.forEach((ownerLi) => {
            if (!(ownerLi instanceof HTMLElement)) return;
            const popups = Array.from(ownerLi.querySelectorAll('.cmt_delpw_box, [id$="_delpw_box"]'))
                .filter((popup) => popup instanceof HTMLElement && popup.closest('.view_comment.image_comment'));
            if (popups.length <= 1) return;

            const keepPopup = [...popups].reverse().find((popup) => isVisible(popup)) || popups[popups.length - 1];
            popups.forEach((popup) => {
                if (popup === keepPopup) return;
                popup.remove();
            });
        });
    };
    const collectActiveLisFromCandidates = (candidates) => {
        const activeLis = new Set();
        const activeInfos = new Set();
        candidates.forEach((candidate) => {
            if (!(candidate instanceof Element)) return;
            if (candidate.matches?.(ACTIVE_POPUP_SELECTOR)) addPopupOwners(activeLis, activeInfos, candidate);
            candidate.querySelectorAll?.(ACTIVE_POPUP_SELECTOR).forEach((popup) => addPopupOwners(activeLis, activeInfos, popup));
        });
        return { activeLis, activeInfos };
    };
    const collectActivePopupState = (candidates = null, { forceFullPass = false } = {}) => {
        const visiblePopups = forceFullPass || !Array.isArray(candidates) || candidates.length === 0
            ? collectVisiblePopups()
            : collectVisiblePopupsFromCandidates(candidates);
        const owners = new Set();
        const infoOwners = new Set();
        visiblePopups.forEach((popup) => addPopupOwners(owners, infoOwners, popup));
        return { visiblePopups, owners, infoOwners };
    };
    const applyPopupFixForCandidates = (candidates = null, { forceFullPass = false } = {}) => {
        cleanupDuplicateImageCommentDeletePopups(candidates, { forceFullPass });
        let { visiblePopups, owners, infoOwners } = collectActivePopupState(candidates, { forceFullPass });
        const activeVisibleFallback = !forceFullPass
            && Array.isArray(candidates)
            && candidates.length > 0
            && visiblePopups.length === 0
            ? Array.from(activePopupElements).filter((popup) => popup instanceof HTMLElement && popup.isConnected && isVisible(popup))
            : [];

        if (activeVisibleFallback.length > 0) {
            const fallbackOwners = new Set();
            const fallbackInfoOwners = new Set();
            activeVisibleFallback.forEach((popup) => addPopupOwners(fallbackOwners, fallbackInfoOwners, popup));
            visiblePopups = activeVisibleFallback;
            owners.clear();
            infoOwners.clear();
            fallbackOwners.forEach((owner) => owners.add(owner));
            fallbackInfoOwners.forEach((owner) => infoOwners.add(owner));
        }
        const nextOwnerStateKey = buildPopupOwnerStateKey(owners);
        const canReuseState = nextOwnerStateKey === lastPopupOwnerStateKey
            && document.querySelectorAll('li[' + ACTIVE_ATTR + '="1"]').length === owners.size
            && Array.from(owners).every((li) => isPopupOwnerElevationIntact(li));

        if (canReuseState) {
            return;
        }

        // Important ordering: clear old elevated styles first, then apply popup placement.
        // Reversing this brought comment popups back to the site's default left:0/top:-16
        // position right after we placed them.
        clearElevated();
        replaceElementSet(activePopupElements, visiblePopups);
        replaceElementSet(activePopupOwners, owners);
        replaceElementSet(activePopupInfoOwners, infoOwners);
        owners.forEach((li) => elevateLi(li));
        infoOwners.forEach((element) => elevateInfoOwner(element));
        visiblePopups.forEach((popup) => elevatePopupLayer(popup));
        lastPopupOwnerStateKey = nextOwnerStateKey;
    };

    const popupLayerScheduler = __dcufCreatePhaseScheduler('user-popup-layer', () => {
        const candidates = takeConnectedPopupCandidates();
        const useFullPass = forcePopupLayerFullPass;
        forcePopupLayerFullPass = false;
        if (candidates.length === 0 && !useFullPass) {
            const activeCandidates = getActivePopupCandidates();
            if (activeCandidates.length === 0) return;
            applyPopupFixForCandidates(activeCandidates, { forceFullPass: false });
            return;
        }
        applyPopupFixForCandidates(useFullPass ? null : candidates, { forceFullPass: useFullPass });
    });
    const scheduleApply = ({ elements = null, forceFullPass = false } = {}) => {
        collectPopupCandidates(elements, { forceFullPass });
        popupLayerScheduler.schedule();
    };

    const observe = () => {
        if (window.__dcufUserPopupLayerMutationUnsubscribe || window.__dcufUserPopupLayerObserver) return;
        const unsubscribe = __dcufSubscribeMutationBus('user-popup-layer', (payload) => {
            const relevantNodes = __dcufCollectMatches(payload, [
                POPUP_CONTEXT_SELECTOR,
                ACTIVE_POPUP_SELECTOR,
                COMMENT_LI_SELECTOR,
                IMAGE_COMMENT_LI_SELECTOR
            ], { includeRoots: true });
            if (relevantNodes.length > 0) {
                scheduleApply({ elements: relevantNodes });
            }
        });
        if (typeof unsubscribe === 'function') {
            window.__dcufUserPopupLayerMutationUnsubscribe = unsubscribe;
            return;
        }

        if (!document.body) return;
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
                        scheduleApply({ elements: [mutation.target, ...Array.from(mutation.addedNodes || []), ...Array.from(mutation.removedNodes || [])] });
                        return;
                    }
                }
                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    if (target instanceof Element && target.closest(POPUP_CONTEXT_SELECTOR)) {
                        scheduleApply({ elements: [target] });
                        return;
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });

        window.__dcufUserPopupLayerObserver = observer;
    };

    const bindEvents = () => {
        if (window.__dcufUserPopupLayerBound) return;
        document.addEventListener('click', (event) => {
            if (!isRelevantPopupEventTarget(event.target)) return;
            scheduleApply({ elements: [event.target].filter(Boolean) });
        }, true);
        document.addEventListener('mouseup', (event) => {
            if (!isRelevantPopupEventTarget(event.target)) return;
            scheduleApply({ elements: [event.target].filter(Boolean) });
        }, true);
        document.addEventListener('keyup', (event) => {
            if (!isRelevantPopupEventTarget(event.target)) return;
            scheduleApply({ elements: [event.target].filter(Boolean) });
        }, true);
        window.addEventListener('scroll', () => {
            const activeCandidates = getActivePopupCandidates();
            if (activeCandidates.length === 0) return;
            scheduleApply({ elements: activeCandidates });
        }, true);
        window.addEventListener('resize', () => {
            const activeCandidates = getActivePopupCandidates();
            if (activeCandidates.length === 0) return;
            scheduleApply({ elements: activeCandidates });
        }, true);
        window.__dcufUserPopupLayerBound = true;
    };

    scheduleApply({ forceFullPass: true });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            scheduleApply({ forceFullPass: true });
            observe();
            bindEvents();
        }, { once: true });
    } else {
        observe();
        bindEvents();
    }

    window.addEventListener('load', () => scheduleApply({ forceFullPass: true }), { once: true });
})();
(() => {
    const STYLE_ID = 'dcuf-list-memo-popup-fix';
    const CENTER_ATTR = 'data-dcuf-list-memo-centered';
    const POPUP_SELECTOR = '#user_memo_config.pop_wrap.type3, #um_picker_lay.pop_wrap.type3';
    const MEMO_CONTEXT_SELECTOR = [POPUP_SELECTOR, '.custom-mobile-list', '.custom-post-item', '.view_content_wrap'].join(', ');
    const MEMO_EVENT_TARGET_SELECTOR = [MEMO_CONTEXT_SELECTOR, '#user_data_lyr', '.user_data', '.pop_wrap.type2', '.pop_wrap.type3'].join(', ');
    const MEMO_FORCE_FULLPASS_EVENT_SELECTOR = '#user_data_lyr, .user_data, .pop_wrap.type2, .pop_wrap.type3';
    const pendingMemoPopupCandidates = new Set();
    const activeMemoPopups = new Set();
    let forceMemoPopupFullPass = false;
    let lastMemoPopupStateKey = '';
    let memoPopupStateIdCounter = 1;
    const memoPopupStateIds = new WeakMap();
    const memoPopupStateCache = new WeakMap();
    let memoPopupOpenFollowupRafId = 0;
    const memoPopupOpenFollowupTimerIds = new Set();
    const LIST_MEMO_POPUP_IMMEDIATE_SELECTOR = [
        '.custom-mobile-list #user_memo_config.pop_wrap.type3',
        '.custom-post-item #user_memo_config.pop_wrap.type3',
        '.custom-mobile-list #um_picker_lay.pop_wrap.type3',
        '.custom-post-item #um_picker_lay.pop_wrap.type3'
    ].join(', ');
    const css = `
        ${LIST_MEMO_POPUP_IMMEDIATE_SELECTOR},
        .pop_wrap.type3[${CENTER_ATTR}="1"] {
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            right: auto !important;
            bottom: auto !important;
            margin: 0 !important;
            transform: translate(-50%, -50%) !important;
            z-index: 2147483647 !important;
        }
        .custom-mobile-list #user_memo_config.pop_wrap.type3,
        .custom-post-item #user_memo_config.pop_wrap.type3,
        #user_memo_config.pop_wrap.type3[${CENTER_ATTR}="1"] {
            width: min(478px, calc(100vw - 16px)) !important;
            max-width: min(478px, calc(100vw - 16px)) !important;
            max-height: calc(100vh - 16px) !important;
        }
        .custom-mobile-list #user_memo_config.pop_wrap.type3 .pop_content.memo_sel,
        .custom-post-item #user_memo_config.pop_wrap.type3 .pop_content.memo_sel,
        #user_memo_config.pop_wrap.type3[${CENTER_ATTR}="1"] .pop_content.memo_sel {
            width: 100% !important;
            max-width: 100% !important;
            max-height: calc(100vh - 16px) !important;
            overflow-y: auto !important;
            box-sizing: border-box !important;
        }
        .custom-mobile-list #user_memo_config.pop_wrap.type3 .pop_head,
        .custom-mobile-list #user_memo_config.pop_wrap.type3 .inner,
        .custom-mobile-list #user_memo_config.pop_wrap.type3 .btn_box,
        .custom-post-item #user_memo_config.pop_wrap.type3 .pop_head,
        .custom-post-item #user_memo_config.pop_wrap.type3 .inner,
        .custom-post-item #user_memo_config.pop_wrap.type3 .btn_box,
        #user_memo_config.pop_wrap.type3[${CENTER_ATTR}="1"] .pop_head,
        #user_memo_config.pop_wrap.type3[${CENTER_ATTR}="1"] .inner,
        #user_memo_config.pop_wrap.type3[${CENTER_ATTR}="1"] .btn_box {
            box-sizing: border-box !important;
        }
    `;

    const injectStyle = () => {
        if (document.getElementById(STYLE_ID)) return true;
        const target = document.head || document.documentElement;
        if (!target) return false;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;
        target.appendChild(style);
        return true;
    };

    const isVisible = (element) => {
        if (!(element instanceof HTMLElement)) return false;
        const cs = window.getComputedStyle(element);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity || '1') === 0) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    };

    const isListMemoContext = (popup) => {
        if (!(popup instanceof HTMLElement)) return false;
        if (!isVisible(popup)) return false;
        if (popup.closest('.view_content_wrap, #focus_cmt')) return false;
        if (popup.closest('.custom-mobile-list, .custom-post-item')) return true;

        const hasCustomList = !!document.querySelector('.custom-mobile-list, .custom-post-item');
        const hasViewContent = !!document.querySelector('.view_content_wrap');
        return hasCustomList && !hasViewContent;
    };
    const setCenteredAttr = (popup, centered) => {
        if (!(popup instanceof HTMLElement)) return;
        if (centered) {
            if (popup.getAttribute(CENTER_ATTR) !== '1') popup.setAttribute(CENTER_ATTR, '1');
            return;
        }
        if (popup.hasAttribute(CENTER_ATTR)) popup.removeAttribute(CENTER_ATTR);
    };
    const replaceMemoPopupSet = (elements) => {
        activeMemoPopups.clear();
        elements.forEach((element) => {
            if (element instanceof HTMLElement && element.isConnected && isVisible(element)) {
                activeMemoPopups.add(element);
            }
        });
    };
    const getMemoPopupStateId = (popup) => {
        if (!(popup instanceof HTMLElement)) return '';
        let stateId = memoPopupStateIds.get(popup);
        if (!stateId) {
            stateId = memoPopupStateIdCounter++;
            memoPopupStateIds.set(popup, stateId);
        }
        return `${popup.id || popup.className || popup.tagName}:${stateId}`;
    };
    const buildMemoPopupStateKey = (popups) => Array.from(popups)
        .filter((popup) => popup instanceof HTMLElement && isVisible(popup))
        .map((popup) => {
            const cached = memoPopupStateCache.get(popup) || '0';
            return `${getMemoPopupStateId(popup)}:${cached}`;
        })
        .sort()
        .join('|');
    const takeConnectedMemoCandidates = () => {
        const candidates = Array.from(pendingMemoPopupCandidates).filter((candidate) => candidate instanceof Element && candidate.isConnected);
        pendingMemoPopupCandidates.clear();
        return candidates;
    };
    const getActiveMemoPopupCandidates = () => Array.from(activeMemoPopups)
        .filter((popup) => popup instanceof HTMLElement && popup.isConnected && isVisible(popup));
    const isRelevantMemoEventTarget = (target) => target instanceof Element
        && Boolean(target.closest(MEMO_EVENT_TARGET_SELECTOR));
    const clearMemoPopupOpenFollowups = () => {
        if (memoPopupOpenFollowupRafId) {
            cancelAnimationFrame(memoPopupOpenFollowupRafId);
            memoPopupOpenFollowupRafId = 0;
        }
        memoPopupOpenFollowupTimerIds.forEach((timerId) => clearTimeout(timerId));
        memoPopupOpenFollowupTimerIds.clear();
    };
    const collectMemoPopupCandidates = (elements = null, { forceFullPass = false } = {}) => {
        if (forceFullPass) forceMemoPopupFullPass = true;
        if (!elements || typeof elements[Symbol.iterator] !== 'function') return;
        Array.from(elements).forEach((element) => {
            if (!(element instanceof Element)) return;
            if (element.matches?.(MEMO_CONTEXT_SELECTOR)) pendingMemoPopupCandidates.add(element);
            element.querySelectorAll?.(MEMO_CONTEXT_SELECTOR).forEach((candidate) => {
                if (candidate instanceof Element) pendingMemoPopupCandidates.add(candidate);
            });
        });
    };
    const resolveMemoPopupTargets = (candidates = null, { forceFullPass = false } = {}) => {
        if (forceFullPass || !Array.isArray(candidates) || candidates.length === 0) {
            return Array.from(document.querySelectorAll(POPUP_SELECTOR));
        }

        const popups = new Set();
        let needsGlobalPopupLookup = false;
        candidates.forEach((candidate) => {
            if (!(candidate instanceof Element)) return;
            if (candidate.matches?.(POPUP_SELECTOR)) popups.add(candidate);
            candidate.querySelectorAll?.(POPUP_SELECTOR).forEach((popup) => {
                if (popup instanceof HTMLElement) popups.add(popup);
            });
            if (candidate.matches?.('.custom-mobile-list, .custom-post-item, .view_content_wrap')
                || candidate.querySelector?.('.custom-mobile-list, .custom-post-item, .view_content_wrap')) {
                needsGlobalPopupLookup = true;
            }
        });

        if (needsGlobalPopupLookup) {
            document.querySelectorAll(POPUP_SELECTOR).forEach((popup) => {
                if (popup instanceof HTMLElement) popups.add(popup);
            });
        }

        return Array.from(popups);
    };

    const syncPopup = (popup) => {
        if (!(popup instanceof HTMLElement)) return;
        const centered = isListMemoContext(popup);
        const nextState = centered ? '1' : '0';
        const previousState = memoPopupStateCache.get(popup);
        if (previousState === nextState && ((centered && popup.getAttribute(CENTER_ATTR) === '1') || (!centered && !popup.hasAttribute(CENTER_ATTR)))) {
            return;
        }
        setCenteredAttr(popup, centered);
        memoPopupStateCache.set(popup, nextState);
    };

    const syncMemoPopups = (candidates = null, { forceFullPass = false } = {}) => {
        const popups = resolveMemoPopupTargets(candidates, { forceFullPass });
        popups.forEach((popup) => syncPopup(popup));
        replaceMemoPopupSet(popups);
        lastMemoPopupStateKey = buildMemoPopupStateKey(activeMemoPopups);
    };

    const memoPopupScheduler = __dcufCreatePhaseScheduler('list-memo-popup', () => {
        const candidates = takeConnectedMemoCandidates();
        const useFullPass = forceMemoPopupFullPass;
        forceMemoPopupFullPass = false;
        if (candidates.length === 0 && !useFullPass) {
            const activeCandidates = getActiveMemoPopupCandidates();
            if (activeCandidates.length === 0) return;
            const nextStateKey = buildMemoPopupStateKey(activeCandidates);
            if (nextStateKey === lastMemoPopupStateKey) return;
            syncMemoPopups(activeCandidates, { forceFullPass: false });
            return;
        }
        syncMemoPopups(useFullPass ? null : candidates, { forceFullPass: useFullPass });
    });
    const scheduleApply = ({ elements = null, forceFullPass = false } = {}) => {
        collectMemoPopupCandidates(elements, { forceFullPass });
        memoPopupScheduler.schedule();
    };
    const scheduleMemoPopupOpenFollowups = () => {
        clearMemoPopupOpenFollowups();
        memoPopupOpenFollowupRafId = requestAnimationFrame(() => {
            memoPopupOpenFollowupRafId = 0;
            scheduleApply({ forceFullPass: true });
        });
        [70, 180].forEach((delay) => {
            const timerId = window.setTimeout(() => {
                memoPopupOpenFollowupTimerIds.delete(timerId);
                scheduleApply({ forceFullPass: true });
            }, delay);
            memoPopupOpenFollowupTimerIds.add(timerId);
        });
    };

    const observe = () => {
        if (window.__dcufListMemoPopupMutationUnsubscribe || window.__dcufListMemoPopupObserver) return;
        const unsubscribe = __dcufSubscribeMutationBus('list-memo-popup', (payload) => {
            const relevantNodes = __dcufCollectMatches(payload, [POPUP_SELECTOR, '.custom-mobile-list', '.custom-post-item', '.view_content_wrap'], { includeRoots: true });
            if (relevantNodes.length > 0) {
                scheduleApply({ elements: relevantNodes });
            }
        });
        if (typeof unsubscribe === 'function') {
            window.__dcufListMemoPopupMutationUnsubscribe = unsubscribe;
            return;
        }

        if (!document.body) return;
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
                        scheduleApply({ elements: [mutation.target, ...Array.from(mutation.addedNodes || []), ...Array.from(mutation.removedNodes || [])] });
                        return;
                    }
                }
                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    if (target instanceof Element && target.matches(POPUP_SELECTOR)) {
                        scheduleApply({ elements: [target] });
                        return;
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });

        window.__dcufListMemoPopupObserver = observer;
    };

    const bindEvents = () => {
        if (window.__dcufListMemoPopupBound) return;
        document.addEventListener('click', (event) => {
            if (!isRelevantMemoEventTarget(event.target)) return;
            const forceFullPass = event.target instanceof Element && Boolean(event.target.closest(MEMO_FORCE_FULLPASS_EVENT_SELECTOR));
            if (forceFullPass) scheduleMemoPopupOpenFollowups();
            scheduleApply(forceFullPass
                ? { forceFullPass: true }
                : { elements: [event.target].filter(Boolean) });
        }, true);
        document.addEventListener('mouseup', (event) => {
            if (!isRelevantMemoEventTarget(event.target)) return;
            const forceFullPass = event.target instanceof Element && Boolean(event.target.closest(MEMO_FORCE_FULLPASS_EVENT_SELECTOR));
            if (forceFullPass) scheduleMemoPopupOpenFollowups();
            scheduleApply(forceFullPass
                ? { forceFullPass: true }
                : { elements: [event.target].filter(Boolean) });
        }, true);
        document.addEventListener('keyup', (event) => {
            if (!isRelevantMemoEventTarget(event.target)) return;
            const forceFullPass = event.target instanceof Element && Boolean(event.target.closest(MEMO_FORCE_FULLPASS_EVENT_SELECTOR));
            if (forceFullPass) scheduleMemoPopupOpenFollowups();
            scheduleApply(forceFullPass
                ? { forceFullPass: true }
                : { elements: [event.target].filter(Boolean) });
        }, true);
        window.addEventListener('scroll', () => {
            const activeCandidates = getActiveMemoPopupCandidates();
            if (activeCandidates.length === 0) return;
            scheduleApply({ elements: activeCandidates });
        }, true);
        window.addEventListener('resize', () => {
            const activeCandidates = getActiveMemoPopupCandidates();
            if (activeCandidates.length === 0) return;
            scheduleApply({ elements: activeCandidates });
        }, true);
        window.__dcufListMemoPopupBound = true;
    };

    injectStyle();
    scheduleApply({ forceFullPass: true });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            injectStyle();
            scheduleApply({ forceFullPass: true });
            observe();
            bindEvents();
        }, { once: true });
    } else {
        observe();
        bindEvents();
    }

    window.addEventListener('load', () => {
        injectStyle();
        scheduleApply({ forceFullPass: true });
    }, { once: true });
})();
(() => {
    if ((window.location.pathname || '').indexOf('/board/lists') !== -1) return;

    const WRITER_SCOPE = '.view_content_wrap .gallview_head .gall_writer.ub-writer';

    const isPopupVisible = () => {
        const popup = document.getElementById('user_data_lyr') || document.querySelector('.user_data');
        if (!(popup instanceof HTMLElement)) return false;
        const cs = window.getComputedStyle(popup);
        return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity || '1') > 0;
    };

    const recoverSelectionModeIfStale = () => {
        try {
            if (typeof PersonalBlockModule === 'undefined' || !PersonalBlockModule) return;
            if (!PersonalBlockModule.isSelectionMode) return;
            if (document.getElementById('dc-selection-popup')) return;
            if (typeof PersonalBlockModule.exitSelectionMode === 'function') {
                PersonalBlockModule.exitSelectionMode();
            }
        } catch (_) {
            // ignore
        }
    };

    const emitMouseSequence = (element) => {
        if (!(element instanceof HTMLElement)) return;
        const init = { bubbles: true, cancelable: true, view: window };
        element.dispatchEvent(new MouseEvent('mousedown', init));
        element.dispatchEvent(new MouseEvent('mouseup', init));
        element.dispatchEvent(new MouseEvent('click', init));
    };

    const tryOpenWriterPopup = (writer) => {
        if (!(writer instanceof HTMLElement)) return;
        if (window.__dcufWriterPopupBridgeLock) return;
        if (isPopupVisible()) return;

        window.__dcufWriterPopupBridgeLock = true;
        try {
            const icon = writer.querySelector('.writer_nikcon');
            if (icon instanceof HTMLElement) emitMouseSequence(icon);
            if (!isPopupVisible()) emitMouseSequence(writer);
            if (!isPopupVisible()) {
                const nickname = writer.querySelector('.nickname');
                if (nickname instanceof HTMLElement) emitMouseSequence(nickname);
            }
        } finally {
            window.setTimeout(() => {
                window.__dcufWriterPopupBridgeLock = false;
            }, 0);
        }
    };

    const onHeaderWriterClick = (event) => {
        recoverSelectionModeIfStale();
        if (window.__dcufWriterPopupBridgeLock) return;

        const target = event.target;
        if (!(target instanceof Element)) return;
        const writer = target.closest(WRITER_SCOPE);
        if (!(writer instanceof HTMLElement)) return;
        if (target.closest('#user_data_lyr, .user_data')) return;

        window.setTimeout(() => {
            recoverSelectionModeIfStale();
            if (isPopupVisible()) return;
            tryOpenWriterPopup(writer);
        }, 90);
    };

    const bind = () => {
        if (window.__dcufWriterPopupBridgeBound) return;
        document.addEventListener('click', onHeaderWriterClick, true);
        document.addEventListener('mouseup', onHeaderWriterClick, true);
        window.__dcufWriterPopupBridgeBound = true;
    };

    recoverSelectionModeIfStale();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            recoverSelectionModeIfStale();
            bind();
        }, { once: true });
    } else {
        bind();
    }

    window.addEventListener('load', recoverSelectionModeIfStale, { once: true });
})();

function __dcufGetRuntimeCoordinator() {
    return window.__dcufRuntimeCoordinator || null;
}

function __dcufCreatePhaseScheduler(label, run, delays = []) {
    const runtimeCoordinator = __dcufGetRuntimeCoordinator();
    if (runtimeCoordinator && typeof runtimeCoordinator.createPhaseScheduler === 'function') {
        return runtimeCoordinator.createPhaseScheduler(label, run, { delays });
    }

    let rafId = 0;
    const timerIds = new Set();
    const clearTimers = () => {
        timerIds.forEach((timerId) => clearTimeout(timerId));
        timerIds.clear();
    };

    return {
        schedule(meta = null) {
            if (rafId) cancelAnimationFrame(rafId);
            clearTimers();

            rafId = requestAnimationFrame(() => {
                rafId = 0;
                run({ label, phase: 'raf', delay: 0, meta });
                delays.forEach((delay) => {
                    const timerId = window.setTimeout(() => {
                        timerIds.delete(timerId);
                        run({ label, phase: `delay:${delay}`, delay, meta });
                    }, delay);
                    timerIds.add(timerId);
                });
            });
        },
        cancel() {
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = 0;
            }
            clearTimers();
        },
        flush(meta = null) {
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = 0;
            }
            clearTimers();
            run({ label, phase: 'flush', delay: 0, meta });
        }
    };
}

function __dcufSubscribeMutationBus(key, listener) {
    const runtimeCoordinator = __dcufGetRuntimeCoordinator();
    if (!runtimeCoordinator || typeof runtimeCoordinator.subscribeMutations !== 'function') return null;
    return runtimeCoordinator.subscribeMutations(key, listener);
}

function __dcufCollectMatches(payload, selectors, options = {}) {
    if (payload && typeof payload.collectMatches === 'function') {
        return payload.collectMatches(selectors, options);
    }
    const selectorText = Array.isArray(selectors) ? selectors.filter(Boolean).join(', ') : selectors;
    if (!selectorText) return [];
    return Array.from(document.querySelectorAll(selectorText));
}
