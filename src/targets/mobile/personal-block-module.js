    /**
     * =================================================================
     * =================== Personal Block Module =======================
     * =================================================================
     */
    const PersonalBlockModule = {
        isSelectionMode: false,
        personalBlockListCache: { uids: [], nicknames: [], ips: [] },


        async init() {
            this.personalBlockListCache = await this.loadPersonalBlocks();
            this.createFab();
            document.addEventListener('click', this.handleSelectionClick.bind(this), true);
        },


        async loadPersonalBlocks() {
            const list = await GM_getValue(FilterModule.CONSTANTS.STORAGE_KEYS.PERSONAL_BLOCK_LIST, { uids: [], nicknames: [], ips: [] });
            // 데이터 구조 보정
            if (!list.uids) list.uids = [];
            if (!list.nicknames) list.nicknames = [];
            if (!list.ips) list.ips = [];
            return list;
        },


        async savePersonalBlocks() {
            await GM_setValue(FilterModule.CONSTANTS.STORAGE_KEYS.PERSONAL_BLOCK_LIST, this.personalBlockListCache);
        },


        async addBlock(type, value, displayName = null) {
            if (!value) return;
            this.personalBlockListCache = await this.loadPersonalBlocks(); // 최신 데이터로 갱신


            switch (type) {
                case 'uid':
                    if (!this.personalBlockListCache.uids.some(u => u.id === value)) {
                        this.personalBlockListCache.uids.push({ id: value, name: displayName || value });
                    }
                    break;
                case 'nickname':
                    if (!this.personalBlockListCache.nicknames.includes(value)) {
                        this.personalBlockListCache.nicknames.push(value);
                    }
                    break;
                case 'ip':
                    if (!this.personalBlockListCache.ips.includes(value)) {
                        this.personalBlockListCache.ips.push(value);
                    }
                    break;
            }
            await this.savePersonalBlocks();
            await FilterModule.refilterAllContent();
            this.exitSelectionMode();
        },

        // [v2.5.7 추가] 사용자의 차단 상태를 확인하는 헬퍼 함수
        checkBlockStatus(userInfo) {
            const { nick, uid, ip } = userInfo;
            const cache = this.personalBlockListCache;
            return {
                isNickBlocked: nick ? cache.nicknames.includes(nick) : false,
                isUidBlocked: uid ? cache.uids.some(u => u.id === uid) : false,
                isIpBlocked: ip ? cache.ips.includes(ip) : false,
            };
        },

        // [v2.5.7 추가] 특정 항목을 차단 목록에서 제거하는 함수
        async removeBlock(type, value) {
            if (!value) return;
            this.personalBlockListCache = await this.loadPersonalBlocks(); // 최신 데이터로 갱신

            switch (type) {
                case 'uid':
                    this.personalBlockListCache.uids = this.personalBlockListCache.uids.filter(u => u.id !== value);
                    break;
                case 'nickname':
                    this.personalBlockListCache.nicknames = this.personalBlockListCache.nicknames.filter(n => n !== value);
                    break;
                case 'ip':
                    this.personalBlockListCache.ips = this.personalBlockListCache.ips.filter(i => i !== value);
                    break;
            }
            await this.savePersonalBlocks();
            await FilterModule.refilterAllContent();
            this.exitSelectionMode();
        },

        createFab() {
            // [수정] 글 목록 및 글 내용 페이지에서만 '간편차단' 버튼을 표시합니다.
            const currentPath = window.location.pathname;
            if (!currentPath.includes('/board/lists') && !currentPath.includes('/board/view')) {
                return; // 대상 페이지가 아니면 버튼을 생성하지 않고 함수를 종료합니다.
            }

            // [방어 코드 1] 이미 FAB가 존재하면 중복 생성을 방지
            if (document.getElementById('dc-personal-block-fab')) {
                return;
            }


            const fab = document.createElement('div');
            fab.id = 'dc-personal-block-fab';
            fab.textContent = '간편차단';
            document.body.appendChild(fab);


            fab.addEventListener('click', (e) => {
                if (fab.getAttribute('data-dragged') === 'true') {
                    fab.removeAttribute('data-dragged');
                    return;
                }
                this.enterSelectionMode();
            });


            // 드래그 기능
            let isDragging = false, offsetX, offsetY;
            const onDragStart = (e) => { // async 제거 (필요 없음)
                isDragging = true;
                fab.style.transition = 'none';
                const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
                const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
                const rect = fab.getBoundingClientRect();
                offsetX = clientX - rect.left;
                offsetY = clientY - rect.top;
                fab.setAttribute('data-dragged', 'false');
            };


            const onDragMove = (e) => {
                if (!isDragging) return;
                e.preventDefault();
                fab.setAttribute('data-dragged', 'true');
                const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
                const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
                let newX = clientX - offsetX;
                let newY = clientY - offsetY;
                newX = Math.max(0, Math.min(newX, window.innerWidth - fab.offsetWidth));
                newY = Math.max(0, Math.min(newY, window.innerHeight - fab.offsetHeight));
                fab.style.left = `${newX}px`;
                fab.style.top = `${newY}px`;
                // [방어 코드 2] right, bottom 속성 제거하여 left/top과 충돌 방지
                fab.style.right = 'auto';
                fab.style.bottom = 'auto';
            };


            const onDragEnd = () => { // async 키워드 제거
                if (!isDragging) return;
                isDragging = false;
                fab.style.transition = 'transform 0.2s ease-out';

                // GM_setValue 호출을 포함한 위치 저장 로직 전체를 제거하여
                // 드래그가 끝나도 위치가 저장되지 않도록 합니다.
            };


            fab.addEventListener('mousedown', onDragStart);
            document.addEventListener('mousemove', onDragMove);
            document.addEventListener('mouseup', onDragEnd);
            fab.addEventListener('touchstart', onDragStart, { passive: true });
            document.addEventListener('touchmove', onDragMove, { passive: false });
            document.addEventListener('touchend', onDragEnd);


            // 저장된 위치 로드 대신 항상 기본 위치에 생성
            (() => { // async 키워드 제거
                // 저장된 위치를 불러오는 대신 항상 기본 위치를 사용하도록 수정
                const defaultPos = { left: 'auto', top: 'auto', right: '20px', bottom: '20px' };
                // GM_getValue 및 유효성 검사 로직을 제거하고, defaultPos를 바로 적용합니다.
                Object.assign(fab.style, defaultPos);
            })();
        },

        enterSelectionMode() {
            if (this.isSelectionMode) return;
            this.isSelectionMode = true;
            document.body.classList.add('selection-mode-active');


            const popup = document.createElement('div');
            popup.id = 'dc-selection-popup';
            popup.innerHTML = `
                <h4>차단할 유저를 선택하세요</h4>
                <div class="popup-buttons">
                    <button class="cancel-btn">취소</button>
                </div>
            `;
            document.body.appendChild(popup);

            popup.querySelector('.cancel-btn').onclick = () => this.exitSelectionMode();
        },


        exitSelectionMode() {
            if (!this.isSelectionMode) return;
            this.isSelectionMode = false;
            document.body.classList.remove('selection-mode-active');
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
            this.exitSelectionMode();
            this.isSelectionMode = true;
            document.body.classList.add('selection-mode-active');

            const popup = document.createElement('div');
            popup.id = 'dc-selection-popup';

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
        attachPopupPinchResize(target, options = {}) {
            if (!target) return;
            if (target.getAttribute('data-dcuf-pinch-resize-bound') === '1') return;
            target.setAttribute('data-dcuf-pinch-resize-bound', '1');

            const baseMinWidth = Number(options.minWidth) || 320;
            const baseMinHeight = Number(options.minHeight) || 260;
            const maxWidthOption = Number(options.maxWidth) || 0;
            const maxHeightOption = Number(options.maxHeight) || 0;

            let isPinching = false;
            let startDistance = 0;
            let startWidth = 0;
            let startHeight = 0;
            let lastMoveTs = 0;
            let lastMoveDistance = -1;

            const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
            const getDistance = (t1, t2) => Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            const getMidpoint = (t1, t2) => ({ x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 });
            const viewportSize = () => ({ width: window.innerWidth, height: window.innerHeight });

            const normalizeFixedPosition = () => {
                const rect = target.getBoundingClientRect();
                if (target.style.transform && target.style.transform !== 'none') {
                    target.style.transform = 'none';
                    target.style.left = `${rect.left}px`;
                    target.style.top = `${rect.top}px`;
                }
                return target.getBoundingClientRect();
            };

            const isTouchInsideRect = (touch, rect, padding = 24) => (
                touch.clientX >= rect.left - padding &&
                touch.clientX <= rect.right + padding &&
                touch.clientY >= rect.top - padding &&
                touch.clientY <= rect.bottom + padding
            );

            const canStartPinch = (touches, rect) => {
                if (!touches || touches.length < 2) return false;
                const t1 = touches[0];
                const t2 = touches[1];
                if (!isTouchInsideRect(t1, rect) || !isTouchInsideRect(t2, rect)) return false;
                const mid = getMidpoint(t1, t2);
                return isTouchInsideRect({ clientX: mid.x, clientY: mid.y }, rect, 48);
            };

            const startPinch = (touches) => {
                const rect = normalizeFixedPosition();
                if (!canStartPinch(touches, rect)) return;

                const distance = getDistance(touches[0], touches[1]);
                if (!distance || !isFinite(distance)) return;

                isPinching = true;
                startDistance = distance;
                startWidth = rect.width;
                startHeight = rect.height;
                lastMoveTs = 0;
                lastMoveDistance = -1;
            };

            const onTouchStart = (e) => {
                if (!target.isConnected) return;
                if (!e.touches || e.touches.length < 2) return;
                startPinch(e.touches);
                if (isPinching) {
                    if (e.cancelable) e.preventDefault();
                    e.stopPropagation();
                }
            };

            const onTouchMove = (e) => {
                if (!target.isConnected || !isPinching) return;
                if (!e.touches || e.touches.length < 2) {
                    isPinching = false;
                    return;
                }

                const distance = getDistance(e.touches[0], e.touches[1]);
                if (!distance || !isFinite(distance)) return;

                const now = Date.now();
                if (lastMoveDistance >= 0 && Math.abs(distance - lastMoveDistance) < 0.0001 && (now - lastMoveTs) < 6) {
                    if (e.cancelable) e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                lastMoveDistance = distance;
                lastMoveTs = now;

                const mid = getMidpoint(e.touches[0], e.touches[1]);
                const vp = viewportSize();
                const maxViewportWidth = Math.max(120, vp.width - 8);
                const maxViewportHeight = Math.max(120, vp.height - 8);

                const dynamicMinWidth = Math.max(120, Math.min(baseMinWidth, Math.max(120, vp.width - 12)));
                const dynamicMinHeight = Math.max(120, Math.min(baseMinHeight, Math.max(120, vp.height - 12)));

                const configuredMaxWidth = maxWidthOption > 0 ? Math.min(maxWidthOption, maxViewportWidth) : maxViewportWidth;
                const configuredMaxHeight = maxHeightOption > 0 ? Math.min(maxHeightOption, maxViewportHeight) : maxViewportHeight;
                const maxWidth = Math.max(dynamicMinWidth, configuredMaxWidth);
                const maxHeight = Math.max(dynamicMinHeight, configuredMaxHeight);

                const scale = distance / startDistance;
                const nextWidth = clamp(startWidth * scale, dynamicMinWidth, maxWidth);
                const nextHeight = clamp(startHeight * scale, dynamicMinHeight, maxHeight);

                const rawLeft = mid.x - (nextWidth / 2);
                const rawTop = mid.y - (nextHeight / 2);
                const nextLeft = clamp(rawLeft, 0, Math.max(0, vp.width - nextWidth));
                const nextTop = clamp(rawTop, 0, Math.max(0, vp.height - nextHeight));

                target.style.width = `${nextWidth}px`;
                target.style.height = `${nextHeight}px`;
                target.style.left = `${nextLeft}px`;
                target.style.top = `${nextTop}px`;

                if (e.cancelable) e.preventDefault();
                e.stopPropagation();
            };

            const onTouchEnd = () => {
                if (!target.isConnected) return;
                isPinching = false;
            };

            target.addEventListener('touchstart', onTouchStart, { passive: false });
            target.addEventListener('touchmove', onTouchMove, { passive: false });
            target.addEventListener('touchend', onTouchEnd, { passive: true });
            target.addEventListener('touchcancel', onTouchEnd, { passive: true });
        },
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
            if (document.getElementById('dc-backup-popup')) return;

            const overlay = document.createElement('div');
            overlay.id = 'dc-backup-popup-overlay';

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

            document.body.appendChild(overlay);
            document.body.appendChild(popup);

            this.attachPopupPinchResize(popup, { minWidth: 300, minHeight: 240 });

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
                }, 140);
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
            if (document.getElementById('dc-block-management-panel')) return;


            const originalBlockList = await this.loadPersonalBlocks();
            const itemsToDelete = { uids: new Set(), nicknames: new Set(), ips: new Set() };
            const isPersonalBlockEnabled = await GM_getValue(FilterModule.CONSTANTS.STORAGE_KEYS.PERSONAL_BLOCK_ENABLED, true);


            const overlay = document.createElement('div');
            overlay.id = 'dc-block-management-panel-overlay';


            const panel = document.createElement('div');
            panel.id = 'dc-block-management-panel';
            panel.innerHTML = `
                <div class="panel-header">
                    <h3>차단 유저 관리</h3>
                    <div class="switch-container">
                        <label class="switch">
                            <input type="checkbox" id="personal-block-toggle" ${isPersonalBlockEnabled ? 'checked' : ''}>
                            <span class="switch-slider"></span>
                        </label>
                    </div>
                    <button class="panel-close-btn">×</button>
                </div>
                <div class="panel-tabs">
                    <div class="panel-tab active" data-type="uids">식별 번호</div>
                    <div class="panel-tab" data-type="nicknames">닉네임</div>
                    <div class="panel-tab" data-type="ips">아이피</div>
                </div>
                <div class="panel-body">
                    <div class="panel-list-controls">
                        <button class="select-all-btn">해당 탭 전체 선택/해제</button>
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
            document.body.appendChild(overlay);
            document.body.appendChild(panel);

            this.attachPopupPinchResize(panel, { minWidth: 320, minHeight: 260 });

            // [신규] On/Off 스위치 이벤트 리스너
            const toggleSwitch = panel.querySelector('#personal-block-toggle');
            toggleSwitch.addEventListener('change', async (e) => {
                const isEnabled = e.target.checked;
                await GM_setValue(FilterModule.CONSTANTS.STORAGE_KEYS.PERSONAL_BLOCK_ENABLED, isEnabled);
                dcFilterSettings.personalBlockEnabled = isEnabled; // 즉시 설정 반영
                await FilterModule.refilterAllContent(); // 필터 재적용
            });

            // [신규] 백업 버튼 이벤트 리스너
            panel.querySelector('.panel-backup-btn').onclick = () => {
                this.createBackupPopup();
            };

            const globalSelectAllBtn = panel.querySelector('.select-all-global-btn');


            const isEverythingSelected = () => {
                const totalItems = originalBlockList.uids.length + originalBlockList.nicknames.length + originalBlockList.ips.length;
                if (totalItems === 0) return false; // 아무것도 없으면 선택된 게 아님
                const totalSelected = itemsToDelete.uids.size + itemsToDelete.nicknames.size + itemsToDelete.ips.size;
                return totalItems === totalSelected;
            };


            const updateGlobalSelectAllButtonState = () => {
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


                data.forEach(item => {
                    const li = document.createElement('li');
                    li.className = 'blocked-item';
                    const value = (typeof item === 'object') ? item.id : item;
                    const name = (typeof item === 'object') ? item.name : item;
                    li.dataset.value = value;
                    li.innerHTML = `<span class="item-name">${name}</span><span class="delete-item-btn">X</span>`;


                    if (itemsToDelete[type].has(value)) {
                        li.classList.add('item-to-delete');
                    }


                    li.querySelector('.delete-item-btn').onclick = () => {
                        if (li.classList.toggle('item-to-delete')) {
                            itemsToDelete[type].add(value);
                        } else {
                            itemsToDelete[type].delete(value);
                        }
                        updateSelectAllButtonState(type);
                        updateGlobalSelectAllButtonState(); // [추가] 개별 변경 시 전역 버튼 상태도 업데이트
                    };
                    listEl.appendChild(li);
                });
                updateSelectAllButtonState(type);
                updateGlobalSelectAllButtonState(); // [추가] 탭 변경 시 전역 버튼 상태도 업데이트
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
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    renderList(tab.dataset.type);
                };
            });


            const closePanel = () => {
                panel.classList.add('dcuf-pop-leave');
                overlay.classList.add('dcuf-overlay-leave');
                window.setTimeout(() => {
                    overlay.remove();
                    panel.remove();
                }, 140);
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


            // 드래그 & 리사이즈 로직 전체 개선
            let isDragging = false, isResizing = false;
            let offsetX, offsetY, lastX, lastY; // lastX, lastY는 리사이즈 전용


            const onDragStart = (e) => {
                if (e.button !== 0) return;


                if (e.target.classList.contains('panel-resize-handle')) {
                    isResizing = true;
                } else if (e.target.closest('.panel-header')) {
                    isDragging = true;
                } else {
                    return;
                }


                const rect = panel.getBoundingClientRect();


                if (panel.style.transform !== 'none') {
                    panel.style.transform = 'none';
                    panel.style.left = `${rect.left}px`;
                    panel.style.top = `${rect.top}px`;
                }


                if (isDragging) {
                    offsetX = e.clientX - rect.left;
                    offsetY = e.clientY - rect.top;
                } else if (isResizing) {
                    lastX = e.clientX;
                    lastY = e.clientY;
                }


                document.addEventListener('mousemove', onDragMove);
                document.addEventListener('mouseup', onDragEnd, { once: true });
            };


            const onDragMove = (e) => {
                e.preventDefault();


                if (isDragging) {
                    const rect = panel.getBoundingClientRect();
                    let newX = e.clientX - offsetX;
                    let newY = e.clientY - offsetY;


                    newX = Math.max(0, Math.min(newX, window.innerWidth - rect.width));
                    newY = Math.max(0, Math.min(newY, window.innerHeight - rect.height));


                    panel.style.left = `${newX}px`;
                    panel.style.top = `${newY}px`;
                } else if (isResizing) {
                    const dx = e.clientX - lastX;
                    const dy = e.clientY - lastY;
                    lastX = e.clientX;
                    lastY = e.clientY;


                    const rect = panel.getBoundingClientRect();
                    panel.style.width = `${rect.width + dx}px`;
                    panel.style.height = `${rect.height + dy}px`;
                }
            };


            const onDragEnd = () => { // async 키워드 제거
                isDragging = false;
                isResizing = false;
                document.removeEventListener('mousemove', onDragMove);
                // GM_setValue 호출을 제거하여 창의 위치/크기 상태를 저장하지 않음
            };


            panel.addEventListener('mousedown', onDragStart);


            (() => { // async 키워드 제거
                // 저장된 값을 불러오는 대신 항상 기본값으로 패널 위치와 크기를 설정
                const defaultGeo = {
                    left: '50%', top: '50%', width: '400px', height: '500px'
                };
                // 기본값은 항상 % 단위이므로, transform 스타일을 항상 적용하여 정중앙에 배치
                panel.style.transform = 'translate(-50%, -50%)';
                Object.assign(panel.style, defaultGeo);

                renderList('uids'); // 초기 렌더링
            })();
        }
    };

