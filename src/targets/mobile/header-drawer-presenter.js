    // Palette accents apply to the original host issue root, including before
    // drawer roles are projected. Keep that timing and native ancestry intact.
    function __dcufBuildHeaderDrawerThemeCss(ROOT_ATTRIBUTE) {
        return `
        html[${ROOT_ATTRIBUTE}] body .issue_wrap {
            border-top-color: var(--dcuf-theme-accent) !important;
            box-shadow: inset 0 2px 0 color-mix(in srgb, var(--dcuf-theme-accent) 78%, transparent) !important;
        }
`;
    }
    // Preserve initial concealment before roles project and popup-only state:
    // the adapter keeps the exact open marker while an original popup is open.
    function __dcufBuildHeaderDrawerVisibilityCss() {
        return `
        .issue_contentbox:not([data-dcuf-header-native-door-open="1"]),
        #gall_top_recom.concept_wrap:not([data-dcuf-header-native-recom-open="1"]) {
            display: none !important;
        }
`;
    }
    const __dcufHeaderDrawerPresenter = (() => {
        const closedState = Object.freeze({ dataOpen: '0', ariaExpanded: 'false', label: '갤러리 대문 열기' });
        const openState = Object.freeze({ dataOpen: '1', ariaExpanded: 'true', label: '갤러리 대문 닫기' });
        const describeOpenState = (snapshot) => snapshot.open ? openState : closedState;
        const openIntent = Object.freeze({ type: 'surface/open', surface: 'header-drawer' });
        const closeIntent = Object.freeze({ type: 'surface/close', surface: 'header-drawer' });
        const describeToggleIntent = (snapshot) => snapshot.open ? closeIntent : openIntent;
        const openBodyStyles = Object.freeze([
            { name: 'display', value: 'block', priority: 'important' },
            { name: 'visibility', value: 'visible', priority: 'important' },
            { name: 'opacity', value: '1', priority: 'important' },
            { name: 'pointer-events', value: 'auto', priority: 'important' },
            { name: 'overflow', value: 'visible', priority: 'important' },
        ].map(Object.freeze));
        const closedBodyStyles = Object.freeze([
            { name: 'max-height', value: '0px', priority: 'important' },
            { name: 'opacity', value: '0', priority: 'important' },
            { name: 'visibility', value: 'hidden', priority: 'important' },
            { name: 'pointer-events', value: 'none', priority: 'important' },
            { name: 'overflow', value: 'hidden', priority: 'important' },
            { name: 'display', value: 'none', priority: 'important' },
        ].map(Object.freeze));
        const describeBodyVisibility = (snapshot) => snapshot.open ? openBodyStyles : closedBodyStyles;
        const describeBodyOffset = (snapshot) => Object.freeze({
            name: '--dcuf-header-drawer-inline-start', value: `${snapshot.inlineStart}px`, priority: ''
        });
        const describeBodyHeight = (snapshot) => Object.freeze({
            name: 'max-height', value: `${snapshot.height}px`, priority: 'important'
        });
        const describeBodyPadding = (snapshot) => Object.freeze({
            paddingTop: snapshot.hasChildren ? `${snapshot.height}px` : ''
        });
        const shell = Object.freeze({
            tagName: 'div',
            className: 'dcuf-header-drawer',
            initialState: closedState,
            html: `
                    <button type="button" class="dcuf-header-drawer__toggle" aria-expanded="false">
                        <span class="dcuf-header-drawer__toggle-label">${closedState.label}</span>
                    </button>
                    <div class="dcuf-header-drawer__body">
                        <div class="dcuf-header-drawer__body-inner"></div>
                    </div>
                `
        });
        const style = Object.freeze({
            key: 'header-drawer',
            id: 'dcuf-header-drawer-style',
            css: `
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-actions="1"] {
                position: relative !important;
                overflow: visible !important;
            }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer="1"] {
                position: relative !important;
                z-index: 3;
                margin: 0 !important;
                padding: 0 !important;
                display: inline-flex !important;
                align-items: center !important;
                flex: 0 0 auto !important;
            }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer="1"] .dcuf-header-drawer__toggle {
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
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer="1"] .dcuf-header-drawer__toggle::after {
                content: "\\25be";
                font-size: 10px !important;
                transition: transform 0.18s ease !important;
            }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer="1"][data-open="1"] .dcuf-header-drawer__toggle::after {
                transform: rotate(180deg) !important;
            }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer="1"] .dcuf-header-drawer__body {
                display: none !important;
                max-height: 0 !important;
                opacity: 0 !important;
                visibility: hidden !important;
                margin-top: 0 !important;
                position: absolute !important;
                top: calc(100% + 8px) !important;
                left: var(--dcuf-header-drawer-inline-start, 0px);
                right: auto;
                width: min(640px, calc(100vw - 24px)) !important;
                max-width: calc(100vw - 24px) !important;
                overflow: hidden !important;
                pointer-events: none !important;
                z-index: 60 !important;
                transition: opacity 0.18s ease !important;
            }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer="1"][data-open="1"] .dcuf-header-drawer__body {
                display: block !important;
                opacity: 1 !important;
                visibility: visible !important;
                margin-top: 0 !important;
                pointer-events: auto !important;
                overflow: visible !important;
            }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer="1"] .dcuf-header-drawer__body-inner:not(:empty) {
                min-height: 0 !important;
                overflow: visible !important;
                display: grid !important;
                gap: 0 !important;
                border: 1px solid var(--dcuf-border, #dfe5ee) !important;
                background: #fff !important;
                box-shadow: 0 10px 22px rgba(12, 22, 40, 0.12) !important;
            }
            [data-dcuf-header-drawer-scope="1"] .issue_wrap .issue_contentbox[data-dcuf-header-native-door="1"][data-dcuf-header-native-door-open="1"] {
                display: block;
                visibility: visible;
                opacity: 1;
                position: fixed;
                left: var(--dcuf-header-native-door-left, 12px);
                top: var(--dcuf-header-native-door-top, 12px);
                width: min(640px, calc(100vw - 24px));
                max-width: calc(100vw - 24px);
                min-width: 0;
                height: auto;
                margin: 0;
                float: none;
                box-sizing: border-box;
                border: 1px solid var(--dcuf-border, #dfe5ee);
                background: #fff;
                box-shadow: 0 10px 22px rgba(12, 22, 40, 0.12);
                overflow: visible;
                z-index: 60;
            }
            [data-dcuf-header-drawer-scope="1"] .issue_wrap .issue_contentbox[data-dcuf-header-native-door="1"][data-dcuf-header-native-door-popup-only="1"] {
                visibility: hidden;
                pointer-events: none;
                border-color: transparent;
                background: transparent;
                box-shadow: none;
            }
            [data-dcuf-header-drawer-scope="1"] .issue_wrap .issue_contentbox[data-dcuf-header-native-door="1"][data-dcuf-header-native-door-popup-only="1"] #hot_rank_pop2,
            [data-dcuf-header-drawer-scope="1"] .issue_wrap .issue_contentbox[data-dcuf-header-native-door="1"][data-dcuf-header-native-door-popup-only="1"] #hot_tip_pop {
                visibility: visible;
                pointer-events: auto;
            }
            [data-dcuf-header-drawer-scope="1"] .issue_wrap .issue_contentbox[data-dcuf-header-native-door="1"][data-dcuf-header-native-door-open="1"] *:not(#hot_rank_pop2):not(#hot_rank_pop2 *) {
                box-sizing: border-box;
                max-width: 100%;
            }
            [data-dcuf-header-drawer-scope="1"] .issue_wrap .issue_contentbox[data-dcuf-header-native-door="1"][data-dcuf-header-native-door-open="1"] .minor_intro_box,
            [data-dcuf-header-drawer-scope="1"] .issue_wrap .issue_contentbox[data-dcuf-header-native-door="1"][data-dcuf-header-native-door-open="1"] .minor_ranking_box {
                width: 100%;
            }
            [data-dcuf-header-drawer-scope="1"] .issue_wrap .issue_contentbox[data-dcuf-header-native-door="1"][data-dcuf-header-native-door-open="1"] .btn_mgall_dcp::before,
            [data-dcuf-header-drawer-scope="1"] .issue_wrap .issue_contentbox[data-dcuf-header-native-door="1"][data-dcuf-header-native-door-open="1"] .under_poply_close::before {
                content: none;
                display: none;
            }
            @media (max-width: 420px), (max-height: 600px) {
                [data-dcuf-header-drawer-scope="1"] .issue_wrap .issue_contentbox[data-dcuf-header-native-door="1"][data-dcuf-header-native-door-open="1"] #hot_tip_pop {
                    right: auto;
                    left: 12px;
                }
            }
            [data-dcuf-header-drawer-scope="1"].dc-filter-dark-mode .issue_wrap .issue_contentbox[data-dcuf-header-native-door="1"][data-dcuf-header-native-door-open="1"],
            [data-dcuf-header-drawer-scope="1"].dc-filter-dark-mode .issue_wrap .issue_contentbox[data-dcuf-header-native-door="1"][data-dcuf-header-native-door-open="1"] .minor_ranking_box {
                background: #1a222e;
                border-color: #3d4c60;
                color: #d2dced;
            }
            [data-dcuf-header-drawer-scope="1"].dc-filter-dark-mode .issue_wrap .issue_contentbox[data-dcuf-header-native-door="1"][data-dcuf-header-native-door-open="1"] .minor_intro_box {
                background: linear-gradient(180deg, #233044 0%, #203044 100%);
                color: #d2dced;
            }
            [data-dcuf-header-drawer-scope="1"] .issue_wrap #gall_top_recom.concept_wrap[data-dcuf-header-native-recom="1"][data-dcuf-header-native-recom-open="1"] {
                display: block;
                visibility: visible;
                position: fixed;
                left: var(--dcuf-header-native-door-left, 12px);
                top: var(--dcuf-header-native-recom-top, 12px);
                width: min(640px, calc(100vw - 24px));
                max-width: calc(100vw - 24px);
                min-width: 0;
                max-height: min(70vh, 520px);
                box-sizing: border-box;
                margin: 0;
                float: none;
                border: 1px solid var(--dcuf-border, #dfe5ee);
                background: #fff;
                box-shadow: 0 10px 22px rgba(12, 22, 40, 0.12);
                overflow: auto;
                z-index: 60;
            }
            [data-dcuf-header-drawer-scope="1"] .issue_wrap #gall_top_recom.concept_wrap[data-dcuf-header-native-recom="1"][data-dcuf-header-native-recom-open="1"] > .pageing_box,
            [data-dcuf-header-drawer-scope="1"] .issue_wrap #gall_top_recom.concept_wrap[data-dcuf-header-native-recom="1"][data-dcuf-header-native-recom-open="1"] > .concept_txtlist,
            [data-dcuf-header-drawer-scope="1"] .issue_wrap #gall_top_recom.concept_wrap[data-dcuf-header-native-recom="1"][data-dcuf-header-native-recom-open="1"] > .concept_img {
                box-sizing: border-box;
                width: 100%;
                max-width: 100%;
                float: none;
            }
            [data-dcuf-header-drawer-scope="1"].dc-filter-dark-mode .issue_wrap #gall_top_recom.concept_wrap[data-dcuf-header-native-recom="1"][data-dcuf-header-native-recom-open="1"] {
                background: #1a222e;
                border-color: #3d4c60;
                color: #d2dced;
            }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-popup="1"] {
                position: fixed !important;
                left: 50% !important;
                top: 50% !important;
                right: auto !important;
                bottom: auto !important;
                margin: 0 !important;
                transform: translate(-50%, -50%) !important;
                z-index: 2147483647 !important;
            }
            @media (max-width: 997px) {
                [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-popup="1"] {
                    box-sizing: border-box;
                    max-width: calc(100vw - 24px);
                    max-height: calc(100vh - 24px);
                    overflow: auto;
                }
            }
            [data-dcuf-header-drawer-scope="1"] .issue_wrap > #relation_popup[data-dcuf-header-relation-popup="1"] {
                z-index: 3;
            }
            [data-dcuf-header-drawer-scope="1"] .issue_wrap > #relation_popup[data-dcuf-header-relation-static="1"] {
                position: relative;
            }
            [data-dcuf-header-drawer-scope="1"].dc-filter-dark-mode [data-dcuf-header-drawer="1"] .dcuf-header-drawer__toggle {
                background: rgba(26, 34, 46, 0.92) !important;
                border-color: #3d4c60 !important;
                color: #d2dced !important;
                box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3) !important;
            }
        
`
        });
        return Object.freeze({ shell, describeOpenState, describeToggleIntent, describeBodyVisibility, describeBodyOffset, describeBodyHeight, describeBodyPadding, style, buildThemeCss: __dcufBuildHeaderDrawerThemeCss, buildVisibilityCss: __dcufBuildHeaderDrawerVisibilityCss });
    })();
    __dcufRoot.__dcufHeaderDrawerPresenter = __dcufHeaderDrawerPresenter;
