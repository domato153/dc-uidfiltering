// Existing B1 values only; no gallery DOM rules or initialization.
function __dcufBuildB1MaterialCss(ROOT_ATTRIBUTE) {
    return `
        /* Mobile B1 material roles from the selected preview. Shared palette
           IDs/accent values and the PC theme remain unchanged. */
        html[${ROOT_ATTRIBUTE}] {
            --dcuf-b1-canvas: #f1f5f5;
            --dcuf-b1-paper: var(--dcuf-theme-surface);
            --dcuf-b1-glass: color-mix(in srgb, color-mix(in srgb, var(--dcuf-b1-paper) 80%, var(--dcuf-theme-accent-soft)) 58%, transparent);
            --dcuf-b1-floating: color-mix(in srgb, var(--dcuf-b1-paper) 64%, transparent);
            --dcuf-menu-button-background: var(--dcuf-control-secondary-bg);
            --dcuf-menu-background: var(--dcuf-b1-sheen), var(--dcuf-b1-floating);
            --dcuf-menu-shadow: var(--dcuf-b1-shadow), inset 0 1px 0 var(--dcuf-b1-rim);
            --dcuf-menu-backdrop: var(--dcuf-b1-floating-filter);
            --dcuf-b1-sheen: linear-gradient(120deg, #ffffff2e, #ffffff08 42%, transparent 65%);
            --dcuf-b1-floating-filter: blur(8px) saturate(1.08);
            --dcuf-b1-structural-filter: blur(12px) saturate(1.1);
            --dcuf-panel-scrim: rgba(18,25,35,.22);
            --dcuf-panel-status-error: #a52b40;
            --dcuf-panel-status-success: #12694e;
            --dcuf-b1-rim: #fffffff2;
            --dcuf-b1-line: color-mix(in srgb, var(--dcuf-theme-border) 55%, var(--dcuf-b1-paper));
            --dcuf-b1-shadow: 0 12px 32px #2e5a5f12, 0 1px 3px #3651560b;
            --dcuf-control-highlight: #ffffff38;
            --dcuf-control-depth: #244d5514;
            --dcuf-control-opacity: 82%;
        }
        html[${ROOT_ATTRIBUTE}].dc-filter-dark-mode,
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode {
            --dcuf-b1-canvas: #171e21;
            --dcuf-b1-paper: #20292c;
            --dcuf-b1-glass: color-mix(in srgb, color-mix(in srgb, var(--dcuf-b1-paper) 85%, var(--dcuf-theme-accent-soft)) 72%, transparent);
            --dcuf-b1-floating: color-mix(in srgb, var(--dcuf-b1-paper) 76%, transparent);
            --dcuf-b1-sheen: linear-gradient(120deg, #ffffff0d, transparent 58%);
            --dcuf-panel-scrim: rgba(18,25,35,.28);
            --dcuf-panel-status-error: #ff9ba9;
            --dcuf-panel-status-success: #7cdbb4;
            --dcuf-b1-rim: color-mix(in srgb, var(--dcuf-theme-fg) 9%, transparent);
            --dcuf-b1-line: color-mix(in srgb, var(--dcuf-theme-fg) 5%, var(--dcuf-b1-paper));
            --dcuf-b1-shadow: 0 14px 34px #0003, 0 1px 2px #0003;
            --dcuf-control-highlight: #ffffff24;
            --dcuf-control-depth: #00000038;
            --dcuf-control-opacity: 88%;
        }
        html[${ROOT_ATTRIBUTE}],
        html[${ROOT_ATTRIBUTE}].dc-filter-dark-mode,
        html[${ROOT_ATTRIBUTE}] body.dc-filter-dark-mode {
            /* Optional shared-panel hooks: PC retains each existing fallback. */
            --dcuf-panel-background: var(--dcuf-b1-sheen), var(--dcuf-b1-floating);
            --dcuf-panel-backdrop: var(--dcuf-b1-floating-filter);
            --dcuf-panel-rim: var(--dcuf-b1-rim);
            --dcuf-panel-shadow: var(--dcuf-b1-shadow), inset 0 1px 0 #ffffff26;
            --dcuf-panel-header-background: transparent;
            --dcuf-panel-body-background: transparent;
            --dcuf-panel-footer-background: transparent;
            --dcuf-panel-section-background: transparent;
            --dcuf-panel-section-border: 0;
            --dcuf-panel-section-divider: 1px solid var(--dcuf-b1-line);
            --dcuf-panel-section-radius: 0;
            --dcuf-panel-kicker-display: none;
            --dcuf-panel-title-size: 20px;
            --dcuf-panel-close-background: transparent;
            --dcuf-panel-close-position: relative;
            --dcuf-panel-close-shadow: none;
            --dcuf-panel-close-border: transparent;
            --dcuf-panel-close-font-size: 0;
            --dcuf-panel-close-content: "";
            --dcuf-panel-close-hover: var(--dcuf-control-secondary-bg);
            --dcuf-panel-switch-thumb: #f7fbfa;
            --dcuf-panel-range-margin: 0;
            --dcuf-panel-status-info: var(--dcuf-theme-fg);
            --dcuf-panel-empty-ink: var(--dcuf-theme-fg);
            --dcuf-panel-help-ink: color-mix(in srgb,var(--dcuf-theme-fg) 75%,var(--dcuf-theme-fg-muted));
            --dcuf-panel-pending-opacity: 1;
            --dcuf-panel-pending-decoration: line-through;
            /* Material values only: each existing presenter owns shape,
               positioning and state. No filtered native-popup ancestors. */
            /* Keep the specular edge above the label; dense primary tint
               preserves small white-label contrast in lighter palettes. */
            --dcuf-control-glaze: linear-gradient(180deg, #ffffff20, #ffffff06 14%, #ffffff00 28%, #0000000c);
            --dcuf-control-primary-fill: var(--dcuf-theme-accent-strong);
            --dcuf-control-secondary-fill: color-mix(in srgb, var(--dcuf-b1-paper) var(--dcuf-control-opacity), transparent);
            --dcuf-control-selected-fill: color-mix(in srgb, var(--dcuf-theme-accent-soft) 90%, transparent);
            --dcuf-control-primary-bg: var(--dcuf-control-glaze), var(--dcuf-control-primary-fill);
            --dcuf-control-secondary-bg: var(--dcuf-control-glaze), var(--dcuf-control-secondary-fill);
            --dcuf-control-selected-bg: var(--dcuf-control-glaze), var(--dcuf-control-selected-fill);
            --dcuf-control-primary-rim: color-mix(in srgb, var(--dcuf-theme-on-accent) 28%, var(--dcuf-theme-accent-strong));
            --dcuf-control-rim: color-mix(in srgb, var(--dcuf-b1-rim) 65%, var(--dcuf-theme-border-strong));
            --dcuf-control-shadow: inset 0 1px 0 var(--dcuf-control-highlight), inset 0 -1px 0 #00000012, 0 3px 8px var(--dcuf-control-depth);
            --dcuf-control-quiet-shadow: inset 0 1px 0 var(--dcuf-control-highlight);
            --dcuf-control-danger-bg: var(--dcuf-control-glaze), color-mix(in srgb, color-mix(in srgb, #c43249 12%, var(--dcuf-b1-paper)) 90%, transparent);
        }
`;
}
