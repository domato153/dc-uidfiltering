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
                    const title = document.querySelector('.page_head.fixture-gallery-heading');
                    const issue = document.querySelector('.page_head > .fr')?.parentElement;
                    window.__dcufPageHeadDifferentialBaseline = {
                        title,
                        titleLeft: title?.querySelector(':scope > .fl'),
                        form: title?.querySelector('form.gall_search'),
                        input: title?.querySelector('form.gall_search input'),
                        submit: title?.querySelector('form.gall_search button[type="submit"]'),
                        issue,
                        issueRight: issue?.querySelector(':scope > .fr'),
                        relation: issue?.querySelector('button.relate'),
                        guide: issue?.querySelector('button.gall_useinfo'),
                        more: issue?.querySelector('button.fixture-issue-more'),
                        relationPopup: document.querySelector('#relation_popup'),
                    };
                    window.__dcufPageHeadSubmitCount = 0;
                    document.addEventListener('submit', (event) => {
                        if (!event.target.matches('.page_head form.gall_search')) return;
                        event.preventDefault();
                        window.__dcufPageHeadSubmitCount += 1;
                    }, true);
                });
                const capture = async (step) => session.page.evaluate(({ caseId, stepName }) => {
                    const saved = window.__dcufPageHeadDifferentialBaseline;
                    const title = document.querySelector('.page_head.fixture-gallery-heading');
                    const titleLeft = title?.querySelector(':scope > .fl');
                    const titleLink = title?.querySelector('h2 a');
                    const form = title?.querySelector('form.gall_search');
                    const input = form?.querySelector('input');
                    const submit = form?.querySelector('button[type="submit"]');
                    const issue = document.querySelector('.page_head > .fr')?.parentElement;
                    const issueRight = issue?.querySelector(':scope > .fr');
                    const relation = issueRight?.querySelector('button.relate');
                    const guide = issueRight?.querySelector('button.gall_useinfo');
                    const more = issueRight?.querySelector('button.fixture-issue-more');
                    const drawerToggle = issueRight?.querySelector('.dcuf-header-drawer__toggle');
                    const relationPopup = document.querySelector('#relation_popup');
                    const listOption = document.querySelector('.list_array_option');
                    const rect = (element) => {
                        const bounds = element?.getBoundingClientRect();
                        if (!bounds) return null;
                        return Object.fromEntries(['x', 'y', 'width', 'height'].map((key) => [key, Math.round(bounds[key] * 10) / 10]));
                    };
                    const style = (element, pseudo = null) => {
                        if (!element) return null;
                        const computed = getComputedStyle(element, pseudo);
                        return Object.fromEntries([
                            'display', 'position', 'width', 'minWidth', 'height', 'minHeight', 'boxSizing',
                            'padding', 'margin', 'marginLeft', 'gap', 'backgroundColor', 'color', 'borderColor',
                            'alignItems', 'justifyContent', 'flexWrap', 'float', 'overflowX', 'overflowY',
                            'zIndex', 'pointerEvents', 'content', 'clear'
                        ].map((key) => [key, computed[key]]));
                    };
                    const hit = (element) => {
                        const bounds = element?.getBoundingClientRect();
                        if (!bounds || bounds.width <= 0 || bounds.height <= 0) return false;
                        const target = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
                        return target === element || element.contains(target);
                    };
                    const popupHitTarget = (() => {
                        const bounds = relationPopup?.getBoundingClientRect();
                        if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;
                        const target = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
                        return target ? { tag: target.tagName, id: target.id, className: target.className } : null;
                    })();
                    const popupAncestors = (() => {
                        if (!relationPopup) return null;
                        const nodes = [];
                        for (let node = relationPopup.parentElement; node && node !== document.documentElement; node = node.parentElement) {
                            const computed = getComputedStyle(node);
                            nodes.push({ tag: node.tagName, id: node.id, className: node.className,
                                position: computed.position, zIndex: computed.zIndex, overflowX: computed.overflowX,
                                overflowY: computed.overflowY, transform: computed.transform, pointerEvents: computed.pointerEvents });
                        }
                        return nodes;
                    })();
                    return {
                        caseId,
                        step: stepName,
                        semantic: {
                            pageHeadCount: document.querySelectorAll('.page_head').length,
                            originalTitle: title === saved.title,
                            originalTitleLeft: titleLeft === saved.titleLeft,
                            originalForm: form === saved.form,
                            originalInput: input === saved.input,
                            originalSubmit: submit === saved.submit,
                            originalIssue: issue === saved.issue,
                            originalIssueRight: issueRight === saved.issueRight,
                            originalRelation: relation === saved.relation,
                            originalGuide: guide === saved.guide,
                            originalMore: more === saved.more,
                            originalRelationPopup: relationPopup === saved.relationPopup,
                            parentClasses: [title?.parentElement?.className ?? null, titleLeft?.parentElement?.className ?? null, issue?.parentElement?.className ?? null, issueRight?.parentElement?.className ?? null, relationPopup?.parentElement?.className ?? null],
                            form: form ? { method: form.getAttribute('method'), action: form.getAttribute('action') } : null,
                            input: input ? { type: input.getAttribute('type'), name: input.getAttribute('name'), ariaLabel: input.getAttribute('aria-label') } : null,
                            submitType: submit?.getAttribute('type') ?? null,
                            submitCount: window.__dcufPageHeadSubmitCount,
                            hostActions: window.__fixtureHostHeaderToggles || null,
                            popupDisplay: relationPopup ? getComputedStyle(relationPopup).display : null,
                            issueOpen: document.querySelector('.issue_wrap')?.classList.contains('open') ?? null,
                            focus: document.activeElement === input ? 'search-input' : document.activeElement === relation ? 'relation' : document.activeElement === guide ? 'guide' : document.activeElement === more ? 'more' : 'other',
                        },
                        visual: {
                            title: rect(title), titleLeft: rect(titleLeft), titleLink: rect(titleLink), form: rect(form), input: rect(input), submit: rect(submit),
                            issue: rect(issue), issueRight: rect(issueRight), relation: rect(relation), guide: rect(guide), more: rect(more), drawerToggle: rect(drawerToggle), relationPopup: rect(relationPopup),
                            titleStyle: style(title), titleLeftStyle: style(titleLeft), titleAfterStyle: style(title, '::after'),
                            issueStyle: style(issue), issueRightStyle: style(issueRight), issueAfterStyle: style(issue, '::after'),
                            listOptionAfterStyle: style(listOption, '::after'), formStyle: style(form), inputStyle: style(input), submitStyle: style(submit),
                            relationStyle: style(relation), guideStyle: style(guide), moreStyle: style(more), popupStyle: style(relationPopup),
                            inputHit: hit(input), submitHit: hit(submit), relationHit: hit(relation), guideHit: hit(guide), moreHit: hit(more), drawerToggleHit: hit(drawerToggle), popupHit: hit(relationPopup), popupHitTarget, popupAncestors,
                        },
                    };
                }, { caseId: testCase.id, stepName: step });
                observations.push(await capture('initial'));
                if (await session.page.locator('.page_head.fixture-gallery-heading form.gall_search').count()) {
                    await session.page.locator('.page_head.fixture-gallery-heading button[type="submit"]').click({ timeout: 3000 }).catch(() => {});
                    observations.push(await capture('pointer-search'));
                    await session.page.locator('.page_head.fixture-gallery-heading form.gall_search input').focus();
                    await session.page.locator('.page_head.fixture-gallery-heading form.gall_search input').press('Enter');
                    observations.push(await capture('keyboard-search'));
                }
                if (await session.page.locator('.page_head > .fr button.relate').count()) {
                    await session.page.locator('.page_head > .fr button.relate').click({ timeout: 3000 }).catch(() => {});
                    observations.push(await capture('relation-open'));
                    await session.page.locator('.page_head > .fr button.relate').click({ timeout: 3000 }).catch(() => {});
                    await session.page.locator('.page_head > .fr button.gall_useinfo').click({ timeout: 3000 }).catch(() => {});
                    await session.page.locator('.page_head > .fr button.fixture-issue-more').click({ timeout: 3000 }).catch(() => {});
                    observations.push(await capture('native-actions'));
                }
                if (await session.page.locator('.page_head.fixture-gallery-heading').count()) {
                    await session.page.evaluate(() => {
                        const current = document.querySelector('.page_head.fixture-gallery-heading');
                        const replacement = current.cloneNode(true);
                        replacement.dataset.fixturePageHeadDifferentialTitleReplacement = '1';
                        current.replaceWith(replacement);
                    });
                    await session.page.waitForFunction(() => {
                        const replacement = document.querySelector('[data-fixture-page-head-differential-title-replacement="1"]');
                        return !window.__dcufGalleryPageHeadHostAdapter || !window.__dcufPageContext?.hasListSurface
                            || (replacement?.getAttribute('data-dcuf-gallery-page-head-role') === 'root'
                                && !window.__dcufPageHeadDifferentialBaseline.title.hasAttribute('data-dcuf-gallery-page-head-role'));
                    });
                    await waitForSettled(session.page, 50);
                    observations.push(await capture('title-replaced'));
                }
                if (await session.page.locator('.page_head > .fr').count()) {
                    await session.page.evaluate(() => {
                        const current = document.querySelector('.page_head > .fr').parentElement;
                        const replacement = current.cloneNode(true);
                        replacement.dataset.fixturePageHeadDifferentialIssueReplacement = '1';
                        current.replaceWith(replacement);
                    });
                    await session.page.waitForFunction(() => {
                        const replacement = document.querySelector('[data-fixture-page-head-differential-issue-replacement="1"]');
                        return !window.__dcufGalleryPageHeadHostAdapter || !window.__dcufPageContext?.hasListSurface
                            || (replacement?.getAttribute('data-dcuf-gallery-page-head-role') === 'root'
                                && !window.__dcufPageHeadDifferentialBaseline.issue.hasAttribute('data-dcuf-gallery-page-head-role'));
                    });
                    await waitForSettled(session.page, 50);
                    observations.push(await capture('issue-replaced'));
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
    const expectedControlSha256 = required('--expected-control-sha').toUpperCase();
    const controlSha256 = hash(await readFile(control));
    const candidateSha256 = hash(await readFile(candidate));
    if (controlSha256 !== expectedControlSha256) throw new Error('Control does not match frozen immediate pre-extraction artifact');
    if (candidateSha256 === controlSha256) throw new Error('Candidate must differ from control');
    if (args.includes('--require-runtime-under-test')
        && candidate !== path.join(root, 'testbed', 'artifacts', 'runtime-under-test.user.js')) {
        throw new Error(`Source-work runtime guard rejected ${candidate}`);
    }
    console.log(`Control runtime: ${control}\nControl SHA-256: ${controlSha256}`);
    console.log(`Candidate runtime: ${candidate}\nCandidate SHA-256: ${candidateSha256}`);
    const sides = {};
    for (const [name, runtime] of Object.entries({ control, candidate })) {
        const sideOutput = path.join(root, 'testbed/artifacts', `gallery-page-head-${name}-side.json`);
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
        && entry.semantic.submitCount === 1 && entry.visual.submitHit && entry.visual.submit?.width > 0);
    const positiveKeyboardSearch = (side) => side.observations.some((entry) => entry.step === 'keyboard-search'
        && entry.semantic.submitCount === 2 && entry.semantic.focus === 'search-input');
    const positiveNativeActions = (side) => side.observations.some((entry) => entry.step === 'native-actions'
        && entry.semantic.hostActions?.relation === 2 && entry.semantic.hostActions?.guide === 1
        && entry.semantic.hostActions?.issue === 1 && entry.visual.relationHit && entry.visual.guideHit && entry.visual.moreHit);
    const positivePopup = (side) => side.observations.some((entry) => entry.step === 'relation-open'
        && entry.semantic.popupDisplay === 'block' && entry.semantic.originalRelationPopup
        && entry.visual.relationPopup?.width > 0 && entry.visual.popupHit);
    for (const [name, check] of Object.entries({ positivePointerSearch, positiveKeyboardSearch, positiveNativeActions, positivePopup })) {
        if (!check(sides.control) || !check(sides.candidate)) differences.push({ field: name });
    }
    const result = {
        schemaVersion: 1,
        kind: 'gallery-page-head-zero-delta-differential',
        controlSha256,
        candidateSha256,
        observerSha256: hash(await readFile(scriptPath)),
        expectedControlSha256,
        evidenceBinding: await createEvidenceBinding(root),
        browser: sides.candidate.browser,
        observations: sides.candidate.observations.length,
        positivePointerSearch: positivePointerSearch(sides.candidate),
        positiveKeyboardSearch: positiveKeyboardSearch(sides.candidate),
        positiveNativeActions: positiveNativeActions(sides.candidate),
        positivePopup: positivePopup(sides.candidate),
        differences,
    };
    await writeFile(output, JSON.stringify(result, null, 2) + '\n');
    console.log(`Gallery page-head differential: ${differences.length === 0 ? 'PASS' : 'FAIL'}; ${differences.length} differences across ${result.observations} observations`);
    if (differences.length) process.exitCode = 1;
}
