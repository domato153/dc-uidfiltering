# AGENTS.md

## Primary rule
Preserve existing behavior first.
Prefer the smallest safe patch, but allow structural changes when they are necessary to fix root causes.

## Instruction priority
- Follow this file first for work in this project.
- Use the root workspace `AGENTS.md` only as fallback guidance.
- Keep project-specific build, storage, selector, and regression rules here or in nearby project docs.

## Change policy
- Patch in place by default.
- Large refactors are allowed only when a local patch would leave the system fragile, duplicated, or harder to maintain.
- When choosing a refactor, explain why a minimal patch is insufficient.

## GPT/Codex work defaults
- Inspect the project layout before editing; prefer `rg` and `rg --files` for search.
- Preserve behavior first, then improve performance or structure.
- Prefer the smallest safe source change unless a broader refactor removes real fragility or duplication.
- Keep reusable project-specific lessons in this file, `.agents/skills/`, or `docs/` instead of relying on chat history.

## Source of truth
- Treat `src/` plus `tools/build-userscript.mjs` and `tools/build-pc-filter-userscript.mjs` as the only editable source of truth for releases.
- Do not patch generated root userscripts (`Dc_UserFilter_Mobile_v*.user.js`, `dcinside_user_filter_v*.user.js`) or `dist/` copies directly unless the user explicitly asks for an emergency hotfix.
- Before inspecting or patching target-specific behavior, classify the request as mobile full UI, PC filter port, shared filter/runtime, or build tooling.
- For mobile full UI-only symptoms such as responsive layout, article UI, mobile restyling, ad hiding, popup placement, dark-mode view styling, or write-page UI, stay in mobile-only sources by default and do not expand into `src/targets/pc/` or the PC build unless there is direct evidence the PC port is affected.
- Treat the PC target as a filter-only port. Do not add, change, or rebuild PC behavior for ad hiding, article UI, mobile restyling, write-page UI, popup placement, or other non-filtering features unless the user explicitly requests a PC feature change. PC-side UI/CSS edits should be limited to filter controls and filter-management surfaces.
- Treat `src/targets/mobile/filter-module.js` as a cross-target input because the PC build extracts its `FilterModule`. Do not place mobile UI-only fixes there unless the intended behavior should also reach the PC port.
- PC rebuilds are required for changes that affect actual filtering decisions, persisted filter settings/storage compatibility, shared normalization/parsing, user identity extraction used by filtering, or PC row/comment hiding behavior. Do not rebuild PC just because a mobile source file changed when the diff is provably mobile UI-only, such as article layout, comment placeholder DOM cleanup, reply-merge/card grouping, post-reveal UI repair, popup positioning, boot/reveal visuals, dark-mode view styling, or ad/write-page UI.
- After mobile runtime source changes, rebuild with `node tools/build-userscript.mjs` so the mobile root release file and `dist/` copy are regenerated from source.
- After PC runtime source changes, rebuild with `node tools/build-pc-filter-userscript.mjs` so the PC root release file and `dist/` copy are regenerated from source.
- After shared source changes, rebuild every affected target; default to both mobile and PC builds unless the changed shared code is provably target-specific.
- Some non-`src/shared/` files feed both targets: `src/runtime/bootstrap.js`, `src/targets/mobile/filter-module.js`, and `src/targets/mobile/personal-block-module.js`. Rebuild both mobile and PC outputs when these change unless the generated PC output is provably unaffected.
- Prefer keeping build transforms mechanical only. Do not reintroduce business-logic-only transforms in the build script when the same logic can live in `src/`.

## Version / beta build policy
- Unless the user gives a different versioning instruction, bump the affected target by `0.0.1` and build it as a beta first, using the same prerelease version for repeated fixes in that review cycle.
- Example: from stable `3.2.6`, the default review build is `3.2.7-beta`; if more fixes are made before confirmation, keep rebuilding `3.2.7-beta` rather than creating `3.2.7-beta.2` or `3.2.8-beta`.
- For the mobile target, when the current stable release is `3.2.9`, the next review build is `3.3.0-beta` rather than `3.2.10-beta`; keep rebuilding `3.3.0-beta` through that review cycle.
- When the user confirms the beta, remove the `-beta` suffix and rebuild the same bumped version as stable, e.g. `3.2.7-beta` becomes `3.2.7`.
- If the user explicitly requests a big-step/big step version jump, named version, or non-beta build, follow that instruction instead of the default `0.0.1` beta flow.

## Release verification
- A release update is not complete until each rebuilt root userscript and its `dist/` copy match.
- When possible, verify every generated userscript touched by the change with `node --check`.
- If source and built output diverge, stop and fix the source/build chain instead of editing the built userscript by hand.

## Runtime constraints
- Preserve early-init behavior by default.
- If initialization timing must change, explain the reason, affected flows, and safeguards against hidden-body or stuck-overlay failures.

## DOM / observer rules
- Prefer modifying existing observer logic first.
- New observers are allowed only when existing hooks cannot cover the case safely.
- Any observer-related change must address duplicate execution, stop conditions, and performance impact.

## Persistence rules
- Backward compatibility for stored data is the default.
- If storage schema changes are unavoidable, add migration logic or compatibility fallback.

## CSS rules
- Avoid broad CSS cleanup by default.
- Local CSS restructuring is allowed when it clearly reduces breakage or duplication.
- Validate normal mode and dark mode after CSS changes.
