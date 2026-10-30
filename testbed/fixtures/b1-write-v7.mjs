import {writeHeaderHtml} from './b1-form-header.mjs';

// Anonymous native major/minor anatomy acquired2026-10-30. Synthetic values only.
export function writerV7Html(options={}) {
 let html=writeHeaderHtml(options);
 html=html.replace(/<div class="input_box input_infotxt nomem_nick">[\s\S]*?<\/div>/,`<div class="input_box input_infotxt nomem_nick" style="position:relative">
 <div id="tip_nomem_nick" class="tip_box2 tip_nomem_nick"><div class="inner"><p class="txt">갤러리에서 권장하는 비회원 전용 갤닉네임입니다.</p><button type="button" class="sp_img btn_tipclose12" onclick="close_gall_nick_tip(event)"><em class="blind">닫기</em></button></div></div>
 <input id="gall_nick_name" class="put_inquiry" type="text" name="gall_nick_name" maxlength="20" value="합성 갤닉" readonly>
 <input id="name" class="put_inquiry f_blank" type="text" name="name" maxlength="20" value="" style="display:none" placeholder="닉네임">
 <button type="button" id="btn_gall_nick_name_x" class="btn_circledel" onclick="use_gall_nick_name('N')"><span class="blind">삭제</span></button>
 <button type="button" id="btn_gall_nick_name_y" class="btn_gallnickuse" onclick="use_gall_nick_name('Y')" style="display:none">갤닉네임 사용</button></div>`);
 html=html.replace(/<div class="note-btn-group">(?=<button[^>]+data-command="(?:image|video|youtube|external|series|poll|ai-image|insert-zzal|remove-zzal)")/g,'<div class="note-btn-group note-mybutton">');
 html=html.replace('<div class="note-btn-group note-fontname">','<div class="note-btn-group note-break"></div><div class="note-btn-group note-fontname">');
 html=html.replace('<section class="editor_wrap">','<div class="write_infobox"><p>쉬운 비밀번호를 입력하면 타인의 수정, 삭제가 쉽습니다.</p><p>원본 게시물 이용 안내</p></div><section class="editor_wrap">');
 html=html.replace('placeholder="비밀번호"','');
 // Match the acquired stylesheet origins/specificity. Native help has no inline
 // paint/geometry; only its close handler changes inline display.
 html=html.replace('</head>',`<style>
 .tip_box2{position:absolute;background:#98ca33;padding:0!important}
 .tip_box2.tip_nomem_nick{left:-14px;top:-57px}
 .tip_box2.tip_nomem_nick .inner{position:relative;padding:7px 28px 7px 11px!important}
 .tip_box2 .inner .txt{color:white;font-size:12px;line-height:16px}
 .tip_box2.tip_nomem_nick .btn_tipclose12{position:absolute;top:16px;right:10px;margin-top:-6px}
 #write_wrap .btn_circledel{top:9px;right:12px}
 .btn_circledel::before{content:"";width:16px;height:16px;background-image:linear-gradient(#888,#888)}
 #write_wrap .note-break{width:calc(100% + 12px);margin:7px 0 4px -6px;border-top:1px solid #ccc}
 .tip_nomem_nick::after{content:"";border-top:9px solid #98ca33}
 #write_wrap .tip_box2.tip_nomem_nick::after{left:38px}
 </style></head>`);
 return html.replace('</body>',`<script>
 window.__v7NickCalls=[];window.use_gall_nick_name=mode=>{__v7NickCalls.push(mode);const direct=mode==='N';const g=document.querySelector('#gall_nick_name'),n=document.querySelector('#name');g.style.display=direct?'none':'';n.style.display=direct?'':'none';document.querySelector('#btn_gall_nick_name_x').style.display=direct?'none':'';document.querySelector('#btn_gall_nick_name_y').style.display=direct?'':'none';n.parentElement.classList.toggle('nomem_nick',!direct)};
 window.close_gall_nick_tip=()=>{document.querySelector('#tip_nomem_nick').style.display='none';__v7NickCalls.push('close')};
 window.__v7NativeOriginals=[...document.querySelectorAll('form#write input,form[name=modify] input,.note-toolbar button,#tip_nomem_nick,.write_infobox')].map(node=>({node,parent:node.parentNode,onclick:node.getAttribute('onclick'),name:node.getAttribute('name')}));
 </script></body>`);
}
