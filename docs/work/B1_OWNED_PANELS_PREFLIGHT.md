# B1 owned menu/settings preflight

2026-10-27. Status: **PREFLIGHT_OBSERVED / DRAFT_REFERENCE / PRODUCT_NOT_IMPLEMENTED**. Mode: Operate. Source base `d88cef8b66a497a50e8a1db236210b0fa6f5225b`; guarded Mobile3.5.5 `4BEA35A6DDDC6618A19BEC61B5A93F6483512B6544D3240F695B07466BDE3860`. This unit prepares P4; it does not finish P4 or change product runtime.

Subsequent user steering/implementation: B1_GLASS_TRANSMISSION.md supersedes this draft's dense material. The colored diagnostic plate below was actually inserted above the scrim; it proves optical capability only, not normal modal appearance. Use the new normal-page reference/real-scrim/same-region review and CURRENT/NEXT for current product state. This historical preflight remains the root/anatomy inventory.

## Finding and one implementation boundary

The existing FAB/drawer already consumes optional B1 menu material. The remaining owned panels use the same settings presenter but paint opaque header, body, footer and nested section backgrounds. Adding blur only to the root cannot show the page through those layers. This is a shared material/composition gap, not a missing filter feature or a need for twelve independent popup engines.

Keep `src/targets/shared/settings-presenter.js` as template/style owner; existing filter-settings/personal-block/theme adapters own commands and popup geometry. The effective architecture candidate already contains these shared owners. Do not promote/edit the accepted registry or introduce another visual phase to implement this plan.

Next bounded implementation: optional **Mobile-owned panel material hooks** in the existing shared presenter, supplied by `src/targets/mobile/theme-host-style.js`. Cover shell/header/body/footer, quiet section grouping, thin close glyph with the existing44px hit target, and paper fields. Preserve existing PC fallback values and all handlers, forms, storage shapes, snapshots/UiPort, drag/resize and overlay lifecycle. Resolve old opaque competitors in that owner rather than adding a late correction sheet. The CSS in `docs/design/` is an isolated proposal recipe, never a build input to import wholesale.

## Root inventory and reachability

All twelve entries below were opened in separate fresh Chrome156 source-injected fixture contexts, light and dark, at980×900. Names identify actual roots; observation of one branch does not complete every checklist child.

| Family / checklist | Root | Existing command/geometry owner and observed state |
| --- | --- | --- |
| FAB/drawer P-01/P-02 | `#dc-personal-block-controls`, `#dc-personal-block-drawer` | personal-block-host-adapter; original menu click, four destinations; drawer already B1 |
| Filter S-01–S-05 | `#dcinside-filter-setting` | filter-settings-host-adapter; master/exclude, threshold0, network modes, disabled ratio and lower settings scroll |
| Headtext S-07/S-08 | `#dcinside-headtext-manager-panel`, surface `headtext-settings` | filter-settings-host-adapter; filter→manager, discovered categories, direct-add field, other-gallery empty |
| Shortcut S-06 | `#dcinside-shortcut-modal` | filter-settings-host-adapter; filter→change, waiting state and original actions |
| Management P-07–P-10 | `#dc-block-management-panel` | personal-block-host-adapter; UID empty and three populated synthetic UIDs, long name, original tabs/search/toggle/actions |
| Manual P-05/P-06 | `#dc-manual-block-panel` | personal-block-host-adapter; FAB→manual defaults to nickname |
| Nested add P-11 | same manual root | management→add defaults to UID with extra display-name field; taller than nickname is an intentional state difference |
| Backup P-11/P-12 | `#dc-backup-popup` | personal-block-host-adapter; management→backup, export/file/clipboard/import controls observed without activation |
| Palette S-09/S-10 | `#dcuf-palette-panel`, overlay `#dcuf-palette-overlay` | theme-presenter/host path;14 original choices, selected teal and last pink option reached by internal scrolling |
| Convenience S-11 | `#dcuf-mobile-convenience-settings` | mobile convenience-module; current three options and draft-delete/save controls observed |
| FAB size P-13 | `#dc-personal-block-size-panel` | personal-block-host-adapter;100% preview, original60–160% bounds and reset/cancel/save |
| Author choice P-03/P-04 | `#dc-selection-popup` | personal-block-host-adapter; article comment author→nickname/UID choices and cancel |

The existing popup-geometry-host-adapter remains the drag/pinch/resize owner. Existing S-12/P-14 behavior tests should be selected for implementation; this preflight does not claim to have exercised every closing path.

## Current/native/published evidence and proposal

- Current B1 header/theme and C885 simple controls are the material context. Product anatomy comes from current shared templates and their real adapters; these are script-owned windows, not DCInside host popups.
- Published stable control `testbed/artifacts/baseline-mobile-stable.user.js`, SHA256 `32BA208DDD9973A7EEC343F01E963A833AB4F0C084987077EDAE46844383C25D`, was read only. Its historical captured filter window was viewed as functional/anatomy context; it is not a fresh same-runtime comparison or an aesthetic authority. Current sections retain those filter choices rather than copying obsolete layout.
- Derived proposal: continuous frosted shell, restrained top edge/depth, transparent header/body/footer, quiet group separators, readable opaque input/content surfaces, existing simple action faces. Decorative English kickers are removed from the proposal; functional Korean text remains. Keep native palette swatches/content colors.
- Selected light target: `docs/design/b1-owned-panels-target-light-2026-10-27.png`, SHA256 `851D614864C50D62D8C6DF75CAB0E14C9082E84C48180BBA15A2E4BC9171AAF5`.
- Dark counterpart: `docs/design/b1-owned-panels-target-dark-2026-10-27.png`, SHA256 `6F98E964141E2A5CE9183122A889809443B151E0E171A59B3C9E59CA7EAFFAF8`.
- Selected region: **owned filter panel shell/header/body/footer, quiet grouping, paper fields and thin close action**. This is an independently preserved draft target for the next implementation, not an approved product golden. User review remains possible; no claim that a static image proves functionality.

## Bounded observations and remaining checks

Local evidence lives in `artifacts/b1-owned-panels-2026-10-27/`: current inventory plus corrected headtext/selection follow-up, populated management,24 final proposal states and a16-context proposal geometry audit. The latter covers five roots at980×900 and filter/management/palette at980×2306, both themes. Final audited roots have no horizontal scroll excess; visible close/footers hit their original controls. Close targets remain44px with a14px glyph. Palette14 entries and final pink center are reachable. This is a layout proxy, without actual phone scale/DPR/input/extension qualification.

Separate labeled management probes put two colored halves behind the panel, then reverse them. Light and dark shell/header/footer visibly transmit the changed background; paper rows/fields remain stable. These are diagnostic backing images, not proposed product decoration. Normal captures remain the design evidence.

The prototype exposed the range input's UA margin: `width:100%` plus default horizontal margins produced4px scroll excess even though no visible descendant crossed the root border. The draft resets that input's margin locally; final audit records0. Implement this only in the existing size-field owner, without hiding overflow. Dark shadows reuse the existing B1 token rather than mixing the light foreground into a halo.

Selection transition initially exposed two same-ID roots: exit adds `.dcuf-pop-leave` for120ms while the next choice root enters. Wait for the existing leaving root to disappear before measuring; this observation is not evidence of duplicate handlers. The corrected owner-state wait captures one stable choice root. Do not remove the transition or add another observer.

Still required at implementation: affected UI callbacks/state receipts and PC fallback, focus/keyboard and close/reopen, management search/selection/pending deletion, manual invalid/duplicate/failure, shortcut input/cancel, headtext changes, palette preview/cancel/delayed-save/error/14 bindings, size preview/cancel and drag/resize/short viewport. Use synthetic data and existing harness contracts; do not invoke real save/import/delete/download/clipboard just to inspect appearance. Browser/OS dialogs and sign-domain authentication remain separate. Menu Unicode glyphs are existing content in this shell proposal, not a claim of final icon-family polish.

Rendered review retains a concrete finish gap: the existing dark inactive switch thumb blends into its track. The shell-only draft preserves it, so the six-pair native Playwright comparison is **NEEDS_WORK**, with all six intended design pixel differences retained. Finish the Mobile thumb material in the same existing control owner and verify default/checked/disabled contrast; preserve PC fallback and filter meaning. The frozen shell reference never approves that unfinished detail.

The final16-context layout audit observed14 close controls and16 footer controls with positive bounds/hits; palette14-count/final-option hit checks ran in four theme/height contexts. The delivered selected-state viewer decoded48 current/proposal images across24 states with matching aspect ratios, two images at a time. Separate backing and tall-layout views are labeled. Impeccable's CSS regex detector found no matches, but parsed-page contrast/tiny-text rules did not run; this result cannot waive the switch gap or replace rendered review.

No product source/build/version/metadata/storage/registry change. No new dependency, observer or framework. No full Mobile/PC suite rerun for a draft-only artifact; previous functional results retain their own runtime scopes. P4 stays open.
