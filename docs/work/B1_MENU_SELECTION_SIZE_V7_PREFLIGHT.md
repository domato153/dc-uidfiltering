# Menu,selection and size v7 preflight

2026-10-31. Source base8d3eee36;guarded Mobile8FE3D7A0. **READ_ONLY_PREFLIGHT_COMPLETE / IMPLEMENTATION_PENDING**. Mode:Operate. P-01–P-04/P-13 only. Product,fixtures,harness,stored settings and build artifacts are unchanged by this unit. Button sizing guidance is adopted more generally in B1_CONTROL_MATERIAL.md#v7-adopted-rules.

## Current anatomy and smallest adaptation

| Surface | Observed current structure | v7 adaptation |
| --- | --- | --- |
| Floating menu/FAB | Body-owned controls;one draggable/scalable FAB and a four-item anchored drawer. Original action,label,helper and icon nodes remain. Drawer already has a translucent face,blur8px and plain rows. | Reuse the compatible drawer chrome and full-row menu targets. Refine only affected detail if needed;do not force a new composition. FAB size belongs to its existing user-controlled60–160% scale. Ordinary label-sizing guidance is not permission to reset that setting or change its scale basis. |
| Selection instruction | Body-owned status prompt,leading icon,heading/help and original selection-cancel action. Current face is an opaque card gradient with no backdrop filter. | Reuse the existing glass chrome roles for this status banner,plain label-sized cancel and original instruction. Keep it a status prompt,not a new scrim/modal. Preserve selection-target markers and original exit behavior. |
| Author choice | Original heading→nickname/UID/IP choices→cancel. Unblocked member has2 actions,blocked member2 unblock actions,guest2 actions with1 unblock,nickname-only1 action. Outer shell already consumes common glass;each choice is a separate opaque card. | Keep the hierarchy and exact available choices. Use a stable readable options area/quiet separators instead of repeated decorative cards where appropriate. Block primaries consume current v7 paired roles with compact label sizing;cancel is plain. Preserve the original unblock/danger role and dynamic/authored colors rather than recoloring every action as primary. |
| FAB size | Original dialog heading/help,current percentage,native range60–160%,bounds and reset/cancel/save. Preview scales FAB immediately;cancel restores saved size. Current buttons stretch to equal thirds,about109×44 at default width;save still uses the legacy dense primary. | Reuse this compact composition and native range. Reset/cancel plain,label-sized;save a compact paired v7 primary. Keep reset beside size controls and save/cancel together. Ensure the native range has a usable input area without changing its value/step/keyboard semantics. |

No materially new composition is required. Actual adopted memo/current bright-dark roles supply detail;current original captures supply capability/anatomy only. Same material does not require matching modal geometry or uniform button widths/heights.

Fresh current screenshots:

- [Drawer light](../design/b1-menu-drawer-current-light-2026-10-31.png),[drawer dark](../design/b1-menu-drawer-current-dark-2026-10-31.png).
- [Instruction light](../design/b1-selection-prompt-current-light-2026-10-31.png),[instruction dark](../design/b1-selection-prompt-current-dark-2026-10-31.png).
- [Member choice light](../design/b1-selection-choice-current-light-2026-10-31.png),[member choice dark](../design/b1-selection-choice-current-dark-2026-10-31.png).
- [Size light](../design/b1-fab-size-current-light-2026-10-31.png),[size dark](../design/b1-fab-size-current-dark-2026-10-31.png).

These are guarded source-injected **synthetic article** captures. The test toolbar/background article controls are fixture scaffolding,not a new judgement about the live article UI. They are neither new design proposals nor pixel goldens. Normal-content context is retained so opaque versus transmitting chrome can be distinguished.

## Owners and sizing boundary

The shared settings presenter owns final menu/selection/size CSS. Existing personal-block-host-adapter creates these original nodes and owns open/close,selection data/actions,FAB pointer handling,scale preview/persistence and clamp/drawer placement. Popup geometry retains its existing owner. The older Mobile theme-host-style IDs are rewritten to retired selectors before injection;do not add important rules against those inactive competitors or revive them.

Implement through existing presenter scopes and optional Mobile values. Preserve PC fallback paint/geometry,all original nodes/data/actions,selected/block/unblock semantics,Escape/outside support only where originally present,scale settings and restore behavior. No new style phase,popup engine,observer,portal,network,storage format or ownership move is needed. Do not move behavior into presentation merely to restyle a node.

User-adopted sizing2026-10-31:ordinary actions normally fit label/icon plus padding;avoid arbitrary long minimum widths or stretched equal buttons. Heights and spacing fit the task while preserving readable labels,focus and real pointer/touch targets. A menu's intentional full-row hit target,aligned tabs and a user-scaled FAB are role-specific exceptions. The backup36px example is not a universal dimension. Next checks compact actions against label bounds and purposeful padding,not a quota to make everything small.

## Fresh observations and limits

Chrome156.0.8078.76,one browser job at a time. Five fresh article contexts:980×900 light/dark,980×2306 light layout-only,390×700 dark stress,980×420 light short. Each records9 current states:drawer,prompt,member,blocked member,guest,nickname-only,size100/60/160. All45 roots are inside the viewport without horizontal overflow;all140 visible control centers have positive hits in those snapshots. These are sampled hit observations,not comprehensive accessibility or gesture proof;the native range's actual box is16px high and needs contextual sizing review.

Drawer has4 original actions and closes by Escape/outside click. The4 author variants retain original action counts and unblock roles;cancel exits each without block/unblock.60/160% range previews follow the original FAB scale ratio;cancel restores100% and the saved scale. Synthetic personal lists and saved scale are unchanged in all5 contexts;no runtime errors were reported.

No block/unblock/save,real user data,account,clipboard,upload or actual extension/device job. No drag/save/lifecycle completion is claimed from preview/cancel. Main list,live host,ordinary/image author transfer and PC current rendering remain for the affected implementation checks,not unqualified passes. Source body-level ownership supports reuse across list/view;that is an implementation inference,not a new live result.980×2306 is layout dimensions only,not the measured phone's full screen/DPR/input/visual scale profile.

## Next bounded implementation

Implement menu/selection/size as one coherent family through the existing CSS/value owners. Reuse the compatible drawer;prioritize prompt transmission,choice/readable grouping,paired compact block/save and plain auxiliaries. Preserve all capabilities and original scale/drag/clamp contracts;generate a new composition only if an actual structural change becomes necessary.

Freeze current Mobile/PC before edits,update the affected surface contract,and add the smallest failing material/geometry/label-size contracts. Cover list/view entry,original drawer close and action reachability,selection cancel/member/guest/nickname-only/blocked and long text,range keyboard/preview/reset/cancel/save plus relevant FAB edge/scale behavior. Use disposable data only. Compare affected PC fallback in separate contexts if shared CSS changes. Representative distinct palette preview/save/cancel and actual label contrast suffice for consumer aliases;only a changed common recipe expands to14 palettes. No unrelated full filter/network/writer/product matrix.

Recovery:use current guard and existing createTestPage,article fixture/GM shim,original FAB→quick-block and size extension menu. Existing ui-b1-owned-input-contract.mjs supplies author/scale fixture recipes;the local inspector and UI review preparation helper preserve metadata under artifacts/b1-menu-selection-size-v7-preflight-2026-10-31. Curated current images and tracked receipt retain the meaningful boundary without another screenshot engine.
