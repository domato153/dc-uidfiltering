import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { startServer } from './server/server.mjs';
import { createTestPage, launchBrowser, storageKeys } from './harness/runner-utils.mjs';
import { createEvidenceBinding } from '../tools/evidence-binding.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), '..');
const args = process.argv.slice(2);
const required = (flag) => {
    const index = args.indexOf(flag);
    const value = args[index + 1];
    if (index < 0 || !value || value.startsWith('--')) throw new Error(`Missing ${flag}`);
    return value;
};
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const output = path.resolve(root, required('--output'));
await mkdir(path.dirname(output), { recursive: true });

const cases = [
    { id: 'list-390', path: '/mgallery/board/lists/?id=test', width: 390 },
    { id: 'list-750', path: '/mgallery/board/lists/?id=test', width: 750 },
    { id: 'list-750-dark', path: '/mgallery/board/lists/?id=test', width: 750, dark: true },
    { id: 'list-1280', path: '/mgallery/board/lists/?id=test', width: 1280 },
    { id: 'view-750', path: '/mgallery/board/view?id=test&no=1001&header=1', width: 750 },
    { id: 'write-1280', path: '/mgallery/board/write/?id=test', width: 1280 }
];

if (args.includes('--side')) {
    const runtime = path.resolve(root, required('--side'));
    const bytes = await readFile(runtime);
    if (bytes.toString('utf8').match(/^\/\/\s*@name\s+(.+)$/m)?.[1]?.trim() !== 'DC_UserFilter_Mobile') {
        throw new Error('Mobile userscript required');
    }
    process.env.DCUF_TESTBED_USERSCRIPT = runtime;
    process.env.DCUF_TESTBED_TARGET = 'mobile';
    const server = await startServer();
    const browser = await launchBrowser();
    const observations = [];
    let styleDeclarationLedger = null;
    try {
        for (const testCase of cases) {
            const session = await createTestPage(browser, server.baseUrl, {
                viewport: { width: testCase.width, height: 900 },
                storage: {
                    [storageKeys.threshold]: 0,
                    [storageKeys.ratioEnabled]: false,
                    [storageKeys.personalEnabled]: true,
                    [storageKeys.personalList]: { uids: [], nicknames: [], ips: [] }
                }
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
                if (testCase.id.startsWith('list')) {
                    await session.page.waitForFunction(() => document.querySelector('.dcuf-header-drawer__toggle'));
                    await session.page.locator('#dcuf-testbed-controls').evaluate((element) => { element.style.display = 'none'; });
                    if (!styleDeclarationLedger) {
                        styleDeclarationLedger = await session.page.evaluate(() => Array.from(
                            document.getElementById('dcuf-header-drawer-style')?.sheet?.cssRules || [],
                            (rule) => ({
                                declaration: rule.style?.cssText || '',
                                selectorBranches: (rule.selectorText || '').split(',').length
                            })
                        ));
                    }
                }
                await session.page.evaluate(() => {
                    window.__dcufDrawerDifferentialBaseline = {
                        source: document.querySelector('.issue_wrap > .issue_contentbox'),
                        popup: document.querySelector('#hot_rank_pop2'),
                        heading: document.querySelector('.page_head > .fr')?.parentElement,
                        drawer: document.querySelector('.dcuf-header-drawer'),
                        toggle: document.querySelector('.dcuf-header-drawer__toggle')
                    };
                });
                const capture = async (step) => session.page.evaluate(({ caseId, stepName }) => {
                    const baseline = window.__dcufDrawerDifferentialBaseline;
                    const source = document.querySelector('.issue_wrap > .issue_contentbox');
                    const popup = document.querySelector('#hot_rank_pop2');
                    const drawer = document.querySelector('.dcuf-header-drawer');
                    const toggle = drawer?.querySelector('.dcuf-header-drawer__toggle');
                    const body = drawer?.querySelector('.dcuf-header-drawer__body');
                    const bodyInner = drawer?.querySelector('.dcuf-header-drawer__body-inner');
                    const panel = drawer?.querySelector('.dcuf-header-drawer__panel');
                    const intro = drawer?.querySelector('.minor_intro_box');
                    const cloneButton = drawer?.querySelector('.btn_hotall_list');
                    const rect = (element) => {
                        const bounds = element?.getBoundingClientRect();
                        if (!bounds) return null;
                        return Object.fromEntries(['x', 'y', 'width', 'height'].map((key) => [key, Math.round(bounds[key] * 10) / 10]));
                    };
                    const hit = (element) => {
                        const bounds = element?.getBoundingClientRect();
                        if (!bounds?.width || !bounds.height) return false;
                        const target = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
                        return target === element || element.contains(target);
                    };
                    const style = (element) => {
                        if (!element) return null;
                        const computed = getComputedStyle(element);
                        return {
                            display: computed.display,
                            visibility: computed.visibility,
                            position: computed.position,
                            opacity: computed.opacity,
                            background: computed.backgroundColor,
                            backgroundImage: computed.backgroundImage,
                            color: computed.color,
                            borderTopColor: computed.borderTopColor,
                            boxShadow: computed.boxShadow,
                            maxHeight: computed.maxHeight,
                            pointerEvents: computed.pointerEvents
                        };
                    };
                    return {
                        caseId,
                        step: stepName,
                        semantic: {
                            drawerCount: document.querySelectorAll('.dcuf-header-drawer').length,
                            styleCount: document.querySelectorAll('#dcuf-header-drawer-style').length,
                            originalSource: source === baseline.source,
                            sourceParent: source?.parentElement?.className ?? null,
                            originalPopup: popup === baseline.popup,
                            popupCount: document.querySelectorAll('#hot_rank_pop2').length,
                            popupParentIsBody: popup?.parentElement === document.body,
                            popupPortalMarker: popup?.getAttribute('data-dcuf-host-popup-portal') ?? null,
                            cloneHandler: cloneButton?.getAttribute('onclick') ?? null,
                            sourceHandler: source?.querySelector('.btn_hotall_list')?.getAttribute('onclick') ?? null,
                            clonePopupCount: drawer?.querySelectorAll('.pop_wrap').length ?? null,
                            cloneIdCount: drawer?.querySelectorAll('[id]').length ?? null,
                            sameDrawer: drawer === baseline.drawer,
                            sameToggle: toggle === baseline.toggle,
                            headingReplaced: Boolean(baseline.heading && !baseline.heading.isConnected),
                            drawerMountedInHeading: drawer?.parentElement === document.querySelector('.page_head > .fr'),
                            open: drawer?.getAttribute('data-open') ?? null,
                            expanded: toggle?.getAttribute('aria-expanded') ?? null,
                            popupDisplay: popup ? getComputedStyle(popup).display : null,
                            nativePopupToggles: window.__fixtureHotRankToggles ?? null,
                            mutationSubscriber: Number(window.__dcufRuntimeCoordinator?._mutationSubscribers?.has?.('header-drawer') || false)
                        },
                        visual: {
                            drawer: rect(drawer), toggle: rect(toggle), body: rect(body), popup: rect(popup),
                            toggleStyle: style(toggle), bodyStyle: style(body), bodyInnerStyle: style(bodyInner),
                            panelStyle: style(panel), introStyle: style(intro), popupStyle: style(popup),
                            toggleHit: hit(toggle), cloneRankHit: hit(cloneButton), popupCloseHit: hit(popup?.querySelector('.poply_close'))
                        }
                    };
                }, { caseId: testCase.id, stepName: step });
                observations.push(await capture('initial'));
                if (testCase.id.startsWith('list')) {
                    await session.page.locator('.dcuf-header-drawer__toggle').evaluate((element) => element.click());
                    observations.push(await capture('drawer-open'));
                    await session.page.locator('.dcuf-header-drawer .btn_hotall_list').evaluate((element) => element.click());
                    observations.push(await capture('rank-open'));
                    await session.page.locator('#hot_rank_pop2 .poply_close').evaluate((element) => element.click());
                    observations.push(await capture('rank-closed'));
                    await session.page.evaluate(() => {
                        const heading = document.querySelector('.page_head > .fr')?.parentElement;
                        heading.replaceWith(heading.cloneNode(true));
                    });
                    await session.page.waitForFunction(() => {
                        const drawer = document.querySelector('.dcuf-header-drawer');
                        return drawer?.parentElement === document.querySelector('.page_head > .fr')
                            && document.querySelectorAll('.dcuf-header-drawer').length === 1;
                    });
                    observations.push(await capture('heading-replaced'));
                    await session.page.evaluate(() => {
                        const source = document.querySelector('.issue_wrap > .issue_contentbox');
                        const replacement = source.cloneNode(true);
                        replacement.querySelector('.minor_intro_box').textContent = '교체된 원본 갤러리 대문';
                        source.replaceWith(replacement);
                    });
                    await session.page.waitForFunction(() => document.querySelector('.dcuf-header-drawer [data-dcuf-drawer-source="issue"]')
                        ?.textContent?.includes('교체된 원본 갤러리 대문'));
                    observations.push(await capture('source-replaced'));
                }
                if (session.consoleErrors.length) throw new Error(`${testCase.id}: ${session.consoleErrors.join('\n')}`);
            } finally { await session.close(); }
        }
        await writeFile(output, JSON.stringify({ schemaVersion: 1, artifactSha256: hash(bytes), browser: browser.version(), styleDeclarationLedger, observations }, null, 2) + '\n');
    } finally {
        await browser.close();
        await server.close();
    }
} else {
    const control = path.resolve(root, required('--control'));
    const candidate = path.resolve(root, required('--candidate'));
    const priorReportPath = args.includes('--prior-report')
        ? path.resolve(root, required('--prior-report'))
        : path.join(root, 'artifacts/header-recent-visit-differential.json');
    const priorReportBytes = await readFile(priorReportPath);
    const priorReport = JSON.parse(priorReportBytes.toString('utf8'));
    const controlSha256 = hash(await readFile(control));
    const candidateSha256 = hash(await readFile(candidate));
    if (priorReport.differences?.length !== 0 || priorReport.candidateSha256 !== controlSha256) {
        throw new Error('Control does not match the prior verified header candidate');
    }
    if (candidateSha256 === controlSha256) throw new Error('Candidate must differ from control');
    const sides = {};
    for (const [name, runtime] of Object.entries({ control, candidate })) {
        const sideOutput = path.join(root, 'testbed/artifacts', `header-drawer-${name}-side.json`);
        const result = spawnSync(process.execPath, [scriptPath, '--side', runtime, '--output', sideOutput], {
            cwd: root,
            stdio: 'inherit'
        });
        if (result.status !== 0) throw new Error(`${name} observation failed`);
        sides[name] = JSON.parse(await readFile(sideOutput, 'utf8'));
    }
    const differences = [];
    sides.control.observations.forEach((controlEntry, index) => {
        const candidateEntry = sides.candidate.observations[index];
        for (const field of ['semantic', 'visual']) {
            if (!candidateEntry || !isDeepStrictEqual(controlEntry[field], candidateEntry[field])) {
                differences.push({ caseId: controlEntry.caseId, step: controlEntry.step, field, control: controlEntry[field], candidate: candidateEntry?.[field] ?? null });
            }
        }
    });
    if (sides.control.observations.length !== sides.candidate.observations.length) {
        differences.push({ field: 'observation-count', control: sides.control.observations.length, candidate: sides.candidate.observations.length });
    }
    if (sides.control.browser !== sides.candidate.browser) {
        differences.push({ field: 'browser', control: sides.control.browser, candidate: sides.candidate.browser });
    }
    if (!isDeepStrictEqual(sides.control.styleDeclarationLedger, sides.candidate.styleDeclarationLedger)) {
        differences.push({ field: 'style-declaration-ledger', control: sides.control.styleDeclarationLedger, candidate: sides.candidate.styleDeclarationLedger });
    }
    const result = {
        schemaVersion: 1,
        kind: 'header-drawer-zero-delta-differential',
        controlSha256,
        candidateSha256,
        observerSha256: hash(await readFile(scriptPath)),
        priorReportSha256: hash(priorReportBytes),
        evidenceBinding: await createEvidenceBinding(root),
        browser: sides.candidate.browser,
        styleRuleCount: sides.candidate.styleDeclarationLedger?.length || 0,
        observations: sides.candidate.observations.length,
        differences
    };
    await writeFile(output, JSON.stringify(result, null, 2) + '\n');
    console.log(`Header drawer differential: ${differences.length === 0 ? 'PASS' : 'FAIL'}; ${differences.length} differences across ${result.observations} observations`);
    if (differences.length) process.exitCode = 1;
}
