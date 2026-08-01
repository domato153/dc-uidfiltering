; (() => {
    'use strict';

    const root = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
    if (root.__dcufSurfaceAdaptersInstalled) return;
    root.__dcufSurfaceAdaptersInstalled = true;

    const PORTAL_SELECTOR = '#pop_manage_report_list, #hot_rank_pop2';

    const visualViewportRect = () => {
        const viewport = window.visualViewport;
        return {
            left: viewport?.offsetLeft || 0,
            top: viewport?.offsetTop || 0,
            width: viewport?.width || window.innerWidth,
            height: viewport?.height || window.innerHeight
        };
    };

    const portalHostPopup = (popup) => {
        if (!(popup instanceof HTMLElement) || !document.body) return;
        const before = popup.getBoundingClientRect();
        if (popup.parentElement !== document.body) document.body.appendChild(popup);
        popup.setAttribute('data-dcuf-host-popup-portal', '1');

        const viewport = visualViewportRect();
        const gap = 8;
        const measured = popup.getBoundingClientRect();
        const width = Math.max(1, measured.width || before.width || popup.offsetWidth || 320);
        const height = Math.max(1, measured.height || before.height || popup.offsetHeight || 240);
        const preferredLeft = Number.isFinite(before.left) && before.width > 0
            ? before.left
            : viewport.left + (viewport.width - width) / 2;
        const preferredTop = Number.isFinite(before.top) && before.height > 0
            ? before.top
            : viewport.top + (viewport.height - height) / 2;
        const left = Math.max(viewport.left + gap, Math.min(viewport.left + viewport.width - width - gap, preferredLeft));
        const top = Math.max(viewport.top + gap, Math.min(viewport.top + viewport.height - height - gap, preferredTop));

        popup.style.setProperty('left', `${Math.round(left)}px`, 'important');
        popup.style.setProperty('top', `${Math.round(top)}px`, 'important');
        popup.style.setProperty('right', 'auto', 'important');
        popup.style.setProperty('bottom', 'auto', 'important');
        popup.style.setProperty('transform', 'none', 'important');
    };

    const portalKnownHostPopups = (scope = document) => {
        if (scope instanceof Element && scope.matches(PORTAL_SELECTOR)) portalHostPopup(scope);
        scope.querySelectorAll?.(PORTAL_SELECTOR).forEach(portalHostPopup);
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
            [
                ...nodes.filter((node) => node.matches('.reply_num')),
                ...nodes.filter((node) => node.matches('.dcuf-title-decoration'))
            ].forEach((node) => meta.appendChild(node));
            title.appendChild(meta);
        });
    };

    const isHostHidden = (element) => {
        if (!(element instanceof HTMLElement)) return true;
        if (element.hidden || element.classList.contains('hide')) return true;
        const inlineDisplay = element.style.getPropertyValue('display');
        return inlineDisplay === 'none';
    };

    const syncRecentFavoriteState = (scope = document) => {
        scope.querySelectorAll?.('#visit_history > .newvisit_history').forEach((history) => {
            if (!(history instanceof HTMLElement)) return;
            const recent = history.querySelector(':scope > .vst_title, :scope > [data-visit-title]');
            const favorite = history.querySelector(':scope > .bookmark_title, :scope > [data-bookmark-title]');
            const explicitFavorite = history.classList.contains('bookmark') || history.dataset.type === 'bookmark';
            const explicitRecent = history.classList.contains('vst') || history.dataset.type === 'visit';
            const favoriteMode = explicitFavorite || (!explicitRecent && !isHostHidden(favorite) && isHostHidden(recent));
            if (recent instanceof HTMLElement) recent.hidden = favoriteMode;
            if (favorite instanceof HTMLElement) favorite.hidden = !favoriteMode;
            history.dataset.dcufRecentMode = favoriteMode ? 'bookmark' : 'visit';
        });
    };

    const runAdapters = (scope = document) => {
        normalizeTitleMetadata(scope);
        syncRecentFavoriteState(scope);
        portalKnownHostPopups(scope);
        root.__dcufEnforceSurfaceOwnership?.();
    };

    installDrawerCompatibility();
    runAdapters();
    document.addEventListener('click', () => {
        queueMicrotask(() => portalKnownHostPopups());
        window.setTimeout(() => portalKnownHostPopups(), 0);
    }, { capture: true, passive: true });

    let frame = 0;
    const scheduleAdapters = (scope = document) => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
            frame = 0;
            runAdapters(scope);
        });
    };

    const coordinator = root.__dcufRuntimeCoordinator;
    if (coordinator && typeof coordinator.subscribeMutations === 'function') {
        coordinator.subscribeMutations('surface-adapters', (payload) => {
            const roots = [
                ...(payload.addedElements || []),
                ...(payload.childListTargets || []),
                ...(payload.attributeTargets || [])
            ];
            const candidate = roots.find((node) => node instanceof Element) || document;
            scheduleAdapters(candidate);
        });
    } else if (document.documentElement) {
        const observer = new MutationObserver((mutations) => {
            const candidate = mutations.find((mutation) => mutation.target instanceof Element)?.target || document;
            scheduleAdapters(candidate);
        });
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'hidden']
        });
        root.__dcufSurfaceAdapterObserver = observer;
    }

    window.addEventListener('resize', () => {
        portalKnownHostPopups();
        scheduleAdapters(document);
    }, { passive: true });
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) scheduleAdapters(document);
    });
})();
