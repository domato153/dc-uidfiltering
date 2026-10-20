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
            color: var(--dcuf-theme-accent);
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
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 15px !important;
            box-sizing: border-box;
            width: 100%;
            min-height: 50px;
            flex-wrap: wrap;
            gap: 10px;
        }
        ${selectors.left} { float: none; }
        ${selectors.right} {
            float: none;
            margin-left: auto;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        ${selectors.clearfix} { content: ""; display: table; clear: both; }
`
        });
    }
    const __dcufGalleryPageHeadPresenter = (() => {
        const style = __dcufBuildGalleryPageHeadStyle(__dcufDescribeGalleryPageHeadStyleSelectors());
        return Object.freeze({ style, buildStyle: __dcufBuildGalleryPageHeadStyle, buildThemeCss: __dcufBuildGalleryPageHeadThemeCss });
    })();
    __dcufRoot.__dcufGalleryPageHeadPresenter = __dcufGalleryPageHeadPresenter;
