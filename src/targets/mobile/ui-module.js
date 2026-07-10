
    /**
     * =================================================================
     * ========================== UI Module ============================
     * =================================================================
     */
    const UIModule = {
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
        PAGINATION_BOUND_ATTR: 'data-dcuf-force-refresh-bound',
        TOOLTIP_BOUND_ATTR: 'data-dcuf-tooltip-bound',
        SEARCH_LAYER_BOUND_ATTR: 'data-dcuf-search-layer-bound',
        POST_REVEAL_RECOVERY_MAX_MS: 4500,
        POST_REVEAL_RECOVERY_POLL_MS: 280,
        POST_REVEAL_RECOVERY_STABLE_PASSES: 3,
        POST_REVEAL_RECOVERY_THEME_REFRESH_LIMIT: 2,
        _nextRowId: 1,
        _nextListRuntimeId: 1,
        _listMutationUnsubscribe: null,
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
            return listWrap.closest('article')
                || listWrap.closest('section')
                || listWrap.parentElement
                || listWrap;
        },

        findBottomControlElement(listWrap, selector) {
            if (!(listWrap instanceof HTMLElement) || !selector) return null;
            const scope = this.resolveBottomControlScope(listWrap);
            if (!(scope instanceof HTMLElement)) return null;

            const candidates = Array.from(scope.querySelectorAll(selector));
            return candidates.find((element) => (
                element instanceof HTMLElement
                && !element.closest(`.${this.CUSTOM_CLASSES.BOTTOM_CONTROLS}`)
            )) || null;
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
            const nextDisplay = (isDibsBlocked || isUserFilterBlocked) ? 'none' : 'block';
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

        bindSearchDrawerReserve(searchRoot) {
            if (!(searchRoot instanceof HTMLElement)) return;
            if (searchRoot.getAttribute(this.SEARCH_LAYER_BOUND_ATTR) === '1') {
                this.updateSearchDrawerReserve(searchRoot);
                return;
            }
            searchRoot.setAttribute(this.SEARCH_LAYER_BOUND_ATTR, '1');

            const searchForm = searchRoot.matches?.(this.SELECTORS.SEARCH_FORM)
                ? searchRoot
                : searchRoot.querySelector(this.SELECTORS.SEARCH_FORM);
            if (!(searchForm instanceof HTMLElement)) return;

            searchRoot.style.setProperty('overflow', 'visible', 'important');
            searchRoot.style.setProperty('position', 'relative', 'important');
            searchRoot.style.setProperty('transition', 'padding-bottom 0.18s ease', 'important');

            const scheduleUpdate = () => {
                requestAnimationFrame(() => this.updateSearchDrawerReserve(searchRoot));
                window.setTimeout(() => this.updateSearchDrawerReserve(searchRoot), 40);
            };

            searchForm.addEventListener('click', scheduleUpdate, true);
            searchForm.addEventListener('change', scheduleUpdate, true);
            searchForm.addEventListener('focusin', scheduleUpdate, true);
            document.addEventListener('click', scheduleUpdate, true);
            window.addEventListener('resize', scheduleUpdate);

            scheduleUpdate();
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
            searchForm.style.setProperty('max-width', '520px', 'important');
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
                searchWrap.style.setProperty('justify-content', 'center', 'important');
                searchWrap.style.setProperty('gap', '4px', 'important');
                searchWrap.style.setProperty('width', 'fit-content', 'important');
                searchWrap.style.setProperty('max-width', '100%', 'important');
                searchWrap.style.setProperty('margin', '0 auto', 'important');
                searchWrap.style.setProperty('padding', '0', 'important');
                searchWrap.style.setProperty('flex-wrap', 'nowrap', 'important');
            }

            if (hasLegacySearchColumns && searchWrap instanceof HTMLElement) {
                searchWrap.style.setProperty('display', 'flex', 'important');
                searchWrap.style.setProperty('align-items', 'center', 'important');
                searchWrap.style.setProperty('justify-content', 'center', 'important');
                searchWrap.style.setProperty('gap', '4px', 'important');
                searchWrap.style.setProperty('width', 'fit-content', 'important');
                searchWrap.style.setProperty('max-width', '100%', 'important');
                searchWrap.style.setProperty('margin', '0 auto', 'important');
                searchWrap.style.setProperty('padding', '0', 'important');
                searchWrap.style.setProperty('flex-wrap', 'nowrap', 'important');
            }

            if (leftBox instanceof HTMLElement) {
                leftBox.style.setProperty('display', 'block', 'important');
                leftBox.style.setProperty('flex', '0 0 125px', 'important');
                leftBox.style.setProperty('width', '125px', 'important');
                leftBox.style.setProperty('min-width', '125px', 'important');
                leftBox.style.setProperty('margin', '0', 'important');
                leftBox.style.setProperty('padding', '0', 'important');
                leftBox.style.setProperty('float', 'none', 'important');
                leftBox.style.setProperty('overflow', 'visible', 'important');
            }

            if (rightBox instanceof HTMLElement) {
                rightBox.style.setProperty('display', 'flex', 'important');
                rightBox.style.setProperty('align-items', 'center', 'important');
                rightBox.style.setProperty('flex', '0 1 auto', 'important');
                rightBox.style.setProperty('width', '320px', 'important');
                rightBox.style.setProperty('min-width', '0', 'important');
                rightBox.style.setProperty('margin', '0', 'important');
                rightBox.style.setProperty('padding', '0', 'important');
                rightBox.style.setProperty('float', 'none', 'important');
                rightBox.style.setProperty('overflow', 'visible', 'important');
            }

            if (nativeSelectHost instanceof HTMLElement) {
                nativeSelectHost.style.setProperty('display', 'block', 'important');
                nativeSelectHost.style.setProperty('flex', '0 0 125px', 'important');
                nativeSelectHost.style.setProperty('width', '125px', 'important');
                nativeSelectHost.style.setProperty('min-width', '125px', 'important');
                nativeSelectHost.style.setProperty('height', '38px', 'important');
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
                nativeSelect.style.setProperty('min-width', '125px', 'important');
                nativeSelect.style.setProperty('height', '38px', 'important');
                nativeSelect.style.setProperty('margin', '0', 'important');
                nativeSelect.style.setProperty('padding', '0 10px', 'important');
                nativeSelect.style.setProperty('border', '1px solid #3b4890', 'important');
                nativeSelect.style.setProperty('border-radius', '0', 'important');
                nativeSelect.style.setProperty('background', '#fff', 'important');
                nativeSelect.style.setProperty('box-shadow', 'none', 'important');
                nativeSelect.style.setProperty('color', '#333', 'important');
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

            if (selectBox instanceof HTMLElement) {
                selectBox.style.setProperty('display', 'flex', 'important');
                selectBox.style.setProperty('align-items', 'stretch', 'important');
                selectBox.style.setProperty('position', 'relative', 'important');
                selectBox.style.setProperty('flex', '0 0 125px', 'important');
                selectBox.style.setProperty('width', '125px', 'important');
                selectBox.style.setProperty('min-width', '125px', 'important');
                selectBox.style.setProperty('height', '38px', 'important');
                selectBox.style.setProperty('margin', '0', 'important');
                selectBox.style.setProperty('float', 'none', 'important');
                selectBox.style.setProperty('overflow', 'visible', 'important');
                selectBox.style.setProperty('box-sizing', 'border-box', 'important');
                selectBox.style.setProperty('visibility', 'visible', 'important');
                selectBox.style.setProperty('border', '1px solid #3b4890', 'important');
                selectBox.style.setProperty('border-radius', '0', 'important');
                selectBox.style.setProperty('background', '#fff', 'important');
                selectBox.style.setProperty('box-shadow', 'none', 'important');
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
                selectArea.style.setProperty('color', '#333', 'important');
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
                bottomSearch.style.setProperty('flex', '0 1 auto', 'important');
                bottomSearch.style.setProperty('width', '320px', 'important');
                bottomSearch.style.setProperty('height', '38px', 'important');
                bottomSearch.style.setProperty('min-width', '0', 'important');
                bottomSearch.style.setProperty('margin', '0', 'important');
                bottomSearch.style.setProperty('float', 'none', 'important');
            }

            if (innerSearch instanceof HTMLElement) {
                innerSearch.style.setProperty('display', 'block', 'important');
                innerSearch.style.setProperty('flex', '1 1 auto', 'important');
                innerSearch.style.setProperty('width', 'auto', 'important');
                innerSearch.style.setProperty('height', '30px', 'important');
                innerSearch.style.setProperty('margin', '0', 'important');
                innerSearch.style.setProperty('padding', '0', 'important');
                innerSearch.style.setProperty('border', 'none', 'important');
                innerSearch.style.setProperty('background', '#fff', 'important');
                innerSearch.style.setProperty('box-shadow', 'inset 0 0 0 1px rgba(255, 255, 255, 0.06)', 'important');
                innerSearch.style.setProperty('overflow', 'hidden', 'important');
            }

            if (keywordInput instanceof HTMLInputElement) {
                keywordInput.style.setProperty('width', '100%', 'important');
                keywordInput.style.setProperty('height', '30px', 'important');
                keywordInput.style.setProperty('margin', '0', 'important');
                keywordInput.style.setProperty('padding', '0 9px', 'important');
                keywordInput.style.setProperty('border', 'none', 'important');
                keywordInput.style.setProperty('border-radius', '0', 'important');
                keywordInput.style.setProperty('background', '#fff', 'important');
                keywordInput.style.setProperty('box-shadow', 'none', 'important');
                keywordInput.style.setProperty('box-sizing', 'border-box', 'important');
            }

            if (searchButton instanceof HTMLElement) {
                searchButton.style.setProperty('flex', 'none', 'important');
                searchButton.style.setProperty('width', '37px', 'important');
                searchButton.style.setProperty('min-width', '37px', 'important');
                searchButton.style.setProperty('height', '36px', 'important');
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
        },

        createBottomControls(listWrap) {
            const gallTabs = this.findBottomControlElement(listWrap, this.SELECTORS.GALL_TABS);
            const pagination = this.findBottomControlElement(listWrap, this.SELECTORS.PAGINATION);
            const pageMoveBox = this.findBottomControlElement(listWrap, this.SELECTORS.PAGE_MOVE_BOX);


            if (!gallTabs && !pagination && !pageMoveBox) return null;


            const bottomControls = document.createElement('div');
            bottomControls.className = this.CUSTOM_CLASSES.BOTTOM_CONTROLS;


            if (gallTabs) {
                const buttonRow = document.createElement('div');
                buttonRow.className = 'custom-button-row';
                buttonRow.appendChild(gallTabs);
                bottomControls.appendChild(buttonRow);
            }


            if (pagination) {
                bottomControls.appendChild(pagination);
            }

            if (pageMoveBox) {
                bottomControls.appendChild(pageMoveBox);
            }

            this.enhanceBottomControls(bottomControls);

            return bottomControls;
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

        createListState(listWrap, originalTable, originalTbody, newListContainer) {
            const state = {
                runtimeId: this._nextListRuntimeId++,
                listWrap,
                originalTable,
                originalTbody,
                newListContainer,
                itemByRowId: new Map(),
                tbodyObserver: null,
                syncScheduler: null,
                rebuildAll: false,
                lastSyncReason: 'init'
            };

            state.syncScheduler = this.createPhaseScheduler(`ui-list-${state.runtimeId}`, () => {
                this.syncListState(state, state.lastSyncReason);
            }, [90]);

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
            this.LIST_STATE_MAP.delete(state.listWrap);
            if (state.itemByRowId && typeof state.itemByRowId.clear === 'function') {
                state.itemByRowId.clear();
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

        scheduleListSync(state, reason = 'sync', { rebuildAll = false } = {}) {
            if (!state) return;
            if (rebuildAll) state.rebuildAll = true;
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
            state.originalTable.style.setProperty('display', 'none', 'important');

            if (!state.newListContainer.isConnected && state.originalTable.parentNode) {
                state.originalTable.parentNode.insertBefore(state.newListContainer, state.originalTable.nextSibling);
            }

            const shouldRebuildAll = state.rebuildAll;
            const originalRows = Array.from(state.originalTbody.querySelectorAll(this.SELECTORS.ORIGINAL_POST_ITEM));
            const seenRowIds = new Set();
            let previousItem = null;

            originalRows.forEach((row) => {
                try {
                    const rowId = this.getOrAssignRowId(row);
                    if (!rowId) return;
                    seenRowIds.add(rowId);

                    let mirroredItem = state.itemByRowId.get(rowId);
                    if (shouldRebuildAll && mirroredItem instanceof HTMLElement) {
                        mirroredItem.remove();
                        state.itemByRowId.delete(rowId);
                        mirroredItem = null;
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
            this.recordDiagnostic('ui.listState.synced');
        },

        attachOriginalTbodyObserver(state) {
            if (!state?.originalTbody || state.tbodyObserver) return;

            state.tbodyObserver = new MutationObserver((mutations) => {
                const visibilityTargets = new Set();
                let needsResync = false;

                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
                        const originalRow = mutation.target;
                        if (originalRow instanceof HTMLElement && originalRow.matches(this.SELECTORS.ORIGINAL_POST_ITEM)) {
                            visibilityTargets.add(originalRow);
                        }
                        return;
                    }

                    if (mutation.type === 'childList' || mutation.type === 'characterData') {
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
                    this.scheduleListSync(state, 'tbody-mutated', { rebuildAll: true });
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

        ensureListRuntime(listWrap, reason = 'ensure') {
            if (!(listWrap instanceof HTMLElement)) return null;
            const ownedListWrap = this.resolveOwnedListWrap(listWrap);
            if (!(ownedListWrap instanceof HTMLElement) || ownedListWrap !== listWrap) return null;

            const originalTable = listWrap.querySelector(this.SELECTORS.ORIGINAL_TABLE);
            const originalTbody = originalTable?.querySelector(this.SELECTORS.ORIGINAL_TBODY);
            if (!originalTable || !originalTbody) return null;

            const existingState = this.LIST_STATE_MAP.get(listWrap);
            if (existingState && existingState.originalTbody === originalTbody && existingState.newListContainer instanceof HTMLElement) {
                this.enhanceOriginalSearchForms(listWrap);
                this.scheduleListSync(existingState, reason);
                return existingState;
            }

            if (existingState) this.destroyListState(existingState, 'list-runtime-refresh');

            listWrap.setAttribute(this.TRANSFORMED_ATTR, 'true');
            originalTable.style.setProperty('display', 'none', 'important');

            let newListContainer = listWrap.querySelector(`.${this.CUSTOM_CLASSES.MOBILE_LIST}`);
            if (!(newListContainer instanceof HTMLElement)) {
                newListContainer = document.createElement('div');
                newListContainer.className = this.CUSTOM_CLASSES.MOBILE_LIST;
                originalTable.parentNode.insertBefore(newListContainer, originalTable.nextSibling);
            }

            this.bindTooltipEvents(newListContainer);

            const bottomControls = listWrap.querySelector(`.${this.CUSTOM_CLASSES.BOTTOM_CONTROLS}`) || this.createBottomControls(listWrap);
            if (bottomControls && bottomControls.parentElement !== listWrap) {
                listWrap.appendChild(bottomControls);
            }
            this.enhanceBottomControls(bottomControls);
            this.enhanceOriginalSearchForms(listWrap);

            this.applyForceRefreshPagination(listWrap);

            const state = this.createListState(listWrap, originalTable, originalTbody, newListContainer);
            this.LIST_STATE_MAP.set(listWrap, state);
            this.hydrateExistingListItems(state);
            this.attachOriginalTbodyObserver(state);
            this.scheduleListSync(state, reason, { rebuildAll: true });
            this.recordDiagnostic('ui.listState.created');
            return state;
        },

        ensureKnownListRuntimes(root = document, reason = 'ensure-known') {
            this.collectOwnedListWraps(root).forEach((listWrap) => this.ensureListRuntime(listWrap, reason));
        },

        ensureListRuntimesFromCandidates(candidates, reason = 'ensure-candidates') {
            if (!candidates || typeof candidates[Symbol.iterator] !== 'function') return [];
            const seen = new Set();
            const resolved = [];
            Array.from(candidates).forEach((candidate) => {
                const listWrap = this.resolveOwnedListWrap(candidate);
                if (!(listWrap instanceof HTMLElement) || seen.has(listWrap)) return;
                seen.add(listWrap);
                resolved.push(listWrap);
                this.ensureListRuntime(listWrap, reason);
            });
            return resolved;
        },

        subscribeListRuntimeUpdates() {
            if (typeof this._listMutationUnsubscribe === 'function') return;

            const runtimeCoordinator = this.getRuntimeCoordinator();
            if (runtimeCoordinator && typeof runtimeCoordinator.subscribeMutations === 'function') {
                this._listMutationUnsubscribe = runtimeCoordinator.subscribeMutations('ui-list-runtime', (payload) => {
                    const candidates = payload.collectMatches([
                        this.SELECTORS.LIST_WRAP,
                        this.SELECTORS.ORIGINAL_TABLE,
                        this.SELECTORS.ORIGINAL_TBODY,
                        this.SELECTORS.ORIGINAL_POST_ITEM
                    ], { includeRoots: true });
                    if (candidates.length === 0) return;

                    this.ensureListRuntimesFromCandidates(candidates, 'mutation-bus');
                });
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
            const pathname = window.location.pathname || '';
            const boardPath = `/board/${pageName}`;
            return pathname.endsWith(boardPath) || pathname.includes(`${boardPath}/`);
        },

        isListPage() {
            return this.isBoardPage('lists');
        },

        isViewPage() {
            return this.isBoardPage('view');
        },

        isWritePage() {
            return this.isBoardPage('write');
        },

        shouldEnsureListRuntimeForReveal() {
            return this.isListPage();
        },

        updateInitialRevealDebug(_state, _meta = {}) {
        },

        updatePostRevealRecoveryDebug(_state, _meta = {}) {
        },

        evaluateListInitialRevealState(listWrap) {
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

            if (!(recommendBox instanceof HTMLElement)) {
                return {
                    ready: false,
                    reason: 'waiting-view',
                    detail: {
                        phase: 'post-reveal',
                        hasViewWrap: true,
                        hasViewBottom: viewBottom instanceof HTMLElement,
                        hasRecommendBox: false,
                        hasBottomListSignal,
                        embeddedListCount: embeddedListWraps.length,
                        revealTheme: 'view'
                    }
                };
            }

            if (!(viewBottom instanceof HTMLElement)) {
                return {
                    ready: false,
                    reason: 'waiting-view',
                    detail: {
                        phase: 'post-reveal',
                        hasViewWrap: true,
                        hasViewBottom: false,
                        hasRecommendBox: true,
                        hasBottomListSignal,
                        embeddedListCount: embeddedListWraps.length,
                        revealTheme: 'view'
                    }
                };
            }

            if (commentSignal instanceof HTMLElement && !(commentBox instanceof HTMLElement) && !(commentWriteBox instanceof HTMLElement)) {
                return {
                    ready: false,
                    reason: 'waiting-comments',
                    detail: {
                        phase: 'post-reveal',
                        hasViewWrap: true,
                        hasViewBottom: true,
                        hasRecommendBox: true,
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
                        hasViewBottom: true,
                        hasRecommendBox: true,
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
                            hasViewBottom: true,
                            hasRecommendBox: true,
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
                        hasViewBottom: true,
                        hasRecommendBox: true,
                        hasBottomListSignal,
                        embeddedListCount: embeddedListWraps.length,
                        missingThemeBridge: true,
                        revealTheme: 'view'
                    }
                };
            }

            const verifyResult = themeBridge.verify(document, { mode: 'full' });
            if (!verifyResult?.ready) {
                return {
                    ready: false,
                    reason: verifyResult?.reason === 'waiting-comments'
                        ? 'waiting-comments'
                        : (verifyResult?.reason === 'waiting-view' ? 'waiting-view' : 'waiting-style'),
                    detail: {
                        phase: 'post-reveal',
                        hasViewWrap: true,
                        hasViewBottom: true,
                        hasRecommendBox: true,
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
                    hasViewBottom: true,
                    hasRecommendBox: true,
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
                    '#focus_cmt'
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

        waitForInitialRevealReady(timeoutMs = 4000) {
            return new Promise((resolve) => {
                this.ensureBootUi('initial-reveal:start');
                this._initialRevealStartedAt = Date.now();
                if (this.shouldEnsureListRuntimeForReveal()) {
                    this.ensureKnownListRuntimes(document, 'initial-reveal:start');
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

                const checkReady = (reason = 'check', candidates = null) => {
                    try {
                        this.ensureBootUi(`initial-reveal:${reason}`);
                        if (this.shouldEnsureListRuntimeForReveal()) {
                            if (candidates && typeof candidates[Symbol.iterator] === 'function') {
                                this.ensureListRuntimesFromCandidates(candidates, `initial-reveal:${reason}`);
                            } else {
                                this.ensureKnownListRuntimes(document, `initial-reveal:${reason}`);
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
                        maybeRefreshStyle(lastState, reason);
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

        waitForInitialUiReady(timeoutMs = 4000) {
            return this.waitForInitialRevealReady(timeoutMs);
        },

        startPostRevealRecoveryWatch(context = {}) {
            if (!this.isViewPage()) return 'not-view';
            if (typeof this._postRevealRecoveryStop === 'function') {
                this._postRevealRecoveryStop('restart');
            }

            const startedAt = new Date().toISOString();
            const startedTime = Date.now();
            let active = true;
            let lastState = this.evaluateViewPostRevealRecoveryState();
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
                this.ensureKnownListRuntimes(document, `post-reveal:${reason}`);

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
                    cleanup('timeout');
                    return;
                }

                try {
                    if (candidates && typeof candidates[Symbol.iterator] === 'function') {
                        this.ensureListRuntimesFromCandidates(candidates, `post-reveal:${reason}`);
                    } else {
                        this.ensureKnownListRuntimes(document, `post-reveal:${reason}`);
                    }
                } catch (error) {
                    console.warn('[DC Filter+UI] Post-reveal list runtime ensure failed:', error);
                }
                runFilteredCommentRepair(reason);

                lastState = this.evaluateViewPostRevealRecoveryState();
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
                    contentEl.querySelectorAll('*').forEach(el => {
                        // [v2.7.0.1 추가] 이미 스케일링된 요소는 중복 처리 방지
                        if (el.closest('.comment_box, .img_comment, #focus_cmt')) return;

                        if (el.dataset.scaledByFilter) return;
                        el.dataset.scaledByFilter = '1';

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
                    });
                }
            }

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // [2] 댓글 글자크기 배율 스케일링
            //     대상: .comment_box .usertxt
            //           .img_comment .usertxt (이미지 댓글)
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // ??/????? ???? ??? ?? normalize ??? ?????.
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

            const signature = [
                frame.id,
                frame.name,
                frame.title,
                frame.className,
                frame.getAttribute('src') || ''
            ].join(' ');

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
                .writing_view_box iframe[src*="tivan.naver.com"] {
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

        transformWritePage() {
            if (document.body.classList.contains('is-write-page')) return;
            document.body.classList.add('is-write-page');

            const writeBox = document.querySelector('.write_box');
            if (writeBox) {
                const topTable = writeBox.querySelector('.w_top');
                if (topTable) {
                    const userInfoRow = topTable.querySelector('tr:nth-child(2)');
                    if (userInfoRow) {
                        userInfoRow.classList.add('user_info_box');
                        userInfoRow.querySelectorAll('td').forEach(td => td.classList.add('user_info_input'));
                    }
                }
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

            if (removeWritePageAds()) return;

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
        },
        async init() {
            if (isUiInitialized) return 'already-ready';
            isUiInitialized = true;


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


            if (this.isWritePage()) {
                this.transformWritePage();
                return 'non-list';
            } else if (this.isViewPage()) {
                const viewBottomContainer = document.querySelector('.view_bottom');
                if (viewBottomContainer) {
                    this.applyForceRefreshPagination(viewBottomContainer);
                }
                this.ensureArticleNativeAdBlocker();
                // [v2.6.8] 본문 + 댓글 글자크기 배율 스케일링 (통합)
                this.scaleAllFontSizes();
            }

            this.ensureKnownListRuntimes(document, 'init');
            this.subscribeListRuntimeUpdates();

            if (this.isListPage()) return 'list-runtime-ready';
            return 'non-list';
        }
    };

    if (UIModule.isViewPage()) {
        try {
            UIModule.ensureArticleNativeAdBlocker();
        } catch (error) {
            console.warn('[DC Filter+UI] Article ad blocker early install failed:', error);
        }
    }


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
                postRevealRecoveryActive: typeof UIModule._postRevealRecoveryStop === 'function'
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
    GM_registerMenuCommand('글댓합 설정하기', FilterModule.showSettings.bind(FilterModule));
    GM_registerMenuCommand('차단 유저 관리', PersonalBlockModule.createManagementPanel.bind(PersonalBlockModule));


    // [신규] 단축키 설정을 다시 로드하는 전용 함수
    async function reloadShortcutKey() {
        const shortcutString = await GM_getValue(FilterModule.CONSTANTS.STORAGE_KEYS.SHORTCUT_KEY, 'Shift+S');
        activeShortcutObject = FilterModule.parseShortcutString(shortcutString);
    }

    async function awaitInitialCommentStabilization() {
        const waiter = window.__dcufAwaitInitialCommentStabilization;
        const prepareInitialCommentReveal = (state) => {
            const normalizedState = state && typeof state === 'object' ? state : { reason: 'unknown' };
            const prepare = window.__dcufPrepareInitialCommentReveal;
            if (typeof prepare !== 'function') return normalizedState;
            try {
                return {
                    ...normalizedState,
                    prepareState: prepare(normalizedState)
                };
            } catch (error) {
                return {
                    ...normalizedState,
                    prepareError: error?.message || 'unknown'
                };
            }
        };

        if (typeof waiter !== 'function') return prepareInitialCommentReveal({ reason: 'unavailable' });

        try {
            const state = await Promise.race([
                Promise.resolve().then(() => waiter()),
                new Promise((resolve) => {
                    window.setTimeout(() => resolve({ reason: 'ui-timeout' }), 650);
                })
            ]);
            return prepareInitialCommentReveal(state);
        } catch (error) {
            return prepareInitialCommentReveal({ reason: `error:${error?.message || 'unknown'}` });
        }
    }

    function prepareInitialCommentRevealBeforeMark(state = null) {
        const prepare = window.__dcufPrepareInitialCommentReveal;
        if (typeof prepare !== 'function') return null;
        try {
            return prepare({
                reason: 'before-mark-ui-ready',
                previous: state?.commentInitState?.reason || ''
            });
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
        console.log("[DC Filter+UI] Initializing v__VERSION__...");


        // [수정] main 함수에서 reloadShortcutKey 함수를 호출하여 초기화
        await reloadShortcutKey();


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


        await FilterModule.init();
        await PersonalBlockModule.init();
        const uiInitState = await UIModule.init();
        // Mobile comment reply-merge cleanup can rerender blocked comment rows
        // once more after Filter/UI init. Keep the initial body lock until that first
        // stabilization window finishes so personally blocked comments do not flash visible.
        const commentInitState = await awaitInitialCommentStabilization();
        const initState = { uiInitState, commentInitState };
        console.log(`[DC Filter+UI] Initialization complete. ui=${uiInitState} comment=${commentInitState?.reason || 'unknown'}`);
        return initState;
    }


    const runSafely = async () => {
        let initState = {
            uiInitState: 'fallback',
            commentInitState: { reason: 'not-started' }
        };
        let revealState = 'error';

        try {
            const mainState = await main();
            if (mainState && typeof mainState === 'object') initState = mainState;
            if (typeof UIModule?.waitForInitialRevealReady === 'function') {
                revealState = await UIModule.waitForInitialRevealReady();
            }
        } catch (error) {
            initState = {
                ...initState,
                uiInitState: 'error'
            };
            revealState = 'error';
            console.error("[DC Filter+UI] A critical error occurred during main execution:", error);
        } finally {
            // [v2.2.2 수정] 모든 UI 처리 및 필터링 적용이 끝난 후,
            // 루트 준비 완료 클래스를 추가하여 화면을 표시합니다.
            initState.commentPrepareState = prepareInitialCommentRevealBeforeMark(initState);
            markUiReady();
            if (typeof UIModule?.startPostRevealRecoveryWatch === 'function') {
                UIModule.startPostRevealRecoveryWatch({ revealState });
            }
            console.log(`[DC Filter+UI] UI is now visible. ui=${initState.uiInitState} comment=${initState.commentInitState?.reason || 'unknown'} reveal=${revealState}`);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runSafely);
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
            if (darkModeStylesheet) {
                body.classList.add('dc-filter-dark-mode');
                if (root) root.classList.add('dc-filter-dark-mode');
            } else {
                body.classList.remove('dc-filter-dark-mode');
                if (root) root.classList.remove('dc-filter-dark-mode');
            }

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

