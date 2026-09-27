# Continuity retrieval and update contract

Read this reference only when Continuity is being changed, a retrieval route is ambiguous, or a resume/audit check finds drift. The live vocabulary and mandatory triggers are machine-owned by `verification/continuity-contract.json`.

## State model

- `docs/work/CURRENT_STATE.md` is the compact read projection: active plan/stage, source state, candidate fingerprint, last audit, accepted baseline, current artifact, blockers, and pending live checks.
- `docs/work/NEXT_TASK.md` contains one task ID and one bounded completion scope.
- Receipts and exact digests are immutable evidence events. The projection may summarize them but cannot make them current after source, oracle, fixture, harness, toolchain, or routing changes.
- The plan explains the intended sequence. Maintenance notes retain reusable causes and contracts. Neither overrides fresh local state or exact evidence.

This is a selective projection-and-receipt pattern, not a general event store. Do not add a chronological command diary or replay infrastructure.

## Retrieval routes

- Resume, compaction, status, or percentage: run `node tools/inspect-continuity.mjs`, then read `CURRENT_STATE.md` and `NEXT_TASK.md`. Report accepted progress separately from the active unaccepted candidate.
- Context-free new-task handoff: use `references/handoff-contract.md` after the current projection; verify the private prompt's exact worktree locator against fresh Git and the tracked repository-relative root, then require receiver `ACCEPTED` or `STALE_REPLAN` before consequential continuation. A fork's inherited chat is not this test.
- Audit, PASS/READY, SHA, or evidence: additionally read the referenced receipt, assurance case, and the changed oracle/fixture/harness inputs. Recompute staleness; never inherit a conclusion from prose.
- Failure, UNKNOWN, or blocker: read the failing output and gate route, classify it, then consult only matching maintenance notes. Preserve the last accepted baseline.
- Regression, drift, DOM, or behavior preservation: add the semantic-preservation skill and the affected machine contract or surface map.
- Live architecture or UI owner drift: inspect the effective registry/build/source/surface view through `node tools/inspect-live-architecture.mjs --surface <id>`; add the semantic-architecture skill and only the host-UI/DOM skills justified by the affected surface. This repository view does not replace a real-site canary.
- Canary, beta, ZIP, release, or rollback: add the release skill. Continuity supplies state but grants no release authority.
- Selection, rejection, deferral, or research rationale: read `docs/work/DECISION_RATIONALE.md`, then the cited current contract/evidence and only the relevant external source. Its decisions do not override fresh status or imply PASS. For recurring host failure, search maintenance notes by concept label. Do not load archives unless current sources leave a specific question unresolved.

## Update rules

Apply the trigger named in `verification/continuity-contract.json`. A state update must keep confirmed, candidate, stale, UNKNOWN, and blocked facts distinct. PASS/READY requires an existing receipt digest and exact artifact digest. After a source or evidence-input change, mark dependent evidence historical before writing any new success claim.

At each checkpoint, run `node tools/verify-modernization-assurance.mjs` and `node tools/verify-skills.mjs`. The first checks the state projection and trigger vocabulary; the second checks that the thin router remains discoverable and its positive, negative, paraphrase, overlap, and held-out routing cases remain present.

When a consequential method choice changes, add or explicitly supersede its rationale entry and run `node tools/verify-research-selection.mjs`. Keep `SELECTED`, `NOT ADOPTED`, and `DEFERRED` separate; none is an assurance status. An unresolved item cannot be silently rewritten as accepted state.

When source, build inputs, the effective architecture overlay, or `architecture/ui-surfaces.json` changes, run the live-architecture `--check` gate before reporting the map current. If the gate fails, classify the discrepancy and keep the old accepted evidence; do not silently rename a visual owner or infer a live-site PASS.

## Vocabulary discipline

Use one preferred concept label plus alternative and hidden labels for Korean, English, abbreviations, common paraphrases, and likely misspellings. Labels help retrieval; they do not change authority. Keep a label in exactly one concept to avoid ambiguous routing, and connect concepts through paths or multi-skill routing cases instead of duplicating labels.
