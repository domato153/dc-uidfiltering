/**
 * Shared contracts for the upcoming dual-target filter core.
 * These are documentation-first typedefs so mobile and PC adapters
 * can evolve toward the same input/output boundary without breaking behavior.
 */

/**
 * @typedef {Object} FilterSettings
 * @property {boolean} masterDisabled
 * @property {boolean} excludeRecommended
 * @property {number} threshold
 * @property {boolean} ratioEnabled
 * @property {number} ratioMin
 * @property {number} ratioMax
 * @property {boolean} blockGuest
 * @property {number} proxyBlockMode
 * @property {boolean} telecomBlockEnabled
 * @property {Object<string, unknown>} blockConfig
 * @property {boolean} personalBlockEnabled
 * @property {Array<unknown>} personalBlockList
 */

/**
 * @typedef {Object} FilterSubject
 * @property {string|null} uid
 * @property {string|null} nickname
 * @property {string|null} ip
 * @property {string|null} ipPrefix
 * @property {boolean} isGuest
 * @property {boolean} isNotice
 * @property {boolean} isRecommendedContext
 * @property {boolean} hasBlockDisableClass
 * @property {string|null} galleryKey
 * @property {string|null} headtext
 * @property {boolean} isHeadtextTarget
 * @property {{ postCount?: number, commentCount?: number }|null} userStats
 * @property {'list'|'view-comment'|'view-parent-comment'|'view-reply'|'unknown'} targetKind
 */

/**
 * @typedef {Object} FilterDecision
 * @property {boolean} isBlocked
 * @property {string[]} reasons
 * @property {'off'|'strict'|'aggressive'} proxyTier
 * @property {string[]} matchedBy
 */

/**
 * @typedef {Object} TargetAdapter
 * @property {string} name
 * @property {(root?: ParentNode|Document) => Element[]} collectTargets
 * @property {(element: Element) => FilterSubject|null} extractSubject
 * @property {(element: Element, decision: FilterDecision) => void} applyDecision
 * @property {(reason?: string) => Promise<void>|void} [scheduleRefilter]
 * @property {(uid: string) => Promise<{ sum: number, post: number, comment: number }|null>} [loadUserStats]
 */

/**
 * @typedef {Object} TargetRuntimeBridge
 * @property {FilterSettings|null} settingsSnapshot
 * @property {(uid: string) => Promise<{ sum: number, post: number, comment: number }|null>} loadUserStats
 * @property {(reason?: string) => Promise<void>|void} scheduleRefilter
 * @property {(element: Element, decision: FilterDecision) => void} applyDecision
 */

export const FILTER_TARGET_KINDS = Object.freeze([
    'list',
    'view-post',
    'view-comment',
    'view-parent-comment',
    'view-reply',
    'unknown',
]);

export const FILTER_CORE_CONTRACT_VERSION = '3.0.0-alpha.1';
