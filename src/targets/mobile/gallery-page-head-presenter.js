    // dcuf-concept01-visual-v1: approved presentation delta; see CONCEPT01_TRIAL.md.
    // Hoisted because theme composition precedes this presenter object.
    // The target adapter supplies native selector knowledge explicitly.
    function __dcufBuildGalleryPageHeadThemeCss(selectors) {
        if (!selectors || typeof selectors !== 'object' || !Object.isFrozen(selectors)
            || Reflect.ownKeys(selectors).length !== 13
            || !["root","search","directSearch","title","badge","titleIcon","linkedTitleIcon","titleDecoration","linkedTitleDecoration","miniFixtureDecoration","miniRootDecoration","nestedMiniDecoration","miniDecoration"].every(slot => {
                const field = Object.getOwnPropertyDescriptor(selectors, slot);
                return field && typeof field.value === 'string' && field.value.trim();
            })) {
            throw new TypeError('A complete frozen gallery-page-head theme selector record is required');
        }
        return `
        ${selectors.root} {
            border-color: var(--dcuf-theme-border-strong);
        }
        ${selectors.search},
        ${selectors.directSearch} {
            border-color: var(--dcuf-theme-accent-strong);
            background-color: var(--dcuf-theme-accent-strong);
            background-image: none;
            color: var(--dcuf-theme-on-accent);
        }
        ${selectors.title} {
            color: var(--dcuf-theme-fg);
            font-weight: 750;
        }
        ${selectors.badge} {
            border-color: var(--dcuf-theme-accent);
            color: var(--dcuf-theme-accent);
        }
        ${selectors.titleIcon},
        ${selectors.linkedTitleIcon} {
            display: inline-flex;
            width: 26px;
            height: 20px;
            margin-left: 5px;
            align-items: center;
            justify-content: center;
            border: 2px solid var(--dcuf-theme-accent);
            border-radius: 2px;
            background: none;
            background-image: none !important;
            background-position: 0 0;
            text-indent: 0;
            overflow: hidden;
            color: var(--dcuf-theme-accent);
            font-size: 0;
            line-height: 1;
            box-sizing: border-box;
            vertical-align: middle;
        }
        ${selectors.titleDecoration},
        ${selectors.linkedTitleDecoration} {
            content: "m";
            font: 900 12px/1 Arial, sans-serif;
            text-transform: lowercase;
        }
        ${selectors.miniFixtureDecoration},
        ${selectors.miniRootDecoration},
        ${selectors.nestedMiniDecoration},
        ${selectors.miniDecoration} {
            content: "mi";
            font-size: 10px;
        }
`;
    }
    // Pure and hoisted: preserve complete late CSS before adapter objects initialize.
    function __dcufBuildGalleryPageHeadStyle(selectors) {
        if (!selectors || typeof selectors !== 'object' || !Object.isFrozen(selectors)
            || Reflect.ownKeys(selectors).length !== 4
            || !["root","left","right","clearfix"].every(slot => {
                const field = Object.getOwnPropertyDescriptor(selectors, slot);
                return field && typeof field.value === 'string' && field.value.trim();
            })) {
            throw new TypeError('A complete frozen gallery-page-head style selector record is required');
        }
        return Object.freeze({
            key: 'gallery-page-head',
            id: 'dcuf-gallery-page-head-style',
            css: `
        ${selectors.root} {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: stretch;
            gap: 8px;
            padding: 16px 4px !important;
            margin: 0 auto 4px;
            box-sizing: border-box;
            width: calc(100% - 40px);
            max-width: 1120px;
            height: auto;
            min-height: 0;
            border: 0;
            border-radius: 0;
            background: transparent;
        }
        ${selectors.left} { position: static; float: none; display: flex; align-items: baseline; flex-wrap: wrap; gap: 12px; min-width: 0; margin: 0; }
        ${selectors.left} > h2 { float: none; margin: 0; max-width: 100%; font-size: 24px; line-height: 1.3; letter-spacing: -.8px; overflow-wrap: anywhere; }
        ${selectors.left} > h2 a { font: inherit; }
        ${selectors.left} > form { float: none; margin: 0; }
        ${selectors.right} {
            position: static;
            inset: auto;
            float: none;
            margin: 0;
            padding: 0;
            border-top: 0;
            width: 100%;
            min-width: 0;
            display: flex;
            justify-content: flex-end;
            flex-wrap: wrap;
            align-items: center;
            gap: 8px;
            color: var(--dcuf-theme-fg-muted);
        }
        ${selectors.clearfix} { content: none; display: none; }
        ${selectors.right} [data-dcuf-gallery-page-head-role="utility-control"] { display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-width: 28px; min-height: 28px; height: auto; padding: 0 4px; border: 0; border-radius: 6px; background: transparent; color: var(--dcuf-theme-fg-muted); font: 500 12px/1.4 system-ui,sans-serif; cursor: pointer; }
        ${selectors.right} [data-dcuf-gallery-page-head-role="utility-control"]:is(:hover,:focus-visible) { background: var(--dcuf-theme-accent-soft); color: var(--dcuf-theme-accent-ink); }
        ${selectors.right} [data-dcuf-gallery-page-head-role="utility-icon"] { position: static; inset: auto; display: block; flex: 0 0 10px; width: 10px; height: 10px; margin: 0; background: currentColor; mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='m4 6 4 4 4-4' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / contain no-repeat; }
        [data-dcuf-gallery-page-head-role="settings-anchor"] { position: relative; }
        ${selectors.root} [data-dcuf-gallery-page-head-role="settings-layer"] { position: absolute; inset: calc(100% + 8px) 0 auto auto; box-sizing: border-box; width: 240px; max-width: calc(100vw - 24px); margin: 0; padding: 8px; border: 1px solid var(--dcuf-b1-rim); border-radius: 14px; background: var(--dcuf-b1-sheen),var(--dcuf-b1-floating); color: var(--dcuf-theme-fg); backdrop-filter: blur(24px); box-shadow: var(--dcuf-b1-shadow); z-index: 1020; }
        [data-dcuf-gallery-page-head-role="settings-layer"] > .inner { margin: 0; padding: 0; border: 0; background: transparent; }
        [data-dcuf-gallery-page-head-role="settings-layer"] [data-dcuf-gallery-page-head-role="menu-list"] { margin: 0; padding: 0; list-style: none; }
        ${selectors.root} [data-dcuf-gallery-page-head-role="settings-layer"] [data-dcuf-gallery-page-head-role="menu-list"] > li { margin: 0; padding: 0; border: 0; }
        [data-dcuf-gallery-page-head-role="settings-layer"] [data-dcuf-gallery-page-head-role="menu-control"] { display: flex; align-items: center; gap: 6px; width: 100%; min-height: 38px; height: auto; margin: 0; padding: 9px 12px; border: 0; border-radius: 7px; background: transparent; color: var(--dcuf-theme-fg); font: 500 13px/1.5 system-ui,sans-serif; text-align: start; box-sizing: border-box; cursor: pointer; }
        [data-dcuf-gallery-page-head-role="menu-control"]:is(:hover,:focus-visible) { background: var(--dcuf-theme-accent-soft); }
        ${selectors.root} .pop_tipbox.setting_list [data-dcuf-gallery-page-head-role="menu-toggle"] { position: relative; width: 100%; height: auto; padding: 0; }
        ${selectors.root} .pop_tipbox.setting_list [data-dcuf-gallery-page-head-role="menu-control"] { color: var(--dcuf-theme-fg); margin: 0; }
        ${selectors.root} .pop_tipbox.setting_list [data-dcuf-gallery-page-head-role="menu-toggle"] > label { padding-inline-end: 32px; }
        ${selectors.root} [data-dcuf-gallery-page-head-role="settings-layer"] .checkbox[data-dcuf-gallery-page-head-role="menu-toggle"] input:checked + .checkmark { background: var(--dcuf-theme-accent); }
        [data-dcuf-gallery-page-head-role="layer-anchor"] > div[data-dcuf-gallery-page-head-role="guide-backdrop"] { position: fixed; inset: 0; background: #14262826; z-index: 2147483000; }
        [data-dcuf-gallery-page-head-role="layer-anchor"] > div[data-dcuf-gallery-page-head-role="guide-layer"] { position: fixed; left: 50%; top: var(--dcuf-gallery-guide-center,calc(50% - 48px)) !important; margin: 0 !important; transform: translate(-50%,-50%); width: min(640px,calc(100vw - 32px)); max-width: calc(100vw - 32px); max-height: calc(100dvh - 32px - var(--dcuf-gallery-guide-clearance,96px)); box-sizing: border-box; overflow: hidden; border: 1px solid var(--dcuf-b1-rim); border-radius: 16px; background: var(--dcuf-b1-sheen),var(--dcuf-b1-floating); color: var(--dcuf-theme-fg); backdrop-filter: blur(24px); box-shadow: var(--dcuf-b1-shadow); z-index: 2147483001 !important; }
        [data-dcuf-gallery-page-head-role="guide-layer"] > [data-dcuf-gallery-page-head-role="layer-panel"] { width: 100%; height: auto; min-height: 0; padding: 0; border: 0; background: transparent; color: inherit; }
        [data-dcuf-gallery-page-head-role="guide-layer"] > [data-dcuf-gallery-page-head-role="layer-panel"] > [data-dcuf-gallery-page-head-role="layer-head"] { display: flex; align-items: center; min-height: 70px; height: auto; margin: 0; padding: 20px 62px 18px 20px; border: 0; border-bottom: 1px solid var(--dcuf-b1-line); background: transparent; color: inherit; box-sizing: border-box; }
        [data-dcuf-gallery-page-head-role="guide-layer"] [data-dcuf-gallery-page-head-role="layer-head"] > h3[data-dcuf-gallery-page-head-role="layer-title"] { float: none; margin: 0; padding: 0; color: inherit; font: 750 16px/1.5 system-ui,sans-serif; }
        [data-dcuf-gallery-page-head-role="guide-layer"] [data-dcuf-gallery-page-head-role="layer-body"] { max-height: calc(100dvh - 170px - var(--dcuf-gallery-guide-clearance,96px)); height: auto; margin: 0; padding: 20px; overflow: auto; overscroll-behavior: contain; border: 0; background: var(--dcuf-b1-paper); color: var(--dcuf-theme-fg); font: 400 14px/1.75 system-ui,sans-serif; box-sizing: border-box; }
        [data-dcuf-gallery-page-head-role="layer-body"] :is(p,li) { color: inherit; font: inherit; }
        [data-dcuf-gallery-page-head-role="layer-body"] h4 { margin: 20px 0 8px; color: inherit; font: 650 14px/1.6 system-ui,sans-serif; }
        [data-dcuf-gallery-page-head-role="layer-body"] ul { margin: 8px 0; }
        [data-dcuf-gallery-page-head-role="guide-layer"] [data-dcuf-gallery-page-head-role="layer-actions"] { padding: 12px 20px; border: 0; background: transparent; }
        [data-dcuf-gallery-page-head-role="guide-layer"] [data-dcuf-gallery-page-head-role="layer-close"] { position: absolute; inset: 16px 12px auto auto; display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; margin: 0; padding: 0; border: 0; border-radius: 8px; background: transparent; color: var(--dcuf-theme-fg-muted); font-size: 0; cursor: pointer; }
        [data-dcuf-gallery-page-head-role="layer-close"] > em { display: none; }
        [data-dcuf-gallery-page-head-role="layer-close"]::before { content: ""; width: 14px; height: 14px; background: currentColor; mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='m4 4 8 8M12 4l-8 8' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E") center/contain no-repeat; }
        @media (max-width: 640px) {
            [data-dcuf-gallery-page-head-role="guide-layer"] { --dcuf-gallery-guide-center: calc(50% - 48px); --dcuf-gallery-guide-clearance: 96px; }
        }
        @media (max-width: 759px) {
            ${selectors.root} { grid-template-columns: minmax(0, 1fr); width: calc(100% - 24px); padding: 14px 4px !important; }
            ${selectors.right} { justify-content: flex-start; }
            ${selectors.left} > h2 { font-size: 22px; }
        }
        @media (max-width: 420px), (max-height: 600px) {
            ${selectors.root} { position: relative; }
            [data-dcuf-gallery-page-head-role="settings-anchor"] { position: static; }
            ${selectors.root} [data-dcuf-gallery-page-head-role="settings-layer"] { max-height: min(360px,40dvh); overflow: auto; }
        }

`
        });
    }
    const __dcufGalleryPageHeadPresenter = (() => {
        const style = __dcufBuildGalleryPageHeadStyle(__dcufDescribeGalleryPageHeadStyleSelectors());
        return Object.freeze({ style, buildStyle: __dcufBuildGalleryPageHeadStyle, buildThemeCss: __dcufBuildGalleryPageHeadThemeCss });
    })();
    __dcufRoot.__dcufGalleryPageHeadPresenter = __dcufGalleryPageHeadPresenter;
