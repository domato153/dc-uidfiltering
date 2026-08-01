// ==UserScript==
// @name         DCUF Page Load Profiler
// @namespace    http://tampermonkey.net/
// @version      0.4.2
// @description  One-click DCUF list/view loading, original exposure, and comment-refresh live audit
// @match        https://gall.dcinside.com/board/*
// @match        https://gall.dcinside.com/mgallery/board/*
// @match        https://gall.dcinside.com/mini/board/*
// @noframes
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const VERSION = '0.4.2';
    const pageType = (location.pathname.match(/\/board\/(view|lists)(?:\/|$)/) || [])[1] || '';
    if (!pageType) return;
    if (window.__DCUF_GUIDED_LIVE_AUDIT_ACTIVE__) return;
    window.__DCUF_GUIDED_LIVE_AUDIT_ACTIVE__ = true;

    const startedAt = performance.now();
    const timeline = [];
    const observedResources = [];
    const longTasks = [];
    const paints = [];
    const hookedBootEvents = [];
    const seen = new Set();
    const hookedBootControllers = new WeakSet();
    const originalListExposureFrames = [];
    let lastRevealSignature = '';
    let reportTimer = 0;
    let finalReportPrinted = false;
    let guidedAuditRunning = false;

    const round = (value) => Number.isFinite(value) ? Math.round(value * 10) / 10 : null;
    const safeUrl = (value) => {
        try {
            const url = new URL(value, location.href);
            return `${url.origin}${url.pathname}`;
        } catch (_) {
            return String(value || '');
        }
    };
    const add = (label, detail = null, at = performance.now()) => {
        timeline.push({ label, at: round(at), detail });
    };
    const once = (label, detail = null, at = performance.now()) => {
        if (seen.has(label)) return false;
        seen.add(label);
        add(label, detail, at);
        return true;
    };

    const hookBootController = () => {
        const controller = window.__dcufBootController;
        if (!controller || hookedBootControllers.has(controller)) return false;
        hookedBootControllers.add(controller);
        const originalNote = controller.note;
        if (typeof originalNote === 'function') {
            controller.note = function (label, detail = null) {
                const event = { label, at: round(performance.now()), detail };
                hookedBootEvents.push(event);
                add(`dcuf-note:${label}`, detail, event.at);
                return originalNote.apply(this, arguments);
            };
        }
        once('dcuf-controller-hooked');
        return true;
    };

    once('profiler-start', { readyState: document.readyState }, startedAt);

    const collectNavigation = () => {
        const nav = performance.getEntriesByType('navigation')[0];
        if (!nav) return null;
        return {
            redirect: round(nav.redirectEnd - nav.redirectStart),
            dns: round(nav.domainLookupEnd - nav.domainLookupStart),
            connect: round(nav.connectEnd - nav.connectStart),
            requestToFirstByte: round(nav.responseStart - nav.requestStart),
            responseDownload: round(nav.responseEnd - nav.responseStart),
            responseEnd: round(nav.responseEnd),
            domInteractive: round(nav.domInteractive),
            domContentLoaded: round(nav.domContentLoadedEventEnd),
            loadEvent: round(nav.loadEventEnd),
            transferKB: round((nav.transferSize || 0) / 1024),
            decodedKB: round((nav.decodedBodySize || 0) / 1024)
        };
    };

    const checkMilestones = () => {
        const html = document.documentElement;
        const body = document.body;
        if (html) once('document-element-created');
        if (body) once('body-created');

        const view = document.querySelector('.view_content_wrap');
        const article = document.querySelector('.gallview_contents, .writing_view_box');
        const comments = document.querySelector('#focus_cmt, .view_comment, div[id^="comment_wrap_"]');
        const commentBox = document.querySelector('#focus_cmt .comment_box, .view_comment .comment_box, div[id^="comment_wrap_"] .comment_box');
        if (view) once('view-wrap-in-dom');
        if (article) {
            const detail = {
                textLength: (article.textContent || '').trim().length,
                images: article.querySelectorAll('img').length,
                videos: article.querySelectorAll('video').length,
                iframes: article.querySelectorAll('iframe').length
            };
            once('article-content-in-dom', {
                ...detail
            });
            if (detail.textLength > 0 || detail.images > 0 || detail.videos > 0 || detail.iframes > 0) {
                once('article-content-populated', detail);
            }
        }
        if (comments) once('comment-surface-in-dom');
        if (commentBox) once('comment-box-in-dom');

        const listWraps = Array.from(document.querySelectorAll('.gall_listwrap, .list_wrap'))
            .filter((wrap) => wrap.querySelector('table.gall_list'));
        if (listWraps.length > 0) once('list-wrap-in-dom', { count: listWraps.length });
        const originalRows = listWraps.reduce((count, wrap) => count + wrap.querySelectorAll('table.gall_list tr.ub-content').length, 0);
        if (originalRows > 0) once('original-list-populated', { rows: originalRows });
        const customLists = listWraps.reduce((count, wrap) => count + wrap.querySelectorAll('.custom-mobile-list').length, 0);
        const customItems = listWraps.reduce((count, wrap) => count + wrap.querySelectorAll('.custom-mobile-list .custom-post-item').length, 0);
        if (customLists > 0) once('custom-list-created', { lists: customLists });
        if (customItems > 0) once('custom-list-populated', { lists: customLists, items: customItems });
        if (listWraps.some((wrap) => wrap.querySelector('table.gall_list')?.style.getPropertyValue('display') === 'none')) {
            once('original-list-committed-hidden');
        }

        const state = html?.getAttribute('data-dcuf-boot-state') || null;
        if (state) once(`dcuf-state:${state}`);
        if (html?.getAttribute('data-dcuf-filter-ready') === 'true') once('dcuf-filter-ready');
        if (html?.classList.contains('script-ui-ready')) once('dcuf-ready-class');
        if (document.getElementById('dcuf-boot-overlay')) once('dcuf-overlay-created');
        if (window.__dcufBootController) once('dcuf-controller-available', {
            state: window.__dcufBootController.state,
            pageType: window.__dcufBootController.pageType
        });
        hookBootController();

        const reveal = window.__dcufRevealDebug?.initial;
        if (reveal) {
            const signature = JSON.stringify([reveal.ready, reveal.reason, reveal.detail, reveal.fallback]);
            if (signature !== lastRevealSignature) {
                lastRevealSignature = signature;
                add(`dcuf-reveal:${reveal.reason}`, reveal);
            }
        }
    };

    const enableDcufDiagnostics = () => {
        if (typeof window.__dcufDiagnostics?.enable === 'function') {
            window.__dcufDiagnostics.enable();
            once('dcuf-diagnostics-enabled');
            return true;
        }
        return false;
    };

    const scheduleFinalReport = (reason) => {
        if (reportTimer) clearTimeout(reportTimer);
        reportTimer = setTimeout(() => {
            reportTimer = 0;
            api.report(reason, true);
        }, 1200);
    };

    const attachDomObservers = () => {
        const root = document.documentElement;
        if (!root) {
            const rootObserver = new MutationObserver(() => {
                if (!document.documentElement) return;
                rootObserver.disconnect();
                attachDomObservers();
            });
            rootObserver.observe(document, { childList: true });
            return;
        }
        const domObserver = new MutationObserver(checkMilestones);
        domObserver.observe(root, { childList: true, subtree: true });
        const stateObserver = new MutationObserver(checkMilestones);
        stateObserver.observe(root, {
            attributes: true,
            attributeFilter: ['data-dcuf-boot-state', 'data-dcuf-filter-ready', 'class']
        });
        checkMilestones();
        window.addEventListener('pagehide', () => {
            domObserver.disconnect();
            stateObserver.disconnect();
        }, { once: true });
    };

    const observePerformance = (type, sink) => {
        try {
            const observer = new PerformanceObserver((list) => sink.push(...list.getEntries()));
            observer.observe({ type, buffered: true });
            return observer;
        } catch (_) {
            return null;
        }
    };
    const performanceObservers = [
        observePerformance('resource', observedResources),
        observePerformance('longtask', longTasks),
        observePerformance('paint', paints),
        observePerformance('largest-contentful-paint', paints)
    ].filter(Boolean);

    const getDcufEvents = () => {
        const events = window.__dcufDiagnostics?.snapshot?.().events || [];
        const bootStart = window.__dcufBootController?.startedAt;
        const bootOffset = Number.isFinite(bootStart) ? bootStart - performance.timeOrigin : 0;
        const diagnosticEvents = events.map((event) => {
            const elapsed = event?.detail?.elapsedMs;
            const at = Number.isFinite(elapsed)
                ? bootOffset + elapsed
                : (Number.isFinite(event.ts) ? event.ts - performance.timeOrigin : null);
            return {
                label: event.label,
                at: round(at),
                detail: event.detail
            };
        });
        return [...hookedBootEvents, ...diagnosticEvents]
            .filter((event, index, all) => all.findIndex((candidate) => (
                candidate.label === event.label
                && candidate.at === event.at
                && JSON.stringify(candidate.detail) === JSON.stringify(event.detail)
            )) === index)
            .sort((a, b) => (a.at ?? Infinity) - (b.at ?? Infinity));
    };

    const collectListState = () => Array.from(document.querySelectorAll('.gall_listwrap, .list_wrap'))
        .filter((wrap) => wrap.querySelector('table.gall_list'))
        .map((wrap, index) => {
            const table = wrap.querySelector('table.gall_list');
            const custom = wrap.querySelector('.custom-mobile-list');
            return {
                index,
                transformed: wrap.getAttribute('data-ui-transformed') || '',
                originalRows: table?.querySelectorAll('tr.ub-content').length || 0,
                customItems: custom?.querySelectorAll('.custom-post-item').length || 0,
                originalInlineDisplay: table?.style.getPropertyValue('display') || '',
                originalComputedDisplay: table instanceof HTMLElement ? getComputedStyle(table).display : '',
                customComputedDisplay: custom instanceof HTMLElement ? getComputedStyle(custom).display : ''
            };
        });

    const diagnose = (data) => {
        const nav = data.navigation || {};
        const findAt = (label) => data.timeline.find((row) => row.label === label)?.at;
        const contentAt = pageType === 'lists'
            ? findAt('custom-list-populated')
            : (findAt('article-content-populated') ?? findAt('article-content-in-dom'));
        const readyAt = Math.min(
            ...['dcuf-state:ready', 'dcuf-state:degraded', 'dcuf-ready-class']
                .map(findAt)
                .filter(Number.isFinite)
        );
        const conclusions = [];
        if ((nav.requestToFirstByte || 0) >= 800) {
            conclusions.push(`서버/네트워크 TTFB가 큼 (${nav.requestToFirstByte} ms)`);
        }
        if (Number.isFinite(contentAt) && Number.isFinite(nav.responseEnd) && contentAt - nav.responseEnd >= 500) {
            conclusions.push(`HTML 수신 뒤 ${pageType === 'lists' ? '목록 변환' : '본문 DOM 생성'}이 늦음 (+${round(contentAt - nav.responseEnd)} ms)`);
        }
        if (Number.isFinite(contentAt) && Number.isFinite(readyAt) && readyAt - contentAt >= 250) {
            conclusions.push(`${pageType === 'lists' ? '커스텀 목록' : '본문'}은 생겼지만 DCUF 공개까지 대기함 (+${round(readyAt - contentAt)} ms)`);
        }
        const reveal = window.__dcufRevealDebug?.initial;
        if (reveal && reveal.reason !== 'ready') {
            conclusions.push(`공개 검증 상태: ${reveal.reason}`);
        }
        const longTotal = round(data.longTasks.reduce((sum, task) => sum + task.duration, 0));
        if (longTotal >= 200) conclusions.push(`메인 스레드 Long Task 누적이 큼 (${longTotal} ms)`);
        if (originalListExposureFrames.length > 0) conclusions.push(`원본 목록 노출 프레임 발견 (${originalListExposureFrames.length})`);
        if (!conclusions.length) conclusions.push('단일 큰 병목은 안 보임: 아래 타임라인/느린 리소스를 비교 필요');
        return conclusions;
    };

    const snapshot = () => {
        checkMilestones();
        let runtime = null;
        try {
            const memory = window.__dcufMemoryDebug?.sample?.('guided-live-audit') || null;
            const diagnostics = window.__dcufRuntimeCoordinator?.snapshotDiagnostics?.()
                || memory?.runtime?.diagnostics
                || null;
            runtime = {
                scriptVersion: memory?.version || null,
                subscribers: diagnostics?.subscribers || [],
                immediateSubscribers: diagnostics?.immediateSubscribers || [],
                counters: diagnostics?.counters || {},
                gauges: diagnostics?.gauges || {},
                listRuntimeId: memory?.ui?.nextListRuntimeId || null,
                pendingMutationRecords: memory?.runtime?.pendingMutationRecords ?? null,
                taskQueueCount: memory?.runtime?.taskQueueCount ?? null
            };
        } catch (error) {
            runtime = { error: error?.message || 'runtime-snapshot-failed' };
        }
        const resources = [...observedResources, ...performance.getEntriesByType('resource')]
            .filter((entry, index, all) => all.findIndex((candidate) => candidate.name === entry.name && candidate.startTime === entry.startTime) === index)
            .map((entry) => ({
                type: entry.initiatorType || 'other',
                start: round(entry.startTime),
                duration: round(entry.duration),
                transferKB: round((entry.transferSize || 0) / 1024),
                name: safeUrl(entry.name)
            }))
            .sort((a, b) => b.duration - a.duration);
        const data = {
            capturedAt: new Date().toISOString(),
            page: safeUrl(location.href),
            pageType,
            navigation: collectNavigation(),
            timeline: timeline.slice().sort((a, b) => a.at - b.at),
            dcufEvents: getDcufEvents(),
            reveal: window.__dcufRevealDebug || null,
            boot: window.__dcufBootController ? {
                state: window.__dcufBootController.state,
                filterReady: window.__dcufBootController.filterReady
            } : null,
            runtime,
            listState: collectListState(),
            originalListExposureFrames: originalListExposureFrames.slice(),
            longTasks: longTasks.map((entry) => ({ start: round(entry.startTime), duration: round(entry.duration) })),
            paints: paints.map((entry) => ({ name: entry.name || entry.entryType, start: round(entry.startTime), duration: round(entry.duration) })),
            slowResources: resources.slice(0, 20)
        };
        data.diagnosis = diagnose(data);
        return data;
    };

    const downloadJson = (data, filename) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const api = {
        version: VERSION,
        snapshot,
        report(reason = 'manual', final = false) {
            const data = snapshot();
            if (final && finalReportPrinted) return data;
            if (final) finalReportPrinted = true;
            console.group(`%cDCUF PAGE LOAD REPORT (${pageType}, ${reason})`, 'color:#245bda;font-weight:bold;font-size:14px');
            console.log('판정:', data.diagnosis.join(' / '));
            console.table([data.navigation]);
            console.table(data.timeline.map((row, index, rows) => ({
                ms: row.at,
                gap: index ? round(row.at - rows[index - 1].at) : 0,
                event: row.label,
                detail: row.detail ? JSON.stringify(row.detail) : ''
            })));
            console.table(data.dcufEvents.map((row) => ({ ms: row.at, event: row.label, detail: JSON.stringify(row.detail) })));
            console.table(data.longTasks);
            console.table(data.listState);
            console.table(data.originalListExposureFrames);
            console.table(data.slowResources);
            console.log('전체 결과 복사: copy(window.__DCUF_PAGE_TRACE__.export())');
            console.groupEnd();
            return data;
        },
        export() {
            return JSON.stringify(snapshot(), null, 2);
        },
        download(filename = `dcuf-page-load-${pageType}-${Date.now()}.json`) {
            const data = snapshot();
            downloadJson(data, filename);
            return data;
        }
    };
    window.__DCUF_PAGE_TRACE__ = api;
    window.__DCUF_VIEW_TRACE__ = api;

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const waitForValue = async (read, timeoutMs = 3000, intervalMs = 50) => {
        const deadline = performance.now() + timeoutMs;
        while (performance.now() < deadline) {
            const value = read();
            if (value) return value;
            await delay(intervalMs);
        }
        return read() || null;
    };
    const waitForBootSettlement = async (timeoutMs = 12000) => {
        const deadline = performance.now() + timeoutMs;
        while (performance.now() < deadline) {
            const state = document.documentElement?.getAttribute('data-dcuf-boot-state') || '';
            if (state === 'ready' || state === 'degraded') return state;
            await delay(80);
        }
        return document.documentElement?.getAttribute('data-dcuf-boot-state') || 'timeout';
    };
    const clickCommentRefresh = async (sequence) => {
        for (let attempt = 1; attempt <= 30; attempt += 1) {
            const buttons = Array.from(document.querySelectorAll([
                '#focus_cmt button.btn_cmt_refresh',
                '.view_comment button.btn_cmt_refresh',
                'div[id^="comment_wrap_"] button.btn_cmt_refresh',
                'button.btn_cmt_refresh'
            ].join(',')));
            const button = buttons.find((candidate) => candidate instanceof HTMLButtonElement
                && !candidate.disabled
                && candidate.getClientRects().length > 0)
                || buttons.find((candidate) => candidate instanceof HTMLButtonElement && !candidate.disabled);
            if (button instanceof HTMLButtonElement) {
                button.click();
                return { sequence, clicked: true, attempt, at: round(performance.now()) };
            }
            await delay(100);
        }
        return { sequence, clicked: false, attempt: 30, at: round(performance.now()), reason: 'refresh-button-not-found' };
    };
    const waitWithStatus = async (durationMs, updateStatus, label) => {
        const deadline = performance.now() + durationMs;
        while (performance.now() < deadline) {
            const seconds = Math.max(1, Math.ceil((deadline - performance.now()) / 1000));
            updateStatus(`${label} (${seconds}초)`, 'running');
            await delay(Math.min(1000, Math.max(0, deadline - performance.now())));
        }
    };
    const runGuidedAudit = async (updateStatus) => {
        if (guidedAuditRunning) return null;
        guidedAuditRunning = true;
        const automation = {
            startedAt: new Date().toISOString(),
            pageType,
            bootState: '',
            commentProbeAvailable: false,
            refreshClicks: []
        };
        try {
            updateStatus('DCUF 준비 상태 확인 중…', 'running');
            const commentProbe = pageType === 'view'
                ? await waitForValue(() => window.DCUFCommentFlickerProbe, 3000)
                : null;
            automation.commentProbeAvailable = Boolean(commentProbe);
            if (commentProbe?.start) commentProbe.start(18000);

            automation.bootState = await waitForBootSettlement();
            updateStatus(`부팅 상태: ${automation.bootState}`, automation.bootState === 'ready' ? 'running' : 'warning');
            await delay(700);

            if (pageType === 'view') {
                if (commentProbe) {
                    updateStatus('댓글 새로고침 1차 실행 중…', 'running');
                    automation.refreshClicks.push(await clickCommentRefresh(1));
                    await delay(1500);
                    updateStatus('댓글 새로고침 2차 실행 중…', 'running');
                    automation.refreshClicks.push(await clickCommentRefresh(2));
                    await waitWithStatus(6500, updateStatus, '교체 댓글 노출 감시 중');
                } else {
                    automation.refreshClicks.push({ sequence: 0, clicked: false, reason: 'comment-probe-not-installed' });
                    await waitWithStatus(2500, updateStatus, '페이지 로딩 기록 마무리 중');
                }
            } else {
                await waitWithStatus(2200, updateStatus, '원본 목록 노출 감시 중');
            }

            if (commentProbe?.stop) commentProbe.stop('guided-live-audit');
            const commentReport = commentProbe?.report ? commentProbe.report('') : null;
            const blockedTargets = (commentReport?.suspects || []).filter((entry) => entry.everPersonalBlocked);
            const combined = {
                audit: 'dcuf-guided-live-audit',
                version: VERSION,
                capturedAt: new Date().toISOString(),
                automation: {
                    ...automation,
                    finishedAt: new Date().toISOString(),
                    blockedTargetCount: blockedTargets.length,
                    blockedVisibleSamples: blockedTargets.reduce((sum, entry) => sum + (Number(entry.visibleSamples) || 0), 0),
                    blockedVisibleToHidden: blockedTargets.reduce((sum, entry) => sum + (Number(entry.visibleToHidden) || 0), 0)
                },
                page: snapshot(),
                comments: commentReport
            };
            const filename = `dcuf-live-audit-${pageType}-${Date.now()}.json`;
            downloadJson(combined, filename);
            const clickCount = automation.refreshClicks.filter((entry) => entry.clicked).length;
            const blockedSummary = pageType === 'view'
                ? ` / 차단대상 ${blockedTargets.length} / 노출 ${combined.automation.blockedVisibleSamples}`
                : '';
            updateStatus(`저장 완료: 새로고침 ${clickCount}회${blockedSummary}`, combined.automation.blockedVisibleSamples === 0 ? 'success' : 'warning');
            return combined;
        } catch (error) {
            updateStatus(`검사 실패: ${error?.message || 'unknown'}`, 'error');
            throw error;
        } finally {
            guidedAuditRunning = false;
        }
    };
    api.startGuidedAudit = runGuidedAudit;

    const mountGuidedAuditPanel = () => {
        if (document.getElementById('dcuf-live-audit-panel')) return;
        const host = document.createElement('div');
        host.id = 'dcuf-live-audit-panel';
        host.style.cssText = 'all:initial;position:fixed;right:14px;bottom:14px;z-index:2147483647;display:block;';
        const shadow = host.attachShadow({ mode: 'open' });
        shadow.innerHTML = `
            <style>
                :host { all: initial; }
                .panel { box-sizing:border-box;width:286px;padding:14px;border:1px solid #a9b9d2;border-radius:14px;background:#fff;color:#1f2d43;box-shadow:0 14px 38px rgba(15,32,58,.26);font:13px/1.45 Arial,sans-serif; }
                .head { display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px; }
                .title { font-size:15px;font-weight:800; }
                .close { width:28px;height:28px;border:0;border-radius:8px;background:#edf2f9;color:#45556e;cursor:pointer;font-size:17px; }
                .desc { margin:0 0 10px;color:#5b6b82; }
                .status { min-height:38px;margin:0 0 10px;padding:9px;border-radius:9px;background:#f2f5fa;color:#42526a;word-break:keep-all; }
                .status[data-tone="success"] { background:#e8f7ee;color:#17683a; }
                .status[data-tone="warning"] { background:#fff4d8;color:#7a5410; }
                .status[data-tone="error"] { background:#fdeaea;color:#9b2929; }
                .start { width:100%;height:40px;border:0;border-radius:10px;background:#315fda;color:#fff;font-weight:800;cursor:pointer; }
                .start:disabled { background:#8da1c9;cursor:wait; }
                .hint { margin:9px 0 0;color:#7a879a;font-size:11px; }
            </style>
            <section class="panel" role="dialog" aria-label="DCUF 라이브 검사">
                <div class="head"><span class="title">DCUF 라이브 검사</span><button class="close" type="button" aria-label="닫기">×</button></div>
                <p class="desc">${pageType === 'view' ? '로딩과 차단 댓글 새로고침을 자동 검사합니다.' : '목록 로딩과 원본 목록 노출을 자동 검사합니다.'}</p>
                <div class="status" data-tone="idle">준비됨. 아래 버튼만 누르세요.</div>
                <button class="start" type="button">검사 시작 (${pageType === 'view' ? '약 10초' : '약 3초'})</button>
                <p class="hint">완료되면 JSON 파일이 자동으로 저장됩니다. 콘솔은 필요 없습니다.</p>
            </section>
        `;
        const status = shadow.querySelector('.status');
        const startButton = shadow.querySelector('.start');
        const closeButton = shadow.querySelector('.close');
        const updateStatus = (message, tone = 'idle') => {
            status.textContent = message;
            status.dataset.tone = tone;
        };
        startButton.addEventListener('click', async () => {
            startButton.disabled = true;
            try {
                await runGuidedAudit(updateStatus);
                startButton.textContent = '다시 검사';
            } catch (_) {
                startButton.textContent = '다시 시도';
            } finally {
                startButton.disabled = false;
            }
        });
        closeButton.addEventListener('click', () => host.remove());
        (document.documentElement || document).appendChild(host);
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountGuidedAuditPanel, { once: true });
    } else {
        mountGuidedAuditPanel();
    }

    let readyFrameCount = 0;
    const sampleOriginalListExposure = () => {
        const body = document.body;
        const root = document.documentElement;
        const ready = root?.getAttribute('data-dcuf-boot-state') === 'ready';
        if (ready) readyFrameCount += 1;
        if (body) {
            const bodyStyle = getComputedStyle(body);
            const bodyVisible = bodyStyle.display !== 'none' && bodyStyle.visibility !== 'hidden' && Number(bodyStyle.opacity) > 0;
            if (bodyVisible) {
                collectListState().forEach((state) => {
                    if (state.originalRows > 0 && state.originalComputedDisplay !== 'none') {
                        originalListExposureFrames.push({ at: round(performance.now()), ready, ...state });
                    }
                });
            }
        }
        if (readyFrameCount < 6 && performance.now() - startedAt < 15000) requestAnimationFrame(sampleOriginalListExposure);
    };
    requestAnimationFrame(sampleOriginalListExposure);

    attachDomObservers();
    const diagnosticsPoll = setInterval(() => {
        checkMilestones();
        if (enableDcufDiagnostics()) clearInterval(diagnosticsPoll);
    }, 20);
    setTimeout(() => clearInterval(diagnosticsPoll), 8000);

    document.addEventListener('DOMContentLoaded', () => {
        once('dom-content-loaded');
        checkMilestones();
    }, { once: true });
    window.addEventListener('load', () => {
        once('window-load');
        checkMilestones();
        if (window.__dcufBootController?.state === 'ready' || window.__dcufBootController?.state === 'degraded') {
            scheduleFinalReport('window-load');
        }
    }, { once: true });
    window.addEventListener('dcuf:boot-ready', (event) => {
        once('dcuf-boot-ready-event', event.detail || null);
        scheduleFinalReport('dcuf-ready');
    }, { once: true });
    window.addEventListener('dcuf:boot-degraded', (event) => {
        once('dcuf-boot-degraded-event', event.detail || null);
        scheduleFinalReport('dcuf-degraded');
    }, { once: true });
    window.addEventListener('pagehide', () => performanceObservers.forEach((observer) => observer.disconnect()), { once: true });
    setTimeout(() => api.report('8s-fallback', true), 8000);
}());
