import { ETC_CONSTANTS, STORAGE_KEYS } from './storage-schema.js';
import { PROXY_MODE } from './ip-data.js';

const toInteger = (value, fallback) => {
    const parsed = Number.parseInt(String(value), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const toFloat = (value, fallback) => {
    const parsed = Number.parseFloat(String(value));
    return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value, fallback = false) => {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return fallback;
};

export const STORAGE_SCHEMA_VERSION = '3.0.0';

export function normalizeHeadtext(value) {
    return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

export function normalizeGalleryHeadtextBlocks(rawValue) {
    if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) return {};
    const normalized = {};
    Object.entries(rawValue).forEach(([rawKey, rawItems]) => {
        const key = typeof rawKey === 'string' ? rawKey.trim() : '';
        if (!/^(?:board|mgallery|mini):[^:\s]+$/.test(key) || !Array.isArray(rawItems)) return;
        const items = Array.from(new Set(rawItems.map(normalizeHeadtext).filter(Boolean))).slice(0, 100);
        if (items.length > 0) normalized[key] = items;
    });
    return normalized;
}

export function normalizeProxyBlockModeValue(rawValue) {
    if (rawValue === true || rawValue === 'true') return PROXY_MODE.STRICT;
    if (rawValue === false || rawValue === 'false' || rawValue == null) return PROXY_MODE.OFF;

    const numeric = toInteger(rawValue, PROXY_MODE.OFF);
    if (numeric === PROXY_MODE.AGGRESSIVE) return PROXY_MODE.AGGRESSIVE;
    if (numeric === PROXY_MODE.STRICT) return PROXY_MODE.STRICT;
    return PROXY_MODE.OFF;
}

export function normalizeIpPrefix(value) {
    if (typeof value !== 'string') return null;
    const parts = value.trim().split('.');
    if (parts.length !== 2) return null;

    const normalizedParts = parts.map((part) => {
        if (!/^\d{1,3}$/.test(part)) return null;
        const numeric = Number(part);
        return numeric >= 0 && numeric <= 255 ? String(numeric) : null;
    });

    return normalizedParts.includes(null) ? null : normalizedParts.join('.');
}

export function stripLegacyMobileIpMarker(rawIpValue) {
    if (typeof rawIpValue !== 'string' || !rawIpValue.trim()) return '';

    const marker = ETC_CONSTANTS.MOBILE_IP_MARKER;
    const markerToken = `||${marker}`;
    const prefixedMarkerToken = `${marker}||`;

    if (rawIpValue.startsWith(prefixedMarkerToken)) return '';

    const markerIndex = rawIpValue.indexOf(markerToken);
    if (markerIndex >= 0) return rawIpValue.slice(0, markerIndex);

    return rawIpValue;
}

export function parseIpPrefixList(value, marker = ETC_CONSTANTS.MOBILE_IP_MARKER) {
    if (typeof value !== 'string' || !value) return [];

    let source = value;
    const markerIndex = source.indexOf(marker);
    if (markerIndex !== -1) {
        source = source.slice(0, markerIndex);
        source = source.replace(/\|\|$/, '');
    }

    const seen = new Set();
    return source.split('||').reduce((prefixes, token) => {
        const normalized = normalizeIpPrefix(token);
        if (!normalized || seen.has(normalized)) return prefixes;
        seen.add(normalized);
        prefixes.push(normalized);
        return prefixes;
    }, []);
}

export function extractIpPrefix(ip) {
    if (typeof ip !== 'string' || !ip) return null;
    const match = ip.trim().match(/^(\d{1,3}\.\d{1,3})(?=\.|$)/);
    return match ? normalizeIpPrefix(match[1]) : null;
}

export function normalizeBlockConfigIp(rawIpValue, marker = ETC_CONSTANTS.MOBILE_IP_MARKER) {
    return parseIpPrefixList(stripLegacyMobileIpMarker(String(rawIpValue || '')).replace(new RegExp(marker, 'g'), ''), marker).join('||');
}

export function isSuspiciousLegacyManagedIpList(rawIpValue, marker = ETC_CONSTANTS.MOBILE_IP_MARKER, threshold = 100) {
    if (typeof rawIpValue !== 'string' || !rawIpValue) return false;
    if (rawIpValue.includes(marker)) return false;
    return parseIpPrefixList(rawIpValue, marker).length >= threshold;
}

export function formatShortcutKeys(keySet) {
    if (!keySet || keySet.size === 0) return '';

    const priority = ['Control', 'Meta', 'Alt', 'Shift', 'CapsLock', 'Tab'];
    const keys = Array.from(keySet);

    const modifiers = keys
        .filter((key) => priority.includes(key))
        .sort((a, b) => priority.indexOf(a) - priority.indexOf(b));

    const others = keys
        .filter((key) => !priority.includes(key) && key.length === 1)
        .sort();

    return [...modifiers, ...others].map((key) => key === 'Control' ? 'Ctrl' : key).join('+');
}

export function parseShortcutString(shortcutString) {
    const result = { ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, key: '' };
    if (!shortcutString) return result;

    const parts = String(shortcutString).split('+');
    const nonModifiers = [];

    parts.forEach((part) => {
        switch (part.toLowerCase()) {
            case 'ctrl':
            case 'control':
                result.ctrlKey = true;
                break;
            case 'meta':
            case 'win':
                result.metaKey = true;
                break;
            case 'alt':
                result.altKey = true;
                break;
            case 'shift':
                result.shiftKey = true;
                break;
            default:
                nonModifiers.push(part);
                break;
        }
    });

    if (nonModifiers.length > 0) {
        result.key = String(nonModifiers[0] || '').toUpperCase();
    }

    return result;
}

export function createDefaultFilterSettings() {
    return {
        masterDisabled: false,
        excludeRecommended: true,
        threshold: 200,
        ratioEnabled: true,
        ratioMin: 99,
        ratioMax: 1,
        blockGuest: false,
        proxyBlockMode: PROXY_MODE.OFF,
        telecomBlockEnabled: false,
        personalBlockEnabled: true,
        blockConfig: { uid: '', nick: '', ip: '' },
        personalBlockList: { uids: [], nicknames: [], ips: [] },
    };
}

export function normalizeStoredFilterSettings(rawValues = {}) {
    const defaults = createDefaultFilterSettings();
    const blockConfig = rawValues[STORAGE_KEYS.BLOCK_CONFIG] || defaults.blockConfig;
    const normalizedBlockConfig = {
        ...defaults.blockConfig,
        ...(blockConfig || {}),
        ip: normalizeBlockConfigIp((blockConfig && blockConfig.ip) || defaults.blockConfig.ip),
    };

    return {
        masterDisabled: toBoolean(rawValues[STORAGE_KEYS.MASTER_DISABLED], defaults.masterDisabled),
        excludeRecommended: toBoolean(rawValues[STORAGE_KEYS.EXCLUDE_RECOMMENDED], defaults.excludeRecommended),
        threshold: toInteger(rawValues[STORAGE_KEYS.THRESHOLD], defaults.threshold),
        ratioEnabled: toBoolean(rawValues[STORAGE_KEYS.RATIO_ENABLED], defaults.ratioEnabled),
        ratioMin: toFloat(rawValues[STORAGE_KEYS.RATIO_MIN], defaults.ratioMin),
        ratioMax: toFloat(rawValues[STORAGE_KEYS.RATIO_MAX], defaults.ratioMax),
        blockGuest: toBoolean(rawValues[STORAGE_KEYS.BLOCK_GUEST], defaults.blockGuest),
        proxyBlockMode: normalizeProxyBlockModeValue(rawValues[STORAGE_KEYS.BLOCK_PROXY]),
        telecomBlockEnabled: toBoolean(rawValues[STORAGE_KEYS.BLOCK_TELECOM], defaults.telecomBlockEnabled),
        personalBlockEnabled: toBoolean(rawValues[STORAGE_KEYS.PERSONAL_BLOCK_ENABLED], defaults.personalBlockEnabled),
        blockConfig: normalizedBlockConfig,
        personalBlockList: rawValues[STORAGE_KEYS.PERSONAL_BLOCK_LIST]
            && typeof rawValues[STORAGE_KEYS.PERSONAL_BLOCK_LIST] === 'object'
            && !Array.isArray(rawValues[STORAGE_KEYS.PERSONAL_BLOCK_LIST])
            ? rawValues[STORAGE_KEYS.PERSONAL_BLOCK_LIST]
            : defaults.personalBlockList,
    };
}
