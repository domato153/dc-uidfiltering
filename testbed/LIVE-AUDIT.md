# 실사이트 확인 자료 수집

먼저 [live-audit-console.js](live-audit-console.js)의 전체 내용을 F12 Console에 붙여넣는다. Chrome/Edge가 붙여넣기를 막으면 Console에 `allow pasting`을 직접 입력한 뒤 다시 붙여넣는다.

## 댓글 style 변경 반복

1. 모바일 사용자 스크립트를 켠다.
2. 일반 댓글이 있는 major 글 본문을 열고 F12 Console에서 수집기를 붙여넣는다.
3. Console 상단 실행 컨텍스트가 `top`이면 Tampermonkey 또는 `DC_UserFilter_Mobile` 컨텍스트로 바꾸고 수집기를 그 컨텍스트에 다시 붙여넣는다.
4. `await DCUFLiveAudit.commentChurnDownload('major-comment-churn.json')`을 실행한다.
5. minor 글 본문에서도 `await DCUFLiveAudit.commentChurnDownload('minor-comment-churn.json')`을 실행한다.

`passDelta`가 핵심 값이다. 진단 객체가 없는 페이지 컨텍스트에서 0을 기록하지 않도록 수집기가 즉시 오류를 내도록 되어 있다.

Tampermonkey 실행 컨텍스트가 Edge에 표시되지 않으면 `top` 컨텍스트에서 `await DCUFLiveAudit.commentDomChurnDownload('major-comment-churn.json')`을 사용한다. 이 대체 방식은 내부 pass 수 대신 동일 시간의 idle/triggered DOM mutation 차이를 기록한다.

## 호스트가 숨긴 광고·특수 행

반드시 같은 URL에서 스크립트 OFF 기준과 ON 결과를 비교한다.

1. 모바일 사용자 스크립트를 끄고 minor 목록 또는 minor 글을 연다.
2. 수집기를 붙여넣고 `DCUFLiveAudit.saveHiddenBaseline()`을 실행한다.
3. 사용자 스크립트를 켜고 같은 탭을 새로고침한다.
4. 수집기를 다시 붙여넣고 `DCUFLiveAudit.compareHiddenBaselineDownload('minor-hidden-compare.json')`을 실행한다.

페이지가 달라지면 비교 자료로 사용할 수 없다. `baselineUrl`과 `currentUrl`이 같아야 한다.

## 전달할 파일

- `major-comment-churn.json`
- `minor-comment-churn.json`
- `minor-list-hidden-compare.json`
- `minor-write-hidden-compare.json`

닉네임이나 본문 일부를 공개하고 싶지 않으면 JSON의 `text` 값만 지워도 된다. URL과 UID까지 숨기려면 그 부분도 마스킹할 수 있지만 `passDelta`, `before`, `after`, `inlineDisplay`, `computedDisplay`, `exposed`는 남겨야 한다.

중복 사용자 스크립트 주입은 평범한 새로고침으로는 같은 문서에 두 번 삽입되지 않으므로 이 절차에 포함하지 않는다. Tampermonkey의 실제 갱신·재주입 경로를 별도로 재현할 때만 검사한다.
