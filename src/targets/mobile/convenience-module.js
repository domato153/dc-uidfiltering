    /**
     * Mobile-only convenience features. This module deliberately plugs into the
     * existing list commit and write-form transform paths instead of observing
     * the document on its own.
     */
    const MobileConvenienceModule = {
        STORAGE_KEY: 'dcuf_mobile_convenience_settings_v1',
        DRAFT_KEY: 'dcuf_mobile_write_drafts_v1',
        LIST_SESSION_KEY: 'dcuf:list-return:v1',
        SUBMIT_SESSION_KEY: 'dcuf:pending-submit:v1',
        DEFAULTS: Object.freeze({
            recentHighlight: true,
            draftRecovery: true,
            postPreview: false
        }),
        DRAFT_TTL: 72 * 60 * 60 * 1000,
        DRAFT_MAX_BYTES: 512 * 1024,
        DRAFT_MAX_PER_GALLERY: 5,
        PREVIEW_TTL: 3 * 60 * 1000,
        PREVIEW_MAX: 8,
        settings: null,
        _settingsPromise: null,
        _previewCache: new Map(),
        _previewRequest: null,
        _previewPanel: null,
        _previewSuppressedLink: null,
        _previewClickGuardBound: false,
        _previewWindowScrollHandler: null,
        _previewBoundList: null,
        _previewHoverLink: null,
        _previewCloseTimer: 0,
        _previewImageObserver: null,
        _previewImageTimers: new Set(),
        _previewDeferredTimer: 0,
        _previewViewportHandler: null,
        _previewPointerDownHandler: null,
        _previewPointerMoveHandler: null,
        _previewPointerEndHandler: null,
        _previewOutsideGesture: null,
        _previewAnchor: null,
        _overlayScrollOwners: new Set(),
        _overlayScrollState: null,
        _settingsPanel: null,
        _listNavigationRecorderBound: false,
        _draftWriteQueue: Promise.resolve(),
        _draftStoreCache: null,
        _submitCleanupTimer: 0,

        normalizeSettings(value) {
            const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
            return Object.fromEntries(Object.entries(this.DEFAULTS).map(([key, fallback]) => [
                key,
                typeof source[key] === 'boolean' ? source[key] : fallback
            ]));
        },
        async loadSettings({ force = false } = {}) {
            if (!force && this.settings) return this.settings;
            if (!force && this._settingsPromise) return this._settingsPromise;
            this._settingsPromise = (async () => {
                const raw = await GM_getValue(this.STORAGE_KEY, this.DEFAULTS);
                this.settings = this.normalizeSettings(raw);
                return this.settings;
            })();
            try { return await this._settingsPromise; }
            finally { this._settingsPromise = null; }
        },
        isEnabled(key) {
            return Boolean(this.settings?.[key]);
        },
        async getConvenienceSurfaceSnapshot({ force = false } = {}) {
            const settings = await this.loadSettings({ force });
            return DCUF_UI_CONTRACTS.createSurfaceSnapshot({ settings: { ...settings } }, 'mobile-convenience');
        },
        async commitConvenienceSettings(values) {
            const next = this.normalizeSettings(values);
            await GM_setValue(this.STORAGE_KEY, next);
            this.settings = next;
            return this.getConvenienceSurfaceSnapshot();
        },
        async clearDraftStore() {
            const emptyStore = { version: 1, galleries: {} };
            await GM_setValue(this.DRAFT_KEY, emptyStore);
            this._draftStoreCache = emptyStore;
            return emptyStore;
        },
        async fetchPreviewHtml(url, { signal } = {}) {
            const response = await fetch(url, { credentials: 'same-origin', signal, headers: { Accept: 'text/html' } });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.text();
        },
        captureInlineStyles(element, properties) { return __dcufConvenienceHostAdapter.invokeNative('captureInlineStyles', this, element, properties); },
        restoreInlineStyles(element, snapshot) { return __dcufConvenienceHostAdapter.invokeNative('restoreInlineStyles', this, element, snapshot); },
        syncBackgroundScrollLock() { return __dcufConvenienceHostAdapter.invokeNative('syncBackgroundScrollLock', this); },
        lockBackgroundScroll(owner) { return __dcufConvenienceHostAdapter.invokeNative('lockBackgroundScroll', this, owner); },
        unlockBackgroundScroll(owner) { return __dcufConvenienceHostAdapter.invokeNative('unlockBackgroundScroll', this, owner); },
        async init() { return __dcufConvenienceHostAdapter.invokeNative('init', this); },
        ensureStyles() { return __dcufConvenienceHostAdapter.invokeNative('ensureStyles', this); },
        async showSettings() { return __dcufConvenienceHostAdapter.invokeNative('showSettings', this); },
        closeSettings() { return __dcufConvenienceHostAdapter.invokeNative('closeSettings', this); },
        normalizedListUrl(urlLike) { return __dcufConvenienceHostAdapter.invokeNative('normalizedListUrl', this, urlLike); },
        getPostNoFromLink(link) { return __dcufConvenienceHostAdapter.invokeNative('getPostNoFromLink', this, link); },
        bindList(listContainer) { return __dcufConvenienceHostAdapter.invokeNative('bindList', this, listContainer); },
        ensureListNavigationRecorder() { return __dcufConvenienceHostAdapter.invokeNative('ensureListNavigationRecorder', this); },
        readListRecord() { return __dcufConvenienceHostAdapter.invokeNative('readListRecord', this); },
        findCardByPostNo(listContainer, postNo) { return __dcufConvenienceHostAdapter.invokeNative('findCardByPostNo', this, listContainer, postNo); },
        markRecentCard(listContainer, postNo, options) { return __dcufConvenienceHostAdapter.invokeNative('markRecentCard', this, listContainer, postNo, options); },
        onListCommitted(state) { return __dcufConvenienceHostAdapter.invokeNative('onListCommitted', this, state); },
        cancelPreviewClose() { return __dcufConvenienceHostAdapter.invokeNative('cancelPreviewClose', this); },
        schedulePreviewClose(delay) { return __dcufConvenienceHostAdapter.invokeNative('schedulePreviewClose', this, delay); },
        getPreviewViewportBounds() { return __dcufConvenienceHostAdapter.invokeNative('getPreviewViewportBounds', this); },
        positionPreviewPanel() { return __dcufConvenienceHostAdapter.invokeNative('positionPreviewPanel', this); },
        bindPreviewViewport() { return __dcufConvenienceHostAdapter.invokeNative('bindPreviewViewport', this); },
        unbindPreviewViewport() { return __dcufConvenienceHostAdapter.invokeNative('unbindPreviewViewport', this); },
        isPointInPreviewCorridor(x, y) { return __dcufConvenienceHostAdapter.invokeNative('isPointInPreviewCorridor', this, x, y); },
        bindPreviewPointerTracking() { return __dcufConvenienceHostAdapter.invokeNative('bindPreviewPointerTracking', this); },
        unbindPreviewPointerTracking() { return __dcufConvenienceHostAdapter.invokeNative('unbindPreviewPointerTracking', this); },
        bindPreview(listContainer) { return __dcufConvenienceHostAdapter.invokeNative('bindPreview', this, listContainer); },
        ensurePreviewClickGuard() { return __dcufConvenienceHostAdapter.invokeNative('ensurePreviewClickGuard', this); },
        sanitizePreviewDocument(html, sourceUrl) { return __dcufConvenienceHostAdapter.invokeNative('sanitizePreviewDocument', this, html, sourceUrl); },
        getCachedPreview(url) { return __dcufConvenienceHostAdapter.invokeNative('getCachedPreview', this, url); },
        setCachedPreview(url, html) { return __dcufConvenienceHostAdapter.invokeNative('setCachedPreview', this, url, html); },
        clearPreviewImageRuntime() { return __dcufConvenienceHostAdapter.invokeNative('clearPreviewImageRuntime', this); },
        preparePreviewImages(body, sourceUrl) { return __dcufConvenienceHostAdapter.invokeNative('preparePreviewImages', this, body, sourceUrl); },
        renderPreviewBody(body, html, sourceUrl) { return __dcufConvenienceHostAdapter.invokeNative('renderPreviewBody', this, body, html, sourceUrl); },
        createPreviewPanel(url, title, anchor) { return __dcufConvenienceHostAdapter.invokeNative('createPreviewPanel', this, url, title, anchor); },
        async openPreview(url, title, anchor) { return __dcufConvenienceHostAdapter.invokeNative('openPreview', this, url, title, anchor); },
        closePreview() { return __dcufConvenienceHostAdapter.invokeNative('closePreview', this); },
        sanitizeDraftBodyHtml(html) { return __dcufWriteDraftHostAdapter.normalizeBodyHtml(html); },
        hasDraftContent(draft) { return __dcufWriteDraftHostAdapter.hasDraftContent(draft); },
        normalizeDraftStore(value) {
            const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
            const galleries = source.galleries && typeof source.galleries === 'object' && !Array.isArray(source.galleries) ? source.galleries : {};
            const result = { version: 1, galleries: {} };
            const now = Date.now();
            Object.entries(galleries).forEach(([key, drafts]) => {
                if (!/^(?:board|mgallery|mini):[^:\s]+$/.test(key) || !Array.isArray(drafts)) return;
                const valid = drafts.filter((draft) => draft && typeof draft === 'object'
                    && typeof draft.id === 'string' && Number.isFinite(Number(draft.savedAt))
                    && now - Number(draft.savedAt) <= this.DRAFT_TTL && this.hasDraftContent(draft))
                    .map((draft) => ({
                        id: draft.id, subject: String(draft.subject || ''), bodyHtml: this.sanitizeDraftBodyHtml(draft.bodyHtml),
                        headtext: String(draft.headtext || ''), savedAt: Number(draft.savedAt), pendingSubmit: Boolean(draft.pendingSubmit)
                    }))
                    .sort((a, b) => b.savedAt - a.savedAt).slice(0, this.DRAFT_MAX_PER_GALLERY);
                if (valid.length) result.galleries[key] = valid;
            });
            return result;
        },
        async loadDraftStore({ force = false } = {}) {
            if (!force && this._draftStoreCache) return this.normalizeDraftStore(this._draftStoreCache);
            const store = this.normalizeDraftStore(await GM_getValue(this.DRAFT_KEY, { version: 1, galleries: {} }));
            this._draftStoreCache = store;
            return this.normalizeDraftStore(store);
        },
        queueDraftStoreMutation(mutator) {
            const run = async () => {
                const store = await this.loadDraftStore();
                const result = await mutator(store);
                this._draftStoreCache = this.normalizeDraftStore(store);
                await GM_setValue(this.DRAFT_KEY, store);
                return result;
            };
            const queued = this._draftWriteQueue.then(run, run);
            this._draftWriteQueue = queued.catch(() => undefined);
            return queued;
        },
        draftByteSize(draft) {
            const serialized = JSON.stringify(draft);
            try { return new TextEncoder().encode(serialized).byteLength; } catch { return serialized.length * 2; }
        },
        async upsertDraft(galleryKey, draft) {
            const normalizedDraft = { ...draft, bodyHtml: this.sanitizeDraftBodyHtml(draft?.bodyHtml) };
            if (!galleryKey || this.draftByteSize(normalizedDraft) > this.DRAFT_MAX_BYTES) return { saved: false, reason: 'too-large' };
            if (!this.hasDraftContent(normalizedDraft)) return { saved: false, reason: 'empty' };
            return this.queueDraftStoreMutation(async (store) => {
                const list = (store.galleries[galleryKey] || []).filter((item) => item.id !== normalizedDraft.id);
                list.unshift(normalizedDraft); store.galleries[galleryKey] = list.slice(0, this.DRAFT_MAX_PER_GALLERY);
                return { saved: true, draft: normalizedDraft };
            });
        },
        async removeDraft(galleryKey, draftId) {
            return this.queueDraftStoreMutation(async (store) => {
                const list = (store.galleries[galleryKey] || []).filter((item) => item.id !== draftId);
                if (list.length) store.galleries[galleryKey] = list; else delete store.galleries[galleryKey];
                return { removed: true };
            });
        },
        getDraftFields(form) { return __dcufWriteDraftHostAdapter.getDraftFields(form); },
        getSummernoteCode(form) { return __dcufWriteDraftHostAdapter.getSummernoteCode(form); },
        isCodeViewActive(fields) { return __dcufWriteDraftHostAdapter.isCodeViewActive(fields); },
        readDraftBodyHtml(form) { return __dcufWriteDraftHostAdapter.readDraftBodyHtml(form); },
        readDraftFromForm(form, id, pendingSubmit) { return __dcufWriteDraftHostAdapter.readDraftFromForm(form, id, pendingSubmit); },
        isDraftEmpty(draft) { return !this.hasDraftContent(draft); },
        applyDraftToForm(form, draft) { return __dcufWriteDraftHostAdapter.applyDraftToForm(form, draft); },
        showDraftBanner(message, actions) { return __dcufWriteDraftHostAdapter.showLegacyBanner(message, actions); },
        async attachDraftForm(form) {
            const existing = __dcufWriteDraftHostAdapter.getController(form);
            if (existing) {
                if (existing.readyPromise) await existing.readyPromise;
                return existing;
            }
            const galleryKey = FilterModule.getGalleryKey();
            if (!galleryKey || !this.isEnabled('draftRecovery')) return null;

            const state = {
                connectionId: 0,
                draft: null,
                draftId: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                dirty: false,
                submittingPending: false,
                ready: false,
                readyPromise: null,
            };
            const saveNow = async (pendingSubmit = state.submittingPending) => {
                if (!state.ready || !__dcufWriteDraftHostAdapter.isActive(state.connectionId)) {
                    return { saved: false, reason: 'detached' };
                }
                __dcufWriteDraftHostAdapter.cancelDebounce(state.connectionId);
                state.submittingPending = Boolean(pendingSubmit);
                if (!this.isEnabled('draftRecovery')) return { saved: false, reason: 'disabled' };
                const next = __dcufWriteDraftHostAdapter.readActiveDraft(state.draftId, state.submittingPending, state.connectionId);
                if (!next) return { saved: false, reason: 'detached' };
                state.dirty = false;
                if (this.isDraftEmpty(next)) {
                    if (state.draft) await this.removeDraft(galleryKey, state.draftId);
                    state.draft = null;
                    return { saved: false, reason: 'empty' };
                }
                const result = await this.upsertDraft(galleryKey, next);
                if (result.saved) state.draft = next;
                else if (result.reason === 'too-large') __dcufWriteDraftHostAdapter.showBanner('초안이 512KiB를 넘어 자동 저장하지 않았습니다.');
                return result;
            };
            const flushDirtyDraft = () => {
                if (!state.ready || !state.dirty || !this.isEnabled('draftRecovery')) return;
                void saveNow(state.submittingPending);
            };
            const handleSubmitIntent = () => {
                state.submittingPending = true;
                __dcufWriteDraftHostAdapter.writeSubmitMarker(this.SUBMIT_SESSION_KEY, {
                    version: 2,
                    galleryKey,
                    draftId: state.draftId,
                    submittedAt: Date.now(),
                });
                void saveNow(true).catch((error) => {
                    __dcufWriteDraftHostAdapter.showBanner(`제출 직전 초안 저장에 실패했습니다: ${error?.message || error}`);
                });
            };
            const handleSubmitRecovery = () => {
                const marker = __dcufWriteDraftHostAdapter.readSubmitMarker(this.SUBMIT_SESSION_KEY);
                if (marker?.galleryKey !== galleryKey || marker?.draftId !== state.draftId) return;
                state.submittingPending = false;
                void saveNow(false);
                __dcufWriteDraftHostAdapter.removeSubmitMarker(this.SUBMIT_SESSION_KEY);
            };
            const connection = __dcufWriteDraftHostAdapter.connect(form, {
                onDirty: () => { if (state.ready) state.dirty = true; },
                onSaveRequested: () => saveNow(false),
                onFlushRequested: flushDirtyDraft,
                onSubmitIntent: handleSubmitIntent,
                onSubmitRecovery: handleSubmitRecovery,
                onError: (error) => console.warn('[DCUF draft] host callback failed:', error),
            });
            if (!connection.connected) return null;
            state.connectionId = connection.connectionId;
            const controller = {
                galleryKey,
                saveNow,
                flushNow: flushDirtyDraft,
                destroy: () => {
                    if (__dcufWriteDraftHostAdapter.isActive(state.connectionId)) __dcufWriteDraftHostAdapter.disconnect();
                },
                readyPromise: null,
            };
            Object.defineProperty(controller, 'draftId', { enumerable: true, get: () => state.draftId });
            __dcufWriteDraftHostAdapter.setController(controller, state.connectionId);

            state.readyPromise = (async () => {
                const store = await this.loadDraftStore();
                if (!__dcufWriteDraftHostAdapter.isActive(state.connectionId)) return controller;
                state.draft = (store.galleries[galleryKey] || [])[0] || null;
                if (state.draft) state.draftId = state.draft.id;
                const interruptedSubmit = Boolean(state.draft?.pendingSubmit);
                if (interruptedSubmit) {
                    state.draft = { ...state.draft, pendingSubmit: false, savedAt: Date.now() };
                    await this.upsertDraft(galleryKey, state.draft);
                    if (!__dcufWriteDraftHostAdapter.isActive(state.connectionId)) return controller;
                    const marker = __dcufWriteDraftHostAdapter.readSubmitMarker(this.SUBMIT_SESSION_KEY);
                    if (marker?.galleryKey === galleryKey && marker?.draftId === state.draftId) {
                        __dcufWriteDraftHostAdapter.removeSubmitMarker(this.SUBMIT_SESSION_KEY);
                    }
                }
                const current = __dcufWriteDraftHostAdapter.readActiveDraft(state.draftId, false, state.connectionId);
                if (state.draft && current) {
                    if (this.isDraftEmpty(current)) {
                        __dcufWriteDraftHostAdapter.applyActiveDraft(state.draft, state.connectionId);
                        __dcufWriteDraftHostAdapter.showBanner(interruptedSubmit
                            ? '완료되지 않은 등록의 초안을 복구했습니다.'
                            : '저장된 초안을 자동으로 복구했습니다.');
                    } else {
                        __dcufWriteDraftHostAdapter.showBanner('저장된 초안이 있습니다. 현재 내용을 덮어쓰지 않았습니다.', [
                            { id: 'recover', label: '복구' },
                            { id: 'delete', label: '삭제' },
                        ], async (intent) => {
                            if (!__dcufWriteDraftHostAdapter.isActive(state.connectionId)) return;
                            if (intent === 'recover') {
                                __dcufWriteDraftHostAdapter.applyActiveDraft(state.draft, state.connectionId);
                                __dcufWriteDraftHostAdapter.closeBanner();
                            } else if (intent === 'delete' && state.draft) {
                                await this.removeDraft(galleryKey, state.draft.id);
                                if (!__dcufWriteDraftHostAdapter.isActive(state.connectionId)) return;
                                state.draft = null;
                                state.draftId = `draft-${Date.now()}`;
                                __dcufWriteDraftHostAdapter.closeBanner();
                            }
                        });
                    }
                }
                state.ready = true;
                __dcufWriteDraftHostAdapter.setReady(state.connectionId, true);
                return controller;
            })();
            controller.readyPromise = state.readyPromise;
            await state.readyPromise;
            return controller;
        },
        async confirmPendingDraftOnView() {
            const observation = __dcufWriteDraftHostAdapter.getNavigationObservation();
            const isViewDestination = /\/view(?:\/|$)/.test(observation.pathname);
            const isListDestination = /\/lists(?:\/|$)/.test(observation.pathname);
            if (!isViewDestination && !isListDestination) return;
            const marker = __dcufWriteDraftHostAdapter.readSubmitMarker(this.SUBMIT_SESSION_KEY);
            const galleryKey = FilterModule.getGalleryKey();
            if (!marker || marker.galleryKey !== galleryKey || !marker.draftId || Date.now() - Number(marker.submittedAt) > 10 * 60 * 1000) return;
            const markerVersion = Number(marker.version);
            if (isListDestination) {
                const markerAgeMs = Date.now() - Number(marker.submittedAt);
                const fromWritePage = /\/write(?:\/|$)/.test(observation.referrerPath);
                if (markerVersion !== 2 || markerAgeMs > 2 * 60 * 1000 || observation.navigationType !== 'navigate' || !fromWritePage) return;
            }
            const removeMatchingDraft = async () => {
                this._draftStoreCache = null;
                const store = await this.loadDraftStore({ force: true });
                const pendingDraft = (store.galleries[galleryKey] || []).find((draft) => draft.id === marker.draftId);
                if (pendingDraft && (pendingDraft.pendingSubmit || markerVersion === 2)) {
                    await this.removeDraft(galleryKey, marker.draftId);
                }
                return pendingDraft;
            };
            const pendingDraft = await removeMatchingDraft();
            if (!pendingDraft?.pendingSubmit && markerVersion !== 2) {
                __dcufWriteDraftHostAdapter.removeSubmitMarker(this.SUBMIT_SESSION_KEY);
                return;
            }
            const retryDelays = [120, 480, 1600, 4000];
            const reconcile = async (index = 0) => {
                const currentMarker = __dcufWriteDraftHostAdapter.readSubmitMarker(this.SUBMIT_SESSION_KEY);
                if (currentMarker?.galleryKey !== galleryKey || currentMarker?.draftId !== marker.draftId || Number(currentMarker.version) !== markerVersion) return;
                try { await removeMatchingDraft(); } catch { /* retry at the next interval */ }
                if (index < retryDelays.length - 1) {
                    __dcufWriteDraftHostAdapter.scheduleSuccessCleanup(() => void reconcile(index + 1), retryDelays[index + 1]);
                    return;
                }
                __dcufWriteDraftHostAdapter.removeSubmitMarker(this.SUBMIT_SESSION_KEY);
            };
            __dcufWriteDraftHostAdapter.cancelSuccessCleanup();
            __dcufWriteDraftHostAdapter.scheduleSuccessCleanup(() => void reconcile(0), retryDelays[0]);
        },

    };
