import { p0aListPage, p0aWritePage } from './p0a-live-contracts.mjs';

const loggedInRail = `<div class="area_links" data-fixture-login-rail>
<a class="btn_top_mypage" href="#mypage">마이페이지</a>
<a class="btn_top_alarm" href="#alarm">알림</a>
<a class="btn_top_setting" href="#setting">설정</a>
<button type="button" class="btn_top_night" aria-pressed="false">야간모드</button>
<a class="btn_top_loginout" href="#logout">로그아웃</a>
</div>`;

const expandHeaderRail = (html) => html.replace(
    /<div class="area_links"><a class="btn_top_loginout" href="#login">로그인<\/a><\/div>/,
    loggedInRail
);

const addPumxControl = (html) => html.replace(
    '<div class="btn_box write"><button type="submit">등록</button><button type="button">취소</button></div>',
    '<div class="write_option"><button type="button" id="btn_pumx" aria-pressed="true" class="on">펌 금지</button></div><div class="btn_box write"><button type="submit">등록</button><button type="button">취소</button></div>'
);

export const p1ListPage = ({ variant = 'minor' } = {}) => expandHeaderRail(p0aListPage({ variant }));
export const p1WritePage = () => addPumxControl(expandHeaderRail(p0aWritePage()));
