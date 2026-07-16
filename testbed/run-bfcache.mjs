import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { startServer } from './server/server.mjs';
import { assert, createTestPage, launchBrowser, storageKeys, testbedDir } from './harness/runner-utils.mjs';

const headed = process.argv.includes('--headed');
const variants = [
    { id: 'current', label: 'production lifecycle with explicit persisted-pageshow recovery' },
    { id: 'pagehide', label: 'production recovery after test-only observer disconnect' }
];
const storage = {
    [storageKeys.threshold]: 0,
    [storageKeys.ratioEnabled]: false,
    [storageKeys.personalEnabled]: true,
    [storageKeys.personalList]: { uids: [], nicknames: [], ips: [] }
};
const server = await startServer();
const browser = await launchBrowser({ headed });
const reports = [];
let failures = 0;

try {
    for (const variant of variants) {
        const session = await createTestPage(browser, server.baseUrl, { storage, bfcacheVariant: variant.id });
        try {
            await session.goto('/board/lists?id=test&bfcache=1');
            const tokenBefore = await session.page.evaluate(() => window.__dcufRuntimeLoaded);
            await Promise.all([
                session.page.waitForURL('**/__testbed/navigation-target**'),
                session.page.evaluate(() => { window.location.href = '/__testbed/navigation-target'; })
            ]);
            await session.page.goBack({ waitUntil: 'domcontentloaded' });
            await session.page.waitForFunction(() => document.documentElement.classList.contains('script-ui-ready'));
            await session.page.waitForFunction(() => document.querySelectorAll('.custom-post-item').length === 51);
            const wasPersisted = await session.page.evaluate(() => Boolean(window.__dcufTestbedPageshow?.persisted));
            if (wasPersisted) {
                await session.page.waitForFunction(() => (window.__dcufDiagnostics?.snapshot?.().counters?.['lifecycle.bfcache.restore.completed'] || 0) >= 1);
            }
            const result = await session.page.evaluate((token) => ({
                runtimeTokenBefore: token,
                runtimeTokenAfter: window.__dcufRuntimeLoaded,
                pageshow: window.__dcufTestbedPageshow || null,
                pagehide: window.__dcufTestbedPagehide || null,
                navigationType: performance.getEntriesByType('navigation')[0]?.type || null,
                customLists: document.querySelectorAll('.custom-mobile-list').length,
                customPosts: document.querySelectorAll('.custom-post-item').length,
                subscribers: window.__dcufDiagnostics?.snapshot?.().gauges?.['mutation.subscribers'] ?? null,
                recoveryRequested: window.__dcufDiagnostics?.snapshot?.().counters?.['lifecycle.bfcache.restore.requested'] ?? 0,
                recoveryCompleted: window.__dcufDiagnostics?.snapshot?.().counters?.['lifecycle.bfcache.restore.completed'] ?? 0,
                memory: window.__dcufMemoryDebug?.sample?.(`bfcache-${token}`) || null
            }), tokenBefore);
            assert.equal(result.customLists, 1);
            assert.equal(result.customPosts, 51);
            reports.push({ variant: variant.id, label: variant.label, ...result });
            console.log(`PASS ${variant.label}: persisted=${result.pageshow?.persisted ?? false}, navigation=${result.navigationType}`);
        } catch (error) {
            failures += 1;
            reports.push({ variant: variant.id, label: variant.label, error: error?.stack || String(error) });
            console.error(`FAIL ${variant.label}`);
            console.error(error?.stack || error);
        } finally {
            await session.close();
        }
    }
} finally {
    await browser.close();
    await server.close();
}

const artifactDir = path.join(testbedDir, 'artifacts');
await mkdir(artifactDir, { recursive: true });
const artifactPath = path.join(artifactDir, 'bfcache-latest.json');
await writeFile(artifactPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), reports }, null, 2)}\n`, 'utf8');
console.log(`bfcache report: ${artifactPath}`);
if (failures > 0) process.exitCode = 1;
