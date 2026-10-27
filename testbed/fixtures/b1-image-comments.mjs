// Public6778319 open image-comment anatomy/CSS observed2026-10-27.
// All copy/media/values are synthetic; callbacks are fixture-only witnesses.
export function mountB1ImageCommentsFixture({ reference = false, imageWidth = 500 } = {}) {
    document.getElementById('dcuf-testbed-controls')?.remove();
    document.querySelector('.fixture-synthetic-image-comments, .fixture-live-image-comments')?.remove();
    // The generic filter fixture supplies a border absent from the observed
    // native image rows. Preserve the product card border being reviewed.
    for (const sheet of document.styleSheets) {
        if (!sheet.href?.endsWith('/__testbed/fixture.css')) continue;
        for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
            if (sheet.cssRules[i].selectorText === '.comment_box .cmt_list > li') sheet.deleteRule(i);
        }
    }
    const content = document.querySelector('.write_div, [data-dcuf-role="article-content"]');
    const css = document.createElement('style');
    css.textContent = `
      .blind{position:absolute;width:0;height:0;overflow:hidden}
      .img_comment{width:850px;line-height:normal;border-top:2px solid #ddd;font-weight:normal}
      .img_comment .cmt_txt_cont{float:left;margin-left:10px}
      .img_comment .cmt_txt_cont .cmt_write{float:left}
      .img_comment .cmt_cont_bottm{float:right}
      .img_comment .view_comment .cmt_txt_cont .cmt_cont_bottm{margin-top:0;margin-left:10px}
      .img_comment .cmt_txt_cont textarea{width:594px;height:70px;padding:10px 13px;box-sizing:border-box}
      .img_comment .view_comment .cmt_txt_cont .cmt_cont_bottm .btn_blue{width:70px;height:70px}
      .img_comment .cmt_txtbox,.img_comment .usertxt{width:570px;text-align:left}
      .img_comment .addbox .cmt_txtbox,.img_comment .addbox .usertxt{width:550px}
      .cmt_nickbox{float:left;width:152px;margin-right:33px;margin-top:3px;line-height:13px}
      .addbox .cmt_nickbox{width:152px}
      .cmt_write{position:relative}
      .cmt_textarea_label{position:absolute;top:10px;left:13px;color:#687384;font-size:12px;pointer-events:none}
      .user_info_input{position:relative;width:140px;border:1px solid #cecdce}
      .btn_circledel{position:absolute;right:6px;top:8px}
      .btn_blue{background:#3b4890;border-color:#29367c;color:#fff}
      .write_div .img_comment .cmt_write_box div,.write_div .img_comment .cmt_txtbox,.write_div .img_comment .cmt_nickbox{padding-bottom:0}
    `;
    document.head.prepend(css);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="160"><rect width="500" height="160" fill="#d2f0e6"/><circle cx="250" cy="80" r="45" fill="#26736f"/></svg>';
    const media = 'data:image/svg+xml,' + encodeURIComponent(svg);
    const row = (i) => `<li class="ub-content"><div class="cmt_info clear"><div class="addbox"><div class="cmt_nickbox"><span class="gall_writer ub-writer" data-uid="safe-image-${i}" data-nick="이미지댓글 작성자"><span class="nickname">이미지댓글 작성자</span></span></div><div class="clear cmt_txtbox"><p class="usertxt">이미지마다 연결된 댓글입니다. 긴 문장도 영역 안에서 자연스럽게 이어집니다.</p>${i === 2 ? `<img width="100" height="32" alt="합성 댓글 미디어" src="${media}">` : ''}</div><div class="fr clear"><span class="date_time">10.27 12:30</span><div class="cmt_mdf_del"><button type="button" aria-label="합성 댓글 삭제">×</button></div></div></div></div></li>`;
    const composer = (i) => `<div id="img_cmt_write_box_${i}" class="cmt_write_box clear"><div class="fl"><div class="user_info_input nomem_nick"><label class="blind" for="gall_nick_name_image_${i}">닉네임</label><input id="gall_nick_name_image_${i}" name="gall_nick_name" type="text" value="ㅇㅇ"><input id="img_cmt_name_${i}" type="text" style="display:${reference ? 'block' : 'none'}" value="ㅇㅇ"><button type="button" class="btn_circledel" aria-label="닉네임 지우기">×</button><button type="button" class="btn_gallnickuse" style="display:none">갤닉 사용</button></div><div class="user_info_input"><label class="blind" for="img_cmt_password_${i}">비밀번호</label><input id="img_cmt_password_${i}" type="password" autocomplete="off"></div></div><div class="cmt_txt_cont"><div class="cmt_write"><label class="cmt_textarea_label" for="img_cmt_memo_${i}">이미지에 대한 댓글을 남겨 주세요.</label><textarea id="img_cmt_memo_${i}" aria-label="이미지댓글 내용"></textarea></div><div class="cmt_cont_bottm clear"><div class="fr"><button type="submit" class="btn_blue small btn_image_comment">등록</button></div></div></div></div>`;
    window.__b1ImageCalls = [];
    window.__b1ImageOriginals = [];
    for (const i of [1, 2]) {
        const area = document.createElement('div'); area.className = `img_area no${i}`;
        area.innerHTML = `<div class="imgwrap no${i}"><img width="${imageWidth}" height="160" alt="합성 본문 이미지 ${i}" src="${media}"><button type="button" class="btn_imgcmt">이미지댓글 ON/OFF ${i}</button></div><div class="${reference ? 'fixture-ordinary-reference' : 'img_comment fold getMoreComment'}" style="display:none;${reference ? 'width:850px;max-width:100%' : ''}"><div class="view_comment image_comment"><div class="comment_wrap show"><div class="comment_count"><span class="num_box">전체 댓글 <b class="font_red">2</b>개</span><div class="fr"><button type="button" class="btn_cmt_refresh">새로고침</button></div></div><div class="comment_box img_comment_box"><ul class="cmt_list add">${row(1)}${row(2)}</ul></div></div></div></div>`;
        const pane = area.lastElementChild;
        area.querySelector('.btn_imgcmt').onclick = () => { pane.style.display = pane.style.display === 'none' ? 'block' : 'none'; };
        pane.onclick = () => {
            if (!reference && !pane.classList.contains('fold')) return;
            if (pane.querySelector('textarea')) return;
            if (!reference) { pane.classList.remove('fold', 'getMoreComment'); pane.classList.add('open'); }
            pane.querySelector('.view_comment').insertAdjacentHTML('beforeend', composer(i));
            const submit = pane.querySelector('.btn_image_comment');
            submit.onclick = event => { event.preventDefault(); window.__b1ImageCalls.push(i); };
            for (const n of pane.querySelectorAll('input,textarea,button,form')) window.__b1ImageOriginals.push({node:n,parent:n.parentNode,type:n.getAttribute('type'),style:n.style.cssText,handler:n.onclick,submit:n.onsubmit});
        };
        content.append(area);
    }
}
