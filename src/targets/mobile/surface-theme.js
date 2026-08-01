; (() => {
    'use strict';

    const root = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
    if (root.__dcufFinalSurfaceThemeInstalled) return;
    root.__dcufFinalSurfaceThemeInstalled = true;

    const STYLE_ID = 'dcuf-final-surface-theme';
    const OWNER_VERSION = 'p1-20260801';
    const LEGACY_REMOVE_IDS = new Set(['dcuf-phase1-list-theme', 'dcuf-live-surface-owner']);
    const PRUNED_STYLE_IDS = new Set(['dcuf-mobile-palette-style']);

    const ownership = Object.freeze({
        headerRecent: STYLE_ID,
        list: STYLE_ID,
        article: 'dcuf-mobile-palette-style',
        comments: 'dcuf-mobile-palette-style',
        write: STYLE_ID,
        nativeLayer: STYLE_ID
    });
    root.__dcufSurfaceOwners = ownership;

    const OWNED_SELECTOR_MARKERS = Object.freeze([
        '.dcheader',
        '.gnb_bar',
        '#visit_history',
        '.newvisit_history',
        '.page_head',
        '.dcuf-header-drawer',
        '.list_array_option',
        '.custom-mobile-list',
        '.custom-post-item',
        '.custom-bottom-controls',
        'body.is-write-page',
        'form.dcuf-write-form',
        '#pop_manage_report_list',
        '#hot_rank_pop2'
    ]);

    const splitSelectorList = (selectorText) => {
        const parts = [];
        let start = 0;
        let depth = 0;
        let quote = '';
        let escaped = false;
        for (let index = 0; index < selectorText.length; index += 1) {
            const char = selectorText[index];
            if (escaped) {
                escaped = false;
                continue;
            }
            if (char === '\\') {
                escaped = true;
                continue;
            }
            if (quote) {
                if (char === quote) quote = '';
                continue;
            }
            if (char === '"' || char === "'") {
                quote = char;
                continue;
            }
            if (char === '(' || char === '[') depth += 1;
            else if (char === ')' || char === ']') depth = Math.max(0, depth - 1);
            else if (char === ',' && depth === 0) {
                parts.push(selectorText.slice(start, index).trim());
                start = index + 1;
            }
        }
        parts.push(selectorText.slice(start).trim());
        return parts.filter(Boolean);
    };

    const isOwnedSelector = (selector) => OWNED_SELECTOR_MARKERS.some((marker) => selector.includes(marker));

    const pruneRuleList = (ruleList) => {
        if (!ruleList) return 0;
        let changed = 0;
        for (let index = ruleList.length - 1; index >= 0; index -= 1) {
            const rule = ruleList[index];
            if (!rule) continue;
            if (typeof CSSStyleRule !== 'undefined' && rule instanceof CSSStyleRule) {
                const selectors = splitSelectorList(rule.selectorText || '');
                if (!selectors.some(isOwnedSelector)) continue;
                const retained = selectors.filter((selector) => !isOwnedSelector(selector));
                try {
                    if (retained.length === 0) rule.parentRule?.deleteRule?.(index) ?? rule.parentStyleSheet?.deleteRule?.(index);
                    else rule.selectorText = retained.join(', ');
                    changed += 1;
                } catch (error) {
                    root.__dcufSurfaceOwnerPruneErrors = [...(root.__dcufSurfaceOwnerPruneErrors || []), String(error?.message || error)];
                }
                continue;
            }
            if (rule.cssRules) changed += pruneRuleList(rule.cssRules);
        }
        return changed;
    };

    const retireLegacyOwners = () => {
        LEGACY_REMOVE_IDS.forEach((id) => document.getElementById(id)?.remove());
        PRUNED_STYLE_IDS.forEach((id) => {
            const style = document.getElementById(id);
            if (!(style instanceof HTMLStyleElement)) return;
            if (style.dataset.dcufSurfacePruned === OWNER_VERSION) return;
            let changed = 0;
            try {
                changed = pruneRuleList(style.sheet?.cssRules);
                style.dataset.dcufSurfacePruned = OWNER_VERSION;
            } catch (error) {
                root.__dcufSurfaceOwnerPruneErrors = [...(root.__dcufSurfaceOwnerPruneErrors || []), String(error?.message || error)];
            }
            root.__dcufSurfaceOwnerPrunedRules = (root.__dcufSurfaceOwnerPrunedRules || 0) + changed;
        });
    };

    const buildCss = () => `
        /* DCUF_SURFACE_OWNER:header-recent */
        html[data-dcuf-palette] body > :is(.dcheader.typea,.gnb_bar,#visit_history),
        html[data-dcuf-palette] body #top > :is(.dcheader.typea,.gnb_bar,#visit_history) {
            box-sizing: border-box !important;
            width: min(1480px,calc(100% - 24px)) !important;
            max-width: 1480px !important;
            margin-right: auto !important;
            margin-left: auto !important;
        }
        html[data-dcuf-palette] body .dcheader.typea,
        html[data-dcuf-palette] body .gnb_bar,
        html[data-dcuf-palette] body #visit_history > .newvisit_history {
            border: 1px solid var(--dcuf-glass-border) !important;
            background-color: var(--dcuf-glass-panel) !important;
            background-image: linear-gradient(145deg,var(--dcuf-glass-highlight),transparent 48%) !important;
            box-shadow: var(--dcuf-glass-card-shadow),inset 0 1px 0 var(--dcuf-glass-rim) !important;
        }
        html[data-dcuf-palette] body .dcheader.typea {
            min-height: 84px !important;
            border-radius: var(--dcuf-radius-panel) !important;
            overflow: visible !important;
        }
        html[data-dcuf-palette] body .dcheader.typea .dchead {
            box-sizing: border-box !important;
            display: grid !important;
            grid-template-columns: minmax(150px,.75fr) minmax(280px,480px) minmax(360px,1.25fr) !important;
            align-items: center !important;
            gap: 18px !important;
            width: 100% !important;
            max-width: none !important;
            min-width: 0 !important;
            min-height: 84px !important;
            margin: 0 !important;
            padding: 0 24px !important;
        }
        html[data-dcuf-palette] body .dcheader.typea :is(.dc_logo,.wrap_search,.area_links) {
            position: static !important;
            inset: auto !important;
            min-width: 0 !important;
            margin: 0 !important;
            transform: none !important;
        }
        html[data-dcuf-palette] body .dcheader.typea .area_links {
            display: flex !important;
            align-items: center !important;
            justify-content: flex-end !important;
            flex-wrap: nowrap !important;
            gap: 7px !important;
            max-width: 100% !important;
            white-space: nowrap !important;
        }
        html[data-dcuf-palette] body .dcheader.typea .area_links > * {
            flex: 0 0 auto !important;
        }
        html[data-dcuf-palette] body .gnb_bar {
            min-height: 46px !important;
            margin-top: 8px !important;
            border-radius: 14px !important;
            overflow: visible !important;
        }
        html[data-dcuf-palette] body .gnb_bar .gnb {
            box-sizing: border-box !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 14px !important;
        }
        html[data-dcuf-palette] body #visit_history > .newvisit_history {
            display: grid !important;
            grid-template-columns: auto auto minmax(0,1fr) auto auto !important;
            align-items: center !important;
            gap: 8px !important;
            min-height: 44px !important;
            height: auto !important;
            margin-top: 8px !important;
            padding: 4px 12px !important;
            border-radius: 14px !important;
            overflow: visible !important;
        }
        html[data-dcuf-palette] body #visit_history > .newvisit_history > :is(.vst_title,.bookmark_title)[hidden],
        html[data-dcuf-palette] body #visit_history > .newvisit_history > :is(.vst_title,.bookmark_title).hide,
        html[data-dcuf-palette] body #visit_history > .newvisit_history > :is(.vst_title,.bookmark_title)[style*="display: none"] {
            display: none !important;
        }
        html[data-dcuf-palette] body #visit_history > .newvisit_history > .newvisit_box {
            min-width: 0 !important;
            overflow: hidden !important;
        }
        html[data-dcuf-palette] body #visit_history > .newvisit_history .newvisit_list {
            display: flex !important;
            gap: 7px !important;
            left: 0 !important;
            margin-left: 0 !important;
            white-space: nowrap !important;
        }

        /* DCUF_SURFACE_OWNER:list */
        html[data-dcuf-palette] body .page_head,
        html[data-dcuf-palette] body .gall_listwrap:has(.custom-mobile-list) {
            box-sizing: border-box !important;
            width: 100% !important;
            min-width: 0 !important;
            border: 1px solid var(--dcuf-glass-border) !important;
            border-radius: var(--dcuf-radius-panel) !important;
            background-color: var(--dcuf-glass-panel) !important;
            background-image: linear-gradient(145deg,var(--dcuf-glass-highlight),transparent 48%) !important;
            box-shadow: var(--dcuf-glass-card-shadow),inset 0 1px 0 var(--dcuf-glass-rim) !important;
            overflow: visible !important;
        }
        html[data-dcuf-palette] body .page_head {
            display: flex !important;
            align-items: center !important;
            flex-wrap: wrap !important;
            gap: 10px !important;
            min-height: 64px !important;
            margin: 14px 0 12px !important;
            padding: 12px 16px !important;
        }
        html[data-dcuf-palette] body:not(.is-write-page) .list_array_option {
            display: grid !important;
            grid-template-columns: auto minmax(0,1fr) auto !important;
            align-items: center !important;
            gap: 10px !important;
            width: 100% !important;
            min-width: 0 !important;
            min-height: 58px !important;
            margin: 0 0 12px !important;
            padding: 10px 12px !important;
            border: 1px solid var(--dcuf-glass-border) !important;
            border-radius: 15px !important;
            background-color: var(--dcuf-glass-panel-soft) !important;
            background-image: linear-gradient(145deg,var(--dcuf-glass-highlight),transparent 52%) !important;
            box-shadow: inset 0 1px 0 var(--dcuf-glass-rim) !important;
            overflow: visible !important;
        }
        html[data-dcuf-palette] body:not(.is-write-page) .list_array_option :is(.array_tab,.left_box,.center_box,.right_box,.fl,.fr) {
            float: none !important;
            min-width: 0 !important;
            margin: 0 !important;
        }
        html[data-dcuf-palette] body:not(.is-write-page) .list_array_option .center_box > .inner {
            position: relative !important;
            display: grid !important;
            grid-template-columns: minmax(0,1fr) 38px !important;
            align-items: center !important;
            width: 100% !important;
            min-width: 0 !important;
            overflow: visible !important;
        }
        html[data-dcuf-palette] body:not(.is-write-page) .list_array_option .center_box > .inner > ul:not(#subject_morelist) {
            grid-column: 1 !important;
            display: flex !important;
            min-width: 0 !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            scrollbar-width: none !important;
        }
        html[data-dcuf-palette] body:not(.is-write-page) .list_array_option .center_box > .inner > ul:not(#subject_morelist)::-webkit-scrollbar {
            display: none !important;
        }
        html[data-dcuf-palette] body:not(.is-write-page) .list_array_option .center_box > .inner > .btn_subject_more {
            grid-column: 2 !important;
            position: static !important;
            inset: auto !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 36px !important;
            min-width: 36px !important;
            height: 36px !important;
            margin: 0 !important;
            transform: none !important;
            z-index: 3 !important;
        }
        html[data-dcuf-palette] body:not(.is-write-page) .list_array_option #subject_morelist {
            position: absolute !important;
            top: calc(100% + 8px) !important;
            right: 0 !important;
            left: auto !important;
            width: max-content !important;
            max-width: min(520px,calc(100vw - 20px)) !important;
            z-index: 2147483647 !important;
        }
        html[data-dcuf-palette] body .gall_listwrap:has(.custom-mobile-list) {
            padding: 0 !important;
        }
        html[data-dcuf-palette] body .custom-mobile-list {
            display: block !important;
            padding: 8px 12px 0 !important;
            border: 0 !important;
            background: transparent !important;
        }
        html[data-dcuf-palette] body .custom-mobile-list > .custom-post-item {
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: 13px 4px !important;
            border: 0 !important;
            border-bottom: 1px solid color-mix(in srgb,var(--dcuf-theme-border-strong) 58%,transparent) !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            color: var(--dcuf-theme-fg) !important;
        }
        html[data-dcuf-palette] body .custom-mobile-list > .custom-post-item:last-child {
            border-bottom: 0 !important;
        }
        html[data-dcuf-palette] body .custom-mobile-list .post-title {
            display: flex !important;
            align-items: center !important;
            flex-wrap: nowrap !important;
            gap: 7px !important;
            min-width: 0 !important;
            margin: 0 0 7px !important;
        }
        html[data-dcuf-palette] body .custom-mobile-list .post-title-link {
            order: 2 !important;
            flex: 1 1 auto !important;
            min-width: 0 !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
        }
        html[data-dcuf-palette] body .custom-mobile-list .post-title > .gall_subject {
            order: 1 !important;
            flex: 0 0 auto !important;
        }
        html[data-dcuf-palette] body .custom-mobile-list .dcuf-title-meta {
            order: 3 !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: flex-end !important;
            flex: 0 0 auto !important;
            gap: 5px !important;
            margin-left: auto !important;
            white-space: nowrap !important;
        }
        html[data-dcuf-palette] body .custom-mobile-list .dcuf-title-meta > .reply_num {
            order: 1 !important;
            margin: 0 !important;
            color: var(--dcuf-theme-accent) !important;
        }
        html[data-dcuf-palette] body .custom-mobile-list .dcuf-title-meta > .dcuf-title-decoration {
            order: 2 !important;
            display: inline-flex !important;
            align-items: center !important;
            margin: 0 !important;
            color: var(--dcuf-theme-accent) !important;
        }
        html[data-dcuf-palette] body .custom-mobile-list .post-meta {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            min-width: 0 !important;
            color: var(--dcuf-theme-fg-muted) !important;
        }
        html[data-dcuf-palette] body .custom-bottom-controls {
            display: grid !important;
            gap: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            border-top: 1px solid color-mix(in srgb,var(--dcuf-theme-border-strong) 58%,transparent) !important;
            border-radius: 0 0 var(--dcuf-radius-panel) var(--dcuf-radius-panel) !important;
            background: transparent !important;
            box-shadow: none !important;
            overflow: visible !important;
        }
        html[data-dcuf-palette] body .custom-bottom-controls > :is(.dcuf-bottom-action-card,.dcuf-pagination-card,.dcuf-search-card) {
            margin: 0 !important;
            padding: 11px 12px !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        html[data-dcuf-palette] body .custom-bottom-controls > :is(.dcuf-pagination-card,.dcuf-search-card) {
            border-top: 1px solid color-mix(in srgb,var(--dcuf-theme-border-strong) 42%,transparent) !important;
        }

        /* DCUF_SURFACE_OWNER:write */
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form {
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 0 !important;
            width: 100% !important;
            min-width: 0 !important;
            padding: 0 !important;
            border: 1px solid var(--dcuf-glass-border) !important;
            border-radius: var(--dcuf-radius-panel) !important;
            background-color: var(--dcuf-glass-panel) !important;
            background-image: linear-gradient(145deg,var(--dcuf-glass-highlight),transparent 46%) !important;
            box-shadow: var(--dcuf-glass-card-shadow),inset 0 1px 0 var(--dcuf-glass-rim) !important;
            overflow: visible !important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form > :is(.write_subject,.editor_wrap,.write_option,.btn_box.write),
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form > :is(.ai_easy_wrap,.ai_easy_box,.ai_quick_register) {
            box-sizing: border-box !important;
            width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 12px !important;
            border: 0 !important;
            border-bottom: 1px solid color-mix(in srgb,var(--dcuf-theme-border-strong) 46%,transparent) !important;
            background: transparent !important;
            box-shadow: none !important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form :is(.note-editor,.tx-editor-container,.tx-editor) {
            min-width: 0 !important;
            border-radius: var(--dcuf-radius-row) !important;
            background: transparent !important;
            box-shadow: none !important;
            overflow: visible !important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form :is(.note-editable,.tx-content-container,.tx-canvas,textarea[name="memo"]) {
            box-sizing: border-box !important;
            width: 100% !important;
            min-width: 0 !important;
            border-radius: 0 0 var(--dcuf-radius-control) var(--dcuf-radius-control) !important;
            background: var(--dcuf-glass-paper) !important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form :is(.note-toolbar,.note-toolbar-media,.tx-toolbar,.tx-toolbar-basic,.btns-box) {
            display: flex !important;
            align-items: center !important;
            flex-wrap: nowrap !important;
            gap: 4px !important;
            width: 100% !important;
            min-width: 0 !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            scrollbar-width: thin !important;
            overscroll-behavior-x: contain !important;
            -webkit-overflow-scrolling: touch !important;
            touch-action: pan-x !important;
            background: color-mix(in srgb,var(--dcuf-glass-panel-strong) 82%,transparent) !important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form :is(.note-toolbar,.note-toolbar-media,.tx-toolbar,.tx-toolbar-basic,.btns-box) > *,
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form .note-toolbar .note-btn-group {
            flex: 0 0 auto !important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form :is(.ai_easy_wrap,.ai_easy_box,.ai_quick_register) {
            position: relative !important;
            display: flex !important;
            align-items: center !important;
            flex-wrap: wrap !important;
            gap: 8px !important;
            overflow: visible !important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form :is(.ai_easy_wrap,.ai_easy_box,.ai_quick_register) > * {
            flex: 0 0 auto !important;
            min-width: 0 !important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form :is(.ai_prompt,input[type="text"],textarea) {
            max-width: 100% !important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form :is(.ai_easy_wrap,.ai_easy_box,.ai_quick_register) :is(.btn_close,.btn_del,.btn_reset,.ai_native_close,[class*="close"],[class*="reset"]) {
            position: static !important;
            inset: auto !important;
            flex: 0 0 auto !important;
            margin: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
            background-color: transparent !important;
            transform: none !important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form #btn_pumx {
            position: relative !important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form #btn_pumx::after {
            content: none !important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form #btn_pumx:is(.on,[aria-pressed="true"])::after {
            content: '' !important;
            position: absolute !important;
            left: 50% !important;
            top: 50% !important;
            width: 6px !important;
            height: 10px !important;
            border: 0 !important;
            border-right: 2px solid currentColor !important;
            border-bottom: 2px solid currentColor !important;
            background: none !important;
            transform: translate(-50%,-58%) rotate(45deg) !important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form > .btn_box.write {
            display: grid !important;
            grid-template-columns: repeat(2,minmax(0,1fr)) !important;
            gap: 10px !important;
            border-bottom: 0 !important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form > .btn_box.write > button {
            width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
        }

        /* DCUF_SURFACE_OWNER:native-layer */
        html[data-dcuf-palette] body :is(#pop_manage_report_list,#hot_rank_pop2)[data-dcuf-host-popup-portal="1"] {
            position: fixed !important;
            z-index: 2147483647 !important;
            max-width: calc(100vw - 16px) !important;
            max-height: calc(100dvh - 16px) !important;
            overflow: auto !important;
            pointer-events: auto !important;
        }

        @media (max-width: 760px) {
            html[data-dcuf-palette] body > :is(.dcheader.typea,.gnb_bar,#visit_history),
            html[data-dcuf-palette] body #top > :is(.dcheader.typea,.gnb_bar,#visit_history) {
                width: 100% !important;
            }
            html[data-dcuf-palette] body .dcheader.typea {
                border-right: 0 !important;
                border-left: 0 !important;
                border-radius: 0 0 14px 14px !important;
            }
            html[data-dcuf-palette] body .dcheader.typea .dchead {
                grid-template-columns: minmax(0,1fr) auto !important;
                gap: 10px !important;
                min-height: 64px !important;
                padding: 8px 12px !important;
            }
            html[data-dcuf-palette] body .dcheader.typea .wrap_search {
                grid-column: 1 / -1 !important;
                grid-row: 2 !important;
                width: 100% !important;
            }
            html[data-dcuf-palette] body .dcheader.typea .area_links {
                grid-column: 2 !important;
                grid-row: 1 !important;
                max-width: min(58vw,360px) !important;
                overflow-x: auto !important;
                overflow-y: hidden !important;
                scrollbar-width: none !important;
            }
            html[data-dcuf-palette] body .dcheader.typea .area_links::-webkit-scrollbar {
                display: none !important;
            }
            html[data-dcuf-palette] body:not(.is-write-page) .list_array_option {
                grid-template-columns: minmax(0,1fr) auto !important;
            }
            html[data-dcuf-palette] body:not(.is-write-page) .list_array_option .center_box {
                grid-column: 1 / -1 !important;
                grid-row: 2 !important;
            }
            html[data-dcuf-palette] body .custom-mobile-list .post-title {
                align-items: flex-start !important;
            }
            html[data-dcuf-palette] body .custom-mobile-list .dcuf-title-meta {
                padding-top: 2px !important;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            html[data-dcuf-palette] body :is(.dcheader.typea,.gnb_bar,#visit_history,.list_array_option,.custom-mobile-list,.custom-bottom-controls,form.dcuf-write-form,[data-dcuf-host-popup-portal="1"]),
            html[data-dcuf-palette] body :is(.dcheader.typea,.gnb_bar,#visit_history,.list_array_option,.custom-mobile-list,.custom-bottom-controls,form.dcuf-write-form,[data-dcuf-host-popup-portal="1"])::before,
            html[data-dcuf-palette] body :is(.dcheader.typea,.gnb_bar,#visit_history,.list_array_option,.custom-mobile-list,.custom-bottom-controls,form.dcuf-write-form,[data-dcuf-host-popup-portal="1"])::after {
                scroll-behavior: auto !important;
                transition: none !important;
                animation: none !important;
            }
        }
    `;

    const installStyle = () => {
        let style = document.getElementById(STYLE_ID);
        if (!(style instanceof HTMLStyleElement)) {
            style = document.createElement('style');
            style.id = STYLE_ID;
            (document.head || document.documentElement)?.appendChild(style);
        }
        if (style.dataset.dcufOwnerVersion !== OWNER_VERSION) {
            style.textContent = buildCss();
            style.dataset.dcufOwnerVersion = OWNER_VERSION;
        }
    };

    const enforceOwnership = () => {
        retireLegacyOwners();
        installStyle();
    };

    enforceOwnership();

    let frame = 0;
    const scheduleEnforce = () => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
            frame = 0;
            enforceOwnership();
        });
    };

    const observerRoot = document.head || document.documentElement;
    if (observerRoot) {
        const observer = new MutationObserver((mutations) => {
            if (mutations.some((mutation) => Array.from(mutation.addedNodes).some((node) => node instanceof HTMLStyleElement))) {
                scheduleEnforce();
            }
        });
        observer.observe(observerRoot, { childList: true, subtree: true });
        root.__dcufFinalSurfaceOwnerObserver = observer;
    }

    window.addEventListener('pageshow', (event) => {
        if (event.persisted) scheduleEnforce();
    });
})();
