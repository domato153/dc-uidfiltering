; (() => {
    'use strict';

    const root = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
    const ui = root.__dcufUIModule;
    if (!ui || ui.__dcufLiveNativeBridgeInstalled) return;
    ui.__dcufLiveNativeBridgeInstalled = true;

    const WRITER_PROXY_CLASS = 'dcuf-writer-proxy';

    const findOriginalWriterTarget = (writer) => {
        if (!(writer instanceof HTMLElement)) return null;
        return writer.querySelector('.nickname, a, button, [onclick], [role="button"]') || writer;
    };

    ui.getWriterForMirror = function getWriterForMirror(originalRow, rowId, state) {
        const entry = state?.writerByRowId?.get(rowId);
        if (entry?.source instanceof HTMLElement && entry.source.isConnected) return entry.source;
        return originalRow.querySelector('.gall_writer, .ub-writer');
    };

    ui.moveWriterToMirror = function moveWriterToMirror(originalRow, rowId, state, writerEl, authorContainer) {
        if (!(originalRow instanceof HTMLElement) || !(state?.writerByRowId instanceof Map)) return null;
        if (!(writerEl instanceof HTMLElement) || !(authorContainer instanceof HTMLElement)) return null;

        const existing = state.writerByRowId.get(rowId);
        if (existing?.node instanceof HTMLElement && existing.node.isConnected && existing.source === writerEl) {
            if (existing.node.parentElement !== authorContainer) authorContainer.appendChild(existing.node);
            return existing.node;
        }

        existing?.node?.remove?.();
        const proxy = writerEl.cloneNode(true);
        if (!(proxy instanceof HTMLElement)) return null;
        proxy.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
        proxy.removeAttribute('id');
        proxy.classList.add(WRITER_PROXY_CLASS);
        proxy.dataset.dcufWriterProxy = '1';
        proxy.setAttribute('role', 'button');
        proxy.tabIndex = 0;

        const activate = (event) => {
            if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            event.stopPropagation();
            const target = findOriginalWriterTarget(writerEl);
            if (!(target instanceof HTMLElement) || !target.isConnected) return;
            target.click();
        };
        proxy.addEventListener('click', activate);
        proxy.addEventListener('keydown', activate);
        authorContainer.appendChild(proxy);

        state.writerByRowId.set(rowId, {
            node: proxy,
            source: writerEl,
            parent: writerEl.parentNode,
            nextSibling: writerEl.nextSibling,
            identity: null
        });
        return proxy;
    };

    ui.restoreWriterEntry = function restoreWriterEntry(entry) {
        if (entry?.node instanceof HTMLElement && entry.node !== entry.source) entry.node.remove();
        entry?.identity?.remove?.();
    };

    ui.bindRecentVisitNavigation = function bindRecentVisitNavigation() {
        document.querySelectorAll('.newvisit_history').forEach((historyRoot) => {
            if (typeof this.prepareRecentVisitList === 'function') this.prepareRecentVisitList(historyRoot);
        });
    };
})();
