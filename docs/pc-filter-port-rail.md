# PC Filter Port Rail

## Goal
- Treat the mobile filtering feature bundle as the source of truth.
- Future filter-rule changes should start in `src/shared/`.
- Future filtering UI changes should start in the mobile filtering modules first.
- The desktop filter script should follow those shared/mobile changes through a repeatable build step instead of one-off copy/paste edits.

## Current rail
- Shared source of truth:
  - `src/shared/ip-data.js`
  - `src/shared/storage-schema.js`
  - `src/shared/storage-core.js`
  - `src/shared/filter-core.js`
- Mobile filtering feature bundle source of truth:
  - `src/targets/mobile/filter-module.js`
  - `src/targets/mobile/personal-block-module.js`
  - future filtering and personal-block changes should start here first
- Desktop build entry:
  - `tools/build-pc-filter-userscript.mjs`
- Desktop adapter sources:
  - `src/targets/pc/filter-style.js`
  - `src/targets/pc/filter-entry.js`

## What the PC build rewires to shared
- telecom / proxy / KR dataset ownership
- IP prefix parsing and legacy `blockConfig.ip` cleanup
- shortcut parsing/formatting
- threshold and ratio decision logic
- sync guest / proxy / telecom / personal-block decision logic
- normalized filter settings loading

## What remains PC-specific
- desktop selectors and visibility updates
- desktop settings popup shell and shortcut entry
- any future personal block popup / management / backup UI where the desktop host markup requires an adapter difference
- desktop observer wiring
- desktop dark-mode class toggling and any host-page-specific styling differences

## Porting rule
- If a change belongs to filtering features, assume the mobile implementation is correct first.
- Then port it through the desktop adapter/build without falling back to a legacy PC userscript baseline.
- Do not re-design the desktop filtering UI separately unless the host desktop markup forces it.
- PersonalBlock behavior should track mobile in this order:
  - `createFab()`
  - `handleSelectionClick()`
  - `showSelectionPopup()`
  - `createBackupPopup()`
  - `createManagementPanel()`

## Manual parity checklist for PC UI
- palette CSS must remain inside the shared DCUF-owned rail for all filter controls; do not place drawer, selection prompt, manual-block, management, or backup palette rules inside the mobile host-theme range
- changing the shared palette rail requires computed-color coverage for the selection prompt, drawer icons, manual-block focus/active state, management header actions, and both backup export actions
- quick-block FAB shape should match the current mobile pill style, not the old blue circle
- quick-block FAB interaction should match mobile:
  - mouse drag
  - touch drag path still present in code
  - click after drag should be ignored once
- backup popup should keep both export modes:
  - file download
  - clipboard copy
- backup popup import should support both:
  - file picker
  - textarea paste
- when mobile `PersonalBlockModule` changes, review these three methods in the PC baseline:
  - `createFab()`
  - `createBackupPopup()`
  - `createManagementPanel()`
- dark mode should be checked for:
  - selection prompt and drawer icons
  - manual-block header, type tabs, and focus ring
  - backup popup header / body shell
  - block management panel body / list container
  - quick-block FAB
- if mobile changes only shared filter logic, rebuilding PC is usually enough
- if mobile changes popup or personal-block UI, the PC baseline still needs a parity review

## Future update flow
1. Change filter rules or datasets in `src/shared/` first.
2. If the change is filtering or personal-block runtime behavior, change `src/targets/mobile/filter-module.js` or `src/targets/mobile/personal-block-module.js` first.
3. Rebuild mobile with `node tools/build-userscript.mjs`.
4. Rebuild desktop with `node tools/build-pc-filter-userscript.mjs`.
5. Only touch `src/targets/pc/*.js` when the change is PC-host-specific, styling-specific, or entry-point-specific.

## Why this exists
- The shared/mobile filter runtime now owns the rule logic.
- The PC 1.9 rail no longer uses a legacy desktop userscript file as the build input.
- This rail lets future mobile filter updates reach PC with a rebuild instead of another manual re-port.
