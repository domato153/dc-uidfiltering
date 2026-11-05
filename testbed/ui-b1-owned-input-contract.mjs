import { mkdir, writeFile } from 'node:fs/promises';
import { assert, createTestPage, storageKeys, getMetrics, assertNoRuntimeErrors } from './harness/runner-utils.mjs';
import { mountB1NativeFixture } from './fixtures/b1-native-list.mjs';
import { renderedLabelContrast } from './ui-control-material-contract.mjs';

const invoke = (e, label) => e.page.evaluate(label => window.__dcufTestbedGM.invokeMenu(label), label);
const longHead = '길이가 긴 말머리도 빠짐없이 읽고 선택할 수 있는지 확인하는 합성 분류';
const longNick = '닉네임이 아주 긴 합성 작성자이며 모든 글자가 팝업 안에서 자연스럽게 이어져야 합니다';
const personal = { uids: [{ id: 'choice-long-uid', name: longNick }], nicknames: [longNick], ips: ['203.0.113.21'] };

export async function runOwnedInputContract({ browser, server, outputDirectory, observeOnly = false, height = 900, proposalCss = '', controlReference = false }) {
    const records = [], defects = [], nativeNotices = [];
    if (outputDirectory) await mkdir(outputDirectory, { recursive: true });
    for (const dark of [false, true]) {
        const create = async (article = false) => {
            const e = await createTestPage(browser, server.baseUrl, { viewport: { width: 980, height }, storage: {
                [storageKeys.threshold]: 0, [storageKeys.ratioEnabled]: false, [storageKeys.personalEnabled]: false,
                [storageKeys.personalList]: personal, [storageKeys.palette]: 'teal', [storageKeys.fabScalePercent]: 100,
                [storageKeys.headtextBlocks]: { 'mgallery:test': ['합성 기존 분류'], 'board:other-gallery': [longHead, '다른 분류'] }
            } });
            if (article) {
                await e.goto('/board/view?id=test&no=1001&comments=4');
                if (dark) await e.page.evaluate(() => window.__dcufFixture.toggleDark(true));
            } else await mountB1NativeFixture(e, server.baseUrl, { dark });
            if (proposalCss) e.inputProposal = await e.page.addStyleTag({ content: proposalCss });
            return e;
        };
        const capture = async (e, id, root, labelSelector) => {
            const p = e.page.locator(root); await p.waitFor({ state: 'visible' });
            if (e.inputProposal) await e.inputProposal.evaluate(n => document.head.append(n));
            await e.page.mouse.move(1, 1);
            await e.page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            await e.page.waitForFunction(() => !document.getAnimations().some(a => a instanceof CSSTransition && a.playState === 'running'));
            const geometry = await p.evaluate(n => {
                const r = n.getBoundingClientRect();
                return { width: r.width, height: r.height, overflow: n.scrollWidth - n.clientWidth,
                    inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
                    backdrop: getComputedStyle(n).backdropFilter };
            });
            if (geometry.overflow > 1 || !geometry.inside) defects.push({ id, dark, geometry });
            const actions = p.locator('button');
            const hits = [];
            for (const action of await actions.all()) {
                if (!await action.isVisible()) continue;
                await action.scrollIntoViewIfNeeded();
                const hit = await action.evaluate(n => { const r = n.getBoundingClientRect(); return {
                    text: n.textContent.trim(), width: r.width, height: r.height,
                    hit: n.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)),
                    inlineAction: Boolean(n.closest('.dcuf-saved-rule,.dcuf-selection-option')),
                    lines: (() => { const range = document.createRange(); range.selectNodeContents(n); return range.getClientRects().length; })()
                }; });
                if (!hit.hit || hit.width < 30 || hit.height < 36) defects.push({ id, dark, target: hit });
                if (hit.inlineAction && hit.lines !== 1) defects.push({ id, dark, reason: 'Inline action label wraps beside long content', target: hit });
                hits.push(hit);
            }
            let contrast = null;
            if (labelSelector) {
                await e.page.locator(labelSelector).first().scrollIntoViewIfNeeded();
                contrast = await renderedLabelContrast(e.page, labelSelector);
                if (contrast.min < 4.5) defects.push({ id, dark, labelSelector, contrast: contrast.min });
            }
            if (outputDirectory) await p.screenshot({ path: `${outputDirectory}/${id}-${dark ? 'dark' : 'light'}.png`, animations: 'disabled' });
            records.push({ id, dark, height, geometry, hits, contrast });
        };
        const notice = async (e, action, expected) => {
            const opened = e.page.waitForEvent('dialog'), clicked = action();
            const dialog = await opened;
            try {
                assert.equal(dialog.type(), 'alert'); assert.match(dialog.message(), expected);
                nativeNotices.push({ dark, message: dialog.message(), treatment: 'ORIGINAL_BROWSER_NATIVE_ALERT' });
            } finally { await dialog.dismiss(); await clicked; }
        };

        const settings = await create();
        try {
            await invoke(settings, '글댓합 설정하기');
            const parent = settings.page.locator('#dcinside-filter-setting');
            const shortcutValue = await settings.page.evaluate(key => window.__dcufTestbedGM.snapshot().values[key], storageKeys.shortcut);
            await parent.locator('#dcinside-change-shortcut-btn').click();
            const shortcut = '#dcinside-shortcut-modal', sp = settings.page.locator(shortcut);
            await capture(settings, 'shortcut-waiting', shortcut, shortcut + ' .dcuf-settings-help');
            const buttons = sp.locator('button');
            await notice(settings, () => buttons.first().click(), /유효한 단축키/);
            await settings.page.keyboard.press('Control+Alt+K');
            assert.match(await sp.locator('output').textContent(), /K/i);
            await capture(settings, 'shortcut-combination', shortcut, shortcut + ' .dcuf-settings-help');
            await buttons.last().click(); await sp.waitFor({ state: 'detached' });
            assert.equal(await parent.evaluate(n => getComputedStyle(n).pointerEvents), 'auto');
            assert.equal(await settings.page.evaluate(key => window.__dcufTestbedGM.snapshot().values[key], storageKeys.shortcut), shortcutValue);
            await parent.locator('#dcinside-change-shortcut-btn').click();
            await settings.page.keyboard.press('Control+Alt+K');
            const committedShortcut = await sp.locator('output').textContent();
            await sp.locator('button').first().click(); await sp.waitFor({ state: 'detached' });
            assert.equal(await settings.page.evaluate(key => window.__dcufTestbedGM.snapshot().values[key], storageKeys.shortcut), committedShortcut);
            assert.equal(await parent.evaluate(n => getComputedStyle(n).pointerEvents), 'auto');
            await parent.getByRole('button', { name: '갤러리별 말머리 차단 관리', exact: true }).click();
            const root = '#dcinside-headtext-manager-panel', hp = settings.page.locator(root);
            await capture(settings, 'headtext-other-gallery', root, root + ' .dcuf-settings-help');
            await hp.locator('[data-dcuf-headtext-manual]').fill(longHead);
            await hp.locator('[data-dcuf-headtext-action="add"]').click();
            await settings.page.waitForFunction(text => [...document.querySelectorAll('[data-dcuf-headtext-value]')].some(n => n.dataset.dcufHeadtextValue === text && n.checked), longHead);
            await capture(settings, 'headtext-long-added', root, root + ' .dcuf-settings-help');
            const values = await settings.page.evaluate(key => window.__dcufTestbedGM.snapshot().values[key], storageKeys.headtextBlocks);
            assert.ok(values['mgallery:test'].includes(longHead)); assert.deepEqual(values['board:other-gallery'], [longHead, '다른 분류']);
            await hp.locator('[data-dcuf-headtext-remove="board:other-gallery"]').click();
            await settings.page.waitForFunction(key => !window.__dcufTestbedGM.snapshot().values[key]['board:other-gallery'], storageKeys.headtextBlocks);
            assert.ok((await settings.page.evaluate(key => window.__dcufTestbedGM.snapshot().values[key]['mgallery:test'], storageKeys.headtextBlocks)).includes(longHead), 'Deleting another gallery preserves current rules');
            await hp.locator('[data-dcuf-headtext-action="clear"]').click();
            await settings.page.waitForFunction(key => !window.__dcufTestbedGM.snapshot().values[key]['mgallery:test'], storageKeys.headtextBlocks);
            await hp.locator('[data-dcuf-headtext-action="close"]').click();
            await settings.page.evaluate(() => history.replaceState({}, '', '/mgallery/board/lists'));
            await parent.getByRole('button', { name: '갤러리별 말머리 차단 관리', exact: true }).click();
            assert.equal(await hp.locator('[data-dcuf-headtext-manual]').isDisabled(), true);
            assert.equal(await hp.locator('[data-dcuf-headtext-action="add"]').isDisabled(), true);
            await capture(settings, 'headtext-unidentified', root, root + ' .dcuf-settings-help');
            await hp.locator('[data-dcuf-headtext-action="close"]').click();
            assertNoRuntimeErrors(await getMetrics(settings.page), settings.consoleErrors);
        } finally { await settings.close(); }

        const choice = await create(true);
        try {
            const before = await choice.page.evaluate(key => window.__dcufTestbedGM.snapshot().values[key], storageKeys.personalList);
            for (const [id, nick, uid, ip, count] of [
                ['choice-blocked-member', longNick, 'choice-long-uid', '', 2],
                ['choice-blocked-guest', '합성 게스트', '', '203.0.113.21', 2],
                ['choice-nickname-only', '닉네임만 있는 합성 작성자', '', '', 1]
            ]) {
                const author = choice.page.locator('#comment_li_2 .ub-writer');
                await author.evaluate((n, info) => { for (const key of ['nick', 'uid', 'ip']) n.setAttribute('data-' + key, info[key]); n.querySelector('.nickname')?.replaceChildren(document.createTextNode(info.nick)); }, { nick, uid, ip });
                await choice.page.locator('#dc-personal-block-fab').click();
                await choice.page.locator('[data-dcuf-fab-action="quick-block"]').click(); await author.click();
                await choice.page.waitForFunction(() => document.querySelectorAll('#dc-selection-popup').length === 1);
                const root = '#dc-selection-popup:not(.dcuf-pop-leave)', cp = choice.page.locator(root);
                assert.equal(await cp.locator('.block-options button').count(), count);
                assert.equal(await cp.locator('.btn-unblock').count(), id === 'choice-blocked-member' ? 2 : id === 'choice-blocked-guest' ? 1 : 0, 'Each author variant retains its original block/unblock choices');
                await capture(choice, id, root, root + ' .dcuf-selection-copy');
                await cp.locator('.cancel-btn').click(); await choice.page.locator('#dc-selection-popup').waitFor({ state: 'detached' });
            }
            assert.deepEqual(await choice.page.evaluate(key => window.__dcufTestbedGM.snapshot().values[key], storageKeys.personalList), before);
            assertNoRuntimeErrors(await getMetrics(choice.page), choice.consoleErrors);
        } finally { await choice.close(); }

        const backup = await create();
        try {
            await invoke(backup, '차단 유저 관리'); await backup.page.locator('.panel-backup-btn').click();
            const root = '#dc-backup-popup', bp = backup.page.locator(root), text = bp.locator('textarea');
            const original = await backup.page.evaluate(key => window.__dcufTestbedGM.snapshot().values[key], storageKeys.personalList);
            await notice(backup, () => bp.locator('.import-btn').click(), /불러올 데이터가 없습니다/);
            await text.fill('{잘못된 JSON');
            await notice(backup, () => bp.locator('.import-btn').click(), /데이터 형식이 올바르지/);
            // Reference captures use the preserved control only for unchanged
            // valid flows. Its newly repaired malformed-array gap is separately
            // retained in the RED/GREEN probe; candidate runs always cover it.
            for (const field of controlReference ? [] : ['uids', 'nicknames', 'ips']) {
                await text.fill(JSON.stringify({ uids: [], nicknames: [], ips: [], [field]: {} }));
                await notice(backup, () => bp.locator('.import-btn').click(), /데이터 형식이 올바르지/);
            }
            assert.deepEqual(await backup.page.evaluate(key => window.__dcufTestbedGM.snapshot().values[key], storageKeys.personalList), original, 'Empty/invalid backup input preserves synthetic stored data');
            const imported = { uids: [{ id: 'new-synthetic', name: longNick }], nicknames: ['합성 병합 닉네임'], ips: ['203.0.113.22'] };
            await text.fill(JSON.stringify(imported, null, 2));
            await capture(backup, 'backup-json-input', root, root + ' .dcuf-settings-help');
            await notice(backup, () => bp.locator('.import-btn').click(), /성공적으로 불러와서 추가/);
            await bp.waitFor({ state: 'detached' }); await backup.page.locator('#dc-block-management-panel').waitFor({ state: 'detached' });
            const result = await backup.page.evaluate(key => window.__dcufTestbedGM.snapshot().values[key], storageKeys.personalList);
            assert.ok(result.uids.some(x => x.id === 'choice-long-uid') && result.uids.some(x => x.id === 'new-synthetic'));
            assert.ok(result.nicknames.includes(longNick) && result.nicknames.includes('합성 병합 닉네임'));
            assert.ok([...original.ips, ...imported.ips].every(ip => result.ips.includes(ip)), 'Valid merge preserves old IPs and appends imported IPs');
            await invoke(backup, '차단 유저 관리'); await backup.page.locator('.panel-backup-btn').click();
            await bp.locator('input[type="file"]').setInputFiles({ name: 'dcuf-synthetic.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ uids: [{ id: 'file-synthetic', name: '합성 파일 항목' }], nicknames: [], ips: [] })) });
            await capture(backup, 'backup-file-input', root, root + ' .dcuf-settings-help');
            await notice(backup, () => bp.locator('.import-btn').click(), /성공적으로 불러와서 추가/);
            await bp.waitFor({ state: 'detached' });
            const fileResult = await backup.page.evaluate(key => window.__dcufTestbedGM.snapshot().values[key], storageKeys.personalList);
            assert.ok(fileResult.uids.some(x => x.id === 'file-synthetic'));
            assert.ok([...original.ips, ...imported.ips].every(ip => fileResult.ips.includes(ip)));
            assertNoRuntimeErrors(await getMetrics(backup.page), backup.consoleErrors);
        } finally { await backup.close(); }

        const size = await create();
        try {
            const fab = size.page.locator('#dc-personal-block-fab'), initial = await fab.boundingBox();
            await invoke(size, '메뉴 버튼 크기 조절');
            const root = '#dc-personal-block-size-panel', zp = size.page.locator(root), range = zp.locator('input[type="range"]');
            for (const percent of [60, 160]) {
                await range.fill(String(percent));
                assert.equal(await zp.locator('output').textContent(), percent + '%');
                const current = await fab.boundingBox(); assert.ok(Math.abs(current.width - initial.width * percent / 100) <= 1);
                await capture(size, 'size-' + percent, root, root + ' .dcuf-settings-help');
            }
            await zp.locator('[data-dcuf-fab-size-action="cancel"]').click(); await zp.waitFor({ state: 'detached' });
            const restored = await fab.boundingBox(); assert.ok(Math.abs(restored.width - initial.width) <= 1);
            assert.equal(await size.page.evaluate(key => window.__dcufTestbedGM.snapshot().values[key], storageKeys.fabScalePercent), 100);
            assertNoRuntimeErrors(await getMetrics(size.page), size.consoleErrors);
        } finally { await size.close(); }
    }
    if (outputDirectory) await writeFile(outputDirectory + '/observations.json', JSON.stringify({ records, defects, nativeNotices }, null, 2));
    if (!observeOnly) assert.deepEqual(defects, [], 'Owned input/tool children need readable labels and original reachable controls');
    console.log('Owned input children', JSON.stringify({ contexts: records.length, defects, nativeNotices: nativeNotices.length }));
    return { records, defects, nativeNotices };
}
