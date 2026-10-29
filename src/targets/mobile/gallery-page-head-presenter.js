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
        ${selectors.right} [data-dcuf-gallery-page-head-role="utility-control"] { display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-width: 28px; min-height: 28px; height: auto; padding: 0 4px; border: 0; border-radius: 6px; background: var(--dcuf-control-glaze); color: var(--dcuf-theme-fg-muted); font: 500 12px/1.4 system-ui,sans-serif; cursor: pointer; }
        ${selectors.right} [data-dcuf-gallery-page-head-role="utility-control"]:is(:hover,:focus-visible) { background: var(--dcuf-control-selected-bg); color: var(--dcuf-theme-accent-ink); }
        ${selectors.right} [data-dcuf-gallery-page-head-role="utility-icon"] { position: static; inset: auto; display: block; flex: 0 0 10px; width: 10px; height: 10px; margin: 0; background: currentColor; mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='m4 6 4 4 4-4' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / contain no-repeat; }
        [data-dcuf-gallery-page-head-role="settings-anchor"] { position: relative; }
        ${selectors.root} [data-dcuf-gallery-page-head-role="settings-layer"] { position: absolute; inset: calc(100% + 8px) 0 auto auto; box-sizing: border-box; width: 240px; max-width: calc(100vw - 24px); margin: 0; padding: 8px; border: 1px solid var(--dcuf-b1-rim); border-radius: 14px; background: var(--dcuf-b1-sheen),var(--dcuf-b1-floating); color: var(--dcuf-theme-fg); backdrop-filter: var(--dcuf-b1-floating-filter,blur(24px)); box-shadow: var(--dcuf-b1-shadow); z-index: 1020; }
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
        [data-dcuf-gallery-page-head-role="layer-anchor"] > div[data-dcuf-gallery-page-head-role="guide-layer"] { position: fixed; left: 50%; top: var(--dcuf-gallery-guide-center,calc(50% - 48px)) !important; margin: 0 !important; transform: translate(-50%,-50%); width: min(640px,calc(100vw - 32px)); max-width: calc(100vw - 32px); max-height: calc(100dvh - 32px - var(--dcuf-gallery-guide-clearance,96px)); box-sizing: border-box; overflow: hidden; border: 1px solid var(--dcuf-b1-rim); border-radius: 16px; background: var(--dcuf-b1-sheen),var(--dcuf-b1-floating); color: var(--dcuf-theme-fg); backdrop-filter: var(--dcuf-b1-floating-filter,blur(24px)); box-shadow: var(--dcuf-b1-shadow); z-index: 2147483001 !important; }
        [data-dcuf-gallery-page-head-role="guide-layer"] > [data-dcuf-gallery-page-head-role="layer-panel"] { width: 100%; height: auto; min-height: 0; padding: 0; border: 0; background: transparent; color: inherit; }
        [data-dcuf-gallery-page-head-role="guide-layer"] > [data-dcuf-gallery-page-head-role="layer-panel"] > [data-dcuf-gallery-page-head-role="layer-head"] { display: flex; align-items: center; min-height: 70px; height: auto; margin: 0; padding: 20px 62px 18px 20px; border: 0; border-bottom: 1px solid var(--dcuf-b1-line); background: transparent; color: inherit; box-sizing: border-box; }
        [data-dcuf-gallery-page-head-role="guide-layer"] [data-dcuf-gallery-page-head-role="layer-head"] > h3[data-dcuf-gallery-page-head-role="layer-title"] { float: none; margin: 0; padding: 0; color: inherit; font: 750 16px/1.5 system-ui,sans-serif; }
        [data-dcuf-gallery-page-head-role="guide-layer"] [data-dcuf-gallery-page-head-role="layer-body"] { max-height: calc(100dvh - 170px - var(--dcuf-gallery-guide-clearance,96px)); height: auto; margin: 0; padding: 20px; overflow: auto; overscroll-behavior: contain; border: 0; background: var(--dcuf-b1-paper); color: var(--dcuf-theme-fg); font: 400 14px/1.75 system-ui,sans-serif; box-sizing: border-box; }
        [data-dcuf-gallery-page-head-role="layer-body"] :is(p,li) { color: inherit; font: inherit; }
        [data-dcuf-gallery-page-head-role="layer-body"] h4 { margin: 20px 0 8px; color: inherit; font: 650 14px/1.6 system-ui,sans-serif; }
        [data-dcuf-gallery-page-head-role="layer-body"] ul { margin: 8px 0; }
        [data-dcuf-gallery-page-head-role="guide-layer"] [data-dcuf-gallery-page-head-role="layer-actions"] { padding: 12px 20px; border: 0; background: transparent; }
        [data-dcuf-gallery-page-head-role="guide-layer"] [data-dcuf-gallery-page-head-role="layer-close"] { position: absolute; inset: 16px 12px auto auto; display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; margin: 0; padding: 0; border: 0; border-radius: 8px; background: var(--dcuf-control-glaze); box-shadow: var(--dcuf-control-quiet-shadow); color: var(--dcuf-theme-fg-muted); font-size: 0; cursor: pointer; }
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

${__dcufBuildGallerySettingsStyle(__dcufDescribeGallerySettingsStyleSelectors())}
${__dcufBuildMemoWorkbenchStyle(__dcufDescribeGallerySettingsStyleSelectors())}
`
        });
    }
    const __dcufGalleryPageHeadPresenter = (() => {
        const style = __dcufBuildGalleryPageHeadStyle(__dcufDescribeGalleryPageHeadStyleSelectors());
        return Object.freeze({ style, buildStyle: __dcufBuildGalleryPageHeadStyle, buildThemeCss: __dcufBuildGalleryPageHeadThemeCss });
    })();
    __dcufRoot.__dcufGalleryPageHeadPresenter = __dcufGalleryPageHeadPresenter;

    // Reused B1 recipes; native discovery and all actions stay in the existing host adapter/site.
    // Selected v7 composition. Parts are projected by the existing adapter;
    // native controls and nested dialogs keep their original ancestors/events.
    function __dcufBuildMemoWorkbenchStyle(selectors) {
        const root = `${selectors.shellTag}[data-dcuf-gallery-page-head-role="settings-popup-memo"]`;
        const panel = `${root} > ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"]`;
        const part = name => `${panel} [data-dcuf-gallery-page-head-role="settings-memo-${name}"]`;
        return `
${root}{z-index:2147483642;width:1176px;max-width:calc(100vw - 48px);max-height:calc(100dvh - 48px);border-radius:16px;--dcuf-memo-reading:color-mix(in srgb,var(--dcuf-theme-fg) 7%,var(--dcuf-b1-paper));--dcuf-memo-primary:color-mix(in srgb,var(--dcuf-b1-paper) 76%,var(--dcuf-theme-accent));--dcuf-memo-ink:color-mix(in srgb,var(--dcuf-theme-fg) 86%,var(--dcuf-theme-accent-strong));}
${root} [data-dcuf-gallery-page-head-role="settings-popup-nested"]{z-index:2147483643;}
${root}::after{content:"";position:fixed;inset:0;z-index:-2;background:color-mix(in srgb,var(--dcuf-theme-fg) 12%,transparent);pointer-events:none;}
${panel}{position:static;box-sizing:border-box;width:100%;height:auto;min-width:0;max-height:calc(100dvh - 48px);margin:0;padding:0;border:0;border-radius:inherit;background:transparent;color:inherit;overflow:auto;scrollbar-width:thin;}
${panel} > [data-dcuf-gallery-page-head-role="settings-head"]{min-height:66px;padding:17px 64px 17px 26px;border:0;background:var(--dcuf-b1-sheen);}
${panel} h3[data-dcuf-gallery-page-head-role="settings-title"]{font:750 28px/1.3 system-ui,sans-serif;letter-spacing:-.025em;}
${panel} > [data-dcuf-gallery-page-head-role="settings-tabs"]{display:flex;gap:4px;margin:0 22px;padding:0;border:0;border-radius:0;background:transparent;}
${panel} > [data-dcuf-gallery-page-head-role="settings-tabs"] > button[data-dcuf-gallery-page-head-role="settings-tab"]{flex:none;min-width:120px;min-height:44px;padding:10px 16px;border:0;border-bottom:3px solid transparent;border-radius:0;background:transparent;box-shadow:none;color:var(--dcuf-panel-help-ink);font:650 14px/1.5 system-ui,sans-serif;}
${panel} > [data-dcuf-gallery-page-head-role="settings-tabs"] > button[data-dcuf-gallery-page-head-role="settings-tab"].on{border-bottom-color:var(--dcuf-theme-accent);background:transparent;color:var(--dcuf-theme-accent-ink);box-shadow:none;}
${part('body')},${part('pane')}{box-sizing:border-box;width:100%;min-width:0;height:auto;max-height:none;margin:0;padding:0;border:0;background:transparent;color:inherit;overflow:visible;}
${part('workspace')}{position:relative;isolation:isolate;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);grid-template-rows:42px 40px 36px minmax(150px,1fr) auto auto auto;gap:12px 36px;box-sizing:border-box;min-width:0;margin:0;padding:24px 34px 18px;border:0;background:transparent;}
${part('workspace')}::before,${part('workspace')}::after{content:"";z-index:-1;grid-row:1/7;min-width:0;margin:-10px -14px -12px;border:1px solid var(--dcuf-b1-rim);border-radius:12px;background:var(--dcuf-memo-reading);pointer-events:none;}
${part('workspace')}::before{grid-column:1;} ${part('workspace')}::after{grid-column:2;background:var(--dcuf-b1-paper);}
${part('bridge')},${part('help')}{display:contents;}
${part('editor-head')}{grid-column:2;grid-row:1;display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0;margin:0;padding:0;border:0;background:transparent;}
${part('editor-head')} h4{font-size:21px;font-weight:720;}
${part('editor-field')}{grid-column:2;grid-row:2/5;min-width:0;width:auto;height:auto;margin:0;padding:0;border:0;}
${part('editor-field')} textarea[data-dcuf-gallery-page-head-role="settings-textarea"]{box-sizing:border-box;width:100%;height:100%;min-height:320px;max-width:100%;margin:0;padding:14px;border:1px solid var(--dcuf-theme-border-strong);border-radius:8px;background:var(--dcuf-b1-paper);color:var(--dcuf-theme-fg);font:16px/1.7 system-ui,sans-serif;resize:vertical;caret-color:var(--dcuf-theme-accent);}
${part('help-copy')}{box-sizing:border-box;min-width:0;margin:0;padding:0;color:var(--dcuf-panel-help-ink);font:12px/1.7 system-ui,sans-serif;word-break:keep-all;overflow-wrap:anywhere;}
${part('help-copy')}:nth-child(1){grid-column:2;grid-row:5;}
${part('help-copy')}:nth-child(2){grid-column:2;grid-row:6;}
${part('help-copy')}:nth-child(3){grid-column:1;grid-row:7;align-self:center;margin-top:22px;}
${part('help-copy')}:nth-child(4){grid-column:2;grid-row:7;align-self:center;max-width:calc(100% - 125px);margin-top:22px;}
${part('footer-action')}{grid-column:2;grid-row:7;position:static;display:flex;align-items:center;justify-content:flex-end;justify-self:end;align-self:center;box-sizing:border-box;width:auto;min-width:0;margin:22px 0 0;padding:0;border:0;background:transparent;}
${part('primary')}{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;float:none;width:118px;min-height:42px;height:auto;margin:0;padding:9px 20px;border:1px solid color-mix(in srgb,var(--dcuf-theme-accent) 48%,var(--dcuf-b1-rim));border-radius:9px;background:linear-gradient(180deg,var(--dcuf-control-highlight),transparent 68%),var(--dcuf-memo-primary);color:var(--dcuf-memo-ink);box-shadow:inset 0 1px 0 var(--dcuf-b1-rim),0 3px 7px #152e3412;font:750 14px/1.5 system-ui,sans-serif;text-shadow:none;cursor:pointer;}
${part('primary')}:hover{background:var(--dcuf-b1-sheen),color-mix(in srgb,var(--dcuf-memo-primary) 90%,var(--dcuf-theme-accent));}
${part('primary')}:disabled{opacity:.5;cursor:default;box-shadow:none;}
${panel} :is(button,input,textarea):focus-visible{outline:2px solid var(--dcuf-theme-accent);outline-offset:3px;}
${part('list-head')}{grid-column:1;grid-row:1;display:flex;align-items:center;gap:10px;min-width:0;margin:0;padding:0;color:var(--dcuf-theme-fg);font:720 18px/1.5 system-ui,sans-serif;}
${part('list-head')} .checkbox{display:inline-flex;align-items:center;gap:8px;position:relative;}
${part('list-head')} .checkbox > label{font:inherit;color:inherit;}
${part('list-head')} .num{position:static;margin:0;padding:2px 8px;border-radius:20px;background:var(--dcuf-b1-paper);color:var(--dcuf-panel-help-ink);font:650 12px/1.5 system-ui,sans-serif;}
${part('search')}{grid-column:1;grid-row:2;display:flex;gap:8px;box-sizing:border-box;min-width:0;width:auto;height:auto;margin:0;padding:0;border:0;background:transparent;}
${part('search')} [data-dcuf-gallery-page-head-role="settings-select"]{position:relative;flex:0 0 82px;box-sizing:border-box;width:82px;height:40px;padding:10px;border-radius:7px;font:13px/1.4 system-ui,sans-serif;}
${part('search')} [data-dcuf-gallery-page-head-role="settings-select-options"]{z-index:4;left:0;top:100%;width:100%;}
${part('search-input')}{display:flex;flex:1;gap:6px;min-width:0;width:auto;margin:0;}
${part('search-input')} input[data-dcuf-gallery-page-head-role="settings-field"]{flex:1;min-width:0;width:0;height:40px;}
${part('search-input')} button[data-dcuf-gallery-page-head-role="settings-button"]{min-width:46px;height:40px;padding:6px 8px;}
${part('sort')},${part('tools')}{display:flex;gap:6px;align-items:center;min-width:0;width:auto;margin:0;padding:0;grid-column:1;grid-row:3;}
${part('sort')}{justify-self:start;} ${part('tools')}{justify-self:end;}
${part('sort')} button[data-dcuf-gallery-page-head-role="settings-sort-tab"],${part('tools')} button[data-dcuf-gallery-page-head-role="settings-button"]{box-sizing:border-box;min-width:44px;width:auto;height:32px;margin:0;padding:5px 9px;border:1px solid var(--dcuf-b1-line);border-radius:6px;background:var(--dcuf-control-secondary-bg);color:var(--dcuf-theme-fg);box-shadow:none;font:600 12px/1.4 system-ui,sans-serif;}
${part('sort')} button[data-dcuf-gallery-page-head-role="settings-sort-tab"].on{background:var(--dcuf-control-selected-bg);color:var(--dcuf-theme-accent-ink);}
${part('list')}{grid-column:1;grid-row:4/7;box-sizing:border-box;min-width:0;width:auto;min-height:315px;max-height:360px;margin:0;padding:0;border:0;border-radius:0;background:transparent;color:var(--dcuf-theme-fg);overflow:auto;scrollbar-width:thin;}
${part('list')} > li{box-sizing:border-box;min-width:0;min-height:72px;margin:0;padding:16px 0;border:0;border-bottom:1px solid var(--dcuf-b1-line);background:transparent;overflow-wrap:anywhere;}
${part('list')} > li:last-child{border-bottom:0;}
${part('list')} > li:has(input:checked){background:color-mix(in srgb,var(--dcuf-theme-accent) 10%,transparent);border-radius:8px;}
${part('list')} .btn-wrap,${part('list')} .btn{display:block;box-sizing:border-box;width:100%;max-width:100%;height:auto;margin:0;padding:0;border:0;background:transparent;color:inherit;text-align:start;}
${part('list')} .checkbox{display:grid;grid-template-columns:20px minmax(0,1fr);align-items:start;gap:10px;position:relative;margin:0;padding:0;}
${part('list')} .checkbox label{grid-column:2;min-width:0;width:auto;max-width:100%;margin:0;padding:0;color:inherit;font:16px/1.65 system-ui,sans-serif;white-space:normal;overflow-wrap:anywhere;}
${part('list')} .nik{display:block;max-width:100%;margin:0;padding:0;background:none;font-weight:700;white-space:normal;}
${part('list')} .mone{display:block;max-width:100%;margin:2px 0 0;padding:0;font-weight:400;white-space:normal;}
${part('list')} .checkmark,${part('list-head')} .checkmark{display:none;}
${part('list')} input[type="checkbox"],${part('list-head')} input[type="checkbox"]{position:static;appearance:auto;opacity:1;box-sizing:border-box;width:16px;height:16px;margin:4px 0 0;accent-color:var(--dcuf-theme-accent);}
@media(max-width:759px){
 ${root}{inset:12px!important;max-width:calc(100vw - 24px);max-height:calc(100dvh - 24px);}
 ${panel}{max-height:calc(100dvh - 24px);}
 ${part('workspace')}{display:flex;flex-direction:column;gap:16px;padding:22px;}
 ${part('workspace')}::before,${part('workspace')}::after{display:none;}
 ${part('bridge')}:has(> [data-dcuf-gallery-page-head-role="settings-memo-editor-head"]){display:flex;flex-direction:column;gap:12px;order:1;}
 ${part('bridge')}:has(> [data-dcuf-gallery-page-head-role="settings-memo-bridge"]){display:flex;flex-direction:column;gap:12px;order:3;}
 ${part('bridge')} > [data-dcuf-gallery-page-head-role="settings-memo-bridge"]{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;}
 ${part('list-head')}{width:100%;}
 ${part('editor-field')} textarea[data-dcuf-gallery-page-head-role="settings-textarea"]{height:220px;min-height:160px;}
 ${part('search')}{order:2;flex:none;}
 ${part('list')}{min-height:120px;max-height:300px;}
 ${part('help')}{display:flex;flex-direction:column;gap:6px;order:3;}
 ${part('help-copy')}:nth-child(n){max-width:100%;margin:0;}
 ${part('footer-action')}{order:4;align-self:flex-end;margin:0;}
}
`;
    }

    function __dcufBuildGallerySettingsStyle(selectors) {
        if (!selectors || !Object.isFrozen(selectors) || typeof selectors.shellTag!=="string" || typeof selectors.panelTag!=="string") throw new TypeError("Frozen native settings style bindings required");
        return `/* Independent H-10 composition using adopted B1 glass and C885/paper controls. */
${selectors.shellTag}[data-dcuf-gallery-page-head-role^="settings-popup-"]{position:fixed;inset:24px!important;width:478px;max-width:calc(100vw - 24px);height:fit-content;max-height:calc(100dvh - 128px);margin:auto!important;transform:none;box-sizing:border-box;z-index:10020;border:1px solid var(--dcuf-b1-rim);border-radius:14px;background:transparent;color:var(--dcuf-theme-fg);isolation:isolate;font:13px/1.55 system-ui,sans-serif;}
${selectors.shellTag}[data-dcuf-gallery-page-head-role^="settings-popup-"]::before{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;background:var(--dcuf-b1-sheen),var(--dcuf-b1-floating);backdrop-filter:var(--dcuf-b1-floating-filter);box-shadow:var(--dcuf-b1-shadow);pointer-events:none;}
${selectors.shellTag}[data-dcuf-gallery-page-head-role="settings-popup-block"]{width:620px;}
${selectors.shellTag}[data-dcuf-gallery-page-head-role="settings-popup-trusted"],${selectors.shellTag}[data-dcuf-gallery-page-head-role="settings-popup-spoiler"]{width:430px;}
${selectors.shellTag}[data-dcuf-gallery-page-head-role="settings-popup-nested"]{inset:12px!important;width:378px;max-height:calc(100dvh - 152px);z-index:10030;}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"]{position:static;box-sizing:border-box;width:100%;height:auto;min-width:0;max-width:100%;max-height:calc(100dvh - 128px);margin:0;padding:0;border:0;border-radius:inherit;background:transparent;color:inherit;overflow:auto;scrollbar-width:thin;scrollbar-color:var(--dcuf-theme-border-strong) transparent;}
${selectors.shellTag}[data-dcuf-gallery-page-head-role="settings-popup-nested"]>${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"]{max-height:calc(100dvh - 152px);}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-head"]{box-sizing:border-box;display:flex;align-items:center;gap:10px;width:auto;height:auto;min-height:58px;margin:0;padding:15px 56px 15px 20px;border:0;border-bottom:1px solid var(--dcuf-b1-line);background:transparent;line-height:1.5;}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] h3[data-dcuf-gallery-page-head-role="settings-title"]{float:none;width:auto;height:auto;margin:0;padding:0;color:var(--dcuf-theme-fg);font:700 17px/1.5 system-ui,sans-serif;}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-body"]{box-sizing:border-box;width:auto;height:auto;min-height:0;max-height:max(96px,calc(100dvh - 340px));padding:18px 20px;margin:0;background:transparent;color:inherit;overflow:auto;}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-tabs"]{display:flex;align-items:stretch;gap:4px;box-sizing:border-box;float:none;width:auto;height:auto;margin:12px 16px 0;padding:4px;border:1px solid var(--dcuf-b1-line);border-radius:10px;background:var(--dcuf-control-glaze);}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-tabs"] > button[data-dcuf-gallery-page-head-role="settings-tab"]{display:block;float:none;flex:1;box-sizing:border-box;width:auto;height:auto;min-height:40px;margin:0;padding:9px 12px;border:0;border-radius:7px;background:transparent;color:var(--dcuf-panel-help-ink);font:600 13px/1.4 system-ui,sans-serif;white-space:normal;}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-tabs"] > button[data-dcuf-gallery-page-head-role="settings-tab"].on{background:var(--dcuf-control-selected-bg);color:var(--dcuf-theme-accent-ink);box-shadow:inset 0 1px 0 var(--dcuf-b1-rim);}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-section"]{box-sizing:border-box;float:none;width:auto;height:auto;min-width:0;margin:0 0 18px;padding:0 0 18px;border:0;border-bottom:1px solid var(--dcuf-b1-line);background:transparent;color:inherit;}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-row"]{position:static;display:flex;flex-wrap:wrap;align-items:center;gap:8px;box-sizing:border-box;float:none;width:auto;height:auto;margin:0 0 8px;padding:0;border:0;background:transparent;}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-field"],[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-textarea"]{box-sizing:border-box;float:none;width:100%;max-width:100%;min-width:0;height:40px;margin:0;padding:9px 11px;border:1px solid var(--dcuf-theme-border-strong);border-radius:8px;background:var(--dcuf-b1-paper);color:var(--dcuf-theme-fg);font:14px/1.5 system-ui,sans-serif;caret-color:var(--dcuf-theme-accent);}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-textarea"]{height:84px;resize:vertical;}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-field-wrap"]{box-sizing:border-box;width:auto;height:auto;max-width:100%;margin:0;padding:0;border:0;background:transparent;}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-field"]::placeholder,[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-textarea"]::placeholder{color:var(--dcuf-panel-help-ink);opacity:1;}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] button[data-dcuf-gallery-page-head-role="settings-sort-tab"],[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] button[data-dcuf-gallery-page-head-role="settings-button"],[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] button[data-dcuf-gallery-page-head-role="settings-primary"],[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] button[data-dcuf-gallery-page-head-role="settings-head-action"]{position:static;display:inline-flex;align-items:center;justify-content:center;flex:none;box-sizing:border-box;float:none;width:auto;min-width:56px;height:36px;margin:0;padding:7px 13px;border:1px solid var(--dcuf-control-rim);border-radius:8px;background:var(--dcuf-control-secondary-bg);color:var(--dcuf-theme-fg);box-shadow:var(--dcuf-control-quiet-shadow);font:650 13px/1.4 system-ui,sans-serif;text-shadow:none;white-space:nowrap;cursor:pointer;}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] button[data-dcuf-gallery-page-head-role="settings-primary"]{border-color:var(--dcuf-control-primary-rim);background:var(--dcuf-control-primary-bg);color:var(--dcuf-theme-on-accent);box-shadow:var(--dcuf-control-shadow);}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] button[data-dcuf-gallery-page-head-role="settings-head-action"]{min-width:0;min-height:30px;height:auto;margin-inline-start:auto;padding:6px 10px;font-size:12px;}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-actions"]{position:sticky;bottom:0;z-index:2;clear:both;display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:8px;box-sizing:border-box;width:auto;height:auto;margin:0;padding:14px 20px;border:0;border-top:1px solid var(--dcuf-b1-line);background:var(--dcuf-b1-floating);text-align:end;}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-message"]{box-sizing:border-box;float:none;width:auto;height:auto;min-height:0;margin:0 0 12px;padding:0;border:0;background:transparent;color:var(--dcuf-panel-help-ink);font-size:12px;line-height:1.7;}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"]>[data-dcuf-gallery-page-head-role="settings-message"]{padding:14px 20px 0;}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-list"]{box-sizing:border-box;max-width:100%;max-height:280px;margin:10px 0;padding:10px;border:1px solid var(--dcuf-b1-line);border-radius:8px;background:var(--dcuf-b1-paper);color:var(--dcuf-theme-fg);overflow:auto;}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-label"]{float:none;margin:0;color:var(--dcuf-theme-fg);font-size:13px;line-height:1.5;font-weight:650;}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-swatch"]{box-sizing:border-box;float:none;min-width:32px;min-height:24px;border:1px solid var(--dcuf-theme-border-strong);border-radius:6px;}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-switch"]{position:relative;box-sizing:border-box;flex:none;width:40px;height:24px;margin:0;padding:0;border:1px solid var(--dcuf-theme-border-strong);border-radius:20px;background:var(--dcuf-control-secondary-bg);font-size:0;}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-switch"].on{background:var(--dcuf-theme-accent);}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-switch"]::after{content:"";position:absolute;left:3px;top:3px;width:16px;height:16px;border-radius:50%;background:var(--dcuf-b1-paper);box-shadow:0 1px 3px #0002;}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-switch"].on::after{left:19px;}
[data-dcuf-gallery-page-head-role^="settings-popup-"] [data-dcuf-gallery-page-head-role="settings-close"]{position:absolute;z-index:3;inset:11px 11px auto auto;box-sizing:border-box;float:none;width:36px;height:36px;margin:0;padding:0;border:0;border-radius:8px;background:none;color:var(--dcuf-panel-help-ink);font-size:0;box-shadow:none;}
[data-dcuf-gallery-page-head-role^="settings-popup-"] [data-dcuf-gallery-page-head-role="settings-close-icon"]{display:none;}
[data-dcuf-gallery-page-head-role^="settings-popup-"] [data-dcuf-gallery-page-head-role="settings-close"]::before,[data-dcuf-gallery-page-head-role^="settings-popup-"] [data-dcuf-gallery-page-head-role="settings-close"]::after{content:"";position:absolute;left:50%;top:50%;width:14px;height:1.5px;border-radius:1px;background:currentColor;transform:translate(-50%,-50%) rotate(45deg);}
[data-dcuf-gallery-page-head-role^="settings-popup-"] [data-dcuf-gallery-page-head-role="settings-close"]::after{transform:translate(-50%,-50%) rotate(-45deg);}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-scrim"]{background:#17272f55;}
${selectors.shellTag}[data-dcuf-gallery-page-head-role^="settings-popup-"] :is(button,input,textarea,a):focus-visible{outline:2px solid var(--dcuf-theme-accent);outline-offset:2px;}
@media(max-width:640px),(max-height:650px){${selectors.shellTag}[data-dcuf-gallery-page-head-role^="settings-popup-"]{inset:12px 12px 116px!important;max-width:calc(100vw - 24px);}[data-dcuf-gallery-page-head-role="settings-head"]{padding-left:16px;}[data-dcuf-gallery-page-head-role="settings-body"]{padding:16px;}button[data-dcuf-gallery-page-head-role="settings-head-action"]{font-size:11px;padding:6px;}}

[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-flow"]{height:auto;min-height:0;}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-row"] > [data-dcuf-gallery-page-head-role="settings-field"]{flex:1 1 160px;width:auto;}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-row"] > [data-dcuf-gallery-page-head-role="settings-label"]{flex:0 0 94px;width:auto;}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] p[data-dcuf-gallery-page-head-role="settings-message-copy"]{color:var(--dcuf-panel-help-ink);font:12px/1.7 system-ui,sans-serif;}

[data-dcuf-gallery-page-head-role="settings-list"]:empty{margin:0;padding:0;border:0;}
[data-dcuf-gallery-page-head-role="settings-row"] > [data-dcuf-gallery-page-head-role="settings-list"]{flex-basis:100%;}
[data-dcuf-gallery-page-head-role="settings-popup-block"] > ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"]{min-height:0;}

[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-list"]:not(:has(*)){margin:0;padding:0;border:0;}

[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-pane"]{box-sizing:border-box;width:auto;max-width:100%;min-width:0;height:auto;margin:0;padding:0;}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-pane"] [data-dcuf-gallery-page-head-role="settings-row"] > [data-dcuf-gallery-page-head-role="settings-search-row"]{position:static;inset:auto;display:flex;align-items:center;gap:8px;flex:1 1 160px;box-sizing:border-box;float:none;width:auto;max-width:100%;min-width:0;height:auto;padding:0;margin:0;}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] button[data-dcuf-gallery-page-head-role="settings-sort-tab"].on{background:var(--dcuf-control-selected-bg);color:var(--dcuf-theme-accent-ink);border-color:var(--dcuf-control-rim);font-weight:700;}

[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-toggle-group"],[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-toggle-section"]{position:relative;box-sizing:border-box;min-height:28px;height:auto;padding:0 56px 0 0;margin:0 0 14px;border:0;background:transparent;color:var(--dcuf-theme-fg);}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-toggle-section"]{padding-bottom:18px;border-bottom:1px solid var(--dcuf-b1-line);}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-switch-wrap"]{position:absolute;inset:0 0 auto auto;float:none;width:40px;height:24px;margin:0;padding:0;}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] label[data-dcuf-gallery-page-head-role="settings-checkbox-label"]{color:var(--dcuf-theme-fg);font-size:12px;}

[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-select"],[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-select-options"]{box-sizing:border-box;border:1px solid var(--dcuf-theme-border-strong);border-radius:8px;background:var(--dcuf-b1-paper);color:var(--dcuf-theme-fg);}
[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-select-label"]{color:var(--dcuf-theme-fg);background:transparent;}

[data-dcuf-gallery-page-head-role^="settings-popup-"] ${selectors.panelTag}[data-dcuf-gallery-page-head-role="settings-panel"] [data-dcuf-gallery-page-head-role="settings-emphasis"]{color:var(--dcuf-theme-accent-ink);}
`;
    }
