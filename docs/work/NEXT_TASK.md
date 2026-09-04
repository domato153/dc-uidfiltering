# Next bounded task

Establish the locked Playwright characterization oracle for the exact 3.5.5 baseline:

1. Install from the frozen pnpm lockfile and verify the browser revision.
2. Build `testbed/artifacts/runtime-under-test.user.js` and record its exact SHA-256.
3. Run the full deterministic mobile and host-compatibility suites without changing fixtures to obtain a baseline pass or classified failures.
4. Add independent false-green checks for wrong artifact/head, stale receipt, and control=candidate before introducing UI ports.

Do not start UI extraction until failures are either fixed in the proof system or explicitly classified as stale/live-only evidence.
