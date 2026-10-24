# Header drawer toggle intent characterization

## Implemented description boundary — 2026-10-08

Source base: `b5148915549200a107e85cd1ffbb69d3aa5e4640`. The presenter now returns reused frozen scalar-only `{type, surface}` intents matching the shared surface/open and surface/close vocabulary and its top-level `surface` field. A frozen current-open snapshot selects the opposite action. The existing guarded/cancelled adapter callback applies it directly in the same stack. CSS/template/body phases, native commands/state/reset/error owner, general UiPort, build inputs, shared/PC source and versions are unchanged. Both owners remain mixed; this is an intent-value boundary, not full application state/driver separation.

Exact mobile control `2FB36B4DE22CE79C9282ABE7D635B74DD9008F0F62D651485F8B61766A58BFAB` and candidate `E7869194916A5423CE493A33D5A8C85952AC84DDB07160927B320ED36F775779` ran in separate fresh contexts with Chrome 154.0.8037.98. The guarded owned observer's `--intent-boundary` mode retains body/shell/native checks: 92 observations per side and nine list timing contexts per side (seven minor narrow/wide/light/dark/short plus two sampled major recommendation-only shapes). View/write drawer absence is separately scoped. The pure test first failed because the description was absent, then passed five direction/vocabulary/surface/freeze/input mutation negatives. The combined observer rejected 28 selected descriptor/data/DOM faults. A separate fresh candidate-artifact mutation deferred host application to a microtask and was rejected specifically by native capture timing; it is additional to the 28 faults.

Trusted label pointer/default Enter, untrusted same-task burst `[1,0,1,0]`, synchronous cancellation and before/after capture state, retained focus, duplicate refresh/connect, shell replacement/reset, disposal/reconnect, original native identity, GM writes and resources are checked independently of paired equality. Eight raw style-order differences are retained; unchanged style-mount code, CSS payload/other-owner order and selected native/computed/body traces bound the scope, not global phase equivalence.

Local report: `artifacts/header-drawer-toggle-description-2026-10-08/differential.json`; artifact/source/observer/contract/control hashes and execution inputs are in the report. This is bounded synthetic evidence, not a header stage/upper/live receipt. The first implementation observer attempt failed in its own harness because it queried a disposed shell immediately after scheduling reconnect. The helper now waits for the actual owner/subscriber and shell; no product change was needed. A read-only fresh-context reviewer found no actionable production/test/research issues; it did not rerun tests or certify final receipts.

`UI_REPLACEABILITY_VALIDATION.md` adds real change/replacement/restore experiments, keeping readiness UNKNOWN until execution. Next characterize the responsive layout-input/host-measurement boundary, including current width coupling, before selecting its implementation. Full UiPort state/driver, Space/touch/repeat/all startup/bfcache, authenticated/live-extension, palette FAIL and final admission remain separate.

## Current regression evidence

Current E786 regression checks: managed Chromium 149.0.7827.55, mobile full 137/137, host 11/11, PC functional 14/14 with unchanged PC artifact `1A7A00468F4DCFB57C7341063098B827743091FD7593BA3FBA86A17E282BDC33`, and eight-context header cascade/14-palette title/GNB checks PASS. Mobile guard was restored after PC execution. The first cascade invocation rejected an output outside its required `testbed/artifacts` directory before launching; the corrected command passed. The current old-baseline palette comparison still FAILS at three semantic/14 raw differing snapshots. These split checks do not satisfy all broadly routed acceptance/promotion profiles.

| Local report | SHA-256 | Result |
| --- | --- | --- |
| `artifacts/header-drawer-toggle-description-2026-10-08/differential.json` | `AB49A11631F992F3442AF18A8F59E06FFA694B16E2E61789C3614886F249DE29` | bounded TOGGLE_DESCRIPTION_PASS |
| `artifacts/header-drawer-toggle-description-2026-10-08/mobile-full.json` | `63E8F30FFADD0FB14C73E6B25F60726F6254C54A54C6E1A3C0FB666C4CB5E70D` | 137/137 |
| `artifacts/header-drawer-toggle-description-2026-10-08/host.json` | `9684075345DE05F56322DF09E74B495BBF1269063609217B0CC77B772F023FA3` | 11/11 |
| `testbed/artifacts/header-toggle-description-cascade.json` | `A69E3E0EF1068F363793BBD50EDF21635F09F1997628FCE85C813521E95841AB` | eight contexts, 14 palettes |
| `artifacts/header-drawer-toggle-description-2026-10-08/pc-functional.json` | `38E9CA52B98AA869AD8E260AF958E5A69B1DE886FCEDA34AED9367CAED76352B` | 14/14 |
| `artifacts/header-drawer-toggle-description-2026-10-08/palette.json` | `7E6AD3EF82B61860C0D35A27C4B2307B18F1DFB3AD54A67DB6AE43B0EAB9A654` | FAIL retained |

These reports bind the executed SUT/oracle/fixture/harness/toolchain scope. Later continuity/research-result prose changes their broader candidate fingerprint; they do not relabel an old/global receipt as current. Exact artifact/runtime inputs remained unchanged during this documentation update. The new toggle helper is currently an unmapped Git path, expanding the route to policy, proof-core/runtime, acceptance and Windows promotion; broad profile selection is not their execution/pass. Current controls are diagnostic evidence, not stage promotion.

## Historical unchanged-runtime characterization

Source checkpoint: `b6d449908f04690e1e4994e234508faa2badc90f`. This investigation changes no product source, accepted registry, candidate ownership, build input, version or generated bytes. Mobile root/dist/guard/frozen control remain `2FB36B4DE22CE79C9282ABE7D635B74DD9008F0F62D651485F8B61766A58BFAB`; PC remains `1A7A00468F4DCFB57C7341063098B827743091FD7593BA3FBA86A17E282BDC33`.

## Observed contract

The exact current runtime passed four independent minor-list contexts: 390/1280 pixels, light/dark, managed Chromium 149.0.7827.55. A local disposable probe adds observation listeners after the owner connects; it does not replace product callbacks or drive a candidate implementation.

- Trusted pointer input on the label and default Enter produce a click observed first at window capture with the old state, then at a later document-capture listener with the new state and default prevented. Target and window-bubble listeners do not run. Existing cancellation remains synchronous in the adapter's document-capture callback.
- Four programmatic clicks in one task immediately yield open/closed/open/closed. Their events are untrusted; this burst is separate from trusted pointer/keyboard coverage.
- Enter closes the open drawer without losing focus and retains the original rank popup through the existing popup-only marker. The original native open/close handlers run once each.
- Refresh and duplicate connect preserve the same open shell and focus. Removing the shell and refreshing creates a closed shell. Dispose/reconnect also creates a closed shell and restores the adapter's baseline resource counts. Native issue identity and all GM values/writes are preserved; settled timer/frame/interval counters are zero and no runtime errors occur. Probe listeners belong to the discarded browser context, not adapter resources.

Current `surface/open` and `surface/close` handlers commit their snapshot before their first await. A subscriber runs before dispatch returns its Promise. An explicit deferred-handler control fails that immediate-commit expectation. Async syntax alone is not evidence of delayed snapshot mutation.

The general UiPort nevertheless does not drive the drawer: opening `header-drawer` immediately changes the snapshot while the DOM stays closed. Repeating the same snapshot value has no commit/notification. Replacing an open shell resets its DOM to closed while the separately opened snapshot remains true. Thus snapshot state cannot replace the current native/DOM state by assumption.

The actual contract and application handlers also ran in an isolated VM. Concurrent open/close/open commands immediately commit three successive states, but all awaited results report the final revision/state. Applying `committedSnapshot` after await is not a per-command host-state receipt. A handler exception rejects dispatch with the original error. A subscriber exception instead produces one warning and leaves dispatch successful; subscriber-driven host application would change the required failure channel.

## Selected next boundary

Extract only the pure toggle intent description into the existing presenter. A frozen snapshot of the current drawer open attribute selects a reused frozen `surface/open` or `surface/close` description for the fixed `header-drawer` surface. The existing adapter remains the native command owner: retain its button/drawer guards and cancellation, consume the description, and apply `setDrawerOpenState` in the same callback/stack. Match description values to the existing shared intent vocabulary in the pure test. Do not dispatch this description through the general snapshot store in this extraction.

This is typed intent-value separation, not full UiPort/application-state ownership. Keep both owners mixed. It needs no new handler, subscriber, listener, Promise boundary, state store, timer, observer, error catch, shared/PC source change or public API. Preserve current shell reset semantics, refresh measurements and popup-only/native behavior. Update the candidate responsibility and surface contract at the actual implementation boundary, then prove exact 2FB3 control/candidate equality and selected descriptor/order faults.

Full application/UiPort routing is deferred. It requires a concrete host-command driver with same-stack application, original-error rejection, reset/replacement/disposal semantics, no-op refresh behavior and per-command ordering. Neither adding a subscriber nor applying an awaited result closes those obligations. Revisit this design if the bounded value extraction needs a new runtime/state/lifecycle owner.

## Evidence and limits

Local report: `artifacts/header-drawer-intent-2026-10-08/report.json`, SHA-256 `E554B62BC77D05DD695A3F665433BE31E05A2F94616B678D7BAE4CD62DF5FD15`, status `CHARACTERIZATION_PASS`. Disposable probe: `artifacts/header-drawer-intent-2026-10-08/probe.mjs`, SHA-256 `41C0E7A368AC498999F10A10C93F5885AB3EEA3DFD2A12FD4B1D4F47F137C7BC`. The report binds the absolute guard path/digest, four actual source hashes, observer and current architecture/source/harness/fixture/toolchain/proof identities. These local files are diagnostics, not tracked implementation/gates. Losing them cannot recreate an old execution; the next source change requires fresh comparison.

Primary mechanism checks: [ECMAScript AsyncBlockStart and Await](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-async-functions-abstract-operations-async-block-start) and [DOM event invocation](https://dom.spec.whatwg.org/#concept-event-listener-inner-invoke), inspected 2026-10-08. They support evaluating async work until suspension and the distinction between propagation and immediate propagation stopping. DCUF timing, no-op/reset and failure-channel findings come from current source and the bound local executions, not from the standards alone.

Scope excludes major/recommendation-only intent traces, Space/touch/key-repeat, every partial-startup interleaving, full lifecycle/bfcache, product performance, extension execution and live host variants. The preceding body comparison separately covers sampled recommendation-only geometry; it is not intent evidence. Original palette FAIL (three semantic/14 raw differences), full-header/final-feature/upper/live UNKNOWN and all recorded cascade/startup/page-head/timer/popup debt remain unresolved.
