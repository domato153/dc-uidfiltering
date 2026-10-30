# Owned menu/settings v7 preflight

Mode:Operate. Source base21e82a4f407d3d42f25297bf339940ee82147c37;Mobile3.5.5 runtime331336FE15D7951AD3751D0A76AD201CFBB9AB31A209B1A7A747E6331AD976F2. Status:IMAGE_PROPOSAL_FOR_USER_REVIEW / PRODUCT_UNCHANGED. This unit delivers a tailored proposal,not a migrated popup family.

Started2026-10-30;recorded2026-10-31 KST. The dated image/prompt filenames retain their actual generation date.

## Direction and actual references

Use the adopted actual memo implementation for material/button/type/icon detail:docs/design/b1-memo-workbench-light-2026-10-29.png,F40C243D8789E412D1D59CBA5D0661A6711821BAF3C042082308015136EB0FA5. Generated images govern composition only. UI_REFERENCE_GUARD.md and B1_MEMO_WORKBENCH.md retain that priority;adapt the single-list management task rather than copying memo-specific checkboxes or its two-column layout.

Current curated management capture:docs/design/b1-owned-management-incumbent-light-2026-10-30.png,DE91791DCA19BF3B7B843D7D9D62F7FBB21F2CC920C8040112ED798893796C84. Fresh synthetic source-injected Chrome156.0.8078.76 captures cover menu,management and filter light/dark at980×900. Six observations found0 horizontal panel overflow and unchanged synthetic persisted settings after inspection/unsaved selection/close. This is anatomy/capture evidence,not six product tests or live-account/physical-phone qualification.980×2306 remains the adopted phone layout;980×900 is the deliberately shorter preflight view.

## Current findings and reusable boundary

- The menu drawer already has quiet rows and common glass roles. Preserve that useful structure;unify finish with the new family rather than changing it for novelty.
- Management still boxes tabs,search tools and every row;its primary is the earlier dense accent face. At the actual400×500 default,even three sample rows require internal scrolling. This is a useful representative for clearer hierarchy and space allocation.
- Actual management default width/height are assigned inline by personal-block-host-adapter.js at open,despite the shared presenter's600px CSS width. Do not fight those live geometry values with important CSS. Implementation must align the existing default geometry with the chosen composition while preserving the popup-geometry adapter's drag/resize/clamp responsibility. Current code resets this window on every open;do not invent stored geometry/migration work.
- Existing theme-material-values.js already supplies v7 primary fill/ink/rim/shadow,reading and floating-glass roles. Shared settings-presenter.js owns templates and per-surface CSS;theme-host-style.js/Mobile material hooks supply optional Mobile values. Reuse these owners and leave PC fallbacks intact. No global correction sheet,new observer or new popup engine is justified.
- Each row's original delete button toggles an unsaved deletion set;the save action commits it. Management has no memo-style row checkbox. Keep that meaning,search,three tabs/counts,local/global selection,enable toggle,add,backup,close and resize. Any newly discovered responsibility change needs its own architecture decision;no renderer/logic move is part of this preflight.

## Proposed composition

Image:docs/design/b1-owned-management-v7-proposal-2026-10-30.png,DDD4C17B070F73751717029B0D4EBB8DF81D83EC21427A7AF5E62C4C60103A4E. Built-in image generation from actual memo/current management,followed by one focused refinement. Exact prompts are the sibling b1-owned-management-v7-proposal-prompt-2026-10-30.txt and b1-owned-management-v7-proposal-refine-prompt-2026-10-30.txt.

A wider single-list workbench;underlined text tabs;search plus a quiet selection action;one stable list-reading pane with fine row dividers;plain add/delete/selection/backup controls;one pale tinted primary at the footer. The first generated draft re-boxed auxiliary actions and wasted vertical space;it is superseded. The refined proposal removes those boxes and shortens the window. Header/gutters/footer carry ordinary-page frosted transmission;search/list remain readable paper. Teal is a sample dynamic accent,not fixed authority. Destructive/pending colors remain semantic.

The image has different canvas/window dimensions from the incumbent;the viewer is a composition comparison,not a pixel-diff proof. Fine generated inconsistencies,including exact warning ink or inactive divider strength,do not override actual memo tokens and accessible rendered states. The proposal is not a new regression baseline or proof of blur/contrast/theme behavior. User adoption remains pending;no product source was changed to match it yet.

## Rollout inventory

| Bounded group | Checklist and current route | Adaptation |
| --- | --- | --- |
| Management first | P-07–P-10,P-14;personal-management/shared settings owner | Implement only after proposal review;normal/empty/search/pending/disabled plus long names,close/reopen and original resize. |
| Management children | P-05/P-06/P-11/P-12;manual add and backup | Reuse material;retain UID/nickname/IP fields and nested modal stacking,unsaved parent state and native backup contracts. |
| Menu and selection | P-01–P-04/P-13;personal-menu,selection,size | Keep compact drawer/selection roles and existing FAB drag/scale behavior;do not clone a large workbench into these small windows. |
| Filter settings and children | S-01–S-08;filter-settings,headtext-settings,shortcut-settings | Settings group hierarchy and numeric/disabled states need their own fit;keep all current options and lower scroll region. |
| Palette and convenience | S-09–S-12;theme/convenience owners | Preserve14 swatches,preview/save/cancel,three convenience options and draft action;carry common finish without repainting swatch semantics. |

This table routes the existing family,not an instruction to run every state or implement all groups at once. B1_OWNED_PANELS_PREFLIGHT.md is historical anatomy only;its old proposal does not revive. Native site settings/login/popups keep their own current routes and are not silently certified here.

## Next implementation and proportionate checks

After the user reviews this composition,begin the management slice through its existing shared presenter and Mobile value hooks,with the actual default-geometry conflict resolved in its current owner. Preserve PC fallback;if shared template/CSS/adapter behavior changes,inspect and test only the affected PC consumers. No release/version/storage shape change is planned.

Check the changed management/adjacent child paths:initial/other tabs,counts/search/no results,long names,unsaved delete toggle/local/global selection,disabled feature,save/cancel/close/reopen,nested add/backup and pointer/short-height containment. Reuse existing personal-block/geometry tests. Shared material changes require14-palette light/dark preview/save/cancel for affected accent roles;local consumer changes start with distinct palette samples. Inspect normal-page transmission and readable whole/detail views against actual memo plus the composition image. No routine full-suite/filter-network/editor/128-child repeat.

Local viewer:/owned-v7/index.html on the existing comparison server. It loads one image at a time. Local observations and generation intermediates stay ignored under artifacts/b1-owned-v7-preflight-2026-10-30/. No credentials,real save/delete/import/export/clipboard,posting or uploads were used.
