// Stable native shapes sampled from public DCInside; shared by behavior and visual checks.
export async function mountB1NativeFixture(e,baseUrl,{siblings=true,dark=false}={}) {
   await e.page.route(url=>url.origin===baseUrl&&/\/board\/lists$/.test(url.pathname),async route=>{
    const response=await route.fetch();let html=await response.text();
    // The native accessible label is clipped by host CSS, not a visible caption.
    html=html.replace('</head>','<style>.blind{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}</style></head>');
    html=html.replace(/(<div class="wrap_search"><form>)([\s\S]*?)(<\/form>)/,'$1<fieldset>$2</fieldset>$3');
    html=html.replace('<div class="inner_search"><input','<div class="inner_search"><input class="in_keyword"').replace('</head>','<style>.dchead .top_search .in_keyword{width:297px;height:38px}.typea .inner_search{width:315px}.typea .top_search{width:364px}.visit_bookmark .newvisit_history .btn_open{width:15px;height:15px}.visit_bookmark .newvisit_history .btn_open .icon_listmore{display:inline-block;width:15px;height:15px}.darkmode .array_tab button{background:#666;color:#eee}.darkmode .pop_content.under_catelist{background:#181818}.darkmodebox{position:relative}.darkmodebox .pop_tipbox{position:absolute;width:165px;height:24px;background:#a5ce27;white-space:nowrap}.visit_bookmark .tabslist li.on button::before{content:"";position:absolute;bottom:0;left:0;width:100%;border-bottom:4px solid #3b4890}.visit_bookmark .under_catelist.newvisit_layer .under_listbox{min-height:123px}.visit_bookmark .tabcon_bottom .list_modi{position:absolute;right:0;bottom:0}</style></head>');
    html=html.replace(/<div class="area_links">([\s\S]*?)<\/div>/,'<div class="area_links"><ul><li>$1</li><li><a href="#native-service">서비스 링크</a></li></ul><div class="darkmodebox"><button type="button" aria-label="네이티브 테마">◐</button><div class="pop_tipbox join_tip dark" style="top:25px;left:-35px" onclick="this.style.display=\'none\'">야간 모드를 이용해 보세요</div></div></div>');
    if(siblings){
    const start=html.indexOf('<header class="dcheader'),end=html.indexOf('</header>',start)+9;
    const chrome=html.slice(start,end-9).replace('<div class="gnb_bar">','</header><div class="gnb_bar">').replace('<div class="newvisit_history">','<div class="visit_bookmark"><div class="newvisit_history">');
    html=html.slice(0,start)+'<div class="dcwrap width1160 list_wrap">'+chrome+'</div>'+html.slice(end).replace('</body>','</div></body>');
    }
    await route.fulfill({response,body:html});
   });
   await e.goto('/mgallery/board/lists?id=test&nativeToolbar=1');
   await e.page.waitForSelector('[data-dcuf-header-layout]');
   await e.page.evaluate(()=>{
    document.getElementById('dcuf-testbed-controls')?.remove();
    // Native-shaped layer: the original button and original source handlers own
    // display/tab/delete semantics. Product adds no replacement popup/controller.
    const root=document.querySelector('.newvisit_history'),trigger=root.querySelector('.btn_open');
    trigger.innerHTML='<span class="blind">최근 방문 레이어 열기</span><em class="sp_img icon_listmore"></em>';
    root.insertAdjacentHTML('afterbegin','<h3 class="tit bookmark_title" style="display:block">즐겨찾기 갤러리</h3>');
    root.insertAdjacentHTML('beforeend','<div class="pop_wrap gray1px" id="visit_history_lyr" style="left:0;top:37px;display:none"><div class="pop_content under_catelist newvisit_layer"><ul class="tabslist"><li class="on"><button type="button">최근 방문</button></li><li><button type="button">즐겨찾기</button></li></ul><ul class="under_listbox"><li><a href="#native-recent">명조 워더링 웨이브</a><button type="button" aria-label="목록에서 삭제">×</button></li></ul><div class="tabcon_bottom"><button class="list_modi" type="button">전체 삭제</button></div></div></div>');
    const layer=root.querySelector('#visit_history_lyr');
    trigger.onclick=()=>{layer.style.display=layer.style.display==='none'?'block':'none';window.__b1RecentOpens=(window.__b1RecentOpens||0)+1};
    layer.querySelector('a').onclick=ev=>{ev.preventDefault();window.__b1RecentClicks=(window.__b1RecentClicks||0)+1};
    layer.querySelector('[aria-label="목록에서 삭제"]').onclick=()=>window.__b1DeleteClicks=(window.__b1DeleteClicks||0)+1;
    window.__b1Originals=Array.from(document.querySelectorAll('.dcheader a,.dcheader button,.dcheader input,.gnb_bar a,.newvisit_history button,#visit_history_lyr a')).map(node=>({node,parent:node.parentNode,handler:node.onclick}));
    document.querySelector('#listSizeLayer')?.style.setProperty('display','none');
    window.dispatchEvent(new Event('resize'));
   });
   if(dark)await e.page.evaluate(()=>{window.__dcufFixture.toggleDark(true);document.documentElement.classList.add('darkmode')});
   await e.page.waitForFunction(()=>[...document.querySelectorAll('.newvisit_history > .tit')].every(n=>getComputedStyle(n).display==='none'));
}
