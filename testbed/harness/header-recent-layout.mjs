// The original elements and actual final-owner CSSOM are mutated synchronously
// and restored before native input resumes. No production clone or override.
export async function probeHeaderRecentLayout(page) {
    const causal = await page.evaluate(() => {
        const check = (value, message) => { if (!value) throw new Error(message); };
        const root = document.querySelector('.newvisit_history');
        const list = root.querySelector('.newvisit_list');
        const open = root.querySelector(':scope > .btn_open');
        const ancestor = root.closest('.visit_bookmark');
        const sheet = document.getElementById('dcuf-header-recent-visit-style').sheet;
        const rules = Array.from(sheet.cssRules).filter(rule => rule.selectorText && rule.style);
        const rule = slot => rules.find(rule => rule.selectorText === slot);
        const prefix = '[data-dcuf-header-recent-visit-role="root"]';
        const controls = rule(prefix + ' > :is([data-dcuf-header-recent-visit-role="control"], [data-dcuf-header-recent-visit-role="arrow"])');
        const listRule = rule(prefix + ' [data-dcuf-header-recent-visit-role="list"]');
        const rootRule = rule(prefix);
        check(root && list && open && ancestor && controls && listRule && rootRule, 'Complete recent layout fixture required');
        const css = rules.map(rule => rule.style.cssText);
        const inline = list.getAttribute('style'), classes = ancestor.className;
        const native = [root, ...root.querySelectorAll('*')].map(node => [node, node.parentNode, node.nextSibling, node.getAttribute('style')]);
        const gm = window.__dcufTestbedGM.snapshot();
        const resources = window.__dcufHeaderRecentVisitHostAdapter.snapshotResources();
        const view = node => {
            const style = getComputedStyle(node), box = node.getBoundingClientRect();
            return { box: [box.x, box.y, box.width, box.height], display: style.display, position: style.position,
                left: style.left, top: style.top, margin: style.margin, width: style.width };
        };
        const sample = () => [root, list, open].map(view);
        const baseline = sample(), mutations = [];
        check(baseline.every(item => item.box[2] > 0 && item.box[3] > 0), 'Positive native recent geometry');
        const lower = (target, property, observe, expected) => {
            const saved = target.style.cssText, before = observe();
            let removed;
            try {
                target.style.setProperty(property, target.style.getPropertyValue(property), '');
                removed = observe();
                check(JSON.stringify(removed) !== JSON.stringify(before), 'Missing causal recent negative: ' + property);
                check(expected(removed), 'Wrong native conflict for recent ' + property + ': ' + JSON.stringify(removed));
            } finally { target.style.cssText = saved; }
            check(JSON.stringify(observe()) === JSON.stringify(before), 'Exact recent restore: ' + property);
            mutations.push({ property, before, removed, restored: true });
        };
        try {
            lower(controls, 'display', () => view(open).display, value => value === 'block');
            lower(controls, 'position', () => view(open).position, value => value === 'relative');
            lower(controls, 'inset', () => ({ left: view(open).left, top: view(open).top }), value => value.left === '0px' && value.top === '12px');
            lower(controls, 'margin', () => getComputedStyle(open).marginLeft, value => value === '10px');
            lower(listRule, 'position', () => view(list).position, value => value === 'absolute');
            // Preserve the two ordered important inline descriptions. Simulate a
            // normal native write while testing the independent sheet guard.
            for (const [property, value] of [['left', '-73px'], ['margin-left', '11px']]) {
                list.style.setProperty(property, value, '');
                lower(listRule, property, () => getComputedStyle(list).getPropertyValue(property), result => result === value);
                list.setAttribute('style', inline);
            }
            // The current bookmark ancestor's same-valued important width can
            // mask the ordinary native840px rule. Exercise that separate ancestry
            // state explicitly; do not label it a host-important width conflict.
            ancestor.classList.remove('visit_bookmark');
            lower(rootRule, 'width', () => root.getBoundingClientRect().width, value => value === 840);
        } finally {
            rules.forEach((rule, index) => { rule.style.cssText = css[index]; });
            list.setAttribute('style', inline);
            ancestor.className = classes;
        }
        check(JSON.stringify(sample()) === JSON.stringify(baseline), 'Final recent geometry restored');
        check(native.every(([node, parent, next, style]) => node.parentNode === parent && node.nextSibling === next && node.getAttribute('style') === style), 'Original recent topology and inline attributes');
        check(JSON.stringify(window.__dcufHeaderRecentVisitHostAdapter.snapshotResources()) === JSON.stringify(resources), 'Recent resource baseline');
        const after = window.__dcufTestbedGM.snapshot();
        check(JSON.stringify(gm.values) === JSON.stringify(after.values) && gm.writes.length === after.writes.length, 'Recent CSS probes preserve GM settings');
        return { mutations, originalNodes: true, restored: true, storageUnchanged: true, resources };
    });
    const original = await page.evaluateHandle(() => {
        const root = document.querySelector('.newvisit_history');
        const nodes = [root, ...root.querySelectorAll('*')].map(node => [node, node.parentNode, node.nextSibling, node.getAttribute('onclick')]);
        return { nodes, gm: window.__dcufTestbedGM.snapshot() };
    });
    const state = () => page.evaluate(() => {
        const root = document.querySelector('.newvisit_history'), list = root.querySelector('.newvisit_list');
        const max = Math.max(0, list.scrollWidth - list.clientWidth);
        const prev = root.querySelector('.bnt_visit_prev'), next = root.querySelector('.bnt_visit_next');
        return { left: list.scrollLeft, max, prev: prev.classList.contains('on'), next: next.classList.contains('on'),
            prevDisabled: prev.getAttribute('aria-disabled'), nextDisabled: next.getAttribute('aria-disabled') };
    });
    const check = (value, message) => { if (!value) throw new Error(message); };
    const settle = () => page.waitForFunction(() => {
        const resources = window.__dcufHeaderRecentVisitHostAdapter.snapshotResources();
        return resources.timers === 0 && resources.animationFrames === 0;
    });
    try {
        const initial = await state();
        check(initial.max > 1 && initial.left < 1 && !initial.prev && initial.next
            && initial.prevDisabled === 'true' && initial.nextDisabled === 'false', 'Live-shaped initial scroll edges');
        await page.locator('.newvisit_history .bnt_visit_next').click();
        await page.waitForFunction(() => document.querySelector('.newvisit_list').scrollLeft > 1);
        await settle();
        const advanced = await state();
        check(advanced.prev && advanced.prevDisabled === 'false'
            && advanced.next === (advanced.left < advanced.max - 1)
            && advanced.nextDisabled === String(!(advanced.left < advanced.max - 1)), 'Live-shaped pointer scroll control state');
        const previous = page.locator('.newvisit_history .bnt_visit_prev');
        await previous.focus();
        await previous.press('Enter');
        await page.waitForFunction(() => document.querySelector('.newvisit_list').scrollLeft < 1);
        await settle();
        const restored = await state();
        check(JSON.stringify(restored) === JSON.stringify(initial), 'Live-shaped default Enter returns to original edge state');
        check(await page.evaluate(saved => {
            const gm = window.__dcufTestbedGM.snapshot();
            return saved.nodes.every(([node, parent, next, handler]) => node.isConnected && node.parentNode === parent
                && node.nextSibling === next && node.getAttribute('onclick') === handler)
                && JSON.stringify(gm.values) === JSON.stringify(saved.gm.values) && gm.writes.length === saved.gm.writes.length;
        }, original), 'Original recent controls/handlers/settings survive browser input');
        return { ...causal, input: { initial, advanced, restored, pointerNext: true, defaultEnterPrevious: true } };
    } finally { await original.dispose(); }
}
