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
const runtimePath = path.join(testbedDir, 'artifacts', 'p1-runtime-under-test.user.js');
const results = [];

const pass = (name, detail = '') => {
    results.push({ name, status: 'PASS', detail });
    process.stdout.write(`PASS ${name}${detail ? ` — ${detail}` : ''}\n`);
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
    process.stdout.write(`${stdout.trim()}\nP1 runtime: ${path.resolve(runtimePath)}\nP1 SHA-256: ${sha256}\n`);
    return { bytes, text: bytes.toString('utf8'), sha256 };
};

const staticContracts = async (builtText) => {
    const [paletteSource, surfaceSource, adaptersSource, bridgeSource, buildSource] = await Promise.all([
        readFile(path.join(rootDir, 'src', 'shared', 'mobile-palette-data.js'), 'utf8'),
        readFile(path.join(rootDir, 'src', 'targets', 'mobile', 'surface-theme.js'), 'utf8'),
        readFile(path.join(rootDir, 'src', 'targets', 'mobile', 'live-corrections.js'), 'utf8'),
        readFile(path.join(rootDir, 'src', 'targets', 'mobile', 'live-native-bridge.js'), 'utf8'),
        readFile(path.join(rootDir, 'tools', 'build-userscript.mjs'), 'utf8')
    ]);

    const paletteIds = [...paletteSource.matchAll(/Object\.freeze\(\{ id: '([^']+)'/g)].map((match) => match[1]);
    assert.equal(paletteIds.length, 14, `canonical palette count: ${paletteIds.length}`);
    assert.equal(new Set(paletteIds).size, 14, `duplicate palette IDs: ${paletteIds.join(',')}`);
    assert.deepEqual(paletteIds, ['blue', 'purple', 'green', 'orange', 'mono', 'indigo', 'sky', 'cyan', 'teal', 'lime', 'amber', 'red', 'rose', 'pink']);
    assert.equal((builtText.match(/const DCUF_MOBILE_PALETTE_PRESETS = Object\.freeze\(/g) || []).length, 1);
    assert.equal(builtText.includes('const PRESETS = DCUF_MOBILE_PALETTE_PRESETS;'), true);
    assert.equal(builtText.includes('DCUF_MOBILE_PALETTE_PRESETS.map((preset)'), true);
    assert.equal(buildSource.includes('transformLoginSurfaceForCanonicalPalettes'), true);
    assert.equal(buildSource.includes('transformThemeForCanonicalPalettes'), true);
    pass('one canonical source supplies all 14 main/login palettes');

    for (const marker of ['header-recent', 'list', 'write', 'native-layer']) {
        assert.equal((surfaceSource.match(new RegExp(`DCUF_SURFACE_OWNER:${marker}`, 'g')) || []).length, 1, marker);
    }
    assert.equal(surfaceSource.includes("article: 'dcuf-mobile-palette-style'"), true);
    assert.equal(surfaceSource.includes("comments: 'dcuf-mobile-palette-style'"), true);
    assert.equal(surfaceSource.includes("rule.parentRule?.deleteRule?.(index) ??"), false, 'unsafe double-delete expression returned');
    assert.equal(surfaceSource.includes('root.__dcufEnforceSurfaceOwnership = enforceOwnership;'), true);
    assert.equal(adaptersSource.includes('document.createElement(\'style\')'), false, 'adapter became another visual owner');
    assert.equal(adaptersSource.includes('dcuf-live-surface-owner'), false, 'retired emergency style returned');
    assert.equal(/body\s+\*/.test(surfaceSource), false, 'broad reduced-motion selector returned');
    pass('surface owner markers are singular and adapters contain no stylesheet');

    assert.equal(bridgeSource.includes('preventDefault()'), false, 'recent bridge cancels native default');
    assert.equal(bridgeSource.includes('stopImmediatePropagation()'), false, 'recent bridge blocks native propagation');
    assert.equal(bridgeSource.includes('requestAnimationFrame'), true);
    assert.equal(bridgeSource.includes('hostMoved'), true);
    assert.equal(bridgeSource.includes('hostChangedState'), true);
    pass('recent navigation is native-first with a bounded fallback');
};

const startServer = async (harnessSource) => {
    const inject = (html) => html.replace('</head>', `<script>${harnessSource.replaceAll('</script>', '<\\/script>')}</script></head>`);
    const server = http.createServer((request, response) => {
        const url = new URL(request.url, 'http://127.0.0.1');
        if (url.pathname === '/favicon.ico') {
            response.writeHead(204);
            response.end();
            return;
        }
        let status = 404;
        let body = '<!doctype html><title>not found</title>';
        if (['/board/lists', '/mgallery/board/lists', '/mini/board/lists'].includes(url.pathname)) {
            const variant = url.pathname === '/board/lists' ? 'major' : url.pathname === '/mini/board/lists' ? 'mini' : 'minor';
            body = inject(p0aListPage({ variant }));
            status = 200;
        } else if (['/board/write', '/mgallery/board/write', '/mini/board/write'].includes(url.pathname)) {
            body = inject(p0aWritePage());
            status = 200;
        }
        response.writeHead(status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        response.end(body);
    });
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    return {
        baseUrl: `http://127.0.0.1:${server.address().port}`,
        close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    };
};

const waitReady = async (page) => {
    await page.waitForFunction(() => document.documentElement.classList.contains('script-ui-ready'), null, { timeout: 12000 });
    await page.waitForTimeout(220);
};

const visibleGeometry = async (locator, label) => {
    const result = await locator.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const points = [
            [rect.left + rect.width / 2, rect.top + rect.height / 2],
            [rect.left + 2, rect.top + 2],
            [rect.right - 2, rect.top + 2],
            [rect.left + 2, rect.bottom - 2],
            [rect.right - 2, rect.bottom - 2]
        ];
        return {
            rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
            viewport: { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight },
            hits: points.map(([x, y]) => {
                const target = document.elementFromPoint(x, y);
                return target === element || element.contains(target);
            })
        };
    });
    assert.equal(result.rect.width > 0 && result.rect.height > 0, true, `${label}: ${JSON.stringify(result)}`);
    assert.equal(result.rect.left >= 0 && result.rect.top >= 0 && result.rect.right <= result.viewport.width && result.rect.bottom <= result.viewport.height, true, `${label}: ${JSON.stringify(result)}`);
    assert.equal(result.hits.every(Boolean), true, `${label}: ${JSON.stringify(result)}`);
};

const listContracts = async (page, baseUrl) => {
    await page.setViewportSize({ width: 1100, height: 720 });
    await page.goto(`${baseUrl}/mgallery/board/lists?id=test`, { waitUntil: 'domcontentloaded' });
    await waitReady(page);

    const ownerState = await page.evaluate(() => ({
        ownerStyle: Boolean(document.getElementById('dcuf-final-surface-theme')),
        legacyListStyle: Boolean(document.getElementById('dcuf-phase1-list-theme')),
        emergencyStyle: Boolean(document.getElementById('dcuf-live-surface-owner')),
        palettePruned: document.getElementById('dcuf-mobile-palette-style')?.dataset.dcufSurfacePruned || '',
        owners: window.__dcufSurfaceOwners,
        errors: window.__dcufSurfaceOwnerPruneErrors || []
    }));
    assert.equal(ownerState.ownerStyle, true, JSON.stringify(ownerState));
    assert.equal(ownerState.legacyListStyle, false, JSON.stringify(ownerState));
    assert.equal(ownerState.emergencyStyle, false, JSON.stringify(ownerState));
    assert.equal(Boolean(ownerState.palettePruned), true, JSON.stringify(ownerState));
    assert.deepEqual(ownerState.errors, [], JSON.stringify(ownerState));
    assert.equal(ownerState.owners.headerRecent, 'dcuf-final-surface-theme');
    assert.equal(ownerState.owners.list, 'dcuf-final-surface-theme');
    assert.equal(ownerState.owners.write, 'dcuf-final-surface-theme');
    assert.equal(ownerState.owners.nativeLayer, 'dcuf-final-surface-theme');
    pass('runtime retires competing header/list/write/native visual owners');

    const header = await page.locator('.dcheader.typea .dchead').evaluate((element) => {
        const links = element.querySelector('.area_links');
        const style = getComputedStyle(links);
        const rects = [...links.children].map((child) => child.getBoundingClientRect());
        return {
            display: style.display,
            wrap: style.flexWrap,
            whiteSpace: style.whiteSpace,
            linkTopSpread: rects.length ? Math.max(...rects.map((rect) => rect.top)) - Math.min(...rects.map((rect) => rect.top)) : 0,
            overflow: links.scrollWidth > links.clientWidth + 1
        };
    });
    assert.equal(header.display, 'flex', JSON.stringify(header));
    assert.equal(header.wrap, 'nowrap', JSON.stringify(header));
    assert.equal(header.linkTopSpread < 2, true, JSON.stringify(header));
    pass('logged-in header action rail remains one line');

    const recentTitles = await page.evaluate(() => [...document.querySelectorAll('#visit_history>.newvisit_history>:is(.vst_title,.bookmark_title)')].map((node) => ({ hidden: node.hidden, display: getComputedStyle(node).display })));
    assert.equal(recentTitles.filter((item) => !item.hidden && item.display !== 'none').length, 1, JSON.stringify(recentTitles));
    const recentBorder = await page.locator('#visit_history>.newvisit_history').evaluate((element) => getComputedStyle(element).borderBottomWidth);
    assert.notEqual(recentBorder, '0px', 'outer recent rail lost its owned shell');
    pass('recent/favorite state shows one label inside one owned shell');

    const headtextGeometry = await page.evaluate(() => {
        const list = document.querySelector('.center_box>.inner>ul:not(#subject_morelist)').getBoundingClientRect();
        const button = document.querySelector('.btn_subject_more').getBoundingClientRect();
        return { overlap: list.left < button.right && button.left < list.right && list.top < button.bottom && button.top < list.bottom, list, button };
    });
    assert.equal(headtextGeometry.overlap, false, JSON.stringify(headtextGeometry));
    pass('headtext rail and more button occupy separate grid tracks');

    const listShape = await page.evaluate(() => {
        const wrap = document.querySelector('.gall_listwrap');
        const bottom = wrap?.querySelector(':scope .custom-bottom-controls');
        const first = wrap?.querySelector('.custom-post-item');
        const meta = first?.querySelector('.post-title>.dcuf-title-meta');
        const title = first?.querySelector('.post-title-link');
        const metaRect = meta?.getBoundingClientRect();
        const titleRect = title?.getBoundingClientRect();
        return {
            bottomInside: Boolean(bottom),
            wrapRadius: getComputedStyle(wrap).borderRadius,
            rowRadius: first ? getComputedStyle(first).borderRadius : '',
            rowShadow: first ? getComputedStyle(first).boxShadow : '',
            metaRight: Boolean(metaRect && titleRect && metaRect.left >= titleRect.left),
            replyCount: meta?.querySelectorAll(':scope>.reply_num').length || 0,
            decorations: meta?.querySelectorAll(':scope>.dcuf-title-decoration').length || 0
        };
    });
    assert.equal(listShape.bottomInside, true, JSON.stringify(listShape));
    assert.equal(listShape.rowRadius, '0px', JSON.stringify(listShape));
    assert.equal(listShape.rowShadow, 'none', JSON.stringify(listShape));
    assert.equal(listShape.metaRight, true, JSON.stringify(listShape));
    assert.equal(listShape.replyCount, 1, JSON.stringify(listShape));
    assert.equal(listShape.decorations >= 2, true, JSON.stringify(listShape));
    pass('list rows stay flat and title metadata remains on the right');

    const recentBefore = await page.locator('.newvisit_list').evaluate((element) => element.scrollLeft);
    await page.locator('.bnt_visit_next').click();
    await page.waitForTimeout(420);
    const recentAfter = await page.evaluate(() => ({
        left: document.querySelector('.newvisit_list').scrollLeft,
        nativeClicks: window.__fixtureRecentNativeClicks,
        prevented: window.__fixtureRecentNativeDefaultPrevented
    }));
    assert.equal(recentAfter.nativeClicks, 1, JSON.stringify(recentAfter));
    assert.deepEqual(recentAfter.prevented, [false], JSON.stringify(recentAfter));
    assert.equal(recentAfter.left > recentBefore, true, JSON.stringify({ recentBefore, recentAfter }));
    await page.evaluate(() => window.__dcufUIModule?.bindRecentVisitNavigation?.());
    await page.locator('.bnt_visit_prev').click();
    await page.waitForTimeout(420);
    assert.equal(await page.evaluate(() => window.__fixtureRecentNativeClicks), 2, 'duplicate recent listener detected');
    pass('native recent click survives and fallback scroll binds only once');

    await page.locator('.btn_manage').click();
    await page.locator('#pop_manage_report_list').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#pop_manage_report_list').evaluate((element) => element.parentElement === document.body), true);
    for (const action of await page.locator('#pop_manage_report_list .popup_action').all()) await visibleGeometry(action, 'management popup action');
    pass('management popup keeps original node and five-point reachability');
};

const writeContracts = async (page, baseUrl) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/mgallery/board/write?id=test`, { waitUntil: 'domcontentloaded' });
    await waitReady(page);

    const formContract = await page.locator('form#write').evaluate((form) => ({
        method: form.method,
        action: new URL(form.action).pathname,
        hiddenId: form.querySelector('input[type="hidden"][name="id"]')?.value,
        order: [...form.children].map((child) => {
            if (child.matches('.write_subject')) return 'subject';
            if (child.matches('.editor_wrap')) return 'editor';
            if (child.matches('.ai_quick_register,.ai_easy_wrap,.ai_easy_box')) return 'ai';
            if (child.matches('.write_option')) return 'options';
            if (child.matches('.btn_box.write')) return 'actions';
            return child.className || child.tagName;
        })
    }));
    assert.equal(formContract.method, 'post');
    assert.equal(formContract.action, '/__testbed/write-submit');
    assert.equal(formContract.hiddenId, 'test');
    assert.equal(formContract.order.indexOf('subject') < formContract.order.indexOf('editor'), true, JSON.stringify(formContract));
    assert.equal(formContract.order.indexOf('editor') < formContract.order.indexOf('ai'), true, JSON.stringify(formContract));
    assert.equal(formContract.order.indexOf('ai') < formContract.order.indexOf('actions'), true, JSON.stringify(formContract));
    pass('write form lifecycle and subject-editor-AI-actions order are preserved');

    const toolbar = await page.locator('[data-fixture-toolbar]').evaluate((element) => {
        const style = getComputedStyle(element);
        return {
            wrap: style.flexWrap,
            overflowX: style.overflowX,
            oneRow: element.scrollHeight <= element.clientHeight + 1,
            scrollable: element.scrollWidth > element.clientWidth
        };
    });
    assert.equal(toolbar.wrap, 'nowrap', JSON.stringify(toolbar));
    assert.equal(['auto', 'scroll'].includes(toolbar.overflowX), true, JSON.stringify(toolbar));
    assert.equal(toolbar.oneRow, true, JSON.stringify(toolbar));
    assert.equal(toolbar.scrollable, true, JSON.stringify(toolbar));
    pass('mobile editor toolbar remains one horizontal touch-scroll rail');

    for (const selector of ['.ai_loading', '.ai_file_input', '.ai_image_control', '.ai_character_control', '.ai_layer_button', '.ai_prompt', '.ai_count', '.ai_native_close', '.ai_settings_button']) {
        assert.equal(await page.locator(selector).count(), 1, selector);
    }
    const closeStyle = await page.locator('.ai_native_close').evaluate((element) => ({ position: getComputedStyle(element).position, width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height }));
    assert.notEqual(closeStyle.position, 'absolute', JSON.stringify(closeStyle));
    assert.equal(closeStyle.width > 0 && closeStyle.height > 0, true, JSON.stringify(closeStyle));
    await page.locator('.ai_settings_button').click();
    await visibleGeometry(page.locator('.ai_settings_popup'), 'AI settings popup');
    pass('AI quick-registration controls and native close remain usable');
};

const main = async () => {
    const { text, sha256 } = await buildRuntime();
    await staticContracts(text);
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
    const server = await startServer(harnessSource);
    const browser = await launchBrowser();
    const context = await browser.newContext({ viewport: { width: 1100, height: 720 } });
    const page = await context.newPage();
    const errors = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', (error) => errors.push(error.stack || error.message));

    try {
        await listContracts(page, server.baseUrl);
        await writeContracts(page, server.baseUrl);
        assert.deepEqual(errors, [], `P1 runtime errors:\n${errors.join('\n')}`);
        process.stdout.write(`P1 result: ${results.length} passed, 0 failed\nP1 runtime SHA-256: ${sha256}\n`);
    } finally {
        await context.close();
        await browser.close();
        await server.close();
    }
};

main().catch((error) => {
    console.error('[P1] runner failed:', error?.stack || error);
    process.exitCode = 1;
});
