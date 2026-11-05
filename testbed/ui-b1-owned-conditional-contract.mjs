import { mkdir, writeFile } from 'node:fs/promises';
import { assert, createTestPage, storageKeys, getMetrics, assertNoRuntimeErrors } from './harness/runner-utils.mjs';
import { mountB1NativeFixture } from './fixtures/b1-native-list.mjs';
import { renderedLabelContrast } from './ui-control-material-contract.mjs';

const list = { uids: [{ id: 'conditional-one', name: '긴 이름이 있는 합성 작성자 — 삭제 전까지 보관하는 항목' }], nicknames: ['중복 확인'], ips: [] };
const invoke = (e, name) => e.page.evaluate(name => window.__dcufTestbedGM.invokeMenu(name), name);
async function settled(page) {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.waitForFunction(() => !document.getAnimations().some(a => a instanceof CSSTransition && a.playState === 'running'));
}

export async function runOwnedConditionalContract({ browser, server, outputDirectory, observeOnly = false, height = 900, proposalCss = '' }) {
    const records = [], defects = [];
    // Independent oracle controls: normalized CSS colors and ancestor opacity.
    const oracle = await browser.newPage({ viewport: { width: 500, height: 200 } });
    try {
        await oracle.setContent('<body style="margin:0;background:white"><div id="group" style="padding:20px"><span id="label" style="display:inline-block;padding:10px;font:20px Arial;color:black">contrast witness</span></div></body>');
        const opaque = await renderedLabelContrast(oracle, '#label');
        assert.ok(Math.abs(opaque.min - 21) < .02, JSON.stringify(opaque));
        await oracle.locator('#group').evaluate(n => n.style.opacity = '.5');
        const faded = await renderedLabelContrast(oracle, '#label');
        assert.ok(faded.min > 3.8 && faded.min < 4.1, 'Parent opacity must reduce contrast: ' + JSON.stringify(faded));
        await oracle.locator('#group').evaluate(n => n.style.opacity = '1');
        await oracle.locator('#label').evaluate(n => n.style.color = 'color(srgb 0.768627 0.196078 0.286275)');
        const normalized = await renderedLabelContrast(oracle, '#label');
        await oracle.locator('#label').evaluate(n => n.style.color = 'rgb(196,50,73)');
        const rgb = await renderedLabelContrast(oracle, '#label');
        assert.ok(Math.abs(normalized.min - rgb.min) < .02, 'CSS srgb and rgb must measure equally');
    } finally { await oracle.close(); }
    if (outputDirectory) await mkdir(outputDirectory, { recursive: true });
    for (const dark of [false, true]) {
        const create = async (gmBehavior = {}, enabled = true) => {
            const e = await createTestPage(browser, server.baseUrl, { viewport: { width: 980, height }, gmBehavior, storage: {
                [storageKeys.threshold]: 0, [storageKeys.ratioEnabled]: false, [storageKeys.palette]: 'teal',
                [storageKeys.personalEnabled]: enabled, [storageKeys.personalList]: list
            } });
            await mountB1NativeFixture(e, server.baseUrl, { dark });
            if (proposalCss) e.proposalStyle = await e.page.addStyleTag({ content: proposalCss });
            return e;
        };
        const capture = async (e, id, root, labels = []) => {
            // Settings styles are lazy-mounted on first open; keep the isolated
            // reference recipe after that incumbent owner, without extra specificity.
            if (e.proposalStyle) await e.proposalStyle.evaluate(n => document.head.append(n));
            await e.page.mouse.move(1, 1);
            await settled(e.page);
            const panel = e.page.locator(root);
            const geometry = await panel.evaluate(n => {
                const r = n.getBoundingClientRect();
                const buttons = [...n.querySelectorAll('button')].filter(x => {
                    const b = x.getBoundingClientRect(); return b.width && b.height && b.top >= r.top && b.bottom <= r.bottom;
                });
                return { width: r.width, height: r.height, overflow: n.scrollWidth - n.clientWidth,
                    outside: r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1,
                    buttons: buttons.map(x => { const b = x.getBoundingClientRect(); return { text: x.textContent.trim(), disabled: x.disabled,
                        hit: x.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)) }; }) };
            });
            assert.equal(geometry.overflow, 0, id + ' horizontal overflow');
            assert.equal(geometry.outside, false, id + ' stays in viewport');
            const colors = [];
            for (const selector of labels) {
                const label = e.page.locator(selector); await label.scrollIntoViewIfNeeded();
                const contrast = await renderedLabelContrast(e.page, selector);
                colors.push({ selector, text: await label.textContent(), color: await label.evaluate(n => getComputedStyle(n).color), ...contrast });
                if (contrast.min < 4.5) defects.push({ dark, id, selector, contrast: contrast.min });
            }
            const actions = panel.locator('.dcuf-panel-header .dcuf-icon-button,.dcuf-inline-actions > button,.dcuf-panel-footer button');
            assert.ok(await actions.count() > 0, id + ' has real close/action targets');
            geometry.actions = [];
            for (const action of await actions.all()) {
                await action.scrollIntoViewIfNeeded();
                const target = await action.evaluate(n => { const r = n.getBoundingClientRect(); return {
                    text: n.textContent.trim(), width: r.width, height: r.height,
                    hit: n.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))
                }; });
                assert.ok(target.width > 0 && target.height >= 36 && target.hit, id + ' reachable original target ' + JSON.stringify(target));
                geometry.actions.push(target);
            }
            if (outputDirectory) {
                await e.page.mouse.move(1, 1);
                await panel.screenshot({ path: `${outputDirectory}/${id}-${dark ? 'dark' : 'light'}.png`, animations: 'disabled' });
            }
            const result = { id, dark, height, geometry, colors };
            records.push(result); return result;
        };
        const manual = await create({ rejectWriteOnceKeys: [storageKeys.personalList], writeDelayByKey: { [storageKeys.personalList]: 1800 } }, false);
        try {
            await manual.page.locator('#dc-personal-block-fab').click();
            await manual.page.locator('[data-dcuf-fab-action="manual-block"]').click();
            const root = '#dc-manual-block-panel', panel = manual.page.locator(root), status = root + ' .dcuf-manual-status';
            await panel.waitFor({ state: 'visible' });
            await panel.locator('[data-manual-block-action="add"]').click();
            assert.equal(await panel.locator('.dcuf-manual-status').getAttribute('data-state'), 'error');
            await capture(manual, 'manual-invalid', root, [status]);
            await panel.locator('#dc-manual-block-value').fill('중복 확인');
            await panel.locator('[data-manual-block-action="add"]').click();
            await manual.page.waitForFunction(() => document.querySelector('.dcuf-manual-status')?.dataset.state === 'info');
            const info = await capture(manual, 'manual-duplicate', root, [status]);
            const invalid = records.find(r => r.dark === dark && r.id === 'manual-invalid');
            if (info.colors[0].color === invalid.colors[0].color) defects.push({ dark, id: 'manual-duplicate', reason: 'Informational duplicate uses the error color' });
            await panel.locator('#dc-manual-block-value').fill('새 합성 닉네임');
            await panel.locator('[data-manual-block-action="add"]').click();
            await manual.page.waitForFunction(() => document.querySelector('.dcuf-manual-status')?.textContent.includes('추가하지 못했습니다'));
            await capture(manual, 'manual-failure', root, [status]);
            await panel.locator('[data-manual-block-action="add"]').click();
            await manual.page.waitForFunction(() => document.querySelector('[data-manual-block-action="add"]')?.disabled);
            if (!proposalCss && await panel.locator('.dcuf-manual-status').textContent()) defects.push({ dark, id: 'manual-saving', reason: 'Previous failure remains visible during retry' });
            await capture(manual, 'manual-saving', root);
            assert.equal(await panel.locator('[data-manual-block-action="add"]').isDisabled(), true, 'Saving capture must finish while the original write is still pending');
            assert.equal(await panel.locator('.dcuf-manual-status').textContent(), '', 'Saving capture cannot silently become a success/failure capture');
            await manual.page.waitForFunction(() => document.querySelector('.dcuf-manual-status')?.dataset.state === 'success');
            assert.match(await panel.locator('.dcuf-manual-status').textContent(), /꺼져/);
            await capture(manual, 'manual-success-off', root, [status]);
            assert.equal(await panel.locator('#dc-manual-block-value').inputValue(), '');
            const stored = await manual.page.evaluate(key => window.__dcufTestbedGM.snapshot().values[key], storageKeys.personalList);
            assert.equal(stored.nicknames.filter(x => x === '새 합성 닉네임').length, 1);
            await manual.page.keyboard.press('Escape'); await panel.waitFor({ state: 'detached' });
            assertNoRuntimeErrors(await getMetrics(manual.page), manual.consoleErrors.filter(x => !x.includes('직접 차단 추가 실패:')));
        } finally { await manual.close(); }

        const management = await create();
        try {
            await invoke(management, '차단 유저 관리');
            const root = '#dc-block-management-panel', panel = management.page.locator(root);
            await panel.waitFor({ state: 'visible' });
            const before = await management.page.evaluate(key => window.__dcufTestbedGM.snapshot().values[key], storageKeys.personalList);
            await panel.locator('[data-type="ips"]').click();
            await capture(management, 'management-empty', root, [root + ' .dcuf-blocked-empty']);
            await panel.locator('[data-type="uids"]').click();
            await panel.locator('.panel-search-input').fill('없는검색');
            assert.equal(await panel.locator('.panel-list-summary').textContent(), '0 / 1개 표시');
            await capture(management, 'management-search-none', root, [root + ' .dcuf-blocked-empty']);
            await panel.locator('.panel-search-input').fill('긴 이름');
            await panel.locator('.delete-item-btn').click();
            assert.equal(await panel.locator('.item-to-delete').count(), 1);
            assert.equal(await panel.locator('.panel-save-btn').textContent(), '1건 변경 저장');
            await capture(management, 'management-pending', root, [root + ' .item-to-delete .item-name', root + ' .item-to-delete .delete-item-btn']);
            await panel.locator('.delete-item-btn').click();
            assert.equal(await panel.locator('.item-to-delete').count(), 0, 'Pending deletion is reversible before save');
            await panel.locator('.delete-item-btn').click();
            for (const [action, child, id] of [['.panel-add-btn', '#dc-manual-block-panel', 'nested-add'], ['.panel-backup-btn', '#dc-backup-popup', 'nested-backup']]) {
                await panel.locator(action).click(); await management.page.locator(child).waitFor({ state: 'visible' });
                await capture(management, id, child);
                const hit = await panel.locator('.panel-search-input').evaluate(n => { const r = n.getBoundingClientRect(); return n.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); });
                assert.equal(hit, false, 'Child scrim blocks parent input');
                await management.page.locator(child + ' .dcuf-icon-button').click();
                await management.page.locator(child).waitFor({ state: 'detached' });
                assert.equal(await panel.locator('.panel-search-input').inputValue(), '긴 이름');
                assert.equal(await panel.locator('.item-to-delete').count(), 1);
                assert.equal(await panel.locator('[data-type="uids"]').getAttribute('aria-selected'), 'true');
            }
            await panel.locator('.panel-close-btn').click(); await panel.waitFor({ state: 'detached' });
            assert.deepEqual(await management.page.evaluate(key => window.__dcufTestbedGM.snapshot().values[key], storageKeys.personalList), before, 'Pending deletes and nested inspection never commit');
            assertNoRuntimeErrors(await getMetrics(management.page), management.consoleErrors);
        } finally { await management.close(); }

        const palette = await create({ rejectWriteOnceKeys: [storageKeys.palette], writeDelayByKey: { [storageKeys.palette]: 1800 } });
        try {
            await palette.page.locator('#dc-personal-block-fab').focus();
            await invoke(palette, 'UI 색상 설정');
            const root = '#dcuf-palette-panel', panel = palette.page.locator(root);
            await panel.locator('[data-palette-id="green"]').click();
            await panel.locator('[data-dcuf-palette-action="save"]').click();
            await palette.page.waitForFunction(() => document.querySelector('#dcuf-palette-panel')?.dataset.dcufState === 'error');
            assert.equal(await panel.locator('[data-dcuf-palette-action="save"]').evaluate(n => n === document.activeElement && !n.disabled), true);
            await capture(palette, 'palette-failure', root, [root + ' .dcuf-palette-status']);
            assert.equal(await palette.page.evaluate(key => window.__dcufTestbedGM.snapshot().values[key], storageKeys.palette), 'teal');
            await panel.locator('[data-dcuf-palette-action="save"]').click();
            await palette.page.waitForFunction(() => document.querySelector('#dcuf-palette-panel')?.dataset.dcufState === 'saving');
            assert.equal(await panel.locator('[data-dcuf-palette-action]:disabled').count(), 3);
            await capture(palette, 'palette-saving', root);
            assert.equal(await panel.getAttribute('data-dcuf-state'), 'saving', 'Palette capture must finish before the write completes');
            assert.equal(await panel.locator('[data-dcuf-palette-action]:disabled').count(), 3, 'Saving capture retains all three disabled actions');
            await panel.waitFor({ state: 'detached' });
            assert.equal(await palette.page.evaluate(key => window.__dcufTestbedGM.snapshot().values[key], storageKeys.palette), 'green');
            assert.equal(await palette.page.locator('#dc-personal-block-fab').evaluate(n => n === document.activeElement), true);
            assertNoRuntimeErrors(await getMetrics(palette.page), palette.consoleErrors);
        } finally { await palette.close(); }
    }
    if (outputDirectory) await writeFile(outputDirectory + '/observations.json', JSON.stringify({ records, defects }, null, 2));
    if (!observeOnly) assert.deepEqual(defects, [], 'Conditional labels must remain readable and informational feedback must differ from errors');
    console.log('Owned conditional states', JSON.stringify({ contexts: records.length, defects }));
    return { records, defects };
}
