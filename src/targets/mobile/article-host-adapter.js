    const __dcufArticleHostAdapter = (() => {
        const SEMANTIC_ATTRIBUTES = Object.freeze([
            'data-dcuf-surface',
            'data-dcuf-role',
            'data-dcuf-state',
        ]);
        const ARTICLE_ROOT_SELECTOR = '.view_content_wrap';
        const ARTICLE_SIGNAL_SELECTOR = '.gallview_contents, .writing_view_box, .btn_recommend_box';
        const RECOMMEND_SELECTOR = '.btn_recommend_box';
        const PUM_TRIGGER_SELECTOR = '.btn_recommend_box .btn_cloned';
        const PUM_POPUP_SELECTOR = '#write_pum_layer.pop_wrap';
        const PUM_STYLE_ID = 'dcuf-pum-layer-viewport-style';
        const PUM_POSITIONED_CLASS = 'dcuf-pum-layer-viewport-safe';
        const transactions = new WeakMap();
        const activeRoots = new Set();
        const pumTransactions = new Map();
        const pumTimerIds = new Set();
        let pumStyleElement = null;
        let presentationStyleElement = null;
        let pumClickBound = false;
        let lifecycleBound = false;
        let pumRafId = 0;

        const deepFreeze = (value) => {
            if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
            Object.values(value).forEach(deepFreeze);
            return Object.freeze(value);
        };

        const isArticleRoot = (candidate) => candidate instanceof HTMLElement
            && candidate.matches(ARTICLE_ROOT_SELECTOR)
            && candidate.querySelector(ARTICLE_SIGNAL_SELECTOR) instanceof HTMLElement;

        const collectArticleRoots = (root = document) => {
            const queryRoot = root instanceof Document || root instanceof Element || root instanceof DocumentFragment
                ? root
                : document;
            const roots = [];
            const seen = new Set();
            const add = (candidate) => {
                if (!isArticleRoot(candidate) || seen.has(candidate)) return;
                seen.add(candidate);
                roots.push(candidate);
            };
            if (queryRoot instanceof Element) {
                add(queryRoot);
                add(queryRoot.closest(ARTICLE_ROOT_SELECTOR));
            }
            queryRoot.querySelectorAll?.(ARTICLE_ROOT_SELECTOR).forEach(add);
            return roots;
        };

        const getTransaction = (articleRoot) => {
            let transaction = transactions.get(articleRoot);
            if (!transaction) {
                transaction = new Map();
                transactions.set(articleRoot, transaction);
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

        const getActionBars = (articleRoot) => {
            const bars = Array.from(articleRoot.querySelectorAll('.view_bottom_btnbox'));
            const adjacentBar = articleRoot.parentElement?.querySelector(':scope > .view_bottom_btnbox');
            if (adjacentBar instanceof HTMLElement && !bars.includes(adjacentBar)) bars.push(adjacentBar);
            return bars;
        };

        const belongsToArticleSurface = (articleRoot, element) => {
            if (articleRoot.contains(element)) return true;
            const actionBar = element.matches?.('.view_bottom_btnbox')
                ? element
                : element.closest?.('.view_bottom_btnbox');
            return actionBar instanceof HTMLElement && getActionBars(articleRoot).includes(actionBar);
        };

        const remember = (articleRoot, element) => {
            if (!(articleRoot instanceof HTMLElement) || !(element instanceof HTMLElement)) return null;
            const transaction = getTransaction(articleRoot);
            if (!transaction.has(element)) {
                transaction.set(element, Object.fromEntries(
                    SEMANTIC_ATTRIBUTES.map((name) => [name, element.getAttribute(name)])
                ));
            }
            return element;
        };

        const mark = (articleRoot, element, { surface, role, state } = {}) => {
            if (!remember(articleRoot, element)) return null;
            if (surface) element.setAttribute('data-dcuf-surface', surface);
            if (role) element.setAttribute('data-dcuf-role', role);
            if (state) element.setAttribute('data-dcuf-state', state);
            return element;
        };

        const pruneDetachedElements = (articleRoot) => {
            const transaction = transactions.get(articleRoot);
            if (!transaction) return;
            Array.from(transaction.entries()).forEach(([element, snapshot]) => {
                if (element === articleRoot || belongsToArticleSurface(articleRoot, element)) return;
                restoreElement(element, snapshot);
                transaction.delete(element);
            });
        };

        const markRecommendation = (articleRoot, recommendBox) => {
            if (!(recommendBox instanceof HTMLElement)) return;
            const captcha = recommendBox.querySelector('.recommend_kapcode');
            mark(articleRoot, recommendBox, {
                surface: 'article-recommendation',
                role: 'recommendation',
                state: captcha instanceof HTMLElement ? 'captcha' : 'ready',
            });
            const score = recommendBox.querySelector('.inner_box');
            mark(articleRoot, score, { role: 'recommendation-score' });
            score?.querySelectorAll(':scope > .inner').forEach((group) => {
                mark(articleRoot, group, {
                    role: 'recommendation-vote-group',
                    state: group.querySelector('.btn_recom_up') ? 'up' : 'down',
                });
            });
            mark(articleRoot, recommendBox.querySelector('.up_num_box'), { role: 'recommendation-up-count-group' });
            mark(articleRoot, recommendBox.querySelector('.down_num_box'), { role: 'recommendation-down-count-group' });
            mark(articleRoot, recommendBox.querySelector('.btn_recom_up'), { role: 'native-recommend-up' });
            mark(articleRoot, recommendBox.querySelector('.btn_recom_down'), { role: 'native-recommend-down' });
            mark(articleRoot, recommendBox.querySelector('.btn_recom_up > .icon_recom_up'), { role: 'recommend-up-icon' });
            recommendBox.querySelectorAll('.up_num, .down_num').forEach((count) => mark(articleRoot, count, { role: 'recommendation-count' }));
            recommendBox.querySelectorAll('.font_blue.smallnum').forEach((count) => mark(articleRoot, count, { role: 'recommendation-accent-count' }));
            mark(articleRoot, recommendBox.querySelector('.sup_num'), { role: 'recommendation-fixed-count' });
            mark(articleRoot, recommendBox.querySelector('.writer_nikcon'), { role: 'recommendation-fixed-writer' });
            mark(articleRoot, recommendBox.querySelector('.writer_nikcon img'), { role: 'recommendation-fixed-writer-icon' });
            mark(articleRoot, captcha, { role: 'recommendation-captcha' });
            mark(articleRoot, captcha?.querySelector('.kap_codeimg'), { role: 'recommendation-captcha-image-shell' });
            mark(articleRoot, captcha?.querySelector('.kcaptcha, img'), { role: 'recommendation-captcha-image' });
            mark(articleRoot, captcha?.querySelector('.recom_input_kapcode, input'), { role: 'recommendation-captcha-input' });
            const actions = recommendBox.querySelector('.recom_bottom_box');
            mark(articleRoot, actions, { role: 'recommendation-actions' });
            actions?.querySelectorAll(':scope > button, :scope > a').forEach((action) => mark(articleRoot, action, { role: 'native-recommendation-action' }));
            recommendBox.querySelectorAll('.pop_wrap').forEach((popup) => {
                mark(articleRoot, popup, {
                    role: 'native-recommendation-popup',
                    state: popup.hidden || popup.style.display === 'none' ? 'closed' : 'open',
                });
            });
            mark(articleRoot, recommendBox.querySelector('#write_pum_layer.pop_wrap'), {
                role: 'native-pum-popup',
                state: 'open',
            });
        };

        const markAll = (articleRoot, selector, role, resolveState = null) => {
            articleRoot.querySelectorAll(selector).forEach((element) => {
                mark(articleRoot, element, {
                    role,
                    state: typeof resolveState === 'function' ? resolveState(element) : undefined,
                });
            });
        };

        const markArticleShell = (articleRoot) => {
            mark(articleRoot, articleRoot.querySelector(':scope > header'), { role: 'article-header-shell' });
            markAll(articleRoot, '.gallview_head', 'article-header');
            markAll(articleRoot, '.gallview_head .title', 'article-title-row');
            markAll(articleRoot, '.gallview_head .title_headtext', 'article-headtext');
            markAll(articleRoot, '.gallview_head .title_subject', 'article-title');
            markAll(articleRoot, '.gallview_head .title_device', 'article-title-device');
            markAll(articleRoot, '.gallview_head .gall_writer', 'article-meta');
            markAll(articleRoot, '.gallview_head .gall_writer > .fl', 'article-author-group');
            markAll(articleRoot, '.gallview_head .gall_writer > .fr', 'article-stat-group');
            markAll(articleRoot, '.gallview_head .gall_writer .nickname', 'article-author');
            markAll(articleRoot, '.gallview_head .gall_writer .ip', 'article-author-ip');
            markAll(articleRoot, '.gallview_head .gall_writer .gall_date', 'article-date');
            markAll(articleRoot, '.gallview_head .gall_writer .gall_count', 'article-view-count');
            markAll(articleRoot, '.gallview_head .gall_writer .gall_recommend', 'article-recommend-count');
            markAll(articleRoot, '.gallview_head .gall_writer .gall_comment', 'article-comment-count');
            markAll(articleRoot, '.gallview_head .gall_writer .gall_scrap', 'article-scrap');
            markAll(articleRoot, '.gallview_head .gall_writer .gall_scrap button', 'native-article-scrap');

            markAll(articleRoot, '.gallview_contents', 'article-body');
            markAll(articleRoot, '.gallview_contents > .inner', 'article-body-inner');
            markAll(articleRoot, '.writing_view_box', 'article-writing-body');
            markAll(articleRoot, '.write_div', 'article-content');
            markAll(articleRoot, '.gallview_contents img:not(.pop_wrap *), .gallview_contents video:not(.pop_wrap *), .writing_view_box > .write_div img, .writing_view_box > .write_div video', 'article-media');
            markAll(articleRoot, '.img_bottom_box, .appending_file_box', 'article-attachments');
            markAll(articleRoot, '.gall_exposure_list', 'article-related-list');

            getActionBars(articleRoot).forEach((actionBar) => {
                mark(articleRoot, actionBar, { role: 'article-native-actions' });
                actionBar.querySelectorAll('button, a').forEach((action) => {
                    mark(articleRoot, action, {
                        role: 'native-article-action',
                        state: action.classList.contains('cancle')
                            ? 'destructive'
                            : action.classList.contains('write') || action.classList.contains('btn_blue')
                                ? 'primary'
                                : 'neutral',
                    });
                });
            });
        };

        const ensurePresentationStyle = () => {
            const existingStyle = document.getElementById(__dcufArticlePresenter.STYLE_ID);
            if (existingStyle) return existingStyle;
            const target = document.head || document.documentElement;
            if (!target) return null;
            const style = document.createElement('style');
            style.id = __dcufArticlePresenter.STYLE_ID;
            style.textContent = __dcufArticlePresenter.cssText;
            target.appendChild(style);
            presentationStyleElement = style;
            return style;
        };

        const injectPumStyle = () => {
            const existingStyle = document.getElementById(PUM_STYLE_ID);
            if (existingStyle) return existingStyle;
            const target = document.head || document.documentElement;
            if (!target) return null;
            const style = document.createElement('style');
            style.id = PUM_STYLE_ID;
            style.textContent = `
                ${PUM_POPUP_SELECTOR}.${PUM_POSITIONED_CLASS} {
                    box-sizing: border-box !important;
                    position: fixed !important;
                    left: 50% !important;
                    top: 50% !important;
                    right: auto !important;
                    bottom: auto !important;
                    width: min(590px, calc(100vw - 16px)) !important;
                    max-width: calc(100vw - 16px) !important;
                    max-height: calc(100vh - 16px) !important;
                    max-height: calc(100dvh - 16px) !important;
                    margin: 0 !important;
                    transform: translate(-50%, -50%) !important;
                    overflow: auto !important;
                    overscroll-behavior: contain !important;
                    z-index: 2147483647 !important;
                }
            `;
            target.appendChild(style);
            pumStyleElement = style;
            return style;
        };

        const prunePumTransactions = () => {
            Array.from(pumTransactions.entries()).forEach(([popup, snapshot]) => {
                if (popup.isConnected) return;
                if (!snapshot.hadPositionedClass) popup.classList.remove(PUM_POSITIONED_CLASS);
                pumTransactions.delete(popup);
            });
        };

        const markPumPopup = (root = document) => {
            prunePumTransactions();
            const popup = root instanceof Element && root.matches(PUM_POPUP_SELECTOR)
                ? root
                : root.querySelector?.(PUM_POPUP_SELECTOR);
            if (!(popup instanceof HTMLElement)) return false;
            if (!pumTransactions.has(popup)) {
                pumTransactions.set(popup, {
                    hadPositionedClass: popup.classList.contains(PUM_POSITIONED_CLASS),
                });
            }
            popup.classList.add(PUM_POSITIONED_CLASS);
            const articleRoot = popup.closest(ARTICLE_ROOT_SELECTOR);
            if (isArticleRoot(articleRoot)) {
                mark(articleRoot, popup, { role: 'native-pum-popup', state: 'open' });
            }
            return true;
        };

        const ensurePumPopup = () => {
            injectPumStyle();
            markPumPopup(document);
        };

        const cancelPumSchedule = () => {
            if (pumRafId) window.cancelAnimationFrame(pumRafId);
            pumRafId = 0;
            pumTimerIds.forEach((timerId) => window.clearTimeout(timerId));
            pumTimerIds.clear();
        };

        const schedulePumPopup = () => {
            cancelPumSchedule();
            pumRafId = window.requestAnimationFrame(() => {
                pumRafId = 0;
                ensurePumPopup();
                [40, 160].forEach((delay) => {
                    const timerId = window.setTimeout(() => {
                        pumTimerIds.delete(timerId);
                        ensurePumPopup();
                    }, delay);
                    pumTimerIds.add(timerId);
                });
            });
        };

        const handlePumClick = (event) => {
            const trigger = event.target instanceof Element
                ? event.target.closest(PUM_TRIGGER_SELECTOR)
                : null;
            if (!(trigger instanceof HTMLElement)) return;
            schedulePumPopup();
        };

        const suspendPumRuntime = () => {
            cancelPumSchedule();
            if (pumClickBound) document.removeEventListener('click', handlePumClick);
            pumClickBound = false;
        };

        const handlePageHide = () => suspendPumRuntime();
        const handlePageShow = () => {
            refresh(document);
            if (document.querySelector(PUM_TRIGGER_SELECTOR)) bindPumRuntime();
        };

        const bindPumRuntime = () => {
            if (!pumClickBound) {
                document.addEventListener('click', handlePumClick);
                pumClickBound = true;
            }
            if (!lifecycleBound) {
                window.addEventListener('pagehide', handlePageHide);
                window.addEventListener('pageshow', handlePageShow);
                lifecycleBound = true;
            }
        };

        const disposePumRuntime = () => {
            suspendPumRuntime();
            if (lifecycleBound) {
                window.removeEventListener('pagehide', handlePageHide);
                window.removeEventListener('pageshow', handlePageShow);
                lifecycleBound = false;
            }
            Array.from(pumTransactions.entries()).reverse().forEach(([popup, snapshot]) => {
                if (!snapshot.hadPositionedClass) popup.classList.remove(PUM_POSITIONED_CLASS);
            });
            pumTransactions.clear();
            if (pumStyleElement?.isConnected) pumStyleElement.remove();
            pumStyleElement = null;
        };

        const connectRoot = (articleRoot) => {
            if (!isArticleRoot(articleRoot)) return null;
            ensurePresentationStyle();
            activeRoots.add(articleRoot);
            pruneDetachedElements(articleRoot);
            mark(articleRoot, articleRoot, {
                surface: 'article-recommendation',
                role: 'article',
                state: document.body?.classList.contains('dc-filter-dark-mode') ? 'dark' : 'ready',
            });
            markArticleShell(articleRoot);
            markRecommendation(articleRoot, articleRoot.querySelector(RECOMMEND_SELECTOR));
            if (articleRoot.querySelector(PUM_TRIGGER_SELECTOR)) {
                ensurePumPopup();
                bindPumRuntime();
            }
            return articleRoot;
        };

        const disposeRoot = (articleRoot) => {
            if (!(articleRoot instanceof HTMLElement)) return;
            const transaction = transactions.get(articleRoot);
            if (transaction) {
                Array.from(transaction.entries()).reverse().forEach(([element, snapshot]) => {
                    restoreElement(element, snapshot);
                });
                transaction.clear();
                transactions.delete(articleRoot);
            }
            activeRoots.delete(articleRoot);
        };

        const pruneRoots = () => {
            Array.from(activeRoots).forEach((articleRoot) => {
                if (!articleRoot.isConnected || !isArticleRoot(articleRoot)) disposeRoot(articleRoot);
            });
        };

        const connect = (root = document) => {
            pruneRoots();
            return collectArticleRoots(root).map(connectRoot).filter(Boolean);
        };

        const refresh = (root = document) => connect(root);

        const refreshFromMutation = (payload) => {
            const candidates = [
                ...(payload?.attributeTargets || []),
                ...(payload?.addedElements || []),
                ...(payload?.childListTargets || []),
            ];
            const isRelevant = candidates.some((candidate) => {
                const element = candidate instanceof Element ? candidate : candidate?.parentElement;
                if (!(element instanceof Element)) return false;
                return element.matches(ARTICLE_ROOT_SELECTOR)
                    || element.closest(ARTICLE_ROOT_SELECTOR) instanceof HTMLElement
                    || element.querySelector?.(ARTICLE_ROOT_SELECTOR) instanceof HTMLElement;
            });
            return isRelevant ? refresh(document) : [];
        };

        const dispose = (root = null) => {
            if (root instanceof HTMLElement && activeRoots.has(root)) {
                disposeRoot(root);
                if (activeRoots.size === 0) disposePumRuntime();
                return;
            }
            Array.from(activeRoots).forEach(disposeRoot);
            disposePumRuntime();
            if (presentationStyleElement?.isConnected) presentationStyleElement.remove();
            presentationStyleElement = null;
        };

        const describeField = (field) => ({
            tag: field.localName,
            type: field.getAttribute('type'),
            name: field.getAttribute('name'),
            value: field.value,
        });

        const snapshotSurface = (articleRoot) => {
            if (!isArticleRoot(articleRoot)) return null;
            const recommendBox = articleRoot.querySelector(RECOMMEND_SELECTOR);
            const nativeButtons = recommendBox
                ? Array.from(recommendBox.querySelectorAll('button')).map((button) => ({
                    type: button.getAttribute('type'),
                    name: button.getAttribute('name'),
                    value: button.getAttribute('value'),
                    role: button.getAttribute('data-dcuf-role'),
                    text: button.textContent.trim(),
                }))
                : [];
            return deepFreeze({
                route: window.location.pathname,
                state: articleRoot.getAttribute('data-dcuf-state'),
                hasHeader: articleRoot.querySelector('[data-dcuf-role="article-header"]') instanceof HTMLElement,
                hasBody: articleRoot.querySelector('[data-dcuf-role="article-body"], [data-dcuf-role="article-writing-body"]') instanceof HTMLElement,
                hasWritingBody: articleRoot.querySelector('[data-dcuf-role="article-writing-body"]') instanceof HTMLElement,
                nativeActions: getActionBars(articleRoot).flatMap((actionBar) => Array.from(actionBar.querySelectorAll('[data-dcuf-role="native-article-action"]'))).map((action) => ({
                    tag: action.localName,
                    type: action.getAttribute('type'),
                    state: action.getAttribute('data-dcuf-state'),
                    text: action.textContent.trim(),
                })),
                recommendation: recommendBox instanceof HTMLElement ? {
                    state: recommendBox.getAttribute('data-dcuf-state'),
                    nativeButtons,
                    fields: Array.from(recommendBox.querySelectorAll('input, select, textarea')).map(describeField),
                    hasPumPopup: recommendBox.querySelector('#write_pum_layer.pop_wrap') instanceof HTMLElement,
                } : null,
            });
        };

        const invokeNative = (target, action = 'click') => {
            if (!(target instanceof HTMLElement) || action !== 'click') return false;
            target.click();
            return true;
        };

        const snapshotResources = () => {
            pruneRoots();
            prunePumTransactions();
            let trackedElements = 0;
            activeRoots.forEach((articleRoot) => {
                pruneDetachedElements(articleRoot);
                trackedElements += transactions.get(articleRoot)?.size || 0;
            });
            return Object.freeze({
                activeRoots: activeRoots.size,
                trackedElements,
                observers: 0,
                presentationStyleOwners: document.getElementById(__dcufArticlePresenter.STYLE_ID) ? 1 : 0,
                pumPopups: pumTransactions.size,
                listeners: (pumClickBound ? 1 : 0) + (lifecycleBound ? 2 : 0),
                timers: pumTimerIds.size,
                animationFrames: pumRafId ? 1 : 0,
            });
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
    __dcufRoot.__dcufArticleHostAdapter = __dcufArticleHostAdapter;
