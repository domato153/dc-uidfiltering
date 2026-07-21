import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadHarnessSource } from './userscript-loader.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('./playwright-loader.cjs');
const testbedDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const knownBrowsers = [
    process.env.DCUF_BROWSER_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean);

export async function launchBrowser({ headed = false } = {}) {
    const executablePath = knownBrowsers.find((candidate) => {
        try { return require('node:fs').existsSync(candidate); } catch { return false; }
    });
    const options = { headless: !headed, args: ['--disable-background-timer-throttling'] };
    if (executablePath) options.executablePath = executablePath;
    return chromium.launch(options);
}

export async function createTestPage(browser, baseUrl, {
    storage = {},
    gmBehavior = {},
    boot = {},
    bfcacheVariant = 'current',
    viewport = { width: 1280, height: 900 },
    screen,
    deviceScaleFactor,
    hasTouch,
    isMobile
} = {}) {
    const contextOptions = { viewport };
    if (screen) contextOptions.screen = screen;
    if (deviceScaleFactor) contextOptions.deviceScaleFactor = deviceScaleFactor;
    if (typeof hasTouch === 'boolean') contextOptions.hasTouch = hasTouch;
    if (typeof isMobile === 'boolean') contextOptions.isMobile = isMobile;
    const context = await browser.newContext(contextOptions);
    const harnessSource = await loadHarnessSource({ storage, gmBehavior, boot, bfcacheVariant });
    await context.addInitScript({ content: harnessSource });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.stack || error.message));
    return {
        context,
        page,
        consoleErrors,
        async goto(pathname, { waitForReady = true } = {}) {
            await page.goto(`${baseUrl}${pathname}`, { waitUntil: 'domcontentloaded' });
            if (waitForReady) {
                await page.waitForFunction(() => document.documentElement.classList.contains('script-ui-ready'), null, { timeout: 12000 });
                await page.waitForTimeout(180);
            }
        },
        async close() { await context.close(); }
    };
}

export async function createRawPage(browser, baseUrl, { viewport = { width: 390, height: 844 } } = {}) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    return {
        context,
        page,
        async goto(pathname) {
            await page.goto(`${baseUrl}${pathname}`, { waitUntil: 'domcontentloaded' });
        },
        async close() { await context.close(); }
    };
}

export async function waitForSettled(page, timeout = 350) {
    await page.waitForTimeout(timeout);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

export async function getMetrics(page) {
    return page.evaluate(() => window.__dcufTestbedMetrics.snapshot());
}

export async function getDiagnostics(page) {
    return page.evaluate(() => window.__dcufDiagnostics?.snapshot?.() || null);
}

export async function waitForHidden(page, selector, timeout = 7000) {
    await page.waitForFunction((target) => {
        const element = document.querySelector(target);
        return element instanceof HTMLElement && element.style.display === 'none';
    }, selector, { timeout });
}

export async function waitForFiltered(page, selector, timeout = 7000) {
    await page.waitForFunction((target) => {
        const element = document.querySelector(target);
        if (!(element instanceof HTMLElement)) return false;
        return element.style.display === 'none'
            || element.getAttribute('data-dcuf-parent-filtered') === '1'
            || element.classList.contains('dcuf-parent-comment-filtered')
            || Boolean(element.querySelector(':scope > .dcuf-comment-placeholder'));
    }, selector, { timeout });
}

export function assertNoRuntimeErrors(metrics, consoleErrors = []) {
    const ignored = [/favicon/i];
    const relevantConsole = consoleErrors.filter((message) => !ignored.some((pattern) => pattern.test(message)));
    assert.deepEqual(metrics.errors, [], `window errors: ${metrics.errors.join('\n')}`);
    assert.deepEqual(relevantConsole, [], `console errors: ${relevantConsole.join('\n')}`);
}

export const storageKeys = Object.freeze({
    masterDisabled: 'dcinside_master_disabled',
    threshold: 'dcinside_threshold',
    ratioEnabled: 'dcinside_ratio_filter_enabled',
    proxyBlockMode: 'dcinside_proxy_ip_block_enabled',
    telecomBlockEnabled: 'dcinside_telecom_ip_block_enabled',
    personalList: 'dcinside_personal_block_list',
    personalEnabled: 'dcinside_personal_block_enabled',
    blockedUids: 'dcinside_blocked_uids',
    blockedGuests: 'dcinside_blocked_guests',
    shortcut: 'dcinside_shortcut_key',
    fabScalePercent: 'dcinside_fab_scale_percent',
    palette: 'dcuf_mobile_ui_palette',
    headtextBlocks: 'dcinside_gallery_headtext_blocks_v1',
    convenience: 'dcuf_mobile_convenience_settings_v1',
    drafts: 'dcuf_mobile_write_drafts_v1'
});

export { assert, testbedDir };
