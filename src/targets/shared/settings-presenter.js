const __dcufSettingsPresenter = (() => {
    const VERSION = 'modern-fluid-tactile-v1';

    const escapeHtml = (value) => String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

    const checked = (value) => value ? ' checked' : '';
    const disabled = (value) => value ? ' disabled' : '';
    const switchMarkup = ({ id, value, label, compact = false }) => `
        <label class="switch dcuf-switch${compact ? ' dcuf-switch--compact' : ''}" for="${escapeHtml(id)}">
            <input class="dcuf-switch-input" id="${escapeHtml(id)}" type="checkbox"${checked(value)}>
            <span class="switch-slider dcuf-switch-track" aria-hidden="true"></span>
            <span class="dcuf-switch-label">${escapeHtml(label)}</span>
        </label>`;

    const renderFilterSettings = ({ ids, settings, shortcut, proxyModes }) => {
        const proxyButtons = proxyModes.map(({ mode, label, active }) => `
            <button type="button" class="dcuf-segment-button" data-proxy-mode="${escapeHtml(mode)}" aria-pressed="${String(Boolean(active))}">${escapeHtml(label)}</button>
        `).join('');
        return `
            <header class="dcuf-panel-header dcuf-settings-header">
                <div class="dcuf-panel-title-group">
                    <span class="dcuf-panel-kicker">FILTER CONTROL</span>
                    <h2 id="dcuf-filter-settings-title" class="dcuf-panel-title">글·댓글 필터 설정</h2>
                </div>
                <button type="button" id="${escapeHtml(ids.CLOSE_BUTTON)}" class="dcuf-icon-button dcuf-settings-close" aria-label="필터 설정 닫기">×</button>
            </header>
            <div id="${escapeHtml(ids.SETTINGS_CONTAINER)}" class="dcuf-panel-body dcuf-settings-body" data-dcuf-state="${settings.masterDisabled ? 'disabled' : 'enabled'}">
                <section class="dcuf-settings-section dcuf-settings-overview" data-dcuf-role="group">
                    <div class="dcuf-settings-switch-grid">
                        ${switchMarkup({ id: ids.MASTER_DISABLE_CHECKBOX, value: settings.masterDisabled, label: '모든 필터 기능 끄기' })}
                        ${switchMarkup({ id: ids.EXCLUDE_RECOMMENDED_CHECKBOX, value: settings.excludeRecommended, label: '개념글 제외' })}
                    </div>
                    <p class="dcuf-settings-help">마스터 스위치는 필터 판단만 중지하며 모바일 편의기능에는 영향을 주지 않습니다.</p>
                </section>
                <section class="dcuf-settings-section dcuf-settings-threshold" data-dcuf-role="group">
                    <div class="dcuf-settings-copy">
                        <span class="dcuf-settings-eyebrow">ACTIVITY</span>
                        <h3 class="dcuf-settings-section-title">글+댓글 합 기준값</h3>
                        <p class="dcuf-settings-help">입력값 이하인 작성자를 차단합니다. 0 또는 빈칸이면 비활성화됩니다.</p>
                    </div>
                    <label class="dcuf-number-field" for="${escapeHtml(ids.THRESHOLD_INPUT)}">
                        <span class="dcuf-field-label">기준값</span>
                        <input class="dcuf-field dcuf-field--number" id="${escapeHtml(ids.THRESHOLD_INPUT)}" type="number" min="0" inputmode="numeric" value="${escapeHtml(settings.threshold)}">
                    </label>
                </section>
                <section class="dcuf-settings-section dcuf-settings-guest-controls" data-dcuf-role="group">
                    <div class="dcuf-settings-copy">
                        <span class="dcuf-settings-eyebrow">NETWORK IDENTITY</span>
                        <h3 class="dcuf-settings-section-title">유동·네트워크 필터</h3>
                    </div>
                    <div class="dcuf-settings-switch-grid">
                        ${switchMarkup({ id: ids.BLOCK_GUEST_CHECKBOX, value: settings.blockGuestEnabled, label: '유동 전체 차단', compact: true })}
                        ${switchMarkup({ id: ids.TELECOM_BLOCK_CHECKBOX, value: settings.telecomBlockEnabled, label: '통신사 IP 차단', compact: true })}
                    </div>
                    <div class="dcuf-proxy-control">
                        <div class="dcuf-field-label">우회 IP 차단 <span class="dcuf-field-note">오탐 위험 있음</span></div>
                        <div id="${escapeHtml(ids.PROXY_BLOCK_MODE_GROUP)}" class="dcuf-segment-group" role="group" aria-label="우회 IP 차단 강도">${proxyButtons}</div>
                        <p class="dcuf-proxy-mode-desc dcuf-settings-help">끔 · 확실한 우회만 · 공격적 탐지</p>
                    </div>
                </section>
                <section class="dcuf-settings-section dcuf-settings-ratio" id="${escapeHtml(ids.RATIO_SECTION)}" data-dcuf-role="group" data-dcuf-state="${settings.ratioEnabled ? 'enabled' : 'disabled'}">
                    <div class="dcuf-settings-section-heading">
                        ${switchMarkup({ id: ids.RATIO_ENABLE_CHECKBOX, value: settings.ratioEnabled, label: '글/댓글 비율 필터 사용' })}
                    </div>
                    <div class="dcuf-ratio-grid">
                        <label class="dcuf-number-field" for="${escapeHtml(ids.RATIO_MIN_INPUT)}">
                            <span class="dcuf-field-label">댓글/글 비율</span>
                            <span class="dcuf-field-note">댓글만 많은 작성자</span>
                            <input class="dcuf-field dcuf-field--number" id="${escapeHtml(ids.RATIO_MIN_INPUT)}" type="number" step="any" inputmode="decimal" placeholder="예: 10" value="${escapeHtml(settings.ratioMin)}">
                        </label>
                        <label class="dcuf-number-field" for="${escapeHtml(ids.RATIO_MAX_INPUT)}">
                            <span class="dcuf-field-label">글/댓글 비율</span>
                            <span class="dcuf-field-note">글만 많은 작성자</span>
                            <input class="dcuf-field dcuf-field--number" id="${escapeHtml(ids.RATIO_MAX_INPUT)}" type="number" step="any" inputmode="decimal" placeholder="예: 1" value="${escapeHtml(settings.ratioMax)}">
                        </label>
                    </div>
                    <p class="dcuf-settings-help">입력값과 같거나 큰 비율의 작성자를 차단합니다.</p>
                </section>
                <section class="dcuf-settings-section dcuf-settings-pum" data-dcuf-role="group">
                    ${switchMarkup({ id: ids.BLOCK_PUM_POSTS_CHECKBOX, value: settings.blockPumPosts, label: '펌 게시물 차단' })}
                </section>
                <button type="button" id="${escapeHtml(ids.HEADTEXT_MANAGER_BUTTON)}" class="dcuf-button dcuf-button--secondary dcuf-button--wide">갤러리별 말머리 차단 관리</button>
            </div>
            <footer class="dcuf-panel-footer dcuf-settings-footer">
                <div class="dcuf-shortcut-summary">
                    <span class="dcuf-field-note">창 여닫는 단축키</span>
                    <strong id="${escapeHtml(ids.SHORTCUT_DISPLAY)}" class="dcuf-keycap">${escapeHtml(shortcut)}</strong>
                    <a href="#" id="${escapeHtml(ids.CHANGE_SHORTCUT_BTN)}" class="dcuf-text-action">변경</a>
                </div>
                <button type="button" id="${escapeHtml(ids.SAVE_BUTTON)}" class="dcuf-button dcuf-button--primary">저장 &amp; 실행</button>
            </footer>`;
    };

    const renderConvenienceSettings = (settings) => {
        const rows = [
            ['recentHighlight', '마지막으로 열어본 글 표시', '뒤로 돌아왔을 때 해당 글을 테마색으로 표시'],
            ['draftRecovery', '글쓰기 초안 저장·복구', '제목·본문·말머리만 저장'],
            ['postPreview', '글 미리보기', '마우스 대기 또는 터치 길게 누르기'],
        ].map(([key, name, detail]) => `
            <label class="dcuf-convenience-row dcuf-settings-section dcuf-option-row">
                <span class="dcuf-convenience-copy dcuf-option-copy"><strong>${escapeHtml(name)}</strong><small>${escapeHtml(detail)}</small></span>
                <input type="checkbox" class="dcuf-convenience-toggle dcuf-toggle" data-dcuf-setting-key="${key}" aria-label="${escapeHtml(name)}"${checked(settings[key])}>
            </label>`).join('');
        return `
            <header class="dcuf-convenience-head dcuf-settings-header dcuf-panel-header">
                <div class="dcuf-panel-title-group"><span class="dcuf-panel-kicker">MOBILE TOOLS</span><strong id="dcuf-convenience-title" class="dcuf-convenience-title dcuf-panel-title">모바일 편의기능 설정</strong></div>
                <button type="button" class="dcuf-convenience-close dcuf-icon-button" aria-label="편의기능 설정 닫기">×</button>
            </header>
            <div class="dcuf-convenience-body dcuf-settings-body dcuf-panel-body">${rows}
                <p class="dcuf-convenience-note dcuf-settings-help">필터의 ‘모든 기능 끄기’는 편의 기능 설정에 영향을 주지 않습니다.</p>
            </div>
            <footer class="dcuf-convenience-actions dcuf-settings-footer dcuf-panel-footer">
                <button type="button" class="dcuf-convenience-clear dcuf-button dcuf-button--secondary">저장된 초안 삭제</button>
                <button type="button" class="dcuf-convenience-save dcuf-button dcuf-button--primary">저장</button>
            </footer>`;
    };

    const renderManagementPanel = ({ blocks, enabled }) => `
        <header class="panel-header dcuf-panel-header">
            <div class="panel-title-group dcuf-panel-title-group"><span class="panel-kicker dcuf-panel-kicker">PERSONAL BLOCK</span><h3 class="dcuf-panel-title">차단 유저 관리</h3></div>
            <div class="panel-header-actions dcuf-panel-header-actions">
                <button type="button" class="panel-add-btn dcuf-button dcuf-button--quiet">＋ 직접 추가</button>
                <label class="switch dcuf-switch dcuf-switch--icon" aria-label="개인 차단 기능 사용"><input class="dcuf-switch-input" type="checkbox" id="personal-block-toggle"${checked(enabled)}><span class="switch-slider dcuf-switch-track" aria-hidden="true"></span></label>
                <button type="button" class="panel-close-btn dcuf-icon-button" aria-label="차단 유저 관리 닫기">×</button>
            </div>
        </header>
        <div class="panel-tabs dcuf-segment-group dcuf-management-tabs" role="tablist" aria-label="차단 정보 종류">
            <button type="button" class="panel-tab dcuf-segment-button active" role="tab" aria-selected="true" data-type="uids">식별 번호 <span class="panel-tab-count dcuf-count">${blocks.uids.length}</span></button>
            <button type="button" class="panel-tab dcuf-segment-button" role="tab" aria-selected="false" data-type="nicknames">닉네임 <span class="panel-tab-count dcuf-count">${blocks.nicknames.length}</span></button>
            <button type="button" class="panel-tab dcuf-segment-button" role="tab" aria-selected="false" data-type="ips">아이피 <span class="panel-tab-count dcuf-count">${blocks.ips.length}</span></button>
        </div>
        <div class="panel-body dcuf-panel-body dcuf-management-body">
            <div class="panel-list-controls dcuf-management-tools">
                <label class="panel-search dcuf-search-field"><span class="dcuf-search-icon" aria-hidden="true">⌕</span><input type="search" class="panel-search-input dcuf-field" placeholder="현재 탭에서 검색" autocomplete="off" aria-label="차단 목록 검색"></label>
                <button type="button" class="select-all-btn dcuf-button dcuf-button--secondary">해당 탭 전체 선택</button>
                <span class="panel-list-summary dcuf-settings-help" aria-live="polite"></span>
            </div>
            <div class="panel-content dcuf-management-content"><ul class="blocked-list dcuf-blocked-list"></ul></div>
        </div>
        <footer class="panel-footer dcuf-panel-footer">
            <div class="panel-footer-left dcuf-footer-actions"><button type="button" class="select-all-global-btn dcuf-button dcuf-button--secondary">모든 탭 전체 선택</button><button type="button" class="panel-backup-btn dcuf-button dcuf-button--secondary">백업</button></div>
            <button type="button" class="panel-save-btn dcuf-button dcuf-button--primary">변경 저장</button>
        </footer>
        <div class="panel-resize-handle dcuf-resize-handle" role="separator" aria-label="차단 유저 관리 창 크기 조절"></div>`;

    const renderBackupPopup = () => `
        <header class="popup-header dcuf-panel-header"><div class="dcuf-panel-title-group"><span class="dcuf-panel-kicker">PORTABLE DATA</span><h4 class="dcuf-panel-title">차단 목록 백업·복원</h4></div><button type="button" class="popup-close-btn dcuf-icon-button" aria-label="차단 목록 백업 창 닫기">×</button></header>
        <div class="popup-content dcuf-panel-body dcuf-backup-body">
            <section class="export-section dcuf-settings-section"><span class="dcuf-settings-eyebrow">EXPORT</span><strong class="dcuf-settings-section-title">내보내기</strong><span class="description dcuf-settings-help">현재 차단 목록 전체를 파일로 저장하거나 클립보드에 복사합니다.</span><div class="dcuf-inline-actions"><button type="button" class="export-btn-download dcuf-button dcuf-button--secondary">파일로 다운로드</button><button type="button" class="export-btn dcuf-button dcuf-button--primary">클립보드에 복사</button></div></section>
            <section class="import-section dcuf-settings-section"><span class="dcuf-settings-eyebrow">IMPORT</span><strong class="dcuf-settings-section-title">불러오기</strong><span class="description dcuf-settings-help">백업 파일을 선택하거나 아래 텍스트 영역에 붙여넣으세요.</span><div class="import-controls dcuf-import-controls"><input type="file" class="import-file-input dcuf-field dcuf-file-field" accept=".json,.txt"><textarea class="dcuf-field dcuf-textarea" placeholder="또는, 백업 데이터를 여기에 붙여넣으세요..."></textarea></div><button type="button" class="import-btn dcuf-button dcuf-button--primary dcuf-button--wide">불러오기</button></section>
        </div>`;

    const renderFabScalePanel = ({ value, min, max }) => `
        <span class="dcuf-panel-kicker">QUICK MENU</span><h3 class="dcuf-panel-title" id="dc-personal-block-size-title">메뉴 버튼 크기 조절</h3>
        <p class="dcuf-fab-size-description dcuf-settings-help">버튼과 글자 크기가 같은 비율로 조절됩니다.</p>
        <output class="dcuf-fab-size-value" for="dc-personal-block-size-range">${escapeHtml(value)}%</output>
        <input class="dcuf-range" id="dc-personal-block-size-range" type="range" min="${escapeHtml(min)}" max="${escapeHtml(max)}" step="5" value="${escapeHtml(value)}" aria-label="메뉴 버튼 크기 비율">
        <div class="dcuf-fab-size-bounds dcuf-field-note"><span>${escapeHtml(min)}%</span><span>${escapeHtml(max)}%</span></div>
        <div class="dcuf-fab-size-actions dcuf-inline-actions"><button type="button" class="dcuf-button dcuf-button--secondary" data-dcuf-fab-size-action="reset">기본값</button><button type="button" class="dcuf-button dcuf-button--secondary" data-dcuf-fab-size-action="cancel">취소</button><button type="button" class="dcuf-button dcuf-button--primary" data-dcuf-fab-size-action="save">저장</button></div>`;

    const renderManualBlockPanel = () => `
        <header class="dcuf-manual-header dcuf-panel-header"><div class="dcuf-panel-title-group"><span class="dcuf-manual-kicker dcuf-panel-kicker">PERSONAL BLOCK</span><h3 class="dcuf-panel-title" id="dc-manual-block-title">직접 차단</h3></div><button type="button" class="dcuf-manual-close dcuf-icon-button" aria-label="직접 차단 닫기">×</button></header>
        <form class="dcuf-manual-form dcuf-panel-body">
            <div class="dcuf-manual-type-tabs dcuf-segment-group" role="group" aria-label="차단 정보 종류"><button type="button" class="dcuf-segment-button" data-manual-block-type="uid">식별번호</button><button type="button" class="dcuf-segment-button" data-manual-block-type="nickname">닉네임</button><button type="button" class="dcuf-segment-button" data-manual-block-type="ip">아이피</button></div>
            <label class="dcuf-manual-field dcuf-field-stack" for="dc-manual-block-value"><span id="dc-manual-block-value-label" class="dcuf-field-label">닉네임</span><input class="dcuf-field" id="dc-manual-block-value" type="text" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
            <label class="dcuf-manual-field dcuf-manual-display-field dcuf-field-stack" for="dc-manual-block-display" hidden><span class="dcuf-field-label">닉네임 / 표시 이름 <small class="dcuf-field-note">(선택)</small></span><input class="dcuf-field" id="dc-manual-block-display" type="text" autocomplete="off" spellcheck="false" placeholder="예: 홍길동"></label>
            <p class="dcuf-manual-hint dcuf-settings-help"></p><p class="dcuf-manual-status dcuf-status" role="status" aria-live="polite"></p>
            <div class="dcuf-manual-actions dcuf-inline-actions"><button type="button" class="dcuf-button dcuf-button--secondary" data-manual-block-action="close">닫기</button><button type="submit" class="dcuf-button dcuf-button--primary" data-manual-block-action="add">차단 추가</button></div>
        </form>`;

    const renderShortcutModal = (ids) => `
        <span class="dcuf-panel-kicker">KEYBOARD</span><h4 class="dcuf-panel-title">새로운 단축키 입력</h4><p class="dcuf-settings-help">최대 3개의 키 조합을 누르세요.</p>
        <output id="${escapeHtml(ids.NEW_SHORTCUT_PREVIEW)}" class="dcuf-shortcut-preview">입력 대기 중...</output>
        <div class="dcuf-inline-actions"><button type="button" id="${escapeHtml(ids.SAVE_SHORTCUT_BTN)}" class="dcuf-button dcuf-button--primary">변경</button><button type="button" id="${escapeHtml(ids.CANCEL_SHORTCUT_BTN)}" class="dcuf-button dcuf-button--secondary">취소</button></div>`;

    const renderHeadtextManager = ({ currentKey, discovered, current, others }) => `
        <header class="dcuf-panel-header"><div class="dcuf-panel-title-group"><span class="dcuf-panel-kicker">GALLERY RULES</span><strong class="dcuf-panel-title">갤러리별 말머리 차단</strong></div><button type="button" class="dcuf-icon-button" data-dcuf-headtext-action="close" aria-label="말머리 차단 관리 닫기">×</button></header>
        <div class="dcuf-panel-body dcuf-headtext-body"><p class="dcuf-settings-help">${escapeHtml(currentKey ? `현재 갤러리: ${currentKey}` : '현재 페이지의 갤러리를 확인할 수 없습니다.')}</p>
            <div class="dcuf-headtext-choices">${discovered.length ? discovered.map((value) => `<label class="dcuf-choice-chip"><input class="dcuf-choice-input" type="checkbox" data-dcuf-headtext-value="${escapeHtml(value)}"${checked(current.has(value))}${disabled(!currentKey)}><span>${escapeHtml(value)}</span></label>`).join('') : '<p class="dcuf-settings-help dcuf-grid-empty">현재 목록에서 발견한 말머리가 없습니다.</p>'}</div>
            <div class="dcuf-inline-actions"><input class="dcuf-field dcuf-grow" type="text" data-dcuf-headtext-manual placeholder="목록에 없는 말머리"${disabled(!currentKey)}><button type="button" class="dcuf-button dcuf-button--secondary" data-dcuf-headtext-action="add"${disabled(!currentKey)}>추가</button></div>
            <button type="button" class="dcuf-button dcuf-button--quiet dcuf-button--wide" data-dcuf-headtext-action="clear"${disabled(!currentKey || !current.size)}>현재 갤러리 전체 해제</button>
            <h3 class="dcuf-settings-section-title">저장된 다른 갤러리</h3><div class="dcuf-headtext-saved">${others.length ? others.map(([key, values]) => `<div class="dcuf-saved-rule"><span>${escapeHtml(`${key}: ${values.join(', ')}`)}</span><button type="button" class="dcuf-button dcuf-button--danger" data-dcuf-headtext-remove="${escapeHtml(key)}">삭제</button></div>`).join('') : '<p class="dcuf-settings-help">다른 갤러리에 저장된 항목이 없습니다.</p>'}</div>
        </div>`;

    const renderPalettePanel = (presets) => `
        <header class="dcuf-palette-header dcuf-panel-header"><div class="dcuf-panel-title-group"><span class="dcuf-panel-kicker">APPEARANCE</span><h2 class="dcuf-panel-title" id="dcuf-palette-title">UI 색상 설정</h2></div><button type="button" class="dcuf-palette-close dcuf-icon-button" aria-label="UI 색상 설정 닫기">×</button></header>
        <div class="dcuf-palette-body dcuf-panel-body"><p class="dcuf-palette-description dcuf-settings-help">색상을 선택해 미리 본 뒤 저장하세요.</p><div class="dcuf-palette-options" role="radiogroup" aria-label="UI 색상 프리셋">${presets.map((preset) => `<button type="button" class="dcuf-palette-option dcuf-option-card" role="radio" aria-checked="false" data-palette-id="${escapeHtml(preset.id)}"><span class="dcuf-palette-swatch" aria-hidden="true"><span style="--dcuf-swatch:${escapeHtml(preset.light[0])}"></span><span style="--dcuf-swatch:${escapeHtml(preset.light[1])}"></span><span style="--dcuf-swatch:${escapeHtml(preset.light[2])}"></span></span><span class="dcuf-palette-name">${escapeHtml(preset.label)}</span></button>`).join('')}</div><p class="dcuf-palette-status dcuf-status" role="status" aria-live="polite"></p><div class="dcuf-palette-actions dcuf-inline-actions"><button type="button" class="dcuf-button dcuf-button--secondary" data-dcuf-palette-action="default">기본값</button><button type="button" class="dcuf-button dcuf-button--secondary" data-dcuf-palette-action="cancel">취소</button><button type="button" class="dcuf-button dcuf-button--primary" data-dcuf-palette-action="save">저장</button></div></div><div class="dcuf-palette-resize-handle dcuf-resize-handle" role="separator" aria-label="UI 색상 설정 크기 조절"></div>`;

    const BASE_CSS = `
        [data-dcuf-surface] { --dcuf-motion-press:100ms;--dcuf-motion-state:160ms;--dcuf-motion-panel:210ms;--dcuf-radius-panel:22px;--dcuf-radius-group:16px;--dcuf-radius-control:12px;--dcuf-space-1:4px;--dcuf-space-2:8px;--dcuf-space-3:12px;--dcuf-space-4:16px;--dcuf-space-5:20px;box-sizing:border-box;color:var(--dcuf-theme-fg,#27313f);font:500 14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:-.012em; }
        [data-dcuf-surface] .dcuf-panel-title { margin:0;color:var(--dcuf-theme-fg,#27313f);font-size:18px;font-weight:820;line-height:1.25;letter-spacing:-.035em; }
        [data-dcuf-surface] .dcuf-panel-kicker,[data-dcuf-surface] .dcuf-settings-eyebrow { display:block;margin:0 0 3px;color:var(--dcuf-theme-accent,#4263eb);font-size:10px;font-weight:850;line-height:1.2;letter-spacing:.12em; }
        [data-dcuf-surface] .dcuf-panel-title-group { min-width:0; }
        [data-dcuf-surface] .dcuf-panel-header { display:flex;flex:0 0 auto;align-items:center;justify-content:space-between;gap:var(--dcuf-space-3);box-sizing:border-box;padding:14px 16px;border-bottom:1px solid var(--dcuf-theme-border,#d9dde3);background:linear-gradient(180deg,var(--dcuf-theme-card-top,#fff),var(--dcuf-theme-surface-raised,#f7f8fa));cursor:move;touch-action:none;user-select:none; }
        [data-dcuf-surface] .dcuf-panel-body { min-height:0;box-sizing:border-box;padding:12px;overflow:auto;overscroll-behavior:contain;background:var(--dcuf-theme-canvas,#f6f7f9); }
        [data-dcuf-surface] .dcuf-panel-footer { display:flex;flex:0 0 auto;align-items:center;justify-content:space-between;gap:10px;box-sizing:border-box;padding:12px;border-top:1px solid var(--dcuf-theme-border,#d9dde3);background:var(--dcuf-theme-surface-raised,#f7f8fa); }
        [data-dcuf-surface] .dcuf-icon-button,[data-dcuf-surface] .dcuf-button { appearance:none;box-sizing:border-box;min-height:44px;border:1px solid var(--dcuf-theme-border-strong,#cbd2db);border-radius:var(--dcuf-radius-control);font:inherit;font-weight:780;cursor:pointer;transition:transform var(--dcuf-motion-press) ease,background-color var(--dcuf-motion-state) ease,border-color var(--dcuf-motion-state) ease,box-shadow var(--dcuf-motion-state) ease; }
        [data-dcuf-surface] .dcuf-icon-button { display:grid;flex:0 0 44px;place-items:center;width:44px;padding:0;border-color:transparent;background:transparent;color:var(--dcuf-theme-fg-muted,#687384);font-size:24px;line-height:1; }
        [data-dcuf-surface] .dcuf-button { padding:9px 14px;background:var(--dcuf-theme-surface-input,#fff);color:var(--dcuf-theme-fg,#27313f); }
        [data-dcuf-surface] .dcuf-button--primary { border-color:var(--dcuf-theme-accent-strong,#315fdb);background-color:var(--dcuf-theme-accent-strong,#315fdb);background-image:linear-gradient(180deg,var(--dcuf-theme-primary-top,#5d87f0),var(--dcuf-theme-accent-strong,#315fdb));color:var(--dcuf-theme-on-accent,#fff);box-shadow:0 7px 16px var(--dcuf-theme-accent-shadow,rgba(49,95,219,.24)); }
        [data-dcuf-surface] .dcuf-button--secondary { border-color:color-mix(in srgb,var(--dcuf-theme-accent,#4263eb) 24%,var(--dcuf-theme-border,#d9dde3));background-color:var(--dcuf-theme-accent-soft,#e9efff);color:var(--dcuf-theme-accent-strong,#315fdb); }
        [data-dcuf-surface] .dcuf-button--quiet { background:var(--dcuf-theme-accent-soft,#e9efff);color:var(--dcuf-theme-accent-strong,#315fdb); }
        [data-dcuf-surface] .dcuf-button--danger { min-height:36px;padding:6px 10px;border-color:color-mix(in srgb,#c43249 45%,var(--dcuf-theme-border,#d9dde3));background:color-mix(in srgb,#c43249 12%,var(--dcuf-theme-card-top,#fff));color:color-mix(in srgb,#c43249 82%,var(--dcuf-theme-fg,#27313f)); }
        [data-dcuf-surface] .dcuf-button--wide { width:100%; }
        [data-dcuf-surface] .dcuf-button:active,[data-dcuf-surface] .dcuf-icon-button:active,[data-dcuf-surface] .dcuf-option-card:active { transform:translateY(1px) scale(.985); }
        [data-dcuf-surface] .dcuf-button:disabled,[data-dcuf-surface] .dcuf-icon-button:disabled { opacity:.56;cursor:wait; }
        [data-dcuf-surface] .dcuf-settings-section { box-sizing:border-box;margin:0 0 10px;padding:12px;border:1px solid var(--dcuf-theme-border,#d9dde3);border-radius:var(--dcuf-radius-group);background-color:var(--dcuf-theme-card-top,#fff);background-image:linear-gradient(145deg,var(--dcuf-theme-card-top,#fff),var(--dcuf-theme-card-bottom,#fafbfc));box-shadow:0 4px 12px color-mix(in srgb,var(--dcuf-theme-accent,#4263eb) 5%,transparent); }
        [data-dcuf-surface] .dcuf-settings-section-title { display:block;margin:0 0 6px;color:var(--dcuf-theme-fg,#27313f);font-size:14px;font-weight:800;line-height:1.3; }
        [data-dcuf-surface] .dcuf-settings-help,[data-dcuf-surface] .dcuf-field-note { margin:4px 0 0;color:var(--dcuf-theme-fg-muted,#687384);font-size:11.5px;font-weight:520;line-height:1.42; }
        [data-dcuf-surface] .dcuf-field-label { color:var(--dcuf-theme-fg,#27313f);font-size:12px;font-weight:760; }
        [data-dcuf-surface] .dcuf-field { appearance:none;box-sizing:border-box;width:100%;min-height:44px;padding:9px 11px;border:1px solid var(--dcuf-theme-border-strong,#cbd2db);border-radius:var(--dcuf-radius-control);background:var(--dcuf-theme-surface-input,#fff);color:var(--dcuf-theme-fg,#27313f);font:inherit; }
        [data-dcuf-surface] .dcuf-field:focus-visible { border-color:var(--dcuf-theme-accent,#4263eb); }
        [data-dcuf-surface] .dcuf-field--number { width:96px;text-align:center; }
        [data-dcuf-surface] .dcuf-field-stack,[data-dcuf-surface] .dcuf-number-field { display:grid;gap:5px; }
        [data-dcuf-surface] .dcuf-grow { flex:1 1 auto;min-width:0; }
        [data-dcuf-surface] .dcuf-switch { display:flex;position:relative;align-items:center;gap:9px;min-height:44px;cursor:pointer; }
        [data-dcuf-surface] .dcuf-switch-input { position:absolute;width:1px;height:1px;opacity:0;pointer-events:none; }
        [data-dcuf-surface] .dcuf-switch-track,[data-dcuf-surface] .dcuf-toggle { appearance:none;position:relative;flex:0 0 42px;box-sizing:border-box;width:42px;height:24px;margin:0;border:1px solid var(--dcuf-theme-border-strong,#cbd2db);border-radius:999px;background-color:var(--dcuf-theme-surface-muted,#eef1f5);transition:background-color var(--dcuf-motion-state) ease,border-color var(--dcuf-motion-state) ease; }
        [data-dcuf-surface] .dcuf-switch-track::before,[data-dcuf-surface] .dcuf-toggle::before { content:"";position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:var(--dcuf-theme-card-top,#fff);box-shadow:0 2px 5px rgba(0,0,0,.24);transition:transform var(--dcuf-motion-state) cubic-bezier(.2,.8,.2,1); }
        [data-dcuf-surface] .dcuf-switch-input:checked + .dcuf-switch-track,[data-dcuf-surface] .dcuf-toggle:checked { border-color:var(--dcuf-theme-accent-strong,#315fdb);background-color:var(--dcuf-theme-accent-strong,#315fdb);background-image:linear-gradient(180deg,var(--dcuf-theme-primary-top,#5d87f0),var(--dcuf-theme-accent-strong,#315fdb)); }
        [data-dcuf-surface] .dcuf-switch-input:checked + .dcuf-switch-track::before,[data-dcuf-surface] .dcuf-toggle:checked::before { transform:translateX(18px);background:var(--dcuf-theme-on-accent,#fff); }
        [data-dcuf-surface] .dcuf-switch-label { color:var(--dcuf-theme-fg,#27313f);font-weight:720; }
        [data-dcuf-surface] .dcuf-switch--icon { width:44px; }
        [data-dcuf-surface] .dcuf-switch--icon .dcuf-switch-label { display:none; }
        [data-dcuf-surface] .dcuf-segment-group { display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:3px;padding:3px;border:1px solid var(--dcuf-theme-border,#d9dde3);border-radius:14px;background:var(--dcuf-theme-surface-muted,#eef1f5); }
        [data-dcuf-surface] .dcuf-segment-button { appearance:none;min-height:38px;padding:7px 9px;border:1px solid transparent;border-radius:10px;background:transparent;color:var(--dcuf-theme-fg-muted,#687384);font:inherit;font-size:12px;font-weight:760;cursor:pointer;transition:background-color var(--dcuf-motion-state) ease,color var(--dcuf-motion-state) ease,transform var(--dcuf-motion-press) ease; }
        [data-dcuf-surface] .dcuf-segment-button[aria-pressed="true"],[data-dcuf-surface] .dcuf-segment-button[aria-selected="true"],[data-dcuf-surface] .dcuf-segment-button.active { border-color:color-mix(in srgb,var(--dcuf-theme-accent,#4263eb) 30%,var(--dcuf-theme-border,#d9dde3));background:var(--dcuf-theme-accent-soft,#e9efff);color:var(--dcuf-theme-accent-strong,#315fdb);box-shadow:0 3px 8px color-mix(in srgb,var(--dcuf-theme-accent,#4263eb) 12%,transparent); }
        [data-dcuf-surface] .dcuf-inline-actions,[data-dcuf-surface] .dcuf-footer-actions { display:flex;align-items:center;gap:8px; }
        [data-dcuf-surface] .dcuf-inline-actions > .dcuf-button { flex:1 1 0; }
        [data-dcuf-surface] .dcuf-status { min-height:20px;margin:8px 0;color:#c43249;font-size:12px;font-weight:720; }
        [data-dcuf-surface] .dcuf-resize-handle { position:absolute;right:5px;bottom:5px;width:34px;height:28px;border-radius:9px;background:linear-gradient(135deg,transparent 50%,var(--dcuf-theme-border-strong,#cbd2db) 51% 57%,transparent 58%) 11px 5px/16px 16px no-repeat;cursor:nwse-resize;touch-action:none; }
        [data-dcuf-surface] :focus-visible { outline:3px solid var(--dcuf-theme-focus-ring,rgba(63,109,224,.2));outline-offset:2px; }
        [data-dcuf-surface][data-dcuf-role="panel"] { position:fixed;z-index:2147483646;left:50%;top:50%;display:flex;flex-direction:column;width:min(540px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:hidden;border:1px solid var(--dcuf-theme-border-strong,#cbd2db);border-radius:var(--dcuf-radius-panel);background-color:var(--dcuf-theme-canvas,#f6f7f9);background-image:linear-gradient(155deg,var(--dcuf-theme-card-top,#fff),var(--dcuf-theme-canvas,#f6f7f9));box-shadow:var(--dcuf-theme-panel-shadow,0 20px 60px #0005);transform:translate(-50%,-50%);animation:dcuf-modern-panel-in var(--dcuf-motion-panel) cubic-bezier(.2,.8,.2,1); }
        [data-dcuf-surface][data-dcuf-role="overlay"] { position:fixed;z-index:2147483646;inset:0;background:rgba(18,25,35,.56);animation:dcuf-modern-overlay-in var(--dcuf-motion-panel) ease; }
        [data-dcuf-surface].dcuf-pop-leave { opacity:0;transform:translate(-50%,calc(-50% + 8px));transition:opacity var(--dcuf-motion-panel) ease,transform var(--dcuf-motion-panel) ease; }
        [data-dcuf-surface].dcuf-overlay-leave { opacity:0;transition:opacity var(--dcuf-motion-panel) ease; }
        @keyframes dcuf-modern-panel-in { from { opacity:0;transform:translate(-50%,calc(-50% + 10px)); } }
        @keyframes dcuf-modern-overlay-in { from { opacity:0; } }
        @media (prefers-reduced-motion:reduce) { [data-dcuf-surface],[data-dcuf-surface] * { animation-duration:0s;transition-duration:0s;scroll-behavior:auto; } }
    `;

    const PERSONAL_MENU_CSS = `
        [data-dcuf-surface="personal-menu"] { position:fixed;z-index:2147483640;width:max-content;height:var(--dcuf-fab-height,76px);overflow:visible; }
        [data-dcuf-surface="personal-menu"] .dcuf-fab-button { appearance:none;box-sizing:border-box;min-width:var(--dcuf-fab-width,152px);height:var(--dcuf-fab-height,76px);padding:0 var(--dcuf-fab-padding-x,28px);border:1px solid var(--dcuf-theme-border-strong,#cbd2db);border-radius:999px;background:linear-gradient(180deg,var(--dcuf-theme-card-top,#fff),var(--dcuf-theme-surface-raised,#f7f8fa));color:var(--dcuf-theme-accent-strong,#315fdb);box-shadow:0 10px 24px var(--dcuf-theme-accent-shadow,rgba(49,95,219,.2));font-family:inherit;font-size:var(--dcuf-fab-font-size,32px);font-weight:800;line-height:1;cursor:pointer;touch-action:none; }
        [data-dcuf-surface="personal-menu"] .dcuf-menu-drawer { position:absolute;z-index:2147483641;display:grid;gap:5px;width:260px;padding:7px;border:1px solid var(--dcuf-theme-border-strong,#cbd2db);border-radius:16px;background:var(--dcuf-theme-card-top,#fff);box-shadow:var(--dcuf-theme-panel-shadow,0 18px 42px #0003); }
        [data-dcuf-surface="personal-menu"] .dcuf-menu-drawer[hidden] { display:none; }
        [data-dcuf-surface="personal-menu"] .dcuf-menu-item { display:grid;grid-template-columns:38px minmax(0,1fr);align-items:center;gap:10px;min-height:56px;padding:7px 9px;border:1px solid transparent;border-radius:12px;background:transparent;color:var(--dcuf-theme-fg,#27313f);text-align:left;cursor:pointer; }
        [data-dcuf-surface="personal-menu"] .dcuf-menu-icon { display:grid;width:34px;height:34px;place-items:center;border-radius:10px;background:var(--dcuf-theme-accent-soft,#e9efff);color:var(--dcuf-theme-accent,#4263eb); }
        [data-dcuf-surface="personal-menu"] .dcuf-menu-item strong,[data-dcuf-surface="personal-menu"] .dcuf-menu-item small { display:block; }
        [data-dcuf-surface="personal-menu"] .dcuf-menu-item small { margin-top:2px;color:var(--dcuf-theme-fg-muted,#687384);font-size:11px; }
    `;

    const FAB_SHELL_CSS = `${BASE_CSS}${PERSONAL_MENU_CSS}`;

    const SHARED_CSS = `
        /* DCUF_SHARED_FILTER_UI_START */${BASE_CSS}
        [data-dcuf-surface="filter-settings"] { width:min(580px,calc(100vw - 24px)); }
        [data-dcuf-surface="filter-settings"] .dcuf-settings-body[data-dcuf-state="disabled"] > :not(.dcuf-settings-overview) { opacity:.48;pointer-events:none; }
        [data-dcuf-surface="filter-settings"] .dcuf-settings-switch-grid { display:grid;gap:4px; }
        [data-dcuf-surface="filter-settings"] .dcuf-settings-threshold { display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px; }
        [data-dcuf-surface="filter-settings"] .dcuf-settings-guest-controls { display:grid;gap:10px; }
        [data-dcuf-surface="filter-settings"] .dcuf-ratio-grid { display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px; }
        [data-dcuf-surface="filter-settings"] .dcuf-number-field .dcuf-field { width:100%; }
        [data-dcuf-surface="filter-settings"] .dcuf-settings-ratio[data-dcuf-state="disabled"] > :not(.dcuf-settings-section-heading) { opacity:.46; }
        [data-dcuf-surface="filter-settings"] .dcuf-shortcut-summary { display:flex;flex-wrap:wrap;align-items:center;gap:7px;min-width:0; }
        [data-dcuf-surface="filter-settings"] .dcuf-keycap { padding:4px 8px;border:1px solid var(--dcuf-theme-border-strong,#cbd2db);border-radius:8px;background:var(--dcuf-theme-surface-input,#fff);font-size:12px; }
        [data-dcuf-surface="filter-settings"] .dcuf-text-action { color:var(--dcuf-theme-accent-strong,#315fdb);font-size:12px;font-weight:760; }
        [data-dcuf-surface="convenience-settings"] { width:min(440px,calc(100vw - 24px)); }
        [data-dcuf-surface="convenience-settings"] .dcuf-option-row { display:flex;align-items:center;justify-content:space-between;gap:14px;min-height:68px;cursor:pointer; }
        [data-dcuf-surface="convenience-settings"] .dcuf-option-copy { min-width:0; }
        [data-dcuf-surface="convenience-settings"] .dcuf-option-copy strong,[data-dcuf-surface="convenience-settings"] .dcuf-option-copy small { display:block; }
        [data-dcuf-surface="convenience-settings"] .dcuf-option-copy small { margin-top:3px;color:var(--dcuf-theme-fg-muted,#687384);font-size:11.5px; }
        [data-dcuf-surface="personal-management"] { width:min(600px,calc(100vw - 24px));height:min(700px,calc(100dvh - 24px)); }
        [data-dcuf-surface="personal-management"] .dcuf-panel-header-actions { display:flex;align-items:center;gap:7px; }
        [data-dcuf-surface="personal-management"] .dcuf-management-tabs { flex:0 0 auto;margin:10px 12px 0; }
        [data-dcuf-surface="personal-management"] .dcuf-count { display:inline-grid;min-width:20px;place-items:center;margin-left:4px;padding:2px 5px;border-radius:999px;background:color-mix(in srgb,var(--dcuf-theme-accent,#4263eb) 12%,transparent);font-size:10px; }
        [data-dcuf-surface="personal-management"] .dcuf-management-body { display:flex;flex-direction:column; }
        [data-dcuf-surface="personal-management"] .dcuf-management-tools { display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:10px;border:1px solid var(--dcuf-theme-border,#d9dde3);border-radius:14px;background-color:var(--dcuf-theme-card-top,#fff);background-image:linear-gradient(145deg,var(--dcuf-theme-card-top,#fff),var(--dcuf-theme-card-bottom,#fafbfc)); }
        [data-dcuf-surface="personal-management"] .dcuf-search-field { display:flex;align-items:center;gap:7px;padding-left:11px;border:1px solid var(--dcuf-theme-border-strong,#cbd2db);border-radius:var(--dcuf-radius-control);background:var(--dcuf-theme-surface-input,#fff); }
        [data-dcuf-surface="personal-management"] .dcuf-search-field .dcuf-field { border:0;background-color:var(--dcuf-theme-surface-input,#fff);background-image:none;outline:0; }
        [data-dcuf-surface="personal-management"] .dcuf-management-content { flex:1 1 auto;min-height:0;overflow:auto; }
        [data-dcuf-surface="personal-management"] .dcuf-blocked-list { display:grid;gap:7px;margin:10px 0 0;padding:0;list-style:none; }
        [data-dcuf-surface="personal-management"] .dcuf-blocked-item { display:flex;align-items:center;justify-content:space-between;gap:9px;min-height:50px;padding:8px 10px;border:1px solid var(--dcuf-theme-border,#d9dde3);border-radius:13px;background:var(--dcuf-theme-card-top,#fff); }
        [data-dcuf-surface="personal-management"] .dcuf-blocked-item.item-to-delete { border-color:color-mix(in srgb,#c43249 45%,var(--dcuf-theme-border,#d9dde3));background:color-mix(in srgb,#c43249 12%,var(--dcuf-theme-card-top,#fff));opacity:.72; }
        [data-dcuf-surface="personal-management"] .dcuf-item-name { min-width:0;overflow-wrap:anywhere; }
        [data-dcuf-surface="personal-management"] .dcuf-delete-item { flex:0 0 auto;min-height:36px; }
        [data-dcuf-surface="personal-management"] .dcuf-blocked-empty { display:grid;min-height:120px;place-items:center;color:var(--dcuf-theme-fg-muted,#687384);text-align:center; }
        [data-dcuf-surface="personal-backup"] { width:min(560px,calc(100vw - 24px)); }
        [data-dcuf-surface="personal-backup"] .dcuf-backup-body { display:grid;gap:10px; }
        [data-dcuf-surface="personal-backup"] .dcuf-import-controls { display:grid;gap:8px; }
        [data-dcuf-surface="personal-backup"] .dcuf-file-field { padding:7px; }
        [data-dcuf-surface="personal-backup"] .dcuf-textarea { min-height:108px;resize:vertical;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px; }
        [data-dcuf-surface="personal-size"] { width:min(380px,calc(100vw - 24px));padding:18px; }
        [data-dcuf-surface="personal-size"] .dcuf-fab-size-value { display:block;margin:16px 0 4px;color:var(--dcuf-theme-accent-strong,#315fdb);font-size:28px;font-weight:850;text-align:center; }
        [data-dcuf-surface="personal-size"] .dcuf-range { width:100%;accent-color:var(--dcuf-theme-accent-strong,#315fdb); }
        [data-dcuf-surface="personal-size"] .dcuf-fab-size-bounds { display:flex;justify-content:space-between; }
        [data-dcuf-surface="personal-size"] .dcuf-fab-size-actions { margin-top:18px; }
        [data-dcuf-surface="personal-manual"] { width:min(440px,calc(100vw - 24px)); }
        [data-dcuf-surface="personal-manual"] .dcuf-manual-form { display:grid;gap:12px; }
        [data-dcuf-surface="personal-manual"] .dcuf-manual-field[hidden] { display:none; }
        [data-dcuf-surface="personal-manual"] .dcuf-manual-status[data-state="success"] { color:#16835f; }
        [data-dcuf-surface="personal-manual"] .dcuf-manual-status[data-state="error"] { color:#c43249; }
        [data-dcuf-surface="personal-selection"] { position:fixed;z-index:2147483646;left:50%;top:18px;width:min(460px,calc(100vw - 24px));padding:12px;border:1px solid var(--dcuf-theme-border-strong,#cbd2db);border-radius:16px;background:linear-gradient(145deg,var(--dcuf-theme-card-top,#fff),var(--dcuf-theme-card-bottom,#fafbfc));box-shadow:var(--dcuf-theme-panel-shadow,0 18px 42px #0003);transform:translateX(-50%); }
        [data-dcuf-surface="personal-selection"].dcuf-selection-prompt { display:grid;grid-template-columns:38px minmax(0,1fr) auto;align-items:center;gap:10px; }
        [data-dcuf-surface="personal-selection"] .dcuf-selection-prompt-icon { display:grid;width:36px;height:36px;place-items:center;border-radius:11px;background:var(--dcuf-theme-accent-soft,#e9efff);color:var(--dcuf-theme-accent,#4263eb); }
        [data-dcuf-surface="personal-selection"] .dcuf-selection-prompt-copy h4,[data-dcuf-surface="personal-selection"] .dcuf-selection-prompt-copy p { margin:0; }
        [data-dcuf-surface="personal-selection"] .dcuf-selection-prompt-copy p { color:var(--dcuf-theme-fg-muted,#687384);font-size:11.5px; }
        [data-dcuf-surface="personal-selection"] .dcuf-selection-option { display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;padding:9px;border:1px solid var(--dcuf-theme-border,#d9dde3);border-radius:12px;background:var(--dcuf-theme-surface-input,#fff); }
        [data-dcuf-surface="personal-selection"] .dcuf-selection-copy { min-width:0;overflow-wrap:anywhere; }
        [data-dcuf-surface="personal-selection"] .dcuf-popup-actions { display:flex;justify-content:flex-end;margin-top:10px; }
        ${PERSONAL_MENU_CSS}
        [data-dcuf-surface="headtext-settings"] { width:min(460px,calc(100vw - 24px));height:min(680px,calc(100dvh - 24px)); }
        [data-dcuf-surface="headtext-settings"] .dcuf-headtext-choices { display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:7px;margin:10px 0; }
        [data-dcuf-surface="headtext-settings"] .dcuf-choice-chip { display:flex;align-items:center;gap:7px;min-height:44px;padding:7px 9px;border:1px solid var(--dcuf-theme-border,#d9dde3);border-radius:11px;background:var(--dcuf-theme-card-top,#fff);cursor:pointer; }
        [data-dcuf-surface="headtext-settings"] .dcuf-choice-input { accent-color:var(--dcuf-theme-accent-strong,#315fdb); }
        [data-dcuf-surface="headtext-settings"] .dcuf-grid-empty { grid-column:1/-1; }
        [data-dcuf-surface="headtext-settings"] .dcuf-headtext-saved { display:grid;gap:7px; }
        [data-dcuf-surface="headtext-settings"] .dcuf-saved-rule { display:flex;align-items:center;gap:8px;padding:8px;border:1px solid var(--dcuf-theme-border,#d9dde3);border-radius:11px;background:var(--dcuf-theme-card-top,#fff); }
        [data-dcuf-surface="headtext-settings"] .dcuf-saved-rule > span { flex:1 1 auto;min-width:0;overflow-wrap:anywhere;font-size:12px; }
        [data-dcuf-surface="shortcut-settings"] { width:min(380px,calc(100vw - 24px));padding:18px;text-align:center; }
        [data-dcuf-surface="shortcut-settings"] .dcuf-shortcut-preview { display:grid;min-height:52px;place-items:center;margin:16px 0;padding:8px;border:1px solid var(--dcuf-theme-border-strong,#cbd2db);border-radius:13px;background:var(--dcuf-theme-surface-input,#fff);font-size:18px;font-weight:820; }
        @media (max-width:460px) { [data-dcuf-surface="filter-settings"] .dcuf-settings-threshold { grid-template-columns:1fr; }[data-dcuf-surface="filter-settings"] .dcuf-settings-threshold .dcuf-number-field { grid-template-columns:1fr auto;align-items:center; }[data-dcuf-surface="filter-settings"] .dcuf-settings-threshold .dcuf-field { width:96px; }[data-dcuf-surface="personal-management"] .dcuf-panel-header { align-items:flex-start; }[data-dcuf-surface="personal-management"] .dcuf-panel-header-actions { flex-wrap:wrap;justify-content:flex-end; }[data-dcuf-surface="personal-management"] .dcuf-panel-header-actions .dcuf-button { min-height:38px;padding:7px 9px;font-size:0; }[data-dcuf-surface="personal-management"] .dcuf-panel-header-actions .dcuf-button::after { content:"추가";font-size:12px; }[data-dcuf-surface="personal-management"] .dcuf-management-tools { grid-template-columns:1fr; }[data-dcuf-surface="personal-management"] .dcuf-panel-footer { align-items:stretch;flex-direction:column; }[data-dcuf-surface="personal-management"] .dcuf-footer-actions { display:grid;grid-template-columns:1fr 1fr; }[data-dcuf-surface="personal-management"] .dcuf-panel-footer > .dcuf-button { width:100%; }[data-dcuf-surface="filter-settings"] .dcuf-panel-footer { align-items:stretch;flex-direction:column; } }
        [data-dcuf-surface="personal-selection-target"][data-dcuf-state="active"] { outline:2px solid color-mix(in srgb,var(--dcuf-theme-accent,#4263eb) 65%,transparent);outline-offset:2px;background:color-mix(in srgb,var(--dcuf-theme-accent-soft,#e9efff) 55%,transparent);cursor:pointer; }
        /* DCUF_SHARED_FILTER_UI_END */
        /* DCUF_SHARED_FILTER_UI_DARK_START */
        /* DCUF_SHARED_FILTER_UI_DARK_END */`;

    const PALETTE_CSS = `${BASE_CSS}
        [data-dcuf-surface="palette"][data-dcuf-role="overlay"] { display:flex;align-items:center;justify-content:center;padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left)); }
        [data-dcuf-surface="palette"][data-dcuf-role="panel"] { width:min(540px,calc(100vw - 24px));height:min(680px,calc(100dvh - 24px)); }
        [data-dcuf-surface="palette"] .dcuf-palette-body { display:flex;flex:1 1 auto;flex-direction:column;overflow:hidden; }
        [data-dcuf-surface="palette"] .dcuf-palette-options { display:grid;flex:1 1 auto;grid-template-columns:repeat(2,minmax(0,1fr));align-content:start;min-height:0;gap:8px;padding:2px 3px 6px 1px;overflow:hidden auto;overscroll-behavior:contain;scrollbar-gutter:stable;touch-action:pan-y; }
        [data-dcuf-surface="palette"] .dcuf-option-card { appearance:none;display:grid;grid-template-columns:48px minmax(0,1fr);align-items:center;gap:10px;min-height:64px;padding:9px;border:1px solid var(--dcuf-theme-border,#d9dde3);border-radius:14px;background:var(--dcuf-theme-surface-input,#fff);color:var(--dcuf-theme-fg,#27313f);font:inherit;text-align:left;cursor:pointer;transition:transform var(--dcuf-motion-press) ease,background-color var(--dcuf-motion-state) ease,border-color var(--dcuf-motion-state) ease,box-shadow var(--dcuf-motion-state) ease; }
        [data-dcuf-surface="palette"] .dcuf-option-card[aria-checked="true"] { border-color:var(--dcuf-theme-accent,#4263eb);background:var(--dcuf-theme-accent-soft,#e9efff);color:var(--dcuf-theme-accent-strong,#315fdb);box-shadow:0 0 0 2px color-mix(in srgb,var(--dcuf-theme-accent,#4263eb) 16%,transparent); }
        [data-dcuf-surface="palette"] .dcuf-palette-swatch { display:grid;grid-template-columns:repeat(3,1fr);width:46px;height:36px;overflow:hidden;border:1px solid color-mix(in srgb,var(--dcuf-theme-fg,#27313f) 12%,transparent);border-radius:10px; }
        [data-dcuf-surface="palette"] .dcuf-palette-swatch > span { display:block;background:var(--dcuf-swatch); }
        [data-dcuf-surface="palette"] .dcuf-palette-name { font-weight:800; }
        [data-dcuf-surface="palette"] .dcuf-palette-actions { flex:0 0 auto;margin-top:2px; }
        [data-dcuf-surface="palette"][data-dcuf-state="interacting"] { animation:none;transition:none; }
        @media (max-width:440px) { [data-dcuf-surface="palette"] .dcuf-palette-options { grid-template-columns:1fr; } }
    `;

    return Object.freeze({
        VERSION,
        FAB_SHELL_CSS,
        SHARED_CSS,
        PALETTE_CSS,
        renderFilterSettings,
        renderConvenienceSettings,
        renderManagementPanel,
        renderBackupPopup,
        renderFabScalePanel,
        renderManualBlockPanel,
        renderShortcutModal,
        renderHeadtextManager,
        renderPalettePanel,
        escapeHtml,
    });
})();
