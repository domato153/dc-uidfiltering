; (() => {
    'use strict';

    const root = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
    if (root.__dcufFinalSurfaceThemeInstalled) return;
    root.__dcufFinalSurfaceThemeInstalled = true;

    const STYLE_ID = 'dcuf-final-surface-theme';
    const OWNER_VERSION = 'p1-20260801-r2';
    const REMOVE_STYLE_IDS = Object.freeze(['dcuf-phase1-list-theme', 'dcuf-live-surface-owner']);
    const PRUNE_STYLE_IDS = Object.freeze(['dcuf-mobile-palette-style']);
    const OWNED_MARKERS = Object.freeze([
        '.dcheader', '.gnb_bar', '#visit_history', '.newvisit_history', '.page_head',
        '.dcuf-header-drawer', '.list_array_option', '.custom-mobile-list', '.custom-post-item',
        '.custom-bottom-controls', 'body.is-write-page', 'form.dcuf-write-form',
        '#pop_manage_report_list', '#hot_rank_pop2'
    ]);

    root.__dcufSurfaceOwners = Object.freeze({
        headerRecent: STYLE_ID,
        list: STYLE_ID,
        article: 'dcuf-mobile-palette-style',
        comments: 'dcuf-mobile-palette-style',
        write: STYLE_ID,
        nativeLayer: STYLE_ID
    });

    const splitSelectors = (text) => {
        const output = [];
        let start = 0;
        let depth = 0;
        let quote = '';
        let escaped = false;
        for (let index = 0; index < text.length; index += 1) {
            const character = text[index];
            if (escaped) { escaped = false; continue; }
            if (character === '\\') { escaped = true; continue; }
            if (quote) {
                if (character === quote) quote = '';
                continue;
            }
            if (character === '"' || character === "'") { quote = character; continue; }
            if (character === '(' || character === '[') depth += 1;
            else if (character === ')' || character === ']') depth = Math.max(0, depth - 1);
            else if (character === ',' && depth === 0) {
                output.push(text.slice(start, index).trim());
                start = index + 1;
            }
        }
        output.push(text.slice(start).trim());
        return output.filter(Boolean);
    };

    const ownsSelector = (selector) => OWNED_MARKERS.some((marker) => selector.includes(marker));

    const deleteRuleAt = (rule, index) => {
        const parentRule = rule.parentRule;
        if (parentRule && typeof parentRule.deleteRule === 'function') {
            parentRule.deleteRule(index);
            return;
        }
        const sheet = rule.parentStyleSheet;
        if (sheet && typeof sheet.deleteRule === 'function') sheet.deleteRule(index);
    };

    const pruneRules = (rules) => {
        if (!rules) return 0;
        let changed = 0;
        for (let index = rules.length - 1; index >= 0; index -= 1) {
            const rule = rules[index];
            if (!rule) continue;
            if (typeof CSSStyleRule !== 'undefined' && rule instanceof CSSStyleRule) {
                const selectors = splitSelectors(rule.selectorText || '');
                if (!selectors.some(ownsSelector)) continue;
                const retained = selectors.filter((selector) => !ownsSelector(selector));
                if (retained.length === 0) deleteRuleAt(rule, index);
                else rule.selectorText = retained.join(', ');
                changed += 1;
                continue;
            }
            if (rule.cssRules) changed += pruneRules(rule.cssRules);
        }
        return changed;
    };

    const retireCompetingOwners = () => {
        REMOVE_STYLE_IDS.forEach((id) => document.getElementById(id)?.remove());
        PRUNE_STYLE_IDS.forEach((id) => {
            const style = document.getElementById(id);
            if (!(style instanceof HTMLStyleElement) || style.dataset.dcufSurfacePruned === OWNER_VERSION) return;
            try {
                const changed = pruneRules(style.sheet?.cssRules);
                style.dataset.dcufSurfacePruned = OWNER_VERSION;
                root.__dcufSurfaceOwnerPrunedRules = (root.__dcufSurfaceOwnerPrunedRules || 0) + changed;
            } catch (error) {
                root.__dcufSurfaceOwnerPruneErrors = [
                    ...(root.__dcufSurfaceOwnerPruneErrors || []),
                    String(error?.message || error)
                ];
            }
        });
    };

    const CSS = `
        /* DCUF_SURFACE_OWNER:header-recent */
        html[data-dcuf-palette] body :is(.dcheader.typea,.gnb_bar,#visit_history) {
            box-sizing:border-box!important;
            width:min(1480px,calc(100% - 24px))!important;
            max-width:1480px!important;
            margin-right:auto!important;
            margin-left:auto!important;
        }
        html[data-dcuf-palette] body :is(.dcheader.typea,.gnb_bar,#visit_history>.newvisit_history) {
            border:1px solid var(--dcuf-glass-border)!important;
            background-color:var(--dcuf-glass-panel)!important;
            background-image:linear-gradient(145deg,var(--dcuf-glass-highlight),transparent 48%)!important;
            box-shadow:var(--dcuf-glass-card-shadow),inset 0 1px 0 var(--dcuf-glass-rim)!important;
        }
        html[data-dcuf-palette] body .dcheader.typea {
            min-height:84px!important;
            border-radius:24px!important;
            overflow:visible!important;
        }
        html[data-dcuf-palette] body .dcheader.typea::before {
            content:""!important;
            box-sizing:border-box!important;
            display:block!important;
            position:absolute!important;
            inset:0 0 auto 0!important;
            z-index:0!important;
            width:100%!important;
            height:calc(100% + 136px)!important;
            border:1px solid var(--dcuf-glass-border)!important;
            border-radius:24px!important;
            background-color:var(--dcuf-glass-panel)!important;
            background-image:linear-gradient(145deg,var(--dcuf-glass-highlight),transparent 48%)!important;
            box-shadow:var(--dcuf-glass-card-shadow),inset 0 1px 0 var(--dcuf-glass-rim)!important;
            pointer-events:none!important;
        }
        html[data-dcuf-palette] body .dcheader.typea .dchead {
            display:grid!important;
            grid-template-columns:minmax(150px,.75fr) minmax(280px,480px) minmax(360px,1.25fr)!important;
            align-items:center!important;
            gap:18px!important;
            box-sizing:border-box!important;
            width:100%!important;
            max-width:none!important;
            min-width:0!important;
            min-height:84px!important;
            margin:0!important;
            padding:0 24px!important;
        }
        html[data-dcuf-palette] body .dcheader.typea :is(.dc_logo,.wrap_search,.area_links) {
            position:static!important;
            inset:auto!important;
            min-width:0!important;
            margin:0!important;
            transform:none!important;
        }
        html[data-dcuf-palette] body .dcheader.typea .area_links {
            display:flex!important;
            align-items:center!important;
            justify-content:flex-end!important;
            flex-wrap:nowrap!important;
            gap:7px!important;
            white-space:nowrap!important;
        }
        html[data-dcuf-palette] body .dcheader.typea .area_links>* { flex:0 0 auto!important; }
        html[data-dcuf-palette] body .dcheader.typea .area_links>:is(a,button) {
            display:inline-flex!important;
            align-items:center!important;
            justify-content:center!important;
            min-height:28px!important;
            line-height:1.2!important;
            vertical-align:middle!important;
        }
        html[data-dcuf-palette] body .dcheader.typea .top_search {
            border:1px solid var(--dcuf-glass-border)!important;
            border-radius:10px!important;
            background-color:var(--dcuf-glass-control)!important;
            background-image:linear-gradient(180deg,var(--dcuf-glass-highlight),transparent 76%)!important;
            box-shadow:inset 0 1px 0 var(--dcuf-glass-rim),0 5px 14px rgba(34,50,82,.06)!important;
        }
        html[data-dcuf-palette] body .gnb_bar {
            min-height:46px!important;
            margin-top:8px!important;
            border-radius:14px!important;
            overflow:visible!important;
        }
        html[data-dcuf-palette] body .gnb_bar .gnb {
            box-sizing:border-box!important;
            width:100%!important;
            max-width:none!important;
            margin:0!important;
            padding:0 14px!important;
        }
        html[data-dcuf-palette] body .gnb_bar .gnb_list li > a,
        html[data-dcuf-palette] body .page_head h2 a {
            color:var(--dcuf-theme-fg)!important;
        }
        html[data-dcuf-palette] body #visit_history>.newvisit_history {
            display:grid!important;
            grid-template-columns:auto auto minmax(0,1fr) auto auto!important;
            align-items:center!important;
            gap:8px!important;
            min-height:44px!important;
            height:auto!important;
            margin-top:8px!important;
            padding:4px 12px!important;
            border-radius:14px!important;
            overflow:visible!important;
        }
        html[data-dcuf-palette] body #visit_history>.newvisit_history>:is(.vst_title,.bookmark_title)[hidden],
        html[data-dcuf-palette] body #visit_history>.newvisit_history>:is(.vst_title,.bookmark_title).hide,
        html[data-dcuf-palette] body #visit_history>.newvisit_history>:is(.vst_title,.bookmark_title)[style*="display: none"] { display:none!important; }
        html[data-dcuf-palette] body #visit_history>.newvisit_history>.newvisit_box {
            min-width:0!important;
            overflow:hidden!important;
        }
        html[data-dcuf-palette] body #visit_history .newvisit_list {
            display:flex!important;
            gap:7px!important;
            left:0!important;
            margin-left:0!important;
            white-space:nowrap!important;
        }
        html[data-dcuf-palette] body #visit_history>.newvisit_history>:is(.vst_title,.bookmark_title,.tit) {
            color:var(--dcuf-theme-fg)!important;
        }
        html[data-dcuf-palette] body #visit_history>.newvisit_history>.bnt_newvisit_more,
        html[data-dcuf-palette] body #visit_history>.newvisit_history .newvisit_list a {
            color:var(--dcuf-theme-fg-muted)!important;
        }
        html[data-dcuf-palette] body #visit_history>.newvisit_history>:is(.vst_title,.bookmark_title,.tit,.bnt_newvisit_more),
        html[data-dcuf-palette] body .page_head h2 a {
            color:var(--dcuf-theme-accent)!important;
        }
        html[data-dcuf-palette] body #visit_history .newvisit_box { position:relative!important; z-index:0!important; }
        html[data-dcuf-palette] body #visit_history>.newvisit_history>:is(.btn_open,.btn_visit_prev,.btn_visit_next,.bnt_visit_prev,.bnt_visit_next) {
            display:inline-flex!important;
            align-items:center!important;
            justify-content:center!important;
            width:32px!important;
            min-width:32px!important;
            height:32px!important;
            min-height:32px!important;
            border:1px solid var(--dcuf-glass-border)!important;
            border-radius:9px!important;
            background-image:none!important;
            background-color:var(--dcuf-glass-control)!important;
            color:var(--dcuf-theme-fg)!important;
            position:relative!important;
            z-index:2!important;
            pointer-events:auto!important;
        }
        html[data-dcuf-palette] body #visit_history>.newvisit_history>.btn_open > .sp_img.icon_listmore {
            display:block!important;
            width:16px!important;
            height:16px!important;
            background-image:none!important;
            background-position:initial!important;
        }

        /* DCUF_SURFACE_OWNER:list */
        html[data-dcuf-palette] body :is(.page_head,.gall_listwrap:has(.custom-mobile-list)) {
            box-sizing:border-box!important;
            width:100%!important;
            min-width:0!important;
            border:1px solid var(--dcuf-glass-border)!important;
            border-radius:var(--dcuf-radius-panel)!important;
            background-color:var(--dcuf-glass-panel)!important;
            background-image:linear-gradient(145deg,var(--dcuf-glass-highlight),transparent 48%)!important;
            box-shadow:var(--dcuf-glass-card-shadow),inset 0 1px 0 var(--dcuf-glass-rim)!important;
            overflow:visible!important;
        }
        html[data-dcuf-palette] body .page_head {
            display:flex!important;
            align-items:center!important;
            flex-wrap:wrap!important;
            gap:10px!important;
            min-height:64px!important;
            margin:14px 0 12px!important;
            padding:12px 16px!important;
        }
        html[data-dcuf-palette] body .page_head > .fr.gall_issuebox > :is(button.relate,button.adr_copy,button.gall_useinfo,.fixture-issue-more),
        html[data-dcuf-palette] body .page_head > .fr.gall_issuebox > .bundle > :is(button,a,#issue_setting) {
            position:static!important;
            display:inline-flex!important;
            align-items:center!important;
            justify-content:center!important;
            min-height:38px!important;
            min-width:38px!important;
            padding:0 12px!important;
            border:1px solid var(--dcuf-glass-border)!important;
            border-radius:10px!important;
            background-color:var(--dcuf-glass-control)!important;
            background-image:linear-gradient(180deg,var(--dcuf-glass-highlight),transparent 76%)!important;
            box-shadow:inset 0 1px 0 var(--dcuf-glass-rim),0 5px 14px rgba(34,50,82,.06)!important;
            color:var(--dcuf-theme-fg)!important;
        }
        html[data-dcuf-palette] body .page_head > .fr.gall_issuebox > :is(button.relate,button.adr_copy,button.gall_useinfo,.fixture-issue-more)::before,
        html[data-dcuf-palette] body .page_head > .fr.gall_issuebox > :is(button.relate,button.adr_copy,button.gall_useinfo,.fixture-issue-more)::after,
        html[data-dcuf-palette] body .page_head > .fr.gall_issuebox > .bundle > :is(button,a,#issue_setting)::before,
        html[data-dcuf-palette] body .page_head > .fr.gall_issuebox > .bundle > :is(button,a,#issue_setting)::after {
            content:none!important;
        }
        html[data-dcuf-palette] body:not(.is-write-page) .list_array_option {
            display:flex!important;
            align-items:center!important;
            flex-wrap:wrap!important;
            gap:10px!important;
            box-sizing:border-box!important;
            width:100%!important;
            min-width:0!important;
            min-height:58px!important;
            margin:0 0 12px!important;
            padding:10px 12px!important;
            border:1px solid var(--dcuf-glass-border)!important;
            border-radius:15px!important;
            background:var(--dcuf-glass-panel-soft)!important;
            background-image:linear-gradient(180deg,var(--dcuf-glass-rim),transparent 76%)!important;
            box-shadow:inset 0 1px 0 var(--dcuf-glass-rim),0 5px 14px rgba(34,50,82,.06)!important;
            -webkit-backdrop-filter:blur(var(--dcuf-glass-blur)) saturate(1.12)!important;
            backdrop-filter:blur(var(--dcuf-glass-blur)) saturate(1.12)!important;
            overflow:visible!important;
            height:auto!important;
        }
        html[data-dcuf-palette] body:not(.is-write-page) .list_array_option :is(.array_tab,.left_box,.center_box,.right_box,.fl,.fr) {
            float:none!important;
            min-width:0!important;
            margin:0!important;
        }
        html[data-dcuf-palette] body:not(.is-write-page) .list_array_option > .right_box {
            position:static!important;
            inset:auto!important;
            width:auto!important;
            max-width:100%!important;
            min-width:0!important;
            flex:0 1 auto!important;
            overflow:visible!important;
        }
        html[data-dcuf-palette] body:not(.is-write-page) .list_array_option > .right_box .output_array {
            display:flex!important;
            align-items:center!important;
            justify-content:flex-end!important;
            gap:8px!important;
            width:100%!important;
            min-width:0!important;
        }
        html[data-dcuf-palette] body:not(.is-write-page) .list_array_option > .right_box .switch_btnbox {
            display:flex!important;
            align-items:center!important;
            flex:0 0 auto!important;
        }
        html[data-dcuf-palette] body:not(.is-write-page) .list_array_option .center_box>.inner {
            position:relative!important;
            display:grid!important;
            grid-template-columns:minmax(0,1fr) 38px!important;
            align-items:center!important;
            width:100%!important;
            min-width:0!important;
            overflow:visible!important;
        }
        html[data-dcuf-palette] body #visit_history>.newvisit_history {
            background-color:transparent!important;
            background-image:none!important;
            box-shadow:none!important;
        }
        html[data-dcuf-palette] body:not(.is-write-page) .list_array_option .center_box {
            flex:1 1 0!important;
            min-width:0!important;
        }
        html[data-dcuf-palette] body:not(.is-write-page) .list_array_option .center_box>.inner>ul:not(#subject_morelist) {
            grid-column:1!important;
            display:flex!important;
            min-width:0!important;
            overflow-x:auto!important;
            overflow-y:hidden!important;
            scrollbar-width:none!important;
        }
        html[data-dcuf-palette] body:not(.is-write-page) .list_array_option .center_box>.inner>ul:not(#subject_morelist)::-webkit-scrollbar { display:none!important; }
        html[data-dcuf-palette] body:not(.is-write-page) .list_array_option > .array_tab > ul {
            display:flex!important;
            align-items:center!important;
            flex-wrap:nowrap!important;
            gap:6px!important;
            min-width:0!important;
            overflow-x:auto!important;
            overflow-y:hidden!important;
            scrollbar-width:none!important;
        }
        html[data-dcuf-palette] body:not(.is-write-page) .list_array_option > .array_tab > ul::-webkit-scrollbar { display:none!important; }
        html[data-dcuf-palette] body:not(.is-write-page) .list_array_option > .array_tab > ul > li {
            display:flex!important;
            align-items:center!important;
            flex:0 0 auto!important;
            height:32px!important;
        }
        html[data-dcuf-palette] body:not(.is-write-page) .list_array_option .btn_subject_more {
            grid-column:2!important;
            position:static!important;
            inset:auto!important;
            display:inline-flex!important;
            align-items:center!important;
            justify-content:center!important;
            width:36px!important;
            min-width:36px!important;
            height:36px!important;
            margin:0!important;
            transform:none!important;
            z-index:3!important;
        }
        html[data-dcuf-palette] body:not(.is-write-page) .list_array_option .btn_write {
            display:inline-flex!important;
            align-items:center!important;
            justify-content:center!important;
            min-height:44px!important;
            padding:0 12px!important;
            border-radius:10px!important;
        }
        html[data-dcuf-palette] body:not(.is-write-page) .list_array_option .btn_write::before {
            content:''!important;
            display:inline-block!important;
            width:8px!important;
            height:8px!important;
            margin-right:6px!important;
            border:2px solid currentColor!important;
            border-radius:50%!important;
        }
        html[data-dcuf-palette] body:not(.is-write-page) .list_array_option .array_tab li:not(.on)>a {
            color:var(--dcuf-theme-fg)!important;
        }
        html[data-dcuf-palette] body:not(.is-write-page) .list_array_option .array_tab :is(.on,li.on>a) {
            display:inline-flex!important;
            align-items:center!important;
            justify-content:center!important;
            min-width:32px!important;
            min-height:32px!important;
            padding:0 10px!important;
        }
        html[data-dcuf-palette] body:not(.is-write-page) .list_array_option .array_num {
            min-height:44px!important;
            display:flex!important;
            align-items:center!important;
        }
        html[data-dcuf-palette] body:not(.is-write-page) .list_array_option #subject_morelist {
            position:absolute!important;
            top:calc(100% + 8px)!important;
            right:0!important;
            left:auto!important;
            width:max-content!important;
            max-width:min(520px,calc(100vw - 20px))!important;
            z-index:2147483647!important;
        }
        html[data-dcuf-palette] body .gall_listwrap:has(.custom-mobile-list) {
            box-sizing:border-box!important;
            width:calc(100vw - 2px)!important;
            max-width:calc(100vw - 2px)!important;
            min-width:0!important;
            padding:0!important;
            overflow:hidden!important;
        }
        html[data-dcuf-palette] body .custom-mobile-list {
            display:block!important;
            box-sizing:border-box!important;
            width:calc(100vw - 2px)!important;
            max-width:calc(100vw - 2px)!important;
            min-width:0!important;
            overflow:hidden!important;
            padding:8px 12px 0!important;
            border:0!important;
            background:var(--dcuf-glass-cell)!important;
            background-image:linear-gradient(145deg,var(--dcuf-glass-highlight),transparent 58%)!important;
            box-shadow:inset 0 1px 0 var(--dcuf-glass-rim)!important;
        }
        html[data-dcuf-palette] body .custom-mobile-list>.custom-post-item {
            box-sizing:border-box!important;
            margin:0!important;
            padding:13px 4px!important;
            border:0!important;
            border-bottom:1px solid color-mix(in srgb,var(--dcuf-theme-border-strong) 58%,transparent)!important;
            border-radius:0!important;
            background:var(--dcuf-glass-cell)!important;
            box-shadow:none!important;
            color:var(--dcuf-theme-fg)!important;
        }
        html[data-dcuf-palette] body .custom-mobile-list>.custom-post-item:last-child { border-bottom:0!important; }
        html[data-dcuf-palette] body .custom-mobile-list>.custom-post-item.dcuf-recent-post {
            background:color-mix(in srgb,var(--dcuf-theme-accent) 4%,var(--dcuf-glass-cell))!important;
            box-shadow:inset 3px 0 0 color-mix(in srgb,var(--dcuf-theme-accent) 54%,transparent)!important;
        }
        html[data-dcuf-palette] body .custom-mobile-list .post-title {
            display:flex!important;
            align-items:center!important;
            flex-wrap:nowrap!important;
            gap:7px!important;
            min-width:0!important;
            margin:0 0 7px!important;
        }
        html[data-dcuf-palette] body .custom-mobile-list .post-title-link {
            order:2!important;
            flex:1 1 auto!important;
            min-width:0!important;
            overflow:hidden!important;
            text-overflow:ellipsis!important;
            white-space:nowrap!important;
        }
        html[data-dcuf-palette] body .custom-mobile-list .post-title>.gall_subject { order:1!important;flex:0 0 auto!important; }
        html[data-dcuf-palette] body .custom-mobile-list .dcuf-title-meta {
            order:3!important;
            display:inline-flex!important;
            align-items:center!important;
            justify-content:flex-end!important;
            flex:0 0 auto!important;
            gap:5px!important;
            margin-left:auto!important;
            white-space:nowrap!important;
        }
        html[data-dcuf-palette] body .custom-mobile-list .dcuf-title-meta>.reply_num {
            order:1!important;
            margin:0!important;
            color:var(--dcuf-theme-accent)!important;
        }
        html[data-dcuf-palette] body .custom-mobile-list .dcuf-title-meta>.dcuf-title-decoration {
            order:2!important;
            display:inline-flex!important;
            align-items:center!important;
            margin:0!important;
            color:var(--dcuf-theme-accent)!important;
        }
        html[data-dcuf-palette] body .custom-mobile-list .post-meta {
            display:flex!important;
            align-items:center!important;
            gap:8px!important;
            min-width:0!important;
            color:var(--dcuf-theme-fg-muted)!important;
        }
        html[data-dcuf-palette] body .custom-mobile-list .post-meta .author {
            display:inline-flex!important;
            width:max-content!important;
            max-width:100%!important;
            flex:0 1 auto!important;
            -webkit-tap-highlight-color:transparent!important;
        }
        html[data-dcuf-palette] body .custom-bottom-controls {
            display:grid!important;
            gap:0!important;
            margin:0!important;
            padding:0!important;
            border:0!important;
            border-top:1px solid color-mix(in srgb,var(--dcuf-theme-border-strong) 58%,transparent)!important;
            border-radius:var(--dcuf-radius-panel)!important;
            background:var(--dcuf-glass-panel)!important;
            background-image:linear-gradient(180deg,var(--dcuf-glass-rim),transparent 72%)!important;
            box-shadow:var(--dcuf-glass-card-shadow),inset 0 1px 0 var(--dcuf-glass-rim)!important;
            overflow:visible!important;
        }
        html[data-dcuf-palette] body .custom-bottom-controls>:is(.dcuf-bottom-action-card,.dcuf-pagination-card,.dcuf-search-card) {
            box-sizing:border-box!important;
            width:100%!important;
            max-width:100%!important;
            min-width:0!important;
            position:relative!important;
            z-index:2147483641!important;
            margin:0!important;
            padding:11px 12px!important;
            border:0!important;
            border-radius:0!important;
            background:transparent!important;
            box-shadow:none!important;
        }
        html[data-dcuf-palette] body .custom-bottom-controls>:is(.dcuf-pagination-card,.dcuf-search-card) {
            border-top:1px solid color-mix(in srgb,var(--dcuf-theme-border-strong) 42%,transparent)!important;
        }
        html[data-dcuf-palette] body .custom-bottom-controls>.dcuf-pagination-card {
            display:flex!important;
            align-items:center!important;
            justify-content:center!important;
        }
        html[data-dcuf-palette] body .custom-bottom-controls>.dcuf-bottom-action-card {
            padding-right:2px!important;
        }
        html[data-dcuf-palette] body .custom-bottom-controls .bottom_paging_box {
            display:flex!important;
            align-items:center!important;
            flex-wrap:nowrap!important;
            max-width:100%!important;
            overflow-x:auto!important;
            overflow-y:hidden!important;
            scrollbar-width:none!important;
        }
        html[data-dcuf-palette] body .custom-bottom-controls .bottom_paging_box::-webkit-scrollbar { display:none!important; }
        html[data-dcuf-palette] body .custom-bottom-controls .bottom_paging_box > * {
            display:inline-flex!important;
            align-items:center!important;
            justify-content:center!important;
            height:38px!important;
            min-height:38px!important;
            line-height:38px!important;
            vertical-align:middle!important;
            flex:0 0 auto!important;
        }
        html[data-dcuf-palette] body .custom-bottom-controls .bottom_paging_box > a.sp_pagingicon {
            display:inline-flex!important;
            align-items:center!important;
            justify-content:center!important;
            width:38px!important;
            min-width:38px!important;
            height:38px!important;
            min-height:38px!important;
            background-image:none!important;
            background-position:initial!important;
            text-indent:0!important;
        }
        html[data-dcuf-palette] body .custom-bottom-controls .bottom_paging_box > em,
        html[data-dcuf-palette] body .custom-bottom-controls .dcuf-bottom-action-card :is(.btn_write,.write,.on) {
            border:1px solid color-mix(in srgb,var(--dcuf-theme-accent) 42%,var(--dcuf-glass-border))!important;
            background-color:color-mix(in srgb,var(--dcuf-theme-accent-strong) 76%,transparent)!important;
            background-image:linear-gradient(145deg,var(--dcuf-glass-control-active-top),var(--dcuf-glass-control-active))!important;
            color:var(--dcuf-theme-on-accent)!important;
            box-shadow:0 6px 14px var(--dcuf-theme-accent-shadow)!important;
        }
        html[data-dcuf-palette] body:not(.is-write-page) .list_array_option .array_tab :is(.on,li.on>a),
        html[data-dcuf-palette] body:not(.is-write-page) .list_array_option .btn_write,
        html[data-dcuf-palette] body .custom-bottom-controls .dcuf-search-card .bnt_search {
            border:1px solid color-mix(in srgb,var(--dcuf-theme-accent) 42%,var(--dcuf-glass-border))!important;
            background-color:color-mix(in srgb,var(--dcuf-theme-accent-strong) 76%,transparent)!important;
            background-image:linear-gradient(145deg,var(--dcuf-glass-control-active-top),var(--dcuf-glass-control-active))!important;
            color:var(--dcuf-theme-on-accent)!important;
            box-shadow:0 6px 14px var(--dcuf-theme-accent-shadow)!important;
        }
        html[data-dcuf-palette] body .custom-bottom-controls .dcuf-search-card .bnt_search {
            min-height:44px!important;
        }
        html[data-dcuf-palette] body .custom-bottom-controls .dcuf-search-card .bnt_search::before {
            content:""!important;
            display:block!important;
            width:15px!important;
            height:15px!important;
            border:2px solid currentColor!important;
            border-radius:50%!important;
            box-sizing:border-box!important;
        }
        html[data-dcuf-palette] body .custom-bottom-controls .dcuf-search-card .bnt_search::after {
            content:""!important;
            display:block!important;
            width:8px!important;
            height:2px!important;
            margin-left:-1px!important;
            background:currentColor!important;
            transform:rotate(45deg)!important;
            transform-origin:left center!important;
        }
        html[data-dcuf-palette] body .pagehead_titicon.mgall.sp_img,
        html[data-dcuf-palette] body .pagehead_titicon.ngall.sp_img {
            background-image:none!important;
            color:var(--dcuf-theme-accent)!important;
            width:26px!important;
            height:20px!important;
            background-position:0px 0px!important;
            background-repeat:no-repeat!important;
            text-indent:0!important;
        }
        html[data-dcuf-palette] body .pagehead_titicon.mgall.sp_img::before { content:'m'!important; }
        html[data-dcuf-palette] body .pagehead_titicon.ngall.sp_img::before { content:'mi'!important; }
        html[data-dcuf-palette] body .gnb_bar .sp_img.icon_next {
            background-image:none!important;
            border-color:transparent!important;
            border-top-color:var(--dcuf-theme-fg-muted)!important;
            color:var(--dcuf-theme-fg-muted)!important;
        }
        html[data-dcuf-palette] body .issue_wrap { border-style:none!important; }
        html[data-dcuf-palette] body #container.gallery_view > .view_bottom_btnbox {
            position:static!important;
            display:flex!important;
            align-items:center!important;
            justify-content:space-between!important;
            box-sizing:border-box!important;
            width:100%!important;
            min-height:44px!important;
            border-radius:16px!important;
        }
        html[data-dcuf-palette] body #container.gallery_view > .view_bottom_btnbox .fr {
            position:static!important;
            float:none!important;
            margin:0!important;
        }
        html[data-dcuf-palette] body :is(.gnb_bar .gnb_list,.gnb_bar .gnb_list > li,.newvisit_history .newvisit_list,.newvisit_history .newvisit_list > li) {
            list-style:none!important;
        }
        html[data-dcuf-palette] body :is(.gnb_bar .gnb_list > li > a,.newvisit_history .newvisit_list > li > a) {
            text-decoration:none!important;
        }

        html[data-dcuf-palette] body .custom-post-item #user_data_lyr.fixture-live-author-menu {
            display:block!important;
            visibility:visible!important;
            opacity:1!important;
            position:absolute!important;
            z-index:2147483647!important;
            overflow:visible!important;
        }
        html[data-dcuf-palette] body .custom-post-item #user_data_lyr {
            display:block!important;
            visibility:visible!important;
            opacity:1!important;
            position:absolute!important;
            z-index:2147483647!important;
        }
        html[data-dcuf-palette] body:not(.is-write-page) .list_array_option #listSizeLayer {
            position:absolute!important;
            z-index:2147483647!important;
            pointer-events:auto!important;
        }
        /* DCUF_SURFACE_OWNER:write */
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form {
            display:flex!important;
            flex-direction:column!important;
            box-sizing:border-box!important;
            width:100%!important;
            min-width:0!important;
            padding:0!important;
            border:1px solid var(--dcuf-glass-border)!important;
            border-radius:var(--dcuf-radius-panel)!important;
            background-color:var(--dcuf-glass-panel)!important;
            background-image:linear-gradient(145deg,var(--dcuf-glass-highlight),transparent 46%)!important;
            box-shadow:var(--dcuf-glass-card-shadow),inset 0 1px 0 var(--dcuf-glass-rim)!important;
            overflow:visible!important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form>:is(.write_subject,.editor_wrap,.write_option,.btn_box.write,.ai_easy_wrap,.ai_easy_box,.ai_quick_register) {
            box-sizing:border-box!important;
            width:100%!important;
            min-width:0!important;
            margin:0!important;
            padding:12px!important;
            border:0!important;
            border-bottom:1px solid color-mix(in srgb,var(--dcuf-theme-border-strong) 46%,transparent)!important;
            background:transparent!important;
            box-shadow:none!important;
        }
        html[data-dcuf-palette] body .custom-bottom-controls :is(.search_left_box,.search_right_box,.bottom_search,form[name="frmSearch"]) {
            box-sizing:border-box!important;
            max-width:100%!important;
            min-width:0!important;
        }
        html[data-dcuf-palette] body :is(.custom-bottom-controls .dcuf-search-card,.dcuf-search-card) input[type="text"] {
            --dcuf-search-input:var(--dcuf-theme-surface-input)!important;
            background-color:var(--dcuf-theme-surface-input)!important;
            background-image:none!important;
            color:var(--dcuf-theme-fg)!important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form>.write_subject {
            border:1px solid var(--dcuf-glass-border)!important;
            border-radius:var(--dcuf-radius-row)!important;
            background:rgba(255,255,255,.58)!important;
            box-shadow:inset 0 1px 0 var(--dcuf-glass-rim)!important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form .write_subject {
            border:1px solid var(--dcuf-glass-border)!important;
            border-radius:var(--dcuf-radius-row)!important;
            background:rgba(255,255,255,.58)!important;
            box-shadow:inset 0 1px 0 var(--dcuf-glass-rim)!important;
        }
        html[data-dcuf-palette] body.is-write-page form .write_subject {
            background:rgba(255,255,255,.58)!important;
        }
        html[data-dcuf-palette] body.is-write-page form#write .write_subject {
            background:rgba(255,255,255,.58)!important;
        }
        html[data-dcuf-palette] body.is-write-page form#write .captcha {
            background:var(--dcuf-glass-input)!important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form .subject_list {
            display:flex!important;
            flex-wrap:nowrap!important;
            width:100%!important;
            max-width:100%!important;
            overflow-x:auto!important;
            overflow-y:hidden!important;
            scrollbar-width:none!important;
            touch-action:pan-x!important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form .subject_list::-webkit-scrollbar { display:none!important; }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form :is(.note-editor,.tx-editor-container,.tx-editor) {
            min-width:0!important;
            border-radius:var(--dcuf-radius-row)!important;
            background:transparent!important;
            box-shadow:none!important;
            overflow:visible!important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form :is(.note-editable,.tx-content-container,.tx-canvas,textarea[name="memo"]) {
            box-sizing:border-box!important;
            width:100%!important;
            min-width:0!important;
            background:var(--dcuf-glass-paper)!important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form :is(.note-toolbar,.note-toolbar-media,.tx-toolbar,.tx-toolbar-basic,.btns-box) {
            display:flex!important;
            align-items:center!important;
            flex-wrap:nowrap!important;
            gap:4px!important;
            width:100%!important;
            min-width:0!important;
            overflow-x:auto!important;
            overflow-y:hidden!important;
            scrollbar-width:thin!important;
            overscroll-behavior-x:contain!important;
            -webkit-overflow-scrolling:touch!important;
            touch-action:pan-x!important;
            background:color-mix(in srgb,var(--dcuf-glass-panel-strong) 82%,transparent)!important;
            background-image:linear-gradient(180deg,var(--dcuf-glass-highlight),transparent 76%)!important;
            box-shadow:inset 0 1px 0 var(--dcuf-glass-rim),0 5px 14px rgba(34,50,82,.06)!important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form :is(.note-toolbar,.note-toolbar-media,.tx-toolbar,.tx-toolbar-basic,.btns-box)>*,
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form .note-toolbar .note-btn-group { flex:0 0 auto!important; }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form :is(.ai_easy_wrap,.ai_easy_box,.ai_quick_register) {
            position:relative!important;
            display:flex!important;
            align-items:center!important;
            flex-wrap:nowrap!important;
            gap:8px!important;
            overflow-x:auto!important;
            overflow-y:hidden!important;
            white-space:nowrap!important;
            scrollbar-width:none!important;
            scroll-padding-inline:8px!important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form :is(.ai_easy_wrap,.ai_easy_box,.ai_quick_register)::-webkit-scrollbar { display:none!important; }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form :is(.ai_easy_wrap,.ai_easy_box,.ai_quick_register)>* {
            flex:0 0 auto!important;
            min-width:0!important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form :is(.ai_easy_wrap,.ai_easy_box,.ai_quick_register) input[type="file"] {
            position:absolute!important;
            width:1px!important;
            height:1px!important;
            opacity:0!important;
            pointer-events:none!important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form .ai_easy_box>.btn_aigo {
            min-width:96px!important;
            min-height:40px!important;
            border:1px solid var(--dcuf-glass-border)!important;
            border-radius:10px!important;
            background-color:var(--dcuf-glass-control)!important;
            background-image:linear-gradient(145deg,var(--dcuf-glass-highlight),transparent 76%)!important;
            color:var(--dcuf-theme-fg)!important;
            box-shadow:inset 0 1px 0 var(--dcuf-glass-rim),0 5px 14px rgba(34,50,82,.06)!important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form :is(.ai_easy_wrap,.ai_easy_box,.ai_quick_register) :is(input[type="text"],textarea) {
            flex:1 1 240px!important;
            max-width:100%!important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form :is(.ai_easy_wrap,.ai_easy_box,.ai_quick_register) :is(.btn_close,.btn_del,.btn_reset,.ai_native_close,[class*="close"],[class*="reset"]) {
            position:static!important;
            inset:auto!important;
            flex:0 0 auto!important;
            margin:0!important;
            border:0!important;
            box-shadow:none!important;
            background-color:transparent!important;
            transform:none!important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form .ai_settings_popup {
            position:fixed!important;
            z-index:2147483647!important;
            left:8px!important;
            right:auto!important;
            top:8px!important;
            bottom:auto!important;
            max-width:calc(100vw - 16px)!important;
            max-height:calc(100dvh - 16px)!important;
            overflow:auto!important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form #btn_pumx { position:relative!important; }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form #btn_pumx::after { content:none!important; }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form #btn_pumx:is(.on,[aria-pressed="true"])::after {
            content:''!important;
            position:absolute!important;
            left:50%!important;
            top:50%!important;
            width:6px!important;
            height:10px!important;
            border:0!important;
            border-right:2px solid currentColor!important;
            border-bottom:2px solid currentColor!important;
            background:none!important;
            transform:translate(-50%,-58%) rotate(45deg)!important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form>.btn_box.write {
            display:grid!important;
            grid-template-columns:repeat(2,minmax(0,1fr))!important;
            gap:10px!important;
            border-bottom:0!important;
            border-radius:0!important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form>.btn_box.write>button[type="submit"] {
            color:var(--dcuf-theme-fg)!important;
        }
        html[data-dcuf-palette] body.is-write-page .pop_content.write_ly,
        html[data-dcuf-palette] body.is-write-page .poply_whiteclose,
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form .fixture-leave-confirm {
            position:fixed!important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form .fixture-leave-confirm {
            left:50%!important;
            top:50%!important;
            right:auto!important;
            bottom:auto!important;
            width:min(400px,calc(100vw - 16px))!important;
            margin:0!important;
            transform:translate(-50%,-50%)!important;
        }
        html[data-dcuf-palette] body.is-write-page form.dcuf-write-form>.btn_box.write>button {
            width:100%!important;
            min-width:0!important;
            margin:0!important;
        }

        @media (min-width:768px) {
            html[data-dcuf-palette] body.is-write-page form.dcuf-write-form {
                display:block!important;
            }
            html[data-dcuf-palette] body.is-write-page form.dcuf-write-form > .fixture-adult,
            html[data-dcuf-palette] body.is-write-page form.dcuf-write-form > #write_option_box {
                display:inline-flex!important;
                align-items:center!important;
                vertical-align:middle!important;
                width:auto!important;
                min-width:0!important;
                margin:8px 0 0 20px!important;
                padding:0!important;
                border:0!important;
                background:transparent!important;
                box-shadow:none!important;
            }
            html[data-dcuf-palette] body.is-write-page form.dcuf-write-form > #write_option_box > .inner {
                display:inline-flex!important;
                align-items:center!important;
            }
        }

        /* DCUF_SURFACE_OWNER:native-layer */
        html[data-dcuf-palette] body :is(#pop_manage_report_list,#hot_rank_pop2)[data-dcuf-host-popup-portal="1"] {
            position:fixed!important;
            z-index:2147483647!important;
            max-width:calc(100vw - 16px)!important;
            max-height:calc(100dvh - 16px)!important;
            overflow:auto!important;
            pointer-events:auto!important;
        }

        /* DCUF-owned drawer shell; its contents remain original host nodes in presentation panels. */
        html[data-dcuf-palette] body .dcuf-header-drawer {
            position:relative!important;
            z-index:2147483600!important;
            display:inline-flex!important;
            align-items:center!important;
            flex:0 0 auto!important;
            margin:0!important;
            padding:0!important;
        }
        html[data-dcuf-palette] body .dcuf-header-drawer__toggle {
            display:inline-flex!important;
            align-items:center!important;
            justify-content:center!important;
            min-height:32px!important;
            padding:0 12px!important;
            border:1px solid var(--dcuf-glass-border)!important;
            border-radius:10px!important;
            background:var(--dcuf-glass-control)!important;
            color:var(--dcuf-theme-fg-muted)!important;
            white-space:nowrap!important;
        }
        html[data-dcuf-palette] body .custom-mobile-list>.custom-post-item:has(.post-title-link:active) {
            filter:brightness(.96)!important;
            outline:2px solid var(--dcuf-theme-accent)!important;
            outline-offset:-2px!important;
        }
        html[data-dcuf-palette] body .dcuf-header-drawer__body {
            display:none!important;
            position:absolute!important;
            top:calc(100% + 8px)!important;
            right:0!important;
            width:min(640px,calc(100vw - 24px))!important;
            max-width:calc(100vw - 24px)!important;
            max-height:0!important;
            overflow:hidden!important;
            opacity:0!important;
            visibility:hidden!important;
            pointer-events:none!important;
            z-index:2147483646!important;
        }
        html[data-dcuf-palette] body .dcuf-header-drawer[data-open="1"] .dcuf-header-drawer__body {
            display:block!important;
            max-height:none!important;
            overflow:visible!important;
            opacity:1!important;
            visibility:visible!important;
            pointer-events:auto!important;
        }
        html[data-dcuf-palette] body .dcuf-header-drawer__body-inner {
            display:grid!important;
            min-height:0!important;
            overflow:hidden!important;
            border:1px solid var(--dcuf-glass-border)!important;
            border-radius:22px!important;
            background:var(--dcuf-glass-panel)!important;
            background-image:linear-gradient(145deg,var(--dcuf-glass-highlight),transparent 58%)!important;
            box-shadow:var(--dcuf-glass-popup-shadow),inset 0 1px 0 var(--dcuf-glass-rim)!important;
        }
        html[data-dcuf-palette] body .dcuf-header-drawer__panel {
            max-height:min(70vh,520px)!important;
            padding:0!important;
            border:0!important;
            border-radius:0!important;
            background:var(--dcuf-glass-cell)!important;
            box-shadow:none!important;
            overflow:visible!important;
        }
        html[data-dcuf-palette] body .dcuf-header-drawer__panel + .dcuf-header-drawer__panel {
            border-top:1px solid color-mix(in srgb,var(--dcuf-theme-border-strong) 42%,transparent)!important;
        }
        html[data-dcuf-palette] body .dcuf-header-drawer__panel[data-source="issue"]>.issue_contentbox,
        html[data-dcuf-palette] body .dcuf-header-drawer__panel[data-source="top-recom"]>.concept_wrap {
            display:block!important;
            position:static!important;
            width:100%!important;
            max-width:100%!important;
            height:auto!important;
            max-height:none!important;
            margin:0!important;
            opacity:1!important;
            visibility:visible!important;
            background:var(--dcuf-glass-cell)!important;
            box-shadow:none!important;
            overflow:visible!important;
        }

        @media (max-width:760px) {
            html[data-dcuf-palette] body :is(.dcheader.typea,.gnb_bar,#visit_history) { width:100%!important; }
            html[data-dcuf-palette] body .dcheader.typea {
                border-right:0!important;
                border-left:0!important;
                border-radius:0 0 14px 14px!important;
            }
            html[data-dcuf-palette] body .dcheader.typea::before { height:calc(100% + 166px)!important; }
            html[data-dcuf-palette] body #dcinside-filter-setting {
                box-sizing:border-box!important;
                min-width:0!important;
                left:8px!important;
                right:8px!important;
                top:8px!important;
                bottom:auto!important;
                transform:none!important;
                animation:none!important;
                width:calc(100vw - 16px)!important;
                max-width:calc(100vw - 16px)!important;
                height:auto!important;
                max-height:calc(100vh - 16px)!important;
                overflow:auto!important;
            }
            html[data-dcuf-palette] body .dcheader.typea .dchead {
                grid-template-columns:minmax(0,1fr) auto!important;
                gap:10px!important;
                min-height:64px!important;
                padding:8px 12px!important;
            }
            html[data-dcuf-palette] body .dcheader.typea .wrap_search {
                grid-column:1/-1!important;
                grid-row:2!important;
                width:100%!important;
            }
            html[data-dcuf-palette] body .dcheader.typea .area_links {
                grid-column:2!important;
                grid-row:1!important;
                max-width:min(58vw,360px)!important;
                overflow-x:auto!important;
                overflow-y:hidden!important;
                scrollbar-width:none!important;
            }
            html[data-dcuf-palette] body .dcheader.typea .area_links::-webkit-scrollbar { display:none!important; }
            html[data-dcuf-palette] body:not(.is-write-page) .list_array_option {
                display:flex!important;
                flex-wrap:wrap!important;
                height:auto!important;
            }
            html[data-dcuf-palette] body:not(.is-write-page) .list_array_option > .array_tab {
                order:1!important;
                flex:1 1 auto!important;
                min-width:0!important;
            }
            html[data-dcuf-palette] body:not(.is-write-page) .list_array_option > .array_tab > ul {
                display:flex!important;
                align-items:center!important;
                flex-wrap:nowrap!important;
                gap:6px!important;
                min-width:0!important;
                overflow-x:auto!important;
                overflow-y:hidden!important;
                scrollbar-width:none!important;
            }
            html[data-dcuf-palette] body:not(.is-write-page) .list_array_option > .array_tab > ul::-webkit-scrollbar { display:none!important; }
            html[data-dcuf-palette] body:not(.is-write-page) .list_array_option > .array_tab > ul > li {
                display:flex!important;
                align-items:center!important;
                flex:0 0 auto!important;
                height:32px!important;
            }
            html[data-dcuf-palette] body:not(.is-write-page) .list_array_option .center_box {
                order:3!important;
                grid-column:1/-1!important;
                grid-row:2!important;
                flex:1 0 100%!important;
                width:100%!important;
            }
            html[data-dcuf-palette] body:not(.is-write-page) .list_array_option > .right_box {
                order:2!important;
                align-self:flex-start!important;
            }
            html[data-dcuf-palette] body .custom-mobile-list .post-title { align-items:flex-start!important; }
        }

        @media (min-width:761px) {
            html[data-dcuf-palette] body .custom-mobile-list {
                border-radius:18px!important;
                overflow:hidden!important;
            }
            html[data-dcuf-palette] body .custom-mobile-list>.custom-post-item {
                padding:5px 4px!important;
            }
            html[data-dcuf-palette] body .custom-mobile-list .post-title {
                align-items:center!important;
                margin-bottom:5px!important;
                font-size:16px!important;
                line-height:22px!important;
                white-space:nowrap!important;
            }
            html[data-dcuf-palette] body .custom-mobile-list .post-title-link {
                font-size:16px!important;
                line-height:22px!important;
                white-space:nowrap!important;
            }
        }

        @media (prefers-reduced-motion:reduce) {
            html[data-dcuf-palette] body :is(.dcheader.typea,.gnb_bar,#visit_history,.list_array_option,.custom-mobile-list,.custom-bottom-controls,form.dcuf-write-form,[data-dcuf-host-popup-portal="1"]),
            html[data-dcuf-palette] body :is(.dcheader.typea,.gnb_bar,#visit_history,.list_array_option,.custom-mobile-list,.custom-bottom-controls,form.dcuf-write-form,[data-dcuf-host-popup-portal="1"])::before,
            html[data-dcuf-palette] body :is(.dcheader.typea,.gnb_bar,#visit_history,.list_array_option,.custom-mobile-list,.custom-bottom-controls,form.dcuf-write-form,[data-dcuf-host-popup-portal="1"])::after {
                scroll-behavior:auto!important;
                transition:none!important;
                animation:none!important;
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
            style.textContent = CSS;
            style.dataset.dcufOwnerVersion = OWNER_VERSION;
        }
        if (style.parentElement && style !== style.parentElement.lastElementChild) {
            style.parentElement.appendChild(style);
        }
    };

    const enforceOwnership = () => {
        retireCompetingOwners();
        installStyle();
    };
    root.__dcufEnforceSurfaceOwnership = enforceOwnership;
    enforceOwnership();
    document.addEventListener('DOMContentLoaded', enforceOwnership, { once: true, passive: true });

    const syncWriteHeadtextRail = () => {
        document.querySelectorAll('body.is-write-page .write_subject .subject_list').forEach((list) => {
            const selected = list.querySelector(':scope > li.sel, :scope > li.active');
            if (!(list instanceof HTMLElement) || !(selected instanceof HTMLElement)) return;
            const listRect = list.getBoundingClientRect();
            const selectedRect = selected.getBoundingClientRect();
            const maxScrollLeft = Math.max(0, list.scrollWidth - list.clientWidth);
            let nextScrollLeft = list.scrollLeft;
            if (selectedRect.right > listRect.right) nextScrollLeft += selectedRect.right - listRect.right;
            if (selectedRect.left < listRect.left) nextScrollLeft -= listRect.left - selectedRect.left;
            list.scrollLeft = Math.max(0, Math.min(maxScrollLeft, nextScrollLeft));
        });
    };
    requestAnimationFrame(syncWriteHeadtextRail);
    window.setTimeout(syncWriteHeadtextRail, 0);
    window.setTimeout(syncWriteHeadtextRail, 160);
    window.setTimeout(syncWriteHeadtextRail, 400);
    document.addEventListener('DOMContentLoaded', syncWriteHeadtextRail, { once: true, passive: true });
    window.addEventListener('load', syncWriteHeadtextRail, { once: true, passive: true });
    const writeRailObserver = new MutationObserver((mutations) => {
        if (mutations.some((mutation) => (
            (mutation.type === 'attributes' && mutation.target instanceof Element && mutation.target.closest('.subject_list'))
            || Array.from(mutation.addedNodes).some((node) => (
                node instanceof Element && (node.matches('.subject_list,.write_subject') || node.querySelector('.subject_list'))
            ))
        ))) syncWriteHeadtextRail();
    });
    const observeWriteRail = () => {
        const observerRoot = document.documentElement;
        if (observerRoot) writeRailObserver.observe(observerRoot, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
    };
    if (document.documentElement) observeWriteRail();
    else document.addEventListener('DOMContentLoaded', observeWriteRail, { once: true, passive: true });

    let frame = 0;
    const schedule = () => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
            frame = 0;
            enforceOwnership();
        });
    };

    const observerRoot = document.head || document.documentElement;
    if (observerRoot) {
        const observer = new MutationObserver((mutations) => {
            if (mutations.some((mutation) => Array.from(mutation.addedNodes).some((node) => node instanceof HTMLStyleElement))) schedule();
        });
        observer.observe(observerRoot, { childList:true, subtree:true });
        root.__dcufFinalSurfaceOwnerObserver = observer;
    }
    window.addEventListener('pageshow', (event) => { if (event.persisted) schedule(); });
})();
