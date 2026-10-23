# Design-detail review and refinement

Use for an appearance change or a fidelity complaint, through UI_VISUAL_REVIEW.md. The chosen design remains B compact/B1; this method does not select another style. Functional correctness, reference fidelity, and user aesthetic preference are separate conclusions. A working arrangement is not a finished design.

User-selected external implementation aid: **Impeccable4.7.0 `polish`**, installed unmodified user-wide at pinned upstream commit; see B1_IMPECCABLE_POLISH.md for original context/manual-detector use, actual first batch and remaining fine color/material differences. Invoke its own installed skill when using it; do not substitute this reduced comparison loop for its required setup/verification. The trial is not a measured efficiency win or whole-B1 approval.

## External basis and limits — checked 2026-10-23

| Primary source | Take into DCUF | Limit / do not import |
| --- | --- | --- |
| [Moshagen & Thielsch, 2010, Facets of visual aesthetics](https://www.uni-muenster.de/OWMS/uploads/drafts_thielsch/pdf/moshagen_2010.pdf), DOI10.1016/j.ijhcs.2010.05.006, author-hosted manuscript | Seven studies support distinguishable simplicity, diversity, colorfulness and craftsmanship facets. Use them as prompts for order, character, color harmony and coherent finish. | This is perceived-aesthetics measurement, not a CSS recipe or a current-trend standard. The authors identify sampling/cultural limits and abstract items that may not guide concrete changes. Our adaptation is qualitative, not a validated VisAWI score; no mandatory18-item survey, sample recruitment or statistical cutoff. |
| [GitLab Product Design MR reviews](https://handbook.gitlab.com/handbook/upstream-studios/product-design/workflow/mr-reviews/) | A real product-team procedure: inspect the running implementation, compare actual/expected images, make feedback actionable, and distinguish outstanding/non-mandatory work. | Published operational practice, not experimental proof of effectiveness here or a universal industry standard. No mandatory staff, approval hierarchy, PR, meeting or account integration. |
| [Chromatic UI Review](https://www.chromatic.com/docs/review/) | Intentional visual changes need review and specific follow-up as well as regression tests. Reuse the existing Playwright side-by-side/diff viewer. | Vendor workflow documentation, not an independent beauty benchmark. No Chromatic/Storybook subscription, dependency, cloud upload or second comparison engine. |

The exact workflow and scope defaults below are our adaptation, not rules experimentally validated by those sources. The selected B1 reference and native contracts supply the concrete target. The review-only preflight below found no added detection from the original structured version, so the default is now reduced. End-to-end refinement efficiency remains untested.

## One short loop per coherent change

1. **Reuse the target and compare.** State the intended appearance in one sentence using the existing brief and affected checklist IDs. Inspect an aligned whole view and readable, equal-scale affected details. Match viewport/theme/state/fonts/content where feasible; declare differences that affect interpretation. No mandatory3–5-anchor inventory, category walkthrough or second brief. Never mask the detail under review or use pixel percentage as beauty.
2. **Record actionable differences briefly.** Use expected → actual → fix bullets for material gaps. Explain intentional native/content differences or unknown evidence only when relevant; no table or MATCHED paragraph for every item. “Mock,” “native DOM” and functional PASS alone do not waive feasible detail gaps. Do not invent prototype-only controls. Use the optional prompts below when a mismatch is hard to locate or important finish remains unresolved.
3. **Refine through the existing owner.** Change related presentation declarations/tokens together; preserve original controls, events, palette semantics and UI/function boundaries. Fix a shared cause in its owner rather than layering unrelated overrides. Use reference measurements as evidence, not universal pixel laws. Keep reading content opaque and effects subordinate to reading.
4. **Retake the affected result and compare again.** Reuse the existing comparator and inspect reference/before/after whole and detail views. Reopen an unchanged image only for a concrete uncertainty. Exercise changed input/open/motion states and run existing impact-routed functional checks. Unresolved important gaps keep fidelity incomplete; scoped success does not approve other surfaces or user taste. No automatic golden update or endless cosmetic loop: fix an actionable gap, or state the missing decision/evidence.

## Detail prompts — select what changed

### Reference-first verdict, before implementation credit

For a fidelity complaint, look at the selected reference and the current render **before** considering the patch explanation, effect names or functional test counts. Ask whether the result is closer to the selected appearance, not whether it has more gradients/rims/shadows than the previous implementation. Compare the complete component and a readable equal-scale detail together. Record only the important observed gaps and their next action; no fixed count, beauty score or per-property survey.

Attach that short judgement to the existing image-pair manifest as `assessment` (format in UI_VISUAL_REVIEW.md). The comparator records `NOT_REVIEWED` when absent, derives `NEEDS_WORK` from any `FIX`, and retains `UNVERIFIED` for unknown evidence. It rejects missing cases and stale reference/candidate hashes. `REVIEWED` describes the supplied judgement only; it is never product/user approval. Review again only after relevant inputs change or a concrete uncertainty remains. This small backstop prevents omitted/stale/unresolved review from disappearing in the output; it cannot verify the truth or completeness of AI perception.

Applied to the actual button: AF6 flatness and96B933A1's narrower/taller body, thin pencil and concentrated rim/darker material remain `NEEDS_WORK` against the selected B1 preview in both themes. Retaining a40px hit target does not require the same painted proportion. Native content/count differences are intentional, not waivers for feasible material detail. `verification/receipts/2026-10-23-b1-reference-verdict.json` binds the known-case trial. It is retrospective, by the same implementing agent, not a blind detection/efficiency experiment. No product repaint, new engine, recurring multi-reviewer critique or full runtime suite is part of this method correction.

### Coherent-component closure after a detail change

Review the complete affected component at readable scale, including adjacent groups; a crop that cuts off categories or the primary action does not satisfy the whole/detail step. Even a color-only patch needs a brief check of that component's grouping/baselines, hierarchy and material in context. This is a missing part of the existing loop, not another survey or full-UI audit.

Use geometry for objective relationships and visual comparison for perception. Blur/alpha/token equality and sampled RGB values cannot approve glass: compare the complete backing, glaze/rim and shadow, including the dark counterpart. Record concrete unresolved differences; do not invent a universal texture/beauty score. Functional PASS, visual NEEDS_WORK and manual-review-required stay separate. No numerical pass automatically closes appearance.

The concrete miss/backstop is B1_VISUAL_REVIEW_GAP.md. The routed B1 runner now rejects observed category-label drift and always leaves final reference review explicit; the transfer test admits the selected reference and rejects shifted negatives. Header-glass quality is separately open. Reuse unchanged evidence and run only affected checks for later corrections.

| Area | Concrete comparison |
| --- | --- |
| Type and hierarchy | Loaded font/fallback, size, weight, line height, tracking; title/author/stats emphasis and reading density. Compare equivalent row types. |
| Spacing and proportion | Shared edges, baselines, internal vs external padding, control height/width, gaps and grouping; whole-page rhythm as well as individual controls. |
| Icons and controls | One coherent weight/scale, optical centering, label relationship, selected/secondary/primary roles, hover/focus/open states. Preserve hit targets. |
| Color and material | Neutral/accent balance, border strength, opaque reading surface vs glass chrome, rim/shadow/depth and dark counterparts. Preserve all palette IDs/settings. |
| Character and motion | Retain the chosen B1 character without making everything flat or adding effects everywhere. Check actual movement/reduced motion only when affected. |

These are optional diagnostic prompts, not a scored questionnaire or mandatory per-change checklist. Research is retrieved for a new consequential method question, not reread for routine polish.

## Keep the cost proportional

- Local polish: changed region plus adjacent controls and relevant X states. Reuse unaffected evidence. For this project use980 layout/phone980×2306 as relevant;390 is narrow stress, never the default phone. Select light/dark where theme/material/type roles change; one unchanged dimension does not require another matrix.
- Shared token/style: inspect downstream surfaces and a representative open popup. Whole-UI completion still follows all applicable children in UI_REVIEW_CHECKLIST.md.
- Documentation/method change: check links/routing and try the rule on existing evidence. No userscript rebuild, full144 runtime suite, actual extension reinstall, repeated negative-control suite or fresh live capture merely because the guide changed. Existing impact routing still governs an actual runtime change.
- Keep only the target, important difference dispositions and final affected images/results. No permanent full-DOM/style database, numeric beauty score, arbitrary pixel-perfect threshold or additional approval ritual. Reserve user questions for real preference changes or tradeoffs that available evidence cannot resolve.
- Do not repeat the two-reviewer experiment for normal changes. The preflight does not establish a benefit from extra reviewers, repeated full-image viewing or elaborate recording.

## Review-only efficiency preflight — 2026-10-23

Two fresh-context reviewers received identical frozen980×900 light images: search, toolbar and unchanged rows; two regions contained four predeclared difference families, and a30/50 content difference was explicitly allowed. A used careful simple comparison; B used this guide's original anchor/disposition workflow. Neither saw the hidden CSS oracle or sibling result. Preparation used the existing isolated preview; product source/runtime stayed unchanged.

| Observed result | A: simple comparison | B: original structured workflow |
| --- | --- | --- |
| Review including packet reading/planning/recording |28sec |70sec |
| Predeclared difference families found |4/4 |4/4 |
| Unsupported findings / control or allowed-content false alarms |0 |0 |
| Actionable component/property/direction |All four families |All four families |
| Image inspections / reopens |12 /0 |16 /4 |
| Reported top-level / nested tool calls |5 /15 |10 /19 |

Both found the selected-tab border change but neither explicitly identified the removed subtle shadow within that family. Family4/4 is not complete property-level detection. No additional actionable finding justified B's observed42sec overhead in this trial. Shared preparation cost148.121sec; orchestration/grading/recording adds further one-time cost, recorded separately in the receipt. Initial repository-entry time and token cost were not measured.

Decision: remove mandatory anchor counts, per-item tables/MATCHED prose and automatic full-view reopens. Retain simple whole/detail comparison and short actionable findings; existing owner, recapture and functional obligations continue. This is a conservative cost reduction, not proof that the reduced workflow is more effective. One reviewer per arm, same model family, seeded fixed light images and nonblind root grading prevent generalizing the timing or claiming statistical superiority. Actual fixes, retakes, rework savings, live behavior and aesthetic preference were not tested. Next: use the reduced loop for the already-declared first B1 polish batch and observe actual refinement/recheck cost; no larger experiment is required now.

Exact frozen protocol/material/result hashes and grading: `verification/receipts/2026-10-23-ui-detail-review-preflight.json`. The earlier method receipt remains historical and is not an efficiency result.

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

The method retained actionable detail gaps despite prior144 functional passes, did not reject legitimate native extra content, and did not approve unseen motion. This is a historical bounded transfer example, not independent evidence that the method catches every issue or makes the result beautiful. The later first actual polish is recorded in B1_IMPECCABLE_POLISH.md; its fine color/material gap remains open.
