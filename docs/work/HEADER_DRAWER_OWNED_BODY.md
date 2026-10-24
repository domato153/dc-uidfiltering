# Header drawer owned-body boundary

This bounded unit starts from source checkpoint `4221066e490cdf1d7132084301fe80c3a2933d7f`. Exact immediate mobile control is `79FCBC260FDCD43FEBE62B56BF4EE29D8E4C09F9A061663DADF550EC3F1F87DA`; candidate root/dist/guard is `2FB36B4DE22CE79C9282ABE7D635B74DD9008F0F62D651485F8B61766A58BFAB`. Versions remain mobile 3.5.5 and PC 1.9.9; PC root/dist remain `1A7A00468F4DCFB57C7341063098B827743091FD7593BA3FBA86A17E282BDC33`. The accepted registry is untouched and both drawer components remain mixed in the candidate overlay.

## Result and preserved boundary

The presenter supplies frozen ordered open/closed body declarations and pure frozen descriptions for measured inline offset, maximum height and inner padding. Static declaration arrays are reused. The adapter retains native discovery/state/markers, direct click handling, viewport clamping/rounding, both height-measurement phases and DOM application. It still applies offset and visibility before measuring height, then places the original issue source, applies inner padding and measures height again. Native positioning variables, shell/template, focus guard, CSS payloads, mounting phases, schedulers, observers, storage and PC build inputs are unchanged. Added descriptions allocate only a fixed number of small objects per existing update; there are no new DOM reads or resource owners and no performance-improvement claim.

`testbed/header-drawer-body-contract.mjs` independently specifies values, priorities, order, numeric formatting and padding branches in a VM without DOM/GM/network/scheduler globals. Its initial run failed because the description was absent; the final implementation passes and rejects six value/priority/omission faults.

The existing owned-shell observer has a separate `--body-boundary` mode. Its template oracle reads the exact 79FC control presenter, rather than demanding the older adapter template. Legacy mode is retained. Separate fresh contexts compare seven minor-list viewport/theme cases (including 390x480), two major recommendation-only cases, and view/write drawer absence. Nine list cases cover initial/open/native-action/keyboard reclosure, content-present/empty body, disposal and reconnect. The 92 observations per side retain exact owned markup, inline CSS text/order, native and body/body-inner topology, geometry, callbacks, storage/writes, requests and settled resources.

Reversible per-instance measurement/write hooks observe synchronous open refreshes. They compare exact traces and independently require the offset/visibility/height order, the first three body-height reads, and source placement/padding before the second height read. Major recommendation-only cases cover the first-height path without an issue source. These are selected refresh phases, not global startup/order proof. Six body descriptor faults, five body DOM faults and the existing seven shell faults are rejected; trusted focus/default Enter and disposal remain positive after DOM faults.

Current bounded report: `artifacts/header-drawer-owned-body-2026-10-08/differential-phases.json`, SHA-256 `C76E9B94A8101DF895004B367D980FC62D6A3F55CA84AA4A2FD367FDAA5BD033`, status `OWNED_BODY_PASS`, Chromium 154.0.8037.98. It binds sources, observer and body-contract hashes, control bytes/source binding, runtime and full evidence inputs at execution. Eight raw stylesheet-order differences remain recorded under the preceding independently characterized first/last drawer positions. Exact CSS payloads and other owners' relative order remain required; this is not global phase equivalence or a header-stage receipt.

## Oracle and environment findings

Sandbox Chrome could not reach localhost (`ERR_NETWORK_ACCESS_DENIED`) before product execution. The same local-only test ran outside that sandbox. Playwright's managed Chromium 149.0.7827.55 is available outside the sandbox; the comparison above deliberately uses installed Chrome 154, while broader product checks use managed 149. Their scopes/browser identities are separate.

The new observer first failed on unchanged 79FC for two incorrect expectations: CSSOM enumerates the `overflow` shorthand as axis properties, and an empty owned body has zero height while the original native issue content has positive area. Read shorthand values/priorities explicitly, retain raw CSS text/order, require zero empty-body height and positive native/content geometry. Do not change production to satisfy these expectations.

A later pair had two raw inline-order differences only after a candidate-only custom-property omission fault. Restoring `style` through `setAttribute` can reorder the custom property in Chrome. The final observer runs body faults after all clean paired observations; it retains strict clean order equality and verifies semantic/focus/default-input/disposal recovery afterward. No difference is normalized away. Failed reports and unchanged-control CSSOM/empty-body probes remain local diagnostics, not product success.

## Validation and remaining admission

- Mobile full suite: 137/137, `artifacts/header-drawer-owned-body-2026-10-08/mobile-full.json`, SHA `486383D52116D3CC18C02DEB6AB0F9C60F23CB7F76D78F45D052553A68C7279D`.
- Host compatibility: 11/11, `artifacts/header-drawer-owned-body-2026-10-08/host.json`, SHA `8ADBB7F33AF0C9FF7AC196011CF2B826DD91BE071CCA30391EE1BAF32DD9A338`.
- PC functional: 14/14 at unchanged 1A7, `artifacts/header-drawer-owned-body-2026-10-08/pc-functional.json`, SHA `EA77FB88B0C0A7726AE5EF0E9DFAB8398D929C4591B4B6ECAD7C00EEC9E90A52`; mobile guard restored afterward.
- Selected cascade/title/GNB contracts: eight wide contexts and 14 palettes, `testbed/artifacts/header-owned-body-cascade-2026-10-08.json`, SHA `120AEB78BDF1A7E97C0267200C511C2A7E85A5AF90C680250992B470F2CCD282`.
- Proof-system executions use local reports in the same unit directory. Read their actual results/bindings; this document does not infer unexecuted or pending results. Git-derived selection is broader because overlay/observer changed. Bounded/split coverage is not every acceptance/promotion profile passing; original palette failures are retained separately.
- Canonical mobile/PC builds and `verify-repo release` pass at the identities above. Superseded matching mobile root/dist bytes have one ignored archive copy; frozen 79FC is retained.

Original cda1087 acceptance and A030/79FC palette FAIL remain unresolved. Full-header/Layer-2/final-feature/upper assurance and exact current extension/public/authenticated/hosted-live admission remain UNKNOWN. This extraction does not close raw selector/priority debt, startup order variance, page-head raw differences, historical C84 timer provenance or the untraced popup timeout.

The next bounded task characterizes direct toggle timing and existing UiPort ownership before selecting an intent boundary. Current SURFACE_OPEN/CLOSE handlers only commit application snapshots; they do not drive the drawer, whose native click handling currently applies state synchronously. Do not add asynchronous indirection or claim intent separation from this body result.
