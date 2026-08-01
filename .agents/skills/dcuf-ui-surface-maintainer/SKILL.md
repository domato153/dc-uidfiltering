---
name: dcuf-ui-surface-maintainer
description: Maintain or review DCUF mobile host-UI redesign and CSS cascade with one visual owner per surface, preserved DCInside DOM/events, and live-shaped validation. Use for header, list, article, comments, write UI, native popups, glass themes, responsive layout, selector specificity, or accumulated !important conflicts. Exclude ordinary logic, metadata, PC-only UI, and releases.
---

# DCUF UI Surface Maintainer

Treat DCUF as a surgical host-page adapter: preserve the site contract while replacing only approved presentation.

## Gate

1. Read `AGENTS.md`, the active `docs/work/*.md`, `docs/ui-surface-contracts.md`, and relevant maintenance notes.
2. Confirm branch, reviewed SHA, and brief status. Do not change runtime, fixtures, or artifacts before user-approved `READY_FOR_IMPLEMENTATION`.
3. Run `dom-safety-audit` first for dynamic DOM, mirrors, popups, stacking, clipping, pointer input, or host-style collisions.

## Establish ownership

- DCUF-owned UI: contain styles under `.dcuf-*` roots.
- Site-owned UI: scope to exact page context and stable host root; preserve nodes, events, forms, and popup descendants.
- Bridge/mirror: record the behavior owner and how trusted input and popup ownership survive.

Do not wrap, clone, move, or replace interactive host nodes for styling convenience. Portal only a verified unreachable original popup and preserve its lifecycle.

Inventory every matching injected phase, order, specificity, inline style, theme, media state, and open state. Select one final visual owner, then remove or narrow competing rules in the same change. Do not add a global correction phase or use repeated root attributes, IDs, long chains, `html`, `body`, or universal selectors as specificity weapons.

Use `!important` only for a verified host inline/important conflict, visibility contract, or layer/containment correction. Record its reason and contexts; never target a removal percentage.

## Preserve contracts

- Preserve DOM order, form action/method, control types, hidden fields, delegated events, native popup content, and submission paths.
- Keep native popup interiors unchanged unless explicitly approved; correct only isolation, ownership, containment, and reachability.
- Reuse observers, schedulers, and rerun hooks; bound retries and retain delayed-content coverage.
- Treat list/view/write/login, theme, viewport, authentication, and open/closed states separately until evidence proves a shared contract.

## Validate before acceptance

1. Model the exact live root, parent/sibling order, attributes, sprite children, and click-created state before production fixes.
2. Add a failing positive contract for geometry, adjacency, visibility, overflow, focus, or `elementFromPoint`; screenshots, z-index alone, and zero-area matches are not passes.
3. Cover relevant light/dark, wide/narrow/short, logged-in/out, and competing-layer states.
4. Run focused guarded source-runtime tests, then the required final suite on the settled runtime; report absolute runtime path and SHA-256.
5. Manually compare approved composition without weakening behavior or accessibility checks.

Report the chosen owner, removed/narrowed competitors, preserved host contracts, validation, remaining live checks, and commit SHA. Put only review-ready facts in the tracked brief.
