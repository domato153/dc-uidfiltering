export const UI_INTENT_TYPES = Object.freeze({
    PALETTE_LOAD: 'palette/load',
    PALETTE_COMMIT: 'palette/commit',
    SURFACE_OPEN: 'surface/open',
    SURFACE_CLOSE: 'surface/close',
    FILTER_SETTINGS_COMMIT: 'filter-settings/commit',
    PERSONAL_BLOCK_ADD: 'personal-block/add',
    PERSONAL_BLOCK_REMOVE: 'personal-block/remove',
});

function cloneUiValue(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
}

function freezeUiValue(value, seen = new WeakSet()) {
    if (!value || typeof value !== 'object' || seen.has(value)) return value;
    seen.add(value);
    Object.values(value).forEach((child) => freezeUiValue(child, seen));
    return Object.freeze(value);
}

function comparableSnapshot(snapshot) {
    const value = cloneUiValue(snapshot);
    delete value.revision;
    return JSON.stringify(value);
}

export function createCommandResult(ok, code, committedSnapshot = null) {
    const result = { ok: Boolean(ok), code: String(code || (ok ? 'ok' : 'error')) };
    if (committedSnapshot) result.committedSnapshot = committedSnapshot;
    return Object.freeze(result);
}

export function createUiSurface({ mount, render, unmount }) {
    if (![mount, render, unmount].every((entry) => typeof entry === 'function')) {
        throw new TypeError('UiSurface requires mount, render, and unmount functions');
    }
    return Object.freeze({ mount, render, unmount });
}

export function createHostSurfacePort({ findAnchor, invokeNative }) {
    if (typeof findAnchor !== 'function' || typeof invokeNative !== 'function') {
        throw new TypeError('HostSurfacePort requires findAnchor and invokeNative functions');
    }
    return Object.freeze({ findAnchor, invokeNative });
}

export function createUiPortRuntime(initialSnapshot = {}) {
    let snapshot = freezeUiValue({ revision: 0, ...cloneUiValue(initialSnapshot) });
    const listeners = new Set();
    const handlers = new Map();
    let commandTail = Promise.resolve();

    const getSnapshot = () => snapshot;
    const subscribe = (listener) => {
        if (typeof listener !== 'function') throw new TypeError('UiPort.subscribe requires a function');
        listeners.add(listener);
        return () => listeners.delete(listener);
    };
    const commit = (patch, reason = 'commit') => {
        const candidate = { ...cloneUiValue(snapshot), ...cloneUiValue(patch || {}) };
        delete candidate.revision;
        if (comparableSnapshot(snapshot) === JSON.stringify(candidate)) {
            return Object.freeze({ changed: false, reason, snapshot });
        }
        snapshot = freezeUiValue({ revision: snapshot.revision + 1, ...candidate });
        listeners.forEach((listener) => {
            try { listener(snapshot, Object.freeze({ reason })); }
            catch (error) { console.warn('[DCUF UI] subscriber failed:', error); }
        });
        return Object.freeze({ changed: true, reason, snapshot });
    };
    const registerIntentHandler = (type, handler) => {
        if (!Object.values(UI_INTENT_TYPES).includes(type)) throw new Error(`Unknown UiIntent type: ${type}`);
        if (typeof handler !== 'function') throw new TypeError(`UiIntent handler must be a function: ${type}`);
        if (handlers.has(type)) throw new Error(`UiIntent handler already registered: ${type}`);
        handlers.set(type, handler);
        let active = true;
        return () => {
            if (!active) return false;
            active = false;
            return handlers.delete(type);
        };
    };
    const execute = async (intent) => {
        if (!intent || typeof intent !== 'object' || !Object.values(UI_INTENT_TYPES).includes(intent.type)) {
            return createCommandResult(false, 'invalid-intent');
        }
        const handler = handlers.get(intent.type);
        if (!handler) return createCommandResult(false, 'unsupported-intent');
        try {
            const before = snapshot;
            const value = await handler(freezeUiValue(cloneUiValue(intent)), Object.freeze({ getSnapshot, commit }));
            if (value?.ok === false) return createCommandResult(false, value.code || 'rejected');
            return createCommandResult(true, value?.code || 'committed', snapshot !== before ? snapshot : null);
        } catch (error) {
            console.warn(`[DCUF UI] intent failed: ${intent.type}`, error);
            return createCommandResult(false, 'handler-error');
        }
    };
    const dispatch = (intent) => {
        const result = commandTail.then(() => execute(intent));
        commandTail = result.catch(() => {});
        return result;
    };

    return Object.freeze({
        port: Object.freeze({ getSnapshot, subscribe, dispatch }),
        control: Object.freeze({
            commit,
            registerIntentHandler,
            get listenerCount() { return listeners.size; },
            get handlerCount() { return handlers.size; },
        }),
    });
}
