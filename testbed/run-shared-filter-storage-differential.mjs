import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { startServer } from './server/server.mjs';
import { createTestPage, launchBrowser, storageKeys } from './harness/runner-utils.mjs';
import { createEvidenceBinding, digestEvidenceBytes } from '../tools/evidence-binding.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), '..');
const paths = Object.freeze({
    mobile: { control: 'testbed/artifacts/baseline-mobile-stable.user.js', candidate: 'testbed/artifacts/runtime-under-test.user.js' },
    pc: { control: 'testbed/artifacts/baseline-pc.user.js', candidate: 'dcinside_user_filter_v1.9.9.user.js' },
});
const expectedHashes = Object.freeze({
    mobile: { control: '32BA208DDD9973A7EEC343F01E963A833AB4F0C084987077EDAE46844383C25D',
        candidate: '0C3076699E696AD3C252B5DF21D216F9B6EA32928B4C8A7C160DE0888926450A' },
    pc: { control: 'D3A95C479D8D50F88D97700DE91FA17D1D338B3AEBB488F53D865F445B656212',
        candidate: '1A7A00468F4DCFB57C7341063098B827743091FD7593BA3FBA86A17E282BDC33' },
});
const scenarios = Object.freeze([
    { id: 'threshold-zero', uid: 'safe-threshold-no-api', threshold: 0, masterDisabled: false, blocked: false },
    { id: 'master-disabled', uid: 'safe-master-no-api', threshold: 10, masterDisabled: true, blocked: false },
    { id: 'personal-block-positive', uid: 'blocked-master-no-api', threshold: 0, masterDisabled: false, blocked: true },
]);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const check = (condition, message) => { if (!condition) throw new Error(message); };
const stableValue = (value) => JSON.parse(JSON.stringify(value));

function seedFor(scenario) {
    return {
        [storageKeys.masterDisabled]: scenario.masterDisabled,
        [storageKeys.threshold]: scenario.threshold,
        [storageKeys.ratioEnabled]: false,
        [storageKeys.personalEnabled]: true,
        [storageKeys.personalList]: {
            uids: [{ id: 'blocked-master-no-api', name: 'Synthetic blocked UID' }],
            nicknames: ['synthetic-nick'], ips: ['1.2.3.4'],
        },
        [storageKeys.blockedUids]: JSON.stringify({ seed: { ts: 1900000000000, sum: 2, post: 1, comment: 1, ratioBlocked: false } }),
        [storageKeys.blockedGuests]: JSON.stringify(['5.6.7.8']),
        [storageKeys.shortcut]: 'Shift+S',
    };
}

function summarizeRawObservation(observation) {
    const { caseId, step, value } = observation;
    const { gm, comment, uidRequests, xhrRequests, runtime, consoleErrors } = value;
    return { caseId, step, value: {
        gmValues: gm.values,
        gmReadKeys: gm.reads.map((entry) => entry.key).sort(),
        gmWrites: gm.writes.map(({ key, value }) => ({ key, value })),
        comment: comment && { id: comment.id, uid: comment.uid, text: comment.text,
            contentVisible: comment.contentVisible, parent: comment.parent },
        uidRequests: uidRequests.map(({ uid, body, mode }) => ({ uid, body, mode })),
        xhrRequests: xhrRequests.map(({ method, path: requestPath, body, status }) => ({ method, path: requestPath, body, status })),
        errors: runtime.errors, recovery: runtime.recovery, consoleErrors,
    } };
}

function resourceProjection(observation) {
    const { caseId, step, value } = observation;
    const { subscribers, ...resources } = value.runtime.resources;
    return { caseId, step, value: { ...resources,
        subscriberCount: subscribers.length,
        duplicateSubscribers: new Set(subscribers).size !== subscribers.length,
        subscriberKeys: Object.fromEntries([...new Set(subscribers)].sort().map((key) => [key, true])),
    } };
}

function changedLeaves(left, right, at, output) {
    if (isDeepStrictEqual(left, right)) return;
    if (left && right && typeof left === 'object' && typeof right === 'object'
        && Array.isArray(left) === Array.isArray(right)) {
        const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
        for (const key of keys) changedLeaves(left[key], right[key], `${at}.${key}`, output);
        return;
    }
    output.push({ field: at, control: left ?? null, candidate: right ?? null });
}

export function compareSharedObservations(sides) {
    const functionalDifferences = [];
    const resourceDifferences = [];
    const rawDifferences = [];
    const positiveFailures = [];
    for (const target of ['mobile', 'pc']) {
        const control = sides[target]?.control;
        const candidate = sides[target]?.candidate;
        check(control?.observations?.length === scenarios.length * 2
            && candidate?.observations?.length === scenarios.length * 2, `${target}: missing or zero applicability`);
        const required = scenarios.flatMap((scenario) => [
            `${scenario.id}/before-insertion`, `${scenario.id}/after-insertion`,
        ]);
        for (const [role, side] of [['control', control], ['candidate', candidate]]) {
            check(isDeepStrictEqual(side.observations.map((entry) => `${entry.caseId}/${entry.step}`), required),
                `${target}/${role}: observation order or applicability changed`);
            for (const scenario of scenarios) {
                const after = side.observations.find((entry) => entry.caseId === scenario.id && entry.step === 'after-insertion');
                const gm = after.value.gm;
                const visible = after.value.comment?.contentVisible;
                const seed = seedFor(scenario);
                if (gm.values[storageKeys.masterDisabled] !== scenario.masterDisabled
                    || gm.values[storageKeys.threshold] !== scenario.threshold
                    || visible !== !scenario.blocked
                    || after.value.uidRequests.length !== 0
                    || after.value.xhrRequests.some((request) => request.path === '/api/gallog_user_layer/gallog_content_reple/')
                    || after.value.runtime.errors.length !== 0
                    || after.value.consoleErrors.length !== 0) {
                    positiveFailures.push({ target, role, caseId: scenario.id, reason: 'master/threshold, positive row, UID request, or runtime error' });
                }
                if (typeof gm.values[storageKeys.masterDisabled] !== 'boolean'
                    || typeof gm.values[storageKeys.threshold] !== 'number'
                    || typeof gm.values[storageKeys.blockedUids] !== 'string'
                    || typeof gm.values[storageKeys.blockedGuests] !== 'string'
                    || gm.values[storageKeys.shortcut] !== 'Shift+S'
                    || !['uids', 'nicknames', 'ips'].every((key) => Array.isArray(gm.values[storageKeys.personalList]?.[key]))) {
                    positiveFailures.push({ target, role, caseId: scenario.id, reason: 'existing GM key or shape' });
                }
                if (Object.entries(seed).some(([key, value]) => !isDeepStrictEqual(gm.values[key], value))
                    || gm.writes.some((entry) => Object.hasOwn(seed, entry.key))) {
                    positiveFailures.push({ target, role, caseId: scenario.id, reason: 'seeded GM value changed or implicitly rewritten' });
                }
                if (target === 'mobile' && (after.value.runtime.recovery?.status !== 'completed'
                    || after.value.runtime.recovery?.ready !== true
                    || after.value.runtime.recovery?.reason !== 'ready'
                    || after.value.runtime.recovery?.active !== false)) {
                    positiveFailures.push({ target, role, caseId: scenario.id, reason: 'view post-reveal recovery did not complete ready' });
                }
            }
        }
        for (let index = 0; index < required.length; index += 1) {
            const left = control.observations[index];
            const right = candidate.observations[index];
            if (!isDeepStrictEqual(left, right)) rawDifferences.push({ target, caseId: left.caseId, step: left.step, control: left, candidate: right });
            const functionalLeaves = [];
            changedLeaves(summarizeRawObservation(left), summarizeRawObservation(right), 'functional', functionalLeaves);
            functionalDifferences.push(...functionalLeaves.map((entry) =>
                ({ target, caseId: left.caseId, step: left.step, ...entry })));
            const resourceLeaves = [];
            changedLeaves(resourceProjection(left), resourceProjection(right), 'resource', resourceLeaves);
            resourceDifferences.push(...resourceLeaves.map((entry) =>
                ({ target, caseId: left.caseId, step: left.step, ...entry })));
        }
    }
    return { rawDifferences, functionalDifferences, resourceDifferences, positiveFailures };
}

async function observeSide(target, role, output) {
    const runtimePath = path.join(root, paths[target][role]);
    const runtimeBytes = await readFile(runtimePath);
    check(sha(runtimeBytes) === expectedHashes[target][role], `${target}/${role}: artifact bytes changed`);
    console.log(`Shared filter/storage ${target}/${role} runtime: ${runtimePath} SHA-256 ${sha(runtimeBytes)}`);
    const expectedName = target === 'mobile' ? 'DC_UserFilter_Mobile' : 'DCInside PC User Filter';
    check(runtimeBytes.toString('utf8').match(/^\/\/\s*@name\s+(.+)$/m)?.[1]?.trim() === expectedName,
        `${target}/${role}: wrong userscript target`);
    process.env.DCUF_TESTBED_USERSCRIPT = runtimePath;
    process.env.DCUF_TESTBED_TARGET = target;
    const server = await startServer();
    const browser = await launchBrowser();
    const observations = [];
    try {
        for (const scenario of scenarios) {
            server.reset();
            const session = await createTestPage(browser, server.baseUrl, {
                storage: seedFor(scenario),
                ...(target === 'pc' ? { viewport: { width: 1280, height: 900 }, hasTouch: false, isMobile: false } : {}),
            });
            try {
                await session.goto('/board/view?id=test&no=1001');
                await session.page.waitForFunction(() => {
                    const bus = window.__dcufRuntimeCoordinator?._mutationSubscribers;
                    return !bus?.has('ui-post-reveal-recovery');
                }, null, { timeout: 8000 });
                const capture = async (step) => {
                    const pageValue = await session.page.evaluate(() => {
                        const gm = window.__dcufTestbedGM.snapshot();
                        const m = window.__dcufTestbedMetrics.snapshot();
                        const li = document.getElementById('comment_li_19001');
                        const text = li?.querySelector('.cmt_txtbox .usertxt');
                        const visible = (element) => {
                            if (!(element instanceof HTMLElement) || element.getClientRects().length === 0) return false;
                            for (let node = element; node instanceof HTMLElement; node = node.parentElement) {
                                const style = getComputedStyle(node);
                                if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
                            }
                            return true;
                        };
                        return {
                            gm,
                            comment: li ? { id: li.id, uid: li.querySelector('[data-uid]')?.getAttribute('data-uid') || '',
                                text: text?.textContent || '', contentVisible: visible(text),
                                parent: li.parentElement?.className || '' } : null,
                            xhrRequests: m.xhrRequests.map(({ method, url, body, status }) =>
                                ({ method, path: new URL(url, location.href).pathname, body, status })),
                            runtime: { errors: m.errors,
                                recovery: window.__dcufRevealDebug?.recovery
                                    ? Object.fromEntries(['status', 'ready', 'reason', 'active'].map((key) => (
                                        [key, window.__dcufRevealDebug.recovery[key]]
                                    ))) : null,
                                resources: {
                                timers: m.activeTimeouts, frames: m.activeAnimationFrames, intervals: m.activeIntervals,
                                activeObservers: m.mutationObserversCreated - m.mutationDisconnectCalls,
                                listeners: m.activeListenerKeys, subscribers: m.dcuf?.subscribers || [],
                                pendingMutations: m.dcuf?.pendingMutations || 0,
                                pendingMutationRaf: Boolean(m.dcuf?.pendingMutationRaf),
                                pendingMutationTimer: Boolean(m.dcuf?.pendingMutationTimer),
                                taskQueues: m.dcuf?.taskQueues || 0,
                            } },
                        };
                    });
                    observations.push({ caseId: scenario.id, step, value: {
                        ...pageValue, uidRequests: stableValue(server.state.uidRequests),
                        consoleErrors: stableValue(session.consoleErrors),
                    } });
                };
                await capture('before-insertion');
                const before = observations.at(-1).value.runtime.resources;
                const priorPasses = await session.page.evaluate(() => window.__dcufTestbedMetrics.snapshot().filterPasses.length);
                await session.page.evaluate((uid) => window.__dcufFixture.addComments(1,
                    { uid, id: 19001, text: 'Synthetic filter observation' }), scenario.uid);
                await session.page.waitForFunction(({ priorPasses, expectedId }) => {
                    const m = window.__dcufTestbedMetrics.snapshot();
                    return document.getElementById(expectedId) && m.filterPasses.length > priorPasses;
                }, { priorPasses, expectedId: 'comment_li_19001' }, { timeout: 8000 });
                await session.page.waitForFunction(({ timers, frames, intervals }) => {
                    const m = window.__dcufTestbedMetrics.snapshot();
                    const d = m.dcuf || {};
                    return m.activeTimeouts <= timers && m.activeAnimationFrames <= frames
                        && m.activeIntervals <= intervals && !d.pendingMutations && !d.pendingMutationRaf
                        && !d.pendingMutationTimer && !d.taskQueues;
                }, before, { timeout: 8000 });
                await capture('after-insertion');
            } finally { await session.close(); }
        }
        await mkdir(path.dirname(output), { recursive: true });
        await writeFile(output, `${JSON.stringify({ target, role, runtimePath, artifactSha256: sha(runtimeBytes),
            browser: browser.version(), observations }, null, 2)}\n`);
    } finally { await browser.close(); await server.close(); }
}

async function main() {
    const args = process.argv.slice(2);
    if (args.includes('--side')) {
        const target = args[args.indexOf('--target') + 1];
        const role = args[args.indexOf('--role') + 1];
        const output = path.resolve(root, args[args.indexOf('--output') + 1]);
        check(paths[target]?.[role], 'invalid target/role');
        await observeSide(target, role, output);
        return;
    }
    const output = path.join(root, 'testbed/artifacts/final-shared-filter-storage-0C30-1A7.json');
    const sides = {};
    for (const target of ['mobile', 'pc']) {
        sides[target] = {};
        for (const role of ['control', 'candidate']) {
            const sideOutput = `${output}.${target}.${role}.json`;
            const result = spawnSync(process.execPath, [scriptPath, '--side', '--target', target, '--role', role,
                '--output', sideOutput], { cwd: root, stdio: 'inherit' });
            check(result.status === 0, `${target}/${role} side observation failed`);
            sides[target][role] = JSON.parse(await readFile(sideOutput, 'utf8'));
            check(sides[target][role].artifactSha256 === expectedHashes[target][role], 'side artifact identity changed');
        }
        check(sides[target].control.browser === sides[target].candidate.browser, `${target}: browser version differs`);
    }
    const compared = compareSharedObservations(sides);
    const report = {
        schemaVersion: 1, kind: 'observed-shared-filter-storage-differential',
        scope: 'Three synthetic view-route cases per target: threshold zero, master disabled at threshold ten, and personal-block positive control; two ordered observations each. No other settings, route, or live-extension claim.',
        exactArtifacts: expectedHashes, observerSha256: digestEvidenceBytes('testbed/run-shared-filter-storage-differential.mjs',
            await readFile(scriptPath)).toUpperCase(), evidenceBinding: await createEvidenceBinding(root),
        sideEvidence: Object.fromEntries(Object.entries(sides).map(([target, roles]) => [target,
            Object.fromEntries(Object.entries(roles).map(([role, side]) => [role, {
                artifactSha256: side.artifactSha256, browser: side.browser, observationCount: side.observations.length,
                observationsSha256: sha(Buffer.from(JSON.stringify(side.observations))),
            }]))])),
        sides, ...compared,
        functionalStatus: compared.functionalDifferences.length === 0 && compared.positiveFailures.length === 0
            ? 'MATCHED_IN_COVERED_STATES' : 'FAIL',
        resourceStatus: compared.resourceDifferences.length === 0 ? 'MATCHED' : 'DIFFERENT_UNCLASSIFIED',
        finalFeatureStatus: 'UNKNOWN',
    };
    await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Shared filter/storage: ${report.functionalStatus}; resources ${report.resourceStatus}; ${compared.functionalDifferences.length} functional,`
        + ` ${compared.resourceDifferences.length} resource, ${compared.rawDifferences.length} raw differences;`
        + ` ${compared.positiveFailures.length} positive failures`);
    if (report.functionalStatus === 'FAIL') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
    main().catch((error) => { console.error(error); process.exitCode = 1; });
}
