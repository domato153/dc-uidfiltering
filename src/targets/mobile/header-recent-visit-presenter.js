    // Hoisted to preserve the existing early palette injection phase.
    function __dcufBuildHeaderRecentVisitThemeCss(ROOT_ATTRIBUTE) {
        return `
        html[${ROOT_ATTRIBUTE}] body .newvisit_history > .tit,
        html[${ROOT_ATTRIBUTE}] body .newvisit_history > :is(.btn_open, .bnt_newvisit_more),
        html[${ROOT_ATTRIBUTE}] body .newvisit_history .newvisit_list a.on {
            color: var(--dcuf-theme-accent) !important;
        }
`;
    }
    const __dcufHeaderRecentVisitPresenter = (() => {
        const style = Object.freeze({
            key: 'header-recent-visit',
            id: 'dcuf-header-recent-visit-style',
            css: `
        [data-dcuf-header-recent-visit-role="root"] { display: flex !important; align-items: center; width: 100% !important; min-width: 0 !important; height: auto !important; padding: 8px 10px !important; background: #f8f9fa !important; border: none !important; box-sizing: border-box !important; gap: 5px; }
        [data-dcuf-header-recent-visit-role="root"]::before { display: none !important; }
        [data-dcuf-header-recent-visit-role="root"] > [data-dcuf-header-recent-visit-role="title"] { flex-shrink: 0; margin: 0 !important; padding-right: 5px; font-size: 14px !important; font-weight: bold; color: #333; }
        [data-dcuf-header-recent-visit-role="root"] > [data-dcuf-header-recent-visit-role="box"] { flex: 1; min-width: 0; overflow: hidden; }
        [data-dcuf-header-recent-visit-role="root"] [data-dcuf-header-recent-visit-role="list"] { display: flex; flex-wrap: nowrap; position: relative !important; left: 0 !important; margin-left: 0 !important; width: 100% !important; box-sizing: border-box; overflow-x: auto; scroll-behavior: smooth; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        [data-dcuf-header-recent-visit-role="root"] [data-dcuf-header-recent-visit-role="list"]::-webkit-scrollbar { display: none; }
        [data-dcuf-header-recent-visit-role="root"] [data-dcuf-header-recent-visit-role="item"] { white-space: nowrap; flex-shrink: 0; }
        [data-dcuf-header-recent-visit-role="root"] > :is([data-dcuf-header-recent-visit-role="control"], [data-dcuf-header-recent-visit-role="arrow"]) { display: inline-flex !important; align-items: center; justify-content: center; flex: 0 0 auto; position: static !important; inset: auto !important; transform: none !important; margin: 0 !important; padding: 0 4px; overflow: visible !important; }
        [data-dcuf-header-recent-visit-role="root"] > [data-dcuf-header-recent-visit-role="arrow"] { min-width: 22px; min-height: 24px; }
        .dc-filter-dark-mode [data-dcuf-header-recent-visit-role="root"] { background: #1c1c1e !important; border-bottom-color: #3a3a3c !important; }
        .dc-filter-dark-mode [data-dcuf-header-recent-visit-role="root"] > [data-dcuf-header-recent-visit-role="title"] { color: #e0e0e0 !important; }
`
        });
        return Object.freeze({ style, buildThemeCss: __dcufBuildHeaderRecentVisitThemeCss });
    })();
    __dcufRoot.__dcufHeaderRecentVisitPresenter = __dcufHeaderRecentVisitPresenter;
