# UI renewal 3.5.4 — integrated correction state

This file is the authoritative execution-state companion to `docs/work/ui-renewal-3.5.4.md`. It supersedes only the parent brief's project-status and active-phase fields. All technical requirements, native-DOM rules, exclusions, and release restrictions in the parent brief remain in force.

## Project state

`IMPLEMENTING`

## Active phase

- Phase: `P1-A through P1-D integrated surface correction`
- Owner and sole branch writer: `ChatGPT`
- Fixed P1 start SHA: `d82d9cca32d513b104f6c4ab09f4e9e2a6046dd1`
- State: `IN_PROGRESS`
- Parallel implementation: prohibited
- Independent validation owner after handoff: `Codex/Luna`
- Independent reviewer after fixed-SHA validation: `ChatGPT`
- P0 production changes and regression coverage: `locally validated, live acceptance intentionally deferred to the integrated candidate`
- P1: `active`

## P0 checkpoint carried into P1

Commit `d82d9cca32d513b104f6c4ab09f4e9e2a6046dd1` is the only accepted P1 base.

Recorded clean-worktree validation:

- P0-A: `14 passed, 0 failed`.
- Full guarded mobile Testbed: `108 passed, 0 failed, 0 skipped`.
- Required source/build `node --check`: exit `0`.
- Guidance verification: exit `0`.
- Runtime console/page errors: none.
- Built beta SHA-256: `39c64e2af13749a71b0358060c73adb9f0f702d3e245952232400522c069c042`.
- `npm ci`: not applicable because no lockfile; `npm install --no-package-lock` succeeded.
- Original dirty checkout: preserved.

This checkpoint is regression evidence, not final user acceptance. The next user live test occurs only after P1-A through P1-D are integrated, independently validated, and built from one fixed SHA.

## P1 implementation contract

### P1-A — single active owner per surface

The integrated runtime must have exactly one active owner for each of:

- header and recent/favorite rail;
- list navigation, rows, metadata, and bottom controls;
- article paper;
- comments and reply surfaces;
- write form, editor rail, AI rail, options, and actions;
- native popup containment and portal geometry.

`live-corrections.js` must not remain an emergency visual override. It may retain structural/native compatibility adapters only. A dedicated final-surface module is permitted only when it retires or narrows the corresponding legacy active rules in the same runtime.

### P1-B — write fidelity

- Preserve native form method/action, hidden fields, editor nodes, controls, and submit/cancel lifecycle.
- Preserve host-hidden recent/favorite state; never force both labels visible.
- Keep headtexts → title → editor → AI rail → options → actions ordering.
- Keep toolbar controls on one horizontal touch-scroll rail.
- Keep AI loading, file input, image/character/layer controls, prompt, count, native close/reset, and settings popup usable.
- Keep PUMX activation state-based and render its checked mark as a conventional visual check tied to native state.

### P1-C — recent navigation

Preserve a working host handler. A DCUF fallback may run only when the host click produced no observable movement or state change. It must not use capture-phase cancellation, must not double-scroll, and must survive rerender and bfcache without duplicate binding.

### P1-D — palette parity

All 14 palette IDs, labels, light values, and dark values must be canonical or deterministically verified for both the main runtime and isolated login surface. Preserve storage key `dcuf_mobile_ui_palette`, exactly one login-surface read, and zero login-surface writes.

## Active defect register

The integrated scope remains the user's consolidated 24-item register:

- filter-master/convenience independence;
- logged-in header wrapping and logout/night-mode alignment;
- native list-writer menu behavior;
- gallery-management popup ownership and containment;
- headtext-more geometry;
- list title/right metadata alignment, including comments, PUM, and scheduled-delete indicators;
- single-row mobile write toolbar;
- one bottom list shell for actions, pagination, movement, and search;
- consistent header/list/view/write composition;
- recent/favorite host-hidden state and unwanted borders;
- full AI quick-registration fidelity and native close/reset geometry;
- PUM checkmark fidelity and verified PUMX activation;
- native popup clipping, stacking, containment, and hit-testing;
- native-first recent navigation;
- excessive global `!important` and ambiguous active ownership;
- truthful live-shaped fixtures;
- original DOM, events, popup lifecycle, and form behavior preservation.

## Allowed paths

- `docs/work/ui-renewal-3.5.4-p0a.md`
- `src/shared/mobile-palette-data.js`
- `src/targets/mobile/*.js`
- `tools/build-userscript.mjs`
- `tools/verify-repo.mjs`
- `testbed/fixtures/*`
- `testbed/*.mjs`
- `testbed/package.json`

Generated root/dist userscripts, versions, releases, tags, official branches, unrelated PC runtime files, and the user's dirty checkout remain prohibited.

## Ordered execution

1. Replace the temporary visual correction layer with one canonical active surface owner and retire/narrow competing active legacy rules.
2. Complete write fidelity and recent/favorite semantics without replacing native form/editor controls.
3. Replace unconditional recent scrolling with native-first fallback behavior.
4. Establish deterministic 14-palette parity.
5. Add failing-before/passing-after P1 ownership and behavior contracts.
6. Run syntax, guidance, P0-A, P1, and the full guarded suite from one fixed result SHA.
7. Perform independent fixed-SHA review.
8. Build one integrated userscript for the user's single comprehensive live test.

## Stop conditions

Stop and report instead of continuing if:

- the server branch moves unexpectedly;
- a fix requires a fake popup, cloned native control, or replacement form lifecycle;
- storage shape, version, release files, official branches, or unrelated PC code would change;
- tests must be weakened or removed;
- active surface ownership still depends on an unexplained later override;
- the original dirty checkout would need to be altered.

## Required handoff evidence

A future `REVIEW_READY` handoff must record:

- exact P1 start and result SHAs;
- exact changed paths;
- active-owner audit results for all six surfaces;
- guidance and syntax exit codes;
- P0-A, P1, and full guarded totals, failures, skips, and obsolete counts;
- built runtime absolute path and SHA-256;
- console/page errors;
- palette parity result for all 14 presets;
- original dirty-checkout preservation;
- remaining live-only checks;
- user live results for writer menu, management popup, recent navigation/state, headtext, list metadata, toolbar, AI rail, PUMX, and popup reachability.
