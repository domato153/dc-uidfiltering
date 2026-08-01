import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import http from 'node:http';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { p1ListPage, p1WritePage } from './fixtures/p1-live-contracts.mjs';
import { launchBrowser } from './harness/runner-utils.mjs';

const execFileAsync = promisify(execFile);
const testbedDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(testbedDir, '..');
const runtimePath = path.join(testbedDir, 'artifacts', 'p1-fidelity-runtime.user.js');

const buildRuntime = async () => {
    await mkdir(path.dirname(runtimePath), { recursive: true });
    await execFileAsync(process.execPath, [path.join(rootDir, 'tools', 'build-userscript.mjs'), '--testbed-output', runtimePath], {
        cwd: rootDir,
        windowsHide: true
    });
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
        const write = url.pathname.endsWith('/write');
        const body = write ? inject(p1WritePage()) : inject(p1ListPage({ variant: 'minor' }));
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
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

const ready = async (page) => {
    await page.waitForFunction(() => document.documentElement.classList.contains('script-ui-ready'), null, { timeout: 12000 });
    await page.waitForTimeout(220);
};

const main = async () => {
    await buildRuntime();
    process.env.DCUF_TESTBED_USERSCRIPT = path.relative(rootDir, runtimePath);
    const { loadHarnessSource } = await import('./harness/userscript-loader.mjs');
    const harnessSource = await loadHarnessSource({ storage: { dcinside_threshold: 0 } });
    const server = await startServer(harnessSource);
    const browser = await launchBrowser();
    const context = await browser.newContext({ viewport: { width: 1100, height: 720 } });
    const page = await context.newPage();
    const errors = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', (error) => errors.push(error.stack || error.message));

    try {
        await page.goto(`${server.baseUrl}/mgallery/board/lists?id=test`, { waitUntil: 'domcontentloaded' });
        await ready(page);
        const desktopRail = await page.locator('[data-fixture-login-rail]').evaluate((rail) => {
            const style = getComputedStyle(rail);
            const children = [...rail.children].map((child) => child.getBoundingClientRect());
            return {
                count: children.length,
                wrap: style.flexWrap,
                topSpread: Math.max(...children.map((rect) => rect.top)) - Math.min(...children.map((rect) => rect.top)),
                railHeight: rail.getBoundingClientRect().height,
                maxChildHeight: Math.max(...children.map((rect) => rect.height))
            };
        });
        assert.equal(desktopRail.count, 5, JSON.stringify(desktopRail));
        assert.equal(desktopRail.wrap, 'nowrap', JSON.stringify(desktopRail));
        assert.equal(desktopRail.topSpread < 2, true, JSON.stringify(desktopRail));
        assert.equal(desktopRail.railHeight <= desktopRail.maxChildHeight + 4, true, JSON.stringify(desktopRail));
        process.stdout.write('PASS full logged-in header rail does not wrap\n');

        await page.setViewportSize({ width: 390, height: 844 });
        const mobileRail = await page.locator('[data-fixture-login-rail]').evaluate((rail) => ({
            wrap: getComputedStyle(rail).flexWrap,
            overflowX: getComputedStyle(rail).overflowX,
            scrollable: rail.scrollWidth >= rail.clientWidth
        }));
        assert.equal(mobileRail.wrap, 'nowrap', JSON.stringify(mobileRail));
        assert.equal(['auto', 'scroll'].includes(mobileRail.overflowX), true, JSON.stringify(mobileRail));
        process.stdout.write('PASS narrow logged-in header rail scrolls instead of wrapping\n');

        await page.goto(`${server.baseUrl}/mgallery/board/write?id=test`, { waitUntil: 'domcontentloaded' });
        await ready(page);
        const pum = await page.locator('#btn_pumx').evaluate((button) => {
            const pseudo = getComputedStyle(button, '::after');
            return {
                originalNode: button.tagName === 'BUTTON',
                active: button.classList.contains('on') && button.getAttribute('aria-pressed') === 'true',
                content: pseudo.content,
                width: pseudo.width,
                height: pseudo.height,
                borderRight: pseudo.borderRightWidth,
                borderBottom: pseudo.borderBottomWidth,
                transform: pseudo.transform
            };
        });
        assert.equal(pum.originalNode, true, JSON.stringify(pum));
        assert.equal(pum.active, true, JSON.stringify(pum));
        assert.equal(pum.content === '""' || pum.content === "''", true, JSON.stringify(pum));
        assert.notEqual(pum.transform, 'none', JSON.stringify(pum));
        assert.notEqual(pum.borderRight, '0px', JSON.stringify(pum));
        assert.notEqual(pum.borderBottom, '0px', JSON.stringify(pum));
        process.stdout.write('PASS PUMX keeps native button with a conventional checked mark\n');

        assert.deepEqual(errors, [], `P1 fidelity runtime errors:\n${errors.join('\n')}`);
        process.stdout.write('P1 fidelity result: 3 passed, 0 failed\n');
    } finally {
        await context.close();
        await browser.close();
        await server.close();
    }
};

main().catch((error) => {
    console.error('[P1 fidelity] runner failed:', error?.stack || error);
    process.exitCode = 1;
});
