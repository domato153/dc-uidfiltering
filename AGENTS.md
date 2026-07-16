# AGENTS.md

## Priorities
- Preserve user-visible behavior, stored settings, and release output.
- Keep work task-specific; use deterministic contract checks.
- For performance work, measure first, then consult `docs/agent-performance-notes.md`.

## Source and target routing
- Release sources are `src/` and build scripts; root userscripts and `dist/` are generated.
- Keep layout/UI work mobile-only. PC is filter-only except for filter controls and management UI.
- Keep shared logic/data in `src/shared/`; keep host DOM and visibility work in target adapters.
- Treat bootstrap, mobile filter, and personal-block modules as cross-target inputs; add mobile-only UI there only when PC should receive it.

## Build and release
- After ordinary source edits, keep the version and rebuild affected artifacts. Bump, beta, promote, push, or publish only when explicitly requested.
- Mobile: `node tools/build-userscript.mjs`. PC: `node tools/build-pc-filter-userscript.mjs`. Rebuild both for shared filtering, storage, identity, or cross-target changes unless PC is proven unaffected.
- After builds run `node tools/verify-repo.mjs release`; use `guidance` for guidance-only edits and `all` when both changed.
- Run only Testbed `--group`/`--filter` coverage for changed surfaces; use the full suite only when impact cannot be isolated or requested. Run bfcache only for lifecycle work.
- Stable may reuse beta Testbed only when runtime is unchanged, only `-beta` is removed, and live beta use is confirmed; record the skip basis.
- Never repair source/build divergence by editing generated userscripts.

## Testbed fidelity
- Reproduce stable, non-sensitive live differences in fixtures and add regression assertions.
- If evidence is insufficient, request redacted probes, screenshots, viewport, and steps before selector or layout changes.
- Report selected coverage; never imply unselected tests passed.

## Durable maintenance notes
- Record reusable lessons in `docs/agent-maintenance-notes.md`: context difference, root cause, discarded partial fix, stable contract, and regression coverage.
- Record likely-to-recur live regressions, viewport/target divergence, and fragile host contracts. Skip routine commands, transient failures, and dead ends without future value; keep notes concise and non-sensitive.

## Git publishing
- `origin` is `https://github.com/domato153/dc-uidfiltering.git`. Beta/review checkpoints may push only `codex/*`; commit verified checkpoints locally by default and push only when requested.
- Before committing or pushing a `codex/*` work branch, remove superseded versioned userscripts from the root and `dist/`; keep only the current mobile and PC artifacts needed by that checkpoint. Preserve source files, Testbed probes, official-branch canonical userscripts, and any release evidence explicitly required for promotion.
- `origin/Mobile` owns `Dc_UserFilter_Mobile.user.js`; `origin/main` owns `dcinside_user_filter.user.js` and website assets.
- On stable publish update only that target's badge in `origin/main:README.md`.
- Publish stable from a clean official-branch worktree, replacing only the canonical userscript, preserving history, and never forcing or merging the source branch wholesale.
- After confirmed beta use and a full stable request, push official branches and create the Release with canonical userscripts.

## Fragile contracts
- Preserve GM storage keys and shapes; add migration or fallback for semantic changes.
- Treat `document-start`, hidden-body locking, boot overlay release, and timeout recovery as one initialization contract.
- Reuse observers and rerun hooks; prevent duplicates, bound retries, and retain delayed-content coverage.
- Scope injected CSS to script-owned containers; check light/dark mode, stacking, clipping, pointer input, and popup context.
