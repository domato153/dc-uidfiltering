// Controlled fixture interactions only: no GM, network, real submission or filter runtime.
const body = document.body;
const q = selector => document.querySelector(selector);
const all = selector => [...document.querySelectorAll(selector)];
body.dataset.theme = new URL(location.href).searchParams.get('theme') === 'dark' ? 'dark' : 'light';
// Remove the optional fixture's deliberately hostile visual baseline; this
// prototype has one visual owner, not a correction on top of product CSS.
all('style').filter(n => n.textContent.startsWith('.list_array_option{display:table')).forEach(n => n.remove());
all('.list_array_option,.list_array_option .right_box,.bottom_search,.bnt_search,.btn_top_loginout,.pagehead_titicon,.issue_wrap').forEach(n => n.removeAttribute('style'));
q('.dc_logo span').textContent = 'dcinside';
q('.gnb_list a').classList.add('on');
q('.fixture-gallery-heading h2>a').textContent = '명조 워더링 웨이브 갤러리';
q('.pagehead_titicon .blind').textContent = '마이너';
q('.wrap_search input').placeholder = '갤러리 내 검색';
q('.gall_search input').placeholder = '닉네임 또는 IP';
q('.newvisit_history .btn_open').textContent = '최근 방문';
q('.newvisit_history .btn_open').setAttribute('aria-label', '최근 방문');
q('.bnt_newvisit_more').textContent = '전체 방문 기록';
const recentNames = ['명조 워더링 웨이브','원신','붕괴 스타레일','명일방주','젠레스 존 제로','승리의 여신 니케','게임 이야기','애니메이션'];
all('.newvisit_list a').forEach((a,i)=>{a.textContent=recentNames[i%recentNames.length]+(i>7?' · '+(i+1):'')+' 갤러리';});
all('.btn_write').forEach(n=>n.textContent='글쓰기');
all('.array_num option').forEach((n,i)=>{n.textContent=i?'30개':'50개';n.value=i?'30':'50';});
q('.search_left_box select').innerHTML='<option value="title_content">제목+내용</option><option value="title">제목</option>';
q('input[name=search_keyword]').placeholder='검색어를 입력하세요';
all('.list_bottom_btnbox .fl button').forEach((n,i)=>n.textContent=i?'개념글':'전체글');
all('.bottom_paging_box .sp_pagingicon').forEach(n=>{n.textContent=n.classList.contains('page_first')?'«':n.classList.contains('page_prev')?'‹':n.classList.contains('page_end')?'»':'›';});
q('.bottom_paging_box em').textContent='1';
all('.bottom_paging_box a:not(.sp_pagingicon)').forEach((n,i)=>n.textContent=i+2);

const categories=['일반','스토리','정보·공략','유출·잡담','질문','팬아트','영상','창작','소식','스포일러','행사·대회','공략 연구소'];
const categoryList=q('.center_box ul');
categories.forEach((name,i)=>{
    let a=categoryList.querySelectorAll('a')[i];
    if(!a){const li=document.createElement('li');a=document.createElement('a');a.href='#';a.onclick=()=>{window.__fixtureNativeCategoryClicks=(window.__fixtureNativeCategoryClicks||0)+1;return false;};li.append(a);categoryList.append(li);}
    a.textContent=name;
});
const more=document.createElement('button');more.type='button';more.className='b1-category-more';more.textContent='⌄';more.setAttribute('aria-label','말머리 더보기');more.setAttribute('aria-expanded','false');q('.center_box').append(more);
// Measure whole native-shaped items, then hide only complete overflow entries.
// Selected overflow stays visible without reordering or moving the original UL.
const categoryItems=[...categoryList.children],categoryWidths=categoryItems.map(n=>n.getBoundingClientRect().width);
function fitCategories(){
    const available=q('.center_box .inner').clientWidth-30;
    const selected=categoryItems.findIndex(n=>n.querySelector('[aria-current=true]'));
    let used=selected>=0?categoryWidths[selected]+1:0;
    categoryItems.forEach((item,i)=>{const fits=i===selected||used+categoryWidths[i]+1<=available;if(i!==selected&&fits)used+=categoryWidths[i]+1;item.dataset.collapsed=String(!fits);});
    categoryList.scrollLeft=0;
}
const categoryResize=new ResizeObserver(fitCategories);categoryResize.observe(q('.center_box'));
fitCategories();
q('.fixture-headtext-more').removeAttribute('aria-label'); // Separate duplicate regression fixture, not a second toolbar.
const theme=document.createElement('button');theme.type='button';theme.className='b1-theme';theme.textContent='☾';theme.setAttribute('aria-label','화면 테마 전환');q('.area_links').prepend(theme);
const status=document.createElement('output');status.className='b1-status';status.setAttribute('aria-live','polite');body.append(status);
let toastTimer;
function say(text){status.textContent=text;status.dataset.visible='true';clearTimeout(toastTimer);toastTimer=setTimeout(()=>status.dataset.visible='false',2200);}
function setTheme(value){body.dataset.theme=value==='dark'?'dark':'light';theme.textContent=body.dataset.theme==='dark'?'☀':'☾';}
theme.addEventListener('click',()=>setTheme(body.dataset.theme==='dark'?'light':'dark'));
setTheme(body.dataset.theme);
window.addEventListener('message',event=>{if(event.source===parent&&event.origin===location.origin&&event.data?.type==='B1_PREVIEW_THEME')setTheme(event.data.theme);});

const titles=['[공지] 갤러리 이용 안내와 자주 묻는 질문','신규 공명자 육성, 어디서부터 시작하면 좋을까?','오늘 업데이트 주요 내용 정리','스토리 보는데 이 장면 정말 좋더라','복귀 유저를 위한 빠른 시작 가이드','이번 이벤트 보상 한눈에 보기','편하게 보는 탐험 루트 정리','새로 찍어본 인게임 스크린샷','캐릭터 조합 이야기 같이 해보자','질문하기 전에 읽어보면 좋은 정보','이번 주 플레이 후기와 작은 팁','사진 모드로 남겨본 오늘의 풍경'];
const rows=all('.gall_list tbody tr');
rows.forEach((row,i)=>{
    row.dataset.baseHidden=String(row.style.display==='none'||row.hasAttribute('data-fixture-host-css-hidden'));
    row.hidden=row.dataset.baseHidden==='true';
    row.querySelector('.gall_tit>a').textContent=titles[i%titles.length];
    row.querySelector('.gall_num').textContent=593421-i;
    row.querySelector('.gall_type').textContent=i===3?'공지':categories[i%5];
    row.querySelector('.nickname em').textContent=['별빛산책','바람결','달무리','여행하는사람','공명중','오늘의기록'][i%6];
    row.querySelector('.gall_date').textContent=i<8?'12:'+String(48-i*3).padStart(2,'0'):'10.22';
    row.querySelector('.gall_subject').title='선택한 말머리의 게시글입니다';
    row.querySelector('.gall_tit>a').addEventListener('click',event=>{event.preventDefault();all('.b1-last-read').forEach(n=>n.classList.remove('b1-last-read'));row.classList.add('b1-last-read');say('목록 디자인 시안 · 본문은 다음 단계에서 연결합니다');});
});
rows[7].classList.add('b1-last-read');

const recent=q('.newvisit_history'),trigger=recent.querySelector('.btn_open');
const nativeControls=all('.dcheader a,.dcheader button,.dcheader input,.list_array_option button,.list_array_option a,.list_array_option select,form[name=frmSearch] input,form[name=frmSearch] button');
window.__b1Preview={originals:nativeControls.map(node=>({node,parent:node.parentNode,handler:node.onclick})),scope:'LOCAL_FIXTURE_DESIGN_ONLY'};
function closeMenus(focus=false){
    const recentWasOpen=recent.dataset.open==='true',categoryWasOpen=q('.center_box').dataset.open==='true';
    recent.dataset.open='false';trigger.setAttribute('aria-expanded','false');
    q('.center_box').dataset.open='false';more.setAttribute('aria-expanded','false');
    categoryList.scrollLeft=0;
    if(focus)(recentWasOpen?trigger:categoryWasOpen?more:null)?.focus();
}
trigger.setAttribute('aria-controls','b1-recent-menu');recent.querySelector('.newvisit_box').id='b1-recent-menu';trigger.setAttribute('aria-expanded','false');
trigger.addEventListener('click',()=>{const open=recent.dataset.open!=='true';closeMenus();recent.dataset.open=String(open);trigger.setAttribute('aria-expanded',String(open));});
more.addEventListener('click',()=>{const open=q('.center_box').dataset.open!=='true';closeMenus();q('.center_box').dataset.open=String(open);more.setAttribute('aria-expanded',String(open));});
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenus(true);});
document.addEventListener('click',event=>{if(!recent.contains(event.target)&&!q('.center_box').contains(event.target))closeMenus();});
all('.center_box a').forEach(a=>a.addEventListener('click',()=>{all('.center_box a').forEach(n=>n.removeAttribute('aria-current'));a.setAttribute('aria-current','true');fitCategories();closeMenus();more.focus();say(a.textContent+' 말머리 선택 · 실제 필터 조건은 변경하지 않습니다');}));
all('.array_tab button').forEach(button=>button.addEventListener('click',()=>{all('.array_tab button').forEach(n=>n.classList.remove('on'));button.classList.add('on');}));
all('.newvisit_list a').forEach(a=>a.addEventListener('click',event=>{event.preventDefault();closeMenus();say(a.textContent+' · 방문 이동은 시안에서 전송하지 않습니다');}));
q('.bnt_newvisit_more').addEventListener('click',()=>say('전체 방문 기록 · 실제 기록과 연결하지 않은 시안입니다'));
all('.btn_write').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();say('글쓰기 버튼 확인 · 작성 화면은 다음 단계입니다');}));
all('.dchead form,.gall_search').forEach(form=>form.addEventListener('submit',event=>{event.preventDefault();say('검색 입력 확인 · 외부 검색 요청은 전송하지 않습니다');}));
q('.btn_top_loginout').addEventListener('click',event=>{event.preventDefault();say('로그인 UI 위치 · 실제 로그인은 연결하지 않았습니다');});
const search=q('form[name=frmSearch]');
function searchRows(){const text=search.elements.search_keyword.value.trim().toLocaleLowerCase();const limit=Number(q('.array_num select').value);let count=0;rows.forEach(row=>{const matches=row.dataset.baseHidden!=='true'&&row.querySelector('.gall_tit>a').textContent.toLocaleLowerCase().includes(text);row.hidden=!matches||count>=limit;if(matches)count++;});say(text?`시안 내 검색 결과 ${count}개`:'시안 내 검색을 초기화했습니다');}
search.addEventListener('submit',event=>{event.preventDefault();searchRows();});
search.querySelector('.bnt_search').addEventListener('click',searchRows);
q('.array_num select').addEventListener('change',searchRows);
all('.reply_numbox').forEach(a=>a.addEventListener('click',event=>{event.preventDefault();say('댓글 수 표시 · 본문과 댓글 화면은 다음 단계입니다');}));
all('.bottom_paging_box a').forEach(a=>a.addEventListener('click',event=>{
    event.preventDefault();const current=Number(q('.bottom_paging_box em').textContent);
    const next=a.classList.contains('page_first')?1:a.classList.contains('page_end')?102:a.classList.contains('page_prev')?current-1:a.classList.contains('page_next')?current+1:Number(a.textContent);
    q('.bottom_paging_box em').textContent=String(Math.max(1,Math.min(102,next)));say('페이지 선택 · 시안의 샘플 목록을 유지합니다');
}));

let previousY=scrollY,frame=0;
body.dataset.scrollDirection='up';
window.addEventListener('scroll',()=>{if(frame)return;frame=requestAnimationFrame(()=>{
    frame=0;const y=scrollY,delta=y-previousY;previousY=y;
    // Browser focus/scroll-into-view also emits scroll. An open menu owns the
    // current navigation pose until selection, outside input or Escape closes it.
    if(recent.dataset.open==='true'||q('.center_box').dataset.open==='true')return;
    if(y<100)body.dataset.scrollDirection='up';else if(Math.abs(delta)>8)body.dataset.scrollDirection=delta>0?'down':'up';
});},{passive:true});
body.dataset.b1Ready='1';
