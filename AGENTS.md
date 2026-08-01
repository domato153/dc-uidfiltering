# AGENTS.md

## Priorities
- Preserve visible behavior, stored settings, and release output.
- Make the smallest complete change covering directly affected states, surfaces, contracts, and validation; avoid unrelated redesign.
- Measure performance work first and consult `docs/agent-performance-notes.md`. Preserve measured hot paths; record any correctness fallback's trigger, scope, cost, and coverage.
- For long work, maintain `.codex/` goal/contracts/status/validation/next-step and recheck Git after resumes or stages. At transitions, merge duplicates, remove closed history, and move only durable lessons to maintenance notes.

## Source and targets
- Release sources are `src/` and build tools; root userscripts and `dist/` are generated.
- Site layout/UI is mobile-only. PC receives shared filter controls/management UI, not mobile host styling.
- Put shared logic/data in `src/shared/` and host DOM/visibility work in target adapters. Treat bootstrap, mobile filter, and personal-block inputs as cross-target unless explicitly isolated.

## Build and release
- Rebuild affected artifacts without changing version. Bump, promote, commit, push, or publish only when requested.
- Mobile: `node tools/build-userscript.mjs`; PC: `node tools/build-pc-filter-userscript.mjs`. Build both for shared filter/storage/identity changes.
- After builds run `node tools/verify-repo.mjs release`; use `guidance` for guidance-only work and `all` when both targets changed.
- Run the smallest deterministic Testbed coverage for the changed behavior, states, surfaces, and dependencies. Reuse a pass only while its runtime, code, fixtures, and harness are unchanged.
- Use full suites for broad/requested runtime impact, normally once per final runtime; bfcache only for lifecycle work. Report split/unselected coverage honestly.
- Reuse beta coverage for stable only when runtime is unchanged, only `-beta` is removed, and live beta use is confirmed.
- Archive superseded userscripts in `Legacy유저스크립트storage/`; if root/`dist/` match, keep one archive copy. Repair divergence in source/build tooling, never generated files.

## Testbed fidelity
- Model stable, non-sensitive live differences in fixtures and assertions. Inspect code, fixtures, and evidence before requesting redacted probes/screenshots/viewport/steps.
- An approved redesign may update obsolete visual expectations, but never weaken behavior, storage, accessibility, geometry, lifecycle, or containment merely to pass.
- Source-work tests inject `testbed/artifacts/runtime-under-test.user.js`, require the runtime guard, and confirm printed absolute path/SHA-256. Name release-artifact verification separately.
- Screenshots are evidence, not approval. Encode reference composition as geometry, adjacency, visibility, material role, and hit-testing, then inspect it manually.
- Before synthetic interaction, wait for the surface owner class/subscriber. For lifecycle closure, wait for timers/frames to return to their pre-test baseline, not an arbitrary sleep.
- Before broad UI work, update the compact map in `docs/ui-surface-contracts.md`; do not build a stale full-DOM database.

## Maintenance notes
- Record reusable causes, discarded fixes, contracts, coverage, recurring live regressions, viewport/target divergence, and fragile host behavior in `docs/agent-maintenance-notes.md`.
- Omit command logs, transient dead ends, and sensitive data.

## GitHub collaboration
- A user-designated `codex/*` branch is the Chat/Codex source of truth. Its checkpoint commits/pushes are in scope but are not releases; never force-push, rewrite history, open/merge a PR, tag, promote, or update official branches without a separate request.
- Keep execution state in ignored `.codex/`; put review-ready facts in `docs/work/*.md`. Every review/handoff names the exact branch and SHA, and a moved SHA invalidates stale conclusions.
- Chat owns diagnosis and requirements; Codex owns implementation and validation. `CHAT_REVIEW_REQUIRED` or `PAUSED` permits only rules, skills, and the brief. Runtime/fixture/build work starts only after user approval of `READY_FOR_IMPLEMENTATION`.
- Stage explicit paths. Exclude archives, attachments, raw audits/downloads, secrets or user data, and unrelated generated artifacts; separate rules, fixtures, runtime, and artifacts when practical.

## Git publishing
- `origin`: `https://github.com/domato153/dc-uidfiltering.git`; beta/review uses `codex/*`. Publish only when requested.
- Before a `codex/*` commit/push, retain current artifacts/evidence and archive older userscripts.
- `Mobile` owns `Dc_UserFilter_Mobile.user.js`; `main` owns PC/site. Mirror `README.md` and images to `Mobile`.
- Stable updates target version in `main:README.md` and homepage label in `main:index.html`; verify the canonical download version.
- Publish stable from a clean official worktree, replace only the canonical userscript, preserve history, never force/merge the source branch wholesale, and create a Release only after confirmed beta use plus a full stable request.

## Fragile contracts
- Preserve GM keys/shapes; add migration or fallback for semantic changes.
- Treat `document-start`, body locking, boot-overlay release, and timeout recovery as one initialization contract.
- Reuse observers/rerun hooks; prevent duplicates, bound retries, and retain delayed-content coverage.
- Keep one final visual owner per surface. Inspect phase order and specificity before overrides, especially `!important`, `:is()`, IDs, and popup ancestors.
- Scope CSS to owned containers and check affected states, themes, viewports/targets, stacking, clipping, pointer input, and popup context.
