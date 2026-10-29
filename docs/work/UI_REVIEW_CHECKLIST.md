# 전체 UI 디자인 검토 체크목록

작성일: 2026-10-18. 범위 재조정: 2026-10-28. 상태: **128개 ID 유지 / 가족별 근거 연결 / 확인된 두 root 마감·미확인 자식 분리**. 현재 판단은 B1_PREVIEW_DRAFT_FINISH.md와 CURRENT_STATE.md를 따른다. B1_INTEGRATED_UI_GAPS.md는 F87E 진단 범위를 보존한다.

사용자 요구: 대표 화면 네 장으로 끝내지 않고, 코드에 있는 화면·메뉴·팝업·입력창·상태를 전부 펼쳐 볼 수 있게 한다. 이 문서는 향후 UI 변경의 공통 목록이며 `UI_REPLACEABILITY_VALIDATION.md`의 Concept01 실구현 검토에도 사용한다. 기능 의미와 최종 증거 상태는 `FINAL_FEATURE_STATE_INVENTORY.md`, 구조·동작 계약은 `docs/ui-surface-contracts.md`, 과거15개 복구는 `UI_ALL_REPAIRS.md`와 후속 `UI_LIVE_REGRESSION_REPAIR.md`의 해당 runtime 범위로 보존한다. 이를 현재 고장 목록으로 되살리지 않는다. 별도 구현 대기열이나 새 테스트 체계를 만들지 않는다.

## 변경마다 필요한 범위만 선택

참조 우선순위(사용자2026-10-30): `UI_REFERENCE_GUARD.md`의 Current reference roles를 먼저 읽는다. 버튼 재질·테두리·글자/아이콘 등 디테일은 채택한 실제 메모 구현을 중시하고,생성 시안은 구도·배치 참고로 쓴다. 팝업 외곽/배경막과 기본 페이지의 읽기 밀도·배경은 역할에 맞게 조정한다. 생성 시안의 외곽 잘림·입력/도구/제출 겹침도 해당 부위를 확대해서 고치거나 별도 수정 참조로 교체한다. 이 확인은 바뀐 구성요소와 인접 영역에만 적용한다.

### 시안 생성 범위 — 사용자2026-10-29

기능·정보·테마 연동·사용성·네이티브 동작 계약을 보존하되, 기존 배치·크기·간격·모양·정보 묶음·시각 위계를 임의로 고정하지 않는다. 승인받은 메모 톤은 재질과 일관성의 기준이며 다른 화면의 구도까지 동결하는 지시가 아니다. 실제 작업 화면 전체를 검토해 효과가 있는 변화를 선택한다.

프롬프트에 사용자가 요청하지 않은 ‘동일 배치 유지’, ‘색/재질만 변경’, ‘기존 간격 그대로’ 같은 제한을 넣지 않는다. 반대로 변화량·새로움 자체도 성공 조건으로 삼지 않는다. 좋은 기존 요소는 유지하고 필요하면 크게 재배치한다. 사용자 명시 범위와 구체적인 기능·접근성 제약은 지킨다.

시안 전 현재 화면·채택한 톤·실제 기능을 확인하고, 생성 후에는 무엇을 바꿨거나 유지했고 왜 그런지 설명할 수 있어야 한다. 기존 화면과 비슷하다는 이유만으로 ‘개선할 곳이 없다’고 결론 내리지 않는다. 매번 여러 강제 변형안이나 전면 재작성 검증을 요구하는 절차는 아니다.

### 테마 강조색 연동 게이트 — 사용자2026-10-29

현재 메모 v7 렌더링을 다른 UI의 재질·톤 기준으로 채택했다. 앞으로 새로 만들거나 바꾸는 UI의 청록색 계열 **강조 역할**은 기존 테마 색설정에 연결되어야 한다. 청록색 hex를 다른 고정 hex로 바꾸는 방식으로 처리하지 않는다.

- 바뀐 화면의 강조 요소를 먼저 적는다: 선택 탭 글자·밑줄, 선택/정렬 버튼의 면·글자, 체크박스 체크색, 선택 행 배경, 주 버튼의 면·글자·테두리, 해당 포커스/호버 등 실제 변경 상태. 각 역할이 소비하는 기존 테마 토큰을 확인한다.
- 해당 화면만 주·야간에서 서로 다른 테마로 바꿔 **실제 렌더 색이 달라지는지** 본다. 대표 두 색으로 확인하고, 공통 색 토큰·버튼 재질·팔레트 경로 변경은 영향받는14색으로 확대한다. 실제 색상 설정 UI의 미리보기·저장·취소 경로를 합성 Testbed 저장소에서 확인한다. 소스 문자열이나 root 속성 강제 변경만으로 연동 통과를 선언하지 않는다.
- 사용자 지정 메모 색·색상 견본·본문/이미지 원색과 오류/경고 같은 의미 색은 강조색과 구별한다. 테마 때문에 덮어쓰지 않으며, 예외가 있으면 역할과 이유를 남긴다. 선택하지 않은 체크박스의 중립색까지 테마로 칠할 필요는 없다.
- 강조 역할 하나라도 고정색으로 남거나 저장/취소 후 일부만 갱신되면 해당 UI 마감을 보류한다. 현재 범위·팔레트·상태·예외를 근거에 남긴다. 무관한128개 전체 UI나 전체 제품 테스트를 반복하는 게이트는 아니다.

첫 실행 근거: `testbed/ui-b1-memo-palette-contract.mjs` / `B1 memo palette` 검사. 메모의 탭 글자·밑줄, 정렬 면·글자, 체크색, 선택 행, 등록 면·글자8역할을14색×주야간에서 실제 설정 UI로 확인한다. 다음 가족도 그 가족의 선택자로 같은 기준을 적용한다.

### 보조 요소의 기본 표현 — 사용자2026-10-29

자잘한 보조 메뉴·탭·필터·아이콘을 기본 상태부터 각각 상자/타원으로 감싸지 않는다. 텍스트·아이콘 중심으로 두고 호버·키보드 포커스·누름·선택 같은 상호작용 상태에서 필요한 강조 면/타원이 나타나게 한다. 선택의 지속 표시에는 밑줄·글자색·굵기도 사용할 수 있다. 클릭 의미와 충분한 투명 hit 영역,터치에서의 누름/선택 피드백을 유지한다. 주 행동·입력칸·실제 팝업 외곽 등 구분이 필요한 역할까지 무조건 무테로 만들지는 않는다. 각 화면 마감 시 기본/상호작용 상태를 함께 보고 테마 색 연동을 확인한다.

버튼 재질 공통 기준: `B1_CONTROL_MATERIAL.md` → 현재 채택한 메모 v7의 옅은 테마색 주 행동·차분한 보조 표현을 가족별로 이식한다. 메모/목록/헤더의 적용 범위는 각 최신 근거를 따르고, 아직 이식하지 않은 본문·댓글·작성·메뉴·설정·팝업은 기존 B1을 유지하다 해당 작업에서 바꾼다. 과거 v3/C885가 새 시안의 자동 정본으로 되살아나면 안 된다. 모양/크기/파괴적 동작/선택/비활성/포커스는 화면별 의미를 보존하고, 색상 견본·본문색·네이티브 인증창을 임의로 재도색하지 않는다. 변경한 버튼군과 인접/open 상태만 확인하며 이 지시가128개 전체 재검사를 뜻하지 않는다.

디자인 디테일은 `UI_VISUAL_REVIEW.md` → `UI_DESIGN_DETAIL_REVIEW.md`의 시안 기준·부위별 차이·수정·재비교 절차로 판단한다. 이 목록은 볼 상태를 고르는 용도이며, 항목을 펼쳤거나 기능 검사가 통과했다는 이유로 미적 완성도를 승인하지 않는다. 매번 전체 항목을 다시 검사하는 절차는 추가하지 않는다.

이 목록은 Concept01 이후에도 유지한다. UI 작업 진입 경로는 `AGENTS.md` → UI-maintainer skill의 필수 입력 `docs/ui-surface-contracts.md` → 이 문서다. 현재 작업은 `NEXT_TASK.md`에서 선택 ID와 근거를 기록한다. 코드에 UI 분기가 추가·삭제되면 이 목록도 함께 갱신한다.

**기본 모바일 환경:** 사용자가 채택한 `PHONE_VIEWPORT_PROFILE.md`를 먼저 읽는다. 화면412×1006 / 페이지 배치980×2306 / 실제 표시 배율0.420684278011322 / DPR2.625가 기본이다. 390/412 **레이아웃**은 별도 stress이며 기본 폰 환경으로 승격하지 않는다. 테스트 브라우저의 실제 readback과 배율·client 높이·엔진 차이를 기록한다. 이 환경 선택이 각 UI 상태의 검토 완료를 뜻하지 않는다.

- 국소 변경: 바꾼 owner/선택자/토큰/갱신 경로가 닿는 ID, 인접 컨트롤, 관련 X 공통 상태만 검사한다. 매번128항목 전수 검사는 하지 않는다.
- 공유 스타일·토큰·owner 변경: 영향을 받는 다른 화면과 팝업으로 확대한다. 변화 없는 작성/댓글/설정 전체를 관성적으로 재실행하지 않는다.
- 전면 디자인 적용·전체 UI 완료 판정: 그때 적용되는 전체 목록과 각 자식 상태를 펼쳐 검토한다. 미확인 네이티브 분기를 생략하거나 대표 팝업 하나로 완료하지 않는다.
- 증거에는 선택 ID, 제외한 무관 범위, 소스/런타임/fixture, 테마·폭, 실행 결과와 미확인을 남긴다. 변경으로 무효화된 증거만 갱신하며 최종 통합 검증은 별도다.

V-02–V-08의 두 root는 B1_PREVIEW_DRAFT_FINISH.md에서 마감했다. B1_INTEGRATED_UI_GAPS.md의 F87E 진단은 원인/미확인 자식의 역사적 근거이며 NEXT_TASK.md가 현재 하나의 실행 단위를 고른다. 과거 UI-01 복구는 완료된 역사적 범위다.

## 조사 범위와 체크 의미

- `build/targets.json`에 포함된 모바일·PC 합집합54개 JS 소스에서 UI 생성·HTML 주입·메뉴 등록·브라우저 대화상자 호출132곳을 조사했다. 중복 템플릿, DOM 처리용 임시 노드, 한 UI의 여러 자식 생성은 별도 제품 화면으로 세지 않았다. 빌드에 없는 `legacy-app.js`를 현재 UI로 세지 않는다.
- 원래 사이트가 만드는 UI는 생성 호출만으로 찾을 수 없어 header/article/comment/native-form/write-editor 어댑터와 관련 스타일·원래 이벤트 연결도 별도로 확인했다. 코드에서 범용으로 받는 팝업의 구체적 내용은 **호스트 확인 필요**다. 미확인 화면을 존재하지 않는 것으로 처리하지 않는다.
- 아래 상태는 **기존 scoped 근거의 라우터**다. “범위 근거”는 인용 문서/receipt의 명명된 자식·runtime만 뜻하며 행 전체 PASS가 아니다. “원본 미확인”은 관찰이 부족한 상태, NEEDS_WORK는 실제 관찰/현재 소스로 확인한 누락이다. C-07은 기능 부재 N/A, N 영역은 CSS 대상 밖이지만 기능/플랫폼 증거는 별도다. 기존 미캡처 표시는 이 근거로 교체했다.
- 전체 완료를 주장할 때 한 행에 여러 상태가 있으면 적용 자식마다 근거가 필요하다. 국소 변경은 실제 영향 자식만 고르고 unchanged 근거를 재사용한다. 한 상태를 찍고 전체 행을 완료하지 않는다. 미실행/환경 차단은 UNKNOWN, 실제 적용되지 않는 경우만 관찰 근거와 함께 N/A로 기록한다. 체크 완료는 해당 상태들의 화면, 접근 경로, 양의 크기/히트/포커스 및 필요한 동작 증거가 연결됐을 때만 가능하다.
- 조사 원본: `artifacts/ui-design-inventory-2026-10-18/source-survey.json`. 소스 파일 해시를 담은 정적 탐색 자료이며 실사이트 실행 증거가 아니다. 현재 소스/아티팩트 기준은 `CURRENT_STATE.md`에서 재확인한다.

## 공통 진입·초기화

| ID | UI | 여는 방법·조건 | 펼쳐볼 상태 | 근거 | 검토 상태 |
| --- | --- | --- | --- | --- | --- |
| G-01 | 초기 UI 준비 오버레이 | 목록/본문/글작성 초기 진입 | 지연 로딩, 완료 직전, 라이트/다크, 모션 감소 | BOOT | 기존 기능/복구 근거 보존; B1 전체 외형 판정 아님 → B1_INTEGRATED_UI_GAPS.md |
| G-02 | 복구/실패 배너와 Reload | 초기화 실패·시간 초과를 제어된 fixture에서 재현 | 목록/본문의 복구, 글작성 원본 사용, 복구 후 제거 | BOOT | 기존 기능/복구 근거 보존; B1 전체 외형 판정 아님 → B1_INTEGRATED_UI_GAPS.md |
| G-03 | Tampermonkey 메뉴 진입점 | 확장 메뉴 열기 | 필터 설정·유저 관리·버튼 원위치·버튼 크기·색상·모바일 편의기능, PC의5개 진입 | ENTRY | 확장 소유 메뉴는 CSS 대상 밖; 등록/진입과 제품 패널 범위를 구별 |
| G-04 | 기본/복구용 표시 경로 | presenter 유무와 소스의 fallback 분기 확인 | 같은 기능의 현대/기존 표시 경로; 실제 미적용은 근거 있는 N/A | SETTINGS, PERSONAL, TOOLS | 기존 fallback 보존; 대표 modern 화면으로 fallback 미적 완료 주장 안 함 |

## 헤더·탐색·갤러리 대문

| ID | UI | 여는 방법·조건 | 펼쳐볼 상태 | 근거 | 검토 상태 |
| --- | --- | --- | --- | --- | --- |
| H-01 | 사이트 헤더·통합 검색·로그인·야간 전환 | 목록/본문/수정 등 해당 페이지 | 로그인/비로그인, 긴 검색어, 포커스, 원래 전환 동작 | HEADER | 헤더/검색 범위 → B1_GALLERY_SEARCH_POPUPS.md; sign 구현 → B1_LOGIN_ENTRY_IMPLEMENTATION.md; 실제 인증/조건부 오류 별도 |
| H-02 | GNB 탐색 링크 | 원래 메뉴 탐색 | 선택/비선택, 작은 폭, 줄바꿈·가로 범위 | HEADER | 범위 근거 → B1_LIST_COHESION.md; 나머지 계정/페이지 조합 미확인 |
| H-03 | 최근 방문 목록·이전/다음·전체 | 최근 방문 화살표와 전체 버튼 | 짧음/긴 목록, 양 끝, 선택, 전체 버튼의 실제 열린 화면 | HEADER | 최근 메뉴/탭 범위 → B1_POPUP_POLISH.md + B1_LIST_COHESION.md; 모든 계정/데이터 변형은 별도 |
| H-04 | 갤러리 제목·종류 배지·갤러리 검색 | 메이저/마이너/미니 진입 | 긴 제목, 배지, 검색 폼, 페이지 종류별 헤더 | HEADER | 범위 근거 → B1_LIST_COHESION.md; 나머지 계정/페이지 조합 미확인 |
| H-05 | 갤러리 대문 열기/닫기 | 원래 대문 토글 | 닫힘/열림/재열기, 짧은 화면, 대문 없는 경로 | HEADER | 대문/순위/팁/연관 범위 → B1_GALLERY_SEARCH_POPUPS.md; 대표 root 밖 자식은 별도 |
| H-06 | 마이너 소개·대문 내부 | 마이너 대문 열기 | 내용 길이, 스크롤, 원래 내부 링크 | HEADER | 대문/순위/팁/연관 범위 → B1_GALLERY_SEARCH_POPUPS.md; 대표 root 밖 자식은 별도 |
| H-07 | 흥한갤 전체 순위 팝업 | 대문 → 전체 순위 | 열림/닫힘/긴 목록/재열기, 대문 닫힌 popup-only | HEADER | 대문/순위/팁/연관 범위 → B1_GALLERY_SEARCH_POPUPS.md; 대표 root 밖 자식은 별도 |
| H-08 | 순위 도움말/팁 팝업 | 순위 관련 원래 도움말 버튼 | 팁과 닫기, 화면 끝, 다른 대문 레이어 위 | HEADER | 대문/순위/팁/연관 범위 → B1_GALLERY_SEARCH_POPUPS.md; 대표 root 밖 자식은 별도 |
| H-09 | 연관 갤러리 팝업 | 제목 옆 연관 버튼 | 내용/스크롤/닫기, 목록의 개수 선택기와 겹침 | HEADER | 대문/순위/팁/연관 범위 → B1_GALLERY_SEARCH_POPUPS.md; 대표 root 밖 자식은 별도 |
| H-10 | 갤러리 이용안내·설정·기타 원래 메뉴 | 원래 제목 영역의 해당 버튼 | 각각의 실제 창·메뉴, 로그인 전제, 취소/닫기 | HEADER | 안내/설정 root 범위 → B1_GALLERY_SEARCH_POPUPS.md; 익명 설정6종/명명된 탭·색상·백업·안내·자짤 empty → B1_NATIVE_SETTINGS_CHILDREN.md;계정·실제 데이터/저장/업로드는 미확인 |
| H-11 | 메이저 추천 갤러리 캐러셀 | 메이저 대문의 원래 이전/다음 | 첫/중간/끝 페이지, 짧은 폭, 원래 링크 | HEADER | 범위 근거 → B1_LIST_COHESION.md; 나머지 계정/페이지 조합 미확인 |

## 글목록·검색·페이지 이동

| ID | UI | 여는 방법·조건 | 펼쳐볼 상태 | 근거 | 검토 상태 |
| --- | --- | --- | --- | --- | --- |
| L-01 | 게시물 행/카드 | 목록과 본문 하단 목록 | 일반/공지/설문/개념/말머리/댓글 수/이미지·영상 표시, 긴 제목 | LIST | 범위 근거 → B1_LIST_COHESION.md + B1_CONTROL_MATERIAL.md; 명명된 상태 한정 |
| L-02 | 작성자·고닉 배지·닉네임/IP | 게시물 작성자 영역 | 짧은/긴 이름, 고정닉/유동, 아이콘·배지 보존 | LIST, PERSONAL | 범위 근거 → B1_LIST_COHESION.md + B1_CONTROL_MATERIAL.md; 명명된 상태 한정 |
| L-03 | 작성자 원래 메뉴·메모 팝업 | 작성자 이름 클릭 | 메모/사용자 메뉴의 실제 분기, 닫기/재열기, 차단 선택 모드와 구분 | LIST, HOSTFIX | B1 메뉴·메모·색상창 마감 → B1_NATIVE_AUTHOR_FINISH.md; 9상태/실사이트 목록·본문 경로 범위,계정/저장 별도 |
| L-04 | 말머리 툴팁 | 말머리에 제목이 있는 행에 포인터 | 짧은/긴 설명, 화면 네 모서리, 사라짐 | LIST | 툴팁 경합 복구 → UI_LIVE_REGRESSION_REPAIR.md; 모든 화면 끝 변형 판정 아님 |
| L-05 | 전체/개념/공지·말머리 탭 | 목록 상단 | 선택·비선택, 많은/긴 항목, 작은 폭, 생략 상태·화살표 서랍 열기/닫기·항목 선택·폭 변경 후 복구, 원래 필터 동작. 긴 목록 실사이트 표본은 아래 참조 | LIST | 범위 근거 → B1_LIST_COHESION.md + B1_CONTROL_MATERIAL.md; 명명된 상태 한정 |
| L-06 | 페이지당 개수 선택 | 원래 개수 SELECT 열기 | 각 옵션, 현재 값, 네이티브 선택 UI·키보드 | LIST | 범위 근거 → B1_LIST_COHESION.md + B1_CONTROL_MATERIAL.md; 명명된 상태 한정 |
| L-07 | 페이지네이션 | 하단 페이지 이동 | 첫/마지막/현재/긴 페이지 범위, 양 끝 접근 | LIST | 범위 근거 → B1_LIST_COHESION.md + B1_CONTROL_MATERIAL.md; 명명된 상태 한정 |
| L-08 | 목록 검색 | 검색 종류 선택 → 입력/검색 | 종류 목록, 빈/긴 검색어, Enter/버튼, 실제 보조 검색 레이어 | LIST | 범위 근거 → B1_LIST_COHESION.md + B1_CONTROL_MATERIAL.md; 명명된 상태 한정 |
| L-09 | 상·하단 글쓰기·목록·이동 액션 | 목록 상단·목록/본문 하단 | 원래 버튼 조합, 단일행/줄바꿈, 검색과 간격 | LIST, ARTICLE | 범위 근거 → B1_LIST_COHESION.md + B1_CONTROL_MATERIAL.md; 명명된 상태 한정 |
| L-10 | 빈 목록·차단·지연 갱신 | 빈/전체 차단/행 추가 fixture | 빈 결과, 숨김, 다시 나타남, 본문 하단 임베디드 목록 | LIST | 기존 필터/동적 갱신 기능 근거 보존; 모든 빈/실패/차단 조합의 B1 외형 미확인 |

## 글 내용·미디어·글 액션

| ID | UI | 여는 방법·조건 | 펼쳐볼 상태 | 근거 | 검토 상태 |
| --- | --- | --- | --- | --- | --- |
| A-01 | 제목·말머리·작성자·날짜·조회/추천/댓글 | 본문 진입 | 긴 제목/작성자, 작은 폭, 버튼 인접 관계 | ARTICLE | 본문/액션 범위 → B1_CONTENT_TRIAL.md + B1_ARTICLE_ACTION_POPUPS.md; 전 자식 완료 아님 |
| A-02 | 본문 작성자 원래 팝업 | 본문 작성자 클릭 | 사용자 정보/메모 등 실제 메뉴, 화면 끝·다른 레이어와 겹침 | ARTICLE, HOSTFIX | B1 공통 표시+본문 회원 메뉴 원본-JS 재생(통계 합성) 히트 → B1_NATIVE_AUTHOR_FINISH.md; 실계정/전 자식 판정 아님 |
| A-03 | 본문 텍스트·링크·서식 | 짧은/긴 리치 콘텐츠 fixture | 줄바꿈/긴 URL/인용/표, 기본·작성자 지정 서식, 다크 가독성 | ARTICLE | 본문/액션 범위 → B1_CONTENT_TRIAL.md + B1_ARTICLE_ACTION_POPUPS.md; 전 자식 완료 아님 |
| A-04 | 이미지·GIF·동영상 등 본문 미디어 | 실제 크기 미디어가 있는 본문 | 작은/큰/늦게 로드/실패, 원래 색상, 화면 넘침 | ARTICLE, HOSTFIX | 본문 미디어 paper/원색 범위 → B1_CONTENT_TRIAL.md; 모든 형식·지연·실패 외형 미확인 |
| A-05 | 이미지 원래 뷰어·확대·이미지댓글 진입 | 본문 이미지의 원래 동작 | 실제 뷰어·이전/다음·닫기·이미지별 댓글 연결; 존재 여부 실사이트 확인 | ARTICLE, COMMENTS, HOSTFIX | 이미지댓글 진입/full → B1_IMAGE_COMMENTS.md; 원본 이미지 뷰어 자식은 미확인 |
| A-06 | 첨부 파일·이미지 하단 정보 | 첨부가 있는 본문 | 파일 목록, 긴 파일명, 다운로드 링크, 펼침 상태가 있으면 각각 | ARTICLE | 첨부 외곽 역할 적용 → B1_CONTENT_TRIAL.md; 실제 파일/펼침 변형 미확인 |
| A-07 | 추천/비추천·숫자·관련 버튼 | 본문 추천 영역 | 기본/상태 전환, 아이콘·네이티브 스프라이트 충돌, 좁은 폭 | ARTICLE | 추천 카드 여백/세로 정렬·폭148 마감 → B1_PREVIEW_DRAFT_FINISH.md; 원본 버튼/숫자·계정별 추천 결과는 보존/별도 |
| A-08 | 추천 CAPTCHA·관련 원래 팝업 | 제어된 fixture로 표시 | 이미지/입력/닫기/포커스, 실제 투표 없이 원래 동작 경계 | ARTICLE | CAPTCHA 관련 코드/fixture 경계 보존; 모든 native 조건부 외형 미확인 |
| A-09 | 펌/PUM 레이어 | 원래 펌 버튼/레이어 | `write_pum_layer` 열기·닫기·재열기, 화면 끝·짧은 창 | ARTICLE | PUM root/모델 범위 → B1_ARTICLE_ACTION_POPUPS.md; 원본 이력·말머리·결과 미확인 |
| A-10 | 스크랩 UI·결과/로그인 전제 창 | 원래 스크랩 버튼 | 라벨/아이콘, 해당 원래 메뉴·결과·로그인 요구 상태 | ARTICLE, HOSTFIX | guest 로그인 안내 범위 → B1_ARTICLE_ACTION_POPUPS.md; 계정 폴더/결과 iframe 미확인 |
| A-11 | 공유 메뉴 | 원래 공유 버튼 | 실제 공유 옵션과 보조 창 각각, 닫기, OS 공유 UI가 있으면 별도 구분 | ARTICLE, HOSTFIX | 공유 옵션 root 범위 → B1_ARTICLE_ACTION_POPUPS.md; 보조/OS 창 별도 |
| A-12 | 신고 메뉴·글 수정/삭제 진입 | 원래 신고/수정/삭제 버튼 | 각각의 실제 메뉴·계정 전제; 수정/삭제 화면은 W-19~22 연결 | ARTICLE, FORMS | 신고 root/수정삭제 진입 범위 → B1_ARTICLE_ACTION_POPUPS.md + B1_PASSWORD_PAGES.md; 권한/전송 결과 별도 |

## 댓글·대댓글·이미지댓글

| ID | UI | 여는 방법·조건 | 펼쳐볼 상태 | 근거 | 검토 상태 |
| --- | --- | --- | --- | --- | --- |
| C-01 | 일반 텍스트 댓글 | 본문의 일반 댓글 | 짧음/여러 줄/긴 URL·한국어/시간·IP·자기 작성자 표시, 작은 삭제 액션 | COMMENTS | 일반 댓글 paper/작은 삭제 마감 → B1_CONTENT_TRIAL.md + B1_IMAGE_COMMENTS.md; 미관 전 상태 승인 아님 |
| C-02 | 대댓글 묶음 | 원댓글 답글 열기 | 부모·자식 구분, 들여쓰기, 여러 대댓글, 열기/닫기/재열기 | COMMENTS | 일반/형제 대댓글 구조·들여쓰기 복구 → UI_LIVE_REGRESSION_REPAIR.md + B1_CONTENT_TRIAL.md |
| C-03 | 분리된 대댓글 | 호스트가 원댓글 다음 형제로 만드는 reply fixture | 원래 부모·형제 순서, 부모와 시각적 연결, 마지막 빈 부모 | COMMENTS | 일반/형제 대댓글 구조·들여쓰기 복구 → UI_LIVE_REGRESSION_REPAIR.md + B1_CONTENT_TRIAL.md |
| C-04 | 디시콘/이미지를 포함한 댓글 | 미디어가 있는 일반 댓글 | 텍스트+미디어, 디시콘 크기·종류, GIF가 있는 경우 재생·색상 | COMMENTS | 미디어/대댓글 역할 범위 → B1_CONTENT_TRIAL.md; 종류별 원본 재생·실패 외형 미확인 |
| C-05 | 미디어를 포함한 대댓글 | 답글 내부 미디어 fixture | 들여쓰기 안에서 실제 크기/넘침, 원래 작성자·액션 가시성 | COMMENTS | 미디어/대댓글 역할 범위 → B1_CONTENT_TRIAL.md; 종류별 원본 재생·실패 외형 미확인 |
| C-06 | 이미지마다 붙는 별도 댓글 영역 | 본문 이미지댓글 열기 | 이미지별 `img_comment_box` 구분, 접힘/펼침, 서로 다른 이미지의 댓글·카운트 | COMMENTS, HOSTFIX | 원본 fold→full/composer 관찰·합성 parity/작은 액션 마감 → B1_IMAGE_COMMENTS.md; 실제 전송/기기 별도 |
| C-07 | 이미지댓글 내부 대댓글 (존재하지 않음) | 해당 없음 | 일반 대댓글을 이미지댓글에 잘못 확장한 항목; 새 답글 UI를 만들지 않음 | 사용자 정정2026-10-28 + B1_IMAGE_COMMENTS.md의 원본 구조 | N/A · 이미지댓글에는 대댓글 없음; 오인 재발 방지용 ID 유지 |
| C-08 | 일반 댓글 입력창 | 기본 입력창 포커스 | 회원/비회원 이름·비밀번호 등 원래 필드, 빈/긴 입력, 포커스·오류 상태 | COMMENTS | 입력/대댓글 composer·지우기 액션 범위 → B1_CONTENT_TRIAL.md + B1_IMAGE_COMMENTS.md; 모든 권한/오류 자식 별도 |
| C-09 | 답글 입력창 | 특정 댓글의 답글 선택 | 대상 표시, 작은 composer, 취소/다른 대상/재열기, 원래 필드 | COMMENTS | 입력/대댓글 composer·지우기 액션 범위 → B1_CONTENT_TRIAL.md + B1_IMAGE_COMMENTS.md; 모든 권한/오류 자식 별도 |
| C-10 | 이미지댓글 입력창 | 해당 이미지댓글 열기 | 이름·원래 숨김 값·입력/등록, 일반/답글 창과 독립된 대상 | COMMENTS | 원본 fold→full/composer 관찰·합성 parity/작은 액션 마감 → B1_IMAGE_COMMENTS.md; 실제 전송/기기 별도 |
| C-11 | 댓글 디시콘 선택·첨부 관련 원래 도구 | 실제 댓글 입력 도구가 있는 경로 | 도구별 열린 창/선택/닫기/미리보기·제거가 실제 제공되면 각각 | COMMENTS, HOSTFIX | 글자콘/DCCon root → B1_POPUP_POLISH.md; native 탭/최근사용/계정 자식 미확인 |
| C-12 | 댓글 작성자 메뉴·메모 | 일반/대댓글/이미지댓글 작성자 클릭 | `user_data_lyr`·사용자 메뉴·추가 메뉴, 화면 가장자리, 차단 선택과 충돌 | COMMENTS, HOSTFIX | 공통 B1 표시/일반·이미지댓글 dark fixture 범위 → B1_NATIVE_AUTHOR_FINISH.md; 실제 댓글·권한/대댓글 전 상태는 미확인 |
| C-13 | 댓글 수정·삭제·비밀번호 팝업 | 원래 댓글 수정/삭제 버튼 | 본인/비회원 권한, 비밀번호 입력·닫기·재열기, 배경 위 양의 히트 영역 | COMMENTS, HOSTFIX | 작은 삭제/clear 마감 → B1_IMAGE_COMMENTS.md; 비밀번호 정적 구조만 확보 → B1_NATIVE_AUTHOR_PREFLIGHT.md,실제 권한/입력 미확인 |
| C-14 | 정렬·새로고침·더보기/페이징 | 해당 원래 댓글 제어 | 실제 제공되는 제어별 창/선택/로딩/새 댓글·카운트, 적용 여부 기록 | COMMENTS | 기존 정렬/새로고침/카운트 기능 경계 보존; 모든 native 로딩·더보기 분기 외형 미확인 |
| C-15 | 차단 댓글과 남은 대댓글 | 개인 차단·필터 fixture | 원댓글만 차단/대댓글만 차단/혼합, 숨겨진 부모 때문에 답글을 잃지 않음 | COMMENTS, PERSONAL | 기존 필터/재연결 기능 및 명명된 UI 범위 보존; 모든 상태 조합의 B1 미관 판정 아님 |
| C-16 | 빈/전체 차단/로딩·실패 댓글 | 빈 데이터·부분 실패 fixture | 안내·입력 가능 상태·재시도, 원래 실패 UI의 실제 형태 | COMMENTS | 빈/차단/실패의 모든 native 안내 외형 미확인; 대표 정상 댓글로 대체 안 함 |
| C-17 | 늦게 나타나는 댓글/이미지·루트 교체 | 동적 삽입·전체 교체 fixture | 들여쓰기·메뉴·입력 포커스/내용·정리 후 재연결, 중복 제어 없음 | COMMENTS | 기존 필터/재연결 기능 및 명명된 UI 범위 보존; 모든 상태 조합의 B1 미관 판정 아님 |
| C-18 | 실제 크기·부서진 댓글 미디어 | 큰 이미지/지연·실패 미디어 fixture | 일반/답글/이미지별 댓글에서 넘침·색상·닫기 가시성; 1×1 대체 이미지로 대체 금지 | COMMENTS | 실제 크기 합성 미디어/decoded 범위 → B1_IMAGE_COMMENTS.md; 모든 지연·실패·형식은 미확인 |

## 글작성·수정·삭제·편집기 레이어

| ID | UI | 여는 방법·조건 | 펼쳐볼 상태 | 근거 | 검토 상태 |
| --- | --- | --- | --- | --- | --- |
| W-01 | 제목·이름·비밀번호·CAPTCHA 입력 행 | 회원/비회원 글작성 | 실제 필드 조합, 검증 상태·포커스, 긴 입력·작은 폭 | FORMS | 작성 shell/공통 헤더 범위 → B1_WRITE_EDITOR_SHELL.md + B1_FORM_HEADER_REUSE.md; native 내부/권한 자식 별도 |
| W-02 | 말머리 선택·가로 끌기·설명 | 글작성 말머리 영역 | 많은 옵션/선택/설명·팁, 가로 이동, 원래 버튼 | FORMS, EDITOR | 작성 shell/공통 헤더 범위 → B1_WRITE_EDITOR_SHELL.md + B1_FORM_HEADER_REUSE.md; native 내부/권한 자식 별도 |
| W-03 | 본문 편집/HTML 원문 | 원래 HTML 모드 전환 | visual/source, 기존 내용·커서, 크기·스크롤·상태바 | FORMS, EDITOR | 작성 shell/공통 헤더 범위 → B1_WRITE_EDITOR_SHELL.md + B1_FORM_HEADER_REUSE.md; native 내부/권한 자식 별도 |
| W-04 | 기본/미디어/보조 편집 툴바 | 각각의 실제 툴바 | 줄바꿈/가로 끌기, 활성·비활성·선택·아이콘/툴팁, 포커스 | FORMS, EDITOR | 작성 shell/공통 헤더 범위 → B1_WRITE_EDITOR_SHELL.md + B1_FORM_HEADER_REUSE.md; native 내부/권한 자식 별도 |
| W-05 | 글꼴 메뉴 | 글꼴 드롭다운 열기 | 현재 선택·체크,18개 DCUF 옵션·원래 옵션 보존, 길이·스크롤 | EDITOR | 합성18개/원본 보존·재질 → B1_EDITOR_MENUS.md; 실제 Summernote 편집 자식 별도 |
| W-06 | 글자 크기 메뉴 | 글자 크기 드롭다운 | 각 실제 옵션·현재 값·선택 후 닫기 | EDITOR | 합성 원본 옵션·재질 → B1_EDITOR_MENUS.md; 실제 Summernote 선택/편집 자식 별도 |
| W-07 | 글자/배경 색상 메뉴 | 원래 색상 버튼 | 각각의 색상 격자·현재색·열림 위치·서브메뉴 | EDITOR | 합성2격자/원래 가로 스크롤 → B1_EDITOR_MENUS.md; native 색상 하위창 미확인 |
| W-08 | 문단·정렬·목록 메뉴 | 문단 관련 버튼 | 각 실제 하위 제어·선택 상태, 열린 메뉴와 입력 영역 | EDITOR | 합성4정렬·재질 → B1_EDITOR_MENUS.md; native 목록 하위 제어 미확인 |
| W-09 | 줄 간격 메뉴 | 줄 간격 버튼 | 실제 옵션·선택/닫기·화면 하단 위치 | EDITOR | 합성 원본 옵션·재질 → B1_EDITOR_MENUS.md; 실제 Summernote 선택/편집 자식 별도 |
| W-10 | 표 선택 메뉴 | 표 삽입 버튼 | 행/열 선택 격자·선택 피드백·넘침 | EDITOR | 합성 표 외곽/원본 클릭 → B1_EDITOR_MENUS.md; 실제 native 선택 피드백 미확인 |
| W-11 | 기타 툴바 원래 팝업·popover·modal | 실제 툴바 각각의 버튼 | 링크/이미지 등 **실제로 노출되는 각 종류를 별도 자식 항목으로 확정**; 범용 selector 하나로 완료 금지 | EDITOR, FORMS | 기타 in-document 링크/modal/popover 자식 원본 미확인; 외부 업로드4문서는 DEFERRED_USER_ACCEPTED → B1_EDITOR_MENUS.md |
| W-12 | 디시콘 선택창 | 원래 디시콘 버튼 | 툴바 내부/외부 `div_con`, 실제 탭·항목·닫기, 원래 선택 이벤트 | EDITOR | 외부 DCCon 역할은 존재; 실제 선택기 내부 원본 미확인 → B1_INTEGRATED_UI_GAPS.md |
| W-13 | 파일 첨부·업로드 목록 | 첨부 파일 선택 | 기본/여러 파일·긴 파일명/미리보기/항목별 원래 제어·실패·진행 상태가 있으면 각각 | FORMS | 첨부/AI 외곽 역할 → B1_WRITE_EDITOR_SHELL.md; 실제 내부/진행/결과/오류 미확인; 업로드/생성 미실행 |
| W-14 | AI 간편 작성 레이어 | 원래 AI 도구 열기 | 프롬프트·이미지 입력·실행/닫기, 각 필드·실제 결과/오류가 있으면 별도 | FORMS | 첨부/AI 외곽 역할 → B1_WRITE_EDITOR_SHELL.md; 실제 내부/진행/결과/오류 미확인; 업로드/생성 미실행 |
| W-15 | 글작성 옵션/PUMX | 작성 옵션 펼치기 | 꺼짐/켜짐·선택된 값·설명·줄바꿈 | FORMS | 작성 shell/공통 헤더 범위 → B1_WRITE_EDITOR_SHELL.md + B1_FORM_HEADER_REUSE.md; native 내부/권한 자식 별도 |
| W-16 | 성인/추가 원래 옵션 | 해당 옵션이 있는 작성 경로 | 노출/선택·비활성, 실제 존재하지 않는 경우 근거 있는 N/A | FORMS | 추가 옵션 실제 경로/권한 자식 미확인; 부재 추정으로 N/A 처리 안 함 |
| W-17 | 하단 작성 액션 행 | 작성/수정 화면 하단 | 취소/등록 등 원래 조합, 로딩·비활성·짧은 화면, 고정/인접 영역 | FORMS | 작성 shell/공통 헤더 범위 → B1_WRITE_EDITOR_SHELL.md + B1_FORM_HEADER_REUSE.md; native 내부/권한 자식 별도 |
| W-18 | 페이지 이탈 확인창 | 작성 중 원래 이탈 동작 | `leave_confirm_box` 열기/유지/취소/닫기/재열기, 키보드·스크롤 | FORMS | 이탈 확인 root/제어 범위 → B1_WRITE_EDITOR_SHELL.md; 모든 native 이탈/오류 분기 완료 아님 |
| W-19 | 글 수정 편집 화면 | 실제 수정 편집 경로 | 기존 제목/말머리/본문·첨부·편집기, 작성과 다른 상태 | FORMS, EDITOR | 작성 shell/공통 헤더 범위 → B1_WRITE_EDITOR_SHELL.md + B1_FORM_HEADER_REUSE.md; native 내부/권한 자식 별도 |
| W-20 | 비회원 수정 비밀번호 | 비회원 수정 진입 | `.no_memberwrap` 폼·비밀번호·확인/취소·오류 상태 | FORMS | 비회원 비밀번호 페이지/헤더 → B1_PASSWORD_PAGES.md + B1_FORM_HEADER_REUSE.md; 실제 인증/오류 별도 |
| W-21 | 비회원 삭제 비밀번호 | 비회원 삭제 진입 | 원래 폼·필드·확인/취소·Enter, 실제 삭제 없이 fixture | FORMS | 비회원 비밀번호 페이지/헤더 → B1_PASSWORD_PAGES.md + B1_FORM_HEADER_REUSE.md; 실제 인증/오류 별도 |
| W-22 | 회원 삭제 확인 | 회원 삭제 진입 | `.pop_wrap.type5`/확인·취소·닫기·재열기, 원래 한 번의 동작 경계 | FORMS | 삭제 확인의 모델/root 범위 → B1_PASSWORD_PAGES.md; 실제 회원/삭제 전송 미실행 |
| W-23 | 글작성 원래 숨김 크롬·광고 정리 후 화면 | 작성/수정·지연 광고 fixture | 의도한 원래 제어는 남고 빈 공간·가려진 입력이 없음을 확인 | FORMS, HOSTFIX | 작성 shell/공통 헤더 범위 → B1_WRITE_EDITOR_SHELL.md + B1_FORM_HEADER_REUSE.md; native 내부/권한 자식 별도 |
| W-24 | 데스크톱 사이트 모드·편집 레이어 위치 | 모바일의 실제 viewport 조건 및 제어된 stress | 확대/스크롤/툴바 끌기 뒤 열린 모든 메뉴, 화면 끝·짧은 화면 | EDITOR | 작성 shell/공통 헤더 범위 → B1_WRITE_EDITOR_SHELL.md + B1_FORM_HEADER_REUSE.md; native 내부/권한 자식 별도 |

## 필터·말머리·단축키·색상 설정

| ID | UI | 여는 방법·조건 | 펼쳐볼 상태 | 근거 | 검토 상태 |
| --- | --- | --- | --- | --- | --- |
| S-01 | 글·댓글 필터 설정 전체 패널 | FAB/확장 메뉴/단축키 | 기본/전체 필터 끄기/개념글 제외, 내부 스크롤·저장·닫기·재열기 | SETTINGS | 소유 패널/재질 범위 → B1_GLASS_TRANSMISSION.md; 모든 자식 완료 아님 |
| S-02 | 글+댓글 합 기준값 | 설정 기준값 영역 | 빈/0/양수·경계값·긴 숫자, 활성/비활성 | SETTINGS | 소유 패널/재질 범위 → B1_GLASS_TRANSMISSION.md; 모든 자식 완료 아님 |
| S-03 | 유동·통신사·우회 IP 제어 | 설정 네트워크 영역 | 스위치 각각, 우회 모드3개와 안내·선택 상태 | SETTINGS | 소유 패널/재질 범위 → B1_GLASS_TRANSMISSION.md; 모든 자식 완료 아님 |
| S-04 | 글/댓글 비율 제어 | 비율 필터 켜기 | 꺼짐/켜짐, 최소/최대 비율·건너뛰기 기준·안내, 유효/빈 값 | SETTINGS | 소유 패널/재질 범위 → B1_GLASS_TRANSMISSION.md; 모든 자식 완료 아님 |
| S-05 | 펌 차단·추가 설정 연결 | 설정 하단 | 펌 스위치·말머리 관리 진입, 긴 설명·비활성 상태 | SETTINGS | 소유 패널/재질 범위 → B1_GLASS_TRANSMISSION.md; 모든 자식 완료 아님 |
| S-06 | 단축키 변경 모달 | 설정 하단 변경 | 입력 대기/조합 키·미리보기/유효하지 않은 입력, 변경·취소·Escape | SETTINGS | 명명된 단축키/말머리 입력 자식 → B1_OWNED_INPUT_CHILDREN.md; 미관·키 변형 전수 판정 아님 |
| S-07 | 갤러리별 말머리 관리 | 필터 설정 → 말머리 관리 | 현재 갤러리 키, 발견한 항목·선택·전체 해제, 항목 없음 | SETTINGS | 명명된 단축키/말머리 입력 자식 → B1_OWNED_INPUT_CHILDREN.md; 미관·키 변형 전수 판정 아님 |
| S-08 | 말머리 직접 추가·다른 갤러리 규칙 | 같은 관리창 하단 | 입력/추가·긴 말머리·저장된 다른 갤러리/삭제, 갤러리 판별 실패로 비활성 | SETTINGS | 명명된 단축키/말머리 입력 자식 → B1_OWNED_INPUT_CHILDREN.md; 미관·키 변형 전수 판정 아님 |
| S-09 | 색상 프리셋 선택창 | 확장 메뉴 UI 색상 설정 |14개 옵션 각각·현재 체크, 전체 UI 미리보기, 기본값/취소/저장 | THEME | 14색/미리보기 및 패널 범위 → B1_GLASS_TRANSMISSION.md + B1_CONTROL_MATERIAL.md |
| S-10 | 색상 저장 중/실패 | 색상 저장의 제어된 지연/거부 | 버튼 비활성·오류 안내·재시도·포커스 복귀, 늦은 초기 읽기 후 복원 | THEME | 저장 중/실패/재시도 범위 → B1_OWNED_CONDITIONAL_FINISH.md; 모든 플랫폼 실패 별도 |
| S-11 | 모바일 편의기능 설정 | 확장 메뉴 | 마지막 글 표시·초안 저장/복구·글 미리보기 스위치 각각, 독립된 마스터 의미 | TOOLS | 편의 설정 root는 B1 적용 → B1_GLASS_TRANSMISSION.md; 미리보기/초안은 별도 V-02–08 수정 필요 |
| S-12 | 패널 이동·크기 조절 | 해당 설정창 헤더/리사이즈 핸들 | 드래그/리사이즈·짧은 창·화면 끝, 내부 스크롤·닫기 가시성 | SETTINGS, GEOMETRY | 기존 이동/크기 owner·명명된 layout 범위 → B1_GLASS_TRANSMISSION.md; 전체 기기 제스처 별도 |

## 개인 차단·플로팅 메뉴·백업

| ID | UI | 여는 방법·조건 | 펼쳐볼 상태 | 근거 | 검토 상태 |
| --- | --- | --- | --- | --- | --- |
| P-01 | 플로팅 메뉴 버튼 | 목록/본문 | 기본/이동·크기 변경/화면 끝·원위치, 원래 입력을 가리지 않음 | PERSONAL | 소유 패널/중첩 재질 범위 → B1_GLASS_TRANSMISSION.md; 모든 자식 완료 아님 |
| P-02 | 플로팅 메뉴 펼침 | 메뉴 버튼 클릭 | 빠른 차단·직접 차단·필터 설정·유저 관리4개 항목, 외부/Escape 닫기 | PERSONAL | 소유 패널/중첩 재질 범위 → B1_GLASS_TRANSMISSION.md; 모든 자식 완료 아님 |
| P-03 | 작성자 선택 모드 안내 | 메뉴 → 화면에서 차단 | 선택 대상 강조·안내·선택 취소, 목록/본문/일반·이미지댓글 각각 | PERSONAL | 소유 패널/중첩 재질 범위 → B1_GLASS_TRANSMISSION.md; 모든 자식 완료 아님 |
| P-04 | 작성자 차단/해제 선택창 | 선택 모드에서 작성자 클릭 | 닉네임·UID·IP 유무별 항목, 이미 차단된 값의 해제, 긴 이름·취소 | PERSONAL | 작성자 값별 선택/취소 범위 → B1_OWNED_INPUT_CHILDREN.md; native 작성자 메뉴 L-03과 구별 |
| P-05 | 직접 차단 패널 | 메뉴 → 직접 차단 | UID/닉네임/IP3개 탭, UID의 추가 표시 이름 필드·각 설명 | PERSONAL | 소유 패널/중첩 재질 범위 → B1_GLASS_TRANSMISSION.md; 모든 자식 완료 아님 |
| P-06 | 직접 차단 상태 안내 | 빈 값/중복/지연/실패를 fixture에서 재현 | 입력 요구·중복·추가 중·성공·개인 차단 OFF 안내·저장 실패 | PERSONAL | 명명된 안내/빈 결과/선택/중첩/닫기 범위 → B1_OWNED_CONDITIONAL_FINISH.md; 전 조합 완료 아님 |
| P-07 | 차단 유저 관리 패널 | 메뉴/확장 메뉴 | UID/닉네임/IP3개 탭, 수·각 행·긴 이름·빈 목록 | PERSONAL | 명명된 안내/빈 결과/선택/중첩/닫기 범위 → B1_OWNED_CONDITIONAL_FINISH.md; 전 조합 완료 아님 |
| P-08 | 관리 검색·검색 결과 없음 | 관리 검색 입력 | 각 탭 필터·빈/긴 검색어·일치 없음·검색 해제 | PERSONAL | 명명된 안내/빈 결과/선택/중첩/닫기 범위 → B1_OWNED_CONDITIONAL_FINISH.md; 전 조합 완료 아님 |
| P-09 | 관리 행 선택·삭제 예정 | 관리 항목/전체 선택 | 개별 선택·해제·현재 탭 전체·모든 탭 전체·저장 전 표시 | PERSONAL | 명명된 안내/빈 결과/선택/중첩/닫기 범위 → B1_OWNED_CONDITIONAL_FINISH.md; 전 조합 완료 아님 |
| P-10 | 개인 차단 켜기/끄기 | 관리 상단 스위치 | 켜짐/꺼짐·목록 유지·보이는 상태 피드백 | PERSONAL | 소유 패널/중첩 재질 범위 → B1_GLASS_TRANSMISSION.md; 모든 자식 완료 아님 |
| P-11 | 관리창 위 직접 추가·백업 중첩 | 관리 → 직접 추가/백업 | 각각의 자식 창·배경 전체 차단·닫은 뒤 부모 검색/탭/선택 상태 | PERSONAL, GEOMETRY | 명명된 안내/빈 결과/선택/중첩/닫기 범위 → B1_OWNED_CONDITIONAL_FINISH.md; 전 조합 완료 아님 |
| P-12 | 백업 내보내기/가져오기 | 관리 → 백업 | JSON 입력·큰 합성 목록·파일/클립보드/직접 입력·병합 결과 | PERSONAL | 합성 text/file 병합·형식 거부 → B1_OWNED_INPUT_CHILDREN.md; OS clipboard/export/file-read 실패 별도 |
| P-13 | 메뉴 버튼 크기 조절 | 확장 메뉴 → 크기 | 최솟값/중간/최댓값·실시간 미리보기·기본값/취소/저장 | PERSONAL | 크기60/160 미리보기/취소 범위 → B1_OWNED_INPUT_CHILDREN.md; 전 기기 제스처 별도 |
| P-14 | 개인 차단 창 닫기/재열기 | 각 창의 해당 원래 닫기 경로 | 헤더/버튼/배경/Escape 지원별·중첩·내부 스크롤·드래그; 미지원 동작을 만들어내지 않음 | PERSONAL, GEOMETRY | 명명된 안내/빈 결과/선택/중첩/닫기 범위 → B1_OWNED_CONDITIONAL_FINISH.md; 전 조합 완료 아님 |

## 미리보기·읽은 글 표시·초안 알림

| ID | UI | 여는 방법·조건 | 펼쳐볼 상태 | 근거 | 검토 상태 |
| --- | --- | --- | --- | --- | --- |
| V-01 | 마지막으로 열어본 글 표시 | 글 열기 → 목록 복귀 | 표시/옵션OFF/대상 없음, 목록 교체 후 같은 글·스크롤 복귀 | TOOLS | 읽은 글 표시/옵션 기존 기능·목록 범위 → UI_LIVE_REGRESSION_REPAIR.md + B1_LIST_COHESION.md |
| V-02 | 글 미리보기 패널·헤더 | 미리보기 ON → hover/터치 길게 누르기 | 포인터/터치·원문 열기·닫기·화면 끝·배경 스크롤 | TOOLS | 미리보기 B1 chrome/링크/닫기 마감 → B1_PREVIEW_DRAFT_FINISH.md; light/dark·anchor/sheet·좁은 proxy 범위 |
| V-03 | 미리보기 로딩/내용/빈 상태 | 제어된 fetch/캐시 | 로딩→성공/본문 없음·긴 내용·캐시 적중·다른 글로 전환 | TOOLS | 공통 preview root B1 적용·기존 정제/캐시/전환 동작 유지 → B1_PREVIEW_DRAFT_FINISH.md; 모든 로딩/빈 자식 외형 완료 아님 |
| V-04 | 미리보기 이미지·대체 링크 | 미디어가 있는 미리보기 | 실제 크기/지연/실패 이미지·원문 링크, 원문에서 보도록 대체된 미디어 | TOOLS | decoded640×240 미디어/paper 확인 → B1_PREVIEW_DRAFT_FINISH.md; 모든 형식·지연/실패 시각 변형 별도 |
| V-05 | 미리보기 실패·닫은 뒤 응답 | 제어된 fetch 실패/지연 | 오류 안내·긴 오류문·재열기·닫힌 패널에 늦은 응답이 붙지 않음 | TOOLS | 기존 close/abort/지연응답 계약 재대조 → B1_PREVIEW_DRAFT_FINISH.md; 모든 오류 문구 시각 완료 아님 |
| V-06 | 초안 자동 복구·중단된 등록 복구 배너 | 저장된 합성 초안으로 작성 진입 | 자동 복구/미완료 등록 복구·닫기·여러 행 메시지 | DRAFT | 공통 B1 알림/닫기 적용 → B1_PREVIEW_DRAFT_FINISH.md; 실제 자동복구/중단 메시지 전수 시각 판정 아님 |
| V-07 | 기존 내용과 저장 초안 충돌 | 내용 있는 폼+다른 저장 초안 | 덮어쓰지 않았다는 안내·복구/삭제 등 코드에 있는 각 액션·닫기 | DRAFT | 합성 conflict light/dark·기존 입력/닫기·typed action 보존 확인 → B1_PREVIEW_DRAFT_FINISH.md |
| V-08 | 초안 크기 초과·제출 직전 저장 실패 배너 |512KiB 초과/저장 거부 fixture | 각 메시지·긴 오류문·폴백 상태, 입력/등록을 가리지 않음 | DRAFT | 공통 B1 피드백/긴 오류390×560 wrap/닫기 확인 → B1_PREVIEW_DRAFT_FINISH.md; 모든 저장 실패 자식 별도 |

## 브라우저·확장·OS가 소유한 대화상자

이 영역은 목록에서 빠뜨리지 않되 DCUF CSS로 새 모양을 만드는 대상은 아니다. 제어된 fixture와 합성 데이터로 안전하게 확인한다.

| ID | UI | 여는 방법·조건 | 펼쳐볼 상태 | 근거 | 검토 상태 |
| --- | --- | --- | --- | --- | --- |
| N-01 | 필터 저장 실패 alert | 필터 설정 저장 거부 fixture | 전체 메시지·닫기·원래 패널 복귀 | SETTINGS | 브라우저/OS 소유 · CSS 재디자인 대상 밖; 기능·플랫폼 미확인은 별도 |
| N-02 | 잘못된 단축키 alert | 단축키 미입력/잘못된 값 | 메시지·닫은 뒤 키 입력/포커스 | SETTINGS | 브라우저 alert · CSS 대상 밖; native invalid 범위 → B1_OWNED_INPUT_CHILDREN.md |
| N-03 | 플로팅 버튼 비지원 페이지 alert | 원위치 메뉴의 비지원 경로 | 안내·확장 메뉴 진입 관계 | PERSONAL, ENTRY | 브라우저/OS 소유 · CSS 재디자인 대상 밖; 기능·플랫폼 미확인은 별도 |
| N-04 | 백업 export/copy 알림 | 합성 백업 다운로드/복사 fixture | 다운로드 시작·복사 성공·복사 실패 메시지 각각 | PERSONAL | 브라우저/OS 소유 · CSS 재디자인 대상 밖; 기능·플랫폼 미확인은 별도 |
| N-05 | 백업 import 오류·성공 알림 | 합성 빈 값/잘못된 JSON/정상/파일 읽기 실패 | 데이터 없음·형식 오류·병합 성공·파일 읽기 오류 각각 | PERSONAL | 브라우저 alert · CSS 대상 밖; invalid/합성 merge 범위 → B1_OWNED_INPUT_CHILDREN.md; file-read 실패 별도 |
| N-06 | 모든 초안 삭제 confirm | 편의기능 설정 → 초안 삭제 | 확인/취소·부모 창 복귀·긴 메시지 | TOOLS | 브라우저/OS 소유 · CSS 재디자인 대상 밖; 기능·플랫폼 미확인은 별도 |
| N-07 | 파일 선택·다운로드·클립보드 경계 | 작성 첨부/AI 이미지/백업 파일 | 각 진입의 원래 picker·취소/실패·복귀, 브라우저 소유임을 표시 | FORMS, PERSONAL, TOOLS | 브라우저/OS 소유 · CSS 재디자인 대상 밖; 기능·플랫폼 미확인은 별도 |

## 모든 UI에 적용할 공통 상태

| ID | 확인 축 | 필수 확인 내용 | 검토 상태 |
| --- | --- | --- | --- |
| X-01 | 테마·색상 | 라이트/다크·14개 팔레트 적용, 선택/비선택·성공/오류·비활성 구분·미디어 원래 색상 | 가족별 receipt의 선택 상태만 근거 재사용; 전체 UI 통합 축은 UNKNOWN → B1_INTEGRATED_UI_GAPS.md |
| X-02 | 화면 폭·높이·확대 | 기본 `PHONE_VIEWPORT_PROFILE.md`: screen412×1006/layout980×2306/scale0.420684/DPR2.625. 390/412 layout stress·짧은/긴 창은 별도 표기; 실제 readback과 proxy 차이 기록 | 980×2306 phone-layout proxy/선택 stress 범위; 실제 scale/DPR/device 차이 유지 → PHONE_VIEWPORT_PROFILE.md |
| X-03 | 입력·접근 | 포인터/터치/키보드, 보이는 포커스·원래 라벨·양의 히트 영역·탭 순서·닫은 뒤 복귀 | 가족별 receipt의 선택 상태만 근거 재사용; 전체 UI 통합 축은 UNKNOWN → B1_INTEGRATED_UI_GAPS.md |
| X-04 | 계정·갤러리·페이지 | 메이저/마이너/미니, 회원/비회원·본인/타인, 목록/본문/작성/수정/삭제의 실제 적용 여부 | 원래 gallery/form/login 명명 경로 범위; 실제 계정/본인/권한 조합 UNKNOWN |
| X-05 | 레이어 맥락 | 각 창의 뒤 배경·가리는 형제, 원래 가능한 중첩, backdrop 전체 범위, 닫기·내부 스크롤·외부 클릭 | 가족별 receipt의 선택 상태만 근거 재사용; 전체 UI 통합 축은 UNKNOWN → B1_INTEGRATED_UI_GAPS.md |
| X-06 | 콘텐츠·데이터 | 빈/하나/많음·긴 한국어/URL/이름·실제 크기 이미지·로딩/오류·비활성·새 결과 | 가족별 receipt의 선택 상태만 근거 재사용; 전체 UI 통합 축은 UNKNOWN → B1_INTEGRATED_UI_GAPS.md |
| X-07 | 재연결·복원 | 열기/닫기/재열기·동적 교체·취소/원래 UI 복원, 중복 버튼·이벤트·스크롤 잠금 없음 | 가족별 receipt의 선택 상태만 근거 재사용; 전체 UI 통합 축은 UNKNOWN → B1_INTEGRATED_UI_GAPS.md |
| X-08 | 공유 PC UI | 공유 필터/관리/팔레트 UI와 설정 의미 검증, 모바일 호스트 CSS의 PC 유출 금지 | 공유 presenter/PC fallback 범위 유지; login pure-theme exact parity → B1_LOGIN_ENTRY_IMPLEMENTATION.md; 이번 PC 재검사 없음 |

## 디자인 검토에서 전부 꺼내 보는 방법

1. 기존 비교 갤러리를 확장한다. 각 ID 아래에 **기존/새 디자인, 열림/닫힘, 적용되는 자식 상태와 테마**의 썸네일·원본 확대 링크를 넣는다. 카테고리·상태·미확인 필터와 항목별 진입 절차를 제공한다. 대표 화면4장이나 모달 기본 상태 한 장으로 목록을 대신하지 않는다.
2. 각 캡처에는 코드/아티팩트 해시, route·인증·테마·viewport·scale·UI 상태, 실제/fixture 구분을 붙인다. 표의 호스트 확인 필요 항목은 실제 원래 버튼을 열어 구체적 메뉴/창을 확인하고 자식 ID로 확정한다. 신규 팝업을 발견하면 목록에 추가한 뒤 검토한다.
3. 원래 구조·트리거는 기존 guarded fixture/differential/capture 도구에서 재사용한다. 일부 fixture의1×1 대체 GIF는 실제 미디어 외형 증거가 아니다. B1_IMAGE_COMMENTS.md의 decoded 실크기 범위는 재사용하고, 미관이 미확인인 형식·지연·실패만 따로 고른다. 합성 테스트와 실제 Chrome/Tampermonkey 관찰은 명확히 구분한다.
4. 새 디자인 완료 판정 전 모든 적용 항목/자식 상태가 열려 보이고, 동작·히트·포커스·배경 관계가 검토돼야 한다. 미캡처·호스트 미확인·테스트 매핑 필요·FAIL·필수 UNKNOWN이 남으면 전체 UI 검토 완료라고 하지 않는다. N/A는 원래 제공되지 않는 경로/기능이라는 근거가 필요하다.
5. live에서는 기존 승인된 공개 읽기·열기/닫기 경로를 사용한다. 게시/투표/삭제/사용자 데이터 변경은 기존 통제된 fixture/권한 범위에서만 다룬다. 이 목록은 추가 계정·게시·릴리스 권한을 부여하지 않는다.

## 소스 근거 라우터

각 행의 근거 키는 다음 실제 빌드 소스를 가리킨다. 전체 DOM 복제 사전이 아니라 UI 진입/상태 조사 위치다.

- BOOT: `src/runtime/bootstrap.js` — 준비 오버레이·복구 배너.
- ENTRY: `src/targets/mobile/ui-module.js`, `src/targets/pc/filter-entry.js` — 확장 메뉴 등록·진입.
- SETTINGS: `src/targets/shared/settings-presenter.js`, `src/targets/shared/filter-settings-host-adapter.js`, `src/targets/shared/filter-ui-style.js` — 필터/말머리/단축키와 표시 상태.
- PERSONAL: `src/targets/shared/personal-block-host-adapter.js`, `src/targets/shared/personal-block-module.js`, `src/targets/shared/settings-presenter.js` — FAB/선택/직접 차단/관리/백업/크기와 알림.
- THEME: `src/targets/shared/theme-presenter.js`, `src/targets/shared/theme-host-port.js`, `src/targets/shared/settings-presenter.js` —14개 팔레트·저장/취소·오류.
- TOOLS: `src/targets/mobile/convenience-module.js`, `src/targets/mobile/convenience-host-adapter.js` — 편의 설정·읽은 글·미리보기와 상태.
- DRAFT: `src/targets/mobile/write-draft-host-adapter.js`, `src/targets/mobile/convenience-module.js` — 초안 배너·복구·크기/저장 실패.
- LIST: `src/targets/mobile/list-presenter.js`, `src/targets/mobile/list-host-adapter.js`, `src/targets/mobile/ui-module.js` — 행/하단 제어·검색·툴팁·원래 메뉴 전달.
- ARTICLE: `src/targets/mobile/article-presenter.js`, `src/targets/mobile/article-host-adapter.js` — 본문·미디어·추천/CAPTCHA·PUM·주변 액션.
- COMMENTS: `src/targets/mobile/comment-presenter.js`, `src/targets/mobile/comment-host-adapter.js` — 일반/대댓글/이미지댓글·입력창·원래 팝업/미디어.
- FORMS: `src/targets/mobile/native-form-presenter.js`, `src/targets/mobile/native-form-host-adapter.js`, `src/targets/mobile/write-ad-host-adapter.js` — 작성/수정/삭제·첨부/AI/옵션·이탈 확인.
- EDITOR: `src/targets/mobile/write-editor-host-adapter.js`, `src/targets/mobile/write-font-presenter.js` — 글꼴/크기/색상/문단/줄간격/표/일반 레이어/외부 디시콘·viewport.
- HEADER: `src/targets/mobile/header-shell-host-adapter.js`, `src/targets/mobile/header-gnb-host-adapter.js`, `src/targets/mobile/header-recent-visit-host-adapter.js`, `src/targets/mobile/gallery-page-head-host-adapter.js`, `src/targets/mobile/header-drawer-host-adapter.js` 및 대응 presenter — 헤더·대문·순위/팁·원래 메뉴.
- HOSTFIX: `src/targets/mobile/post-main-fixes.js` — 사용자 메뉴·이미지댓글·원래 팝업·본문/작성 보완과 겹침 맥락.
- GEOMETRY: `src/targets/shared/popup-geometry-host-adapter.js` — 공유 패널 drag/pinch/resize·뷰포트·복원.

재사용 검증 경로: `testbed/run-tests.mjs`, `testbed/run-host-compatibility.mjs`, `testbed/run-list-differential.mjs`, `testbed/run-article-differential.mjs`, `testbed/run-comment-differential.mjs`, `testbed/run-native-form-differential.mjs`, `testbed/capture-settings-surfaces.mjs`, `docs/live-site-canary.md`. 편집기 세부 검증은 기존 `testbed/run-tests.mjs`의 write 그룹을 재사용한다. 경로의 존재/기존 테스트가 이번 디자인이나 모든 자식 상태의 PASS를 뜻하지 않는다. 원래 댓글·이미지댓글 진단 출처는 `testbed/image-comment-live-probe.js`와 기존 fixture이며 원시 사용자 데이터는 목록에 복제하지 않는다.

## 실사이트 표본 라우터

- A-01~12/C-01~18/W-20~22 **주 표본**: [6778319 본문](https://gall.dcinside.com/board/view/?id=comic_new6&no=6778319&exception_mode=recommend&page=1). 사용자가 2026-10-24 본문 버튼·댓글/이미지댓글·수정/삭제를 함께 볼 표본으로 지정했다. 이전 [6782494](https://gall.dcinside.com/board/view/?id=comic_new6&no=6782494&exception_mode=recommend&page=1)와 [6786251](https://gall.dcinside.com/board/view/?id=comic_new6&no=6786251&page=1)은 주 표본에 없는 상태의 보조다. 실제 관찰/미확인은 B1_UI_EXPANSION_PREFLIGHT.md에 분리했다. 게시물별 고정 이미지/댓글 개수를 기대값으로 삼지 않는다.
- L-05 긴 말머리/툴바: [명조 워더링 웨이브 목록](https://gall.dcinside.com/mgallery/board/lists/?id=wutheringwaves). 사용자가 2026-10-18에 지정한 `list_array_option clear`의 긴 목록 표본이다. 길이 증가 시 생략 상태, 화살표형 서랍의 닫힘/열림, 마지막 항목 접근·선택, 폭·테마 변경 후 복구를 확인한다. 원래 노드·필터 동작을 보존한다. 툴바/말머리 변경에 이 표본을 선택하며, 무관한 UI 변경마다 전체 사이트를 검사하지 않는다.
- 이 표본 등록과 URL 접근 확인은 동작 검증 PASS가 아니다. 실제 overflow/서랍 상태를 관측하고, 안정적인 비민감 구조만 fixture로 반영한 뒤 근거를 기록한다. 다른 갤러리의 짧은 탭 통과로 대체하지 않는다.

### B1 확장의 이름 있는 자식 상태

B1_UI_EXPANSION_PREFLIGHT.md의 범위를 기존 부모 ID 아래에서 고른다. 아래 이름은 별도 부모 행/새 전체 체크리스트가 아니며, 기존128개 부모 수나 검토 상태를 바꾸지 않는다. 각 실제 자식은 진입/열림/선택/닫힘/재열기를 따로 기록한다. 존재/권한이 미확인이면 그대로 미확인으로 남긴다.

- H-01: `search-history`, `search-suggestions`, `search-empty`, `search-clear-gate`, `login-gate`, `sign-login-page`. 통합검색 기록과 L-08의 하단 검색 레이어를 구별한다. sign 전용 진입은 B1_LOGIN_ENTRY_IMPLEMENTATION.md에서 구현·격리 검증됐다. 실제 인증/조건부 오류 자식은 여전히 별도다.
- H-05~10: `door-open`, `door-child-rank`, `door-child-help`, `door-child-related`, `door-child-settings`. 실제로 제공되는 내부 팝업/메뉴마다 원래 트리거와 루트를 확인한다.
- A-07~12: `silbe-request`, `scrap-login-gate`, `scrap-folder`, `scrap-result`, `share-options`, `pum`, `report-kind`, `report-reason`, `report-gate`. 대표 창 하나로 권한/결과 분기를 완료하지 않는다. 제출/신고/추천 등 live 쓰기는 하지 않는다.
- C-06/C-10: `image-comment-fold`, `image-comment-full`, `image-comment-compose-if-native`. 이미지 hover→원래 버튼→별도 이미지 루트를 구별한다. 접힌 미리보기에 입력창이 없다는 이유로 새 입력창을 만들거나 전체 상태를 N/A로 처리하지 않는다.
- C-11~13: `textcon`, `dccon`, `comment-password`, `reply-password`. 글자콘/디시콘은 별개 내부 선택기이며 공용 루트는 활성 문맥의 소유자 하나만 꾸민다.
- W-01~24/S-01~12/P-01~14/V-01~08: 기존 행의 각 편집 도구, 비밀번호 페이지/확인창, FAB→설정/관리→추가/백업, 미리보기/초안을 그대로 재사용한다. N-01~07 브라우저/OS 창은 웹 CSS 적용 대상과 구별한다.

## 현재 범위 재조정 — 2026-10-28

B1_INTEGRATED_UI_GAPS.md와 verification/receipts/2026-10-28-b1-integrated-ui-gaps.json이 현재128행의 근거 연결과 남은 분류를 소유한다. 기존 가족 문서의 정확한 scope를 재사용하며 일괄 green/전수 재촬영은 하지 않았다. 현재 F87E/8915는 변경하지 않았다.

- 후속 마감: B1_PREVIEW_DRAFT_FINISH.md/06CA가 V-02–V-08의 두 root 누락을 수정했다. 명명된 light/dark/geometry/behavior 범위이며 모든 오류 자식을 전수 촬영한 것은 아니다.
- 원본 자식 미확인: 실제 댓글 권한/비밀번호와 계정/CAPTCHA/결과/미디어 예외. 작성자/메모와 갤러리 설정의 명명된 익명 범위는 각 FINISH/CHILDREN 문서로 라우팅하며 완료된 범위를 다시 미확인으로 되살리지 않는다. 부모 shell의 통과로 완료하지 않는다.
- 완료 범위: 목록/본문/댓글/이미지댓글/갤러리·검색/비밀번호·작성 shell/6 editor menu/DCUF panels/login은 위 행의 scoped 문서로 연결한다. 조건부·입력 P4 자식은 B1_OWNED_CONDITIONAL_FINISH.md와 B1_OWNED_INPUT_CHILDREN.md를 우선 읽는다.
- C-07 이미지댓글 답글은 사용자 정정과 관찰된 native 구조에 따라 N/A.128개 ID는 유지하되 적용 완료 분모에 넣지 않는다. 일반 reply selector를 이유로 되살리지 않는다.
- 네 외부 업로드 문서는 DEFERRED_USER_ACCEPTED. N 영역의 브라우저/OS 창은 CSS 재디자인 대상 밖이다. 실제 인증/기기·formal whole-UI/header qualification은 UNKNOWN.

개별 캡처 숫자·예전 preflight next-task는 해당 역사적 문서에 남긴다. 현재 다음 실행은 NEXT_TASK.md 하나를 따른다.

Current v7 reuse2026-10-30: B1_ARTICLE_COMMENTS_V7_IMPLEMENTATION.md/its exact receipt cover the changed article/ordinary/reply/image composer roles and material. This does not recolor every native popup or close all A/C children. Actual memo remains fine-detail reference;NEXT isolates the observed native attachment filename region before writer/forms expansion.
