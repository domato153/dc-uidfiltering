# Live UI regression repair

2026-10-21. Reported-defect repair complete before `header-replaceability-pilot`; source base `35a07563e37003e26b72fec784a1f721884a04f2`. Frozen pre-repair draft478A and published stable32BA remain separate controls. The batch artifact is mobile3.5.5/1677; pagination-only follow-up08BC is recorded at the end. PC C14D is unchanged. Exact identities, observations and limits: `verification/receipts/2026-10-21-ui-live-regression-repair.json`. This scoped closeout is not full header admission or whole-UI approval.

Goal: Repair the user's list/category/search/comment/action findings at their causes, preserving native functionality and UI replacement boundaries. No new design system, feature, setting/storage migration, observer, scheduler, version or publication.

## Observed causes and bounded changes

| Finding | Cause / chosen owner |
| --- | --- |
| Selected overall/concept/notice tab ignores palette; mini write text stays purple | Native contextual selectors beat the list presenter's state/color selectors. Resolve within semantic list-control CSS; no global specificity patch. |
| Doubled write pencil; broken page sprites; uncentered search glyph | Existing sprite backgrounds/dimensions survive new pseudo content and enlarged controls. The list presenter supplies one decoration with explicit geometry. |
| Footer write stops near the middle | Native clearfix pseudo-element becomes another flex item. List actions reset only their own legacy layout and align the end group. |
| Category arrow escapes; overflow options overlap | Generic toolbar-action marking styles every native popup link as a full-size tab while fixed native menu geometry remains. Adapter distinguishes native category toggle/popup/option roles; presenter owns their layout. |
| Subject description overlaps each title | Sanitized row projection retains the native hidden subject child without its inline hiding. Preserve its description for the existing tooltip and keep it out of visible row layout. |
| Native paging padding/search width survive; final search is covered by the floating menu | Native contextual padding and an optional query wrapper retain their old layout. Semantic navigation/query rules own the row; pure presentation reserves end scroll clearance for the existing menu through its maximum160% size. No setting read or new observer is added. |
| Rounded credentials overlap square frames | Native credential wrappers keep fixed height/border around the newly styled input. Mark the wrapper separately; retain its native popup/clear controls. |
| Register-plus-recommend wraps; auxiliary controls become primary buttons | Every composer button is marked as submit. Classify submit group and editor tools separately; preserve unowned native auxiliary controls and natural single-line action dimensions. |
| Article bottom actions cluster / owner can alternate | Native float groups lack flex alignment; an embedded list may claim the article action bar. Keep the article presenter/adapter as its exclusive owner. |
| Recent row decoration is visually heavy | Convenience adapter injects a strong outline/full-row tint. Move this decoration into the existing list presenter and use restrained state styling; preserve session/highlight behavior. |
| Inner top rules in normal comments/first replies and duplicated overlapping reply marker | Native `.cmt_info`, `.reply_list li` and text/media pseudo-elements still contribute decoration; legacy nickname padding also competes. The comment presenter removes internal first rules/native markers, keeps sibling separators and one marker in the author gutter. Legacy rules exclude semantic comment owners. |

## Implementation and validation

- [x] Existing Testbed gains live-shaped specificity, wrappers, pseudo-elements and popup branches. Frozen478A fails147 of175 original positive checks; final1677 passes203 checks across14 selected states. Original control identities, click/focus and topology remain checked.
- [x] Existing adapters classify native nodes; existing presenters own visuals. Category directions/descriptions use semantic projections. Recent decoration moves to the list presenter; article actions stay exclusively under the article owner. Candidate overlay remains honest; accepted registry and six mixed criteria are unchanged.
- [x] Final1677 mobile144/144, host11/11 and PC functional15/15 pass. Published-control list/article/comments/native-form differentials have zero semantic failures. PC palette comparison passes; PC artifact stays C14D. Current architecture/UI boundaries and repository checks pass within their recorded runs.
- [x] Public GET comparison uses stable32BA and final1677 in separate Chrome contexts on the same frozen document: mini1660, wutheringwaves980 and current comic article1660.12 pairs/24 captures; same-host controlled light/dark comments/recent states add20 pairs/40 captures. A16-pair review gallery selects actual public list/composer and controlled comment/recent images. Representative vision review confirms the reported composition changes; this is not approval of every image or all128 states.
- [x] Actual installed Chrome155.0.8059.85 / official pinned Tampermonkey5.5.0: published control4/4 and final candidate4/4 startup routes pass. Independent replay and owned temporary-profile cleanup pass. This four-route startup scope is separate from the GM-shim screenshot/functional comparisons, mini-specific extension interactions and actual-phone evidence.
- [x] Final diff, artifact/body identity and metadata reviewed. Separate `Draft_Test` installer changes only name/namespace, preserving the prior test identity and original release installation. Development checkpoint uses the standing exact-path workflow; its eventual commit/remote/CI disposition is reported separately.

## Retained contrary evidence and next work

The generic palette differential remains raw FAIL: only settled-resource snapshots5/12/18 differ (listeners188→170; four header subscribers added by the earlier owner split). Both sides settle to zero timers/frames/intervals/pending work/errors with five observers. No new functional/storage/resource difference was observed in this repair. Historical478A qualification does not qualify1677; formal mixed/header/full-stage admission remains UNKNOWN. Never rewrite the raw result to PASS.

Coverage is deliberately split. The final144-test mobile pass and other command passes are retained from the exact1677 run; no terminal result was captured for its last Windows repository command, so the overall runner receipt remains in-progress. Earlier stale local impact inputs, the pre-repair boundary failure, short-deadline boot sampling and header readiness/scroll sampling failures remain diagnostic history. The current header contract passes standalone and in the later Windows profile; corrected-input proof-core and proof-runtime runs pass independently. Final exact-tree checkpoint validation checks the documentation closeout without repeating unchanged product suites.

Next is only `header-replaceability-pilot`, using frozen1677 as the repaired trial control. Original478A is historical. Concept01 implementation, actual-phone/authenticated/content-write paths, all128 child states and formal visual promotion remain separate. No new release, version or publication is implied.

The first public article probe selected an archived comic gallery and did not expose a composer. The user's current `comic_new6` article does expose it through ordinary GET navigation with all POST blocked. This resolves access for this investigation; do not revive an alleged POST/approval prerequisite. An attempted POST allowance was rejected by automatic review and was removed before further execution.

Local diagnostic evidence: `artifacts/ui-user-report-2026-10-21/`; these captures/DOM/CSS traces are ignored and never staged. The previous15-finding checks did not cover the newly observed native specificity, wrapper, auxiliary-button and overflow-popup branches; their historical scoped passes remain historical, not proof of these branches.

## Pagination centering follow-up — 2026-10-21

The user requested only centering the page-number group. One existing presenter declaration now uses `justify-content: safe center`: fitting groups center, while narrow overflow stays start-aligned and scrollable. Exact08BC evidence: `verification/receipts/2026-10-21-pagination-center.json`. Existing list coverage passes266 checks in14 light/dark/width/route states, including both ends and fitting-group center geometry; the public1660 capture has zero center error and was visually reviewed. No function/adapter/storage change. Broad1677 checks and actual-extension evidence retain their historical identity; they were not repeated or relabeled for this small visual delta. The next pilot freezes08BC.

## Outer comment frame and main-work transition — 2026-10-21

The subsequent request removes only the frame surrounding the full comment list. The existing comment-box presenter changes one border declaration to0; the official native `.comment_box` blue top-border rule is modeled in the focused test.12 route/theme/width contexts pass with main/reply/image composer inputs, individual card borders and keyboard focus retained. The source is9889; sampled public GETs did not expose a comment container in this run, so the reviewed frame capture is explicitly local/live-shaped, not an actual visible-public-comment claim.

The user also authorized moving to the next main step once corrected. HEADER_REPLACEABILITY_PILOT.md closes the four planned header-only scenarios on9889 with30 fresh contexts and exact original restoration. Parent08BC/1677 receipts keep their identities. The next single task is now the integrated Concept01 trial, not another source-separation or historical blocker task. `verification/receipts/2026-10-21-comment-frame-header-pilot.json` owns the exact scope and limits.
