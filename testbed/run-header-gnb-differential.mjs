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
    { id: 'mini-list-390', path: '/mini/board/lists?id=test', width: 390 },
    { id: 'minor-list-750', path: '/mgallery/board/lists?id=test', width: 750 },
    { id: 'minor-list-750-dark', path: '/mgallery/board/lists?id=test', width: 750, dark: true },
    { id: 'mini-list-1280', path: '/mini/board/lists?id=test', width: 1280 },
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
                    || !document.querySelector('.newvisit_history .newvisit_list'));
                await session.page.locator('#dcuf-testbed-controls').evaluate((element) => { element.style.display = 'none'; }).catch(() => {});
                await session.page.evaluate(() => {
                    const root = document.querySelector('.gnb_bar');
                    window.__dcufGnbDifferentialBaseline = {
                        root,
                        nav: root?.querySelector('nav.gnb'),
                        list: root?.querySelector('.gnb_list'),
                        links: Array.from(root?.querySelectorAll('.gnb_list a') || []),
                    };
                    window.__dcufGnbPointerActivated = false;
                });
                const capture = async (step) => session.page.evaluate(({ caseId, stepName }) => {
                    const saved = window.__dcufGnbDifferentialBaseline;
                    const root = document.querySelector('.gnb_bar');
                    const nav = root?.querySelector('nav.gnb');
                    const list = root?.querySelector('.gnb_list');
                    const links = Array.from(root?.querySelectorAll('.gnb_list a') || []);
                    const icon = root?.querySelector('.gnb_list .sp_img.icon_next');
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
                            float: computed.cssFloat,
                            width: computed.width,
                            minWidth: computed.minWidth,
                            height: computed.height,
                            boxSizing: computed.boxSizing,
                            padding: computed.padding,
                            margin: computed.margin,
                            background: computed.backgroundColor,
                            color: computed.color,
                            borderColor: computed.borderColor,
                            justifyContent: computed.justifyContent,
                            flexWrap: computed.flexWrap,
                            overflowX: computed.overflowX,
                            overflowY: computed.overflowY,
                            zIndex: computed.zIndex,
                            pointerEvents: computed.pointerEvents,
                        };
                    };
                    const hit = (element) => {
                        const bounds = element?.getBoundingClientRect();
                        if (!bounds || bounds.width <= 0 || bounds.height <= 0) return false;
                        const target = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
                        return target === element || element.contains(target);
                    };
                    return {
                        caseId,
                        step: stepName,
                        semantic: {
                            rootCount: document.querySelectorAll('.gnb_bar').length,
                            originalNodes: root === saved.root && nav === saved.nav && list === saved.list,
                            originalLinks: links.length === saved.links.length && links.every((link, index) => link === saved.links[index]),
                            parentClasses: [root?.parentElement?.className ?? null, nav?.parentElement?.className ?? null, list?.parentElement?.className ?? null],
                            hrefs: links.map((link) => link.getAttribute('href')),
                            hash: location.hash,
                            focusedLink: links.findIndex((link) => link === document.activeElement),
                            pointerActivated: window.__dcufGnbPointerActivated,
                        },
                        visual: {
                            header: rect(document.querySelector('.dcheader.typea')),
                            root: rect(root), nav: rect(nav), list: rect(list),
                            firstLink: rect(links[0]), secondLink: rect(links[1]), icon: rect(icon),
                            rootStyle: style(root), navStyle: style(nav), listStyle: style(list),
                            firstLinkStyle: style(links[0]), secondLinkStyle: style(links[1]), iconStyle: style(icon),
                            firstLinkHit: hit(links[0]), secondLinkHit: hit(links[1]),
                        },
                    };
                }, { caseId: testCase.id, stepName: step });
                observations.push(await capture('initial'));
                const hasLinks = await session.page.locator('.gnb_bar .gnb_list a').count() > 1;
                if (hasLinks) {
                    try {
                        await session.page.locator('.gnb_bar .gnb_list a').nth(0).click({ timeout: 3000 });
                        await session.page.evaluate(() => { window.__dcufGnbPointerActivated = location.hash === '#gallery'; });
                    } catch {
                        await session.page.evaluate(() => { window.__dcufGnbPointerActivated = false; });
                    }
                    observations.push(await capture('pointer-link'));
                    await session.page.locator('.gnb_bar .gnb_list a').nth(1).focus();
                    await session.page.locator('.gnb_bar .gnb_list a').nth(1).press('Enter');
                    observations.push(await capture('keyboard-link'));
                    await session.page.evaluate(() => {
                        const current = document.querySelector('.gnb_bar');
                        const replacement = current.cloneNode(true);
                        replacement.dataset.fixtureGnbDifferentialReplacement = '1';
                        current.replaceWith(replacement);
                    });
                    await session.page.waitForFunction(() => {
                        const replacement = document.querySelector('.gnb_bar[data-fixture-gnb-differential-replacement="1"]');
                        if (!replacement) return false;
                        return !window.__dcufHeaderGnbHostAdapter
                            || replacement.getAttribute('data-dcuf-header-gnb-role') === 'root';
                    });
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
    if (controlSha256 !== expectedControlSha256) throw new Error('Control does not match frozen immediate pre-extraction artifact');
    if (candidateSha256 === controlSha256) throw new Error('Candidate must differ from control');
    console.log(`Control runtime: ${control}; SHA-256 ${controlSha256}`);
    console.log(`Candidate runtime: ${candidate}; SHA-256 ${candidateSha256}`);
    const sides = {};
    for (const [name, runtime] of Object.entries({ control, candidate })) {
        const sideOutput = path.join(root, 'testbed/artifacts', `header-gnb-${name}-side.json`);
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
    const positivePointer = (side) => side.observations.some((entry) => entry.step === 'pointer-link'
        && entry.semantic.pointerActivated && entry.visual.firstLinkHit && entry.visual.firstLink?.width > 0 && entry.visual.firstLink?.height > 0);
    const positiveKeyboard = (side) => side.observations.some((entry) => entry.step === 'keyboard-link'
        && entry.semantic.hash === '#minor' && entry.semantic.focusedLink === 1);
    if (!positivePointer(sides.control) || !positivePointer(sides.candidate)) differences.push({ field: 'positive-pointer-path' });
    if (!positiveKeyboard(sides.control) || !positiveKeyboard(sides.candidate)) differences.push({ field: 'positive-keyboard-path' });
    const result = {
        schemaVersion: 1,
        kind: 'header-gnb-zero-delta-differential',
        controlSha256,
        candidateSha256,
        observerSha256: hash(await readFile(scriptPath)),
        expectedControlSha256,
        evidenceBinding: await createEvidenceBinding(root),
        browser: sides.candidate.browser,
        observations: sides.candidate.observations.length,
        positivePointer: positivePointer(sides.candidate),
        positiveKeyboard: positiveKeyboard(sides.candidate),
        differences,
    };
    await writeFile(output, JSON.stringify(result, null, 2) + '\n');
    console.log(`Header GNB differential: ${differences.length === 0 ? 'PASS' : 'FAIL'}; ${differences.length} differences across ${result.observations} observations`);
    if (differences.length) process.exitCode = 1;
}
