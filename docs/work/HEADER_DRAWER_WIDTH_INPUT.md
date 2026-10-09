# Header drawer frozen width input

Source checkpoint base: `bbf152b17344625e9a659a4611c100ff5607bc12`. Exact A5EB mobile control is `A5EB4BA2F05CF17F7857E9DC16741ED5B658EBD84470CDA7558EB62E7EF93A32`; current 3.5.5 root/dist/guard is `2AA122E15EE3521500C06BCFCDA5FE280EDF54EE05571A32ADE2C88D29C7FD56`. PC 1.9.9 remains `1A7A00468F4DCFB57C7341063098B827743091FD7593BA3FBA86A17E282BDC33`. No version, publication, storage, coordinator, DOM-read, scheduler or host-node change. Both drawer components remain mixed and the accepted registry is unchanged.

## Production change and original negative

The existing presenter now exports frozen numeric `layout = {maxWidth: 640}`. Three CSS width expressions and the adapter's three existing calculations consume that value. The viewport subtraction, inset, rounding, clamping, two body measurement/application phases and recommendation final-top correction are unchanged. A width variant changes one presenter numeric value; native measurement and containment remain adapter responsibilities.

Before production editing, the new pure contract failed on A5EB with `Frozen drawer layout input required`. After editing, the standalone body/layout contract passes and rejects nine selected body/layout faults, including mutable layout, omitted export and a CSS site retaining literal 640. Caps 560, 664 and 1280 must reach all three CSS sites. This is a bounded contract, not validation of arbitrary malformed values.

Default **compiled** presenter CSS is byte-identical to compiled A5EB. An initial raw-source-versus-compiled comparison differed only at eight trailing blanks removed by the existing builder. It was an oracle layer mismatch; the corrected comparison extracts both compiled builders and retains strict equality. An initial differential invocation lacked the control-binding file after that failed preflight and never launched a browser; the corrected bound execution below is the evidence.

## Fresh bounded execution

Managed Chromium 149.0.7827.55, exact guarded runtimes and fresh browser contexts:

- Width probe: 53 contexts and 201 observations. Baseline 640 plus presenter-only 560/664/1280 variants cover 13 minor/recommendation/mixed contexts each: 390/750/1280, light/dark, the 664 breakpoint and short 390x480 states. Original toggle pointer/default Enter/focus, owned content, wide→short→wide resize, both body phases, native geometry/containment, GM no-write and exact body-variable priority restoration pass. Disposal requires adapter resources and active timers/frames/intervals/animations to settle.
- Hardcoded-adapter negative: presenter 560 with the adapter's three sites reverted to 640 produces an 80px anchor error at open, owned-content and wide-restore in the wide minor-list case. Narrow and recommendation-only equality alone would miss this defect. Positive variants alter only the single presenter value; generated diagnostic variants never replace release output.
- Immediate A5EB/2AA1 owned/native/body/input comparison: 92 observations and nine timing contexts per side, zero selected semantic differences, 31 selected faults rejected, including real microtask deferral and the three added layout faults. Original native actions/identity/order/focus and body phases remain covered by this separate observer.
- Raw style order differs in 32 observations, explicitly `DIFFERENT_NOT_GLOBAL_PHASE_EQUIVALENCE`. No global phase, live or final-header inference follows.

| Local input/report | SHA-256 | Scope |
| --- | --- | --- |
| `artifacts/header-drawer-width-2026-10-09/report.json` | `619FC68D739DFF6A487D70D91FF6292E0CA9555F2B82DD9A7DCC5EF78FF969DB` | width variants and hardcoded-adapter negative |
| `artifacts/header-drawer-width-2026-10-09/differential.json` | `1223352F6C8FF8755011B87620D4C419B56F608E1FEDF27D68E302B0B1C6B60E` | bounded immediate-control comparison |
| `artifacts/header-drawer-width-2026-10-09/probe.mjs` | `DA33C9D9F6720E424D6371BEDD13EC35BDCA164E2E12D825562E64303CF167A8` | ignored, separately bound width producer |
| `artifacts/header-drawer-width-2026-10-09/compiled-css.json` | `9D0DEDA2A153B237CE9C907D5DA33C4EFD60311044F3DDAC026CA9686C4D9EDE` | exact 10,983-byte compiled CSS and shell equality |
| `artifacts/header-drawer-width-2026-10-09/gates.json` | `982669A92F3F05962D218093C4ED35A781A9B17E15485191E0B56F61A3418810` | 23 executed commands; original palette failure retained |
| `artifacts/header-drawer-width-2026-10-09/palette-comparison.json` | `2F2B53D1E41381BEBC66BC34331352421DC13AA12E27FB967416AC91146089F6` | three current semantic failures deep-equal A5EB |

Ignored reports/controls are local execution evidence. Missing reports never become a reconstructed PASS. Product/oracle/fixture identities in these reports remain frozen; subsequent result/continuity prose changes the broader fingerprint and does not relabel their global bindings as stage admission. The original A5EB full-suite evidence is historical for changed runtime/oracle inputs.

## Admission and next action

Fresh Git-routed policy, core/runtime proof and acceptance execution completed all 23 commands: 22 passed; old-baseline mobile palette FAILED at three semantic/14 raw snapshots. Its semantic differences deep-equal the saved exact A5EB report. Mobile full 138/138, host compatibility 11/11, unchanged-PC functional 14/14, header cascade, list/article/comment/native-form comparisons and PC palette PASS. All six proof groups cover 124 rejected negatives and 26 accepted controls (core 71/9, runtime 53/17), with no reused cases. Final root/dist/guard is restored to 2AA1 and PC root/dist remains 1A7. `unit-result.json` binds these exact report identities; this split execution does not run or pass the selected `promotion-windows` profile or dispatch a remote workflow.

A fresh-context read-only reviewer independently confirmed all six width sites, preserved calculation/read-write order, compiled CSS/shell equality, artifact/oracle/report hashes and one-value-only diagnostic variants. It reran the pure contract and found no actionable code issue; it did not rerun browser/live tests and did not certify full-header or Goal admission.

Retain original palette FAIL and full-header/34-feature/upper/actual-extension/live UNKNOWN. Width experiments establish only selected numeric-change locality. Cosmetic/composition and genuine alternative presenter replacement/restoration remain planned after header sealing; generalized ease or human editing-speed savings are unmeasured.

Continue with the drawer's remaining raw host-qualified selector boundary. First characterize early concealment and late native/popup coverage, then replace selectors only with adapter-projected meaning whose specificity, initial/delayed/replacement/rollback coverage and native input remain proven. Do not delete early compatibility rules based solely on mounted equality, or promote mixed owners without current stage receipts. The analogous issue-top feedback and unmodeled height/live applicability remain separate risks.
