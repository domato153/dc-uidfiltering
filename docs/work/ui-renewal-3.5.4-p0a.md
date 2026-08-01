# UI renewal 3.5.4 — live-site correction

This file is the authoritative execution-state companion to `docs/work/ui-renewal-3.5.4.md`. It supersedes only that document's project-status and current-active-phase fields. The parent brief's technical requirements, exclusions, native-DOM rules, and release restrictions remain in force.

## Project state

`IMPLEMENTING`

User approval to reopen and correct the live failures was received in Chat on 2026-08-01.

## Active phase

- Phase: `Live P0 reopen, then bounded P1 surface correction`
- Owner and sole branch writer: `ChatGPT`
- Fixed correction base SHA: `1a984b3b84fafff11e16894d395b0e9b5af89af9`
- State: `IN_PROGRESS`
- Parallel implementation: prohibited
- Independent validation owner after handoff: `Codex/Luna`
- Independent reviewer after fixed-SHA validation: `ChatGPT`
- P0: `CHANGES_REQUESTED — live-site failures reproduced by the user`
- P1: `blocked until the reopened native interaction failures are corrected`

## Why the prior approval was revoked

The fixed runtime passed the local P0-A and guarded suites, but the exact same built runtime failed on the live DCInside site. The prior automated result is therefore retained only as historical evidence; it is not an acceptance result for the current phase.

Confirmed live failures:

1. A visible list writer click does not create the native nickname menu.
2. `#pop_manage_report_list` can be created inside the gallery-cover drawer clone and remain clipped by that drawer.
3. The headtext-more arrow overlaps the headtext rail.
4. The write page can expose both recent-visit and favorite-gallery labels and can repaint the lower border.
5. Additional header, list metadata, toolbar, AI-rail, native-layer, and cascade-ownership defects remain open.

The uploaded `Dc_UserFilter_Mobile_v3.5.4-beta.user.js` matched the previously validated guarded runtime SHA-256:

`156b3ef84dc84c305d8a887b3bb401e8385d78c7f0d8ff17eb6e10648d423a77`

That equality proves the live failures are fixture/contract false negatives, not a build mismatch.

## Active defect register

The correction scope includes the user's consolidated 24-item register:

- filter-master/convenience independence;
- logged-in header wrapping and logout/night-mode alignment;
- list writer native-menu behavior;
- gallery-management popup ownership and containment;
- headtext-more control geometry;
- list title/right metadata alignment, including comments, PUM, and scheduled-delete indicators;
- single-row mobile write toolbar with horizontal touch scrolling;
- one bottom list shell for actions, pagination, move, and search;
- consistent header/list/view/write card composition;
- recent/favorite host-hidden state and unwanted borders;
- full AI quick-registration rail fidelity and native close/reset geometry;
- PUM visual checkmark fidelity and verified PUMX activation;
- native popup clipping, stacking, containment, and hit-testing;
- recent-navigation native-handler preservation;
- excessive global `!important` and ambiguous final CSS ownership;
- truthful live-shaped Testbed contracts;
- preservation of original host DOM, event ownership, popup lifecycle, and form behavior.

## Allowed paths

The active owner may change only the following areas unless a newly discovered dependency is documented here before editing:

- `docs/work/ui-renewal-3.5.4-p0a.md`
- `src/targets/mobile/*.js`
- `tools/build-userscript.mjs`
- `tools/verify-repo.mjs`
- `testbed/fixtures/*`
- `testbed/*.mjs`
- `testbed/package.json`

Generated root/dist userscripts, versions, releases, tags, official branches, and unrelated PC runtime files remain prohibited.

## Implementation order

1. Restore a working writer compatibility path while keeping the original writer node in its original row.
2. Make drawer copies presentation-only and route their actions through the original host controls; portal only original host popups when required for reachability.
3. Preserve native recent-navigation handling and host-hidden recent/favorite state.
4. Install one explicit final surface owner for header/recent, list, article/comments, write, and native-layer containment; remove or neutralize competing late ownership where touched.
5. Upgrade the Testbed so the live failures fail before the correction and pass only through the production path.
6. Build and run syntax, guidance, focused regressions, and the full guarded suite from one fixed SHA.
7. Require a new user live-site smoke test before P0 or P1 is declared complete.

## Stop conditions

Stop and report instead of continuing if:

- the server branch moves unexpectedly;
- a fix requires synthetic fake popup content rather than an original host popup;
- a fix changes storage shape, versions, release files, or official branches;
- tests must be weakened or removed to pass;
- a native action cannot be preserved without replacing its host lifecycle;
- the original dirty checkout would need to be altered.

## Historical validation record

The prior local result is historical only:

- Guidance: `PASS`; `AGENTS.md` 5991/6000.
- Guarded runtime SHA-256: `156b3ef84dc84c305d8a887b3bb401e8385d78c7f0d8ff17eb6e10648d423a77`.
- P0-A: `9 passed, 0 failed`.
- Full guarded mobile suite: `108 passed, 0 failed`.
- Original dirty checkout: preserved.

Live use invalidated the writer and management-popup acceptance claims, so those counts cannot be reused for the reopened phase.

## Required handoff evidence

A future `REVIEW_READY` handoff must record:

- exact fixed start and result SHAs;
- exact changed paths;
- guidance and syntax exit codes;
- built runtime absolute path and SHA-256;
- focused live-contract test results;
- full guarded suite totals, failures, skips, and obsolete counts;
- console/page errors;
- original dirty-checkout preservation;
- proof that P1 did not bypass an unresolved P0 failure;
- user live-site results for writer menu, gallery-management popup, headtext control, recent/favorite state, write toolbar, and AI rail.
