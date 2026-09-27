# AGENTS.md

## Priorities
- Preserve visible behavior, stored settings, and release output.
- Make the smallest complete change covering directly affected states, surfaces, contracts, and validation; avoid unrelated redesign.
- Measure performance work first and consult `docs/agent-performance-notes.md`. Preserve measured hot paths; record any correctness fallback's trigger, scope, cost, and coverage.
- For long work, keep accepted state and the next bounded task in tracked `docs/work/`; `.codex/` is scratch only. Recheck fresh local HEAD, worktree status/diff, artifact digests, evidence validity, and impact routing after resumes or stages.
- Context-free handoff uses the active worktree's `docs/work/INDEX.md`; the private prompt supplies its exact path. A fork inherits history; the receiver rechecks and returns `ACCEPTED` or `STALE_REPLAN`.

## Source and targets
- Release sources are `src/`, build tools, and `build/targets.json`; root userscripts and `dist/` are generated. Site layout/UI is mobile-only; PC receives shared filter/management UI, not mobile host styling.
- Put shared logic/data in `src/shared/` and host DOM/visibility work in adapters. Treat bootstrap, mobile filter, and personal-block inputs as cross-target unless isolated.
- `architecture/registry.json` is the semantic/layer authority. Its generated index is a view, and `verification/gates.json` owns impact-to-test routing.
- For a current UI owner/layer question, query `node tools/inspect-live-architecture.mjs --surface <id>`; run `--check` before and after changing the surface/architecture map. It derives from the effective registry, manifest, build, and source, and is not live-site evidence.

## Build and release
- Rebuild affected artifacts at the current `build/targets.json` version. Only authorized working-branch checkpoints may commit/push; bump, promote, or publish need separate requests.
- Mobile: `node tools/build-userscript.mjs`; PC: `node tools/build-pc-filter-userscript.mjs`; build both for shared filter/storage/identity changes.
- After builds run `node tools/verify-repo.mjs release`; use `guidance` for guidance-only work and `all` when both targets changed.
- Run the smallest deterministic Testbed coverage for changed behavior, states, surfaces, and dependencies; reuse a pass only while runtime, code, fixtures, and harness are unchanged.
- Use full suites for broad/requested runtime impact once per final runtime; bfcache only for lifecycle work. Report split coverage honestly.
- Reuse beta coverage for stable only when runtime is unchanged, only `-beta` is removed, and live beta use is confirmed.
- Archive superseded userscripts in `Legacy유저스크립트storage/`; if root/`dist/` match, keep one archive copy. Repair divergence in source/build tooling, never generated files.

## Testbed fidelity
- Model stable, non-sensitive live differences in fixtures and assertions. Inspect code, fixtures, and evidence before requesting redacted probes/screenshots/viewport/steps.
- An approved redesign may update obsolete visual expectations, but never weaken behavior, storage, accessibility, geometry, lifecycle, or containment merely to pass.
- Source tests inject `testbed/artifacts/runtime-under-test.user.js`, require the guard, and confirm absolute path/SHA-256; name release-artifact verification separately.
- Screenshots are evidence, not approval; encode composition as geometry, adjacency, visibility, material role, and hit-testing.
- Before synthetic interaction, wait for the owner class/subscriber. For lifecycle closure, wait for timers/frames to return to baseline, not an arbitrary sleep.
- Before broad UI work, update `docs/ui-surface-contracts.md`; do not build a stale full-DOM database.

## Semantic architecture and proof
- Map current ownership honestly. A mixed legacy file remains `mixed` until forbidden dependencies are actually removed.
- Responsibility, owner, relation, invariant, public contract, lifecycle, state, or build-topology changes require a candidate overlay. A `mixed` exit also requires an exact-criteria-bound, current-head gate receipt. Validate the effective graph, then use deterministic promotion so the final PR contains the accepted registry/index, no overlay, and a replayable fold receipt; direct accepted-registry edits are invalid.
- Impact routing uses merge-base paths plus downstream registry relations and component invariant profiles. Gate execution recomputes the Git-derived route, rejects unknown profile selectors, records non-applicable selections distinctly from passes, and never reuses a stateful command across profiles. Unknown source, shared runtime, bootstrap, build, harness, or fixture changes expand to full acceptance.
- Behavior-preserving refactors bind control and candidate source/artifact SHAs and run them in separate fresh browser contexts. Compare semantic receipts, not only DOM text or screenshots.
- Invalidate evidence when its SUT, oracle dependency, fixture, harness, toolchain, or route changes. Classify product, oracle, fixture/harness, verifier/routing/workflow, and environment/live failures separately.
- Skill selection and passing tests never grant commit, push, merge, live-state, or release authority.
- Before a consequential solution/method choice, decide whether current external authority, empirical evidence, or a comparable repository could change the design or verification plan. Research proportionately, test transferability against DCUF, and retain contrary evidence; skip broad research for exact repository-owned facts. At ownership, evidence, stage, or release transitions, reroute only the applicable skills; `verification/skill-routing-cases.json` is a static trigger corpus, not proof of model-level recall.

## Maintenance notes
- Record reusable causes, discarded fixes, contracts, coverage, recurring live regressions, viewport/target divergence, and fragile host behavior in `docs/agent-maintenance-notes.md`.

## Local development workflow
- Local tree/history are authoritative; remote refs matter only for authorized checkpoints. PR, release, and official branches are separate.
- Standing instruction: after each bounded, validated unit, commit and non-force push only the designated branch, now `origin/codex/ui-port-boundary`. First check branch/upstream/remote, staged diff, sensitive data, validation, and fast-forward. Stop on conflicts; do not switch branches, push `main`/`Mobile`, open PRs, or merge without a separate request.
- Tracked instructions and continuity documents use repository-relative paths, never local absolute paths/usernames. Absolute runtime paths belong only in local diagnostics or private new-task locators.
- Keep tracked current state precise: accepted runtime SHA, phase, candidate overlay, validation receipts, stale evidence, unresolved live checks, and one next bounded task. Mark superseded current-looking briefs historical.
- Stage exact paths. Exclude local archives, attachments, raw audits/downloads, credentials, user data, ignored artifacts, and unrelated generated userscripts.

## Git publishing
- `origin`: `https://github.com/domato153/dc-uidfiltering.git`. Standing checkpoints push only `codex/ui-port-boundary` without force; verify the remote result. PR, merge, tag, official publication, and promotion need separate requests.
- `Mobile` owns `Dc_UserFilter_Mobile.user.js`; `main` owns PC/site. Mirror README and images to `Mobile`.
- Stable updates target version in `main:README.md` and label in `main:index.html`; verify the canonical download version.
- Stable publication uses the trusted `main` manual workflow, an exact source/artifact SHA, the `mobile-release` environment approval, compare-and-swap expected heads, a draft Release, attached userscript and checksum, nonempty patch notes, and post-publication verification. Never merge the source branch wholesale or report success when an asset is missing or mismatched.

## Fragile contracts
- Preserve GM keys/shapes; add migration or fallback for semantic changes.
- Treat `document-start`, body locking, boot-overlay release, and timeout recovery as one initialization contract.
- Reuse observers/rerun hooks; prevent duplicates, bound retries, and retain delayed-content coverage.
- Keep one final visual owner per surface. Inspect phase order and specificity before overrides, especially `!important`, `:is()`, IDs, and popup ancestors.
- Scope CSS to owned containers and check affected states, themes, viewports/targets, stacking, clipping, pointer input, and popup context.
- Presentation consumes immutable snapshots and emits typed intents through `UiPort`; it does not own GM storage, network calls, filter decisions, document-wide observers, or shared mutable state. Expected rejections return `CommandResult`; unexpected handler failures reject dispatch so the existing surface owner logs the original failure exactly once.
