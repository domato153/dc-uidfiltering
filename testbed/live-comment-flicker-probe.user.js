// ==UserScript==
// @name         DCUF Comment Flicker Probe
// @namespace    https://github.com/domato153/dc-uidfiltering
// @version      0.1.1
// @description  Records live DCInside comment visibility and DOM replacement timing for DCUF diagnostics.
// @match        https://gall.dcinside.com/*
// @noframes
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
    'use strict';
    if (window.DCUFCommentFlickerProbe?.version) return;

    const VERSION = '0.1.1';
    const DEFAULT_CAPTURE_MS = 20000;
    const MAX_TIMELINE_EVENTS = 1200;
    const MAX_MUTATION_EVENTS = 600;
    const WRITER_SELECTOR = [
        'div.comment_box ul.cmt_list .ub-writer',
        'div.comment_box ul.cmt_list .gall_writer[data-uid]',
        'div.comment_box ul.cmt_list [data-nick][data-ip]'
    ].join(',');
    const COMMENT_SCOPE_SELECTOR = 'div.comment_box ul.cmt_list, div.comment_box ul.reply_list';
    const COMMENT_ITEM_SELECTOR = 'li.ub-content, li[id^="comment_li_"], li[id^="reply_li_"], li[id^="img_comment_li_"], li[id^="mg_comment_li_"]';
    const WATCHED_ATTRIBUTES = [
        'style',
        'class',
        'data-uid',
        'data-nick',
        'data-ip',
        'data-dcuf-personal-blocked',
        'data-dcuf-comment-blocked',
        'data-dcuf-comment-shell-blocked',
        'data-dcuf-boot-state'
    ];

    const startedAt = performance.now();
    const nodeIds = new WeakMap();
    const nodeStates = new Map();
    const identityStats = new Map();
    const timeline = [];
    const mutations = [];
    let nextNodeId = 1;
    let active = false;
    let captureDeadline = 0;
    let captureTimer = 0;
    let loopToken = 0;
    let observer = null;
    let lastBootState = '';
    let sampleCount = 0;

    const elapsed = () => Math.round((performance.now() - startedAt) * 1000) / 1000;
    const pushBounded = (list, entry, limit) => {
        list.push(entry);
        if (list.length > limit) list.splice(0, list.length - limit);
    };
    const getNodeId = (element) => {
        if (!nodeIds.has(element)) nodeIds.set(element, nextNodeId++);
        return nodeIds.get(element);
    };
    const normalizeText = (value) => String(value || '').trim().replace(/\s+/g, ' ').slice(0, 120);
    const getIdentity = (writer) => ({
        uid: writer?.getAttribute?.('data-uid') || '',
        nick: writer?.getAttribute?.('data-nick') || normalizeText(writer?.textContent),
        ip: writer?.getAttribute?.('data-ip') || ''
    });
    const identityKey = ({ uid, nick, ip }) => uid ? `uid:${uid}` : ip ? `ip:${ip}` : `nick:${nick}`;
    const getCommentItem = (element) => element?.closest?.(COMMENT_ITEM_SELECTOR) || null;
    const isPaintVisible = (element) => {
        if (!(element instanceof HTMLElement) || !element.isConnected || !document.body) return false;
        const style = getComputedStyle(element);
        const bodyStyle = getComputedStyle(document.body);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none'
            && style.visibility !== 'hidden'
            && Number(style.opacity) > 0
            && bodyStyle.display !== 'none'
            && bodyStyle.visibility !== 'hidden'
            && Number(bodyStyle.opacity) > 0
            && rect.width > 0
            && rect.height > 0;
    };
    const describeWriter = (writer) => {
        const item = getCommentItem(writer);
        const identity = getIdentity(writer);
        return {
            nodeId: getNodeId(writer),
            itemNodeId: item instanceof Element ? getNodeId(item) : 0,
            itemId: item?.id || '',
            dataNo: item?.getAttribute?.('data-no') || '',
            ...identity,
            key: identityKey(identity),
            visible: isPaintVisible(writer),
            itemInlineDisplay: item instanceof HTMLElement ? item.style.display || '' : '',
            itemComputedDisplay: item instanceof HTMLElement ? getComputedStyle(item).display : '',
            personalBlockedAttr: item?.getAttribute?.('data-dcuf-personal-blocked') || '',
            commentBlockedAttr: item?.getAttribute?.('data-dcuf-comment-blocked') || '',
            shellBlockedAttr: item?.getAttribute?.('data-dcuf-comment-shell-blocked') || '',
            bootState: document.documentElement?.getAttribute('data-dcuf-boot-state') || '',
            readyClass: document.documentElement?.classList.contains('script-ui-ready') || false
        };
    };
    const updateIdentityStats = (state, transition) => {
        const current = identityStats.get(state.key) || {
            key: state.key,
            uid: state.uid,
            nick: state.nick,
            ip: state.ip,
            nodeIds: new Set(),
            visibleSamples: 0,
            hiddenSamples: 0,
            visibleToHidden: 0,
            firstSeenAt: elapsed(),
            lastSeenAt: elapsed(),
            everPersonalBlocked: false
        };
        current.nodeIds.add(state.nodeId);
        current.lastSeenAt = elapsed();
        current.visibleSamples += state.visible ? 1 : 0;
        current.hiddenSamples += state.visible ? 0 : 1;
        current.visibleToHidden += transition === 'visible-to-hidden' ? 1 : 0;
        current.everPersonalBlocked ||= state.personalBlockedAttr === '1';
        identityStats.set(state.key, current);
    };
    const sample = (phase = 'post-paint-task') => {
        sampleCount += 1;
        const now = elapsed();
        const bootState = document.documentElement?.getAttribute('data-dcuf-boot-state') || '';
        if (bootState !== lastBootState) {
            pushBounded(timeline, { type: 'boot-state', at: now, from: lastBootState, to: bootState }, MAX_TIMELINE_EVENTS);
            lastBootState = bootState;
        }

        document.querySelectorAll(WRITER_SELECTOR).forEach((writer) => {
            if (!(writer instanceof HTMLElement) || !writer.closest(COMMENT_SCOPE_SELECTOR)) return;
            const state = describeWriter(writer);
            const previous = nodeStates.get(state.nodeId);
            let transition = 'unchanged';
            if (!previous) transition = state.visible ? 'first-seen-visible' : 'first-seen-hidden';
            else if (previous.visible && !state.visible) transition = 'visible-to-hidden';
            else if (!previous.visible && state.visible) transition = 'hidden-to-visible';

            if (transition !== 'unchanged'
                || previous?.personalBlockedAttr !== state.personalBlockedAttr
                || previous?.itemNodeId !== state.itemNodeId) {
                const event = { type: 'visibility', phase, at: now, transition, ...state };
                pushBounded(timeline, event, MAX_TIMELINE_EVENTS);
                if (transition === 'visible-to-hidden') {
                    console.warn('[DCUF flicker probe] visible -> hidden', event);
                }
            }
            updateIdentityStats(state, transition);
            nodeStates.set(state.nodeId, state);
        });
    };
    const scheduleLoop = (token) => {
        if (!active || token !== loopToken) return;
        requestAnimationFrame(() => {
            // A zero-delay task scheduled from rAF normally runs after that frame's paint.
            // This avoids reporting a false flicker merely because the probe's rAF callback
            // ran before DCUF's callback in the same frame.
            setTimeout(() => {
                if (!active || token !== loopToken) return;
                sample();
                if (performance.now() < captureDeadline) scheduleLoop(token);
                else stop('deadline');
            }, 0);
        });
    };
    const isRelevantNode = (node) => {
        if (!(node instanceof Element)) return false;
        return Boolean(node.matches?.(`${COMMENT_SCOPE_SELECTOR}, ${COMMENT_ITEM_SELECTOR}, ${WRITER_SELECTOR}`)
            || node.closest?.(COMMENT_SCOPE_SELECTOR)
            || node.querySelector?.(`${COMMENT_SCOPE_SELECTOR}, ${COMMENT_ITEM_SELECTOR}, ${WRITER_SELECTOR}`));
    };
    const identitiesWithin = (node) => {
        if (!(node instanceof Element)) return [];
        const writers = [];
        if (node.matches?.(WRITER_SELECTOR)) writers.push(node);
        node.querySelectorAll?.(WRITER_SELECTOR).forEach((writer) => writers.push(writer));
        return writers.slice(0, 30).map(getIdentity);
    };
    const observe = () => {
        if (observer || !document.documentElement) return;
        observer = new MutationObserver((records) => {
            records.forEach((record) => {
                if (record.type === 'childList') {
                    const added = Array.from(record.addedNodes).filter(isRelevantNode);
                    const removed = Array.from(record.removedNodes).filter(isRelevantNode);
                    if (added.length === 0 && removed.length === 0 && !isRelevantNode(record.target)) return;
                    pushBounded(mutations, {
                        type: 'childList',
                        at: elapsed(),
                        target: record.target instanceof Element ? `${record.target.tagName.toLowerCase()}#${record.target.id || ''}.${record.target.className || ''}`.slice(0, 180) : '',
                        addedCount: record.addedNodes.length,
                        removedCount: record.removedNodes.length,
                        addedIdentities: added.flatMap(identitiesWithin).slice(0, 30),
                        removedIdentities: removed.flatMap(identitiesWithin).slice(0, 30)
                    }, MAX_MUTATION_EVENTS);
                    return;
                }
                if (record.type === 'attributes'
                    && (record.attributeName === 'data-dcuf-boot-state' || isRelevantNode(record.target))) {
                    const item = getCommentItem(record.target);
                    const writer = record.target.matches?.(WRITER_SELECTOR)
                        ? record.target
                        : item?.querySelector?.(WRITER_SELECTOR);
                    pushBounded(mutations, {
                        type: 'attribute',
                        at: elapsed(),
                        attribute: record.attributeName,
                        oldValue: record.oldValue || '',
                        newValue: record.target.getAttribute?.(record.attributeName) || '',
                        itemId: item?.id || '',
                        identity: writer ? getIdentity(writer) : null
                    }, MAX_MUTATION_EVENTS);
                }
            });
        });
        observer.observe(document.documentElement, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeOldValue: true,
            attributeFilter: WATCHED_ATTRIBUTES
        });
    };
    const start = (durationMs = DEFAULT_CAPTURE_MS) => {
        const normalizedDuration = Math.max(1000, Math.min(120000, Number(durationMs) || DEFAULT_CAPTURE_MS));
        observe();
        active = true;
        loopToken += 1;
        captureDeadline = performance.now() + normalizedDuration;
        if (captureTimer) clearTimeout(captureTimer);
        captureTimer = setTimeout(() => stop('timer'), normalizedDuration + 1000);
        scheduleLoop(loopToken);
        pushBounded(timeline, { type: 'capture-start', at: elapsed(), durationMs: normalizedDuration }, MAX_TIMELINE_EVENTS);
        return status();
    };
    const stop = (reason = 'manual') => {
        if (!active) return status();
        active = false;
        loopToken += 1;
        if (captureTimer) clearTimeout(captureTimer);
        captureTimer = 0;
        sample('capture-stop');
        pushBounded(timeline, { type: 'capture-stop', at: elapsed(), reason }, MAX_TIMELINE_EVENTS);
        return status();
    };
    const status = () => ({
        version: VERSION,
        active,
        sampleCount,
        elapsedMs: elapsed(),
        timelineEvents: timeline.length,
        mutationEvents: mutations.length,
        trackedIdentities: identityStats.size,
        bootState: document.documentElement?.getAttribute('data-dcuf-boot-state') || '',
        readyClass: document.documentElement?.classList.contains('script-ui-ready') || false
    });
    const matchesQuery = (stats, query) => {
        if (!query) return true;
        const needle = String(query).trim().toLowerCase();
        return [stats.uid, stats.nick, stats.ip, stats.key].some((value) => String(value || '').toLowerCase().includes(needle));
    };
    const serializeStats = (stats) => ({
        ...stats,
        nodeIds: Array.from(stats.nodeIds)
    });
    const getBridgeState = (targetStats) => {
        const filterModule = window.__dcufFilterModule;
        const runtime = window.__dcufRuntimeCoordinator;
        const snapshot = filterModule?.getBootSnapshot?.() || null;
        const personalList = snapshot?.personalBlockList || {};
        const uidSet = new Set((personalList.uids || []).map((entry) => typeof entry === 'string' ? entry : entry?.id).filter(Boolean));
        const nickSet = new Set((personalList.nicknames || []).filter(Boolean));
        const ipSet = new Set((personalList.ips || []).filter(Boolean));
        const targetMatches = targetStats.map((stats) => ({
            uid: stats.uid,
            nick: stats.nick,
            ip: stats.ip,
            personalUidMatch: Boolean(stats.uid && uidSet.has(stats.uid)),
            personalNickMatch: Boolean(stats.nick && nickSet.has(stats.nick)),
            personalIpMatch: Boolean(stats.ip && ipSet.has(stats.ip)),
            cachedStatsMatch: Boolean(stats.uid && filterModule?.BLOCKED_UIDS_CACHE?.[stats.uid])
        }));
        const diagnostics = window.__dcufDiagnostics?.snapshot?.() || null;
        return {
            bridgeVisible: Boolean(filterModule || runtime),
            filterModuleVisible: Boolean(filterModule),
            runtimeVisible: Boolean(runtime),
            snapshotVisible: Boolean(snapshot),
            personalBlockEnabled: snapshot?.personalBlockEnabled ?? null,
            filterInitState: filterModule?._initState || '',
            immediateSubscriberCount: runtime?._immediateMutationSubscribers?.size ?? null,
            ordinarySubscriberCount: runtime?._mutationSubscribers?.size ?? null,
            diagnostics: diagnostics ? { counters: diagnostics.counters, gauges: diagnostics.gauges } : null,
            targetMatches
        };
    };
    const report = (query = '') => {
        sample('manual-report');
        const allStats = Array.from(identityStats.values()).map(serializeStats);
        const targets = allStats.filter((stats) => matchesQuery(stats, query));
        const targetKeys = new Set(targets.map((stats) => stats.key));
        const suspects = allStats.filter((stats) => stats.visibleToHidden > 0 || stats.everPersonalBlocked);
        const result = {
            probe: 'dcuf-comment-flicker',
            version: VERSION,
            capturedAt: new Date().toISOString(),
            url: location.href,
            userAgent: navigator.userAgent,
            viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
            status: status(),
            query: String(query || ''),
            targets,
            suspects,
            targetTimeline: timeline.filter((event) => event.type !== 'visibility' || targetKeys.size === 0 || targetKeys.has(event.key)),
            mutations: mutations.slice(),
            bridge: getBridgeState(targets)
        };
        console.log('[DCUF flicker probe report]', result);
        return result;
    };
    const download = (query = '', filename = '') => {
        const result = report(query);
        const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename || `dcuf-comment-flicker-${Date.now()}.json`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return result;
    };

    window.DCUFCommentFlickerProbe = Object.freeze({
        version: VERSION,
        start,
        stop,
        status,
        report,
        download
    });
    window.addEventListener('dcuf:boot-ready', () => {
        pushBounded(timeline, { type: 'boot-ready-event', at: elapsed() }, MAX_TIMELINE_EVENTS);
    });
    window.addEventListener('dcuf:boot-degraded', (event) => {
        pushBounded(timeline, { type: 'boot-degraded-event', at: elapsed(), detail: event.detail || null }, MAX_TIMELINE_EVENTS);
    });
    document.addEventListener('click', (event) => {
        const button = event.target?.closest?.('button.btn_cmt_refresh');
        if (!button) return;
        pushBounded(timeline, {
            type: 'comment-refresh-click',
            at: elapsed(),
            active,
            dataNo: button.getAttribute('data-no') || '',
            dataSort: button.getAttribute('data-sort') || ''
        }, MAX_TIMELINE_EVENTS);
    }, true);

    observe();
    start();
    console.info('[DCUF flicker probe] recording for 20 seconds. After reproduction run DCUFCommentFlickerProbe.download("UID or nickname").');
})();
