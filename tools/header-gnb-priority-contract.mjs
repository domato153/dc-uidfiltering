import assert from 'node:assert/strict';

const layoutChanges = Object.freeze({
    'header-gnb': [
        ['[data-dcuf-header-gnb-role="root"]', ['display: block;', 'height: auto;']],
        ['[data-dcuf-header-gnb-role="root"] nav[data-dcuf-header-gnb-role="nav"]',
            ['width: auto;', 'min-width: 0;', 'padding: 0 15px;', 'justify-content: center;']],
        ['[data-dcuf-header-gnb-role="root"] [data-dcuf-header-gnb-role="list"]', ['width: 100%;']],
    ],
    'gallery-page-head': [
        ['[data-dcuf-gallery-page-head-role="root"]',
            ['display: flex;', 'justify-content: space-between;', 'align-items: center;', 'box-sizing: border-box;', 'width: 100%;']],
        ['[data-dcuf-gallery-page-head-role="root"] > :is([data-dcuf-gallery-page-head-role="left"], [data-dcuf-gallery-page-head-role="both"])', ['float: none;']],
        ['[data-dcuf-gallery-page-head-role="root"] > :is([data-dcuf-gallery-page-head-role="right"], [data-dcuf-gallery-page-head-role="both"])', ['float: none;']],
    ],
});

// Restore only fourteen declared late-layout priorities for the immutable
// historical CSS oracle. Exact selector/value/count checks reject wider deltas.
export function restoreHistoricalHeaderLayoutPriorities(css, surface) {
    assert.ok(Object.hasOwn(layoutChanges, surface), 'Unknown header layout priority contract');
    for (const [selector, declarations] of layoutChanges[surface]) {
        const start = `${selector} {`;
        assert.equal(css.split(start).length - 1, 1, `Exactly one ${selector} rule required`);
        const from = css.indexOf(start) + start.length;
        const to = css.indexOf('}', from);
        assert.ok(to >= from, 'Complete layout rule required');
        let body = css.slice(from, to);
        for (const declaration of declarations) {
            assert.equal(body.split(declaration).length - 1, 1, `Exactly one normal ${surface} ${declaration} required`);
            body = body.replace(declaration, declaration.replace(';', ' !important;'));
        }
        css = css.slice(0, from) + body + css.slice(to);
    }
    return css;
}

// Preserve the frozen historical CSS oracle except for these exact, declared
// priority changes. Reject missing/duplicate declarations and old priorities;
// selectors, values, all other priorities and rule order still compare exactly.
export function restoreHistoricalGnbPriorities(css, kind) {
    assert.ok(['base', 'theme'].includes(kind), 'Unknown GNB priority contract');
    if (kind === 'base') css = restoreHistoricalHeaderLayoutPriorities(css, 'header-gnb');
    const declarations = kind === 'base' ? ['background: #3b4890;']
        : ['background-color: var(--dcuf-theme-accent-strong);', 'background-image: none;'];
    for (const declaration of declarations) {
        assert.equal(css.split(declaration).length - 1, 1, `Exactly one normal GNB ${declaration} required`);
        css = css.replace(declaration, declaration.replace(';', ' !important;'));
    }
    return css;
}
