(() => {
    const state = {
        mutationObserversCreated: 0,
        mutationObserveCalls: 0,
        mutationDisconnectCalls: 0,
        mutationCallbacks: 0,
        mutationRecords: 0,
        mutationObserverCreationStacks: [],
        listenerAttempts: 0,
        listenerUnique: 0,
        listenerDuplicateAttempts: 0,
        xhrRequests: [],
        mirrorAdded: 0,
        mirrorRemoved: 0,
        filterPasses: [],
        processedDomNodes: 0,
        documentQuerySelectorCalls: 0,
        documentQuerySelectorAllCalls: 0,
        documentQuerySelectorAllResults: 0,
        elementQuerySelectorCalls: 0,
        elementQuerySelectorAllCalls: 0,
        elementQuerySelectorAllResults: 0,
        computedStyleReads: 0,
        boundingClientRectReads: 0,
        clientRectListReads: 0,
        layoutPropertyReads: 0,
        timeoutScheduled: 0,
        timeoutCompleted: 0,
        timeoutCleared: 0,
        intervalScheduled: 0,
        intervalCallbacks: 0,
        intervalCleared: 0,
        animationFrameScheduled: 0,
        animationFrameCompleted: 0,
        animationFrameCancelled: 0,
        errors: []
    };
    const NativeMutationObserver = globalThis.MutationObserver;
    const NativeAddEventListener = EventTarget.prototype.addEventListener;
    const NativeRemoveEventListener = EventTarget.prototype.removeEventListener;
    const NativeXhrOpen = XMLHttpRequest.prototype.open;
    const NativeXhrSend = XMLHttpRequest.prototype.send;
    const NativeDocumentQuerySelector = Document.prototype.querySelector;
    const NativeDocumentQuerySelectorAll = Document.prototype.querySelectorAll;
    const NativeElementQuerySelector = Element.prototype.querySelector;
    const NativeElementQuerySelectorAll = Element.prototype.querySelectorAll;
    const NativeGetComputedStyle = globalThis.getComputedStyle;
    const NativeGetBoundingClientRect = Element.prototype.getBoundingClientRect;
    const NativeGetClientRects = Element.prototype.getClientRects;
    const NativeSetTimeout = globalThis.setTimeout;
    const NativeClearTimeout = globalThis.clearTimeout;
    const NativeSetInterval = globalThis.setInterval;
    const NativeClearInterval = globalThis.clearInterval;
    const NativeRequestAnimationFrame = globalThis.requestAnimationFrame;
    const NativeCancelAnimationFrame = globalThis.cancelAnimationFrame;
    const activeTimeouts = new Set();
    const activeIntervals = new Set();
    const activeAnimationFrames = new Set();
    const callbackIds = new WeakMap();
    const targetIds = new WeakMap();
    const listenerKeys = new Set();
    let nextCallbackId = 1;
    let nextTargetId = 1;

    const getWeakId = (map, value, next) => {
        if (!map.has(value)) map.set(value, next());
        return map.get(value);
    };
    const getCapture = (options) => typeof options === 'boolean' ? options : Boolean(options?.capture);

    Document.prototype.querySelector = function (...args) {
        state.documentQuerySelectorCalls += 1;
        return NativeDocumentQuerySelector.apply(this, args);
    };
    Document.prototype.querySelectorAll = function (...args) {
        state.documentQuerySelectorAllCalls += 1;
        const result = NativeDocumentQuerySelectorAll.apply(this, args);
        state.documentQuerySelectorAllResults += result.length;
        return result;
    };
    Element.prototype.querySelector = function (...args) {
        state.elementQuerySelectorCalls += 1;
        return NativeElementQuerySelector.apply(this, args);
    };
    Element.prototype.querySelectorAll = function (...args) {
        state.elementQuerySelectorAllCalls += 1;
        const result = NativeElementQuerySelectorAll.apply(this, args);
        state.elementQuerySelectorAllResults += result.length;
        return result;
    };
    globalThis.getComputedStyle = function (...args) {
        state.computedStyleReads += 1;
        return NativeGetComputedStyle.apply(this, args);
    };
    Element.prototype.getBoundingClientRect = function (...args) {
        state.boundingClientRectReads += 1;
        return NativeGetBoundingClientRect.apply(this, args);
    };
    Element.prototype.getClientRects = function (...args) {
        state.clientRectListReads += 1;
        return NativeGetClientRects.apply(this, args);
    };
    const wrapLayoutProperty = (prototype, propertyName) => {
        const descriptor = Object.getOwnPropertyDescriptor(prototype, propertyName);
        if (!descriptor?.get || descriptor.configurable === false) return;
        Object.defineProperty(prototype, propertyName, {
            ...descriptor,
            get() {
                state.layoutPropertyReads += 1;
                return descriptor.get.call(this);
            }
        });
    };
    ['offsetWidth', 'offsetHeight', 'offsetTop', 'offsetLeft', 'offsetParent'].forEach((propertyName) => {
        wrapLayoutProperty(HTMLElement.prototype, propertyName);
    });
    ['clientWidth', 'clientHeight', 'clientTop', 'clientLeft', 'scrollWidth', 'scrollHeight'].forEach((propertyName) => {
        wrapLayoutProperty(Element.prototype, propertyName);
    });

    globalThis.setTimeout = function (callback, delay, ...args) {
        state.timeoutScheduled += 1;
        let timerId;
        const wrappedCallback = typeof callback === 'function'
            ? function (...callbackArgs) {
                activeTimeouts.delete(timerId);
                state.timeoutCompleted += 1;
                return callback.apply(this, callbackArgs);
            }
            : callback;
        timerId = NativeSetTimeout.call(this, wrappedCallback, delay, ...args);
        if (typeof callback === 'function') activeTimeouts.add(timerId);
        return timerId;
    };
    globalThis.clearTimeout = function (timerId) {
        if (activeTimeouts.delete(timerId)) state.timeoutCleared += 1;
        if (activeIntervals.delete(timerId)) state.intervalCleared += 1;
        return NativeClearTimeout.call(this, timerId);
    };
    globalThis.setInterval = function (callback, delay, ...args) {
        state.intervalScheduled += 1;
        const wrappedCallback = typeof callback === 'function'
            ? function (...callbackArgs) {
                state.intervalCallbacks += 1;
                return callback.apply(this, callbackArgs);
            }
            : callback;
        const intervalId = NativeSetInterval.call(this, wrappedCallback, delay, ...args);
        if (typeof callback === 'function') activeIntervals.add(intervalId);
        return intervalId;
    };
    globalThis.clearInterval = function (intervalId) {
        if (activeIntervals.delete(intervalId)) state.intervalCleared += 1;
        if (activeTimeouts.delete(intervalId)) state.timeoutCleared += 1;
        return NativeClearInterval.call(this, intervalId);
    };
    globalThis.requestAnimationFrame = function (callback) {
        state.animationFrameScheduled += 1;
        let frameId;
        const wrappedCallback = (timestamp) => {
            activeAnimationFrames.delete(frameId);
            state.animationFrameCompleted += 1;
            return callback(timestamp);
        };
        frameId = NativeRequestAnimationFrame.call(this, wrappedCallback);
        activeAnimationFrames.add(frameId);
        return frameId;
    };
    globalThis.cancelAnimationFrame = function (frameId) {
        if (activeAnimationFrames.delete(frameId)) state.animationFrameCancelled += 1;
        return NativeCancelAnimationFrame.call(this, frameId);
    };

    class InstrumentedMutationObserver extends NativeMutationObserver {
        constructor(callback) {
            state.mutationObserversCreated += 1;
            state.mutationObserverCreationStacks.push(String(new Error('MutationObserver created').stack || ''));
            super((records, observer) => {
                state.mutationCallbacks += 1;
                state.mutationRecords += records.length;
                callback(records, observer);
            });
        }
        observe(target, options) {
            state.mutationObserveCalls += 1;
            return super.observe(target, options);
        }
        disconnect() {
            state.mutationDisconnectCalls += 1;
            return super.disconnect();
        }
    }
    globalThis.MutationObserver = InstrumentedMutationObserver;

    EventTarget.prototype.addEventListener = function (type, callback, options) {
        state.listenerAttempts += 1;
        if (callback && (typeof callback === 'function' || typeof callback === 'object')) {
            const targetId = getWeakId(targetIds, this, () => nextTargetId++);
            const callbackId = getWeakId(callbackIds, callback, () => nextCallbackId++);
            const key = `${targetId}:${type}:${callbackId}:${getCapture(options) ? 1 : 0}`;
            if (listenerKeys.has(key)) state.listenerDuplicateAttempts += 1;
            else {
                listenerKeys.add(key);
                state.listenerUnique += 1;
            }
        }
        return NativeAddEventListener.call(this, type, callback, options);
    };
    EventTarget.prototype.removeEventListener = function (type, callback, options) {
        if (callback && (typeof callback === 'function' || typeof callback === 'object')) {
            const targetId = targetIds.get(this);
            const callbackId = callbackIds.get(callback);
            if (targetId && callbackId) listenerKeys.delete(`${targetId}:${type}:${callbackId}:${getCapture(options) ? 1 : 0}`);
        }
        return NativeRemoveEventListener.call(this, type, callback, options);
    };

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this.__dcufTestbedRequest = { method: String(method), url: String(url), startedAt: 0, endedAt: 0, status: 0 };
        return NativeXhrOpen.call(this, method, url, ...rest);
    };
    XMLHttpRequest.prototype.send = function (body) {
        const request = this.__dcufTestbedRequest || { method: 'UNKNOWN', url: '', startedAt: 0, endedAt: 0, status: 0 };
        request.body = typeof body === 'string' ? body : null;
        request.startedAt = performance.now();
        state.xhrRequests.push(request);
        this.addEventListener('loadend', () => {
            request.endedAt = performance.now();
            request.status = this.status;
        }, { once: true });
        return NativeXhrSend.call(this, body);
    };

    const startMirrorObserver = () => {
        if (!document.body) return;
        const observer = new NativeMutationObserver((records) => {
            const count = (node, selector) => {
                if (!(node instanceof Element)) return 0;
                return (node.matches(selector) ? 1 : 0) + node.querySelectorAll(selector).length;
            };
            records.forEach((record) => {
                record.addedNodes.forEach((node) => { state.mirrorAdded += count(node, '.custom-post-item'); });
                record.removedNodes.forEach((node) => { state.mirrorRemoved += count(node, '.custom-post-item'); });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startMirrorObserver, { once: true });
    else startMirrorObserver();

    globalThis.addEventListener('error', (event) => state.errors.push(String(event.error?.stack || event.message || 'window error')));
    globalThis.addEventListener('unhandledrejection', (event) => state.errors.push(String(event.reason?.stack || event.reason || 'unhandled rejection')));

    const recordFilterPass = (kind, scope, startedAt, targetCount) => {
        const normalizedCount = Number.isFinite(targetCount) ? targetCount : null;
        if (normalizedCount !== null) state.processedDomNodes += normalizedCount;
        state.filterPasses.push({
            kind,
            scope: String(scope || ''),
            durationMs: performance.now() - startedAt,
            targetCount: normalizedCount,
            timestamp: performance.now()
        });
        if (state.filterPasses.length > 5000) state.filterPasses.splice(0, state.filterPasses.length - 5000);
    };
    const installFilterInstrumentation = (attempt = 0) => {
        const module = globalThis.__dcufFilterModule;
        if (!module) {
            if (attempt < 20) setTimeout(() => installFilterInstrumentation(attempt + 1), 0);
            return;
        }
        if (module.__dcufTestbedInstrumented) return;
        Object.defineProperty(module, '__dcufTestbedInstrumented', { value: true, configurable: true });

        const syncPass = module.runSyncRefilterPass;
        if (typeof syncPass === 'function') {
            module.runSyncRefilterPass = function (scope, root, descriptors, options) {
                const startedAt = performance.now();
                const result = syncPass.call(this, scope, root, descriptors, options);
                recordFilterPass('sync', scope, startedAt, result?.length ?? descriptors?.length ?? null);
                return result;
            };
        }
        const observedItemsPass = module.applyFilterItems;
        if (typeof observedItemsPass === 'function') {
            module.applyFilterItems = function (items, ...rest) {
                const startedAt = performance.now();
                const result = observedItemsPass.call(this, items, ...rest);
                recordFilterPass('observed-items', 'items', startedAt, items?.length ?? null);
                return result;
            };
        }
        const fullPass = module.runFullRefilterPass;
        if (typeof fullPass === 'function') {
            module.runFullRefilterPass = async function (...args) {
                const startedAt = performance.now();
                const result = await fullPass.apply(this, args);
                recordFilterPass('full', args[0], startedAt, result?.length ?? null);
                return result;
            };
        }
    };
    queueMicrotask(() => installFilterInstrumentation());

    globalThis.__dcufTestbedMetrics = {
        snapshot() {
            return {
                ...state,
                activeTimeouts: activeTimeouts.size,
                activeIntervals: activeIntervals.size,
                activeAnimationFrames: activeAnimationFrames.size,
                mutationObserverCreationStacks: state.mutationObserverCreationStacks.slice(),
                xhrRequests: state.xhrRequests.map((item) => ({ ...item })),
                filterPasses: state.filterPasses.map((item) => ({ ...item })),
                errors: state.errors.slice(),
                activeListenerKeys: listenerKeys.size,
                domNodes: document.getElementsByTagName('*').length,
                heap: performance.memory ? {
                    usedJSHeapSize: performance.memory.usedJSHeapSize,
                    totalJSHeapSize: performance.memory.totalJSHeapSize,
                    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
                } : null,
                dcuf: globalThis.__dcufDiagnostics?.snapshot?.() || null,
                memory: globalThis.__dcufMemoryDebug?.sample?.('testbed') || null
            };
        }
    };
})();
