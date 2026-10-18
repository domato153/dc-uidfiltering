# Desktop live-site Canary

This is the reusable **real-site / actual-Tampermonkey desktop startup** path. It uses ordinary desktop browser defaults at 1280×900, not a mobile UA or a narrow viewport. The user's requested first scope is desktop execution; responsive/mobile expansion is separate.

## Execution and evidence

`.github/workflows/live-site-canary.yml` is a manually dispatched GitHub-hosted Ubuntu 24.04 job. Choose the exact 40-character repository source commit and `smoke` (major/minor list plus major view) or `full` (those plus minor view). `full` means all four routes in this startup contract, **not all product features**. The workflow must first be committed/published through a separately authorized Git boundary; local files alone do not create a hosted run.

1. Checkout and verify the exact source SHA; install the existing locked Node/pnpm/Playwright toolchain.
2. Reproduce the immutable published mobile control and build the guarded candidate. Print the absolute candidate path and SHA-256.
3. Fetch official Tampermonkey 5.5.0 from Google's extension service. Require the explicit CRX SHA-256 in `verification/live-site-canary.json`; freshly extract and verify every file separately for each profile before launch. Chromium removes Web Store verification metadata from unpacked extensions, so never trust or reuse a browser-mutated extracted directory. Vendor files are not patched.
4. Launch full Playwright Chromium / Chrome for Testing in a desktop window on Xvfb. Use separate new temporary profiles for control and candidate, enable Chrome's **Allow User Scripts** through its extension UI, and install each exact userscript through Tampermonkey's own Utilities/Install UI. Record document-start userScripts registration. No GM shim, injected userscript, private extension RPC, existing profile, or imported user storage is used.
5. Visit the declared public HTTPS routes. Require HTTP 200, the installed script's ready marker, a present host, visible positive-area list rows, three-point title hit tests, browser keyboard focus, a visible article on view routes, and zero identified userscript errors. Dismiss the fresh-install settings prompt through its close button, without saving options. Retain a desktop screenshot per observation.
6. Upload only `report.json`, `summary.md`, and screenshots for 14 days. Browser profiles, cookies, local extension packages, and private GM data are not uploaded. The run closes browsers and removes only its own newly allocated temporary profiles.

Official constraints: [Playwright extension support](https://playwright.dev/docs/chrome-extensions) requires persistent contexts and recommends bundled Chromium because branded Chrome/Edge removed side-load flags. Chrome's per-extension user-script toggle is required on recent browsers ([Chrome documentation](https://developer.chrome.com/blog/chrome-userscript), [Tampermonkey FAQ](https://www.tampermonkey.net/faq.php?q=Q209)). This is a real Chromium-family browser with a real unmodified extension, not an assertion that the user's installed Chrome build or phone was tested.

## Local reproduction

Run from the active worktree with the existing locked dependencies. On this Windows host, the qualified local route is installed Google Chrome with a new temporary profile:

```text
node tools/verify-baseline.mjs
node tools/build-userscript.mjs --testbed-output testbed/artifacts/runtime-under-test.user.js
node tools/prepare-live-extension.mjs
node testbed/run-live-site-canary.mjs --browser installed-chrome --suite full --output testbed/artifacts/<fresh-run>
node tools/verify-live-site-canary.mjs testbed/artifacts/<fresh-run>
```

This uses `testbed/harness/live-site-browser.mjs`: spawn installed Chrome, connect to its profile-specific loopback CDP endpoint, load a freshly extracted pinned Tampermonkey package through `Extensions.loadUnpacked`, select that exact extension ID's worker, then run the same Allow User Scripts and Tampermonkey Utilities/Install UI and startup predicates. The Chrome executable digest/version and browser-adapter digest are bound in the receipt. No registry/enterprise policy change, normal-profile reuse, vendor patch, injected userscript or GM shim is used. Unsupported API, changed executable/package/driver, failed installation or incomplete observations fail closed. Installation by the agent into a test browser is actual-extension verification; personal human use is not a prerequisite for these sampled checks.

The method was researched from the read-only [anima installed-browser route at b95fdd7](https://github.com/domato153/anima/blob/b95fdd7b686f0948bfac74b2726227764095335c/aio-rewrite/working/LIVE_BROWSER_ACCEPTANCE_EXECUTION.md). Its temporary enterprise policies and Actions executor plans were not copied: current [Chrome CDP extension loading](https://chromedevtools.github.io/devtools-protocol/tot/Extensions/#method-loadUnpacked) supports the profile-only installation used here, and a fresh DCUF full startup run plus independent receipt replay qualified it on Chrome 155.0.8059.40 / Tampermonkey 5.5.0. The discarded generic-worker attempt remains UNAVAILABLE; loading an extension alone is not script execution proof.

The default `--browser chromium` route remains the hosted/full Chromium path. On a host where that executable works:

```text
node tools/verify-baseline.mjs
node tools/build-userscript.mjs --testbed-output testbed/artifacts/runtime-under-test.user.js
node tools/prepare-live-extension.mjs
node testbed/run-live-site-canary.mjs --suite full --headed
node tools/verify-live-site-canary.mjs
```

Omit `--headed` for local headless execution; that is recorded separately from the hosted headed path. Browser choice is explicit, with no silent fallback. `--output` may select a fresh evidence directory only under `testbed/artifacts/`. A local dirty source tree is explicitly recorded and must not be described as the clean committed source SHA alone.

`node tools/test-live-site-canary.mjs` is the offline safety/verdict suite, also run by repository guidance verification. It does not contact DCInside and cannot establish a live pass. `tools/verify-live-site-canary.mjs [report-directory]` independently replays artifact/driver/contract hashes, selected cases, positive fields, statuses, and screenshot presence against the current local inputs.

Installed-Chrome cleanup bounds the complete graceful CDP/browser-close sequence to three seconds, then terminates only the child created by that invocation and allows three seconds to confirm exit. Node's exit event may arrive after Windows has already removed that PID; only OS `ESRCH` is accepted as an additional positive exit proof, after which only the owned child's pipes/handle are released. A live PID, permission error or cleanup failure cannot produce a passing receipt. Offline regressions cover stalled CDP/browser-close responses, delayed exit events, and a still-live PID; they do not depend on a responsive Chrome failure path.

## Fail-closed interpretation

- `PASS`: every selected candidate startup case passes; each control case was actually observed. Control failures remain visible diagnostics and never authorize a failed candidate.
- `FAIL`: an observed candidate lacks a required positive check. Investigate product behavior versus live host drift; equality or an old control defect is insufficient.
- `UNAVAILABLE`: package pin/download/setup failure, network/non-200/redirect, missing observation, missing control, or invalid isolation/binding. Exit nonzero; never convert a skipped or blocked check to green.

The official extension service serves the current package, so an extension update intentionally stops preparation on a hash mismatch. Do not silently auto-update the pin. If the exact previously pinned official CRX and pinned receipt remain locally available, the runner can verify those bytes against the unchanged contract and freshly extract them for isolated profiles without downloading again. Record this as the pinned version, not the current store package; never reuse a browser-mutated extraction. If no exact package remains, review the new official package/version, renew the explicit contract, and retest installation and live behavior. `--discover` is only a bootstrap/review aid; its unpinned receipt is rejected by the runner.

Anonymous read-only scope excludes login, posting, modifying, deleting, private data import, dark themes, mini galleries, storage fault injection, and the PC userscript. Article URLs can disappear; update those public route samples only after identifying host unavailability and preserving the old receipt. This startup pass does not close the broader header popup/action matrix, final 34-ID inventory, manual `live-canary` acceptance gate, release readiness, or authenticated behavior. No schedule, commit, push, release, or user-profile installation is implied.

Route renewal (2026-09-30): major-view post `2940311` returned HTTP 404 in both the published control and candidate extension profiles. That unavailable report and its old contract are retained in `testbed/artifacts/live-site-header-palette-approved-2026-09-30/`. The same gallery's live list exposed public post `1476608`, independently checked as HTTP 200; only the major-view sample URL was renewed. A fresh full startup run is required for the new contract; the old 404 is not reclassified as PASS.

## Registered native header profile

The separately authorized header expansion runs the same real vendor installation/isolation/cleanup with `--suite full --header-native`. verification/header-live-canary.json declares 16 public list cases across four desktop-UA viewports and native light/dark. Exact immediate 6869 control replaces the startup profile's published control only for this matrix; guarded candidate remains the same. No phone UA/device, private GM import or injected dark class is used. Native theme entry uses the original darkonoff pointer; a blocked entry fails and leaves later requested states unobserved.

```text
node testbed/run-live-site-canary.mjs --browser installed-chrome --suite full --header-native --output testbed/artifacts/<fresh-native-run>
node tools/verify-live-site-canary.mjs testbed/artifacts/<fresh-native-run>
```

The replay recognizes native receipt kind, exact cases/current imported observer/control/driver hashes and observation-derived predicates. A verified FAIL receipt exits nonzero; replay consistency is not product PASS. Current three failures, geometry and recovery are in docs/work/HEADER_INSTALLED_NATIVE.md. Do not use forced pointer, programmatic click, stylesheet injection or a passed container center to erase an unreachable original control. Startup remains its original four-route wide/light scope.
