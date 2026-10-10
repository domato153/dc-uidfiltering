// Local Testbed diagnostic only. Installed after the accepted metrics wrapper.
// Callbacks/options are passed through unchanged; weak target refs avoid pinning DOM.
(() => {
    const add = EventTarget.prototype.addEventListener;
    const remove = EventTarget.prototype.removeEventListener;
    const targetIds = new WeakMap(), callbackIds = new WeakMap();
    const targets = new Map(), entries = new Map(), operations = [];
    const baselineLedgerCount = window.__dcufTestbedMetrics.snapshot().activeListenerKeys;
    let nextTarget = 1, nextCallback = 1, phase = 'initialization';
    const id = (map, value, next) => {
        if (!map.has(value)) map.set(value, next());
        return map.get(value);
    };
    // Avoid invoking option getters a second time. Unknown descriptors stay unknown.
    const option = (options, key, fallback) => {
        if (typeof options === 'boolean') return key === 'capture' ? options : fallback;
        if (!options) return fallback;
        for (let current = options; current; current = Object.getPrototypeOf(current)) {
            const descriptor = Object.getOwnPropertyDescriptor(current, key);
            if (descriptor) return Object.hasOwn(descriptor, 'value') ? descriptor.value : 'UNKNOWN_GETTER';
        }
        return fallback;
    };
    const describe = (target) => {
        if (!target) return { kind: 'collected', connected: null };
        if (target === window) return { kind: 'window', connected: true };
        if (target === document) return { kind: 'document', connected: true };
        if (!(target instanceof Element)) return { kind: target.constructor?.name || 'EventTarget', connected: null };
        return { kind: target.tagName, id: target.id, classes: target.getAttribute('class') || '',
            connected: target.isConnected, surface: target.closest('[data-dcuf-surface]')?.getAttribute('data-dcuf-surface') || null,
            nativeHeader: Boolean(target.closest('header,.gnb_bar,.newvisit_list,.issue_contentbox,#gall_top_recom')),
            dcuf: Boolean(target.closest('[class*="dcuf-"],#dcuf-palette-panel,.custom-post-list')) };
    };
    const identity = (target, type, callback, options) => {
        const targetId = id(targetIds, target, () => nextTarget++);
        const callbackId = id(callbackIds, callback, () => nextCallback++);
        targets.set(targetId, new WeakRef(target));
        const capture = option(options, 'capture', false);
        return { key: `${targetId}:${type}:${callbackId}:${capture}`, targetId, callbackId, capture };
    };
    EventTarget.prototype.addEventListener = function (type, callback, options) {
        const result = add.call(this, type, callback, options);
        if (callback && (typeof callback === 'function' || typeof callback === 'object')) {
            const record = identity(this, type, callback, options);
            const duplicate = entries.get(record.key)?.registered === true;
            if (!duplicate) entries.set(record.key, { ...record, type, registered: true, phase,
                once: option(options, 'once', false), passive: option(options, 'passive', null),
                signal: option(options, 'signal', null) instanceof AbortSignal
                    ? new WeakRef(option(options, 'signal', null)) : null,
                callbackSource: typeof callback === 'function' ? Function.prototype.toString.call(callback) : '[handleEvent object]',
                stack: new Error().stack.split('\n').slice(2, 7), registrationTarget: describe(this) });
            operations.push({ operation: 'add', phase, key: record.key, duplicate });
        }
        return result;
    };
    EventTarget.prototype.removeEventListener = function (type, callback, options) {
        const result = remove.call(this, type, callback, options);
        if (callback && (typeof callback === 'function' || typeof callback === 'object')) {
            const record = identity(this, type, callback, options);
            if (entries.has(record.key)) entries.get(record.key).registered = false;
            operations.push({ operation: 'remove', phase, key: record.key });
        }
        return result;
    };
    window.__dcufListenerDiagnostic = Object.freeze({
        setPhase(value) { phase = value; },
        target(targetId) { return targets.get(targetId)?.deref(); },
        snapshot() {
            return { baselineLedgerCount, operations: operations.slice(), entries: [...entries.values()].map(({ signal, ...entry }) => ({
                ...entry, signalAborted: signal ? signal.deref()?.aborted ?? 'COLLECTED' : null,
                target: describe(targets.get(entry.targetId)?.deref()) })) };
        },
    });
})();
