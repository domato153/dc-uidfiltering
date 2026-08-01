export function loginPage({ withAd = false } = {}) {
    return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DCUF login fixture</title>
    <style>
        *{box-sizing:border-box}body{margin:0;font:12px Arial,sans-serif;background:#fff;color:#222}
        #top{width:868px;margin:0 auto}.dcheader{height:85px;background:#29367c;color:#fff}.dchead{width:868px;height:85px;margin:auto;display:flex;align-items:center}.dcheader h1{margin:0}
        .dc_logo a{display:flex;align-items:center;gap:8px}.dc_logo img:first-child{width:210px;height:30px}.dc_logo img:last-child{width:45px;height:18px}
        #container{min-height:630px;margin-top:37px}.content.login{width:868px;margin:auto}.content.login>article>section{padding-top:80px}.con_box{width:702px;margin:auto;background:transparent}
        .login_inputbox{width:700px;min-height:259px;padding:25px 29px 50px;background:#fff}.login_inputbox>.inner{width:641px}.login_inputbox form{width:585px;margin:auto}.login_inputbox fieldset{margin:0;padding:0;border:0}
        .login_inputbox input.int{display:block;width:100%;height:41px;margin:0 0 5px;padding:8px;border:0;background:#f3f3f3}
        .login_inputbox button{width:100%;height:41px;border:0;background:#3b4890;color:#fff}.login_option{display:flex;justify-content:space-between;padding:8px 0 16px;border-bottom:1px dashed #bbb}.login_find{text-align:center;padding-top:14px}
        .ban_box>.inner{width:250px;height:250px;margin:25px auto}.fixture-login-ad{display:block;width:250px;height:250px;background:#ddd}
        .dcfoot{padding:24px;text-align:center;border-top:1px solid #30428d}
    </style></head><body><div id="top" class="width868 login_wrap"><header class="dcheader bg"><div class="dchead"><h1 class="dc_logo"><a href="https://www.dcinside.com/">
        <img class="logo_img" alt="디시인사이드" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='210' height='30' viewBox='0 0 210 30'%3E%3Ctext x='2' y='23' fill='white' font-family='Arial' font-size='24' font-weight='900' font-style='italic'%3Edcinside.com%3C/text%3E%3C/svg%3E">
        <img class="login_img" alt="로그인" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='45' height='18' viewBox='0 0 45 18'%3E%3Ctext x='1' y='14' fill='white' font-family='Arial' font-size='12' font-weight='800'%3ELOGIN%3C/text%3E%3C/svg%3E">
    </a></h1></div></header>
    <main id="container"><div class="content login"><article><section><div class="con_box login_page kap_codewrap"><div class="login_inputbox"><div class="inner">
    <form name="login" method="post" action="https://sign.dcinside.com/login/member_check">
        <input type="hidden" name="ci_t" value="fixture-ci"><input type="hidden" name="s_url" value="https://gall.dcinside.com/board/view/?id=test&amp;no=1001">
        <input type="hidden" name="s_key" value="fixture-key"><input type="hidden" name="tieup" value=""><input id="ssl" type="hidden" name="ssl" value="Y">
        <fieldset><div><input class="int id bg" id="id" name="user_id" type="text" placeholder="식별 코드" autocomplete="username"><input class="int pw bg" id="pw" name="pw" type="password" placeholder="비밀번호" autocomplete="current-password"></div><button class="btn_blue small btn_wfull" type="submit">로그인</button>
        <div class="login_option idip_checkbox clear"><label for="checksaveid"><input id="checksaveid" name="checksaveid" type="checkbox"> 식별 코드 저장</label><label class="security_connect"><input name="secure_login" type="checkbox" checked> 보안접속</label></div>
        <nav class="login_find"><a href="/find/id">식별 코드 찾기</a> | <a href="/find/pw">비밀번호 찾기</a> | <a href="/join">고정닉 신청</a></nav></fieldset>
    </form></div></div><div class="ban_box"><div class="inner">${withAd ? '<iframe class="fixture-login-ad" title="fixture login advertisement"></iframe>' : ''}</div></div></div></section></article></div></main><footer class="dcfoot"><a href="/company">회사소개</a> · <a href="/privacy">개인정보처리방침</a><p>Copyright dcinside.</p></footer></div>
    <script>document.forms.login.addEventListener('submit',event=>{event.preventDefault();window.__fixtureLoginSubmitCount=(window.__fixtureLoginSubmitCount||0)+1;});</script></body></html>`;
}
