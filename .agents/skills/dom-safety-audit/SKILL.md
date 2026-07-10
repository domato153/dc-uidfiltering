---
name: dom-safety-audit
description: Audit DCUF DOM targeting and injected-style failures. Use for an explicit selector/CSS audit or when dynamic rerenders, cloned UI, popup placement, stacking, clipping, pointer handling, or host-style collisions are plausible causes. Do not trigger for ordinary logic, metadata, storage, or release work.
---

# DOM Safety Audit

Audit only the failure surface relevant to the task.

## Workflow

1. Identify the page context and separate site-owned DOM, script-owned UI, and bridge logic.
2. Trace the current selector, rerun hook, and style scope before proposing a change.
3. Check dynamic insertion, replacement, cloned nodes, duplicate guards, bounded retries, and observer stop conditions.
4. Prefer stable IDs, data attributes, container-scoped queries, and project-prefixed classes. Treat text matching, `nth-child`, layout-only host classes, long descendant chains, and cached host nodes as fragile.
5. For injected UI, check selector blast radius, `z-index`, positioning, overflow, clipping, pointer events, tap targets, and light/dark parity.
6. Prefer the smallest fix that addresses the observed failure. Do not add a new observer when an existing rerun path can safely cover it.
7. Report the evidence inspected, the affected contexts, and any check that still requires a live page.
