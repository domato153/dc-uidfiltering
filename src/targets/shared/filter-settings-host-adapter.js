    const __dcufFilterSettingsHostAdapter = (() => {
        const markOwnedSurface = (element, surface, role = 'panel', state = 'open') => {
            element.setAttribute('data-dcuf-surface', surface);
            element.setAttribute('data-dcuf-role', role);
            element.setAttribute('data-dcuf-state', state);
            element.setAttribute('data-dcuf-presentation', __dcufSettingsPresenter.VERSION);
            return element;
        };
        const legacyMethods = {
        async showSettings() {
            window.__dcufEnsureFilterUiStyles?.();
            const surfaceSnapshot = await this.getSettingsSurfaceSnapshot();
            const { masterDisabled = false, excludeRecommended = false, threshold = 0, ratioEnabled = false, ratioMin = '', ratioMax = '', blockPumPosts = false, blockGuestEnabled = false, proxyBlockMode = 0, telecomBlockEnabled = false } = surfaceSnapshot.settings;
            const currentShortcut = surfaceSnapshot.shortcut;
            const normalizedProxyBlockMode = this.normalizeProxyBlockMode(proxyBlockMode);
            const existingDiv = document.getElementById(this.CONSTANTS.UI_IDS.SETTINGS_PANEL);
            if (existingDiv) {
                __dcufPopupGeometryHostAdapter.dispose(existingDiv);
                existingDiv.remove();
            }
            const div = document.createElement('div');
            div.id = this.CONSTANTS.UI_IDS.SETTINGS_PANEL;
            div.style = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:24px 20px 18px 20px;min-width:280px;z-index:99999;border:2px solid #333;border-radius:10px;box-shadow:0 0 10px #0008; cursor: default; user-select: none;';
            const proxyModeButtonsHtml = [
                [this.PROXY_MODE.OFF, '끔'],
                [this.PROXY_MODE.STRICT, '확실'],
                [this.PROXY_MODE.AGGRESSIVE, '공격적']
            ].map(([mode, label]) => {
                const active = normalizedProxyBlockMode === mode;
                return `<button type="button" data-proxy-mode="${mode}" aria-pressed="${active}" style="flex:1;min-width:0;border:0;background:${active ? '#3b71fd' : 'transparent'};color:${active ? '#fff' : '#333'};font-size:12px;font-weight:${active ? '700' : '600'};padding:5px 0;border-radius:7px;cursor:pointer;">${label}</button>`;
            }).join('');
            div.innerHTML = `
                <div style="margin-bottom:15px;padding-bottom:12px;border-bottom: 2px solid #ccc; display:flex;align-items:center; justify-content: space-between;">
                    <div style="display:flex; align-items: center; gap: 10px;">
                        <div style="display:flex; align-items:center; gap:7px;"><label class="switch" style="flex-shrink:0;"><input id="${this.CONSTANTS.UI_IDS.MASTER_DISABLE_CHECKBOX}" type="checkbox" ${masterDisabled ? 'checked' : ''}><span class="switch-slider"></span></label><label for="${this.CONSTANTS.UI_IDS.MASTER_DISABLE_CHECKBOX}" style="font-size:15px;cursor:pointer;"><b>모든 필터 기능 끄기</b></label></div>
                        <div style="border-left: 2px solid #ccc; padding-left: 10px; display:flex; align-items:center; gap:7px;"><label class="switch" style="flex-shrink:0;"><input id="${this.CONSTANTS.UI_IDS.EXCLUDE_RECOMMENDED_CHECKBOX}" type="checkbox" ${excludeRecommended ? 'checked' : ''}><span class="switch-slider"></span></label><label for="${this.CONSTANTS.UI_IDS.EXCLUDE_RECOMMENDED_CHECKBOX}" style="font-size:14px;cursor:pointer;"><b>개념글 제외</b></label></div>
                    </div>
                    <div><button id="${this.CONSTANTS.UI_IDS.CLOSE_BUTTON}" style="background:none;border:none;font-size:24px;cursor:pointer;line-height:1;padding:0 4px;color:#555;">✕</button></div>
                </div>
                <div id="${this.CONSTANTS.UI_IDS.SETTINGS_CONTAINER}" style="opacity:${masterDisabled ? 0.5 : 1}; pointer-events:${masterDisabled ? 'none' : 'auto'};">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; flex-direction: column; align-items: center;"><h3 style="cursor: default;margin-top:0;margin-bottom:5px;">유저 글+댓글 합 기준값(이 값 이하 차단)</h3><input id="${this.CONSTANTS.UI_IDS.THRESHOLD_INPUT}" type="number" min="0" value="${threshold}" style="width:80px;font-size:16px; cursor: initial;"><div style="font-size:13px;color:#666;margin-top:5px;">0 또는 빈칸으로 두면 비활성화됩니다.</div></div>
                        <div style="border: 2px solid #000; border-radius: 5px; padding: 8px 8px 5px 6px;"><div style="display: flex; flex-direction: column; align-items: center; gap: 7px; text-align:center;"><div style="display:flex; align-items:center; justify-content:center; gap:6px; padding-bottom: 5px; border-bottom: 1px solid #ddd; width:100%;"><label class="switch" style="flex-shrink:0;"><input id="${this.CONSTANTS.UI_IDS.BLOCK_GUEST_CHECKBOX}" type="checkbox" ${blockGuestEnabled ? 'checked' : ''}><span class="switch-slider"></span></label><label for="${this.CONSTANTS.UI_IDS.BLOCK_GUEST_CHECKBOX}" style="font-size:13px;cursor:pointer;">유동 전체 차단</label></div><div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding-bottom: 5px; border-bottom: 1px solid #ddd; width:100%; text-align:center;"><div style="font-size:13px;">우회 IP 차단(오탐 위험 있음)</div><div id="${this.CONSTANTS.UI_IDS.PROXY_BLOCK_MODE_GROUP}" style="display:flex; width:100%; max-width:220px; gap:2px; background:#edf1f5; border:1px solid #cfd6dd; border-radius:8px; padding:2px; justify-content:center;">${proxyModeButtonsHtml}</div><div class="dcuf-proxy-mode-desc" style="font-size:11px;color:#666;line-height:1.2; text-align:center;">끔 - 확실한 우회 차단 - 공격적 우회 차단</div></div><div style="display:flex; align-items:center; gap:6px;"><label class="switch" style="flex-shrink:0;"><input id="${this.CONSTANTS.UI_IDS.TELECOM_BLOCK_CHECKBOX}" type="checkbox" ${telecomBlockEnabled ? 'checked' : ''}><span class="switch-slider"></span></label><label for="${this.CONSTANTS.UI_IDS.TELECOM_BLOCK_CHECKBOX}" style="font-size:13px;cursor:pointer;">통신사 IP 차단</label></div></div></div>
                    </div>
                    <hr style="border:0;border-top:2px solid #222;margin:16px 0 12px 0;">
                    <div style="margin-bottom:8px;display:flex;align-items:center;gap:8px;"><label class="switch" style="flex-shrink:0;"><input id="${this.CONSTANTS.UI_IDS.RATIO_ENABLE_CHECKBOX}" type="checkbox" ${ratioEnabled ? 'checked' : ''}><span class="switch-slider"></span></label><label for="${this.CONSTANTS.UI_IDS.RATIO_ENABLE_CHECKBOX}" style="font-size:15px;cursor:pointer;">글/댓글 비율 필터 사용</label></div>
                    <div id="${this.CONSTANTS.UI_IDS.RATIO_SECTION}">
                        <div style="display:flex;gap:10px;align-items:center;">
                            <div style="display:flex;flex-direction:column;align-items:center;"><label for="${this.CONSTANTS.UI_IDS.RATIO_MIN_INPUT}" style="font-size:14px;">댓글/글 비율 일정 이상 차단 </label><div style="font-size:12px;color:#888;line-height:1.2;">(댓글만 많은 놈)</div><input id="${this.CONSTANTS.UI_IDS.RATIO_MIN_INPUT}" type="number" step="any" placeholder="예: 10" value="${ratioMin !== '' ? ratioMin : ''}" style="width:100px;font-size:15px;text-align:center; margin-top: 4px;"></div>
                            <div style="display:flex;flex-direction:column;align-items:center;"><label for="${this.CONSTANTS.UI_IDS.RATIO_MAX_INPUT}" style="font-size:14px;">글/댓글 비율 일정 이상 차단 </label><div style="font-size:12px;color:#888;line-height:1.2;">(글만 많은 놈)</div><input id="${this.CONSTANTS.UI_IDS.RATIO_MAX_INPUT}" type="number" step="any" placeholder="예: 1" value="${ratioMax !== '' ? ratioMax : ''}" style="width:100px;font-size:15px;text-align:center; margin-top: 4px;"></div>
                        </div><div style="margin-top:8px;font-size:13px;color:#666;text-align:left;">비율이 입력값과 같거나 큰(이상)인 유저를 차단합니다.</div>
                    </div>
                    <div class="dcuf-settings-section dcuf-settings-pum" style="display:flex;align-items:center;gap:8px;"><label class="switch" style="flex-shrink:0;"><input id="${this.CONSTANTS.UI_IDS.BLOCK_PUM_POSTS_CHECKBOX}" type="checkbox" ${blockPumPosts ? 'checked' : ''}><span class="switch-slider"></span></label><label for="${this.CONSTANTS.UI_IDS.BLOCK_PUM_POSTS_CHECKBOX}" style="font-size:15px;cursor:pointer;">펌 게시물 차단</label></div>
                    <button type="button" id="${this.CONSTANTS.UI_IDS.HEADTEXT_MANAGER_BUTTON}" style="width:100%;margin-top:14px;padding:9px 10px;border:1px solid #9aa4b2;border-radius:7px;background:#f6f8fb;color:#222;font-weight:700;cursor:pointer;">갤러리별 말머리 차단 관리</button>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; padding-top:15px; border-top: 2px solid #ccc;">
                    <div style="font-size:15px;color:#444;text-align:left;">
                        창 여닫는 단축키: <b id="${this.CONSTANTS.UI_IDS.SHORTCUT_DISPLAY}">${currentShortcut}</b>
                        <a href="#" id="${this.CONSTANTS.UI_IDS.CHANGE_SHORTCUT_BTN}" style="margin-left: 8px; font-size: 13px; text-decoration: underline; cursor: pointer;">(변경)</a>
                    </div>
                    <button id="${this.CONSTANTS.UI_IDS.SAVE_BUTTON}" style="font-size:16px;border:2px solid #000;border-radius:4px;background:#fff; cursor: pointer; padding: 4px 10px;">저장 & 실행</button>
                </div>`;
            div.removeAttribute('style');
            div.className = 'dcuf-settings-panel';
            markOwnedSurface(div, 'filter-settings');
            div.setAttribute('role', 'dialog');
            div.setAttribute('aria-modal', 'true');
            div.setAttribute('aria-labelledby', 'dcuf-filter-settings-title');
            div.innerHTML = __dcufSettingsPresenter.renderFilterSettings({
                ids: this.CONSTANTS.UI_IDS,
                settings: { masterDisabled, excludeRecommended, threshold, ratioEnabled, ratioMin, ratioMax, blockPumPosts, blockGuestEnabled, telecomBlockEnabled },
                shortcut: currentShortcut,
                proxyModes: [
                    { mode: this.PROXY_MODE.OFF, label: '끔', active: normalizedProxyBlockMode === this.PROXY_MODE.OFF },
                    { mode: this.PROXY_MODE.STRICT, label: '확실', active: normalizedProxyBlockMode === this.PROXY_MODE.STRICT },
                    { mode: this.PROXY_MODE.AGGRESSIVE, label: '공격적', active: normalizedProxyBlockMode === this.PROXY_MODE.AGGRESSIVE },
                ],
            });
            document.body.appendChild(div);


            div.classList.add('dcuf-settings-panel');
            const settingsHeader = div.firstElementChild;
            if (settingsHeader) settingsHeader.classList.add('dcuf-settings-header');
            const settingsFooter = div.lastElementChild;
            if (settingsFooter) settingsFooter.classList.add('dcuf-settings-footer');
            const settingsMain = document.getElementById(this.CONSTANTS.UI_IDS.SETTINGS_CONTAINER);
            if (settingsMain) {
                settingsMain.classList.add('dcuf-settings-body');
            }
            const ratioSectionRoot = document.getElementById(this.CONSTANTS.UI_IDS.RATIO_SECTION);
            if (ratioSectionRoot) ratioSectionRoot.classList.add('dcuf-settings-section', 'dcuf-settings-ratio');

            try {
                __dcufPopupGeometryHostAdapter.connect(div, {
                    minWidth: 280,
                    minHeight: 220,
                    pointerDragSelector: '.dcuf-settings-header',
                    pointerInteractiveSelector: 'button, input, label, a, select, textarea, .switch',
                });
            } catch (e) {
                console.warn('DCinside User Filter: settings pinch init failed.', e);
            }

            const closeSettingsPanel = () => {
                div.classList.add('dcuf-pop-leave');
                window.setTimeout(() => {
                    __dcufPopupGeometryHostAdapter.dispose(div);
                    div.remove();
                }, 210);
            };

            const input = div.querySelector(`#${this.CONSTANTS.UI_IDS.THRESHOLD_INPUT}`);
            const changeShortcutBtn = div.querySelector(`#${this.CONSTANTS.UI_IDS.CHANGE_SHORTCUT_BTN}`);
            const masterDisableCheckbox = div.querySelector(`#${this.CONSTANTS.UI_IDS.MASTER_DISABLE_CHECKBOX}`);
            const settingsContainer = div.querySelector(`#${this.CONSTANTS.UI_IDS.SETTINGS_CONTAINER}`);
            const ratioSection = div.querySelector(`#${this.CONSTANTS.UI_IDS.RATIO_SECTION}`);
            const ratioEnableCheckbox = div.querySelector(`#${this.CONSTANTS.UI_IDS.RATIO_ENABLE_CHECKBOX}`);
            const ratioMinInput = div.querySelector(`#${this.CONSTANTS.UI_IDS.RATIO_MIN_INPUT}`);
            const ratioMaxInput = div.querySelector(`#${this.CONSTANTS.UI_IDS.RATIO_MAX_INPUT}`);
            const blockPumPostsCheckbox = div.querySelector(`#${this.CONSTANTS.UI_IDS.BLOCK_PUM_POSTS_CHECKBOX}`);
            const closeButton = div.querySelector(`#${this.CONSTANTS.UI_IDS.CLOSE_BUTTON}`);
            const saveButton = div.querySelector(`#${this.CONSTANTS.UI_IDS.SAVE_BUTTON}`);
            const excludeRecommendedCheckbox = div.querySelector(`#${this.CONSTANTS.UI_IDS.EXCLUDE_RECOMMENDED_CHECKBOX}`);
            const blockGuestCheckbox = div.querySelector(`#${this.CONSTANTS.UI_IDS.BLOCK_GUEST_CHECKBOX}`);
            const proxyBlockModeGroup = div.querySelector(`#${this.CONSTANTS.UI_IDS.PROXY_BLOCK_MODE_GROUP}`);
            const telecomBlockCheckbox = div.querySelector(`#${this.CONSTANTS.UI_IDS.TELECOM_BLOCK_CHECKBOX}`);
            const headtextManagerButton = div.querySelector(`#${this.CONSTANTS.UI_IDS.HEADTEXT_MANAGER_BUTTON}`);

            if (input) { input.focus(); input.select(); }

            if (changeShortcutBtn) {
                changeShortcutBtn.onclick = (e) => {
                    e.preventDefault();
                    this.showShortcutChanger();
                };
            }

            if (closeButton) {
                closeButton.onclick = closeSettingsPanel;
                closeButton.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    closeSettingsPanel();
                }, { passive: false });
            }

            if (!masterDisableCheckbox || !settingsContainer || !ratioSection || !ratioEnableCheckbox || !ratioMinInput || !ratioMaxInput || !blockPumPostsCheckbox || !saveButton || !excludeRecommendedCheckbox || !blockGuestCheckbox || !proxyBlockModeGroup || !telecomBlockCheckbox) {
                console.error('DCinside User Filter: settings popup init failed - required control missing.');
                return;
            }

            const updateMasterState = () => { settingsContainer.dataset.dcufState = masterDisableCheckbox.checked ? 'disabled' : 'enabled'; };
            masterDisableCheckbox.addEventListener('change', updateMasterState); updateMasterState();
            const updateRatioSectionState = () => { const enabled = ratioEnableCheckbox.checked; ratioSection.dataset.dcufState = enabled ? 'enabled' : 'disabled'; ratioMinInput.disabled = !enabled; ratioMaxInput.disabled = !enabled; };
            ratioEnableCheckbox.addEventListener('change', updateRatioSectionState); updateRatioSectionState();
            let currentProxyBlockMode = normalizedProxyBlockMode;
            const renderProxyModeButtons = (mode) => {
                proxyBlockModeGroup.querySelectorAll('button[data-proxy-mode]').forEach((button) => {
                    const buttonMode = this.normalizeProxyBlockMode(button.getAttribute('data-proxy-mode'));
                    const active = mode === buttonMode;
                    button.setAttribute('aria-pressed', active ? 'true' : 'false');
                });
            };
            renderProxyModeButtons(currentProxyBlockMode);

            // [v2.6.8 추가] 스위치 실시간 저장 & 필터 즉시 적용
            const applyCheckboxChange = (storageKey, value, clearBlockedGuests = false) => this.commitImmediateSetting(storageKey, value, { clearBlockedGuests });

            masterDisableCheckbox.addEventListener('change', () =>
                applyCheckboxChange(this.CONSTANTS.STORAGE_KEYS.MASTER_DISABLED, masterDisableCheckbox.checked)
            );
            excludeRecommendedCheckbox.addEventListener('change', (e) =>
                applyCheckboxChange(this.CONSTANTS.STORAGE_KEYS.EXCLUDE_RECOMMENDED, e.target.checked)
            );
            blockGuestCheckbox.addEventListener('change', async (e) => {
                const checked = e.target.checked;
                await applyCheckboxChange(this.CONSTANTS.STORAGE_KEYS.BLOCK_GUEST, checked, !checked);
            });
            proxyBlockModeGroup.addEventListener('click', (e) => {
                const targetButton = e.target.closest('button[data-proxy-mode]');
                if (!targetButton) return;
                const nextMode = this.normalizeProxyBlockMode(targetButton.getAttribute('data-proxy-mode'));
                if (nextMode === currentProxyBlockMode) return;
                currentProxyBlockMode = nextMode;
                renderProxyModeButtons(currentProxyBlockMode);
                applyCheckboxChange(this.CONSTANTS.STORAGE_KEYS.BLOCK_PROXY, currentProxyBlockMode);
            });
            telecomBlockCheckbox.addEventListener('change', (e) =>
                applyCheckboxChange(this.CONSTANTS.STORAGE_KEYS.BLOCK_TELECOM, e.target.checked)
            );
            blockPumPostsCheckbox.addEventListener('change', (e) =>
                applyCheckboxChange(this.CONSTANTS.STORAGE_KEYS.BLOCK_PUM_POSTS, e.target.checked)
            );
            headtextManagerButton?.addEventListener('click', () => this.showHeadtextBlockManager());
            ratioEnableCheckbox.addEventListener('change', (e) =>
                applyCheckboxChange(this.CONSTANTS.STORAGE_KEYS.RATIO_ENABLED, e.target.checked)
            );

            const enterKeySave = (e) => { if (e.key === 'Enter') saveButton.click(); };
            [input, ratioMinInput, ratioMaxInput].forEach(el => { if (el) el.addEventListener('keydown', enterKeySave); });
            saveButton.onclick = async () => {
                saveButton.disabled = true; saveButton.textContent = '저장 중...';
                const blockGuestChecked = blockGuestCheckbox.checked;
                let val = parseInt(input ? input.value : '0', 10);
                if (isNaN(val)) val = 0;
                const values = {
                    masterDisabled: masterDisableCheckbox.checked,
                    excludeRecommended: excludeRecommendedCheckbox.checked,
                    threshold: val,
                    ratioEnabled: ratioEnableCheckbox.checked,
                    ratioMin: ratioMinInput.value,
                    ratioMax: ratioMaxInput.value,
                    blockPumPosts: blockPumPostsCheckbox.checked,
                    blockGuestEnabled: blockGuestChecked,
                    proxyBlockMode: currentProxyBlockMode,
                    telecomBlockEnabled: telecomBlockCheckbox.checked,
                };
                try {
                    await this.commitSettingsSurface(values);
                    closeSettingsPanel();
                } catch (error) {
                    console.error('DCinside User Filter: Settings save failed.', error);
                    saveButton.disabled = false;
                    saveButton.textContent = '저장 & 실행';
                    alert('설정 저장에 실패했습니다. 콘솔을 확인해 주세요.');
                }
            };
        },
        getGalleryKey(urlLike = window.location.href) {
            try {
                const url = new URL(urlLike, window.location.href);
                const id = (url.searchParams.get('id') || '').trim();
                if (!id) return null;
                const path = url.pathname.toLowerCase();
                const type = path.includes('/mini/') ? 'mini' : (path.includes('/mgallery/') ? 'mgallery' : 'board');
                return `${type}:${id}`;
            } catch {
                return null;
            }
        },
        getCanonicalHeadtextFromNode(source) {
            if (!(source instanceof Element)) return '';
            const explicit = source.getAttribute('data-headtext');
            if (explicit) return this.normalizeHeadtext(explicit);
            const canonical = source.matches('.subject_inner') ? source : source.querySelector('.subject_inner');
            if (canonical?.textContent?.trim()) return this.normalizeHeadtext(canonical.textContent);
            const valueNode = source.matches('[data-val]') ? source : source.querySelector('[data-val]');
            if (valueNode?.getAttribute('data-val')) return this.normalizeHeadtext(valueNode.getAttribute('data-val'));
            const directText = Array.from(source.childNodes)
                .filter((node) => node.nodeType === Node.TEXT_NODE)
                .map((node) => node.textContent || '')
                .join(' ');
            return this.normalizeHeadtext(directText || source.textContent || '');
        },
        collectDiscoveredHeadtexts() {
            const values = new Set();
            document.querySelectorAll('tr.ub-content, .custom-post-item, .view_bottom li').forEach((element) => {
                const descriptor = this.describeFilterTarget(element);
                if (descriptor?.isHeadtextTarget && descriptor.writerInfo && descriptor.headtext && !descriptor.isNotice) values.add(descriptor.headtext);
            });
            document.querySelectorAll('a[onclick*="listSearchHead"], .subject_morelist a, [data-fixture-headtext-nav]').forEach((element) => {
                const headtext = this.getCanonicalHeadtextFromNode(element);
                if (headtext && !['전체', '공지'].includes(headtext)) values.add(headtext);
            });
            return Array.from(values).sort((a, b) => a.localeCompare(b, 'ko'));
        },
        async showHeadtextBlockManager() {
            document.getElementById(this.CONSTANTS.UI_IDS.HEADTEXT_MANAGER_PANEL)?.remove();
            const currentKey = this.getGalleryKey();
            const panel = document.createElement('section');
            panel.id = this.CONSTANTS.UI_IDS.HEADTEXT_MANAGER_PANEL;
            panel.className = 'dcuf-settings-panel';
            panel.setAttribute('role', 'dialog');
            panel.setAttribute('aria-modal', 'true');
            panel.style.cssText = 'position:fixed;z-index:2147483646;left:50%;top:50%;transform:translate(-50%,-50%);width:min(420px,calc(100vw - 24px));max-height:min(680px,calc(100vh - 24px));overflow:auto;padding:18px;border:1px solid #8d98a6;border-radius:12px;background:#fff;color:#20242a;box-shadow:0 20px 60px #0007;box-sizing:border-box;';
            panel.removeAttribute('style');
            markOwnedSurface(panel, 'headtext-settings');
            document.body.appendChild(panel);

            const render = async () => {
                const rules = await this.loadGalleryHeadtextBlocks();
                const current = new Set(currentKey ? (rules[currentKey] || []) : []);
                const discovered = Array.from(new Set([...this.collectDiscoveredHeadtexts(), ...current])).sort((a, b) => a.localeCompare(b, 'ko'));
                panel.replaceChildren();

                const modernOthers = Object.entries(rules).filter(([key]) => key !== currentKey).sort(([a], [b]) => a.localeCompare(b));
                panel.innerHTML = __dcufSettingsPresenter.renderHeadtextManager({ currentKey, discovered, current, others: modernOthers });
                panel.querySelector('[data-dcuf-headtext-action="close"]').onclick = () => panel.remove();
                panel.querySelectorAll('[data-dcuf-headtext-value]').forEach((input) => {
                    input.addEventListener('change', async () => {
                        const value = input.dataset.dcufHeadtextValue;
                        if (input.checked) current.add(value); else current.delete(value);
                        const next = { ...rules };
                        if (current.size) next[currentKey] = Array.from(current); else delete next[currentKey];
                        input.disabled = true;
                        await this.saveGalleryHeadtextBlocks(next, 'headtext checkbox');
                        await render();
                    });
                });
                const modernManualInput = panel.querySelector('[data-dcuf-headtext-manual]');
                const addButton = panel.querySelector('[data-dcuf-headtext-action="add"]');
                addButton.onclick = async () => {
                    const value = this.normalizeHeadtext(modernManualInput.value);
                    if (!value) return;
                    current.add(value);
                    await this.saveGalleryHeadtextBlocks({ ...rules, [currentKey]: Array.from(current) }, 'manual headtext add');
                    await render();
                };
                modernManualInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') addButton.click(); });
                panel.querySelector('[data-dcuf-headtext-action="clear"]').onclick = async () => {
                    const next = { ...rules };
                    delete next[currentKey];
                    await this.saveGalleryHeadtextBlocks(next, 'clear current gallery headtexts');
                    await render();
                };
                panel.querySelectorAll('[data-dcuf-headtext-remove]').forEach((button) => {
                    button.onclick = async () => {
                        const next = { ...rules };
                        delete next[button.dataset.dcufHeadtextRemove];
                        await this.saveGalleryHeadtextBlocks(next, 'remove saved gallery headtexts');
                        await render();
                    };
                });
                return;

                const header = document.createElement('div');
                header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px;';
                const title = document.createElement('strong');
                title.textContent = '갤러리별 말머리 차단';
                const close = document.createElement('button');
                close.type = 'button'; close.textContent = '✕'; close.setAttribute('aria-label', '닫기');
                close.style.cssText = 'border:0;background:transparent;font-size:22px;cursor:pointer;color:inherit;';
                close.onclick = () => panel.remove();
                header.append(title, close);
                panel.appendChild(header);

                const keyLabel = document.createElement('div');
                keyLabel.textContent = currentKey ? `현재 갤러리: ${currentKey}` : '현재 페이지의 갤러리를 확인할 수 없습니다.';
                keyLabel.style.cssText = 'font-size:13px;color:#667085;margin-bottom:10px;';
                panel.appendChild(keyLabel);

                const choices = document.createElement('div');
                choices.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:7px;margin-bottom:10px;';
                discovered.forEach((headtext) => {
                    const label = document.createElement('label');
                    label.style.cssText = 'display:flex;align-items:center;gap:6px;padding:7px;border:1px solid #d7dde5;border-radius:7px;cursor:pointer;min-width:0;';
                    const input = document.createElement('input');
                    input.type = 'checkbox'; input.checked = current.has(headtext); input.disabled = !currentKey;
                    input.addEventListener('change', async () => {
                        if (input.checked) current.add(headtext); else current.delete(headtext);
                        const next = { ...rules };
                        if (current.size) next[currentKey] = Array.from(current); else delete next[currentKey];
                        input.disabled = true;
                        await this.saveGalleryHeadtextBlocks(next, 'headtext checkbox');
                        await render();
                    });
                    const text = document.createElement('span'); text.textContent = headtext;
                    label.append(input, text); choices.appendChild(label);
                });
                if (!discovered.length) {
                    const empty = document.createElement('div'); empty.textContent = '현재 목록에서 발견한 말머리가 없습니다.'; empty.style.cssText = 'grid-column:1/-1;color:#667085;font-size:13px;'; choices.appendChild(empty);
                }
                panel.appendChild(choices);

                const manual = document.createElement('div');
                manual.style.cssText = 'display:flex;gap:7px;margin-bottom:10px;';
                const manualInput = document.createElement('input');
                manualInput.type = 'text'; manualInput.placeholder = '목록에 없는 말머리'; manualInput.disabled = !currentKey;
                manualInput.style.cssText = 'flex:1;min-width:0;padding:8px;border:1px solid #b9c2ce;border-radius:7px;';
                const add = document.createElement('button'); add.type = 'button'; add.textContent = '추가'; add.disabled = !currentKey;
                add.style.cssText = 'padding:8px 12px;border:1px solid #8793a2;border-radius:7px;background:#f6f8fb;cursor:pointer;';
                add.onclick = async () => {
                    const value = this.normalizeHeadtext(manualInput.value);
                    if (!value) return;
                    current.add(value);
                    await this.saveGalleryHeadtextBlocks({ ...rules, [currentKey]: Array.from(current) }, 'manual headtext add');
                    await render();
                };
                manualInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') add.click(); });
                manual.append(manualInput, add); panel.appendChild(manual);

                const clear = document.createElement('button');
                clear.type = 'button'; clear.textContent = '현재 갤러리 전체 해제'; clear.disabled = !currentKey || !current.size;
                clear.style.cssText = 'width:100%;padding:8px;border:1px solid #c5ccd5;border-radius:7px;background:transparent;color:inherit;cursor:pointer;margin-bottom:14px;';
                clear.onclick = async () => {
                    const next = { ...rules }; delete next[currentKey];
                    await this.saveGalleryHeadtextBlocks(next, 'clear current gallery headtexts');
                    await render();
                };
                panel.appendChild(clear);

                const savedTitle = document.createElement('strong'); savedTitle.textContent = '저장된 다른 갤러리'; panel.appendChild(savedTitle);
                const saved = document.createElement('div'); saved.style.cssText = 'display:grid;gap:7px;margin-top:8px;';
                const others = Object.entries(rules).filter(([key]) => key !== currentKey).sort(([a], [b]) => a.localeCompare(b));
                others.forEach(([key, values]) => {
                    const row = document.createElement('div'); row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px;border:1px solid #d7dde5;border-radius:7px;';
                    const text = document.createElement('span'); text.textContent = `${key}: ${values.join(', ')}`; text.style.cssText = 'flex:1;min-width:0;overflow-wrap:anywhere;font-size:13px;';
                    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '삭제';
                    remove.style.cssText = 'border:1px solid #d49a9a;border-radius:6px;background:#fff5f5;color:#b42318;padding:5px 8px;cursor:pointer;';
                    remove.onclick = async () => { const next = { ...rules }; delete next[key]; await this.saveGalleryHeadtextBlocks(next, 'remove saved gallery headtexts'); await render(); };
                    row.append(text, remove); saved.appendChild(row);
                });
                if (!others.length) { const none = document.createElement('div'); none.textContent = '다른 갤러리에 저장된 항목이 없습니다.'; none.style.cssText = 'font-size:13px;color:#667085;'; saved.appendChild(none); }
                panel.appendChild(saved);
            };
            await render();
        },
        showShortcutChanger() {
            if (document.getElementById(this.CONSTANTS.UI_IDS.SHORTCUT_MODAL)) return;


            const settingsPanel = document.getElementById(this.CONSTANTS.UI_IDS.SETTINGS_PANEL);
            settingsPanel.style.pointerEvents = 'none';


            const overlay = document.createElement('div');
            overlay.id = this.CONSTANTS.UI_IDS.SHORTCUT_MODAL_OVERLAY;
            overlay.style = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 100000;';
            overlay.removeAttribute('style');
            markOwnedSurface(overlay, 'shortcut-settings', 'overlay');
            document.body.appendChild(overlay);


            const modal = document.createElement('div');
            modal.id = this.CONSTANTS.UI_IDS.SHORTCUT_MODAL;
            modal.style = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff; padding: 20px; border-radius: 8px; z-index: 100001; text-align: center; box-shadow: 0 0 15px rgba(0,0,0,0.3);';
            modal.innerHTML = `
                <h4 style="margin-top: 0; margin-bottom: 15px; font-size: 16px;">새로운 단축키를 입력하세요 (최대 3개)</h4>
                <div id="${this.CONSTANTS.UI_IDS.NEW_SHORTCUT_PREVIEW}" style="min-width: 200px; height: 40px; line-height: 40px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 20px; font-size: 18px; font-weight: bold; color: #333;">입력 대기 중...</div>
                <div>
                    <button id="${this.CONSTANTS.UI_IDS.SAVE_SHORTCUT_BTN}" style="padding: 8px 16px; margin-right: 10px; border: 1px solid #3b71fd; background: #3b71fd; color: #fff; border-radius: 4px; cursor: pointer;">변경</button>
                    <button id="${this.CONSTANTS.UI_IDS.CANCEL_SHORTCUT_BTN}" style="padding: 8px 16px; border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px; cursor: pointer;">취소</button>
                </div>
            `;
            modal.removeAttribute('style');
            markOwnedSurface(modal, 'shortcut-settings');
            modal.innerHTML = __dcufSettingsPresenter.renderShortcutModal(this.CONSTANTS.UI_IDS);
            document.body.appendChild(modal);


            let pressedKeys = new Set();
            let combinationTimeout = null;
            const previewEl = document.getElementById(this.CONSTANTS.UI_IDS.NEW_SHORTCUT_PREVIEW);


            const updatePreview = () => {
                if (pressedKeys.size > 0) {
                    previewEl.textContent = this.formatShortcutKeys(pressedKeys);
                } else {
                    previewEl.textContent = '입력 대기 중...';
                }
            };


            const keydownHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();


                // 타이머가 있다면, 아직 조합이 진행 중이라는 의미이므로 초기화
                clearTimeout(combinationTimeout);


                if (pressedKeys.size < 3) {
                    pressedKeys.add(e.key);
                    updatePreview();
                }


                // 키 입력이 0.5초간 없으면 현재 조합을 확정하고 Set을 비움
                combinationTimeout = setTimeout(() => {
                    pressedKeys.clear();
                }, 500);
            };


            const keyupHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                // 키를 떼는 시점은 조합 확정과 관련 없으므로, pressedKeys를 유지합니다.
            };


            document.addEventListener('keydown', keydownHandler, true);
            document.addEventListener('keyup', keyupHandler, true);




            const cleanup = () => {
                document.removeEventListener('keydown', keydownHandler, true);
                document.removeEventListener('keyup', keyupHandler, true);
                overlay.remove();
                modal.remove();
                settingsPanel.style.pointerEvents = 'auto';
            };


            document.getElementById(this.CONSTANTS.UI_IDS.SAVE_SHORTCUT_BTN).onclick = async () => {
                const newShortcut = previewEl.textContent;
                if (newShortcut && newShortcut !== '입력 대기 중...') {
                    await this.commitShortcutSetting(newShortcut);
                    document.getElementById(this.CONSTANTS.UI_IDS.SHORTCUT_DISPLAY).textContent = newShortcut;
                    cleanup();
                } else {
                    alert('유효한 단축키를 입력해주세요.');
                }
            };


            document.getElementById(this.CONSTANTS.UI_IDS.CANCEL_SHORTCUT_BTN).onclick = cleanup;
            overlay.onclick = cleanup;
        },

        };
        const invoke = (method, runtime, args = []) => legacyMethods[method].call(runtime, ...args);
        return DCUF_UI_CONTRACTS.createHostSurfaceAdapter({
            connect(runtime) { return runtime; },
            refresh(runtime) { return runtime.getSettingsSurfaceSnapshot(); },
            mountOwnedRoot(root) { return root; },
            invokeNative(action, runtime, ...args) {
                if (action === 'show-settings') return invoke('showSettings', runtime, args);
                if (action === 'get-gallery-key') return invoke('getGalleryKey', runtime, args);
                if (action === 'get-canonical-headtext') return invoke('getCanonicalHeadtextFromNode', runtime, args);
                if (action === 'collect-headtexts') return invoke('collectDiscoveredHeadtexts', runtime, args);
                if (action === 'show-headtext-manager') return invoke('showHeadtextBlockManager', runtime, args);
                if (action === 'show-shortcut-changer') return invoke('showShortcutChanger', runtime, args);
                throw new Error(`Unsupported filter settings host action: ${action}`);
            },
            dispose(root) { root?.remove?.(); },
        });
    })();
