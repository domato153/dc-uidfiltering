    // dcuf-concept01-visual-v1: approved presentation delta; see CONCEPT01_TRIAL.md.
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
            border-color: var(--dcuf-theme-border);
            background-color: transparent;
            background-image: none;
            color: var(--dcuf-theme-fg);
        }
        ${selectors.nextIcon} {
            display: inline-block;
            width: 0;
            height: 0;
            margin-left: 8px;
            border: 0 solid transparent;
            border-right-width: 7px;
            border-left-width: 7px;
            border-top: 10px solid var(--dcuf-theme-fg-muted);
            background: none !important;
            filter: none;
            vertical-align: middle;
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
            || Reflect.ownKeys(selectors).length !== 4
            || !["root","nav","list","darkList"].every(slot => {
                const field = Object.getOwnPropertyDescriptor(selectors, slot);
                return field && typeof field.value === 'string' && field.value.trim();
            })) {
            throw new TypeError('A complete frozen header-gnb style selector record is required');
        }
        return Object.freeze({
            key: 'header-gnb',
            id: 'dcuf-header-gnb-style',
            css: `
        ${selectors.root} { grid-area: 1 / 2; display: block; width: 100% !important; max-width: 1180px; min-width: 0 !important; height: auto; margin: 0; padding: 0; box-sizing: border-box !important; background: transparent; border: 0; }
        ${selectors.nav} { width: 100%; min-width: 0; height: auto; padding: 0; box-sizing: border-box; display: flex !important; justify-content: flex-start; }
        ${selectors.nav} > [data-dcuf-header-gnb-role="summary"] { display: none; }
        ${selectors.list} { display: flex; flex-wrap: wrap; gap: 0 12px; height: auto; justify-content: flex-start; width: 100%; padding: 0; margin: 0; list-style: none; }
        ${selectors.list} > li { flex: none; float: none; width: auto; height: auto; margin: 0; }
        ${selectors.list} > li > a { display: inline-flex; align-items: center; min-height: 28px; height: auto; padding: 0 2px; border: 0; border-bottom: 2px solid transparent; border-radius: 0; background: transparent; color: var(--dcuf-theme-fg-muted); font-size: 11px; line-height: 1.4; text-shadow: none; text-decoration: none; }
        ${selectors.list} > li > a[data-dcuf-header-gnb-role="current-link"],
        ${selectors.list} > li > a:is(:hover, :focus-visible) { background: transparent; border-color: var(--dcuf-theme-accent-ink); color: var(--dcuf-theme-accent-ink); }
        ${selectors.darkList} > li > a[data-dcuf-header-gnb-role="current-link"] { color: var(--dcuf-theme-accent-ink); }
        @media (max-width: 899px) { ${selectors.root} { grid-area: 3 / 1 / 4 / -1; padding: 0 22px 12px; } ${selectors.list} { gap: 0 16px; padding: 0 22px 12px; box-sizing: border-box; } }

`
        });
    }
    const __dcufHeaderGnbPresenter = (() => {
        const style = __dcufBuildHeaderGnbStyle(__dcufDescribeHeaderGnbStyleSelectors());
        return Object.freeze({ style, buildStyle: __dcufBuildHeaderGnbStyle, buildThemeCss: __dcufBuildHeaderGnbThemeCss, buildResetCss: __dcufBuildHeaderGnbResetCss });
    })();
    __dcufRoot.__dcufHeaderGnbPresenter = __dcufHeaderGnbPresenter;
