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
            const returnContract = await session.page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('.custom-post-item a.post-title-link'))
                    .filter((link) => getComputedStyle(link.closest('.custom-post-item')).display !== 'none');
                const link = links[Math.min(18, links.length - 1)];
                const card = link.closest('.custom-post-item');
                card.scrollIntoView({ block: 'center' });
                const offset = card.getBoundingClientRect().top;
                const originalScrollTo = window.scrollTo.bind(window);
                window.__dcufBfcacheScrollToCalls = 0;
                window.scrollTo = (...args) => { window.__dcufBfcacheScrollToCalls += 1; return originalScrollTo(...args); };
                return { href: link.href, postNo: new URL(link.href).searchParams.get('no'), offset };
            });
            await Promise.all([
                session.page.waitForURL('**/board/view**'),
                session.page.locator(`.custom-post-item a.post-title-link[href*="no=${returnContract.postNo}"]`).click()
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
                recentPostNo: (() => { const link = document.querySelector('.custom-post-item.dcuf-recent-post a.post-title-link'); return link ? new URL(link.href).searchParams.get('no') : null; })(),
                recentOffset: (() => { const card = document.querySelector('.custom-post-item.dcuf-recent-post'); return card ? card.getBoundingClientRect().top : null; })(),
                scrollToCalls: window.__dcufBfcacheScrollToCalls ?? 0,
                memory: window.__dcufMemoryDebug?.sample?.(`bfcache-${token}`) || null
            }), tokenBefore);
            assert.equal(result.customLists, 1);
            assert.equal(result.customPosts, 51);
            assert.equal(result.recentPostNo, returnContract.postNo);
            assert.equal(Math.abs(Number(result.recentOffset) - Number(returnContract.offset)) <= 3, true, `offset ${result.recentOffset} vs ${returnContract.offset}`);
            if (result.pageshow?.persisted) assert.equal(result.scrollToCalls, 0, 'persisted pageshow must not issue a duplicate scrollTo');
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
