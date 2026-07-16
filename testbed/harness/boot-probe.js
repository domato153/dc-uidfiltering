(() => {
    const frames = [];
    const events = [];
    let active = true;
    const isPaintVisible = (element) => {
        if (!(element instanceof HTMLElement)) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none'
            && style.visibility !== 'hidden'
            && Number(style.opacity) > 0
            && rect.width > 0
            && rect.height > 0;
    };
    const countVisibleProtectedTargets = () => {
        const configuredUids = globalThis.__DCUF_TESTBED_CONFIG__?.boot?.protectedUids;
        const protectedUids = Array.isArray(configuredUids) && configuredUids.length > 0
            ? configuredUids
            : [
                'blocked-list-user',
                'blocked-related-user',
                'blocked-image-user',
                'blocked-comment-user'
            ];
        const writers = document.querySelectorAll(protectedUids.map((uid) => `[data-uid="${CSS.escape(String(uid))}"]`).join(','));
        const targets = new Set();
        writers.forEach((writer) => {
            const target = writer.closest('tr, li, .custom-post-item');
            if (target) targets.add(target);
        });
        return Array.from(targets).filter(isPaintVisible).length;
    };
    const sample = () => {
        if (!active) return;
        const root = document.documentElement;
        const body = document.body;
        const bodyStyle = body ? getComputedStyle(body) : null;
        frames.push({
            ts: performance.now(),
            state: root?.getAttribute('data-dcuf-boot-state') || '',
            overlayCount: document.querySelectorAll('#dcuf-boot-overlay').length,
            bodyOpacity: bodyStyle?.opacity || '',
            bodyVisibility: bodyStyle?.visibility || '',
            bodyPointerEvents: bodyStyle?.pointerEvents || '',
            visibleProtectedTargets: countVisibleProtectedTargets()
        });
        if (frames.length < 1200 && root?.getAttribute('data-dcuf-boot-state') !== 'ready') {
            requestAnimationFrame(sample);
        }
    };
    globalThis.__dcufBootProbe = {
        snapshot: () => frames.map((frame) => ({ ...frame })),
        events: () => events.map((event) => ({ ...event })),
        stop: () => { active = false; }
    };
    addEventListener('dcuf:boot-ready', (event) => {
        events.push({ type: 'ready', ts: performance.now(), ...event.detail });
    });
    addEventListener('dcuf:boot-degraded', (event) => {
        events.push({ type: 'degraded', ts: performance.now(), ...event.detail });
    });
    requestAnimationFrame(sample);
})();
