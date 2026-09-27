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
        return Object.freeze({ style });
    })();
    __dcufRoot.__dcufHeaderShellPresenter = __dcufHeaderShellPresenter;
