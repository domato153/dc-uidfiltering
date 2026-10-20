# DCUF current work locator

Use this file in the exact active nested worktree supplied by the private prompt. Parent checkouts, chat and historical briefs are not current authority. Paths below are repository-relative (bare filenames are in docs/work/).

## Resume / 압축 후 재개 / 새 스레드

1. Read AGENTS.md, then [CURRENT_STATE.md](CURRENT_STATE.md) and [NEXT_TASK.md](NEXT_TASK.md): accepted progress, limits and exactly one next action.
2. Fresh-check root/branch/HEAD/status and run `node tools/inspect-continuity.mjs`. Resolve meaningful drift against current files; a new thread alone does not demand full acceptance.
3. For mobile UI, read [PHONE_VIEWPORT_PROFILE.md](PHONE_VIEWPORT_PROFILE.md) **before choosing the environment**: user-adopted screen412×1006/layout980×2306/scale0.420684/DPR2.625; retain proxy gaps.390/412 layout is stress.

## Retrieve only for the question

| Question / retrieval terms | Current route |
| --- | --- |
| 진행도, 남은 일, where are we, next | CURRENT_STATE.md → NEXT_TASK.md. Historical files cannot supply another next task. |
| 모바일, 폰, 휴대폰, 데스크톱 모드, 폰 비율, 화면비, mobile viewport | PHONE_VIEWPORT_PROFILE.md: adopted reference, tested proxy and scale/height/engine gaps. |
| UI 변경, 전체 UI, 메뉴/팝업, 일반/대댓글/이미지댓글, editor | docs/ui-surface-contracts.md → UI_REVIEW_CHECKLIST.md. Local change: affected IDs/adjacent/X states; whole-UI completion: all applicable children. |
| 깨짐 복구 결과, stable UI comparison | UI_ALL_REPAIRS.md (all15 scoped repairs) → HEADER_CASCADE_FINALIZATION.md (supersedes its three local blockers). Earlier UI_BREAKAGE_CAUSE_AUDIT.md / UI_VISUAL_BASELINE_COMPARISON.md are diagnosis history. |
| Current header qualification / owner-delta admission / mixed exit | HEADER_EXIT_QUALIFICATION.md (six exact candidate criteria, current478A support and one admission-route conflict) → HEADER_COMPOSITION_REPAIR.md (980-first repair) → HEADER_PALETTE_BATCH.md / HEADER_TYPEA_APPLICABILITY.md / HEADER_EARLY_RESET_ADMISSION.md only for a named cause. Older next-task wording is historical. |
| 실제 Chrome/Tampermonkey, 실사이트 테스트 막힘 | docs/live-site-canary.md (working installed-chrome route); maintenance notes: Live-test capability scope. Read success path before declaring unavailable. |
| 디자인, 통일감, Concept01, UI 교체 | UI_DESIGN_REFERENCES.md → UI_REPLACEABILITY_VALIDATION.md. Planned after separation/repair; no readiness claim. |
| 소유권, architecture, cascade | architecture/registry.json + candidates, architecture/ui-surfaces.json; `node tools/inspect-live-architecture.mjs --surface header-navigation`. Repository map is not live-site evidence. |
| 검증 과잉, 연속성 팁, 폐기안, rejected/superseded | VERIFICATION_EFFICIENCY.md; only the matching DECISION_RATIONALE.md entry or docs/agent-maintenance-notes.md cause. |
| 제품 전체 계획 / final gates | MOBILE_UI_MODERNIZATION.md; FINAL_FEATURE_STATE_INVENTORY.md / verification/assurance-case.json for unfinished upper proof. |
| 체크포인트, commit/push/CI | docs/checkpoint-workflow.md + verification/checkpoint-policy.json. Exact-tree receipt gives actual disposition; product/release authority is separate. |

History is retrieved only for a specific unresolved cause: follow the named current document's citation or search the relevant HEADER_* topic, then compare with CURRENT/NEXT. Do not load every milestone, rerun old commands, or resume an old proposal. Git history preserves superseded packets.

Context-free method: .agents/skills/dcuf-long-work-continuity/references/handoff-contract.md. Receiver checks the exact root and one task, then reports ACCEPTED or STALE_REPLAN. Missing optional history is not a blocker; missing exact bytes needed for a comparison requires recovery or a newly bounded task. Machine contract: verification/continuity-contract.json.
