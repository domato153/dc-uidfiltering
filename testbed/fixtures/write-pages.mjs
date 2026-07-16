const head = (title) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><link rel="stylesheet" href="/__testbed/fixture.css"></head>`;
const scripts = '<script src="/__testbed/fixture-client.js"></script></body></html>';

const hiddenContract = (variant) => `
    <input type="hidden" name="id" value="test">
    <input type="hidden" name="_GALLTYPE_" value="${variant === 'minor' ? 'M' : 'G'}">
    <input type="hidden" name="gallery_no" value="fixture-gallery">
    <input type="hidden" name="r_key" value="fixture-redacted">
    <input type="hidden" name="upload_status" value="N">
    <input type="hidden" name="clickbutton" value="N">
    <input type="hidden" name="user_ip" value="127.0.0.1">
    <input type="hidden" name="block_key" value="fixture-redacted">
    <input type="hidden" name="tempIdx" value="">
    <input type="hidden" name="headtext" value="">
    <input type="hidden" name="use_headtext" value="${variant === 'minor' ? 'Y' : 'N'}">
    <input type="hidden" name="poll" value="">
    <input type="hidden" name="service_code" value="fixture">
    <input type="hidden" name="use_html" value="N">
    <input type="hidden" name="c_r_k_x_z" value="fixture-redacted">
    <input type="hidden" name="use_gall_nick" value="N">
    <input type="hidden" name="auto_zzal" value="N">`;

const editor = `
    <div class="note-editor note-frame" data-fixture-editor>
        <div class="note-toolbar tx-toolbar-basic" role="toolbar" aria-label="편집 도구">
            <div class="note-btn-group"><button type="button" class="note-btn" data-command="image">이미지</button></div>
            <div class="note-btn-group"><button type="button" class="note-btn" data-command="video">동영상</button></div>
            <div class="note-btn-group note-mybutton">
                <button type="button" class="note-btn" data-command="dccon">디시콘</button>
                <div id="div_con" class="pop_wrap type3 fixture-dccon-layer" role="dialog" hidden>
                    <div class="pop_content dcconlayer edit"><div class="dccon_list_wrap clear"><div class="dccon_list_box dcconlist">실제 구조형 디시콘 창</div></div></div>
                </div>
            </div>
            <div class="note-btn-group"><button type="button" class="note-btn" data-command="youtube">유튜브</button></div>
            <div class="note-btn-group"><button type="button" class="note-btn" data-command="external">외부컨텐츠</button></div>
            <div class="note-btn-group"><button type="button" class="note-btn" data-command="series">시리즈</button></div>
            <div class="note-btn-group"><button type="button" class="note-btn" data-command="poll">투표</button></div>
            <div class="note-btn-group"><button type="button" class="note-btn" data-command="ai-image">AI 이미지</button></div>
            <div class="note-btn-group"><button type="button" class="note-btn" data-command="insert-zzal">짤방삽입</button></div>
            <div class="note-btn-group"><button type="button" class="note-btn note-btn-danger" data-command="remove-zzal">짤방삭제</button></div>
            <div class="note-btn-group note-fontname"><div class="note-btn-group fixture-fontname-group">
                <button type="button" class="note-btn dropdown-toggle" data-command="font"><span class="note-current-fontname"></span> <span class="note-icon-caret"></span></button>
                <div class="note-dropdown-menu note-check dropdown-fontname fixture-fontname-layer" role="list" hidden>${['Courier New', 'Times New Roman'].map((font) => `<a class="note-dropdown-item" href="#" data-value="${font}" role="listitem"><span style="font-family:'${font}'">${font}</span></a>`).join('')}</div>
            </div></div>
            <div class="note-btn-group note-fontsize"><div class="note-btn-group fixture-fontsize-group">
                <button type="button" class="note-btn" data-command="size">12</button>
                <div class="note-dropdown-menu note-check dropdown-fontsize fixture-fontsize-layer" role="list" hidden>${[8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 30, 36, 50, 72, 96].map((size) => `<a class="note-dropdown-item" href="#" data-value="${size}" role="listitem">${size}</a>`).join('')}</div>
            </div></div>
            <div class="note-btn-group"><button type="button" class="note-btn note-btn-bold" data-command="bold"><strong>가</strong></button></div>
            <div class="note-btn-group"><button type="button" class="note-btn note-btn-italic" data-command="italic"><em>가</em></button></div>
            <div class="note-btn-group"><button type="button" class="note-btn note-btn-underline" data-command="underline"><u>가</u></button></div>
            <div class="note-btn-group note-color fixture-color-group"><button type="button" class="note-btn" data-command="color">색상</button><div class="note-dropdown-menu fixture-color-layer" role="list" hidden><div class="note-palette"><strong>배경색</strong><div class="fixture-color-grid">${Array.from({ length: 80 }, (_, index) => `<button type="button" class="note-color-btn" style="background:hsl(${index * 17} 70% 50%)"></button>`).join('')}</div></div><div class="note-palette"><strong>글자색</strong><div class="fixture-color-grid">${Array.from({ length: 80 }, (_, index) => `<button type="button" class="note-color-btn" style="background:hsl(${index * 19} 65% 45%)"></button>`).join('')}</div></div></div></div>
            <div class="note-btn-group note-height fixture-lineheight-group"><button type="button" class="note-btn dropdown-toggle" data-command="lineheight">줄 간격</button><div class="note-dropdown-menu note-check dropdown-line-height fixture-lineheight-layer" role="list" hidden>${['1.0', '1.2', '1.4', '1.5', '1.6', '1.8', '2.0', '3.0'].map((value) => `<a class="note-dropdown-item" href="#" data-value="${value}" role="listitem">${value}</a>`).join('')}</div></div>
            <div class="note-btn-group note-para fixture-paragraph-group"><button type="button" class="note-btn dropdown-toggle" data-command="paragraph">문단 정렬</button><div class="note-dropdown-menu fixture-paragraph-layer" role="list" hidden>${['왼쪽', '가운데', '오른쪽', '양쪽'].map((value) => `<button type="button" class="note-btn" role="listitem">${value}</button>`).join('')}</div></div>
            <div class="note-btn-group fixture-table-group"><button type="button" class="note-btn dropdown-toggle" data-command="table">표</button><div class="note-dropdown-menu note-table fixture-table-layer" role="list" hidden><div class="fixture-table-grid">${Array.from({ length: 100 }, (_, index) => `<button type="button" class="note-btn" data-cell="${index + 1}"></button>`).join('')}</div><span>1 x 1</span></div></div>
            <div class="note-btn-group fixture-html-group"><button type="button" class="note-btn"><label class="write-html-toggle"><input id="chk_html" type="checkbox"> HTML</label></button></div>
        </div>
        <div class="note-editing-area">
            <div class="note-editable" contenteditable="true" role="textbox" aria-label="본문 입력"></div>
            <textarea id="memo" name="memo" hidden></textarea>
            <textarea class="note-codable" aria-label="HTML 입력"></textarea>
        </div>
        <div class="note-statusbar"><span class="note-resizebar" aria-hidden="true"></span></div>
    </div>`;

const categories = `
    <div class="write_subject" role="group" aria-label="말머리">
        <strong class="tit">말머리</strong>
        <ul class="subject_list">
            <li class="fixture-headtext" data-headtext="일반">일반</li>
            <li class="fixture-headtext" data-headtext="중망호">중망호</li>
            <li class="fixture-headtext" data-headtext="연재">연재</li>
            <li class="fixture-headtext" data-headtext="대회">대회</li>
            <li class="fixture-headtext" data-headtext="스토리">스토리📖</li>
            <li class="fixture-headtext obstruct" data-headtext="정보">정보공략📝<div class="tip_box2 nowrap obstruct_tipbox fixture-write-toast" role="alert" hidden><div class="inner">개념글 미사용 말머리입니다.</div></div></li>
            <li class="fixture-headtext" data-headtext="질문">질문❓</li>
            <li class="fixture-headtext" data-headtext="유출">유출⚠️</li>
            <li class="fixture-headtext active" data-headtext="속보">속보📢</li>
        </ul>
    </div>`;

const controls = `<aside id="dcuf-testbed-controls" aria-label="글쓰기 testbed controls">
    <button type="button" data-action="write-rerender-editor">에디터 재렌더</button>
    <button type="button" data-action="write-toggle-html">HTML 전환</button>
    <button type="button" data-action="write-add-attachment">첨부 추가</button>
    <button type="button" data-action="write-toggle-captcha">캡차 전환</button>
    <button type="button" data-action="insert-ads">광고 삽입</button>
    <button type="button" data-action="dark">야간모드</button>
</aside>`;

export function writePage({ variant = 'major', formMode = 'write' } = {}) {
    const isMinor = variant === 'minor';
    const isModify = formMode === 'modify';
    const formAttributes = isModify
        ? 'name="modify" method="post" action="/board/forms/modify_submit" autocomplete="off"'
        : 'id="write" name="write" method="post" action="/__testbed/write-submit" autocomplete="off"';
    const captcha = isMinor ? `<td class="fixture-captcha-cell"><div class="captcha"><label for="code">코드 입력</label><span class="fixture-captcha-image" aria-label="캡차 이미지">3D8WA</span><input id="code" name="code" type="text" inputmode="text" autocomplete="off"></div></td>` : '';
    return `${head(`DCUF ${variant} ${formMode} fixture`)}<body data-fixture-page="${isModify ? 'modify' : 'write'}" data-fixture-variant="${variant}">${controls}<div id="top" class="dcwrap width1160">
    <header class="fixture-gallery-header"><h1>${isMinor ? '마이너' : '메이저'} 갤러리</h1></header>
    <main id="container" class="clear ${isMinor ? 'minor_write' : 'gallery_write'}"><section class="center_content gall_write"><article id="write_wrap" class="clear">
        <form ${formAttributes}>
            ${hiddenContract(variant)}
            ${isModify ? '<input type="hidden" name="no" value="1001">' : ''}
            <input class="fixture-decoy-input" type="text" style="width:0;height:0;border:0" value="fixture-redacted">
            <input class="fixture-decoy-input" type="password" style="display:block;width:0;height:0;border:0" value="fixture-redacted">
            <table class="w_top"><tbody>
                <tr class="write_subject_row"><th><label for="subject">제목</label></th><td><input id="subject" name="subject" type="text" maxlength="100" autocomplete="off"></td></tr>
                <tr class="guest_info_row"><th>작성자</th><td><input id="name" name="name" type="text" placeholder="닉네임" autocomplete="off"></td><td><input id="password" name="password" type="password" placeholder="비밀번호" autocomplete="new-password"></td>${captcha}</tr>
            </tbody></table>
            ${isMinor ? categories : ''}
            <section class="editor_wrap">${editor}</section>
            <section class="fixture-attachment-panel"><input id="fixture-file-input" type="file" name="files[]" multiple><div class="fixture-attachment-list" aria-live="polite"></div></section>
            <section class="ai_easy_wrap fixture-live-ai-prompt"><div class="ai_easy_box">
                <div class="ipt_box"><button class="ipt_img" type="button" aria-label="이미지 선택"></button><textarea class="ipt_txt" rows="1" placeholder="AI 이미지 간편 등록"></textarea></div>
                <button class="btn_aigo" type="button">등록</button><button class="btn_close" type="button" aria-label="닫기">×</button>
            </div></section>
            <label class="fixture-adult"><input type="checkbox" name="adult" value="1"> 성인 게시물</label>
            <div class="cm_ad"><ins class="kakao_ad_area">local write ad</ins></div>
            <div class="btn_box write fr fixture-write-actions">
                <button class="btn_grey cancle" type="button" onclick="document.querySelector('#leave_confirm_box').style.display='block'">취소</button>
                <button id="write-submit" class="btn_blue btn_svc write" type="submit">등록</button>
                <div id="leave_confirm_box" class="pop_wrap type2 fixture-leave-confirm" style="left:50%;top:-322px;margin-left:-619px;display:none" role="dialog" aria-label="글쓰기 취소 확인">
                    <div class="pop_content write_ly">
                        <div class="pop_head bg"><h3>글쓰기</h3></div>
                        <div class="write_cont">
                            <p class="txt">글 작성을 취소하시겠습니까?</p>
                            <div class="btn_box">
                                <button type="button" class="btn_grey small" onclick="document.querySelector('#leave_confirm_box').style.display='none'">취소</button>
                                <button type="button" class="btn_blue small">확인</button>
                            </div>
                        </div>
                        <button type="button" class="poply_whiteclose" onclick="document.querySelector('#leave_confirm_box').style.display='none'"><span class="blind">레이어 닫기</span><em></em></button>
                    </div>
                </div>
            </div>
        </form>
    </article></section></main></div>${scripts}`;
}

export function modifyPasswordPage() {
    return `${head('DCUF modify password fixture')}<body data-fixture-page="modify" data-fixture-variant="major"><div id="top" class="dcwrap width1160">
        <header class="dcheader typea"><div class="dchead"><h1 class="dc_logo"><a href="#">dcinside.com</a></h1><div class="wrap_search"><form class="top_search"><input aria-label="갤러리 검색"><button type="button" class="sp_img bnt_search">검색</button></form></div></div></header>
        <div class="gnb_bar"><nav class="gnb"><ul class="gnb_list"><li>갤러리</li><li>마이너갤</li><li>미니갤</li></ul></nav></div>
        <div class="newvisit_history"><strong class="tit">최근 방문</strong><div class="newvisit_box"><ul class="newvisit_list"><li><a href="#">테스트 갤러리</a></li></ul></div></div>
        <main id="container" class="clear"><section>
            <header class="page_head clear"><div class="fl"><h2><a href="#gallery">테스트 갤러리</a></h2></div></header>
            <form id="password_confirm" name="password_confirm" method="post" action="/__testbed/modify_password_submit" onsubmit="event.preventDefault()">
                <input type="hidden" name="id" value="test"><input type="hidden" name="no" value="1001"><input type="hidden" name="auth_token" value="fixture-redacted">
                <article><div class="no_memberwrap"><div class="no_member_cont"><h3 class="blind">비회원 글 수정</h3><div class="inner">
                    <b class="txt">비밀번호를 입력하세요.</b>
                    <input class="pw_inquiry" id="password" name="password" type="password" title="비밀번호 입력">
                    <div class="btn_box"><button type="button" class="btn_grey small">취소</button><button type="submit" class="btn_blue small btn_ok">확인</button></div>
                </div></div></div></article>
            </form>
        </section></main>
        <footer class="dcfoot type1"><p>fixture footer should be hidden</p></footer><div id="data_info">fixture data info should be hidden</div>
    </div>${scripts}`;
}

export function nativeWritePage() {
    return `${head('DCInside native mobile write reference')}<body data-fixture-page="native-write" data-fixture-variant="native"><main class="native-mobile-write">
        <header class="native-write-header"><strong>마이너 갤러리</strong><button type="submit" form="writeForm">등록</button></header>
        <form id="writeForm" name="writeForm" method="post" action="/__testbed/write-submit">
            <input type="hidden" name="id" value="test"><input type="hidden" name="headtext" value="일반"><input type="hidden" name="use_html" value="N">
            <section class="native-captcha"><p>코드 3개를 입력해주세요.</p><label>코드 입력<input name="code" autocomplete="off"></label><span class="fixture-captcha-image">3D8WA</span></section>
            <div class="native-guest"><input name="name" placeholder="닉네임" autocomplete="off"><input name="password" type="password" placeholder="비밀번호" autocomplete="new-password"></div>
            <div class="native-headtexts">${['일반', '중망호', '연재', '대회'].map((name) => `<button type="button" class="fixture-headtext${name === '일반' ? ' active' : ''}" data-headtext="${name}">${name}</button>`).join('')}</div>
            <input id="native-subject" name="subject" placeholder="제목" maxlength="100">
            <div class="native-format-toolbar" role="toolbar"><button type="button">14</button><button type="button"><strong>가</strong></button><button type="button"><u>가</u></button><button type="button">색</button><button type="button">목록</button><button type="button">링크</button></div>
            <div class="native-editor" contenteditable="true" role="textbox" aria-label="본문 입력"></div><textarea id="memo" name="memo" hidden></textarea>
            <div class="native-media-toolbar" role="toolbar"><button type="button">이미지</button><button type="button">동영상</button><button type="button">디시콘</button><button type="button">유튜브</button><button type="button">투표</button><button type="button">설정</button></div>
            <div class="fixture-attachment-list"></div>
        </form>
    </main>${scripts}`;
}
