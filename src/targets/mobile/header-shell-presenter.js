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
            display: grid !important;
            grid-template-columns: minmax(180px, .7fr) minmax(240px, 1.3fr);
            grid-template-areas: "brand search" "utilities utilities";
            align-items: center;
            gap: 8px 28px;
            padding: 18px 24px 10px;
            position: relative;
            height: auto;
            min-width: 0;
            max-width: 1180px;
            margin-inline: auto;
            box-sizing: border-box;
            width: 100% !important;
        }
        ${selectors.logo} { grid-area: brand; position: static; inset: auto; float: none; margin: 0; display: flex; align-items: center; gap: 10px; min-width: 0; font: 800 24px/1.2 system-ui, sans-serif; letter-spacing: -.6px; }
        ${selectors.logo} > a { position: static; margin: 0; flex: none; color: var(--dcuf-theme-fg); text-decoration: none; }
        ${selectors.root} ${selectors.logo} > a + a { font-size: 12px; font-weight: 600; color: var(--dcuf-theme-fg-muted); }
        ${selectors.logoImage} { height: 22px; width: auto; }
        ${selectors.logoImageAlt} { display: none; }
        ${selectors.searchWrap} { grid-area: search; position: relative; inset: auto; margin: 0; width: 100%; min-width: 0; max-width: none; }
        ${selectors.topSearch} { display: flex; align-items: center; width: 100%; height: 44px; box-sizing: border-box; }
        ${selectors.topSearch} > div { flex: 1; min-width: 0; }
        ${selectors.topSearch} button { flex: none; width: 44px; height: 42px; margin: 0; }
        ${selectors.links} { grid-area: utilities; position: static; inset: auto; display: flex; justify-content: flex-end; align-items: center; flex-wrap: wrap; gap: 8px; width: 100%; min-width: 0; margin: 0; white-space: normal; }
        ${selectors.links} > ul { display: flex; align-items: center; flex-wrap: wrap; gap: 3px; list-style: none; margin: 0; padding: 0; }
        ${selectors.links} > ul > li { float: none; }
        ${selectors.links} > div { flex: none; }
        ${selectors.links} a { display: inline-flex; align-items: center; min-height: 26px; padding-inline: 4px; font-size: 11px; color: var(--dcuf-theme-fg-muted); }
        @media (max-width: 759px) {
            ${selectors.head} { grid-template-columns: minmax(0, 1fr); grid-template-areas: "brand" "search" "utilities"; padding: 16px; gap: 10px; }
            ${selectors.links} { justify-content: flex-start; }
        }
        ${selectors.darkRoot} ${selectors.logo} > a:first-child { filter: brightness(0) invert(1); }
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
