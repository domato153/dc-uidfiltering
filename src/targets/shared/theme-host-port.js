    const __dcufThemeHost = DCUF_UI_CONTRACTS.createHostSurfacePort({
        findAnchor(name) {
            if (name === 'root') return document.documentElement;
            if (name === 'head') return document.head;
            if (name === 'body') return document.body;
            if (name === 'mount') return document.body || document.documentElement;
            if (name === 'active-element') return document.activeElement;
            return null;
        },
        invokeNative(action, value, options = null) {
            if (action === 'get-by-id') return document.getElementById(value);
            if (action === 'create-element') return document.createElement(value);
            if (action === 'on-dom-ready') {
                document.addEventListener('DOMContentLoaded', value, options || { once: true });
                return () => document.removeEventListener('DOMContentLoaded', value, options || { once: true });
            }
            if (action === 'palette-change') {
                window.__dcufActivePalette = value.id;
                window.dispatchEvent(new CustomEvent('dcuf:palette-change', { detail: value }));
                return true;
            }
            throw new Error(`Unsupported theme host action: ${action}`);
        },
    });
