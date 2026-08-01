# UI renewal 3.5.4 — integrated correction state

This file is the authoritative execution-state companion to `docs/work/ui-renewal-3.5.4.md`. It supersedes only the parent brief's project-status and active-phase fields. All technical requirements, native-DOM rules, exclusions, and release restrictions in the parent brief remain in force.

## Project state

`VALIDATION_REQUIRED`

## Active phase

- Phase: `P1-A through P1-D integrated surface correction`
- Implementation owner and sole branch writer: `ChatGPT`
- Independent validation owner: `Codex/Luna`
- Independent reviewer after fixed-SHA validation: `ChatGPT`
- Fixed P1 start SHA: `d82d9cca32d513b104f6c4ab09f4e9e2a6046dd1`
- Implementation-content SHA before this handoff document: `fb0e7266b8dd8aec5f8b33618886da0fe10d7853`
- State: `REVIEW_READY — local P0/P1/full validation evidence collected; live checks pending`
- Parallel implementation: prohibited
- P0 live acceptance and P1 live acceptance remain intentionally deferred to one integrated candidate.

## P0 checkpoint carried into P1

Commit `d82d9cca32d513b104f6c4ab09f4e9e2a6046dd1` is the accepted P1 base.

Recorded clean-worktree validation for that base:

- P0-A: `14 passed, 0 failed`.
- Full guarded mobile Testbed: `108 passed, 0 failed, 0 skipped`.
- Required source/build `node --check`: exit `0`.
- Guidance verification: exit `0`.
- Runtime console/page errors: none.
- Built beta SHA-256: `39c64e2af13749a71b0358060c73adb9f0f702d3e245952232400522c069c042`.
- `npm ci`: unavailable because no lockfile; `npm install --no-package-lock` succeeded.
- Original dirty checkout: preserved.

This evidence must be rerun against the P1 result. It is not final acceptance.

## Implemented P1 changes

### P1-A — active surface ownership

- Added `surface-theme.js` as the declared active owner for header/recent, list, write, and native-layer presentation.
- Retained `dcuf-mobile-palette-style` as the article/comments owner.
- Retired the active `dcuf-phase1-list-theme` and emergency `dcuf-live-surface-owner` styles.
- Pruned overlapping header/recent/list/write/native selectors from the palette stylesheet through a bounded CSSOM pass.
- Reduced `live-corrections.js` to structural adapters: metadata grouping, recent/favorite state, drawer-to-original control bridge, and original popup portal geometry.
- Added owner markers and an owner manifest for deterministic tests.

### P1-B — write fidelity

- Preserved native form, hidden fields, editor nodes, and action controls.
- Declared subject → editor → AI rail → options → actions surface order without moving native nodes.
- Made editor toolbars single-row horizontal touch-scroll rails.
- Normalized AI rail layout while retaining loading, file, image, character, layer, prompt, count, close/reset, and settings controls.
- Replaced the malformed PUMX drawing with a conventional check drawn only for native active state.
- Preserved host recent/favorite visibility semantics.

### P1-C — recent navigation

- Removed capture cancellation and unconditional ownership.
- Preserved the host click first.
- Runs the DCUF fallback only when the host produced no scroll movement or button-state change.
- Keeps one binding guard and restores preparation after bfcache.

### P1-D — palette parity

- Added one canonical 14-preset source in `src/shared/mobile-palette-data.js`.
- The mobile builder deterministically derives both the main palette presets and isolated login palette map from that source.
- Existing storage key and isolated login read/write restrictions remain unchanged.

## Added validation contracts

- `testbed/run-p1-regressions.mjs`: static owner/palette/recent contracts plus runtime list, write, popup, metadata, shell, and AI checks.
- `testbed/fixtures/p1-live-contracts.mjs`: full logged-in rail and native PUMX fixture additions.
- `testbed/run-p1-fidelity.mjs`: wide/narrow logged-in header and PUMX visual fidelity checks.
- `npm run test:p1`: runs both P1 suites.

## Validation commands

Run from one clean worktree at the fixed branch tip:

1. `node --check src/shared/mobile-palette-data.js`
2. `node --check src/targets/mobile/surface-theme.js`
3. `node --check src/targets/mobile/live-corrections.js`
4. `node --check src/targets/mobile/live-native-bridge.js`
5. `node --check testbed/fixtures/p1-live-contracts.mjs`
6. `node --check testbed/run-p1-regressions.mjs`
7. `node --check testbed/run-p1-fidelity.mjs`
8. `node --check tools/build-userscript.mjs`
9. `node tools/verify-repo.mjs guidance`
10. Build a testbed runtime and run `node --check` on it.
11. In `testbed`: `npm install --no-package-lock` when dependencies are absent.
12. `npm run test:p0a`
13. `npm run test:p1`
14. `npm test`
15. Build the final beta candidate without committing root/dist outputs.

Any failure reopens implementation as `CHANGES_REQUESTED`. Tests must not be weakened or deleted.

## Required review focus

- Build regex transforms must find exactly one login palette map and one main preset array.
- No duplicate or missing canonical palette IDs; all 14 labels/light/dark values must be preserved.
- CSSOM pruning must report no errors and must not remove article/comments ownership.
- Exactly one active owner must remain for each declared surface.
- Full logged-in actions must not wrap at wide width; narrow width must scroll rather than wrap.
- Headtext rail and more button must not overlap.
- List metadata must stay at the title's right edge and bottom controls must remain inside the list shell.
- Native recent handler must fire exactly once; fallback must not double-scroll or duplicate-bind.
- Write toolbar, AI rail, native popup lifecycle, PUMX state, bfcache, and reduced-motion behavior must remain intact.
- Full guarded suite must detect any article/comments or unrelated-host regressions caused by selector pruning.

## Stop conditions

Stop and report instead of continuing if:

- the server branch moves during fixed-SHA validation;
- a fix requires a fake popup, cloned native control, or replacement form lifecycle;
- storage shape, version, release files, official branches, or unrelated PC code would change;
- tests must be weakened or removed;
- active surface ownership still depends on an unexplained later override;
- the original dirty checkout would need to be altered.

## Required validation handoff evidence

- exact fixed validation SHA;
- exact changed paths made during validation, if any;
- every command and exit code;
- P0-A, P1 structural, P1 fidelity, and full guarded totals;
- built runtime absolute path and SHA-256;
- console/page/runtime errors;
- palette parity result for all 14 presets;
- active-owner audit result for all six surfaces;
- original dirty-checkout preservation;
- remaining live-only checks.

Only after clean fixed-SHA validation and independent review may one integrated userscript be given to the user for the single comprehensive live test.
