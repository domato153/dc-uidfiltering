    const __dcufPersonalBlockHostAdapter = (() => {
        const markOwnedSurface = (element, surface, role = 'panel', state = 'open') => {
            element.setAttribute('data-dcuf-surface', surface);
            element.setAttribute('data-dcuf-role', role);
            element.setAttribute('data-dcuf-state', state);
            element.setAttribute('data-dcuf-presentation', __dcufSettingsPresenter.VERSION);
            return element;
        };
        const legacyMethods = {
        markSelectionTargets() {
            legacyMethods.restoreSelectionTargets.call(this);
            this._selectionTargetMarkers = Array.from(document.querySelectorAll('.gall_writer, .ub-writer')).map((element) => ({
                element,
                surface: element.getAttribute('data-dcuf-surface'),
                role: element.getAttribute('data-dcuf-role'),
                state: element.getAttribute('data-dcuf-state'),
            }));
            this._selectionTargetMarkers.forEach(({ element }) => {
                element.setAttribute('data-dcuf-surface', 'personal-selection-target');
                element.setAttribute('data-dcuf-role', 'writer');
                element.setAttribute('data-dcuf-state', 'active');
            });
        },

        restoreSelectionTargets() {
            for (const marker of this._selectionTargetMarkers || []) {
                const { element } = marker;
                if (element.getAttribute('data-dcuf-surface') !== 'personal-selection-target') continue;
                for (const [attribute, value] of [
                    ['data-dcuf-surface', marker.surface],
                    ['data-dcuf-role', marker.role],
                    ['data-dcuf-state', marker.state],
                ]) {
                    if (value === null) element.removeAttribute(attribute);
                    else element.setAttribute(attribute, value);
                }
            }
            this._selectionTargetMarkers = [];
        },

        clampFabPosition() {
            const controls = document.getElementById('dc-personal-block-controls');
            if (!controls) return;
            const currentLeft = Number.parseFloat(controls.style.left);
            const currentTop = Number.parseFloat(controls.style.top);
            if (!Number.isFinite(currentLeft) || !Number.isFinite(currentTop)) return;
            const maxX = Math.max(0, window.innerWidth - controls.offsetWidth);
            const maxY = Math.max(0, window.innerHeight - controls.offsetHeight);
            controls.style.left = `${Math.round(Math.max(0, Math.min(currentLeft, maxX)))}px`;
            controls.style.top = `${Math.round(Math.max(0, Math.min(currentTop, maxY)))}px`;
        },

        applyFabScalePercent(value, { clamp = true } = {}) {
            const normalized = this.normalizeFabScalePercent(value);
            this.fabScalePercent = normalized;
            const controls = document.getElementById('dc-personal-block-controls');
            if (!controls) return normalized;
            const ratio = normalized / 100;
            const scaledValue = (base) => `${Number((base * ratio).toFixed(2))}px`;
            controls.style.setProperty('--dcuf-fab-width', scaledValue(152));
            controls.style.setProperty('--dcuf-fab-height', scaledValue(76));
            controls.style.setProperty('--dcuf-fab-padding-x', scaledValue(28));
            controls.style.setProperty('--dcuf-fab-font-size', scaledValue(32));
            this.closeFabDrawer();
            if (clamp) this.clampFabPosition();
            return normalized;
        },

        async showFabScalePanel() {
            window.__dcufEnsureFilterUiStyles?.();
            document.getElementById('dc-personal-block-size-overlay')?.remove();
            const savedPercent = await this.loadFabScalePercent();
            this.applyFabScalePercent(savedPercent);
            if (this.isFabSupportedPage()) this.createFab();

            const overlay = document.createElement('div');
            overlay.id = 'dc-personal-block-size-overlay';
            const panel = document.createElement('div');
            panel.id = 'dc-personal-block-size-panel';
            panel.setAttribute('role', 'dialog');
            panel.setAttribute('aria-modal', 'true');
            panel.setAttribute('aria-labelledby', 'dc-personal-block-size-title');
            panel.innerHTML = `
                <h3 id="dc-personal-block-size-title">메뉴 버튼 크기 조절</h3>
                <p class="dcuf-fab-size-description">버튼과 글자 크기가 같은 비율로 조절됩니다.</p>
                <output class="dcuf-fab-size-value" for="dc-personal-block-size-range">${savedPercent}%</output>
                <input id="dc-personal-block-size-range" type="range" min="${this.FAB_SCALE_MIN}" max="${this.FAB_SCALE_MAX}" step="5" value="${savedPercent}" aria-label="메뉴 버튼 크기 비율">
                <div class="dcuf-fab-size-bounds"><span>${this.FAB_SCALE_MIN}%</span><span>${this.FAB_SCALE_MAX}%</span></div>
                <div class="dcuf-fab-size-actions">
                    <button type="button" data-dcuf-fab-size-action="reset">기본값</button>
                    <button type="button" data-dcuf-fab-size-action="cancel">취소</button>
                    <button type="button" data-dcuf-fab-size-action="save">저장</button>
                </div>
            `;
            markOwnedSurface(overlay, 'personal-size', 'overlay');
            markOwnedSurface(panel, 'personal-size');
            panel.innerHTML = __dcufSettingsPresenter.renderFabScalePanel({ value: savedPercent, min: this.FAB_SCALE_MIN, max: this.FAB_SCALE_MAX });
            overlay.appendChild(panel);
            document.body.appendChild(overlay);

            const range = panel.querySelector('#dc-personal-block-size-range');
            const valueOutput = panel.querySelector('.dcuf-fab-size-value');
            const closePanel = (restoreSaved) => {
                if (restoreSaved) this.applyFabScalePercent(savedPercent);
                document.removeEventListener('keydown', handleKeydown, true);
                overlay.remove();
            };
            const handleKeydown = (event) => {
                if (event.key !== 'Escape') return;
                event.preventDefault();
                closePanel(true);
            };

            range.addEventListener('input', () => {
                const nextPercent = this.applyFabScalePercent(range.value);
                valueOutput.textContent = `${nextPercent}%`;
            });
            panel.querySelector('[data-dcuf-fab-size-action="reset"]').addEventListener('click', () => {
                range.value = '100';
                range.dispatchEvent(new Event('input', { bubbles: true }));
            });
            panel.querySelector('[data-dcuf-fab-size-action="cancel"]').addEventListener('click', () => closePanel(true));
            panel.querySelector('[data-dcuf-fab-size-action="save"]').addEventListener('click', async () => {
                const nextPercent = this.applyFabScalePercent(range.value);
                await this.saveFabScalePercent(nextPercent);
                closePanel(false);
            });
            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) closePanel(true);
            });
            document.addEventListener('keydown', handleKeydown, true);
            range.focus();
        },


        async createManualBlockPanel({ initialType = 'nickname', onAdded = null } = {}) {
            window.__dcufEnsureFilterUiStyles?.();
            const existingPanel = document.getElementById('dc-manual-block-panel');
            if (existingPanel) {
                existingPanel.querySelector('#dc-manual-block-value')?.focus();
                return existingPanel;
            }

            const typeConfig = {
                uid: { label: '식별번호', placeholder: '예: user1234', hint: '입력한 식별번호와 정확히 일치하는 작성자를 차단합니다.' },
                nickname: { label: '닉네임', placeholder: '차단할 닉네임을 입력하세요', hint: '대소문자와 공백을 포함해 정확히 같은 닉네임만 차단합니다.' },
                ip: { label: '아이피', placeholder: '예: 123.45 또는 화면에 표시된 IP', hint: '화면에 표시되는 IP 문자열과 정확히 일치할 때만 차단합니다.' }
            };
            let activeType = typeConfig[initialType] ? initialType : 'nickname';

            const overlay = document.createElement('div');
            overlay.id = 'dc-manual-block-overlay';
            const panel = document.createElement('section');
            panel.id = 'dc-manual-block-panel';
            panel.setAttribute('role', 'dialog');
            panel.setAttribute('aria-modal', 'true');
            panel.setAttribute('aria-labelledby', 'dc-manual-block-title');
            panel.innerHTML = `
                <div class="dcuf-manual-header">
                    <div>
                        <span class="dcuf-manual-kicker">PERSONAL BLOCK</span>
                        <h3 id="dc-manual-block-title">직접 차단</h3>
                    </div>
                    <button type="button" class="dcuf-manual-close" aria-label="직접 차단 닫기">×</button>
                </div>
                <form class="dcuf-manual-form">
                    <div class="dcuf-manual-type-tabs" role="group" aria-label="차단 정보 종류">
                        <button type="button" data-manual-block-type="uid">식별번호</button>
                        <button type="button" data-manual-block-type="nickname">닉네임</button>
                        <button type="button" data-manual-block-type="ip">아이피</button>
                    </div>
                    <label class="dcuf-manual-field" for="dc-manual-block-value">
                        <span id="dc-manual-block-value-label">닉네임</span>
                        <input id="dc-manual-block-value" type="text" autocomplete="off" autocapitalize="off" spellcheck="false">
                    </label>
                    <label class="dcuf-manual-field dcuf-manual-display-field" for="dc-manual-block-display" hidden>
                        <span>닉네임 / 표시 이름 <small>(선택)</small></span>
                        <input id="dc-manual-block-display" type="text" autocomplete="off" spellcheck="false" placeholder="예: 홍길동">
                    </label>
                    <p class="dcuf-manual-hint"></p>
                    <p class="dcuf-manual-status" role="status" aria-live="polite"></p>
                    <div class="dcuf-manual-actions">
                        <button type="button" data-manual-block-action="close">닫기</button>
                        <button type="submit" data-manual-block-action="add">차단 추가</button>
                    </div>
                </form>
            `;
            markOwnedSurface(overlay, 'personal-manual', 'overlay');
            markOwnedSurface(panel, 'personal-manual');
            panel.innerHTML = __dcufSettingsPresenter.renderManualBlockPanel();
            overlay.appendChild(panel);
            document.body.appendChild(overlay);

            const form = panel.querySelector('.dcuf-manual-form');
            const valueInput = panel.querySelector('#dc-manual-block-value');
            const displayField = panel.querySelector('.dcuf-manual-display-field');
            const displayInput = panel.querySelector('#dc-manual-block-display');
            const valueLabel = panel.querySelector('#dc-manual-block-value-label');
            const hint = panel.querySelector('.dcuf-manual-hint');
            const status = panel.querySelector('.dcuf-manual-status');
            const addButton = panel.querySelector('[data-manual-block-action="add"]');
            let isClosing = false;

            const setStatus = (message = '', state = '') => {
                status.textContent = message;
                status.dataset.state = state;
            };
            const selectType = (type) => {
                if (!typeConfig[type]) return;
                activeType = type;
                panel.querySelectorAll('[data-manual-block-type]').forEach((button) => {
                    button.setAttribute('aria-pressed', String(button.dataset.manualBlockType === type));
                });
                valueLabel.textContent = typeConfig[type].label;
                valueInput.placeholder = typeConfig[type].placeholder;
                hint.textContent = typeConfig[type].hint;
                displayField.hidden = type !== 'uid';
                setStatus();
                valueInput.focus();
            };
            const closePanel = () => {
                if (isClosing) return;
                isClosing = true;
                document.removeEventListener('keydown', handleKeydown, true);
                panel.classList.add('dcuf-pop-leave');
                overlay.classList.add('dcuf-overlay-leave');
                window.setTimeout(() => overlay.remove(), 210);
            };
            const handleKeydown = (event) => {
                if (event.key !== 'Escape') return;
                event.preventDefault();
                closePanel();
            };

            panel.querySelectorAll('[data-manual-block-type]').forEach((button) => {
                button.addEventListener('click', () => selectType(button.dataset.manualBlockType));
            });
            panel.querySelector('.dcuf-manual-close').addEventListener('click', closePanel);
            panel.querySelector('[data-manual-block-action="close"]').addEventListener('click', closePanel);
            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) closePanel();
            });
            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                const value = valueInput.value.trim();
                const displayValue = displayInput.value.trim();
                if (!value) {
                    setStatus(`${typeConfig[activeType].label}을(를) 입력해주세요.`, 'error');
                    valueInput.focus();
                    return;
                }

                const currentList = await this.loadPersonalBlocks();
                const isDuplicate = activeType === 'uid'
                    ? currentList.uids.some((item) => item?.id === value)
                    : activeType === 'nickname'
                        ? currentList.nicknames.includes(value)
                        : currentList.ips.includes(value);
                if (isDuplicate) {
                    setStatus('이미 차단 목록에 있는 값입니다.', 'info');
                    valueInput.select();
                    return;
                }

                addButton.disabled = true;
                addButton.textContent = '추가 중…';
                try {
                    const displayName = activeType === 'uid' && displayValue ? `${displayValue}(${value})` : null;
                    await this.addBlock(activeType, value, displayName);
                    if (typeof onAdded === 'function') await onAdded({ type: activeType, value });
                    const isEnabled = await this.getPersonalBlockEnabled();
                    setStatus(
                        isEnabled ? `${typeConfig[activeType].label} 차단을 추가했습니다.` : '목록에 추가했습니다. 개인 차단 기능은 현재 꺼져 있습니다.',
                        'success'
                    );
                    valueInput.value = '';
                    if (activeType === 'uid') displayInput.value = '';
                    valueInput.focus();
                } catch (error) {
                    console.error('[DCUF] 직접 차단 추가 실패:', error);
                    setStatus('차단을 추가하지 못했습니다. 잠시 후 다시 시도해주세요.', 'error');
                } finally {
                    addButton.disabled = false;
                    addButton.textContent = '차단 추가';
                }
            });
            document.addEventListener('keydown', handleKeydown, true);
            selectType(activeType);
            return panel;
        },

        isFabSupportedPage() {
            const currentPath = window.location.pathname;
            return currentPath.includes('/board/lists') || currentPath.includes('/board/view');
        },

        closeFabDrawer() {
            const fab = document.getElementById('dc-personal-block-fab');
            const drawer = document.getElementById('dc-personal-block-drawer');
            if (!fab || !drawer) return;
            drawer.hidden = true;
            fab.setAttribute('aria-expanded', 'false');
        },

        positionFabDrawer() {
            const controls = document.getElementById('dc-personal-block-controls');
            const drawer = document.getElementById('dc-personal-block-drawer');
            if (!controls || !drawer || drawer.hidden) return;

            const viewportGap = 8;
            const drawerGap = 8;
            const controlsRect = controls.getBoundingClientRect();
            const drawerRect = drawer.getBoundingClientRect();
            const maxLeft = Math.max(viewportGap, window.innerWidth - drawerRect.width - viewportGap);
            const left = Math.max(viewportGap, Math.min(controlsRect.right - drawerRect.width, maxLeft));
            let top = controlsRect.top - drawerRect.height - drawerGap;

            if (top < viewportGap) {
                top = Math.min(
                    controlsRect.bottom + drawerGap,
                    Math.max(viewportGap, window.innerHeight - drawerRect.height - viewportGap)
                );
            }

            drawer.style.left = `${Math.round(left - controlsRect.left)}px`;
            drawer.style.top = `${Math.round(top - controlsRect.top)}px`;
        },

        toggleFabDrawer() {
            const fab = document.getElementById('dc-personal-block-fab');
            const drawer = document.getElementById('dc-personal-block-drawer');
            if (!fab || !drawer) return;
            const willOpen = drawer.hidden;
            if (willOpen) window.__dcufEnsureFilterUiStyles?.();
            drawer.hidden = !willOpen;
            fab.setAttribute('aria-expanded', String(willOpen));
            if (willOpen) this.positionFabDrawer();
        },

        resetFabPosition() {
            if (!this.isFabSupportedPage()) {
                alert('플로팅 메뉴는 글 목록과 본문 페이지에서만 표시됩니다.');
                return false;
            }

            const controls = this.createFab();
            if (!controls) return false;
            this.closeFabDrawer();
            Object.assign(controls.style, {
                left: 'auto',
                top: 'auto',
                right: '20px',
                bottom: '20px'
            });
            return true;
        },

        createFab() {
            if (!this.isFabSupportedPage() || !document.body) return null;

            const existingControls = document.getElementById('dc-personal-block-controls');
            const existingFab = document.getElementById('dc-personal-block-fab');
            const existingDrawer = document.getElementById('dc-personal-block-drawer');
            if (existingControls && existingFab && existingDrawer && existingControls.contains(existingFab) && existingControls.contains(existingDrawer)) {
                return existingControls;
            }
            existingControls?.remove();
            existingFab?.remove();
            existingDrawer?.remove();

            const controls = document.createElement('div');
            controls.id = 'dc-personal-block-controls';
            markOwnedSurface(controls, 'personal-menu', 'controls');
            Object.assign(controls.style, { left: 'auto', top: 'auto', right: '20px', bottom: '20px' });

            const fab = document.createElement('button');
            fab.id = 'dc-personal-block-fab';
            fab.className = 'dcuf-fab-button';
            fab.type = 'button';
            fab.textContent = '메뉴';
            fab.setAttribute('aria-expanded', 'false');
            fab.setAttribute('aria-controls', 'dc-personal-block-drawer');
            fab.setAttribute('aria-label', 'DC 유저 필터 메뉴');

            const drawer = document.createElement('div');
            drawer.id = 'dc-personal-block-drawer';
            drawer.className = 'dcuf-menu-drawer';
            drawer.hidden = true;
            drawer.setAttribute('role', 'menu');
            drawer.setAttribute('aria-label', 'DC 유저 필터 기능');
            drawer.innerHTML = `
                <button type="button" role="menuitem" data-dcuf-fab-action="quick-block"><span class="dcuf-menu-icon" aria-hidden="true">◎</span><span><strong>화면에서 간편차단</strong><small>글·댓글 작성자를 눌러 선택</small></span></button>
                <button type="button" role="menuitem" data-dcuf-fab-action="manual-block"><span class="dcuf-menu-icon" aria-hidden="true">＋</span><span><strong>직접 차단</strong><small>닉네임·식별번호·IP 입력</small></span></button>
                <button type="button" role="menuitem" data-dcuf-fab-action="filter-settings"><span class="dcuf-menu-icon" aria-hidden="true">◫</span><span><strong>글댓합 설정</strong><small>필터 기준과 범위 조정</small></span></button>
                <button type="button" role="menuitem" data-dcuf-fab-action="block-management"><span class="dcuf-menu-icon" aria-hidden="true">☰</span><span><strong>차단 유저 관리</strong><small>목록 확인·삭제·백업</small></span></button>
            `;
            drawer.querySelectorAll('button').forEach((button) => button.classList.add('dcuf-menu-item'));

            controls.append(fab, drawer);
            document.body.appendChild(controls);
            this.applyFabScalePercent(this.fabScalePercent, { clamp: false });

            let activePointerId = null;
            let offsetX = 0;
            let offsetY = 0;
            let startX = 0;
            let startY = 0;
            let wasDragged = false;
            let suppressClick = false;
            let dragWidth = 0;
            let dragHeight = 0;
            let dragRafId = 0;
            let pendingDragX = null;
            let pendingDragY = null;

            const applyFabDragPosition = () => {
                dragRafId = 0;
                if (activePointerId === null || pendingDragX === null || pendingDragY === null) return;
                const nextX = Math.max(0, Math.min(pendingDragX - offsetX, window.innerWidth - dragWidth));
                const nextY = Math.max(0, Math.min(pendingDragY - offsetY, window.innerHeight - dragHeight));
                pendingDragX = null;
                pendingDragY = null;
                Object.assign(controls.style, {
                    left: `${Math.round(nextX)}px`,
                    top: `${Math.round(nextY)}px`,
                    right: 'auto',
                    bottom: 'auto'
                });
            };

            fab.addEventListener('pointerdown', (event) => {
                if (event.button !== 0 || activePointerId !== null) return;
                const rect = controls.getBoundingClientRect();
                activePointerId = event.pointerId;
                offsetX = event.clientX - rect.left;
                offsetY = event.clientY - rect.top;
                dragWidth = rect.width;
                dragHeight = rect.height;
                startX = event.clientX;
                startY = event.clientY;
                wasDragged = false;
                fab.setPointerCapture?.(event.pointerId);
            });

            fab.addEventListener('pointermove', (event) => {
                if (event.pointerId !== activePointerId) return;
                if (!wasDragged && Math.hypot(event.clientX - startX, event.clientY - startY) < 5) return;
                if (!wasDragged) this.closeFabDrawer();
                wasDragged = true;
                event.preventDefault();
                pendingDragX = event.clientX;
                pendingDragY = event.clientY;
                if (!dragRafId) dragRafId = requestAnimationFrame(applyFabDragPosition);
            });

            const finishDrag = (event) => {
                if (event.pointerId !== activePointerId) return;
                if (dragRafId) cancelAnimationFrame(dragRafId);
                applyFabDragPosition();
                suppressClick = wasDragged;
                activePointerId = null;
                fab.releasePointerCapture?.(event.pointerId);
            };
            fab.addEventListener('pointerup', finishDrag);
            fab.addEventListener('pointercancel', finishDrag);

            fab.addEventListener('click', () => {
                if (suppressClick) {
                    suppressClick = false;
                    return;
                }
                this.toggleFabDrawer();
            });

            drawer.addEventListener('click', async (event) => {
                const actionButton = event.target.closest('[data-dcuf-fab-action]');
                if (!actionButton || !drawer.contains(actionButton)) return;
                const action = actionButton.dataset.dcufFabAction;
                this.closeFabDrawer();
                if (action === 'quick-block') this.enterSelectionMode();
                else if (action === 'manual-block') await this.createManualBlockPanel();
                else if (action === 'filter-settings') await FilterModule.showSettings();
                else if (action === 'block-management') await this.createManagementPanel();
            });

            if (!this._fabGlobalHandlersBound) {
                document.addEventListener('click', (event) => {
                    const currentControls = document.getElementById('dc-personal-block-controls');
                    if (currentControls && !currentControls.contains(event.target)) this.closeFabDrawer();
                });
                document.addEventListener('keydown', (event) => {
                    if (event.key === 'Escape') this.closeFabDrawer();
                });
                window.addEventListener('resize', () => {
                    this.clampFabPosition();
                    if (!document.getElementById('dc-personal-block-drawer')?.hidden) this.positionFabDrawer();
                });
                this._fabGlobalHandlersBound = true;
            }

            return controls;
        },

        enterSelectionMode() {
            if (this.isSelectionMode) return;
            window.__dcufEnsureFilterUiStyles?.();
            this.isSelectionMode = true;
            document.body.classList.add('selection-mode-active');
            legacyMethods.markSelectionTargets.call(this);


            const popup = document.createElement('div');
            popup.id = 'dc-selection-popup';
            popup.className = 'dcuf-selection-prompt';
            markOwnedSurface(popup, 'personal-selection', 'status');
            popup.innerHTML = `
                <div class="dcuf-selection-prompt-icon" aria-hidden="true">◎</div>
                <div class="dcuf-selection-prompt-copy">
                    <h4>차단할 작성자를 선택하세요</h4>
                    <p>글이나 댓글의 닉네임을 눌러주세요.</p>
                </div>
                <div class="popup-buttons">
                    <button class="cancel-btn">선택 취소</button>
                </div>
            `;
            popup.querySelectorAll('button').forEach((button) => button.classList.add('dcuf-button', 'dcuf-button--secondary'));
            popup.querySelector('.popup-buttons')?.classList.add('dcuf-popup-actions');
            document.body.appendChild(popup);

            popup.querySelector('.cancel-btn').onclick = () => this.exitSelectionMode();
        },


        exitSelectionMode() {
            if (!this.isSelectionMode) return;
            this.isSelectionMode = false;
            document.body.classList.remove('selection-mode-active');
            legacyMethods.restoreSelectionTargets.call(this);
            const popup = document.getElementById('dc-selection-popup');
            if (popup) {
                popup.classList.add('dcuf-pop-leave');
                window.setTimeout(() => popup.remove(), 120);
            }
        },


        handleSelectionClick(e) {
            if (!this.isSelectionMode) return;
            const popup = document.getElementById('dc-selection-popup');
            if (popup && popup.contains(e.target)) return;


            const writerEl = e.target.closest('.gall_writer, .ub-writer');
            if (writerEl) {
                e.preventDefault();
                e.stopPropagation();


                const nick = writerEl.getAttribute('data-nick');
                const uid = writerEl.getAttribute('data-uid');
                const ip = writerEl.getAttribute('data-ip');


                this.showSelectionPopup({ nick, uid, ip });
            }
        },


        // [v2.5.7 수정] 차단/차단 해제 버튼을 동적으로 생성
        showSelectionPopup(userInfo) {
            window.__dcufEnsureFilterUiStyles?.();
            this.exitSelectionMode();
            this.isSelectionMode = true;
            document.body.classList.add('selection-mode-active');
            legacyMethods.markSelectionTargets.call(this);

            const popup = document.createElement('div');
            popup.id = 'dc-selection-popup';
            markOwnedSurface(popup, 'personal-selection', 'panel');

            // [핵심 변경] 사용자의 차단 상태를 먼저 확인
            const blockStatus = this.checkBlockStatus(userInfo);
            let optionsHtml = '';

            // 닉네임 처리
            if (userInfo.nick) {
                if (blockStatus.isNickBlocked) {
                    optionsHtml += `<div class="block-option"><span>닉네임: ${userInfo.nick}</span><button class="btn-unblock" data-type="nickname" data-value="${userInfo.nick}">차단 해제</button></div>`;
                } else {
                    optionsHtml += `<div class="block-option"><span>닉네임: ${userInfo.nick}</span><button data-type="nickname" data-value="${userInfo.nick}">차단</button></div>`;
                }
            }
            // UID 처리
            if (userInfo.uid) {
                const displayName = `${userInfo.nick}(${userInfo.uid})`;
                if (blockStatus.isUidBlocked) {
                    optionsHtml += `<div class="block-option"><span>식별번호: ${displayName}</span><button class="btn-unblock" data-type="uid" data-value="${userInfo.uid}" data-display-name="${displayName}">차단 해제</button></div>`;
                } else {
                    optionsHtml += `<div class="block-option"><span>식별번호: ${displayName}</span><button data-type="uid" data-value="${userInfo.uid}" data-display-name="${displayName}">차단</button></div>`;
                }
            }
            // IP 처리
            if (userInfo.ip) {
                if (blockStatus.isIpBlocked) {
                    optionsHtml += `<div class="block-option"><span>IP: ${userInfo.ip}</span><button class="btn-unblock" data-type="ip" data-value="${userInfo.ip}">차단 해제</button></div>`;
                } else {
                    optionsHtml += `<div class="block-option"><span>IP: ${userInfo.ip}</span><button data-type="ip" data-value="${userInfo.ip}">차단</button></div>`;
                }
            }

            popup.innerHTML = `
                <h4>어떤 정보를 처리할까요?</h4>
                <div class="block-options">${optionsHtml}</div>
                <div class="popup-buttons"><button class="cancel-btn">취소</button></div>
            `;
            popup.querySelectorAll('.block-option').forEach((option) => option.classList.add('dcuf-selection-option'));
            popup.querySelectorAll('.block-option > span').forEach((copy) => copy.classList.add('dcuf-selection-copy'));
            popup.querySelectorAll('.block-options button').forEach((button) => button.classList.add('dcuf-button', button.classList.contains('btn-unblock') ? 'dcuf-button--danger' : 'dcuf-button--primary'));
            popup.querySelector('.cancel-btn')?.classList.add('dcuf-button', 'dcuf-button--secondary');
            popup.querySelector('.popup-buttons')?.classList.add('dcuf-popup-actions');
            document.body.appendChild(popup);

            popup.querySelector('.cancel-btn').onclick = () => this.exitSelectionMode();

            // [핵심 변경] 이벤트 핸들러 통합
            popup.querySelectorAll('.block-options button').forEach(btn => {
                btn.onclick = () => {
                    const { type, value, displayName } = btn.dataset;
                    if (btn.classList.contains('btn-unblock')) {
                        // '차단 해제' 버튼 클릭 시
                        this.removeBlock(type, value);
                    } else {
                        // '차단' 버튼 클릭 시
                        this.addBlock(type, value, displayName);
                    }
                };
            });
        },


        // [신규] 차단 목록 병합 헬퍼 함수
        mergeBlockLists(existing, imported) {
            // UIDs 병합 (중복 ID 확인)
            const existingUIDs = new Set(existing.uids.map(u => u.id));
            const mergedUIDs = [...existing.uids];
            imported.uids.forEach(importedUser => {
                if (!existingUIDs.has(importedUser.id)) {
                    mergedUIDs.push(importedUser);
                }
            });

            // Nicknames, IPs 병합 (Set을 사용하여 간단하게 중복 제거)
            const mergedNicknames = [...new Set([...existing.nicknames, ...imported.nicknames])];
            const mergedIPs = [...new Set([...existing.ips, ...imported.ips])];

            return { uids: mergedUIDs, nicknames: mergedNicknames, ips: mergedIPs };
        },

        // [신규] 백업 및 복원 팝업 생성 함수
        async createBackupPopup() {
            window.__dcufEnsureFilterUiStyles?.();
            if (document.getElementById('dc-backup-popup')) return;

            const overlay = document.createElement('div');
            overlay.id = 'dc-backup-popup-overlay';
            markOwnedSurface(overlay, 'personal-backup', 'overlay');

            const popup = document.createElement('div');
            popup.id = 'dc-backup-popup';
            popup.innerHTML = `
                <div class="popup-header">
                    <h4>차단 목록 백업/복원</h4>
                    <button class="popup-close-btn">×</button>
                </div>
                <div class="popup-content">
                    <div class="export-section">
                        <label>내보내기</label>
                        <span class="description">현재 차단 목록 전체를 파일로 저장하거나 클립보드에 복사합니다.</span>
                        <div style="display: flex; gap: 8px; margin-top: 5px;">
                            <button class="export-btn-download">파일로 다운로드</button>
                            <button class="export-btn">클립보드에 복사</button>
                        </div>
                    </div>
                    <hr style="border: 0; border-top: 1px solid #eee;">
                    <div class="import-section">
                        <label>불러오기</label>
                        <span class="description">백업 파일을 선택하거나, 아래 텍스트 영역에 직접 붙여넣으세요.</span>
                        <div class="import-controls">
                           <input type="file" class="import-file-input" accept=".json,.txt">
                           <textarea placeholder="또는, 백업 데이터를 여기에 붙여넣으세요..."></textarea>
                        </div>
                         <button class="import-btn">불러오기</button>
                    </div>
                </div>
            `;
            markOwnedSurface(popup, 'personal-backup');
            popup.innerHTML = __dcufSettingsPresenter.renderBackupPopup();

            document.body.appendChild(overlay);
            document.body.appendChild(popup);

            __dcufPopupGeometryHostAdapter.connect(popup, { minWidth: 300, minHeight: 240 });

            const textarea = popup.querySelector('textarea');
            const fileInput = popup.querySelector('.import-file-input');
            let bufferedClipboardImport = '';
            const originalTextareaPlaceholder = textarea ? (textarea.getAttribute('placeholder') || '') : '';

            const formatImportSize = (text) => {
                const size = new Blob([text]).size;
                if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)}MB`;
                if (size >= 1024) return `${(size / 1024).toFixed(1)}KB`;
                return `${size}B`;
            };

            const setBufferedImportPreview = (text) => {
                if (!textarea) return;
                textarea.value = '';
                textarea.placeholder = `클립보드 백업 데이터 붙여넣기 완료 (${formatImportSize(text)})\n불러오기 버튼을 누르면 가져옵니다.`;
                textarea.dataset.dcufBufferedImport = '1';
            };

            const clearBufferedImport = () => {
                bufferedClipboardImport = '';
                if (!textarea) return;
                textarea.placeholder = originalTextareaPlaceholder;
                delete textarea.dataset.dcufBufferedImport;
            };

            if (textarea) {
                textarea.addEventListener('paste', (e) => {
                    const pastedText = e.clipboardData?.getData('text');
                    if (typeof pastedText !== 'string' || !pastedText.length) return;

                    e.preventDefault();
                    bufferedClipboardImport = pastedText;
                    setBufferedImportPreview(pastedText);
                });

                textarea.addEventListener('input', () => {
                    if (textarea.dataset.dcufBufferedImport === '1') {
                        clearBufferedImport();
                    }
                });
            }


            const closePopup = () => {
                popup.classList.add('dcuf-pop-leave');
                overlay.classList.add('dcuf-overlay-leave');
                window.setTimeout(() => {
                    overlay.remove();
                    popup.remove();
                }, 210);
            };

            popup.querySelector('.popup-close-btn').onclick = closePopup;
            overlay.onclick = closePopup;


            // [추가] 파일로 다운로드 버튼 이벤트 핸들러
            popup.querySelector('.export-btn-download').onclick = async () => {
                const data = await this.loadPersonalBlocks();
                const jsonString = JSON.stringify(data, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = url;

                const date = new Date();
                const timestamp = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}`;
                a.download = `dc_blocklist_backup_${timestamp}.json`;

                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                alert('백업 파일 다운로드를 시작합니다.');
            };
            popup.querySelector('.export-btn').onclick = async () => {
                const data = await this.loadPersonalBlocks();
                const jsonString = JSON.stringify(data);
                try {
                    await navigator.clipboard.writeText(jsonString);
                    alert('차단 목록이 클립보드에 복사되었습니다.');
                } catch (err) {
                    alert('클립보드 복사에 실패했습니다. 콘솔을 확인해주세요.');
                    console.error('클립보드 복사 실패:', err);
                }
            };

            // [수정] 불러오기 기능 (파일/텍스트 모두 처리)

            // 공통 데이터 처리 로직을 별도 함수로 분리
            const processImportData = async (jsonString) => {
                if (!jsonString || !jsonString.trim()) {
                    alert('불러올 데이터가 없습니다.');
                    return;
                }

                let importedList;
                try {
                    importedList = JSON.parse(jsonString);
                    if (typeof importedList !== 'object' || !importedList.uids || !importedList.nicknames || !importedList.ips) {
                        throw new Error('Invalid data format');
                    }
                } catch (err) {
                    alert('데이터 형식이 올바르지 않습니다. JSON 형식이 맞는지 확인해주세요.');
                    return;
                }

                const currentList = await this.loadPersonalBlocks();
                const mergedList = this.mergeBlockLists(currentList, importedList);

                this.personalBlockListCache = mergedList;
                await this.savePersonalBlocks();
                await FilterModule.refilterAllContent();

                alert('차단 목록을 성공적으로 불러와서 추가했습니다.');
                closePopup();
                const managementPanel = document.getElementById('dc-block-management-panel');
                if (managementPanel) managementPanel.querySelector('.panel-close-btn').click();
            };

            // 불러오기 버튼 클릭 이벤트
            popup.querySelector('.import-btn').onclick = async () => {
                // 1순위: 파일이 선택되었는지 확인
                if (fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    const reader = new FileReader();

                    reader.onload = (e) => {
                        // 파일 읽기가 완료되면 데이터 처리 함수 호출
                        processImportData(e.target.result);
                    };
                    reader.onerror = () => {
                        alert('파일을 읽는 중 오류가 발생했습니다.');
                    };

                    reader.readAsText(file); // 파일 읽기 시작
                }
                // 2순위: 파일이 없다면 textarea의 값을 사용
                else {
                    const importText = textarea && textarea.dataset.dcufBufferedImport === '1'
                        ? bufferedClipboardImport
                        : (textarea ? textarea.value : '');
                    processImportData(importText);
                }
            };
        },


        // [수정] 차단 관리 패널 로직 전체 개선 (On/Off 스위치, 백업 버튼 추가)
        async createManagementPanel() {
            window.__dcufEnsureFilterUiStyles?.();
            if (document.getElementById('dc-block-management-panel')) return;


            const originalBlockList = await this.loadPersonalBlocks();
            const itemsToDelete = { uids: new Set(), nicknames: new Set(), ips: new Set() };
            const isPersonalBlockEnabled = await this.getPersonalBlockEnabled();


            const overlay = document.createElement('div');
            overlay.id = 'dc-block-management-panel-overlay';
            markOwnedSurface(overlay, 'personal-management', 'overlay');


            const panel = document.createElement('div');
            panel.id = 'dc-block-management-panel';
            panel.setAttribute('role', 'dialog');
            panel.setAttribute('aria-modal', 'true');
            panel.setAttribute('aria-label', '차단 유저 관리');
            panel.innerHTML = `
                <div class="panel-header">
                    <div class="panel-title-group">
                        <span class="panel-kicker">PERSONAL BLOCK</span>
                        <h3>차단 유저 관리</h3>
                    </div>
                    <div class="panel-header-actions">
                        <button type="button" class="panel-add-btn">＋ 직접 추가</button>
                        <div class="switch-container">
                            <label class="switch" aria-label="개인 차단 기능 사용">
                                <input type="checkbox" id="personal-block-toggle" ${isPersonalBlockEnabled ? 'checked' : ''}>
                                <span class="switch-slider"></span>
                            </label>
                        </div>
                        <button type="button" class="panel-close-btn" aria-label="차단 유저 관리 닫기">×</button>
                    </div>
                </div>
                <div class="panel-tabs" role="tablist" aria-label="차단 정보 종류">
                    <button type="button" class="panel-tab active" data-type="uids">식별 번호 <span class="panel-tab-count">${originalBlockList.uids.length}</span></button>
                    <button type="button" class="panel-tab" data-type="nicknames">닉네임 <span class="panel-tab-count">${originalBlockList.nicknames.length}</span></button>
                    <button type="button" class="panel-tab" data-type="ips">아이피 <span class="panel-tab-count">${originalBlockList.ips.length}</span></button>
                </div>
                <div class="panel-body">
                    <div class="panel-list-controls">
                        <label class="panel-search">
                            <span aria-hidden="true">⌕</span>
                            <input type="search" class="panel-search-input" placeholder="현재 탭에서 검색" autocomplete="off" aria-label="차단 목록 검색">
                        </label>
                        <button type="button" class="select-all-btn">해당 탭 전체 선택/해제</button>
                        <span class="panel-list-summary" aria-live="polite"></span>
                    </div>
                    <div class="panel-content">
                        <ul class="blocked-list"></ul>
                    </div>
                </div>
                <div class="panel-footer">
                    <div class="panel-footer-left">
                        <button class="select-all-global-btn">모든 탭 전체 선택/해제</button>
                        <button class="panel-backup-btn">백업</button>
                    </div>
                    <button class="panel-save-btn">저장</button>
                </div>
                <div class="panel-resize-handle"></div>
            `;
            markOwnedSurface(panel, 'personal-management');
            panel.innerHTML = __dcufSettingsPresenter.renderManagementPanel({ blocks: originalBlockList, enabled: isPersonalBlockEnabled });
            document.body.appendChild(overlay);
            document.body.appendChild(panel);

            __dcufPopupGeometryHostAdapter.connect(panel, {
                minWidth: 320,
                minHeight: 260,
                pointerDragSelector: '.panel-header',
                pointerResizeSelector: '.panel-resize-handle',
                pointerInteractiveSelector: 'button, input, label, a, select, textarea',
            });

            // [신규] On/Off 스위치 이벤트 리스너
            const toggleSwitch = panel.querySelector('#personal-block-toggle');
            toggleSwitch.addEventListener('change', async (e) => {
                const isEnabled = e.target.checked;
                await this.setPersonalBlockEnabled(isEnabled);
            });

            // [신규] 백업 버튼 이벤트 리스너
            panel.querySelector('.panel-backup-btn').onclick = () => {
                this.createBackupPopup();
            };

            const globalSelectAllBtn = panel.querySelector('.select-all-global-btn');
            const saveButton = panel.querySelector('.panel-save-btn');
            const searchInput = panel.querySelector('.panel-search-input');
            const listSummary = panel.querySelector('.panel-list-summary');
            const updateTabCounts = () => {
                panel.querySelectorAll('.panel-tab').forEach((tab) => {
                    const count = originalBlockList[tab.dataset.type]?.length || 0;
                    const countEl = tab.querySelector('.panel-tab-count');
                    if (countEl) countEl.textContent = String(count);
                });
            };


            const isEverythingSelected = () => {
                const totalItems = originalBlockList.uids.length + originalBlockList.nicknames.length + originalBlockList.ips.length;
                if (totalItems === 0) return false; // 아무것도 없으면 선택된 게 아님
                const totalSelected = itemsToDelete.uids.size + itemsToDelete.nicknames.size + itemsToDelete.ips.size;
                return totalItems === totalSelected;
            };


            const updateGlobalSelectAllButtonState = () => {
                const pendingCount = itemsToDelete.uids.size + itemsToDelete.nicknames.size + itemsToDelete.ips.size;
                saveButton.textContent = pendingCount ? `${pendingCount}건 변경 저장` : '변경 저장';
                if (isEverythingSelected()) {
                    globalSelectAllBtn.textContent = '모든 탭 전체 해제';
                } else {
                    globalSelectAllBtn.textContent = '모든 탭 전체 선택';
                }
            };


            const renderList = (type) => {
                const listEl = panel.querySelector('.blocked-list');
                listEl.innerHTML = '';
                const data = originalBlockList[type] || [];
                const query = searchInput.value.trim().toLocaleLowerCase();
                const filteredData = data.filter((item) => {
                    const value = typeof item === 'object' ? item?.id : item;
                    const name = typeof item === 'object' ? item?.name : item;
                    return !query || String(name ?? value ?? '').toLocaleLowerCase().includes(query)
                        || String(value ?? '').toLocaleLowerCase().includes(query);
                });

                listSummary.textContent = query ? `${filteredData.length} / ${data.length}개 표시` : `총 ${data.length}개`;
                if (filteredData.length === 0) {
                    const emptyItem = document.createElement('li');
                    emptyItem.className = 'blocked-list-empty dcuf-blocked-empty';
                    emptyItem.textContent = query ? '검색 결과가 없습니다.' : '이 탭에 차단된 항목이 없습니다.';
                    listEl.appendChild(emptyItem);
                }

                filteredData.forEach((item) => {
                    const li = document.createElement('li');
                    li.className = 'blocked-item dcuf-blocked-item';
                    const value = (typeof item === 'object') ? item.id : item;
                    const name = (typeof item === 'object') ? item.name : item;
                    li.dataset.value = value;

                    const nameEl = document.createElement('span');
                    nameEl.className = 'item-name dcuf-item-name';
                    nameEl.textContent = String(name ?? value ?? '');
                    const deleteButton = document.createElement('button');
                    deleteButton.type = 'button';
                    deleteButton.className = 'delete-item-btn';
                    deleteButton.classList.add('dcuf-button', 'dcuf-button--danger', 'dcuf-delete-item');
                    deleteButton.textContent = '삭제';
                    deleteButton.setAttribute('aria-label', `${nameEl.textContent} 삭제 선택`);
                    li.append(nameEl, deleteButton);

                    if (itemsToDelete[type].has(value)) {
                        li.classList.add('item-to-delete');
                    }

                    deleteButton.onclick = () => {
                        if (li.classList.toggle('item-to-delete')) {
                            itemsToDelete[type].add(value);
                        } else {
                            itemsToDelete[type].delete(value);
                        }
                        updateSelectAllButtonState(type);
                        updateGlobalSelectAllButtonState();
                    };
                    listEl.appendChild(li);
                });
                updateTabCounts();
                updateSelectAllButtonState(type);
                updateGlobalSelectAllButtonState();
            };


            const updateSelectAllButtonState = (type) => {
                const selectAllBtn = panel.querySelector('.select-all-btn');
                const currentList = originalBlockList[type] || [];
                if (currentList.length > 0 && itemsToDelete[type].size === currentList.length) {
                    selectAllBtn.textContent = '해당 탭 전체 해제';
                    selectAllBtn.dataset.action = 'deselect';
                } else {
                    selectAllBtn.textContent = '해당 탭 전체 선택';
                    selectAllBtn.dataset.action = 'select';
                }
            };


            const handleSelectAll = () => {
                const type = panel.querySelector('.panel-tab.active').dataset.type;
                const selectAllBtn = panel.querySelector('.select-all-btn');
                const shouldSelectAll = selectAllBtn.dataset.action === 'select';


                const currentList = originalBlockList[type] || [];
                currentList.forEach(item => {
                    const value = (typeof item === 'object') ? item.id : item;
                    if (shouldSelectAll) {
                        itemsToDelete[type].add(value);
                    } else {
                        itemsToDelete[type].delete(value);
                    }
                });
                renderList(type);
            };


            panel.querySelector('.select-all-btn').onclick = handleSelectAll;


            globalSelectAllBtn.onclick = () => {
                const shouldSelectEverything = !isEverythingSelected();


                if (shouldSelectEverything) {
                    originalBlockList.uids.forEach(u => itemsToDelete.uids.add(u.id));
                    originalBlockList.nicknames.forEach(n => itemsToDelete.nicknames.add(n));
                    originalBlockList.ips.forEach(i => itemsToDelete.ips.add(i));
                } else {
                    itemsToDelete.uids.clear();
                    itemsToDelete.nicknames.clear();
                    itemsToDelete.ips.clear();
                }
                const activeTabType = panel.querySelector('.panel-tab.active').dataset.type;
                renderList(activeTabType);
            };




            const tabs = panel.querySelectorAll('.panel-tab');
            tabs.forEach(tab => {
                tab.onclick = () => {
                    tabs.forEach((item) => { item.classList.remove('active'); item.setAttribute('aria-selected', 'false'); });
                    tab.classList.add('active');
                    tab.setAttribute('aria-selected', 'true');
                    renderList(tab.dataset.type);
                };
            });


            searchInput.addEventListener('input', () => {
                const activeType = panel.querySelector('.panel-tab.active').dataset.type;
                renderList(activeType);
            });

            panel.querySelector('.panel-add-btn').onclick = async () => {
                const activeType = panel.querySelector('.panel-tab.active').dataset.type;
                const manualType = activeType === 'uids' ? 'uid' : activeType === 'nicknames' ? 'nickname' : 'ip';
                await this.createManualBlockPanel({
                    initialType: manualType,
                    onAdded: async () => {
                        const latestList = await this.loadPersonalBlocks();
                        originalBlockList.uids = latestList.uids;
                        originalBlockList.nicknames = latestList.nicknames;
                        originalBlockList.ips = latestList.ips;
                        renderList(panel.querySelector('.panel-tab.active').dataset.type);
                    }
                });
            };


            const closePanel = () => {
                panel.classList.add('dcuf-pop-leave');
                overlay.classList.add('dcuf-overlay-leave');
                window.setTimeout(() => {
                    __dcufPopupGeometryHostAdapter.dispose(panel);
                    overlay.remove();
                    panel.remove();
                }, 210);
            };


            panel.querySelector('.panel-close-btn').onclick = closePanel;
            overlay.onclick = closePanel;


            panel.querySelector('.panel-save-btn').onclick = async () => {
                const finalBlockList = {
                    uids: originalBlockList.uids.filter(u => !itemsToDelete.uids.has(u.id)),
                    nicknames: originalBlockList.nicknames.filter(n => !itemsToDelete.nicknames.has(n)),
                    ips: originalBlockList.ips.filter(i => !itemsToDelete.ips.has(i))
                };


                this.personalBlockListCache = finalBlockList;
                await this.savePersonalBlocks();
                await FilterModule.refilterAllContent();
                closePanel();
            };


            (() => { // async 키워드 제거
                // 저장된 값을 불러오는 대신 항상 기본값으로 패널 위치와 크기를 설정
                const defaultGeo = {
                    left: '50%',
                    top: '50%',
                    width: `${Math.min(400, Math.max(280, window.innerWidth - 24))}px`,
                    height: `${Math.min(500, Math.max(320, window.innerHeight - 24))}px`
                };
                // 기본값은 항상 % 단위이므로, transform 스타일을 항상 적용하여 정중앙에 배치
                panel.style.transform = 'translate(-50%, -50%)';
                Object.assign(panel.style, defaultGeo);

                renderList('uids'); // 초기 렌더링
            })();
        }
        };
        const connections = new WeakMap();
        const invoke = (method, runtime, args = []) => legacyMethods[method].call(runtime, ...args);
        const actions = Object.freeze({
            'clamp-fab': 'clampFabPosition',
            'apply-fab-scale': 'applyFabScalePercent',
            'show-fab-scale': 'showFabScalePanel',
            'show-manual-block': 'createManualBlockPanel',
            'is-fab-supported': 'isFabSupportedPage',
            'close-fab-drawer': 'closeFabDrawer',
            'position-fab-drawer': 'positionFabDrawer',
            'toggle-fab-drawer': 'toggleFabDrawer',
            'reset-fab-position': 'resetFabPosition',
            'create-fab': 'createFab',
            'enter-selection-mode': 'enterSelectionMode',
            'exit-selection-mode': 'exitSelectionMode',
            'handle-selection-click': 'handleSelectionClick',
            'show-selection-popup': 'showSelectionPopup',
            'merge-block-lists': 'mergeBlockLists',
            'show-backup': 'createBackupPopup',
            'show-management': 'createManagementPanel',
        });
        const mount = async (runtime) => {
            const existing = connections.get(runtime);
            if (existing) return existing;
            const pending = (async () => {
                const scope = DCUF_UI_CONTRACTS.createDisposableScope('personal-block-host');
                runtime.fabScalePercent = await runtime.loadFabScalePercent();
                invoke('createFab', runtime);
                const selectionClickHandler = runtime.handleSelectionClick.bind(runtime);
                scope.listen(document, 'click', selectionClickHandler, true);
                runtime._selectionClickHandler = selectionClickHandler;
                runtime._uiMounted = true;
                const connection = Object.freeze({
                    refresh: () => runtime.getPersonalBlockSurfaceSnapshot(),
                    dispose: () => {
                        scope.dispose();
                        runtime._selectionClickHandler = null;
                        runtime._uiMounted = false;
                        connections.delete(runtime);
                    },
                });
                connections.set(runtime, connection);
                return connection;
            })();
            connections.set(runtime, pending);
            try { return await pending; }
            catch (error) { connections.delete(runtime); throw error; }
        };
        const connect = async (runtime, { deferUi = false } = {}) => {
            const existing = connections.get(runtime);
            if (existing) return existing;
            if (deferUi && typeof window.__dcufBootController?.onReady === 'function') {
                let cancelled = false;
                const deferred = Object.freeze({
                    refresh: () => runtime.getPersonalBlockSurfaceSnapshot(),
                    dispose: () => {
                        cancelled = true;
                        connections.delete(runtime);
                    },
                });
                connections.set(runtime, deferred);
                window.__dcufBootController.onReady(() => {
                    if (cancelled) return;
                    connections.delete(runtime);
                    mount(runtime).catch((error) => console.warn('[DCUF] deferred FAB mount failed:', error));
                });
                return deferred;
            }
            return mount(runtime);
        };
        return DCUF_UI_CONTRACTS.createHostSurfaceAdapter({
            connect,
            refresh(runtime) {
                const connection = connections.get(runtime);
                return typeof connection?.refresh === 'function' ? connection.refresh() : runtime.getPersonalBlockSurfaceSnapshot();
            },
            mountOwnedRoot(root) { return root; },
            invokeNative(action, runtime, ...args) {
                const method = actions[action];
                if (!method) throw new Error(`Unsupported personal-block host action: ${action}`);
                return invoke(method, runtime, args);
            },
            dispose(runtime) {
                const connection = connections.get(runtime);
                if (typeof connection?.dispose === 'function') connection.dispose();
            },
        });
    })();
