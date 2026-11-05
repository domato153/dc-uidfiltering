
// The verified native cascade needs these exact class relationships.
function __dcufLoginSelectorBindings() {
    return Object.freeze({
    "scope": "[data-dcuf-login]",
    "darkScope": "[data-dcuf-login].dc-filter-dark-mode",
    "body": "[data-dcuf-login] body",
    "page": "[data-dcuf-login] .login_wrap",
    "header": "[data-dcuf-login] .dcheader.bg",
    "headerInner": "[data-dcuf-login] .login_wrap .dchead",
    "logoGroup": "[data-dcuf-login] .dcheader.bg .dclogo",
    "logo": "[data-dcuf-login] .bg .dclogo .logo_img",
    "darkLogo": "[data-dcuf-login].dc-filter-dark-mode .bg .dclogo .logo_img",
    "loginLink": "[data-dcuf-login] .bg .dclogo .logo_img2",
    "container": "[data-dcuf-login] .login_wrap #container",
    "content": "[data-dcuf-login] .content.login",
    "card": "[data-dcuf-login] .login_wrap .login_page.kap_codewrap",
    "inputBox": "[data-dcuf-login] .login_inputbox",
    "inputInner": "[data-dcuf-login] .login_inputbox .inner",
    "fieldset": "[data-dcuf-login] .login_inputbox fieldset",
    "title": "[data-dcuf-login] .login_inputbox legend.blind",
    "fields": "[data-dcuf-login] .login_inputbox .inner input.int.bg",
    "placeholder": "[data-dcuf-login] .login_inputbox .int::placeholder",
    "primary": "[data-dcuf-login] .login_inputbox .btn_wfull",
    "primaryHover": "[data-dcuf-login] .login_inputbox .btn_wfull:hover",
    "options": "[data-dcuf-login] .idip_checkbox",
    "checkboxGroup": "[data-dcuf-login] .idip_checkbox .checkbox",
    "checkbox": "[data-dcuf-login] .checkbox input[type=\"checkbox\"]",
    "checkboxMark": "[data-dcuf-login] .checkbox.type1 > .checkmark",
    "checkboxLabel": "[data-dcuf-login] .checkbox.type1 label",
    "security": "[data-dcuf-login] .chk_ip",
    "recovery": "[data-dcuf-login] .logon_option",
    "recoveryLink": "[data-dcuf-login] .logon_option a",
    "recoverySeparator": "[data-dcuf-login] .logon_option a::before",
    "advertisement": "[data-dcuf-login] .login_page .ban_box",
    "footer": "[data-dcuf-login] .dcfoot",
    "policy": "[data-dcuf-login] .dcfoot .info_policy",
    "policyLink": "[data-dcuf-login] .dcfoot .info_policy a",
    "policySeparator": "[data-dcuf-login] .dcfoot .info_policy a::before",
    "copyright": "[data-dcuf-login] .dcfoot .copyright",
    "focus": "[data-dcuf-login] :is(input,button,a):focus-visible",
    "selection": "[data-dcuf-login] ::selection"
});
}

function __dcufIsLoginRoute(location) {
    return location?.protocol === 'https:' && location.hostname === 'sign.dcinside.com'
        && (location.pathname === '/login' || location.pathname === '/login/');
}

function __dcufMountLoginPresentation() {
    const previous = __dcufRoot.__dcufLoginController;
    if (typeof previous?.getSnapshot === 'function' && previous.getSnapshot().state !== 'disposed') return previous;
    const paletteKey = 'dcuf_mobile_ui_palette';
    const validIds = new Set(__dcufGetThemePresets().map(p => p.id));
    let state = 'waiting', active = true, palette = 'blue', dark = false, paletteSettled = false;
    let root = null, style = null, media = null, saved = null, listening = false;
    const normalize = value => typeof value === 'string' && validIds.has(value) ? value : 'blue';
    const restoreAttribute = (name, original, expected) => {
        if (!root || root.getAttribute(name) !== expected) return;
        if (original === null) root.removeAttribute(name); else root.setAttribute(name, original);
    };
    const cleanup = () => {
        document.removeEventListener('DOMContentLoaded', mount);
        if (listening) {
            media?.removeEventListener?.('change', syncTheme);
            window.removeEventListener('pageshow', syncTheme);
            listening = false;
        }
        style?.remove();
        style = null;
        if (saved) {
            restoreAttribute('data-dcuf-login', saved.login, 'ready');
            restoreAttribute('data-dcuf-palette', saved.palette, palette);
            if (root.classList.contains('dc-filter-dark-mode') === dark) root.classList.toggle('dc-filter-dark-mode', saved.dark);
        }
    };
    const dispose = () => {
        if (!active) return;
        active = false;
        cleanup();
        state = 'disposed';
    };
    const controller = Object.freeze({
        getSnapshot: () => Object.freeze({state, palette, dark, paletteSettled}),
        dispose,
    });
    __dcufRoot.__dcufLoginController = controller;

    function syncTheme() {
        if (!active || !root) return;
        dark = Boolean(document.getElementById('css-darkmode')) || Boolean(media?.matches);
        root.classList.toggle('dc-filter-dark-mode', dark);
    }
    function mount() {
        if (!active) return;
        try {
            const page = document.querySelector('#top.login_wrap');
            const card = page?.querySelector('.login_page');
            const form = card?.querySelector('.login_inputbox .inner > form');
            const action = form && new URL(form.getAttribute('action') || '', window.location.href);
            const valid = form?.getAttribute('method')?.toLowerCase() === 'post'
                && action?.origin === 'https://sign.dcinside.com' && action.pathname === '/login/member_check'
                && form.querySelector('input#id[name="user_id"][type="text"]')
                && form.querySelector('input#pw[name="pw"][type="password"]')
                && form.querySelector('button[type="submit"]');
            if (!valid || document.getElementById('dcuf-mobile-login-style')) {
                state = 'native'; paletteSettled = true; return;
            }
            root = document.documentElement;
            saved = {login:root.getAttribute('data-dcuf-login'), palette:root.getAttribute('data-dcuf-palette'), dark:root.classList.contains('dc-filter-dark-mode')};
            const descriptor = __dcufCreateLoginPresentation(__dcufLoginSelectorBindings());
            style = document.createElement('style');
            style.id = descriptor.id;
            style.textContent = descriptor.css;
            (document.head || root).appendChild(style);
            root.setAttribute('data-dcuf-login', 'ready');
            root.setAttribute('data-dcuf-palette', palette);
            media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
            syncTheme();
            media?.addEventListener?.('change', syncTheme);
            window.addEventListener('pageshow', syncTheme);
            listening = true;
            state = 'mounted';
            Promise.resolve().then(() => typeof GM_getValue === 'function' ? GM_getValue(paletteKey, 'blue') : 'blue')
                .then(value => {
                    if (!active || state !== 'mounted') return;
                    palette = normalize(value);
                    root.setAttribute('data-dcuf-palette', palette);
                })
                .catch(error => {
                    if (active) console.warn('[DCUF] login palette read failed; using blue:', error);
                })
                .finally(() => { paletteSettled = true; });
        } catch (error) {
            cleanup();
            state = 'native'; paletteSettled = true;
            console.warn('[DCUF] login presentation unavailable; keeping native form:', error);
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true});
    else mount();
    return controller;
}
