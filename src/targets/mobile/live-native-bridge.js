; (() => {
    'use strict';

    const root = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
    const ui = root.__dcufUIModule;
    if (!ui || ui.__dcufLiveNativeBridgeInstalled) return;
    ui.__dcufLiveNativeBridgeInstalled = true;

    if (!ui.__dcufNativeRecentNavigation) {
        ui.__dcufNativeRecentNavigation = true;
        ui.bindRecentVisitNavigation = function bindRecentVisitNavigation() {
            document.querySelectorAll('.newvisit_history').forEach((historyRoot) => {
                if (typeof this.prepareRecentVisitList === 'function') this.prepareRecentVisitList(historyRoot);
            });
            if (this._recentVisitNavigationBound) return;
            this._recentVisitNavigationBound = true;
            document.addEventListener('click', (event) => {
                const target = event.target instanceof Element ? event.target : null;
                const button = target?.closest('.btn_visit_prev,.btn_visit_next,.bnt_visit_prev,.bnt_visit_next');
                const historyRoot = button?.closest('.newvisit_history');
                if (!(button instanceof HTMLElement) || !(historyRoot instanceof HTMLElement) || button.parentElement !== historyRoot) return;
                const list = this.prepareRecentVisitList(historyRoot);
                if (!(list instanceof HTMLElement)) return;
                const direction = button.matches('.btn_visit_prev,.bnt_visit_prev') ? -1 : 1;
                const max = Math.max(0, list.scrollWidth - list.clientWidth);
                const step = Math.max(1, list.clientWidth - 24);
                let targetLeft = Math.max(0, Math.min(max, list.scrollLeft + direction * step));
                const edgeTolerance = Math.min(96, Math.max(32, step * 0.2));
                if (direction < 0 && targetLeft <= edgeTolerance) targetLeft = 0;
                if (direction > 0 && max - targetLeft <= edgeTolerance) targetLeft = max;
                const behavior = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
                list.scrollTo({ left: targetLeft, behavior });
                window.setTimeout(() => {
                    if (targetLeft === 0 || targetLeft === max) list.scrollLeft = targetLeft;
                    this.updateRecentVisitControls(historyRoot, list);
                }, behavior === 'smooth' ? 360 : 0);
            });
        };
    }

})();
