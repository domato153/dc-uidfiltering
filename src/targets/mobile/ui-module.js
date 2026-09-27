
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
        TOOLTIP_BOUND_ATTR: 'data-dcuf-tooltip-bound',
        POST_REVEAL_RECOVERY_MAX_MS: Math.max(20, Number(__dcufRoot.__DCUF_TESTBED_CONFIG__?.boot?.recoveryMaxMs) || 4500),
        POST_REVEAL_RECOVERY_POLL_MS: 280,
        POST_REVEAL_RECOVERY_STABLE_PASSES: 3,
        POST_REVEAL_RECOVERY_THEME_REFRESH_LIMIT: 2,
        _nextRowId: 1,
        _nextListRuntimeId: 1,
        _listMutationUnsubscribe: null,
        _listImmediateMutationUnsubscribe: null,
        _articleSurfaceMutationUnsubscribe: null,
        _commentSurfaceMutationUnsubscribe: null,
        _commentSurfaceImmediateMutationUnsubscribe: null,
        _initialRevealStartedAt: 0,
        _postRevealRecoveryStop: null,
        ARTICLE_AD_STYLE_ID: 'dcuf-article-native-ad-style',

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
            const isAdvertisement = mirroredItem.getAttribute('data-dcuf-state') === 'advertisement';
            // Host CSS also hides non-post survey/advertisement rows. The original table is
            // off-screen, but each row retains its own computed display value.
            const isHostHidden = window.getComputedStyle(originalRow).display === 'none';
            const nextDisplay = (isDibsBlocked || isUserFilterBlocked || isHostHidden || isAdvertisement) ? 'none' : 'block';
            if (typeof FilterModule?.debugMirrorSync === 'function') {
                FilterModule.debugMirrorSync(originalRow, mirroredItem, nextDisplay, 'UIModule.updateItemVisibility');
            }
            if (mirroredItem.style.display !== nextDisplay) {
                mirroredItem.style.display = nextDisplay;
            }
        },


        createMobileListItem(originalRow, rowId) {
            const newItem = __dcufListHostAdapter.createItem(originalRow, rowId);
            if (newItem) this.updateItemVisibility(originalRow, newItem);
            return newItem;
        },

        getListSurfaceSnapshot(originalRow, rowId) {
            return __dcufListHostAdapter.snapshotRow(originalRow, rowId);
        },


        createBottomControls(listWrap) {
            const gallTabs = this.findBottomControlElement(listWrap, this.SELECTORS.GALL_TABS)
                || this.findAdjacentViewListActionBar(listWrap);
            const pagination = this.findBottomControlElement(listWrap, this.SELECTORS.PAGINATION);
            const pageMoveBox = this.findBottomControlElement(listWrap, this.SELECTORS.PAGE_MOVE_BOX);
            const searchForm = this.findBottomControlElement(listWrap, this.SELECTORS.SEARCH_FORM);
            const searchLayer = this.findBottomControlElement(listWrap, this.SELECTORS.SEARCH_LAYER);
            const article = listWrap.closest('article');
            const toolbar = article?.querySelector(':scope > .list_array_option') || null;

            if (!toolbar && !gallTabs && !pagination && !pageMoveBox && !searchForm) return null;

            return __dcufListHostAdapter.connect({
                listWrap,
                toolbar,
                actionBar: gallTabs,
                pagination,
                pageMoveBox,
                searchForm,
                searchLayer,
            });
        },

        ensureBottomControls(listWrap) {
            if (!(listWrap instanceof HTMLElement)) return null;
            return this.createBottomControls(listWrap);
        },

        bindTooltipEvents(listContainer) {
            if (!(listContainer instanceof HTMLElement)) return;
            if (listContainer.getAttribute(this.TOOLTIP_BOUND_ATTR) === '1') return;
            listContainer.setAttribute(this.TOOLTIP_BOUND_ATTR, '1');

            const tooltip = document.getElementById('custom-instant-tooltip');
            if (!tooltip) return;

            const positionTooltip = (event) => {
                const gap = 10;
                const edge = 8;
                const rect = tooltip.getBoundingClientRect();
                const viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
                const viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
                const preferredLeft = event.clientX + gap;
                const preferredTop = event.clientY + gap;
                const left = preferredLeft + rect.width <= viewportWidth - edge
                    ? preferredLeft
                    : event.clientX - rect.width - gap;
                const top = preferredTop + rect.height <= viewportHeight - edge
                    ? preferredTop
                    : event.clientY - rect.height - gap;
                tooltip.style.left = `${Math.max(edge, Math.min(left, viewportWidth - rect.width - edge))}px`;
                tooltip.style.top = `${Math.max(edge, Math.min(top, viewportHeight - rect.height - edge))}px`;
            };

            listContainer.addEventListener('mouseover', (e) => {
                const subject = e.target.closest('.gall_subject');
                if (subject && subject.title) {
                    tooltip.textContent = subject.title;
                    tooltip.style.visibility = 'hidden';
                    tooltip.style.display = 'block';
                    positionTooltip(e);
                    tooltip.style.visibility = 'visible';
                }
            });
            listContainer.addEventListener('mouseout', () => {
                tooltip.style.display = 'none';
                tooltip.style.visibility = 'hidden';
            });
            listContainer.addEventListener('mousemove', (e) => {
                if (tooltip.style.display === 'block') {
                    positionTooltip(e);
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
            return {
                originalTableStyle: originalTable.getAttribute('style'),
                transformedValue: listWrap.getAttribute(this.TRANSFORMED_ATTR),
                existingCustomLists: new Set(listWrap.querySelectorAll(`.${this.CUSTOM_CLASSES.MOBILE_LIST}`)),
                existingBottomControls: new Set(scope.querySelectorAll(`.${this.CUSTOM_CLASSES.BOTTOM_CONTROLS}`)),
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
            if (listWrap instanceof HTMLElement) __dcufListHostAdapter.disconnectControls(listWrap);
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
                if (scheduleExisting) this.scheduleListSync(existingState, reason);
                return existingState;
            }

            if (existingState) this.destroyListState(existingState, 'list-runtime-refresh');

            const transaction = this.captureListTransaction(listWrap, originalTable);
            let newListContainer = null;
            let state = null;
            try {
                newListContainer = __dcufListHostAdapter.mountOwnedRoot({
                    listWrap,
                    originalTable,
                    className: this.CUSTOM_CLASSES.MOBILE_LIST,
                });
                if (!(newListContainer instanceof HTMLElement)) throw new Error('list owned root mount failed');

                this.bindTooltipEvents(newListContainer);
                this.ensureBottomControls(listWrap);
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

        connectArticleSurface(root = document) {
            if (!this.isViewPage()) return [];
            return __dcufArticleHostAdapter.connect(root);
        },

        subscribeArticleSurfaceUpdates() {
            if (!this.isViewPage() || typeof this._articleSurfaceMutationUnsubscribe === 'function') return;
            const runtimeCoordinator = this.getRuntimeCoordinator();
            if (!runtimeCoordinator || typeof runtimeCoordinator.subscribeMutations !== 'function') return;
            const unsubscribe = runtimeCoordinator.subscribeMutations('ui-article-surface', (payload) => {
                __dcufArticleHostAdapter.refreshFromMutation(payload);
            }, { contexts: ['view'] });
            if (typeof unsubscribe === 'function') this._articleSurfaceMutationUnsubscribe = unsubscribe;
        },

        connectCommentSurface(root = document) {
            if (!this.isViewPage()) return [];
            return __dcufCommentHostAdapter.connect(root);
        },

        subscribeCommentSurfaceUpdates() {
            if (!this.isViewPage() || typeof this._commentSurfaceMutationUnsubscribe === 'function') return;
            const runtimeCoordinator = this.getRuntimeCoordinator();
            if (!runtimeCoordinator || typeof runtimeCoordinator.subscribeMutations !== 'function') return;
            if (typeof runtimeCoordinator.subscribeImmediateMutations === 'function') {
                this._commentSurfaceImmediateMutationUnsubscribe = runtimeCoordinator.subscribeImmediateMutations(
                    'ui-comment-surface-state',
                    (payload) => __dcufCommentHostAdapter.refreshFromMutation(payload),
                    { contexts: ['comments'], mutationScope: 'comments' }
                );
            }
            const unsubscribe = runtimeCoordinator.subscribeMutations('ui-comment-surface', (payload) => {
                __dcufCommentHostAdapter.refreshFromMutation(payload);
            });
            if (typeof unsubscribe === 'function') this._commentSurfaceMutationUnsubscribe = unsubscribe;
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
            const type = ((window.location.pathname || '').match(/\/board\/(lists|view|write|modify|delete)(?:\/|$)/) || [])[1] || 'other';
            return {
                type,
                isList: type === 'lists',
                isView: type === 'view',
                isWrite: type === 'write',
                isModify: type === 'modify',
                isDelete: type === 'delete',
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

        isDeletePage() {
            return this.getPageContext().isDelete === true;
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
                    scheduleExisting: false
                });

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
                            scheduleExisting: false
                        });
                    } else {
                        this.ensureKnownListRuntimes(document, `post-reveal:${reason}`, {
                            scheduleExisting: false
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
            const snapshot = __dcufNativeFormHostAdapter.refresh();
            if (snapshot?.kind === 'modify-editor') {
                this.transformWritePage();
                this.recordDiagnostic('ui.modifySurface.editor', { reason });
                return 'editor';
            }
            if (snapshot?.kind === 'modify-password') {
                this.recordDiagnostic('ui.modifySurface.password', { reason });
                return 'password';
            }
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
                        '.no_memberwrap',
                        '#leave_confirm_box'
                    ], { includeRoots: true })
                    : [];
                if (candidates.length > 0 || document.body?.dataset.dcufModifySurface === 'pending') {
                    this.syncModifySurface('mutation');
                }
            });
            if (typeof unsubscribe === 'function') this._modifySurfaceMutationUnsubscribe = unsubscribe;
        },

        syncDeleteSurface(reason = 'sync') {
            if (!this.isDeletePage() || !document.body) return 'not-delete';
            const snapshot = __dcufNativeFormHostAdapter.refresh();
            if (snapshot?.kind === 'delete-confirm') {
                this.recordDiagnostic('ui.deleteSurface.confirm', { reason });
                return 'confirm';
            }
            if (snapshot?.kind === 'delete-password') {
                this.recordDiagnostic('ui.deleteSurface.password', { reason });
                return 'password';
            }
            return 'pending';
        },

        subscribeDeleteSurfaceUpdates() {
            if (!this.isDeletePage() || this._deleteSurfaceMutationUnsubscribe) return;
            const runtimeCoordinator = this.getRuntimeCoordinator();
            if (!runtimeCoordinator || typeof runtimeCoordinator.subscribeMutations !== 'function') return;

            const unsubscribe = runtimeCoordinator.subscribeMutations('ui-delete-surface', (payload) => {
                const candidates = typeof payload?.collectMatches === 'function'
                    ? payload.collectMatches([
                        'form#delete',
                        'form[name="delete"]',
                        '.no_memberwrap',
                        '.empty_pagewrap',
                        '.pop_wrap.type5'
                    ], { includeRoots: true })
                    : [];
                if (candidates.length > 0 || document.body?.dataset.dcufDeleteSurface === 'pending') {
                    this.syncDeleteSurface('mutation');
                }
            });
            if (typeof unsubscribe === 'function') this._deleteSurfaceMutationUnsubscribe = unsubscribe;
        },

        subscribeWriteSurfaceUpdates() {
            if (!this.getPageContext().isWrite || this._writeSurfaceMutationUnsubscribe) return;
            const runtimeCoordinator = this.getRuntimeCoordinator();
            if (!runtimeCoordinator || typeof runtimeCoordinator.subscribeMutations !== 'function') return;

            const unsubscribe = runtimeCoordinator.subscribeMutations('ui-native-write-surface', (payload) => {
                const candidates = typeof payload?.collectMatches === 'function'
                    ? payload.collectMatches(['form#write', '#leave_confirm_box'], { includeRoots: true })
                    : [];
                if (candidates.length > 0 || document.body?.classList.contains('is-write-page')) {
                    __dcufNativeFormHostAdapter.refreshFromMutation(payload);
                    const writeForm = this.getWriteForm();
                    if (writeForm instanceof HTMLFormElement) {
                        void MobileConvenienceModule.attachDraftForm(writeForm);
                        if (writeForm.dataset.dcufWriteTransformed !== '1') this.transformWritePage();
                        else {
                            __dcufWriteEditorHostAdapter.connect(writeForm, { runtimeCoordinator });
                            __dcufWriteAdHostAdapter.connect(writeForm.closest('.write_box') || document.body, { runtimeCoordinator });
                        }
                    }
                }
            });
            if (typeof unsubscribe === 'function') this._writeSurfaceMutationUnsubscribe = unsubscribe;
        },

        transformWritePage() {
            const writeForm = this.getWriteForm();
            if (!(writeForm instanceof HTMLFormElement)) return false;
            const writeBox = writeForm.closest('.write_box') || document.querySelector('.write_box');
            writeForm.classList.add('dcuf-write-form');
            document.body.classList.add('is-write-page');
            void MobileConvenienceModule.attachDraftForm(writeForm);
            const runtimeCoordinator = this.getRuntimeCoordinator();
            if (writeForm.dataset.dcufWriteTransformed === '1') {
                __dcufWriteAdHostAdapter.connect(writeBox || document.body, { runtimeCoordinator });
                return true;
            }
            writeForm.dataset.dcufWriteTransformed = '1';

            const gallType = writeForm?.querySelector('input[name="_GALLTYPE_"]')?.value || '';
            const isMinorWrite = gallType.toUpperCase() === 'M'
                || document.querySelector('#container.minor_write') instanceof Element
                || (window.location.pathname || '').includes('/mgallery/');
            document.body.classList.add(isMinorWrite ? 'dcuf-write-minor' : 'dcuf-write-major');
            writeForm?.classList.add(isMinorWrite ? 'dcuf-write-form-minor' : 'dcuf-write-form-major');

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

            const captchaCell = writeForm?.querySelector('#code')?.closest('td');
            if (captchaCell) {
                captchaCell.classList.add('user_info_input', 'dcuf-write-captcha-cell');
            }


            __dcufWriteEditorHostAdapter.connect(writeForm, {
                runtimeCoordinator,
            });
            __dcufWriteAdHostAdapter.connect(writeBox || document.body, { runtimeCoordinator });
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
                bootController.registerRollback((reason) => {
                    this.rollbackInitialListTransactions(reason);
                    __dcufArticleHostAdapter.dispose(document);
                    __dcufCommentHostAdapter.dispose(document);
                    __dcufNativeFormHostAdapter.dispose(document);
                    __dcufWriteDraftHostAdapter.dispose();
                    __dcufWriteEditorHostAdapter.dispose();
                    __dcufWriteAdHostAdapter.dispose();
                    __dcufHeaderShellHostAdapter.dispose();
                    __dcufGalleryPageHeadHostAdapter.dispose();
                    __dcufHeaderGnbHostAdapter.dispose();
                    __dcufHeaderRecentVisitHostAdapter.dispose();
                });
                bootController.registerRecovery(() => {
                    __dcufHeaderShellHostAdapter.connect(document, {
                        runtimeCoordinator: this.getRuntimeCoordinator(),
                    });
                    __dcufGalleryPageHeadHostAdapter.connect(document, {
                        runtimeCoordinator: this.getRuntimeCoordinator(),
                    });
                    __dcufHeaderGnbHostAdapter.connect(document, {
                        runtimeCoordinator: this.getRuntimeCoordinator(),
                    });
                    __dcufHeaderRecentVisitHostAdapter.connect(document, {
                        runtimeCoordinator: this.getRuntimeCoordinator(),
                    });
                    this.ensureKnownListRuntimes(document, 'boot-recovery');
                    if (this.isViewPage()) {
                        __dcufArticleHostAdapter.refresh(document);
                        __dcufCommentHostAdapter.refresh(document);
                    }
                    if (this.getPageContext().isWrite || this.isModifyPage() || this.isDeletePage()) {
                        __dcufNativeFormHostAdapter.refresh(document);
                    }
                    if (this.getPageContext().isWrite) {
                        void MobileConvenienceModule.attachDraftForm(this.getWriteForm());
                        __dcufWriteEditorHostAdapter.connect(this.getWriteForm(), {
                            runtimeCoordinator: this.getRuntimeCoordinator(),
                        });
                        __dcufWriteAdHostAdapter.connect(this.getWriteForm()?.closest('.write_box') || document.body, {
                            runtimeCoordinator: this.getRuntimeCoordinator(),
                        });
                    }
                });
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

            if (this.isDeletePage()) {
                const deleteSurface = this.syncDeleteSurface('init');
                this.subscribeDeleteSurfaceUpdates();
                return `delete-${deleteSurface}`;
            }

            if (this.isWritePage()) {
                __dcufNativeFormHostAdapter.refresh(document);
                this.transformWritePage();
                this.subscribeWriteSurfaceUpdates();
                return 'non-list';
            } else if (this.isViewPage()) {
                this.connectArticleSurface(document);
                this.subscribeArticleSurfaceUpdates();
                this.connectCommentSurface(document);
                this.subscribeCommentSurfaceUpdates();
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
        const listHostResources = __dcufListHostAdapter.snapshotResources();
        const articleHostResources = __dcufArticleHostAdapter.snapshotResources();
        const commentHostResources = __dcufCommentHostAdapter.snapshotResources();
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
                searchDrawerRoots: listHostResources.searchDrawerRoots,
                searchDrawerGlobalHandlersBound: listHostResources.searchDrawerGlobalHandlersBound,
                searchDrawerRafActive: listHostResources.searchDrawerRafActive,
                searchDrawerTimerActive: listHostResources.searchDrawerTimerActive,
                articleSurfaceRoots: articleHostResources.activeRoots,
                articleSurfaceTrackedElements: articleHostResources.trackedElements,
                articleSurfaceMutationSubscribed: typeof UIModule._articleSurfaceMutationUnsubscribe === 'function',
                commentSurfaceRoots: commentHostResources.activeRoots,
                commentSurfaceTrackedElements: commentHostResources.trackedElements,
                commentSurfaceMutationSubscribed: typeof UIModule._commentSurfaceMutationUnsubscribe === 'function',
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
        __dcufHeaderShellHostAdapter.connect(document);
        __dcufGalleryPageHeadHostAdapter.connect(document);
        __dcufHeaderGnbHostAdapter.connect(document);
        __dcufHeaderRecentVisitHostAdapter.connect(document);


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
        __dcufHeaderShellHostAdapter.connect(document, {
            runtimeCoordinator: UIModule.getRuntimeCoordinator(),
        });
        __dcufGalleryPageHeadHostAdapter.connect(document, {
            runtimeCoordinator: UIModule.getRuntimeCoordinator(),
        });
        __dcufHeaderGnbHostAdapter.connect(document, {
            runtimeCoordinator: UIModule.getRuntimeCoordinator(),
        });
        __dcufHeaderRecentVisitHostAdapter.connect(document, {
            runtimeCoordinator: UIModule.getRuntimeCoordinator(),
        });
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

