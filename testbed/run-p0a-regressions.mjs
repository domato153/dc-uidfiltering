import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import http from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { p0aListPage, p0aWritePage } from './fixtures/p0a-live-contracts.mjs';
import { launchBrowser } from './harness/runner-utils.mjs';

const execFileAsync = promisify(execFile);
const testbedDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(testbedDir, '..');
const runtimePath = path.join(testbedDir, 'artifacts', 'runtime-under-test.user.js');
const expectedRuntimePath = path.resolve(runtimePath);
const results = [];

const record = (name, status, detail = '') => {
    results.push({ name, status, detail });
    const suffix = detail ? ` — ${detail}` : '';
    process.stdout.write(`${status} ${name}${suffix}\n`);
};

const buildRuntime = async () => {
    await mkdir(path.dirname(runtimePath), { recursive: true });
    const { stdout, stderr } = await execFileAsync(process.execPath, [
        path.join(rootDir, 'tools', 'build-userscript.mjs'),
        '--testbed-output',
        runtimePath
    ], { cwd: rootDir, windowsHide: true });
    if (stderr?.trim()) process.stderr.write(stderr);
    const bytes = await readFile(runtimePath);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    process.stdout.write(`${stdout.trim()}\nRuntime under test: ${expectedRuntimePath}\nRuntime SHA-256: ${sha256}\n`);
    return { sha256 };
};

const startFixtureServer = async (harnessSource) => {
    const inject = (html) => html.replace('</head>', `<script>${harnessSource.replaceAll('</script>', '<\\/script>')}</script></head>`);
    const server = http.createServer((request, response) => {
        const url = new URL(request.url, 'http://127.0.0.1');
        if (url.pathname === '/favicon.ico') {
            response.writeHead(204);
            response.end();
            return;
        }
        let body = '<!doctype html><title>not found</title>';
        let status = 404;
        if (['/board/lists', '/mgallery/board/lists', '/mini/board/lists'].includes(url.pathname)) {
            const variant = ['major', 'minor', 'mini'].includes(url.searchParams.get('variant'))
                ? url.searchParams.get('variant')
                : url.pathname === '/board/lists' ? 'major' : url.pathname === '/mini/board/lists' ? 'mini' : 'minor';
            body = inject(p0aListPage({ variant }));
            status = 200;
        } else if (['/board/write', '/mgallery/board/write', '/mini/board/write'].includes(url.pathname)) {
            body = inject(p0aWritePage());
            status = 200;
        }
        response.writeHead(status, {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-store'
        });
        response.end(body);
    });
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    return {
        baseUrl: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    };
};

const positiveRect = async (locator, label) => {
    const result = await locator.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const top = document.elementFromPoint(x, y);
        return {
            width: rect.width,
            height: rect.height,
            withinViewport: rect.left >= 0 && rect.top >= 0
                && rect.right <= document.documentElement.clientWidth
                && rect.bottom <= document.documentElement.clientHeight,
            ownsHit: top === element || element.contains(top),
            hitTarget: top ? {
                tag: top.tagName,
                id: top.id,
                className: top.className,
                zIndex: getComputedStyle(top).zIndex
            } : null
        };
    });
    assert.equal(result.width > 0 && result.height > 0, true, `${label}: non-positive geometry ${JSON.stringify(result)}`);
    assert.equal(result.withinViewport, true, `${label}: outside visual viewport ${JSON.stringify(result)}`);
    assert.equal(result.ownsHit, true, `${label}: lost elementFromPoint ${JSON.stringify(result)}`);
};

const main = async () => {
    const { sha256 } = await buildRuntime();
    process.env.DCUF_TESTBED_USERSCRIPT = path.relative(rootDir, runtimePath);
    const { loadHarnessSource } = await import('./harness/userscript-loader.mjs');
    const harnessSource = await loadHarnessSource({
        storage: {
            dcinside_threshold: 0,
            dcinside_ratio_filter_enabled: false,
            dcinside_personal_block_enabled: true,
            dcinside_personal_block_list: { uids: [], nicknames: [], ips: [] },
            dcuf_mobile_convenience_settings_v1: { recentHighlight: true, draftRecovery: true, postPreview: true }
        }
    });
    const server = await startFixtureServer(harnessSource);
    const browser = await launchBrowser();
    const context = await browser.newContext({ viewport: { width: 1100, height: 720 } });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => consoleErrors.push(error.stack || error.message));

    try {
        await page.goto(`${server.baseUrl}/mgallery/board/lists?id=test`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => document.documentElement.classList.contains('script-ui-ready'), null, { timeout: 12000 });
        await page.waitForTimeout(180);

        const exactRecent = await page.locator('#visit_history.visit_bookmark > .newvisit_history.vst').count();
        assert.equal(exactRecent, 1);
        const spriteRect = await page.locator('#visit_history > .newvisit_history.vst > .btn_open > .sp_img.icon_listmore').boundingBox();
        assert.equal(Boolean(spriteRect && spriteRect.width > 0 && spriteRect.height > 0), true);
        record('recent-visit exact root and sprite geometry', 'PASS');

        await page.locator('.bnt_visit_next').click();
        const recentNativeContract = await page.evaluate(() => ({
            clicks: window.__fixtureRecentNativeClicks,
            defaultPrevented: window.__fixtureRecentNativeDefaultPrevented
        }));
        assert.equal(recentNativeContract.clicks, 1, JSON.stringify(recentNativeContract));
        assert.deepEqual(recentNativeContract.defaultPrevented, [false], JSON.stringify(recentNativeContract));
        record('recent-visit native handler survives without capture cancellation', 'PASS');

        const recentTitleContract = await page.evaluate(() => {
            const history = document.querySelector('#visit_history > .newvisit_history');
            const titles = [...history.querySelectorAll(':scope > .vst_title, :scope > .bookmark_title')];
            return { recent: titles[0]?.hidden, bookmark: titles[1]?.hidden };
        });
        assert.deepEqual(recentTitleContract, { recent: false, bookmark: true });
        await page.evaluate(() => document.querySelector('#visit_history > .newvisit_history')?.classList.add('bookmark'));
        await page.waitForTimeout(80);
        const bookmarkTitleContract = await page.evaluate(() => {
            const history = document.querySelector('#visit_history > .newvisit_history');
            const titles = [...history.querySelectorAll(':scope > .vst_title, :scope > .bookmark_title')];
            return { recent: titles[0]?.hidden, bookmark: titles[1]?.hidden };
        });
        assert.deepEqual(bookmarkTitleContract, { recent: true, bookmark: false });
        record('recent/favorite host state keeps exactly one title visible', 'PASS');

        const headtextOrder = await page.locator('.center_box > .inner').evaluate((root) => Array.from(root.children).map((node) => {
            if (node.matches('ul:first-child')) return 'primary';
            if (node.matches('.btn_subject_more')) return 'trigger';
            if (node.matches('#subject_morelist')) return 'layer';
            return node.tagName.toLowerCase();
        }));
        assert.deepEqual(headtextOrder.slice(0, 3), ['primary', 'trigger', 'layer']);
        await page.locator('.btn_subject_more').click();
        await positiveRect(page.locator('#subject_morelist'), 'subject_morelist');
        const headtextGeometry = await page.evaluate(() => {
            const button = document.querySelector('.btn_subject_more').getBoundingClientRect();
            const list = document.querySelector('.center_box > .inner > ul:first-of-type').getBoundingClientRect();
            return { button, list, overlap: button.left < list.right && list.left < button.right && button.top < list.bottom && list.top < button.bottom };
        });
        assert.equal(headtextGeometry.overlap, false, JSON.stringify(headtextGeometry));
        record('headtext exact sibling order and reachable layer', 'PASS');

        const titleMetadata = await page.evaluate(() => {
            const title = document.querySelector('.custom-mobile-list .custom-post-item .post-title');
            const meta = title?.querySelector(':scope > .dcuf-title-meta');
            return {
                metaLast: title?.lastElementChild === meta,
                replyInMeta: Boolean(meta?.querySelector(':scope > .reply_num')),
                decorationsInMeta: (meta?.querySelectorAll(':scope > .dcuf-title-decoration').length || 0) >= 2,
                decorationsOutsideMeta: title ? [...title.children].filter((node) => node.matches('.reply_num,.dcuf-title-decoration') && node !== meta).length : -1
            };
        });
        assert.deepEqual(titleMetadata, { metaLast: true, replyInMeta: true, decorationsInMeta: true, decorationsOutsideMeta: 0 }, JSON.stringify(titleMetadata));
        record('post metadata stays in the right-aligned title meta area', 'PASS');

        await page.locator('.list_size_trigger').click();
        const listSizes = await page.locator('#listSizeLayer li').allTextContents();
        assert.deepEqual(listSizes.map((value) => value.trim()), ['30개', '50개', '100개']);
        for (const row of await page.locator('#listSizeLayer li button').all()) await positiveRect(row, 'list-size option');
        record('complete 30/50/100 list-size layer', 'PASS');

        await page.locator('.btn_subject_more').click();
        await page.locator('.list_size_trigger').click();
        await page.locator('.btn_manage').click();
        await page.locator('#pop_manage_report_list').waitFor({ state: 'visible' });
        assert.equal(await page.locator('#pop_manage_report_list').evaluate((node) => node.parentElement === document.body), true);
        for (const action of await page.locator('#pop_manage_report_list .popup_action').all()) {
            await positiveRect(action, 'management popup action');
        }
        await page.locator('.hot_rank_trigger').click();
        await page.locator('#hot_rank_pop2').waitFor({ state: 'visible' });
        assert.equal(await page.locator('#hot_rank_pop2').evaluate((node) => node.parentElement === document.body), true);
        record('host management and hot-rank popups portal to body', 'PASS');

        assert.equal(await page.evaluate(() => window.__fixtureDirectWriter instanceof HTMLElement), true);
        const visibleWriter = page.locator('.custom-mobile-list .custom-post-item .author .gall_writer[data-uid="direct-handler-writer"]');
        await visibleWriter.waitFor({ state: 'visible' });
        const visibleWriterIsOriginal = await visibleWriter.evaluate((node) => node === window.__fixtureDirectWriter);
        const tableContract = await page.evaluate(() => {
            const writer = document.querySelector('.custom-mobile-list .custom-post-item .author .gall_writer[data-uid="direct-handler-writer"]');
            const bridge = writer?.closest('table.dcuf-writer-bridge');
            const outerTable = writer?.closest('table.gall_list');
            const hostCell = document.querySelector('table.gall_list > tbody.dcuf-mobile-list-host > tr > td.dcuf-mobile-list-host-cell');
            return {
                bridgeCellParentValid: Boolean(writer && bridge?.querySelector(':scope > tbody > tr > td') === writer),
                originalWriterHasOuterTablePath: Boolean(writer && outerTable),
                hostCellValid: Boolean(hostCell?.querySelector(':scope > .custom-mobile-list')),
                directRowSpanIdentityCount: document.querySelectorAll('table.gall_list > tbody.listwrap2 > tr > span.dcuf-writer-identity').length,
                directRowCellIdentityCount: document.querySelectorAll('table.gall_list > tbody.listwrap2 > tr > td.dcuf-writer-identity').length
            };
        });
        assert.equal(tableContract.bridgeCellParentValid, true, JSON.stringify(tableContract));
        assert.equal(tableContract.originalWriterHasOuterTablePath, true, JSON.stringify(tableContract));
        assert.equal(tableContract.hostCellValid, true, JSON.stringify(tableContract));
        assert.equal(tableContract.directRowSpanIdentityCount, 0, JSON.stringify(tableContract));
        assert.equal(tableContract.directRowCellIdentityCount > 0, true, JSON.stringify(tableContract));
        assert.equal(await page.locator('.user_data[data-fixture-native-menu="1"]').count(), 0);
        await visibleWriter.locator('.nickname').click();
        const nativeMenuCount = await page.locator('.user_data[data-fixture-native-menu="1"] .native_writer_action').count();
        const listenerKinds = await page.evaluate(() => [...new Set(window.__fixtureWriterListenerKinds || [])]);
        const hasBothWriterPaths = listenerKinds.includes('direct') && listenerKinds.includes('table-delegated');
        if (!visibleWriterIsOriginal || nativeMenuCount !== 1 || !hasBothWriterPaths) {
            record(
                'trusted visible-writer click creates original native menu',
                'FAIL',
                !visibleWriterIsOriginal
                    ? 'current runtime displays a clone; the original node direct handler is not preserved'
                    : !hasBothWriterPaths
                        ? `writer event paths missing: ${listenerKinds.join(',')}`
                        : 'the original writer did not create the native menu'
            );
        } else {
            await positiveRect(page.locator('.user_data[data-fixture-native-menu="1"] .native_writer_action'), 'native writer menu action');
            record('trusted visible-writer click creates original native menu', 'PASS');
        }

        for (const { variant, route, viewRoute, writeRoute, headerCount, typeColumns } of [
            { variant: 'major', route: '/board/lists', viewRoute: '/board/view', writeRoute: '/board/write', headerCount: 6, typeColumns: 0 },
            { variant: 'minor', route: '/mgallery/board/lists', viewRoute: '/mgallery/board/view', writeRoute: '/mgallery/board/write', headerCount: 7, typeColumns: 1 },
            { variant: 'mini', route: '/mini/board/lists', viewRoute: '/mini/board/view', writeRoute: '/mini/board/write', headerCount: 6, typeColumns: 0 }
        ]) {
            await page.goto(`${server.baseUrl}${route}?id=test`, { waitUntil: 'domcontentloaded' });
            await page.waitForFunction(() => document.documentElement.classList.contains('script-ui-ready'), null, { timeout: 12000 });
            await page.waitForTimeout(180);
            const variantWriter = page.locator('.custom-mobile-list .custom-post-item .author .gall_writer[data-uid="direct-handler-writer"]');
            await variantWriter.waitFor({ state: 'visible' });
            const variantContract = await page.evaluate(() => {
                const writer = document.querySelector('.custom-mobile-list .custom-post-item .author .gall_writer[data-uid="direct-handler-writer"]');
                const bridge = writer?.closest('table.dcuf-writer-bridge');
                const originalRow = document.querySelector('table.gall_list > tbody.listwrap2 > tr.ub-content');
                return {
                    bridgeCellParentValid: Boolean(writer && bridge?.querySelector(':scope > tbody > tr > td') === writer),
                    outerTablePath: Boolean(writer?.closest('table.gall_list')),
                    directRowSpanIdentityCount: document.querySelectorAll('table.gall_list > tbody.listwrap2 > tr > span.dcuf-writer-identity').length,
                    headerCount: document.querySelectorAll('table.gall_list > thead > tr > th').length,
                    originalRowCellCount: originalRow?.children.length || 0,
                    typeColumns: originalRow?.querySelectorAll(':scope > td.gall_type').length || 0,
                    route: document.body.dataset.fixtureRoute || '',
                    heading: document.querySelector('.page_head h2')?.textContent?.trim() || ''
                };
            });
            assert.equal(variantContract.bridgeCellParentValid, true, `${variant}: ${JSON.stringify(variantContract)}`);
            assert.equal(variantContract.outerTablePath, true, `${variant}: ${JSON.stringify(variantContract)}`);
            assert.equal(variantContract.directRowSpanIdentityCount, 0, `${variant}: ${JSON.stringify(variantContract)}`);
            assert.equal(variantContract.headerCount, headerCount, `${variant}: ${JSON.stringify(variantContract)}`);
            assert.equal(variantContract.originalRowCellCount, headerCount, `${variant}: ${JSON.stringify(variantContract)}`);
            assert.equal(variantContract.typeColumns, typeColumns, `${variant}: ${JSON.stringify(variantContract)}`);
            assert.equal(variantContract.route, route, `${variant}: ${JSON.stringify(variantContract)}`);
            assert.equal(variantContract.heading.includes(variant === 'major' ? '일반' : variant === 'minor' ? '마이너' : '미니'), true, `${variant}: ${JSON.stringify(variantContract)}`);
            const variantHref = await page.locator('.custom-mobile-list .custom-post-item .post-title-link').first().getAttribute('href');
            assert.equal(new URL(variantHref, server.baseUrl).pathname, viewRoute, `${variant} view route`);
            const writeHref = await page.locator('.list_bottom_btnbox .btn_write').getAttribute('href');
            assert.equal(new URL(writeHref, server.baseUrl).pathname, writeRoute, `${variant} write route`);
            assert.equal(await page.locator('.user_data[data-fixture-native-menu="1"]').count(), 0);
            assert.equal(await variantWriter.evaluate((node) => node === window.__fixtureDirectWriter), true, `${variant} writer must remain the original node`);
            await variantWriter.locator('.nickname').click();
            await page.locator('.user_data[data-fixture-native-menu="1"] .native_writer_action').waitFor({ state: 'visible' });
            await positiveRect(page.locator('.user_data[data-fixture-native-menu="1"] .native_writer_action'), `${variant} native writer menu action`);
            const variantListenerKinds = await page.evaluate(() => [...new Set(window.__fixtureWriterListenerKinds || [])]);
            assert.equal(variantListenerKinds.includes('direct') && variantListenerKinds.includes('table-delegated'), true, `${variant} writer listener paths: ${variantListenerKinds.join(',')}`);
            record(`${variant} visible writer trusted click and native menu`, 'PASS');
        }

        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(`${server.baseUrl}/mgallery/board/write?id=test`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => document.documentElement.classList.contains('script-ui-ready'), null, { timeout: 12000 });
        await page.waitForTimeout(180);
        const requiredAiSelectors = [
            '.ai_loading', '.ai_file_input', '.ai_image_control', '.ai_character_control',
            '.ai_layer_button', '.ai_prompt', '.ai_count', '.ai_native_close.sp_img', '.ai_settings_button'
        ];
        for (const selector of requiredAiSelectors) {
            assert.equal(await page.locator(selector).count(), 1, `missing AI quick-registration control: ${selector}`);
        }
        const toolbarContract = await page.locator('[data-fixture-toolbar]').evaluate((toolbar) => {
            const style = getComputedStyle(toolbar);
            return { flexWrap: style.flexWrap, overflowX: style.overflowX, clientWidth: toolbar.clientWidth, scrollWidth: toolbar.scrollWidth, childWidths: [...toolbar.children].map((child) => child.getBoundingClientRect().width), oneRow: toolbar.scrollHeight <= toolbar.clientHeight + 1, scrollable: toolbar.scrollWidth > toolbar.clientWidth };
        });
        assert.equal(toolbarContract.flexWrap, 'nowrap', JSON.stringify(toolbarContract));
        assert.equal(['auto', 'scroll'].includes(toolbarContract.overflowX), true, JSON.stringify(toolbarContract));
        assert.equal(toolbarContract.oneRow, true, JSON.stringify(toolbarContract));
        assert.equal(toolbarContract.scrollable, true, JSON.stringify(toolbarContract));
        record('mobile write toolbar remains one-row horizontally scrollable', 'PASS');
        await page.locator('.ai_settings_button').click();
        await positiveRect(page.locator('.ai_settings_popup'), 'AI settings popup');
        record('complete AI quick-registration rail and settings popup', 'PASS');

        await page.setViewportSize({ width: 1100, height: 720 });
        await page.goto(`${server.baseUrl}/mgallery/board/lists?id=test`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => document.documentElement.classList.contains('script-ui-ready'), null, { timeout: 12000 });
        await page.waitForTimeout(180);
        const convenienceBefore = await page.evaluate(() => ({ ...window.__dcufMobileConvenienceModule.settings }));
        assert.deepEqual(convenienceBefore, { recentHighlight: true, draftRecovery: true, postPreview: true });
        await page.evaluate(() => window.__dcufTestbedGM.invokeMenu('글댓합 설정하기'));
        await page.locator('#dcinside-master-disable-checkbox').waitFor({ state: 'attached' });
        await page.locator('#dcinside-master-disable-checkbox').evaluate((input) => {
            input.checked = true;
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await page.waitForTimeout(80);
        const convenienceAfter = await page.evaluate(() => ({ ...window.__dcufMobileConvenienceModule.settings }));
        assert.deepEqual(convenienceAfter, convenienceBefore, JSON.stringify({ before: convenienceBefore, after: convenienceAfter }));
        record('filter master-off leaves convenience preview/recent/draft settings enabled', 'PASS');

        assert.deepEqual(consoleErrors, [], `runtime console errors: ${consoleErrors.join('\n')}`);
        const failed = results.filter((result) => result.status === 'FAIL');
        process.stdout.write(`P0-A runtime SHA-256: ${sha256}\n`);
        process.stdout.write(`P0-A result: ${results.length - failed.length} passed, ${failed.length} failed\n`);
        if (failed.length === 0 && process.env.DCUF_P0A_EXPECT_INITIAL_FAILURE === '1') {
            throw new Error('False-positive stop rule: all P0-A contracts passed before production fixes');
        }
        if (failed.length > 0) process.exitCode = 1;
    } finally {
        await context.close();
        await browser.close();
        await server.close();
    }
};

main().catch((error) => {
    console.error('[P0-A] runner failed:', error?.stack || error);
    process.exitCode = 1;
});
