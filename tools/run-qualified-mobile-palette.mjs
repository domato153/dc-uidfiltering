import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { createEvidenceBinding, digestEvidenceBytes } from './evidence-binding.mjs';
import { assertPaletteQualification, classifyPaletteOwnerSplit, PALETTE_QUALIFICATION_DEPENDENCIES }
    from './classify-palette-owner-split.mjs';
import { probePaletteOwnerLifecycle } from './probe-palette-owner-lifecycle.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const check = (condition, message) => { if (!condition) throw new Error(message); };
const CONTROL = 'testbed/artifacts/baseline-mobile-beta.user.js';
const CANDIDATE = 'testbed/artifacts/runtime-under-test.user.js';

function scopedPath(relative, pattern, label) {
    check(typeof relative === 'string' && pattern.test(relative)
        && !relative.split('/').some(part => part === '.' || part === '..' || part === ''), `invalid ${label} path`);
    const absolute = path.resolve(root, relative);
    check(absolute.startsWith(root + path.sep), `${label} path escapes repository`);
    return absolute;
}

export async function readQualifiedPaletteInputs({ qualificationPath, qualificationSha256 }) {
    const qualificationAbsolute = scopedPath(qualificationPath, /^(?:tools|verification)\/[A-Za-z0-9_./-]+\.json$/, 'qualification');
    const qualificationBytes = await readFile(qualificationAbsolute);
    check(/^[A-F0-9]{64}$/.test(qualificationSha256)
        && digestEvidenceBytes(qualificationPath, qualificationBytes).toUpperCase() === qualificationSha256,
    'reviewed qualification digest changed');
    const qualification = assertPaletteQualification(JSON.parse(qualificationBytes));
    check(qualification.platform === `${process.platform}/${process.arch}`, 'qualified platform changed');
    const files = { ...PALETTE_QUALIFICATION_DEPENDENCIES, control: CONTROL, candidate: CANDIDATE,
        fullMobile: qualification.fullMobile.path, qualification: qualificationPath };
    const bytes = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([key, relative]) =>
        [key, await readFile(path.join(root, relative))])));
    const currentBinding = await createEvidenceBinding(root);
    check(sha(bytes.control) === qualification.controlSha256 && sha(bytes.candidate) === qualification.candidateSha256,
        'qualified control/candidate bytes changed');
    for (const [key, relative] of Object.entries(PALETTE_QUALIFICATION_DEPENDENCIES)) {
        check(digestEvidenceBytes(relative, bytes[key]).toUpperCase() === qualification.dependencies[key],
            `qualified dependency changed: ${key}`);
    }
    for (const [key, expected] of Object.entries(qualification.evidenceBinding)) {
        check(currentBinding[key] === expected, `qualified direct input changed: ${key}`);
    }
    check(sha(bytes.fullMobile) === qualification.fullMobile.sha256, 'qualified full-mobile report changed');
    const arch = spawnSync(process.execPath, ['tools/inspect-live-architecture.mjs', '--surface', 'header-navigation'],
        { cwd: root, encoding: 'utf8', shell: false });
    check(arch.status === 0, 'effective architecture inspection failed');
    return {
        profileId: 'qualified-header', qualification, qualificationBytes, qualificationSha256,
        qualificationDependencyBytes: Object.fromEntries(Object.keys(PALETTE_QUALIFICATION_DEPENDENCIES).map(key => [key, bytes[key]])),
        baselineBytes: bytes.baseline, controlBytes: bytes.control, candidateBytes: bytes.candidate,
        observerBytes: bytes.observer, classifierBytes: bytes.classifier, probeScriptBytes: bytes.probe,
        surfaceManifest: JSON.parse(bytes.surfaceManifest), surfaceManifestBytes: bytes.surfaceManifest,
        deltas: JSON.parse(bytes.deltas), deltasBytes: bytes.deltas,
        fullMobile: JSON.parse(bytes.fullMobile), fullMobileBytes: bytes.fullMobile,
        architecture: JSON.parse(arch.stdout), currentBinding, files, inputBytes: bytes,
    };
}

export async function assertQualifiedInputsUnchanged(input) {
    for (const [key, relative] of Object.entries(input.files)) {
        check(sha(await readFile(path.join(root, relative))) === sha(input.inputBytes[key]),
            `palette input changed during qualification: ${key}`);
    }
    check(isDeepStrictEqual(await createEvidenceBinding(root), input.currentBinding),
        'evidence binding changed during palette qualification');
}

export async function runQualifiedMobilePalette(options) {
    const output = scopedPath(options.output, /^(?:artifacts|testbed\/artifacts)\/[A-Za-z0-9_./-]+\.json$/, 'output');
    const qualifiedOutput = output + '.qualified.json';
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(qualifiedOutput, JSON.stringify({ schemaVersion: 1, kind: 'qualified-mobile-palette-gate', status: 'in-progress' }) + '\n');
    try {
        const input = await readQualifiedPaletteInputs(options);
        check(output !== path.resolve(root, input.qualification.fullMobile.path), 'raw output would overwrite full-mobile evidence');
        // A failed child may not reuse an old raw FAIL report at the same path.
        await writeFile(output, JSON.stringify({ schemaVersion: 1, kind: 'palette-observation-in-progress' }) + '\n');
        const child = spawnSync(process.execPath, ['testbed/run-palette-differential.mjs', '--target', 'mobile',
            '--control', CONTROL, '--candidate', CANDIDATE, '--output', options.output],
        { cwd: root, stdio: 'inherit', shell: false });
        check(child.status === 1 && !child.error && !child.signal,
            'raw palette comparator did not produce the qualified FAIL');
        input.reportBytes = await readFile(output);
        input.report = JSON.parse(input.reportBytes);
        check(input.report.kind === 'observed-palette-differential' && input.report.equivalent === false,
            'raw palette observation failed before writing a complete FAIL report');
        const rawSide = side => path.join(root, 'testbed/artifacts', `${path.basename(output)}.${side}.json`);
        input.controlSideBytes = await readFile(rawSide('control'));
        input.candidateSideBytes = await readFile(rawSide('candidate'));
        input.probe = await probePaletteOwnerLifecycle({ settleEachPhase: true });
        await assertQualifiedInputsUnchanged(input);
        const classification = classifyPaletteOwnerSplit(input);
        const result = {
            schemaVersion: 1, kind: 'qualified-mobile-palette-gate', status: 'passed',
            rawStatus: 'FAIL', qualifiedStatus: 'DECLARED_OWNER_SPLIT_ONLY', stageStatus: 'UNKNOWN',
            rawReport: options.output, qualification: options.qualificationPath,
            qualificationSha256: options.qualificationSha256, classification,
        };
        await writeFile(output + '.lifecycle.json', JSON.stringify(input.probe, null, 2) + '\n');
        await writeFile(qualifiedOutput, JSON.stringify(result, null, 2) + '\n');
        console.log('Qualified mobile palette gate: PASS (exact declared owner split; original raw comparator remains FAIL)');
        return result;
    } catch (error) {
        await writeFile(qualifiedOutput, JSON.stringify({ schemaVersion: 1, kind: 'qualified-mobile-palette-gate',
            status: 'failed', stageStatus: 'UNKNOWN', error: error.message }, null, 2) + '\n');
        throw error;
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
    try {
        const args = process.argv.slice(2);
        const names = ['--qualification', '--qualification-sha256', '--output'];
        check(args.length === names.length * 2 && args.every((value, index) => index % 2 || names.includes(value))
            && new Set(args.filter((value, index) => index % 2 === 0)).size === names.length,
        'required arguments: --qualification <reviewed JSON> --qualification-sha256 <exact SHA> --output <raw JSON>');
        const at = name => args[args.indexOf(name) + 1];
        await runQualifiedMobilePalette({ qualificationPath: at('--qualification'),
            qualificationSha256: at('--qualification-sha256'), output: at('--output') });
    } catch (error) {
        console.error(`Qualified mobile palette gate BLOCKED: ${error.message}`);
        process.exitCode = 1;
    }
}
