    const __dcufNativeFormHostAdapter = (() => {
        const SURFACE_ID = 'write-edit-delete-popup';
        const OWNED_FORM_CLASSES = Object.freeze([
            'dcuf-modify-password-form',
            'dcuf-delete-password-form',
            'dcuf-password-form',
            'dcuf-delete-confirm-page',
        ]);
        const NATIVE_FORM_MARKER_ATTRIBUTES = Object.freeze([
            'data-dcuf-native-form-role',
            'data-dcuf-native-form-state',
            'data-dcuf-native-form-option-state',
            'data-dcuf-native-form-editor-mode',
            'data-dcuf-native-form-toolbar-kind',
            'data-dcuf-native-form-toolbar-scroll',
            'data-dcuf-native-form-toolbar-item',
            'data-dcuf-native-form-toolbar-control',
            'data-dcuf-native-form-control-state',
            'data-dcuf-native-form-toolbar-content',
            'data-dcuf-native-form-box-sizing',
            'data-dcuf-native-form-control-kind',
        ]);
        const transaction = new Map();
        const presentationStyles = new Map();
        const pendingPresentationListeners = new Map();
        const requestedPresentationKeys = new Set();
        let activeForm = null;
        let activeKind = 'pending';
        let activeRoute = 'other';

        const deepFreeze = (value) => {
            if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
            Object.values(value).forEach(deepFreeze);
            return Object.freeze(value);
        };

        const recordFor = (element) => {
            let record = transaction.get(element);
            if (!record) {
                record = { attributes: new Map(), classes: new Map() };
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

        const restoreRecord = (element, record) => {
            if (!(element instanceof Element) || !record) return;
            record.attributes.forEach((value, name) => {
                if (value === null) element.removeAttribute(name);
                else element.setAttribute(name, value);
            });
            record.classes.forEach((wasPresent, className) => element.classList.toggle(className, wasPresent));
        };

        const restoreWhere = (predicate) => {
            Array.from(transaction.entries()).reverse().forEach(([element, record]) => {
                if (!predicate(element)) return;
                restoreRecord(element, record);
                transaction.delete(element);
            });
        };

        const restoreAll = () => {
            restoreWhere(() => true);
            activeForm = null;
            activeKind = 'pending';
            activeRoute = 'other';
        };

        const restoreFormDescendants = (form) => {
            restoreWhere((element) => element !== form
                && element !== document.body
                && element !== document.documentElement);
        };

        const pageType = () => {
            const shared = __dcufRoot.__dcufPageContext || window.__dcufPageContext;
            if (shared?.type) return shared.type;
            return ((window.location.pathname || '').match(/\/board\/(write|modify|delete)(?:\/|$)/) || [])[1] || 'other';
        };

        const discover = () => {
            const route = pageType();
            if (route === 'write') {
                const writeForm = document.querySelector('form#write');
                return writeForm instanceof HTMLFormElement
                    ? { route, kind: 'write', form: writeForm }
                    : { route, kind: 'pending', form: null };
            }
            if (route === 'modify') {
                const editorForm = document.querySelector('form#write, form[name="modify"][action*="modify_submit"]');
                if (editorForm instanceof HTMLFormElement) return { route, kind: 'modify-editor', form: editorForm };
                const passwordForm = Array.from(document.querySelectorAll('form[name="password_confirm"], form[action*="modify_password_submit"]'))
                    .find((form) => form instanceof HTMLFormElement && form.querySelector('input[type="password"][name="password"], #password'));
                return passwordForm instanceof HTMLFormElement
                    ? { route, kind: 'modify-password', form: passwordForm }
                    : { route, kind: 'pending', form: null };
            }
            if (route === 'delete') {
                const deleteForms = Array.from(document.querySelectorAll('form#delete, form[name="delete"]'))
                    .filter((form) => form instanceof HTMLFormElement);
                const confirmForm = deleteForms.find((form) => (
                    form.querySelector('.empty_pagewrap .pop_wrap.type5 .pop_content.robot > .btn_box') instanceof HTMLElement
                ));
                if (confirmForm instanceof HTMLFormElement) return { route, kind: 'delete-confirm', form: confirmForm };
                const passwordForm = deleteForms.find((form) => (
                    form.querySelector('.no_memberwrap input[type="password"][name="password"], .no_memberwrap #password') instanceof HTMLInputElement
                ));
                return passwordForm instanceof HTMLFormElement
                    ? { route, kind: 'delete-password', form: passwordForm }
                    : { route, kind: 'pending', form: null };
            }
            return { route, kind: 'unsupported', form: null };
        };

        const applyCompatibilityState = ({ route, kind, form }) => {
            const body = document.body;
            const html = document.documentElement;
            if (!(body instanceof HTMLBodyElement) || !(html instanceof HTMLElement)) return;

            if (route === 'modify') {
                const editor = kind === 'modify-editor';
                const password = kind === 'modify-password';
                toggleClass(body, 'is-modify-page', true);
                toggleClass(body, 'is-modify-editor-page', editor);
                toggleClass(body, 'is-modify-password-page', password);
                toggleClass(body, 'is-dcuf-password-page', password);
                setAttribute(body, 'data-dcuf-modify-surface', editor ? 'editor' : password ? 'password' : 'pending');
                setAttribute(html, 'data-dcuf-modify-surface', editor ? 'editor' : password ? 'password' : 'pending');
            }

            if (route === 'delete') {
                const password = kind === 'delete-password';
                const confirm = kind === 'delete-confirm';
                toggleClass(body, 'is-delete-page', true);
                toggleClass(body, 'is-delete-password-page', password);
                toggleClass(body, 'is-delete-confirm-page', confirm);
                toggleClass(body, 'is-dcuf-password-page', password);
                setAttribute(body, 'data-dcuf-delete-surface', password ? 'password' : confirm ? 'confirm' : 'pending');
                setAttribute(html, 'data-dcuf-delete-surface', password ? 'password' : confirm ? 'confirm' : 'pending');
            }

            if (!(form instanceof HTMLFormElement)) return;
            OWNED_FORM_CLASSES.forEach((className) => toggleClass(form, className, false));
            if (kind === 'modify-password') {
                toggleClass(form, 'dcuf-modify-password-form', true);
                toggleClass(form, 'dcuf-password-form', true);
            } else if (kind === 'delete-password') {
                toggleClass(form, 'dcuf-delete-password-form', true);
                toggleClass(form, 'dcuf-password-form', true);
            } else if (kind === 'delete-confirm') {
                toggleClass(form, 'dcuf-delete-confirm-page', true);
            }
        };

        const mark = (element, role, state = '') => {
            if (!(element instanceof HTMLElement)) return null;
            setAttribute(element, 'data-dcuf-role', role);
            setAttribute(element, 'data-dcuf-state', state || null);
            return element;
        };

        const prepareNativeContext = (element) => {
            if (!(element instanceof HTMLElement)) return false;
            if (!transaction.has(element)) {
                NATIVE_FORM_MARKER_ATTRIBUTES.forEach((name) => element.removeAttribute(name));
                NATIVE_FORM_MARKER_ATTRIBUTES.forEach((name) => setAttribute(element, name, null));
            }
            return true;
        };

        const markNativeContext = (element, role, state) => {
            if (!role || !state || !prepareNativeContext(element)) return null;
            setAttribute(element, 'data-dcuf-native-form-role', role);
            setAttribute(element, 'data-dcuf-native-form-state', state);
            return element;
        };

        const setNativeContextAttribute = (element, name, value) => {
            if (!name || !prepareNativeContext(element)) return null;
            setAttribute(element, name, value);
            return element;
        };

        const markNativePresentationProperty = (element, name, value) => {
            if (!name || !value || !prepareNativeContext(element)) return null;
            setAttribute(element, name, value);
            return element;
        };

        const popupState = (popup) => {
            if (!(popup instanceof HTMLElement)) return 'absent';
            if (popup.hidden || popup.getAttribute('aria-hidden') === 'true' || popup.style.display === 'none') return 'closed';
            return 'open';
        };

        const markSurface = ({ kind, form }) => {
            if (!(form instanceof HTMLFormElement)) return;
            setAttribute(form, 'data-dcuf-surface', SURFACE_ID);
            mark(form, 'native-form', kind);
            mark(form.querySelector(':scope > article'), 'native-form-content');

            const passwordSurface = kind === 'modify-password' || kind === 'delete-password';
            const writeSurface = kind === 'write' || kind === 'modify-editor';
            const nativeContextState = passwordSurface
                ? 'password'
                : kind === 'delete-confirm'
                    ? 'delete-confirm'
                    : writeSurface ? 'write-editor' : '';
            const shell = writeSurface
                ? form.querySelector('#leave_confirm_box')
                : passwordSurface
                    ? form.querySelector('.no_memberwrap')
                    : form.querySelector('.empty_pagewrap');
            const popup = writeSurface
                ? form.querySelector('#leave_confirm_box')
                : passwordSurface
                    ? form.querySelector('.no_member_cont')
                    : form.querySelector('.pop_wrap.type5');
            const panel = writeSurface
                ? form.querySelector('#leave_confirm_box .pop_content.write_ly')
                : passwordSurface
                    ? form.querySelector('.no_member_cont > .inner')
                    : form.querySelector('.pop_content.robot');
            const actions = panel?.querySelector(':scope > .btn_box') || form.querySelector('.btn_box');
            const writePopupHeading = writeSurface ? panel?.querySelector(':scope > .pop_head.bg') : null;
            const writePopupContent = writeSurface ? panel?.querySelector(':scope > .write_cont') : null;
            const writePopupActions = writeSurface ? writePopupContent?.querySelector(':scope > .btn_box') : null;
            const writePopupClose = writeSurface ? panel?.querySelector(':scope > .poply_whiteclose') : null;
            const writeFields = writeSurface ? form.querySelector('fieldset') : null;
            const writeSubject = writeSurface ? form.querySelector('#subject, input[name="subject"]') : null;
            const writeName = writeSurface ? form.querySelector('#name, input:not([type="hidden"])[name="name"]') : null;
            const writePassword = writeSurface ? form.querySelector('#password, input:not([type="hidden"])[name="password"]') : null;
            const writeCaptcha = writeSurface ? form.querySelector('#code, input:not([type="hidden"])[name="code"]') : null;
            const writeSubjectRow = writeSubject?.closest('tr');
            const writeFieldsTable = writeSubjectRow?.closest('table')
                || [writeName, writePassword, writeCaptcha]
                    .map((field) => field?.closest('table'))
                    .find((table) => table instanceof HTMLTableElement)
                || null;
            const writeIdentityRows = new Set([
                ...[writeName, writePassword, writeCaptcha]
                    .map((field) => field?.closest('tr'))
                    .filter((row) => row instanceof HTMLTableRowElement),
                ...Array.from(writeFieldsTable?.querySelectorAll(':scope > tbody > tr') || [])
                    .filter((row) => row !== writeSubjectRow),
            ]);
            const writeCaptchaPanel = writeCaptcha?.closest('.captcha');
            const writeCaptchaImageShell = form.querySelector('#kcaptcha')?.closest('.kap_codeimg');
            const writeCaptchaImage = writeCaptchaImageShell?.querySelector('#kcaptcha, img')
                || writeCaptchaPanel?.querySelector('.fixture-captcha-image, img');
            const writeHeadtextShell = writeSurface
                ? writeFields?.querySelector(':scope > .write_subject') || form.querySelector('.write_subject')
                : null;
            const writeHeadtextLabel = writeHeadtextShell?.querySelector(':scope > .tit, :scope > .write_subject_label');
            const writeHeadtextList = writeHeadtextShell?.querySelector(':scope > .subject_list');
            const writeHeadtextOptions = Array.from(writeHeadtextList?.querySelectorAll(':scope > li, :scope > button, :scope > [data-headtext]') || []);
            const writeHeadtextStandaloneOptions = Array.from(writeHeadtextShell?.querySelectorAll(':scope > button, :scope > [data-headtext]') || [])
                .filter((option) => option !== writeHeadtextLabel && !writeHeadtextList?.contains(option));
            const writeEditorWrapper = writeSurface ? form.querySelector('.editor_wrap') : null;
            const writeEditorFrame = writeSurface ? form.querySelector('.note-editor') || writeEditorWrapper : null;
            const writeEditorDistinctWrapper = writeEditorWrapper !== writeEditorFrame ? writeEditorWrapper : null;
            const writeEditorArea = writeEditorFrame?.querySelector('.note-editing-area')
                || writeEditorDistinctWrapper?.querySelector('.note-editing-area');
            const writeEditorEditable = writeEditorArea?.querySelector('.note-editable')
                || writeEditorFrame?.querySelector('.note-editable');
            const writeEditorSource = writeEditorArea?.querySelector('.note-codable')
                || writeEditorFrame?.querySelector('.note-codable');
            const writeEditorStatusbar = writeEditorFrame?.querySelector('.note-statusbar')
                || writeEditorDistinctWrapper?.querySelector('.note-statusbar');
            const writeEditorToolbars = writeSurface
                ? Array.from(form.querySelectorAll('.note-toolbar, .note-toolbar-media, .tx-toolbar-basic, .btns-box'))
                    .filter((toolbar) => !toolbar.closest('.note-dropdown-menu, .pop_wrap, .note-popover, .note-modal'))
                : [];
            const writeEditorMode = writeEditorFrame?.matches('.codeview, .fixture-html-mode')
                || (writeEditorEditable?.hidden && writeEditorSource instanceof HTMLElement && !writeEditorSource.hidden)
                ? 'source'
                : 'visual';
            const outsideEditorLayer = (element) => element instanceof HTMLElement
                && !element.closest('.note-dropdown-menu, .pop_wrap, .note-popover, .note-modal');
            const outsideEditorContent = (element) => outsideEditorLayer(element)
                && !element.closest('.note-editable, .note-codable');
            const writeAttachmentCandidates = writeSurface
                ? [...new Set(Array.from(form.querySelectorAll('.fixture-attachment-panel, [class*="file_upload"], .upload-img-lst'))
                    .filter(outsideEditorLayer))]
                : [];
            const writeAttachmentInfos = writeAttachmentCandidates.filter((element) => element.matches('.file_upload_info'));
            const writeAttachmentListShells = writeAttachmentCandidates.filter((element) => element.matches('.upload-img-lst'));
            const writeAttachmentShells = writeAttachmentCandidates.filter((element) => (
                !writeAttachmentInfos.includes(element) && !writeAttachmentListShells.includes(element)
            ));
            const writeAttachmentInputs = writeSurface
                ? Array.from(form.querySelectorAll('input[type="file"]')).filter((input) => (
                    outsideEditorLayer(input)
                    && input.id !== 'prompt_img_file'
                    && !input.closest('.ai_easy_wrap, .ai_easy_box')
                ))
                : [];
            const writeAttachmentLists = writeSurface
                ? [...new Set([
                    ...form.querySelectorAll('.fixture-attachment-list'),
                    ...writeAttachmentListShells.flatMap((shell) => Array.from(shell.querySelectorAll(':scope > ul, ul'))),
                ].filter(outsideEditorLayer))]
                : [];
            const writeAttachmentItems = [...new Set(writeAttachmentLists.flatMap((list) => (
                Array.from(list.children).filter((item) => item instanceof HTMLElement)
            )))];
            const writeSafePresentationElements = writeSurface
                ? Array.from(form.querySelectorAll('*')).filter(outsideEditorContent)
                : [];
            const writePresentationControls = writeSafePresentationElements.filter((element) => (
                element.matches('input, textarea, select, button')
            ));
            const writeDecoyInputs = writeSurface
                ? Array.from(form.querySelectorAll('.dcuf-write-decoy-input, .fixture-decoy-input')).filter(outsideEditorLayer)
                : [];
            const writeSelects = writeSurface
                ? Array.from(form.querySelectorAll('select')).filter((element) => (
                    outsideEditorLayer(element)
                    && !element.closest('.note-toolbar, .note-toolbar-media, .tx-toolbar-basic, .btns-box')
                ))
                : [];
            const writeCurrentFontLabels = writeSurface
                ? Array.from(form.querySelectorAll('.note-toolbar .note-current-fontname')).filter(outsideEditorLayer)
                : [];
            const writeAiShell = writeSurface ? form.querySelector('.ai_easy_wrap') : null;
            const writeAiPanel = writeAiShell?.querySelector(':scope > .ai_easy_box') || null;
            const writeAiInputShell = writeAiPanel?.querySelector(':scope > .ipt_box') || null;
            const writeAiInput = writeAiInputShell?.querySelector(':scope > .ipt_txt') || null;
            const writeAiMedia = writeAiInputShell?.querySelector(':scope > .ipt_img') || null;
            const writeAiSubmit = writeAiPanel?.querySelector(':scope > .btn_aigo') || null;
            const writeAiClose = writeAiPanel?.querySelector(':scope > .btn_close') || null;
            const writeOptionShell = writeSurface ? form.querySelector('#write_option_box') : null;
            const writeOptionContent = writeOptionShell?.querySelector(':scope > .inner') || null;
            const writeOptionControl = writeOptionShell?.querySelector('#btn_pumx') || null;
            const writeAdultControl = writeSurface ? form.querySelector('.fixture-adult') : null;
            const writeAdultInput = writeAdultControl?.querySelector(':scope > input') || null;
            const writeOuterActionRows = writeSurface
                ? [...new Set([
                    ...form.querySelectorAll('.btn_bottom_box, .btm-btns-box'),
                    form.querySelector(':scope > .btn_box.write'),
                ].filter(outsideEditorLayer))]
                : [];
            const writeHiddenChrome = writeSurface
                ? Array.from(form.querySelectorAll('.tx-toolbar-advanced, .write_infobox, .cm_ad, .adv_bottom_write, div[id^="kakao_ad_"]'))
                    .filter(outsideEditorLayer)
                : [];
            const effectivePopupState = passwordSurface || writeSurface ? popupState(shell) : popupState(popup);

            if (writeSurface) {
                markNativeContext(document.documentElement, 'document-root', nativeContextState);
                markNativeContext(document.body, 'page', nativeContextState);
                markNativeContext(document.querySelector('#top.dcwrap'), 'top-shell', nativeContextState);
                markNativeContext(form.closest('#container'), 'page-container', nativeContextState);
                markNativeContext(form.closest('.center_content, .gall_write'), 'content-column', nativeContextState);
                markNativeContext(form.closest('#write_wrap, .write_box'), 'write-shell', nativeContextState);
                markNativeContext(form, 'form', nativeContextState);
                markNativeContext(shell, 'popup-shell', nativeContextState);
                markNativeContext(panel, 'popup-panel', nativeContextState);
                markNativeContext(writePopupHeading, 'popup-heading', nativeContextState);
                markNativeContext(writePopupHeading?.querySelector(':scope > h3'), 'popup-title', nativeContextState);
                markNativeContext(writePopupContent, 'popup-content', nativeContextState);
                markNativeContext(writePopupContent?.querySelector(':scope > .txt'), 'message', nativeContextState);
                markNativeContext(writePopupActions, 'popup-actions', nativeContextState);
                writePopupActions?.querySelectorAll(':scope > button').forEach((action) => {
                    const isCancel = action.matches('.btn_grey, .cancle, [data-host-action="cancel"]');
                    markNativeContext(action, isCancel ? 'popup-cancel' : 'popup-confirm', nativeContextState);
                });
                markNativeContext(writePopupClose, 'popup-close', nativeContextState);
                markNativeContext(writePopupClose?.querySelector(':scope > em'), 'popup-close-icon', nativeContextState);
                markNativeContext(writeFields, 'fields', nativeContextState);
                markNativeContext(writeFields?.querySelector(':scope > legend'), 'fields-legend', nativeContextState);
                markNativeContext(writeFieldsTable, 'fields-table', nativeContextState);
                markNativeContext(writeFieldsTable?.querySelector(':scope > tbody'), 'fields-table-body', nativeContextState);
                writeFields?.querySelectorAll(':scope > [style*="clear"]').forEach((element) => {
                    markNativeContext(element, 'field-clear', nativeContextState);
                });
                markNativeContext(writeSubjectRow, 'subject-row', nativeContextState);
                markNativeContext(writeSubjectRow?.querySelector(':scope > th'), 'subject-label-cell', nativeContextState);
                markNativeContext(writeSubject?.closest('td'), 'subject-control-cell', nativeContextState);
                markNativeContext(writeSubject?.closest('.input_box'), 'subject-field', nativeContextState);
                markNativeContext(writeSubject, 'subject-input', nativeContextState);
                writeIdentityRows.forEach((row) => {
                    markNativeContext(row, 'identity-row', nativeContextState);
                    markNativeContext(row.querySelector(':scope > th'), 'identity-label-cell', nativeContextState);
                    row.querySelectorAll(':scope > td').forEach((cell) => {
                        if (writeCaptcha && cell.contains(writeCaptcha)) {
                            markNativeContext(cell, 'captcha-cell', nativeContextState);
                        } else if ((writeName && cell.contains(writeName)) || (writePassword && cell.contains(writePassword))) {
                            markNativeContext(cell, 'identity-field-cell', nativeContextState);
                        } else {
                            markNativeContext(cell, 'identity-field-cell', nativeContextState);
                        }
                    });
                });
                [writeName, writePassword, writeCaptcha].forEach((field) => {
                    markNativeContext(field?.closest('.input_box'), 'guest-field', nativeContextState);
                });
                markNativeContext(writeName, 'name-input', nativeContextState);
                markNativeContext(writePassword, 'password-input', nativeContextState);
                markNativeContext(writeCaptcha, 'captcha-input', nativeContextState);
                markNativeContext(writeCaptchaPanel, 'captcha-panel', nativeContextState);
                markNativeContext(writeCaptchaPanel?.querySelector(':scope > label'), 'captcha-label', nativeContextState);
                markNativeContext(writeCaptchaImageShell, 'captcha-image-shell', nativeContextState);
                markNativeContext(writeCaptchaImage, 'captcha-image', nativeContextState);
                markNativeContext(writeHeadtextShell, 'headtext-shell', nativeContextState);
                markNativeContext(writeHeadtextLabel, 'headtext-label', nativeContextState);
                markNativeContext(writeHeadtextList, 'headtext-list', nativeContextState);
                [...writeHeadtextOptions, ...writeHeadtextStandaloneOptions].forEach((option) => {
                    markNativeContext(option, 'headtext-option', nativeContextState);
                    setNativeContextAttribute(option, 'data-dcuf-native-form-option-state', option.matches('.sel, .active') ? 'selected' : 'available');
                    option.querySelectorAll(':scope > button').forEach((control) => {
                        markNativeContext(control, 'headtext-option-control', nativeContextState);
                        setNativeContextAttribute(control, 'data-dcuf-native-form-option-state', option.matches('.sel, .active') || control.matches('.sel, .active') ? 'selected' : 'available');
                    });
                    option.querySelectorAll('.tip_box2').forEach((tooltip) => {
                        markNativeContext(tooltip, 'headtext-tooltip', nativeContextState);
                    });
                });
                writeHeadtextShell?.querySelectorAll('.toast, [role="alert"]').forEach((feedback) => {
                    if (!feedback.matches('.tip_box2')) markNativeContext(feedback, 'headtext-feedback', nativeContextState);
                });
                markNativeContext(writeEditorDistinctWrapper, 'editor-wrapper', nativeContextState);
                markNativeContext(writeEditorFrame, 'editor-frame', nativeContextState);
                markNativeContext(writeEditorArea, 'editor-area', nativeContextState);
                markNativeContext(writeEditorEditable, 'editor-editable', nativeContextState);
                markNativeContext(writeEditorSource, 'editor-source', nativeContextState);
                markNativeContext(writeEditorStatusbar, 'editor-statusbar', nativeContextState);
                setNativeContextAttribute(writeEditorFrame, 'data-dcuf-native-form-editor-mode', writeEditorMode);
                writeEditorToolbars.forEach((toolbar) => {
                    const toolbarKinds = [
                        toolbar.matches('.note-toolbar') ? 'primary' : '',
                        toolbar.matches('.note-toolbar-media') ? 'media' : '',
                        toolbar.matches('.tx-toolbar-basic') ? 'basic' : '',
                        toolbar.matches('.btns-box') ? 'button-box' : '',
                    ].filter(Boolean);
                    const horizontal = toolbar.matches('.note-toolbar, .note-toolbar-media, .tx-toolbar-basic');
                    markNativeContext(toolbar, 'editor-toolbar', nativeContextState);
                    setNativeContextAttribute(toolbar, 'data-dcuf-native-form-toolbar-kind', toolbarKinds.join(' '));
                    setNativeContextAttribute(toolbar, 'data-dcuf-native-form-toolbar-scroll', horizontal ? 'horizontal' : 'wrap');

                    toolbar.querySelectorAll('.note-btn-group, .note-mybutton').forEach((group) => {
                        if (group.closest('.note-toolbar, .note-toolbar-media, .tx-toolbar-basic, .btns-box') !== toolbar) return;
                        if (group.closest('.note-dropdown-menu, .pop_wrap, .note-popover, .note-modal')) return;
                        const htmlToggleGroup = group.matches('.fixture-html-group') || group.querySelector('#chk_html');
                        markNativeContext(group, htmlToggleGroup ? 'editor-html-toggle-group' : 'editor-toolbar-group', nativeContextState);
                        if (group.parentElement === toolbar) setNativeContextAttribute(group, 'data-dcuf-native-form-toolbar-item', '1');
                    });

                    toolbar.querySelectorAll('.write-html-toggle, label:has(#chk_html)').forEach((label) => {
                        if (label.closest('.note-dropdown-menu, .pop_wrap, .note-popover, .note-modal')) return;
                        markNativeContext(label, 'editor-html-toggle-label', nativeContextState);
                    });
                    toolbar.querySelectorAll('#chk_html').forEach((input) => {
                        if (input.closest('.note-dropdown-menu, .pop_wrap, .note-popover, .note-modal')) return;
                        markNativeContext(input, 'editor-html-toggle-input', nativeContextState);
                    });

                    toolbar.querySelectorAll('button, input[type="button"], select, .note-btn-group > a, .note-btn-group > span').forEach((control) => {
                        if (control.closest('.note-toolbar, .note-toolbar-media, .tx-toolbar-basic, .btns-box') !== toolbar) return;
                        if (control.closest('.note-dropdown-menu, .pop_wrap, .note-popover, .note-modal')) return;
                        const htmlToggleControl = control.matches('#chk_html') || Boolean(control.querySelector?.('#chk_html'));
                        const tokens = ['ordinary'];
                        if (control.matches('.note-btn-danger')) tokens.push('danger');
                        if (htmlToggleControl) tokens.push('html-toggle');
                        if (control.closest('.note-fontname')) tokens.push('fontname');
                        const states = [];
                        if (control.matches('.active, [aria-pressed="true"]') || control.closest('.note-btn-group.open')) states.push('active');
                        if (control.matches(':disabled, [aria-disabled="true"]')) states.push('disabled');
                        markNativeContext(control, htmlToggleControl ? 'editor-html-toggle-control' : 'editor-toolbar-control', nativeContextState);
                        setNativeContextAttribute(control, 'data-dcuf-native-form-toolbar-control', tokens.join(' '));
                        setNativeContextAttribute(control, 'data-dcuf-native-form-control-state', states.join(' '));
                        if (control.parentElement === toolbar) setNativeContextAttribute(control, 'data-dcuf-native-form-toolbar-item', '1');
                        control.querySelectorAll('*').forEach((content) => {
                            if (!content.closest('.note-dropdown-menu, .pop_wrap, .note-popover, .note-modal')) {
                                setNativeContextAttribute(content, 'data-dcuf-native-form-toolbar-content', '1');
                            }
                        });
                    });

                    Array.from(toolbar.children).forEach((item) => {
                        if (item.matches('.note-dropdown-menu, .pop_wrap, .note-popover, .note-modal')) return;
                        setNativeContextAttribute(item, 'data-dcuf-native-form-toolbar-item', '1');
                    });
                });
                writeAttachmentShells.forEach((element) => markNativeContext(element, 'attachment-shell', nativeContextState));
                writeAttachmentInfos.forEach((element) => markNativeContext(element, 'attachment-info', nativeContextState));
                writeAttachmentListShells.forEach((element) => markNativeContext(element, 'attachment-list-shell', nativeContextState));
                writeAttachmentInputs.forEach((element) => markNativeContext(element, 'attachment-input', nativeContextState));
                writeAttachmentLists.forEach((element) => markNativeContext(element, 'attachment-list', nativeContextState));
                writeAttachmentItems.forEach((element) => markNativeContext(element, 'attachment-item', nativeContextState));
                writeDecoyInputs.forEach((element) => markNativeContext(element, 'decoy-input', nativeContextState));
                writeSelects.forEach((element) => markNativeContext(element, 'form-select', nativeContextState));
                writeCurrentFontLabels.forEach((element) => markNativeContext(element, 'editor-font-label', nativeContextState));
                markNativeContext(writeAiShell, 'ai-prompt-shell', nativeContextState);
                markNativeContext(writeAiPanel, 'ai-prompt', nativeContextState);
                markNativeContext(writeAiInputShell, 'ai-prompt-input-shell', nativeContextState);
                markNativeContext(writeAiInput, 'ai-prompt-input', nativeContextState);
                markNativeContext(writeAiMedia, 'ai-prompt-media', nativeContextState);
                markNativeContext(writeAiSubmit, 'ai-prompt-submit', nativeContextState);
                markNativeContext(writeAiClose, 'ai-prompt-close', nativeContextState);
                markNativeContext(writeOptionShell, 'write-option-shell', nativeContextState);
                markNativeContext(writeOptionContent, 'write-option-content', nativeContextState);
                markNativeContext(writeOptionControl, 'write-option-control', nativeContextState);
                if (writeOptionControl instanceof HTMLElement) {
                    setNativeContextAttribute(writeOptionControl, 'data-dcuf-native-form-control-state',
                        writeOptionControl.matches('.on, [aria-pressed="true"]') ? 'active' : 'inactive');
                }
                markNativeContext(writeAdultControl, 'adult-control', nativeContextState);
                markNativeContext(writeAdultInput, 'adult-input', nativeContextState);
                writeOuterActionRows.forEach((row) => {
                    markNativeContext(row, 'outer-actions', nativeContextState);
                    Array.from(row.children).forEach((item) => {
                        if (!(item instanceof HTMLElement) || item === shell || !outsideEditorLayer(item)) return;
                        const directAction = item.matches('a, button, input[type="button"], input[type="submit"]');
                        markNativeContext(item, directAction ? (
                            item.matches('.btn_blue, .btn-line-blue, [type="submit"]')
                                ? 'outer-action-primary'
                                : 'outer-action-secondary'
                        ) : 'outer-action-item', nativeContextState);
                        if (!directAction) {
                            item.querySelectorAll(':scope > a, :scope > button, :scope > input[type="button"], :scope > input[type="submit"]').forEach((action) => {
                                markNativeContext(action, action.matches('.btn_blue, .btn-line-blue, [type="submit"]')
                                    ? 'outer-action-primary'
                                    : 'outer-action-secondary', nativeContextState);
                            });
                        }
                    });
                });
                writeHiddenChrome.forEach((element) => markNativeContext(element, 'hidden-chrome', nativeContextState));
                writeSafePresentationElements.forEach((element) => {
                    markNativePresentationProperty(element, 'data-dcuf-native-form-box-sizing', 'border-box');
                });
                writePresentationControls.forEach((element) => {
                    markNativePresentationProperty(element, 'data-dcuf-native-form-control-kind', element.localName);
                });
            } else if (nativeContextState) {
                const page = document.body;
                const container = form.closest('#container');
                const section = form.closest('section');
                const header = section?.querySelector(':scope > header.page_head');
                const content = form.querySelector(':scope > article');
                markNativeContext(page, 'page', nativeContextState);
                markNativeContext(container, 'page-container', nativeContextState);
                markNativeContext(section, 'page-section', nativeContextState);
                markNativeContext(header, 'page-header', nativeContextState);
                markNativeContext(form, 'form', nativeContextState);
                markNativeContext(content, 'content', nativeContextState);
                markNativeContext(shell, 'popup-shell', nativeContextState);
                markNativeContext(popup, 'popup', nativeContextState);
                markNativeContext(panel, 'panel', nativeContextState);
                markNativeContext(panel?.querySelector(':scope > .inner'), 'message-shell', nativeContextState);
                markNativeContext(panel?.querySelector('.txt, p'), 'message', nativeContextState);
                markNativeContext(actions, 'actions', nativeContextState);
                document.querySelectorAll('footer.dcfoot, #data_info').forEach((element) => {
                    markNativeContext(element, 'trailing-chrome', nativeContextState);
                });
            }

            mark(shell, 'native-popup-shell', effectivePopupState);
            mark(popup, 'native-popup', effectivePopupState);
            if (kind === 'delete-confirm' && popup instanceof HTMLElement) {
                toggleClass(popup, 'dcuf-delete-confirm-card', true);
            }
            if (writeSurface && popup instanceof HTMLElement) {
                toggleClass(popup, 'dcuf-write-leave-confirm', true);
            }
            mark(panel, 'native-form-panel');
            if (kind === 'delete-confirm' && panel instanceof HTMLElement) {
                toggleClass(panel, 'dcuf-delete-confirm-content', true);
            }
            mark(panel?.querySelector('.txt, p'), 'native-form-message');
            mark(actions, 'native-form-actions');

            form.querySelectorAll('input[type="hidden"]').forEach((field) => mark(field, 'native-hidden-field'));
            form.querySelectorAll('input:not([type="hidden"]), textarea, select').forEach((field) => {
                const isPassword = field instanceof HTMLInputElement && field.type === 'password';
                mark(field, isPassword ? 'native-password-field' : 'native-form-field');
                if (isPassword && nativeContextState && !writeSurface) {
                    markNativeContext(field, 'password-field', nativeContextState);
                }
                if (isPassword && passwordSurface) {
                    setAttribute(field, 'autocomplete', 'current-password');
                    if (!field.getAttribute('aria-label')) setAttribute(field, 'aria-label', '비밀번호');
                }
            });
            actions?.querySelectorAll('button, input[type="button"], input[type="submit"]').forEach((action) => {
                const isCancel = action.matches('.btn_grey, .cancle, [data-host-action="cancel"]');
                mark(action, isCancel ? 'native-cancel' : 'native-submit');
                if (nativeContextState && !writeSurface) {
                    markNativeContext(action, isCancel ? 'cancel' : 'submit', nativeContextState);
                }
            });
        };

        const fieldObservation = (field) => ({
            tag: field.localName,
            type: field.getAttribute('type') || field.localName,
            name: field.getAttribute('name') || '',
            populated: 'value' in field ? String(field.value || '').length > 0 : false,
            valueLength: 'value' in field ? String(field.value || '').length : 0,
            checked: field instanceof HTMLInputElement ? field.checked : false,
            disabled: Boolean(field.disabled),
            required: Boolean(field.required),
            autocomplete: field.getAttribute('autocomplete') || '',
        });

        const snapshotSurface = (form = activeForm) => {
            if (!(form instanceof HTMLFormElement) || form !== activeForm) return null;
            const popup = form.querySelector('[data-dcuf-role="native-popup"]');
            const fields = Array.from(form.querySelectorAll('input, textarea, select')).map(fieldObservation);
            const actions = Array.from(form.querySelectorAll('[data-dcuf-role="native-cancel"], [data-dcuf-role="native-submit"]')).map((action) => ({
                role: action.getAttribute('data-dcuf-role'),
                tag: action.localName,
                type: action.getAttribute('type') || '',
                name: action.getAttribute('name') || '',
                value: action.getAttribute('value') || '',
                text: action.textContent.replace(/\s+/g, ' ').trim(),
                index: Array.from(action.parentElement?.children || []).indexOf(action),
            }));
            return deepFreeze({
                surface: SURFACE_ID,
                route: activeRoute,
                kind: activeKind,
                popupState: popupState(popup),
                form: {
                    id: form.getAttribute('id') || '',
                    name: form.getAttribute('name') || '',
                    method: form.getAttribute('method') || '',
                    action: form.getAttribute('action') || '',
                    enctype: form.getAttribute('enctype') || '',
                    target: form.getAttribute('target') || '',
                    onsubmit: form.getAttribute('onsubmit') || '',
                },
                fields,
                hiddenFieldNames: fields.filter((field) => field.type === 'hidden').map((field) => field.name),
                actions,
                focusedRole: form.contains(document.activeElement)
                    ? document.activeElement?.getAttribute?.('data-dcuf-role') || 'unmarked'
                    : 'outside',
            });
        };

        const snapshotCurrent = () => {
            if (activeForm instanceof HTMLFormElement) return snapshotSurface(activeForm);
            return deepFreeze({
                surface: SURFACE_ID,
                route: activeRoute,
                kind: activeKind,
                popupState: 'absent',
                form: null,
                fields: [],
                hiddenFieldNames: [],
                actions: [],
                focusedRole: 'outside',
            });
        };

        const connect = () => {
            const discovered = discover();
            if (discovered.kind === 'unsupported') {
                if (transaction.size > 0) restoreAll();
                return null;
            }
            if (activeForm !== discovered.form || activeRoute !== discovered.route) restoreAll();
            activeForm = discovered.form;
            activeKind = discovered.kind;
            activeRoute = discovered.route;
            if (activeForm instanceof HTMLFormElement) restoreFormDescendants(activeForm);
            applyCompatibilityState(discovered);
            markSurface(discovered);
            requestedPresentationKeys.forEach((key) => mountPresentation(key));
            return snapshotCurrent();
        };

        const refresh = () => connect();

        const refreshFromMutation = (payload) => {
            if (!['write', 'modify', 'delete'].includes(pageType())) return null;
            const candidates = [
                ...(payload?.attributeTargets || []),
                ...(payload?.addedElements || []),
                ...(payload?.removedElements || []),
                ...(payload?.childListTargets || []),
            ];
            const relevant = candidates.some((candidate) => {
                const element = candidate instanceof Element ? candidate : candidate?.parentElement;
                if (!(element instanceof Element)) return false;
                return element === activeForm
                    || activeForm?.contains(element)
                    || element.matches('form#write, form#delete, form[name="modify"], form[name="password_confirm"], form[name="delete"], .no_memberwrap, .empty_pagewrap, .pop_wrap.type5')
                    || element.closest('form#write, form#delete, form[name="modify"], form[name="password_confirm"], form[name="delete"]') instanceof HTMLFormElement;
            });
            return relevant ? refresh() : snapshotCurrent();
        };

        const invokeNative = (target, action = 'click') => {
            if (!(target instanceof HTMLElement)) return false;
            if (action === 'click') {
                target.click();
                return true;
            }
            if (action === 'focus') {
                target.focus();
                return document.activeElement === target;
            }
            if (action === 'submit') {
                const form = target instanceof HTMLFormElement ? target : target.closest('form');
                if (!(form instanceof HTMLFormElement)) return false;
                const submitter = target instanceof HTMLButtonElement && target.type === 'submit' ? target : undefined;
                form.requestSubmit(submitter);
                return true;
            }
            return false;
        };

        const clearPendingPresentationListener = (key) => {
            const listener = pendingPresentationListeners.get(key);
            if (!listener) return;
            document.removeEventListener('DOMContentLoaded', listener);
            pendingPresentationListeners.delete(key);
        };

        const mountPresentation = (key) => {
            const payload = __dcufRoot.__dcufNativeFormPresenter?.getStyle?.(key);
            if (!payload) return null;
            requestedPresentationKeys.add(key);
            const mounted = presentationStyles.get(key);
            if (mounted?.element?.isConnected) return mounted.element;

            const inject = () => {
                clearPendingPresentationListener(key);
                const existing = document.getElementById(payload.id);
                if (existing instanceof Element) {
                    presentationStyles.set(key, { element: existing, owned: false });
                    return existing;
                }
                const target = document.head || document.documentElement;
                if (!target) return null;
                const style = document.createElement('style');
                style.id = payload.id;
                style.textContent = payload.css;
                target.appendChild(style);
                presentationStyles.set(key, { element: style, owned: true });
                return style;
            };

            const injected = inject();
            if (injected || pendingPresentationListeners.has(key)) return injected;
            const listener = () => inject();
            pendingPresentationListeners.set(key, listener);
            document.addEventListener('DOMContentLoaded', listener, { once: true });
            return null;
        };

        const unmountPresentation = (key = null) => {
            const keys = key ? [key] : [
                ...new Set([...presentationStyles.keys(), ...pendingPresentationListeners.keys()]),
            ];
            keys.forEach((styleKey) => {
                clearPendingPresentationListener(styleKey);
                const mounted = presentationStyles.get(styleKey);
                if (mounted?.owned && mounted.element?.isConnected) mounted.element.remove();
                presentationStyles.delete(styleKey);
            });
        };

        const snapshotResources = () => Object.freeze({
            activeRoots: activeForm instanceof HTMLFormElement && activeForm.isConnected ? 1 : 0,
            trackedElements: transaction.size,
            observers: 0,
            listeners: pendingPresentationListeners.size,
            timers: 0,
            animationFrames: 0,
            presentationStyleOwners: Array.from(presentationStyles.values())
                .filter(({ element }) => element?.isConnected).length,
        });

        const dispose = () => {
            unmountPresentation();
            restoreAll();
        };

        return Object.freeze({
            connect,
            refresh,
            refreshFromMutation,
            dispose,
            invokeNative,
            mountPresentation,
            unmountPresentation,
            snapshotSurface,
            snapshotResources,
        });
    })();
    __dcufRoot.__dcufNativeFormHostAdapter = __dcufNativeFormHostAdapter;
