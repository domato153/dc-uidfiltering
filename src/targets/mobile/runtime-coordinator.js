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
        _mutationObserver: null,
        _mutationObserverReady: false,
        _mutationSubscribers: new Map(),
        _pendingMutationRecords: [],
        _pendingMutationRafId: 0,
        _pendingMutationTimerId: 0,
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
                events: this._diagnosticEvents.slice(-50)
            };
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

            return {
                records,
                addedElements,
                removedElements,
                attributeTargets,
                characterDataTargets,
                childListTargets,
                roots,
                collectMatches: (selectors, options = {}) => this.collectMatchesFromRoots(roots, selectors, options)
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
            this.incrementDiagnostic('mutation.dispatches');
            this.setDiagnosticGauge('mutation.roots', payload.roots.length);
            this.setDiagnosticGauge('mutation.subscribers', this._mutationSubscribers.size);

            this._mutationSubscribers.forEach((listener, key) => {
                try {
                    listener(payload);
                } catch (error) {
                    console.error('[DCUF runtime] mutation subscriber failed:', key, error);
                }
            });
        },

        queueMutationRecords(records) {
            if (!Array.isArray(records) || records.length === 0) return;
            this._pendingMutationRecords.push(...records);
            this.incrementDiagnostic('mutation.bursts');
            this.incrementDiagnostic('mutation.records', records.length);

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

        ensureMutationBus() {
            this.installDiagnosticsApi();
            if (this._mutationObserverReady) return true;

            const observerTarget = document.body;
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

            this._mutationObserver = new MutationObserver((records) => {
                this.queueMutationRecords(records);
            });
            this._mutationObserver.observe(observerTarget, {
                childList: true,
                subtree: true,
                attributes: true,
                characterData: true,
                attributeFilter: ['class', 'style', 'src', 'id']
            });
            this._mutationObserverReady = true;
            this.noteDiagnostic('mutation.bus.ready', { target: 'document.body' });
            return true;
        },

        subscribeMutations(key, listener) {
            if (typeof listener !== 'function') return () => {};
            this.ensureMutationBus();
            this._mutationSubscribers.set(key, listener);
            this.setDiagnosticGauge('mutation.subscribers', this._mutationSubscribers.size);
            return () => {
                this._mutationSubscribers.delete(key);
                this.setDiagnosticGauge('mutation.subscribers', this._mutationSubscribers.size);
            };
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
