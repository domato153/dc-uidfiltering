export function mountGallerySearchFixture({html,css}) {
 document.getElementById('dcuf-testbed-controls')?.remove();
 const visit=document.querySelector('.visit_bookmark');if(visit&&!visit.id)visit.id='visit_history';
 const style=document.createElement('style');style.textContent=css;document.head.prepend(style);
 const from=s=>new DOMParser().parseFromString(s,'text/html').body.firstElementChild;
 let issue=document.querySelector('.issue_wrap');if(!issue){issue=document.createElement('div');issue.className='issue_wrap';document.querySelector('.page_head').after(issue)}
 issue.replaceChildren();const box=document.createElement('div');box.className='issuebox gallery_box';issue.append(box);box.append(from(html.door),from(html.related));
 const head=document.querySelector('.page_head');let right=head.querySelector(':scope > .fr');if(!right){right=document.createElement('div');right.className='fr gall_issuebox';head.append(right)}
 const bundle=document.createElement('div');bundle.className='bundle';bundle.innerHTML='<button type="button" id="issue_setting">설정</button>'+html.settings;bundle.querySelector('#setting_list').style.display='none';right.append(bundle);
 const guideTrigger=document.createElement('button');guideTrigger.type='button';guideTrigger.textContent='이용안내';guideTrigger.dataset.fixtureGuide='1';right.append(guideTrigger);
 const related=document.createElement('button');related.type='button';related.textContent='연관 갤러리';related.dataset.fixtureRelated='1';right.append(related);
 const search=document.querySelector('.dcheader .wrap_search');search.innerHTML='<form id="fixture_search_form" action="/synthetic-search"><fieldset class="sch_smit"><div><div class="top_search"><div class="inner_search"><input id="preSWord" class="in_keyword" type="text" title="갤러리 검색"></div><button id="searchSubmit" type="submit" class="sp_img bnt_search"><span class="blind">검색</span></button></div>'+html['search-history']+'</div></fieldset></form>';
 const state={calls:[],originals:[],searchMode:'history'};window.__gallerySearchFixture=state;
 const remember=()=>{state.originals=Array.from(document.querySelectorAll('.issue_contentbox,.issue_contentbox button,.issue_contentbox a,#relation_popup,#relation_popup button,#relation_popup a,#setting_list,#setting_list button,#setting_list input,.wrap_search input,.wrap_search button,.auto_wordwrap a,.auto_wordwrap input,.user_guide_popup')).map(node=>({node,parent:node.parentNode,click:node.onclick,focus:node.onfocus,input:node.oninput}));};
 const bindSearch=()=>{const popup=search.querySelector('.auto_wordwrap');popup.querySelector('.btn_close').onclick=event=>{event.preventDefault();state.calls.push('search-close');popup.style.display='none'};popup.querySelectorAll('.btn_autoword_del').forEach(n=>n.onclick=()=>{state.calls.push('remove-history');n.closest('li').remove()});popup.querySelector('.btn_latelydel')?.addEventListener('click',()=>{state.calls.push('clear-history');popup.style.display='none'});};bindSearch();
 const input=search.querySelector('#preSWord');input.onfocus=()=>{search.querySelector('.auto_wordwrap').style.display='block';remember()};input.oninput=()=>{if(state.searchMode==='suggestions')return;const old=search.querySelector('.auto_wordwrap'),next=from(html['search-suggestions']);old.replaceWith(next);next.style.display='block';state.searchMode='suggestions';bindSearch();remember()};
 search.querySelector('form').onsubmit=event=>{event.preventDefault();state.calls.push('search-submit')};
 bundle.querySelector('#issue_setting').onclick=()=>{const p=bundle.querySelector('#setting_list');p.style.display=p.style.display==='none'?'block':'none';remember()};
 bundle.querySelectorAll('#setting_list button').forEach((n,i)=>n.onclick=()=>state.calls.push('setting-'+i));
 related.onclick=()=>{document.querySelector('#relation_popup').style.display='block';remember()};document.querySelector('#relation_popup .poply_bgblueclose').onclick=()=>{document.querySelector('#relation_popup').style.display='none';state.calls.push('related-close')};
 document.querySelectorAll('#relation_popup .btn_next,#relation_popup .btn_prev').forEach(n=>n.onclick=()=>state.calls.push('related-page'));
 const rank=document.querySelector('#hot_rank_pop2'),tip=document.querySelector('#hot_tip_pop');
 document.querySelector('.btn_hotall_list').onclick=()=>{rank.style.display='block';remember()};rank.querySelector('.poply_close').onclick=()=>{rank.style.display='none';state.calls.push('rank-close')};
 rank.querySelectorAll('.btn_next,.btn_prev').forEach(n=>n.onclick=()=>{const pages=[...rank.querySelectorAll('.pop_hotmgall_listbox')],current=pages.findIndex(p=>getComputedStyle(p).display!=='none'),next=Math.max(0,Math.min(pages.length-1,current+(n.matches('.btn_next')?1:-1)));pages.forEach((p,i)=>p.style.display=i===next?'block':'none');state.calls.push('rank-page')});
 const tipTrigger=Array.from(document.querySelectorAll('.minor_ranking_box button')).find(n=>n!==tip.querySelector('button')&&!n.matches('.btn_hotall_list')&&!n.closest('#hot_rank_pop2'));
 if(tipTrigger)tipTrigger.onclick=()=>{tip.style.display='block';remember()};tip.querySelector('.btn_tipclose').onclick=()=>{tip.style.display='none';state.calls.push('tip-close')};
 guideTrigger.onclick=()=>{const backdrop=document.createElement('div');backdrop.className='user_guide_popup pop_bg';const guide=from(html.guide);guide.querySelectorAll('button').forEach(n=>n.onclick=()=>{guide.remove();backdrop.remove();state.calls.push('guide-close')});(document.querySelector('#visit_history')||head.parentElement).append(backdrop,guide);remember()};
 state.remember=remember;remember();
}
