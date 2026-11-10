# Header early native selector binding

Status: `BOUNDED_VALIDATED_WITH_RETAINED_PALETTE_FAIL`, zero visual delta; no header-stage admission.

The user resumed the next recorded unit on 2026-10-11. Source/control base is d3b45fcd7b874d0116ddf09b19cf33de4e9c02ff, mobile D52D8C7C9AE46A2BD3D37974B929D36952B9E3F55EB5D19F5C3680602B9E1B59. The previous pause is revoked for this bounded unit. Debug.log stays untouched.

## Design and scope

Five target adapters supply immutable named native selector records to eight pure hoisted presentation builders: five palette payloads, shell/GNB resets, and drawer concealment. Input names describe their native role; complete selector strings include original ancestry, palette prefix, tag/class/ID qualifiers and pseudo-elements. Presentation owns the unchanged declarations and ordering. Preserve both unmarked/non-typea roots and same-stack concealment before adapters connect.

Theme/core composition invokes hoisted functions at exactly the original positions, before const presenter/adapter initialization. Selector producers use only literal strings and the palette attribute argument, with no DOM, resource, storage or scheduling effect. Builders reject missing/extra/non-string/blank/mutable/accessor inputs without executing getters. Exposed diagnostic builder calls receive explicit adapter records; their emitted CSS is unchanged. Existing mutation/geometry/input/style-mount drivers and metadata/versions are out of scope.

Alternative semantic-marker projection is rejected for this unit: it would narrow unmarked-root coverage or defer host selector effects. Moving style mounts or adding a late global override would change cascade/initialization semantics. The existing named-input method is sufficient; no framework, observer, dependency or new runtime owner is added.

## Checks and failure criteria

First RED: the restored prepared test rejects the current shell because its hoisted selector producer does not exist. Retain the log. Required GREEN independently compares exact frozen-control output for two palette attributes, every named input, reordered records, wrong native inputs, malformed/accessor controls and invocation before object initialization.

Retain the existing palette/reset/concealment reference digests, exact early composition and declaration ordering, missing/duplicate/async/TDZ/raw-rule negatives and formatting positives. Renew guarded browser startup/unmarked/delayed-root/cascade/native/input evidence against exact D52D in fresh contexts, then follow the fresh Git impact route. PC bytes must remain unchanged. A phase, CSS specificity/order, original node/action/focus/storage/resource difference or surviving relevant negative blocks the unit.

All five presenters and drawer adapter remain mixed; the other adapters are not reclassified. Accepted registry stays unchanged. Original palette FAIL and full-header/feature/upper/actual-extension/live UNKNOWN remain. Working-branch checkpoint/CI qualifies only the bounded unit, not a release or final product admission.

## Current bounded evidence

Candidate mobile root/dist/guard: 602810EB816C7FBED63386E0713E3CE8C07772DC90E3BB5F0893B40061FE3017 (3.5.5); unchanged PC: 1A7A00468F4DCFB57C7341063098B827743091FD7593BA3FBA86A17E282BDC33 (1.9.9). Executed source base: d3b45fcd7b874d0116ddf09b19cf33de4e9c02ff; routed execution fingerprint: 479150f725722cebbd69bd3b64aa7d33aaf240b563d0acbf1c6aa260977e7d83. Later closeout guidance, stronger pure-factory assertion and format-only overlay restoration retain this original execution binding; they do not relabel the routed report. The overlay JSON value is unchanged by restoration of its surrounding formatting.

- Factory: eight builders/33 named slots; exact D52D CSS for two attributes and complete theme/core composition; pre-object hoisted invocation, reordered records, 33 individual slot changes, 56 malformed/accessor cases and cross-surface order negative. The original missing-producer RED is retained.
- Independent palette/reset/concealment digests and all 25 ownership mutation targets remain unchanged. The initial old-argument TypeError is a stale oracle consumer, fixed without weakening its expected CSS or mutation assertions.
- Read-only review found no production defect. It exposed a P2 test gap: equal search/searchInset strings allowed an ignored non-first slot to pass. Retained old-test PASS and specific enhanced-test RED prove the correction; all 33 slots now change emitted CSS independently. Review's 24 extra symbol/inherited/whitespace controls are separate read-only checks.
- D52D/candidate native/body/input differential: 120 observations and nine input contexts per side; zero selected semantic/raw style-order differences; 31 selected faults rejected. Topology, native pointer/default Enter/focus, geometry, GM no-write and resource closure remain checked.
- Header cascade: eight route/theme contexts; original priority-removal, title presets/mutations and GNB unmarked/reset/phase/conflict/recovery controls pass. Full mobile 138/138, host 11/11 and PC functional 14/14 pass on their exact runtimes.
- Routed policy/core/runtime/acceptance execution: all 23 selected commands completed. Core 71 rejected negatives/9 positive controls; runtime 53/17, zero reused cases and no environment retry. Only original mobile palette fails: three selected settled-resource differences/14 raw snapshots. List/article/comments/native forms/PC palette pass. The outer report remains FAILED, not aggregate PASS. Selected promotion-windows was not executed.

This closes early native selector ownership only. Five presenters and drawer adapter remain mixed; accepted registry and versions remain unchanged. Inherited important/typea/native late qualifiers, driver/cascade/startup sealing, native-height/live applicability, four real UI-change/replacement/restore experiments, complete feature inventory and upper/actual-extension/live evidence remain unfinished.

## Recoverable local reports

Ignored evidence is LOCAL_ONLY_EVIDENCE. The report index `artifacts/header-early-binding-2026-10-11/unit-result.json` has SHA-256 `125CCA49EE532EF2871D65AFABD3B01026D032253CF2BC71A65D016F8E13BD3E`; require exact report bytes before reuse. Checkpoint CI does not certify local availability or product admission. Report reuse is scoped to unchanged SUT/oracle/fixture/harness/toolchain/effective graph. Guidance and the new pure-factory test do not refresh the old routed fingerprint.

| Report | SHA-256 |
| --- | --- |
| `artifacts/header-early-binding-2026-10-11/executed-impact.json` | `09A623F405AA1A416185F33D3B97C9ABC8177F860B2D36CA2759AD38B9A735EC` |
| `artifacts/header-early-binding-2026-10-11/proof-core.json` | `BA6411CB9F7D910EA7C1B40DB66AF2DB2E3820F9D31993B812A4A39A78E5F605` |
| `artifacts/header-early-binding-2026-10-11/proof-runtime.json` | `BA6A2701F2139D2533ABFDAB51DB9A2AD46DD2E86D437E110EAD08B9D93E9244` |
| `artifacts/header-early-binding-2026-10-11/proof-runtime.progress.json` | `05C68078BDA15B32A7247209AFB5C0EEA93DAC87A179AC229624EDE2B22E49DB` |
| `artifacts/header-early-binding-2026-10-11/mobile-full.json` | `9A3C551280309397A187A6C160D95FC7FCBBEEB3CE2E4C6E8CE1185E79AAEC33` |
| `artifacts/header-early-binding-2026-10-11/host.json` | `53C7FF27C167A9D0D9466B178DA74909876EE39FFACD8FB1DB31A7ACA25A56E3` |
| `artifacts/header-early-binding-2026-10-11/pc-functional.json` | `437FFDE3DE13FE0CCD497F39BA27F8588B915F7AC4D51FDEB37FD9BD2EA3CC63` |
| `artifacts/header-early-binding-2026-10-11/header-cascade.json` | `8B1849B1FFA07F2F2903FD877F494D3BF704DD56E3CA901AF59E6CB199DFACB1` |
| `artifacts/header-early-binding-2026-10-11/palette-fail.json` | `BE72C8752AB1A5E1BD3981DDCC4E1FF869971A08C010AD64575DA70B59419E1B` |
| `artifacts/header-early-binding-2026-10-11/list.json` | `C77C7C7B805DD86CC3F3C6051607F17A82CA514667B76ED262E1060917AF4AA5` |
| `artifacts/header-early-binding-2026-10-11/article.json` | `B339FC051C8349BEF9A061627798E65119F32D3259BBC9A4E50B527243BCFF38` |
| `artifacts/header-early-binding-2026-10-11/comments.json` | `5554DDD0EEC31202891513678D3CC3335534848BB935A83D1ABCA7A515D67A9D` |
| `artifacts/header-early-binding-2026-10-11/native-forms.json` | `B614BF9DBC61CC5DE86A2BD7D6E5D1978F4BDA04D1D1D02FC065D988FAFAF85F` |
| `artifacts/header-early-binding-2026-10-11/pc-palette.json` | `9124FFF5E2079B06FC9ECBC7847A06B97AB58589BA3E217EFD9FB5CB196B0ACF` |
| `artifacts/header-early-binding-2026-10-11/gates.json` | `027347B3728C7DAEDCD169A523F3CAF0B827D23FFED207E3EF0BC058CE8E7DB8` |
| `artifacts/header-early-binding-2026-10-11/native-body-input.json` | `3DB8068A0C94A07A26C56BC446098C24BD264AFBE6D6EDB408BEC45BD0198B1D` |
| `artifacts/header-early-binding-2026-10-11/factory-final.json` | `FFCC4B6CB6F1E21A183667C14B93D59EA1471CC12447D3D0217A7464407EBAC3` |
| `artifacts/header-early-binding-2026-10-11/independent-review.md` | `8D5382766D584473AB391939D0049594AD1DD0DAA960985522AA9A45CE63FE8B` |

Next bounded action: audit the remaining header cascade/driver/startup exit obligations on this exact artifact, beginning with shell/typea and inherited important reasons. Record actual blockers before selecting a runtime change; no visual assembly or automatic mixed promotion. The user's current request ends with this unit's checkpoint and report.
