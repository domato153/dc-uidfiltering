// Pure inherited theme values, hoisted for the isolated login entry.
function __dcufGetThemePresets() {
    return Object.freeze([
        Object.freeze({ id: 'blue', label: '기본 블루', light: ['#3f6de0', '#245bda', '#eaf1ff'], dark: ['#8cb4ff', '#3868df', '#243a64'] }),
        Object.freeze({ id: 'purple', label: '퍼플', light: ['#7c3aed', '#6d28d9', '#f3e8ff'], dark: ['#c4b5fd', '#7c3aed', '#39275a'] }),
        Object.freeze({ id: 'green', label: '그린', light: ['#16805d', '#047857', '#e7f7ef'], dark: ['#6ee7b7', '#047857', '#173c32'] }),
        Object.freeze({ id: 'orange', label: '오렌지', light: ['#c2410c', '#9a3412', '#fff0e7'], dark: ['#fdba74', '#c2410c', '#4a2a1b'] }),
        Object.freeze({ id: 'mono', label: '모노톤', light: ['#526274', '#374151', '#eef2f7'], dark: ['#cbd5e1', '#475569', '#28323f'] }),
        Object.freeze({ id: 'indigo', label: '인디고', light: ['#4f46e5', '#4338ca', '#eef2ff'], dark: ['#4f46e5', '#3730a3', '#29274f'] }),
        Object.freeze({ id: 'sky', label: '스카이', light: ['#0284c7', '#0369a1', '#e0f2fe'], dark: ['#0369a1', '#075985', '#17384a'] }),
        Object.freeze({ id: 'cyan', label: '시안', light: ['#0891b2', '#0e7490', '#ecfeff'], dark: ['#0e7490', '#155e75', '#173b44'] }),
        Object.freeze({ id: 'teal', label: '틸', light: ['#0f766e', '#115e59', '#e6f7f4'], dark: ['#0f766e', '#115e59', '#173c38'] }),
        Object.freeze({ id: 'lime', label: '라임', light: ['#65a30d', '#4d7c0f', '#f7fee7'], dark: ['#4d7c0f', '#3f6212', '#2c3918'] }),
        Object.freeze({ id: 'amber', label: '앰버', light: ['#d97706', '#b45309', '#fffbeb'], dark: ['#b45309', '#92400e', '#493016'] }),
        Object.freeze({ id: 'red', label: '레드', light: ['#dc2626', '#b91c1c', '#fef2f2'], dark: ['#c62828', '#991b1b', '#4a2020'] }),
        Object.freeze({ id: 'rose', label: '로즈', light: ['#e11d48', '#be123c', '#fff1f2'], dark: ['#cf234c', '#9f1239', '#4a202d'] }),
        Object.freeze({ id: 'pink', label: '핑크', light: ['#db2777', '#be185d', '#fce7f3'], dark: ['#c52a72', '#9d174d', '#472138'] }),
    ]);
}

function __dcufBuildThemeBaseCss(ROOT_ATTRIBUTE, PRESETS = __dcufGetThemePresets()) {
    const buildPresetVariables = () => PRESETS.map((preset) => {
        const [accent, strong, soft, onAccent = '#fff'] = preset.light;
        const [darkAccent, darkStrong, darkSoft, darkOnAccent = '#fff'] = preset.dark;
        return `
            html[${ROOT_ATTRIBUTE}="${preset.id}"] { --dcuf-theme-accent:${accent};--dcuf-theme-accent-strong:${strong};--dcuf-theme-accent-soft:${soft};--dcuf-theme-on-accent:${onAccent}; }
            html[${ROOT_ATTRIBUTE}="${preset.id}"].dc-filter-dark-mode,
            html[${ROOT_ATTRIBUTE}="${preset.id}"] body.dc-filter-dark-mode { --dcuf-theme-accent:${darkAccent};--dcuf-theme-accent-strong:${darkStrong};--dcuf-theme-accent-soft:${darkSoft};--dcuf-theme-on-accent:${darkOnAccent}; }
        `;
    }).join('\n');

    return `
        ${buildPresetVariables()}
        html[${ROOT_ATTRIBUTE}] {
            --dcuf-theme-accent-ink:var(--dcuf-theme-accent-strong);--dcuf-theme-fg:#27313f;--dcuf-theme-fg-muted:#687384;--dcuf-theme-border:#e2e7e5;--dcuf-theme-border-strong:#cbd5d1;--dcuf-theme-page:#f7f8f8;--dcuf-theme-surface:#ffffff;--dcuf-theme-surface-raised:#ffffff;--dcuf-theme-surface-muted:#f2f5f4;--dcuf-theme-surface-input:#ffffff;--dcuf-theme-canvas:#f7f8f8;--dcuf-theme-card-top:#ffffff;--dcuf-theme-card-bottom:#ffffff;--dcuf-theme-article-surface:#ffffff;--dcuf-theme-concept-surface:#f5f8f7;--dcuf-theme-notice-surface:#f3f6f5;--dcuf-theme-reply-surface:#f3f6f5;--dcuf-theme-card-shadow:0 1px 2px rgba(24,40,34,.035);--dcuf-theme-panel-shadow:0 16px 48px rgba(24,40,34,.14);--dcuf-theme-primary-top:color-mix(in srgb,var(--dcuf-theme-accent) 78%,white);--dcuf-theme-focus-ring:color-mix(in srgb,var(--dcuf-theme-accent) 18%,transparent);--dcuf-theme-accent-shadow:color-mix(in srgb,var(--dcuf-theme-accent-strong) 25%,transparent);
        }
        html[${ROOT_ATTRIBUTE}].dc-filter-dark-mode,html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode {
            --dcuf-theme-accent-ink:color-mix(in srgb,var(--dcuf-theme-accent) 55%,white);--dcuf-theme-fg:#edf2f7;--dcuf-theme-fg-muted:#aeb8c4;--dcuf-theme-border:#343c3d;--dcuf-theme-border-strong:#4a5656;--dcuf-theme-page:#141819;--dcuf-theme-surface:#1b2021;--dcuf-theme-surface-raised:#222829;--dcuf-theme-surface-muted:#202728;--dcuf-theme-surface-input:#171c1d;--dcuf-theme-canvas:#171c1d;--dcuf-theme-card-top:#1b2021;--dcuf-theme-card-bottom:#1b2021;--dcuf-theme-article-surface:#1b2021;--dcuf-theme-concept-surface:#202827;--dcuf-theme-notice-surface:#252e2d;--dcuf-theme-reply-surface:#202827;--dcuf-theme-card-shadow:0 1px 2px rgba(0,0,0,.16);--dcuf-theme-panel-shadow:0 16px 48px rgba(0,0,0,.4);--dcuf-theme-primary-top:color-mix(in srgb,var(--dcuf-theme-accent) 68%,white);
        }
        `;
}
