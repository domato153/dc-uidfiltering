# Header drawer recommendation final-top correction

Source checkpoint base: `a167af7b573b30afe6730f0af01f4ce841de7f6b`. Exact mobile control is `E7869194916A5423CE493A33D5A8C85952AC84DDB07160927B320ED36F775779`; rebuilt 3.5.5 candidate/root/dist/guard is `A5EB4BA2F05CF17F7857E9DC16741ED5B658EBD84470CDA7558EB62E7EF93A32`. PC 1.9.9 remains `1A7A00468F4DCFB57C7341063098B827743091FD7593BA3FBA86A17E282BDC33`. No version/publication, storage, CSS/width, shared coordinator, state/subscriber or host-node ownership change. Both drawer components remain mixed; accepted registry is unchanged.

## Declared correction and original negative

The recommendation adapter now measures native height after existing horizontal placement, then applies only the final viewport-clamped top. It no longer writes the preferred top before reading height. The original issue-top path and both owned-body measurement/application phases remain unchanged. Candidate and surface contracts were updated and the effective architecture checked before production editing.

The new guarded functional regression was run before the fix. Exact E786 fails after mixed issue/recommendation resize to 390x480 with trace `write 411px → read height 79 → write 389px`, final native rectangle `[12,389,366,79]`. This assertion directly rejects repeated intermediate writes, rather than accepting timeout expansion, polling sleeps or filtered body mutations. `HEADER_DRAWER_LAYOUT_INPUT.md` retains the independently measured repeated feedback and prior omission diagnostic; neither is relabeled as a candidate execution.

The artifact delta is byte-exact: replacing that one preliminary recommendation-top statement with the explanatory comment produces the candidate. Final clamp calculations, width, markers, original controls/default input, focus, body phases, restoration, settings and PC bytes are preserved. Removal of the demonstrated self-scheduling feedback is the intended behavior delta; this is not a universal performance or full-header equivalence claim.

## Fresh bounded verification

Managed Chromium 149.0.7827.55:

- Guarded regression: eight fresh candidate contexts, covering mixed/recommendation-only, light/dark, fresh short startup, tall native recommendation, wide→short→wide resize, owned content, native replacement, original pointer call, default Enter/focus, GM no-write and disposal/restored variable priorities. Every direct refresh applies at most one recommendation-top write, measures before that write and preserves the independent final native geometry/width checks. Timers/frames/intervals and animations must settle.
- Exact E786/candidate owned-shell/body/intent differential: 92 observations per side in separate fresh contexts; nine input timing contexts per side; 28 selected faults rejected, including real microtask deferral. Native actions, identity/order, focus, body read/write phases and resource contracts compare equal in this bounded inventory. It does not add the mixed failing fixture to the old quiescence-dependent comparison.
- Raw style order differs in 40 observations. The inherited first/last placement allowance and other owner order are checked; no global phase-equivalence or live claim follows.

The fresh Git-routed execution completed all 23 commands: 22 passed and `mobile-observed-palette` failed. Policy, core/runtime proof, baseline verification, eight-context header cascade/14 palettes, list/article/comment/native-form comparisons, mobile full 138/138, host 11/11, PC functional 14/14 and PC palette comparison passed. Split proof groups cover all six groups: core rejects 71 mutations/accepts nine controls, runtime rejects 53/accepts 17; no reused cases. The old-baseline mobile palette still fails at three semantic/14 raw differing snapshots. Its three semantic differences deep-equal the preceding E786 report; this is retained legacy failure, not a new failure attributed to the one-line correction. Overall acceptance therefore remains FAILED; full-header/final/live admission is UNKNOWN. PC bytes are unchanged and the mobile guard was restored to A5EB after the PC run.

Earlier E786 product executions are historical for the new candidate. A read-only fresh-context reviewer found no blocking source/test defect; it read current reports and did not rerun browsers. It explicitly declined unchanged issue-top risk, preserved short mixed overlap, unmodeled host height dependence/live applicability, width extraction and header closure. Native recommendation top 389 still overlaps the issue's bottom 403 in the short mixed fixture; this unit makes no composition improvement claim.

| Local report | SHA-256 | Result/scope |
| --- | --- | --- |
| `artifacts/header-drawer-final-top-2026-10-08/original-negative.json` | `CE1342FE3AD39C0C33BEF076C1A4DB62830DF4B9130A505C3CCA9465C270E10C` | E786 meaningful FAIL before production change |
| `artifacts/header-drawer-final-top-2026-10-08/candidate-focused.json` | `3CE573B0C21681F820F9A5471B2DB1FE3FD71DB8EA46E001778084B5E2B6DEA3` | one functional test/eight candidate contexts PASS |
| `artifacts/header-drawer-final-top-2026-10-08/native-differential.json` | `8C1555B1B0F4C7973A8770017658D9EE0735F42305A978272F7B4722345E86BF` | 92 observations/side, bounded native/body/input equality |
| `artifacts/header-drawer-final-top-2026-10-08/gates.json` | `96A148AC32622810C7FD8AFF5A7E670175E13334CD96E5C6DDA98F57B93044F6` | all 23 commands executed; acceptance FAILED, palette only |
| `testbed/artifacts/acceptance-full-testbed-results.json` | `D382A6A300574D7D9DCE76E45C21915BC42C2E43C1B366FCE11FA7AD4A66D7A0` | A5EB 138/138 |
| `testbed/artifacts/acceptance-host-compatibility-results.json` | `2D16A48CF62774D093E2B967D45644C6217927C374EC59C849A7975107354C37` | A5EB 11/11 |
| `testbed/artifacts/acceptance-pc-functional-results.json` | `0AAB1D04590546C0A7535C881E10BAB35E45DEF0B4D1CF6A3F52E265DBABD79B` | unchanged PC 14/14 |
| `artifacts/proof-audit/core.json` | `487D90202B208D2CEE36B6C3142F37829982C2A74D34E759B6D5ED878EE0BB2C` | four groups, 71 negatives/nine positives |
| `artifacts/proof-audit/runtime.json` | `FD9D80CB5DBB6C0FB02156EB745F48FBE8F6CA18C3E5ED42A6FF5A7709210D8C` | two groups, 53 negatives/17 positives |
| `artifacts/acceptance-observed-mobile-palette.json` | `13A99CF1515D7C8A898173B4CDF145AB0C791F6B8524F542A402ADAB3E40F121` | original three semantic/14 raw differences retained |

Ignored reports/controls are local diagnostics. Missing execution is never regenerated as PASS. Source and oracle remained frozen across product checks. Later result/continuity prose changes the broader candidate fingerprint, not the recorded execution; it does not relabel those receipts or certify stage closure. A supplementary guard-hash read during the runtime mutation audit saw an intentional temporary mutant and was not a product gate; final restored guard/root/dist identity was checked after the audit/PC sequence.

## One next action

After this correctness unit's validation and checkpoint, extract the existing max-width value into one frozen numeric presenter description, consumed by three presenter CSS sites and three adapter calculations. Preserve default CSS bytes, rounding/clamping and all existing read/write phases. Add no DOM read, generic layout framework, asynchronous indirection or state/subscriber owner. The measured CSS-only 80px error/overflow remain contrary controls; UI editing cost and replaceability admission are still unmeasured/planned. Live applicability of the mixed synthetic state and height behavior for unmodeled host shapes remain UNKNOWN.
