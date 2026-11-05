import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { loadHarnessSource } from './harness/userscript-loader.mjs';
import { storageKeys } from './harness/runner-utils.mjs';
import { startServer } from './server/server.mjs';
import { withHeaderDarkToggleFixture } from './fixtures/header-dark-toggle.mjs';
import { captureHeaderPaletteBatch } from './header-palette-batch-contract.mjs';
import { transformHeaderPalettePriorities } from '../tools/header-palette-priority-contract.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), args = process.argv.slice(2);
const required = flag => { const i = args.indexOf(flag); assert.ok(i >= 0 && args[i + 1], flag); return args[i + 1]; };
assert.ok(args.includes('--require-runtime-under-test'), 'Source guard required');
const candidate = path.join(root, 'testbed/artifacts/runtime-under-test.user.js'), control = path.resolve(root, required('--control'));
const output = path.resolve(root, required('--output')), simulate = args.includes('--simulate');
assert.ok(output.startsWith(path.join(root, 'testbed/artifacts') + path.sep));
await mkdir(path.dirname(output), { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const controlBytes = await readFile(control), candidateBytes = await readFile(candidate);
const controlSha = 'FD58B82236AC08D0208FD7982E7083945B6A79F132B257C04C56C79BF1B2C1E2';
assert.equal(sha(controlBytes), controlSha);
if (simulate) assert.equal(sha(candidateBytes), controlSha, 'Characterization starts from frozen control');
else {
    const restored = transformHeaderPalettePriorities(candidateBytes.toString());
    assert.equal(restored.changed, 55); assert.equal(restored.owners, 5);
    assert.equal(sha(restored.source), controlSha, 'Entire artifact differs only by the55 declared palette priorities');
}
const report = { scope: simulate ? 'CHARACTERIZATION_NOT_ADMISSION' : 'PALETTE_PRIORITY_BATCH_ONLY', status: 'RUNNING',
    control: { path: control, sha256: controlSha }, candidate: { path: candidate, sha256: sha(candidateBytes) }, cases: [] };
const inputs = ['testbed/run-header-palette-batch.mjs', 'testbed/header-palette-batch-contract.mjs', 'tools/header-palette-priority-contract.mjs'];
report.inputs = Object.fromEntries(await Promise.all(inputs.map(async f => [f, sha(await readFile(path.join(root, f)))])));
console.log(JSON.stringify({ control: report.control, candidate: report.candidate, scope: report.scope }));
const { chromium } = createRequire(import.meta.url)('./harness/playwright-loader.cjs');
const browser = await chromium.launch({ headless: true, args: ['--disable-background-timer-throttling',
    '--blink-settings=primaryPointerType=2,availablePointerTypes=2,primaryHoverType=2,availableHoverTypes=2,maxTouchPoints=5,forceTouchEventFeatureDetectionForInspector=true'] });
const server = await startServer(); report.browser = browser.version();
const routes = ['/board/lists?id=test', '/mgallery/board/lists?id=test', '/mini/board/lists?id=test', '/mgallery/board/view?id=test&no=1001&header=1'];
const cases = routes.flatMap(route => [false, true].flatMap(dark => [false, true].map(native => ({ route, dark, native, width: 980, height: 2306 }))));
cases.push({ route: routes[1], dark: false, native: true, width: 390, height: 844 }, { route: routes[1], dark: true, native: true, width: 1280, height: 900 });
try {
    for (const testCase of cases) {
        const sides = {};
        for (const [side, runtime] of [['control', control], ['candidate', candidate]]) {
            process.env.DCUF_TESTBED_USERSCRIPT = runtime;
            const context = await browser.newContext({ viewport: { width: testCase.width, height: testCase.height }, screen: { width: 412, height: 1006 },
                deviceScaleFactor: 2.625, isMobile: true, hasTouch: false,
                userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36' });
            await context.addInitScript({ content: await loadHarnessSource({ storage: { [storageKeys.threshold]: 0, [storageKeys.ratioEnabled]: false,
                [storageKeys.personalEnabled]: true, [storageKeys.personalList]: { uids: [], nicknames: [], ips: [] } } }) });
            const page = await context.newPage();
            try {
                if (testCase.native) await page.route('**' + testCase.route, async req => { const response = await req.fetch();
                    await req.fulfill({ response, body: withHeaderDarkToggleFixture(await response.text()) }); });
                await page.goto(server.baseUrl + testCase.route, { waitUntil: 'domcontentloaded' });
                await page.waitForFunction(() => document.documentElement.classList.contains('script-ui-ready')
                    && document.querySelector('[data-dcuf-header-shell-role="head"]') && document.querySelector('[data-dcuf-header-gnb-role="nav"]')
                    && document.querySelector('[data-dcuf-gallery-page-head-role="root"]') && document.querySelector('[data-dcuf-header-recent-visit-role="list"]'));
                if (testCase.dark) {
                    await page.evaluate(() => { const s = document.createElement('style'); s.id = 'css-darkmode'; document.head.append(s); });
                    await page.waitForFunction(() => document.body.classList.contains('dc-filter-dark-mode'));
                }
                await page.waitForFunction(() => {
                    const m = window.__dcufTestbedMetrics.snapshot();
                    return m.activeTimeouts === 0 && m.activeAnimationFrames === 0 && m.activeIntervals === 0
                        && !m.dcuf?.subscribers?.includes('ui-post-reveal-recovery');
                });
                sides[side] = await captureHeaderPaletteBatch(page, simulate && side === 'candidate');
            } finally { await context.close(); }
        }
        assert.equal(sides.control.states.length, 32); assert.equal(sides.candidate.states.length, 32);
        const states = sides.control.states.map((frame, i) => {
            const actual = sides.candidate.states[i];
            const expectedSha = sha(JSON.stringify(frame)), actualSha = sha(JSON.stringify(actual));
            if (actualSha !== expectedSha) {
                report.failure = { testCase, phase: frame.phase, palette: frame.palette,
                    differences: frame.nodes.flatMap((expected, index) => {
                        const value = actual.nodes[index];
                        if (JSON.stringify(expected) === JSON.stringify(value)) return [];
                        return [{ node: sides.control.signatures[Math.floor(index / 3)], pseudo: index % 3,
                            changes: expected.flatMap((v, j) => v === value?.[j] ? [] : [{ property: j < (index % 3 ? 0 : 4) ? 'box-' + j : sides.control.properties[j - (index % 3 ? 0 : 4)], expected: v, actual: value?.[j] }]) }];
                    }).slice(0, 20) };
                console.log(JSON.stringify(report.failure));
            }
            assert.equal(actualSha, expectedSha, JSON.stringify({ testCase, phase: frame.phase, palette: frame.palette }));
            return { phase: frame.phase, palette: frame.palette, sha256: actualSha };
        });
        report.cases.push({ ...testCase, states, nodeCount: sides.candidate.nodeCount });
        await writeFile(output, JSON.stringify(report, null, 2) + '\n');
        console.log(`PASS ${testCase.route} ${testCase.width} ${testCase.dark ? 'dark' : 'light'} ${testCase.native ? 'native-shaped' : 'inline-fixture'}:32 states`);
    }
    report.status = 'PASS';
} finally {
    await writeFile(output, JSON.stringify(report, null, 2) + '\n');
    await browser.close(); await server.close();
}
