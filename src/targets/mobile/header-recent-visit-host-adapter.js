    const __dcufHeaderRecentVisitHostAdapter = (() => {
        const ROOT_SELECTOR = '.newvisit_history';
        const STYLE_ID = 'dcuf-header-recent-visit-style';
        const ROLE_ATTRIBUTE = 'data-dcuf-header-recent-visit-role';
        const OWNED_ROLES = new Set(['root', 'title', 'box', 'list', 'item', 'control', 'arrow']);
        const LIST_SELECTOR = ':scope > .newvisit_box > .newvisit_list';
        const CONTROL_SELECTOR = '.btn_visit_prev,.btn_visit_next,.bnt_visit_prev,.bnt_visit_next';
        const PREV_SELECTOR = ':scope > .btn_visit_prev,:scope > .bnt_visit_prev';
        const NEXT_SELECTOR = ':scope > .btn_visit_next,:scope > .bnt_visit_next';
        const BOUND_ATTRIBUTE = 'data-dcuf-recent-navigation-bound';
        const BASELINE_ATTRIBUTE = 'data-dcuf-recent-navigation-baseline';
        const SUBSCRIBER_KEY = 'header-recent-visit-navigation';
        const states = new Map();
        let activeCoordinator = null;
        let mutationUnsubscribe = null;
        let clickBound = false;
        let rootReplaced = false;
        let detachedRootPending = false;
        let styleOwner = null;

        const deepFreeze = (value) => {
            if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
            Object.values(value).forEach(deepFreeze);
            return Object.freeze(value);
        };

        const readStyle = (element, property) => ({
            value: element.style.getPropertyValue(property),
            priority: element.style.getPropertyPriority(property),
        });

        const writeStyle = (element, property, snapshot) => {
            if (snapshot?.value) element.style.setProperty(property, snapshot.value, snapshot.priority || '');
            else element.style.removeProperty(property);
        };

        const getControl = (root, direction) => root.querySelector(direction === 'prev' ? PREV_SELECTOR : NEXT_SELECTOR);

        const ensureStyle = () => {
            const definition = __dcufHeaderRecentVisitPresenter?.style;
            if (definition?.id !== STYLE_ID) return false;
            if (styleOwner?.isConnected) return true;
            const existing = document.getElementById(STYLE_ID);
            if (existing) {
                if (existing.getAttribute('data-dcuf-style-owner') !== 'header-recent-visit-presenter') return false;
                styleOwner = existing;
                return true;
            }
            const target = document.head || document.documentElement;
            if (!target) return false;
            styleOwner = document.createElement('style');
            styleOwner.id = STYLE_ID;
            styleOwner.setAttribute('data-dcuf-style-owner', 'header-recent-visit-presenter');
            styleOwner.textContent = definition.css;
            target.appendChild(styleOwner);
            return true;
        };

        const restoreRoles = (state) => {
            state.roleBaselines.forEach((original, element) => {
                if (original === null) element.removeAttribute(ROLE_ATTRIBUTE);
                else element.setAttribute(ROLE_ATTRIBUTE, original);
            });
            state.roleBaselines.clear();
        };

        const syncStyleRoles = (state) => {
            const { root, list } = state;
            const desired = new Map([[root, 'root'], [list, 'list']]);
            const title = root.querySelector(':scope > .tit');
            const box = root.querySelector(':scope > .newvisit_box');
            if (title instanceof HTMLElement) desired.set(title, 'title');
            if (box instanceof HTMLElement) desired.set(box, 'box');
            list.querySelectorAll('li').forEach((item) => desired.set(item, 'item'));
            root.querySelectorAll(':scope > :is(.btn_open,.btn_visit_prev,.btn_visit_next,.bnt_visit_prev,.bnt_visit_next,.btn_newvisit_more,.bnt_newvisit_more)')
                .forEach((control) => {
                    const arrow = control.matches('.btn_visit_prev,.btn_visit_next,.bnt_visit_prev,.bnt_visit_next');
                    desired.set(control, arrow ? 'arrow' : 'control');
                });
            state.roleBaselines.forEach((original, element) => {
                if (desired.has(element)) return;
                if (original === null) element.removeAttribute(ROLE_ATTRIBUTE);
                else element.setAttribute(ROLE_ATTRIBUTE, original);
                state.roleBaselines.delete(element);
            });
            desired.forEach((role, element) => {
                if (!(element instanceof HTMLElement)) return;
                if (!state.roleBaselines.has(element)) {
                    const original = element.getAttribute(ROLE_ATTRIBUTE);
                    state.roleBaselines.set(element, OWNED_ROLES.has(original) ? null : original);
                }
                element.setAttribute(ROLE_ATTRIBUTE, role);
            });
        };

        const makeBaseline = (root, list) => {
            const prev = getControl(root, 'prev');
            const next = getControl(root, 'next');
            return {
                list: {
                    left: readStyle(list, 'left'),
                    marginLeft: readStyle(list, 'margin-left'),
                    marker: list.getAttribute(BOUND_ATTRIBUTE),
                    baseline: list.getAttribute(BASELINE_ATTRIBUTE),
                },
                prev: prev instanceof HTMLElement ? {
                    on: prev.classList.contains('on'),
                    ariaDisabled: prev.getAttribute('aria-disabled'),
                } : null,
                next: next instanceof HTMLElement ? {
                    on: next.classList.contains('on'),
                    ariaDisabled: next.getAttribute('aria-disabled'),
                } : null,
            };
        };

        const restoreControl = (control, baseline) => {
            if (!(control instanceof HTMLElement) || !baseline) return;
            control.classList.toggle('on', baseline.on);
            if (baseline.ariaDisabled === null) control.removeAttribute('aria-disabled');
            else control.setAttribute('aria-disabled', baseline.ariaDisabled);
        };

        const restoreBaseline = (root, list, baseline) => {
            if (!baseline) return;
            writeStyle(list, 'left', baseline.list?.left);
            writeStyle(list, 'margin-left', baseline.list?.marginLeft);
            if (baseline.list?.marker === null) list.removeAttribute(BOUND_ATTRIBUTE);
            else list.setAttribute(BOUND_ATTRIBUTE, baseline.list.marker);
            if (baseline.list?.baseline === null) list.removeAttribute(BASELINE_ATTRIBUTE);
            else list.setAttribute(BASELINE_ATTRIBUTE, baseline.list.baseline);
            restoreControl(getControl(root, 'prev'), baseline.prev);
            restoreControl(getControl(root, 'next'), baseline.next);
        };

        const decodeCopiedBaseline = (list) => {
            if (list.getAttribute(BOUND_ATTRIBUTE) !== '1') return null;
            const encoded = list.getAttribute(BASELINE_ATTRIBUTE);
            if (!encoded) return null;
            try {
                return JSON.parse(decodeURIComponent(encoded));
            } catch {
                return null;
            }
        };

        const resetCopiedRuntimeState = (root, list) => {
            const baseline = decodeCopiedBaseline(list);
            if (baseline) restoreBaseline(root, list, baseline);
            else {
                list.removeAttribute(BOUND_ATTRIBUTE);
                list.removeAttribute(BASELINE_ATTRIBUTE);
                [getControl(root, 'prev'), getControl(root, 'next')].forEach((control) => {
                    control?.removeAttribute('aria-disabled');
                });
            }
        };

        const updateControls = (state) => {
            if (!state || states.get(state.root) !== state) return;
            const max = Math.max(0, state.list.scrollWidth - state.list.clientWidth);
            const prev = getControl(state.root, 'prev');
            const next = getControl(state.root, 'next');
            const canPrev = state.list.scrollLeft > 1;
            const canNext = state.list.scrollLeft < max - 1;
            prev?.classList.toggle('on', canPrev);
            next?.classList.toggle('on', canNext);
            prev?.setAttribute('aria-disabled', String(!canPrev));
            next?.setAttribute('aria-disabled', String(!canNext));
        };

        const cancelPending = (state) => {
            if (state.frameId) window.cancelAnimationFrame(state.frameId);
            if (state.timerId) window.clearTimeout(state.timerId);
            state.frameId = 0;
            state.timerId = 0;
        };

        const disconnectRoot = (root) => {
            const state = states.get(root);
            if (!state) return;
            cancelPending(state);
            state.list.removeEventListener('scroll', state.handleScroll, { passive: true });
            restoreBaseline(state.root, state.list, state.baseline);
            restoreRoles(state);
            states.delete(root);
        };

        const connectRoot = (root) => {
            if (!(root instanceof HTMLElement) || !root.matches(ROOT_SELECTOR)) return null;
            const list = root.querySelector(LIST_SELECTOR);
            if (!(list instanceof HTMLElement)) return null;
            const existing = states.get(root);
            if (existing?.list === list) {
                syncStyleRoles(existing);
                updateControls(existing);
                return root;
            }
            if (existing) disconnectRoot(root);
            resetCopiedRuntimeState(root, list);
            const baseline = makeBaseline(root, list);
            list.setAttribute(BASELINE_ATTRIBUTE, encodeURIComponent(JSON.stringify(baseline)));
            list.setAttribute(BOUND_ATTRIBUTE, '1');
            list.style.setProperty('left', '0px', 'important');
            list.style.setProperty('margin-left', '0px', 'important');
            const state = {
                root,
                list,
                baseline,
                frameId: 0,
                timerId: 0,
                handleScroll: null,
                roleBaselines: new Map(),
            };
            state.handleScroll = () => {
                if (state.frameId || states.get(root) !== state) return;
                state.frameId = window.requestAnimationFrame(() => {
                    state.frameId = 0;
                    updateControls(state);
                });
            };
            list.addEventListener('scroll', state.handleScroll, { passive: true });
            states.set(root, state);
            syncStyleRoles(state);
            updateControls(state);
            return root;
        };

        const collectRoots = (root = document) => {
            const queryRoot = root instanceof Document || root instanceof Element || root instanceof DocumentFragment
                ? root
                : document;
            const roots = [];
            if (queryRoot instanceof Element) {
                if (queryRoot.matches(ROOT_SELECTOR)) roots.push(queryRoot);
                const closest = queryRoot.closest(ROOT_SELECTOR);
                if (closest instanceof HTMLElement && !roots.includes(closest)) roots.push(closest);
            }
            queryRoot.querySelectorAll?.(ROOT_SELECTOR).forEach((candidate) => {
                if (!roots.includes(candidate)) roots.push(candidate);
            });
            return roots;
        };

        const refresh = (root = document) => {
            const detachedRoots = Array.from(states.keys()).filter((candidate) => !candidate.isConnected);
            detachedRoots.forEach(disconnectRoot);
            if (detachedRoots.length > 0) detachedRootPending = true;
            const connected = collectRoots(root).map(connectRoot).filter(Boolean);
            if (detachedRootPending && connected.length > 0) {
                rootReplaced = true;
                detachedRootPending = false;
            }
            return connected;
        };

        const handleClick = (event) => {
            const target = event.target instanceof Element ? event.target : null;
            const button = target?.closest(CONTROL_SELECTOR);
            const root = button?.closest(ROOT_SELECTOR);
            if (!(button instanceof HTMLElement) || !(root instanceof HTMLElement) || button.parentElement !== root) return;
            const connectedRoot = connectRoot(root);
            const state = connectedRoot ? states.get(root) : null;
            if (!state) return;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            const direction = button.matches('.btn_visit_prev,.bnt_visit_prev') ? -1 : 1;
            const max = Math.max(0, state.list.scrollWidth - state.list.clientWidth);
            const step = Math.max(1, state.list.clientWidth - 24);
            let targetLeft = Math.max(0, Math.min(max, state.list.scrollLeft + direction * step));
            const edgeTolerance = Math.min(96, Math.max(32, step * 0.2));
            if (direction < 0 && targetLeft <= edgeTolerance) targetLeft = 0;
            if (direction > 0 && max - targetLeft <= edgeTolerance) targetLeft = max;
            const behavior = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
            state.list.scrollTo({ left: targetLeft, behavior });
            if (state.timerId) window.clearTimeout(state.timerId);
            state.timerId = window.setTimeout(() => {
                state.timerId = 0;
                if (states.get(root) !== state) return;
                if (targetLeft === 0 || targetLeft === max) state.list.scrollLeft = targetLeft;
                updateControls(state);
            }, behavior === 'smooth' ? 360 : 0);
        };

        const ensureDocumentListener = () => {
            if (clickBound) return;
            document.addEventListener('click', handleClick, true);
            clickBound = true;
        };

        const ensureMutationSubscription = (runtimeCoordinator) => {
            if (!runtimeCoordinator || typeof runtimeCoordinator.subscribeMutations !== 'function') return;
            if (runtimeCoordinator.pageSupports?.(['list-surface']) === false) return;
            if (activeCoordinator === runtimeCoordinator && typeof mutationUnsubscribe === 'function') return;
            mutationUnsubscribe?.();
            mutationUnsubscribe = null;
            activeCoordinator = runtimeCoordinator;
            mutationUnsubscribe = runtimeCoordinator.subscribeMutations(
                SUBSCRIBER_KEY,
                (payload) => {
                    const movedRoot = [...(payload.addedElements || []), ...(payload.removedElements || [])]
                        .some((node) => node instanceof Element && (
                            node.matches(ROOT_SELECTOR)
                            || node.querySelector(ROOT_SELECTOR) instanceof HTMLElement
                        ));
                    const changedInsideRoot = (payload.childListTargets || []).some((node) => (
                        node instanceof Element
                        && (node.matches(ROOT_SELECTOR) || node.closest(ROOT_SELECTOR) instanceof HTMLElement)
                    ));
                    if (movedRoot || changedInsideRoot) refresh(document);
                },
                { contexts: ['list-surface'] }
            );
        };

        const connect = (root = document, { runtimeCoordinator = activeCoordinator } = {}) => {
            if (window.__dcufPageContext?.hasListSurface || collectRoots(root).length > 0) ensureStyle();
            ensureDocumentListener();
            ensureMutationSubscription(runtimeCoordinator);
            refresh(root);
            return snapshot();
        };

        const dispose = () => {
            Array.from(states.keys()).reverse().forEach(disconnectRoot);
            styleOwner?.remove();
            styleOwner = null;
            mutationUnsubscribe?.();
            mutationUnsubscribe = null;
            activeCoordinator = null;
            if (clickBound) document.removeEventListener('click', handleClick, true);
            clickBound = false;
            rootReplaced = false;
            detachedRootPending = false;
        };

        const snapshot = () => deepFreeze({
            connected: states.size > 0,
            activeRoots: states.size,
            rootReplaced,
        });

        const snapshotResources = () => {
            let timers = 0;
            let animationFrames = 0;
            states.forEach((state) => {
                if (state.timerId) timers += 1;
                if (state.frameId) animationFrames += 1;
            });
            return deepFreeze({
                activeRoots: states.size,
                scrollListeners: states.size,
                documentListeners: clickBound ? 1 : 0,
                mutationSubscribers: typeof mutationUnsubscribe === 'function' ? 1 : 0,
                timers,
                animationFrames,
            });
        };

        return Object.freeze({
            connect,
            refresh,
            dispose,
            ensureStyle,
            snapshot,
            snapshotResources,
        });
    })();
    __dcufRoot.__dcufHeaderRecentVisitHostAdapter = __dcufHeaderRecentVisitHostAdapter;
