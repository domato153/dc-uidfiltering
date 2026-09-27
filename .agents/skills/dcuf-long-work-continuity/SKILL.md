---
name: dcuf-long-work-continuity
description: Resume, summarize, or hand off long DCUF work from fresh local state and tracked evidence without reviving stale plans. Use after context compaction, on “continue/status/where are we” requests, phase or audit transitions, failure reclassification, canary results, or release preparation; exclude short self-contained edits.
---

# DCUF Long-work Continuity

Run `node tools/inspect-continuity.mjs`, then use `verification/continuity-contract.json` as the retrieval/update contract. Resolve authority from fresh local state, tracked current projections, machine contracts and receipts, plans/history, then conversation context. Check remote refs only for a requested remote or publishing boundary.

## Thin router

- Resume, compaction, status, or progress: use the inspection result, then read `docs/work/CURRENT_STATE.md` and the single task in `docs/work/NEXT_TASK.md`.
- Audit or evidence: also open only the named receipt, assurance claim, and changed oracle/fixture/harness inputs.
- Failure or blocker: classify the failing result and retrieve matching maintenance notes; retain the last accepted baseline.
- Regression, drift, DOM, or behavior preservation: add `dcuf-semantic-preservation` and the affected machine/surface contract.
- Live architecture, layer, or UI owner drift: add `dcuf-semantic-architecture` and query `node tools/inspect-live-architecture.mjs --surface <id>`; use `--check` before a map/ownership transition. Add UI/DOM skills only when host styling or dynamic nodes are in scope.
- Canary, beta, ZIP, release, or rollback: add `dcuf-release`; Continuity does not grant that authority.
- New context-free task handoff: use [the cold-start handoff contract](references/handoff-contract.md); a fork inherits history and is not a fresh-context test.

Re-run skill and impact routing at every contract trigger. Keep accepted, candidate, stale, blocked, and UNKNOWN facts distinct. PASS/READY must bind an existing receipt and exact artifact digest. Maintain exactly one bounded next task and omit command diaries or sensitive live data.

Read [the detailed retrieval contract](references/retrieval-contract.md) only when updating Continuity, resolving ambiguous retrieval, or repairing detected drift.
