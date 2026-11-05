# UI-01 목록 도구줄 복구 — 2026-10-18

상태: **REPAIRED_SCOPED**. 980 배치의 탭/말머리/개수/글쓰기 겹침을 복구했다. 전체 복구 게이트는 OPEN이며 UI-02–UI-15, 최종 통합·실제 확장·기기 검증은 별도다.

## 선택한 체크 범위와 변경

`UI_REVIEW_CHECKLIST.md`의 L-05/L-06/L-09(상단 글쓰기), 인접 H-04/H-05, X-01의 blue 라이트/다크, X-02의 폭, X-03의 입력, X-04의 세 갤러리 종류, X-07의 기존 복원/갱신 검사를 선택했다. 댓글·에디터·관리창·다른 팔레트 전체 검토는 이 국소 CSS 변경에 포함하지 않았다. 다음 UI 작업도 `docs/ui-surface-contracts.md`에서 이 목록으로 진입해 영향받는 ID만 선택한다. 전면 디자인/전체 완료 때 전체 적용 목록을 사용한다.

시각 소유자는 기존 `src/targets/mobile/list-presenter.js`다. `list-host-adapter.js`가 기존 가역 marker lifecycle로 원래 category 그룹/안쪽/목록을 표시하고 presenter는 의미 표식만 소비한다. native 클래스가 presenter CSS로 들어오면 실패하는 경계 검사와 disposal 시 새 표식/스타일/원래 노드 복원 검사도 포함한다. native840px 도구줄/1% 탭 폭/고정 높이를 내용 기반 flex 흐름으로 대체하고 좁으면 줄을 나눈다. 실제 `.center_box > .inner > ul`의32/26px 높이·float·overflow 때문에 새42px 링크가 잘리던 내부 흐름도 같은 owner에서 복구했다. 글쓰기의1% 그룹/고정 버튼 폭도 자연 폭으로 바꿔 원래 라벨과 아이콘이 들어간다. 전역 override, 새 important/observer/owner, native 노드 이동/복제나 저장·이벤트 변경은 없다. PC 소스와 버전은 그대로다.

## 실패 재현과 현재 증거

- 수정 전3EF6: 실제980에서 도구줄840x48, 탭 묶음8.17px, 말머리 겹침. 기존 guard로 새 회귀 테스트가 실패했다.
- 부분 수정4AB5: 도구줄980x58/탭264px로 회복됐지만 실사이트 말머리는 바깥으로3px 나오고 좁은 폭에서 개수/글쓰기 줄과 겹쳤다. `.inner`와 UL의 고정 높이/clip, 글쓰기1% 그룹을 새로 샘플링했고 faithful fixture에서 부분 수정의 실패도 확인했다. 이 반례를 `partial/live.json`에 보존한다.
- 최종 모바일3.5.5 root/dist/guard SHA-256: `4E416EDB2A962F2C63A39BE37601F0ECB669F479FA1B3702DA6E717F8BA77257`.
- PC1.9.9 root/dist SHA-256: `1A7A00468F4DCFB57C7341063098B827743091FD7593BA3FBA86A17E282BDC33` (변경 없음).
- 설치 Chrome155.0.8059.80의 opt-in native-shaped fixture: 메이저/마이너/미니 ×320/390/412/750/980/1280 ×라이트/다크 **36조합 통과**. 양수 크기, parent/UL 포함, 겹침 없음, 버튼 중심 hit, 글쓰기 텍스트 경계, 원래 노드/부모/순서, pointer/Enter 탭, 말머리 클릭, SELECT change, 글쓰기 핸들러를 검사했다. 이들은 실제 게시를 하지 않는 fixture 이벤트다.
- 기존 검색 인접성12조합, native control topology/form 및 inline-height rollback, 원래 대문/순위 팝업 검사 및 host compatibility11/11 통과. 정식32BA 정본과 separate contexts 목록 differential 통과: 의미 실패0, invariant 개선16. raw geometry16개 차이는 의도한 표현 차이를 포함하며 픽셀 동일성 주장으로 사용하지 않는다.
- 실제 공개 minor 목록을 격리 GM-shim 컨텍스트로 비교했다. 최종980/390/412 ×라이트/다크 **6조합**에서 도구줄/컨트롤 포함·hit·비겹침 통과.980은980x60/탭264px,390/412는 각각 가용 폭의160px 높이로 줄을 나눈다. 최종 캡처는 전후 scrollY=0과 도구줄 y 불변도 확인했다. 화면을 직접 열어 넓은 라이트/다크와 좁은 다크의 구성을 확인했다.

근거 디렉터리: `artifacts/ui-overview-2026-10-17/repairs/ui01/`의 `manifest.json`, `live.json`, `list-differential.json`, 전후 이미지. 드라이버/RED/GREEN/인접성/topology/door/빌드 로그는 `artifacts/ui-design-inventory-2026-10-18/`의 `ui01-*`다. manifest는 해당 source/fixture/harness/driver/report 해시를 결합한다. 공개 화면 캡처와 원시 조사 자료는 로컬 ignored 증거이며 checkpoint에 포함하지 않는다.

## 한계와 다음 작업

실사이트 비교는 익명 minor 목록/blue/GM shim이다. screen412/DPR2.625/touch proxy의 visualViewport.scale은1이며 실제 Lemur 배율이 아니다. 실제 Android 키보드·인증·모든 native 메뉴·다른 팔레트·다른 live 갤러리 종류는 이번에 검증하지 않았다.390의 기존 헤더/대문 상단 일부 겹침과 native dark 버튼 색 경쟁을 전체 헤더/팔레트 해결로 부르지 않는다. 이번 row의 확인된980 도구줄 배치 복구와 분리한다. installed-Chrome/Tampermonkey 경로는 작동 가능한 기존 경로이며,15개 복구 후 같은 최종 아티팩트로 갱신한다.

전체 dirty-tree 영향 라우트는 fixture/harness 및 기존 미완료 verifier 변경 때문에 acceptance까지 확대된다. 이번 선택 검사는 전체 라우트 통과를 대신하지 않는다. 기존 generated-CSS/transition/palette verifier 단위가 미완료이므로 그 변경을 함께 검증 완료로 checkpoint하지 않았다. 다음 bounded 작업은 UI-02 닉네임 잘림이다. Concept01 적용은 남은 분리와 복구 게이트가 닫힌 뒤다.
