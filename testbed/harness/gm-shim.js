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

    globalThis.unsafeWindow = globalThis;
    globalThis.GM_getValue = async (key, fallbackValue) => {
        reads.push({ key, ts: Date.now() });
        return clone(values.has(key) ? values.get(key) : fallbackValue);
    };
    globalThis.GM_setValue = async (key, value) => {
        const storedValue = clone(value);
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
        }
    };
})();
