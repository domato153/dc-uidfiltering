// ==UserScript==
// @name         DCUF UI Multi-state Selector Audit
// @namespace    http://tampermonkey.net/
// @version      0.2.0
// @description  Multi-state, non-sensitive DOM, cascade, clipping, and hit-test capture for DCUF live UI investigation.
// @author       domato153
// @match        https://gall.dcinside.com/board/*
// @match        https://gall.dcinside.com/mgallery/board/*
// @match        https://gall.dcinside.com/mini/board/*
// @match        https://sign.dcinside.com/login*
// @noframes
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    if (window.top !== window.self || window.__dcufUiSelectorAuditInstalled) return;
    window.__dcufUiSelectorAuditInstalled = true;

    const PANEL_ID = 'dcuf-ui-selector-audit-panel';
    const VERSION = '0.2.0';
    const MAX_ELEMENTS_PER_SELECTOR = 4;
    const MAX_OUTLINE_ELEMENTS = 180;
    const MAX_VISIBLE_POPUPS = 60;
    const MAX_SNAPSHOTS = 16;
    const MAX_CASCADE_RULES = 28;
    const sessionSnapshots = [];

    const HEADER_SELECTORS = [
        'html',
        'body',
        '#top',
        '.dcheader',
        '.dcheader.typea',
        '.dcheader .dchead',
        '.dcheader .dc_logo',
        '.dcheader #search_wrap',
        '.dcheader .top_search',
        '.dcheader .area_links',
        '.dcheader .btn_top_loginout',
        '.gnb_bar',
        '.gnb_bar nav.gnb',
        '.gnb_bar .gnb_list',
        '#visit_history',
        '#visit_history.visit_bookmark',
        '#visit_history > .newvisit_history.vst',
        '.newvisit_history > .vst_title',
        '.newvisit_history > .bookmark_title',
        '.newvisit_history > .btn_open',
        '.newvisit_history > .btn_open > .sp_img.icon_listmore',
        '.newvisit_history > :is(.btn_visit_prev,.bnt_visit_prev)',
        '.newvisit_history > .newvisit_box',
        '.newvisit_history .newvisit_list',
        '.newvisit_history > :is(.btn_visit_next,.bnt_visit_next)',
        '.newvisit_history > :is(.btn_newvisit_more,.bnt_newvisit_more)'
    ];

    const HOST_SURFACE_SELECTORS = [
        '.page_head',
        '.page_head > .fl',
        '.page_head > .fr',
        '.page_head > .fr.gall_issuebox',
        '.list_array_option',
        '.list_array_option .array_tab',
        '.list_array_option .center_box',
        '.list_array_option .center_box > .inner',
        '.list_array_option .center_box > .inner > ul',
        '.list_array_option .btn_subject_more',
        '.list_array_option .btn_subject_more > .icon_subject_more',
        '#subject_morelist',
        '.list_array_option .right_box',
        '#listSizeLayer',
        '.gall_listwrap',
        '.list_wrap',
        'table.gall_list',
        'table.gall_list tr.ub-content .gall_writer',
        'table.gall_list tr.ub-content .gall_writer[user_name]',
        'table.gall_list tr.ub-content .gall_writer[data-nick]',
        '.custom-mobile-list',
        '.custom-post-item',
        '.custom-post-item .post-title',
        '.custom-post-item .author',
        '.custom-post-item .author .gall_writer',
        '.custom-bottom-controls',
        '.custom-bottom-controls > .dcuf-bottom-action-card',
        '.custom-bottom-controls > .dcuf-pagination-card',
        '.custom-bottom-controls > .dcuf-search-card',
        '.bottom_paging_wrap',
        '.bottom_paging_box',
        '.bottom_movebox',
        'form[name="frmSearch"]',
        '#searchTypeLayer',
        '.issue_wrap',
        '#relation_popup',
        '#hot_rank_pop2',
        '#pop_manage_report_list',
        '#user_data_lyr',
        '.user_data'
    ];

    const DCUF_SELECTORS = [
        '.dcuf-header-drawer',
        '.dcuf-header-drawer__toggle',
        '.dcuf-header-drawer__body',
        '.dcuf-header-drawer__body-inner',
        '.dcuf-header-drawer__panel[data-source="issue"]',
        '.dcuf-header-drawer__panel[data-source="top-recom"]',
        '#dcinside-filter-setting',
        '#dcinside-settings-container',
        '#dcinside-threshold-save',
        '#dcinside-filter-close',
        '#dcinside-shortcut-modal-overlay',
        '#dcinside-shortcut-modal',
        '#dcinside-headtext-manager-panel',
        '#dc-block-management-panel-overlay',
        '#dc-block-management-panel',
        '#dc-selection-popup',
        '#dc-backup-popup-overlay',
        '#dc-backup-popup',
        '#dc-personal-block-controls',
        '#dc-personal-block-fab',
        '#dc-personal-block-drawer',
        '#dc-personal-block-size-overlay',
        '#dc-personal-block-size-panel',
        '#dcuf-mobile-convenience-settings',
        '#dcuf-mobile-convenience-settings .dcuf-convenience-head',
        '#dcuf-mobile-convenience-settings .dcuf-convenience-body',
        '#dcuf-mobile-convenience-settings .dcuf-convenience-actions',
        '#dcuf-mobile-convenience-settings button',
        '#dcuf-post-preview',
        '#dcuf-draft-banner'
    ];

    const LOGIN_SELECTORS = [
        '#top.login_wrap',
        '#top.login_wrap > header.dcheader',
        'main#container',
        '.content.login',
        '.content.login article',
        '.con_box.login_page',
        '.con_box.login_page.kap_codewrap',
        '.login_inputbox',
        '.login_inputbox > .inner',
        'form[name="login"][method="post"]',
        'form[name="login"] fieldset',
        'input#id[name="user_id"]',
        'input#pw[name="pw"]',
        'form[name="login"] button[type="submit"]',
        'input#checksaveid[type="checkbox"]',
        'label[for="checksaveid"]',
        '.idip_checkbox',
        'footer.dcfoot'
    ];

    const CASCADE_SELECTORS = [
        '.dcheader.typea',
        '.gnb_bar',
        '#visit_history',
        '.newvisit_history.vst',
        '.newvisit_history > .btn_open',
        '.newvisit_history > .btn_open > .icon_listmore',
        '.list_array_option',
        '.list_array_option .center_box > .inner',
        '.list_array_option .btn_subject_more',
        '#subject_morelist',
        '#listSizeLayer',
        '.custom-post-item .author',
        '.custom-bottom-controls > .dcuf-pagination-card',
        '.dcuf-header-drawer__body',
        '.dcuf-header-drawer__body-inner',
        '#pop_manage_report_list',
        '#user_data_lyr',
        '#dcuf-mobile-convenience-settings'
    ];

    const CASCADE_PROPERTIES = [
        'display', 'visibility', 'opacity', 'position', 'inset', 'left', 'right', 'top', 'bottom',
        'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
        'overflow', 'overflow-x', 'overflow-y', 'z-index', 'isolation',
        'padding', 'margin', 'gap', 'border', 'border-radius',
        'background', 'background-image', 'background-position', 'background-size',
        'box-shadow', 'transform', 'filter', 'backdrop-filter', '-webkit-backdrop-filter',
        'pointer-events', 'clip', 'clip-path'
    ];

    const round = (value) => Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
    const isElement = (value) => Boolean(value && value.nodeType === 1);
    const sanitizeCssValue = (value, limit = 260) => String(value || '')
        .replace(/url\((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*\)/gi, 'url(<redacted>)')
        .slice(0, limit);
    const safeAttribute = (element, name) => {
        const value = element.getAttribute(name);
        return value === null ? null : String(value).slice(0, 180);
    };
    const safeClassName = (element) => {
        if (!isElement(element)) return null;
        return Array.from(element.classList).slice(0, 24).join(' ') || null;
    };
    const actionPath = (element) => {
        const action = safeAttribute(element, 'action');
        if (!action) return null;
        try {
            const url = new URL(action, location.href);
            return `${url.origin}${url.pathname}`;
        } catch (_) {
            return null;
        }
    };

    const elementSignature = (element) => ({
        tag: element.tagName.toLowerCase(),
        id: safeAttribute(element, 'id'),
        className: safeClassName(element),
        role: safeAttribute(element, 'role'),
        name: safeAttribute(element, 'name'),
        type: safeAttribute(element, 'type'),
        method: safeAttribute(element, 'method'),
        actionPath: actionPath(element),
        placeholderPresent: element.hasAttribute('placeholder'),
        checked: element instanceof HTMLInputElement && /^(?:checkbox|radio)$/.test(element.type)
            ? element.checked
            : null,
        disabled: 'disabled' in element ? Boolean(element.disabled) : null,
        hiddenAttribute: element.hasAttribute('hidden'),
        ariaHidden: safeAttribute(element, 'aria-hidden'),
        ariaExpanded: safeAttribute(element, 'aria-expanded')
    });

    const domPath = (element) => {
        if (!isElement(element)) return null;
        const parts = [];
        let current = element;
        while (isElement(current) && parts.length < 9) {
            let part = current.tagName.toLowerCase();
            const id = safeAttribute(current, 'id');
            const classes = Array.from(current.classList).slice(0, 3);
            if (id) part += `#${CSS.escape(id)}`;
            else if (classes.length) part += `.${classes.map((name) => CSS.escape(name)).join('.')}`;
            parts.unshift(part);
            current = current.parentElement;
        }
        return parts.join(' > ');
    };

    const rectSummary = (element) => {
        const rect = element.getBoundingClientRect();
        return {
            x: round(rect.x),
            y: round(rect.y),
            width: round(rect.width),
            height: round(rect.height),
            right: round(rect.right),
            bottom: round(rect.bottom)
        };
    };

    const styleSummary = (style) => ({
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        position: style.position,
        zIndex: style.zIndex,
        isolation: style.isolation,
        overflow: style.overflow,
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        boxSizing: style.boxSizing,
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage === 'none' ? 'none' : sanitizeCssValue(style.backgroundImage),
        color: style.color,
        border: style.border,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow === 'none' ? 'none' : sanitizeCssValue(style.boxShadow),
        backdropFilter: sanitizeCssValue(style.backdropFilter || style.webkitBackdropFilter || 'none'),
        filter: sanitizeCssValue(style.filter),
        transform: sanitizeCssValue(style.transform),
        pointerEvents: style.pointerEvents,
        clip: style.clip,
        clipPath: style.clipPath,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        padding: style.padding,
        margin: style.margin,
        gap: style.gap
    });

    const pseudoSummary = (element, pseudo) => {
        const style = getComputedStyle(element, pseudo);
        const content = style.content;
        return {
            contentPresent: Boolean(content && content !== 'none' && content !== 'normal' && content !== '""'),
            display: style.display,
            visibility: style.visibility,
            position: style.position,
            width: style.width,
            height: style.height,
            overflow: style.overflow,
            backgroundImage: style.backgroundImage === 'none' ? 'none' : sanitizeCssValue(style.backgroundImage),
            backgroundPosition: style.backgroundPosition,
            transform: sanitizeCssValue(style.transform),
            pointerEvents: style.pointerEvents
        };
    };

    const stackAncestors = (element) => {
        const results = [];
        let current = element;
        while (isElement(current) && results.length < 14) {
            const style = getComputedStyle(current);
            results.push({
                path: domPath(current),
                rect: rectSummary(current),
                position: style.position,
                zIndex: style.zIndex,
                isolation: style.isolation,
                overflow: style.overflow,
                overflowX: style.overflowX,
                overflowY: style.overflowY,
                opacity: style.opacity,
                transform: sanitizeCssValue(style.transform),
                filter: sanitizeCssValue(style.filter),
                backdropFilter: sanitizeCssValue(style.backdropFilter || style.webkitBackdropFilter || 'none'),
                clip: style.clip,
                clipPath: style.clipPath,
                contain: style.contain,
                pointerEvents: style.pointerEvents
            });
            current = current.parentElement;
        }
        return results;
    };

    const hitTests = (element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return [];
        const insetX = Math.min(4, Math.max(1, rect.width / 4));
        const insetY = Math.min(4, Math.max(1, rect.height / 4));
        const points = [
            ['center', rect.left + rect.width / 2, rect.top + rect.height / 2],
            ['topLeft', rect.left + insetX, rect.top + insetY],
            ['topRight', rect.right - insetX, rect.top + insetY],
            ['bottomLeft', rect.left + insetX, rect.bottom - insetY],
            ['bottomRight', rect.right - insetX, rect.bottom - insetY]
        ];
        return points.map(([name, rawX, rawY]) => {
            const x = Math.max(0, Math.min(window.innerWidth - 1, rawX));
            const y = Math.max(0, Math.min(window.innerHeight - 1, rawY));
            const hit = document.elementFromPoint(x, y);
            return {
                name,
                x: round(x),
                y: round(y),
                inViewport: rawX >= 0 && rawX < window.innerWidth && rawY >= 0 && rawY < window.innerHeight,
                hitPath: domPath(hit),
                targetOrDescendant: Boolean(hit && (hit === element || element.contains(hit)))
            };
        });
    };

    const inspectElement = (element) => ({
        signature: elementSignature(element),
        path: domPath(element),
        rect: rectSummary(element),
        style: styleSummary(getComputedStyle(element)),
        before: pseudoSummary(element, '::before'),
        after: pseudoSummary(element, '::after'),
        hitTests: hitTests(element),
        stackAncestors: stackAncestors(element)
    });

    const inspectSelector = (selector) => {
        let elements;
        try {
            elements = Array.from(document.querySelectorAll(selector));
        } catch (error) {
            return { selector, error: String(error?.message || error) };
        }
        return {
            selector,
            count: elements.length,
            positiveAreaCount: elements.filter((element) => {
                const rect = element.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            }).length,
            elements: elements.slice(0, MAX_ELEMENTS_PER_SELECTOR).map(inspectElement)
        };
    };

    const collectOutline = () => {
        const root = document.querySelector('main, #container, #top') || document.body;
        if (!isElement(root)) return [];
        const candidates = root.querySelectorAll([
            'header', 'nav', 'main', 'article', 'section', 'footer', 'form', 'fieldset',
            'button', 'input', 'select', '[role="dialog"]', '[id]'
        ].join(','));
        return Array.from(candidates)
            .filter((element) => !element.closest(`#${PANEL_ID}`))
            .slice(0, MAX_OUTLINE_ELEMENTS)
            .map((element) => ({
                signature: elementSignature(element),
                path: domPath(element),
                rect: rectSummary(element)
            }));
    };

    const isRendered = (element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return style.display !== 'none'
            && style.visibility !== 'hidden'
            && Number(style.opacity) > 0
            && rect.width > 0
            && rect.height > 0;
    };

    const collectVisiblePopups = () => {
        const selectors = [
            '[role="dialog"]', '.pop_wrap', '.subject_morelist', '#listSizeLayer',
            '[id*="popup" i]', '[id*="pop_" i]', '[id*="_lyr" i]', '[id*="layer" i]',
            '[class*="popup" i]', '[class*="modal" i]'
        ];
        const unique = new Set();
        const candidates = [];
        for (const selector of selectors) {
            try {
                document.querySelectorAll(selector).forEach((element) => {
                    if (unique.has(element) || element.closest(`#${PANEL_ID}`)) return;
                    unique.add(element);
                    candidates.push(element);
                });
            } catch (_) {
                // Older selector engines may not support case-insensitive attribute flags.
            }
        }
        return candidates
            .filter(isRendered)
            .filter((element) => {
                const style = getComputedStyle(element);
                const zIndex = Number.parseInt(style.zIndex, 10) || 0;
                return /^(?:fixed|absolute)$/.test(style.position) || zIndex >= 10 || element.matches('[role="dialog"],.pop_wrap');
            })
            .slice(0, MAX_VISIBLE_POPUPS)
            .map(inspectElement);
    };

    const stylesheetOwner = (sheet, index) => {
        const owner = sheet.ownerNode;
        let hrefPath = null;
        if (sheet.href) {
            try {
                hrefPath = new URL(sheet.href, location.href).pathname;
            } catch (_) {
                hrefPath = null;
            }
        }
        return {
            index,
            hrefPath,
            ownerTag: owner?.tagName?.toLowerCase() || null,
            ownerId: owner?.id || null,
            ownerClass: safeClassName(owner)
        };
    };

    const flattenCssRules = () => {
        const flattened = [];
        const inaccessible = [];
        const walk = (rules, sheet, sheetIndex, context = []) => {
            for (let index = 0; index < rules.length; index += 1) {
                const rule = rules[index];
                const nextContext = rule.conditionText
                    ? [...context, String(rule.conditionText).slice(0, 200)]
                    : context;
                if (rule.selectorText && rule.style) {
                    flattened.push({
                        sheet: stylesheetOwner(sheet, sheetIndex),
                        ruleIndex: index,
                        context: nextContext,
                        selectorText: String(rule.selectorText).slice(0, 1200),
                        style: rule.style
                    });
                }
                if (rule.cssRules) {
                    try {
                        walk(rule.cssRules, sheet, sheetIndex, nextContext);
                    } catch (_) {
                        // Keep the accessible outer rule.
                    }
                }
            }
        };
        Array.from(document.styleSheets).forEach((sheet, sheetIndex) => {
            try {
                walk(sheet.cssRules, sheet, sheetIndex);
            } catch (error) {
                inaccessible.push({
                    sheet: stylesheetOwner(sheet, sheetIndex),
                    reason: error?.name || 'unavailable'
                });
            }
        });
        return { flattened, inaccessible };
    };

    const selectorMatchesElement = (element, selectorText) => {
        try {
            if (element.matches(selectorText)) return true;
        } catch (_) {
            // Retry pseudo-element rules against their originating element.
        }
        if (!/::(?:before|after)/.test(selectorText)) return false;
        try {
            return element.matches(selectorText.replace(/::(?:before|after)/g, ''));
        } catch (_) {
            return false;
        }
    };

    const declarationsForRule = (style) => {
        const declarations = [];
        for (const property of CASCADE_PROPERTIES) {
            const value = style.getPropertyValue(property);
            if (!value) continue;
            declarations.push({
                property,
                value: sanitizeCssValue(value),
                important: style.getPropertyPriority(property) === 'important'
            });
        }
        return declarations;
    };

    const collectCascade = () => {
        const { flattened, inaccessible } = flattenCssRules();
        return {
            inaccessible,
            targets: CASCADE_SELECTORS.map((selector) => {
                const element = document.querySelector(selector);
                if (!element) return { selector, missing: true };
                const matches = flattened
                    .filter((rule) => selectorMatchesElement(element, rule.selectorText))
                    .map((rule) => ({
                        sheet: rule.sheet,
                        ruleIndex: rule.ruleIndex,
                        context: rule.context,
                        selectorText: rule.selectorText,
                        declarations: declarationsForRule(rule.style)
                    }))
                    .filter((rule) => rule.declarations.length)
                    .slice(-MAX_CASCADE_RULES);
                return {
                    selector,
                    path: domPath(element),
                    matchedRuleCount: matches.length,
                    rules: matches
                };
            })
        };
    };

    const detectPage = () => {
        if (location.hostname === 'sign.dcinside.com') return 'login';
        const route = (location.pathname.match(/\/board\/(lists|view|write|modify|delete)(?:\/|$)/) || [])[1];
        const galleryKind = location.pathname.includes('/mgallery/')
            ? 'minor'
            : location.pathname.includes('/mini/')
                ? 'mini'
                : 'major';
        return route ? `${galleryKind}-${route}` : `${galleryKind}-other`;
    };

    const detectState = () => {
        const open = [
            ['subject-headtext-open', '#subject_morelist'],
            ['list-size-open', '#listSizeLayer'],
            ['gallery-management-open', '#pop_manage_report_list'],
            ['native-author-open', '#user_data_lyr'],
            ['convenience-settings-open', '#dcuf-mobile-convenience-settings'],
            ['gallery-drawer-open', '.dcuf-header-drawer[data-open="1"]'],
            ['shortcut-dialog-open', '#dcinside-shortcut-modal']
        ];
        return open
            .filter(([, selector]) => {
                const element = document.querySelector(selector);
                return element && isRendered(element);
            })
            .map(([label]) => label);
    };

    const collectReport = () => {
        const pageType = detectPage();
        const selectors = pageType === 'login'
            ? LOGIN_SELECTORS
            : [...HEADER_SELECTORS, ...HOST_SURFACE_SELECTORS, ...DCUF_SELECTORS];
        const rootStyle = getComputedStyle(document.documentElement);
        const bodyStyle = document.body ? getComputedStyle(document.body) : null;
        return {
            audit: 'dcuf-ui-multistate-selector-audit',
            version: VERSION,
            capturedAt: new Date().toISOString(),
            state: detectState(),
            page: {
                type: pageType,
                origin: location.origin,
                pathname: location.pathname,
                viewport: {
                    innerWidth: window.innerWidth,
                    innerHeight: window.innerHeight,
                    scrollX: round(window.scrollX),
                    scrollY: round(window.scrollY),
                    devicePixelRatio: window.devicePixelRatio,
                    visualViewportWidth: round(window.visualViewport?.width),
                    visualViewportHeight: round(window.visualViewport?.height),
                    visualViewportOffsetTop: round(window.visualViewport?.offsetTop),
                    visualViewportOffsetLeft: round(window.visualViewport?.offsetLeft),
                    visualViewportScale: round(window.visualViewport?.scale)
                },
                colorScheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
                reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
                htmlClass: safeClassName(document.documentElement),
                bodyClass: document.body ? safeClassName(document.body) : null,
                dcuf: {
                    pageContext: safeAttribute(document.documentElement, 'data-dcuf-page-context'),
                    bootState: safeAttribute(document.documentElement, 'data-dcuf-boot-state'),
                    palette: safeAttribute(document.documentElement, 'data-dcuf-palette'),
                    phase1: safeAttribute(document.documentElement, 'data-dcuf-phase1'),
                    rootBackground: rootStyle.backgroundColor,
                    bodyBackground: bodyStyle?.backgroundColor || null
                }
            },
            privacy: {
                inputValuesCollected: false,
                textContentCollected: false,
                fullUrlOrQueryCollected: false,
                cookiesOrStorageCollected: false,
                nicknameAttributeValuesCollected: false
            },
            selectors: selectors.map(inspectSelector),
            visiblePopups: collectVisiblePopups(),
            cascade: collectCascade(),
            structuralOutline: collectOutline()
        };
    };

    const sessionReport = () => ({
        audit: 'dcuf-ui-multistate-session',
        version: VERSION,
        exportedAt: new Date().toISOString(),
        snapshotCount: sessionSnapshots.length,
        privacy: {
            inputValuesCollected: false,
            textContentCollected: false,
            fullUrlOrQueryCollected: false,
            cookiesOrStorageCollected: false,
            nicknameAttributeValuesCollected: false
        },
        snapshots: sessionSnapshots
    });

    const downloadReport = (report) => {
        const json = `${JSON.stringify(report, null, 2)}\n`;
        const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        anchor.href = url;
        anchor.download = `dcuf-ui-audit-session-${stamp}.json`;
        anchor.style.display = 'none';
        document.documentElement.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        return json;
    };

    const copyReport = async (json) => {
        try {
            await navigator.clipboard.writeText(json);
            return true;
        } catch (_) {
            const textarea = document.createElement('textarea');
            textarea.value = json;
            textarea.setAttribute('readonly', '');
            textarea.style.cssText = 'position:fixed;left:-9999px;top:0;';
            document.documentElement.appendChild(textarea);
            textarea.select();
            const copied = document.execCommand('copy');
            textarea.remove();
            return copied;
        }
    };

    const captureState = () => {
        if (sessionSnapshots.length >= MAX_SNAPSHOTS) {
            throw new Error(`상태는 최대 ${MAX_SNAPSHOTS}개까지 저장할 수 있습니다.`);
        }
        const report = collectReport();
        report.sequence = sessionSnapshots.length + 1;
        sessionSnapshots.push(report);
        window.dispatchEvent(new CustomEvent('dcuf-ui-audit-captured', {
            detail: { count: sessionSnapshots.length, state: report.state.slice() }
        }));
        return report;
    };

    const exportSession = async () => {
        if (!sessionSnapshots.length) captureState();
        const json = downloadReport(sessionReport());
        const copied = await copyReport(json);
        return { copied, count: sessionSnapshots.length };
    };

    const resetSession = () => {
        sessionSnapshots.length = 0;
        window.dispatchEvent(new CustomEvent('dcuf-ui-audit-reset'));
    };

    const mountPanel = () => {
        if (document.getElementById(PANEL_ID)) return;
        const host = document.createElement('div');
        host.id = PANEL_ID;
        host.style.cssText = 'all:initial;position:fixed;right:12px;bottom:12px;z-index:2147483647;display:block;';
        const shadow = host.attachShadow({ mode: 'open' });
        shadow.innerHTML = `
            <style>
                :host { all:initial; }
                * { box-sizing:border-box; }
                .panel { width:306px;padding:13px;border:1px solid #aebbd0;border-radius:14px;background:#fbfcff;color:#1f2a3a;box-shadow:0 14px 38px rgba(20,34,58,.25);font:13px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif; }
                .head { display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px; }
                .title { font-size:15px;font-weight:800; }
                .close { width:28px;height:28px;border:0;border-radius:8px;background:#edf1f7;color:#4a596e;cursor:pointer;font-size:17px; }
                .desc { margin:0 0 9px;color:#59687c;word-break:keep-all; }
                .status { min-height:42px;margin:0 0 9px;padding:8px;border-radius:9px;background:#f0f3f8;color:#46566d;word-break:keep-all; }
                .status[data-tone="success"] { background:#e7f6ed;color:#17663a; }
                .status[data-tone="warning"] { background:#fff3d5;color:#78520d; }
                .capture { width:100%;height:40px;border:1px solid #344f9a;border-radius:10px;background:linear-gradient(180deg,#4d6dcc,#3555b3);color:#fff;font-weight:800;cursor:pointer; }
                .row { display:grid;grid-template-columns:1fr 82px;gap:8px;margin-top:8px; }
                .export,.reset { height:36px;border:1px solid #bbc5d4;border-radius:9px;background:#fff;color:#2d3b50;font-weight:700;cursor:pointer; }
                .export { border-color:#5f789f;background:#edf4ff; }
                button:disabled { cursor:wait;opacity:.65; }
                .hint { margin:8px 0 0;color:#788598;font-size:11px;word-break:keep-all; }
            </style>
            <section class="panel" role="dialog" aria-label="DCUF UI 다중 상태 조사">
                <div class="head"><span class="title">DCUF UI 조사 v${VERSION}</span><button class="close" type="button" aria-label="닫기">×</button></div>
                <p class="desc">기본 화면과 문제 팝업을 하나씩 연 상태를 차례로 저장하세요.</p>
                <div class="status" data-tone="idle">저장된 상태 0개 · 기본 화면부터 누르세요.</div>
                <button class="capture" type="button">현재 상태 저장</button>
                <div class="row">
                    <button class="export" type="button">한번에 내보내기</button>
                    <button class="reset" type="button">초기화</button>
                </div>
                <p class="hint">Alt+Shift+A로도 저장 · 입력값/글/닉네임/쿠키/저장소는 수집하지 않음</p>
            </section>
        `;
        const status = shadow.querySelector('.status');
        const capture = shadow.querySelector('.capture');
        const exportButton = shadow.querySelector('.export');
        const reset = shadow.querySelector('.reset');
        const close = shadow.querySelector('.close');

        const setStatus = (message, tone = 'idle') => {
            status.textContent = message;
            status.dataset.tone = tone;
        };
        const describeCapture = (report) => {
            const suffix = report.state.length ? ` · ${report.state.join(', ')}` : ' · 기본/닫힘 상태';
            setStatus(`저장 ${sessionSnapshots.length}개${suffix}`, 'success');
        };
        const runCapture = () => {
            capture.disabled = true;
            setStatus('구조·겹침·CSS 조사 중…');
            try {
                describeCapture(captureState());
            } catch (error) {
                setStatus(`실패: ${error?.message || '알 수 없는 오류'}`, 'warning');
            } finally {
                capture.disabled = false;
            }
        };

        capture.addEventListener('click', runCapture);
        exportButton.addEventListener('click', async () => {
            exportButton.disabled = true;
            setStatus('JSON 묶음 생성 중…');
            try {
                const result = await exportSession();
                setStatus(
                    result.copied
                        ? `완료: ${result.count}개 상태 저장 + 클립보드 복사`
                        : `완료: ${result.count}개 상태 파일 저장`,
                    result.copied ? 'success' : 'warning'
                );
            } catch (error) {
                setStatus(`실패: ${error?.message || '알 수 없는 오류'}`, 'warning');
            } finally {
                exportButton.disabled = false;
            }
        });
        reset.addEventListener('click', () => {
            resetSession();
            setStatus('저장된 상태 0개 · 기본 화면부터 누르세요.');
        });
        close.addEventListener('click', () => host.remove());
        window.addEventListener('keydown', (event) => {
            if (event.altKey && event.shiftKey && event.code === 'KeyA') {
                event.preventDefault();
                runCapture();
            }
        });
        (document.documentElement || document).appendChild(host);
    };

    window.DCUFUISelectorAudit = Object.freeze({
        version: VERSION,
        collect: collectReport,
        capture: captureState,
        export: exportSession,
        reset: resetSession,
        count: () => sessionSnapshots.length
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountPanel, { once: true });
    } else {
        mountPanel();
    }
})();
