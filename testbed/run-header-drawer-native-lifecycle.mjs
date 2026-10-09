import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {startServer} from './server/server.mjs';
import {createTestPage, launchBrowser, getMetrics, assertNoRuntimeErrors} from './harness/runner-utils.mjs';
import {exerciseNativeLifecycle} from './header-drawer-native-contract.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
assert.ok(process.argv.includes('--require-runtime-under-test'), 'Guarded source runtime required');
const runtime = path.join(root, 'testbed/artifacts/runtime-under-test.user.js');
process.env.DCUF_TESTBED_USERSCRIPT = runtime;
process.env.DCUF_TESTBED_TARGET = 'mobile';
const outputIndex = process.argv.indexOf('--output');
assert.ok(outputIndex >= 0 && process.argv[outputIndex + 1] && !process.argv[outputIndex + 1].startsWith('--'), 'Output path required');
const output = path.resolve(root, process.argv[outputIndex + 1]);
const bytes = await readFile(runtime);
const sha = value => createHash('sha256').update(value).digest('hex').toUpperCase();
console.log(`Native lifecycle candidate: ${runtime}; SHA-256 ${sha(bytes)}`);
const adapter = await readFile(path.join(root, 'src/targets/mobile/header-drawer-host-adapter.js'), 'utf8');
const canonical = text => text.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').trimEnd();
assert.ok(canonical(bytes.toString()).includes(canonical(adapter)), 'Built adapter drift');
const report = {status: 'PARTIAL', kind: 'native-drawer-lifecycle', scope: 'BOUNDED_SYNTHETIC_NOT_STAGE_ACCEPTANCE',
    runtime: {path: runtime, sha256: sha(bytes)}, adapterSha256: sha(adapter),
    observerSha256: sha(await readFile(fileURLToPath(import.meta.url))),
    contractSha256: sha(await readFile(new URL('./header-drawer-native-contract.mjs', import.meta.url)))};
const server = await startServer();
let browser, session;
const settle = page => page.waitForFunction(() => {
    const m = window.__dcufTestbedMetrics.snapshot();
    return m.activeTimeouts === 0 && m.activeAnimationFrames === 0 && m.activeIntervals === 0
        && document.getAnimations().every(animation => animation.playState !== 'running');
});
try {
    browser = await launchBrowser(); report.browser = browser.version();
    session = await createTestPage(browser, server.baseUrl, {viewport: {width: 390, height: 900}});
    const page = session.page;
    await session.goto('/mgallery/board/lists?id=test');
    await page.waitForFunction(() => window.__dcufHeaderDrawerHostAdapter?.snapshotResources().mutationSubscribers === 1);
    await page.evaluate(() => {
        window.__dcufHeaderDrawerHostAdapter.dispose();
        document.querySelector('.issue_contentbox').setAttribute('data-dcuf-header-native-door', '1');
        document.querySelector('.minor_intro_box').setAttribute('data-dcuf-header-door-intro', 'host-original');
        window.__dcufHeaderDrawerHostAdapter.connect();
    });
    await settle(page);
    report.lifecycle = await exerciseNativeLifecycle(page, settle);
    assertNoRuntimeErrors(await getMetrics(page), session.consoleErrors);
    report.status = 'PASS';
} catch (error) { report.error = error.stack; throw error; }
finally { await writeFile(output, JSON.stringify(report, null, 2) + '\n'); await session?.close(); await browser?.close(); await server.close(); }
console.log(`Native lifecycle PASS: ${report.lifecycle.steps.length} transitions.`);
