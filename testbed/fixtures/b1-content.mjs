// Native ancestry/class signatures observed on public6778319,2026-10-24.
// Text/media are synthetic. This is not authenticated/live result evidence.
export function mountB1ContentFixture() {
    document.getElementById('dcuf-testbed-controls')?.remove();
    // The generic logic fixture intentionally leaves an adversarial action
    // popup open. This normal-content specimen uses the actual closed state.
    const actionProbe = document.querySelector('.fixture-original-action-popup');
    if (actionProbe) actionProbe.style.display = 'none';
    // Public6778319 computed styles: native .blind is absolute,0x0,hidden;
    // native comment li has no bottom border. Remove the generic fixture's
    // synthetic li rule, not the product card/rule being visually inspected.
    for (const sheet of document.styleSheets) {
        if (!sheet.href?.endsWith('/__testbed/fixture.css')) continue;
        for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
            if (sheet.cssRules[i].selectorText === '.comment_box .cmt_list > li') sheet.deleteRule(i);
        }
    }
    const nativeStyle = document.createElement('style');
    nativeStyle.textContent = '.blind{position:absolute;width:0;height:0;overflow:hidden}';
    document.head.append(nativeStyle);
    const composer = document.querySelector('#focus_cmt .cmt_write_box');
    const actions = composer.querySelector('.cmt_cont_bottm, .cmt_btn_bot');
    let tools = actions.querySelector('.dccon_guidebox');
    if (!tools) { tools = document.createElement('div'); tools.className = 'dccon_guidebox'; actions.prepend(tools); }
    const sheet = document.createElement('style');
    sheet.textContent = '.pop_wrap.type3{position:absolute;left:0;bottom:100%;width:460px;border:1px solid #3b4890;background:#fff}.pop_wrap.type3>.pop_content{background:#fff;padding:12px}.pop_wrap .btn_color{width:26px;height:26px;border:0}.pop_wrap textarea{height:68px}#txtcon_input{box-sizing:border-box;width:344px;height:30px;min-height:30px;max-height:84px;padding:5px 9px;resize:none}.txtcon_txt{color:#333;padding:0;margin:0;max-width:80px;font-size:14px;line-height:1.45;text-align:center}.coment_dccon_txt{display:flex;align-items:center;justify-content:center;width:100px;height:100px}.dccon_list{width:400px;list-style:none;padding:0}.dccon_list .list_li{float:left;width:96px}.dccon_list .img_dccon{width:96px;height:96px}.dccon_list img{width:80px;height:80px}.doublecon_wrap .left{float:left}.doublecon_wrap .right{float:right}.pop_dccon_tit{margin:0}.txt_dccon_box{width:100%}';
    document.head.prepend(sheet);
    // Public6778319 popup.css/common.css, observed 2026-10-24. Geometry alone
    // missed these host rules: fixed preview width, floated title, doubled
    // padding and an important centered submit margin. Keep them adversarial.
    const pickerHostStyle = document.createElement('style');
    pickerHostStyle.textContent = `
      .txt_dccon_box{padding:17px 19px 23px}
      .txt_dccon_box .head{font-size:0}
      .pop_dccon_tit{float:left}
      .txt_dccon_box .head .tiptxt{font-size:12px;margin-left:7px;line-height:20px}
      .txtcon_box{display:flex;justify-content:center;align-items:center;box-sizing:border-box;width:600px;height:132px;margin-top:12px;border:1px solid #ccc;border-radius:5px}
      .coment_dccon_txt{padding:10px 11px;box-sizing:border-box}
      .color_section_box,.color_section{display:flex}
      .color_section_box{justify-content:center;gap:30px;margin-top:20px}
      .color_section{align-items:center}
      .color_section h5{font-size:12px;color:#555;margin-right:10px}
      .txt_section_box{text-align:center;margin-top:16px}
      .btn_blue.small{height:31px;line-height:29px;margin-left:3px;border-width:1px;border-style:solid;border-radius:2px;font-size:12px;font-weight:bold}
      .txt_dccon_box .btn_blue{display:block;margin:20px auto 0!important}
      .txt_dccon_box .latest_section_box + .btn_blue{margin:18px auto 0!important}
    `;
    document.head.prepend(pickerHostStyle);
    const swatches = ['3b4890','b4b4e1','f5e1f0','d2f0e6','ffffff','333333'].map(color=>`<button type="button" class="btn_color cbg_${color}" data-color="${color}" aria-label="배경색 ${color}" aria-pressed="${color==='d2f0e6'}" style="background:#${color}"><span class="blind">배경색</span></button>`).join('');
    tools.insertAdjacentHTML('beforeend', `<button type="button" class="tx_txtcon">글자콘</button><button type="button" class="tx_dccon">디시콘</button>
      <div id="div_txtcon" class="pop_wrap type3" style="display:none;left:0;top:38px"><div class="pop_content txtconlayer"><div class="blind"><h3>글자콘</h3></div><div class="txt_dccon_box">
        <div class="head"><h4 class="pop_dccon_tit">글자디시콘</h4><span class="tiptxt">글자로 디시콘을 만들어 등록해 보세요.</span></div>
        <div class="txtcon_box"><div class="coment_dccon_txt" style="background:#d2f0e6"><p class="txtcon_txt">색과 줄바꿈을 보존하는 미리보기</p></div></div>
        <div class="color_section_box"><div class="color_section"><h5>배경색</h5><div class="color_options">${swatches}</div></div><div class="color_section"><h5>글자색</h5><div class="color_options"><button type="button" class="btn_color" style="background:#ffffff" aria-label="글자색 흰색"><span class="blind">흰색</span></button><button type="button" class="btn_color" style="background:#333333" aria-label="글자색 검정"><span class="blind">검정색</span></button></div></div></div>
        <div class="txt_section_box"><div class="txtareabox"><textarea id="txtcon_input" data-limit="20" placeholder="글자콘 내용 입력 (최대 20자)" style="height:30px"></textarea></div></div><div class="latest_section_box"><ul class="latest"></ul></div><button type="button" class="btn_blue small" id="btn_txtcon_submit">등록</button>
      </div></div></div>
      <div id="div_con" class="pop_wrap type3" style="display:none;left:0;top:38px"><div class="pop_content dcconlayer edit"><div class="blind"><h3>디시콘 리스트</h3></div><div class="dccon_list_wrap clear"><div class="doublecon_wrap daewangcon"><div class="left"><span class="checkbox"><input type="checkbox" id="double_dcon"><em class="checkmark"></em><label for="double_dcon">더블콘</label></span><span class="checkbox" style="display:none"><input type="checkbox" id="big_dcon"><label for="big_dcon">대왕콘</label></span></div><div class="right"><div class="fr clear"><button type="button" class="btn_dccon_hot">인기</button><button type="button" class="btn_dccon_setting">관리</button></div></div></div><div class="inner"><div class="dccon_tab_btnbox fl clear"><button type="button" class="btn_dccon_prev">이전</button><button type="button" class="dccon_btn recent">최근 사용</button><button type="button" class="btn_dccon_next">다음</button></div></div><div class="dccon_list_box dcconlist"><div class="dccon_grid"></div></div><div class="dccon_list_box hot" style="display:none"><p>숨긴 원본 자식</p></div></div></div></div>`);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144"><rect width="144" height="144" rx="20" fill="#d2f0e6"/><circle cx="72" cy="65" r="32" fill="#26736f"/><path d="M56 65h32M72 49v32" stroke="white" stroke-width="6"/></svg>';
    document.querySelector('.dccon_grid').outerHTML = '<ul class="dccon_list clear">'+Array.from({length:8},(_,i)=>`<li class="list_1 list_li"><button type="button" class="img_dccon" aria-label="합성 디시콘 ${i+1}"><img alt="합성 미디어" src="data:image/svg+xml,${encodeURIComponent(svg)}"></button></li>`).join('')+'</ul>';
    tools.querySelectorAll(':scope > button').forEach(button => {
        if (!button.matches('.tx_txtcon,.tx_dccon')) return;
        button.onclick = () => {
            const popup = tools.querySelector(button.matches('.tx_txtcon') ? '#div_txtcon' : '#div_con');
            popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
        };
    });
    tools.querySelectorAll('.color_section:first-child .btn_color').forEach(button=>{button.onclick=()=>{tools.querySelectorAll('.color_section:first-child .btn_color').forEach(n=>n.setAttribute('aria-pressed',String(n===button)));tools.querySelector('.coment_dccon_txt').style.backgroundColor='#'+button.dataset.color;};});
    window.__b1PickerCalls=0;
    tools.querySelector('#btn_txtcon_submit').onclick=()=>window.__b1PickerCalls++;
    window.__b1ContentOriginals=Array.from(document.querySelectorAll('#focus_cmt input,#focus_cmt textarea,#focus_cmt button')).map(node=>({node,parent:node.parentNode,handler:node.onclick}));
    document.querySelectorAll('.comment_dccon img').forEach(img=>{img.src='data:image/svg+xml,'+encodeURIComponent(svg);img.width=100;img.height=100;});
    document.querySelector('.view_comment.image_comment .comment_wrap')?.classList.add('show');
    const content=document.querySelector('[data-dcuf-role="article-content"]');
    if(content){
        const image=document.createElement('div');image.className='img_area no1';
        image.innerHTML='<div class="imgwrap no1"><img alt="이미지댓글 배치 확인용 합성 미디어" width="500" height="180" src="data:image/svg+xml,'+encodeURIComponent(svg.replace('width="144" height="144"','width="500" height="180"'))+'"><button type="button" class="btn_imgcmt">이미지댓글 열기</button></div><div class="img_comment fold getMoreComment" style="display:none"><div class="view_comment image_comment"><div class="comment_wrap show"><div class="comment_box img_comment_box"><ul class="cmt_list"><li><div class="cmt_info"><div class="cmt_nickbox">이미지댓글 작성자</div><div class="cmt_txtbox"><p class="usertxt">이미지마다 연결된 댓글 미리보기</p><img class="comment_dccon" width="100" height="100" alt="합성 이미지댓글" src="data:image/svg+xml,'+encodeURIComponent(svg)+'"></div></div></li></ul></div></div></div></div>';
        image.querySelector('.btn_imgcmt').onclick=()=>{const pane=image.querySelector('.img_comment');pane.style.display=pane.style.display==='none'?'block':'none';};
        content.append(image);
    }
}
