// Native account ancestry/CSS from B1_ACCOUNT_UI_PREFLIGHT.md.
// Content,media,callbacks and credentials are synthetic;no account request.
export function mountB1AccountPickerFixture() {
    const root=document.querySelector('#div_con'),toolbar=root.querySelector('.doublecon_wrap');
    const style=document.createElement('style');style.id='b1-account-native-css';
    style.textContent=`
      .dcconlayer.edit .daewangcon{height:41px;padding:0 4px 0 12px}
      .dcconlayer.edit .daewangcon .left{float:left;padding:13px 0 10px;font-size:0}
      .dcconlayer.edit .daewangcon .left>.aling{position:relative;display:inline-block}
      .dcconlayer.edit .daewangcon .right .txtbtn{height:40px;margin-right:11px}
      .dcconlayer.edit .daewangcon .right>.fr{font-size:0}
      .dcconlayer.edit .dccon_list .list_li{position:relative}
      .btn_starmark,.btn_starmark.won{display:none;position:absolute;right:0;bottom:0;width:24px;height:24px;font-size:0;color:transparent;background:#ffd56b;opacity:.65}
      .dcconlayer.edit .dccon_list .list_li:hover .btn_starmark,.btn_starmark.on,.btn_starmark.won{display:block}
      .dccon_list_box.setting{padding:22px 20px 27px;font:12px/1.5 sans-serif}
      .table_head{position:relative;width:598px;padding-top:34px;margin-top:9px;border-bottom:1px solid #3b4890}
      .thead1{width:46px}.thead2{width:311px}.thead3{width:110px}.thead4{width:81px}.thead5{width:58px}
      .scrolls{max-height:494px;overflow:hidden;overflow-y:scroll}.dcconlayer .scrolls{max-height:294px}
      .dccon_storage_table{width:100%;height:200px;border-collapse:initial}.dccon_storage_table thead{height:0}.dccon_storage_table thead tr{position:absolute;top:0;left:0}
      .dccon_storage_table th{height:32px;border:1px solid #3b4890;border-width:1px 0}.dccon_storage_table td{padding:2px 4px;border:1px solid #eee;border-width:1px 0 0 1px;text-align:center}
      .storage_img{float:left;width:50px;height:50px}.storage_img img{width:50px;height:50px}.storage_name{float:left;height:50px;line-height:50px}
      .select_box.dccon_use{float:right;display:inline-block;min-width:67px;height:19px;padding-left:5px;border:1px solid #ccc;background:#fff;color:#333;position:relative}
      .dccon_use .option_box{position:absolute;right:0;top:20px;background:#f3f3f3;border:1px solid #ccc;padding:6px;min-width:80px;z-index:1}
      .dccon_infobox{padding:15px 15px 11px;margin-top:17px;background:#f3f3f3;color:#555}
      .btn_grey.small{border:1px solid #27313f;border-radius:0}
      .setting>.btn_box{text-align:center;margin-top:18px}.setting>.btn_box button{width:85px;height:31px}
      .icon_moving{display:inline-block;width:15px;height:10px;background:#8391ab}.dccon_storage_table caption{font-size:0;line-height:0;height:0}
      .cmt_mdf_del{position:relative;grid-column:1/-1;text-align:right}.cmt_delpw_box{position:absolute;right:0;top:0;width:218px;height:31px;background:#fff}
      .cmt_delpw_box .cmt_delpw{float:left;width:139px;height:31px;padding:0 4px;box-sizing:border-box;border:1px solid #ddd;background:white;color:black}
      .cmt_delpw_box .btn_ok{float:left;width:49px;height:31px;background:#3b4890;color:white}
      .cmt_delpw_box .btn_cmtpw_close{float:left;width:30px;height:31px;background:#29367c;color:#999;font-size:0}.btn_cmtpw_close::before{content:'×';font-size:20px}
    `;document.head.prepend(style);
    toolbar.querySelector('.left').insertAdjacentHTML('beforeend','<div class="aling"><span class="checkbox round blue"><input type="checkbox" id="bkmark" class="round_check"><label for="bkmark" class="round_label"><em class="inr">즐겨찾기</em></label></span><button type="button" class="sp_img btn_bkmark" style="display:none">즐겨찾기 폴더</button><div id="favoriteFolderLayer" class="pop_wrap type3" style="display:none;top:17px;left:auto;margin-left:93px"><div class="pop_content pop_bkmark_edit folder"><h3>즐겨찾기 폴더</h3><button type="button" class="btn_foldadd">폴더 추가</button><button type="button" class="btn_apply">저장</button></div><button type="button" class="poply_whiteclose"><span class="blind">레이어 닫기</span></button></div></div>');
    toolbar.querySelector('.right').insertAdjacentHTML('afterbegin','<button id="btn__daewangcon" type="button" class="txtbtn font_grey">대왕콘</button>');
    for(const li of root.querySelectorAll('.dccon_list .list_li'))li.insertAdjacentHTML('beforeend','<button type="button" class="btn_starmark">즐겨찾기</button>');
    const media=root.querySelector('.dccon_list img').src;
    const setting=document.createElement('div');setting.className='dccon_list_box setting';setting.style.display='none';
    const rows=Array.from({length:8},(_,i)=>`<tr><td><input type="checkbox" title="사용여부 체크" class="package_check" ${i===0?'checked':''}></td><td><div class="storage_img"><img alt="합성 보관함" src="${media}"></div><p class="storage_name">합성 디시콘 ${i+1}</p></td><td>제작자 ${i+1}</td><td>사용</td><td class="handle" style="cursor:pointer"><span class="blind">순서 변경</span><em class="sp_img icon_moving"></em></td></tr>`).join('');
    setting.innerHTML=`<div class="clear setting_div"><h4 class="pop_dccon_tit">디시콘 보관함</h4><div class="select_box dccon_use ul_selectric"><div class="select_area">사용(8)<span class="blind">디시콘 사용 유무</span><em class="sp_img icon_option_more"></em></div><ul class="option_box" style="display:none;left:-1px;top:19px"><li data-value="use">사용(8)</li><li data-value="notuse">미사용(0)</li></ul><input type="hidden" name="list" value="use"></div></div>
      <div class="table_head"><div id="setting_use" class="scrolls setting_cl"><table class="dccon_storage_table"><caption>보관된 디시콘 리스트</caption><colgroup><col style="width:8%"><col><col style="width:19%"><col style="width:10%"><col style="width:10%"></colgroup><thead><tr><th class="thead1">사용</th><th class="thead2">디시콘명</th><th class="thead3">제작자</th><th class="thead5">구분</th><th class="thead6">순서</th></tr></thead><tbody class="draggable">${rows}</tbody></table></div>
      <div id="setting_notuse" class="setting_cl" style="display:none"><table class="dccon_storage_table"><caption>보관된 디시콘 리스트</caption><thead><tr><th class="thead1">사용</th><th class="thead2">디시콘명</th><th class="thead3">제작자</th><th class="thead4">금액</th><th class="thead5">구분</th><th class="thead6">사용기간</th></tr></thead><tbody><tr><td colspan="6">리스트가 없습니다.</td></tr></tbody></table></div></div>
      <div class="dccon_infobox" id="use_info"><p>드래그 앤 드롭으로 디시콘 선택 목록의 노출 순서를 변경할 수 있습니다.</p><p>해제한 디시콘은 선택 목록에서 사용 해제됩니다.</p></div><div class="dccon_infobox" id="notuse_info" style="display:none"><p>사용할 디시콘을 체크해 주세요.</p></div><div class="btn_box"><button type="button" class="btn_grey small close">닫기</button><button type="button" class="btn_blue small submit">저장</button></div>`;
    root.querySelector('.dccon_list_wrap').append(setting);
    const calls=[];root.querySelector('.btn_dccon_setting').onclick=()=>{root.querySelector('.dcconlist').style.display='none';root.querySelector('.hot').style.display='none';setting.style.display='';root.querySelector('.btn_dccon_setting').classList.add('on');calls.push('management-open')};
    setting.querySelector('.close').onclick=()=>{setting.style.display='none';root.querySelector('.dcconlist').style.display='';root.querySelector('.btn_dccon_setting').classList.remove('on');calls.push('management-close')};
    setting.querySelector('.submit').onclick=()=>calls.push('synthetic-save');setting.querySelector('.select_area').onclick=()=>{const n=setting.querySelector('.option_box');n.style.display=n.style.display==='none'?'':'none';calls.push('filter-open')};
    setting.querySelectorAll('.option_box>li').forEach(n=>n.onclick=()=>{const value=n.dataset.value;setting.querySelector('.option_box').style.display='none';setting.querySelector('input[name="list"]').value=value;setting.querySelectorAll('.setting_cl').forEach(n=>n.style.display=n.id==='setting_'+value?'':'none');setting.querySelector('#use_info').style.display=value==='use'?'':'none';setting.querySelector('#notuse_info').style.display=value==='notuse'?'':'none';calls.push('filter-'+value)});
    root.querySelector('#bkmark').onclick=()=>calls.push('synthetic-favorite-mode');root.querySelectorAll('.btn_starmark').forEach(n=>n.onclick=()=>{n.classList.toggle('on');calls.push('synthetic-star')});
    const anchor=document.createElement('div');anchor.className='cmt_mdf_del';anchor.id='fixture-password-anchor';anchor.innerHTML='<button type="button" class="btn_cmt_delete">비회원 비밀번호창</button>';[...document.querySelectorAll('.comment_box .cmt_info')].find(n=>n.getClientRects().length).append(anchor);
    const passwordCycles=[];
    const openPassword=()=>{if(anchor.querySelector('.cmt_delpw_box'))return;anchor.insertAdjacentHTML('beforeend','<div class="cmt_delpw_box" id="cmt_delpw_box"><input type="password" id="cmt_password" class="cmt_delpw" placeholder="비밀번호" autocomplete="off"><button type="button" class="btn_ok">확인</button><button type="button" class="btn_cmtpw_close"><span class="blind">닫기</span></button></div>');const box=anchor.querySelector('.cmt_delpw_box');box.querySelector('.btn_ok').onclick=()=>calls.push('synthetic-password-confirm');box.querySelector('.btn_cmtpw_close').onclick=()=>{box.remove();calls.push('password-close')};passwordCycles.push([...box.children].map(node=>({node,parent:node.parentNode,handler:node.onclick})));box.querySelector('input').focus();calls.push('password-open')};anchor.querySelector('button').onclick=openPassword;
    window.__b1AccountFixture={calls,passwordCycles,originals:[...root.querySelectorAll('button,input,table,tbody,select,.select_area,.option_box>li,.handle'),anchor,anchor.firstElementChild].map(node=>({node,parent:node.parentNode,handler:node.onclick})),setting};
}
