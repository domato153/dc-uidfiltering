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

`VALIDATION_REQUIRED`

User approval received in Chat on 2026-08-01.

## Active phase

- Phase: `P0-A — Establish truthful fixtures before production fixes`
- Owner: `Codex/Luna implementation completed`
- Start SHA: `92ccd4b9e626d103939c431991c03748d929a429`
- State: `REVIEW_READY`
- Parallel work: prohibited
- Independent reviewer: `ChatGPT`

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

## Final implementation handoff

Project state: `VALIDATION_REQUIRED`
Phase state: `REVIEW_READY`
Owner: `Codex/Luna implementation completed`
Independent reviewer: `ChatGPT`

- Repository: `domato153/dc-uidfiltering`
- Branch: `codex/ui-renewal-3.5.4-collab`
- Implementation start SHA: `92ccd4b9e626d103939c431991c03748d929a429`
- Implementation commit: `64cae20 Implement P0 runtime contracts`
- Governance commit: `f37a970 Require authoritative remote ref verification`
- Lifecycle fixture/test commit: `602ede2 Stabilize P0 lifecycle regression contracts`
- Review handoff commit: this documentation commit; exact SHA is reported in the final response.
- Guarded runtime path: `testbed/artifacts/runtime-under-test.user.js`
- Guarded runtime SHA-256: `a27674d84035058558a7a27cd38a9a092c3a1fcc3a0089308a5d7df033b99460`
- P0-A focused regressions: `9 passed, 0 failed`
- P0-B through P0-E focused matrix: passed, including convenience independence, native writer/autocomplete containment, popup geometry, settings material, list lifecycle, and Pumx default activation.
- Full guarded mobile suite: `107 passed, 0 failed`.
- Guidance verification: passed; `AGENTS.md` is `5983/6000` characters, active skills `4/4`, total skill text `10320/10500`.
- Original dirty checkout: preserved byte-for-byte in status; all implementation work occurred in the clean detached worktree.
- P1: explicitly not started.
- No version bump, release artifact publication, official branch update, PR, tag, force-push, or release promotion was performed.

The final review target is the exact handoff commit on `codex/ui-renewal-3.5.4-collab`. A moved branch SHA invalidates this validation record; the authoritative live branch ref must be rechecked before any follow-up work.
