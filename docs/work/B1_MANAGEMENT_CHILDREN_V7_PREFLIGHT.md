# Management children: v7 preflight

2026-10-31. Source base383208e1;guarded Mobile7E824AD3. **READ_ONLY_PREFLIGHT_COMPLETE / IMPLEMENTATION_PENDING at this preflight**. Subsequent implementation is recorded in [B1_MANAGEMENT_CHILDREN_V7_IMPLEMENTATION.md](B1_MANAGEMENT_CHILDREN_V7_IMPLEMENTATION.md);its current artifact/receipt supersede this preflight's pending state. Mode:Operate. P-05/P-06/P-11/P-12 only. Product,fixtures,harness,stored settings,PC and release artifacts were unchanged by this preflight.

## Current anatomy and findings

| Current surface | Preserved anatomy | Adaptation needed |
| --- | --- | --- |
| Direct block | UID/nickname/IP buttons;UID-only optional display name;original input,label,help,live status,close and submit. Form stays inside its original overlay. | Boxed tabs and dense white-ink primary still use the legacy control recipe. Reuse quiet text tabs/underline,plain close and paired-ink v7 primary. Keep a stable readable field/status region and align actions with the form. |
| Backup/restore | Original export group:file download and clipboard;import group:file input and text input,then import. Popup and scrim are body siblings. | Keep this two-group hierarchy. Input and import button currently have **0px** vertical gap. Add a real action gap and right-sized action grouping;reuse v7 primary and quiet auxiliary treatment. Retain the native file chooser and import feedback. |
| Nested parent | Current720×560 management parent;search/tab/deletion set survives both child close paths. | Keep current scrim/geometry/lifecycle owners. Parent being dimmed is expected;do not infer its material from the dimmed screenshot. |

Fresh current screenshots,not generated proposals or approved new baselines:

- [Manual light](../design/b1-management-child-manual-light-current-2026-10-31.png),[manual dark](../design/b1-management-child-manual-dark-current-2026-10-31.png).
- [Backup light](../design/b1-management-child-backup-light-current-2026-10-31.png),[backup dark](../design/b1-management-child-backup-dark-current-2026-10-31.png).

The child shell already consumes common transmitting-glass/background/header/close roles. Its primary buttons still use dense accent-fill+white ink in both themes,while the management parent consumes bright v7 paired ink. This is a bounded **unmigrated consumer**,not a defect in the adopted dark recipe. Ordinary synthetic page/parent content is visible through the existing child chrome;reuse that material rather than inventing a new glass effect. The input itself keeps stable paper.

## Selected adaptation and implementation boundary

- Use [V7 adopted rules](B1_CONTROL_MATERIAL.md#v7-adopted-rules),actual memo light detail and the **rightmost** current dark button reference. These are equivalent compact form children;retain their useful stacked native composition. A new generated composition would add no unresolved design information here. Current captures are the capability/anatomy control,never the desired material target.
- Reuse existing shared settings presenter scopes for `personal-manual` and `personal-backup`,and optional Mobile material values. Bind primary bg/ink/rim/shadow together;local tab/action layout may adapt. Keep PC's existing fallback paint/geometry;do not alias every legacy primary to v7 or change shared theme semantics. No new dependency,popup engine,observer,style phase or owner move is needed.
- Preserve input IDs/types/hidden state,form submit,validation/help/status content and callbacks. UID is an exact input match,not a new lookup feature. Do not move storage/merge/network/clipboard/download/geometry behavior into presentation. Preserve malformed-import rejection and native alerts;do not replace them with invented custom windows.
- Keep controls in their task group:UID/nickname/IP next to input;close/submit after help/status;download/copy in export;import after its input with visible separation. Plain auxiliaries retain invisible targets and hover/focus feedback. Keep original scroll and close capabilities;do not promise Escape for backup,which currently closes by X/scrim only.
- Update the affected surface contract before child source edits. Compare original/current versus v7 reference at whole and readable detail scale. A different layout is allowed if justified,but is not required to make this equivalent family coherent.

## Observed checks and limits

One Chrome job at a time,version156.0.8078.76. Five fresh synthetic source-injected contexts:980×900 light/dark,980×2306 light **layout-only proxy**,390×700 dark stress,980×420 light short.25 recorded child states cover UID/nickname/IP,empty validation and backup. All25 root bounds stay inside the viewport without horizontal overflow. Both nested scrims block the parent input;both close paths restore search/tab/unsaved deletion state. Disposable persisted storage is unchanged in all5 contexts;no runtime errors were reported.

The initial short-screen snapshot has3 offscreen action centers:UID close/submit and backup import. A separate focused980×420 light/dark replay scrolls the existing child body:manual submit and backup import become positive-area,hit-testable targets in4/4 samples. This is reachable internal overflow,not a proven lost-control defect. Preserve it during spacing changes;root bounds alone are insufficient. The backup textarea→import gap remains0px after scroll in both themes.

This is read-only preparation,not visual acceptance or new functionality certification. No real add/save/import/export/clipboard/file picker/account/device/extension job,full product suite,PC suite or rebuild ran. The980×2306 sample reproduces layout dimensions only;it does not reproduce the measured screen/DPR/input/visual scale. Real-device/account/native OS and existing full-UI gaps remain separate.

## Next bounded implementation and relevant checks

Implementation plan2026-10-31:execute inline through the existing owners;the user's continuation authorizes the described equivalent-family adaptation. No new composition choice is pending.

User refinement during implementation:the two backup primaries look too large. Keep this compact utility form's painted actions near36px high and sized from label+padding,without a long fixed minimum. Retain at least36px positive targets,the original file chooser and visible import-input gap. This size adapts the backup role;manual form and unrelated v7 controls need no automatic size change.

- [x] Freeze current Mobile/PC controls;add failing child material/tab/action-gap contracts in testbed/ui-owned-management-children-v7-contract.mjs and register focused tests in testbed/run-tests.mjs.
- [x] Modify only child-scoped declarations in src/targets/shared/settings-presenter.js and optional values in src/targets/mobile/theme-material-values.js. Keep templates/adapters/UiPort/geometry/backup behavior unchanged;retain original PC fallback values.
- [x] Rebuild affected artifacts at existing versions;run focused child contracts,representative real palette preview/save/cancel/contrast,synthetic manual/backup behavior and separate-context Mobile semantics/PC appearance comparison. Inspect before/after whole/detail and short/narrow captures.
- Checkpoint handoff:record final evidence and one next family,review exact diff,then use only the authorized development branch. No full unrelated product matrix. Exact publication/CI disposition remains in the checkpoint record,not this checklist.

Implement these two child consumers together,then rebuild affected targets at existing versions. Reuse existing personal-input/conditional/management fixtures and exact source guard. Inspect actual diff before choosing tests:

1. Child geometry/material and native nodes/events in light/dark,UID optional name,nickname/IP,empty/duplicate/in-progress/error/success states;no lost live status or disabled state.
2. Backup group/textarea/action separation;internal scroll and positive hits at narrow/short height;safe synthetic text/file valid merge and malformed shape rejection if shared markup/style affects them. OS clipboard/download failure handling stays with its unchanged owner and is not silently certified by UI checks.
3. Both nested close/return paths with parent search/tab/unsaved deletion retained. Main menu entry to direct block shares this same child owner;check that route too.
4. Local consumer colors:representative distinct palette preview/save/cancel in both themes,actual paired label contrast. Only a changed common recipe expands to the14-palette matrix. Preserve authored/semantic error colors.
5. If shared presenter CSS changes,build both outputs and compare affected PC child paint/geometry to frozen current control;run the small affected PC child paths. Do not repeat unrelated PC/filter/network/writer/all128 UI tests.

Recovery:existing `mountManagementV7` in testbed/ui-owned-management-v7-contract.mjs supplies the disposable parent;open `.panel-add-btn` or `.panel-backup-btn`,select original manual type buttons and use the existing UI review preparation helper. Local capture/report scripts remain ignored in artifacts/b1-management-children-v7-preflight-2026-10-31;curated current screenshots and the tracked receipt preserve the observed boundary without a new capture framework.
