---
name: regression-checklist
description: Manual regression checklist for this DCInside mobile/PC split userscript source after edits. Use before finishing changes to list, article, comment, write-page, popup, settings, boot overlay, dark mode, shared storage/filter logic, PC filtering, event handling, or MutationObserver reprocessing when automated tests are absent or incomplete.
---

# Regression Checklist

## Overview
Produce a concise manual verification plan after edits. Separate must-check items from context-dependent items, mark skipped checks with a reason, and end with a compact release-risk summary.

## Workflow
1. Summarize the change in one or two lines.
2. Mark which areas were touched: list page, article page, comments, write page, settings UI, popup layers, storage, shared filter logic, PC filtering, boot overlay, dark mode, observers, or event handlers.
3. Run the must-check list.
4. Add the relevant conditional checks for touched areas.
5. Record skipped checks with a reason.
6. End with release confidence and the biggest remaining risks.

## Must Check
- Confirm the page becomes visible and the boot overlay does not stay stuck.
- Confirm the overlay does not disappear so early that a partially styled intermediate UI becomes visible.
- Confirm no duplicate settings panel, floating button, popup, or mirrored list UI appears.
- Confirm changed features still work after a rerender, navigation, or delayed content load.
- Confirm no obvious console-breaking behavior is introduced if logs or errors are visible.
- Confirm the final report states which checks were relevant for this change.

## Check If Touched
- List page: transformed mobile list renders, mirrored item visibility stays in sync, pagination and search remain reachable.
- Article page: author popup, body typography, image comment layout, and reply merge behavior remain stable.
- Comments: dynamic reload, reply insertion, typography normalization, and refilter reruns do not duplicate work.
- Settings or popup UI: open, close, drag, toggle, save, and restore flows still work.
- Storage or filtering: saved values persist, compatibility fallback still reads old data, and refiltering reflects the new state.
- Shared source: both mobile and PC build paths are considered; run both builds unless the shared change is provably target-specific.
- PC filtering: PC selectors still hide or reveal the intended rows, shared filter decisions still match mobile behavior where applicable, and `node tools/build-pc-filter-userscript.mjs` regenerates the PC root and `dist/` copies.
- Dark mode or CSS: both light and dark themes remain readable and layered correctly.
- Observer or event changes: no duplicate handlers, runaway reruns, or missing disconnect or guard logic.
- Boot overlay or reveal timing: timeout fallback still reveals the page; when init timing, early CSS, hidden body, observers, or first paint behavior changed, slow network, CPU-throttled, or delayed-DOM scenarios still reveal the final intended first paint instead of an intermediate style state.

## Performance Regression Checks
- Confirm observer changes do not create duplicate reruns or missed delayed content.
- Confirm filtered content is not briefly re-exposed during faster rendering.
- Confirm settings, popup, list, article, and comments still work after rerender or navigation.
- Confirm affected mobile and PC outputs were rebuilt when shared or cross-target inputs changed.

## Reporting Notes
Include the relevant parts of this structure in the final response without forcing empty sections:
- Relevant checks: the checks that apply to the current change.
- Skipped checks: skipped item plus reason.
- Observed risks: concrete remaining regression risks.
- Release confidence: high, medium, or low, with one sentence of justification.

## Do Not Use For
- Early exploration before any change scope is known.
- Pure architecture discussion with no need for a concrete verification pass.
