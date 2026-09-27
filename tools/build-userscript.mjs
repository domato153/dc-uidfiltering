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
    {
        description: 'mobile target capability token',
        apply(text) {
            return text.replace(/__DCUF_TARGET_IS_MOBILE__/g, 'true');
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
    const [header, bootstrap, styleBanner, sharedPrelude, sharedSettingsPresenter, mobileListPresenter, mobileListHostAdapter, mobileArticlePresenter, mobileArticleHostAdapter, mobileCommentPresenter, mobileCommentHostAdapter, mobileNativeFormPresenter, mobileNativeFormHostAdapter, mobileWriteDraftHostAdapter, mobileWriteAdHostAdapter, mobileWriteFontPresenter, mobileWriteEditorHostAdapter, mobileHeaderShellPresenter, mobileHeaderShellHostAdapter, mobileGalleryPageHeadPresenter, mobileGalleryPageHeadHostAdapter, mobileHeaderGnbPresenter, mobileHeaderGnbHostAdapter, mobileHeaderRecentVisitPresenter, mobileHeaderRecentVisitHostAdapter, mobileHeaderDrawerPresenter, mobileHeaderDrawerHostAdapter, ...mobileLegacyParts] = await Promise.all([
        readPart(inputForRole('header')),
        readPart(inputForRole('bootstrap')),
        readPart(inputForRole('style-banner')),
        buildSharedRuntimePrelude(),
        readPart(inputForRole('shared-settings-presenter')),
        readPart(inputForRole('mobile-list-presenter')),
        readPart(inputForRole('mobile-list-host-adapter')),
        readPart(inputForRole('mobile-article-presenter')),
        readPart(inputForRole('mobile-article-host-adapter')),
        readPart(inputForRole('mobile-comment-presenter')),
        readPart(inputForRole('mobile-comment-host-adapter')),
        readPart(inputForRole('mobile-native-form-presenter')),
        readPart(inputForRole('mobile-native-form-host-adapter')),
        readPart(inputForRole('mobile-write-draft-host-adapter')),
        readPart(inputForRole('mobile-write-ad-host-adapter')),
        readPart(inputForRole('mobile-write-font-presenter')),
        readPart(inputForRole('mobile-write-editor-host-adapter')),
        readPart(inputForRole('mobile-header-shell-presenter')),
        readPart(inputForRole('mobile-header-shell-host-adapter')),
        readPart(inputForRole('mobile-gallery-page-head-presenter')),
        readPart(inputForRole('mobile-gallery-page-head-host-adapter')),
        readPart(inputForRole('mobile-header-gnb-presenter')),
        readPart(inputForRole('mobile-header-gnb-host-adapter')),
        readPart(inputForRole('mobile-header-recent-visit-presenter')),
        readPart(inputForRole('mobile-header-recent-visit-host-adapter')),
        readPart(inputForRole('mobile-header-drawer-presenter')),
        readPart(inputForRole('mobile-header-drawer-host-adapter')),
        ...MOBILE_LEGACY_PARTS.map(readPart),
    ]);
    const legacyApp = mobileLegacyParts.join('');
    const combined = `${header}\n${bootstrap}${sharedPrelude}${styleBanner}${sharedSettingsPresenter}${mobileListPresenter}${mobileListHostAdapter}${mobileArticlePresenter}${mobileArticleHostAdapter}${mobileCommentPresenter}${mobileCommentHostAdapter}${mobileNativeFormPresenter}${mobileNativeFormHostAdapter}${mobileWriteDraftHostAdapter}${mobileWriteAdHostAdapter}${mobileWriteFontPresenter}${mobileWriteEditorHostAdapter}${mobileHeaderShellPresenter}${mobileHeaderShellHostAdapter}${mobileGalleryPageHeadPresenter}${mobileGalleryPageHeadHostAdapter}${mobileHeaderGnbPresenter}${mobileHeaderGnbHostAdapter}${mobileHeaderRecentVisitPresenter}${mobileHeaderRecentVisitHostAdapter}${mobileHeaderDrawerPresenter}${mobileHeaderDrawerHostAdapter}${legacyApp}`;
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
