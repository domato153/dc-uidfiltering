# B1/v7 visual rules and common materials

## V7 adopted rules

사용자 채택 방향2026-10-31. 다음 UI 작업에서는 이 절과 현재 작업의 실제 화면/owner만 먼저 읽는다. 아래 예전 B1/C885 이력이나 새 이미지의 결함이 이 규칙을 덮어쓰지 않는다. 전체 UI 종료 후 논의할 종합 가이드북과 달리,이 절은 지금 재사용할 짧은 채택 규칙이다.

### 원하는 전체 느낌

- 차분하고 정돈된 작업용 UI. 은은한 유리 외곽,선명한 글자,안정적인 읽기/편집 면을 함께 쓴다. 유리 질감을 흰 안개,강한 그라디언트,두꺼운 광택/그림자,모든 요소의 카드화로 표현하지 않는다.
- 헤더·목록·본문·댓글·작성·팝업은 같은 재질/강조/타이포 위계를 공유하되,페이지와 팝업의 배치·면적·밀도·모양은 역할에 맞춘다. 메모 팝업의 모달 크기/스크림/2열을 일반 페이지에 복사하지 않는다.
- 공간과 묶음으로 정보 위계를 만든다. 검색 동작은 검색 옆,정렬/선택/복사/삭제는 목록 옆,등록/저장은 입력 영역의 끝에 둔다. 목적 없는 버튼이나 장식 상자를 추가하지 않는다.
- 유용하면 배치·크기·형태를 자유롭게 바꾼다. 기존 배치를 고정하지도,이전과 무조건 달라지도록 만들지도 않는다. 원래 정보·동작·접근성·반응형 제약은 유지한다.

### 재질과 컨트롤 역할

| 역할 | 채택한 v7 표현 | 재사용 경계 |
| --- | --- | --- |
| 주요 행동:등록·저장·글쓰기 | 옅은 테마색 유리 면,대비되는 글자,얇은 상단 빛과 절제된 깊이. 기본 윤곽은 보이되 과하게 볼록한 광택은 피한다. | 기존 owner에서 공통 v7 primary bg/ink/rim/shadow를 함께 소비한다. |
| 다크의 주요 버튼 | **밝은 색유리 면 + 짙은 글자**를 유지한다. 다크라는 이유로 버튼까지 짙은 단색으로 반전하지 않는다. 라이트와 같은 재질 언어를 쓰고 밝기·투명도·테두리·그림자를 다크 문맥에 맞춰 조절한다. | 현재7E824AD3의 조합이 채택 방향이다. 기존 라이트는 유지하며,밝은 버튼을 큰 페이지/모든 패널로 확대하지 않는다. |
| 보조 동작·탭·아이콘 | 평소에는 글자/아이콘 중심. 호버·키보드 포커스·누름·선택 때만 필요한 국소 면/타원/밑줄을 표시한다. | 충분한 보이지 않는 hit 영역,터치 피드백,disabled/danger 의미와 키보드 포커스를 보존한다. |
| 목록 행·선택 | 한 행에는 하나의 선택 배경. 클릭 구현에 button을 썼어도 행 전체에 일반 버튼 재질을 입히지 않는다. | 메모의 원래 row button은 border/background뿐 아니라 shadow/radius도 제거한다. 겹친 흰 위쪽 곡선 대신 조용한 행 사이 구분선만 사용한다. |
| 입력·본문·읽기 영역 | 읽고 쓰기 쉬운 안정적인 paper/reading 면. 긴 글·작은 글자의 대비와 패딩을 우선한다. | 유리 외곽과 구분한다. 텍스트 면까지 무조건 투명하게 하지 않는다. |
| 팝업·헤더 외곽 | 보통의 배경에서도 색/윤곽이 은은하게 비치는 유리,얇은 rim과 적절한 elevation. | blur/alpha 선언만으로 완료하지 않는다. native fixed 팝업을 감싸 containing block을 바꾸지 않는다. |

색과 글자색은 한 쌍이다. 밝은 다크 버튼에 기존 흰 글자를 무조건 유지하지 않는다. 주요 면·ink·rim·shadow를 함께 연결하고,같은 면을 쓰는 버튼만 그 규칙을 공유한다. 파괴적 동작,텍스트 버튼,색상 견본,작성자가 고른 메모색,본문/이미지색과 브라우저 자체 UI는 별도 역할이다.

### 현재 참고 자료와 코드

- [채택한 라이트 상세 기준](../design/b1-memo-workbench-light-2026-10-29.png):SHA-256F40C243D8789E412D1D59CBA5D0661A6711821BAF3C042082308015136EB0FA5. [현재 라이트 메모](../design/b1-dark-refinement-memo-light-2026-10-31.png)에서 이후 수정한 행/선택/보조 표현도 함께 본다.
- [버튼 비교](../design/b1-dark-control-comparison-2026-10-31.png):**왼쪽은 유지한 라이트,오른쪽은 채택한 새 다크**다. 가운데의 짙고 광택 강한 다크는 교체 전 사례다. SHA-256161216FFB715AAC2EAABD17E78BA7F7B3708BA7AFDD373FB8B4782FD95245217.
- [현재 다크 메모](../design/b1-dark-refinement-memo-dark-2026-10-31.png):밝은 primary와 정리된 행의 실제 적용 예. 원래 메모의 BB393279 다크 버튼,평평한 F4,칙칙한3077/흰 글자 조합은 되살리지 않는다.
- 실제 값은 [Mobile 공통 재질](../../src/targets/mobile/theme-material-values.js)의 v7 primary/reading 역할에 둔다. bg/ink/rim/shadow를 컴포넌트마다 복사하거나 청록색을 고정하지 않는다. 새 v7 주요 버튼은 v7 역할을 소비한다. 이전 control-primary 계열은 기존 범위로 구분하고,전역 alias를 바꿔 미이식 창이나 PC까지 몰래 바꾸지 않는다.
- [참조 역할](UI_REFERENCE_GUARD.md):원래 기능·사용자 채택 규칙이 우선한다. 실제 메모가 상세를,생성 시안이 구도/묶음을 돕는다. 원본/시안/현재 구현을 분리하며,캡처를 자동 pixel golden이나 전체 UI 승인으로 취급하지 않는다.

### 다음 가족에 적용하는 최소 흐름

1. NEXT의 대상 창과 native/current 상태를 확인하고,기존 owner·원래 필드/버튼/중첩창을 파악한다. 이 규칙과 맞는 기존 부품을 먼저 재사용한다. 구도가 실질적으로 다르면 native/current를 바탕으로 새 시안을 만들고,단순 재질/결함 보정은 동등한 채택 부위를 재사용한다.
2. 기존 presenter는 배치/외관을,기존 adapter·UiPort는 동작을 맡는다. 설정/네트워크/관찰자/공유 상태를 UI 쪽에 넣지 않는다. 경합은 원래 owner에서 제거/좁히고 전역 보정 시트나 priority 경쟁을 추가하지 않는다.
3. 변경한 부위의 whole/detail과 관련 열림/선택/포커스 상태를 실제 라이트·다크에서 비교한다. 테마 강조 역할은 기존 설정 UI의 미리보기·저장·취소와 연결한다. 국소 이식은 대표 색,공통 재질/팔레트 변경은 영향받는14색으로 확대한다. 무관한 전체 테스트/128개 UI를 매번 반복하지 않는다.
4. 현재 참고/규칙과 다른 점은 의도한 차이·수정 필요·미확인으로 기록한다. 기능 PASS나 blur 존재만으로 디테일 마감을 선언하지 않는다. 이후 사용자가 방향을 바꾸면 이 절과 현재 포인터를 함께 갱신하고 교체된 안은 다시 채택하지 않는다.

현재 v7 주요 버튼 연결:메모·관리창·직접 차단/백업 하위창·목록/최근 방문·본문/일반 및 이미지댓글·작성창. 백업 같은 작은 유틸리티의 주요 버튼은 문구에 맞는 너비/36px 높이로 조절하며,같은 재질이라고 긴 최소 너비나 큰 폼 버튼을 무조건 복사하지 않는다. 일부 이전 팝업/설정의 control-primary 계열은 아직 새 밝은 primary로 이식하지 않았다. 기존 공통 광택을 줄인 것과 v7 이식 완료를 구별한다. 각 창의 완료 범위는 CURRENT/NEXT와 해당 근거를 따른다.

## Historical B1/C885 implementation and receipts

아래는 이전 구현의 범위·원인·근거를 보존한 이력이다. 현재 v7 규칙이나 다음 작업을 이 구간의 예전 “current/final/plan” 문구에서 복원하지 않는다. 관련 원인/회귀를 조사할 때만 해당 부분을 읽는다.

Current dark refinement2026-10-31:B1_DARK_CONTROL_REFINEMENT.md owns the brighter paired-ink dark primary and memo row/auxiliary repair. Actual light treatment remains unchanged;old dark gloss and rejected flat/dim trials are not the current reference. Existing owners consume shared roles;no global button repaint or state/geometry owner change.

Current detail authority2026-10-30: the adopted actual memo workbench039A/current-preserved v7 implementation,not generated buttons. UI_REFERENCE_GUARD.md owns the role hierarchy. Reuse its real shared material/ink/rim/shadow/type/icon/control-state finish;page/popup shape,density,elevation and background are adapted to use. Generated article/composer images clarify composition/geometry only and cannot flatten/degrade the adopted finish. Earlier rollout sections below retain their own historical/current-unmigrated scope.

User direction2026-10-26: proceed with writer v3's restrained glass direction, improve list controls too, and use the same material language for **all button families**. Shapes/sizes/layout remain per surface except the selected writer's compact footer. V3 is the selected material direction, not permission to invent raster controls or copy imperfect text. Original/native/published UI remains the functional/coverage control.

### Bounded plan

1. Extend the existing mobile theme's material roles: tinted primary, pearl/smoky secondary, selected/quiet and destructive accents. Keep substantial fill/readability and the14 palette IDs/settings. Existing presenters consume values; no global button selector, new style phase, observer or behavior owner.
2. Implement the writer shell's decorative glass backing, paper editing surfaces, toolbar material and compact original cancel/register actions. Keep blur off ancestors of fixed native tool popups. Establish normal and colored-backing evidence; gradients alone cannot pass.
3. Apply the same recipes through existing list, article, comment, form/dialog, header/recent/utility and script-owned menu/settings/popup control rules. Preserve each role, shape, target, native sprite/content and existing focus/disabled/pressed state. Swatches, authored text colors, content media, browser-native controls/dialogs and authentication outside the current metadata remain distinct; future added button skins consume this family.
4. Finish light/dark material refinement against the selected v3 before the settled runtime's broad validation. Use the existing comparator/reference guard, affected positive material/geometry/input checks, separate-context control/candidate semantics and existing final Mobile suite. If shared settings CSS gains optional variable hooks, rebuild/test PC and prove its unset fallback appearance remains unchanged. No release/version/metadata/storage change.

### Owner/coverage routing

| Family | Existing visual owner | Intended material use |
| --- | --- | --- |
| Write/modify editor, password/delete, native tool/dialog actions | mobile-native-form-presenter | Common primary/secondary, translucent chrome, opaque text/editing fields; preserve fixed layers |
| List write/top-bottom tabs/categories/options | mobile-list-presenter | Shared primary face and secondary/selected finish; current shapes/target sizes preserved |
| Article actions, recommendation/scrap, action-popup interiors | mobile-article-presenter | Same action recipes with native icon/media and destructive-state semantics |
| Comment tools/submit, textcon/DCCon actions | mobile-comment-presenter | Same primary/secondary finish; native children/input and image controls intact |
| Header recent/utility/gallery tool triggers | existing header/recent/page-head presenters | Quiet/selected shared finish; keep compact anchors and popup reachability |
| Script menu FAB, drawer and modern settings/management popups | mobile theme values + existing shared settings presenter | Shared role recipes; optional PC fallback preserves its current appearance |

Scope is the currently owned/skinned control families, not a claim that all128 UI children or authenticated/native third-party windows are qualified. Existing not-yet-skinned popup children inherit this plan as they are implemented. Keep actual missing control/material work explicit.

### Safety and verification

- Resource constraint from user2026-10-26: browser jobs run strictly one at a time; close contexts and the browser before the next batch. Reuse the existing user-facing comparison tab, avoid repeated full-resolution galleries, and load only the selected image pair. Read memory between substantial batches; stop the current owned test if pressure returns. Do not terminate unrelated apps/user browsers or alter browser isolation flags to reduce memory. Current observation after scoped jobs: test Chrome/Node processes were absent and available RAM was about7.7GB; this is not a measurement of the preceding peak.
- Native nodes/parents/forms/handlers/hidden inputs/cursor/drafts/storage stay unchanged. Decorative pseudo-elements are pointer-transparent; no new containing block/stacking context around native fixed popups.
- MDN's [containing-block guidance](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Display/Containing_block) confirms non-none backdrop-filter can change the containing block. Use the existing isolated page layout for a decorative backing, with a safe no-header fallback; test actual fixed-layer bounds/hits.
- Red/green scoped checks cover actual role bindings, visible transmission on normal/backing light-dark captures, readable paper, compact footer target geometry and native-popup/input preservation. Reuse the existing reader/comparator; no new image/scoring engine or exhaustive repeat of unchanged children.
- A passing function suite, token declaration, pixel tolerance or screenshot capture cannot approve material. Compare actual whole/details, record intentional native differences and retain user preference separately from measured behavior.

Current implementation/evidence: CURRENT_STATE.md and NEXT_TASK.md. Do not revive earlier DRAFT-selection blockers after this explicit proceed instruction; exact selected image/region is frozen in NEXT.

### Implemented candidate and final choice

159FF759 Mobile / D73A445F PC: current presentation owners consume common primary/secondary/quiet/selected/destructive roles. User explicitly adopted the simple pre-transparency C885 button treatment: dense primary tint, subdued sheen and existing per-surface shapes. Higher-transparency/scrim trials are REJECTED and must not be revived. Form exterior glass remains real transmitting/blurred backing; editing paper stays opaque and original footer actions compact.

Final coverage:153 Mobile (103 functional in fresh browser processes,35 write,13 boot, smoke/performance1 each),26 PC,25 immediate-control native semantic observations, unchanged PC six-role light/dark fallback, and10 exact C885/current image pairs. User choice covers this button treatment, not all128 children, account/device/extension or formal admission. See verification/receipts/2026-10-26-b1-control-material.json for exact identities and limits.

Review repaired active-state paint, ordinary/danger precedence and lime contrast. Actual label-region contrast and14 palette checks remain. Removed three unnecessary comment priorities, kept the native-form semantic selector prefix and registered exact priority ledgers. Source checks require the real write consumer and reject old theme repaint. No native node/event/form/settings or behavior-owner move.

GAEJUK_BLOCK.md owns the separate development-only mascot/click-obstruction fix. P3 editor popup originals/proposals/interiors follow; P4 full menu/settings glass stays separate. Use current B1/native/published anatomy to derive new-family proposals before implementation, and reuse existing owners/material roles.

2026-10-29 steering: user accepted the rendered memo v7 tone and requested reuse across other UI families. B1_MEMO_WORKBENCH.md is the current plan;the compact pale tinted primary and glass-frame/stable-paper hierarchy supersede earlier proposal-only decisions within this memo slice. Existing other-family controls remain until their bounded rollout;all14 palettes still drive color. UI_REVIEW_CHECKLIST.md owns the mandatory accent-link gate for each changed family,including actual preview/save/cancel rather than source-only token inspection.

2026-10-29 list/header reuse: the existing Mobile material factory now owns `--dcuf-v7-reading`, `--dcuf-v7-primary-fill`, `--dcuf-v7-primary-ink`, `--dcuf-v7-primary-bg`, `--dcuf-v7-primary-rim` and `--dcuf-v7-primary-shadow`. Memo private names alias these values without changing its computed material. List/header consume them inside their existing owners;other families migrate only in their bounded slice. Body-scope rebinding preserves body-only dark composition. Small auxiliary controls default to text/icons;interaction supplies the local surface. Keep primary actions/fields/popup shells purposeful. B1_LIST_V7_MATERIAL.md owns the first completed reuse and exact split evidence. Earlier dense C885 remains historical/current only where not yet migrated;do not globally replace every button selector.
