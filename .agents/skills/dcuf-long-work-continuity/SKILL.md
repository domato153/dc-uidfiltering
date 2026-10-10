---
name: dcuf-long-work-continuity
description: Resume, summarize, or hand off long DCUF work from fresh local state and tracked evidence without reviving stale plans. Use after context compaction, on “continue/status/where are we” requests, phase or audit transitions, failure reclassification, canary results, or release preparation; exclude short self-contained edits.
---

# DCUF Long-work Continuity

Read the development root's single `AGENTS.md`, run `node tools/inspect-continuity.mjs`, then use `verification/continuity-contract.json`. Fresh observations test current projections against governing contracts; neither history nor a test grants permission. Remote reads belong to the authorized checkpoint/remote boundary.

## Thin router

- Resume, compaction, status, or progress: use the inspection result, then read `docs/work/CURRENT_STATE.md` and the single task in `docs/work/NEXT_TASK.md`.
- Audit or evidence: also open only the named receipt, assurance claim, and changed oracle/fixture/harness inputs.
- Failure or blocker: classify the failing result and retrieve matching maintenance notes; retain the last accepted baseline.
- Regression, drift, DOM, or behavior preservation: add `dcuf-semantic-preservation` and the affected machine/surface contract.
- Live architecture, layer, or UI owner drift: add `dcuf-semantic-architecture` and query `node tools/inspect-live-architecture.mjs --surface <id>`; use `--check` before a map/ownership transition. Add UI/DOM skills only when host styling or dynamic nodes are in scope.
- Canary, beta, ZIP, release, or rollback: add `dcuf-release`; Continuity does not grant that authority.
- New context-free task handoff: use [the cold-start handoff contract](references/handoff-contract.md); a fork inherits history and is not a fresh-context test.

Routine resume uses scoped reconciliation; policy/routing change, material handoff failure, stage closure, high-risk transfer or explicit closure uses closure qualification. Re-route applicable skills/impact at contract triggers. Keep accepted/candidate/stale/blocked/UNKNOWN distinct. PASS/READY needs a receipt and exact artifact. Maintain one typed next-action dependency/entry inventory; omit command diaries/sensitive data.

Read [the detailed retrieval contract](references/retrieval-contract.md) only when updating Continuity, resolving ambiguous retrieval, or repairing detected drift.
