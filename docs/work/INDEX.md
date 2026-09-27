# DCUF work continuity

This file is the canonical repository-relative locator for a context-free local-task handoff **only in the exact active worktree located by the private new-task prompt**. The packet is the current state plus the single next task, not the chat or a timestamped brief. A receiving task must fresh-check its worktree/contract and return `ACCEPTED` or `STALE_REPLAN` before treating the task as executable; see `.agents/skills/dcuf-long-work-continuity/references/handoff-contract.md`.

- `CURRENT_STATE.md` is the accepted phase and evidence summary.
- `NEXT_TASK.md` contains exactly one bounded next task.
- `DECISION_RATIONALE.md` records consequential `SELECTED` / `NOT ADOPTED` / `DEFERRED` choices and revisit triggers; its cold-reader precedence section distinguishes the current D-11/D-12/D-13 choices from D-04/D-07–D-10's historical next actions. Read that precedence before executing `NEXT_TASK.md`; this rationale is not an acceptance receipt or a second current-state authority.
- `MOBILE_UI_MODERNIZATION.md` is the active, durable plan for the mobile presentation replacement and three-layer assurance system.
- `HEADER_NAVIGATION_INVENTORY.md` retains the bounded stable/candidate action matrix; its older shell/GNB/recent/action/list full bindings are historical after the handoff-policy change, while the page-head pair was renewed. It is not a stage receipt.
- `FINAL_FEATURE_STATE_INVENTORY.md` is the 34-ID working cross-surface applicability/evidence-gap matrix; every final disposition remains `UNKNOWN` until row-level current comparison, live, and upper gates close.
- `SHARED_SETTINGS_PC_CROSS_AUDIT.md` separates prior-binding palette/outcome observations from the renewed exact-artifact direct shared filter/storage comparison. Both remain partial local evidence, not a stage receipt.
- `testbed/run-shared-filter-storage-differential.mjs` produces the raw/field-level view comparison; `tools/test-shared-filter-storage-differential.mjs` checks the exact report binding and nine negative controls. Neither exercises the user's extension.
- `tools/classify-palette-owner-split.mjs` and `tools/test-palette-owner-split.mjs` reproduce the exact raw-FAIL owner classification and its negative controls; `tools/probe-palette-owner-lifecycle.mjs` checks dispose/reconnect in an isolated guarded browser. They do not install the userscript or convert a feature row to PASS.
- `HEADER_EXTENSION_CANARY_PREREQUISITES.md` is the route/state and rollback checklist for a later actual-Tampermonkey-extension check; every live row remains `UNKNOWN` until executed.
- `tools/classify-page-head-visual-delta.mjs` classifies only the exact current raw page-head visual differences; its report remains local and never converts the raw `FAIL` into a header-stage `PASS`.
- `verification/continuity-contract.json` owns the authority order, mandatory update triggers, generalized retrieval vocabulary, and thin-router limits. The Markdown files remain the human-readable current projection.
- `verification/research-selection.json` and `tools/verify-research-selection.mjs` define/test proportional external-evidence tiers; the skill's `references/research-contract.md` explains source appraisal and local transfer.
- Architecture candidates live under `architecture/candidates/` and are not accepted state.
- `node tools/inspect-live-architecture.mjs --surface <id>` derives the current repository UI ownership/layer view; `--check` fails on declared source/build/style/test link drift. It is not a live-site canary.
- Historical briefs live under `docs/archive/` and never override fresh refs or current machine authorities.

Authority order: fresh local HEAD/status/diff and generated artifact digests → tracked current projection → machine contracts and receipts → plans/history → conversation context. Remote refs enter only an explicitly requested remote or publishing boundary.
