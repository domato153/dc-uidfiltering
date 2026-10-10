import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, writeFile, appendFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256, verifyPackage } from '../tools/prepare-live-extension.mjs';
import { selectCases, caseVerdict, reportVerdict } from './harness/live-site-contract.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { chromium } = require('./harness/playwright-loader.cjs');
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const output = path.resolve(root, option('--output', 'testbed/artifacts/live-site-canary'));
assert.ok(output.startsWith(path.join(root, 'testbed/artifacts') + path.sep), 'Evidence must stay in testbed/artifacts');
const suite = option('--suite', 'smoke');
const headed = args.includes('--headed');
const git = (...values) => {
    const result = spawnSync('git', values, { cwd: root, encoding: 'utf8', shell: false });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
};
const report = { schemaVersion: 1, kind: 'actual-tampermonkey-desktop-startup-canary',
    startedAt: new Date().toISOString(), suite, status: 'UNAVAILABLE', profiles: {}, results: [],
    environment: { platform: process.platform, node: process.version, playwright: require('playwright/package.json').version,
        browser: 'Playwright bundled full Chromium / Chrome for Testing; not headless-shell', headed,
        desktopUA: true, isMobile: false, viewport: { width: 1280, height: 900 }, theme: 'fresh default/light', authenticated: false,
        provider: process.env.GITHUB_ACTIONS === 'true' ? 'github-hosted' : 'local',
        githubRun: process.env.GITHUB_RUN_ID || null, githubAttempt: process.env.GITHUB_RUN_ATTEMPT || null },
    scope: 'Read-only desktop startup, rendered list/article, title hit and focus. Not full-feature or release acceptance.' };
await mkdir(output, { recursive: true });
const boundedError = error => String(error?.message || error).split('\n')[0].slice(0, 300);
async function files(directory) {
    const result = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const location = path.join(directory, entry.name);
        if (entry.isDirectory()) result.push(...await files(location));
        else { assert.ok(entry.isFile(), 'Extension symlinks are forbidden'); result.push(location); }
    }
    return result;
}
async function until(check, label, timeout = 20000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        const value = await check();
        if (value) return value;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Timed out: ${label}`);
}

async function install(context, worker, extensionId, bytes) {
    const page = await context.newPage();
    await page.goto(`chrome://extensions/?id=${extensionId}`);
    const allowed = page.locator('#allow-user-scripts');
    await allowed.waitFor({ state: 'visible' });
    if (!(await allowed.evaluate(node => node.checked))) await allowed.click();
    await until(() => worker.evaluate(() => Boolean(chrome.userScripts)), 'Allow User Scripts');
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.getByText('Utilities', { exact: true }).click();
    let served = 0;
    const server = createServer((req, res) => {
        if (req.url !== '/dcuf.user.js' || req.method !== 'GET') { res.writeHead(404); res.end(); return; }
        served++;
        res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' });
        res.end(bytes);
    });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    try {
        // The pinned vendor's public Utilities UI fetches and installs the exact localhost bytes.
        // No eval, addInitScript, GM shim, private extension RPC, or storage seeding is used.
        await page.locator('#input_dXRpbHNfdXRpbHM_url').fill(`http://127.0.0.1:${server.address().port}/dcuf.user.js`);
        await page.locator('#input_dXRpbHNfdXRpbHNfaV91cmw_bu').click();
        const ask = await until(() => context.pages().find(p => p.url().startsWith(`chrome-extension://${extensionId}/ask.html?`)), 'Tampermonkey installer');
        await ask.getByText('DC_UserFilter_Mobile', { exact: true }).waitFor();
        const version = bytes.toString('utf8').match(/^\/\/\s*@version\s+(\S+)/m)?.[1];
        assert.ok(version && (await ask.locator('body').innerText()).includes(`v${version}`), 'Wrong install metadata');
        await ask.locator('input[type="button"][value="Install"]').click();
        await until(() => ask.isClosed(), 'Install confirmation closure');
        await page.goto(`chrome-extension://${extensionId}/options.html`);
        await page.getByText('Installed Userscripts', { exact: true }).click();
        await page.getByText('DC_UserFilter_Mobile', { exact: true }).waitFor();
        assert.equal(await page.getByText('DC_UserFilter_Mobile', { exact: true }).count(), 1, 'Exactly one script per profile');
        assert.ok(served > 0, 'Installer did not fetch the exact script');
        const registration = await until(async () => {
            const entries = await worker.evaluate(async () => (await chrome.userScripts.getScripts()).map(s => ({ runAt: s.runAt, world: s.world || null })));
            return entries.some(s => s.runAt === 'document_start') && entries;
        }, 'document-start userScripts registration');
        await page.close();
        return { installed: true, version, servedSha256: sha256(bytes), userScriptsAllowed: true,
            registeredAtDocumentStart: true, registrations: registration,
            installMethod: 'Tampermonkey Utilities / Import from URL / Install confirmation', settings: 'fresh profile defaults; no private import' };
    } finally { await new Promise(resolve => server.close(resolve)); }
}

async function observe(context, role, testCase) {
    const result = { role, id: testCase.id, url: testCase.url, startedAt: new Date().toISOString(), checks: {} };
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(boundedError(error)));
    page.on('console', msg => { if (msg.type() === 'error' && /DCUF|DCinside User Filter/i.test(msg.text())) errors.push(boundedError(msg.text())); });
    try {
        const response = await page.goto(testCase.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        result.httpStatus = response?.status() || null;
        if (result.httpStatus !== 200) { result.unavailable = 'environment-live: non-200 public page'; return result; }
        if (new URL(page.url()).origin !== 'https://gall.dcinside.com' || new URL(page.url()).pathname !== new URL(testCase.url).pathname) {
            result.unavailable = 'environment-live: unexpected redirect'; return result;
        }
        // This marker is written by the installed userscript, never by this driver.
        await page.waitForFunction(() => document.documentElement.classList.contains('script-ui-ready'), null, { timeout: 20000 });
        const initialPanel = page.locator('#dcinside-filter-setting');
        if (await initialPanel.isVisible()) {
            await page.locator('#dcinside-filter-close').click();
            await initialPanel.waitFor({ state: 'detached' });
            result.initialSettingsDismissed = true;
        }
        await page.locator('.custom-mobile-list .custom-post-item:visible').first().waitFor({ timeout: 15000 });
        result.state = await page.evaluate(kind => {
            const positive = node => { const box = node?.getBoundingClientRect(); return Boolean(box && box.width > 0 && box.height > 0 && getComputedStyle(node).visibility !== 'hidden' && getComputedStyle(node).display !== 'none'); };
            const rows = [...document.querySelectorAll('.custom-mobile-list .custom-post-item')];
            const content = document.querySelector('.gallview_contents, .writing_view_box');
            return { ready: document.documentElement.classList.contains('script-ui-ready'),
                hostPresent: Boolean(document.querySelector('#container .gall_listwrap, #container .view_content_wrap')),
                hostRowCount: document.querySelectorAll('tr.ub-content').length,
                mirrorRowCount: rows.length, visibleRows: rows.filter(positive).length,
                articleVisible: kind !== 'view' || positive(content),
                userAgent: navigator.userAgent, viewport: [innerWidth, innerHeight],
                gmShimPresent: Boolean(window.__dcufTestbedGM) };
        }, testCase.kind);
        const title = page.locator('.custom-mobile-list .custom-post-item:visible a[href*="/board/view/"]').first();
        await title.scrollIntoViewIfNeeded();
        result.hit = await title.evaluate(node => {
            const r = node.getBoundingClientRect();
            const points = [.25, .5, .75].map(f => ({ x: r.left + r.width * f, y: r.top + r.height / 2 }));
            return { positive: r.width > 0 && r.height > 0,
                hits: points.map(p => { const hit = document.elementFromPoint(p.x, p.y); return hit === node || node.contains(hit); }) };
        });
        // Native browser keyboard focus, without navigating to or modifying content.
        await title.focus();
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        const focused = await title.evaluate(node => document.activeElement === node);
        result.dcufErrorCount = errors.filter(message => /DCUF|DCinside User Filter|userscript/i.test(message)).length;
        result.otherPageErrorCount = errors.length - result.dcufErrorCount;
        result.checks = { desktopEnvironment: result.state.viewport[0] === 1280 && result.state.viewport[1] === 900
                && !/Mobile|Android|iPhone/.test(result.state.userAgent),
            extensionExecuted: result.state.ready && !result.state.gmShimPresent,
            hostPresent: result.state.hostPresent, rowsVisible: result.state.hostRowCount > 0 && result.state.visibleRows > 0,
            titleHit: result.hit.positive && result.hit.hits.every(Boolean), keyboardFocus: focused,
            articleVisible: result.state.articleVisible, noScriptErrors: result.dcufErrorCount === 0 };
        result.screenshot = `${role}-${testCase.id}.png`;
        await page.screenshot({ path: path.join(output, result.screenshot), fullPage: false });
    } catch (error) {
        result.failure = boundedError(error);
        result.failureClass = result.httpStatus === 200 ? 'product-runtime-or-host-drift' : 'environment-live';
        if (result.httpStatus !== 200) result.unavailable = result.failure;
        result.screenshot = `${role}-${testCase.id}-failure.png`;
        await page.screenshot({ path: path.join(output, result.screenshot) }).catch(() => { delete result.screenshot; });
    } finally { await page.close(); result.finishedAt = new Date().toISOString(); result.status = caseVerdict(result); }
    return result;
}

try {
    const contractBytes = await readFile(path.join(root, 'verification/live-site-canary.json'));
    const contract = JSON.parse(contractBytes);
    const cases = selectCases(contract, suite);
    report.selectedCases = cases.map(c => c.id);
    report.unselected = [...contract.unselected, ...selectCases(contract, 'full').filter(c => !report.selectedCases.includes(c.id)).map(c => c.id)];
    const candidate = await readFile(path.join(root, contract.candidatePath));
    const control = await readFile(path.join(root, contract.control.path));
    assert.match(candidate.toString('utf8'), /^\/\/\s*@name\s+DC_UserFilter_Mobile\s*$/m, 'Guarded mobile runtime required');
    assert.equal(sha256(control), contract.control.sha256, 'Published control hash mismatch');
    const receipt = JSON.parse(await readFile(path.join(root, 'testbed/artifacts/live-site-extension/extension-receipt.json')));
    assert.equal(receipt.pinned, true, 'Discovery package cannot be tested as a pinned extension');
    const verified = verifyPackage(await readFile(receipt.packagePath), contract.extension);
    report.binding = { head: git('rev-parse', 'HEAD'), branch: git('branch', '--show-current'), dirty: Boolean(git('status', '--porcelain')),
        candidatePath: path.join(root, contract.candidatePath), candidateSha256: sha256(candidate), controlSha256: sha256(control),
        extensionSha256: contract.extension.sha256, extensionVersion: verified.manifest.version,
        contractSha256: sha256(contractBytes), driverSha256: sha256(await readFile(fileURLToPath(import.meta.url))),
        contractDriverSha256: sha256(await readFile(path.join(root, 'testbed/harness/live-site-contract.mjs'))) };
    console.log(`Actual-extension desktop canary: ${report.binding.candidatePath}\nCandidate SHA-256: ${report.binding.candidateSha256}`);
    for (const [role, bytes] of [['control', control], ['candidate', candidate]]) {
        // Chromium removes Web Store verification metadata when loading unpacked packages.
        // Re-extract the pinned CRX into a fresh directory for each profile, not a reused browser-mutated copy.
        const extensionDirectory = await mkdtemp(path.join(root, 'testbed/artifacts/live-site-extension/run-'));
        for (const [name, content] of verified.entries) {
            const target = path.resolve(extensionDirectory, name);
            assert.ok(target.startsWith(extensionDirectory + path.sep));
            await mkdir(path.dirname(target), { recursive: true });
            await writeFile(target, content);
            assert.deepEqual(await readFile(target), content, 'Vendor extraction mismatch');
        }
        assert.equal((await files(extensionDirectory)).length, verified.entries.size, 'Unexpected extension files');
        const profile = await mkdtemp(path.join(os.tmpdir(), 'dcuf-live-'));
        const context = await chromium.launchPersistentContext(profile, { channel: 'chromium', headless: !headed,
            viewport: { width: 1280, height: 900 }, locale: 'en-US', colorScheme: 'light',
            ignoreDefaultArgs: ['--disable-extensions'],
            args: ['--lang=en-US', `--disable-extensions-except=${extensionDirectory}`, `--load-extension=${extensionDirectory}`] });
        try {
            report.environment.browserVersion = context.browser().version();
            const worker = context.serviceWorkers().find(w => w.url().startsWith('chrome-extension://'))
                || await context.waitForEvent('serviceworker', { timeout: 20000 });
            const extensionId = new URL(worker.url()).hostname;
            assert.equal(await worker.evaluate(() => chrome.runtime.getManifest().version), contract.extension.version);
            report.profiles[role] = { ...await install(context, worker, extensionId, bytes), extensionId, isolated: true };
            for (const testCase of cases) {
                const result = await observe(context, role, testCase);
                report.results.push(result);
                console.log(`${role}/${result.id}: ${result.status}${result.failure ? ' — ' + result.failure : ''}`);
                await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
            }
        } finally {
            await context.close();
            // Only this invocation's freshly allocated temporary profile is removed.
            assert.equal(path.dirname(profile), path.resolve(os.tmpdir()));
            assert.ok(path.basename(profile).startsWith('dcuf-live-'));
            await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
        }
    }
} catch (error) { report.setupFailure = boundedError(error); console.error(`Canary unavailable: ${report.setupFailure}`); }
finally {
    report.finishedAt = new Date().toISOString();
    report.status = reportVerdict(report);
    await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    const summary = `Desktop actual-Tampermonkey canary: **${report.status}**\n\nCandidate: ${report.binding?.candidateSha256 || 'not bound'}\n\nSelected: ${(report.selectedCases || []).join(', ')}\n\n${report.results.map(r => `- ${r.role}/${r.id}: ${r.status}`).join('\n')}\n\nUnselected: ${(report.unselected || []).join(', ')}\n\n${report.setupFailure || ''}\n\n${report.scope}\n`;
    await writeFile(path.join(output, 'summary.md'), summary);
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
    console.log(`Desktop canary ${report.status}: ${path.join(output, 'report.json')}`);
    if (report.status !== 'PASS') process.exitCode = 1;
}
