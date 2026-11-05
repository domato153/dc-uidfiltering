# Integrated confirmed UI repair

Updated 2026-10-18. All15 original findings are `REPAIRED_VERIFIED_SCOPED`. This closes their original reproductions in `UI_REPAIR_GATE.md`; remaining header admission and whole-UI/device readiness stay open.

The user requested every confirmed defect together and explicitly required easy UI replacement without competition between functional code and presentation. UI-02–UI-15 were repaired as one batch; UI-01 is renewed on the same final runtime. Concept01 is not implemented in this batch.

## Artifacts and ownership

- Mobile 3.5.5: `FD58B82236AC08D0208FD7982E7083945B6A79F132B257C04C56C79BF1B2C1E2`.
- PC 1.9.9: `C14D163F2757DB02117E3F93204B56B6AA22D464541729315A6B40C4128C7D37`.
- Immediate pre-batch control: `4E416EDB2A962F2C63A39BE37601F0ECB669F479FA1B3702DA6E717F8BA77257`; immutable published functional control: `32BA208DDD9973A7EEC343F01E963A833AB4F0C084987077EDAE46844383C25D`.

Adapters retain native discovery, reversible semantic markers, input/identity and sanitized immutable descriptions. Presenters retain visual rules and rendering. No GM key/shape, filter decision, native form submission, document observer, scheduler, release version or accepted architecture ownership changes. Existing header/mixed/palette admission remains separate.

| Findings | Repair and final visual owner | Positive regression evidence |
| --- | --- | --- |
| UI-01 | List presenter releases native fixed toolbar/tab/category dimensions through reversible adapter roles. | Existing toolbar contract: 36 combinations, topology, hit/focus and restoration. |
| UI-02 | Semantic author hierarchy overrides the native short-name 70% clamp; long names still truncate. | Short/full and long/truncated names, native identity proxy pointer. |
| UI-03 | Adapter describes safe HTTP(S) badge images and bounded dimensions; pure renderer emits escaped image attributes. | Loaded source/dimensions and unsafe attribute/protocol rejection. |
| UI-04 | Adapter preserves a SELECT-containing shell and retires only the separate obsolete visual trigger. | Nested and sibling forms, focus/pointer, original options and disposal. |
| UI-05 | Presenter resets search flow, native 451px width/278px field shell and absolute positioning without assuming an optional wrapper. | Wrapped and bare public structure, input containment, visible submit glyph, original payload/submit. |
| UI-06 | Pagination starts at the leading page rather than centering an overflowing flex range. | First page initially reachable, both scroll ends, native pointer. |
| UI-07 | Bottom write action uses natural size and a single-line label. | Pointer and Enter, native handler. |
| UI-08 | Article presenter keeps each count adjacent; filter-module excludes the metadata count from comment-container styling. Adapter recognizes native `gall_reply_num`. | Wide/narrow metadata bounds, native calls/topology. |
| UI-09 | Semantic article scrap context wins native font-zero/sprite geometry. | Visible label, light/dark bounds, original handler. |
| UI-10 | Article presenter resets the dark content ancestor filter. Original narrow important media guards are retained unchanged. | Known-color media, readable text, important host image filter/blend, theme round trips. |
| UI-11 | Semantic recommendation context removes the native sprite and releases fixed action-bar height. | Sprite absence, wrapped containment, native handlers. |
| UI-12 | Legacy comment flex styling excludes owned composers; semantic comment presenter owns main/reply/image input layout. | Three composers across gallery/theme/width conditions, typing, submit hit, original listeners/topology. |
| UI-13 | Shared presenter restricts panel sizing/padding to panel roles, leaving overlays viewport-sized. | Five backdrops, corner/outside pointer, reopen, parent retention, storage unchanged. |
| UI-14 | Shared presenter uses one base width rule with panel-local intended width values, stable across later style mounts. | Intended width/cap, short/tall scrolling, existing management drag/resize owner. |
| UI-15 | A dedicated headtext row owns input shrink and nonshrinking single-line Add. | Long input, visible Add target, original action and unchanged storage. |

The four new contract modules are registered in `testbed/run-tests.mjs`: list (12 scenarios/216 checks), article, comments and shared dialogs. PC runs the same shared-dialog contract. Original failure evidence and intermediate failed candidates are retained in local `artifacts/ui-repair-all-2026-10-18/`; they are not final passes.

## Contrary evidence retained

The first combined CC09 runtime missed the real bare search wrapper. Public inspection exposed native absolute positioning and fixed widths, which were modeled before correction. It also removed existing important image guards; the old palette/media regression failed (142/143 overall), and those exact guards were restored. A broader merged important selector was rejected by boundary verification; the final source preserves the original narrow selector. The verifier also parsed a colon in a new CSS comment as a declaration, so that unnecessary comment was removed rather than relaxing the verifier.

An interrupted full run is not a pass. Earlier actual-extension runs failed owned-child cleanup or profile removal and are retained as unavailable attempts. Empty-Chrome and independent-process probes reproduced delayed exit notification and premature forced shutdown. Waiting for exit within the existing graceful budget, accepting only positive OS absence and releasing owned handles fixed the method; new final startup/native runs and independent replay pass. Original control native failures remain diagnostics. Never call the working Chrome/Tampermonkey route unavailable merely because an earlier probe or package download failed.

## Final validation and remaining limits

| Final evidence | Result and scope |
| --- | --- |
| `artifacts/ui-repair-all-2026-10-18/mobile-full-settled.json` |143/143 mobile tests, including all four repair groups and renewed UI-01/retained important-media regression; FD58. |
| `artifacts/ui-repair-all-2026-10-18/pc-full-final.json` |26/26 PC tests, including the shared-dialog contract; C14D. |
| `artifacts/ui-repair-all-2026-10-18/host-final.log` |11/11 host compatibility; FD58. |
| Same directory `semantic-list.json`, `semantic-article.json`, `semantic-comment.json`, `semantic-native-form.json` | Published32BA control vs FD58, separate contexts; zero semantic differences, respectively16/22/36/25 invariant improvements. |
| Same directory `semantic-pc-palette.json` | PC palette semantic equivalence PASS;14 raw snapshots differ for the intended panel geometry. |
| Same directory `proof-core.json`, `proof-runtime.json` | All six proof groups executed as disjoint sets:71+53 rejected mutations and9+17 accepted controls, zero reused cases. These are proof-system results, not product admission. |
| Same directory `repository-all-final.log` | `node tools/verify-repo.mjs all` PASS; both generated targets reproduce at their existing versions, guidance/ownership/governance checks pass. This repository result does not erase the separate acceptance failures below. |
| `testbed/artifacts/ui-repair-all-startup-final-2026-10-18/report.json` | Actual installed Chrome155.0.8059.80/Tampermonkey5.5.0:8 paired observations, candidate4/4 startup; cleanup and independent replay PASS. |
| `testbed/artifacts/ui-repair-all-native-final-2026-10-18/report.json` | Same actual extension and FD58:32 paired observations, candidate16/16 native header actions; cleanup and independent replay PASS. Control failures are retained. |
| `artifacts/ui-overview-2026-10-17/repairs/all/public-checks.json` and `comparison-manifest.json` | Public transfer8/8;154 capture observations/77 paired states. One article and one palette loading timeout were successfully retried, with both failed attempts preserved. |
| Same repair evidence directory `cleanup-contract-final.log`, `test-header-generated-css.log`, `test-header-drawer-priorities.log`, `test-architecture-transition-plan.log`, `test-qualified-mobile-palette.log` |45 offline live-method tests plus header controls; generated payload/registration controls; selected56 exact priority contract; isolated transition-plan controls;16 qualification-schema negatives PASS. No header admission follows. |

Vision review sampled wide light/dark list, footer/search, article metadata/media/recommendations/comments/composer, write editor/actions, native tip and owned/nested dialogs plus narrow stress. It did not label every gallery image approved. The154 image count includes retries; the77 states are composition observations, not77 independent feature tests. The comparison page is `http://127.0.0.1:10062/repairs/all/index.html`. Runtime/source/report identities are bound in local `artifacts/ui-repair-all-2026-10-18/result-manifest.json`.

### Separate retained header failures at the repair handoff

Current disposition: `HEADER_CASCADE_FINALIZATION.md` supersedes the three local blockers below. The right-mount failure was an incorrect oracle precondition, the strict carousel oracle is renewed, and exact FD58 palette classification passes with raw FAIL retained. These original observations and the historical checkpoint disposition remain preserved. Full header/mixed/device admission stays open.

- Current classic1280×900 light right-mount contract is7/8 PASS: the artificially right-positioned drawer ends at1230.03125 rather than1253. A separate fresh-context observation of immediate4E41 reproduces exactly the same failure. This is inherited header work, not a new list/article/comment/dialog repair regression. Preserve `testbed/artifacts/ui-repair-all-final/header-viewport.json` and `header-viewport-control.json`; resolve it next without weakening the clamp assertion.
- Carousel execution stops at the old F272 frozen-CSS assertion because inherited drawer56 cleanup changes that CSS ledger. Treat it as a stale oracle/unfinished priority-unit integration, not a carousel PASS. Current actual native16 and full mobile carousel tests retain their own scope. Recent-title/GNB cascade, dark-toggle, four-builder/27-slot pure boundary and issue-top contracts pass.
- Raw mobile palette comparison remains FAIL with three settled-resource differences: four declared header subscriber owners, listener188→170, unchanged five observers, zero active timers/frames/intervals and zero errors. Save this raw result; exact current-artifact classification remains a separate next-stage obligation. The historical owner-split classifier correctly rejects FD58 as changed bytes; its old-profile invocation is not a current qualification PASS.
- Narrow390 captures still show inherited global-header/comment-header stress composition concerns. They are not the user's confirmed980-wide phone layout, and are not a whole-UI visual PASS. Retain them for remaining header/responsive work rather than broadening this15-finding repair claim.

These findings keep overall header/mixed/replaceability acceptance open and Concept01 unstarted. The source repair does not silently promote the architecture, rewrite old snapshots, or claim the complete impact route passed. A final independent completion review was not available; direct review, deterministic checks and actual observations are reported separately.

Checkpoint disposition: local/uncommitted. Pre-existing unfinished header/verifier changes remain in the same worktree. `tools/checkpoint.mjs` requires all tracked validation inputs to equal the staged tree, so an isolated repair checkpoint cannot exclude those changes. Preserve them and debug.log untouched; do not absorb the unfinished unit as a validated header result. No commit, push, version bump, PR, official release or publication was performed for this repair batch.

The 980 CSS-pixel proxy reflects the confirmed wide mobile layout; 390/412 are narrow stress. Screen/DPR/touch and `visualViewport.scale` are recorded, but scale 1 is not the user's measured Lemur zoom. Anonymous public GM-shim captures, actual desktop Chrome/Tampermonkey, deterministic fixtures and real phone/authenticated states remain distinct evidence scopes. No account/content writes are authorized or tested. A repaired defect set does not complete all 128 design-review checklist rows or establish Concept01 replaceability.
