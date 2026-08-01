import { hostBehaviorSimulatorScript, pumxHostSimulatorScript } from './host-behavior-simulator.mjs';

const head = (title) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><link rel="stylesheet" href="/__testbed/fixture.css"><style>
*{box-sizing:border-box}body{margin:0;background:#f5f6f8;color:#222;font-family:Arial,sans-serif}#top,#container{width:min(1120px,calc(100% - 24px));margin-inline:auto}.page_head{height:54px;border-bottom:2px solid #3b4890}.host-reopen{position:fixed;right:8px;bottom:8px;z-index:2}.no_memberwrap,.empty_pagewrap{position:relative}.no_member_cont>.inner,.pop_content.robot{position:relative}.btn_box{position:relative}.btn_box>.btn_svc{position:absolute;inset:0;width:100%;z-index:1}.btn_box>button{min-height:42px}.host-popup-obstruction{position:absolute;inset:0 0 0 50%;z-index:2;pointer-events:auto;background:transparent}.view_content_wrap{width:100%;padding:20px}.btn_recommend_box{width:900px}.recommend_kapcode{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px}.recommend_kapcode>*{max-width:100%}
</style></head>`;

const chrome = '<div id="top"><header class="dcheader typea"><div class="dchead"><h1>dcinside.com</h1></div></header></div>';
const pageHead = '<header class="page_head clear"><div class="fl"><h2>테스트 갤러리</h2></div></header>';

const hiddenFields = (extra = '') => `<input type="hidden" name="ci_t" value="fixture-redacted"><input type="hidden" name="id" value="test"><input type="hidden" name="no" value="1001"><input type="hidden" name="key" value=""><input type="hidden" name="dcc_key" value="fixture-redacted">${extra}`;

export function hostPasswordPage({ kind = 'modify', variant = 'major' } = {}) {
    const modify = kind === 'modify';
    const action = modify ? '/__testbed/modify_password_submit' : '/__testbed/delete_password_submit';
    const formName = modify ? 'password_confirm' : 'delete';
    const confirmType = modify ? 'submit' : 'button';
    const confirmClass = modify ? 'btn_blue small btn_ok' : 'btn_blue btn_svc small btn_ok';
    const title = modify ? '비회원 글 수정' : '비회원 글 삭제';
    return `${head(`host ${kind} password`)}<body data-fixture-page="${kind}" data-fixture-variant="${variant}">${chrome}<main id="container"><section>${pageHead}
        <form id="${formName}" name="${formName}" method="post" action="${action}" onsubmit="event.preventDefault()">
            ${hiddenFields('<input type="hidden" name="auth_token" value="fixture-redacted">')}
            <article data-host-delegation-root><div class="no_memberwrap" data-host-popup><div class="no_member_cont"><h3 class="blind">${title}</h3><div class="inner">
                <b class="txt">비밀번호를 입력하세요.</b><input class="pw_inquiry" id="password" name="password" type="password" title="비밀번호 입력">
                <div class="btn_box" data-host-action-row><button type="button" class="btn_grey small" data-host-action="cancel">취소</button><button type="${confirmType}" class="${confirmClass}" data-host-action="confirm">확인</button></div>
            </div></div></div></article>
        </form><button type="button" class="host-reopen" onclick="__dcufHostReopenPopup()">다시 열기</button>
    </section></main>${hostBehaviorSimulatorScript({ popupSelector: '[data-host-popup]' })}</body></html>`;
}

export function hostDeleteConfirmPage({ variant = 'mini' } = {}) {
    return `${head('host authenticated delete confirm')}<body data-fixture-page="delete-confirm" data-fixture-variant="${variant}">${chrome}<main id="container"><section>${pageHead}
        <form id="delete" name="delete" method="post" action="/__testbed/delete_confirm_submit" onsubmit="event.preventDefault();window.__hostDeleteSubmitCalls=(window.__hostDeleteSubmitCalls||0)+1">
            ${hiddenFields()}
            <article data-host-delegation-root><div class="empty_pagewrap dcuf-host-delete-confirm"><div class="pop_wrap type5" data-host-popup><div class="pop_content robot">
                <p>삭제된 게시물은 복구할 수 없습니다.<br>게시물을 삭제하시겠습니까?</p>
                <div class="btn_box" data-host-action-row><button type="button" class="btn_grey small" data-host-action="cancel">이전</button><button type="submit" class="btn_blue btn_svc small" data-host-action="confirm">삭제</button></div>
            </div></div></div></article>
        </form><button type="button" class="host-reopen" onclick="__dcufHostReopenPopup()">다시 열기</button>
    </section></main>${hostBehaviorSimulatorScript({ popupSelector: '[data-host-popup]' })}</body></html>`;
}

const recommendationBox = (captcha) => `<div class="btn_recommend_box recomuse_y morebox" data-host-recommend-box>
    <div class="inner_box"><div class="inner"><div class="up_num_box"><p class="up_num">7</p></div><button type="button" class="btn_recom_up" data-host-action="recommend-up">추천</button></div><div class="inner"><button type="button" class="btn_recom_down" data-host-action="recommend-down">비추천</button><div class="down_num_box"><p class="down_num">0</p></div></div></div>
    ${captcha ? '<div class="recommend_kapcode" data-host-captcha><img alt="CAPTCHA" width="180" height="40"><input class="recom_input_kapcode" name="code" value=""><button type="button">새로고침</button></div>' : ''}
    <div class="recom_bottom_box"><button type="button">추천 취소</button><button type="button">공유</button><button type="button">스크랩</button><button type="button">신고</button></div>
</div>`;

export function hostRecommendationPage({ variant = 'major', captcha = false } = {}) {
    return `${head('host recommendation')}<body data-fixture-page="view" data-fixture-variant="${variant}">${chrome}<main id="container"><article><div class="view_content_wrap" data-host-delegation-root><header class="gallview_head"><h2>테스트 본문</h2></header><section class="writing_view_box"><div class="write_div"><p>본문</p></div></section>${recommendationBox(captcha)}</div></article></main>${hostBehaviorSimulatorScript()}</body></html>`;
}

export function hostPumxPage({ variant = 'major', buttonDelayMs = 100, handlerDelayMs = 600, alreadyActive = false, omitButton = false } = {}) {
    return `${head('host delayed PUMX')}<body data-fixture-page="write" data-fixture-variant="${variant}">${chrome}<main id="container"><article id="write_wrap"><form id="write" name="write" method="post" action="/__testbed/write-submit"><input type="hidden" name="id" value="test"><input id="subject" name="subject"><textarea id="memo" name="memo"></textarea><div id="write_option_box" class="write_type_box"><div class="inner" data-host-pumx-root></div></div><div class="btn_box write"><button type="submit" class="btn_blue write">등록</button></div></form></article></main>${pumxHostSimulatorScript({ buttonDelayMs, handlerDelayMs, alreadyActive, omitButton })}</body></html>`;
}
