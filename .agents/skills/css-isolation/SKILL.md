---
name: css-isolation
description: Scoped CSS and injected UI safety for this DCInside mobile/PC split userscript. Use when changing GM_addStyle blocks, overlays, settings panels, popup layers, badges, buttons, mobile or PC list transforms, dark mode styles, z-index stacking, or any script-owned UI that may collide with host-site CSS.
---

# CSS Isolation

## Overview
Modify injected UI and CSS without widening the blast radius. Keep script-owned UI isolated, avoid site-wide regressions, and validate both normal mode and dark mode.

## Core Rules
- Treat script-owned UI as isolated components with project-specific IDs, classes, and container scope.
- Avoid styling generic tags globally unless the target is tightly scoped to script-owned markup.
- Use `!important` only when the host site leaves no safer override path.
- Check `z-index`, `pointer-events`, `position: fixed`, and `position: absolute` whenever overlays, popups, or floating controls are involved.
- Keep hidden-body and boot-overlay interactions stable when touching early styles.
- When verifying computed styles, prefer range-based contracts that survive responsive overrides and dark-mode variants instead of exact string matches to one pixel value.
- Prefer bounded retry and style-node refresh for recovery when script-owned CSS lands late; treat DOM rebuilds or repeated structural rewrites as a last resort.
- Do not use broad CSS resets or visibility fixes as a performance shortcut; keep early paint, hidden-body, and overlay behavior stable.

## Workflow
1. Identify whether the CSS targets script-owned UI, site-owned DOM, or a bridge between them.
2. Scope selectors to the smallest stable container or project-prefixed class.
3. Check whether the change affects list page, article page, comments, write page, popup layers, settings panel, or floating controls.
4. Review layout side effects on stacking, overflow, clipping, tap targets, and scroll behavior.
5. Review dark mode parity and confirm the same component still reads correctly.
6. Report the exact selectors added or changed and the likely regression surface.

## Red Flags
- Global styling of `div`, `button`, `input`, `a`, `ul`, or `li` with no script-owned scope.
- Broad resets inside `GM_addStyle`.
- Overlays that can trap pointer input or remain visible after initialization.
- Popup positioning rules that only work in one context.

## Reporting Notes
Include the relevant parts of this structure in the final response without forcing empty sections:
- Selectors changed: new or modified selectors.
- Components affected: overlay, settings panel, popup, list item, comment UI, floating button, or other script-owned UI.
- Screens affected: list, article, comments, write page, popup UI, or dark mode only.
- Regression risks: stacking, clipping, overflow, hidden body, tap handling, or theme mismatch.

## Do Not Use For
- Metadata or storage-only reviews.
- Logic-only changes that do not touch injected styles or UI structure.
