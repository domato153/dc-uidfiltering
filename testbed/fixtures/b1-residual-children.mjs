// Native template/CSS provenance is in b1-residual-native-data.mjs.
// All names,media,data and callbacks below are synthetic;no requests or saves.
export function mountFolderChildren({html,css}) {
 const header=document.querySelector('#focus_cmt .comment_count');
 header.insertAdjacentHTML('beforeend','<div class="comment_sort"><span class="radiobox imgcheck"><input type="radio" id="residual-sort-d" name="residual-sort" value="D" checked><em class="checkmark"></em><label for="residual-sort-d">등록순</label></span><span class="radiobox imgcheck"><input type="radio" id="residual-sort-n" name="residual-sort" value="N"><em class="checkmark"></em><label for="residual-sort-n">최신순</label></span></div><div class="fr"><a class="cmtup" href="#focus_cmt">댓글 등록</a><button type="button" class="btn_cmt_close"><span>댓글닫기</span></button></div>');
 header.querySelector('.num_box').append(header.querySelector('.comment_sort'));
 const headerStyle=document.createElement('style');headerStyle.textContent='.comment_wrap .cmtup{border-radius:2px;padding:1px 5px;border:1px #3b4890 solid;color:#3b4890;background:#fff}.radiobox.imgcheck input:checked~label{font-weight:bold;color:#3b4890}.comment_wrap .contgo,.btn_cmt_close span{color:#333}';document.head.prepend(headerStyle);
 // Exact common.css radio geometry:the native transparent input covers its label.
 headerStyle.textContent+='.radiobox{position:relative;display:inline-block;line-height:31px;padding-left:23px}.radiobox input[type="radio"]{position:absolute;left:0;top:8px;margin:0;opacity:0;z-index:2;cursor:pointer}.radiobox input+.checkmark{position:absolute;top:8px;left:0;display:block;width:14px;height:14px;border-radius:50%}.radiobox.imgcheck{padding-left:17px;vertical-align:0;line-height:15px}.radiobox.imgcheck input[type="radio"]{top:0;width:100%;height:100%}.radiobox.imgcheck input+.checkmark{top:0;width:15px;height:15px;border-radius:0}.radiobox.imgcheck input~label{font-size:13px;margin-left:0;cursor:pointer}';
 window.__residualHeaderOriginals=[...header.querySelectorAll('button,a,input,label')].map(node=>({node,parent:node.parentNode,handler:node.onclick,type:node.getAttribute('type'),name:node.getAttribute('name')}));
 const root=document.querySelector('#div_con'),toolbar=root.querySelector('.doublecon_wrap');toolbar.classList.add('daewangcon');
 const style=document.createElement('style');style.id='residual-native-css';style.textContent=css+'\n.pop_wrap.type3{bottom:auto;width:auto}.pop_content{position:relative;overflow:hidden}';document.head.insertBefore(style,document.getElementById('dcuf-comment-presenter'));
 root.querySelector('#favoriteFolderLayer')?.remove();
 const add=(parent,id)=>{parent.insertAdjacentHTML('beforeend',html[id]);return parent.querySelector('#'+id)};
 add(toolbar.querySelector('.aling'),'favoriteFolderLayer');add(toolbar,'favoriteFolderAddLayer');add(toolbar,'favoriteFolderSelectLayer');
 const area=document.createElement('div');area.className='bkmark_edit';area.innerHTML='<div class="area"></div>';root.querySelector('.dcconlist').prepend(area);add(area.firstChild,'folderEditLayer');
 const list=root.querySelector('#favoriteFolderLayer .bkmark_editlist ul');
 for(let i=0;i<3;i++)list.insertAdjacentHTML('beforeend',`<li data-old-name="synthetic-${i}"><div class="lcont"><p class="fdname">합성${i}(2/50)</p><button type="button" class="btn_txt font_grey btn_detail_edit" data-index="${i}">편집</button></div><div class="rcont"><button type="button" class="btn_fdedit sp_img icon_edit">폴더명 편집</button><button type="button" class="btn_change sp_img icon_change_img888">순서 변경</button><button type="button" class="btn_del sp_img icon_grey777_x">삭제</button></div></li>`);
 const folderChoices=root.querySelector('#favoriteFolderSelectLayer .bkmrk_list');
 if(!folderChoices)throw Error('Native folder-choice list missing');for(let i=0;i<3;i++)folderChoices.insertAdjacentHTML('beforeend',`<li data-index="${i}" style="flex:0 0 76px;width:76px"><button type="button" class="btn_folder_item" style="background:rgb(206,222,236);color:rgb(51,65,85)"><span>합성${i}(2)</span></button></li>`);
 const inline=root.querySelector('#favoriteFolderLayer .ly_folder_add').parentElement;inline.dataset.fixtureChild='inline-add';
 const calls=[];const children=[...root.querySelectorAll('#favoriteFolderLayer,#favoriteFolderAddLayer,#favoriteFolderSelectLayer,#folderEditLayer,#dccfv_picker_lay,[data-fixture-child="inline-add"]')];
 const close=()=>{children.forEach(n=>n.style.display='none');area.style.display='none';root.querySelectorAll('.bkmark_infobox').forEach(n=>n.parentElement.style.display='none')};close();
 const roots={list:'#favoriteFolderLayer',add:'#favoriteFolderAddLayer',select:'#favoriteFolderSelectLayer',edit:'#folderEditLayer',color:'#dccfv_picker_lay','inline-add':'[data-fixture-child="inline-add"]',help:'#favoriteFolderAddLayer .bkmark_infobox'};
 const open=kind=>{close();if(kind==='edit')area.style.display='block';if(kind==='color')root.querySelector('#favoriteFolderSelectLayer').style.display='block';if(kind==='inline-add')root.querySelector('#favoriteFolderLayer').style.display='block';if(kind==='help')root.querySelector('#favoriteFolderAddLayer').style.display='block';let n=root.querySelector(roots[kind]);if(kind==='help')n=n.parentElement;n.style.display='block';calls.push('open-'+kind);return n};
 root.querySelectorAll('.poply_whiteclose,.poply_bgblueclose,.btn_bkm_close,.btn_cancle').forEach(n=>n.onclick=()=>{close();calls.push('close')});
 root.querySelectorAll('#favoriteFolderLayer button,#favoriteFolderAddLayer button,#favoriteFolderSelectLayer button,#folderEditLayer button').forEach(n=>{if(!n.onclick)n.onclick=()=>calls.push('synthetic-action')});
 window.__residualFixture={calls,openFolder:open,closeFolders:close,roots,originals:[...root.querySelectorAll('button,input,.pop_wrap,.bgbox')].map(node=>({node,parent:node.parentNode,handler:node.onclick,type:node.getAttribute('type'),name:node.getAttribute('name')}))};
}

export function mountEditorChildren({html,css,dccon}) {
 const editor=document.querySelector('.note-editor');const style=document.createElement('style');style.id='residual-native-css';style.textContent=css;document.head.prepend(style);
 const roots={};for(const item of html){editor.insertAdjacentHTML('beforeend',item.html);const n=editor.lastElementChild;const kind=n.classList.contains('note-popover')?'popover-'+(['link','image','table'].find(k=>n.classList.contains('note-'+k+'-popover'))):'modal-'+({링크:'link','그림 삽입':'image','동영상 삽입':'video',도움말:'help'}[n.getAttribute('aria-label')]||'link');n.dataset.fixtureChild=kind;n.style.display='none';roots[kind]=n;}
 const link=roots['popover-link'].querySelector('a');link.textContent='https://example.test/synthetic';link.href='https://example.test/synthetic';
 const template=document.createElement('div');template.innerHTML=dccon;let picker=document.querySelector('#div_con');if(picker){picker.replaceChildren(...template.firstElementChild.childNodes)}else{document.body.append(template.firstElementChild);picker=document.querySelector('#div_con')}picker.style.display='none';roots.dccon=picker;
 const mediaPane=picker.querySelector('.dccon_list_box.dcconlist');if(!mediaPane)throw Error('Native writer media-pane anatomy missing');mediaPane.style.display='block';
 // The public page contains a closed skeleton;native /dccon/lists supplies
 // this UL/LI ancestry at open. Use synthetic media,not an empty optional list.
 let list=mediaPane.querySelector('.dccon_list');if(!list){list=document.createElement('ul');list.className='dccon_list';mediaPane.append(list)}
 const media='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#d6e8e3"/><circle cx="50" cy="50" r="24" fill="#49817b"/></svg>');
 const footer=list.querySelector('.dccon_list_btm');if(!footer)throw Error('Native writer pagination anatomy missing');
 list.innerHTML=Array.from({length:12},(_,i)=>`<li class="list_li list_${i<8?1:2}"${i<8?'':' style="display:none"'}><button type="button" class="img_dccon"><img src="${media}" alt="합성 미디어"></button></li>`).join('');list.append(footer);
 picker.querySelectorAll('img:not([src])').forEach(n=>n.src=media);
 picker.querySelectorAll('.bgbox').forEach(n=>n.style.display='none');
 const calls=[];const close=()=>{Object.values(roots).forEach(n=>n.style.display='none');calls.push('close')};
 for(const [button,page]of[['.btn_next',2],['.btn_prev',1]])footer.querySelector(button).onclick=()=>{list.querySelectorAll('.list_li').forEach(n=>n.style.display=n.classList.contains('list_'+page)?'':'none');footer.querySelector('.now_num').textContent=String(page);calls.push('page-'+page)};
 for(const[k,n]of Object.entries(roots))n.querySelectorAll('.close,.poply_whiteclose,.btn_close').forEach(b=>b.onclick=()=>{n.style.display='none';calls.push('close-'+k)});
 const open=kind=>{close();const n=roots[kind];n.style.display='block';if(kind.startsWith('popover')){n.style.top='100px';n.style.left='10px';}if(kind==='dccon')document.querySelector('[data-command="dccon"],button[aria-label="디시콘"]')?.click();calls.push('open-'+kind);return n};
 window.__residualFixture={calls,openEditor:open,closeEditor:close,roots,originals:[...editor.querySelectorAll('button,input,a,.note-modal,.note-popover'),picker,...picker.querySelectorAll('button,input')].map(node=>({node,parent:node.parentNode,handler:node.onclick,type:node.getAttribute('type'),name:node.getAttribute('name')}))};
}
