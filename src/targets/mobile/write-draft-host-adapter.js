    const __dcufWriteDraftHostAdapter = (() => {
        const SURFACE_ID = 'write-draft-host';
        const FORM_MARKER = 'data-dcuf-write-draft-host';
        const LEGACY_BOUND_MARKER = 'data-dcuf-draft-bound';
        const INPUT_SELECTOR = '#subject,input[name="subject"],textarea#memo,textarea[name="memo"],textarea[name="contents"],.note-editable,.note-codable,[contenteditable="true"][role="textbox"]';
        const DEBOUNCE_MS = 800;
        const SUBMIT_RECOVERY_MS = 8000;
        const timerIds = new Set();
        let activeForm = null;
        let activeScope = null;
        let activeHandlers = null;
        let activeController = null;
        let activeConnectionId = 0;
        let activeReady = false;
        let activeRootReplaced = false;
        let originalMarkers = null;
        let originalController = null;
        let hadOwnController = false;
        let listenerCount = 0;
        let debounceCancel = null;
        let submitRecoveryCancel = null;
        let successCleanupCancel = null;
        let bannerScope = null;

        const deepFreeze = (value) => {
            if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
            Object.values(value).forEach(deepFreeze);
            return Object.freeze(value);
        };

        const listen = (scope, target, type, listener, options) => {
            if (!scope || !target?.addEventListener) return;
            target.addEventListener(type, listener, options);
            listenerCount += 1;
            scope.own(() => {
                target.removeEventListener(type, listener, options);
                listenerCount = Math.max(0, listenerCount - 1);
            });
        };

        const scheduleTimeout = (callback, delay, scope = null) => {
            let active = true;
            let releaseOwner = null;
            const id = window.setTimeout(() => {
                if (!active) return;
                active = false;
                timerIds.delete(id);
                releaseOwner?.();
                callback();
            }, delay);
            timerIds.add(id);
            const cancelTimer = () => {
                if (!active) return;
                active = false;
                window.clearTimeout(id);
                timerIds.delete(id);
            };
            if (scope) releaseOwner = scope.own(cancelTimer);
            return () => {
                if (!active) return;
                if (releaseOwner) releaseOwner();
                else cancelTimer();
            };
        };

        const invokeAsync = (callback, ...args) => {
            try {
                Promise.resolve(callback?.(...args)).catch((error) => activeHandlers?.onError?.(error));
            } catch (error) {
                activeHandlers?.onError?.(error);
            }
        };

        const getDraftFields = (form = activeForm) => {
            if (!(form instanceof HTMLFormElement)) return { subject: null, textarea: null, editor: null, codeview: null, headtext: null };
            const subject = form.querySelector('#subject, input[name="subject"]');
            const textarea = form.querySelector('textarea#memo, textarea[name="memo"], textarea[name="contents"]');
            const editor = form.querySelector('.note-editable, [contenteditable="true"][role="textbox"]');
            const codeview = form.querySelector('.note-codable');
            const headtext = form.querySelector('input[name="headtext"]');
            return { subject, textarea, editor, codeview, headtext };
        };

        const normalizeBodyHtml = (html) => {
            const template = document.createElement('template');
            template.innerHTML = String(html || '');
            template.content.querySelectorAll('.wrt_guide_preview_inn').forEach((guide) => guide.remove());
            return template.innerHTML;
        };

        const hasDraftContent = (draft) => {
            if (String(draft?.subject || '').trim()) return true;
            const html = normalizeBodyHtml(draft?.bodyHtml);
            if (/<(?:img|video|audio)\b/i.test(html)) return true;
            const text = document.createElement('div');
            text.innerHTML = html;
            return Boolean(text.textContent.trim());
        };

        const getSummernoteCode = (form = activeForm) => {
            const fields = getDraftFields(form);
            const jquery = window.jQuery || window.$;
            if (!(fields.textarea instanceof HTMLTextAreaElement) || typeof jquery !== 'function' || !form?.querySelector('.note-editor')) return null;
            try {
                const instance = jquery(fields.textarea);
                if (typeof instance?.summernote !== 'function') return null;
                const code = instance.summernote('code');
                return typeof code === 'string' ? code : null;
            } catch { return null; }
        };

        const isCodeViewActive = (fields) => {
            if (!(fields?.codeview instanceof HTMLTextAreaElement)) return false;
            const frame = fields.codeview.closest('.note-editor');
            return Boolean(frame?.classList.contains('codeview') || frame?.classList.contains('codeview-active') || fields.codeview.dataset.dcufActive === '1');
        };

        const readDraftBodyHtml = (form = activeForm) => {
            const fields = getDraftFields(form);
            if (isCodeViewActive(fields)) return normalizeBodyHtml(fields.codeview.value);
            const summernote = getSummernoteCode(form);
            const textareaHtml = String(fields.textarea?.value || '');
            if (summernote !== null && (hasDraftContent({ bodyHtml: summernote }) || !textareaHtml)) return normalizeBodyHtml(summernote);
            const editorHtml = fields.editor instanceof HTMLElement ? String(fields.editor.innerHTML || '') : '';
            if (hasDraftContent({ bodyHtml: editorHtml }) || !textareaHtml) return normalizeBodyHtml(editorHtml);
            return normalizeBodyHtml(textareaHtml);
        };

        const readDraftFromForm = (form, id, pendingSubmit = false) => {
            const fields = getDraftFields(form);
            return {
                id,
                subject: String(fields.subject?.value || ''),
                bodyHtml: readDraftBodyHtml(form),
                headtext: String(fields.headtext?.value || ''),
                savedAt: Date.now(),
                pendingSubmit: Boolean(pendingSubmit),
            };
        };

        const readActiveDraft = (id, pendingSubmit = false, connectionId = activeConnectionId) => (
            connectionId === activeConnectionId && activeForm instanceof HTMLFormElement
                ? readDraftFromForm(activeForm, id, pendingSubmit)
                : null
        );

        const applyDraftToForm = (form, draft) => {
            if (!(form instanceof HTMLFormElement)) return false;
            const fields = getDraftFields(form);
            const bodyHtml = normalizeBodyHtml(draft?.bodyHtml);
            if (fields.subject instanceof HTMLInputElement) {
                fields.subject.value = String(draft?.subject || '');
                fields.subject.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (fields.textarea instanceof HTMLTextAreaElement) fields.textarea.value = bodyHtml;
            if (fields.codeview instanceof HTMLTextAreaElement) fields.codeview.value = bodyHtml;
            let appliedWithSummernote = false;
            const jquery = window.jQuery || window.$;
            if (fields.textarea instanceof HTMLTextAreaElement && typeof jquery === 'function' && form.querySelector('.note-editor')) {
                try {
                    const instance = jquery(fields.textarea);
                    if (typeof instance?.summernote === 'function') {
                        instance.summernote('code', bodyHtml);
                        appliedWithSummernote = true;
                    }
                } catch { appliedWithSummernote = false; }
            }
            if (!appliedWithSummernote && fields.editor instanceof HTMLElement) fields.editor.innerHTML = bodyHtml;
            const dispatchTarget = fields.editor instanceof HTMLElement ? fields.editor : fields.textarea;
            dispatchTarget?.dispatchEvent(new Event('input', { bubbles: true }));
            if (!(fields.editor instanceof HTMLElement) && bodyHtml && activeScope && form === activeForm) {
                [120, 360, 800].forEach((delay) => scheduleTimeout(() => {
                    if (form !== activeForm || !form.isConnected) return;
                    const nextFields = getDraftFields(form);
                    if (!(nextFields.editor instanceof HTMLElement)) return;
                    if (hasDraftContent({ bodyHtml: readDraftBodyHtml(form) })) return;
                    nextFields.editor.innerHTML = bodyHtml;
                    if (nextFields.textarea instanceof HTMLTextAreaElement) nextFields.textarea.value = bodyHtml;
                    nextFields.editor.dispatchEvent(new Event('input', { bubbles: true }));
                }, delay, activeScope));
            }
            if (fields.headtext instanceof HTMLInputElement && draft?.headtext) {
                fields.headtext.value = String(draft.headtext);
                fields.headtext.dispatchEvent(new Event('change', { bubbles: true }));
            }
            return true;
        };

        const applyActiveDraft = (draft, connectionId = activeConnectionId) => (
            connectionId === activeConnectionId ? applyDraftToForm(activeForm, draft) : false
        );

        const closeBanner = () => {
            const scope = bannerScope;
            bannerScope = null;
            scope?.dispose();
        };

        const showBanner = (message, actions = [], onAction = null) => {
            closeBanner();
            if (!(document.body instanceof HTMLBodyElement)) return null;
            const scope = DCUF_UI_CONTRACTS.createDisposableScope(`${SURFACE_ID}-banner`);
            bannerScope = scope;
            const banner = document.createElement('div');
            banner.id = 'dcuf-draft-banner';
            const text = document.createElement('span');
            text.textContent = String(message || '');
            banner.appendChild(text);
            actions.forEach((action) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = String(action?.label || '');
                listen(scope, button, 'click', () => onAction?.(String(action?.id || '')));
                banner.appendChild(button);
            });
            const close = document.createElement('button');
            close.type = 'button';
            close.textContent = '✕';
            listen(scope, close, 'click', closeBanner);
            banner.appendChild(close);
            document.body.appendChild(banner);
            scope.own(() => banner.remove());
            return banner;
        };

        const showLegacyBanner = (message, actions = []) => showBanner(
            message,
            actions.map((action, index) => ({ id: String(index), label: action?.label })),
            (id) => actions[Number(id)]?.run?.(),
        );

        const readSubmitMarker = (key) => {
            try { return JSON.parse(sessionStorage.getItem(String(key)) || 'null'); }
            catch { return null; }
        };

        const writeSubmitMarker = (key, marker) => {
            try {
                sessionStorage.setItem(String(key), JSON.stringify(marker));
                return true;
            } catch { return false; }
        };

        const removeSubmitMarker = (key) => {
            try {
                sessionStorage.removeItem(String(key));
                return true;
            } catch { return false; }
        };

        const getNavigationObservation = () => {
            let referrerPath = '';
            try { referrerPath = document.referrer ? new URL(document.referrer, window.location.href).pathname : ''; }
            catch { referrerPath = ''; }
            return deepFreeze({
                pathname: window.location.pathname,
                referrerPath,
                navigationType: performance.getEntriesByType?.('navigation')?.[0]?.type || 'unknown',
            });
        };

        const cancelDebounce = (connectionId = activeConnectionId) => {
            if (connectionId !== activeConnectionId) return false;
            debounceCancel?.();
            debounceCancel = null;
            return true;
        };

        const scheduleDirtySave = () => {
            if (!activeReady || !activeScope) return;
            activeHandlers?.onDirty?.();
            cancelDebounce();
            debounceCancel = scheduleTimeout(() => {
                debounceCancel = null;
                invokeAsync(activeHandlers?.onSaveRequested, false);
            }, DEBOUNCE_MS, activeScope);
        };

        const restoreFormState = () => {
            if (!(activeForm instanceof HTMLFormElement)) return;
            const form = activeForm;
            if (originalMarkers?.surface === null) form.removeAttribute(FORM_MARKER);
            else form.setAttribute(FORM_MARKER, originalMarkers.surface);
            if (originalMarkers?.legacy === null) form.removeAttribute(LEGACY_BOUND_MARKER);
            else form.setAttribute(LEGACY_BOUND_MARKER, originalMarkers.legacy);
            if (hadOwnController) form._dcufDraftController = originalController;
            else delete form._dcufDraftController;
        };

        const disconnectForm = ({ flush = true } = {}) => {
            if (flush && activeReady) activeHandlers?.onFlushRequested?.();
            const scope = activeScope;
            activeScope = null;
            scope?.dispose();
            debounceCancel = null;
            submitRecoveryCancel = null;
            closeBanner();
            restoreFormState();
            activeForm = null;
            activeHandlers = null;
            activeController = null;
            activeReady = false;
            originalMarkers = null;
            originalController = null;
            hadOwnController = false;
        };

        const connect = (form, handlers = {}) => {
            if (!(form instanceof HTMLFormElement)) {
                disconnectForm();
                return snapshot();
            }
            if (form === activeForm) return snapshot();
            const replaced = activeForm instanceof HTMLFormElement && activeForm !== form;
            disconnectForm();
            activeConnectionId += 1;
            activeForm = form;
            activeHandlers = handlers && typeof handlers === 'object' ? handlers : {};
            activeReady = false;
            activeRootReplaced = replaced;
            activeScope = DCUF_UI_CONTRACTS.createDisposableScope(SURFACE_ID);
            originalMarkers = {
                surface: form.getAttribute(FORM_MARKER) === 'connected' ? null : form.getAttribute(FORM_MARKER),
                legacy: form.getAttribute(LEGACY_BOUND_MARKER) === '1' ? null : form.getAttribute(LEGACY_BOUND_MARKER),
            };
            hadOwnController = Object.hasOwn(form, '_dcufDraftController');
            originalController = form._dcufDraftController;
            form.setAttribute(FORM_MARKER, 'connected');
            form.setAttribute(LEGACY_BOUND_MARKER, '1');

            listen(activeScope, form, 'input', (event) => {
                const target = event.target;
                if (!(target instanceof Element) || !(target.matches(INPUT_SELECTOR) || target.closest('.note-editable,[contenteditable="true"][role="textbox"]'))) return;
                const fields = getDraftFields(form);
                if (fields.editor instanceof HTMLElement && (target === fields.editor || fields.editor.contains(target)) && fields.textarea instanceof HTMLTextAreaElement) {
                    fields.textarea.value = fields.editor.innerHTML;
                } else if (fields.codeview instanceof HTMLTextAreaElement && target === fields.codeview && fields.textarea instanceof HTMLTextAreaElement) {
                    fields.textarea.value = fields.codeview.value;
                }
                scheduleDirtySave();
            }, true);
            listen(activeScope, form, 'change', (event) => {
                if (event.target instanceof Element && event.target.matches('input[name="headtext"]')) scheduleDirtySave();
            }, true);
            const headtext = form.querySelector('.write_subject');
            if (headtext instanceof Element) {
                listen(activeScope, headtext, 'click', () => {
                    scheduleTimeout(scheduleDirtySave, 0, activeScope);
                }, true);
            }
            const flush = () => {
                if (activeReady) activeHandlers?.onFlushRequested?.();
            };
            listen(activeScope, document, 'visibilitychange', () => {
                if (document.visibilityState === 'hidden') flush();
            }, true);
            listen(activeScope, window, 'pagehide', flush, true);
            listen(activeScope, window, 'beforeunload', flush, true);
            listen(activeScope, form, 'submit', () => {
                if (!activeReady) return;
                activeHandlers?.onSubmitIntent?.();
                submitRecoveryCancel?.();
                submitRecoveryCancel = scheduleTimeout(() => {
                    submitRecoveryCancel = null;
                    if (form !== activeForm || !form.isConnected || document.visibilityState === 'hidden') return;
                    invokeAsync(activeHandlers?.onSubmitRecovery);
                }, SUBMIT_RECOVERY_MS, activeScope);
            }, true);
            return snapshot();
        };

        const setController = (controller, connectionId = activeConnectionId) => {
            if (connectionId !== activeConnectionId || !(activeForm instanceof HTMLFormElement)) return false;
            activeController = controller;
            activeForm._dcufDraftController = controller;
            return true;
        };

        const getController = (form) => form === activeForm ? activeController : null;

        const setReady = (connectionId, ready = true) => {
            if (connectionId !== activeConnectionId) return false;
            activeReady = Boolean(ready);
            return true;
        };

        const isActive = (connectionId) => connectionId === activeConnectionId
            && activeForm instanceof HTMLFormElement
            && activeForm.isConnected;

        const scheduleSuccessCleanup = (callback, delay) => {
            successCleanupCancel?.();
            successCleanupCancel = scheduleTimeout(() => {
                successCleanupCancel = null;
                callback?.();
            }, delay);
        };

        const cancelSuccessCleanup = () => {
            successCleanupCancel?.();
            successCleanupCancel = null;
        };

        const snapshot = () => deepFreeze({
            surface: SURFACE_ID,
            connected: activeForm instanceof HTMLFormElement && activeForm.isConnected,
            connectionId: activeConnectionId,
            ready: activeReady,
            rootReplaced: activeRootReplaced,
        });

        const snapshotResources = () => deepFreeze({
            activeForms: activeForm instanceof HTMLFormElement && activeForm.isConnected ? 1 : 0,
            listeners: listenerCount,
            timers: timerIds.size,
            mutationSubscribers: 0,
            observers: 0,
        });

        const dispose = () => {
            disconnectForm();
            cancelSuccessCleanup();
            activeRootReplaced = false;
        };

        return Object.freeze({
            SURFACE_ID,
            DEBOUNCE_MS,
            SUBMIT_RECOVERY_MS,
            connect,
            disconnect: disconnectForm,
            dispose,
            snapshot,
            snapshotResources,
            getController,
            setController,
            setReady,
            isActive,
            cancelDebounce,
            getDraftFields,
            getSummernoteCode,
            isCodeViewActive,
            normalizeBodyHtml,
            hasDraftContent,
            readDraftBodyHtml,
            readDraftFromForm,
            readActiveDraft,
            applyDraftToForm,
            applyActiveDraft,
            showBanner,
            showLegacyBanner,
            closeBanner,
            readSubmitMarker,
            writeSubmitMarker,
            removeSubmitMarker,
            getNavigationObservation,
            scheduleSuccessCleanup,
            cancelSuccessCleanup,
        });
    })();
    __dcufRoot.__dcufWriteDraftHostAdapter = __dcufWriteDraftHostAdapter;
