// Pure presentation for the two convenience roots. State, DOM and geometry stay in adapters.
function __dcufCreateConveniencePresentation() {
    const STYLE_ID = 'dcuf-mobile-convenience-style';
    const cssText = `
        .dcuf-preview-panel {
            position:fixed;z-index:2147483645;display:flex;flex-direction:column;box-sizing:border-box;
            background:var(--dcuf-b1-sheen,linear-gradient(155deg,#fff,#f6f7f9)),var(--dcuf-b1-floating,#fff);
            color:var(--dcuf-theme-fg,#1f2937);border:1px solid var(--dcuf-b1-rim,#cbd5e1);border-radius:14px;
            box-shadow:var(--dcuf-b1-shadow,0 18px 55px #0007),inset 0 1px 0 #ffffff26;
            backdrop-filter:var(--dcuf-b1-floating-filter,none);overflow:hidden;overscroll-behavior:contain;color-scheme:light dark;
        }
        .dcuf-preview-panel .dcuf-preview-head {
            flex:none;display:flex;align-items:center;gap:9px;padding:10px 11px 10px 13px;
            border-bottom:1px solid var(--dcuf-b1-line,var(--dcuf-theme-border,#e4e7ec));background:transparent;
        }
        .dcuf-preview-panel .dcuf-preview-head strong {
            flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
            font-size:var(--dcuf-article-title-font-size,21px);line-height:1.4;
        }
        .dcuf-preview-panel .dcuf-preview-head a {
            flex:none;display:inline-flex;align-items:center;justify-content:center;min-height:34px;box-sizing:border-box;
            padding:6px 12px;border:1px solid var(--dcuf-control-rim,var(--dcuf-theme-border,#cbd5e1));border-radius:8px;
            background:var(--dcuf-control-secondary-bg,var(--dcuf-theme-surface-input,#fff));color:var(--dcuf-theme-fg,#1f2937);
            box-shadow:var(--dcuf-control-quiet-shadow,none);text-decoration:none;font-size:12.5px;font-weight:700;line-height:1.35;
        }
        .dcuf-preview-panel .dcuf-preview-head a:hover {border-color:var(--dcuf-theme-accent,#315fdb);}
        .dcuf-preview-panel .dcuf-preview-body {
            flex:1 1 auto;min-height:0;box-sizing:border-box;padding:14px;overflow:auto;overscroll-behavior:contain;
            font-size:var(--dcuf-article-body-font-size,26px);line-height:var(--dcuf-article-body-line-height,1.9);overflow-wrap:anywhere;
            background:var(--dcuf-b1-paper,var(--dcuf-theme-surface-input,#fff));
        }
        .dcuf-preview-panel .dcuf-preview-body img {display:block;max-width:100%;height:auto;margin:10px auto;border-radius:6px;}
        .dcuf-preview-panel .dcuf-preview-body img:not([src]) {
            width:min(100%,360px);min-height:76px;
            background:linear-gradient(100deg,var(--dcuf-theme-surface-muted,#edf0f4) 20%,var(--dcuf-theme-card-top,#f8fafc) 40%,var(--dcuf-theme-surface-muted,#edf0f4) 60%);
            background-size:240% 100%;animation:dcuf-preview-image-wait 1.2s linear infinite;
        }
        .dcuf-preview-panel .dcuf-preview-image-error {
            display:block;margin:10px 0;padding:12px;border:1px dashed var(--dcuf-theme-border-strong,#aab3bf);border-radius:8px;
            background:var(--dcuf-theme-surface-muted,#f1f3f6);color:var(--dcuf-theme-fg-muted,#667085);text-align:center;text-decoration:none;
        }
        @keyframes dcuf-preview-image-wait {to {background-position:-240% 0;}}
        .dcuf-preview-panel .dcuf-preview-status {color:var(--dcuf-theme-fg-muted,#667085);text-align:center;padding:30px 12px;}
        .dcuf-preview-panel.dcuf-preview-sheet {left:0;right:0;top:auto;bottom:0;width:100%;max-height:78vh;max-height:78dvh;border-radius:18px 18px 0 0;}
        .dcuf-preview-panel.dcuf-preview-anchor {width:min(520px,calc(100vw - 24px));max-height:min(620px,calc(100vh - 24px));max-height:min(620px,calc(100dvh - 24px));}
        .dcuf-draft-banner {
            position:fixed;z-index:2147483644;top:12px;left:50%;transform:translateX(-50%);width:min(520px,calc(100vw - 24px));
            box-sizing:border-box;padding:11px 12px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;
            color:var(--dcuf-theme-fg,#20242a);background:var(--dcuf-b1-sheen,linear-gradient(155deg,#fff,#f6f7f9)),var(--dcuf-b1-floating,#fff);
            border:1px solid var(--dcuf-b1-rim,#9aa7b7);border-radius:12px;backdrop-filter:var(--dcuf-b1-floating-filter,none);
            box-shadow:var(--dcuf-b1-shadow,0 10px 35px #0005),inset 0 1px 0 #ffffff26;
        }
        .dcuf-draft-banner > span {flex:1 1 180px;min-width:0;line-height:1.5;}
        .dcuf-draft-banner button {
            flex:none;min-height:34px;box-sizing:border-box;padding:6px 11px;border-radius:8px;
            border:1px solid var(--dcuf-control-rim,var(--dcuf-theme-border-strong,#aab3bf));
            background:var(--dcuf-control-secondary-bg,var(--dcuf-theme-surface-input,#fff));color:var(--dcuf-theme-fg,#20242a);
            box-shadow:var(--dcuf-control-quiet-shadow,none);font-size:13px;font-weight:700;line-height:1.35;white-space:nowrap;cursor:pointer;
        }
        .dcuf-draft-banner button[data-dcuf-draft-action="recover"] {
            background:var(--dcuf-control-primary-bg,var(--dcuf-theme-accent-strong,#315fdb));
            border-color:var(--dcuf-control-primary-rim,var(--dcuf-theme-accent-strong,#315fdb));
            color:var(--dcuf-theme-on-accent,#fff);box-shadow:var(--dcuf-control-shadow,none);
        }
        .dcuf-draft-banner button[data-dcuf-draft-action="delete"] {background:var(--dcuf-control-danger-bg,#fff);color:var(--dcuf-panel-status-error,#a52b40);}
        .dcuf-preview-panel .dcuf-preview-head button,.dcuf-draft-banner .dcuf-draft-close {
            position:relative;flex:none;width:36px;height:36px;min-height:36px;padding:0;border:1px solid transparent;
            border-radius:8px;background:transparent;color:var(--dcuf-theme-fg-muted,#687384);box-shadow:none;font-size:0;line-height:1;cursor:pointer;
        }
        .dcuf-preview-panel .dcuf-preview-head button::before,.dcuf-preview-panel .dcuf-preview-head button::after,
        .dcuf-draft-banner .dcuf-draft-close::before,.dcuf-draft-banner .dcuf-draft-close::after {
            content:"";position:absolute;left:50%;top:50%;width:14px;height:1.5px;border-radius:1px;
            background:currentColor;transform:translate(-50%,-50%) rotate(45deg);
        }
        .dcuf-preview-panel .dcuf-preview-head button::after,.dcuf-draft-banner .dcuf-draft-close::after {transform:translate(-50%,-50%) rotate(-45deg);}
        .dcuf-preview-panel .dcuf-preview-head button:hover,.dcuf-draft-banner .dcuf-draft-close:hover {
            background:var(--dcuf-control-secondary-bg,#f1f3f6);color:var(--dcuf-theme-fg,#27313f);border-color:var(--dcuf-control-rim,#d9dde3);
        }
        .dcuf-preview-panel :is(a,button):focus-visible,.dcuf-draft-banner button:focus-visible {outline:3px solid var(--dcuf-theme-focus-ring,#315fdb);outline-offset:2px;}
        @media (prefers-reduced-motion:reduce) {.dcuf-preview-panel .dcuf-preview-body img:not([src]) {animation:none;}}
    `;
    return Object.freeze({ STYLE_ID, cssText });
}
