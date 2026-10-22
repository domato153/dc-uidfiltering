    // dcuf-concept01-visual-v1: approved presentation delta; see CONCEPT01_TRIAL.md.
    // Hoisted to preserve the existing early palette injection phase.
    function __dcufBuildHeaderRecentVisitThemeCss(selectors) {
        if (!selectors || typeof selectors !== 'object' || !Object.isFrozen(selectors)
            || Reflect.ownKeys(selectors).length !== 3
            || !["title","open","activeLink"].every(slot => {
                const field = Object.getOwnPropertyDescriptor(selectors, slot);
                return field && typeof field.value === 'string' && field.value.trim();
            })) {
            throw new TypeError('A complete frozen header-recent-visit theme selector record is required');
        }
        return `
        ${selectors.title},
        ${selectors.open},
        ${selectors.activeLink} {
            color: var(--dcuf-theme-accent-ink) !important;
        }
`;
    }
    // Pure and hoisted: preserve complete late CSS before adapter objects initialize.
    function __dcufBuildHeaderRecentVisitStyle(selectors) {
        if (!selectors || typeof selectors !== 'object' || !Object.isFrozen(selectors)
            || Reflect.ownKeys(selectors).length !== 17
            || !["root","decoration","title","box","list","scrollbar","item","controls","arrow","darkRoot","darkTitle","trigger","popup","menuRoot","menuTitle","menuBox","menuControls"].every(slot => {
                const field = Object.getOwnPropertyDescriptor(selectors, slot);
                return field && typeof field.value === 'string' && field.value.trim();
            })) {
            throw new TypeError('A complete frozen header-recent-visit style selector record is required');
        }
        return Object.freeze({
            key: 'header-recent-visit',
            id: 'dcuf-header-recent-visit-style',
            css: `
        ${selectors.root} { display: flex !important; align-items: center; width: 100% !important; min-width: 0; height: auto; padding: 8px 10px; background: #f8f9fa; border: none; box-sizing: border-box; gap: 5px; }
        ${selectors.decoration} { display: none !important; }
        ${selectors.title} { flex-shrink: 0; margin: 0; padding-right: 5px; font-size: 14px; font-weight: bold; color: #333; }
        ${selectors.box} { flex: 1; min-width: 0; overflow: hidden; }
        ${selectors.list} { display: flex; flex-wrap: nowrap; position: relative !important; left: 0 !important; margin-left: 0 !important; width: 100%; box-sizing: border-box; overflow-x: auto; scroll-behavior: smooth; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        ${selectors.scrollbar} { display: none; }
        ${selectors.item} { white-space: nowrap; flex-shrink: 0; }
        ${selectors.list} a { color: var(--dcuf-theme-fg-muted); text-decoration: none; }
        ${selectors.controls} { display: inline-flex !important; align-items: center; justify-content: center; flex: 0 0 auto; position: static !important; inset: auto !important; transform: none; margin: 0 !important; padding: 0 4px; overflow: visible; }
        ${selectors.arrow} { min-width: 22px; min-height: 24px; }
        ${selectors.darkRoot} { background: #1c1c1e; border-bottom-color: #3a3a3c; }
        ${selectors.darkTitle} { color: #e0e0e0 !important; }
        /* Keep the horizontal fallback until the original native layer exists. */

        ${selectors.menuRoot} { grid-area: 1 / 3; position: relative; z-index: 1004; display: flex !important; align-items: center; width: 100% !important; min-width: 0; height: auto; padding: 0; margin-top: 14px; background: transparent; border: none; box-sizing: border-box; gap: 5px; }
        ${selectors.decoration} { display: none !important; }
        /* Native tabLately writes display:block inline on the title. */
        ${selectors.menuTitle} { display: none !important; }
        ${selectors.menuBox} { display: none; }
        ${selectors.list} { display: flex; flex-wrap: nowrap; position: relative !important; left: 0 !important; margin-left: 0 !important; width: 100%; box-sizing: border-box; overflow-x: auto; scroll-behavior: smooth; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        ${selectors.scrollbar} { display: none; }
        ${selectors.item} { white-space: nowrap; flex-shrink: 0; }
        ${selectors.list} a { color: var(--dcuf-theme-fg-muted); text-decoration: none; }
        ${selectors.menuControls} { display: none !important; align-items: center; justify-content: center; flex: 0 0 auto; position: static !important; inset: auto !important; transform: none; margin: 0 !important; padding: 0 4px; overflow: visible; }
        ${selectors.trigger} { display: inline-flex !important; gap: 7px; width: 116px; min-height: 38px; border: 1px solid var(--dcuf-b1-rim, var(--dcuf-theme-border)); border-radius: 10px; background: linear-gradient(150deg, #ffffff20, transparent), var(--dcuf-theme-accent-soft); box-shadow: inset 0 1px 0 #ffffff28; color: var(--dcuf-theme-accent-ink); font: 600 12px/1.3 system-ui, sans-serif; }
        ${selectors.trigger}::before { content: "◷ 최근 방문"; }
        ${selectors.trigger}::after { content: "⌄"; }
        ${selectors.trigger} > em { display: none; }
        /* The host writes inline left/top; keep its display and event lifecycle. */
        ${selectors.popup} { position: absolute; left: auto !important; top: 46px !important; right: 0; width: min(320px, calc(100vw - 24px)); max-width: calc(100vw - 24px); max-height: min(480px, calc(100vh - 120px)); overflow: auto; box-sizing: border-box; border: 1px solid var(--dcuf-theme-border); border-radius: 14px; background: color-mix(in srgb, var(--dcuf-theme-surface-raised) 97%, transparent); color: var(--dcuf-theme-fg); box-shadow: var(--dcuf-theme-popup-shadow); backdrop-filter: blur(24px); }
        ${selectors.popup} > div { min-width: 0; width: 100%; box-sizing: border-box; }
        ${selectors.popup} a { color: var(--dcuf-theme-fg); }
        ${selectors.popup} button { color: var(--dcuf-theme-accent-ink); }
        ${selectors.arrow} { min-width: 22px; min-height: 24px; }
        ${selectors.darkTitle} { color: #e0e0e0 !important; }
        @media (max-width: 759px) { ${selectors.menuRoot} { grid-area: 2 / 2; margin-top: 0; margin-bottom: 8px; } }
`
        });
    }
    const __dcufHeaderRecentVisitPresenter = (() => {
        const style = __dcufBuildHeaderRecentVisitStyle(__dcufDescribeHeaderRecentVisitStyleSelectors());
        const listStyle = Object.freeze([
            Object.freeze({ name: 'left', value: '0px', priority: 'important' }),
            Object.freeze({ name: 'margin-left', value: '0px', priority: 'important' }),
        ]);
        const controlStates = Object.freeze([false, true].flatMap(canPrev => [false, true].map(canNext => Object.freeze({
            prev: Object.freeze({ on: canPrev, ariaDisabled: String(!canPrev) }),
            next: Object.freeze({ on: canNext, ariaDisabled: String(!canNext) }),
        }))));
        const describeListStyle = () => listStyle;
        const describeControls = snapshot => controlStates[(snapshot.canPrev ? 2 : 0) + (snapshot.canNext ? 1 : 0)];
        return Object.freeze({ style, buildStyle: __dcufBuildHeaderRecentVisitStyle, describeListStyle, describeControls, buildThemeCss: __dcufBuildHeaderRecentVisitThemeCss });
    })();
    __dcufRoot.__dcufHeaderRecentVisitPresenter = __dcufHeaderRecentVisitPresenter;
