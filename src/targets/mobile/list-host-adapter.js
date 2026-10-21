    const __dcufListHostAdapter = (() => {
        const SEMANTIC_ATTRIBUTES = Object.freeze([
            'data-dcuf-surface',
            'data-dcuf-role',
            'data-dcuf-state',
            'data-dcuf-controls-ready',
            'data-dcuf-search-layer-bound',
            'data-dcuf-force-refresh-bound',
            'data-dcuf-scroll',
            'aria-current',
        ]);
        const controlTransactions = new WeakMap();
        const paginationListeners = new WeakMap();
        const searchDrawerRoots = new Set();
        const searchRootsByOwner = new WeakMap();
        const ownerBySearchRoot = new WeakMap();
        const STYLE_ID = 'dcuf-phase1-list-theme';
        const SEARCH_FORM_SELECTOR = 'form[name="frmSearch"]';
        const SEARCH_LAYER_SELECTOR = '#searchTypeLayer';
        const SEARCH_BOUND_ATTR = 'data-dcuf-search-layer-bound';
        const PAGINATION_BOUND_ATTR = 'data-dcuf-force-refresh-bound';
        let searchDrawerHandlersBound = false;
        let searchDrawerRafId = 0;
        let searchDrawerTimerId = 0;
        const scrollToolbars = new Map();
        let scrollFrameId = 0;
        let scrollEventsBound = false;
        let pointerHeld = false;
        let keyboardNavigation = false;
        let scrollMeasurePending = false;
        let scrollPopupPending = false;
        const scrollPosition = () => window.scrollY || 0;
        const measureScrollToolbar = (state) => {
            state.spacer.removeAttribute('data-dcuf-scroll-active');
            state.toolbar.setAttribute('data-dcuf-scroll', 'measuring');
            const rect = state.toolbar.getBoundingClientRect();
            state.origin = rect.top + scrollPosition();
            state.height = rect.height;
            state.spacer.style.setProperty('--dcuf-scroll-size', `${rect.height}px`);
            state.lastY = scrollPosition();
            state.direction = 0;
            state.travel = 0;
            state.mode = state.lastY <= state.origin + state.height ? 'top' : 'shown';
            state.toolbar.setAttribute('data-dcuf-scroll', state.mode);
        };
        const updatePopupHold = (state) => {
            state.popupOpen = Array.from(state.toolbar.querySelectorAll('[data-dcuf-role="category-popup"], [data-dcuf-role="page-size-popup"]'))
                .some(popup => !(popup.matches('[data-dcuf-role="page-size-popup"]') && popup.parentElement?.querySelector('select'))
                    && popup.getClientRects().length > 0 && getComputedStyle(popup).visibility !== 'hidden');
        };
        const syncScrollToolbars = () => {
            scrollFrameId = 0;
            const y = scrollPosition();
            const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
            scrollToolbars.forEach(state => {
                if (!state.toolbar.isConnected || !state.owner.isConnected) { disconnectScrollToolbar(state.owner); return; }
                if (scrollMeasurePending) measureScrollToolbar(state);
                if (scrollPopupPending) updatePopupHold(state);
                if (y < 0 || y > max + 1) return;
                const active = document.activeElement;
                const focused = state.toolbar.contains(active);
                const held = pointerHeld || keyboardNavigation || state.popupOpen || focused;
                const delta = y - state.lastY;
                state.lastY = y;
                if (held || state.held !== held) {
                    state.direction = 0; state.travel = 0;
                    state.mode = y <= state.origin + state.height ? 'top' : 'shown';
                } else if (y <= state.origin + state.height) {
                    state.mode = 'top'; state.direction = 0; state.travel = 0;
                } else if (delta) {
                    const direction = Math.sign(delta);
                    state.travel = direction === state.direction ? state.travel + Math.abs(delta) : Math.abs(delta);
                    state.direction = direction;
                    const threshold = direction > 0 ? 24 : 12;
                    if (state.travel >= threshold) state.mode = direction > 0 ? 'hidden' : 'shown';
                }
                state.held = held;
                const floating = state.mode !== 'top';
                state.spacer.toggleAttribute('data-dcuf-scroll-active', floating);
                // Commit both flow changes before measuring: a layout read with
                // spacer AND toolbar in flow would trigger scroll anchoring.
                if (state.toolbar.getAttribute('data-dcuf-scroll') !== state.mode) state.toolbar.setAttribute('data-dcuf-scroll', state.mode);
                if (floating) {
                    const rect = state.spacer.getBoundingClientRect();
                    const left = `${rect.left}px`, width = `${rect.width}px`;
                    if (state.toolbar.style.getPropertyValue('--dcuf-scroll-left') !== left) state.toolbar.style.setProperty('--dcuf-scroll-left', left);
                    if (state.toolbar.style.getPropertyValue('--dcuf-scroll-width') !== width) state.toolbar.style.setProperty('--dcuf-scroll-width', width);
                }
            });
            scrollMeasurePending = false;
            scrollPopupPending = false;
        };
        const scheduleScrollToolbars = () => {
            if (!scrollFrameId && scrollToolbars.size) scrollFrameId = requestAnimationFrame(syncScrollToolbars);
        };
        const handleScrollResize = () => { scrollMeasurePending = true; scheduleScrollToolbars(); };
        const handleToolbarInteraction = (event) => {
            if (event.type === 'keydown' && event.key === 'Tab') keyboardNavigation = true;
            if (event.type === 'pointerdown') {
                keyboardNavigation = false;
                pointerHeld = Array.from(scrollToolbars.values()).some(state => state.toolbar.contains(event.target));
            }
            if (event.type === 'pointerup' || event.type === 'pointercancel') pointerHeld = false;
            scrollPopupPending = true;
            if (event.type === 'keydown' && event.key === 'Tab') {
                cancelAnimationFrame(scrollFrameId); scrollFrameId = 0;
                syncScrollToolbars();
                return;
            }
            scheduleScrollToolbars();
        };
        const SCROLL_INTERACTIONS = ['keydown', 'focusin', 'focusout', 'click', 'pointerdown', 'pointerup', 'pointercancel'];
        const restoreScrollGeometry = (state) => {
            state.geometry.forEach(({ name, value, priority }) => {
                if (value) state.toolbar.style.setProperty(name, value, priority);
                else state.toolbar.style.removeProperty(name);
            });
            if (!state.hadStyle && !state.toolbar.style.length) state.toolbar.removeAttribute('style');
        };
        const connectScrollToolbar = (owner, toolbar) => {
            if (!/\/board\/lists\/?$/.test(location.pathname)) return;
            const previous = scrollToolbars.get(owner);
            if (previous?.toolbar === toolbar) { updatePopupHold(previous); scheduleScrollToolbars(); return; }
            if (previous) { restoreScrollGeometry(previous); previous.toolbar.removeAttribute('data-dcuf-scroll'); previous.spacer.remove(); }
            const spacer = document.createElement('div');
            spacer.setAttribute('data-dcuf-scroll-space', '1');
            spacer.setAttribute('aria-hidden', 'true');
            toolbar.before(spacer);
            const geometry = ['--dcuf-scroll-left', '--dcuf-scroll-width'].map(name => ({ name, value: toolbar.style.getPropertyValue(name), priority: toolbar.style.getPropertyPriority(name) }));
            const state = { owner, toolbar, spacer, geometry, hadStyle: toolbar.hasAttribute('style'), lastY: scrollPosition(), direction: 0, travel: 0, held: false, popupOpen: false, mode: 'top' };
            scrollToolbars.set(owner, state);
            measureScrollToolbar(state); updatePopupHold(state);
            if (!scrollEventsBound) {
                window.addEventListener('scroll', scheduleScrollToolbars, { passive: true });
                window.addEventListener('resize', handleScrollResize);
                window.addEventListener('pageshow', handleScrollResize);
                SCROLL_INTERACTIONS.forEach(type => document.addEventListener(type, handleToolbarInteraction, true));
                scrollEventsBound = true;
            }
            scheduleScrollToolbars();
        };
        const disconnectScrollToolbar = (owner) => {
            const state = scrollToolbars.get(owner);
            if (state) restoreScrollGeometry(state);
            state?.spacer.remove();
            state?.toolbar.removeAttribute('data-dcuf-scroll');
            scrollToolbars.delete(owner);
            if (scrollToolbars.size || !scrollEventsBound) return;
            window.removeEventListener('scroll', scheduleScrollToolbars);
            window.removeEventListener('resize', handleScrollResize);
            window.removeEventListener('pageshow', handleScrollResize);
            SCROLL_INTERACTIONS.forEach(type => document.removeEventListener(type, handleToolbarInteraction, true));
            cancelAnimationFrame(scrollFrameId); scrollFrameId = 0;
            scrollEventsBound = false; pointerHeld = false; keyboardNavigation = false; scrollMeasurePending = false; scrollPopupPending = false;
        };
        const deepFreeze = (value) => {
            if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
            Object.values(value).forEach(deepFreeze);
            return Object.freeze(value);
        };
        const describeImageAttributes = (node) => {
            const attributes = { alt: node.getAttribute('alt') || '' };
            const source = node.getAttribute('src');
            if (source?.trim()) {
                try {
                    const url = new URL(source, document.baseURI);
                    if (url.protocol === 'https:' || url.protocol === 'http:') attributes.src = url.href;
                } catch (_) { /* Invalid host media has no renderable source. */ }
            }
            ['width', 'height'].forEach((name) => {
                const value = node.getAttribute(name);
                if (/^[1-9]\d{0,3}$/.test(value || '') && Number(value) <= 4096) attributes[name] = value;
            });
            return attributes;
        };
        const describeNode = (node) => {
            if (node?.nodeType === Node.TEXT_NODE) return { kind: 'text', text: node.textContent || '' };
            if (!(node instanceof Element)) return null;
            const attributes = {};
            Array.from(node.attributes).forEach(({ name, value }) => {
                if (/^(?:aria-[a-z0-9_-]+|data-[a-z0-9_-]+|href|target|title)$/.test(name)) attributes[name] = value;
            });
            if (node.localName === 'img') Object.assign(attributes, describeImageAttributes(node));
            const role = node.matches('.gall_writer') ? 'author-identity'
                : node.matches('.addbox') ? 'author-group'
                : node.matches('.nickname') ? 'author-name'
                : node.matches('.ip') ? 'author-ip'
                : node.matches('.subject_inner') ? 'subject-description'
                : null;
            if (role) attributes['data-dcuf-role'] = role;
            return {
                kind: 'element',
                tag: node.localName,
                classes: Array.from(node.classList),
                attributes,
                children: Array.from(node.childNodes).map(describeNode).filter(Boolean),
            };
        };
        const snapshotRow = (originalRow, rowId) => {
            if (!(originalRow instanceof HTMLElement)) return null;
            const titleContainer = originalRow.querySelector('.gall_tit');
            const writer = originalRow.querySelector('.gall_writer');
            const date = originalRow.querySelector('.gall_date');
            if (!(titleContainer instanceof HTMLElement) || !(writer instanceof HTMLElement) || !(date instanceof HTMLElement)) return null;
            const originalLink = titleContainer.querySelector('a:not(.reply_numbox)');
            const subject = originalRow.querySelector('.gall_subject');
            const reply = titleContainer.querySelector('.reply_num');
            const subjectDescriptor = describeNode(subject);
            if (subjectDescriptor && subject instanceof HTMLElement && !subjectDescriptor.attributes.title) {
                subjectDescriptor.attributes.title = subject.querySelector('.subject_inner')?.textContent?.trim() || subject.textContent.trim();
            }
            const decorations = Array.from(titleContainer.childNodes).filter((node) => {
                if (node === originalLink || node === subject) return false;
                if (node.nodeType === Node.TEXT_NODE) return Boolean(node.textContent?.trim());
                if (!(node instanceof Element)) return false;
                if (node.matches('script, style, template, .gall_subject, .reply_num, .icon_ad')) return false;
                if (reply && node.contains(reply)) return false;
                return true;
            }).map(describeNode).filter(Boolean);
            const classes = originalRow.className.split(/\s+/).filter((name) => name && name !== 'ub-content');
            if (originalRow.querySelector('em.icon_ad')) classes.push('is-ad-post');
            if (originalRow.classList.contains('us-post--notice')) classes.push('notice');
            if (originalRow.classList.contains('us-post--recommend')) classes.push('concept');
            const state = classes.includes('notice') ? 'notice' : classes.includes('concept') ? 'concept' : classes.includes('is-ad-post') ? 'advertisement' : 'normal';
            return deepFreeze({
                rowId,
                classes: [...new Set(classes)],
                state,
                title: {
                    subject: subjectDescriptor,
                    link: originalLink ? {
                        href: originalLink.href,
                        target: originalLink.target || '',
                        children: Array.from(originalLink.childNodes).map(describeNode).filter(Boolean),
                    } : null,
                    decorations,
                    reply: describeNode(reply),
                },
                author: describeNode(writer),
                stats: {
                    views: originalRow.querySelector('.gall_count')?.textContent?.trim() || '0',
                    recommendations: originalRow.querySelector('.gall_recommend')?.textContent?.trim() || '0',
                    date: date.textContent.trim(),
                },
            });
        };
        const createItem = (originalRow, rowId) => {
            const snapshot = snapshotRow(originalRow, rowId);
            if (!snapshot) return null;
            const mount = document.createElement('div');
            mount.innerHTML = __dcufListPresenter.renderPostItem(snapshot).trim();
            const item = mount.firstElementChild;
            return item instanceof HTMLElement ? item : null;
        };
        const getTransaction = (root) => {
            let transaction = controlTransactions.get(root);
            if (!transaction) {
                transaction = new Map();
                controlTransactions.set(root, transaction);
            }
            return transaction;
        };
        const remember = (root, element) => {
            if (!(root instanceof HTMLElement) || !(element instanceof HTMLElement)) return null;
            const transaction = getTransaction(root);
            if (!transaction.has(element)) {
                transaction.set(element, {
                    attributes: Object.fromEntries(SEMANTIC_ATTRIBUTES.map((name) => [name, element.getAttribute(name)])),
                    style: element.getAttribute('style'),
                });
            }
            return element;
        };
        const mark = (root, element, { surface, role, state } = {}) => {
            if (!remember(root, element)) return null;
            if (surface) element.setAttribute('data-dcuf-surface', surface);
            if (role) element.setAttribute('data-dcuf-role', role);
            if (state) element.setAttribute('data-dcuf-state', state);
            return element;
        };
        const releaseInlineGeometry = (root, element, properties) => {
            if (!remember(root, element)) return;
            properties.forEach((property) => element.style.removeProperty(property));
            if (!element.getAttribute('style')?.trim()) element.removeAttribute('style');
        };
        const setSearchDrawerDiagnostics = () => {
            const diagnostics = window.__dcufDiagnostics;
            if (typeof diagnostics?.setGauge !== 'function') return;
            diagnostics.setGauge('ui.searchDrawer.activeRoots', searchDrawerRoots.size);
            diagnostics.setGauge('ui.searchDrawer.globalListeners', searchDrawerHandlersBound ? 4 : 0);
        };
        const getSearchForm = (searchRoot) => {
            if (!(searchRoot instanceof HTMLElement)) return null;
            return searchRoot.matches(SEARCH_FORM_SELECTOR)
                ? searchRoot
                : searchRoot.querySelector(SEARCH_FORM_SELECTOR);
        };
        const unregisterSearchRoot = (searchRoot) => {
            searchDrawerRoots.delete(searchRoot);
            const owner = ownerBySearchRoot.get(searchRoot);
            const ownedRoots = owner instanceof HTMLElement ? searchRootsByOwner.get(owner) : null;
            ownedRoots?.delete(searchRoot);
            ownerBySearchRoot.delete(searchRoot);
        };
        const pruneSearchDrawerRoots = () => {
            searchDrawerRoots.forEach((searchRoot) => {
                if (!searchRoot.isConnected || !(getSearchForm(searchRoot) instanceof HTMLElement)) {
                    unregisterSearchRoot(searchRoot);
                }
            });
            setSearchDrawerDiagnostics();
        };
        const updateSearchDrawerReserve = (searchRoot) => {
            const searchForm = getSearchForm(searchRoot);
            if (!(searchForm instanceof HTMLElement)) return;
            const layer = searchForm.querySelector(SEARCH_LAYER_SELECTOR);
            if (!(layer instanceof HTMLElement)) {
                searchRoot.style.removeProperty('--dcuf-search-layer-reserve');
                searchRoot.style.removeProperty('padding-bottom');
                searchRoot.removeAttribute('data-dcuf-search-layer-open');
                if (!searchRoot.getAttribute('style')?.trim()) searchRoot.removeAttribute('style');
                return;
            }
            const computed = window.getComputedStyle(layer);
            const visible = computed.display !== 'none'
                && computed.visibility !== 'hidden'
                && Number(computed.opacity || '1') > 0;
            if (!visible) {
                searchRoot.style.removeProperty('--dcuf-search-layer-reserve');
                searchRoot.style.removeProperty('padding-bottom');
                searchRoot.removeAttribute('data-dcuf-search-layer-open');
                if (!searchRoot.getAttribute('style')?.trim()) searchRoot.removeAttribute('style');
                return;
            }
            const measuredHeight = Math.max(
                Math.ceil(layer.scrollHeight || 0),
                Math.ceil(layer.getBoundingClientRect().height || 0),
                0
            );
            const reserve = Math.max(120, Math.min(220, measuredHeight + 12));
            searchRoot.style.setProperty('--dcuf-search-layer-reserve', `${reserve}px`);
            searchRoot.style.setProperty('padding-bottom', `${reserve}px`, 'important');
            searchRoot.setAttribute('data-dcuf-search-layer-open', '1');
        };
        const flushSearchDrawerReserveUpdates = () => {
            pruneSearchDrawerRoots();
            searchDrawerRoots.forEach(updateSearchDrawerReserve);
        };
        const scheduleSearchDrawerReserveUpdate = () => {
            if (!searchDrawerHandlersBound || searchDrawerRoots.size === 0) return;
            if (!searchDrawerRafId) {
                searchDrawerRafId = window.requestAnimationFrame(() => {
                    searchDrawerRafId = 0;
                    flushSearchDrawerReserveUpdates();
                });
            }
            if (searchDrawerTimerId) window.clearTimeout(searchDrawerTimerId);
            searchDrawerTimerId = window.setTimeout(() => {
                searchDrawerTimerId = 0;
                flushSearchDrawerReserveUpdates();
            }, 40);
        };
        const searchDrawerGlobalHandler = () => scheduleSearchDrawerReserveUpdate();
        const ensureSearchDrawerGlobalHandlers = () => {
            if (searchDrawerHandlersBound) return;
            document.addEventListener('click', searchDrawerGlobalHandler, true);
            document.addEventListener('change', searchDrawerGlobalHandler, true);
            document.addEventListener('focusin', searchDrawerGlobalHandler, true);
            window.addEventListener('resize', searchDrawerGlobalHandler);
            searchDrawerHandlersBound = true;
            setSearchDrawerDiagnostics();
        };
        const disposeSearchDrawerGlobalHandlersIfIdle = () => {
            pruneSearchDrawerRoots();
            if (searchDrawerRoots.size > 0 || !searchDrawerHandlersBound) return;
            document.removeEventListener('click', searchDrawerGlobalHandler, true);
            document.removeEventListener('change', searchDrawerGlobalHandler, true);
            document.removeEventListener('focusin', searchDrawerGlobalHandler, true);
            window.removeEventListener('resize', searchDrawerGlobalHandler);
            searchDrawerHandlersBound = false;
            if (searchDrawerRafId) window.cancelAnimationFrame(searchDrawerRafId);
            if (searchDrawerTimerId) window.clearTimeout(searchDrawerTimerId);
            searchDrawerRafId = 0;
            searchDrawerTimerId = 0;
            setSearchDrawerDiagnostics();
        };
        const connectSearchDrawer = (owner, searchRoot) => {
            if (!(owner instanceof HTMLElement) || !(searchRoot instanceof HTMLElement)) return null;
            const searchForm = getSearchForm(searchRoot);
            if (!(searchForm instanceof HTMLElement)) return null;
            const searchSlot = searchForm.closest('.dcuf-search-drawer-slot');
            const reserveRoot = searchSlot instanceof HTMLElement ? searchSlot : searchRoot;
            remember(owner, reserveRoot);
            pruneSearchDrawerRoots();
            let ownedRoots = searchRootsByOwner.get(owner);
            if (!ownedRoots) {
                ownedRoots = new Set();
                searchRootsByOwner.set(owner, ownedRoots);
            }
            ownedRoots.add(reserveRoot);
            ownerBySearchRoot.set(reserveRoot, owner);
            const alreadyConnected = searchDrawerRoots.has(reserveRoot)
                && reserveRoot.getAttribute(SEARCH_BOUND_ATTR) === '1';
            searchDrawerRoots.add(reserveRoot);
            ensureSearchDrawerGlobalHandlers();
            if (alreadyConnected) {
                updateSearchDrawerReserve(reserveRoot);
                return reserveRoot;
            }
            reserveRoot.setAttribute(SEARCH_BOUND_ATTR, '1');
            reserveRoot.style.setProperty('overflow', 'visible', 'important');
            reserveRoot.style.setProperty('position', 'relative', 'important');
            reserveRoot.style.setProperty('transition', 'padding-bottom 0.18s ease', 'important');
            scheduleSearchDrawerReserveUpdate();
            return reserveRoot;
        };
        const disconnectSearchDrawers = (owner) => {
            const ownedRoots = searchRootsByOwner.get(owner);
            ownedRoots?.forEach(unregisterSearchRoot);
            searchRootsByOwner.delete(owner);
            disposeSearchDrawerGlobalHandlersIfIdle();
        };
        const bindPaginationNavigation = (owner, pagination) => {
            if (!(owner instanceof HTMLElement) || !(pagination instanceof HTMLElement)) return;
            let ownedListeners = paginationListeners.get(owner);
            if (!ownedListeners) {
                ownedListeners = new Map();
                paginationListeners.set(owner, ownedListeners);
            }
            if (ownedListeners.has(pagination)) return;
            remember(owner, pagination);
            const handler = (event) => {
                const link = event.target instanceof Element ? event.target.closest('a') : null;
                if (!(link instanceof HTMLAnchorElement)) return;
                const hrefAttribute = link.getAttribute('href') || '';
                const onclickAttribute = link.getAttribute('onclick') || '';
                if (hrefAttribute === 'javascript:;'
                    || onclickAttribute.includes('goWrite')
                    || onclickAttribute.includes('showLayer')
                    || hrefAttribute.includes('listDisp')
                    || onclickAttribute.includes('listSearchHead')) return;
                if (!link.href) return;
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                window.location.href = link.href;
            };
            pagination.addEventListener('click', handler, true);
            pagination.setAttribute(PAGINATION_BOUND_ATTR, '1');
            ownedListeners.set(pagination, handler);
        };
        const disconnectPaginationNavigation = (owner) => {
            const ownedListeners = paginationListeners.get(owner);
            ownedListeners?.forEach((handler, pagination) => pagination.removeEventListener('click', handler, true));
            paginationListeners.delete(owner);
        };
        const markActionChildren = (root, container) => {
            if (!(container instanceof HTMLElement)) return;
            container.querySelectorAll('button, a').forEach((control) => {
                const isCurrent = control.matches('.on, [aria-current="page"], [aria-pressed="true"]')
                    || control.closest('li')?.matches('.on');
                const isWrite = control.matches('.btn_write, .write');
                mark(root, control, {
                    role: isWrite ? 'primary-action' : 'action',
                    state: isCurrent ? 'current' : 'default',
                });
            });
        };
        const connectControls = ({
            listWrap,
            toolbar = null,
            actionBar = null,
            pagination = null,
            pageMoveBox = null,
            searchForm = null,
            searchLayer = null,
        } = {}) => {
            if (!(listWrap instanceof HTMLElement)) return null;
            const styleTarget = document.head || document.documentElement;
            if (styleTarget) {
                let style = document.getElementById(STYLE_ID);
                if (!(style instanceof HTMLStyleElement)) {
                    style = document.createElement('style');
                    style.id = STYLE_ID;
                    styleTarget.appendChild(style);
                }
                if (style.textContent !== __dcufListPresenter.CSS) style.textContent = __dcufListPresenter.CSS;
            }
            mark(listWrap, listWrap, { surface: 'list-host', role: 'region', state: 'ready' });
            listWrap.setAttribute('data-dcuf-controls-ready', '1');

            if (toolbar instanceof HTMLElement) {
                mark(listWrap, toolbar, { surface: 'list-toolbar', role: 'toolbar', state: 'ready' });
                releaseInlineGeometry(listWrap, toolbar, ['height']);
                const tabGroup = toolbar.querySelector('.array_tab');
                const categories = toolbar.querySelector(':scope > .center_box');
                const categoryShell = categories?.querySelector(':scope > .inner');
                const categoryList = categoryShell?.querySelector(':scope > ul');
                const rightBox = toolbar.querySelector(':scope > .right_box');
                const outputArray = toolbar.querySelector('.output_array');
                const pageSizeShell = toolbar.querySelector('.select_box.array_num');
                const countSelect = toolbar.querySelector('select');
                const legacyPageSize = pageSizeShell?.querySelector(':scope > .select_area');
                const pageSizePopup = pageSizeShell?.querySelector(':scope > .option_box');
                const primaryGroup = toolbar.querySelector('.switch_btnbox');
                mark(listWrap, tabGroup, { role: 'tablist' });
                mark(listWrap, categories, { role: 'toolbar-categories' });
                mark(listWrap, categoryShell, { role: 'category-shell' });
                mark(listWrap, categoryList, { role: 'category-list' });
                mark(listWrap, rightBox, { role: 'toolbar-actions' });
                mark(listWrap, outputArray, { role: 'toolbar-cluster' });
                mark(listWrap, pageSizeShell, { role: 'page-size-shell' });
                mark(listWrap, countSelect, { role: 'page-size' });
                mark(listWrap, legacyPageSize, { role: 'legacy-page-size', state: countSelect ? 'superseded' : 'active' });
                mark(listWrap, pageSizePopup, { role: 'page-size-popup', state: 'closed' });
                mark(listWrap, primaryGroup, { role: 'primary-group' });
                releaseInlineGeometry(listWrap, rightBox, ['position', 'right', 'top', 'bottom', 'left']);
                releaseInlineGeometry(listWrap, outputArray, ['position', 'right', 'top', 'bottom', 'left', 'margin-top']);
                markActionChildren(listWrap, toolbar);
                mark(listWrap, categoryShell?.querySelector(':scope > .btn_subject_more'), { role: 'category-toggle' });
                mark(listWrap, categoryShell?.querySelector(':scope > .btn_subject_more .icon_subject_more'), { role: 'category-toggle-icon' });
                const categoryPopup = categoryShell?.querySelector(':scope > .subject_morelist');
                mark(listWrap, categoryPopup, { role: 'category-popup' });
                mark(listWrap, categoryPopup?.querySelector(':scope > ul'), { role: 'category-popup-list' });
                categoryPopup?.querySelectorAll(':scope > ul > li').forEach((item) => {
                    mark(listWrap, item, { role: 'category-popup-item' });
                    item.querySelectorAll(':scope > a').forEach((action) => mark(listWrap, action, { role: 'category-option' }));
                });
                connectScrollToolbar(listWrap, toolbar);
            }

            if (actionBar instanceof HTMLElement && !actionBar.matches('.view_bottom_btnbox')) {
                mark(listWrap, actionBar, { surface: 'list-actions', role: 'toolbar', state: 'ready' });
                mark(listWrap, actionBar.querySelector(':scope > .fl'), { role: 'action-start' });
                mark(listWrap, actionBar.querySelector(':scope > .fr'), { role: 'action-end' });
                markActionChildren(listWrap, actionBar);
            }

            const paginationSurface = pagination?.closest?.('.bottom_paging_wrap') || pagination;
            if (paginationSurface instanceof HTMLElement) {
                mark(listWrap, paginationSurface, { surface: 'list-pagination', role: 'navigation', state: 'ready' });
                mark(listWrap, pagination, { role: 'pages' });
                mark(listWrap, pageMoveBox, { role: 'page-jump' });
                pagination?.querySelectorAll?.(':scope > a, :scope > em, :scope > strong, :scope > span').forEach((page) => {
                    const direction = page.matches('.page_first, .page_prev, .page_next, .page_end');
                    const current = page.matches('em, strong, .on, [aria-current="page"]');
                    mark(listWrap, page, {
                        role: direction ? 'page-direction' : 'page',
                        state: direction ? ['first', 'prev', 'next', 'end'].find((name) => page.classList.contains(`page_${name}`)) : current ? 'current' : 'default',
                    });
                    if (current) page.setAttribute('aria-current', 'page');
                });
                markActionChildren(listWrap, pageMoveBox);
                bindPaginationNavigation(listWrap, pagination);
            }

            if (searchForm instanceof HTMLElement) {
                mark(listWrap, searchForm, { surface: 'list-search', role: 'search', state: 'ready' });
                const fieldset = searchForm.querySelector('fieldset');
                const controls = searchForm.querySelector('.bottom_search_wrap, .buttom_search_wrap');
                const selectGroup = searchForm.querySelector('.search_left_box');
                const queryGroup = searchForm.querySelector('.search_right_box');
                const queryControls = searchForm.querySelector('.bottom_search');
                const fieldShell = searchForm.querySelector('.inner_search');
                const nativeSelect = searchForm.querySelector('select[name="search_type"], select#search_type');
                const legacySelect = searchForm.querySelector('.select_box.bottom_array');
                const keyword = searchForm.querySelector('input.in_keyword, input[type="text"]');
                const submit = searchForm.querySelector('.bnt_search, button[type="submit"], button:not([type])');
                mark(listWrap, fieldset, { role: 'group' });
                mark(listWrap, controls, { role: 'controls' });
                mark(listWrap, selectGroup, { role: 'select-group' });
                mark(listWrap, nativeSelect, { role: 'select' });
                // The real SELECT may be inside the legacy shell. Preserve its
                // ancestor and hide only a separate obsolete visual trigger.
                const containsNativeSelect = nativeSelect instanceof HTMLSelectElement && legacySelect?.contains(nativeSelect);
                mark(listWrap, legacySelect, containsNativeSelect
                    ? { role: 'select-shell', state: 'active' }
                    : { role: 'legacy-select', state: nativeSelect ? 'superseded' : 'active' });
                if (containsNativeSelect) {
                    legacySelect.querySelectorAll(':scope > .select_area').forEach((trigger) => {
                        if (!trigger.contains(nativeSelect)) mark(listWrap, trigger, { role: 'legacy-select', state: 'superseded' });
                    });
                }
                mark(listWrap, queryGroup, { role: 'query-group' });
                mark(listWrap, queryControls, { role: 'query-controls' });
                mark(listWrap, fieldShell, { role: 'field-shell' });
                mark(listWrap, keyword, { role: 'field' });
                mark(listWrap, submit, { role: 'submit' });
                mark(listWrap, searchLayer, { role: 'options-popup', state: 'closed' });
                releaseInlineGeometry(listWrap, queryControls, [
                    'position', 'right', 'top', 'bottom', 'left', 'inset', 'transform',
                    'border', 'background', 'background-color', 'box-shadow',
                ]);
                releaseInlineGeometry(listWrap, submit, [
                    'background', 'background-image', 'background-position', 'background-repeat',
                ]);
                connectSearchDrawer(listWrap, searchForm);
            }
            return listWrap;
        };
        const disconnectControls = (listWrap) => {
            if (!(listWrap instanceof HTMLElement)) return;
            disconnectScrollToolbar(listWrap);
            disconnectSearchDrawers(listWrap);
            disconnectPaginationNavigation(listWrap);
            const transaction = controlTransactions.get(listWrap);
            if (!transaction) return;
            const transactionEntries = Array.from(transaction.entries());
            transactionEntries.reverse().forEach(([element, snapshot]) => {
                if (!(element instanceof HTMLElement)) return;
                SEMANTIC_ATTRIBUTES.forEach((name) => {
                    const value = snapshot.attributes[name];
                    if (value === null) element.removeAttribute(name);
                    else element.setAttribute(name, value);
                });
                if (snapshot.style === null) element.removeAttribute('style');
                else element.setAttribute('style', snapshot.style);
            });
            transactionEntries.forEach(([element, snapshot]) => {
                if (snapshot.style === null && element instanceof HTMLElement && !element.getAttribute('style')?.trim()) {
                    element.removeAttribute('style');
                }
            });
            controlTransactions.delete(listWrap);
        };
        const mountOwnedRoot = ({ listWrap, originalTable, className = 'custom-mobile-list' } = {}) => {
            if (!(listWrap instanceof HTMLElement) || !(originalTable instanceof HTMLElement)) return null;
            let ownedRoot = listWrap.querySelector(`.${className}`);
            if (!(ownedRoot instanceof HTMLElement)) {
                ownedRoot = document.createElement('div');
                ownedRoot.className = className;
                originalTable.parentNode?.insertBefore(ownedRoot, originalTable.nextSibling);
            }
            ownedRoot.setAttribute('data-dcuf-surface', 'list-container');
            ownedRoot.setAttribute('data-dcuf-role', 'feed');
            ownedRoot.setAttribute('data-dcuf-state', 'ready');
            return ownedRoot;
        };
        const invokeNative = (target, action = 'click') => {
            if (!(target instanceof HTMLElement)) return false;
            if (action === 'click') {
                target.click();
                return true;
            }
            return false;
        };
        const snapshotResources = () => Object.freeze({
            scrollToolbars: scrollToolbars.size,
            scrollFrameActive: Boolean(scrollFrameId),
            scrollListeners: scrollEventsBound ? SCROLL_INTERACTIONS.length + 3 : 0,
            searchDrawerRoots: searchDrawerRoots.size,
            searchDrawerGlobalHandlersBound: searchDrawerHandlersBound,
            searchDrawerRafActive: Boolean(searchDrawerRafId),
            searchDrawerTimerActive: Boolean(searchDrawerTimerId),
        });
        const connect = (options = {}) => connectControls(options);
        const refresh = (options = {}) => connectControls(options);
        const dispose = (listWrap) => disconnectControls(listWrap);
        return Object.freeze({
            snapshotRow,
            createItem,
            connect,
            refresh,
            mountOwnedRoot,
            invokeNative,
            dispose,
            connectControls,
            disconnectControls,
            connectSearchDrawer,
            snapshotResources,
            SEARCH_BOUND_ATTR,
        });
    })();
    __dcufRoot.__dcufListHostAdapter = __dcufListHostAdapter;
