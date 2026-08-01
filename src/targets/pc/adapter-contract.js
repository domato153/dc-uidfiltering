import { FILTER_CORE_CONTRACT_VERSION, FILTER_TARGET_KINDS } from '../../shared/filter-contracts.js';
import { STORAGE_KEYS } from '../../shared/storage-schema.js';

/**
 * Phase 6 goal:
 * We are not preserving the current PC userscript implementation.
 * We are defining the seam so the mobile 3.0 filter runtime can later be
 * trimmed down and mounted on a thin PC adapter with minimal local changes.
 */

export const PC_ADAPTER_CONTRACT_VERSION = FILTER_CORE_CONTRACT_VERSION;

export const PC_TARGET_KINDS = Object.freeze(
    FILTER_TARGET_KINDS.filter((kind) => kind !== 'view-post')
);

export const PC_ADAPTER_SELECTORS = Object.freeze({
    LIST_CONTAINER: 'table.gall_list tbody',
    COMMENT_CONTAINER: 'div.comment_box ul.cmt_list',
    EXPOSED_LIST_CONTAINER: 'div.gall_exposure_list > ul',
    POST_ITEM: 'tr.ub-content',
    COMMENT_ITEM: 'li.ub-content, li[id^="comment_li_"], li[id^="reply_li_"]',
    WRITER_INFO: '.ub-writer',
    IP_SPAN: 'span.ip',
    NOTICE_ICON: 'em.icon_notice',
    MAIN_CONTAINER: '#container',
});

export const PC_SHARED_FILTER_BOUNDARY = Object.freeze({
    sharedOwns: [
        'storage schema and legacy migration',
        'ip prefix parsing and foreign/telecom/proxy dataset lookup',
        'guest, telecom, proxy, threshold, ratio, and personal-block decisions',
        'FilterDecision shape and reason fields',
    ],
    adapterOwns: [
        'desktop DOM selectors',
        'element -> FilterSubject extraction',
        'visibility application on desktop rows/comments',
        'desktop-specific observer wiring and refilter scheduling',
        'desktop-only popup/settings rendering if needed',
    ],
});

export const PC_FILTER_EXTRACTION_RECIPE = Object.freeze([
    'Start from the mobile shared modules: shared/ip-data, shared/storage-core, shared/filter-core.',
    'Copy only the runtime glue needed for desktop DOM traversal and visibility updates.',
    'Do not copy mobile list transforms, popup position fixes, dark-mode patches, or comment typography fixes.',
    'Keep storage keys identical so mobile and future PC builds read the same saved filter state.',
    'When filter rules change, update shared first and rewire the PC adapter second.',
]);

export const PC_RUNTIME_BRIDGE_CONTRACT = Object.freeze({
    requiredHooks: [
        'collectTargets(root?)',
        'extractSubject(element)',
        'applyDecision(element, decision)',
        'loadUserStats(uid)',
        'scheduleRefilter(reason?)',
    ],
    requiredState: [
        'settingsSnapshot',
        'blockedUidCache',
        'blockedGuestList',
    ],
    sharedStorageKeys: [
        STORAGE_KEYS.MASTER_DISABLED,
        STORAGE_KEYS.EXCLUDE_RECOMMENDED,
        STORAGE_KEYS.THRESHOLD,
        STORAGE_KEYS.RATIO_ENABLED,
        STORAGE_KEYS.RATIO_MIN,
        STORAGE_KEYS.RATIO_MAX,
        STORAGE_KEYS.BLOCK_GUEST,
        STORAGE_KEYS.BLOCK_PROXY,
        STORAGE_KEYS.BLOCK_TELECOM,
        STORAGE_KEYS.BLOCK_CONFIG,
        STORAGE_KEYS.BLOCKED_UIDS,
        STORAGE_KEYS.BLOCKED_GUESTS,
        STORAGE_KEYS.PERSONAL_BLOCK_LIST,
        STORAGE_KEYS.PERSONAL_BLOCK_ENABLED,
        STORAGE_KEYS.SHORTCUT_KEY,
    ],
});

export function createPcAdapterScaffold() {
    return {
        name: 'pc',
        version: PC_ADAPTER_CONTRACT_VERSION,
        selectors: PC_ADAPTER_SELECTORS,
        targetKinds: PC_TARGET_KINDS,
        collectTargets() {
            throw new Error('PC adapter scaffold: collectTargets() not wired yet.');
        },
        extractSubject() {
            throw new Error('PC adapter scaffold: extractSubject() not wired yet.');
        },
        applyDecision() {
            throw new Error('PC adapter scaffold: applyDecision() not wired yet.');
        },
        loadUserStats() {
            throw new Error('PC adapter scaffold: loadUserStats() not wired yet.');
        },
        scheduleRefilter() {
            throw new Error('PC adapter scaffold: scheduleRefilter() not wired yet.');
        },
    };
}
