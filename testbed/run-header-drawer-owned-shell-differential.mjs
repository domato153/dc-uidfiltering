import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './server/server.mjs';
import { createTestPage, launchBrowser, storageKeys, getMetrics, assertNoRuntimeErrors } from './harness/runner-utils.mjs';
import { createCandidateFingerprint, createEvidenceBinding } from '../tools/evidence-binding.mjs';
import { loadDrawerPresenter, validateBodyPresenterFaults, validateBodyObservation, captureBodyPhase, validateBodyPhase } from './header-drawer-body-contract.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const bodyBoundary = args.includes('--body-boundary');
const value = flag => {
    const index = args.indexOf(flag);
    assert.ok(index >= 0 && args[index + 1] && !args[index + 1].startsWith('--'), `Missing ${flag}`);
    return args[index + 1];
};
assert.ok(args.includes('--require-runtime-under-test'), 'Source runtime guard required');
const candidate = path.join(root, 'testbed/artifacts/runtime-under-test.user.js');
const controlBinding = JSON.parse(await readFile(path.resolve(root, value('--control-binding')), 'utf8'));
const control = path.resolve(root, controlBinding.artifact.path);
const output = path.resolve(root, value('--output'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const controlBytes = await readFile(control), candidateBytes = await readFile(candidate);
assert.equal(sha(controlBytes), controlBinding.artifact.sha256, 'Frozen control drift');
assert.notEqual(sha(candidateBytes), sha(controlBytes), 'Control cannot equal candidate');
assert.equal(candidateBytes.toString().match(/^\/\/\s*@name\s+(.+)$/m)?.[1]?.trim(), 'DC_UserFilter_Mobile');
console.log(`Owned-shell candidate: ${candidate}; SHA-256 ${sha(candidateBytes)}`);
const presenterPath = 'src/targets/mobile/header-drawer-presenter.js';
const presenterSource = await readFile(path.join(root, presenterPath), 'utf8');
const canonical = text => text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').trimEnd();
assert.ok(canonical(candidateBytes.toString()).includes(canonical(presenterSource)), 'Built presenter drift');
const oldAdapter = controlBytes.toString().split('const __dcufHeaderDrawerHostAdapter = (() => {')[1]
    ?.split('__dcufRoot.__dcufHeaderDrawerHostAdapter =')[0];
let expectedHtml;
if (bodyBoundary) {
    const text = controlBytes.toString();
    const start = text.indexOf('function __dcufBuildHeaderDrawerThemeCss(');
    const end = text.indexOf('__dcufRoot.__dcufHeaderDrawerPresenter =');
    assert.ok(start >= 0 && end > start, 'Immediate owned-shell control presenter required');
    expectedHtml = loadDrawerPresenter(text.slice(start, end) + '__dcufRoot.__dcufHeaderDrawerPresenter = __dcufHeaderDrawerPresenter;').shell.html;
} else {
    const oldTemplate = oldAdapter?.match(/drawer\.innerHTML = (`[\s\S]*?`);/)?.[1];
    assert.ok(oldTemplate, 'Immediate control owned template required');
    const oldLabel = oldAdapter.match(/const CLOSED_LABEL = ('[^']*');/)?.[1];
    expectedHtml = vm.runInNewContext(oldTemplate, { CLOSED_LABEL: vm.runInNewContext(oldLabel) });
}
const adapterSource = await readFile(path.join(root, 'src/targets/mobile/header-drawer-host-adapter.js'), 'utf8');
assert.ok(canonical(candidateBytes.toString()).includes(canonical(adapterSource)), 'Built adapter drift');
const styleMount = source => canonical(source.slice(source.indexOf('const ensureDrawerStyle ='), source.indexOf('const resolveDrawerMount =')));
assert.equal(styleMount(adapterSource), styleMount(oldAdapter), 'Style mounting phase changed');
const loadPresenter = source => {
    const context = { __dcufRoot: {} }; // No DOM, GM, network or scheduler globals.
    vm.runInNewContext(source, context, { timeout: 1000 });
    return context.__dcufRoot.__dcufHeaderDrawerPresenter;
};
const validatePresenter = presenter => {
    assert.ok(Object.isFrozen(presenter.shell) && Object.isFrozen(presenter.shell.initialState));
    assert.equal(presenter.shell.tagName, 'div');
    assert.equal(presenter.shell.className, 'dcuf-header-drawer');
    assert.equal(presenter.shell.html, expectedHtml, 'Control template whitespace/meaning changed');
    for (const open of [false, true, false]) {
        const input = Object.freeze({ open });
        const description = presenter.describeOpenState(input);
        assert.ok(Object.isFrozen(description));
        assert.deepEqual(JSON.parse(JSON.stringify(description)), {
            dataOpen: open ? '1' : '0', ariaExpanded: open ? 'true' : 'false',
            label: open ? '갤러리 대문 닫기' : '갤러리 대문 열기'
        });
        assert.equal(input.open, open);
    }
};
validatePresenter(loadPresenter(presenterSource));
const bodyDescriptorFaults = bodyBoundary ? validateBodyPresenterFaults(presenterSource) : 0;
const descriptorFaults = [
    ["label: '갤러리 대문 닫기'", "label: '잘못된 문구'"],
    ["ariaExpanded: 'true'", "ariaExpanded: 'false'"],
    ['class="dcuf-header-drawer__body-inner"', 'class="missing-owned-body"']
];
for (const [from, to] of descriptorFaults) {
    assert.ok(presenterSource.includes(from), 'Selected mutation missing');
    assert.throws(() => validatePresenter(loadPresenter(presenterSource.replace(from, to))), assert.AssertionError);
}
const validateOwned = (owned, open) => {
    assert.equal(owned.count, 1, 'Exactly one owned shell');
    assert.equal(owned.type, 'button', 'Native default control type');
    assert.equal(owned.bodyCount, 1, 'Owned body required');
    assert.equal(owned.dataOpen, open ? '1' : '0');
    assert.equal(owned.aria, open ? 'true' : 'false');
    assert.equal(owned.label, open ? '갤러리 대문 닫기' : '갤러리 대문 열기');
};
const cases = [390, 750, 1280].flatMap(width => [false, true].map(dark => ({ id: `minor-${width}-${dark}`, width, dark,
    route: '/mgallery/board/lists?id=test', list: true })));
if (bodyBoundary) cases.push({ id: 'minor-short', width: 390, height: 480, route: '/mgallery/board/lists?id=test', list: true });
if (bodyBoundary) cases.push(...[false, true].map(dark => ({ id: `major-recom-${dark}`, width: 1280, dark,
    route: '/board/lists?id=test', list: true, recom: true })));
cases.push({ id: 'view', width: 750, route: '/mgallery/board/view?id=test&no=1001&header=1' },
    { id: 'write', width: 1280, route: '/mgallery/board/write?id=test' });
const report = {
    kind: bodyBoundary ? 'header-drawer-owned-body-zero-delta' : 'header-drawer-owned-shell-zero-delta', scope: 'BOUNDED_SYNTHETIC_NOT_HEADER_STAGE_RECEIPT', status: 'PARTIAL',
    sourceBaseHead: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim(),
    candidateFingerprint: await createCandidateFingerprint(root), evidenceBinding: await createEvidenceBinding(root),
    sourceHashes: { [presenterPath]: sha(presenterSource), 'src/targets/mobile/header-drawer-host-adapter.js': sha(adapterSource) },
    controlBinding, candidate: { path: candidate, sha256: sha(candidateBytes) }, descriptorFaults: descriptorFaults.length,
    observerSha256: sha(await readFile(fileURLToPath(import.meta.url))),
    bodyContractSha256: sha(await readFile(path.join(root, 'testbed/header-drawer-body-contract.mjs'))),
    bodyDescriptorFaults, bodyDomFaults: 0, sides: {}, differences: [], rawStyleOrderDifferences: [], domFaults: 0
};
await mkdir(path.dirname(output), { recursive: true });
const server = await startServer();
let browser;
const settle = page => page.waitForFunction(() => {
    const m = window.__dcufTestbedMetrics.snapshot();
    return m.activeTimeouts === 0 && m.activeAnimationFrames === 0 && m.activeIntervals === 0
        && document.getAnimations().every(animation => animation.playState !== 'running');
});
try {
    browser = await launchBrowser();
    report.browser = browser.version();
    for (const [side, runtime] of Object.entries({ control, candidate })) {
        process.env.DCUF_TESTBED_USERSCRIPT = runtime;
        process.env.DCUF_TESTBED_TARGET = 'mobile';
        const observations = report.sides[side] = [];
        for (const testCase of cases) {
            const session = await createTestPage(browser, server.baseUrl, { viewport: { width: testCase.width, height: testCase.height || 900 },
                storage: { [storageKeys.threshold]: 0, [storageKeys.ratioEnabled]: false,
                    [storageKeys.personalEnabled]: true, [storageKeys.personalList]: { uids: [], nicknames: [], ips: [] } } });
            try {
                const page = session.page;
                await session.goto(testCase.route);
                if (testCase.dark) await page.evaluate(() => window.__dcufFixture.toggleDark(true));
                if (testCase.recom) await page.evaluate(() => {
                    // Same sampled major recommendation parent/root shape as the existing native tests.
                    const wrap = document.createElement('div'); wrap.className = 'issue_wrap';
                    wrap.innerHTML = '<div class="issuebox gallery_box"><section id="gall_top_recom" class="concept_wrap">'
                        + '<div class="pageing_box"><button type="button" class="btn_bluenext">다음</button></div>'
                        + '<ul class="concept_txtlist"><li><a href="/board/view?id=test&no=1001">추천글</a></li></ul></section></div>';
                    document.querySelector('#container article').prepend(wrap);
                    window.__bodyRecomCalls = 0;
                    wrap.querySelector('button').addEventListener('click', () => { window.__bodyRecomCalls += 1; });
                    window.__dcufHeaderDrawerHostAdapter.refresh();
                });
                await page.locator('#dcuf-testbed-controls').evaluate(el => { el.style.display = 'none'; });
                if (!testCase.list) {
                    const absent = await page.evaluate(() => ({ drawerCount: document.querySelectorAll('.dcuf-header-drawer').length,
                        styleCount: document.querySelectorAll('#dcuf-header-drawer-style').length }));
                    assert.deepEqual(absent, { drawerCount: 0, styleCount: 0 });
                    observations.push({ caseId: testCase.id, step: 'initial', applicability: 'DRAWER_ABSENT_NOT_GLOBAL_LIFECYCLE_CLOSURE', ...absent });
                    continue;
                }
                if (testCase.list) await page.waitForFunction(() => window.__dcufHeaderDrawerHostAdapter?.snapshotResources().mutationSubscribers === 1
                    && document.querySelector('.dcuf-header-drawer__toggle'));
                await settle(page);
                await page.evaluate(() => {
                    const selectors = ['.dcuf-header-drawer', '.dcuf-header-drawer__toggle', '.issue_contentbox', '#hot_rank_pop2',
                        '.dcuf-header-drawer__body', '.dcuf-header-drawer__body-inner', '#gall_top_recom', '#gall_top_recom button'];
                    const nodes = selectors.map(selector => document.querySelector(selector));
                    window.__ownedShellBaseline = { selectors, nodes, topology: nodes.map(node => node ? [node.parentNode, node.nextSibling] : []),
                        gm: window.__dcufTestbedGM.snapshot(), resources: window.__dcufHeaderDrawerHostAdapter?.snapshotResources() };
                    window.__readOwnedShell = () => {
                        const drawer = document.querySelector('.dcuf-header-drawer'), toggle = drawer?.querySelector('button');
                        return { count: document.querySelectorAll('.dcuf-header-drawer').length, type: toggle?.getAttribute('type') ?? null,
                            bodyCount: drawer?.querySelectorAll('.dcuf-header-drawer__body-inner').length ?? 0,
                            dataOpen: drawer?.getAttribute('data-open') ?? null, aria: toggle?.getAttribute('aria-expanded') ?? null,
                            label: toggle?.textContent.trim() ?? null, html: drawer?.innerHTML ?? null };
                    };
                    window.__readOwnedBody = () => {
                        const body = document.querySelector('.dcuf-header-drawer__body');
                        const inner = body?.querySelector('.dcuf-header-drawer__body-inner');
                        if (!body || !inner) return null;
                        const rect = body.getBoundingClientRect(), c = getComputedStyle(body);
                        const source = document.querySelector('.issue_contentbox');
                        const names = ['display', 'visibility', 'opacity', 'pointer-events', 'overflow', 'max-height', '--dcuf-header-drawer-inline-start'];
                        return { inline: names.map(name => ({ name, value: body.style.getPropertyValue(name), priority: body.style.getPropertyPriority(name) })),
                            rawInlineOrder: [...body.style], rawInlineText: body.style.cssText,
                            rect: [rect.x, rect.y, rect.width, rect.height],
                            computed: { display: c.display, visibility: c.visibility, opacity: c.opacity, pointerEvents: c.pointerEvents, overflow: c.overflow },
                            paddingTop: inner.style.paddingTop, hasChildren: inner.childElementCount > 0,
                            sourceRect: source ? [source.getBoundingClientRect().x, source.getBoundingClientRect().y, source.getBoundingClientRect().width, source.getBoundingClientRect().height] : null,
                            innerScrollHeight: inner.scrollHeight, sourceHeight: source?.getBoundingClientRect().height ?? null,
                            viewportWidth: window.innerWidth };
                    };
                });
                const capture = async step => {
                    await settle(page);
                    const observation = await page.evaluate(() => {
                        const saved = window.__ownedShellBaseline, gm = window.__dcufTestbedGM.snapshot(), m = window.__dcufTestbedMetrics.snapshot();
                        return { owned: window.__readOwnedShell(), identity: saved.nodes.map((node, i) => node === document.querySelector(saved.selectors[i])
                            && (!node || (node.parentNode === saved.topology[i][0] && node.nextSibling === saved.topology[i][1]))),
                            styles: saved.selectors.map(selector => {
                                const node = document.querySelector(selector); if (!node) return null;
                                const r = node.getBoundingClientRect(), c = getComputedStyle(node);
                                return { rect: [r.x, r.y, r.width, r.height].map(n => Math.round(n * 10) / 10),
                                    display: c.display, visibility: c.visibility, color: c.color, background: c.backgroundColor,
                                    position: c.position, opacity: c.opacity, pointerEvents: c.pointerEvents };
                            }), nativeCalls: window.__fixtureHotRankToggles ?? 0, recomCalls: window.__bodyRecomCalls ?? 0,
                            resources: window.__dcufHeaderDrawerHostAdapter?.snapshotResources(),
                            gm: { values: gm.values, writes: gm.writes.map(({ key, value }) => ({ key, value })) },
                            pending: [m.activeTimeouts, m.activeAnimationFrames, m.activeIntervals], listenerCount: m.activeListenerKeys,
                            requests: { fetch: m.fetchRequests?.length ?? 0, xhr: m.xhrRequests.length },
                            rawStyleOrder: [...document.querySelectorAll('style[id]')].map(node => node.id),
                            stylesheets: [...document.querySelectorAll('style[id]')].map(node => [node.id, node.textContent]).sort((a, b) => a[0].localeCompare(b[0])),
                            errors: m.errors };
                    });
                    if (bodyBoundary) {
                        if (['open', 'open-with-content', 'open-empty'].includes(step)) {
                            observation.bodyPhase = await page.evaluate(captureBodyPhase);
                            validateBodyPhase(observation.bodyPhase);
                        }
                        observation.body = await page.evaluate(() => window.__readOwnedBody());
                    }
                    observations.push({ caseId: testCase.id, step, ...observation });
                    if (bodyBoundary && step !== 'disposed') validateBodyObservation(observation.body, observation.owned.dataOpen === '1');
                    return observation;
                };
                const initial = await capture('initial');
                validateOwned(initial.owned, false);
                if (side === 'candidate' && testCase.id === cases[0].id) {
                    for (const fault of ['label', 'aria', 'body', 'duplicate']) {
                        const broken = await page.evaluate(fault => {
                            const drawer = document.querySelector('.dcuf-header-drawer'), toggle = drawer.querySelector('button');
                            const html = drawer.innerHTML; let duplicate;
                            if (fault === 'label') drawer.querySelector('.dcuf-header-drawer__toggle-label').textContent = '잘못된 문구';
                            if (fault === 'aria') toggle.setAttribute('aria-expanded', 'true');
                            if (fault === 'body') drawer.querySelector('.dcuf-header-drawer__body-inner').remove();
                            if (fault === 'duplicate') { duplicate = drawer.cloneNode(true); drawer.after(duplicate); }
                            const result = window.__readOwnedShell();
                            if (fault === 'label') drawer.querySelector('.dcuf-header-drawer__toggle-label').textContent = '갤러리 대문 열기';
                            if (fault === 'aria') toggle.setAttribute('aria-expanded', 'false');
                            if (fault === 'body') drawer.innerHTML = html;
                            duplicate?.remove(); return result;
                        }, fault);
                        assert.throws(() => validateOwned(broken, false), assert.AssertionError, `Surviving ${fault} fault`);
                        report.domFaults += 1;
                    }
                    // Only the omission fault replaces test-owned descendants; renew the diagnostic baseline.
                    await page.evaluate(() => {
                        const saved = window.__ownedShellBaseline;
                        saved.nodes = saved.selectors.map(selector => document.querySelector(selector));
                        saved.topology = saved.nodes.map(node => node ? [node.parentNode, node.nextSibling] : []);
                    });
                }
                await page.locator('.dcuf-header-drawer__toggle').click();
                validateOwned((await capture('open')).owned, true);
                if (testCase.recom) await page.locator('#gall_top_recom .btn_bluenext').click();
                else await page.locator('.issue_contentbox .btn_hotall_list').click();
                await capture(testCase.recom ? 'recom-native-action' : 'rank-open');
                await page.locator('.dcuf-header-drawer__toggle').focus();
                await page.evaluate(() => {
                    window.__dcufHeaderDrawerHostAdapter.refresh(); window.__dcufHeaderDrawerHostAdapter.connect();
                    window.dispatchEvent(new Event('resize'));
                });
                await settle(page);
                assert.equal(await page.evaluate(() => document.activeElement === document.querySelector('.dcuf-header-drawer__toggle')), true);
                await page.keyboard.press('Enter');
                if (!testCase.recom) await page.waitForFunction(() => document.querySelector('.issue_contentbox').getAttribute('data-dcuf-header-native-door-popup-only') === '1');
                validateOwned((await capture(testCase.recom ? 'closed-by-enter' : 'popup-only')).owned, false);
                if (!testCase.recom) await page.locator('#hot_rank_pop2 .poply_close').click();
                const closed = await capture('reclosed');
                if (testCase.recom) assert.equal(closed.recomCalls, 1); else assert.equal(closed.nativeCalls, 2);
                assert.ok(closed.identity.every(Boolean));
                if (bodyBoundary) {
                    await page.locator('.dcuf-header-drawer__toggle').click();
                    await page.evaluate(() => {
                        const content = document.createElement('div'); content.className = 'dcuf-body-contract-content';
                        content.style.height = '37px'; content.textContent = 'Body content';
                        document.querySelector('.dcuf-header-drawer__body-inner').append(content);
                        window.__dcufHeaderDrawerHostAdapter.refresh();
                    });
                    const content = await capture('open-with-content');
                    assert.ok(content.body.hasChildren);
                    if (!testCase.recom) assert.ok(parseFloat(content.body.paddingTop) > 0);
                    await page.evaluate(() => {
                        document.querySelector('.dcuf-body-contract-content').remove();
                        window.__dcufHeaderDrawerHostAdapter.refresh();
                    });
                    await capture('open-empty');
                    await page.locator('.dcuf-header-drawer__toggle').click();
                    await capture('empty-reclosed');
                }
                await page.evaluate(() => window.__dcufHeaderDrawerHostAdapter.dispose());
                const disposed = await capture('disposed');
                assert.ok(Object.values(disposed.resources).every(value => value === false || value === 0));
                await page.evaluate(() => window.__dcufHeaderDrawerHostAdapter.connect());
                const restored = await capture('reconnected');
                validateOwned(restored.owned, false); assert.deepEqual(restored.resources, initial.resources);
                assert.deepEqual(restored.gm, initial.gm); assert.deepEqual(restored.pending, [0, 0, 0]);
                assertNoRuntimeErrors(await getMetrics(page), session.consoleErrors);
                if (bodyBoundary && side === 'candidate' && testCase.id === cases[0].id) {
                    // Faults run after all clean paired observations. Restoring a custom property
                    // through setAttribute can reorder CSSOM declarations in Chromium; never
                    // normalize that away or contaminate the clean exact-order comparison.
                    await page.locator('.dcuf-header-drawer__toggle').click();
                    await page.evaluate(() => {
                        const content = document.createElement('div'); content.style.height = '37px';
                        document.querySelector('.dcuf-header-drawer__body-inner').append(content);
                        window.__dcufHeaderDrawerHostAdapter.refresh();
                    });
                    await settle(page);
                    validateBodyObservation(await page.evaluate(() => window.__readOwnedBody()), true);
                    for (const fault of ['display', 'pointer', 'height', 'offset', 'padding']) {
                        const broken = await page.evaluate(fault => {
                            const body = document.querySelector('.dcuf-header-drawer__body'), inner = body.firstElementChild;
                            const bodyStyle = body.getAttribute('style'), innerStyle = inner.getAttribute('style');
                            if (fault === 'display') body.style.setProperty('display', 'none', 'important');
                            if (fault === 'pointer') body.style.setProperty('pointer-events', 'none', 'important');
                            if (fault === 'height') body.style.setProperty('max-height', '0px', 'important');
                            if (fault === 'offset') body.style.removeProperty('--dcuf-header-drawer-inline-start');
                            if (fault === 'padding') inner.style.removeProperty('padding-top');
                            const result = window.__readOwnedBody();
                            if (bodyStyle === null) body.removeAttribute('style'); else body.setAttribute('style', bodyStyle);
                            if (innerStyle === null) inner.removeAttribute('style'); else inner.setAttribute('style', innerStyle);
                            return result;
                        }, fault);
                        assert.throws(() => validateBodyObservation(broken, true), assert.AssertionError, `Surviving body ${fault} fault`);
                        validateBodyObservation(await page.evaluate(() => window.__readOwnedBody()), true);
                        report.bodyDomFaults += 1;
                    }
                    await page.locator('.dcuf-header-drawer__toggle').focus();
                    await page.evaluate(() => { window.__dcufHeaderDrawerHostAdapter.refresh(); window.__dcufHeaderDrawerHostAdapter.connect(); });
                    assert.equal(await page.evaluate(() => document.activeElement === document.querySelector('.dcuf-header-drawer__toggle')), true);
                    await page.keyboard.press('Enter');
                    await settle(page);
                    validateOwned(await page.evaluate(() => window.__readOwnedShell()), false);
                    await page.evaluate(() => window.__dcufHeaderDrawerHostAdapter.dispose());
                    await settle(page);
                    const resources = await page.evaluate(() => window.__dcufHeaderDrawerHostAdapter.snapshotResources());
                    assert.ok(Object.values(resources).every(value => value === false || value === 0));
                    assertNoRuntimeErrors(await getMetrics(page), session.consoleErrors);
                    report.bodyFaultRecovery = 'NATIVE_FOCUS_DEFAULT_ENTER_AND_DISPOSAL_PASS';
                }
            } finally { await session.close(); }
        }
    }
    report.sides.control.forEach((observation, i) => {
        const other = report.sides.candidate[i];
        const { rawStyleOrder: controlOrder, ...controlState } = observation;
        const { rawStyleOrder: candidateOrder, ...candidateState } = other || {};
        if (JSON.stringify(controlOrder) !== JSON.stringify(candidateOrder)) {
            report.rawStyleOrderDifferences.push({ index: i, caseId: observation.caseId, step: observation.step, controlOrder, candidateOrder });
        }
        // The unchanged asynchronous style mount has independently observed control order variance.
        // Require other owners' relative order and the drawer's observed first/last positions.
        if (controlOrder && candidateOrder) {
            const omitDrawer = order => order.filter(id => id !== 'dcuf-header-drawer-style');
            assert.deepEqual(omitDrawer(controlOrder), omitDrawer(candidateOrder), 'Other style phase order changed');
            for (const order of [controlOrder, candidateOrder]) {
                const runtimeOrder = order.filter(id => id !== 'css-darkmode'); // Fixture switch appended after startup.
                const position = runtimeOrder.indexOf('dcuf-header-drawer-style');
                assert.ok(position === -1 || position === 0 || position === runtimeOrder.length - 1, 'Uncharacterized drawer style position');
            }
        }
        if (JSON.stringify(controlState) !== JSON.stringify(candidateState)) report.differences.push({ index: i, caseId: observation.caseId, step: observation.step });
    });
    assert.equal(report.sides.control.length, report.sides.candidate.length);
    assert.deepEqual(report.differences, [], 'Immediate control/candidate differential');
    report.status = bodyBoundary ? 'OWNED_BODY_PASS' : 'OWNED_SHELL_PASS';
    report.rawStyleOrderStatus = report.rawStyleOrderDifferences.length ? 'DIFFERENT_NOT_GLOBAL_PHASE_EQUIVALENCE' : 'EQUAL_IN_THIS_RUN';
} catch (error) { report.error = error.stack; throw error; }
finally {
    await writeFile(output, JSON.stringify(report, null, 2) + '\n');
    await browser?.close(); await server.close();
}
console.log(`Owned drawer differential ${report.status}: ${report.sides.candidate.length} observations/side; ${report.descriptorFaults + report.domFaults + report.bodyDescriptorFaults + report.bodyDomFaults} selected faults rejected; raw style-order differences ${report.rawStyleOrderDifferences.length} (${report.rawStyleOrderStatus}).`);
