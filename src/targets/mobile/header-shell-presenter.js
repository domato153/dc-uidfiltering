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
        ${selectors.spriteButton} {
            position: relative;
            border: 0;
            background-color: transparent !important;
            background-image: none !important;
            color: var(--dcuf-theme-fg) !important;
        }
        ${selectors.login},
        ${selectors.logout} {
            border-color: var(--dcuf-theme-accent-ink);
            background-color: var(--dcuf-theme-accent-strong) !important;
            background-image: none !important;
            color: var(--dcuf-theme-on-accent) !important;
        }
        ${selectors.searchInset} {
            border: 1px solid var(--dcuf-theme-border);
            border-radius: 9px;
            background: var(--dcuf-theme-surface-input);
            box-shadow: inset 0 1px 3px #1f454908;
        }
        ${selectors.searchField} {
            border: 0;
            background-color: transparent;
            color: var(--dcuf-theme-fg);
        }
        ${selectors.buttonDecoration},
        ${selectors.spriteDecoration} {
            content: "";
            display: block;
            position: absolute;
            left: 50%;
            top: 50%;
            width: 12px;
            height: 12px;
            margin: -8px 0 0 -8px;
            border: 1.5px solid currentColor;
            border-radius: 50%;
            background: none;
            box-shadow: none;
            pointer-events: none;
        }
        ${selectors.searchButton}::after,
        ${selectors.spriteButton}::after {
            content: "";
            position: absolute;
            left: 50%;
            top: 50%;
            width: 7px;
            height: 1.5px;
            background: currentColor;
            transform: translate(4px, 5px) rotate(45deg);
            transform-origin: left center;
            pointer-events: none;
        }
        ${selectors.searchButton}:hover {
            background-color: var(--dcuf-theme-surface-muted) !important;
        }
        ${selectors.searchButton}:focus-visible {
            outline: 2px solid var(--dcuf-theme-accent-ink);
            outline-offset: -2px;
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
            || Reflect.ownKeys(selectors).length !== 14
            || !["root","head","logo","logoImage","logoImageAlt","searchWrap","topSearch","links","darkRoot","layout","bridge","brandMark","searchField","nativeTip"].every(slot => {
                const field = Object.getOwnPropertyDescriptor(selectors, slot);
                return field && typeof field.value === 'string' && field.value.trim();
            })) {
            throw new TypeError('A complete frozen header-shell style selector record is required');
        }
        return Object.freeze({
            key: 'header-shell',
            id: 'dcuf-header-shell-style',
            css: `
        ${selectors.layout} {
            display: grid; grid-template-columns: 142px minmax(180px, 1fr) minmax(190px, 1fr) 116px 132px;
            grid-template-rows: 92px; align-items: center; gap: 0 10px; isolation: isolate;
            --dcuf-b1-backdrop: radial-gradient(ellipse at 50% -240px, color-mix(in srgb, var(--dcuf-theme-accent-soft) 60%, transparent), transparent 900px), var(--dcuf-b1-canvas);
            background: var(--dcuf-b1-backdrop);
        }
        ${selectors.layout} > * { grid-column: 1 / -1; min-width: 0; }
        ${selectors.layout}::before { content: ""; grid-area: 1 / 1 / 2 / -1; align-self: stretch; margin: 12px 10px; border: 1px solid var(--dcuf-b1-rim); border-radius: 15px; background: var(--dcuf-b1-sheen), var(--dcuf-b1-glass); box-shadow: var(--dcuf-b1-shadow), inset 0 1px 0 var(--dcuf-b1-rim), inset 0 -1px 0 color-mix(in srgb, var(--dcuf-theme-fg) 4%, transparent); backdrop-filter: blur(22px) saturate(1.2); z-index: -1; }
        ${selectors.root} { display: contents; min-width: 0 !important; width: 100% !important; height: auto !important; background: transparent; border: 0; }
        ${selectors.root}[data-dcuf-header-layout="self"] { display: grid; z-index: 1005; background: var(--dcuf-b1-backdrop); }
        ${selectors.head} {
            display: contents !important;
            padding: 0;
            position: relative;
            height: auto;
            min-width: 0;
            max-width: 1180px;
            margin-inline: auto;
            box-sizing: border-box;
            width: 100% !important;
        }
        ${selectors.logo} { grid-area: 1 / 1; position: static; inset: auto; float: none; margin: 0 0 0 24px; display: flex; align-items: center; flex-wrap: wrap; gap: 4px; min-width: 0; max-width: 130px; height: auto; overflow: visible; font: italic 850 22px/1.2 system-ui, sans-serif; letter-spacing: -1px; }
        ${selectors.logo} > a { position: static; margin: 0; flex: none; width: auto; height: auto; background: none; color: var(--dcuf-theme-fg); text-decoration: none; }
        ${selectors.brandMark} { width: 112px; height: 22px; background-size: contain; }
        ${selectors.root} ${selectors.logo} > a + a { font-size: 12px; font-weight: 600; color: var(--dcuf-theme-fg-muted); }
        ${selectors.logoImage} { height: 22px; width: auto; max-width: 100%; }
        ${selectors.logoImageAlt} { display: none; }
        ${selectors.searchWrap} { grid-area: 1 / 3; position: relative; inset: auto; margin: 0; width: 100%; min-width: 0; max-width: none; }
        ${selectors.searchWrap} form, ${selectors.searchWrap} fieldset { min-width: 0; width: 100%; padding: 0; margin: 0; border: 0; box-sizing: border-box; }
        ${selectors.topSearch} { display: flex; align-items: center; width: 100%; height: 38px; box-sizing: border-box; }
        ${selectors.topSearch} > div { flex: 1; min-width: 0; height: 100%; margin: 0; float: none; }
        ${selectors.searchField} { width: 100%; min-width: 0; height: 100%; box-sizing: border-box; font-size: 12px; }
        ${selectors.topSearch} button { flex: none; width: 36px; height: 36px; margin: 0; padding: 0; border-radius: 8px; }
        ${selectors.links} { grid-area: 1 / 5; position: static; z-index: 1006; inset: auto; display: flex; justify-content: flex-end; align-items: center; flex-wrap: wrap; gap: 0; width: auto; min-width: 0; margin: 0 24px 0 0; white-space: normal; }
        ${selectors.links} > ul { display: flex; align-items: center; flex-wrap: wrap; gap: 3px; list-style: none; margin: 0; padding: 0; }
        ${selectors.links} > ul > li { float: none; }
        ${selectors.links} > ul[popover]:not(:popover-open) { display: none; }
        ${selectors.links} > ul[popover]:popover-open { position: fixed; inset: 76px 22px auto auto; width: min(280px, calc(100vw - 28px)); max-height: calc(100vh - 100px); overflow: auto; box-sizing: border-box; margin: 0; padding: 12px; flex-direction: column; align-items: stretch; gap: 3px; border: 1px solid var(--dcuf-b1-rim); border-radius: 14px; background: color-mix(in srgb, var(--dcuf-b1-paper) 96%, transparent); color: var(--dcuf-theme-fg); box-shadow: var(--dcuf-b1-shadow), inset 0 1px 0 var(--dcuf-b1-rim); backdrop-filter: blur(24px); }
        ${selectors.links} > ul[popover] > li::before { content: none; display: none; }
        ${selectors.links} > ul[popover] a { display: flex; min-height: 34px; padding-inline: 10px; border-radius: 8px; font: 500 12px/1.4 system-ui, sans-serif; text-decoration: none; }
        ${selectors.links} > ul[popover] a:is(:hover, :focus-visible) { background: var(--dcuf-theme-accent-soft); color: var(--dcuf-theme-accent-ink); }
        ${selectors.links} > [data-dcuf-header-utility-toggle] { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 34px; border: 1px solid var(--dcuf-theme-border); border-radius: 9px; background: var(--dcuf-theme-surface-input); color: var(--dcuf-theme-fg-muted); font: 700 13px/1 system-ui, sans-serif; cursor: pointer; }
        ${selectors.links} > div { flex: none; position: relative; }
        ${selectors.links} a { display: inline-flex; align-items: center; min-height: 24px; padding-inline: 3px; font-size: 10px; color: var(--dcuf-theme-fg-muted); }
        ${selectors.bridge} { grid-area: 1 / 4; min-width: 0; align-self: center; }
        /* The native promotion writes inline top/left; preserve its dismiss handler. */
        ${selectors.nativeTip} { position: fixed; top: auto !important; left: 20px !important; bottom: 20px; right: auto; z-index: 1008; width: max-content; max-width: min(280px, calc(100vw - 40px)); height: auto; padding: 8px 10px; border: 1px solid var(--dcuf-theme-border); border-radius: 10px; background: var(--dcuf-theme-surface-raised); color: var(--dcuf-theme-fg-muted); font: 11px/1.5 system-ui, sans-serif; white-space: normal; box-shadow: var(--dcuf-theme-popup-shadow); box-sizing: border-box; }
        ${selectors.nativeTip} > div { height: auto; padding: 0; border: 0; background: transparent; color: inherit; }
        ${selectors.nativeTip} p { margin: 0; padding: 0; color: inherit; font: inherit; }
        ${selectors.nativeTip}::before, ${selectors.nativeTip}::after, ${selectors.nativeTip} > div::before, ${selectors.nativeTip} > div::after { display: none; }
        @media (max-width: 899px) {
            ${selectors.layout} { grid-template-columns: minmax(0, 1fr) 124px; grid-template-rows: 60px 48px auto; gap: 0 12px; }
            ${selectors.layout}::before { grid-area: 1 / 1 / 4 / -1; margin: 8px; }
            ${selectors.logo} { grid-area: 1 / 1; margin: 0 0 0 22px; }
            ${selectors.links} { grid-area: 1 / 2; margin: 0 16px 0 0; }
            ${selectors.searchWrap} { grid-area: 2 / 1; width: calc(100% - 22px); margin: 0 0 8px 22px; }
            ${selectors.bridge} { grid-area: 2 / 2; }
        }
        ${selectors.darkRoot} ${selectors.logo} > a:first-child { filter: brightness(0) invert(1); }
`
        });
    }
    const __dcufHeaderShellPresenter = (() => {
        const style = __dcufBuildHeaderShellStyle(__dcufDescribeHeaderShellStyleSelectors());
        const utilityToggle = Object.freeze({ text: '•••', label: '서비스 메뉴' });
        return Object.freeze({ style, buildStyle: __dcufBuildHeaderShellStyle, buildThemeCss: __dcufBuildHeaderShellThemeCss, buildResetCss: __dcufBuildHeaderShellResetCss, describeUtilityToggle: () => utilityToggle });
    })();
    __dcufRoot.__dcufHeaderShellPresenter = __dcufHeaderShellPresenter;
