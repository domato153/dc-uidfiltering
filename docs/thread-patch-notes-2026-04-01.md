# Thread Patch Notes (2026-04-01)

> Historical patch record — current instructions 아님. Use `AGENTS.md` and current source/build tooling for active work.

Version baseline: `3.2.1`

This note records the net result of the long comment/popup thread. It only describes changes that remain in source, plus one known unresolved issue.

## Completed fixes

### 1. Comment nickname popup vs. reply/parent card stacking

Fixed the mobile comment nickname popup being covered by reply cards or nearby comment cards.

What was kept:

- `src/targets/mobile/post-main-fixes.js`
  - Focus-comment reply groups now keep the parent card background in a dedicated `::after` layer instead of lifting the whole parent card.
  - Popup fixes lift only the nickname/info/popup layer, not the full parent card.
  - Comments were added in source explaining why blindly raising the whole focus-group parent card causes the white merged background to cover nearby comments.

Why this mattered:

- The original issue was not just `z-index`.
- The merged parent card paints a long white background through `::after`.
- If the whole card is promoted during popup fixes, that white background jumps in front of other comments and makes the thread look broken.

Relevant source anchors:

- `src/targets/mobile/post-main-fixes.js`
  - focus-group parent styling near the `data-dcuf-focus-group-parent` block
  - user popup layer logic around the comment popup handling section

### 2. Parent-comment placeholder handling for blocked comments with visible replies

Kept the parent-comment placeholder flow that shows `차단된 댓글입니다 / 답글 N` while replies remain visible.

What was kept:

- Placeholder CSS for blocked parent comments with replies
- Placeholder insertion/sync logic
- Focus comment grouping sync that keeps merged reply cards visually coherent

Relevant source anchors:

- `src/targets/mobile/post-main-fixes.js`
  - placeholder CSS around the `dcuf-parent-comment-filtered[data-dcuf-parent-placeholder="1"]` rules
  - placeholder sync logic around `syncFilteredParentPlaceholder`

### 3. Safer comment sync refilter display handling

Prevented comment items from being temporarily shown just because a sync rerun clears `style.display` before later passes finish.

What was kept:

- `src/targets/mobile/filter-module.js`
  - In `applySyncToDescriptors`, comment items no longer have `display` blindly reset during sync reruns.

Why this mattered:

- Comments can already be hidden by async UID blocking or parent placeholder logic.
- Resetting `display` too early can briefly reveal comments until a later pass hides them again.

Relevant source anchor:

- `src/targets/mobile/filter-module.js`
  - comment about preserving comment visibility in `applySyncToDescriptors`

### 4. Reply-merge trigger narrowing

Reduced reply-merge reprocessing so it reacts to actual reply-structure changes, not every nearby mutation.

What was kept:

- `src/targets/mobile/post-main-fixes.js`
  - reply-merge observer now filters mutation targets more narrowly before scheduling merge work

Why this mattered:

- Earlier, reply-merge could re-trigger from comment UI churn too broadly.
- Narrowing the trigger helps avoid unnecessary reprocessing loops.

Relevant source anchor:

- `src/targets/mobile/post-main-fixes.js`
  - `isReplyMergeMutationNode`
  - `isReplyMergeAttributeTarget`
  - `shouldScheduleReplyMergeFromPayload`

### 5. Initial comment stabilization wait before UI-ready

Added a small initial comment-stabilization wait before the mobile UI marks itself ready.

What was kept:

- `src/targets/mobile/post-main-fixes.js`
  - exposes `window.__dcufAwaitInitialCommentStabilization`
- `src/targets/mobile/ui-module.js`
  - waits briefly for that first comment stabilization window before finishing initial UI reveal

Why this was added:

- Mobile comments can go through one more reply-merge / placeholder stabilization step after filter init.
- Holding the initial reveal slightly longer is safer than opening immediately and letting the user see that extra churn.

Relevant source anchors:

- `src/targets/mobile/post-main-fixes.js`
  - `window.__dcufAwaitInitialCommentStabilization`
- `src/targets/mobile/ui-module.js`
  - `awaitInitialCommentStabilization`

## Partial mitigation kept

### Personal block hold during comment-only sync reruns

A guard remains in place so a comment that was already marked as personally blocked is not eagerly re-shown by comment-only sync passes unless a full refilter explicitly allows it.

What was kept:

- `src/targets/mobile/filter-module.js`
  - `data-dcuf-personal-blocked`
  - `personal-block-hold` branch in sync decision handling
  - full refilter path passes `allowPersonalBlockReveal: true`

Why this was kept:

- Comment-only stabilization passes can run before settings/metadata feel fully stable.
- This is a conservative safeguard to avoid casual re-showing during sync churn.

## Investigated but not fully solved

### Mobile comment flicker for personally blocked comments

Status: unresolved

Observed behavior:

- On some mobile article comment threads, personally blocked comments can still flash during initial comment-area stabilization.
- The same symptom was not reproduced the same way on PC `1.9.0`.

Current understanding:

- This looks tied to mobile comment UI stabilization and reply/placeholder post-processing rather than a simple block-decision failure.
- The issue is intermittent and timing-sensitive.
- Several mitigations were kept, but the flicker is not considered fully fixed.

## Debugging code status

Temporary `comment flicker` debug hooks that were added during investigation were removed again.

Net result:

- No thread-specific temporary console APIs remain for this investigation.
- Built output was regenerated after cleanup.

## Release/build state

Version remained pinned to `3.2.1`.

Source/build sync expected:

- `tools/build-userscript.mjs`
- `src/shared/filter-core.js`
- rebuilt root userscript
- rebuilt `dist/` copy

## Practical takeaway for future work

If this thread is revisited later, start from these assumptions:

1. The popup/card issue was fundamentally a layer ownership problem, not a simple `z-index` number problem.
2. Focus-comment parent cards must not be lifted as a whole because their merged white background is painted through `::after`.
3. Mobile comment flicker around personal block is probably a comment-area stabilization / rerender timing problem, not just a bad block match.
4. Any future attempt should prefer narrow observer/timing changes over broad CSS or broad `display` resets.
