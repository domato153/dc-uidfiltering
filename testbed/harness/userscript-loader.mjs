import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testbedDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootDir = path.resolve(testbedDir, '..');

export async function resolveBuiltUserscript() {
    if (process.env.DCUF_TESTBED_USERSCRIPT) {
        return path.resolve(rootDir, process.env.DCUF_TESTBED_USERSCRIPT);
    }
    const buildText = await readFile(path.join(rootDir, 'tools', 'build-userscript.mjs'), 'utf8');
    const version = buildText.match(/const VERSION = ['"]([^'"]+)['"]/)?.[1];
    if (!version) throw new Error('Unable to read mobile VERSION from tools/build-userscript.mjs');
    return path.join(rootDir, `Dc_UserFilter_Mobile_v${version}.user.js`);
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
