# DCUF current state

## Accepted baseline

- Development branch: `codex/mobile-development`; Phase 2 runtime/evidence candidate is `fb262fbf02e1bc5dabfd12b7a606ec294b9602a8`, with the exact-head workflow correction at `28cc9c97d707c6d4449e240b96cad15b44dd3d51`, based on `e7fa4385b7fc65e7db40464df0dafd98b8391e4e`.
- Behavior source: `cef5f71381116d2746b0319b2f8e609e8d7eae85`.
- Mobile beta SHA-256: `A03038FE68126B62054EBA11244D4EE2E1766D308983FC5C27127FD3794CB343`.
- Mobile stable 3.5.5 SHA-256: `32BA208DDD9973A7EEC343F01E963A833AB4F0C084987077EDAE46844383C25D`.
- PC 1.9.9 baseline SHA-256: `D3A95C479D8D50F88D97700DE91FA17D1D338B3AEBB488F53D865F445B656212`.

## Phase 2 candidate architecture (PR #3; not yet accepted)

- Registry version 4 contains the internal `UiPort`, immutable snapshot and typed intent contracts, application-owned palette state, `HostSurfacePort`, target-adapter-owned `DisposableScope`, and the observed palette oracle mapping.
- `ThemeModule` remains the single palette visual owner but no longer reads or writes GM storage or accesses `document` directly.
- The palette GM key, 14 values, menu/dialog DOM and CSS, preview/cancel/save/default behavior, focus return, and `dcuf:palette-change` event remain unchanged.
- Impact resolution and UI-boundary verification consume accepted plus candidate overlays; evidence binding includes candidate state.
- Differential execution rejects equal control/candidate digests and runs each artifact in a separate process and fresh browser contexts.

## Current candidate artifacts

- Mobile 3.5.5: `498113B09260D6E86655414D81223401668A08AA8B2E1B9A9F46D7DC73D7692B`.
- PC 1.9.9: `20509CA38DD4227F350FCFFD9A8544E7EC158A5761E7119AFD96292C437907DF`.
- The mobile digest also contains the editor-layer scale correction described below. DOM-dependent disposal remains in the target-adapter layer; these are the exact digests used by current local acceptance.

## Evidence status

- Exact beta/stable normalization and repository release contracts: passed.
- Phase 1 characterization: `verification/receipts/2026-09-05-characterization.json`.
- Phase 2 registry folds: `verification/receipts/2026-09-05-phase-2-registry-fold.json` and `verification/receipts/2026-09-05-phase-2-layer-fold.json`.
- Immutable baseline verification now reproduces mobile beta, version-only stable, and PC 1.9.9 from `cef5f71` without consuming candidate sources.
- Observed mobile and PC palette receipts compare preview/cancel/save/write-failure-retry state, storage, custom events, host node identity, geometry, requests/errors, and settled ownership in independent browser contexts. Both have zero semantic differences. One additional startup observer is created and disconnected by the candidate, so active ownership remains equal; the raw churn is retained in each receipt.
- The older palette receipts are marked stale and now claim only matching test outcomes, not semantic equivalence.
- Current managed-Chromium 149 local acceptance on `fb262fb`: mobile 97/97, host compatibility 11/11, PC functional 14/14, and repository policy/artifact checks passed.
- The acceptance receipt for the older runtime is historical and must not be reused for `fb262fb`.
- PR #3 (`codex/ui-port-boundary` -> `codex/mobile-development`) is open. The protected development head remains `e7fa4385b7fc65e7db40464df0dafd98b8391e4e`.
- Ubuntu runs `33916550119` and `33944330515` are historical failures and are not accepted Phase 2 evidence. The latter proved the immutable baseline passed while candidate editor-layer geometry failed under the same managed Chromium 149 browser.
- Current verification changes default to Playwright-managed Chromium, reject invalid explicit browser paths, reject wrong target metadata and empty selection, read build target metadata from the manifest, and preserve per-gate JSON results.
- Body replacement compares subscriber keys and gauge from one diagnostics snapshot. Its observer limit remains unchanged.
- Editor geometry assertions remain unchanged. The product now derives inherited zoom from the layer rather than a small anchor's rounded `offsetWidth`, and reserves border-box chrome before applying max dimensions. This directly addresses the Ubuntu evidence without weakening containment.
- Ubuntu run `33962623626` passed all three jobs and the corrected geometry, but its default `pull_request` checkout tested a synthetic merge commit while naming the step “exact candidate”. It is integration evidence, not accepted exact-head evidence.
- Independent `gpt-5.6-sol max` review confirmed that wrong-head lineage defect before its session ended without a final report because of usage/network exhaustion. Commit `28cc9c9` explicitly checks out and verifies the PR head in every job and names uploaded evidence with the same SHA; a fresh exact-head run and a completed independent audit remain required before merge.
- Exact-head Ubuntu acceptance and Windows hosted-runner promotion remain pending.
- No live canary has been claimed. July live evidence is historical and may be stale.

## Resume rule

Recheck fresh refs, HEAD, tracked status, active overlays, impact/evidence hashes, and exact generated artifact SHA before continuing. Never treat an older PASS as current when source, build topology, harness, fixture, or routing changed.
