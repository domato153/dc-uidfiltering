# AGENTS.md

## Priorities
- Preserve current user-visible behavior, stored settings, and release output.
- Keep agent context and tool work task-specific; use deterministic checks for mechanical contracts.
- For runtime performance work, identify measured repeated work or visible delay before editing. See `docs/agent-performance-notes.md` only for those tasks.

## Source and target routing
- Edit only `src/`, `tools/build-userscript.mjs`, and `tools/build-pc-filter-userscript.mjs` for release behavior. Generated root userscripts and `dist/` are build outputs, not source.
- Classify work as mobile full UI, PC filter port, shared filter/runtime, or build tooling.
- Keep mobile layout, article, ad, write-page, popup placement, and view-theme work in mobile-only source. The PC target is filter-only except for its filter controls and management UI.
- Keep shared filtering, normalization, storage compatibility, and datasets in `src/shared/`. Keep host DOM traversal and visibility changes in target adapters.
- Treat `src/runtime/bootstrap.js`, `src/targets/mobile/filter-module.js`, and `src/targets/mobile/personal-block-module.js` as cross-target inputs. Do not place mobile-only UI changes in them unless PC should receive the behavior.

## Build and release
- Ordinary source edits do not change versions or create release artifacts unless the user explicitly asks for a build, beta, release, or promotion.
- After mobile runtime changes requested for build, run `node tools/build-userscript.mjs`.
- After PC runtime changes requested for build, run `node tools/build-pc-filter-userscript.mjs`.
- For shared filtering, storage, identity extraction, or cross-target input changes requested for build, rebuild both targets unless the PC output is proven unaffected.
- After builds, run `node tools/verify-repo.mjs release`. For guidance-only changes, run `node tools/verify-repo.mjs guidance`; run `all` when both surfaces changed.
- Never repair source/build divergence by editing generated userscripts.

## Git publishing
- `origin` is `https://github.com/domato153/dc-uidfiltering.git`. Intermediate checkpoints may push only `codex/*`; never update official branches during beta or review.
- `origin/Mobile` owns the stable mobile file `Dc_UserFilter_Mobile.user.js`. `origin/main` owns the stable PC file `dcinside_user_filter.user.js` plus website assets.
- For an explicit stable release after verification, use a clean worktree based on the target remote branch, replace only its canonical userscript, preserve its history and other files, then commit and push without force. Never merge the source branch wholesale into an official release branch.

## Fragile contracts
- Preserve existing GM storage keys and data shapes. Add migration or compatible fallback when semantics must change.
- Treat `document-start`, hidden-body locking, boot overlay release, and timeout recovery as one initialization contract.
- Reuse existing observers and rerun hooks where practical. Observer changes must prevent duplicate execution, bound retries, and retain delayed-content coverage.
- Scope injected CSS to script-owned containers. Check light/dark mode, stacking, clipping, pointer input, and popup context when relevant.
