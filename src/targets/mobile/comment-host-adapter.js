    const __dcufCommentHostAdapter = (() => {
        const SEMANTIC_ATTRIBUTES = Object.freeze([
            'data-dcuf-surface',
            'data-dcuf-role',
            'data-dcuf-state',
            'data-dcuf-comment-role',
            'data-dcuf-comment-state',
        ]);
        const ROOT_SELECTOR = '#focus_cmt, .view_comment.image_comment, div[id^="comment_wrap_"]';
        const transactions = new WeakMap();
        const activeRoots = new Set();
        let presentationStyleElement = null;

        const deepFreeze = (value) => {
            if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
            Object.values(value).forEach(deepFreeze);
            return Object.freeze(value);
        };

        const isCommentRoot = (candidate) => candidate instanceof HTMLElement
            && candidate.matches(ROOT_SELECTOR)
            && candidate.querySelector('.comment_box, .cmt_write_box') instanceof HTMLElement
            && (!candidate.matches('div[id^="comment_wrap_"]')
                || !candidate.parentElement?.closest('#focus_cmt, .view_comment.image_comment'));

        const collectRoots = (root = document) => {
            const scope = root instanceof Document || root instanceof Element || root instanceof DocumentFragment ? root : document;
            const roots = [];
            const seen = new Set();
            const add = (candidate) => {
                if (!isCommentRoot(candidate) || seen.has(candidate)) return;
                seen.add(candidate);
                roots.push(candidate);
            };
            if (scope instanceof Element) {
                add(scope);
                add(scope.closest(ROOT_SELECTOR));
            }
            scope.querySelectorAll?.(ROOT_SELECTOR).forEach(add);
            return roots;
        };

        const getTransaction = (root) => {
            let transaction = transactions.get(root);
            if (!transaction) {
                transaction = new Map();
                transactions.set(root, transaction);
            }
            return transaction;
        };

        const restoreElement = (element, snapshot) => {
            if (!(element instanceof HTMLElement) || !snapshot) return;
            SEMANTIC_ATTRIBUTES.forEach((name) => {
                const value = snapshot[name];
                if (value === null) element.removeAttribute(name);
                else element.setAttribute(name, value);
            });
        };

        const remember = (root, element) => {
            if (!(root instanceof HTMLElement) || !(element instanceof HTMLElement)) return null;
            const transaction = getTransaction(root);
            if (!transaction.has(element)) {
                transaction.set(element, Object.fromEntries(
                    SEMANTIC_ATTRIBUTES.map((name) => [name, element.getAttribute(name)])
                ));
            }
            return element;
        };

        const mark = (root, element, { surface, role, state } = {}) => {
            if (!remember(root, element)) return null;
            if (surface) element.setAttribute('data-dcuf-surface', surface);
            if (role) element.setAttribute('data-dcuf-role', role);
            if (state) element.setAttribute('data-dcuf-state', state);
            else if (state === '') element.removeAttribute('data-dcuf-state');
            return element;
        };

        const markAll = (root, selector, role, resolveState = null) => {
            root.querySelectorAll(selector).forEach((element) => {
                mark(root, element, {
                    role,
                    state: typeof resolveState === 'function' ? resolveState(element) : undefined,
                });
            });
        };

        const markCommentContext = (root, element, role, state = '') => {
            if (!remember(root, element)) return null;
            element.setAttribute('data-dcuf-comment-role', role);
            if (state) element.setAttribute('data-dcuf-comment-state', state);
            else element.removeAttribute('data-dcuf-comment-state');
            return element;
        };

        const pruneDetachedElements = (root) => {
            const transaction = transactions.get(root);
            if (!transaction) return;
            Array.from(transaction.entries()).forEach(([element, snapshot]) => {
                if (element === root || root.contains(element)) return;
                restoreElement(element, snapshot);
                transaction.delete(element);
            });
        };

        const ensurePresentationStyle = () => {
            const existing = document.getElementById(__dcufCommentPresenter.STYLE_ID);
            if (existing) return existing;
            const target = document.head || document.documentElement;
            if (!target) return null;
            const style = document.createElement('style');
            style.id = __dcufCommentPresenter.STYLE_ID;
            style.textContent = __dcufCommentPresenter.cssText;
            target.appendChild(style);
            presentationStyleElement = style;
            return style;
        };

        const itemState = (item, fallback) => {
            if (item.getAttribute('data-dcuf-comment-shell-blocked') === '1' || item.classList.contains('dcuf-comment-shell-blocked')) {
                return 'blocked-parent';
            }
            if (item.style.display === 'none') return 'hidden';
            return fallback;
        };

        const markCommentItems = (root) => {
            root.querySelectorAll('.cmt_list > li').forEach((item) => {
                const inReplyList = item.parentElement?.classList.contains('reply_list');
                const hasDirectInfo = item.querySelector(':scope > .cmt_info, :scope > .reply_info') instanceof HTMLElement;
                const hasDetachedReply = item.querySelector(':scope > .reply.show') instanceof HTMLElement && !hasDirectInfo;
                const role = inReplyList || item.id.startsWith('reply_li_') && !hasDetachedReply
                    ? 'reply-item'
                    : hasDetachedReply
                        ? 'detached-reply-item'
                        : 'comment-item';
                mark(root, item, { role, state: itemState(item, role === 'reply-item' ? 'reply' : role === 'comment-item' ? 'parent' : 'detached') });
            });
            markAll(root, '.reply_list > li', 'reply-item', (item) => itemState(item, 'reply'));
            markAll(root, '.cmt_info', 'comment-info');
            markAll(root, '.reply_info', 'reply-info');
            markAll(root, '.cmt_nickbox', 'comment-author-group');
            root.querySelectorAll('.gall_writer, .nickname').forEach((author) => markCommentContext(
                root,
                author,
                'author',
                author.classList.contains('me') || author.querySelector('.nickname.me') ? 'self' : 'other'
            ));
            markAll(root, '.cmt_info > .fr, .reply_info > .fr, .date_time, .ip, .txt_del, .cmt_mdf_del', 'comment-meta');
            markAll(root, '.cmt_txtbox', 'comment-body');
            root.querySelectorAll('.reply_list .cmt_txtbox').forEach((body) => mark(root, body, { role: 'reply-body' }));
            markAll(root, '.usertxt', 'comment-text');
            markAll(root, '.comment_dccon, .cmt_txtbox img', 'comment-media');
            markAll(root, '.reply.show', 'reply-shell', (reply) => (
                reply.hidden || reply.style.display === 'none' || !reply.classList.contains('show') ? 'closed' : 'open'
            ));
            markAll(root, '.reply_box', 'reply-box');
            markAll(root, '.reply_list', 'reply-list');
        };

        const composerState = (composer) => {
            if (composer.classList.contains('small') || composer.closest('.reply_box')) return 'reply';
            if (composer.closest('.view_comment.image_comment')) return 'image';
            return 'main';
        };

        const markComposers = (root) => {
            root.querySelectorAll('.cmt_write_box').forEach((composer) => {
                mark(root, composer, { role: 'comment-composer', state: composerState(composer) });
                mark(root, composer.querySelector(':scope > .fl, .user_info_input'), { role: 'comment-identity-fields' });
                mark(root, composer.querySelector('.cmt_txt_cont'), { role: 'comment-editor' });
                mark(root, composer.querySelector('.cmt_cont_bottm, .cmt_btn_bot'), { role: 'comment-composer-actions' });
                composer.querySelectorAll('input:not([type="hidden"]), select').forEach((field) => mark(root, field, { role: 'native-comment-field' }));
                composer.querySelectorAll('textarea').forEach((field) => mark(root, field, { role: 'native-comment-textarea' }));
                composer.querySelectorAll('button, input[type="submit"]').forEach((action) => mark(root, action, { role: 'native-comment-submit' }));
            });
        };

        const markRoot = (root) => {
            ensurePresentationStyle();
            activeRoots.add(root);
            pruneDetachedElements(root);
            mark(root, root, {
                surface: 'comments-replies',
                role: 'comments-root',
                state: document.body?.classList.contains('dc-filter-dark-mode') ? 'dark' : 'ready',
            });
            root.querySelectorAll('.comment_wrap, div[id^="comment_wrap_"]').forEach((wrapper) => {
                const image = Boolean(wrapper.closest('.view_comment.image_comment'));
                mark(root, wrapper, {
                    role: 'comment-wrapper',
                    state: `${image ? 'image-' : ''}${wrapper.classList.contains('show') ? 'open' : 'closed'}`,
                });
            });
            markAll(root, '.comment_count, .comment_top', 'comment-header');
            markAll(root, '.comment_count .num_box, .comment_top .num_box', 'comment-count');
            markAll(root, '.comment_count .font_red, .comment_top .font_red', 'comment-count-accent');
            markAll(root, '.comment_count > .fr, .comment_top > .fr', 'comment-header-actions');
            markAll(root, '.comment_count button, .comment_count a, .comment_top button, .comment_top a', 'native-comment-header-action');
            markAll(root, '.comment_box', 'comment-box', (box) => box.classList.contains('img_comment_box') ? 'image' : 'standard');
            markAll(root, '.cmt_list', 'comment-list');
            markCommentItems(root);
            markComposers(root);
            markAll(root, '#user_data_lyr, .user_data, .user_data_add, .pop_wrap.type2, .pop_wrap.type3, .cmt_delpw_box, [id$="_delpw_box"]', 'native-comment-popup', (popup) => (
                popup.hidden || popup.style.display === 'none' ? 'closed' : 'open'
            ));
            return root;
        };

        const disposeRoot = (root) => {
            if (!(root instanceof HTMLElement)) return;
            const transaction = transactions.get(root);
            if (transaction) {
                Array.from(transaction.entries()).reverse().forEach(([element, snapshot]) => restoreElement(element, snapshot));
                transaction.clear();
                transactions.delete(root);
            }
            activeRoots.delete(root);
        };

        const pruneRoots = () => {
            Array.from(activeRoots).forEach((root) => {
                if (!root.isConnected || !isCommentRoot(root)) disposeRoot(root);
            });
        };

        const connect = (root = document) => {
            pruneRoots();
            return collectRoots(root).map(markRoot).filter(Boolean);
        };

        const refresh = (root = document) => connect(root);

        const refreshFromMutation = (payload) => {
            const candidates = [
                ...(payload?.attributeTargets || []),
                ...(payload?.addedElements || []),
                ...(payload?.removedElements || []),
                ...(payload?.childListTargets || []),
            ];
            const relevant = candidates.some((candidate) => {
                const element = candidate instanceof Element ? candidate : candidate?.parentElement;
                if (!(element instanceof Element)) return false;
                return element.matches(ROOT_SELECTOR)
                    || element.closest(ROOT_SELECTOR) instanceof HTMLElement
                    || element.querySelector?.(ROOT_SELECTOR) instanceof HTMLElement;
            });
            return relevant ? refresh(document) : [];
        };

        const describeField = (field) => ({
            tag: field.localName,
            type: field.getAttribute('type'),
            name: field.getAttribute('name'),
            value: field.value,
        });

        const snapshotSurface = (root) => {
            if (!isCommentRoot(root)) return null;
            return deepFreeze({
                route: window.location.pathname,
                state: root.getAttribute('data-dcuf-state'),
                kind: root.id === 'focus_cmt'
                    ? 'focus'
                    : root.matches('.view_comment.image_comment')
                        ? 'image'
                        : 'standalone',
                wrappers: Array.from(root.querySelectorAll('[data-dcuf-role="comment-wrapper"]')).map((wrapper) => wrapper.getAttribute('data-dcuf-state')),
                items: Array.from(root.querySelectorAll('[data-dcuf-role="comment-item"], [data-dcuf-role="detached-reply-item"], [data-dcuf-role="reply-item"]')).map((item) => ({
                    id: item.id,
                    role: item.getAttribute('data-dcuf-role'),
                    state: item.getAttribute('data-dcuf-state'),
                    parentId: item.parentElement?.id || '',
                    text: item.textContent.replace(/\s+/g, ' ').trim(),
                })),
                fields: Array.from(root.querySelectorAll('input, select, textarea')).map(describeField),
                actions: Array.from(root.querySelectorAll('button, input[type="submit"]')).map((action) => ({
                    tag: action.localName,
                    type: action.getAttribute('type'),
                    name: action.getAttribute('name'),
                    value: action.getAttribute('value'),
                    text: action.textContent.trim(),
                })),
            });
        };

        const invokeNative = (target, action = 'click') => {
            if (!(target instanceof HTMLElement)) return false;
            if (action === 'click') {
                target.click();
                return true;
            }
            if (action === 'submit') {
                const form = target instanceof HTMLFormElement ? target : target.closest('form');
                if (!(form instanceof HTMLFormElement)) return false;
                form.requestSubmit();
                return true;
            }
            return false;
        };

        const snapshotResources = () => {
            pruneRoots();
            let trackedElements = 0;
            activeRoots.forEach((root) => {
                pruneDetachedElements(root);
                trackedElements += transactions.get(root)?.size || 0;
            });
            return Object.freeze({
                activeRoots: activeRoots.size,
                trackedElements,
                observers: 0,
                listeners: 0,
                timers: 0,
                animationFrames: 0,
                presentationStyleOwners: document.getElementById(__dcufCommentPresenter.STYLE_ID) ? 1 : 0,
            });
        };

        const dispose = (root = null) => {
            if (root instanceof HTMLElement && activeRoots.has(root)) {
                disposeRoot(root);
                return;
            }
            Array.from(activeRoots).forEach(disposeRoot);
            if (presentationStyleElement?.isConnected) presentationStyleElement.remove();
            presentationStyleElement = null;
        };

        return Object.freeze({
            connect,
            refresh,
            refreshFromMutation,
            dispose,
            invokeNative,
            snapshotSurface,
            snapshotResources,
        });
    })();
    __dcufRoot.__dcufCommentHostAdapter = __dcufCommentHostAdapter;
