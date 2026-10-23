# Visual comparison and the B1 inspection gap

Current90EEEBFF review gap: B1_VISUAL_REVIEW_GAP.md owns the user-reported unfinished toolbar and header glass, why existing checks/manual crops missed them, and the validated bounded backstop. Functional checks do not close this candidate's appearance. CURRENT/NEXT own its exact receipt and repair task; older8606114F/079ED46D results below remain historical scopes.

Current repair: [B1_VISUAL_REPAIR.md](B1_VISUAL_REPAIR.md) and its exact8606114F receipt supersede the defective945C3DE7 result for the diagnosed batch. The findings below remain diagnosis history and method guidance, not current unresolved defects. Use `verification/visual/b1-repaired-native-list.json` for the repaired public design comparison; retain the original manifest as historical evidence.

For design adoption/polish as well as defect complaints, follow [UI_DESIGN_DETAIL_REVIEW.md](UI_DESIGN_DETAIL_REVIEW.md): explicit detail anchors, whole/component comparison, actionable difference dispositions, same-owner refinement and affected-state recheck. This is the existing UI-maintainer skill's visual-review route, not an optional skill installation. A visual handoff must distinguish behavior, reference-detail fidelity and user preference; native/prototype differences cannot waive feasible polish.

## Historical finding — 2026-10-23

The native945C3DE7 B1 trial is visually **not accepted**. Prior function/geometry/extension-startup results retain their own scope; they did not establish visual fidelity. No product runtime changed during this investigation.

The local10063 server was stopped on resume. After restoring it, all five gallery images decoded with their declared980×900,390×900 or980×2306 dimensions. This observation does not reconstruct the user's earlier loading state. The gallery scaled980px images to about364px and had no aligned reference. Its handler also sent HTTP200/image/png before reading a file, so a missing allowed file could return text as a false-success image response. Do not reuse that ignored server as a validation route.

Compared six stored preview/native pairs: list light/dark, measured phone layout,390 stress and recent-open light/dark. All produce pixel differences; these are **design comparisons**, not six proven product regressions. Reference Chromium149 and candidate Chrome155, different galleries/content, and intentionally preserved native structures preclude a strict pixel oracle. The native Playwright report exposes expected/current/diff/slider; inspect actual controls and composition, not its percentage as a beauty score.

| Finding visible in the actual capture | Cause/evidence and repair criterion |
| --- | --- |
| Header navigation remains below the search/logo row; gallery header retains a large empty band and full-width teal divider. | Current shell explicitly puts GNB in row2; the trial did not port the preview's full composition. Native extra links are legitimate content, but the layout needs an explicit compact policy that preserves their reachability. Review header/search/recent/tools together. |
| Dark inactive list tabs have solid grey backgrounds instead of the same quiet material as light tabs. | Fresh Chrome155 probe: normal native `.darkmode .array_tab button` supplies `background:#666;color:#eee`, defeating the current normal presenter selector. B1 fixture omits this host cascade. Repair in the existing tab owner, retain native action and current-state distinction. |
| Recent trigger shows both the native square sprite arrow and the added chevron. | Fresh probe: `.visit_bookmark .newvisit_history .btn_open .icon_listmore` defeats the presenter's normal direct-em hide; actual sprite remains15×15 with a loaded background image. B1 fixture omits this host cascade. One visible indicator must survive open/closed and themes. |
| Native dark-mode promotion overlaps the utility controls; its right side is clipped at390. | Actual host inline top/left and visible native content are absent from the B1 fixture; its related dark-toggle fixture starts the tip hidden. Page scrollWidth alone can stay bounded while a descendant is clipped. Preserve dismissal/action and verify visible bounds/hits. |
| Toolbar is two rows at980 and much taller at390; preview uses a compact arrangement. | Fresh probe measures110px at980 and258px at390. Native category clusters and presenter wrapping differ from the mock. Positive height/blur/no-overflow checks permit this result. Specify allowed grouping/row count and long-category overflow behavior before calling fidelity complete. |
| Native recent menu retains original blue tab/divider and large empty area. | Trial styles the popup shell and preserves original interiors, while the mock simulates a different menu. This is an unimplemented design adaptation, not an image loading problem; preserve original tab/delete/navigation semantics when designing its material. |
| List information is a combined small two-line right column; preview has table columns and headings. | Native list presenter explicitly makes metadata absolute and stacked; preview's original table structure was not adopted. Pick a readable data hierarchy within the existing list owner; do not manufacture parity by hiding metadata. |

Current repair batch: H-01–H-04, L-01/L-02/L-05–L-09 and related X states. Use the adopted980 phone layout plus wide light/dark,390 stress and relevant open menus. Article/comment/write/dialog redesign remains later. This diagnostic table is not a product-fix receipt. Local `artifacts/ui-visual-review-2026-10-23/live-probe.json` records the fresh read-only CSS observations; its narrow tip was already hidden after native dark-mode use, so the visible390 clipping observation remains from the stored capture, not a fresh positive tip measurement.

## Reuse the established engine

Selected: the already installed Playwright Test1.61.1 PNG decoder, pixelmatch matcher, failure attachments and native HTML comparison report. `tools/visual-review.mjs` only validates/copies selected local input pairs and invokes that runner; it neither implements image scoring nor adds a dependency. `testbed/visual/` holds its small config/spec.

```powershell
node tools/visual-review.mjs --help
node tools/visual-review.mjs --manifest verification/visual/b1-native-list.json --output artifacts/<new-review-directory>
node testbed/node_modules/playwright/cli.js show-report artifacts/<new-review-directory>/report --host 127.0.0.1 --port 10064
```

Exit0 means pixel match,1 means differences requiring review,2 means invalid input/runner failure. Every receipt keeps `productApproved:false`. Output must be a new empty artifacts directory; originals stay intact and snapshot updates are disabled. Inputs bind SHA/dimensions/theme/provenance. The B1 manifest is a recoverable local-capture locator, not a golden approval or a live-site claim.

For a future **regression** golden, first repair and visually review an actual native state, capture a deterministic live-shaped fixture in the same browser/OS/font/DPR/viewport/theme/open state, then retain that reviewed baseline. Use Playwright's `toHaveScreenshot` directly for stable browser capture (two matching frames, disabled animations/caret); this offline pair tool does not implement readiness or prove motion. Wait for the actual owner, fonts and needed visible media to load, not whole-site networkidle. Preserve native timing tests separately.

For a **design comparison**, keep both source kinds explicit. Align viewport/theme/open/scroll state and display scale. Text/content differences and browser differences remain visible or explicitly declared; never mask the component being changed, its popup, clipping, icon duplication or failed assets. A screenshot pass cannot establish function or aesthetics.

Before a visual handoff, open the delivered report/viewer and confirm visible images decode with nonzero natural dimensions and correct aspect ratio. Inspect the full affected composition and each relevant open state, then record defect/intended difference/unverified for concrete findings. A route/file problem is separate from a rendered-UI problem. A missing reference or an unreviewed current image cannot become an automatic baseline.

## Why this adaptation retains the useful mechanism

- The complete native matcher and HTML expected/actual/diff/slider workflow remain intact; only server/capture orchestration stays with existing DCUF infrastructure. No Python/React/Docker/cloud rewrite or duplicated pixel engine.
- Local transfer test `node testbed/test-visual-review.mjs`: an unchanged rendered image passes; an intentionally shifted control fails; absent reference, wrong viewport and identical truncated PNGs are rejected; failed comparison cannot update the reference. The official decoder rejected corrupt bytes; the wrapper now separates that error from a normal pixel difference by requiring the native diff attachment. This proves those mechanisms, not autonomous aesthetic judgement. Header-focused/acceptance routing includes this bounded transfer test.
- Existing `dcuf-ui-surface-maintainer` routes here; its task-specific ownership/native/palette constraints remain necessary. The later user-selected Impeccable polish aid is recorded in B1_IMPECCABLE_POLISH.md. It adds design guidance and its original detector without replacing this comparison engine or granting product approval.
- Rejected as the solution: Anthropic's public `webapp-testing` skill alone. It provides Python Playwright reconnaissance, screenshots/logs and server lifecycle, but no visual baseline/diff/approval gate; copying it would leave this incident's missing comparison unresolved. Its blanket networkidle wait also does not fit an ad-heavy host. No claim that the skill itself is defective.
- BackstopJS offers established reference/test/diff review, but adds a second stack and its current upstream README seeks a maintainer. Its baseline review principle agrees with the selected engine; installing it offers no current advantage here.

Primary sources checked2026-10-23: [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots), [Page screenshot assertions](https://playwright.dev/docs/api/class-pageassertions#page-assertions-to-have-screenshot-1), [BackstopJS upstream](https://github.com/garris/BackstopJS), [Anthropic webapp-testing source](https://github.com/anthropics/skills/blob/main/skills/webapp-testing/SKILL.md). Official publication supports provenance, not a measured guarantee that a skill improves DCUF; the local negative controls establish the bounded transfer claim.
