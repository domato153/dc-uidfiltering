import { PROXY_MODE } from './ip-data.js';

const modeToTier = (mode) => {
    if (mode === PROXY_MODE.AGGRESSIVE) return 'aggressive';
    if (mode === PROXY_MODE.STRICT) return 'strict';
    return 'off';
};

const collectionHasValue = (collection, value) => {
    if (!value || !collection) return false;
    if (typeof collection.has === 'function') return collection.has(value);
    if (Array.isArray(collection)) return collection.includes(value);
    return false;
};

const uidCollectionHasValue = (collection, value) => {
    if (!value || !collection) return false;
    if (typeof collection.has === 'function') return collection.has(value);
    if (!Array.isArray(collection)) return false;
    return collection.some((item) => (typeof item === 'string' ? item : item?.id) === value);
};

const hasPersonalUidBlock = (subject, personalBlockList) =>
    Boolean(subject?.uid && uidCollectionHasValue(personalBlockList?.uidSet ?? personalBlockList?.uids, subject.uid));

const hasPersonalNicknameBlock = (subject, personalBlockList) =>
    Boolean(subject?.nickname && collectionHasValue(personalBlockList?.nicknameSet ?? personalBlockList?.nicknames, subject.nickname));

const hasPersonalIpBlock = (subject, personalBlockList) =>
    Boolean(subject?.ip && collectionHasValue(personalBlockList?.ipSet ?? personalBlockList?.ips, subject.ip));

export const FILTER_CORE_PHASE = '3.2.2';

export function createEmptyDecision(proxyBlockMode = PROXY_MODE.OFF) {
    return {
        isBlocked: false,
        reasons: [],
        proxyTier: modeToTier(proxyBlockMode),
        matchedBy: [],
    };
}

export function evaluateUserStatsBlock(userData, settings) {
    const decision = { sumBlocked: false, ratioBlocked: false };
    if (!userData || !settings || settings.masterDisabled) return decision;

    const sum = Number(userData.sum) || 0;
    const post = Number(userData.post) || 0;
    const comment = Number(userData.comment) || 0;

    decision.sumBlocked = settings.threshold > 0 && sum > 0 && sum <= settings.threshold;

    if (!settings.ratioEnabled) return decision;

    const useMin = !Number.isNaN(settings.ratioMin) && Number(settings.ratioMin) > 0;
    const useMax = !Number.isNaN(settings.ratioMax) && Number(settings.ratioMax) > 0;
    if (!useMin && !useMax) return decision;

    const replyToPostRatio = post > 0 ? (comment / post) : (comment > 0 ? Infinity : 0);
    const postToReplyRatio = comment > 0 ? (post / comment) : (post > 0 ? Infinity : 0);

    if (useMin && replyToPostRatio >= settings.ratioMin) {
        decision.ratioBlocked = true;
    } else if (useMax && postToReplyRatio >= settings.ratioMax) {
        decision.ratioBlocked = true;
    }

    return decision;
}

export function isPersonalBlockHit(subject, personalBlockList) {
    return hasPersonalUidBlock(subject, personalBlockList)
        || hasPersonalNicknameBlock(subject, personalBlockList)
        || hasPersonalIpBlock(subject, personalBlockList);
}

export function evaluateSyncBlockDecision({ subject, settings, matches = {}, blockedUidEntry = null }) {
    const proxyBlockMode = settings?.proxyBlockMode ?? PROXY_MODE.OFF;
    const decision = {
        ...createEmptyDecision(proxyBlockMode),
        path: 'sync-final',
        hasCustomIpPrefixBlock: Boolean(matches.hasCustomIpPrefixBlock),
        proxyPrefixMatch: Boolean(matches.proxyMatchInfo?.matched),
        proxyMatchTier: matches.proxyMatchInfo?.tier || null,
        telecomPrefixMatch: Boolean(matches.telecomPrefixMatch),
        blockedGuestMatch: Boolean(matches.blockedGuestMatch),
        personallyBlocked: Boolean(matches.personalBlockHit),
        galleryHeadtextBlocked: Boolean(matches.galleryHeadtextBlock),
    };

    if (decision.personallyBlocked) {
        decision.isBlocked = true;
        decision.path = 'personal-block';
        decision.reasons = ['personalBlock'];
        decision.matchedBy = ['personalBlock'];
        return decision;
    }

    if (subject?.hasBlockDisableClass) {
        decision.isBlocked = true;
        decision.path = 'dibs-block';
        decision.reasons = ['block-disable-class'];
        decision.matchedBy = ['block-disable-class'];
        return decision;
    }

    if (subject?.isNotice) {
        decision.path = 'notice-skip';
        decision.reasons = ['notice'];
        decision.matchedBy = ['notice'];
        return decision;
    }

    if (subject?.shouldSkipFiltering) {
        decision.path = 'recommended-skip';
        decision.reasons = ['excludeRecommended-skip'];
        decision.matchedBy = ['excludeRecommended-skip'];
        return decision;
    }

    if (settings?.masterDisabled) {
        decision.path = 'master-disabled';
        decision.reasons = ['masterDisabled'];
        decision.matchedBy = ['masterDisabled'];
        return decision;
    }

    if (decision.galleryHeadtextBlocked) {
        decision.isBlocked = true;
        decision.path = 'gallery-headtext';
        decision.reasons.push('galleryHeadtext');
    }

    if (!decision.isBlocked && subject?.isGuest && settings?.blockGuestEnabled) {
        decision.isBlocked = true;
        decision.reasons.push('guest-toggle');
    }
    if (!decision.isBlocked && decision.hasCustomIpPrefixBlock) {
        decision.isBlocked = true;
        decision.reasons.push('custom-ip-prefix');
    }
    if (!decision.isBlocked && decision.proxyPrefixMatch) {
        decision.isBlocked = true;
        decision.reasons.push(`proxy-prefix-match:${decision.proxyMatchTier}`);
    }
    if (!decision.isBlocked && decision.telecomPrefixMatch) {
        decision.isBlocked = true;
        decision.reasons.push('telecom-prefix-match');
    }
    if (!decision.isBlocked && decision.blockedGuestMatch) {
        decision.isBlocked = true;
        decision.reasons.push('blockedGuests-list-hit');
    }

    if (!decision.isBlocked && blockedUidEntry) {
        const uidCacheDecision = evaluateUserStatsBlock(blockedUidEntry, settings);
        if (uidCacheDecision.sumBlocked || uidCacheDecision.ratioBlocked) {
            decision.isBlocked = true;
            decision.reasons.push(`uid-cache:${uidCacheDecision.sumBlocked ? 'sum' : ''}${uidCacheDecision.ratioBlocked ? 'ratio' : ''}`);
        }
    }

    decision.matchedBy = decision.reasons.slice();
    return decision;
}
