    // Full native predicates and role relations belong to the target adapter.
    function __dcufDescribeHeaderShellStyleSelectors() {
        return Object.freeze({
            root: "[data-dcuf-header-shell-role=\"root\"].typea",
            head: "[data-dcuf-header-shell-role=\"head\"]",
            logo: "[data-dcuf-header-shell-role=\"head\"] h1[data-dcuf-header-shell-role=\"logo\"]",
            logoImage: "[data-dcuf-header-shell-role=\"head\"] h1[data-dcuf-header-shell-role=\"logo\"] img:is([data-dcuf-header-shell-role=\"logo-image\"], [data-dcuf-header-shell-role=\"logo-image-both\"])",
            logoImageAlt: "[data-dcuf-header-shell-role=\"head\"] h1[data-dcuf-header-shell-role=\"logo\"] img:is([data-dcuf-header-shell-role=\"logo-image-alt\"], [data-dcuf-header-shell-role=\"logo-image-both\"])",
            searchWrap: "[data-dcuf-header-shell-role=\"head\"] [data-dcuf-header-shell-role=\"search-wrap\"]",
            topSearch: "[data-dcuf-header-shell-role=\"head\"] [data-dcuf-header-shell-role=\"top-search\"]",
            links: "[data-dcuf-header-shell-role=\"head\"] [data-dcuf-header-shell-role=\"links\"]",
            darkRoot: "body.dc-filter-dark-mode [data-dcuf-header-shell-role=\"root\"].typea",
            layout: "[data-dcuf-header-layout]",
            bridge: "[data-dcuf-header-bridge]",
            brandMark: "[data-dcuf-header-shell-role=\"head\"] h1[data-dcuf-header-shell-role=\"logo\"] > a[data-dcuf-header-shell-role=\"brand-mark\"]",
            searchField: "[data-dcuf-header-shell-role=\"head\"] [data-dcuf-header-shell-role=\"top-search\"] :is(input.in_keyword, input)",
            nativeTip: "[data-dcuf-header-shell-role=\"head\"] [data-dcuf-header-shell-role=\"links\"] .darkmodebox > .pop_tipbox"
        });
    }

    // Hoisted input: preserve native coverage before objects initialize or connect.
    function __dcufDescribeHeaderShellThemeSelectors(ROOT_ATTRIBUTE) {
        return Object.freeze({
            root: `html[${ROOT_ATTRIBUTE}] body .dcheader.typea`,
            search: `html[${ROOT_ATTRIBUTE}] body .dchead .top_search`,
            searchButton: `html[${ROOT_ATTRIBUTE}] body .dchead .top_search .bnt_search`,
            spriteButton: `html[${ROOT_ATTRIBUTE}] body .dchead .top_search button.sp_img.bnt_search`,
            login: `html[${ROOT_ATTRIBUTE}] body .dchead .area_links .btn_login`,
            logout: `html[${ROOT_ATTRIBUTE}] body .dchead .area_links .btn_top_loginout`,
            searchInset: `html[${ROOT_ATTRIBUTE}] body .dchead .top_search`,
            searchField: `html[${ROOT_ATTRIBUTE}] body .dchead .top_search :is(input, .inner_search)`,
            buttonDecoration: `html[${ROOT_ATTRIBUTE}] body .dchead .top_search .bnt_search::before`,
            spriteDecoration: `html[${ROOT_ATTRIBUTE}] body .dchead .top_search button.sp_img.bnt_search::before`
        });
    }

    // Hoisted input: preserve native coverage before objects initialize or connect.
    function __dcufDescribeHeaderShellResetSelectors() {
        return Object.freeze({
            root: `.dcheader`
        });
    }

    const __dcufHeaderShellHostAdapter = (() => {
        const ROOT_SELECTOR = '.dcheader.typea';
        const ROLE_ATTRIBUTE = 'data-dcuf-header-shell-role';
        const OWNED_ROLES = new Set(['root', 'head', 'logo', 'brand-mark', 'logo-image', 'logo-image-alt', 'logo-image-both', 'search-wrap', 'top-search', 'links']);
        const STYLE_ID = 'dcuf-header-shell-style';
        const SUBSCRIBER_KEY = 'header-shell-style';
        const states = new Map();
        let activeCoordinator = null;
        let mutationUnsubscribe = null;
        let styleOwner = null;
        let utilitySerial = 0;

        const restoreUtility = (state) => {
            const utility = state.utility;
            if (!utility) return;
            if (utility.list.matches(':popover-open')) utility.list.hidePopover();
            utility.list.removeEventListener('toggle', utility.onToggle);
            utility.button.remove();
            for (const [name, value] of utility.attributes) {
                if (value === null) utility.list.removeAttribute(name);
                else utility.list.setAttribute(name, value);
            }
            utility.list.removeAttribute('data-dcuf-header-utility-baseline');
            state.utility = null;
        };

        const syncUtility = (state) => {
            const links = state.root.querySelector('.dchead .area_links');
            const list = links?.querySelector(':scope > ul');
            // A host rerender may copy only our invoker, without its UL ledger.
            links?.querySelectorAll(':scope > [data-dcuf-header-utility-toggle="1"]').forEach(button => {
                if (state.utility?.list !== list || button !== state.utility?.button) button.remove();
            });
            if (state.utility && state.utility.list === list && state.utility.button.parentNode === links) {
                if (!list.id) list.id = state.utility.button.getAttribute('popovertarget');
                if (!list.hasAttribute('popover')) list.setAttribute('popover', 'auto');
                state.utility.button.setAttribute('popovertarget', list.id);
                return;
            }
            restoreUtility(state);
            const copied = list?.getAttribute('data-dcuf-header-utility-baseline');
            if (copied) {
                try {
                    const baseline = JSON.parse(decodeURIComponent(copied));
                    if (Array.isArray(baseline) && baseline.length === 2 && baseline.every(([name, value]) => ['id', 'popover'].includes(name) && (value === null || typeof value === 'string'))) {
                        baseline.forEach(([name, value]) => value === null ? list.removeAttribute(name) : list.setAttribute(name, value));
                    }
                } catch (_) { /* Malformed copied state cannot confer ownership. */ }
                list.removeAttribute('data-dcuf-header-utility-baseline');
                links.querySelectorAll(':scope > [data-dcuf-header-utility-toggle="1"]').forEach(button => button.remove());
            }
            // Native popover provides light-dismiss, Escape and focus handling.
            // Unsupported engines keep the original expanded native links.
            if (!(list instanceof HTMLElement) || typeof list.showPopover !== 'function' || list.hasAttribute('popover')) return;
            const attributes = ['id', 'popover'].map(name => [name, list.getAttribute(name)]);
            list.setAttribute('data-dcuf-header-utility-baseline', encodeURIComponent(JSON.stringify(attributes)));
            if (!list.id) list.id = `dcuf-header-utilities-${++utilitySerial}`;
            list.setAttribute('popover', 'auto');
            const button = document.createElement('button');
            const description = __dcufHeaderShellPresenter.describeUtilityToggle();
            button.type = 'button'; button.textContent = description.text;
            button.setAttribute('aria-label', description.label);
            button.setAttribute('aria-expanded', 'false');
            button.setAttribute('data-dcuf-header-utility-toggle', '1');
            button.setAttribute('popovertarget', list.id);
            links.append(button);
            const onToggle = () => button.setAttribute('aria-expanded', String(list.matches(':popover-open')));
            list.addEventListener('toggle', onToggle);
            state.utility = {list, button, attributes, onToggle};
        };

        const supportsSurface = () => window.__dcufPageContext?.hasListSurface === true;

        const ensureStyle = () => {
            if (!supportsSurface()) return false;
            const definition = __dcufHeaderShellPresenter?.style;
            if (definition?.id !== STYLE_ID) return false;
            if (styleOwner?.isConnected) return true;
            const existing = document.getElementById(STYLE_ID);
            if (existing) {
                if (existing.getAttribute('data-dcuf-style-owner') !== 'header-shell-presenter') return false;
                styleOwner = existing;
                return true;
            }
            const target = document.head || document.documentElement;
            if (!target) return false;
            styleOwner = document.createElement('style');
            styleOwner.id = STYLE_ID;
            styleOwner.setAttribute('data-dcuf-style-owner', 'header-shell-presenter');
            styleOwner.textContent = definition.css;
            target.appendChild(styleOwner);
            return true;
        };

        const restoreRoles = (state) => {
            restoreUtility(state);
            state.layoutBaselines.forEach((attributes, element) => attributes.forEach((value, name) => {
                if (value === null) element.removeAttribute(name);
                else element.setAttribute(name, value);
            }));
            state.layoutBaselines.clear();
            state.baselines.forEach((original, element) => {
                if (original === null) element.removeAttribute(ROLE_ATTRIBUTE);
                else element.setAttribute(ROLE_ATTRIBUTE, original);
            });
            state.baselines.clear();
        };

        const syncRoles = (state) => {
            syncUtility(state);
            // The real host has sibling chrome; older fixtures nest it in HEADER.
            // Project layout onto existing parents only. Never move native nodes.
            const layout = state.root.parentElement?.matches('.dcwrap') ? state.root.parentElement : state.root;
            const desiredLayout = new Map([[layout, ['data-dcuf-header-layout', layout === state.root ? 'self' : 'parent']]]);
            const bridge = layout.querySelector(':scope > .visit_bookmark');
            if (bridge?.querySelector('.newvisit_history')) desiredLayout.set(bridge, ['data-dcuf-header-bridge', '1']);
            state.layoutBaselines.forEach((attributes, element) => {
                if (desiredLayout.has(element)) return;
                attributes.forEach((value, name) => value === null ? element.removeAttribute(name) : element.setAttribute(name, value));
                state.layoutBaselines.delete(element);
            });
            desiredLayout.forEach(([name, value], element) => {
                if (!state.layoutBaselines.has(element)) {
                    const original = element.getAttribute(name);
                    state.layoutBaselines.set(element, new Map([[name, ['self', 'parent', '1'].includes(original) ? null : original]]));
                }
                if (element.getAttribute(name) !== value) element.setAttribute(name, value);
            });
            const desired = new Map([[state.root, 'root']]);
            state.root.querySelectorAll('.dchead').forEach((head) => {
                desired.set(head, 'head');
                head.querySelectorAll('h1:is(.dc_logo,.dclogo)').forEach((logo) => {
                    desired.set(logo, 'logo');
                    logo.querySelectorAll(':scope > a.logo_img').forEach(anchor => desired.set(anchor, 'brand-mark'));
                    logo.querySelectorAll('img.logo_img,img.logo_img2').forEach((image) => {
                        const primary = image.classList.contains('logo_img');
                        const alternate = image.classList.contains('logo_img2');
                        desired.set(image, primary && alternate ? 'logo-image-both' : primary ? 'logo-image' : 'logo-image-alt');
                    });
                });
                head.querySelectorAll('.wrap_search').forEach((search) => desired.set(search, 'search-wrap'));
                head.querySelectorAll('.top_search').forEach((search) => desired.set(search, 'top-search'));
                head.querySelectorAll('.area_links').forEach((links) => desired.set(links, 'links'));
            });
            state.baselines.forEach((original, element) => {
                if (desired.has(element)) return;
                if (original === null) element.removeAttribute(ROLE_ATTRIBUTE);
                else element.setAttribute(ROLE_ATTRIBUTE, original);
                state.baselines.delete(element);
            });
            desired.forEach((role, element) => {
                if (!(element instanceof HTMLElement)) return;
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
                state = { root, baselines: new Map(), layoutBaselines: new Map() };
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
                            node.matches(ROOT_SELECTOR) || node.querySelector(ROOT_SELECTOR) instanceof HTMLElement
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
            utilityToggleListeners: Array.from(states.values()).filter(state => state.utility).length,
        });

        return Object.freeze({ describeStyleSelectors: __dcufDescribeHeaderShellStyleSelectors, describeThemeSelectors: __dcufDescribeHeaderShellThemeSelectors, describeResetSelectors: __dcufDescribeHeaderShellResetSelectors, connect, refresh, dispose, ensureStyle, snapshot, snapshotResources });
    })();
    __dcufRoot.__dcufHeaderShellHostAdapter = __dcufHeaderShellHostAdapter;
