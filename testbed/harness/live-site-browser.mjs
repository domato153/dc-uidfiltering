import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { sha256 } from '../../tools/prepare-live-extension.mjs';

export function browserFlavor(value = 'chromium') {
    assert.ok(['chromium', 'installed-chrome'].includes(value), 'Unknown live browser');
    return value;
}

async function installedChrome() {
    assert.equal(process.platform, 'win32', 'Installed Chrome route is Windows-only');
    for (const base of [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean)) {
        const executable = path.join(base, 'Google/Chrome/Application/chrome.exe');
        try { await access(executable); return executable; } catch {}
    }
    throw new Error('Installed Google Chrome executable not found');
}

function ownedProcessExited(child) {
    if (!child?.pid || child.exitCode !== null || child.signalCode) return true;
    try { process.kill(child.pid, 0); return false; }
    catch (error) { return error.code === 'ESRCH'; }
}

async function waitForExit(child, timeout = 3000) {
    if (ownedProcessExited(child)) return;
    await new Promise(resolve => {
        const done = () => { clearTimeout(timer); clearInterval(poll); child.off('exit', done); resolve(); };
        const timer = setTimeout(done, timeout);
        const poll = setInterval(() => { if (ownedProcessExited(child)) done(); }, 100);
        child.once('exit', done);
    });
}

export async function closeOwnedBrowser({ cdp, browser, child }, gracefulTimeout = 3000) {
    let timer;
    const graceful = (async () => {
        if (cdp) await cdp.send('Browser.close').catch(() => {});
        if (browser) await browser.close().catch(() => {});
        await waitForExit(child, gracefulTimeout);
    })().catch(() => {});
    try {
        await Promise.race([graceful, new Promise(resolve => { timer = setTimeout(resolve, gracefulTimeout); })]);
    } finally {
        clearTimeout(timer);
    }
    if (child?.pid && child.exitCode === null && !child.signalCode) {
        child.kill();
        await waitForExit(child);
    }
    assert.ok(ownedProcessExited(child), 'Owned Chrome process failed to stop');
    // Windows can remove the process before Node receives its exit event.
    // Release only this child's pipes/handle after positive OS absence proof.
    if (child?.pid && child.exitCode === null && !child.signalCode) {
        child.stdout?.destroy();
        child.stderr?.destroy();
        child.unref();
    }
}

export async function launchLiveBrowser({ chromium, flavor, profile, extensionDirectory, headed }) {
    browserFlavor(flavor);
    if (flavor === 'chromium') {
        const context = await chromium.launchPersistentContext(profile, { channel: 'chromium', headless: !headed,
            viewport: { width: 1280, height: 900 }, locale: 'en-US', colorScheme: 'light',
            ignoreDefaultArgs: ['--disable-extensions'],
            args: ['--lang=en-US', `--disable-extensions-except=${extensionDirectory}`, `--load-extension=${extensionDirectory}`] });
        return { context, extensionId: null, metadata: { flavor, installRoute: 'startup-load-extension' }, close: () => context.close() };
    }

    // The installed browser avoids the failing Chrome-for-Testing executable.
    // CDP loads only the pinned vendor directory into this invocation's new profile;
    // no enterprise policy, existing profile, user storage or vendor code is changed.
    const executable = await installedChrome();
    const executableSha256 = sha256(await readFile(executable));
    let child, browser, cdp, cleaned = false, spawnFailure, stderr = '';
    const close = async () => {
        if (cleaned) return;
        await closeOwnedBrowser({ cdp, browser, child });
        cleaned = true;
    };
    try {
        child = spawn(executable, [!headed && '--headless=new', '--no-first-run', '--no-default-browser-check',
            '--lang=en-US', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'].filter(Boolean),
        { env: process.env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
        child.once('error', error => { spawnFailure = error; });
        child.stdout.on('data', () => {});
        child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-4000); });
        const deadline = Date.now() + 20000;
        let port;
        while (Date.now() < deadline) {
            if (spawnFailure) throw spawnFailure;
            if (child.exitCode !== null) throw new Error(`Installed Chrome exited ${child.exitCode}: ${stderr}`);
            try { port = Number((await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split(/\r?\n/)[0]); } catch {}
            if (Number.isInteger(port) && port > 0 && port <= 65535) break;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        assert.ok(Number.isInteger(port) && port > 0 && port <= 65535, 'Installed Chrome DevToolsActivePort timeout');
        browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: 10000 });
        cdp = await browser.newBrowserCDPSession();
        const { id } = await cdp.send('Extensions.loadUnpacked', { path: extensionDirectory });
        assert.match(id, /^[a-p]{32}$/, 'Missing loaded extension identity');
        const { extensions } = await cdp.send('Extensions.getExtensions');
        const extension = extensions.find(item => item.id === id);
        assert.ok(extension?.enabled, 'Loaded extension is not enabled');
        assert.equal(path.resolve(extension.path), path.resolve(extensionDirectory), 'Loaded wrong extension directory');
        const context = browser.contexts()[0];
        assert.ok(context, 'Missing isolated Chrome context');
        const newPage = context.newPage.bind(context);
        context.newPage = async () => {
            const page = await newPage();
            await page.setViewportSize({ width: 1280, height: 900 });
            await page.emulateMedia({ colorScheme: 'light' });
            return page;
        };
        return { context, extensionId: id, close, metadata: { flavor, executable, executableSha256,
            browserVersion: browser.version(), installRoute: 'CDP Extensions.loadUnpacked',
            extensionVersion: extension.version, registryChanged: false } };
    } catch (error) {
        await close();
        throw error;
    }
}
