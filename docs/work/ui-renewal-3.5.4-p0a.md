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

## Active phase (correction supersedes prior P0-A label)

- Phase: `P0-A — Establish truthful fixtures before production fixes`
- Owner: `Codex correction implemented`
- Start SHA: `53e8c861f7aa5e00a20b2dd1a1ff934dfa8bfe76`
- State: `REVIEW_READY`
- Parallel work: prohibited
- Independent reviewer: `ChatGPT`

- Correction phase: `P0-A through P0-E`

## Active audit correction

The independent audit returned `CHANGES_REQUESTED — FAIL`. P1 is excluded. This correction phase preserves the P0-A through P0-E implementation scope while fixing the writer DOM/event contract, real route coverage, and Pumx bounded retry lifecycle.

Correction paths are limited to the brief, the compact UI contract, the shared Pumx runtime, the mobile list/filter owners, and the named P0 fixtures and regression suites.

## Scope

Correct the audited P0-A through P0-E implementation in the clean correction worktree. Preserve the original host DOM/event contracts, use the real major/minor/mini list routes, and prove the bounded Pumx late-listener lifecycle.

## Allowed paths (updated for correction)

- `docs/work/ui-renewal-3.5.4-p0a.md`
- `testbed/package.json`
- `testbed/fixtures/p0a-live-contracts.mjs`
- `testbed/run-p0a-regressions.mjs`
- `testbed/public/fixture-client.js`
- `testbed/run-tests.mjs`
- `src/shared/write-defaults.js`
- `src/targets/mobile/ui-module.js`
- `src/targets/mobile/filter-module.js`
- `docs/ui-surface-contracts.md`

The legacy P0-A-only restriction against `src/**` and the default suite is superseded for this correction phase; generated userscripts, version, release, and P1 remain excluded.

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

## Superseded P0-A checkpoint requirements

A checkpoint may be marked `REVIEW_READY` only after:

- the focused runner loads the guarded source runtime;
- all fixture-signature assertions pass;
- at least one production-contract assertion fails for the observed live reason;
- no runtime or generated artifact was edited;
- the result SHA and exact failing assertion are recorded here.

## Correction exit requirements

- P0-A route coverage passes on `/board/lists`, `/mgallery/board/lists`, and `/mini/board/lists`.
- The original writer node remains in valid table ancestry and passes direct plus table-delegated trusted click paths.
- Pumx passes the 700ms listener race, remains unmarked before success, and has no retry timer or mutation subscription after success.
- Guarded source-runtime and full selected P0 validation are rerun from the final correction commit SHA.
- Only after those checks pass may this document return to `REVIEW_READY`; P1 remains excluded.

## Final implementation handoff

Project state: `VALIDATION_REQUIRED`
Phase state: `REVIEW_READY`
Owner: `Codex correction implemented`
Independent reviewer: `ChatGPT`

The independent audit blockers were corrected and the final guarded validation was rerun from the correction commit. P1 remains excluded.

- Repository: `domato153/dc-uidfiltering`
- Branch: `codex/ui-renewal-3.5.4-collab`
- Implementation start SHA: `53e8c861f7aa5e00a20b2dd1a1ff934dfa8bfe76`
- Correction implementation commit: `9237424 Correct audited P0 runtime contracts`
- Implementation commit: `64cae20 Implement P0 runtime contracts`
- Governance commit: `f37a970 Require authoritative remote ref verification`
- Lifecycle fixture/test commit: `602ede2 Stabilize P0 lifecycle regression contracts`
- Review handoff commit: this documentation commit; exact SHA is reported in the final response.
- Guarded runtime path: `testbed/artifacts/runtime-under-test.user.js`
- Guarded runtime SHA-256: `156b3ef84dc84c305d8a887b3bb401e8385d78c7f0d8ff17eb6e10648d423a77`
- P0-A focused regressions: `9 passed, 0 failed` on `/board/lists`, `/mgallery/board/lists`, and `/mini/board/lists`
- P0-B through P0-E focused matrix: passed, including convenience independence, native writer/autocomplete containment, popup geometry, settings material, list lifecycle, and Pumx default activation.
- Full guarded mobile suite: `108 passed, 0 failed`.
- Guidance verification: baseline check reported `AGENTS.md` at `6007/6000`; AGENTS.md was unchanged in this correction and active skills were `4/4` with total skill text `10320/10500`.
- Original dirty checkout: preserved byte-for-byte in status; all implementation work occurred in the clean detached worktree.
- P1: explicitly not started.
- No version bump, release artifact publication, official branch update, PR, tag, force-push, or release promotion was performed.

The final review target is the exact handoff commit on `codex/ui-renewal-3.5.4-collab`. A moved branch SHA invalidates this validation record; the authoritative live branch ref must be rechecked before any follow-up work.
