(() => {
    'use strict';

    const root = typeof unsafeWindow !== 'undefined' ? unsafeWindow : globalThis;
    if (root.__dcufWriteDefaultsAttached) return;
    root.__dcufWriteDefaultsAttached = true;

    if (!/\/board\/(?:write|modify)(?:\/|$)/.test(window.location.pathname || '')) return;

    const MARKER = 'dcufPumxDefaultActivated';
    const RETRY_INTERVAL_MS = 250;
    const DEADLINE_MS = 2000;
    const now = () => (typeof performance?.now === 'function' ? performance.now() : Date.now());
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

    const complete = (state, button) => {
        if (!(button instanceof HTMLElement) || !isPumxActive(button)) return false;
        button.dataset[MARKER] = '1';
        root.__dcufPumxDefaultCompletedButton = button;
        stopRetry(state);
        return true;
    };

    const scheduleAttempt = (state, delay = RETRY_INTERVAL_MS) => {
        if (state.stopped || state.timer) return;
        const remaining = Math.max(0, state.deadlineAt - now());
        if (remaining <= 0) {
            stopRetry(state);
            return;
        }
        state.timer = window.setTimeout(() => {
            state.timer = 0;
            attempt(state);
        }, Math.min(delay, remaining));
    };

    const attempt = (state) => {
        if (!state || state.stopped) return;
        const currentTime = now();
        if (currentTime >= state.deadlineAt) {
            stopRetry(state);
            return;
        }
        if (currentTime - state.lastAttemptAt < RETRY_INTERVAL_MS) {
            scheduleAttempt(state, RETRY_INTERVAL_MS - (currentTime - state.lastAttemptAt));
            return;
        }

        state.lastAttemptAt = currentTime;
        const button = document.getElementById('btn_pumx');
        state.button = button instanceof HTMLElement ? button : null;
        if (complete(state, state.button)) return;
        if (state.button) {
            state.button.removeAttribute(`data-${MARKER.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`);
            state.button.click();
            if (complete(state, state.button)) return;
        }
        scheduleAttempt(state);
    };

    const observeActivation = () => {
        const previous = root.__dcufPumxDefaultState;
        if (previous) stopRetry(previous);

        const state = {
            startedAt: now(),
            deadlineAt: now() + DEADLINE_MS,
            lastAttemptAt: -Infinity,
            timer: 0,
            observer: null,
            unsubscribe: null,
            button: null,
            stopped: false,
            mutationQueued: false
        };
        root.__dcufPumxDefaultState = state;

        const notifyMutation = () => {
            if (state.stopped || state.mutationQueued) return;
            state.mutationQueued = true;
            queueMicrotask(() => {
                state.mutationQueued = false;
                attempt(state);
            });
        };

        const coordinator = root.__dcufRuntimeCoordinator;
        if (coordinator && typeof coordinator.subscribeMutations === 'function') {
            state.unsubscribe = coordinator.subscribeMutations('write-pumx-defaults', notifyMutation);
        } else if (document.documentElement) {
            state.observer = new MutationObserver(notifyMutation);
            state.observer.observe(document.documentElement, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'aria-pressed', 'id']
            });
        }

        attempt(state);
        return state;
    };

    root.__dcufEnsurePumxDefault = () => {
        const button = document.getElementById('btn_pumx');
        if (button instanceof HTMLElement && root.__dcufPumxDefaultCompletedButton === button) return true;
        const pending = root.__dcufPumxDefaultState;
        if (pending && !pending.stopped && pending.button === button) return false;
        if (button instanceof HTMLElement && isPumxActive(button)) {
            stopRetry(pending);
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
