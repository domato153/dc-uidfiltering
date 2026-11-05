# Historical parent policy — not executable instructions

The user's 2026-10-04 consolidation request supersedes this policy. The current development root's AGENTS.md is the sole maintained basic contract. The original and prior dirty diff are retained here for lossless recovery; neither creates permission or a second policy owner.

Canonical LF original SHA-256: `7392db72a941b69ce6883cb1803ad606879524dc04221397b551d7ddf9a240f7`.

<!-- preserved original begins -->
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

## Local development workflow
- The current local working tree and local Git history are the default source of truth. The Chat/Codex shared GitHub branch, checkpoint push, SHA handoff, and review-state gate workflow is discontinued unless the user explicitly requests it again.
- Perform routine investigation, implementation, validation, and builds locally. Leave changes uncommitted by default; do not create or switch collaboration branches, maintain tracked handoff briefs, or push intermediate checkpoints without a separate request.
- A local Git commit, GitHub push, pull request, or formal release is a distinct boundary. Execute only the boundary the user explicitly requests, and do not infer later boundaries from an earlier implementation request.
- If a commit is requested, stage explicit paths. Exclude archives, attachments, raw audits/downloads, secrets or user data, and unrelated generated artifacts; separate rules, fixtures, runtime, and artifacts when practical.

## Git publishing
- `origin`: `https://github.com/domato153/dc-uidfiltering.git`. Create a local commit or publish to GitHub only when the user requests that exact action; no branch family is the default collaboration channel.
- Before a requested commit, push, or release, retain current artifacts/evidence and archive superseded userscripts as required by the build rules.
- Push the user-designated current branch without force. Never force-push, rewrite history, open/merge a PR, tag, promote, or update official branches without a separate explicit request.
- `Mobile` owns `Dc_UserFilter_Mobile.user.js`; `main` owns PC/site. Mirror `README.md` and images to `Mobile`.
- Stable updates target version in `main:README.md` and homepage label in `main:index.html`; verify the canonical download version.
- Publish stable from a clean official worktree, replace only the canonical userscript, preserve history, never force/merge the source branch wholesale, and create a Release only after confirmed beta use plus a full stable request.

## Fragile contracts
- Preserve GM keys/shapes; add migration or fallback for semantic changes.
- Treat `document-start`, body locking, boot-overlay release, and timeout recovery as one initialization contract.
- Reuse observers/rerun hooks; prevent duplicates, bound retries, and retain delayed-content coverage.
- Keep one final visual owner per surface. Inspect phase order and specificity before overrides, especially `!important`, `:is()`, IDs, and popup ancestors.
- Scope CSS to owned containers and check affected states, themes, viewports/targets, stacking, clipping, pointer input, and popup context.
