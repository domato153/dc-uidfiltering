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
    {
        id: 'modify-password-major-narrow',
        path: '/board/modify/?id=test&no=1001&host-compat=password',
        viewport: { width: 390, height: 844 },
        touch: true,
        popup: true,
        field: 'input[name="password"]',
    },
    {
        id: 'delete-password-mini-short',
        path: '/mini/board/delete/?id=test&no=1001&host-compat=password',
        viewport: { width: 390, height: 520 },
        touch: true,
        popup: true,
        field: 'input[name="password"]',
    },
    {
        id: 'delete-confirm-minor-wide',
        path: '/mgallery/board/delete/?id=test&no=1001&host-compat=delete-confirm',
        viewport: { width: 982, height: 869 },
        touch: false,
        popup: true,
        field: null,
    },
    {
        id: 'modify-editor-minor-narrow',
        path: '/mgallery/board/modify/?id=test&no=1001&stage=editor',
        viewport: { width: 390, height: 844 },
        touch: true,
        popup: false,
        field: '#subject',
    },
    {
        id: 'write-cancel-desktop-site-mobile',
        path: '/mgallery/board/write/?id=test',
        viewport: { width: 980, height: 1800 },
        screen: { width: 412, height: 915 },
        deviceScaleFactor: 2.625,
        touch: true,
        popup: false,
        writePopup: true,
        field: null,
    },
]);

const storage = Object.freeze({
    [storageKeys.threshold]: 0,
    [storageKeys.ratioEnabled]: false,
    [storageKeys.personalEnabled]: true,
    [storageKeys.personalList]: { uids: [], nicknames: [], ips: [] },
    [storageKeys.palette]: 'orange',
});

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
                storage,
                viewport: testCase.viewport,
                screen: testCase.screen,
                deviceScaleFactor: testCase.deviceScaleFactor,
                hasTouch: testCase.touch,
                isMobile: testCase.touch,
            });
            try {
                await session.goto(testCase.path);
                await session.page.evaluate(() => {
                    const form = document.querySelector('form');
                    const popup = document.querySelector('[data-host-popup], #leave_confirm_box')
                        || form?.querySelector('.no_memberwrap, .pop_wrap.type5')
                        || null;
                    const actionRow = form?.querySelector(':scope > .btn_box.write, .no_memberwrap .btn_box, .pop_content.robot > .btn_box') || null;
                    const actions = Array.from(actionRow?.querySelectorAll(':scope > button, :scope > input[type="button"], :scope > input[type="submit"]') || []);
                    const popupActions = Array.from(popup?.querySelectorAll('.btn_box button, .poply_whiteclose') || []);
                    const eventTrace = [];
                    const formBubbleTrace = [];
                    form?.addEventListener('submit', (event) => eventTrace.push({ kind: 'submit', prevented: event.defaultPrevented }));
                    Array.from(form?.querySelectorAll('input:not([type="button"]):not([type="submit"]):not([type="reset"]), textarea, select') || []).forEach((field) => {
                        field.addEventListener('input', () => {
                            eventTrace.push({ kind: 'input', name: field.getAttribute('name') || '', valueLength: String(field.value || '').length });
                        });
                        field.addEventListener('focus', () => eventTrace.push({
                            kind: 'focus',
                            name: field.getAttribute('name') || '',
                            type: field.getAttribute('type') || field.localName || '',
                        }));
                    });
                    [...actions, ...popupActions].forEach((action) => {
                        action.addEventListener('focus', () => eventTrace.push({
                            kind: 'focus',
                            name: action.getAttribute('name') || '',
                            type: action.getAttribute('type') || action.localName || '',
                        }));
                        action.addEventListener('click', () => eventTrace.push({
                            kind: 'click',
                            type: action.getAttribute('type') || '',
                            text: action.textContent.replace(/\s+/g, ' ').trim(),
                            hostAction: action.getAttribute('data-host-action') || '',
                        }));
                    });
                    form?.addEventListener('input', (event) => {
                        const field = event.target;
                        formBubbleTrace.push({ kind: 'input', name: field?.getAttribute?.('name') || '', valueLength: String(field?.value || '').length });
                    });
                    form?.addEventListener('focusin', (event) => formBubbleTrace.push({
                        kind: 'focus',
                        name: event.target?.getAttribute?.('name') || '',
                        type: event.target?.getAttribute?.('type') || event.target?.localName || '',
                    }));
                    form?.addEventListener('click', (event) => {
                        const action = event.target instanceof Element ? event.target.closest('button, input[type="button"], input[type="submit"]') : null;
                        if (!action) return;
                        formBubbleTrace.push({
                            kind: 'click',
                            type: action.getAttribute('type') || '',
                            text: action.textContent.replace(/\s+/g, ' ').trim(),
                            hostAction: action.getAttribute('data-host-action') || '',
                        });
                    });
                    const adapter = window.__dcufNativeFormHostAdapter;
                    let adapterRoundTrip = false;
                    if (adapter && form instanceof HTMLFormElement) {
                        const before = {
                            form,
                            parent: form.parentNode,
                            next: form.nextSibling,
                            fields: Array.from(form.elements),
                            actions,
                            popup,
                        };
                        adapter.refresh();
                        const resourcesBefore = adapter.snapshotResources();
                        adapter.refresh();
                        const resourcesAfter = adapter.snapshotResources();
                        adapter.dispose();
                        const restored = !form.hasAttribute('data-dcuf-surface')
                            && !form.hasAttribute('data-dcuf-role')
                            && !form.hasAttribute('data-dcuf-state');
                        adapter.refresh();
                        adapterRoundTrip = restored
                            && before.form === document.querySelector('form')
                            && before.form.parentNode === before.parent
                            && before.form.nextSibling === before.next
                            && before.fields.every((field, index) => field === form.elements[index])
                            && before.actions.every((action) => action.isConnected)
                            && (!before.popup || before.popup.isConnected)
                            && JSON.stringify(resourcesBefore) === JSON.stringify(resourcesAfter);
                    }
                    window.__dcufNativeFormDifferentialProbe = {
                        form,
                        formParent: form?.parentNode || null,
                        formNextSibling: form?.nextSibling || null,
                        fields: Array.from(form?.elements || []),
                        actions,
                        actionTopology: actions.map((action) => ({ action, parent: action.parentNode, nextSibling: action.nextSibling })),
                        popup,
                        popupParent: popup?.parentNode || null,
                        eventTrace,
                        formBubbleTrace,
                        adapterRoundTrip,
                    };
                });

                const capture = async (step) => {
                    observations.push(await session.page.evaluate(({ caseId, stepName }) => {
                        const probe = window.__dcufNativeFormDifferentialProbe;
                        const form = document.querySelector('form');
                        const popup = document.querySelector('[data-host-popup], #leave_confirm_box')
                            || form?.querySelector('.no_memberwrap, .pop_wrap.type5')
                            || null;
                        const normalizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
                        const rect = (element) => {
                            if (!(element instanceof HTMLElement)) return null;
                            const bounds = element.getBoundingClientRect();
                            const style = getComputedStyle(element);
                            return {
                                left: bounds.left,
                                top: bounds.top,
                                right: bounds.right,
                                bottom: bounds.bottom,
                                width: bounds.width,
                                height: bounds.height,
                                display: style.display,
                                visibility: style.visibility,
                                position: style.position,
                                overflow: style.overflow,
                                background: style.backgroundColor,
                                borderRadius: style.borderRadius,
                                boxShadow: style.boxShadow,
                            };
                        };
                        const fields = Array.from(form?.querySelectorAll('input, textarea, select') || []).map((field) => ({
                            tag: field.localName,
                            type: field.getAttribute('type') || field.localName,
                            name: field.getAttribute('name') || '',
                            valueLength: String(field.value || '').length,
                            checked: field instanceof HTMLInputElement ? field.checked : false,
                            disabled: Boolean(field.disabled),
                            required: Boolean(field.required),
                            autocomplete: field.getAttribute('autocomplete') || '',
                        }));
                        const actionRow = form?.querySelector(':scope > .btn_box.write, .no_memberwrap .btn_box, .pop_content.robot > .btn_box') || null;
                        const actionElements = Array.from(actionRow?.querySelectorAll(':scope > button, :scope > input[type="button"], :scope > input[type="submit"]') || []);
                        const actions = actionElements.map((action) => ({
                            tag: action.localName,
                            type: action.getAttribute('type') || '',
                            name: action.getAttribute('name') || '',
                            value: action.getAttribute('value') || '',
                            text: normalizeText(action.textContent),
                            hostAction: action.getAttribute('data-host-action') || '',
                            onclick: action.getAttribute('onclick') || '',
                        }));
                        const gm = window.__dcufTestbedGM.snapshot();
                        const metrics = window.__dcufTestbedMetrics.snapshot();
                        const adapter = window.__dcufNativeFormHostAdapter || null;
                        const snapshot = adapter?.snapshotSurface?.(form) || null;
                        const resources = adapter?.snapshotResources?.() || null;
                        const trackedMarkerBudget = new Set([
                            document.documentElement,
                            ...document.querySelectorAll([
                                '[data-dcuf-native-form-role]',
                                '[data-dcuf-native-form-state]',
                                '[data-dcuf-native-form-option-state]',
                                '[data-dcuf-native-form-editor-mode]',
                                '[data-dcuf-native-form-toolbar-kind]',
                                '[data-dcuf-native-form-toolbar-scroll]',
                                '[data-dcuf-native-form-toolbar-item]',
                                '[data-dcuf-native-form-toolbar-control]',
                                '[data-dcuf-native-form-control-state]',
                                '[data-dcuf-native-form-toolbar-content]',
                                '[data-dcuf-native-form-toolbar-state]',
                                '[data-dcuf-native-form-layer-kind]',
                                '[data-dcuf-native-form-layer-anchor]',
                                '[data-dcuf-native-form-layer-state]',
                                '[data-dcuf-native-form-box-sizing]',
                                '[data-dcuf-native-form-control-kind]',
                                '[data-dcuf-surface="write-edit-delete-popup"]',
                                '[data-dcuf-role^="native-"]',
                            ].join(',')),
                        ]).size;
                        const expectedPresentationStyleIds = caseId.includes('modify')
                            ? ['dcuf-mobile-modify-theme', 'dcuf-mobile-write-theme']
                            : caseId.includes('write')
                                ? ['dcuf-mobile-write-theme']
                                : ['dcuf-mobile-modify-theme'];
                        const rootRect = form?.getBoundingClientRect();
                        const popupRect = popup?.getBoundingClientRect();
                        const actionRect = actionRow?.getBoundingClientRect();
                        const semantic = {
                            caseId,
                            step: stepName,
                            behavior: {
                                location: `${location.pathname}${location.search}`,
                                form: form ? {
                                    id: form.getAttribute('id') || '',
                                    name: form.getAttribute('name') || '',
                                    method: form.getAttribute('method') || '',
                                    action: form.getAttribute('action') || '',
                                    enctype: form.getAttribute('enctype') || '',
                                    target: form.getAttribute('target') || '',
                                    onsubmit: form.getAttribute('onsubmit') || '',
                                } : null,
                                fields,
                                hiddenFieldNames: fields.filter((field) => field.type === 'hidden').map((field) => field.name),
                                actions,
                                popup: popup ? {
                                    visible: getComputedStyle(popup).display !== 'none',
                                    hidden: popup.hidden,
                                    ariaHidden: popup.getAttribute('aria-hidden') || '',
                                    actions: Array.from(popup.querySelectorAll('.btn_box button, .poply_whiteclose')).map((action) => ({
                                        type: action.getAttribute('type') || '',
                                        text: normalizeText(action.textContent),
                                        onclick: action.getAttribute('onclick') || '',
                                    })),
                                } : null,
                                focus: document.activeElement && document.activeElement !== document.body ? {
                                    tag: document.activeElement.localName,
                                    type: document.activeElement.getAttribute?.('type') || '',
                                    name: document.activeElement.getAttribute?.('name') || '',
                                    hostAction: document.activeElement.getAttribute?.('data-host-action') || '',
                                } : null,
                                events: probe.eventTrace,
                                host: window.__dcufHostSimulator ? {
                                    delegatedClicks: { ...window.__dcufHostSimulator.delegatedClicks },
                                    submitCalls: window.__dcufHostSimulator.submitCalls,
                                    closeCalls: window.__dcufHostSimulator.closeCalls,
                                    reopenCalls: window.__dcufHostSimulator.reopenCalls,
                                    deleteSubmitCalls: window.__hostDeleteSubmitCalls || 0,
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
                                frozenSerializableSnapshot: Boolean(snapshot
                                    && Object.isFrozen(snapshot)
                                    && Object.isFrozen(snapshot.form)
                                    && Object.isFrozen(snapshot.fields)
                                    && snapshot.fields.every(Object.isFrozen)
                                    && JSON.parse(JSON.stringify(snapshot))),
                                adapterRoundTrip: probe.adapterRoundTrip,
                                formIdentityPreserved: probe.form === form
                                    && form?.parentNode === probe.formParent
                                    && form?.nextSibling === probe.formNextSibling,
                                fieldIdentityAndOrderPreserved: probe.fields.length === form?.elements.length
                                    && probe.fields.every((field, index) => field === form.elements[index]),
                                actionIdentityAndOrderPreserved: probe.actionTopology.every((entry) => entry.action.isConnected
                                    && entry.action.parentNode === entry.parent
                                    && entry.action.nextSibling === entry.nextSibling),
                                popupIdentityPreserved: !probe.popup
                                    || probe.popup === popup && popup?.parentNode === probe.popupParent,
                                writePopupKeptInHostForm: !caseId.includes('write-cancel') && !caseId.includes('modify-editor')
                                    || popup?.parentElement?.matches('.btn_box.write') === true
                                        && form?.contains(popup),
                                semanticRootMarker: form?.getAttribute('data-dcuf-surface') === 'write-edit-delete-popup'
                                    && form?.getAttribute('data-dcuf-role') === 'native-form',
                                semanticActionMarkers: actionElements.length === 0
                                    || actionElements.every((action) => ['native-cancel', 'native-submit'].includes(action.getAttribute('data-dcuf-role'))),
                                boundedAdapterResources: Boolean(resources
                                    && resources.activeRoots === 1
                                    && resources.trackedElements > 0
                                    && resources.trackedElements <= trackedMarkerBudget
                                    && resources.observers === 0
                                    && resources.listeners === 0
                                    && resources.timers === 0
                                    && resources.animationFrames === 0
                                    && resources.presentationStyleOwners === expectedPresentationStyleIds.length),
                                exactPresentationStyleOwners: expectedPresentationStyleIds.every((id) => (
                                    document.querySelectorAll(`style#${id}`).length === 1
                                )) && ['dcuf-mobile-modify-theme', 'dcuf-mobile-write-theme']
                                    .filter((id) => document.querySelector(`style#${id}`))
                                    .every((id) => expectedPresentationStyleIds.includes(id)),
                                formContained: caseId.includes('modify-editor') || caseId.includes('write-cancel')
                                    || !rootRect
                                    || rootRect.left >= -1 && rootRect.right <= innerWidth + 1,
                                popupContained: !popupRect || popupRect.left >= -1 && popupRect.right <= innerWidth + 1,
                                actionsReachable: !actionRect
                                    || popup && getComputedStyle(popup).display === 'none'
                                    || actionRect.width > 0 && actionRect.height > 0,
                                horizontalOverflowContained: document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1,
                            },
                        };
                        return {
                            semantic,
                            raw: {
                                formHtml: form?.outerHTML || '',
                                popupHtml: popup?.outerHTML || '',
                                geometry: {
                                    form: rect(form),
                                    popup: rect(popup),
                                    actions: rect(actionRow),
                                    focused: rect(document.activeElement),
                                },
                                styles: Array.from(document.querySelectorAll('style[id]'), (style) => style.id),
                                adapterSnapshot: snapshot,
                                adapterResources: resources,
                                trackedMarkerBudget,
                                formBubbleTrace: probe.formBubbleTrace,
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
                    }, { caseId: testCase.id, stepName: step }));
                };

                await capture('initial');
                if (testCase.field) {
                    await session.page.locator(testCase.field).focus();
                    await session.page.locator(testCase.field).fill('dcuf-probe');
                    await capture('field-input');
                }
                if (testCase.popup) {
                    try {
                        await session.page.locator('[data-host-action="cancel"]').click();
                    } catch (error) {
                        const hitContract = await session.page.evaluate(() => {
                            const cancel = document.querySelector('[data-host-action="cancel"]');
                            const confirm = document.querySelector('[data-host-action="confirm"]');
                            const cancelRect = cancel?.getBoundingClientRect();
                            const confirmRect = confirm?.getBoundingClientRect();
                            const point = cancelRect
                                ? [cancelRect.left + (cancelRect.width / 2), cancelRect.top + (cancelRect.height / 2)]
                                : [0, 0];
                            const hit = document.elementFromPoint(...point);
                            return {
                                bodyClass: document.body.className,
                                formClass: document.querySelector('form')?.className || '',
                                styleIds: Array.from(document.querySelectorAll('style[id]'), (style) => style.id),
                                cancel: cancelRect ? { left: cancelRect.left, right: cancelRect.right, top: cancelRect.top, bottom: cancelRect.bottom } : null,
                                confirm: confirmRect ? { left: confirmRect.left, right: confirmRect.right, top: confirmRect.top, bottom: confirmRect.bottom } : null,
                                confirmPosition: confirm ? getComputedStyle(confirm).position : '',
                                confirmInset: confirm ? getComputedStyle(confirm).inset : '',
                                hitAction: hit?.closest?.('[data-host-action]')?.getAttribute('data-host-action') || '',
                            };
                        });
                        throw new Error(`${error.message}; hit-contract=${JSON.stringify(hitContract)}`, { cause: error });
                    }
                    await waitForSettled(session.page, 120);
                    await capture('popup-closed');
                    await session.page.locator('.host-reopen').click();
                    await waitForSettled(session.page, 120);
                    await capture('popup-reopened');
                    await session.page.locator('[data-host-action="confirm"]').click();
                    await waitForSettled(session.page, 120);
                    await capture('confirm-invoked');
                }
                if (testCase.writePopup) {
                    await session.page.locator('.fixture-write-actions > .btn_grey.cancle').click();
                    await waitForSettled(session.page, 120);
                    await capture('write-popup-open');
                    await session.page.locator('#leave_confirm_box .poply_whiteclose').click();
                    await waitForSettled(session.page, 120);
                    await capture('write-popup-closed');
                    await session.page.locator('.fixture-write-actions > .btn_grey.cancle').click();
                    await waitForSettled(session.page, 120);
                    await capture('write-popup-reopened');
                }
                await waitForSettled(session.page, 250);
                await capture('settled-resources');
                if (session.consoleErrors.length) throw new Error(session.consoleErrors.join('\n'));
            } catch (error) {
                throw new Error(`${testCase.id}: ${error.message}`, { cause: error });
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
        kind: 'observed-native-form-semantic-differential',
        target: 'mobile',
        controlSource: baseline.mobile.behaviorSourceCommit,
        controlSha256: controlHash,
        candidateSha256: candidateHash,
        observerSha256: digestEvidenceBytes('testbed/run-native-form-differential.mjs', observerBytes).toUpperCase(),
        normalizerSha256: digestEvidenceBytes('testbed/run-native-form-differential.mjs', observerBytes).toUpperCase(),
        evidenceBinding: await createEvidenceBinding(root),
        scope: 'Independent-process comparison of major modify-password, mini delete-password, minor authenticated delete-confirm, minor modify-editor, and desktop-site-mobile write leave-confirm states across narrow, short, wide, and zoomed viewports. Behavior equality covers native form/field/action signatures, direct focus/input/click/submit traces, popup close/reopen, host call counts, storage/network/errors, and original topology. Exact markup, ancestry-dependent form bubbling, geometry, styles, resources, adapter snapshots, and subscriber keys remain raw evidence; candidate-only frozen serialization, reversible disposal, in-place write-popup topology, semantic markers, containment, and zero-owned-resource invariants fail closed.',
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
    console.log(`Observed native-form semantic comparison: ${equivalent ? 'PASS' : 'FAIL'}; ${differences.length} semantic failures, ${improvements.length} invariant improvements, ${rawDifferences.length} raw differing snapshots`);
    if (!equivalent) process.exitCode = 1;
}
