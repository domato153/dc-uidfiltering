# DCUF current state

## Accepted baseline

- Development branch: `codex/mobile-development`; Phase 2 work branch commit is `e46a8122712d13a700fa6c69ebf9581833f816d5`, based on `e7fa4385b7fc65e7db40464df0dafd98b8391e4e`.
- Behavior source: `cef5f71381116d2746b0319b2f8e609e8d7eae85`.
- Mobile beta SHA-256: `A03038FE68126B62054EBA11244D4EE2E1766D308983FC5C27127FD3794CB343`.
- Mobile stable 3.5.5 SHA-256: `32BA208DDD9973A7EEC343F01E963A833AB4F0C084987077EDAE46844383C25D`.
- PC 1.9.9 baseline SHA-256: `D3A95C479D8D50F88D97700DE91FA17D1D338B3AEBB488F53D865F445B656212`.

## Accepted architecture work

- Registry version 3 contains the internal `UiPort`, immutable snapshot and typed intent contracts, application-owned palette state, `HostSurfacePort`, and target-adapter-owned `DisposableScope`.
- `ThemeModule` remains the single palette visual owner but no longer reads or writes GM storage or accesses `document` directly.
- The palette GM key, 14 values, menu/dialog DOM and CSS, preview/cancel/save/default behavior, focus return, and `dcuf:palette-change` event remain unchanged.
- Impact resolution and UI-boundary verification consume accepted plus candidate overlays; evidence binding includes candidate state.
- Differential execution rejects equal control/candidate digests and runs each artifact in a separate process and fresh browser contexts.

## Current candidate artifacts

- Mobile 3.5.5: `93DA65B74F1A4A00A92C91181E12A60060E2AA4964332292599F4A6DCC1BCD48`.
- PC 1.9.9: `20509CA38DD4227F350FCFFD9A8544E7EC158A5761E7119AFD96292C437907DF`.
- DOM-dependent disposal is in the target-adapter layer; these are the exact digests used by final local acceptance.

## Evidence status

- Exact beta/stable normalization and repository release contracts: passed.
- Phase 1 characterization: `verification/receipts/2026-09-05-characterization.json`.
- Phase 2 registry folds: `verification/receipts/2026-09-05-phase-2-registry-fold.json` and `verification/receipts/2026-09-05-phase-2-layer-fold.json`.
- Distinct-artifact mobile and PC palette differential receipts bind the final artifact digests above.
- Final local acceptance on `e46a812`: mobile 97/97, host compatibility 11/11, PC functional 14/14, proof mutations 4/4 rejected, and repository policy/artifact checks passed.
- Acceptance receipt: `verification/receipts/2026-09-05-phase-2-acceptance.json`.
- Windows hosted-runner promotion checks remain pending until the branch is pushed.
- No live canary has been claimed. July live evidence is historical and may be stale.

## Resume rule

Recheck fresh refs, HEAD, tracked status, active overlays, impact/evidence hashes, and exact generated artifact SHA before continuing. Never treat an older PASS as current when source, build topology, harness, fixture, or routing changed.
