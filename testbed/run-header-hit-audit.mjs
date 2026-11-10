import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTestPage, launchBrowser, storageKeys } from './harness/runner-utils.mjs';
import { startServer } from './server/server.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const required = (flag) => {
    const index = args.indexOf(flag);
    if (index < 0 || !args[index + 1]) throw new Error(`Missing ${flag}`);
    return args[index + 1];
};
const runtime = path.resolve(root, required('--runtime'));
if (args.includes('--require-runtime-under-test')
    && runtime !== path.join(root, 'testbed/artifacts/runtime-under-test.user.js')) {
    throw new Error('Source-work runtime must be testbed/artifacts/runtime-under-test.user.js');
}
const output = path.resolve(root, required('--output'));
const screenshotStem = path.basename(output, path.extname(output));
const bytes = await readFile(runtime);
const sha256 = createHash('sha256').update(bytes).digest('hex').toUpperCase();
if (bytes.toString('utf8').match(/^\/\/\s*@name\s+(.+)$/m)?.[1]?.trim() !== 'DC_UserFilter_Mobile') {
    throw new Error('Mobile userscript required');
}
console.log(`Header hit runtime: ${runtime}; SHA-256 ${sha256}`);
process.env.DCUF_TESTBED_USERSCRIPT = runtime;
process.env.DCUF_TESTBED_TARGET = 'mobile';

const cases = [
    { id: 'major-list-390', path: '/board/lists?id=test', width: 390 },
    { id: 'minor-list-390', path: '/mgallery/board/lists?id=test', width: 390 },
    { id: 'minor-list-390-dark', path: '/mgallery/board/lists?id=test', width: 390, dark: true },
    { id: 'minor-list-390-short', path: '/mgallery/board/lists?id=test', width: 390, height: 500 },
    { id: 'minor-list-750', path: '/mgallery/board/lists?id=test', width: 750 },
    { id: 'minor-list-750-dark', path: '/mgallery/board/lists?id=test', width: 750, dark: true },
    { id: 'minor-list-1280', path: '/mgallery/board/lists?id=test', width: 1280 },
    { id: 'mini-list-390', path: '/mini/board/lists?id=test', width: 390 },
    { id: 'minor-view-390', path: '/mgallery/board/view?id=test&no=1001&header=1', width: 390 },
    { id: 'minor-view-750', path: '/mgallery/board/view?id=test&no=1001&header=1', width: 750 },
];
const server = await startServer();
const browser = await launchBrowser();
const observations = [];

try {
    for (const testCase of cases) {
        const session = await createTestPage(browser, server.baseUrl, {
            viewport: { width: testCase.width, height: testCase.height || 900 },
            storage: {
                [storageKeys.threshold]: 0,
                [storageKeys.ratioEnabled]: false,
                [storageKeys.personalEnabled]: true,
                [storageKeys.personalList]: { uids: [], nicknames: [], ips: [] },
            },
        });
        try {
            await session.goto(testCase.path);
            if (testCase.dark) {
                await session.page.evaluate(() => {
                    const style = document.createElement('style');
                    style.id = 'css-darkmode';
                    document.head.appendChild(style);
                });
                await session.page.waitForFunction(() => document.body.classList.contains('dc-filter-dark-mode'));
            }
            await session.page.locator('#dcuf-testbed-controls').evaluate((element) => { element.style.display = 'none'; }).catch(() => {});
            if (testCase.id.startsWith('minor-list')) {
                await session.page.waitForFunction(() => document.querySelector('.dcuf-header-drawer__toggle')
                    && document.getElementById('dcuf-header-drawer-style'));
            }
            await session.page.evaluate(() => {
                window.__dcufHeaderHitBaseline = {
                    source: document.querySelector('.issue_wrap > .issue_contentbox'),
                    rankPopup: document.getElementById('hot_rank_pop2'),
                    rankContent: document.querySelector('#hot_rank_pop2 .pop_content.pop_hot_mgall'),
                    rankClose: document.querySelector('#hot_rank_pop2 .poply_close'),
                    relationPopup: document.getElementById('relation_popup'),
                    relationContent: document.querySelector('#relation_popup > div'),
                    relationAction: document.querySelector('.page_head .relate'),
                };
            });
            const capture = async (step, action = null) => session.page.evaluate(({ caseId, stepName, actionResult }) => {
                const selectors = {
                    title: '.page_head.fixture-gallery-heading',
                    issueHeading: '.page_head:has(> .fr.gall_issuebox)',
                    issueActions: '.page_head > .fr.gall_issuebox',
                    toggle: '.dcuf-header-drawer__toggle',
                    drawerBody: '.dcuf-header-drawer__body',
                    sourceRank: '.issue_wrap > .issue_contentbox .btn_hotall_list',
                    relationAction: '.page_head .relate',
                    relationPopup: '#relation_popup',
                    rankPopup: '#hot_rank_pop2',
                    rankClose: '#hot_rank_pop2 .poply_close',
                    listOption: '.list_array_option',
                    listTab: '.list_array_option .array_tab',
                    listSelect: '.list_array_option .select_box.array_num',
                };
                const describe = (element) => element ? {
                    tag: element.tagName,
                    id: element.id,
                    className: typeof element.className === 'string' ? element.className : '',
                } : null;
                const box = (bounds) => bounds && ({
                    x: Math.round(bounds.x * 10) / 10,
                    y: Math.round(bounds.y * 10) / 10,
                    width: Math.round(bounds.width * 10) / 10,
                    height: Math.round(bounds.height * 10) / 10,
                });
                const inspect = (element) => {
                    if (!element) return null;
                    const bounds = element.getBoundingClientRect();
                    const computed = getComputedStyle(element);
                    const inset = Math.min(6, bounds.width / 4, bounds.height / 4);
                    const points = bounds.width > 0 && bounds.height > 0 ? {
                        center: [bounds.left + bounds.width / 2, bounds.top + bounds.height / 2],
                        topLeft: [bounds.left + inset, bounds.top + inset],
                        topRight: [bounds.right - inset, bounds.top + inset],
                        bottomLeft: [bounds.left + inset, bounds.bottom - inset],
                        bottomRight: [bounds.right - inset, bounds.bottom - inset],
                    } : {};
                    const hits = Object.fromEntries(Object.entries(points).map(([name, [x, y]]) => {
                        const insideViewport = x >= 0 && x < innerWidth && y >= 0 && y < innerHeight;
                        const stack = insideViewport ? document.elementsFromPoint(x, y).slice(0, 5) : [];
                        return [name, { x: Math.round(x), y: Math.round(y), insideViewport,
                            reachable: insideViewport && stack.some((target, index) => index === 0 && (target === element || element.contains(target))),
                            stack: stack.map(describe) }];
                    }));
                    const ancestors = [];
                    for (let parent = element.parentElement; parent && parent !== document.documentElement; parent = parent.parentElement) {
                        const parentStyle = getComputedStyle(parent);
                        ancestors.push({ ...describe(parent), position: parentStyle.position,
                            zIndex: parentStyle.zIndex, overflowX: parentStyle.overflowX,
                            overflowY: parentStyle.overflowY, transform: parentStyle.transform,
                            pointerEvents: parentStyle.pointerEvents, opacity: parentStyle.opacity });
                    }
                    return {
                        node: describe(element), parent: describe(element.parentElement), box: box(bounds),
                        style: { display: computed.display, visibility: computed.visibility,
                            position: computed.position, zIndex: computed.zIndex,
                            overflowX: computed.overflowX, overflowY: computed.overflowY,
                            transform: computed.transform, pointerEvents: computed.pointerEvents,
                            opacity: computed.opacity, left: computed.left, right: computed.right,
                            width: computed.width },
                        hits, ancestors,
                    };
                };
                const baseline = window.__dcufHeaderHitBaseline;
                return {
                    caseId, step: stepName, action: actionResult, viewport: { width: innerWidth, height: innerHeight },
                    semantic: {
                        rankCalls: window.__fixtureHotRankToggles ?? null,
                        hostCalls: window.__fixtureHostHeaderToggles ?? null,
                        drawerOpen: document.querySelector('.dcuf-header-drawer')?.getAttribute('data-open') ?? null,
                        relationDisplay: document.getElementById('relation_popup') ? getComputedStyle(document.getElementById('relation_popup')).display : null,
                        rankDisplay: document.getElementById('hot_rank_pop2') ? getComputedStyle(document.getElementById('hot_rank_pop2')).display : null,
                        sourceOriginal: document.querySelector('.issue_wrap > .issue_contentbox') === baseline.source,
                        rankPopupOriginal: document.getElementById('hot_rank_pop2') === baseline.rankPopup,
                        rankContentOriginal: document.querySelector('#hot_rank_pop2 .pop_content.pop_hot_mgall') === baseline.rankContent,
                        rankCloseOriginal: document.querySelector('#hot_rank_pop2 .poply_close') === baseline.rankClose,
                        relationPopupOriginal: document.getElementById('relation_popup') === baseline.relationPopup,
                        relationContentOriginal: document.querySelector('#relation_popup > div') === baseline.relationContent,
                        rankItemCount: document.querySelectorAll('#hot_rank_pop2 .pop_hotmgall_listbox li').length,
                        rankPopupParent: describe(document.getElementById('hot_rank_pop2')?.parentElement),
                        relationPopupParent: describe(document.getElementById('relation_popup')?.parentElement),
                        sourceRankHandler: baseline.source?.querySelector('.btn_hotall_list')?.getAttribute('onclick') ?? null,
                        cloneRankHandler: document.querySelector('.dcuf-header-drawer .btn_hotall_list')?.getAttribute('onclick') ?? null,
                    },
                    elements: Object.fromEntries(Object.entries(selectors).map(([name, selector]) => [name, inspect(document.querySelector(selector))])),
                };
            }, { caseId: testCase.id, stepName: step, actionResult: action });
            const pointer = async (selector) => {
                const bounds = await session.page.locator(selector).boundingBox().catch(() => null);
                if (!bounds || bounds.width <= 0 || bounds.height <= 0) return { attempted: false, reason: 'no-positive-box' };
                const x = bounds.x + bounds.width / 2;
                const y = bounds.y + bounds.height / 2;
                if (x < 0 || x >= testCase.width || y < 0 || y >= (testCase.height || 900)) return { attempted: false, reason: 'center-outside-viewport', x, y };
                await session.page.mouse.click(x, y);
                return { attempted: true, x: Math.round(x), y: Math.round(y) };
            };
            observations.push(await capture('initial'));
            if (testCase.id.startsWith('minor-list')) {
                const toggleAction = await pointer('.dcuf-header-drawer__toggle');
                observations.push(await capture('toggle-pointer', toggleAction));
                if (await session.page.locator('.dcuf-header-drawer').getAttribute('data-open') !== '1') {
                    await session.page.locator('.dcuf-header-drawer__toggle').evaluate((element) => element.click());
                }
                observations.push(await capture('drawer-open'));
                if (args.includes('--screenshots') && testCase.id === 'minor-list-390') {
                    await session.page.screenshot({ path: path.join(root, 'testbed/artifacts', `${screenshotStem}-drawer-390.png`) });
                }
                const rankAction = await pointer('.issue_wrap > .issue_contentbox .btn_hotall_list');
                observations.push(await capture('rank-pointer', rankAction));
                if (await session.page.locator('#hot_rank_pop2').evaluate((element) => getComputedStyle(element).display) === 'none') {
                    await session.page.locator('.issue_wrap > .issue_contentbox .btn_hotall_list').evaluate((element) => element.click());
                }
                observations.push(await capture('rank-open'));
                if (args.includes('--screenshots') && testCase.id === 'minor-list-390') {
                    await session.page.screenshot({ path: path.join(root, 'testbed/artifacts', `${screenshotStem}-rank-390.png`) });
                }
                if (testCase.width < 998) {
                    const horizontal = await session.page.evaluate(() => {
                        const popup = document.getElementById('hot_rank_pop2');
                        const fifth = popup?.querySelector('.pop_hotmgall_listbox li:nth-child(5)');
                        const width = popup?.clientWidth || 0;
                        const scrollWidth = popup?.scrollWidth || 0;
                        if (popup) popup.scrollLeft = scrollWidth;
                        const bounds = fifth?.getBoundingClientRect();
                        const x = bounds && bounds.left + bounds.width / 2;
                        const y = bounds && bounds.top + bounds.height / 2;
                        const hit = x >= 0 && x < innerWidth && y >= 0 && y < innerHeight
                            ? document.elementFromPoint(x, y) : null;
                        const reachable = Boolean(fifth && (hit === fifth || fifth.contains(hit)));
                        const scrollLeft = popup?.scrollLeft || 0;
                        if (popup) popup.scrollLeft = 0;
                        return { width, scrollWidth, scrollLeft, fifthReachable: reachable };
                    });
                    observations.push(await capture('rank-horizontal-scroll', horizontal));
                }
                if (testCase.height && testCase.height < 600) {
                    const vertical = await session.page.evaluate(() => {
                        const popup = document.getElementById('hot_rank_pop2');
                        const close = popup?.querySelector('.poply_close');
                        if (popup) popup.scrollTop = popup.scrollHeight;
                        const bounds = close?.getBoundingClientRect();
                        const x = bounds && bounds.left + bounds.width / 2;
                        const y = bounds && bounds.top + bounds.height / 2;
                        const hit = x >= 0 && x < innerWidth && y >= 0 && y < innerHeight
                            ? document.elementFromPoint(x, y) : null;
                        return { scrollTop: popup?.scrollTop || 0, closeReachable: Boolean(close && (hit === close || close.contains(hit))) };
                    });
                    observations.push(await capture('rank-vertical-scroll', vertical));
                }
                const closeAction = await pointer('#hot_rank_pop2 .poply_close');
                observations.push(await capture('rank-close-pointer', closeAction));
                if (await session.page.locator('#hot_rank_pop2').evaluate((element) => getComputedStyle(element).display) !== 'none') {
                    await session.page.locator('#hot_rank_pop2 .poply_close').evaluate((element) => element.click());
                }
                observations.push(await capture('rank-closed'));
                if (await session.page.locator('.dcuf-header-drawer').getAttribute('data-open') === '1') {
                    await session.page.locator('.dcuf-header-drawer__toggle').evaluate((element) => element.click());
                }
                const relationAction = await pointer('.page_head .relate');
                observations.push(await capture('relation-pointer', relationAction));
                if (await session.page.locator('#relation_popup').evaluate((element) => getComputedStyle(element).display) === 'none') {
                    await session.page.locator('.page_head .relate').evaluate((element) => element.click());
                }
                observations.push(await capture('relation-open'));
                if (args.includes('--screenshots') && testCase.id === 'minor-list-390') {
                    await session.page.screenshot({ path: path.join(root, 'testbed/artifacts', `${screenshotStem}-relation-390.png`) });
                }
                const relationCloseAction = await pointer('.page_head .relate');
                observations.push(await capture('relation-closed', relationCloseAction));
                await session.page.locator('.dcuf-header-drawer__toggle').focus();
                await session.page.locator('.dcuf-header-drawer__toggle').press('Enter');
                observations.push(await capture('keyboard-drawer-open'));
                await session.page.locator('.issue_wrap > .issue_contentbox .btn_hotall_list').focus();
                await session.page.locator('.issue_wrap > .issue_contentbox .btn_hotall_list').press('Enter');
                observations.push(await capture('keyboard-rank-open'));
                await session.page.locator('.issue_wrap > .issue_contentbox .btn_hotall_list').press('Enter');
                observations.push(await capture('keyboard-rank-closed'));
                if (testCase.id === 'minor-list-1280') {
                    await session.page.setViewportSize({ width: 390, height: 900 });
                    await session.page.waitForFunction(() => {
                        const body = document.querySelector('.dcuf-header-drawer__body');
                        const rank = document.querySelector('.issue_wrap > .issue_contentbox .btn_hotall_list');
                        if (!body || !rank) return false;
                        const box = body.getBoundingClientRect();
                        const point = rank.getBoundingClientRect();
                        const hit = document.elementFromPoint(point.left + point.width / 2, point.top + point.height / 2);
                        return box.left >= 0 && box.right <= innerWidth + 1 && (hit === rank || rank.contains(hit));
                    }, null, { timeout: 1500 }).catch(() => {});
                    observations.push(await capture('resize-narrow-open'));
                }
                await session.page.locator('.dcuf-header-drawer__toggle').focus();
                await session.page.locator('.dcuf-header-drawer__toggle').press('Enter');
                observations.push(await capture('keyboard-drawer-closed'));
            }
            if (session.consoleErrors.length) throw new Error(`${testCase.id}: ${session.consoleErrors.join('\n')}`);
        } finally {
            await session.close();
        }
    }
} finally {
    await browser.close();
    await server.close();
}

await mkdir(path.dirname(output), { recursive: true });
const failures = [];
for (const testCase of cases.filter(({ id }) => id.startsWith('minor-list'))) {
    const at = (step) => observations.find((item) => item.caseId === testCase.id && item.step === step);
    const initial = at('initial');
    const toggle = at('toggle-pointer');
    const drawer = at('drawer-open');
    const rankPointer = at('rank-pointer');
    const rankOpen = at('rank-open');
    const rankScrolled = at('rank-horizontal-scroll');
    const rankVertical = at('rank-vertical-scroll');
    const rankClosePointer = at('rank-close-pointer');
    const rankClosed = at('rank-closed');
    const relation = at('relation-open');
    const relationClosed = at('relation-closed');
    const keyboardDrawer = at('keyboard-drawer-open');
    const keyboardRank = at('keyboard-rank-open');
    const keyboardRankClosed = at('keyboard-rank-closed');
    const keyboardClosed = at('keyboard-drawer-closed');
    const check = (condition, name) => { if (!condition) failures.push(`${testCase.id}: ${name}`); };
    const contained = ({ x, width }, viewportWidth = testCase.width) => x >= 0 && x + width <= viewportWidth + 1;
    check(initial?.elements.toggle?.hits.center.reachable, 'toggle center is blocked');
    check(toggle?.semantic.drawerOpen === '1', 'native toggle pointer did not open drawer');
    check(contained(drawer?.elements.drawerBody?.box || { x: -1, width: 0 }), 'drawer escapes viewport');
    check(drawer?.elements.sourceRank?.hits.center.reachable, 'original rank action is blocked');
    check(rankPointer?.semantic.rankCalls === drawer?.semantic.rankCalls + 1 && rankPointer?.semantic.rankDisplay === 'block', 'native rank pointer did not call original handler once');
    if (testCase.height && testCase.height < 600) {
        check(rankVertical?.action.scrollTop > 0 && rankVertical?.action.closeReachable,
            'native rank close cannot be reached by vertical scroll');
    } else check(rankOpen?.elements.rankClose?.hits.center.reachable, 'native rank close is blocked');
    if (testCase.width < 998) {
        check(rankScrolled?.action.scrollWidth > rankScrolled?.action.width
            && rankScrolled?.action.scrollLeft > 0 && rankScrolled?.action.fifthReachable,
        'native rank contents cannot be reached by horizontal scroll');
    }
    check(rankClosePointer?.semantic.rankCalls === rankOpen?.semantic.rankCalls + 1 && rankClosePointer?.semantic.rankDisplay === 'none', 'native close pointer did not call original handler once');
    check(rankClosed?.semantic.rankDisplay === 'none', 'rank popup remained open');
    check(relation?.elements.relationPopup?.hits.center.reachable, 'relation popup center is blocked');
    check(relation?.semantic.hostCalls?.relation === 1, 'relation handler count drift');
    check(relation?.semantic.sourceOriginal && relation.semantic.rankPopupOriginal && relation.semantic.rankContentOriginal
        && relation.semantic.rankCloseOriginal && relation.semantic.relationPopupOriginal
        && relation.semantic.relationContentOriginal && relation.semantic.rankItemCount === 100, 'host or popup descendant identity drift');
    check(relation?.semantic.sourceRankHandler === 'toggle_hot_rank_pop()'
        && relation?.semantic.cloneRankHandler === null, 'original rank handler or clone ownership drift');
    check(relationClosed?.semantic.relationDisplay === 'none' && relationClosed?.semantic.hostCalls?.relation === 2, 'native relation pointer did not close popup once');
    check(keyboardDrawer?.semantic.drawerOpen === '1', 'keyboard did not reopen drawer');
    check(keyboardRank?.semantic.rankDisplay === 'block' && keyboardRank?.semantic.rankCalls === relationClosed?.semantic.rankCalls + 1, 'keyboard rank action did not open once');
    check(keyboardRankClosed?.semantic.rankDisplay === 'none' && keyboardRankClosed?.semantic.rankCalls === keyboardRank?.semantic.rankCalls + 1, 'keyboard rank action did not close once');
    check(keyboardClosed?.semantic.drawerOpen === '0', 'keyboard did not close drawer');
    if (testCase.id === 'minor-list-1280') {
        const resized = at('resize-narrow-open');
        check(resized?.viewport.width === 390 && contained(resized?.elements.drawerBody?.box || { x: -1, width: 0 }, 390)
            && resized?.elements.sourceRank?.hits.center.reachable, 'open drawer did not follow viewport resize');
    }
}
await writeFile(output, JSON.stringify({ schemaVersion: 1, runtime, sha256, browser: browser.version(), observations, failures }, null, 2) + '\n');
console.log(`Header hit audit: ${observations.length} observations; ${failures.length} reachability failures; ${runtime}; SHA-256 ${sha256}`);
if (args.includes('--assert-reachability') && failures.length) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
}
