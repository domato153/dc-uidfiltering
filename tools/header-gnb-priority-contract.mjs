import assert from 'node:assert/strict';

// Preserve the frozen historical CSS oracle except for these exact, declared
// priority changes. Reject missing/duplicate declarations and old priorities;
// selectors, values, all other priorities and rule order still compare exactly.
export function restoreHistoricalGnbPriorities(css, kind) {
    assert.ok(['base', 'theme'].includes(kind), 'Unknown GNB priority contract');
    const declarations = kind === 'base' ? ['background: #3b4890;']
        : ['background-color: var(--dcuf-theme-accent-strong);', 'background-image: none;'];
    for (const declaration of declarations) {
        assert.equal(css.split(declaration).length - 1, 1, `Exactly one normal GNB ${declaration} required`);
        css = css.replace(declaration, declaration.replace(';', ' !important;'));
    }
    return css;
}
