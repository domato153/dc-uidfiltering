(() => {
    let nextCommentNo = 10000;
    let nextListNo = 5000;
    const escapeHtml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
    const writer = (uid, nick, ip = '') => `<span class="gall_writer ub-writer" data-uid="${escapeHtml(uid)}" data-nick="${escapeHtml(nick)}" data-ip="${escapeHtml(ip)}"><span class="nickname"><em>${escapeHtml(nick)}</em></span></span>${ip ? `<span class="ip">(${escapeHtml(ip)})</span>` : ''}`;
    const commentMarkup = ({ uid = '', nick = '동적댓글', ip = '', text = '동적으로 추가된 댓글', id = nextCommentNo++ } = {}) => `<li id="comment_li_${id}" class="ub-content" data-no="${id}"><div class="cmt_info"><div class="cmt_nickbox">${writer(uid || `safe-dynamic-${id}`, nick, ip)}</div></div><div class="cmt_txtbox"><p class="usertxt ub-word">${escapeHtml(text)}</p></div></li>`;
    const listMarkup = ({ uid = '', title = '교체된 목록 행', id = nextListNo++ } = {}) => {
        const minor = document.body?.dataset.fixtureVariant === 'minor';
        const viewPath = minor ? '/mgallery/board/view' : '/board/view';
        return `<tr class="ub-content us-post" data-no="${id}" data-type="icon_txt"><td class="gall_num">${id}</td>${minor ? '<td class="gall_type">일반</td>' : ''}<td class="gall_tit"><span class="gall_subject">일반</span><a href="${viewPath}?id=test&no=${id}">${escapeHtml(title)}</a></td><td>${writer(uid || `safe-replaced-${id}`, '교체작성자')}</td><td class="gall_date">2026.07.12</td><td class="gall_count">1</td><td class="gall_recommend">0</td></tr>`;
    };
    const getCommentList = () => document.querySelector('#comment_wrap_1 .comment_box > .cmt_list');
    const getListBody = () => document.querySelector('table.gall_list tbody');
    const getWriteForm = () => document.querySelector('form#write, form#writeForm');
    const getWriteEditor = () => document.querySelector('[data-fixture-editor] .note-editable, .native-editor');
    const syncWriteMemo = () => {
        const editor = getWriteEditor();
        const memo = getWriteForm()?.querySelector('textarea[name="memo"]');
        if (editor && memo) memo.value = editor.innerHTML;
        return memo?.value || '';
    };

    const normalizeImageCommentFixture = () => {
        const section = document.querySelector('.view_comment.image_comment.fixture-synthetic-image-comments');
        if (!(section instanceof HTMLElement) || section.closest('.img_comment.fold.getMoreComment')) return;
        const outer = document.createElement('section');
        outer.className = 'img_comment fold getMoreComment fixture-live-image-comments';
        section.before(outer);
        outer.appendChild(section);
        section.classList.remove('fixture-synthetic-image-comments');
        section.querySelector('.comment_wrap')?.classList.add('show');
        const box = section.querySelector('.comment_box.img_comment_box');
        box?.setAttribute('data-imgno', 'fixture-image');
        box?.setAttribute('data-article-lv', 'undefined');
        box?.querySelector('.cmt_list')?.classList.add('add');
        section.querySelector('.cmt_write_box')?.remove();
    };
    normalizeImageCommentFixture();

    const api = {
        addComments(count = 1, options = {}) {
            const list = getCommentList();
            if (!list) return 0;
            const html = Array.from({ length: Number(count) || 0 }, (_, index) => commentMarkup({ ...options, uid: options.uid ? `${options.uid}${count > 1 ? `-${index}` : ''}` : '' })).join('');
            list.insertAdjacentHTML('beforeend', html);
            return count;
        },
        rerenderComments() {
            const list = getCommentList();
            if (!list) return false;
            const replacement = list.cloneNode(true);
            replacement.dataset.rerendered = String(Date.now());
            list.replaceWith(replacement);
            return true;
        },
        changeItemStyle(selector = '#comment_wrap_1 .cmt_list > li') {
            const item = document.querySelector(selector);
            if (!item) return false;
            item.style.borderLeft = item.style.borderLeft ? '' : '3px solid rgb(255, 0, 0)';
            return true;
        },
        insertBlockedUid(kind = 'comment') {
            if (kind === 'list') {
                getListBody()?.insertAdjacentHTML('beforeend', listMarkup({ uid: 'blocked-dynamic-list', title: '동적 차단 UID 목록 행' }));
                return true;
            }
            return this.addComments(1, { uid: `blocked-dynamic-${nextCommentNo}`, nick: '차단 UID' });
        },
        async setUidApiMode(mode = 'normal', delayMs = 0) {
            await fetch('/__testbed/api-mode', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode, delayMs }) });
        },
        insertAds(count = 1, { withFrame = false } = {}) {
            const parent = document.querySelector('.writing_view_box, #container') || document.body;
            for (let index = 0; index < count; index += 1) {
                const wrap = document.createElement('div');
                wrap.className = 'view_ad_wrap';
                wrap.id = `kakao_ad_${Date.now()}_${index}`;
                wrap.innerHTML = withFrame
                    ? `<iframe id="google_ads_iframe_dynamic_${Date.now()}_${index}" title="advertisement" src="/__testbed/ad-frame.html"></iframe>`
                    : '<ins class="kakao_ad_area">local dynamic ad</ins>';
                parent.appendChild(wrap);
            }
            return count;
        },
        addLongArticleNodes(count = 1000) {
            const parent = document.querySelector('#fixture-long-article, .write_div');
            if (!parent) return 0;
            const fragment = document.createDocumentFragment();
            for (let index = 0; index < count; index += 1) {
                const paragraph = document.createElement('p');
                paragraph.className = 'fixture-long-node';
                paragraph.textContent = `동적 장문 노드 ${index}`;
                fragment.appendChild(paragraph);
            }
            parent.appendChild(fragment);
            return count;
        },
        toggleDark(force) {
            const enabled = typeof force === 'boolean' ? force : !document.body.classList.contains('dc-filter-dark-mode');
            document.body.classList.toggle('dc-filter-dark-mode', enabled);
            document.documentElement.classList.toggle('dc-filter-dark-mode', enabled);
            return enabled;
        },
        changeOneListRow() {
            const row = getListBody()?.querySelector('tr.ub-content:nth-of-type(5)');
            const link = row?.querySelector('.gall_tit a');
            if (!link) return null;
            link.textContent = `한 행만 변경 ${Date.now()}`;
            return row.getAttribute('data-custom-row-id');
        },
        replaceList(count = 10) {
            const tbody = getListBody();
            if (!tbody) return false;
            const replacement = document.createElement('tbody');
            replacement.innerHTML = Array.from({ length: count }, (_, index) => listMarkup({ title: `전체 교체 행 ${index + 1}` })).join('');
            tbody.replaceWith(replacement);
            return true;
        },
        setWriteEditor(value = '') {
            const editor = getWriteEditor();
            if (!editor) return false;
            editor.textContent = String(value);
            editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: String(value) }));
            syncWriteMemo();
            return true;
        },
        rerenderWriteEditor() {
            const frame = document.querySelector('[data-fixture-editor]');
            if (!frame) return false;
            syncWriteMemo();
            const replacement = frame.cloneNode(true);
            replacement.dataset.rerendered = String(Date.now());
            frame.replaceWith(replacement);
            return true;
        },
        toggleWriteHtml(force) {
            const frame = document.querySelector('[data-fixture-editor]');
            if (!frame) return false;
            const checkbox = document.querySelector('#chk_html');
            const enabled = typeof force === 'boolean' ? force : !frame.classList.contains('fixture-html-mode');
            syncWriteMemo();
            const editable = frame.querySelector('.note-editable');
            const code = frame.querySelector('.note-codable');
            if (code && enabled) code.value = editable?.innerHTML || '';
            if (editable && !enabled && code) editable.innerHTML = code.value;
            frame.classList.toggle('fixture-html-mode', enabled);
            if (editable) editable.hidden = enabled;
            if (code) code.hidden = !enabled;
            if (checkbox) checkbox.checked = enabled;
            const useHtml = getWriteForm()?.querySelector('[name="use_html"]');
            if (useHtml) useHtml.value = enabled ? 'Y' : 'N';
            syncWriteMemo();
            return enabled;
        },
        selectWriteHeadtext(value = '일반') {
            const form = getWriteForm();
            const input = form?.querySelector('[name="headtext"]');
            if (!form || !input) return false;
            input.value = String(value);
            form.querySelectorAll('[data-headtext]').forEach((button) => button.classList.toggle('active', button.dataset.headtext === String(value)));
            return true;
        },
        toggleWriteLayer(kind, force = true) {
            const selectors = {
                dccon: '.fixture-dccon-layer',
                fontsize: '.fixture-fontsize-layer',
                fontname: '.fixture-fontname-layer',
                color: '.fixture-color-layer',
                lineheight: '.fixture-lineheight-layer',
                paragraph: '.fixture-paragraph-layer',
                table: '.fixture-table-layer',
                headtext: '.fixture-write-toast'
            };
            const layer = document.querySelector(selectors[kind]);
            if (!(layer instanceof HTMLElement)) return false;
            const show = typeof force === 'boolean' ? force : layer.hidden;
            layer.hidden = !show;
            layer.closest('.note-btn-group')?.classList.toggle('open', show);
            const trigger = kind === 'headtext'
                ? layer.closest('li')
                : layer.closest('.note-btn-group')?.querySelector('.note-btn');
            trigger?.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
            trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            return show;
        },
        toggleWriteCaptcha(force) {
            const row = document.querySelector('.guest_info_row');
            if (!row) return false;
            let cell = row.querySelector('.fixture-captcha-cell');
            const show = typeof force === 'boolean' ? force : !cell;
            if (!show) {
                cell?.remove();
                return false;
            }
            if (!cell) {
                cell = document.createElement('td');
                cell.className = 'fixture-captcha-cell user_info_input';
                cell.innerHTML = '<div class="captcha"><label for="code">코드 입력</label><span class="fixture-captcha-image" aria-label="캡차 이미지">3D8WA</span><input id="code" name="code" type="text" autocomplete="off"></div>';
                row.appendChild(cell);
            }
            return true;
        },
        addWriteAttachment(name = `fixture-image-${Date.now()}.png`) {
            const list = document.querySelector('.fixture-attachment-list');
            if (!list) return false;
            const chip = document.createElement('span');
            chip.className = 'fixture-attachment';
            chip.dataset.name = String(name);
            chip.textContent = String(name);
            list.appendChild(chip);
            return true;
        },
        snapshot() {
            const form = getWriteForm();
            return {
                comments: document.querySelectorAll('#comment_wrap_1 .cmt_list > li').length,
                replies: document.querySelectorAll('.reply_list > li').length,
                imageComments: document.querySelectorAll('.img_comment_box .cmt_list > li').length,
                rows: document.querySelectorAll('table.gall_list tbody tr.ub-content').length,
                mirrors: document.querySelectorAll('.custom-post-item').length,
                ads: document.querySelectorAll('.view_ad_wrap, iframe[id^="google_ads_iframe_"]').length,
                write: form ? {
                    formId: form.id,
                    subject: form.querySelector('[name="subject"]')?.value || '',
                    headtext: form.querySelector('[name="headtext"]')?.value || '',
                    memo: form.querySelector('[name="memo"]')?.value || '',
                    htmlMode: form.querySelector('[name="use_html"]')?.value || 'N',
                    attachments: form.querySelectorAll('.fixture-attachment').length,
                    submitStatus: form.dataset.submitStatus || 'idle'
                } : null,
                nodes: document.getElementsByTagName('*').length
            };
        }
    };
    globalThis.__dcufFixture = api;

    document.addEventListener('click', (event) => {
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (!action) return;
        const actions = {
            'add-one-comment': () => api.addComments(1),
            'add-100-comments': () => api.addComments(100),
            'add-500-comments': () => api.addComments(500),
            'rerender-comments': () => api.rerenderComments(),
            'insert-blocked': () => api.insertBlockedUid(),
            'insert-ads': () => api.insertAds(5),
            'long-article': () => api.addLongArticleNodes(1000),
            dark: () => api.toggleDark(),
            'change-style': () => api.changeItemStyle(),
            'uid-delay': () => api.setUidApiMode('delay', 500),
            'uid-fail': () => api.setUidApiMode('fail', 0),
            'uid-normal': () => api.setUidApiMode('normal', 0),
            'change-row': () => api.changeOneListRow(),
            'replace-list': () => api.replaceList(),
            'write-rerender-editor': () => api.rerenderWriteEditor(),
            'write-toggle-html': () => api.toggleWriteHtml(),
            'write-add-attachment': () => api.addWriteAttachment(),
            'write-toggle-captcha': () => api.toggleWriteCaptcha()
        };
        actions[action]?.();
    });

    document.addEventListener('click', (event) => {
        const headtext = event.target.closest('[data-headtext]')?.dataset.headtext;
        if (headtext) api.selectWriteHeadtext(headtext);
        if (event.target.closest('#chk_html')) api.toggleWriteHtml(event.target.checked);
    });
    document.addEventListener('input', (event) => {
        if (event.target.matches('.note-editable, .native-editor')) syncWriteMemo();
    });
    document.addEventListener('submit', async (event) => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement) || !form.matches('#write, #writeForm')) return;
        event.preventDefault();
        if (form.dataset.submitStatus === 'pending') return;
        syncWriteMemo();
        form.dataset.submitStatus = 'pending';
        const submitters = form.querySelectorAll('[type="submit"]');
        submitters.forEach((button) => { button.disabled = true; });
        try {
            const body = new URLSearchParams();
            for (const [key, value] of new FormData(form)) {
                if (typeof value === 'string') body.append(key, value);
            }
            const response = await fetch('/__testbed/write-submit', {
                method: 'POST',
                headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
                body
            });
            if (!response.ok) throw new Error(`write fixture submit failed: ${response.status}`);
            form.dataset.submitStatus = 'done';
        } catch (error) {
            form.dataset.submitStatus = 'failed';
            throw error;
        } finally {
            submitters.forEach((button) => { button.disabled = false; });
        }
    });
})();
