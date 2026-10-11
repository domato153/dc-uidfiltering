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
            border-color: var(--dcuf-theme-border-strong) !important;
        }
        ${selectors.search},
        ${selectors.directSearch} {
            border-color: var(--dcuf-theme-accent-strong) !important;
            background-color: var(--dcuf-theme-accent-strong) !important;
            background-image: none !important;
            color: var(--dcuf-theme-on-accent) !important;
        }
        ${selectors.title} {
            color: var(--dcuf-theme-accent) !important;
        }
        ${selectors.badge} {
            border-color: var(--dcuf-theme-accent) !important;
            color: var(--dcuf-theme-accent) !important;
        }
        ${selectors.titleIcon},
        ${selectors.linkedTitleIcon} {
            display: inline-flex !important;
            width: 26px !important;
            height: 20px !important;
            margin-left: 5px !important;
            align-items: center !important;
            justify-content: center !important;
            border: 2px solid var(--dcuf-theme-accent) !important;
            border-radius: 2px !important;
            background: none !important;
            background-image: none !important;
            background-position: 0 0 !important;
            text-indent: 0 !important;
            overflow: hidden !important;
            color: var(--dcuf-theme-accent) !important;
            font-size: 0 !important;
            line-height: 1 !important;
            box-sizing: border-box !important;
            vertical-align: middle !important;
        }
        ${selectors.titleDecoration},
        ${selectors.linkedTitleDecoration} {
            content: "m" !important;
            font: 900 12px/1 Arial, sans-serif !important;
            text-transform: lowercase !important;
        }
        ${selectors.miniFixtureDecoration},
        ${selectors.miniRootDecoration},
        ${selectors.nestedMiniDecoration},
        ${selectors.miniDecoration} {
            content: "mi" !important;
            font-size: 10px !important;
        }
`;
    }
    const __dcufGalleryPageHeadPresenter = (() => {
        const style = Object.freeze({
            key: 'gallery-page-head',
            id: 'dcuf-gallery-page-head-style',
            css: `
        [data-dcuf-gallery-page-head-role="root"] {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 10px 15px !important;
            box-sizing: border-box !important;
            width: 100% !important;
            min-height: 50px;
            flex-wrap: wrap;
            gap: 10px;
        }
        [data-dcuf-gallery-page-head-role="root"] > :is([data-dcuf-gallery-page-head-role="left"], [data-dcuf-gallery-page-head-role="both"]) { float: none !important; }
        [data-dcuf-gallery-page-head-role="root"] > :is([data-dcuf-gallery-page-head-role="right"], [data-dcuf-gallery-page-head-role="both"]) {
            float: none !important;
            margin-left: auto;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        [data-dcuf-gallery-page-head-role="root"]::after { content: ""; display: table; clear: both; }
`
        });
        return Object.freeze({ style, buildThemeCss: __dcufBuildGalleryPageHeadThemeCss });
    })();
    __dcufRoot.__dcufGalleryPageHeadPresenter = __dcufGalleryPageHeadPresenter;
