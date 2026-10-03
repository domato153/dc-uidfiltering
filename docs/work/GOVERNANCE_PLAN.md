# Development governance unification

Status: implementation and closure qualification; product acceptance remains separate.

## Goal and boundaries

One maintained basic contract at the actual development Git root, with exact working-branch checkpoints, current-only continuity validation, bounded cold recovery and an auditable check of the checking process. Preserve product bytes, versions, storage, metadata, native behavior and accepted architecture. Do not merge the two local Git databases or publish an official branch, PR, tag, release or live run.

The accumulated candidate was preserved separately at `56edde7affa54f0c0851e346a5cb7c401bae1a7e`. Its 137/11/25 reports are exact-input-qualified reuse, not reruns. Raw reports and historical controls are local-only. This recovery checkpoint does not certify the header stage.

## Research and selected transfer

- [Official AGENTS discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md): instruction discovery follows the start/project directory; align the execution root with the maintained contract. An already running chat can retain older injected instructions. Removing a file does not rewrite that chat's earlier messages.
- [OpenAI instruction maintenance](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra): contextual routing rather than mandatory full-document stacks.
- [Google small changes](https://google.github.io/eng-practices/review/developer/small-cls.html): self-contained changes with their related tests; checkpoint cadence is not a release gate.
- [Git push](https://git-scm.com/docs/git-push): explicit destination and normal fast-forward rules; never use a force variant as a retry strategy.
- [SLSA provenance](https://slsa.dev/spec/v1.1/provenance): distinguish input/artifact identity, execution provenance and the claim actually qualified. This implementation does not claim SLSA compliance or cryptographic proof of execution.
- Anima `aio-rewrite-work@96f43c88d6b8b8b5798e22f4a592d92ae2779ede`, `aio-rewrite/working/THREAD_HANDOFF_POLICY.json`: routine versus closure; exact dependency-qualified reuse; historical status is not a selector.
- Translation maintenance only, `main@c42578e0eb933dcfc5d364b237117d023aa4118c`, `.agents/skills/maintenance-regression-supervisor/references/handoff-continuity.md`: one action, explicit dependencies and entry decisions, known hazards, local-state recovery and continuity-only qualification. Do not import its translation engine, full Python coordinator, blind literary roles, self-hosted executor or multi-ref release machinery.

## Lossless contract reconciliation

| Existing rule family | Maintained owner / disposition |
| --- | --- |
| Behavior, settings, source/generated separation, mobile/PC scope | Preserve in AGENTS; source/build authorities remain unchanged. |
| Build without version bump, artifact identity, archive/rollback | Preserve; checkpoint is not a release. |
| Small affected tests, full suites at broad/final boundaries, bfcache scope | Preserve; do not rerun product qualification solely for a thread or commit movement. |
| Live-shaped fixtures, native nodes/events, geometry, resources, evidence limits | Preserve; screenshots and GM-shim startup are not extension approval. |
| Architecture overlays, graph routing, exact proofs and accepted-registry protection | Preserve the active development contract, not the parent's older reduced copy. |
| Current state in ignored .codex versus tracked docs/work | Tracked packet is selected; .codex remains scratch. |
| Parent's discontinued-checkpoint/no-commit policy | Superseded by the user's 2026-10-04 request to restore ongoing bounded checkpoints and complete this implementation. |
| Working checkpoint authorization versus official publication | Preserve separate boundaries; passing checks never creates authority. |
| Parent's stable process versus current trusted-main manual release process | Current development release contract remains governing; no stable operation is performed. |
| Historical hypotheses, negative decisions and unresolved timer/live gaps | Keep history recoverable; do not turn NOT ADOPTED into REJECTED without reviewing its meaning. |

Parent AGENTS plus its uncommitted diff must be retained in non-instruction archive files before removal. Other parent-tree changes, Git databases and historical control checkouts are out of scope. The local DEV_WORKSPACE locator is navigation, not a second basic contract.

## Completion and audit

1. Establish the single contract and an explicit local locator; check wrong-root execution and policy-copy drift.
2. Reject historical-field fallback, duplicate fields, mismatched stage/action, omitted dependencies and skipped entry decisions. Preserve one next product task without claiming stage PASS.
3. Implement explicit-path, exact-tree checkpoint validation/commit/non-force-push/reconciliation; resume a committed checkpoint without duplicate commits. Separate CI-pending from verified-checkpoint status.
4. Add an exact-SHA push checkpoint CI without making every push full product acceptance. Existing manual/PR acceptance and manual live/release boundaries stay intact.
5. Qualification checks positive and negative controls, actual publisher transport/retry when feasible, source/runtime preservation, and cold-reader recovery. Audit semantic completeness and permission/evidence boundaries separately from test counts. Findings close as fixed, explicit blocker or historical/non-executable; never silently waive them.

Closure here qualifies this governance change only. Full header/34-feature/live/product upper assurance remains UNKNOWN until its own exact evidence exists.
