# Small UI reuse preparation

User request2026-10-25: clean up the easy reuse obstacles before the write/editor work; do not turn this into a large rewrite. Base97fc1f2 / MobileAEF0633C. The user accepted the password/header appearance after that unit's receipt; its historical preference-pending field is not the latest decision.

Scope: no intended visual or native-behavior change. Keep the current owners, original DOM/events/forms, four native-password header subscriptions, PC output and versions. Existing B1 material tokens remain the common visual source.

1. Consolidate repeated list/view/native-password header applicability and mutation-context selection into one pure target-adapter helper, consumed by the existing four adapters. Keep recent's root-present style fallback and unsupported/editor behavior unchanged. No new build input, observer or runtime capability.
2. Extract only repeated source-runtime identity, screenshot metadata and comparison-manifest preparation into a small Testbed helper. Delegate screenshots to the existing browser API and comparisons/reports to tools/visual-review.mjs. Fail on changed runtime, duplicate capture names and mismatched PNG dimensions; never mark an unreviewed image approved. Window selectors, interactions and visual judgement remain explicit.
3. Check the context cases and helper failures, run the existing affected header/native-form contracts and control/candidate comparisons on settled source, record actual evidence and checkpoint. Return the next action to write/editor shell.

Ruling: broad popup-layout templating is deferred. Materials are already shared; dialog/menu/picker anatomy and positioning differ. Extract an identical layout fragment only when its real consumers demonstrate the benefit during the next UI slice. This preparation adds no second screenshot/scoring engine, frontend framework or dependency.

Success: four adapters consume one applicability policy; current CSS output and native page behavior are preserved; one real existing B1 comparison is prepared with the new helper and the existing comparator; repeated scratch preparation is no longer needed for that path. A speed improvement is not claimed from source cleanup alone.

## Use the preparation helper

Keep the existing guarded browser setup and explicit per-window actions. Import `createUiReviewPreparation` from `testbed/harness/ui-review-preparation.mjs`; choose a new artifacts directory and state fixture/live/theme provenance. The helper reads `testbed/artifacts/runtime-under-test.user.js`, records its actual SHA and the browser version, delegates screenshots to the supplied Playwright page/locator, then checks that runtime and captured bytes stayed unchanged.

Illustrative editor paths below must be replaced by the selected independent reference; the helper does not create that reference or choose the UI state.

```js
const review = await createUiReviewPreparation({
    outputDir: 'artifacts/write-review-01',
    provenance: 'Write/editor fixture, Chrome source injection, light,980 layout',
    designReference: {
        path: 'docs/design/b1-prism-2026-10-22.png',
        sha256: '83D73F768193FC594536448500B7DC6671653CE1CDE498606698C2FF06CDF296',
        decisionPath: 'docs/work/UI_DESIGN_REFERENCES.md',
        region: '<copy the active NEXT_TASK Design reference region exactly>',
    },
});
await review.capture(page, { id: 'write-light', theme: 'light' });
await review.writeManifest([{
    id: 'write-light', reference: 'artifacts/editor-reference.png', captureId: 'write-light',
}], {visualRequirements: [{
    id: 'changed-material', expected: '<selected visible treatment>',
    implementation: 'present', verification: 'unverified',
}]});
```

Then use `node tools/visual-review.mjs --manifest artifacts/write-review-01/comparison.json --output artifacts/write-review-01/visual`. Its native report remains the comparison viewer/decoder. With no explicit `assessment`, fidelity stays NOT_REVIEWED even when pixels match. After inspecting the real images, the optional assessment takes the existing reviewer/basis/limitations and per-case summary/findings format; the helper binds its reference/current hashes. A changed runtime, duplicate capture id, changed current image or different dimensions is an error, not a reason to update a golden.

This helper records a declared guarded runtime; it does not independently attest what was injected into a page. The existing guarded harness, exact source path/SHA, original handlers and explicit live request policy remain required. It has no product DOM, state, event, network or judgement owner.

Reference guard2026-10-25: design comparisons require the active frozen source/region and changed visual requirements; UI_REFERENCE_GUARD.md defines the small schema. Passed requirements need rendered-evidence path/SHA bindings. Known missing implementation cannot be softened into preference pending. Metadata/pixel equality still cannot certify aesthetics; capture-only preparation is unaffected.

## Completed — 2026-10-25

Shared context selection lives once in header-shell-host-adapter.js as a pure canonical-context policy plus a target input reader; the four existing adapters consume it. Immutable context arrays are reused and list/view selection avoids reading native-form DOM. Recent root-present fallback and unsupported/editor activation stay unchanged. This is a small dependency in the existing mobile bundle, not a new component/build input.

The preparation helper was used on four existing password/header fixture states and one trigger detail in separate control/candidate Chrome contexts. Current CSS13 payloads are byte-identical, header DOM/forms/subscriber keys match in four contexts, and all five native Playwright image comparisons are PIXEL_MATCH. Default fidelity remained NOT_REVIEWED and productApproved=false: preparation cannot certify beauty. Native-form25 behavior observations match; Mobile150/150 and seven helper/context tests pass. The seven small tests are registered in the existing full guidance/checkpoint validator; continuity-only checks remain unchanged.

Current Mobile3.5.5 is62F1BAE6, PC61C53976 unchanged. No visual/native behavior delta, dependency install, metadata/storage change or broad popup-layout extraction. Measured evidence is successful reuse and preserved outputs, not a quantified work-time saving. Full upper proof/acceptance and formal header promotion remain separate from this bounded unit; the resolver's fallback profiles are retained in the receipt, not relabeled as fully executed.

Receipt: verification/receipts/2026-10-25-ui-reuse-preparation.json. Local evidence: artifacts/ui-reuse-prep-2026-10-25. Next bounded task remains the write/editor shell.
