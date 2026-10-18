import { assert, createTestPage, storageKeys, assertNoRuntimeErrors, getMetrics } from './harness/runner-utils.mjs';

export async function runCommentRepairContract({ browser, server }) {
    for (const width of [980, 390]) for (const dark of [false, true]) {
        for (const prefix of ['', '/mgallery', '/mini']) {
            const session = await createTestPage(browser, server.baseUrl, {
                viewport: { width, height: 900 },
                storage: { [storageKeys.threshold]: 0, [storageKeys.ratioEnabled]: false }
            });
            try {
                await session.goto(`${prefix}/board/view?id=test&no=1001&comments=4`);
                await session.page.waitForSelector('[data-dcuf-role="comment-composer"]');
                await session.page.evaluate(() => {
                    const style = document.createElement('style');
                    style.textContent = '.cmt_write_box{padding:12px;background:#fafafa}.cmt_txt_cont textarea{width:956px;height:78px;padding:13px;border:1px solid #cecdce;font-size:13px;background:#fff;color:#333}.cmt_write_box .user_info_input input{width:140px;height:30px;border:1px solid #cecdce;background:#fff;color:#333}';
                    document.head.prepend(style);
                    window.__repairCommentControls = Array.from(document.querySelectorAll('[data-dcuf-role="comment-composer"] input:not([type="hidden"]), [data-dcuf-role="comment-composer"] textarea, [data-dcuf-role="comment-composer"] button'), element => ({ element, parent: element.parentNode, next: element.nextSibling }));
                    window.__repairCommentClicks = 0;
                    document.querySelectorAll('[data-dcuf-role="comment-composer"] button').forEach(button => button.addEventListener('click', () => window.__repairCommentClicks++));
                });
                if (dark) await session.page.evaluate(() => window.__dcufFixture.toggleDark(true));
                const result = await session.page.evaluate(() => Array.from(document.querySelectorAll('[data-dcuf-role="comment-composer"]'), composer => {
                    const rect = n => n.getBoundingClientRect();
                    const r = rect(composer);
                    const probe = document.createElement('span'); probe.style.backgroundColor = 'var(--dcuf-comment-input)'; composer.append(probe);
                    const expected = getComputedStyle(probe).backgroundColor; probe.remove();
                    const controls = Array.from(composer.querySelectorAll('input:not([type="hidden"]), textarea, button'));
                    return {
                        state: composer.getAttribute('data-dcuf-state'), display: getComputedStyle(composer).display,
                        identityWidth: rect(composer.querySelector('[data-dcuf-role="comment-identity-fields"]')).width,
                        controls: controls.map(element => {
                            const c = rect(element);
                            return { tag: element.tagName, contained: c.width > 0 && c.height > 0 && c.left >= r.left - 1 && c.right <= r.right + 1 && c.top >= r.top - 1 && c.bottom <= r.bottom + 1,
                                themed: element.tagName === 'BUTTON' || getComputedStyle(element).backgroundColor === expected };
                        })
                    };
                }));
                const label = `${prefix || 'major'}@${width}/${dark ? 'dark' : 'light'} ${JSON.stringify(result)}`;
                assert.equal(result.length, 3, label);
                for (const composer of result) {
                    assert.equal(composer.display, 'grid', label);
                    if (width === 980) assert.ok(composer.identityWidth <= 151, label);
                    assert.ok(composer.controls.every(c => c.contained && c.themed), label);
                }
                const editors = session.page.locator('[data-dcuf-role="native-comment-textarea"]');
                for (let i = 0; i < await editors.count(); i++) {
                    const editor = editors.nth(i); await editor.fill('댓글 입력 보존 확인');
                    const composer = session.page.locator('[data-dcuf-role="comment-composer"]').nth(i);
                    const button = composer.locator('button').first();
                    await button.scrollIntoViewIfNeeded();
                    await button.evaluate(element => {
                        const r = element.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                        if (!(hit === element || element.contains(hit))) throw new Error('Comment button must receive pointer hit');
                    });
                    await button.click();
                }
                assert.equal(await session.page.evaluate(() => window.__repairCommentClicks), 3, label);
                assert.equal(await session.page.evaluate(() => window.__repairCommentControls.every(({element,parent,next}) => element.isConnected && element.parentNode === parent && element.nextSibling === next)), true, label);
                assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
            } finally { await session.close(); }
        }
    }
}
