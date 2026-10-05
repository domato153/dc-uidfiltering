    const __dcufHeaderDrawerHostAdapter = (() => {
        const STYLE_ID = 'dcuf-header-drawer-style';
        const BODY_SCOPE_ATTR = 'data-dcuf-header-drawer-scope';
        const ACTIONS_SCOPE_ATTR = 'data-dcuf-header-drawer-actions';
        const NATIVE_DOOR_ATTR = 'data-dcuf-header-native-door';
        const NATIVE_DOOR_OPEN_ATTR = 'data-dcuf-header-native-door-open';
        const NATIVE_DOOR_POPUP_ONLY_ATTR = 'data-dcuf-header-native-door-popup-only';
        const NATIVE_RECOM_ATTR = 'data-dcuf-header-native-recom';
        const NATIVE_RECOM_OPEN_ATTR = 'data-dcuf-header-native-recom-open';
        const POPUP_SCOPE_ATTR = 'data-dcuf-header-drawer-popup';
        const RELATION_POPUP_SCOPE_ATTR = 'data-dcuf-header-relation-popup';
        const RELATION_STATIC_ATTR = 'data-dcuf-header-relation-static';
        const DRAWER_SCOPE_ATTR = 'data-dcuf-header-drawer';
        const DRAWER_SELECTOR = '.dcuf-header-drawer';
        const DRAWER_BODY_SELECTOR = '.dcuf-header-drawer__body-inner';
        const MUTATION_SELECTOR = '.page_head, .list_array_option, .gall_listwrap, .list_wrap, .issue_contentbox, #hot_rank_pop2, #hot_tip_pop, #gall_top_recom.concept_wrap, #relation_popup';
        const ownedDrawers = new Set();
        let connected = false;
        let bodyScope = null;
        let actionsScope = null;
        let nativeDoorScope = null;
        let nativeDoorOpenScope = null;
        let nativeDoorPopupOnlyScope = null;
        let nativeRecomScope = null;
        let nativeRecomOpenScope = null;
        let doorBodyVars = null;
        let popupScope = null;
        let relationPopupScope = null;
        let relationStaticScope = null;
        let scheduler = null;
        let mutationUnsubscribe = null;
        let fallbackObserver = null;
        let clickBound = false;
        let resizeBound = false;
        let loadBound = false;
        let domReadyBound = false;

        const isInsideDrawer = (node) => node instanceof Element && Boolean(node.closest(DRAWER_SELECTOR));
        const findOutsideDrawer = (selector) => Array.from(document.querySelectorAll(selector))
            .find((element) => element instanceof HTMLElement && !isInsideDrawer(element));
        const isListPage = () => !document.querySelector('.view_content_wrap');

        const restoreProjection = (projection) => {
            if (!projection) return;
            const { element, attribute, original } = projection;
            if (original === null) element.removeAttribute(attribute);
            else element.setAttribute(attribute, original);
        };
        const project = (projection, element, attribute) => {
            if (projection?.element === element) return projection;
            restoreProjection(projection);
            if (!(element instanceof HTMLElement)) return null;
            const value = element.getAttribute(attribute);
            // Host clones can copy our marker; the copy is still ours to remove.
            const next = { element, attribute, original: projection && value === '1' ? null : value };
            if (next.original !== '1') element.setAttribute(attribute, '1');
            return next;
        };
        const removeCopiedMarkers = (selector, attribute, projection) => {
            document.querySelectorAll(selector).forEach((element) => {
                if (element !== projection?.element && element.getAttribute(attribute) === '1') {
                    element.removeAttribute(attribute);
                }
            });
        };
        const projectStyleContext = () => {
            bodyScope = project(bodyScope, document.body, BODY_SCOPE_ATTR);
            actionsScope = project(actionsScope, document.querySelector('.page_head > .fr'), ACTIONS_SCOPE_ATTR);
        };
        const restoreDoorBodyVars = () => {
            if (!doorBodyVars) return;
            const { element, values } = doorBodyVars;
            values.forEach(({ name, value, priority }) => {
                if (value) element.style.setProperty(name, value, priority);
                else element.style.removeProperty(name);
            });
            doorBodyVars = null;
        };
        const setDoorBodyVar = (name, value) => {
            const element = document.body;
            if (!(element instanceof HTMLElement)) return;
            if (doorBodyVars?.element !== element) {
                restoreDoorBodyVars();
                doorBodyVars = { element, values: [] };
            }
            if (!doorBodyVars.values.some((entry) => entry.name === name)) {
                doorBodyVars.values.push({
                    name, value: element.style.getPropertyValue(name), priority: element.style.getPropertyPriority(name)
                });
            }
            if (element.style.getPropertyValue(name) !== value) element.style.setProperty(name, value);
        };
        const clearNativeDoor = () => {
            removeCopiedMarkers('.issue_wrap .issue_contentbox', NATIVE_DOOR_ATTR, nativeDoorScope);
            removeCopiedMarkers('.issue_wrap .issue_contentbox', NATIVE_DOOR_OPEN_ATTR, nativeDoorOpenScope);
            removeCopiedMarkers('.issue_wrap .issue_contentbox', NATIVE_DOOR_POPUP_ONLY_ATTR, nativeDoorPopupOnlyScope);
            removeCopiedMarkers('#gall_top_recom.concept_wrap', NATIVE_RECOM_ATTR, nativeRecomScope);
            removeCopiedMarkers('#gall_top_recom.concept_wrap', NATIVE_RECOM_OPEN_ATTR, nativeRecomOpenScope);
            restoreProjection(nativeRecomOpenScope);
            restoreProjection(nativeRecomScope);
            restoreProjection(nativeDoorPopupOnlyScope);
            restoreProjection(nativeDoorOpenScope);
            restoreProjection(nativeDoorScope);
            nativeRecomOpenScope = null;
            nativeRecomScope = null;
            nativeDoorPopupOnlyScope = null;
            nativeDoorOpenScope = null;
            nativeDoorScope = null;
            restoreDoorBodyVars();
        };
        const hasOpenNativePopup = (source) => source instanceof HTMLElement
            && ['#hot_rank_pop2', '#hot_tip_pop'].some((selector) => {
                const popup = source.querySelector(selector);
                return popup instanceof HTMLElement && getComputedStyle(popup).display !== 'none';
            });
        const ensureDrawerStyle = () => {
            const definition = __dcufHeaderDrawerPresenter?.style;
            if (definition?.id !== STYLE_ID) return false;
            if (document.getElementById(STYLE_ID)) return true;
            const target = document.head || document.documentElement;
            if (!target) return false;
            const style = document.createElement('style');
            style.id = STYLE_ID;
            style.setAttribute('data-dcuf-style-owner', 'header-drawer-presenter');
            style.textContent = definition.css;
            target.appendChild(style);
            return true;
        };

        const resolveDrawerMount = () => {
            const pageHeadActions = document.querySelector('.page_head > .fr');
            if (pageHeadActions instanceof HTMLElement) {
                return { parent: pageHeadActions, before: pageHeadActions.firstChild || null };
            }
            const pageHead = document.querySelector('.page_head');
            if (pageHead instanceof HTMLElement && pageHead.parentElement) {
                return { parent: pageHead.parentElement, before: pageHead.nextSibling };
            }
            const listArrayOption = document.querySelector('.list_array_option');
            if (listArrayOption instanceof HTMLElement && listArrayOption.parentElement) {
                return { parent: listArrayOption.parentElement, before: listArrayOption };
            }
            const listWrap = document.querySelector('.gall_listwrap, .list_wrap');
            if (listWrap instanceof HTMLElement && listWrap.parentElement) {
                return { parent: listWrap.parentElement, before: listWrap };
            }
            return null;
        };

        const setDrawerOpenState = (drawer, nextOpen) => {
            if (!(drawer instanceof HTMLElement)) return;
            const toggle = drawer.querySelector('.dcuf-header-drawer__toggle');
            const label = drawer.querySelector('.dcuf-header-drawer__toggle-label');
            const body = drawer.querySelector('.dcuf-header-drawer__body');
            const bodyInner = drawer.querySelector(DRAWER_BODY_SELECTOR);
            const presentation = __dcufHeaderDrawerPresenter.describeOpenState(Object.freeze({ open: nextOpen }));
            drawer.setAttribute('data-open', presentation.dataOpen);
            if (toggle instanceof HTMLElement) toggle.setAttribute('aria-expanded', presentation.ariaExpanded);
            if (label instanceof HTMLElement) label.textContent = presentation.label;
            if (body instanceof HTMLElement) {
                if (nextOpen) {
                    const drawerRect = drawer.getBoundingClientRect();
                    const bodyWidth = Math.min(640, Math.max(0, window.innerWidth - 24));
                    const maxLeft = Math.max(12, window.innerWidth - bodyWidth - 12);
                    const viewportLeft = Math.min(Math.max(12, drawerRect.right - bodyWidth), maxLeft);
                    body.style.setProperty('--dcuf-header-drawer-inline-start', `${viewportLeft - drawerRect.left}px`);
                    body.style.setProperty('display', 'block', 'important');
                    body.style.setProperty('visibility', 'visible', 'important');
                    body.style.setProperty('opacity', '1', 'important');
                    body.style.setProperty('pointer-events', 'auto', 'important');
                    body.style.setProperty('overflow', 'visible', 'important');
                    const measuredHeight = Math.max(
                        Math.ceil(bodyInner instanceof HTMLElement ? bodyInner.scrollHeight : 0),
                        Math.ceil(bodyInner instanceof HTMLElement ? bodyInner.getBoundingClientRect().height : 0),
                        Math.ceil(body.scrollHeight || 0),
                        1
                    );
                    body.style.setProperty('max-height', `${measuredHeight}px`, 'important');
                } else {
                    body.style.setProperty('max-height', '0px', 'important');
                    body.style.setProperty('opacity', '0', 'important');
                    body.style.setProperty('visibility', 'hidden', 'important');
                    body.style.setProperty('pointer-events', 'none', 'important');
                    body.style.setProperty('overflow', 'hidden', 'important');
                    body.style.setProperty('display', 'none', 'important');
                }
            }
            const source = findOutsideDrawer('.issue_contentbox');
            const popupOnly = !nextOpen && hasOpenNativePopup(source);
            if (!nextOpen && !popupOnly && source !== nativeDoorOpenScope?.element
                && source?.getAttribute(NATIVE_DOOR_OPEN_ATTR) === '1') {
                // A host replacement may clone our open marker while the drawer is closed.
                source.removeAttribute(NATIVE_DOOR_OPEN_ATTR);
            }
            if (!popupOnly && source !== nativeDoorPopupOnlyScope?.element
                && source?.getAttribute(NATIVE_DOOR_POPUP_ONLY_ATTR) === '1') {
                source.removeAttribute(NATIVE_DOOR_POPUP_ONLY_ATTR);
            }
            nativeDoorScope = project(nativeDoorScope, source, NATIVE_DOOR_ATTR);
            nativeDoorOpenScope = project(nativeDoorOpenScope, nextOpen || popupOnly ? source : null, NATIVE_DOOR_OPEN_ATTR);
            nativeDoorPopupOnlyScope = project(nativeDoorPopupOnlyScope, popupOnly ? source : null, NATIVE_DOOR_POPUP_ONLY_ATTR);
            const recomSource = findOutsideDrawer('#gall_top_recom.concept_wrap');
            if (!nextOpen && recomSource !== nativeRecomOpenScope?.element
                && recomSource?.getAttribute(NATIVE_RECOM_OPEN_ATTR) === '1') {
                recomSource.removeAttribute(NATIVE_RECOM_OPEN_ATTR);
            }
            nativeRecomScope = project(nativeRecomScope, recomSource, NATIVE_RECOM_ATTR);
            nativeRecomOpenScope = project(nativeRecomOpenScope, nextOpen ? recomSource : null, NATIVE_RECOM_OPEN_ATTR);
            if (nextOpen && source instanceof HTMLElement && body instanceof HTMLElement) {
                const rect = body.getBoundingClientRect();
                const width = Math.min(640, Math.max(0, window.innerWidth - 24));
                const left = Math.max(12, Math.min(Math.round(rect.left), window.innerWidth - width - 12));
                const preferredTop = Math.max(12, Math.round(rect.top));
                setDoorBodyVar('--dcuf-header-native-door-left', `${left}px`);
                setDoorBodyVar('--dcuf-header-native-door-top', `${preferredTop}px`);
                const height = Math.ceil(source.getBoundingClientRect().height);
                const top = Math.max(12, Math.min(preferredTop, window.innerHeight - height - 12));
                setDoorBodyVar('--dcuf-header-native-door-top', `${top}px`);
                const bodyInner = drawer.querySelector(DRAWER_BODY_SELECTOR);
                if (bodyInner instanceof HTMLElement) {
                    bodyInner.style.paddingTop = bodyInner.childElementCount ? `${height}px` : '';
                    const measuredHeight = Math.max(Math.ceil(bodyInner.scrollHeight), 1);
                    body.style.setProperty('max-height', `${measuredHeight}px`, 'important');
                }
            } else {
                const bodyInner = drawer.querySelector(DRAWER_BODY_SELECTOR);
                if (bodyInner instanceof HTMLElement) bodyInner.style.paddingTop = '';
            }
            if (nextOpen && recomSource instanceof HTMLElement && body instanceof HTMLElement) {
                const bodyRect = body.getBoundingClientRect();
                const width = Math.min(640, Math.max(0, window.innerWidth - 24));
                const left = Math.max(12, Math.min(Math.round(bodyRect.left), window.innerWidth - width - 12));
                const issueRect = source instanceof HTMLElement ? source.getBoundingClientRect() : null;
                const preferredTop = issueRect?.height
                    ? Math.ceil(issueRect.bottom + 8) : Math.max(12, Math.round(bodyRect.top));
                setDoorBodyVar('--dcuf-header-native-door-left', `${left}px`);
                setDoorBodyVar('--dcuf-header-native-recom-top', `${preferredTop}px`);
                const height = Math.ceil(recomSource.getBoundingClientRect().height);
                const top = Math.max(12, Math.min(preferredTop, window.innerHeight - height - 12));
                setDoorBodyVar('--dcuf-header-native-recom-top', `${top}px`);
            }
        };

        const pruneDetachedDrawers = () => {
            ownedDrawers.forEach((drawer) => {
                if (drawer.isConnected) return;
                drawer.remove();
                ownedDrawers.delete(drawer);
            });
        };

        const removeDrawers = () => {
            document.querySelectorAll(DRAWER_SELECTOR).forEach((drawer) => drawer.remove());
            ownedDrawers.forEach((drawer) => drawer.remove());
            ownedDrawers.clear();
        };

        const ensureDrawerShell = (mount) => {
            if (!mount?.parent) return null;
            let drawer = document.querySelector(DRAWER_SELECTOR);
            if (!(drawer instanceof HTMLElement)) {
                const definition = __dcufHeaderDrawerPresenter.shell;
                drawer = document.createElement(definition.tagName);
                drawer.className = definition.className;
                drawer.setAttribute('data-open', definition.initialState.dataOpen);
                drawer.innerHTML = definition.html;
            }
            if (drawer.getAttribute(DRAWER_SCOPE_ATTR) !== '1') drawer.setAttribute(DRAWER_SCOPE_ATTR, '1');
            // insertBefore(node, node) still detaches/reinserts in Chromium,
            // dropping a focused descendant during otherwise-idempotent sync.
            if (drawer.parentElement !== mount.parent
                || (mount.before !== drawer && drawer.nextSibling !== mount.before)) {
                mount.parent.insertBefore(drawer, mount.before);
            }
            ownedDrawers.add(drawer);
            document.querySelectorAll(DRAWER_SELECTOR).forEach((other) => {
                if (other !== drawer) other.remove();
            });
            return drawer;
        };

        const syncHeaderDrawer = () => {
            if (!connected) return;
            projectStyleContext();
            ensureDrawerStyle();
            pruneDetachedDrawers();
            if (!isListPage()) {
                removeDrawers();
                clearNativeDoor();
                return;
            }
            const mount = resolveDrawerMount();
            if (!mount?.parent) {
                removeDrawers();
                clearNativeDoor();
                return;
            }
            const drawer = ensureDrawerShell(mount);
            const body = drawer?.querySelector(DRAWER_BODY_SELECTOR);
            if (!(body instanceof HTMLElement)) return;

            popupScope = project(popupScope, document.getElementById('hot_rank_pop2'), POPUP_SCOPE_ATTR);
            const relationPopup = document.querySelector('.issue_wrap > #relation_popup');
            const relationStatic = relationPopup instanceof HTMLElement && (
                relationStaticScope?.element === relationPopup
                || relationPopup.getAttribute(RELATION_STATIC_ATTR) === '1'
                || getComputedStyle(relationPopup).position === 'static'
            );
            relationPopupScope = project(relationPopupScope, relationPopup, RELATION_POPUP_SCOPE_ATTR);
            relationStaticScope = project(relationStaticScope, relationStatic ? relationPopup : null, RELATION_STATIC_ATTR);
            body.querySelectorAll('.dcuf-header-drawer__panel').forEach((panel) => panel.remove());
            if (!(findOutsideDrawer('.issue_contentbox') instanceof HTMLElement)
                && !(findOutsideDrawer('#gall_top_recom.concept_wrap') instanceof HTMLElement)) {
                drawer.remove();
                ownedDrawers.delete(drawer);
                clearNativeDoor();
                return;
            }
            setDrawerOpenState(drawer, drawer.getAttribute('data-open') === '1');
        };

        const schedule = () => scheduler?.schedule();
        const observeTargets = () => {
            if (mutationUnsubscribe || fallbackObserver) return;
            const coordinator = window.__dcufRuntimeCoordinator;
            const unsubscribe = coordinator?.subscribeMutations?.('header-drawer', (payload) => {
                const relevantNodes = (typeof payload?.collectMatches === 'function'
                    ? payload.collectMatches(MUTATION_SELECTOR, { includeRoots: true })
                    : Array.from(document.querySelectorAll(MUTATION_SELECTOR)))
                    .filter((node) => !isInsideDrawer(node));
                if (relevantNodes.length > 0) schedule();
            });
            if (typeof unsubscribe === 'function') {
                mutationUnsubscribe = unsubscribe;
                return;
            }
            if (!document.body) return;
            fallbackObserver = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (isInsideDrawer(mutation.target)) continue;
                    schedule();
                    return;
                }
            });
            fallbackObserver.observe(document.body, {
                childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style']
            });
        };

        const handleDomReady = () => {
            document.removeEventListener('DOMContentLoaded', handleDomReady);
            domReadyBound = false;
            schedule();
            observeTargets();
        };
        const handleLoad = () => {
            window.removeEventListener('load', handleLoad);
            loadBound = false;
            schedule();
        };
        const handleClick = (event) => {
            const toggle = event.target instanceof Element
                ? event.target.closest('.dcuf-header-drawer__toggle')
                : null;
            if (!(toggle instanceof HTMLButtonElement)) return;
            const drawer = toggle.closest(DRAWER_SELECTOR);
            if (!(drawer instanceof HTMLElement)) return;
            event.preventDefault();
            event.stopPropagation();
            setDrawerOpenState(drawer, drawer.getAttribute('data-open') !== '1');
        };

        const connect = () => {
            if (connected) {
                syncHeaderDrawer();
                return snapshot();
            }
            connected = true;
            const coordinator = window.__dcufRuntimeCoordinator;
            scheduler = coordinator?.createPhaseScheduler?.('list-header-drawer', syncHeaderDrawer, { delays: [120] })
                || __dcufHeaderDrawerFallbackScheduler(syncHeaderDrawer);
            schedule();
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', handleDomReady);
                domReadyBound = true;
            } else observeTargets();
            if (document.readyState !== 'complete') {
                window.addEventListener('load', handleLoad);
                loadBound = true;
            }
            window.addEventListener('resize', schedule);
            resizeBound = true;
            document.addEventListener('click', handleClick, true);
            clickBound = true;
            return snapshot();
        };

        const dispose = () => {
            scheduler?.cancel();
            scheduler = null;
            mutationUnsubscribe?.();
            mutationUnsubscribe = null;
            fallbackObserver?.disconnect();
            fallbackObserver = null;
            if (domReadyBound) document.removeEventListener('DOMContentLoaded', handleDomReady);
            if (loadBound) window.removeEventListener('load', handleLoad);
            if (resizeBound) window.removeEventListener('resize', schedule);
            if (clickBound) document.removeEventListener('click', handleClick, true);
            domReadyBound = false;
            loadBound = false;
            resizeBound = false;
            clickBound = false;
            removeDrawers();
            clearNativeDoor();
            removeCopiedMarkers('#hot_rank_pop2', POPUP_SCOPE_ATTR, popupScope);
            restoreProjection(popupScope);
            restoreProjection(relationStaticScope);
            restoreProjection(relationPopupScope);
            restoreProjection(actionsScope);
            restoreProjection(bodyScope);
            popupScope = null;
            relationStaticScope = null;
            relationPopupScope = null;
            actionsScope = null;
            bodyScope = null;
            document.getElementById(STYLE_ID)?.remove();
            connected = false;
        };

        const snapshot = () => Object.freeze({ connected, drawerCount: document.querySelectorAll(DRAWER_SELECTOR).length });
        const snapshotResources = () => Object.freeze({
            connected,
            drawerCount: document.querySelectorAll(DRAWER_SELECTOR).length,
            styleCount: document.querySelectorAll(`#${STYLE_ID}`).length,
            portalCount: 0,
            documentListeners: clickBound ? 1 : 0,
            windowListeners: Number(resizeBound) + Number(loadBound),
            domReadyListeners: Number(domReadyBound),
            mutationSubscribers: Number(typeof mutationUnsubscribe === 'function'),
            fallbackObservers: Number(Boolean(fallbackObserver))
        });

        return Object.freeze({ connect, refresh: syncHeaderDrawer, dispose, snapshot, snapshotResources });
    })();

    const __dcufHeaderDrawerFallbackScheduler = (run) => {
        let frameId = 0;
        let timerId = 0;
        const cancel = () => {
            if (frameId) cancelAnimationFrame(frameId);
            if (timerId) clearTimeout(timerId);
            frameId = 0;
            timerId = 0;
        };
        return {
            schedule() {
                cancel();
                frameId = requestAnimationFrame(() => {
                    frameId = 0;
                    run();
                    timerId = window.setTimeout(() => {
                        timerId = 0;
                        run();
                    }, 120);
                });
            },
            cancel
        };
    };

    __dcufRoot.__dcufHeaderDrawerHostAdapter = __dcufHeaderDrawerHostAdapter;
