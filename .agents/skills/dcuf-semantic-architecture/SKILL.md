---
name: dcuf-semantic-architecture
description: Inspect or change DCUF's live architecture map, semantic registry, layer/UI ownership, and build topology. Use for ownership drift, architectural refactors, candidate overlays, or changes to component responsibilities, relations, invariants, or build inputs; exclude ordinary local fixes that preserve those boundaries.
---

# DCUF Semantic Architecture

Treat `architecture/registry.json` as the accepted authority and its generated index as a view. For a current surface/layer question, run `node tools/inspect-live-architecture.mjs --surface <id>` and inspect its findings before deciding ownership; this is a repository-source view, not live-site evidence. Read the affected source and candidate overlay only as needed.

- Record the current implementation honestly. A mixed legacy file remains mixed until its forbidden dependencies are actually removed.
- Every build input must map to one component. Every component has one primary layer, explicit contracts, source references, and fitness checks.
- Put responsibility, ownership, relation, invariant, or build-topology changes in one candidate overlay. Validate the effective accepted+candidate graph before implementation.
- A `mixed` component may become conforming or retired only with evidence bound to its accepted exit-criteria hash, current source/proof inputs, and every required gate profile. Placeholder criteria and evidence supplied without a real exit are invalid.
- Resolve component and invariant profiles from a Git-derived route. The consumer must recompute that route, reject unknown selectors, distinguish a non-applicable profile selection from a pass, and execute stateful build/test commands independently in each selected profile.
- Before and after an ownership/map change, run `node tools/inspect-live-architecture.mjs --check`. Keep a candidate overlay until a separately authorized deterministic promotion removes it and updates the accepted registry/index with a fold receipt. Never edit accepted ownership directly or bypass the fold chain.
- Reject unknown classifications, missing relation endpoints, duplicate IDs, unmapped build inputs, UI ownership of GM/filter/network state, and verification code acting as a product owner.

Changing the registry does not authorize source edits, commits, pushes, merges, or releases.

For host UI ownership or dynamic DOM, also use `dcuf-ui-surface-maintainer` and `dom-safety-audit`; for a zero-delta behavior claim, also use `dcuf-semantic-preservation`. Add `dcuf-long-work-continuity` only at a state/audit/resume transition, not for every map lookup.
