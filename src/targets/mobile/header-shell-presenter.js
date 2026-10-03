    // Hoisted: the palette mounts before presenter objects initialize. Keep its
    // original selectors/cascade until the separate semantic-marker transition.
    function __dcufBuildHeaderShellThemeCss(ROOT_ATTRIBUTE) {
        return `
        html[${ROOT_ATTRIBUTE}] body .dcheader.typea {
            border-color: var(--dcuf-theme-border-strong) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .dchead .top_search,
        html[${ROOT_ATTRIBUTE}] body .dchead .top_search .bnt_search,
        html[${ROOT_ATTRIBUTE}] body .dchead .top_search button.sp_img.bnt_search,
        html[${ROOT_ATTRIBUTE}] body .dchead .area_links .btn_login,
        html[${ROOT_ATTRIBUTE}] body .dchead .area_links .btn_top_loginout {
            border-color: var(--dcuf-theme-accent-strong) !important;
            background-color: var(--dcuf-theme-accent-strong) !important;
            background-image: none !important;
            color: var(--dcuf-theme-on-accent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .dchead .top_search {
            box-shadow: inset 0 0 0 1px var(--dcuf-theme-accent-strong) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .dchead .top_search :is(input, .inner_search) {
            border-color: var(--dcuf-theme-accent-strong) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .dchead .top_search .bnt_search::before,
        html[${ROOT_ATTRIBUTE}] body .dchead .top_search button.sp_img.bnt_search::before {
            content: "" !important;
            display: block !important;
            width: 12px !important;
            height: 12px !important;
            margin: auto !important;
            border: 3px solid var(--dcuf-theme-on-accent) !important;
            border-radius: 50% !important;
            box-shadow: 7px 7px 0 -5px var(--dcuf-theme-on-accent) !important;
        }
`;
    }
    // Keep the legacy reset at its original core-filter phase, including roots
    // not yet projected or not matching typea. This is inherited cascade debt.
    function __dcufBuildHeaderShellResetCss() {
        return `
        .dcheader {
            width: 100% !important;
            min-width: 0 !important; float: none !important;
            position: relative !important; box-sizing: border-box !important;
            margin: 0 !important; padding: 0 !important;
        }
`;
    }
    const __dcufHeaderShellPresenter = (() => {
        const style = Object.freeze({
            key: 'header-shell',
            id: 'dcuf-header-shell-style',
            css: `
        [data-dcuf-header-shell-role="root"].typea { min-width: 0 !important; width: 100% !important; height: auto !important; background: #fff; border-bottom: 1px solid #e5e5e5; }
        [data-dcuf-header-shell-role="head"] {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 8px 15px !important;
            gap: 15px !important;
            min-width: 320px;
            box-sizing: border-box !important;
            width: 100% !important;
        }
        [data-dcuf-header-shell-role="head"] h1[data-dcuf-header-shell-role="logo"] { flex-shrink: 0 !important; margin: 0 !important; display: block !important; }
        [data-dcuf-header-shell-role="head"] h1[data-dcuf-header-shell-role="logo"] img:is([data-dcuf-header-shell-role="logo-image"], [data-dcuf-header-shell-role="logo-image-both"]) { height: 22px !important; width: auto !important; }
        [data-dcuf-header-shell-role="head"] h1[data-dcuf-header-shell-role="logo"] img:is([data-dcuf-header-shell-role="logo-image-alt"], [data-dcuf-header-shell-role="logo-image-both"]) { display: none !important; }
        [data-dcuf-header-shell-role="head"] [data-dcuf-header-shell-role="search-wrap"] { flex-grow: 1 !important; min-width: 100px !important; max-width: 600px; }
        [data-dcuf-header-shell-role="head"] [data-dcuf-header-shell-role="top-search"] { width: 100% !important; }
        [data-dcuf-header-shell-role="head"] [data-dcuf-header-shell-role="links"] { display: block !important; flex-shrink: 0 !important; white-space: nowrap !important; }
        body.dc-filter-dark-mode [data-dcuf-header-shell-role="root"].typea {
            background: #1c1c1e !important;
            border-bottom-color: #3a3a3c !important;
        }
`
        });
        return Object.freeze({ style, buildThemeCss: __dcufBuildHeaderShellThemeCss, buildResetCss: __dcufBuildHeaderShellResetCss });
    })();
    __dcufRoot.__dcufHeaderShellPresenter = __dcufHeaderShellPresenter;
