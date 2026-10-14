import assert from 'node:assert/strict';
import { selectCases } from './live-site-contract.mjs';

export function selectHeaderCases(contract, startupContract) {
    selectCases(startupContract, 'full');
    assert.equal(startupContract.candidatePath, contract.candidatePath, 'Cross-contract candidate path mismatch');
    assert.equal(contract.schemaVersion, 1);
    assert.equal(contract.candidatePath, 'testbed/artifacts/runtime-under-test.user.js');
    assert.equal(contract.control.path, 'artifacts/controls/header-gnb-6869.user.js');
    assert.equal(contract.control.sha256, '6869B58682E7B4159785C1B7E1F5FD6E8CD597CA602AECAB71904A77B7C00CD5');
    assert.deepEqual(contract.themes, ['light', 'dark']);
    assert.deepEqual(contract.viewports, [
        { id: 'narrow', width: 390, height: 900 }, { id: 'short', width: 390, height: 500 },
        { id: 'medium', width: 750, height: 900 }, { id: 'wide', width: 1280, height: 900 }
    ]);
    assert.equal(contract.routes.length, 2);
    assert.deepEqual(contract.routes.map(r => r.id), ['major', 'minor']);
    for (const route of contract.routes) {
        const url = new URL(route.url);
        assert.equal(url.origin, 'https://gall.dcinside.com');
        assert.equal(url.pathname, route.id === 'minor' ? '/mgallery/board/lists/' : '/board/lists/');
        assert.ok(url.searchParams.get('id'));
    }
    return contract.themes.flatMap(theme => contract.viewports.flatMap(viewport => contract.routes.map(route =>
        ({ ...route, surface: route.id, theme, viewport, id: `${route.id}-${viewport.id}-${theme}` }))));
}

function sameGallery(requested, actual) {
    try {
        const expected = new URL(requested), observed = new URL(actual);
        return expected.origin === 'https://gall.dcinside.com' && observed.origin === expected.origin
            && observed.pathname === expected.pathname && Boolean(expected.searchParams.get('id'))
            && observed.searchParams.get('id') === expected.searchParams.get('id');
    } catch { return false; }
}

export function headerChecks(result) {
    const at = label => result.steps?.find(s => s.label === label)?.observation;
    const action = label => result.steps?.find(s => s.label === label)?.action === 'completed';
    const initial = at('initial'), open = at('drawer-open'), closed = at('drawer-closed');
    const env = result.environment;
    const checks = {
        selectedGallery: sameGallery(result.url, result.finalUrl),
        environment: Boolean(env?.desktopUA && !env.gmShimPresent && env.dark === env.requestedDark
            && env.nativeDarkSheet === env.requestedDark),
        originalSource: Boolean(open?.ready && open.drawerOpen === '1' && open.sourceMarker === '1'
            && open.sourceArea?.every(v => v > 0) && open.sourceHit && open.nativeActionHit && open.childWidthsContained),
        sourceRestoration: Boolean(initial?.sourceArea?.[0] === 0 && closed?.sourceArea?.[0] === 0
            && closed.drawerOpen === '0' && closed.sourceMarker === null && !closed.popupOnly),
        topologyAndOwners: Boolean(result.steps?.length && result.steps.filter(s => s.observation).every(s =>
            s.observation.topology === true && s.observation.cloneCount === 0 && s.observation.ownerCount === 1)),
        nativeActions: action('open-drawer') && result.steps?.every(s => s.action !== 'failed'),
        gnbBackground: Boolean(result.gnb?.positive && result.gnb.contained
            && result.gnb.background === (env?.dark ? 'rgb(56, 104, 223)' : 'rgb(36, 91, 218)')),
        noScriptErrors: result.dcufErrorCount === 0
    };
    if (result.surface === 'minor') {
        for (const name of ['tip', 'rank']) {
            const reached = label => {
                const state = at(label), popup = state?.[name];
                return Boolean(popup?.display === 'block' && popup.area?.every(v => v > 0)
                    && popup.hit && popup.inViewport && popup.underSource);
            };
            checks[`${name}Reachable`] = reached(`${name}-open`) && reached(`${name}-popup-only`)
                && at(`${name}-popup-only`)?.drawerOpen === '0' && at(`${name}-popup-only`)?.popupOnly === '1';
            checks[`${name}Closed`] = action(`open-${name}`) && action(`close-drawer-with-${name}`)
                && action(`close-${name}`) && at(`${name}-closed`)?.sourceArea?.[0] === 0
                && !at(`${name}-closed`)?.popupOnly && at(`${name}-closed`)?.[name]?.display === 'none'
                && at(`${name}-closed`)?.[name]?.area?.every(v => v === 0);
        }
    } else if (result.surface === 'major') {
        checks.carouselAdvances = Boolean(action('next-page') && open?.pager && at('after-next')?.pager
            && open.pager !== at('after-next').pager && at('after-next').sourceMarker === '1');
    } else checks.knownSurface = false;
    return checks;
}

export function headerCaseVerdict(result) {
    if (result.unavailable || result.httpStatus !== 200) return 'UNAVAILABLE';
    return result.httpStatus === 200 && !result.failure && Object.values(headerChecks(result)).every(v => v === true) ? 'PASS' : 'FAIL';
}

export async function observeHeader(context, role, testCase, output) {
    const page = await context.newPage();
    const result = { role, id: testCase.id, url: testCase.url, surface: testCase.surface, theme: testCase.theme,
        viewport: testCase.viewport, steps: [], startedAt: new Date().toISOString() };
    const errors = [];
    let native;
    page.on('pageerror', error => errors.push(String(error.message)));
    page.on('console', message => { if (message.type() === 'error' && /DCUF|DCinside User Filter/i.test(message.text())) errors.push(message.text()); });
    const sourceSelector = testCase.surface === 'minor' ? '.issue_wrap .issue_contentbox' : '#gall_top_recom.concept_wrap';
    const sample = () => page.evaluate(({ saved, surface }) => {
        const source = saved.source, drawer = document.querySelector('.dcuf-header-drawer');
        const rect = source.getBoundingClientRect();
        const hit = node => { const r = node?.getBoundingClientRect(); if (!r?.width || !r.height) return false;
            const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return at === node || node.contains(at); };
        const popup = id => { const node = document.getElementById(id); if (!node) return null;
            const r = node.getBoundingClientRect(); return { display: getComputedStyle(node).display,
                area: [r.width, r.height], box: [r.left, r.top, r.right, r.bottom], hit: hit(node),
                inViewport: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
                underSource: source.contains(node) }; };
        return { ready: document.documentElement.classList.contains('script-ui-ready'),
            drawerOpen: drawer?.getAttribute('data-open'),
            sourceMarker: source.getAttribute(surface === 'minor' ? 'data-dcuf-header-native-door-open' : 'data-dcuf-header-native-recom-open'),
            popupOnly: source.getAttribute('data-dcuf-header-native-door-popup-only'), sourceArea: [rect.width, rect.height],
            sourceHit: hit(source), nativeActionHit: hit(source.querySelector(surface === 'minor' ? '.btn_mgall_dcp' : '.btn_bluenext')),
            childWidthsContained: [...source.children].every(node => node.getBoundingClientRect().width <= rect.width + 1),
            cloneCount: document.querySelectorAll('.dcuf-header-drawer [data-dcuf-drawer-clone]').length,
            ownerCount: document.querySelectorAll('.dcuf-header-drawer').length === 1 && document.querySelectorAll('#dcuf-header-drawer-style').length === 1 ? 1 : 0,
            topology: saved.nodes.every(({ node, parent, next }) => node.isConnected && node.parentNode === parent && node.nextSibling === next),
            rank: surface === 'minor' ? popup('hot_rank_pop2') : null, tip: surface === 'minor' ? popup('hot_tip_pop') : null,
            pager: surface === 'major' ? source.querySelector('.page_num')?.textContent?.trim() : null };
    }, { saved: native, surface: testCase.surface });
    const record = async label => result.steps.push({ label, observation: await sample() });
    const act = async (label, action) => { try { await action(); result.steps.push({ label, action: 'completed' }); }
        catch (error) { result.steps.push({ label, action: 'failed' }); throw error; } };
    try {
        await page.setViewportSize({ width: testCase.viewport.width, height: testCase.viewport.height });
        const response = await page.goto(testCase.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        result.httpStatus = response?.status() || null;
        if (result.httpStatus !== 200) { result.unavailable = 'environment-live: non-200 public page'; return result; }
        if (!sameGallery(testCase.url, page.url())) {
            result.unavailable = 'environment-live: unexpected redirect'; return result;
        }
        await page.waitForFunction(() => document.documentElement.classList.contains('script-ui-ready')
            && document.querySelector('.dcuf-header-drawer__toggle') && document.getElementById('dcuf-header-drawer-style'), null, { timeout: 20000 });
        if (await page.locator('#dcinside-filter-setting').isVisible()) {
            await page.locator('#dcinside-filter-close').click();
            await page.locator('#dcinside-filter-setting').waitFor({ state: 'detached' });
        }
        const requestedDark = testCase.theme === 'dark';
        if (await page.evaluate(() => document.body.classList.contains('dc-filter-dark-mode')) !== requestedDark) {
            await act('native-theme', () => page.locator('a.darkonoff').first().click({ timeout: 5000 }));
            result.nativeThemeAction = 'site darkonoff pointer';
        }
        await page.waitForFunction(dark => document.body.classList.contains('dc-filter-dark-mode') === dark
            && Boolean(document.getElementById('css-darkmode')?.sheet) === dark, requestedDark, { timeout: 12000 });
        result.environment = await page.evaluate(requested => ({ viewport: [innerWidth, innerHeight],
            desktopUA: !/Mobile|Android|iPhone/.test(navigator.userAgent), gmShimPresent: Boolean(window.__dcufTestbedGM),
            dark: document.body.classList.contains('dc-filter-dark-mode'), nativeDarkSheet: Boolean(document.getElementById('css-darkmode')?.sheet), requestedDark: requested }), requestedDark);
        result.gnb = await page.locator('.gnb_bar').evaluate(node => { const r = node.getBoundingClientRect(); return {
            positive: r.width > 0 && r.height > 0, contained: r.left >= -1 && r.right <= innerWidth + 1,
            background: getComputedStyle(node).backgroundColor, box: [r.left, r.top, r.width, r.height] }; });
        native = await page.evaluateHandle(selector => { const source = document.querySelector(selector); if (!source) throw new Error('Missing original header source');
            const nodes = [source, ...source.querySelectorAll('.btn_bluenext, .btn_blueprev, .btn_mgall_dcp, .btn_hotall_list, #hot_tip_pop, #hot_rank_pop2')];
            return { source, nodes: nodes.map(node => ({ node, parent: node.parentNode, next: node.nextSibling })) }; }, sourceSelector);
        const toggle = page.locator('.dcuf-header-drawer__toggle');
        await record('initial');
        await act('open-drawer', () => toggle.click({ timeout: 5000 })); await record('drawer-open');
        if (testCase.surface === 'minor') {
            for (const [name, selector, closeSelector] of [['tip', '.issue_wrap .btn_mgall_dcp', '#hot_tip_pop .btn_tipclose'],
                ['rank', '.issue_wrap .btn_hotall_list', '#hot_rank_pop2 .poply_close']]) {
                await act(`open-${name}`, () => page.locator(selector).first().click({ timeout: 5000 })); await record(`${name}-open`);
                await act(`close-drawer-with-${name}`, async () => { await toggle.focus(); await toggle.press('Enter'); }); await record(`${name}-popup-only`);
                await act(`close-${name}`, async () => { await page.locator(closeSelector).scrollIntoViewIfNeeded(); await page.locator(closeSelector).click({ timeout: 5000 }); });
                await page.waitForFunction(selector => !document.querySelector(selector)?.hasAttribute('data-dcuf-header-native-door-popup-only'), sourceSelector, { timeout: 3000 });
                await record(`${name}-closed`);
                if (name === 'tip') { await act('reopen-drawer', async () => { await toggle.focus(); await toggle.press('Enter'); }); await record('drawer-reopen'); }
            }
        } else {
            await act('next-page', () => page.locator('#gall_top_recom .btn_bluenext').click({ timeout: 5000 })); await record('after-next');
            await act('close-drawer', () => toggle.click({ timeout: 5000 }));
        }
        await record('drawer-closed');
        result.dcufErrorCount = errors.filter(message => /DCUF|DCinside User Filter|userscript/i.test(message)).length;
        result.screenshot = `${role}-${testCase.id}.png`;
        await page.screenshot({ path: `${output}/${result.screenshot}` });
    } catch (error) {
        result.failure = String(error.message).split('\n')[0].slice(0, 300);
        result.failureDetail = String(error.message).slice(0, 4000);
        result.failureGeometry = await page.evaluate(() => ({ viewport: [innerWidth, innerHeight],
            client: [document.documentElement.clientWidth, document.documentElement.clientHeight],
            targets: ['a.darkonoff', '.dcuf-header-drawer__toggle', '#hot_tip_pop .btn_tipclose', '#gall_top_recom .btn_bluenext'].map(selector => {
                const node = document.querySelector(selector); if (!node) return { selector, present: false };
                const r = node.getBoundingClientRect(), style = getComputedStyle(node);
                const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                return { selector, box: [r.left, r.top, r.width, r.height], display: style.display, visibility: style.visibility,
                    hit: hit && { tag: hit.localName, id: hit.id, className: String(hit.className) } };
            }) })).catch(() => null);
        result.failureClass = result.httpStatus === 200 ? 'product-runtime-or-host-drift' : 'environment-live';
        if (result.httpStatus !== 200) result.unavailable = result.failure;
        result.screenshot = `${role}-${testCase.id}-failure.png`;
        await page.screenshot({ path: `${output}/${result.screenshot}` }).catch(() => { delete result.screenshot; });
    } finally {
        result.finalUrl = page.url();
        await native?.dispose(); await page.close(); result.checks = headerChecks(result);
        result.status = headerCaseVerdict(result); result.finishedAt = new Date().toISOString();
    }
    return result;
}
