    // dcuf-concept01-visual-v1: approved presentation delta; see CONCEPT01_TRIAL.md.
    // Hoisted: the palette mounts before presenter objects initialize.
    // The target adapter supplies native selector knowledge explicitly.
    function __dcufBuildHeaderShellThemeCss(selectors) {
        if (!selectors || typeof selectors !== 'object' || !Object.isFrozen(selectors)
            || Reflect.ownKeys(selectors).length !== 10
            || !["root","search","searchButton","spriteButton","login","logout","searchInset","searchField","buttonDecoration","spriteDecoration"].every(slot => {
                const field = Object.getOwnPropertyDescriptor(selectors, slot);
                return field && typeof field.value === 'string' && field.value.trim();
            })) {
            throw new TypeError('A complete frozen header-shell theme selector record is required');
        }
        return `
        ${selectors.root} {
            border-color: var(--dcuf-theme-border-strong);
        }
        ${selectors.searchButton},
        ${selectors.spriteButton},
        ${selectors.login},
        ${selectors.logout} {
            border-color: var(--dcuf-theme-accent-ink);
            background-color: var(--dcuf-theme-accent-strong) !important;
            background-image: none !important;
            color: var(--dcuf-theme-on-accent) !important;
        }
        ${selectors.searchInset} {
            border: 1px solid var(--dcuf-theme-border-strong);
            border-radius: 8px;
            background: var(--dcuf-theme-surface-input);
            box-shadow: none;
        }
        ${selectors.searchField} {
            border-color: transparent;
            background-color: var(--dcuf-theme-surface-input);
            color: var(--dcuf-theme-fg);
        }
        ${selectors.buttonDecoration},
        ${selectors.spriteDecoration} {
            content: "";
            display: block;
            width: 12px;
            height: 12px;
            margin: auto;
            border: 3px solid var(--dcuf-theme-on-accent);
            border-radius: 50%;
            box-shadow: 7px 7px 0 -5px var(--dcuf-theme-on-accent);
        }
`;
    }
    // Keep the legacy reset at its original core-filter phase, including roots
    // not yet projected or not matching typea. This is inherited cascade debt.
    function __dcufBuildHeaderShellResetCss(selectors) {
        if (!selectors || typeof selectors !== 'object' || !Object.isFrozen(selectors)
            || Reflect.ownKeys(selectors).length !== 1
            || !["root"].every(slot => {
                const field = Object.getOwnPropertyDescriptor(selectors, slot);
                return field && typeof field.value === 'string' && field.value.trim();
            })) {
            throw new TypeError('A complete frozen header-shell reset selector record is required');
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
    function __dcufBuildHeaderShellStyle(selectors) {
        if (!selectors || typeof selectors !== 'object' || !Object.isFrozen(selectors)
            || Reflect.ownKeys(selectors).length !== 9
            || !["root","head","logo","logoImage","logoImageAlt","searchWrap","topSearch","links","darkRoot"].every(slot => {
                const field = Object.getOwnPropertyDescriptor(selectors, slot);
                return field && typeof field.value === 'string' && field.value.trim();
            })) {
            throw new TypeError('A complete frozen header-shell style selector record is required');
        }
        return Object.freeze({
            key: 'header-shell',
            id: 'dcuf-header-shell-style',
            css: `
        ${selectors.root} { min-width: 0 !important; width: 100% !important; height: auto !important; background: var(--dcuf-theme-surface, #fff); border-bottom: 1px solid var(--dcuf-theme-border, #e2e7e5); }
        ${selectors.head} {
            display: flex !important;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            gap: 24px;
            min-width: 320px;
            box-sizing: border-box;
            width: 100% !important;
        }
        ${selectors.logo} { flex-shrink: 0; margin: 0; display: block; }
        ${selectors.logoImage} { height: 22px; width: auto; }
        ${selectors.logoImageAlt} { display: none; }
        ${selectors.searchWrap} { flex-grow: 1; min-width: 100px; max-width: 600px; }
        ${selectors.topSearch} { width: 100%; }
        ${selectors.links} { display: flex; flex-shrink: 0; white-space: nowrap; }
        ${selectors.links} a { font-size: 12px; color: var(--dcuf-theme-fg-muted); }
        ${selectors.darkRoot} {
            background: var(--dcuf-theme-surface, #1b2021);
            border-bottom-color: var(--dcuf-theme-border, #343c3d);
        }
`
        });
    }
    const __dcufHeaderShellPresenter = (() => {
        const style = __dcufBuildHeaderShellStyle(__dcufDescribeHeaderShellStyleSelectors());
        return Object.freeze({ style, buildStyle: __dcufBuildHeaderShellStyle, buildThemeCss: __dcufBuildHeaderShellThemeCss, buildResetCss: __dcufBuildHeaderShellResetCss });
    })();
    __dcufRoot.__dcufHeaderShellPresenter = __dcufHeaderShellPresenter;
