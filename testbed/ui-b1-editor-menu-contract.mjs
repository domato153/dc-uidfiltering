import { assert, createTestPage, storageKeys, getMetrics, assertNoRuntimeErrors } from './harness/runner-utils.mjs';
import { writeHeaderHtml } from './fixtures/b1-form-header.mjs';

const kinds = [['fontname', 'fontname'], ['fontsize', 'fontsize'], ['color', 'color'],
    ['paragraph', 'paragraph'], ['lineheight', 'line-height'], ['table', 'table']];

// Native Summernote owns opening and editing. The fixture helper only exposes
// each native-shaped layer; trusted clicks below witness the original nodes.
export async function runB1EditorMenuContract({ browser, server }) {
    const open = (page, kind) => page.evaluate(k => {
        // Summernote's native opener restores display after font selection.
        // This fixture has no Summernote controller; do not change production
        // positioning/visibility to compensate for that intentionally absent host.
        if (k === 'fontname') document.querySelector('.fixture-fontname-layer').style.removeProperty('display');
        window.__dcufFixture.toggleWriteLayer(k, true);
    }, kind);
    for (const [width, height, phone] of [[980, 2306, true], [980, 900, false], [390, 520, true]]) {
        const e = await createTestPage(browser, server.baseUrl, {
            viewport: { width, height }, ...(phone ? { screen: { width: 412, height: 1006 } } : {}),
            storage: { [storageKeys.threshold]: 0, [storageKeys.palette]: 'teal' }
        });
        try {
            await e.page.route(u => u.origin === server.baseUrl && u.pathname === '/mgallery/board/write/',
                r => r.fulfill({ contentType: 'text/html', body: writeHeaderHtml({ variant: 'minor', formMode: 'write' }) }));
            await e.goto('/mgallery/board/write/?id=test');
            await e.page.waitForFunction(() => document.body.getAttribute('data-dcuf-native-form-state') === 'write-editor');
            await e.page.locator('.note-editable').fill('작성 중인 본문 유지');
            await e.page.evaluate(() => {
                const form = document.querySelector('form#write');
                window.__menuOriginals = [...form.querySelectorAll('input,textarea,.note-editable,.note-dropdown-menu')]
                    .map(node => ({ node, parent: node.parentNode }));
                window.__menuSwatches = [...form.querySelectorAll('.note-color-btn')]
                    .map(n => ({ node: n, inline: n.style.background, color: getComputedStyle(n).backgroundColor }));
                window.__menuClicks = [];
                form.addEventListener('click', event => {
                    const n = event.target.closest('.note-dropdown-menu a,.note-dropdown-menu button');
                    if (n) window.__menuClicks.push({ trusted: event.isTrusted, value: n.dataset.value || n.dataset.cell || n.textContent });
                });
            });
            for (const dark of [false, true]) {
                await e.page.evaluate(dark => {
                    document.getElementById('css-darkmode')?.remove();
                    if (dark) { const s = document.createElement('style'); s.id = 'css-darkmode'; s.textContent = 'html{color-scheme:dark}'; document.head.append(s); }
                    document.body.classList.toggle('dc-filter-dark-mode', dark);
                    document.documentElement.classList.toggle('darkmode', dark);
                }, dark);
                for (const [kind, anchor] of kinds) {
                    const menu = e.page.locator(`[data-dcuf-native-form-layer-kind="dropdown"][data-dcuf-native-form-layer-anchor="${anchor}"]`);
                    await open(e.page, kind);
                    await menu.waitFor({ state: 'visible' });
                    await e.page.waitForFunction(a => document.querySelector(`[data-dcuf-native-form-layer-anchor="${a}"]`)
                        ?.getAttribute('data-dcuf-native-form-layer-state') === 'positioned', anchor);
                    await e.page.waitForFunction(a => {
                        const r = document.querySelector(`[data-dcuf-native-form-layer-anchor="${a}"]`).getBoundingClientRect();
                        return r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1;
                    }, anchor, { timeout: 2500 }).catch(async error => {
                        const diagnostic = await menu.evaluate(n => {
                            const a=n.closest('.note-btn-group')?.querySelector('button');
                            const r=n.getBoundingClientRect(), ar=a?.getBoundingClientRect();
                            return {rect:r.toJSON(),anchor:ar?.toJSON(),offset:a?.offsetWidth,css:n.getAttribute('style'),scroll:[scrollX,scrollY],viewport:[innerWidth,innerHeight,visualViewport?.scale]};
                        });
                        throw new Error(anchor+': '+JSON.stringify(diagnostic)+'; '+error.message);
                    });
                    const material = await menu.evaluate(n => {
                        const s = getComputedStyle(n), r = n.getBoundingClientRect();
                        return { rect: {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}, blur: s.backdropFilter, background: s.backgroundColor, radius: parseFloat(s.borderRadius),
                            bounded: r.width > 0 && r.height > 0 && r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
                            fixedChildren: [...n.querySelectorAll('*')].filter(x => getComputedStyle(x).position === 'fixed').length };
                    });
                    assert.match(material.blur, /blur\(12px\)/, `${anchor}: missing shared structural glass`);
                    assert.match(material.background, /0\.72\)/, `${anchor}: real backing transmission`);
                    assert.equal(material.radius, 12);
                    assert.equal(material.bounded, true, `${anchor}/${width}/${dark}: viewport containment ${JSON.stringify(material)}`);
                    assert.equal(material.fixedChildren, 0, 'do not filter a menu containing fixed child windows');
                    let target;
                    if (kind === 'fontname') {
                        const items = phone ? menu.locator('[data-dcuf-font-value]') : menu.locator(':scope > [data-value]');
                        assert.equal(await items.count(), phone ? 18 : 2);
                        if (phone) assert.equal(await menu.locator(':scope > [data-dcuf-role="native-font-option"]:visible').count(), 0);
                        target = items.last();
                    } else if (kind === 'color') target = menu.locator('.note-color-btn').last();
                    else if (kind === 'table') target = menu.locator('[data-cell]').last();
                    else target = menu.locator('a,button').last();
                    await target.scrollIntoViewIfNeeded();
                    const hit = await target.evaluate(n => { const r = n.getBoundingClientRect(); const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return r.width > 0 && r.height > 0 && (t === n || n.contains(t)); });
                    assert.equal(hit, true, `${anchor}: original last item reachable`);
                    if (kind !== 'table' && kind !== 'color') {
                        await target.focus();
                        assert.equal(await target.evaluate(n => document.activeElement === n), true);
                    }
                    await target.click();
                    if (kind === 'fontname' && phone) {
                        assert.equal(await e.page.locator('.note-current-fontname').textContent(), 'MS UI Gothic');
                        assert.equal(await menu.locator('[data-dcuf-font-value].checked').count(), 1);
                    }
                    await e.page.evaluate(k => window.__dcufFixture.toggleWriteLayer(k, false), kind);
                    await menu.waitFor({ state: 'hidden' });
                    await open(e.page, kind);
                    await menu.waitFor({ state: 'visible' });
                    await e.page.evaluate(k => window.__dcufFixture.toggleWriteLayer(k, false), kind);
                }
            }
            const preserved = await e.page.evaluate(() => ({
                nodes: window.__menuOriginals.every(({ node, parent }) => node.isConnected && node.parentNode === parent),
                swatches: window.__menuSwatches.every(({ node, inline, color }) => node.style.background === inline && getComputedStyle(node).backgroundColor === color),
                clicks: window.__menuClicks.length >= 10 && window.__menuClicks.every(c => c.trusted),
                text: document.querySelector('.note-editable').textContent,
                ancestorFilter: getComputedStyle(document.querySelector('form#write')).backdropFilter
            }));
            assert.equal(preserved.nodes, true); assert.equal(preserved.swatches, true);
            assert.equal(preserved.clicks, true); assert.equal(preserved.text, '작성 중인 본문 유지');
            assert.equal(preserved.ancestorFilter, 'none');
            assertNoRuntimeErrors(await getMetrics(e.page), e.consoleErrors);
        } finally { await e.close(); }
    }
}
