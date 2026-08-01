# UI renewal 3.5.4 — active phase P0-A

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

This governance checkpoint was inserted after the current in-progress P0 unit reached a clean implementation commit. It does not change completed P0 behavior, technical requirements, allowed runtime scope, or acceptance criteria.

After this governance commit, the existing P0 implementation sequence continues from the current local HEAD.

## Project state

`READY_FOR_IMPLEMENTATION`

User approval received in Chat on 2026-08-01.

## Active phase

- Phase: `P0-A — Establish truthful fixtures before production fixes`
- Owner: `Chat/Work`
- Start SHA: `34b85886630bc4df0d2ff3b7553444bdbec91d8b`
- State: `IN_PROGRESS`
- Parallel work: prohibited
- Independent reviewer: `Codex` after a fixed `REVIEW_READY` checkpoint

## Scope

Create live-shaped fixture evidence and a focused regression runner before production fixes. The runner must prove exact host signatures and must reproduce at least one current production failure rather than encode a fixture-only success.

## Allowed paths

- `docs/work/ui-renewal-3.5.4-p0a.md`
- `testbed/package.json`
- `testbed/fixtures/p0a-live-contracts.mjs`
- `testbed/run-p0a-regressions.mjs`

No `src/**`, generated userscript, version, release, existing shared fixture, or existing default-suite file may change in this phase.

## Required evidence

- Exact recent-visit root: `#visit_history.visit_bookmark > .newvisit_history.vst`, including sprite child geometry.
- Exact headtext sibling order: `.center_box > .inner > ul + .btn_subject_more + #subject_morelist`.
- Complete 30/50/100 list-size layer created and opened through its real-shaped trigger.
- Exact writer signature with the native handler attached to the original interactive writer.
- Trusted click on the visible writer must create the native nickname menu; a cloned or synthetic stand-in is not a pass.
- Click-created `#pop_manage_report_list` must have positive geometry, viewport containment, and `elementFromPoint` ownership.
- Complete AI quick-registration rail: loading, file input, image/character controls, layer button, prompt, count, native close sprite, and settings popup.

## False-positive stop rule

If the focused regression runner passes completely against the current audited runtime before any production fix, this fixture/assertion set is invalid and the phase must not be marked complete.

## Checkpoint requirements

A checkpoint may be marked `REVIEW_READY` only after:

- the focused runner loads the guarded source runtime;
- all fixture-signature assertions pass;
- at least one production-contract assertion fails for the observed live reason;
- no runtime or generated artifact was edited;
- the result SHA and exact failing assertion are recorded here.
