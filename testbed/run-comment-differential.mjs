import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { startServer } from './server/server.mjs';
import { createTestPage, launchBrowser, storageKeys, waitForSettled } from './harness/runner-utils.mjs';
import { createEvidenceBinding, digestEvidenceBytes } from '../tools/evidence-binding.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), '..');
const args = process.argv.slice(2);
const valueAfter = (name) => args[args.indexOf(name) + 1];
const required = (name) => {
    const value = valueAfter(name);
    if (!args.includes(name) || !value || value.startsWith('--')) throw new Error(`Missing ${name}`);
    return value;
};
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const output = path.resolve(root, required('--output'));
await mkdir(path.dirname(output), { recursive: true });

const cases = Object.freeze([
    { id: 'major-narrow', path: '/board/view?id=test&no=1001&comments=4', viewport: { width: 390, height: 844 }, touch: true },
    { id: 'minor-wide', path: '/mgallery/board/view?id=test&no=1001&comments=4', viewport: { width: 1280, height: 900 }, touch: false, detached: true },
    { id: 'mini-short', path: '/mini/board/view?id=test&no=1001&comments=4', viewport: { width: 390, height: 520 }, touch: true, replace: true },
    { id: 'major-dark-dynamic', path: '/board/view?id=test&no=1001&comments=4&dark=1', viewport: { width: 430, height: 932 }, touch: true, dark: true, detached: true, replace: true },
]);

if (args.includes('--side')) {
    const runtimePath = path.resolve(root, required('--side'));
    const bytes = await readFile(runtimePath);
    const actualName = bytes.toString('utf8').match(/^\/\/\s*@name\s+(.+)$/m)?.[1]?.trim();
    if (actualName !== 'DC_UserFilter_Mobile') throw new Error(`Mobile artifact required; received ${actualName || '<missing>'}`);
    process.env.DCUF_TESTBED_USERSCRIPT = runtimePath;
    process.env.DCUF_TESTBED_TARGET = 'mobile';
    const server = await startServer();
    const browser = await launchBrowser();
    const observations = [];
    try {
        for (const testCase of cases) {
            const session = await createTestPage(browser, server.baseUrl, {
                storage: {
                    [storageKeys.threshold]: 0,
                    [storageKeys.ratioEnabled]: false,
                    [storageKeys.personalEnabled]: true,
                    [storageKeys.personalList]: {
                        uids: ['safe-comment-2', 'safe-image-user'],
                        nicknames: [],
                        ips: [],
                    },
                    [storageKeys.palette]: 'orange',
                    [storageKeys.dark]: Boolean(testCase.dark),
                },
                viewport: testCase.viewport,
                hasTouch: testCase.touch,
                isMobile: testCase.touch,
            });
            try {
                await session.goto(testCase.path);
                await waitForSettled(session.page, 250);
                await session.page.evaluate(() => {
                    const focusRoot = document.querySelector('#focus_cmt');
                    const popupHost = document.createElement('div');
                    popupHost.className = 'fixture-comment-popup-host';
                    popupHost.innerHTML = '<button type="button" data-fixture-comment-action="popup-open">사용자 정보</button><div id="user_data_lyr" class="user_data" style="display:none"><button type="button" data-fixture-comment-action="popup-close">닫기</button></div>';
                    focusRoot?.appendChild(popupHost);

                    const eventTrace = [];
                    const describeTarget = (target) => ({
                        tag: target?.tagName || '',
                        type: target?.getAttribute?.('type') || '',
                        name: target?.getAttribute?.('name') || '',
                        label: target?.getAttribute?.('aria-label') || '',
                        action: target?.getAttribute?.('data-fixture-comment-action') || '',
                        text: String(target?.textContent || '').replace(/\s+/g, ' ').trim(),
                    });
                    focusRoot?.addEventListener('click', (event) => {
                        const target = event.target instanceof Element ? event.target.closest('button, input[type="submit"], a') : null;
                        if (!target) return;
                        eventTrace.push({ kind: 'click', target: describeTarget(target) });
                        const action = target.getAttribute('data-fixture-comment-action');
                        const popup = focusRoot.querySelector('#user_data_lyr');
                        if (action === 'popup-open' && popup instanceof HTMLElement) popup.style.display = 'block';
                        if (action === 'popup-close' && popup instanceof HTMLElement) popup.style.display = 'none';
                    });
                    focusRoot?.addEventListener('input', (event) => {
                        const target = event.target;
                        if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
                        eventTrace.push({ kind: 'input', target: describeTarget(target), value: target.value });
                    });

                    const captureTopology = (element) => element instanceof HTMLElement ? {
                        element,
                        parent: element.parentNode,
                        nextSibling: element.nextSibling,
                    } : null;
                    const roots = [focusRoot, document.querySelector('.view_comment.image_comment')].filter((entry) => entry instanceof HTMLElement);
                    const stableElements = roots.flatMap((entry) => [
                        entry,
                        ...entry.querySelectorAll('.comment_wrap, .comment_box, .cmt_list, .cmt_write_box, .reply, .reply_box, .reply_list, button, input, textarea'),
                    ]);
                    window.__dcufCommentDifferentialProbe = {
                        roots,
                        topology: stableElements.map(captureTopology).filter(Boolean),
                        eventTrace,
                        popup: focusRoot?.querySelector('#user_data_lyr') || null,
                        popupParent: focusRoot?.querySelector('#user_data_lyr')?.parentNode || null,
                        detached: null,
                        replacedWrapper: null,
                    };
                });
                await waitForSettled(session.page, 100);

                const capture = async (step) => {
                    const entry = await session.page.evaluate(({ caseId, stepName }) => {
                        const probe = window.__dcufCommentDifferentialProbe;
                        const normalizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
                        const roots = [document.querySelector('#focus_cmt'), document.querySelector('.view_comment.image_comment')]
                            .filter((element) => element instanceof HTMLElement);
                        const structuralKind = (rootElement) => rootElement.id === 'focus_cmt' ? 'focus' : 'image';
                        const describeField = (field) => ({
                            tag: field.tagName,
                            type: field.getAttribute('type'),
                            name: field.getAttribute('name'),
                            label: field.getAttribute('aria-label'),
                            value: field.value,
                        });
                        const describeAction = (action) => ({
                            tag: action.tagName,
                            type: action.getAttribute('type'),
                            name: action.getAttribute('name'),
                            value: action.getAttribute('value'),
                            label: action.getAttribute('aria-label'),
                            fixtureAction: action.getAttribute('data-fixture-comment-action'),
                            text: normalizeText(action.textContent),
                        });
                        const describeItem = (item) => {
                            const writer = item.querySelector(':scope > .cmt_info .gall_writer, :scope > .reply_info .gall_writer, :scope > .cmt_info .ub-writer, :scope > .reply_info .ub-writer');
                            const parentList = item.parentElement;
                            const hasDetachedReply = item.querySelector(':scope > .reply.show') instanceof HTMLElement
                                && !(item.querySelector(':scope > .cmt_info, :scope > .reply_info') instanceof HTMLElement);
                            const structuralRole = parentList?.classList.contains('reply_list') || item.id.startsWith('reply_li_') && !hasDetachedReply
                                ? 'reply-item'
                                : hasDetachedReply ? 'detached-reply-item' : 'comment-item';
                            return {
                                id: item.id,
                                structuralRole,
                                parentId: parentList?.id || '',
                                parentClass: parentList?.className || '',
                                text: normalizeText(item.querySelector('.usertxt')?.textContent || item.textContent),
                                uid: writer?.getAttribute('data-uid') || '',
                                nick: writer?.getAttribute('data-nick') || normalizeText(writer?.textContent),
                                ip: writer?.getAttribute('data-ip') || '',
                                inlineDisplay: item.style.display,
                                blocked: item.classList.contains('dc-filtered-content') || item.getAttribute('data-dcuf-comment-blocked') === '1',
                                replyCount: item.querySelectorAll('.reply_list > li').length,
                            };
                        };
                        const rootBehavior = roots.map((rootElement) => ({
                            kind: structuralKind(rootElement),
                            wrappers: Array.from(rootElement.querySelectorAll('.comment_wrap')).map((wrapper) => ({
                                id: wrapper.id,
                                open: wrapper.classList.contains('show') && wrapper.style.display !== 'none',
                                count: normalizeText(wrapper.querySelector('.comment_count .font_red, .comment_top .font_red')?.textContent),
                            })),
                            directOrder: Array.from(rootElement.children).map((child) => ({
                                tag: child.tagName,
                                id: child.id,
                                className: child.className,
                            })),
                            items: Array.from(rootElement.querySelectorAll('.cmt_list > li')).map(describeItem),
                            fields: Array.from(rootElement.querySelectorAll('input, select, textarea')).map(describeField),
                            actions: Array.from(rootElement.querySelectorAll('button, input[type="submit"]')).map(describeAction),
                        }));
                        const gm = window.__dcufTestbedGM.snapshot();
                        const metrics = window.__dcufTestbedMetrics.snapshot();
                        const active = document.activeElement;
                        const adapter = window.__dcufCommentHostAdapter || null;
                        const adapterResources = adapter?.snapshotResources?.() || null;
                        const snapshots = roots.map((rootElement) => adapter?.snapshotSurface?.(rootElement)).filter(Boolean);
                        const topologyPreserved = probe.topology.every(({ element, parent, nextSibling }) => (
                            !element.isConnected || element.parentNode === parent && element.nextSibling === nextSibling
                        ));
                        const currentDetachedParent = document.querySelector('#comment_li_detached_probe');
                        const currentDetachedReply = document.querySelector('#reply_empty_last_li_detached_probe');
                        const detachedTopologyPreserved = !probe.detached || (
                            currentDetachedParent instanceof HTMLElement
                            && currentDetachedReply instanceof HTMLElement
                            && currentDetachedParent.parentNode === currentDetachedReply.parentNode
                            && currentDetachedParent.nextSibling === currentDetachedReply
                            && (!probe.replacedWrapper
                                || !probe.detached.parent.isConnected && !probe.detached.reply.isConnected)
                        );
                        const popup = document.querySelector('#focus_cmt #user_data_lyr');
                        const rect = (element) => {
                            if (!(element instanceof HTMLElement)) return null;
                            const box = element.getBoundingClientRect();
                            const style = getComputedStyle(element);
                            return {
                                left: box.left,
                                top: box.top,
                                right: box.right,
                                bottom: box.bottom,
                                width: box.width,
                                height: box.height,
                                display: style.display,
                                visibility: style.visibility,
                                background: style.backgroundColor,
                                backgroundImage: style.backgroundImage,
                                borderRadius: style.borderRadius,
                                boxShadow: style.boxShadow,
                            };
                        };
                        const semantic = {
                            caseId,
                            step: stepName,
                            behavior: {
                                location: `${location.pathname}${location.search}`,
                                roots: rootBehavior,
                                events: probe.eventTrace,
                                popup: popup ? {
                                    display: popup.style.display,
                                    parentPreserved: popup === probe.popup && popup.parentNode === probe.popupParent,
                                } : null,
                                focus: active instanceof HTMLElement && active !== document.body && active !== document.documentElement ? {
                                    tag: active.tagName,
                                    type: active.getAttribute('type') || '',
                                    label: active.getAttribute('aria-label') || '',
                                    action: active.getAttribute('data-fixture-comment-action') || '',
                                    text: normalizeText(active.textContent),
                                } : null,
                                storage: gm.values,
                                writes: gm.writes.map(({ key, value }) => ({ key, value })),
                                requests: metrics.xhrRequests.map(({ method, url, body, status }) => ({
                                    method,
                                    path: new URL(url, location.href).pathname,
                                    body,
                                    status,
                                })),
                                errors: metrics.errors,
                            },
                            invariants: {
                                adapterPresent: Boolean(adapter),
                                topologyPreserved,
                                detachedTopologyPreserved,
                                replacedMarkersRestored: !probe.replacedWrapper || !probe.replacedWrapper.isConnected
                                    && !probe.replacedWrapper.hasAttribute('data-dcuf-surface')
                                    && !probe.replacedWrapper.hasAttribute('data-dcuf-role')
                                    && !probe.replacedWrapper.hasAttribute('data-dcuf-state'),
                                rootMarkersComplete: roots.length === 2 && roots.every((rootElement) => (
                                    rootElement.getAttribute('data-dcuf-surface') === 'comments-replies'
                                    && rootElement.getAttribute('data-dcuf-role') === 'comments-root'
                                )),
                                itemMarkersComplete: roots.every((rootElement) => Array.from(rootElement.querySelectorAll('.cmt_list > li')).every((item) => (
                                    ['comment-item', 'detached-reply-item', 'reply-item'].includes(item.getAttribute('data-dcuf-role'))
                                ))),
                                onePresentationStyleOwner: document.querySelectorAll('#dcuf-comment-presenter').length === 1,
                                frozenSerializableSnapshots: snapshots.length === roots.length && snapshots.every((snapshot) => (
                                    Object.isFrozen(snapshot) && Boolean(JSON.parse(JSON.stringify(snapshot)))
                                )),
                                horizontalOverflowContained: document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1,
                                boundedAdapterResources: Boolean(adapterResources
                                    && adapterResources.activeRoots === 2
                                    && adapterResources.trackedElements > 0
                                    && adapterResources.trackedElements < 220
                                    && adapterResources.observers === 0
                                    && adapterResources.listeners === 0
                                    && adapterResources.timers === 0
                                    && adapterResources.animationFrames === 0
                                    && adapterResources.presentationStyleOwners === 1),
                            },
                        };
                        return {
                            semantic,
                            raw: {
                                html: roots.map((rootElement) => rootElement.outerHTML),
                                geometry: roots.map((rootElement) => ({
                                    kind: structuralKind(rootElement),
                                    root: rect(rootElement),
                                    wrapper: rect(rootElement.querySelector('.comment_wrap')),
                                    list: rect(rootElement.querySelector('.cmt_list')),
                                    comment: rect(rootElement.querySelector('.cmt_list > li')),
                                    reply: rect(rootElement.querySelector('.reply_box')),
                                    composer: rect(rootElement.querySelector('.cmt_write_box')),
                                    popup: rect(rootElement.querySelector('#user_data_lyr')),
                                })),
                                styles: Array.from(document.querySelectorAll('style[id]'), (style) => style.id),
                                adapterResources,
                                resources: {
                                    activeTimeouts: metrics.activeTimeouts,
                                    activeIntervals: metrics.activeIntervals,
                                    activeAnimationFrames: metrics.activeAnimationFrames,
                                    activeObservers: metrics.mutationObserversCreated - metrics.mutationDisconnectCalls,
                                    activeListeners: metrics.activeListenerKeys,
                                    subscriberKeys: Array.from(window.__dcufRuntimeCoordinator?._mutationSubscribers?.keys?.() || []),
                                },
                            },
                        };
                    }, { caseId: testCase.id, stepName: step });
                    entry.raw.warnings = session.consoleMessages.filter((message) => message.type === 'warning');
                    observations.push(entry);
                };

                await capture('initial');
                await session.page.evaluate(() => {
                    const values = [
                        ['#focus_cmt .fixture-normal-comment-composer input[aria-label="comment nickname"]', 'normal-user'],
                        ['#focus_cmt .fixture-normal-comment-composer textarea', 'normal body'],
                        ['#focus_cmt .fixture-reply-comment-composer input[aria-label="reply nickname"]', 'reply-user'],
                        ['#focus_cmt .fixture-reply-comment-composer textarea', 'reply body'],
                        ['.view_comment.image_comment .fixture-image-comment-composer textarea', 'image body'],
                    ];
                    values.forEach(([selector, value]) => {
                        const field = document.querySelector(selector);
                        if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return;
                        field.focus();
                        field.value = value;
                        field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
                    });
                    document.querySelector('#focus_cmt .fixture-normal-comment-composer button')?.click();
                    document.querySelector('#focus_cmt .fixture-reply-comment-composer button')?.click();
                    document.querySelector('.view_comment.image_comment .fixture-image-comment-composer button')?.click();
                });
                await capture('native-interactions');

                await session.page.evaluate(() => document.querySelector('[data-fixture-comment-action="popup-open"]')?.click());
                await waitForSettled(session.page, 50);
                await capture('popup-open');
                await session.page.evaluate(() => document.querySelector('[data-fixture-comment-action="popup-close"]')?.click());
                await waitForSettled(session.page, 50);
                await capture('popup-closed');
                await session.page.evaluate(() => document.querySelector('[data-fixture-comment-action="popup-open"]')?.click());
                await waitForSettled(session.page, 50);
                await capture('popup-reopened');

                await session.page.evaluate(() => document.querySelector('#comment_wrap_1')?.classList.remove('show'));
                await waitForSettled(session.page, 80);
                await capture('comments-closed');
                await session.page.evaluate(() => document.querySelector('#comment_wrap_1')?.classList.add('show'));
                await waitForSettled(session.page, 80);
                await capture('comments-reopened');

                if (testCase.detached) {
                    await session.page.evaluate(() => {
                        const list = document.querySelector('#comment_wrap_1 > .comment_box > .cmt_list');
                        if (!(list instanceof HTMLElement)) return;
                        const parent = document.createElement('li');
                        parent.id = 'comment_li_detached_probe';
                        parent.className = 'ub-content';
                        parent.innerHTML = '<div class="cmt_info"><div class="cmt_nickbox"><span class="gall_writer" data-uid="detached-parent">부모</span></div></div><div class="cmt_txtbox"><p class="usertxt">동적 부모</p></div>';
                        const reply = document.createElement('li');
                        reply.id = 'reply_empty_last_li_detached_probe';
                        reply.className = 'ub-content';
                        reply.innerHTML = '<div class="reply show"><div class="reply_box"><ul class="reply_list"><li id="reply_li_detached_child"><div class="reply_info"><div class="cmt_nickbox"><span class="gall_writer" data-uid="detached-reply">답글</span></div></div><div class="cmt_txtbox"><p class="usertxt">동적 답글</p></div></li></ul></div></div>';
                        list.append(parent, reply);
                        window.__dcufCommentDifferentialProbe.detached = { list, parent, reply };
                    });
                    await waitForSettled(session.page, 180);
                    await capture('detached-reply-inserted');
                }

                if (testCase.replace) {
                    await session.page.evaluate(() => {
                        const current = document.querySelector('#comment_wrap_1');
                        if (!(current instanceof HTMLElement)) return;
                        const replacement = current.cloneNode(true);
                        replacement.querySelectorAll('[data-dcuf-surface], [data-dcuf-role], [data-dcuf-state]').forEach((element) => {
                            element.removeAttribute('data-dcuf-surface');
                            element.removeAttribute('data-dcuf-role');
                            element.removeAttribute('data-dcuf-state');
                        });
                        replacement.removeAttribute('data-dcuf-surface');
                        replacement.removeAttribute('data-dcuf-role');
                        replacement.removeAttribute('data-dcuf-state');
                        window.__dcufCommentDifferentialProbe.replacedWrapper = current;
                        current.replaceWith(replacement);
                    });
                    await waitForSettled(session.page, 250);
                    await session.page.evaluate(() => document.querySelector('#comment_wrap_1 .btn_cmt_refresh')?.click());
                    await capture('host-wrapper-replacement');
                }

                await waitForSettled(session.page, 350);
                await session.page.waitForFunction(() => {
                    const adapter = window.__dcufCommentHostAdapter?.snapshotResources?.();
                    return !adapter || adapter.timers === 0 && adapter.animationFrames === 0;
                }, null, { timeout: 6000 });
                await capture('settled-resources');
                if (session.consoleErrors.length) throw new Error(session.consoleErrors.join('\n'));
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
    const baseline = JSON.parse(await readFile(path.join(root, 'verification', 'baselines.json'), 'utf8'));
    const controlHash = hash(await readFile(control));
    const candidateHash = hash(await readFile(candidate));
    if (![baseline.mobile.beta.sha256, baseline.mobile.stable.sha256].includes(controlHash)) {
        throw new Error('Control must match an authoritative mobile baseline');
    }
    if (controlHash === candidateHash) throw new Error('Control and candidate must have distinct digests');
    const sides = {};
    for (const [side, runtime] of Object.entries({ control, candidate })) {
        const sidePath = path.join(root, 'testbed', 'artifacts', `${path.basename(output)}.${side}.json`);
        const result = spawnSync(process.execPath, [scriptPath, '--side', runtime, '--output', sidePath], {
            cwd: root,
            stdio: 'inherit',
        });
        if (result.status !== 0) throw new Error(`${side} observation failed`);
        sides[side] = JSON.parse(await readFile(sidePath, 'utf8'));
    }

    const invariantFailures = (value, prefix = '') => Object.entries(value || {}).flatMap(([key, entry]) => {
        const pathKey = prefix ? `${prefix}.${key}` : key;
        if (typeof entry === 'boolean') return entry ? [] : [pathKey];
        if (entry && typeof entry === 'object' && !Array.isArray(entry)) return invariantFailures(entry, pathKey);
        return [];
    });
    const differences = [];
    const improvements = [];
    sides.control.observations.forEach((controlEntry, index) => {
        const candidateEntry = sides.candidate.observations[index];
        if (!candidateEntry || !isDeepStrictEqual(controlEntry.semantic.behavior, candidateEntry.semantic.behavior)) {
            differences.push({ index, kind: 'behavior', control: controlEntry?.semantic?.behavior, candidate: candidateEntry?.semantic?.behavior });
        }
        const failures = invariantFailures(candidateEntry?.semantic?.invariants);
        if (failures.length) differences.push({ index, kind: 'candidate-invariant', failures });
        const controlFailures = new Set(invariantFailures(controlEntry?.semantic?.invariants));
        const candidateFailures = new Set(failures);
        const fixed = [...controlFailures].filter((failure) => !candidateFailures.has(failure));
        if (fixed.length) improvements.push({ index, fixed });
    });
    if (sides.control.observations.length !== sides.candidate.observations.length) {
        differences.push({ kind: 'observation-count', control: sides.control.observations.length, candidate: sides.candidate.observations.length });
    }
    const rawDifferences = sides.control.observations.flatMap((entry, index) => (
        isDeepStrictEqual(entry, sides.candidate.observations[index]) ? [] : [{ index, control: entry, candidate: sides.candidate.observations[index] }]
    ));
    const observerBytes = await readFile(scriptPath);
    const equivalent = sides.control.browser === sides.candidate.browser && differences.length === 0;
    await writeFile(output, JSON.stringify({
        schemaVersion: 1,
        kind: 'observed-comment-semantic-differential',
        target: 'mobile',
        controlSource: baseline.mobile.behaviorSourceCommit,
        controlSha256: controlHash,
        candidateSha256: candidateHash,
        observerSha256: digestEvidenceBytes('testbed/run-comment-differential.mjs', observerBytes).toUpperCase(),
        normalizerSha256: digestEvidenceBytes('testbed/run-comment-differential.mjs', observerBytes).toUpperCase(),
        evidenceBinding: await createEvidenceBinding(root),
        scope: 'Major narrow, minor wide, mini short, and dark dynamic comment behavior across normal, reply, detached-reply, image-comment, composer, native popup, close/reopen, and host-wrapper replacement states. Behavior equality covers text/order/identity fields, field and action signatures, native click/input/focus traces, popup lifecycle, storage/network/error traces, and original topology. Exact markup, semantic markers, geometry, styles, warnings, and resources remain raw evidence; candidate-only ownership, serializability, containment, cleanup, and bounded-resource invariants fail closed.',
        observationEvidence: Object.fromEntries(Object.entries(sides).map(([side, value]) => [side, {
            artifactSha256: value.artifactSha256,
            browser: value.browser,
            observationCount: value.observations.length,
            observationsSha256: hash(Buffer.from(JSON.stringify(value.observations))),
        }])),
        sides,
        improvements,
        rawDifferences,
        differences,
        equivalent,
    }, null, 2) + '\n');
    console.log(`Observed comment semantic comparison: ${equivalent ? 'PASS' : 'FAIL'}; ${differences.length} semantic failures, ${improvements.length} invariant improvements, ${rawDifferences.length} raw differing snapshots`);
    if (!equivalent) process.exitCode = 1;
}
