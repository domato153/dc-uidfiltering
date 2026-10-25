    // dcuf-concept01-visual-v1: approved presentation delta; see HEADER_LAYOUT_REDESIGN.md.
    // Palette accents apply to the original host issue root, including before
    // drawer roles are projected. Keep that timing and native ancestry intact.
    function __dcufBuildHeaderDrawerThemeCss(selectors) {
        if (!selectors || typeof selectors !== 'object' || !Object.isFrozen(selectors)
            || Reflect.ownKeys(selectors).length !== 1
            || !["issue"].every(slot => {
                const field = Object.getOwnPropertyDescriptor(selectors, slot);
                return field && typeof field.value === 'string' && field.value.trim();
            })) {
            throw new TypeError('A complete frozen header-drawer theme selector record is required');
        }
        return `
        ${selectors.issue} {
            border-top: 0 !important;
            box-shadow: none;
        }
`;
    }
    // Preserve initial concealment before roles project and popup-only state:
    // the adapter keeps the exact open marker while an original popup is open.
    function __dcufBuildHeaderDrawerVisibilityCss(selectors) {
        if (!selectors || typeof selectors !== 'object' || !Object.isFrozen(selectors)
            || Reflect.ownKeys(selectors).length !== 2
            || !["door","recommendation"].every(slot => {
                const field = Object.getOwnPropertyDescriptor(selectors, slot);
                return field && typeof field.value === 'string' && field.value.trim();
            })) {
            throw new TypeError('A complete frozen header-drawer visibility selector record is required');
        }
        return `
        ${selectors.door},
        ${selectors.recommendation} {
            display: none !important;
        }
`;
    }
    const __dcufHeaderDrawerPresenter = (() => {
        const layout = Object.freeze({ maxWidth: 640 });
        const closedState = Object.freeze({ dataOpen: '0', ariaExpanded: 'false', label: '갤러리 대문 열기' });
        const openState = Object.freeze({ dataOpen: '1', ariaExpanded: 'true', label: '갤러리 대문 닫기' });
        const describeOpenState = (snapshot) => snapshot.open ? openState : closedState;
        const openIntent = Object.freeze({ type: 'surface/open', surface: 'header-drawer' });
        const closeIntent = Object.freeze({ type: 'surface/close', surface: 'header-drawer' });
        const describeToggleIntent = (snapshot) => snapshot.open ? closeIntent : openIntent;
        const openBodyStyles = Object.freeze([
            { name: 'display', value: 'block', priority: 'important' },
            { name: 'visibility', value: 'visible', priority: 'important' },
            { name: 'opacity', value: '1', priority: 'important' },
            { name: 'pointer-events', value: 'auto', priority: 'important' },
            { name: 'overflow', value: 'visible', priority: 'important' },
        ].map(Object.freeze));
        const closedBodyStyles = Object.freeze([
            { name: 'max-height', value: '0px', priority: 'important' },
            { name: 'opacity', value: '0', priority: 'important' },
            { name: 'visibility', value: 'hidden', priority: 'important' },
            { name: 'pointer-events', value: 'none', priority: 'important' },
            { name: 'overflow', value: 'hidden', priority: 'important' },
            { name: 'display', value: 'none', priority: 'important' },
        ].map(Object.freeze));
        const describeBodyVisibility = (snapshot) => snapshot.open ? openBodyStyles : closedBodyStyles;
        const describeBodyOffset = (snapshot) => Object.freeze({
            name: '--dcuf-header-drawer-inline-start', value: `${snapshot.inlineStart}px`, priority: ''
        });
        const describeBodyHeight = (snapshot) => Object.freeze({
            name: 'max-height', value: `${snapshot.height}px`, priority: 'important'
        });
        const describeBodyPadding = (snapshot) => Object.freeze({
            paddingTop: snapshot.hasChildren ? `${snapshot.height}px` : ''
        });
        const shell = Object.freeze({
            tagName: 'div',
            className: 'dcuf-header-drawer',
            initialState: closedState,
            html: `
                    <button type="button" class="dcuf-header-drawer__toggle" aria-expanded="false">
                        <span class="dcuf-header-drawer__toggle-label">${closedState.label}</span>
                    </button>
                    <div class="dcuf-header-drawer__body">
                        <div class="dcuf-header-drawer__body-inner"></div>
                    </div>
                `
        });
        const nativeStyleSlots = Object.freeze(["door","recommendation","relationPopup","relationStatic","fluid","intro","ranking","buttonDecoration","closeDecoration","rankPopup","tipPopup","recommendationPaging","recommendationText","recommendationImage","recommendationStack"]);
        const describeNativeStyle = (bindings) => {
            if (!Array.isArray(bindings) || !Object.isFrozen(bindings) || bindings.length !== nativeStyleSlots.length) {
                throw new TypeError('A complete frozen native selector binding is required');
            }
            const selectors = Object.create(null);
            for (const entry of bindings) {
                if (!entry || typeof entry !== 'object' || !Object.isFrozen(entry)
                    || Object.keys(entry).length !== 2 || !Object.hasOwn(entry, 'slot') || !Object.hasOwn(entry, 'selector')
                    || !nativeStyleSlots.includes(entry.slot) || Object.hasOwn(selectors, entry.slot)
                    || typeof entry.selector !== 'string' || !entry.selector.trim()) {
                    throw new TypeError('Invalid, duplicate or unknown native selector slot');
                }
                selectors[entry.slot] = entry.selector;
            }
            return Object.freeze({
            key: 'header-drawer',
            id: 'dcuf-header-drawer-style',
            css: `
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-actions="1"] {
                position: relative;
                overflow: visible;
            }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer="1"] {
                position: relative;
                z-index: 3;
                margin: 0;
                padding: 0;
                display: inline-flex;
                align-items: center;
                flex: 0 0 auto;
            }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer="1"] .dcuf-header-drawer__toggle {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                min-height: 32px;
                padding: 0 12px;
                border: 1px solid var(--dcuf-border);
                border-radius: 999px;
                background: rgba(255, 255, 255, 0.94);
                color: var(--dcuf-fg-sub);
                font-size: 12px;
                font-weight: 700;
                letter-spacing: -0.01em;
                box-shadow: none;
                white-space: nowrap;
            }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer="1"] .dcuf-header-drawer__toggle::after {
                content: "\\25be";
                font-size: 10px;
                transition: transform 0.18s ease;
            }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer="1"][data-open="1"] .dcuf-header-drawer__toggle::after {
                transform: rotate(180deg);
            }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer="1"] .dcuf-header-drawer__body {
                display: none;
                max-height: 0;
                opacity: 0;
                visibility: hidden;
                margin-top: 0;
                position: absolute;
                top: calc(100% + 8px);
                left: var(--dcuf-header-drawer-inline-start, 0px);
                right: auto;
                width: min(${layout.maxWidth}px, calc(var(--dcuf-header-drawer-viewport-width, 100vw) - 24px));
                max-width: calc(var(--dcuf-header-drawer-viewport-width, 100vw) - 24px);
                overflow: hidden;
                pointer-events: none;
                z-index: 60;
                transition: opacity 0.18s ease;
            }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer="1"][data-open="1"] .dcuf-header-drawer__body {
                display: block;
                opacity: 1;
                visibility: visible;
                margin-top: 0;
                pointer-events: auto;
                overflow: visible;
            }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer="1"] .dcuf-header-drawer__body-inner:not(:empty) {
                min-height: 0;
                overflow: visible;
                display: grid;
                gap: 0;
                border: 1px solid var(--dcuf-border, #dfe5ee);
                background: #fff;
                box-shadow: 0 10px 22px rgba(12, 22, 40, 0.12);
            }
            [data-dcuf-header-drawer-scope="1"] ${selectors.door}[data-dcuf-header-native-door-open="1"] {
                display: block;
                visibility: visible;
                opacity: 1;
                position: fixed;
                left: var(--dcuf-header-native-door-left, 12px);
                top: var(--dcuf-header-native-door-top, 12px);
                width: min(${layout.maxWidth}px, calc(var(--dcuf-header-drawer-viewport-width, 100vw) - 24px));
                max-width: calc(var(--dcuf-header-drawer-viewport-width, 100vw) - 24px);
                min-width: 0;
                height: auto;
                margin: 0;
                float: none;
                box-sizing: border-box;
                border: 1px solid var(--dcuf-b1-rim);
                border-radius: 16px;
                background: var(--dcuf-b1-sheen),var(--dcuf-b1-floating);
                color: var(--dcuf-theme-fg);
                box-shadow: var(--dcuf-b1-shadow);
                backdrop-filter: none;
                overflow: visible;
                z-index: 60;
            }
            [data-dcuf-header-drawer-scope="1"] ${selectors.door}[data-dcuf-header-native-door-popup-only="1"] {
                visibility: hidden;
                pointer-events: none;
                border-color: transparent;
                background: transparent;
                box-shadow: none;
            }
            [data-dcuf-header-drawer-scope="1"] .issue_wrap[data-dcuf-header-native-door-layer-open="1"] { position: relative; z-index: 2147482800 !important; }
            [data-dcuf-header-drawer-scope="1"] ${selectors.door}[data-dcuf-header-native-door-popup-only="1"] ${selectors.rankPopup},
            [data-dcuf-header-drawer-scope="1"] ${selectors.door}[data-dcuf-header-native-door-popup-only="1"] ${selectors.tipPopup} {
                visibility: visible;
                pointer-events: auto;
            }
            [data-dcuf-header-drawer-scope="1"] ${selectors.door}[data-dcuf-header-native-door-open="1"] ${selectors.fluid} {
                box-sizing: border-box;
                max-width: 100%;
            }
            [data-dcuf-header-drawer-scope="1"] ${selectors.door}[data-dcuf-header-native-door-open="1"] ${selectors.intro},
            [data-dcuf-header-drawer-scope="1"] ${selectors.door}[data-dcuf-header-native-door-open="1"] ${selectors.ranking} {
                width: 100%;
            }
            [data-dcuf-header-drawer-scope="1"] ${selectors.door}[data-dcuf-header-native-door-open="1"] ${selectors.buttonDecoration}::before,
            [data-dcuf-header-drawer-scope="1"] ${selectors.door}[data-dcuf-header-native-door-open="1"] ${selectors.closeDecoration}::before {
                content: none;
                display: none;
            }
            @media (max-width: 420px), (max-height: 600px) {
                [data-dcuf-header-drawer-scope="1"] ${selectors.door}[data-dcuf-header-native-door-open="1"] ${selectors.tipPopup} {
                    position: fixed;
                    top: 50% !important;
                    right: auto;
                    left: 50%;
                    margin: 0;
                    transform: translate(-50%, -50%);
                    max-width: calc(100vw - 24px);
                    max-height: calc(100vh - 24px);
                    overflow: auto;
                }
                [data-dcuf-header-drawer-scope="1"] ${selectors.door}[data-dcuf-header-native-door-open="1"] ${selectors.tipPopup} > ${selectors.fluid} {
                    min-width: 0;
                }
            }
            [data-dcuf-header-drawer-scope="1"].dc-filter-dark-mode ${selectors.door}[data-dcuf-header-native-door-open="1"] {
                background: var(--dcuf-b1-sheen),var(--dcuf-b1-floating);
                border-color: var(--dcuf-b1-rim);
                color: var(--dcuf-theme-fg);
            }
            [data-dcuf-header-drawer-scope="1"].dc-filter-dark-mode ${selectors.door}[data-dcuf-header-native-door-open="1"] ${selectors.ranking} {
                background: var(--dcuf-b1-paper);
                border-color: var(--dcuf-b1-line);
                color: var(--dcuf-theme-fg);
            }
            [data-dcuf-header-drawer-scope="1"].dc-filter-dark-mode ${selectors.door}[data-dcuf-header-native-door-open="1"] ${selectors.intro} {
                background: transparent;
                color: var(--dcuf-theme-fg);
            }
            [data-dcuf-header-drawer-scope="1"] ${selectors.recommendationStack} {
                z-index: 1002;
            }
            [data-dcuf-header-drawer-scope="1"] ${selectors.recommendation}[data-dcuf-header-native-recom-open="1"] {
                display: block;
                visibility: visible;
                position: fixed;
                left: var(--dcuf-header-native-door-left, 12px);
                top: var(--dcuf-header-native-recom-top, 12px);
                width: min(${layout.maxWidth}px, calc(var(--dcuf-header-drawer-viewport-width, 100vw) - 24px));
                max-width: calc(var(--dcuf-header-drawer-viewport-width, 100vw) - 24px);
                min-width: 0;
                max-height: min(70vh, 520px);
                box-sizing: border-box;
                margin: 0;
                float: none;
                border: 1px solid var(--dcuf-border, #dfe5ee);
                background: #fff;
                box-shadow: 0 10px 22px rgba(12, 22, 40, 0.12);
                overflow: auto;
                z-index: 60;
            }
            [data-dcuf-header-drawer-scope="1"] ${selectors.recommendation}[data-dcuf-header-native-recom-open="1"] > ${selectors.recommendationPaging},
            [data-dcuf-header-drawer-scope="1"] ${selectors.recommendation}[data-dcuf-header-native-recom-open="1"] > ${selectors.recommendationText},
            [data-dcuf-header-drawer-scope="1"] ${selectors.recommendation}[data-dcuf-header-native-recom-open="1"] > ${selectors.recommendationImage} {
                box-sizing: border-box;
                width: 100%;
                max-width: 100%;
                float: none;
            }
            [data-dcuf-header-drawer-scope="1"].dc-filter-dark-mode ${selectors.recommendation}[data-dcuf-header-native-recom-open="1"] {
                background: #1a222e;
                border-color: #3d4c60;
                color: #d2dced;
            }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-popup="1"] {
                position: fixed !important;
                left: 50% !important;
                top: var(--dcuf-header-popup-center,calc(50% - 48px)) !important;
                right: auto !important;
                bottom: auto !important;
                margin: 0 !important;
                transform: translate(-50%, -50%) !important;
                z-index: 2147483647 !important;
            }
            @media (max-width: 997px) {
                [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-popup="1"] {
                    box-sizing: border-box;
                    max-width: calc(var(--dcuf-header-drawer-viewport-width, 100vw) - 24px);
                    max-height: calc(100vh - 24px);
                    overflow: auto;
                }
            }
            [data-dcuf-header-drawer-scope="1"] ${selectors.relationPopup}:not([data-dcuf-header-relation-static="1"]) {
                position: fixed;
                left: 50% !important;
                top: var(--dcuf-header-popup-center,calc(50% - 48px)) !important;
                transform: translate(-50%,-50%);
                width: min(640px,calc(100vw - 32px));
                max-width: calc(100vw - 32px);
                max-height: calc(100dvh - var(--dcuf-header-popup-clearance,128px));
                overflow: hidden;
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                border: 1px solid var(--dcuf-b1-rim);
                border-radius: 16px;
                background: var(--dcuf-b1-sheen),var(--dcuf-b1-floating);
                color: var(--dcuf-theme-fg);
                box-shadow: var(--dcuf-b1-shadow);
                backdrop-filter: blur(24px);
                z-index: 2147482900;
            }
            [data-dcuf-header-drawer-scope="1"] ${selectors.relationStatic} {
                position: relative;
            }
            [data-dcuf-header-drawer-scope="1"] ${selectors.door}[data-dcuf-header-native-door-open="1"]:has([data-dcuf-header-drawer-part="hero"]) { display: grid; grid-template-columns: minmax(0,1fr) 150px; gap: 20px; padding: 20px; max-height: calc(100dvh - 32px); overflow: auto; }
            [data-dcuf-header-drawer-scope="1"] ${selectors.door}[data-dcuf-header-native-door-open="1"]::after { display: none; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="intro"] { float: none; width: auto; min-width: 0; max-width: 100%; padding: 0; margin: 0; border: 0; background: transparent; color: var(--dcuf-theme-fg); }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="hero"] { display: grid; float: none; grid-template-columns: 120px minmax(0,1fr); gap: 16px; width: 100%; min-width: 0; margin: 0; padding: 0; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="hero"]::after { display: none; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="image"] { display: block; float: none; width: 120px; height: 90px; margin: 0; border-radius: 10px; background-size: cover; background-position: center; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="image-frame"] { float: none; width: 120px; height: auto; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="image-cover"] { display: block; width: 100%; height: 100%; border-radius: inherit; background-size: cover; background-position: center; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="description"] { float: none; width: auto; min-width: 0; height: auto; margin: 0; padding: 0; color: var(--dcuf-theme-fg); font: 400 13px/1.7 system-ui,sans-serif; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="description"] > p { margin: 0; color: inherit; font: inherit; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="info"] { position: static; float: none; width: 100%; min-width: 0; height: auto; overflow: visible; margin: 16px 0 0; padding: 0; color: var(--dcuf-theme-fg-muted); font: 400 12px/1.6 system-ui,sans-serif; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="info"] strong, [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="info"] p, [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="info"] span, [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="info"] button { color: inherit; font-family: inherit; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="info-row"] { display: flex; align-items: baseline; gap: 12px; overflow: visible; margin: 6px 0; line-height: 1.6; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="info-label"] { float: none; flex: 0 0 65px; width: auto; line-height: inherit; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="info-value"] { float: none; min-width: 0; margin: 0; line-height: inherit; overflow-wrap: anywhere; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="info-row"] > button { min-height: 32px; padding: 4px 8px; border: 0; border-radius: 6px; background: transparent; color: var(--dcuf-theme-fg-muted); font: inherit; cursor: pointer; }
            [data-dcuf-header-drawer-scope="1"] ${selectors.door}[data-dcuf-header-native-door-open="1"] [data-dcuf-header-drawer-part="ranking"] { position: relative; float: none; align-self: stretch; width: auto; min-width: 0; height: auto; margin: 0; padding: 16px 10px; border: 1px solid var(--dcuf-b1-line); border-radius: 12px; background: var(--dcuf-b1-paper); color: var(--dcuf-theme-fg); text-align: center; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="ranking"] > .ranking { width: auto; height: auto; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="rank-title"] { width: auto; height: auto; margin: 0; background: none; color: var(--dcuf-theme-fg-muted); font: 650 13px/1.5 system-ui,sans-serif; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="rank-digits"] { width: auto; height: auto; margin: 8px 0 12px; padding: 0; color: var(--dcuf-theme-fg); font-size: 0; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="rank-digit"] { display: inline; width: auto; height: auto; margin: 0; background: none; color: inherit; font: 750 32px/1.2 system-ui,sans-serif; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="rank-suffix"] { display: inline; width: auto; height: auto; margin: 0 0 0 4px; background: none; color: var(--dcuf-theme-fg-muted); font: 500 13px/1.5 system-ui,sans-serif; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="tip-trigger"] { position: absolute; inset: 4px 4px auto auto; display: grid; place-items: center; width: 30px; height: 30px; padding: 0; border: 0; border-radius: 7px; background: transparent; color: var(--dcuf-theme-fg-muted); cursor: pointer; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="tip-trigger"] > em { display: none; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="tip-trigger"]::after { content: "?"; display: grid; place-items: center; width: 15px; height: 15px; border: 1px solid currentColor; border-radius: 50%; font: 650 11px/1 system-ui,sans-serif; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="visible-label"] { position: static; overflow: visible; width: auto; height: auto; margin: 0; clip: auto; clip-path: none; visibility: visible; color: inherit; font: inherit; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="rank-trigger"] { display: inline-flex; align-items: center; justify-content: center; width: auto; min-height: 36px; height: auto; padding: 6px 10px; border: 1px solid var(--dcuf-theme-border); border-radius: 8px; background: transparent; color: var(--dcuf-theme-fg); font: 500 12px/1.5 system-ui,sans-serif; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-popup="1"], [data-dcuf-header-drawer-scope="1"] ${selectors.tipPopup} { box-sizing: border-box; border: 1px solid var(--dcuf-b1-rim); border-radius: 16px; background: var(--dcuf-b1-sheen),var(--dcuf-b1-floating); color: var(--dcuf-theme-fg); box-shadow: var(--dcuf-b1-shadow); backdrop-filter: blur(24px); }
            [data-dcuf-header-drawer-scope="1"] ${selectors.rankPopup}[data-dcuf-header-drawer-popup="1"] { width: min(860px,calc(100vw - 32px)); max-width: calc(100vw - 32px); max-height: calc(100dvh - var(--dcuf-header-popup-clearance,128px)); overflow: hidden; }
            [data-dcuf-header-drawer-scope="1"] ${selectors.tipPopup} { width: min(380px,calc(100vw - 32px)); max-width: calc(100vw - 32px); }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="panel"] { width: 100%; min-width: 0; margin: 0; padding: 0; border: 0; background: transparent; color: inherit; box-sizing: border-box; }
            [data-dcuf-header-drawer-scope="1"] ${selectors.rankPopup} > [data-dcuf-header-drawer-part="panel"] { width: 100%; min-width: 0; padding: 0; border: 0; background: transparent; color: var(--dcuf-theme-fg); box-sizing: border-box; }
            [data-dcuf-header-drawer-scope="1"] ${selectors.rankPopup} [data-dcuf-header-drawer-part="head"] { flex-direction: column; align-items: flex-start; gap: 6px; }
            /* Glass is a decoration sibling of the original fixed descendants. */
            [data-dcuf-header-drawer-scope="1"] ${selectors.door}[data-dcuf-header-native-door-open="1"]::before { content: ""; position: absolute; inset: 0; border-radius: inherit; backdrop-filter: blur(24px); pointer-events: none; z-index: -1; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="panel"] > [data-dcuf-header-drawer-part="head"] { display: flex; align-items: center; min-height: 70px; height: auto; margin: 0; padding: 20px 62px 18px 20px; border: 0; border-bottom: 1px solid var(--dcuf-b1-line); background: transparent; color: inherit; box-sizing: border-box; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="head"] > [data-dcuf-header-drawer-part="title"] { margin: 0; color: inherit; font: 750 16px/1.5 system-ui,sans-serif; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="message"] { margin: 0; padding: 0; color: var(--dcuf-theme-fg-muted); font: 400 12px/1.65 system-ui,sans-serif; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="title"] > [data-dcuf-header-drawer-part="message"] { display: block; margin-top: 6px; }
            [data-dcuf-header-drawer-scope="1"] ${selectors.tipPopup} > [data-dcuf-header-drawer-part="panel"] { width: 100%; min-width: 0; padding: 18px 54px 18px 20px; border: 0; border-radius: inherit; background: transparent; color: inherit; }
            [data-dcuf-header-drawer-scope="1"] ${selectors.tipPopup} [data-dcuf-header-drawer-part="message"] { min-width: 0; max-width: 100%; overflow-wrap: anywhere; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="rank-body"] { max-height: calc(100dvh - 220px - var(--dcuf-header-rank-extra-clearance,96px)); overflow: auto; overscroll-behavior: contain; }
            [data-dcuf-header-drawer-scope="1"] ${selectors.rankPopup} [data-dcuf-header-drawer-part="rank-list"] { display: block; float: none; width: 100%; height: auto; margin: 0; padding: 16px; overflow: hidden; column-count: auto; list-style: none; box-sizing: border-box; }
            [data-dcuf-header-drawer-scope="1"] ${selectors.rankPopup} [data-dcuf-header-drawer-part="rank-list"] > li { float: left; width: 20%; height: auto; margin: 0; padding: 0; box-sizing: border-box; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="rank-list"] > li > a { display: block; min-height: 36px; height: auto; padding: 8px; border-radius: 6px; color: var(--dcuf-theme-fg); font: 500 13px/1.5 system-ui,sans-serif; text-decoration: none; box-sizing: border-box; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="rank-number"] { display: inline-block; min-width: 18px; margin-right: 6px; font-variant-numeric: tabular-nums; }
            [data-dcuf-header-drawer-scope="1"] ${selectors.relationPopup} > [data-dcuf-header-drawer-part="panel"] { display: grid; grid-template-columns: 1fr 1fr; max-height: inherit; overflow: auto; }
            [data-dcuf-header-drawer-scope="1"] ${selectors.relationPopup} [data-dcuf-header-drawer-part="head"] { position: sticky; top: 0; z-index: 1; background: var(--dcuf-b1-floating); }
            [data-dcuf-header-drawer-scope="1"] ${selectors.relationPopup} [data-dcuf-header-drawer-part="message"] { width: auto; height: auto; min-height: 0; margin: 0; padding: 0; border: 0; background: transparent; color: var(--dcuf-theme-fg-muted); }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="relation-group"] [data-dcuf-header-drawer-part="message"] > b { color: var(--dcuf-theme-fg); font: 650 13px/1.6 system-ui,sans-serif; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="relation-group"] [data-dcuf-header-drawer-part="message"] > p { margin: 6px 0 0; color: inherit; font: inherit; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-relation-popup="1"] [data-dcuf-header-drawer-part="head"] { grid-column: 1/-1; }
            [data-dcuf-header-drawer-scope="1"] ${selectors.relationPopup} [data-dcuf-header-drawer-part="relation-group"] { position: static; float: none; display: block; width: auto; min-width: 0; height: auto; margin: 0; padding: 20px; border: 0; box-sizing: border-box; }
            [data-dcuf-header-drawer-scope="1"] ${selectors.relationPopup} [data-dcuf-header-drawer-part="relation-group"] + [data-dcuf-header-drawer-part="relation-group"] { border-left: 1px solid var(--dcuf-b1-line); }
            [data-dcuf-header-drawer-scope="1"] ${selectors.relationPopup} [data-dcuf-header-drawer-part="relation-list"] { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; width: 100%; height: auto; min-height: 0; overflow: visible; margin: 16px 0; padding: 0; list-style: none; }
            [data-dcuf-header-drawer-scope="1"] ${selectors.relationPopup} [data-dcuf-header-drawer-part="relation-list"] > li { float: none; width: auto; min-width: 0; height: auto; padding: 0; margin: 0; overflow: visible; white-space: normal; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="relation-list"]::after { display: none; }
            [data-dcuf-header-drawer-scope="1"] ${selectors.relationPopup} [data-dcuf-header-drawer-part="relation-link"] { display: block; float: none; width: auto; min-height: 36px; height: auto; padding: 8px 0; box-sizing: border-box; color: var(--dcuf-theme-fg); font: 500 13px/1.5 system-ui,sans-serif; text-decoration: none; white-space: normal; overflow: visible; overflow-wrap: anywhere; }
            [data-dcuf-header-drawer-scope="1"] ${selectors.relationPopup} [data-dcuf-header-drawer-part="page-counter"], [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="page-counter"] > strong, [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="page-counter"] > span { color: var(--dcuf-theme-fg-muted); font: 500 12px/1.5 system-ui,sans-serif; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="actions"] { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin: 0; padding: 12px 16px; border: 0; color: var(--dcuf-theme-fg-muted); }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="previous"], [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="next"] { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; min-height: 32px; padding: 0; border: 1px solid var(--dcuf-theme-border); border-radius: 7px; background: var(--dcuf-b1-paper); color: var(--dcuf-theme-fg-muted); }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="previous"] > em, [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="next"] > em { display: none; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="previous"]::before { content: "‹"; font: 500 20px/1 system-ui,sans-serif; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="next"]::before { content: "›"; font: 500 20px/1 system-ui,sans-serif; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-relation-popup="1"] > [data-dcuf-header-drawer-part="close"] { z-index: 2; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="close"] { position: absolute; inset: 16px 12px auto auto; display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; margin: 0; padding: 0; border: 0; border-radius: 8px; background: transparent; color: var(--dcuf-theme-fg-muted); font-size: 0; cursor: pointer; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="close"] > em { display: none; }
            [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-part="close"]::before { content: ""; width: 14px; height: 14px; background: currentColor; mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='m4 4 8 8M12 4l-8 8' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E") center/contain no-repeat; }
            @media (max-width: 640px) {
                [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer-popup="1"] { --dcuf-header-popup-center: calc(50% - 48px); --dcuf-header-popup-clearance: 128px; --dcuf-header-rank-extra-clearance: 96px; }
                [data-dcuf-header-drawer-scope="1"] [data-dcuf-header-relation-popup="1"] { --dcuf-header-popup-center: calc(50% - 48px); --dcuf-header-popup-clearance: 128px; }
                [data-dcuf-header-drawer-scope="1"] ${selectors.door}[data-dcuf-header-native-door-open="1"]:has([data-dcuf-header-drawer-part="hero"]) { grid-template-columns: minmax(0,1fr); }
                [data-dcuf-header-drawer-scope="1"] ${selectors.relationPopup} > [data-dcuf-header-drawer-part="panel"] { grid-template-columns: minmax(0,1fr); }
                [data-dcuf-header-drawer-scope="1"] ${selectors.relationPopup} [data-dcuf-header-drawer-part="relation-group"] + [data-dcuf-header-drawer-part="relation-group"] { border-left: 0; border-top: 1px solid var(--dcuf-b1-line); }
                [data-dcuf-header-drawer-scope="1"] ${selectors.rankPopup} [data-dcuf-header-drawer-part="rank-list"] { min-width: 640px; }
            }
            [data-dcuf-header-drawer-scope="1"].dc-filter-dark-mode [data-dcuf-header-drawer="1"] .dcuf-header-drawer__toggle {
                background: rgba(26, 34, 46, 0.92);
                border-color: #3d4c60;
                color: #d2dced;
                box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
            }
        
`
        });
        };
        const style = describeNativeStyle(Object.freeze([
            { slot: "door", selector: "[data-dcuf-header-native-door=\"1\"][data-dcuf-header-door-context=\"1\"]" },
            { slot: "recommendation", selector: "[data-dcuf-header-native-recom=\"1\"][data-dcuf-header-recom-context=\"1\"]" },
            { slot: "relationPopup", selector: "[data-dcuf-header-relation-popup=\"1\"][data-dcuf-header-relation-context=\"1\"]" },
            { slot: "relationStatic", selector: "[data-dcuf-header-relation-static=\"1\"][data-dcuf-header-relation-context=\"1\"]" },
            { slot: "fluid", selector: "[data-dcuf-header-door-fluid=\"1\"]" },
            { slot: "intro", selector: "[data-dcuf-header-door-intro=\"1\"]" },
            { slot: "ranking", selector: "[data-dcuf-header-door-ranking=\"1\"]" },
            { slot: "buttonDecoration", selector: "[data-dcuf-header-door-no-decoration=\"1\"]" },
            { slot: "closeDecoration", selector: "[data-dcuf-header-door-no-decoration=\"1\"]" },
            { slot: "rankPopup", selector: "[data-dcuf-header-door-popup=\"rank\"]" },
            { slot: "tipPopup", selector: "[data-dcuf-header-door-popup=\"tip\"]" },
            { slot: "recommendationPaging", selector: "[data-dcuf-header-recom-part=\"paging\"]" },
            { slot: "recommendationText", selector: "[data-dcuf-header-recom-part=\"text\"]" },
            { slot: "recommendationImage", selector: "[data-dcuf-header-recom-part=\"image\"]" },
            { slot: "recommendationStack", selector: "[data-dcuf-header-recom-stack=\"1\"]" }
        ].map(Object.freeze)));
        return Object.freeze({ shell, layout, describeOpenState, describeToggleIntent, describeBodyVisibility, describeBodyOffset, describeBodyHeight, describeBodyPadding, style, nativeStyleSlots, describeNativeStyle, buildThemeCss: __dcufBuildHeaderDrawerThemeCss, buildVisibilityCss: __dcufBuildHeaderDrawerVisibilityCss });
    })();
    __dcufRoot.__dcufHeaderDrawerPresenter = __dcufHeaderDrawerPresenter;
