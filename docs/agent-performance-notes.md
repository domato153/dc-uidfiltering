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

## Runtime Hot-Path Contracts

- A list/view gallery-heading role subscriber sees unrelated article/comment mutation batches. Test the moved subtree for `.page_head` with native class traversal instead of calling `querySelector` on every added node; keep root/descendant replacement coverage. In the 5,500-node fixture, the first extraction increased element selector calls from the immediate control's 137,426 to 138,679 and failed the `<25` calls/node gate; the narrowed path measured 137,353 calls and passed. The real-site cost remains unmeasured, so a later live performance concern should be profiled rather than inferred from this selector counter alone.
- The 5,500-node steady-state performance fixture must wait for the bounded post-reveal recovery subscriber to release before taking its baseline. Otherwise its legitimate periodic check can be sampled with one active animation frame, making a strict zero-frame assertion dependent on timing; both frozen control and candidate pass after the same readiness gate. Do not erase the zero-frame assertion or use an arbitrary longer sleep.
- Gate mutation subscribers by page context before subscribing; a subscriber for one surface must not receive another surface's immediate records.
- Keep ordinary mutation work batched through the shared runtime scheduler. Use an immediate path only for content that must be transformed or hidden before its first paint.
- A direct pre-paint list sync must suppress or cancel the equivalent queued initial sync and update its generation marker.
- When immediate view-bottom handling overlaps the tbody observer or ordinary mutation bus, tag the already-covered existing state and suppress only its equivalent next schedule so one burst cannot cause both a direct and a queued sync.
- Do not add a document-wide observer when the shared runtime mutation bus can provide a narrower payload. If a separate observer is unavoidable, bound its lifetime and document why.
- Prefer inline state or script-owned attributes for visibility guards; avoid computed-style reads in mutation hot paths.

## Strategic Fallback Exception

- Do not remove or weaken a measured optimization merely to simplify a new feature.
- A slower fallback is acceptable only when a required behavior, compatibility path, or recovery guarantee cannot be made reliable through the optimized path.
- Bound the fallback by page context, trigger, affected container, retry count, and lifetime wherever applicable; it must not become the normal path silently.
- Record why the optimized path was insufficient, the fallback's expected cost, diagnostics that identify its use, and the focused regression coverage.
- Re-measure the normal path after adding the fallback and remove it when its host condition no longer applies.

## Risk Checks

- Faster rendering must not briefly reveal filtered content.
- Observer changes must not miss delayed content, duplicate handlers, or run without a stop condition.
- Storage optimizations must preserve existing keys and fallback behavior.
- CSS or first-paint optimizations must not break hidden-body recovery or leave the boot overlay stuck.
- Shared or cross-target input changes require affected mobile and PC outputs to be rebuilt.
- Verify new and replaced view-bottom tables before first paint, then separately verify that mutations inside an already hidden table stay batched.

## Reporting

When reporting a performance patch, state:

- the hot path or repeated work that was targeted
- whether the patch was local or required a broader refactor
- which flows were checked, such as list, article, comments, settings, popup, boot overlay, or PC filtering
- any remaining regression risk or manual check that still matters
