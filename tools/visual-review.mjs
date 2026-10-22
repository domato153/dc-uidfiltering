import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(new URL('../testbed/harness/playwright-loader.cjs', import.meta.url));
const args = process.argv.slice(2);
if (args.includes('--help')) {
    console.log('node tools/visual-review.mjs --manifest <JSON> --output <new artifacts/ directory>\nCompares existing same-size PNG pairs with installed Playwright Test and its native HTML diff report.\nExit 0: pixel match; 1: differences; 2: invalid inputs/runner failure. No baseline approval/update.');
    process.exit(0);
}
const value = flag => args[args.indexOf(flag) + 1];
if (!args.includes('--manifest') || !args.includes('--output') || args.length !== 4) throw new Error('Use --help for arguments');
const output = path.resolve(value('--output'));
if (!['artifacts', 'testbed/artifacts'].some(prefix => {
    const relative = path.relative(path.join(root, prefix), output);
    return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
})) throw new Error('Output must be a new child directory under artifacts/ or testbed/artifacts/');
await mkdir(output, { recursive: true });
if ((await readdir(output)).length) throw new Error('Choose an empty output directory; previous evidence is never overwritten');
const receipt = { schemaVersion: 1, status: 'INVALID_INPUT', productApproved: false, engine: `playwright@${require('playwright/package.json').version}`, cases: [] };
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
try {
    const manifestBytes = await readFile(path.resolve(value('--manifest')));
    const manifest = JSON.parse(manifestBytes);
    if (manifest.schemaVersion !== 1 || !['design-comparison', 'regression'].includes(manifest.purpose) || !manifest.provenance || !manifest.cases?.length) throw new Error('Invalid manifest schema/purpose/provenance/cases');
    receipt.purpose = manifest.purpose;
    receipt.provenance = manifest.provenance;
    receipt.manifestSha256 = digest(manifestBytes);
    const ids = new Set();
    await mkdir(path.join(output, 'baselines'));
    await mkdir(path.join(output, 'candidates'));
    for (const item of manifest.cases) {
        if (!/^[a-z0-9][a-z0-9-]*$/.test(item.id) || ids.has(item.id) || !['light', 'dark'].includes(item.theme)) throw new Error(`Invalid/duplicate case ${item.id}`);
        ids.add(item.id);
        const recorded = { id: item.id, width: item.width, height: item.height, theme: item.theme, files: {} };
        for (const role of ['reference', 'candidate']) {
            if (typeof item[role] !== 'string' || path.isAbsolute(item[role])) throw new Error(`${item.id}: use repository-relative input paths`);
            const source = path.resolve(root, item[role]), relative = path.relative(root, source);
            if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Input outside repository');
            const bytes = await readFile(source);
            if (bytes.length < 24 || !bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error(`${item.id} ${role}: not a PNG`);
            const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
            if (!Number.isInteger(item.width) || !Number.isInteger(item.height) || width !== item.width || height !== item.height) throw new Error(`${item.id} ${role}: ${width}x${height} differs from declared viewport ${item.width}x${item.height}`);
            recorded.files[role] = { path: item[role].replaceAll('\\', '/'), sha256: digest(bytes), width, height };
            await writeFile(path.join(output, role === 'reference' ? 'baselines' : 'candidates', `${item.id}.png`), bytes);
        }
        receipt.cases.push(recorded);
    }
    await writeFile(path.join(output, 'inputs.json'), JSON.stringify(receipt, null, 2));
    const cli = path.join(path.dirname(require.resolve('playwright/package.json')), 'cli.js');
    const result = spawnSync(process.execPath, [cli, 'test', '--config', path.join(root, 'testbed/visual/playwright.config.mjs')], {
        cwd: root, stdio: 'inherit', env: { ...process.env, DCUF_VISUAL_REVIEW_OUTPUT: output }
    });
    if (result.error) throw result.error;
    const nativeReport = JSON.parse(await readFile(path.join(output, 'results.json'), 'utf8'));
    if (nativeReport.errors.length || nativeReport.stats.expected + nativeReport.stats.unexpected !== receipt.cases.length || nativeReport.stats.skipped || nativeReport.stats.flaky) throw new Error('Playwright did not execute every declared image comparison');
    const results = [];
    function collect(suites) {
        for (const suite of suites) {
            for (const spec of suite.specs || []) for (const test of spec.tests) results.push(...test.results);
            collect(suite.suites || []);
        }
    }
    collect(nativeReport.suites);
    if (results.some(result => result.status !== 'passed' && !result.attachments.some(item => item.contentType === 'image/png' && item.name.endsWith('-diff.png')))) {
        throw new Error('Image decoding or runner failed before producing a native pixel diff; inspect results.json');
    }
    receipt.status = result.status === 0 ? 'PIXEL_MATCH' : 'DIFFERENCES_REQUIRE_REVIEW';
    receipt.passed = nativeReport.stats.expected;
    receipt.failed = nativeReport.stats.unexpected;
    receipt.report = 'report/index.html';
    process.exitCode = result.status === 0 ? 0 : 1;
} catch (error) {
    receipt.status = 'INVALID_INPUT';
    receipt.error = String(error);
    process.exitCode = 2;
}
await writeFile(path.join(output, 'review.json'), JSON.stringify(receipt, null, 2));
console.log(`${receipt.status}; productApproved=false; ${path.relative(root, output).replaceAll('\\', '/')}/review.json`);
