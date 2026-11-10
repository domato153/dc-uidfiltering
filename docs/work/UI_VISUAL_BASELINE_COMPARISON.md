# Stable/current UI visual comparison

Status: VIEWPORT_SCOPE_CORRECTED; selected wide-layout defects confirmed; implementation and formal header admission remain open.

Follow-up cause investigation: UI_BREAKAGE_CAUSE_AUDIT.md supersedes the selected-only triage for current diagnosis. It records15 symptom/contract findings, actual CSS/DOM causes, isolated temporary-style experiments, additional dialogs, fixture differences and setup failures. No product fix was made in that investigation.

## Later measured phone input (2026-10-18)

PHONE_VIEWPORT_PROFILE.md now records user-supplied actual screen412×1006, inner980×2306, client980×2002, visual scale0.420684278011322 and DPR2.625. The earlier980 proxy was directionally correct for layout width but did not reproduce zoom or the full screen/height condition. Preserve the historical observations below; exact browser/height/zoom fidelity is still incomplete.

## Mobile viewport correction (historical proxy)

The user's real Lemur mobile screenshot contradicts the earlier assumption that a390px desktop-context capture represents their normal mobile layout. Its wide header, single-row toolbar and full-width cards resemble a wide page scaled to the phone. Exact Lemur layout width, DPR and page scale cannot be recovered from the image alone. Do not treat physical screenshot width, screen.width and CSS layout width as interchangeable.

Fresh public-page probes compare desktop390, touch/mobile412 and the existing desktop-site-style980 layout proxy with identical stable/candidate runtimes. Both runtimes produce the same viewport meta: width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes. Measured layout/client/visualViewport widths are390,412 and980 respectively; visualViewport.scale is1 in every probe. The980 proxy declares screen412x915/DPR2.625/touch/isMobile, but this does NOT emulate Lemur's measured display scale. It is a layout comparison, not exact device reproduction. Both artifacts share the viewport-meta handling; no candidate-only viewport change was found.

The stable980 screenshot restores the broad composition shown by the user's screenshot. The old100 captures remain valid390px stress evidence, but the generalization to actual Lemur behavior is withdrawn. In particular, narrow header/recommendation wrapping does not establish the same failure on the user's device.

Renewed public wide-layout evidence:48 captures/24 pairs, light/dark list/article/write and selected menu/settings/management/comment/action states. The gallery defaults to980;390 is explicitly labeled stress. Runtime hashes below are unchanged. Evidence: artifacts/ui-overview-2026-10-17/comparison/live-wide-manifest.json and viewport/report.json. Two write-page native dark-pointer timeouts remain in both artifacts; the declared native-function visual setup is retained. No new actual-Tampermonkey or Lemur run occurred.

Selected images were opened and compared. At980, current list tabs still overlap/clip in an840x48 toolbar while the stable toolbar is968x77; article metadata still has an empty scrap outline and narrow stacked counters; management overlay is600x700 while stable covers980x2100. These defects survive the wider condition. Recommendation actions no longer invade the comment header in the reviewed wide light view. Stable/current write headings still have a shared boundary issue. List card treatment, author truncation and comment styling also differ; these visual differences require contract comparison before every difference is called a new defect. This is selected visual review, not a claim that all24 pairs have been exhaustively approved.

Gallery validation: default wide profile, profile/page/theme/source filters,148 image HTTP responses and no page JavaScript errors pass. This validates the comparison artifact, not product acceptance.

The user requested a direct vision review of all major UI surfaces, then selected the preserved published functional control for comparison. This supersedes the drawer-priority-first execution order. Do not promote mixed owners or describe the UI as normal while the observed composition defects remain.

## Exact controls and scope

- Published mobile3.5.5 control: verification/baselines.json stable SHA-256 32BA208DDD9973A7EEC343F01E963A833AB4F0C084987077EDAE46844383C25D, reconstructed with tools/verify-baseline.mjs from behavior source cef5f71381116d2746b0319b2f8e609e8d7eae85 using only the declared version normalization. Candidate source was not consumed.
- Compared source runtime: 3EF663809B56BC4F224BA67FE13E39B688D16ECBC10F0357890DEBB8BEF518F0, version unchanged3.5.5. It includes only the in-progress drawer56 priority cleanup beyond208D; this is not a release or a completed UI repair.
- Browser: installed Chrome155.0.8059.80. Separate fresh contexts per artifact/page/theme; same390x844 viewport, blue palette, anonymous fixtures or public site, no posting/commenting/voting.
- Testbed:52 captures. Public site:48 captures. Public article URL is fixed across both artifacts and themes. Public counters, CAPTCHA and content may change between reads and are not a pixel-equality oracle.
- Live captures use the existing GM shim, not a new actual-Tampermonkey run. Two native write-page dark-entry pointer failures remain; dark screenshots use the site's native darkmode() function only as declared visual setup.
- The first live capture attempt selected a javascript link as an article URL. That incomplete manifest/log is retained; the renewed capture filters real board/view links and freezes one common public article URL.

## Earlier390px stress findings (not a real-device verdict)

| ID | Priority | Classification | Observation |
| --- | --- | --- | --- |
| VIS-01 | P1 | Current regression | Gallery action row extends below the native fixed-height heading and overlaps list tabs. |
| VIS-02 | P1 | Current regression | List toolbar remains840px wide in390px viewport; native center/headtext group overlaps the first list row. Retired legacy reset was not fully replaced by the list presenter. |
| VIS-03 | P1 | Current regression | Article metadata/scrap row loses composition: blank scrap outline and counters wrap into narrow columns. Exact matched cause remains to be traced. |
| VIS-04 | P1 | Current regression | Wrapped native actions below recommendation invade the comment header; labels become vertical. Dark recommendation decoration also overlaps the star. |
| VIS-05 | P1 | Current regression | Management overlay shrinks to366x700 instead of390x844. The shared presenter applies personal-management width/height to both panel and overlay because its size selector omits the role. |
| VIS-06 | P2 | Current visual defect | Comment credentials/buttons keep native desktop borders/geometry within the new card; dark fields and controls are inconsistent. Screenshot alone does not prove a handler failure. |
| VIS-07 | P2 | Shared existing defect | Published and current header both retain desktop absolute logo/search/links and broken recent-visit composition. Current matched CSS confirms absolute positioning. |
| VIS-08 | P2 | Shared existing defect | Write-page heading/action boundary and native dark-entry reachability are poor in both artifacts. |
| VIS-09 | P2 | Fixture fidelity defect | Tiny write title/CAPTCHA refresh appears in both Testbed artifacts; real public write inputs are full width. Do not patch working live forms to match this misleading fixture. |
| VIS-10 | P2 | Shared usability risk | Large fixed menu covers content or controls at some scroll positions in both artifacts. Verify actual hit targets before changing its interaction model. |

Settings and the open FAB menu show coherent current composition in the selected views; the settings redesign also improves the old narrow threshold layout. This is selected visual observation, not blanket popup/product acceptance. Dark management text contrast needs state-aware follow-up; empty/disabled controls cannot be treated as active-control failures without checking their state.

## Evidence and next bounded repair

Local-only evidence lives in artifacts/ui-overview-2026-10-17/comparison/: live-manifest.json, testbed-manifest.json,100 images, index.html and vision-triage.json. Triage SHA-256 650228913326D791DC8746377DBA5890E1076B9322D8F5108092105667B20B64. The capture driver is artifacts/ui-visual-audit-2026-10-17/capture-paired.mjs. Missing bytes require recapture; a checkpoint cannot reconstruct public page content or ignored images.

Next: fix the list-toolbar overlap that remains at980 from faithful native structure/CSS and failing containment/adjacency/hit tests. Keep390 as a separate stress case; do not redesign the normal mobile layout around an unverified narrow assumption. Renew matched stable/current pictures before continuing article metadata and management-overlay repairs. Preserve native nodes, forms, handlers, settings, original popup descendants, PC semantics and versions. Existing partial verifier tools remain uncommitted and unqualified; do not confuse their focused tests with product acceptance.

Recurrence rule: screenshots must be opened and reviewed for complete composition before reporting visual readiness. Compare the published control and current artifact on the same real page as well as the fixture. Record new regressions, shared preexisting defects and fixture-only defects separately. A native handler/hit test can pass while labels, sibling flow and parent containment are broken; encode those observed failures as independent geometry assertions. Retained screenshots were previously shown without this review; their existence never established UI approval.

Viewport recurrence rule: before calling a browser screenshot representative of mobile use, record context viewport, screen, DPR, touch/isMobile, UA, viewport meta, innerWidth/clientWidth and visualViewport width/scale. Reproduce the published control's known real-device composition first. Keep responsive stress, wide-layout proxy, actual extension and actual device evidence distinct. Do not force page meta or silently resize CSS layout to fit a desired screenshot, and do not claim DPR changes layout width or that scale1 emulation proves real-device zoom.
