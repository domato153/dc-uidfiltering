(() => {
    'use strict';

    const root = typeof unsafeWindow !== 'undefined' ? unsafeWindow : globalThis;
    if (root.__dcufWriteDefaultsAttached) return;
    root.__dcufWriteDefaultsAttached = true;

    if (!/\/board\/write(?:\/|$)/.test(window.location.pathname || '')) return;

    const activatePumx = () => {
        const button = document.getElementById('btn_pumx');
        if (!(button instanceof HTMLButtonElement)) return false;
        if (button.dataset.dcufPumxDefaultActivated === '1') return true;

        button.dataset.dcufPumxDefaultActivated = '1';
        button.click();
        return true;
    };

    const start = () => {
        if (activatePumx()) return;

        const observer = new MutationObserver(() => {
            if (activatePumx()) observer.disconnect();
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
        window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
})();
