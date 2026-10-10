import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { startServer } from './server/server.mjs';
import { createTestPage, launchBrowser, storageKeys, waitForSettled } from './harness/runner-utils.mjs';
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
    { id: 'major-list-390', path: '/board/lists?id=test', width: 390 },
    { id: 'minor-list-390', path: '/mgallery/board/lists?id=test', width: 390 },
    { id: 'minor-list-750', path: '/mgallery/board/lists?id=test', width: 750 },
    { id: 'minor-list-750-dark', path: '/mgallery/board/lists?id=test', width: 750, dark: true },
    { id: 'minor-list-1280', path: '/mgallery/board/lists?id=test', width: 1280 },
    { id: 'major-view-750', path: '/board/view?id=test&no=1001&header=1', width: 750 },
    { id: 'minor-view-750-dark', path: '/mgallery/board/view?id=test&no=1001&header=1', width: 750, dark: true },
    { id: 'minor-write-1280', path: '/mgallery/board/write/?id=test', width: 1280 },
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
    try {
        for (const testCase of cases) {
            const session = await createTestPage(browser, server.baseUrl, {
                viewport: { width: testCase.width, height: 900 },
                storage: {
                    [storageKeys.threshold]: 0,
                    [storageKeys.ratioEnabled]: false,
                    [storageKeys.personalEnabled]: true,
                    [storageKeys.personalList]: { uids: [], nicknames: [], ips: [] },
                },
            });
            try {
                await session.page.emulateMedia({ reducedMotion: 'reduce' });
                await session.goto(testCase.path);
                if (testCase.dark) {
                    await session.page.evaluate(() => {
                        const style = document.createElement('style');
                        style.id = 'css-darkmode';
                        document.head.appendChild(style);
                    });
                    await session.page.waitForFunction(() => document.body.classList.contains('dc-filter-dark-mode'));
                }
                await session.page.waitForFunction(() => document.querySelector('.newvisit_history .newvisit_list')?.dataset.dcufRecentNavigationBound === '1'
                    || !document.querySelector('.newvisit_history'));
                const baseline = await session.page.evaluate(() => {
                    const root = document.querySelector('.newvisit_history');
                    const list = root?.querySelector('.newvisit_list');
                    const prev = root?.querySelector('.bnt_visit_prev, .btn_visit_prev');
                    const next = root?.querySelector('.bnt_visit_next, .btn_visit_next');
                    window.__dcufHeaderDifferentialNodes = { root, list, prev, next };
                    return {
                        handlers: [prev?.getAttribute('onclick') ?? null, next?.getAttribute('onclick') ?? null],
                        parents: [root?.parentElement?.className ?? null, list?.parentElement?.className ?? null],
                    };
                });
                const capture = async (step) => session.page.evaluate(({ caseId, stepName, baselineValue }) => {
                    const saved = window.__dcufHeaderDifferentialNodes;
                    const root = document.querySelector('.newvisit_history');
                    const list = root?.querySelector('.newvisit_list');
                    const prev = root?.querySelector('.bnt_visit_prev, .btn_visit_prev');
                    const next = root?.querySelector('.bnt_visit_next, .btn_visit_next');
                    const title = root?.querySelector(':scope > .tit');
                    const box = root?.querySelector(':scope > .newvisit_box');
                    const item = list?.querySelector('li');
                    const more = root?.querySelector(':scope > .bnt_newvisit_more, :scope > .btn_newvisit_more');
                    const rect = (element) => {
                        const bounds = element?.getBoundingClientRect();
                        if (!bounds) return null;
                        return Object.fromEntries(['x', 'y', 'width', 'height'].map((key) => [key, Math.round(bounds[key] * 10) / 10]));
                    };
                    const style = (element) => {
                        if (!element) return null;
                        const computed = getComputedStyle(element);
                        return {
                            display: computed.display,
                            position: computed.position,
                            color: computed.color,
                            background: computed.backgroundColor,
                            borderColor: computed.borderColor,
                            padding: computed.padding,
                            margin: computed.margin,
                            width: computed.width,
                            minWidth: computed.minWidth,
                            height: computed.height,
                            flex: computed.flex,
                            whiteSpace: computed.whiteSpace,
                            overflowX: computed.overflowX,
                            overflowY: computed.overflowY,
                            transform: computed.transform,
                        };
                    };
                    const hit = (element) => {
                        const bounds = element?.getBoundingClientRect();
                        if (!bounds?.width || !bounds.height) return false;
                        const target = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
                        return target === element || element.contains(target);
                    };
                    return {
                        caseId,
                        step: stepName,
                        semantic: {
                            hasHeader: root instanceof HTMLElement,
                            rootCount: document.querySelectorAll('.newvisit_history').length,
                            originalNodes: root === saved.root && list === saved.list && prev === saved.prev && next === saved.next,
                            handlers: [prev?.getAttribute('onclick') ?? null, next?.getAttribute('onclick') ?? null],
                            parentClasses: [root?.parentElement?.className ?? null, list?.parentElement?.className ?? null],
                            originalHandlers: baselineValue.handlers,
                            originalParents: baselineValue.parents,
                            scrollLeft: list?.scrollLeft ?? null,
                            scrollMax: list ? Math.max(0, list.scrollWidth - list.clientWidth) : null,
                            left: list ? getComputedStyle(list).left : null,
                            inlineLeft: list?.style.getPropertyValue('left') ?? null,
                            inlineLeftPriority: list?.style.getPropertyPriority('left') ?? null,
                            prevDisabled: prev?.getAttribute('aria-disabled') ?? null,
                            nextDisabled: next?.getAttribute('aria-disabled') ?? null,
                            prevOn: prev?.classList.contains('on') ?? null,
                            nextOn: next?.classList.contains('on') ?? null,
                            prevFocused: document.activeElement === prev,
                        },
                        visual: {
                            root: rect(root), title: rect(title), box: rect(box), list: rect(list), item: rect(item), prev: rect(prev), next: rect(next), more: rect(more),
                            rootStyle: style(root), titleStyle: style(title), boxStyle: style(box), listStyle: style(list), itemStyle: style(item), prevStyle: style(prev), nextStyle: style(next), moreStyle: style(more),
                            prevHit: hit(prev), nextHit: hit(next), moreHit: hit(more),
                        },
                    };
                }, { caseId: testCase.id, stepName: step, baselineValue: baseline });
                observations.push(await capture('initial'));
                if (!testCase.id.includes('write')) {
                    await session.page.locator('.newvisit_history .bnt_visit_next').click();
                    await session.page.waitForFunction(() => document.querySelector('.newvisit_history .newvisit_list')?.scrollLeft > 1);
                    await waitForSettled(session.page, 50);
                    observations.push(await capture('pointer-next'));
                    await session.page.locator('.newvisit_history .bnt_visit_prev').focus();
                    await session.page.locator('.newvisit_history .bnt_visit_prev').press('Enter');
                    await session.page.waitForFunction(() => document.querySelector('.newvisit_history .newvisit_list')?.scrollLeft < 1);
                    await waitForSettled(session.page, 50);
                    observations.push(await capture('keyboard-prev'));
                    await session.page.evaluate(() => {
                        const current = document.querySelector('.newvisit_history');
                        const replacement = current.cloneNode(true);
                        replacement.dataset.fixtureRecentVisitDifferentialReplacement = '1';
                        current.replaceWith(replacement);
                    });
                    await session.page.waitForFunction(() => document.querySelector('.newvisit_history[data-fixture-recent-visit-differential-replacement="1"] .newvisit_list')?.dataset.dcufRecentNavigationBound === '1');
                    await waitForSettled(session.page, 50);
                    observations.push(await capture('root-replaced'));
                }
                if (session.consoleErrors.length) throw new Error(`${testCase.id}: ${session.consoleErrors.join('\n')}`);
            } finally {
                await session.close();
            }
        }
        await writeFile(output, JSON.stringify({
            schemaVersion: 1,
            artifactSha256: hash(bytes),
            browser: browser.version(),
            observations,
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
    const expectedControlSha256 = required('--expected-control-sha').toUpperCase();
    const controlSha256 = hash(await readFile(control));
    const candidateSha256 = hash(await readFile(candidate));
    if (controlSha256 !== expectedControlSha256) {
        throw new Error('Control does not match the frozen immediate pre-extraction artifact');
    }
    if (candidateSha256 === controlSha256) throw new Error('Candidate must differ from control');
    console.log(`Control runtime: ${control}; SHA-256 ${controlSha256}`);
    console.log(`Candidate runtime: ${candidate}; SHA-256 ${candidateSha256}`);
    const sides = {};
    for (const [name, runtime] of Object.entries({ control, candidate })) {
        const sideOutput = path.join(root, 'testbed/artifacts', `header-recent-visit-${name}-side.json`);
        const result = spawnSync(process.execPath, [scriptPath, '--side', runtime, '--output', sideOutput], {
            cwd: root,
            stdio: 'inherit',
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
    if (sides.control.browser !== sides.candidate.browser) differences.push({ field: 'browser', control: sides.control.browser, candidate: sides.candidate.browser });
    const result = {
        schemaVersion: 1,
        kind: 'header-recent-visit-zero-delta-differential',
        controlSha256,
        candidateSha256,
        observerSha256: hash(await readFile(scriptPath)),
        expectedControlSha256,
        evidenceBinding: await createEvidenceBinding(root),
        browser: sides.candidate.browser,
        observations: sides.candidate.observations.length,
        differences,
    };
    await writeFile(output, JSON.stringify(result, null, 2) + '\n');
    console.log(`Header recent-visit differential: ${differences.length === 0 ? 'PASS' : 'FAIL'}; ${differences.length} differences across ${result.observations} observations`);
    if (differences.length) process.exitCode = 1;
}
