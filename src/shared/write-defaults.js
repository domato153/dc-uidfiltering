(() => {
    'use strict';

    const root = typeof unsafeWindow !== 'undefined' ? unsafeWindow : globalThis;
    if (root.__dcufWriteDefaultsAttached) return;
    root.__dcufWriteDefaultsAttached = true;

    if (!/\/board\/(?:write|modify)(?:\/|$)/.test(window.location.pathname || '')) return;

    const MARKER = 'dcufPumxDefaultActivated';
    const RETRY_INTERVAL_MS = 250;
    const MAX_RETRIES = 12;

    const isPumxActive = (button) => button instanceof HTMLElement
        && (button.classList.contains('on') || button.getAttribute('aria-pressed') === 'true');

    const stopRetry = (state) => {
        if (!state || state.stopped) return;
        state.stopped = true;
        if (state.timer) window.clearTimeout(state.timer);
        state.timer = 0;
        state.observer?.disconnect?.();
        state.unsubscribe?.();
        if (root.__dcufPumxDefaultState === state) root.__dcufPumxDefaultState = null;
    };

    const observeActivation = () => {
        const previous = root.__dcufPumxDefaultState;
        if (previous) stopRetry(previous);

        const state = { attempts: 0, timer: 0, observer: null, unsubscribe: null, button: null, stopped: false };
        root.__dcufPumxDefaultState = state;
        const attempt = () => {
            if (state.stopped) return;
            state.attempts += 1;
            const button = document.getElementById('btn_pumx');
            if (button instanceof HTMLElement) {
                state.button = button;
                if (isPumxActive(button)) {
                    button.dataset[MARKER] = '1';
                    root.__dcufPumxDefaultCompletedButton = button;
                    stopRetry(state);
                    return;
                }

                // A stale marker is never accepted without a live active state.
                button.removeAttribute('data-dcuf-pumx-default-activated');
                button.click();
                if (isPumxActive(button)) {
                    button.dataset[MARKER] = '1';
                    stopRetry(state);
                    return;
                }
            }

            if (state.attempts >= MAX_RETRIES) {
                stopRetry(state);
                return;
            }
            state.timer = window.setTimeout(() => {
                state.timer = 0;
                attempt();
            }, RETRY_INTERVAL_MS);
        };

        state.observer = new MutationObserver(() => attempt());
        if (document.documentElement) {
            state.observer.observe(document.documentElement, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'aria-pressed', 'id']
            });
        }

        const coordinator = root.__dcufRuntimeCoordinator;
        if (coordinator && typeof coordinator.subscribeMutations === 'function') {
            state.unsubscribe = coordinator.subscribeMutations('write-pumx-defaults', () => attempt());
        }
        attempt();
        return state;
    };

    root.__dcufEnsurePumxDefault = () => {
        const button = document.getElementById('btn_pumx');
        if (button instanceof HTMLElement && root.__dcufPumxDefaultCompletedButton === button) return true;
        const pending = root.__dcufPumxDefaultState;
        if (pending && !pending.stopped && pending.button === button) return false;
        if (button instanceof HTMLElement && isPumxActive(button)) {
            stopRetry(root.__dcufPumxDefaultState);
            button.dataset[MARKER] = '1';
            root.__dcufPumxDefaultCompletedButton = button;
            return true;
        }
        observeActivation();
        return false;
    };

    const start = () => { root.__dcufEnsurePumxDefault(); };
    window.addEventListener('pagehide', () => stopRetry(root.__dcufPumxDefaultState), { once: true });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
})();
