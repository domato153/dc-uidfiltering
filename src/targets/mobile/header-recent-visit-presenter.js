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
            color: var(--dcuf-recent-control-ink,var(--dcuf-theme-accent-ink)) !important;
        }
`;
    }
    // Pure and hoisted: preserve complete late CSS before adapter objects initialize.
    function __dcufBuildHeaderRecentVisitStyle(selectors) {
        if (!selectors || typeof selectors !== 'object' || !Object.isFrozen(selectors)
            || Reflect.ownKeys(selectors).length !== 24
            || !["root","decoration","title","box","list","scrollbar","item","controls","arrow","darkRoot","darkTitle","trigger","popup","menuRoot","menuTitle","menuBox","menuControls","triggerDecoration","popupTabs","popupCurrent","popupContent","popupList","popupRow","popupFooter"].every(slot => {
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

        ${selectors.menuRoot} { grid-area: 1 / 4; position: relative; z-index: 1004; display: flex !important; align-items: center; width: 100% !important; min-width: 0; height: auto; padding: 0; margin: 0; background: transparent; border: none; box-sizing: border-box; gap: 5px; }
        ${selectors.decoration} { display: none !important; }
        /* Native tabLately writes display:block inline on the title. */
        ${selectors.menuTitle} { display: none !important; }
        ${selectors.menuBox} { display: none; }
        ${selectors.list} { display: flex; flex-wrap: nowrap; position: relative !important; left: 0 !important; margin-left: 0 !important; width: 100%; box-sizing: border-box; overflow-x: auto; scroll-behavior: smooth; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        ${selectors.scrollbar} { display: none; }
        ${selectors.item} { white-space: nowrap; flex-shrink: 0; }
        ${selectors.list} a { color: var(--dcuf-theme-fg-muted); text-decoration: none; }
        ${selectors.menuControls} { display: none !important; align-items: center; justify-content: center; flex: 0 0 auto; position: static !important; inset: auto !important; transform: none; margin: 0 !important; padding: 0 4px; overflow: visible; }
        ${selectors.trigger} { --dcuf-recent-control-ink: var(--dcuf-v7-dark-primary-ink,var(--dcuf-theme-accent-ink)); display: inline-flex !important; gap: 7px; width: 116px; min-height: 38px; border: 1px solid var(--dcuf-b1-rim, var(--dcuf-theme-border)); border-radius: 10px; background: var(--dcuf-v7-primary-bg); box-shadow: var(--dcuf-v7-primary-shadow); color: var(--dcuf-v7-primary-ink); font: 600 12px/1.3 system-ui, sans-serif; }
        ${selectors.trigger}::before { content: "◷ 최근 방문"; }
        ${selectors.trigger}::after { content: ""; display: block; flex: 0 0 12px; width: 12px; height: 12px; background: currentColor; mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='m4 6 4 4 4-4' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / contain no-repeat; }
        ${selectors.triggerDecoration} { display: none; }
        /* The host writes inline left/top; keep its display and event lifecycle. */
        ${selectors.popup} { position: absolute; left: auto !important; top: 46px !important; right: 0; width: min(320px, calc(100vw - 24px)); max-width: calc(100vw - 24px); max-height: min(480px, calc(100vh - 120px)); overflow: auto; box-sizing: border-box; border: 1px solid var(--dcuf-b1-rim); border-radius: 14px; background: var(--dcuf-b1-sheen), var(--dcuf-b1-floating); color: var(--dcuf-theme-fg); box-shadow: var(--dcuf-b1-shadow), inset 0 1px 0 var(--dcuf-b1-rim); backdrop-filter: var(--dcuf-b1-floating-filter,blur(24px) saturate(1.15)); }
        ${selectors.popup} > div { min-width: 0; min-height: 0; height: auto; width: 100%; padding: 10px; background: transparent; box-sizing: border-box; }
        ${selectors.popup} a { color: var(--dcuf-theme-fg); }
        ${selectors.popup} button { color: var(--dcuf-theme-accent-ink); }
        ${selectors.popupContent} { min-height: 0; height: auto; padding: 0; border: 0; background: transparent; box-sizing: border-box; }
        ${selectors.popupTabs} { display: flex; width: 100%; height: auto; padding: 0; margin: 0 0 8px; gap: 4px; border: 0; list-style: none; }
        ${selectors.popupTabs} > li { flex: 1; float: none; width: auto; margin: 0; border: 0; border-radius: 8px; background: transparent; }
        ${selectors.popupTabs} button { width: 100%; min-height: 40px; padding: 8px 10px; border: 0; border-radius: 8px; background: transparent; color: var(--dcuf-theme-fg-muted); font: 600 12px/1.3 system-ui, sans-serif; cursor: pointer; }
        ${selectors.popupTabs}::after, ${selectors.popupTabs} button::before { content: none; display: none; }
        ${selectors.popupCurrent} { border: 0; background: color-mix(in srgb, var(--dcuf-theme-accent-soft) 65%, transparent); }
        ${selectors.popupCurrent} button { color: var(--dcuf-theme-accent-ink); box-shadow: inset 0 -2px 0 var(--dcuf-theme-accent-ink); }
        ${selectors.popupList} { min-height: 0; height: auto; width: 100%; padding: 0; margin: 0; box-sizing: border-box; }
        ${selectors.popupRow} { display: flex; align-items: center; width: 100%; min-height: 44px; margin: 0; padding: 2px 6px; gap: 8px; border-radius: 8px; box-sizing: border-box; }
        ${selectors.popupRow}:hover { background: color-mix(in srgb, var(--dcuf-theme-accent-soft) 45%, transparent); }
        ${selectors.popupRow} a { flex: 1; min-width: 0; padding: 9px 2px; color: var(--dcuf-theme-fg); font: 500 12px/1.5 system-ui, sans-serif; white-space: normal; text-decoration: none; }
        ${selectors.popupRow} > button { appearance: none; display: inline-flex; align-items: center; justify-content: center; flex: 0 0 32px; position: static; width: 32px; height: 32px; padding: 0; border: 0; border-radius: 8px; background: transparent; color: var(--dcuf-theme-fg-muted); font-size: 0; cursor: pointer; }
        ${selectors.popupRow} > button::before { content: ""; width: 14px; height: 14px; background: currentColor; mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='m4 4 8 8M12 4l-8 8' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E") center / contain no-repeat; }
        ${selectors.popupRow} > button > em { display: none; }
        ${selectors.popupRow} > button:hover { background: var(--dcuf-theme-accent-soft); color: var(--dcuf-theme-accent-ink); }
        ${selectors.popupFooter} { position: static; display: flex; justify-content: flex-end; height: auto; margin: 8px 0 0; padding: 8px 0 0; border-top: 1px solid var(--dcuf-theme-border); background: transparent; }
        ${selectors.popupFooter} button { appearance: none; display: inline-flex; align-items: center; justify-content: flex-start; position: static; width: 100%; min-height: 40px; padding: 8px; border: 0; border-radius: 8px; background: transparent; color: var(--dcuf-theme-fg-muted); font: 500 12px/1.4 system-ui, sans-serif; cursor: pointer; }
        ${selectors.popupFooter} button:hover { background: var(--dcuf-theme-accent-soft); color: var(--dcuf-theme-accent-ink); }
        ${selectors.popup} :is(a, button):focus-visible { outline: 2px solid var(--dcuf-theme-accent-ink); outline-offset: 2px; }
        ${selectors.arrow} { min-width: 22px; min-height: 24px; }
        ${selectors.darkTitle} { color: #e0e0e0 !important; }
        @media (max-width: 899px) { ${selectors.menuRoot} { grid-area: 2 / 2; margin-top: 0; margin-bottom: 8px; } }
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
