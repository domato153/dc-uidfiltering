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
            --dcuf-control-glaze: linear-gradient(180deg, #ffffff20, #ffffff06 14%, #ffffff00 28%, #0000000c);
            --dcuf-control-depth: #244d5514;
            --dcuf-control-opacity: 82%;
            --dcuf-v7-primary-glaze: linear-gradient(180deg, var(--dcuf-control-highlight), transparent 68%);
            --dcuf-v7-primary-shadow: inset 0 1px 0 var(--dcuf-b1-rim), 0 3px 7px #152e3412;
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
            --dcuf-control-highlight: #ffffff08;
            --dcuf-control-glaze: linear-gradient(180deg, var(--dcuf-control-highlight), transparent 40%);
            --dcuf-control-depth: #00000024;
            --dcuf-control-opacity: 88%;
            --dcuf-v7-dark-primary-fill: color-mix(in srgb, color-mix(in srgb, #d7e2e2 76%, var(--dcuf-theme-accent)) 92%, transparent);
            --dcuf-v7-dark-primary-ink: color-mix(in srgb, #1b3033 86%, var(--dcuf-theme-accent-strong));
            --dcuf-v7-primary-glaze: linear-gradient(180deg, #ffffff2e, transparent 68%);
            --dcuf-v7-primary-rim-accent: 28%;
            --dcuf-v7-primary-shadow: inset 0 1px 0 #ffffff61, inset 0 -1px 0 #102d321a, 0 3px 7px #00000026;
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
        /* Adopted memo v7 recipes. Rebind on body as well: body-only dark
           state changes must resolve composed palette values at that scope. */
        html[${ROOT_ATTRIBUTE}], html[${ROOT_ATTRIBUTE}] body {
            --dcuf-v7-reading: color-mix(in srgb, var(--dcuf-theme-fg) 7%, var(--dcuf-b1-paper));
            --dcuf-v7-primary-fill: var(--dcuf-v7-dark-primary-fill,color-mix(in srgb, var(--dcuf-b1-paper) 76%, var(--dcuf-theme-accent)));
            --dcuf-v7-primary-ink: var(--dcuf-v7-dark-primary-ink,color-mix(in srgb, var(--dcuf-theme-fg) 86%, var(--dcuf-theme-accent-strong)));
            --dcuf-v7-primary-bg: var(--dcuf-v7-primary-glaze), var(--dcuf-v7-primary-fill);
            --dcuf-v7-primary-rim: color-mix(in srgb, var(--dcuf-theme-accent) var(--dcuf-v7-primary-rim-accent,48%), var(--dcuf-b1-rim));
            /* Optional management values; shared consumers keep PC fallbacks. */
            --dcuf-management-default-width: 720;
            --dcuf-management-default-height: 560;
            --dcuf-management-panel-radius: 16px;
            --dcuf-management-inset: 20px;
            --dcuf-management-title-size: 24px;
            --dcuf-management-title-weight: 750;
            --dcuf-management-tabs-display: flex;
            --dcuf-management-tabs-gap: 4px;
            --dcuf-management-tabs-margin: 0 20px;
            --dcuf-management-tabs-padding: 0;
            --dcuf-management-tabs-border: 0;
            --dcuf-management-tab-height: 44px;
            --dcuf-management-tab-padding: 10px 12px;
            --dcuf-management-tab-size: 13px;
            --dcuf-management-tab-selected-shadow: inset 0 -2px 0 var(--dcuf-theme-accent);
            --dcuf-management-body-flex: 1 1 auto;
            --dcuf-management-tools-padding: 0;
            --dcuf-management-tools-border: 0;
            --dcuf-management-quiet-bg: transparent;
            --dcuf-management-quiet-rim: transparent;
            --dcuf-management-quiet-shadow: none;
            --dcuf-management-quiet-radius: 0;
            --dcuf-management-action-weight: 600;
            --dcuf-management-action-hover: var(--dcuf-v7-primary-bg);
            --dcuf-management-danger-hover: var(--dcuf-control-danger-bg);
            --dcuf-management-delete-height: 44px;
            --dcuf-management-reading: var(--dcuf-v7-reading);
            --dcuf-management-list-offset: 12px;
            --dcuf-management-list-padding: 4px 12px;
            --dcuf-management-list-border: 1px solid var(--dcuf-b1-rim);
            --dcuf-management-list-radius: 10px;
            --dcuf-management-list-gap: 0;
            --dcuf-management-list-margin: 0;
            --dcuf-management-row-height: 64px;
            --dcuf-management-row-sizing: border-box;
            --dcuf-management-row-padding: 12px 14px;
            --dcuf-management-row-divider: inset 0 -1px 0 var(--dcuf-b1-line);
            --dcuf-management-primary-width: 118px;
            --dcuf-management-primary-radius: 10px;
            --dcuf-management-primary-weight: 650;
            --dcuf-management-primary-bg: var(--dcuf-v7-primary-bg);
            --dcuf-management-primary-ink: var(--dcuf-v7-primary-ink);
            --dcuf-management-primary-rim: var(--dcuf-v7-primary-rim);
            --dcuf-management-primary-shadow: var(--dcuf-v7-primary-shadow);
            --dcuf-management-resize-clearance: 44px;
            /* Equivalent management children consume the same v7 roles.
               Shared presenter fallbacks remain the PC appearance. */
            --dcuf-child-primary-bg: var(--dcuf-v7-primary-bg);
            --dcuf-child-primary-ink: var(--dcuf-v7-primary-ink);
            --dcuf-child-primary-rim: var(--dcuf-v7-primary-rim);
            --dcuf-child-primary-shadow: var(--dcuf-v7-primary-shadow);
            --dcuf-child-primary-width: 118px;
            --dcuf-child-backup-primary-width: auto;
            --dcuf-child-backup-primary-height: 36px;
            --dcuf-child-backup-primary-padding: 6px 12px;
            --dcuf-child-control-radius: 10px;
            --dcuf-child-control-weight: 650;
            --dcuf-child-quiet-bg: transparent;
            --dcuf-child-quiet-rim: transparent;
            --dcuf-child-quiet-shadow: none;
            --dcuf-child-quiet-radius: 0;
            --dcuf-child-action-hover: var(--dcuf-v7-primary-bg);
            --dcuf-child-actions-flex: 0 0 auto;
            --dcuf-child-actions-justify: flex-end;
            --dcuf-child-tabs-padding: 0;
            --dcuf-child-tabs-border: 0;
            --dcuf-child-tab-height: 44px;
            --dcuf-child-tab-selected-shadow: inset 0 -2px 0 var(--dcuf-theme-accent);
            --dcuf-child-section-padding: 4px 0 16px;
            --dcuf-child-export-margin: 8px 0 0;
            --dcuf-child-import-margin: 12px 0 0 auto;
            --dcuf-child-import-display: block;
            --dcuf-child-import-width: auto;
            --dcuf-personal-utility-height: 36px;
            --dcuf-personal-utility-padding: 6px 12px;
            --dcuf-personal-quiet-ink: var(--dcuf-theme-fg);
            --dcuf-personal-range-height: 36px;
            --dcuf-personal-reset-spacer: auto;
            --dcuf-personal-menu-hover: color-mix(in srgb,var(--dcuf-theme-accent-soft) 38%,transparent);
            --dcuf-selection-background: var(--dcuf-panel-background);
            --dcuf-selection-backdrop: var(--dcuf-panel-backdrop);
            --dcuf-selection-rim: var(--dcuf-panel-rim);
            --dcuf-selection-shadow: var(--dcuf-panel-shadow);
            --dcuf-selection-title-size: 18px;
            --dcuf-selection-title-margin: 0 0 16px;
            --dcuf-selection-reading: var(--dcuf-v7-reading);
            --dcuf-selection-group-padding: 0 12px;
            --dcuf-selection-group-rim: 1px solid var(--dcuf-b1-rim);
            --dcuf-selection-group-radius: 10px;
            --dcuf-selection-row-margin: 0;
            --dcuf-selection-row-padding: 12px 0;
            --dcuf-selection-row-border: 0;
            --dcuf-selection-row-radius: 0;
            --dcuf-selection-row-bg: transparent;
            --dcuf-selection-row-divider: inset 0 -1px 0 var(--dcuf-b1-line);
            --dcuf-filter-reading: var(--dcuf-v7-reading);
            --dcuf-filter-utility-width: auto;
            --dcuf-filter-utility-display: inline-flex;
            --dcuf-filter-segment-border: 0;
            --dcuf-filter-segment-bg: color-mix(in srgb,var(--dcuf-theme-surface-input) 72%,var(--dcuf-theme-accent-soft));
            --dcuf-filter-segment-radius: 10px;
            --dcuf-filter-segment-item-bg: transparent;
            --dcuf-filter-segment-shadow: none;
            --dcuf-filter-segment-ink: var(--dcuf-theme-fg);
            --dcuf-filter-segment-selected: color-mix(in srgb,var(--dcuf-theme-accent-soft) 75%,var(--dcuf-v7-reading));
            --dcuf-filter-choice-padding: 8px;
            --dcuf-filter-choice-min: 140px;
            --dcuf-filter-choice-border: 0;
            --dcuf-filter-choice-bg: transparent;
            --dcuf-filter-choice-selected: var(--dcuf-filter-segment-selected);
            --dcuf-filter-headtext-height: auto;
            --dcuf-filter-manual-margin: 12px 0 0;
            --dcuf-filter-clear-margin: 8px 0 16px;
            --dcuf-filter-heading-margin: 16px 0 10px;
            --dcuf-filter-rule-gap: 0;
            --dcuf-filter-rule-padding: 8px;
        }
`;
}
