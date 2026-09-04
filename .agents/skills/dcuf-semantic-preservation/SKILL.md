---
name: dcuf-semantic-preservation
description: Prove DCUF behavior preservation across broad refactors, shared mobile/PC changes, or runtime-owner moves. Use when the intended semantic delta is zero or narrowly declared; exclude visual-only evidence gathering without a behavior claim.
---

# DCUF Semantic Preservation

Start from `verification/baselines.json`, the exact candidate SHA, the registry contracts, and the declared intended delta.

1. Bind control and candidate artifacts to their source SHA and run them in separate fresh browser contexts with the same fixture seed.
2. Compare semantic receipts: visibility decisions, host node/order/forms/native calls, storage round trips, network and custom events, lifecycle resources, focus/hit testing, console errors, and structural hot-path counts.
3. Trace oracle lineage. Invalidate only evidence whose SUT, oracle dependency, fixture, harness, toolchain, or route changed.
4. Never weaken an assertion or rewrite production behavior to satisfy a stale fixture. Classify failures as product, oracle, fixture/harness, verifier/routing, environment, or live-only.
5. For high-risk milestones and final acceptance, use a fresh-context upper-layer audit covering intent, architecture truth, proof-system independence, exact head/result binding, and false-pass attacks.

Screenshots and wall-clock measurements are supporting evidence, not sole semantic gates. This skill grants no publication authority.
