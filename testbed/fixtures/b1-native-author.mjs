// Derived native child anatomy acquired2026-10-29. Synthetic labels; no live identifiers or callbacks.
export const nativeMemoMarkup="<div id=\"user_memo_config\" class=\"pop_wrap type3\">\n    <div class=\"pop_content memo_sel\">\n        <div class=\"pop_head\">\n            <h3 class=\"user_icon\"><span class=\"user_name\">합성 이용자</span> 메모</h3>\n            <button class=\"sp_img icon_qmark_aaa\" type=\"button\"><em class=\"blind\">설명</em></button>\n            <div class=\"pop_tipbox\">\n                <div class=\"inner\">\n                    <p>현재 갤러리 설정이 전체 갤러리 설정보다 우선 적용됩니다.</p>\n                    <p>메모는 닉네임 옆에 표기되며, 메모를 등록한 기기에서만 확인할 수 있습니다.</p>\n\n                </div>\n                <button class=\"btn_tipclose\" type=\"button\"><span class=\"blind\">닫기</span><em class=\"sp_img icon_tipclose\"></em></button>\n            </div>\n        </div>\n        \n        <div id=\"user_memo_setting\" class=\"inner\">\n            \n            <div id=\"um_gall_cont\" class=\"set_cont\">\n                \n                <div class=\"inr\">\n                    <h4 class=\"cont_tit\">현재 갤러리</h4>\n                    <button id=\"gall_color\" class=\"sel_color\" type=\"button\"><span class=\"blind\">메모 색상</span></button>\n                </div>\n                                                    \n                <input id=\"gall_memo\" class=\"intxt\" type=\"text\" placeholder=\"메모를 입력해 주세요.\">\n                <ul id=\"um_gall_history\" class=\"list\"></ul>\n            </div>\n            \n\n            <div id=\"um_all_cont\" class=\"set_cont\">\n                \n                <div class=\"inr\">\n                    <h4 class=\"cont_tit\">전체 갤러리</h4>\n                    <button id=\"all_color\" class=\"sel_color\" type=\"button\"><span class=\"blind\">메모 색상</span></button>\n                </div>\n                \n                <input id=\"all_memo\" class=\"intxt\" type=\"text\" placeholder=\"메모를 입력해 주세요.\">\n                <ul id=\"um_all_history\" class=\"list\"></ul>\n            </div>\n            \n            \n\n            <div class=\"set_cont noline\">\n            \n            <div id=\"chk_color_toggle\" class=\"box hide\">\n                \n                <div class=\"boxt\">\n                <h4 class=\"cont_tit\">색상 한 번에 변경</h4>\n                <button class=\"btn_toggle15\" type=\"button\">\n                    <span class=\"blind\">펼침,접힘</span><em class=\"sp_img icon_toggle15\"></em>\n                </button>   \n                </div>\n                \n\n                \n                <div class=\"boxc\">\n                <p>동일한 메모를 모두 같은 색상으로 변경합니다. </p>\n\n                <div class=\"bundle\">   \n                    <span class=\"checkbox\">\n                        <input id=\"chk_gall_color\" type=\"checkbox\">\n                        <em class=\"checkmark\"></em>\n                        <label>현재 갤러리</label>\n                    </span> \n                    <span class=\"checkbox\">\n                        <input id=\"chk_all_color\" type=\"checkbox\">\n                        <em class=\"checkmark\"></em>\n                        <label>전체 갤러리</label>\n                    </span>                                      \n                </div>                                    \n                </div>  \n                \n\n                                                                                    \n            </div>\n               \n            \n            </div>                    \n            \n        </div>\n        \n        \n        <div class=\"btn_box\">\n            <button class=\"btn_grey small\" type=\"button\">닫기</button>\n            <button class=\"btn_blue small\" type=\"button\">등록</button>\n        </div>\n    </div>\n    \n    <div id=\"um_picker_lay\" class=\"pop_wrap type3\">\n\t\t\n\t\t<div class=\"pop_content txtmark_colorset\">\n\t\t\t<div class=\"pop_head\"><h3>색상 설정</h3></div>\n\t\t\t\n\t\t\t\n\t\t\t<div class=\"inner\">\n\t\t\t\t<div class=\"sel_color box\"></div>\n\t\t\t\t<div id=\"um_picker\"></div>\n\t\t\t</div>\n\t\t\t\n\t\t\t<div class=\"btn_box\">\n\t\t\t\t<button class=\"btn_cancle\" type=\"button\">취소</button>\n\t\t\t\t<button id=\"um_color_apply\" class=\"btn_apply color-picker_color_apply\" type=\"button\">확인</button>\n\t\t\t</div>\n\t\t</div>\n\t\t\n\t\t<button class=\"poply_bgblueclose\" type=\"button\"><span class=\"blind\">레이어 닫기</span><em class=\"sp_img icon_bgblueclose\"></em></button>\n\t</div>\n    <button class=\"poply_bgblueclose\" type=\"button\"><span class=\"blind\">레이어 닫기</span><em class=\"sp_img icon_bgblueclose\"></em></button>\n</div>\n";
export function mountNativeAuthorFixture(memoMarkup) {
    document.getElementById('dcuf-testbed-controls')?.remove();
    const nativeStyle=document.createElement('style');
    nativeStyle.textContent=`
      .blind{position:absolute;width:0;height:0;overflow:hidden;clip:rect(0,0,0,0)}
      .user_data.add{position:relative;display:inline-block;top:-1px;left:5px}
      .user_data .user_data_list{position:absolute;top:-16px;left:0;width:142px;list-style:none;padding:0;margin:0;border:1px solid #ccc;background:#fff;box-sizing:border-box;color:#333;font:12px/1.5 sans-serif;z-index:10}
      /* Public native cascade observed by CDP: this beat the two-class root. */
      .user_data.add .user_data_list{width:140px}
      .user_data_list li{height:25px;margin:0;border-bottom:1px solid #ccc;background:#eee;padding:0}
      .user_data_list .nick{background:white;padding:4px 10px}
      .user_data_list a{display:block;padding:4px 10px;color:#333;text-decoration:none;line-height:19px}
      .user_data_list .loaf{display:flex;justify-content:space-between}
      .user_data_list .bg_jingrey{background:#999}.user_data_list .bg_jingrey a{color:#fff}
      .pop_wrap.type3{position:absolute;width:478px;border:1px solid #3b4890;background:white;z-index:20;color:#333;font:12px/1.5 sans-serif}
      .pop_wrap.type3>.pop_content{background:white;width:478px;box-sizing:border-box}
      .pop_wrap.type3 .pop_head{height:36px;padding:0 14px;border-bottom:1px solid #ccc;display:flex;align-items:center;gap:8px}
      .pop_head h3{font-size:14px;color:#3b4890;margin:0}
      .pop_head .icon_qmark_aaa{margin-left:auto;width:16px;height:16px;background:#aaa;border:0}
      .pop_tipbox{display:none;position:absolute;top:38px;left:10px;width:320px;background:#fff;border:1px solid #999;padding:12px;z-index:3}
      #user_memo_setting{padding:16px 20px}.set_cont{padding:0 0 20px;margin-bottom:20px;border-bottom:1px dashed #aaa}.set_cont.noline{padding:0;margin:0;border:0}
      .set_cont .inr{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}.cont_tit{margin:0;font-size:12px;font-weight:400}
      #user_memo_setting .intxt{box-sizing:border-box;width:440px;height:28px;border:1px solid #ccc;background:white;color:#333;padding:4px 6px}
      .sel_color{width:40px;height:17px;background:#999;border:0}.set_cont .list{padding:0;margin:0}.box.hide .boxc{display:none}
      .pop_wrap .btn_box{padding:12px;text-align:center;border-top:1px solid #ccc}.btn_grey,.btn_cancle{background:#666;color:white}.btn_blue,.btn_apply{background:#3b4890;color:white}.pop_wrap .btn_box button{height:31px;width:85px;border:1px solid #555;margin:0 2px}
      .poply_bgblueclose{position:absolute;right:0;top:0;width:20px;height:20px;background:#3b4890;border:0;color:white}.poply_bgblueclose::after{content:'×'}
      #um_picker_lay{display:none;position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:378px}
      #um_picker_lay>.pop_content{width:378px}.txtmark_colorset>.inner{padding:24px}.fixture-native-wheel{width:288px;height:288px;border-radius:50%;margin:16px auto;background:radial-gradient(circle,#8880,#8888),conic-gradient(red,yellow,lime,cyan,blue,magenta,red)}
    `;
    document.head.prepend(nativeStyle);
    const row=[...document.querySelectorAll('.custom-post-item')].find(n=>getComputedStyle(n).display!=='none'&&n.querySelector('.author'));
    const writer=document.createElement('span');writer.className='gall_writer ub-writer';writer.dataset.uid='';writer.dataset.ip='192.0';writer.dataset.nick='합성 이용자';
    writer.innerHTML='<span class="addbox"><span class="nickname"><em>합성 이용자</em></span><span class="ip">(합성 IP)</span></span>';
    row.querySelector('.author').replaceChildren(writer);
    // Retained legacy layers can rely on CSS display:none,without inline state.
    const legacy=document.createElement('div');legacy.id='user_data_lyr';
    legacy.innerHTML='<ul class="user_data_list"><li><a href="#legacy">기존 닫힌 메뉴</a></li></ul>';
    // The DCUF legacy hide rule is view-only; list fixtures have no such layer.
    if(location.pathname.includes('/view')) writer.append(legacy);
    const counts={menu:0,memo:0,color:0,close:0,search:0,forwarded:0};
    document.querySelectorAll('.gall_list .gall_writer').forEach(n=>n.addEventListener('click',()=>counts.forwarded++));
    const closeMemo=()=>{document.getElementById('user_memo_config')?.remove();counts.close++;};
    const openMemo=()=>{
        document.getElementById('user_memo_config')?.remove();
        writer.querySelector('.user_data').insertAdjacentHTML('beforeend',memoMarkup);
        const memo=document.getElementById('user_memo_config');memo.style.cssText='position:absolute;left:-350px;top:20px';counts.memo++;
        const picker=memo.querySelector('#um_picker_lay');picker.style.display='none';
        picker.querySelector('#um_picker').innerHTML='<div class="fixture-native-wheel" role="img" aria-label="합성 색상판"></div><input type="range" aria-label="명도">';
        memo.querySelectorAll('.sel_color[type="button"]').forEach(n=>n.onclick=()=>{picker.style.display='block';counts.color++;});
        memo.querySelector('.icon_qmark_aaa').onclick=()=>{memo.querySelector('.pop_tipbox').style.display='block';};
        memo.querySelector('.btn_tipclose').onclick=()=>{memo.querySelector('.pop_tipbox').style.display='none';};
        memo.querySelector('.btn_grey').onclick=closeMemo;
        memo.querySelector(':scope > .poply_bgblueclose').onclick=closeMemo;
        picker.querySelectorAll('.btn_cancle,.poply_bgblueclose').forEach(n=>n.onclick=()=>{picker.style.display='none';});
        memo.querySelector('.btn_toggle15').onclick=()=>memo.querySelector('#chk_color_toggle').classList.toggle('hide');
        memo.querySelector('.btn_blue').onclick=()=>{throw new Error('Fixture submission must never run');};
    };
    const openMenu=()=>{
        const existing=writer.querySelector('.user_data');if(existing){existing.remove();return;}
        const anchor=document.createElement('div');anchor.className='user_data add';
        anchor.innerHTML='<ul class="user_data_list"><li class="nick"><span class="cut">합성 이용자</span><span class="font_grey">(합성 IP)</span></li><li class="bg_grey"><a href="#search">작성글 검색</a></li><li class="bg_grey"><a href="#memo">이용자 메모</a></li><li class="bg_jingrey"><a href="#block-nick">차단(닉네임)</a></li><li class="bg_jingrey"><a href="#block-ip">차단(IP)</a></li></ul>';
        writer.querySelector('.addbox').append(anchor);counts.menu++;
        anchor.querySelector('[href="#memo"]').onclick=e=>{e.preventDefault();openMemo();};
        anchor.querySelector('[href="#search"]').onclick=e=>{e.preventDefault();counts.search++;};
    };
    writer.querySelector('.nickname em').onclick=openMenu;
    document.addEventListener('mousedown',e=>{if(!e.target.closest('.gall_writer,#user_memo_config,#um_picker_lay'))writer.querySelector('.user_data')?.remove();});
    window.__authorFixture={counts,writer,row,openMenu,openMemo,nodes:[],remember(){this.nodes=[...document.querySelectorAll('#user_memo_config input,#user_memo_config button')].map(node=>({node,parent:node.parentNode,onclick:node.onclick}));},preserved(){return this.nodes.every(x=>x.node.isConnected&&x.node.parentNode===x.parent&&x.node.onclick===x.onclick);}};
}
