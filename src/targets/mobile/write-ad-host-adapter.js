    const __dcufWriteAdHostAdapter = (() => {
        const SURFACE_ID = 'write-ad-host';
        const SIGNATURE_SELECTOR = 'script[src*="/kas/static/ba.min.js"], ins.kakao_ad_area';
        const SUBSCRIBER_KEY = 'write-ad-host-adapter';
        const MAX_ATTEMPTS = 10;
        const RETRY_INTERVAL_MS = 250;
        let activeRoot = null;
        let activeCoordinator = null;
        let watchScope = null;
        let status = 'disconnected';
        let attempts = 0;
        let removedContainers = 0;
        let rootReplaced = false;
        let mutationSubscriberCount = 0;
        let observerCount = 0;
        let intervalCount = 0;
        let listenerCount = 0;

        const deepFreeze = (value) => {
            if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
            Object.values(value).forEach(deepFreeze);
            return Object.freeze(value);
        };

        const resolveLiveRoot = () => {
            const form = document.querySelector('form#write');
            const writeBox = form?.closest('.write_box');
            if (writeBox instanceof Element) return writeBox;
            if (activeRoot instanceof Element && activeRoot.isConnected) return activeRoot;
            return document.body instanceof Element ? document.body : null;
        };

        const collectAdContainers = (root) => {
            if (!(root instanceof Element)) return [];
            const containers = new Set();
            root.querySelectorAll(SIGNATURE_SELECTOR).forEach((node) => {
                const container = node.parentElement;
                if (container instanceof HTMLDivElement) containers.add(container);
            });
            return [...containers];
        };

        const removeMatchingAds = () => {
            const containers = collectAdContainers(activeRoot);
            if (containers.length === 0) return 0;
            containers.forEach((container) => container.remove());
            removedContainers += containers.length;
            console.log(`[DC Filter+UI] 글쓰기 페이지 광고 컨테이너 ${containers.length}개 제거 완료.`);
            return containers.length;
        };

        const stopWatching = (nextStatus) => {
            const scope = watchScope;
            watchScope = null;
            scope?.dispose();
            status = nextStatus;
        };

        const handleMutation = () => {
            const liveRoot = resolveLiveRoot();
            if (liveRoot instanceof Element && liveRoot !== activeRoot) {
                connect(liveRoot, { runtimeCoordinator: activeCoordinator });
                return;
            }
            if (removeMatchingAds() > 0) stopWatching('removed');
        };

        const startWatching = () => {
            watchScope = DCUF_UI_CONTRACTS.createDisposableScope(SURFACE_ID);
            const scope = watchScope;
            status = 'watching';

            const handlePageHide = () => stopWatching('pagehide');
            window.addEventListener('pagehide', handlePageHide, { once: true });
            listenerCount = 1;
            scope.own(() => {
                window.removeEventListener('pagehide', handlePageHide, { once: true });
                listenerCount = 0;
            });

            if (activeCoordinator && typeof activeCoordinator.subscribeMutations === 'function') {
                const unsubscribe = activeCoordinator.subscribeMutations(SUBSCRIBER_KEY, handleMutation, { contexts: ['write'] });
                mutationSubscriberCount = 1;
                scope.own(() => {
                    unsubscribe?.();
                    mutationSubscriberCount = 0;
                });
            } else if (activeRoot instanceof Element) {
                const observer = new MutationObserver(handleMutation);
                observer.observe(activeRoot, { childList: true, subtree: true });
                observerCount = 1;
                scope.own(() => {
                    observer.disconnect();
                    observerCount = 0;
                });
            }

            const intervalId = window.setInterval(() => {
                attempts += 1;
                const liveRoot = resolveLiveRoot();
                if (liveRoot instanceof Element && liveRoot !== activeRoot) {
                    connect(liveRoot, { runtimeCoordinator: activeCoordinator });
                    return;
                }
                if (removeMatchingAds() > 0) {
                    stopWatching('removed');
                } else if (attempts >= MAX_ATTEMPTS) {
                    stopWatching('timed-out');
                }
            }, RETRY_INTERVAL_MS);
            intervalCount = 1;
            scope.own(() => {
                window.clearInterval(intervalId);
                intervalCount = 0;
            });
        };

        const disconnect = () => {
            stopWatching('disconnected');
            activeRoot = null;
            activeCoordinator = null;
            attempts = 0;
            removedContainers = 0;
            rootReplaced = false;
        };

        function connect(root, { runtimeCoordinator = null } = {}) {
            if (!(root instanceof Element)) {
                disconnect();
                return snapshot();
            }
            if (activeRoot === root && status !== 'disconnected') return snapshot();
            const replaced = activeRoot instanceof Element && activeRoot !== root;
            stopWatching('disconnected');
            activeRoot = root;
            activeCoordinator = runtimeCoordinator;
            attempts = 0;
            removedContainers = 0;
            rootReplaced = replaced;
            status = 'checking';
            if (removeMatchingAds() > 0) status = 'removed';
            else startWatching();
            return snapshot();
        }

        const refresh = () => {
            const liveRoot = resolveLiveRoot();
            if (!(liveRoot instanceof Element)) {
                disconnect();
                return snapshot();
            }
            if (liveRoot !== activeRoot) return connect(liveRoot, { runtimeCoordinator: activeCoordinator });
            if (status === 'watching' && removeMatchingAds() > 0) stopWatching('removed');
            return snapshot();
        };

        const snapshot = () => deepFreeze({
            surface: SURFACE_ID,
            connected: activeRoot instanceof Element && activeRoot.isConnected,
            status,
            attempts,
            removedContainers,
            rootReplaced,
            signatureSelector: SIGNATURE_SELECTOR,
        });

        const snapshotResources = () => deepFreeze({
            activeRoots: activeRoot instanceof Element && activeRoot.isConnected ? 1 : 0,
            mutationSubscribers: mutationSubscriberCount,
            observers: observerCount,
            intervals: intervalCount,
            listeners: listenerCount,
        });

        return Object.freeze({
            connect,
            refresh,
            disconnect,
            dispose: disconnect,
            snapshot,
            snapshotResources,
        });
    })();
    __dcufRoot.__dcufWriteAdHostAdapter = __dcufWriteAdHostAdapter;
