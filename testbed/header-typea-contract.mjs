// Reversible applicability checks on the original owner plus childless/native
// shaped probes. No new production event, scheduler or source transformation.
export async function runHeaderTypeaContract(page) {
    return page.evaluate(() => {
        const check = (ok, message) => { if (!ok) throw Error(message); };
        const adapter = window.__dcufHeaderShellHostAdapter;
        const root = document.querySelector('.dcheader.typea');
        const role = 'data-dcuf-header-shell-role';
        const style = document.getElementById('dcuf-header-shell-style');
        check(root && style && adapter, 'positive original typea owner');
        const inputs = adapter.describeStyleSelectors();
        const theme = adapter.describeThemeSelectors('data-dcuf-palette');
        const reset = adapter.describeResetSelectors();
        const rules = [...style.sheet.cssRules].filter(r => [inputs.root, inputs.darkRoot].includes(r.selectorText));
        check(rules.length === 2 && rules.every(r => r.selectorText.endsWith('.typea')), 'both native root predicates retained');
        const selectors = rules.map(r => r.selectorText);
        const nodes = [root, ...root.querySelectorAll('*')];
        const topology = nodes.map(n => [n, n.parentNode, n.nextSibling, n.getAttribute(role), n.getAttribute('onclick'), n.getAttribute('href')]);
        const view = () => nodes.map(n => { const r = n.getBoundingClientRect(), s = getComputedStyle(n); return {
            box: [r.x, r.y, r.width, r.height], style: [s.height, s.backgroundColor, s.borderBottomColor, s.display] }; });
        const before = view(), initialClass = root.getAttribute('class'), initialInline = root.getAttribute('style');
        const gm = JSON.stringify(window.__dcufTestbedGM.snapshot());
        const resources = JSON.stringify(adapter.snapshotResources());
        const subscribers = [...window.__dcufRuntimeCoordinator._mutationSubscribers.keys()];
        const probe = document.createElement('header');
        probe.className = 'dcheader fixture-non-typea';
        probe.style.height = '73px';
        probe.setAttribute(role, 'fixture-foreign');
        const head = document.createElement('div'); head.className = 'dchead';
        const content = document.createElement('div'); content.style.height = '47px';
        content.textContent = 'native variant probe'; head.append(content); probe.append(head);
        let scoped, broadened;
        try {
            // Model the existing transient stale-role case synchronously. This
            // is not a claim that a real site flips typea in place.
            root.style.height = '73px'; root.classList.remove('typea');
            scoped = { height: getComputedStyle(root).height, background: getComputedStyle(root).backgroundColor };
            check(scoped.height === '73px', 'non-typea inline height remains host-owned');
            check(!root.matches(theme.root) && root.matches(reset.root), 'palette root excluded; original broad reset retained');
            rules.forEach(r => { r.selectorText = r.selectorText.replace(/\.typea$/, ''); });
            broadened = { height: getComputedStyle(root).height, background: getComputedStyle(root).backgroundColor };
            check(broadened.height !== '73px', 'unqualified semantic CSS incorrectly captures unsupported native height');
            rules.forEach((r, i) => { r.selectorText = selectors[i]; });
            if (initialClass === null) root.removeAttribute('class'); else root.setAttribute('class', initialClass);
            if (initialInline === null) root.removeAttribute('style'); else root.setAttribute('style', initialInline);
            check(JSON.stringify(view()) === JSON.stringify(before), 'original composition restored after causal mutation');

            document.body.append(probe);
            adapter.refresh(probe);
            check(probe.getAttribute(role) === 'fixture-foreign' && !head.hasAttribute(role), 'non-typea admission excluded without touching foreign markers');
            check(getComputedStyle(probe).height === '73px', 'positive excluded native geometry');
            check(JSON.stringify(adapter.snapshotResources()) === resources, 'excluded variant adds no active root/subscriber');
            probe.classList.add('typea'); adapter.refresh(probe);
            check(probe.getAttribute(role) === 'root' && head.getAttribute(role) === 'head', 'delayed matching variant admitted');
            check(probe.getBoundingClientRect().height > 0, 'positive admitted geometry');
            check(adapter.snapshotResources().activeRoots === JSON.parse(resources).activeRoots + 1, 'one matching root added');
            probe.remove(); adapter.refresh(document);
            check(probe.getAttribute(role) === 'fixture-foreign' && !head.hasAttribute(role), 'removed root restores exact foreign baseline');
        } finally {
            rules.forEach((r, i) => { r.selectorText = selectors[i]; });
            if (initialClass === null) root.removeAttribute('class'); else root.setAttribute('class', initialClass);
            if (initialInline === null) root.removeAttribute('style'); else root.setAttribute('style', initialInline);
            probe.remove(); adapter.refresh(document);
        }
        check(topology.every(([n, p, next, marker, onclick, href]) => n.parentNode === p && n.nextSibling === next
            && n.getAttribute(role) === marker && n.getAttribute('onclick') === onclick && n.getAttribute('href') === href), 'original identity/order/markers/handlers preserved');
        check(JSON.stringify(view()) === JSON.stringify(before), 'final native header geometry restored');
        check(document.getElementById(style.id) === style && document.querySelectorAll('#' + style.id).length === 1, 'one unchanged visual owner');
        check(JSON.stringify(adapter.snapshotResources()) === resources, 'baseline owner resources restored');
        check(JSON.stringify([...window.__dcufRuntimeCoordinator._mutationSubscribers.keys()]) === JSON.stringify(subscribers), 'subscriber order unchanged');
        check(JSON.stringify(window.__dcufTestbedGM.snapshot()) === gm, 'settings unchanged');
        return { originalTypea: true, nonTypeaExcluded: true, delayedMatchAdmitted: true, removedMatchRestored: true,
            causalQualifierNegative: { scoped, broadened }, nativePreserved: true, resourcesRestored: true };
    });
}
