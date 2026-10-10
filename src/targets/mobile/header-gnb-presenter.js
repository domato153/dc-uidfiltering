    // Hoisted to preserve the existing early palette injection phase.
    function __dcufBuildHeaderGnbThemeCss(ROOT_ATTRIBUTE) {
        return `
        html[${ROOT_ATTRIBUTE}] body .gnb_bar {
            border-color: var(--dcuf-theme-accent-strong) !important;
            background-color: var(--dcuf-theme-accent-strong) !important;
            background-image: none !important;
            color: var(--dcuf-theme-on-accent) !important;
        }
        html[${ROOT_ATTRIBUTE}] body .gnb_bar .sp_img.icon_next {
            display: inline-block !important;
            width: 0 !important;
            height: 0 !important;
            margin-left: 8px !important;
            border: 0 solid transparent !important;
            border-right-width: 7px !important;
            border-left-width: 7px !important;
            border-top: 10px solid var(--dcuf-theme-on-accent) !important;
            background: none !important;
            filter: none !important;
            vertical-align: middle !important;
        }
`;
    }
    // Hoisted, pure, and consumed by the existing core phase before projection.
    function __dcufBuildHeaderGnbResetCss() {
        return `
        .gnb_bar {
            width: 100% !important;
            min-width: 0 !important; float: none !important;
            position: relative !important; box-sizing: border-box !important;
            margin: 0 !important; padding: 0 !important;
        }
`;
    }
    const __dcufHeaderGnbPresenter = (() => {
        const style = Object.freeze({
            key: 'header-gnb',
            id: 'dcuf-header-gnb-style',
            css: `
        [data-dcuf-header-gnb-role="root"] { display: block !important; width: 100% !important; min-width: 0 !important; height: auto !important; box-sizing: border-box !important; background: #3b4890 !important; }
        [data-dcuf-header-gnb-role="root"] nav[data-dcuf-header-gnb-role="nav"] { width: auto !important; min-width: 0 !important; padding: 0 15px !important; display: flex !important; justify-content: center !important; }
        [data-dcuf-header-gnb-role="root"] [data-dcuf-header-gnb-role="list"] { display: flex; flex-wrap: wrap; justify-content: space-around; width: 100% !important; }
`
        });
        return Object.freeze({ style, buildThemeCss: __dcufBuildHeaderGnbThemeCss, buildResetCss: __dcufBuildHeaderGnbResetCss });
    })();
    __dcufRoot.__dcufHeaderGnbPresenter = __dcufHeaderGnbPresenter;
