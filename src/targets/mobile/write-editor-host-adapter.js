    const __dcufWriteEditorHostAdapter = (() => {
        const SURFACE_ID = 'write-editor-host';
        const FORM_MARKER = 'data-dcuf-write-editor-host';
        const LEGACY_BOUND_MARKER = 'data-dcuf-editor-layers-bound';
        const EXTERNAL_LAYER_MARKER = 'data-dcuf-write-external-layer';
        const VIEWPORT_BOUND_MARKER = 'data-dcuf-write-viewport-bound';
        const HEADTEXT_BOUND_MARKER = 'data-dcuf-write-headtext-host';
        const POSITIONING_CLASS = 'dcuf-editor-layer-positioning';
        const POSITIONED_CLASS = 'dcuf-editor-layer-positioned';
        const DRAGGING_CLASS = 'dcuf-editor-toolbar-dragging';
        const DRAGGING_ATTRIBUTE = 'data-dcuf-native-form-toolbar-state';
        const LAYER_KIND_ATTRIBUTE = 'data-dcuf-native-form-layer-kind';
        const LAYER_ANCHOR_ATTRIBUTE = 'data-dcuf-native-form-layer-anchor';
        const LAYER_STATE_ATTRIBUTE = 'data-dcuf-native-form-layer-state';
        const POSITION_PROPERTIES = Object.freeze([
            '--dcuf-editor-layer-left',
            '--dcuf-editor-layer-top',
            '--dcuf-editor-layer-max-width',
            '--dcuf-editor-layer-max-height',
        ]);
        const transaction = new Map();
        const rafIds = new Set();
        const timerIds = new Set();
        let activeForm = null;
        let activeScope = null;
        let headtextScope = null;
        let activeCoordinator = null;
        const activeFontMenus = new Map();
        let listenerCount = 0;
        let mutationSubscriberCount = 0;
        let editorToolbarDrag = null;
        let draggedEditorToolbar = false;
        let activeHeadtextList = null;
        let headtextDrag = null;
        let draggedHeadtext = false;

        const deepFreeze = (value) => {
            if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
            Object.values(value).forEach(deepFreeze);
            return Object.freeze(value);
        };

        const recordFor = (element) => {
            let record = transaction.get(element);
            if (!record) {
                record = { attributes: new Map(), classes: new Map(), styles: new Map(), textRecorded: false, textContent: '' };
                transaction.set(element, record);
            }
            return record;
        };

        const rememberAttribute = (element, name) => {
            if (!(element instanceof Element)) return false;
            const record = recordFor(element);
            if (!record.attributes.has(name)) record.attributes.set(name, element.getAttribute(name));
            return true;
        };

        const setAttribute = (element, name, value) => {
            if (!rememberAttribute(element, name)) return;
            if (value === null || value === undefined || value === '') element.removeAttribute(name);
            else element.setAttribute(name, String(value));
        };

        const toggleClass = (element, className, enabled) => {
            if (!(element instanceof Element)) return;
            const record = recordFor(element);
            if (!record.classes.has(className)) record.classes.set(className, element.classList.contains(className));
            element.classList.toggle(className, Boolean(enabled));
        };

        const setStyleProperty = (element, name, value) => {
            if (!(element instanceof HTMLElement)) return;
            const record = recordFor(element);
            if (!record.styles.has(name)) {
                record.styles.set(name, {
                    value: element.style.getPropertyValue(name),
                    priority: element.style.getPropertyPriority(name),
                });
            }
            if (value === null || value === undefined || value === '') element.style.removeProperty(name);
            else element.style.setProperty(name, String(value));
        };

        const setTextContent = (element, value) => {
            if (!(element instanceof HTMLElement)) return;
            const record = recordFor(element);
            if (!record.textRecorded) {
                record.textRecorded = true;
                record.textContent = element.textContent;
            }
            element.textContent = String(value);
        };

        const restoreWhere = (predicate) => {
            Array.from(transaction.entries()).reverse().forEach(([element, record]) => {
                if (!predicate(element)) return;
                if (!(element instanceof Element)) return;
                record.attributes.forEach((value, name) => {
                    if (value === null) element.removeAttribute(name);
                    else element.setAttribute(name, value);
                });
                record.classes.forEach((wasPresent, className) => element.classList.toggle(className, wasPresent));
                if (element instanceof HTMLElement) {
                    record.styles.forEach(({ value, priority }, name) => {
                        if (!value) element.style.removeProperty(name);
                        else element.style.setProperty(name, value, priority);
                    });
                    if (record.textRecorded) element.textContent = record.textContent;
                }
                transaction.delete(element);
            });
        };

        const restoreAll = () => restoreWhere(() => true);

        const listen = (target, type, listener, options, scope = activeScope) => {
            if (!scope || !target?.addEventListener) return;
            target.addEventListener(type, listener, options);
            listenerCount += 1;
            scope.own(() => {
                target.removeEventListener(type, listener, options);
                listenerCount = Math.max(0, listenerCount - 1);
            });
        };

        const scrubStaleToolbarStates = (root = activeForm) => {
            if (!(root instanceof Element)) return;
            const candidates = [
                ...(root.matches?.(`[${DRAGGING_ATTRIBUTE}]`) ? [root] : []),
                ...root.querySelectorAll(`[${DRAGGING_ATTRIBUTE}]`),
            ];
            candidates.forEach((toolbar) => {
                if (toolbar !== editorToolbarDrag?.toolbar) toolbar.removeAttribute(DRAGGING_ATTRIBUTE);
            });
        };

        const scheduleAnimationFrame = (callback) => {
            const id = window.requestAnimationFrame(() => {
                rafIds.delete(id);
                callback();
            });
            rafIds.add(id);
            return id;
        };

        const scheduleTimeout = (callback, delay = 0) => {
            const id = window.setTimeout(() => {
                timerIds.delete(id);
                callback();
            }, delay);
            timerIds.add(id);
            return id;
        };

        const cancelScheduledWork = () => {
            rafIds.forEach((id) => window.cancelAnimationFrame(id));
            rafIds.clear();
            timerIds.forEach((id) => window.clearTimeout(id));
            timerIds.clear();
        };

        const editorDropdownSelector = [
            '.note-toolbar .note-dropdown-menu',
            '.note-toolbar .dropdown-fontname',
            '.note-toolbar .dropdown-fontsize',
            '.note-toolbar .note-color .note-dropdown-menu',
            '.note-toolbar .note-table',
            '.note-toolbar .note-height .dropdown-line-height',
            '.note-toolbar .note-para .note-dropdown-menu',
        ].join(', ');
        const editorLayerSelector = `${editorDropdownSelector}, .note-toolbar .pop_wrap`;

        const getExternalDcconLayer = () => {
            if (!(activeForm instanceof HTMLFormElement)) return null;
            const layer = document.querySelector('#div_con');
            if (!(layer instanceof HTMLElement) || activeForm.contains(layer)) return null;
            return layer;
        };

        const getEditorLayerKind = (layer) => {
            if (!(layer instanceof HTMLElement)) return '';
            if (layer.id === 'div_con') return 'external-dccon';
            if (layer.matches('.note-dropdown-menu, .dropdown-fontname, .dropdown-fontsize, .note-table, .dropdown-line-height')) return 'dropdown';
            if (layer.matches('.pop_wrap')) return 'popup';
            return 'layer';
        };

        const getEditorLayerAnchorKind = (layer) => {
            if (!(layer instanceof HTMLElement)) return '';
            if (layer.id === 'div_con') return 'dccon';
            if (layer.closest('.note-fontname')) return 'fontname';
            if (layer.closest('.note-fontsize')) return 'fontsize';
            if (layer.closest('.note-color')) return 'color';
            if (layer.closest('.note-height')) return 'line-height';
            if (layer.closest('.note-para')) return 'paragraph';
            if (layer.matches('.note-table') || layer.closest('.note-table')) return 'table';
            const command = layer.closest('.note-btn-group')?.querySelector('[data-command]')?.getAttribute('data-command');
            return command || 'generic';
        };

        const markEditorLayer = (layer) => {
            if (!(layer instanceof HTMLElement)) return null;
            if (!transaction.has(layer)) {
                layer.removeAttribute(EXTERNAL_LAYER_MARKER);
                layer.removeAttribute(LAYER_KIND_ATTRIBUTE);
                layer.removeAttribute(LAYER_ANCHOR_ATTRIBUTE);
                layer.removeAttribute(LAYER_STATE_ATTRIBUTE);
                layer.classList.remove(POSITIONING_CLASS, POSITIONED_CLASS);
            }
            const kind = getEditorLayerKind(layer);
            setAttribute(layer, EXTERNAL_LAYER_MARKER, kind === 'external-dccon' ? '1' : null);
            setAttribute(layer, LAYER_KIND_ATTRIBUTE, kind);
            setAttribute(layer, LAYER_ANCHOR_ATTRIBUTE, getEditorLayerAnchorKind(layer));
            setAttribute(layer, LAYER_STATE_ATTRIBUTE, layer.classList.contains(POSITIONED_CLASS)
                ? 'positioned'
                : layer.classList.contains(POSITIONING_CLASS) ? 'positioning' : 'idle');
            return layer;
        };

        const setEditorLayerState = (layer, state) => {
            if (!(layer instanceof HTMLElement)) return;
            toggleClass(layer, POSITIONING_CLASS, state === 'positioning');
            toggleClass(layer, POSITIONED_CLASS, state === 'positioned');
            setAttribute(layer, LAYER_STATE_ATTRIBUTE, state);
        };

        const getEditorLayers = () => {
            if (!(activeForm instanceof HTMLFormElement)) return [];
            const layers = Array.from(activeForm.querySelectorAll(editorLayerSelector));
            const externalDccon = getExternalDcconLayer();
            if (externalDccon) layers.push(externalDccon);
            return [...new Set(layers)].map(markEditorLayer).filter(Boolean);
        };

        const getEditorLayerAnchor = (layer) => {
            if (!(activeForm instanceof HTMLFormElement) || !(layer instanceof HTMLElement)) return null;
            const nested = layer.closest('.note-btn-group');
            if (nested instanceof HTMLElement) return nested;
            if (layer.id !== 'div_con') return null;
            return activeForm.querySelector('button[aria-label="디시콘"],[data-command="dccon"],button[onclick*="dccon" i],.note-mybutton > button')?.closest('.note-btn-group') || null;
        };

        const positionEditorLayers = ({ includeDropdowns = true } = {}) => {
            if (!(activeForm instanceof HTMLFormElement)) return false;
            getEditorLayers().forEach((layer) => {
                if (!(layer instanceof HTMLElement) || getComputedStyle(layer).display === 'none') return;
                const isDropdown = layer.matches('.note-dropdown-menu');
                if (isDropdown && !includeDropdowns) return;
                const anchor = getEditorLayerAnchor(layer);
                if (!(anchor instanceof HTMLElement)) return;
                setEditorLayerState(layer, 'positioning');
                const anchorRect = anchor.getBoundingClientRect();
                const layerRect = layer.getBoundingClientRect();
                const measuredLocalScale = isDropdown && anchor.offsetWidth > 0
                    ? anchorRect.width / anchor.offsetWidth
                    : 1;
                const localCoordinateScale = Number.isFinite(measuredLocalScale) && measuredLocalScale > 0
                    ? measuredLocalScale
                    : 1;
                const visualViewport = window.visualViewport;
                const visualScale = visualViewport?.scale || 1;
                const scaledVisualWidth = (visualViewport?.width || window.innerWidth) * visualScale;
                const containerRect = activeForm.closest('#container')?.getBoundingClientRect();
                const rectUsesScaledVisualCoordinates = document.body.classList.contains('dcuf-write-desktop-site-mobile')
                    && containerRect instanceof DOMRect
                    && containerRect.width <= scaledVisualWidth + 2;
                const viewportCoordinateScale = rectUsesScaledVisualCoordinates ? visualScale : 1;
                const viewportLeft = (visualViewport?.offsetLeft || 0) * viewportCoordinateScale;
                const viewportTop = (visualViewport?.offsetTop || 0) * viewportCoordinateScale;
                const viewportWidth = (visualViewport?.width || window.innerWidth) * viewportCoordinateScale;
                const viewportHeight = (visualViewport?.height || window.innerHeight) * viewportCoordinateScale;
                const viewportRight = viewportLeft + viewportWidth;
                const viewportBottom = viewportTop + viewportHeight;
                const edgePadding = 10;
                const layerGap = 6;
                const maxWidth = Math.max(1, viewportWidth - (edgePadding * 2));
                const maxHeight = Math.max(1, viewportHeight - (edgePadding * 2));
                const width = isDropdown ? Math.min(layerRect.width, maxWidth) : layerRect.width;
                const height = isDropdown ? Math.min(layerRect.height, maxHeight) : layerRect.height;
                const left = Math.max(
                    viewportLeft + edgePadding,
                    Math.min(viewportRight - width - edgePadding, anchorRect.left),
                );
                const below = Math.max(0, viewportBottom - anchorRect.bottom - edgePadding - layerGap);
                const above = Math.max(0, anchorRect.top - viewportTop - edgePadding - layerGap);
                const openAbove = height > below && above > below;
                const preferredTop = openAbove
                    ? anchorRect.top - height - layerGap
                    : anchorRect.bottom + layerGap;
                const top = Math.max(
                    viewportTop + edgePadding,
                    Math.min(viewportBottom - height - edgePadding, preferredTop),
                );
                const positionedLeft = isDropdown ? left / localCoordinateScale : left;
                const positionedTop = isDropdown ? top / localCoordinateScale : top;
                const localMaxWidth = isDropdown ? maxWidth / localCoordinateScale : maxWidth;
                const localMaxHeight = isDropdown ? maxHeight / localCoordinateScale : maxHeight;
                setStyleProperty(layer, POSITION_PROPERTIES[0], `${positionedLeft.toFixed(3)}px`);
                setStyleProperty(layer, POSITION_PROPERTIES[1], `${positionedTop.toFixed(3)}px`);
                setStyleProperty(layer, POSITION_PROPERTIES[2], `${Math.floor(localMaxWidth)}px`);
                setStyleProperty(layer, POSITION_PROPERTIES[3], `${Math.floor(localMaxHeight)}px`);
                setEditorLayerState(layer, 'positioned');
            });
            return true;
        };

        const scheduleEditorLayerPosition = () => {
            scheduleAnimationFrame(() => {
                positionEditorLayers();
                scheduleAnimationFrame(() => positionEditorLayers());
            });
        };

        const scheduleEditorPopupPosition = () => scheduleEditorLayerPosition();

        const restoreFontMenu = (menu, record) => {
            __dcufWriteFontPresenter.dispose(menu);
            if (record?.group instanceof HTMLElement) {
                restoreWhere((element) => element === record.group || record.group.contains(element));
            } else if (menu instanceof HTMLElement) {
                restoreWhere((element) => element === menu || menu.contains(element));
            }
            activeFontMenus.delete(menu);
        };

        const applyFontSelection = (record, fontName) => {
            if (!record || !fontName || !(activeForm instanceof HTMLFormElement)) return false;
            const memo = activeForm.querySelector('textarea#memo');
            const jq = window.jQuery;
            if (memo instanceof HTMLTextAreaElement && typeof jq === 'function' && typeof jq(memo).summernote === 'function') {
                jq(memo).summernote('fontName', fontName);
            } else {
                document.execCommand('fontName', false, fontName);
            }
            __dcufWriteFontPresenter.updateSelection(record.root, fontName);
            if (record.label instanceof HTMLElement) {
                setTextContent(record.label, fontName);
                setStyleProperty(record.label, 'font-family', fontName);
            }
            record.group.querySelectorAll('.note-btn-group.open').forEach((group) => toggleClass(group, 'open', false));
            toggleClass(record.button, 'active', false);
            setStyleProperty(record.menu, 'display', 'none');
            return true;
        };

        const bindFontMenus = () => {
            if (!(activeForm instanceof HTMLFormElement) || !(document.body instanceof HTMLBodyElement)) return;
            const isMobileScreen = (Number(window.screen?.width) || window.innerWidth || 0) <= 600;
            toggleClass(document.body, 'dcuf-write-mobile-font-menu', isMobileScreen);
            const currentMenus = new Set();
            if (isMobileScreen) {
                activeForm.querySelectorAll('.note-toolbar .note-fontname').forEach((group) => {
                    if (!(group instanceof HTMLElement)) return;
                    const button = group.querySelector('button.dropdown-toggle, button.note-btn');
                    const label = button?.querySelector('.note-current-fontname');
                    const menu = group.querySelector('.note-dropdown-menu.dropdown-fontname');
                    if (!(menu instanceof HTMLElement)) return;
                    currentMenus.add(menu);
                    if (label instanceof HTMLElement && !(label.textContent || '').trim()) {
                        setTextContent(label, '글꼴');
                        setStyleProperty(label, 'font-family', null);
                    }
                    setAttribute(menu, 'data-dcuf-surface', 'write-font-menu');
                    setAttribute(menu, 'data-dcuf-role', 'host-font-menu');
                    const nativeOptions = Array.from(menu.querySelectorAll(':scope > .note-dropdown-item'));
                    nativeOptions.forEach((option) => setAttribute(option, 'data-dcuf-role', 'native-font-option'));
                    const previous = activeFontMenus.get(menu);
                    const selectedValue = previous?.root?.querySelector('[data-dcuf-font-value].checked')?.getAttribute('data-dcuf-font-value')
                        || nativeOptions.find((option) => option.classList.contains('checked'))?.getAttribute('data-value')
                        || ((label?.textContent || '').trim() === '글꼴' ? '' : (label?.textContent || '').trim());
                    const record = previous || { group, button, label, menu, nativeOptions, root: null };
                    record.group = group;
                    record.button = button;
                    record.label = label;
                    record.nativeOptions = nativeOptions;
                    record.root = __dcufWriteFontPresenter.mount(menu, {
                        selectedValue,
                        onIntent: (intent) => {
                            if (intent?.type === 'select-font') applyFontSelection(record, intent.value);
                        },
                    });
                    activeFontMenus.set(menu, record);
                });
            }
            Array.from(activeFontMenus.entries()).forEach(([menu, record]) => {
                if (!currentMenus.has(menu) || !menu.isConnected) restoreFontMenu(menu, record);
            });
        };

        const syncDesktopSiteMobileWriteMode = () => {
            if (!(activeForm instanceof HTMLFormElement) || !(document.body instanceof HTMLBodyElement)) return false;
            const screenWidth = Number(window.screen?.width) || 0;
            const layoutWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
            const scale = screenWidth > 0 ? layoutWidth / screenWidth : 1;
            const enabled = screenWidth > 0 && screenWidth <= 600 && layoutWidth >= 800 && scale >= 1.5;
            toggleClass(document.body, 'dcuf-write-desktop-site-mobile', enabled);
            setAttribute(document.body, VIEWPORT_BOUND_MARKER, '1');
            if (enabled) {
                const initialScale = Math.min(3, scale);
                setStyleProperty(document.body, '--dcuf-write-desktop-site-scale', String(initialScale));
                setStyleProperty(document.body, '--dcuf-write-desktop-site-inverse-scale', String(1 / initialScale));
                setStyleProperty(document.body, '--dcuf-write-device-width', `${screenWidth}px`);
            } else {
                setStyleProperty(document.body, '--dcuf-write-desktop-site-scale', null);
                setStyleProperty(document.body, '--dcuf-write-desktop-site-inverse-scale', null);
                setStyleProperty(document.body, '--dcuf-write-device-width', null);
            }
            return true;
        };

        const revealHeadtext = (candidate, behavior = 'smooth') => {
            if (!(candidate instanceof HTMLElement) || !(activeHeadtextList instanceof HTMLElement)) return;
            scheduleAnimationFrame(() => {
                if (!(activeHeadtextList instanceof HTMLElement) || !activeHeadtextList.contains(candidate)) return;
                const maxScrollLeft = Math.max(0, activeHeadtextList.scrollWidth - activeHeadtextList.clientWidth);
                const centeredLeft = candidate.offsetLeft - ((activeHeadtextList.clientWidth - candidate.offsetWidth) / 2);
                activeHeadtextList.scrollTo({
                    left: Math.max(0, Math.min(maxScrollLeft, centeredLeft)),
                    behavior,
                });
            });
        };

        const positionHeadtextTips = () => {
            if (!(activeHeadtextList instanceof HTMLElement)) return false;
            activeHeadtextList.querySelectorAll(':scope > li .tip_box2').forEach((tip) => {
                if (!(tip instanceof HTMLElement)) return;
                const item = tip.closest('li');
                if (!(item instanceof HTMLElement) || getComputedStyle(tip).display === 'none') return;
                const itemRect = item.getBoundingClientRect();
                const tipRect = tip.getBoundingClientRect();
                const viewportWidth = window.visualViewport?.width || window.innerWidth;
                const modeScale = document.body.classList.contains('dcuf-write-desktop-site-mobile')
                    ? (Number(document.body.style.getPropertyValue('--dcuf-write-desktop-site-scale')) || 1)
                    : 1;
                const left = Math.max(8, Math.min(viewportWidth - tipRect.width - 8, itemRect.left + ((itemRect.width - tipRect.width) / 2)));
                const top = Math.max(8, itemRect.top - tipRect.height - 8);
                setStyleProperty(tip, '--dcuf-headtext-tip-left', `${Math.round(left / modeScale)}px`);
                setStyleProperty(tip, '--dcuf-headtext-tip-top', `${Math.round(top / modeScale)}px`);
                setStyleProperty(tip, '--dcuf-headtext-tip-max-width', `${Math.floor((viewportWidth - 16) / modeScale)}px`);
                toggleClass(tip, 'dcuf-headtext-tip-positioning', false);
                toggleClass(tip, 'dcuf-headtext-tip-positioned', true);
            });
            return true;
        };

        const scheduleHeadtextTipPosition = () => {
            scheduleAnimationFrame(() => scheduleAnimationFrame(() => positionHeadtextTips()));
        };

        const bindHeadtextRuntime = () => {
            const previousList = activeHeadtextList;
            headtextScope?.dispose();
            headtextScope = null;
            activeHeadtextList = null;
            headtextDrag = null;
            draggedHeadtext = false;
            if (previousList instanceof HTMLElement) {
                restoreWhere((element) => element === previousList || previousList.contains(element));
            }
            if (!(activeForm instanceof HTMLFormElement)) return;

            const label = activeForm.querySelector('.write_subject > .tit, .write_subject > .write_subject_label');
            toggleClass(label, 'dcuf-write-headtext-label', label instanceof HTMLElement);
            const list = activeForm.querySelector('.write_subject .subject_list');
            if (!(list instanceof HTMLElement)) return;
            activeHeadtextList = list;
            headtextScope = DCUF_UI_CONTRACTS.createDisposableScope(`${SURFACE_ID}-headtext`);
            setAttribute(list, HEADTEXT_BOUND_MARKER, 'connected');
            setAttribute(list, 'data-dcuf-scroll-bound', '1');
            revealHeadtext(list.querySelector(':scope > li.sel, :scope > li.active'), 'auto');

            listen(list, 'pointerdown', (event) => {
                if (event.pointerType === 'touch' || event.button !== 0) return;
                headtextDrag = {
                    pointerId: event.pointerId,
                    startX: event.clientX,
                    startScrollLeft: list.scrollLeft,
                    moved: false,
                };
            }, undefined, headtextScope);
            listen(list, 'pointermove', (event) => {
                if (!headtextDrag || headtextDrag.pointerId !== event.pointerId) return;
                const delta = event.clientX - headtextDrag.startX;
                if (!headtextDrag.moved && Math.abs(delta) >= 8) {
                    headtextDrag.moved = true;
                    list.setPointerCapture?.(event.pointerId);
                    toggleClass(list, 'dcuf-headtext-dragging', true);
                }
                if (!headtextDrag.moved) return;
                event.preventDefault();
                list.scrollLeft = headtextDrag.startScrollLeft - delta;
                positionHeadtextTips();
            }, undefined, headtextScope);
            const finishHeadtextDrag = (event) => {
                if (!headtextDrag || headtextDrag.pointerId !== event.pointerId) return;
                draggedHeadtext = headtextDrag.moved;
                headtextDrag = null;
                toggleClass(list, 'dcuf-headtext-dragging', false);
                if (list.hasPointerCapture?.(event.pointerId)) list.releasePointerCapture(event.pointerId);
                if (draggedHeadtext) scheduleTimeout(() => { draggedHeadtext = false; }, 0);
            };
            listen(list, 'pointerup', finishHeadtextDrag, undefined, headtextScope);
            listen(list, 'pointercancel', finishHeadtextDrag, undefined, headtextScope);
            listen(list, 'click', (event) => {
                if (draggedHeadtext) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    return;
                }
                const clicked = event.target instanceof Element ? event.target.closest('li') : null;
                if (!(clicked instanceof HTMLElement) || clicked.parentElement !== list) return;
                scheduleAnimationFrame(() => {
                    revealHeadtext(list.querySelector(':scope > li.sel, :scope > li.active') || clicked);
                });
            }, undefined, headtextScope);
            const prepareHeadtextTipPosition = (event) => {
                const item = event.target instanceof Element ? event.target.closest('li') : null;
                if (!(item instanceof HTMLElement) || item.parentElement !== list) return;
                const tip = item.querySelector(':scope > .tip_box2');
                if (tip instanceof HTMLElement) {
                    toggleClass(tip, 'dcuf-headtext-tip-positioned', false);
                    toggleClass(tip, 'dcuf-headtext-tip-positioning', true);
                }
                positionHeadtextTips();
                scheduleHeadtextTipPosition();
            };
            listen(list, 'pointerover', prepareHeadtextTipPosition, undefined, headtextScope);
            listen(list, 'focusin', prepareHeadtextTipPosition, undefined, headtextScope);
            listen(list, 'scroll', positionHeadtextTips, { passive: true }, headtextScope);
            listen(window, 'resize', scheduleHeadtextTipPosition, { passive: true }, headtextScope);
            listen(window, 'scroll', scheduleHeadtextTipPosition, { passive: true, capture: true }, headtextScope);
        };

        const refreshHeadtextRuntime = () => {
            if (!(activeForm instanceof HTMLFormElement)) return;
            const current = activeForm.querySelector('.write_subject .subject_list');
            if (current !== activeHeadtextList) bindHeadtextRuntime();
        };

        const prepareEditorLayersForTrigger = (event) => {
            if (!(event.target instanceof Element) || event.target.closest('.note-dropdown-menu, .pop_wrap')) return;
            const group = event.target.closest('.note-toolbar .note-btn-group');
            if (!(group instanceof HTMLElement)) return;
            if (event.type === 'pointerover' && event.relatedTarget instanceof Node && group.contains(event.relatedTarget)) return;
            const layers = Array.from(group.querySelectorAll('.note-dropdown-menu, .pop_wrap'));
            if (group.querySelector('button[aria-label="디시콘"],[data-command="dccon"],button[onclick*="dccon" i]')) {
                const externalDccon = getExternalDcconLayer();
                if (externalDccon) layers.push(externalDccon);
            }
            layers.forEach((layer) => {
                setEditorLayerState(layer, 'positioning');
            });
        };

        const handleMutation = (payload) => {
            if (!(activeForm instanceof HTMLFormElement)) return;
            scrubStaleToolbarStates(activeForm);
            bindFontMenus();
            refreshHeadtextRuntime();
            const relevantTargets = [
                ...(payload?.attributeTargets || []),
                ...(payload?.addedElements || []),
                ...(payload?.childListTargets || []),
            ];
            const structuralTargets = [
                ...(payload?.addedElements || []),
                ...(payload?.childListTargets || []),
            ];
            const externalDccon = getExternalDcconLayer();
            const hasRelevantFormMutation = relevantTargets.some((node) => (
                node === activeForm || (node instanceof Node && activeForm.contains(node))
            ));
            const hasRelevantExternalMutation = externalDccon && structuralTargets.some((node) => (
                node === externalDccon || (node instanceof Node && externalDccon.contains(node))
            ));
            if (!hasRelevantFormMutation && !hasRelevantExternalMutation) return;
            const hasVisiblePendingLayer = getEditorLayers().some((layer) => (
                layer instanceof HTMLElement
                && layer.getAttribute(LAYER_STATE_ATTRIBUTE) !== 'positioned'
                && getComputedStyle(layer).display !== 'none'
            ));
            if (hasRelevantExternalMutation || hasVisiblePendingLayer) positionEditorLayers();
            if (activeHeadtextList instanceof HTMLElement) {
                const touchesHeadtext = relevantTargets.some((node) => (
                    node === activeHeadtextList || (node instanceof Node && activeHeadtextList.contains(node))
                ));
                const hasVisiblePendingTip = Array.from(activeHeadtextList.querySelectorAll(':scope > li .tip_box2:not(.dcuf-headtext-tip-positioned)'))
                    .some((tip) => tip instanceof HTMLElement && getComputedStyle(tip).display !== 'none');
                if (touchesHeadtext && hasVisiblePendingTip) positionHeadtextTips();
            }
        };

        const bindRuntime = () => {
            if (!(activeForm instanceof HTMLFormElement) || !activeScope) return;
            scrubStaleToolbarStates(activeForm);
            syncDesktopSiteMobileWriteMode();
            listen(window, 'resize', syncDesktopSiteMobileWriteMode, { passive: true });
            if (window.visualViewport) listen(window.visualViewport, 'resize', syncDesktopSiteMobileWriteMode, { passive: true });
            bindHeadtextRuntime();
            bindFontMenus();
            const editorToolbarSelector = '.note-toolbar, .note-toolbar-media';
            listen(activeForm, 'pointerdown', (event) => {
                if (event.pointerType === 'touch' || event.button !== 0) return;
                if (!(event.target instanceof Element) || event.target.closest('.note-dropdown-menu, .pop_wrap, input, textarea, select')) return;
                const toolbar = event.target.closest(editorToolbarSelector);
                if (!(toolbar instanceof HTMLElement)) return;
                draggedEditorToolbar = false;
                editorToolbarDrag = {
                    toolbar,
                    pointerId: event.pointerId,
                    startX: event.clientX,
                    startScrollLeft: toolbar.scrollLeft,
                    moved: false,
                };
            });
            listen(activeForm, 'pointermove', (event) => {
                if (!editorToolbarDrag || editorToolbarDrag.pointerId !== event.pointerId) return;
                const delta = event.clientX - editorToolbarDrag.startX;
                if (!editorToolbarDrag.moved && Math.abs(delta) >= 8) {
                    editorToolbarDrag.moved = true;
                    editorToolbarDrag.toolbar.setPointerCapture?.(event.pointerId);
                    toggleClass(editorToolbarDrag.toolbar, DRAGGING_CLASS, true);
                    setAttribute(editorToolbarDrag.toolbar, DRAGGING_ATTRIBUTE, 'dragging');
                }
                if (!editorToolbarDrag.moved) return;
                event.preventDefault();
                editorToolbarDrag.toolbar.scrollLeft = editorToolbarDrag.startScrollLeft - delta;
                positionEditorLayers();
            });
            const finishEditorToolbarDrag = (event) => {
                if (!editorToolbarDrag || editorToolbarDrag.pointerId !== event.pointerId) return;
                const { toolbar, moved } = editorToolbarDrag;
                editorToolbarDrag = null;
                draggedEditorToolbar = moved;
                toggleClass(toolbar, DRAGGING_CLASS, false);
                setAttribute(toolbar, DRAGGING_ATTRIBUTE, null);
                if (toolbar.hasPointerCapture?.(event.pointerId)) toolbar.releasePointerCapture(event.pointerId);
                if (draggedEditorToolbar) scheduleTimeout(() => { draggedEditorToolbar = false; }, 0);
            };
            listen(activeForm, 'pointerup', finishEditorToolbarDrag);
            listen(activeForm, 'pointercancel', finishEditorToolbarDrag);
            listen(activeForm, 'click', (event) => {
                if (!draggedEditorToolbar) return;
                event.preventDefault();
                event.stopImmediatePropagation();
            }, true);
            listen(activeForm, 'pointerdown', prepareEditorLayersForTrigger, true);
            listen(activeForm, 'pointerover', prepareEditorLayersForTrigger, true);
            listen(activeForm, 'click', prepareEditorLayersForTrigger, true);
            listen(activeForm, 'keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') prepareEditorLayersForTrigger(event);
            }, true);
            listen(activeForm, 'click', (event) => {
                if (!(event.target instanceof Element) || !event.target.closest('.note-toolbar')) return;
                if (event.target.closest('.note-fontname')) bindFontMenus();
                positionEditorLayers();
                scheduleEditorLayerPosition();
            });
            listen(activeForm, 'pointerover', (event) => {
                if (!(event.target instanceof Element) || !event.target.closest('.note-toolbar')) return;
                if (event.target.closest('.note-fontname')) bindFontMenus();
                scheduleEditorLayerPosition();
            });
            listen(activeForm, 'scroll', scheduleEditorPopupPosition, { passive: true, capture: true });
            listen(window, 'resize', scheduleEditorLayerPosition, { passive: true });
            listen(window, 'scroll', scheduleEditorPopupPosition, { passive: true, capture: true });
            if (window.visualViewport) {
                listen(window.visualViewport, 'resize', scheduleEditorLayerPosition, { passive: true });
                listen(window.visualViewport, 'scroll', scheduleEditorPopupPosition, { passive: true });
            }
            if (activeCoordinator && typeof activeCoordinator.subscribeMutations === 'function') {
                const unsubscribe = activeCoordinator.subscribeMutations('write-editor-host-adapter', handleMutation);
                if (typeof unsubscribe === 'function') {
                    mutationSubscriberCount = 1;
                    activeScope.own(() => {
                        unsubscribe();
                        mutationSubscriberCount = 0;
                    });
                }
            }
            listen(window, 'pagehide', disconnect, { once: true });
        };

        const disconnect = () => {
            cancelScheduledWork();
            if (editorToolbarDrag?.toolbar instanceof HTMLElement) {
                editorToolbarDrag.toolbar.classList.remove(DRAGGING_CLASS);
                editorToolbarDrag.toolbar.removeAttribute(DRAGGING_ATTRIBUTE);
            }
            editorToolbarDrag = null;
            draggedEditorToolbar = false;
            if (headtextDrag && activeHeadtextList instanceof HTMLElement) {
                activeHeadtextList.classList.remove('dcuf-headtext-dragging');
            }
            headtextDrag = null;
            draggedHeadtext = false;
            headtextScope?.dispose();
            headtextScope = null;
            activeHeadtextList = null;
            Array.from(activeFontMenus.entries()).forEach(([menu, record]) => restoreFontMenu(menu, record));
            __dcufWriteFontPresenter.dispose();
            activeScope?.dispose();
            activeScope = null;
            restoreAll();
            activeForm = null;
            activeCoordinator = null;
        };

        const connect = (form, { runtimeCoordinator = null } = {}) => {
            if (!(form instanceof HTMLFormElement)) {
                disconnect();
                return snapshot();
            }
            if (activeForm === form && activeScope && !activeScope.disposed) {
                activeCoordinator = runtimeCoordinator || activeCoordinator;
                bindFontMenus();
                return snapshot();
            }
            disconnect();
            activeForm = form;
            activeCoordinator = runtimeCoordinator;
            activeScope = DCUF_UI_CONTRACTS.createDisposableScope(SURFACE_ID);
            setAttribute(form, FORM_MARKER, 'connected');
            setAttribute(form, LEGACY_BOUND_MARKER, '1');
            bindRuntime();
            return snapshot();
        };

        const refresh = () => {
            if (!(activeForm instanceof HTMLFormElement) || !activeForm.isConnected) {
                disconnect();
                return snapshot();
            }
            syncDesktopSiteMobileWriteMode();
            refreshHeadtextRuntime();
            bindFontMenus();
            positionHeadtextTips();
            positionEditorLayers();
            return snapshot();
        };

        const snapshot = () => deepFreeze({
            surface: SURFACE_ID,
            connected: activeForm instanceof HTMLFormElement && activeForm.isConnected,
            formId: activeForm?.getAttribute('id') || '',
            headtextConnected: activeHeadtextList instanceof HTMLElement && activeHeadtextList.isConnected,
            fontMenuCount: Array.from(activeFontMenus.keys()).filter((menu) => menu.isConnected).length,
            nativeFontOptionCount: Array.from(activeFontMenus.values()).reduce((sum, record) => sum + record.nativeOptions.length, 0),
            ownedFontOptionCount: Array.from(activeFontMenus.values()).reduce((sum, record) => (
                sum + (record.root?.querySelectorAll?.('[data-dcuf-font-value]').length || 0)
            ), 0),
            layerCount: getEditorLayers().length,
            positionedLayerCount: getEditorLayers().filter((layer) => layer.getAttribute(LAYER_STATE_ATTRIBUTE) === 'positioned').length,
            mutationSubscriberCount,
        });

        const snapshotResources = () => deepFreeze({
            activeForms: activeForm instanceof HTMLFormElement && activeForm.isConnected ? 1 : 0,
            trackedElements: transaction.size,
            observers: 0,
            listeners: listenerCount,
            mutationSubscribers: mutationSubscriberCount,
            timers: timerIds.size,
            animationFrames: rafIds.size,
            presentationStyleOwners: __dcufWriteFontPresenter.snapshotResources().styleOwners,
            presentationRoots: __dcufWriteFontPresenter.snapshotResources().roots,
            presentationListeners: __dcufWriteFontPresenter.snapshotResources().listeners,
        });

        const invokeNative = (intent) => {
            if (intent === 'position-layers') return positionEditorLayers();
            if (intent === 'position-headtext') return positionHeadtextTips();
            if (intent === 'refresh-font-menu') {
                bindFontMenus();
                return true;
            }
            throw new Error(`Unsupported write editor host intent: ${intent}`);
        };

        const isConnectedTo = (form) => activeForm === form
            && activeScope
            && !activeScope.disposed;

        return Object.freeze({
            connect,
            refresh,
            disconnect,
            dispose: disconnect,
            snapshot,
            snapshotResources,
            invokeNative,
            isConnectedTo,
        });
    })();
    __dcufRoot.__dcufWriteEditorHostAdapter = __dcufWriteEditorHostAdapter;
