import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTestPage, launchBrowser, storageKeys, getMetrics, assertNoRuntimeErrors } from './harness/runner-utils.mjs';
import { resolveBuiltUserscript } from './harness/userscript-loader.mjs';
import { startServer } from './server/server.mjs';

const panelSelector = (surface) => `[data-dcuf-surface="${surface}"][data-dcuf-role="panel"]`;
const overlaySelector = (surface) => `[data-dcuf-surface="${surface}"][data-dcuf-role="overlay"]`;
const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) <= 1, `${label}: ${actual} != ${expected}`);

// Reintroducing surface-wide size rules, a competing common panel width, or
// equal button/input flex allocation must fail these rendered UI contracts.
export async function runDialogRepairContract({ browser, server, target = 'mobile', only = 'all', scenarios = [
    { width: 980, height: 2100, dark: false },
    { width: 980, height: 480, dark: true },
    { width: 390, height: 844, dark: true },
    { width: 390, height: 360, dark: false },
] }) {
    assert.ok(['mobile', 'pc'].includes(target), `Unknown dialog target: ${target}`);
    assert.ok(['all', 'overlay', 'width', 'headtext'].includes(only), `Unknown dialog contract: ${only}`);
    const receipts = [];
    for (const scenario of scenarios) {
        const session = await createTestPage(browser, server.baseUrl, {
            viewport: { width: scenario.width, height: scenario.height },
            storage: {
                [storageKeys.threshold]: 0, [storageKeys.ratioEnabled]: false,
                [storageKeys.personalEnabled]: true,
                [storageKeys.personalList]: { uids: Array.from({ length: 40 }, (_, i) => ({ id: `dialog-${i}`, name: `합성 차단 사용자 ${i}` })), nicknames: [], ips: [] },
            },
        });
        const page = session.page;
        const settle = () => page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== 'running')
            && window.__dcufTestbedMetrics.snapshot().activeAnimationFrames === 0);
        const menu = (label) => page.evaluate((name) => window.__dcufTestbedGM.invokeMenu(name), label);
        const click = async (selector) => { await page.locator(selector).click(); await settle(); };
        const close = async (surface, selector) => {
            await click(`${panelSelector(surface)} ${selector}`);
            await page.locator(panelSelector(surface)).waitFor({ state: 'detached' });
            await settle();
        };
        const inspect = async (surface, intendedWidth, hasOverlay = true) => {
            const panel = page.locator(panelSelector(surface));
            await panel.waitFor({ state: 'visible' });
            await settle();
            const geometry = await panel.evaluate((element) => {
                const rect = element.getBoundingClientRect();
                const body = element.querySelector('.dcuf-panel-body');
                return { x: rect.x, y: rect.y, width: rect.width, height: rect.height,
                    right: rect.right, bottom: rect.bottom, bodyOverflow: body ? getComputedStyle(body).overflowY : null };
            });
            if (only === 'all' || only === 'width') {
                near(geometry.width, Math.min(intendedWidth, scenario.width - 24), `${surface} intended width`);
                assert.ok(geometry.height > 0 && geometry.height <= scenario.height - 24 + 1, `${surface} height cap: ${JSON.stringify(geometry)}`);
                assert.ok(geometry.x >= 11 && geometry.y >= 11 && geometry.right <= scenario.width - 11 && geometry.bottom <= scenario.height - 11,
                    `${surface} viewport containment: ${JSON.stringify(geometry)}`);
                if (geometry.bodyOverflow) assert.ok(['auto', 'scroll'].includes(geometry.bodyOverflow), `${surface} internal scrolling`);
                const scroll = await panel.evaluate((element) => {
                    const body = element.querySelector('.dcuf-panel-body');
                    if (!body || body.scrollHeight <= body.clientHeight + 1) return null;
                    body.scrollTop = body.scrollHeight;
                    const result = { top: body.scrollTop, bottom: body.scrollTop + body.clientHeight, height: body.scrollHeight };
                    body.scrollTop = 0;
                    return result;
                });
                if (scroll) assert.ok(scroll.top > 0 && scroll.bottom >= scroll.height - 1, `${surface} overflowing body reaches bottom: ${JSON.stringify(scroll)}`);
            }
            if (hasOverlay && (only === 'all' || only === 'overlay')) {
                const overlay = await page.locator(overlaySelector(surface)).evaluate((element) => {
                    const rect = element.getBoundingClientRect();
                    const points = [[2, 2], [innerWidth - 3, 2], [2, innerHeight - 3], [innerWidth - 3, innerHeight - 3]];
                    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height,
                        outsideHits: points.map(([x, y]) => document.elementFromPoint(x, y) === element) };
                });
                near(overlay.x, 0, `${surface} backdrop left`); near(overlay.y, 0, `${surface} backdrop top`);
                near(overlay.width, scenario.width, `${surface} full backdrop width`);
                near(overlay.height, scenario.height, `${surface} full backdrop height`);
                assert.deepEqual(overlay.outsideHits, [true, true, true, true], `${surface} outside points hit backdrop`);
            }
            receipts.push({ ...scenario, target, surface, geometry });
        };
        try {
            await session.goto('/board/lists?id=test');
            await page.locator('#dcuf-testbed-controls').evaluate((element) => { element.hidden = true; });
            if (scenario.dark) await page.evaluate(() => window.__dcufFixture.toggleDark(true));
            // Palette mounts another BASE_CSS payload. Kind widths must remain
            // correct even when the common payload was inserted most recently.
            await menu('UI 색상 설정');
            await page.locator('#dcuf-palette-panel').waitFor({ state: 'visible' });
            await click('[data-dcuf-palette-action="cancel"]');
            await page.locator('#dcuf-palette-panel').waitFor({ state: 'detached' });
            const storageBefore = await page.evaluate(() => window.__dcufTestbedGM.snapshot().values);

            if (only !== 'headtext') {
                for (let cycle = 0; cycle < 2; cycle++) {
                    await menu('차단 유저 관리');
                    await inspect('personal-management', 400);
                    if (cycle === 0 && only === 'all') {
                        const management = page.locator('#dc-block-management-panel');
                        assert.equal(await management.getAttribute('data-dcuf-pointer-geometry-bound'), '1', 'existing geometry owner remains connected');
                        const drag = async (handleSelector, dx, dy) => {
                            const handle = await management.locator(handleSelector).boundingBox();
                            await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
                            await page.mouse.down();
                            await page.mouse.move(handle.x + handle.width / 2 + dx, handle.y + handle.height / 2 + dy, { steps: 5 });
                            await page.mouse.up(); await settle();
                        };
                        const before = await management.boundingBox();
                        await drag('.panel-title-group', 18, 18);
                        const moved = await management.boundingBox();
                        assert.ok(moved.x > before.x || moved.y > before.y, 'management pointer drag still moves the original panel');
                        await drag('.panel-resize-handle', -35, -45);
                        const resized = await management.boundingBox();
                        assert.ok(resized.width < moved.width && resized.height < moved.height, 'geometry owner can resize after kind-width repair');
                        assert.ok(resized.x >= 0 && resized.y >= 0 && resized.x + resized.width <= scenario.width && resized.y + resized.height <= scenario.height, 'resized management panel remains in viewport');
                        assert.equal(await page.locator(overlaySelector('personal-management')).evaluate((element) => document.elementFromPoint(2, 2) === element), true, 'geometry updates keep full backdrop interception');
                    }
                    await page.locator('#dc-block-management-panel .panel-search-input').fill('합성');
                    await click('#dc-block-management-panel .panel-backup-btn');
                    await inspect('personal-backup', 560);
                    await close('personal-backup', '.popup-close-btn');
                    assert.equal(await page.locator('#dc-block-management-panel .panel-search-input').inputValue(), '합성', 'nested backup preserves parent search');
                    await click('#dc-block-management-panel .panel-add-btn');
                    await inspect('personal-manual', 440);
                    await click(`${panelSelector('personal-manual')} [data-manual-block-type="uid"]`);
                    assert.equal(await page.locator('#dc-manual-block-display').isVisible(), true, 'UID display field remains operable');
                    await close('personal-manual', '.dcuf-manual-close');
                    assert.equal(await page.locator('#dc-block-management-panel .panel-search-input').inputValue(), '합성', 'nested manual close preserves parent search');
                    await close('personal-management', '.panel-close-btn');
                    await menu('메뉴 버튼 크기 조절');
                    await inspect('personal-size', 380);
                    await close('personal-size', '[data-dcuf-fab-size-action="cancel"]');
                    await menu('글댓합 설정하기');
                    await inspect('filter-settings', 580, false);
                    await click(`${panelSelector('filter-settings')} .dcuf-text-action`);
                    await inspect('shortcut-settings', 380);
                    await close('shortcut-settings', '.dcuf-button--secondary');
                    await close('filter-settings', '.dcuf-settings-close');
                }
                // An actual pointer outside the management panel must close it
                // without reaching the host node underneath the backdrop.
                await page.evaluate(() => {
                    window.__dialogHostClicks = 0;
                    const button = document.createElement('button');
                    button.id = 'dialog-host-hit-probe';
                    button.style.cssText = 'position:fixed;left:0;top:0;width:20px;height:20px;z-index:2147483645';
                    button.onclick = () => window.__dialogHostClicks++;
                    document.body.appendChild(button);
                });
                await menu('차단 유저 관리'); await settle();
                await page.mouse.click(2, 2);
                await page.locator('#dc-block-management-panel').waitFor({ state: 'detached' });
                assert.equal(await page.evaluate(() => window.__dialogHostClicks), 0, 'backdrop intercepts actual outside pointer');
            }
            if (only === 'all' || only === 'headtext' || only === 'width') {
                await menu('글댓합 설정하기');
                await click(`${panelSelector('filter-settings')} .dcuf-button--wide`);
                await inspect('headtext-settings', 460, false);
                const input = page.locator('[data-dcuf-headtext-manual]');
                const add = page.locator('[data-dcuf-headtext-action="add"]');
                await input.fill('아주 긴 합성 말머리 '.repeat(30));
                await input.scrollIntoViewIfNeeded();
                const row = await add.evaluate((element) => {
                    const rect = element.getBoundingClientRect();
                    const inputRect = element.parentElement.querySelector('input').getBoundingClientRect();
                    const range = document.createRange(); range.selectNodeContents(element);
                    return { width: rect.width, height: rect.height, textHeight: range.getBoundingClientRect().height,
                        lineHeight: parseFloat(getComputedStyle(element).lineHeight), inputWidth: inputRect.width,
                        sameRow: Math.abs(rect.top - inputRect.top) <= 1,
                        hit: element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)) };
                });
                assert.ok(row.sameRow && row.inputWidth > 100 && row.width >= 50 && row.height <= 45 && row.textHeight <= row.lineHeight + 1 && row.hit,
                    `headtext input/Add usable single row: ${JSON.stringify(row)}`);
                await close('headtext-settings', '[data-dcuf-headtext-action="close"]');
                await close('filter-settings', '.dcuf-settings-close');
                if (target === 'mobile') {
                    await menu('모바일 편의기능 설정');
                    await inspect('convenience-settings', 440, false);
                    await close('convenience-settings', '.dcuf-convenience-close');
                }
            }
            assert.deepEqual(await page.evaluate(() => window.__dcufTestbedGM.snapshot().values), storageBefore, 'open, cancel, nested close and long input preserve stored settings');
            assertNoRuntimeErrors(await getMetrics(page), session.consoleErrors);
        } finally { await session.close(); }
    }
    return receipts;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const runtime = await resolveBuiltUserscript();
    const frozenControl = process.argv.includes('--frozen-control');
    if (!frozenControl && !/[\\/]testbed[\\/]artifacts[\\/]runtime-under-test\.user\.js$/i.test(runtime)) {
        throw new Error(`Runtime guard rejected non-source artifact: ${runtime}`);
    }
    const bytes = await readFile(runtime);
    const sha256 = createHash('sha256').update(bytes).digest('hex').toUpperCase();
    if (frozenControl) assert.equal(sha256, '4E416EDB2A962F2C63A39BE37601F0ECB669F479FA1B3702DA6E717F8BA77257', 'frozen control binding');
    console.log(`Runtime under test: ${runtime}\nRuntime SHA-256: ${sha256}`);
    const onlyIndex = process.argv.indexOf('--only');
    const userscriptName = bytes.toString().match(/^\/\/\s*@name\s+(.+)$/m)?.[1]?.trim();
    const target = userscriptName === 'DCInside PC User Filter' ? 'pc' : userscriptName === 'DC_UserFilter_Mobile' ? 'mobile' : null;
    const server = await startServer(); const browser = await launchBrowser();
    try {
        const receipts = await runDialogRepairContract({ browser, server, target, only: onlyIndex >= 0 ? process.argv[onlyIndex + 1] : 'all' });
        console.log(`PASS UI13–15 dialog repair contract (${receipts.length} observations, ${target})`);
    } finally { await browser.close(); await server.close(); }
}
