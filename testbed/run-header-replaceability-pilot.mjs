import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { startServer } from './server/server.mjs';
import { launchBrowser, createTestPage, storageKeys, getMetrics, assertNoRuntimeErrors } from './harness/runner-utils.mjs';
import { loadDrawerPresenter, captureBodyPhase, validateBodyPhase } from './header-drawer-body-contract.mjs';

// Build-time presenter replacement experiment. Production sources and guarded
// runtime are never mutated; each variant runs in its own fresh browser context.
assert.ok(process.argv.includes('--require-runtime-under-test'), 'Source runtime guard required');
const value = flag => process.argv[process.argv.indexOf(flag) + 1];
assert.ok(process.argv.includes('--output'), 'Specify an ignored testbed/artifacts output directory');
const output = path.resolve(value('--output'));
assert.ok(output.startsWith(path.resolve('testbed/artifacts') + path.sep));
await mkdir(output, { recursive: true });
const guard = path.resolve('testbed/artifacts/runtime-under-test.user.js');
const bytes = await readFile(guard);
const sha = data => createHash('sha256').update(data).digest('hex').toUpperCase();
const normalize = text => text.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '');
const text = normalize(bytes.toString());
const sourcePath = 'src/targets/mobile/header-drawer-presenter.js';
const original = normalize(await readFile(sourcePath, 'utf8'));
assert.equal(text.split(original).length - 1, 1, 'Exact source presenter must occur once in guarded build');
const start = text.indexOf(original), end = start + original.length;
const prefix = text.slice(0, start), suffix = text.slice(end);
const encode = source => Buffer.from(source.replace(/\n/g, '\r\n'));
assert.deepEqual(encode(text), bytes, 'Exact artifact encoding round trip');
const replaceOne = (source, from, to) => {
    assert.equal(source.split(from).length - 1, 1, `Unique edit: ${from}`);
    return source.replace(from, to);
};
const toggleBlock = source => {
    const begin = source.indexOf('[data-dcuf-header-drawer-scope="1"] [data-dcuf-header-drawer="1"] .dcuf-header-drawer__toggle {');
    const finish = source.indexOf('}', begin) + 1;
    assert.ok(begin >= 0 && finish > begin);
    return source.slice(begin, finish);
};
const styleToggle = (source, edits) => {
    const old = toggleBlock(source);
    const changed = edits.reduce((s, [from, to]) => replaceOne(s, from, to), old);
    return replaceOne(source, old, changed);
};
const labels = source => replaceOne(replaceOne(source, "label: '갤러리 대문 열기'", "label: '갤러리 정보 보기'"), "label: '갤러리 대문 닫기'", "label: '갤러리 정보 접기'");
const icon = source => replaceOne(source, '<span class="dcuf-header-drawer__toggle-label">', '<span class="dcuf-header-drawer__icon" aria-hidden="true">▤</span>\n                        <span class="dcuf-header-drawer__toggle-label">');
const narrow = source => replaceOne(source, 'const layout = Object.freeze({ maxWidth: 640 });', 'const layout = Object.freeze({ maxWidth: 560 });');
const cosmetic = styleToggle(labels(original), [['padding: 0 12px;', 'padding: 0 16px;'], ['color: var(--dcuf-fg-sub);', 'color: var(--dcuf-theme-accent-strong);']]);
const composition = styleToggle(icon(original), [['justify-content: center;', 'justify-content: center;\n                flex-direction: row-reverse;']]);
const replacement = styleToggle(icon(narrow(labels(original))), [['border-radius: 999px;', 'border-radius: 10px;'], ['min-height: 32px;', 'min-height: 38px;'], ['padding: 0 12px;', 'padding: 6px 14px;'], ['background: rgba(255, 255, 255, 0.94);', 'background: var(--dcuf-theme-accent-soft, #e6f3ef);'], ['color: var(--dcuf-fg-sub);', 'color: var(--dcuf-theme-accent-strong);']]);
const variants = [
    { id: 'control', source: original, cap: 640 },
    { id: 'cosmetic', source: cosmetic, cap: 640 },
    { id: 'composition', source: composition, cap: 640, icon: true, reversed: true },
    { id: 'responsive', source: narrow(original), cap: 560 },
    { id: 'replacement', source: replacement, cap: 560, icon: true },
    { id: 'restored', source: original, cap: 640 },
];
const verifyLocality = (built, candidateSource) => {
    assert.equal(built, prefix + candidateSource + suffix, 'Everything outside the presenter remains byte-identical');
};
for (const variant of variants) {
    const built = prefix + variant.source + suffix;
    verifyLocality(built, variant.source);
    variant.presenter = loadDrawerPresenter(variant.source);
    variant.runtime = path.join(output, `${variant.id}.user.js`);
    const artifact = encode(built);
    await writeFile(variant.runtime, artifact);
    variant.sha256 = sha(artifact);
    variant.presenterSha256 = sha(variant.source);
    variant.newPriorities = (variant.source.match(/!important/g) || []).length - (original.match(/!important/g) || []).length;
    assert.equal(variant.newPriorities, 0);
    if (!['control', 'restored'].includes(variant.id)) assert.notEqual(variant.source, original, 'A real presenter delta is required');
}
assert.equal(variants.at(-1).sha256, sha(bytes), 'Restoration returns exact original bytes');
const adapterNeedle = 'Math.min(__dcufHeaderDrawerPresenter.layout.maxWidth, Math.max(0, viewportWidth - 24))';
assert.ok(suffix.includes(adapterNeedle), 'Current adapter placement input required');
assert.throws(() => verifyLocality(prefix + replacement + suffix.replace(adapterNeedle, 'Math.min(640, Math.max(0, viewportWidth - 24))'), replacement), 'Hidden adapter change must be rejected');
const negativeText = (prefix + narrow(original) + suffix).replaceAll(/Math\.min\(__dcufHeaderDrawerPresenter\.layout\.maxWidth, Math\.max\(0, (?:viewportWidth|window\.innerWidth) - 24\)\)/g, 'Math.min(640, Math.max(0, window.innerWidth - 24))');
const negativePath = path.join(output, 'hardcoded-adapter-negative.user.js');
await writeFile(negativePath, encode(negativeText));
const sourcePaths = ['src/targets/mobile/header-drawer-host-adapter.js', 'src/targets/mobile/runtime-coordinator.js', 'src/shared/ui-contracts.js'];
const sourceHashes = Object.fromEntries(await Promise.all(sourcePaths.map(async p => [p, sha(await readFile(p))])));
const cases = [
    { id: 'phone-layout-light', width: 980, height: 900 },
    { id: 'phone-layout-dark', width: 980, height: 900, dark: true },
    { id: 'wide', width: 1280, height: 900 },
    { id: 'short-stress-dark', width: 390, height: 480, dark: true },
    { id: 'major-recommendation', width: 980, height: 900, major: true },
];
const report = { kind: 'header-replaceability-pilot', status: 'IN_PROGRESS', sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    control: { path: guard, sha256: sha(bytes) }, sourceHashes, presenterSourceSha256: sha(original), observerSha256: sha(await readFile(new URL(import.meta.url))),
    scope: 'Build-time presenter-only variants in fresh Chrome/GM-shim contexts. Not runtime hot swapping, physical phone, Concept01 or whole-stage admission.',
    variants: variants.map(({ id, cap, runtime, sha256, presenterSha256, newPriorities }) => ({ id, cap, runtime: path.relative(process.cwd(), runtime), sha256, presenterSha256, newPriorities })), observations: [], negatives: {} };
const server = await startServer();
let browser;
const settle = page => page.waitForFunction(() => {
    const m = window.__dcufTestbedMetrics.snapshot();
    return m.activeTimeouts === 0 && m.activeAnimationFrames === 0 && m.activeIntervals === 0
        && document.getAnimations().every(a => a.playState === 'finished' || a.playState === 'idle');
});
try {
    browser = await launchBrowser(); report.browser = browser.version();
    const parser = await browser.newPage();
    try {
        const validateScope = async css => {
            const selectors = await parser.evaluate(css => {
                const sheet = new CSSStyleSheet(); sheet.replaceSync(css);
                const walk = rules => Array.from(rules).flatMap(r => r.selectorText ? [r.selectorText] : r.cssRules ? walk(r.cssRules) : []);
                return walk(sheet.cssRules);
            }, css);
            assert.ok(selectors.length > 0 && selectors.every(s => s.startsWith('[data-dcuf-header-drawer-scope="1"]')), 'All pilot CSS remains inside the existing owner scope');
        };
        for (const v of variants) await validateScope(v.presenter.style.css);
        await assert.rejects(() => validateScope(variants.find(v => v.id === 'replacement').presenter.style.css + '\nbody { color: red; }'), 'Global correction phase must be rejected');
    } finally { await parser.close(); }
    for (const variant of variants) for (const testCase of cases) {
        process.env.DCUF_TESTBED_USERSCRIPT = variant.runtime;
        process.env.DCUF_TESTBED_TARGET = 'mobile';
        assert.equal(sha(await readFile(variant.runtime)), variant.sha256, 'Reject stale/mismatched runtime before every context');
        const session = await createTestPage(browser, server.baseUrl, { viewport: { width: testCase.width, height: testCase.height }, storage: { [storageKeys.threshold]: 0, [storageKeys.ratioEnabled]: false } });
        const page = session.page; page.setDefaultTimeout(7000);
        try {
            await session.goto(testCase.major ? '/board/lists?id=test' : '/mgallery/board/lists?id=test');
            if (testCase.major) await page.evaluate(() => {
                const wrap = document.createElement('div'); wrap.className = 'issue_wrap';
                wrap.innerHTML = '<section id="gall_top_recom" class="concept_wrap"><div class="pageing_box"><button type="button">다음</button></div><ul class="concept_txtlist"><li>원본 추천글</li></ul></section>';
                document.querySelector('#container article').prepend(wrap);
                window.__pilotNativeCalls = 0; wrap.querySelector('button').addEventListener('click', () => window.__pilotNativeCalls++);
                window.__dcufHeaderDrawerHostAdapter.refresh();
            });
            await page.locator('#dcuf-testbed-controls').evaluate(e => { e.style.display = 'none'; });
            if (testCase.dark) await page.evaluate(() => window.__dcufFixture.toggleDark(true));
            await page.waitForFunction(() => window.__dcufHeaderDrawerHostAdapter?.snapshotResources().mutationSubscribers === 1 && document.querySelector('.dcuf-header-drawer__toggle'));
            await settle(page);
            await page.evaluate(() => {
                const selector = '.issue_contentbox, #gall_top_recom, #hot_rank_pop2, .btn_hotall_list';
                window.__pilotBaseline = { nodes: Array.from(document.querySelectorAll(selector)).map(node => ({ node, parent: node.parentNode, onclick: node.getAttribute('onclick') })), gm: window.__dcufTestbedGM.snapshot(), resources: window.__dcufHeaderDrawerHostAdapter.snapshotResources() };
            });
            const toggle = page.locator('.dcuf-header-drawer__toggle');
            await toggle.click(); await settle(page);
            const visual = await page.evaluate(() => {
                const toggle = document.querySelector('.dcuf-header-drawer__toggle'), body = document.querySelector('.dcuf-header-drawer__body');
                const a = toggle.parentElement.getBoundingClientRect(), r = body.getBoundingClientRect(), s = getComputedStyle(toggle);
                return { label: toggle.querySelector('.dcuf-header-drawer__toggle-label').textContent, icon: toggle.querySelectorAll('[aria-hidden="true"]').length, radius: s.borderRadius, color: s.color, padding: s.padding, direction: s.flexDirection, expectedAnchor: a.right, left: r.left, width: r.width, right: r.right, open: toggle.getAttribute('aria-expanded') };
            });
            assert.equal(visual.open, 'true'); assert.ok(visual.label.length > 0);
            assert.equal(visual.icon > 0, Boolean(variant.icon));
            if (variant.reversed) assert.equal(visual.direction, 'row-reverse');
            assert.ok(Math.abs(visual.width - Math.min(variant.cap, testCase.width - 24)) <= 1.1, 'Owned width follows presenter policy');
            assert.ok(visual.left >= 11 && visual.right <= testCase.width - 11, 'Positive drawer containment');
            validateBodyPhase(await page.evaluate(captureBodyPhase));
            if (testCase.id === 'phone-layout-light') await page.locator('.issue_contentbox').screenshot({ path: path.join(output, `${variant.id}-open.png`) });
            await page.evaluate(() => {
                const added = document.createElement('div'); added.dataset.pilotContent = '1'; added.style.height = '37px'; added.textContent = '동적 대문 내용';
                document.querySelector('.dcuf-header-drawer__body-inner').append(added);
                window.__dcufHeaderDrawerHostAdapter.refresh();
            });
            await settle(page); validateBodyPhase(await page.evaluate(captureBodyPhase));
            await page.evaluate(() => { document.querySelector('[data-pilot-content]').remove(); window.__dcufHeaderDrawerHostAdapter.refresh(); });
            await settle(page); validateBodyPhase(await page.evaluate(captureBodyPhase));
            if (testCase.id === 'wide') {
                for (const width of [390, 1280]) {
                    await page.setViewportSize({ width, height: width === 390 ? 480 : 900 });
                    await page.evaluate(() => window.__dcufHeaderDrawerHostAdapter.refresh()); await settle(page);
                    const resized = await page.locator('.dcuf-header-drawer__body').boundingBox();
                    assert.ok(resized && Math.abs(resized.width - Math.min(variant.cap, width - 24)) <= 1.1 && resized.x >= 11 && resized.x + resized.width <= width - 11, 'Resize/reset retains presenter width policy and containment');
                    validateBodyPhase(await page.evaluate(captureBodyPhase));
                }
            }
            if (testCase.major) await page.locator('#gall_top_recom button').click();
            else {
                await page.locator('.btn_hotall_list').click();
                await page.locator('#hot_rank_pop2').waitFor({ state: 'visible' });
                await page.locator('#hot_rank_pop2 button').click();
            }
            await toggle.focus(); await page.evaluate(() => window.__dcufHeaderDrawerHostAdapter.refresh());
            assert.ok(await toggle.evaluate(e => e === document.activeElement), 'Refresh retains original button focus');
            await toggle.press('Enter'); await settle(page);
            assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
            await toggle.click(); await toggle.click(); await settle(page);
            assert.equal(await toggle.getAttribute('aria-expanded'), 'false', 'Rapid toggle order preserved');
            const semantic = await page.evaluate(() => {
                const saved = window.__pilotBaseline, gm = window.__dcufTestbedGM.snapshot();
                return { identity: saved.nodes.length > 0 && saved.nodes.every(({ node, parent, onclick }) => node.isConnected && node.parentNode === parent && node.getAttribute('onclick') === onclick), storage: JSON.stringify(saved.gm.values) === JSON.stringify(gm.values) && saved.gm.writes.length === gm.writes.length, nativeCalls: window.__pilotNativeCalls ?? window.__fixtureHotRankToggles, resources: window.__dcufHeaderDrawerHostAdapter.snapshotResources(), focus: document.activeElement === document.querySelector('.dcuf-header-drawer__toggle') };
            });
            assert.equal(semantic.identity, true); assert.equal(semantic.storage, true); assert.equal(semantic.focus, true);
            assert.equal(semantic.nativeCalls, testCase.major ? 1 : 2, 'Original native handler receives trusted input');
            assert.deepEqual(semantic.resources, await page.evaluate(() => window.__pilotBaseline.resources));
            if (testCase.id === 'phone-layout-light') {
                await page.locator('.page_head:has(.dcuf-header-drawer__toggle)').screenshot({ path: path.join(output, `${variant.id}.png`) });
            }
            await page.evaluate(() => window.__dcufHeaderDrawerHostAdapter.dispose()); await settle(page);
            assert.ok(Object.values(await page.evaluate(() => window.__dcufHeaderDrawerHostAdapter.snapshotResources())).every(v => v === false || v === 0));
            await page.evaluate(() => { window.__dcufHeaderDrawerHostAdapter.connect(); window.__dcufHeaderDrawerHostAdapter.refresh(); }); await settle(page);
            assert.deepEqual(await page.evaluate(() => window.__dcufHeaderDrawerHostAdapter.snapshotResources()), semantic.resources, 'Reconnect recovers the same bounded owners');
            assertNoRuntimeErrors(await getMetrics(page), session.consoleErrors);
            report.observations.push({ variant: variant.id, case: testCase.id, visual, semantic, contentRefreshAndReset: true, resizeAndRestore: testCase.id === 'wide', disposalAndReconnect: true });
            console.log(`PASS ${variant.id}/${testCase.id}`);
        } finally { await session.close(); }
    }
    for (const testCase of cases) {
        const group = report.observations.filter(o => o.case === testCase.id);
        for (const candidate of group.slice(1)) assert.deepEqual(candidate.semantic, group[0].semantic, `Preserved semantic receipt: ${candidate.variant}/${testCase.id}`);
    }
    const changedVisuals = report.observations.filter(o => o.case === 'phone-layout-light');
    const requireVisibleDelta = candidate => assert.notDeepEqual(candidate.visual, changedVisuals[0].visual, 'A replacement must have a measured visible delta');
    for (const v of changedVisuals.filter(v => !['control', 'restored'].includes(v.variant))) requireVisibleDelta(v);
    assert.throws(() => requireVisibleDelta(changedVisuals.at(-1)), 'An unchanged/restored UI cannot qualify as a distinct variant');
    assert.deepEqual(changedVisuals.at(-1).visual, changedVisuals[0].visual, 'Restored composition equals original');
    process.env.DCUF_TESTBED_USERSCRIPT = negativePath;
    const negative = await createTestPage(browser, server.baseUrl, { viewport: { width: 1280, height: 900 }, storage: { [storageKeys.threshold]: 0, [storageKeys.ratioEnabled]: false } });
    try {
        await negative.goto('/mgallery/board/lists?id=test');
        await negative.page.locator('#dcuf-testbed-controls').evaluate(e => { e.style.display = 'none'; });
        await negative.page.locator('.dcuf-header-drawer__toggle').click(); await settle(negative.page);
        const error = await negative.page.evaluate(() => {
            const a = document.querySelector('.dcuf-header-drawer').getBoundingClientRect(), r = document.querySelector('.dcuf-header-drawer__body').getBoundingClientRect();
            const expected = Math.min(Math.max(12, a.right - 560), innerWidth - 560 - 12);
            return r.left - expected;
        });
        assert.ok(Math.abs(error) >= 79, 'Retained hardcoded adapter negative must expose approximately80px placement error');
        report.negatives.hardcodedAdapterAnchorError = error;
    } finally { await negative.close(); }
    for (const p of sourcePaths) assert.equal(sha(await readFile(p)), sourceHashes[p]);
    assert.equal(sha(normalize(await readFile(sourcePath, 'utf8'))), report.presenterSourceSha256, 'Presenter production source is read-only');
    assert.equal(sha(await readFile(guard)), report.control.sha256, 'Guarded production runtime is unchanged');
    report.negatives.unchangedVariantRejected = true; report.negatives.hiddenAdapterEditRejected = true; report.negatives.globalCssRejected = true;
    report.status = 'PASS';
} finally {
    await browser?.close(); await server.close();
    await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(`Header replaceability pilot ${report.status}: ${report.observations.length} fresh contexts; four distinct scenarios and exact restoration.`);
