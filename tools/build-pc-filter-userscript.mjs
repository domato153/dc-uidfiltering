import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const VERSION = '1.9.3-beta';
const OUTPUT_NAME = `dcinside_user_filter_v${VERSION}.user.js`;

const PC_PARTS = [
    'src/targets/pc/filter-style.js',
    'src/targets/pc/filter-entry.js',
];

const SHARED_FILTER_UI_STYLE_RANGES = [
    ['/* DCUF_SHARED_FILTER_UI_START */', '/* DCUF_SHARED_FILTER_UI_END */'],
    ['/* DCUF_SHARED_FILTER_UI_DARK_START */', '/* DCUF_SHARED_FILTER_UI_DARK_END */'],
];

const REQUIRED_SHARED_FILTER_UI_SELECTORS = [
    '#dcinside-filter-setting',
    '#dcinside-shortcut-modal',
    '#dc-personal-block-controls',
    '#dc-personal-block-fab',
    '#dc-personal-block-drawer',
    '#dc-personal-block-size-panel',
    '#dc-selection-popup',
    '#dc-block-management-panel',
    '#dc-backup-popup',
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
];

function replaceOrThrow(source, pattern, replacement, label) {
    const next = source.replace(pattern, replacement);
    if (next === source) {
        throw new Error(`PC build transform failed: ${label}`);
    }
    return next;
}

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
    const schemaSource = stripEsmSyntax(await readPart('src/shared/storage-schema.js'));
    const ipSource = stripEsmSyntax(await readPart('src/shared/ip-data.js'));
    const storageCoreSource = stripEsmSyntax(await readPart('src/shared/storage-core.js'));
    const filterCoreSource = stripEsmSyntax(await readPart('src/shared/filter-core.js'));

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

function extractFilterModuleSource(source) {
    const startMarker = 'const FilterModule = {';
    const endMarker = 'window.__dcufFilterModule = FilterModule;';
    const startIndex = source.indexOf(startMarker);
    const endIndex = source.indexOf(endMarker);
    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        throw new Error('Failed to extract FilterModule block from mobile filter-module.js');
    }
    return `${source.slice(startIndex, endIndex + endMarker.length)}\n`;
}

function extractSharedFilterUiStyle(source) {
    const cssParts = SHARED_FILTER_UI_STYLE_RANGES.map(([startMarker, endMarker]) => {
        const startIndex = source.indexOf(startMarker);
        const endIndex = source.indexOf(endMarker, startIndex + startMarker.length);
        if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
            throw new Error(`Failed to extract shared filter UI style range: ${startMarker}`);
        }
        return source.slice(startIndex + startMarker.length, endIndex).trim();
    });
    const css = cssParts.join('\n\n');

    REQUIRED_SHARED_FILTER_UI_SELECTORS.forEach((selector) => {
        if (!css.includes(selector)) {
            throw new Error(`Shared filter UI style is missing required selector: ${selector}`);
        }
    });
    FORBIDDEN_MOBILE_UI_TOKENS.forEach((token) => {
        if (css.includes(token)) {
            throw new Error(`Mobile-only UI token leaked into shared filter UI style: ${token}`);
        }
    });
    if (css.includes('`') || css.includes('${')) {
        throw new Error('Shared filter UI style cannot contain template literal syntax');
    }

    return `    // Extracted verbatim from the mobile-owned filter UI style rail.\n    GM_addStyle(\`\n${css}\n    \`);\n`;
}

function transformFilterModuleForSharedPort(source) {
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
        /PROXY_MODE:\s*\{[\s\S]*?KR_IP_RANGES:\s*\{[\s\S]*?\},\n\s*isMobile:/,
        [
            'PROXY_MODE: DCUF_SHARED_IP.PROXY_MODE,',
            '        PROXY_STRICT_PREFIXES: DCUF_SHARED_IP.PROXY_STRICT_PREFIXES,',
            '        PROXY_AGGRESSIVE_EXTRA_PREFIXES: DCUF_SHARED_IP.PROXY_AGGRESSIVE_EXTRA_PREFIXES,',
            '        KR_IP_RANGES: DCUF_SHARED_IP.KR_IP_RANGES,',
            '        isMobile:',
        ].join('\n'),
        'shared proxy and KR range block'
    );

    return text;
}

function applyReplacements(source) {
    return replacements.reduce((acc, step) => step.apply(acc), source);
}

async function main() {
    const [header, bootstrap, sharedPrelude, rawFilterModule, rawPersonalBlockModule, ...pcParts] = await Promise.all([
        readPart('src/meta/pc-filter-userscript-header.txt'),
        readPart('src/runtime/bootstrap.js'),
        buildSharedRuntimePrelude(),
        readPart('src/targets/mobile/filter-module.js'),
        readPart('src/targets/mobile/personal-block-module.js'),
        ...PC_PARTS.map(readPart),
    ]);

    const teardown = await readPart('src/runtime/teardown.js');
    const extractedFilterModule = extractFilterModuleSource(rawFilterModule);
    const sharedFilterUiStyle = extractSharedFilterUiStyle(rawFilterModule);
    const transformedFilterModule = transformFilterModuleForSharedPort(extractedFilterModule);
    const [filterStyle, filterEntry] = pcParts;
    const combined = `${header}\n${bootstrap}${sharedPrelude}${filterStyle}${sharedFilterUiStyle}${transformedFilterModule}${rawPersonalBlockModule}${filterEntry}${teardown}`;
    const built = applyReplacements(combined).replace(/\r?\n/g, '\r\n');

    const distDir = path.join(rootDir, 'dist');
    await mkdir(distDir, { recursive: true });

    const distPath = path.join(distDir, OUTPUT_NAME);
    const rootCopyPath = path.join(rootDir, OUTPUT_NAME);
    const bomText = `\uFEFF${built}`;

    await writeFile(distPath, bomText, 'utf8');
    await writeFile(rootCopyPath, bomText, 'utf8');

    process.stdout.write([
        `Built ${OUTPUT_NAME}`,
        ' - source: latest mobile FilterModule + shared core + PC adapter entry',
        ` - dist: ${distPath}`,
        ` - root: ${rootCopyPath}`,
    ].join('\n'));
}

main().catch((error) => {
    console.error('[build-pc-filter-userscript] failed:', error);
    process.exitCode = 1;
});
