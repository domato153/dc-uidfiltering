import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const buildTargets = JSON.parse(await readFile(path.join(rootDir, 'build', 'targets.json'), 'utf8'));
const target = buildTargets.targets?.pc;
if (!target) throw new Error('build/targets.json: pc target is missing');

const VERSION = target.version;
const OUTPUT_NAME = target.outputPattern.replace('{version}', VERSION);
const testbedOutputIndex = process.argv.indexOf('--testbed-output');
const testbedOutput = testbedOutputIndex >= 0 && process.argv[testbedOutputIndex + 1]
    ? path.resolve(rootDir, process.argv[testbedOutputIndex + 1])
    : null;

function inputForRole(role) {
    const input = target.inputs.find((candidate) => candidate.role === role);
    if (!input) throw new Error(`build/targets.json: pc input role is missing: ${role}`);
    return input.path;
}

const PC_PARTS = target.inputs
    .filter((input) => input.role === 'pc-runtime')
    .map((input) => input.path);

const REQUIRED_SHARED_FILTER_UI_SELECTORS = [
    'data-dcuf-surface="filter-settings"',
    'data-dcuf-surface="shortcut-settings"',
    'data-dcuf-surface="personal-menu"',
    'data-dcuf-surface="personal-size"',
    'data-dcuf-surface="personal-manual"',
    'data-dcuf-surface="personal-selection"',
    'data-dcuf-surface="personal-management"',
    'data-dcuf-surface="personal-backup"',
];

const FORBIDDEN_MOBILE_UI_TOKENS = [
    '.custom-mobile-list',
    '.custom-post-item',
    '.custom-bottom-controls',
    '.gallview_contents',
    '.writing_view_box',
    '.comment_box',
    '.img_comment',
];

const replacements = [
    {
        description: 'version header token',
        apply(text) {
            return text.replace(/__VERSION__/g, VERSION);
        },
    },
    {
        description: 'PC delete surface target token',
        apply(text) {
            return text.replace(/__DCUF_DELETE_SURFACE__/g, 'off');
        },
    },
    {
        description: 'PC target capability token',
        apply(text) {
            return text.replace(/__DCUF_TARGET_IS_MOBILE__/g, 'false');
        },
    },
];

async function readPart(relativePath) {
    const absolutePath = path.join(rootDir, relativePath);
    const content = await readFile(absolutePath, 'utf8');
    return content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
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
    const popupGeometryHostAdapterSource = await readPart(inputForRole('popup-geometry-host-adapter'));

    return [
        '    // PC filter port shared prelude',
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
        '        createSurfaceSnapshot,',
        '        createUiSurface,',
        '        createHostSurfaceAdapter,',
        '        createHostSurfacePort,',
        '        createUiPortRuntime,',
        '    });',
        '',
        uiStateStoreSource.trimEnd(),
        '',
        themeHostPortSource.trimEnd(),
        '',
        popupGeometryHostAdapterSource.trimEnd(),
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

function applyReplacements(source) {
    return replacements.reduce((acc, step) => step.apply(acc), source);
}

async function main() {
    const [header, bootstrap, sharedPrelude, writeDefaults, targetThemeHostStyle, sharedSettingsPresenter, sharedThemePresenter, sharedFilterUiStyle, pcFilterUiStyleMount, sharedFilterRuntime, filterSettingsHostAdapter, rawPersonalBlockModule, personalBlockHostAdapter, filterHostAdapter, ...pcParts] = await Promise.all([
        readPart(inputForRole('header')),
        readPart(inputForRole('bootstrap')),
        buildSharedRuntimePrelude(),
        readPart(inputForRole('shared-write-defaults')),
        readPart(inputForRole('pc-theme-host-style')),
        readPart(inputForRole('shared-settings-presenter')),
        readPart(inputForRole('shared-theme-presenter')),
        readPart(inputForRole('shared-filter-ui-style')),
        readPart(inputForRole('pc-filter-ui-style-mount')),
        readPart(inputForRole('shared-filter-runtime')),
        readPart(inputForRole('filter-settings-host-adapter')),
        readPart(inputForRole('shared-personal-block-module')),
        readPart(inputForRole('personal-block-host-adapter')),
        readPart(inputForRole('filter-host-adapter')),
        ...PC_PARTS.map(readPart),
    ]);

    const teardown = await readPart(inputForRole('teardown'));
    REQUIRED_SHARED_FILTER_UI_SELECTORS.forEach((selector) => {
        if (!sharedSettingsPresenter.includes(selector)) throw new Error(`Shared settings presenter is missing required selector: ${selector}`);
    });
    FORBIDDEN_MOBILE_UI_TOKENS.forEach((token) => {
        if (`${sharedSettingsPresenter}\n${sharedFilterUiStyle}`.includes(token)) throw new Error(`Mobile-only UI token leaked into shared settings presentation: ${token}`);
    });
    const [filterStyle, filterEntry] = pcParts;
    const combined = `${header}\n${bootstrap}${sharedPrelude}${writeDefaults}${filterStyle}${targetThemeHostStyle}${sharedSettingsPresenter}${sharedThemePresenter}${sharedFilterUiStyle}${pcFilterUiStyleMount}${sharedFilterRuntime}${filterSettingsHostAdapter}${rawPersonalBlockModule}${personalBlockHostAdapter}${filterHostAdapter}${filterEntry}${teardown}`;
    const built = applyReplacements(combined)
        .replace(/[ \t]+$/gm, '')
        .replace(/\n+$/, '\n')
        .replace(/\r?\n/g, '\r\n');
    const bomText = `\uFEFF${built}`;
    if (testbedOutput) {
        await mkdir(path.dirname(testbedOutput), { recursive: true });
        await writeFile(testbedOutput, bomText, 'utf8');
        process.stdout.write(`Built PC testbed runtime: ${testbedOutput}`);
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
        ' - source: explicit shared FilterModule, ThemePresenter, and management style inputs + target adapters + shared core',
        ` - dist: ${distPath}`,
        ` - root: ${rootCopyPath}`,
    ].join('\n'));
}

main().catch((error) => {
    console.error('[build-pc-filter-userscript] failed:', error);
    process.exitCode = 1;
});
