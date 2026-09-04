import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const buildTargets = JSON.parse(await readFile(path.join(rootDir, 'build', 'targets.json'), 'utf8'));
const target = buildTargets.targets?.mobile;
if (!target) throw new Error('build/targets.json: mobile target is missing');

const testbedOutputIndex = process.argv.indexOf('--testbed-output');
const testbedOutput = testbedOutputIndex >= 0 && process.argv[testbedOutputIndex + 1]
    ? path.resolve(rootDir, process.argv[testbedOutputIndex + 1])
    : null;
const versionOverrideIndex = process.argv.indexOf('--version');
const versionOverride = versionOverrideIndex >= 0 ? process.argv[versionOverrideIndex + 1] : null;
if (versionOverride && !testbedOutput) {
    throw new Error('--version is allowed only with --testbed-output');
}
const VERSION = versionOverride || target.version;
const OUTPUT_NAME = target.outputPattern.replace('{version}', VERSION);

function inputForRole(role) {
    const input = target.inputs.find((candidate) => candidate.role === role);
    if (!input) throw new Error(`build/targets.json: mobile input role is missing: ${role}`);
    return input.path;
}

const MOBILE_LEGACY_PARTS = target.inputs
    .filter((input) => input.role === 'legacy-runtime')
    .map((input) => input.path);

const replacements = [
    {
        description: 'version header token',
        apply(text) {
            return text.replace(/__VERSION__/g, VERSION);
        },
    },
    {
        description: 'mobile delete surface target token',
        apply(text) {
            return text.replace(/__DCUF_DELETE_SURFACE__/g, 'mobile');
        },
    },
];

async function readPart(relativePath) {
    const absolutePath = path.join(rootDir, relativePath);
    const content = await readFile(absolutePath, 'utf8');
    return content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
}

function replaceOrThrow(source, pattern, replacement, label) {
    const next = source.replace(pattern, replacement);
    if (next === source) {
        throw new Error(`Legacy transform failed: ${label}`);
    }
    return next;
}

function stripEsmSyntax(source) {
    return source
        .replace(/^\s*import\s+.+?;\r?\n/gm, '')
        .replace(/^export const /gm, 'const ')
        .replace(/^export function /gm, 'function ');
}

async function buildSharedRuntimePrelude() {
    const schemaSource = stripEsmSyntax(await readPart(inputForRole('shared-schema')));
    const ipSource = stripEsmSyntax(await readPart(inputForRole('shared-ip')));
    const storageCoreSource = stripEsmSyntax(await readPart(inputForRole('shared-storage')));
    const filterCoreSource = stripEsmSyntax(await readPart(inputForRole('shared-filter')));
    const uiContractsSource = stripEsmSyntax(await readPart(inputForRole('shared-ui-contracts')));
    const uiDisposableScopeSource = stripEsmSyntax(await readPart(inputForRole('ui-disposable-scope')));
    const uiStateStoreSource = await readPart(inputForRole('ui-state-store'));
    const themeHostPortSource = await readPart(inputForRole('theme-host-port'));

    return [
        '    // Phase 2 runtime shared prelude',
        schemaSource.trimEnd(),
        '',
        '    const DCUF_SHARED_SCHEMA = Object.freeze({ FILTER_CONSTANTS, STORAGE_KEYS, SELECTORS, API_PATHS, CUSTOM_ATTRS, UI_IDS, ETC_CONSTANTS });',
        '',
        ipSource.trimEnd(),
        '',
        '    const DCUF_SHARED_IP = Object.freeze({ TELECOM, PROXY_MODE, PROXY_STRICT_PREFIXES, PROXY_AGGRESSIVE_EXTRA_PREFIXES, KR_IP_RANGES });',
        '',
        storageCoreSource.trimEnd(),
        '',
        '    const DCUF_SHARED_STORAGE = Object.freeze({',
        '        STORAGE_SCHEMA_VERSION,',
        '        normalizeHeadtext,',
        '        normalizeGalleryHeadtextBlocks,',
        '        normalizeProxyBlockModeValue,',
        '        normalizeIpPrefix,',
        '        stripLegacyMobileIpMarker,',
        '        parseIpPrefixList,',
        '        extractIpPrefix,',
        '        normalizeBlockConfigIp,',
        '        isSuspiciousLegacyManagedIpList,',
        '        formatShortcutKeys,',
        '        parseShortcutString,',
        '        createDefaultFilterSettings,',
        '        normalizeStoredFilterSettings,',
        '    });',
        '',
        uiContractsSource.trimEnd(),
        '',
        uiDisposableScopeSource.trimEnd(),
        '',
        '    const DCUF_UI_CONTRACTS = Object.freeze({',
        '        UI_INTENT_TYPES,',
        '        createCommandResult,',
        '        createDisposableScope,',
        '        createUiSurface,',
        '        createHostSurfacePort,',
        '        createUiPortRuntime,',
        '    });',
        '',
        uiStateStoreSource.trimEnd(),
        '',
        themeHostPortSource.trimEnd(),
        '',
        filterCoreSource.trimEnd(),
        '',
        '    const DCUF_SHARED_FILTER_CORE = Object.freeze({',
        '        FILTER_CORE_PHASE,',
        '        createEmptyDecision,',
        '        evaluateUserStatsBlock,',
        '        isPersonalBlockHit,',
        '        evaluateSyncBlockDecision,',
        '    });',
        '',
    ].join('\n');
}

function transformLegacyAppForPhaseTwo(source) {
    let text = source;

    text = replaceOrThrow(
        text,
        /TELECOM:\s*\[[\s\S]*?BLOCK_UID_EXPIRE:/,
        [
            'TELECOM: DCUF_SHARED_IP.TELECOM,',
            '',
            '        CONSTANTS: DCUF_SHARED_SCHEMA.FILTER_CONSTANTS,',
            '        BLOCK_UID_EXPIRE:',
        ].join('\n'),
        'shared data/constants block'
    );

    text = replaceOrThrow(
        text,
        /PROXY_MODE:\s*\{[\s\S]*?KR_IP_RANGES:\s*\{[\s\S]*?\},/,
        [
            'PROXY_MODE: DCUF_SHARED_IP.PROXY_MODE,',
            '        PROXY_STRICT_PREFIXES: DCUF_SHARED_IP.PROXY_STRICT_PREFIXES,',
            '        PROXY_AGGRESSIVE_EXTRA_PREFIXES: DCUF_SHARED_IP.PROXY_AGGRESSIVE_EXTRA_PREFIXES,',
            '        KR_IP_RANGES: DCUF_SHARED_IP.KR_IP_RANGES,',
        ].join('\n'),
        'shared proxy and KR range block'
    );

    return text;
}

function applyReplacements(source) {
    return replacements.reduce((acc, step) => step.apply(acc), source);
}

async function main() {
    const [header, bootstrap, styleBanner, sharedPrelude, ...mobileLegacyParts] = await Promise.all([
        readPart(inputForRole('header')),
        readPart(inputForRole('bootstrap')),
        readPart(inputForRole('style-banner')),
        buildSharedRuntimePrelude(),
        ...MOBILE_LEGACY_PARTS.map(readPart),
    ]);
    const legacyApp = mobileLegacyParts.join('');
    const transformedLegacyApp = transformLegacyAppForPhaseTwo(legacyApp);
    const combined = `${header}\n${bootstrap}${sharedPrelude}${styleBanner}${transformedLegacyApp}`;
    const built = applyReplacements(combined)
        .replace(/[ \t]+$/gm, '')
        .replace(/\n+$/, '\n')
        .replace(/\r?\n/g, '\r\n');
    const bomText = `\uFEFF${built}`;

    if (testbedOutput) {
        await mkdir(path.dirname(testbedOutput), { recursive: true });
        await writeFile(testbedOutput, bomText, 'utf8');
        process.stdout.write(`Built testbed runtime: ${testbedOutput}`);
        return;
    }

    const distDir = path.join(rootDir, 'dist');
    await mkdir(distDir, { recursive: true });

    const distPath = path.join(distDir, OUTPUT_NAME);
    const rootCopyPath = path.join(rootDir, OUTPUT_NAME);
    await writeFile(distPath, bomText, 'utf8');
    await writeFile(rootCopyPath, bomText, 'utf8');

    process.stdout.write([
        `Built ${OUTPUT_NAME}`,
        ` - dist: ${distPath}`,
        ` - root: ${rootCopyPath}`,
    ].join('\n'));
}

main().catch((error) => {
    console.error('[build-userscript] failed:', error);
    process.exitCode = 1;
});
