# UI replacement validation

Status: readiness experiments `PLANNED_NOT_EXECUTED`; width baseline characterized with a retained mixed-state failure. This supplements `MOBILE_UI_MODERNIZATION.md`; it does not introduce a second implementation queue or authorize a visual redesign now.

## Research and transfer

ER2, researched 2026-10-08. The missing proposition is whether the resulting boundary makes real UI changes local and practical. Preservation tests and module counts cannot settle that proposition.

- SEI's [Deriving Architectural Tactics](https://insights.sei.cmu.edu/documents/704/2003_005_001_14213.pdf), 2003, tables 9–10, makes modifiability a concrete change scenario with a source, stimulus, environment, artifact, response and effort measure. Apply those parts to specified DCUF change requests, rather than an unspecified promise of easy editing.
- SEI's [Modifiability Tactics](https://www.sei.cmu.edu/library/modifiability-tactics/), 2007, relates tactics to coupling, cohesion and cost. This supports measuring propagation across our existing layers; it does not prove that an extracted presenter is replaceable.
- Nord/Ozkaya's original [CONNECT case analysis](https://insights.sei.cmu.edu/blog/using-scenario-based-architecture-analysis-to-inform-code-quality-measures/), 2013, reports that aggregate code metrics can conceal the relevant dependency change. Its enterprise case differs from this userscript. Transfer only the requirement to interpret metrics against the selected change and layer; do not import its tools or claimed effect size.

Local counterexample: drawer width policy occurs in presenter CSS and adapter geometry (the 640px limit). A responsive-width request may require both owners today even though pure body descriptions pass. Record that limitation; do not remove the adapter's containment responsibility to improve a file count. Existing frozen presenter VM tests establish purity of selected descriptions, not replacement readiness.

Retrieval limit: the 2003 PDF fetch timed out; the primary-source indexed tables 9–10 supplied the scenario fields above. The 2007 publication page/abstract and the 2013 original case article were accessible. No claim about the unread remainder of either report is used.

## Planned experiment

After the header boundary is sealed, run one pilot on its final exact artifact before broader surface migration. Reuse existing guarded builds, intended-delta contracts and fresh control/candidate browser contexts. Final integrated admission repeats the selected scenarios against the same final artifact and links current receipts to the existing `presentation-boundary-one-owner-realized` assurance claim. That claim stays UNKNOWN until these obligations and its other required gates pass.

| Scenario | Concrete request and scope | Required result |
| --- | --- | --- |
| Cosmetic | Change the drawer's open/closed label, semantic color and owned spacing | Presenter-only production edits; adapter/application bytes unchanged; visible intended delta and preserved native actions, focus, storage and resources |
| Owned composition | Replace the owned toggle's label/icon arrangement while retaining the native button and action contract | A genuinely different presenter variant loads, renders and works with the same adapter/application; accessible name, hit target and containment pass |
| Responsive layout | Change the drawer width cap from 640 to 560px at narrow/wide/short viewports | Baseline records current coupling; the sealed contract must carry presentation layout input without adapter/application edits, preserving measured containment and phases. If that contract is absent, FAIL or UNKNOWN; no forced workaround |
| Replacement/restore | Select an alternative owned presenter and restore the original | Both distinct variants and the restored original work with identical adapter/application bytes; original host nodes/handlers, rapid toggle order, rerender/reset and cleanup remain valid |

Each receipt records source/artifact/oracle/fixture/harness/browser/route identities, declared visual delta, selected applicability, exact production files and layers changed, adapter/application changes, new override/priority count, and implementation plus validation steps. Generated output, tests and docs are counted separately. Record elapsed editing time only with operator/tool/cache context; no percentage savings without a comparable pre-change task baseline. Feature, storage or native-semantic changes are a different scenario class, not a presentation-only PASS.

Reject false success with controls for an unchanged variant, a hidden adapter edit, a new global CSS override, stale behavior evidence and missing/zero-applicability interaction coverage. Assertions compare semantic/native behavior independently of the changed labels/colors/geometry. Roll back the variant and verify restoration rather than treating screenshots or a changed text string as the entire experiment.

PASS is bounded to the selected real changes. All selected scenarios must have current applicable evidence; FAIL/UNKNOWN cannot be averaged into a readiness score. Record baseline difficulty now, pilot results after sealing, and final integrated results before claiming UI changes are easy. Human editing speed across users remains unmeasured unless a separate comparable study is requested.

## Current execution

Typed toggle extraction and the local recommendation final-top correction are complete. `HEADER_DRAWER_LAYOUT_INPUT.md` retains the width baseline/original feedback; `HEADER_DRAWER_FINAL_TOP.md` binds the meaningful negative and current bounded regression/comparison. Next extract the frozen width input while retaining DOM measurement/containment in the adapter. Keep both components mixed. Overall acceptance retains the original palette FAIL. The readiness pilot and real presenter replacement/restoration remain after header sealing; width coupling and remaining native/live gaps are contrary evidence, not readiness proof.
