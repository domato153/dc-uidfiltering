const serialize = (value) => JSON.stringify(value).replaceAll('</script>', '<\\/script>');

export function hostBehaviorSimulatorScript({
    popupSelector = '',
    delegatedRootSelector = '[data-host-delegation-root]'
} = {}) {
    return `<script>
(() => {
    const config = ${serialize({ popupSelector, delegatedRootSelector })};
    const state = window.__dcufHostSimulator = {
        delegatedClicks: Object.create(null),
        submitCalls: 0,
        closeCalls: 0,
        reopenCalls: 0,
        originalPopup: null,
        originalButtons: []
    };
    const root = document.querySelector(config.delegatedRootSelector);
    const popup = config.popupSelector ? document.querySelector(config.popupSelector) : null;
    state.originalPopup = popup;
    state.originalButtons = Array.from(root?.querySelectorAll('button') || []);
    root?.addEventListener('click', (event) => {
        const control = event.target instanceof Element ? event.target.closest('[data-host-action]') : null;
        if (!(control instanceof HTMLButtonElement) || !root.contains(control)) return;
        const action = control.dataset.hostAction || 'unknown';
        state.delegatedClicks[action] = (state.delegatedClicks[action] || 0) + 1;
        if (action === 'cancel' && popup instanceof HTMLElement) {
            state.closeCalls += 1;
            popup.style.display = 'none';
        }
        if (action === 'reopen' && popup instanceof HTMLElement) {
            state.reopenCalls += 1;
            popup.style.display = '';
        }
    });
    root?.addEventListener('submit', () => { state.submitCalls += 1; });
    window.__dcufHostReopenPopup = () => {
        if (!(popup instanceof HTMLElement)) return false;
        state.reopenCalls += 1;
        popup.style.display = '';
        return true;
    };
})();
</script>`;
}

export function pumxHostSimulatorScript({
    buttonDelayMs = 100,
    handlerDelayMs = 600,
    alreadyActive = false,
    omitButton = false
} = {}) {
    return `<script>
(() => {
    const config = ${serialize({ buttonDelayMs, handlerDelayMs, alreadyActive, omitButton })};
    const state = window.__dcufHostPumx = {
        buttonInsertions: 0,
        clickEvents: 0,
        handlerCalls: 0
    };
    const host = document.querySelector('[data-host-pumx-root]');
    host?.addEventListener('click', (event) => {
        if (event.target instanceof Element && event.target.closest('#btn_pumx')) state.clickEvents += 1;
    });
    const registerHandler = () => {
        window.toggle_pumx = (button) => {
            state.handlerCalls += 1;
            const active = !button.classList.contains('on');
            button.classList.toggle('on', active);
            button.setAttribute('aria-pressed', active ? 'true' : 'false');
        };
    };
    const insertButton = () => {
        if (config.omitButton || !(host instanceof HTMLElement)) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.id = 'btn_pumx';
        button.className = 'btn_write_type fsize12';
        button.setAttribute('onclick', 'toggle_pumx(this)');
        button.setAttribute('aria-pressed', config.alreadyActive ? 'true' : 'false');
        button.classList.toggle('on', config.alreadyActive);
        button.textContent = '펌 금지';
        host.appendChild(button);
        state.buttonInsertions += 1;
    };
    if (config.handlerDelayMs <= 0) registerHandler();
    else window.setTimeout(registerHandler, config.handlerDelayMs);
    if (config.buttonDelayMs <= 0) insertButton();
    else window.setTimeout(insertButton, config.buttonDelayMs);
})();
</script>`;
}
