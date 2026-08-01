; (() => {
    'use strict';

    const root = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
    if (root.__dcufLiveCorrectionsInstalled) return;
    root.__dcufLiveCorrectionsInstalled = true;

    const STYLE_ID = 'dcuf-live-surface-owner';
    const WRITER_PROXY_CLASS = 'dcuf-writer-proxy';
    const PORTAL_SELECTOR = '#pop_manage_report_list, #hot_rank_pop2';

    const installFinalSurfaceStyle = () => {
        if (document.getElementById(STYLE_ID)) return;
        const mount = document.head || document.documentElement;
        if (!mount) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            /* One bounded final owner for the live surfaces corrected after the P0 smoke test. */
            html[data-dcuf-palette] body .dcheader.typea .dchead {
                min-width: 0 !important;
            }
            @media (min-width: 1024px) {
                html[data-dcuf-palette] body .dcheader.typea .dchead {
                    grid-template-columns: minmax(150px, .75fr) minmax(320px, 480px) minmax(360px, 1.25fr) !important;
                    column-gap: 18px !important;
                }
                html[data-dcuf-palette] body .dcheader.typea .area_links {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: flex-end !important;
                    flex-wrap: nowrap !important;
                    gap: 7px !important;
                    min-width: 0 !important;
                    white-space: nowrap !important;
                }
            }

            html[data-dcuf-palette] body #visit_history.visit_bookmark > .newvisit_history.vst {
                border: 0 !important;
                border-bottom: 0 !important;
                box-shadow: none !important;
            }
            html[data-dcuf-palette] body #visit_history > .newvisit_history.vst > .bookmark_title,
            html[data-dcuf-palette] body #visit_history > .newvisit_history.vst > [data-bookmark-title] {
                display: none !important;
            }
            html[data-dcuf-palette] body #visit_history > .newvisit_history.bookmark > .vst_title,
            html[data-dcuf-palette] body #visit_history > .newvisit_history.bookmark > [data-visit-title],
            html[data-dcuf-palette] body #visit_history > .newvisit_history > :is(.vst_title,.bookmark_title)[hidden],
            html[data-dcuf-palette] body #visit_history > .newvisit_history > :is(.vst_title,.bookmark_title)[style*="display: none"],
            html[data-dcuf-palette] body #visit_history > .newvisit_history > :is(.vst_title,.bookmark_title).hide {
                display: none !important;
            }

            html[data-dcuf-palette] body:not(.is-write-page) .list_array_option .center_box,
            html[data-dcuf-palette] body:not(.is-write-page) .list_array_option .center_box > .inner {
                position: relative !important;
                min-width: 0 !important;
                overflow: visible !important;
            }
            html[data-dcuf-palette] body:not(.is-write-page) .list_array_option .center_box > .inner {
                display: grid !important;
                grid-template-columns: minmax(0, 1fr) 38px !important;
                align-items: center !important;
                width: 100% !important;
            }
            html[data-dcuf-palette] body:not(.is-write-page) .list_array_option .center_box > .inner > ul {
                grid-column: 1 !important;
                min-width: 0 !important;
                overflow-x: auto !important;
                overflow-y: hidden !important;
                scrollbar-width: none !important;
            }
            html[data-dcuf-palette] body:not(.is-write-page) .list_array_option .center_box > .inner > ul::-webkit-scrollbar {
                display: none !important;
            }
            html[data-dcuf-palette] body:not(.is-write-page) .list_array_option .center_box > .inner > .btn_subject_more {
                grid-column: 2 !important;
                position: static !important;
                inset: auto !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                width: 36px !important;
                min-width: 36px !important;
                height: 36px !important;
                margin: 0 !important;
                transform: none !important;
                z-index: 3 !important;
            }
            html[data-dcuf-palette] body:not(.is-write-page) .list_array_option .center_box > .inner > #subject_morelist {
                grid-column: 1 / -1 !important;
                position: absolute !important;
                top: calc(100% + 8px) !important;
                right: 0 !important;
                left: auto !important;
                max-width: min(520px, calc(100vw - 20px)) !important;
                z-index: 2147483647 !important;
            }

            html[data-dcuf-palette] body .custom-mobile-list .post-title {
                display: flex !important;
                align-items: center !important;
                flex-wrap: nowrap !important;
                gap: 7px !important;
                min-width: 0 !important;
            }
            html[data-dcuf-palette] body .custom-mobile-list .post-title-link {
                flex: 1 1 auto !important;
                min-width: 0 !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                white-space: nowrap !important;
            }
            html[data-dcuf-palette] body .custom-mobile-list .dcuf-title-meta {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: flex-end !important;
                flex: 0 0 auto !important;
                gap: 5px !important;
                margin-left: auto !important;
                white-space: nowrap !important;
            }
            html[data-dcuf-palette] body .custom-mobile-list .dcuf-title-meta :is(.reply_num,.dcuf-title-decoration) {
                display: inline-flex !important;
                align-items: center !important;
                margin: 0 !important;
            }

            html[data-dcuf-palette] body .${WRITER_PROXY_CLASS} {
                display: inline-flex !important;
                align-items: center !important;
                width: auto !important;
                max-width: 100% !important;
                padding: 0 !important;
                border: 0 !important;
                background: transparent !important;
                cursor: pointer !important;
            }
            html[data-dcuf-palette] body .${WRITER_PROXY_CLASS} :is(.nickname,.ip) {
                pointer-events: none !important;
            }

            html[data-dcuf-palette] body .custom-bottom-controls {
                display: grid !important;
                gap: 0 !important;
                overflow: visible !important;
                border: 1px solid var(--dcuf-glass-border) !important;
                border-radius: var(--dcuf-radius-panel) !important;
                background-color: var(--dcuf-glass-panel) !important;
                background-image: linear-gradient(145deg,var(--dcuf-glass-highlight),transparent 48%) !important;
                box-shadow: 0 10px 28px rgba(32,48,82,.075), inset 0 1px 0 var(--dcuf-glass-rim) !important;
            }
            html[data-dcuf-palette] body .custom-bottom-controls > :is(.dcuf-bottom-action-card,.dcuf-pagination-card,.dcuf-search-card) {
                margin: 0 !important;
                padding: 12px !important;
                border: 0 !important;
                border-radius: 0 !important;
                background: transparent !important;
                box-shadow: none !important;
            }
            html[data-dcuf-palette] body .custom-bottom-controls > :is(.dcuf-pagination-card,.dcuf-search-card) {
                border-top: 1px solid color-mix(in srgb,var(--dcuf-theme-border-strong) 48%,transparent) !important;
            }

            html[data-dcuf-palette] body.is-write-page form.dcuf-write-form :is(
                .note-toolbar,.note-toolbar-media,.tx-toolbar,.tx-toolbar-basic,.btns-box
            ) {
                display: flex !important;
                align-items: center !important;
                flex-wrap: nowrap !important;
                gap: 4px !important;
                min-width: 0 !important;
                overflow-x: auto !important;
                overflow-y: visible !important;
                scrollbar-width: thin !important;
                overscroll-behavior-x: contain !important;
                -webkit-overflow-scrolling: touch !important;
                touch-action: pan-x !important;
            }
            html[data-dcuf-palette] body.is-write-page form.dcuf-write-form :is(
                .note-toolbar,.note-toolbar-media,.tx-toolbar,.tx-toolbar-basic,.btns-box
            ) > *,
            html[data-dcuf-palette] body.is-write-page form.dcuf-write-form .note-toolbar .note-btn-group {
                flex: 0 0 auto !important;
            }

            html[data-dcuf-palette] body.is-write-page form.dcuf-write-form :is(.ai_easy_wrap,.ai_easy_box) {
                box-sizing: border-box !important;
                position: relative !important;
                display: flex !important;
                align-items: center !important;
                flex-wrap: wrap !important;
                gap: 8px !important;
                width: 100% !important;
                min-width: 0 !important;
                overflow: visible !important;
            }
            html[data-dcuf-palette] body.is-write-page form.dcuf-write-form :is(.ai_easy_wrap,.ai_easy_box) :is(
                input[type="file"],input[type="text"],textarea
            ) {
                min-width: 0 !important;
                max-width: 100% !important;
            }
            html[data-dcuf-palette] body.is-write-page form.dcuf-write-form :is(.ai_easy_wrap,.ai_easy_box) :is(
                .btn_close,.btn_del,.btn_reset,[class*="close"],[class*="reset"]
            ) {
                position: static !important;
                inset: auto !important;
                flex: 0 0 auto !important;
                transform: none !important;
            }

            html[data-dcuf-palette] body :is(#pop_manage_report_list,#hot_rank_pop2)[data-dcuf-host-popup-portal="1"] {
                position: fixed !important;
                z-index: 2147483647 !important;
                max-width: calc(100vw - 16px) !important;
                max-height: calc(100dvh - 16px) !important;
                overflow: auto !important;
                pointer-events: auto !important;
            }

            @media (prefers-reduced-motion: reduce) {
                html[data-dcuf-palette] body :is(
                    .dcheader.typea,.gnb_bar,#visit_history,.newvisit_history,
                    .list_array_option,.custom-mobile-list,.custom-bottom-controls,
                    .view_content_wrap,#focus_cmt,.view_comment.image_comment,
                    form.dcuf-write-form,[id^="dcuf-"]
                ),
                html[data-dcuf-palette] body :is(
                    .dcheader.typea,.gnb_bar,#visit_history,.newvisit_history,
                    .list_array_option,.custom-mobile-list,.custom-bottom-controls,
                    .view_content_wrap,#focus_cmt,.view_comment.image_comment,
                    form.dcuf-write-form,[id^="dcuf-"]
                )::before,
                html[data-dcuf-palette] body :is(
                    .dcheader.typea,.gnb_bar,#visit_history,.newvisit_history,
                    .list_array_option,.custom-mobile-list,.custom-bottom-controls,
                    .view_content_wrap,#focus_cmt,.view_comment.image_comment,
                    form.dcuf-write-form,[id^="dcuf-"]
                )::after {
                    scroll-behavior: auto !important;
                    transition: none !important;
                    animation: none !important;
                }
            }
        `;
        mount.appendChild(style);
    };

    const findOriginalWriterTarget = (writer) => {
        if (!(writer instanceof HTMLElement)) return null;
        return writer.querySelector('.nickname, a, button, [onclick], [role="button"]') || writer;
    };

    const installWriterCompatibility = () => {
        if (typeof UIModule === 'undefined' || !UIModule || UIModule.__dcufLiveWriterCompatibility) return;
        UIModule.__dcufLiveWriterCompatibility = true;

        UIModule.getWriterForMirror = function getWriterForMirror(originalRow, rowId, state) {
            const entry = state?.writerByRowId?.get(rowId);
            if (entry?.source instanceof HTMLElement && entry.source.isConnected) return entry.source;
            return originalRow.querySelector('.gall_writer, .ub-writer');
        };

        UIModule.moveWriterToMirror = function moveWriterToMirror(originalRow, rowId, state, writerEl, authorContainer) {
            if (!(originalRow instanceof HTMLElement) || !(state?.writerByRowId instanceof Map)) return null;
            if (!(writerEl instanceof HTMLElement) || !(authorContainer instanceof HTMLElement)) return null;

            const existing = state.writerByRowId.get(rowId);
            if (existing?.node instanceof HTMLElement && existing.node.isConnected && existing.source === writerEl) {
                if (existing.node.parentElement !== authorContainer) authorContainer.appendChild(existing.node);
                return existing.node;
            }

            existing?.node?.remove?.();
            const proxy = writerEl.cloneNode(true);
            if (!(proxy instanceof HTMLElement)) return null;
            proxy.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
            proxy.removeAttribute('id');
            proxy.classList.add(WRITER_PROXY_CLASS);
            proxy.dataset.dcufWriterProxy = '1';
            proxy.setAttribute('role', 'button');
            proxy.tabIndex = 0;

            const activate = (event) => {
                if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                event.stopPropagation();
                const target = findOriginalWriterTarget(writerEl);
                if (!(target instanceof HTMLElement) || !target.isConnected) return;
                target.click();
            };
            proxy.addEventListener('click', activate);
            proxy.addEventListener('keydown', activate);
            authorContainer.appendChild(proxy);

            state.writerByRowId.set(rowId, {
                node: proxy,
                source: writerEl,
                parent: writerEl.parentNode,
                nextSibling: writerEl.nextSibling,
                identity: null
            });
            return proxy;
        };

        UIModule.restoreWriterEntry = function restoreWriterEntry(entry) {
            if (entry?.node instanceof HTMLElement && entry.node !== entry.source) entry.node.remove();
            entry?.identity?.remove?.();
        };
    };

    const installRecentNavigationCompatibility = () => {
        if (typeof UIModule === 'undefined' || !UIModule || UIModule.__dcufNativeRecentNavigation) return;
        UIModule.__dcufNativeRecentNavigation = true;
        UIModule.bindRecentVisitNavigation = function bindRecentVisitNavigation() {
            document.querySelectorAll('.newvisit_history').forEach((historyRoot) => {
                if (typeof this.prepareRecentVisitList === 'function') this.prepareRecentVisitList(historyRoot);
            });
        };
    };

    const getElementPath = (element, rootElement) => {
        const path = [];
        let current = element;
        while (current instanceof Element && current !== rootElement) {
            const parent = current.parentElement;
            if (!(parent instanceof Element)) return null;
            path.unshift(Array.prototype.indexOf.call(parent.children, current));
            current = parent;
        }
        return current === rootElement ? path : null;
    };

    const resolveElementPath = (rootElement, path) => {
        let current = rootElement;
        for (const index of path || []) {
            current = current?.children?.[index];
            if (!(current instanceof Element)) return null;
        }
        return current;
    };

    const portalHostPopup = (popup) => {
        if (!(popup instanceof HTMLElement) || !document.body) return;
        if (popup.parentElement !== document.body) document.body.appendChild(popup);
        popup.setAttribute('data-dcuf-host-popup-portal', '1');
        const rect = popup.getBoundingClientRect();
        const width = Math.max(1, rect.width || popup.offsetWidth || 320);
        const height = Math.max(1, rect.height || popup.offsetHeight || 240);
        const gap = 8;
        const left = Math.max(gap, Math.min(window.innerWidth - width - gap, rect.left || (window.innerWidth - width) / 2));
        const top = Math.max(gap, Math.min(window.innerHeight - height - gap, rect.top || (window.innerHeight - height) / 2));
        popup.style.setProperty('left', `${left}px`, 'important');
        popup.style.setProperty('top', `${top}px`, 'important');
        popup.style.setProperty('right', 'auto', 'important');
        popup.style.setProperty('bottom', 'auto', 'important');
        popup.style.setProperty('transform', 'none', 'important');
    };

    const portalKnownHostPopups = (scope = document) => {
        if (scope instanceof Element && scope.matches(PORTAL_SELECTOR)) portalHostPopup(scope);
        scope.querySelectorAll?.(PORTAL_SELECTOR).forEach(portalHostPopup);
    };

    const installDrawerCompatibility = () => {
        if (root.__dcufDrawerCompatibilityInstalled) return;
        root.__dcufDrawerCompatibilityInstalled = true;

        document.addEventListener('click', (event) => {
            const cloneControl = event.target instanceof Element
                ? event.target.closest('.dcuf-header-drawer [data-dcuf-drawer-clone="1"] :is(a,button,input,[role="button"],[onclick])')
                : null;
            if (!(cloneControl instanceof HTMLElement)) return;
            const cloneRoot = cloneControl.closest('[data-dcuf-drawer-clone="1"]');
            const panel = cloneControl.closest('.dcuf-header-drawer__panel[data-source]');
            if (!(cloneRoot instanceof HTMLElement) || !(panel instanceof HTMLElement)) return;

            const selector = panel.dataset.source === 'issue'
                ? '.issue_contentbox'
                : '#gall_top_recom.concept_wrap';
            const originalRoot = Array.from(document.querySelectorAll(selector))
                .find((element) => element instanceof HTMLElement && !element.closest('.dcuf-header-drawer'));
            if (!(originalRoot instanceof HTMLElement)) return;
            const path = getElementPath(cloneControl, cloneRoot);
            const originalControl = resolveElementPath(originalRoot, path);
            if (!(originalControl instanceof HTMLElement)) return;

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            originalControl.click();
            queueMicrotask(() => portalKnownHostPopups());
            window.setTimeout(() => portalKnownHostPopups(), 0);
            window.setTimeout(() => portalKnownHostPopups(), 80);
        }, true);

        const observeRoot = document.documentElement;
        if (observeRoot) {
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    mutation.addedNodes.forEach((node) => {
                        if (node instanceof Element) portalKnownHostPopups(node);
                    });
                }
            });
            observer.observe(observeRoot, { childList: true, subtree: true });
            root.__dcufHostPopupPortalObserver = observer;
        }
        portalKnownHostPopups();
    };

    const normalizeTitleMetadata = (scope = document) => {
        scope.querySelectorAll?.('.custom-mobile-list .post-title').forEach((title) => {
            if (!(title instanceof HTMLElement)) return;
            let meta = title.querySelector(':scope > .dcuf-title-meta');
            if (!(meta instanceof HTMLElement)) {
                meta = document.createElement('span');
                meta.className = 'dcuf-title-meta';
            }
            const nodes = Array.from(title.children).filter((child) => (
                child !== meta && child.matches('.reply_num,.dcuf-title-decoration')
            ));
            if (nodes.length === 0) return;
            nodes.forEach((node) => meta.appendChild(node));
            title.appendChild(meta);
        });
    };

    const syncRecentFavoriteState = (scope = document) => {
        scope.querySelectorAll?.('#visit_history > .newvisit_history').forEach((history) => {
            if (!(history instanceof HTMLElement)) return;
            const recent = history.querySelector(':scope > .vst_title, :scope > [data-visit-title]');
            const favorite = history.querySelector(':scope > .bookmark_title, :scope > [data-bookmark-title]');
            const favoriteMode = history.classList.contains('bookmark') || history.dataset.type === 'bookmark';
            if (recent instanceof HTMLElement) recent.hidden = favoriteMode;
            if (favorite instanceof HTMLElement) favorite.hidden = !favoriteMode;
        });
    };

    const runLiveNormalization = (scope = document) => {
        installFinalSurfaceStyle();
        normalizeTitleMetadata(scope);
        syncRecentFavoriteState(scope);
        portalKnownHostPopups(scope);
    };

    installWriterCompatibility();
    installRecentNavigationCompatibility();
    installDrawerCompatibility();
    runLiveNormalization();

    const scheduleNormalization = (() => {
        let frame = 0;
        return (scope = document) => {
            if (frame) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                runLiveNormalization(scope);
            });
        };
    })();

    const coordinator = window.__dcufRuntimeCoordinator;
    if (coordinator && typeof coordinator.subscribeMutations === 'function') {
        coordinator.subscribeMutations('live-surface-owner', (payload) => {
            const roots = [
                ...(payload.addedElements || []),
                ...(payload.childListTargets || []),
                ...(payload.attributeTargets || [])
            ];
            roots.forEach((node) => {
                if (node instanceof Element) scheduleNormalization(node);
            });
        });
    } else if (document.documentElement) {
        const observer = new MutationObserver((mutations) => {
            const candidate = mutations.find((mutation) => mutation.target instanceof Element)?.target || document;
            scheduleNormalization(candidate);
        });
        observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
        root.__dcufLiveSurfaceObserver = observer;
    }

    window.addEventListener('resize', () => {
        portalKnownHostPopups();
        scheduleNormalization(document);
    }, { passive: true });
})();
