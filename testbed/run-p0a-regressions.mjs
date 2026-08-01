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
        if (url.pathname === '/mgallery/board/lists') {
            const variant = ['major', 'minor', 'mini'].includes(url.searchParams.get('variant'))
                ? url.searchParams.get('variant')
                : 'minor';
            body = inject(p0aListPage({ variant }));
            status = 200;
        } else if (url.pathname === '/mgallery/board/write') {
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
            dcinside_personal_block_list: { uids: [], nicknames: [], ips: [] }
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

        const headtextOrder = await page.locator('.center_box > .inner').evaluate((root) => Array.from(root.children).map((node) => {
            if (node.matches('ul:first-child')) return 'primary';
            if (node.matches('.btn_subject_more')) return 'trigger';
            if (node.matches('#subject_morelist')) return 'layer';
            return node.tagName.toLowerCase();
        }));
        assert.deepEqual(headtextOrder.slice(0, 3), ['primary', 'trigger', 'layer']);
        await page.locator('.btn_subject_more').click();
        await positiveRect(page.locator('#subject_morelist'), 'subject_morelist');
        record('headtext exact sibling order and reachable layer', 'PASS');

        await page.locator('.list_size_trigger').click();
        const listSizes = await page.locator('#listSizeLayer li').allTextContents();
        assert.deepEqual(listSizes.map((value) => value.trim()), ['30개', '50개', '100개']);
        for (const row of await page.locator('#listSizeLayer li button').all()) await positiveRect(row, 'list-size option');
        record('complete 30/50/100 list-size layer', 'PASS');

        await page.locator('.btn_subject_more').click();
        await page.locator('.list_size_trigger').click();
        await page.locator('.btn_manage').click();
        await page.locator('#pop_manage_report_list').waitFor({ state: 'visible' });
        for (const action of await page.locator('#pop_manage_report_list .popup_action').all()) {
            await positiveRect(action, 'management popup action');
        }
        record('click-created management popup geometry and hit-testing', 'PASS');

        assert.equal(await page.evaluate(() => window.__fixtureDirectWriter instanceof HTMLElement), true);
        const visibleWriter = page.locator('.custom-mobile-list .custom-post-item .author .gall_writer[data-uid="direct-handler-writer"]');
        await visibleWriter.waitFor({ state: 'visible' });
        const visibleWriterIsOriginal = await visibleWriter.evaluate((node) => node === window.__fixtureDirectWriter);
        assert.equal(await page.locator('.user_data[data-fixture-native-menu="1"]').count(), 0);
        await visibleWriter.click();
        const nativeMenuCount = await page.locator('.user_data[data-fixture-native-menu="1"] .native_writer_action').count();
        if (!visibleWriterIsOriginal || nativeMenuCount !== 1) {
            record(
                'trusted visible-writer click creates original native menu',
                'FAIL',
                visibleWriterIsOriginal
                    ? 'the original writer did not create the native menu'
                    : 'current runtime displays a clone; the original node direct handler is not preserved'
            );
        } else {
            await positiveRect(page.locator('.user_data[data-fixture-native-menu="1"] .native_writer_action'), 'native writer menu action');
            record('trusted visible-writer click creates original native menu', 'PASS');
        }

        for (const variant of ['major', 'minor', 'mini']) {
            await page.goto(`${server.baseUrl}/mgallery/board/lists?id=test&variant=${variant}`, { waitUntil: 'domcontentloaded' });
            await page.waitForFunction(() => document.documentElement.classList.contains('script-ui-ready'), null, { timeout: 12000 });
            await page.waitForTimeout(180);
            const variantWriter = page.locator('.custom-mobile-list .custom-post-item .author .gall_writer[data-uid="direct-handler-writer"]');
            await variantWriter.waitFor({ state: 'visible' });
            assert.equal(await page.locator('.user_data[data-fixture-native-menu="1"]').count(), 0);
            assert.equal(await variantWriter.evaluate((node) => node === window.__fixtureDirectWriter), true, `${variant} writer must remain the original node`);
            await variantWriter.click();
            await page.locator('.user_data[data-fixture-native-menu="1"] .native_writer_action').waitFor({ state: 'visible' });
            await positiveRect(page.locator('.user_data[data-fixture-native-menu="1"] .native_writer_action'), `${variant} native writer menu action`);
            record(`${variant} visible writer trusted click and native menu`, 'PASS');
        }

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
        await page.locator('.ai_settings_button').click();
        await positiveRect(page.locator('.ai_settings_popup'), 'AI settings popup');
        record('complete AI quick-registration rail and settings popup', 'PASS');

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
