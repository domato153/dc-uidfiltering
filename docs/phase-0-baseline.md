# Phase 0 Baseline

## Baseline source
- Primary source of truth: `Dc_UserFilter_Mobile_v2.7.5.4.user.js`
- Extracted runtime shell: `src/runtime/bootstrap.js`
- Extracted legacy body: `src/targets/mobile/legacy-app.js`
- Extracted closure tail: `src/runtime/teardown.js`

## Baseline extraction notes
- `bootstrap.js` was copied from the original file's opening runtime block and still owns:
  - duplicate-runtime guard
  - boot overlay helpers
  - initial hidden-body lock helpers
  - top-level runtime state
- `legacy-app.js` currently contains the original application body without functional edits.
- `teardown.js` closes the original IIFE so the alpha build preserves init order.

## Must-preserve behavior before deeper refactors
- Page becomes visible and overlay never stays stuck.
- Settings panel, shortcut dialog, and menu command still open.
- Guest/telecom/proxy strict/aggressive/overseas filtering stays identical.
- Threshold and ratio filters stay identical.
- Recommended-post exclusion stays identical.
- Personal block, management panel, backup, and restore stay identical.
- Mirrored mobile list stays synced with original row visibility.
- Late comment rerenders do not resurrect blocked parents.
- Reply merge, image comments, memo popup positioning, and dark mode stay intact.

## Known version-cleanup items handled by build
- Current legacy body still contains stale init version strings from older releases.
- Current legacy body still has `DEBUG_ENABLED: true`.
- The alpha build normalizes those output-only values without touching the frozen baseline source.
