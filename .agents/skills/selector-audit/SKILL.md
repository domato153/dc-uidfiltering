---
name: selector-audit
description: Selector and DOM-targeting audit for this DCInside mobile/PC split userscript. Use when selectors feel fragile, dynamic rerenders break features, a change touches mobile list, PC list, article, comment, write, or popup contexts, or Codex needs safer targeting for site-owned DOM versus script-owned UI.
---

# Selector Audit

## Overview
Audit selector usage and DOM assumptions before changing or trusting them. Focus on fragility under rerendering, page-type drift, and mixed ownership between host-site markup and injected script UI.

## Audit Boundaries
- Separate site-owned DOM from script-owned UI before proposing changes.
- Treat list, article view, comments, write page, popup layers, and special gallery contexts as different environments unless proven otherwise.
- Prefer selectors anchored by stable IDs, data attributes, container context, or script-owned classes.
- Flag selectors that rely on text content, `nth-child`, brittle sibling order, or host classes that look auto-generated or layout-only.

## Workflow
1. Inventory the selectors touched by the task, including inline `querySelector` calls and selector constants.
2. Classify each selector by owner: site-owned DOM, script-owned UI, or mixed bridge logic.
3. Note the page contexts where the selector is expected to work.
4. Check whether dynamic insertion, reruns, cloned nodes, or mirrored UI can invalidate the assumption.
5. Rate fragility as high, medium, or low.
6. Propose the smallest safer alternative that still fits the current code path.
7. Call out cases where one selector is incorrectly reused across multiple page types.

## High-Risk Signals
- Long descendant chains tied to site layout.
- Selectors that assume one popup implementation for list rows, comments, and article headers.
- Selectors that break if the script clones or mirrors elements.
- Selectors used inside observers without duplicate-execution guards.

## Performance Signals
- Flag document-wide scans inside observers, rerender hooks, scroll handlers, or delayed retries.
- Prefer container-scoped queries when the current page context is known.
- Check whether repeated selector work can be guarded by script-owned data attributes.
- Avoid caching host DOM nodes across rerenders unless liveness is checked.

## Reporting Notes
Include the relevant parts of this structure in the final response without forcing empty sections:
- Selector: the current selector or lookup pattern.
- Risk: high, medium, or low.
- Problem: why the selector is fragile.
- Safer alternative: the preferred replacement or guard.
- Pages affected: list, article, comments, write page, popup UI, or mixed contexts.

## Do Not Use For
- Pure metadata or storage reviews.
- Changes that only modify script-owned logic without touching DOM selection or page assumptions.
