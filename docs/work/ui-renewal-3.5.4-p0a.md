# UI renewal 3.5.4 — active P0 correction

This file is the authoritative execution-state companion to `docs/work/ui-renewal-3.5.4.md`. It supersedes only that document's project-status and current-active-phase fields; all technical requirements, acceptance criteria, stop conditions, and exclusions in the parent brief remain unchanged.

## One-time preflight governance amendment

One-time preflight governance amendment authorized by the user on 2026-08-01.

Purpose:
Prevent stale local remote-tracking refs from being mistaken for authoritative server branch state.

Allowed governance paths:
- `AGENTS.md`
- `docs/work/ui-renewal-3.5.4-p0a.md`
- `docs/agent-maintenance-notes.md`
- `tools/verify-repo.mjs`

This governance checkpoint does not change P0 behavior, technical requirements, runtime scope, or acceptance criteria.

## Project state

`APPROVED`

User approval received in Chat on 2026-08-01.

## Active phase

- Phase: `P0-A through P0-E audit correction`
- Owner: `Codex validation completed`
- Correction base SHA: `bffcc0d6b506ba724eca915242bb5d6e5ff11b2e`
- State: `COMPLETE`
- Parallel work: prohibited
- Validation executor: `Codex/Luna on one fixed SHA`
- Independent reviewer: `ChatGPT`
- P0: `complete`
- P1: `may begin`

## Active audit correction

The first independent audit returned `CHANGES_REQUESTED — FAIL`. Codex corrected the writer DOM/event contract, real route coverage, and Pumx bounded retry lifecycle. ChatGPT then found two remaining checkpoint issues:

1. `AGENTS.md` still exceeded the enforced 6000-character guidance budget.
2. P0-A visited three real paths, but reused one row/table shape and did not assert route-specific structural differences.

ChatGPT corrected only those remaining issues. Runtime source was not changed in this final correction.

## Allowed paths

- `AGENTS.md`
- `docs/work/ui-renewal-3.5.4-p0a.md`
- `testbed/fixtures/p0a-live-contracts.mjs`
- `testbed/run-p0a-regressions.mjs`

No runtime source, generated userscript, version, release, P1, official branch, PR, tag, or promotion may change in this final correction.

## Required evidence

- Exact recent-visit root: `#visit_history.visit_bookmark > .newvisit_history.vst`, including sprite child geometry.
- Exact headtext sibling order: `.center_box > .inner > ul + .btn_subject_more + #subject_morelist`.
- Complete 30/50/100 list-size layer created and opened through its real-shaped trigger.
- Original writer remains in valid table ancestry and trusted click reaches both direct and outer-table delegated handlers.
- Click-created `#pop_manage_report_list` has positive geometry, viewport containment, and `elementFromPoint` ownership.
- Complete AI quick-registration rail and settings popup.
- `/board/lists`, `/mgallery/board/lists`, and `/mini/board/lists` are requested directly.
- Major and mini use six-column list rows without `.gall_type`; minor uses seven columns with exactly one `.gall_type`.
- Each variant uses its own view and write path and variant heading.
- Pumx passes the delayed-listener race and releases retry resources after success.
- Guidance verification passes, including `AGENTS.md <= 6000`.

## Correction history

- `64cae20` — Implement P0 runtime contracts
- `f37a970` — Require authoritative remote ref verification
- `602ede2` — Stabilize P0 lifecycle regression contracts
- `53e8c86` — Prior review handoff rejected by independent audit
- `9237424` — Correct audited P0 runtime contracts
- `4bceedf` — Prior correction handoff
- `6311cc2` — Initial guidance budget trim
- `657b622` — Make P0-A route fixtures structurally distinct
- `1bff9d3` — Finish guidance budget trim
- `a185318` — Assert distinct P0-A route structures

## Last independently submitted validation

The following evidence was produced before the final fixture/assertion-only correction and is retained as historical context, not as current final validation:

- Guarded runtime SHA-256: `156b3ef84dc84c305d8a887b3bb401e8385d78c7f0d8ff17eb6e10648d423a77`
- P0-A: `9 passed, 0 failed`
- Full guarded mobile suite: `108 passed, 0 failed`
- Pumx delayed-listener/mutation-churn test: passed
- Original dirty checkout: preserved

Because the P0-A fixture and runner changed after those passes, P0-A must be rerun. Runtime source and the broad suite did not change, but the fixed checkpoint still requires guidance and focused validation from the final SHA.

## Final validation record

On the final fixed SHA, run:

```text
node tools/verify-repo.mjs guidance
node --check testbed/fixtures/p0a-live-contracts.mjs
node --check testbed/run-p0a-regressions.mjs
cd testbed
npm run test:p0a
node run-tests.mjs --require-runtime-under-test
```

The full guarded suite may only be reused if the validator confirms the guarded runtime SHA is still `156b3ef84dc84c305d8a887b3bb401e8385d78c7f0d8ff17eb6e10648d423a77` and no runtime, common fixture, harness, or full-suite code changed after `4bceedf`. Running it again is preferred for a clean fixed-SHA handoff.

Validation base SHA: `bffcc0d6b506ba724eca915242bb5d6e5ff11b2e`
Validation worktree: `C:\Users\dign2\Documents\tampermonkey\Dcfilter\dcuf-p0-final-validation-bffcc0d`
Guidance: `PASS`; `AGENTS.md` 5991/6000; active skills 4/4; total skill text 10320/10500.
Syntax: `PASS` for `testbed/fixtures/p0a-live-contracts.mjs` and `testbed/run-p0a-regressions.mjs`.
Diff check: `PASS`; changed paths from `4bceedfac7447f09a391d367092aa32e53a6a081` are exactly `AGENTS.md`, this brief, `testbed/fixtures/p0a-live-contracts.mjs`, and `testbed/run-p0a-regressions.mjs`.
Guarded runtime: `C:\Users\dign2\Documents\tampermonkey\Dcfilter\dcuf-p0-final-validation-bffcc0d\testbed\artifacts\runtime-under-test.user.js`; SHA-256 `156b3ef84dc84c305d8a887b3bb401e8385d78c7f0d8ff17eb6e10648d423a77`.
P0-A: `9 passed, 0 failed`; direct and table-delegated writer paths, major/minor/mini routes, route-specific structures, and console/page error checks passed.
Full guarded mobile suite: `108 passed, 0 failed`; runtime guard PASS; console/page errors 0.
Original dirty checkout: preserved; the original five status entries were unchanged before and after validation.
P1: not started and prohibited.

## Exit criteria satisfied

This phase may return to `REVIEW_READY` only when:

- guidance passes with the actual `AGENTS.md` character count recorded;
- both changed JavaScript files pass syntax checks;
- P0-A passes all nine contracts with the expected runtime SHA;
- major/minor/mini route structure assertions pass;
- no console or page errors occur;
- full guarded suite passes or its unchanged-runtime reuse is explicitly justified;
- branch remains fixed throughout review;
- the exact result SHA and validation output are recorded here.

Final handoff:

- Project state: `APPROVED`
- Phase state: `COMPLETE`
- Owner: `Codex validation completed`
- Validation executor: `Codex/Luna`
- Independent reviewer: `ChatGPT`
- P0: `complete`
- P1: `may begin`
