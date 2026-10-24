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
        }
        ${selectors.clearfix} { content: none; display: none; }
        @media (max-width: 759px) {
            ${selectors.root} { grid-template-columns: minmax(0, 1fr); width: calc(100% - 24px); padding: 14px 4px !important; }
            ${selectors.right} { justify-content: flex-start; }
            ${selectors.left} > h2 { font-size: 22px; }
        }

`
        });
    }
    const __dcufGalleryPageHeadPresenter = (() => {
        const style = __dcufBuildGalleryPageHeadStyle(__dcufDescribeGalleryPageHeadStyleSelectors());
        return Object.freeze({ style, buildStyle: __dcufBuildGalleryPageHeadStyle, buildThemeCss: __dcufBuildGalleryPageHeadThemeCss });
    })();
    __dcufRoot.__dcufGalleryPageHeadPresenter = __dcufGalleryPageHeadPresenter;
