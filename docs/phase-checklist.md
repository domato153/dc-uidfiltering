# DCUF 3.0 Phase Checklist

> Historical refactor record — current instructions 아님. Use `AGENTS.md` and current source/build tooling for active work.

## Agent ownership
- Main agent: integration, build output, regression judgment.
- Shared-core worker: `src/shared/**`
- Mobile worker: `src/targets/mobile/**`
- Build worker: `tools/**`, `src/meta/**`
- Validation worker: docs, fixtures, regression notes

## Rules
- Do not edit the same file from multiple agents at once.
- Freeze behavior first; structure second.
- If a phase introduces a regression, roll back only that phase's scope.

## Phase gates
### Phase 0
- [ ] Baseline source frozen
- [ ] High-risk flows documented
- [ ] Manual verification pages listed

### Phase 1
- [ ] Header/meta moved into template
- [ ] Runtime shell builds from split source
- [ ] BOM preserved in output
- [ ] Release output turns debug default off
- [ ] Build output passes syntax check (BOM-stripped temp copy)

### Phase 2
- [ ] Shared IP data is the only filter dataset source
- [ ] Storage normalization exists outside UI code
- [ ] Legacy proxy boolean compatibility preserved
- [ ] Legacy `blockConfig.ip` cleanup preserved

### Phase 3
- [ ] Filter decision rules live in one place
- [ ] Mobile adapter only extracts subjects and applies decisions
- [ ] Parent-comment/reply visibility behavior preserved

### Phase 4
- [ ] Settings UI detached from shared filter rules
- [ ] List transform stays synced with original DOM visibility
- [ ] Popup fixes survive delayed rerender

### Phase 5
- [ ] Observer count/redundancy reduced without missing rerenders
- [ ] No duplicate handlers or runaway refilters
- [ ] Background-tab recovery still works

### Phase 6
- [ ] PC adapter contract documented
- [ ] Future PC build is defined as mobile 3.0 filter extraction plus a thin desktop adapter
- [ ] Future filter-rule edits can land in shared core first
- [ ] Mobile and future PC build can consume the same filter data and settings schema

## Manual regression pack
- [ ] 일반 목록
- [ ] 마이너 갤러리 목록
- [ ] `exception_mode=recommend` 목록
- [ ] 일반 글내용창
- [ ] 대댓글 많은 글내용창
- [ ] 이미지 댓글 있는 글내용창
- [ ] 글쓰기 페이지
- [ ] 설정 저장/단축키 변경
- [ ] 개인차단 추가/해제
- [ ] 백업 export/import
- [ ] 야간모드 전환
