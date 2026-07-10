# Agent Performance Notes

Use this note when a task is explicitly about performance, sluggish UI, repeated
filter work, or observer-heavy behavior. Keep `AGENTS.md` short; put longer
performance reasoning here.

## Common Hot Paths

- MutationObserver reruns after list, article, comment, popup, or navigation changes
- document-wide selector scans during dynamic rerenders or delayed retries
- comment and list filtering loops that can revisit the same nodes repeatedly
- GM storage reads or writes inside frequently repeated paths
- shared filter-rule changes that require both mobile and PC build consideration
- boot overlay and hidden-body release timing during first paint

## Preferred Optimization Shape

- Identify the repeated work or user-visible delay before editing.
- Prefer guards, container-scoped queries, and script-owned data attributes before broader rewrites.
- Keep host DOM node caches short-lived unless liveness is checked after rerender.
- Move shared rule improvements into `src/shared/` when both mobile and PC can benefit.
- Keep target-specific DOM assumptions inside the mobile or PC adapter layer.

## Risk Checks

- Faster rendering must not briefly reveal filtered content.
- Observer changes must not miss delayed content, duplicate handlers, or run without a stop condition.
- Storage optimizations must preserve existing keys and fallback behavior.
- CSS or first-paint optimizations must not break hidden-body recovery or leave the boot overlay stuck.
- Shared or cross-target input changes require affected mobile and PC outputs to be rebuilt.

## Reporting

When reporting a performance patch, state:

- the hot path or repeated work that was targeted
- whether the patch was local or required a broader refactor
- which flows were checked, such as list, article, comments, settings, popup, boot overlay, or PC filtering
- any remaining regression risk or manual check that still matters
