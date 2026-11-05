// Actual2026-11-02 roots/callback shapes: B1_CONDITIONAL_UI_TRIAGE.md.
// Detail topology also matches public dccon_detail-tmpl acquired2026-10-26.
// All data/media/actions here are synthetic;no real request/permission/delete.
export function mountConditionalChildrenFixture() {
    const picker=document.querySelector('#div_con'),media=picker.querySelector('img').src;
    const css=document.createElement('style');css.id='conditional-native-css';
    css.textContent=`
      /* Actual popup.css defaults undo the base fixture's invented460px/
         bottom:100% scaffold;keep these before the existing visual owner. */
      .pop_wrap.type3{width:auto;bottom:auto}.pop_content{overflow:hidden;position:relative}
      .pop_wrap.type3 .pop_head{overflow:hidden;height:36px;padding:0 20px 0 13px;line-height:35px;border-bottom:1px solid #ccc;font-size:14px;color:#29367c}
      .pop_wrap.type3 .pop_head h3{font-size:14px}
      #package_detail{bottom:auto}.dccon_popinfo{width:609px}.dccon_popinfo.edit{width:713px}
      .viewtxt_top{font-size:14px}.viewtxt_top>h4{display:inline-block}
      .viewtxt_top>.btn_blue.small,.viewtxt_top>.btn_grey.small{float:right;width:80px;height:27px;margin-top:-6px;line-height:25px;font-weight:normal;overflow:hidden}
      .info_viewbox{border-bottom:1px solid #ccc}.viewtxt_cont{margin-top:6px;color:#333;line-height:19px}
      .info_viewimg{float:left;width:140px;height:140px;padding:15px}.info_viewtxt{float:right;width:408px;height:138px;padding:17px 15px 15px 16px;background:#f3f3f3}
      .dccon_popinfo.edit .info_viewtxt{width:512px}.info_viewtxt .inner_txt{margin-bottom:4px;font-size:12px}
      .viewtxt_cont .inner_info{overflow:hidden;font-size:11px;color:#999}.viewtxt_cont .tbox{padding:0 3px 0 2px;border:1px solid #ccc;border-radius:2px;background:white;color:#555;font-size:11px}
      .dccon_list_box.popinfo{height:369px;overflow-y:scroll}.popinfo .dccon_list li{margin:15px 0 0 15px}
      .dccon_popinfo.edit .viewtxt_cont .seller_name{font-size:0}.dccon_popinfo.edit .viewtxt_cont .seller_name a{color:#3b4890;text-decoration:underline;font-size:11px}
      .cmt_txtbox #package_detail{margin:-8px 0 0 167px}
      .poply_bgblueclose,.poply_greyclose{position:absolute;right:0;top:0;width:20px;height:20px;font-size:0}
      .poply_greyclose{top:18px;right:18px}.icon_grey_x{display:inline-block;width:20px;height:20px;background:#aaa;font-size:13px}
      .ly_daewang{width:358px;box-sizing:border-box}.ly_daewang .inner{height:auto;text-align:center;padding:25px;font-size:13px}
      .ly_daewang .inner .tit{font-size:18px;line-height:25px;font-weight:bold;color:#000;margin-bottom:9px}
      .ly_daewang .txt{line-height:20px}.ly_daewang .txt.align{text-align:left}.ly_daewang .situation{margin-top:8px}
      .ly_daewang .font_grey.situation{font-size:12px;margin-top:15px}.ly_daewang~.poply_greyclose{top:13px;right:13px}
    `;document.head.insertBefore(css,document.getElementById('dcuf-comment-presenter'));
    const calls=[],originals=[],cycles=[];
    const remember=n=>originals.push(...[n,...n.querySelectorAll('*')].map(node=>({node,parent:node.parentNode,handler:node.onclick})));
    picker.querySelector('.doublecon_wrap').insertAdjacentHTML('beforeend',`<div id="daewangcon_layer" class="pop_wrap type3" style="display:none;right:-1px;top:33px"><div class="pop_content ly_daewang"><div class="inner bigcon-enabled" style="display:none"><div class="tit"><h3>대왕디시콘 사용중</h3></div><p class="txt"><em class="font_red expire_date">2099.01.01 12:00</em>까지 사용 가능</p><p class="font_grey situation"><b>안내</b> 글 2개, 댓글 4개 작성 시 1일간 사용</p></div><div class="inner bigcon-disabled" style="display:none"><div class="tit"><h3>대왕디시콘</h3></div><p class="txt align">식별 코드 기준으로 당일 글 2개, 댓글 4개 작성 시 대왕디시콘을 1일간 사용할 수 있습니다.</p><p class="font_red situation">현재 글 <span class="written_article">0</span>개, 댓글 <span class="written_comment">0</span>개 작성 중입니다.</p></div></div><button type="button" class="poply_greyclose"><em class="sp_img icon_grey_x">닫기</em></button></div>`);
    const info=picker.querySelector('#daewangcon_layer');let infoState='enabled';
    picker.querySelector('#btn__daewangcon').onclick=()=>{info.querySelectorAll('.inner').forEach(n=>n.style.display=n.classList.contains('bigcon-'+infoState)?'':'none');info.style.display='';calls.push('info-open-'+infoState)};
    info.querySelector('.poply_greyclose').onclick=()=>{info.style.display='none';calls.push('info-close')};remember(info);
    const anchor=document.createElement('div');anchor.className='cmt_txtbox';anchor.style.position='relative';
    anchor.innerHTML='<div class="coment_dccon_info"><button type="button" class="div_package" reqpath="/dccon">합성 디시콘 정보</button></div>';
    // Native text/media belongs to the reading body,not the author/action row.
    document.querySelector('#focus_cmt .cmt_info').insertAdjacentElement('afterend',anchor);
    anchor.querySelector('.div_package').onclick=()=>{
        if(anchor.querySelector('#package_detail'))anchor.querySelector('#package_detail').remove();
        anchor.insertAdjacentHTML('beforeend',`<div id="package_detail" class="pop_wrap type3" style="left:0;top:38px"><div class="pop_content dccon_popinfo edit"><div class="pop_head clear"><h3>디시콘 정보</h3></div><div class="info_viewbox clear"><div class="info_viewimg"><img src="${media}" alt="합성 미디어" width="140" height="140"></div><div class="info_viewtxt"><div class="viewtxt_top clear"><h4 class="font_blue con_title">긴 이름을 가진 합성 디시콘 패키지</h4><button type="button" class="btn_blue small btn_buy" reqpath="/dccon">사용</button><button type="button" class="btn_grey small btn_my_dccon_edit" style="display:none">수정</button></div><div class="viewtxt_cont"><p class="inner_txt">원래 설명과 줄바꿈·긴 단어 very-long-native-description-without-removing-information 를 유지합니다.</p><div class="inner_info"><span class="tbox">제작</span> <span class="seller_name"><a href="#synthetic-author">제작자</a></span> <span class="makeday">2026.11.02</span></div><div class="inner_info"><span class="tbox">태그</span> <span class="seller_name"><a href="#synthetic-tag">긴태그이름과설명을생략하지않는원래링크</a></span></div></div></div></div><div class="dccon_list_wrap clear"><div class="dccon_list_box popinfo"><ul class="dccon_list clear">${Array.from({length:42},(_,i)=>`<li><span class="img_dccon"><img src="${media}" alt="합성 미디어${i}" title="합성 미디어${i}"></span></li>`).join('')}</ul></div></div></div><button type="button" class="poply_bgblueclose package_close"><span class="blind">디시콘 정보 레이어 닫기</span><em class="sp_img icon_bgblueclose"></em></button><div class="pop_wrap type3" id="package_buy" style="display:none;left:136px;top:197px"><div class="pop_content dccon_buy"><input type="password" id="password" autocomplete="new-password"><button class="btn_blue small payments" type="button">결제</button></div></div></div>`);
        const detail=anchor.querySelector('#package_detail');detail.querySelector('.package_close').onclick=()=>{detail.style.display='none';calls.push('detail-close')};detail.querySelector('.btn_buy').onclick=()=>calls.push('synthetic-use');detail.querySelector('.btn_my_dccon_edit').onclick=()=>calls.push('synthetic-edit');remember(detail);calls.push('detail-open');
    };
    const imageAnchor=document.createElement('div');imageAnchor.className='cmt_mdf_del';imageAnchor.id='fixture-image-password-anchor';imageAnchor.innerHTML='<button type="button" class="btn_img_cmt_delete">합성 이미지 비밀번호창</button>';
    document.querySelector('.img_comment .cmt_info').append(imageAnchor);
    imageAnchor.querySelector('button').onclick=()=>{if(imageAnchor.querySelector('#img_cmt_delpw_box'))return;imageAnchor.insertAdjacentHTML('beforeend','<div id="img_cmt_delpw_box" class="cmt_delpw_box" data-type="img_cmt" re_no="synthetic" c_mode="del" style="margin:-16px 0 0 -242px"><input type="password" title="비밀번호" placeholder="비밀번호" id="img_cmt_password" class="cmt_delpw"><button type="button" class="btn_ok image_comment img_cmt_pwd_ok">확인</button><button type="button" class="btn_cmtpw_close image_comment btn_img_cmtpw_close"><span class="blind">닫기</span><em class="sp_img icon_cmtpw_close"></em></button></div>');const box=imageAnchor.querySelector('#img_cmt_delpw_box');box.querySelector('.btn_ok').onclick=()=>calls.push('synthetic-image-confirm');box.querySelector('.btn_cmtpw_close').onclick=()=>{box.remove();calls.push('image-password-close')};cycles.push([...box.children].map(node=>({node,parent:node.parentNode,handler:node.onclick})));calls.push('image-password-open')};
    window.__conditionalFixture={calls,originals,cycles,setInfoState:state=>infoState=state,anchor};
}
