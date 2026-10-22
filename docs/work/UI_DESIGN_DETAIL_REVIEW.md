# Design-detail review and refinement

Use for an appearance change or a fidelity complaint, through UI_VISUAL_REVIEW.md. The chosen design remains B compact/B1; this method does not select another style. Functional correctness, reference fidelity, and user aesthetic preference are separate conclusions. A working arrangement is not a finished design.

## External basis and limits — checked 2026-10-23

| Primary source | Take into DCUF | Limit / do not import |
| --- | --- | --- |
| [Moshagen & Thielsch, 2010, Facets of visual aesthetics](https://www.uni-muenster.de/OWMS/uploads/drafts_thielsch/pdf/moshagen_2010.pdf), DOI10.1016/j.ijhcs.2010.05.006, author-hosted manuscript | Seven studies support distinguishable simplicity, diversity, colorfulness and craftsmanship facets. Use them as prompts for order, character, color harmony and coherent finish. | This is perceived-aesthetics measurement, not a CSS recipe or a current-trend standard. The authors identify sampling/cultural limits and abstract items that may not guide concrete changes. Our adaptation is qualitative, not a validated VisAWI score; no mandatory18-item survey, sample recruitment or statistical cutoff. |
| [GitLab Product Design MR reviews](https://handbook.gitlab.com/handbook/upstream-studios/product-design/workflow/mr-reviews/) | A real product-team procedure: inspect the running implementation, compare actual/expected images, make feedback actionable, and distinguish outstanding/non-mandatory work. | Published operational practice, not experimental proof of effectiveness here or a universal industry standard. No mandatory staff, approval hierarchy, PR, meeting or account integration. |
| [Chromatic UI Review](https://www.chromatic.com/docs/review/) | Intentional visual changes need review and specific follow-up as well as regression tests. Reuse the existing Playwright side-by-side/diff viewer. | Vendor workflow documentation, not an independent beauty benchmark. No Chromatic/Storybook subscription, dependency, cloud upload or second comparison engine. |

The exact workflow and scope defaults below are our proportionate adaptation, not rules experimentally validated by those sources. The selected B1 reference and native contracts supply the concrete target.

## One short loop per coherent change

1. **Define the target before editing.** Select affected checklist IDs and name a few observable design anchors, normally3–5 for one coherent batch. Write expected appearance and the intended difference, not “modern/clean enough.” This is a planning aid, not a cap that permits leaving confirmed defects behind. Reuse the existing brief; no second inventory.
2. **Compare the whole and the detail.** Inspect an aligned full view first, then affected controls/rows at readable equal scale; return to the full composition after refinement. Match viewport, theme, open/scroll state, fonts and content where feasible. If galleries, text or engines differ, declare the mismatch and use corresponding stable details/source values; do not treat whole-image pixel percentage as fidelity or beauty. Never mask the detail under review.
3. **Give each material difference a disposition.** Record expected → actual → reason/action in a compact table. Use `NEEDS_WORK`, `INTENTIONAL` with a specific native/user constraint, or `UNKNOWN` for unseen/unsettled evidence; use `MATCHED` only after inspecting that detail. Optional work can be explicitly deferred with its effect on the claim. “It is a mock,” “native DOM,” or “tests pass” alone cannot excuse feasible typography/spacing/icon/material differences. Extra prototype controls need not be invented, but their visual language can still be carried over.
4. **Refine through the existing owner.** Change related presentation declarations/tokens together; preserve original controls, events, palette semantics and UI/function boundaries. Fix a shared cause in its owner rather than layering unrelated overrides. Use reference measurements as design evidence, not universal pixel laws. Keep readable content opaque and effects subordinate to reading.
5. **Retake and review the affected result.** Run the existing comparator, inspect the result against both reference and before-state, and revisit the declared anchors. Open/focus/hover/scroll the actual UI when those states changed; a still cannot prove motion or input. Run existing impact-routed functional checks. Unresolved important anchors keep design fidelity incomplete, even with green tests; resolved scoped anchors do not approve other surfaces or the user's taste. No automatic golden update or endless cosmetic loops: fix actionable mismatches, or state what decision/evidence is missing.

## Detail prompts — select what changed

| Area | Concrete comparison |
| --- | --- |
| Type and hierarchy | Loaded font/fallback, size, weight, line height, tracking; title/author/stats emphasis and reading density. Compare equivalent row types. |
| Spacing and proportion | Shared edges, baselines, internal vs external padding, control height/width, gaps and grouping; whole-page rhythm as well as individual controls. |
| Icons and controls | One coherent weight/scale, optical centering, label relationship, selected/secondary/primary roles, hover/focus/open states. Preserve hit targets. |
| Color and material | Neutral/accent balance, border strength, opaque reading surface vs glass chrome, rim/shadow/depth and dark counterparts. Preserve all palette IDs/settings. |
| Character and motion | Retain the chosen B1 character without making everything flat or adding effects everywhere. Check actual movement/reduced motion only when affected. |

These prompts adapt the research facets into inspectable details; they are not a new scored questionnaire or a requirement to change every category.

## Keep the cost proportional

- Local polish: changed region plus adjacent controls and relevant X states. Reuse unaffected evidence. For this project use980 layout/phone980×2306 as relevant;390 is narrow stress, never the default phone. Select light/dark where theme/material/type roles change; one unchanged dimension does not require another matrix.
- Shared token/style: inspect its downstream surfaces and a representative open popup; do not hide spillover behind a3–5-anchor budget. Whole-UI completion still follows all applicable children in UI_REVIEW_CHECKLIST.md.
- Documentation/method change: check links/routing and try the rule on existing evidence. No userscript rebuild, full144 runtime suite, actual extension reinstall, repeated negative-control suite or fresh live capture merely because the guide changed. Existing impact routing still governs an actual runtime change.
- Keep only the target, important difference dispositions and final affected images/results. No permanent full-DOM/style database, numeric beauty score, arbitrary pixel-perfect threshold or additional approval ritual. Reserve user questions for real preference changes or tradeoffs that available evidence cannot resolve.

## B1 retrospective transfer check — 2026-10-23

Applied to the existing980×900 light/dark B1 preview versus exact8606114F public captures, all directly inspected. Reference Chromium149 and public Chrome155/content differ; this is a retrospective design review, not a new live run or zero-pixel oracle. The exact evidence paths/hashes are in `verification/receipts/2026-10-23-ui-detail-review-method.json`.

| Observed anchor | Disposition and next action |
| --- | --- |
| Preview search is a quiet inset field with a thin outline magnifier; native result has a solid teal action segment and a heavier large magnifier. | NEEDS_WORK. Match secondary-control emphasis and icon proportions in the shell presenter while preserving the original search button/form. Functional PASS does not settle this. |
| Preview toolbar separates tabs/categories with a subtle divider and has compact spacing and fine rim/depth; current grouping spreads a few category labels across the middle and reads as a plainer control strip. | NEEDS_WORK. Refine grouping, spacing and surface finish together in the list presenter; keep category overflow/reachability and control hit areas. Matching row count alone is insufficient. |
| Preview light ordinary titles are lighter than its notice, with restrained metadata/lines; native rows appear more uniformly emphatic and separators stronger. | NEEDS_WORK. Compare equivalent ordinary/notice states in the same font/theme and refine type/line hierarchy. Do not mistake different words/content or the deliberately combined metadata column for proof of a font defect. |
| Both designs retain an opaque reading surface rather than making the post rows translucent glass. | MATCHED for that material role only, in the inspected light/dark images and current presenter declarations. This does not approve every color, border or shadow value. |
| Native has additional service links, original branding and a combined author/statistics column; mock has fewer links and table headings/simulator controls. | INTENTIONAL for those declared structural/content differences. This does not waive icon, type, spacing or material fidelity inside the retained structure. |
| The selected whole-masthead animation is not demonstrated in these still images; only original toolbar motion was implemented/verified previously. | UNKNOWN for full-masthead motion and explicitly deferred. Do not mark it MATCHED or add a fresh motion suite for this documentation task. |

The method retained actionable detail gaps despite prior144 functional passes, did not reject legitimate native extra content, and did not approve unseen motion. This is a bounded transfer example, not independent evidence that the method will catch every issue or make the result beautiful. No production UI changed here. Next bounded work: the first three detail anchors as one related B1 polish batch, then affected-state recapture/review.
