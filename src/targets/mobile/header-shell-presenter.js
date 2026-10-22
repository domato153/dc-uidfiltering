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
            || Reflect.ownKeys(selectors).length !== 13
            || !["root","head","logo","logoImage","logoImageAlt","searchWrap","topSearch","links","darkRoot","layout","bridge","brandMark","searchField"].every(slot => {
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
            display: grid; grid-template-columns: 160px minmax(160px, 1fr) 124px 174px;
            align-items: center; gap: 0 14px; isolation: isolate;
            background: radial-gradient(ellipse at 50% 0, var(--dcuf-theme-accent-soft) 0, transparent 560px), var(--dcuf-theme-canvas);
            --dcuf-b1-glass: color-mix(in srgb, var(--dcuf-theme-surface-raised, #fff) 88%, transparent);
            --dcuf-b1-rim: color-mix(in srgb, var(--dcuf-theme-border, #dfe5ee) 55%, var(--dcuf-theme-surface, #fff));
        }
        ${selectors.layout} > * { grid-column: 1 / -1; min-width: 0; }
        ${selectors.layout}::before { content: ""; grid-area: 1 / 1 / 3 / -1; align-self: stretch; margin: 12px 10px; border: 1px solid var(--dcuf-b1-rim); border-radius: 15px; background: linear-gradient(120deg, #ffffff12, transparent 60%), var(--dcuf-b1-glass); box-shadow: 0 8px 28px #284c4d0b, inset 0 1px 0 #ffffff24; backdrop-filter: blur(22px) saturate(1.15); z-index: -1; }
        ${selectors.root} { display: contents; min-width: 0 !important; width: 100% !important; height: auto !important; background: transparent; border: 0; }
        ${selectors.root}[data-dcuf-header-layout="self"] { display: grid; }
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
        ${selectors.logo} { grid-area: 1 / 1; position: static; inset: auto; float: none; margin: 28px 0 12px 26px; display: flex; align-items: center; flex-wrap: wrap; gap: 4px; min-width: 0; max-width: 148px; height: auto; overflow: visible; font: italic 850 22px/1.2 system-ui, sans-serif; letter-spacing: -1px; }
        ${selectors.logo} > a { position: static; margin: 0; flex: none; width: auto; height: auto; background: none; color: var(--dcuf-theme-fg); text-decoration: none; }
        ${selectors.brandMark} { width: 124px; height: 22px; background-size: contain; }
        ${selectors.root} ${selectors.logo} > a + a { font-size: 12px; font-weight: 600; color: var(--dcuf-theme-fg-muted); }
        ${selectors.logoImage} { height: 22px; width: auto; max-width: 100%; }
        ${selectors.logoImageAlt} { display: none; }
        ${selectors.searchWrap} { grid-area: 1 / 2; position: relative; inset: auto; margin: 24px 0 10px; width: 100%; min-width: 0; max-width: none; }
        ${selectors.searchWrap} form, ${selectors.searchWrap} fieldset { min-width: 0; width: 100%; padding: 0; margin: 0; border: 0; box-sizing: border-box; }
        ${selectors.topSearch} { display: flex; align-items: center; width: 100%; height: 38px; box-sizing: border-box; }
        ${selectors.topSearch} > div { flex: 1; min-width: 0; height: 100%; margin: 0; float: none; }
        ${selectors.searchField} { width: 100%; min-width: 0; height: 100%; box-sizing: border-box; font-size: 12px; }
        ${selectors.topSearch} button { flex: none; width: 36px; height: 36px; margin: 0; border-radius: 0 7px 7px 0; }
        ${selectors.links} { grid-area: 1 / 4; position: static; inset: auto; display: flex; justify-content: flex-end; align-items: center; flex-wrap: wrap; gap: 4px; width: auto; min-width: 0; margin: 24px 26px 10px 0; white-space: normal; }
        ${selectors.links} > ul { display: flex; align-items: center; flex-wrap: wrap; gap: 3px; list-style: none; margin: 0; padding: 0; }
        ${selectors.links} > ul > li { float: none; }
        ${selectors.links} > ul[popover]:not(:popover-open) { display: none; }
        ${selectors.links} > ul[popover]:popover-open { position: fixed; inset: 76px 22px auto auto; width: min(280px, calc(100vw - 28px)); max-height: calc(100vh - 100px); overflow: auto; box-sizing: border-box; margin: 0; padding: 12px; flex-direction: column; align-items: stretch; gap: 3px; border: 1px solid var(--dcuf-theme-border); border-radius: 12px; background: var(--dcuf-theme-surface-raised); color: var(--dcuf-theme-fg); box-shadow: var(--dcuf-theme-popup-shadow); }
        ${selectors.links} > ul[popover] a { display: flex; min-height: 34px; font-size: 12px; }
        ${selectors.links} > [data-dcuf-header-utility-toggle] { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 34px; border: 1px solid var(--dcuf-theme-border); border-radius: 9px; background: var(--dcuf-theme-surface-input); color: var(--dcuf-theme-fg-muted); font: 700 13px/1 system-ui, sans-serif; cursor: pointer; }
        ${selectors.links} > div { flex: none; }
        ${selectors.links} a { display: inline-flex; align-items: center; min-height: 24px; padding-inline: 3px; font-size: 10px; color: var(--dcuf-theme-fg-muted); }
        ${selectors.bridge} { grid-area: 1 / 3; min-width: 0; align-self: center; }
        @media (max-width: 759px) {
            ${selectors.layout} { grid-template-columns: minmax(0, 1fr) 124px; gap: 0 12px; }
            ${selectors.layout}::before { grid-area: 1 / 1 / 4 / -1; margin: 8px; }
            ${selectors.logo} { grid-area: 1 / 1; margin: 22px 0 8px 22px; }
            ${selectors.links} { grid-area: 1 / 2; margin: 18px 18px 4px 0; }
            ${selectors.searchWrap} { grid-area: 2 / 1; width: calc(100% - 22px); margin: 0 0 8px 22px; }
            ${selectors.bridge} { grid-area: 2 / 2; }
        }
        ${selectors.darkRoot} ${selectors.logo} > a:first-child { filter: brightness(0) invert(1); }
        ${selectors.darkRoot} {
            background: transparent;
        }
`
        });
    }
    const __dcufHeaderShellPresenter = (() => {
        const style = __dcufBuildHeaderShellStyle(__dcufDescribeHeaderShellStyleSelectors());
        const utilityToggle = Object.freeze({ text: '•••', label: '서비스 메뉴' });
        return Object.freeze({ style, buildStyle: __dcufBuildHeaderShellStyle, buildThemeCss: __dcufBuildHeaderShellThemeCss, buildResetCss: __dcufBuildHeaderShellResetCss, describeUtilityToggle: () => utilityToggle });
    })();
    __dcufRoot.__dcufHeaderShellPresenter = __dcufHeaderShellPresenter;
