# B1 visual-review miss and bounded backstop

The user identified an unfinished toolbar and weaker header glass in the90EEEBFF candidate. The material pass is **not visually complete**. Functional144/144, native compatibility11/11 and palette bindings retain their own scopes; they cannot approve either appearance issue.

## Why it escaped

1. `run-b1-product.mjs` tested toolbar height, hit areas, short-category width, token equality, blur presence and normal/notice hierarchy. It had no relationship between category text and neighboring tab labels. The actual labels are13.296875px above the tabs in six same-row fixture contexts, yet those existing conditions all passed.
2. The manually assembled material detail sheet cropped only330px of the toolbar. The native tab group already occupied most of that width; categories and the right action group were missing from the same readable comparison. The whole-page image existed, but it did not compensate for that incomplete component comparison. Actual pixel files alone were insufficient.
3. The task focused on color/material and inherited earlier layout PASS as reassurance. The adjacent component's overall rhythm still needed review. Narrow implementation scope does not turn a visible adjacent defect into accepted appearance.
4. Impeccable's original guidance already requires rendered visual judgment. Its detector does not assess this layout/material finish. The prior human-like AI review missed it; this is no evidence of an upstream skill defect or a reason to install another package. Token/background/blur agreement was mistaken for stronger material-fidelity evidence than it supplies.

## What changes

- The existing B1 runner now measures rendered text ranges relative to adjacent labels, not presenter CSS values. Same-row drift beyond3px is NEEDS_WORK; narrow responsive rows are explicitly outside that same-row condition. This bound tolerates font rounding and was checked on the chosen reference, not selected to make the candidate pass.
- Record functional and visual outcomes separately. The current native candidate finishes all eight functional contexts but exits1 with visual NEEDS_WORK. Even after numerical checks pass, its visual status remains MANUAL_REFERENCE_REVIEW_REQUIRED. It cannot silently print an overall product PASS from these checks.
- Capture the entire toolbar width at native scale, including all tabs, categories, overflow control, page-size and write action. `run-b1-visual-capture.mjs` retains those region paths/bounds alongside full images. Do not substitute a left-only crop or a miniature gallery for this coherent unit.
- The existing UI review route now requires a coherent-component comparison after a local change: shared baselines/grouping, hierarchy and material in context. Select only affected components and relevant states; no mandatory full128 audit, fixed anchor count, recurring reviewers or extra full runtime suite.
- For glass, compare the complete header and readable edge/context: glaze, rim strength, light/dark tone, translucency against its backing and shadow spread. CSS presence, sampled RGB similarity and a pixel result cannot approve that perception. A short concrete visual disposition is still required; uncertain material remains open.

## Transfer evidence and limits

`node testbed/test-toolbar-visual-contract.mjs` renders the selected preview at980px in light/dark: both aligned references pass, both10px-shifted negatives are rejected. The updated guarded B1 runner detects the real13.296875px drift in six980/1280 same-row contexts while all eight functional contexts pass.390 stress uses a different row arrangement and is not reported as passing this same-row rule. Both header-focused and acceptance routes include the transfer test; the existing routed B1 product command includes the new visual rejection.

This proves one concrete automatic backstop and better evidence framing. It does **not** prove automatic aesthetic judgement, capture every spacing/texture defect, or guarantee that AI will never miss a detail. The header-glass report is an unresolved visual finding, not a manufactured detector success. The next bounded task repairs toolbar composition and header material through existing owners and repeats the affected reference comparison. No product source was changed after the user's request to fix the review system first.

Recovery: the exact receipt linked by CURRENT_STATE.md binds90EEEBFF, final functional evidence, selected-reference transfer report, current NEEDS_WORK report and full-width toolbar images. Preserve the previous079ED46D control and historical method trials; do not revive rejected heavy recording or claim measured Impeccable efficiency.
