# Header shell width/reset observation

This is a bounded candidate-only characterization, not a stage receipt, control/candidate equivalence claim, live-site result, or registry promotion. Production CSS, adapters, build inputs, settings and versions are unchanged. Both existing width/min-width pairs are retained.

## Identity and scope

- Source checkpoint base: `cfb4ac18eea6019659c92c7a23ef8919cd1938bf` on `codex/ui-port-boundary`.
- Guarded mobile runtime: `testbed/artifacts/runtime-under-test.user.js`, SHA-256 `689A66DFBA738CC3325BE85CD3E1EA53E4AE3089A3454CAF5CC69BC657D3E0DD` (3.5.5). Root/dist bytes match; PC 1.9.9 remains unchanged.
- New diagnostic: `tools/probe-header-shell-reset.mjs`, SHA-256 `81B1CB859322E2B3A6EB92C5519A4583C96E3B8CA7BEC5482D9A5948659784EF`. It leaves the accepted cascade observer, harness and fixtures unchanged and records its own hash in addition to every field of `createEvidenceBinding`.
- Local final report: `artifacts/header-shell-reset-2026-10-05/report-2026-10-05T10-53-10-641Z.json`, SHA-256 `A3B1D89FECAA001B99109148BA83DF0FB18D749D3280A103AC3129999D312880`, status `SHELL_RESET_OVERLAP_CHARACTERIZED`, scope `BOUNDED_SHELL_RESET_CHARACTERIZATION_NOT_STAGE_RECEIPT`.
- Chromium 149.0.7827.55; eight fresh contexts: major/minor/mini list and minor view with header, each light/dark, at 1280×900. Palette blue, threshold zero, ratio disabled, empty enabled personal list. This does not cover all palettes, narrow viewports, login, write routes, whole-root replacement or boot recovery.
- Runtime/tool/full evidence binding were checked before and after execution. A separate report read recomputed counts and hashes and checked every negative, restoration flag, trusted event, public subscription order and explicit rollback. Ignored raw reports remain local; a missing report requires a new execution, not reconstruction of its bytes.

## Two phases have different coverage

| Existing rule | Source/phase | Scoped observation |
| --- | --- | --- |
| `.dcheader`, specificity (0,1,0), `width:100%!important; min-width:0!important` | Pure reset builder in `header-shell-presenter.js`, composed into the original early core by `filter-module.js` | Covers unmarked typea and non-typea roots while the shell adapter/style is absent. Narrowing to the late role or to typea loses selected coverage. |
| `[data-dcuf-header-shell-role="root"].typea`, specificity (0,2,0), same width pair | `header-shell-presenter.js`, mounted by `header-shell-host-adapter.js` | Restores marked typea geometry without the raw pair, and beats a synthetic equal-specificity host-important rule inserted between core and semantic phases. Moving it earlier or weakening specificity loses that selected protection. |

The oracle derives expected width independently from the parent's bounding box minus its padding and borders. It checks nonempty original-root geometry, computed width/min-width and actual border-box width. Source declarations do not construct that geometry oracle. Childless fresh unmarked nodes are synchronous scope probes removed before yielding; they are not clones or replacement-header proof.

Deleting either pair while both are mounted is masked by the other. That successful mounted snapshot does **not** establish safe deletion. With both phases absent and synthetic normal inline width 317px/min-width 401px, used width is 401px. Required declarations, priorities and values are independently falsified in applicable single-owner/conflict conditions.

The host-important control is `.dcheader.typea {width:317px!important;min-width:401px!important}`: equal to semantic specificity and stronger than raw. A rule equal only to raw specificity would leave the semantic phase-order test vacuous. This is a declared synthetic adversarial condition, not a claim about live collision prevalence. A host rule placed after the semantic style wins; reconnect appends the semantic style after it and restores selected geometry. No global cascade-order guarantee follows.

## Observed states and negative controls

Every context records the same 17 states:

| States | Result |
| --- | --- |
| Baseline; normal inline conflict | Independent parent width and zero min-width |
| Raw-pair removal while mounted; semantic-pair removal with raw retained | Same geometry; masked deletions recorded |
| Actual shell disposal, unmarked typea | Raw pair protects geometry; role/style/subscriber absent |
| Both width phases absent | Explicit host-normal 401px used width/min-width |
| Reconnect with raw missing; raw restored | Semantic protection, then both phases |
| Host-important strictly between phases | Semantic protection |
| Disposal under that conflict | Host 401px geometry |
| Reconnect; duplicate connect | Protection restored; one style/subscriber, duplicate connect preserves style node |
| Host-important moved after semantic; disposal | Host 401px geometry |
| Reconnect after late host; conflict removed; final restoration | Protection restored; final exact original geometry/CSSOM/attributes/phase |

- 136 sampled states; 16 fresh childless unmarked typea/non-typea cases.
- 192/192 detected selected negative controls: 24 per context. Eighteen declaration/priority/value cases across raw-only, semantic-only and intervening-host conditions; six selector/role/specificity/phase cases. No mutation score or blanket priority-removal conclusion is inferred.
- Before and after real public disposal/reconnect: 48 trusted native submit actions and 32 trusted GNB link activations. Original form/input/button/link identity, parent/sibling order and native attributes remain in place. Pointer and Enter submission preserve typed value; Enter after adapter refresh uses retained submit-button focus without locator refocusing. Link defaults reach `#gallery` and remain unprevented. The diagnostic submit observer records prior cancellation then prevents fixture navigation; external search results are not exercised.
- Stored values/write count, selected XHR trace, settled listener ledger, active observers and timers/frames/intervals match their warmed baseline. Closure waits for zero timer/frame/interval owners and absence of the recovery subscriber. Diagnostic handlers are removed when each fresh context closes.

## Public reconnect order and explicit test rollback

The coordinator stores subscriptions in a Map. Public shell disposal deletes `header-shell-style`; reconnect reinserts it at the end. Membership/owner count return to baseline, but global key order changes. The new probe records that actual order and requires exactly this source-derived change. Native actions run on the actual public order **before** test-only order rollback.

After those positives, the diagnostic restores the initial Map key order using current callback references; it does not reinstall old callbacks or change production behavior. This cleanup is recorded separately, like restoration of the owned stylesheet's original DOM phase. Positive native actions in these eight cases do not establish global mutation-subscriber order independence or exact callback equivalence across arbitrary payloads.

The first local attempt remains `PARTIAL`: `artifacts/header-shell-reset-2026-10-05/report-2026-10-05T10-50-40-116Z.json`, SHA-256 `F8EC176C700CEF2423715111DAEF45196256C343F34DABDA280C448650D7EAF0`, diagnostic hash `6AE560B24CC172966554426D8F18992626A6818F9282B4FD166E450AD3791965`. It failed an overstrict diagnostic assertion that public reconnect restores initial global Map order. Source tracing identified delete/reinsert behavior; the oracle was corrected to expose actual order and distinguish cleanup. No product repair or retrospective PASS is claimed for that attempt.

## Disposition and remaining work

The bounded width/min-width question is characterized; keep both original pairs. This changes neither cda1087's FAILED full acceptance nor full-header/34-ID/live/upper UNKNOWN. It does not classify six original C84 timer fields or the old untraced popup timeout. Existing broad suites are qualified reuse only while their exact runtime/harness/fixtures/oracles remain unchanged, not reruns for this diagnostic.

Fresh worktree impact resolution selects `policy` and fallback `acceptance` for the newly unmapped diagnostic tool; the receipt was recomputed and verified at this source base. `verify-repo all`, tool syntax, exact runtime/binding/report checks and the scoped browser probe pass. The full acceptance command sequence was not rerun or declared PASS: its original FAILED observation is preserved. The diagnostic is not added to accepted build/harness/oracle inputs, and this checkpoint claims only its bounded new observation, not profile or stage completion.

Next is `header-boundary-gap-inventory`: derive remaining zero-delta header boundary and evidence gaps from current source/effective architecture and the active plan; distinguish structural separation from debt intentionally deferred to visual promotion and select one executable next unit. Do not expand this result into an unbounded property-by-property cleanup or infer that a `mixed` owner must already meet future visual-promotion criteria.
