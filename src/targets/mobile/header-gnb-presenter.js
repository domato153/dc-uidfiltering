    // Hoisted to preserve the existing early palette injection phase.
    function __dcufBuildHeaderGnbThemeCss(selectors) {
        if (!selectors || typeof selectors !== 'object' || !Object.isFrozen(selectors)
            || Reflect.ownKeys(selectors).length !== 2
            || !["root","nextIcon"].every(slot => {
                const field = Object.getOwnPropertyDescriptor(selectors, slot);
                return field && typeof field.value === 'string' && field.value.trim();
            })) {
            throw new TypeError('A complete frozen header-gnb theme selector record is required');
        }
        return `
        ${selectors.root} {
            border-color: var(--dcuf-theme-accent-strong) !important;
            background-color: var(--dcuf-theme-accent-strong) !important;
            background-image: none !important;
            color: var(--dcuf-theme-on-accent) !important;
        }
        ${selectors.nextIcon} {
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
    function __dcufBuildHeaderGnbResetCss(selectors) {
        if (!selectors || typeof selectors !== 'object' || !Object.isFrozen(selectors)
            || Reflect.ownKeys(selectors).length !== 1
            || !["root"].every(slot => {
                const field = Object.getOwnPropertyDescriptor(selectors, slot);
                return field && typeof field.value === 'string' && field.value.trim();
            })) {
            throw new TypeError('A complete frozen header-gnb reset selector record is required');
        }
        return `
        ${selectors.root} {
            width: 100% !important;
            min-width: 0 !important; float: none !important;
            position: relative !important; box-sizing: border-box !important;
            margin: 0 !important; padding: 0 !important;
        }
`;
    }
    // Pure and hoisted: preserve complete late CSS before adapter objects initialize.
    function __dcufBuildHeaderGnbStyle(selectors) {
        if (!selectors || typeof selectors !== 'object' || !Object.isFrozen(selectors)
            || Reflect.ownKeys(selectors).length !== 3
            || !["root","nav","list"].every(slot => {
                const field = Object.getOwnPropertyDescriptor(selectors, slot);
                return field && typeof field.value === 'string' && field.value.trim();
            })) {
            throw new TypeError('A complete frozen header-gnb style selector record is required');
        }
        return Object.freeze({
            key: 'header-gnb',
            id: 'dcuf-header-gnb-style',
            css: `
        ${selectors.root} { display: block !important; width: 100% !important; min-width: 0 !important; height: auto !important; box-sizing: border-box !important; background: #3b4890 !important; }
        ${selectors.nav} { width: auto !important; min-width: 0 !important; padding: 0 15px !important; display: flex !important; justify-content: center !important; }
        ${selectors.list} { display: flex; flex-wrap: wrap; justify-content: space-around; width: 100% !important; }
`
        });
    }
    const __dcufHeaderGnbPresenter = (() => {
        const style = __dcufBuildHeaderGnbStyle(__dcufDescribeHeaderGnbStyleSelectors());
        return Object.freeze({ style, buildStyle: __dcufBuildHeaderGnbStyle, buildThemeCss: __dcufBuildHeaderGnbThemeCss, buildResetCss: __dcufBuildHeaderGnbResetCss });
    })();
    __dcufRoot.__dcufHeaderGnbPresenter = __dcufHeaderGnbPresenter;
