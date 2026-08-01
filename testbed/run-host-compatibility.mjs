import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { startServer } from './server/server.mjs';
import {
    assert,
    assertNoRuntimeErrors,
    createTestPage,
    getMetrics,
    launchBrowser,
    storageKeys
} from './harness/runner-utils.mjs';

const execFileAsync = promisify(execFile);
const testbedDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(testbedDir, '..');
const runtimePath = path.join(testbedDir, 'artifacts', 'runtime-under-test.user.js');
const expectedPaletteIds = ['blue', 'purple', 'green', 'orange', 'mono', 'indigo', 'sky', 'cyan', 'teal', 'lime', 'amber', 'red', 'rose', 'pink'];
const expectedPaletteLabels = ['기본 블루', '퍼플', '그린', '오렌지', '모노톤', '인디고', '스카이', '시안', '틸', '라임', '앰버', '레드', '로즈', '핑크'];
const noStatsStorage = {
    [storageKeys.threshold]: 0,
    [storageKeys.ratioEnabled]: false,
    [storageKeys.personalEnabled]: true,
    [storageKeys.personalList]: { uids: [], nicknames: [], ips: [] }
};

const buildRuntime = async () => {
    const { stdout, stderr } = await execFileAsync(process.execPath, [
        path.join(rootDir, 'tools', 'build-userscript.mjs'),
        '--testbed-output',
        runtimePath
    ], { cwd: rootDir, windowsHide: true });
    if (stderr?.trim()) process.stderr.write(stderr);
    const bytes = await readFile(runtimePath);
    const sha256 = createHash('sha256').update(bytes).digest('hex').toUpperCase();
    process.env.DCUF_TESTBED_USERSCRIPT = path.relative(rootDir, runtimePath);
    process.stdout.write(`${stdout.trim()}\nHost runtime: ${path.resolve(runtimePath)}\nHost runtime SHA-256: ${sha256}\n`);
    return sha256;
};

const sampleActionRow = () => {
    const row = document.querySelector('[data-host-action-row]');
    const cancel = row?.querySelector('[data-host-action="cancel"]');
    const confirm = row?.querySelector('[data-host-action="confirm"]');
    const rect = confirm?.getBoundingClientRect();
    const inset = rect ? Math.max(6, Math.min(rect.width, rect.height) * 0.2) : 0;
    const points = rect ? [
        [rect.left + rect.width / 2, rect.top + rect.height / 2],
        [rect.left + inset, rect.top + inset],
        [rect.right - inset, rect.top + inset],
        [rect.left + inset, rect.bottom - inset],
        [rect.right - inset, rect.bottom - inset]
    ] : [];
    return {
        cancelLeft: cancel?.getBoundingClientRect().left || 0,
        cancelRight: cancel?.getBoundingClientRect().right || 0,
        confirmLeft: rect?.left || 0,
        confirmRight: rect?.right || 0,
        confirmWidth: rect?.width || 0,
        confirmHeight: rect?.height || 0,
        hitCount: points.filter(([x, y]) => {
            const hit = document.elementFromPoint(x, y);
            return hit === confirm || confirm?.contains(hit);
        }).length,
        topHit: rect ? document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)?.className || '' : ''
    };
};

const assertCleanPage = async (session) => assertNoRuntimeErrors(await getMetrics(session.page), session.consoleErrors);
const results = [];
const run = async (name, callback) => {
    const startedAt = Date.now();
    try {
        await callback();
        results.push({ name, status: 'passed', durationMs: Date.now() - startedAt });
        process.stdout.write(`PASS ${name} (${Date.now() - startedAt}ms)\n`);
    } catch (error) {
        results.push({ name, status: 'failed', durationMs: Date.now() - startedAt, error: error?.stack || String(error) });
        process.stderr.write(`FAIL ${name} (${Date.now() - startedAt}ms)\n${error?.stack || error}\n`);
    }
};

const sha256 = await buildRuntime();
const server = await startServer();
const browser = await launchBrowser();

try {
    await run('filter master-off preserves convenience settings and stale listRestore is ignored', async () => {
        const convenienceKey = 'dcuf_mobile_convenience_settings_v1';
        const session = await createTestPage(browser, server.baseUrl, {
            storage: {
                ...noStatsStorage,
                [storageKeys.masterDisabled]: true,
                [convenienceKey]: { listRestore: true, recentHighlight: true, draftRecovery: true, postPreview: true }
            }
        });
        try {
            await session.goto('/board/lists?id=test');
            const contract = await session.page.evaluate(async (key) => {
                const module = window.__dcufMobileConvenienceModule;
                await module.showSettings();
                const labels = Array.from(document.querySelectorAll('.dcuf-convenience-row strong')).map((node) => node.textContent.trim());
                const note = document.querySelector('.dcuf-convenience-note')?.textContent || '';
                const gm = window.__dcufTestbedGM.snapshot();
                return {
                    settings: { ...module.settings },
                    enabled: ['recentHighlight', 'draftRecovery', 'postPreview'].map((name) => [name, module.isEnabled(name)]),
                    labels,
                    note,
                    writes: gm.writes.filter((entry) => entry.key === key).length
                };
            }, convenienceKey);
            assert.deepEqual(Object.keys(contract.settings).sort(), ['draftRecovery', 'postPreview', 'recentHighlight']);
            assert.deepEqual(contract.enabled, [['recentHighlight', true], ['draftRecovery', true], ['postPreview', true]]);
            assert.equal(contract.labels.some((label) => label.includes('스크롤 위치')), false);
            assert.match(contract.note, /필터/);
            assert.equal(contract.writes, 0);
            await assertCleanPage(session);
        } finally { await session.close(); }
    });

    await run('late PUMX button and native handler activate once and clean bounded retry state', async () => {
        const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
        try {
            await session.goto('/board/write/?id=test&host-compat=pumx&button-delay=100&handler-delay=600');
            await session.page.waitForFunction(() => document.querySelector('#btn_pumx')?.classList.contains('on'), null, { timeout: 2600 });
            const contract = await session.page.evaluate(() => ({
                host: { ...window.__dcufHostPumx },
                active: document.querySelector('#btn_pumx')?.getAttribute('aria-pressed'),
                state: window.__dcufPumxDefaultState || null,
                subscriber: window.__dcufRuntimeCoordinator?._mutationSubscribers?.has('write-pumx-defaults') || false
            }));
            assert.deepEqual(contract.host, { buttonInsertions: 1, clickEvents: 1, handlerCalls: 1 });
            assert.equal(contract.active, 'true');
            assert.equal(contract.state, null);
            assert.equal(contract.subscriber, false);
            await assertCleanPage(session);
        } finally { await session.close(); }
    });

    await run('already-active PUMX is not clicked again', async () => {
        const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
        try {
            await session.goto('/mini/board/write/?id=test&host-compat=pumx&active=1');
            await session.page.waitForTimeout(450);
            const host = await session.page.evaluate(() => ({ ...window.__dcufHostPumx }));
            assert.deepEqual(host, { buttonInsertions: 1, clickEvents: 0, handlerCalls: 0 });
            await assertCleanPage(session);
        } finally { await session.close(); }
    });

    await run('PUMX timeout and pagehide remove retry ownership', async () => {
        const timeoutSession = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
        try {
            await timeoutSession.goto('/mgallery/board/write/?id=test&host-compat=pumx&omit-button=1');
            await timeoutSession.page.waitForTimeout(2200);
            assert.deepEqual(await timeoutSession.page.evaluate(() => ({
                state: window.__dcufPumxDefaultState || null,
                subscriber: window.__dcufRuntimeCoordinator?._mutationSubscribers?.has('write-pumx-defaults') || false
            })), { state: null, subscriber: false });
            await assertCleanPage(timeoutSession);
        } finally { await timeoutSession.close(); }

        const exitSession = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage });
        try {
            await exitSession.goto('/board/write/?id=test&host-compat=pumx&omit-button=1');
            await exitSession.page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })));
            await exitSession.page.waitForTimeout(20);
            assert.deepEqual(await exitSession.page.evaluate(() => ({
                state: window.__dcufPumxDefaultState || null,
                subscriber: window.__dcufRuntimeCoordinator?._mutationSubscribers?.has('write-pumx-defaults') || false
            })), { state: null, subscriber: false });
            await assertCleanPage(exitSession);
        } finally { await exitSession.close(); }
    });

    for (const scenario of [
        { name: 'non-member modify', path: '/board/modify/?id=test&host-compat=password', action: '/__testbed/modify_password_submit', method: 'post' },
        { name: 'non-member delete', path: '/mini/board/delete/?id=test&host-compat=password', action: '/__testbed/delete_password_submit', method: 'post' }
    ]) {
        await run(`${scenario.name} preserves form and original popup/button lifecycle`, async () => {
            const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage, viewport: { width: 390, height: 844 } });
            try {
                await session.goto(scenario.path);
                const contract = await session.page.evaluate(sampleActionRow);
                const form = await session.page.locator('form').evaluate((element) => ({
                    action: element.getAttribute('action'),
                    method: element.getAttribute('method'),
                    hidden: Array.from(element.querySelectorAll('input[type="hidden"]')).map((input) => input.name),
                    originalButtons: window.__dcufHostSimulator.originalButtons.every((button) => button.isConnected),
                    originalParents: window.__dcufHostSimulator.originalButtons.every((button) => button.parentElement?.matches('[data-host-action-row]'))
                }));
                assert.equal(form.action, scenario.action);
                assert.equal(form.method, scenario.method);
                assert.deepEqual(form.hidden, ['ci_t', 'id', 'no', 'key', 'dcc_key', 'auth_token']);
                assert.equal(form.originalButtons && form.originalParents, true);
                assert.equal(contract.cancelRight < contract.confirmLeft, true, JSON.stringify(contract));
                assert.equal(contract.confirmWidth > 0 && contract.confirmHeight > 0, true, JSON.stringify(contract));
                assert.equal(contract.hitCount, 5, JSON.stringify(contract));
                await session.page.locator('[data-host-action="cancel"]').evaluate((button) => button.click());
                assert.equal(await session.page.locator('[data-host-popup]').evaluate((popup) => getComputedStyle(popup).display), 'none');
                await session.page.locator('.host-reopen').click();
                const reopened = await session.page.evaluate(() => ({
                    samePopup: window.__dcufHostSimulator.originalPopup === document.querySelector('[data-host-popup]'),
                    display: getComputedStyle(document.querySelector('[data-host-popup]')).display,
                    closeCalls: window.__dcufHostSimulator.closeCalls,
                    reopenCalls: window.__dcufHostSimulator.reopenCalls
                }));
                assert.deepEqual(reopened, { samePopup: true, display: 'block', closeCalls: 1, reopenCalls: 1 });
                await assertCleanPage(session);
            } finally { await session.close(); }
        });
    }

    await run('authenticated delete keeps native form, hit area, lifecycle, and one submit handler', async () => {
        const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage, viewport: { width: 390, height: 844 } });
        try {
            await session.goto('/mgallery/board/delete/?id=test&host-compat=delete-confirm');
            await session.page.evaluate(() => {
                window.__dcufUIModule.syncDeleteSurface('host-compat-repeat-1');
                window.__dcufUIModule.syncDeleteSurface('host-compat-repeat-2');
            });
            const contract = await session.page.evaluate(sampleActionRow);
            const geometry = await session.page.evaluate(() => {
                const rectOf = (selector) => {
                    const rect = document.querySelector(selector)?.getBoundingClientRect();
                    return rect ? { top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height } : null;
                };
                return {
                    pageHead: rectOf('.page_head'),
                    form: rectOf('form#delete'),
                    article: rectOf('form#delete > article'),
                    card: rectOf('.dcuf-delete-confirm-card')
                };
            });
            const form = await session.page.locator('form#delete').evaluate((element) => ({
                action: element.getAttribute('action'),
                method: element.getAttribute('method'),
                hidden: Array.from(element.querySelectorAll('input[type="hidden"]')).map((input) => input.name),
                surface: document.documentElement.getAttribute('data-dcuf-delete-surface'),
                bodyClass: document.body.className
            }));
            assert.deepEqual(form, {
                action: '/__testbed/delete_confirm_submit',
                method: 'post',
                hidden: ['ci_t', 'id', 'no', 'key', 'dcc_key'],
                surface: 'confirm',
                bodyClass: form.bodyClass
            });
            assert.equal(form.bodyClass.includes('is-delete-confirm-page'), true);
            assert.equal(geometry.form.height - geometry.card.height <= 96, true, JSON.stringify(geometry));
            assert.equal(geometry.card.top - geometry.pageHead.bottom <= 96, true, JSON.stringify(geometry));
            assert.equal(contract.cancelRight < contract.confirmLeft, true, JSON.stringify(contract));
            assert.equal(contract.hitCount, 5, JSON.stringify(contract));
            await session.page.locator('[data-host-action="confirm"]').click();
            assert.equal(await session.page.evaluate(() => window.__hostDeleteSubmitCalls || 0), 1);
            assert.equal(await session.page.evaluate(() => window.__dcufHostSimulator.delegatedClicks.confirm || 0), 1);
            await assertCleanPage(session);
        } finally { await session.close(); }
    });

    for (const route of ['/board/view', '/mgallery/board/view', '/mini/board/view']) {
        await run(`recommendation remains host-interactive and contained on ${route}`, async () => {
            for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
                const session = await createTestPage(browser, server.baseUrl, { storage: noStatsStorage, viewport });
                try {
                    await session.goto(`${route}?id=test&host-compat=recommend&captcha=1`);
                    const geometry = await session.page.evaluate(() => {
                        const parent = document.querySelector('.view_content_wrap').getBoundingClientRect();
                        const box = document.querySelector('[data-host-recommend-box]').getBoundingClientRect();
                        const captcha = document.querySelector('[data-host-captcha]').getBoundingClientRect();
                        return {
                            parent: { left: parent.left, right: parent.right, width: parent.width },
                            box: { left: box.left, right: box.right, width: box.width },
                            captcha: { left: captcha.left, right: captcha.right, width: captcha.width },
                            overflow: getComputedStyle(document.querySelector('[data-host-recommend-box]')).overflow
                        };
                    });
                    assert.equal(geometry.box.left >= geometry.parent.left - 1 && geometry.box.right <= geometry.parent.right + 1, true, JSON.stringify(geometry));
                    if (viewport.width > 900) assert.equal(geometry.box.width < geometry.parent.width * 0.8, true, JSON.stringify(geometry));
                    assert.equal(geometry.captcha.left >= geometry.box.left - 1 && geometry.captcha.right <= geometry.box.right + 1, true, JSON.stringify(geometry));
                    await session.page.locator('[data-host-action="recommend-up"]').click();
                    await session.page.locator('[data-host-action="recommend-down"]').click();
                    assert.deepEqual(await session.page.evaluate(() => ({ ...window.__dcufHostSimulator.delegatedClicks })), { 'recommend-up': 1, 'recommend-down': 1 });
                    await assertCleanPage(session);
                } finally { await session.close(); }
            }
        });
    }

    await run('runtime palette registry and README/index documentation expose the same 14 palettes', async () => {
        const [themeSource, readme, index] = await Promise.all([
            readFile(path.join(rootDir, 'src', 'targets', 'mobile', 'theme-module.js'), 'utf8'),
            readFile(path.join(rootDir, 'README.md'), 'utf8'),
            readFile(path.join(rootDir, 'index.html'), 'utf8')
        ]);
        const entries = Array.from(themeSource.matchAll(/Object\.freeze\(\{\s*id:\s*'([^']+)',\s*label:\s*'([^']+)'/g), (match) => ({ id: match[1], label: match[2] }));
        assert.deepEqual(entries.map((entry) => entry.id), expectedPaletteIds);
        assert.deepEqual(entries.map((entry) => entry.label), expectedPaletteLabels);
        expectedPaletteLabels.forEach((label) => assert.equal(readme.includes(label) || index.includes(label), true, `missing documented palette: ${label}`));
        assert.match(readme, /14가지/);
        assert.match(index, /14가지/);
    });
} finally {
    await browser.close();
    await server.close();
}

const failed = results.filter((result) => result.status === 'failed');
process.stdout.write(`Host compatibility result: ${results.length - failed.length} passed, ${failed.length} failed\nHost compatibility runtime SHA-256: ${sha256}\n`);
if (failed.length > 0) process.exitCode = 1;
