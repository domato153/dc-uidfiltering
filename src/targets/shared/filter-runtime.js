    const FilterModule = {
        TELECOM: DCUF_SHARED_IP.TELECOM,

        CONSTANTS: DCUF_SHARED_SCHEMA.FILTER_CONSTANTS,
        BLOCK_UID_EXPIRE: 1000 * 60 * 60 * 24 * 7,
        BLOCKED_UIDS_CACHE: {},
        ASYNC_UID_REQUEST_CONCURRENCY: 4,
        INFLIGHT_USER_SUM_REQUESTS: Object.create(null),
        USER_SUM_NEGATIVE_CACHE: new Map(),
        USER_SUM_NEGATIVE_TTL: 30000,
        USER_SUM_NEGATIVE_MAX_ENTRIES: 256,
        _negativeUserSumCacheWrites: 0,
        DEBUG_ENABLED: false,
        DEBUG_MAX_DECISIONS_PER_PASS: 150,
        DEBUG_PASS_ID: 0,
        DEBUG_DECISION_LOG_COUNT: 0,
        DEBUG_DECISION_KEYS: null,
        _runtimeMutationUnsubscribe: null,
        _userSumTaskQueue: null,
        _blockedUidWritePromise: null,
        _blockedUidWriteTimerId: 0,
        _blockedUidDirtyGeneration: 0,
        _blockedUidPersistedGeneration: 0,
        _blockedUidDirtyUids: null,
        _blockedUidWriteWaiters: null,
        _blockedUidPagehideHandler: null,
        BLOCKED_UID_WRITE_DELAY: 120,
        _queuedObserverFilterItems: null,
        _queuedObserverFilterRafId: 0,
        _queuedObserverFilterTimerId: 0,
        _syncRefilterRafId: 0,
        _syncRefilterTimerIds: null,
        _settingsSignature: '',
        _hiddenAt: 0,
        _hiddenMutationGeneration: 0,
        _hiddenBody: null,
        _hiddenRecoverySurface: null,
        _hiddenBfcacheRecoveryId: 0,
        _visibilityCycleId: 0,
        _visibilityRecoveryPromise: null,
        VISIBILITY_LONG_RESTORE_MS: 5 * 60 * 1000,
        _krPrefixSet: null,
        _telecomPrefixSet: null,
        _proxyStrictPrefixSet: null,
        _proxyAggressiveExtraPrefixSet: null,
        _proxyAggressivePrefixSet: null,
        PROXY_MODE: DCUF_SHARED_IP.PROXY_MODE,
        PROXY_STRICT_PREFIXES: DCUF_SHARED_IP.PROXY_STRICT_PREFIXES,
        PROXY_AGGRESSIVE_EXTRA_PREFIXES: DCUF_SHARED_IP.PROXY_AGGRESSIVE_EXTRA_PREFIXES,
        KR_IP_RANGES: DCUF_SHARED_IP.KR_IP_RANGES,
        // This source is the mobile target adapter. The PC builder rewrites this
        // target flag to false when it ports the shared filter module.
        isMobile: () => __DCUF_TARGET_IS_MOBILE__,
        isRecommendedContext(...args) { return __dcufFilterHostAdapter.invokeNative('isRecommendedContext', this, ...args); },
        getHostCookie(...args) { return __dcufFilterHostAdapter.invokeNative('getHostCookie', this, ...args); },
        noteBoot(...args) { return __dcufFilterHostAdapter.invokeNative('noteBoot', this, ...args); },
        async loadDebugBlockConfig() {
            return GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG, {});
        },
        async initializeFirstRunThreshold() {
            await GM_setValue(this.CONSTANTS.STORAGE_KEYS.THRESHOLD, 0);
        },
        normalizeProxyBlockMode(value) {
            return DCUF_SHARED_STORAGE.normalizeProxyBlockModeValue(value);
        },
        getProxyModeLabel(mode) {
            switch (this.normalizeProxyBlockMode(mode)) {
                case this.PROXY_MODE.STRICT: return '확실한 우회 차단';
                case this.PROXY_MODE.AGGRESSIVE: return '공격적 우회 차단';
                default: return '끔';
            }
        },
        normalizeIpPrefix(value) {
            return DCUF_SHARED_STORAGE.normalizeIpPrefix(value);
        },
        parseIpPrefixList(value) {
            return DCUF_SHARED_STORAGE.parseIpPrefixList(value, this.CONSTANTS.ETC.MOBILE_IP_MARKER);
        },
        getIpPrefix(ip) {
            return DCUF_SHARED_STORAGE.extractIpPrefix(ip);
        },
        getKrPrefixSet() {
            if (!this._krPrefixSet) {
                const prefixes = [];
                const rangeSource = typeof this.KR_IP_RANGES === 'function'
                    ? this.KR_IP_RANGES()
                    : this.KR_IP_RANGES;
                Object.entries(rangeSource || {}).forEach(([first, ranges]) => {
                    ranges.forEach(([start, end]) => {
                        for (let second = start; second <= end; second += 1) {
                            prefixes.push(`${first}.${second}`);
                        }
                    });
                });
                this._krPrefixSet = new Set(prefixes);
                this.incrementRuntimeDiagnostic('filter.ipData.kr.decodes');
            }
            return this._krPrefixSet;
        },
        isForeignIpPrefix(ipPrefix) {
            return Boolean(ipPrefix) && !this.getKrPrefixSet().has(ipPrefix);
        },
        getTelecomPrefixSet() {
            if (!this._telecomPrefixSet) {
                const prefixes = [];
                const telecomSource = typeof this.TELECOM === 'function'
                    ? this.TELECOM()
                    : this.TELECOM;
                (telecomSource || []).forEach((group) => group[1].forEach((item) => {
                    if (item[2] === 'MOB') prefixes.push(`${group[0]}.${item[0]}`);
                }));
                this._telecomPrefixSet = new Set(prefixes);
                this.incrementRuntimeDiagnostic('filter.ipData.telecom.decodes');
            }
            return this._telecomPrefixSet;
        },
        getProxyStrictPrefixSet() {
            if (!this._proxyStrictPrefixSet) {
                const source = this.PROXY_STRICT_PREFIXES;
                const prefixes = typeof source === 'string' ? source.trim().split(/\s+/).filter(Boolean) : source;
                this._proxyStrictPrefixSet = new Set(prefixes || []);
                this.incrementRuntimeDiagnostic('filter.ipData.proxyStrict.decodes');
            }
            return this._proxyStrictPrefixSet;
        },
        getProxyAggressiveExtraPrefixSet() {
            if (!this._proxyAggressiveExtraPrefixSet) {
                const source = this.PROXY_AGGRESSIVE_EXTRA_PREFIXES;
                const prefixes = typeof source === 'string' ? source.trim().split(/\s+/).filter(Boolean) : source;
                this._proxyAggressiveExtraPrefixSet = new Set(prefixes || []);
                this.incrementRuntimeDiagnostic('filter.ipData.proxyAggressive.decodes');
            }
            return this._proxyAggressiveExtraPrefixSet;
        },
        getProxyPrefixSet(mode = this.PROXY_MODE.STRICT) {
            const normalizedMode = this.normalizeProxyBlockMode(mode);
            if (normalizedMode === this.PROXY_MODE.AGGRESSIVE) {
                if (!this._proxyAggressivePrefixSet) {
                    this._proxyAggressivePrefixSet = new Set(this.getProxyStrictPrefixSet());
                    this.getProxyAggressiveExtraPrefixSet().forEach((prefix) => this._proxyAggressivePrefixSet.add(prefix));
                }
                return this._proxyAggressivePrefixSet;
            }
            return normalizedMode === this.PROXY_MODE.STRICT ? this.getProxyStrictPrefixSet() : null;
        },
        getProxyPrefixMatch(ipPrefix, mode) {
            const normalizedMode = this.normalizeProxyBlockMode(mode);
            if (!ipPrefix || normalizedMode === this.PROXY_MODE.OFF) return { matched: false, tier: null };
            if (this.getProxyStrictPrefixSet().has(ipPrefix) || this.isForeignIpPrefix(ipPrefix)) return { matched: true, tier: 'strict' };
            if (normalizedMode === this.PROXY_MODE.AGGRESSIVE && this.getProxyAggressiveExtraPrefixSet().has(ipPrefix)) {
                return { matched: true, tier: 'aggressive' };
            }
            return { matched: false, tier: null };
        },
        debugLog(scope, message, payload) {
            if (!this.DEBUG_ENABLED) return;
            if (payload === undefined) console.log(`[DCUF DEBUG][${scope}] ${message}`);
            else console.log(`[DCUF DEBUG][${scope}] ${message}`, payload);
        },
        debugSettingsSnapshot(extra = {}) {
            const s = dcFilterSettings || {};
            const proxyBlockMode = this.normalizeProxyBlockMode(s.proxyBlockMode ?? s.proxyBlockEnabled);
            return {
                masterDisabled: !!s.masterDisabled,
                excludeRecommended: !!s.excludeRecommended,
                threshold: s.threshold,
                ratioEnabled: !!s.ratioEnabled,
                ratioMin: s.ratioMin,
                ratioMax: s.ratioMax,
                blockPumPosts: !!s.blockPumPosts,
                blockGuestEnabled: !!s.blockGuestEnabled,
                proxyBlockMode,
                proxyBlockModeLabel: this.getProxyModeLabel(proxyBlockMode),
                proxyBlockEnabled: proxyBlockMode !== this.PROXY_MODE.OFF,
                telecomBlockEnabled: !!s.telecomBlockEnabled,
                blockedGuestsCount: Array.isArray(s.blockedGuests) ? s.blockedGuests.length : 0,
                blockedGuestsPreview: Array.isArray(s.blockedGuests) ? s.blockedGuests.slice(0, 10) : [],
                customIpPrefixCount: s.customIpPrefixSet instanceof Set ? s.customIpPrefixSet.size : 0,
                customIpPrefixPreview: s.customIpPrefixSet instanceof Set ? Array.from(s.customIpPrefixSet).slice(0, 15) : [],
                telecomPrefixCount: this.getTelecomPrefixSet().size,
                proxyStrictPrefixCount: this.getProxyStrictPrefixSet().size,
                proxyAggressiveExtraPrefixCount: this.getProxyAggressiveExtraPrefixSet().size,
                proxyAggressivePrefixCount: this.getProxyPrefixSet(this.PROXY_MODE.AGGRESSIVE).size,
                effectiveProxyPrefixCount: proxyBlockMode === this.PROXY_MODE.AGGRESSIVE ? this.getProxyPrefixSet(this.PROXY_MODE.AGGRESSIVE).size : (proxyBlockMode === this.PROXY_MODE.STRICT ? this.getProxyStrictPrefixSet().size : 0),
                ...extra
            };
        },
        debugStringifySafe(value) {
            try {
                return JSON.stringify(value);
            } catch (error) {
                return `[stringify-failed:${error?.message || 'unknown'}]`;
            }
        },
        debugDescribeElement(...args) { return __dcufFilterHostAdapter.invokeNative('debugDescribeElement', this, ...args); },
        startDebugPass(reason, extra = {}) {
            if (!this.DEBUG_ENABLED) return;
            this.DEBUG_PASS_ID += 1;
            this.DEBUG_DECISION_LOG_COUNT = 0;
            if (!(this.DEBUG_DECISION_KEYS instanceof Set)) this.DEBUG_DECISION_KEYS = new Set();
            this.DEBUG_DECISION_KEYS.clear();
            this.debugLog('pass', `start #${this.DEBUG_PASS_ID} ${reason}`, {
                passId: this.DEBUG_PASS_ID,
                ...extra,
                settings: this.debugSettingsSnapshot()
            });
        },
        debugDecision(...args) { return __dcufFilterHostAdapter.invokeNative('debugDecision', this, ...args); },
        debugMirrorSync(...args) { return __dcufFilterHostAdapter.invokeNative('debugMirrorSync', this, ...args); },
        async debugDumpState(...args) { return __dcufFilterHostAdapter.invokeNative('debugDumpState', this, ...args); },
        installDebugApi(...args) { return __dcufFilterHostAdapter.invokeNative('installDebugApi', this, ...args); },
        async cleanupLegacyManagedBlockConfig(snapshot = null) {
            const migrationDone = snapshot ? snapshot.migrationDone : await GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG_MIGRATION_V275_DONE, false);
            if (migrationDone) return;
            const conf = snapshot?.blockConfig || await GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG, {});
            if (!conf || typeof conf !== 'object') {
                await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG_MIGRATION_V275_DONE, true);
                if (snapshot) snapshot.migrationDone = true;
                return;
            }
            const currentIp = typeof conf.ip === 'string' ? conf.ip : '';
            const parsedPrefixes = DCUF_SHARED_STORAGE.parseIpPrefixList(currentIp, this.CONSTANTS.ETC.MOBILE_IP_MARKER);
            const normalizedIp = DCUF_SHARED_STORAGE.normalizeBlockConfigIp(currentIp, this.CONSTANTS.ETC.MOBILE_IP_MARKER);
            const suspiciousLargeLegacyList = DCUF_SHARED_STORAGE.isSuspiciousLegacyManagedIpList(currentIp, this.CONSTANTS.ETC.MOBILE_IP_MARKER);

            if (suspiciousLargeLegacyList) {
                this.debugLog('migration', 'detected suspicious large legacy blockConfig.ip list, backing up and clearing', {
                    beforeCount: parsedPrefixes.length,
                    beforePreview: parsedPrefixes.slice(0, 20)
                });
                await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG_MIGRATION_V275_BACKUP, currentIp);
                conf.ip = '';
                await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG, conf);
                await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG_MIGRATION_V275_DONE, true);
                if (snapshot) { snapshot.blockConfig = conf; snapshot.migrationDone = true; }
                return;
            }

            if (normalizedIp !== currentIp) {
                this.debugLog('migration', 'cleanupLegacyManagedBlockConfig updating blockConfig.ip', {
                    before: currentIp,
                    after: normalizedIp
                });
                conf.ip = normalizedIp;
                await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG, conf);
            }
            await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG_MIGRATION_V275_DONE, true);
            if (snapshot) { snapshot.blockConfig = conf; snapshot.migrationDone = true; }
        },
        async getSettingsSurfaceSnapshot() {
            await this.reloadSettings();
            const settings = dcFilterSettings || {};
            const shortcut = await GM_getValue(this.CONSTANTS.STORAGE_KEYS.SHORTCUT_KEY, 'Shift+S');
            return DCUF_UI_CONTRACTS.createSurfaceSnapshot({
                settings: {
                    masterDisabled: Boolean(settings.masterDisabled),
                    excludeRecommended: Boolean(settings.excludeRecommended),
                    threshold: Number(settings.threshold) || 0,
                    ratioEnabled: Boolean(settings.ratioEnabled),
                    ratioMin: settings.ratioMin ?? '',
                    ratioMax: settings.ratioMax ?? '',
                    blockPumPosts: Boolean(settings.blockPumPosts),
                    blockGuestEnabled: Boolean(settings.blockGuestEnabled),
                    proxyBlockMode: this.normalizeProxyBlockMode(settings.proxyBlockMode),
                    telecomBlockEnabled: Boolean(settings.telecomBlockEnabled),
                },
                shortcut: typeof shortcut === 'string' && shortcut ? shortcut : 'Shift+S',
            }, 'filter-settings');
        },
        async commitImmediateSetting(storageKey, value, { clearBlockedGuests = false } = {}) {
            this.debugLog('toggle', 'applyCheckboxChange requested', { storageKey, value });
            await GM_setValue(storageKey, value);
            if (clearBlockedGuests) {
                this.debugLog('toggle', 'applyCheckboxChange clearing blocked guests', { storageKey, value });
                await this.clearBlockedGuests();
            }
            await this.debugDumpState(`after ${storageKey}=${value} before refilter`);
            await this.refilterAllContent(`toggle ${storageKey}=${value}`);
        },
        async commitSettingsSurface(values) {
            const keys = this.CONSTANTS.STORAGE_KEYS;
            const blockGuestChecked = Boolean(values.blockGuestEnabled);
            const writes = [
                GM_setValue(keys.MASTER_DISABLED, Boolean(values.masterDisabled)),
                GM_setValue(keys.EXCLUDE_RECOMMENDED, Boolean(values.excludeRecommended)),
                GM_setValue(keys.THRESHOLD, Number(values.threshold) || 0),
                GM_setValue(keys.RATIO_ENABLED, Boolean(values.ratioEnabled)),
                GM_setValue(keys.RATIO_MIN, values.ratioMin ?? ''),
                GM_setValue(keys.RATIO_MAX, values.ratioMax ?? ''),
                GM_setValue(keys.BLOCK_PUM_POSTS, Boolean(values.blockPumPosts)),
                GM_setValue(keys.BLOCK_GUEST, blockGuestChecked),
                GM_setValue(keys.BLOCK_PROXY, this.normalizeProxyBlockMode(values.proxyBlockMode)),
                GM_setValue(keys.BLOCK_TELECOM, Boolean(values.telecomBlockEnabled)),
            ];
            if (!blockGuestChecked) writes.push(this.clearBlockedGuests());
            await Promise.all(writes);
            await this.debugDumpState('save button before refilter');
            await this.refilterAllContent('save button');
        },
        async commitShortcutSetting(value) {
            await GM_setValue(this.CONSTANTS.STORAGE_KEYS.SHORTCUT_KEY, value);
            activeShortcutString = value;
            activeShortcutObject = this.parseShortcutString(value);
            return value;
        },
        async showSettings() { return __dcufFilterSettingsHostAdapter.invokeNative('show-settings', this); },
        getGalleryKey(urlLike) { return __dcufFilterSettingsHostAdapter.invokeNative('get-gallery-key', this, urlLike); },
        normalizeHeadtext(value) {
            return DCUF_SHARED_STORAGE.normalizeHeadtext(value);
        },
        normalizeGalleryHeadtextBlocks(value) {
            return DCUF_SHARED_STORAGE.normalizeGalleryHeadtextBlocks(value);
        },
        async loadGalleryHeadtextBlocks() {
            const raw = await GM_getValue(this.CONSTANTS.STORAGE_KEYS.GALLERY_HEADTEXT_BLOCKS, {});
            return this.normalizeGalleryHeadtextBlocks(raw);
        },
        async saveGalleryHeadtextBlocks(rules, reason = 'gallery headtext blocks') {
            const normalized = this.normalizeGalleryHeadtextBlocks(rules);
            await GM_setValue(this.CONSTANTS.STORAGE_KEYS.GALLERY_HEADTEXT_BLOCKS, normalized);
            await this.reloadSettings();
            await this.refilterAllContent(reason);
            return normalized;
        },
        getCanonicalHeadtextFromNode(source) { return __dcufFilterSettingsHostAdapter.invokeNative('get-canonical-headtext', this, source); },
        collectDiscoveredHeadtexts() { return __dcufFilterSettingsHostAdapter.invokeNative('collect-headtexts', this); },
        async showHeadtextBlockManager() { return __dcufFilterSettingsHostAdapter.invokeNative('show-headtext-manager', this); },
        // [v2.1.1 수정] 단축키 변경 모달 표시 (실시간 입력 감지 로직 개선)
        showShortcutChanger() { return __dcufFilterSettingsHostAdapter.invokeNative('show-shortcut-changer', this); },
        // [v2.1 추가] 키 Set을 정해진 형식의 문자열로 변환
        formatShortcutKeys(keySet) {
            return DCUF_SHARED_STORAGE.formatShortcutKeys(keySet);
        },
        // [v2.1 추가] 단축키 문자열을 이벤트 비교용 객체로 변환
        parseShortcutString(shortcutString) {
            return DCUF_SHARED_STORAGE.parseShortcutString(shortcutString);
        },
        buildLookupSet(items, mapValue = (item) => item) {
            const set = new Set();
            if (!Array.isArray(items)) return set;
            items.forEach((item) => {
                const value = mapValue(item);
                if (value) set.add(value);
            });
            return set;
        },
        isFilterTargetDescriptor(...args) { return __dcufFilterHostAdapter.invokeNative('isFilterTargetDescriptor', this, ...args); },
        normalizeFilterTarget(...args) { return __dcufFilterHostAdapter.invokeNative('normalizeFilterTarget', this, ...args); },
        isReplyOnlyCommentWrapper(...args) { return __dcufFilterHostAdapter.invokeNative('isReplyOnlyCommentWrapper', this, ...args); },
        findWriterInfoForFilterTarget(...args) { return __dcufFilterHostAdapter.invokeNative('findWriterInfoForFilterTarget', this, ...args); },
        isHeadtextFilterTarget(...args) { return __dcufFilterHostAdapter.invokeNative('isHeadtextFilterTarget', this, ...args); },
        extractHeadtext(...args) { return __dcufFilterHostAdapter.invokeNative('extractHeadtext', this, ...args); },
        isPumPost(...args) { return __dcufFilterHostAdapter.invokeNative('isPumPost', this, ...args); },
        describeFilterTarget(...args) { return __dcufFilterHostAdapter.invokeNative('describeFilterTarget', this, ...args); },
        describeFilterTargets(...args) { return __dcufFilterHostAdapter.invokeNative('describeFilterTargets', this, ...args); },
        applySyncToDescriptors(...args) { return __dcufFilterHostAdapter.invokeNative('applySyncToDescriptors', this, ...args); },
        applyAsyncToDescriptors(...args) { return __dcufFilterHostAdapter.invokeNative('applyAsyncToDescriptors', this, ...args); },
        applyFilterItems(...args) { return __dcufFilterHostAdapter.invokeNative('applyFilterItems', this, ...args); },
        flushQueuedObservedFilterItems(...args) { return __dcufFilterHostAdapter.invokeNative('flushQueuedObservedFilterItems', this, ...args); },
        queueObservedFilterItems(...args) { return __dcufFilterHostAdapter.invokeNative('queueObservedFilterItems', this, ...args); },
        collectMutationFilterItems(...args) { return __dcufFilterHostAdapter.invokeNative('collectMutationFilterItems', this, ...args); },
        collectImmediateCommentFilterItems(...args) { return __dcufFilterHostAdapter.invokeNative('collectImmediateCommentFilterItems', this, ...args); },
        applyImmediateCommentMutations(...args) { return __dcufFilterHostAdapter.invokeNative('applyImmediateCommentMutations', this, ...args); },
        getRuntimeCoordinator(...args) { return __dcufFilterHostAdapter.invokeNative('getRuntimeCoordinator', this, ...args); },
        incrementRuntimeDiagnostic(...args) { return __dcufFilterHostAdapter.invokeNative('incrementRuntimeDiagnostic', this, ...args); },
        setRuntimeDiagnosticGauge(...args) { return __dcufFilterHostAdapter.invokeNative('setRuntimeDiagnosticGauge', this, ...args); },
        getRelevantMutationGeneration(...args) { return __dcufFilterHostAdapter.invokeNative('getRelevantMutationGeneration', this, ...args); },
        markRelevantMutation(...args) { return __dcufFilterHostAdapter.invokeNative('markRelevantMutation', this, ...args); },
        getUserSumTaskQueue() {
            if (this._userSumTaskQueue) return this._userSumTaskQueue;
            const runtimeCoordinator = this.getRuntimeCoordinator();
            if (runtimeCoordinator && typeof runtimeCoordinator.createTaskQueue === 'function') {
                this._userSumTaskQueue = runtimeCoordinator.createTaskQueue('filter-user-sum', {
                    concurrency: this.ASYNC_UID_REQUEST_CONCURRENCY
                });
                return this._userSumTaskQueue;
            }

            this._userSumTaskQueue = {
                enqueue(run) {
                    return Promise.resolve().then(run);
                }
            };
            return this._userSumTaskQueue;
        },
        getNegativeUserSumCache(uid) {
            const cached = this.USER_SUM_NEGATIVE_CACHE.get(uid);
            if (!cached) return null;
            if (Date.now() - cached.ts > this.USER_SUM_NEGATIVE_TTL) {
                this.USER_SUM_NEGATIVE_CACHE.delete(uid);
                this.setRuntimeDiagnosticGauge('filter.negativeUserSumCache.size', this.USER_SUM_NEGATIVE_CACHE.size);
                return null;
            }
            return cached;
        },
        pruneNegativeUserSumCache(now = Date.now()) {
            let removed = 0;
            this.USER_SUM_NEGATIVE_CACHE.forEach((entry, key) => {
                if (!entry || typeof entry.ts !== 'number' || now - entry.ts > this.USER_SUM_NEGATIVE_TTL) {
                    this.USER_SUM_NEGATIVE_CACHE.delete(key);
                    removed += 1;
                }
            });
            while (this.USER_SUM_NEGATIVE_CACHE.size > this.USER_SUM_NEGATIVE_MAX_ENTRIES) {
                const oldestKey = this.USER_SUM_NEGATIVE_CACHE.keys().next().value;
                if (oldestKey === undefined) break;
                this.USER_SUM_NEGATIVE_CACHE.delete(oldestKey);
                removed += 1;
            }
            if (removed > 0) this.incrementRuntimeDiagnostic('filter.negativeUserSumCache.pruned', removed);
            this.setRuntimeDiagnosticGauge('filter.negativeUserSumCache.size', this.USER_SUM_NEGATIVE_CACHE.size);
            return removed;
        },
        setNegativeUserSumCache(uid, reason = 'error') {
            if (!uid) return null;
            const cached = { ts: Date.now(), reason };
            this.USER_SUM_NEGATIVE_CACHE.delete(uid);
            this.USER_SUM_NEGATIVE_CACHE.set(uid, cached);
            this._negativeUserSumCacheWrites = (this._negativeUserSumCacheWrites + 1) % 32;
            if (this.USER_SUM_NEGATIVE_CACHE.size > this.USER_SUM_NEGATIVE_MAX_ENTRIES || this._negativeUserSumCacheWrites === 0) {
                this.pruneNegativeUserSumCache(cached.ts);
            } else {
                this.setRuntimeDiagnosticGauge('filter.negativeUserSumCache.size', this.USER_SUM_NEGATIVE_CACHE.size);
            }
            return cached;
        },
        async getUserPostCommentSum(uid) {
            if (userSumCache[uid]) return userSumCache[uid];
            if (this.getNegativeUserSumCache(uid)) return null;
            if (this.INFLIGHT_USER_SUM_REQUESTS[uid]) return this.INFLIGHT_USER_SUM_REQUESTS[uid];
            const getCookie = (name) => this.getHostCookie(name);
            let ci = getCookie(this.CONSTANTS.ETC.COOKIE_NAME_1) || getCookie(this.CONSTANTS.ETC.COOKIE_NAME_2);
            if (!ci) return null;
            const taskQueue = this.getUserSumTaskQueue();
            const requestPromise = taskQueue.enqueue(() => new Promise((resolve) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', this.CONSTANTS.API.USER_INFO, true); xhr.withCredentials = true;
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8'); xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');


                xhr.timeout = 5000;
                xhr.ontimeout = () => {
                    console.warn(`DCinside User Filter: User info request for UID ${uid} timed out.`);
                    this.setNegativeUserSumCache(uid, 'timeout');
                    resolve(null);
                };


                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const [post, comment] = xhr.responseText.split(',').map(x => parseInt(x, 10));
                        if (!isNaN(post) && !isNaN(comment)) {
                            const d = { sum: post + comment, post, comment };
                            userSumCache[uid] = d;
                            this.USER_SUM_NEGATIVE_CACHE.delete(uid);
                            resolve(d);
                        } else {
                            this.setNegativeUserSumCache(uid, 'parse');
                            resolve(null);
                        }
                    } else {
                        this.setNegativeUserSumCache(uid, `status:${xhr.status}`);
                        resolve(null);
                    }
                };
                xhr.onerror = () => {
                    this.setNegativeUserSumCache(uid, 'network');
                    resolve(null);
                };
                xhr.send(`ci_t=${encodeURIComponent(ci)}&user_id=${encodeURIComponent(uid)}`);
            }));
            this.INFLIGHT_USER_SUM_REQUESTS[uid] = requestPromise;
            try {
                return await requestPromise;
            } finally {
                delete this.INFLIGHT_USER_SUM_REQUESTS[uid];
            }
        },
        updateBlockedUidWriteDiagnostics(reason = '') {
            const pendingEntries = this._blockedUidDirtyUids instanceof Map
                ? this._blockedUidDirtyUids.size
                : 0;
            this.setRuntimeDiagnosticGauge('filter.blockedUidPersist.pendingEntries', pendingEntries);
            this.setRuntimeDiagnosticGauge('filter.blockedUidPersist.timerActive', this._blockedUidWriteTimerId ? 1 : 0);
            this.setRuntimeDiagnosticGauge('filter.blockedUidPersist.writeActive', this._blockedUidWritePromise ? 1 : 0);
            if (reason) this.setRuntimeDiagnosticGauge('filter.blockedUidPersist.lastReason', reason);
        },
        waitForBlockedUidGeneration(generation) {
            if (this._blockedUidPersistedGeneration >= generation) return Promise.resolve();
            if (!Array.isArray(this._blockedUidWriteWaiters)) this._blockedUidWriteWaiters = [];
            return new Promise((resolve, reject) => {
                this._blockedUidWriteWaiters.push({ generation, resolve, reject });
            });
        },
        settleBlockedUidWriteWaiters(generation, error = null) {
            if (!Array.isArray(this._blockedUidWriteWaiters)) return;
            const pending = [];
            this._blockedUidWriteWaiters.forEach((waiter) => {
                if (waiter.generation > generation) {
                    pending.push(waiter);
                    return;
                }
                if (error) waiter.reject(error);
                else waiter.resolve();
            });
            this._blockedUidWriteWaiters = pending;
        },
        scheduleBlockedUidCachePersist(generation) {
            const waiter = this.waitForBlockedUidGeneration(generation);
            if (this._blockedUidWriteTimerId) globalThis.clearTimeout(this._blockedUidWriteTimerId);
            this._blockedUidWriteTimerId = globalThis.setTimeout(() => {
                this._blockedUidWriteTimerId = 0;
                this.updateBlockedUidWriteDiagnostics('timer');
                void this.flushBlockedUidCache('timer').catch((error) => {
                    console.warn('DCinside User Filter: blocked UID cache write failed.', error);
                });
            }, this.BLOCKED_UID_WRITE_DELAY);
            this.updateBlockedUidWriteDiagnostics('scheduled');
            return waiter;
        },
        flushBlockedUidCache(reason = 'manual') {
            if (this._blockedUidWriteTimerId) {
                globalThis.clearTimeout(this._blockedUidWriteTimerId);
                this._blockedUidWriteTimerId = 0;
            }
            if (this._blockedUidWritePromise) {
                const activeWrite = this._blockedUidWritePromise;
                return activeWrite.catch(() => {}).then(() => this.flushBlockedUidCache(reason));
            }

            const generation = this._blockedUidDirtyGeneration;
            if (generation <= this._blockedUidPersistedGeneration) {
                this.updateBlockedUidWriteDiagnostics(reason);
                return Promise.resolve();
            }
            const dirtyUids = this._blockedUidDirtyUids instanceof Map
                ? Array.from(this._blockedUidDirtyUids.entries())
                    .filter(([, dirtyGeneration]) => dirtyGeneration <= generation)
                    .map(([uid]) => uid)
                : [];
            const serializedCache = JSON.stringify(this.BLOCKED_UIDS_CACHE);
            const writePromise = (async () => {
                try {
                    await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCKED_UIDS, serializedCache);
                    this._blockedUidPersistedGeneration = Math.max(this._blockedUidPersistedGeneration, generation);
                    dirtyUids.forEach((uid) => {
                        if (this._blockedUidDirtyUids?.get(uid) <= generation) this._blockedUidDirtyUids.delete(uid);
                    });
                    this.incrementRuntimeDiagnostic('filter.blockedUidPersist.writes');
                    this.incrementRuntimeDiagnostic('filter.blockedUidPersist.entries', dirtyUids.length);
                    this.setRuntimeDiagnosticGauge('filter.blockedUidPersist.lastBatchSize', dirtyUids.length);
                    this.settleBlockedUidWriteWaiters(generation);
                } catch (error) {
                    this.incrementRuntimeDiagnostic('filter.blockedUidPersist.failures');
                    this.settleBlockedUidWriteWaiters(generation, error);
                    throw error;
                } finally {
                    if (this._blockedUidWritePromise === writePromise) this._blockedUidWritePromise = null;
                    this.updateBlockedUidWriteDiagnostics(reason);
                }
            })();
            this._blockedUidWritePromise = writePromise;
            this.updateBlockedUidWriteDiagnostics(reason);
            return writePromise;
        },
        async addBlockedUid(uid, sum, post, comment, ratioBlocked) {
            if (!uid) return;
            const isMobile = this.isMobile();
            if (!isMobile) {
                await this.refreshBlockedUidsCache();
            }
            const nextEntry = { ts: Date.now(), sum, post, comment, ratioBlocked: !!ratioBlocked };
            const currentEntry = this.BLOCKED_UIDS_CACHE[uid];
            if (currentEntry
                && currentEntry.sum === nextEntry.sum
                && currentEntry.post === nextEntry.post
                && currentEntry.comment === nextEntry.comment
                && currentEntry.ratioBlocked === nextEntry.ratioBlocked) {
                return;
            }
            this.BLOCKED_UIDS_CACHE[uid] = nextEntry;
            if (!isMobile) {
                await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCKED_UIDS, JSON.stringify(this.BLOCKED_UIDS_CACHE));
                return;
            }
            const generation = this._blockedUidDirtyGeneration + 1;
            this._blockedUidDirtyGeneration = generation;
            if (!(this._blockedUidDirtyUids instanceof Map)) this._blockedUidDirtyUids = new Map();
            this._blockedUidDirtyUids.set(uid, generation);
            this.incrementRuntimeDiagnostic('filter.blockedUidPersist.queuedEntries');
            await this.scheduleBlockedUidCachePersist(generation);
        },
        async getBlockedGuests() { try { return JSON.parse(await GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCKED_GUESTS, '[]')); } catch { return []; } },
        async setBlockedGuests(list) { await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCKED_GUESTS, JSON.stringify(list)); },
        async addBlockedGuest(ip) {
            if (!ip) return;
            if (!(dcFilterSettings.blockedGuestSet instanceof Set)) {
                dcFilterSettings.blockedGuestSet = new Set(Array.isArray(dcFilterSettings.blockedGuests) ? dcFilterSettings.blockedGuests : []);
            }
            if (dcFilterSettings.blockedGuestSet.has(ip)) return;
            if (!Array.isArray(dcFilterSettings.blockedGuests)) dcFilterSettings.blockedGuests = [];
            dcFilterSettings.blockedGuests.push(ip);
            dcFilterSettings.blockedGuestSet.add(ip);
            await this.setBlockedGuests(dcFilterSettings.blockedGuests);
        },
        async clearBlockedGuests() {
            dcFilterSettings.blockedGuests = [];
            dcFilterSettings.blockedGuestSet = new Set();
            await this.setBlockedGuests([]);
        },
        isUserBlocked({ sum, post, comment }) {
            return DCUF_SHARED_FILTER_CORE.evaluateUserStatsBlock({ sum, post, comment }, dcFilterSettings);
        },
        isUserStatsFilterActive(settings = dcFilterSettings) {
            if (!settings || settings.masterDisabled) return false;

            const threshold = Number(settings.threshold);
            if (Number.isFinite(threshold) && threshold > 0) return true;
            if (!settings.ratioEnabled) return false;

            return [settings.ratioMin, settings.ratioMax].some((value) => {
                const numeric = Number(value);
                return Number.isFinite(numeric) && numeric > 0;
            });
        },
        isCommentListItem(...args) { return __dcufFilterHostAdapter.invokeNative('isCommentListItem', this, ...args); },
        setElementVisibility(...args) { return __dcufFilterHostAdapter.invokeNative('setElementVisibility', this, ...args); },
        async applyBlockFilterToElement(...args) { return __dcufFilterHostAdapter.invokeNative('applyBlockFilterToElement', this, ...args); },
        shouldSkipFiltering(...args) { return __dcufFilterHostAdapter.invokeNative('shouldSkipFiltering', this, ...args); },
        async applyAsyncBlock(...args) { return __dcufFilterHostAdapter.invokeNative('applyAsyncBlock', this, ...args); },
        async refreshBlockedUidsCache(rawValue = null) {
            let data; try { data = JSON.parse(rawValue === null ? await GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCKED_UIDS, '{}') : rawValue); } catch { data = {}; }
            let changed = false;
            if (!data || typeof data !== 'object' || Array.isArray(data)) {
                data = {};
                changed = true;
            }
            const now = Date.now();
            for (const [uid, cacheData] of Object.entries(data)) {
                if (typeof cacheData !== 'object' || cacheData === null || typeof cacheData.ts !== 'number' || now - cacheData.ts > this.BLOCK_UID_EXPIRE) { delete data[uid]; changed = true; }
            }
            this.BLOCKED_UIDS_CACHE = data;
            if (changed) await GM_setValue(this.CONSTANTS.STORAGE_KEYS.BLOCKED_UIDS, JSON.stringify(this.BLOCKED_UIDS_CACHE));
        },
        applySyncBlock(...args) { return __dcufFilterHostAdapter.invokeNative('applySyncBlock', this, ...args); },
        initializeUniversalObserver(...args) { return __dcufFilterHostAdapter.invokeNative('initializeUniversalObserver', this, ...args); },
        loadBootSnapshot() {
            if (this._bootSnapshotPromise) return this._bootSnapshotPromise;
            const keys = this.CONSTANTS.STORAGE_KEYS;
            this._bootSnapshotPromise = Promise.all([
                GM_getValue(keys.BLOCK_CONFIG_MIGRATION_V275_DONE, false),
                GM_getValue(keys.MASTER_DISABLED, false),
                GM_getValue(keys.EXCLUDE_RECOMMENDED, false),
                GM_getValue(keys.THRESHOLD),
                GM_getValue(keys.RATIO_ENABLED, false),
                GM_getValue(keys.RATIO_MIN, ''),
                GM_getValue(keys.RATIO_MAX, ''),
                GM_getValue(keys.BLOCK_PUM_POSTS, false),
                GM_getValue(keys.BLOCK_GUEST, false),
                GM_getValue(keys.BLOCK_PROXY, 0),
                GM_getValue(keys.BLOCK_TELECOM, false),
                GM_getValue(keys.BLOCKED_GUESTS, '[]'),
                GM_getValue(keys.BLOCK_CONFIG, {}),
                GM_getValue(keys.PERSONAL_BLOCK_LIST, { uids: [], nicknames: [], ips: [] }),
                GM_getValue(keys.PERSONAL_BLOCK_ENABLED, true),
                GM_getValue(keys.GALLERY_HEADTEXT_BLOCKS, {}),
                GM_getValue(keys.BLOCKED_UIDS, '{}')
            ]).then((values) => {
                const [
                    migrationDone, masterDisabled, excludeRecommended, rawThreshold, ratioEnabled,
                    ratioMin, ratioMax, blockPumPosts, blockGuestEnabled, proxyBlockMode, telecomBlockEnabled,
                    blockedGuestsRaw, blockConfig, personalBlockList, personalBlockEnabled, galleryHeadtextBlocks, blockedUidsRaw
                ] = values;
                let blockedGuests = [];
                try { blockedGuests = JSON.parse(blockedGuestsRaw); } catch { blockedGuests = []; }
                const snapshot = {
                    migrationDone,
                    masterDisabled,
                    excludeRecommended,
                    threshold: rawThreshold === undefined ? 0 : rawThreshold,
                    thresholdMissing: rawThreshold === undefined,
                    ratioEnabled,
                    ratioMin,
                    ratioMax,
                    blockPumPosts,
                    blockGuestEnabled,
                    proxyBlockMode,
                    telecomBlockEnabled,
                    blockedGuests: Array.isArray(blockedGuests) ? blockedGuests : [],
                    blockConfig,
                    personalBlockList,
                    personalBlockEnabled,
                    galleryHeadtextBlocks,
                    blockedUidsRaw
                };
                this._bootSnapshot = snapshot;
                this.noteBoot('boot.storage-snapshot', { keys: values.length });
                return snapshot;
            }).catch((error) => {
                this._bootSnapshotPromise = null;
                throw error;
            });
            return this._bootSnapshotPromise;
        },
        getBootSnapshot() {
            return this._bootSnapshot || null;
        },
        createSettingsSignature(settings = dcFilterSettings) {
            if (!settings || typeof settings !== 'object') return '';
            const normalizeStrings = (values) => (Array.isArray(values) ? values : [])
                .map((value) => String(value ?? ''))
                .filter(Boolean)
                .sort();
            const personalBlockList = settings.personalBlockList || {};
            return JSON.stringify({
                masterDisabled: Boolean(settings.masterDisabled),
                excludeRecommended: Boolean(settings.excludeRecommended),
                threshold: Number(settings.threshold) || 0,
                ratioEnabled: Boolean(settings.ratioEnabled),
                ratioMin: String(settings.ratioMin ?? ''),
                ratioMax: String(settings.ratioMax ?? ''),
                blockPumPosts: Boolean(settings.blockPumPosts),
                blockGuestEnabled: Boolean(settings.blockGuestEnabled),
                proxyBlockMode: this.normalizeProxyBlockMode(settings.proxyBlockMode),
                telecomBlockEnabled: Boolean(settings.telecomBlockEnabled),
                blockedGuests: normalizeStrings(settings.blockedGuests),
                customIpPrefixes: settings.customIpPrefixSet instanceof Set
                    ? Array.from(settings.customIpPrefixSet, (value) => String(value)).sort()
                    : [],
                personalBlockEnabled: Boolean(settings.personalBlockEnabled),
                personalUids: normalizeStrings((personalBlockList.uids || []).map((item) => item?.id)),
                personalNicknames: normalizeStrings(personalBlockList.nicknames),
                personalIps: normalizeStrings(personalBlockList.ips),
                galleryHeadtextBlocks: settings.galleryHeadtextBlocks || {}
            });
        },
        async reloadSettings(snapshot = null) {
            let values;
            if (snapshot) {
                values = [
                    snapshot.masterDisabled, snapshot.excludeRecommended, snapshot.threshold,
                    snapshot.ratioEnabled, snapshot.ratioMin, snapshot.ratioMax,
                    snapshot.blockPumPosts,
                    snapshot.blockGuestEnabled, snapshot.proxyBlockMode, snapshot.telecomBlockEnabled,
                    snapshot.blockedGuests, snapshot.blockConfig, snapshot.personalBlockList,
                    snapshot.personalBlockEnabled, snapshot.galleryHeadtextBlocks
                ];
            } else {
                values = await Promise.all([
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.MASTER_DISABLED, false),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.EXCLUDE_RECOMMENDED, false),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.THRESHOLD, 0),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.RATIO_ENABLED, false),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.RATIO_MIN, ''),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.RATIO_MAX, ''),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_PUM_POSTS, false),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_GUEST, false),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_PROXY, 0),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_TELECOM, false),
                    this.getBlockedGuests(),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG, {}),
                    PersonalBlockModule.loadPersonalBlocks(),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.PERSONAL_BLOCK_ENABLED, true),
                    GM_getValue(this.CONSTANTS.STORAGE_KEYS.GALLERY_HEADTEXT_BLOCKS, {})
                ]);
            }
            const [
                masterDisabled, excludeRecommended, threshold, ratioEnabled,
                ratioMin, ratioMax, blockPumPosts, blockGuestEnabled, proxyBlockMode, telecomBlockEnabled,
                blockedGuests, blockConfig, personalBlockList, personalBlockEnabled, galleryHeadtextBlocksRaw
            ] = values;
            const normalizedSettings = DCUF_SHARED_STORAGE.normalizeStoredFilterSettings({
                [this.CONSTANTS.STORAGE_KEYS.MASTER_DISABLED]: masterDisabled,
                [this.CONSTANTS.STORAGE_KEYS.EXCLUDE_RECOMMENDED]: excludeRecommended,
                [this.CONSTANTS.STORAGE_KEYS.THRESHOLD]: threshold,
                [this.CONSTANTS.STORAGE_KEYS.RATIO_ENABLED]: ratioEnabled,
                [this.CONSTANTS.STORAGE_KEYS.RATIO_MIN]: ratioMin,
                [this.CONSTANTS.STORAGE_KEYS.RATIO_MAX]: ratioMax,
                [this.CONSTANTS.STORAGE_KEYS.BLOCK_PUM_POSTS]: blockPumPosts,
                [this.CONSTANTS.STORAGE_KEYS.BLOCK_GUEST]: blockGuestEnabled,
                [this.CONSTANTS.STORAGE_KEYS.BLOCK_PROXY]: proxyBlockMode,
                [this.CONSTANTS.STORAGE_KEYS.BLOCK_TELECOM]: telecomBlockEnabled,
                [this.CONSTANTS.STORAGE_KEYS.BLOCK_CONFIG]: blockConfig,
                [this.CONSTANTS.STORAGE_KEYS.PERSONAL_BLOCK_LIST]: personalBlockList,
                [this.CONSTANTS.STORAGE_KEYS.PERSONAL_BLOCK_ENABLED]: personalBlockEnabled
            });
            const customIpPrefixSet = new Set(DCUF_SHARED_STORAGE.parseIpPrefixList(blockConfig?.ip || '', this.CONSTANTS.ETC.MOBILE_IP_MARKER));
            const blockedGuestSet = this.buildLookupSet(blockedGuests);
            const personalBlockUidSet = this.buildLookupSet(personalBlockList?.uids, (item) => item?.id);
            const personalBlockNicknameSet = this.buildLookupSet(personalBlockList?.nicknames);
            const personalBlockIpSet = this.buildLookupSet(personalBlockList?.ips);
            const galleryHeadtextBlocks = this.normalizeGalleryHeadtextBlocks(galleryHeadtextBlocksRaw);
            const galleryKey = this.getGalleryKey();
            const galleryHeadtextBlockSet = new Set(galleryKey ? (galleryHeadtextBlocks[galleryKey] || []) : []);
            dcFilterSettings = {
                masterDisabled: normalizedSettings.masterDisabled,
                excludeRecommended: normalizedSettings.excludeRecommended,
                threshold: normalizedSettings.threshold,
                ratioEnabled: normalizedSettings.ratioEnabled,
                ratioMin: normalizedSettings.ratioMin,
                ratioMax: normalizedSettings.ratioMax,
                blockPumPosts: normalizedSettings.blockPumPosts,
                blockGuestEnabled: normalizedSettings.blockGuest,
                proxyBlockMode: normalizedSettings.proxyBlockMode,
                proxyBlockEnabled: normalizedSettings.proxyBlockMode !== this.PROXY_MODE.OFF,
                telecomBlockEnabled: normalizedSettings.telecomBlockEnabled,
                blockedGuests,
                blockedGuestSet,
                customIpPrefixSet,
                personalBlockList,
                personalBlockUidSet,
                personalBlockNicknameSet,
                personalBlockIpSet,
                personalBlockEnabled,
                galleryHeadtextBlocks,
                galleryKey,
                galleryHeadtextBlockSet
            };
            this._settingsSignature = this.createSettingsSignature(dcFilterSettings);
            if (this.DEBUG_ENABLED) {
                this.debugLog('settings', 'reloadSettings complete', this.debugSettingsSnapshot({
                    rawBlockConfigIp: typeof blockConfig?.ip === 'string' ? blockConfig.ip : '',
                    rawBlockConfigPreview: typeof blockConfig?.ip === 'string' ? blockConfig.ip.split('||').slice(0, 20) : []
                }));
            }
            return dcFilterSettings;
        },
        getRefilterTargetSelectors(...args) { return __dcufFilterHostAdapter.invokeNative('getRefilterTargetSelectors', this, ...args); },
        resolveRefilterRoot(...args) { return __dcufFilterHostAdapter.invokeNative('resolveRefilterRoot', this, ...args); },
        getRefilterTargets(...args) { return __dcufFilterHostAdapter.invokeNative('getRefilterTargets', this, ...args); },
        runSyncRefilterPass(...args) { return __dcufFilterHostAdapter.invokeNative('runSyncRefilterPass', this, ...args); },
        scheduleSyncRefilterPasses(...args) { return __dcufFilterHostAdapter.invokeNative('scheduleSyncRefilterPasses', this, ...args); },
        scheduleCommentStabilizedRefilter(...args) { return __dcufFilterHostAdapter.invokeNative('scheduleCommentStabilizedRefilter', this, ...args); },
        getVisibilityRecoverySurface(...args) { return __dcufFilterHostAdapter.invokeNative('getVisibilityRecoverySurface', this, ...args); },
        captureHiddenVisibilityState(...args) { return __dcufFilterHostAdapter.invokeNative('captureHiddenVisibilityState', this, ...args); },
        getHiddenVisibilitySnapshot(...args) { return __dcufFilterHostAdapter.invokeNative('getHiddenVisibilitySnapshot', this, ...args); },
        isMatchingBfcacheRecovery(...args) { return __dcufFilterHostAdapter.invokeNative('isMatchingBfcacheRecovery', this, ...args); },
        async restoreVisibleState(...args) { return __dcufFilterHostAdapter.invokeNative('restoreVisibleState', this, ...args); },
        async runFullRefilterPass(...args) { return __dcufFilterHostAdapter.invokeNative('runFullRefilterPass', this, ...args); },
        async refilterAllContent(...args) { return __dcufFilterHostAdapter.invokeNative('refilterAllContent', this, ...args); },
        async handleVisibilityChange(...args) { return __dcufFilterHostAdapter.invokeNative('handleVisibilityChange', this, ...args); },
        init(...args) { return __dcufFilterHostAdapter.invokeNative('init', this, ...args); }
    };

    // post-main-fixes.js는 별도 IIFE 스코프라 FilterModule 심볼을 직접 못 잡을 수 있습니다.
    // 유지보수 시 후처리 코드가 FilterModule을 참조해야 하면 이 브리지로 접근하세요.
