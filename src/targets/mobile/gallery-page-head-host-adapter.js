    // Full native predicates and role relations belong to the target adapter.
    function __dcufDescribeGalleryPageHeadStyleSelectors() {
        return Object.freeze({
            root: "[data-dcuf-gallery-page-head-role=\"root\"]",
            left: "[data-dcuf-gallery-page-head-role=\"root\"] > :is([data-dcuf-gallery-page-head-role=\"left\"], [data-dcuf-gallery-page-head-role=\"both\"])",
            right: "[data-dcuf-gallery-page-head-role=\"root\"] > :is([data-dcuf-gallery-page-head-role=\"right\"], [data-dcuf-gallery-page-head-role=\"both\"])",
            clearfix: "[data-dcuf-gallery-page-head-role=\"root\"]::after"
        });
    }

    // Hoisted input: preserve native coverage before objects initialize or connect.
    function __dcufDescribeGalleryPageHeadThemeSelectors(ROOT_ATTRIBUTE) {
        return Object.freeze({
            root: `html[${ROOT_ATTRIBUTE}] body .page_head`,
            search: `html[${ROOT_ATTRIBUTE}] body .page_head :is(.gall_search, .gall_search_box, .inner_search) :is(.btn_search, .bnt_search, button[type="submit"])`,
            directSearch: `html[${ROOT_ATTRIBUTE}] body .page_head > .fl form :is(.btn_search, .bnt_search, button[type="submit"])`,
            title: `html[${ROOT_ATTRIBUTE}] body .page_head :is(h2, h2 a, .gall_tit, .gall_tit a, .gallery_title, .gallery_title a)`,
            badge: `html[${ROOT_ATTRIBUTE}] body .page_head :is(.icon_mini, .mini_icon, .gallery_badge)`,
            titleIcon: `html[${ROOT_ATTRIBUTE}] body .page_head .pagehead_titicon:is(.mgall, .ngall).sp_img`,
            linkedTitleIcon: `html[${ROOT_ATTRIBUTE}] body .page_head h2 a > .pagehead_titicon:is(.mgall, .ngall).sp_img`,
            titleDecoration: `html[${ROOT_ATTRIBUTE}] body .page_head .pagehead_titicon:is(.mgall, .ngall).sp_img::before`,
            linkedTitleDecoration: `html[${ROOT_ATTRIBUTE}] body .page_head h2 a > .pagehead_titicon:is(.mgall, .ngall).sp_img::before`,
            miniFixtureDecoration: `html[${ROOT_ATTRIBUTE}] body[data-fixture-variant="mini"] .page_head .pagehead_titicon:is(.mgall, .ngall).sp_img::before`,
            miniRootDecoration: `html[${ROOT_ATTRIBUTE}] body:has(#top.miniwrap) .page_head .pagehead_titicon:is(.mgall, .ngall).sp_img::before`,
            nestedMiniDecoration: `html[${ROOT_ATTRIBUTE}] body .miniwrap .page_head .pagehead_titicon:is(.mgall, .ngall).sp_img::before`,
            miniDecoration: `html[${ROOT_ATTRIBUTE}] body .page_head .pagehead_titicon.ngall.sp_img::before`
        });
    }

    const __dcufGalleryPageHeadHostAdapter = (() => {
        const ROOT_SELECTOR = '.page_head';
        const ROLE_ATTRIBUTE = 'data-dcuf-gallery-page-head-role';
        const OWNED_ROLES = new Set(['root', 'left', 'right', 'both', 'utility-control', 'utility-icon', 'settings-anchor', 'settings-layer', 'menu-list', 'menu-control', 'menu-toggle', 'guide-layer', 'guide-backdrop', 'layer-anchor', 'layer-panel', 'layer-head', 'layer-title', 'layer-body', 'layer-close', 'layer-actions']);
        const EXTERNAL_LAYER_SELECTOR = '.user_guide_popup.pop_wrap, .user_guide_popup.pop_bg';
        const STYLE_ID = 'dcuf-gallery-page-head-style';
        const SUBSCRIBER_KEY = 'gallery-page-head-style';
        const states = new Map();
        let activeCoordinator = null;
        let mutationUnsubscribe = null;
        let styleOwner = null;

        const surfaceContexts = __dcufReadHeaderPresentationContexts;
        const supportsSurface = () => surfaceContexts().length > 0;

        const ensureStyle = () => {
            if (!supportsSurface()) return false;
            const definition = __dcufGalleryPageHeadPresenter?.style;
            if (definition?.id !== STYLE_ID) return false;
            if (styleOwner?.isConnected) return true;
            const existing = document.getElementById(STYLE_ID);
            if (existing) {
                if (existing.getAttribute('data-dcuf-style-owner') !== 'gallery-page-head-presenter') return false;
                styleOwner = existing;
                return true;
            }
            const target = document.head || document.documentElement;
            if (!target) return false;
            styleOwner = document.createElement('style');
            styleOwner.id = STYLE_ID;
            styleOwner.setAttribute('data-dcuf-style-owner', 'gallery-page-head-presenter');
            styleOwner.textContent = definition.css;
            target.appendChild(styleOwner);
            return true;
        };

        const restoreRoles = (state) => {
            state.baselines.forEach((original, element) => {
                if (original === null) element.removeAttribute(ROLE_ATTRIBUTE);
                else element.setAttribute(ROLE_ATTRIBUTE, original);
            });
            state.baselines.clear();
        };

        const syncRoles = (state) => {
            const desired = new Map([[state.root, 'root']]);
            Array.from(state.root.children).forEach((element) => {
                if (!(element instanceof HTMLElement)) return;
                const left = element.classList.contains('fl');
                const right = element.classList.contains('fr');
                if (left || right) desired.set(element, left && right ? 'both' : left ? 'left' : 'right');
            });
            const parts = (root, selector, role) => root?.querySelectorAll(selector).forEach((element) => desired.set(element, role));
            Array.from(state.root.children).filter(element => element.classList.contains('fr')).forEach(right => {
                right.querySelectorAll(':scope > button, :scope > span > button, :scope > div > button').forEach(button => {
                    if (button.classList.contains('dcuf-header-drawer__toggle') || button.closest('.pop_tipbox, .pop_wrap, .pop_bg')) return;
                    desired.set(button, 'utility-control');
                    parts(button, 'em.icon_relate_more, em.icon_listmore', 'utility-icon');
                });
            });
            const menu = state.root.querySelector('#setting_list');
            if (menu) {
                if (menu.parentElement) desired.set(menu.parentElement, 'settings-anchor');
                desired.set(menu, 'settings-layer');
                parts(menu, 'ul', 'menu-list');
                parts(menu, 'li > button, li > .checkbox > label', 'menu-control');
                parts(menu, 'li > .checkbox', 'menu-toggle');
            }
            if (state.root === document.querySelector(ROOT_SELECTOR)) document.querySelectorAll(EXTERNAL_LAYER_SELECTOR).forEach((layer) => {
                desired.set(layer, layer.classList.contains('pop_wrap') ? 'guide-layer' : 'guide-backdrop');
                if (layer.parentElement) desired.set(layer.parentElement, 'layer-anchor');
                parts(layer, ':scope > .pop_content', 'layer-panel');
                parts(layer, '.pop_head', 'layer-head');
                parts(layer, '.pop_head > h3', 'layer-title');
                parts(layer, '.caption_box', 'layer-body');
                parts(layer, '.btn_box', 'layer-actions');
                parts(layer, '.poply_whiteclose, .poply_close', 'layer-close');
            });
            state.baselines.forEach((original, element) => {
                if (desired.has(element)) return;
                if (original === null) element.removeAttribute(ROLE_ATTRIBUTE);
                else element.setAttribute(ROLE_ATTRIBUTE, original);
                state.baselines.delete(element);
            });
            desired.forEach((role, element) => {
                if (!state.baselines.has(element)) {
                    const original = element.getAttribute(ROLE_ATTRIBUTE);
                    state.baselines.set(element, OWNED_ROLES.has(original) ? null : original);
                }
                if (element.getAttribute(ROLE_ATTRIBUTE) !== role) element.setAttribute(ROLE_ATTRIBUTE, role);
            });
        };

        const disconnectRoot = (root) => {
            const state = states.get(root);
            if (!state) return;
            restoreRoles(state);
            states.delete(root);
        };

        const connectRoot = (root) => {
            if (!(root instanceof HTMLElement) || !root.matches(ROOT_SELECTOR)) return;
            let state = states.get(root);
            if (!state) {
                state = { root, baselines: new Map() };
                states.set(root, state);
            }
            syncRoles(state);
        };

        const collectRoots = (root) => {
            const queryRoot = root instanceof Document || root instanceof Element || root instanceof DocumentFragment
                ? root
                : document;
            const roots = new Set();
            if (queryRoot instanceof Element) {
                if (queryRoot.matches(ROOT_SELECTOR)) roots.add(queryRoot);
                const closest = queryRoot.closest(ROOT_SELECTOR);
                if (closest) roots.add(closest);
            }
            queryRoot.querySelectorAll?.(ROOT_SELECTOR).forEach((candidate) => roots.add(candidate));
            return roots;
        };

        const snapshot = () => Object.freeze({ connected: states.size > 0, activeRoots: states.size });
        const refresh = (root = document) => {
            Array.from(states.keys()).filter((candidate) => !candidate.isConnected).forEach(disconnectRoot);
            collectRoots(root).forEach(connectRoot);
            return snapshot();
        };

        const ensureMutationSubscription = (runtimeCoordinator) => {
            if (!runtimeCoordinator || typeof runtimeCoordinator.subscribeMutations !== 'function') return;
            const contexts = surfaceContexts();
            if (!contexts.length || runtimeCoordinator.pageSupports?.(contexts) === false) return;
            if (activeCoordinator === runtimeCoordinator && typeof mutationUnsubscribe === 'function') return;
            mutationUnsubscribe?.();
            activeCoordinator = runtimeCoordinator;
            mutationUnsubscribe = runtimeCoordinator.subscribeMutations(
                SUBSCRIBER_KEY,
                (payload) => {
                    const movedRoot = [...(payload.addedElements || []), ...(payload.removedElements || [])]
                        .some((node) => node instanceof Element && (
                            node.classList.contains('page_head') || node.getElementsByClassName('page_head').length > 0
                            || node.matches(EXTERNAL_LAYER_SELECTOR) || node.querySelector(EXTERNAL_LAYER_SELECTOR)
                        ));
                    const changedInsideRoot = (payload.childListTargets || []).some((node) => (
                        node instanceof Element && (node.matches(ROOT_SELECTOR) || node.closest(ROOT_SELECTOR) instanceof HTMLElement
                            || node.matches(EXTERNAL_LAYER_SELECTOR) || node.closest(EXTERNAL_LAYER_SELECTOR) instanceof HTMLElement)
                    ));
                    if (movedRoot || changedInsideRoot) refresh(document);
                },
                { contexts }
            );
        };

        const connect = (root = document, { runtimeCoordinator = activeCoordinator } = {}) => {
            if (!supportsSurface()) return snapshot();
            ensureStyle();
            ensureMutationSubscription(runtimeCoordinator);
            return refresh(root);
        };

        const dispose = () => {
            Array.from(states.keys()).reverse().forEach(disconnectRoot);
            styleOwner?.remove();
            styleOwner = null;
            mutationUnsubscribe?.();
            mutationUnsubscribe = null;
            activeCoordinator = null;
        };

        const snapshotResources = () => Object.freeze({
            activeRoots: states.size,
            mutationSubscribers: typeof mutationUnsubscribe === 'function' ? 1 : 0,
        });

        return Object.freeze({ describeStyleSelectors: __dcufDescribeGalleryPageHeadStyleSelectors, describeThemeSelectors: __dcufDescribeGalleryPageHeadThemeSelectors, connect, refresh, dispose, ensureStyle, snapshot, snapshotResources });
    })();
    __dcufRoot.__dcufGalleryPageHeadHostAdapter = __dcufGalleryPageHeadHostAdapter;
