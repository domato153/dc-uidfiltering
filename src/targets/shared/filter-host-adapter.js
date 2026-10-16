    const __dcufFilterHostAdapter = (() => {
        const legacyMethods = {
isRecommendedContext: () => window.location.search.includes('exception_mode=recommend'),
debugDescribeElement(element) {
            if (!(element instanceof HTMLElement)) return { tag: null };
            const titleNode = element.querySelector('.gall_tit a, .post-title-link, .usertxt, .gall_tit, .post-title');
            return {
                tag: element.tagName,
                id: element.id || null,
                className: typeof element.className === 'string' ? element.className : '',
                rowId: element.getAttribute('data-custom-row-id'),
                title: titleNode ? titleNode.textContent.trim().replace(/\s+/g, ' ').slice(0, 80) : null
            };
        },
debugDecision(element, payload) {
            if (!this.DEBUG_ENABLED) return;
            if (!(this.DEBUG_DECISION_KEYS instanceof Set)) this.DEBUG_DECISION_KEYS = new Set();
            const reasons = Array.isArray(payload.reasons) ? payload.reasons.filter(Boolean) : [];
            const identity = [
                this.DEBUG_PASS_ID,
                payload.branch || '',
                payload.uid || '',
                payload.ip || '',
                payload.ipPrefix || '',
                payload.isBlocked ? 'hide' : 'show',
                reasons.join(',')
            ].join('|');
            if (this.DEBUG_DECISION_KEYS.has(identity)) return;
            if (this.DEBUG_DECISION_LOG_COUNT >= this.DEBUG_MAX_DECISIONS_PER_PASS) return;
            this.DEBUG_DECISION_KEYS.add(identity);
            this.DEBUG_DECISION_LOG_COUNT += 1;
            this.debugLog('decision', `${payload.branch || 'sync'} #${this.DEBUG_DECISION_LOG_COUNT}`, {
                passId: this.DEBUG_PASS_ID,
                element: this.debugDescribeElement(element),
                ...payload,
                reasons
            });
            console.log(
                `[DCUF DEBUG][decision-line] pass=${this.DEBUG_PASS_ID} idx=${this.DEBUG_DECISION_LOG_COUNT} branch=${payload.branch || 'sync'} blocked=${payload.isBlocked} ` +
                `uid=${payload.uid || '(none)'} nick=${payload.nickname || '(none)'} ip=${payload.ip || '(none)'} prefix=${payload.ipPrefix || '(none)'} ` +
                `guest=${payload.isGuest} custom=${payload.hasCustomIpPrefixBlock} proxyMode=${payload.proxyBlockMode} proxy=${payload.proxyPrefixMatch} proxyTier=${payload.proxyMatchTier || '(none)'} telecom=${payload.telecomPrefixMatch} ` +
                `blockedGuest=${payload.blockedGuestMatch} reasons=${reasons.join(',') || '(none)'}`
            );
        },
debugMirrorSync(originalRow, mirroredItem, nextDisplay, source) {
            if (!this.DEBUG_ENABLED) return;
            const prevDisplay = mirroredItem.style.display || '';
            if (prevDisplay === nextDisplay && nextDisplay !== 'none') return;
            this.debugLog('mirror', source, {
                original: this.debugDescribeElement(originalRow),
                mirrored: this.debugDescribeElement(mirroredItem),
                originalDisplay: originalRow.style.display || '',
                mirroredBefore: prevDisplay,
                mirroredAfter: nextDisplay,
                originalClassName: typeof originalRow.className === 'string' ? originalRow.className : ''
            });
        },
async debugDumpState(reason = 'manual') {
            if (!this.DEBUG_ENABLED) return null;
            await this.reloadSettings();
            const rawBlockConfig = await this.loadDebugBlockConfig();
            const payload = this.debugSettingsSnapshot({
                reason,
                rawBlockConfigIp: typeof rawBlockConfig?.ip === 'string' ? rawBlockConfig.ip : '',
                rawBlockConfigIpPreview: typeof rawBlockConfig?.ip === 'string' ? rawBlockConfig.ip.split('||').slice(0, 20) : [],
                rawBlockConfigIpCount: this.parseIpPrefixList(rawBlockConfig?.ip || '').length
            });
            this.debugLog('dump', reason, payload);
            console.log(`[DCUF DEBUG][dump-line] ${this.debugStringifySafe(payload)}`);
            return payload;
        },
installDebugApi() {
            if (window.DCUFDebug && window.DCUFDebug.__dcufInstalled) return;
            window.DCUFDebug = {
                __dcufInstalled: true,
                dumpState: (reason = 'manual dumpState') => this.debugDumpState(reason),
                inspectCurrentPage: async (reason = 'manual inspectCurrentPage') => {
                    await this.reloadSettings();
                    this.startDebugPass(reason, { source: 'window.DCUFDebug.inspectCurrentPage' });
                    this.runSyncRefilterPass();
                    return this.debugDumpState(`${reason} after runSyncRefilterPass`);
                },
                refilter: async (reason = 'manual refilter') => {
                    await this.refilterAllContent(reason);
                    return this.debugDumpState(`${reason} after refilter`);
                }
            };
            this.debugLog('api', 'window.DCUFDebug installed', Object.keys(window.DCUFDebug));
        },
isFilterTargetDescriptor(value) {
            return Boolean(value && value.element instanceof HTMLElement);
        },
normalizeFilterTarget(target, { includeHeadtext = true, includePum = true } = {}) {
            if (this.isFilterTargetDescriptor(target)) return target;
            return this.describeFilterTarget(target, { includeHeadtext, includePum });
        },
isReplyOnlyCommentWrapper(element) {
            if (!(element instanceof HTMLElement)) return false;
            if (!this.isCommentListItem(element)) return false;
            return Boolean(element.querySelector(':scope > div.reply.show'))
                && !element.querySelector(':scope > div.cmt_info');
        },
findWriterInfoForFilterTarget(element) {
            if (!(element instanceof HTMLElement)) return null;
            const directCommentWriter = element.querySelector(':scope > div.cmt_info .ub-writer');
            if (directCommentWriter instanceof HTMLElement) return directCommentWriter;

            const directReplyWriter = element.querySelector(':scope > div.reply_info .ub-writer');
            if (directReplyWriter instanceof HTMLElement) return directReplyWriter;

            if (this.isCommentListItem(element)) return null;
            return element.querySelector(this.CONSTANTS.SELECTORS.WRITER_INFO);
        },
isHeadtextFilterTarget(element) {
            if (!(element instanceof HTMLElement) || this.isCommentListItem(element)) return false;
            if (element.matches('tr.ub-content')) return true;
            return Boolean(element.closest('.view_bottom, .gall_listwrap'))
                && Boolean(element.querySelector('[data-headtext], .gall_subject'));
        },
extractHeadtext(element) {
            if (!(element instanceof HTMLElement)) return '';
            const source = element.matches('[data-headtext]')
                ? element
                : element.querySelector('[data-headtext], .gall_subject');
            return this.getCanonicalHeadtextFromNode(source);
        },
isPumPost(element) {
            if (!(element instanceof HTMLElement) || !this.isHeadtextFilterTarget(element)) return false;
            const marker = element.querySelector(':scope > .gall_tit > b.font_blue009');
            return this.normalizeHeadtext(marker?.textContent || '') === '(펌)';
        },
describeFilterTarget(element, { includeHeadtext = true, includePum = true } = {}) {
            if (!(element instanceof HTMLElement)) return null;
            if (this.isReplyOnlyCommentWrapper(element)) return null;

            const writerInfo = this.findWriterInfoForFilterTarget(element);
            const uid = writerInfo?.getAttribute('data-uid') || null;
            const nickname = writerInfo?.getAttribute('data-nick') || null;
            const writerDataIp = writerInfo?.getAttribute('data-ip') || null;
            const ipSpan = element.querySelector(this.CONSTANTS.SELECTORS.IP_SPAN);
            const ipText = ipSpan ? ipSpan.textContent.trim() : '';
            const ipFromSpan = (ipText.startsWith('(') && ipText.endsWith(')')) ? ipText.slice(1, -1) : ipText;
            const ip = ipFromSpan || writerDataIp || null;
            const ipPrefix = this.getIpPrefix(ip);
            const isHeadtextTarget = includeHeadtext && this.isHeadtextFilterTarget(element);
            const isPumPost = includePum && this.isPumPost(element);
            const hasNoticeMarker = Boolean(element.querySelector('em.icon_notice'))
                || element.classList.contains('notice')
                || element.classList.contains('us-post--notice');
            // `.gall_num` exists on post rows, not comments. Keeping this lookup row-only
            // avoids adding a selector call to every repeated comment-filter pass.
            const isNotice = hasNoticeMarker || (element.tagName === 'TR'
                && this.normalizeHeadtext(element.querySelector('.gall_num')?.textContent || '') === '공지');

            return {
                element,
                writerInfo,
                uid,
                nickname,
                ip,
                ipText,
                writerDataIp,
                ipPrefix,
                isGuest: Boolean((!uid || uid.length < 3) && ip),
                isNotice,
                shouldSkipFiltering: this.shouldSkipFiltering(element),
                hasBlockDisableClass: element.classList.contains('block-disable'),
                galleryKey: isHeadtextTarget ? this.getGalleryKey() : null,
                headtext: isHeadtextTarget ? this.extractHeadtext(element) : '',
                isHeadtextTarget,
                isPumPost
            };
        },
describeFilterTargets(items) {
            if (!Array.isArray(items) || items.length === 0) return [];
            const seen = new Set();
            const descriptors = [];
            // The default rule set is empty. Avoid all headtext DOM probing on the
            // ordinary mutation hot path until the user has an active rule.
            const includeHeadtext = dcFilterSettings.galleryHeadtextBlockSet?.size > 0;
            const includePum = Boolean(dcFilterSettings.blockPumPosts);
            items.forEach((item) => {
                const descriptor = this.normalizeFilterTarget(item, { includeHeadtext, includePum });
                const element = descriptor?.element;
                if (!(element instanceof HTMLElement) || seen.has(element)) return;
                seen.add(element);
                descriptors.push(descriptor);
            });
            return descriptors;
        },
applySyncToDescriptors(descriptors, { resetDisplay = false } = {}) {
            if (!Array.isArray(descriptors) || descriptors.length === 0) return;
            descriptors.forEach((descriptor) => {
                const element = descriptor?.element;
                if (!(element instanceof HTMLElement)) return;
                if (resetDisplay && !dcFilterSettings.masterDisabled) {
                    // Comment items can already be hidden by async UID blocking.
                    // Clearing display before the next sync decision makes blocked comments briefly flash back in
                    // until a later async/stabilized pass hides them again, so preserve current visibility here.
                    if (!this.isCommentListItem(element)) {
                        element.style.display = '';
                    }
                }
                this.applySyncBlock(descriptor);
            });
        },
applyAsyncToDescriptors(descriptors) {
            if (!Array.isArray(descriptors) || descriptors.length === 0) return;
            descriptors.forEach((descriptor) => {
                void this.applyAsyncBlock(descriptor);
            });
        },
applyFilterItems(items) {
            const descriptors = this.describeFilterTargets(items);
            if (descriptors.length === 0) return;
            this.applySyncToDescriptors(descriptors);
            this.applyAsyncToDescriptors(descriptors);
        },
flushQueuedObservedFilterItems() {
            if (this._queuedObserverFilterRafId) {
                cancelAnimationFrame(this._queuedObserverFilterRafId);
                this._queuedObserverFilterRafId = 0;
            }
            if (this._queuedObserverFilterTimerId) {
                clearTimeout(this._queuedObserverFilterTimerId);
                this._queuedObserverFilterTimerId = 0;
            }
            if (!(this._queuedObserverFilterItems instanceof Set) || this._queuedObserverFilterItems.size === 0) return;
            const items = Array.from(this._queuedObserverFilterItems);
            this._queuedObserverFilterItems.clear();
            this.applyFilterItems(items);
        },
queueObservedFilterItems(items) {
            if (!Array.isArray(items) || items.length === 0) return;
            if (!(this._queuedObserverFilterItems instanceof Set)) this._queuedObserverFilterItems = new Set();
            items.forEach((item) => {
                if (item instanceof HTMLElement) this._queuedObserverFilterItems.add(item);
            });
            if (this._queuedObserverFilterItems.size === 0) return;
            if (this._queuedObserverFilterRafId || this._queuedObserverFilterTimerId) return;

            this._queuedObserverFilterRafId = requestAnimationFrame(() => {
                this._queuedObserverFilterRafId = 0;
                this.flushQueuedObservedFilterItems();
            });
            this._queuedObserverFilterTimerId = window.setTimeout(() => {
                this._queuedObserverFilterTimerId = 0;
                this.flushQueuedObservedFilterItems();
            }, 80);
        },
collectMutationFilterItems(payload, containerSelector, itemSelector, {
            attributeNames = [],
            includeChildListTargets = false
        } = {}) {
            if (!payload || typeof payload !== 'object') return [];
            const items = [];
            const seen = new Set();
            const watchedAttributes = new Set(attributeNames);
            const addItem = (element) => {
                if (!(element instanceof HTMLElement) || !element.isConnected || seen.has(element)) return;
                if (!element.matches(itemSelector) || !element.closest(containerSelector)) return;
                seen.add(element);
                items.push(element);
            };
            const scanTarget = (root) => {
                if (!(root instanceof Element)) return;
                addItem(root);
                const closestItem = root.closest(itemSelector);
                if (closestItem) addItem(closestItem);
            };
            const scanAddedRoot = (root) => {
                if (!(root instanceof Element)) return;
                scanTarget(root);
                if (typeof root.querySelectorAll === 'function') {
                    root.querySelectorAll(itemSelector).forEach(addItem);
                }
            };

            if (Array.isArray(payload.addedElements)) payload.addedElements.forEach(scanAddedRoot);
            if (Array.isArray(payload.records)) {
                payload.records.forEach((record) => {
                    if (record?.type === 'attributes' && watchedAttributes.has(record.attributeName)) {
                        scanTarget(record.target);
                    } else if (includeChildListTargets && record?.type === 'childList') {
                        scanTarget(record.target);
                    }
                });
            }
            return items;
        },
collectImmediateCommentFilterItems(payload) {
            return this.collectMutationFilterItems(
                payload,
                this.CONSTANTS.SELECTORS.COMMENT_CONTAINER,
                this.CONSTANTS.SELECTORS.COMMENT_ITEM,
                { attributeNames: ['data-uid', 'data-nick', 'data-ip'] }
            );
        },
applyImmediateCommentMutations(payload) {
            const items = this.collectImmediateCommentFilterItems(payload);
            if (items.length === 0) return;
            const descriptors = this.describeFilterTargets(items);
            this.applySyncToDescriptors(descriptors);
            this.incrementRuntimeDiagnostic('filter.immediateComment.runs');
            this.setRuntimeDiagnosticGauge('filter.immediateComment.lastTargetCount', descriptors.length);
        },
getRuntimeCoordinator() {
            return window.__dcufRuntimeCoordinator || null;
        },
incrementRuntimeDiagnostic(label, amount = 1) {
            const runtimeCoordinator = this.getRuntimeCoordinator();
            if (typeof runtimeCoordinator?.incrementDiagnostic === 'function') {
                runtimeCoordinator.incrementDiagnostic(label, amount);
            }
        },
setRuntimeDiagnosticGauge(label, value) {
            const runtimeCoordinator = this.getRuntimeCoordinator();
            if (typeof runtimeCoordinator?.setDiagnosticGauge === 'function') {
                runtimeCoordinator.setDiagnosticGauge(label, value);
            }
        },
getRelevantMutationGeneration(scope = 'all') {
            if (scope === 'comments') return Number(this._commentRelevantMutationGeneration) || 0;
            return Number(this._filterRelevantMutationGeneration) || 0;
        },
markRelevantMutation(scope = 'all') {
            this._filterRelevantMutationGeneration = (Number(this._filterRelevantMutationGeneration) || 0) + 1;
            if (scope === 'comments') {
                this._commentRelevantMutationGeneration = (Number(this._commentRelevantMutationGeneration) || 0) + 1;
            }
            this.setRuntimeDiagnosticGauge('filter.relevantGeneration', this._filterRelevantMutationGeneration);
            this.setRuntimeDiagnosticGauge('filter.commentRelevantGeneration', Number(this._commentRelevantMutationGeneration) || 0);
        },
isCommentListItem(element) {
            return element instanceof HTMLElement && !!element.closest(this.CONSTANTS.SELECTORS.COMMENT_CONTAINER);
        },
setElementVisibility(element, shouldHide) {
            if (!(element instanceof HTMLElement)) return;
            if (element.hasAttribute('data-dcuf-parent-filtered')) {
                element.removeAttribute('data-dcuf-parent-filtered');
            }
            if (element.hasAttribute('data-dcuf-parent-placeholder')) {
                element.removeAttribute('data-dcuf-parent-placeholder');
            }
            if (element.classList.contains('dcuf-parent-comment-filtered')) {
                element.classList.remove('dcuf-parent-comment-filtered');
            }
            if (this.isCommentListItem(element)) {
                const stalePlaceholder = element.querySelector(':scope > .dcuf-comment-placeholder');
                if (stalePlaceholder instanceof HTMLElement) stalePlaceholder.remove();
            }
            const nextDisplay = shouldHide ? 'none' : '';
            if (element.style.display !== nextDisplay) element.style.display = nextDisplay;
        },
async applyBlockFilterToElement(element, uid, userData, addBlockedUidFn) {
            if (!userData || !(element instanceof HTMLElement) || !element.isConnected) return;
            const { sumBlocked, ratioBlocked } = this.isUserBlocked(userData);
            const shouldBeBlocked = sumBlocked || ratioBlocked;
            // UID statistics are an additional blocking reason, not an authority to reveal content.
            // A request can begin before a personal block is saved and resolve afterwards; letting a
            // negative statistics result call setElementVisibility(false) in that race briefly exposes
            // the personally blocked comment and starts a shell-attribute refilter loop.
            if (!shouldBeBlocked && element.getAttribute('data-dcuf-personal-blocked') === '1') {
                this.incrementRuntimeDiagnostic('filter.asyncAllow.suppressedPersonalBlock');
                return;
            }
            this.setElementVisibility(element, shouldBeBlocked);
            if (shouldBeBlocked) await addBlockedUidFn.call(this, uid, userData.sum, userData.post, userData.comment, ratioBlocked);
        },
shouldSkipFiltering(element) {
            const s = dcFilterSettings; if (!s.excludeRecommended || !this.isRecommendedContext()) return false;
            if (window.location.pathname.includes('/view/')) return !element.closest(this.CONSTANTS.SELECTORS.COMMENT_CONTAINER);
            return true;
        },
async applyAsyncBlock(target) {
            const descriptor = this.normalizeFilterTarget(target);
            if (!descriptor) return;

            const { element, writerInfo, uid, isNotice, shouldSkipFiltering } = descriptor;
            if (isNotice || shouldSkipFiltering) return;
            if (!this.isUserStatsFilterActive()) return;

            try {
                if (element.style.display === 'none') return;
                if (element.getAttribute('data-dcuf-personal-blocked') === '1') return;
                if (!(writerInfo instanceof HTMLElement)) return;
                if (!uid || uid.length < 3) return;
                if (this.BLOCKED_UIDS_CACHE[uid]) return;
                const userData = await this.getUserPostCommentSum(uid); if (!userData) return;
                await this.applyBlockFilterToElement(element, uid, userData, this.addBlockedUid);
            } catch (e) { console.warn(`DCinside User Filter: Async filter exception.`, e, element); }
        },
applySyncBlock(target) {
            const descriptor = this.normalizeFilterTarget(target);
            if (!descriptor?.writerInfo) return;

            const {
                masterDisabled,
                blockGuestEnabled,
                proxyBlockMode = 0,
                telecomBlockEnabled,
                blockedGuests = [],
                blockedGuestSet,
                customIpPrefixSet,
                blockPumPosts,
                personalBlockEnabled,
                personalBlockUidSet,
                personalBlockNicknameSet,
                personalBlockIpSet
            } = dcFilterSettings;
            const normalizedProxyBlockMode = this.normalizeProxyBlockMode(proxyBlockMode);
            const proxyBlockEnabled = normalizedProxyBlockMode !== this.PROXY_MODE.OFF;

            const { element, uid, nickname, ip, ipText, writerDataIp, ipPrefix, isGuest, isNotice, shouldSkipFiltering, hasBlockDisableClass, galleryKey, headtext, isHeadtextTarget, isPumPost } = descriptor;
            const subject = {
                uid,
                nickname,
                ip,
                ipPrefix,
                isGuest,
                isNotice,
                shouldSkipFiltering,
                hasBlockDisableClass,
                galleryKey,
                headtext,
                isHeadtextTarget
            };
            const baseDebug = this.DEBUG_ENABLED ? {
                branch: 'sync-base',
                uid,
                nickname,
                ip,
                ipText,
                writerDataIp,
                ipPrefix,
                isGuest,
                isPumPost,
                blockPumPosts,
                blockGuestEnabled,
                proxyBlockMode: normalizedProxyBlockMode,
                proxyBlockEnabled,
                telecomBlockEnabled
            } : null;

            const proxyMatchInfo = this.getProxyPrefixMatch(ipPrefix, normalizedProxyBlockMode);
            const telecomPrefixSet = telecomBlockEnabled && ipPrefix ? this.getTelecomPrefixSet() : null;
            const decision = DCUF_SHARED_FILTER_CORE.evaluateSyncBlockDecision({
                subject,
                settings: {
                    masterDisabled,
                    blockGuestEnabled,
                    proxyBlockMode: normalizedProxyBlockMode,
                    telecomBlockEnabled,
                    customIpPrefixSet,
                    personalBlockEnabled,
                    blockPumPosts,
                    threshold: dcFilterSettings.threshold,
                    ratioEnabled: dcFilterSettings.ratioEnabled,
                    ratioMin: dcFilterSettings.ratioMin,
                    ratioMax: dcFilterSettings.ratioMax
                },
                matches: {
                    personalBlockHit: personalBlockEnabled && DCUF_SHARED_FILTER_CORE.isPersonalBlockHit(subject, {
                        uidSet: personalBlockUidSet,
                        nicknameSet: personalBlockNicknameSet,
                        ipSet: personalBlockIpSet
                    }),
                    hasCustomIpPrefixBlock: Boolean(customIpPrefixSet && customIpPrefixSet.size > 0 && ipPrefix && customIpPrefixSet.has(ipPrefix)),
                    proxyMatchInfo,
                    telecomPrefixMatch: Boolean(ipPrefix && telecomPrefixSet && telecomPrefixSet.has(ipPrefix)),
                    blockedGuestMatch: Boolean(ip && (blockedGuestSet instanceof Set ? blockedGuestSet.has(ip) : blockedGuests.includes(ip))),
                    galleryHeadtextBlock: Boolean(isHeadtextTarget && galleryKey && headtext && dcFilterSettings.galleryHeadtextBlockSet?.has(headtext)),
                    pumPostMatch: Boolean(isPumPost)
                },
                blockedUidEntry: uid ? (this.BLOCKED_UIDS_CACHE[uid] || userSumCache[uid] || null) : null
            });
            const allowPersonalBlockReveal = Boolean(this._syncPassOptions?.allowPersonalBlockReveal);
            const wasPersonallyBlocked = element.getAttribute('data-dcuf-personal-blocked') === '1';

            if (decision.path === 'personal-block') {
                element.setAttribute('data-dcuf-personal-blocked', '1');
            } else if (decision.isBlocked) {
                element.removeAttribute('data-dcuf-personal-blocked');
            } else if (wasPersonallyBlocked && this.isCommentListItem(element) && !allowPersonalBlockReveal) {
                // Reply-merge / comment-stabilization passes can temporarily rebuild comment UI in a
                // state where personal-block metadata is not reliable yet. Keep already personal-blocked
                // comments hidden until a full refilter with refreshed settings explicitly reveals them.
                if (this.DEBUG_ENABLED) {
                    this.debugDecision(element, {
                        ...baseDebug,
                        branch: 'personal-block-hold',
                        isBlocked: true,
                        reasons: ['personalBlock-hold']
                    });
                }
                this.setElementVisibility(element, true);
                return;
            } else {
                element.removeAttribute('data-dcuf-personal-blocked');
            }

            if (this.DEBUG_ENABLED) {
                this.debugDecision(element, {
                    ...baseDebug,
                    branch: decision.path || 'sync-final',
                    isBlocked: decision.isBlocked,
                    reasons: decision.reasons,
                    blockedGuestsCount: blockedGuestSet instanceof Set ? blockedGuestSet.size : blockedGuests.length,
                    customIpPrefixCount: customIpPrefixSet instanceof Set ? customIpPrefixSet.size : 0,
                    hasCustomIpPrefixBlock: decision.hasCustomIpPrefixBlock,
                    proxyPrefixMatch: decision.proxyPrefixMatch,
                    proxyMatchTier: decision.proxyMatchTier,
                    telecomPrefixMatch: decision.telecomPrefixMatch,
                    blockedGuestMatch: decision.blockedGuestMatch,
                    pumPostMatch: decision.pumPostMatch
                });
            }
            this.setElementVisibility(element, decision.isBlocked);
        },
initializeUniversalObserver() {
            const pageContext = window.__dcufPageContext || {};
            const targets = [];
            if (pageContext.hasListSurface) {
                targets.push(
                    { c: this.CONSTANTS.SELECTORS.POST_LIST_CONTAINER, i: this.CONSTANTS.SELECTORS.POST_ITEM, scope: 'posts' },
                    { c: this.CONSTANTS.SELECTORS.POST_VIEW_LIST_CONTAINER, i: 'li', scope: 'posts' }
                );
            }
            if (pageContext.hasComments) {
                targets.push({ c: this.CONSTANTS.SELECTORS.COMMENT_CONTAINER, i: this.CONSTANTS.SELECTORS.COMMENT_ITEM, scope: 'comments' });
            }
            if (targets.length === 0) return;
            const filterItems = (items) => this.applyFilterItems(items);
            const queueFilterItems = (items) => this.queueObservedFilterItems(items);
            const runtimeCoordinator = this.getRuntimeCoordinator();
            const hasRuntimeMutationBus = runtimeCoordinator && typeof runtimeCoordinator.subscribeMutations === 'function';
            const attachObserver = (container, itemSelector, { attachDomObserver = true } = {}) => {
                if (container.hasAttribute(this.CONSTANTS.CUSTOM_ATTRS.OBSERVER_ATTACHED)) return;
                container.setAttribute(this.CONSTANTS.CUSTOM_ATTRS.OBSERVER_ATTACHED, 'true');
                filterItems(Array.from(container.querySelectorAll(itemSelector)));
                if (!attachDomObserver) return;
                // [디버깅 추가]
                new MutationObserver(mutations => {
                    const newItems = [];
                    mutations.forEach(m => m.addedNodes.forEach(n => {
                        if (n.nodeType !== 1) return;
                        if (n.matches(itemSelector)) newItems.push(n); else if (n.querySelectorAll) newItems.push(...n.querySelectorAll(itemSelector));
                    }));
                    if (newItems.length > 0) queueFilterItems(newItems);
                }).observe(container, { childList: true, subtree: true });
            };
            targets.forEach(t => document.querySelectorAll(t.c).forEach(c => attachObserver(c, t.i, { attachDomObserver: !hasRuntimeMutationBus })));

            if (hasRuntimeMutationBus) {
                if (typeof this._runtimeMutationUnsubscribe === 'function') this._runtimeMutationUnsubscribe();
                if (typeof this._runtimeImmediateMutationUnsubscribe === 'function') this._runtimeImmediateMutationUnsubscribe();
                if (typeof runtimeCoordinator.subscribeImmediateMutations === 'function') {
                    this._runtimeImmediateMutationUnsubscribe = runtimeCoordinator.subscribeImmediateMutations(
                        'filter-immediate-comment-visibility',
                        (payload) => this.applyImmediateCommentMutations(payload),
                        { contexts: ['comments'], mutationScope: 'comments' }
                    );
                }
                this._runtimeMutationUnsubscribe = runtimeCoordinator.subscribeMutations('filter-universal-observer', (payload) => {
                    let hasRelevantMutation = false;
                    let hasCommentMutation = false;
                    targets.forEach((target) => {
                        const changedContainers = payload.collectMatches(target.c);
                        changedContainers.forEach((container) => attachObserver(container, target.i, { attachDomObserver: false }));
                        const changedItems = this.collectMutationFilterItems(payload, target.c, target.i, {
                            attributeNames: ['class', 'id', 'data-uid', 'data-nick', 'data-ip'],
                            includeChildListTargets: true
                        });
                        if (changedContainers.length > 0 || changedItems.length > 0) {
                            hasRelevantMutation = true;
                            if (target.scope === 'comments') hasCommentMutation = true;
                        }
                        if (changedItems.length > 0) queueFilterItems(changedItems);
                    });
                    if (hasRelevantMutation) this.markRelevantMutation(hasCommentMutation ? 'comments' : 'all');
                }, { contexts: ['list-surface'] });
                return;
            }

            const mainContainer = document.querySelector(this.CONSTANTS.SELECTORS.MAIN_CONTAINER);
            const observerTarget = mainContainer || document.body;
            const bodyObserver = new MutationObserver(mutations => {
                mutations.forEach(m => m.addedNodes.forEach(n => {
                    if (n.parentNode && n.parentNode.closest && (n.parentNode.closest('#dc-backup-popup') || n.parentNode.closest('#dc-block-management-panel') || n.parentNode.closest('#dcinside-filter-setting'))) {
                        return;
                    }
                    if (n.nodeType === 1 && !n.closest('.user_data')) {
                        targets.forEach(t => {
                            if (n.matches(t.c)) attachObserver(n, t.i);
                            else if (n.querySelectorAll) n.querySelectorAll(t.c).forEach(c => attachObserver(c, t.i));
                        });
                    }
                }));
            });
            bodyObserver.observe(observerTarget, { childList: true, subtree: true });
        },
getRefilterTargetSelectors(scope = 'all') {
            const commentSelectors = [
                this.CONSTANTS.SELECTORS.COMMENT_ITEM,
                'li[id^="comment_li_"]',
                'li[id^="reply_li_"]',
                'li[id^="img_comment_li_"]',
                'li[id^="mg_comment_li_"]'
            ];
            const postSelectors = [
                this.CONSTANTS.SELECTORS.POST_ITEM,
                `${this.CONSTANTS.SELECTORS.POST_VIEW_LIST_CONTAINER} > li`
            ];

            if (scope === 'comments') return commentSelectors;
            if (scope === 'posts') return postSelectors;
            return [...postSelectors, ...commentSelectors];
        },
resolveRefilterRoot(root = document) {
            if (root instanceof Document || root instanceof Element || root instanceof DocumentFragment) return root;
            return document;
        },
getRefilterTargets(scope = 'all', root = document) {
            const queryRoot = this.resolveRefilterRoot(root);
            const selectors = this.getRefilterTargetSelectors(scope);
            const selectorText = selectors.join(', ');
            const seen = new Set();
            const candidates = [];

            if (queryRoot instanceof Element && queryRoot.matches(selectorText)) candidates.push(queryRoot);
            if (typeof queryRoot.querySelectorAll === 'function') {
                candidates.push(...queryRoot.querySelectorAll(selectorText));
            }

            return candidates.reduce((descriptors, element) => {
                if (!(element instanceof HTMLElement) || seen.has(element)) return descriptors;
                seen.add(element);
                const descriptor = this.describeFilterTarget(element, {
                    includeHeadtext: dcFilterSettings.galleryHeadtextBlockSet?.size > 0,
                    includePum: Boolean(dcFilterSettings.blockPumPosts)
                });
                if (descriptor) descriptors.push(descriptor);
                return descriptors;
            }, []);
        },
runSyncRefilterPass(scope = 'all', root = document, descriptors = null, options = null) {
            const runtimeCoordinator = this.getRuntimeCoordinator();
            const measureDuration = Boolean(runtimeCoordinator?._diagnosticsEnabled) && typeof performance?.now === 'function';
            const startedAt = measureDuration ? performance.now() : 0;
            const targetDescriptors = Array.isArray(descriptors) ? descriptors : this.getRefilterTargets(scope, root);
            const previousSyncPassOptions = this._syncPassOptions;
            this._syncPassOptions = options && typeof options === 'object' ? options : null;
            try {
                this.applySyncToDescriptors(targetDescriptors, { resetDisplay: true });
            } finally {
                this._syncPassOptions = previousSyncPassOptions;
            }
            this.incrementRuntimeDiagnostic(`filter.syncPass.${scope}.runs`);
            this.setRuntimeDiagnosticGauge(`filter.syncPass.${scope}.lastTargetCount`, targetDescriptors.length);
            if (measureDuration) {
                this.setRuntimeDiagnosticGauge(`filter.syncPass.${scope}.lastDurationMs`, Math.round((performance.now() - startedAt) * 1000) / 1000);
            }
            return targetDescriptors;
        },
scheduleSyncRefilterPasses(scope = 'all', root = document) {
            if (this._syncRefilterRafId) cancelAnimationFrame(this._syncRefilterRafId);
            if (!this._syncRefilterTimerIds) this._syncRefilterTimerIds = new Set();
            this._syncRefilterTimerIds.forEach((timerId) => clearTimeout(timerId));
            this._syncRefilterTimerIds.clear();

            const runtimeCoordinator = this.getRuntimeCoordinator();
            const hasRuntimeMutationBus = Boolean(runtimeCoordinator && typeof runtimeCoordinator.subscribeMutations === 'function');
            let lastGeneration = this.getRelevantMutationGeneration(scope);
            const rerun = (phase, { force = false } = {}) => {
                const generation = this.getRelevantMutationGeneration(scope);
                if (!force && hasRuntimeMutationBus && generation === lastGeneration) {
                    this.incrementRuntimeDiagnostic(`filter.syncPass.${scope}.skippedUnchanged`);
                    return;
                }
                this.runSyncRefilterPass(scope, root);
                lastGeneration = this.getRelevantMutationGeneration(scope);
                this.setRuntimeDiagnosticGauge(`filter.syncPass.${scope}.lastPhase`, phase);
            };
            this._syncRefilterRafId = requestAnimationFrame(() => {
                this._syncRefilterRafId = 0;
                rerun('raf', { force: true });
            });
            [90, 220].forEach((delay) => {
                const timerId = window.setTimeout(() => {
                    this._syncRefilterTimerIds.delete(timerId);
                    rerun(`delay:${delay}`);
                }, delay);
                this._syncRefilterTimerIds.add(timerId);
            });
        },
scheduleCommentStabilizedRefilter(reason = 'comment-stabilized', roots = null) {
            if (this._commentRefilterRafId) cancelAnimationFrame(this._commentRefilterRafId);
            if (!this._commentRefilterTimerIds) this._commentRefilterTimerIds = new Set();
            this._commentRefilterTimerIds.forEach((timerId) => clearTimeout(timerId));
            this._commentRefilterTimerIds.clear();

            const requestedRoots = roots && typeof roots[Symbol.iterator] === 'function'
                ? Array.from(roots)
                : (roots ? [roots] : [document]);
            this.debugLog('comment-refilter', 'scheduleCommentStabilizedRefilter', { reason, rootCount: requestedRoots.length });
            this._commentRefilterRafId = requestAnimationFrame(() => {
                this._commentRefilterRafId = 0;
                const descriptors = [];
                const seenElements = new Set();
                requestedRoots.forEach((root) => {
                    if (root instanceof Element && !root.isConnected) return;
                    this.getRefilterTargets('comments', this.resolveRefilterRoot(root)).forEach((descriptor) => {
                        if (!descriptor?.element || seenElements.has(descriptor.element)) return;
                        seenElements.add(descriptor.element);
                        descriptors.push(descriptor);
                    });
                });
                if (descriptors.length === 0) {
                    this.incrementRuntimeDiagnostic('filter.syncPass.comments.skippedEmptyRoots');
                    return;
                }
                this.runSyncRefilterPass('comments', document, descriptors);
                this.setRuntimeDiagnosticGauge('filter.syncPass.comments.lastPhase', 'raf:root-scoped');
                this.setRuntimeDiagnosticGauge('filter.syncPass.comments.lastRootCount', requestedRoots.length);
            });
        },
getVisibilityRecoverySurface() {
            const pageType = window.__dcufRuntimeCoordinator?.getPageContext?.().type
                || window.__dcufPageContext?.type
                || 'other';
            if (pageType === 'lists') {
                return document.querySelector('table.gall_list, .gall_listwrap, .list_wrap');
            }
            if (pageType === 'view') {
                return document.querySelector('.writing_view_box, .gallview_contents, .view_content_wrap');
            }
            if (pageType === 'write') {
                return document.querySelector('form#write, form[name="modify"][action*="modify_submit"], #write_wrap, .gall_write, .write_box');
            }
            return document.body;
        },
captureHiddenVisibilityState() {
            const runtimeCoordinator = window.__dcufRuntimeCoordinator;
            runtimeCoordinator?.ensureMutationBus?.();
            const generation = runtimeCoordinator?.flushPendingMutations?.('visibility-hidden-snapshot')
                ?? runtimeCoordinator?.getMutationGeneration?.()
                ?? 0;
            const bfcacheState = runtimeCoordinator?.getBfcacheRecoveryState?.() || {};
            this._visibilityCycleId += 1;
            this._hiddenAt = Date.now();
            this._hiddenMutationGeneration = generation;
            this._hiddenBody = document.body;
            this._hiddenRecoverySurface = this.getVisibilityRecoverySurface();
            this._hiddenBfcacheRecoveryId = Number(bfcacheState.id) || 0;
            this.incrementRuntimeDiagnostic('lifecycle.visibility.hidden');
            this.setRuntimeDiagnosticGauge('lifecycle.visibility.hiddenGeneration', generation);
        },
getHiddenVisibilitySnapshot() {
            return {
                cycleId: this._visibilityCycleId,
                hiddenAt: this._hiddenAt,
                mutationGeneration: this._hiddenMutationGeneration,
                body: this._hiddenBody,
                recoverySurface: this._hiddenRecoverySurface,
                bfcacheRecoveryId: this._hiddenBfcacheRecoveryId
            };
        },
isMatchingBfcacheRecovery(snapshot, recoveryState) {
            return Boolean(
                snapshot?.hiddenAt
                && recoveryState?.succeeded
                && Number(recoveryState.id) > Number(snapshot.bfcacheRecoveryId || 0)
                && Number(recoveryState.startedAt) >= Number(snapshot.hiddenAt)
                && recoveryState.body === document.body
            );
        },
async restoreVisibleState(snapshot) {
            const runtimeCoordinator = window.__dcufRuntimeCoordinator;
            runtimeCoordinator?.ensureMutationBus?.();

            let recoveryState = runtimeCoordinator?.getBfcacheRecoveryState?.() || {};
            const recoveryBelongsToCycle = Number(recoveryState.id) > Number(snapshot.bfcacheRecoveryId || 0)
                && Number(recoveryState.startedAt) >= Number(snapshot.hiddenAt || 0)
                && recoveryState.body === document.body;
            if (recoveryState.pending && recoveryBelongsToCycle) {
                await runtimeCoordinator.waitForBfcacheRecovery?.();
                recoveryState = runtimeCoordinator?.getBfcacheRecoveryState?.() || recoveryState;
            }

            if (this.isMatchingBfcacheRecovery(snapshot, recoveryState)) {
                await reloadShortcutKey();
                this.incrementRuntimeDiagnostic('lifecycle.visibility.restore.skippedBfcache');
                this.setRuntimeDiagnosticGauge('lifecycle.visibility.restore.lastReason', 'bfcache-handled');
                return { restored: false, reason: 'bfcache-handled' };
            }

            const previousSettingsSignature = this._settingsSignature;
            const [, shortcutState] = await Promise.all([
                this.reloadSettings(),
                reloadShortcutKey()
            ]);
            const generation = runtimeCoordinator?.flushPendingMutations?.('visibility-visible-check')
                ?? runtimeCoordinator?.getMutationGeneration?.()
                ?? 0;
            const currentSurface = this.getVisibilityRecoverySurface();
            const reasons = [];
            if (generation !== snapshot.mutationGeneration) reasons.push('mutation');
            if (snapshot.body !== document.body || (snapshot.body && !snapshot.body.isConnected)) reasons.push('body');
            if (snapshot.recoverySurface !== currentSurface
                || (snapshot.recoverySurface && !snapshot.recoverySurface.isConnected)) reasons.push('surface');
            if (previousSettingsSignature !== this._settingsSignature) reasons.push('settings');
            if (snapshot.hiddenAt && Date.now() - snapshot.hiddenAt >= this.VISIBILITY_LONG_RESTORE_MS) reasons.push('long-suspend');

            this.setRuntimeDiagnosticGauge('lifecycle.visibility.restore.shortcutChanged', Boolean(shortcutState?.changed));
            if (reasons.length === 0) {
                this.incrementRuntimeDiagnostic('lifecycle.visibility.restore.skippedClean');
                this.setRuntimeDiagnosticGauge('lifecycle.visibility.restore.lastReason', 'clean');
                return { restored: false, reason: 'clean', shortcutChanged: Boolean(shortcutState?.changed) };
            }

            const reason = `visibilitychange-visible:${reasons.join('+')}`;
            await this.refilterAllContent(reason, {
                scheduleFollowups: false,
                settingsAlreadyLoaded: true
            });
            this.incrementRuntimeDiagnostic('lifecycle.visibility.restore.runs');
            this.setRuntimeDiagnosticGauge('lifecycle.visibility.restore.lastReason', reasons.join(','));
            return { restored: true, reason, shortcutChanged: Boolean(shortcutState?.changed) };
        },
async runFullRefilterPass(reason = 'refilterAllContent', { scheduleFollowups = true, settingsAlreadyLoaded = false } = {}) {
            if (!settingsAlreadyLoaded) await this.reloadSettings();
            const descriptors = this.getRefilterTargets('all');
            this.startDebugPass(reason, { targetCount: descriptors.length });
            this.runSyncRefilterPass('all', document, descriptors, {
                allowPersonalBlockReveal: true
            });
            if (scheduleFollowups) this.scheduleSyncRefilterPasses();
            this.applyAsyncToDescriptors(descriptors);
            this.incrementRuntimeDiagnostic('filter.fullRefilter.runs');
            this.setRuntimeDiagnosticGauge('filter.fullRefilter.lastTargetCount', descriptors.length);
            document.dispatchEvent(new CustomEvent('dcFilterRefiltered'));
        },
async refilterAllContent(reason = 'refilterAllContent', { scheduleFollowups = true, settingsAlreadyLoaded = false } = {}) {
            if (!this._pendingFullRefilterReasons) this._pendingFullRefilterReasons = [];
            this._pendingFullRefilterReasons.push({ reason, scheduleFollowups, settingsAlreadyLoaded });

            if (this._refilterAllContentRunning) {
                this.debugLog('refilter', 'coalesced full refilter request', {
                    reason,
                    pendingCount: this._pendingFullRefilterReasons.length
                });
                return this._refilterAllContentPromise;
            }

            this._refilterAllContentRunning = true;
            this._refilterAllContentPromise = (async () => {
                while (this._pendingFullRefilterReasons.length > 0) {
                    const pendingRequests = this._pendingFullRefilterReasons.splice(0);
                    const lastRequest = pendingRequests[pendingRequests.length - 1];
                    const runReason = pendingRequests.length > 1
                        ? `${lastRequest.reason} [coalesced:${pendingRequests.length}]`
                        : lastRequest.reason;
                    const shouldScheduleFollowups = pendingRequests.some((request) => request.scheduleFollowups !== false);
                    const settingsWereLoaded = pendingRequests.every((request) => request.settingsAlreadyLoaded === true);
                    await this.runFullRefilterPass(runReason, {
                        scheduleFollowups: shouldScheduleFollowups,
                        settingsAlreadyLoaded: settingsWereLoaded
                    });
                }
            })();

            try {
                await this._refilterAllContentPromise;
            } finally {
                this._refilterAllContentRunning = false;
                this._refilterAllContentPromise = null;
            }
        },
async handleVisibilityChange() {
            if (document.visibilityState !== 'visible') {
                this.captureHiddenVisibilityState();
                await this.flushBlockedUidCache('visibility-hidden');
                return;
            }
            if (this._visibilityRecoveryPromise) return this._visibilityRecoveryPromise;

            const snapshot = this.getHiddenVisibilitySnapshot();
            this._visibilityRecoveryPromise = this.restoreVisibleState(snapshot).catch(async (error) => {
                this.incrementRuntimeDiagnostic('lifecycle.visibility.restore.failed');
                console.warn('[DCUF lifecycle] visibility restore failed; running fallback refilter.', error);
                await this.refilterAllContent('visibilitychange-visible:fallback', { scheduleFollowups: false });
                return { restored: true, reason: 'fallback' };
            }).finally(() => {
                this._visibilityRecoveryPromise = null;
                if (this._visibilityCycleId === snapshot.cycleId && document.visibilityState === 'visible') {
                    this._hiddenAt = 0;
                    this._hiddenMutationGeneration = 0;
                    this._hiddenBody = null;
                    this._hiddenRecoverySurface = null;
                    this._hiddenBfcacheRecoveryId = 0;
                }
            });
            return this._visibilityRecoveryPromise;
        },
init() {
            if (this._initState === 'ready') return Promise.resolve('already-ready');
            if (this._initState === 'initializing' && this._initPromise) return this._initPromise;
            this._initState = 'initializing';
            this._initPromise = (async () => {
                this.installDebugApi();
                this.debugLog('init', 'FilterModule init start', { version: '__VERSION__' });
                const snapshot = await this.loadBootSnapshot();
                await this.cleanupLegacyManagedBlockConfig(snapshot);
                await this.reloadSettings(snapshot);
                await this.refreshBlockedUidsCache(snapshot.blockedUidsRaw);
                if (!this._visibilityChangeHandler) {
                    this._visibilityChangeHandler = () => this.handleVisibilityChange();
                    document.addEventListener('visibilitychange', this._visibilityChangeHandler);
                }
                if (!this._blockedUidPagehideHandler) {
                    this._blockedUidPagehideHandler = () => {
                        void this.flushBlockedUidCache('pagehide').catch((error) => {
                            console.warn('DCinside User Filter: pagehide blocked UID flush failed.', error);
                        });
                    };
                    window.addEventListener('pagehide', this._blockedUidPagehideHandler);
                }
                this.initializeUniversalObserver();
                window.__dcufBootController?.note?.('boot.local-filter-settings-ready');
                if (snapshot.thresholdMissing) {
                    const showFirstRunSettings = async () => {
                        await this.initializeFirstRunThreshold();
                        await this.showSettings();
                    };
                    const bootController = window.__dcufBootController;
                    if (typeof bootController?.onReady === 'function') bootController.onReady(showFirstRunSettings);
                    else queueMicrotask(showFirstRunSettings);
                }
                this._initState = 'ready';
                return 'ready';
            })().catch((error) => {
                this._initState = 'failed';
                this._initPromise = null;
                throw error;
            });
            return this._initPromise;
        },
        getHostCookie(name) {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            return parts.length === 2 ? parts.pop().split(';').shift() : undefined;
        },
        noteBoot(label, detail) {
            window.__dcufBootController?.note?.(label, detail);
        }
        };
        const invoke = (method, runtime, args = []) => {
            if (!Object.hasOwn(legacyMethods, method)) throw new Error(`Unsupported filter host action: ${method}`);
            return legacyMethods[method].call(runtime, ...args);
        };
        return DCUF_UI_CONTRACTS.createHostSurfaceAdapter({
            connect(runtime, ...args) { return invoke('init', runtime, args); },
            refresh(runtime, scope = 'all', root = document) { return invoke('runSyncRefilterPass', runtime, [scope, root]); },
            mountOwnedRoot(root) { return root; },
            invokeNative(action, runtime, ...args) { return invoke(action, runtime, args); },
            dispose(runtime) {
                runtime._runtimeMutationUnsubscribe?.();
                runtime._runtimeMutationUnsubscribe = null;
            },
        });
    })();
    window.__dcufFilterModule = FilterModule;
