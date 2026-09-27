    const __dcufGalleryPageHeadHostAdapter = (() => {
        const ROOT_SELECTOR = '.page_head';
        const ROLE_ATTRIBUTE = 'data-dcuf-gallery-page-head-role';
        const OWNED_ROLES = new Set(['root', 'left', 'right', 'both']);
        const STYLE_ID = 'dcuf-gallery-page-head-style';
        const SUBSCRIBER_KEY = 'gallery-page-head-style';
        const states = new Map();
        let activeCoordinator = null;
        let mutationUnsubscribe = null;
        let styleOwner = null;

        const supportsSurface = () => window.__dcufPageContext?.hasListSurface === true;

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
                element.setAttribute(ROLE_ATTRIBUTE, role);
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
            if (runtimeCoordinator.pageSupports?.(['list-surface']) === false) return;
            if (activeCoordinator === runtimeCoordinator && typeof mutationUnsubscribe === 'function') return;
            mutationUnsubscribe?.();
            activeCoordinator = runtimeCoordinator;
            mutationUnsubscribe = runtimeCoordinator.subscribeMutations(
                SUBSCRIBER_KEY,
                (payload) => {
                    const movedRoot = [...(payload.addedElements || []), ...(payload.removedElements || [])]
                        .some((node) => node instanceof Element && (
                            node.classList.contains('page_head') || node.getElementsByClassName('page_head').length > 0
                        ));
                    const changedInsideRoot = (payload.childListTargets || []).some((node) => (
                        node instanceof Element && (node.matches(ROOT_SELECTOR) || node.closest(ROOT_SELECTOR) instanceof HTMLElement)
                    ));
                    if (movedRoot || changedInsideRoot) refresh(document);
                },
                { contexts: ['list-surface'] }
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

        return Object.freeze({ connect, refresh, dispose, ensureStyle, snapshot, snapshotResources });
    })();
    __dcufRoot.__dcufGalleryPageHeadHostAdapter = __dcufGalleryPageHeadHostAdapter;
