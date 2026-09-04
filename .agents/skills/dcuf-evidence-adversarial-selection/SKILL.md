---
name: dcuf-evidence-adversarial-selection
description: Select proportionate external evidence and adversarial validation for consequential DCUF changes. Use for proof-system design, ambiguous regressions, high-risk state/lifecycle work, or audit planning; exclude routine checks already determined by the impact resolver.
---

# DCUF Evidence and Adversarial Selection

Select methods by plausible failure mechanism rather than running every technique mechanically.

- Use differential or metamorphic checks for behavior-preserving transformations and storage round trips.
- Use state/interleaving tests for duplicate initialization, rerenders, delayed host insertion, pageshow, visibility, and competing UI layers.
- Use fault injection for GM storage, UID APIs, partial initialization, and recovery paths.
- Use structural/AST checks for forbidden layer dependencies and runtime counters for leaks or duplicated hot-path work.
- Mutate registry, impact routing, oracle/harness, and release validators to prove that false-green states are rejected.
- Seek external primary evidence only when it can change the method or acceptance rule; record inference separately from project evidence.

Report the selected method, rejected alternatives, covered failure mechanism, cost, and remaining live-only risk. Evidence selection never expands mutation or release permission.
