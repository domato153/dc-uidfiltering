(() => {
    const config = globalThis.__DCUF_TESTBED_CONFIG__ || {};
    const clone = (value) => {
        if (value === undefined || value === null) return value;
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    };
    const initial = config.storage && typeof config.storage === 'object' ? config.storage : {};
    const values = new Map(Object.entries(clone(initial)));
    const writes = [];
    const reads = [];
    const styles = [];
    const menuCommands = [];
    const behavior = config.gmBehavior && typeof config.gmBehavior === 'object' ? config.gmBehavior : {};
    const delayByKey = behavior.delayByKey && typeof behavior.delayByKey === 'object' ? behavior.delayByKey : {};
    const writeDelayByKey = behavior.writeDelayByKey && typeof behavior.writeDelayByKey === 'object' ? behavior.writeDelayByKey : {};
    const rejectOnceKeys = new Set(Array.isArray(behavior.rejectOnceKeys) ? behavior.rejectOnceKeys : []);
    const pendingKeys = new Set(Array.isArray(behavior.pendingKeys) ? behavior.pendingKeys : []);
    const pendingResolvers = new Map();

    globalThis.unsafeWindow = globalThis;
    globalThis.GM_getValue = async (key, fallbackValue) => {
        reads.push({ key, ts: Date.now() });
        if (rejectOnceKeys.delete(key)) throw new Error(`GM_getValue rejected once: ${key}`);
        const delayMs = Math.max(0, Number(delayByKey[key]) || 0);
        if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
        if (pendingKeys.has(key)) {
            await new Promise((resolve) => {
                const resolvers = pendingResolvers.get(key) || [];
                resolvers.push(resolve);
                pendingResolvers.set(key, resolvers);
            });
        }
        return clone(values.has(key) ? values.get(key) : fallbackValue);
    };
    globalThis.GM_setValue = async (key, value) => {
        const storedValue = clone(value);
        const delayMs = Math.max(0, Number(writeDelayByKey[key]) || 0);
        if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
        values.set(key, storedValue);
        writes.push({ key, value: clone(storedValue), ts: Date.now() });
    };
    globalThis.GM_addStyle = (cssText) => {
        const style = document.createElement('style');
        style.dataset.dcufTestbedGmStyle = '1';
        style.textContent = String(cssText || '');
        styles.push(style);
        const mount = document.head || document.documentElement;
        if (mount) mount.appendChild(style);
        else document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style), { once: true });
        return style;
    };
    globalThis.GM_registerMenuCommand = (label, callback) => {
        menuCommands.push({ label: String(label), callback });
        return menuCommands.length;
    };

    globalThis.__dcufTestbedGM = {
        snapshot() {
            return {
                values: Object.fromEntries(Array.from(values.entries()).map(([key, value]) => [key, clone(value)])),
                writes: clone(writes),
                reads: clone(reads),
                styleCount: styles.length,
                menuLabels: menuCommands.map((item) => item.label)
            };
        },
        async invokeMenu(label) {
            const command = menuCommands.find((item) => item.label === label);
            if (!command) throw new Error(`Unknown menu command: ${label}`);
            return command.callback();
        },
        async set(key, value) {
            return globalThis.GM_setValue(key, value);
        },
        async get(key, fallbackValue) {
            return globalThis.GM_getValue(key, fallbackValue);
        },
        release(key) {
            pendingKeys.delete(key);
            const resolvers = pendingResolvers.get(key) || [];
            pendingResolvers.delete(key);
            resolvers.forEach((resolve) => resolve());
            return resolvers.length;
        },
        setPending(key, pending = true) {
            if (pending) pendingKeys.add(key);
            else this.release(key);
        }
    };
})();
