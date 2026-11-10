export function createDisposableScope(label = 'ui-surface') {
    const disposers = [];
    let disposed = false;
    const own = (disposer) => {
        if (typeof disposer !== 'function') throw new TypeError(`${label}: disposer must be a function`);
        if (disposed) {
            disposer();
            return () => {};
        }
        disposers.push(disposer);
        let active = true;
        return () => {
            if (!active) return;
            active = false;
            const index = disposers.indexOf(disposer);
            if (index >= 0) disposers.splice(index, 1);
            disposer();
        };
    };
    const listen = (target, type, listener, options) => {
        if (!target || typeof target.addEventListener !== 'function') throw new TypeError(`${label}: invalid event target`);
        target.addEventListener(type, listener, options);
        return own(() => target.removeEventListener(type, listener, options));
    };
    const timeout = (listener, delay) => {
        const id = globalThis.setTimeout(listener, delay);
        return own(() => globalThis.clearTimeout(id));
    };
    const observeOwnedRoot = (root, listener, options) => {
        if (!(root instanceof Node)) throw new TypeError(`${label}: observer root must be a Node`);
        const observer = new MutationObserver(listener);
        observer.observe(root, options);
        own(() => observer.disconnect());
        return observer;
    };
    const dispose = () => {
        if (disposed) return;
        disposed = true;
        while (disposers.length) {
            try { disposers.pop()(); }
            catch (error) { console.warn(`[DCUF UI] ${label} disposal failed:`, error); }
        }
    };
    return Object.freeze({
        own,
        listen,
        timeout,
        observeOwnedRoot,
        dispose,
        get disposed() { return disposed; },
        get size() { return disposers.length; },
    });
}
