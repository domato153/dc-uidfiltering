# AGENTS.md

## Priorities
- Preserve current user-visible behavior, stored settings, and release output.
- Keep tool work task-specific; use deterministic checks for mechanical contracts.
- For performance work, measure repeated work or visible delay first; consult `docs/agent-performance-notes.md` only then.

## Source and target routing
- Release sources are `src/` and the two build scripts; root userscripts and `dist/` are generated.
- Keep mobile layout, article, ad, write-page, popup placement, and view-theme work in mobile-only source. The PC target is filter-only except for its filter controls and management UI.
- Keep shared filtering, normalization, storage compatibility, and datasets in `src/shared/`. Keep host DOM traversal and visibility changes in target adapters.
- Treat `src/runtime/bootstrap.js`, `src/targets/mobile/filter-module.js`, and `src/targets/mobile/personal-block-module.js` as cross-target inputs. Do not place mobile-only UI changes in them unless PC should receive the behavior.

## Build and release
- Ordinary source edits do not change versions or create release artifacts unless the user explicitly asks for a build, beta, release, or promotion.
- After mobile runtime changes requested for build, run `node tools/build-userscript.mjs`.
- After PC runtime changes requested for build, run `node tools/build-pc-filter-userscript.mjs`.
- For shared filtering, storage, identity extraction, or cross-target input changes requested for build, rebuild both targets unless the PC output is proven unaffected.
- After builds, run `node tools/verify-repo.mjs release`. For guidance-only changes, run `node tools/verify-repo.mjs guidance`; run `all` when both surfaces changed.
- Run only Testbed `--group`/`--filter` selections covering changed surfaces. Use the full suite only when impact cannot be isolated or the user asks. Run bfcache only for lifecycle work. A stable promotion may reuse the recorded beta Testbed result when the runtime source is unchanged, the only artifact change is the version suffix, and live beta use has been confirmed; record the skip basis instead of rerunning.
- Never repair source/build divergence by editing generated userscripts.

## Testbed fidelity
- Reproduce stable, non-sensitive live-site differences in fixtures and add regression assertions.
- If evidence is insufficient, request redacted probes, screenshots, viewport, and steps before changing selectors or layout.
- Report selected coverage; never imply unselected tests passed.

## Git publishing
- `origin` is `https://github.com/domato153/dc-uidfiltering.git`. Intermediate checkpoints may push only `codex/*`; never update official branches during beta or review.
- `origin/Mobile` owns the stable mobile file `Dc_UserFilter_Mobile.user.js`. `origin/main` owns the stable PC file `dcinside_user_filter.user.js` plus website assets.
- For stable release, use a clean target-branch worktree, replace only its canonical userscript, preserve history, and push without force. Never merge the source branch wholesale.

## Fragile contracts
- Preserve existing GM storage keys and data shapes. Add migration or compatible fallback when semantics must change.
- Treat `document-start`, hidden-body locking, boot overlay release, and timeout recovery as one initialization contract.
- Reuse existing observers and rerun hooks where practical. Observer changes must prevent duplicate execution, bound retries, and retain delayed-content coverage.
- Scope injected CSS to script-owned containers. Check light/dark mode, stacking, clipping, pointer input, and popup context when relevant.
