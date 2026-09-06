# DCUF current state

## Accepted baseline

- Protected development branch: `codex/mobile-development` at `e7fa4385b7fc65e7db40464df0dafd98b8391e4e`.
- Latest pushed Phase 2 proof-hardening commit: `1c1480f5aee5535f69ffba4ffbdaa40e1c578495`. It is on PR #3 (`codex/ui-port-boundary`) and is not yet accepted or merged.
- Exact-head workflow correction: `28cc9c9496791bfaf959e31cada9cb10b9d8aa0e`.
- Behavior source: `cef5f71381116d2746b0319b2f8e609e8d7eae85`.
- Mobile beta SHA-256: `A03038FE68126B62054EBA11244D4EE2E1766D308983FC5C27127FD3794CB343`.
- Mobile stable 3.5.5 SHA-256: `32BA208DDD9973A7EEC343F01E963A833AB4F0C084987077EDAE46844383C25D`.
- PC 1.9.9 baseline SHA-256: `D3A95C479D8D50F88D97700DE91FA17D1D338B3AEBB488F53D865F445B656212`.

## Phase 2 candidate architecture

- Registry version 6 contains `UiPort`, immutable snapshots and typed intents, application-owned palette state, `HostSurfacePort`, target-adapter-owned `DisposableScope`, the observed palette oracle mapping, and a required concrete exit contract for every `mixed` component.
- `ThemeModule` no longer reads or writes GM storage or accesses `document` directly. It owns palette markup/CSS but still delegates pinch geometry and touch listeners to the mixed `PersonalBlockModule`; registry relation and one-owner debt now record that fact.
- Palette effects dispatch independently. Application-owned write revision suppresses a stale startup read only after a successful write, preserving the original read/write ordering and final state.
- The palette GM key, 14 values, menu/dialog DOM and CSS, preview/cancel/save/default behavior, focus return, and `dcuf:palette-change` event remain unchanged.
- Impact resolution and UI-boundary verification consume accepted plus candidate overlays; evidence binding includes candidate state. UI-boundary verification selects every active `presentation-source`, including mixed-boundary components, and the proof audit injects a forbidden GM reference into `ThemeModule` to prove that route cannot silently skip it.
- Differential execution rejects equal control/candidate digests and runs each artifact in a separate process and fresh browser contexts.
- The external evidence-to-practice mapping is recorded in `docs/refactoring-evidence.md`. UI slices use Ports and Adapters plus an incremental Branch-by-Abstraction migration, but never execute old and new mutating owners together; one owner is selected at composition time and the superseded path is removed in the same PR.

## Current candidate artifacts

- Mobile 3.5.5: `14669BD113E97925507B4311625827D087E8CA3736583F9A16303FA03FF77448`.
- PC 1.9.9: `F0B419CAF3214DED3CD9502CD1BB4C789B12F2E4E7DFDEAF80B3C11CBACFD259`.
- Root and `dist` outputs are generated validation artifacts and remain untracked.

## Evidence status

- Exact beta/stable normalization and repository release contracts: passed locally at `ad3b758`.
- Phase 1 characterization: `verification/receipts/2026-09-05-characterization.json`.
- Phase 2 registry folds: `verification/receipts/2026-09-05-phase-2-registry-fold.json`, `verification/receipts/2026-09-05-phase-2-layer-fold.json`, and `verification/receipts/2026-09-06-phase-2-audit-truth-fold.json`.
- The tracked Phase 2 acceptance receipt bound to `e46a812` is machine-marked stale and must not authorize the current candidate.
- Current observed mobile and PC receipts compare preview/cancel/save/write-failure-retry and save-before-pending-startup-read-release ordering. Both were regenerated with evidence-binding schema 2, contain 16 observations, zero semantic differences, and two raw startup-observer churn differences; settled active ownership is equal.
- Evidence binding now canonicalizes declared text line endings, keeps binary/artifact bytes exact, binds product/build inputs and the proof/oracle implementation, and requires symmetric receipt fields. The local harness and fixture hashes now match the Linux checkout identity. The CI manifest resolves Playwright and pnpm through pinned cross-platform entry points and rejects null versions or missing artifacts.
- Current local policy runs architecture, proof audit, UI boundaries, skills, and workflow verification. Six wrong-head/stale-binding/non-guarded-runtime/control-equals-candidate/presentation-forbidden-GM/missing-transition mutations are rejected for the intended reason, and portable text hashing is self-checked.
- Local acceptance at exact source/harness head `ad3b758` passed mobile 97/97, host compatibility 11/11, PC functional 14/14, both observed differentials, immutable baseline verification, generated artifact identity, metadata, and repository contracts.
- The editor-layer product correction from `fb262fb` was removed because it changed visible geometry inside a semantic-delta-zero phase. The preserved implementation keeps positive viewport containment within 1px and toolbar-anchor tracking within 2px. The tracking tolerance covers the immutable baseline's platform-dependent `offsetWidth`/transform subpixel quantization; each before/after rectangle and gap is retained in separate immutable-control and candidate write-layout reports so one run cannot overwrite the other. Exact inset changes require a separate declared behavior fix and live evidence.
- Hosted run `33979996163` proved exact-head checkout and artifact lineage for superseded head `a05184e`, but it is stale after the runtime, harness, registry, and policy workflow changes in `74816c8`.
- Exact-head run `33982635613` at `740d2bf` passed policy and affected jobs, including the declared proof audit. Its full acceptance recorded mobile 96/97, host 11/11, PC 14/14, and zero semantic palette differences, but correctly remained red because the old 1px editor tracking assertion failed for both immutable baseline and candidate on Ubuntu Chromium 149. It is diagnostic evidence only, not an acceptance pass; `ad3b758` records geometry values and uses the bounded 2px cross-platform contract.
- Exact-head run `33983421079` at `0bd2c93` passed Ubuntu policy, affected, and full acceptance: mobile 97/97, host 11/11, PC 14/14, both observed differentials, immutable lineage, and artifact-manifest checks. It is now historical evidence because the proof route, workflow, and harness changed after that head.
- A completed independent `gpt-5.6-sol max` audit of `a05184e` found three merge blockers: undeclared geometry change, pending-read/save ordering regression, and an unexecuted declared proof gate. `74816c8` addresses all three plus registry/receipt/document truth findings, but a fresh independent audit of the latest pushed head is still required.
- A fresh independent max audit of `0bd2c93` was interrupted before verdict by the audit task's usage limit. Its partial review exposed two real proof gaps now corrected locally: `ThemeModule` was skipped when `boundaryState` was mixed, and the control editor geometry report was overwritten by the candidate run. An interrupted audit is not a pass.
- Exact-head Ubuntu run `34015955884` at `1c1480f` passed policy, affected, and full acceptance: mobile 97/97, host 11/11, PC 14/14, both observed differentials, immutable lineage, six expected artifact manifests, and separate control/candidate editor geometry. It is historical after the evidence-binding and registry hardening in the working change.
- A later interrupted independent audit of `1c1480f` exposed a real cross-platform receipt flaw: with `core.autocrlf=true`, the same commit produced different harness/fixture/toolchain hashes. The working change fixes the root cause and adds transition exits plus external case-to-implementation guidance; a completed fresh audit is still required.
- Fresh exact-head Ubuntu policy/affected/full acceptance for the evidence-portability head and Windows hosted promotion remain pending.
- No live canary has been claimed. July live evidence is historical and may be stale.

## Resume rule

Recheck fresh refs, HEAD, tracked status, active overlays, impact/evidence hashes, and exact generated artifact SHA before continuing. Never treat an older PASS as current when source, build topology, harness, fixture, or routing changed.
