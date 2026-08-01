(() => {
    const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
    const copyReport = (report) => {
        const text = JSON.stringify(report, null, 2);
        console.log('[DCUF live audit]', report);
        if (typeof copy === 'function') copy(text);
        else navigator.clipboard?.writeText(text).catch(() => {});
        return report;
    };
    const downloadReport = (report, filename = 'dcuf-live-audit.json') => {
        const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return report;
    };
    const diagnostics = () => clone(window.__dcufDiagnostics?.snapshot?.() || null);
    const commentPasses = (snapshot) => Number(snapshot?.counters?.['filter.syncPass.comments.runs'] || 0);
    const measureDomMutations = (durationMs, action = null) => new Promise((resolve) => {
        const result = {
            durationMs,
            callbacks: 0,
            records: 0,
            attributes: 0,
            childList: 0,
            addedNodes: 0,
            removedNodes: 0,
            styleRecords: 0,
            classRecords: 0
        };
        const observer = new MutationObserver((records) => {
            result.callbacks += 1;
            result.records += records.length;
            records.forEach((record) => {
                if (record.type === 'attributes') {
                    result.attributes += 1;
                    if (record.attributeName === 'style') result.styleRecords += 1;
                    if (record.attributeName === 'class') result.classRecords += 1;
                } else if (record.type === 'childList') {
                    result.childList += 1;
                    result.addedNodes += record.addedNodes.length;
                    result.removedNodes += record.removedNodes.length;
                }
            });
        });
        observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class'] });
        if (typeof action === 'function') action();
        setTimeout(() => {
            observer.disconnect();
            resolve(result);
        }, durationMs);
    });
    const identify = (element, index) => ({
        index,
        tag: element.tagName,
        id: element.id || '',
        dataNo: element.getAttribute('data-no') || '',
        className: element.className || '',
        inlineDisplay: element.style.display || '',
        computedDisplay: getComputedStyle(element).display,
        text: String(element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120)
    });
    const inspectSurface = (selector) => {
        const elements = Array.from(document.querySelectorAll(selector));
        const visibleCount = elements.filter((element) => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== 'none'
                && style.visibility !== 'hidden'
                && Number(style.opacity) > 0
                && rect.width > 0
                && rect.height > 0;
        }).length;
        const first = elements[0];
        const firstStyle = first ? getComputedStyle(first) : null;
        return {
            selector,
            count: elements.length,
            visibleCount,
            first: firstStyle ? {
                display: firstStyle.display,
                visibility: firstStyle.visibility,
                opacity: firstStyle.opacity,
                boxShadow: firstStyle.boxShadow,
                backgroundColor: firstStyle.backgroundColor
            } : null
        };
    };

    window.DCUFLiveAudit = {
        bootDark() {
            const root = document.documentElement;
            const body = document.body;
            const banner = document.getElementById('dcuf-degraded-banner');
            return copyReport({
                audit: 'dark-view-boot',
                page: `${location.origin}${location.pathname}`,
                capturedAt: new Date().toISOString(),
                userAgent: navigator.userAgent,
                boot: {
                    state: root.getAttribute('data-dcuf-boot-state'),
                    filterReady: root.getAttribute('data-dcuf-filter-ready'),
                    scriptUiReady: root.classList.contains('script-ui-ready'),
                    bannerReason: banner?.dataset.reason || null,
                    bannerPresent: Boolean(banner),
                    degradedStylePresent: Boolean(document.getElementById('dcuf-degraded-filter-style'))
                },
                dark: {
                    stylesheetPresent: Boolean(document.getElementById('css-darkmode')),
                    rootClass: root.classList.contains('dc-filter-dark-mode'),
                    bodyClass: Boolean(body?.classList.contains('dc-filter-dark-mode')),
                    effective: window.__dcufEffectiveDarkMode ?? null
                },
                surfaces: [
                    inspectSurface('.view_content_wrap'),
                    inspectSurface('#focus_cmt .comment_box, div[id^="comment_wrap_"] .comment_box'),
                    inspectSurface('.view_bottom'),
                    inspectSurface('.view_bottom .gall_listwrap, .view_bottom .custom-mobile-list')
                ],
                reveal: clone(window.__dcufRevealDebug || null),
                viewTheme: clone(window.__dcufPhase1ViewTheme?.getDebugState?.() || null),
                diagnostics: diagnostics()
            });
        },

        bootDarkDownload(filename = 'dark-view-boot.json') {
            return downloadReport(this.bootDark(), filename);
        },

        async commentChurn(waitMs = 1600) {
            const target = document.querySelector('#comment_wrap_1 .cmt_list > li:not(.dory), .comment_box .cmt_list > li:not(.dory)');
            if (!target) throw new Error('댓글을 찾지 못했습니다. 댓글이 있는 글 본문에서 실행하세요.');
            const before = diagnostics();
            if (!before) throw new Error('진단 객체가 보이지 않습니다. Console 실행 컨텍스트를 Tampermonkey/DC_UserFilter_Mobile로 바꾼 뒤 수집기를 다시 붙여넣으세요.');
            const beforePasses = commentPasses(before);
            const originalBorder = target.style.borderLeft;
            target.style.borderLeft = originalBorder ? '' : '3px solid rgb(255, 0, 0)';
            await new Promise((resolve) => setTimeout(resolve, waitMs));
            const after = diagnostics();
            const report = {
                audit: 'comment-style-churn',
                url: location.href,
                userAgent: navigator.userAgent,
                waitMs,
                target: identify(target, 0),
                beforePasses,
                afterPasses: commentPasses(after),
                passDelta: commentPasses(after) - beforePasses,
                before,
                after
            };
            return copyReport(report);
        },

        async commentChurnDownload(filename, waitMs = 1600) {
            return downloadReport(await this.commentChurn(waitMs), filename || 'comment-churn.json');
        },

        async commentDomChurn(waitMs = 1600) {
            const target = document.querySelector('#comment_wrap_1 .cmt_list > li:not(.dory), .comment_box .cmt_list > li:not(.dory)');
            if (!target) throw new Error('댓글을 찾지 못했습니다. 댓글이 있는 글 본문에서 실행하세요.');
            const idle = await measureDomMutations(waitMs);
            const originalBorder = target.style.borderLeft;
            const triggered = await measureDomMutations(waitMs, () => {
                target.style.borderLeft = originalBorder ? '' : '3px solid rgb(255, 0, 0)';
            });
            return copyReport({
                audit: 'comment-style-dom-churn',
                url: location.href,
                userAgent: navigator.userAgent,
                waitMs,
                target: identify(target, 0),
                idle,
                triggered,
                delta: Object.fromEntries(Object.keys(idle).filter((key) => key !== 'durationMs').map((key) => [key, triggered[key] - idle[key]])),
                scriptUiReady: document.documentElement.classList.contains('script-ui-ready'),
                customPostCount: document.querySelectorAll('.custom-post-item').length
            });
        },

        async commentDomChurnDownload(filename, waitMs = 1600) {
            return downloadReport(await this.commentDomChurn(waitMs), filename || 'comment-dom-churn.json');
        },

        saveHiddenBaseline() {
            const candidates = Array.from(document.querySelectorAll('table.gall_list tr, #comment_wrap_1 li'))
                .filter((element) => element.style.display === 'none' || getComputedStyle(element).display === 'none')
                .map(identify);
            const baseline = { audit: 'hidden-baseline', url: location.href, capturedAt: new Date().toISOString(), candidates };
            localStorage.setItem('dcuf-live-hidden-baseline', JSON.stringify(baseline));
            return copyReport(baseline);
        },

        compareHiddenBaseline() {
            const baseline = JSON.parse(localStorage.getItem('dcuf-live-hidden-baseline') || 'null');
            if (!baseline) throw new Error('저장된 기준이 없습니다. 사용자 스크립트를 끈 상태에서 saveHiddenBaseline()을 먼저 실행하세요.');
            const results = baseline.candidates.map((item) => {
                const selector = item.id
                    ? `#${CSS.escape(item.id)}`
                    : item.dataNo
                        ? `${item.tag.toLowerCase()}[data-no="${CSS.escape(item.dataNo)}"]`
                        : null;
                const fallbackCandidates = Array.from(document.querySelectorAll(`${item.tag.toLowerCase()}${item.tag === 'TR' ? '.ub-content' : ''}`));
                const current = (selector ? document.querySelector(selector) : null)
                    || fallbackCandidates.find((element) => String(element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120) === item.text)
                    || null;
                const rowId = current?.getAttribute('data-custom-row-id') || '';
                const mirror = rowId ? document.querySelector(`.custom-post-item[data-custom-row-id="${CSS.escape(rowId)}"]`) : null;
                const mirrorVisible = Boolean(mirror && getComputedStyle(mirror).display !== 'none');
                const currentVisible = item.tag !== 'TR' && Boolean(current && getComputedStyle(current).display !== 'none');
                const exposed = mirrorVisible || currentVisible;
                return {
                    baseline: item,
                    found: Boolean(current),
                    current: current ? identify(current, item.index) : null,
                    mirror: mirror ? identify(mirror, item.index) : null,
                    exposed,
                    status: exposed ? 'exposed' : current ? 'hidden' : 'removed-or-changed'
                };
            });
            return copyReport({
                audit: 'hidden-compare',
                baselineUrl: baseline.url,
                currentUrl: location.href,
                comparedAt: new Date().toISOString(),
                exposedCount: results.filter((item) => item.exposed).length,
                results
            });
        },

        compareHiddenBaselineDownload(filename = 'hidden-compare.json') {
            return downloadReport(this.compareHiddenBaseline(), filename);
        },

        download(report, filename) {
            return downloadReport(report, filename);
        }
    };

    console.log('DCUF 실사이트 수집기 준비 완료:', Object.keys(window.DCUFLiveAudit));
})();
