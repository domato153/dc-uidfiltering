import { palettePriorityProfile } from '../tools/header-palette-priority-contract.mjs';

export async function captureHeaderPaletteBatch(page, simulate = false) {
    return page.evaluate(({ profile, simulate }) => {
        const check = (ok, message) => { if (!ok) throw Error(message); };
        const palette = document.getElementById('dcuf-mobile-palette-style');
        check(palette, 'positive mounted palette');
        const families = Object.values(profile).map(p => p.family);
        const root = document.documentElement, initialPalette = root.getAttribute('data-dcuf-palette');
        const walk = rules => [...rules].flatMap(r => r.selectorText && r.style ? [r] : r.cssRules ? walk(r.cssRules) : []);
        const rules = walk(palette.sheet.cssRules), saved = new Map();
        if (simulate) for (const { family, rules: changes } of Object.values(profile)) {
            const adapter = window['__dcuf' + family + 'HostAdapter'], presenter = window['__dcuf' + family + 'Presenter'];
            const css = presenter.buildThemeCss(adapter.describeThemeSelectors('data-dcuf-palette'));
            const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
            for (const { rule: index, declarations } of changes) {
                const sheet = new CSSStyleSheet(); sheet.replaceSync(blocks[index][0]);
                const matches = rules.filter(r => r.selectorText === sheet.cssRules[0].selectorText);
                check(matches.length === 1, 'one exact palette owner rule');
                const rule = matches[0]; saved.set(rule, rule.style.cssText);
                let body = blocks[index][2];
                for (const normal of declarations) {
                    const important = normal.replace(';', ' !important;');
                    check(body.split(important).length === 2, 'one original palette priority');
                    body = body.replace(important, normal);
                }
                rule.style.cssText = body;
            }
        }
        const late = ['header-shell', 'gallery-page-head', 'header-gnb', 'header-recent-visit', 'header-drawer']
            .map(id => document.getElementById('dcuf-' + id + '-style')?.sheet).filter(Boolean);
        const disabled = late.map(s => s.disabled), paletteDisabled = palette.sheet.disabled;
        const nodes = [...new Set([...document.querySelectorAll('.dcheader,.page_head,.issue_wrap')]
            .flatMap(n => [n, ...n.querySelectorAll('*')]))].filter(n => n instanceof HTMLElement && !['SCRIPT', 'STYLE'].includes(n.tagName));
        const topology = nodes.map(n => [n, n.parentNode, n.nextSibling]);
        const gm = JSON.stringify(window.__dcufTestbedGM.snapshot());
        const resources = () => families.map(f => window['__dcuf' + f + 'HostAdapter'].snapshotResources?.() || null);
        const beforeResources = JSON.stringify(resources());
        const properties = ['display', 'visibility', 'position', 'width', 'height', 'min-width', 'max-width', 'margin', 'padding', 'gap',
            'align-items', 'justify-content', 'box-sizing', 'overflow', 'color', 'background-color', 'background-image', 'background-position',
            'border', 'border-radius', 'box-shadow', 'filter', 'vertical-align', 'text-indent', 'font', 'font-size', 'line-height', 'text-transform', 'content'];
        const sample = () => nodes.flatMap(n => ['', '::before', '::after'].map(p => {
            const style = getComputedStyle(n, p || null), r = n.getBoundingClientRect();
            return [...(p ? [] : [r.x, r.y, r.width, r.height]), ...properties.map(k => style.getPropertyValue(k))];
        }));
        const states = [];
        try {
            const header = document.querySelector('.dcheader.typea'), rect = header.getBoundingClientRect();
            check(rect.width > 0 && rect.height > 0, 'positive native header geometry');
            for (const phase of ['mounted', 'late-inactive']) {
                late.forEach((s, i) => { s.disabled = phase === 'late-inactive' || disabled[i]; });
                for (const id of ['blue', 'purple', 'green', 'orange', 'mono', 'indigo', 'sky', 'cyan', 'teal', 'lime', 'amber', 'red', 'rose', 'pink']) {
                    root.setAttribute('data-dcuf-palette', id);
                    states.push({ phase, palette: id, nodes: sample() });
                }
                root.removeAttribute('data-dcuf-palette'); states.push({ phase, palette: 'attribute-absent', nodes: sample() });
                root.setAttribute('data-dcuf-palette', 'blue'); palette.sheet.disabled = true;
                states.push({ phase, palette: 'sheet-inactive', nodes: sample() }); palette.sheet.disabled = paletteDisabled;
            }
        } finally {
            for (const [rule, text] of saved) rule.style.cssText = text;
            late.forEach((s, i) => { s.disabled = disabled[i]; }); palette.sheet.disabled = paletteDisabled;
            if (initialPalette === null) root.removeAttribute('data-dcuf-palette'); else root.setAttribute('data-dcuf-palette', initialPalette);
        }
        check(topology.every(([n, p, next]) => n.parentNode === p && n.nextSibling === next), 'original native topology');
        check(JSON.stringify(window.__dcufTestbedGM.snapshot()) === gm, 'CSS comparison writes no settings');
        check(JSON.stringify(resources()) === beforeResources, 'CSS comparison changes no owner resources');
        return { states, nodeCount: nodes.length, properties, signatures: nodes.map(n => n.tagName + '.' + n.className),
            nativeTopology: true, noSettingsWrite: true, ownerResourcesPreserved: true };
    }, { profile: palettePriorityProfile, simulate });
}
