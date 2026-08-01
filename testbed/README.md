# DCUF Local Testbed

This directory runs the built mobile userscript against deterministic local DCInside-shaped fixtures. It does not clone the site and does not use external network resources during test execution.

## Covered pages and behavior

- `/board/lists`: `table.gall_list tbody`, original `tr.ub-content` rows, pagination/search controls, and generated `.custom-mobile-list` mirrors
- `/board/view`: article DOM, ordinary comments, replies, detached/rebuilt comment-compatible structures, image comments, related posts, and article ads/iframes
- `/mgallery/board/lists` and `/mgallery/board/view`: live-sampled minor-gallery variants with 53 seven-cell rows, three host-hidden advertisement/utility rows, `#container.minor_view`, and three image-bearing parent comments; reply items remain an explicitly synthetic optional state
- `/board/write` and `/mgallery/board/write`: live-probe-backed desktop write forms with guest fields, minor-gallery captcha/category controls, hidden submission fields, Summernote-shaped editor, attachment UI, and local-only submit handling
- `/board/modify`: live-shaped non-member password gate; add `stage=editor` to serve the write-editor DOM under the same modify pathname
- `/board/delete`: live-shaped non-member delete-password gate with the native delete form and button contract
- `/__testbed/native-write`: responsive native-mobile reference fixture used as a layout and touch-target baseline
- UID statistics POST mock at `/api/gallog_user_layer/gallog_content_reple/`
- Local navigation and browser back navigation
- Dynamic controls for 1/100/500 comments, comment rerender, style mutation, blocked UID insertion, API delay/failure, repeated ads, long article nodes, dark mode, one-row changes, and whole-list replacement

The fixture control bar is manual. Tests call the same API through `window.__dcufFixture`.

For manual inspection in an ordinary browser, append `?harness=1` (or `&harness=1`) to a list/view fixture URL. The local server then injects the GM shim and current built userscript into `<head>`; normal automated routes remain uninjected because Playwright supplies the document-start harness itself.

## Install and run

From `testbed/`:

```powershell
pnpm install
pnpm exec playwright install chromium
pnpm test
pnpm run test:write
pnpm run test:performance
pnpm run test:bfcache
pnpm run test:headed
```

The runner uses an installed Chrome or Edge when available, so downloading Playwright Chromium is optional on those machines. Set `DCUF_BROWSER_PATH` to choose another Chromium executable.

Codex's bundled runtime can run without a local install by putting both bundled module directories on `NODE_PATH`; normal developers should use `pnpm install`.

Run the repository contract after testbed changes:

```powershell
node tools/verify-repo.mjs all
```

The runner reads the mobile version from `tools/build-userscript.mjs` and injects the matching root build artifact. Build the current source first when runtime source changed:

```powershell
node tools/build-userscript.mjs
node testbed/run-tests.mjs
```

To verify ordinary source edits without creating or replacing root/dist release artifacts, build an ignored test-only runtime and point the runner at it:

```powershell
node tools/build-userscript.mjs --testbed-output testbed/artifacts/runtime-under-test.user.js
$env:DCUF_TESTBED_USERSCRIPT='testbed/artifacts/runtime-under-test.user.js'
node testbed/run-tests.mjs
```

## Test groups

- `--group smoke`: initialization, list mirror creation, article/comment/image-comment/related-list presence
- `--group functional`: visibility stability, bounded reruns, disabled/delayed/failed UID traffic, scoped comment/list updates, whole-comment rerender, whole-list replacement, duplicate runtime registration, all comment variants, personal block/unblock UI, dark mode, repeated ads, navigation/back, and storage contracts
- `--group performance`: five 100-comment bursts plus 1,500 article nodes, pass-level timings, processed-target counts, heap trend samples, and JSON comparison metrics
- `--group write`: live-backed major/minor desktop write forms, modify password/editor states, delete password state, current mobile transformation, guest/captcha/category contracts, editor rerender and HTML-mode value retention, duplicate-safe local submission, and native mobile reference layout
- `run-bfcache.mjs`: production bfcache-eligible lifecycle and test-only pagehide/pageshow cleanup comparison
- `--filter <text>`: run tests whose Korean name contains the text

Failures are not converted to expected passes. A current release can therefore expose pre-existing regressions; fix or explicitly investigate them before release rather than weakening assertions.

## 3.3.3 regression evidence and current results

Matched OFF/ON live captures and the original 3.3.3 artifact exposed three regressions:

- Changing one comment `style` attribute produced about 170 additional `filter.syncPass.comments.runs` in the observation window. Diagnostics showed the `reply-merge` and `user-popup-layer` schedulers repeatedly following mutation-bus dispatches.
- Injecting the same built userscript a second time kept MutationObserver and mirrored-list counts stable, but unique event listeners increased from 77 to 83. The bootstrap guard returns from the main userscript IIFE, while post-main fix IIFEs located after that boundary still execute.
- In both the minor list and minor view, a site-hidden survey row is mirrored as `display:block`; the two site-hidden advertisement rows are correctly mirrored as `display:none`.

The current source fixes all three without changing stored data or release metadata:

- mirror visibility also honors the host row's computed hidden state;
- comment-shell cleanup mutates attributes/classes only when state actually changes, breaking the reply-merge feedback loop without removing delayed-comment coverage;
- one outer post-main guard prevents all fix IIFEs and listeners from running again on reinjection.

The initial fixed runtime completed the then-current 18 of 18 tests, and the historical 3.3.4 checkpoint plus write fixtures completed 22 of 22. The combined 3.4.5-beta optimization state completes the current 58 of 58 tests. In the original 500-comment/1,500-node comparison, filter passes dropped from roughly 224 to 24, processed targets from roughly 62,120 to 7,534, and MutationObserver callbacks from roughly 241 to 17. These are comparative measurements, not fixed timing gates.

The runner resolves the current mobile version from `tools/build-userscript.mjs`; do not hard-code an older release filename. Use the test-only runtime command above when validating unbuilt source changes; ordinary testbed work does not rebuild or version production artifacts.

The earlier `.dory` assumption is withdrawn: the corrected live view contains no `.dory`. Updated live traces do confirm continuous churn even before the style mutation (major: 609 callbacks/6,708 records; minor: 678 callbacks/2,994 records over 1.6 seconds), so the automated assertion now checks excessive idle pass growth after stabilization rather than claiming the style mutation is the sole cause. Duplicate injection remains deterministic in the harness but matters only for reinjection/update lifecycle paths, not an ordinary single page load.

## Metrics

`window.__dcufTestbedMetrics.snapshot()` combines test-only counters with the production diagnostics already exposed by `window.__dcufDiagnostics` and `window.__dcufMemoryDebug`:

- each sync/full/observed-item filter pass with scope, duration, and processed target count, plus aggregate counts
- MutationObserver instances, observe/disconnect/callback/record counts, and creation stacks
- mutation-bus subscriber count and dispatch data
- listener registration attempts and duplicate attempts
- document-wide and element-scoped selector calls/results
- computed-style, geometry, and layout-property reads that can expose layout-heavy hot paths
- scheduled/completed/cleared timeout, interval, and animation-frame work plus active handles
- UID XHR count, body, status, and duration
- mirror nodes added/removed and production mirror rebuild counters
- task queue active/pending gauges
- DOM node count, repeated Chromium heap samples, and heap delta/trend

Performance and bfcache reports are written to ignored `testbed/artifacts/*.json`. `performance-latest.json` retains the previous report timestamp and numeric deltas for the same scenario, so release runs can be compared without a brittle absolute-time threshold. Wall-clock and heap values are reports, not fixed pass thresholds. Structural bounds such as no full refilter for a one-comment change remain assertions.

The performance group also gates selector and layout-read work relative to the
number of added DOM nodes and requires active timer/frame counts not to grow.
The fixed-size replacement contract repeatedly rebuilds the same 53-row list,
forces Chromium garbage collection between samples, and checks stable DOM,
observer, subscriber, queue, timer, and heap behavior. These counters identify
regressions; a layout-property read is only a risk signal and does not prove the
browser performed a synchronous layout on that individual access.
The wrappers add test-only overhead, so timing comparisons are meaningful only
between runs using the same Testbed instrumentation revision.

Write-layout measurements are written to `testbed/artifacts/write-layout-latest.json`. The native reference must remain free of horizontal overflow; major/minor desktop-host overflow is recorded as a comparison metric rather than an absolute timing-style gate. This lets a future mobile write UI prove improvement without preserving a cramped layout.

## GM shim differences

The shim provides `GM_getValue`, `GM_setValue`, `GM_addStyle`, `GM_registerMenuCommand`, and `unsafeWindow` before document-start injection. Values are structured-cloned and persist for one browser document context.

Differences from Tampermonkey:

- no extension isolated world, permission prompt, cross-tab value synchronization, or real menu UI
- menu commands are registered in `window.__dcufTestbedGM` and can be invoked by label
- storage does not survive a newly created Playwright context unless seeded again
- local injection bypasses metadata `@match`; the harness is restricted to the top frame because real advertisement frames are outside the production match origin
- CSP, extension ordering, ad blockers, and real cross-origin frame contents are not reproduced

The initial article fixture contains an iframe-shaped ad. Repeated-ad regression tests use removable ad wrappers without creating dozens of child browsing contexts, because Playwright init scripts also run in provisional iframe documents and would pollute top-level observer instrumentation.

Live DOM reports captured with the userscript disabled established these baselines:

- major list/view: 51 post rows, six-cell ordinary rows, and `#container.gallery_view`
- minor list/view: 53 post rows, seven-cell ordinary rows, and `#container.minor_view`
- both view variants: `ul.cmt_list.add`, an article body, and a full lower post table
- sampled major view: three parent comments, no replies, and one image-bearing comment
- sampled minor view: three parent comments, no replies, and three image-bearing comments

Synthetic reply and related-post sections remain because production source supports those optional states even though they were absent from the sampled pages. The separate image-comment section now uses the live-captured major/minor wrapper and item hierarchy.

The accepted raw reports and ON/OFF comparisons are retained under [`evidence/live/2026-07-12/`](evidence/live/2026-07-12/README.md). Superseded collectors are isolated below that directory and are not test evidence.

## bfcache experiment isolation

`run-bfcache.mjs` never edits production source or the generated userscript. The `current` variant runs the production `pageshow.persisted` recovery as built. The `pagehide` variant disconnects only the shared mutation observer in memory before navigation, then verifies that the same production recovery path rebinds it; the harness does not perform its own refilter. `pageshow.persisted` and memory/navigation data vary by Chromium version and instrumentation, so the experiment records whether the browser actually restored from bfcache. A separate deterministic functional test dispatches a persisted `pageshow` and asserts one coalesced refilter, one list resync, reused observers, and no action for an ordinary pageshow.

## Adding a fixture

1. Add reusable DCInside-shaped HTML to `fixtures/builders.mjs` or `fixtures/pages.mjs`.
2. Keep host selectors faithful to current source. Give test-only nodes an ID/class beginning with `dcuf-testbed-` or `fixture-`.
3. Add dynamic behavior to `public/fixture-client.js` and expose it through `window.__dcufFixture`.
4. Add a serial scenario to `run-tests.mjs`. Assert DOM state and diagnostic deltas, not one absolute duration.
5. Run smoke, the affected group, the full suite, bfcache when lifecycle changed, and `node tools/verify-repo.mjs all`.
6. Document any real-site behavior the fixture cannot reproduce.

## Checks that still require the live site

- real Tampermonkey sandbox/grant timing and storage synchronization
- DCInside DOM drift, authenticated UID API cookies, error payloads, and server timing
- cross-origin advertising frames and ad-blocker interaction
- popup geometry, clipping, stacking, touch targets, virtual keyboard, and Android viewport behavior
- first-paint boot lock/overlay under real network delay
- browser-specific bfcache and long-tab memory behavior

Use [LIVE-AUDIT.md](LIVE-AUDIT.md) and its paste-once console collector to capture comparable live-site evidence for comment-pass churn and host-hidden content exposure.

For the separate article image-comment area, use [`image-comment-live-probe.js`](image-comment-live-probe.js) with the userscript disabled. It redacts identity, URLs, form values, and text while retaining the DOM structure needed to replace the synthetic `.view_comment.image_comment` fixture with live-backed markup.

For major/minor desktop write forms and the native mobile reference, use [`write-form-live-probe.js`](write-form-live-probe.js) with the userscript disabled. It captures form controls, editor frames, viewport geometry, overflow, and sanitized markup without retaining entered values, credentials, captcha tokens, editor text, or URLs.

Write fixtures live in `fixtures/write-pages.mjs`. Add a host variant there using selectors observed in a redacted probe, expose dynamic editor/captcha/attachment behavior through `window.__dcufFixture`, and add assertions to the `write` group. The `/__testbed/write-submit` endpoint is local-only and records URL-encoded fields in server memory; it never sends a real DCInside post.
