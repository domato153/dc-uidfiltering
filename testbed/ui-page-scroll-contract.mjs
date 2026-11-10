import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { listPage, viewPage } from './fixtures/pages.mjs';
import { writePage } from './fixtures/write-pages.mjs';
import { assert, createTestPage, launchBrowser, storageKeys } from './harness/runner-utils.mjs';
import { resolveBuiltUserscript } from './harness/userscript-loader.mjs';

const runtime = path.resolve('testbed/artifacts/runtime-under-test.user.js');
assert.ok(process.argv.includes('--require-runtime-under-test'));
process.env.DCUF_TESTBED_USERSCRIPT ||= runtime;
assert.equal(await resolveBuiltUserscript(), runtime);
console.log(`Source runtime: ${runtime}; SHA-256 ${createHash('sha256').update(await readFile(runtime)).digest('hex')}`);

const origin = 'https://gall.dcinside.com';
const publicAssets = new Map(await Promise.all(['fixture.css', 'fixture-client.js'].map(async name => [
    `/__testbed/${name}`,
    { contentType: name.endsWith('.css') ? 'text/css' : 'text/javascript', body: await readFile(new URL(`./public/${name}`, import.meta.url)) }
])));
const toolbarSelector = '[data-dcuf-surface="list-toolbar"]';
const frame = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const browser = await launchBrowser();
const failures = [];
let passed = 0;

async function run(name, { route, html, width = 1660, touch = false, boot, beforeReady, check }) {
    const session = await createTestPage(browser, origin, {
        viewport: { width, height: 720 }, hasTouch: touch, boot,
        storage: { [storageKeys.threshold]: 0, [storageKeys.ratioEnabled]: false }
    });
    const { page } = session;
    page.setDefaultTimeout(6000);
    try {
        await page.route('**/*', request => {
            const url = new URL(request.request().url());
            if (url.origin === origin && url.pathname === route.split('?')[0] && request.request().isNavigationRequest()) {
                return request.fulfill({ contentType: 'text/html; charset=utf-8', body: html });
            }
            return request.fulfill(publicAssets.get(url.pathname) ?? { contentType: 'application/json', body: '{}' });
        });
        await session.goto(route, { waitForReady: false });
        await beforeReady?.(page);
        await page.locator('html[data-dcuf-boot-state="ready"]').waitFor({ state: 'attached', timeout: 8000 });
        await check(page);
        console.log(`PASS ${name}`);
        passed += 1;
    } catch (error) {
        failures.push(name);
        console.error(`FAIL ${name}: ${error.message}`);
    } finally {
        await session.close();
    }
}

const lists = [
    ['major', '/board/lists?id=test', 1660, false, 18],
    ['minor', '/mgallery/board/lists?id=test', 980, true, 22],
    ['mini', '/mini/board/lists?id=test', 390, true, 18]
];
const constrainedPage = html => html.replace('</head>', '<style>html{height:calc(100vh + 330px)} body{height:100vh}</style></head>')
    .replace('</body>', '<div data-test-scroll-end style="height:1000px"></div></body>');

async function checkDocumentScroll(page) {
    await page.mouse.move(250, 420);
    await page.mouse.wheel(0, 250);
    await page.waitForFunction(() => window.scrollY > 0 || document.body.scrollTop > 0);
    const position = await page.evaluate(() => ({ page: window.scrollY, body: document.body.scrollTop }));
    assert.ok(position.page > 0 && position.body === 0, JSON.stringify(position));
    // Give the floating toolbar and the native bottom controls a frame to
    // settle before checking whether a further wheel opens any empty range.
    await page.evaluate(async () => {
        const root = document.scrollingElement;
        const samples = [];
        for (let attempt = 0; attempt < 24; attempt += 1) {
            const height = root.scrollHeight;
            window.scrollTo(0, height);
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            samples.push({ height, after: root.scrollHeight, y: root.scrollTop, client: root.clientHeight, viewport: window.innerHeight });
            if (root.scrollHeight === height && Math.abs(root.scrollTop + root.clientHeight - height) <= 1) return;
        }
        throw new Error(`Document never reached a stable bottom: ${JSON.stringify(samples)}`);
    });
    const endY = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 400);
    await frame(page);
    const bottom = await page.evaluate(() => ({
        y: window.scrollY,
        body: document.body.scrollTop,
        gap: window.innerHeight - document.querySelector('[data-test-scroll-end]').getBoundingClientRect().bottom
    }));
    assert.ok(Math.abs(bottom.y - endY) <= 1 && bottom.body === 0 && bottom.gap <= 2, JSON.stringify({ endY, ...bottom }));
}

try {
    for (const [variant, route, width, touch, expectedSize] of lists) {
        await run(`${variant} list document scroll`, {
            route, html: constrainedPage(listPage({ variant })), width, touch, check: checkDocumentScroll
        });
        await run(`${variant} list title size`, {
            route, html: listPage({ variant }), width, touch,
            check: async page => {
                const title = page.locator('.dcuf-list-title-link:visible').first();
                assert.equal(await title.evaluate(node => getComputedStyle(node).fontSize), `${expectedSize}px`);
            }
        });
    }
    await run('article document scroll', {
        route: '/board/view?id=test&no=1001', html: constrainedPage(viewPage()), check: checkDocumentScroll
    });
    await run('writer document scroll', {
        route: '/mgallery/board/write?id=test', html: constrainedPage(writePage({ variant: 'minor' })), check: checkDocumentScroll
    });
    await run('floating toolbar returns after late layout growth', {
        route: '/mini/board/lists?id=test', html: listPage({ variant: 'mini' }),
        check: async page => {
            const toolbar = page.locator(toolbarSelector);
            await toolbar.evaluate(node => {
                window.__originalTestToolbar = node;
                const late = document.createElement('div');
                late.style.height = '360px';
                document.querySelector('.page_head').before(late);
            });
            await page.evaluate(() => window.scrollTo(0, 870));
            await frame(page);
            assert.equal(await toolbar.getAttribute('data-dcuf-scroll'), 'hidden');
            await page.evaluate(() => window.scrollTo(0, 700));
            await frame(page);
            assert.equal(await toolbar.getAttribute('data-dcuf-scroll'), 'shown');
            await page.evaluate(() => window.scrollTo(0, 450));
            await frame(page);
            assert.equal(await toolbar.getAttribute('data-dcuf-scroll'), 'top');
            const geometry = await toolbar.evaluate(node => ({
                sameNode: node === window.__originalTestToolbar,
                gap: node.getBoundingClientRect().top - document.querySelector('.page_head').getBoundingClientRect().bottom,
                y: window.scrollY
            }));
            assert.ok(geometry.sameNode && geometry.gap >= -1 && geometry.y === 450, JSON.stringify(geometry));
        }
    });
    const delayedToolbarHtml = listPage({ variant: 'mini' }).replace('</body>', `<script>
        window.__delayedTestToolbar = document.querySelector('.list_array_option');
        window.__delayedTestNext = window.__delayedTestToolbar.nextElementSibling;
        window.__delayedTestToolbar.remove();
    </script></body>`);
    await run('native toolbar is connected before the first normal reveal', {
        route: '/mini/board/lists?id=test', html: delayedToolbarHtml,
        beforeReady: async page => {
            await page.locator('.dcuf-list-title-link').first().waitFor({ state: 'attached' });
            await frame(page);
            const before = await page.evaluate(() => document.documentElement.dataset.dcufBootState);
            await page.evaluate(() => window.__delayedTestNext.before(window.__delayedTestToolbar));
            assert.equal(before, 'preparing');
        },
        check: async page => {
            const toolbar = page.locator(toolbarSelector);
            assert.equal(await toolbar.getAttribute('data-dcuf-scroll'), 'top');
            assert.equal(await toolbar.evaluate(node => node === window.__delayedTestToolbar), true);
        }
    });
    await run('a missing toolbar cannot stall the filtered list', {
        route: '/mini/board/lists?id=test', html: delayedToolbarHtml, boot: { criticalDeadlineMs: 2500 },
        check: async page => {
            assert.equal(await page.locator(toolbarSelector).count(), 0);
            assert.equal(await page.locator('.dcuf-list-title-link:visible').first().isVisible(), true);
            assert.equal(await page.evaluate(() => window.__dcufBootController.filterReady), true);
            assert.deepEqual(await page.evaluate(() => window.__dcufBootProbe.events().map(event => event.type)), ['ready']);
            await page.evaluate(() => window.scrollTo(0, 650));
            await frame(page);
            await page.evaluate(() => window.__delayedTestNext.before(window.__delayedTestToolbar));
            const toolbar = page.locator(toolbarSelector);
            await toolbar.waitFor({ state: 'attached' });
            assert.equal(await toolbar.evaluate(node => node === window.__delayedTestToolbar), true);
            assert.ok(await page.evaluate(() => window.scrollY > 400), 'Late toolbar must not reset reading position');
        }
    });
} finally {
    await browser.close();
}

assert.deepEqual(failures, []);
console.log(`Page scroll contract: ${passed} passed`);
