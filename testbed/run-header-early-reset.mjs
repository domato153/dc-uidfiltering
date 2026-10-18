import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { loadHarnessSource } from './harness/userscript-loader.mjs';
import { storageKeys } from './harness/runner-utils.mjs';
import { startServer } from './server/server.mjs';
import { withHeaderDarkToggleFixture } from './fixtures/header-dark-toggle.mjs';
import { runHeaderTypeaContract } from './header-typea-contract.mjs';

// A bounded early-reset contract. It does not admit the whole header or emulate
// the observed phone's visual scale/client height/engine. Never submit publicly.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const typeaContract = args.includes('--typea-contract');
const required = flag => { const i = args.indexOf(flag); assert.ok(i >= 0 && args[i + 1], flag); return args[i + 1]; };
assert.ok(args.includes('--require-runtime-under-test'), 'Source runtime guard required');
const candidate = path.join(root, 'testbed/artifacts/runtime-under-test.user.js');
const control = path.resolve(root, required('--control'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
assert.equal(sha(await readFile(control)), required('--expected-control-sha').toUpperCase());
const output = path.resolve(root, required('--output'));
assert.ok(output.startsWith(path.join(root, 'testbed/artifacts') + path.sep));
await mkdir(path.dirname(output), { recursive: true });
const { chromium } = createRequire(import.meta.url)('./harness/playwright-loader.cjs');
const browser = await chromium.launch({ headless: true, args: ['--disable-background-timer-throttling',
    '--blink-settings=primaryPointerType=2,availablePointerTypes=2,primaryHoverType=2,availableHoverTypes=2,maxTouchPoints=5,forceTouchEventFeatureDetectionForInspector=true'] });
const server = await startServer();
const routes = ['/board/lists?id=test', '/mgallery/board/lists?id=test', '/mini/board/lists?id=test', '/mgallery/board/view?id=test&no=1001&header=1'];
const cases = routes.flatMap(route => [false, true].map(dark => ({ route, dark, width: 980, height: 2306 })))
    .concat([{ route: routes[1], dark: false, width: 390, height: 844 }, { route: routes[1], dark: true, width: 1280, height: 900 }]);
const report = { scope: typeaContract ? 'EARLY_RESET_AND_TYPEA_APPLICABILITY_ONLY' : 'EARLY_RESET_ONLY', browser: browser.version(),
    inputs: Object.fromEntries(await Promise.all(['testbed/run-header-early-reset.mjs', 'testbed/header-typea-contract.mjs',
        'testbed/fixtures/header-dark-toggle.mjs'].map(async file => [file, sha(await readFile(path.join(root, file)))]))),
    control: { path: control, sha256: sha(await readFile(control)) },
    candidate: { path: candidate, sha256: sha(await readFile(candidate)) }, observations: [] };
console.log(JSON.stringify({ control: report.control, candidate: report.candidate, browser: report.browser }));
try {
    for (const testCase of cases) {
        const sides = {};
        for (const [side, runtime] of [['control', control], ['candidate', candidate]]) {
            process.env.DCUF_TESTBED_USERSCRIPT = runtime;
            const context = await browser.newContext({ viewport: { width: testCase.width, height: testCase.height },
                screen: { width: 412, height: 1006 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: false,
                userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36' });
            await context.addInitScript({ content: await loadHarnessSource({ storage: { [storageKeys.threshold]: 0,
                [storageKeys.ratioEnabled]: false, [storageKeys.personalEnabled]: true,
                [storageKeys.personalList]: { uids: [], nicknames: [], ips: [] } } }) });
            const page = await context.newPage();
            try {
                await page.route('**' + testCase.route, async request => {
                    const response = await request.fetch();
                    let html = withHeaderDarkToggleFixture(await response.text());
                    // Stable normal rules observed via public major/minor CDP.
                    // Do not model invented host important/inline conflicts as live.
                    html = html.replace('</head>', `<style id="fixture-observed-early-reset">
                        .dcheader,.gnb_bar {margin:0;padding:0}
                        .gnb_bar {position:relative;min-width:1050px}
                        .width1160 .gnb_bar {min-width:1160px}
                    </style></head>`);
                    if (testCase.dark) html = html.replace('>로그인</a>', '>로그아웃</a>');
                    await request.fulfill({ response, body: html });
                });
                await page.goto(server.baseUrl + testCase.route, { waitUntil: 'domcontentloaded' });
                await page.waitForFunction(() => document.querySelector('[data-dcuf-header-shell-role="head"]')
                    && document.querySelector('[data-dcuf-header-gnb-role="nav"]'));
                if (testCase.dark) {
                    await page.evaluate(() => { const s = document.createElement('style'); s.id = 'css-darkmode'; document.head.append(s); });
                    await page.waitForFunction(() => document.body.classList.contains('dc-filter-dark-mode'));
                }
                const typea = typeaContract ? await runHeaderTypeaContract(page) : null;
                const observations = await page.evaluate(side => {
                    const check = (ok, message) => { if (!ok) throw Error(message); };
                    const normalized = ['float', 'position', 'margin', 'padding'];
                    const retained = ['width', 'min-width', 'box-sizing'];
                    const properties = [...retained, ...normalized];
                    const walk = rules => [...rules].flatMap(r => r.selectorText && r.style ? [r] : r.cssRules ? walk(r.cssRules) : []);
                    const rules = [...document.styleSheets].flatMap(s => { try { return walk(s.cssRules); } catch { return []; } });
                    const surfaces = [['.dcheader', window.__dcufHeaderShellHostAdapter], ['.gnb_bar', window.__dcufHeaderGnbHostAdapter]]
                        .map(([selector, adapter]) => {
                            const matches = rules.filter(r => r.selectorText === selector && properties.every(p => r.style.getPropertyValue(p)));
                            check(matches.length === 1, 'unique original early reset ' + selector);
                            const rule = matches[0];
                            check(retained.every(p => rule.style.getPropertyPriority(p) === 'important'), 'retained containment priorities');
                            check(normalized.every(p => rule.style.getPropertyPriority(p) === 'important'), 'retained early inline collision protection');
                            return { root: document.querySelector(selector), rule, adapter };
                        });
                    const shell = surfaces[0].root;
                    const nodes = [shell, ...shell.querySelectorAll('*')];
                    const original = nodes.map(n => [n, n.parentNode, n.nextSibling, n.getAttribute('onclick'), n.getAttribute('href')]);
                    const gm = window.__dcufTestbedGM.snapshot();
                    const sample = () => nodes.map(n => { const r = n.getBoundingClientRect(), s = getComputedStyle(n); return {
                        tag: n.tagName, box: [r.x, r.y, r.width, r.height],
                        css: ['display', 'width', 'height', 'min-width', 'box-sizing', 'float', 'position', 'margin', 'padding', 'visibility'].map(p => s.getPropertyValue(p)) }; });
                    const states = [];
                    const save = label => states.push({ label, nodes: sample() });
                    save('settled');
                    for (const { adapter } of surfaces) { adapter.dispose(); check(Object.values(adapter.snapshotResources()).every(x => x === 0), 'disposed resource closure'); }
                    save('raw-unprojected');
                    shell.classList.remove('typea'); save('raw-non-typea');
                    const inlineNegatives = [];
                    for (const { root, rule } of surfaces) {
                        const probe = document.createElement('div');
                        probe.className = root.classList.contains('gnb_bar') ? 'gnb_bar' : 'dcheader';
                        probe.style.cssText = 'width:317px;min-width:401px;float:right;position:static;box-sizing:content-box;margin:17px;padding:19px';
                        document.body.append(probe);
                        const read = () => properties.map(p => getComputedStyle(probe).getPropertyValue(p));
                        const before = read();
                        check(before.slice(1).join('|') === '0px|border-box|none|relative|0px|0px', 'positive raw normal-inline containment');
                        const saved = rule.style.cssText;
                        try {
                            for (const property of properties) {
                                rule.style.setProperty(property, rule.style.getPropertyValue(property));
                                const after = read();
                                check(before[properties.indexOf(property)] !== after[properties.indexOf(property)], 'causal inline collision ' + property);
                                inlineNegatives.push({ root: probe.className, property, before, after });
                                rule.style.cssText = saved;
                                check(JSON.stringify(read()) === JSON.stringify(before), 'exact reset restoration');
                            }
                        } finally { rule.style.cssText = saved; probe.remove(); }
                    }
                    const gnb = surfaces[1];
                    const baseline = gnb.root.getBoundingClientRect().width;
                    const value = gnb.rule.style.getPropertyValue('min-width');
                    gnb.rule.style.setProperty('min-width', value);
                    const withoutProtection = gnb.root.getBoundingClientRect().width;
                    gnb.rule.style.setProperty('min-width', value, 'important');
                    check(getComputedStyle(gnb.root).minWidth === '0px', 'raw min-width restored');
                    if (innerWidth < 1160) check(withoutProtection >= 1160 && withoutProtection > baseline, 'actual native minimum-width negative');
                    shell.classList.add('typea');
                    for (const { adapter } of surfaces) adapter.connect(document, { runtimeCoordinator: window.__dcufRuntimeCoordinator });
                    save('reconnected');
                    check(JSON.stringify(states[0].nodes) === JSON.stringify(states.at(-1).nodes), 'reconnect restores complete header composition');
                    check(original.every(([n, parent, next, onclick, href]) => n.parentNode === parent && n.nextSibling === next
                        && n.getAttribute('onclick') === onclick && n.getAttribute('href') === href), 'native identity/topology/handlers');
                    check(JSON.stringify(gm) === JSON.stringify(window.__dcufTestbedGM.snapshot()), 'settings preserved');
                    const input = shell.querySelector('#preSWord');
                    window.__earlyResetNative = { input, parent: input.parentNode, form: input.form,
                        formAttrs: ['action', 'method', 'accept-charset'].map(n => input.form.getAttribute(n)), events: [], links: [] };
                    input.form.addEventListener('submit', event => { window.__earlyResetNative.events.push({ type: 'submit', trusted: event.isTrusted }); event.preventDefault(); });
                    for (const a of shell.querySelectorAll('.btn_top_loginout,.gnb_list a')) a.addEventListener('click', event => {
                        window.__earlyResetNative.links.push({ href: a.getAttribute('href'), trusted: event.isTrusted, prevented: event.defaultPrevented });
                    });
                    return { states, inlineNegatives, minWidthNegative: { baseline, withoutProtection }, login: shell.querySelector('.btn_top_loginout').textContent };
                }, side);
                const input = page.locator('#preSWord');
                await input.fill('긴 검색어 native input 보존 12345'); await input.press('Enter');
                await page.locator('#searchSubmit').click();
                await page.locator('#searchSubmit').focus(); await page.keyboard.press('Enter');
                const native = await page.evaluate(() => {
                    const p = window.__earlyResetNative;
                    if (p.input !== document.querySelector('#preSWord') || p.input.parentNode !== p.parent || p.input.form !== p.form
                        || JSON.stringify(p.formAttrs) !== JSON.stringify(['action', 'method', 'accept-charset'].map(n => p.form.getAttribute(n)))) throw Error('native form drift');
                    return { events: p.events, value: p.input.value, calls: window.__fixtureNativeHeader.searchCalls, trusted: window.__fixtureNativeHeader.trusted };
                });
                assert.equal(native.events.length, 3); assert.ok(native.events.every(e => e.trusted));
                assert.equal(native.calls, 3); assert.ok(native.trusted.every(Boolean));
                const anchors = ['.btn_top_loginout', '.gnb_list a'];
                for (const selector of anchors) {
                    const link = page.locator(selector).first();
                    await link.click();
                    assert.equal(new URL(page.url()).hash, await link.getAttribute('href'));
                    await link.focus(); await page.keyboard.press('Enter');
                    assert.equal(new URL(page.url()).hash, await link.getAttribute('href'));
                }
                await input.focus();
                const after = await page.evaluate(() => {
                    window.__dcufHeaderShellHostAdapter.refresh(document);
                    window.__dcufHeaderGnbHostAdapter.refresh(document);
                    return { links: window.__earlyResetNative.links, focus: document.activeElement === window.__earlyResetNative.input,
                        errors: window.__dcufTestbedMetrics.snapshot().errors };
                });
                assert.equal(after.links.length, 4); assert.ok(after.links.every(e => e.trusted && !e.prevented));
                assert.equal(after.focus, true); assert.deepEqual(after.errors, []);
                sides[side] = { ...observations, native, after, ...(typeaContract ? { typea } : {}) };
                if (side === 'candidate' && testCase.width === 980 && testCase.route === routes[1])
                    await page.screenshot({ path: path.join(path.dirname(output), `early-reset-${testCase.dark ? 'dark' : 'light'}.png`), fullPage: false });
            } finally { await context.close(); }
        }
        assert.deepEqual(sides.candidate, sides.control, 'separate fresh context semantic/geometry/native differential');
        report.observations.push({ ...testCase, ...sides.candidate });
        console.log(`PASS ${testCase.route} ${testCase.width} ${testCase.dark ? 'dark/logout-label' : 'light/login'}`);
    }
    report.status = 'PASS';
} finally {
    await writeFile(output, JSON.stringify(report, null, 2) + '\n');
    await browser.close(); await server.close();
}
