import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testbedDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootDir = path.resolve(testbedDir, '..');

export async function resolveBuiltUserscript() {
    if (process.env.DCUF_TESTBED_USERSCRIPT) {
        return path.resolve(rootDir, process.env.DCUF_TESTBED_USERSCRIPT);
    }
    const buildTargets = JSON.parse(await readFile(path.join(rootDir, 'build', 'targets.json'), 'utf8'));
    const mobileTarget = buildTargets.targets?.mobile;
    if (!mobileTarget?.version || !mobileTarget?.outputPattern?.includes('{version}')) {
        throw new Error('build/targets.json: mobile version or output pattern is missing');
    }
    return path.join(rootDir, mobileTarget.outputPattern.replace('{version}', mobileTarget.version));
}

export async function loadHarnessSource({ storage = {}, gmBehavior = {}, boot = {}, bfcacheVariant = 'current' } = {}) {
    const [gmShim, bootProbe, instrumentation, rawUserscript] = await Promise.all([
        readFile(path.join(testbedDir, 'harness', 'gm-shim.js'), 'utf8'),
        readFile(path.join(testbedDir, 'harness', 'boot-probe.js'), 'utf8'),
        readFile(path.join(testbedDir, 'harness', 'runtime-instrumentation.js'), 'utf8'),
        resolveBuiltUserscript().then((file) => readFile(file, 'utf8'))
    ]);
    const userscript = rawUserscript.replace(/^\uFEFF/, '');
    const lifecycleExperiment = bfcacheVariant === 'pagehide'
        ? `
window.addEventListener('pagehide', (event) => {
    window.__dcufTestbedPagehide = { persisted: event.persisted, snapshot: window.__dcufMemoryDebug?.sample?.('pagehide-experiment') || null };
    const coordinator = window.__dcufRuntimeCoordinator;
    coordinator?._mutationObserver?.disconnect?.();
    if (coordinator) coordinator._mutationObserverReady = false;
});
window.addEventListener('pageshow', (event) => {
    window.__dcufTestbedPageshow = { persisted: event.persisted, ts: Date.now() };
});`
        : `window.addEventListener('pageshow', (event) => { window.__dcufTestbedPageshow = { persisted: event.persisted, ts: Date.now() }; });`;

    const topFrameSource = [
        `globalThis.__DCUF_TESTBED_CONFIG__ = ${JSON.stringify({ storage, gmBehavior, boot })};`,
        gmShim,
        bootProbe,
        instrumentation,
        userscript,
        lifecycleExperiment
    ].join('\n;\n');
    // Real ad frames are hosted on origins outside the userscript @match. Playwright init
    // scripts run in every frame, so explicitly keep the test harness in the top frame.
    return `if (globalThis.top === globalThis) {\n${topFrameSource}\n}`;
}
