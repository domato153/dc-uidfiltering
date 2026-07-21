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
            listRestore: true,
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
        _masterDisabledSnapshot: false,
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
        _previewPointerMoveHandler: null,
        _previewAnchor: null,
        _overlayScrollOwners: new Set(),
        _overlayScrollState: null,
        _settingsPanel: null,
        _listNavigationRecorderBound: false,
        _listRestoreComplete: false,
        _pageShowPersisted: false,
        _pageShowSettled: false,
        _pageShowPromise: null,
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
        isMasterDisabled() {
            if (typeof dcFilterSettings === 'object' && typeof dcFilterSettings?.masterDisabled === 'boolean') {
                return dcFilterSettings.masterDisabled;
            }
            return this._masterDisabledSnapshot;
        },
        isEnabled(key) {
            return !this.isMasterDisabled() && Boolean(this.settings?.[key]);
        },
        captureInlineStyles(element, properties) {
            return Object.fromEntries(properties.map((property) => [property, {
                value: element.style.getPropertyValue(property),
                priority: element.style.getPropertyPriority(property)
            }]));
        },
        restoreInlineStyles(element, snapshot) {
            Object.entries(snapshot || {}).forEach(([property, state]) => {
                if (state.value) element.style.setProperty(property, state.value, state.priority || '');
                else element.style.removeProperty(property);
            });
        },
        lockBackgroundScroll(owner) {
            if (!owner || this._overlayScrollOwners.has(owner)) return;
            this._overlayScrollOwners.add(owner);
            if (this._overlayScrollOwners.size !== 1) return;
            const root = document.documentElement;
            const body = document.body;
            if (!(root instanceof HTMLElement) || !(body instanceof HTMLElement)) return;
            const x = window.scrollX;
            const y = window.scrollY;
            this._overlayScrollState = {
                x, y,
                root: this.captureInlineStyles(root, ['overflow', 'overscroll-behavior']),
                body: this.captureInlineStyles(body, ['position', 'top', 'left', 'right', 'width', 'overflow', 'overscroll-behavior'])
            };
            root.style.setProperty('overflow', 'hidden', 'important');
            root.style.setProperty('overscroll-behavior', 'none', 'important');
            body.style.setProperty('position', 'fixed', 'important');
            body.style.setProperty('top', `${-y}px`, 'important');
            body.style.setProperty('left', `${-x}px`, 'important');
            body.style.setProperty('right', '0', 'important');
            body.style.setProperty('width', '100%', 'important');
            body.style.setProperty('overflow', 'hidden', 'important');
            body.style.setProperty('overscroll-behavior', 'none', 'important');
        },
        unlockBackgroundScroll(owner) {
            if (!this._overlayScrollOwners.delete(owner) || this._overlayScrollOwners.size) return;
            const state = this._overlayScrollState;
            this._overlayScrollState = null;
            if (!state) return;
            this.restoreInlineStyles(document.documentElement, state.root);
            if (document.body instanceof HTMLElement) this.restoreInlineStyles(document.body, state.body);
            window.scrollTo({ left: state.x, top: state.y, behavior: 'auto' });
        },
        async init() {
            const snapshot = await FilterModule.loadBootSnapshot();
            this._masterDisabledSnapshot = Boolean(snapshot?.masterDisabled);
            await this.loadSettings();
            try { localStorage.removeItem('dcuf:draft-diagnostics:v1'); } catch { /* stale beta trace cleanup */ }
            this.ensureStyles();
            this.initPageShowContract();
            await this.confirmPendingDraftOnView();
            return this.settings;
        },
        initPageShowContract() {
            if (this._pageShowPromise) return this._pageShowPromise;
            this._pageShowPromise = new Promise((resolve) => {
                let settled = false;
                const finish = (persisted = false) => {
                    if (settled) return;
                    settled = true;
                    this._pageShowPersisted = Boolean(persisted);
                    this._pageShowSettled = true;
                    resolve(this._pageShowPersisted);
                };
                window.addEventListener('pageshow', (event) => {
                    this._pageShowPersisted = Boolean(event.persisted);
                    finish(event.persisted);
                });
                window.addEventListener('pagehide', () => {
                    this._pageShowPersisted = false;
                    this._listRestoreComplete = false;
                });
                window.setTimeout(() => finish(false), document.readyState === 'complete' ? 0 : 250);
            });
            return this._pageShowPromise;
        },
        ensureStyles() {
            if (document.getElementById('dcuf-mobile-convenience-style')) return;
            const style = document.createElement('style');
            style.id = 'dcuf-mobile-convenience-style';
            style.textContent = `
                @keyframes dcuf-recent-pulse { 0%,100%{box-shadow:inset 6px 0 0 var(--dcuf-theme-accent,#5574e8),0 0 0 2px var(--dcuf-theme-accent,#5574e8)} 45%{box-shadow:inset 6px 0 0 var(--dcuf-theme-accent,#5574e8),0 0 0 5px var(--dcuf-theme-focus-ring,rgba(85,116,232,.3))} }
                .custom-post-item.dcuf-recent-post { background:color-mix(in srgb,var(--dcuf-theme-accent,#5574e8) 18%,var(--dcuf-theme-card-top,#fff))!important;box-shadow:inset 6px 0 0 var(--dcuf-theme-accent,#5574e8),0 0 0 2px var(--dcuf-theme-accent,#5574e8)!important; }
                .custom-post-item .dcuf-recent-label { display:inline-flex;align-items:center;vertical-align:middle;flex:0 0 auto;margin:0 7px 0 0;padding:2px 7px;border-radius:999px;background:var(--dcuf-theme-accent-strong,#315fdb);color:var(--dcuf-theme-on-accent,#fff);font-size:10px;font-weight:800;line-height:1.45;letter-spacing:-.02em; }
                .custom-post-item.dcuf-recent-pulse { animation:dcuf-recent-pulse .55s ease-in-out 3; }
                #dcuf-post-preview { position:fixed;z-index:2147483645;display:flex;flex-direction:column;box-sizing:border-box;background:linear-gradient(155deg,var(--dcuf-theme-card-top,#fff),var(--dcuf-theme-canvas,#f6f7f9));color:var(--dcuf-theme-fg,#1f2937);border:1px solid var(--dcuf-theme-border-strong,#cbd5e1);border-radius:14px;box-shadow:var(--dcuf-theme-panel-shadow,0 18px 55px #0007);overflow:hidden;overscroll-behavior:contain;color-scheme:light dark; }
                #dcuf-post-preview .dcuf-preview-head { flex:none;display:flex;align-items:center;gap:9px;padding:10px 11px 10px 13px;border-bottom:1px solid var(--dcuf-theme-border,#e4e7ec);background:linear-gradient(180deg,var(--dcuf-theme-card-top,#fff),var(--dcuf-theme-surface-raised,#f8fafc)); }
                #dcuf-post-preview .dcuf-preview-head strong { flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:var(--dcuf-article-title-font-size,21px);line-height:1.4; }
                #dcuf-post-preview .dcuf-preview-head a { flex:none;padding:6px 9px;border-radius:999px;background:var(--dcuf-theme-accent-soft,#e9efff);color:var(--dcuf-theme-accent-strong,#315fdb);text-decoration:none;font-size:12.5px;font-weight:700; }
                #dcuf-post-preview .dcuf-preview-head button { flex:none;width:36px;height:36px;padding:0;border:1px solid transparent;border-radius:10px;background:transparent;color:var(--dcuf-theme-fg-muted,#667085);font-size:21px;cursor:pointer; }
                #dcuf-post-preview .dcuf-preview-head button:hover { border-color:var(--dcuf-theme-border,#e4e7ec);background:var(--dcuf-theme-surface-muted,#f1f3f6);color:var(--dcuf-theme-fg,#1f2937); }
                #dcuf-post-preview .dcuf-preview-body { flex:1 1 auto;min-height:0;box-sizing:border-box;padding:14px;overflow:auto;overscroll-behavior:contain;font-size:var(--dcuf-article-body-font-size,26px);line-height:var(--dcuf-article-body-line-height,1.9);overflow-wrap:anywhere;background:var(--dcuf-theme-surface-input,var(--dcuf-theme-card-top,#fff)); }
                #dcuf-post-preview .dcuf-preview-body img { display:block;max-width:100%;height:auto;margin:10px auto;border-radius:6px; }
                #dcuf-post-preview .dcuf-preview-body img:not([src]) { width:min(100%,360px);min-height:76px;background:linear-gradient(100deg,var(--dcuf-theme-surface-muted,#edf0f4) 20%,var(--dcuf-theme-card-top,#f8fafc) 40%,var(--dcuf-theme-surface-muted,#edf0f4) 60%);background-size:240% 100%;animation:dcuf-preview-image-wait 1.2s linear infinite; }
                #dcuf-post-preview .dcuf-preview-image-error { display:block;margin:10px 0;padding:12px;border:1px dashed var(--dcuf-theme-border-strong,#aab3bf);border-radius:8px;background:var(--dcuf-theme-surface-muted,#f1f3f6);color:var(--dcuf-theme-fg-muted,#667085);text-align:center;text-decoration:none; }
                @keyframes dcuf-preview-image-wait { to { background-position:-240% 0; } }
                #dcuf-post-preview .dcuf-preview-status { color:var(--dcuf-theme-fg-muted,#667085);text-align:center;padding:30px 12px; }
                #dcuf-post-preview.dcuf-preview-sheet { border-radius:18px 18px 0 0; }
                #dcuf-post-preview.dcuf-preview-anchor { width:min(520px,calc(100vw - 24px));max-height:min(620px,calc(100vh - 24px));max-height:min(620px,calc(100dvh - 24px)); }
                #dcuf-mobile-convenience-settings { position:fixed;z-index:2147483646;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;width:min(440px,calc(100vw - 24px));max-height:calc(100vh - 24px);box-sizing:border-box;overflow:hidden;overscroll-behavior:contain;border:1px solid var(--dcuf-theme-border-strong,#cbd2db);border-radius:16px;background:linear-gradient(155deg,var(--dcuf-theme-card-top,#fff),var(--dcuf-theme-canvas,#f6f7f9));color:var(--dcuf-theme-fg,#27313f);box-shadow:var(--dcuf-theme-panel-shadow,0 20px 60px #0005); }
                #dcuf-mobile-convenience-settings .dcuf-convenience-head { flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 17px;border-bottom:1px solid var(--dcuf-theme-border,#d9dde3);background:linear-gradient(180deg,var(--dcuf-theme-card-top,#fff),var(--dcuf-theme-surface-raised,#f7f8fa)); }
                #dcuf-mobile-convenience-settings .dcuf-convenience-title { display:flex;align-items:center;gap:9px;font-size:15px;letter-spacing:-.02em; }
                #dcuf-mobile-convenience-settings .dcuf-convenience-title::before { content:'⚙';display:grid;place-items:center;width:28px;height:28px;border-radius:9px;background:var(--dcuf-theme-accent-soft,#e9efff);color:var(--dcuf-theme-accent-strong,#315fdb);font-size:15px; }
                #dcuf-mobile-convenience-settings .dcuf-convenience-close { width:34px;height:34px;padding:0;border:1px solid transparent;border-radius:10px;background:transparent;color:var(--dcuf-theme-fg-muted,#687384);font-size:21px;line-height:1;cursor:pointer; }
                #dcuf-mobile-convenience-settings .dcuf-convenience-close:hover { border-color:var(--dcuf-theme-border,#d9dde3);background:var(--dcuf-theme-surface-muted,#f1f3f6);color:var(--dcuf-theme-fg,#27313f); }
                #dcuf-mobile-convenience-settings .dcuf-convenience-body { min-height:0;overflow:auto;padding:12px;overscroll-behavior:contain; }
                #dcuf-mobile-convenience-settings .dcuf-convenience-row { display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:8px;padding:11px 12px;border:1px solid var(--dcuf-theme-border,#d9dde3);border-radius:11px;background:linear-gradient(145deg,var(--dcuf-theme-card-top,#fff),var(--dcuf-theme-card-bottom,#fafbfc));box-shadow:0 3px 10px color-mix(in srgb,var(--dcuf-theme-accent,#4263eb) 5%,transparent);cursor:pointer;transition:border-color .16s ease,transform .16s ease; }
                #dcuf-mobile-convenience-settings .dcuf-convenience-row:hover { border-color:color-mix(in srgb,var(--dcuf-theme-accent,#4263eb) 35%,var(--dcuf-theme-border,#d9dde3));transform:translateY(-1px); }
                #dcuf-mobile-convenience-settings .dcuf-convenience-copy { min-width:0; }
                #dcuf-mobile-convenience-settings .dcuf-convenience-copy strong { display:block;font-size:14px;line-height:1.3; }
                #dcuf-mobile-convenience-settings .dcuf-convenience-copy small { display:block;margin-top:3px;color:var(--dcuf-theme-fg-muted,#687384);font-size:11.5px;line-height:1.35; }
                #dcuf-mobile-convenience-settings .dcuf-convenience-toggle { appearance:none;-webkit-appearance:none;position:relative;flex:0 0 auto;width:42px;height:24px;margin:0;border:1px solid var(--dcuf-theme-border-strong,#cbd2db);border-radius:999px;background:var(--dcuf-theme-surface-muted,#eef1f5);cursor:pointer;transition:.18s ease; }
                #dcuf-mobile-convenience-settings .dcuf-convenience-toggle::before { content:'';position:absolute;left:2px;top:2px;width:18px;height:18px;border-radius:50%;background:var(--dcuf-theme-card-top,#fff);box-shadow:0 2px 5px #0003;transition:transform .18s ease; }
                #dcuf-mobile-convenience-settings .dcuf-convenience-toggle:checked { border-color:var(--dcuf-theme-accent-strong,#315fdb);background:linear-gradient(180deg,var(--dcuf-theme-primary-top,#5d87f0),var(--dcuf-theme-accent-strong,#315fdb)); }
                #dcuf-mobile-convenience-settings .dcuf-convenience-toggle:checked::before { transform:translateX(18px);background:var(--dcuf-theme-on-accent,#fff); }
                #dcuf-mobile-convenience-settings :is(button,input):focus-visible { outline:3px solid var(--dcuf-theme-focus-ring,rgba(63,109,224,.18));outline-offset:2px; }
                #dcuf-mobile-convenience-settings .dcuf-convenience-note { margin:4px 1px 0;padding:9px 10px;border-radius:9px;background:var(--dcuf-theme-surface-muted,#f1f3f6);color:var(--dcuf-theme-fg-muted,#687384);font-size:11.5px;line-height:1.45; }
                #dcuf-mobile-convenience-settings .dcuf-convenience-actions { flex:none;display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px;border-top:1px solid var(--dcuf-theme-border,#d9dde3);background:linear-gradient(180deg,var(--dcuf-theme-surface-raised,#f7f8fa),var(--dcuf-theme-card-bottom,#fafbfc)); }
                #dcuf-mobile-convenience-settings .dcuf-convenience-actions button { min-height:42px;padding:9px 12px;border-radius:10px;font-weight:750;cursor:pointer; }
                #dcuf-mobile-convenience-settings .dcuf-convenience-clear { border:1px solid var(--dcuf-theme-border-strong,#cbd2db);background:var(--dcuf-theme-surface-input,#fff);color:var(--dcuf-theme-fg,#27313f); }
                #dcuf-mobile-convenience-settings .dcuf-convenience-save { border:1px solid var(--dcuf-theme-accent-strong,#315fdb);background:linear-gradient(180deg,var(--dcuf-theme-primary-top,#5d87f0),var(--dcuf-theme-accent-strong,#315fdb));color:var(--dcuf-theme-on-accent,#fff);box-shadow:0 7px 15px var(--dcuf-theme-accent-shadow,rgba(49,95,219,.24)); }
                #dcuf-mobile-convenience-settings .dcuf-convenience-actions button:disabled { opacity:.58;cursor:wait; }
                #dcuf-draft-banner { color:var(--dcuf-theme-fg,#20242a);background:var(--dcuf-theme-card-top,#fff); }
                #dcuf-draft-banner { position:fixed;z-index:2147483644;top:12px;left:50%;transform:translateX(-50%);width:min(520px,calc(100vw - 24px));box-sizing:border-box;padding:11px 12px;border:1px solid #9aa7b7;border-radius:10px;box-shadow:0 10px 35px #0005;display:flex;align-items:center;gap:8px; }
                #dcuf-draft-banner span { flex:1;min-width:0; }
                #dcuf-draft-banner button { padding:6px 9px;border:1px solid #aab3bf;border-radius:6px;background:#f8fafc;color:#20242a;cursor:pointer; }
                body.dc-filter-dark-mode #dcuf-draft-banner { background:#171a20;color:#e7edf6;border-color:#475263; }
                @media (prefers-color-scheme:dark) {
                    body:not(.dc-filter-light-mode) #dcuf-post-preview,body:not(.dc-filter-light-mode) #dcuf-mobile-convenience-settings,body:not(.dc-filter-light-mode) #dcuf-draft-banner { color-scheme:dark; }
                }
            `;
            (document.head || document.documentElement).appendChild(style);
        },
        async showSettings() {
            await this.loadSettings({ force: true });
            this.ensureStyles();
            this.closeSettings();
            const panel = document.createElement('section');
            panel.id = 'dcuf-mobile-convenience-settings';
            panel.className = 'dcuf-settings-panel dcuf-convenience-panel';
            panel.setAttribute('role', 'dialog');
            panel.setAttribute('aria-modal', 'true');
            const header = document.createElement('div');
            header.className = 'dcuf-convenience-head dcuf-settings-header';
            const title = document.createElement('strong'); title.id = 'dcuf-convenience-title'; title.className = 'dcuf-convenience-title'; title.textContent = '모바일 편의기능 설정';
            panel.setAttribute('aria-labelledby', title.id);
            const close = document.createElement('button'); close.type = 'button'; close.className = 'dcuf-convenience-close'; close.textContent = '✕'; close.setAttribute('aria-label', '편의기능 설정 닫기'); close.onclick = () => this.closeSettings();
            header.append(title, close); panel.appendChild(header);
            const body = document.createElement('div'); body.className = 'dcuf-convenience-body dcuf-settings-body';
            const labels = {
                listRestore: ['목록 스크롤 위치 복원', '뒤로 왔을 때 열었던 글 위치로 복귀'],
                recentHighlight: ['마지막으로 열어본 글 표시', '뒤로 돌아왔을 때 해당 글 카드를 테마색으로 표시'],
                draftRecovery: ['글쓰기 초안 저장·복구', '제목·본문·말머리만 저장'],
                postPreview: ['글 미리보기', '마우스 대기 또는 터치 길게 누르기']
            };
            const controls = {};
            Object.entries(labels).forEach(([key, [name, detail]]) => {
                const label = document.createElement('label');
                label.className = 'dcuf-convenience-row dcuf-settings-section';
                const text = document.createElement('span'); text.className = 'dcuf-convenience-copy';
                const strong = document.createElement('strong'); strong.textContent = name;
                const small = document.createElement('small'); small.textContent = detail;
                text.append(strong, small);
                const input = document.createElement('input'); input.type = 'checkbox'; input.className = 'dcuf-convenience-toggle'; input.checked = this.settings[key]; input.setAttribute('aria-label', name);
                controls[key] = input; label.append(text, input); body.appendChild(label);
            });
            const note = document.createElement('p'); note.className = 'dcuf-convenience-note dcuf-settings-help'; note.textContent = '모든 기능 끄기는 선택값을 지우지 않고 실행만 멈춥니다.'; body.appendChild(note);
            panel.appendChild(body);
            const actions = document.createElement('div'); actions.className = 'dcuf-convenience-actions dcuf-settings-footer';
            const clearDrafts = document.createElement('button'); clearDrafts.type = 'button'; clearDrafts.className = 'dcuf-convenience-clear'; clearDrafts.textContent = '저장된 초안 삭제';
            clearDrafts.onclick = async () => {
                if (!window.confirm('저장된 모바일 글쓰기 초안을 모두 삭제할까요?')) return;
                const emptyStore = { version: 1, galleries: {} };
                await GM_setValue(this.DRAFT_KEY, emptyStore);
                this._draftStoreCache = emptyStore;
                clearDrafts.textContent = '삭제됨';
            };
            const save = document.createElement('button'); save.type = 'button'; save.className = 'dcuf-convenience-save'; save.textContent = '저장';
            save.onclick = async () => {
                save.disabled = true;
                const next = Object.fromEntries(Object.keys(this.DEFAULTS).map((key) => [key, controls[key].checked]));
                await GM_setValue(this.STORAGE_KEY, next);
                this.settings = this.normalizeSettings(next);
                window.dispatchEvent(new CustomEvent('dcuf:convenience-settings-change', { detail: this.settings }));
                this.closeSettings();
            };
            actions.append(clearDrafts, save); panel.appendChild(actions); document.body.appendChild(panel);
            this._settingsPanel = panel;
            this.lockBackgroundScroll('settings');
        },
        closeSettings() {
            (this._settingsPanel || document.getElementById('dcuf-mobile-convenience-settings'))?.remove();
            this._settingsPanel = null;
            this.unlockBackgroundScroll('settings');
        },

        normalizedListUrl(urlLike = window.location.href) {
            try { const url = new URL(urlLike, window.location.href); url.hash = ''; return url.href; }
            catch { return String(urlLike || ''); }
        },
        getPostNoFromLink(link) {
            try { return new URL(link.href, window.location.href).searchParams.get('no') || ''; }
            catch { return ''; }
        },
        bindList(listContainer) {
            if (!(listContainer instanceof HTMLElement) || listContainer.dataset.dcufConvenienceBound === '1') return;
            listContainer.dataset.dcufConvenienceBound = '1';
            this.bindPreview(listContainer);
            this.ensureListNavigationRecorder();
        },
        ensureListNavigationRecorder() {
            if (this._listNavigationRecorderBound) return;
            this._listNavigationRecorderBound = true;
            document.addEventListener('click', (event) => {
                const link = event.target instanceof Element ? event.target.closest('a.post-title-link') : null;
                const listContainer = link?.closest('.custom-mobile-list');
                if (!(link instanceof HTMLAnchorElement) || !(listContainer instanceof HTMLElement)) return;
                if (link === this._previewSuppressedLink) return;
                if (this.isMasterDisabled() || (!this.settings?.listRestore && !this.settings?.recentHighlight)) return;
                const card = link.closest('.custom-post-item');
                const postNo = this.getPostNoFromLink(link);
                const record = {
                    listUrl: this.normalizedListUrl(), postUrl: link.href, postNo,
                    offset: card instanceof HTMLElement ? card.getBoundingClientRect().top : 0,
                    scrollY: window.scrollY, savedAt: Date.now()
                };
                try { sessionStorage.setItem(this.LIST_SESSION_KEY, JSON.stringify(record)); } catch { /* unavailable */ }
                this._listRestoreComplete = false;
                this.markRecentCard(listContainer, postNo, { pulse: false });
            }, true);
        },
        readListRecord() {
            try {
                const record = JSON.parse(sessionStorage.getItem(this.LIST_SESSION_KEY) || 'null');
                if (!record || record.listUrl !== this.normalizedListUrl() || Date.now() - Number(record.savedAt) > 12 * 60 * 60 * 1000) return null;
                return record;
            } catch { return null; }
        },
        findCardByPostNo(listContainer, postNo) {
            if (!postNo) return null;
            return Array.from(listContainer.querySelectorAll('.custom-post-item')).find((card) => {
                const link = card.querySelector('a.post-title-link');
                return link instanceof HTMLAnchorElement && this.getPostNoFromLink(link) === String(postNo);
            }) || null;
        },
        getNavigationType() {
            try { return performance.getEntriesByType('navigation')[0]?.type || ''; }
            catch { return ''; }
        },
        markRecentCard(listContainer, postNo, { pulse = false } = {}) {
            if (!this.settings?.recentHighlight || this.isMasterDisabled()) return;
            listContainer.querySelectorAll('.dcuf-recent-post,.dcuf-recent-pulse').forEach((node) => node.classList.remove('dcuf-recent-post', 'dcuf-recent-pulse'));
            listContainer.querySelectorAll('.dcuf-recent-label').forEach((node) => node.remove());
            const card = this.findCardByPostNo(listContainer, postNo);
            if (!(card instanceof HTMLElement)) return;
            card.classList.add('dcuf-recent-post');
            const title = card.querySelector('.post-title');
            if (title instanceof HTMLElement) {
                const label = document.createElement('span');
                label.className = 'dcuf-recent-label'; label.textContent = '방금 본 글';
                title.prepend(label);
            }
            if (pulse) {
                card.classList.add('dcuf-recent-pulse');
                window.setTimeout(() => card.classList.remove('dcuf-recent-pulse'), 2000);
            }
        },
        onListCommitted(state) {
            const list = state?.newListContainer;
            if (!(list instanceof HTMLElement)) return;
            this.bindList(list);
            const record = this.readListRecord();
            if (record) this.markRecentCard(list, record.postNo, { pulse: false });
            if (this._listRestoreComplete || !record || !this.isEnabled('listRestore')) return;
            this._listRestoreComplete = true;
            // A reload must preserve the user's current browser scroll position,
            // not jump back to the last post that happened to be opened. Keep
            // this decision and any non-persisted restore synchronous with the
            // list commit so the ready/reveal frame cannot paint an intermediate
            // position while waiting for a pageshow promise.
            if (this.getNavigationType() === 'reload') return;
            const persisted = this._pageShowPersisted;
            const card = this.findCardByPostNo(list, record.postNo);
            if (!(card instanceof HTMLElement)) return;
            if (!persisted) {
                const top = card.getBoundingClientRect().top;
                window.scrollTo({ top: Math.max(0, window.scrollY + top - Number(record.offset || 0)), behavior: 'auto' });
            }
            this.markRecentCard(list, record.postNo, { pulse: true });
        },

        cancelPreviewClose() {
            if (this._previewCloseTimer) window.clearTimeout(this._previewCloseTimer);
            this._previewCloseTimer = 0;
        },
        schedulePreviewClose(delay = 320) {
            if (!this._previewPanel?.classList.contains('dcuf-preview-anchor')) return;
            if (this._previewCloseTimer) return;
            this._previewCloseTimer = window.setTimeout(() => {
                this._previewCloseTimer = 0;
                this.closePreview();
            }, Math.max(0, Number(delay) || 0));
        },
        getPreviewViewportBounds() {
            const viewport = window.visualViewport;
            const left = Number(viewport?.offsetLeft) || 0;
            const top = Number(viewport?.offsetTop) || 0;
            const width = Math.max(1, Number(viewport?.width) || window.innerWidth || document.documentElement.clientWidth || 1);
            const height = Math.max(1, Number(viewport?.height) || window.innerHeight || document.documentElement.clientHeight || 1);
            return { left, top, width, height, right: left + width, bottom: top + height };
        },
        positionPreviewPanel() {
            const panel = this._previewPanel;
            const anchor = this._previewAnchor;
            if (!(panel instanceof HTMLElement) || !anchor) return;
            const bounds = this.getPreviewViewportBounds();
            const mobile = panel.classList.contains('dcuf-preview-sheet');
            if (mobile) {
                const width = Math.max(1, bounds.width);
                const maxHeight = Math.max(1, Math.min(bounds.height, bounds.height * 0.78));
                Object.assign(panel.style, {
                    left: `${Math.round(bounds.left)}px`, right: 'auto', bottom: 'auto',
                    width: `${Math.floor(width)}px`, maxHeight: `${Math.floor(maxHeight)}px`
                });
                const height = Math.min(maxHeight, panel.getBoundingClientRect().height || maxHeight);
                panel.style.top = `${Math.max(bounds.top, bounds.bottom - height)}px`;
                return;
            }
            const margin = 12;
            const width = Math.max(1, Math.min(520, bounds.width - margin * 2));
            const maxHeight = Math.max(1, Math.min(620, bounds.height - margin * 2));
            Object.assign(panel.style, { width: `${Math.floor(width)}px`, maxHeight: `${Math.floor(maxHeight)}px`, right: 'auto', bottom: 'auto' });
            const height = Math.min(maxHeight, panel.getBoundingClientRect().height || maxHeight);
            const anchorX = Number(anchor.x) || bounds.left + margin;
            const anchorY = Number(anchor.y) || bounds.top + margin;
            let left = anchorX + 12;
            if (left + width > bounds.right - margin) left = anchorX - width - 12;
            left = Math.max(bounds.left + margin, Math.min(left, bounds.right - width - margin));
            let top = anchorY + 12;
            if (top + height > bounds.bottom - margin && anchorY - height - 12 >= bounds.top + margin) top = anchorY - height - 12;
            top = Math.max(bounds.top + margin, Math.min(top, bounds.bottom - height - margin));
            Object.assign(panel.style, { left: `${Math.round(left)}px`, top: `${Math.round(top)}px` });
        },
        bindPreviewViewport() {
            this.unbindPreviewViewport();
            const reposition = () => this.positionPreviewPanel();
            this._previewViewportHandler = reposition;
            window.addEventListener('resize', reposition, { passive: true });
            window.visualViewport?.addEventListener('resize', reposition, { passive: true });
            window.visualViewport?.addEventListener('scroll', reposition, { passive: true });
        },
        unbindPreviewViewport() {
            if (!this._previewViewportHandler) return;
            window.removeEventListener('resize', this._previewViewportHandler);
            window.visualViewport?.removeEventListener('resize', this._previewViewportHandler);
            window.visualViewport?.removeEventListener('scroll', this._previewViewportHandler);
            this._previewViewportHandler = null;
        },
        isPointInPreviewCorridor(x, y) {
            const panel = this._previewPanel;
            const link = this._previewHoverLink;
            if (!(panel instanceof HTMLElement) || !(link instanceof HTMLElement) || !link.isConnected) return false;
            const panelRect = panel.getBoundingClientRect();
            const linkRect = link.getBoundingClientRect();
            const pad = 14;
            const left = Math.min(panelRect.left, linkRect.left) - pad;
            const right = Math.max(panelRect.right, linkRect.right) + pad;
            const top = Math.min(panelRect.top, linkRect.top) - pad;
            const bottom = Math.max(panelRect.bottom, linkRect.bottom) + pad;
            return x >= left && x <= right && y >= top && y <= bottom;
        },
        bindPreviewPointerTracking() {
            this.unbindPreviewPointerTracking();
            if (!this._previewPanel?.classList.contains('dcuf-preview-anchor')) return;
            this._previewPointerMoveHandler = (event) => {
                const target = event.target instanceof Node ? event.target : null;
                if (target && (this._previewPanel?.contains(target) || this._previewHoverLink?.contains(target))) {
                    this.cancelPreviewClose();
                    return;
                }
                if (this.isPointInPreviewCorridor(event.clientX, event.clientY)) this.schedulePreviewClose(320);
                else this.schedulePreviewClose(100);
            };
            document.addEventListener('pointermove', this._previewPointerMoveHandler, { passive: true, capture: true });
        },
        unbindPreviewPointerTracking() {
            if (!this._previewPointerMoveHandler) return;
            document.removeEventListener('pointermove', this._previewPointerMoveHandler, true);
            this._previewPointerMoveHandler = null;
        },
        bindPreview(listContainer) {
            if (!(listContainer instanceof HTMLElement) || listContainer.dataset.dcufPreviewBound === '1') return;
            listContainer.dataset.dcufPreviewBound = '1';
            this.ensurePreviewClickGuard();
            let timer = 0;
            let touch = null;
            const cancel = () => { if (timer) window.clearTimeout(timer); timer = 0; touch = null; };
            const startMouse = (link, anchor) => {
                cancel();
                this.cancelPreviewClose();
                if (this._previewPanel?.dataset.sourceUrl === link.href) {
                    this._previewHoverLink = link;
                    return;
                }
                timer = window.setTimeout(() => {
                    timer = 0;
                    if (!this.isEnabled('postPreview')) return;
                    void this.openPreview(link.href, link.textContent.trim(), { ...anchor, link });
                }, 400);
            };
            listContainer.addEventListener('pointerover', (event) => {
                if (event.pointerType !== 'mouse' || !window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
                const link = event.target instanceof Element ? event.target.closest('a.post-title-link') : null;
                if (!(link instanceof HTMLAnchorElement) || (event.relatedTarget instanceof Node && link.contains(event.relatedTarget))) return;
                startMouse(link, { x: event.clientX, y: event.clientY, mobile: false });
            });
            listContainer.addEventListener('pointerout', (event) => {
                const link = event.target instanceof Element ? event.target.closest('a.post-title-link') : null;
                if (!link || (event.relatedTarget instanceof Node && link.contains(event.relatedTarget))) return;
                cancel();
                if (event.relatedTarget instanceof Node && this._previewPanel?.contains(event.relatedTarget)) return;
                if (this._previewHoverLink === link) this.schedulePreviewClose();
            });
            listContainer.addEventListener('pointerdown', (event) => {
                if (event.pointerType === 'mouse' || !this.isEnabled('postPreview')) return;
                const link = event.target instanceof Element ? event.target.closest('a.post-title-link') : null;
                if (!(link instanceof HTMLAnchorElement)) return;
                cancel();
                touch = { link, id: event.pointerId, x: event.clientX, y: event.clientY, startedAt: Date.now(), completed: false };
                timer = window.setTimeout(() => {
                    if (!touch || touch.link !== link || touch.id !== event.pointerId || !this.isEnabled('postPreview')) return;
                    timer = 0;
                    touch.completed = true;
                    this._previewSuppressedLink = link;
                    window.setTimeout(() => {
                        if (this._previewSuppressedLink === link) this._previewSuppressedLink = null;
                    }, 1200);
                    void this.openPreview(link.href, link.textContent.trim(), { x: event.clientX, y: event.clientY, mobile: true });
                }, 500);
            }, { passive: true });
            listContainer.addEventListener('pointermove', (event) => {
                if (!touch || touch.id !== event.pointerId) return;
                if (Math.hypot(event.clientX - touch.x, event.clientY - touch.y) > 12) cancel();
            }, { passive: true });
            listContainer.addEventListener('pointerup', cancel, { passive: true });
            listContainer.addEventListener('pointercancel', cancel, { passive: true });
            listContainer.addEventListener('scroll', cancel, { passive: true });
            listContainer.addEventListener('contextmenu', (event) => {
                const link = event.target instanceof Element ? event.target.closest('a.post-title-link') : null;
                const previewTouchOwnsGesture = this.isEnabled('postPreview')
                    && (touch?.link === link || link === this._previewSuppressedLink);
                if (!link || !previewTouchOwnsGesture) return;
                // Mobile Chromium can emit contextmenu slightly before its own
                // nominal long-press threshold. Claim it from pointerdown, not
                // only after our 500 ms timer, so the native callout never races
                // the preview. Movement/scroll clears `touch`, restoring the
                // browser menu for a gesture that DCUF no longer owns.
                event.preventDefault(); event.stopImmediatePropagation();
            }, true);
            if (this._previewWindowScrollHandler) {
                window.removeEventListener('scroll', this._previewWindowScrollHandler, true);
            }
            this._previewWindowScrollHandler = (event) => {
                cancel();
                if (!this._previewPanel?.classList.contains('dcuf-preview-anchor')) return;
                if (event.target instanceof Node && this._previewPanel.contains(event.target)) return;
                this.closePreview();
            };
            this._previewBoundList = listContainer;
            window.addEventListener('scroll', this._previewWindowScrollHandler, { passive: true, capture: true });
        },
        ensurePreviewClickGuard() {
            if (this._previewClickGuardBound) return;
            this._previewClickGuardBound = true;
            document.addEventListener('click', (event) => {
                const link = event.target instanceof Element ? event.target.closest('a.post-title-link') : null;
                if (link && link === this._previewSuppressedLink) {
                    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
                    this._previewSuppressedLink = null;
                    return;
                }
                if (!this._previewPanel || !(event.target instanceof Node) || this._previewPanel.contains(event.target)) return;
                this.closePreview();
            }, true);
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape' && this._previewPanel) this.closePreview();
            }, true);
        },
        sanitizePreviewDocument(html, sourceUrl) {
            const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
            const source = doc.querySelector('#dgn_content_de, .writing_view_box .write_div, .gallview_contents .write_div, .view_content_wrap .write_div, .gallview_contents, .writing_view_box');
            if (!(source instanceof Element)) throw new Error('본문 영역을 찾지 못했습니다.');
            const clone = source.cloneNode(true);
            clone.querySelectorAll('.captcha,#kcaptcha,[class*="captcha"],.kap_codeimg,.btn_recommend_box,.btn_recommend,.recommend_box,#recommend_box,#recomAjax,.gall_writer,.gallview_head,.view_bottom_btnbox,.view_bottom,.gallview_bottom,.recom_bottom_box,.vote_box,.appending_file,.write_ban,.write_div_bottom,.view_comment,.comment_wrap,.cmt_write_box').forEach((node) => node.remove());
            const auxiliaryLabel = /^(?:추천\s*검색|원본\s*첨부파일(?:\s*\d+)?)$/;
            Array.from(clone.querySelectorAll('*')).reverse().forEach((node) => {
                const text = String(node.textContent || '').replace(/\s+/g, ' ').trim();
                if (auxiliaryLabel.test(text)) node.remove();
            });
            clone.querySelectorAll('script,style,form,iframe,object,embed,input,textarea,select,button,noscript,svg,math,foreignObject,canvas,source,track').forEach((node) => node.remove());
            clone.querySelectorAll('video,audio').forEach((node) => {
                const link = doc.createElement('a'); link.href = sourceUrl; link.textContent = '미디어는 원문에서 보기'; node.replaceWith(link);
            });
            clone.querySelectorAll('picture').forEach((picture) => {
                const image = picture.querySelector('img');
                if (image) picture.replaceWith(image); else picture.remove();
            });
            const allowedTags = new Set(['A', 'B', 'BLOCKQUOTE', 'BR', 'CODE', 'DEL', 'DIV', 'EM', 'FIGCAPTION', 'FIGURE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR', 'I', 'IMG', 'LI', 'OL', 'P', 'PRE', 'S', 'SMALL', 'SPAN', 'STRONG', 'SUB', 'SUP', 'TABLE', 'TBODY', 'TD', 'TFOOT', 'TH', 'THEAD', 'TR', 'U', 'UL']);
            Array.from(clone.querySelectorAll('*')).reverse().forEach((node) => {
                if (!allowedTags.has(node.tagName)) node.replaceWith(...node.childNodes);
            });
            clone.querySelectorAll('img').forEach((image) => {
                const candidates = [image.getAttribute('data-original'), image.getAttribute('data-src'), image.getAttribute('src')].filter(Boolean);
                let resolved = null;
                for (const candidate of candidates) {
                    try {
                        const next = new URL(candidate, sourceUrl);
                        if (!['http:', 'https:', 'data:', 'blob:'].includes(next.protocol)) continue;
                        if (/(?:kcap_none|fix_nik|loading)(?:\.[a-z]+)?(?:$|[?#])/i.test(next.href)) continue;
                        resolved = next; break;
                    } catch { /* try the next lazy-image source */ }
                }
                if (!resolved) { image.remove(); return; }
                Array.from(image.attributes).forEach((attr) => image.removeAttribute(attr.name));
                image.dataset.dcufPreviewSrc = resolved.href;
                image.alt = '미리보기 이미지';
                image.loading = 'lazy'; image.decoding = 'async';
            });
            clone.querySelectorAll('a').forEach((anchor) => {
                const href = anchor.getAttribute('href');
                Array.from(anchor.attributes).forEach((attr) => anchor.removeAttribute(attr.name));
                if (!href) return;
                try {
                    const resolved = new URL(href, sourceUrl);
                    if (!['http:', 'https:'].includes(resolved.protocol)) return;
                    anchor.href = resolved.href; anchor.rel = 'noopener noreferrer';
                } catch { /* leave as plain text */ }
            });
            clone.querySelectorAll(':not(img):not(a)').forEach((node) => {
                Array.from(node.attributes).forEach((attr) => node.removeAttribute(attr.name));
            });
            return clone.innerHTML;
        },
        getCachedPreview(url) {
            const item = this._previewCache.get(url);
            if (!item || Date.now() - item.savedAt > this.PREVIEW_TTL) { this._previewCache.delete(url); return null; }
            this._previewCache.delete(url); this._previewCache.set(url, item);
            return item.html;
        },
        setCachedPreview(url, html) {
            this._previewCache.delete(url); this._previewCache.set(url, { html, savedAt: Date.now() });
            while (this._previewCache.size > this.PREVIEW_MAX) this._previewCache.delete(this._previewCache.keys().next().value);
        },
        clearPreviewImageRuntime() {
            this._previewImageObserver?.disconnect(); this._previewImageObserver = null;
            if (this._previewDeferredTimer) window.clearTimeout(this._previewDeferredTimer);
            this._previewDeferredTimer = 0;
            this._previewImageTimers.forEach((timer) => window.clearTimeout(timer));
            this._previewImageTimers.clear();
        },
        preparePreviewImages(body, sourceUrl) {
            this.clearPreviewImageRuntime();
            if (!(body instanceof HTMLElement)) return;
            const images = Array.from(body.querySelectorAll('img[data-dcuf-preview-src]'));
            const loadImage = (image) => {
                if (!(image instanceof HTMLImageElement) || image.dataset.dcufPreviewState === 'loading') return;
                const src = image.dataset.dcufPreviewSrc;
                if (!src) { image.remove(); return; }
                image.dataset.dcufPreviewState = 'loading';
                const fail = () => {
                    if (image.dataset.dcufPreviewState === 'loaded' || image.dataset.dcufPreviewState === 'error') return;
                    image.dataset.dcufPreviewState = 'error';
                    const timer = Number(image.dataset.dcufPreviewTimer || 0);
                    if (timer) { window.clearTimeout(timer); this._previewImageTimers.delete(timer); }
                    if (!image.isConnected) return;
                    const link = document.createElement('a'); link.className = 'dcuf-preview-image-error';
                    link.href = sourceUrl; link.rel = 'noopener noreferrer'; link.textContent = '이미지를 불러오지 못했습니다 · 원문에서 보기';
                    image.replaceWith(link);
                    this.positionPreviewPanel();
                };
                const done = () => {
                    if (image.dataset.dcufPreviewState === 'error') return;
                    const timer = Number(image.dataset.dcufPreviewTimer || 0);
                    if (timer) { window.clearTimeout(timer); this._previewImageTimers.delete(timer); }
                    image.dataset.dcufPreviewState = 'loaded'; image.removeAttribute('data-dcuf-preview-timer');
                    this.positionPreviewPanel();
                };
                image.addEventListener('load', done, { once: true });
                image.addEventListener('error', fail, { once: true });
                const timer = window.setTimeout(fail, 12000);
                this._previewImageTimers.add(timer); image.dataset.dcufPreviewTimer = String(timer);
                image.src = src;
            };
            images.slice(0, 2).forEach(loadImage);
            const deferred = images.slice(2);
            if (!deferred.length) return;
            if (typeof IntersectionObserver !== 'function') { deferred.forEach(loadImage); return; }
            this._previewImageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    observer.unobserve(entry.target); loadImage(entry.target);
                });
            }, { root: body, rootMargin: '320px 0px', threshold: 0.01 });
            deferred.forEach((image) => this._previewImageObserver.observe(image));
            this._previewDeferredTimer = window.setTimeout(() => {
                this._previewDeferredTimer = 0;
                this._previewImageObserver?.disconnect(); this._previewImageObserver = null;
                deferred.forEach(loadImage);
            }, 1200);
        },
        renderPreviewBody(body, html, sourceUrl) {
            if (!(body instanceof HTMLElement)) return;
            body.innerHTML = html || '<div class="dcuf-preview-status">표시할 본문이 없습니다.</div>';
            this.preparePreviewImages(body, sourceUrl);
            this.positionPreviewPanel();
        },
        createPreviewPanel(url, title, anchor) {
            this.closePreview();
            const panel = document.createElement('aside'); panel.id = 'dcuf-post-preview';
            const mobile = anchor?.mobile || !window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
            panel.classList.add(mobile ? 'dcuf-preview-sheet' : 'dcuf-preview-anchor');
            const head = document.createElement('div'); head.className = 'dcuf-preview-head';
            const heading = document.createElement('strong'); heading.textContent = title || '글 미리보기';
            const original = document.createElement('a'); original.href = url; original.textContent = '원문 열기';
            const close = document.createElement('button'); close.type = 'button'; close.textContent = '✕'; close.setAttribute('aria-label', '미리보기 닫기'); close.onclick = () => this.closePreview();
            head.append(heading, original, close);
            const body = document.createElement('div'); body.className = 'dcuf-preview-body'; body.innerHTML = '<div class="dcuf-preview-status">불러오는 중…</div>';
            panel.append(head, body); document.body.appendChild(panel);
            panel.dataset.sourceUrl = url;
            this._previewPanel = panel;
            this._previewHoverLink = anchor?.link instanceof HTMLAnchorElement ? anchor.link : null;
            this._previewAnchor = { ...anchor, mobile };
            if (mobile) this.lockBackgroundScroll('preview');
            if (!mobile) {
                panel.addEventListener('pointerenter', () => this.cancelPreviewClose());
                panel.addEventListener('pointerleave', (event) => {
                    if (event.relatedTarget instanceof Node && this._previewHoverLink?.contains(event.relatedTarget)) return;
                    this.schedulePreviewClose();
                });
            }
            this.positionPreviewPanel();
            this.bindPreviewViewport();
            this.bindPreviewPointerTracking();
            return body;
        },
        async openPreview(url, title, anchor) {
            if (!this.isEnabled('postPreview')) return;
            let sourceUrl;
            try { sourceUrl = new URL(url, window.location.href); } catch { return; }
            if (sourceUrl.origin !== window.location.origin) return;
            const body = this.createPreviewPanel(sourceUrl.href, title, anchor);
            const cached = this.getCachedPreview(sourceUrl.href);
            if (cached !== null) { this.renderPreviewBody(body, cached, sourceUrl.href); return; }
            this._previewRequest?.abort();
            const controller = new AbortController(); this._previewRequest = controller;
            try {
                const response = await fetch(sourceUrl.href, { credentials: 'same-origin', signal: controller.signal, headers: { Accept: 'text/html' } });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const sanitized = this.sanitizePreviewDocument(await response.text(), sourceUrl.href);
                this.setCachedPreview(sourceUrl.href, sanitized);
                if (this._previewPanel?.contains(body)) this.renderPreviewBody(body, sanitized, sourceUrl.href);
            } catch (error) {
                if (error?.name === 'AbortError') return;
                if (this._previewPanel?.contains(body)) {
                    body.innerHTML = `<div class="dcuf-preview-status">미리보기를 불러오지 못했습니다.<br>${String(error?.message || error)}</div>`;
                    this.positionPreviewPanel();
                }
            } finally { if (this._previewRequest === controller) this._previewRequest = null; }
        },
        closePreview() {
            this._previewRequest?.abort(); this._previewRequest = null;
            this.cancelPreviewClose(); this.clearPreviewImageRuntime();
            this.unbindPreviewViewport(); this.unbindPreviewPointerTracking();
            this._previewPanel?.remove(); this._previewPanel = null;
            this._previewHoverLink = null;
            this._previewAnchor = null;
            this.unlockBackgroundScroll('preview');
        },

        hasDraftContent(draft) {
            if (String(draft?.subject || '').trim()) return true;
            const html = String(draft?.bodyHtml || '');
            if (/<(?:img|video|audio)\b/i.test(html)) return true;
            const text = document.createElement('div'); text.innerHTML = html;
            return Boolean(text.textContent.trim());
        },
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
                        id: draft.id, subject: String(draft.subject || ''), bodyHtml: String(draft.bodyHtml || ''),
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
            if (!galleryKey || this.draftByteSize(draft) > this.DRAFT_MAX_BYTES) return { saved: false, reason: 'too-large' };
            if (!this.hasDraftContent(draft)) return { saved: false, reason: 'empty' };
            return this.queueDraftStoreMutation(async (store) => {
                const list = (store.galleries[galleryKey] || []).filter((item) => item.id !== draft.id);
                list.unshift(draft); store.galleries[galleryKey] = list.slice(0, this.DRAFT_MAX_PER_GALLERY);
                return { saved: true, draft };
            });
        },
        async removeDraft(galleryKey, draftId) {
            return this.queueDraftStoreMutation(async (store) => {
                const list = (store.galleries[galleryKey] || []).filter((item) => item.id !== draftId);
                if (list.length) store.galleries[galleryKey] = list; else delete store.galleries[galleryKey];
                return { removed: true };
            });
        },
        getDraftFields(form) {
            const subject = form.querySelector('#subject, input[name="subject"]');
            const textarea = form.querySelector('textarea#memo, textarea[name="memo"], textarea[name="contents"]');
            const editor = form.querySelector('.note-editable, [contenteditable="true"][role="textbox"]');
            const codeview = form.querySelector('.note-codable');
            const headtext = form.querySelector('input[name="headtext"]');
            return { subject, textarea, editor, codeview, headtext };
        },
        getSummernoteCode(form) {
            const fields = this.getDraftFields(form);
            const jquery = window.jQuery || window.$;
            if (!(fields.textarea instanceof HTMLTextAreaElement) || typeof jquery !== 'function' || !form.querySelector('.note-editor')) return null;
            try {
                const instance = jquery(fields.textarea);
                if (typeof instance?.summernote !== 'function') return null;
                const code = instance.summernote('code');
                return typeof code === 'string' ? code : null;
            } catch { return null; }
        },
        isCodeViewActive(fields) {
            if (!(fields?.codeview instanceof HTMLTextAreaElement)) return false;
            const frame = fields.codeview.closest('.note-editor');
            return Boolean(frame?.classList.contains('codeview') || frame?.classList.contains('codeview-active') || fields.codeview.dataset.dcufActive === '1');
        },
        readDraftBodyHtml(form) {
            const fields = this.getDraftFields(form);
            if (this.isCodeViewActive(fields)) return String(fields.codeview.value || '');
            const summernote = this.getSummernoteCode(form);
            const textareaHtml = String(fields.textarea?.value || '');
            if (summernote !== null && (this.hasDraftContent({ bodyHtml: summernote }) || !textareaHtml)) return summernote;
            const editorHtml = fields.editor instanceof HTMLElement ? String(fields.editor.innerHTML || '') : '';
            if (this.hasDraftContent({ bodyHtml: editorHtml }) || !textareaHtml) return editorHtml;
            return textareaHtml;
        },
        readDraftFromForm(form, id, pendingSubmit = false) {
            const fields = this.getDraftFields(form);
            const bodyHtml = this.readDraftBodyHtml(form);
            return {
                id, subject: String(fields.subject?.value || ''), bodyHtml,
                headtext: String(fields.headtext?.value || ''), savedAt: Date.now(), pendingSubmit
            };
        },
        isDraftEmpty(draft) {
            return !this.hasDraftContent(draft);
        },
        applyDraftToForm(form, draft) {
            const fields = this.getDraftFields(form);
            if (fields.subject instanceof HTMLInputElement) { fields.subject.value = draft.subject; fields.subject.dispatchEvent(new Event('input', { bubbles: true })); }
            if (fields.textarea instanceof HTMLTextAreaElement) fields.textarea.value = draft.bodyHtml;
            if (fields.codeview instanceof HTMLTextAreaElement) fields.codeview.value = draft.bodyHtml;
            let appliedWithSummernote = false;
            const jquery = window.jQuery || window.$;
            if (fields.textarea instanceof HTMLTextAreaElement && typeof jquery === 'function' && form.querySelector('.note-editor')) {
                try {
                    const instance = jquery(fields.textarea);
                    if (typeof instance?.summernote === 'function') {
                        instance.summernote('code', draft.bodyHtml);
                        appliedWithSummernote = true;
                    }
                } catch { appliedWithSummernote = false; }
            }
            if (!appliedWithSummernote && fields.editor instanceof HTMLElement) fields.editor.innerHTML = draft.bodyHtml;
            const dispatchTarget = fields.editor instanceof HTMLElement ? fields.editor : fields.textarea;
            dispatchTarget?.dispatchEvent(new Event('input', { bubbles: true }));
            if (!(fields.editor instanceof HTMLElement) && draft.bodyHtml) {
                [120, 360, 800].forEach((delay) => window.setTimeout(() => {
                    if (!form.isConnected) return;
                    const nextFields = this.getDraftFields(form);
                    if (!(nextFields.editor instanceof HTMLElement)) return;
                    if (this.hasDraftContent({ bodyHtml: this.readDraftBodyHtml(form) })) return;
                    nextFields.editor.innerHTML = draft.bodyHtml;
                    if (nextFields.textarea instanceof HTMLTextAreaElement) nextFields.textarea.value = draft.bodyHtml;
                    nextFields.editor.dispatchEvent(new Event('input', { bubbles: true }));
                }, delay));
            }
            if (fields.headtext instanceof HTMLInputElement && draft.headtext) { fields.headtext.value = draft.headtext; fields.headtext.dispatchEvent(new Event('change', { bubbles: true })); }
        },
        showDraftBanner(message, actions = []) {
            document.getElementById('dcuf-draft-banner')?.remove();
            const banner = document.createElement('div'); banner.id = 'dcuf-draft-banner';
            const text = document.createElement('span'); text.textContent = message; banner.appendChild(text);
            actions.forEach(({ label, run }) => { const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.onclick = run; banner.appendChild(button); });
            const close = document.createElement('button'); close.type = 'button'; close.textContent = '✕'; close.onclick = () => banner.remove(); banner.appendChild(close);
            document.body.appendChild(banner); return banner;
        },
        async attachDraftForm(form) {
            if (!(form instanceof HTMLFormElement) || form.dataset.dcufDraftBound === '1') return;
            const galleryKey = FilterModule.getGalleryKey();
            if (!galleryKey) return;
            if (!this.isEnabled('draftRecovery')) return;
            form.dataset.dcufDraftBound = '1';
            const store = await this.loadDraftStore();
            let draft = (store.galleries[galleryKey] || [])[0] || null;
            let draftId = draft?.id || `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const interruptedSubmit = Boolean(draft?.pendingSubmit);
            if (interruptedSubmit) {
                draft = { ...draft, pendingSubmit: false, savedAt: Date.now() };
                await this.upsertDraft(galleryKey, draft);
                try {
                    const marker = JSON.parse(sessionStorage.getItem(this.SUBMIT_SESSION_KEY) || 'null');
                    if (marker?.galleryKey === galleryKey && marker?.draftId === draftId) sessionStorage.removeItem(this.SUBMIT_SESSION_KEY);
                } catch { /* unavailable */ }
            }
            const current = this.readDraftFromForm(form, draftId);
            if (draft) {
                if (this.isDraftEmpty(current)) {
                    this.applyDraftToForm(form, draft);
                    this.showDraftBanner(interruptedSubmit ? '완료되지 않은 등록의 초안을 복구했습니다.' : '저장된 초안을 자동으로 복구했습니다.');
                } else {
                    this.showDraftBanner('저장된 초안이 있습니다. 현재 내용을 덮어쓰지 않았습니다.', [
                        { label: '복구', run: () => { this.applyDraftToForm(form, draft); document.getElementById('dcuf-draft-banner')?.remove(); } },
                        { label: '삭제', run: async () => { await this.removeDraft(galleryKey, draft.id); draft = null; draftId = `draft-${Date.now()}`; document.getElementById('dcuf-draft-banner')?.remove(); } }
                    ]);
                }
            }
            let timer = 0;
            let dirty = false;
            let submittingPending = false;
            const saveNow = async (pendingSubmit = submittingPending) => {
                if (timer) window.clearTimeout(timer); timer = 0;
                submittingPending = Boolean(pendingSubmit);
                if (!this.isEnabled('draftRecovery')) return { saved: false, reason: 'disabled' };
                const next = this.readDraftFromForm(form, draftId, submittingPending);
                dirty = false;
                if (this.isDraftEmpty(next)) {
                    if (draft) await this.removeDraft(galleryKey, draftId);
                    draft = null;
                    return { saved: false, reason: 'empty' };
                }
                const result = await this.upsertDraft(galleryKey, next);
                if (result.saved) draft = next;
                else if (result.reason === 'too-large') this.showDraftBanner('초안이 512KiB를 넘어 자동 저장하지 않았습니다.');
                return result;
            };
            const schedule = () => {
                if (!this.isEnabled('draftRecovery')) return;
                dirty = true;
                if (timer) window.clearTimeout(timer);
                timer = window.setTimeout(() => void saveNow(false), 800);
            };
            const isDraftInput = (target) => target instanceof Element && Boolean(target.matches('#subject,input[name="subject"],textarea#memo,textarea[name="memo"],textarea[name="contents"],.note-editable,.note-codable,[contenteditable="true"][role="textbox"]')
                || target.closest('.note-editable,[contenteditable="true"][role="textbox"]'));
            form.addEventListener('input', (event) => {
                if (!isDraftInput(event.target)) return;
                const fields = this.getDraftFields(form);
                if (fields.editor instanceof HTMLElement && (event.target === fields.editor || fields.editor.contains(event.target)) && fields.textarea instanceof HTMLTextAreaElement) {
                    fields.textarea.value = fields.editor.innerHTML;
                } else if (fields.codeview instanceof HTMLTextAreaElement && event.target === fields.codeview && fields.textarea instanceof HTMLTextAreaElement) {
                    fields.textarea.value = fields.codeview.value;
                }
                schedule();
            }, true);
            form.addEventListener('change', (event) => {
                if (event.target instanceof Element && event.target.matches('input[name="headtext"]')) schedule();
            }, true);
            form.querySelector('.write_subject')?.addEventListener('click', () => window.setTimeout(schedule, 0), true);
            const flushDirtyDraft = () => {
                if (!dirty || !this.isEnabled('draftRecovery')) return;
                void saveNow(submittingPending);
            };
            const visibilityHandler = () => { if (document.visibilityState === 'hidden') flushDirtyDraft(); };
            document.addEventListener('visibilitychange', visibilityHandler, true);
            const pageHideHandler = flushDirtyDraft;
            window.addEventListener('pagehide', pageHideHandler, true);
            window.addEventListener('beforeunload', flushDirtyDraft, true);
            let submitRecoveryTimer = 0;
            form.addEventListener('submit', () => {
                submittingPending = true;
                try {
                    sessionStorage.setItem(this.SUBMIT_SESSION_KEY, JSON.stringify({ version: 2, galleryKey, draftId, submittedAt: Date.now() }));
                } catch { /* unavailable */ }
                // Do not cancel and synthesize the official submit. DCInside's
                // validation/captcha pipeline owns this exact event, and a
                // requestSubmit retry can require a second physical click.
                void saveNow(true).catch((error) => {
                    this.showDraftBanner(`제출 직전 초안 저장에 실패했습니다: ${error?.message || error}`);
                });
                if (submitRecoveryTimer) window.clearTimeout(submitRecoveryTimer);
                submitRecoveryTimer = window.setTimeout(() => {
                    submitRecoveryTimer = 0;
                    if (!form.isConnected || document.visibilityState === 'hidden') return;
                    const currentMarker = (() => { try { return JSON.parse(sessionStorage.getItem(this.SUBMIT_SESSION_KEY) || 'null'); } catch { return null; } })();
                    if (currentMarker?.galleryKey !== galleryKey || currentMarker?.draftId !== draftId) return;
                    submittingPending = false;
                    void saveNow(false);
                    try { sessionStorage.removeItem(this.SUBMIT_SESSION_KEY); } catch { /* unavailable */ }
                }, 8000);
            }, true);
            const controller = {
                galleryKey,
                saveNow,
                flushNow: flushDirtyDraft,
                destroy() {
                    if (timer) window.clearTimeout(timer);
                    timer = 0;
                    if (submitRecoveryTimer) window.clearTimeout(submitRecoveryTimer);
                    submitRecoveryTimer = 0;
                    document.removeEventListener('visibilitychange', visibilityHandler, true);
                    window.removeEventListener('pagehide', pageHideHandler, true);
                    window.removeEventListener('beforeunload', flushDirtyDraft, true);
                }
            };
            Object.defineProperty(controller, 'draftId', { enumerable: true, get: () => draftId });
            form._dcufDraftController = controller;
        },
        async confirmPendingDraftOnView() {
            const pathname = window.location.pathname;
            const isViewDestination = /\/view(?:\/|$)/.test(pathname);
            const isListDestination = /\/lists(?:\/|$)/.test(pathname);
            if (!isViewDestination && !isListDestination) return;
            let marker = null;
            try { marker = JSON.parse(sessionStorage.getItem(this.SUBMIT_SESSION_KEY) || 'null'); } catch { marker = null; }
            const galleryKey = FilterModule.getGalleryKey();
            const navigationType = performance.getEntriesByType?.('navigation')?.[0]?.type || 'unknown';
            let referrerPath = '';
            try { referrerPath = document.referrer ? new URL(document.referrer, window.location.href).pathname : ''; } catch { referrerPath = ''; }
            if (!marker || marker.galleryKey !== galleryKey || !marker.draftId || Date.now() - Number(marker.submittedAt) > 10 * 60 * 1000) return;
            const markerVersion = Number(marker.version);
            if (isListDestination) {
                const markerAgeMs = Date.now() - Number(marker.submittedAt);
                const fromWritePage = /\/write(?:\/|$)/.test(referrerPath);
                if (markerVersion !== 2 || markerAgeMs > 2 * 60 * 1000 || navigationType !== 'navigate' || !fromWritePage) return;
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
                try { sessionStorage.removeItem(this.SUBMIT_SESSION_KEY); } catch { /* unavailable */ }
                return;
            }
            // A write queued by the page being left can settle after this view has
            // already removed the draft. Reconcile a few times in the background
            // before consuming the success marker so that late writes cannot
            // resurrect a successfully submitted draft.
            if (this._submitCleanupTimer) window.clearTimeout(this._submitCleanupTimer);
            const retryDelays = [120, 480, 1600, 4000];
            const reconcile = async (index = 0) => {
                const currentMarker = (() => { try { return JSON.parse(sessionStorage.getItem(this.SUBMIT_SESSION_KEY) || 'null'); } catch { return null; } })();
                if (currentMarker?.galleryKey !== galleryKey || currentMarker?.draftId !== marker.draftId || Number(currentMarker.version) !== markerVersion) {
                    this._submitCleanupTimer = 0;
                    return;
                }
                try { await removeMatchingDraft(); } catch { /* retry at the next interval */ }
                if (index < retryDelays.length - 1) {
                    this._submitCleanupTimer = window.setTimeout(() => void reconcile(index + 1), retryDelays[index + 1]);
                    return;
                }
                this._submitCleanupTimer = 0;
                try { sessionStorage.removeItem(this.SUBMIT_SESSION_KEY); } catch { /* unavailable */ }
            };
            this._submitCleanupTimer = window.setTimeout(() => void reconcile(0), retryDelays[0]);
        }
    };
    window.__dcufMobileConvenienceModule = MobileConvenienceModule;
