import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from './architecture-state.mjs';
import { createEvidenceBinding, digestEvidenceBytes } from './evidence-binding.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const receiptPath = path.resolve(rootDir, process.argv[2] || 'artifacts/impact.json');
const receiptBytes = await readFile(receiptPath);
const receipt = JSON.parse(receiptBytes.toString('utf8'));
const outputIndex = process.argv.indexOf('--output');
const outputArg = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;
if (outputIndex >= 0 && (!outputArg || outputArg.startsWith('--'))) throw new Error('--output requires a report path');
const auditDir = path.join(rootDir, 'artifacts', 'proof-audit');
await mkdir(auditDir, { recursive: true });
const guardedRuntime = path.join(rootDir, 'testbed', 'artifacts', 'runtime-under-test.user.js');
const guardedName = (await readFile(guardedRuntime, 'utf8')).match(/^\/\/\s*@name\s+(.+)$/m)?.[1]?.trim();
const guardedTarget = guardedName === 'DC_UserFilter_Mobile'
    ? 'mobile'
    : guardedName === 'DCInside PC User Filter' ? 'pc' : null;
if (!guardedTarget) throw new Error(`Proof audit requires a recognized guarded runtime, received ${guardedName || '<missing>'}`);
let rejectedMutations = 0;
let acceptedControls = 0;

async function removeIfPresent(filePath) {
    try {
        await unlink(filePath);
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
}

function expectFailure(label, command, args, { env = {}, pattern } = {}) {
    const result = spawnSync(command, args, {
        cwd: rootDir,
        encoding: 'utf8',
        shell: false,
        env: { ...process.env, ...env },
    });
    const output = `${result.stdout || ''}\n${result.stderr || ''}`;
    if (result.status === 0) throw new Error(`${label}: mutation was not rejected`);
    if (pattern && !pattern.test(output)) {
        throw new Error(`${label}: failed for the wrong reason\n${output}`);
    }
    rejectedMutations += 1;
    console.log(`PASS ${label}`);
}

function expectSuccess(label, command, args, { env = {} } = {}) {
    const result = spawnSync(command, args, {
        cwd: rootDir,
        encoding: 'utf8',
        shell: false,
        env: { ...process.env, ...env },
    });
    if (result.status !== 0) throw new Error(`${label}: valid control was rejected\n${result.stdout || ''}\n${result.stderr || ''}`);
    acceptedControls += 1;
    console.log(`PASS ${label}`);
    return result;
}

const wrongHeadPath = path.join(auditDir, 'wrong-head.json');
await writeFile(wrongHeadPath, `${JSON.stringify({ ...receipt, head: '0'.repeat(40) }, null, 2)}\n`, 'utf8');
expectFailure('wrong-head receipt is rejected', 'node', [
    'tools/run-gates.mjs',
    path.relative(rootDir, wrongHeadPath),
    '--verify-receipt-only',
], { pattern: /Wrong-head receipt/ });

const staleBindingPath = path.join(auditDir, 'stale-binding.json');
await writeFile(staleBindingPath, `${JSON.stringify({
    ...receipt,
    evidenceBinding: { ...receipt.evidenceBinding, harnessSha256: '0'.repeat(64) },
}, null, 2)}\n`, 'utf8');
expectFailure('stale harness receipt is rejected', 'node', [
    'tools/run-gates.mjs',
    path.relative(rootDir, staleBindingPath),
    '--verify-receipt-only',
], { pattern: /Stale evidence receipt: harnessSha256/ });

const stalePlanPath = path.join(auditDir, 'stale-architecture-plan.json');
await writeFile(stalePlanPath, `${JSON.stringify({
    ...receipt,
    evidenceBinding: { ...receipt.evidenceBinding, architecturePlanSha256: '0'.repeat(64) },
}, null, 2)}\n`, 'utf8');
expectFailure('stale architecture plan receipt is rejected', 'node', [
    'tools/run-gates.mjs',
    path.relative(rootDir, stalePlanPath),
    '--verify-receipt-only',
], { pattern: /Stale evidence receipt: architecturePlanSha256/ });

const emptyRoutePath = path.join(auditDir, 'empty-route.json');
await writeFile(emptyRoutePath, `${JSON.stringify({ ...receipt, resolvedCommands: [] }, null, 2)}\n`, 'utf8');
expectFailure('empty or tampered gate route is rejected', 'node', [
    'tools/run-gates.mjs',
    path.relative(rootDir, emptyRoutePath),
    '--verify-receipt-only',
], { pattern: /Impact route mismatch: resolvedCommands/ });

expectFailure('unknown --only profile is rejected', 'node', [
    'tools/run-gates.mjs',
    path.relative(rootDir, receiptPath),
    '--verify-receipt-only',
    '--only',
    'typo-profile',
], { pattern: /--only references an unknown gate profile/ });

expectSuccess('current candidate-derived gate route is accepted', 'node', [
    'tools/run-gates.mjs',
    path.relative(rootDir, receiptPath),
    '--verify-receipt-only',
]);

const invariantRoute = expectSuccess('invariant profiles participate in impact routing', 'node', [
    'tools/resolve-impact.mjs',
    '--base', receipt.base,
    '--head', receipt.head,
    '--files', 'src/targets/mobile/adapter-contract.js',
]);
const invariantRouteReceipt = JSON.parse(invariantRoute.stdout);
if (!invariantRouteReceipt.selectedProfiles.includes('acceptance')) {
    throw new Error('invariant profile routing omitted acceptance for mobile-adapter-contract');
}

const nonGuardedRuntime = path.join(auditDir, 'non-guarded-runtime.user.js');
await copyFile(guardedRuntime, nonGuardedRuntime);
expectFailure('non-guarded artifact path is rejected', 'node', [
    'testbed/run-tests.mjs',
    '--group',
    'smoke',
    '--require-runtime-under-test',
], {
    env: {
        DCUF_TESTBED_USERSCRIPT: nonGuardedRuntime,
        DCUF_TESTBED_TARGET: guardedTarget,
    },
    pattern: /Runtime guard rejected non-source artifact/,
});

expectFailure('control=candidate differential is rejected', 'node', [
    'tools/run-semantic-differential.mjs',
    '--control', guardedRuntime,
    '--candidate', guardedRuntime,
    '--target', 'mobile',
    '--filter', 'smoke:',
    '--output', path.join(auditDir, 'control-equals-candidate.json'),
], { pattern: /Differential oracle rejected control=candidate digest/ });

expectFailure('list control=candidate differential is rejected', 'node', [
    'testbed/run-list-differential.mjs',
    '--control', path.join(rootDir, 'testbed', 'artifacts', 'baseline-mobile-beta.user.js'),
    '--candidate', path.join(rootDir, 'testbed', 'artifacts', 'baseline-mobile-beta.user.js'),
    '--output', path.join(auditDir, 'list-control-equals-candidate.json'),
], { pattern: /Control and candidate must have distinct digests/ });

expectFailure('article control=candidate differential is rejected', 'node', [
    'testbed/run-article-differential.mjs',
    '--control', path.join(rootDir, 'testbed', 'artifacts', 'baseline-mobile-beta.user.js'),
    '--candidate', path.join(rootDir, 'testbed', 'artifacts', 'baseline-mobile-beta.user.js'),
    '--output', path.join(auditDir, 'article-control-equals-candidate.json'),
], { pattern: /Control and candidate must have distinct digests/ });

expectFailure('comment control=candidate differential is rejected', 'node', [
    'testbed/run-comment-differential.mjs',
    '--control', path.join(rootDir, 'testbed', 'artifacts', 'baseline-mobile-beta.user.js'),
    '--candidate', path.join(rootDir, 'testbed', 'artifacts', 'baseline-mobile-beta.user.js'),
    '--output', path.join(auditDir, 'comment-control-equals-candidate.json'),
], { pattern: /Control and candidate must have distinct digests/ });

expectFailure('native form control=candidate differential is rejected', 'node', [
    'testbed/run-native-form-differential.mjs',
    '--control', path.join(rootDir, 'testbed', 'artifacts', 'baseline-mobile-stable.user.js'),
    '--candidate', path.join(rootDir, 'testbed', 'artifacts', 'baseline-mobile-stable.user.js'),
    '--output', path.join(auditDir, 'native-form-control-equals-candidate.json'),
], { pattern: /Control and candidate must have distinct digests/ });

if (guardedTarget === 'mobile') {
    const editorRuntimeBefore = await readFile(guardedRuntime);
    const disposalNeedle = '            activeScope?.dispose();\n            activeScope = null;';
    const editorRuntimeSource = editorRuntimeBefore.toString('utf8').replace(/\r\n/g, '\n');
    if (!editorRuntimeSource.includes(disposalNeedle)) {
        throw new Error('write-editor cleanup mutation target is missing');
    }
    const mutatedEditorRuntime = editorRuntimeSource.replace(
        disposalNeedle,
        '            void activeScope;\n            activeScope = null;',
    ).replace(/\n/g, '\r\n');
    try {
        await writeFile(guardedRuntime, mutatedEditorRuntime, 'utf8');
        expectFailure('write-editor missing disposable-scope cleanup is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'editor host adapter',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /editor host adapter[\s\S]*(?:Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, editorRuntimeBefore);
    }
    expectSuccess('write-editor cleanup positive control is accepted', 'node', [
        'testbed/run-tests.mjs',
        '--group', 'write',
        '--filter', 'editor host adapter',
        '--require-runtime-under-test',
    ], {
        env: {
            DCUF_TESTBED_USERSCRIPT: guardedRuntime,
            DCUF_TESTBED_TARGET: 'mobile',
        },
    });

    const draftRuntimeBefore = await readFile(guardedRuntime);
    const normalizedDraftRuntime = draftRuntimeBefore.toString('utf8').replace(/\r\n/g, '\n');
    const draftDisposalNeedle = '            const scope = activeScope;\n            activeScope = null;\n            scope?.dispose();';
    if (!normalizedDraftRuntime.includes(draftDisposalNeedle)) {
        throw new Error('write-draft disposable-scope cleanup mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedDraftRuntime.replace(
                draftDisposalNeedle,
                '            const scope = activeScope;\n            activeScope = null;\n            void scope;',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('write-draft missing listener and timer disposal is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'draft host adapter',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /draft host adapter[\s\S]*(?:Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, draftRuntimeBefore);
    }
    expectSuccess('write-draft lifecycle positive control is accepted', 'node', [
        'testbed/run-tests.mjs',
        '--group', 'write',
        '--filter', 'draft host adapter',
        '--require-runtime-under-test',
    ], {
        env: {
            DCUF_TESTBED_USERSCRIPT: guardedRuntime,
            DCUF_TESTBED_TARGET: 'mobile',
        },
    });

    const nativeFormPresentationBefore = await readFile(guardedRuntime);
    const normalizedNativeFormPresentation = nativeFormPresentationBefore.toString('utf8').replace(/\r\n/g, '\n');
    const mountedOwnerNeedle = '            if (mounted?.element?.isConnected) return mounted.element;';
    const duplicateOwnerNeedle = '                const existing = document.getElementById(payload.id);';
    if (!normalizedNativeFormPresentation.includes(mountedOwnerNeedle)
        || !normalizedNativeFormPresentation.includes(duplicateOwnerNeedle)) {
        throw new Error('native-form duplicate style-owner mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation
                .replace(mountedOwnerNeedle, '            void mounted;')
                .replace(duplicateOwnerNeedle, '                const existing = null;')
                .replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form duplicate presentation style owner is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'presentation owner is idempotent',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /presentation owner is idempotent[\s\S]*(?:Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const payloadNeedle = '        [data-dcuf-native-form-role="page"][data-dcuf-native-form-state="password"],\n';
    if (!normalizedNativeFormPresentation.includes(payloadNeedle)) {
        throw new Error('native-form semantic modify/delete payload mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                payloadNeedle,
                '        [data-dcuf-native-form-role="page"][data-dcuf-native-form-state="password-drift"],\n',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form presentation payload drift is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'modify password surface',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /registered semantic modify\/delete, write-shell, write-popup, write-fields, write-headtext, write-editor-shell, write-toolbar-shell, editor-layer, and attachment contracts/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writePopupMarkerNeedle = "                markNativeContext(shell, 'popup-shell', nativeContextState);";
    if (!normalizedNativeFormPresentation.includes(writePopupMarkerNeedle)) {
        throw new Error('native-form write-popup marker mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                writePopupMarkerNeedle,
                '                void shell;',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form missing write-popup shell marker is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'leave-confirm popup presentation',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /leave-confirm popup presentation[\s\S]*(?:Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writePopupSelectorNeedle = '        [data-dcuf-native-form-role="popup-shell"][data-dcuf-native-form-state="write-editor"] {';
    if (!normalizedNativeFormPresentation.includes(writePopupSelectorNeedle)) {
        throw new Error('native-form write-popup selector mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                writePopupSelectorNeedle,
                '        body.is-write-page form.dcuf-write-form #leave_confirm_box.dcuf-write-leave-confirm {',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form write-popup raw host selector regression is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'leave-confirm popup presentation',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /leave-confirm popup presentation[\s\S]*(?:Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writePopupStackingNeedle = '            z-index: 2147483646 !important;';
    if (!normalizedNativeFormPresentation.includes(writePopupStackingNeedle)) {
        throw new Error('native-form write-popup stacking mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                writePopupStackingNeedle,
                '            z-index: 0 !important;',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form write-popup stacking regression is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'write cancel confirmation remains visible',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /popup multi-point hit testing above competing fixed layer/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeFieldsMarkerNeedle = "                markNativeContext(writeFields, 'fields', nativeContextState);";
    if (!normalizedNativeFormPresentation.includes(writeFieldsMarkerNeedle)) {
        throw new Error('native-form write-fields marker mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                writeFieldsMarkerNeedle,
                '                void writeFields;',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form missing write-fields root marker is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'write field presentation',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /write field presentation[\s\S]*(?:Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeFieldsSelectorNeedle = '        [data-dcuf-native-form-role="fields"][data-dcuf-native-form-state="write-editor"] {';
    if (!normalizedNativeFormPresentation.includes(writeFieldsSelectorNeedle)) {
        throw new Error('native-form write-fields selector mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                writeFieldsSelectorNeedle,
                '        body.is-write-page form.dcuf-write-form .dcuf-write-fields {',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form write-fields raw host selector regression is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'write field presentation',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /write field presentation[\s\S]*(?:Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeFieldsSpecificityNeedle = '        [data-dcuf-native-form-role="subject-input"][data-dcuf-native-form-state="write-editor"],';
    if (!normalizedNativeFormPresentation.includes(writeFieldsSpecificityNeedle)) {
        throw new Error('native-form write-fields specificity mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                writeFieldsSpecificityNeedle,
                '        [data-dcuf-native-form-role="subject-input"],',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form write-fields specificity regression is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'write field presentation',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /write field presentation[\s\S]*(?:46px|Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeHeadtextMarkerNeedle = "                markNativeContext(writeHeadtextShell, 'headtext-shell', nativeContextState);";
    if (!normalizedNativeFormPresentation.includes(writeHeadtextMarkerNeedle)) {
        throw new Error('native-form write-headtext marker mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                writeHeadtextMarkerNeedle,
                '                void writeHeadtextShell;',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form missing write-headtext shell marker is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'write headtext presentation',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /write headtext presentation[\s\S]*(?:Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeHeadtextSelectorNeedle = '        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="headtext-shell"][data-dcuf-native-form-state="write-editor"] {';
    if (!normalizedNativeFormPresentation.includes(writeHeadtextSelectorNeedle)) {
        throw new Error('native-form write-headtext selector mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                writeHeadtextSelectorNeedle,
                '        body.is-write-page form.dcuf-write-form .write_subject {',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form write-headtext raw host selector regression is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'write headtext presentation',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /write headtext presentation[\s\S]*(?:Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeHeadtextSelectedNeedle = "                    setNativeContextAttribute(option, 'data-dcuf-native-form-option-state', option.matches('.sel, .active') ? 'selected' : 'available');";
    if (!normalizedNativeFormPresentation.includes(writeHeadtextSelectedNeedle)) {
        throw new Error('native-form write-headtext selected-state mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                writeHeadtextSelectedNeedle,
                "                    setNativeContextAttribute(option, 'data-dcuf-native-form-option-state', 'available');",
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form write-headtext selected-state regression is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'write headtext presentation',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /write headtext presentation[\s\S]*(?:Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeHeadtextDragCleanupNeedle = `            if (headtextDrag && activeHeadtextList instanceof HTMLElement) {
                activeHeadtextList.classList.remove('dcuf-headtext-dragging');
            }`;
    const writeHeadtextRestoreTailNeedle = `            restoreAll();
            activeForm = null;`;
    if (!normalizedNativeFormPresentation.includes(writeHeadtextDragCleanupNeedle)
        || !normalizedNativeFormPresentation.includes(writeHeadtextRestoreTailNeedle)) {
        throw new Error('write-headtext drag-cleanup mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation
                .replace(
                    writeHeadtextDragCleanupNeedle,
                    `            const staleHeadtextList = headtextDrag && activeHeadtextList instanceof HTMLElement
                ? activeHeadtextList
                : null;`,
                )
                .replace(
                    writeHeadtextRestoreTailNeedle,
                    `            restoreAll();
            staleHeadtextList?.classList.add('dcuf-headtext-dragging');
            activeForm = null;`,
                )
                .replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('write-headtext active drag cleanup regression is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'write headtext presentation',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /write headtext presentation[\s\S]*(?:Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeEditorMarkerNeedle = "                markNativeContext(writeEditorFrame, 'editor-frame', nativeContextState);";
    if (!normalizedNativeFormPresentation.includes(writeEditorMarkerNeedle)) {
        throw new Error('native-form write-editor marker mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                writeEditorMarkerNeedle,
                '                void writeEditorFrame;',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form missing write-editor frame marker is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'write editor shell presentation',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /write editor shell presentation[\s\S]*(?:Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeEditorSelectorNeedle = '        [data-dcuf-native-form-role="editor-frame"][data-dcuf-native-form-state="write-editor"],';
    if (!normalizedNativeFormPresentation.includes(writeEditorSelectorNeedle)) {
        throw new Error('native-form write-editor selector mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                writeEditorSelectorNeedle,
                '        body.is-write-page form.dcuf-write-form .note-editor,',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form write-editor raw host selector regression is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'write editor shell presentation',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /write editor shell presentation[\s\S]*(?:Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeEditorModeNeedle = "                setNativeContextAttribute(writeEditorFrame, 'data-dcuf-native-form-editor-mode', writeEditorMode);";
    if (!normalizedNativeFormPresentation.includes(writeEditorModeNeedle)) {
        throw new Error('native-form write-editor mode-state mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                writeEditorModeNeedle,
                "                setNativeContextAttribute(writeEditorFrame, 'data-dcuf-native-form-editor-mode', 'source');",
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form write-editor mode-state regression is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'write editor shell presentation',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /write editor shell presentation[\s\S]*(?:Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const copiedNativeMarkerSanitizerNeedle = [
        '        const prepareNativeContext = (element) => {',
        '            if (!(element instanceof HTMLElement)) return false;',
        '            if (!transaction.has(element)) {',
    ].join('\n');
    if (!normalizedNativeFormPresentation.includes(copiedNativeMarkerSanitizerNeedle)) {
        throw new Error('native-form copied-marker sanitizer mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                copiedNativeMarkerSanitizerNeedle,
                copiedNativeMarkerSanitizerNeedle.replace(
                    '            if (!transaction.has(element)) {',
                    '            if (false && !transaction.has(element)) {',
                ),
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form copied write-editor marker rollback regression is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'write editor shell presentation',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /write editor shell presentation[\s\S]*(?:Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeToolbarMarkerNeedle = "                    markNativeContext(toolbar, 'editor-toolbar', nativeContextState);";
    if (!normalizedNativeFormPresentation.includes(writeToolbarMarkerNeedle)) {
        throw new Error('native-form write-toolbar marker mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                writeToolbarMarkerNeedle,
                '                    void toolbar;',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form missing write-toolbar shell marker is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'toolbar shell and controls',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /toolbar shell and controls[\s\S]*(?:Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeToolbarSelectorNeedle = '        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="editor-toolbar"][data-dcuf-native-form-state="write-editor"] {';
    if (!normalizedNativeFormPresentation.includes(writeToolbarSelectorNeedle)) {
        throw new Error('native-form write-toolbar selector mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                writeToolbarSelectorNeedle,
                '        body.is-write-page form.dcuf-write-form .note-toolbar {',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form write-toolbar raw host selector regression is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'toolbar shell and controls',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /toolbar shell and controls[\s\S]*(?:Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeToolbarDragStateNeedle = "                    setAttribute(editorToolbarDrag.toolbar, DRAGGING_ATTRIBUTE, 'dragging');";
    if (!normalizedNativeFormPresentation.includes(writeToolbarDragStateNeedle)) {
        throw new Error('native-form write-toolbar drag-state mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                writeToolbarDragStateNeedle,
                '                    void editorToolbarDrag.toolbar;',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form write-toolbar missing drag state is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'toolbar shell and controls',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /toolbar shell and controls[\s\S]*(?:Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeToolbarSpecificityNeedle = '        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="editor-toolbar"][data-dcuf-native-form-state="write-editor"][data-dcuf-native-form-toolbar-scroll="horizontal"] {';
    if (!normalizedNativeFormPresentation.includes(writeToolbarSpecificityNeedle)) {
        throw new Error('native-form write-toolbar specificity mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                writeToolbarSpecificityNeedle,
                '        [data-dcuf-native-form-role="editor-toolbar"][data-dcuf-native-form-state="write-editor"][data-dcuf-native-form-toolbar-scroll="horizontal"] {',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form write-toolbar specificity regression is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'toolbar shell and controls',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /toolbar shell and controls[\s\S]*(?:Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeToolbarReplacementCleanupNeedle = '            scrubStaleToolbarStates(activeForm);';
    if (!normalizedNativeFormPresentation.includes(writeToolbarReplacementCleanupNeedle)) {
        throw new Error('native-form write-toolbar replacement-cleanup mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                writeToolbarReplacementCleanupNeedle,
                '            void activeForm;',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form write-toolbar stale replacement state is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'toolbar shell and controls',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /toolbar shell and controls[\s\S]*(?:Expected values to be strictly|AssertionError|Timeout)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeEditorLayerMarkerNeedle = '            setAttribute(layer, LAYER_KIND_ATTRIBUTE, kind);';
    if (!normalizedNativeFormPresentation.includes(writeEditorLayerMarkerNeedle)) {
        throw new Error('native-form write-editor layer marker mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                writeEditorLayerMarkerNeedle,
                '            void kind;',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form missing write-editor layer marker is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'dropdown and floating layers use reversible',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /dropdown and floating layers use reversible[\s\S]*(?:Expected values to be strictly|AssertionError|Timeout)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeEditorLayerSelectorNeedle = '        [data-dcuf-native-form-layer-kind]:not([data-dcuf-native-form-layer-state="positioned"]) {';
    if (!normalizedNativeFormPresentation.includes(writeEditorLayerSelectorNeedle)) {
        throw new Error('native-form write-editor layer selector mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                writeEditorLayerSelectorNeedle,
                '        body.is-write-page form.dcuf-write-form .note-toolbar :is(.note-dropdown-menu, .pop_wrap):not(.dcuf-editor-layer-positioned) {',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form write-editor layer raw host selector regression is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'dropdown and floating layers use reversible',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /dropdown and floating layers use reversible[\s\S]*(?:Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeEditorLayerPositionStateNeedle = "                setEditorLayerState(layer, 'positioned');";
    if (!normalizedNativeFormPresentation.includes(writeEditorLayerPositionStateNeedle)) {
        throw new Error('native-form write-editor layer position-state mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                writeEditorLayerPositionStateNeedle,
                "                setEditorLayerState(layer, 'positioning');",
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form write-editor layer position state is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'dropdown and floating layers use reversible',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /dropdown and floating layers use reversible[\s\S]*(?:Expected values to be strictly|AssertionError|Timeout)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeEditorLayerSpecificityNeedle = '        [data-dcuf-native-form-layer-kind~="dropdown"][data-dcuf-native-form-layer-state="positioned"] {';
    if (!normalizedNativeFormPresentation.includes(writeEditorLayerSpecificityNeedle)) {
        throw new Error('native-form write-editor layer specificity mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                writeEditorLayerSpecificityNeedle,
                '        [data-dcuf-native-form-layer-kind~="dropdown"] {',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form write-editor layer specificity regression is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'dropdown and floating layers use reversible',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /dropdown and floating layers use reversible[\s\S]*(?:Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeEditorLayerReplacementCleanupNeedle = '                layer.classList.remove(POSITIONING_CLASS, POSITIONED_CLASS);';
    if (!normalizedNativeFormPresentation.includes(writeEditorLayerReplacementCleanupNeedle)) {
        throw new Error('native-form write-editor layer replacement-cleanup mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                writeEditorLayerReplacementCleanupNeedle,
                '                void layer.classList;',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form stale write-editor layer replacement state is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'dropdown and floating layers use reversible',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /dropdown and floating layers use reversible[\s\S]*(?:Expected values to be strictly|AssertionError|Timeout)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeAttachmentMarkerNeedle = "                writeAttachmentShells.forEach((element) => markNativeContext(element, 'attachment-shell', nativeContextState));";
    if (!normalizedNativeFormPresentation.includes(writeAttachmentMarkerNeedle)) {
        throw new Error('native-form write-attachment marker mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                writeAttachmentMarkerNeedle,
                '                void writeAttachmentShells;',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form missing write-attachment shell marker is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'write attachments use reversible semantic selectors',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /write attachments use reversible semantic selectors[\s\S]*(?:Expected values to be strictly|AssertionError|Timeout)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeAttachmentSelectorNeedle = '        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="attachment-shell"][data-dcuf-native-form-state="write-editor"],';
    if (!normalizedNativeFormPresentation.includes(writeAttachmentSelectorNeedle)) {
        throw new Error('native-form write-attachment selector mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                writeAttachmentSelectorNeedle,
                '        body.is-write-page form.dcuf-write-form .fixture-attachment-panel,',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form write-attachment raw host selector regression is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'write attachments use reversible semantic selectors',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /write attachments use reversible semantic selectors[\s\S]*(?:Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeAttachmentItemMarkerNeedle = "                writeAttachmentItems.forEach((element) => markNativeContext(element, 'attachment-item', nativeContextState));";
    if (!normalizedNativeFormPresentation.includes(writeAttachmentItemMarkerNeedle)) {
        throw new Error('native-form write-attachment item mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                writeAttachmentItemMarkerNeedle,
                '                void writeAttachmentItems;',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form missing dynamic write-attachment item marker is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'write attachments use reversible semantic selectors',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /write attachments use reversible semantic selectors[\s\S]*(?:Expected values to be strictly|AssertionError|Timeout)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeAttachmentSpecificityNeedle = '        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="attachment-input"][data-dcuf-native-form-state="write-editor"] {';
    if (!normalizedNativeFormPresentation.includes(writeAttachmentSpecificityNeedle)) {
        throw new Error('native-form write-attachment specificity mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                writeAttachmentSpecificityNeedle,
                '        [data-dcuf-native-form-role="attachment-input"][data-dcuf-native-form-state="write-editor"] {',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form write-attachment specificity regression is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'write attachments use reversible semantic selectors',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /write attachments use reversible semantic selectors[\s\S]*(?:Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeAttachmentReplacementSanitizerNeedle = [
        '        const markNativeContext = (element, role, state) => {',
        '            if (!role || !state || !prepareNativeContext(element)) return null;',
    ].join('\n');
    if (!normalizedNativeFormPresentation.includes(writeAttachmentReplacementSanitizerNeedle)) {
        throw new Error('native-form write-attachment replacement sanitizer mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                writeAttachmentReplacementSanitizerNeedle,
                writeAttachmentReplacementSanitizerNeedle.replace(
                    '            if (!role || !state || !prepareNativeContext(element)) return null;',
                    "            if (!role || !state || (!String(role).startsWith('attachment') && !prepareNativeContext(element))) return null;",
                ),
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form copied write-attachment marker rollback regression is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'write attachments use reversible semantic selectors',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /write attachments use reversible semantic selectors[\s\S]*(?:Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeRemainingAiMarkerNeedle = "                markNativeContext(writeAiShell, 'ai-prompt-shell', nativeContextState);";
    if (!normalizedNativeFormPresentation.includes(writeRemainingAiMarkerNeedle)) {
        throw new Error('native-form remaining AI prompt marker mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(writeRemainingAiMarkerNeedle, '                void writeAiShell;').replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form missing remaining AI prompt marker is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'write remaining controls use a reversible semantic presentation boundary',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /write remaining controls use a reversible semantic presentation boundary[\s\S]*(?:Expected values to be strictly|AssertionError|Timeout)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeRemainingSelectorNeedle = '        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="ai-prompt-shell"][data-dcuf-native-form-state="write-editor"] {';
    if (!normalizedNativeFormPresentation.includes(writeRemainingSelectorNeedle)) {
        throw new Error('native-form remaining raw selector mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                writeRemainingSelectorNeedle,
                '        body.is-write-page form.dcuf-write-form .ai_easy_wrap {',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form remaining raw host selector regression is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'write remaining controls use a reversible semantic presentation boundary',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /write remaining controls use a reversible semantic presentation boundary[\s\S]*(?:Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeRemainingControlProjectionNeedle = [
        '                writePresentationControls.forEach((element) => {',
        "                    markNativePresentationProperty(element, 'data-dcuf-native-form-control-kind', element.localName);",
        '                });',
    ].join('\n');
    if (!normalizedNativeFormPresentation.includes(writeRemainingControlProjectionNeedle)) {
        throw new Error('native-form remaining control-kind projection mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(writeRemainingControlProjectionNeedle, '                void writePresentationControls;').replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form missing remaining control-kind projection is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'write remaining controls use a reversible semantic presentation boundary',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /write remaining controls use a reversible semantic presentation boundary[\s\S]*(?:Expected values to be strictly|AssertionError|Timeout)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeRemainingActionSpecificityNeedle = '        [data-dcuf-native-form-role="form"][data-dcuf-native-form-state="write-editor"] [data-dcuf-native-form-role="outer-action-primary"][data-dcuf-native-form-state="write-editor"],';
    const writeRemainingActionSpecificityOccurrences = normalizedNativeFormPresentation.split(writeRemainingActionSpecificityNeedle).length - 1;
    if (writeRemainingActionSpecificityOccurrences < 2) {
        throw new Error('native-form remaining action specificity mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replaceAll(
                writeRemainingActionSpecificityNeedle,
                '        [data-dcuf-native-form-role="outer-action-primary"][data-dcuf-native-form-state="write-editor"],',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form remaining action specificity regression is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'write remaining controls use a reversible semantic presentation boundary',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /write remaining controls use a reversible semantic presentation boundary[\s\S]*(?:Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeRemainingMarkerLedgerNeedle = '                NATIVE_FORM_MARKER_ATTRIBUTES.forEach((name) => setAttribute(element, name, null));';
    if (!normalizedNativeFormPresentation.includes(writeRemainingMarkerLedgerNeedle)) {
        throw new Error('native-form remaining marker-ledger mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(writeRemainingMarkerLedgerNeedle, '                void NATIVE_FORM_MARKER_ATTRIBUTES;').replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form copied remaining marker rollback regression is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'write remaining controls use a reversible semantic presentation boundary',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /write remaining controls use a reversible semantic presentation boundary[\s\S]*(?:Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeShellMarkerNeedle = "                markNativeContext(form.closest('#container'), 'page-container', nativeContextState);";
    if (!normalizedNativeFormPresentation.includes(writeShellMarkerNeedle)) {
        throw new Error('native-form write-shell marker mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                writeShellMarkerNeedle,
                "                void form.closest('#container');",
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form missing write-shell container marker is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'write page and form shell',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /write page and form shell[\s\S]*(?:Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const writeShellSelectorNeedle = '        [data-dcuf-native-form-role="page-container"][data-dcuf-native-form-state="write-editor"] {';
    if (!normalizedNativeFormPresentation.includes(writeShellSelectorNeedle)) {
        throw new Error('native-form write-shell selector mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                writeShellSelectorNeedle,
                '        body.is-write-page #container {',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form write-shell raw host selector regression is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'write page and form shell',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /write page and form shell[\s\S]*(?:Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const semanticActionsNeedle = "                markNativeContext(actions, 'actions', nativeContextState);";
    if (!normalizedNativeFormPresentation.includes(semanticActionsNeedle)) {
        throw new Error('native-form semantic action-marker mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                semanticActionsNeedle,
                '                void actions;',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form missing semantic action marker is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'semantic selectors',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /semantic selectors[\s\S]*(?:Expected values to be strictly|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const semanticSubmitNeedle = '        [data-dcuf-native-form-role="actions"][data-dcuf-native-form-state="password"] > [data-dcuf-native-form-role="submit"][data-dcuf-native-form-state="password"],';
    if (!normalizedNativeFormPresentation.includes(semanticSubmitNeedle)) {
        throw new Error('native-form semantic submit-specificity mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                semanticSubmitNeedle,
                '        [data-dcuf-native-form-role="submit"][data-dcuf-native-form-state="password"],',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form semantic submit specificity regression is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'semantic selectors',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /semantic selectors[\s\S]*(?:confirmBackground|AssertionError)/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    const recoveryNeedle = '            requestedPresentationKeys.forEach((key) => mountPresentation(key));';
    if (!normalizedNativeFormPresentation.includes(recoveryNeedle)) {
        throw new Error('native-form rollback presentation recovery mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedNativeFormPresentation.replace(
                recoveryNeedle,
                '            void requestedPresentationKeys;',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('native-form rollback presentation recovery regression is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', 'presentation owner is idempotent',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /reconnect must restore previously requested presentation payloads after rollback disposal/,
        });
    } finally {
        await writeFile(guardedRuntime, nativeFormPresentationBefore);
    }

    expectSuccess('native-form presentation owner positive control is accepted', 'node', [
        'testbed/run-tests.mjs',
        '--group', 'write',
        '--filter', 'presentation owner is idempotent',
        '--require-runtime-under-test',
    ], {
        env: {
            DCUF_TESTBED_USERSCRIPT: guardedRuntime,
            DCUF_TESTBED_TARGET: 'mobile',
        },
    });
    expectSuccess('native-form semantic payload positive control is accepted', 'node', [
        'testbed/run-tests.mjs',
        '--group', 'write',
        '--filter', 'modify password surface',
        '--require-runtime-under-test',
    ], {
        env: {
            DCUF_TESTBED_USERSCRIPT: guardedRuntime,
            DCUF_TESTBED_TARGET: 'mobile',
        },
    });
    expectSuccess('native-form semantic selector positive control is accepted', 'node', [
        'testbed/run-tests.mjs',
        '--group', 'write',
        '--filter', 'semantic selectors',
        '--require-runtime-under-test',
    ], {
        env: {
            DCUF_TESTBED_USERSCRIPT: guardedRuntime,
            DCUF_TESTBED_TARGET: 'mobile',
        },
    });
    expectSuccess('native-form write-shell semantic selector positive control is accepted', 'node', [
        'testbed/run-tests.mjs',
        '--group', 'write',
        '--filter', 'write page and form shell',
        '--require-runtime-under-test',
    ], {
        env: {
            DCUF_TESTBED_USERSCRIPT: guardedRuntime,
            DCUF_TESTBED_TARGET: 'mobile',
        },
    });
    expectSuccess('native-form write-popup semantic selector positive control is accepted', 'node', [
        'testbed/run-tests.mjs',
        '--group', 'write',
        '--filter', 'leave-confirm popup presentation',
        '--require-runtime-under-test',
    ], {
        env: {
            DCUF_TESTBED_USERSCRIPT: guardedRuntime,
            DCUF_TESTBED_TARGET: 'mobile',
        },
    });
    expectSuccess('native-form write-popup lifecycle positive control is accepted', 'node', [
        'testbed/run-tests.mjs',
        '--group', 'write',
        '--filter', 'write cancel confirmation remains visible',
        '--require-runtime-under-test',
    ], {
        env: {
            DCUF_TESTBED_USERSCRIPT: guardedRuntime,
            DCUF_TESTBED_TARGET: 'mobile',
        },
    });
    expectSuccess('native-form write-fields semantic selector positive control is accepted', 'node', [
        'testbed/run-tests.mjs',
        '--group', 'write',
        '--filter', 'write field presentation',
        '--require-runtime-under-test',
    ], {
        env: {
            DCUF_TESTBED_USERSCRIPT: guardedRuntime,
            DCUF_TESTBED_TARGET: 'mobile',
        },
    });
    expectSuccess('native-form write-headtext semantic selector and lifecycle positive control is accepted', 'node', [
        'testbed/run-tests.mjs',
        '--group', 'write',
        '--filter', 'write headtext presentation',
        '--require-runtime-under-test',
    ], {
        env: {
            DCUF_TESTBED_USERSCRIPT: guardedRuntime,
            DCUF_TESTBED_TARGET: 'mobile',
        },
    });
    expectSuccess('native-form write-editor semantic selector and lifecycle positive control is accepted', 'node', [
        'testbed/run-tests.mjs',
        '--group', 'write',
        '--filter', 'write editor shell presentation',
        '--require-runtime-under-test',
    ], {
        env: {
            DCUF_TESTBED_USERSCRIPT: guardedRuntime,
            DCUF_TESTBED_TARGET: 'mobile',
        },
    });
    expectSuccess('native-form write-toolbar semantic selector and lifecycle positive control is accepted', 'node', [
        'testbed/run-tests.mjs',
        '--group', 'write',
        '--filter', 'toolbar shell and controls',
        '--require-runtime-under-test',
    ], {
        env: {
            DCUF_TESTBED_USERSCRIPT: guardedRuntime,
            DCUF_TESTBED_TARGET: 'mobile',
        },
    });
    expectSuccess('native-form write-editor layer semantic selector and lifecycle positive control is accepted', 'node', [
        'testbed/run-tests.mjs',
        '--group', 'write',
        '--filter', 'dropdown and floating layers use reversible',
        '--require-runtime-under-test',
    ], {
        env: {
            DCUF_TESTBED_USERSCRIPT: guardedRuntime,
            DCUF_TESTBED_TARGET: 'mobile',
        },
    });
    expectSuccess('native-form write-attachment semantic selector and lifecycle positive control is accepted', 'node', [
        'testbed/run-tests.mjs',
        '--group', 'write',
        '--filter', 'write attachments use reversible semantic selectors',
        '--require-runtime-under-test',
    ], {
        env: {
            DCUF_TESTBED_USERSCRIPT: guardedRuntime,
            DCUF_TESTBED_TARGET: 'mobile',
        },
    });
    expectSuccess('native-form remaining semantic selector and lifecycle positive control is accepted', 'node', [
        'testbed/run-tests.mjs',
        '--group', 'write',
        '--filter', 'write remaining controls use a reversible semantic presentation boundary',
        '--require-runtime-under-test',
    ], {
        env: {
            DCUF_TESTBED_USERSCRIPT: guardedRuntime,
            DCUF_TESTBED_TARGET: 'mobile',
        },
    });

    const fontRuntimeBefore = await readFile(guardedRuntime);
    const normalizedFontRuntime = fontRuntimeBefore.toString('utf8').replace(/\r\n/g, '\n');
    const clonedRootPruningNeedle = '                if (candidate !== previous?.root) candidate.remove();';
    if (!normalizedFontRuntime.includes(clonedRootPruningNeedle)) {
        throw new Error('write-font cloned-root pruning mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedFontRuntime.replace(clonedRootPruningNeedle, '                void candidate;').replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('write-font cloned owned root accumulation is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', '입력·말머리·에디터 재렌더',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /full owned mobile font menu must survive editor rerender/,
        });
    } finally {
        await writeFile(guardedRuntime, fontRuntimeBefore);
    }

    const nativeOptionHideNeedle = '                    display: none !important;';
    if (!normalizedFontRuntime.includes(nativeOptionHideNeedle)) {
        throw new Error('write-font native-option visibility mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedFontRuntime.replace(nativeOptionHideNeedle, '                    display: block !important;').replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('write-font duplicate native option visibility is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', '입력·말머리·에디터 재렌더',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /preserved host font options must not duplicate the visible owned list/,
        });
    } finally {
        await writeFile(guardedRuntime, fontRuntimeBefore);
    }

    expectSuccess('write-font presenter topology positive control is accepted', 'node', [
        'testbed/run-tests.mjs',
        '--group', 'write',
        '--filter', '입력·말머리·에디터 재렌더',
        '--require-runtime-under-test',
    ], {
        env: {
            DCUF_TESTBED_USERSCRIPT: guardedRuntime,
            DCUF_TESTBED_TARGET: 'mobile',
        },
    });

    const adRuntimeBefore = await readFile(guardedRuntime);
    const normalizedAdRuntime = adRuntimeBefore.toString('utf8').replace(/\r\n/g, '\n');
    const directDivScopeNeedle = '                if (container instanceof HTMLDivElement) containers.add(container);';
    if (!normalizedAdRuntime.includes(directDivScopeNeedle)) {
        throw new Error('write-ad direct-div scope mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedAdRuntime.replace(
                directDivScopeNeedle,
                '                if (container instanceof Element) containers.add(container);',
            ).replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('write-ad broadened parent-removal scope is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', '광고 cleanup adapter',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /matching signature without a direct div container must be preserved/,
        });
    } finally {
        await writeFile(guardedRuntime, adRuntimeBefore);
    }

    const timeoutCleanupNeedle = "                    stopWatching('timed-out');";
    if (!normalizedAdRuntime.includes(timeoutCleanupNeedle)) {
        throw new Error('write-ad bounded-timeout cleanup mutation target is missing');
    }
    try {
        await writeFile(
            guardedRuntime,
            normalizedAdRuntime.replace(timeoutCleanupNeedle, '                    void attempts;').replace(/\n/g, '\r\n'),
            'utf8',
        );
        expectFailure('write-ad missing bounded-timeout cleanup is rejected', 'node', [
            'testbed/run-tests.mjs',
            '--group', 'write',
            '--filter', '광고 cleanup adapter',
            '--require-runtime-under-test',
        ], {
            env: {
                DCUF_TESTBED_USERSCRIPT: guardedRuntime,
                DCUF_TESTBED_TARGET: 'mobile',
            },
            pattern: /Timeout 4000ms exceeded/,
        });
    } finally {
        await writeFile(guardedRuntime, adRuntimeBefore);
    }

    expectSuccess('write-ad cleanup lifecycle positive control is accepted', 'node', [
        'testbed/run-tests.mjs',
        '--group', 'write',
        '--filter', '광고 cleanup adapter',
        '--require-runtime-under-test',
    ], {
        env: {
            DCUF_TESTBED_USERSCRIPT: guardedRuntime,
            DCUF_TESTBED_TARGET: 'mobile',
        },
    });
}

for (const [variant, identifier] of [
    ['bare-gm', 'GM_setValue'],
    ['member-gm', 'GM_setValue'],
    ['computed-gm', 'GM_setValue'],
    ['destructured-gm', 'GM_setValue'],
    ['computed-destructured-gm', 'GM_setValue'],
    ['aliased-destructured-gm', 'GM_setValue'],
    ['dynamic-destructured-global', 'dynamic global property'],
    ['aliased-dynamic-global', 'dynamic global property'],
    ['aliased-dynamic-destructured-global', 'dynamic global property'],
    ['nested-global-alias', 'GM_setValue'],
    ['destructured-global-alias', 'GM_setValue'],
    ['member-document', 'document'],
    ['member-fetch', 'fetch'],
    ['member-observer', 'MutationObserver'],
    ['member-timeout', 'setTimeout'],
    ['member-interval', 'setInterval'],
    ['member-raf', 'requestAnimationFrame'],
    ['dynamic-global', 'dynamic global property'],
]) {
    expectFailure(`presentation-source ${variant} mutation is rejected`, 'node', [
        'tools/verify-ui-boundaries.mjs',
        '--audit-inject-forbidden',
        'mobile-theme-module',
        variant,
    ], { pattern: new RegExp(`theme-presenter\\.js:\\d+: presentation directly references ${identifier}`) });
}

for (const variant of ['benign-member-fetch', 'benign-destructured-document', 'benign-object-document', 'benign-shadowed-window', 'benign-shadowed-timeout']) {
    expectSuccess(`presentation-source ${variant} control is accepted`, 'node', [
        'tools/verify-ui-boundaries.mjs',
        '--audit-inject-forbidden',
        'mobile-theme-module',
        variant,
    ]);
}

for (const [variant, pattern] of [
    ['presentation-broad-selector', /contains broad selector button/],
    ['presentation-host-selector', /contains raw host selector \.gall_writer/],
    ['presentation-important-style', /contains an unregistered !important declaration/],
]) {
    expectFailure(`conforming presentation-source ${variant} mutation is rejected`, 'node', [
        'tools/verify-ui-boundaries.mjs',
        '--audit-inject-forbidden',
        'shared-settings-presenter',
        variant,
    ], { pattern });
}

expectFailure('profiled native-form !important ledger mutation is rejected', 'node', [
    'tools/verify-ui-boundaries.mjs',
    '--audit-inject-forbidden',
    'mobile-native-form-presenter',
    'presentation-profiled-important-style',
], { pattern: /style modify-delete !important ledger mismatch/ });

for (const [component, variant, source, policy, identifier] of [
    ['shared-filter-runtime', 'application-member-document', 'filter-runtime.js', 'application runtime', 'document'],
    ['filter-host-adapter', 'adapter-member-gm', 'filter-host-adapter.js', 'host adapter', 'GM_setValue'],
    ['filter-host-adapter', 'adapter-member-fetch', 'filter-host-adapter.js', 'host adapter', 'fetch'],
    ['mobile-native-form-host-adapter', 'adapter-member-gm', 'native-form-host-adapter.js', 'host adapter', 'GM_setValue'],
    ['mobile-native-form-host-adapter', 'adapter-member-fetch', 'native-form-host-adapter.js', 'host adapter', 'fetch'],
    ['mobile-write-draft-host-adapter', 'adapter-member-gm', 'write-draft-host-adapter.js', 'host adapter', 'GM_setValue'],
    ['mobile-write-draft-host-adapter', 'adapter-member-fetch', 'write-draft-host-adapter.js', 'host adapter', 'fetch'],
    ['mobile-write-ad-host-adapter', 'adapter-member-gm', 'write-ad-host-adapter.js', 'host adapter', 'GM_setValue'],
    ['mobile-write-ad-host-adapter', 'adapter-member-fetch', 'write-ad-host-adapter.js', 'host adapter', 'fetch'],
]) {
    expectFailure(`${component} ${variant} boundary mutation is rejected`, 'node', [
        'tools/verify-ui-boundaries.mjs',
        '--audit-inject-forbidden',
        component,
        variant,
    ], { pattern: new RegExp(`${source.replace('.', '\\.')}\\:\\d+\\: ${policy} directly references ${identifier}`) });
}

for (const [variant, pattern] of [
    ['unknown-surface-field', /unknown or missing fields/],
    ['missing-host-operation', /forbidden host operation missing: replace/],
    ['broad-surface-root', /broad allowed root is forbidden/],
    ['cascade-profile-promoted', /profiles are transitional and require adapted-zero-delta state/],
    ['second-modern-owner', /second modern visual owner collision/],
    ['delta-laundering', /unknown visual kind network/],
    ['missing-observation', /required observation field set or order changed/],
    ['warning-policy-weakened', /warnings must be preserved/],
    ['geometry-tolerance-widened', /geometry tolerance widened/],
    ['r3-strength-downgraded', /R3 coverage must be 4-way/],
    ['unknown-state-factor', /unknown factor nonexistent/],
    ['missing-assurance-claim', /mandatory claim set or order changed/],
    ['missing-assurance-defeater', /missing referenced defeater/],
    ['non-applicable-pass', /non-applicable evidence cannot support a claim/],
    ['nonexistent-pass-receipt', /receipt does not exist/],
    ['continuity-false-ready', /PASS\/READY has no current stage receipt and SHA-256/],
    ['continuity-history-fallback', /never fall back to history/],
    ['continuity-duplicate-current', /must occur once in the current section/],
    ['continuity-missing-trigger', /mandatory trigger set or order changed/],
    ['continuity-label-collision', /retrieval label collision status/],
    ['continuity-missing-route', /related path does not exist/],
    ['handoff-wrong-worktree', /recorded active worktree path differs/],
    ['handoff-missing-rationale', /NEXT_TASK\.md is missing Why next/],
    ['handoff-stale-artifact', /recorded current mobile artifact digest is stale/],
]) {
    expectFailure(`modernization assurance ${variant} mutation is rejected`, 'node', [
        'tools/verify-modernization-assurance.mjs',
        '--audit-mutation',
        variant,
    ], { pattern });
}

expectSuccess('modernization assurance positive control is accepted', 'node', [
    'tools/verify-modernization-assurance.mjs',
]);

expectFailure('mixed architecture without an exit contract is rejected', 'node', [
    'tools/architecture-registry.mjs',
    'validate',
    '--audit-drop-transition',
    'mobile-filter-module',
], { pattern: /mobile-filter-module: mixed boundary requires a transition exit contract/ });

expectFailure('placeholder architecture exit contract is rejected', 'node', [
    'tools/architecture-registry.mjs',
    'validate',
    '--audit-placeholder-transition',
    'mobile-filter-module',
], { pattern: /mobile-filter-module: transition exitCriteria must be concrete and non-placeholder/ });

expectFailure('repetitive architecture exit contract is rejected', 'node', [
    'tools/architecture-registry.mjs',
    'validate',
    '--audit-vague-transition',
    'mobile-filter-module',
], { pattern: /mobile-filter-module: transition exitCriteria must be concrete and non-placeholder/ });

expectSuccess('concrete architecture exit contract may describe no pending debt', 'node', [
    'tools/architecture-registry.mjs',
    'validate',
    '--audit-valid-pending-transition',
    'mobile-filter-module',
]);

expectFailure('mixed-to-conforming promotion without evidence is rejected', 'node', [
    'tools/architecture-registry.mjs',
    'validate',
    '--audit-bypass-transition',
    'mobile-filter-module',
], { pattern: /mobile-filter-module: mixed boundary exit requires verified transition evidence/ });

expectFailure('historical mixed exit cannot trust an evidence-free fold flag', 'node', [
    'tools/architecture-registry.mjs',
    'validate',
    '--audit-forged-fold-transition',
    'mobile-filter-module',
], { pattern: /historical fold replay: mobile-filter-module: mixed boundary exit requires verified transition evidence/ });

expectFailure('presentation component cannot be relabeled out of boundary enforcement', 'node', [
    'tools/architecture-registry.mjs',
    'validate',
    '--audit-relabel-presentation',
    'mobile-theme-module',
], { pattern: /mobile-theme-module: active presentation source cannot be relabeled/ });

expectFailure('accepted registry edit without a fold receipt is rejected', 'node', [
    'tools/architecture-registry.mjs',
    'validate',
    '--audit-direct-registry-edit',
], { pattern: /accepted registry bytes do not match the final fold receipt/ });

expectFailure('promotion cannot overwrite an existing fold receipt', 'node', [
    'tools/architecture-registry.mjs',
    'promote',
    'architecture/candidates/audit-missing-candidate.json',
    'verification/receipts/2026-09-06-phase-2-transition-exits-fold.json',
], { pattern: /fold receipt target already exists and cannot be overwritten/ });

const promotionAuditId = `proof-audit-promotion-${process.pid}-${randomUUID()}`;
const candidateDirectory = path.join(rootDir, 'architecture', 'candidates');
const activeCandidateNames = (await readdir(candidateDirectory)).filter((name) => name.endsWith('.json')).sort();
if (activeCandidateNames.length > 1) throw new Error('partial promotion audit requires zero or one active architecture candidate');
const ownsPromotionCandidate = activeCandidateNames.length === 0;
const promotionCandidatePath = ownsPromotionCandidate
    ? path.join(candidateDirectory, `${promotionAuditId}.json`)
    : path.join(candidateDirectory, activeCandidateNames[0]);
const promotionReceiptPath = path.join(rootDir, 'verification', 'receipts', `${promotionAuditId}-fold.json`);
const promotionRegistryPath = path.join(rootDir, 'architecture', 'registry.json');
const promotionIndexPath = path.join(rootDir, 'architecture', 'INDEX.md');
const promotionRegistryBefore = await readFile(promotionRegistryPath);
const promotionIndexBefore = await readFile(promotionIndexPath);
const promotionCandidate = {
    schemaVersion: 1,
    id: promotionAuditId,
    baseRegistrySha256: sha256(promotionRegistryBefore),
    changes: {},
};
try {
    if (ownsPromotionCandidate) {
        await writeFile(promotionCandidatePath, `${JSON.stringify(promotionCandidate, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    }
    for (const target of ['receipt', 'index', 'registry']) {
        const result = spawnSync('node', [
            'tools/architecture-registry.mjs',
            'promote',
            path.relative(rootDir, promotionCandidatePath),
            path.relative(rootDir, promotionReceiptPath),
            '--audit-partial-write',
            target,
        ], {
            cwd: rootDir,
            encoding: 'utf8',
            shell: false,
            env: process.env,
        });
        const output = `${result.stdout || ''}\n${result.stderr || ''}`;
        if (result.status === 0) throw new Error(`partial ${target} promotion write: mutation was not rejected`);
        if (!new RegExp(`audit injected partial ${target} write failure`).test(output)) {
            throw new Error(`partial ${target} promotion write: failed for the wrong reason\n${output}`);
        }
        if (!promotionRegistryBefore.equals(await readFile(promotionRegistryPath))) {
            throw new Error(`partial ${target} promotion write changed architecture/registry.json`);
        }
        if (!promotionIndexBefore.equals(await readFile(promotionIndexPath))) {
            throw new Error(`partial ${target} promotion write changed architecture/INDEX.md`);
        }
        try {
            await stat(promotionReceiptPath);
            throw new Error(`partial ${target} promotion write left a fold receipt behind`);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
        rejectedMutations += 1;
        console.log(`PASS partial ${target} promotion write preserves every authority file`);
    }
} finally {
    if (!promotionRegistryBefore.equals(await readFile(promotionRegistryPath))) {
        await writeFile(promotionRegistryPath, promotionRegistryBefore);
    }
    if (!promotionIndexBefore.equals(await readFile(promotionIndexPath))) {
        await writeFile(promotionIndexPath, promotionIndexBefore);
    }
    if (ownsPromotionCandidate) await removeIfPresent(promotionCandidatePath);
    await removeIfPresent(promotionReceiptPath);
    for (const directory of [path.dirname(promotionIndexPath), path.dirname(promotionReceiptPath)]) {
        for (const name of await readdir(directory)) {
            if (name.includes(`.${process.pid}.`) && name.endsWith('.tmp')) {
                await removeIfPresent(path.join(directory, name));
            }
        }
    }
}

const lfText = Buffer.from('first\nsecond\n', 'utf8');
const crlfText = Buffer.from('first\r\nsecond\r\n', 'utf8');
for (const textPath of ['fixture.mjs', 'playwright-loader.cjs', '.gitattributes']) {
    if (digestEvidenceBytes(textPath, lfText) !== digestEvidenceBytes(textPath, crlfText)) {
        throw new Error(`${textPath}: text evidence hashing is not portable across LF and CRLF checkouts`);
    }
}
if (digestEvidenceBytes('fixture.bin', lfText) === digestEvidenceBytes('fixture.bin', crlfText)) {
    throw new Error('binary evidence hashing silently normalized distinct bytes');
}
console.log('PASS text evidence binding is LF/CRLF portable while binary binding remains byte-exact');

if (outputArg) {
    const outputPath = path.resolve(rootDir, outputArg);
    await mkdir(path.dirname(outputPath), { recursive: true });
    const runtimeBytes = await readFile(guardedRuntime);
    await writeFile(outputPath, `${JSON.stringify({
        schemaVersion: 1,
        kind: 'proof-system-adversarial-audit',
        status: 'passed',
        impactReceipt: path.relative(rootDir, receiptPath).replace(/\\/g, '/'),
        impactReceiptSha256: digestEvidenceBytes(path.relative(rootDir, receiptPath), receiptBytes),
        runtime: {
            target: guardedTarget,
            path: path.relative(rootDir, guardedRuntime).replace(/\\/g, '/'),
            sha256: sha256(runtimeBytes),
        },
        evidenceBinding: await createEvidenceBinding(rootDir),
        rejectedMutations,
        acceptedControls,
    }, null, 2)}\n`, 'utf8');
}

console.log(`Proof-system adversarial audit passed: ${rejectedMutations} mutations rejected, ${acceptedControls} valid controls accepted, and portable evidence hashing verified.`);
