---
name: dcuf-semantic-architecture
description: Maintain DCUF's machine-readable semantic registry, layer ownership, build topology, and candidate promotion. Use for architectural refactors or changes to component responsibilities, relations, invariants, or build inputs; exclude ordinary local fixes that preserve those boundaries.
---

# DCUF Semantic Architecture

Treat `architecture/registry.json` as the accepted authority and its generated index as a view. Read `build/targets.json`, the affected source, and any candidate overlay before deciding ownership.

- Record the current implementation honestly. A mixed legacy file remains mixed until its forbidden dependencies are actually removed.
- Every build input must map to one component. Every component has one primary layer, explicit contracts, source references, and fitness checks.
- Put responsibility, ownership, relation, invariant, or build-topology changes in one candidate overlay. Validate the effective accepted+candidate graph before implementation.
- Finalize with the deterministic promotion command. The final PR state removes the overlay, updates the accepted registry/index, and includes an idempotent fold receipt.
- Reject unknown classifications, missing relation endpoints, duplicate IDs, unmapped build inputs, UI ownership of GM/filter/network state, and verification code acting as a product owner.

Changing the registry does not authorize source edits, commits, pushes, merges, or releases.
