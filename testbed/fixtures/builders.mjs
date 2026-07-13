const escapeHtml = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

export function writer({ uid = '', nick = '작성자', ip = '', includeIdentityAttrs = true } = {}) {
    const identityAttrs = includeIdentityAttrs
        ? ` data-uid="${escapeHtml(uid)}" data-nick="${escapeHtml(nick)}" data-ip="${escapeHtml(ip)}"`
        : ` data-nick="${escapeHtml(nick)}"`;
    return `<span class="gall_writer ub-writer"${identityAttrs}><span class="nickname"><em>${escapeHtml(nick)}</em></span></span>${ip ? `<span class="ip">(${escapeHtml(ip)})</span>` : ''}`;
}

export function listRow(index, options = {}) {
    const variant = options.variant === 'minor' ? 'minor' : 'major';
    const uid = options.uid ?? `safe-list-${index}`;
    const nick = options.nick ?? `목록작성자${index}`;
    const rowClass = ['ub-content', options.ordinary === false ? '' : 'us-post', options.notice ? 'us-post--notice' : '', options.recommended ? 'us-post--recommend' : '', options.extraClass || ''].filter(Boolean).join(' ');
    const dataAttrs = options.includeDataAttrs === false ? '' : ` data-no="${1000 + index}" data-type="icon_txt"`;
    const hiddenStyle = options.hidden ? ' style="display:none" data-fixture-host-hidden="1"' : '';
    const cssHidden = options.cssHidden ? ' data-fixture-host-css-hidden="1"' : '';
    const viewPath = variant === 'minor' ? '/mgallery/board/view' : '/board/view';
    const extraCell = variant === 'minor' ? '<td class="gall_type">일반</td>' : '';
    const utilityCell = options.utilityExtraCell ? '<td class="fixture-host-extra" aria-hidden="true"></td>' : '';
    return `<tr class="${rowClass}"${dataAttrs}${hiddenStyle}${cssHidden}>
        <td class="gall_num">${1000 + index}</td>
        ${extraCell}<td class="gall_tit"><span class="gall_subject">일반</span><a href="${viewPath}?id=test&no=${1000 + index}">${options.title ?? `테스트 게시물 ${index}`}</a><a class="reply_numbox" href="${viewPath}?id=test&no=${1000 + index}#comment"><span class="reply_num">[${index % 7}]</span></a>${options.ad ? '<em class="icon_ad">AD</em>' : ''}</td>
        <td class="gall_writer_cell">${writer({ uid, nick, ip: options.ip || '', includeIdentityAttrs: options.includeIdentityAttrs !== false })}</td>
        <td class="gall_date">2026.07.12</td>
        <td class="gall_count">${index * 3}</td>
        <td class="gall_recommend">${index % 5}</td>${utilityCell}
    </tr>`;
}

export function listRows(count = 12, options = {}, variant = 'major') {
    return Array.from({ length: count }, (_, offset) => listRow(offset + 1, { variant, ...(options[offset + 1] || {}) })).join('');
}

export function liveListRows(variant = 'major', options = {}) {
    const isMinor = variant === 'minor';
    const totalRows = Number(options.totalRows) || (isMinor ? 53 : 51);
    const hiddenRows = isMinor ? 3 : 1;
    const rowOptions = {
        1: { cssHidden: true, ordinary: false, includeDataAttrs: false, includeIdentityAttrs: false, utilityExtraCell: true, title: '설문 숨김 행' },
        2: isMinor ? { hidden: true, ad: true, ordinary: false, includeDataAttrs: false, includeIdentityAttrs: false } : { notice: true },
        3: isMinor ? { hidden: true, ad: true, ordinary: false, includeDataAttrs: false, includeIdentityAttrs: false } : { recommended: true },
        [hiddenRows + 1]: { notice: true },
        [hiddenRows + 2]: { recommended: true },
        [hiddenRows + 3]: { ad: true },
        [hiddenRows + 4]: { uid: 'blocked-list-user' }
    };
    return listRows(totalRows, rowOptions, variant);
}

export function replyItem(index, parentNo, options = {}) {
    const uid = options.uid ?? `safe-reply-${parentNo}-${index}`;
    const imageHtml = options.image ? '<img class="comment_dccon" alt="inline reply image" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==">' : '';
    return `<li id="reply_li_${parentNo}_${index}" class="ub-content${options.extraClass ? ` ${escapeHtml(options.extraClass)}` : ''}" data-no="${parentNo}-${index}">
        <div class="reply_info"><div class="cmt_nickbox">${writer({ uid, nick: options.nick ?? `답글작성자${index}`, ip: options.ip || '' })}</div><div class="fr clear"><span class="date_time">07.12 12:00</span></div></div>
        <div class="cmt_txtbox"><p class="usertxt ub-word">${options.text ?? `답글 내용 ${index}`}</p>${imageHtml}</div>
    </li>`;
}

export function commentItem(index, options = {}) {
    const commentNo = options.commentNo ?? index;
    const uid = options.uid ?? `safe-comment-${index}`;
    const replies = Number(options.replies || 0);
    const replyHtml = replies > 0
        ? `<div class="reply show"><div class="reply_box"><ul class="reply_list" p-no="${commentNo}">${Array.from({ length: replies }, (_, offset) => replyItem(offset + 1, commentNo, options.replyOptions?.[offset + 1] || {})).join('')}</ul></div></div>`
        : '';
    const imageHtml = options.image ? '<img class="comment_dccon" alt="inline comment image" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==">' : '';
    const className = ['ub-content', options.dory ? 'dory' : ''].filter(Boolean).join(' ');
    const hiddenStyle = options.hidden ? ' style="display:none" data-fixture-host-hidden="1"' : '';
    return `<li id="comment_li_${commentNo}" class="${className}" data-no="${commentNo}"${hiddenStyle}>
        <div class="cmt_info"><div class="cmt_nickbox">${writer({ uid, nick: options.nick ?? `댓글작성자${index}`, ip: options.ip || '' })}</div><div class="fr clear"><span class="date_time">07.12 12:00</span></div></div>
        <div class="cmt_txtbox"><p class="usertxt ub-word">${options.text ?? `댓글 내용 ${index}`}</p>${imageHtml}</div>${replyHtml}
    </li>`;
}

export function imageCommentItem(index, options = {}) {
    return `<li id="img_comment_li_${index}" class="ub-content">
        <div class="cmt_info clear" data-no="${9000 + index}" data-rcnt="0" data-article-no="1001" data-article-lv="undefined">
            <div class="addbox"><div class="cmt_nickbox">${writer({ uid: options.uid ?? `safe-image-${index}`, nick: options.nick ?? `이미지댓글${index}`, ip: options.ip || '' })}</div>
            <div class="clear cmt_txtbox"><p class="usertxt" style="cursor:default">이미지 댓글 ${index}</p></div>
            <div class="fr clear"><span class="date_time">07.12 12:00</span></div></div>
        </div>
    </li>`;
}

export function commentRows(count = 8) {
    return Array.from({ length: count }, (_, offset) => commentItem(offset + 1, { replies: offset === 0 ? 2 : 0 })).join('');
}

export function liveCommentRows(variant = 'major', massComments = 0) {
    if (massComments > 0) return commentRows(massComments);
    if (variant !== 'minor') {
        return [
            commentItem(1),
            commentItem(2, { image: true }),
            commentItem(3),
            replyItem(1, 1, { uid: 'safe-reply-1-1' })
        ].join('');
    }
    return [
        commentItem(1, { image: true }),
        commentItem(2, { image: true }),
        commentItem(3, { image: true }),
        replyItem(1, 1, { image: true, extraClass: 'fixture-synthetic-reply' })
    ].join('');
}

export function longArticleNodes(count = 1000) {
    return Array.from({ length: count }, (_, index) => `<p class="fixture-long-node" data-index="${index}">장문 본문 노드 ${index}: selector와 observer 부하를 재현하는 로컬 fixture 문장입니다.</p>`).join('');
}
