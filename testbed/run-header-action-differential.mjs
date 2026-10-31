import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTestPage, launchBrowser, storageKeys } from './harness/runner-utils.mjs';
import { startServer } from './server/server.mjs';
import { createEvidenceBinding } from '../tools/evidence-binding.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), '..');
const args = process.argv.slice(2);
const required = (flag) => {
    const index = args.indexOf(flag);
    if (index < 0 || !args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`Missing ${flag}`);
    return args[index + 1];
};
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const output = path.resolve(root, required('--output'));
await mkdir(path.dirname(output), { recursive: true });

const cases = [
    { id: 'minor-390-light', path: '/mgallery/board/lists?id=test', width: 390, kind: 'minor' },
    { id: 'minor-390-dark', path: '/mgallery/board/lists?id=test', width: 390, kind: 'minor', dark: true },
    { id: 'minor-750-light', path: '/mgallery/board/lists?id=test', width: 750, kind: 'minor' },
    { id: 'minor-1280-light', path: '/mgallery/board/lists?id=test', width: 1280, kind: 'minor' },
    { id: 'major-390-light', path: '/board/lists?id=test', width: 390, kind: 'major' },
    { id: 'major-1280-light', path: '/board/lists?id=test', width: 1280, kind: 'major' },
];
const storage = {
    [storageKeys.threshold]: 0,
    [storageKeys.ratioEnabled]: false,
    [storageKeys.personalEnabled]: true,
    [storageKeys.personalList]: { uids: [], nicknames: [], ips: [] },
};

if (args.includes('--side')) {
    const runtime = path.resolve(root, required('--side'));
    const side = required('--role');
    assert.ok(['control', 'candidate'].includes(side));
    const bytes = await readFile(runtime);
    assert.match(bytes.toString('utf8'), /^\/\/\s*@name\s+DC_UserFilter_Mobile\s*$/m);
    process.env.DCUF_TESTBED_USERSCRIPT = runtime;
    process.env.DCUF_TESTBED_TARGET = 'mobile';
    const server = await startServer();
    const browser = await launchBrowser();
    const observations = [];
    try {
        for (const testCase of cases) {
            const session = await createTestPage(browser, server.baseUrl, {
                storage, viewport: { width: testCase.width, height: 900 },
            });
            try {
                await session.goto(testCase.path);
                if (testCase.dark) {
                    await session.page.evaluate(() => window.__dcufFixture.toggleDark(true));
                    await session.page.waitForFunction(() => document.body.classList.contains('dc-filter-dark-mode'));
                }
                await session.page.locator('#dcuf-testbed-controls').evaluate((element) => { element.style.display = 'none'; });
                if (side === 'candidate') {
                    await session.page.waitForFunction(() => window.__dcufHeaderDrawerHostAdapter
                        ?.snapshotResources().mutationSubscribers === 1);
                }
                const actions = [];
                const inspect = (selector) => session.page.locator(selector).evaluate((element) => {
                    const box = element.getBoundingClientRect();
                    const hit = box.width && box.height
                        ? document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2) : null;
                    return {
                        present: element.isConnected,
                        visible: box.width > 0 && box.height > 0,
                        centerHit: hit === element || element.contains(hit),
                        inViewport: box.left >= 0 && box.top >= 0
                            && box.right <= innerWidth + 1 && box.bottom <= innerHeight + 1,
                        onclick: element.getAttribute('onclick'),
                    };
                });
                const activate = async (id, selector, readCount) => {
                    const before = await inspect(selector);
                    const beforeCount = await session.page.evaluate(readCount);
                    let pointer = true;
                    try {
                        await session.page.locator(selector).click({ timeout: 1800 });
                    } catch {
                        pointer = false;
                        await session.page.locator(selector).evaluate((element) => element.click());
                    }
                    const count = await session.page.evaluate(readCount);
                    actions.push({ id, mode: 'pointer', pointer, before, count, delta: count - beforeCount });
                    return pointer;
                };
                const activateKeyboard = async (id, selector, readCount) => {
                    const before = await inspect(selector);
                    const beforeCount = await session.page.evaluate(readCount);
                    let keyboard = true;
                    let focused = false;
                    try {
                        const control = session.page.locator(selector);
                        await control.focus({ timeout: 1800 });
                        focused = await control.evaluate((element) => document.activeElement === element);
                        await control.press('Enter', { timeout: 1800 });
                    } catch {
                        keyboard = false;
                        await session.page.locator(selector).evaluate((element) => element.click());
                    }
                    const count = await session.page.evaluate(readCount);
                    actions.push({ id, mode: 'keyboard', keyboard, focused, before, count, delta: count - beforeCount });
                };
                if (testCase.kind === 'minor') {
                    await session.page.evaluate(() => {
                        const source = document.querySelector('.issue_wrap .issue_contentbox');
                        const rank = document.getElementById('hot_rank_pop2');
                        const tipBox = document.createElement('div');
                        tipBox.className = 'minor_ranking_box';
                        tipBox.innerHTML = '<button type="button" class="btn_mgall_dcp" onclick="toggle_hot_tip_pop()">설명</button>'
                            + '<div id="hot_tip_pop" class="pop_tipbox minor_tip" style="display:none">'
                            + '<button type="button" class="btn_tipclose" onclick="toggle_hot_tip_pop()">닫기</button></div>';
                        source.appendChild(tipBox);
                        const style = document.createElement('style');
                        style.textContent = '.issue_wrap .minor_ranking_box{position:relative}'
                            + '.issue_wrap #hot_tip_pop{position:absolute;top:15px;right:15px;width:220px;min-height:50px;background:#fff;z-index:999}';
                        document.head.appendChild(style);
                        window.__headerActionBaseline = {
                            source, rank, rankParent: rank.parentNode,
                            rankClose: rank.querySelector('.poply_close'),
                            tip: tipBox.querySelector('#hot_tip_pop'),
                            tipParent: tipBox.querySelector('#hot_tip_pop').parentNode,
                        };
                        window.__fixtureHotTipCalls = 0;
                        window.toggle_hot_tip_pop = () => {
                            const popup = document.getElementById('hot_tip_pop');
                            popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
                            window.__fixtureHotTipCalls += 1;
                        };
                        window.__dcufHeaderDrawerHostAdapter?.refresh();
                    });
                    // Immediate controls may already own the native door. Compare
                    // the same open state, not a closed control against an open candidate.
                    if (side === 'candidate' || await session.page.locator('.issue_wrap .issue_contentbox[data-dcuf-header-native-door="1"]').count()) {
                        await session.page.waitForFunction(() => document.querySelector('.issue_wrap .issue_contentbox')
                            ?.getAttribute('data-dcuf-header-native-door') === '1');
                        await session.page.locator('.dcuf-header-drawer__toggle').click();
                    }
                    await activate('rank-open', '.issue_wrap .issue_contentbox .btn_hotall_list',
                        () => window.__fixtureHotRankToggles);
                    const rankOpen = await session.page.evaluate(() => {
                        const baseline = window.__headerActionBaseline;
                        const popup = document.getElementById('hot_rank_pop2');
                        const box = popup.getBoundingClientRect();
                        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
                        return {
                            originalNode: popup === baseline.rank,
                            originalParent: popup.parentNode === baseline.rankParent,
                            originalClose: popup.querySelector('.poply_close') === baseline.rankClose,
                            display: getComputedStyle(popup).display,
                            centerHit: hit === popup || popup.contains(hit),
                            inViewport: box.left >= 0 && box.top >= 0
                                && box.right <= innerWidth + 1 && box.bottom <= innerHeight + 1,
                        };
                    });
                    await activate('rank-close', '#hot_rank_pop2 .poply_close', () => window.__fixtureHotRankToggles);
                    await activateKeyboard('rank-enter-open', '.issue_wrap .issue_contentbox .btn_hotall_list',
                        () => window.__fixtureHotRankToggles);
                    await activateKeyboard('rank-enter-close', '#hot_rank_pop2 .poply_close',
                        () => window.__fixtureHotRankToggles);
                    await activate('tip-open', '.issue_wrap .issue_contentbox .btn_mgall_dcp',
                        () => window.__fixtureHotTipCalls);
                    const tipOpen = await session.page.evaluate(() => {
                        const baseline = window.__headerActionBaseline;
                        const popup = document.getElementById('hot_tip_pop');
                        const box = popup.getBoundingClientRect();
                        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
                        return {
                            originalNode: popup === baseline.tip,
                            originalParent: popup.parentNode === baseline.tipParent,
                            display: getComputedStyle(popup).display,
                            centerHit: hit === popup || popup.contains(hit),
                            inViewport: box.left >= 0 && box.top >= 0
                                && box.right <= innerWidth + 1 && box.bottom <= innerHeight + 1,
                        };
                    });
                    await activate('tip-close', '#hot_tip_pop .btn_tipclose', () => window.__fixtureHotTipCalls);
                    await activateKeyboard('tip-enter-open', '.issue_wrap .issue_contentbox .btn_mgall_dcp',
                        () => window.__fixtureHotTipCalls);
                    await activateKeyboard('tip-enter-close', '#hot_tip_pop .btn_tipclose',
                        () => window.__fixtureHotTipCalls);
                    await activate('relation', '.page_head .relate',
                        () => window.__fixtureHostHeaderToggles.relation);
                    await activateKeyboard('relation-enter', '.page_head .relate',
                        () => window.__fixtureHostHeaderToggles.relation);
                    await activate('guide', '.page_head .gall_useinfo',
                        () => window.__fixtureHostHeaderToggles.guide);
                    await activateKeyboard('guide-enter', '.page_head .gall_useinfo',
                        () => window.__fixtureHostHeaderToggles.guide);
                    await activate('more', '.page_head .fixture-issue-more',
                        () => window.__fixtureHostHeaderToggles.issue);
                    await activateKeyboard('more-enter', '.page_head .fixture-issue-more',
                        () => window.__fixtureHostHeaderToggles.issue);
                    const final = await session.page.evaluate(() => ({
                        rank: window.__fixtureHotRankToggles,
                        tip: window.__fixtureHotTipCalls,
                        host: window.__fixtureHostHeaderToggles,
                        relationDisplay: getComputedStyle(document.getElementById('relation_popup')).display,
                        cloneCount: document.querySelectorAll('.dcuf-header-drawer [data-dcuf-drawer-clone="1"]').length,
                    }));
                    await session.page.evaluate(() => {
                        const source = document.querySelector('.issue_wrap .issue_contentbox');
                        const replacement = source.cloneNode(true);
                        source.replaceWith(replacement);
                        window.__headerActionReplacement = { source, replacement };
                    });
                    if (side === 'candidate') {
                        await session.page.waitForFunction(() => {
                            const { source, replacement } = window.__headerActionReplacement;
                            return replacement.getAttribute('data-dcuf-header-native-door') === '1'
                                && !source.hasAttribute('data-dcuf-header-native-door');
                        });
                    }
                    const replacement = await session.page.evaluate(() => {
                        const { source, replacement } = window.__headerActionReplacement;
                        return {
                            originalDetached: !source.isConnected,
                            currentNode: document.querySelector('.issue_wrap .issue_contentbox') === replacement,
                            rankUnderCurrent: replacement.contains(document.getElementById('hot_rank_pop2')),
                            copiedMarkerCleared: !source.hasAttribute('data-dcuf-header-native-door'),
                            currentMarker: replacement.getAttribute('data-dcuf-header-native-door'),
                        };
                    });
                    const disposed = side === 'candidate' ? await session.page.evaluate(() => {
                        const adapter = window.__dcufHeaderDrawerHostAdapter;
                        adapter.dispose();
                        const current = window.__headerActionReplacement.replacement;
                        return {
                            markerClean: !current.hasAttribute('data-dcuf-header-native-door')
                                && !current.hasAttribute('data-dcuf-header-native-door-open')
                                && !current.hasAttribute('data-dcuf-header-native-door-popup-only'),
                            popupUnderCurrent: current.contains(document.getElementById('hot_rank_pop2')),
                            resources: adapter.snapshotResources(),
                        };
                    }) : null;
                    observations.push({ caseId: testCase.id, actions, rankOpen, tipOpen, final, replacement, disposed });
                } else {
                    await session.page.evaluate(() => {
                        const issueWrap = document.createElement('div');
                        issueWrap.className = 'issue_wrap';
                        issueWrap.style.cssText = 'position:relative;z-index:13';
                        const box = document.createElement('div');
                        box.className = 'issuebox gallery_box';
                        const source = document.createElement('section');
                        source.id = 'gall_top_recom';
                        source.className = 'concept_wrap';
                        source.innerHTML = '<div class="pageing_box"><button type="button" class="btn_bluenext">다음</button></div>'
                            + '<ul class="concept_txtlist"><li><a href="/board/view?id=test&no=1001">추천글</a></li></ul>';
                        box.appendChild(source);
                        issueWrap.appendChild(box);
                        document.querySelector('#container article').prepend(issueWrap);
                        const style = document.createElement('style');
                        style.textContent = '.issue_wrap #gall_top_recom>.pageing_box{width:840px}'
                            + '.issue_wrap #gall_top_recom>.concept_txtlist{float:left;width:420px}';
                        document.head.appendChild(style);
                        window.__headerActionRecom = { source, parent: source.parentNode, calls: 0, trusted: [] };
                        source.querySelector('.btn_bluenext').addEventListener('click', (event) => {
                            window.__headerActionRecom.calls += 1;
                            window.__headerActionRecom.trusted.push(event.isTrusted);
                        });
                        window.__dcufHeaderDrawerHostAdapter?.refresh();
                    });
                    if (side === 'candidate' || await session.page.locator('#gall_top_recom[data-dcuf-header-native-recom="1"]').count()) {
                        await session.page.waitForFunction(() => document.querySelector('#gall_top_recom')
                            ?.getAttribute('data-dcuf-header-native-recom') === '1');
                        await session.page.locator('.dcuf-header-drawer__toggle').click();
                    }
                    await activate('recommend-next', '#gall_top_recom .btn_bluenext',
                        () => window.__headerActionRecom.calls);
                    await activateKeyboard('recommend-next-enter', '#gall_top_recom .btn_bluenext',
                        () => window.__headerActionRecom.calls);
                    const final = await session.page.evaluate(() => {
                        const baseline = window.__headerActionRecom;
                        const source = document.getElementById('gall_top_recom');
                        return {
                            originalNode: source === baseline.source,
                            originalParent: source.parentNode === baseline.parent,
                            calls: baseline.calls,
                            trusted: baseline.trusted,
                            cloneCount: document.querySelectorAll('.dcuf-header-drawer [data-dcuf-drawer-clone="1"]').length,
                        };
                    });
                    await session.page.evaluate(() => {
                        const source = document.getElementById('gall_top_recom');
                        const replacement = source.cloneNode(true);
                        source.replaceWith(replacement);
                        window.__headerActionReplacement = { source, replacement };
                    });
                    if (side === 'candidate') {
                        await session.page.waitForFunction(() => {
                            const { source, replacement } = window.__headerActionReplacement;
                            return replacement.getAttribute('data-dcuf-header-native-recom') === '1'
                                && !source.hasAttribute('data-dcuf-header-native-recom');
                        });
                    }
                    const replacement = await session.page.evaluate(() => {
                        const { source, replacement } = window.__headerActionReplacement;
                        return {
                            originalDetached: !source.isConnected,
                            currentNode: document.getElementById('gall_top_recom') === replacement,
                            copiedMarkerCleared: !source.hasAttribute('data-dcuf-header-native-recom'),
                            currentMarker: replacement.getAttribute('data-dcuf-header-native-recom'),
                        };
                    });
                    const disposed = side === 'candidate' ? await session.page.evaluate(() => {
                        const adapter = window.__dcufHeaderDrawerHostAdapter;
                        adapter.dispose();
                        const current = window.__headerActionReplacement.replacement;
                        return {
                            markerClean: !current.hasAttribute('data-dcuf-header-native-recom')
                                && !current.hasAttribute('data-dcuf-header-native-recom-open'),
                            resources: adapter.snapshotResources(),
                        };
                    }) : null;
                    observations.push({ caseId: testCase.id, actions, final, replacement, disposed });
                }
                assert.deepEqual(session.consoleErrors, [], `${testCase.id}: console errors`);
            } finally {
                await session.close();
            }
        }
        await writeFile(output, JSON.stringify({
            schemaVersion: 1, artifactSha256: hash(bytes), browser: browser.version(), observations,
        }, null, 2) + '\n');
    } finally {
        await browser.close();
        await server.close();
    }
} else {
    const control = path.resolve(root, required('--control'));
    const candidate = path.resolve(root, required('--candidate'));
    if (args.includes('--require-runtime-under-test')
        && candidate !== path.join(root, 'testbed/artifacts/runtime-under-test.user.js')) {
        throw new Error('Source-work candidate must be testbed/artifacts/runtime-under-test.user.js');
    }
    const controlSha256 = hash(await readFile(control));
    const candidateSha256 = hash(await readFile(candidate));
    assert.equal(controlSha256, required('--expected-control-sha').toUpperCase());
    assert.notEqual(controlSha256, candidateSha256);
    console.log(`Control runtime: ${control}; SHA-256 ${controlSha256}`);
    console.log(`Candidate runtime: ${candidate}; SHA-256 ${candidateSha256}`);
    const sides = {};
    for (const [role, runtime] of Object.entries({ control, candidate })) {
        const sideOutput = path.join(root, 'testbed/artifacts', `header-action-${role}-side.json`);
        const result = spawnSync(process.execPath, [scriptPath, '--side', runtime, '--role', role, '--output', sideOutput], {
            cwd: root, stdio: 'inherit',
        });
        if (result.status !== 0) throw new Error(`${role} observation failed`);
        sides[role] = JSON.parse(await readFile(sideOutput, 'utf8'));
    }
    const differences = [];
    const improvements = [];
    const rows = sides.candidate.observations.map((candidateCase, index) => {
        const controlCase = sides.control.observations[index];
        if (controlCase?.caseId !== candidateCase.caseId) differences.push({ caseId: candidateCase.caseId, reason: 'case mismatch' });
        const actions = candidateCase.actions.map((candidateAction, actionIndex) => {
            const controlAction = controlCase?.actions[actionIndex];
            if (controlAction?.id !== candidateAction.id || controlAction.mode !== candidateAction.mode) {
                differences.push({ caseId: candidateCase.caseId, action: candidateAction.id, reason: 'action mismatch' });
            }
            if (candidateAction.delta !== 1) {
                differences.push({ caseId: candidateCase.caseId, action: candidateAction.id,
                    reason: 'candidate native callback did not fire exactly once', delta: candidateAction.delta });
            }
            if (controlAction?.delta === 0 && candidateAction.delta === 1) {
                improvements.push({ caseId: candidateCase.caseId, action: candidateAction.id,
                    reason: 'stable control keyboard action had no native effect' });
            } else if (controlAction?.delta !== candidateAction.delta) {
                differences.push({ caseId: candidateCase.caseId, action: candidateAction.id,
                    reason: 'native callback effect differs', control: controlAction?.delta, candidate: candidateAction.delta });
            }
            if (candidateAction.mode === 'pointer') {
                if (!candidateAction.pointer || !candidateAction.before.visible
                    || !candidateAction.before.centerHit || !candidateAction.before.inViewport) {
                    differences.push({ caseId: candidateCase.caseId, action: candidateAction.id, reason: 'candidate pointer reachability' });
                }
            } else if (!candidateAction.keyboard || !candidateAction.focused) {
                differences.push({ caseId: candidateCase.caseId, action: candidateAction.id, reason: 'candidate keyboard activation' });
            }
            return {
                id: candidateAction.id,
                mode: candidateAction.mode,
                control: { count: controlAction?.count, delta: controlAction?.delta,
                    activated: controlAction?.pointer ?? controlAction?.keyboard,
                    focused: controlAction?.focused ?? null,
                    centerHit: controlAction?.before.centerHit, inViewport: controlAction?.before.inViewport },
                candidate: { count: candidateAction.count, delta: candidateAction.delta,
                    activated: candidateAction.pointer ?? candidateAction.keyboard,
                    focused: candidateAction.focused ?? null,
                    centerHit: candidateAction.before.centerHit, inViewport: candidateAction.before.inViewport },
            };
        });
        if (candidateCase.rankOpen) {
            for (const [name, popup] of Object.entries({ rank: candidateCase.rankOpen, tip: candidateCase.tipOpen })) {
                if (!popup.originalNode || !popup.originalParent || popup.display === 'none'
                    || !popup.centerHit || !popup.inViewport) {
                    differences.push({ caseId: candidateCase.caseId, action: name, reason: 'candidate original popup unreachable' });
                }
            }
            if (candidateCase.final.rank !== 4 || candidateCase.final.tip !== 4
                || candidateCase.final.host.relation !== 2 || candidateCase.final.host.guide !== 2
                || candidateCase.final.host.issue !== 2 || candidateCase.final.cloneCount !== 0) {
                differences.push({ caseId: candidateCase.caseId, reason: 'candidate native action total or clone count' });
            }
        } else if (!candidateCase.final.originalNode || !candidateCase.final.originalParent
            || candidateCase.final.calls !== 2 || candidateCase.final.trusted.some((value) => value !== true)
            || candidateCase.final.cloneCount !== 0) {
            differences.push({ caseId: candidateCase.caseId, reason: 'candidate original recommendation control' });
        }
        if (!candidateCase.replacement.originalDetached || !candidateCase.replacement.currentNode
            || !candidateCase.replacement.copiedMarkerCleared
            || candidateCase.replacement.currentMarker !== '1'
            || !candidateCase.disposed.markerClean
            || Object.values(candidateCase.disposed.resources).some((value) => value !== 0 && value !== false)
            || (candidateCase.rankOpen && (!candidateCase.replacement.rankUnderCurrent
                || !candidateCase.disposed.popupUnderCurrent))) {
            differences.push({ caseId: candidateCase.caseId, reason: 'candidate replacement or teardown contract' });
        }
        return { caseId: candidateCase.caseId, actions,
            controlPopups: controlCase?.rankOpen ? { rank: controlCase.rankOpen, tip: controlCase.tipOpen } : null,
            candidatePopups: candidateCase.rankOpen ? { rank: candidateCase.rankOpen, tip: candidateCase.tipOpen } : null,
            replacement: { control: controlCase?.replacement, candidate: candidateCase.replacement },
            teardown: { control: null, candidate: candidateCase.disposed } };
    });
    if (sides.control.observations.length !== sides.candidate.observations.length
        || sides.control.browser !== sides.candidate.browser) {
        differences.push({ reason: 'observation count or browser differs' });
    }
    const result = {
        schemaVersion: 1,
        kind: 'header-published-stable-to-current-action-inventory',
        controlSha256, candidateSha256, observerSha256: hash(await readFile(scriptPath)),
        evidenceBinding: await createEvidenceBinding(root), browser: sides.candidate.browser,
        scope: 'Separate browser processes and storage; major/minor list native callback outcomes, original node and popup reachability, and declared candidate-only drawer visual geometry. Stable pointer misses are retained as control evidence, never normalized into candidate success.',
        rows, improvements, differences,
    };
    await writeFile(output, JSON.stringify(result, null, 2) + '\n');
    console.log(`Header action inventory: ${differences.length ? 'FAIL' : 'PASS'}; ${rows.length} cases, ${differences.length} regressions, ${improvements.length} control defects improved`);
    if (differences.length) process.exitCode = 1;
}
