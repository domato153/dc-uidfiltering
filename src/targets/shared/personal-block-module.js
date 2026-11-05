    /**
     * =================================================================
     * =================== Personal Block Module =======================
     * =================================================================
     */
    const PersonalBlockModule = {
        isSelectionMode: false,
        personalBlockListCache: { uids: [], nicknames: [], ips: [] },
        fabScalePercent: 100,
        _initState: 'idle',
        _initPromise: null,
        _uiMounted: false,
        _selectionClickHandler: null,
        FAB_SCALE_MIN: 60,
        FAB_SCALE_MAX: 160,


        async init(snapshot = null, { deferUi = false } = {}) {
            if (this._initState === 'ready') return 'already-ready';
            if (this._initState === 'initializing' && this._initPromise) return this._initPromise;
            this._initState = 'initializing';
            this._initPromise = (async () => {
                const list = snapshot?.personalBlockList || await this.loadPersonalBlocks();
                this.personalBlockListCache = {
                    uids: Array.isArray(list?.uids) ? list.uids : [],
                    nicknames: Array.isArray(list?.nicknames) ? list.nicknames : [],
                    ips: Array.isArray(list?.ips) ? list.ips : []
                };
                await __dcufPersonalBlockHostAdapter.connect(this, { deferUi });
                this._initState = 'ready';
                return 'ready';
            })();
            try {
                return await this._initPromise;
            } catch (error) {
                this._initState = 'failed';
                this._initPromise = null;
                throw error;
            }
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

        normalizeFabScalePercent(value) {
            const numeric = Number(value);
            if (!Number.isFinite(numeric)) return 100;
            return Math.max(this.FAB_SCALE_MIN, Math.min(this.FAB_SCALE_MAX, Math.round(numeric)));
        },

        async loadFabScalePercent() {
            const stored = await GM_getValue(FilterModule.CONSTANTS.STORAGE_KEYS.FAB_SCALE_PERCENT, 100);
            return this.normalizeFabScalePercent(stored);
        },

        async saveFabScalePercent(value) {
            const normalized = this.normalizeFabScalePercent(value);
            await GM_setValue(FilterModule.CONSTANTS.STORAGE_KEYS.FAB_SCALE_PERCENT, normalized);
            return normalized;
        },
        async getPersonalBlockEnabled() {
            return Boolean(await GM_getValue(FilterModule.CONSTANTS.STORAGE_KEYS.PERSONAL_BLOCK_ENABLED, true));
        },
        async setPersonalBlockEnabled(value) {
            const enabled = Boolean(value);
            await GM_setValue(FilterModule.CONSTANTS.STORAGE_KEYS.PERSONAL_BLOCK_ENABLED, enabled);
            dcFilterSettings.personalBlockEnabled = enabled;
            await FilterModule.refilterAllContent();
            return enabled;
        },
        async getPersonalBlockSurfaceSnapshot() {
            const [list, enabled, scalePercent] = await Promise.all([
                this.loadPersonalBlocks(),
                this.getPersonalBlockEnabled(),
                this.loadFabScalePercent(),
            ]);
            return DCUF_UI_CONTRACTS.createSurfaceSnapshot({
                enabled,
                scalePercent,
                list: {
                    uids: (list.uids || []).map((item) => ({ id: String(item?.id || ''), name: String(item?.name || '') })),
                    nicknames: (list.nicknames || []).map(String),
                    ips: (list.ips || []).map(String),
                },
            }, 'personal-block');
        },
        clampFabPosition() { return __dcufPersonalBlockHostAdapter.invokeNative('clamp-fab', this); },
        applyFabScalePercent(value, options) { return __dcufPersonalBlockHostAdapter.invokeNative('apply-fab-scale', this, value, options); },
        async showFabScalePanel() { return __dcufPersonalBlockHostAdapter.invokeNative('show-fab-scale', this); },
        async createManualBlockPanel(options) { return __dcufPersonalBlockHostAdapter.invokeNative('show-manual-block', this, options); },
        isFabSupportedPage() { return __dcufPersonalBlockHostAdapter.invokeNative('is-fab-supported', this); },
        closeFabDrawer() { return __dcufPersonalBlockHostAdapter.invokeNative('close-fab-drawer', this); },
        positionFabDrawer() { return __dcufPersonalBlockHostAdapter.invokeNative('position-fab-drawer', this); },
        toggleFabDrawer() { return __dcufPersonalBlockHostAdapter.invokeNative('toggle-fab-drawer', this); },
        resetFabPosition() { return __dcufPersonalBlockHostAdapter.invokeNative('reset-fab-position', this); },
        createFab() { return __dcufPersonalBlockHostAdapter.invokeNative('create-fab', this); },
        enterSelectionMode() { return __dcufPersonalBlockHostAdapter.invokeNative('enter-selection-mode', this); },
        exitSelectionMode() { return __dcufPersonalBlockHostAdapter.invokeNative('exit-selection-mode', this); },
        handleSelectionClick(event) { return __dcufPersonalBlockHostAdapter.invokeNative('handle-selection-click', this, event); },
        showSelectionPopup(userInfo) { return __dcufPersonalBlockHostAdapter.invokeNative('show-selection-popup', this, userInfo); },
        mergeBlockLists(existing, imported) { return __dcufPersonalBlockHostAdapter.invokeNative('merge-block-lists', this, existing, imported); },
        async createBackupPopup() { return __dcufPersonalBlockHostAdapter.invokeNative('show-backup', this); },
        async createManagementPanel() { return __dcufPersonalBlockHostAdapter.invokeNative('show-management', this); }

    };

