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
            color: var(--dcuf-theme-accent) !important;
        }
`;
    }
    // Pure and hoisted: preserve complete late CSS before adapter objects initialize.
    function __dcufBuildHeaderRecentVisitStyle(selectors) {
        if (!selectors || typeof selectors !== 'object' || !Object.isFrozen(selectors)
            || Reflect.ownKeys(selectors).length !== 11
            || !["root","decoration","title","box","list","scrollbar","item","controls","arrow","darkRoot","darkTitle"].every(slot => {
                const field = Object.getOwnPropertyDescriptor(selectors, slot);
                return field && typeof field.value === 'string' && field.value.trim();
            })) {
            throw new TypeError('A complete frozen header-recent-visit style selector record is required');
        }
        return Object.freeze({
            key: 'header-recent-visit',
            id: 'dcuf-header-recent-visit-style',
            css: `
        ${selectors.root} { display: flex !important; align-items: center; width: 100% !important; min-width: 0 !important; height: auto !important; padding: 8px 10px !important; background: #f8f9fa !important; border: none !important; box-sizing: border-box !important; gap: 5px; }
        ${selectors.decoration} { display: none !important; }
        ${selectors.title} { flex-shrink: 0; margin: 0 !important; padding-right: 5px; font-size: 14px !important; font-weight: bold; color: #333; }
        ${selectors.box} { flex: 1; min-width: 0; overflow: hidden; }
        ${selectors.list} { display: flex; flex-wrap: nowrap; position: relative !important; left: 0 !important; margin-left: 0 !important; width: 100% !important; box-sizing: border-box; overflow-x: auto; scroll-behavior: smooth; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        ${selectors.scrollbar} { display: none; }
        ${selectors.item} { white-space: nowrap; flex-shrink: 0; }
        ${selectors.controls} { display: inline-flex !important; align-items: center; justify-content: center; flex: 0 0 auto; position: static !important; inset: auto !important; transform: none !important; margin: 0 !important; padding: 0 4px; overflow: visible !important; }
        ${selectors.arrow} { min-width: 22px; min-height: 24px; }
        ${selectors.darkRoot} { background: #1c1c1e !important; border-bottom-color: #3a3a3c !important; }
        ${selectors.darkTitle} { color: #e0e0e0 !important; }
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
