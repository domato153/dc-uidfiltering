    const RuntimeCoordinator = {
        SCRIPT_UI_SELECTOR: [
            '#dc-backup-popup',
            '#dc-block-management-panel',
            '#dcinside-filter-setting',
            '#dc-selection-popup',
            '#custom-instant-tooltip',
            '#dcuf-boot-overlay',
            '.dcuf-comment-placeholder',
            '.dcuf-header-drawer',
            '.dcuf-header-drawer__toggle',
            '.dcuf-header-drawer__body',
            '.custom-mobile-list',
            '.custom-post-item',
            '.custom-bottom-controls'
        ].join(', '),
        COMMENT_VISIBILITY_SELECTOR: [
            '#focus_cmt',
            'div[id^="comment_wrap_"]',
            '.comment_box',
            '.view_comment.image_comment',
            'li[id^="comment_li_"]',
            'li[id^="reply_li_"]',
            'li[id^="img_comment_li_"]',
            'li[id^="mg_comment_li_"]'
        ].join(', '),
        IDENTITY_ATTRIBUTE_NAMES: new Set(['id', 'data-uid', 'data-nick', 'data-ip', 'data-no', 'p-no']),
        _mutationObserver: null,
        _mutationObserverTarget: null,
        _bodyMountObserver: null,
        _mutationObserverReady: false,
        _mutationSubscribers: new Map(),
        _immediateMutationSubscribers: new Map(),
        _pendingMutationRecords: [],
        _pendingMutationRafId: 0,
        _pendingMutationTimerId: 0,
        _mutationGeneration: 0,
        _bfcacheRecoveryPromise: null,
        _bfcacheRecoveryId: 0,
        _bfcacheRecoveryStartedAt: 0,
        _bfcacheRecoveryCompletedAt: 0,
        _bfcacheRecoveryBody: null,
        _bfcacheRecoverySucceeded: false,
        _taskQueues: Object.create(null),
        _diagnosticsEnabled: false,
        _diagnosticCounters: Object.create(null),
        _diagnosticGauges: Object.create(null),
        _diagnosticEvents: [],

        installDiagnosticsApi() {
            if (window.__dcufDiagnostics) return window.__dcufDiagnostics;

            const api = {
                enable: () => {
                    this._diagnosticsEnabled = true;
                    return this.snapshotDiagnostics();
                },
                disable: () => {
                    this._diagnosticsEnabled = false;
                    return this.snapshotDiagnostics();
                },
                reset: () => {
                    this._diagnosticCounters = Object.create(null);
                    this._diagnosticGauges = Object.create(null);
                    this._diagnosticEvents = [];
                    return this.snapshotDiagnostics();
                },
                increment: (label, amount = 1) => {
                    this.incrementDiagnostic(label, amount);
                },
                setGauge: (label, value) => {
                    this.setDiagnosticGauge(label, value);
                },
                note: (label, detail = null) => {
                    this.noteDiagnostic(label, detail);
                },
                snapshot: () => this.snapshotDiagnostics()
            };

            window.__dcufDiagnostics = api;
            return api;
        },

        snapshotDiagnostics() {
            return {
                enabled: this._diagnosticsEnabled,
                counters: { ...this._diagnosticCounters },
                gauges: { ...this._diagnosticGauges },
                events: this._diagnosticEvents.slice(-50),
                pageContext: { ...this.getPageContext() },
                subscribers: Array.from(this._mutationSubscribers.keys()),
                immediateSubscribers: Array.from(this._immediateMutationSubscribers.keys())
            };
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

        pageSupports(contexts) {
            const requested = Array.isArray(contexts) ? contexts : [contexts];
            if (requested.length === 0 || requested.every((context) => !context)) return true;
            const pageContext = this.getPageContext();
            return requested.some((context) => {
                if (context === 'list-surface') return pageContext.hasListSurface;
                if (context === 'comments') return pageContext.hasComments;
                if (context === 'target') return pageContext.isTargetPage;
                return pageContext.type === context;
            });
        },

        getMutationSurfaceSelector() {
            const pageContext = this.getPageContext();
            const shared = [
                '#user_data_lyr',
                '.user_data',
                '#user_memo_config',
                '#um_picker_lay'
            ];
            const list = [
                '.list_wrap',
                '.gall_listwrap',
                '.gall_list',
                '.issue_contentbox',
                '#gall_top_recom'
            ];
            if (pageContext.isList) return [...shared, ...list].join(', ');
            if (pageContext.isView) {
                return [
                    ...shared,
                    ...list,
                    '.view_content_wrap',
                    '.gallview_contents',
                    '.writing_view_box',
                    '.gall_comment',
                    '#focus_cmt',
                    'div[id^="comment_wrap_"]',
                    '.view_comment'
                ].join(', ');
            }
            if (pageContext.isWriteSurface) {
                return 'form#write, form[name="modify"][action*="modify_submit"], #write_wrap, .gall_write, .write_box, form[name="password_confirm"], form[action*="modify_password_submit"], .no_memberwrap';
            }
            return shared.join(', ');
        },

        isMutationSurfaceElement(element) {
            if (!(element instanceof Element) || this.isScriptOwnedElement(element)) return false;
            if (element === document.body) return true;
            const selector = this.getMutationSurfaceSelector();
            return Boolean(selector && (element.matches(selector) || element.closest(selector)));
        },

        mutationNodeTouchesSurface(node) {
            const element = node instanceof Element ? node : node?.parentElement;
            if (!(element instanceof Element) || this.isScriptOwnedElement(element)) return false;
            if (element === document.body) return true;
            const selector = this.getMutationSurfaceSelector();
            if (!selector) return false;
            return element.matches(selector)
                || Boolean(element.closest(selector))
                || Boolean(element.querySelector?.(selector));
        },

        prefilterMutationRecords(records) {
            if (!Array.isArray(records) || records.length === 0) return [];
            return records.filter((record) => {
                if (!record) return false;
                if (record.type === 'childList') {
                    if (this.isScriptOwnedElement(record.target)) return false;
                    if (record.target instanceof Element
                        && record.target !== document.body
                        && this.isMutationSurfaceElement(record.target)) return true;
                    return [...record.addedNodes, ...record.removedNodes]
                        .some((node) => this.mutationNodeTouchesSurface(node));
                }
                if (record.type === 'attributes') {
                    if (this.isScriptOwnedElement(record.target)) return false;
                    if (this.IDENTITY_ATTRIBUTE_NAMES.has(record.attributeName)) return true;
                    return this.isMutationSurfaceElement(record.target);
                }
                if (record.type === 'characterData') {
                    return this.isMutationSurfaceElement(record.target?.parentElement || null);
                }
                return false;
            });
        },

        isCommentVisibilityElement(element) {
            if (!(element instanceof Element) || this.isScriptOwnedElement(element)) return false;
            return element.matches(this.COMMENT_VISIBILITY_SELECTOR)
                || Boolean(element.closest(this.COMMENT_VISIBILITY_SELECTOR))
                || Boolean(element.querySelector?.(this.COMMENT_VISIBILITY_SELECTOR));
        },

        filterImmediateMutationRecords(records) {
            if (!Array.isArray(records) || records.length === 0 || !this.getPageContext().hasComments) return [];
            return records.filter((record) => {
                if (record?.type === 'attributes') {
                    return ['data-uid', 'data-nick', 'data-ip'].includes(record.attributeName)
                        && this.isCommentVisibilityElement(record.target);
                }
                if (record?.type !== 'childList' || record.addedNodes.length === 0) return false;
                if (this.isCommentVisibilityElement(record.target)) return true;
                return Array.from(record.addedNodes).some((node) => this.isCommentVisibilityElement(node));
            });
        },

        incrementDiagnostic(label, amount = 1) {
            if (!label) return;
            const nextValue = (this._diagnosticCounters[label] || 0) + amount;
            this._diagnosticCounters[label] = nextValue;
            return nextValue;
        },

        setDiagnosticGauge(label, value) {
            if (!label) return;
            this._diagnosticGauges[label] = value;
        },

        noteDiagnostic(label, detail = null) {
            if (!label) return;
            if (!Array.isArray(this._diagnosticEvents)) this._diagnosticEvents = [];
            this._diagnosticEvents.push({
                label,
                detail,
                ts: Date.now()
            });
            if (this._diagnosticEvents.length > 120) {
                this._diagnosticEvents.splice(0, this._diagnosticEvents.length - 120);
            }
            if (this._diagnosticsEnabled) {
                console.debug('[DCUF diagnostics]', label, detail);
            }
        },

        isScriptOwnedElement(element) {
            return element instanceof Element && !!element.closest(this.SCRIPT_UI_SELECTOR);
        },

        toRelevantElement(node) {
            if (node instanceof Element) {
                if (this.isScriptOwnedElement(node)) return null;
                return node;
            }
            if (node instanceof CharacterData) {
                const parentElement = node.parentElement || null;
                if (parentElement && !this.isScriptOwnedElement(parentElement)) return parentElement;
            }
            return null;
        },

        addUniqueElement(targetSet, targetList, node) {
            const element = this.toRelevantElement(node);
            if (!(element instanceof Element) || targetSet.has(element)) return;
            targetSet.add(element);
            targetList.push(element);
        },

        normalizeSelectors(selectors) {
            if (Array.isArray(selectors)) return selectors.filter(Boolean).join(', ');
            return typeof selectors === 'string' ? selectors : '';
        },

        collectMatchesFromRoots(roots, selectors, options = {}) {
            const selectorText = this.normalizeSelectors(selectors);
            if (!selectorText) return [];

            const includeRoots = options.includeRoots !== false;
            const includeDescendants = options.includeDescendants !== false;
            const matches = [];
            const seen = new Set();
            const pushMatch = (element) => {
                if (!(element instanceof Element)) return;
                if (this.isScriptOwnedElement(element)) return;
                if (!element.matches(selectorText) || seen.has(element)) return;
                seen.add(element);
                matches.push(element);
            };

            roots.forEach((root) => {
                if (!(root instanceof Element)) return;
                if (includeRoots) pushMatch(root);
                if (includeDescendants && typeof root.querySelectorAll === 'function') {
                    root.querySelectorAll(selectorText).forEach(pushMatch);
                }
            });

            return matches;
        },

        buildMutationPayload(records) {
            const addedElements = [];
            const removedElements = [];
            const attributeTargets = [];
            const characterDataTargets = [];
            const childListTargets = [];
            const roots = [];
            const addedSet = new Set();
            const removedSet = new Set();
            const attributeSet = new Set();
            const charDataSet = new Set();
            const childListSet = new Set();
            const rootSet = new Set();
            const collectMatchesCache = new Map();
            const addRoot = (node) => this.addUniqueElement(rootSet, roots, node);

            records.forEach((record) => {
                if (!record) return;

                if (record.type === 'childList') {
                    this.addUniqueElement(childListSet, childListTargets, record.target);
                    addRoot(record.target);
                    record.addedNodes.forEach((node) => {
                        this.addUniqueElement(addedSet, addedElements, node);
                        addRoot(node);
                    });
                    record.removedNodes.forEach((node) => {
                        this.addUniqueElement(removedSet, removedElements, node);
                    });
                    return;
                }

                if (record.type === 'attributes') {
                    this.addUniqueElement(attributeSet, attributeTargets, record.target);
                    addRoot(record.target);
                    return;
                }

                if (record.type === 'characterData') {
                    this.addUniqueElement(charDataSet, characterDataTargets, record.target);
                    addRoot(record.target);
                }
            });

            const collectMatches = (selectors, options = {}) => {
                const selectorText = this.normalizeSelectors(selectors);
                if (!selectorText) return [];
                const includeRoots = options.includeRoots !== false;
                const includeDescendants = options.includeDescendants !== false;
                const cacheKey = `${includeRoots ? 1 : 0}:${includeDescendants ? 1 : 0}:${selectorText}`;
                if (collectMatchesCache.has(cacheKey)) {
                    this.incrementDiagnostic('mutation.collectMatches.cacheHits');
                    return collectMatchesCache.get(cacheKey).slice();
                }
                const matches = this.collectMatchesFromRoots(roots, selectorText, { includeRoots, includeDescendants });
                collectMatchesCache.set(cacheKey, matches);
                this.incrementDiagnostic('mutation.collectMatches.cacheMisses');
                return matches.slice();
            };

            return {
                records,
                addedElements,
                removedElements,
                attributeTargets,
                characterDataTargets,
                childListTargets,
                roots,
                collectMatches
            };
        },

        clearPendingMutationDispatch() {
            if (this._pendingMutationRafId) {
                cancelAnimationFrame(this._pendingMutationRafId);
                this._pendingMutationRafId = 0;
            }
            if (this._pendingMutationTimerId) {
                clearTimeout(this._pendingMutationTimerId);
                this._pendingMutationTimerId = 0;
            }
        },

        dispatchQueuedMutations() {
            this.clearPendingMutationDispatch();
            if (!Array.isArray(this._pendingMutationRecords) || this._pendingMutationRecords.length === 0) return;

            const records = this._pendingMutationRecords.splice(0);
            const payload = this.buildMutationPayload(records);
            this._mutationGeneration += 1;
            payload.generation = this._mutationGeneration;
            this.incrementDiagnostic('mutation.dispatches');
            this.setDiagnosticGauge('mutation.roots', payload.roots.length);
            this.setDiagnosticGauge('mutation.subscribers', this._mutationSubscribers.size);
            this.setDiagnosticGauge('mutation.generation', this._mutationGeneration);

            const measureDispatch = this._diagnosticsEnabled && typeof performance?.now === 'function';
            const dispatchStartedAt = measureDispatch ? performance.now() : 0;

            this._mutationSubscribers.forEach((listener, key) => {
                try {
                    listener(payload);
                } catch (error) {
                    console.error('[DCUF runtime] mutation subscriber failed:', key, error);
                }
            });

            if (measureDispatch) {
                this.setDiagnosticGauge('mutation.lastDispatchDurationMs', Math.round((performance.now() - dispatchStartedAt) * 1000) / 1000);
            }
        },

        dispatchImmediateMutations(records) {
            if (!Array.isArray(records) || records.length === 0) return;
            if (!(this._immediateMutationSubscribers instanceof Map) || this._immediateMutationSubscribers.size === 0) return;

            const payload = this.buildMutationPayload(records);
            this.incrementDiagnostic('mutation.immediateDispatches');
            this.incrementDiagnostic('mutation.immediateRecords', records.length);
            this.setDiagnosticGauge('mutation.immediateSubscribers', this._immediateMutationSubscribers.size);

            const measureDispatch = this._diagnosticsEnabled && typeof performance?.now === 'function';
            const dispatchStartedAt = measureDispatch ? performance.now() : 0;
            this._immediateMutationSubscribers.forEach((listener, key) => {
                try {
                    listener(payload);
                } catch (error) {
                    console.error('[DCUF runtime] immediate mutation subscriber failed:', key, error);
                }
            });
            if (measureDispatch) {
                this.setDiagnosticGauge(
                    'mutation.lastImmediateDispatchDurationMs',
                    Math.round((performance.now() - dispatchStartedAt) * 1000) / 1000
                );
            }
        },

        queueMutationRecords(records) {
            if (!Array.isArray(records) || records.length === 0) return;
            const filteredRecords = this.prefilterMutationRecords(records);
            const skippedRecords = records.length - filteredRecords.length;
            this.incrementDiagnostic('mutation.rawRecords', records.length);
            if (skippedRecords > 0) this.incrementDiagnostic('mutation.skippedRecords', skippedRecords);
            if (filteredRecords.length === 0) return;
            // MutationObserver callbacks run before the next paint. Critical visibility
            // subscribers must see the fresh records here; the ordinary bus remains
            // animation-frame batched for heavier UI and async work.
            this.dispatchImmediateMutations(this.filterImmediateMutationRecords(filteredRecords));
            this._pendingMutationRecords.push(...filteredRecords);
            this.incrementDiagnostic('mutation.bursts');
            this.incrementDiagnostic('mutation.records', filteredRecords.length);

            if (this._pendingMutationRafId || this._pendingMutationTimerId) return;

            this._pendingMutationRafId = requestAnimationFrame(() => {
                this._pendingMutationRafId = 0;
                this.dispatchQueuedMutations();
            });
            this._pendingMutationTimerId = window.setTimeout(() => {
                this._pendingMutationTimerId = 0;
                this.dispatchQueuedMutations();
            }, 50);
        },

        flushPendingMutations(reason = 'manual-flush') {
            this.installDiagnosticsApi();
            if (this._mutationObserver) {
                const records = this._mutationObserver.takeRecords();
                if (records.length > 0) this.queueMutationRecords(records);
            }
            if (this._pendingMutationRecords.length > 0) this.dispatchQueuedMutations();
            this.noteDiagnostic('mutation.bus.flushed', { reason, generation: this._mutationGeneration });
            return this._mutationGeneration;
        },

        getMutationGeneration() {
            return this._mutationGeneration;
        },

        getBfcacheRecoveryState() {
            return {
                id: this._bfcacheRecoveryId,
                startedAt: this._bfcacheRecoveryStartedAt,
                completedAt: this._bfcacheRecoveryCompletedAt,
                body: this._bfcacheRecoveryBody,
                pending: Boolean(this._bfcacheRecoveryPromise),
                succeeded: this._bfcacheRecoverySucceeded
            };
        },

        waitForBfcacheRecovery() {
            return this._bfcacheRecoveryPromise || Promise.resolve(this._bfcacheRecoverySucceeded);
        },

        ensureMutationBus() {
            this.installDiagnosticsApi();
            const observerTarget = document.body;
            if (this._mutationObserverReady
                && this._mutationObserverTarget === observerTarget
                && observerTarget?.isConnected) {
                return true;
            }
            if (!observerTarget) {
                if (!this._awaitingBodyForMutationBus) {
                    this._awaitingBodyForMutationBus = true;
                    document.addEventListener('DOMContentLoaded', () => {
                        this._awaitingBodyForMutationBus = false;
                        this.ensureMutationBus();
                    }, { once: true });
                }
                return false;
            }

            if (this._mutationObserver) {
                const pending = this._mutationObserver.takeRecords();
                if (pending.length > 0) this.queueMutationRecords(pending);
                this._mutationObserver.disconnect();
            }

            this._mutationObserver = new MutationObserver((records) => {
                this.queueMutationRecords(records);
            });
            this._mutationObserver.observe(observerTarget, {
                childList: true,
                subtree: true,
                attributes: true,
                characterData: true,
                attributeFilter: ['class', 'style', 'src', 'id', 'data-uid', 'data-nick', 'data-ip', 'data-no', 'p-no']
            });
            this._mutationObserverTarget = observerTarget;
            this._mutationObserverReady = true;
            if (!this._bodyMountObserver && document.documentElement) {
                this._bodyMountObserver = new MutationObserver((records) => {
                    if (this._mutationObserverTarget !== document.body) {
                        this.ensureMutationBus();
                        this.queueMutationRecords(records);
                    }
                });
                this._bodyMountObserver.observe(document.documentElement, { childList: true });
            }
            this.noteDiagnostic('mutation.bus.ready', { target: 'document.body', rebound: true });
            if (this._pendingMutationRecords.length > 0) this.dispatchQueuedMutations();
            return true;
        },

        subscribeMutations(key, listener, options = {}) {
            if (typeof listener !== 'function') return () => {};
            if (!this.pageSupports(options.contexts || [])) {
                this.noteDiagnostic('mutation.subscriber.skipped', { key, contexts: options.contexts || [], pageType: this.getPageContext().type });
                return () => {};
            }
            this.ensureMutationBus();
            this._mutationSubscribers.set(key, listener);
            this.setDiagnosticGauge('mutation.subscribers', this._mutationSubscribers.size);
            return () => {
                this._mutationSubscribers.delete(key);
                this.setDiagnosticGauge('mutation.subscribers', this._mutationSubscribers.size);
            };
        },

        subscribeImmediateMutations(key, listener, options = {}) {
            if (typeof listener !== 'function') return () => {};
            if (!this.pageSupports(options.contexts || [])) {
                this.noteDiagnostic('mutation.immediateSubscriber.skipped', { key, contexts: options.contexts || [], pageType: this.getPageContext().type });
                return () => {};
            }
            this.ensureMutationBus();
            this._immediateMutationSubscribers.set(key, listener);
            this.setDiagnosticGauge('mutation.immediateSubscribers', this._immediateMutationSubscribers.size);
            return () => {
                this._immediateMutationSubscribers.delete(key);
                this.setDiagnosticGauge('mutation.immediateSubscribers', this._immediateMutationSubscribers.size);
            };
        },

        recoverFromBfcache(event) {
            if (!event?.persisted) return Promise.resolve(false);
            if (this._bfcacheRecoveryPromise) return this._bfcacheRecoveryPromise;

            const recoveryId = this._bfcacheRecoveryId + 1;
            this._bfcacheRecoveryId = recoveryId;
            this._bfcacheRecoveryStartedAt = Date.now();
            this._bfcacheRecoveryCompletedAt = 0;
            this._bfcacheRecoveryBody = document.body;
            this._bfcacheRecoverySucceeded = false;
            this.incrementDiagnostic('lifecycle.bfcache.restore.requested');
            this._bfcacheRecoveryPromise = Promise.resolve().then(async () => {
                this.ensureMutationBus();
                window.__dcufUIModule?.processAllLists?.('pageshow-persisted');
                await window.__dcufFilterModule?.refilterAllContent?.('pageshow-persisted', { scheduleFollowups: false });
                window.__dcufSyncArticleDarkText?.();
                window.__dcufScheduleCommentNormalize?.();
                this._bfcacheRecoveryCompletedAt = Date.now();
                this._bfcacheRecoverySucceeded = true;
                this.incrementDiagnostic('lifecycle.bfcache.restore.completed');
                window.dispatchEvent(new CustomEvent('dcuf:bfcache-restored', {
                    detail: {
                        pageType: this.getPageContext().type,
                        recoveryId,
                        startedAt: this._bfcacheRecoveryStartedAt,
                        completedAt: this._bfcacheRecoveryCompletedAt
                    }
                }));
                return true;
            }).catch((error) => {
                this._bfcacheRecoveryCompletedAt = Date.now();
                this._bfcacheRecoverySucceeded = false;
                this.incrementDiagnostic('lifecycle.bfcache.restore.failed');
                console.warn('[DCUF lifecycle] bfcache restore failed:', error);
                return false;
            }).finally(() => {
                this._bfcacheRecoveryPromise = null;
            });
            return this._bfcacheRecoveryPromise;
        },

        createPhaseScheduler(label, run, options = {}) {
            const delays = Array.isArray(options?.delays) ? options.delays.filter((delay) => Number.isFinite(delay) && delay >= 0) : [];
            let rafId = 0;
            let timerIds = new Set();
            let lastMeta = null;

            const clearTimers = () => {
                timerIds.forEach((timerId) => clearTimeout(timerId));
                timerIds.clear();
            };

            const invoke = (phase, delay = 0) => {
                this.incrementDiagnostic(`scheduler.${label}.${phase}`);
                run({
                    label,
                    phase,
                    delay,
                    meta: lastMeta
                });
            };

            return {
                schedule: (meta = null) => {
                    lastMeta = meta;
                    if (rafId) cancelAnimationFrame(rafId);
                    clearTimers();

                    rafId = requestAnimationFrame(() => {
                        rafId = 0;
                        invoke('raf', 0);
                        delays.forEach((delay) => {
                            const timerId = window.setTimeout(() => {
                                timerIds.delete(timerId);
                                invoke(`delay:${delay}`, delay);
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
                    lastMeta = meta;
                    if (rafId) {
                        cancelAnimationFrame(rafId);
                        rafId = 0;
                    }
                    clearTimers();
                    invoke('flush', 0);
                }
            };
        },

        createTaskQueue(label, options = {}) {
            if (this._taskQueues[label]) return this._taskQueues[label];

            const concurrency = Math.max(1, Number(options?.concurrency) || 1);
            const pending = [];
            let activeCount = 0;

            const updateGauge = () => {
                this.setDiagnosticGauge(`queue.${label}.active`, activeCount);
                this.setDiagnosticGauge(`queue.${label}.pending`, pending.length);
            };

            const drain = () => {
                while (activeCount < concurrency && pending.length > 0) {
                    const nextTask = pending.shift();
                    if (!nextTask) break;
                    activeCount += 1;
                    this.incrementDiagnostic(`queue.${label}.started`);
                    updateGauge();

                    Promise.resolve()
                        .then(nextTask.run)
                        .then(nextTask.resolve, nextTask.reject)
                        .finally(() => {
                            activeCount -= 1;
                            this.incrementDiagnostic(`queue.${label}.finished`);
                            updateGauge();
                            drain();
                        });
                }
            };

            const queue = {
                enqueue: (run) => new Promise((resolve, reject) => {
                    pending.push({ run, resolve, reject });
                    this.incrementDiagnostic(`queue.${label}.enqueued`);
                    updateGauge();
                    drain();
                }),
                snapshot: () => ({
                    label,
                    concurrency,
                    activeCount,
                    pendingCount: pending.length
                })
            };

            this._taskQueues[label] = queue;
            updateGauge();
            return queue;
        }
    };

    RuntimeCoordinator.installDiagnosticsApi();
    window.__dcufRuntimeCoordinator = RuntimeCoordinator;
    if (!__dcufRoot.__dcufBfcachePageshowBound) {
        __dcufRoot.__dcufBfcachePageshowBound = true;
        window.addEventListener('pageshow', (event) => {
            void RuntimeCoordinator.recoverFromBfcache(event);
        });
    }
