# Conditional Manual Smoke Checks

Run only the groups affected by the release. Record each item as passed, failed, or not run.

## Initialization

- Confirm the local Testbed result is recorded before live smoke checks, or record that a stable promotion reuses the unchanged beta result under the release workflow's skip rule.
- Page becomes visible on success and failure fallback.
- Boot overlay neither sticks nor releases before the intended first paint.
- Duplicate-runtime guard prevents duplicated UI and handlers.

## Filtering and storage

- Saved settings and legacy fallback values load after reload.
- List, comment, parent/reply, and personal-block decisions remain consistent.
- Delayed rerenders do not restore blocked content or duplicate refilters.
- Shared changes behave consistently on affected mobile and PC pages.

## Injected UI

- Settings, popup, backup/import, management, and floating controls open, close, save, and restore as applicable.
- Light and dark modes remain readable without clipping, blocked taps, or incorrect stacking.
- Navigation, delayed content, and rerender paths do not duplicate mirrored or injected UI.
