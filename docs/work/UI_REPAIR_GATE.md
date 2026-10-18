# Confirmed UI defects: repair before advancing

Status: `REPAIRED_VERIFIED_SCOPED` — all15 original findings have current integrated repair evidence in `UI_ALL_REPAIRS.md`. Updated 2026-10-18. This is not full-header or whole-product admission.

The user requires reliable repair and verification before further stage completion. This gate is a corrective prerequisite of `MOBILE_UI_MODERNIZATION.md`; it does not replace the existing header separation, behavior, architecture, or release gates. Diagnosis is in `UI_BREAKAGE_CAUSE_AUDIT.md`. Unified Concept01 is selected for a later practical UI-change trial; both the remaining separation and all15 defect repairs must be verified before that trial starts. Selection cannot substitute for repairing these defects.

## Order and scope

The latest user instruction supersedes the previous one-row cadence: finish every remaining defect as one sustained batch and renew UI-01 against the same settled runtime. `UI_ALL_REPAIRS.md` records the list, article, comment and shared-dialog owner changes and integrated verification. Do not combine these repairs with a new skin, new framework, ownership redesign, settings migration, version bump, or publication.

| Unit | Finding IDs | Authority to inspect before editing | Focused existing validation |
| --- | --- | --- | --- |
| 1. List/search/paging; start with UI-01 | UI-01–UI-07 | `src/targets/mobile/list-presenter.js`, `list-host-adapter.js`, `ui-module.js`, `post-main-fixes.js`; follow the actual rendering path for the badge | `testbed/run-list-differential.mjs`, `run-host-compatibility.mjs`, affected `run-tests.mjs` cases |
| 2. Shared dialog geometry | UI-13–UI-14 | `src/targets/shared/filter-ui-style.js`, `settings-presenter.js`, `personal-block-host-adapter.js`, `popup-geometry-host-adapter.js`; query `settings-palette` ownership | `testbed/capture-settings-surfaces.mjs`, `run-palette-differential.mjs`, affected mobile/PC settings cases |
| 3. Article/recommendation | UI-08–UI-11 | `src/targets/mobile/article-presenter.js`, `article-host-adapter.js`, `ui-module.js`, `post-main-fixes.js`, `theme-host-style.js`; inspect host dark CSS and remaining filter-module rules | `testbed/run-article-differential.mjs`, `run-host-compatibility.mjs`, affected `run-tests.mjs` cases |
| 4. Comments/replies | UI-12 | `src/targets/mobile/comment-presenter.js`, `comment-host-adapter.js`, `filter-module.js`; retain original fields and handlers | `testbed/run-comment-differential.mjs`, affected compatibility/composer cases |
| 5. Headtext input | UI-15 | `src/targets/shared/filter-ui-style.js`, `settings-presenter.js`, `filter-settings-host-adapter.js` | Affected mobile/PC settings and headtext cases |

These are retrieval paths, not a claim that every named file must change. Resolve the live architecture owner and impact route before each unit. Update `docs/ui-surface-contracts.md` with the actual live-shaped failure and acceptance condition before a broad UI repair. Preserve one final visual owner and remove or narrow the competing rule; do not append global overrides.

## Closure checklist

Each row must acquire a reproducible failure before repair and a positive result afterwards. Temporary diagnostic CSS experiments and screenshots alone cannot close a row. The exact authored values, native parent/sibling topology, image children, and host specificity must be represented where they caused the failure.

| ID | Status | Required positive check after repair |
| --- | --- | --- |
| UI-01 | REPAIRED_VERIFIED_SCOPED (`UI_ALL_REPAIRS.md`) | At the confirmed 980 CSS-pixel layout, toolbar tabs have usable widths, stay inside their parent, and do not overlap category, count, or write controls. Exercise narrow stress and native open/closed controls separately. |
| UI-02 | REPAIRED_VERIFIED_SCOPED | Representative short and long authors occupy usable space; host `max-width:70%` no longer collapses short names to an ellipsis. Preserve memo/identity hit targets. |
| UI-03 | REPAIRED_VERIFIED_SCOPED | Native author badges and gallery images survive the actual descriptor/renderer path as visible images with the expected source and dimensions. Preserve the existing attribute/trust boundary. |
| UI-04 | REPAIRED_VERIFIED_SCOPED | The original search-type SELECT and its options remain visible, focusable, and operable inside the real nested `.select_box.bottom_array` structure. A sibling-only fixture is insufficient. |
| UI-05 | REPAIRED_VERIFIED_SCOPED | Search input and submit control stay inside their container; the visible icon or label identifies the action. Original query/type and submit behavior remain intact in a controlled fixture. |
| UI-06 | REPAIRED_VERIFIED_SCOPED | The leading page is reachable at initial scroll position, and both ends remain reachable for a long page range. Positive bounds and actual pointer hit testing replace an overflow-only assertion. |
| UI-07 | REPAIRED_VERIFIED_SCOPED | Bottom write action has a readable single-line label and usable pointer/keyboard target without stealing search/paging space. |
| UI-08 | REPAIRED_VERIFIED_SCOPED | Article author/date/count/comment metadata forms readable adjacent groups at wide and narrow layouts, without inherited comment-box geometry. |
| UI-09 | REPAIRED_VERIFIED_SCOPED | Scrap has a visible label/icon, positive usable bounds, and its original handler; test light/dark and native sprite/font specificity. |
| UI-10 | REPAIRED_VERIFIED_SCOPED | A known-color image/media control keeps its colors in dark mode; the ancestor `.write_div` no longer inverts it. Verify readable article text and surrounding host content, then light/dark round trips. Child-only `filter:none` is insufficient. |
| UI-11 | REPAIRED_VERIFIED_SCOPED | Recommendation icons have one intended visual, and the action bar contains all actions after wrapping; native sprites and fixed height cannot reappear. |
| UI-12 | REPAIRED_VERIFIED_SCOPED | Comment identity fields, textarea, and submit action use the intended layout and theme under the actual filter-module/host cascade. Preserve input, reply/cancel, focus, and native events. |
| UI-13 | REPAIRED_VERIFIED_SCOPED | Management, backup, manual-block, size, and shortcut backdrops cover the full visible viewport; outside-panel points hit the backdrop, not underlying page controls. Test tall and short windows plus close/reopen. |
| UI-14 | REPAIRED_VERIFIED_SCOPED | Each of those five panels follows its own intended width and viewport cap while its backdrop remains full-size. Test surface/role specificity and overflow independently. |
| UI-15 | REPAIRED_VERIFIED_SCOPED | Headtext manual input and Add share a usable row; Add remains single-line, visible and reachable. Long input must not collapse the action. |

The original15 reproductions are repaired on FD58 mobile/C14D PC with guarded suites, positive contracts, semantic comparisons, vision review and actual-extension checks. The former right-mount/carousel/current-palette blockers are adjudicated in `HEADER_CASCADE_FINALIZATION.md`; the remaining early reset/native applicability and mixed separation criteria still block overall header completion and the Concept01 trial. Narrow390 header/comment-header stress composition is not a normal-phone or whole-UI visual PASS.

## Evidence and advance condition

1. Recheck source/artifact hashes, effective ownership, route, and live observation. Freeze the exact published stable control and candidate in separate fresh contexts with isolated settings. Keep the original diagnosis and any contrary evidence.
2. Reproduce the relevant live structure in the existing fixture/harness, observe the failure, implement the smallest owner-scoped correction, then rerun the failed case and affected normal/failure/boundary cases. Select negative controls that would detect the original bug returning.
3. For each row, record artifact SHA, fixture/harness identity, route/theme/viewport, positive geometry/adjacency/visibility/media or hit/focus results, before/after screenshots, native semantic result, and remaining limits. Rebuild affected artifacts at the existing versions and renew dependent evidence; shared source changes require both targets and PC checks.
4. Compare light/dark for list, article, composer, write/edit/delete, owned dialogs and native menus. Cover confirmed 980-wide composition, 390/412 narrow stress, and relevant short/tall windows. Record CSS viewport, screen, DPR, touch mode and `visualViewport.scale`; a wide proxy at scale 1 does not establish the user's actual Lemur scale. Unchanged write/native-form surfaces still receive composition and native-event regression checks.
5. Run the impact-routed checks for each unit, then the complete applicable deterministic suite once on the settled final runtime. Renew selected public read-only native/visual paths through the working installed-Chrome/Tampermonkey route in `docs/live-site-canary.md`, using those same final bytes. No posting, recommendation vote, deletion or ordinary-profile modification is authorized. Keep unavailable authenticated/device states explicitly UNKNOWN.
6. **Do not advance:** all 15 rows must have current repair evidence; no applicable FAIL, unexplained omission or mandatory UNKNOWN can be treated as closed. Recheck the whole composition with vision as well as metrics. Then evaluate the existing header/mixed/palette and final functional gates separately. This repair gate grants no header admission, beta, release, or architecture promotion by itself.

After this gate and the remaining separation close, use selected Concept01 from `UI_DESIGN_REFERENCES.md` in the existing `UI_REPLACEABILITY_VALIDATION.md` experiment: implement the unified list/article/write/dialog design, measure the actual files/layers and coupled changes, compare the coherent before/after set, and verify behavior plus replacement/restoration. Preserve native behavior, the14 stored palette IDs, and mobile/PC boundaries. A source, fixture, harness, oracle, or route change invalidates only dependent evidence; repeat the final suite when the settled runtime changes.
