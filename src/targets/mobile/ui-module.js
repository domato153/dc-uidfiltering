
    /**
     * =================================================================
     * ========================== UI Module ============================
     * =================================================================
     */
    const UIModule = {
        _initState: 'idle',
        _initPromise: null,
        DATA_ATTR: 'data-custom-row-id',
        TRANSFORMED_ATTR: 'data-ui-transformed',


        SELECTORS: {
            LIST_WRAP: '.gall_listwrap, .list_wrap',
            ORIGINAL_TABLE: 'table.gall_list',
            ORIGINAL_TBODY: '.gall_list tbody',
            ORIGINAL_POST_ITEM: 'tr.ub-content',
            PAGINATION: '.bottom_paging_box',
            GALL_TABS: '.list_bottom_btnbox',
            SEARCH_FORM: 'form[name="frmSearch"]',
            SEARCH_LAYER: '#searchTypeLayer',
            PAGE_MOVE_BOX: '.bottom_movebox',
        },


        CUSTOM_CLASSES: {
            MOBILE_LIST: 'custom-mobile-list',
            POST_ITEM: 'custom-post-item',
            BOTTOM_CONTROLS: 'custom-bottom-controls',
            SEARCH_SLOT: 'dcuf-search-drawer-slot',
        },

        LIST_STATE_MAP: new WeakMap(),
        ACTIVE_LIST_STATES: new Set(),
        _bootRollbackRegistered: false,
        PAGINATION_BOUND_ATTR: 'data-dcuf-force-refresh-bound',
        TOOLTIP_BOUND_ATTR: 'data-dcuf-tooltip-bound',
        SEARCH_LAYER_BOUND_ATTR: 'data-dcuf-search-layer-bound',
        POST_REVEAL_RECOVERY_MAX_MS: Math.max(20, Number(__dcufRoot.__DCUF_TESTBED_CONFIG__?.boot?.recoveryMaxMs) || 4500),
        POST_REVEAL_RECOVERY_POLL_MS: 280,
        POST_REVEAL_RECOVERY_STABLE_PASSES: 3,
        POST_REVEAL_RECOVERY_THEME_REFRESH_LIMIT: 2,
        _nextRowId: 1,
        _nextListRuntimeId: 1,
        _listMutationUnsubscribe: null,
        _listImmediateMutationUnsubscribe: null,
        _initialRevealStartedAt: 0,
        _postRevealRecoveryStop: null,
        ARTICLE_AD_STYLE_ID: 'dcuf-article-native-ad-style',
        SEARCH_DRAWER_ROOTS: new Set(),
        _searchDrawerGlobalHandlersBound: false,
        _searchDrawerUpdateRafId: 0,
        _searchDrawerUpdateTimerId: 0,
        _recentVisitNavigationBound: false,

        getRecentVisitControl(root, direction) {
            if (!(root instanceof HTMLElement)) return null;
            const selector = direction === 'prev'
                ? ':scope > .btn_visit_prev,:scope > .bnt_visit_prev'
                : ':scope > .btn_visit_next,:scope > .bnt_visit_next';
            return root.querySelector(selector);
        },

        updateRecentVisitControls(root, list) {
            if (!(root instanceof HTMLElement) || !(list instanceof HTMLElement)) return;
            const max = Math.max(0, list.scrollWidth - list.clientWidth);
            const prev = this.getRecentVisitControl(root, 'prev');
            const next = this.getRecentVisitControl(root, 'next');
            const canPrev = list.scrollLeft > 1;
            const canNext = list.scrollLeft < max - 1;
            prev?.classList.toggle('on', canPrev);
            next?.classList.toggle('on', canNext);
            prev?.setAttribute('aria-disabled', String(!canPrev));
            next?.setAttribute('aria-disabled', String(!canNext));
        },

        prepareRecentVisitList(root) {
            if (!(root instanceof HTMLElement)) return null;
            const list = root.querySelector(':scope > .newvisit_box > .newvisit_list');
            if (!(list instanceof HTMLElement)) return null;
            list.style.setProperty('left', '0px', 'important');
            list.style.setProperty('margin-left', '0px', 'important');
            if (list.dataset.dcufRecentNavigationBound !== '1') {
                list.dataset.dcufRecentNavigationBound = '1';
                let frame = 0;
                list.addEventListener('scroll', () => {
                    if (frame) return;
                    frame = window.requestAnimationFrame(() => {
                        frame = 0;
                        this.updateRecentVisitControls(root, list);
                    });
                }, { passive: true });
            }
            this.updateRecentVisitControls(root, list);
            return list;
        },

        bindRecentVisitNavigation() {
            document.querySelectorAll('.newvisit_history').forEach((root) => this.prepareRecentVisitList(root));
            if (this._recentVisitNavigationBound) return;
            this._recentVisitNavigationBound = true;
            document.addEventListener('click', (event) => {
                const target = event.target instanceof Element ? event.target : null;
                const button = target?.closest('.btn_visit_prev,.btn_visit_next,.bnt_visit_prev,.bnt_visit_next');
                const root = button?.closest('.newvisit_history');
                if (!(button instanceof HTMLElement) || !(root instanceof HTMLElement) || button.parentElement !== root) return;
                const list = this.prepareRecentVisitList(root);
                if (!(list instanceof HTMLElement)) return;
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                const direction = button.matches('.btn_visit_prev,.bnt_visit_prev') ? -1 : 1;
                const max = Math.max(0, list.scrollWidth - list.clientWidth);
                const step = Math.max(1, list.clientWidth - 24);
                let targetLeft = Math.max(0, Math.min(max, list.scrollLeft + direction * step));
                const edgeTolerance = Math.min(96, Math.max(32, step * 0.2));
                if (direction < 0 && targetLeft <= edgeTolerance) targetLeft = 0;
                if (direction > 0 && max - targetLeft <= edgeTolerance) targetLeft = max;
                const behavior = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
                list.scrollTo({ left: targetLeft, behavior });
                const settle = () => {
                    if (targetLeft === 0 || targetLeft === max) list.scrollLeft = targetLeft;
                    this.updateRecentVisitControls(root, list);
                };
                window.setTimeout(settle, behavior === 'smooth' ? 360 : 0);
            }, true);
        },

        getRuntimeCoordinator() {
            return window.__dcufRuntimeCoordinator || null;
        },

        getPhase1Theme() {
            return window.__dcufPhase1Theme || null;
        },

        getPhase1ViewTheme() {
            return window.__dcufPhase1ViewTheme || null;
        },

        getCurrentRevealTheme() {
            if (this.isViewPage()) return this.getPhase1ViewTheme();
            return this.getPhase1Theme();
        },

        getRevealThemeForState(state = null) {
            if (state?.detail?.revealTheme === 'list') return this.getPhase1Theme();
            if (state?.detail?.revealTheme === 'view') return this.getPhase1ViewTheme();
            return this.getCurrentRevealTheme();
        },

        ensureBootUi(reason = 'reveal-check') {
            if (typeof window.__dcufEnsureBootUi === 'function') {
                try {
                    window.__dcufEnsureBootUi(reason);
                } catch (error) {
                    console.warn('[DC Filter+UI] Failed to ensure boot UI:', error);
                }
            }
        },

        resolveOwnedListWrap(candidate) {
            if (!(candidate instanceof Element)) return null;

            let originalTable = null;
            if (candidate.matches?.(this.SELECTORS.ORIGINAL_TABLE)) {
                originalTable = candidate;
            } else if (candidate.matches?.(this.SELECTORS.LIST_WRAP)) {
                originalTable = candidate.querySelector(this.SELECTORS.ORIGINAL_TABLE);
            } else {
                originalTable = candidate.closest?.(this.SELECTORS.ORIGINAL_TABLE)
                    || candidate.querySelector?.(this.SELECTORS.ORIGINAL_TABLE)
                    || candidate.closest?.(this.SELECTORS.LIST_WRAP)?.querySelector?.(this.SELECTORS.ORIGINAL_TABLE);
            }

            if (!(originalTable instanceof Element)) return null;
            const ownerWrap = originalTable.closest(this.SELECTORS.LIST_WRAP);
            return ownerWrap instanceof HTMLElement ? ownerWrap : null;
        },

        collectOwnedListWraps(root = document) {
            const queryRoot = (root instanceof Document || root instanceof Element || root instanceof DocumentFragment) ? root : document;
            const seen = new Set();
            const results = [];
            const pushOwned = (candidate) => {
                const ownerWrap = this.resolveOwnedListWrap(candidate);
                if (!(ownerWrap instanceof HTMLElement) || seen.has(ownerWrap)) return;
                seen.add(ownerWrap);
                results.push(ownerWrap);
            };

            if (queryRoot instanceof Element) pushOwned(queryRoot);
            if (queryRoot.querySelectorAll) {
                queryRoot.querySelectorAll(this.SELECTORS.LIST_WRAP).forEach(pushOwned);
                queryRoot.querySelectorAll(this.SELECTORS.ORIGINAL_TABLE).forEach(pushOwned);
            }

            return results;
        },

        resolveBottomControlScope(listWrap) {
            if (!(listWrap instanceof HTMLElement)) return null;
            // Live view pages keep the embedded-list controls beside the
            // list wrapper. closest('section') returned the wrapper itself,
            // which made those sibling controls impossible to discover.
            return listWrap.parentElement || listWrap;
        },

        findBottomControlElement(listWrap, selector) {
            if (!(listWrap instanceof HTMLElement) || !selector) return null;
            const scope = this.resolveBottomControlScope(listWrap);
            if (!(scope instanceof HTMLElement)) return null;

            const candidates = Array.from(scope.querySelectorAll(selector));
            return candidates.find((element) => {
                if (!(element instanceof HTMLElement)) return false;
                if (element.closest(`.${this.CUSTOM_CLASSES.BOTTOM_CONTROLS}`)) return false;

                // Live list controls are siblings of `.gall_listwrap`, but the
                // whole page is nested in `#top.list_wrap`. Comparing only the
                // nearest LIST_WRAP assigns them to that decorative outer wrapper
                // and rejects every control. Resolve the table-owned list instead.
                const controlOwner = this.resolveOwnedListWrap(element);
                return !(controlOwner instanceof HTMLElement) || controlOwner === listWrap;
            }) || null;
        },

        findAdjacentViewListActionBar(listWrap) {
            if (!(listWrap instanceof HTMLElement)) return null;
            const sibling = listWrap.previousElementSibling;
            if (!(sibling instanceof HTMLElement)) return null;
            if (!sibling.matches('.view_bottom_btnbox')) return null;
            if (sibling.closest(`.${this.CUSTOM_CLASSES.BOTTOM_CONTROLS}`)) return null;
            return sibling;
        },

        recordDiagnostic(label, amount = 1) {
            const diagnostics = window.__dcufDiagnostics;
            if (typeof diagnostics?.increment === 'function') diagnostics.increment(label, amount);
        },

        createPhaseScheduler(label, run, delays = []) {
            const runtimeCoordinator = this.getRuntimeCoordinator();
            if (runtimeCoordinator && typeof runtimeCoordinator.createPhaseScheduler === 'function') {
                return runtimeCoordinator.createPhaseScheduler(label, run, { delays });
            }

            let rafId = 0;
            const timerIds = new Set();
            const clearTimers = () => {
                timerIds.forEach((timerId) => clearTimeout(timerId));
                timerIds.clear();
            };

            return {
                schedule: (meta = null) => {
                    if (rafId) cancelAnimationFrame(rafId);
                    clearTimers();

                    rafId = requestAnimationFrame(() => {
                        rafId = 0;
                        run({ label, phase: 'raf', delay: 0, meta });
                        delays.forEach((delay) => {
                            const timerId = window.setTimeout(() => {
                                timerIds.delete(timerId);
                                run({ label, phase: `delay:${delay}`, delay, meta });
                            }, delay);
                            timerIds.add(timerId);
                        });
                    });
                },
                cancel: () => {
                    if (rafId) {
                        cancelAnimationFrame(rafId);
                        rafId = 0;
                    }
                    clearTimers();
                },
                flush: (meta = null) => {
                    if (rafId) {
                        cancelAnimationFrame(rafId);
                        rafId = 0;
                    }
                    clearTimers();
                    run({ label, phase: 'flush', delay: 0, meta });
                }
            };
        },


        proxyClick(customItem, originalRow) {
            customItem.addEventListener('click', (e) => {
                // 개인 차단 모드일 때는 클릭 프록시 비활성화
                if (PersonalBlockModule.isSelectionMode) {
                    e.preventDefault();
                    return;
                }
                const clickedElement = e.target;
                if (clickedElement.closest('span.reply_num')) {
                    e.preventDefault();
                    const originalReplyLink = originalRow.querySelector('a.reply_numbox');
                    if (originalReplyLink) originalReplyLink.click();
                    return;
                }

                // [v2.6.8 수정] 댓글창처럼 정상 작동하게끔 이식 (복제 방식 + 위치 보정)
                if (clickedElement.closest('.author')) {
                    e.preventDefault();

                    const originalAuthor = originalRow.querySelector('.gall_writer');
                    if (originalAuthor) {
                        // 클릭 좌표 저장 (경계 검사용)
                        const clientX = e.clientX;
                        const clientY = e.clientY;

                        originalAuthor.click();

                        // 팝업 위치 고도화 (댓글창 로직 이식 + 화면 이탈 방지)
                        setTimeout(() => {
                            const lyr = document.getElementById('user_data_lyr');
                            if (lyr) {
                                // 게시글 목록의 .author 영역에 맞춰 위치 강제 재설정
                                lyr.style.setProperty('position', 'absolute', 'important');
                                lyr.style.setProperty('top', '100%', 'important');
                                lyr.style.setProperty('left', '0', 'important');
                                lyr.style.setProperty('margin-top', '5px', 'important');
                                lyr.style.setProperty('z-index', '2147483647', 'important');
                                lyr.style.setProperty('display', 'block', 'important');
                                lyr.style.setProperty('visibility', 'visible', 'important');

                                // 화면 이탈 방지 (경계 검사)
                                const rect = lyr.getBoundingClientRect();
                                const windowW = window.innerWidth;
                                const windowH = window.innerHeight;

                                // 우측 끝에 너무 붙어있으면 왼쪽으로 이동
                                if (rect.right > windowW) {
                                    lyr.style.setProperty('left', 'auto', 'important');
                                    lyr.style.setProperty('right', '0', 'important');
                                }

                                // [v2.6.8 추가] 왼쪽 끝에 너무 붙어있으면 오른쪽으로 이동
                                if (rect.left < 0) {
                                    lyr.style.setProperty('left', '0', 'important');
                                    lyr.style.setProperty('right', 'auto', 'important');
                                    lyr.style.setProperty('margin-left', '0', 'important');
                                }

                                // 아래쪽 끝에 너무 붙어있으면 위쪽으로 이동
                                if (rect.bottom > windowH) {
                                    lyr.style.setProperty('top', 'auto', 'important');
                                    lyr.style.setProperty('bottom', '100%', 'important');
                                    lyr.style.setProperty('margin-bottom', '5px', 'important');
                                }
                            }
                        }, 50);
                    }
                    return;
                }
            });
        },


        updateItemVisibility(originalRow, mirroredItem) {
            const isDibsBlocked = originalRow.classList.contains('block-disable');
            const isUserFilterBlocked = originalRow.style.display === 'none';
            // Host CSS also hides non-post survey/advertisement rows. The original table is
            // off-screen, but each row retains its own computed display value.
            const isHostHidden = window.getComputedStyle(originalRow).display === 'none';
            const nextDisplay = (isDibsBlocked || isUserFilterBlocked || isHostHidden) ? 'none' : 'block';
            if (typeof FilterModule?.debugMirrorSync === 'function') {
                FilterModule.debugMirrorSync(originalRow, mirroredItem, nextDisplay, 'UIModule.updateItemVisibility');
            }
            if (mirroredItem.style.display !== nextDisplay) {
                mirroredItem.style.display = nextDisplay;
            }
        },


        createMobileListItem(originalRow, rowId) {
            const titleContainer = originalRow.querySelector('.gall_tit');
            const writerEl = originalRow.querySelector('.gall_writer');
            const dateEl = originalRow.querySelector('.gall_date');
            if (!titleContainer || !writerEl || !dateEl) return null;


            const newItem = document.createElement('div');
            newItem.setAttribute(this.DATA_ATTR, rowId);
            newItem.className = `${this.CUSTOM_CLASSES.POST_ITEM} ${originalRow.className.replace('ub-content', '').trim()}`;

            // [이식된 기능] 광고 글(icon_ad)인 경우 식별 클래스 추가
            if (originalRow.querySelector('em.icon_ad')) {
                newItem.classList.add('is-ad-post');
            }

            if (originalRow.classList.contains('us-post--notice')) newItem.classList.add('notice');
            if (originalRow.classList.contains('us-post--recommend')) newItem.classList.add('concept');


            const postTitleDiv = document.createElement('div');
            postTitleDiv.className = 'post-title';


            const originalLink = titleContainer.querySelector('a');
            const subjectSpan = originalRow.querySelector('.gall_subject');
            const replyNumSpan = titleContainer.querySelector('.reply_num');


            if (subjectSpan) {
                const newSubjectSpan = subjectSpan.cloneNode(true);
                newSubjectSpan.setAttribute('title', subjectSpan.textContent.trim());
                postTitleDiv.appendChild(newSubjectSpan);
            }


            if (originalLink) {
                const newLink = document.createElement('a');
                newLink.href = originalLink.href;
                newLink.className = 'post-title-link';
                if (originalLink.target) newLink.target = originalLink.target;


                originalLink.childNodes.forEach(child => {
                    newLink.appendChild(child.cloneNode(true));
                });


                postTitleDiv.appendChild(newLink);
            }


            if (replyNumSpan) postTitleDiv.appendChild(replyNumSpan.cloneNode(true));
            newItem.appendChild(postTitleDiv);


            const postMeta = document.createElement('div');
            postMeta.className = 'post-meta';
            const authorSpan = document.createElement('span');
            authorSpan.className = 'author';

            // [v2.6.8 수정] 다시 복제(cloneNode) 방식으로 원복합니다. (안정성 확보)
            // 대신 CSS와 proxyClick 로직을 통해 팝업의 위치와 기능을 완벽히 이식합니다.
            authorSpan.appendChild(writerEl.cloneNode(true));


            const countEl = originalRow.querySelector('.gall_count');
            const recommendEl = originalRow.querySelector('.gall_recommend');
            const statsSpan = document.createElement('span');
            statsSpan.className = 'stats';
            statsSpan.innerHTML = `조회 ${countEl?.textContent.trim() || '0'} | 추천 ${recommendEl?.textContent.trim() || '0'} | ${dateEl.textContent.trim()}`;


            postMeta.appendChild(authorSpan);
            postMeta.appendChild(statsSpan);
            newItem.appendChild(postMeta);


            this.updateItemVisibility(originalRow, newItem);
            return newItem;
        },


        updateSearchDrawerReserve(searchRoot) {
            if (!(searchRoot instanceof HTMLElement)) return;
            const searchForm = searchRoot.matches?.(this.SELECTORS.SEARCH_FORM)
                ? searchRoot
                : searchRoot.querySelector(this.SELECTORS.SEARCH_FORM);
            if (!(searchForm instanceof HTMLElement)) return;

            const layer = searchForm.querySelector(this.SELECTORS.SEARCH_LAYER);
            if (!(layer instanceof HTMLElement)) {
                searchRoot.style.removeProperty('--dcuf-search-layer-reserve');
                searchRoot.style.removeProperty('padding-bottom');
                searchRoot.removeAttribute('data-dcuf-search-layer-open');
                return;
            }

            const computed = window.getComputedStyle(layer);
            const isVisible = computed.display !== 'none'
                && computed.visibility !== 'hidden'
                && Number(computed.opacity || '1') > 0;

            if (!isVisible) {
                searchRoot.style.removeProperty('--dcuf-search-layer-reserve');
                searchRoot.style.removeProperty('padding-bottom');
                searchRoot.removeAttribute('data-dcuf-search-layer-open');
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
        },

        pruneSearchDrawerRoots() {
            this.SEARCH_DRAWER_ROOTS.forEach((searchRoot) => {
                const hasSearchForm = searchRoot instanceof HTMLElement
                    && (searchRoot.matches?.(this.SELECTORS.SEARCH_FORM)
                        || searchRoot.querySelector?.(this.SELECTORS.SEARCH_FORM));
                if (!searchRoot.isConnected || !hasSearchForm) this.SEARCH_DRAWER_ROOTS.delete(searchRoot);
            });
            const diagnostics = window.__dcufDiagnostics;
            if (typeof diagnostics?.setGauge === 'function') {
                diagnostics.setGauge('ui.searchDrawer.activeRoots', this.SEARCH_DRAWER_ROOTS.size);
                diagnostics.setGauge('ui.searchDrawer.globalListeners', this._searchDrawerGlobalHandlersBound ? 4 : 0);
            }
        },

        flushSearchDrawerReserveUpdates() {
            this.pruneSearchDrawerRoots();
            this.SEARCH_DRAWER_ROOTS.forEach((searchRoot) => this.updateSearchDrawerReserve(searchRoot));
        },

        scheduleSearchDrawerReserveUpdate() {
            if (!this._searchDrawerUpdateRafId) {
                this._searchDrawerUpdateRafId = requestAnimationFrame(() => {
                    this._searchDrawerUpdateRafId = 0;
                    this.flushSearchDrawerReserveUpdates();
                });
            }
            if (this._searchDrawerUpdateTimerId) window.clearTimeout(this._searchDrawerUpdateTimerId);
            this._searchDrawerUpdateTimerId = window.setTimeout(() => {
                this._searchDrawerUpdateTimerId = 0;
                this.flushSearchDrawerReserveUpdates();
            }, 40);
        },

        ensureSearchDrawerGlobalHandlers() {
            if (this._searchDrawerGlobalHandlersBound) return;
            const scheduleUpdate = () => this.scheduleSearchDrawerReserveUpdate();
            document.addEventListener('click', scheduleUpdate, true);
            document.addEventListener('change', scheduleUpdate, true);
            document.addEventListener('focusin', scheduleUpdate, true);
            window.addEventListener('resize', scheduleUpdate);
            this._searchDrawerGlobalHandlersBound = true;
        },

        bindSearchDrawerReserve(searchRoot) {
            if (!(searchRoot instanceof HTMLElement)) return;
            const searchForm = searchRoot.matches?.(this.SELECTORS.SEARCH_FORM)
                ? searchRoot
                : searchRoot.querySelector(this.SELECTORS.SEARCH_FORM);
            if (!(searchForm instanceof HTMLElement)) return;

            const searchSlot = searchForm.closest(`.${this.CUSTOM_CLASSES.SEARCH_SLOT}`);
            const reserveRoot = searchSlot instanceof HTMLElement ? searchSlot : searchRoot;
            this.SEARCH_DRAWER_ROOTS.forEach((registeredRoot) => {
                if (registeredRoot === reserveRoot) return;
                const registeredForm = registeredRoot.matches?.(this.SELECTORS.SEARCH_FORM)
                    ? registeredRoot
                    : registeredRoot.querySelector?.(this.SELECTORS.SEARCH_FORM);
                if (registeredForm === searchForm) this.SEARCH_DRAWER_ROOTS.delete(registeredRoot);
            });
            this.SEARCH_DRAWER_ROOTS.add(reserveRoot);
            this.ensureSearchDrawerGlobalHandlers();
            if (reserveRoot.getAttribute(this.SEARCH_LAYER_BOUND_ATTR) === '1') {
                this.scheduleSearchDrawerReserveUpdate();
                return;
            }
            reserveRoot.setAttribute(this.SEARCH_LAYER_BOUND_ATTR, '1');

            reserveRoot.style.setProperty('overflow', 'visible', 'important');
            reserveRoot.style.setProperty('position', 'relative', 'important');
            reserveRoot.style.setProperty('transition', 'padding-bottom 0.18s ease', 'important');

            this.scheduleSearchDrawerReserveUpdate();
        },

        enhanceOriginalSearchForms(listWrap) {
            const searchForm = this.findBottomControlElement(listWrap, this.SELECTORS.SEARCH_FORM);
            if (!(searchForm instanceof HTMLElement)) return;
            this.bindSearchDrawerReserve(searchForm);
        },

        normalizeSearchFormLayout(searchSlot) {
            if (!(searchSlot instanceof HTMLElement)) return;

            const searchForm = searchSlot.querySelector(this.SELECTORS.SEARCH_FORM);
            if (!(searchForm instanceof HTMLElement)) return;

            const fieldset = searchForm.querySelector('fieldset');
            const searchWrap = searchForm.querySelector('.bottom_search_wrap, .buttom_search_wrap')
                || (fieldset instanceof HTMLElement ? fieldset : searchForm);
            const leftBox = searchForm.querySelector('.search_left_box');
            const rightBox = searchForm.querySelector('.search_right_box');
            const nativeSelect = searchForm.querySelector('select[name="search_type"], #search_type');
            const selectBox = searchForm.querySelector('.select_box.bottom_array');
            const selectArea = searchForm.querySelector('.select_area');
            const selectInner = searchForm.querySelector('.select_box.bottom_array .inner');
            const bottomSearch = searchForm.querySelector('.bottom_search');
            const innerSearch = searchForm.querySelector('.inner_search');
            const keywordInput = searchForm.querySelector('input.in_keyword, input[type="text"]');
            const searchButton = searchForm.querySelector('.bnt_search, button.sp_img.bnt_search');
            const searchLayer = searchForm.querySelector(this.SELECTORS.SEARCH_LAYER);
            const hasLegacySearchColumns = Boolean(searchForm.querySelector('.search_left_box, .search_right_box'));
            let nativeSelectHost = searchForm.querySelector('.dcuf-native-search-type');

            if (nativeSelect instanceof HTMLSelectElement && !(nativeSelectHost instanceof HTMLElement)) {
                nativeSelectHost = document.createElement('div');
                nativeSelectHost.className = 'dcuf-native-search-type';
            }

            searchForm.style.setProperty('display', 'block', 'important');
            searchForm.style.setProperty('width', '100%', 'important');
            searchForm.style.setProperty('max-width', 'none', 'important');
            searchForm.style.setProperty('margin', '0', 'important');
            searchForm.style.setProperty('padding', '0', 'important');
            searchForm.style.setProperty('border', 'none', 'important');
            searchForm.style.setProperty('background', 'transparent', 'important');
            searchForm.style.setProperty('box-shadow', 'none', 'important');

            if (fieldset instanceof HTMLElement) {
                fieldset.style.setProperty('display', 'block', 'important');
                fieldset.style.setProperty('min-width', '0', 'important');
                fieldset.style.setProperty('margin', '0', 'important');
                fieldset.style.setProperty('padding', '0', 'important');
                fieldset.style.setProperty('border', 'none', 'important');
            }

            if (searchWrap instanceof HTMLElement) {
                searchWrap.style.setProperty('display', 'flex', 'important');
                searchWrap.style.setProperty('align-items', 'center', 'important');
                searchWrap.style.setProperty('justify-content', 'flex-start', 'important');
                searchWrap.style.setProperty('gap', '8px', 'important');
                searchWrap.style.setProperty('width', '100%', 'important');
                searchWrap.style.setProperty('max-width', '100%', 'important');
                searchWrap.style.setProperty('margin', '0 auto', 'important');
                searchWrap.style.setProperty('padding', '0', 'important');
                searchWrap.style.setProperty('flex-wrap', 'wrap', 'important');
            }

            if (hasLegacySearchColumns && searchWrap instanceof HTMLElement) {
                searchWrap.style.setProperty('display', 'flex', 'important');
                searchWrap.style.setProperty('align-items', 'center', 'important');
                searchWrap.style.setProperty('justify-content', 'flex-start', 'important');
                searchWrap.style.setProperty('gap', '8px', 'important');
                searchWrap.style.setProperty('width', '100%', 'important');
                searchWrap.style.setProperty('max-width', '100%', 'important');
                searchWrap.style.setProperty('margin', '0 auto', 'important');
                searchWrap.style.setProperty('padding', '0', 'important');
                searchWrap.style.setProperty('flex-wrap', 'wrap', 'important');
            }

            if (leftBox instanceof HTMLElement) {
                leftBox.style.setProperty('display', 'block', 'important');
                leftBox.style.setProperty('flex', '0 0 128px', 'important');
                leftBox.style.setProperty('width', '128px', 'important');
                leftBox.style.setProperty('min-width', '128px', 'important');
                leftBox.style.setProperty('margin', '0', 'important');
                leftBox.style.setProperty('padding', '0', 'important');
                leftBox.style.setProperty('float', 'none', 'important');
                leftBox.style.setProperty('overflow', 'visible', 'important');
            }

            if (rightBox instanceof HTMLElement) {
                rightBox.style.setProperty('display', 'flex', 'important');
                rightBox.style.setProperty('align-items', 'center', 'important');
                rightBox.style.setProperty('flex', '1 1 260px', 'important');
                rightBox.style.setProperty('width', 'auto', 'important');
                rightBox.style.setProperty('min-width', '0', 'important');
                rightBox.style.setProperty('margin', '0', 'important');
                rightBox.style.setProperty('padding', '0', 'important');
                rightBox.style.setProperty('float', 'none', 'important');
                rightBox.style.setProperty('overflow', 'visible', 'important');
            }

            if (nativeSelectHost instanceof HTMLElement) {
                nativeSelectHost.style.setProperty('display', 'block', 'important');
                nativeSelectHost.style.setProperty('flex', '0 0 128px', 'important');
                nativeSelectHost.style.setProperty('width', '128px', 'important');
                nativeSelectHost.style.setProperty('min-width', '128px', 'important');
                nativeSelectHost.style.setProperty('height', '44px', 'important');
                nativeSelectHost.style.setProperty('margin', '0', 'important');
                nativeSelectHost.style.setProperty('padding', '0', 'important');
                nativeSelectHost.style.setProperty('box-sizing', 'border-box', 'important');
                nativeSelectHost.style.setProperty('overflow', 'hidden', 'important');
            }

            if (nativeSelect instanceof HTMLSelectElement && nativeSelectHost instanceof HTMLElement) {
                const hostParent = leftBox instanceof HTMLElement
                    ? leftBox
                    : (searchWrap instanceof HTMLElement ? searchWrap : searchForm);
                if (nativeSelect.parentElement !== nativeSelectHost) {
                    nativeSelectHost.replaceChildren(nativeSelect);
                }
                if (nativeSelectHost.parentElement !== hostParent) {
                    if (hostParent === searchWrap && bottomSearch instanceof HTMLElement) {
                        hostParent.insertBefore(nativeSelectHost, bottomSearch);
                    } else {
                        hostParent.prepend(nativeSelectHost);
                    }
                }

                nativeSelect.style.setProperty('display', 'block', 'important');
                nativeSelect.style.setProperty('width', '100%', 'important');
                nativeSelect.style.setProperty('min-width', '128px', 'important');
                nativeSelect.style.setProperty('height', '44px', 'important');
                nativeSelect.style.setProperty('margin', '0', 'important');
                nativeSelect.style.setProperty('padding', '0 10px', 'important');
                nativeSelect.style.setProperty('border', '1px solid var(--dcuf-control-border, #c6d2e4)', 'important');
                nativeSelect.style.setProperty('border-radius', '12px', 'important');
                nativeSelect.style.setProperty('background', 'var(--dcuf-control-surface, linear-gradient(180deg, #ffffff 0%, #f4f7fb 100%))', 'important');
                nativeSelect.style.setProperty('box-shadow', 'inset 0 1px 0 rgba(255, 255, 255, 0.96), 0 4px 10px rgba(20, 39, 75, 0.08)', 'important');
                nativeSelect.style.setProperty('color', 'var(--dcuf-control-text, #333)', 'important');
                nativeSelect.style.setProperty('font-size', '13px', 'important');
                nativeSelect.style.setProperty('font-weight', '700', 'important');
                nativeSelect.style.setProperty('box-sizing', 'border-box', 'important');
                nativeSelect.style.setProperty('appearance', 'auto', 'important');
                nativeSelect.style.setProperty('-webkit-appearance', 'menulist', 'important');
                nativeSelect.style.setProperty('visibility', 'visible', 'important');
                nativeSelect.style.removeProperty('position');

                if (selectBox instanceof HTMLElement) {
                    selectBox.style.setProperty('display', 'none', 'important');
                    selectBox.style.setProperty('visibility', 'hidden', 'important');
                }
                if (searchLayer instanceof HTMLElement) {
                    searchLayer.style.setProperty('display', 'none', 'important');
                }
            }

            if (!(nativeSelect instanceof HTMLSelectElement) && hasLegacySearchColumns && leftBox instanceof HTMLElement && selectBox instanceof HTMLElement && selectBox.parentElement !== leftBox) {
                leftBox.replaceChildren(selectBox);
            }

            if (hasLegacySearchColumns && rightBox instanceof HTMLElement && bottomSearch instanceof HTMLElement && bottomSearch.parentElement !== rightBox) {
                rightBox.replaceChildren(bottomSearch);
            }

            if (!(nativeSelect instanceof HTMLSelectElement) && !hasLegacySearchColumns && searchWrap instanceof HTMLElement && selectBox instanceof HTMLElement && bottomSearch instanceof HTMLElement) {
                if (selectBox.parentElement !== searchWrap) {
                    searchWrap.insertBefore(selectBox, bottomSearch);
                } else if (selectBox.nextElementSibling !== bottomSearch) {
                    searchWrap.insertBefore(selectBox, bottomSearch);
                }
            }

            if (selectBox instanceof HTMLElement && !(nativeSelect instanceof HTMLSelectElement)) {
                selectBox.style.setProperty('display', 'flex', 'important');
                selectBox.style.setProperty('align-items', 'stretch', 'important');
                selectBox.style.setProperty('position', 'relative', 'important');
                selectBox.style.setProperty('flex', '0 0 128px', 'important');
                selectBox.style.setProperty('width', '128px', 'important');
                selectBox.style.setProperty('min-width', '128px', 'important');
                selectBox.style.setProperty('height', '44px', 'important');
                selectBox.style.setProperty('margin', '0', 'important');
                selectBox.style.setProperty('float', 'none', 'important');
                selectBox.style.setProperty('overflow', 'visible', 'important');
                selectBox.style.setProperty('box-sizing', 'border-box', 'important');
                selectBox.style.setProperty('visibility', 'visible', 'important');
                selectBox.style.setProperty('border', '1px solid var(--dcuf-control-border, #c6d2e4)', 'important');
                selectBox.style.setProperty('border-radius', '12px', 'important');
                selectBox.style.setProperty('background', 'var(--dcuf-control-surface, linear-gradient(180deg, #ffffff 0%, #f4f7fb 100%))', 'important');
                selectBox.style.setProperty('box-shadow', 'inset 0 1px 0 rgba(255, 255, 255, 0.96), 0 4px 10px rgba(20, 39, 75, 0.08)', 'important');
            }

            if (selectArea instanceof HTMLElement) {
                selectArea.style.setProperty('display', 'flex', 'important');
                selectArea.style.setProperty('align-items', 'center', 'important');
                selectArea.style.setProperty('justify-content', 'space-between', 'important');
                selectArea.style.setProperty('position', 'relative', 'important');
                selectArea.style.setProperty('width', '100%', 'important');
                selectArea.style.setProperty('height', '100%', 'important');
                selectArea.style.setProperty('padding', '0 30px 0 10px', 'important');
                selectArea.style.setProperty('border', '0', 'important');
                selectArea.style.setProperty('background', 'transparent', 'important');
                selectArea.style.setProperty('box-sizing', 'border-box', 'important');
                selectArea.style.setProperty('overflow', 'hidden', 'important');
                selectArea.style.setProperty('color', 'var(--dcuf-control-text, #333)', 'important');
            }

            if (selectInner instanceof HTMLElement) {
                selectInner.style.setProperty('display', 'block', 'important');
                selectInner.style.setProperty('position', 'absolute', 'important');
                selectInner.style.setProperty('right', '0', 'important');
                selectInner.style.setProperty('top', '0', 'important');
                selectInner.style.setProperty('width', '34px', 'important');
                selectInner.style.setProperty('height', '100%', 'important');
            }

            if (bottomSearch instanceof HTMLElement) {
                bottomSearch.style.setProperty('display', 'flex', 'important');
                bottomSearch.style.setProperty('align-items', 'center', 'important');
                bottomSearch.style.setProperty('flex', '1 1 260px', 'important');
                bottomSearch.style.setProperty('width', 'auto', 'important');
                bottomSearch.style.setProperty('height', 'auto', 'important');
                bottomSearch.style.setProperty('min-width', '0', 'important');
                bottomSearch.style.setProperty('margin', '0', 'important');
                bottomSearch.style.setProperty('float', 'none', 'important');
                bottomSearch.style.setProperty('position', 'static', 'important');
                bottomSearch.style.setProperty('inset', 'auto', 'important');
                bottomSearch.style.setProperty('transform', 'none', 'important');
            }

            if (innerSearch instanceof HTMLElement) {
                innerSearch.style.setProperty('display', 'block', 'important');
                innerSearch.style.setProperty('flex', '1 1 auto', 'important');
                innerSearch.style.setProperty('width', 'auto', 'important');
                innerSearch.style.setProperty('height', '44px', 'important');
                innerSearch.style.setProperty('margin', '0', 'important');
                innerSearch.style.setProperty('padding', '0', 'important');
                innerSearch.style.setProperty('border', '1px solid var(--dcuf-control-border, #c6d2e4)', 'important');
                innerSearch.style.setProperty('border-radius', '12px', 'important');
                innerSearch.style.setProperty('background', 'var(--dcuf-search-input, #fff)', 'important');
                innerSearch.style.setProperty('box-shadow', 'inset 0 1px 2px rgba(20, 39, 75, 0.06), 0 4px 10px rgba(20, 39, 75, 0.07)', 'important');
                innerSearch.style.setProperty('overflow', 'hidden', 'important');
            }

            if (keywordInput instanceof HTMLInputElement) {
                keywordInput.style.setProperty('width', '100%', 'important');
                keywordInput.style.setProperty('height', '42px', 'important');
                keywordInput.style.setProperty('margin', '0', 'important');
                keywordInput.style.setProperty('padding', '0 13px', 'important');
                keywordInput.style.setProperty('border', 'none', 'important');
                keywordInput.style.setProperty('border-radius', '11px', 'important');
                keywordInput.style.setProperty('background', 'var(--dcuf-search-input, #fff)', 'important');
                keywordInput.style.setProperty('box-shadow', 'none', 'important');
                keywordInput.style.setProperty('box-sizing', 'border-box', 'important');
            }

            if (searchButton instanceof HTMLElement) {
                searchButton.style.setProperty('flex', 'none', 'important');
                searchButton.style.setProperty('width', '44px');
                searchButton.style.setProperty('min-width', '44px');
                searchButton.style.setProperty('height', '44px');
                searchButton.style.setProperty('margin', '0', 'important');
            }

            if (searchLayer instanceof HTMLElement) {
                searchLayer.style.setProperty('left', '0', 'important');
                searchLayer.style.setProperty('top', 'calc(100% + 8px)', 'important');
                searchLayer.style.setProperty('border', '1px solid #3b4890', 'important');
                searchLayer.style.setProperty('background', '#fff', 'important');
                searchLayer.style.setProperty('box-shadow', 'none', 'important');
            }
        },

        enhanceBottomControls(bottomControls) {
            if (!(bottomControls instanceof HTMLElement)) return;

            const searchSlot = bottomControls.querySelector(`.${this.CUSTOM_CLASSES.SEARCH_SLOT}`);
            if (searchSlot instanceof HTMLElement) {
                this.normalizeSearchFormLayout(searchSlot);
                this.bindSearchDrawerReserve(searchSlot);
            }
            bottomControls.setAttribute('data-dcuf-controls-ready', '1');
        },

        createBottomControls(listWrap) {
            const gallTabs = this.findBottomControlElement(listWrap, this.SELECTORS.GALL_TABS)
                || this.findAdjacentViewListActionBar(listWrap);
            const pagination = this.findBottomControlElement(listWrap, this.SELECTORS.PAGINATION);
            const pageMoveBox = this.findBottomControlElement(listWrap, this.SELECTORS.PAGE_MOVE_BOX);
            const searchForm = this.findBottomControlElement(listWrap, this.SELECTORS.SEARCH_FORM);
            const searchLayer = this.findBottomControlElement(listWrap, this.SELECTORS.SEARCH_LAYER);


            if (!gallTabs && !pagination && !pageMoveBox && !searchForm) return null;


            const bottomControls = document.createElement('div');
            bottomControls.className = this.CUSTOM_CLASSES.BOTTOM_CONTROLS;


            if (gallTabs) {
                const buttonRow = document.createElement('div');
                buttonRow.className = 'custom-button-row dcuf-bottom-action-card';
                buttonRow.appendChild(gallTabs);
                bottomControls.appendChild(buttonRow);
            }


            if (pagination || pageMoveBox) {
                const paginationCard = document.createElement('div');
                paginationCard.className = 'dcuf-pagination-card';
                if (pagination) paginationCard.appendChild(pagination);
                if (pageMoveBox) paginationCard.appendChild(pageMoveBox);
                bottomControls.appendChild(paginationCard);
            }

            if (searchForm) {
                const searchCard = document.createElement('div');
                searchCard.className = 'dcuf-search-card';
                const searchSlot = document.createElement('div');
                searchSlot.className = this.CUSTOM_CLASSES.SEARCH_SLOT;
                if (searchLayer instanceof HTMLElement && !searchForm.contains(searchLayer)) {
                    searchForm.appendChild(searchLayer);
                }
                searchSlot.appendChild(searchForm);
                searchCard.appendChild(searchSlot);
                bottomControls.appendChild(searchCard);
            }

            this.enhanceBottomControls(bottomControls);

            return bottomControls;
        },

        ensureBottomControls(listWrap) {
            if (!(listWrap instanceof HTMLElement)) return null;
            let bottomControls = listWrap.querySelector(`.${this.CUSTOM_CLASSES.BOTTOM_CONTROLS}`);
            if (!(bottomControls instanceof HTMLElement)) {
                bottomControls = this.createBottomControls(listWrap);
            }
            if (bottomControls instanceof HTMLElement && bottomControls.parentElement !== listWrap) {
                listWrap.appendChild(bottomControls);
            }
            this.enhanceBottomControls(bottomControls);
            return bottomControls instanceof HTMLElement ? bottomControls : null;
        },

        bindTooltipEvents(listContainer) {
            if (!(listContainer instanceof HTMLElement)) return;
            if (listContainer.getAttribute(this.TOOLTIP_BOUND_ATTR) === '1') return;
            listContainer.setAttribute(this.TOOLTIP_BOUND_ATTR, '1');

            const tooltip = document.getElementById('custom-instant-tooltip');
            if (!tooltip) return;

            listContainer.addEventListener('mouseover', (e) => {
                const subject = e.target.closest('.gall_subject');
                if (subject && subject.title) {
                    tooltip.textContent = subject.title;
                    tooltip.style.display = 'block';
                }
            });
            listContainer.addEventListener('mouseout', () => {
                tooltip.style.display = 'none';
            });
            listContainer.addEventListener('mousemove', (e) => {
                if (tooltip.style.display === 'block') {
                    tooltip.style.left = `${e.clientX + 10}px`;
                    tooltip.style.top = `${e.clientY + 10}px`;
                }
            });
        },

        getOrAssignRowId(originalRow) {
            if (!(originalRow instanceof HTMLElement)) return '';
            let rowId = originalRow.getAttribute(this.DATA_ATTR);
            if (rowId) return rowId;
            rowId = `dcuf-row-${this._nextRowId++}`;
            originalRow.setAttribute(this.DATA_ATTR, rowId);
            return rowId;
        },

        captureListTransaction(listWrap, originalTable) {
            const scope = this.resolveBottomControlScope(listWrap) || listWrap;
            const movableSelector = [
                this.SELECTORS.PAGINATION, this.SELECTORS.GALL_TABS, this.SELECTORS.SEARCH_FORM,
                this.SELECTORS.SEARCH_LAYER, this.SELECTORS.PAGE_MOVE_BOX, '.view_bottom_btnbox'
            ].join(', ');
            const movedNodes = Array.from(scope.querySelectorAll(movableSelector))
                .filter((node) => !node.closest(`.${this.CUSTOM_CLASSES.BOTTOM_CONTROLS}`))
                .map((node) => ({
                    node, parent: node.parentNode, nextSibling: node.nextSibling,
                    style: node.getAttribute('style'), className: node.getAttribute('class')
                }));
            return {
                originalTableStyle: originalTable.getAttribute('style'),
                transformedValue: listWrap.getAttribute(this.TRANSFORMED_ATTR),
                existingCustomLists: new Set(listWrap.querySelectorAll(`.${this.CUSTOM_CLASSES.MOBILE_LIST}`)),
                existingBottomControls: new Set(scope.querySelectorAll(`.${this.CUSTOM_CLASSES.BOTTOM_CONTROLS}`)),
                movedNodes
            };
        },

        rollbackListState(state, reason = 'boot-degraded') {
            if (!state) return;
            state.tbodyObserver?.disconnect();
            state.syncScheduler?.cancel?.();
            const transaction = state.transaction || {};
            const listWrap = state.listWrap;
            const originalTable = state.originalTable;
            if (state.newListContainer instanceof HTMLElement && !transaction.existingCustomLists?.has(state.newListContainer)) state.newListContainer.remove();
            const scope = this.resolveBottomControlScope(listWrap) || listWrap;
            scope?.querySelectorAll?.(`.${this.CUSTOM_CLASSES.BOTTOM_CONTROLS}`).forEach((node) => {
                if (!transaction.existingBottomControls?.has(node)) node.remove();
            });
            Array.from(transaction.movedNodes || []).reverse().forEach((entry) => {
                if (!entry?.node || !entry.parent) return;
                if (entry.nextSibling?.parentNode === entry.parent) entry.parent.insertBefore(entry.node, entry.nextSibling);
                else entry.parent.appendChild(entry.node);
                if (entry.style === null) entry.node.removeAttribute('style');
                else entry.node.setAttribute('style', entry.style);
                if (entry.className === null) entry.node.removeAttribute('class');
                else entry.node.setAttribute('class', entry.className);
            });
            if (originalTable instanceof HTMLElement) {
                if (transaction.originalTableStyle === null) originalTable.removeAttribute('style');
                else originalTable.setAttribute('style', transaction.originalTableStyle);
            }
            if (listWrap instanceof HTMLElement) {
                if (transaction.transformedValue === null) listWrap.removeAttribute(this.TRANSFORMED_ATTR);
                else listWrap.setAttribute(this.TRANSFORMED_ATTR, transaction.transformedValue);
                this.LIST_STATE_MAP.delete(listWrap);
            }
            this.ACTIVE_LIST_STATES.delete(state);
            state.rolledBack = true;
            this.recordDiagnostic('ui.listState.rolledBack');
            this.getRuntimeCoordinator()?.noteDiagnostic?.('ui.list.rollback', { reason });
        },

        rollbackInitialListTransactions(reason = 'boot-degraded') {
            Array.from(this.ACTIVE_LIST_STATES).reverse().forEach((state) => this.rollbackListState(state, reason));
        },

        createListState(listWrap, originalTable, originalTbody, newListContainer, transaction = null) {
            const state = {
                runtimeId: this._nextListRuntimeId++,
                listWrap,
                originalTable,
                originalTbody,
                newListContainer,
                transaction,
                committed: false,
                itemByRowId: new Map(),
                dirtyRows: new Set(),
                tbodyObserver: null,
                syncScheduler: null,
                rebuildAll: false,
                mutationGeneration: 0,
                lastSyncedGeneration: -1,
                lastSyncReason: 'init',
                suppressNextTbodySchedule: false
            };

            state.syncScheduler = this.createPhaseScheduler(`ui-list-${state.runtimeId}`, ({ delay }) => {
                if (delay > 0 && state.lastSyncedGeneration === state.mutationGeneration) {
                    this.recordDiagnostic('ui.listState.skippedUnchanged');
                    return;
                }
                this.syncListState(state, state.lastSyncReason);
                state.lastSyncedGeneration = state.mutationGeneration;
            }, [90]);

            this.ACTIVE_LIST_STATES.add(state);
            return state;
        },

        hydrateExistingListItems(state) {
            if (!(state?.newListContainer instanceof HTMLElement)) return;
            state.itemByRowId.clear();
            state.newListContainer.querySelectorAll(`.${this.CUSTOM_CLASSES.POST_ITEM}[${this.DATA_ATTR}]`).forEach((item) => {
                const rowId = item.getAttribute(this.DATA_ATTR);
                if (rowId) state.itemByRowId.set(rowId, item);
            });
        },

        destroyListState(state, reason = 'destroy') {
            if (!state) return;
            if (state.tbodyObserver) state.tbodyObserver.disconnect();
            if (state.syncScheduler && typeof state.syncScheduler.cancel === 'function') {
                state.syncScheduler.cancel();
            }
            if (state.listWrap instanceof HTMLElement) {
                state.listWrap.removeAttribute(this.TRANSFORMED_ATTR);
            }
            this.ACTIVE_LIST_STATES.delete(state);
            this.LIST_STATE_MAP.delete(state.listWrap);
            if (state.itemByRowId && typeof state.itemByRowId.clear === 'function') {
                state.itemByRowId.clear();
            }
            if (state.dirtyRows && typeof state.dirtyRows.clear === 'function') {
                state.dirtyRows.clear();
            }
            state.listWrap = null;
            state.originalTable = null;
            state.originalTbody = null;
            state.newListContainer = null;
            state.itemByRowId = null;
            state.tbodyObserver = null;
            state.syncScheduler = null;
            this.recordDiagnostic('ui.listState.destroyed');
        },


        applyForceRefreshPagination(containerElement) {
            if (!(containerElement instanceof HTMLElement)) return;
            if (containerElement.getAttribute(this.PAGINATION_BOUND_ATTR) === '1') return;
            containerElement.setAttribute(this.PAGINATION_BOUND_ATTR, '1');
            containerElement.addEventListener('click', (e) => {
                const link = e.target.closest('a');
                if (!link) return;

                // ▼▼▼ [수정됨] 이 부분을 추가하여 'javascript:;' 링크는 무시하도록 변경 ▼▼▼
                // 'ㅇㅇ님' 버튼과 같이 자바스크립트 실행이 목적인 링크의 이벤트를 가로채지 않도록 예외 처리합니다.
                if (link.getAttribute('href') === 'javascript:;') {
                    return;
                }
                // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

                const onclickAttr = link.getAttribute('onclick') || '';
                const hrefAttr = link.getAttribute('href') || '';
                if (onclickAttr.includes('goWrite') || onclickAttr.includes('showLayer') || hrefAttr.includes('listDisp') || onclickAttr.includes('listSearchHead')) {
                    return;
                }
                if (link.href) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    window.location.href = link.href;
                }
            }, true);
        },

        scheduleListSync(state, reason = 'sync', { rebuildAll = false, dirtyRows = null } = {}) {
            if (!state) return;
            if (rebuildAll) state.rebuildAll = true;
            if (dirtyRows && typeof dirtyRows[Symbol.iterator] === 'function') {
                Array.from(dirtyRows).forEach((row) => {
                    if (row instanceof HTMLElement) state.dirtyRows?.add(row);
                });
            }
            state.mutationGeneration = (Number(state.mutationGeneration) || 0) + 1;
            state.lastSyncReason = reason;
            state.syncScheduler?.schedule({ reason });
        },

        syncListState(state, reason = 'sync') {
            if (!state?.listWrap?.isConnected) {
                this.destroyListState(state, 'list-wrap-detached');
                return;
            }

            const originalTable = state.listWrap.querySelector(this.SELECTORS.ORIGINAL_TABLE);
            const originalTbody = originalTable?.querySelector(this.SELECTORS.ORIGINAL_TBODY);
            if (!originalTable || !originalTbody) return;

            if (originalTbody !== state.originalTbody) {
                this.destroyListState(state, 'tbody-replaced');
                this.ensureListRuntime(state.listWrap, `${reason}:tbody-replaced`);
                return;
            }

            state.originalTable = originalTable;
            state.originalTbody = originalTbody;

            if (!state.newListContainer.isConnected && state.originalTable.parentNode) {
                state.originalTable.parentNode.insertBefore(state.newListContainer, state.originalTable.nextSibling);
            }

            const shouldRebuildAll = state.rebuildAll;
            const originalRows = Array.from(state.originalTbody.querySelectorAll(this.SELECTORS.ORIGINAL_POST_ITEM));
            const seenRowIds = new Set();
            let previousItem = null;
            let rebuiltRowCount = 0;

            originalRows.forEach((row) => {
                try {
                    const rowId = this.getOrAssignRowId(row);
                    if (!rowId) return;
                    seenRowIds.add(rowId);

                    let mirroredItem = state.itemByRowId.get(rowId);
                    if ((shouldRebuildAll || state.dirtyRows?.has(row)) && mirroredItem instanceof HTMLElement) {
                        mirroredItem.remove();
                        state.itemByRowId.delete(rowId);
                        mirroredItem = null;
                        rebuiltRowCount += 1;
                    }

                    if (!(mirroredItem instanceof HTMLElement)) {
                        mirroredItem = this.createMobileListItem(row, rowId);
                        if (!mirroredItem) return;
                        this.proxyClick(mirroredItem, row);
                        state.itemByRowId.set(rowId, mirroredItem);
                    }

                    this.updateItemVisibility(row, mirroredItem);

                    if (previousItem === null) {
                        if (state.newListContainer.firstElementChild !== mirroredItem) {
                            state.newListContainer.insertBefore(mirroredItem, state.newListContainer.firstElementChild);
                        }
                    } else if (previousItem.nextElementSibling !== mirroredItem) {
                        state.newListContainer.insertBefore(mirroredItem, previousItem.nextElementSibling);
                    }

                    previousItem = mirroredItem;
                } catch (error) {
                    console.error('[DC Filter+UI] Failed to sync a mirrored post item:', error, row);
                }
            });

            Array.from(state.itemByRowId.entries()).forEach(([rowId, mirroredItem]) => {
                if (seenRowIds.has(rowId)) return;
                if (mirroredItem instanceof HTMLElement) mirroredItem.remove();
                state.itemByRowId.delete(rowId);
            });

            state.rebuildAll = false;
            state.dirtyRows?.clear();
            state.listWrap.setAttribute(this.TRANSFORMED_ATTR, 'true');
            state.originalTable.style.setProperty('display', 'none', 'important');
            state.committed = true;
            if (rebuiltRowCount > 0) this.recordDiagnostic('ui.listRows.rebuilt', rebuiltRowCount);
            this.getRuntimeCoordinator()?.setDiagnosticGauge?.('ui.listRows.lastRebuilt', rebuiltRowCount);
            this.recordDiagnostic('ui.listState.synced');
            MobileConvenienceModule.onListCommitted(state, reason);
        },

        syncListStateImmediately(state, reason = 'immediate', { suppressTbodySchedule = false } = {}) {
            if (!state) return;
            state.lastSyncReason = reason;
            state.suppressNextTbodySchedule = suppressTbodySchedule;
            if (typeof state.syncScheduler?.flush === 'function') {
                state.syncScheduler.flush({ reason });
                return;
            }
            this.syncListState(state, reason);
            if (!state.rolledBack && state.listWrap) {
                state.lastSyncedGeneration = state.mutationGeneration;
            }
        },

        attachOriginalTbodyObserver(state) {
            if (!state?.originalTbody || state.tbodyObserver) return;

            state.tbodyObserver = new MutationObserver((mutations) => {
                const visibilityTargets = new Set();
                const dirtyRows = new Set();
                let needsResync = false;

                const addDirtyRow = (node) => {
                    const element = node instanceof Element ? node : node?.parentElement;
                    if (!(element instanceof Element)) return;
                    const row = element.matches?.(this.SELECTORS.ORIGINAL_POST_ITEM)
                        ? element
                        : element.closest?.(this.SELECTORS.ORIGINAL_POST_ITEM);
                    if (row instanceof HTMLElement && row.closest(this.SELECTORS.ORIGINAL_TBODY) === state.originalTbody) {
                        dirtyRows.add(row);
                    }
                };

                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
                        const originalRow = mutation.target;
                        if (originalRow instanceof HTMLElement && originalRow.matches(this.SELECTORS.ORIGINAL_POST_ITEM)) {
                            visibilityTargets.add(originalRow);
                        }
                        return;
                    }

                    if (mutation.type === 'characterData') {
                        addDirtyRow(mutation.target);
                        needsResync = true;
                        return;
                    }

                    if (mutation.type === 'childList') {
                        addDirtyRow(mutation.target);
                        mutation.addedNodes.forEach(addDirtyRow);
                        mutation.removedNodes.forEach(addDirtyRow);
                        needsResync = true;
                    }
                });

                visibilityTargets.forEach((originalRow) => {
                    const rowId = originalRow.getAttribute(this.DATA_ATTR);
                    if (!rowId) return;
                    const mirroredItem = state.itemByRowId.get(rowId);
                    if (mirroredItem) this.updateItemVisibility(originalRow, mirroredItem);
                });

                if (needsResync) {
                    if (state.suppressNextTbodySchedule) {
                        state.suppressNextTbodySchedule = false;
                        this.recordDiagnostic('ui.listImmediate.suppressedTbodySchedule');
                        return;
                    }
                    this.scheduleListSync(state, 'tbody-mutated', { dirtyRows });
                }
            });

            state.tbodyObserver.observe(state.originalTbody, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: true,
                attributeFilter: ['style', 'class']
            });
        },

        ensureListRuntime(listWrap, reason = 'ensure', { scheduleExisting = true, scheduleInitial = true } = {}) {
            if (!(listWrap instanceof HTMLElement)) return null;
            const ownedListWrap = this.resolveOwnedListWrap(listWrap);
            if (!(ownedListWrap instanceof HTMLElement) || ownedListWrap !== listWrap) return null;

            const originalTable = listWrap.querySelector(this.SELECTORS.ORIGINAL_TABLE);
            const originalTbody = originalTable?.querySelector(this.SELECTORS.ORIGINAL_TBODY);
            if (!originalTable || !originalTbody) return null;

            const existingState = this.LIST_STATE_MAP.get(listWrap);
            if (existingState && existingState.originalTbody === originalTbody && existingState.newListContainer instanceof HTMLElement) {
                this.ensureBottomControls(listWrap);
                this.enhanceOriginalSearchForms(listWrap);
                if (scheduleExisting) this.scheduleListSync(existingState, reason);
                return existingState;
            }

            if (existingState) this.destroyListState(existingState, 'list-runtime-refresh');

            const transaction = this.captureListTransaction(listWrap, originalTable);
            let newListContainer = null;
            let state = null;
            try {
                newListContainer = listWrap.querySelector(`.${this.CUSTOM_CLASSES.MOBILE_LIST}`);
                if (!(newListContainer instanceof HTMLElement)) {
                    newListContainer = document.createElement('div');
                    newListContainer.className = this.CUSTOM_CLASSES.MOBILE_LIST;
                    originalTable.parentNode.insertBefore(newListContainer, originalTable.nextSibling);
                }

                this.bindTooltipEvents(newListContainer);
                this.ensureBottomControls(listWrap);
                this.enhanceOriginalSearchForms(listWrap);
                this.applyForceRefreshPagination(listWrap);
                const testBoot = __dcufRoot.__DCUF_TESTBED_CONFIG__?.boot;
                if (testBoot?.failListPrepareOnce && !__dcufRoot.__dcufListPrepareFailureInjected) {
                    __dcufRoot.__dcufListPrepareFailureInjected = true;
                    throw new Error('testbed list prepare failure');
                }

                state = this.createListState(listWrap, originalTable, originalTbody, newListContainer, transaction);
                this.LIST_STATE_MAP.set(listWrap, state);
                this.hydrateExistingListItems(state);
                this.attachOriginalTbodyObserver(state);
                if (scheduleInitial) this.scheduleListSync(state, reason, { rebuildAll: true });
                this.recordDiagnostic('ui.listState.created');
                return state;
            } catch (error) {
                this.rollbackListState(state || { listWrap, originalTable, newListContainer, transaction }, 'list-prepare-failed');
                throw error;
            }
        },

        ensureKnownListRuntimes(root = document, reason = 'ensure-known', options = {}) {
            this.collectOwnedListWraps(root).forEach((listWrap) => this.ensureListRuntime(listWrap, reason, options));
        },

        ensureListRuntimesFromCandidates(candidates, reason = 'ensure-candidates', options = {}) {
            if (!candidates || typeof candidates[Symbol.iterator] !== 'function') return [];
            const seen = new Set();
            const resolved = [];
            Array.from(candidates).forEach((candidate) => {
                const listWrap = this.resolveOwnedListWrap(candidate);
                if (!(listWrap instanceof HTMLElement) || seen.has(listWrap)) return;
                seen.add(listWrap);
                resolved.push(listWrap);
                this.ensureListRuntime(listWrap, reason, options);
            });
            return resolved;
        },

        syncImmediateViewBottomLists(payload) {
            if (!this.isViewPage() || typeof payload?.collectMatches !== 'function') return;
            Array.from(this.ACTIVE_LIST_STATES).forEach((state) => {
                if (!state?.listWrap?.isConnected) this.destroyListState(state, 'immediate-view-bottom-detached');
            });
            const candidates = payload.collectMatches([
                this.SELECTORS.LIST_WRAP,
                this.SELECTORS.ORIGINAL_TABLE,
                this.SELECTORS.ORIGINAL_TBODY
            ], { includeRoots: true });
            const seen = new Set();
            candidates.forEach((candidate) => {
                const listWrap = this.resolveOwnedListWrap(candidate);
                if (!(listWrap instanceof HTMLElement) || seen.has(listWrap) || !listWrap.closest('.view_bottom')) return;
                seen.add(listWrap);
                const existingState = this.LIST_STATE_MAP.get(listWrap);
                const state = this.ensureListRuntime(listWrap, 'immediate-view-bottom', {
                    scheduleExisting: false,
                    scheduleInitial: false
                });
                if (!state) return;

                this.syncListStateImmediately(state, 'immediate-view-bottom', {
                    suppressTbodySchedule: existingState === state
                });
                this.recordDiagnostic('ui.listImmediate.synced');
            });
        },

        subscribeListRuntimeUpdates() {
            if (typeof this._listMutationUnsubscribe === 'function') return;
            if (!this.getPageContext().hasListSurface) return;

            const runtimeCoordinator = this.getRuntimeCoordinator();
            if (runtimeCoordinator && typeof runtimeCoordinator.subscribeMutations === 'function') {
                if (this.isViewPage() && typeof runtimeCoordinator.subscribeImmediateMutations === 'function') {
                    this._listImmediateMutationUnsubscribe = runtimeCoordinator.subscribeImmediateMutations(
                        'ui-view-bottom-list-visibility',
                        (payload) => this.syncImmediateViewBottomLists(payload),
                        { contexts: ['view'], mutationScope: 'view-bottom-list' }
                    );
                }
                this._listMutationUnsubscribe = runtimeCoordinator.subscribeMutations('ui-list-runtime', (payload) => {
                    const candidates = payload.collectMatches([
                        this.SELECTORS.LIST_WRAP,
                        this.SELECTORS.ORIGINAL_TABLE,
                        this.SELECTORS.ORIGINAL_TBODY,
                        this.SELECTORS.GALL_TABS,
                        this.SELECTORS.PAGINATION,
                        this.SELECTORS.PAGE_MOVE_BOX,
                        this.SELECTORS.SEARCH_FORM
                    ], { includeRoots: true });
                    if (candidates.length === 0) return;

                    this.ensureListRuntimesFromCandidates(candidates, 'mutation-bus', {
                        scheduleExisting: !this.isViewPage()
                    });
                }, { contexts: ['list-surface'] });
                return;
            }

            if (window.__dcufUiListObserver) return;
            const observer = new MutationObserver((mutations) => {
                const candidates = [];
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (!(node instanceof Element)) return;
                        candidates.push(node);
                    });
                });
                this.ensureListRuntimesFromCandidates(candidates, 'mutation-observer');
            });
            observer.observe(document.body, { childList: true, subtree: true });
            window.__dcufUiListObserver = observer;
        },

        processAllLists(reason = 'processAllLists') {
            this.recordDiagnostic('ui.processAllLists');
            this.ensureKnownListRuntimes(document, `${reason}:full-scan`);
        },

        isBoardPage(pageName) {
            return this.getPageContext().type === pageName;
        },

        getPageContext() {
            const sharedContext = window.__dcufPageContext;
            if (sharedContext && typeof sharedContext === 'object') return sharedContext;
            const type = ((window.location.pathname || '').match(/\/board\/(lists|view|write|modify)(?:\/|$)/) || [])[1] || 'other';
            return {
                type,
                isList: type === 'lists',
                isView: type === 'view',
                isWrite: type === 'write',
                isModify: type === 'modify',
                isWriteSurface: type === 'write' || type === 'modify',
                isOther: type === 'other',
                isTargetPage: type !== 'other',
                hasListSurface: type === 'lists' || type === 'view',
                hasComments: type === 'view'
            };
        },

        isListPage() {
            return this.isBoardPage('lists');
        },

        isViewPage() {
            return this.isBoardPage('view');
        },

        getWriteForm() {
            const standardWriteForm = document.querySelector('form#write');
            if (standardWriteForm instanceof HTMLFormElement) return standardWriteForm;
            if (!this.getPageContext().isModify) return null;
            const modifyForm = document.querySelector('form[name="modify"][action*="modify_submit"]');
            return modifyForm instanceof HTMLFormElement ? modifyForm : null;
        },

        isWritePage() {
            const pageContext = this.getPageContext();
            return pageContext.isWrite || (pageContext.isModify && this.getWriteForm() instanceof HTMLFormElement);
        },

        isModifyPage() {
            return this.getPageContext().isModify === true;
        },

        shouldEnsureListRuntimeForReveal() {
            return this.getPageContext().hasListSurface === true;
        },

        updateRevealDebug(channel, state, meta = {}) {
            const snapshot = {
                updatedAt: new Date().toISOString(),
                ready: Boolean(state?.ready),
                reason: state?.reason || 'unknown',
                detail: state?.detail && typeof state.detail === 'object' ? { ...state.detail } : null,
                ...meta
            };
            const previous = window.__dcufRevealDebug && typeof window.__dcufRevealDebug === 'object'
                ? window.__dcufRevealDebug
                : {};
            window.__dcufRevealDebug = { ...previous, [channel]: snapshot };
            this.getRuntimeCoordinator()?.noteDiagnostic?.(`ui.reveal.${channel}`, snapshot);
            return snapshot;
        },

        updateInitialRevealDebug(state, meta = {}) {
            return this.updateRevealDebug('initial', state, meta);
        },

        updatePostRevealRecoveryDebug(state, meta = {}) {
            return this.updateRevealDebug('recovery', state, meta);
        },

        evaluateListStructureState(listWrap) {
            if (!(listWrap instanceof HTMLElement)) {
                return {
                    ready: false,
                    reason: 'waiting-list',
                    detail: { message: 'list wrap unavailable' }
                };
            }

            const originalTable = listWrap.querySelector(this.SELECTORS.ORIGINAL_TABLE);
            const originalTbody = originalTable?.querySelector(this.SELECTORS.ORIGINAL_TBODY);
            const newListContainer = listWrap.querySelector(`.${this.CUSTOM_CLASSES.MOBILE_LIST}`);
            if (!(newListContainer instanceof HTMLElement)) {
                return {
                    ready: false,
                    reason: 'waiting-list',
                    detail: {
                        listWrapClass: listWrap.className || null,
                        hasOriginalTable: !!originalTable,
                        hasOriginalTbody: !!originalTbody
                    }
                };
            }

            const originalRowCount = originalTbody
                ? originalTbody.querySelectorAll(this.SELECTORS.ORIGINAL_POST_ITEM).length
                : 0;
            const customItemCount = newListContainer.querySelectorAll(`.${this.CUSTOM_CLASSES.POST_ITEM}`).length;
            if (originalRowCount > 0 && customItemCount === 0) {
                return {
                    ready: false,
                    reason: 'waiting-items',
                    detail: { originalRowCount, customItemCount }
                };
            }

            if (customItemCount === 0) {
                return {
                    ready: true,
                    reason: 'ready',
                    detail: { originalRowCount, customItemCount }
                };
            }

            const runtimeState = this.LIST_STATE_MAP.get(listWrap);
            const committed = runtimeState?.newListContainer === newListContainer && runtimeState.committed === true;
            if (!committed) {
                return {
                    ready: false,
                    reason: 'waiting-list-commit',
                    detail: { originalRowCount, customItemCount, committed: false }
                };
            }

            return {
                ready: true,
                reason: 'ready',
                detail: { originalRowCount, customItemCount, committed: true }
            };
        },

        evaluateListInitialRevealState(listWrap) {
            const structureState = this.evaluateListStructureState(listWrap);
            if (!structureState.ready) return structureState;

            const { originalRowCount = 0, customItemCount = 0 } = structureState.detail || {};
            if (customItemCount === 0) return structureState;
            const newListContainer = listWrap.querySelector(`.${this.CUSTOM_CLASSES.MOBILE_LIST}`);
            if (!(newListContainer instanceof HTMLElement)) {
                return {
                    ready: false,
                    reason: 'waiting-list',
                    detail: { originalRowCount, customItemCount, missingCustomList: true }
                };
            }

            const themeBridge = this.getPhase1Theme();
            if (typeof themeBridge?.verify !== 'function') {
                return {
                    ready: false,
                    reason: 'waiting-style',
                    detail: {
                        originalRowCount,
                        customItemCount,
                        missingThemeBridge: true
                    }
                };
            }

            const verifyResult = themeBridge.verify(newListContainer);
            if (!verifyResult?.ready) {
                return {
                    ready: false,
                    reason: 'waiting-style',
                    detail: {
                        originalRowCount,
                        customItemCount,
                        verifyReason: verifyResult?.reason || 'unknown',
                        verifyDetail: verifyResult?.detail || null
                    }
                };
            }

            return {
                ready: true,
                reason: 'ready',
                detail: {
                    originalRowCount,
                    customItemCount,
                    verifyReason: verifyResult.reason || 'ready',
                    verifyDetail: verifyResult.detail || null
                }
            };
        },

        evaluateViewInitialRevealState() {
            const viewWrap = document.querySelector('.view_content_wrap');
            if (!(viewWrap instanceof HTMLElement)) {
                return {
                    ready: false,
                    reason: 'waiting-view',
                    detail: { hasViewWrap: false }
                };
            }

            const viewBottom = document.querySelector('.view_bottom');
            const recommendBox = viewWrap.querySelector('.btn_recommend_box');
            const commentSignal = document.querySelector('#focus_cmt, .view_comment, div[id^="comment_wrap_"]');
            const commentBox = document.querySelector('#focus_cmt .comment_box, div[id^="comment_wrap_"] .comment_box, .view_comment .comment_box');
            const commentWriteBox = document.querySelector('#focus_cmt > .cmt_write_box, #focus_cmt .cmt_write_box, .view_comment .cmt_write_box');
            const hasBottomListSignal = !!viewBottom?.querySelector('.gall_listwrap, .list_wrap, table.gall_list, tr.ub-content');
            const embeddedListWraps = viewBottom instanceof HTMLElement ? this.collectOwnedListWraps(viewBottom) : [];

            if (hasBottomListSignal && embeddedListWraps.length === 0) {
                return {
                    ready: false,
                    reason: 'waiting-list',
                    detail: {
                        hasViewWrap: true,
                        hasViewBottom: true,
                        hasBottomListSignal: true,
                        embeddedListCount: 0,
                        revealTheme: 'view'
                    }
                };
            }

            for (let index = 0; index < embeddedListWraps.length; index += 1) {
                const wrapState = this.evaluateListStructureState(embeddedListWraps[index]);
                if (!wrapState.ready) {
                    return {
                        ready: false,
                        reason: wrapState.reason,
                        detail: {
                            hasViewWrap: true,
                            hasViewBottom: true,
                            hasBottomListSignal,
                            embeddedListCount: embeddedListWraps.length,
                            embeddedListIndex: index,
                            revealTheme: 'view',
                            ...wrapState.detail
                        }
                    };
                }
            }

            const themeBridge = this.getPhase1ViewTheme();
            if (typeof themeBridge?.verify !== 'function') {
                return {
                    ready: false,
                    reason: 'waiting-style',
                    detail: {
                        hasViewWrap: true,
                        hasViewBottom: viewBottom instanceof HTMLElement,
                        hasRecommendBox: recommendBox instanceof HTMLElement,
                        revealTheme: 'view',
                        missingThemeBridge: true
                    }
                };
            }

            const verifyResult = themeBridge.verify(document, { mode: 'core' });
            if (!verifyResult?.ready) {
                return {
                    ready: false,
                    reason: verifyResult?.reason === 'waiting-comments' ? 'waiting-comments' : 'waiting-style',
                    detail: {
                        hasViewWrap: true,
                        hasViewBottom: viewBottom instanceof HTMLElement,
                        hasRecommendBox: recommendBox instanceof HTMLElement,
                        hasCommentSignal: commentSignal instanceof HTMLElement,
                        hasCommentBox: commentBox instanceof HTMLElement,
                        hasCommentWriteBox: commentWriteBox instanceof HTMLElement,
                        hasBottomListSignal,
                        embeddedListCount: embeddedListWraps.length,
                        revealTheme: 'view',
                        verifyReason: verifyResult?.reason || 'unknown',
                        verifyDetail: verifyResult?.detail || null
                    }
                };
            }

            return {
                ready: true,
                reason: 'ready',
                detail: {
                    hasViewWrap: true,
                    hasViewBottom: viewBottom instanceof HTMLElement,
                    hasRecommendBox: recommendBox instanceof HTMLElement,
                    hasCommentSignal: commentSignal instanceof HTMLElement,
                    hasCommentBox: commentBox instanceof HTMLElement,
                    hasCommentWriteBox: commentWriteBox instanceof HTMLElement,
                    hasBottomListSignal,
                    embeddedListCount: embeddedListWraps.length,
                    revealTheme: 'view',
                    verifyReason: verifyResult.reason || 'ready',
                    verifyDetail: verifyResult.detail || null
                }
            };
        },

        evaluateViewPostRevealRecoveryState() {
            const viewWrap = document.querySelector('.view_content_wrap');
            if (!(viewWrap instanceof HTMLElement)) {
                return {
                    ready: false,
                    reason: 'waiting-view',
                    detail: {
                        phase: 'post-reveal',
                        hasViewWrap: false,
                        revealTheme: 'view'
                    }
                };
            }

            const viewBottom = document.querySelector('.view_bottom');
            const recommendBox = viewWrap.querySelector('.btn_recommend_box');
            const commentSignal = document.querySelector('#focus_cmt, .view_comment, div[id^="comment_wrap_"]');
            const commentBox = document.querySelector('#focus_cmt .comment_box, div[id^="comment_wrap_"] .comment_box, .view_comment .comment_box');
            const commentWriteBox = document.querySelector('#focus_cmt > .cmt_write_box, #focus_cmt .cmt_write_box, .view_comment .cmt_write_box');
            const hasBottomListSignal = !!document.querySelector('.view_bottom .gall_listwrap, .view_bottom .list_wrap, .view_bottom table.gall_list, .view_bottom tr.ub-content');
            const embeddedListWraps = this.collectOwnedListWraps(viewBottom || document);

            if (commentSignal instanceof HTMLElement && !(commentBox instanceof HTMLElement) && !(commentWriteBox instanceof HTMLElement)) {
                return {
                    ready: false,
                    reason: 'waiting-comments',
                    detail: {
                        phase: 'post-reveal',
                        hasViewWrap: true,
                        hasViewBottom: viewBottom instanceof HTMLElement,
                        hasRecommendBox: recommendBox instanceof HTMLElement,
                        hasCommentSignal: true,
                        hasCommentBox: false,
                        hasCommentWriteBox: false,
                        revealTheme: 'view'
                    }
                };
            }

            if (hasBottomListSignal && embeddedListWraps.length === 0) {
                return {
                    ready: false,
                    reason: 'waiting-list',
                    detail: {
                        phase: 'post-reveal',
                        hasViewWrap: true,
                        hasViewBottom: viewBottom instanceof HTMLElement,
                        hasRecommendBox: recommendBox instanceof HTMLElement,
                        hasBottomListSignal: true,
                        embeddedListCount: 0,
                        revealTheme: 'list'
                    }
                };
            }

            for (let index = 0; index < embeddedListWraps.length; index += 1) {
                const wrapState = this.evaluateListInitialRevealState(embeddedListWraps[index]);
                if (!wrapState.ready) {
                    return {
                        ready: false,
                        reason: wrapState.reason,
                        detail: {
                            phase: 'post-reveal',
                            hasViewWrap: true,
                            hasViewBottom: viewBottom instanceof HTMLElement,
                            hasRecommendBox: recommendBox instanceof HTMLElement,
                            hasBottomListSignal,
                            embeddedListCount: embeddedListWraps.length,
                            embeddedListIndex: index,
                            revealTheme: wrapState.reason === 'waiting-style' ? 'list' : 'view',
                            ...wrapState.detail
                        }
                    };
                }
            }

            const themeBridge = this.getPhase1ViewTheme();
            if (typeof themeBridge?.verify !== 'function') {
                return {
                    ready: false,
                    reason: 'waiting-style',
                    detail: {
                        phase: 'post-reveal',
                        hasViewWrap: true,
                        hasViewBottom: viewBottom instanceof HTMLElement,
                        hasRecommendBox: recommendBox instanceof HTMLElement,
                        hasBottomListSignal,
                        embeddedListCount: embeddedListWraps.length,
                        missingThemeBridge: true,
                        revealTheme: 'view'
                    }
                };
            }

            // Post-reveal recovery must require structural surfaces and the core
            // article theme only. Optional comment/recommend decoration is not a
            // safe reason to keep polling or to return the page to recovery.
            const verifyResult = themeBridge.verify(document, { mode: 'core' });
            if (!verifyResult?.ready) {
                return {
                    ready: false,
                    reason: verifyResult?.reason === 'waiting-comments'
                        ? 'waiting-comments'
                        : (verifyResult?.reason === 'waiting-view' ? 'waiting-view' : 'waiting-style'),
                    detail: {
                        phase: 'post-reveal',
                        hasViewWrap: true,
                        hasViewBottom: viewBottom instanceof HTMLElement,
                        hasRecommendBox: recommendBox instanceof HTMLElement,
                        hasBottomListSignal,
                        embeddedListCount: embeddedListWraps.length,
                        hasCommentSignal: commentSignal instanceof HTMLElement,
                        hasCommentBox: commentBox instanceof HTMLElement,
                        hasCommentWriteBox: commentWriteBox instanceof HTMLElement,
                        verifyReason: verifyResult?.reason || 'unknown',
                        verifyDetail: verifyResult?.detail || null,
                        revealTheme: 'view'
                    }
                };
            }

            return {
                ready: true,
                reason: 'ready',
                detail: {
                    phase: 'post-reveal',
                    hasViewWrap: true,
                    hasViewBottom: viewBottom instanceof HTMLElement,
                    hasRecommendBox: recommendBox instanceof HTMLElement,
                    hasBottomListSignal,
                    embeddedListCount: embeddedListWraps.length,
                    hasCommentSignal: commentSignal instanceof HTMLElement,
                    hasCommentBox: commentBox instanceof HTMLElement,
                    hasCommentWriteBox: commentWriteBox instanceof HTMLElement,
                    verifyReason: verifyResult.reason || 'ready',
                    verifyDetail: verifyResult.detail || null,
                    revealTheme: 'view'
                }
            };
        },

        getInitialRevealState() {
            if (this.isWritePage()) {
                return { ready: true, reason: 'non-list', detail: { pageType: 'write' } };
            }
            if (this.isViewPage()) {
                return this.evaluateViewInitialRevealState();
            }
            if (!this.isListPage()) {
                return { ready: true, reason: 'non-list', detail: { pageType: 'other' } };
            }

            const targetWraps = this.collectOwnedListWraps(document);
            if (targetWraps.length === 0) {
                return {
                    ready: false,
                    reason: 'waiting-list',
                    detail: { targetWrapCount: 0 }
                };
            }

            for (let index = 0; index < targetWraps.length; index += 1) {
                const wrapState = this.evaluateListInitialRevealState(targetWraps[index]);
                if (!wrapState.ready) {
                    return {
                        ready: false,
                        reason: wrapState.reason,
                        detail: {
                            targetWrapCount: targetWraps.length,
                            wrapIndex: index,
                            ...wrapState.detail
                        }
                    };
                }
            }

            return {
                ready: true,
                reason: 'ready',
                detail: { targetWrapCount: targetWraps.length }
            };
        },

        getInitialRevealMutationSelectors() {
            if (this.isViewPage()) {
                return [
                    '.view_content_wrap',
                    '.gallview_head',
                    '.gallview_contents',
                    '.btn_recommend_box',
                    '.writing_view_box',
                    '.write_div',
                    '.view_comment',
                    '.comment_box',
                    '.cmt_write_box',
                    '#focus_cmt',
                    '.view_bottom',
                    this.SELECTORS.LIST_WRAP,
                    this.SELECTORS.ORIGINAL_TABLE,
                    this.SELECTORS.ORIGINAL_TBODY,
                    this.SELECTORS.ORIGINAL_POST_ITEM,
                    `.${this.CUSTOM_CLASSES.MOBILE_LIST}`,
                    `.${this.CUSTOM_CLASSES.POST_ITEM}`
                ];
            }

            return [
                this.SELECTORS.LIST_WRAP,
                this.SELECTORS.ORIGINAL_TABLE,
                this.SELECTORS.ORIGINAL_TBODY,
                this.SELECTORS.ORIGINAL_POST_ITEM
            ];
        },

        isInitialUiReady() {
            return this.getInitialRevealState().ready;
        },

        waitForInitialRevealReady(timeoutMs = 6000) {
            return new Promise((resolve) => {
                this.ensureBootUi('initial-reveal:start');
                this._initialRevealStartedAt = Date.now();
                if (this.shouldEnsureListRuntimeForReveal()) {
                    this.ensureKnownListRuntimes(document, 'initial-reveal:start', { scheduleExisting: false });
                }

                let lastState = this.getInitialRevealState();
                let refreshTriggered = false;
                let timeoutExtended = false;
                const timeoutDeadline = Date.now() + timeoutMs;
                this.updateInitialRevealDebug(lastState, {
                    refreshAttempted: false,
                    refreshTriggered: false
                });
                if (lastState.ready) {
                    this._initialRevealStartedAt = 0;
                    resolve(lastState.reason);
                    return;
                }

                let rafId = 0;
                let timeoutId = 0;
                let refreshTimerId = 0;
                let observer = null;
                let unsubscribe = null;

                const cleanup = () => {
                    if (typeof unsubscribe === 'function') unsubscribe();
                    if (observer) observer.disconnect();
                    if (rafId) window.cancelAnimationFrame(rafId);
                    if (refreshTimerId) window.clearTimeout(refreshTimerId);
                    if (timeoutId) window.clearTimeout(timeoutId);
                    this._initialRevealStartedAt = 0;
                };

                const finish = (reason) => {
                    cleanup();
                    resolve(reason);
                };

                const scheduleTimeout = (deadline) => {
                    if (timeoutId) window.clearTimeout(timeoutId);
                    const delay = Math.max(0, deadline - Date.now());
                    timeoutId = window.setTimeout(() => {
                        if (this.shouldEnsureListRuntimeForReveal()) {
                            this.processAllLists('initial-reveal-timeout');
                        }
                        lastState = this.getInitialRevealState();
                        this.updateInitialRevealDebug(lastState, {
                            refreshAttempted: refreshTriggered,
                            refreshTriggered
                        });
                        if (lastState.ready) {
                            finish(lastState.reason);
                            return;
                        }

                        const timeoutReason = `timeout-${lastState.reason || 'unknown'}`;
                        console.warn('[DC Filter+UI] Initial reveal readiness timed out; revealing page with current state.', lastState);
                        finish(timeoutReason);
                    }, delay);
                };

                const scheduleCheck = (reason = 'mutation', candidates = null) => {
                    if (rafId) return;
                    rafId = window.requestAnimationFrame(() => {
                        rafId = 0;
                        checkReady(reason, candidates);
                    });
                };

                const maybeRefreshStyle = (state, reason = 'check') => {
                    if (!state || state.reason !== 'waiting-style' || refreshTriggered) return false;
                    const themeBridge = this.getRevealThemeForState(state);
                    if (typeof themeBridge?.ensure !== 'function') return false;

                    refreshTriggered = true;
                    if (!timeoutExtended) {
                        timeoutExtended = true;
                        scheduleTimeout(timeoutDeadline + 600);
                    }

                    try {
                        themeBridge.ensure({ refresh: true, reason: `initial-reveal:${reason}` });
                    } catch (error) {
                        console.warn('[DC Filter+UI] Initial reveal style refresh failed:', error);
                        return false;
                    }

                    this.updateInitialRevealDebug(state, {
                        refreshAttempted: true,
                        refreshTriggered: true
                    });
                    scheduleCheck(`style-refresh:${reason}`);
                    refreshTimerId = window.setTimeout(() => {
                        refreshTimerId = 0;
                        scheduleCheck(`style-refresh-delay:${reason}`);
                    }, 120);
                    return true;
                };

                const canRevealFilteredNativeFallback = (state) => state?.reason === 'waiting-style'
                    && refreshTriggered
                    && window.__dcufBootController?.filterReady === true;

                const checkReady = (reason = 'check', candidates = null) => {
                    try {
                        this.ensureBootUi(`initial-reveal:${reason}`);
                        if (this.shouldEnsureListRuntimeForReveal()) {
                            if (candidates && typeof candidates[Symbol.iterator] === 'function') {
                                this.ensureListRuntimesFromCandidates(candidates, `initial-reveal:${reason}`, { scheduleExisting: false });
                            } else {
                                this.ensureKnownListRuntimes(document, `initial-reveal:${reason}`, { scheduleExisting: false });
                            }
                        }
                        lastState = this.getInitialRevealState();
                        this.updateInitialRevealDebug(lastState, {
                            refreshAttempted: refreshTriggered,
                            refreshTriggered
                        });
                        if (lastState.ready) {
                            finish(lastState.reason);
                            return;
                        }
                        const refreshStarted = maybeRefreshStyle(lastState, reason);
                        if (!refreshStarted && canRevealFilteredNativeFallback(lastState)) {
                            this.updateInitialRevealDebug(lastState, {
                                refreshAttempted: true,
                                refreshTriggered: true,
                                fallback: 'filtered-native-style'
                            });
                            finish('filtered-native-style-fallback');
                        }
                    } catch (error) {
                        console.error('[DC Filter+UI] Failed while evaluating initial reveal readiness:', error);
                        finish('error');
                    }
                };

                const runtimeCoordinator = this.getRuntimeCoordinator();
                if (runtimeCoordinator && typeof runtimeCoordinator.subscribeMutations === 'function') {
                    unsubscribe = runtimeCoordinator.subscribeMutations('ui-initial-reveal', (payload) => {
                        const relevantNodes = payload.collectMatches(this.getInitialRevealMutationSelectors(), { includeRoots: true });
                        if (relevantNodes.length > 0) scheduleCheck('mutation-bus', relevantNodes);
                    });
                } else if (document.body) {
                    observer = new MutationObserver((mutations) => {
                        const candidates = [];
                        mutations.forEach((mutation) => {
                            candidates.push(mutation.target);
                            mutation.addedNodes.forEach((node) => {
                                if (node instanceof Element) candidates.push(node);
                            });
                        });
                        scheduleCheck('mutation-observer', candidates);
                    });
                    observer.observe(document.body, { childList: true, subtree: true });
                }

                scheduleTimeout(timeoutDeadline);
                maybeRefreshStyle(lastState, 'start');
                scheduleCheck('initial');
            });
        },

        waitForInitialUiReady(timeoutMs = 6000) {
            return this.waitForInitialRevealReady(timeoutMs);
        },

        startPostRevealRecoveryWatch(context = {}) {
            const isViewPage = this.isViewPage();
            if (!isViewPage && !this.isListPage()) return 'not-applicable';
            if (typeof this._postRevealRecoveryStop === 'function') {
                this._postRevealRecoveryStop('restart');
            }

            const startedAt = new Date().toISOString();
            const startedTime = Date.now();
            let active = true;
            let lastState = isViewPage
                ? this.evaluateViewPostRevealRecoveryState()
                : this.getInitialRevealState();
            let checkCount = 0;
            let stablePasses = 0;
            let viewThemeRefreshes = 0;
            let listThemeRefreshes = 0;
            let rafId = 0;
            let pollId = 0;
            let unsubscribe = null;
            let observer = null;
            let resizeObserver = null;

            const cleanup = (status = 'stopped') => {
                if (!active) return;
                active = false;
                if (typeof unsubscribe === 'function') unsubscribe();
                if (observer) observer.disconnect();
                if (resizeObserver) resizeObserver.disconnect();
                if (rafId) window.cancelAnimationFrame(rafId);
                if (pollId) window.clearInterval(pollId);
                document.removeEventListener('load', handleMediaEvent, true);
                document.removeEventListener('error', handleMediaEvent, true);
                window.removeEventListener('resize', handleWindowResize);
                this._postRevealRecoveryStop = null;
                this.updatePostRevealRecoveryDebug(lastState, {
                    active: false,
                    status,
                    checkCount,
                    stablePasses,
                    viewThemeRefreshes,
                    listThemeRefreshes,
                    startedAt
                });
            };

            const runFilteredCommentRepair = (reason = 'post-reveal') => {
                if (typeof window.__dcufRepairFilteredCommentPlaceholders !== 'function') return;
                try {
                    window.__dcufRepairFilteredCommentPlaceholders({
                        reason,
                        onlyIfBroken: true,
                        runFilter: false,
                        mergeDetachedReplies: false
                    });
                } catch (error) {
                    console.warn('[DC Filter+UI] Post-reveal filtered comment repair failed:', error);
                }
            };

            const runSupportPasses = (reason = 'post-reveal') => {
                this.ensureKnownListRuntimes(document, `post-reveal:${reason}`, {
                    scheduleExisting: !isViewPage
                });

                const viewBottomContainer = document.querySelector('.view_bottom');
                if (viewBottomContainer instanceof HTMLElement) {
                    this.applyForceRefreshPagination(viewBottomContainer);
                }

                this.hideArticleNativeAdFrames();
                this.scaleAllFontSizes();

                if (typeof window.__dcufSyncArticleDarkText === 'function') {
                    try {
                        window.__dcufSyncArticleDarkText(null, { forceFullScan: true });
                    } catch (error) {
                        console.warn('[DC Filter+UI] Post-reveal article dark sync failed:', error);
                    }
                }

                if (typeof window.__dcufScheduleCommentNormalize === 'function') {
                    try {
                        window.__dcufScheduleCommentNormalize({ forceFullPass: true });
                    } catch (error) {
                        console.warn('[DC Filter+UI] Post-reveal comment normalize failed:', error);
                    }
                }
            };

            const maybeRefreshThemes = (state, reason = 'post-reveal') => {
                let refreshed = false;
                const needsListTheme = state?.detail?.revealTheme === 'list'
                    || state?.reason === 'waiting-list'
                    || state?.reason === 'waiting-items';
                const needsViewTheme = !needsListTheme || state?.reason === 'waiting-style' || state?.reason === 'waiting-view' || state?.reason === 'waiting-comments';

                if (needsViewTheme && viewThemeRefreshes < this.POST_REVEAL_RECOVERY_THEME_REFRESH_LIMIT) {
                    const viewTheme = this.getPhase1ViewTheme();
                    if (typeof viewTheme?.ensure === 'function') {
                        viewThemeRefreshes += 1;
                        viewTheme.ensure({ refresh: true, reason: `post-reveal:${reason}` });
                        refreshed = true;
                    }
                }

                if ((needsListTheme || state?.detail?.embeddedListCount > 0)
                    && listThemeRefreshes < this.POST_REVEAL_RECOVERY_THEME_REFRESH_LIMIT) {
                    const listTheme = this.getPhase1Theme();
                    if (typeof listTheme?.ensure === 'function') {
                        listThemeRefreshes += 1;
                        listTheme.ensure({ refresh: true, reason: `post-reveal:${reason}` });
                        refreshed = true;
                    }
                }

                return refreshed;
            };

            const requestCheck = (reason = 'event', candidates = null) => {
                if (!active || rafId) return;
                rafId = window.requestAnimationFrame(() => {
                    rafId = 0;
                    runCheck(reason, candidates);
                });
            };

            const runCheck = (reason = 'check', candidates = null) => {
                if (!active) return;
                checkCount += 1;

                if (Date.now() - startedTime >= this.POST_REVEAL_RECOVERY_MAX_MS) {
                    const bootController = window.__dcufBootController;
                    if (bootController?.state === 'degraded' && bootController.filterReady) {
                        bootController.markReady('post-reveal-filtered-native-fallback');
                        cleanup('filtered-native-fallback');
                    } else {
                        cleanup('timeout');
                    }
                    return;
                }

                try {
                    if (candidates && typeof candidates[Symbol.iterator] === 'function') {
                        this.ensureListRuntimesFromCandidates(candidates, `post-reveal:${reason}`, {
                            scheduleExisting: !isViewPage
                        });
                    } else {
                        this.ensureKnownListRuntimes(document, `post-reveal:${reason}`, {
                            scheduleExisting: !isViewPage
                        });
                    }
                } catch (error) {
                    console.warn('[DC Filter+UI] Post-reveal list runtime ensure failed:', error);
                }
                runFilteredCommentRepair(reason);

                lastState = isViewPage
                    ? this.evaluateViewPostRevealRecoveryState()
                    : this.getInitialRevealState();
                if (lastState.ready) {
                    stablePasses += 1;
                    this.updatePostRevealRecoveryDebug(lastState, {
                        active: true,
                        status: 'ready',
                        checkCount,
                        stablePasses,
                        viewThemeRefreshes,
                        listThemeRefreshes,
                        startedAt
                    });
                    if (stablePasses >= this.POST_REVEAL_RECOVERY_STABLE_PASSES) {
                        const bootController = window.__dcufBootController;
                        if (bootController && bootController.state === 'degraded') {
                            if (isViewPage && typeof window.__dcufFlushInitialCommentBarrier === 'function') {
                                window.__dcufFlushInitialCommentBarrier({ reason: 'post-reveal-recovery' });
                            }
                            bootController.markReady('post-reveal-recovery');
                        }
                        cleanup('completed');
                    }
                    return;
                }

                stablePasses = 0;
                runSupportPasses(reason);
                maybeRefreshThemes(lastState, reason);
                this.updatePostRevealRecoveryDebug(lastState, {
                    active: true,
                    status: 'recovering',
                    checkCount,
                    stablePasses,
                    viewThemeRefreshes,
                    listThemeRefreshes,
                    startedAt
                });
            };

            const handleMediaEvent = (event) => {
                const target = event.target;
                if (!(target instanceof Element)) return;
                if (!target.matches('img, video')) return;
                if (!target.closest('.view_content_wrap, #focus_cmt, .view_bottom')) return;
                requestCheck(`media:${event.type}`, [target]);
            };

            const handleWindowResize = () => {
                requestCheck('window-resize');
            };

            const runtimeCoordinator = this.getRuntimeCoordinator();
            if (runtimeCoordinator && typeof runtimeCoordinator.subscribeMutations === 'function') {
                unsubscribe = runtimeCoordinator.subscribeMutations('ui-post-reveal-recovery', (payload) => {
                    const relevantNodes = payload.collectMatches(this.getInitialRevealMutationSelectors(), { includeRoots: true });
                    if (relevantNodes.length > 0) requestCheck('mutation-bus', relevantNodes);
                });
            } else if (document.body) {
                observer = new MutationObserver((mutations) => {
                    const candidates = [];
                    mutations.forEach((mutation) => {
                        candidates.push(mutation.target);
                        mutation.addedNodes.forEach((node) => {
                            if (node instanceof Element) candidates.push(node);
                        });
                    });
                    requestCheck('mutation-observer', candidates);
                });
                observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
            }

            if (window.ResizeObserver) {
                resizeObserver = new ResizeObserver((entries) => {
                    requestCheck('resize-observer', entries.map((entry) => entry?.target).filter(Boolean));
                });
                document.querySelectorAll('.view_content_wrap, .view_bottom, #focus_cmt, .view_comment').forEach((element) => {
                    if (element instanceof Element) resizeObserver.observe(element);
                });
            }

            document.addEventListener('load', handleMediaEvent, true);
            document.addEventListener('error', handleMediaEvent, true);
            window.addEventListener('resize', handleWindowResize);

            pollId = window.setInterval(() => {
                requestCheck('poll');
            }, this.POST_REVEAL_RECOVERY_POLL_MS);

            this._postRevealRecoveryStop = cleanup;
            this.updatePostRevealRecoveryDebug(lastState, {
                active: true,
                status: 'started',
                checkCount,
                stablePasses,
                viewThemeRefreshes,
                listThemeRefreshes,
                startedAt
            });
            requestCheck(`start:${context.revealState || 'unknown'}`);
            return 'started';
        },


        /**
         * [v2.6.8 수정] 본문 + 댓글 글자크기 배율 스케일링 통합 함수
         *
         * [본문 처리]
         *   DC 에디터 기본 글자크기(12pt = 16px)를 기준으로 배율을 계산하여,
         *   .gallview_contents 내 인라인 font-size가 있는 요소들만 비례 확대합니다.
         *   → 원본 서식(크기 차이)은 그대로 유지됩니다.
         *
         * [댓글 처리]
         *   .comment_box .usertxt 및 .img_comment .usertxt 요소에 대해
         *   DC 댓글 기본 글자크기(13px)를 기준으로 배율을 계산하여 적용합니다.
         *   인라인 서식이 지정된 경우에도 해당 크기에 배율을 적용합니다.
         */
        scaleAllFontSizes() {
            // ── pt → px 변환 계수 ──
            const PT_TO_PX = 4 / 3; // 1pt = 1.333...px

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // [1] 본문 글자크기 배율 스케일링
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            const contentEl = document.querySelector('.gallview_contents');
            if (contentEl) {
                // CSS로 설정된 .gallview_contents font-size (현재 26px)
                const targetSize = parseFloat(window.getComputedStyle(contentEl).fontSize);
                // DC 에디터 기본: 12pt = 16px
                const contentBasePx = 16;
                const contentRatio = targetSize / contentBasePx;

                if (contentRatio > 1) {
                    contentEl.querySelectorAll('[style]').forEach(el => {
                        // [v2.7.0.1 추가] 이미 스케일링된 요소는 중복 처리 방지
                        if (el.closest('.comment_box, .img_comment, #focus_cmt')) return;

                        if (el.dataset.scaledByFilter) return;
                        const inlineFontSize = el.style.fontSize;
                        if (!inlineFontSize) return; // 인라인 없으면 부모 상속

                        let originalPx = 0;
                        if (inlineFontSize.endsWith('pt')) {
                            originalPx = parseFloat(inlineFontSize) * PT_TO_PX;
                        } else if (inlineFontSize.endsWith('px')) {
                            originalPx = parseFloat(inlineFontSize);
                        } else {
                            return; // em, rem 등 무시
                        }
                        if (isNaN(originalPx) || originalPx <= 0) return;

                        const scaledPx = Math.round(originalPx * contentRatio * 10) / 10;
                        el.style.setProperty('font-size', scaledPx + 'px', 'important');
                        el.dataset.scaledByFilter = '1';
                    });
                }
            }

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // [2] 댓글 글자크기 배율 스케일링
            //     대상: .comment_box .usertxt
            //           .img_comment .usertxt (이미지 댓글)
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // 일반·이미지 댓글 글자 크기는 댓글 normalize 루틴에서 별도로 처리한다.
            return;
        },

        getArticleAdContentRoots(root = document) {
            const queryRoot = (root instanceof Document || root instanceof Element || root instanceof DocumentFragment) ? root : document;
            const selector = '.gallview_contents, .writing_view_box, .view_content_wrap';
            const roots = [];
            const seen = new Set();
            const addRoot = (element) => {
                if (!(element instanceof HTMLElement) || seen.has(element)) return;
                seen.add(element);
                roots.push(element);
            };

            if (queryRoot instanceof HTMLElement && queryRoot.matches(selector)) addRoot(queryRoot);
            if (typeof queryRoot.querySelectorAll === 'function') {
                queryRoot.querySelectorAll(selector).forEach(addRoot);
            }

            return roots;
        },

        isArticleNativeAdFrame(frame) {
            if (!(frame instanceof HTMLIFrameElement)) return false;

            const frameId = frame.id || '';
            const frameName = frame.name || '';
            const frameSrc = frame.getAttribute('src') || '';
            const signature = [
                frameId,
                frameName,
                frame.title,
                frame.className,
                frameSrc
            ].join(' ');

            const isGoogleArticleSafeFrame = (/^aswift_\d+$/i.test(frameId) || /^aswift_\d+$/i.test(frameName))
                && /googleads\.g\.doubleclick\.net\/pagead\/ads/i.test(frameSrc);
            if (isGoogleArticleSafeFrame) return true;

            if (/google_ads_iframe_|gfp|pstatic\.net\/tvetalibs|tivan\.naver\.com/i.test(signature)) {
                return true;
            }

            try {
                const frameDocument = frame.contentDocument;
                const frameBody = frameDocument?.body;
                if (!frameBody) return false;
                if (frameBody.id === 'gfp_sf_body' || frameBody.classList.contains('banner_ad_wrapper')) return true;
                return Boolean(frameDocument.querySelector('#ad-element.native_image_wrap, [data-gfp-role]'));
            } catch (error) {
                return false;
            }
        },

        installArticleNativeAdStyles() {
            if (__dcufRoot.__dcufArticleNativeAdStyleInstalled || document.getElementById(this.ARTICLE_AD_STYLE_ID)) return;
            __dcufRoot.__dcufArticleNativeAdStyleInstalled = true;

            const css = `
                .gallview_contents iframe[data-dcuf-article-ad-hidden="true"],
                .writing_view_box iframe[data-dcuf-article-ad-hidden="true"],
                .view_content_wrap iframe[data-dcuf-article-ad-hidden="true"],
                .gallview_contents #ad_nv_slot,
                .writing_view_box #ad_nv_slot,
                .view_content_wrap #ad_nv_slot,
                .gallview_contents iframe[id^="google_ads_iframe_"],
                .gallview_contents iframe[name^="google_ads_iframe_"],
                .gallview_contents iframe[id*="gfp"],
                .gallview_contents iframe[name*="gfp"],
                .gallview_contents iframe[src*="pstatic.net/tvetalibs"],
                .gallview_contents iframe[src*="tivan.naver.com"],
                .writing_view_box iframe[id^="google_ads_iframe_"],
                .writing_view_box iframe[name^="google_ads_iframe_"],
                .writing_view_box iframe[id*="gfp"],
                .writing_view_box iframe[name*="gfp"],
                .writing_view_box iframe[src*="pstatic.net/tvetalibs"],
                .writing_view_box iframe[src*="tivan.naver.com"],
                .gallview_contents iframe[id^="aswift_"][src*="googleads.g.doubleclick.net/pagead/ads"],
                .writing_view_box iframe[id^="aswift_"][src*="googleads.g.doubleclick.net/pagead/ads"],
                .view_content_wrap iframe[id^="aswift_"][src*="googleads.g.doubleclick.net/pagead/ads"] {
                    display: none !important;
                    width: 0 !important;
                    height: 0 !important;
                    min-width: 0 !important;
                    min-height: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border: 0 !important;
                    visibility: hidden !important;
                    overflow: hidden !important;
                }
            `;

            const styleElement = GM_addStyle(css);
            if (styleElement instanceof HTMLElement) {
                styleElement.id = this.ARTICLE_AD_STYLE_ID;
            }
        },

        hideArticleNativeAdFrames(root = document) {
            this.getArticleAdContentRoots(root).forEach((articleRoot) => {
                articleRoot.querySelectorAll('#ad_nv_slot').forEach((slot) => {
                    if (!(slot instanceof HTMLElement)) return;
                    slot.setAttribute('data-dcuf-article-ad-hidden', 'true');
                    slot.style.setProperty('display', 'none', 'important');
                    slot.style.setProperty('width', '0', 'important');
                    slot.style.setProperty('height', '0', 'important');
                    slot.style.setProperty('min-width', '0', 'important');
                    slot.style.setProperty('min-height', '0', 'important');
                    slot.style.setProperty('margin', '0', 'important');
                    slot.style.setProperty('padding', '0', 'important');
                    slot.style.setProperty('border', '0', 'important');
                    slot.style.setProperty('visibility', 'hidden', 'important');
                    slot.style.setProperty('overflow', 'hidden', 'important');
                });
                articleRoot.querySelectorAll('iframe').forEach((frame) => {
                    if (!this.isArticleNativeAdFrame(frame)) return;
                    frame.setAttribute('data-dcuf-article-ad-hidden', 'true');
                    frame.style.setProperty('display', 'none', 'important');
                    frame.style.setProperty('width', '0', 'important');
                    frame.style.setProperty('height', '0', 'important');
                    frame.style.setProperty('margin', '0', 'important');
                    frame.style.setProperty('padding', '0', 'important');
                    frame.style.setProperty('border', '0', 'important');
                    frame.style.setProperty('visibility', 'hidden', 'important');
                });
            });
        },

        scheduleArticleNativeAdHide() {
            if (__dcufRoot.__dcufArticleNativeAdRafId) return;
            __dcufRoot.__dcufArticleNativeAdRafId = requestAnimationFrame(() => {
                __dcufRoot.__dcufArticleNativeAdRafId = 0;
                this.hideArticleNativeAdFrames();
            });
        },

        scheduleArticleNativeAdHidePasses() {
            this.hideArticleNativeAdFrames();
            [40, 120, 300, 900, 1800, 3200].forEach((delay) => {
                window.setTimeout(() => this.scheduleArticleNativeAdHide(), delay);
            });
        },

        isArticleNativeAdMutationTarget(node) {
            if (!(node instanceof Element)) return false;
            if (node.matches('#ad_nv_slot, iframe')) return true;
            if (node.closest?.('#ad_nv_slot')) return true;
            return Boolean(node.querySelector?.('#ad_nv_slot, iframe'));
        },

        attachArticleNativeAdObserver() {
            if (__dcufRoot.__dcufArticleNativeAdObserver) return;

            const observerTarget = document.body || document.documentElement;
            if (!(observerTarget instanceof Element)) {
                if (!__dcufRoot.__dcufArticleNativeAdObserverRetryId) {
                    __dcufRoot.__dcufArticleNativeAdObserverRetryId = window.setTimeout(() => {
                        __dcufRoot.__dcufArticleNativeAdObserverRetryId = 0;
                        this.attachArticleNativeAdObserver();
                    }, 50);
                }
                return;
            }

            const observer = new MutationObserver((mutations) => {
                const hasAdChange = mutations.some((mutation) => (
                    this.isArticleNativeAdMutationTarget(mutation.target)
                    || Array.from(mutation.addedNodes).some((node) => this.isArticleNativeAdMutationTarget(node))
                ));
                if (hasAdChange) this.scheduleArticleNativeAdHide();
            });

            observer.observe(observerTarget, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class']
            });
            window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
            __dcufRoot.__dcufArticleNativeAdObserver = observer;
        },

        ensureArticleNativeAdBlocker() {
            this.installArticleNativeAdStyles();
            this.attachArticleNativeAdObserver();
            this.scheduleArticleNativeAdHidePasses();
        },

        syncModifySurface(reason = 'sync') {
            if (!this.isModifyPage() || !document.body) return 'not-modify';

            const writeForm = this.getWriteForm();
            if (writeForm instanceof HTMLFormElement) {
                document.body.classList.remove('is-modify-password-page');
                document.body.classList.add('is-modify-page', 'is-modify-editor-page');
                document.body.dataset.dcufModifySurface = 'editor';
                document.documentElement?.setAttribute('data-dcuf-modify-surface', 'editor');
                this.transformWritePage();
                this.recordDiagnostic('ui.modifySurface.editor', { reason });
                return 'editor';
            }

            const passwordForm = document.querySelector('form[name="password_confirm"], form[action*="modify_password_submit"]');
            if (passwordForm instanceof HTMLFormElement) {
                document.body.classList.remove('is-modify-editor-page');
                document.body.classList.add('is-modify-page', 'is-modify-password-page');
                document.body.dataset.dcufModifySurface = 'password';
                document.documentElement?.setAttribute('data-dcuf-modify-surface', 'password');
                passwordForm.classList.add('dcuf-modify-password-form');
                const passwordInput = passwordForm.querySelector('input[type="password"][name="password"], #password');
                if (passwordInput instanceof HTMLInputElement) {
                    passwordInput.autocomplete = 'current-password';
                    if (!passwordInput.getAttribute('aria-label')) passwordInput.setAttribute('aria-label', '비밀번호');
                }
                this.recordDiagnostic('ui.modifySurface.password', { reason });
                return 'password';
            }

            document.body.classList.add('is-modify-page');
            document.body.classList.remove('is-modify-password-page', 'is-modify-editor-page');
            document.body.dataset.dcufModifySurface = 'pending';
            document.documentElement?.setAttribute('data-dcuf-modify-surface', 'pending');
            return 'pending';
        },

        subscribeModifySurfaceUpdates() {
            if (!this.isModifyPage() || this._modifySurfaceMutationUnsubscribe) return;
            const runtimeCoordinator = this.getRuntimeCoordinator();
            if (!runtimeCoordinator || typeof runtimeCoordinator.subscribeMutations !== 'function') return;

            const unsubscribe = runtimeCoordinator.subscribeMutations('ui-modify-surface', (payload) => {
                const candidates = typeof payload?.collectMatches === 'function'
                    ? payload.collectMatches([
                        'form#write',
                        'form[name="modify"][action*="modify_submit"]',
                        'form[name="password_confirm"]',
                        'form[action*="modify_password_submit"]',
                        '.no_memberwrap'
                    ], { includeRoots: true })
                    : [];
                if (candidates.length > 0 || document.body?.dataset.dcufModifySurface === 'pending') {
                    this.syncModifySurface('mutation');
                }
            });
            if (typeof unsubscribe === 'function') this._modifySurfaceMutationUnsubscribe = unsubscribe;
        },

        transformWritePage() {
            const writeForm = this.getWriteForm();
            if (!(writeForm instanceof HTMLFormElement)) return false;
            const writeBox = writeForm.closest('.write_box') || document.querySelector('.write_box');
            writeForm.classList.add('dcuf-write-form');
            document.body.classList.add('is-write-page');
            void MobileConvenienceModule.attachDraftForm(writeForm);
            if (writeForm.dataset.dcufWriteTransformed === '1') return true;
            writeForm.dataset.dcufWriteTransformed = '1';

            const leaveConfirm = writeForm?.querySelector('#leave_confirm_box');
            if (leaveConfirm instanceof HTMLElement) {
                leaveConfirm.classList.add('dcuf-write-leave-confirm');
                document.body.appendChild(leaveConfirm);
            }
            const gallType = writeForm?.querySelector('input[name="_GALLTYPE_"]')?.value || '';
            const isMinorWrite = gallType.toUpperCase() === 'M'
                || document.querySelector('#container.minor_write') instanceof Element
                || (window.location.pathname || '').includes('/mgallery/');
            document.body.classList.add(isMinorWrite ? 'dcuf-write-minor' : 'dcuf-write-major');
            writeForm?.classList.add(isMinorWrite ? 'dcuf-write-form-minor' : 'dcuf-write-form-major');

            const syncDesktopSiteMobileWriteMode = () => {
                const screenWidth = Number(window.screen?.width) || 0;
                const layoutWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
                const scale = screenWidth > 0 ? layoutWidth / screenWidth : 1;
                const enabled = screenWidth > 0 && screenWidth <= 600 && layoutWidth >= 800 && scale >= 1.5;
                document.body.classList.toggle('dcuf-write-desktop-site-mobile', enabled);
                if (enabled) {
                    const initialScale = Math.min(3, scale);
                    document.body.style.setProperty('--dcuf-write-desktop-site-scale', String(initialScale));
                    document.body.style.setProperty('--dcuf-write-desktop-site-inverse-scale', String(1 / initialScale));
                    document.body.style.setProperty('--dcuf-write-device-width', `${screenWidth}px`);
                } else {
                    document.body.style.removeProperty('--dcuf-write-desktop-site-scale');
                    document.body.style.removeProperty('--dcuf-write-desktop-site-inverse-scale');
                    document.body.style.removeProperty('--dcuf-write-device-width');
                }
            };
            syncDesktopSiteMobileWriteMode();
            if (document.body.dataset.dcufWriteViewportBound !== '1') {
                document.body.dataset.dcufWriteViewportBound = '1';
                window.addEventListener('resize', syncDesktopSiteMobileWriteMode, { passive: true });
                window.visualViewport?.addEventListener('resize', syncDesktopSiteMobileWriteMode, { passive: true });
            }

            const liveFieldset = writeForm?.querySelector('fieldset');
            if (liveFieldset) liveFieldset.classList.add('dcuf-write-fields');

            writeForm?.querySelectorAll('input[type="text"]:not([id]):not([name]), input[type="password"]:not([id]):not([name])')
                .forEach((input) => input.classList.add('dcuf-write-decoy-input'));

            const subjectRow = writeForm?.querySelector('#subject')?.closest('tr');
            if (subjectRow) subjectRow.classList.add('dcuf-write-subject-row');
            const subjectField = writeForm?.querySelector('#subject')?.closest('.input_box');
            if (subjectField) subjectField.classList.add('dcuf-write-subject-field');

            const guestControls = ['#name', '#password', '#code']
                .map((selector) => writeForm?.querySelector(selector))
                .filter((control) => control instanceof HTMLElement);
            const guestRows = new Set(guestControls.map((control) => control.closest('tr')).filter(Boolean));
            guestRows.forEach((row) => {
                row.classList.add('user_info_box', 'dcuf-write-guest-row');
                row.querySelectorAll('td').forEach((cell) => cell.classList.add('user_info_input'));
            });

            const liveFieldClasses = new Map([
                ['#name', 'dcuf-write-name-field'],
                ['#password', 'dcuf-write-password-field'],
                ['#code', 'dcuf-write-captcha-field']
            ]);
            liveFieldClasses.forEach((className, selector) => {
                const field = writeForm?.querySelector(selector)?.closest('.input_box');
                if (field) field.classList.add('dcuf-write-guest-field', className);
            });

            const captchaImageBox = writeForm?.querySelector('#kcaptcha')?.closest('.kap_codeimg');
            if (captchaImageBox) captchaImageBox.classList.add('dcuf-write-captcha-image');

            const headtextLabel = writeForm?.querySelector('.write_subject > .tit, .write_subject > .write_subject_label');
            if (headtextLabel) headtextLabel.classList.add('dcuf-write-headtext-label');

            const headtextList = writeForm?.querySelector('.write_subject .subject_list');
            if (headtextList instanceof HTMLElement) {
                let draggedHeadtext = false;
                let headtextDrag = null;
                const revealHeadtext = (candidate, behavior = 'smooth') => {
                    if (!(candidate instanceof HTMLElement)) return;
                    requestAnimationFrame(() => {
                        const maxScrollLeft = Math.max(0, headtextList.scrollWidth - headtextList.clientWidth);
                        const centeredLeft = candidate.offsetLeft - ((headtextList.clientWidth - candidate.offsetWidth) / 2);
                        headtextList.scrollTo({
                            left: Math.max(0, Math.min(maxScrollLeft, centeredLeft)),
                            behavior
                        });
                    });
                };
                const positionHeadtextTips = () => {
                    headtextList.querySelectorAll(':scope > li .tip_box2').forEach((tip) => {
                        if (!(tip instanceof HTMLElement)) return;
                        const item = tip.closest('li');
                        if (!(item instanceof HTMLElement) || getComputedStyle(tip).display === 'none') return;
                        const itemRect = item.getBoundingClientRect();
                        const tipRect = tip.getBoundingClientRect();
                        const viewportWidth = window.visualViewport?.width || window.innerWidth;
                        const modeScale = document.body.classList.contains('dcuf-write-desktop-site-mobile')
                            ? (Number(document.body.style.getPropertyValue('--dcuf-write-desktop-site-scale')) || 1)
                            : 1;
                        const left = Math.max(8, Math.min(viewportWidth - tipRect.width - 8, itemRect.left + ((itemRect.width - tipRect.width) / 2)));
                        const top = Math.max(8, itemRect.top - tipRect.height - 8);
                        tip.style.setProperty('--dcuf-headtext-tip-left', `${Math.round(left / modeScale)}px`);
                        tip.style.setProperty('--dcuf-headtext-tip-top', `${Math.round(top / modeScale)}px`);
                        tip.style.setProperty('--dcuf-headtext-tip-max-width', `${Math.floor((viewportWidth - 16) / modeScale)}px`);
                        tip.classList.remove('dcuf-headtext-tip-positioning');
                        tip.classList.add('dcuf-headtext-tip-positioned');
                    });
                };
                const scheduleHeadtextTipPosition = () => {
                    requestAnimationFrame(() => requestAnimationFrame(positionHeadtextTips));
                };
                revealHeadtext(headtextList.querySelector(':scope > li.sel, :scope > li.active'), 'auto');
                if (headtextList.dataset.dcufScrollBound !== '1') {
                    headtextList.dataset.dcufScrollBound = '1';
                    headtextList.addEventListener('pointerdown', (event) => {
                        if (event.pointerType === 'touch' || event.button !== 0) return;
                        headtextDrag = {
                            pointerId: event.pointerId,
                            startX: event.clientX,
                            startScrollLeft: headtextList.scrollLeft,
                            moved: false
                        };
                    });
                    headtextList.addEventListener('pointermove', (event) => {
                        if (!headtextDrag || headtextDrag.pointerId !== event.pointerId) return;
                        const delta = event.clientX - headtextDrag.startX;
                        if (!headtextDrag.moved && Math.abs(delta) >= 8) {
                            headtextDrag.moved = true;
                            headtextList.setPointerCapture?.(event.pointerId);
                            headtextList.classList.add('dcuf-headtext-dragging');
                        }
                        if (!headtextDrag.moved) return;
                        event.preventDefault();
                        headtextList.scrollLeft = headtextDrag.startScrollLeft - delta;
                        positionHeadtextTips();
                    });
                    const finishHeadtextDrag = (event) => {
                        if (!headtextDrag || headtextDrag.pointerId !== event.pointerId) return;
                        draggedHeadtext = headtextDrag.moved;
                        headtextDrag = null;
                        headtextList.classList.remove('dcuf-headtext-dragging');
                        if (headtextList.hasPointerCapture?.(event.pointerId)) headtextList.releasePointerCapture(event.pointerId);
                        if (draggedHeadtext) window.setTimeout(() => { draggedHeadtext = false; }, 0);
                    };
                    headtextList.addEventListener('pointerup', finishHeadtextDrag);
                    headtextList.addEventListener('pointercancel', finishHeadtextDrag);
                    headtextList.addEventListener('click', (event) => {
                        if (draggedHeadtext) {
                            event.preventDefault();
                            event.stopImmediatePropagation();
                            return;
                        }
                        const clicked = event.target instanceof Element ? event.target.closest('li') : null;
                        if (!(clicked instanceof HTMLElement) || clicked.parentElement !== headtextList) return;
                        requestAnimationFrame(() => {
                            revealHeadtext(headtextList.querySelector(':scope > li.sel, :scope > li.active') || clicked);
                        });
                    });
                    const prepareHeadtextTipPosition = (event) => {
                        const item = event.target instanceof Element ? event.target.closest('li') : null;
                        if (!(item instanceof HTMLElement) || item.parentElement !== headtextList) return;
                        const tip = item.querySelector(':scope > .tip_box2');
                        if (tip instanceof HTMLElement) {
                            tip.classList.remove('dcuf-headtext-tip-positioned');
                            tip.classList.add('dcuf-headtext-tip-positioning');
                        }
                        positionHeadtextTips();
                        scheduleHeadtextTipPosition();
                    };
                    headtextList.addEventListener('pointerover', prepareHeadtextTipPosition);
                    headtextList.addEventListener('focusin', prepareHeadtextTipPosition);
                    headtextList.addEventListener('scroll', positionHeadtextTips, { passive: true });
                    window.addEventListener('resize', scheduleHeadtextTipPosition, { passive: true });
                    window.addEventListener('scroll', scheduleHeadtextTipPosition, { passive: true, capture: true });
                    const runtimeCoordinator = this.getRuntimeCoordinator();
                    if (runtimeCoordinator && typeof runtimeCoordinator.subscribeMutations === 'function') {
                        runtimeCoordinator.subscribeMutations('ui-write-headtext-tip-position', (payload) => {
                            const relevantTargets = [
                                ...(payload.attributeTargets || []),
                                ...(payload.addedElements || []),
                                ...(payload.childListTargets || [])
                            ];
                            if (!relevantTargets.some((node) => (
                                node === headtextList
                                || (node instanceof Node && headtextList.contains(node))
                            ))) return;
                            const hasVisiblePendingTip = Array.from(headtextList.querySelectorAll(':scope > li .tip_box2:not(.dcuf-headtext-tip-positioned)'))
                                .some((tip) => tip instanceof HTMLElement && getComputedStyle(tip).display !== 'none');
                            if (hasVisiblePendingTip) positionHeadtextTips();
                        });
                    }
                }
            }

            const captchaCell = writeForm?.querySelector('#code')?.closest('td');
            if (captchaCell) {
                captchaCell.classList.add('user_info_input', 'dcuf-write-captcha-cell');
            }

            const mobileFontNames = [
                '맑은 고딕', '굴림체', '굴림', '바탕체', '바탕', '궁서',
                'helvetica', 'Arial', 'Arial Black', 'Comic Sans MS', 'Courier New',
                'Impact', 'Tahoma', 'Times New Roman', 'Verdana', 'MS Gothic',
                'MS PGothic', 'MS UI Gothic'
            ];
            const ensureMobileFontMenu = () => {
                const isMobileScreen = (Number(window.screen?.width) || window.innerWidth || 0) <= 600;
                document.body.classList.toggle('dcuf-write-mobile-font-menu', isMobileScreen);
                if (!isMobileScreen || !(writeForm instanceof HTMLElement)) return;

                writeForm.querySelectorAll('.note-toolbar .note-fontname').forEach((fontGroup) => {
                    if (!(fontGroup instanceof HTMLElement)) return;
                    const button = fontGroup.querySelector('button.dropdown-toggle, button.note-btn');
                    const label = button?.querySelector('.note-current-fontname');
                    const menu = fontGroup.querySelector('.note-dropdown-menu.dropdown-fontname');
                    if (label instanceof HTMLElement && !(label.textContent || '').trim()) {
                        label.textContent = '글꼴';
                        label.style.removeProperty('font-family');
                    }
                    if (!(menu instanceof HTMLElement)) return;

                    if (menu.dataset.dcufMobileFonts !== '1') {
                        const selectedValue = menu.querySelector('.note-dropdown-item.checked')?.getAttribute('data-value') || '';
                        const fragment = document.createDocumentFragment();
                        mobileFontNames.forEach((fontName) => {
                            const item = document.createElement('a');
                            item.className = `note-dropdown-item${selectedValue === fontName ? ' checked' : ''}`;
                            item.href = '#';
                            item.setAttribute('data-value', fontName);
                            item.setAttribute('data-dcuf-mobile-font-item', '1');
                            item.setAttribute('role', 'listitem');
                            item.setAttribute('aria-label', fontName);
                            const check = document.createElement('i');
                            check.className = 'note-icon-menu-check';
                            const text = document.createElement('span');
                            text.textContent = fontName;
                            text.style.fontFamily = fontName;
                            item.append(check, document.createTextNode(' '), text);
                            fragment.appendChild(item);
                        });
                        menu.replaceChildren(fragment);
                        menu.dataset.dcufMobileFonts = '1';
                    }

                    if (menu.__dcufMobileFontBound) return;
                    menu.__dcufMobileFontBound = true;

                    menu.addEventListener('mousedown', (event) => {
                        if (event.target instanceof Element && event.target.closest('[data-dcuf-mobile-font-item="1"]')) {
                            event.preventDefault();
                        }
                    });
                    menu.addEventListener('click', (event) => {
                        const item = event.target instanceof Element
                            ? event.target.closest('[data-dcuf-mobile-font-item="1"]')
                            : null;
                        if (!(item instanceof HTMLElement)) return;
                        event.preventDefault();
                        event.stopPropagation();
                        const fontName = item.getAttribute('data-value') || '';
                        if (!fontName) return;

                        const memo = writeForm.querySelector('textarea#memo');
                        const jq = window.jQuery;
                        if (memo instanceof HTMLTextAreaElement && typeof jq === 'function' && typeof jq(memo).summernote === 'function') {
                            jq(memo).summernote('fontName', fontName);
                        } else {
                            document.execCommand('fontName', false, fontName);
                        }
                        menu.querySelectorAll('.note-dropdown-item').forEach((candidate) => {
                            candidate.classList.toggle('checked', candidate === item);
                        });
                        if (label instanceof HTMLElement) {
                            label.textContent = fontName;
                            label.style.fontFamily = fontName;
                        }
                        fontGroup.querySelectorAll('.note-btn-group.open').forEach((group) => group.classList.remove('open'));
                        button?.classList.remove('active');
                        menu.style.display = 'none';
                    });
                });
            };
            ensureMobileFontMenu();

            if (writeForm instanceof HTMLElement && writeForm.dataset.dcufEditorLayersBound !== '1') {
                writeForm.dataset.dcufEditorLayersBound = '1';
                let editorToolbarDrag = null;
                let draggedEditorToolbar = false;
                const editorToolbarSelector = '.note-toolbar, .note-toolbar-media';
                writeForm.addEventListener('pointerdown', (event) => {
                    if (event.pointerType === 'touch' || event.button !== 0) return;
                    if (!(event.target instanceof Element)
                        || event.target.closest('.note-dropdown-menu, .pop_wrap, input, textarea, select')) return;
                    const toolbar = event.target.closest(editorToolbarSelector);
                    if (!(toolbar instanceof HTMLElement)) return;
                    draggedEditorToolbar = false;
                    editorToolbarDrag = {
                        toolbar,
                        pointerId: event.pointerId,
                        startX: event.clientX,
                        startScrollLeft: toolbar.scrollLeft,
                        moved: false
                    };
                });
                writeForm.addEventListener('pointermove', (event) => {
                    if (!editorToolbarDrag || editorToolbarDrag.pointerId !== event.pointerId) return;
                    const delta = event.clientX - editorToolbarDrag.startX;
                    if (!editorToolbarDrag.moved && Math.abs(delta) >= 8) {
                        editorToolbarDrag.moved = true;
                        editorToolbarDrag.toolbar.setPointerCapture?.(event.pointerId);
                        editorToolbarDrag.toolbar.classList.add('dcuf-editor-toolbar-dragging');
                    }
                    if (!editorToolbarDrag.moved) return;
                    event.preventDefault();
                    editorToolbarDrag.toolbar.scrollLeft = editorToolbarDrag.startScrollLeft - delta;
                    positionEditorLayers();
                });
                const finishEditorToolbarDrag = (event) => {
                    if (!editorToolbarDrag || editorToolbarDrag.pointerId !== event.pointerId) return;
                    const { toolbar, moved } = editorToolbarDrag;
                    editorToolbarDrag = null;
                    draggedEditorToolbar = moved;
                    toolbar.classList.remove('dcuf-editor-toolbar-dragging');
                    if (toolbar.hasPointerCapture?.(event.pointerId)) toolbar.releasePointerCapture(event.pointerId);
                    if (draggedEditorToolbar) window.setTimeout(() => { draggedEditorToolbar = false; }, 0);
                };
                writeForm.addEventListener('pointerup', finishEditorToolbarDrag);
                writeForm.addEventListener('pointercancel', finishEditorToolbarDrag);
                writeForm.addEventListener('click', (event) => {
                    if (!draggedEditorToolbar) return;
                    event.preventDefault();
                    event.stopImmediatePropagation();
                }, true);
                // Live Summernote editor dropdown contracts. Keep the generic selector as a
                // forward-compatible fallback and list known menus here for fixture/audit parity.
                const editorDropdownSelector = [
                    '.note-toolbar .note-dropdown-menu',
                    '.note-toolbar .dropdown-fontname',
                    '.note-toolbar .dropdown-fontsize',
                    '.note-toolbar .note-color .note-dropdown-menu',
                    '.note-toolbar .note-table',
                    '.note-toolbar .note-height .dropdown-line-height',
                    '.note-toolbar .note-para .note-dropdown-menu'
                ].join(', ');
                const editorLayerSelector = `${editorDropdownSelector}, .note-toolbar .pop_wrap`;
                const getExternalDcconLayer = () => {
                    const layer = document.querySelector('#div_con');
                    if (!(layer instanceof HTMLElement) || writeForm.contains(layer)) return null;
                    layer.dataset.dcufWriteExternalLayer = '1';
                    return layer;
                };
                const getEditorLayers = () => {
                    const layers = Array.from(writeForm.querySelectorAll(editorLayerSelector));
                    const externalDccon = getExternalDcconLayer();
                    if (externalDccon) layers.push(externalDccon);
                    return layers;
                };
                const getEditorLayerAnchor = (layer) => {
                    const nested = layer.closest('.note-btn-group');
                    if (nested instanceof HTMLElement) return nested;
                    if (layer.id !== 'div_con') return null;
                    return writeForm.querySelector('button[aria-label="디시콘"],[data-command="dccon"],button[onclick*="dccon" i],.note-mybutton > button')?.closest('.note-btn-group') || null;
                };
                const prepareEditorLayersForTrigger = (event) => {
                    if (!(event.target instanceof Element)
                        || event.target.closest('.note-dropdown-menu, .pop_wrap')) return;
                    const group = event.target.closest('.note-toolbar .note-btn-group');
                    if (!(group instanceof HTMLElement)) return;
                    if (event.type === 'pointerover'
                        && event.relatedTarget instanceof Node
                        && group.contains(event.relatedTarget)) return;
                    const layers = Array.from(group.querySelectorAll('.note-dropdown-menu, .pop_wrap'));
                    if (group.querySelector('button[aria-label="디시콘"],[data-command="dccon"],button[onclick*="dccon" i]')) {
                        const externalDccon = getExternalDcconLayer();
                        if (externalDccon) layers.push(externalDccon);
                    }
                    layers.forEach((layer) => {
                        layer.classList.remove('dcuf-editor-layer-positioned');
                        layer.classList.add('dcuf-editor-layer-positioning');
                    });
                };
                writeForm.addEventListener('pointerdown', prepareEditorLayersForTrigger, true);
                writeForm.addEventListener('pointerover', prepareEditorLayersForTrigger, true);
                writeForm.addEventListener('click', prepareEditorLayersForTrigger, true);
                writeForm.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' || event.key === ' ') prepareEditorLayersForTrigger(event);
                }, true);
                const positionEditorLayers = ({ includeDropdowns = true } = {}) => {
                    getEditorLayers().forEach((layer) => {
                        if (!(layer instanceof HTMLElement) || getComputedStyle(layer).display === 'none') return;
                        const isDropdown = layer.matches('.note-dropdown-menu');
                        if (isDropdown && !includeDropdowns) return;
                        const anchor = getEditorLayerAnchor(layer);
                        if (!(anchor instanceof HTMLElement)) return;
                        layer.classList.add('dcuf-editor-layer-positioning');
                        layer.classList.remove('dcuf-editor-layer-positioned');
                        const anchorRect = anchor.getBoundingClientRect();
                        const layerRect = layer.getBoundingClientRect();
                        // Fixed Summernote dropdowns still inherit the desktop-site mobile
                        // zoom. Convert viewport coordinates back into that local CSS space
                        // while keeping the host menu's intended physical size.
                        const measuredLocalScale = isDropdown && anchor.offsetWidth > 0
                            ? anchorRect.width / anchor.offsetWidth
                            : 1;
                        const localCoordinateScale = Number.isFinite(measuredLocalScale) && measuredLocalScale > 0
                            ? measuredLocalScale
                            : 1;
                        const visualViewport = window.visualViewport;
                        const visualScale = visualViewport?.scale || 1;
                        const scaledVisualWidth = (visualViewport?.width || window.innerWidth) * visualScale;
                        const containerRect = writeForm.closest('#container')?.getBoundingClientRect();
                        const rectUsesScaledVisualCoordinates = document.body.classList.contains('dcuf-write-desktop-site-mobile')
                            && containerRect instanceof DOMRect
                            && containerRect.width <= scaledVisualWidth + 2;
                        const viewportCoordinateScale = rectUsesScaledVisualCoordinates ? visualScale : 1;
                        const viewportLeft = (visualViewport?.offsetLeft || 0) * viewportCoordinateScale;
                        const viewportTop = (visualViewport?.offsetTop || 0) * viewportCoordinateScale;
                        const viewportWidth = (visualViewport?.width || window.innerWidth) * viewportCoordinateScale;
                        const viewportHeight = (visualViewport?.height || window.innerHeight) * viewportCoordinateScale;
                        const viewportRight = viewportLeft + viewportWidth;
                        const viewportBottom = viewportTop + viewportHeight;
                        // Leave two extra visual pixels for browser zoom rounding so a fixed
                        // layer cannot bleed into the clipped page edge.
                        const edgePadding = 10;
                        const layerGap = 6;
                        const maxWidth = Math.max(1, viewportWidth - (edgePadding * 2));
                        const maxHeight = Math.max(1, viewportHeight - (edgePadding * 2));
                        const constrainToViewport = isDropdown;
                        const width = constrainToViewport ? Math.min(layerRect.width, maxWidth) : layerRect.width;
                        const height = constrainToViewport ? Math.min(layerRect.height, maxHeight) : layerRect.height;
                        const left = Math.max(
                            viewportLeft + edgePadding,
                            Math.min(viewportRight - width - edgePadding, anchorRect.left)
                        );
                        const below = Math.max(0, viewportBottom - anchorRect.bottom - edgePadding - layerGap);
                        const above = Math.max(0, anchorRect.top - viewportTop - edgePadding - layerGap);
                        const openAbove = height > below && above > below;
                        const preferredTop = openAbove
                            ? anchorRect.top - height - layerGap
                            : anchorRect.bottom + layerGap;
                        const top = Math.max(
                            viewportTop + edgePadding,
                            Math.min(viewportBottom - height - edgePadding, preferredTop)
                        );
                        const positionedLeft = isDropdown ? left / localCoordinateScale : left;
                        const positionedTop = isDropdown ? top / localCoordinateScale : top;
                        const localMaxWidth = isDropdown ? maxWidth / localCoordinateScale : maxWidth;
                        const localMaxHeight = isDropdown ? maxHeight / localCoordinateScale : maxHeight;
                        layer.style.setProperty('--dcuf-editor-layer-left', `${positionedLeft.toFixed(3)}px`);
                        layer.style.setProperty('--dcuf-editor-layer-top', `${positionedTop.toFixed(3)}px`);
                        layer.style.setProperty('--dcuf-editor-layer-max-width', `${Math.floor(localMaxWidth)}px`);
                        layer.style.setProperty('--dcuf-editor-layer-max-height', `${Math.floor(localMaxHeight)}px`);
                        layer.classList.remove('dcuf-editor-layer-positioning');
                        layer.classList.add('dcuf-editor-layer-positioned');
                    });
                };
                const scheduleEditorLayerPosition = () => {
                    requestAnimationFrame(() => {
                        positionEditorLayers();
                        requestAnimationFrame(positionEditorLayers);
                    });
                };
                const scheduleEditorPopupPosition = () => {
                    requestAnimationFrame(() => {
                        positionEditorLayers();
                        requestAnimationFrame(positionEditorLayers);
                    });
                };
                const runtimeCoordinator = this.getRuntimeCoordinator();
                if (runtimeCoordinator && typeof runtimeCoordinator.subscribeMutations === 'function') {
                    runtimeCoordinator.subscribeMutations('ui-write-editor-layer-position', (payload) => {
                        const relevantTargets = [
                            ...(payload.attributeTargets || []),
                            ...(payload.addedElements || []),
                            ...(payload.childListTargets || [])
                        ];
                        const structuralTargets = [
                            ...(payload.addedElements || []),
                            ...(payload.childListTargets || [])
                        ];
                        const externalDccon = getExternalDcconLayer();
                        const hasRelevantFormMutation = relevantTargets.some((node) => (
                            node === writeForm
                            || (node instanceof Node && writeForm.contains(node))
                        ));
                        const hasRelevantExternalMutation = externalDccon && structuralTargets.some((node) => node === externalDccon || (node instanceof Node && externalDccon.contains(node)));
                        if (!hasRelevantFormMutation && !hasRelevantExternalMutation) return;
                        const hasVisiblePendingLayer = getEditorLayers()
                            .some((layer) => (
                                layer instanceof HTMLElement
                                && !layer.classList.contains('dcuf-editor-layer-positioned')
                                && getComputedStyle(layer).display !== 'none'
                            ));
                        if (hasRelevantExternalMutation || hasVisiblePendingLayer) positionEditorLayers();
                    });
                }
                writeForm.addEventListener('click', (event) => {
                    if (!(event.target instanceof Element) || !event.target.closest('.note-toolbar')) return;
                    if (event.target.closest('.note-fontname')) ensureMobileFontMenu();
                    positionEditorLayers();
                    scheduleEditorLayerPosition();
                });
                writeForm.addEventListener('pointerover', (event) => {
                    if (!(event.target instanceof Element) || !event.target.closest('.note-toolbar')) return;
                    if (event.target.closest('.note-fontname')) ensureMobileFontMenu();
                    scheduleEditorLayerPosition();
                });
                writeForm.addEventListener('scroll', scheduleEditorPopupPosition, { passive: true, capture: true });
                window.addEventListener('resize', scheduleEditorLayerPosition, { passive: true });
                window.addEventListener('scroll', scheduleEditorPopupPosition, { passive: true, capture: true });
                window.visualViewport?.addEventListener('resize', scheduleEditorLayerPosition, { passive: true });
                window.visualViewport?.addEventListener('scroll', scheduleEditorPopupPosition, { passive: true });
            }

            // [최종 완전판] 글쓰기 페이지의 광고 컨테이너를 직접 찾아 제거하는 함수
            const removeWritePageAds = () => {
                const adContainers = new Set();
                const searchRoot = writeBox instanceof Element ? writeBox : document;

                searchRoot.querySelectorAll('script[src*="/kas/static/ba.min.js"], ins.kakao_ad_area').forEach((node) => {
                    const adContainer = node.parentElement;
                    if (!(adContainer instanceof HTMLDivElement)) return;
                    adContainers.add(adContainer);
                });

                if (adContainers.size === 0) {
                    return false;
                }

                adContainers.forEach((adContainer) => adContainer.remove());
                console.log(`[DC Filter+UI] 글쓰기 페이지 광고 컨테이너 ${adContainers.size}개 제거 완료.`);
                return true;
            };
            const stopAdCleanup = () => {
                if (adRemovalInterval) {
                    clearInterval(adRemovalInterval);
                    adRemovalInterval = 0;
                }
                if (adRemovalObserver) {
                    adRemovalObserver.disconnect();
                    adRemovalObserver = null;
                }
            };
            let adRemovalObserver = null;
            let adRemovalInterval = 0;
            let adRemovalAttempts = 0;

            if (removeWritePageAds()) return true;

            const observerTarget = writeBox || document.body;
            if (observerTarget instanceof Element) {
                adRemovalObserver = new MutationObserver(() => {
                    if (removeWritePageAds()) {
                        stopAdCleanup();
                    }
                });
                adRemovalObserver.observe(observerTarget, { childList: true, subtree: true });
            }

            adRemovalInterval = window.setInterval(() => {
                adRemovalAttempts += 1;
                if (removeWritePageAds() || adRemovalAttempts >= 10) {
                    stopAdCleanup();
                }
            }, 250);
            return true;
        },
        async init() {
            if (this._initState === 'ready') return 'already-ready';
            if (this._initState === 'initializing' && this._initPromise) return this._initPromise;
            this._initState = 'initializing';
            this._initPromise = (async () => {
            const bootController = window.__dcufBootController;
            if (!this._bootRollbackRegistered && typeof bootController?.registerRollback === 'function') {
                this._bootRollbackRegistered = true;
                bootController.registerRollback((reason) => this.rollbackInitialListTransactions(reason));
                bootController.registerRecovery(() => this.ensureKnownListRuntimes(document, 'boot-recovery'));
            }


            // [핵심 수정] 스크립트 시작 시, 툴팁으로 사용할 div를 미리 한 번만 생성
            if (!document.getElementById('custom-instant-tooltip')) {
                const tooltip = document.createElement('div');
                tooltip.id = 'custom-instant-tooltip';
                document.body.appendChild(tooltip);
            }


            const viewportMeta = document.querySelector('meta[name="viewport"]');
            if (!viewportMeta) {
                const newViewportMeta = document.createElement('meta');
                newViewportMeta.name = 'viewport';
                newViewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes';
                document.head.appendChild(newViewportMeta);
            } else if (/user-scalable\s*=\s*no/i.test(viewportMeta.content) || /maximum-scale\s*=\s*1(\.0+)?/i.test(viewportMeta.content)) {
                viewportMeta.content = viewportMeta.content
                    .replace(/user-scalable\s*=\s*no/ig, 'user-scalable=yes')
                    .replace(/maximum-scale\s*=\s*1(\.0+)?/ig, 'maximum-scale=5.0');
            }


            if (window.location.pathname.includes('/mgallery/')) {
                document.body.classList.add('is-mgallery');
            }


            if (this.isModifyPage()) {
                const modifySurface = this.syncModifySurface('init');
                this.subscribeModifySurfaceUpdates();
                return modifySurface === 'editor' ? 'non-list' : `modify-${modifySurface}`;
            }

            if (this.isWritePage()) {
                this.transformWritePage();
                return 'non-list';
            } else if (this.isViewPage()) {
                const viewBottomContainer = document.querySelector('.view_bottom');
                if (viewBottomContainer) {
                    this.applyForceRefreshPagination(viewBottomContainer);
                }
                // [v2.6.8] 본문 + 댓글 글자크기 배율 스케일링 (통합)
                this.scaleAllFontSizes();
            }

            this.ensureKnownListRuntimes(document, 'init');
            this.subscribeListRuntimeUpdates();

            if (this.isListPage()) return 'list-runtime-ready';
            return 'non-list';
            })();
            try {
                const result = await this._initPromise;
                this._initState = 'ready';
                return result;
            } catch (error) {
                this._initState = 'failed';
                this._initPromise = null;
                this.rollbackInitialListTransactions('ui-init-failed');
                throw error;
            }
        }
    };
    window.__dcufUIModule = UIModule;

    const getDcufCollectionSize = (value) => {
        if (!value) return 0;
        if (value instanceof Map || value instanceof Set) return value.size;
        if (Array.isArray(value)) return value.length;
        if (typeof value === 'object') return Object.keys(value).length;
        return 0;
    };

    const getDcufHeapMb = () => {
        const heap = performance.memory || {};
        const toMb = (bytes) => Number.isFinite(bytes) ? Math.round((bytes / 1048576) * 10) / 10 : null;
        return {
            used: toMb(heap.usedJSHeapSize),
            total: toMb(heap.totalJSHeapSize),
            limit: toMb(heap.jsHeapSizeLimit)
        };
    };

    const getDcufApproxJsonKb = (value) => {
        try {
            return Math.round((JSON.stringify(value || {}).length / 1024) * 10) / 10;
        } catch (error) {
            return null;
        }
    };

    const collectDcufInternalMemorySample = (reason = 'manual') => {
        const runtimeCoordinator = window.__dcufRuntimeCoordinator || null;
        const diagnostics = typeof runtimeCoordinator?.snapshotDiagnostics === 'function'
            ? runtimeCoordinator.snapshotDiagnostics()
            : null;
        const taskQueues = runtimeCoordinator?._taskQueues || {};
        const taskQueueSnapshots = Object.fromEntries(
            Object.entries(taskQueues).map(([key, queue]) => [
                key,
                typeof queue?.snapshot === 'function' ? queue.snapshot() : null
            ])
        );

        return {
            reason,
            version: '__VERSION__',
            time: new Date().toISOString(),
            href: location.href,
            heap: getDcufHeapMb(),
            runtime: {
                mutationObserverReady: Boolean(runtimeCoordinator?._mutationObserverReady),
                subscriberCount: getDcufCollectionSize(runtimeCoordinator?._mutationSubscribers),
                pendingMutationRecords: getDcufCollectionSize(runtimeCoordinator?._pendingMutationRecords),
                pendingMutationRafActive: Boolean(runtimeCoordinator?._pendingMutationRafId),
                pendingMutationTimerActive: Boolean(runtimeCoordinator?._pendingMutationTimerId),
                taskQueueCount: getDcufCollectionSize(taskQueues),
                taskQueues: taskQueueSnapshots,
                diagnostics
            },
            filter: {
                userSumCache: getDcufCollectionSize(userSumCache),
                negativeUserSumCache: getDcufCollectionSize(FilterModule.USER_SUM_NEGATIVE_CACHE),
                negativeUserSumCacheLimit: FilterModule.USER_SUM_NEGATIVE_MAX_ENTRIES,
                inflightUserSumRequests: getDcufCollectionSize(FilterModule.INFLIGHT_USER_SUM_REQUESTS),
                blockedUidsCache: getDcufCollectionSize(FilterModule.BLOCKED_UIDS_CACHE),
                debugDecisionKeys: getDcufCollectionSize(FilterModule.DEBUG_DECISION_KEYS),
                queuedObserverFilterItems: getDcufCollectionSize(FilterModule._queuedObserverFilterItems),
                syncRefilterTimers: getDcufCollectionSize(FilterModule._syncRefilterTimerIds),
                commentRefilterTimers: getDcufCollectionSize(FilterModule._commentRefilterTimerIds),
                userSumCacheKb: getDcufApproxJsonKb(userSumCache),
                negativeUserSumCacheKb: getDcufApproxJsonKb(Array.from(FilterModule.USER_SUM_NEGATIVE_CACHE || [])),
                blockedUidsCacheKb: getDcufApproxJsonKb(FilterModule.BLOCKED_UIDS_CACHE)
            },
            ui: {
                nextRowId: UIModule._nextRowId,
                nextListRuntimeId: UIModule._nextListRuntimeId,
                listMutationSubscribed: typeof UIModule._listMutationUnsubscribe === 'function',
                postRevealRecoveryActive: typeof UIModule._postRevealRecoveryStop === 'function',
                searchDrawerRoots: getDcufCollectionSize(UIModule.SEARCH_DRAWER_ROOTS),
                searchDrawerGlobalHandlersBound: UIModule._searchDrawerGlobalHandlersBound,
                searchDrawerRafActive: Boolean(UIModule._searchDrawerUpdateRafId),
                searchDrawerTimerActive: Boolean(UIModule._searchDrawerUpdateTimerId),
                effectiveDarkMode: window.__dcufEffectiveDarkMode ?? null
            },
            dom: {
                nodes: document.getElementsByTagName('*').length,
                listWraps: document.querySelectorAll(UIModule.SELECTORS.LIST_WRAP).length,
                originalRows: document.querySelectorAll(UIModule.SELECTORS.ORIGINAL_POST_ITEM).length,
                customLists: document.querySelectorAll(`.${UIModule.CUSTOM_CLASSES.MOBILE_LIST}`).length,
                customPosts: document.querySelectorAll(`.${UIModule.CUSTOM_CLASSES.POST_ITEM}`).length,
                customBottomControls: document.querySelectorAll(`.${UIModule.CUSTOM_CLASSES.BOTTOM_CONTROLS}`).length,
                dcufStyles: document.querySelectorAll('style[id^="dcuf"], style[id*="dcuf"]').length
            }
        };
    };

    const emitDcufInternalMemorySample = (reason = 'manual') => {
        const sample = collectDcufInternalMemorySample(reason);
        window.__dcufLastMemorySample = sample;
        __dcufRoot.__dcufLastMemorySample = sample;
        __dcufRoot.postMessage({ type: 'DCUF_INTERNAL_MEMORY_SAMPLE', data: sample }, '*');
        return sample;
    };

    const dcufMemoryDebugApi = {
        sample: collectDcufInternalMemorySample,
        emit: emitDcufInternalMemorySample,
        dump(reason = 'manual-dump') {
            const sample = emitDcufInternalMemorySample(reason);
            console.table([{
                heapUsedMB: sample.heap.used,
                heapTotalMB: sample.heap.total,
                subscribers: sample.runtime.subscriberCount,
                pendingMutations: sample.runtime.pendingMutationRecords,
                userSumCache: sample.filter.userSumCache,
                userSumCacheKb: sample.filter.userSumCacheKb,
                negativeCache: sample.filter.negativeUserSumCache,
                inflight: sample.filter.inflightUserSumRequests,
                blockedUidsCache: sample.filter.blockedUidsCache,
                blockedUidsCacheKb: sample.filter.blockedUidsCacheKb,
                customPosts: sample.dom.customPosts
            }]);
            return sample;
        }
    };
    window.__dcufMemoryDebug = dcufMemoryDebugApi;
    __dcufRoot.__dcufMemoryDebug = dcufMemoryDebugApi;

    const isDcufMemoryDebugAutoEnabled = () => {
        try {
            return window.__DCUF_MEMORY_DEBUG__ === true
                || __dcufRoot.__DCUF_MEMORY_DEBUG__ === true
                || localStorage.getItem('dcufMemoryDebug') === '1';
        } catch (error) {
            return window.__DCUF_MEMORY_DEBUG__ === true || __dcufRoot.__DCUF_MEMORY_DEBUG__ === true;
        }
    };

    let dcufMemoryDebugTimerId = 0;
    if (isDcufMemoryDebugAutoEnabled()) {
        dcufMemoryDebugTimerId = window.setInterval(() => emitDcufInternalMemorySample('interval'), 10000);
    }
    window.addEventListener('pagehide', () => {
        if (dcufMemoryDebugTimerId) {
            emitDcufInternalMemorySample('pagehide');
            window.clearInterval(dcufMemoryDebugTimerId);
            dcufMemoryDebugTimerId = 0;
        }
    }, { once: true });


    // =================================================================
    // ================ Script-Level Initializations ===================
    // =================================================================
    const registerMenuCommandsSafely = () => {
        if (__dcufRoot.__dcufMenuCommandsRegistered) return;
        const commands = [
            ['글댓합 설정하기', FilterModule.showSettings.bind(FilterModule)],
            ['차단 유저 관리', PersonalBlockModule.createManagementPanel.bind(PersonalBlockModule)],
            ['플로팅 버튼 원위치', PersonalBlockModule.resetFabPosition.bind(PersonalBlockModule)],
            ['메뉴 버튼 크기 조절', PersonalBlockModule.showFabScalePanel.bind(PersonalBlockModule)],
            ['UI 색상 설정', ThemeModule.openPaletteDialog.bind(ThemeModule)]
            ,['모바일 편의기능 설정', MobileConvenienceModule.showSettings.bind(MobileConvenienceModule)]
        ];
        commands.forEach(([label, handler]) => {
            try { GM_registerMenuCommand(label, handler); }
            catch (error) { console.warn('[DCUF] menu registration failed:', label, error); }
        });
        __dcufRoot.__dcufMenuCommandsRegistered = true;
    };
    registerMenuCommandsSafely();


    // [신규] 단축키 설정을 다시 로드하는 전용 함수
    async function reloadShortcutKey() {
        const shortcutString = String(await GM_getValue(FilterModule.CONSTANTS.STORAGE_KEYS.SHORTCUT_KEY, 'Shift+S') || 'Shift+S');
        const changed = activeShortcutString !== null && activeShortcutString !== shortcutString;
        activeShortcutString = shortcutString;
        activeShortcutObject = FilterModule.parseShortcutString(activeShortcutString);
        return { changed, shortcutString: activeShortcutString };
    }

    async function awaitInitialCommentStabilization() {
        if (!UIModule.isViewPage()) return { reason: 'non-view' };
        const flushBarrier = window.__dcufFlushInitialCommentBarrier;
        if (typeof flushBarrier !== 'function') return { reason: 'unavailable' };

        const runtimeCoordinator = window.__dcufRuntimeCoordinator;
        const startedAt = typeof performance?.now === 'function' ? performance.now() : Date.now();
        const maxAttempts = 2;
        const quietFrameCount = 1;
        const deadline = Date.now() + 240;
        let lastState = null;
        let attemptsPerformed = 0;
        const getCommentGeneration = () => {
            if (typeof FilterModule?.getRelevantMutationGeneration === 'function') {
                return FilterModule.getRelevantMutationGeneration('comments');
            }
            return runtimeCoordinator?._mutationGeneration || 0;
        };
        const finish = (state) => ({
            ...state,
            durationMs: Math.round(((typeof performance?.now === 'function' ? performance.now() : Date.now()) - startedAt) * 10) / 10
        });
        // The document-start body lock is still active here. One paint boundary is
        // sufficient to drain comment-relevant MutationObserver work because a final
        // synchronous pass runs immediately before markReady, and the same observer
        // filters post-ready replacements before paint.
        for (let attempt = 1; attempt <= maxAttempts && Date.now() < deadline; attempt += 1) {
            attemptsPerformed = attempt;
            runtimeCoordinator?.ensureMutationBus?.();
            lastState = flushBarrier({ reason: 'initial-comment-barrier', attempt });
            const firstGeneration = getCommentGeneration();
            await new Promise((resolve) => requestAnimationFrame(resolve));
            runtimeCoordinator?.flushPendingMutations?.('initial-comment:quiet-1');
            const secondGeneration = getCommentGeneration();
            if (secondGeneration !== firstGeneration) continue;
            lastState = flushBarrier({ reason: 'initial-comment-quiet', attempt });
            runtimeCoordinator?.incrementDiagnostic?.('ui.initialComment.mutationQuiet');
            return finish({
                reason: 'mutation-quiet',
                attempt,
                generation: secondGeneration,
                quietFrameCount,
                maxAttempts,
                prepareState: lastState
            });
        }
        lastState = flushBarrier({ reason: 'initial-comment-bounded-final-pass', attempt: attemptsPerformed || 1 });
        runtimeCoordinator?.incrementDiagnostic?.('ui.initialComment.boundedFinalPass');
        return finish({
            reason: 'bounded-final-pass',
            attempt: attemptsPerformed,
            quietFrameCount,
            maxAttempts,
            prepareState: lastState
        });
    }
    function prepareInitialCommentRevealBeforeMark(state = null) {
        const prepare = window.__dcufFlushInitialCommentBarrier || window.__dcufPrepareInitialCommentReveal;
        try {
            if (typeof prepare === 'function') {
                return prepare({
                    reason: 'before-mark-ui-ready',
                    previous: state?.commentInitState?.reason || ''
                });
            }
            if (UIModule.isViewPage() && typeof FilterModule?.runSyncRefilterPass === 'function') {
                const descriptors = FilterModule.runSyncRefilterPass('comments');
                return {
                    reason: 'filter-only',
                    targetCount: Array.isArray(descriptors) ? descriptors.length : 0
                };
            }
            return null;
        } catch (error) {
            return { reason: 'error', message: error?.message || 'unknown' };
        }
    }


    async function main() {
        if (isInitialized) {
            return {
                uiInitState: 'already-initialized',
                commentInitState: { reason: 'already-initialized' }
            };
        }
        isInitialized = true;
        if (window.__dcufBootController) {
            window.__dcufBootController.startPreparing('mobile-main');
            if (!__dcufRoot.__dcufShortcutReadyHookRegistered) {
                __dcufRoot.__dcufShortcutReadyHookRegistered = true;
                window.__dcufBootController.onReady(() => reloadShortcutKey().catch((error) => {
                    console.warn('[DCUF] shortcut initialization failed:', error);
                }));
            }
        }
        console.log("[DC Filter+UI] Initializing v__VERSION__...");
        await MobileConvenienceModule.init();
        UIModule.bindRecentVisitNavigation();


        if (!__dcufRoot.__dcufShortcutBound) {
            __dcufRoot.__dcufShortcutBound = true;
            window.addEventListener('keydown', async (e) => {
            if (!activeShortcutObject || !activeShortcutObject.key) return;


            const isMatch = e.key.toUpperCase() === activeShortcutObject.key &&
                e.ctrlKey === activeShortcutObject.ctrlKey &&
                e.shiftKey === activeShortcutObject.shiftKey &&
                e.altKey === activeShortcutObject.altKey &&
                e.metaKey === activeShortcutObject.metaKey;


            if (isMatch) {
                e.preventDefault();
                const settingsPanel = document.getElementById(FilterModule.CONSTANTS.UI_IDS.SETTINGS_PANEL);
                if (settingsPanel) {
                    settingsPanel.remove();
                } else {
                    await FilterModule.showSettings();
                }
            }
            });
        }


        if (UIModule.isWritePage() || (!UIModule.isListPage() && !UIModule.isViewPage())) {
            const uiInitState = await UIModule.init();
            window.__dcufBootController?.note?.(UIModule.isWritePage() ? 'boot.write-ui-ready' : 'boot.other-ui-ready', { uiInitState });
            if (window.__dcufBootController) {
                window.__dcufBootController.onReady(() => {
                    void (async () => {
                        await FilterModule.init();
                        await PersonalBlockModule.init(FilterModule.getBootSnapshot(), { deferUi: true });
                    })().catch((error) => console.warn('[DCUF] deferred non-view initialization failed:', error));
                });
            }
            return { uiInitState, commentInitState: { reason: 'non-view' } };
        }

        await FilterModule.init();
        await PersonalBlockModule.init(FilterModule.getBootSnapshot(), { deferUi: true });
        window.__dcufBootController?.markFilterReady?.('mobile-filter-and-personal-block-ready');
        window.__dcufBootController?.note?.('boot.local-filter-ready');
        const uiInitState = await UIModule.init();
        window.__dcufBootController?.note?.('boot.ui-ready', { uiInitState });
        const configuredRevealTimeout = Number(__dcufRoot.__DCUF_TESTBED_CONFIG__?.boot?.revealTimeoutMs);
        const initialRevealPromise = UIModule.isViewPage() && typeof UIModule?.waitForInitialRevealReady === 'function'
            ? UIModule.waitForInitialRevealReady(
                Number.isFinite(configuredRevealTimeout) && configuredRevealTimeout > 0 ? configuredRevealTimeout : undefined
            )
            : null;
        // Mobile comment reply-merge cleanup can rerender blocked comment rows
        // once more after Filter/UI init. Keep the initial body lock until that first
        // stabilization window finishes so personally blocked comments do not flash visible.
        // View style/list readiness runs in parallel, but both promises must settle
        // before the body lock can be released.
        const commentInitState = await awaitInitialCommentStabilization();
        window.__dcufBootController?.note?.('boot.comment-barrier', {
            reason: commentInitState?.reason || 'unknown',
            attempt: commentInitState?.attempt || 0,
            quietFrameCount: commentInitState?.quietFrameCount || 0,
            maxAttempts: commentInitState?.maxAttempts || 0,
            durationMs: commentInitState?.durationMs ?? null
        });
        const initialRevealState = initialRevealPromise ? await initialRevealPromise : null;
        const initState = { uiInitState, commentInitState, initialRevealState };
        console.log(`[DC Filter+UI] Initialization complete. ui=${uiInitState} comment=${commentInitState?.reason || 'unknown'}`);
        return initState;
    }


    let initializationRecoveryAttempts = 0;
    const runSafely = async () => {
        let initState = {
            uiInitState: 'fallback',
            commentInitState: { reason: 'not-started' }
        };
        let revealState = 'error';
        let initializationSucceeded = false;

        try {
            const mainState = await main();
            if (mainState && typeof mainState === 'object') initState = mainState;
            if (typeof initState.initialRevealState === 'string') {
                revealState = initState.initialRevealState;
            } else if (typeof UIModule?.waitForInitialRevealReady === 'function') {
                const configuredRevealTimeout = Number(__dcufRoot.__DCUF_TESTBED_CONFIG__?.boot?.revealTimeoutMs);
                revealState = await UIModule.waitForInitialRevealReady(
                    Number.isFinite(configuredRevealTimeout) && configuredRevealTimeout > 0 ? configuredRevealTimeout : undefined
                );
            }
            window.__dcufBootController?.note?.('boot.style-verified', { revealState });
            initializationSucceeded = revealState !== 'error' && !String(revealState).startsWith('timeout-');
        } catch (error) {
            initState = {
                ...initState,
                uiInitState: 'error'
            };
            revealState = 'error';
            isInitialized = false;
            console.error("[DC Filter+UI] A critical error occurred during main execution:", error);
        } finally {
            // [v2.2.2 수정] 모든 UI 처리 및 필터링 적용이 끝난 후,
            // 루트 준비 완료 클래스를 추가하여 화면을 표시합니다.
            if (initializationSucceeded) {
                // Do not yield between the final local comment pass and removing the body lock.
                // This closes the window where host AJAX can replace comments after the initial
                // barrier but before markUiReady exposes the page.
                const finalCommentState = prepareInitialCommentRevealBeforeMark(initState);
                window.__dcufBootController?.note?.('boot.comment-finalized', {
                    reason: finalCommentState?.reason || 'not-applicable',
                    targetCount: finalCommentState?.targetCount || 0
                });
                if (UIModule.isViewPage() && finalCommentState?.reason === 'error') {
                    initializationSucceeded = false;
                    revealState = 'comment-finalize-error';
                }
            }
            if (initializationSucceeded) markUiReady('ready:' + revealState);
            else if (window.__dcufBootController) window.__dcufBootController.degrade('initialization:' + revealState);
            if (typeof UIModule?.startPostRevealRecoveryWatch === 'function') {
                const recoveryWatchDelayMs = Math.max(0, Number(__dcufRoot.__DCUF_TESTBED_CONFIG__?.boot?.recoveryWatchDelayMs) || 0);
                if (recoveryWatchDelayMs > 0) {
                    window.setTimeout(() => UIModule.startPostRevealRecoveryWatch({ revealState }), recoveryWatchDelayMs);
                } else {
                    UIModule.startPostRevealRecoveryWatch({ revealState });
                }
            }
            if (!initializationSucceeded && revealState === 'error' && initializationRecoveryAttempts < 2) {
                initializationRecoveryAttempts += 1;
                const retryBaseMs = Math.max(20, Number(__dcufRoot.__DCUF_TESTBED_CONFIG__?.boot?.recoveryRetryDelayMs) || 160);
                window.setTimeout(() => {
                    if (window.__dcufBootController?.state === 'degraded') runSafely();
                }, retryBaseMs * initializationRecoveryAttempts);
            }
            console.log(`[DC Filter+UI] UI is now visible. ui=${initState.uiInitState} comment=${initState.commentInitState?.reason || 'unknown'} reveal=${revealState}`);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runSafely, { once: true });
    } else {
        runSafely();
    }




    const observeDarkMode = () => {
        const head = document.head;
        if (!head) {
            setTimeout(observeDarkMode, 100);
            return;
        }

        const checkDarkModeStatus = () => {
            const body = document.body;
            if (!body) return;
            const root = document.documentElement;

            const darkModeStylesheet = document.getElementById('css-darkmode');
            const nextDarkMode = Boolean(darkModeStylesheet);
            const classStateChanged = body.classList.contains('dc-filter-dark-mode') !== nextDarkMode
                || Boolean(root && root.classList.contains('dc-filter-dark-mode') !== nextDarkMode);
            const effectiveStateChanged = window.__dcufEffectiveDarkMode !== nextDarkMode;

            if (!classStateChanged && !effectiveStateChanged) {
                UIModule.recordDiagnostic('ui.darkMode.skippedUnchanged');
                return;
            }

            body.classList.toggle('dc-filter-dark-mode', nextDarkMode);
            if (root) root.classList.toggle('dc-filter-dark-mode', nextDarkMode);
            window.__dcufEffectiveDarkMode = nextDarkMode;
            UIModule.recordDiagnostic('ui.darkMode.synced');
            window.__dcufDiagnostics?.setGauge?.('ui.darkMode.enabled', nextDarkMode ? 1 : 0);

            // 본문/이미지댓글은 host 쪽 늦은 렌더가 다시 색을 덮는 경우가 있어
            // dark class 토글 직후 후처리 동기화도 같이 다시 태웁니다.
            if (typeof window.__dcufSyncArticleDarkText === 'function') {
                window.__dcufSyncArticleDarkText();
            }
            if (typeof window.__dcufScheduleCommentNormalize === 'function') {
                window.__dcufScheduleCommentNormalize();
            }
        };

        if (window.__dcufDarkModeHeadObserver) {
            checkDarkModeStatus();
            return;
        }

        const observer = new MutationObserver(checkDarkModeStatus);
        observer.observe(head, { childList: true });
        window.__dcufDarkModeHeadObserver = observer;

        // 초기 상태 확인
        checkDarkModeStatus();
    };
    observeDarkMode();

})();

