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
    sheet.textContent = '.pop_wrap.type3{position:absolute;left:0;bottom:100%;width:460px;border:1px solid #3b4890;background:#fff}.pop_wrap.type3>.pop_content{background:#fff;padding:12px}.pop_wrap .btn_color{width:26px;height:26px;border:0}.pop_wrap textarea{height:68px}.txtcon_txt{background:#d2f0e6;color:#333;padding:14px}.dccon_list{width:400px;list-style:none;padding:0}.dccon_list .list_li{float:left;width:96px}.dccon_list .img_dccon{width:96px;height:96px}.dccon_list img{width:80px;height:80px}.pop_wrap .poply_greyclose{position:absolute;right:10px;top:10px}';
    document.head.prepend(sheet);
    tools.insertAdjacentHTML('beforeend', '<button type="button" class="tx_txtcon">글자콘</button><button type="button" class="tx_dccon">디시콘</button><div id="div_txtcon" class="pop_wrap type3" style="display:none"><div class="pop_content txtconlayer"><strong class="tit">글자콘</strong><div class="txtcon_box"><div class="txtcon_txt">색과 줄바꿈을 보존하는 미리보기</div><div class="color_box"><button type="button" class="btn_color" style="background:#d2f0e6" aria-label="파스텔 민트"></button></div><textarea id="txtcon_input" placeholder="글자콘 입력"></textarea><button type="button" class="btn_blue small" id="btn_txtcon_submit">등록</button></div></div></div><div id="div_con" class="pop_wrap type3" style="display:none"><div class="pop_content dcconlayer edit"><strong class="tit">디시콘</strong><button type="button" class="poply_greyclose">닫기</button><label><input type="checkbox" id="double_dcon">두 개 사용</label><div class="dccon_grid"></div></div></div>');
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144"><rect width="144" height="144" rx="20" fill="#d2f0e6"/><circle cx="72" cy="65" r="32" fill="#26736f"/><path d="M56 65h32M72 49v32" stroke="white" stroke-width="6"/></svg>';
    document.querySelector('.dccon_grid').outerHTML = '<ul class="dccon_list clear">'+Array.from({length:8},(_,i)=>`<li class="list_1 list_li"><button type="button" class="img_dccon" aria-label="합성 디시콘 ${i+1}"><img alt="합성 미디어" src="data:image/svg+xml,${encodeURIComponent(svg)}"></button></li>`).join('')+'</ul>';
    tools.querySelectorAll(':scope > button').forEach(button => {
        if (!button.matches('.tx_txtcon,.tx_dccon')) return;
        button.onclick = () => {
            const popup = tools.querySelector(button.matches('.tx_txtcon') ? '#div_txtcon' : '#div_con');
            popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
        };
    });
    tools.querySelector('.poply_greyclose').onclick=()=>{tools.querySelector('#div_con').style.display='none';};
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
