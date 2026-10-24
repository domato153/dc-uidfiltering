# 모바일 UI 깨짐 원인 조사 — 2026-10-17

상태: 조사 완료(아래 범위). 아래는 수정 전 진단을 보존한 기록이다. 이후 전체 결함 통합 수정과 현재 검증은 `UI_ALL_REPAIRS.md` 및 `UI_REPAIR_GATE.md`를 따른다. 이 진단 자체는 정상 UI 판정·전체 기능 통과·헤더 완료·실기기 검증을 뜻하지 않는다.

## 결론과 조사 조건

화면 폭을 잘못 잡은 이전 비교 오류와 별개로, 현재 작업본에는 실제 공개 사이트의 넓은 배치에서도 재현되는 회귀가 있다. 공통 원인은 기존 CSS를 retired 선택자로 비활성화하면서 필요한 호스트 보정 일부를 새 presenter로 옮기지 못한 것, 새 semantic 선택자가 실제 호스트 CSS에 지는 것, 서로 다른 역할을 같은 surface 선택자로 처리하는 것, 목록 노드 직렬화에서 이미지 표현을 빠뜨린 것이다. 최근 drawer56 priority 정리만의 문제로 단정할 근거는 없다.

- 기준 정본: mobile3.5.5, SHA-256 `32BA208DDD9973A7EEC343F01E963A833AB4F0C084987077EDAE46844383C25D`.
- 작업본: mobile3.5.5, SHA-256 `3EF663809B56BC4F224BA67FE13E39B688D16ECBC10F0357890DEBB8BEF518F0`. 조사 중 소스·산출물 변경 없음.
- 설치된 Chrome155.0.8059.80, 별도 익명 컨텍스트, GM shim. 실사이트는 minor 목록/동일 본문/글쓰기 및 DCUF·네이티브 팝업. 복잡한 답글·이미지 댓글·수정/삭제 확인창은 기존 Testbed로 보완했다. 게시·댓글·투표·차단 등록·설정 저장·백업 반입/반출은 하지 않았다.
- 넓은980 배치와390 좁은/짧은 스트레스 조건을 분리했다.980 proxy의 visualViewport.scale은1이다. Lemur의 정확한 배율이나 실제 Tampermonkey 실행과 동등하다고 주장하지 않는다. 실제 기기 폭은 이미지로 역산하지 않았다.
- 스크린샷을 열어 비교하고, DOM 크기·조상·CSS 계산값·CDP matched rules·elementFromPoint를 확인했다. 원인 실험은 격리 페이지에 임시 CSS를 넣었다가 제거했다. 여러 선언을 함께 시험한 경우 그 묶음의 기여만 입증하며 최종 패치로 간주하지 않는다. 일부 실험에서 문서 재배치/자동 스크롤로 y좌표가 변했으므로 전역 복원 동일성은 주장하지 않는다.

## 확인한 회귀

| ID | 우선 | 화면에서 보이는 문제 | 확인한 원인과 근거 |
| --- | --- | --- | --- |
| UI-01 | P1 | 목록 상단 탭과 말머리 겹침, 도구줄이 화면보다 짧음 | `list-presenter.js:92`는 flex를 적용하지만 호스트의840px 폭/고정 높이, `.array_tab {width:1%}`를 대체하지 않는다. `filter-module.js:604` 이후 예전 도구줄 보정은 retired 처리된다.980에서 도구줄840x48, 탭8.17px. 폭/높이만 바꾸면 탭은9.58px로 여전히 깨지고, 내부 흐름/탭 폭까지 시험하면264px로 회복된다. 제거 시 원래 크기로 돌아간다. |
| UI-02 | P2 | 목록 닉네임이 짧아도 ‘게…’, ‘실…’처럼 잘림 | `list-presenter.js:81`의 새 author 규칙은 호스트 `.list .gall_writer .addbox .nickname.in {max-width:70%}`를 대체하지 않는다. 예전 nickname/addbox 보정은 `filter-module.js:674`에서 retired 상태다. 실제 nickname35.92px/70%가 임시 보정 후51.33px/420px로 달라지고 제거 후 돌아간다. 충분한 너비에서도 발생한다. |
| UI-03 | P2 | 작성자 고닉 아이콘·갤러콘이 빠짐 | `list-presenter.js:323`의 허용 태그에 img가 없고 `renderAttributes`에도 src가 없다. 어댑터가 이미지 descriptor를 만들더라도 `renderDescriptor`에서 span이 된다. 같은 공개 목록 정본에는12x11 아이콘과24x24 갤러콘이 있으며, 작업본의 대응 작성자 렌더에는 img가 없다. 단순 색상/카드 디자인 차이가 아니다. |
| UI-04 | P1 | 하단 검색 종류 선택기가 안 보임 | `list-host-adapter.js:395`는 native select가 있으면 `.select_box.bottom_array` 전체를 superseded로 표시하고 `list-presenter.js:249`가 숨긴다. 실사이트는 select가 그 상자 안에 있으므로 함께0x0이 된다. 이는 hidden input을 select로 오인한 문제가 아니다(실제 SELECT). 부모의 숨김만 풀면123x44가 되고 제거 시 다시0x0이다. fixture는 select를 상자의 형제로 만들기 때문에 이 실패를 놓친다. |
| UI-05 | P2 | 검색 입력줄이 카드 밖으로 내려가고 검색 버튼이 빈 색 블록처럼 보임 | 실사이트 `.listwrap .buttom_search_wrap .bottom_search {position:absolute}`가 새 `[surface] [role]` 규칙보다 우선한다. 어댑터는 inline 위치만 해제하므로 stylesheet 위치는 남는다. 계산값 absolute, 입력줄331x38이 form980x46의 아래 경계를 넘는다. submit의 원래 background sprite를 해제하면서 새 시각 아이콘/표시를 공급하지 않아 before/after도 none이다. `query-controls` 임시 보정의 위치 변화가 확인됐지만 이것만으로 검색 전체가 해결되지는 않는다. 클릭/검색 제출 실패를 주장한 것은 아니다. |
| UI-06 | P1 | 첫 페이지·앞쪽 번호가 잘려 접근하기 어려움 | `list-presenter.js:194`가 overflow scroll 영역에 center 정렬을 사용한다. 실제 container x122/width736/scrollLeft0에서 첫 번호 x-112.5가 되어 음수 쪽에 잘린다. flex-start 임시 실험에서는 x122로 돌아오며 제거 시 다시-112.5다. 정상적인 가로 스크롤만으로 음수 시작 영역을 복구할 수 없는 배치다. |
| UI-07 | P2 | 하단 ‘글쓰기’가 여러 줄로 갈라짐 | `list-presenter.js:141`의 새 버튼 패딩/아이콘에 호스트의 고정 폭이 남고 nowrap/자연 폭 계약이 없다. 실제82x40 버튼에서 글자가 줄바꿈된다. 임시 width:auto/nowrap에서88x40으로 한 줄이 되고 제거 시82로 돌아간다. |
| UI-08 | P2 | 본문 조회/추천이 세로로 쌓이고 댓글 수 뒤에 별도 사각 배경이 생김 | `article-presenter.js:80` 이후 새 metadata 규칙에 이전 `.fr > span`의 inline-flex/nowrap 및 `.gall_comment`의 폭·높이·배경 초기화가 빠졌다. `post-main-fixes.js:2424` 이후 이전 보정은 retired다. 댓글 숫자 span에는 남은 광역 `.gall_comment` 규칙도 적용된다. 현재 stats322x57, 댓글166x53; 선택한 span 계약 임시 복원 시272x19/56x18로 바뀌고 제거 시 원복된다. |
| UI-09 | P2 | 스크랩 버튼 글자가 사라지고 빈 테두리/스프라이트만 보임 | `article-presenter.js:123`의 semantic 규칙보다 native `.gallview_head .gall_scrap > button`이 강하다. 실제 font-size0/color transparent/height17이며 새 배경 규칙으로 기존 sprite는 라이트에서 없어졌다. 문자·높이만 시험하면13px/32px로 보이고 제거 시0px/17px다. 다크 sprite 잔존은 별도 같은 cascade 문제다. |
| UI-10 | P1 | 다크 본문 이미지가 음화처럼 반전됨, 본문 색 보정도 정본과 다름 | 실제 `dark.css`의 `.darkmode .write_div {filter:invert(100%)}`가 살아 있다. `article-presenter.js:172`는 img의 filter를 해제하지만 조상 write_div의 합성 filter는 상쇄하지 못한다. 정본 조상은 none, 작업본은 invert(1). 조상만 임시 none으로 바꾸면 반전이 사라지고 제거하면 다시 생긴다. text color#444도 남으므로 filter 한 줄 변경을 완성 패치로 간주하면 안 된다. |
| UI-11 | P2 | 다크 추천 별 위에 다른 sprite가 겹치고 하단 동작줄에 회색 막대/잘림이 생김 | 새 recommendation/icon 규칙은 native dark sprite와 고정 action 높이를 충분히 대체하지 않는다. 실제 recommend-up-icon은 dark/sp_img_dark.png 배경을 유지한다. actions는646x36인데 패딩·버튼을 수용하지 못한다. 해당 배경/높이 임시 실험에서 sprite none, action 높이63이 되고 제거 시 돌아간다.980의 라이트 추천/댓글 겹침은390과 다르게 재현되지 않으므로 조건을 분리한다. |
| UI-12 | P2 | 댓글 입력·작성자칸·버튼에 낡은 테두리/색과 새 스타일이 섞임 | `comment-presenter.js:238`는 grid지만 `filter-module.js:512`의 남은 `.cmt_write_box {display:flex !important}`가 이긴다. textarea 등에는 `common.css`의 더 구체적인 색/테두리가 남는다. 실제 composer flex/identity200px; 임시 원인 실험에서는 grid/150px 및 입력의 테마 색으로 변하고 제거 시 되돌아간다. 실제 입력/등록 handler 실패는 입증하지 않았다. |
| UI-13 | P1 | 관리·직접 차단·백업·크기·단축키 창의 배경막이 일부만 덮음 | `settings-presenter.js:278,293,299,303,325`의 surface 단독 크기 규칙이 panel과 overlay 모두에 적용된다.980x2100에서 management overlay600x700, backup560x2100, manual440x2100, size/shortcut380x2100. 배경막 밖 hit는 native page에 도달한다. management overlay만 크기 규칙을 해제하면980x2100이고 panel400x500은 유지된다. 제거 시 재발한다. |
| UI-14 | P2 | 설정 종류별 지정 폭이 무시되고 여러 패널이540px로 같아짐 | 같은 파일의 일반 `[data-dcuf-surface][data-dcuf-role="panel"]` 폭 규칙(속성2개)이 종류별 `[data-dcuf-surface="..."]`(속성1개)보다 강하다. 크기380/직접차단440/편의440 등 선언이 있어도 실제540이다. 이는 배경막 축소와 같은 선택자 구분 실패의 반대편이다. 최종 크기를 승인한 것은 아니며 현재 코드가 선언한 종류별 폭을 구현하지 못함을 확인했다. |
| UI-15 | P2 | 말머리 직접 추가의 ‘추가’가 세로 두 줄이 됨 | `settings-presenter.js:234`의 `.dcuf-inline-actions > .dcuf-button {flex:1 1 0}`와 width100% 입력이 같이 공간을 쓴다. 버튼이44x60.59가 된다. 버튼 flex:none/nowrap와 입력 basis를 임시로 바꾸면58x44로 한 줄이 되고 제거 시44x60.59로 돌아간다. |

위15개는 증상/계약별 분류이며15개의 독립된 근본 원인이라는 뜻은 아니다. 같은 cascade 누락이 여러 증상을 만든다. 임시 스타일을 제품 코드에 그대로 덧붙이거나 important를 일괄 추가하는 해결책을 승인한 것도 아니다.

## 결함과 분리한 항목

- 목록 카드가 정본과 다른 평평한 형태인 것은 승인된 list spacing/radius/layout 변경 범위와 먼저 대조할 디자인 차이다. 그 자체를 깨짐이라고 단정하지 않는다. 이름 잘림/아이콘 누락/겹침은 별개다.
-980에서는 기본 header 검색창/탐색줄의 넓은 구성이 회복된다.390에서 둘 다 깨지는 header를 Lemur 실사용 결함으로 일반화하지 않는다.
- 글쓰기 제목/입력/에디터 폭은 실사이트 정본·작업본 모두 확보된다.980/screen412 설정은 기존 desktop-site-write mode를 켜며 zoom 약2.38이 걸리므로 스크린샷의 큰 글씨를 새로운 제품 결함으로 판정하면 안 된다. `.page_head`37px 고정 높이와 wrap된 action의 경계 문제는 양쪽에 남는 공유 관찰이다. 실제 Lemur 글쓰기 화면 배율은 미측정이다.
- 작고 짧은 창에서 내부 내용이 처음에 잘려 보인다고 바로 접근 불능으로 분류하지 않는다.390x520 백업창의 내부 스크롤로 하단 import 버튼을 노출할 수 있음을 확인했다. 등록/반입은 하지 않았다. 필터/백업 body의 스크롤과 disabled 입력의 옅은 표시를 회귀로 세지 않는다.
- 기본 FAB 메뉴·편의 설정·색상 선택·네이티브 대문/순위·현재 tip은 선택한980 상태에서 열렸다. 네이티브 팝업 내부 디자인은 기존 사이트 표현이므로 전면 재디자인 대상으로 확대하지 않는다. FAB가 답글 버튼을 덮는 fixture 스크롤 위치는 관찰했으나 양쪽 공통 위험으로 남기며 이번에 새로운 실사이트 handler 회귀로 판정하지 않는다.
- 정본 shortcut 촬영의 첫 실패는 ‘변경’과 ‘(변경)’ 버튼 표기 차이였다. 정본 라이트는 실제 표기로 재촬영했다. 정본 native tip은 클릭 뒤 original popup이 보이지 않는 관찰을 남겼으나 이는 새 작업본 회귀의 증거가 아니다. 다크 설정 중 페이지 새로고침으로 생긴 context-destroyed와 password/delete fixture에 dark helper가 없는 오류는 harness/setup 한계로 분류했다. 통과로 바꾸지 않았다.

## 검증이 놓친 범위

`testbed/fixtures/builders.mjs:7`의 writer는 img 없는 단순 span이다. `testbed/fixtures/pages.mjs:20`은 검색 select를 legacy 상자의 형제로 배치한다. 실제 사이트의 author badge, select ancestry, 외부 stylesheet specificity/dark ancestor filter와 다르다. 기존 `run-list-differential.mjs`는 identity/forms/traces/row 의미를 비교하며 정확한 presentation geometry는 raw 자료로 남기고 behavior equality에서는 제외한다고 선언한다. 그 통과로 실사이트 문구 가시성·형제 흐름·픽셀 구성을 승인할 수 없다. 실제로는 전체 화면을 정상으로 볼 근거가 부족했으며, 이 조사로 그 누락을 구체화했다.

다음 구현에서 필요한 최소 독립 확인은 native-shaped selector ancestry/CSS 경쟁, 양수 크기와 글자/장식 가시성, child/parent 및 sibling 배치, 첫/끝 페이지 접근성, overlay 전체 덮임과 외부 hit 차단, 조상 filter 합성, author media 보존이다. 동작·저장·기존 native node 계약은 그대로 보존해야 한다.

## 근거 위치와 한계

로컬 진단은 `artifacts/ui-overview-2026-10-17/comparison/audit/` 아래에 있다. `causes.json`(88 화면,7 임시 실험), `extra.json`(59 화면,2 조상-filter 실험), `counterfactuals.json`(8 임시 실험), `list-tail.json`(7 화면,4 실험), `final-checks.json`(부분 완료/오류 보존), `native-forms.json`(fixture 라이트 password/delete 및 light/dark leave-confirm8 화면, dark helper 미지원4건)을 구분한다. 일반 화면·댓글·입력·말머리·팝업 이미지를 직접 열어 비교했다. 캡처 개수만으로 모든 이미지를 시각 승인했다고 주장하지 않는다. 각 파일과 이미지의 해시는 로컬 `diagnosis-manifest.json`으로 결합한다.

driver와 로그는 `artifacts/ui-visual-audit-2026-10-17/`에 있다. 초기 읽기 중 JSON 저장 경합, 진단 스크립트 구문/인자 escaping 오류, live dark 전환의 navigation 및 fixture dark helper 차이는 제품 오류와 구분했다. 불완전 시도도 남기고 최종 재현 자료만 결론에 사용한다.

공개 live는 minor 중심·익명·blue/light/dark의 bounded audit다. 다른 갤러리 종류/인증 상태/사용자 데이터/모든 palette, 실제 Android 터치/키보드/줌, 현재 실제 Tampermonkey와 PC UI는 별도 미검증이다. 보고서 완료가 제품 전체 테스트 완료나15개 외 결함 부재를 보장하지 않는다.

다음 작업은 사용자의 구현 요청이 있을 때 위 원인별로 최소 변경과 실패 재현을 묶어 복구하는 것이다. 조사 요청에서 제품 소스·버전·기능은 수정하지 않았다. 기존 미완료 verifier/헤더 작업과 사용자 debug.log도 건드리지 않았다.
