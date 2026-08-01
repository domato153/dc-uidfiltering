const escapeHtml = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const baseHead = (title) => `<!doctype html><html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
*{box-sizing:border-box}body{margin:0;font:14px Arial,sans-serif;color:#222;background:#f4f6fa}button,a{font:inherit}
#top{width:min(1100px,100%);margin:0 auto;padding:12px}.dcheader,.gnb_bar,#visit_history,.gall_listwrap,.write_wrap{background:#fff;border:1px solid #ccd3df}
.dchead,.gnb,.newvisit_history,.list_array_option{position:relative;display:flex;align-items:center;gap:8px;padding:10px}.area_links{margin-left:auto}
.newvisit_box{width:520px;overflow:hidden}.newvisit_list{display:flex;gap:8px;width:max-content;margin:0;padding:0;list-style:none}.newvisit_list li{min-width:92px}
.sp_img{display:inline-block;width:12px;height:12px;background:linear-gradient(#29478f,#29478f)}
.center_box>.inner{position:relative}.center_box>.inner>ul{display:flex;gap:6px;margin:0;padding:0;list-style:none}.btn_subject_more{margin-left:4px}
#subject_morelist,#listSizeLayer,#pop_manage_report_list,.user_data{position:absolute;z-index:30;display:none;margin:0;padding:8px;list-style:none;background:#fff;border:1px solid #66758d;box-shadow:0 6px 18px #0002}
#subject_morelist{top:32px;left:0}#listSizeLayer{top:34px;right:0}.select_box{position:relative;margin-left:auto}.gall_list{width:100%;border-collapse:collapse}.gall_list td,.gall_list th{padding:8px;border-bottom:1px solid #e2e6ee}.gall_writer{cursor:pointer}.custom-mobile-list{display:block}.custom-post-item{padding:10px;border-bottom:1px solid #e2e6ee;background:#fff}.author{display:inline-block}
.issue_wrap{position:relative}.btn_manage{margin-left:8px}#pop_manage_report_list{top:34px;right:0;width:220px}.popup_action{display:block;width:100%;min-height:34px}
.write_wrap{padding:16px}.ai_quick_register{display:flex;align-items:center;gap:8px;overflow-x:auto;white-space:nowrap}.ai_quick_register>*{flex:0 0 auto}.ai_loading{width:24px;height:24px}.ai_prompt{width:260px}.ai_settings_popup{display:none;position:absolute;z-index:40;width:220px;padding:10px;background:#fff;border:1px solid #66758d}.ai_native_close.sp_img{width:18px;height:18px}
</style></head>`;

const hostChrome = `<header class="dcheader typea"><div class="dchead">
<h1 class="dc_logo"><span>dcinside.com</span></h1><nav><a href="#gallery">갤러리</a></nav>
<div class="area_links"><a class="btn_top_loginout" href="#login">로그인</a></div></div></header>
<div class="gnb_bar"><nav class="gnb"><a href="#minor">마이너갤</a><a href="#mini">미니갤</a></nav></div>`;

const recentRail = `<div id="visit_history" class="visit_bookmark"><div class="newvisit_history vst">
<strong class="vst_title">최근 방문</strong><strong class="bookmark_title" hidden>즐겨찾기</strong>
<button class="btn_open" type="button" aria-label="최근 방문 레이어 열기"><em class="sp_img icon_listmore"></em></button>
<button class="bnt_visit_prev" type="button" aria-label="이전">‹</button>
<div class="newvisit_box"><ul class="newvisit_list">${Array.from({ length: 12 }, (_, index) => `<li><a href="#visit-${index + 1}">최근 ${index + 1}</a></li>`).join('')}</ul></div>
<button class="bnt_visit_next on" type="button" aria-label="다음">›</button><button class="bnt_newvisit_more" type="button">전체</button>
</div></div>`;

const headtextControls = `<div class="center_box"><div class="inner">
<ul><li><a href="#general">일반</a></li><li><a href="#question">질문</a></li></ul>
<button type="button" class="btn_subject_more">말머리 더보기</button>
<ul id="subject_morelist"><li><a href="#sniper">🔫저격</a></li><li><a href="#act">®️ACT</a></li></ul>
</div></div>`;

const rows = Array.from({ length: 8 }, (_, index) => {
    const no = 1001 + index;
    const uid = index === 0 ? 'direct-handler-writer' : `safe-list-${index + 1}`;
    const nick = index === 0 ? '직접핸들러작성자' : `목록작성자${index + 1}`;
    return `<tr class="ub-content us-post" data-no="${no}" data-type="icon_txt">
<td class="gall_num">${no}</td><td class="gall_type">일반</td>
<td class="gall_tit"><span class="gall_subject" data-headtext="일반">일반</span><a href="/mgallery/board/view?id=test&no=${no}">P0-A 게시물 ${index + 1}</a><a class="reply_numbox" href="#comment"><span class="reply_num">[${index}]</span></a></td>
<td class="gall_writer ub-writer" user_name="${nick}" data-uid="${uid}" data-nick="${nick}" data-ip=""><b>${nick}</b></td>
<td class="gall_date">2026.08.01</td><td class="gall_count">${index * 3}</td><td class="gall_recommend">${index}</td></tr>`;
}).join('');

const listScripts = `<script>
(() => {
  const originalWriter = document.querySelector('table.gall_list .gall_writer[data-uid="direct-handler-writer"]');
  originalWriter.dataset.fixtureDirectHandler = '1';
  window.__fixtureDirectWriter = originalWriter;
  const openNativeWriterMenu = (event) => {
    event.preventDefault();
    document.querySelectorAll('.user_data[data-fixture-native-menu="1"]').forEach((node) => node.remove());
    const menu = document.createElement('div');
    menu.className = 'user_data';
    menu.dataset.fixtureNativeMenu = '1';
    menu.innerHTML = '<button type="button" class="native_writer_action">갤로그 보기</button>';
    document.body.appendChild(menu);
    const rect = event.currentTarget.getBoundingClientRect();
    menu.style.left = Math.max(0, rect.left) + 'px';
    menu.style.top = Math.max(0, rect.bottom + 4) + 'px';
    menu.style.display = 'block';
  };
  originalWriter.addEventListener('click', openNativeWriterMenu);

  const subjectButton = document.querySelector('.btn_subject_more');
  subjectButton.addEventListener('click', () => {
    const layer = document.querySelector('#subject_morelist');
    layer.style.display = layer.style.display === 'block' ? 'none' : 'block';
  });

  document.querySelector('.list_size_trigger').addEventListener('click', () => {
    const layer = document.querySelector('#listSizeLayer');
    layer.style.display = layer.style.display === 'block' ? 'none' : 'block';
  });

  document.querySelector('.btn_manage').addEventListener('click', () => {
    let popup = document.querySelector('#pop_manage_report_list');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'pop_manage_report_list';
      popup.className = 'pop_wrap';
      popup.innerHTML = '<button type="button" class="popup_action">관리 내역 열기</button><button type="button" class="popup_action">신고 내역 열기</button>';
      document.querySelector('.issue_wrap').appendChild(popup);
    }
    popup.style.display = 'block';
  });
})();
</script>`;

export function p0aListPage({ variant = 'minor' } = {}) {
    return `${baseHead('P0-A live-shaped list')}<body data-fixture-page="list" data-fixture-variant="${escapeHtml(variant)}"><div id="top" class="dcwrap width1160 list_wrap">
${hostChrome}${recentRail}<main id="container" class="clear"><article>
<header class="page_head"><h2>테스트 마이너 갤러리</h2><div class="issue_wrap"><button type="button" class="btn_manage">갤러리 관리</button></div></header>
<div class="list_array_option"><div class="array_tab left_box"><a href="#all">전체글</a></div>${headtextControls}
<div class="right_box"><div class="select_box array_num"><button type="button" class="select_area list_size_trigger">50개<em class="sp_img icon_option_more"></em></button>
<ul id="listSizeLayer" class="option_box"><li><button type="button">30개</button></li><li><button type="button">50개</button></li><li><button type="button">100개</button></li></ul></div></div></div>
<section class="gall_listwrap"><table class="gall_list"><thead><tr><th>번호</th><th>구분</th><th>제목</th><th>작성자</th><th>날짜</th><th>조회</th><th>추천</th></tr></thead><tbody class="listwrap2">${rows}</tbody></table></section>
<div class="list_bottom_btnbox"><a class="btn_write write" href="/mgallery/board/write?id=test">글쓰기</a></div>
<div class="bottom_paging_box"><em>1</em><a href="?page=2">2</a></div>
<form name="frmSearch"><fieldset><div class="bottom_search_wrap"><select name="search_type"><option>제목+내용</option></select><input class="in_keyword" name="search_keyword"><button type="button" class="bnt_search">검색</button></div></fieldset><div id="searchTypeLayer"></div></form>
</article></main></div>${listScripts}</body></html>`;
}

const aiRail = `<section class="ai_quick_register" aria-label="AI 빠른 등록">
<div class="ai_loading" aria-label="AI 로딩"></div>
<input class="ai_file_input" type="file" accept="image/*">
<button type="button" class="ai_image_control">이미지</button>
<button type="button" class="ai_character_control">캐릭터</button>
<button type="button" class="ai_layer_button">레이어</button>
<input class="ai_prompt" type="text" placeholder="프롬프트">
<span class="ai_count">0/500</span>
<button type="button" class="ai_native_close sp_img" aria-label="닫기"></button>
<button type="button" class="ai_settings_button">설정</button>
<div class="ai_settings_popup"><label>모델<select><option>기본</option></select></label></div>
</section>`;

export function p0aWritePage() {
    return `${baseHead('P0-A live-shaped write')}<body data-fixture-page="write" data-fixture-variant="minor"><div id="top" class="dcwrap width1160">
${hostChrome}<main id="container"><article><div class="write_wrap"><form id="write" name="write" method="post" action="/__testbed/write-submit">
<input type="hidden" name="id" value="test"><div class="write_subject"><select name="headtext"><option>일반</option></select><input id="subject" name="subject" type="text"></div>
<div class="editor_wrap"><textarea name="memo"></textarea></div>${aiRail}<div class="btn_box write"><button type="submit">등록</button><button type="button">취소</button></div>
</form></div></article></main></div><script>document.querySelector('.ai_settings_button').addEventListener('click',()=>{document.querySelector('.ai_settings_popup').style.display='block';});document.querySelector('form').addEventListener('submit',(event)=>event.preventDefault());</script></body></html>`;
}
