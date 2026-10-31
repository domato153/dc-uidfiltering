import assert from 'node:assert/strict';
import { createTestPage, storageKeys } from './harness/runner-utils.mjs';
import { renderedLabelContrast } from './ui-control-material-contract.mjs';

// Synthetic data; preview keeps the actual parser parent and a decoded real-size image.
export async function createConvenienceState(browser, server, {
    kind = 'preview', dark = false, palette = 'teal', viewport = { width: 980, height: 2306 }, sheet = true,
} = {}) {
    const storage = {
        [storageKeys.threshold]: 0, [storageKeys.palette]: palette, [storageKeys.personalEnabled]: false,
        [storageKeys.convenience]: { recentHighlight: true, draftRecovery: true, postPreview: true },
    };
    if (kind === 'draft') storage[storageKeys.drafts] = { version: 1, galleries: { 'mgallery:test': [{
        id: 'b1-draft', subject: '합성 저장 초안', bodyHtml: '<p>합성 초안 본문입니다.</p>', headtext: '질문', savedAt: Date.now(), pendingSubmit: false,
    }] } };
    const e = await createTestPage(browser, server.baseUrl, { storage, viewport, screen: { width: 412, height: 1006 }, hasTouch: true, isMobile: false, deviceScaleFactor: 1 });
    if (kind === 'preview') {
        await e.page.route('**/b1-preview-media.svg', r => r.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="240"><rect width="640" height="240" fill="#d9e6e2"/><path d="M0 160L160 70L340 190L500 60L640 150" fill="none" stroke="#6d9791" stroke-width="12"/><text x="32" y="40" font-size="22" fill="#30494a">Synthetic media · 640 × 240</text></svg>' }));
        await e.page.route(u => u.origin === server.baseUrl && u.pathname === '/board/view', r => r.fulfill({ contentType: 'text/html', body: '<div class="writing_view_box"><div class="write_div"><p>합성 미리보기 본문입니다. 읽는 내용은 선명하게 유지되어야 합니다.</p><img src="/b1-preview-media.svg" width="640" height="240"><p>첨부와 본문은 원래 읽기 영역의 선명함을 유지합니다.</p></div></div>' }));
        await e.goto('/board/lists?id=test');
    } else {
        await e.page.route(u => u.origin === server.baseUrl && u.pathname === '/mgallery/board/write/', async r => {
            const response = await r.fetch();
            await r.fulfill({ response, body: (await response.text()).replace('</body>', '<script>document.getElementById("subject").value="합성 기존 입력";</script></body>') });
        });
        await e.goto('/mgallery/board/write/?id=test');
    }
    if (dark) await e.page.evaluate(() => window.__dcufFixture.toggleDark(true));
    if (kind === 'preview') {
        await e.page.evaluate(sheet => {
            const link = [...document.querySelectorAll('.custom-post-item a.post-title-link')].find(n => n.getBoundingClientRect().width > 0);
            return window.__dcufMobileConvenienceModule.openPreview(link.href, '합성 글 미리보기', { mobile: sheet, x: innerWidth - 20, y: 150, link });
        }, sheet);
        await e.page.locator('#dcuf-post-preview img').evaluateAll(ns => Promise.all(ns.map(n => n.decode())));
    }
    // Exclude only the fixed Testbed toolbar, never the product backdrop/FAB/root.
    await e.page.addStyleTag({ content: '#dcuf-testbed-controls{display:none!important}' });
    await e.page.waitForFunction(() => !document.getAnimations().some(a => a instanceof CSSTransition && a.playState === 'running'));
    return e;
}

export async function runConveniencePresentationContract({ browser, server }) {
    const failures = [];
    for (const state of [
        { kind: 'preview' }, { kind: 'preview', dark: true }, { kind: 'draft' }, { kind: 'draft', dark: true },
        { kind: 'preview', dark: true, sheet: false, viewport: { width: 390, height: 560 } },
        { kind: 'draft', viewport: { width: 390, height: 560 } },
    ]) {
        const e = await createConvenienceState(browser, server, state);
        try {
            const root = e.page.locator(state.kind === 'draft' ? '#dcuf-draft-banner' : '#dcuf-post-preview');
            const geometry = await root.evaluate(n => {
                const b = n.getBoundingClientRect(), css = getComputedStyle(n);
                return { filter: css.backdropFilter, contained: b.x >= 0 && b.y >= 0 && b.right <= innerWidth + 1 && b.bottom <= innerHeight + 1,
                    controls: [...n.querySelectorAll('button,a')].map(c => { const r = c.getBoundingClientRect(); return { width: r.width, height: r.height, hit: c.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) }; }) };
            });
            assert.match(geometry.filter, /blur\(/, 'Changed chrome must consume B1 glass rather than old opaque paint');
            assert.ok(geometry.contained, 'Original sheet/banner/anchor remains contained');
            assert.ok(geometry.controls.every(c => c.width >= 30 && c.height >= 34 && c.hit), 'Visible controls keep positive dimensions and native hits');
            if (state.kind === 'preview') {
                const ratio = await renderedLabelContrast(e.page, '#dcuf-post-preview .dcuf-preview-head a');
                assert.ok(ratio.min >= 4.5, `Preview link contrast ${ratio.min}`);
                assert.ok(await e.page.locator('#dcuf-post-preview img').evaluate(n => n.naturalWidth === 640 && n.naturalHeight === 240));
                await e.page.getByRole('button', { name: '미리보기 닫기', exact: true }).click();
                assert.equal(await root.count(), 0);
            } else {
                assert.equal(await e.page.locator('#subject').inputValue(), '합성 기존 입력');
                await e.page.getByRole('button', { name: '초안 알림 닫기', exact: true }).click();
                assert.equal(await root.count(), 0);
                assert.equal(await e.page.locator('#subject').inputValue(), '합성 기존 입력');
            }
        } catch (error) { failures.push(`${state.kind}/${state.dark ? 'dark' : 'light'}/${state.viewport?.width || 980}: ${error.message}`); }
        finally { await e.close(); }
    }
    assert.deepEqual(failures, [], 'B1 convenience affected states');
}

export async function runRecommendationSpacingContract({ browser, server }) {
    for (const dark of [false, true]) {
        const e = await createTestPage(browser, server.baseUrl, { viewport: { width: 980, height: 900 }, storage: { [storageKeys.threshold]: 0, [storageKeys.personalEnabled]: false } });
        try {
            // aoegame31813776 uses .inner wrappers at59px, including a59px down button.
            await e.page.route(u => u.origin === server.baseUrl && u.pathname === '/board/view', async r => {
                const response = await r.fetch();
                await r.fulfill({ response, body: (await response.text()).replace('</head>', '<style>.btn_recommend_box .inner{height:59px}.btn_recommend_box .btn_recom_down{width:56px;height:59px;border-radius:50%}</style></head>') });
            });
            await e.goto('/board/view?id=test&no=9001');
            if (dark) await e.page.evaluate(() => window.__dcufFixture.toggleDark(true));
            const groups = e.page.locator('[data-dcuf-role="recommendation-vote-group"]');
            await groups.first().scrollIntoViewIfNeeded();
            const nativeHeights = await e.page.evaluate(() => {
                const style = document.getElementById('dcuf-article-presenter');
                style.disabled = true;
                try { return [...document.querySelectorAll('.btn_recommend_box .inner_box > .inner')].map(n => n.getBoundingClientRect().height); }
                finally { style.disabled = false; }
            });
            assert.equal(nativeHeights.length, 2, 'Native fixed-height selector must actually match the emitted wrappers');
            assert.ok(nativeHeights.every(h => Math.abs(h - 59) < 0.1), JSON.stringify(nativeHeights));
            const geometry = await groups.evaluateAll(ns => ns.map(n => {
                const b = n.getBoundingClientRect(), button = n.querySelector('[data-dcuf-role="native-recommend-up"],[data-dcuf-role="native-recommend-down"]'), c = button.getBoundingClientRect();
                return { width: b.width, top: c.top - b.top, bottom: b.bottom - c.bottom, hit: button.contains(document.elementFromPoint(c.x + c.width / 2, c.y + c.height / 2)) };
            }));
            assert.equal(geometry.length, 2);
            assert.ok(geometry.every(g => g.width >= 120 && g.width <= 160 && g.top >= 14 && g.bottom >= 14 && Math.abs(g.top - g.bottom) <= 4 && g.hit), JSON.stringify(geometry));
            if (!dark) {
                const withoutHeightReset = await e.page.evaluate(() => {
                    const style = document.getElementById('dcuf-article-presenter');
                    const rule = [...style.sheet.cssRules].find(r => r.selectorText === '[data-dcuf-role="recommendation"] [data-dcuf-role="recommendation-vote-group"]');
                    const previous = rule.style.getPropertyValue('block-size');
                    try {
                        rule.style.removeProperty('block-size');
                        return [...document.querySelectorAll('[data-dcuf-role="recommendation-vote-group"]')].map(n => {
                            const b = n.getBoundingClientRect(), c = n.querySelector('button').getBoundingClientRect();
                            return { top: c.top - b.top, bottom: b.bottom - c.bottom };
                        });
                    } finally { rule.style.setProperty('block-size', previous); }
                });
                assert.ok(withoutHeightReset.some(g => g.top < 14 || g.bottom < 14), 'The positive inset contract must reject losing the native-height reset');
            }
        } finally { await e.close(); }
    }
}
