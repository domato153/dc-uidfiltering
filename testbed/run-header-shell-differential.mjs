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
                    const logo = document.querySelector('.dcheader.typea h1.dc_logo');
                    if (!logo) return;
                    for (const [name, className] of [
                        ['primary', 'logo_img'],
                        ['alternate', 'logo_img2'],
                        ['combined', 'logo_img logo_img2'],
                    ]) {
                        const image = document.createElement('img');
                        image.className = className;
                        image.alt = name;
                        image.dataset.fixtureHeaderShellLogo = name;
                        image.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
                        logo.appendChild(image);
                    }
                });
                await session.page.waitForFunction(() => {
                    const image = document.querySelector('[data-fixture-header-shell-logo="combined"]');
                    return !window.__dcufHeaderShellHostAdapter || !window.__dcufPageContext?.hasListSurface
                        || image?.hasAttribute('data-dcuf-header-shell-role');
                });
                await waitForSettled(session.page, 50);
                await session.page.evaluate(() => {
                    const root = document.querySelector('.dcheader.typea');
                    window.__dcufHeaderShellDifferentialBaseline = {
                        root,
                        head: root?.querySelector('.dchead'),
                        form: root?.querySelector('.wrap_search form'),
                        input: root?.querySelector('.wrap_search input'),
                        button: root?.querySelector('.wrap_search button'),
                        login: root?.querySelector('.area_links a'),
                    };
                    window.__dcufHeaderShellSubmitCount = 0;
                    document.addEventListener('submit', (event) => {
                        if (!event.target.matches('.dcheader.typea .wrap_search form')) return;
                        event.preventDefault();
                        window.__dcufHeaderShellSubmitCount += 1;
                    }, true);
                });
                const capture = async (step) => session.page.evaluate(({ caseId, stepName }) => {
                    const saved = window.__dcufHeaderShellDifferentialBaseline;
                    const root = document.querySelector('.dcheader.typea');
                    const head = root?.querySelector('.dchead');
                    const logo = head?.querySelector('h1.dc_logo');
                    const image = logo?.querySelector('img.logo_img');
                    const imageAlt = logo?.querySelector('img.logo_img2');
                    const imageBoth = logo?.querySelector('[data-fixture-header-shell-logo="combined"]');
                    const search = head?.querySelector('.wrap_search');
                    const form = search?.querySelector('form');
                    const topSearch = search?.querySelector('.top_search');
                    const input = search?.querySelector('input');
                    const button = search?.querySelector('button');
                    const links = head?.querySelector('.area_links');
                    const login = links?.querySelector('a');
                    const rect = (element) => {
                        const bounds = element?.getBoundingClientRect();
                        if (!bounds) return null;
                        return Object.fromEntries(['x', 'y', 'width', 'height'].map((key) => [key, Math.round(bounds[key] * 10) / 10]));
                    };
                    const style = (element) => {
                        if (!element) return null;
                        const computed = getComputedStyle(element);
                        return Object.fromEntries([
                            'display', 'position', 'cssFloat', 'width', 'minWidth', 'maxWidth', 'height', 'boxSizing',
                            'padding', 'margin', 'gap', 'backgroundColor', 'color', 'borderBottomColor',
                            'borderBottomWidth', 'alignItems', 'justifyContent', 'flexGrow', 'flexShrink',
                            'whiteSpace', 'overflowX', 'overflowY', 'zIndex', 'pointerEvents'
                        ].map((key) => [key, computed[key]]));
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
                            rootCount: document.querySelectorAll('.dcheader.typea').length,
                            originalRoot: root === saved.root,
                            originalHead: head === saved.head,
                            originalForm: form === saved.form,
                            originalInput: input === saved.input,
                            originalButton: button === saved.button,
                            originalLogin: login === saved.login,
                            parentClasses: [head?.parentElement?.className ?? null, form?.parentElement?.className ?? null, login?.parentElement?.className ?? null],
                            searchForm: form ? { method: form.getAttribute('method'), action: form.getAttribute('action') } : null,
                            input: input ? { type: input.getAttribute('type'), name: input.getAttribute('name'), ariaLabel: input.getAttribute('aria-label') } : null,
                            button: button ? { type: button.getAttribute('type'), ariaLabel: button.getAttribute('aria-label') } : null,
                            loginHref: login?.getAttribute('href') ?? null,
                            submitCount: window.__dcufHeaderShellSubmitCount,
                            hash: location.hash,
                            focus: document.activeElement === input ? 'input' : document.activeElement === button ? 'button' : document.activeElement === login ? 'login' : 'other',
                        },
                        visual: {
                            root: rect(root), head: rect(head), logo: rect(logo), image: rect(image), imageAlt: rect(imageAlt), imageBoth: rect(imageBoth),
                            search: rect(search), form: rect(form), topSearch: rect(topSearch), input: rect(input), button: rect(button), links: rect(links), login: rect(login),
                            rootStyle: style(root), headStyle: style(head), logoStyle: style(logo), imageStyle: style(image), imageAltStyle: style(imageAlt), imageBothStyle: style(imageBoth),
                            searchStyle: style(search), formStyle: style(form), topSearchStyle: style(topSearch), inputStyle: style(input), buttonStyle: style(button), linksStyle: style(links), loginStyle: style(login),
                            inputHit: hit(input), buttonHit: hit(button), loginHit: hit(login),
                        },
                    };
                }, { caseId: testCase.id, stepName: step });
                observations.push(await capture('initial'));
                const hasSearch = await session.page.locator('.dcheader.typea .wrap_search form').count() > 0;
                if (hasSearch) {
                    await session.page.locator('.dcheader.typea .wrap_search button').click({ timeout: 3000 }).catch(() => {});
                    observations.push(await capture('pointer-search'));
                    await session.page.locator('.dcheader.typea .wrap_search input').focus();
                    await session.page.locator('.dcheader.typea .wrap_search input').press('Enter');
                    observations.push(await capture('keyboard-search'));
                }
                if (await session.page.locator('.dcheader.typea .area_links a').count()) {
                    await session.page.locator('.dcheader.typea .area_links a').click({ timeout: 3000 }).catch(() => {});
                    observations.push(await capture('pointer-login'));
                }
                if (hasSearch) {
                    await session.page.evaluate(() => {
                        const current = document.querySelector('.dcheader.typea .wrap_search');
                        const replacement = current.cloneNode(true);
                        replacement.dataset.fixtureHeaderShellDifferentialSearchReplacement = '1';
                        current.replaceWith(replacement);
                    });
                    await session.page.waitForFunction(() => {
                        const replacement = document.querySelector('[data-fixture-header-shell-differential-search-replacement="1"]');
                        return !window.__dcufHeaderShellHostAdapter || !window.__dcufPageContext?.hasListSurface
                            || replacement?.getAttribute('data-dcuf-header-shell-role') === 'search-wrap';
                    });
                    await waitForSettled(session.page, 50);
                    observations.push(await capture('search-replaced'));
                }
                if (await session.page.locator('.dcheader.typea').count()) {
                    await session.page.evaluate(() => {
                        const current = document.querySelector('.dcheader.typea');
                        const replacement = current.cloneNode(true);
                        replacement.dataset.fixtureHeaderShellDifferentialRootReplacement = '1';
                        current.replaceWith(replacement);
                    });
                    await session.page.waitForFunction(() => {
                        const replacement = document.querySelector('[data-fixture-header-shell-differential-root-replacement="1"]');
                        return !window.__dcufHeaderShellHostAdapter || !window.__dcufPageContext?.hasListSurface
                            || replacement?.getAttribute('data-dcuf-header-shell-role') === 'root';
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
        const sideOutput = path.join(root, 'testbed/artifacts', `header-shell-${name}-side.json`);
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
    const positivePointerSearch = (side) => side.observations.some((entry) => entry.step === 'pointer-search'
        && entry.semantic.submitCount === 1 && entry.visual.buttonHit && entry.visual.button?.width > 0 && entry.visual.button?.height > 0);
    const positiveKeyboardSearch = (side) => side.observations.some((entry) => entry.step === 'keyboard-search'
        && entry.semantic.submitCount === 2 && entry.semantic.focus === 'input');
    const positiveLogin = (side) => side.observations.some((entry) => entry.step === 'pointer-login'
        && entry.semantic.hash === '#login' && entry.visual.loginHit);
    for (const [name, check] of Object.entries({ positivePointerSearch, positiveKeyboardSearch, positiveLogin })) {
        if (!check(sides.control) || !check(sides.candidate)) differences.push({ field: name });
    }
    const result = {
        schemaVersion: 1,
        kind: 'header-shell-zero-delta-differential',
        controlSha256,
        candidateSha256,
        observerSha256: hash(await readFile(scriptPath)),
        expectedControlSha256,
        evidenceBinding: await createEvidenceBinding(root),
        browser: sides.candidate.browser,
        observations: sides.candidate.observations.length,
        positivePointerSearch: positivePointerSearch(sides.candidate),
        positiveKeyboardSearch: positiveKeyboardSearch(sides.candidate),
        positiveLogin: positiveLogin(sides.candidate),
        differences,
    };
    await writeFile(output, JSON.stringify(result, null, 2) + '\n');
    console.log(`Header shell differential: ${differences.length === 0 ? 'PASS' : 'FAIL'}; ${differences.length} differences across ${result.observations} observations`);
    if (differences.length) process.exitCode = 1;
}
