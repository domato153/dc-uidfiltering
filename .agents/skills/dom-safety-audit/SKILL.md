---
name: dom-safety-audit
description: Audit DCUF DOM targeting and injected-style failures. Use for an explicit selector/CSS audit or when dynamic rerenders, cloned UI, popup placement, stacking, clipping, pointer handling, or host-style collisions are plausible causes. Do not trigger for ordinary logic, metadata, storage, or release work.
---

# DOM Safety Audit

Audit the smallest complete affected surface, including related states and contexts sharing the same selector, rerun path, or style contract; avoid unrelated expansion.

## Workflow

1. Identify the page context and separate site-owned DOM, script-owned UI, and bridge logic.
2. When live UI is available, capture closed and each single-open state with the audit helper. Record root/parent/geometry/role and compare every signature with the fixture.
3. Trace the selector, rerun hook, and every injected style phase that matches the element. Record stylesheet order and specificity; narrow or remove superseded rules before adding another override.
4. Build the popup's ancestor stacking/clipping graph. Check positioning, ancestor z-index, overflow, `backdrop-filter`, transforms, pointer events, and `elementFromPoint` at visible controls; a large child `z-index` is not proof of reachability.
5. Check dynamic insertion, replacement, cloned nodes, duplicate guards, bounded retries, and observer stop conditions.
6. Prefer stable IDs, data attributes, container-scoped queries, and project-prefixed classes. Treat text matching, `nth-child`, layout-only host classes, long descendant chains, and cached host nodes as fragile.
7. Prefer the smallest root-cause fix covering all affected contexts. Preserve original host nodes and events, and reuse existing rerun paths instead of adding observers.
8. For source-work Testbed runs, build `testbed/artifacts/runtime-under-test.user.js`, set `DCUF_TESTBED_USERSCRIPT` to that path, and pass `--require-runtime-under-test`. Confirm the printed absolute path and SHA-256 before accepting results.
9. Add live-shaped regressions: select a rendered positive-area instance when hidden originals/mirrors coexist, wait for its owner before interaction, and assert positive bounds, label adjacency, popup hit-testing, themes, and viewports. Do not hide the affected popup in visual setup.
10. For lifecycle closure, wait for timers/frames to return to baseline; never replace it with a fixed sleep or call a bounded cleanup timer a leak.
11. Treat screenshot capture as review evidence, never as visual approval. Encode the reference image's required composition, spacing, decoration, and hierarchy as assertions, then inspect the artifact against the reference.
12. Report evidence, affected contexts, discarded partial fixes, and any remaining live-only check.
