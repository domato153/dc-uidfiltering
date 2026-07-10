---
name: userscript-patch
description: Conservative source-first patching for this DCInside mobile/PC split Tampermonkey userscript. Use when editing src/targets/mobile, src/targets/pc, shared source, mobile modules reused by the PC build, or related build output paths, especially changes to GM_* storage, boot overlay and hidden-body initialization, filtering logic, popup or settings UI, dark mode styling, list or comment DOM transforms, PC row filtering, or MutationObserver-driven reruns where behavior preservation and minimal diffs matter.
---

# Userscript Patch

## Overview
Patch the source in place and let the build regenerate the userscript. Preserve behavior first, prefer the smallest safe diff, and explain any change that affects initialization timing, storage compatibility, observer lifecycle, or injected UI stability.

## Pair With
- Use `metadata-safety` when metadata, GM APIs, storage keys, run scope, or persisted compatibility are involved.
- Use `selector-audit` when DOM targeting, page-type assumptions, or host versus script-owned markup are involved.
- Use `css-isolation` when injected CSS, overlays, popups, settings UI, z-index, or dark mode are involved.
- Use `regression-checklist` before final reporting when automated coverage is absent or incomplete.

## Core Rules
- Patch the current implementation before considering extraction or refactor.
- Treat `src/` as the editable source of truth. Do not patch generated root userscripts or `dist/` copies unless the user explicitly asks for an emergency hotfix.
- Classify the affected target before broad exploration: mobile full UI, PC filter port, shared filter/runtime, or build tooling.
- For mobile full UI-only issues (article layout, responsive restyling, ad hiding, popup placement, write-page UI, mobile dark-mode view styling), prefer mobile-only files such as `src/targets/mobile/ui-module.js`, `style-banner.js`, `post-main-fixes.js`, or mobile-only style blocks. Do not inspect or patch `src/targets/pc/` just because a PC port exists.
- Rebuild with `node tools/build-userscript.mjs` after mobile runtime behavior changes; also run `node tools/build-pc-filter-userscript.mjs` when the change touches PC source, shared source, `src/runtime/bootstrap.js`, `src/targets/mobile/filter-module.js`, or `src/targets/mobile/personal-block-module.js`.
- Unless the user says otherwise, release review builds use the default beta flow: bump the affected target by `0.0.1`, build `<next>-beta`, keep rebuilding that same beta filename through repeated fixes, and only remove `-beta` after the user confirms. Honor explicit big-step/big step, named-version, or stable-build instructions as exceptions.
- Preserve existing storage keys, UI IDs, classes, and data attributes unless keeping them would leave the behavior broken or misleading.
- Reuse existing observers, rerun hooks, and init paths before adding new ones.
- Treat `document-start`, body visibility locking, and the boot overlay as fragile flows. If timing must change, state why and how hidden-body or stuck-overlay failures are prevented.
- When changing the reveal point for script-owned UI, design the hidden-body lock, boot overlay release, and timeout fallback together as one contract.
- Do not confuse style-application races with observer bugs; avoid high-risk recovery steps such as blanket `display` resets, repeated list recreation, or visibility restoration that can re-expose filtered content.
- Avoid formatting churn across the large source modules and generated userscript output.
- Touch `modtool.txt` or `storage_oldversions/` only when the change truly depends on them.

## Performance Patch Rules
- Before optimizing, identify the hot path, repeated work, or user-visible delay.
- Prefer reducing duplicate DOM scans, repeated observer reruns, unnecessary storage reads, and redundant rebuild-sensitive logic before doing broad rewrites.
- Keep performance patches behavior-preserving unless the user explicitly accepts a behavior change.
- If a performance fix changes observer timing, filtering order, boot overlay timing, or shared/mobile/PC ownership, explain the regression risk.

## Project Anchors
- Treat `src/targets/mobile/filter-module.js`, `personal-block-module.js`, and `ui-module.js` as the main mobile ownership boundaries.
- Treat `src/shared/` as shared storage, IP, and filter-decision logic that may affect both mobile and PC builds.
- Treat `src/targets/mobile/filter-module.js`, `src/targets/mobile/personal-block-module.js`, and `src/runtime/bootstrap.js` as cross-target build inputs.
- Avoid putting mobile UI-only fixes into `src/targets/mobile/filter-module.js`; the PC build extracts its `FilterModule`, so changes there can leak into the PC port.
- Treat `src/targets/pc/` as PC-specific DOM application and style ownership.
- Expect `src/targets/mobile/post-main-fixes.js` and related late fixes to patch comments, reply merging, popup positioning, dark mode, and layout fixes.
- Expect dynamic reruns on list, article, comment, and popup states rather than one-time rendering.

## Workflow
1. Identify the smallest target section and name the affected flow before editing.
2. Check nearby storage keys, selectors, custom attributes, and rerun hooks for compatibility constraints.
3. Patch locally.
4. If a local patch is insufficient, explain the fragility or duplication that forces a broader change.
5. Re-check observer duplication, stop conditions, and performance impact.
6. Re-check normal mode and dark mode when CSS or UI is involved.
7. Rebuild affected userscript outputs when runtime behavior changed, following the default beta flow unless the user gave a different build instruction, then end with a concise regression-oriented report.

## Reporting Notes
Include the relevant parts of this structure in the final response without forcing empty sections:
- Pre-edit summary: target section, intended behavior change, likely regression risks.
- Change summary: what changed and why a local patch was enough, or why it was not.
- Affected flows: list page, article page, comments, write page, popup UI, settings UI, storage, dark mode, boot overlay, or observers.
- Regression notes: concrete follow-up checks or unresolved risks.

## Do Not Use For
- Greenfield scripts or broad rewrites with no intent to preserve current behavior.
- Generic frontend restyling that does not involve this userscript's injected UI.
