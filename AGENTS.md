# AGENTS.md

## Priorities
- Preserve user-visible behavior, stored settings, and release output.
- Keep work task-specific; use deterministic contract checks.
- For performance work, measure first, then consult `docs/agent-performance-notes.md`.
- Preserve measured hot-path optimizations. Allow a regression only as a bounded fallback required for correctness or recovery, and record its trigger, scope, cost, and coverage.
- For long work, keep `.codex/` goals, contracts, status, validation, and next step; recheck Git after resume/stages, then delete it. Skip one-offs.

## Source and target routing
- Release sources are `src/` and build scripts; root userscripts and `dist/` are generated.
- Keep layout/UI mobile-only. PC is filter-only except filter controls and management UI.
- Put shared logic/data in `src/shared/`; host DOM/visibility work in target adapters.
- Bootstrap, mobile filter, and personal-block modules are cross-target inputs; add mobile-only UI there only if PC should receive it.

## Build and release
- Rebuild affected artifacts without changing version. Bump, promote, push, or publish only when requested.
- Build mobile: `node tools/build-userscript.mjs`; PC: `node tools/build-pc-filter-userscript.mjs`. Build both for shared filter/storage/identity changes unless PC is unaffected.
- After builds run `node tools/verify-repo.mjs release`; use `guidance` for guidance-only edits and `all` if both changed.
- Default to the smallest deterministic Testbed `--group`/`--filter` set that covers changed behavior and its direct dependencies.
- Do not rerun already-passing coverage unless product code, shared fixtures/harness, or another change invalidated that evidence; report split runs honestly.
- Use the full suite only for broad/requested runtime impact, normally once per unchanged runtime revision. Run bfcache only for lifecycle work.
- Reuse beta Testbed for stable only if runtime is unchanged, only `-beta` is removed, and live beta use is confirmed; record why.
- Move superseded local userscripts to `Legacy유저스크립트storage/`; if root/`dist/` match, archive one copy.
- Never repair source/build divergence by editing generated userscripts.

## Testbed fidelity
- Reproduce stable, non-sensitive live differences in fixtures with regression assertions.
- Before selector/layout changes with weak evidence, request redacted probes, screenshots, viewport, and steps.
- Report selected coverage; never imply unselected tests passed.

## Durable maintenance notes
- In `docs/agent-maintenance-notes.md`, record reusable context, causes, discarded fixes, contracts, and coverage.
- Record recurring live regressions, viewport/target divergence, and fragile host contracts; omit routine/transient dead ends and sensitive data.

## Git publishing
- `origin`: `https://github.com/domato153/dc-uidfiltering.git`. Beta/review uses `codex/*`; commit locally and push only when requested.
- Before `codex/*` commit/push, keep current artifacts/evidence and archive older userscripts locally.
- `Mobile` owns `Dc_UserFilter_Mobile.user.js`; `main` owns PC script/site. Mirror `README.md` and its images to `Mobile` on every change.
- Stable: update that target's badge in `main:README.md`.
- Publish stable from a clean official worktree; replace only the canonical userscript, preserve history, and never force/merge the source branch wholesale.
- After confirmed beta use and a full stable request, push official branches and create the Release.

## Fragile contracts
- Preserve GM storage keys and shapes; add migration or fallback for semantic changes.
- Treat `document-start`, hidden-body locking, boot overlay release, and timeout recovery as one initialization contract.
- Reuse observers and rerun hooks; prevent duplicates, bound retries, and retain delayed-content coverage.
- Scope CSS to script-owned containers; check light/dark, stacking, clipping, pointer input, and popup context.
