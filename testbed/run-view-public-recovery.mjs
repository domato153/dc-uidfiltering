import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTestPage, launchBrowser, storageKeys } from './harness/runner-utils.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const required = (flag) => {
    const index = args.indexOf(flag);
    if (index < 0 || !args[index + 1]) throw new Error(`Missing ${flag}`);
    return path.resolve(root, args[index + 1]);
};
const runtime = required('--runtime');
const output = required('--output');
if (!/[\\/]testbed[\\/]artifacts[\\/]runtime-under-test\.user\.js$/i.test(runtime)) {
    throw new Error(`Source-work runtime guard rejected ${runtime}`);
}
const bytes = await readFile(runtime);
const runtimeSha256 = createHash('sha256').update(bytes).digest('hex').toUpperCase();
if (!/^\/\/\s*@name\s+DC_UserFilter_Mobile\s*$/m.test(bytes.toString('utf8'))) {
    throw new Error('Mobile userscript required');
}
console.log(`Public view recovery runtime: ${runtime}`);
console.log(`Runtime SHA-256: ${runtimeSha256}`);
process.env.DCUF_TESTBED_USERSCRIPT = runtime;
process.env.DCUF_TESTBED_TARGET = 'mobile';

const storage = {
    [storageKeys.threshold]: 0,
    [storageKeys.ratioEnabled]: false,
    [storageKeys.personalEnabled]: true,
    [storageKeys.personalList]: { uids: [], nicknames: [], ips: [] }
};
const cases = [
    { id: 'major-390', path: '/board/view/?id=programming&no=2940311&page=1', width: 390 },
    { id: 'major-1120', path: '/board/view/?id=programming&no=2940311&page=1', width: 1120 },
    { id: 'minor-390', path: '/mgallery/board/view/?id=aoegame&no=31646568&page=1', width: 390 },
    { id: 'minor-1120', path: '/mgallery/board/view/?id=aoegame&no=31646568&page=1', width: 1120 }
];
const browser = await launchBrowser();
const results = [];
try {
    for (const testCase of cases) {
        const session = await createTestPage(browser, 'https://gall.dcinside.com', {
            storage, viewport: { width: testCase.width, height: 900 }
        });
        try {
            const response = await session.page.goto(`https://gall.dcinside.com${testCase.path}`, {
                waitUntil: 'domcontentloaded', timeout: 30000
            });
            await session.page.waitForFunction(() => ['completed', 'timeout'].includes(window.__dcufRevealDebug?.recovery?.status),
                null, { timeout: 10000 });
            const state = await session.page.evaluate(() => {
                const content = document.querySelector('.gallview_contents');
                const view = content?.closest('.view_content_wrap');
                const list = document.querySelector('#bottom_listwrap .gall_listwrap.list');
                const host = Array.from(list?.querySelectorAll('table.gall_list tbody tr.ub-content') || []);
                const mirror = Array.from(list?.querySelectorAll('.custom-mobile-list .custom-post-item') || []);
                const area = mirror[0]?.getBoundingClientRect();
                return {
                    ready: document.documentElement.classList.contains('script-ui-ready'),
                    hasViewBottom: Boolean(document.querySelector('.view_bottom')),
                    hasView: Boolean(view),
                    viewTag: view?.tagName || null,
                    viewParentTag: view?.parentElement?.tagName || null,
                    viewInContainer: Boolean(view?.closest('#container')),
                    contentRole: content?.getAttribute('data-dcuf-role') || null,
                    contentRadius: content ? getComputedStyle(content).borderRadius : null,
                    articleStyleOwnerPresent: document.getElementById('dcuf-article-presenter') instanceof HTMLStyleElement,
                    hasBottomList: Boolean(list),
                    hostCount: host.length,
                    mirrorCount: mirror.length,
                    sameOrder: host.length === mirror.length && host.every((row, index) =>
                        row.getAttribute('data-custom-row-id') === mirror[index]?.getAttribute('data-custom-row-id')),
                    firstHostDisplay: host[0] ? getComputedStyle(host[0]).display : null,
                    firstMirrorDisplay: mirror[0] ? getComputedStyle(mirror[0]).display : null,
                    firstMirrorArea: area ? [area.width, area.height] : null,
                    positiveMirrors: mirror.filter((row) => {
                        const bounds = row.getBoundingClientRect();
                        return getComputedStyle(row).display !== 'none' && bounds.width > 0 && bounds.height > 0;
                    }).length,
                    listVerify: window.__dcufPhase1Theme?.verify(list)?.reason || null,
                    viewVerify: window.__dcufPhase1ViewTheme?.verify(document, { mode: 'core' })?.reason || null,
                    recovery: window.__dcufRevealDebug?.recovery || null,
                    gmWriteKeys: window.__dcufTestbedGM?.snapshot().writes.map(({ key }) => key) || []
                };
            });
            const checks = {
                hostShape: state.hasView && state.viewInContainer && !state.hasViewBottom && state.hasBottomList,
                articleOwned: state.contentRole === 'article-body' && state.contentRadius === '0px'
                    && state.articleStyleOwnerPresent,
                rowsPreserved: state.hostCount > 0 && state.hostCount === state.mirrorCount && state.sameOrder,
                visibleRows: state.firstHostDisplay === 'table-row' && state.firstMirrorDisplay === 'block'
                    && state.firstMirrorArea?.every((value) => value > 0) && state.positiveMirrors > 0,
                readiness: state.ready && state.listVerify === 'ready' && state.viewVerify === 'ready'
                    && state.recovery?.status === 'completed' && state.recovery?.ready === true
                    && state.recovery?.reason === 'ready' && state.recovery?.active === false
            };
            const scriptErrors = session.consoleErrors.filter((message) => /DCUF|dcuf/i.test(message));
            results.push({ ...testCase, httpStatus: response?.status() || null, state, checks,
                dcufErrorCount: scriptErrors.length,
                otherConsoleErrorCount: session.consoleErrors.length - scriptErrors.length,
                verdict: response?.status() === 200 && Object.values(checks).every(Boolean)
                    && scriptErrors.length === 0 ? 'PASS' : 'FAIL' });
        } catch (error) {
            results.push({ ...testCase, verdict: 'UNKNOWN', environmentFailure: String(error?.message || error).split('\n')[0] });
        } finally {
            await session.close();
        }
    }
} finally {
    await browser.close();
}
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, JSON.stringify({ schemaVersion: 1, kind: 'public-view-recovery-gm-shim', runtime,
    runtimeSha256, browserVersion: browser.version(),
    environment: 'anonymous public pages, isolated Chromium contexts with a test GM shim; no Tampermonkey installation',
    results }, null, 2) + '\n');
console.log(`Public view recovery: ${results.map(({ id, verdict }) => `${id}:${verdict}`).join(', ')}`);
console.log(`Report: ${output}`);
if (results.some(({ verdict }) => verdict !== 'PASS')) process.exitCode = 1;
