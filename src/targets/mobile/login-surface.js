(function installDcufLoginSurface() {
    'use strict';

    if (window.top !== window.self) return;
    const isProductionLogin = window.location.hostname === 'sign.dcinside.com'
        && window.location.pathname === '/login';
    const isTestbedLogin = window.__DCUF_TESTBED_CONFIG__?.boot?.loginSurface === true
        && window.location.pathname === '/__testbed/login';
    if (!isProductionLogin && !isTestbedLogin) return;
    const PALETTE_STORAGE_KEY = 'dcuf_mobile_ui_palette';
    const DEFAULT_PALETTE_ID = 'blue';
    const PALETTES = Object.freeze({
        blue: Object.freeze({ light: ['#3f6de0', '#245bda'], dark: ['#8cb4ff', '#3868df'] }),
        purple: Object.freeze({ light: ['#7c3aed', '#6d28d9'], dark: ['#c4b5fd', '#7c3aed'] }),
        green: Object.freeze({ light: ['#16805d', '#047857'], dark: ['#6ee7b7', '#047857'] }),
        orange: Object.freeze({ light: ['#c2410c', '#9a3412'], dark: ['#fdba74', '#c2410c'] }),
        mono: Object.freeze({ light: ['#526274', '#374151'], dark: ['#cbd5e1', '#475569'] }),
        indigo: Object.freeze({ light: ['#4f46e5', '#4338ca'], dark: ['#818cf8', '#4f46e5'] }),
        sky: Object.freeze({ light: ['#0284c7', '#0369a1'], dark: ['#38bdf8', '#0369a1'] }),
        cyan: Object.freeze({ light: ['#0891b2', '#0e7490'], dark: ['#67e8f9', '#0e7490'] }),
        teal: Object.freeze({ light: ['#0f766e', '#115e59'], dark: ['#5eead4', '#0f766e'] }),
        lime: Object.freeze({ light: ['#65a30d', '#4d7c0f'], dark: ['#bef264', '#65a30d'] }),
        amber: Object.freeze({ light: ['#d97706', '#b45309'], dark: ['#fcd34d', '#d97706'] }),
        red: Object.freeze({ light: ['#dc2626', '#b91c1c'], dark: ['#f87171', '#dc2626'] }),
        rose: Object.freeze({ light: ['#e11d48', '#be123c'], dark: ['#fb7185', '#e11d48'] }),
        pink: Object.freeze({ light: ['#db2777', '#be185d'], dark: ['#f472b6', '#db2777'] })
    });
    const normalizePalette = (value) => typeof value === 'string' && PALETTES[value]
        ? value
        : DEFAULT_PALETTE_ID;
    let selectedPaletteId = DEFAULT_PALETTE_ID;
    const applyPalette = (value) => {
        const id = normalizePalette(value);
        selectedPaletteId = id;
        document.documentElement?.setAttribute('data-dcuf-palette', id);
        return id;
    };
    const buildPaletteCss = (mode) => Object.entries(PALETTES).map(([id, colors]) => `
        :root[data-dcuf-palette="${id}"] {
            --dcuf-login-accent: ${colors[mode][0]};
            --dcuf-login-accent-strong: ${colors[mode][1]};
        }
    `).join('');
    applyPalette(DEFAULT_PALETTE_ID);
    try {
        Promise.resolve(GM_getValue(PALETTE_STORAGE_KEY, DEFAULT_PALETTE_ID))
            .then(applyPalette)
            .catch(() => applyPalette(DEFAULT_PALETTE_ID));
    } catch {
        applyPalette(DEFAULT_PALETTE_ID);
    }
    document.addEventListener('DOMContentLoaded', () => applyPalette(selectedPaletteId), { once: true });
    const installStyle = () => {
        if (document.getElementById('dcuf-login-surface-style')) return;
        const mount = document.head || document.documentElement;
        if (!mount) return;
        const style = document.createElement('style');
        style.id = 'dcuf-login-surface-style';
        style.textContent = `
        :root {
            color-scheme: light dark;
            --dcuf-login-accent: #3f6de0;
            --dcuf-login-accent-strong: #245bda;
            --dcuf-login-page: #dbe5f4;
            --dcuf-login-page-glow: color-mix(in srgb, var(--dcuf-login-accent) 34%, transparent);
            --dcuf-login-panel: rgba(224, 231, 242, .40);
            --dcuf-login-panel-solid: #eef3fb;
            --dcuf-login-input: rgba(255, 255, 255, .27);
            --dcuf-login-control: rgba(255, 255, 255, .145);
            --dcuf-login-active: var(--dcuf-login-accent-strong);
            --dcuf-login-active-top: color-mix(in srgb, var(--dcuf-login-accent) 78%, white);
            --dcuf-login-active-glass: color-mix(in srgb, var(--dcuf-login-active) 56%, rgba(18, 30, 58, .38));
            --dcuf-login-active-glass-top: color-mix(in srgb, var(--dcuf-login-active-top) 52%, rgba(255, 255, 255, .24));
            --dcuf-login-on-active: #fff;
            --dcuf-login-fg: #202b3c;
            --dcuf-login-muted: #647085;
            --dcuf-login-border: rgba(83, 103, 143, .25);
            --dcuf-login-border-strong: rgba(58, 81, 137, .42);
            --dcuf-login-highlight: rgba(255, 255, 255, .28);
            --dcuf-login-rim: rgba(255, 255, 255, .76);
            --dcuf-login-shadow: 0 32px 90px rgba(26, 38, 72, .26), 0 8px 28px rgba(26, 38, 72, .12);
        }
        ${buildPaletteCss('light')}
        @media (prefers-color-scheme: dark) {
            :root {
                --dcuf-login-page: #08111f;
                --dcuf-login-page-glow: color-mix(in srgb, var(--dcuf-login-accent) 26%, transparent);
                --dcuf-login-panel: rgba(16, 25, 43, .46);
                --dcuf-login-panel-solid: #182238;
                --dcuf-login-input: rgba(7, 13, 25, .36);
                --dcuf-login-control: rgba(151, 170, 214, .09);
                --dcuf-login-active: var(--dcuf-login-accent-strong);
                --dcuf-login-active-top: color-mix(in srgb, var(--dcuf-login-accent) 72%, white);
                --dcuf-login-active-glass: color-mix(in srgb, var(--dcuf-login-active) 56%, rgba(5, 10, 22, .38));
                --dcuf-login-active-glass-top: color-mix(in srgb, var(--dcuf-login-active-top) 54%, rgba(255, 255, 255, .13));
                --dcuf-login-on-active: #fff;
                --dcuf-login-fg: #edf2fa;
                --dcuf-login-muted: #aeb8c8;
                --dcuf-login-border: rgba(185, 199, 229, .17);
                --dcuf-login-border-strong: rgba(170, 190, 235, .31);
                --dcuf-login-highlight: rgba(255, 255, 255, .13);
                --dcuf-login-rim: rgba(229, 239, 255, .2);
                --dcuf-login-shadow: 0 44px 112px rgba(0, 0, 0, .62), 0 12px 32px rgba(0, 0, 0, .38);
            }
            ${buildPaletteCss('dark')}
        }
        html, body {
            min-height: 100%;
            background:
                radial-gradient(ellipse 74% 58% at 6% -8%, var(--dcuf-login-page-glow), transparent 68%),
                radial-gradient(ellipse 62% 52% at 100% 8%, rgba(77, 208, 255, .16), transparent 72%),
                radial-gradient(ellipse 66% 54% at 54% 102%, rgba(139, 92, 246, .14), transparent 72%),
                linear-gradient(145deg, color-mix(in srgb, var(--dcuf-login-page) 88%, white), var(--dcuf-login-page) 52%, color-mix(in srgb, var(--dcuf-login-page) 90%, #dcd7ff)) !important;
            background-attachment: fixed !important;
            color: var(--dcuf-login-fg) !important;
        }
        body {
            position: relative !important;
            margin: 0 !important;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        }
        body::before {
            content: "" !important;
            position: fixed !important;
            inset: 0 !important;
            z-index: 0 !important;
            pointer-events: none !important;
            background:
                radial-gradient(circle at 12% 26%, rgba(255,255,255,.5) 0 4px, transparent 5px),
                radial-gradient(circle at 86% 18%, rgba(255,255,255,.38) 0 8px, transparent 9px),
                radial-gradient(circle at 78% 76%, rgba(105,169,255,.2) 0 52px, transparent 54px),
                radial-gradient(circle at 18% 80%, rgba(144,104,255,.15) 0 74px, transparent 76px) !important;
            filter: blur(2px) !important;
            opacity: .8 !important;
        }
        #top.login_wrap,
        #top.login_wrap.width868 {
            position: relative !important;
            z-index: 1 !important;
            width: min(100%, 1120px) !important;
            min-height: 100vh !important;
            margin: 0 auto !important;
            background: transparent !important;
        }
        #top.login_wrap .dcheader.bg,
        #top.login_wrap header.dcheader {
            box-sizing: border-box !important;
            width: 100% !important;
            border: 1px solid var(--dcuf-login-border) !important;
            border-top: 0 !important;
            border-radius: 0 0 26px 26px !important;
            background-color: var(--dcuf-login-panel) !important;
            background-image:
                radial-gradient(ellipse 44% 130% at 88% -60%, var(--dcuf-login-page-glow), transparent 72%),
                linear-gradient(180deg, var(--dcuf-login-rim), color-mix(in srgb, var(--dcuf-login-highlight) 36%, transparent) 2px, transparent 72%) !important;
            box-shadow: 0 20px 48px rgba(31, 48, 81, .12), inset 0 1px 0 var(--dcuf-login-rim) !important;
        }
        #top.login_wrap .dcheader .dc_logo,
        #top.login_wrap .dcheader .dc_logo :is(a, span, small) {
            color: var(--dcuf-login-fg) !important;
        }
        #top.login_wrap .dcheader .dchead {
            box-sizing: border-box !important;
            width: min(100% - 32px, 1040px) !important;
            height: 100% !important;
            margin: 0 auto !important;
            display: flex !important;
            align-items: center !important;
            background: transparent !important;
        }
        #top.login_wrap .dcheader .dc_logo > a {
            display: inline-flex !important;
            align-items: center !important;
            gap: 8px !important;
        }
        #top.login_wrap .dcheader .dc_logo img {
            opacity: .82 !important;
            filter: brightness(0) saturate(100%) !important;
        }
        #top.login_wrap .dcheader .dc_logo img[alt*="로그인"] {
            opacity: .72 !important;
        }
        @media (prefers-color-scheme: dark) {
            #top.login_wrap .dcheader .dc_logo img {
                opacity: .92 !important;
                filter: brightness(0) invert(1) !important;
            }
        }
        #top.login_wrap #container {
            box-sizing: border-box !important;
            width: 100% !important;
            min-height: calc(100vh - 184px) !important;
            padding: clamp(58px, 11vh, 128px) 18px 48px !important;
            background: transparent !important;
        }
        #top.login_wrap .content.login {
            width: min(100%, 560px) !important;
            margin: 0 auto !important;
        }
        #top.login_wrap .con_box.login_page,
        #top.login_wrap .con_box.login_page.kap_codewrap {
            box-sizing: border-box !important;
            width: 100% !important;
            min-height: 0 !important;
            padding: clamp(28px, 5vw, 46px) !important;
            border: 1px solid var(--dcuf-login-border-strong) !important;
            border-radius: 30px !important;
            background-color: var(--dcuf-login-panel) !important;
            background-image:
                radial-gradient(ellipse 62% 46% at 100% 0%, var(--dcuf-login-page-glow), transparent 68%),
                radial-gradient(ellipse 52% 42% at 0% 100%, rgba(113, 217, 255, .12), transparent 72%),
                linear-gradient(145deg, var(--dcuf-login-rim), color-mix(in srgb, var(--dcuf-login-highlight) 34%, transparent) 2px, transparent 50%) !important;
            box-shadow: var(--dcuf-login-shadow), inset 0 1px 0 var(--dcuf-login-rim), inset 0 -1px 0 color-mix(in srgb, var(--dcuf-login-border) 52%, transparent) !important;
            color: var(--dcuf-login-fg) !important;
        }
        #top.login_wrap .login_inputbox,
        #top.login_wrap .login_inputbox > div,
        #top.login_wrap .login_inputbox > .inner,
        #top.login_wrap .login_inputbox form,
        #top.login_wrap .login_inputbox fieldset {
            box-sizing: border-box !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            background-color: transparent !important;
            background-image: none !important;
            box-shadow: none !important;
        }
        #top.login_wrap .login_inputbox {
            min-height: 0 !important;
        }
        #top.login_wrap .ban_box:not(:has(.inner > *)),
        #top.login_wrap .ban_box > .inner:not(:has(> *)) {
            display: none !important;
            width: 0 !important;
            min-width: 0 !important;
            height: 0 !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            overflow: hidden !important;
        }
        #top.login_wrap .login_inputbox :is(input[type="text"], input[type="password"]) {
            box-sizing: border-box !important;
            width: 100% !important;
            height: 48px !important;
            margin: 0 0 10px !important;
            padding: 0 15px !important;
            border: 1px solid var(--dcuf-login-border) !important;
            border-radius: 13px !important;
            outline: 0 !important;
            background-color: var(--dcuf-login-input) !important;
            background-image: linear-gradient(180deg, color-mix(in srgb, var(--dcuf-login-rim) 68%, transparent), transparent 72%) !important;
            color: var(--dcuf-login-fg) !important;
            box-shadow: inset 0 2px 5px rgba(18,29,50,.1), 0 8px 20px rgba(30,48,82,.07), inset 0 1px 0 var(--dcuf-login-rim) !important;
            font-size: 15px !important;
        }
        #top.login_wrap .login_inputbox :is(input[type="text"], input[type="password"]):focus {
            border-color: var(--dcuf-login-active) !important;
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--dcuf-login-active) 19%, transparent), inset 0 1px 0 var(--dcuf-login-highlight) !important;
        }
        #top.login_wrap :is(.btn_blue, button[type="submit"], input[type="submit"]) {
            box-sizing: border-box !important;
            min-height: 48px !important;
            border: 1px solid color-mix(in srgb, var(--dcuf-login-active) 78%, var(--dcuf-login-border-strong)) !important;
            border-radius: 13px !important;
            background-color: var(--dcuf-login-active-glass) !important;
            background-image:
                radial-gradient(circle at 22% 0%, rgba(255,255,255,.46), transparent 42%),
                linear-gradient(145deg, var(--dcuf-login-active-glass-top), var(--dcuf-login-active-glass)) !important;
            color: var(--dcuf-login-on-active) !important;
            box-shadow: 0 15px 34px color-mix(in srgb, var(--dcuf-login-active) 32%, transparent), inset 0 1px 0 rgba(255,255,255,.5), inset 0 -1px 0 rgba(0,0,0,.14) !important;
            font-weight: 800 !important;
            cursor: pointer !important;
            transition: transform .15s ease, box-shadow .15s ease, filter .15s ease !important;
        }
        #top.login_wrap :is(.btn_blue, button[type="submit"], input[type="submit"]):is(:hover, :focus-visible) {
            filter: brightness(1.04) saturate(.96) !important;
            box-shadow: 0 13px 26px color-mix(in srgb, var(--dcuf-login-active) 28%, transparent), inset 0 1px 0 rgba(255,255,255,.42) !important;
        }
        #top.login_wrap :is(.btn_blue, button[type="submit"], input[type="submit"]):active {
            transform: translateY(1px) !important;
            box-shadow: 0 5px 12px color-mix(in srgb, var(--dcuf-login-active) 22%, transparent), inset 0 1px 3px rgba(0,0,0,.12) !important;
        }
        #top.login_wrap :is(.login_set, .login_option, .login_find, .login_help, .security_connect) {
            color: var(--dcuf-login-muted) !important;
        }
        #top.login_wrap a {
            color: var(--dcuf-login-fg) !important;
            text-decoration-color: color-mix(in srgb, var(--dcuf-login-active) 44%, transparent) !important;
        }
        #top.login_wrap input[type="checkbox"] {
            accent-color: var(--dcuf-login-active) !important;
        }
        #top.login_wrap .dcfoot {
            box-sizing: border-box !important;
            width: min(100% - 32px, 760px) !important;
            margin: 0 auto !important;
            padding: 24px 12px 30px !important;
            border-top: 1px solid var(--dcuf-login-border) !important;
            background: transparent !important;
            color: var(--dcuf-login-muted) !important;
        }
        #top.login_wrap > footer.dcfoot {
            background-color: transparent !important;
            background-image: none !important;
        }
        @supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
            #top.login_wrap .dcheader.bg,
            #top.login_wrap header.dcheader,
            #top.login_wrap .con_box.login_page {
                background-color: var(--dcuf-login-panel) !important;
                -webkit-backdrop-filter: blur(24px) saturate(1.25) !important;
                backdrop-filter: blur(24px) saturate(1.25) !important;
            }
        }
        @media (max-width: 600px) {
            #top.login_wrap .dcheader.bg,
            #top.login_wrap header.dcheader {
                border-radius: 0 0 18px 18px !important;
            }
            #top.login_wrap #container {
                min-height: calc(100vh - 150px) !important;
                padding: 42px 12px 34px !important;
            }
            #top.login_wrap .con_box.login_page,
            #top.login_wrap .con_box.login_page.kap_codewrap {
                padding: 24px 18px !important;
                border-radius: 20px !important;
            }
        }
        @media (prefers-reduced-transparency: reduce) {
            #top.login_wrap .dcheader.bg,
            #top.login_wrap header.dcheader,
            #top.login_wrap .con_box.login_page {
                background-color: var(--dcuf-login-panel-solid) !important;
                -webkit-backdrop-filter: none !important;
                backdrop-filter: none !important;
            }
        }
        @media (prefers-reduced-motion: reduce) {
            #top.login_wrap *, #top.login_wrap *::before, #top.login_wrap *::after {
                scroll-behavior: auto !important;
                transition: none !important;
                animation: none !important;
            }
        }
        `;
        mount.appendChild(style);
    };
    if (document.head || document.documentElement) installStyle();
    else document.addEventListener('DOMContentLoaded', installStyle, { once: true });
})();
