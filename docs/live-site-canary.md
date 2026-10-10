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

Run from the active worktree, after locked dependencies and full Chromium are available:

```text
node tools/verify-baseline.mjs
node tools/build-userscript.mjs --testbed-output testbed/artifacts/runtime-under-test.user.js
node tools/prepare-live-extension.mjs
node testbed/run-live-site-canary.mjs --suite full --headed
node tools/verify-live-site-canary.mjs
```

Omit `--headed` for local headless full-Chromium execution; that is recorded separately from the hosted headed path. `--output` may select a fresh evidence directory only under `testbed/artifacts/`. A local dirty source tree is explicitly recorded and must not be described as the clean committed source SHA alone.

`node tools/test-live-site-canary.mjs` is the offline safety/verdict suite, also run by repository guidance verification. It does not contact DCInside and cannot establish a live pass. `tools/verify-live-site-canary.mjs [report-directory]` independently replays artifact/driver/contract hashes, selected cases, positive fields, statuses, and screenshot presence against the current local inputs.

## Fail-closed interpretation

- `PASS`: every selected candidate startup case passes; each control case was actually observed. Control failures remain visible diagnostics and never authorize a failed candidate.
- `FAIL`: an observed candidate lacks a required positive check. Investigate product behavior versus live host drift; equality or an old control defect is insufficient.
- `UNAVAILABLE`: package pin/download/setup failure, network/non-200/redirect, missing observation, missing control, or invalid isolation/binding. Exit nonzero; never convert a skipped or blocked check to green.

The official extension service serves the current package, so an extension update intentionally stops the workflow on a hash mismatch. Do not silently auto-update the pin. Review the new official package/version, renew the explicit contract, and retest installation and live behavior. `--discover` is only a bootstrap/review aid; its unpinned receipt is rejected by the runner.

Anonymous read-only scope excludes login, posting, modifying, deleting, private data import, dark themes, mini galleries, storage fault injection, and the PC userscript. Article URLs can disappear; update those public route samples only after identifying host unavailability and preserving the old receipt. This startup pass does not close the broader header popup/action matrix, final 34-ID inventory, manual `live-canary` acceptance gate, release readiness, or authenticated behavior. No schedule, commit, push, release, or user-profile installation is implied.

Route renewal (2026-09-30): major-view post `2940311` returned HTTP 404 in both the published control and candidate extension profiles. That unavailable report and its old contract are retained in `testbed/artifacts/live-site-header-palette-approved-2026-09-30/`. The same gallery's live list exposed public post `1476608`, independently checked as HTTP 200; only the major-view sample URL was renewed. A fresh full startup run is required for the new contract; the old 404 is not reclassified as PASS.
